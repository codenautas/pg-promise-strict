"use strict";

var expect = require('expect.js');
var pg = require('..');
var colors = require('colors'); 
var bestGlobals = require('best-globals');
var discrepances = require('discrepances');
var miniTools = require('mini-tools');
var TypeStore = require('type-store');

var {getConnectParams} = require('./helpers');

console.warn(pg.poolBalanceControl());

// DOING skip
describe.skip('trying timeouts', function(){
    // waiting for
    // https://github.com/brianc/node-postgres/issues/1860
    var connectParams = 
    before(async function(){
        connectParams = {
            ...await getConnectParams(), 
            releaseTimeout:{inactive: 800},
            query_timeout: 2500
        };
    });
    it('cancel connect when timeout', async function(){
        var config = await miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'});
        var client = await pg.connect(config.db);
        console.log('connected');
        var result = await client.query("SELECT 1::integer as number_one").fetchAll();
        console.log('data 1');
        expect(result.rows).to.eql([{number_one:1}]);
        try{
            await bestGlobals.sleep(1000);
            var result = await client.query("SELECT 2::integer as number_one").fetchAll();
            console.log('data 2');
            throw new Error("NO TIMEOUT DETECTED AT THIS POINT")
        }catch(err){
            if(err.message!="TIMEOUT EXPECTED"){
                throw err;
            }
            console.log('ooooooooook EXEPTION DETECTED')
            console.log(err);
        }
    });
});

