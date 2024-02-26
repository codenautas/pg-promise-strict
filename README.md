# pg-promise-strict

postgresql with promises and strict types and returning size of results


![stable](https://img.shields.io/badge/stability-stable-brightgreen.svg)
[![npm-version](https://img.shields.io/npm/v/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![downloads](https://img.shields.io/npm/dm/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![build](https://github.com/codenautas/pg-promise-strict/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/pg-promise-strict/actions/workflows/node.js.yml)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true)](https://ci.appveyor.com/project/codenautas/pg-promise-strict)
[![coverage](https://img.shields.io/coveralls/codenautas/pg-promise-strict/master.svg)](https://coveralls.io/r/codenautas/pg-promise-strict)
[![outdated-deps](https://img.shields.io/github/issues-search/codenautas/pg-promise-strict?color=9cf&label=outdated-deps&query=is%3Apr%20author%3Aapp%2Fdependabot%20is%3Aopen)](https://github.com/codenautas/pg-promise-strict/pulls/app%2Fdependabot)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


# Features

PG Promise/A+ in the strict way:
 * The same functions, with the same name and same retunrs that in PG, but without callbacks
 * covers 100% by test.
 * 100% coded in typescript
 * No reimplement nothing that PG does
 * Some [additions](docs/additions.md) for comfort


# Install


```sh
$ npm install pg-promise-strict
```


# Use example


```js
var pg = require('pg-promise-strict');

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
};

pg.connect(conOpts).then(function(client){
    return client.query('select * from table').fetchAll().then(function(result){
        for(var i=0; i<result.rowCount; i++){
            console.log('row',i,result.rows[i]);
        }
        client.done();
    });
}).catch(function(err){
    console.log('ERROR',err);
});
```


## Examples of PG

The first easy example. One simple query that returns all rows. Example based in [PG](https://www.npmjs.com/package/pg#client-pooling)


```js
var pg = require('pg-promise-strict');

var conString = "postgres://username:password@localhost/database";

try{
    var client = await pg.connect(conString)
    var result = await client.query('SELECT $1::int AS number', ['1']).fetchAll();
    console.log(result.rows[0].number);
}catch(err){
    console.error('error fetching client from pool or running query', err);
};
```


In this example you see:
 * async calls
 * parameters passed to *libpq* in the query function
 * the *fetchAll* function that convirms that you want all rows.


### Example without connection pool

Corresponds to calls to [PG](https://github.com/brianc/node-postgres#client-instance)
direct client instance


```js
var pg = require('pg-promise-strict');

var conString = "postgres://username:password@localhost/database";

var client = new pg.Client(conString);

try{
    await client.connect();
    var result = await client.query('SELECT NOW() AS "theTime"').fetchAll();
    console.log(result.rows[0].theTime);
    console.log(row.name);
    client.done();
}catch(err){
    console.error('error connecting or running query', err);
});
```


### Example with fetch row by row

Corresponds to calls to [PG](https://github.com/brianc/node-postgres/wiki/Client#simple-query-without-callback).query
without callback. In [PG](https://github.com/brianc/node-postgres/wiki/Client#parameters-1) documentation
[Brian C](https://github.com/brianc) says *do not provide callback function for large result sets unless you're okay with loading the entire result set into memory*

This is the way for process data row by row


```js
var client = await pg.connect({user: 'brianc', database: 'test'});
await client.query("SELECT name FROM users").onRow(function(row){
    console.log(row.name);
});
client.done();
console.log('ready.');
```


In this example you see:
  * the on-row callback
  * the *await* until the query has finished


# Running the examples

In the `examples` directory the `create_db.sql` script can be used to create de test database.
In the same directory there are the example slightly modified.


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


## License


[MIT](LICENSE)
