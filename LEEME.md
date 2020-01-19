<!--multilang v0 es:LEEME.md en:README.md -->
# pg-promise-strict

<!--lang:es-->
**postgresql** con **promesas** y estricto tanto con los tipos como con el tamaño del resultado esperado

<!--lang:en--]
postgresql with promises and strict types and returning size of results

[!--lang:*-->

<!-- cucardas -->
![stable](https://img.shields.io/badge/stability-stable-brightgreen.svg)
[![npm-version](https://img.shields.io/npm/v/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![downloads](https://img.shields.io/npm/dm/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![linux](https://img.shields.io/travis/codenautas/pg-promise-strict/master.svg)](https://travis-ci.org/codenautas/pg-promise-strict)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/pg-promise-strict?svg=true)](https://ci.appveyor.com/project/codenautas/pg-promise-strict)
[![coverage](https://img.shields.io/coveralls/codenautas/pg-promise-strict/master.svg)](https://coveralls.io/r/codenautas/pg-promise-strict)
[![dependencies](https://img.shields.io/david/codenautas/pg-promise-strict.svg)](https://david-dm.org/codenautas/pg-promise-strict)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

# Características

pg-strict-promise implementa una versión con Promise/A+ de la librería PG.
 * Permite indicar qué tipo de resultado se espera (si una sola fila, un solo valor, etc.) y algunos [agregados](docs/agregados.md) más
 * Trata de parecerse a PG, con los mismos nombres, los mismos parámetros y que devuelven lo mismo, reemplazando los *callbacks* con promesas.
 * Con pruebas que cubren el 100% del código
 * Escrito 100% en typescript
 * No se reimplementa nada de lo que PG ya implementa

<!--lang:en--]

# Features

PG Promise/A+ in the strict way:
 * The same functions, with the same name and same retunrs that in PG, but without callbacks
 * covers 100% by test.
 * 100% coded in typescript
 * No reimplement nothing that PG does
 * Some [additions](docs/additions.md) for comfort

<!--lang:es-->

# Instalación

<!--lang:en--]

# Install

[!--lang:*-->

```sh
$ npm install pg-promise-strict
```

<!--lang:es-->

# Ejemplo de uso

<!--lang:en--]

# Use example

[!--lang:*-->

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
    return client.query('select * from table').execute().then(function(result){
        for(var i=0; i<result.rowCount; i++){
            console.log('row',i,result.rows[i]);
        }
        client.done();
    });
}).catch(function(err){
    console.log('ERROR',err);
});
```

<!--lang:es-->

## Ejemplos de PG

El primer ejemplo. Trae todas las filas de una consulta a la vez. Ejemplo basado en [PG](https://www.npmjs.com/package/pg#client-pooling)

<!--lang:en--]

## Examples of PG

The first easy example. One simple query that returns all rows. Example based in [PG](https://www.npmjs.com/package/pg#client-pooling)

[!--lang:*-->

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

<!--lang:es-->

En este ejemplo se puede ver:
 * las llamadas asincrónicas
 * los parámetros apsados a *libpq* en la función *query*
 * la función *fetchAll* que confirma que se desean todos los registros juntos y a la vez (se esperará hasta obtenerlos todos)

<!--lang:en--]

In this example you see:
 * async calls
 * parameters passed to *libpq* in the query function
 * the *fetchAll* function that convirms that you want all rows.

<!--lang:es-->

### Ejemplo sin el pool de conexiones

Corresponde al ejemplo de llamada a [PG](https://github.com/brianc/node-postgres#client-instance)
con conexión directa del cliente

<!--lang:en--]

### Example without connection pool

Corresponds to calls to [PG](https://github.com/brianc/node-postgres#client-instance) 
direct client instance

[!--lang:*-->

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

<!--lang:es-->

### Ejemplo procesando de a una fila a la vez

Corresponde al ejemplo de llamada a [PG](https://github.com/brianc/node-postgres/wiki/Client#simple-query-without-callback).query 
sin función callback. En la documentación de [PG](https://github.com/brianc/node-postgres/wiki/Client#parameters-1),
[Brian C](https://github.com/brianc) dice *no especifique una function callback para consultas que devuelven grandes conjuntos de datos salvo que quiera que se acumule todo en memoria*
 
Esta es la manera de procesar fila por fila

<!--lang:en--]

### Example with fetch row by row

Corresponds to calls to [PG](https://github.com/brianc/node-postgres/wiki/Client#simple-query-without-callback).query 
without callback. In [PG](https://github.com/brianc/node-postgres/wiki/Client#parameters-1) documentation 
[Brian C](https://github.com/brianc) says *do not provide callback function for large result sets unless you're okay with loading the entire result set into memory*
 
This is the way for process data row by row
 
[!--lang:*-->

```js
var client = await pg.connect({user: 'brianc', database: 'test'});
await client.query("SELECT name FROM users").onRow(function(row){
    console.log(row.name);
});
client.done();
console.log('ready.');
```

<!--lang:es-->

En el ejemplo se ve 
  * la función que se llama en cada fila obtenida. 
  * el *await* que espera a que se hayan terminado de leer todas las líneas

<!--lang:en--]

In this example you see:
  * the on-row callback
  * the *await* until the query has finished

<!--lang:es-->

# Corriendo los ejemplos

En la carpeta `examples` hay un script `create_db.sql` para crear la base de datos para lo ejemplos. 
En esa carpeta también están los ejemplos levemente modificados. 

Los ejemplos que figuran en este `LEEME.md` son adaptaciones de los ejemplos de PG.

<!--lang:en--]

# Running the examples

In the `examples` directory the `create_db.sql` script can be used to create de test database.
In the same directory there are the example slightly modified. 

[!--lang:es-->

# Corriendo los tests

Para correr los test, además de clonar el repositorio e instalar con npm
tenemos que proveer una conexión a la base de datos *postgresql-9.3* para
poder crear el usuario *test_user* y la base *test_db*.

<!--lang:en--]

# Running tests

Clone the repository and install the developer dependencies in then normal way. 
You must provide a *postgresql-9.3* instalation for create a *test_db*.
Then you can test pg-promise-strict
 
[!--lang:*-->

```sh
$ git clone git://github.com/codenautas/pg-promise-strict.git pg-promise-strict
$ cd pg-promise-strict 
$ npm install
$ psql --file test/create_db.sql
$ npm test
```

<!--lang:es-->

## Licencia

<!--lang:en--]

## License

[!--lang:*-->

[MIT](LICENSE)
