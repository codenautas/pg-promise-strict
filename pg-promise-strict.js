/// <reference path="./in-pg-promise-strict.d.ts" />
"use strict";

/** @typedef {()=>void} DoneCallback */

/**
 * @typedef {typeof pgps & {
    Client:new (connOpts:pgps.ConnectParams, client:pg.Client, done:DoneCallback, specificOptions?:{})=>pgps.Client
    adaptParameterTypes:(parameters:any)=>void
   }} PG 
 * */

/** @type {PG} */
var pgPromiseStrict = {};

// @ts-ignore 
var fs = require('fs-extra');
var pg = require('pg');
var pgTypes = pg.types;

var copyFrom = require('pg-copy-streams').from;
var util = require('util');
var likeAr = require('like-ar');
var bestGlobals = require('best-globals');
var changing = bestGlobals.changing;

/** @typedef {pg.QueryResult} RESULT */

pgPromiseStrict.debug={};

pgPromiseStrict.defaults={
    releaseTimeout:{inactive:60000, connection:600000}
};

/** @param {string} name */
pgPromiseStrict.quoteIdent=function quoteIdent(name){
    if(typeof name!=="string"){
        throw new Error("insaneName");
    }
    return '"'+name.replace(/"/g, '""')+'"';
};

pgPromiseStrict.quoteObject=util.deprecate(
    /** @param {{}} name */
    function quoteObject(name){
        if(typeof name!=="string"){
            throw new Error("insaneName");
        }
        return '"'+name.replace(/"/g, '""')+'"';
    },
    'promise-strict.quoteObject: use quoteIdent instead'
);

// @ts-ignore
pgPromiseStrict.quoteObjectList = util.deprecate(
    /** @param {string[]} ObjectList */
    function quoteObjectList(ObjectList){
        /** @type {typeof pgps} */
        // @ts-ignore
        var self= this;
        return ObjectList.map(function(objectName){ return self.quoteObject(objectName); }).join(',');
    },
    'promise-strict.quoteObjectList: use quoteIdentList instead'
);

pgPromiseStrict.quoteIdentList = function quoteIdentList(ObjectList){
    var self=this;
    return ObjectList.map(function(objectName){ return self.quoteIdent(objectName); }).join(',');
};

// @ts-ignore
pgPromiseStrict.quoteText=util.deprecate(function quoteText(anyTextData, opts){
    if(anyTextData==null){
        if(opts && opts.allowNull){
            return 'null';
        }else{
            throw new Error("null in quoteText without opts.allowNull");
        }
    }else if(typeof anyTextData!=="string"){
        throw new Error("not text data");
    }
    return "'"+anyTextData.replace(/'/g,"''")+"'";
},'promise-strict.quoteText: use quoteNullable or quoteLiteral instead');

pgPromiseStrict.quoteNullable=function quoteNullable(anyValue){
    if(anyValue==null){
        return 'null';
    }
    if(anyValue.isRealDate){
        anyValue = anyValue.toYmd();
    // }else if(anyValue.isRealDateTime){
    //     anyValue = anyValue.toISOString();
    }else if(anyValue instanceof Date){
        anyValue = anyValue.toISOString();
    }else if(typeof anyValue === 'object' && typeof anyValue.toPostgres === 'function'){
        anyValue = anyValue.toPostgres();
    }else{
        anyValue = anyValue.toString();
    }
    return "'"+anyValue.replace(/'/g,"''")+"'";
};

pgPromiseStrict.quoteLiteral=function quoteLiteral(anyValue){
    if(anyValue==null){
        throw new Error("null in quoteLiteral");
    }
    return pgPromiseStrict.quoteNullable(anyValue);
};

pgPromiseStrict.adaptParameterTypes = function adaptParameterTypes(parameters){
    // @ts-ignore 
    return parameters.map(function(value){
        if(value && value.typeStore){
            return value.toLiteral();
        }
        return value;
    });
};

function NotTheneable(){
    /** @type {{[key:string]:(()=>void)}} */
    var rejecter = {};
    // var rejection = function(){Promise.reject(new Error("pg-promise-strict the client was released"));};
    var rejection = Promise.reject(new Error("pg-promise-strict: not call function as thenable"));
    [{name:'then'},{name:'catch'}].concat(easiers).forEach(function(easierDef){
        rejecter[easierDef.name] = function(){
            return rejection;
        };
    });
    return rejecter;
}

/** @extends {pgps.Client} Client */
/** @private {number} lastOperationTimestamp */
/** @private {number} lastConnectionTimestamp */
/** @property {boolean} fromPool */
/** @property {{}} opts */
/** @property {boolean} connected */
class Client{
    /** @param {pgps.ConnectParams} connOpts */
    /** @param {pg.Client & {secretKey:string}} client */
    /** @param {()=>void} done */
    /** @param {{}} specificOptions? */
    constructor(connOpts, client, done, specificOptions){
        this.fromPool = connOpts==='pool';
        /** @type {pg.Client|null} */
        this._client = client;
        this._done = done;
        this._connected = !!client;
        if(this.fromPool){
            this.opts=specificOptions;
            this.lastOperationTimestamp = new Date().getTime();
            this.lastConnectionTimestamp = this.lastOperationTimestamp;
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
            if(pgPromiseStrict.debug.pool){
                if(pgPromiseStrict.debug.pool===true){
                    pgPromiseStrict.debug.pool={};
                }
                if(!(client.secretKey in pgPromiseStrict.debug.pool)){
                    pgPromiseStrict.debug.pool[client.secretKey] = {client:client, count:0};
                }
                pgPromiseStrict.debug.pool[client.secretKey].count++;
            }
        }else{
            // pgPromiseStrict.log('new Client');
            this._client = new pg.Client(connOpts);
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
            throw new Error("pg-promise-strict: lack of Client._client");
        }
        /** @type {pg.Client} */
        var client = this._client;
        var self = this;
        return new Promise(function(resolve, reject){
            client.connect(function(err){
                if(err){
                    reject(err);
                }else{
                    self._connected = true;
                    resolve(self);
                }
            });
        });
    };
    end(){
        if(this.fromPool){
            throw new Error("pg-promise-strict: Must not end client from pool")
        }
        if(!this._client){
            throw new Error("pg-promise-strict: lack of Client._client");
        }
        this._client.end();
    };
    assertConnected(){
        if(!this._connected){
            throw new Error('pg-promise-strict: not connected por use this function');
        }
    }
    done(){
        if(!this._client){
            throw new Error("pg-promise-strict client already done");
        }
        if(pgPromiseStrict.debug.pool){
            // @ts-ignore DEBUGGING
            pgPromiseStrict.debug.pool[this._client.secretKey].count--;
        }
        var clientToDone=this._client;
        this._client=null;
        // @ts-ignore arguments Array like and applyable
        return this._done.apply(clientToDone, arguments);
    }
    query(){
        this.assertConnected();
        if(!this._client){
            return NotTheneable();
        }
        this.lastOperationTimestamp = new Date().getTime();
        var queryArguments = Array.prototype.slice.call(arguments);
        var queryText;
        var queryValues;
        if(typeof queryArguments[0] === 'string' && queryArguments[1] instanceof Array){
            queryText = queryArguments[0];
            queryValues = queryArguments[1] = pgPromiseStrict.adaptParameterTypes(queryArguments[1]);
        }else if(queryArguments[0] instanceof Object && queryArguments[0].values instanceof Array){
            queryText = queryArguments[0].text;
            queryValues = pgPromiseStrict.adaptParameterTypes(queryArguments[0].values);
            queryArguments[0].values = queryValues;
        }
        if(pgPromiseStrict.log){
            var sql=queryArguments[0];
            pgPromiseStrict.log('------','------');
            if(queryArguments[1]){
                pgPromiseStrict.log('`'+sql+'\n`','QUERY-P');
                pgPromiseStrict.log('-- '+JSON.stringify(queryArguments[1]),'QUERY-A');
                queryArguments[1].forEach(
                    /** @param {any} value */
                    /** @param {number} i */
                    function(value, i){
                        sql=sql.replace(new RegExp('\\$'+(i+1)+'\\b'), typeof value == "number" || typeof value == "boolean"?value:pgPromiseStrict.quoteNullable(value));
                    }
                );
            }
            pgPromiseStrict.log(sql+';','QUERY');
        }
        var returnedQuery = this._client.query(new pg.Query(queryArguments[0], queryArguments[1]));
        return new pgPromiseStrict.Query(returnedQuery, this, this._client);
    };
    /** @param {string[]} sentences */
    executeSentences(sentences){
        var self = this;
        this.assertConnected();
        var cdp = Promise.resolve();
        sentences.forEach(function(sentence){
            cdp = cdp.then(function(){
                if(!sentence.trim()){
                    return;
                }
                return self.query(sentence).execute().catch(
                    /** @param {Error} err */
                    function(err){
                        // console.log('ERROR',err);
                        // console.log(sentence);
                        throw err;
                    }
                );
            });
        });
        return cdp;
    }
    /** @param {string} fileName */
    executeSqlScript(fileName){
        var self=this;
        this.assertConnected();
        return fs.readFile(fileName,'utf-8').then(function(content){
            var sentences = content.split(/\r?\n\r?\n/);
            return self.executeSentences(sentences);
        });
    }
    /** @param {pgps.BulkInsertParams} params*/
    bulkInsert(params){
        var self = this;
        this.assertConnected();
        var sql = "INSERT INTO "+(params.schema?pgPromiseStrict.quoteObject(params.schema)+'.':'')+
            pgPromiseStrict.quoteObject(params.table)+" ("+
            params.columns.map(pgPromiseStrict.quoteObject).join(', ')+") VALUES ("+
            params.columns.map(function(name, i_name){ return '$'+(i_name+1); })+")";
        /** @param {number} i_rows */
        var insertOneRowAndContinueInserting = function insertOneRowAndContinueInserting(i_rows){
            if(i_rows<params.rows.length){
                return self.query(sql, params.rows[i_rows]).execute().catch(
                    /** @param {Error} err */
                    function(err){
                        if(params.onerror){
                            params.onerror(err, params.rows[i_rows]);
                        }else{
                            throw err;
                        }
                    }
                ).then(function(){
                    return insertOneRowAndContinueInserting(i_rows+1);
                });
            }
            return;
        };
        return insertOneRowAndContinueInserting(0);
    }
    /** @param {pgps.CopyFromOpts} opts */
    copyFrom(opts){
        this.assertConnected();
        if(!this._client){
            throw new Error("pg-promise-stric: no Client._client in copyFrom")
        }
        var stream = this._client.query(copyFrom(`'COPY ${opts.table} ${opts.columns?`(${opts.columns.map(name=>pgPromiseStrict.quoteIdent(name)).join(',')})`:''} FROM STDIN`));
        if(!opts.stream){
            if(opts.done){
                opts.stream.on('error', opts.done);
                stream.on('error', opts.done);
                stream.on('end', opts.done);
            }
            opts.stream.pipe(stream);
        }
        return opts.stream;
    }
}


pgPromiseStrict.Client = Client;

/**
 * @param {number} minCountRow 
 * @param {number} maxCountRow 
 * @param {string} expectText 
 * @param {(result:RESULT, resolve:((value:any)=>void), reject:((err:any)=>void))=>((result:RESULT, resolve:((value:any)=>void), reject:((err:any)=>void))=>void) } callbackOtherControl 
 */
function buildQueryCounterAdapter(minCountRow, maxCountRow, expectText, callbackOtherControl){
    return function queryCounterAdapter(result, resolve, reject){ 
        if(result.rows.length<minCountRow || result.rows.length>maxCountRow ){
            var err=new Error('query expects '+expectText+' and obtains '+result.rows.length+' rows');
            // @ts-ignore EXTENDED ERROR
            err.code='54011!';
            reject(err);
        }else{
            if(callbackOtherControl){
                callbackOtherControl(result, resolve, reject);
            }else{
                result.row = result.rows[0];
                delete result.rows;
                resolve(result);
            }
        }
    };
}

pgPromiseStrict.queryAdapters = {
    normal: function normalQueryAdapter(result, resolve/*, reject*/){ 
        resolve(result);
    },
    upto1:buildQueryCounterAdapter(0,1,'up to one row'),
    row:buildQueryCounterAdapter(1,1,'one row'),
    value: buildQueryCounterAdapter(1,1,'one row (with one field)',function(result, resolve, reject){
        if(result.fields.length!==1){
            var err=new Error('query expects one field and obtains '+result.fields.length);
            err.code='54U11!';
            reject(err);
        }else{
            var row = result.rows[0];
            result.value = row[result.fields[0].name];
            delete result.rows;
            resolve(result);
        }
    })
};

var easiers=[
    {name:'execute'             , funName:'execute'},
    {name:'fetchOneRowIfExists' , funName:'execute', binding:'upto1' },
    {name:'fetchUniqueRow'      , funName:'execute', binding:'row'   },
    {name:'fetchUniqueValue'    , funName:'execute', binding:'value' },
    {name:'fetchAll'            , funName:'execute', binding:'normal'},
    {name:'fetchRowByRow'       , fun: function fetchRowByRow(callback){
        // pgPromiseStrict.log('Query.onRow');
        if(!(callback instanceof Function)){
            var err=new Error('fetchRowByRow must receive a callback that executes for each row');
            err.code='39004!';
            return Promise.reject(err);
        }
        return this.execute(callback);
    }},
    {name:'onRow'              , funName:'fetchRowByRow'}
];

pgPromiseStrict.Query = function Query(query, client, internalClient){
    var self = this;
    // pgPromiseStrict.allowAccessInternalIfDebugging(self, {query: query, client:client});
    this.onNotice = function onNotice(callbackNoticeConsumer){
        var noticeCallback=function(notice){
            if(this.activeQuery==query){
                callbackNoticeConsumer(notice);
            }
        }
        internalClient.on('notice',noticeCallback);
        var removeNoticeCallback=function removeNoticeCallback(){
            internalClient.removeListener('notice',noticeCallback);
        }
        query.on('end',removeNoticeCallback);
        query.on('error',removeNoticeCallback);
        return this;
    };
    this.execute = function execute(callbackForEachRow, adapterName){
        // pgPromiseStrict.log('Query.execute');
        if(callbackForEachRow && !(callbackForEachRow instanceof Function)){
            if(adapterName){
                return Promise.reject(new Error("Query.execute() must receive optional callback function and optional adapterName"));
            }
            adapterName=callbackForEachRow;
            callbackForEachRow=null;
        }
        var adapter = pgPromiseStrict.queryAdapters[adapterName||'normal'];
        return new Promise(function(resolve, reject){
            query.on('error',function(err){
                if(pgPromiseStrict.log){
                    pgPromiseStrict.log('--ERROR! '+err.code+', '+err.message, 'ERROR');
                }
                reject(err);
            });
            query.on('row',function(row, result){
                // console.log('xxxxxxxxxxxxx row', row, result);
                if(callbackForEachRow){
                    if(pgPromiseStrict.log){
                        pgPromiseStrict.log('-- '+JSON.stringify(row), 'ROW');
                    }
                    callbackForEachRow(row, result);
                }else{
                    result.addRow(row);
                }
            });
            query.on('end',function(result){
                result.client = client;
                if(pgPromiseStrict.log){
                    pgPromiseStrict.log('-- '+JSON.stringify(result.rows), 'RESULT');
                }
                adapter(result, resolve, reject);
            });
            // console.log('xxxxxx ok adapted');
        });
    };
    // new functions
    easiers.forEach(function(easierDef){
        if(easierDef.binding){
            self[easierDef.name] = self[easierDef.funName].bind(self,easierDef.binding);
        }else if(easierDef.fun){
            self[easierDef.name] = easierDef.fun;
        }else{
            self[easierDef.name] = self[easierDef.funName];
        }
    });
    /* why this then function is needed?
     *   pg.Client.query is synchronic (not need to receive a callback function) then not need to return a Promise
     *   but pg-promise-strict always returns a "theneable". Then "then" is here. 
     */
    if(pgPromiseStrict.easy){
        this.then = function then(callback,callbackE){
            delete this.then;
            delete this.catch;
            return this.execute().then(callback,callbackE);
        };
    }
};

var allTypes=false;

pgPromiseStrict.setAllTypes = function setAllTypes(){
    var TypeStore = require('type-store');
    var DATE_OID = 1082;
    pgTypes.setTypeParser(DATE_OID, function parseDate(val){
       return bestGlobals.date.iso(val);
    });
    likeAr(TypeStore.type).forEach(function(typeDef, typeName){
        var typer = new TypeStore.type[typeName]();
        if(typer.pgSpecialParse){
            (typer.pg_OIDS||[typer.pg_OID]).forEach(function(OID){
                pgTypes.setTypeParser(OID, function(val){
                    return typer.fromString(val);
                });
            });
        }
    });
};

var pools = {};

pgPromiseStrict.connect = function connect(connectParameters){
    // pgPromiseStrict.log('pg.connect');
    if(pgPromiseStrict.easy && allTypes){
        pgPromiseStrict.setAllTypes();
    }
    return new Promise(function(resolve, reject){
        var idConnectParameters = JSON.stringify(connectParameters);
        var pool = pools[idConnectParameters]||new pg.Pool(connectParameters);
        pools[idConnectParameters] = pool;
        pool.connect(function(err, client, done){
            if(err){
                reject(err);
            }else{
                resolve(new pgPromiseStrict.Client('pool', client, done /*, DOING {
                    releaseTimeout: changing(pgPromiseStrict.defaults.releaseTimeout,connectParameters.releaseTimeout||{})
                }*/));
            }
        });
    });
};

pgPromiseStrict.logLastError = function logLastError(message, messageType){
    if(messageType){
        if(messageType=='ERROR'){
            console.log('PG-ERROR pgPromiseStrict.logLastError.inFileName',pgPromiseStrict.logLastError.inFileName);
            console.log('PG-ERROR',message);
            if(pgPromiseStrict.logLastError.inFileName){
                var lines=['PG-ERROR '+message];
                /*jshint forin:false */
                for(var attr in pgPromiseStrict.logLastError.receivedMessages){
                    lines.push("------- "+attr+":\n"+pgPromiseStrict.logLastError.receivedMessages[attr]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
                fs.writeFile(pgPromiseStrict.logLastError.inFileName,lines.join('\n'));
            }else{
                /*jshint forin:false */
                for(var attr2 in pgPromiseStrict.logLastError.receivedMessages){
                    console.log(attr2, pgPromiseStrict.logLastError.receivedMessages[attr2]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
            }
            pgPromiseStrict.logLastError.receivedMessages = {};
        }else{
            pgPromiseStrict.logLastError.receivedMessages[messageType] = message;
        }
    }
};

pgPromiseStrict.logLastError.receivedMessages={};

pgPromiseStrict.poolBalanceControl = function poolBalanceControl(){
    var rta=[];
    if(pgPromiseStrict.debug.pool){
        likeAr(pgPromiseStrict.debug.pool).forEach(function(pool){
            if(pool.count){
                rta.push('pgPromiseStrict.debug.pool unbalanced connection '+util.inspect(pool));
            }
        });
    }
    return rta.join('\n');
};

/* istanbul ignore next */
process.on('exit',function(){
    console.warn(pgPromiseStrict.poolBalanceControl());
});

// pgPromiseStrict.setAllTypes();

module.exports = pgPromiseStrict;
