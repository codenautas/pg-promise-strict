"use strict";

var assert = require('assert');
var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var queryWithEmitter = require('./query-with-emitter.js');
var bestGlobals = require('best-globals');

var MiniTools = require('mini-tools');
var {getConnectParams} = require('./helpers');

describe('pg-promise-strict common tests', function(){
    var connectParams;
    before(async function(){
        connectParams = await getConnectParams();
    });
    var client;
    var poolLog;
    before(function(done){
        pg.allTypes=true;
        MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
            return pg.connect(config.db);
        }).then(function(returnedClient){
            // if(pg.poolBalanceControl().length>0) done(new Error("There are UNEXPECTED unbalanced conections"));
            client = returnedClient;
            done();
        });
    });
    after(function(){
        client.done();
    });
    describe('internal controls', function(){
        it('control the log in error',function(){
            var messages=[];
            pg.log=function(message){
                messages.push(message);
            };
            return Promise.resolve().then(function(){
                return client.query(
                    'select $1, $2, $3, $4, $5, illegal syntax here, $6', 
                    [1, "one's", true, null, bestGlobals.date.iso('2019-01-05'), {typeStore:true, toLiteral(){ return 'lit'}}]
                ).execute();
            }).catch(function(err){
                var resultExpected="ERROR! 42601, "+err.message;
                console.log(messages);
                expect(messages).to.eql([
                    '-----------------------',
                    '`select $1, $2, $3, $4, $5, illegal syntax here, $6\n`',
                    '-- [1,"one\'s",true,null,'+JSON.stringify(bestGlobals.date.iso('2019-01-05'))+',"lit"]',
                    "select 1, 'one\'\'s', true, null, '2019-01-05', illegal syntax here, 'lit';",
                    '--'+resultExpected
                ]);
                messages=[];
                return client.query("select 'exit', 0/0 as inf").execute().catch(function(err){
                    var resultExpected="ERROR! 22012, "+err.message;
                    expect(messages).to.eql([
                        '-----------------------',
                        "select 'exit', 0/0 as inf;",
                        '--'+resultExpected
                    ]);
                    pg.log=null;
                });
            });
        });
        it('log with data',function(){
            var messages=[];
            pg.log=function(message,type){
                messages.push([type,message]);
            };
            return Promise.resolve().then(function(){
                return client.query(
                    'select 1 as one union select 2'
                ).execute();
            }).then(function(result){
                expect(messages).to.eql([
                    ["------","-----------------------"],
                    ["QUERY","select 1 as one union select 2;"],
                    ["RESULT","-- [{\"one\":1},{\"one\":2}]"]
                ]);
            });
        });
        it('log with data row by row',function(){
            var messages=[];
            pg.log=function(message,type){
                messages.push([type,message]);
            };
            return Promise.resolve().then(function(){
                return client.query(
                    'select 1 as one union select 2', 
                    
                ).onRow(function(){});
            }).then(function(result){
                expect(messages).to.eql([
                    ["------","-----------------------"],
                    ["QUERY","select 1 as one union select 2;"],
                    ["ROW","-- {\"one\":1}"],
                    ["ROW","-- {\"one\":2}"],
                    ["RESULT","-- []"]
                ]);
            });
        });
    });
    describe('service', function(){
        it("quoteIdent", function(){
            expect(pg.quoteIdent("column1")).to.eql('"column1"');
            expect(pg.quoteIdent('column"delta"')).to.eql('"column""delta"""');
            expect(pg.quoteIdentList(['voilà','c\'est fini'])).to.eql('"voilà","c\'est fini"');
        });
        it("quoteLiteral", function(){
            expect(pg.quoteLiteral('hi')).to.eql("'hi'");
            expect(pg.quoteLiteral("don't")).to.eql("'don''t'");
            expect(pg.quoteLiteral(7)).to.eql("'7'");
            expect(pg.quoteLiteral({a:5})).to.eql(`'{"a":5}'`);
            expect(pg.quoteLiteral(new Date('2018-12-24'))).to.eql("'2018-12-24T00:00:00.000Z'");
            expect(pg.quoteLiteral(bestGlobals.date.iso('2018-12-25'))).to.eql("'2018-12-25'");
            // expect(pg.quoteLiteral(new Date('2018-12-24 10:20'))).to.eql("'2018-12-24T00:00:00.000Z'");
            expect(pg.quoteLiteral(bestGlobals.datetime.iso('2018-12-26 10:20:30'))).to.eql("'2018-12-26 10:20:30'");
        });
        it("quoteNullable", function(){
            expect(pg.quoteNullable('hi')).to.eql("'hi'");
            expect(pg.quoteNullable("don't")).to.eql("'don''t'");
            expect(pg.quoteNullable(7)).to.eql("'7'");
            expect(pg.quoteNullable(null)).to.eql("null");
            expect(pg.quoteNullable(true)).to.eql("'true'");
        });
    });
    describe('handle errors', function(){
        it("reject non string object names", function(){
            expect(function(){
                pg.quoteIdent(null);
            }).to.throwError(/name/i);
        });
        it("reject null text", function(){
            expect(function(){
                pg.quoteLiteral(null);
            }).to.throwError(/null/i);
        });
    });
});
