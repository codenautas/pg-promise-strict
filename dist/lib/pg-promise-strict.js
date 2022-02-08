"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolBalanceControl = exports.logLastError = exports.readyLog = exports.connect = exports.setAllTypes = exports.allTypes = exports.Client = exports.InformationSchemaReader = exports.easy = exports.adaptParameterTypes = exports.jsono = exports.json = exports.param3rd4sql = exports.quoteLiteral = exports.quoteNullable = exports.quoteIdentList = exports.quoteIdent = exports.log = exports.noLog = exports.defaults = exports.debug = exports.setLang = exports.i18n = exports.messages = void 0;
const fs = require("fs-extra");
const pg = require("pg");
const pgTypes = pg.types;
const pg_copy_streams_1 = require("pg-copy-streams");
const util = require("util");
const likeAr = require("like-ar");
const bestGlobals = require("best-globals");
const cast_error_1 = require("cast-error");
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
    if (text == undefined) {
        throw new Error('quotableNull insane value: ' + typeof anyValue);
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
const param3rd4sql = (exprOrWithoutkeyOrKeys, base, keys) => exprOrWithoutkeyOrKeys == true ? `to_jsonb(${base}) - ${keys instanceof Array ? keys : keys === null || keys === void 0 ? void 0 : keys.split(',').map(x => quoteLiteral(x.trim()))}` :
    exprOrWithoutkeyOrKeys == null ? `to_jsonb(${base})` :
        typeof exprOrWithoutkeyOrKeys == "string" ? exprOrWithoutkeyOrKeys :
            `to_jsonb(jsonb_build_object(${exprOrWithoutkeyOrKeys.map(name => quoteLiteral(name) + ', ' + quoteIdent(name)).join(', ')}))`;
exports.param3rd4sql = param3rd4sql;
function json(sql, orderby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_agg(${(0, exports.param3rd4sql)(exprOrWithoutkeyOrKeys, 'j.*', orderby)} ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}
exports.json = json;
function jsono(sql, indexedby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},${(0, exports.param3rd4sql)(exprOrWithoutkeyOrKeys, 'j.*', indexedby)}) from (${sql}) as j),'{}'::jsonb)`;
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
class InformationSchemaReader {
    constructor(client) {
        this.client = client;
    }
    async column(table_schema, table_name, column_name) {
        var result = await this.client.query(`
            select * 
                from information_schema.columns
                where table_schema=$1
                    and table_name=$2
                    and column_name=$3;
        `, [table_schema, table_name, column_name]).fetchOneRowIfExists();
        console.log('*******************', arguments, result.row, result.row || null);
        return (result.row || null);
    }
}
exports.InformationSchemaReader = InformationSchemaReader;
/** TODO: any en opts */
class Client {
    constructor(connOpts, client, _done, _opts) {
        this._done = _done;
        this.connected = null;
        this.fromPool = false;
        this._informationSchema = null;
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
            (0, exports.log)(MESSAGES_SEPARATOR, MESSAGES_SEPARATOR_TYPE);
            if (queryValues && queryValues.length) {
                (0, exports.log)('`' + sql + '\n`', 'QUERY-P');
                (0, exports.log)('-- ' + JSON.stringify(queryValues), 'QUERY-A');
                queryValues.forEach(function (value, i) {
                    sql = sql.replace(new RegExp('\\$' + (i + 1) + '\\b'), typeof value == "number" || typeof value == "boolean" ? value : quoteNullable(value));
                });
            }
            (0, exports.log)(sql + ';', 'QUERY');
        }
        var returnedQuery = this._client.query(new pg.Query(queryArguments[0], queryArguments[1]));
        return new Query(returnedQuery, this, this._client);
    }
    ;
    get informationSchema() {
        return this._informationSchema || new InformationSchemaReader(this);
    }
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
                var error = (0, cast_error_1.unexpected)(err);
                if (params.onerror) {
                    await params.onerror(error, params.rows[i_rows]);
                }
                else {
                    throw error;
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
        var stream = _client.query((0, pg_copy_streams_1.from)(sql));
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
        (0, exports.log)('--ERROR! ' + err.code + ', ' + err.message, 'ERROR');
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
                        (0, exports.log)('-- ' + JSON.stringify(row), 'ROW');
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
                        resolve(endMark.result);
                    }
                }
            }
            q._query.on('end', function (result) {
                // TODO: VER SI ESTO ES NECESARIO
                // result.client = q.client;
                if (exports.log) {
                    (0, exports.log)('-- ' + JSON.stringify(result.rows), 'RESULT');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFRLEVBQUMsWUFBWTtJQUNyQixXQUFXLEVBQUMsY0FBYztJQUMxQix3QkFBd0IsRUFBQyxnQ0FBZ0M7SUFDekQsc0JBQXNCLEVBQUMsOEJBQThCO0lBQ3JELHFCQUFxQixFQUFDLDBEQUEwRDtJQUNoRixvQkFBb0IsRUFBQyx5REFBeUQ7SUFDOUUsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELG9C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QUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDbEU7UUFDTCxDQUFDLENBQUMsQ0FBQztLQUNOO0lBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUM7QUFWRCxnREFVQztBQUFBLENBQUM7QUFFRiwwQkFBMEI7QUFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQgeyB1bmV4cGVjdGVkIH0gZnJvbSAnY2FzdC1lcnJvcic7XHJcbmltcG9ydCB7U3RyZWFtLCBUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XHJcblxyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRT0nLS0tLS0tJztcclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SPSctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7XHJcblxyXG5leHBvcnQgdmFyIG1lc3NhZ2VzID0ge1xyXG4gICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBidWxrSW5zZXJ0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGNvcHlGcm9tIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNlbnRlbmNlcyBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTcWxTY3JpcHQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50IGFscmVhZHkgZG9uZVwiLFxyXG4gICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwiY2xpZW50LmNvbm5lY3QgbXVzdCBubyByZWNlaXZlIHBhcmFtZXRlcnMsIGl0IHJldHVybnMgYSBQcm9taXNlXCIsXHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZnVuYyBpcyBleHBlcmltZW50YWxcIixcclxuICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBtdXN0IHJlY2VpdmUgYSBjYWxsYmFjayB0aGF0IGV4ZWN1dGVzIGZvciBlYWNoIHJvd1wiLFxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCBlcnJvciBwYXJzaW5nXCIsXHJcbiAgICBpbnNhbmVOYW1lOlwiaW5zYW5lIG5hbWVcIixcclxuICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBsYWNrIG9mIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGNvbm5lY3QgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGVuZCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJudWxsIGluIHF1b3RlTGl0ZXJhbFwiLFxyXG4gICAgb2J0YWluczE6XCJvYnRhaW5zICQxXCIsXHJcbiAgICBvYnRhaW5zTm9uZTpcIm9idGFpbnMgbm9uZVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgZmllbGQgYW5kICQxXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgcm93IGFuZCAkMVwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIGNhdGNoZWRcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIHRoZW5lZFwiLFxyXG4gICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgdW5iYWxhbmNlZENvbm5lY3Rpb246XCJwZ1Byb21pc2VTdHJpY3QuZGVidWcucG9vbCB1bmJhbGFuY2VkIGNvbm5lY3Rpb25cIixcclxufVxyXG5cclxuZXhwb3J0IHZhciBpMThuOntcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjp0eXBlb2YgbWVzc2FnZXMsXHJcbiAgICAgICAgW2s6c3RyaW5nXTpQYXJ0aWFsPHR5cGVvZiBtZXNzYWdlcz5cclxuICAgIH1cclxufSA9IHtcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjptZXNzYWdlcyxcclxuICAgICAgICBlczp7XHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGJ1bGtJbnNlcnQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGNvcHlGcm9tIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTZW50ZW5jZXMgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNxbFNjcmlwdCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBlbCBjbGllbnRlIHlhIGZ1ZSB0ZXJtaW5hZG9cIixcclxuICAgICAgICAgICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudC5jb25uZWN0IG5vIGRlYmUgcmVjaWJpciBwYXJhbWV0ZXRyb3MsIGRldnVlbHZlIHVuYSBQcm9tZXNhXCIsXHJcbiAgICAgICAgICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBlcyBleHBlcmltZW50YWxcIixcclxuICAgICAgICAgICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IGRlYmUgcmVjaWJpciB1bmEgZnVuY2lvbiBjYWxsYmFjayBwYXJhIGVqZWN1dGFyIGVuIGNhZGEgcmVnaXN0cm9cIixcclxuICAgICAgICAgICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJlcnJvciBhbCBwYXJzZWFyIGVuIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wXCIsXHJcbiAgICAgICAgICAgIGluc2FuZU5hbWU6XCJub21icmUgaW52YWxpZG8gcGFyYSBvYmpldG8gc3FsLCBkZWJlIHNlciBzb2xvIGxldHJhcywgbnVtZXJvcyBvIHJheWFzIGVtcGV6YW5kbyBwb3IgdW5hIGxldHJhXCIsXHJcbiAgICAgICAgICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBmYWx0YSBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgICAgICAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE5vIHNlIHB1ZWRlIGNvbmVjdGFyIHVuICdDbGllbnQnIGRlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogbm8gZGViZSB0ZXJtaW5hciBlbCBjbGllbnQgZGVzZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcImxhIGZ1bmNpb24gcXVvdGVMaXRlcmFsIG5vIGRlYmUgcmVjaWJpciBudWxsXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnMxOlwic2Ugb2J0dXZpZXJvbiAkMVwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zTm9uZTpcIm5vIHNlIG9idHV2byBuaW5ndW5vXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gc29sbyB2YWxvciAoY29sdW1uYSBvIGNhbXBvKSB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHJlZ2lzdHJvIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyBjYXRjaFwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gdGhlblwiLFxyXG4gICAgICAgICAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiAncXVlcnknIG5vIGNvbmVjdGFkYVwiLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldExhbmcobGFuZzpzdHJpbmcpe1xyXG4gICAgaWYobGFuZyBpbiBpMThuLm1lc3NhZ2VzKXtcclxuICAgICAgICBtZXNzYWdlcyA9IHsuLi5pMThuLm1lc3NhZ2VzLmVuLCAuLi5pMThuLm1lc3NhZ2VzW2xhbmddfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBkZWJ1Zzp7XHJcbiAgICBwb29sPzp0cnVlfHtcclxuICAgICAgICBba2V5OnN0cmluZ106eyBjb3VudDpudW1iZXIsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfX1cclxuICAgIH1cclxufT17fTtcclxuXHJcbmV4cG9ydCB2YXIgZGVmYXVsdHM9e1xyXG4gICAgcmVsZWFzZVRpbWVvdXQ6e2luYWN0aXZlOjYwMDAwLCBjb25uZWN0aW9uOjYwMDAwMH1cclxufTtcclxuXHJcbi8qIGluc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbm9Mb2coX21lc3NhZ2U6c3RyaW5nLCBfdHlwZTpzdHJpbmcpe31cclxuXHJcbmV4cG9ydCB2YXIgbG9nOihtZXNzYWdlOnN0cmluZywgdHlwZTpzdHJpbmcpPT52b2lkPW5vTG9nO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnQobmFtZTpzdHJpbmcpe1xyXG4gICAgaWYodHlwZW9mIG5hbWUhPT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuaW5zYW5lTmFtZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1wiJytuYW1lLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJztcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50TGlzdChvYmplY3ROYW1lczpzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gb2JqZWN0TmFtZXMubWFwKGZ1bmN0aW9uKG9iamVjdE5hbWUpeyByZXR1cm4gcXVvdGVJZGVudChvYmplY3ROYW1lKTsgfSkuam9pbignLCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW55UXVvdGVhYmxlID0gc3RyaW5nfG51bWJlcnxEYXRlfHtpc1JlYWxEYXRlOmJvb2xlYW4sIHRvWW1kOigpPT5zdHJpbmd9fHt0b1Bvc3RncmVzOigpPT5zdHJpbmd9fHt0b1N0cmluZzooKT0+c3RyaW5nfTtcclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTnVsbGFibGUoYW55VmFsdWU6bnVsbHxBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiAnbnVsbCc7XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dDpzdHJpbmdcclxuICAgIGlmKHR5cGVvZiBhbnlWYWx1ZT09PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZTtcclxuICAgIH1lbHNlIGlmKCEoYW55VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpKXtcclxuICAgICAgICB0ZXh0PWFueVZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZignaXNSZWFsRGF0ZScgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUuaXNSZWFsRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvWW1kKCk7XHJcbiAgICB9ZWxzZSBpZihhbnlWYWx1ZSBpbnN0YW5jZW9mIERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ3RvUG9zdGdyZXMnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLnRvUG9zdGdyZXMgaW5zdGFuY2VvZiBGdW5jdGlvbil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvUG9zdGdyZXMoKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHRleHQgPSBKU09OLnN0cmluZ2lmeShhbnlWYWx1ZSk7XHJcbiAgICB9XHJcbiAgICBpZih0ZXh0PT11bmRlZmluZWQpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncXVvdGFibGVOdWxsIGluc2FuZSB2YWx1ZTogJyt0eXBlb2YgYW55VmFsdWUpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gXCInXCIrdGV4dC5yZXBsYWNlKC8nL2csXCInJ1wiKStcIidcIjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUxpdGVyYWwoYW55VmFsdWU6QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubnVsbEluUXVvdGVMaXRlcmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBxdW90ZU51bGxhYmxlKGFueVZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBwYXJhbTNyZDRzcWw9KGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdLCBiYXNlPzpzdHJpbmcsIGtleXM/OnN0cmluZ3xzdHJpbmdbXSk9PlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09dHJ1ZT9gdG9fanNvbmIoJHtiYXNlfSkgLSAke2tleXMgaW5zdGFuY2VvZiBBcnJheT9rZXlzOmtleXM/LnNwbGl0KCcsJykubWFwKHg9PnF1b3RlTGl0ZXJhbCh4LnRyaW0oKSkpfWA6XHJcbiAgICBleHByT3JXaXRob3V0a2V5T3JLZXlzPT1udWxsP2B0b19qc29uYigke2Jhc2V9KWA6XHJcbiAgICB0eXBlb2YgZXhwck9yV2l0aG91dGtleU9yS2V5cyA9PSBcInN0cmluZ1wiP2V4cHJPcldpdGhvdXRrZXlPcktleXM6XHJcbiAgICBgdG9fanNvbmIoanNvbmJfYnVpbGRfb2JqZWN0KCR7ZXhwck9yV2l0aG91dGtleU9yS2V5cy5tYXAobmFtZT0+cXVvdGVMaXRlcmFsKG5hbWUpKycsICcrcXVvdGVJZGVudChuYW1lKSkuam9pbignLCAnKX0pKWBcclxuICAgIDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfYWdnKCR7cGFyYW0zcmQ0c3FsKGV4cHJPcldpdGhvdXRrZXlPcktleXMsJ2ouKicsb3JkZXJieSl9IE9SREVSIEJZICR7b3JkZXJieX0pIGZyb20gKCR7c3FsfSkgYXMgaiksJ1tdJzo6anNvbmIpYDtcclxuICAgIC8vIHJldHVybiBgKFNFTEVDVCBjb2FsZXNjZShqc29uYl9hZ2codG9fanNvbmIoai4qKSBPUkRFUiBCWSAke29yZGVyYnl9KSwnW10nOjpqc29uYikgZnJvbSAoJHtzcWx9KSBhcyBqKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsZXhwcjpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsa2V5czpzdHJpbmdbXSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyx3aXRob3V0S2V5czp0cnVlKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9vYmplY3RfYWdnKCR7aW5kZXhlZGJ5fSwke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLGluZGV4ZWRieSl9KSBmcm9tICgke3NxbH0pIGFzIGopLCd7fSc6Ompzb25iKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzQ29tbW9uPXt0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkLCB3aXRoPzpzdHJpbmd9XHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0ZpbGU9e2luU3RyZWFtPzp1bmRlZmluZWQsIGZpbGVuYW1lOnN0cmluZ30mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c1N0cmVhbT17aW5TdHJlYW06U3RyZWFtLGZpbGVuYW1lPzp1bmRlZmluZWR9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHM9Q29weUZyb21PcHRzRmlsZXxDb3B5RnJvbU9wdHNTdHJlYW1cclxuZXhwb3J0IHR5cGUgQnVsa0luc2VydFBhcmFtcz17c2NoZW1hPzpzdHJpbmcsdGFibGU6c3RyaW5nLGNvbHVtbnM6c3RyaW5nW10scm93czphbnlbXVtdLCBvbmVycm9yPzooZXJyOkVycm9yLCByb3c6YW55W10pPT5Qcm9taXNlPHZvaWQ+fVxyXG5cclxuZXhwb3J0IHR5cGUgQ29sdW1uID0ge2RhdGFfdHlwZTpzdHJpbmd9O1xyXG5cclxuZXhwb3J0IGNsYXNzIEluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBjbGllbnQ6Q2xpZW50KXtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvbHVtbih0YWJsZV9zY2hlbWE6c3RyaW5nLCB0YWJsZV9uYW1lOnN0cmluZywgY29sdW1uX25hbWU6c3RyaW5nKTpQcm9taXNlPENvbHVtbnxudWxsPntcclxuICAgICAgICB2YXIgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQucXVlcnkoYFxyXG4gICAgICAgICAgICBzZWxlY3QgKiBcclxuICAgICAgICAgICAgICAgIGZyb20gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnNcclxuICAgICAgICAgICAgICAgIHdoZXJlIHRhYmxlX3NjaGVtYT0kMVxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCB0YWJsZV9uYW1lPSQyXHJcbiAgICAgICAgICAgICAgICAgICAgYW5kIGNvbHVtbl9uYW1lPSQzO1xyXG4gICAgICAgIGAsW3RhYmxlX3NjaGVtYSwgdGFibGVfbmFtZSwgY29sdW1uX25hbWVdKS5mZXRjaE9uZVJvd0lmRXhpc3RzKCk7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKioqJyxhcmd1bWVudHMscmVzdWx0LnJvdywgcmVzdWx0LnJvd3x8bnVsbClcclxuICAgICAgICByZXR1cm4gKHJlc3VsdC5yb3cgfHwgbnVsbCkgYXMgQ29sdW1ufG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBUT0RPOiBhbnkgZW4gb3B0cyAqL1xyXG5leHBvcnQgY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBjb25uZWN0ZWQ6bnVsbHx7XHJcbiAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpudW1iZXIsXHJcbiAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bnVtYmVyXHJcbiAgICB9PW51bGw7XHJcbiAgICBwcml2YXRlIGZyb21Qb29sOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBwcml2YXRlIHBvc3RDb25uZWN0KCl7XHJcbiAgICAgICAgdmFyIG5vd1RzPW5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0ge1xyXG4gICAgICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm5vd1RzLFxyXG4gICAgICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpub3dUc1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHByaXZhdGUgX2NsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfXxudWxsO1xyXG4gICAgcHJpdmF0ZSBfaW5mb3JtYXRpb25TY2hlbWE6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ8bnVsbD1udWxsO1xyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6Q29ubmVjdFBhcmFtcylcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOm51bGwsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpLCBfZG9uZTooKT0+dm9pZCwgX29wdHM/OmFueSlcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50PzoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpLCBwcml2YXRlIF9kb25lPzooKT0+dm9pZCwgX29wdHM/OmFueSl7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50ID0gY2xpZW50IGFzIChwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgIGlmKGNvbm5PcHRzPT1udWxsKXtcclxuICAgICAgICAgICAgdGhpcy5mcm9tUG9vbD10cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgIC8qIERPSU5HXHJcbiAgICAgICAgICAgIGlmKHNlbGYub3B0cy50aW1lb3V0Q29udHJvbGxlcil7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxUaW1lb3V0KHNlbGYudGltZW91dENvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlbGYudGltZW91dENvbnRyb2xsZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdEVuZENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGlzLl9jbGllbnQgaW5zdGFuY2VvZiBwZy5DbGllbnQpe1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuZW5kKCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb25lKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRBbHJlYWR5RG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIERFQlVHR0lOR1xyXG4gICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50LS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnRUb0RvbmU9dGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHRoaXMuX2NsaWVudD1udWxsO1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgYXJndW1lbnRzIEFycmF5IGxpa2UgYW5kIGFwcGx5YWJsZVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lLmFwcGx5KGNsaWVudFRvRG9uZSwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcpOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nLCBwYXJhbXM6YW55W10pOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWxPYmplY3Q6e3RleHQ6c3RyaW5nLCB2YWx1ZXM6YW55W119KTpRdWVyeVxyXG4gICAgcXVlcnkoKTpRdWVyeXtcclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDtcclxuICAgICAgICB2YXIgcXVlcnlWYWx1ZXM9bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgdmFyIHNxbD1xdWVyeVRleHQ7XHJcbiAgICAgICAgICAgIGxvZyhNRVNTQUdFU19TRVBBUkFUT1IsIE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMgJiYgcXVlcnlWYWx1ZXMubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGxvZygnYCcrc3FsKydcXG5gJywnUVVFUlktUCcpO1xyXG4gICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHF1ZXJ5VmFsdWVzKSwnUVVFUlktQScpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlWYWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZTphbnksIGk6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzcWw9c3FsLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxcXCQnKyhpKzEpKydcXFxcYicpLCB0eXBlb2YgdmFsdWUgPT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgdmFsdWUgPT0gXCJib29sZWFuXCI/dmFsdWU6cXVvdGVOdWxsYWJsZSh2YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nKHNxbCsnOycsJ1FVRVJZJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZXR1cm5lZFF1ZXJ5ID0gdGhpcy5fY2xpZW50LnF1ZXJ5KG5ldyBwZy5RdWVyeShxdWVyeUFyZ3VtZW50c1swXSwgcXVlcnlBcmd1bWVudHNbMV0pKTtcclxuICAgICAgICByZXR1cm4gbmV3IFF1ZXJ5KHJldHVybmVkUXVlcnksIHRoaXMsIHRoaXMuX2NsaWVudCk7XHJcbiAgICB9O1xyXG4gICAgZ2V0IGluZm9ybWF0aW9uU2NoZW1hKCk6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm9ybWF0aW9uU2NoZW1hIHx8IG5ldyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcih0aGlzKTtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzOnN0cmluZ1tdKXtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaV9yb3dzPTA7XHJcbiAgICAgICAgd2hpbGUoaV9yb3dzPHBhcmFtcy5yb3dzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCk7XHJcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gdW5leHBlY3RlZChlcnIpO1xyXG4gICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBhcmFtcy5vbmVycm9yKGVycm9yLCBwYXJhbXMucm93c1tpX3Jvd3NdKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlfcm93cysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tUGFyc2VQYXJhbXMob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0pe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcHRzLmluU3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKG51bGxhYmxlOmFueSl7XHJcbiAgICAgICAgaWYobnVsbGFibGU9PW51bGwpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNlIGlmKHR5cGVvZiBudWxsYWJsZSA9PT0gXCJudW1iZXJcIiAmJiBpc05hTihudWxsYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbGFibGUudG9TdHJpbmcoKS5yZXBsYWNlKC8oXFxyKXwoXFxuKXwoXFx0KXwoXFxcXCkvZywgXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihfYWxsOnN0cmluZyxic3I6c3RyaW5nLGJzbjpzdHJpbmcsYnN0OnN0cmluZyxiczpzdHJpbmcpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzcikgcmV0dXJuICdcXFxccic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNuKSByZXR1cm4gJ1xcXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic3QpIHJldHVybiAnXFxcXHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlIHBvciBsYSByZWdleHAgZXMgaW1wb3NpYmxlIHF1ZSBwYXNlIGFsIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcik6c3RyaW5ne1xyXG4gICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgnJDEnLFxyXG4gICAgICAgIGNvdW50P21lc3NhZ2VzLm9idGFpbnMxLnJlcGxhY2UoJyQxJyxjb3VudC50b1N0cmluZygpKTptZXNzYWdlcy5vYnRhaW5zTm9uZVxyXG4gICAgKTtcclxufSBcclxuXHJcblxyXG5jbGFzcyBRdWVyeXtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX3F1ZXJ5OnBnLlF1ZXJ5LCBwdWJsaWMgY2xpZW50OkNsaWVudCwgcHJpdmF0ZSBfaW50ZXJuYWxDbGllbnQ6cGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgb25Ob3RpY2UoY2FsbGJhY2tOb3RpY2VDb25zdW1lcjoobm90aWNlOk5vdGljZSk9PnZvaWQpOlF1ZXJ5e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICB2YXIgbm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24obm90aWNlOk5vdGljZSl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSEgTEFDS1Mgb2YgYWN0aXZlUXVlcnlcclxuICAgICAgICAgICAgaWYocS5faW50ZXJuYWxDbGllbnQuYWN0aXZlUXVlcnk9PXEuX3F1ZXJ5KXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrTm90aWNlQ29uc3VtZXIobm90aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBAdHMtaWdub3JlIC5vbignbm90aWNlJykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgIHRoaXMuX2ludGVybmFsQ2xpZW50Lm9uKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB2YXIgcmVtb3ZlTm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24gcmVtb3ZlTm90aWNlQ2FsbGJhY2soKXtcclxuICAgICAgICAgICAgcS5faW50ZXJuYWxDbGllbnQucmVtb3ZlTGlzdGVuZXIoJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZW5kJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2Vycm9yJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZTxUUiBleHRlbmRzIFJlc3VsdEdlbmVyaWM+KFxyXG4gICAgICAgIGFkYXB0ZXJDYWxsYmFjazpudWxsfCgocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6VFIpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkKSxcclxuICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3c/Oihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4sIFxyXG4gICAgKTpQcm9taXNlPFRSPntcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICB2YXIgcGVuZGluZ1Jvd3M9MDtcclxuICAgICAgICAgICAgdmFyIGVuZE1hcms6bnVsbHx7cmVzdWx0OnBnLlF1ZXJ5UmVzdWx0fT1udWxsO1xyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZXJyb3InLGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdyb3cnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdyb3cnLGFzeW5jIGZ1bmN0aW9uKHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmKGNhbGxiYWNrRm9yRWFjaFJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ1Jvd3MrKztcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlbmRNYXJrLnJlc3VsdCBhcyB1bmtub3duIGFzIFRSKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocmVzdWx0LnJvd3MpLCAnUkVTVUxUJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbmRNYXJrPXtyZXN1bHR9O1xyXG4gICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgYXN5bmMgZmV0Y2hVbmlxdWVWYWx1ZShlcnJvck1lc3NhZ2U/OnN0cmluZyk6UHJvbWlzZTxSZXN1bHRWYWx1ZT4gIHsgXHJcbiAgICAgICAgdmFyIHtyb3csIC4uLnJlc3VsdH0gPSBhd2FpdCB0aGlzLmZldGNoVW5pcXVlUm93KCk7XHJcbiAgICAgICAgaWYocmVzdWx0LmZpZWxkcy5sZW5ndGghPT0xKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChcclxuICAgICAgICAgICAgICAgIG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lRmllbGRBbmQxLCByZXN1bHQuZmllbGRzLmxlbmd0aCkpLFxyXG4gICAgICAgICAgICAgICAgJzU0VTExISdcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHt2YWx1ZTpyb3dbcmVzdWx0LmZpZWxkc1swXS5uYW1lXSwgLi4ucmVzdWx0fTtcclxuICAgIH1cclxuICAgIGZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZT86c3RyaW5nLGFjY2VwdE5vUm93cz86Ym9vbGVhbik6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0T25lUm93KT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICBpZihyZXN1bHQucm93Q291bnQhPT0xICYmICghYWNjZXB0Tm9Sb3dzIHx8ICEhcmVzdWx0LnJvd0NvdW50KSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVSb3dBbmQxLHJlc3VsdC5yb3dDb3VudCkpO1xyXG4gICAgICAgICAgICAgICAgLy9AdHMtaWdub3JlIGVyci5jb2RlXHJcbiAgICAgICAgICAgICAgICBlcnIuY29kZSA9ICc1NDAxMSEnXHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLnJlc3R9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLnJlc3R9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZmV0Y2hPbmVSb3dJZkV4aXN0cyhlcnJvck1lc3NhZ2U/OnN0cmluZyk6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlLHRydWUpO1xyXG4gICAgfVxyXG4gICAgZmV0Y2hBbGwoKTpQcm9taXNlPFJlc3VsdFJvd3M+e1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdFJvd3MpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBleGVjdXRlKCk6UHJvbWlzZTxSZXN1bHRDb21tYW5kPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Q29tbWFuZCk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHZhciB7cm93cywgb2lkLCBmaWVsZHMsIC4uLnJlc3R9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3QpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZmV0Y2hSb3dCeVJvdyhjYjoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+KTpQcm9taXNlPHZvaWQ+eyBcclxuICAgICAgICBpZighKGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IobWVzc2FnZXMuZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2spO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSczOTAwNCEnO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5fZXhlY3V0ZShudWxsLCBjYik7XHJcbiAgICB9XHJcbiAgICBhc3luYyBvblJvdyhjYjoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+KTpQcm9taXNlPHZvaWQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFJvd0J5Um93KGNiKTtcclxuICAgIH1cclxuICAgIHRoZW4oKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVUaGVuZWQpXHJcbiAgICB9XHJcbiAgICBjYXRjaCgpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZUNhdGNoZWQpXHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGFsbFR5cGVzPWZhbHNlO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldEFsbFR5cGVzKCl7XHJcbiAgICB2YXIgVHlwZVN0b3JlID0gcmVxdWlyZSgndHlwZS1zdG9yZScpO1xyXG4gICAgdmFyIERBVEVfT0lEID0gMTA4MjtcclxuICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihEQVRFX09JRCwgZnVuY3Rpb24gcGFyc2VEYXRlKHZhbCl7XHJcbiAgICAgICByZXR1cm4gYmVzdEdsb2JhbHMuZGF0ZS5pc28odmFsKTtcclxuICAgIH0pO1xyXG4gICAgbGlrZUFyKFR5cGVTdG9yZS50eXBlKS5mb3JFYWNoKGZ1bmN0aW9uKF90eXBlRGVmLCB0eXBlTmFtZSl7XHJcbiAgICAgICAgdmFyIHR5cGVyID0gbmV3IFR5cGVTdG9yZS50eXBlW3R5cGVOYW1lXSgpO1xyXG4gICAgICAgIGlmKHR5cGVyLnBnU3BlY2lhbFBhcnNlKXtcclxuICAgICAgICAgICAgKHR5cGVyLnBnX09JRFN8fFt0eXBlci5wZ19PSURdKS5mb3JFYWNoKGZ1bmN0aW9uKE9JRDpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKE9JRCwgZnVuY3Rpb24odmFsKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZXIuZnJvbVN0cmluZyh2YWwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxudmFyIHBvb2xzOntcclxuICAgIFtrZXk6c3RyaW5nXTpwZy5Qb29sXHJcbn0gPSB7fVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoY29ubmVjdFBhcmFtZXRlcnM6Q29ubmVjdFBhcmFtcyk6UHJvbWlzZTxDbGllbnQ+e1xyXG4gICAgaWYoYWxsVHlwZXMpe1xyXG4gICAgICAgIHNldEFsbFR5cGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICB2YXIgaWRDb25uZWN0UGFyYW1ldGVycyA9IEpTT04uc3RyaW5naWZ5KGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICB2YXIgcG9vbCA9IHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdfHxuZXcgcGcuUG9vbChjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc10gPSBwb29sO1xyXG4gICAgICAgIHBvb2wuY29ubmVjdChmdW5jdGlvbihlcnIsIGNsaWVudCwgZG9uZSl7XHJcbiAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDbGllbnQobnVsbCwgY2xpZW50LCBkb25lIC8qLCBET0lORyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZVRpbWVvdXQ6IGNoYW5naW5nKHBnUHJvbWlzZVN0cmljdC5kZWZhdWx0cy5yZWxlYXNlVGltZW91dCxjb25uZWN0UGFyYW1ldGVycy5yZWxlYXNlVGltZW91dHx8e30pXHJcbiAgICAgICAgICAgICAgICB9Ki8pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIHJlYWR5TG9nID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4vKiB4eGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dMYXN0RXJyb3IobWVzc2FnZTpzdHJpbmcsIG1lc3NhZ2VUeXBlOnN0cmluZyk6dm9pZHtcclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICByZWFkeUxvZyA9IHJlYWR5TG9nLnRoZW4oXz0+ZnMud3JpdGVGaWxlKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lLGxpbmVzLmpvaW4oJ1xcbicpKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXR0cjIsIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHIyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2VUeXBlPT1NRVNTQUdFU19TRVBBUkFUT1JfVFlQRSl7XHJcbiAgICAgICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW21lc3NhZ2VUeXBlXSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5sb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSA9ICcuL2xvY2FsLXNxbC1lcnJvci5sb2cnO1xyXG5sb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcz17fSBhcyB7XHJcbiAgICBba2V5OnN0cmluZ106c3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9vbEJhbGFuY2VDb250cm9sKCl7XHJcbiAgICB2YXIgcnRhOnN0cmluZ1tdPVtdO1xyXG4gICAgaWYodHlwZW9mIGRlYnVnLnBvb2wgPT09IFwib2JqZWN0XCIpe1xyXG4gICAgICAgIGxpa2VBcihkZWJ1Zy5wb29sKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpe1xyXG4gICAgICAgICAgICBpZihwb29sLmNvdW50KXtcclxuICAgICAgICAgICAgICAgIHJ0YS5wdXNoKG1lc3NhZ2VzLnVuYmFsYW5jZWRDb25uZWN0aW9uKycgJyt1dGlsLmluc3BlY3QocG9vbCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnRhLmpvaW4oJ1xcbicpO1xyXG59O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxucHJvY2Vzcy5vbignZXhpdCcsZnVuY3Rpb24oKXtcclxuICAgIGNvbnNvbGUud2Fybihwb29sQmFsYW5jZUNvbnRyb2woKSk7XHJcbn0pO1xyXG4iXX0=