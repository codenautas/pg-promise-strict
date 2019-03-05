"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*jshint -W100 */

var pg = require('..');

pg.debug.pool={};

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5435
};

pg.connect(conOpts).then(function(client){
    return client.query('select count(*) from test_pgps.table1').fetchAll().then(function(query){
        return query.fetchUniqueValue(); // se que hay una sola fila
    }).then(function(result){
        console.log('row count',result.value);
        return result.client.query('select * from test_pgps.table1 order by id');
    }).then(function(query){
        return query.onRow(function(row){ // que tiene un único row
            console.log('read one row',row);
        });
    }).then(function(result){ // que ya no tiene las filas
        console.log('done!');
        client.done();
    });
}).catch(function(err){
    console.log('hubo un error en algun lugar', err);
    console.log(err.stack);
}).then(function(){
    process.exit();
});
