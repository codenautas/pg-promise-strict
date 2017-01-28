"use strict";

var assert = require('assert');
var expect = require('expect.js');
var expectCalled = require('expect-called');
var pg0 = require('pg');
var pg = require('..');
var queryWithEmitter = require('./query-with-emitter.js');

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
                expect(err.message).to.match(/must receive/);
                done();
            }).catch(done).then(function(){
                clientInternalControl.stopControl();
            });
        });
        it('control the log',function(done){
            var resultExpected = [["the result"]];
            var queryInternal = {execute: function(){ return Promise.resolve(resultExpected); }};
            var clientInternalControl = expectCalled.control(client.internals.client,'query',{returns:[
                queryWithEmitter(resultExpected),
                queryWithEmitter(resultExpected)
            ]});
            var messages=[];
            pg.log=function(message){
                messages.push(message);
            };
            Promise.resolve().then(function(){
                return client.query('select $1, $2, $3, $4', [1, "one's", true, null]).execute();
            }).then(function(result){
                expect(messages).to.eql([
                    '------',
                    '-- select $1, $2, $3, $4',
                    '-- [1,"one\'s",true,null]',
                    "select 1, 'one\'\'s', true, null;",
                    '-- '+JSON.stringify(resultExpected)
                ]);
                messages=[];
                return client.query("select 'exit'").execute();
            }).then(function(result){
                expect(messages).to.eql([
                    '------',
                    "select 'exit';",
                    '-- '+JSON.stringify(resultExpected)
                ]);
                done();
            }).catch(done).then(function(){
                clientInternalControl.stopControl();
                pg.log=null;
            });
        });
    });
    describe('service', function(){
        it("quoteObject", function(){
            expect(pg.quoteObject("column1")).to.eql('"column1"');
            expect(pg.quoteObject('column"delta"')).to.eql('"column""delta"""');
        });
        it("quoteText", function(){
            expect(pg.quoteText('hi')).to.eql("'hi'");
            expect(pg.quoteText("don't")).to.eql("'don''t'");
        });
        it("quoteText of null", function(){
            expect(pg.quoteText(null,{allowNull:true})).to.eql('null');
        });
        it("quoteObjectList", function(){
            expect(pg.quoteObjectList(['one', '"2"'])).to.eql('"one","""2"""');
        });
    });
    describe('handle errors', function(){
        it("reject non string object names", function(){
            expect(function(){
                pg.quoteObject(null);
            }).to.throwError(/name/i);
        });
        it("reject non string text", function(){
            expect(function(){
                pg.quoteText({},{allowNull:true});
            }).to.throwError(/not text data/i);
        });
        it("reject null text", function(){
            expect(function(){
                pg.quoteText(null);
            }).to.throwError(/null/i);
        });
    });
});
