"use strict";

var pg = require('pg');
var Promise = require('promise');

var pgPromiseStrict={
};

pgPromiseStrict.Client = function(client, done){
    var self = this;
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

pgPromiseStrict.Query = function(query, client){
    var self = this;
    var readRowsThenControlAndAdapt = function readRowsThenControlAndAdapt(controlAndAdapt, callbackForEachRow){
        var thePromise = new Promise(function(resolve, reject){
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
        return thePromise;
    };
    // new functions
    this.readOnlyRow = function readOnlyRow(){
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            if(result.rows.length!=1){
                reject(new Error('query expects one row and obtains '+result.rows.length));
            }else{
                result.row = result.rows[0];
                delete result.rows;
                resolve(result);
            }
        });
    }
    this.readOnlyValue = function readOnlyValue(){
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            if(result.rows.length!=1){
                reject(new Error('query expects one row and obtains '+result.rows.length));
            }else{
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
            }
        });
    }
    this.readByRow = function readByRow(callback){
        return readRowsThenControlAndAdapt(function(result, resolve, reject){ 
            resolve(result);
        },callback);
    }
}

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
