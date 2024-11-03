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
        var cdp;
        for (var sentence of sentences) {
            cdp = await self.query(sentence).execute();
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBMkViLDBCQUtDO0FBYUQsc0JBQXNEO0FBTXRELGdDQVFDO0FBRUQsd0NBRUM7QUFHRCxzQ0F5QkM7QUFFRCxvQ0FRQztBQWFELG9CQUdDO0FBTUQsc0JBRUM7QUFFRCxrREFXQztBQWlnQkQsa0NBZ0JDO0FBTUQsMEJBbUJDO0FBS0Qsb0NBK0JDO0FBT0QsZ0RBVUM7QUFFRCw0QkFRQztBQWp5QkQsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFR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SUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztJQUNuQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELDBCQUEwQjtBQUMxQixPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQztJQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCAqIGFzIHBnIGZyb20gJ3BnJztcclxuY29uc3QgcGdUeXBlcyA9IHBnLnR5cGVzO1xyXG5cclxuaW1wb3J0IHtmcm9tIGFzIGNvcHlGcm9tfSBmcm9tICdwZy1jb3B5LXN0cmVhbXMnO1xyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xyXG5pbXBvcnQgKiBhcyBsaWtlQXIgZnJvbSAnbGlrZS1hcic7XHJcbmltcG9ydCAqIGFzIGJlc3RHbG9iYWxzIGZyb20gJ2Jlc3QtZ2xvYmFscyc7XHJcbmltcG9ydCB7IHVuZXhwZWN0ZWQgfSBmcm9tICdjYXN0LWVycm9yJztcclxuaW1wb3J0IHtTdHJlYW0sIFRyYW5zZm9ybX0gZnJvbSAnc3RyZWFtJztcclxuXHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFPSctLS0tLS0nO1xyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1I9Jy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJztcclxuXHJcbmV4cG9ydCB2YXIgbWVzc2FnZXMgPSB7XHJcbiAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGJ1bGtJbnNlcnQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gY29weUZyb20gb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU2VudGVuY2VzIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNxbFNjcmlwdCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQgYWxyZWFkeSBkb25lXCIsXHJcbiAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJjbGllbnQuY29ubmVjdCBtdXN0IG5vIHJlY2VpdmUgcGFyYW1ldGVycywgaXQgcmV0dXJucyBhIFByb21pc2VcIixcclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBmdW5jIGlzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IG11c3QgcmVjZWl2ZSBhIGNhbGxiYWNrIHRoYXQgZXhlY3V0ZXMgZm9yIGVhY2ggcm93XCIsXHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wIGVycm9yIHBhcnNpbmdcIixcclxuICAgIGluc2FuZU5hbWU6XCJpbnNhbmUgbmFtZVwiLFxyXG4gICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGxhY2sgb2YgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgY29ubmVjdCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgZW5kIGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcIm51bGwgaW4gcXVvdGVMaXRlcmFsXCIsXHJcbiAgICBvYnRhaW5zMTpcIm9idGFpbnMgJDFcIixcclxuICAgIG9idGFpbnNOb25lOlwib2J0YWlucyBub25lXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSBmaWVsZCBhbmQgJDFcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJxdWVyeSBleHBlY3RzIG9uZSByb3cgYW5kICQxXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgY2F0Y2hlZFwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbXVzdCBub3QgYmUgYXdhaXRlZCBub3IgdGhlbmVkXCIsXHJcbiAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBxdWVyeSBub3QgY29ubmVjdGVkXCIsXHJcbiAgICB1bmJhbGFuY2VkQ29ubmVjdGlvbjpcInBnUHJvbWlzZVN0cmljdC5kZWJ1Zy5wb29sIHVuYmFsYW5jZWQgY29ubmVjdGlvblwiLFxyXG59XHJcblxyXG5leHBvcnQgdmFyIGkxOG46e1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOnR5cGVvZiBtZXNzYWdlcyxcclxuICAgICAgICBbazpzdHJpbmddOlBhcnRpYWw8dHlwZW9mIG1lc3NhZ2VzPlxyXG4gICAgfVxyXG59ID0ge1xyXG4gICAgbWVzc2FnZXM6e1xyXG4gICAgICAgIGVuOm1lc3NhZ2VzLFxyXG4gICAgICAgIGVzOntcclxuICAgICAgICAgICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgYnVsa0luc2VydCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgY29weUZyb20gZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNlbnRlbmNlcyBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU3FsU2NyaXB0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGVsIGNsaWVudGUgeWEgZnVlIHRlcm1pbmFkb1wiLFxyXG4gICAgICAgICAgICBjbGllbnRDb25lbmN0TXVzdE5vdFJlY2VpdmVQYXJhbXM6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50LmNvbm5lY3Qgbm8gZGViZSByZWNpYmlyIHBhcmFtZXRldHJvcywgZGV2dWVsdmUgdW5hIFByb21lc2FcIixcclxuICAgICAgICAgICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGVzIGV4cGVyaW1lbnRhbFwiLFxyXG4gICAgICAgICAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgZGViZSByZWNpYmlyIHVuYSBmdW5jaW9uIGNhbGxiYWNrIHBhcmEgZWplY3V0YXIgZW4gY2FkYSByZWdpc3Ryb1wiLFxyXG4gICAgICAgICAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZzpcImVycm9yIGFsIHBhcnNlYXIgZW4gZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBcIixcclxuICAgICAgICAgICAgaW5zYW5lTmFtZTpcIm5vbWJyZSBpbnZhbGlkbyBwYXJhIG9iamV0byBzcWwsIGRlYmUgc2VyIHNvbG8gbGV0cmFzLCBudW1lcm9zIG8gcmF5YXMgZW1wZXphbmRvIHBvciB1bmEgbGV0cmFcIixcclxuICAgICAgICAgICAgbGFja09mQ2xpZW50OlwicGctcHJvbWlzZS1zdHJpY3Q6IGZhbHRhIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogTm8gc2UgcHVlZGUgY29uZWN0YXIgdW4gJ0NsaWVudCcgZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBubyBkZWJlIHRlcm1pbmFyIGVsIGNsaWVudCBkZXNkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibGEgZnVuY2lvbiBxdW90ZUxpdGVyYWwgbm8gZGViZSByZWNpYmlyIG51bGxcIixcclxuICAgICAgICAgICAgb2J0YWluczE6XCJzZSBvYnR1dmllcm9uICQxXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnNOb25lOlwibm8gc2Ugb2J0dXZvIG5pbmd1bm9cIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biBzb2xvIHZhbG9yIChjb2x1bW5hIG8gY2FtcG8pIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gcmVnaXN0cm8geSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZUNhdGNoZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIGNhdGNoXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyB0aGVuXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6ICdxdWVyeScgbm8gY29uZWN0YWRhXCIsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0TGFuZyhsYW5nOnN0cmluZyl7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYobGFuZyBpbiBpMThuLm1lc3NhZ2VzKXtcclxuICAgICAgICBtZXNzYWdlcyA9IHsuLi5pMThuLm1lc3NhZ2VzLmVuLCAuLi5pMThuLm1lc3NhZ2VzW2xhbmddfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBkZWJ1Zzp7XHJcbiAgICBwb29sPzp0cnVlfHtcclxuICAgICAgICBba2V5OnN0cmluZ106eyBjb3VudDpudW1iZXIsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfX1cclxuICAgIH1cclxufT17fTtcclxuXHJcbmV4cG9ydCB2YXIgZGVmYXVsdHM9e1xyXG4gICAgcmVsZWFzZVRpbWVvdXQ6e2luYWN0aXZlOjYwMDAwLCBjb25uZWN0aW9uOjYwMDAwMH1cclxufTtcclxuXHJcbi8qIGluc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbm9Mb2coX21lc3NhZ2U6c3RyaW5nLCBfdHlwZTpzdHJpbmcpe31cclxuXHJcbmV4cG9ydCB2YXIgbG9nOihtZXNzYWdlOnN0cmluZywgdHlwZTpzdHJpbmcpPT52b2lkPW5vTG9nO1xyXG5leHBvcnQgdmFyIGFsc29Mb2dSb3dzID0gZmFsc2U7XHJcbmV4cG9ydCB2YXIgbG9nRXhjZXB0aW9ucyA9IGZhbHNlO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnQobmFtZTpzdHJpbmcpe1xyXG4gICAgaWYodHlwZW9mIG5hbWUhPT1cInN0cmluZ1wiKXtcclxuICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHtuYW1lfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmluc2FuZU5hbWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdcIicrbmFtZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIic7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudExpc3Qob2JqZWN0TmFtZXM6c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIG9iamVjdE5hbWVzLm1hcChmdW5jdGlvbihvYmplY3ROYW1lKXsgcmV0dXJuIHF1b3RlSWRlbnQob2JqZWN0TmFtZSk7IH0pLmpvaW4oJywnKTtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFueVF1b3RlYWJsZSA9IHN0cmluZ3xudW1iZXJ8RGF0ZXx7aXNSZWFsRGF0ZTpib29sZWFuLCB0b1ltZDooKT0+c3RyaW5nfXx7dG9Qb3N0Z3JlczooKT0+c3RyaW5nfXx7dG9TdHJpbmc6KCk9PnN0cmluZ307XHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZU51bGxhYmxlKGFueVZhbHVlOm51bGx8QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gJ251bGwnO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHQ6c3RyaW5nXHJcbiAgICBpZih0eXBlb2YgYW55VmFsdWU9PT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWU7XHJcbiAgICB9ZWxzZSBpZighKGFueVZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSl7XHJcbiAgICAgICAgdGV4dD1hbnlWYWx1ZS50b1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ2lzUmVhbERhdGUnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLmlzUmVhbERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1ltZCgpO1xyXG4gICAgfWVsc2UgaWYoYW55VmFsdWUgaW5zdGFuY2VvZiBEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9JU09TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCd0b1Bvc3RncmVzJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS50b1Bvc3RncmVzIGluc3RhbmNlb2YgRnVuY3Rpb24pe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1Bvc3RncmVzKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkoYW55VmFsdWUpO1xyXG4gICAgfVxyXG4gICAgaWYodGV4dD09dW5kZWZpbmVkKXtcclxuICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHthbnlWYWx1ZX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncXVvdGFibGVOdWxsIGluc2FuZSB2YWx1ZTogJyt0eXBlb2YgYW55VmFsdWUpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gXCInXCIrdGV4dC5yZXBsYWNlKC8nL2csXCInJ1wiKStcIidcIjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUxpdGVyYWwoYW55VmFsdWU6QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHthbnlWYWx1ZX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5udWxsSW5RdW90ZUxpdGVyYWwpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHF1b3RlTnVsbGFibGUoYW55VmFsdWUpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHBhcmFtM3JkNHNxbD0oZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10sIGJhc2U/OnN0cmluZywga2V5cz86c3RyaW5nfHN0cmluZ1tdKT0+XHJcbiAgICBleHByT3JXaXRob3V0a2V5T3JLZXlzPT10cnVlP2B0b19qc29uYigke2Jhc2V9KSAtICR7a2V5cyBpbnN0YW5jZW9mIEFycmF5P2tleXM6a2V5cz8uc3BsaXQoJywnKS5tYXAoeD0+cXVvdGVMaXRlcmFsKHgudHJpbSgpKSl9YDpcclxuICAgIGV4cHJPcldpdGhvdXRrZXlPcktleXM9PW51bGw/YHRvX2pzb25iKCR7YmFzZX0pYDpcclxuICAgIHR5cGVvZiBleHByT3JXaXRob3V0a2V5T3JLZXlzID09IFwic3RyaW5nXCI/ZXhwck9yV2l0aG91dGtleU9yS2V5czpcclxuICAgIGB0b19qc29uYihqc29uYl9idWlsZF9vYmplY3QoJHtleHByT3JXaXRob3V0a2V5T3JLZXlzLm1hcChuYW1lPT5xdW90ZUxpdGVyYWwobmFtZSkrJywgJytxdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsICcpfSkpYFxyXG4gICAgO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsZXhwcjpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsa2V5czpzdHJpbmdbXSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyx3aXRob3V0S2V5czp0cnVlKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9hZ2coJHtwYXJhbTNyZDRzcWwoZXhwck9yV2l0aG91dGtleU9yS2V5cywnai4qJyxvcmRlcmJ5KX0gT1JERVIgQlkgJHtvcmRlcmJ5fSkgZnJvbSAoJHtzcWx9KSBhcyBqKSwnW10nOjpqc29uYilgO1xyXG4gICAgLy8gcmV0dXJuIGAoU0VMRUNUIGNvYWxlc2NlKGpzb25iX2FnZyh0b19qc29uYihqLiopIE9SREVSIEJZICR7b3JkZXJieX0pLCdbXSc6Ompzb25iKSBmcm9tICgke3NxbH0pIGFzIGopYFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxleHByOnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxrZXlzOnN0cmluZ1tdKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLHdpdGhvdXRLZXlzOnRydWUpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX29iamVjdF9hZ2coJHtpbmRleGVkYnl9LCR7cGFyYW0zcmQ0c3FsKGV4cHJPcldpdGhvdXRrZXlPcktleXMsJ2ouKicsaW5kZXhlZGJ5KX0pIGZyb20gKCR7c3FsfSkgYXMgaiksJ3t9Jzo6anNvbmIpYFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYWRhcHRQYXJhbWV0ZXJUeXBlcyhwYXJhbWV0ZXJzPzphbnlbXSl7XHJcbiAgICAvLyBAdHMtaWdub3JlIFxyXG4gICAgaWYocGFyYW1ldGVycz09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1ldGVycy5tYXAoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgIGlmKHZhbHVlICYmIHZhbHVlLnR5cGVTdG9yZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS50b0xpdGVyYWwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIGVhc3k6Ym9vbGVhbj10cnVlOyAvLyBkZXByZWNhdGVkIVxyXG5cclxuZXhwb3J0IHR5cGUgQ29ubmVjdFBhcmFtcz17XHJcbiAgICBtb3Rvcj86XCJwb3N0Z3Jlc1wiXHJcbiAgICBkYXRhYmFzZT86c3RyaW5nXHJcbiAgICB1c2VyPzpzdHJpbmdcclxuICAgIHBhc3N3b3JkPzpzdHJpbmdcclxuICAgIHBvcnQ/Om51bWJlclxyXG59XHJcblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNDb21tb249e3RhYmxlOnN0cmluZyxjb2x1bW5zPzpzdHJpbmdbXSxkb25lPzooZXJyPzpFcnJvcik9PnZvaWQsIHdpdGg/OnN0cmluZ31cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzRmlsZT17aW5TdHJlYW0/OnVuZGVmaW5lZCwgZmlsZW5hbWU6c3RyaW5nfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzU3RyZWFtPXtpblN0cmVhbTpTdHJlYW0sZmlsZW5hbWU/OnVuZGVmaW5lZH0mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0cz1Db3B5RnJvbU9wdHNGaWxlfENvcHlGcm9tT3B0c1N0cmVhbVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOmFueVtdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzphbnlbXSk9PlByb21pc2U8dm9pZD59XHJcblxyXG5leHBvcnQgdHlwZSBDb2x1bW4gPSB7ZGF0YV90eXBlOnN0cmluZ307XHJcblxyXG5leHBvcnQgY2xhc3MgSW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNsaWVudDpDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgYXN5bmMgY29sdW1uKHRhYmxlX3NjaGVtYTpzdHJpbmcsIHRhYmxlX25hbWU6c3RyaW5nLCBjb2x1bW5fbmFtZTpzdHJpbmcpOlByb21pc2U8Q29sdW1ufG51bGw+e1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBhd2FpdCB0aGlzLmNsaWVudC5xdWVyeShgXHJcbiAgICAgICAgICAgIHNlbGVjdCAqIFxyXG4gICAgICAgICAgICAgICAgZnJvbSBpbmZvcm1hdGlvbl9zY2hlbWEuY29sdW1uc1xyXG4gICAgICAgICAgICAgICAgd2hlcmUgdGFibGVfc2NoZW1hPSQxXHJcbiAgICAgICAgICAgICAgICAgICAgYW5kIHRhYmxlX25hbWU9JDJcclxuICAgICAgICAgICAgICAgICAgICBhbmQgY29sdW1uX25hbWU9JDM7XHJcbiAgICAgICAgYCxbdGFibGVfc2NoZW1hLCB0YWJsZV9uYW1lLCBjb2x1bW5fbmFtZV0pLmZldGNoT25lUm93SWZFeGlzdHMoKTsgXHJcbiAgICAgICAgcmV0dXJuIChyZXN1bHQucm93IHx8IG51bGwpIGFzIENvbHVtbnxudWxsO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIHByaXZhdGUgX2luZm9ybWF0aW9uU2NoZW1hOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVyfG51bGw9bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXMpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpudWxsLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50fHVuZGVmaW5lZCksIF9kb25lOigpPT52b2lkLCBfb3B0cz86YW55KVxyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6Q29ubmVjdFBhcmFtc3xudWxsLCBjbGllbnQ/OihwZy5DbGllbnR8cGcuUG9vbENsaWVudHx1bmRlZmluZWQpLCBwcml2YXRlIF9kb25lPzooKT0+dm9pZCwgX29wdHM/OmFueSl7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50ID0gY2xpZW50IGFzIChwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgIGlmKGNvbm5PcHRzPT1udWxsKXtcclxuICAgICAgICAgICAgaWYgKGNsaWVudCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNsaWVudC5jb25zdHJ1Y3RvcjogY29ubk9wdHMgJiBjbGllbnQgdW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5mcm9tUG9vbD10cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgIC8qIERPSU5HXHJcbiAgICAgICAgICAgIGlmKHNlbGYub3B0cy50aW1lb3V0Q29udHJvbGxlcil7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxUaW1lb3V0KHNlbGYudGltZW91dENvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlbGYudGltZW91dENvbnRyb2xsZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50ID0gdGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgY2xpZW50LmNvbm5lY3QoZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZWxmKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgZW5kKCl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RFbmRDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZih0aGlzLl9jbGllbnQgaW5zdGFuY2VvZiBwZy5DbGllbnQpe1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuZW5kKCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb25lKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRBbHJlYWR5RG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIERFQlVHR0lOR1xyXG4gICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50LS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnRUb0RvbmU9dGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHRoaXMuX2NsaWVudD1udWxsO1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgYXJndW1lbnRzIEFycmF5IGxpa2UgYW5kIGFwcGx5YWJsZVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lLmFwcGx5KGNsaWVudFRvRG9uZSwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcpOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nLCBwYXJhbXM6YW55W10pOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWxPYmplY3Q6e3RleHQ6c3RyaW5nLCB2YWx1ZXM6YW55W119KTpRdWVyeVxyXG4gICAgcXVlcnkoKTpRdWVyeXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLmNvbm5lY3RlZCB8fCAhdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5Tm90Q29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbm5lY3RlZC5sYXN0T3BlcmF0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5QXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcXVlcnlUZXh0OnN0cmluZztcclxuICAgICAgICB2YXIgcXVlcnlWYWx1ZXM6bnVsbHxhbnlbXT1udWxsO1xyXG4gICAgICAgIGlmKHR5cGVvZiBxdWVyeUFyZ3VtZW50c1swXSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXTtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBxdWVyeUFyZ3VtZW50c1sxXSA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMV18fG51bGwpO1xyXG4gICAgICAgIH1lbHNlIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovIGlmKHF1ZXJ5QXJndW1lbnRzWzBdIGluc3RhbmNlb2YgT2JqZWN0KXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF0udGV4dDtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlc3x8bnVsbCk7XHJcbiAgICAgICAgICAgIHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlcyA9IHF1ZXJ5VmFsdWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgaWYgbm8gcXVlcnlUZXh0LCB0aGUgdmFsdWUgbXVzdCBiZSBzaG93ZWQgYWxzb1xyXG4gICAgICAgICAgICB2YXIgc3FsPXF1ZXJ5VGV4dDtcclxuICAgICAgICAgICAgbG9nKE1FU1NBR0VTX1NFUEFSQVRPUiwgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpO1xyXG4gICAgICAgICAgICBpZihxdWVyeVZhbHVlcyAmJiBxdWVyeVZhbHVlcy5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgbG9nKCdgJytzcWwrJ1xcbmAnLCdRVUVSWS1QJyk7XHJcbiAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocXVlcnlWYWx1ZXMpLCdRVUVSWS1BJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlOmFueSwgaTpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNxbD1zcWwucmVwbGFjZShuZXcgUmVnRXhwKCdcXFxcJCcrKGkrMSkrJ1xcXFxiJyksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yIG51bWJlcnMgYW5kIGJvb2xlYW5zIGNhbiBiZSB1c2VkIGhlcmUgYWxzb1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdmFsdWUgPT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgdmFsdWUgPT0gXCJib29sZWFuXCI/dmFsdWU6cXVvdGVOdWxsYWJsZSh2YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nKHNxbCsnOycsJ1FVRVJZJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZXR1cm5lZFF1ZXJ5ID0gdGhpcy5fY2xpZW50LnF1ZXJ5KG5ldyBwZy5RdWVyeShxdWVyeUFyZ3VtZW50c1swXSwgcXVlcnlBcmd1bWVudHNbMV0pKTtcclxuICAgICAgICByZXR1cm4gbmV3IFF1ZXJ5KHJldHVybmVkUXVlcnksIHRoaXMsIHRoaXMuX2NsaWVudCk7XHJcbiAgICB9O1xyXG4gICAgZ2V0IGluZm9ybWF0aW9uU2NoZW1hKCk6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm9ybWF0aW9uU2NoZW1hIHx8IG5ldyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcih0aGlzKTtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzOnN0cmluZ1tdKTpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD57XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpSZXN1bHRDb21tYW5kfHVuZGVmaW5lZDtcclxuICAgICAgICBmb3IodmFyIHNlbnRlbmNlIG9mIHNlbnRlbmNlcyl7XHJcbiAgICAgICAgICAgIGNkcCA9IGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNkcDtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTcWxTY3JpcHQoZmlsZU5hbWU6c3RyaW5nKXtcclxuICAgICAgICB2YXIgc2VsZj10aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzcWwgPSBcIklOU0VSVCBJTlRPIFwiKyhwYXJhbXMuc2NoZW1hP3F1b3RlSWRlbnQocGFyYW1zLnNjaGVtYSkrJy4nOicnKStcclxuICAgICAgICAgICAgcXVvdGVJZGVudChwYXJhbXMudGFibGUpK1wiIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKHF1b3RlSWRlbnQpLmpvaW4oJywgJykrXCIpIFZBTFVFUyAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChmdW5jdGlvbihfbmFtZTpzdHJpbmcsIGlfbmFtZTpudW1iZXIpeyByZXR1cm4gJyQnKyhpX25hbWUrMSk7IH0pK1wiKVwiO1xyXG4gICAgICAgIHZhciBpX3Jvd3M9MDtcclxuICAgICAgICB3aGlsZShpX3Jvd3M8cGFyYW1zLnJvd3MubGVuZ3RoKXtcclxuICAgICAgICAgICAgdHJ5e1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgc2VsZi5xdWVyeShzcWwsIHBhcmFtcy5yb3dzW2lfcm93c10pLmV4ZWN1dGUoKTtcclxuICAgICAgICAgICAgfWNhdGNoKGVycil7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSB1bmV4cGVjdGVkKGVycik7XHJcbiAgICAgICAgICAgICAgICBpZihwYXJhbXMub25lcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcGFyYW1zLm9uZXJyb3IoZXJyb3IsIHBhcmFtcy5yb3dzW2lfcm93c10pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7cm93OiBwYXJhbXMucm93c1tpX3Jvd3NdfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaV9yb3dzKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21QYXJzZVBhcmFtcyhvcHRzOkNvcHlGcm9tT3B0cyl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmcm9tID0gb3B0cy5pblN0cmVhbSA/ICdTVERJTicgOiBxdW90ZUxpdGVyYWwob3B0cy5maWxlbmFtZSk7XHJcbiAgICAgICAgdmFyIHNxbCA9IGBDT1BZICR7b3B0cy50YWJsZX0gJHtvcHRzLmNvbHVtbnM/YCgke29wdHMuY29sdW1ucy5tYXAobmFtZT0+cXVvdGVJZGVudChuYW1lKSkuam9pbignLCcpfSlgOicnfSBGUk9NICR7ZnJvbX0gJHtvcHRzLndpdGg/J1dJVEggJytvcHRzLndpdGg6Jyd9YDtcclxuICAgICAgICByZXR1cm4ge3NxbCwgX2NsaWVudDp0aGlzLl9jbGllbnR9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgY29weUZyb21GaWxlKG9wdHM6Q29weUZyb21PcHRzRmlsZSk6UHJvbWlzZTxSZXN1bHRDb21tYW5kPntcclxuICAgICAgICB2YXIge3NxbH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVlcnkoc3FsKS5leGVjdXRlKCk7XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHNTdHJlYW0pe1xyXG4gICAgICAgIHZhciB7c3FsLCBfY2xpZW50fSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICB2YXIgc3RyZWFtID0gX2NsaWVudC5xdWVyeShjb3B5RnJvbShzcWwpKTtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2VuZCcsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignY2xvc2UnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0pe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcHRzLmluU3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKG51bGxhYmxlOmFueSl7XHJcbiAgICAgICAgaWYobnVsbGFibGU9PW51bGwpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNlIGlmKHR5cGVvZiBudWxsYWJsZSA9PT0gXCJudW1iZXJcIiAmJiBpc05hTihudWxsYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbGFibGUudG9TdHJpbmcoKS5yZXBsYWNlKC8oXFxyKXwoXFxuKXwoXFx0KXwoXFxcXCkvZywgXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihfYWxsOnN0cmluZyxic3I6c3RyaW5nLGJzbjpzdHJpbmcsYnN0OnN0cmluZyxiczpzdHJpbmcpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzcikgcmV0dXJuICdcXFxccic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNuKSByZXR1cm4gJ1xcXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic3QpIHJldHVybiAnXFxcXHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlIHBvciBsYSByZWdleHAgZXMgaW1wb3NpYmxlIHF1ZSBwYXNlIGFsIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse19hbGx9KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmcpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21BcnJheVN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIGMgPSB0aGlzO1xyXG4gICAgICAgIHZhciB0cmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKHtcclxuICAgICAgICAgICAgd3JpdGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHJlYWRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm0oYXJyYXlDaHVuazphbnlbXSwgX2VuY29kaW5nLCBuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaChhcnJheUNodW5rLm1hcCh4PT5jLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKHgpKS5qb2luKCdcXHQnKSsnXFxuJylcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZmx1c2gobmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goJ1xcXFwuXFxuJyk7XHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICB2YXIge2luU3RyZWFtLCAuLi5yZXN0fSA9IG9wdHM7XHJcbiAgICAgICAgaW5TdHJlYW0ucGlwZSh0cmFuc2Zvcm0pO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSh7aW5TdHJlYW06dHJhbnNmb3JtLCAuLi5yZXN0fSlcclxuICAgIH1cclxufVxyXG5cclxudmFyIHF1ZXJ5UmVzdWx0OnBnLlF1ZXJ5UmVzdWx0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHR7XHJcbiAgICByb3dDb3VudDpudW1iZXJ8bnVsbFxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyfG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvdyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdzp7W2tleTpzdHJpbmddOmFueX1cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvd0lmRXhpc3RzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Pzp7W2tleTpzdHJpbmddOmFueX18bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Um93cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvd3M6e1trZXk6c3RyaW5nXTphbnl9W11cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFZhbHVlIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgdmFsdWU6YW55XHJcbn1cclxuLy8gZXhwb3J0IGludGVyZmFjZSBSZXN1bHRHZW5lcmljIGV4dGVuZHMgUmVzdWx0VmFsdWUsIFJlc3VsdFJvd3MsIFJlc3VsdE9uZVJvd0lmRXhpc3RzLCBSZXN1bHRPbmVSb3csIFJlc3VsdHt9XHJcbmV4cG9ydCB0eXBlIFJlc3VsdEdlbmVyaWMgPSBSZXN1bHRWYWx1ZXxSZXN1bHRSb3dzfFJlc3VsdE9uZVJvd0lmRXhpc3RzfFJlc3VsdE9uZVJvd3xSZXN1bHR8UmVzdWx0Q29tbWFuZFxyXG5cclxuLypcclxuZnVuY3Rpb24gYnVpbGRRdWVyeUNvdW50ZXJBZGFwdGVyKFxyXG4gICAgbWluQ291bnRSb3c6bnVtYmVyLCBcclxuICAgIG1heENvdW50Um93Om51bWJlciwgXHJcbiAgICBleHBlY3RUZXh0OnN0cmluZywgXHJcbiAgICBjYWxsYmFja090aGVyQ29udHJvbD86KHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkXHJcbil7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcXVlcnlDb3VudGVyQWRhcHRlcihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKXsgXHJcbiAgICAgICAgaWYocmVzdWx0LnJvd3MubGVuZ3RoPG1pbkNvdW50Um93IHx8IHJlc3VsdC5yb3dzLmxlbmd0aD5tYXhDb3VudFJvdyApe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyAnK2V4cGVjdFRleHQrJyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dzLmxlbmd0aCsnIHJvd3MnKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKGNhbGxiYWNrT3RoZXJDb250cm9sKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrT3RoZXJDb250cm9sKHJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLm90aGVyfSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5vdGhlcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4qL1xyXG5cclxudHlwZSBOb3RpY2UgPSBzdHJpbmc7XHJcblxyXG5mdW5jdGlvbiBsb2dFcnJvcklmTmVlZGVkPFQ+KGVycjpFcnJvciwgY29kZT86VCk6RXJyb3J7XHJcbiAgICBpZihjb2RlICE9IG51bGwpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBlcnIuY29kZT1jb2RlO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcnxudWxsKTpzdHJpbmd7XHJcbiAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKCckMScsXHJcbiAgICAgICAgY291bnQ/bWVzc2FnZXMub2J0YWluczEucmVwbGFjZSgnJDEnLFwiXCIrY291bnQpOm1lc3NhZ2VzLm9idGFpbnNOb25lXHJcbiAgICApO1xyXG59IFxyXG5cclxuXHJcbmNsYXNzIFF1ZXJ5e1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfcXVlcnk6cGcuUXVlcnksIHB1YmxpYyBjbGllbnQ6Q2xpZW50LCBwcml2YXRlIF9pbnRlcm5hbENsaWVudDpwZy5DbGllbnR8cGcuUG9vbENsaWVudCl7XHJcbiAgICB9XHJcbiAgICBvbk5vdGljZShjYWxsYmFja05vdGljZUNvbnN1bWVyOihub3RpY2U6Tm90aWNlKT0+dm9pZCk6UXVlcnl7XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub3RpY2VDYWxsYmFjaz1mdW5jdGlvbihub3RpY2U6Tm90aWNlKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi8gLy8gQHRzLWlnbm9yZSAgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFISBMQUNLUyBvZiBhY3RpdmVRdWVyeVxyXG4gICAgICAgICAgICBpZihxLl9pbnRlcm5hbENsaWVudC5hY3RpdmVRdWVyeT09cS5fcXVlcnkpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tOb3RpY2VDb25zdW1lcihub3RpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdub3RpY2UnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgdGhpcy5faW50ZXJuYWxDbGllbnQub24oJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHZhciByZW1vdmVOb3RpY2VDYWxsYmFjaz1mdW5jdGlvbiByZW1vdmVOb3RpY2VDYWxsYmFjaygpe1xyXG4gICAgICAgICAgICBxLl9pbnRlcm5hbENsaWVudC5yZW1vdmVMaXN0ZW5lcignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlbmQnLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZXJyb3InLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBwcml2YXRlIF9leGVjdXRlPFRSIGV4dGVuZHMgUmVzdWx0R2VuZXJpYz4oXHJcbiAgICAgICAgYWRhcHRlckNhbGxiYWNrOm51bGx8KChyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpUUik9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWQpLFxyXG4gICAgICAgIGNhbGxiYWNrRm9yRWFjaFJvdz86KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPiwgXHJcbiAgICApOlByb21pc2U8VFI+e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VFI+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBwZW5kaW5nUm93cz0wO1xyXG4gICAgICAgICAgICB2YXIgZW5kTWFyazpudWxsfHtyZXN1bHQ6cGcuUXVlcnlSZXN1bHR9PW51bGw7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlcnJvcicsZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ3JvdycpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ3JvdycsYXN5bmMgZnVuY3Rpb24ocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tGb3JFYWNoUm93KXtcclxuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nUm93cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nICYmIGFsc29Mb2dSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJvdyksICdST1cnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgY2FsbGJhY2tGb3JFYWNoUm93KHJvdywgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAtLXBlbmRpbmdSb3dzO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgYWRkUm93IG9tbWl0ZWQgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5hZGRSb3cocm93KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdoZW5FbmQoKXtcclxuICAgICAgICAgICAgICAgIGlmKGVuZE1hcmsgJiYgIXBlbmRpbmdSb3dzKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihhZGFwdGVyQ2FsbGJhY2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZGFwdGVyQ2FsbGJhY2soZW5kTWFyay5yZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZW5kTWFyay5yZXN1bHQgYXMgdW5rbm93biBhcyBUUik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgICAgICBpZihsb2cgJiYgYWxzb0xvZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyZXN1bHQucm93cyksICdSRVNVTFQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVuZE1hcms9e3Jlc3VsdH07XHJcbiAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKFxyXG4gICAgICAgICAgICAgICAgbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDEsIHJlc3VsdC5maWVsZHMubGVuZ3RoKSksXHJcbiAgICAgICAgICAgICAgICAnNTRVMTEhJ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge3ZhbHVlOnJvd1tyZXN1bHQuZmllbGRzWzBdLm5hbWVdLCAuLi5yZXN1bHR9O1xyXG4gICAgfVxyXG4gICAgZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlPzpzdHJpbmcsYWNjZXB0Tm9Sb3dzPzpib29sZWFuKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRPbmVSb3cpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIGlmKHJlc3VsdC5yb3dDb3VudCE9PTEgJiYgKCFhY2NlcHROb1Jvd3MgfHwgISFyZXN1bHQucm93Q291bnQpKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZVJvd0FuZDEscmVzdWx0LnJvd0NvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmUgZXJyLmNvZGVcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlID0gJzU0MDExISdcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2UsdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcihtZXNzYWdlcy5mZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjayk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZVRoZW5lZClcclxuICAgIH1cclxuICAgIGNhdGNoKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZClcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYoYWxsVHlwZXMpe1xyXG4gICAgICAgIHNldEFsbFR5cGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICB2YXIgaWRDb25uZWN0UGFyYW1ldGVycyA9IEpTT04uc3RyaW5naWZ5KGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICB2YXIgcG9vbCA9IHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdfHxuZXcgcGcuUG9vbChjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc10gPSBwb29sO1xyXG4gICAgICAgIHBvb2wuY29ubmVjdChmdW5jdGlvbihlcnIsIGNsaWVudCwgZG9uZSl7XHJcbiAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDbGllbnQobnVsbCwgY2xpZW50LCBkb25lIC8qLCBET0lORyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZVRpbWVvdXQ6IGNoYW5naW5nKHBnUHJvbWlzZVN0cmljdC5kZWZhdWx0cy5yZWxlYXNlVGltZW91dCxjb25uZWN0UGFyYW1ldGVycy5yZWxlYXNlVGltZW91dHx8e30pXHJcbiAgICAgICAgICAgICAgICB9Ki8pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgdmFyIHJlYWR5TG9nID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcblxyXG4vKiB4eGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dMYXN0RXJyb3IobWVzc2FnZTpzdHJpbmcsIG1lc3NhZ2VUeXBlOnN0cmluZyk6dm9pZHtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihtZXNzYWdlVHlwZSl7XHJcbiAgICAgICAgaWYobWVzc2FnZVR5cGU9PSdFUlJPUicpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgICAgICBpZihsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbGluZXM9WydQRy1FUlJPUiAnK21lc3NhZ2VdO1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0ciBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZXMucHVzaChcIi0tLS0tLS0gXCIrYXR0citcIjpcXG5cIitsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICAgICAgcmVhZHlMb2cgPSByZWFkeUxvZy50aGVuKF89PmZzLndyaXRlRmlsZShsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSxsaW5lcy5qb2luKCdcXG4nKSkpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihtZXNzYWdlVHlwZT09TUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpe1xyXG4gICAgICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaChtZXNzYWdlcy51bmJhbGFuY2VkQ29ubmVjdGlvbisnICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaHV0ZG93bih2ZXJib3NlOmJvb2xlYW4pe1xyXG4gICAgdmFyIHdhaXRGb3I6IFByb21pc2U8dm9pZD5bXSA9IFtdXHJcbiAgICBmb3IgKHZhciBwb29sIG9mIGxpa2VBci5pdGVyYXRvcihwb29scykpIHtcclxuICAgICAgICB3YWl0Rm9yLnB1c2gocG9vbC5lbmQoKSk7XHJcbiAgICB9XHJcbiAgICBpZiAodmVyYm9zZSkgY29uc29sZS5sb2coJ3Bvb2xCYWxhbmNlQ29udHJvbCcpO1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxuICAgIGF3YWl0IFByb21pc2UuYWxsKHdhaXRGb3IpO1xyXG59XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==