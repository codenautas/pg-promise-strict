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

pgPromiseStrict.Query = function Query(query, client){
    var self = this;
    pgPromiseStrict.allowAccessInternalIfDebugging(self, {query: query, client:client});
    var readRowsThenControlAndAdapt = function readRowsThenControlAndAdapt(controlAndAdapt, callbackForEachRow){
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
                controlAndAdapt(result, resolve, reject);
            });
        });
    };
    // auxiliars
    var controlAndAdaptRowCount=function(minCountRow, maxCountRow, expectText, callbackOtherControl){
        return function(){
            return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
                if(result.rows.length<minCountRow || result.rows.length>maxCountRow ){
                    reject(new Error('query expects '+expectText+' and obtains '+result.rows.length+' rows'));
                }else{
                    if(callbackOtherControl){
                        callbackOtherControl(result, resolve, reject);
                    }else{
                        result.row = result.rows[0];
                        delete result.rows;
                        resolve(result);
                    }
                }
            });
        }
    }
    // new functions
    this.fetchOneRowIfExists = controlAndAdaptRowCount(0,1,'at least one row');
    this.execute = controlAndAdaptRowCount(0,1,'at least one result row');
    this.fetchUniqueRow = controlAndAdaptRowCount(1,1,'one row');
    this.fetchUniqueValue = controlAndAdaptRowCount(1,1,'one row (with one field)',function(result, resolve, reject){
        var row = result.rows[0];
        var fieldCount=0;
        for(var fieldName in row){
            result.value = row[fieldName];
            fieldCount++;
        }
        if(fieldCount!=1){
            reject(new Error('query expects one field and obtains '+fieldCount));
        }else{
            delete result.rows;
            resolve(result);
        }
    });
    this.fetchAll = function fetchAll(){
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            resolve(result);
        });
    };
    this.fetchRowByRow = function fetchRowByRow(callback){
        if(!(callback instanceof Function)){
            return Promise.reject(new Error('fetchRowByRow must recive a callback that executes for each row'));
        }
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            resolve(result);
        },callback);
    };
    /* why this then function is needed?
     *   pg.Client.query is synchronic (not need to recive a callback function) then not need to return a Promise
     *   but pg-promise-strict always returns a "theneable". Then "then" is here. 
     */
    this.then = function then(callback,callbackE){
        delete this.then;
        delete this.catch;
        return Promise.resolve(this).then(callback,callbackE);
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
