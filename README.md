# pg-promise-strict
postgresql with strict interpretation of promises

<!--multilang v0 en:README.md es:LEEME.md -->

![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![version](https://img.shields.io/npm/v/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![downloads](https://img.shields.io/npm/dm/pg-promise-strict.svg)](https://npmjs.org/package/pg-promise-strict)
[![linux](https://img.shields.io/travis/codenautas/pg-promise-strict/master.svg)](https://travis-ci.org/codenautas/pg-promise-strict)
[![coverage](https://img.shields.io/coveralls/codenautas/pg-promise-strict/master.svg)](https://coveralls.io/r/codenautas/pg-promise-strict)
[![climate](https://img.shields.io/codeclimate/github/codenautas/pg-promise-strict.svg)](https://codeclimate.com/github/codenautas/pg-promise-strict)
[![dependencies](https://img.shields.io/david/codenautas/pg-promise-strict.svg)](https://david-dm.org/codenautas/pg-promise-strict)

<!--multilang buttons-->

language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md) - 

<!--lang:es--]

**postgresql** con **promesas** en el sentido estricto

[!--lang:en-->

# Features

PG Promise/A+ in the strict way:
 * The same functions, with the same name and same retunrs that in PG, but without callbacks
 * covers 100% by test in two groups: test with real database (postgresql 9.3) and test with mock functions. Each group covers 100% the code. It means that we have **2 × 100% of coverage**.
 * No reimplement nothing that PG does
 * Some minimal additions for comfort

<!--lang:es--]

# Características

pg-strict-promise implementa una versión con Promise/A+ en el sentido estricto de la librería PG.
 * Tiene las mismas funciones que PG, con los mismos nombres, los mismos parámetros y que devuelven lo mismo, reemplazando los *callbacks* con promesas.
 * Con pruebas que cubren el 100% del código en dos grupos: un grupo de pruebas que usa una base de datos real (postgresl 9.3) y otro que testea solo las llamadas (adaptaciones) que se hacen sobre PG. Ambos grupos de pruebas cubren el 100% del código. Así obtenemos una **cobertura de 2 × 100%**.
 * No se reimplementa nada de lo que PG ya implementa
 * Algunos agregados mínimos para mayor comodidad

[!--lang:en-->

## Use examples

<!--lang:es--]

## Ejemplos de uso

<!--lang:*-->

```js
var pg = require('pg-promise-strict');

var conOpts = {
    user: 'test_user',
    password: 'test_pass',
    database: 'test_db',
    host: 'localhost',
    port: 5432
}; // you can also use a connection string

pg.connect(conOpts).then(function(client){
    return client.query('select * from table').execute(function(row){
        // do something for each row
        console.log('row fetched', row);
    }); // returns a promise than resolves when all rows was reeded 
}).then(function(result){
    console.log('ok',result.rowCount);
}).catch(function(err){
    console.log('ERROR',err);
});
```

<!--lang:en-->

## License

<!--lang:es--]

## Licencias

<!--lang:*-->

[MIT](LICENSE)