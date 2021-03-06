<!-- multilang from agregados.md




DO NOT MODIFY DIRECTLY THIS FILE WAS GENERATED BY multilang.js




-->


# Additions in pg-promise-strict


<!--multilang buttons-->

language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](agregados.md)


Although the purpose of ***pg-promise-strict*** is to be neutral about the library [pg](//npmjs.com/package/pg), it is convinient to do some
addons to persue the following golds:
* Explicit indication (when *it is known*) of how many rows are expected in the result, so that in case that this is not accomplished an exception 
is thrown (because we are in a situation that *we didn´t know that could happen*)
* Explicit indication of the desire that all the rows should be pulled at once (in[pg](//npmjs.com/package/pg) this is explicit when passing a callback to the
to the function query, but as the equivalent in pg-promise-strict is to wait for a promise with the function then, it could go unnoticed the fact
that a `fetchAll` is being done) 

Addings:
* explicit indication of how many rows are expected in the result
* explicit indication of `fetchAll` in `query(...).then` calls


function            | min | max |return
--------------------|-----|-----|--------------
execute             |  -  |  -  | result.rowCount
fetchAll            |  0  | inf | result.rows, result.rowCount
fetchUniqueValue    |  1  |  1  | result.value
fetchUniqueRow      |  1  |  1  | result.row
fetchOneRowIfExists |  0  |  1  | result.row, result.rowCount

## onNotice(callback)


Reads the database notifications raies with `raise notice`.


```js
client.connect().then(function(client){
    return client.query('SELECT functionThatNotices()');
}).onNotice(function(notice){
    console.log('Notice',notice.message)
}).execute().then(function(){
    console.log('DONE!');
    result.client.done();
}).catch(function(err){
    return console.error(err);
});
```

## executeSentences(sentences)


Returns a promise chain that will 
execute an array of sql sentences. 
If an error ocurrs it will reject the promise. 


```js

client.executeSentences([
    'CREATE TABLE perfect_nums (num bigint)',
    'INSERT INTO perfect_nums values (6), (28), (496), (8128)'
]).then(function(){
    console.log('ok');
}).catch(function(err){
    console.log('ERROR', err);
});

```

## executeSqlScript(fileName)


Returns a promise chain that will execute a file with sql sentences. 
Uses `executeSentences` for the task. 

**Blank line is the sentence separator** (to allow complex sentences). 


```js

client.executeSqlScript('generate_db.sql').then(function(){
    console.log('ok');
}).catch(function(err){
    console.log('ERROR', err);
});

```

## bulkInsert(params)


Inserts a set of rows in a table. 

parámetro |uso
----------|----------------------------------
schema    | (optional) schema name
table     | table name
columns   | array of column names
rows      | array of records (each record is an array of values)


```js
client.bulkInsert({
    table: 'people',
    columns: ['first_name', 'last_name', 'age'],
    rows: [
        ['Smith', 'Mary', 23],
        ['Connor', 'Sarah', 33],
    ]
}).then(function(){
    console.log('ok');
}).catch(function(err){
    console.log('ERROR', err);
});

```
