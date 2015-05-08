"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var expectCalled = require('expect-called');
var pg0 = require('pg');
var pg = require('..');
var Promise = require('promise');

describe('pg-promise-strict common tests', function(){
    var connectParams = {mockConnection: 'example'};
    var lastDoneValuePassedToDone = null;
    var clientInternal = {mockClient: 'example of client', query:function(){ throw new Error('you must mock this!');}};
    var doneInternal = function doneInternal(){ lastDoneValuePassedToDone=arguments; };
    describe('internal controls', function(){
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
        it('control the parameters of the execute function',function(done){
            var queryInternal = {mockQuery: 'example of query mock'};
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryInternal
            ]});
            client.query().execute('one value', 'other value').then(function(result){
                done(new Error('must reject the parameters'));
            }).catch(function(err){
                expect(err.message).to.match(/must recive/);
                done();
            }).catch(done).then(function(){
                clientInternalControl.stopControl();
            });
        });
    });
});