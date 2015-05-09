"use strict";

var pg = require('pg');
var Promise = require('promise');
var util = require('util');

var pgPromiseStrict={
};

pgPromiseStrict.debug={};

pgPromiseStrict.allowAccessInternalIfDebugging = function allowAccessInternalIfDebugging(self, internals){
    if(pgPromiseStrict.debug[self.constructor.name]){
        self.internals = internals;
    }
}

pgPromiseStrict.Client = function Client(client, done){
    if(pgPromiseStrict.debug.pool){
        if(pgPromiseStrict.debug.pool===true){
            pgPromiseStrict.debug.pool={};
        }
        if(!(client.secretKey in pgPromiseStrict.debug.pool)){
            pgPromiseStrict.debug.pool[client.secretKey] = {client:client, count:0};
        }
        pgPromiseStrict.debug.pool[client.secretKey].count++;
    }
    var self = this;
    pgPromiseStrict.allowAccessInternalIfDebugging(self, {client:client, done:done});
    // existing functions
    this.done = function(){
        if(pgPromiseStrict.debug.pool){
            pgPromiseStrict.debug.pool[client.secretKey].count--;
        }
        return done.apply(client,arguments);
    }
    this.query = function query(){
        var queryArguments = arguments;
        var returnedQuery = client.query.apply(client,queryArguments);
        return new pgPromiseStrict.Query(returnedQuery, self);
    }
}

function buildQueryCounterAdapter(minCountRow, maxCountRow, expectText, callbackOtherControl){
    return function queryCounterAdapter(result, resolve, reject){ 
        if(result.rows.length<minCountRow || result.rows.length>maxCountRow ){
            var err=new Error('query expects '+expectText+' and obtains '+result.rows.length+' rows');
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
    }
}

pgPromiseStrict.queryAdapters = {
    normal: function normalQueryAdapter(result, resolve, reject){ 
        resolve(result);
    },
    upto1:buildQueryCounterAdapter(0,1,'up to one row'),
    row:buildQueryCounterAdapter(1,1,'one row'),
    value: buildQueryCounterAdapter(1,1,'one row (with one field)',function(result, resolve, reject){
        if(result.fields.length!=1){
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
}

pgPromiseStrict.Query = function Query(query, client){
    var self = this;
    pgPromiseStrict.allowAccessInternalIfDebugging(self, {query: query, client:client});
    this.execute = function execute(callbackForEachRow, adapterName){
        if(callbackForEachRow && !(callbackForEachRow instanceof Function)){
            if(adapterName){
                return Promise.reject(new Error("Query.execute() must recive optional callback function and optional adapterName"));
            }
            adapterName=callbackForEachRow;
            callbackForEachRow=null;
        }
        var adapter = pgPromiseStrict.queryAdapters[adapterName||'normal'];
        return new Promise(function(resolve, reject){
            query.on('error',function(err){
                reject(err);
            });
            query.on('row',function(row, result){
                if(callbackForEachRow){
                    callbackForEachRow(row, result);
                }else{
                    result.addRow(row);
                }
            });
            query.on('end',function(result){
                result.client = client;
                adapter(result, resolve, reject);
            });
        });
    }
    // new functions
    this.fetchOneRowIfExists = this.execute.bind(this,'upto1');
    this.fetchUniqueRow      = this.execute.bind(this,'row');
    this.fetchUniqueValue    = this.execute.bind(this,'value');
    this.fetchAll            = this.execute.bind(this,'normal');
    this.fetchRowByRow       = function fetchRowByRow(callback){
        if(!(callback instanceof Function)){
            var err=new Error('fetchRowByRow must recive a callback that executes for each row');
            err.code='39004!';
            return Promise.reject(err);
        }
        return this.execute(callback);
    };
    /* why this then function is needed?
     *   pg.Client.query is synchronic (not need to recive a callback function) then not need to return a Promise
     *   but pg-promise-strict always returns a "theneable". Then "then" is here. 
     */
    if(pgPromiseStrict.easy){
        this.then = function then(callback,callbackE){
            delete this.then;
            delete this.catch;
            return this.execute().then(callback,callbackE);
        }
    }
};

pgPromiseStrict.connect = function connect(connectParameters){
    return new Promise(function(resolve, reject){
        pg.connect(connectParameters,function(err, client, done){
            if(err){
                reject(err);
            }else{
                resolve(new pgPromiseStrict.Client(client, done));
            }
        });
    });
}

pgPromiseStrict.poolBalanceControl = function poolBalanceControl(connectParameters){
    var rta=[];
    if(pgPromiseStrict.debug.pool){
        for(var key in pgPromiseStrict.debug.pool){
            if(pgPromiseStrict.debug.pool[key].count){
                rta.push('pgPromiseStrict.debug.pool unbalanced connection '+util.inspect(pgPromiseStrict.debug.pool[key]));
            }
        }
    }
    return rta.join('\n');
}

/* istanbul ignore next */
process.on('exit',function(){
    console.warn(pgPromiseStrict.poolBalanceControl());
});


module.exports = pgPromiseStrict;
