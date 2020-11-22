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
exports.param3rd4sql = (exprOrWithoutkeyOrKeys, base, keys) => exprOrWithoutkeyOrKeys == true ? `to_jsonb(${base}) - ${keys instanceof Array ? keys : keys === null || keys === void 0 ? void 0 : keys.split(',').map(x => quoteLiteral(x.trim()))}` :
    exprOrWithoutkeyOrKeys == null ? `to_jsonb(${base})` :
        typeof exprOrWithoutkeyOrKeys == "string" ? exprOrWithoutkeyOrKeys :
            `to_jsonb(jsonb_build_object(${exprOrWithoutkeyOrKeys.map(name => quoteLiteral(name) + ', ' + quoteIdent(name)).join(', ')}))`;
function json(sql, orderby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_agg(${exports.param3rd4sql(exprOrWithoutkeyOrKeys, 'j.*', orderby)} ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}
exports.json = json;
function jsono(sql, indexedby, exprOrWithoutkeyOrKeys) {
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},${exports.param3rd4sql(exprOrWithoutkeyOrKeys, 'j.*', indexedby)}) from (${sql}) as j),'{}'::jsonb)`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QyxtQ0FBeUM7QUFFekMsTUFBTSx1QkFBdUIsR0FBQyxRQUFRLENBQUM7QUFDdkMsTUFBTSxrQkFBa0IsR0FBQyx5QkFBeUIsQ0FBQztBQUV4QyxRQUFBLFFBQVEsR0FBRztJQUNsQixpQ0FBaUMsRUFBQywwREFBMEQ7SUFDNUYsK0JBQStCLEVBQUMsd0RBQXdEO0lBQ3hGLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4Ryx1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELGlDQUFpQyxFQUFDLGlFQUFpRTtJQUNuRyw0Q0FBNEMsRUFBQyxrRUFBa0U7SUFDL0csZ0NBQWdDLEVBQUMsa0VBQWtFO0lBQ25HLHNDQUFzQyxFQUFDLDBDQUEwQztJQUNqRixVQUFVLEVBQUMsYUFBYTtJQUN4QixZQUFZLEVBQUMsMkNBQTJDO0lBQ3hELDRCQUE0QixFQUFDLHNEQUFzRDtJQUNuRix3QkFBd0IsRUFBQyxrREFBa0Q7SUFDM0Usa0JBQWtCLEVBQUMsc0JBQXNCO0lBQ3pDLFFBQVEsRUFBQyxZQUFZO0lBQ3JCLFdBQVcsRUFBQyxjQUFjO0lBQzFCLHdCQUF3QixFQUFDLGdDQUFnQztJQUN6RCxzQkFBc0IsRUFBQyw4QkFBOEI7SUFDckQscUJBQXFCLEVBQUMsMERBQTBEO0lBQ2hGLG9CQUFvQixFQUFDLHlEQUF5RDtJQUM5RSxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsb0JBQW9CLEVBQUMsa0RB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TyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7SUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIGlmKGxhbmcgaW4gaTE4bi5tZXNzYWdlcyl7XHJcbiAgICAgICAgbWVzc2FnZXMgPSB7Li4uaTE4bi5tZXNzYWdlcy5lbiwgLi4uaTE4bi5tZXNzYWdlc1tsYW5nXX07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmluc2FuZU5hbWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICdcIicrbmFtZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpKydcIic7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudExpc3Qob2JqZWN0TmFtZXM6c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIG9iamVjdE5hbWVzLm1hcChmdW5jdGlvbihvYmplY3ROYW1lKXsgcmV0dXJuIHF1b3RlSWRlbnQob2JqZWN0TmFtZSk7IH0pLmpvaW4oJywnKTtcclxufTtcclxuXHJcbmV4cG9ydCB0eXBlIEFueVF1b3RlYWJsZSA9IHN0cmluZ3xudW1iZXJ8RGF0ZXx7aXNSZWFsRGF0ZTpib29sZWFuLCB0b1ltZDooKT0+c3RyaW5nfXx7dG9Qb3N0Z3JlczooKT0+c3RyaW5nfXx7dG9TdHJpbmc6KCk9PnN0cmluZ307XHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZU51bGxhYmxlKGFueVZhbHVlOm51bGx8QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gJ251bGwnO1xyXG4gICAgfVxyXG4gICAgdmFyIHRleHQ6c3RyaW5nXHJcbiAgICBpZih0eXBlb2YgYW55VmFsdWU9PT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWU7XHJcbiAgICB9ZWxzZSBpZighKGFueVZhbHVlIGluc3RhbmNlb2YgT2JqZWN0KSl7XHJcbiAgICAgICAgdGV4dD1hbnlWYWx1ZS50b1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ2lzUmVhbERhdGUnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLmlzUmVhbERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1ltZCgpO1xyXG4gICAgfWVsc2UgaWYoYW55VmFsdWUgaW5zdGFuY2VvZiBEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9JU09TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCd0b1Bvc3RncmVzJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS50b1Bvc3RncmVzIGluc3RhbmNlb2YgRnVuY3Rpb24pe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b1Bvc3RncmVzKCk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB0ZXh0ID0gSlNPTi5zdHJpbmdpZnkoYW55VmFsdWUpO1xyXG4gICAgfVxyXG4gICAgaWYodGV4dD09dW5kZWZpbmVkKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3F1b3RhYmxlTnVsbCBpbnNhbmUgdmFsdWU6ICcrdHlwZW9mIGFueVZhbHVlKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIFwiJ1wiK3RleHQucmVwbGFjZSgvJy9nLFwiJydcIikrXCInXCI7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVMaXRlcmFsKGFueVZhbHVlOkFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGFyYW0zcmQ0c3FsPShleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSwgYmFzZT86c3RyaW5nLCBrZXlzPzpzdHJpbmd8c3RyaW5nW10pPT5cclxuICAgIGV4cHJPcldpdGhvdXRrZXlPcktleXM9PXRydWU/YHRvX2pzb25iKCR7YmFzZX0pIC0gJHtrZXlzIGluc3RhbmNlb2YgQXJyYXk/a2V5czprZXlzPy5zcGxpdCgnLCcpLm1hcCh4PT5xdW90ZUxpdGVyYWwoeC50cmltKCkpKX1gOlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09bnVsbD9gdG9fanNvbmIoJHtiYXNlfSlgOlxyXG4gICAgdHlwZW9mIGV4cHJPcldpdGhvdXRrZXlPcktleXMgPT0gXCJzdHJpbmdcIj9leHByT3JXaXRob3V0a2V5T3JLZXlzOlxyXG4gICAgYHRvX2pzb25iKGpzb25iX2J1aWxkX29iamVjdCgke2V4cHJPcldpdGhvdXRrZXlPcktleXMubWFwKG5hbWU9PnF1b3RlTGl0ZXJhbChuYW1lKSsnLCAnK3F1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywgJyl9KSlgXHJcbiAgICA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByOnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxrZXlzOnN0cmluZ1tdKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLHdpdGhvdXRLZXlzOnRydWUpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX2FnZygke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLG9yZGVyYnkpfSBPUkRFUiBCWSAke29yZGVyYnl9KSBmcm9tICgke3NxbH0pIGFzIGopLCdbXSc6Ompzb25iKWA7XHJcbiAgICAvLyByZXR1cm4gYChTRUxFQ1QgY29hbGVzY2UoanNvbmJfYWdnKHRvX2pzb25iKGouKikgT1JERVIgQlkgJHtvcmRlcmJ5fSksJ1tdJzo6anNvbmIpIGZyb20gKCR7c3FsfSkgYXMgailgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfb2JqZWN0X2FnZygke2luZGV4ZWRieX0sJHtwYXJhbTNyZDRzcWwoZXhwck9yV2l0aG91dGtleU9yS2V5cywnai4qJyxpbmRleGVkYnkpfSkgZnJvbSAoJHtzcWx9KSBhcyBqKSwne30nOjpqc29uYilgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdFBhcmFtZXRlclR5cGVzKHBhcmFtZXRlcnM/OmFueVtdKXtcclxuICAgIC8vIEB0cy1pZ25vcmUgXHJcbiAgICBpZihwYXJhbWV0ZXJzPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJhbWV0ZXJzLm1hcChmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgaWYodmFsdWUgJiYgdmFsdWUudHlwZVN0b3JlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTGl0ZXJhbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgZWFzeTpib29sZWFuPXRydWU7IC8vIGRlcHJlY2F0ZWQhXHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0UGFyYW1zPXtcclxuICAgIG1vdG9yPzpcInBvc3RncmVzXCJcclxuICAgIGRhdGFiYXNlPzpzdHJpbmdcclxuICAgIHVzZXI/OnN0cmluZ1xyXG4gICAgcGFzc3dvcmQ/OnN0cmluZ1xyXG4gICAgcG9ydD86bnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0NvbW1vbj17dGFibGU6c3RyaW5nLGNvbHVtbnM/OnN0cmluZ1tdLGRvbmU/OihlcnI/OkVycm9yKT0+dm9pZCwgd2l0aD86c3RyaW5nfVxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNGaWxlPXtpblN0cmVhbT86dW5kZWZpbmVkLCBmaWxlbmFtZTpzdHJpbmd9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNTdHJlYW09e2luU3RyZWFtOlN0cmVhbSxmaWxlbmFtZT86dW5kZWZpbmVkfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzPUNvcHlGcm9tT3B0c0ZpbGV8Q29weUZyb21PcHRzU3RyZWFtXHJcbmV4cG9ydCB0eXBlIEJ1bGtJbnNlcnRQYXJhbXM9e3NjaGVtYT86c3RyaW5nLHRhYmxlOnN0cmluZyxjb2x1bW5zOnN0cmluZ1tdLHJvd3M6YW55W11bXSwgb25lcnJvcj86KGVycjpFcnJvciwgcm93OmFueVtdKT0+UHJvbWlzZTx2b2lkPn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbHVtbiA9IHtkYXRhX3R5cGU6c3RyaW5nfTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY2xpZW50OkNsaWVudCl7XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb2x1bW4odGFibGVfc2NoZW1hOnN0cmluZywgdGFibGVfbmFtZTpzdHJpbmcsIGNvbHVtbl9uYW1lOnN0cmluZyk6UHJvbWlzZTxDb2x1bW58bnVsbD57XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnF1ZXJ5KGBcclxuICAgICAgICAgICAgc2VsZWN0ICogXHJcbiAgICAgICAgICAgICAgICBmcm9tIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zXHJcbiAgICAgICAgICAgICAgICB3aGVyZSB0YWJsZV9zY2hlbWE9JDFcclxuICAgICAgICAgICAgICAgICAgICBhbmQgdGFibGVfbmFtZT0kMlxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCBjb2x1bW5fbmFtZT0kMztcclxuICAgICAgICBgLFt0YWJsZV9zY2hlbWEsIHRhYmxlX25hbWUsIGNvbHVtbl9uYW1lXSkuZmV0Y2hPbmVSb3dJZkV4aXN0cygpOyBcclxuICAgICAgICBjb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKioqKicsYXJndW1lbnRzLHJlc3VsdC5yb3csIHJlc3VsdC5yb3d8fG51bGwpXHJcbiAgICAgICAgcmV0dXJuIChyZXN1bHQucm93IHx8IG51bGwpIGFzIENvbHVtbnxudWxsO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIHByaXZhdGUgX2luZm9ybWF0aW9uU2NoZW1hOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVyfG51bGw9bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50KXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmxhY2tPZkNsaWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnQgPSB0aGlzLl9jbGllbnQ7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBjbGllbnQuY29ubmVjdChmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucG9zdENvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNlbGYpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBlbmQoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RFbmRDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlOb3RDb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB2YXIgcXVlcnlBcmd1bWVudHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBxdWVyeVRleHQ7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VmFsdWVzPW51bGw7XHJcbiAgICAgICAgaWYodHlwZW9mIHF1ZXJ5QXJndW1lbnRzWzBdID09PSAnc3RyaW5nJyl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IHF1ZXJ5QXJndW1lbnRzWzFdID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1sxXXx8bnVsbCk7XHJcbiAgICAgICAgfWVsc2UgaWYocXVlcnlBcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBPYmplY3Qpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXS50ZXh0O1xyXG4gICAgICAgICAgICBxdWVyeVZhbHVlcyA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMF0udmFsdWVzfHxudWxsKTtcclxuICAgICAgICAgICAgcXVlcnlBcmd1bWVudHNbMF0udmFsdWVzID0gcXVlcnlWYWx1ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgIHZhciBzcWw9cXVlcnlUZXh0O1xyXG4gICAgICAgICAgICBsb2coTUVTU0FHRVNfU0VQQVJBVE9SLCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRSk7XHJcbiAgICAgICAgICAgIGlmKHF1ZXJ5VmFsdWVzICYmIHF1ZXJ5VmFsdWVzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBsb2coJ2AnK3NxbCsnXFxuYCcsJ1FVRVJZLVAnKTtcclxuICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShxdWVyeVZhbHVlcyksJ1FVRVJZLUEnKTtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWU6YW55LCBpOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgc3FsPXNxbC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwkJysoaSsxKSsnXFxcXGInKSwgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGdldCBpbmZvcm1hdGlvblNjaGVtYSgpOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvcm1hdGlvblNjaGVtYSB8fCBuZXcgSW5mb3JtYXRpb25TY2hlbWFSZWFkZXIodGhpcyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjZHA6UHJvbWlzZTxSZXN1bHRDb21tYW5kfHZvaWQ+ID0gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2Upe1xyXG4gICAgICAgICAgICBjZHAgPSBjZHAudGhlbihhc3luYyBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYoIXNlbnRlbmNlLnRyaW0oKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBzZWxmLnF1ZXJ5KHNlbnRlbmNlKS5leGVjdXRlKCkuY2F0Y2goZnVuY3Rpb24oZXJyOkVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNkcDtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTcWxTY3JpcHQoZmlsZU5hbWU6c3RyaW5nKXtcclxuICAgICAgICB2YXIgc2VsZj10aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZCtcIiBcIishdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZShmaWxlTmFtZSwndXRmLTgnKS50aGVuKGZ1bmN0aW9uKGNvbnRlbnQpe1xyXG4gICAgICAgICAgICB2YXIgc2VudGVuY2VzID0gY29udGVudC5zcGxpdCgvXFxyP1xcblxccj9cXG4vKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgYnVsa0luc2VydChwYXJhbXM6QnVsa0luc2VydFBhcmFtcyk6UHJvbWlzZTx2b2lkPntcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNxbCA9IFwiSU5TRVJUIElOVE8gXCIrKHBhcmFtcy5zY2hlbWE/cXVvdGVJZGVudChwYXJhbXMuc2NoZW1hKSsnLic6JycpK1xyXG4gICAgICAgICAgICBxdW90ZUlkZW50KHBhcmFtcy50YWJsZSkrXCIgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAocXVvdGVJZGVudCkuam9pbignLCAnKStcIikgVkFMVUVTIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKGZ1bmN0aW9uKF9uYW1lOnN0cmluZywgaV9uYW1lOm51bWJlcil7IHJldHVybiAnJCcrKGlfbmFtZSsxKTsgfSkrXCIpXCI7XHJcbiAgICAgICAgdmFyIGlfcm93cz0wO1xyXG4gICAgICAgIHdoaWxlKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKHBhcmFtcy5vbmVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwYXJhbXMub25lcnJvcihlcnIsIHBhcmFtcy5yb3dzW2lfcm93c10pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlfcm93cysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tUGFyc2VQYXJhbXMob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0pe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcHRzLmluU3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wKG51bGxhYmxlOmFueSl7XHJcbiAgICAgICAgaWYobnVsbGFibGU9PW51bGwpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNlIGlmKHR5cGVvZiBudWxsYWJsZSA9PT0gXCJudW1iZXJcIiAmJiBpc05hTihudWxsYWJsZSkpe1xyXG4gICAgICAgICAgICByZXR1cm4gJ1xcXFxOJ1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbGFibGUudG9TdHJpbmcoKS5yZXBsYWNlKC8oXFxyKXwoXFxuKXwoXFx0KXwoXFxcXCkvZywgXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihfYWxsOnN0cmluZyxic3I6c3RyaW5nLGJzbjpzdHJpbmcsYnN0OnN0cmluZyxiczpzdHJpbmcpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzcikgcmV0dXJuICdcXFxccic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNuKSByZXR1cm4gJ1xcXFxuJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic3QpIHJldHVybiAnXFxcXHQnO1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlIHBvciBsYSByZWdleHAgZXMgaW1wb3NpYmxlIHF1ZSBwYXNlIGFsIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgRXN0byBlcyBpbXBvc2libGUgcXVlIHN1Y2VkYSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIGlmKGxvZyl7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9idGFpbnMobWVzc2FnZTpzdHJpbmcsIGNvdW50Om51bWJlcik6c3RyaW5ne1xyXG4gICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgnJDEnLFxyXG4gICAgICAgIGNvdW50P21lc3NhZ2VzLm9idGFpbnMxLnJlcGxhY2UoJyQxJyxjb3VudC50b1N0cmluZygpKTptZXNzYWdlcy5vYnRhaW5zTm9uZVxyXG4gICAgKTtcclxufSBcclxuXHJcblxyXG5jbGFzcyBRdWVyeXtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX3F1ZXJ5OnBnLlF1ZXJ5LCBwdWJsaWMgY2xpZW50OkNsaWVudCwgcHJpdmF0ZSBfaW50ZXJuYWxDbGllbnQ6cGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgb25Ob3RpY2UoY2FsbGJhY2tOb3RpY2VDb25zdW1lcjoobm90aWNlOk5vdGljZSk9PnZvaWQpOlF1ZXJ5e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICB2YXIgbm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24obm90aWNlOk5vdGljZSl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSEgTEFDS1Mgb2YgYWN0aXZlUXVlcnlcclxuICAgICAgICAgICAgaWYocS5faW50ZXJuYWxDbGllbnQuYWN0aXZlUXVlcnk9PXEuX3F1ZXJ5KXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrTm90aWNlQ29uc3VtZXIobm90aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBAdHMtaWdub3JlIC5vbignbm90aWNlJykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgIHRoaXMuX2ludGVybmFsQ2xpZW50Lm9uKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB2YXIgcmVtb3ZlTm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24gcmVtb3ZlTm90aWNlQ2FsbGJhY2soKXtcclxuICAgICAgICAgICAgcS5faW50ZXJuYWxDbGllbnQucmVtb3ZlTGlzdGVuZXIoJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZW5kJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2Vycm9yJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZTxUUiBleHRlbmRzIFJlc3VsdEdlbmVyaWM+KFxyXG4gICAgICAgIGFkYXB0ZXJDYWxsYmFjazpudWxsfCgocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6VFIpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkKSxcclxuICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3c/Oihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4sIFxyXG4gICAgKTpQcm9taXNlPFRSPntcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICB2YXIgcGVuZGluZ1Jvd3M9MDtcclxuICAgICAgICAgICAgdmFyIGVuZE1hcms6bnVsbHx7cmVzdWx0OnBnLlF1ZXJ5UmVzdWx0fT1udWxsO1xyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZXJyb3InLGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdyb3cnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdyb3cnLGFzeW5jIGZ1bmN0aW9uKHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmKGNhbGxiYWNrRm9yRWFjaFJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ1Jvd3MrKztcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZW5kJyxmdW5jdGlvbihyZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogVkVSIFNJIEVTVE8gRVMgTkVDRVNBUklPXHJcbiAgICAgICAgICAgICAgICAvLyByZXN1bHQuY2xpZW50ID0gcS5jbGllbnQ7XHJcbiAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyZXN1bHQucm93cyksICdSRVNVTFQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVuZE1hcms9e3Jlc3VsdH07XHJcbiAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoZXJyKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB0aHJvdyBsb2dFcnJvcklmTmVlZGVkKFxyXG4gICAgICAgICAgICAgICAgbmV3IEVycm9yKG9idGFpbnMoZXJyb3JNZXNzYWdlfHxtZXNzYWdlcy5xdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDEsIHJlc3VsdC5maWVsZHMubGVuZ3RoKSksXHJcbiAgICAgICAgICAgICAgICAnNTRVMTEhJ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge3ZhbHVlOnJvd1tyZXN1bHQuZmllbGRzWzBdLm5hbWVdLCAuLi5yZXN1bHR9O1xyXG4gICAgfVxyXG4gICAgZmV0Y2hVbmlxdWVSb3coZXJyb3JNZXNzYWdlPzpzdHJpbmcsYWNjZXB0Tm9Sb3dzPzpib29sZWFuKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRPbmVSb3cpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIGlmKHJlc3VsdC5yb3dDb3VudCE9PTEgJiYgKCFhY2NlcHROb1Jvd3MgfHwgISFyZXN1bHQucm93Q291bnQpKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZVJvd0FuZDEscmVzdWx0LnJvd0NvdW50KSk7XHJcbiAgICAgICAgICAgICAgICAvL0B0cy1pZ25vcmUgZXJyLmNvZGVcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlID0gJzU0MDExISdcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKGVycm9yTWVzc2FnZT86c3RyaW5nKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2UsdHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcihtZXNzYWdlcy5mZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjayk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU11c3ROb3RCZVRoZW5lZClcclxuICAgIH1cclxuICAgIGNhdGNoKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZClcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgaWYobWVzc2FnZVR5cGUpe1xyXG4gICAgICAgIGlmKG1lc3NhZ2VUeXBlPT0nRVJST1InKXtcclxuICAgICAgICAgICAgaWYobG9nTGFzdEVycm9yLmluRmlsZU5hbWUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzPVsnUEctRVJST1IgJyttZXNzYWdlXTtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goXCItLS0tLS0tIFwiK2F0dHIrXCI6XFxuXCIrbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgICAgIHJlYWR5TG9nID0gcmVhZHlMb2cudGhlbihfPT5mcy53cml0ZUZpbGUobG9nTGFzdEVycm9yLmluRmlsZU5hbWUsbGluZXMuam9pbignXFxuJykpKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyMiBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhdHRyMiwgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cjJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYobWVzc2FnZVR5cGU9PU1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKXtcclxuICAgICAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbbWVzc2FnZVR5cGVdID0gbWVzc2FnZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lID0gJy4vbG9jYWwtc3FsLWVycm9yLmxvZyc7XHJcbmxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzPXt9IGFzIHtcclxuICAgIFtrZXk6c3RyaW5nXTpzdHJpbmdcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb29sQmFsYW5jZUNvbnRyb2woKXtcclxuICAgIHZhciBydGE6c3RyaW5nW109W107XHJcbiAgICBpZih0eXBlb2YgZGVidWcucG9vbCA9PT0gXCJvYmplY3RcIil7XHJcbiAgICAgICAgbGlrZUFyKGRlYnVnLnBvb2wpLmZvckVhY2goZnVuY3Rpb24ocG9vbCl7XHJcbiAgICAgICAgICAgIGlmKHBvb2wuY291bnQpe1xyXG4gICAgICAgICAgICAgICAgcnRhLnB1c2gobWVzc2FnZXMudW5iYWxhbmNlZENvbm5lY3Rpb24rJyAnK3V0aWwuaW5zcGVjdChwb29sKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBydGEuam9pbignXFxuJyk7XHJcbn07XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==