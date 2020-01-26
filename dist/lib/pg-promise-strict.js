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
                // console.log('zzzzzzzzzzzzz',new Date().getTime() - self.lastOperationTimestamp, self.opts.releaseTimeout.inactive)
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
        console.log('xxxxxxxxxxxxxxxx', sql);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7QUFFYiwrQkFBK0I7QUFDL0IseUJBQXlCO0FBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFFekIscURBQWlEO0FBQ2pELDZCQUE2QjtBQUM3QixrQ0FBa0M7QUFDbEMsNENBQTRDO0FBQzVDLG1DQUF5QztBQUV6QyxNQUFNLHVCQUF1QixHQUFDLFFBQVEsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQixHQUFDLHlCQUF5QixDQUFDO0FBRXhDLFFBQUEsUUFBUSxHQUFHO0lBQ2xCLGlDQUFpQyxFQUFDLDBEQUEwRDtJQUM1RiwrQkFBK0IsRUFBQyx3REFBd0Q7SUFDeEYsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4RyxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsaUNBQWlDLEVBQUMsaUVBQWlFO0lBQ25HLDRDQUE0QyxFQUFDLGtFQUFrRTtJQUMvRyxnQ0FBZ0MsRUFBQyxrRUFBa0U7SUFDbkcsc0NBQXNDLEVBQUMsMENBQTBDO0lBQ2pGLFVBQVUsRUFBQyxhQUFhO0lBQ3hCLFlBQVksRUFBQywyQ0FBMkM7SUFDeEQsNEJBQTRCLEVBQUMsc0RBQXNEO0lBQ25GLHdCQUF3QixFQUFDLGtEQUFrRDtJQUMzRSxrQkFBa0IsRUFBQyxzQkFBc0I7SUFDekMsUUFBUSxFQUFDLFlBQVk7SUFDckIsV0FBVyxFQUFDLGNBQWM7SUFDMUIsd0JBQXdCLEVBQUMsZ0NBQWdDO0lBQ3pELHNCQUFzQixFQUFDLDhCQUE4QjtJQUNyRCxxQkFBcUIsRUFBQywwREFBMEQ7SUFDaEYsb0JBQW9CLEVBQUMseURBQXlEO0lBQzlFLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxvQkFBb0IsRUFBQyxrREFB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QyxJQUFHLElBQUksQ0FBQyxLQUFLLEVBQUM7Z0JBQ1YsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBUSxDQUFDLG9CQUFvQixHQUFDLEdBQUcsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDbEU7UUFDTCxDQUFDLENBQUMsQ0FBQztLQUNOO0lBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFWRCxnREFVQztBQUFBLENBQUM7QUFFRiwwQkFBMEI7QUFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmluc2FuZU5hbWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdcIicrbmFtZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIic7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudExpc3Qob2JqZWN0TmFtZXM6c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIG9iamVjdE5hbWVzLm1hcChmdW5jdGlvbihvYmplY3ROYW1lKXsgcmV0dXJuIHF1b3RlSWRlbnQob2JqZWN0TmFtZSk7IH0pLmpvaW4oJywnKTtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFueVF1b3RlYWJsZSA9IHN0cmluZ3xudW1iZXJ8RGF0ZXx7aXNSZWFsRGF0ZTpib29sZWFuLCB0b1ltZDooKT0+c3RyaW5nfXx7dG9Qb3N0Z3JlczooKT0+c3RyaW5nfXx7dG9TdHJpbmc6KCk9PnN0cmluZ307XHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZU51bGxhYmxlKGFueVZhbHVlOm51bGx8QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gJ251bGwnO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHQ6c3RyaW5nXHJcbiAgICBpZih0eXBlb2YgYW55VmFsdWU9PT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWU7XHJcbiAgICB9ZWxzZSBpZighKGFueVZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSl7XHJcbiAgICAgICAgdGV4dD1hbnlWYWx1ZS50b1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ2lzUmVhbERhdGUnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLmlzUmVhbERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1ltZCgpO1xyXG4gICAgfWVsc2UgaWYoYW55VmFsdWUgaW5zdGFuY2VvZiBEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9JU09TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCd0b1Bvc3RncmVzJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS50b1Bvc3RncmVzIGluc3RhbmNlb2YgRnVuY3Rpb24pe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1Bvc3RncmVzKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkoYW55VmFsdWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRQYXJhbWV0ZXJUeXBlcyhwYXJhbWV0ZXJzPzphbnlbXSl7XHJcbiAgICAvLyBAdHMtaWdub3JlIFxyXG4gICAgaWYocGFyYW1ldGVycz09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1ldGVycy5tYXAoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIGlmKHZhbHVlICYmIHZhbHVlLnR5cGVTdG9yZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xpdGVyYWwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGVhc3k6Ym9vbGVhbj10cnVlOyAvLyBkZXByZWNhdGVkIVxyXG5cclxuZXhwb3J0IHR5cGUgQ29ubmVjdFBhcmFtcz17XHJcbiAgICBtb3Rvcj86XCJwb3N0Z3Jlc1wiXHJcbiAgICBkYXRhYmFzZT86c3RyaW5nXHJcbiAgICB1c2VyPzpzdHJpbmdcclxuICAgIHBhc3N3b3JkPzpzdHJpbmdcclxuICAgIHBvcnQ/Om51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNDb21tb249e3RhYmxlOnN0cmluZyxjb2x1bW5zPzpzdHJpbmdbXSxkb25lPzooZXJyPzpFcnJvcik9PnZvaWQsIHdpdGg/OnN0cmluZ31cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzRmlsZT17aW5TdHJlYW0/OnVuZGVmaW5lZCwgZmlsZW5hbWU6c3RyaW5nfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzU3RyZWFtPXtpblN0cmVhbTpTdHJlYW0sZmlsZW5hbWU/OnVuZGVmaW5lZH0mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0cz1Db3B5RnJvbU9wdHNGaWxlfENvcHlGcm9tT3B0c1N0cmVhbVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOmFueVtdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzphbnlbXSk9PlByb21pc2U8dm9pZD59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd6enp6enp6enp6enp6JyxuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdE9wZXJhdGlvblRpbWVzdGFtcCwgc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlKVxyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdEVuZENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGlzLl9jbGllbnQgaW5zdGFuY2VvZiBwZy5DbGllbnQpe1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuZW5kKCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb25lKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRBbHJlYWR5RG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIERFQlVHR0lOR1xyXG4gICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50LS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnRUb0RvbmU9dGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHRoaXMuX2NsaWVudD1udWxsO1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgYXJndW1lbnRzIEFycmF5IGxpa2UgYW5kIGFwcGx5YWJsZVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lLmFwcGx5KGNsaWVudFRvRG9uZSwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcpOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nLCBwYXJhbXM6YW55W10pOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWxPYmplY3Q6e3RleHQ6c3RyaW5nLCB2YWx1ZXM6YW55W119KTpRdWVyeVxyXG4gICAgcXVlcnkoKTpRdWVyeXtcclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDtcclxuICAgICAgICB2YXIgcXVlcnlWYWx1ZXM9bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgdmFyIHNxbD1xdWVyeVRleHQ7XHJcbiAgICAgICAgICAgIGxvZyhNRVNTQUdFU19TRVBBUkFUT1IsIE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMgJiYgcXVlcnlWYWx1ZXMubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGxvZygnYCcrc3FsKydcXG5gJywnUVVFUlktUCcpO1xyXG4gICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHF1ZXJ5VmFsdWVzKSwnUVVFUlktQScpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlWYWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZTphbnksIGk6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzcWw9c3FsLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxcXCQnKyhpKzEpKydcXFxcYicpLCB0eXBlb2YgdmFsdWUgPT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgdmFsdWUgPT0gXCJib29sZWFuXCI/dmFsdWU6cXVvdGVOdWxsYWJsZSh2YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nKHNxbCsnOycsJ1FVRVJZJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZXR1cm5lZFF1ZXJ5ID0gdGhpcy5fY2xpZW50LnF1ZXJ5KG5ldyBwZy5RdWVyeShxdWVyeUFyZ3VtZW50c1swXSwgcXVlcnlBcmd1bWVudHNbMV0pKTtcclxuICAgICAgICByZXR1cm4gbmV3IFF1ZXJ5KHJldHVybmVkUXVlcnksIHRoaXMsIHRoaXMuX2NsaWVudCk7XHJcbiAgICB9O1xyXG4gICAgYXN5bmMgZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXM6c3RyaW5nW10pe1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2RwOlByb21pc2U8UmVzdWx0Q29tbWFuZHx2b2lkPiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIHNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uKHNlbnRlbmNlKXtcclxuICAgICAgICAgICAgY2RwID0gY2RwLnRoZW4oYXN5bmMgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKCFzZW50ZW5jZS50cmltKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgc2VsZi5xdWVyeShzZW50ZW5jZSkuZXhlY3V0ZSgpLmNhdGNoKGZ1bmN0aW9uKGVycjpFcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjZHA7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU3FsU2NyaXB0KGZpbGVOYW1lOnN0cmluZyl7XHJcbiAgICAgICAgdmFyIHNlbGY9dGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGUoZmlsZU5hbWUsJ3V0Zi04JykudGhlbihmdW5jdGlvbihjb250ZW50KXtcclxuICAgICAgICAgICAgdmFyIHNlbnRlbmNlcyA9IGNvbnRlbnQuc3BsaXQoL1xccj9cXG5cXHI/XFxuLyk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGJ1bGtJbnNlcnQocGFyYW1zOkJ1bGtJbnNlcnRQYXJhbXMpOlByb21pc2U8dm9pZD57XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzcWwgPSBcIklOU0VSVCBJTlRPIFwiKyhwYXJhbXMuc2NoZW1hP3F1b3RlSWRlbnQocGFyYW1zLnNjaGVtYSkrJy4nOicnKStcclxuICAgICAgICAgICAgcXVvdGVJZGVudChwYXJhbXMudGFibGUpK1wiIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKHF1b3RlSWRlbnQpLmpvaW4oJywgJykrXCIpIFZBTFVFUyAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChmdW5jdGlvbihfbmFtZTpzdHJpbmcsIGlfbmFtZTpudW1iZXIpeyByZXR1cm4gJyQnKyhpX25hbWUrMSk7IH0pK1wiKVwiO1xyXG4gICAgICAgIHZhciBpX3Jvd3M9MDtcclxuICAgICAgICB3aGlsZShpX3Jvd3M8cGFyYW1zLnJvd3MubGVuZ3RoKXtcclxuICAgICAgICAgICAgdHJ5e1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgc2VsZi5xdWVyeShzcWwsIHBhcmFtcy5yb3dzW2lfcm93c10pLmV4ZWN1dGUoKTtcclxuICAgICAgICAgICAgfWNhdGNoKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihwYXJhbXMub25lcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcGFyYW1zLm9uZXJyb3IoZXJyLCBwYXJhbXMucm93c1tpX3Jvd3NdKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpX3Jvd3MrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHM6Q29weUZyb21PcHRzKXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2VzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmcm9tID0gb3B0cy5pblN0cmVhbSA/ICdTVERJTicgOiBxdW90ZUxpdGVyYWwob3B0cy5maWxlbmFtZSk7XHJcbiAgICAgICAgdmFyIHNxbCA9IGBDT1BZICR7b3B0cy50YWJsZX0gJHtvcHRzLmNvbHVtbnM/YCgke29wdHMuY29sdW1ucy5tYXAobmFtZT0+cXVvdGVJZGVudChuYW1lKSkuam9pbignLCcpfSlgOicnfSBGUk9NICR7ZnJvbX0gJHtvcHRzLndpdGg/J1dJVEggJytvcHRzLndpdGg6Jyd9YDtcclxuICAgICAgICBjb25zb2xlLmxvZygneHh4eHh4eHh4eHh4eHh4eCcsc3FsKTtcclxuICAgICAgICByZXR1cm4ge3NxbCwgX2NsaWVudDp0aGlzLl9jbGllbnR9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgY29weUZyb21GaWxlKG9wdHM6Q29weUZyb21PcHRzRmlsZSk6UHJvbWlzZTxSZXN1bHRDb21tYW5kPntcclxuICAgICAgICB2YXIge3NxbH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkoc3FsKS5leGVjdXRlKCk7XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHNTdHJlYW0pe1xyXG4gICAgICAgIHZhciB7c3FsLCBfY2xpZW50fSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICB2YXIgc3RyZWFtID0gX2NsaWVudC5xdWVyeShjb3B5RnJvbShzcWwpKTtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2VuZCcsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignY2xvc2UnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihvcHRzLmluU3RyZWFtKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgICAgICBvcHRzLmluU3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5waXBlKHN0cmVhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdHJlYW07XHJcbiAgICB9XHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcChudWxsYWJsZTphbnkpe1xyXG4gICAgICAgIGlmKG51bGxhYmxlPT1udWxsKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZSBpZih0eXBlb2YgbnVsbGFibGUgPT09IFwibnVtYmVyXCIgJiYgaXNOYU4obnVsbGFibGUpKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxhYmxlLnRvU3RyaW5nKCkucmVwbGFjZSgvKFxccil8KFxcbil8KFxcdCl8KFxcXFwpL2csIFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oX2FsbDpzdHJpbmcsYnNyOnN0cmluZyxic246c3RyaW5nLGJzdDpzdHJpbmcsYnM6c3RyaW5nKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihic3IpIHJldHVybiAnXFxcXHInO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzbikgcmV0dXJuICdcXFxcbic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnN0KSByZXR1cm4gJ1xcXFx0JztcclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcik6c3RyaW5ne1xyXG4gICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgnJDEnLFxyXG4gICAgICAgIGNvdW50P21lc3NhZ2VzLm9idGFpbnMxLnJlcGxhY2UoJyQxJyxjb3VudC50b1N0cmluZygpKTptZXNzYWdlcy5vYnRhaW5zTm9uZVxyXG4gICAgKTtcclxufSBcclxuXHJcblxyXG5jbGFzcyBRdWVyeXtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX3F1ZXJ5OnBnLlF1ZXJ5LCBwdWJsaWMgY2xpZW50OkNsaWVudCwgcHJpdmF0ZSBfaW50ZXJuYWxDbGllbnQ6cGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgb25Ob3RpY2UoY2FsbGJhY2tOb3RpY2VDb25zdW1lcjoobm90aWNlOk5vdGljZSk9PnZvaWQpOlF1ZXJ5e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICB2YXIgbm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24obm90aWNlOk5vdGljZSl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSEgTEFDS1Mgb2YgYWN0aXZlUXVlcnlcclxuICAgICAgICAgICAgaWYocS5faW50ZXJuYWxDbGllbnQuYWN0aXZlUXVlcnk9PXEuX3F1ZXJ5KXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrTm90aWNlQ29uc3VtZXIobm90aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBAdHMtaWdub3JlIC5vbignbm90aWNlJykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgIHRoaXMuX2ludGVybmFsQ2xpZW50Lm9uKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB2YXIgcmVtb3ZlTm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24gcmVtb3ZlTm90aWNlQ2FsbGJhY2soKXtcclxuICAgICAgICAgICAgcS5faW50ZXJuYWxDbGllbnQucmVtb3ZlTGlzdGVuZXIoJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZW5kJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2Vycm9yJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZTxUUiBleHRlbmRzIFJlc3VsdEdlbmVyaWM+KFxyXG4gICAgICAgIGFkYXB0ZXJDYWxsYmFjazpudWxsfCgocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6VFIpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkKSxcclxuICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3c/Oihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4sIFxyXG4gICAgKTpQcm9taXNlPFRSPntcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICB2YXIgcGVuZGluZ1Jvd3M9MDtcclxuICAgICAgICAgICAgdmFyIGVuZE1hcms6bnVsbHx7cmVzdWx0OnBnLlF1ZXJ5UmVzdWx0fT1udWxsO1xyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZXJyb3InLGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdyb3cnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdyb3cnLGFzeW5jIGZ1bmN0aW9uKHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmKGNhbGxiYWNrRm9yRWFjaFJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ1Jvd3MrKztcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZW5kJyxmdW5jdGlvbihyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogVkVSIFNJIEVTVE8gRVMgTkVDRVNBUklPXHJcbiAgICAgICAgICAgICAgICAvLyByZXN1bHQuY2xpZW50ID0gcS5jbGllbnQ7XHJcbiAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyZXN1bHQucm93cyksICdSRVNVTFQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVuZE1hcms9e3Jlc3VsdH07XHJcbiAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKFxyXG4gICAgICAgICAgICAgICAgbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDEsIHJlc3VsdC5maWVsZHMubGVuZ3RoKSksXHJcbiAgICAgICAgICAgICAgICAnNTRVMTEhJ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge3ZhbHVlOnJvd1tyZXN1bHQuZmllbGRzWzBdLm5hbWVdLCAuLi5yZXN1bHR9O1xyXG4gICAgfVxyXG4gICAgZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlPzpzdHJpbmcsYWNjZXB0Tm9Sb3dzPzpib29sZWFuKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRPbmVSb3cpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIGlmKHJlc3VsdC5yb3dDb3VudCE9PTEgJiYgKCFhY2NlcHROb1Jvd3MgfHwgISFyZXN1bHQucm93Q291bnQpKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZVJvd0FuZDEscmVzdWx0LnJvd0NvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmUgZXJyLmNvZGVcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlID0gJzU0MDExISdcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2UsdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcihtZXNzYWdlcy5mZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjayk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZVRoZW5lZClcclxuICAgIH1cclxuICAgIGNhdGNoKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZClcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgaWYobWVzc2FnZVR5cGUpe1xyXG4gICAgICAgIGlmKG1lc3NhZ2VUeXBlPT0nRVJST1InKXtcclxuICAgICAgICAgICAgaWYobG9nTGFzdEVycm9yLmluRmlsZU5hbWUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzPVsnUEctRVJST1IgJyttZXNzYWdlXTtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goXCItLS0tLS0tIFwiK2F0dHIrXCI6XFxuXCIrbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgICAgIHJlYWR5TG9nID0gcmVhZHlMb2cudGhlbihfPT5mcy53cml0ZUZpbGUobG9nTGFzdEVycm9yLmluRmlsZU5hbWUsbGluZXMuam9pbignXFxuJykpKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyMiBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXR0cjIsIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHIyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2VUeXBlPT1NRVNTQUdFU19TRVBBUkFUT1JfVFlQRSl7XHJcbiAgICAgICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW21lc3NhZ2VUeXBlXSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5sb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSA9ICcuL2xvY2FsLXNxbC1lcnJvci5sb2cnO1xyXG5sb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcz17fSBhcyB7XHJcbiAgICBba2V5OnN0cmluZ106c3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9vbEJhbGFuY2VDb250cm9sKCl7XHJcbiAgICB2YXIgcnRhOnN0cmluZ1tdPVtdO1xyXG4gICAgaWYodHlwZW9mIGRlYnVnLnBvb2wgPT09IFwib2JqZWN0XCIpe1xyXG4gICAgICAgIGxpa2VBcihkZWJ1Zy5wb29sKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpe1xyXG4gICAgICAgICAgICBpZihwb29sLmNvdW50KXtcclxuICAgICAgICAgICAgICAgIHJ0YS5wdXNoKG1lc3NhZ2VzLnVuYmFsYW5jZWRDb25uZWN0aW9uKycgJyt1dGlsLmluc3BlY3QocG9vbCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnRhLmpvaW4oJ1xcbicpO1xyXG59O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxucHJvY2Vzcy5vbignZXhpdCcsZnVuY3Rpb24oKXtcclxuICAgIGNvbnNvbGUud2Fybihwb29sQmFsYW5jZUNvbnRyb2woKSk7XHJcbn0pO1xyXG4iXX0=