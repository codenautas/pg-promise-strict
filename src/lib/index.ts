/*
 * Temporary entry point (package.json main) for backward compatibility.
 * The options were exported variables and CommonJS consumers could assign them (pg.log = ...).
 * To keep that working, this module re-exports the library and defines the old names as accessors
 * of the exports object that redirect to `options` and warn once for each place that uses them.
 * It works only because it is compiled to CommonJS.
 * To remove it: delete this file and set main and types back to dist/lib/pg-promise-strict.
 */
import { options } from './pg-promise-strict';

export * from './pg-promise-strict';

const warnedDeprecatedUses = new Set<string>();

function warnDeprecatedUse(name:string, replacement:string){
    // stack: [0] Error, [1] warnDeprecatedUse, [2] the accessor, [3] the code that used the deprecated export
    var usedAt = new Error().stack?.split('\n')[3]?.trim() ?? 'in an unknown place';
    var key = name+' '+usedAt;
    if(!warnedDeprecatedUses.has(key)){
        warnedDeprecatedUses.add(key);
        var message = `pg-promise-strict DEPRECATED: "${name}" must not be used directly, use ${replacement}. Used ${usedAt}`;
        console.error(message);
        console.log(message);
    }
}

const moduleExports:object = exports;

function exportDeprecatedOption<K extends keyof typeof options>(name:K){
    Object.defineProperty(moduleExports, name, {
        enumerable: true,
        get():(typeof options)[K]{
            warnDeprecatedUse(name, 'options.'+name);
            return options[name];
        },
        set(value:(typeof options)[K]){
            warnDeprecatedUse(name, 'options.'+name);
            options[name] = value;
        }
    });
}

exportDeprecatedOption('messages');
exportDeprecatedOption('debug');
exportDeprecatedOption('defaults');
exportDeprecatedOption('log');
exportDeprecatedOption('alsoLogRows');
exportDeprecatedOption('logExceptions');
exportDeprecatedOption('easy');
exportDeprecatedOption('allTypes');
exportDeprecatedOption('readyLog');
