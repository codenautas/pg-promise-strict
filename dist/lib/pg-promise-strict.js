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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7QUFFYiwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFFekIscURBQWlEO0FBQ2pELDZCQUE2QjtBQUM3QixrQ0FBa0M7QUFDbEMsNENBQTRDO0FBQzVDLG1DQUF5QztBQUV6QyxNQUFNLHVCQUF1QixHQUFDLFFBQVEsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFDLHlCQUF5QixDQUFDO0FBRXhDLFFBQUEsUUFBUSxHQUFHO0lBQ2xCLGlDQUFpQyxFQUFDLDBEQUEwRDtJQUM1RiwrQkFBK0IsRUFBQyx3REFBd0Q7SUFDeEYsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4RyxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsaUNBQWlDLEVBQUMsaUVBQWlFO0lBQ25HLDRDQUE0QyxFQUFDLGtFQUFrRTtJQUMvRyxnQ0FBZ0MsRUFBQyxrRUFBa0U7SUFDbkcsc0NBQXNDLEVBQUMsMENBQTBDO0lBQ2pGLFVBQVUsRUFBQyxhQUFhO0lBQ3hCLFlBQVksRUFBQywyQ0FBMkM7SUFDeEQsNEJBQTRCLEVBQUMsc0RBQXNEO0lBQ25GLHdCQUF3QixFQUFDLGtEQUFrRDtJQUMzRSxrQkFBa0IsRUFBQyxzQkFBc0I7SUFDekMsUUFBUSxFQUFDLFlBQVk7SUFDckIsV0FBVyxFQUFDLGNBQWM7SUFDMUIsd0JBQXdCLEVBQUMsZ0NBQWdDO0lBQ3pELHNCQUFzQixFQUFDLDhCQUE4QjtJQUNyRCxxQkFBcUIsRUFBQywwREFBMEQ7SUFDaEYsb0JBQW9CLEVBQUMseURBQXlEO0lBQzlFLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxvQkFBb0IsRUFBQyxrREFB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QkFBUSxDQUFDLG9CQUFvQixHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDbEU7UUFDTCxDQUFDLENBQUMsQ0FBQztLQUNOO0lBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFWRCxnREFVQztBQUFBLENBQUM7QUFFRiwwQkFBMEI7QUFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmluc2FuZU5hbWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdcIicrbmFtZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIic7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudExpc3Qob2JqZWN0TmFtZXM6c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIG9iamVjdE5hbWVzLm1hcChmdW5jdGlvbihvYmplY3ROYW1lKXsgcmV0dXJuIHF1b3RlSWRlbnQob2JqZWN0TmFtZSk7IH0pLmpvaW4oJywnKTtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFueVF1b3RlYWJsZSA9IHN0cmluZ3xudW1iZXJ8RGF0ZXx7aXNSZWFsRGF0ZTpib29sZWFuLCB0b1ltZDooKT0+c3RyaW5nfXx7dG9Qb3N0Z3JlczooKT0+c3RyaW5nfXx7dG9TdHJpbmc6KCk9PnN0cmluZ307XHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZU51bGxhYmxlKGFueVZhbHVlOm51bGx8QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gJ251bGwnO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHQ6c3RyaW5nXHJcbiAgICBpZih0eXBlb2YgYW55VmFsdWU9PT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWU7XHJcbiAgICB9ZWxzZSBpZighKGFueVZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSl7XHJcbiAgICAgICAgdGV4dD1hbnlWYWx1ZS50b1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ2lzUmVhbERhdGUnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLmlzUmVhbERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1ltZCgpO1xyXG4gICAgfWVsc2UgaWYoYW55VmFsdWUgaW5zdGFuY2VvZiBEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9JU09TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCd0b1Bvc3RncmVzJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS50b1Bvc3RncmVzIGluc3RhbmNlb2YgRnVuY3Rpb24pe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1Bvc3RncmVzKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkoYW55VmFsdWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRQYXJhbWV0ZXJUeXBlcyhwYXJhbWV0ZXJzPzphbnlbXSl7XHJcbiAgICAvLyBAdHMtaWdub3JlIFxyXG4gICAgaWYocGFyYW1ldGVycz09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1ldGVycy5tYXAoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIGlmKHZhbHVlICYmIHZhbHVlLnR5cGVTdG9yZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xpdGVyYWwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGVhc3k6Ym9vbGVhbj10cnVlOyAvLyBkZXByZWNhdGVkIVxyXG5cclxuZXhwb3J0IHR5cGUgQ29ubmVjdFBhcmFtcz17XHJcbiAgICBtb3Rvcj86XCJwb3N0Z3Jlc1wiXHJcbiAgICBkYXRhYmFzZT86c3RyaW5nXHJcbiAgICB1c2VyPzpzdHJpbmdcclxuICAgIHBhc3N3b3JkPzpzdHJpbmdcclxuICAgIHBvcnQ/Om51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNDb21tb249e3RhYmxlOnN0cmluZyxjb2x1bW5zPzpzdHJpbmdbXSxkb25lPzooZXJyPzpFcnJvcik9PnZvaWQsIHdpdGg/OnN0cmluZ31cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzRmlsZT17aW5TdHJlYW0/OnVuZGVmaW5lZCwgZmlsZW5hbWU6c3RyaW5nfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzU3RyZWFtPXtpblN0cmVhbTpTdHJlYW0sZmlsZW5hbWU/OnVuZGVmaW5lZH0mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0cz1Db3B5RnJvbU9wdHNGaWxlfENvcHlGcm9tT3B0c1N0cmVhbVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOmFueVtdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzphbnlbXSk9PlByb21pc2U8dm9pZD59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnQgPSB0aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBjbGllbnQuY29ubmVjdChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlbGYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBlbmQoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RFbmRDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlOb3RDb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgcXVlcnlBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBxdWVyeVRleHQ7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VmFsdWVzPW51bGw7XHJcbiAgICAgICAgaWYodHlwZW9mIHF1ZXJ5QXJndW1lbnRzWzBdID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IHF1ZXJ5QXJndW1lbnRzWzFdID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1sxXXx8bnVsbCk7XHJcbiAgICAgICAgfWVsc2UgaWYocXVlcnlBcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBPYmplY3Qpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXS50ZXh0O1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMF0udmFsdWVzfHxudWxsKTtcclxuICAgICAgICAgICAgcXVlcnlBcmd1bWVudHNbMF0udmFsdWVzID0gcXVlcnlWYWx1ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgIHZhciBzcWw9cXVlcnlUZXh0O1xyXG4gICAgICAgICAgICBsb2coTUVTU0FHRVNfU0VQQVJBVE9SLCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRSk7XHJcbiAgICAgICAgICAgIGlmKHF1ZXJ5VmFsdWVzICYmIHF1ZXJ5VmFsdWVzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBsb2coJ2AnK3NxbCsnXFxuYCcsJ1FVRVJZLVAnKTtcclxuICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShxdWVyeVZhbHVlcyksJ1FVRVJZLUEnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWU6YW55LCBpOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3FsPXNxbC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwkJysoaSsxKSsnXFxcXGInKSwgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzOnN0cmluZ1tdKXtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaV9yb3dzPTA7XHJcbiAgICAgICAgd2hpbGUoaV9yb3dzPHBhcmFtcy5yb3dzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCk7XHJcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBhcmFtcy5vbmVycm9yKGVyciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaV9yb3dzKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21QYXJzZVBhcmFtcyhvcHRzOkNvcHlGcm9tT3B0cyl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZnJvbSA9IG9wdHMuaW5TdHJlYW0gPyAnU1RESU4nIDogcXVvdGVMaXRlcmFsKG9wdHMuZmlsZW5hbWUpO1xyXG4gICAgICAgIHZhciBzcWwgPSBgQ09QWSAke29wdHMudGFibGV9ICR7b3B0cy5jb2x1bW5zP2AoJHtvcHRzLmNvbHVtbnMubWFwKG5hbWU9PnF1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywnKX0pYDonJ30gRlJPTSAke2Zyb219ICR7b3B0cy53aXRoPydXSVRIICcrb3B0cy53aXRoOicnfWA7XHJcbiAgICAgICAgcmV0dXJuIHtzcWwsIF9jbGllbnQ6dGhpcy5fY2xpZW50fTtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvcHlGcm9tRmlsZShvcHRzOkNvcHlGcm9tT3B0c0ZpbGUpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57XHJcbiAgICAgICAgdmFyIHtzcWx9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KHNxbCkuZXhlY3V0ZSgpO1xyXG4gICAgfVxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIge3NxbCwgX2NsaWVudH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgdmFyIHN0cmVhbSA9IF9jbGllbnQucXVlcnkoY29weUZyb20oc3FsKSk7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlbmQnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Nsb3NlJywgb3B0cy5kb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnMpIHJldHVybiAnXFxcXFxcXFwnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IEVzdG8gZXMgaW1wb3NpYmxlIHF1ZSBzdWNlZGEgKi9cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmcpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21BcnJheVN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIGMgPSB0aGlzO1xyXG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKHtcclxuICAgICAgICAgICAgd3JpdGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHJlYWRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm0oYXJyYXlDaHVuazphbnlbXSwgX2VuY29kaW5nLCBuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaChhcnJheUNodW5rLm1hcCh4PT5jLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKHgpKS5qb2luKCdcXHQnKSsnXFxuJylcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmx1c2gobmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goJ1xcXFwuXFxuJyk7XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIge2luU3RyZWFtLCAuLi5yZXN0fSA9IG9wdHM7XHJcbiAgICAgICAgaW5TdHJlYW0ucGlwZSh0cmFuc2Zvcm0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSh7aW5TdHJlYW06dHJhbnNmb3JtLCAuLi5yZXN0fSlcclxuICAgIH1cclxufVxyXG5cclxudmFyIHF1ZXJ5UmVzdWx0OnBnLlF1ZXJ5UmVzdWx0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHR7XHJcbiAgICByb3dDb3VudDpudW1iZXJcclxuICAgIGZpZWxkczp0eXBlb2YgcXVlcnlSZXN1bHQuZmllbGRzXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRDb21tYW5ke1xyXG4gICAgY29tbWFuZDpzdHJpbmcsIHJvd0NvdW50Om51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93IGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Ontba2V5OnN0cmluZ106YW55fVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93SWZFeGlzdHMgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c/Ontba2V5OnN0cmluZ106YW55fXxudWxsXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRSb3dzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93czp7W2tleTpzdHJpbmddOmFueX1bXVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0VmFsdWUgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICB2YWx1ZTphbnlcclxufVxyXG4vLyBleHBvcnQgaW50ZXJmYWNlIFJlc3VsdEdlbmVyaWMgZXh0ZW5kcyBSZXN1bHRWYWx1ZSwgUmVzdWx0Um93cywgUmVzdWx0T25lUm93SWZFeGlzdHMsIFJlc3VsdE9uZVJvdywgUmVzdWx0e31cclxuZXhwb3J0IHR5cGUgUmVzdWx0R2VuZXJpYyA9IFJlc3VsdFZhbHVlfFJlc3VsdFJvd3N8UmVzdWx0T25lUm93SWZFeGlzdHN8UmVzdWx0T25lUm93fFJlc3VsdHxSZXN1bHRDb21tYW5kXHJcblxyXG4vKlxyXG5mdW5jdGlvbiBidWlsZFF1ZXJ5Q291bnRlckFkYXB0ZXIoXHJcbiAgICBtaW5Db3VudFJvdzpudW1iZXIsIFxyXG4gICAgbWF4Q291bnRSb3c6bnVtYmVyLCBcclxuICAgIGV4cGVjdFRleHQ6c3RyaW5nLCBcclxuICAgIGNhbGxiYWNrT3RoZXJDb250cm9sPzoocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWRcclxuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbiBxdWVyeUNvdW50ZXJBZGFwdGVyKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpeyBcclxuICAgICAgICBpZihyZXN1bHQucm93cy5sZW5ndGg8bWluQ291bnRSb3cgfHwgcmVzdWx0LnJvd3MubGVuZ3RoPm1heENvdW50Um93ICl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKCdxdWVyeSBleHBlY3RzICcrZXhwZWN0VGV4dCsnIGFuZCBvYnRhaW5zICcrcmVzdWx0LnJvd3MubGVuZ3RoKycgcm93cycpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSc1NDAxMSEnO1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tPdGhlckNvbnRyb2wpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tPdGhlckNvbnRyb2wocmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ub3RoZXJ9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLm90aGVyfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiovXHJcblxyXG50eXBlIE5vdGljZSA9IHN0cmluZztcclxuXHJcbmZ1bmN0aW9uIGxvZ0Vycm9ySWZOZWVkZWQ8VD4oZXJyOkVycm9yLCBjb2RlPzpUKTpFcnJvcntcclxuICAgIGlmKGNvZGUgIT0gbnVsbCl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGVyci5jb2RlPWNvZGU7XHJcbiAgICB9XHJcbiAgICBpZihsb2cpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBsb2coJy0tRVJST1IhICcrZXJyLmNvZGUrJywgJytlcnIubWVzc2FnZSwgJ0VSUk9SJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXJyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvYnRhaW5zKG1lc3NhZ2U6c3RyaW5nLCBjb3VudDpudW1iZXIpOnN0cmluZ3tcclxuICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoJyQxJyxcclxuICAgICAgICBjb3VudD9tZXNzYWdlcy5vYnRhaW5zMS5yZXBsYWNlKCckMScsY291bnQudG9TdHJpbmcoKSk6bWVzc2FnZXMub2J0YWluc05vbmVcclxuICAgICk7XHJcbn0gXHJcblxyXG5cclxuY2xhc3MgUXVlcnl7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVyeTpwZy5RdWVyeSwgcHVibGljIGNsaWVudDpDbGllbnQsIHByaXZhdGUgX2ludGVybmFsQ2xpZW50OnBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KXtcclxuICAgIH1cclxuICAgIG9uTm90aWNlKGNhbGxiYWNrTm90aWNlQ29uc3VtZXI6KG5vdGljZTpOb3RpY2UpPT52b2lkKTpRdWVyeXtcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uKG5vdGljZTpOb3RpY2Upe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlICBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhIExBQ0tTIG9mIGFjdGl2ZVF1ZXJ5XHJcbiAgICAgICAgICAgIGlmKHEuX2ludGVybmFsQ2xpZW50LmFjdGl2ZVF1ZXJ5PT1xLl9xdWVyeSl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja05vdGljZUNvbnN1bWVyKG5vdGljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ25vdGljZScpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICB0aGlzLl9pbnRlcm5hbENsaWVudC5vbignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdmFyIHJlbW92ZU5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uIHJlbW92ZU5vdGljZUNhbGxiYWNrKCl7XHJcbiAgICAgICAgICAgIHEuX2ludGVybmFsQ2xpZW50LnJlbW92ZUxpc3RlbmVyKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2VuZCcscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlcnJvcicscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHByaXZhdGUgX2V4ZWN1dGU8VFIgZXh0ZW5kcyBSZXN1bHRHZW5lcmljPihcclxuICAgICAgICBhZGFwdGVyQ2FsbGJhY2s6bnVsbHwoKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlRSKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZCksXHJcbiAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93Pzoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+LCBcclxuICAgICk6UHJvbWlzZTxUUj57XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgdmFyIHBlbmRpbmdSb3dzPTA7XHJcbiAgICAgICAgICAgIHZhciBlbmRNYXJrOm51bGx8e3Jlc3VsdDpwZy5RdWVyeVJlc3VsdH09bnVsbDtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2Vycm9yJyxmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC5vbigncm93JykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbigncm93Jyxhc3luYyBmdW5jdGlvbihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZihjYWxsYmFja0ZvckVhY2hSb3cpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdSb3dzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJvdyksICdST1cnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgY2FsbGJhY2tGb3JFYWNoUm93KHJvdywgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAtLXBlbmRpbmdSb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgYWRkUm93IG9tbWl0ZWQgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5hZGRSb3cocm93KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdoZW5FbmQoKXtcclxuICAgICAgICAgICAgICAgIGlmKGVuZE1hcmsgJiYgIXBlbmRpbmdSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihhZGFwdGVyQ2FsbGJhY2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGFwdGVyQ2FsbGJhY2soZW5kTWFyay5yZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocmVzdWx0LnJvd3MpLCAnUkVTVUxUJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbmRNYXJrPXtyZXN1bHR9O1xyXG4gICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgYXN5bmMgZmV0Y2hVbmlxdWVWYWx1ZShlcnJvck1lc3NhZ2U/OnN0cmluZyk6UHJvbWlzZTxSZXN1bHRWYWx1ZT4gIHsgXHJcbiAgICAgICAgdmFyIHtyb3csIC4uLnJlc3VsdH0gPSBhd2FpdCB0aGlzLmZldGNoVW5pcXVlUm93KCk7XHJcbiAgICAgICAgaWYocmVzdWx0LmZpZWxkcy5sZW5ndGghPT0xKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChcclxuICAgICAgICAgICAgICAgIG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lRmllbGRBbmQxLCByZXN1bHQuZmllbGRzLmxlbmd0aCkpLFxyXG4gICAgICAgICAgICAgICAgJzU0VTExISdcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHt2YWx1ZTpyb3dbcmVzdWx0LmZpZWxkc1swXS5uYW1lXSwgLi4ucmVzdWx0fTtcclxuICAgIH1cclxuICAgIGZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZT86c3RyaW5nLGFjY2VwdE5vUm93cz86Ym9vbGVhbik6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0T25lUm93KT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICBpZihyZXN1bHQucm93Q291bnQhPT0xICYmICghYWNjZXB0Tm9Sb3dzIHx8ICEhcmVzdWx0LnJvd0NvdW50KSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVSb3dBbmQxLHJlc3VsdC5yb3dDb3VudCkpO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlIGVyci5jb2RlXHJcbiAgICAgICAgICAgICAgICBlcnIuY29kZSA9ICc1NDAxMSEnXHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLnJlc3R9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLnJlc3R9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZmV0Y2hPbmVSb3dJZkV4aXN0cyhlcnJvck1lc3NhZ2U/OnN0cmluZyk6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlLHRydWUpO1xyXG4gICAgfVxyXG4gICAgZmV0Y2hBbGwoKTpQcm9taXNlPFJlc3VsdFJvd3M+e1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdFJvd3MpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBleGVjdXRlKCk6UHJvbWlzZTxSZXN1bHRDb21tYW5kPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Q29tbWFuZCk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHZhciB7cm93cywgb2lkLCBmaWVsZHMsIC4uLnJlc3R9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3QpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZmV0Y2hSb3dCeVJvdyhjYjoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+KTpQcm9taXNlPHZvaWQ+eyBcclxuICAgICAgICBpZighKGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IobWVzc2FnZXMuZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2spO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSczOTAwNCEnO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5fZXhlY3V0ZShudWxsLCBjYik7XHJcbiAgICB9XHJcbiAgICBhc3luYyBvblJvdyhjYjoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+KTpQcm9taXNlPHZvaWQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFJvd0J5Um93KGNiKTtcclxuICAgIH1cclxuICAgIHRoZW4oKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVUaGVuZWQpXHJcbiAgICB9XHJcbiAgICBjYXRjaCgpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZUNhdGNoZWQpXHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGFsbFR5cGVzPWZhbHNlO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEFsbFR5cGVzKCl7XHJcbiAgICB2YXIgVHlwZVN0b3JlID0gcmVxdWlyZSgndHlwZS1zdG9yZScpO1xyXG4gICAgdmFyIERBVEVfT0lEID0gMTA4MjtcclxuICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihEQVRFX09JRCwgZnVuY3Rpb24gcGFyc2VEYXRlKHZhbCl7XHJcbiAgICAgICByZXR1cm4gYmVzdEdsb2JhbHMuZGF0ZS5pc28odmFsKTtcclxuICAgIH0pO1xyXG4gICAgbGlrZUFyKFR5cGVTdG9yZS50eXBlKS5mb3JFYWNoKGZ1bmN0aW9uKF90eXBlRGVmLCB0eXBlTmFtZSl7XHJcbiAgICAgICAgdmFyIHR5cGVyID0gbmV3IFR5cGVTdG9yZS50eXBlW3R5cGVOYW1lXSgpO1xyXG4gICAgICAgIGlmKHR5cGVyLnBnU3BlY2lhbFBhcnNlKXtcclxuICAgICAgICAgICAgKHR5cGVyLnBnX09JRFN8fFt0eXBlci5wZ19PSURdKS5mb3JFYWNoKGZ1bmN0aW9uKE9JRDpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKE9JRCwgZnVuY3Rpb24odmFsKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXIuZnJvbVN0cmluZyh2YWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxudmFyIHBvb2xzOntcclxuICAgIFtrZXk6c3RyaW5nXTpwZy5Qb29sXHJcbn0gPSB7fVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoY29ubmVjdFBhcmFtZXRlcnM6Q29ubmVjdFBhcmFtcyk6UHJvbWlzZTxDbGllbnQ+e1xyXG4gICAgaWYoYWxsVHlwZXMpe1xyXG4gICAgICAgIHNldEFsbFR5cGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICB2YXIgaWRDb25uZWN0UGFyYW1ldGVycyA9IEpTT04uc3RyaW5naWZ5KGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICB2YXIgcG9vbCA9IHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdfHxuZXcgcGcuUG9vbChjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc10gPSBwb29sO1xyXG4gICAgICAgIHBvb2wuY29ubmVjdChmdW5jdGlvbihlcnIsIGNsaWVudCwgZG9uZSl7XHJcbiAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDbGllbnQobnVsbCwgY2xpZW50LCBkb25lIC8qLCBET0lORyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZVRpbWVvdXQ6IGNoYW5naW5nKHBnUHJvbWlzZVN0cmljdC5kZWZhdWx0cy5yZWxlYXNlVGltZW91dCxjb25uZWN0UGFyYW1ldGVycy5yZWxlYXNlVGltZW91dHx8e30pXHJcbiAgICAgICAgICAgICAgICB9Ki8pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIHJlYWR5TG9nID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4vKiB4eGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dMYXN0RXJyb3IobWVzc2FnZTpzdHJpbmcsIG1lc3NhZ2VUeXBlOnN0cmluZyk6dm9pZHtcclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICByZWFkeUxvZyA9IHJlYWR5TG9nLnRoZW4oXz0+ZnMud3JpdGVGaWxlKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lLGxpbmVzLmpvaW4oJ1xcbicpKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihtZXNzYWdlVHlwZT09TUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpe1xyXG4gICAgICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaChtZXNzYWdlcy51bmJhbGFuY2VkQ29ubmVjdGlvbisnICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbnByb2Nlc3Mub24oJ2V4aXQnLGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG59KTtcclxuIl19