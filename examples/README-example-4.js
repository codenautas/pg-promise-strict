// var pg = require('pg-promise-strict');
var pg = require('..');

pg.easy = true;

pg.connect({
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
}).then(function(client){
    return client.query("SELECT text1 FROM test_pgps.table1").onRow(function(row){
        console.log('a',row);
        console.log(row.text1);
    }).then(function(result){
        console.log('ready.',result.rowCount,'rows processed');
        client.done();
    });
}).catch(function(err){
    console.log('ERROR',err)
}).then(function(){
    process.exit();
});
