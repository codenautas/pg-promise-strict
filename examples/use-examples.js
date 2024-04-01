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
    port: 5432
};

async function main(){
    try {
        var client = await pg.connect(conOpts)
        var result = await client.query('select count(*) from test_pgps.table1').fetchUniqueValue(); // se que hay una sola fila
        console.log('row count',result.value);
        await client.query('select * from test_pgps.table1 order by id').onRow(function(row){ // que tiene un único row
            console.log('read one row',row);
        });
        console.log('done!');
    } catch(err) {
        console.log('hubo un error en algun lugar', err);
        console.log(err.stack);
    } finally {
        await client.done();
        await pg.shutdown()
    }
}

main();