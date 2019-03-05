"use strict";

var expect = require('expect.js');
var pg = require('..');
var colors = require('colors'); 
var bestGlobals = require('best-globals');
var discrepances = require('discrepances');
var miniTools = require('mini-tools');
var TypeStore = require('type-store');
console.warn(pg.poolBalanceControl());

// DOING skip
describe.skip('trying timeouts', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432,
        releaseTimeout:{ inactive: 800}
    };
    it('cancel connect when timeout', function(){
        return miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
            return pg.connect(config.db);
        }).then(function(client){
            console.log('connected');
            return client.query("SELECT 1::integer as number_one").execute().then(function(result){
                console.log('data 1');
                expect(result.rows).to.eql([{number_one:1}]);
            }).then(bestGlobals.sleep(1000)).then(function(){
                //return client.query("SELECT 2::integer as number_one").execute().then(function(result){
                return client.query("SELECT 2::integer as number_one").then(function(query){
                    return query.execute();
                }).then(function(result){
                    console.log('data 2');
                    throw new Error("TIMEOUT EXPECTED")
                },function(err){
                    console.log('ooooooooook EXEPTION DETECTED')
                    console.log(err);
                });
            });
        }).catch(function(err){
            console.log('LAST ERR:',err);
            throw err;
        });
    });
});

