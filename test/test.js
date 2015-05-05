
var expect = require('expect.js');
var expectCalled = require('expect-called');
var pg0 = require('pg');
var pg = require('..');
var Promise = require('promise');
pg.expect = expect;

describe('pg-promise-strict', function(){
    describe('connections', function(){
        var connectParams = {mockConnection: 'example'};
        it('sucsefull connection', function(done){
            var clientInternal = {mockClient: 'example of client'};
            var doneInternal = function doneInternal(){ return 'example of done' };
            var pg0connectControl = expectCalled.control(pg0,'connect',{mocks:[
                function(conn, callback){ callback(null,clientInternal,doneInternal); }
            ]});
            Promise.resolve().then(function(){
                return pg.connect(connectParams);
            }).then(function(client){
                expect(client).to.be.a(pg.Client);
                client.expectInternalToBe(clientInternal,doneInternal);
                expect(pg0connectControl.calls.length).to.be(1);
                expect(pg0connectControl.calls[0][0]).to.be(connectParams);
                done();
            }).catch(done).then(function(){
                pg0connectControl.stopControl();
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
});
