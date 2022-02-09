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
        /* istanbul ignore next */
        if (!this._client) {
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
        /* istanbul ignore next */
        if (this.fromPool) {
            throw new Error(exports.messages.mustNotEndClientFromPool);
        }
        /* istanbul ignore else */
        if (this._client instanceof pg.Client) {
            this._client.end();
        }
        else {
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
        /* istanbul ignore next */
        if (!this.connected || !this._client) {
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
        /* istanbul ignore else */
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
        /* istanbul ignore next */
        if (!this._client || !this.connected) {
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
        /* istanbul ignore next */
        if (!this._client || !this.connected) {
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
        /* istanbul ignore next */
        if (!this._client || !this.connected) {
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
        /* istanbul ignore else */
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
    /* istanbul ignore else */
    if (messageType) {
        if (messageType == 'ERROR') {
            /* istanbul ignore else */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFRLEVBQUMsWUFBWTtJQUNyQixXQUFXLEVBQUMsY0FBYztJQUMxQix3QkFBd0IsRUFBQyxnQ0FBZ0M7SUFDekQsc0JBQXNCLEVBQUMsOEJBQThCO0lBQ3JELHFCQUFxQixFQUFDLDBEQUEwRDtJQUNoRixvQkFBb0IsRUFBQyx5REFBeUQ7SUFDOUUsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELG9C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QyxJQUFJLENBQUMsZ0JBQVEsQ0FBQyxvQkFBb0IsR0FBQyxHQUFHLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQ2xFO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDTjtJQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBVkQsZ0RBVUM7QUFBQSxDQUFDO0FBRUYsMEJBQTBCO0FBQzFCLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xyXG5jb25zdCBwZ1R5cGVzID0gcGcudHlwZXM7XHJcblxyXG5pbXBvcnQge2Zyb20gYXMgY29weUZyb219IGZyb20gJ3BnLWNvcHktc3RyZWFtcyc7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XHJcbmltcG9ydCAqIGFzIGxpa2VBciBmcm9tICdsaWtlLWFyJztcclxuaW1wb3J0ICogYXMgYmVzdEdsb2JhbHMgZnJvbSAnYmVzdC1nbG9iYWxzJztcclxuaW1wb3J0IHsgdW5leHBlY3RlZCB9IGZyb20gJ2Nhc3QtZXJyb3InO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmluc2FuZU5hbWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdcIicrbmFtZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIic7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudExpc3Qob2JqZWN0TmFtZXM6c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIG9iamVjdE5hbWVzLm1hcChmdW5jdGlvbihvYmplY3ROYW1lKXsgcmV0dXJuIHF1b3RlSWRlbnQob2JqZWN0TmFtZSk7IH0pLmpvaW4oJywnKTtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFueVF1b3RlYWJsZSA9IHN0cmluZ3xudW1iZXJ8RGF0ZXx7aXNSZWFsRGF0ZTpib29sZWFuLCB0b1ltZDooKT0+c3RyaW5nfXx7dG9Qb3N0Z3JlczooKT0+c3RyaW5nfXx7dG9TdHJpbmc6KCk9PnN0cmluZ307XHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZU51bGxhYmxlKGFueVZhbHVlOm51bGx8QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gJ251bGwnO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHQ6c3RyaW5nXHJcbiAgICBpZih0eXBlb2YgYW55VmFsdWU9PT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWU7XHJcbiAgICB9ZWxzZSBpZighKGFueVZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSl7XHJcbiAgICAgICAgdGV4dD1hbnlWYWx1ZS50b1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ2lzUmVhbERhdGUnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLmlzUmVhbERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1ltZCgpO1xyXG4gICAgfWVsc2UgaWYoYW55VmFsdWUgaW5zdGFuY2VvZiBEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9JU09TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCd0b1Bvc3RncmVzJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS50b1Bvc3RncmVzIGluc3RhbmNlb2YgRnVuY3Rpb24pe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1Bvc3RncmVzKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkoYW55VmFsdWUpO1xyXG4gICAgfVxyXG4gICAgaWYodGV4dD09dW5kZWZpbmVkKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1b3RhYmxlTnVsbCBpbnNhbmUgdmFsdWU6ICcrdHlwZW9mIGFueVZhbHVlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGFyYW0zcmQ0c3FsPShleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSwgYmFzZT86c3RyaW5nLCBrZXlzPzpzdHJpbmd8c3RyaW5nW10pPT5cclxuICAgIGV4cHJPcldpdGhvdXRrZXlPcktleXM9PXRydWU/YHRvX2pzb25iKCR7YmFzZX0pIC0gJHtrZXlzIGluc3RhbmNlb2YgQXJyYXk/a2V5czprZXlzPy5zcGxpdCgnLCcpLm1hcCh4PT5xdW90ZUxpdGVyYWwoeC50cmltKCkpKX1gOlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09bnVsbD9gdG9fanNvbmIoJHtiYXNlfSlgOlxyXG4gICAgdHlwZW9mIGV4cHJPcldpdGhvdXRrZXlPcktleXMgPT0gXCJzdHJpbmdcIj9leHByT3JXaXRob3V0a2V5T3JLZXlzOlxyXG4gICAgYHRvX2pzb25iKGpzb25iX2J1aWxkX29iamVjdCgke2V4cHJPcldpdGhvdXRrZXlPcktleXMubWFwKG5hbWU9PnF1b3RlTGl0ZXJhbChuYW1lKSsnLCAnK3F1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywgJyl9KSlgXHJcbiAgICA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByOnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxrZXlzOnN0cmluZ1tdKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLHdpdGhvdXRLZXlzOnRydWUpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX2FnZygke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLG9yZGVyYnkpfSBPUkRFUiBCWSAke29yZGVyYnl9KSBmcm9tICgke3NxbH0pIGFzIGopLCdbXSc6Ompzb25iKWA7XHJcbiAgICAvLyByZXR1cm4gYChTRUxFQ1QgY29hbGVzY2UoanNvbmJfYWdnKHRvX2pzb25iKGouKikgT1JERVIgQlkgJHtvcmRlcmJ5fSksJ1tdJzo6anNvbmIpIGZyb20gKCR7c3FsfSkgYXMgailgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfb2JqZWN0X2FnZygke2luZGV4ZWRieX0sJHtwYXJhbTNyZDRzcWwoZXhwck9yV2l0aG91dGtleU9yS2V5cywnai4qJyxpbmRleGVkYnkpfSkgZnJvbSAoJHtzcWx9KSBhcyBqKSwne30nOjpqc29uYilgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdFBhcmFtZXRlclR5cGVzKHBhcmFtZXRlcnM/OmFueVtdKXtcclxuICAgIC8vIEB0cy1pZ25vcmUgXHJcbiAgICBpZihwYXJhbWV0ZXJzPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJhbWV0ZXJzLm1hcChmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgaWYodmFsdWUgJiYgdmFsdWUudHlwZVN0b3JlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTGl0ZXJhbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgZWFzeTpib29sZWFuPXRydWU7IC8vIGRlcHJlY2F0ZWQhXHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0UGFyYW1zPXtcclxuICAgIG1vdG9yPzpcInBvc3RncmVzXCJcclxuICAgIGRhdGFiYXNlPzpzdHJpbmdcclxuICAgIHVzZXI/OnN0cmluZ1xyXG4gICAgcGFzc3dvcmQ/OnN0cmluZ1xyXG4gICAgcG9ydD86bnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0NvbW1vbj17dGFibGU6c3RyaW5nLGNvbHVtbnM/OnN0cmluZ1tdLGRvbmU/OihlcnI/OkVycm9yKT0+dm9pZCwgd2l0aD86c3RyaW5nfVxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNGaWxlPXtpblN0cmVhbT86dW5kZWZpbmVkLCBmaWxlbmFtZTpzdHJpbmd9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNTdHJlYW09e2luU3RyZWFtOlN0cmVhbSxmaWxlbmFtZT86dW5kZWZpbmVkfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzPUNvcHlGcm9tT3B0c0ZpbGV8Q29weUZyb21PcHRzU3RyZWFtXHJcbmV4cG9ydCB0eXBlIEJ1bGtJbnNlcnRQYXJhbXM9e3NjaGVtYT86c3RyaW5nLHRhYmxlOnN0cmluZyxjb2x1bW5zOnN0cmluZ1tdLHJvd3M6YW55W11bXSwgb25lcnJvcj86KGVycjpFcnJvciwgcm93OmFueVtdKT0+UHJvbWlzZTx2b2lkPn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbHVtbiA9IHtkYXRhX3R5cGU6c3RyaW5nfTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY2xpZW50OkNsaWVudCl7XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb2x1bW4odGFibGVfc2NoZW1hOnN0cmluZywgdGFibGVfbmFtZTpzdHJpbmcsIGNvbHVtbl9uYW1lOnN0cmluZyk6UHJvbWlzZTxDb2x1bW58bnVsbD57XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnF1ZXJ5KGBcclxuICAgICAgICAgICAgc2VsZWN0ICogXHJcbiAgICAgICAgICAgICAgICBmcm9tIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zXHJcbiAgICAgICAgICAgICAgICB3aGVyZSB0YWJsZV9zY2hlbWE9JDFcclxuICAgICAgICAgICAgICAgICAgICBhbmQgdGFibGVfbmFtZT0kMlxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCBjb2x1bW5fbmFtZT0kMztcclxuICAgICAgICBgLFt0YWJsZV9zY2hlbWEsIHRhYmxlX25hbWUsIGNvbHVtbl9uYW1lXSkuZmV0Y2hPbmVSb3dJZkV4aXN0cygpOyBcclxuICAgICAgICBjb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKioqKicsYXJndW1lbnRzLHJlc3VsdC5yb3csIHJlc3VsdC5yb3d8fG51bGwpXHJcbiAgICAgICAgcmV0dXJuIChyZXN1bHQucm93IHx8IG51bGwpIGFzIENvbHVtbnxudWxsO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIHByaXZhdGUgX2luZm9ybWF0aW9uU2NoZW1hOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVyfG51bGw9bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXMpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpudWxsLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSwgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpDb25uZWN0UGFyYW1zfG51bGwsIGNsaWVudD86KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSwgcHJpdmF0ZSBfZG9uZT86KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDtcclxuICAgICAgICB2YXIgcXVlcnlWYWx1ZXM9bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICB2YXIgc3FsPXF1ZXJ5VGV4dDtcclxuICAgICAgICAgICAgbG9nKE1FU1NBR0VTX1NFUEFSQVRPUiwgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpO1xyXG4gICAgICAgICAgICBpZihxdWVyeVZhbHVlcyAmJiBxdWVyeVZhbHVlcy5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgbG9nKCdgJytzcWwrJ1xcbmAnLCdRVUVSWS1QJyk7XHJcbiAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocXVlcnlWYWx1ZXMpLCdRVUVSWS1BJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlOmFueSwgaTpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNxbD1zcWwucmVwbGFjZShuZXcgUmVnRXhwKCdcXFxcJCcrKGkrMSkrJ1xcXFxiJyksIHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PSBcImJvb2xlYW5cIj92YWx1ZTpxdW90ZU51bGxhYmxlKHZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2coc3FsKyc7JywnUVVFUlknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJldHVybmVkUXVlcnkgPSB0aGlzLl9jbGllbnQucXVlcnkobmV3IHBnLlF1ZXJ5KHF1ZXJ5QXJndW1lbnRzWzBdLCBxdWVyeUFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUXVlcnkocmV0dXJuZWRRdWVyeSwgdGhpcywgdGhpcy5fY2xpZW50KTtcclxuICAgIH07XHJcbiAgICBnZXQgaW5mb3JtYXRpb25TY2hlbWEoKTpJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5mb3JtYXRpb25TY2hlbWEgfHwgbmV3IEluZm9ybWF0aW9uU2NoZW1hUmVhZGVyKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXM6c3RyaW5nW10pe1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjZHA6UHJvbWlzZTxSZXN1bHRDb21tYW5kfHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2Upe1xyXG4gICAgICAgICAgICBjZHAgPSBjZHAudGhlbihhc3luYyBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYoIXNlbnRlbmNlLnRyaW0oKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBzZWxmLnF1ZXJ5KHNlbnRlbmNlKS5leGVjdXRlKCkuY2F0Y2goZnVuY3Rpb24oZXJyOkVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNkcDtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTcWxTY3JpcHQoZmlsZU5hbWU6c3RyaW5nKXtcclxuICAgICAgICB2YXIgc2VsZj10aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaV9yb3dzPTA7XHJcbiAgICAgICAgd2hpbGUoaV9yb3dzPHBhcmFtcy5yb3dzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCk7XHJcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gdW5leHBlY3RlZChlcnIpO1xyXG4gICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBhcmFtcy5vbmVycm9yKGVycm9yLCBwYXJhbXMucm93c1tpX3Jvd3NdKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlfcm93cysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tUGFyc2VQYXJhbXMob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZnJvbSA9IG9wdHMuaW5TdHJlYW0gPyAnU1RESU4nIDogcXVvdGVMaXRlcmFsKG9wdHMuZmlsZW5hbWUpO1xyXG4gICAgICAgIHZhciBzcWwgPSBgQ09QWSAke29wdHMudGFibGV9ICR7b3B0cy5jb2x1bW5zP2AoJHtvcHRzLmNvbHVtbnMubWFwKG5hbWU9PnF1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywnKX0pYDonJ30gRlJPTSAke2Zyb219ICR7b3B0cy53aXRoPydXSVRIICcrb3B0cy53aXRoOicnfWA7XHJcbiAgICAgICAgcmV0dXJuIHtzcWwsIF9jbGllbnQ6dGhpcy5fY2xpZW50fTtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvcHlGcm9tRmlsZShvcHRzOkNvcHlGcm9tT3B0c0ZpbGUpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57XHJcbiAgICAgICAgdmFyIHtzcWx9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KHNxbCkuZXhlY3V0ZSgpO1xyXG4gICAgfVxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIge3NxbCwgX2NsaWVudH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgdmFyIHN0cmVhbSA9IF9jbGllbnQucXVlcnkoY29weUZyb20oc3FsKSk7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlbmQnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Nsb3NlJywgb3B0cy5kb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZihvcHRzLmluU3RyZWFtKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgICAgICBvcHRzLmluU3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5waXBlKHN0cmVhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdHJlYW07XHJcbiAgICB9XHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcChudWxsYWJsZTphbnkpe1xyXG4gICAgICAgIGlmKG51bGxhYmxlPT1udWxsKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZSBpZih0eXBlb2YgbnVsbGFibGUgPT09IFwibnVtYmVyXCIgJiYgaXNOYU4obnVsbGFibGUpKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxhYmxlLnRvU3RyaW5nKCkucmVwbGFjZSgvKFxccil8KFxcbil8KFxcdCl8KFxcXFwpL2csIFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oX2FsbDpzdHJpbmcsYnNyOnN0cmluZyxic246c3RyaW5nLGJzdDpzdHJpbmcsYnM6c3RyaW5nKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihic3IpIHJldHVybiAnXFxcXHInO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzbikgcmV0dXJuICdcXFxcbic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnN0KSByZXR1cm4gJ1xcXFx0JztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSBwb3IgbGEgcmVnZXhwIGVzIGltcG9zaWJsZSBxdWUgcGFzZSBhbCBlbHNlICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnMpIHJldHVybiAnXFxcXFxcXFwnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IEVzdG8gZXMgaW1wb3NpYmxlIHF1ZSBzdWNlZGEgKi9cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmcpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21BcnJheVN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIGMgPSB0aGlzO1xyXG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKHtcclxuICAgICAgICAgICAgd3JpdGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHJlYWRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm0oYXJyYXlDaHVuazphbnlbXSwgX2VuY29kaW5nLCBuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaChhcnJheUNodW5rLm1hcCh4PT5jLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKHgpKS5qb2luKCdcXHQnKSsnXFxuJylcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmx1c2gobmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goJ1xcXFwuXFxuJyk7XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIge2luU3RyZWFtLCAuLi5yZXN0fSA9IG9wdHM7XHJcbiAgICAgICAgaW5TdHJlYW0ucGlwZSh0cmFuc2Zvcm0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSh7aW5TdHJlYW06dHJhbnNmb3JtLCAuLi5yZXN0fSlcclxuICAgIH1cclxufVxyXG5cclxudmFyIHF1ZXJ5UmVzdWx0OnBnLlF1ZXJ5UmVzdWx0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHR7XHJcbiAgICByb3dDb3VudDpudW1iZXJcclxuICAgIGZpZWxkczp0eXBlb2YgcXVlcnlSZXN1bHQuZmllbGRzXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRDb21tYW5ke1xyXG4gICAgY29tbWFuZDpzdHJpbmcsIHJvd0NvdW50Om51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93IGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Ontba2V5OnN0cmluZ106YW55fVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93SWZFeGlzdHMgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c/Ontba2V5OnN0cmluZ106YW55fXxudWxsXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRSb3dzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93czp7W2tleTpzdHJpbmddOmFueX1bXVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0VmFsdWUgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICB2YWx1ZTphbnlcclxufVxyXG4vLyBleHBvcnQgaW50ZXJmYWNlIFJlc3VsdEdlbmVyaWMgZXh0ZW5kcyBSZXN1bHRWYWx1ZSwgUmVzdWx0Um93cywgUmVzdWx0T25lUm93SWZFeGlzdHMsIFJlc3VsdE9uZVJvdywgUmVzdWx0e31cclxuZXhwb3J0IHR5cGUgUmVzdWx0R2VuZXJpYyA9IFJlc3VsdFZhbHVlfFJlc3VsdFJvd3N8UmVzdWx0T25lUm93SWZFeGlzdHN8UmVzdWx0T25lUm93fFJlc3VsdHxSZXN1bHRDb21tYW5kXHJcblxyXG4vKlxyXG5mdW5jdGlvbiBidWlsZFF1ZXJ5Q291bnRlckFkYXB0ZXIoXHJcbiAgICBtaW5Db3VudFJvdzpudW1iZXIsIFxyXG4gICAgbWF4Q291bnRSb3c6bnVtYmVyLCBcclxuICAgIGV4cGVjdFRleHQ6c3RyaW5nLCBcclxuICAgIGNhbGxiYWNrT3RoZXJDb250cm9sPzoocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWRcclxuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbiBxdWVyeUNvdW50ZXJBZGFwdGVyKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpeyBcclxuICAgICAgICBpZihyZXN1bHQucm93cy5sZW5ndGg8bWluQ291bnRSb3cgfHwgcmVzdWx0LnJvd3MubGVuZ3RoPm1heENvdW50Um93ICl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKCdxdWVyeSBleHBlY3RzICcrZXhwZWN0VGV4dCsnIGFuZCBvYnRhaW5zICcrcmVzdWx0LnJvd3MubGVuZ3RoKycgcm93cycpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSc1NDAxMSEnO1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tPdGhlckNvbnRyb2wpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tPdGhlckNvbnRyb2wocmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ub3RoZXJ9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLm90aGVyfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiovXHJcblxyXG50eXBlIE5vdGljZSA9IHN0cmluZztcclxuXHJcbmZ1bmN0aW9uIGxvZ0Vycm9ySWZOZWVkZWQ8VD4oZXJyOkVycm9yLCBjb2RlPzpUKTpFcnJvcntcclxuICAgIGlmKGNvZGUgIT0gbnVsbCl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGVyci5jb2RlPWNvZGU7XHJcbiAgICB9XHJcbiAgICBpZihsb2cpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBsb2coJy0tRVJST1IhICcrZXJyLmNvZGUrJywgJytlcnIubWVzc2FnZSwgJ0VSUk9SJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXJyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvYnRhaW5zKG1lc3NhZ2U6c3RyaW5nLCBjb3VudDpudW1iZXIpOnN0cmluZ3tcclxuICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoJyQxJyxcclxuICAgICAgICBjb3VudD9tZXNzYWdlcy5vYnRhaW5zMS5yZXBsYWNlKCckMScsY291bnQudG9TdHJpbmcoKSk6bWVzc2FnZXMub2J0YWluc05vbmVcclxuICAgICk7XHJcbn0gXHJcblxyXG5cclxuY2xhc3MgUXVlcnl7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVyeTpwZy5RdWVyeSwgcHVibGljIGNsaWVudDpDbGllbnQsIHByaXZhdGUgX2ludGVybmFsQ2xpZW50OnBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KXtcclxuICAgIH1cclxuICAgIG9uTm90aWNlKGNhbGxiYWNrTm90aWNlQ29uc3VtZXI6KG5vdGljZTpOb3RpY2UpPT52b2lkKTpRdWVyeXtcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uKG5vdGljZTpOb3RpY2Upe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlICBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhIExBQ0tTIG9mIGFjdGl2ZVF1ZXJ5XHJcbiAgICAgICAgICAgIGlmKHEuX2ludGVybmFsQ2xpZW50LmFjdGl2ZVF1ZXJ5PT1xLl9xdWVyeSl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja05vdGljZUNvbnN1bWVyKG5vdGljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ25vdGljZScpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICB0aGlzLl9pbnRlcm5hbENsaWVudC5vbignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdmFyIHJlbW92ZU5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uIHJlbW92ZU5vdGljZUNhbGxiYWNrKCl7XHJcbiAgICAgICAgICAgIHEuX2ludGVybmFsQ2xpZW50LnJlbW92ZUxpc3RlbmVyKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2VuZCcscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlcnJvcicscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHByaXZhdGUgX2V4ZWN1dGU8VFIgZXh0ZW5kcyBSZXN1bHRHZW5lcmljPihcclxuICAgICAgICBhZGFwdGVyQ2FsbGJhY2s6bnVsbHwoKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlRSKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZCksXHJcbiAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93Pzoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+LCBcclxuICAgICk6UHJvbWlzZTxUUj57XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgdmFyIHBlbmRpbmdSb3dzPTA7XHJcbiAgICAgICAgICAgIHZhciBlbmRNYXJrOm51bGx8e3Jlc3VsdDpwZy5RdWVyeVJlc3VsdH09bnVsbDtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2Vycm9yJyxmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC5vbigncm93JykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbigncm93Jyxhc3luYyBmdW5jdGlvbihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZihjYWxsYmFja0ZvckVhY2hSb3cpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdSb3dzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJvdyksICdST1cnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgY2FsbGJhY2tGb3JFYWNoUm93KHJvdywgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAtLXBlbmRpbmdSb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgYWRkUm93IG9tbWl0ZWQgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5hZGRSb3cocm93KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdoZW5FbmQoKXtcclxuICAgICAgICAgICAgICAgIGlmKGVuZE1hcmsgJiYgIXBlbmRpbmdSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihhZGFwdGVyQ2FsbGJhY2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGFwdGVyQ2FsbGJhY2soZW5kTWFyay5yZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZW5kTWFyay5yZXN1bHQgYXMgdW5rbm93biBhcyBUUik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIGlmKGFsbFR5cGVzKXtcclxuICAgICAgICBzZXRBbGxUeXBlcygpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgdmFyIGlkQ29ubmVjdFBhcmFtZXRlcnMgPSBKU09OLnN0cmluZ2lmeShjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgdmFyIHBvb2wgPSBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXXx8bmV3IHBnLlBvb2woY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdID0gcG9vbDtcclxuICAgICAgICBwb29sLmNvbm5lY3QoZnVuY3Rpb24oZXJyLCBjbGllbnQsIGRvbmUpe1xyXG4gICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShuZXcgQ2xpZW50KG51bGwsIGNsaWVudCwgZG9uZSAvKiwgRE9JTkcge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VUaW1lb3V0OiBjaGFuZ2luZyhwZ1Byb21pc2VTdHJpY3QuZGVmYXVsdHMucmVsZWFzZVRpbWVvdXQsY29ubmVjdFBhcmFtZXRlcnMucmVsZWFzZVRpbWVvdXR8fHt9KVxyXG4gICAgICAgICAgICAgICAgfSovKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciByZWFkeUxvZyA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuLyogeHhpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nTGFzdEVycm9yKG1lc3NhZ2U6c3RyaW5nLCBtZXNzYWdlVHlwZTpzdHJpbmcpOnZvaWR7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYobWVzc2FnZVR5cGUpe1xyXG4gICAgICAgIGlmKG1lc3NhZ2VUeXBlPT0nRVJST1InKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgaWYobG9nTGFzdEVycm9yLmluRmlsZU5hbWUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzPVsnUEctRVJST1IgJyttZXNzYWdlXTtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goXCItLS0tLS0tIFwiK2F0dHIrXCI6XFxuXCIrbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgICAgIHJlYWR5TG9nID0gcmVhZHlMb2cudGhlbihfPT5mcy53cml0ZUZpbGUobG9nTGFzdEVycm9yLmluRmlsZU5hbWUsbGluZXMuam9pbignXFxuJykpKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyMiBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhdHRyMiwgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cjJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYobWVzc2FnZVR5cGU9PU1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKXtcclxuICAgICAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbbWVzc2FnZVR5cGVdID0gbWVzc2FnZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lID0gJy4vbG9jYWwtc3FsLWVycm9yLmxvZyc7XHJcbmxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzPXt9IGFzIHtcclxuICAgIFtrZXk6c3RyaW5nXTpzdHJpbmdcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb29sQmFsYW5jZUNvbnRyb2woKXtcclxuICAgIHZhciBydGE6c3RyaW5nW109W107XHJcbiAgICBpZih0eXBlb2YgZGVidWcucG9vbCA9PT0gXCJvYmplY3RcIil7XHJcbiAgICAgICAgbGlrZUFyKGRlYnVnLnBvb2wpLmZvckVhY2goZnVuY3Rpb24ocG9vbCl7XHJcbiAgICAgICAgICAgIGlmKHBvb2wuY291bnQpe1xyXG4gICAgICAgICAgICAgICAgcnRhLnB1c2gobWVzc2FnZXMudW5iYWxhbmNlZENvbm5lY3Rpb24rJyAnK3V0aWwuaW5zcGVjdChwb29sKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBydGEuam9pbignXFxuJyk7XHJcbn07XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==