
var expect = require('expect.js');
var expectCalled = require('expect-called');
var pg0 = require('pg');
var pg = require('..');
var Promise = require('promise');
pg.expect = expect;

describe('pg-promise-strict', function(){
    var connectParams = {mockConnection: 'example'};
    var clientInternal = {mockClient: 'example of client', query:function(){ throw new Error('you must mock this!');} };
    var doneInternal = function doneInternal(){ return 'example of done' };
    describe('connections', function(){
        it('sucsefull connection', function(done){
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
    describe('queries', function(){
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
        });
        it('sucsefull query', function(done){
            var queryText = {mockQueryText: 'example of query text'};
            var queryInternal = {mockQuery: 'example of query mock'};
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryInternal,
                {other: 'query'}
            ]});
            pg.debug.Query=true;
            client.query(queryText).then(function(obtained){
                expect(obtained).to.be.a(pg.Query);
                expect(obtained.internals.query).to.be(queryInternal);
                return client.query(queryText,['more', 'parameters', 'may be arguments']);
            }).then(function(obtained){
                expect(obtained.internals.query).to.eql({other: 'query'});
                expect(clientInternalControl.calls).to.eql([
                    [queryText],
                    [queryText,['more', 'parameters', 'may be arguments']]
                ]);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
            });
        });
    });
});
