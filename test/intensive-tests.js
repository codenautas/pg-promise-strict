"use strict";

var MAX_CLIENTS=24;
var MAX_QUERIES=100;
var MAX_CICLES=24;

var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var colors = require('colors'); 
console.warn(pg.poolBalanceControl());

var miniTools = require('mini-tools');

describe('intensive tests', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    for(var iClient=1; iClient<=MAX_CLIENTS; iClient++){
        describe('pool connection '+iClient, function(){
            var client;
            before(function(done){
                miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                    return pg.connect(config.db);
                }).then(function(clientFromPool){
                    client=clientFromPool;
                }).then(done).catch(done);
            });
            after(function(){
                client.done();
            });
            for(var iCicle=0; iCicle<(iClient==MAX_CLIENTS?MAX_CICLES:1); iCicle++){
                it('call queries '+MAX_QUERIES+': '+(iCicle||''), function(done){
                    var p=Promise.resolve();
                    for(var iQuery=1; iQuery<=MAX_QUERIES; iQuery++){
                        p=p.then(function(){
                            return client.query("SELECT $1::integer c, $2::integer q, $3::integer i",[iClient, iQuery, iCicle]).execute();
                        }).then(function(result){
                            // console.log('xxxxxxxxxxxx',result);
                            expect(result.rows).to.eql([{c: iClient, q:iQuery, i:iCicle}]);
                        });
                    };  
                    p.then(done).catch(done);
                });
            }
        });
    };
});
