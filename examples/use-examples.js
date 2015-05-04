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
    return query.readOnlyRow(); // se que hay una sola fila
}).then(function(result){
    console.log('row count',result.allRowData);
    return result.client.query('select * from test.table1 order by id');
}).then(function(query){
    return query.readByRow(); // puede haber varias filas
}).then(function(allRowData){
    console.log(allRowData);
}).catch(function(err){
    console.log('hubo un error en algun lugar', err);
});

pg.connect(conOpts).then(function(client){
    return client.query('select count(*) from test.table1');
}).then(function(query){
    return query.readOnlyRow(); // se que hay una sola fila
}).then(function(allRowData){
    console.log(allRowData);
}).catch(function(err){
    console.log('hubo un error en algun lugar', err);
});