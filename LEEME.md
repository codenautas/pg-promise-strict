<!-- multilang from README.md




NO MODIFIQUE ESTE ARCHIVO. FUE GENERADO AUTOMÁTICAMENTE POR multilang.js




-->
# pg-promise-strict
postgresql with strict interpretation of promises


![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![version](https://img.shields.io/npm/v/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![downloads](https://img.shields.io/npm/dm/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![linux](https://img.shields.io/travis/codenautas/pg-promise-strict/master.svg)](https://travis-ci.org/codenautas/pg-promise-strict)
[![coverage](https://img.shields.io/coveralls/codenautas/pg-promise-strict/master.svg)](https://coveralls.io/r/codenautas/pg-promise-strict)
[![climate](https://img.shields.io/codeclimate/github/codenautas/pg-promise-strict.svg)](https://codeclimate.com/github/codenautas/pg-promise-strict)
[![dependencies](https://img.shields.io/david/codenautas/pg-promise-strict.svg)](https://david-dm.org/codenautas/pg-promise-strict)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)


**postgresql** con **promesas** en el sentido estricto


# Características

pg-strict-promise implementa una versión con Promise/A+ en el sentido estricto de la librería PG.
 * Tiene las mismas funciones que PG, con los mismos nombres, los mismos parámetros y que devuelven lo mismo, reemplazando los *callbacks* con promesas.
 * Con pruebas que cubren el 100% del código en dos grupos: un grupo de pruebas que usa una base de datos real (postgresl 9.3) y otro que testea solo las llamadas (adaptaciones) que se hacen sobre PG. Ambos grupos de pruebas cubren el 100% del código. Así obtenemos una **cobertura de 2 × 100%**.
 * No se reimplementa nada de lo que PG ya implementa
 * Algunos agregados mínimos para mayor comodidad


# Instalación


```sh
$ npm install pg-promise-strict
```


# Ejemplo de uso


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


## Ejemplos de PG

El primer ejemplo. Trae todas las filas de una consulta a la vez. Ejemplo basado en [PG](https://www.npmjs.com/package/pg#client-pooling)


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


### Ejemplo sin el pool de conexiones

Corresponde al ejemplo de llamada a [PG](https://github.com/brianc/node-postgres#client-instance)
con conexión directa del cliente


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


### Ejemplo procesando de a una fila a la vez

Corresponde al ejemplo de llamada a [PG](https://github.com/brianc/node-postgres/wiki/Client#simple-query-without-callback).query 
sin función callback. En la documentación de [PG](https://github.com/brianc/node-postgres/wiki/Client#parameters-1),
[Brian C](https://github.com/brianc) dice *no especifique una function callback para consultas que devuelven grandes conjuntos de datos salvo que quiera que se acumule todo en memoria*
 
Esta es la manera de procesar fila por fila


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


# Corriendo los tests

Para correr los test, además de clonar el repositorio e instalar con npm
tenemos que proveer una conexión a la base de datos *postgresql-9.3* para
poder crear el usuario *test_user* y la base *test_db*.


```sh
$ git clone git://github.com/codenautas/pg-promise-strict.git pg-promise-strict
$ cd pg-promise-strict 
$ npm install
$ psql --file test/create_db.sql
$ npm test
```


Luego se puede verificar la covertura de código probarndo por separado los test con conexion a la base de datos (odb) 
o sin conexión (ndb, usando funciones sustitutas *mock functions* en vez de llamadas reales). 


```js
$ npm run-script test-cov-odb
$ npm run-script test-cov-ndb
```


## Licencia

[MIT](LICENSE)

