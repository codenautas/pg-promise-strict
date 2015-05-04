"use strict";

var pg = require('..');

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
}

pg.connect(conOpts).then(function(client){
    return client.query('select count(*) from test.table1');
}).then(function(query){
    return query.readOnlyValue(); // se que hay una sola fila
}).then(function(result){
    console.log('row count',result.value);
    return result.client.query('select * from test.table1 order by id');
}).then(function(query){
    return query.readByRow(function(row){ // que tiene un único row
        console.log('read one row',row);
    });
}).then(function(result){ // que ya no tiene las filas
    console.log('done!');
    result.client.done();
}).catch(function(err){
    console.log('hubo un error en algun lugar', err);
    console.log(err.stack);
}).then(function(){
    process.exit();
});

/*
pg.connect(conOpts).then(function(client){
    return client.query('select count(*) from test.table1');
}).then(function(query){
    return query.readOnlyRow(); // se que hay una sola fila
}).then(function(allRowData){
    console.log(allRowData);
}).catch(function(err){
    console.log('hubo un error en algun lugar', err);
});
*/