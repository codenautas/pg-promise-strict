var MiniTools = require('mini-tools');
var pg0 = require('pg');

// schema propio para los tests (desde PG15 test_user puede no tener CREATE en public)
var TEST_SCHEMA = 'test_work';

var bufferConnectParams = null;

async function getConnectParams(){
    if(!bufferConnectParams){
        var connectParams = (await MiniTools.readConfig([
            {db:{
                user: 'test_user',
                password: 'test_pass',
                database: 'test_db',
                host: 'localhost',
                port: 5432
            }},
            'local-config'
        ],{whenNotExist:'ignore'})).db;
        var client = new pg0.Client(connectParams);
        await client.connect();
        try{
            await client.query('create schema if not exists '+TEST_SCHEMA);
        }finally{
            await client.end();
        }
        bufferConnectParams = {...connectParams, options:'-c search_path='+TEST_SCHEMA};
    }
    return bufferConnectParams;
}

module.exports = {
    getConnectParams
};
