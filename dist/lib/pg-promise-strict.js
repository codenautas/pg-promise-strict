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
    postConnect() {
        var nowTs = new Date().getTime();
        this.connected = {
            lastOperationTimestamp: nowTs,
            lastConnectionTimestamp: nowTs
        };
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QywyQ0FBd0M7QUFDeEMsbUNBQXlDO0FBRXpDLE1BQU0sdUJBQXVCLEdBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUMseUJBQXlCLENBQUM7QUFFeEMsUUFBQSxRQUFRLEdBQUc7SUFDbEIsaUNBQWlDLEVBQUMsMERBQTBEO0lBQzVGLCtCQUErQixFQUFDLHdEQUF3RDtJQUN4Rix1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsdUNBQXVDLEVBQUMsZ0VBQWdFO0lBQ3hHLGlCQUFpQixFQUFDLHdDQUF3QztJQUMxRCxpQ0FBaUMsRUFBQyxpRUFBaUU7SUFDbkcsNENBQTRDLEVBQUMsa0VBQWtFO0lBQy9HLGdDQUFnQyxFQUFDLGtFQUFrRTtJQUNuRyxzQ0FBc0MsRUFBQywwQ0FBMEM7SUFDakYsVUFBVSxFQUFDLGFBQWE7SUFDeEIsWUFBWSxFQUFDLDJDQUEyQztJQUN4RCw0QkFBNEIsRUFBQyxzREFBc0Q7SUFDbkYsd0JBQXdCLEVBQUMsa0RBQWtEO0lBQzNFLGtCQUFrQixFQUFDLHNCQUFzQjtJQUN6QyxRQUFRLEVBQUMsWUFBWTtJQUNyQixXQUFXLEVBQUMsY0FBYztJQUMxQix3QkFBd0IsRUFBQyxnQ0FBZ0M7SUFDekQsc0JBQXNCLEVBQUMsOEJBQThCO0lBQ3JELHFCQUFxQixFQUFDLDBEQUEwRDtJQUNoRixvQkFBb0IsRUFBQyx5REFBeUQ7SUFDOUUsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELG9C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LENBQUMsTUFBTSxFQUFDO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0ICogYXMgcGcgZnJvbSAncGcnO1xyXG5jb25zdCBwZ1R5cGVzID0gcGcudHlwZXM7XHJcblxyXG5pbXBvcnQge2Zyb20gYXMgY29weUZyb219IGZyb20gJ3BnLWNvcHktc3RyZWFtcyc7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XHJcbmltcG9ydCAqIGFzIGxpa2VBciBmcm9tICdsaWtlLWFyJztcclxuaW1wb3J0ICogYXMgYmVzdEdsb2JhbHMgZnJvbSAnYmVzdC1nbG9iYWxzJztcclxuaW1wb3J0IHsgdW5leHBlY3RlZCB9IGZyb20gJ2Nhc3QtZXJyb3InO1xyXG5pbXBvcnQge1N0cmVhbSwgVHJhbnNmb3JtfSBmcm9tICdzdHJlYW0nO1xyXG5cclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SX1RZUEU9Jy0tLS0tLSc7XHJcbmNvbnN0IE1FU1NBR0VTX1NFUEFSQVRPUj0nLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0nO1xyXG5cclxuZXhwb3J0IHZhciBtZXNzYWdlcyA9IHtcclxuICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGNsaWVudEFscmVhZHlEb25lOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudCBhbHJlYWR5IGRvbmVcIixcclxuICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcImNsaWVudC5jb25uZWN0IG11c3Qgbm8gcmVjZWl2ZSBwYXJhbWV0ZXJzLCBpdCByZXR1cm5zIGEgUHJvbWlzZVwiLFxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtT3B0c0RvbmVFeHBlcmltZW50YWw6XCJXQVJOSU5HISBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0gb3B0cy5kb25lIGZ1bmMgaXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICBmZXRjaFJvd0J5Um93TXVzdFJlY2VpdmVDYWxsYmFjazpcImZldGNoUm93QnlSb3cgbXVzdCByZWNlaXZlIGEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyBmb3IgZWFjaCByb3dcIixcclxuICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiLFxyXG4gICAgaW5zYW5lTmFtZTpcImluc2FuZSBuYW1lXCIsXHJcbiAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBjb25uZWN0IGNsaWVudCBmcm9tIHBvb2xcIixcclxuICAgIG11c3ROb3RFbmRDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBNdXN0IG5vdCBlbmQgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbnVsbEluUXVvdGVMaXRlcmFsOlwibnVsbCBpbiBxdW90ZUxpdGVyYWxcIixcclxuICAgIG9idGFpbnMxOlwib2J0YWlucyAkMVwiLFxyXG4gICAgb2J0YWluc05vbmU6XCJvYnRhaW5zIG5vbmVcIixcclxuICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCAkMVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lUm93QW5kMTpcInF1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgJDFcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkXCIsXHJcbiAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWRcIixcclxuICAgIHF1ZXJ5Tm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IHF1ZXJ5IG5vdCBjb25uZWN0ZWRcIixcclxuICAgIHVuYmFsYW5jZWRDb25uZWN0aW9uOlwicGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uXCIsXHJcbn1cclxuXHJcbmV4cG9ydCB2YXIgaTE4bjp7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46dHlwZW9mIG1lc3NhZ2VzLFxyXG4gICAgICAgIFtrOnN0cmluZ106UGFydGlhbDx0eXBlb2YgbWVzc2FnZXM+XHJcbiAgICB9XHJcbn0gPSB7XHJcbiAgICBtZXNzYWdlczp7XHJcbiAgICAgICAgZW46bWVzc2FnZXMsXHJcbiAgICAgICAgZXM6e1xyXG4gICAgICAgICAgICBhdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBidWxrSW5zZXJ0IGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBjb3B5RnJvbSBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBhdHRlbXB0VG9FeGVjdXRlU2VudGVuY2VzT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogaW50ZW50byBkZSBleGVjdXRlU2VudGVuY2VzIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTcWxTY3JpcHRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTcWxTY3JpcHQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogZWwgY2xpZW50ZSB5YSBmdWUgdGVybWluYWRvXCIsXHJcbiAgICAgICAgICAgIGNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtczpcInBnLXByb21pc2Utc3RyaWN0OiBjbGllbnQuY29ubmVjdCBubyBkZWJlIHJlY2liaXIgcGFyYW1ldGV0cm9zLCBkZXZ1ZWx2ZSB1bmEgUHJvbWVzYVwiLFxyXG4gICAgICAgICAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZXMgZXhwZXJpbWVudGFsXCIsXHJcbiAgICAgICAgICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBkZWJlIHJlY2liaXIgdW5hIGZ1bmNpb24gY2FsbGJhY2sgcGFyYSBlamVjdXRhciBlbiBjYWRhIHJlZ2lzdHJvXCIsXHJcbiAgICAgICAgICAgIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nOlwiZXJyb3IgYWwgcGFyc2VhciBlbiBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcFwiLFxyXG4gICAgICAgICAgICBpbnNhbmVOYW1lOlwibm9tYnJlIGludmFsaWRvIHBhcmEgb2JqZXRvIHNxbCwgZGViZSBzZXIgc29sbyBsZXRyYXMsIG51bWVyb3MgbyByYXlhcyBlbXBlemFuZG8gcG9yIHVuYSBsZXRyYVwiLFxyXG4gICAgICAgICAgICBsYWNrT2ZDbGllbnQ6XCJwZy1wcm9taXNlLXN0cmljdDogZmFsdGEgQ2xpZW50Ll9jbGllbnRcIixcclxuICAgICAgICAgICAgbXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbDpcInBnLXByb21pc2Utc3RyaWN0OiBObyBzZSBwdWVkZSBjb25lY3RhciB1biAnQ2xpZW50JyBkZSB1biAncG9vbCdcIixcclxuICAgICAgICAgICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IG5vIGRlYmUgdGVybWluYXIgZWwgY2xpZW50IGRlc2RlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJsYSBmdW5jaW9uIHF1b3RlTGl0ZXJhbCBubyBkZWJlIHJlY2liaXIgbnVsbFwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zMTpcInNlIG9idHV2aWVyb24gJDFcIixcclxuICAgICAgICAgICAgb2J0YWluc05vbmU6XCJubyBzZSBvYnR1dm8gbmluZ3Vub1wiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVGaWVsZEFuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHNvbG8gdmFsb3IgKGNvbHVtbmEgbyBjYW1wbykgeSAkMVwiLFxyXG4gICAgICAgICAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwic2UgZXNwZXJhYmEgb2J0ZW5lciB1biByZWdpc3RybyB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5TXVzdE5vdEJlQ2F0Y2hlZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gY2F0Y2hcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVUaGVuZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogUXVlcnkgbm8gcHVlZGUgc2VyIHVzYWRhIGNvbiBhd2FpdCBvIHRoZW5cIixcclxuICAgICAgICAgICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogJ3F1ZXJ5JyBubyBjb25lY3RhZGFcIixcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRMYW5nKGxhbmc6c3RyaW5nKXtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihsYW5nIGluIGkxOG4ubWVzc2FnZXMpe1xyXG4gICAgICAgIG1lc3NhZ2VzID0gey4uLmkxOG4ubWVzc2FnZXMuZW4sIC4uLmkxOG4ubWVzc2FnZXNbbGFuZ119O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIGRlYnVnOntcclxuICAgIHBvb2w/OnRydWV8e1xyXG4gICAgICAgIFtrZXk6c3RyaW5nXTp7IGNvdW50Om51bWJlciwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fVxyXG4gICAgfVxyXG59PXt9O1xyXG5cclxuZXhwb3J0IHZhciBkZWZhdWx0cz17XHJcbiAgICByZWxlYXNlVGltZW91dDp7aW5hY3RpdmU6NjAwMDAsIGNvbm5lY3Rpb246NjAwMDAwfVxyXG59O1xyXG5cclxuLyogaW5zdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBub0xvZyhfbWVzc2FnZTpzdHJpbmcsIF90eXBlOnN0cmluZyl7fVxyXG5cclxuZXhwb3J0IHZhciBsb2c6KG1lc3NhZ2U6c3RyaW5nLCB0eXBlOnN0cmluZyk9PnZvaWQ9bm9Mb2c7XHJcbmV4cG9ydCB2YXIgYWxzb0xvZ1Jvd3MgPSBmYWxzZTtcclxuZXhwb3J0IHZhciBsb2dFeGNlcHRpb25zID0gZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVJZGVudChuYW1lOnN0cmluZyl7XHJcbiAgICBpZih0eXBlb2YgbmFtZSE9PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse25hbWV9KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuaW5zYW5lTmFtZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1wiJytuYW1lLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJztcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50TGlzdChvYmplY3ROYW1lczpzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gb2JqZWN0TmFtZXMubWFwKGZ1bmN0aW9uKG9iamVjdE5hbWUpeyByZXR1cm4gcXVvdGVJZGVudChvYmplY3ROYW1lKTsgfSkuam9pbignLCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW55UXVvdGVhYmxlID0gc3RyaW5nfG51bWJlcnxEYXRlfHtpc1JlYWxEYXRlOmJvb2xlYW4sIHRvWW1kOigpPT5zdHJpbmd9fHt0b1Bvc3RncmVzOigpPT5zdHJpbmd9fHt0b1N0cmluZzooKT0+c3RyaW5nfTtcclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTnVsbGFibGUoYW55VmFsdWU6bnVsbHxBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiAnbnVsbCc7XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dDpzdHJpbmdcclxuICAgIGlmKHR5cGVvZiBhbnlWYWx1ZT09PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZTtcclxuICAgIH1lbHNlIGlmKCEoYW55VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpKXtcclxuICAgICAgICB0ZXh0PWFueVZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZignaXNSZWFsRGF0ZScgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUuaXNSZWFsRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvWW1kKCk7XHJcbiAgICB9ZWxzZSBpZihhbnlWYWx1ZSBpbnN0YW5jZW9mIERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ3RvUG9zdGdyZXMnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLnRvUG9zdGdyZXMgaW5zdGFuY2VvZiBGdW5jdGlvbil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvUG9zdGdyZXMoKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHRleHQgPSBKU09OLnN0cmluZ2lmeShhbnlWYWx1ZSk7XHJcbiAgICB9XHJcbiAgICBpZih0ZXh0PT11bmRlZmluZWQpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse2FueVZhbHVlfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdxdW90YWJsZU51bGwgaW5zYW5lIHZhbHVlOiAnK3R5cGVvZiBhbnlWYWx1ZSlcclxuICAgIH1cclxuICAgIHJldHVybiBcIidcIit0ZXh0LnJlcGxhY2UoLycvZyxcIicnXCIpK1wiJ1wiO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTGl0ZXJhbChhbnlWYWx1ZTpBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIGlmKGxvZ0V4Y2VwdGlvbnMpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb250ZXh0IGZvciBlcnJvcicse2FueVZhbHVlfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm51bGxJblF1b3RlTGl0ZXJhbCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcGFyYW0zcmQ0c3FsPShleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSwgYmFzZT86c3RyaW5nLCBrZXlzPzpzdHJpbmd8c3RyaW5nW10pPT5cclxuICAgIGV4cHJPcldpdGhvdXRrZXlPcktleXM9PXRydWU/YHRvX2pzb25iKCR7YmFzZX0pIC0gJHtrZXlzIGluc3RhbmNlb2YgQXJyYXk/a2V5czprZXlzPy5zcGxpdCgnLCcpLm1hcCh4PT5xdW90ZUxpdGVyYWwoeC50cmltKCkpKX1gOlxyXG4gICAgZXhwck9yV2l0aG91dGtleU9yS2V5cz09bnVsbD9gdG9fanNvbmIoJHtiYXNlfSlgOlxyXG4gICAgdHlwZW9mIGV4cHJPcldpdGhvdXRrZXlPcktleXMgPT0gXCJzdHJpbmdcIj9leHByT3JXaXRob3V0a2V5T3JLZXlzOlxyXG4gICAgYHRvX2pzb25iKGpzb25iX2J1aWxkX29iamVjdCgke2V4cHJPcldpdGhvdXRrZXlPcktleXMubWFwKG5hbWU9PnF1b3RlTGl0ZXJhbChuYW1lKSsnLCAnK3F1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywgJyl9KSlgXHJcbiAgICA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxleHByOnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbihzcWw6c3RyaW5nLCBvcmRlcmJ5OnN0cmluZyxrZXlzOnN0cmluZ1tdKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nLHdpdGhvdXRLZXlzOnRydWUpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcpOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb24oc3FsOnN0cmluZywgb3JkZXJieTpzdHJpbmcsZXhwck9yV2l0aG91dGtleU9yS2V5cz86c3RyaW5nfHRydWV8c3RyaW5nW10pe1xyXG4gICAgcmV0dXJuIGBDT0FMRVNDRSgoU0VMRUNUIGpzb25iX2FnZygke3BhcmFtM3JkNHNxbChleHByT3JXaXRob3V0a2V5T3JLZXlzLCdqLionLG9yZGVyYnkpfSBPUkRFUiBCWSAke29yZGVyYnl9KSBmcm9tICgke3NxbH0pIGFzIGopLCdbXSc6Ompzb25iKWA7XHJcbiAgICAvLyByZXR1cm4gYChTRUxFQ1QgY29hbGVzY2UoanNvbmJfYWdnKHRvX2pzb25iKGouKikgT1JERVIgQlkgJHtvcmRlcmJ5fSksJ1tdJzo6anNvbmIpIGZyb20gKCR7c3FsfSkgYXMgailgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGV4cHI6c3RyaW5nKTpzdHJpbmc7XHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nLGtleXM6c3RyaW5nW10pOnN0cmluZztcclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25vKHNxbDpzdHJpbmcsIGluZGV4ZWRieTpzdHJpbmcsd2l0aG91dEtleXM6dHJ1ZSk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyk6c3RyaW5nO1xyXG5leHBvcnQgZnVuY3Rpb24ganNvbm8oc3FsOnN0cmluZywgaW5kZXhlZGJ5OnN0cmluZyxleHByT3JXaXRob3V0a2V5T3JLZXlzPzpzdHJpbmd8dHJ1ZXxzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gYENPQUxFU0NFKChTRUxFQ1QganNvbmJfb2JqZWN0X2FnZygke2luZGV4ZWRieX0sJHtwYXJhbTNyZDRzcWwoZXhwck9yV2l0aG91dGtleU9yS2V5cywnai4qJyxpbmRleGVkYnkpfSkgZnJvbSAoJHtzcWx9KSBhcyBqKSwne30nOjpqc29uYilgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdFBhcmFtZXRlclR5cGVzKHBhcmFtZXRlcnM/OmFueVtdKXtcclxuICAgIC8vIEB0cy1pZ25vcmUgXHJcbiAgICBpZihwYXJhbWV0ZXJzPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJhbWV0ZXJzLm1hcChmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgaWYodmFsdWUgJiYgdmFsdWUudHlwZVN0b3JlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTGl0ZXJhbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgZWFzeTpib29sZWFuPXRydWU7IC8vIGRlcHJlY2F0ZWQhXHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0UGFyYW1zPXtcclxuICAgIG1vdG9yPzpcInBvc3RncmVzXCJcclxuICAgIGRhdGFiYXNlPzpzdHJpbmdcclxuICAgIHVzZXI/OnN0cmluZ1xyXG4gICAgcGFzc3dvcmQ/OnN0cmluZ1xyXG4gICAgcG9ydD86bnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0NvbW1vbj17dGFibGU6c3RyaW5nLGNvbHVtbnM/OnN0cmluZ1tdLGRvbmU/OihlcnI/OkVycm9yKT0+dm9pZCwgd2l0aD86c3RyaW5nfVxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNGaWxlPXtpblN0cmVhbT86dW5kZWZpbmVkLCBmaWxlbmFtZTpzdHJpbmd9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHNTdHJlYW09e2luU3RyZWFtOlN0cmVhbSxmaWxlbmFtZT86dW5kZWZpbmVkfSZDb3B5RnJvbU9wdHNDb21tb25cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzPUNvcHlGcm9tT3B0c0ZpbGV8Q29weUZyb21PcHRzU3RyZWFtXHJcbmV4cG9ydCB0eXBlIEJ1bGtJbnNlcnRQYXJhbXM9e3NjaGVtYT86c3RyaW5nLHRhYmxlOnN0cmluZyxjb2x1bW5zOnN0cmluZ1tdLHJvd3M6YW55W11bXSwgb25lcnJvcj86KGVycjpFcnJvciwgcm93OmFueVtdKT0+UHJvbWlzZTx2b2lkPn1cclxuXHJcbmV4cG9ydCB0eXBlIENvbHVtbiA9IHtkYXRhX3R5cGU6c3RyaW5nfTtcclxuXHJcbmV4cG9ydCBjbGFzcyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcntcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgY2xpZW50OkNsaWVudCl7XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb2x1bW4odGFibGVfc2NoZW1hOnN0cmluZywgdGFibGVfbmFtZTpzdHJpbmcsIGNvbHVtbl9uYW1lOnN0cmluZyk6UHJvbWlzZTxDb2x1bW58bnVsbD57XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnF1ZXJ5KGBcclxuICAgICAgICAgICAgc2VsZWN0ICogXHJcbiAgICAgICAgICAgICAgICBmcm9tIGluZm9ybWF0aW9uX3NjaGVtYS5jb2x1bW5zXHJcbiAgICAgICAgICAgICAgICB3aGVyZSB0YWJsZV9zY2hlbWE9JDFcclxuICAgICAgICAgICAgICAgICAgICBhbmQgdGFibGVfbmFtZT0kMlxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCBjb2x1bW5fbmFtZT0kMztcclxuICAgICAgICBgLFt0YWJsZV9zY2hlbWEsIHRhYmxlX25hbWUsIGNvbHVtbl9uYW1lXSkuZmV0Y2hPbmVSb3dJZkV4aXN0cygpOyBcclxuICAgICAgICBjb25zb2xlLmxvZygnKioqKioqKioqKioqKioqKioqKicsYXJndW1lbnRzLHJlc3VsdC5yb3csIHJlc3VsdC5yb3d8fG51bGwpXHJcbiAgICAgICAgcmV0dXJuIChyZXN1bHQucm93IHx8IG51bGwpIGFzIENvbHVtbnxudWxsO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIHByaXZhdGUgX2luZm9ybWF0aW9uU2NoZW1hOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVyfG51bGw9bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXMpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpudWxsLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSwgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpXHJcbiAgICBjb25zdHJ1Y3Rvcihjb25uT3B0czpDb25uZWN0UGFyYW1zfG51bGwsIGNsaWVudD86KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSwgcHJpdmF0ZSBfZG9uZT86KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIGlmKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc2VsZi5sYXN0T3BlcmF0aW9uVGltZXN0YW1wICA+IHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZVxyXG4gICAgICAgICAgICAgICAgfHwgbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RDb25uZWN0aW9uVGltZXN0YW1wID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmNvbm5lY3Rpb25cclxuICAgICAgICAgICAgICAgICl7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sTWF0aC5taW4oMTAwMCxzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuaW5hY3RpdmUvNCkpO1xyXG4gICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgICAgIGlmKGRlYnVnLnBvb2w9PT10cnVlKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sPXt9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoISh0aGlzLl9jbGllbnQuc2VjcmV0S2V5IGluIGRlYnVnLnBvb2wpKXtcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldID0ge2NsaWVudDp0aGlzLl9jbGllbnQsIGNvdW50OjB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8vIHBnUHJvbWlzZVN0cmljdC5sb2coJ25ldyBDbGllbnQnKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50ID0gbmV3IHBnLkNsaWVudChjb25uT3B0cykgYXMgcGcuQ2xpZW50JntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LnNlY3JldEtleSA9IHRoaXMuX2NsaWVudC5zZWNyZXRLZXl8fCdzZWNyZXRfJytNYXRoLnJhbmRvbSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbm5lY3QoKXtcclxuICAgICAgICBpZih0aGlzLmZyb21Qb29sKXtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLm11c3ROb3RDb25uZWN0Q2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG1lc3NhZ2VzLmNsaWVudENvbmVuY3RNdXN0Tm90UmVjZWl2ZVBhcmFtcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYodGhpcy5mcm9tUG9vbCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5tdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2wpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50QWxyZWFkeURvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDpzdHJpbmc7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VmFsdWVzOm51bGx8YW55W109bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqLyBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIGlmIG5vIHF1ZXJ5VGV4dCwgdGhlIHZhbHVlIG11c3QgYmUgc2hvd2VkIGFsc29cclxuICAgICAgICAgICAgdmFyIHNxbD1xdWVyeVRleHQ7XHJcbiAgICAgICAgICAgIGxvZyhNRVNTQUdFU19TRVBBUkFUT1IsIE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMgJiYgcXVlcnlWYWx1ZXMubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGxvZygnYCcrc3FsKydcXG5gJywnUVVFUlktUCcpO1xyXG4gICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHF1ZXJ5VmFsdWVzKSwnUVVFUlktQScpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlWYWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZTphbnksIGk6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzcWw9c3FsLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxcXCQnKyhpKzEpKydcXFxcYicpLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciBudW1iZXJzIGFuZCBib29sZWFucyBjYW4gYmUgdXNlZCBoZXJlIGFsc29cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbHVlID09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHZhbHVlID09IFwiYm9vbGVhblwiP3ZhbHVlOnF1b3RlTnVsbGFibGUodmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZyhzcWwrJzsnLCdRVUVSWScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcmV0dXJuZWRRdWVyeSA9IHRoaXMuX2NsaWVudC5xdWVyeShuZXcgcGcuUXVlcnkocXVlcnlBcmd1bWVudHNbMF0sIHF1ZXJ5QXJndW1lbnRzWzFdKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBRdWVyeShyZXR1cm5lZFF1ZXJ5LCB0aGlzLCB0aGlzLl9jbGllbnQpO1xyXG4gICAgfTtcclxuICAgIGdldCBpbmZvcm1hdGlvblNjaGVtYSgpOkluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9pbmZvcm1hdGlvblNjaGVtYSB8fCBuZXcgSW5mb3JtYXRpb25TY2hlbWFSZWFkZXIodGhpcyk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGUoZmlsZU5hbWUsJ3V0Zi04JykudGhlbihmdW5jdGlvbihjb250ZW50KXtcclxuICAgICAgICAgICAgdmFyIHNlbnRlbmNlcyA9IGNvbnRlbnQuc3BsaXQoL1xccj9cXG5cXHI/XFxuLyk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZWxmLmV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGJ1bGtJbnNlcnQocGFyYW1zOkJ1bGtJbnNlcnRQYXJhbXMpOlByb21pc2U8dm9pZD57XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHNxbCA9IFwiSU5TRVJUIElOVE8gXCIrKHBhcmFtcy5zY2hlbWE/cXVvdGVJZGVudChwYXJhbXMuc2NoZW1hKSsnLic6JycpK1xyXG4gICAgICAgICAgICBxdW90ZUlkZW50KHBhcmFtcy50YWJsZSkrXCIgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAocXVvdGVJZGVudCkuam9pbignLCAnKStcIikgVkFMVUVTIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKGZ1bmN0aW9uKF9uYW1lOnN0cmluZywgaV9uYW1lOm51bWJlcil7IHJldHVybiAnJCcrKGlfbmFtZSsxKTsgfSkrXCIpXCI7XHJcbiAgICAgICAgdmFyIGlfcm93cz0wO1xyXG4gICAgICAgIHdoaWxlKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICB0cnl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpO1xyXG4gICAgICAgICAgICB9Y2F0Y2goZXJyKXtcclxuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IHVuZXhwZWN0ZWQoZXJyKTtcclxuICAgICAgICAgICAgICAgIGlmKHBhcmFtcy5vbmVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwYXJhbXMub25lcnJvcihlcnJvciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2dFeGNlcHRpb25zKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ29udGV4dCBmb3IgZXJyb3InLHtyb3c6IHBhcmFtcy5yb3dzW2lfcm93c119KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpX3Jvd3MrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHM6Q29weUZyb21PcHRzKXtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2VzLmNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9jb3B5RnJvbU9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGZyb20gPSBvcHRzLmluU3RyZWFtID8gJ1NURElOJyA6IHF1b3RlTGl0ZXJhbChvcHRzLmZpbGVuYW1lKTtcclxuICAgICAgICB2YXIgc3FsID0gYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gJHtmcm9tfSAke29wdHMud2l0aD8nV0lUSCAnK29wdHMud2l0aDonJ31gO1xyXG4gICAgICAgIHJldHVybiB7c3FsLCBfY2xpZW50OnRoaXMuX2NsaWVudH07XHJcbiAgICB9XHJcbiAgICBhc3luYyBjb3B5RnJvbUZpbGUob3B0czpDb3B5RnJvbU9wdHNGaWxlKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+e1xyXG4gICAgICAgIHZhciB7c3FsfSA9IHRoaXMuY29weUZyb21QYXJzZVBhcmFtcyhvcHRzKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5xdWVyeShzcWwpLmV4ZWN1dGUoKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbShvcHRzOkNvcHlGcm9tT3B0c1N0cmVhbSl7XHJcbiAgICAgICAgdmFyIHtzcWwsIF9jbGllbnR9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHZhciBzdHJlYW0gPSBfY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKHNxbCkpO1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgcG9yIGxhIHJlZ2V4cCBlcyBpbXBvc2libGUgcXVlIHBhc2UgYWwgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzKSByZXR1cm4gJ1xcXFxcXFxcJztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBFc3RvIGVzIGltcG9zaWJsZSBxdWUgc3VjZWRhICovXHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nRXhjZXB0aW9ucyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRleHQgZm9yIGVycm9yJyx7X2FsbH0pXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcEVycm9yUGFyc2luZylcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUFycmF5U3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIgYyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oe1xyXG4gICAgICAgICAgICB3cml0YWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgcmVhZGFibGVPYmplY3RNb2RlOnRydWUsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybShhcnJheUNodW5rOmFueVtdLCBfZW5jb2RpbmcsIG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKGFycmF5Q2h1bmsubWFwKHg9PmMuZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAoeCkpLmpvaW4oJ1xcdCcpKydcXG4nKVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBmbHVzaChuZXh0KXtcclxuICAgICAgICAgICAgICAgIHRoaXMucHVzaCgnXFxcXC5cXG4nKTtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciB7aW5TdHJlYW0sIC4uLnJlc3R9ID0gb3B0cztcclxuICAgICAgICBpblN0cmVhbS5waXBlKHRyYW5zZm9ybSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKHtpblN0cmVhbTp0cmFuc2Zvcm0sIC4uLnJlc3R9KVxyXG4gICAgfVxyXG59XHJcblxyXG52YXIgcXVlcnlSZXN1bHQ6cGcuUXVlcnlSZXN1bHQ7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdHtcclxuICAgIHJvd0NvdW50Om51bWJlclxyXG4gICAgZmllbGRzOnR5cGVvZiBxdWVyeVJlc3VsdC5maWVsZHNcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdENvbW1hbmR7XHJcbiAgICBjb21tYW5kOnN0cmluZywgcm93Q291bnQ6bnVtYmVyXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3cgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c6e1trZXk6c3RyaW5nXTphbnl9XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRPbmVSb3dJZkV4aXN0cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdz86e1trZXk6c3RyaW5nXTphbnl9fG51bGxcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFJvd3MgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3dzOntba2V5OnN0cmluZ106YW55fVtdXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRWYWx1ZSBleHRlbmRzIFJlc3VsdHtcclxuICAgIHZhbHVlOmFueVxyXG59XHJcbi8vIGV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0R2VuZXJpYyBleHRlbmRzIFJlc3VsdFZhbHVlLCBSZXN1bHRSb3dzLCBSZXN1bHRPbmVSb3dJZkV4aXN0cywgUmVzdWx0T25lUm93LCBSZXN1bHR7fVxyXG5leHBvcnQgdHlwZSBSZXN1bHRHZW5lcmljID0gUmVzdWx0VmFsdWV8UmVzdWx0Um93c3xSZXN1bHRPbmVSb3dJZkV4aXN0c3xSZXN1bHRPbmVSb3d8UmVzdWx0fFJlc3VsdENvbW1hbmRcclxuXHJcbi8qXHJcbmZ1bmN0aW9uIGJ1aWxkUXVlcnlDb3VudGVyQWRhcHRlcihcclxuICAgIG1pbkNvdW50Um93Om51bWJlciwgXHJcbiAgICBtYXhDb3VudFJvdzpudW1iZXIsIFxyXG4gICAgZXhwZWN0VGV4dDpzdHJpbmcsIFxyXG4gICAgY2FsbGJhY2tPdGhlckNvbnRyb2w/OihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZFxyXG4pe1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHF1ZXJ5Q291bnRlckFkYXB0ZXIocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCl7IFxyXG4gICAgICAgIGlmKHJlc3VsdC5yb3dzLmxlbmd0aDxtaW5Db3VudFJvdyB8fCByZXN1bHQucm93cy5sZW5ndGg+bWF4Q291bnRSb3cgKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgJytleHBlY3RUZXh0KycgYW5kIG9idGFpbnMgJytyZXN1bHQucm93cy5sZW5ndGgrJyByb3dzJyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0MDExISc7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihjYWxsYmFja090aGVyQ29udHJvbCl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja090aGVyQ29udHJvbChyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5vdGhlcn0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ub3RoZXJ9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuKi9cclxuXHJcbnR5cGUgTm90aWNlID0gc3RyaW5nO1xyXG5cclxuZnVuY3Rpb24gbG9nRXJyb3JJZk5lZWRlZDxUPihlcnI6RXJyb3IsIGNvZGU/OlQpOkVycm9ye1xyXG4gICAgaWYoY29kZSAhPSBudWxsKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgZXJyLmNvZGU9Y29kZTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihsb2cpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBsb2coJy0tRVJST1IhICcrZXJyLmNvZGUrJywgJytlcnIubWVzc2FnZSwgJ0VSUk9SJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZXJyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvYnRhaW5zKG1lc3NhZ2U6c3RyaW5nLCBjb3VudDpudW1iZXIpOnN0cmluZ3tcclxuICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoJyQxJyxcclxuICAgICAgICBjb3VudD9tZXNzYWdlcy5vYnRhaW5zMS5yZXBsYWNlKCckMScsY291bnQudG9TdHJpbmcoKSk6bWVzc2FnZXMub2J0YWluc05vbmVcclxuICAgICk7XHJcbn0gXHJcblxyXG5cclxuY2xhc3MgUXVlcnl7XHJcbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9xdWVyeTpwZy5RdWVyeSwgcHVibGljIGNsaWVudDpDbGllbnQsIHByaXZhdGUgX2ludGVybmFsQ2xpZW50OnBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KXtcclxuICAgIH1cclxuICAgIG9uTm90aWNlKGNhbGxiYWNrTm90aWNlQ29uc3VtZXI6KG5vdGljZTpOb3RpY2UpPT52b2lkKTpRdWVyeXtcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uKG5vdGljZTpOb3RpY2Upe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAqLyAvLyBAdHMtaWdub3JlICBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhIExBQ0tTIG9mIGFjdGl2ZVF1ZXJ5XHJcbiAgICAgICAgICAgIGlmKHEuX2ludGVybmFsQ2xpZW50LmFjdGl2ZVF1ZXJ5PT1xLl9xdWVyeSl7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFja05vdGljZUNvbnN1bWVyKG5vdGljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ25vdGljZScpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICB0aGlzLl9pbnRlcm5hbENsaWVudC5vbignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdmFyIHJlbW92ZU5vdGljZUNhbGxiYWNrPWZ1bmN0aW9uIHJlbW92ZU5vdGljZUNhbGxiYWNrKCl7XHJcbiAgICAgICAgICAgIHEuX2ludGVybmFsQ2xpZW50LnJlbW92ZUxpc3RlbmVyKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2VuZCcscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlcnJvcicscmVtb3ZlTm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuICAgIHByaXZhdGUgX2V4ZWN1dGU8VFIgZXh0ZW5kcyBSZXN1bHRHZW5lcmljPihcclxuICAgICAgICBhZGFwdGVyQ2FsbGJhY2s6bnVsbHwoKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlRSKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKT0+dm9pZCksXHJcbiAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93Pzoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+LCBcclxuICAgICk6UHJvbWlzZTxUUj57XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUj4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICAgICAgdmFyIHBlbmRpbmdSb3dzPTA7XHJcbiAgICAgICAgICAgIHZhciBlbmRNYXJrOm51bGx8e3Jlc3VsdDpwZy5RdWVyeVJlc3VsdH09bnVsbDtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2Vycm9yJyxmdW5jdGlvbihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIC5vbigncm93JykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbigncm93Jyxhc3luYyBmdW5jdGlvbihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICBpZihjYWxsYmFja0ZvckVhY2hSb3cpe1xyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmdSb3dzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cgJiYgYWxzb0xvZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC0tcGVuZGluZ1Jvd3M7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hlbkVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2hlbkVuZCgpe1xyXG4gICAgICAgICAgICAgICAgaWYoZW5kTWFyayAmJiAhcGVuZGluZ1Jvd3Mpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGFkYXB0ZXJDYWxsYmFjayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhlbmRNYXJrLnJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlbmRNYXJrLnJlc3VsdCBhcyB1bmtub3duIGFzIFRSKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgICAgICAgICAgICAgIGlmKGxvZyAmJiBhbHNvTG9nUm93cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgcmVhZHlMb2cgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuXHJcbi8qIHh4aXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ0xhc3RFcnJvcihtZXNzYWdlOnN0cmluZywgbWVzc2FnZVR5cGU6c3RyaW5nKTp2b2lke1xyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICByZWFkeUxvZyA9IHJlYWR5TG9nLnRoZW4oXz0+ZnMud3JpdGVGaWxlKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lLGxpbmVzLmpvaW4oJ1xcbicpKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYXR0cjIsIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHIyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzID0ge307XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKG1lc3NhZ2VUeXBlPT1NRVNTQUdFU19TRVBBUkFUT1JfVFlQRSl7XHJcbiAgICAgICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW21lc3NhZ2VUeXBlXSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5sb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSA9ICcuL2xvY2FsLXNxbC1lcnJvci5sb2cnO1xyXG5sb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcz17fSBhcyB7XHJcbiAgICBba2V5OnN0cmluZ106c3RyaW5nXHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9vbEJhbGFuY2VDb250cm9sKCl7XHJcbiAgICB2YXIgcnRhOnN0cmluZ1tdPVtdO1xyXG4gICAgaWYodHlwZW9mIGRlYnVnLnBvb2wgPT09IFwib2JqZWN0XCIpe1xyXG4gICAgICAgIGxpa2VBcihkZWJ1Zy5wb29sKS5mb3JFYWNoKGZ1bmN0aW9uKHBvb2wpe1xyXG4gICAgICAgICAgICBpZihwb29sLmNvdW50KXtcclxuICAgICAgICAgICAgICAgIHJ0YS5wdXNoKG1lc3NhZ2VzLnVuYmFsYW5jZWRDb25uZWN0aW9uKycgJyt1dGlsLmluc3BlY3QocG9vbCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcnRhLmpvaW4oJ1xcbicpO1xyXG59O1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxucHJvY2Vzcy5vbignZXhpdCcsZnVuY3Rpb24oKXtcclxuICAgIGNvbnNvbGUud2Fybihwb29sQmFsYW5jZUNvbnRyb2woKSk7XHJcbn0pO1xyXG4iXX0=