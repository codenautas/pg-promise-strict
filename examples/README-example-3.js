// var pg = require('pg-promise-strict');
"use strict";

var pg = require('..');

var conString = "postgres://test_user:test_pass@localhost:5432/test_db";

var client = new pg.Client(conString);
 
client.connect().then(function(client){
    return client.query('SELECT NOW() AS "theTime"').execute();
}).then(function(result){
    console.log(result.rows[0].theTime);
    client.end();
}).catch(function(err){
    console.error('error connecting or running query', err);
}).then(function(){
    process.exit();
});
