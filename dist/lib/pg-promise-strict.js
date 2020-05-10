"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const pg = require("pg");
const pgTypes = pg.types;
const pg_copy_streams_1 = require("pg-copy-streams");
const util = require("util");
const likeAr = require("like-ar");
const bestGlobals = require("best-globals");
const stream_1 = require("stream");
const MESSAGES_SEPARATOR_TYPE = '------';
const MESSAGES_SEPARATOR = '-----------------------';
exports.messages = {
    attemptTobulkInsertOnNotConnected: "pg-promise-strict: atempt to bulkInsert on not connected",
    attemptTocopyFromOnNotConnected: "pg-promise-strict: atempt to copyFrom on not connected",
    attemptToExecuteSentencesOnNotConnected: "pg-promise-strict: atempt to executeSentences on not connected",
    attemptToExecuteSqlScriptOnNotConnected: "pg-promise-strict: atempt to executeSqlScript on not connected",
    clientAlreadyDone: "pg-promise-strict: client already done",
    clientConenctMustNotReceiveParams: "client.connect must no receive parameters, it returns a Promise",
    copyFromInlineDumpStreamOptsDoneExperimental: "WARNING! copyFromInlineDumpStream opts.done func is experimental",
    fetchRowByRowMustReceiveCallback: "fetchRowByRow must receive a callback that executes for each row",
    formatNullableToInlineDumpErrorParsing: "formatNullableToInlineDump error parsing",
    insaneName: "insane name",
    lackOfClient: "pg-promise-strict: lack of Client._client",
    mustNotConnectClientFromPool: "pg-promise-strict: Must not connect client from pool",
    mustNotEndClientFromPool: "pg-promise-strict: Must not end client from pool",
    nullInQuoteLiteral: "null in quoteLiteral",
    obtains1: "obtains $1",
    obtainsNone: "obtains none",
    queryExpectsOneFieldAnd1: "query expects one field and $1",
    queryExpectsOneRowAnd1: "query expects one row and $1",
    queryMustNotBeCatched: "pg-promise-strict: Query must not be awaited nor catched",
    queryMustNotBeThened: "pg-promise-strict: Query must not be awaited nor thened",
    queryNotConnected: "pg-promise-strict: query not connected",
    unbalancedConnection: "pgPromiseStrict.debug.pool unbalanced connection",
};
exports.i18n = {
    messages: {
        en: exports.messages,
        es: {
            attemptTobulkInsertOnNotConnected: "pg-promise-strict: intento de bulkInsert en un cliente sin conexion",
            attemptTocopyFromOnNotConnected: "pg-promise-strict: intento de copyFrom en un cliente sin conexion",
            attemptToExecuteSentencesOnNotConnected: "pg-promise-strict: intento de executeSentences en un cliente sin conexion",
            attemptToExecuteSqlScriptOnNotConnected: "pg-promise-strict: intento de executeSqlScript en un cliente sin conexion",
            clientAlreadyDone: "pg-promise-strict: el cliente ya fue terminado",
            clientConenctMustNotReceiveParams: "pg-promise-strict: client.connect no debe recibir parametetros, devuelve una Promesa",
            copyFromInlineDumpStreamOptsDoneExperimental: "WARNING! copyFromInlineDumpStream opts.done es experimental",
            fetchRowByRowMustReceiveCallback: "fetchRowByRow debe recibir una funcion callback para ejecutar en cada registro",
            formatNullableToInlineDumpErrorParsing: "error al parsear en formatNullableToInlineDump",
            insaneName: "nombre invalido para objeto sql, debe ser solo letras, numeros o rayas empezando por una letra",
            lackOfClient: "pg-promise-strict: falta Client._client",
            mustNotConnectClientFromPool: "pg-promise-strict: No se puede conectar un 'Client' de un 'pool'",
            mustNotEndClientFromPool: "pg-promise-strict: no debe terminar el client desde un 'pool'",
            nullInQuoteLiteral: "la funcion quoteLiteral no debe recibir null",
            obtains1: "se obtuvieron $1",
            obtainsNone: "no se obtuvo ninguno",
            queryExpectsOneFieldAnd1: "se esperaba obtener un solo valor (columna o campo) y $1",
            queryExpectsOneRowAnd1: "se esperaba obtener un registro y $1",
            queryMustNotBeCatched: "pg-promise-strict: Query no puede ser usada con await o catch",
            queryMustNotBeThened: "pg-promise-strict: Query no puede ser usada con await o then",
            queryNotConnected: "pg-promise-strict: 'query' no conectada",
        }
    }
};
function setLang(lang) {
    if (lang in exports.i18n.messages) {
        exports.messages = { ...exports.i18n.messages.en, ...exports.i18n.messages[lang] };
    }
}
exports.setLang = setLang;
exports.debug = {};
exports.defaults = {
    releaseTimeout: { inactive: 60000, connection: 600000 }
};
/* instanbul ignore next */
function noLog(_message, _type) { }
exports.noLog = noLog;
exports.log = noLog;
function quoteIdent(name) {
    if (typeof name !== "string") {
        throw new Error(exports.messages.insaneName);
    }
    return '"' + name.replace(/"/g, '""') + '"';
}
exports.quoteIdent = quoteIdent;
;
function quoteIdentList(objectNames) {
    return objectNames.map(function (objectName) { return quoteIdent(objectName); }).join(',');
}
exports.quoteIdentList = quoteIdentList;
;
function quoteNullable(anyValue) {
    if (anyValue == null) {
        return 'null';
    }
    var text;
    if (typeof anyValue === "string") {
        text = anyValue;
    }
    else if (!(anyValue instanceof Object)) {
        text = anyValue.toString();
    }
    else if ('isRealDate' in anyValue && anyValue.isRealDate) {
        text = anyValue.toYmd();
    }
    else if (anyValue instanceof Date) {
        text = anyValue.toISOString();
    }
    else if ('toPostgres' in anyValue && anyValue.toPostgres instanceof Function) {
        text = anyValue.toPostgres();
    }
    else {
        text = JSON.stringify(anyValue);
    }
    return "'" + text.replace(/'/g, "''") + "'";
}
exports.quoteNullable = quoteNullable;
;
function quoteLiteral(anyValue) {
    if (anyValue == null) {
        throw new Error(exports.messages.nullInQuoteLiteral);
    }
    return quoteNullable(anyValue);
}
exports.quoteLiteral = quoteLiteral;
;
function json(sql, orderby) {
    return `COALESCE((SELECT jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}
exports.json = json;
function jsono(sql, indexedby) {
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},to_jsonb(j.*)) from (${sql}) as j),'{}'::jsonb)`;
}
exports.jsono = jsono;
function adaptParameterTypes(parameters) {
    // @ts-ignore 
    if (parameters == null) {
        return null;
    }
    return parameters.map(function (value) {
        if (value && value.typeStore) {
            return value.toLiteral();
        }
        return value;
    });
}
exports.adaptParameterTypes = adaptParameterTypes;
;
exports.easy = true; // deprecated!
/** TODO: any en opts */
class Client {
    constructor(connOpts, client, _done, _opts) {
        this._done = _done;
        this.connected = null;
        this.fromPool = false;
        this._client = client;
        if (connOpts == null) {
            this.fromPool = true;
            this.postConnect();
            /* DOING
            if(self.opts.timeoutController){
                cancelTimeout(self.timeoutController);
            }
            self.timeoutController = setInterval(function(){
                if(new Date().getTime() - self.lastOperationTimestamp  > self.opts.releaseTimeout.inactive
                || new Date().getTime() - self.lastConnectionTimestamp > self.opts.releaseTimeout.connection
                ){
                    self.done();
                }
            },Math.min(1000,self.opts.releaseTimeout.inactive/4));
            */
            if (exports.debug.pool) {
                if (exports.debug.pool === true) {
                    exports.debug.pool = {};
                }
                if (!(this._client.secretKey in exports.debug.pool)) {
                    exports.debug.pool[this._client.secretKey] = { client: this._client, count: 0 };
                }
                exports.debug.pool[this._client.secretKey].count++;
            }
        }
        else {
            // pgPromiseStrict.log('new Client');
            this._client = new pg.Client(connOpts);
            this._client.secretKey = this._client.secretKey || 'secret_' + Math.random();
        }
    }
    postConnect() {
        var nowTs = new Date().getTime();
        this.connected = {
            lastOperationTimestamp: nowTs,
            lastConnectionTimestamp: nowTs
        };
    }
    connect() {
        if (this.fromPool) {
            throw new Error(exports.messages.mustNotConnectClientFromPool);
        }
        if (arguments.length) {
            return Promise.reject(new Error(exports.messages.clientConenctMustNotReceiveParams));
        }
        if (!this._client) {
            /* istanbul ignore next */
            throw new Error(exports.messages.lackOfClient);
        }
        var client = this._client;
        var self = this;
        return new Promise(function (resolve, reject) {
            client.connect(function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    self.postConnect();
                    resolve(self);
                }
            });
        });
    }
    ;
    end() {
        if (this.fromPool) {
            /* istanbul ignore next */
            throw new Error(exports.messages.mustNotEndClientFromPool);
        }
        if (this._client instanceof pg.Client) {
            this._client.end();
        }
        else {
            /* istanbul ignore next */
            throw new Error(exports.messages.lackOfClient);
        }
    }
    ;
    done() {
        if (!this._client) {
            throw new Error(exports.messages.clientAlreadyDone);
        }
        if (exports.debug.pool) {
            // @ts-ignore DEBUGGING
            exports.debug.pool[this._client.secretKey].count--;
        }
        var clientToDone = this._client;
        this._client = null;
        // @ts-ignore arguments Array like and applyable
        return this._done.apply(clientToDone, arguments);
    }
    query() {
        if (!this.connected || !this._client) {
            /* istanbul ignore next */
            throw new Error(exports.messages.queryNotConnected);
        }
        this.connected.lastOperationTimestamp = new Date().getTime();
        var queryArguments = Array.prototype.slice.call(arguments);
        var queryText;
        var queryValues = null;
        if (typeof queryArguments[0] === 'string') {
            queryText = queryArguments[0];
            queryValues = queryArguments[1] = adaptParameterTypes(queryArguments[1] || null);
        }
        else if (queryArguments[0] instanceof Object) {
            queryText = queryArguments[0].text;
            queryValues = adaptParameterTypes(queryArguments[0].values || null);
            queryArguments[0].values = queryValues;
        }
        if (exports.log) {
            var sql = queryText;
            exports.log(MESSAGES_SEPARATOR, MESSAGES_SEPARATOR_TYPE);
            if (queryValues && queryValues.length) {
                exports.log('`' + sql + '\n`', 'QUERY-P');
                exports.log('-- ' + JSON.stringify(queryValues), 'QUERY-A');
                queryValues.forEach(function (value, i) {
                    sql = sql.replace(new RegExp('\\$' + (i + 1) + '\\b'), typeof value == "number" || typeof value == "boolean" ? value : quoteNullable(value));
                });
            }
            exports.log(sql + ';', 'QUERY');
        }
        var returnedQuery = this._client.query(new pg.Query(queryArguments[0], queryArguments[1]));
        return new Query(returnedQuery, this, this._client);
    }
    ;
    async executeSentences(sentences) {
        var self = this;
        if (!this._client || !this.connected) {
            /* istanbul ignore next */
            throw new Error(exports.messages.attemptToExecuteSentencesOnNotConnected + " " + !this._client + ',' + !this.connected);
        }
        var cdp = Promise.resolve();
        sentences.forEach(function (sentence) {
            cdp = cdp.then(async function () {
                if (!sentence.trim()) {
                    return;
                }
                return await self.query(sentence).execute().catch(function (err) {
                    throw err;
                });
            });
        });
        return cdp;
    }
    async executeSqlScript(fileName) {
        var self = this;
        if (!this._client || !this.connected) {
            /* istanbul ignore next */
            throw new Error(exports.messages.attemptToExecuteSqlScriptOnNotConnected + " " + !this._client + ',' + !this.connected);
        }
        return fs.readFile(fileName, 'utf-8').then(function (content) {
            var sentences = content.split(/\r?\n\r?\n/);
            return self.executeSentences(sentences);
        });
    }
    async bulkInsert(params) {
        var self = this;
        if (!this._client || !this.connected) {
            /* istanbul ignore next */
            throw new Error(exports.messages.attemptTobulkInsertOnNotConnected + " " + !this._client + ',' + !this.connected);
        }
        var sql = "INSERT INTO " + (params.schema ? quoteIdent(params.schema) + '.' : '') +
            quoteIdent(params.table) + " (" +
            params.columns.map(quoteIdent).join(', ') + ") VALUES (" +
            params.columns.map(function (_name, i_name) { return '$' + (i_name + 1); }) + ")";
        var i_rows = 0;
        while (i_rows < params.rows.length) {
            try {
                await self.query(sql, params.rows[i_rows]).execute();
            }
            catch (err) {
                if (params.onerror) {
                    await params.onerror(err, params.rows[i_rows]);
                }
                else {
                    throw err;
                }
            }
            i_rows++;
        }
    }
    copyFromParseParams(opts) {
        /* istanbul ignore next */
        if (opts.done) {
            console.log(exports.messages.copyFromInlineDumpStreamOptsDoneExperimental);
        }
        if (!this._client || !this.connected) {
            /* istanbul ignore next */
            throw new Error(exports.messages.attemptTocopyFromOnNotConnected + " " + !this._client + ',' + !this.connected);
        }
        var from = opts.inStream ? 'STDIN' : quoteLiteral(opts.filename);
        var sql = `COPY ${opts.table} ${opts.columns ? `(${opts.columns.map(name => quoteIdent(name)).join(',')})` : ''} FROM ${from} ${opts.with ? 'WITH ' + opts.with : ''}`;
        return { sql, _client: this._client };
    }
    async copyFromFile(opts) {
        var { sql } = this.copyFromParseParams(opts);
        return this.query(sql).execute();
    }
    copyFromInlineDumpStream(opts) {
        var { sql, _client } = this.copyFromParseParams(opts);
        var stream = _client.query(pg_copy_streams_1.from(sql));
        /* istanbul ignore next skipping expermiental feature */
        if (opts.done) {
            /* istanbul ignore next skipping expermiental feature */
            stream.on('error', opts.done);
            /* istanbul ignore next skipping expermiental feature */
            stream.on('end', opts.done);
            /* istanbul ignore next skipping expermiental feature */
            stream.on('close', opts.done);
        }
        if (opts.inStream) {
            /* istanbul ignore next skipping expermiental feature */
            if (opts.done) {
                /* istanbul ignore next skipping expermiental feature */
                opts.inStream.on('error', opts.done);
            }
            opts.inStream.pipe(stream);
        }
        return stream;
    }
    formatNullableToInlineDump(nullable) {
        if (nullable == null) {
            return '\\N';
        }
        else if (typeof nullable === "number" && isNaN(nullable)) {
            return '\\N';
        }
        else {
            return nullable.toString().replace(/(\r)|(\n)|(\t)|(\\)/g, function (_all, bsr, bsn, bst, bs) {
                if (bsr)
                    return '\\r';
                if (bsn)
                    return '\\n';
                if (bst)
                    return '\\t';
                /* istanbul ignore else por la regexp es imposible que pase al else */
                if (bs)
                    return '\\\\';
                /* istanbul ignore next Esto es imposible que suceda */
                throw new Error(exports.messages.formatNullableToInlineDumpErrorParsing);
            });
        }
    }
    copyFromArrayStream(opts) {
        var c = this;
        var transform = new stream_1.Transform({
            writableObjectMode: true,
            readableObjectMode: true,
            transform(arrayChunk, _encoding, next) {
                this.push(arrayChunk.map(x => c.formatNullableToInlineDump(x)).join('\t') + '\n');
                next();
            },
            flush(next) {
                this.push('\\.\n');
                next();
            }
        });
        var { inStream, ...rest } = opts;
        inStream.pipe(transform);
        return this.copyFromInlineDumpStream({ inStream: transform, ...rest });
    }
}
exports.Client = Client;
var queryResult;
function logErrorIfNeeded(err, code) {
    if (code != null) {
        // @ts-ignore EXTENDED ERROR
        err.code = code;
    }
    if (exports.log) {
        // @ts-ignore EXTENDED ERROR
        exports.log('--ERROR! ' + err.code + ', ' + err.message, 'ERROR');
    }
    return err;
}
function obtains(message, count) {
    return message.replace('$1', count ? exports.messages.obtains1.replace('$1', count.toString()) : exports.messages.obtainsNone);
}
class Query {
    constructor(_query, client, _internalClient) {
        this._query = _query;
        this.client = client;
        this._internalClient = _internalClient;
    }
    onNotice(callbackNoticeConsumer) {
        var q = this;
        var noticeCallback = function (notice) {
            // @ts-ignore  DOES NOT HAVE THE CORRECT TYPE! LACKS of activeQuery
            if (q._internalClient.activeQuery == q._query) {
                callbackNoticeConsumer(notice);
            }
        };
        // @ts-ignore .on('notice') DOES NOT HAVE THE CORRECT TYPE!
        this._internalClient.on('notice', noticeCallback);
        var removeNoticeCallback = function removeNoticeCallback() {
            q._internalClient.removeListener('notice', noticeCallback);
        };
        this._query.on('end', removeNoticeCallback);
        this._query.on('error', removeNoticeCallback);
        return this;
    }
    ;
    _execute(adapterCallback, callbackForEachRow) {
        var q = this;
        return new Promise(function (resolve, reject) {
            var pendingRows = 0;
            var endMark = null;
            q._query.on('error', function (err) {
                reject(err);
            });
            // @ts-ignore .on('row') DOES NOT HAVE THE CORRECT TYPE!
            q._query.on('row', async function (row, result) {
                if (callbackForEachRow) {
                    pendingRows++;
                    if (exports.log) {
                        exports.log('-- ' + JSON.stringify(row), 'ROW');
                    }
                    await callbackForEachRow(row, result);
                    --pendingRows;
                    whenEnd();
                }
                else {
                    // @ts-ignore addRow ommited DOES NOT HAVE THE CORRECT TYPE!
                    result.addRow(row);
                }
            });
            function whenEnd() {
                if (endMark && !pendingRows) {
                    if (adapterCallback) {
                        adapterCallback(endMark.result, resolve, reject);
                    }
                    else {
                        resolve();
                    }
                }
            }
            q._query.on('end', function (result) {
                // TODO: VER SI ESTO ES NECESARIO
                // result.client = q.client;
                if (exports.log) {
                    exports.log('-- ' + JSON.stringify(result.rows), 'RESULT');
                }
                endMark = { result };
                whenEnd();
            });
        }).catch(function (err) {
            throw logErrorIfNeeded(err);
        });
    }
    ;
    async fetchUniqueValue(errorMessage) {
        var { row, ...result } = await this.fetchUniqueRow();
        if (result.fields.length !== 1) {
            throw logErrorIfNeeded(new Error(obtains(errorMessage || exports.messages.queryExpectsOneFieldAnd1, result.fields.length)), '54U11!');
        }
        return { value: row[result.fields[0].name], ...result };
    }
    fetchUniqueRow(errorMessage, acceptNoRows) {
        return this._execute(function (result, resolve, reject) {
            if (result.rowCount !== 1 && (!acceptNoRows || !!result.rowCount)) {
                var err = new Error(obtains(errorMessage || exports.messages.queryExpectsOneRowAnd1, result.rowCount));
                //@ts-ignore err.code
                err.code = '54011!';
                reject(err);
            }
            else {
                var { rows, ...rest } = result;
                resolve({ row: rows[0], ...rest });
            }
        });
    }
    fetchOneRowIfExists(errorMessage) {
        return this.fetchUniqueRow(errorMessage, true);
    }
    fetchAll() {
        return this._execute(function (result, resolve, _reject) {
            resolve(result);
        });
    }
    execute() {
        return this._execute(function (result, resolve, _reject) {
            var { rows, oid, fields, ...rest } = result;
            resolve(rest);
        });
    }
    async fetchRowByRow(cb) {
        if (!(cb instanceof Function)) {
            var err = new Error(exports.messages.fetchRowByRowMustReceiveCallback);
            // @ts-ignore EXTENDED ERROR
            err.code = '39004!';
            return Promise.reject(err);
        }
        await this._execute(null, cb);
    }
    async onRow(cb) {
        return this.fetchRowByRow(cb);
    }
    then() {
        throw new Error(exports.messages.queryMustNotBeThened);
    }
    catch() {
        throw new Error(exports.messages.queryMustNotBeCatched);
    }
}
;
exports.allTypes = false;
function setAllTypes() {
    var TypeStore = require('type-store');
    var DATE_OID = 1082;
    pgTypes.setTypeParser(DATE_OID, function parseDate(val) {
        return bestGlobals.date.iso(val);
    });
    likeAr(TypeStore.type).forEach(function (_typeDef, typeName) {
        var typer = new TypeStore.type[typeName]();
        if (typer.pgSpecialParse) {
            (typer.pg_OIDS || [typer.pg_OID]).forEach(function (OID) {
                pgTypes.setTypeParser(OID, function (val) {
                    return typer.fromString(val);
                });
            });
        }
    });
}
exports.setAllTypes = setAllTypes;
;
var pools = {};
function connect(connectParameters) {
    if (exports.allTypes) {
        setAllTypes();
    }
    return new Promise(function (resolve, reject) {
        var idConnectParameters = JSON.stringify(connectParameters);
        var pool = pools[idConnectParameters] || new pg.Pool(connectParameters);
        pools[idConnectParameters] = pool;
        pool.connect(function (err, client, done) {
            if (err) {
                reject(err);
            }
            else {
                resolve(new Client(null, client, done /*, DOING {
                    releaseTimeout: changing(pgPromiseStrict.defaults.releaseTimeout,connectParameters.releaseTimeout||{})
                }*/));
            }
        });
    });
}
exports.connect = connect;
;
exports.readyLog = Promise.resolve();
/* xxistanbul ignore next */
function logLastError(message, messageType) {
    if (messageType) {
        if (messageType == 'ERROR') {
            if (logLastError.inFileName) {
                var lines = ['PG-ERROR ' + message];
                /*jshint forin:false */
                for (var attr in logLastError.receivedMessages) {
                    lines.push("------- " + attr + ":\n" + logLastError.receivedMessages[attr]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
                exports.readyLog = exports.readyLog.then(_ => fs.writeFile(logLastError.inFileName, lines.join('\n')));
            }
            else {
                /*jshint forin:false */
                for (var attr2 in logLastError.receivedMessages) {
                    /* istanbul ignore next */
                    console.log(attr2, logLastError.receivedMessages[attr2]);
                }
                /*jshint forin:true */
                /*eslint guard-for-in: 0*/
            }
            logLastError.receivedMessages = {};
        }
        else {
            if (messageType == MESSAGES_SEPARATOR_TYPE) {
                logLastError.receivedMessages = {};
            }
            logLastError.receivedMessages[messageType] = message;
        }
    }
}
exports.logLastError = logLastError;
logLastError.inFileName = './local-sql-error.log';
logLastError.receivedMessages = {};
function poolBalanceControl() {
    var rta = [];
    if (typeof exports.debug.pool === "object") {
        likeAr(exports.debug.pool).forEach(function (pool) {
            if (pool.count) {
                rta.push(exports.messages.unbalancedConnection + ' ' + util.inspect(pool));
            }
        });
    }
    return rta.join('\n');
}
exports.poolBalanceControl = poolBalanceControl;
;
/* istanbul ignore next */
process.on('exit', function () {
    console.warn(poolBalanceControl());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7QUFFYiwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFFekIscURBQWlEO0FBQ2pELDZCQUE2QjtBQUM3QixrQ0FBa0M7QUFDbEMsNENBQTRDO0FBQzVDLG1DQUF5QztBQUV6QyxNQUFNLHVCQUF1QixHQUFDLFFBQVEsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFDLHlCQUF5QixDQUFDO0FBRXhDLFFBQUEsUUFBUSxHQUFHO0lBQ2xCLGlDQUFpQyxFQUFDLDBEQUEwRDtJQUM1RiwrQkFBK0IsRUFBQyx3REFBd0Q7SUFDeEYsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4RyxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsaUNBQWlDLEVBQUMsaUVBQWlFO0lBQ25HLDRDQUE0QyxFQUFDLGtFQUFrRTtJQUMvRyxnQ0FBZ0MsRUFBQyxrRUFBa0U7SUFDbkcsc0NBQXNDLEVBQUMsMENBQTBDO0lBQ2pGLFVBQVUsRUFBQyxhQUFhO0lBQ3hCLFlBQVksRUFBQywyQ0FBMkM7SUFDeEQsNEJBQTRCLEVBQUMsc0RBQXNEO0lBQ25GLHdCQUF3QixFQUFDLGtEQUFrRDtJQUMzRSxrQkFBa0IsRUFBQyxzQkFBc0I7SUFDekMsUUFBUSxFQUFDLFlBQVk7SUFDckIsV0FBVyxFQUFDLGNBQWM7SUFDMUIsd0JBQXdCLEVBQUMsZ0NBQWdDO0lBQ3pELHNCQUFzQixFQUFDLDhCQUE4QjtJQUNyRCxxQkFBcUIsRUFBQywwREFBMEQ7SUFDaEYsb0JBQW9CLEVBQUMseURBQXlEO0lBQzlFLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxvQkFBb0IsRUFBQyxrREFB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bEQsWUFBWSxDQUFDLGdCQUFnQixHQUFDLEVBRTdCLENBQUM7QUFFRixTQUFnQixrQkFBa0I7SUFDOUIsSUFBSSxHQUFHLEdBQVUsRUFBRSxDQUFDO0lBQ3BCLElBQUcsT0FBTyxhQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBQztRQUM5QixNQUFNLENBQUMsYUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLElBQUk7WUFDcEMsSUFBRyxJQUFJLENBQUMsS0FBSyxFQUFDO2dCQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQVEsQ0FBQyxvQkFBb0IsR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ2xFO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDTjtJQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBVkQsZ0RBVUM7QUFBQSxDQUFDO0FBRUYsMEJBQTBCO0FBQzFCLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xyXG5jb25zdCBwZ1R5cGVzID0gcGcudHlwZXM7XHJcblxyXG5pbXBvcnQge2Zyb20gYXMgY29weUZyb219IGZyb20gJ3BnLWNvcHktc3RyZWFtcyc7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XHJcbmltcG9ydCAqIGFzIGxpa2VBciBmcm9tICdsaWtlLWFyJztcclxuaW1wb3J0ICogYXMgYmVzdEdsb2JhbHMgZnJvbSAnYmVzdC1nbG9iYWxzJztcclxuaW1wb3J0IHtTdHJlYW0sIFRyYW5zZm9ybX0gZnJvbSAnc3RyZWFtJztcclxuXHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFPSctLS0tLS0nO1xyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1I9Jy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJztcclxuXHJcbmV4cG9ydCB2YXIgbWVzc2FnZXMgPSB7XHJcbiAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGJ1bGtJbnNlcnQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gY29weUZyb20gb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU2VudGVuY2VzIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNxbFNjcmlwdCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQgYWxyZWFkeSBkb25lXCIsXHJcbiAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJjbGllbnQuY29ubmVjdCBtdXN0IG5vIHJlY2VpdmUgcGFyYW1ldGVycywgaXQgcmV0dXJucyBhIFByb21pc2VcIixcclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBmdW5jIGlzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IG11c3QgcmVjZWl2ZSBhIGNhbGxiYWNrIHRoYXQgZXhlY3V0ZXMgZm9yIGVhY2ggcm93XCIsXHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wIGVycm9yIHBhcnNpbmdcIixcclxuICAgIGluc2FuZU5hbWU6XCJpbnNhbmUgbmFtZVwiLFxyXG4gICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGxhY2sgb2YgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgY29ubmVjdCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgZW5kIGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcIm51bGwgaW4gcXVvdGVMaXRlcmFsXCIsXHJcbiAgICBvYnRhaW5zMTpcIm9idGFpbnMgJDFcIixcclxuICAgIG9idGFpbnNOb25lOlwib2J0YWlucyBub25lXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSBmaWVsZCBhbmQgJDFcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSByb3cgYW5kICQxXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgY2F0Y2hlZFwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgdGhlbmVkXCIsXHJcbiAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBxdWVyeSBub3QgY29ubmVjdGVkXCIsXHJcbiAgICB1bmJhbGFuY2VkQ29ubmVjdGlvbjpcInBnUHJvbWlzZVN0cmljdC5kZWJ1Zy5wb29sIHVuYmFsYW5jZWQgY29ubmVjdGlvblwiLFxyXG59XHJcblxyXG5leHBvcnQgdmFyIGkxOG46e1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOnR5cGVvZiBtZXNzYWdlcyxcclxuICAgICAgICBbazpzdHJpbmddOlBhcnRpYWw8dHlwZW9mIG1lc3NhZ2VzPlxyXG4gICAgfVxyXG59ID0ge1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOm1lc3NhZ2VzLFxyXG4gICAgICAgIGVzOntcclxuICAgICAgICAgICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgYnVsa0luc2VydCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgY29weUZyb20gZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNlbnRlbmNlcyBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU3FsU2NyaXB0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGVsIGNsaWVudGUgeWEgZnVlIHRlcm1pbmFkb1wiLFxyXG4gICAgICAgICAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50LmNvbm5lY3Qgbm8gZGViZSByZWNpYmlyIHBhcmFtZXRldHJvcywgZGV2dWVsdmUgdW5hIFByb21lc2FcIixcclxuICAgICAgICAgICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGVzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgICAgICAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgZGViZSByZWNpYmlyIHVuYSBmdW5jaW9uIGNhbGxiYWNrIHBhcmEgZWplY3V0YXIgZW4gY2FkYSByZWdpc3Ryb1wiLFxyXG4gICAgICAgICAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImVycm9yIGFsIHBhcnNlYXIgZW4gZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBcIixcclxuICAgICAgICAgICAgaW5zYW5lTmFtZTpcIm5vbWJyZSBpbnZhbGlkbyBwYXJhIG9iamV0byBzcWwsIGRlYmUgc2VyIHNvbG8gbGV0cmFzLCBudW1lcm9zIG8gcmF5YXMgZW1wZXphbmRvIHBvciB1bmEgbGV0cmFcIixcclxuICAgICAgICAgICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGZhbHRhIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTm8gc2UgcHVlZGUgY29uZWN0YXIgdW4gJ0NsaWVudCcgZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBubyBkZWJlIHRlcm1pbmFyIGVsIGNsaWVudCBkZXNkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibGEgZnVuY2lvbiBxdW90ZUxpdGVyYWwgbm8gZGViZSByZWNpYmlyIG51bGxcIixcclxuICAgICAgICAgICAgb2J0YWluczE6XCJzZSBvYnR1dmllcm9uICQxXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnNOb25lOlwibm8gc2Ugb2J0dXZvIG5pbmd1bm9cIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biBzb2xvIHZhbG9yIChjb2x1bW5hIG8gY2FtcG8pIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gcmVnaXN0cm8geSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIGNhdGNoXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyB0aGVuXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6ICdxdWVyeScgbm8gY29uZWN0YWRhXCIsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0TGFuZyhsYW5nOnN0cmluZyl7XHJcbiAgICBpZihsYW5nIGluIGkxOG4ubWVzc2FnZXMpe1xyXG4gICAgICAgIG1lc3NhZ2VzID0gey4uLmkxOG4ubWVzc2FnZXMuZW4sIC4uLmkxOG4ubWVzc2FnZXNbbGFuZ119O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIGRlYnVnOntcclxuICAgIHBvb2w/OnRydWV8e1xyXG4gICAgICAgIFtrZXk6c3RyaW5nXTp7IGNvdW50Om51bWJlciwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fVxyXG4gICAgfVxyXG59PXt9O1xyXG5cclxuZXhwb3J0IHZhciBkZWZhdWx0cz17XHJcbiAgICByZWxlYXNlVGltZW91dDp7aW5hY3RpdmU6NjAwMDAsIGNvbm5lY3Rpb246NjAwMDAwfVxyXG59O1xyXG5cclxuLyogaW5zdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBub0xvZyhfbWVzc2FnZTpzdHJpbmcsIF90eXBlOnN0cmluZyl7fVxyXG5cclxuZXhwb3J0IHZhciBsb2c6KG1lc3NhZ2U6c3RyaW5nLCB0eXBlOnN0cmluZyk9PnZvaWQ9bm9Mb2c7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudChuYW1lOnN0cmluZyl7XHJcbiAgICBpZih0eXBlb2YgbmFtZSE9PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5pbnNhbmVOYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiAnXCInK25hbWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnRMaXN0KG9iamVjdE5hbWVzOnN0cmluZ1tdKXtcclxuICAgIHJldHVybiBvYmplY3ROYW1lcy5tYXAoZnVuY3Rpb24ob2JqZWN0TmFtZSl7IHJldHVybiBxdW90ZUlkZW50KG9iamVjdE5hbWUpOyB9KS5qb2luKCcsJyk7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbnlRdW90ZWFibGUgPSBzdHJpbmd8bnVtYmVyfERhdGV8e2lzUmVhbERhdGU6Ym9vbGVhbiwgdG9ZbWQ6KCk9PnN0cmluZ318e3RvUG9zdGdyZXM6KCk9PnN0cmluZ318e3RvU3RyaW5nOigpPT5zdHJpbmd9O1xyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZTpudWxsfEFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuICdudWxsJztcclxuICAgIH1cclxuICAgIHZhciB0ZXh0OnN0cmluZ1xyXG4gICAgaWYodHlwZW9mIGFueVZhbHVlPT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlO1xyXG4gICAgfWVsc2UgaWYoIShhbnlWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkpe1xyXG4gICAgICAgIHRleHQ9YW55VmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCdpc1JlYWxEYXRlJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS5pc1JlYWxEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9ZbWQoKTtcclxuICAgIH1lbHNlIGlmKGFueVZhbHVlIGluc3RhbmNlb2YgRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZigndG9Qb3N0Z3JlcycgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUudG9Qb3N0Z3JlcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9Qb3N0Z3JlcygpO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KGFueVZhbHVlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBcIidcIit0ZXh0LnJlcGxhY2UoLycvZyxcIicnXCIpK1wiJ1wiO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTGl0ZXJhbChhbnlWYWx1ZTpBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5udWxsSW5RdW90ZUxpdGVyYWwpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHF1b3RlTnVsbGFibGUoYW55VmFsdWUpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcpe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX2FnZyh0b19qc29uYihqLiopIE9SREVSIEJZICR7b3JkZXJieX0pIGZyb20gKCR7c3FsfSkgYXMgaiksJ1tdJzo6anNvbmIpYDtcclxuICAgIC8vIHJldHVybiBgKFNFTEVDVCBjb2FsZXNjZShqc29uYl9hZ2codG9fanNvbmIoai4qKSBPUkRFUiBCWSAke29yZGVyYnl9KSwnW10nOjpqc29uYikgZnJvbSAoJHtzcWx9KSBhcyBqKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcpe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX29iamVjdF9hZ2coJHtpbmRleGVkYnl9LHRvX2pzb25iKGouKikpIGZyb20gKCR7c3FsfSkgYXMgaiksJ3t9Jzo6anNvbmIpYFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRQYXJhbWV0ZXJUeXBlcyhwYXJhbWV0ZXJzPzphbnlbXSl7XHJcbiAgICAvLyBAdHMtaWdub3JlIFxyXG4gICAgaWYocGFyYW1ldGVycz09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1ldGVycy5tYXAoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIGlmKHZhbHVlICYmIHZhbHVlLnR5cGVTdG9yZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xpdGVyYWwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGVhc3k6Ym9vbGVhbj10cnVlOyAvLyBkZXByZWNhdGVkIVxyXG5cclxuZXhwb3J0IHR5cGUgQ29ubmVjdFBhcmFtcz17XHJcbiAgICBtb3Rvcj86XCJwb3N0Z3Jlc1wiXHJcbiAgICBkYXRhYmFzZT86c3RyaW5nXHJcbiAgICB1c2VyPzpzdHJpbmdcclxuICAgIHBhc3N3b3JkPzpzdHJpbmdcclxuICAgIHBvcnQ/Om51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNDb21tb249e3RhYmxlOnN0cmluZyxjb2x1bW5zPzpzdHJpbmdbXSxkb25lPzooZXJyPzpFcnJvcik9PnZvaWQsIHdpdGg/OnN0cmluZ31cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzRmlsZT17aW5TdHJlYW0/OnVuZGVmaW5lZCwgZmlsZW5hbWU6c3RyaW5nfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzU3RyZWFtPXtpblN0cmVhbTpTdHJlYW0sZmlsZW5hbWU/OnVuZGVmaW5lZH0mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0cz1Db3B5RnJvbU9wdHNGaWxlfENvcHlGcm9tT3B0c1N0cmVhbVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOmFueVtdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzphbnlbXSk9PlByb21pc2U8dm9pZD59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnQgPSB0aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBjbGllbnQuY29ubmVjdChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlbGYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBlbmQoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RFbmRDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlOb3RDb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgcXVlcnlBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBxdWVyeVRleHQ7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VmFsdWVzPW51bGw7XHJcbiAgICAgICAgaWYodHlwZW9mIHF1ZXJ5QXJndW1lbnRzWzBdID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IHF1ZXJ5QXJndW1lbnRzWzFdID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1sxXXx8bnVsbCk7XHJcbiAgICAgICAgfWVsc2UgaWYocXVlcnlBcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBPYmplY3Qpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXS50ZXh0O1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMF0udmFsdWVzfHxudWxsKTtcclxuICAgICAgICAgICAgcXVlcnlBcmd1bWVudHNbMF0udmFsdWVzID0gcXVlcnlWYWx1ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgIHZhciBzcWw9cXVlcnlUZXh0O1xyXG4gICAgICAgICAgICBsb2coTUVTU0FHRVNfU0VQQVJBVE9SLCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRSk7XHJcbiAgICAgICAgICAgIGlmKHF1ZXJ5VmFsdWVzICYmIHF1ZXJ5VmFsdWVzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBsb2coJ2AnK3NxbCsnXFxuYCcsJ1FVRVJZLVAnKTtcclxuICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShxdWVyeVZhbHVlcyksJ1FVRVJZLUEnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWU6YW55LCBpOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3FsPXNxbC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwkJysoaSsxKSsnXFxcXGInKSwgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzOnN0cmluZ1tdKXtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaV9yb3dzPTA7XHJcbiAgICAgICAgd2hpbGUoaV9yb3dzPHBhcmFtcy5yb3dzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCk7XHJcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBhcmFtcy5vbmVycm9yKGVyciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaV9yb3dzKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21QYXJzZVBhcmFtcyhvcHRzOkNvcHlGcm9tT3B0cyl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZnJvbSA9IG9wdHMuaW5TdHJlYW0gPyAnU1RESU4nIDogcXVvdGVMaXRlcmFsKG9wdHMuZmlsZW5hbWUpO1xyXG4gICAgICAgIHZhciBzcWwgPSBgQ09QWSAke29wdHMudGFibGV9ICR7b3B0cy5jb2x1bW5zP2AoJHtvcHRzLmNvbHVtbnMubWFwKG5hbWU9PnF1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywnKX0pYDonJ30gRlJPTSAke2Zyb219ICR7b3B0cy53aXRoPydXSVRIICcrb3B0cy53aXRoOicnfWA7XHJcbiAgICAgICAgcmV0dXJuIHtzcWwsIF9jbGllbnQ6dGhpcy5fY2xpZW50fTtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvcHlGcm9tRmlsZShvcHRzOkNvcHlGcm9tT3B0c0ZpbGUpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57XHJcbiAgICAgICAgdmFyIHtzcWx9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KHNxbCkuZXhlY3V0ZSgpO1xyXG4gICAgfVxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIge3NxbCwgX2NsaWVudH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgdmFyIHN0cmVhbSA9IF9jbGllbnQucXVlcnkoY29weUZyb20oc3FsKSk7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlbmQnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Nsb3NlJywgb3B0cy5kb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgcG9yIGxhIHJlZ2V4cCBlcyBpbXBvc2libGUgcXVlIHBhc2UgYWwgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzKSByZXR1cm4gJ1xcXFxcXFxcJztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBFc3RvIGVzIGltcG9zaWJsZSBxdWUgc3VjZWRhICovXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tQXJyYXlTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHNTdHJlYW0pe1xyXG4gICAgICAgIHZhciBjID0gdGhpcztcclxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSh7XHJcbiAgICAgICAgICAgIHdyaXRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICByZWFkYWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgdHJhbnNmb3JtKGFycmF5Q2h1bms6YW55W10sIF9lbmNvZGluZywgbmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goYXJyYXlDaHVuay5tYXAoeD0+Yy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCh4KSkuam9pbignXFx0JykrJ1xcbicpXHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZsdXNoKG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKCdcXFxcLlxcbicpO1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIHtpblN0cmVhbSwgLi4ucmVzdH0gPSBvcHRzO1xyXG4gICAgICAgIGluU3RyZWFtLnBpcGUodHJhbnNmb3JtKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW0oe2luU3RyZWFtOnRyYW5zZm9ybSwgLi4ucmVzdH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBxdWVyeVJlc3VsdDpwZy5RdWVyeVJlc3VsdDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0e1xyXG4gICAgcm93Q291bnQ6bnVtYmVyXHJcbiAgICBmaWVsZHM6dHlwZW9mIHF1ZXJ5UmVzdWx0LmZpZWxkc1xyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Q29tbWFuZHtcclxuICAgIGNvbW1hbmQ6c3RyaW5nLCByb3dDb3VudDpudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvdyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdzp7W2tleTpzdHJpbmddOmFueX1cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvd0lmRXhpc3RzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Pzp7W2tleTpzdHJpbmddOmFueX18bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Um93cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvd3M6e1trZXk6c3RyaW5nXTphbnl9W11cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFZhbHVlIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgdmFsdWU6YW55XHJcbn1cclxuLy8gZXhwb3J0IGludGVyZmFjZSBSZXN1bHRHZW5lcmljIGV4dGVuZHMgUmVzdWx0VmFsdWUsIFJlc3VsdFJvd3MsIFJlc3VsdE9uZVJvd0lmRXhpc3RzLCBSZXN1bHRPbmVSb3csIFJlc3VsdHt9XHJcbmV4cG9ydCB0eXBlIFJlc3VsdEdlbmVyaWMgPSBSZXN1bHRWYWx1ZXxSZXN1bHRSb3dzfFJlc3VsdE9uZVJvd0lmRXhpc3RzfFJlc3VsdE9uZVJvd3xSZXN1bHR8UmVzdWx0Q29tbWFuZFxyXG5cclxuLypcclxuZnVuY3Rpb24gYnVpbGRRdWVyeUNvdW50ZXJBZGFwdGVyKFxyXG4gICAgbWluQ291bnRSb3c6bnVtYmVyLCBcclxuICAgIG1heENvdW50Um93Om51bWJlciwgXHJcbiAgICBleHBlY3RUZXh0OnN0cmluZywgXHJcbiAgICBjYWxsYmFja090aGVyQ29udHJvbD86KHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkXHJcbil7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcXVlcnlDb3VudGVyQWRhcHRlcihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKXsgXHJcbiAgICAgICAgaWYocmVzdWx0LnJvd3MubGVuZ3RoPG1pbkNvdW50Um93IHx8IHJlc3VsdC5yb3dzLmxlbmd0aD5tYXhDb3VudFJvdyApe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyAnK2V4cGVjdFRleHQrJyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dzLmxlbmd0aCsnIHJvd3MnKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKGNhbGxiYWNrT3RoZXJDb250cm9sKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrT3RoZXJDb250cm9sKHJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLm90aGVyfSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5vdGhlcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4qL1xyXG5cclxudHlwZSBOb3RpY2UgPSBzdHJpbmc7XHJcblxyXG5mdW5jdGlvbiBsb2dFcnJvcklmTmVlZGVkPFQ+KGVycjpFcnJvciwgY29kZT86VCk6RXJyb3J7XHJcbiAgICBpZihjb2RlICE9IG51bGwpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBlcnIuY29kZT1jb2RlO1xyXG4gICAgfVxyXG4gICAgaWYobG9nKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgbG9nKCctLUVSUk9SISAnK2Vyci5jb2RlKycsICcrZXJyLm1lc3NhZ2UsICdFUlJPUicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVycjtcclxufVxyXG5cclxuZnVuY3Rpb24gb2J0YWlucyhtZXNzYWdlOnN0cmluZywgY291bnQ6bnVtYmVyKTpzdHJpbmd7XHJcbiAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKCckMScsXHJcbiAgICAgICAgY291bnQ/bWVzc2FnZXMub2J0YWluczEucmVwbGFjZSgnJDEnLGNvdW50LnRvU3RyaW5nKCkpOm1lc3NhZ2VzLm9idGFpbnNOb25lXHJcbiAgICApO1xyXG59IFxyXG5cclxuXHJcbmNsYXNzIFF1ZXJ5e1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfcXVlcnk6cGcuUXVlcnksIHB1YmxpYyBjbGllbnQ6Q2xpZW50LCBwcml2YXRlIF9pbnRlcm5hbENsaWVudDpwZy5DbGllbnR8cGcuUG9vbENsaWVudCl7XHJcbiAgICB9XHJcbiAgICBvbk5vdGljZShjYWxsYmFja05vdGljZUNvbnN1bWVyOihub3RpY2U6Tm90aWNlKT0+dm9pZCk6UXVlcnl7XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub3RpY2VDYWxsYmFjaz1mdW5jdGlvbihub3RpY2U6Tm90aWNlKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFISBMQUNLUyBvZiBhY3RpdmVRdWVyeVxyXG4gICAgICAgICAgICBpZihxLl9pbnRlcm5hbENsaWVudC5hY3RpdmVRdWVyeT09cS5fcXVlcnkpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tOb3RpY2VDb25zdW1lcihub3RpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdub3RpY2UnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgdGhpcy5faW50ZXJuYWxDbGllbnQub24oJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHZhciByZW1vdmVOb3RpY2VDYWxsYmFjaz1mdW5jdGlvbiByZW1vdmVOb3RpY2VDYWxsYmFjaygpe1xyXG4gICAgICAgICAgICBxLl9pbnRlcm5hbENsaWVudC5yZW1vdmVMaXN0ZW5lcignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlbmQnLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZXJyb3InLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBwcml2YXRlIF9leGVjdXRlPFRSIGV4dGVuZHMgUmVzdWx0R2VuZXJpYz4oXHJcbiAgICAgICAgYWRhcHRlckNhbGxiYWNrOm51bGx8KChyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpUUik9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWQpLFxyXG4gICAgICAgIGNhbGxiYWNrRm9yRWFjaFJvdz86KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPiwgXHJcbiAgICApOlByb21pc2U8VFI+e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VFI+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBwZW5kaW5nUm93cz0wO1xyXG4gICAgICAgICAgICB2YXIgZW5kTWFyazpudWxsfHtyZXN1bHQ6cGcuUXVlcnlSZXN1bHR9PW51bGw7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlcnJvcicsZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ3JvdycpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ3JvdycsYXN5bmMgZnVuY3Rpb24ocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tGb3JFYWNoUm93KXtcclxuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nUm93cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyb3cpLCAnUk9XJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGNhbGxiYWNrRm9yRWFjaFJvdyhyb3csIHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLS1wZW5kaW5nUm93cztcclxuICAgICAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIGFkZFJvdyBvbW1pdGVkIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuYWRkUm93KHJvdyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiB3aGVuRW5kKCl7XHJcbiAgICAgICAgICAgICAgICBpZihlbmRNYXJrICYmICFwZW5kaW5nUm93cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYWRhcHRlckNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRhcHRlckNhbGxiYWNrKGVuZE1hcmsucmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIGlmKGFsbFR5cGVzKXtcclxuICAgICAgICBzZXRBbGxUeXBlcygpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgdmFyIGlkQ29ubmVjdFBhcmFtZXRlcnMgPSBKU09OLnN0cmluZ2lmeShjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgdmFyIHBvb2wgPSBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXXx8bmV3IHBnLlBvb2woY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdID0gcG9vbDtcclxuICAgICAgICBwb29sLmNvbm5lY3QoZnVuY3Rpb24oZXJyLCBjbGllbnQsIGRvbmUpe1xyXG4gICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShuZXcgQ2xpZW50KG51bGwsIGNsaWVudCwgZG9uZSAvKiwgRE9JTkcge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VUaW1lb3V0OiBjaGFuZ2luZyhwZ1Byb21pc2VTdHJpY3QuZGVmYXVsdHMucmVsZWFzZVRpbWVvdXQsY29ubmVjdFBhcmFtZXRlcnMucmVsZWFzZVRpbWVvdXR8fHt9KVxyXG4gICAgICAgICAgICAgICAgfSovKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciByZWFkeUxvZyA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuLyogeHhpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nTGFzdEVycm9yKG1lc3NhZ2U6c3RyaW5nLCBtZXNzYWdlVHlwZTpzdHJpbmcpOnZvaWR7XHJcbiAgICBpZihtZXNzYWdlVHlwZSl7XHJcbiAgICAgICAgaWYobWVzc2FnZVR5cGU9PSdFUlJPUicpe1xyXG4gICAgICAgICAgICBpZihsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbGluZXM9WydQRy1FUlJPUiAnK21lc3NhZ2VdO1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0ciBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZXMucHVzaChcIi0tLS0tLS0gXCIrYXR0citcIjpcXG5cIitsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICAgICAgcmVhZHlMb2cgPSByZWFkeUxvZy50aGVuKF89PmZzLndyaXRlRmlsZShsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSxsaW5lcy5qb2luKCdcXG4nKSkpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihtZXNzYWdlVHlwZT09TUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpe1xyXG4gICAgICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaChtZXNzYWdlcy51bmJhbGFuY2VkQ29ubmVjdGlvbisnICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbnByb2Nlc3Mub24oJ2V4aXQnLGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG59KTtcclxuIl19