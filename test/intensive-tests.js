"use strict";

var MAX_CLIENTS=20;
var MAX_QUERIES=100;
var MAX_CICLES=20;

// IN TRAVIS-CI ONLY TEST WITH REAL DB IN ONE VERSION 0.12
if(process.versions.node.substr(0,4)!=="0.12" && process.env.TRAVIS) return;

// WHEN COVER don't continue
if(process.env.COVER) return;

var _ = require('lodash');
var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var Promises = require('best-promise');
var colors = require('colors'); 
console.warn(pg.poolBalanceControl());

describe('intensive tests', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    /* istanbul ignore */
    if(process.env.APPVEYOR){
        console.log('process.env.APPVEYOR',process.env.APPVEYOR);
        connectParams.user='postgres';
        connectParams.password='Password12!';
    }
    for(var iClient=1; iClient<=MAX_CLIENTS; iClient++){
        describe('pool connection '+iClient, function(){
            var client;
            before(function(done){
                Promises.start(function(){
                    return pg.connect(connectParams);
                }).then(function(clientFromPool){
                    client=clientFromPool;
                }).then(done).catch(done);
            });
            after(function(){
                client.done();
            });
            for(var iCicle=0; iCicle<(iClient==MAX_CLIENTS?MAX_CICLES:1); iCicle++){
                it('call queries '+MAX_QUERIES+': '+(iCicle||''), function(done){
                    var p=Promises.start();
                    for(var iQuery=1; iQuery<=MAX_QUERIES; iQuery++){
                        p=p.then(function(){
                            return client.query("SELECT $1::integer c, $2::integer q, $3::integer i",[iClient, iQuery, iCicle]).execute();
                        }).then(function(result){
                            expect(result.rows).to.eql([{c: iClient, q:iQuery, i:iCicle}]);
                        });
                    };  
                    p.then(done).catch(done);
                });
            }
        });
    };
});
