"use strict";

var pg = require('pg');
var Promise = require('promise');

var pgPromiseStrict={
};

pgPromiseStrict.Client = function(client, done){
    this.client = client;
    this.done = done;
}

pgPromiseStrict.connect = function connect(connectParameters){
    return new Promise(function(resolve, reject){
        pg.connect(connectParameters,function(err, client, done){
            if(err){
                reject(err);
            }else{
                resolve(new pgPromiseStrict.Client(client, done));
            }
        });
    });
}

module.exports = pgPromiseStrict;
