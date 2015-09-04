"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */

var pgPromiseStrict = {};

var sqlPromise = require('sql-promise');

pgPromiseStrict = Object.create(sqlPromise);

sqlPromise.motorName = 'pg';

var pg = require('pg');
var Promises = require('best-promise');
var util = require('util');

pgPromiseStrict.debug={};

pgPromiseStrict.defaultPort=5432;

pgPromiseStrict.getQuery = function getQuery(internalConnection, queryArguments){
    return internalConnection.query.apply(internalConnection,queryArguments);
}

pgPromiseStrict.Client = function Client(connOpts){
    var client = new pg.Client(connOpts);
    var self=this;
    this.connect = function connect(){
        // motor.log('Client.connect');
        if(arguments.length){
            return Promises.reject(new Error('client.connect must no recive parameters, it returns a Promise'));
        }
        return Promises.make(function(resolve, reject){
            client.connect(function(err){
                if(err){
                    reject(err);
                    // motor.log('Client.end ERR');
                }else{
                    self.end=function(){
                        client.end();
                    }
                    resolve(new pgPromiseStrict.Connection('opened', client, client.end, pgPromiseStrict));
                    // motor.log('Client.end');
                }
            });
        });
    };
};

pgPromiseStrict.makePromiseFetcher = function makePromiseFetcher(internalQuery, callbackForEachRow, ender){
    return Promises.make(function(resolve, reject){
        internalQuery.on('error',function(err){
            reject(err);
        });
        internalQuery.on('row',function(row, result){
            if(callbackForEachRow){
                callbackForEachRow(row, result);
            }else{
                result.addRow(row);
            }
        });
        internalQuery.on('end',ender(resolve, reject));
    });
};

pgPromiseStrict.connect = function connect(connectParameters){
    // pgPromiseStrict.log('pg.connect');
    return Promises.make(function(resolve, reject){
        pg.connect(connectParameters,function(err, client, done){
            if(err){
                reject(err);
            }else{
                console.log('+aa+','pgPromise.connect',connectParameters);
                resolve(new pgPromiseStrict.Connection('pool', client, done, pgPromiseStrict));
            }
        });
    });
};

pgPromiseStrict.poolBalanceControl = function poolBalanceControl(){
    var rta=[];
    if(pgPromiseStrict.debug.pool){
        for(var key in pgPromiseStrict.debug.pool){
            if(pgPromiseStrict.debug.pool[key].count){
                rta.push('pgPromiseStrict.debug.pool unbalanced connection '+util.inspect(pgPromiseStrict.debug.pool[key]));
            }
        }
    }
    return rta.join('\n');
};

/* istanbul ignore next */
process.on('exit',function(){
    console.warn(pgPromiseStrict.poolBalanceControl());
});

module.exports = pgPromiseStrict;
