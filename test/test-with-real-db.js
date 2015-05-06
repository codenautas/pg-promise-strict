"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var Promise = require('promise');

console.warn(pg.poolBalanceControl());

pg.debug.pool=true;

describe('pg-promise-strict with real database', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    describe('connections', function(){
        it('successful connection', function(done){
            pg.debug.Client=true;
            Promise.resolve().then(function(){
                return pg.connect(connectParams);
            }).then(function(client){
                expect(client).to.be.a(pg.Client);
                expect(client.internals.client).to.be.a(pg0.Client);
                client.done();
                done();
            }).catch(done).then(function(){
                pg.debug.Client=false;
            });
        });
        it('failed connection', function(done){
            Promise.resolve().then(function(){
                return pg.connect({
                    user: 'test_user',
                    password: 'bad_pass',
                    database: 'test_db',
                    host: 'localhost',
                    port: 5432
                });
            }).then(function(client){
                done(new Error('must raise error'));
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.code).to.be('28P01');
                expect(err.message).to.match(/aut.*password/);
                done();
            }).catch(done);
        });
    });
    describe('call queries', function(){
        var client;
        var poolLog;
        before(function(done){
            poolLog = pg.debug.pool; // for test connection without pool control
            pg.debug.pool=false;
            pg.connect(connectParams).then(function(returnedClient){
                if(pg.poolBalanceControl().length>0) done(new Error("There are UNEXPECTED unbalanced conections"));
                client = returnedClient;
                done();
            });
        });
        after(function(){
            client.done();
            pg.debug.pool = poolLog;
        });
        it("successful query that doesn't return rows", function(done){
            pg.debug.Query=true;
            client.query("drop schema if exists test_pgps cascade;").then(function(query){
                expect(query).to.be.a(pg.Query);
                expect(query.internals.query).to.be.a(pg0.Query);
                return query.fetchAll();
            }).then(function(result){
                expect(result.rowCount).to.not.be.ok();
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
            });
        });
        function tipicalExecuteWay(queryText,done,commandExpected,resultExpected){
            client.query(queryText).execute().then(function(result){
                if(resultExpected){
                    for(var attr in resultExpected){
                        expect([attr,result[attr]]).to.eql([attr,resultExpected[attr]]);
                    }
                }else{
                    expect(result.rowCount).to.not.be.ok();
                }
                expect(result.command).to.be(commandExpected);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
            });
        }
        it("call execute directly", function(done){
            tipicalExecuteWay("create schema if not exists test_pgps;",done,'CREATE');
        });
        it("failed call", function(done){
            client.query("create schema test_pgps;").execute().then(function(result){
                done(new Error("Must fail because the schema exists"));
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.code).to.be('42P06');
                expect(err).to.match(/exist.*test_pgps/);
                done();
            }).catch(done).then(function(){
            });
        });
        it("call a compound", function(done){
            tipicalExecuteWay(
                "do $$ begin "+
                "create table test_pgps.table1(id integer primary key, text1 text); "+
                "create table test_pgps.table2(text2 text primary key, int2 integer); "+
                "end$$;",
                done,
                "DO"
            )
        });
        it("call multiple insert with returning clausule", function(done){
            tipicalExecuteWay("insert into test_pgps.table1 values (1,'one'), (2,'two');",done,"INSERT",{
                rowCount:2
            })
        });
    });
});
