"use strict";

import * as fs from 'fs-extra';
import * as pg from 'pg';
const pgTypes = pg.types;

import {from as copyFrom} from 'pg-copy-streams';
import * as util from 'util';
import * as likeAr from 'like-ar';
import * as bestGlobals from 'best-globals';
import {Stream, Transform} from 'stream';

const MESSAGES_SEPARATOR_TYPE='------';
const MESSAGES_SEPARATOR='-----------------------';

export var messages = {
    attemptTobulkInsertOnNotConnected:"pg-promise-strict: atempt to bulkInsert on not connected",
    attemptTocopyFromOnNotConnected:"pg-promise-strict: atempt to copyFrom on not connected",
    attemptToExecuteSentencesOnNotConnected:"pg-promise-strict: atempt to executeSentences on not connected",
    attemptToExecuteSqlScriptOnNotConnected:"pg-promise-strict: atempt to executeSqlScript on not connected",
    clientAlreadyDone:"pg-promise-strict: client already done",
    clientConenctMustNotReceiveParams:"client.connect must no receive parameters, it returns a Promise",
    copyFromInlineDumpStreamOptsDoneExperimental:"WARNING! copyFromInlineDumpStream opts.done func is experimental",
    fetchRowByRowMustReceiveCallback:"fetchRowByRow must receive a callback that executes for each row",
    formatNullableToInlineDumpErrorParsing:"formatNullableToInlineDump error parsing",
    insaneName:"insane name",
    lackOfClient:"pg-promise-strict: lack of Client._client",
    mustNotConnectClientFromPool:"pg-promise-strict: Must not connect client from pool",
    mustNotEndClientFromPool:"pg-promise-strict: Must not end client from pool",
    nullInQuoteLiteral:"null in quoteLiteral",
    obtains1:"obtains $1",
    obtainsNone:"obtains none",
    queryExpectsOneFieldAnd1:"query expects one field and $1",
    queryExpectsOneRowAnd1:"query expects one row and $1",
    queryMustNotBeCatched:"pg-promise-strict: Query must not be awaited nor catched",
    queryMustNotBeThened:"pg-promise-strict: Query must not be awaited nor thened",
    queryNotConnected:"pg-promise-strict: query not connected",
    unbalancedConnection:"pgPromiseStrict.debug.pool unbalanced connection",
}

export var i18n:{
    messages:{
        en:typeof messages,
        [k:string]:Partial<typeof messages>
    }
} = {
    messages:{
        en:messages,
        es:{
            attemptTobulkInsertOnNotConnected:"pg-promise-strict: intento de bulkInsert en un cliente sin conexion",
            attemptTocopyFromOnNotConnected:"pg-promise-strict: intento de copyFrom en un cliente sin conexion",
            attemptToExecuteSentencesOnNotConnected:"pg-promise-strict: intento de executeSentences en un cliente sin conexion",
            attemptToExecuteSqlScriptOnNotConnected:"pg-promise-strict: intento de executeSqlScript en un cliente sin conexion",
            clientAlreadyDone:"pg-promise-strict: el cliente ya fue terminado",
            clientConenctMustNotReceiveParams:"pg-promise-strict: client.connect no debe recibir parametetros, devuelve una Promesa",
            copyFromInlineDumpStreamOptsDoneExperimental:"WARNING! copyFromInlineDumpStream opts.done es experimental",
            fetchRowByRowMustReceiveCallback:"fetchRowByRow debe recibir una funcion callback para ejecutar en cada registro",
            formatNullableToInlineDumpErrorParsing:"error al parsear en formatNullableToInlineDump",
            insaneName:"nombre invalido para objeto sql, debe ser solo letras, numeros o rayas empezando por una letra",
            lackOfClient:"pg-promise-strict: falta Client._client",
            mustNotConnectClientFromPool:"pg-promise-strict: No se puede conectar un 'Client' de un 'pool'",
            mustNotEndClientFromPool:"pg-promise-strict: no debe terminar el client desde un 'pool'",
            nullInQuoteLiteral:"la funcion quoteLiteral no debe recibir null",
            obtains1:"se obtuvieron $1",
            obtainsNone:"no se obtuvo ninguno",
            queryExpectsOneFieldAnd1:"se esperaba obtener un solo valor (columna o campo) y $1",
            queryExpectsOneRowAnd1:"se esperaba obtener un registro y $1",
            queryMustNotBeCatched:"pg-promise-strict: Query no puede ser usada con await o catch",
            queryMustNotBeThened:"pg-promise-strict: Query no puede ser usada con await o then",
            queryNotConnected:"pg-promise-strict: 'query' no conectada",
        }
    }
}

export function setLang(lang:string){
    if(lang in i18n.messages){
        messages = {...i18n.messages.en, ...i18n.messages[lang]};
    }
}

export var debug:{
    pool?:true|{
        [key:string]:{ count:number, client:(pg.Client|pg.PoolClient)&{secretKey:string}}
    }
}={};

export var defaults={
    releaseTimeout:{inactive:60000, connection:600000}
};

/* instanbul ignore next */
export function noLog(_message:string, _type:string){}

export var log:(message:string, type:string)=>void=noLog;

export function quoteIdent(name:string){
    if(typeof name!=="string"){
        throw new Error(messages.insaneName);
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
        throw new Error(messages.nullInQuoteLiteral);
    }
    return quoteNullable(anyValue);
};

export function json(sql:string, orderby:string){
    return `COALESCE((SELECT jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}

export function jsono(sql:string, indexedby:string){
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},to_jsonb(j.*)) from (${sql}) as j),'{}'::jsonb)`
}

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

export type CopyFromOptsCommon={table:string,columns?:string[],done?:(err?:Error)=>void, with?:string}
export type CopyFromOptsFile={inStream?:undefined, filename:string}&CopyFromOptsCommon
export type CopyFromOptsStream={inStream:Stream,filename?:undefined}&CopyFromOptsCommon
export type CopyFromOpts=CopyFromOptsFile|CopyFromOptsStream
export type BulkInsertParams={schema?:string,table:string,columns:string[],rows:any[][], onerror?:(err:Error, row:any[])=>Promise<void>}

export type Column = {data_type:string};

export class InformationSchemaReader{
    constructor(private client:Client){
    }
    async column(table_schema:string, table_name:string, column_name:string):Promise<Column|null>{
        var result = await this.client.query(`
            select * 
                from information_schema.columns
                where table_schema=$1
                    and table_name=$2
                    and column_name=$3;
        `,[table_schema, table_name, column_name]).fetchOneRowIfExists(); 
        console.log('*******************',arguments,result.row, result.row||null)
        return (result.row || null) as Column|null;
    }
}

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
    private _informationSchema:InformationSchemaReader|null=null;
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
            throw new Error(messages.mustNotConnectClientFromPool)
        }
        if(arguments.length){
            return Promise.reject(new Error(messages.clientConenctMustNotReceiveParams));
        }
        if(!this._client){
            /* istanbul ignore next */
            throw new Error(messages.lackOfClient);
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
            throw new Error(messages.mustNotEndClientFromPool)
        }
        if(this._client instanceof pg.Client){
            this._client.end();
        }else{
            /* istanbul ignore next */
            throw new Error(messages.lackOfClient);
        }
    };
    done(){
        if(!this._client){
            throw new Error(messages.clientAlreadyDone);
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
            throw new Error(messages.queryNotConnected)
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
            log(MESSAGES_SEPARATOR, MESSAGES_SEPARATOR_TYPE);
            if(queryValues && queryValues.length){
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
    get informationSchema():InformationSchemaReader{
        return this._informationSchema || new InformationSchemaReader(this);
    }
    async executeSentences(sentences:string[]){
        var self = this;
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error(messages.attemptToExecuteSentencesOnNotConnected+" "+!this._client+','+!this.connected)
        }
        var cdp:Promise<ResultCommand|void> = Promise.resolve();
        sentences.forEach(function(sentence){
            cdp = cdp.then(async function(){
                if(!sentence.trim()){
                    return ;
                }
                return await self.query(sentence).execute().catch(function(err:Error){
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
            throw new Error(messages.attemptToExecuteSqlScriptOnNotConnected+" "+!this._client+','+!this.connected)
        }
        return fs.readFile(fileName,'utf-8').then(function(content){
            var sentences = content.split(/\r?\n\r?\n/);
            return self.executeSentences(sentences);
        });
    }
    async bulkInsert(params:BulkInsertParams):Promise<void>{
        var self = this;
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error(messages.attemptTobulkInsertOnNotConnected+" "+!this._client+','+!this.connected)
        }
        var sql = "INSERT INTO "+(params.schema?quoteIdent(params.schema)+'.':'')+
            quoteIdent(params.table)+" ("+
            params.columns.map(quoteIdent).join(', ')+") VALUES ("+
            params.columns.map(function(_name:string, i_name:number){ return '$'+(i_name+1); })+")";
        var i_rows=0;
        while(i_rows<params.rows.length){
            try{
                await self.query(sql, params.rows[i_rows]).execute();
            }catch(err){
                if(params.onerror){
                    await params.onerror(err, params.rows[i_rows]);
                }else{
                    throw err;
                }
            }
            i_rows++;
        }
    }
    copyFromParseParams(opts:CopyFromOpts){
        /* istanbul ignore next */
        if(opts.done){
            console.log(messages.copyFromInlineDumpStreamOptsDoneExperimental);
        }
        if(!this._client || !this.connected){
            /* istanbul ignore next */
            throw new Error(messages.attemptTocopyFromOnNotConnected+" "+!this._client+','+!this.connected)
        }
        var from = opts.inStream ? 'STDIN' : quoteLiteral(opts.filename);
        var sql = `COPY ${opts.table} ${opts.columns?`(${opts.columns.map(name=>quoteIdent(name)).join(',')})`:''} FROM ${from} ${opts.with?'WITH '+opts.with:''}`;
        return {sql, _client:this._client};
    }
    async copyFromFile(opts:CopyFromOptsFile):Promise<ResultCommand>{
        var {sql} = this.copyFromParseParams(opts);
        return this.query(sql).execute();
    }
    copyFromInlineDumpStream(opts:CopyFromOptsStream){
        var {sql, _client} = this.copyFromParseParams(opts);
        var stream = _client.query(copyFrom(sql));
        /* istanbul ignore next skipping expermiental feature */
        if(opts.done){
            /* istanbul ignore next skipping expermiental feature */
            stream.on('error', opts.done);
            /* istanbul ignore next skipping expermiental feature */
            stream.on('end', opts.done);
            /* istanbul ignore next skipping expermiental feature */
            stream.on('close', opts.done);
        }
        if(opts.inStream){
            /* istanbul ignore next skipping expermiental feature */
            if(opts.done){
                /* istanbul ignore next skipping expermiental feature */
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
                    /* istanbul ignore else por la regexp es imposible que pase al else */
                    if(bs) return '\\\\';
                    /* istanbul ignore next Esto es imposible que suceda */
                    throw new Error(messages.formatNullableToInlineDumpErrorParsing)
                }
            );
        }
    }
    copyFromArrayStream(opts:CopyFromOptsStream){
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

function logErrorIfNeeded<T>(err:Error, code?:T):Error{
    if(code != null){
        // @ts-ignore EXTENDED ERROR
        err.code=code;
    }
    if(log){
        // @ts-ignore EXTENDED ERROR
        log('--ERROR! '+err.code+', '+err.message, 'ERROR');
    }
    return err;
}

function obtains(message:string, count:number):string{
    return message.replace('$1',
        count?messages.obtains1.replace('$1',count.toString()):messages.obtainsNone
    );
} 


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
            var pendingRows=0;
            var endMark:null|{result:pg.QueryResult}=null;
            q._query.on('error',function(err){
                reject(err);
            });
            // @ts-ignore .on('row') DOES NOT HAVE THE CORRECT TYPE!
            q._query.on('row',async function(row:{}, result:pg.QueryResult){
                if(callbackForEachRow){
                    pendingRows++;
                    if(log){
                        log('-- '+JSON.stringify(row), 'ROW');
                    }
                    await callbackForEachRow(row, result);
                    --pendingRows;
                    whenEnd();
                }else{
                    // @ts-ignore addRow ommited DOES NOT HAVE THE CORRECT TYPE!
                    result.addRow(row);
                }
            });
            function whenEnd(){
                if(endMark && !pendingRows){
                    if(adapterCallback){
                        adapterCallback(endMark.result, resolve, reject);
                    }else{
                        resolve();
                    }
                }
            }
            q._query.on('end',function(result){
                // TODO: VER SI ESTO ES NECESARIO
                // result.client = q.client;
                if(log){
                    log('-- '+JSON.stringify(result.rows), 'RESULT');
                }
                endMark={result};
                whenEnd();
            });
        }).catch(function(err){
            throw logErrorIfNeeded(err);
        });
    };
    async fetchUniqueValue(errorMessage?:string):Promise<ResultValue>  { 
        var {row, ...result} = await this.fetchUniqueRow();
        if(result.fields.length!==1){
            throw logErrorIfNeeded(
                new Error(obtains(errorMessage||messages.queryExpectsOneFieldAnd1, result.fields.length)),
                '54U11!'
            );
        }
        return {value:row[result.fields[0].name], ...result};
    }
    fetchUniqueRow(errorMessage?:string,acceptNoRows?:boolean):Promise<ResultOneRow> { 
        return this._execute(function(result:pg.QueryResult, resolve:(result:ResultOneRow)=>void, reject:(err:Error)=>void):void{
            if(result.rowCount!==1 && (!acceptNoRows || !!result.rowCount)){
                var err = new Error(obtains(errorMessage||messages.queryExpectsOneRowAnd1,result.rowCount));
                //@ts-ignore err.code
                err.code = '54011!'
                reject(err);
            }else{
                var {rows, ...rest} = result;
                resolve({row:rows[0], ...rest});
            }
        });
    }
    fetchOneRowIfExists(errorMessage?:string):Promise<ResultOneRow> { 
        return this.fetchUniqueRow(errorMessage,true);
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
            var err=new Error(messages.fetchRowByRowMustReceiveCallback);
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
        throw new Error(messages.queryMustNotBeThened)
    }
    catch(){
        throw new Error(messages.queryMustNotBeCatched)
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

export var readyLog = Promise.resolve();

/* xxistanbul ignore next */
export function logLastError(message:string, messageType:string):void{
    if(messageType){
        if(messageType=='ERROR'){
            if(logLastError.inFileName){
                var lines=['PG-ERROR '+message];
                /*jshint forin:false */
                for(var attr in logLastError.receivedMessages){
                    lines.push("------- "+attr+":\n"+logLastError.receivedMessages[attr]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
                readyLog = readyLog.then(_=>fs.writeFile(logLastError.inFileName,lines.join('\n')));
            }else{
                /*jshint forin:false */
                for(var attr2 in logLastError.receivedMessages){
                    /* istanbul ignore next */
                    console.log(attr2, logLastError.receivedMessages[attr2]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
            }
            logLastError.receivedMessages = {};
        }else{
            if(messageType==MESSAGES_SEPARATOR_TYPE){
                logLastError.receivedMessages = {};
            }
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
                rta.push(messages.unbalancedConnection+' '+util.inspect(pool));
            }
        });
    }
    return rta.join('\n');
};

/* istanbul ignore next */
process.on('exit',function(){
    console.warn(poolBalanceControl());
});
