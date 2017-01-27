"use strict";

var pgPromiseStrict = {};

var fs = require('fs-promise');
var pg = require('pg');
var pgTypes = require('pg').types;
var util = require('util');

var bestGlobals = require('best-globals');

pgPromiseStrict.debug={};

pgPromiseStrict.allowAccessInternalIfDebugging = function allowAccessInternalIfDebugging(self, internals){
    if(pgPromiseStrict.debug[self.constructor.name]){
        self.internals = internals;
    }
};

pgPromiseStrict.quoteObject=function quoteObject(insaneName){
    if(typeof insaneName!=="string"){
        throw new Error("insaneName");
    }
    return '"'+insaneName.replace(/"/g, '""')+'"';
};

pgPromiseStrict.quoteObjectList = function quoteObjectList(ObjectList){
    return ObjectList.map(function(objectName){ return this.quoteObject(objectName); }, this).join(',');
};

pgPromiseStrict.quoteText=function quoteText(anyTextData, opts){
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
};


pgPromiseStrict.adaptParameterTypes = function adaptParameterTypes(parameters){
    return parameters.map(function(value){
        if(value && value.typeStore){
            return value.toLiteral();
        }
        return value;
    });
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
                pgPromiseStrict.log('------');
                if(queryArguments[1]){
                    pgPromiseStrict.log('-- '+sql);
                    pgPromiseStrict.log('-- '+JSON.stringify(queryArguments[1]));
                    for(var i=1; i<=queryArguments[1].length; i++){
                        var valor=queryArguments[1][i-1];
                        if(typeof valor === 'string'){
                            valor="'"+valor.replace(/'/g,"''")+"'";
                        }
                        sql=sql.replace(new RegExp('\\$'+i+'\\b'), valor);
                    }
                }
                pgPromiseStrict.log(sql+';');
            }
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
                return Promise.reject(new Error('client.connect must no receive parameters, it returns a Promise'));
            }
            return new Promise(function(resolve, reject){
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
    if(pgPromiseStrict.easy){
        self.executeSentences = function executeSentences(sentences){
            var cdp = Promise.resolve();
            sentences.forEach(function(sentence){
                cdp = cdp.then(function(){
                    if(!sentence.trim()){
                        return;
                    }
                    return self.query(sentence).execute().catch(function(err){
                        // console.log('ERROR',err);
                        // console.log(sentence);
                        throw err;
                    });
                });
            });
            return cdp;
        };
        self.executeSqlScript = function executeSqlScript(fileName){
            return fs.readFile(fileName,'utf-8').then(function(content){
                var sentences = content.split(/\r?\n\r?\n/);
                return self.executeSentences(sentences);
            });
        };
        self.bulkInsert = function bulkInsert(params){
            var sql = "INSERT INTO "+(params.schema?pgPromiseStrict.quoteObject(params.schema)+'.':'')+
                pgPromiseStrict.quoteObject(params.table)+" ("+
                params.columns.map(pgPromiseStrict.quoteObject).join(', ')+") VALUES ("+
                params.columns.map(function(name, i_name){ return '$'+(i_name+1); })+")";
            var insertOneRowAndContinueInserting = function insertOneRowAndContinueInserting(i_rows){
                if(i_rows<params.rows.length){
                    return self.query(sql, params.rows[i_rows]).execute().then(function(){
                        return insertOneRowAndContinueInserting(i_rows+1);
                    }).catch(function(err){
                        throw err;
                    });
                }
                return;
            };
            return insertOneRowAndContinueInserting(0);
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
                return Promise.reject(new Error("Query.execute() must receive optional callback function and optional adapterName"));
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
            return Promise.reject(err);
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

var allTypes=false;

pgPromiseStrict.setAllTypes = function setAllTypes(){
    var TypeStore = require('type-store');
    var DATE_OID = 1082;
    pgTypes.setTypeParser(DATE_OID, function parseDate(val){
       return bestGlobals.date.iso(val);
    });
    for(var typeName in TypeStore.type){
        var typeDef = TypeStore.type[typeName];
        if(typeDef.pgSpecialParse){
            pgTypes.setTypeParser(typeDef.pg_OID, function(val){
               return typeDef.fromString(val);
            });
        }
    }
};

pgPromiseStrict.connect = function connect(connectParameters){
    // pgPromiseStrict.log('pg.connect');
    if(pgPromiseStrict.easy && !allTypes){
        pgPromiseStrict.setAllTypes();
    }
    return new Promise(function(resolve, reject){
        pg.connect(connectParameters, function(err, client, done){
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

// pgPromiseStrict.setAllTypes();

module.exports = pgPromiseStrict;
