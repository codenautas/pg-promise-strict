"use strict";

// WHEN COVER with ONLY DB ONLY DB
if(process.env.COVER==="odb") return;

var _ = require('lodash');
var expect = require('expect.js');
var expectCalled = require('expect-called');
var pg0 = require('pg');
var pg = require('..');
var Promise = require('promise');
var Events = require('events');

console.warn(pg.poolBalanceControl());

pg.debug.pool=true;

describe('pg-promise-strict', function(){
    var connectParams = {mockConnection: 'example'};
    var lastDoneValuePassedToDone = null;
    var clientInternal = {mockClient: 'example of client', query:function(){ throw new Error('you must mock this!');}};
    var doneInternal = function doneInternal(){ lastDoneValuePassedToDone=arguments; };
    describe('connections', function(){
        it('successful connection', function(done){
            var pg0connectControl = expectCalled.control(pg0,'connect',{mocks:[
                function(conn, callback){ callback(null,clientInternal,doneInternal); }
            ]});
            pg.debug.Client=true;
            Promise.resolve().then(function(){
                return pg.connect(connectParams);
            }).then(function(client){
                expect(client).to.be.a(pg.Client);
                expect(client.internals.client).to.be(clientInternal);
                expect(client.internals.done).to.be(doneInternal);
                expect(pg0connectControl.calls.length).to.be(1);
                expect(pg0connectControl.calls[0][0]).to.be(connectParams);
                expect(pg.poolBalanceControl().length>0).to.be.ok();
                client.done(1);
                expect(lastDoneValuePassedToDone[0]).to.eql(1);
                expect(lastDoneValuePassedToDone.length).to.eql(1);
                expect(pg.poolBalanceControl().length==0).to.be.ok();
                done();
            }).catch(done).then(function(){
                pg0connectControl.stopControl();
                pg.debug.Client=false;
            });
        });
        it('failed connection', function(done){
            var pg0connectControl = expectCalled.control(pg0,'connect',{mocks:[
                function(conn, callback){ callback(new Error('example error')); }
            ]});
            Promise.resolve().then(function(){
                return pg.connect(connectParams);
            }).then(function(client){
                done(new Error('must raise error'));
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.message).to.match(/example error/);
                done();
            }).catch(function(err){
                done(err);
            }).then(function(){
                pg0connectControl.stopControl();
            });
        });
    });
    describe('call queries', function(){
        var client;
        var pg0connectControl;
        var poolLog;
        before(function(done){
            poolLog = pg.debug.pool; // for test connection without pool control
            pg.debug.pool=false;
            pg.easy=true;
            pg0connectControl = expectCalled.control(pg0,'connect',{mocks:[
                function(conn, callback){ callback(null,clientInternal,doneInternal); }
            ]});
            pg.debug.Client=true;
            pg.connect(connectParams).then(function(returnedClient){
                if(pg.poolBalanceControl().length>0) done(new Error("There are UNEXPECTED unbalanced conections"));
                client = returnedClient;
                pg.debug.Client=false;
                done();
            });
        });
        after(function(){
            pg0connectControl.stopControl();
            client.done();
            pg.debug.pool = poolLog;
            pg.easy=false;
        });
        it('successful query', function(){
            var queryText = {mockQueryText: 'example of query text'};
            var queryInternal = {mockQuery: 'example of query mock'};
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryInternal,
                {other: 'query'}
            ]});
            pg.debug.Query=true;
            var obtained=client.query(queryText);
            expect(obtained).to.be.a(pg.Query);
            expect(obtained.internals.query).to.be(queryInternal);
            obtained=client.query(queryText,['more', 'parameters', 'may be arguments']);
            expect(obtained.internals.query).to.eql({other: 'query'});
            expect(clientInternalControl.calls).to.eql([
                [queryText],
                [queryText,['more', 'parameters', 'may be arguments']]
            ]);
            pg.debug.Query=false;
            clientInternalControl.stopControl();
        });
    });
    describe('call queries and fetch data', function(){
        var client;
        var pg0connectControl;
        before(function(done){
            pg0connectControl = expectCalled.control(pg0,'connect',{mocks:[
                function(conn, callback){ callback(null,clientInternal,doneInternal); }
            ]});
            pg.debug.Client=true;
            pg.connect(connectParams).then(function(returnedClient){
                client = returnedClient;
                pg.debug.Client=false;
                done();
            });
        });
        after(function(){
            pg0connectControl.stopControl();
            client.done();
        });
        var queryWithEmitter=function(rows,fields,finishWithThisError){
            var remianingRows = _.clone(rows);
            var emitter = new Events.EventEmitter();
            var endListener=false;
            var errorListener=false;
            var emitEnd=function(){};
            var result={
                rows:[],
                fields:fields,
                addRow:function addRow(row){
                    this.rows.push(row);
                }
            }
            var emitRows=function(){
                remianingRows.forEach(function(row){
                    emitter.emit('row',row,result);
                });
                remianingRows = [];
                if(finishWithThisError){
                    setImmediate(emitter.emit('error',finishWithThisError));
                }else{
                    setImmediate(emitEnd);
                }
            }
            emitter.on('newListener',function(name){
                switch(name){
                case 'row':
                    return ;
                case 'end':
                    emitEnd=function(){
                        if(!remianingRows.length){
                            emitter.emit('end',result);
                        }
                    }
                    return emitRows();
                case 'error':
                    errorListener=true;
                    return;
                default:
                    throw new Error('queryWithEmitter: event not recognized');
                }
            });
            return emitter;
        }
        function testData(data,fetchFunctionName,done,controlExpected,fields){
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(data,fields)
            ]});
            pg.debug.Query=true;
            client.query()[fetchFunctionName]().then(function(result){
                (controlExpected || function(result,data){
                    expect(result.rows).to.eql(data);
                })(result,data);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
            });
        }
        it('read all for 2 rows', function(done){
            var data = [{one:1, two:2}, {one:'uno', two:'dos'}];
            testData(data,'fetchAll',done);
        });
        it('read all for 1 row', function(done){
            var data = [{one:1, two:2}];
            testData(data,'fetchAll',done);
        });
        it('read all for 0 rows', function(done){
            var data = [];
            testData(data,'fetchAll',done);
        });
        it('read unique row success', function(done){
            var data = [{one:11, two:22}];
            testData(data,'fetchUniqueRow',done,function(result,data){
                expect(result.row).to.eql(data[0]);
            });
        });
        it('read unique value success', function(done){
            var data = [{one:1111}];
            testData(data,'fetchUniqueValue',done,function(result,data){
                expect(result.value).to.eql(data[0].one);
            },[{name:'one'}]);
        });
        it('read zero or one row for 1 row', function(done){
            var data = [{one:1.1, two:2.2, three:3.3}];
            testData(data,'fetchOneRowIfExists',done,function(result,data){
                expect(result.row).to.eql(data[0]);
            });
        });
        it('read zero or one row for 0 row', function(done){
            var data = [];
            testData(data,'fetchOneRowIfExists',done,function(result,data){
                expect(result.row).to.not.be.ok();
            });
        });
        it('read row by row', function(done){
            var data = [{alfa:'a1', betha:'b1'},{alfa:'a2', betha:'b2'},{alfa:'a3', betha:'b3'}];
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(data)
            ]});
            pg.debug.Query=true;
            var accumulate=[];
            client.query().fetchRowByRow(function(row){
                accumulate.unshift(row);
            }).then(function(result){
                accumulate.reverse();
                expect(accumulate).to.eql(data);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
            });
        });
        it('easy execute', function(done){
            var data = [{alfa:'a1', betha:'b1'},{alfa:'a2', betha:'b2'},{alfa:'a3', betha:'b3'}];
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(data)
            ]});
            pg.easy=true;
            client.query().then(function(result){
                expect(result.rows).to.eql(data);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
                pg.easy=false;
            });
        });
        function testException(data,fetchFunctionName,done,messagePart,fields){
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(data,fields)
            ]});
            pg.debug.Query=true;
            client.query()[fetchFunctionName]().then(function(result){
                done(new Error('call to '+fetchFunctionName+' must raise an error'));
            }).catch(function(err){
                expect(err).to.be.a(Error);
                var r=messagePart instanceof RegExp?messagePart:new RegExp(_.escapeRegExp(messagePart));
                expect(err.message).to.match(r);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
            });
        }
        it('try to read unique row with no data', function(done){
            var data = [];
            testException(data,'fetchUniqueRow',done,'query expects one row and obtains 0 rows');
        });
        it('try to read unique row with more than 1 row', function(done){
            var data = [{one:11, two:22}, {one:11, two:22}];
            testException(data,'fetchUniqueRow',done,/query expects one row and obtains [^0].* row/);
        });
        it('try to read zero or one row with many row', function(done){
            var data = [{one:1.1, two:2.2, three:3.3},{one:1.1, two:2.2, three:3.3}];
            testException(data,'fetchOneRowIfExists',done,/query expects up to one row and obtains [^0].* row/);
        });
        it('try to read unique value with no data', function(done){
            var data = [];
            testException(data,'fetchUniqueValue',done,'query expects one row (with one field) and obtains 0 rows',[{name:'x'}]);
        });
        it('try to read unique value with many data', function(done){
            var data = [{x:1}, {x:2}];
        testException(data,'fetchUniqueValue',done,/query expects one row \(with one field\) and obtains [^0].* rows/,[{name:'x'}]);
        });
        it('try to read unique value with one row with many fields', function(done){
            var data = [{x:1, y:2}];
            testException(data,'fetchUniqueValue',done,/query expects.*one field.*and obtains/,[{name:'x'},{name:'y'}]);
        });
        it('try to read unique value with one row with no fields', function(done){
            var data = [{}];
            testException(data,'fetchUniqueValue',done,'query expects one field and obtains',[]);
        });
        it('mismatch use of fecthRowByRow', function(done){
            var data = [];
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(data)
            ]});
            client.query("select 1").fetchRowByRow().then(function(result){
                done(new Error('must throw error because the callback is mandatory'));
            }).catch(function(err){
                expect(err.message).to.match(/fetchRowByRow must recive a callback/);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
            });
        });
        it('read row by row with error', function(done){
            var emulatePartialData = [{alfa:'a1', betha:'b1'},{alfa:'a2', betha:'b2'},{alfa:'a3', betha:'b3'}];
            var errorPassed = new Error('this ocurrs inside de fetch');
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(emulatePartialData,[],errorPassed)
            ]});
            pg.debug.Query=true;
            var accumulate=[];
            client.query().fetchRowByRow(function(row){
                accumulate.push(row);
            }).then(function(result){
                done(new Error('must reject with the error emited internaly'));
            }).catch(function(err){
                expect(err).to.be(errorPassed);
                expect(accumulate).to.eql(emulatePartialData); 
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
                clientInternalControl.stopControl();
            });
        });
    });
    describe('pool-less connections', function(){
        describe('call queries', function(){
            var client;
            var pg0ClientConstructor;
            var pg0ClientConnect;
            before(function(){
                pg.debug.Client=true;
                pg0ClientConstructor = expectCalled.control(pg0,'Client',{returns:[
                    clientInternal, clientInternal,
                ]});
                client = new pg.Client(connectParams);
                clientInternal.connect = function(){};
                pg0ClientConnect = expectCalled.control(clientInternal,'connect',{mocks:[
                    function(callback){ callback(null); return this; },
                    function(callback){ callback(new Error("example error to connect")); return this; },
                ]});
            });
            after(function(){
                pg0ClientConstructor.stopControl();
                pg.debug.Client=false;
                pg0ClientConnect.stopControl();
            });
            it("successful query", function(done){
                pg.easy=true;
                expect(client.internals.client).to.be(clientInternal);
                expect(client.internals.pool).to.not.be.ok();
                expect(pg0ClientConstructor.calls).to.eql([[connectParams]]);
                client.connect().then(function(client){
                    expect(client).to.be.a(pg.Client);
                    expect(client.query).to.be.a(Function);
                    done();
                }).catch(done).then(function(){
                });
            });
            it("connect with error", function(done){
                pg.easy=true;
                expect(client.internals.client).to.be(clientInternal);
                expect(client.internals.pool).to.not.be.ok();
                client.connect().then(function(client){
                    done(new Error("must raise error because connect reject with error"));
                }).catch(function(err){
                    expect(err).to.match(/example error to connect/);
                    done();
                }).catch(done).then(function(){
                });
            });
            it("connect with parameters", function(done){
                pg.easy=true;
                expect(client.internals.client).to.be(clientInternal);
                expect(client.internals.pool).to.not.be.ok();
                client.connect("something").then(function(client){
                    done(new Error("must raise error because connect doesn't admint parameters"));
                }).catch(function(err){
                    expect(err).to.match(/client.connect must no recive parameters/);
                    done();
                }).catch(done).then(function(){
                });
            });
        });
    });
});
