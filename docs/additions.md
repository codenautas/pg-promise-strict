<!--lang:en-->

# Additions in pg-promise-strict

<!--lang:es--]

# Agregados en pg-promise-strict

[!--lang:*-->

<!--multilang v0 en:additions.md es:agregados.md -->

<!--multilang buttons-->

language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](agregados.md) - 

<!--lang:en-->

(for this section see [spanish version](agregados.md))
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

<!--lang:es--]

Si bien el objetivo de ***pg-promise-strict*** es ser neutro respecto de la librería [pg](//npmjs.com/package/pg)
es conveniente hacer algunos agregados que persiguen los siguientes objetivos:
* indicar explícitamente (cuando *se sabe*) cuántas líneas se esperan en el resultado, 
para que en caso de no cumplirse se lance una excepción (porque estamos en una situación que *no se sabía que podía pasar*)
* indicar explícitamente que se desean traer todas las líneas de una sola vez
(en [pg](//npmjs.com/package/pg) eso es explícito al pasar un callback a la función query, 
pero como el equivalente en pg-promise-strict es esperar una promesa con la función then, 
podría pasar desapersibido el hecho de que se está haciendo un `fetchAll`)

[!--lang:*-->

function   | min | max | return
-----------|-----|-----|--------------
execute    |  -  |  -  | result.rowCount
fetchAll   |  0  | inf | result.rows, result.rowCount
fetchUniqueValue | 1 | 1 | result.value
fetchUniqueRow | 1 | 1 | result.row
fetchOneRowIfExists | 0 | 1 | result.row, result.rowCount


