"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdown = exports.poolBalanceControl = exports.logLastError = exports.readyLog = exports.connect = exports.setAllTypes = exports.allTypes = exports.Client = exports.InformationSchemaReader = exports.easy = exports.adaptParameterTypes = exports.jsono = exports.json = exports.param3rd4sql = exports.quoteLiteral = exports.quoteNullable = exports.quoteIdentList = exports.quoteIdent = exports.logExceptions = exports.alsoLogRows = exports.log = exports.noLog = exports.defaults = exports.debug = exports.setLang = exports.i18n = exports.messages = void 0;
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
exports.setLang = setLang;
exports.debug = {};
exports.defaults = {
    releaseTimeout: { inactive: 60000, connection: 600000 }
};
/* instanbul ignore next */
function noLog(_message, _type) { }
exports.noLog = noLog;
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
        if (exports.logExceptions) {
            console.error('Context for error', { anyValue });
        }
        throw new Error('quotableNull insane value: ' + typeof anyValue);
    }
    return "'" + text.replace(/'/g, "''") + "'";
}
exports.quoteNullable = quoteNullable;
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
exports.quoteLiteral = quoteLiteral;
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
exports.setAllTypes = setAllTypes;
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
exports.shutdown = shutdown;
/* istanbul ignore next */
process.on('exit', function () {
    console.warn(poolBalanceControl());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFRLEVBQUMsWUFBWTtJQUNyQixXQUFXLEVBQUMsY0FBYztJQUMxQix3QkFBd0IsRUFBQyxnQ0FBZ0M7SUFDekQsc0JBQXNCLEVBQUMsOEJBQThCO0lBQ3JELHFCQUFxQixFQUFDLDBEQUEwRDtJQUNoRixvQkFBb0IsRUFBQyx5REFBeUQ7SUFDOUUsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELG9C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SUFDakMsS0FBSyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBQ0QsSUFBSSxPQUFPO1FBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9DLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBUkQsNEJBUUM7QUFFRCwwQkFBMEI7QUFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQgeyB1bmV4cGVjdGVkIH0gZnJvbSAnY2FzdC1lcnJvcic7XHJcbmltcG9ydCB7U3RyZWFtLCBUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XHJcblxyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRT0nLS0tLS0tJztcclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SPSctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7XHJcblxyXG5leHBvcnQgdmFyIG1lc3NhZ2VzID0ge1xyXG4gICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBidWxrSW5zZXJ0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGNvcHlGcm9tIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNlbnRlbmNlcyBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTcWxTY3JpcHQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50IGFscmVhZHkgZG9uZVwiLFxyXG4gICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwiY2xpZW50LmNvbm5lY3QgbXVzdCBubyByZWNlaXZlIHBhcmFtZXRlcnMsIGl0IHJldHVybnMgYSBQcm9taXNlXCIsXHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZnVuYyBpcyBleHBlcmltZW50YWxcIixcclxuICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBtdXN0IHJlY2VpdmUgYSBjYWxsYmFjayB0aGF0IGV4ZWN1dGVzIGZvciBlYWNoIHJvd1wiLFxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCBlcnJvciBwYXJzaW5nXCIsXHJcbiAgICBpbnNhbmVOYW1lOlwiaW5zYW5lIG5hbWVcIixcclxuICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBsYWNrIG9mIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGNvbm5lY3QgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGVuZCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJudWxsIGluIHF1b3RlTGl0ZXJhbFwiLFxyXG4gICAgb2J0YWluczE6XCJvYnRhaW5zICQxXCIsXHJcbiAgICBvYnRhaW5zTm9uZTpcIm9idGFpbnMgbm9uZVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgZmllbGQgYW5kICQxXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgcm93IGFuZCAkMVwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIGNhdGNoZWRcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIHRoZW5lZFwiLFxyXG4gICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgdW5iYWxhbmNlZENvbm5lY3Rpb246XCJwZ1Byb21pc2VTdHJpY3QuZGVidWcucG9vbCB1bmJhbGFuY2VkIGNvbm5lY3Rpb25cIixcclxufVxyXG5cclxuZXhwb3J0IHZhciBpMThuOntcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjp0eXBlb2YgbWVzc2FnZXMsXHJcbiAgICAgICAgW2s6c3RyaW5nXTpQYXJ0aWFsPHR5cGVvZiBtZXNzYWdlcz5cclxuICAgIH1cclxufSA9IHtcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjptZXNzYWdlcyxcclxuICAgICAgICBlczp7XHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGJ1bGtJbnNlcnQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGNvcHlGcm9tIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTZW50ZW5jZXMgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNxbFNjcmlwdCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBlbCBjbGllbnRlIHlhIGZ1ZSB0ZXJtaW5hZG9cIixcclxuICAgICAgICAgICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudC5jb25uZWN0IG5vIGRlYmUgcmVjaWJpciBwYXJhbWV0ZXRyb3MsIGRldnVlbHZlIHVuYSBQcm9tZXNhXCIsXHJcbiAgICAgICAgICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBlcyBleHBlcmltZW50YWxcIixcclxuICAgICAgICAgICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IGRlYmUgcmVjaWJpciB1bmEgZnVuY2lvbiBjYWxsYmFjayBwYXJhIGVqZWN1dGFyIGVuIGNhZGEgcmVnaXN0cm9cIixcclxuICAgICAgICAgICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJlcnJvciBhbCBwYXJzZWFyIGVuIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wXCIsXHJcbiAgICAgICAgICAgIGluc2FuZU5hbWU6XCJub21icmUgaW52YWxpZG8gcGFyYSBvYmpldG8gc3FsLCBkZWJlIHNlciBzb2xvIGxldHJhcywgbnVtZXJvcyBvIHJheWFzIGVtcGV6YW5kbyBwb3IgdW5hIGxldHJhXCIsXHJcbiAgICAgICAgICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBmYWx0YSBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgICAgICAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE5vIHNlIHB1ZWRlIGNvbmVjdGFyIHVuICdDbGllbnQnIGRlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogbm8gZGViZSB0ZXJtaW5hciBlbCBjbGllbnQgZGVzZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcImxhIGZ1bmNpb24gcXVvdGVMaXRlcmFsIG5vIGRlYmUgcmVjaWJpciBudWxsXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnMxOlwic2Ugb2J0dXZpZXJvbiAkMVwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zTm9uZTpcIm5vIHNlIG9idHV2byBuaW5ndW5vXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gc29sbyB2YWxvciAoY29sdW1uYSBvIGNhbXBvKSB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHJlZ2lzdHJvIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyBjYXRjaFwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gdGhlblwiLFxyXG4gICAgICAgICAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiAncXVlcnknIG5vIGNvbmVjdGFkYVwiLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldExhbmcobGFuZzpzdHJpbmcpe1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuZXhwb3J0IHZhciBhbHNvTG9nUm93cyA9IGZhbHNlO1xyXG5leHBvcnQgdmFyIGxvZ0V4Y2VwdGlvbnMgPSBmYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7bmFtZX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5pbnNhbmVOYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiAnXCInK25hbWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnRMaXN0KG9iamVjdE5hbWVzOnN0cmluZ1tdKXtcclxuICAgIHJldHVybiBvYmplY3ROYW1lcy5tYXAoZnVuY3Rpb24ob2JqZWN0TmFtZSl7IHJldHVybiBxdW90ZUlkZW50KG9iamVjdE5hbWUpOyB9KS5qb2luKCcsJyk7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbnlRdW90ZWFibGUgPSBzdHJpbmd8bnVtYmVyfERhdGV8e2lzUmVhbERhdGU6Ym9vbGVhbiwgdG9ZbWQ6KCk9PnN0cmluZ318e3RvUG9zdGdyZXM6KCk9PnN0cmluZ318e3RvU3RyaW5nOigpPT5zdHJpbmd9O1xyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZTpudWxsfEFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuICdudWxsJztcclxuICAgIH1cclxuICAgIHZhciB0ZXh0OnN0cmluZ1xyXG4gICAgaWYodHlwZW9mIGFueVZhbHVlPT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlO1xyXG4gICAgfWVsc2UgaWYoIShhbnlWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkpe1xyXG4gICAgICAgIHRleHQ9YW55VmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCdpc1JlYWxEYXRlJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS5pc1JlYWxEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9ZbWQoKTtcclxuICAgIH1lbHNlIGlmKGFueVZhbHVlIGluc3RhbmNlb2YgRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZigndG9Qb3N0Z3JlcycgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUudG9Qb3N0Z3JlcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9Qb3N0Z3JlcygpO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KGFueVZhbHVlKTtcclxuICAgIH1cclxuICAgIGlmKHRleHQ9PXVuZGVmaW5lZCl7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7YW55VmFsdWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1b3RhYmxlTnVsbCBpbnNhbmUgdmFsdWU6ICcrdHlwZW9mIGFueVZhbHVlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7YW55VmFsdWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubnVsbEluUXVvdGVMaXRlcmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBxdW90ZU51bGxhYmxlKGFueVZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBwYXJhbTNyZDRzcWw9KGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdLCBiYXNlPzpzdHJpbmcsIGtleXM/OnN0cmluZ3xzdHJpbmdbXSk9PlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09dHJ1ZT9gdG9fanNvbmIoJHtiYXNlfSkgLSAke2tleXMgaW5zdGFuY2VvZiBBcnJheT9rZXlzOmtleXM/LnNwbGl0KCcsJykubWFwKHg9PnF1b3RlTGl0ZXJhbCh4LnRyaW0oKSkpfWA6XHJcbiAgICBleHByT3JXaXRob3V0a2V5T3JLZXlzPT1udWxsP2B0b19qc29uYigke2Jhc2V9KWA6XHJcbiAgICB0eXBlb2YgZXhwck9yV2l0aG91dGtleU9yS2V5cyA9PSBcInN0cmluZ1wiP2V4cHJPcldpdGhvdXRrZXlPcktleXM6XHJcbiAgICBgdG9fanNvbmIoanNvbmJfYnVpbGRfb2JqZWN0KCR7ZXhwck9yV2l0aG91dGtleU9yS2V5cy5tYXAobmFtZT0+cXVvdGVMaXRlcmFsKG5hbWUpKycsICcrcXVvdGVJZGVudChuYW1lKSkuam9pbignLCAnKX0pKWBcclxuICAgIDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfYWdnKCR7cGFyYW0zcmQ0c3FsKGV4cHJPcldpdGhvdXRrZXlPcktleXMsJ2ouKicsb3JkZXJieSl9IE9SREVSIEJZICR7b3JkZXJieX0pIGZyb20gKCR7c3FsfSkgYXMgaiksJ1tdJzo6anNvbmIpYDtcclxuICAgIC8vIHJldHVybiBgKFNFTEVDVCBjb2FsZXNjZShqc29uYl9hZ2codG9fanNvbmIoai4qKSBPUkRFUiBCWSAke29yZGVyYnl9KSwnW10nOjpqc29uYikgZnJvbSAoJHtzcWx9KSBhcyBqKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsZXhwcjpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsa2V5czpzdHJpbmdbXSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyx3aXRob3V0S2V5czp0cnVlKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9vYmplY3RfYWdnKCR7aW5kZXhlZGJ5fSwke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLGluZGV4ZWRieSl9KSBmcm9tICgke3NxbH0pIGFzIGopLCd7fSc6Ompzb25iKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzQ29tbW9uPXt0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkLCB3aXRoPzpzdHJpbmd9XHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0ZpbGU9e2luU3RyZWFtPzp1bmRlZmluZWQsIGZpbGVuYW1lOnN0cmluZ30mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c1N0cmVhbT17aW5TdHJlYW06U3RyZWFtLGZpbGVuYW1lPzp1bmRlZmluZWR9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHM9Q29weUZyb21PcHRzRmlsZXxDb3B5RnJvbU9wdHNTdHJlYW1cclxuZXhwb3J0IHR5cGUgQnVsa0luc2VydFBhcmFtcz17c2NoZW1hPzpzdHJpbmcsdGFibGU6c3RyaW5nLGNvbHVtbnM6c3RyaW5nW10scm93czphbnlbXVtdLCBvbmVycm9yPzooZXJyOkVycm9yLCByb3c6YW55W10pPT5Qcm9taXNlPHZvaWQ+fVxyXG5cclxuZXhwb3J0IHR5cGUgQ29sdW1uID0ge2RhdGFfdHlwZTpzdHJpbmd9O1xyXG5cclxuZXhwb3J0IGNsYXNzIEluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBjbGllbnQ6Q2xpZW50KXtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvbHVtbih0YWJsZV9zY2hlbWE6c3RyaW5nLCB0YWJsZV9uYW1lOnN0cmluZywgY29sdW1uX25hbWU6c3RyaW5nKTpQcm9taXNlPENvbHVtbnxudWxsPntcclxuICAgICAgICB2YXIgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQucXVlcnkoYFxyXG4gICAgICAgICAgICBzZWxlY3QgKiBcclxuICAgICAgICAgICAgICAgIGZyb20gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnNcclxuICAgICAgICAgICAgICAgIHdoZXJlIHRhYmxlX3NjaGVtYT0kMVxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCB0YWJsZV9uYW1lPSQyXHJcbiAgICAgICAgICAgICAgICAgICAgYW5kIGNvbHVtbl9uYW1lPSQzO1xyXG4gICAgICAgIGAsW3RhYmxlX3NjaGVtYSwgdGFibGVfbmFtZSwgY29sdW1uX25hbWVdKS5mZXRjaE9uZVJvd0lmRXhpc3RzKCk7IFxyXG4gICAgICAgIHJldHVybiAocmVzdWx0LnJvdyB8fCBudWxsKSBhcyBDb2x1bW58bnVsbDtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFRPRE86IGFueSBlbiBvcHRzICovXHJcbmV4cG9ydCBjbGFzcyBDbGllbnR7XHJcbiAgICBwcml2YXRlIGNvbm5lY3RlZDpudWxsfHtcclxuICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm51bWJlcixcclxuICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpudW1iZXJcclxuICAgIH09bnVsbDtcclxuICAgIHByaXZhdGUgZnJvbVBvb2w6Ym9vbGVhbj1mYWxzZTtcclxuICAgIHByaXZhdGUgcG9zdENvbm5lY3QoKXtcclxuICAgICAgICB2YXIgbm93VHM9bmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQgPSB7XHJcbiAgICAgICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bm93VHMsXHJcbiAgICAgICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm5vd1RzXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcHJpdmF0ZSBfY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fG51bGw7XHJcbiAgICBwcml2YXRlIF9pbmZvcm1hdGlvblNjaGVtYTpJbmZvcm1hdGlvblNjaGVtYVJlYWRlcnxudWxsPW51bGw7XHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpDb25uZWN0UGFyYW1zKVxyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudHx1bmRlZmluZWQpLCBfZG9uZTooKT0+dm9pZCwgX29wdHM/OmFueSlcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50PzoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnR8dW5kZWZpbmVkKSwgcHJpdmF0ZSBfZG9uZT86KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIGlmIChjbGllbnQgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDbGllbnQuY29uc3RydWN0b3I6IGNvbm5PcHRzICYgY2xpZW50IHVuZGVmaW5lZFwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDpzdHJpbmc7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VmFsdWVzOm51bGx8YW55W109bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqLyBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIGlmIG5vIHF1ZXJ5VGV4dCwgdGhlIHZhbHVlIG11c3QgYmUgc2hvd2VkIGFsc29cclxuICAgICAgICAgICAgdmFyIHNxbD1xdWVyeVRleHQ7XHJcbiAgICAgICAgICAgIGxvZyhNRVNTQUdFU19TRVBBUkFUT1IsIE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMgJiYgcXVlcnlWYWx1ZXMubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGxvZygnYCcrc3FsKydcXG5gJywnUVVFUlktUCcpO1xyXG4gICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHF1ZXJ5VmFsdWVzKSwnUVVFUlktQScpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlWYWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZTphbnksIGk6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzcWw9c3FsLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxcXCQnKyhpKzEpKydcXFxcYicpLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciBudW1iZXJzIGFuZCBib29sZWFucyBjYW4gYmUgdXNlZCBoZXJlIGFsc29cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGdldCBpbmZvcm1hdGlvblNjaGVtYSgpOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvcm1hdGlvblNjaGVtYSB8fCBuZXcgSW5mb3JtYXRpb25TY2hlbWFSZWFkZXIodGhpcyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGUoZmlsZU5hbWUsJ3V0Zi04JykudGhlbihmdW5jdGlvbihjb250ZW50KXtcclxuICAgICAgICAgICAgdmFyIHNlbnRlbmNlcyA9IGNvbnRlbnQuc3BsaXQoL1xccj9cXG5cXHI/XFxuLyk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGJ1bGtJbnNlcnQocGFyYW1zOkJ1bGtJbnNlcnRQYXJhbXMpOlByb21pc2U8dm9pZD57XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNxbCA9IFwiSU5TRVJUIElOVE8gXCIrKHBhcmFtcy5zY2hlbWE/cXVvdGVJZGVudChwYXJhbXMuc2NoZW1hKSsnLic6JycpK1xyXG4gICAgICAgICAgICBxdW90ZUlkZW50KHBhcmFtcy50YWJsZSkrXCIgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAocXVvdGVJZGVudCkuam9pbignLCAnKStcIikgVkFMVUVTIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKGZ1bmN0aW9uKF9uYW1lOnN0cmluZywgaV9uYW1lOm51bWJlcil7IHJldHVybiAnJCcrKGlfbmFtZSsxKTsgfSkrXCIpXCI7XHJcbiAgICAgICAgdmFyIGlfcm93cz0wO1xyXG4gICAgICAgIHdoaWxlKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHVuZXhwZWN0ZWQoZXJyKTtcclxuICAgICAgICAgICAgICAgIGlmKHBhcmFtcy5vbmVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwYXJhbXMub25lcnJvcihlcnJvciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHtyb3c6IHBhcmFtcy5yb3dzW2lfcm93c119KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpX3Jvd3MrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHM6Q29weUZyb21PcHRzKXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2VzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgcG9yIGxhIHJlZ2V4cCBlcyBpbXBvc2libGUgcXVlIHBhc2UgYWwgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzKSByZXR1cm4gJ1xcXFxcXFxcJztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBFc3RvIGVzIGltcG9zaWJsZSBxdWUgc3VjZWRhICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7X2FsbH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlcnxudWxsXHJcbiAgICBmaWVsZHM6dHlwZW9mIHF1ZXJ5UmVzdWx0LmZpZWxkc1xyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Q29tbWFuZHtcclxuICAgIGNvbW1hbmQ6c3RyaW5nLCByb3dDb3VudDpudW1iZXJ8bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93IGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Ontba2V5OnN0cmluZ106YW55fVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93SWZFeGlzdHMgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c/Ontba2V5OnN0cmluZ106YW55fXxudWxsXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRSb3dzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93czp7W2tleTpzdHJpbmddOmFueX1bXVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0VmFsdWUgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICB2YWx1ZTphbnlcclxufVxyXG4vLyBleHBvcnQgaW50ZXJmYWNlIFJlc3VsdEdlbmVyaWMgZXh0ZW5kcyBSZXN1bHRWYWx1ZSwgUmVzdWx0Um93cywgUmVzdWx0T25lUm93SWZFeGlzdHMsIFJlc3VsdE9uZVJvdywgUmVzdWx0e31cclxuZXhwb3J0IHR5cGUgUmVzdWx0R2VuZXJpYyA9IFJlc3VsdFZhbHVlfFJlc3VsdFJvd3N8UmVzdWx0T25lUm93SWZFeGlzdHN8UmVzdWx0T25lUm93fFJlc3VsdHxSZXN1bHRDb21tYW5kXHJcblxyXG4vKlxyXG5mdW5jdGlvbiBidWlsZFF1ZXJ5Q291bnRlckFkYXB0ZXIoXHJcbiAgICBtaW5Db3VudFJvdzpudW1iZXIsIFxyXG4gICAgbWF4Q291bnRSb3c6bnVtYmVyLCBcclxuICAgIGV4cGVjdFRleHQ6c3RyaW5nLCBcclxuICAgIGNhbGxiYWNrT3RoZXJDb250cm9sPzoocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWRcclxuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbiBxdWVyeUNvdW50ZXJBZGFwdGVyKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpeyBcclxuICAgICAgICBpZihyZXN1bHQucm93cy5sZW5ndGg8bWluQ291bnRSb3cgfHwgcmVzdWx0LnJvd3MubGVuZ3RoPm1heENvdW50Um93ICl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKCdxdWVyeSBleHBlY3RzICcrZXhwZWN0VGV4dCsnIGFuZCBvYnRhaW5zICcrcmVzdWx0LnJvd3MubGVuZ3RoKycgcm93cycpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSc1NDAxMSEnO1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tPdGhlckNvbnRyb2wpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tPdGhlckNvbnRyb2wocmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ub3RoZXJ9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLm90aGVyfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiovXHJcblxyXG50eXBlIE5vdGljZSA9IHN0cmluZztcclxuXHJcbmZ1bmN0aW9uIGxvZ0Vycm9ySWZOZWVkZWQ8VD4oZXJyOkVycm9yLCBjb2RlPzpUKTpFcnJvcntcclxuICAgIGlmKGNvZGUgIT0gbnVsbCl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGVyci5jb2RlPWNvZGU7XHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgaWYobG9nKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgbG9nKCctLUVSUk9SISAnK2Vyci5jb2RlKycsICcrZXJyLm1lc3NhZ2UsICdFUlJPUicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVycjtcclxufVxyXG5cclxuZnVuY3Rpb24gb2J0YWlucyhtZXNzYWdlOnN0cmluZywgY291bnQ6bnVtYmVyfG51bGwpOnN0cmluZ3tcclxuICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoJyQxJyxcclxuICAgICAgICBjb3VudD9tZXNzYWdlcy5vYnRhaW5zMS5yZXBsYWNlKCckMScsXCJcIitjb3VudCk6bWVzc2FnZXMub2J0YWluc05vbmVcclxuICAgICk7XHJcbn0gXHJcblxyXG5cclxuY2xhc3MgUXVlcnl7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVyeTpwZy5RdWVyeSwgcHVibGljIGNsaWVudDpDbGllbnQsIHByaXZhdGUgX2ludGVybmFsQ2xpZW50OnBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KXtcclxuICAgIH1cclxuICAgIG9uTm90aWNlKGNhbGxiYWNrTm90aWNlQ29uc3VtZXI6KG5vdGljZTpOb3RpY2UpPT52b2lkKTpRdWVyeXtcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uKG5vdGljZTpOb3RpY2Upe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqLyAvLyBAdHMtaWdub3JlICBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhIExBQ0tTIG9mIGFjdGl2ZVF1ZXJ5XHJcbiAgICAgICAgICAgIGlmKHEuX2ludGVybmFsQ2xpZW50LmFjdGl2ZVF1ZXJ5PT1xLl9xdWVyeSl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja05vdGljZUNvbnN1bWVyKG5vdGljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ25vdGljZScpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICB0aGlzLl9pbnRlcm5hbENsaWVudC5vbignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdmFyIHJlbW92ZU5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uIHJlbW92ZU5vdGljZUNhbGxiYWNrKCl7XHJcbiAgICAgICAgICAgIHEuX2ludGVybmFsQ2xpZW50LnJlbW92ZUxpc3RlbmVyKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2VuZCcscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlcnJvcicscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHByaXZhdGUgX2V4ZWN1dGU8VFIgZXh0ZW5kcyBSZXN1bHRHZW5lcmljPihcclxuICAgICAgICBhZGFwdGVyQ2FsbGJhY2s6bnVsbHwoKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlRSKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZCksXHJcbiAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93Pzoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+LCBcclxuICAgICk6UHJvbWlzZTxUUj57XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgdmFyIHBlbmRpbmdSb3dzPTA7XHJcbiAgICAgICAgICAgIHZhciBlbmRNYXJrOm51bGx8e3Jlc3VsdDpwZy5RdWVyeVJlc3VsdH09bnVsbDtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2Vycm9yJyxmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC5vbigncm93JykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbigncm93Jyxhc3luYyBmdW5jdGlvbihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZihjYWxsYmFja0ZvckVhY2hSb3cpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdSb3dzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cgJiYgYWxzb0xvZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlbmRNYXJrLnJlc3VsdCBhcyB1bmtub3duIGFzIFRSKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgIGlmKGxvZyAmJiBhbHNvTG9nUm93cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICByZWFkeUxvZyA9IHJlYWR5TG9nLnRoZW4oXz0+ZnMud3JpdGVGaWxlKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lLGxpbmVzLmpvaW4oJ1xcbicpKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXR0cjIsIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHIyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2VUeXBlPT1NRVNTQUdFU19TRVBBUkFUT1JfVFlQRSl7XHJcbiAgICAgICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW21lc3NhZ2VUeXBlXSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5sb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSA9ICcuL2xvY2FsLXNxbC1lcnJvci5sb2cnO1xyXG5sb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcz17fSBhcyB7XHJcbiAgICBba2V5OnN0cmluZ106c3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9vbEJhbGFuY2VDb250cm9sKCl7XHJcbiAgICB2YXIgcnRhOnN0cmluZ1tdPVtdO1xyXG4gICAgaWYodHlwZW9mIGRlYnVnLnBvb2wgPT09IFwib2JqZWN0XCIpe1xyXG4gICAgICAgIGxpa2VBcihkZWJ1Zy5wb29sKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpe1xyXG4gICAgICAgICAgICBpZihwb29sLmNvdW50KXtcclxuICAgICAgICAgICAgICAgIHJ0YS5wdXNoKG1lc3NhZ2VzLnVuYmFsYW5jZWRDb25uZWN0aW9uKycgJyt1dGlsLmluc3BlY3QocG9vbCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnRhLmpvaW4oJ1xcbicpO1xyXG59O1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNodXRkb3duKHZlcmJvc2U6Ym9vbGVhbil7XHJcbiAgICB2YXIgd2FpdEZvcjogUHJvbWlzZTx2b2lkPltdID0gW11cclxuICAgIGZvciAodmFyIHBvb2wgb2YgbGlrZUFyLml0ZXJhdG9yKHBvb2xzKSkge1xyXG4gICAgICAgIHdhaXRGb3IucHVzaChwb29sLmVuZCgpKTtcclxuICAgIH1cclxuICAgIGlmICh2ZXJib3NlKSBjb25zb2xlLmxvZygncG9vbEJhbGFuY2VDb250cm9sJyk7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwod2FpdEZvcik7XHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbnByb2Nlc3Mub24oJ2V4aXQnLGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG59KTtcclxuIl19