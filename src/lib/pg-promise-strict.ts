"use strict";

import * as fs from 'fs-extra';
import * as pg from 'pg';
const pgTypes = pg.types;

import {from as copyFrom} from 'pg-copy-streams';
import * as util from 'util';
import * as likeAr from 'like-ar';
import * as bestGlobals from 'best-globals';
import {Stream, Transform} from 'stream';

export var debug:{
    pool?:true|{
        [key:string]:{ count:number, client:(pg.Client|pg.PoolClient)&{secretKey:string}}
    }
}={};

export var defaults={
    releaseTimeout:{inactive:60000, connection:600000}
};

/* instanbul ignore next */
function noLog(_message:string, _type:string){}

export var log:(message:string, type:string)=>void=noLog;

export function quoteIdent(name:string){
    if(typeof name!=="string"){
        throw new Error("insane name");
    }
    return '"'+name.replace(/"/g, '""')+'"';
};

export function quoteIdentList(objectNames:string[]){
    return objectNames.map(function(objectName){ return quoteIdent(objectName); }).join(',');
};

export type AnyQuoteable = string|number|Date|{isRealDate:boolean, toYmd:()=>string}|{toPostgres:()=>string}|{toString:()=>string};
export function quoteNullable(anyValue:null|AnyQuoteable){
    if(anyValue==null){
        return 'null';
    }
    var text:string
    if(typeof anyValue==="string"){
        text = anyValue;
    }else if(!(anyValue instanceof Object)){
        text=anyValue.toString();
    }else if('isRealDate' in anyValue && anyValue.isRealDate){
        text = anyValue.toYmd();
    }else if(anyValue instanceof Date){
        text = anyValue.toISOString();
    }else if('toPostgres' in anyValue && anyValue.toPostgres instanceof Function){
        text = anyValue.toPostgres();
    }else{
        text = JSON.stringify(anyValue);
    }
    return "'"+text.replace(/'/g,"''")+"'";
};

export function quoteLiteral(anyValue:AnyQuoteable){
    if(anyValue==null){
        throw new Error("null in quoteLiteral");
    }
    return quoteNullable(anyValue);
};

export function adaptParameterTypes(parameters?:any[]){
    // @ts-ignore 
    if(parameters==null){
        return null;
    }
    return parameters.map(function(value){
        if(value && value.typeStore){
            return value.toLiteral();
        }
        return value;
    });
};

export var easy:boolean=true; // deprecated!

export type ConnectParams={
    motor?:"postgres"
    database?:string
    user?:string
    password?:string
    port?:number
}

export type CopyFromOpts={inStream:Stream, table:string,columns?:string[],done?:(err?:Error)=>void, with?:string}
export type BulkInsertParams={schema?:string,table:string,columns:string[],rows:[][], onerror?:(err:Error, row:[])=>void}

/** TODO: any en opts */
export class Client{
    private connected:null|{
        lastOperationTimestamp:number,
        lastConnectionTimestamp:number
    }=null;
    private fromPool:boolean=false;
    private postConnect(){
        var nowTs=new Date().getTime();
        this.connected = {
            lastOperationTimestamp:nowTs,
            lastConnectionTimestamp:nowTs
        }
    }
    private _client:(pg.Client|pg.PoolClient)&{secretKey:string}|null;
    constructor(connOpts:ConnectParams|null, client:(pg.Client|pg.PoolClient), private _done:()=>void, _opts?:any){
        this._client = client as (pg.Client|pg.PoolClient)&{secretKey:string};
        if(connOpts==null){
            this.fromPool=true;
            this.postConnect();
            /* DOING
            if(self.opts.timeoutController){
                cancelTimeout(self.timeoutController);
            }
            self.timeoutController = setInterval(function(){
                // console.log('zzzzzzzzzzzzz',new Date().getTime() - self.lastOperationTimestamp, self.opts.releaseTimeout.inactive)
                if(new Date().getTime() - self.lastOperationTimestamp  > self.opts.releaseTimeout.inactive
                || new Date().getTime() - self.lastConnectionTimestamp > self.opts.releaseTimeout.connection
                ){
                    self.done();
                }
            },Math.min(1000,self.opts.releaseTimeout.inactive/4));
            */
            if(debug.pool){
                if(debug.pool===true){
                    debug.pool={};
                }
                if(!(this._client.secretKey in debug.pool)){
                    debug.pool[this._client.secretKey] = {client:this._client, count:0};
                }
                debug.pool[this._client.secretKey].count++;
            }
        }else{
            // pgPromiseStrict.log('new Client');
            this._client = new pg.Client(connOpts) as pg.Client&{secretKey:string};
            this._client.secretKey = this._client.secretKey||'secret_'+Math.random();
        }
    }
    connect(){
        if(this.fromPool){
            throw new Error("pg-promise-strict: Must not connect client from pool")
        }
        if(arguments.length){
            return Promise.reject(new Error('client.connect must no receive parameters, it returns a Promise'));
        }
        if(!this._client){
            /* istanbul ignore next */
            throw new Error("pg-promise-strict: lack of Client._client");
        }
        var client = this._client;
        var self = this;
        return new Promise(function(resolve, reject){
            client.connect(function(err){
                if(err){
                    reject(err);
                }else{
                    self.postConnect();
                    resolve(self);
                }
            });
        });
    };
    end(){
        if(this.fromPool){
            /* istanbul ignore next */
            throw new Error("pg-promise-strict: Must not end client from pool")
        }
        if(this._client instanceof pg.Client){
            this._client.end();
        }else{
            /* istanbul ignore next */
            throw new Error("pg-promise-strict: lack of Client._client");
        }
    };
    done(){
        if(!this._client){
            throw new Error("pg-promise-strict client already done");
        }
        if(debug.pool){
            // @ts-ignore DEBUGGING
            debug.pool[this._client.secretKey].count--;
        }
        var clientToDone=this._client;
        this._client=null;
        // @ts-ignore arguments Array like and applyable
        return this._done.apply(clientToDone, arguments);
    }
    query(sql:string):Query
    query(sql:string, params:any[]):Query
    query(sqlObject:{text:string, values:any[]}):Query
    query():Query{
        if(!this.connected || !this._client){
            /* istanbul ignore next */
            throw new Error("pg-promise-strict: query in not connected")
        }
        this.connected.lastOperationTimestamp = new Date().getTime();
        var queryArguments = Array.prototype.slice.call(arguments);
        var queryText;
        var queryValues=null;
        if(typeof queryArguments[0] === 'string'){
            queryText = queryArguments[0];
            queryValues = queryArguments[1] = adaptParameterTypes(queryArguments[1]||null);
        }else if(queryArguments[0] instanceof Object){
            queryText = queryArguments[0].text;
            queryValues = adaptParameterTypes(queryArguments[0].values||null);
            queryArguments[0].values = queryValues;
        }
        if(log){
            var sql=queryText;
            log('------','------');
            if(queryValues){
                log('`'+sql+'\n`','QUERY-P');
                log('-- '+JSON.stringify(queryValues),'QUERY-A');
                queryValues.forEach(function(value:any, i:number){
                    sql=sql.replace(new RegExp('\\$'+(i+1)+'\\b'), typeof value == "number" || typeof value == "boolean"?value:quoteNullable(value));
                });
            }
            log(sql+';','QUERY');
        }
        var returnedQuery = this._client.query(new pg.Query(queryArguments[0], queryArguments[1]));
        return new Query(returnedQuery, this, this._client);
    };
    async executeSentences(sentences:string[]){
        var self = this;
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error('pg-promise-strict: atempt to executeSentences on not connected '+!this._client+','+!this.connected)
        }
        var cdp:Promise<ResultCommand|void> = Promise.resolve();
        sentences.forEach(function(sentence){
            cdp = cdp.then(async function(){
                if(!sentence.trim()){
                    return ;
                }
                return await self.query(sentence).execute().catch(function(err:Error){
                    // console.log('ERROR',err);
                    // console.log(sentence);
                    throw err;
                });
            });
        });
        return cdp;
    }
    async executeSqlScript(fileName:string){
        var self=this;
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error('pg-promise-strict: atempt to executeSqlScript on not connected '+!this._client+','+!this.connected)
        }
        return fs.readFile(fileName,'utf-8').then(function(content){
            var sentences = content.split(/\r?\n\r?\n/);
            return self.executeSentences(sentences);
        });
    }
    bulkInsert(params:BulkInsertParams):Promise<void>{
        var self = this;
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error('pg-promise-strict: atempt to bulkInsert on not connected '+!this._client+','+!this.connected)
        }
        var sql = "INSERT INTO "+(params.schema?quoteIdent(params.schema)+'.':'')+
            quoteIdent(params.table)+" ("+
            params.columns.map(quoteIdent).join(', ')+") VALUES ("+
            params.columns.map(function(_name:string, i_name:number){ return '$'+(i_name+1); })+")";
        var insertOneRowAndContinueInserting = function insertOneRowAndContinueInserting(i_rows:number):Promise<void>{
            if(i_rows<params.rows.length){
                return self.query(sql, params.rows[i_rows]).execute().catch(function(err:Error){
                    if(params.onerror){
                        params.onerror(err, params.rows[i_rows]);
                    }else{
                        throw err;
                    }
                }).then(function(){
                    return insertOneRowAndContinueInserting(i_rows+1);
                });
            }
            return Promise.resolve();
        };
        return insertOneRowAndContinueInserting(0);
    }
    copyFromInlineDumpStream(opts:CopyFromOpts){
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error('pg-promise-strict: atempt to copyFrom on not connected '+!this._client+','+!this.connected)
        }
        var stream = this._client.query(copyFrom(`COPY ${opts.table} ${opts.columns?`(${opts.columns.map(name=>quoteIdent(name)).join(',')})`:''}${opts.with||''}  FROM STDIN`));
        if(opts.done){
            stream.on('error', opts.done);
            stream.on('end', opts.done);
            stream.on('close', opts.done);
        }
        if(opts.inStream != null){
            if(opts.done){
                opts.inStream.on('error', opts.done);
            }
            opts.inStream.pipe(stream);
        }
        return stream;
    }
    formatNullableToInlineDump(nullable:any){
        if(nullable==null){
            return '\\N'
        }else if(typeof nullable === "number" && isNaN(nullable)){
            return '\\N'
        }else{
            return nullable.toString().replace(/(\r)|(\n)|(\t)|(\\)/g, 
                function(_all:string,bsr:string,bsn:string,bst:string,bs:string){
                    if(bsr) return '\\r';
                    if(bsn) return '\\n';
                    if(bst) return '\\t';
                    if(bs) return '\\\\';
                    throw new Error("formatNullableToInlineDump error parsing")
                }
            );
        }
    }
    copyFromArrayStream(opts:CopyFromOpts){
        var c = this;
        var transform = new Transform({
            writableObjectMode:true,
            readableObjectMode:true,
            transform(arrayChunk:any[], _encoding, next){
                this.push(arrayChunk.map(x=>c.formatNullableToInlineDump(x)).join('\t')+'\n')
                next();
            },
            flush(next){
                this.push('\\.\n');
                next();
            }
        });
        var {inStream, ...rest} = opts;
        inStream.pipe(transform);
        return this.copyFromInlineDumpStream({inStream:transform, ...rest})
    }
}

var queryResult:pg.QueryResult;

export interface Result{
    rowCount:number
    fields:typeof queryResult.fields
}
export interface ResultCommand{
    command:string, rowCount:number
}
export interface ResultOneRow extends Result{
    row:{[key:string]:any}
}
export interface ResultOneRowIfExists extends Result{
    row?:{[key:string]:any}|null
}
export interface ResultRows extends Result{
    rows:{[key:string]:any}[]
}
export interface ResultValue extends Result{
    value:any
}
// export interface ResultGeneric extends ResultValue, ResultRows, ResultOneRowIfExists, ResultOneRow, Result{}
export type ResultGeneric = ResultValue|ResultRows|ResultOneRowIfExists|ResultOneRow|Result|ResultCommand

/*
function buildQueryCounterAdapter(
    minCountRow:number, 
    maxCountRow:number, 
    expectText:string, 
    callbackOtherControl?:(result:pg.QueryResult, resolve:(result:ResultGeneric)=>void, reject:(err:Error)=>void)=>void
){
    return function queryCounterAdapter(result:pg.QueryResult, resolve:(result:ResultGeneric)=>void, reject:(err:Error)=>void){ 
        if(result.rows.length<minCountRow || result.rows.length>maxCountRow ){
            var err=new Error('query expects '+expectText+' and obtains '+result.rows.length+' rows');
            // @ts-ignore EXTENDED ERROR
            err.code='54011!';
            reject(err);
        }else{
            if(callbackOtherControl){
                callbackOtherControl(result, resolve, reject);
            }else{
                var {rows, ...other} = result;
                resolve({row:rows[0], ...other});
            }
        }
    };
}
*/

type Notice = string;

class Query{
    constructor(private _query:pg.Query, public client:Client, private _internalClient:pg.Client|pg.PoolClient){
    }
    onNotice(callbackNoticeConsumer:(notice:Notice)=>void):Query{
        var q = this;
        var noticeCallback=function(notice:Notice){
            // @ts-ignore  DOES NOT HAVE THE CORRECT TYPE! LACKS of activeQuery
            if(q._internalClient.activeQuery==q._query){
                callbackNoticeConsumer(notice);
            }
        }
        // @ts-ignore .on('notice') DOES NOT HAVE THE CORRECT TYPE!
        this._internalClient.on('notice',noticeCallback);
        var removeNoticeCallback=function removeNoticeCallback(){
            q._internalClient.removeListener('notice',noticeCallback);
        }
        this._query.on('end',removeNoticeCallback);
        this._query.on('error',removeNoticeCallback);
        return this;
    };
    private _execute<TR extends ResultGeneric>(
        adapterCallback:null|((result:pg.QueryResult, resolve:(result:TR)=>void, reject:(err:Error)=>void)=>void),
        callbackForEachRow?:(row:{}, result:pg.QueryResult)=>Promise<void>, 
    ):Promise<TR>{
        var q = this;
        return new Promise<TR>(function(resolve, reject){
            q._query.on('error',function(err){
                if(log){
                    // @ts-ignore EXTENDED ERROR
                    log('--ERROR! '+err.code+', '+err.message, 'ERROR');
                }
                reject(err);
            });
            // @ts-ignore .on('row') DOES NOT HAVE THE CORRECT TYPE!
            q._query.on('row',function(row:{}, result:pg.QueryResult){
                if(callbackForEachRow){
                    if(log){
                        log('-- '+JSON.stringify(row), 'ROW');
                    }
                    callbackForEachRow(row, result);
                }else{
                    // @ts-ignore addRow ommited DOES NOT HAVE THE CORRECT TYPE!
                    result.addRow(row);
                }
            });
            q._query.on('end',function(result){
                // TODO: VER SI ESTO ES NECESARIO
                // result.client = q.client;
                if(log){
                    log('-- '+JSON.stringify(result.rows), 'RESULT');
                }
                if(adapterCallback){
                    adapterCallback(result, resolve, reject);
                }else{
                    resolve();
                }
            });
        });
    };
    async fetchUniqueValue():Promise<ResultValue>  { 
        var {row, ...result} = await this.fetchUniqueRow();
        if(result.fields.length!==1){
            var err=new Error('query expects one field and obtains '+result.fields.length);
            // @ts-ignore EXTENDED ERROR
            err.code='54U11!';
            throw err;
        }
        return {value:row[result.fields[0].name], ...result};
    }
    fetchUniqueRow(acceptNoRows?:boolean):Promise<ResultOneRow> { 
        return this._execute(function(result:pg.QueryResult, resolve:(result:ResultOneRow)=>void, reject:(err:Error)=>void):void{
            if(result.rowCount!==1 && (!acceptNoRows || !!result.rowCount)){
                var err=new Error('query expects one row and obtains '+result.rowCount);
                // @ts-ignore EXTENDED ERROR
                err.code='54011!';
                reject(err);
            }else{
                var {rows, ...rest} = result;
                resolve({row:rows[0], ...rest});
            }
        });
    }
    fetchOneRowIfExists():Promise<ResultOneRow> { 
        return this.fetchUniqueRow(true);
    }
    fetchAll():Promise<ResultRows>{
        return this._execute(function(result:pg.QueryResult, resolve:(result:ResultRows)=>void, _reject:(err:Error)=>void):void{
            resolve(result);
        });
    }
    execute():Promise<ResultCommand>{ 
        return this._execute(function(result:pg.QueryResult, resolve:(result:ResultCommand)=>void, _reject:(err:Error)=>void):void{
            var {rows, oid, fields, ...rest} = result;
            resolve(rest);
        });
    }
    async fetchRowByRow(cb:(row:{}, result:pg.QueryResult)=>Promise<void>):Promise<void>{ 
        if(!(cb instanceof Function)){
            var err=new Error('fetchRowByRow must receive a callback that executes for each row');
            // @ts-ignore EXTENDED ERROR
            err.code='39004!';
            return Promise.reject(err);
        }
        await this._execute(null, cb);
    }
    async onRow(cb:(row:{}, result:pg.QueryResult)=>Promise<void>):Promise<void>{ 
        return this.fetchRowByRow(cb);
    }
    then(){
        throw new Error('pg-promise-strict: Query must not be awaited nor thened')
    }
    catch(){
        throw new Error('pg-promise-strict: Query must not be awaited nor catched')
    }
};

export var allTypes=false;

export function setAllTypes(){
    var TypeStore = require('type-store');
    var DATE_OID = 1082;
    pgTypes.setTypeParser(DATE_OID, function parseDate(val){
       return bestGlobals.date.iso(val);
    });
    likeAr(TypeStore.type).forEach(function(_typeDef, typeName){
        var typer = new TypeStore.type[typeName]();
        if(typer.pgSpecialParse){
            (typer.pg_OIDS||[typer.pg_OID]).forEach(function(OID:number){
                pgTypes.setTypeParser(OID, function(val){
                    return typer.fromString(val);
                });
            });
        }
    });
};

var pools:{
    [key:string]:pg.Pool
} = {}

export function connect(connectParameters:ConnectParams):Promise<Client>{
    if(allTypes){
        setAllTypes();
    }
    return new Promise(function(resolve, reject){
        var idConnectParameters = JSON.stringify(connectParameters);
        var pool = pools[idConnectParameters]||new pg.Pool(connectParameters);
        pools[idConnectParameters] = pool;
        pool.connect(function(err, client, done){
            if(err){
                reject(err);
            }else{
                resolve(new Client(null, client, done /*, DOING {
                    releaseTimeout: changing(pgPromiseStrict.defaults.releaseTimeout,connectParameters.releaseTimeout||{})
                }*/));
            }
        });
    });
};

/* istanbul ignore next */
export function logLastError(message:string, messageType:string):void{
    if(messageType){
        if(messageType=='ERROR'){
            console.log('PG-ERROR pgPromiseStrict.logLastError.inFileName',logLastError.inFileName);
            console.log('PG-ERROR',message);
            if(logLastError.inFileName){
                var lines=['PG-ERROR '+message];
                /*jshint forin:false */
                for(var attr in logLastError.receivedMessages){
                    lines.push("------- "+attr+":\n"+logLastError.receivedMessages[attr]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
                fs.writeFile(logLastError.inFileName,lines.join('\n'));
            }else{
                /*jshint forin:false */
                for(var attr2 in logLastError.receivedMessages){
                    console.log(attr2, logLastError.receivedMessages[attr2]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
            }
            logLastError.receivedMessages = {};
        }else{
            logLastError.receivedMessages[messageType] = message;
        }
    }
}

logLastError.inFileName = './local-sql-error.log';
logLastError.receivedMessages={} as {
    [key:string]:string
};

export function poolBalanceControl(){
    var rta:string[]=[];
    if(typeof debug.pool === "object"){
        likeAr(debug.pool).forEach(function(pool){
            if(pool.count){
                rta.push('pgPromiseStrict.debug.pool unbalanced connection '+util.inspect(pool));
            }
        });
    }
    return rta.join('\n');
};

/* istanbul ignore next */
process.on('exit',function(){
    console.warn(poolBalanceControl());
});
