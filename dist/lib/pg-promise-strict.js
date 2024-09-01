"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readyLog = exports.allTypes = exports.Client = exports.InformationSchemaReader = exports.easy = exports.param3rd4sql = exports.logExceptions = exports.alsoLogRows = exports.log = exports.defaults = exports.debug = exports.i18n = exports.messages = void 0;
exports.setLang = setLang;
exports.noLog = noLog;
exports.quoteIdent = quoteIdent;
exports.quoteIdentList = quoteIdentList;
exports.quoteNullable = quoteNullable;
exports.quoteLiteral = quoteLiteral;
exports.json = json;
exports.jsono = jsono;
exports.adaptParameterTypes = adaptParameterTypes;
exports.setAllTypes = setAllTypes;
exports.connect = connect;
exports.logLastError = logLastError;
exports.poolBalanceControl = poolBalanceControl;
exports.shutdown = shutdown;
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
    /* istanbul ignore else */
    if (lang in exports.i18n.messages) {
        exports.messages = { ...exports.i18n.messages.en, ...exports.i18n.messages[lang] };
    }
}
exports.debug = {};
exports.defaults = {
    releaseTimeout: { inactive: 60000, connection: 600000 }
};
/* instanbul ignore next */
function noLog(_message, _type) { }
exports.log = noLog;
exports.alsoLogRows = false;
exports.logExceptions = false;
function quoteIdent(name) {
    if (typeof name !== "string") {
        if (exports.logExceptions) {
            console.error('Context for error', { name });
        }
        throw new Error(exports.messages.insaneName);
    }
    return '"' + name.replace(/"/g, '""') + '"';
}
;
function quoteIdentList(objectNames) {
    return objectNames.map(function (objectName) { return quoteIdent(objectName); }).join(',');
}
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
        if (exports.logExceptions) {
            console.error('Context for error', { anyValue });
        }
        throw new Error('quotableNull insane value: ' + typeof anyValue);
    }
    return "'" + text.replace(/'/g, "''") + "'";
}
;
function quoteLiteral(anyValue) {
    if (anyValue == null) {
        if (exports.logExceptions) {
            console.error('Context for error', { anyValue });
        }
        throw new Error(exports.messages.nullInQuoteLiteral);
    }
    return quoteNullable(anyValue);
}
;
const param3rd4sql = (exprOrWithoutkeyOrKeys, base, keys) => exprOrWithoutkeyOrKeys == true ? `to_jsonb(${base}) - ${keys instanceof Array ? keys : keys?.split(',').map(x => quoteLiteral(x.trim()))}` :
    exprOrWithoutkeyOrKeys == null ? `to_jsonb(${base})` :
        typeof exprOrWithoutkeyOrKeys == "string" ? exprOrWithoutkeyOrKeys :
            `to_jsonb(jsonb_build_object(${exprOrWithoutkeyOrKeys.map(name => quoteLiteral(name) + ', ' + quoteIdent(name)).join(', ')}))`;
exports.param3rd4sql = param3rd4sql;
function json(sql, orderby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_agg(${(0, exports.param3rd4sql)(exprOrWithoutkeyOrKeys, 'j.*', orderby)} ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}
function jsono(sql, indexedby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},${(0, exports.param3rd4sql)(exprOrWithoutkeyOrKeys, 'j.*', indexedby)}) from (${sql}) as j),'{}'::jsonb)`;
}
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
;
exports.easy = true; // deprecated!
class InformationSchemaReader {
    client;
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
        return (result.row || null);
    }
}
exports.InformationSchemaReader = InformationSchemaReader;
/** TODO: any en opts */
class Client {
    _done;
    connected = null;
    fromPool = false;
    postConnect() {
        var nowTs = new Date().getTime();
        this.connected = {
            lastOperationTimestamp: nowTs,
            lastConnectionTimestamp: nowTs
        };
    }
    _client;
    _informationSchema = null;
    constructor(connOpts, client, _done, _opts) {
        this._done = _done;
        this._client = client;
        if (connOpts == null) {
            if (client == undefined) {
                throw new Error("Client.constructor: connOpts & client undefined");
            }
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
        else /* istanbul ignore else */ if (queryArguments[0] instanceof Object) {
            queryText = queryArguments[0].text;
            queryValues = adaptParameterTypes(queryArguments[0].values || null);
            queryArguments[0].values = queryValues;
        }
        /* istanbul ignore else */
        if (exports.log) {
            // @ts-ignore if no queryText, the value must be showed also
            var sql = queryText;
            (0, exports.log)(MESSAGES_SEPARATOR, MESSAGES_SEPARATOR_TYPE);
            if (queryValues && queryValues.length) {
                (0, exports.log)('`' + sql + '\n`', 'QUERY-P');
                (0, exports.log)('-- ' + JSON.stringify(queryValues), 'QUERY-A');
                queryValues.forEach(function (value, i) {
                    sql = sql.replace(new RegExp('\\$' + (i + 1) + '\\b'), 
                    // @ts-expect-error numbers and booleans can be used here also
                    typeof value == "number" || typeof value == "boolean" ? value : quoteNullable(value));
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
        /* istanbul ignore next */
        if (!this._client || !this.connected) {
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
                    if (exports.logExceptions) {
                        console.error('Context for error', { row: params.rows[i_rows] });
                    }
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
                if (exports.logExceptions) {
                    console.error('Context for error', { _all });
                }
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
    /* istanbul ignore else */
    if (exports.log) {
        // @ts-ignore EXTENDED ERROR
        (0, exports.log)('--ERROR! ' + err.code + ', ' + err.message, 'ERROR');
    }
    return err;
}
function obtains(message, count) {
    return message.replace('$1', count ? exports.messages.obtains1.replace('$1', "" + count) : exports.messages.obtainsNone);
}
class Query {
    _query;
    client;
    _internalClient;
    constructor(_query, client, _internalClient) {
        this._query = _query;
        this.client = client;
        this._internalClient = _internalClient;
    }
    onNotice(callbackNoticeConsumer) {
        var q = this;
        var noticeCallback = function (notice) {
            /* istanbul ignore else */ // @ts-ignore  DOES NOT HAVE THE CORRECT TYPE! LACKS of activeQuery
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
                    /* istanbul ignore else */
                    if (exports.log && exports.alsoLogRows) {
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
                /* istanbul ignore else */
                if (exports.log && exports.alsoLogRows) {
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
;
var pools = {};
function connect(connectParameters) {
    /* istanbul ignore else */
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
;
async function shutdown(verbose) {
    var waitFor = [];
    for (var pool of likeAr.iterator(pools)) {
        waitFor.push(pool.end());
    }
    if (verbose)
        console.log('poolBalanceControl');
    console.warn(poolBalanceControl());
    await Promise.all(waitFor);
}
/* istanbul ignore next */
process.on('exit', function () {
    console.warn(poolBalanceControl());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBMkViLDBCQUtDO0FBYUQsc0JBQXNEO0FBTXRELGdDQVFDO0FBRUQsd0NBRUM7QUFHRCxzQ0F5QkM7QUFFRCxvQ0FRQztBQWFELG9CQUdDO0FBTUQsc0JBRUM7QUFFRCxrREFXQztBQXdnQkQsa0NBZ0JDO0FBTUQsMEJBbUJDO0FBS0Qsb0NBK0JDO0FBT0QsZ0RBVUM7QUFFRCw0QkFRQztBQXh5QkQsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFR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QixFQUFFLENBQUE7SUFDakMsS0FBSyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBQ0QsSUFBSSxPQUFPO1FBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9DLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQsMEJBQTBCO0FBQzFCLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFDO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xyXG5jb25zdCBwZ1R5cGVzID0gcGcudHlwZXM7XHJcblxyXG5pbXBvcnQge2Zyb20gYXMgY29weUZyb219IGZyb20gJ3BnLWNvcHktc3RyZWFtcyc7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XHJcbmltcG9ydCAqIGFzIGxpa2VBciBmcm9tICdsaWtlLWFyJztcclxuaW1wb3J0ICogYXMgYmVzdEdsb2JhbHMgZnJvbSAnYmVzdC1nbG9iYWxzJztcclxuaW1wb3J0IHsgdW5leHBlY3RlZCB9IGZyb20gJ2Nhc3QtZXJyb3InO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihsYW5nIGluIGkxOG4ubWVzc2FnZXMpe1xyXG4gICAgICAgIG1lc3NhZ2VzID0gey4uLmkxOG4ubWVzc2FnZXMuZW4sIC4uLmkxOG4ubWVzc2FnZXNbbGFuZ119O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIGRlYnVnOntcclxuICAgIHBvb2w/OnRydWV8e1xyXG4gICAgICAgIFtrZXk6c3RyaW5nXTp7IGNvdW50Om51bWJlciwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fVxyXG4gICAgfVxyXG59PXt9O1xyXG5cclxuZXhwb3J0IHZhciBkZWZhdWx0cz17XHJcbiAgICByZWxlYXNlVGltZW91dDp7aW5hY3RpdmU6NjAwMDAsIGNvbm5lY3Rpb246NjAwMDAwfVxyXG59O1xyXG5cclxuLyogaW5zdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBub0xvZyhfbWVzc2FnZTpzdHJpbmcsIF90eXBlOnN0cmluZyl7fVxyXG5cclxuZXhwb3J0IHZhciBsb2c6KG1lc3NhZ2U6c3RyaW5nLCB0eXBlOnN0cmluZyk9PnZvaWQ9bm9Mb2c7XHJcbmV4cG9ydCB2YXIgYWxzb0xvZ1Jvd3MgPSBmYWxzZTtcclxuZXhwb3J0IHZhciBsb2dFeGNlcHRpb25zID0gZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudChuYW1lOnN0cmluZyl7XHJcbiAgICBpZih0eXBlb2YgbmFtZSE9PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse25hbWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuaW5zYW5lTmFtZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1wiJytuYW1lLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJztcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50TGlzdChvYmplY3ROYW1lczpzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gb2JqZWN0TmFtZXMubWFwKGZ1bmN0aW9uKG9iamVjdE5hbWUpeyByZXR1cm4gcXVvdGVJZGVudChvYmplY3ROYW1lKTsgfSkuam9pbignLCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW55UXVvdGVhYmxlID0gc3RyaW5nfG51bWJlcnxEYXRlfHtpc1JlYWxEYXRlOmJvb2xlYW4sIHRvWW1kOigpPT5zdHJpbmd9fHt0b1Bvc3RncmVzOigpPT5zdHJpbmd9fHt0b1N0cmluZzooKT0+c3RyaW5nfTtcclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTnVsbGFibGUoYW55VmFsdWU6bnVsbHxBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiAnbnVsbCc7XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dDpzdHJpbmdcclxuICAgIGlmKHR5cGVvZiBhbnlWYWx1ZT09PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZTtcclxuICAgIH1lbHNlIGlmKCEoYW55VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpKXtcclxuICAgICAgICB0ZXh0PWFueVZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZignaXNSZWFsRGF0ZScgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUuaXNSZWFsRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvWW1kKCk7XHJcbiAgICB9ZWxzZSBpZihhbnlWYWx1ZSBpbnN0YW5jZW9mIERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ3RvUG9zdGdyZXMnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLnRvUG9zdGdyZXMgaW5zdGFuY2VvZiBGdW5jdGlvbil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvUG9zdGdyZXMoKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHRleHQgPSBKU09OLnN0cmluZ2lmeShhbnlWYWx1ZSk7XHJcbiAgICB9XHJcbiAgICBpZih0ZXh0PT11bmRlZmluZWQpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse2FueVZhbHVlfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdxdW90YWJsZU51bGwgaW5zYW5lIHZhbHVlOiAnK3R5cGVvZiBhbnlWYWx1ZSlcclxuICAgIH1cclxuICAgIHJldHVybiBcIidcIit0ZXh0LnJlcGxhY2UoLycvZyxcIicnXCIpK1wiJ1wiO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTGl0ZXJhbChhbnlWYWx1ZTpBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse2FueVZhbHVlfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGFyYW0zcmQ0c3FsPShleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSwgYmFzZT86c3RyaW5nLCBrZXlzPzpzdHJpbmd8c3RyaW5nW10pPT5cclxuICAgIGV4cHJPcldpdGhvdXRrZXlPcktleXM9PXRydWU/YHRvX2pzb25iKCR7YmFzZX0pIC0gJHtrZXlzIGluc3RhbmNlb2YgQXJyYXk/a2V5czprZXlzPy5zcGxpdCgnLCcpLm1hcCh4PT5xdW90ZUxpdGVyYWwoeC50cmltKCkpKX1gOlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09bnVsbD9gdG9fanNvbmIoJHtiYXNlfSlgOlxyXG4gICAgdHlwZW9mIGV4cHJPcldpdGhvdXRrZXlPcktleXMgPT0gXCJzdHJpbmdcIj9leHByT3JXaXRob3V0a2V5T3JLZXlzOlxyXG4gICAgYHRvX2pzb25iKGpzb25iX2J1aWxkX29iamVjdCgke2V4cHJPcldpdGhvdXRrZXlPcktleXMubWFwKG5hbWU9PnF1b3RlTGl0ZXJhbChuYW1lKSsnLCAnK3F1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywgJyl9KSlgXHJcbiAgICA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByOnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxrZXlzOnN0cmluZ1tdKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLHdpdGhvdXRLZXlzOnRydWUpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX2FnZygke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLG9yZGVyYnkpfSBPUkRFUiBCWSAke29yZGVyYnl9KSBmcm9tICgke3NxbH0pIGFzIGopLCdbXSc6Ompzb25iKWA7XHJcbiAgICAvLyByZXR1cm4gYChTRUxFQ1QgY29hbGVzY2UoanNvbmJfYWdnKHRvX2pzb25iKGouKikgT1JERVIgQlkgJHtvcmRlcmJ5fSksJ1tdJzo6anNvbmIpIGZyb20gKCR7c3FsfSkgYXMgailgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfb2JqZWN0X2FnZygke2luZGV4ZWRieX0sJHtwYXJhbTNyZDRzcWwoZXhwck9yV2l0aG91dGtleU9yS2V5cywnai4qJyxpbmRleGVkYnkpfSkgZnJvbSAoJHtzcWx9KSBhcyBqKSwne30nOjpqc29uYilgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdFBhcmFtZXRlclR5cGVzKHBhcmFtZXRlcnM/OmFueVtdKXtcclxuICAgIC8vIEB0cy1pZ25vcmUgXHJcbiAgICBpZihwYXJhbWV0ZXJzPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJhbWV0ZXJzLm1hcChmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgaWYodmFsdWUgJiYgdmFsdWUudHlwZVN0b3JlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTGl0ZXJhbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgZWFzeTpib29sZWFuPXRydWU7IC8vIGRlcHJlY2F0ZWQhXHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0UGFyYW1zPXtcclxuICAgIG1vdG9yPzpcInBvc3RncmVzXCJcclxuICAgIGRhdGFiYXNlPzpzdHJpbmdcclxuICAgIHVzZXI/OnN0cmluZ1xyXG4gICAgcGFzc3dvcmQ/OnN0cmluZ1xyXG4gICAgcG9ydD86bnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0NvbW1vbj17dGFibGU6c3RyaW5nLGNvbHVtbnM/OnN0cmluZ1tdLGRvbmU/OihlcnI/OkVycm9yKT0+dm9pZCwgd2l0aD86c3RyaW5nfVxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNGaWxlPXtpblN0cmVhbT86dW5kZWZpbmVkLCBmaWxlbmFtZTpzdHJpbmd9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNTdHJlYW09e2luU3RyZWFtOlN0cmVhbSxmaWxlbmFtZT86dW5kZWZpbmVkfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzPUNvcHlGcm9tT3B0c0ZpbGV8Q29weUZyb21PcHRzU3RyZWFtXHJcbmV4cG9ydCB0eXBlIEJ1bGtJbnNlcnRQYXJhbXM9e3NjaGVtYT86c3RyaW5nLHRhYmxlOnN0cmluZyxjb2x1bW5zOnN0cmluZ1tdLHJvd3M6YW55W11bXSwgb25lcnJvcj86KGVycjpFcnJvciwgcm93OmFueVtdKT0+UHJvbWlzZTx2b2lkPn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbHVtbiA9IHtkYXRhX3R5cGU6c3RyaW5nfTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY2xpZW50OkNsaWVudCl7XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb2x1bW4odGFibGVfc2NoZW1hOnN0cmluZywgdGFibGVfbmFtZTpzdHJpbmcsIGNvbHVtbl9uYW1lOnN0cmluZyk6UHJvbWlzZTxDb2x1bW58bnVsbD57XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnF1ZXJ5KGBcclxuICAgICAgICAgICAgc2VsZWN0ICogXHJcbiAgICAgICAgICAgICAgICBmcm9tIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zXHJcbiAgICAgICAgICAgICAgICB3aGVyZSB0YWJsZV9zY2hlbWE9JDFcclxuICAgICAgICAgICAgICAgICAgICBhbmQgdGFibGVfbmFtZT0kMlxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCBjb2x1bW5fbmFtZT0kMztcclxuICAgICAgICBgLFt0YWJsZV9zY2hlbWEsIHRhYmxlX25hbWUsIGNvbHVtbl9uYW1lXSkuZmV0Y2hPbmVSb3dJZkV4aXN0cygpOyBcclxuICAgICAgICByZXR1cm4gKHJlc3VsdC5yb3cgfHwgbnVsbCkgYXMgQ29sdW1ufG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBUT0RPOiBhbnkgZW4gb3B0cyAqL1xyXG5leHBvcnQgY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBjb25uZWN0ZWQ6bnVsbHx7XHJcbiAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpudW1iZXIsXHJcbiAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bnVtYmVyXHJcbiAgICB9PW51bGw7XHJcbiAgICBwcml2YXRlIGZyb21Qb29sOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBwcml2YXRlIHBvc3RDb25uZWN0KCl7XHJcbiAgICAgICAgdmFyIG5vd1RzPW5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0ge1xyXG4gICAgICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm5vd1RzLFxyXG4gICAgICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpub3dUc1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHByaXZhdGUgX2NsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfXxudWxsO1xyXG4gICAgcHJpdmF0ZSBfaW5mb3JtYXRpb25TY2hlbWE6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ8bnVsbD1udWxsO1xyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6Q29ubmVjdFBhcmFtcylcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOm51bGwsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnR8dW5kZWZpbmVkKSwgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpDb25uZWN0UGFyYW1zfG51bGwsIGNsaWVudD86KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50fHVuZGVmaW5lZCksIHByaXZhdGUgX2RvbmU/OigpPT52b2lkLCBfb3B0cz86YW55KXtcclxuICAgICAgICB0aGlzLl9jbGllbnQgPSBjbGllbnQgYXMgKHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ307XHJcbiAgICAgICAgaWYoY29ubk9wdHM9PW51bGwpe1xyXG4gICAgICAgICAgICBpZiAoY2xpZW50ID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2xpZW50LmNvbnN0cnVjdG9yOiBjb25uT3B0cyAmIGNsaWVudCB1bmRlZmluZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmZyb21Qb29sPXRydWU7XHJcbiAgICAgICAgICAgIHRoaXMucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgLyogRE9JTkdcclxuICAgICAgICAgICAgaWYoc2VsZi5vcHRzLnRpbWVvdXRDb250cm9sbGVyKXtcclxuICAgICAgICAgICAgICAgIGNhbmNlbFRpbWVvdXQoc2VsZi50aW1lb3V0Q29udHJvbGxlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VsZi50aW1lb3V0Q29udHJvbGxlciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZihuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdE9wZXJhdGlvblRpbWVzdGFtcCAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmVcclxuICAgICAgICAgICAgICAgIHx8IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0Q29ubmVjdGlvblRpbWVzdGFtcCA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5jb25uZWN0aW9uXHJcbiAgICAgICAgICAgICAgICApe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LE1hdGgubWluKDEwMDAsc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlLzQpKTtcclxuICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaWYoZGVidWcucG9vbCl7XHJcbiAgICAgICAgICAgICAgICBpZihkZWJ1Zy5wb29sPT09dHJ1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWcucG9vbD17fTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCEodGhpcy5fY2xpZW50LnNlY3JldEtleSBpbiBkZWJ1Zy5wb29sKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XSA9IHtjbGllbnQ6dGhpcy5fY2xpZW50LCBjb3VudDowfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0uY291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvLyBwZ1Byb21pc2VTdHJpY3QubG9nKCduZXcgQ2xpZW50Jyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudCA9IG5ldyBwZy5DbGllbnQoY29ubk9wdHMpIGFzIHBnLkNsaWVudCZ7c2VjcmV0S2V5OnN0cmluZ307XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgPSB0aGlzLl9jbGllbnQuc2VjcmV0S2V5fHwnc2VjcmV0XycrTWF0aC5yYW5kb20oKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25uZWN0KCl7XHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoKXtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnQgPSB0aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBjbGllbnQuY29ubmVjdChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlbGYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBlbmQoKXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdEVuZENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmKHRoaXMuX2NsaWVudCBpbnN0YW5jZW9mIHBnLkNsaWVudCl7XHJcbiAgICAgICAgICAgIHRoaXMuX2NsaWVudC5lbmQoKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGRvbmUoKXtcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudEFscmVhZHlEb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoZGVidWcucG9vbCl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgREVCVUdHSU5HXHJcbiAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0uY291bnQtLTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudFRvRG9uZT10aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50PW51bGw7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBhcmd1bWVudHMgQXJyYXkgbGlrZSBhbmQgYXBwbHlhYmxlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmUuYXBwbHkoY2xpZW50VG9Eb25lLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZyk6UXVlcnlcclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcsIHBhcmFtczphbnlbXSk6UXVlcnlcclxuICAgIHF1ZXJ5KHNxbE9iamVjdDp7dGV4dDpzdHJpbmcsIHZhbHVlczphbnlbXX0pOlF1ZXJ5XHJcbiAgICBxdWVyeSgpOlF1ZXJ5e1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlOb3RDb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgcXVlcnlBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBxdWVyeVRleHQ6c3RyaW5nO1xyXG4gICAgICAgIHZhciBxdWVyeVZhbHVlczpudWxsfGFueVtdPW51bGw7XHJcbiAgICAgICAgaWYodHlwZW9mIHF1ZXJ5QXJndW1lbnRzWzBdID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IHF1ZXJ5QXJndW1lbnRzWzFdID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1sxXXx8bnVsbCk7XHJcbiAgICAgICAgfWVsc2UgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi8gaWYocXVlcnlBcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBPYmplY3Qpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXS50ZXh0O1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMF0udmFsdWVzfHxudWxsKTtcclxuICAgICAgICAgICAgcXVlcnlBcmd1bWVudHNbMF0udmFsdWVzID0gcXVlcnlWYWx1ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBpZiBubyBxdWVyeVRleHQsIHRoZSB2YWx1ZSBtdXN0IGJlIHNob3dlZCBhbHNvXHJcbiAgICAgICAgICAgIHZhciBzcWw9cXVlcnlUZXh0O1xyXG4gICAgICAgICAgICBsb2coTUVTU0FHRVNfU0VQQVJBVE9SLCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRSk7XHJcbiAgICAgICAgICAgIGlmKHF1ZXJ5VmFsdWVzICYmIHF1ZXJ5VmFsdWVzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBsb2coJ2AnK3NxbCsnXFxuYCcsJ1FVRVJZLVAnKTtcclxuICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShxdWVyeVZhbHVlcyksJ1FVRVJZLUEnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWU6YW55LCBpOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3FsPXNxbC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwkJysoaSsxKSsnXFxcXGInKSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgbnVtYmVycyBhbmQgYm9vbGVhbnMgY2FuIGJlIHVzZWQgaGVyZSBhbHNvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PSBcImJvb2xlYW5cIj92YWx1ZTpxdW90ZU51bGxhYmxlKHZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2coc3FsKyc7JywnUVVFUlknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJldHVybmVkUXVlcnkgPSB0aGlzLl9jbGllbnQucXVlcnkobmV3IHBnLlF1ZXJ5KHF1ZXJ5QXJndW1lbnRzWzBdLCBxdWVyeUFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUXVlcnkocmV0dXJuZWRRdWVyeSwgdGhpcywgdGhpcy5fY2xpZW50KTtcclxuICAgIH07XHJcbiAgICBnZXQgaW5mb3JtYXRpb25TY2hlbWEoKTpJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgICAgICByZXR1cm4gdGhpcy5faW5mb3JtYXRpb25TY2hlbWEgfHwgbmV3IEluZm9ybWF0aW9uU2NoZW1hUmVhZGVyKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXM6c3RyaW5nW10pe1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjZHA6UHJvbWlzZTxSZXN1bHRDb21tYW5kfHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2Upe1xyXG4gICAgICAgICAgICBjZHAgPSBjZHAudGhlbihhc3luYyBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYoIXNlbnRlbmNlLnRyaW0oKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBzZWxmLnF1ZXJ5KHNlbnRlbmNlKS5leGVjdXRlKCkuY2F0Y2goZnVuY3Rpb24oZXJyOkVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNkcDtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTcWxTY3JpcHQoZmlsZU5hbWU6c3RyaW5nKXtcclxuICAgICAgICB2YXIgc2VsZj10aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzcWwgPSBcIklOU0VSVCBJTlRPIFwiKyhwYXJhbXMuc2NoZW1hP3F1b3RlSWRlbnQocGFyYW1zLnNjaGVtYSkrJy4nOicnKStcclxuICAgICAgICAgICAgcXVvdGVJZGVudChwYXJhbXMudGFibGUpK1wiIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKHF1b3RlSWRlbnQpLmpvaW4oJywgJykrXCIpIFZBTFVFUyAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChmdW5jdGlvbihfbmFtZTpzdHJpbmcsIGlfbmFtZTpudW1iZXIpeyByZXR1cm4gJyQnKyhpX25hbWUrMSk7IH0pK1wiKVwiO1xyXG4gICAgICAgIHZhciBpX3Jvd3M9MDtcclxuICAgICAgICB3aGlsZShpX3Jvd3M8cGFyYW1zLnJvd3MubGVuZ3RoKXtcclxuICAgICAgICAgICAgdHJ5e1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgc2VsZi5xdWVyeShzcWwsIHBhcmFtcy5yb3dzW2lfcm93c10pLmV4ZWN1dGUoKTtcclxuICAgICAgICAgICAgfWNhdGNoKGVycil7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSB1bmV4cGVjdGVkKGVycik7XHJcbiAgICAgICAgICAgICAgICBpZihwYXJhbXMub25lcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcGFyYW1zLm9uZXJyb3IoZXJyb3IsIHBhcmFtcy5yb3dzW2lfcm93c10pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7cm93OiBwYXJhbXMucm93c1tpX3Jvd3NdfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaV9yb3dzKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21QYXJzZVBhcmFtcyhvcHRzOkNvcHlGcm9tT3B0cyl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmcm9tID0gb3B0cy5pblN0cmVhbSA/ICdTVERJTicgOiBxdW90ZUxpdGVyYWwob3B0cy5maWxlbmFtZSk7XHJcbiAgICAgICAgdmFyIHNxbCA9IGBDT1BZICR7b3B0cy50YWJsZX0gJHtvcHRzLmNvbHVtbnM/YCgke29wdHMuY29sdW1ucy5tYXAobmFtZT0+cXVvdGVJZGVudChuYW1lKSkuam9pbignLCcpfSlgOicnfSBGUk9NICR7ZnJvbX0gJHtvcHRzLndpdGg/J1dJVEggJytvcHRzLndpdGg6Jyd9YDtcclxuICAgICAgICByZXR1cm4ge3NxbCwgX2NsaWVudDp0aGlzLl9jbGllbnR9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgY29weUZyb21GaWxlKG9wdHM6Q29weUZyb21PcHRzRmlsZSk6UHJvbWlzZTxSZXN1bHRDb21tYW5kPntcclxuICAgICAgICB2YXIge3NxbH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkoc3FsKS5leGVjdXRlKCk7XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHNTdHJlYW0pe1xyXG4gICAgICAgIHZhciB7c3FsLCBfY2xpZW50fSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICB2YXIgc3RyZWFtID0gX2NsaWVudC5xdWVyeShjb3B5RnJvbShzcWwpKTtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2VuZCcsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignY2xvc2UnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0pe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcHRzLmluU3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKG51bGxhYmxlOmFueSl7XHJcbiAgICAgICAgaWYobnVsbGFibGU9PW51bGwpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNlIGlmKHR5cGVvZiBudWxsYWJsZSA9PT0gXCJudW1iZXJcIiAmJiBpc05hTihudWxsYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbGFibGUudG9TdHJpbmcoKS5yZXBsYWNlKC8oXFxyKXwoXFxuKXwoXFx0KXwoXFxcXCkvZywgXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihfYWxsOnN0cmluZyxic3I6c3RyaW5nLGJzbjpzdHJpbmcsYnN0OnN0cmluZyxiczpzdHJpbmcpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzcikgcmV0dXJuICdcXFxccic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNuKSByZXR1cm4gJ1xcXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic3QpIHJldHVybiAnXFxcXHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlIHBvciBsYSByZWdleHAgZXMgaW1wb3NpYmxlIHF1ZSBwYXNlIGFsIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse19hbGx9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmcpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21BcnJheVN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIGMgPSB0aGlzO1xyXG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKHtcclxuICAgICAgICAgICAgd3JpdGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHJlYWRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm0oYXJyYXlDaHVuazphbnlbXSwgX2VuY29kaW5nLCBuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaChhcnJheUNodW5rLm1hcCh4PT5jLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKHgpKS5qb2luKCdcXHQnKSsnXFxuJylcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmx1c2gobmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goJ1xcXFwuXFxuJyk7XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIge2luU3RyZWFtLCAuLi5yZXN0fSA9IG9wdHM7XHJcbiAgICAgICAgaW5TdHJlYW0ucGlwZSh0cmFuc2Zvcm0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSh7aW5TdHJlYW06dHJhbnNmb3JtLCAuLi5yZXN0fSlcclxuICAgIH1cclxufVxyXG5cclxudmFyIHF1ZXJ5UmVzdWx0OnBnLlF1ZXJ5UmVzdWx0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHR7XHJcbiAgICByb3dDb3VudDpudW1iZXJ8bnVsbFxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyfG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvdyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdzp7W2tleTpzdHJpbmddOmFueX1cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvd0lmRXhpc3RzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Pzp7W2tleTpzdHJpbmddOmFueX18bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Um93cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvd3M6e1trZXk6c3RyaW5nXTphbnl9W11cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFZhbHVlIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgdmFsdWU6YW55XHJcbn1cclxuLy8gZXhwb3J0IGludGVyZmFjZSBSZXN1bHRHZW5lcmljIGV4dGVuZHMgUmVzdWx0VmFsdWUsIFJlc3VsdFJvd3MsIFJlc3VsdE9uZVJvd0lmRXhpc3RzLCBSZXN1bHRPbmVSb3csIFJlc3VsdHt9XHJcbmV4cG9ydCB0eXBlIFJlc3VsdEdlbmVyaWMgPSBSZXN1bHRWYWx1ZXxSZXN1bHRSb3dzfFJlc3VsdE9uZVJvd0lmRXhpc3RzfFJlc3VsdE9uZVJvd3xSZXN1bHR8UmVzdWx0Q29tbWFuZFxyXG5cclxuLypcclxuZnVuY3Rpb24gYnVpbGRRdWVyeUNvdW50ZXJBZGFwdGVyKFxyXG4gICAgbWluQ291bnRSb3c6bnVtYmVyLCBcclxuICAgIG1heENvdW50Um93Om51bWJlciwgXHJcbiAgICBleHBlY3RUZXh0OnN0cmluZywgXHJcbiAgICBjYWxsYmFja090aGVyQ29udHJvbD86KHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkXHJcbil7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcXVlcnlDb3VudGVyQWRhcHRlcihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKXsgXHJcbiAgICAgICAgaWYocmVzdWx0LnJvd3MubGVuZ3RoPG1pbkNvdW50Um93IHx8IHJlc3VsdC5yb3dzLmxlbmd0aD5tYXhDb3VudFJvdyApe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyAnK2V4cGVjdFRleHQrJyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dzLmxlbmd0aCsnIHJvd3MnKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKGNhbGxiYWNrT3RoZXJDb250cm9sKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrT3RoZXJDb250cm9sKHJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLm90aGVyfSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5vdGhlcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4qL1xyXG5cclxudHlwZSBOb3RpY2UgPSBzdHJpbmc7XHJcblxyXG5mdW5jdGlvbiBsb2dFcnJvcklmTmVlZGVkPFQ+KGVycjpFcnJvciwgY29kZT86VCk6RXJyb3J7XHJcbiAgICBpZihjb2RlICE9IG51bGwpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBlcnIuY29kZT1jb2RlO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcnxudWxsKTpzdHJpbmd7XHJcbiAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKCckMScsXHJcbiAgICAgICAgY291bnQ/bWVzc2FnZXMub2J0YWluczEucmVwbGFjZSgnJDEnLFwiXCIrY291bnQpOm1lc3NhZ2VzLm9idGFpbnNOb25lXHJcbiAgICApO1xyXG59IFxyXG5cclxuXHJcbmNsYXNzIFF1ZXJ5e1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfcXVlcnk6cGcuUXVlcnksIHB1YmxpYyBjbGllbnQ6Q2xpZW50LCBwcml2YXRlIF9pbnRlcm5hbENsaWVudDpwZy5DbGllbnR8cGcuUG9vbENsaWVudCl7XHJcbiAgICB9XHJcbiAgICBvbk5vdGljZShjYWxsYmFja05vdGljZUNvbnN1bWVyOihub3RpY2U6Tm90aWNlKT0+dm9pZCk6UXVlcnl7XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub3RpY2VDYWxsYmFjaz1mdW5jdGlvbihub3RpY2U6Tm90aWNlKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi8gLy8gQHRzLWlnbm9yZSAgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFISBMQUNLUyBvZiBhY3RpdmVRdWVyeVxyXG4gICAgICAgICAgICBpZihxLl9pbnRlcm5hbENsaWVudC5hY3RpdmVRdWVyeT09cS5fcXVlcnkpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tOb3RpY2VDb25zdW1lcihub3RpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdub3RpY2UnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgdGhpcy5faW50ZXJuYWxDbGllbnQub24oJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHZhciByZW1vdmVOb3RpY2VDYWxsYmFjaz1mdW5jdGlvbiByZW1vdmVOb3RpY2VDYWxsYmFjaygpe1xyXG4gICAgICAgICAgICBxLl9pbnRlcm5hbENsaWVudC5yZW1vdmVMaXN0ZW5lcignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlbmQnLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZXJyb3InLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBwcml2YXRlIF9leGVjdXRlPFRSIGV4dGVuZHMgUmVzdWx0R2VuZXJpYz4oXHJcbiAgICAgICAgYWRhcHRlckNhbGxiYWNrOm51bGx8KChyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpUUik9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWQpLFxyXG4gICAgICAgIGNhbGxiYWNrRm9yRWFjaFJvdz86KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPiwgXHJcbiAgICApOlByb21pc2U8VFI+e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VFI+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBwZW5kaW5nUm93cz0wO1xyXG4gICAgICAgICAgICB2YXIgZW5kTWFyazpudWxsfHtyZXN1bHQ6cGcuUXVlcnlSZXN1bHR9PW51bGw7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlcnJvcicsZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ3JvdycpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ3JvdycsYXN5bmMgZnVuY3Rpb24ocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tGb3JFYWNoUm93KXtcclxuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nUm93cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nICYmIGFsc29Mb2dSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJvdyksICdST1cnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgY2FsbGJhY2tGb3JFYWNoUm93KHJvdywgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAtLXBlbmRpbmdSb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgYWRkUm93IG9tbWl0ZWQgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5hZGRSb3cocm93KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdoZW5FbmQoKXtcclxuICAgICAgICAgICAgICAgIGlmKGVuZE1hcmsgJiYgIXBlbmRpbmdSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihhZGFwdGVyQ2FsbGJhY2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGFwdGVyQ2FsbGJhY2soZW5kTWFyay5yZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZW5kTWFyay5yZXN1bHQgYXMgdW5rbm93biBhcyBUUik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgICAgICBpZihsb2cgJiYgYWxzb0xvZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyZXN1bHQucm93cyksICdSRVNVTFQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVuZE1hcms9e3Jlc3VsdH07XHJcbiAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKFxyXG4gICAgICAgICAgICAgICAgbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDEsIHJlc3VsdC5maWVsZHMubGVuZ3RoKSksXHJcbiAgICAgICAgICAgICAgICAnNTRVMTEhJ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge3ZhbHVlOnJvd1tyZXN1bHQuZmllbGRzWzBdLm5hbWVdLCAuLi5yZXN1bHR9O1xyXG4gICAgfVxyXG4gICAgZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlPzpzdHJpbmcsYWNjZXB0Tm9Sb3dzPzpib29sZWFuKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRPbmVSb3cpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIGlmKHJlc3VsdC5yb3dDb3VudCE9PTEgJiYgKCFhY2NlcHROb1Jvd3MgfHwgISFyZXN1bHQucm93Q291bnQpKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZVJvd0FuZDEscmVzdWx0LnJvd0NvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmUgZXJyLmNvZGVcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlID0gJzU0MDExISdcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2UsdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcihtZXNzYWdlcy5mZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjayk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZVRoZW5lZClcclxuICAgIH1cclxuICAgIGNhdGNoKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZClcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYoYWxsVHlwZXMpe1xyXG4gICAgICAgIHNldEFsbFR5cGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICB2YXIgaWRDb25uZWN0UGFyYW1ldGVycyA9IEpTT04uc3RyaW5naWZ5KGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICB2YXIgcG9vbCA9IHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdfHxuZXcgcGcuUG9vbChjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc10gPSBwb29sO1xyXG4gICAgICAgIHBvb2wuY29ubmVjdChmdW5jdGlvbihlcnIsIGNsaWVudCwgZG9uZSl7XHJcbiAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDbGllbnQobnVsbCwgY2xpZW50LCBkb25lIC8qLCBET0lORyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZVRpbWVvdXQ6IGNoYW5naW5nKHBnUHJvbWlzZVN0cmljdC5kZWZhdWx0cy5yZWxlYXNlVGltZW91dCxjb25uZWN0UGFyYW1ldGVycy5yZWxlYXNlVGltZW91dHx8e30pXHJcbiAgICAgICAgICAgICAgICB9Ki8pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIHJlYWR5TG9nID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4vKiB4eGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dMYXN0RXJyb3IobWVzc2FnZTpzdHJpbmcsIG1lc3NhZ2VUeXBlOnN0cmluZyk6dm9pZHtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihtZXNzYWdlVHlwZSl7XHJcbiAgICAgICAgaWYobWVzc2FnZVR5cGU9PSdFUlJPUicpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICBpZihsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbGluZXM9WydQRy1FUlJPUiAnK21lc3NhZ2VdO1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0ciBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZXMucHVzaChcIi0tLS0tLS0gXCIrYXR0citcIjpcXG5cIitsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICAgICAgcmVhZHlMb2cgPSByZWFkeUxvZy50aGVuKF89PmZzLndyaXRlRmlsZShsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSxsaW5lcy5qb2luKCdcXG4nKSkpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihtZXNzYWdlVHlwZT09TUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpe1xyXG4gICAgICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaChtZXNzYWdlcy51bmJhbGFuY2VkQ29ubmVjdGlvbisnICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaHV0ZG93bih2ZXJib3NlOmJvb2xlYW4pe1xyXG4gICAgdmFyIHdhaXRGb3I6IFByb21pc2U8dm9pZD5bXSA9IFtdXHJcbiAgICBmb3IgKHZhciBwb29sIG9mIGxpa2VBci5pdGVyYXRvcihwb29scykpIHtcclxuICAgICAgICB3YWl0Rm9yLnB1c2gocG9vbC5lbmQoKSk7XHJcbiAgICB9XHJcbiAgICBpZiAodmVyYm9zZSkgY29uc29sZS5sb2coJ3Bvb2xCYWxhbmNlQ29udHJvbCcpO1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKHdhaXRGb3IpO1xyXG59XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==