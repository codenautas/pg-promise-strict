"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolBalanceControl = exports.logLastError = exports.readyLog = exports.connect = exports.setAllTypes = exports.allTypes = exports.Client = exports.InformationSchemaReader = exports.easy = exports.adaptParameterTypes = exports.jsono = exports.json = exports.param3rd4sql = exports.quoteLiteral = exports.quoteNullable = exports.quoteIdentList = exports.quoteIdent = exports.logExceptions = exports.alsoLogRows = exports.log = exports.noLog = exports.defaults = exports.debug = exports.setLang = exports.i18n = exports.messages = void 0;
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
        else /* istanbul ignore else */ if (queryArguments[0] instanceof Object) {
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
/* istanbul ignore next */
process.on('exit', function () {
    console.warn(poolBalanceControl());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFRLEVBQUMsWUFBWTtJQUNyQixXQUFXLEVBQUMsY0FBYztJQUMxQix3QkFBd0IsRUFBQyxnQ0FBZ0M7SUFDekQsc0JBQXNCLEVBQUMsOEJBQThCO0lBQ3JELHFCQUFxQixFQUFDLDBEQUEwRDtJQUNoRixvQkFBb0IsRUFBQyx5REFBeUQ7SUFDOUUsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELG9C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QUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQgeyB1bmV4cGVjdGVkIH0gZnJvbSAnY2FzdC1lcnJvcic7XHJcbmltcG9ydCB7U3RyZWFtLCBUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XHJcblxyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRT0nLS0tLS0tJztcclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SPSctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7XHJcblxyXG5leHBvcnQgdmFyIG1lc3NhZ2VzID0ge1xyXG4gICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBidWxrSW5zZXJ0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGNvcHlGcm9tIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNlbnRlbmNlcyBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTcWxTY3JpcHQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50IGFscmVhZHkgZG9uZVwiLFxyXG4gICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwiY2xpZW50LmNvbm5lY3QgbXVzdCBubyByZWNlaXZlIHBhcmFtZXRlcnMsIGl0IHJldHVybnMgYSBQcm9taXNlXCIsXHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZnVuYyBpcyBleHBlcmltZW50YWxcIixcclxuICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBtdXN0IHJlY2VpdmUgYSBjYWxsYmFjayB0aGF0IGV4ZWN1dGVzIGZvciBlYWNoIHJvd1wiLFxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCBlcnJvciBwYXJzaW5nXCIsXHJcbiAgICBpbnNhbmVOYW1lOlwiaW5zYW5lIG5hbWVcIixcclxuICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBsYWNrIG9mIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGNvbm5lY3QgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGVuZCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJudWxsIGluIHF1b3RlTGl0ZXJhbFwiLFxyXG4gICAgb2J0YWluczE6XCJvYnRhaW5zICQxXCIsXHJcbiAgICBvYnRhaW5zTm9uZTpcIm9idGFpbnMgbm9uZVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgZmllbGQgYW5kICQxXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgcm93IGFuZCAkMVwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIGNhdGNoZWRcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIHRoZW5lZFwiLFxyXG4gICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgdW5iYWxhbmNlZENvbm5lY3Rpb246XCJwZ1Byb21pc2VTdHJpY3QuZGVidWcucG9vbCB1bmJhbGFuY2VkIGNvbm5lY3Rpb25cIixcclxufVxyXG5cclxuZXhwb3J0IHZhciBpMThuOntcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjp0eXBlb2YgbWVzc2FnZXMsXHJcbiAgICAgICAgW2s6c3RyaW5nXTpQYXJ0aWFsPHR5cGVvZiBtZXNzYWdlcz5cclxuICAgIH1cclxufSA9IHtcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjptZXNzYWdlcyxcclxuICAgICAgICBlczp7XHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGJ1bGtJbnNlcnQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGNvcHlGcm9tIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTZW50ZW5jZXMgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNxbFNjcmlwdCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBlbCBjbGllbnRlIHlhIGZ1ZSB0ZXJtaW5hZG9cIixcclxuICAgICAgICAgICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudC5jb25uZWN0IG5vIGRlYmUgcmVjaWJpciBwYXJhbWV0ZXRyb3MsIGRldnVlbHZlIHVuYSBQcm9tZXNhXCIsXHJcbiAgICAgICAgICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBlcyBleHBlcmltZW50YWxcIixcclxuICAgICAgICAgICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IGRlYmUgcmVjaWJpciB1bmEgZnVuY2lvbiBjYWxsYmFjayBwYXJhIGVqZWN1dGFyIGVuIGNhZGEgcmVnaXN0cm9cIixcclxuICAgICAgICAgICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJlcnJvciBhbCBwYXJzZWFyIGVuIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wXCIsXHJcbiAgICAgICAgICAgIGluc2FuZU5hbWU6XCJub21icmUgaW52YWxpZG8gcGFyYSBvYmpldG8gc3FsLCBkZWJlIHNlciBzb2xvIGxldHJhcywgbnVtZXJvcyBvIHJheWFzIGVtcGV6YW5kbyBwb3IgdW5hIGxldHJhXCIsXHJcbiAgICAgICAgICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBmYWx0YSBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgICAgICAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE5vIHNlIHB1ZWRlIGNvbmVjdGFyIHVuICdDbGllbnQnIGRlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogbm8gZGViZSB0ZXJtaW5hciBlbCBjbGllbnQgZGVzZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcImxhIGZ1bmNpb24gcXVvdGVMaXRlcmFsIG5vIGRlYmUgcmVjaWJpciBudWxsXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnMxOlwic2Ugb2J0dXZpZXJvbiAkMVwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zTm9uZTpcIm5vIHNlIG9idHV2byBuaW5ndW5vXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gc29sbyB2YWxvciAoY29sdW1uYSBvIGNhbXBvKSB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHJlZ2lzdHJvIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyBjYXRjaFwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gdGhlblwiLFxyXG4gICAgICAgICAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiAncXVlcnknIG5vIGNvbmVjdGFkYVwiLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldExhbmcobGFuZzpzdHJpbmcpe1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuZXhwb3J0IHZhciBhbHNvTG9nUm93cyA9IGZhbHNlO1xyXG5leHBvcnQgdmFyIGxvZ0V4Y2VwdGlvbnMgPSBmYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7bmFtZX0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5pbnNhbmVOYW1lKTtcclxuICAgIH1cclxuICAgIHJldHVybiAnXCInK25hbWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnRMaXN0KG9iamVjdE5hbWVzOnN0cmluZ1tdKXtcclxuICAgIHJldHVybiBvYmplY3ROYW1lcy5tYXAoZnVuY3Rpb24ob2JqZWN0TmFtZSl7IHJldHVybiBxdW90ZUlkZW50KG9iamVjdE5hbWUpOyB9KS5qb2luKCcsJyk7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbnlRdW90ZWFibGUgPSBzdHJpbmd8bnVtYmVyfERhdGV8e2lzUmVhbERhdGU6Ym9vbGVhbiwgdG9ZbWQ6KCk9PnN0cmluZ318e3RvUG9zdGdyZXM6KCk9PnN0cmluZ318e3RvU3RyaW5nOigpPT5zdHJpbmd9O1xyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZTpudWxsfEFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuICdudWxsJztcclxuICAgIH1cclxuICAgIHZhciB0ZXh0OnN0cmluZ1xyXG4gICAgaWYodHlwZW9mIGFueVZhbHVlPT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlO1xyXG4gICAgfWVsc2UgaWYoIShhbnlWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkpe1xyXG4gICAgICAgIHRleHQ9YW55VmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCdpc1JlYWxEYXRlJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS5pc1JlYWxEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9ZbWQoKTtcclxuICAgIH1lbHNlIGlmKGFueVZhbHVlIGluc3RhbmNlb2YgRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZigndG9Qb3N0Z3JlcycgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUudG9Qb3N0Z3JlcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9Qb3N0Z3JlcygpO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KGFueVZhbHVlKTtcclxuICAgIH1cclxuICAgIGlmKHRleHQ9PXVuZGVmaW5lZCl7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7YW55VmFsdWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1b3RhYmxlTnVsbCBpbnNhbmUgdmFsdWU6ICcrdHlwZW9mIGFueVZhbHVlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7YW55VmFsdWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubnVsbEluUXVvdGVMaXRlcmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBxdW90ZU51bGxhYmxlKGFueVZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBwYXJhbTNyZDRzcWw9KGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdLCBiYXNlPzpzdHJpbmcsIGtleXM/OnN0cmluZ3xzdHJpbmdbXSk9PlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09dHJ1ZT9gdG9fanNvbmIoJHtiYXNlfSkgLSAke2tleXMgaW5zdGFuY2VvZiBBcnJheT9rZXlzOmtleXM/LnNwbGl0KCcsJykubWFwKHg9PnF1b3RlTGl0ZXJhbCh4LnRyaW0oKSkpfWA6XHJcbiAgICBleHByT3JXaXRob3V0a2V5T3JLZXlzPT1udWxsP2B0b19qc29uYigke2Jhc2V9KWA6XHJcbiAgICB0eXBlb2YgZXhwck9yV2l0aG91dGtleU9yS2V5cyA9PSBcInN0cmluZ1wiP2V4cHJPcldpdGhvdXRrZXlPcktleXM6XHJcbiAgICBgdG9fanNvbmIoanNvbmJfYnVpbGRfb2JqZWN0KCR7ZXhwck9yV2l0aG91dGtleU9yS2V5cy5tYXAobmFtZT0+cXVvdGVMaXRlcmFsKG5hbWUpKycsICcrcXVvdGVJZGVudChuYW1lKSkuam9pbignLCAnKX0pKWBcclxuICAgIDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfYWdnKCR7cGFyYW0zcmQ0c3FsKGV4cHJPcldpdGhvdXRrZXlPcktleXMsJ2ouKicsb3JkZXJieSl9IE9SREVSIEJZICR7b3JkZXJieX0pIGZyb20gKCR7c3FsfSkgYXMgaiksJ1tdJzo6anNvbmIpYDtcclxuICAgIC8vIHJldHVybiBgKFNFTEVDVCBjb2FsZXNjZShqc29uYl9hZ2codG9fanNvbmIoai4qKSBPUkRFUiBCWSAke29yZGVyYnl9KSwnW10nOjpqc29uYikgZnJvbSAoJHtzcWx9KSBhcyBqKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsZXhwcjpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsa2V5czpzdHJpbmdbXSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyx3aXRob3V0S2V5czp0cnVlKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHJPcldpdGhvdXRrZXlPcktleXM/OnN0cmluZ3x0cnVlfHN0cmluZ1tdKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9vYmplY3RfYWdnKCR7aW5kZXhlZGJ5fSwke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLGluZGV4ZWRieSl9KSBmcm9tICgke3NxbH0pIGFzIGopLCd7fSc6Ompzb25iKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzQ29tbW9uPXt0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkLCB3aXRoPzpzdHJpbmd9XHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0ZpbGU9e2luU3RyZWFtPzp1bmRlZmluZWQsIGZpbGVuYW1lOnN0cmluZ30mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c1N0cmVhbT17aW5TdHJlYW06U3RyZWFtLGZpbGVuYW1lPzp1bmRlZmluZWR9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHM9Q29weUZyb21PcHRzRmlsZXxDb3B5RnJvbU9wdHNTdHJlYW1cclxuZXhwb3J0IHR5cGUgQnVsa0luc2VydFBhcmFtcz17c2NoZW1hPzpzdHJpbmcsdGFibGU6c3RyaW5nLGNvbHVtbnM6c3RyaW5nW10scm93czphbnlbXVtdLCBvbmVycm9yPzooZXJyOkVycm9yLCByb3c6YW55W10pPT5Qcm9taXNlPHZvaWQ+fVxyXG5cclxuZXhwb3J0IHR5cGUgQ29sdW1uID0ge2RhdGFfdHlwZTpzdHJpbmd9O1xyXG5cclxuZXhwb3J0IGNsYXNzIEluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBjbGllbnQ6Q2xpZW50KXtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvbHVtbih0YWJsZV9zY2hlbWE6c3RyaW5nLCB0YWJsZV9uYW1lOnN0cmluZywgY29sdW1uX25hbWU6c3RyaW5nKTpQcm9taXNlPENvbHVtbnxudWxsPntcclxuICAgICAgICB2YXIgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQucXVlcnkoYFxyXG4gICAgICAgICAgICBzZWxlY3QgKiBcclxuICAgICAgICAgICAgICAgIGZyb20gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnNcclxuICAgICAgICAgICAgICAgIHdoZXJlIHRhYmxlX3NjaGVtYT0kMVxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCB0YWJsZV9uYW1lPSQyXHJcbiAgICAgICAgICAgICAgICAgICAgYW5kIGNvbHVtbl9uYW1lPSQzO1xyXG4gICAgICAgIGAsW3RhYmxlX3NjaGVtYSwgdGFibGVfbmFtZSwgY29sdW1uX25hbWVdKS5mZXRjaE9uZVJvd0lmRXhpc3RzKCk7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKioqJyxhcmd1bWVudHMscmVzdWx0LnJvdywgcmVzdWx0LnJvd3x8bnVsbClcclxuICAgICAgICByZXR1cm4gKHJlc3VsdC5yb3cgfHwgbnVsbCkgYXMgQ29sdW1ufG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBUT0RPOiBhbnkgZW4gb3B0cyAqL1xyXG5leHBvcnQgY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBjb25uZWN0ZWQ6bnVsbHx7XHJcbiAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpudW1iZXIsXHJcbiAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bnVtYmVyXHJcbiAgICB9PW51bGw7XHJcbiAgICBwcml2YXRlIGZyb21Qb29sOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBwcml2YXRlIHBvc3RDb25uZWN0KCl7XHJcbiAgICAgICAgdmFyIG5vd1RzPW5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0ge1xyXG4gICAgICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm5vd1RzLFxyXG4gICAgICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpub3dUc1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHByaXZhdGUgX2NsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfXxudWxsO1xyXG4gICAgcHJpdmF0ZSBfaW5mb3JtYXRpb25TY2hlbWE6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ8bnVsbD1udWxsO1xyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6Q29ubmVjdFBhcmFtcylcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOm51bGwsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpLCBfZG9uZTooKT0+dm9pZCwgX29wdHM/OmFueSlcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50PzoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpLCBwcml2YXRlIF9kb25lPzooKT0+dm9pZCwgX29wdHM/OmFueSl7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50ID0gY2xpZW50IGFzIChwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgIGlmKGNvbm5PcHRzPT1udWxsKXtcclxuICAgICAgICAgICAgdGhpcy5mcm9tUG9vbD10cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgIC8qIERPSU5HXHJcbiAgICAgICAgICAgIGlmKHNlbGYub3B0cy50aW1lb3V0Q29udHJvbGxlcil7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxUaW1lb3V0KHNlbGYudGltZW91dENvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlbGYudGltZW91dENvbnRyb2xsZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50ID0gdGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgY2xpZW50LmNvbm5lY3QoZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZWxmKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgZW5kKCl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RFbmRDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZih0aGlzLl9jbGllbnQgaW5zdGFuY2VvZiBwZy5DbGllbnQpe1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuZW5kKCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb25lKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRBbHJlYWR5RG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIERFQlVHR0lOR1xyXG4gICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50LS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnRUb0RvbmU9dGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHRoaXMuX2NsaWVudD1udWxsO1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgYXJndW1lbnRzIEFycmF5IGxpa2UgYW5kIGFwcGx5YWJsZVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lLmFwcGx5KGNsaWVudFRvRG9uZSwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcpOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nLCBwYXJhbXM6YW55W10pOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWxPYmplY3Q6e3RleHQ6c3RyaW5nLCB2YWx1ZXM6YW55W119KTpRdWVyeVxyXG4gICAgcXVlcnkoKTpRdWVyeXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLmNvbm5lY3RlZCB8fCAhdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5Tm90Q29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbm5lY3RlZC5sYXN0T3BlcmF0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5QXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcXVlcnlUZXh0O1xyXG4gICAgICAgIHZhciBxdWVyeVZhbHVlcz1udWxsO1xyXG4gICAgICAgIGlmKHR5cGVvZiBxdWVyeUFyZ3VtZW50c1swXSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXTtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBxdWVyeUFyZ3VtZW50c1sxXSA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMV18fG51bGwpO1xyXG4gICAgICAgIH1lbHNlIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovIGlmKHF1ZXJ5QXJndW1lbnRzWzBdIGluc3RhbmNlb2YgT2JqZWN0KXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF0udGV4dDtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlc3x8bnVsbCk7XHJcbiAgICAgICAgICAgIHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlcyA9IHF1ZXJ5VmFsdWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqL1xyXG4gICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgIHZhciBzcWw9cXVlcnlUZXh0O1xyXG4gICAgICAgICAgICBsb2coTUVTU0FHRVNfU0VQQVJBVE9SLCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRSk7XHJcbiAgICAgICAgICAgIGlmKHF1ZXJ5VmFsdWVzICYmIHF1ZXJ5VmFsdWVzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBsb2coJ2AnK3NxbCsnXFxuYCcsJ1FVRVJZLVAnKTtcclxuICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShxdWVyeVZhbHVlcyksJ1FVRVJZLUEnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWU6YW55LCBpOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3FsPXNxbC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwkJysoaSsxKSsnXFxcXGInKSwgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGdldCBpbmZvcm1hdGlvblNjaGVtYSgpOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvcm1hdGlvblNjaGVtYSB8fCBuZXcgSW5mb3JtYXRpb25TY2hlbWFSZWFkZXIodGhpcyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGUoZmlsZU5hbWUsJ3V0Zi04JykudGhlbihmdW5jdGlvbihjb250ZW50KXtcclxuICAgICAgICAgICAgdmFyIHNlbnRlbmNlcyA9IGNvbnRlbnQuc3BsaXQoL1xccj9cXG5cXHI/XFxuLyk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGJ1bGtJbnNlcnQocGFyYW1zOkJ1bGtJbnNlcnRQYXJhbXMpOlByb21pc2U8dm9pZD57XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNxbCA9IFwiSU5TRVJUIElOVE8gXCIrKHBhcmFtcy5zY2hlbWE/cXVvdGVJZGVudChwYXJhbXMuc2NoZW1hKSsnLic6JycpK1xyXG4gICAgICAgICAgICBxdW90ZUlkZW50KHBhcmFtcy50YWJsZSkrXCIgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAocXVvdGVJZGVudCkuam9pbignLCAnKStcIikgVkFMVUVTIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKGZ1bmN0aW9uKF9uYW1lOnN0cmluZywgaV9uYW1lOm51bWJlcil7IHJldHVybiAnJCcrKGlfbmFtZSsxKTsgfSkrXCIpXCI7XHJcbiAgICAgICAgdmFyIGlfcm93cz0wO1xyXG4gICAgICAgIHdoaWxlKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHVuZXhwZWN0ZWQoZXJyKTtcclxuICAgICAgICAgICAgICAgIGlmKHBhcmFtcy5vbmVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwYXJhbXMub25lcnJvcihlcnJvciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHtyb3c6IHBhcmFtcy5yb3dzW2lfcm93c119KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpX3Jvd3MrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHM6Q29weUZyb21PcHRzKXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2VzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgcG9yIGxhIHJlZ2V4cCBlcyBpbXBvc2libGUgcXVlIHBhc2UgYWwgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzKSByZXR1cm4gJ1xcXFxcXFxcJztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBFc3RvIGVzIGltcG9zaWJsZSBxdWUgc3VjZWRhICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7X2FsbH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihsb2cpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBsb2coJy0tRVJST1IhICcrZXJyLmNvZGUrJywgJytlcnIubWVzc2FnZSwgJ0VSUk9SJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXJyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvYnRhaW5zKG1lc3NhZ2U6c3RyaW5nLCBjb3VudDpudW1iZXIpOnN0cmluZ3tcclxuICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoJyQxJyxcclxuICAgICAgICBjb3VudD9tZXNzYWdlcy5vYnRhaW5zMS5yZXBsYWNlKCckMScsY291bnQudG9TdHJpbmcoKSk6bWVzc2FnZXMub2J0YWluc05vbmVcclxuICAgICk7XHJcbn0gXHJcblxyXG5cclxuY2xhc3MgUXVlcnl7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVyeTpwZy5RdWVyeSwgcHVibGljIGNsaWVudDpDbGllbnQsIHByaXZhdGUgX2ludGVybmFsQ2xpZW50OnBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KXtcclxuICAgIH1cclxuICAgIG9uTm90aWNlKGNhbGxiYWNrTm90aWNlQ29uc3VtZXI6KG5vdGljZTpOb3RpY2UpPT52b2lkKTpRdWVyeXtcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uKG5vdGljZTpOb3RpY2Upe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqLyAvLyBAdHMtaWdub3JlICBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhIExBQ0tTIG9mIGFjdGl2ZVF1ZXJ5XHJcbiAgICAgICAgICAgIGlmKHEuX2ludGVybmFsQ2xpZW50LmFjdGl2ZVF1ZXJ5PT1xLl9xdWVyeSl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja05vdGljZUNvbnN1bWVyKG5vdGljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ25vdGljZScpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICB0aGlzLl9pbnRlcm5hbENsaWVudC5vbignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdmFyIHJlbW92ZU5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uIHJlbW92ZU5vdGljZUNhbGxiYWNrKCl7XHJcbiAgICAgICAgICAgIHEuX2ludGVybmFsQ2xpZW50LnJlbW92ZUxpc3RlbmVyKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2VuZCcscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlcnJvcicscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHByaXZhdGUgX2V4ZWN1dGU8VFIgZXh0ZW5kcyBSZXN1bHRHZW5lcmljPihcclxuICAgICAgICBhZGFwdGVyQ2FsbGJhY2s6bnVsbHwoKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlRSKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZCksXHJcbiAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93Pzoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+LCBcclxuICAgICk6UHJvbWlzZTxUUj57XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgdmFyIHBlbmRpbmdSb3dzPTA7XHJcbiAgICAgICAgICAgIHZhciBlbmRNYXJrOm51bGx8e3Jlc3VsdDpwZy5RdWVyeVJlc3VsdH09bnVsbDtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2Vycm9yJyxmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC5vbigncm93JykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbigncm93Jyxhc3luYyBmdW5jdGlvbihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZihjYWxsYmFja0ZvckVhY2hSb3cpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdSb3dzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cgJiYgYWxzb0xvZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlbmRNYXJrLnJlc3VsdCBhcyB1bmtub3duIGFzIFRSKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgIGlmKGxvZyAmJiBhbHNvTG9nUm93cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICByZWFkeUxvZyA9IHJlYWR5TG9nLnRoZW4oXz0+ZnMud3JpdGVGaWxlKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lLGxpbmVzLmpvaW4oJ1xcbicpKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXR0cjIsIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHIyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2VUeXBlPT1NRVNTQUdFU19TRVBBUkFUT1JfVFlQRSl7XHJcbiAgICAgICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW21lc3NhZ2VUeXBlXSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5sb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSA9ICcuL2xvY2FsLXNxbC1lcnJvci5sb2cnO1xyXG5sb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcz17fSBhcyB7XHJcbiAgICBba2V5OnN0cmluZ106c3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9vbEJhbGFuY2VDb250cm9sKCl7XHJcbiAgICB2YXIgcnRhOnN0cmluZ1tdPVtdO1xyXG4gICAgaWYodHlwZW9mIGRlYnVnLnBvb2wgPT09IFwib2JqZWN0XCIpe1xyXG4gICAgICAgIGxpa2VBcihkZWJ1Zy5wb29sKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpe1xyXG4gICAgICAgICAgICBpZihwb29sLmNvdW50KXtcclxuICAgICAgICAgICAgICAgIHJ0YS5wdXNoKG1lc3NhZ2VzLnVuYmFsYW5jZWRDb25uZWN0aW9uKycgJyt1dGlsLmluc3BlY3QocG9vbCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnRhLmpvaW4oJ1xcbicpO1xyXG59O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxucHJvY2Vzcy5vbignZXhpdCcsZnVuY3Rpb24oKXtcclxuICAgIGNvbnNvbGUud2Fybihwb29sQmFsYW5jZUNvbnRyb2woKSk7XHJcbn0pO1xyXG4iXX0=