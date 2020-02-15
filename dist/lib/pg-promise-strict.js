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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7QUFFYiwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFFekIscURBQWlEO0FBQ2pELDZCQUE2QjtBQUM3QixrQ0FBa0M7QUFDbEMsNENBQTRDO0FBQzVDLG1DQUF5QztBQUV6QyxNQUFNLHVCQUF1QixHQUFDLFFBQVEsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFDLHlCQUF5QixDQUFDO0FBRXhDLFFBQUEsUUFBUSxHQUFHO0lBQ2xCLGlDQUFpQyxFQUFDLDBEQUEwRDtJQUM1RiwrQkFBK0IsRUFBQyx3REFBd0Q7SUFDeEYsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4RyxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsaUNBQWlDLEVBQUMsaUVBQWlFO0lBQ25HLDRDQUE0QyxFQUFDLGtFQUFrRTtJQUMvRyxnQ0FBZ0MsRUFBQyxrRUFBa0U7SUFDbkcsc0NBQXNDLEVBQUMsMENBQTBDO0lBQ2pGLFVBQVUsRUFBQyxhQUFhO0lBQ3hCLFlBQVksRUFBQywyQ0FBMkM7SUFDeEQsNEJBQTRCLEVBQUMsc0RBQXNEO0lBQ25GLHdCQUF3QixFQUFDLGtEQUFrRDtJQUMzRSxrQkFBa0IsRUFBQyxzQkFBc0I7SUFDekMsUUFBUSxFQUFDLFlBQVk7SUFDckIsV0FBVyxFQUFDLGNBQWM7SUFDMUIsd0JBQXdCLEVBQUMsZ0NBQWdDO0lBQ3pELHNCQUFzQixFQUFDLDhCQUE4QjtJQUNyRCxxQkFBcUIsRUFBQywwREFBMEQ7SUFDaEYsb0JBQW9CLEVBQUMseURBQXlEO0lBQzlFLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxvQkFBb0IsRUFBQyxrREFB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O2dCQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQVEsQ0FBQyxvQkFBb0IsR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ2xFO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDTjtJQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBVkQsZ0RBVUM7QUFBQSxDQUFDO0FBRUYsMEJBQTBCO0FBQzFCLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xyXG5jb25zdCBwZ1R5cGVzID0gcGcudHlwZXM7XHJcblxyXG5pbXBvcnQge2Zyb20gYXMgY29weUZyb219IGZyb20gJ3BnLWNvcHktc3RyZWFtcyc7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XHJcbmltcG9ydCAqIGFzIGxpa2VBciBmcm9tICdsaWtlLWFyJztcclxuaW1wb3J0ICogYXMgYmVzdEdsb2JhbHMgZnJvbSAnYmVzdC1nbG9iYWxzJztcclxuaW1wb3J0IHtTdHJlYW0sIFRyYW5zZm9ybX0gZnJvbSAnc3RyZWFtJztcclxuXHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFPSctLS0tLS0nO1xyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1I9Jy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJztcclxuXHJcbmV4cG9ydCB2YXIgbWVzc2FnZXMgPSB7XHJcbiAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGJ1bGtJbnNlcnQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gY29weUZyb20gb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU2VudGVuY2VzIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNxbFNjcmlwdCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQgYWxyZWFkeSBkb25lXCIsXHJcbiAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJjbGllbnQuY29ubmVjdCBtdXN0IG5vIHJlY2VpdmUgcGFyYW1ldGVycywgaXQgcmV0dXJucyBhIFByb21pc2VcIixcclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBmdW5jIGlzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IG11c3QgcmVjZWl2ZSBhIGNhbGxiYWNrIHRoYXQgZXhlY3V0ZXMgZm9yIGVhY2ggcm93XCIsXHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wIGVycm9yIHBhcnNpbmdcIixcclxuICAgIGluc2FuZU5hbWU6XCJpbnNhbmUgbmFtZVwiLFxyXG4gICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGxhY2sgb2YgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgY29ubmVjdCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgZW5kIGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcIm51bGwgaW4gcXVvdGVMaXRlcmFsXCIsXHJcbiAgICBvYnRhaW5zMTpcIm9idGFpbnMgJDFcIixcclxuICAgIG9idGFpbnNOb25lOlwib2J0YWlucyBub25lXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSBmaWVsZCBhbmQgJDFcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSByb3cgYW5kICQxXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgY2F0Y2hlZFwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgdGhlbmVkXCIsXHJcbiAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBxdWVyeSBub3QgY29ubmVjdGVkXCIsXHJcbiAgICB1bmJhbGFuY2VkQ29ubmVjdGlvbjpcInBnUHJvbWlzZVN0cmljdC5kZWJ1Zy5wb29sIHVuYmFsYW5jZWQgY29ubmVjdGlvblwiLFxyXG59XHJcblxyXG5leHBvcnQgdmFyIGkxOG46e1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOnR5cGVvZiBtZXNzYWdlcyxcclxuICAgICAgICBbazpzdHJpbmddOlBhcnRpYWw8dHlwZW9mIG1lc3NhZ2VzPlxyXG4gICAgfVxyXG59ID0ge1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOm1lc3NhZ2VzLFxyXG4gICAgICAgIGVzOntcclxuICAgICAgICAgICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgYnVsa0luc2VydCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgY29weUZyb20gZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNlbnRlbmNlcyBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU3FsU2NyaXB0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGVsIGNsaWVudGUgeWEgZnVlIHRlcm1pbmFkb1wiLFxyXG4gICAgICAgICAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50LmNvbm5lY3Qgbm8gZGViZSByZWNpYmlyIHBhcmFtZXRldHJvcywgZGV2dWVsdmUgdW5hIFByb21lc2FcIixcclxuICAgICAgICAgICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGVzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgICAgICAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgZGViZSByZWNpYmlyIHVuYSBmdW5jaW9uIGNhbGxiYWNrIHBhcmEgZWplY3V0YXIgZW4gY2FkYSByZWdpc3Ryb1wiLFxyXG4gICAgICAgICAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImVycm9yIGFsIHBhcnNlYXIgZW4gZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBcIixcclxuICAgICAgICAgICAgaW5zYW5lTmFtZTpcIm5vbWJyZSBpbnZhbGlkbyBwYXJhIG9iamV0byBzcWwsIGRlYmUgc2VyIHNvbG8gbGV0cmFzLCBudW1lcm9zIG8gcmF5YXMgZW1wZXphbmRvIHBvciB1bmEgbGV0cmFcIixcclxuICAgICAgICAgICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGZhbHRhIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTm8gc2UgcHVlZGUgY29uZWN0YXIgdW4gJ0NsaWVudCcgZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBubyBkZWJlIHRlcm1pbmFyIGVsIGNsaWVudCBkZXNkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibGEgZnVuY2lvbiBxdW90ZUxpdGVyYWwgbm8gZGViZSByZWNpYmlyIG51bGxcIixcclxuICAgICAgICAgICAgb2J0YWluczE6XCJzZSBvYnR1dmllcm9uICQxXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnNOb25lOlwibm8gc2Ugb2J0dXZvIG5pbmd1bm9cIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biBzb2xvIHZhbG9yIChjb2x1bW5hIG8gY2FtcG8pIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gcmVnaXN0cm8geSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIGNhdGNoXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyB0aGVuXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6ICdxdWVyeScgbm8gY29uZWN0YWRhXCIsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0TGFuZyhsYW5nOnN0cmluZyl7XHJcbiAgICBpZihsYW5nIGluIGkxOG4ubWVzc2FnZXMpe1xyXG4gICAgICAgIG1lc3NhZ2VzID0gey4uLmkxOG4ubWVzc2FnZXMuZW4sIC4uLmkxOG4ubWVzc2FnZXNbbGFuZ119O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIGRlYnVnOntcclxuICAgIHBvb2w/OnRydWV8e1xyXG4gICAgICAgIFtrZXk6c3RyaW5nXTp7IGNvdW50Om51bWJlciwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fVxyXG4gICAgfVxyXG59PXt9O1xyXG5cclxuZXhwb3J0IHZhciBkZWZhdWx0cz17XHJcbiAgICByZWxlYXNlVGltZW91dDp7aW5hY3RpdmU6NjAwMDAsIGNvbm5lY3Rpb246NjAwMDAwfVxyXG59O1xyXG5cclxuLyogaW5zdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBub0xvZyhfbWVzc2FnZTpzdHJpbmcsIF90eXBlOnN0cmluZyl7fVxyXG5cclxuZXhwb3J0IHZhciBsb2c6KG1lc3NhZ2U6c3RyaW5nLCB0eXBlOnN0cmluZyk9PnZvaWQ9bm9Mb2c7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudChuYW1lOnN0cmluZyl7XHJcbiAgICBpZih0eXBlb2YgbmFtZSE9PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5pbnNhbmVOYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiAnXCInK25hbWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnRMaXN0KG9iamVjdE5hbWVzOnN0cmluZ1tdKXtcclxuICAgIHJldHVybiBvYmplY3ROYW1lcy5tYXAoZnVuY3Rpb24ob2JqZWN0TmFtZSl7IHJldHVybiBxdW90ZUlkZW50KG9iamVjdE5hbWUpOyB9KS5qb2luKCcsJyk7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbnlRdW90ZWFibGUgPSBzdHJpbmd8bnVtYmVyfERhdGV8e2lzUmVhbERhdGU6Ym9vbGVhbiwgdG9ZbWQ6KCk9PnN0cmluZ318e3RvUG9zdGdyZXM6KCk9PnN0cmluZ318e3RvU3RyaW5nOigpPT5zdHJpbmd9O1xyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZTpudWxsfEFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuICdudWxsJztcclxuICAgIH1cclxuICAgIHZhciB0ZXh0OnN0cmluZ1xyXG4gICAgaWYodHlwZW9mIGFueVZhbHVlPT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlO1xyXG4gICAgfWVsc2UgaWYoIShhbnlWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkpe1xyXG4gICAgICAgIHRleHQ9YW55VmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCdpc1JlYWxEYXRlJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS5pc1JlYWxEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9ZbWQoKTtcclxuICAgIH1lbHNlIGlmKGFueVZhbHVlIGluc3RhbmNlb2YgRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZigndG9Qb3N0Z3JlcycgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUudG9Qb3N0Z3JlcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9Qb3N0Z3JlcygpO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KGFueVZhbHVlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBcIidcIit0ZXh0LnJlcGxhY2UoLycvZyxcIicnXCIpK1wiJ1wiO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTGl0ZXJhbChhbnlWYWx1ZTpBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5udWxsSW5RdW90ZUxpdGVyYWwpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHF1b3RlTnVsbGFibGUoYW55VmFsdWUpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzQ29tbW9uPXt0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkLCB3aXRoPzpzdHJpbmd9XHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0ZpbGU9e2luU3RyZWFtPzp1bmRlZmluZWQsIGZpbGVuYW1lOnN0cmluZ30mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c1N0cmVhbT17aW5TdHJlYW06U3RyZWFtLGZpbGVuYW1lPzp1bmRlZmluZWR9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHM9Q29weUZyb21PcHRzRmlsZXxDb3B5RnJvbU9wdHNTdHJlYW1cclxuZXhwb3J0IHR5cGUgQnVsa0luc2VydFBhcmFtcz17c2NoZW1hPzpzdHJpbmcsdGFibGU6c3RyaW5nLGNvbHVtbnM6c3RyaW5nW10scm93czphbnlbXVtdLCBvbmVycm9yPzooZXJyOkVycm9yLCByb3c6YW55W10pPT5Qcm9taXNlPHZvaWQ+fVxyXG5cclxuLyoqIFRPRE86IGFueSBlbiBvcHRzICovXHJcbmV4cG9ydCBjbGFzcyBDbGllbnR7XHJcbiAgICBwcml2YXRlIGNvbm5lY3RlZDpudWxsfHtcclxuICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm51bWJlcixcclxuICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpudW1iZXJcclxuICAgIH09bnVsbDtcclxuICAgIHByaXZhdGUgZnJvbVBvb2w6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHByaXZhdGUgcG9zdENvbm5lY3QoKXtcclxuICAgICAgICB2YXIgbm93VHM9bmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB7XHJcbiAgICAgICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bm93VHMsXHJcbiAgICAgICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm5vd1RzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBfY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fG51bGw7XHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpDb25uZWN0UGFyYW1zfG51bGwsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpLCBwcml2YXRlIF9kb25lOigpPT52b2lkLCBfb3B0cz86YW55KXtcclxuICAgICAgICB0aGlzLl9jbGllbnQgPSBjbGllbnQgYXMgKHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ307XHJcbiAgICAgICAgaWYoY29ubk9wdHM9PW51bGwpe1xyXG4gICAgICAgICAgICB0aGlzLmZyb21Qb29sPXRydWU7XHJcbiAgICAgICAgICAgIHRoaXMucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgLyogRE9JTkdcclxuICAgICAgICAgICAgaWYoc2VsZi5vcHRzLnRpbWVvdXRDb250cm9sbGVyKXtcclxuICAgICAgICAgICAgICAgIGNhbmNlbFRpbWVvdXQoc2VsZi50aW1lb3V0Q29udHJvbGxlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VsZi50aW1lb3V0Q29udHJvbGxlciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZihuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdE9wZXJhdGlvblRpbWVzdGFtcCAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmVcclxuICAgICAgICAgICAgICAgIHx8IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0Q29ubmVjdGlvblRpbWVzdGFtcCA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5jb25uZWN0aW9uXHJcbiAgICAgICAgICAgICAgICApe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LE1hdGgubWluKDEwMDAsc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlLzQpKTtcclxuICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaWYoZGVidWcucG9vbCl7XHJcbiAgICAgICAgICAgICAgICBpZihkZWJ1Zy5wb29sPT09dHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWcucG9vbD17fTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCEodGhpcy5fY2xpZW50LnNlY3JldEtleSBpbiBkZWJ1Zy5wb29sKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XSA9IHtjbGllbnQ6dGhpcy5fY2xpZW50LCBjb3VudDowfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0uY291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvLyBwZ1Byb21pc2VTdHJpY3QubG9nKCduZXcgQ2xpZW50Jyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudCA9IG5ldyBwZy5DbGllbnQoY29ubk9wdHMpIGFzIHBnLkNsaWVudCZ7c2VjcmV0S2V5OnN0cmluZ307XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgPSB0aGlzLl9jbGllbnQuc2VjcmV0S2V5fHwnc2VjcmV0XycrTWF0aC5yYW5kb20oKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25uZWN0KCl7XHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoKXtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50ID0gdGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgY2xpZW50LmNvbm5lY3QoZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZWxmKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgZW5kKCl7XHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHRoaXMuX2NsaWVudCBpbnN0YW5jZW9mIHBnLkNsaWVudCl7XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudC5lbmQoKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGRvbmUoKXtcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudEFscmVhZHlEb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZGVidWcucG9vbCl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgREVCVUdHSU5HXHJcbiAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0uY291bnQtLTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudFRvRG9uZT10aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50PW51bGw7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBhcmd1bWVudHMgQXJyYXkgbGlrZSBhbmQgYXBwbHlhYmxlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmUuYXBwbHkoY2xpZW50VG9Eb25lLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZyk6UXVlcnlcclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcsIHBhcmFtczphbnlbXSk6UXVlcnlcclxuICAgIHF1ZXJ5KHNxbE9iamVjdDp7dGV4dDpzdHJpbmcsIHZhbHVlczphbnlbXX0pOlF1ZXJ5XHJcbiAgICBxdWVyeSgpOlF1ZXJ5e1xyXG4gICAgICAgIGlmKCF0aGlzLmNvbm5lY3RlZCB8fCAhdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5Tm90Q29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbm5lY3RlZC5sYXN0T3BlcmF0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5QXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcXVlcnlUZXh0O1xyXG4gICAgICAgIHZhciBxdWVyeVZhbHVlcz1udWxsO1xyXG4gICAgICAgIGlmKHR5cGVvZiBxdWVyeUFyZ3VtZW50c1swXSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXTtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBxdWVyeUFyZ3VtZW50c1sxXSA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMV18fG51bGwpO1xyXG4gICAgICAgIH1lbHNlIGlmKHF1ZXJ5QXJndW1lbnRzWzBdIGluc3RhbmNlb2YgT2JqZWN0KXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF0udGV4dDtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlc3x8bnVsbCk7XHJcbiAgICAgICAgICAgIHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlcyA9IHF1ZXJ5VmFsdWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICB2YXIgc3FsPXF1ZXJ5VGV4dDtcclxuICAgICAgICAgICAgbG9nKE1FU1NBR0VTX1NFUEFSQVRPUiwgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpO1xyXG4gICAgICAgICAgICBpZihxdWVyeVZhbHVlcyAmJiBxdWVyeVZhbHVlcy5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgbG9nKCdgJytzcWwrJ1xcbmAnLCdRVUVSWS1QJyk7XHJcbiAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocXVlcnlWYWx1ZXMpLCdRVUVSWS1BJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlOmFueSwgaTpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNxbD1zcWwucmVwbGFjZShuZXcgUmVnRXhwKCdcXFxcJCcrKGkrMSkrJ1xcXFxiJyksIHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PSBcImJvb2xlYW5cIj92YWx1ZTpxdW90ZU51bGxhYmxlKHZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2coc3FsKyc7JywnUVVFUlknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJldHVybmVkUXVlcnkgPSB0aGlzLl9jbGllbnQucXVlcnkobmV3IHBnLlF1ZXJ5KHF1ZXJ5QXJndW1lbnRzWzBdLCBxdWVyeUFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUXVlcnkocmV0dXJuZWRRdWVyeSwgdGhpcywgdGhpcy5fY2xpZW50KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjZHA6UHJvbWlzZTxSZXN1bHRDb21tYW5kfHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2Upe1xyXG4gICAgICAgICAgICBjZHAgPSBjZHAudGhlbihhc3luYyBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYoIXNlbnRlbmNlLnRyaW0oKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBzZWxmLnF1ZXJ5KHNlbnRlbmNlKS5leGVjdXRlKCkuY2F0Y2goZnVuY3Rpb24oZXJyOkVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNkcDtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTcWxTY3JpcHQoZmlsZU5hbWU6c3RyaW5nKXtcclxuICAgICAgICB2YXIgc2VsZj10aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZShmaWxlTmFtZSwndXRmLTgnKS50aGVuKGZ1bmN0aW9uKGNvbnRlbnQpe1xyXG4gICAgICAgICAgICB2YXIgc2VudGVuY2VzID0gY29udGVudC5zcGxpdCgvXFxyP1xcblxccj9cXG4vKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgYnVsa0luc2VydChwYXJhbXM6QnVsa0luc2VydFBhcmFtcyk6UHJvbWlzZTx2b2lkPntcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNxbCA9IFwiSU5TRVJUIElOVE8gXCIrKHBhcmFtcy5zY2hlbWE/cXVvdGVJZGVudChwYXJhbXMuc2NoZW1hKSsnLic6JycpK1xyXG4gICAgICAgICAgICBxdW90ZUlkZW50KHBhcmFtcy50YWJsZSkrXCIgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAocXVvdGVJZGVudCkuam9pbignLCAnKStcIikgVkFMVUVTIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKGZ1bmN0aW9uKF9uYW1lOnN0cmluZywgaV9uYW1lOm51bWJlcil7IHJldHVybiAnJCcrKGlfbmFtZSsxKTsgfSkrXCIpXCI7XHJcbiAgICAgICAgdmFyIGlfcm93cz0wO1xyXG4gICAgICAgIHdoaWxlKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKHBhcmFtcy5vbmVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwYXJhbXMub25lcnJvcihlcnIsIHBhcmFtcy5yb3dzW2lfcm93c10pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlfcm93cysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tUGFyc2VQYXJhbXMob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0pe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcHRzLmluU3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKG51bGxhYmxlOmFueSl7XHJcbiAgICAgICAgaWYobnVsbGFibGU9PW51bGwpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNlIGlmKHR5cGVvZiBudWxsYWJsZSA9PT0gXCJudW1iZXJcIiAmJiBpc05hTihudWxsYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbGFibGUudG9TdHJpbmcoKS5yZXBsYWNlKC8oXFxyKXwoXFxuKXwoXFx0KXwoXFxcXCkvZywgXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihfYWxsOnN0cmluZyxic3I6c3RyaW5nLGJzbjpzdHJpbmcsYnN0OnN0cmluZyxiczpzdHJpbmcpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzcikgcmV0dXJuICdcXFxccic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNuKSByZXR1cm4gJ1xcXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic3QpIHJldHVybiAnXFxcXHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlIHBvciBsYSByZWdleHAgZXMgaW1wb3NpYmxlIHF1ZSBwYXNlIGFsIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcik6c3RyaW5ne1xyXG4gICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgnJDEnLFxyXG4gICAgICAgIGNvdW50P21lc3NhZ2VzLm9idGFpbnMxLnJlcGxhY2UoJyQxJyxjb3VudC50b1N0cmluZygpKTptZXNzYWdlcy5vYnRhaW5zTm9uZVxyXG4gICAgKTtcclxufSBcclxuXHJcblxyXG5jbGFzcyBRdWVyeXtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX3F1ZXJ5OnBnLlF1ZXJ5LCBwdWJsaWMgY2xpZW50OkNsaWVudCwgcHJpdmF0ZSBfaW50ZXJuYWxDbGllbnQ6cGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgb25Ob3RpY2UoY2FsbGJhY2tOb3RpY2VDb25zdW1lcjoobm90aWNlOk5vdGljZSk9PnZvaWQpOlF1ZXJ5e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICB2YXIgbm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24obm90aWNlOk5vdGljZSl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSEgTEFDS1Mgb2YgYWN0aXZlUXVlcnlcclxuICAgICAgICAgICAgaWYocS5faW50ZXJuYWxDbGllbnQuYWN0aXZlUXVlcnk9PXEuX3F1ZXJ5KXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrTm90aWNlQ29uc3VtZXIobm90aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBAdHMtaWdub3JlIC5vbignbm90aWNlJykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgIHRoaXMuX2ludGVybmFsQ2xpZW50Lm9uKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB2YXIgcmVtb3ZlTm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24gcmVtb3ZlTm90aWNlQ2FsbGJhY2soKXtcclxuICAgICAgICAgICAgcS5faW50ZXJuYWxDbGllbnQucmVtb3ZlTGlzdGVuZXIoJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZW5kJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2Vycm9yJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZTxUUiBleHRlbmRzIFJlc3VsdEdlbmVyaWM+KFxyXG4gICAgICAgIGFkYXB0ZXJDYWxsYmFjazpudWxsfCgocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6VFIpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkKSxcclxuICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3c/Oihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4sIFxyXG4gICAgKTpQcm9taXNlPFRSPntcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICB2YXIgcGVuZGluZ1Jvd3M9MDtcclxuICAgICAgICAgICAgdmFyIGVuZE1hcms6bnVsbHx7cmVzdWx0OnBnLlF1ZXJ5UmVzdWx0fT1udWxsO1xyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZXJyb3InLGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdyb3cnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdyb3cnLGFzeW5jIGZ1bmN0aW9uKHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmKGNhbGxiYWNrRm9yRWFjaFJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ1Jvd3MrKztcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZW5kJyxmdW5jdGlvbihyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogVkVSIFNJIEVTVE8gRVMgTkVDRVNBUklPXHJcbiAgICAgICAgICAgICAgICAvLyByZXN1bHQuY2xpZW50ID0gcS5jbGllbnQ7XHJcbiAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyZXN1bHQucm93cyksICdSRVNVTFQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVuZE1hcms9e3Jlc3VsdH07XHJcbiAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKFxyXG4gICAgICAgICAgICAgICAgbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDEsIHJlc3VsdC5maWVsZHMubGVuZ3RoKSksXHJcbiAgICAgICAgICAgICAgICAnNTRVMTEhJ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge3ZhbHVlOnJvd1tyZXN1bHQuZmllbGRzWzBdLm5hbWVdLCAuLi5yZXN1bHR9O1xyXG4gICAgfVxyXG4gICAgZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlPzpzdHJpbmcsYWNjZXB0Tm9Sb3dzPzpib29sZWFuKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRPbmVSb3cpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIGlmKHJlc3VsdC5yb3dDb3VudCE9PTEgJiYgKCFhY2NlcHROb1Jvd3MgfHwgISFyZXN1bHQucm93Q291bnQpKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZVJvd0FuZDEscmVzdWx0LnJvd0NvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmUgZXJyLmNvZGVcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlID0gJzU0MDExISdcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2UsdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcihtZXNzYWdlcy5mZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjayk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZVRoZW5lZClcclxuICAgIH1cclxuICAgIGNhdGNoKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZClcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgaWYobWVzc2FnZVR5cGUpe1xyXG4gICAgICAgIGlmKG1lc3NhZ2VUeXBlPT0nRVJST1InKXtcclxuICAgICAgICAgICAgaWYobG9nTGFzdEVycm9yLmluRmlsZU5hbWUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzPVsnUEctRVJST1IgJyttZXNzYWdlXTtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goXCItLS0tLS0tIFwiK2F0dHIrXCI6XFxuXCIrbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgICAgIHJlYWR5TG9nID0gcmVhZHlMb2cudGhlbihfPT5mcy53cml0ZUZpbGUobG9nTGFzdEVycm9yLmluRmlsZU5hbWUsbGluZXMuam9pbignXFxuJykpKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyMiBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhdHRyMiwgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cjJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYobWVzc2FnZVR5cGU9PU1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKXtcclxuICAgICAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbbWVzc2FnZVR5cGVdID0gbWVzc2FnZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lID0gJy4vbG9jYWwtc3FsLWVycm9yLmxvZyc7XHJcbmxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzPXt9IGFzIHtcclxuICAgIFtrZXk6c3RyaW5nXTpzdHJpbmdcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb29sQmFsYW5jZUNvbnRyb2woKXtcclxuICAgIHZhciBydGE6c3RyaW5nW109W107XHJcbiAgICBpZih0eXBlb2YgZGVidWcucG9vbCA9PT0gXCJvYmplY3RcIil7XHJcbiAgICAgICAgbGlrZUFyKGRlYnVnLnBvb2wpLmZvckVhY2goZnVuY3Rpb24ocG9vbCl7XHJcbiAgICAgICAgICAgIGlmKHBvb2wuY291bnQpe1xyXG4gICAgICAgICAgICAgICAgcnRhLnB1c2gobWVzc2FnZXMudW5iYWxhbmNlZENvbm5lY3Rpb24rJyAnK3V0aWwuaW5zcGVjdChwb29sKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBydGEuam9pbignXFxuJyk7XHJcbn07XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==