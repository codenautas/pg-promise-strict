"use strict";

// var pg = require('pg-promise-strict');
var pg = require('..');

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
};

pg.connect(conOpts).then(function(client){
    return client.query('select * from test_pgps.table1').execute();
}).then(function(result){
    for(var i=0; i<result.rowCount; i++){
        console.log('row',i,result.rows[i]);
    }
    result.client.done();
}).catch(function(err){
    console.log('ERROR',err);
}).then(function(){
    process.exit();
});
