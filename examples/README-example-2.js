// var pg = require('pg-promise-strict');
var pg = require('..');

pg.easy = true;

var conString = "postgres://test_user:test_pass@localhost/test_db";

pg.connect(conString).then(function(client){
    return client.query('SELECT $1::int AS number', ['1']).execute();
}).then(function(result){
    console.log(result.rows[0].number);
}).catch(function(err){
    return console.error('error fetching client from pool or running query', err);
}).then(function(){
    process.exit();
});
