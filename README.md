# pg-promise-strict

postgresql with strict interpretation of promises


![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![downloads](https://img.shields.io/npm/dm/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![linux](https://img.shields.io/travis/codenautas/pg-promise-strict/master.svg)](https://travis-ci.org/codenautas/pg-promise-strict)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true)](https://ci.appveyor.com/project/codenautas/pg-promise-strict)
[![coverage](https://img.shields.io/coveralls/codenautas/pg-promise-strict/master.svg)](https://coveralls.io/r/codenautas/pg-promise-strict)
[![climate](https://img.shields.io/codeclimate/github/codenautas/pg-promise-strict.svg)](https://codeclimate.com/github/codenautas/pg-promise-strict)
[![dependencies](https://img.shields.io/david/codenautas/pg-promise-strict.svg)](https://david-dm.org/codenautas/pg-promise-strict)
[![qa-control](http://codenautas.com/github/codenautas/pg-promise-strict.svg)](http://codenautas.com/github/codenautas/pg-promise-strict)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


# Features

PG Promise/A+ in the strict way:
 * The same functions, with the same name and same retunrs that in PG, but without callbacks
 * covers 100% by test in two groups: test with real database (postgresql 9.3) and test with mock functions. Each group covers 100% the code. It means that we have **2 × 100% of coverage**.
 * No reimplement nothing that PG does
 * Some minimal [additions](docs/additions.md) for comfort


# Install


```sh
$ npm install pg-promise-strict
```


# Use example


```js
var pg = require('pg-promise-strict');

pg.easy = true;

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
};

pg.connect(conOpts).then(function(client){
    return client.query('select * from table');
}).then(function(result){
    for(var i=0; i<result.rowCount; i++){
        console.log('row',i,result.row[i]);
    }
}).catch(function(err){
    console.log('ERROR',err);
});
```


## Examples of PG

The first easy example. One simple query that returns all rows. Example based in [PG](https://www.npmjs.com/package/pg#client-pooling)


```js
var pg = require('pg-promise-strict');

pg.easy = true;

var conString = "postgres://username:password@localhost/database";

pg.connect(conString).then(function(client){
    return client.query('SELECT $1::int AS number', ['1']);
}).then(function(result)){
    console.log(result.rows[0].number);
}).catch(err){
    return console.error('error fetching client from pool or running query', err);
}).then(function(){
    client.done(); // original done function of callback of PG.connect
});
```


In this example you see:
 * the Promise chain
 * parameters passed to *libpq* in the query function
 * `.then(function(result)` is the equivalent callback passed to query


### Example without connection pool

Corresponds to calls to [PG](https://github.com/brianc/node-postgres#client-instance)
direct client instance


```js
var pg = require('pg-promise-strict');

var conString = "postgres://username:password@localhost/database";

var client = new pg.Client(conString);

client.connect().then(function(client){
    return client.query('SELECT NOW() AS "theTime"');
}).then(function(result){
    console.log(result.rows[0].theTime);
    console.log(row.name);
    client.end();
}).catch(function(err){
    return console.error('error connecting or running query', err);
});
```


### Example with fetch row by row

Corresponds to calls to [PG](https://github.com/brianc/node-postgres/wiki/Client#simple-query-without-callback).query
without callback. In [PG](https://github.com/brianc/node-postgres/wiki/Client#parameters-1) documentation
[Brian C](https://github.com/brianc) says *do not provide callback function for large result sets unless you're okay with loading the entire result set into memory*

This is the way for process data row by row


```js
pg.connect({user: 'brianc', database: 'test'}).then(function(client){
    client.query("SELECT name FROM users").onRow(function(row){
        console.log(row.name);
    }).then(function(result){
        console.log('ready.',result.rowCount,'rows processed');
        client.done();
    });
});
```


# Running tests

Clone the repository and install the developer dependencies in then normal way.
You must provide a *postgresql-9.3* instalation for create a *test_db*.
Then you can test pg-promise-strict


```sh
$ git clone git://github.com/codenautas/pg-promise-strict.git pg-promise-strict
$ cd pg-promise-strict
$ npm install
$ psql --file test/create_db.sql
$ npm test
```


Then you can also check coverage separadly: with only real db or with no-db (with mock functions).


```js
$ npm run-script test-cov-odb
$ npm run-script test-cov-ndb
```


## License


[MIT](LICENSE)

