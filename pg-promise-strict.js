"use strict";

var pg = require('pg');
var Promise = require('promise');

var pgPromiseStrict={
};

pgPromiseStrict.debug={};

pgPromiseStrict.allowAccessInternalIfAllowed = function allowAccessInternalIfAllowed(self, internals){
    if(pgPromiseStrict.debug[self.constructor.name]){
        self.internals = internals;
    }
}

pgPromiseStrict.Client = function Client(client, done){
    var self = this;
    pgPromiseStrict.allowAccessInternalIfAllowed(self, {client:client, done:done});
    // existing functions
    this.done = function(){
        return done.call(client);
    }
    this.query = function query(){
        var queryArguments = arguments;
        return Promise.resolve().then(function(){
            var returnedQuery = client.query.apply(client,queryArguments);
            return new pgPromiseStrict.Query(returnedQuery, self);
        });
    }
}

pgPromiseStrict.Query = function Query(query, client){
    var self = this;
    pgPromiseStrict.allowAccessInternalIfAllowed(self, {query: query, client:client});
    var readRowsThenControlAndAdapt = function readRowsThenControlAndAdapt(controlAndAdapt, callbackForEachRow){
        return new Promise(function(resolve, reject){
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
            query.on('error',function(err){
                reject(err);
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
    this.readOneRowIfExists = controlAndAdaptRowCount(0,1,'at least one row');
    this.readUniqueRow = controlAndAdaptRowCount(1,1,'one row');
    this.readUniqueValue = controlAndAdaptRowCount(1,1,'one row (with one field)',function(result, resolve, reject){
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
    this.readAllRows = function readAllRows(){
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            resolve(result);
        });
    };
    this.readByRow = function readByRow(callback){
        if(!(callback instanceof Function)){
            return Promise.reject(new Error('readByRow must recive a callback that executes for each row'));
        }
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            resolve(result);
        },callback);
    };
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

module.exports = pgPromiseStrict;
