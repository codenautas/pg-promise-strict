var MiniTools = require('mini-tools');

var bufferConnectParams = null;

async function getConnectParams(){
    if(!bufferConnectParams){
        bufferConnectParams = (await MiniTools.readConfig([
            {test:{connectParams:{
                user: 'test_user',
                password: 'test_pass',
                database: 'test_db',
                host: 'localhost',
                port: 5432
            }}},
            'local-config'
        ],{whenNotExist:'ignore'})).test.connectParams;
    }
    return bufferConnectParams;
}

module.exports = {
    getConnectParams
};