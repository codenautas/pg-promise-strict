"use strict";

if(process.env.COVER!=="sdb") return;

var Promises = require('best-promise');

var tester=require('sql-promise').tester;

var defaultConnOpts={
    user:'test_user',
    password:'test_pass',
    database:'test_db',
    host:'localhost',
    port:5432
}

var pg = require('..');

var conn;

console.log('aca');

function prepareSchema(){
    return Promises.start().then(function(){
        return pg.connect(defaultConnOpts);
    }).then(function(obteinedConn){
        conn = obteinedConn;
        return conn.query("DROP SCHEMA IF EXISTS test_sql_promise CASCADE;").execute();
    }).then(function(){
        return conn.query("CREATE SCHEMA test_sql_promise;").execute();
    }).then(function(){
        return conn.query("ALTER USER test_user SET search_path = test_sql_promise;").execute();
    }).catch(function(err){
        console.log("can't create schema");
        throw err;
    }).then(function(){
        return null; // ok, no error
    }).catch(function(err){
        console.log('ERROR', err);
        console.log('STACK', err.stack);
        return err;
    });
}

tester.test(pg, {
    connOpts:defaultConnOpts,
    prepare:prepareSchema
});
