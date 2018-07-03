<!--multilang v0 es:agregados.md en:additions.md -->

<!--lang:es-->

# Agregados en pg-promise-strict

<!--lang:en--]

# Additions in pg-promise-strict

[!--lang:*-->

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](additions.md) - 

<!--lang:es-->

Si bien el objetivo de ***pg-promise-strict*** es ser neutro respecto de la librería [pg](//npmjs.com/package/pg)
es conveniente hacer algunos agregados que persiguen los siguientes objetivos:
* indicar explícitamente (cuando *se sabe*) cuántas líneas se esperan en el resultado, 
para que en caso de no cumplirse se lance una excepción (porque estamos en una situación que *no se sabía que podía pasar*)
* indicar explícitamente que se desean traer todas las líneas de una sola vez
(en [pg](//npmjs.com/package/pg) eso es explícito al pasar un callback a la función query, 
pero como el equivalente en pg-promise-strict es esperar una promesa con la función then, 
podría pasar desapersibido el hecho de que se está haciendo un `fetchAll`)

<!--lang:en--]

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

[!--lang:*-->

function            | min | max |return
--------------------|-----|-----|--------------
execute             |  -  |  -  | result.rowCount
fetchAll            |  0  | inf | result.rows, result.rowCount
fetchUniqueValue    |  1  |  1  | result.value
fetchUniqueRow      |  1  |  1  | result.row
fetchOneRowIfExists |  0  |  1  | result.row, result.rowCount

## onNotice(callback)

<!--lang:es-->

Lee las notificaciones que envía la base de datos con `raise notice`.

<!--lang:en--]

Reads the database notifications raies with `raise notice`.

[!--lang:*-->

```js
client.connect().then(function(client){
    return client.query('SELECT functionThatNotices()');
}).onNotice(function(message){
    console.log('Notice',message)
}).execute().then(function(){
    console.log('DONE!');
    result.client.done();
}).catch(function(err){
    return console.error(err);
});
```

## executeSentences(sentences)

<!--lang:es-->

Devuelve una cadena de promesas que 
ejecutará en orden un arreglo de sentencias SQL.
Si alguna sentencia da error interrumpe devolviendo la condición de error. 

<!--lang:en--]

Returns a promise chain that will 
execute an array of sql sentences. 
If an error ocurrs it will reject the promise. 

[!--lang:*-->

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

<!--lang:es-->

Devuelve una cadena de promesas que ejecutará un archivo con sentencias SQL.
Utiliza `executeSentences` para la ejecución. 

**El separador de sentencias es la línea en blanco** 
(de ese modo se pueden poner sentencias complejas que incluyan el ';')

<!--lang:en--]

Returns a promise chain that will execute a file with sql sentences. 
Uses `executeSentences` for the task. 

**Blank line is the sentence separator** (to allow complex sentences). 

[!--lang:*-->

```js

client.executeSqlScript('generate_db.sql').then(function(){
    console.log('ok');
}).catch(function(err){
    console.log('ERROR', err);
});

```

## bulkInsert(params)

<!--lang:es-->

Inserta un conunto de filas en una tabla.

parámetro |uso
----------|----------------------------------
schema    | (opcional) nombre del esquema
table     | nombre de la tabla
columns   | arreglo de nombres de columnas
rows      | arreglo de registros (cada registro es un arreglo de valores)

<!--lang:en--]

Inserts a set of rows in a table. 

parámetro |uso
----------|----------------------------------
schema    | (optional) schema name
table     | table name
columns   | array of column names
rows      | array of records (each record is an array of values)

[!--lang:*-->

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
