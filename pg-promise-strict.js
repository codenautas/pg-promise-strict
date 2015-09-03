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
                    resolve(new pgPromiseStrict.Connection('pool', client, client.end, pgPromiseStrict));
                    // motor.log('Client.end');
                }
            });
        });
    };
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

pgPromiseStrict.Query = function Query(query, client){
    var self = this;
    client.motor.allowAccessInternalIfDebugging(self, {query: query, client:client});
    this.execute = function execute(callbackForEachRow, adapterName){
        // pgPromiseStrict.log('Query.execute');
        if(callbackForEachRow && !(callbackForEachRow instanceof Function)){
            if(adapterName){
                return Promises.reject(new Error("Query.execute() must recive optional callback function and optional adapterName"));
            }
            adapterName=callbackForEachRow;
            callbackForEachRow=null;
        }
        var adapter = pgPromiseStrict.queryAdapters[adapterName||'normal'];
        return Promises.make(function(resolve, reject){
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
                if(pgPromiseStrict.log){
                    pgPromiseStrict.log('-- '+JSON.stringify(result.rows));
                }
                adapter(result, resolve, reject);
            });
        });
    };
    // new functions
    this.fetchOneRowIfExists = this.execute.bind(this,'upto1');
    this.fetchUniqueRow      = this.execute.bind(this,'row');
    this.fetchUniqueValue    = this.execute.bind(this,'value');
    this.fetchAll            = this.execute.bind(this,'normal');
    this.fetchRowByRow       = function fetchRowByRow(callback){
        // pgPromiseStrict.log('Query.onRow');
        if(!(callback instanceof Function)){
            var err=new Error('fetchRowByRow must recive a callback that executes for each row');
            err.code='39004!';
            return Promises.reject(err);
        }
        return this.execute(callback);
    };
    this.onRow = this.fetchRowByRow;
    /* why this then function is needed?
     *   pg.Client.query is synchronic (not need to recive a callback function) then not need to return a Promise
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

pgPromiseStrict.connect = function connect(connectParameters){
    // pgPromiseStrict.log('pg.connect');
    return Promises.make(function(resolve, reject){
        pg.connect(connectParameters,function(err, client, done){
            if(err){
                reject(err);
            }else{
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
