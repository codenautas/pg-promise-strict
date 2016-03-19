"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-disable no-console */

var pgPromiseStrict = {};

var pg = require('pg');
var Promises = require('best-promise');
var util = require('util');


pgPromiseStrict.debug={};

pgPromiseStrict.allowAccessInternalIfDebugging = function allowAccessInternalIfDebugging(self, internals){
    if(pgPromiseStrict.debug[self.constructor.name]){
        self.internals = internals;
    }
};

pgPromiseStrict.Client = function Client(connOpts, client, done){
    this.fromPool = connOpts==='pool';
    var self = this;
    var assignFunctionsPostConnect = function assignFunctionsPostConnect(){
        // existing functions
        self.done = function(){
            // pgPromiseStrict.log('Client.done');
            if(pgPromiseStrict.debug.pool){
                pgPromiseStrict.debug.pool[client.secretKey].count--;
            }
            return done.apply(client,arguments);
        };
        self.query = function query(){
            if(pgPromiseStrict.log){
                var sql=arguments[0];
                pgPromiseStrict.log('------');
                if(arguments[1]){
                    pgPromiseStrict.log('-- '+sql);
                    pgPromiseStrict.log('-- '+JSON.stringify(arguments[1]));
                    for(var i=1; i<=arguments[1].length; i++){
                        var valor=arguments[1][i-1];
                        if(typeof valor === 'string'){
                            valor="'"+valor.replace(/'/g,"''")+"'";
                        }
                        sql=sql.replace(new RegExp('\\$'+i+'\\b'), valor);
                    }
                }
                pgPromiseStrict.log(sql+';');
            }
            var queryArguments = arguments;
            var returnedQuery = client.query.apply(client,queryArguments);
            return new pgPromiseStrict.Query(returnedQuery, self);
        };
    };
    if(this.fromPool){
        pgPromiseStrict.allowAccessInternalIfDebugging(self, {client:client, pool:true, done:done});
        if(pgPromiseStrict.debug.pool){
            if(pgPromiseStrict.debug.pool===true){
                pgPromiseStrict.debug.pool={};
            }
            if(!(client.secretKey in pgPromiseStrict.debug.pool)){
                pgPromiseStrict.debug.pool[client.secretKey] = {client:client, count:0};
            }
            pgPromiseStrict.debug.pool[client.secretKey].count++;
        }
        assignFunctionsPostConnect();
    }else{
        // pgPromiseStrict.log('new Client');
        client = new pg.Client(connOpts);
        pgPromiseStrict.allowAccessInternalIfDebugging(self, {client:client, pool:false});
        this.connect = function connect(){
            // pgPromiseStrict.log('Client.connect');
            if(arguments.length){
                return Promises.reject(new Error('client.connect must no receive parameters, it returns a Promise'));
            }
            return Promises.make(function(resolve, reject){
                client.connect(function(err){
                    if(err){
                        reject(err);
                        // pgPromiseStrict.log('Client.end ERR');
                    }else{
                        assignFunctionsPostConnect();
                        self.end = function end(){
                            client.end();
                        };
                        resolve(self);
                        // pgPromiseStrict.log('Client.end');
                    }
                });
            });
        };
    }
};

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
    pgPromiseStrict.allowAccessInternalIfDebugging(self, {query: query, client:client});
    this.execute = function execute(callbackForEachRow, adapterName){
        // pgPromiseStrict.log('Query.execute');
        if(callbackForEachRow && !(callbackForEachRow instanceof Function)){
            if(adapterName){
                return Promises.reject(new Error("Query.execute() must receive optional callback function and optional adapterName"));
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
            var err=new Error('fetchRowByRow must receive a callback that executes for each row');
            err.code='39004!';
            return Promises.reject(err);
        }
        return this.execute(callback);
    };
    this.onRow = this.fetchRowByRow;
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

pgPromiseStrict.connect = function connect(connectParameters){
    // pgPromiseStrict.log('pg.connect');
    return Promises.make(function(resolve, reject){
        pg.connect(connectParameters,function(err, client, done){
            if(err){
                reject(err);
            }else{
                resolve(new pgPromiseStrict.Client('pool', client, done));
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
