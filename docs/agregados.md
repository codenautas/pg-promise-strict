<!-- multilang from additions.md




NO MODIFIQUE ESTE ARCHIVO. FUE GENERADO AUTOMÁTICAMENTE POR multilang.js




-->

# Agregados en pg-promise-strict



<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](additions.md)



Si bien el objetivo de ***pg-promise-strict*** es ser neutro respecto de la librería [pg](//npmjs.com/package/pg)
es conveniente hacer algunos agregados que persiguen los siguientes objetivos:
* indicar explícitamente (cuando *se sabe*) cuántas líneas se esperan en el resultado, 
para que en caso de no cumplirse se lance una excepción (porque estamos en una situación que *no se sabía que podía pasar*)
* indicar explícitamente que se desean traer todas las líneas de una sola vez
(en [pg](//npmjs.com/package/pg) eso es explícito al pasar un callback a la función query, 
pero como el equivalente en pg-promise-strict es esperar una promesa con la función then, 
podría pasar desapersibido el hecho de que se está haciendo un `fetchAll`)

