"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolBalanceControl = exports.logLastError = exports.readyLog = exports.connect = exports.setAllTypes = exports.allTypes = exports.Client = exports.InformationSchemaReader = exports.easy = exports.adaptParameterTypes = exports.jsono = exports.json = exports.quoteLiteral = exports.quoteNullable = exports.quoteIdentList = exports.quoteIdent = exports.log = exports.noLog = exports.defaults = exports.debug = exports.setLang = exports.i18n = exports.messages = void 0;
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
function json(sql, orderby) {
    return `COALESCE((SELECT jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}) from (${sql}) as j),'[]'::jsonb)`;
    // return `(SELECT coalesce(jsonb_agg(to_jsonb(j.*) ORDER BY ${orderby}),'[]'::jsonb) from (${sql}) as j)`
}
exports.json = json;
function jsono(sql, indexedby) {
    return `COALESCE((SELECT jsonb_object_agg(${indexedby},to_jsonb(j.*)) from (${sql}) as j),'{}'::jsonb)`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQzs7O0FBRWIsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBRXpCLHFEQUFpRDtBQUNqRCw2QkFBNkI7QUFDN0Isa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1QyxtQ0FBeUM7QUFFekMsTUFBTSx1QkFBdUIsR0FBQyxRQUFRLENBQUM7QUFDdkMsTUFBTSxrQkFBa0IsR0FBQyx5QkFBeUIsQ0FBQztBQUV4QyxRQUFBLFFBQVEsR0FBRztJQUNsQixpQ0FBaUMsRUFBQywwREFBMEQ7SUFDNUYsK0JBQStCLEVBQUMsd0RBQXdEO0lBQ3hGLHVDQUF1QyxFQUFDLGdFQUFnRTtJQUN4Ryx1Q0FBdUMsRUFBQyxnRUFBZ0U7SUFDeEcsaUJBQWlCLEVBQUMsd0NBQXdDO0lBQzFELGlDQUFpQyxFQUFDLGlFQUFpRTtJQUNuRyw0Q0FBNEMsRUFBQyxrRUFBa0U7SUFDL0csZ0NBQWdDLEVBQUMsa0VBQWtFO0lBQ25HLHNDQUFzQyxFQUFDLDBDQUEwQztJQUNqRixVQUFVLEVBQUMsYUFBYTtJQUN4QixZQUFZLEVBQUMsMkNBQTJDO0lBQ3hELDRCQUE0QixFQUFDLHNEQUFzRDtJQUNuRix3QkFBd0IsRUFBQyxrREFBa0Q7SUFDM0Usa0JBQWtCLEVBQUMsc0JBQXNCO0lBQ3pDLFFBQVEsRUFBQyxZQUFZO0lBQ3JCLFdBQVcsRUFBQyxjQUFjO0lBQzFCLHdCQUF3QixFQUFDLGdDQUFnQztJQUN6RCxzQkFBc0IsRUFBQyw4QkFBOEI7SUFDckQscUJBQXFCLEVBQUMsMERBQTBEO0lBQ2hGLG9CQUFvQixFQUFDLHlEQUF5RDtJQUM5RSxpQkFBaUIsRUFBQyx3Q0FBd0M7SUFDMUQsb0JBQW9CLEVBQUMsa0RB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Q0FBQyxDQUFDO0tBQ047SUFDRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUIsQ0FBQztBQVZELGdEQVVDO0FBQUEsQ0FBQztBQUVGLDBCQUEwQjtBQUMxQixPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQztJQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCAqIGFzIHBnIGZyb20gJ3BnJztcclxuY29uc3QgcGdUeXBlcyA9IHBnLnR5cGVzO1xyXG5cclxuaW1wb3J0IHtmcm9tIGFzIGNvcHlGcm9tfSBmcm9tICdwZy1jb3B5LXN0cmVhbXMnO1xyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xyXG5pbXBvcnQgKiBhcyBsaWtlQXIgZnJvbSAnbGlrZS1hcic7XHJcbmltcG9ydCAqIGFzIGJlc3RHbG9iYWxzIGZyb20gJ2Jlc3QtZ2xvYmFscyc7XHJcbmltcG9ydCB7U3RyZWFtLCBUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XHJcblxyXG5jb25zdCBNRVNTQUdFU19TRVBBUkFUT1JfVFlQRT0nLS0tLS0tJztcclxuY29uc3QgTUVTU0FHRVNfU0VQQVJBVE9SPSctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSc7XHJcblxyXG5leHBvcnQgdmFyIG1lc3NhZ2VzID0ge1xyXG4gICAgYXR0ZW1wdFRvYnVsa0luc2VydE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBidWxrSW5zZXJ0IG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGNvcHlGcm9tIG9uIG5vdCBjb25uZWN0ZWRcIixcclxuICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gZXhlY3V0ZVNlbnRlbmNlcyBvbiBub3QgY29ubmVjdGVkXCIsXHJcbiAgICBhdHRlbXB0VG9FeGVjdXRlU3FsU2NyaXB0T25Ob3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTcWxTY3JpcHQgb24gbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgY2xpZW50QWxyZWFkeURvbmU6XCJwZy1wcm9taXNlLXN0cmljdDogY2xpZW50IGFscmVhZHkgZG9uZVwiLFxyXG4gICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwiY2xpZW50LmNvbm5lY3QgbXVzdCBubyByZWNlaXZlIHBhcmFtZXRlcnMsIGl0IHJldHVybnMgYSBQcm9taXNlXCIsXHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbDpcIldBUk5JTkchIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbSBvcHRzLmRvbmUgZnVuYyBpcyBleHBlcmltZW50YWxcIixcclxuICAgIGZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrOlwiZmV0Y2hSb3dCeVJvdyBtdXN0IHJlY2VpdmUgYSBjYWxsYmFjayB0aGF0IGV4ZWN1dGVzIGZvciBlYWNoIHJvd1wiLFxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCBlcnJvciBwYXJzaW5nXCIsXHJcbiAgICBpbnNhbmVOYW1lOlwiaW5zYW5lIG5hbWVcIixcclxuICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBsYWNrIG9mIENsaWVudC5fY2xpZW50XCIsXHJcbiAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGNvbm5lY3QgY2xpZW50IGZyb20gcG9vbFwiLFxyXG4gICAgbXVzdE5vdEVuZENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE11c3Qgbm90IGVuZCBjbGllbnQgZnJvbSBwb29sXCIsXHJcbiAgICBudWxsSW5RdW90ZUxpdGVyYWw6XCJudWxsIGluIHF1b3RlTGl0ZXJhbFwiLFxyXG4gICAgb2J0YWluczE6XCJvYnRhaW5zICQxXCIsXHJcbiAgICBvYnRhaW5zTm9uZTpcIm9idGFpbnMgbm9uZVwiLFxyXG4gICAgcXVlcnlFeHBlY3RzT25lRmllbGRBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgZmllbGQgYW5kICQxXCIsXHJcbiAgICBxdWVyeUV4cGVjdHNPbmVSb3dBbmQxOlwicXVlcnkgZXhwZWN0cyBvbmUgcm93IGFuZCAkMVwiLFxyXG4gICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIGNhdGNoZWRcIixcclxuICAgIHF1ZXJ5TXVzdE5vdEJlVGhlbmVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIHRoZW5lZFwiLFxyXG4gICAgcXVlcnlOb3RDb25uZWN0ZWQ6XCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgbm90IGNvbm5lY3RlZFwiLFxyXG4gICAgdW5iYWxhbmNlZENvbm5lY3Rpb246XCJwZ1Byb21pc2VTdHJpY3QuZGVidWcucG9vbCB1bmJhbGFuY2VkIGNvbm5lY3Rpb25cIixcclxufVxyXG5cclxuZXhwb3J0IHZhciBpMThuOntcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjp0eXBlb2YgbWVzc2FnZXMsXHJcbiAgICAgICAgW2s6c3RyaW5nXTpQYXJ0aWFsPHR5cGVvZiBtZXNzYWdlcz5cclxuICAgIH1cclxufSA9IHtcclxuICAgIG1lc3NhZ2VzOntcclxuICAgICAgICBlbjptZXNzYWdlcyxcclxuICAgICAgICBlczp7XHJcbiAgICAgICAgICAgIGF0dGVtcHRUb2J1bGtJbnNlcnRPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGJ1bGtJbnNlcnQgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvY29weUZyb21Pbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGNvcHlGcm9tIGVuIHVuIGNsaWVudGUgc2luIGNvbmV4aW9uXCIsXHJcbiAgICAgICAgICAgIGF0dGVtcHRUb0V4ZWN1dGVTZW50ZW5jZXNPbk5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiBpbnRlbnRvIGRlIGV4ZWN1dGVTZW50ZW5jZXMgZW4gdW4gY2xpZW50ZSBzaW4gY29uZXhpb25cIixcclxuICAgICAgICAgICAgYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IGludGVudG8gZGUgZXhlY3V0ZVNxbFNjcmlwdCBlbiB1biBjbGllbnRlIHNpbiBjb25leGlvblwiLFxyXG4gICAgICAgICAgICBjbGllbnRBbHJlYWR5RG9uZTpcInBnLXByb21pc2Utc3RyaWN0OiBlbCBjbGllbnRlIHlhIGZ1ZSB0ZXJtaW5hZG9cIixcclxuICAgICAgICAgICAgY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zOlwicGctcHJvbWlzZS1zdHJpY3Q6IGNsaWVudC5jb25uZWN0IG5vIGRlYmUgcmVjaWJpciBwYXJhbWV0ZXRyb3MsIGRldnVlbHZlIHVuYSBQcm9tZXNhXCIsXHJcbiAgICAgICAgICAgIGNvcHlGcm9tSW5saW5lRHVtcFN0cmVhbU9wdHNEb25lRXhwZXJpbWVudGFsOlwiV0FSTklORyEgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtIG9wdHMuZG9uZSBlcyBleHBlcmltZW50YWxcIixcclxuICAgICAgICAgICAgZmV0Y2hSb3dCeVJvd011c3RSZWNlaXZlQ2FsbGJhY2s6XCJmZXRjaFJvd0J5Um93IGRlYmUgcmVjaWJpciB1bmEgZnVuY2lvbiBjYWxsYmFjayBwYXJhIGVqZWN1dGFyIGVuIGNhZGEgcmVnaXN0cm9cIixcclxuICAgICAgICAgICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXBFcnJvclBhcnNpbmc6XCJlcnJvciBhbCBwYXJzZWFyIGVuIGZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wXCIsXHJcbiAgICAgICAgICAgIGluc2FuZU5hbWU6XCJub21icmUgaW52YWxpZG8gcGFyYSBvYmpldG8gc3FsLCBkZWJlIHNlciBzb2xvIGxldHJhcywgbnVtZXJvcyBvIHJheWFzIGVtcGV6YW5kbyBwb3IgdW5hIGxldHJhXCIsXHJcbiAgICAgICAgICAgIGxhY2tPZkNsaWVudDpcInBnLXByb21pc2Utc3RyaWN0OiBmYWx0YSBDbGllbnQuX2NsaWVudFwiLFxyXG4gICAgICAgICAgICBtdXN0Tm90Q29ubmVjdENsaWVudEZyb21Qb29sOlwicGctcHJvbWlzZS1zdHJpY3Q6IE5vIHNlIHB1ZWRlIGNvbmVjdGFyIHVuICdDbGllbnQnIGRlIHVuICdwb29sJ1wiLFxyXG4gICAgICAgICAgICBtdXN0Tm90RW5kQ2xpZW50RnJvbVBvb2w6XCJwZy1wcm9taXNlLXN0cmljdDogbm8gZGViZSB0ZXJtaW5hciBlbCBjbGllbnQgZGVzZGUgdW4gJ3Bvb2wnXCIsXHJcbiAgICAgICAgICAgIG51bGxJblF1b3RlTGl0ZXJhbDpcImxhIGZ1bmNpb24gcXVvdGVMaXRlcmFsIG5vIGRlYmUgcmVjaWJpciBudWxsXCIsXHJcbiAgICAgICAgICAgIG9idGFpbnMxOlwic2Ugb2J0dXZpZXJvbiAkMVwiLFxyXG4gICAgICAgICAgICBvYnRhaW5zTm9uZTpcIm5vIHNlIG9idHV2byBuaW5ndW5vXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMTpcInNlIGVzcGVyYWJhIG9idGVuZXIgdW4gc29sbyB2YWxvciAoY29sdW1uYSBvIGNhbXBvKSB5ICQxXCIsXHJcbiAgICAgICAgICAgIHF1ZXJ5RXhwZWN0c09uZVJvd0FuZDE6XCJzZSBlc3BlcmFiYSBvYnRlbmVyIHVuIHJlZ2lzdHJvIHkgJDFcIixcclxuICAgICAgICAgICAgcXVlcnlNdXN0Tm90QmVDYXRjaGVkOlwicGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG5vIHB1ZWRlIHNlciB1c2FkYSBjb24gYXdhaXQgbyBjYXRjaFwiLFxyXG4gICAgICAgICAgICBxdWVyeU11c3ROb3RCZVRoZW5lZDpcInBnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBubyBwdWVkZSBzZXIgdXNhZGEgY29uIGF3YWl0IG8gdGhlblwiLFxyXG4gICAgICAgICAgICBxdWVyeU5vdENvbm5lY3RlZDpcInBnLXByb21pc2Utc3RyaWN0OiAncXVlcnknIG5vIGNvbmVjdGFkYVwiLFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldExhbmcobGFuZzpzdHJpbmcpe1xyXG4gICAgaWYobGFuZyBpbiBpMThuLm1lc3NhZ2VzKXtcclxuICAgICAgICBtZXNzYWdlcyA9IHsuLi5pMThuLm1lc3NhZ2VzLmVuLCAuLi5pMThuLm1lc3NhZ2VzW2xhbmddfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBkZWJ1Zzp7XHJcbiAgICBwb29sPzp0cnVlfHtcclxuICAgICAgICBba2V5OnN0cmluZ106eyBjb3VudDpudW1iZXIsIGNsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfX1cclxuICAgIH1cclxufT17fTtcclxuXHJcbmV4cG9ydCB2YXIgZGVmYXVsdHM9e1xyXG4gICAgcmVsZWFzZVRpbWVvdXQ6e2luYWN0aXZlOjYwMDAwLCBjb25uZWN0aW9uOjYwMDAwMH1cclxufTtcclxuXHJcbi8qIGluc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbm9Mb2coX21lc3NhZ2U6c3RyaW5nLCBfdHlwZTpzdHJpbmcpe31cclxuXHJcbmV4cG9ydCB2YXIgbG9nOihtZXNzYWdlOnN0cmluZywgdHlwZTpzdHJpbmcpPT52b2lkPW5vTG9nO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnQobmFtZTpzdHJpbmcpe1xyXG4gICAgaWYodHlwZW9mIG5hbWUhPT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuaW5zYW5lTmFtZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1wiJytuYW1lLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJztcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50TGlzdChvYmplY3ROYW1lczpzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gb2JqZWN0TmFtZXMubWFwKGZ1bmN0aW9uKG9iamVjdE5hbWUpeyByZXR1cm4gcXVvdGVJZGVudChvYmplY3ROYW1lKTsgfSkuam9pbignLCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW55UXVvdGVhYmxlID0gc3RyaW5nfG51bWJlcnxEYXRlfHtpc1JlYWxEYXRlOmJvb2xlYW4sIHRvWW1kOigpPT5zdHJpbmd9fHt0b1Bvc3RncmVzOigpPT5zdHJpbmd9fHt0b1N0cmluZzooKT0+c3RyaW5nfTtcclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTnVsbGFibGUoYW55VmFsdWU6bnVsbHxBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiAnbnVsbCc7XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dDpzdHJpbmdcclxuICAgIGlmKHR5cGVvZiBhbnlWYWx1ZT09PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZTtcclxuICAgIH1lbHNlIGlmKCEoYW55VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpKXtcclxuICAgICAgICB0ZXh0PWFueVZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZignaXNSZWFsRGF0ZScgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUuaXNSZWFsRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvWW1kKCk7XHJcbiAgICB9ZWxzZSBpZihhbnlWYWx1ZSBpbnN0YW5jZW9mIERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ3RvUG9zdGdyZXMnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLnRvUG9zdGdyZXMgaW5zdGFuY2VvZiBGdW5jdGlvbil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvUG9zdGdyZXMoKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHRleHQgPSBKU09OLnN0cmluZ2lmeShhbnlWYWx1ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gXCInXCIrdGV4dC5yZXBsYWNlKC8nL2csXCInJ1wiKStcIidcIjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUxpdGVyYWwoYW55VmFsdWU6QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubnVsbEluUXVvdGVMaXRlcmFsKTtcclxuICAgIH1cclxuICAgIHJldHVybiBxdW90ZU51bGxhYmxlKGFueVZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29uKHNxbDpzdHJpbmcsIG9yZGVyYnk6c3RyaW5nKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9hZ2codG9fanNvbmIoai4qKSBPUkRFUiBCWSAke29yZGVyYnl9KSBmcm9tICgke3NxbH0pIGFzIGopLCdbXSc6Ompzb25iKWA7XHJcbiAgICAvLyByZXR1cm4gYChTRUxFQ1QgY29hbGVzY2UoanNvbmJfYWdnKHRvX2pzb25iKGouKikgT1JERVIgQlkgJHtvcmRlcmJ5fSksJ1tdJzo6anNvbmIpIGZyb20gKCR7c3FsfSkgYXMgailgXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBqc29ubyhzcWw6c3RyaW5nLCBpbmRleGVkYnk6c3RyaW5nKXtcclxuICAgIHJldHVybiBgQ09BTEVTQ0UoKFNFTEVDVCBqc29uYl9vYmplY3RfYWdnKCR7aW5kZXhlZGJ5fSx0b19qc29uYihqLiopKSBmcm9tICgke3NxbH0pIGFzIGopLCd7fSc6Ompzb25iKWBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzQ29tbW9uPXt0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkLCB3aXRoPzpzdHJpbmd9XHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c0ZpbGU9e2luU3RyZWFtPzp1bmRlZmluZWQsIGZpbGVuYW1lOnN0cmluZ30mQ29weUZyb21PcHRzQ29tbW9uXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0c1N0cmVhbT17aW5TdHJlYW06U3RyZWFtLGZpbGVuYW1lPzp1bmRlZmluZWR9JkNvcHlGcm9tT3B0c0NvbW1vblxyXG5leHBvcnQgdHlwZSBDb3B5RnJvbU9wdHM9Q29weUZyb21PcHRzRmlsZXxDb3B5RnJvbU9wdHNTdHJlYW1cclxuZXhwb3J0IHR5cGUgQnVsa0luc2VydFBhcmFtcz17c2NoZW1hPzpzdHJpbmcsdGFibGU6c3RyaW5nLGNvbHVtbnM6c3RyaW5nW10scm93czphbnlbXVtdLCBvbmVycm9yPzooZXJyOkVycm9yLCByb3c6YW55W10pPT5Qcm9taXNlPHZvaWQ+fVxyXG5cclxuZXhwb3J0IHR5cGUgQ29sdW1uID0ge2RhdGFfdHlwZTpzdHJpbmd9O1xyXG5cclxuZXhwb3J0IGNsYXNzIEluZm9ybWF0aW9uU2NoZW1hUmVhZGVye1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBjbGllbnQ6Q2xpZW50KXtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvbHVtbih0YWJsZV9zY2hlbWE6c3RyaW5nLCB0YWJsZV9uYW1lOnN0cmluZywgY29sdW1uX25hbWU6c3RyaW5nKTpQcm9taXNlPENvbHVtbnxudWxsPntcclxuICAgICAgICB2YXIgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQucXVlcnkoYFxyXG4gICAgICAgICAgICBzZWxlY3QgKiBcclxuICAgICAgICAgICAgICAgIGZyb20gaW5mb3JtYXRpb25fc2NoZW1hLmNvbHVtbnNcclxuICAgICAgICAgICAgICAgIHdoZXJlIHRhYmxlX3NjaGVtYT0kMVxyXG4gICAgICAgICAgICAgICAgICAgIGFuZCB0YWJsZV9uYW1lPSQyXHJcbiAgICAgICAgICAgICAgICAgICAgYW5kIGNvbHVtbl9uYW1lPSQzO1xyXG4gICAgICAgIGAsW3RhYmxlX3NjaGVtYSwgdGFibGVfbmFtZSwgY29sdW1uX25hbWVdKS5mZXRjaE9uZVJvd0lmRXhpc3RzKCk7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqKioqJyxhcmd1bWVudHMscmVzdWx0LnJvdywgcmVzdWx0LnJvd3x8bnVsbClcclxuICAgICAgICByZXR1cm4gKHJlc3VsdC5yb3cgfHwgbnVsbCkgYXMgQ29sdW1ufG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBUT0RPOiBhbnkgZW4gb3B0cyAqL1xyXG5leHBvcnQgY2xhc3MgQ2xpZW50e1xyXG4gICAgcHJpdmF0ZSBjb25uZWN0ZWQ6bnVsbHx7XHJcbiAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpudW1iZXIsXHJcbiAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bnVtYmVyXHJcbiAgICB9PW51bGw7XHJcbiAgICBwcml2YXRlIGZyb21Qb29sOmJvb2xlYW49ZmFsc2U7XHJcbiAgICBwcml2YXRlIHBvc3RDb25uZWN0KCl7XHJcbiAgICAgICAgdmFyIG5vd1RzPW5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHRoaXMuY29ubmVjdGVkID0ge1xyXG4gICAgICAgICAgICBsYXN0T3BlcmF0aW9uVGltZXN0YW1wOm5vd1RzLFxyXG4gICAgICAgICAgICBsYXN0Q29ubmVjdGlvblRpbWVzdGFtcDpub3dUc1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHByaXZhdGUgX2NsaWVudDoocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfXxudWxsO1xyXG4gICAgcHJpdmF0ZSBfaW5mb3JtYXRpb25TY2hlbWE6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ8bnVsbD1udWxsO1xyXG4gICAgY29uc3RydWN0b3IoY29ubk9wdHM6Q29ubmVjdFBhcmFtc3xudWxsLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSwgcHJpdmF0ZSBfZG9uZTooKT0+dm9pZCwgX29wdHM/OmFueSl7XHJcbiAgICAgICAgdGhpcy5fY2xpZW50ID0gY2xpZW50IGFzIChwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgIGlmKGNvbm5PcHRzPT1udWxsKXtcclxuICAgICAgICAgICAgdGhpcy5mcm9tUG9vbD10cnVlO1xyXG4gICAgICAgICAgICB0aGlzLnBvc3RDb25uZWN0KCk7XHJcbiAgICAgICAgICAgIC8qIERPSU5HXHJcbiAgICAgICAgICAgIGlmKHNlbGYub3B0cy50aW1lb3V0Q29udHJvbGxlcil7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxUaW1lb3V0KHNlbGYudGltZW91dENvbnRyb2xsZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlbGYudGltZW91dENvbnRyb2xsZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdENvbm5lY3RDbGllbnRGcm9tUG9vbClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IobWVzc2FnZXMuY2xpZW50Q29uZW5jdE11c3ROb3RSZWNlaXZlUGFyYW1zKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubGFja09mQ2xpZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMubXVzdE5vdEVuZENsaWVudEZyb21Qb29sKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZih0aGlzLl9jbGllbnQgaW5zdGFuY2VvZiBwZy5DbGllbnQpe1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuZW5kKCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5sYWNrT2ZDbGllbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBkb25lKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5jbGllbnRBbHJlYWR5RG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIERFQlVHR0lOR1xyXG4gICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50LS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjbGllbnRUb0RvbmU9dGhpcy5fY2xpZW50O1xyXG4gICAgICAgIHRoaXMuX2NsaWVudD1udWxsO1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgYXJndW1lbnRzIEFycmF5IGxpa2UgYW5kIGFwcGx5YWJsZVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lLmFwcGx5KGNsaWVudFRvRG9uZSwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuICAgIHF1ZXJ5KHNxbDpzdHJpbmcpOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nLCBwYXJhbXM6YW55W10pOlF1ZXJ5XHJcbiAgICBxdWVyeShzcWxPYmplY3Q6e3RleHQ6c3RyaW5nLCB2YWx1ZXM6YW55W119KTpRdWVyeVxyXG4gICAgcXVlcnkoKTpRdWVyeXtcclxuICAgICAgICBpZighdGhpcy5jb25uZWN0ZWQgfHwgIXRoaXMuX2NsaWVudCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5xdWVyeU5vdENvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jb25uZWN0ZWQubGFzdE9wZXJhdGlvblRpbWVzdGFtcCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHZhciBxdWVyeUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5VGV4dDtcclxuICAgICAgICB2YXIgcXVlcnlWYWx1ZXM9bnVsbDtcclxuICAgICAgICBpZih0eXBlb2YgcXVlcnlBcmd1bWVudHNbMF0gPT09ICdzdHJpbmcnKXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gcXVlcnlBcmd1bWVudHNbMV0gPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzFdfHxudWxsKTtcclxuICAgICAgICB9ZWxzZSBpZihxdWVyeUFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE9iamVjdCl7XHJcbiAgICAgICAgICAgIHF1ZXJ5VGV4dCA9IHF1ZXJ5QXJndW1lbnRzWzBdLnRleHQ7XHJcbiAgICAgICAgICAgIHF1ZXJ5VmFsdWVzID0gYWRhcHRQYXJhbWV0ZXJUeXBlcyhxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXN8fG51bGwpO1xyXG4gICAgICAgICAgICBxdWVyeUFyZ3VtZW50c1swXS52YWx1ZXMgPSBxdWVyeVZhbHVlcztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgdmFyIHNxbD1xdWVyeVRleHQ7XHJcbiAgICAgICAgICAgIGxvZyhNRVNTQUdFU19TRVBBUkFUT1IsIE1FU1NBR0VTX1NFUEFSQVRPUl9UWVBFKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMgJiYgcXVlcnlWYWx1ZXMubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIGxvZygnYCcrc3FsKydcXG5gJywnUVVFUlktUCcpO1xyXG4gICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHF1ZXJ5VmFsdWVzKSwnUVVFUlktQScpO1xyXG4gICAgICAgICAgICAgICAgcXVlcnlWYWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZTphbnksIGk6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgICAgICBzcWw9c3FsLnJlcGxhY2UobmV3IFJlZ0V4cCgnXFxcXCQnKyhpKzEpKydcXFxcYicpLCB0eXBlb2YgdmFsdWUgPT0gXCJudW1iZXJcIiB8fCB0eXBlb2YgdmFsdWUgPT0gXCJib29sZWFuXCI/dmFsdWU6cXVvdGVOdWxsYWJsZSh2YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nKHNxbCsnOycsJ1FVRVJZJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByZXR1cm5lZFF1ZXJ5ID0gdGhpcy5fY2xpZW50LnF1ZXJ5KG5ldyBwZy5RdWVyeShxdWVyeUFyZ3VtZW50c1swXSwgcXVlcnlBcmd1bWVudHNbMV0pKTtcclxuICAgICAgICByZXR1cm4gbmV3IFF1ZXJ5KHJldHVybmVkUXVlcnksIHRoaXMsIHRoaXMuX2NsaWVudCk7XHJcbiAgICB9O1xyXG4gICAgZ2V0IGluZm9ybWF0aW9uU2NoZW1hKCk6SW5mb3JtYXRpb25TY2hlbWFSZWFkZXJ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2luZm9ybWF0aW9uU2NoZW1hIHx8IG5ldyBJbmZvcm1hdGlvblNjaGVtYVJlYWRlcih0aGlzKTtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGVTZW50ZW5jZXMoc2VudGVuY2VzOnN0cmluZ1tdKXtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNlbnRlbmNlc09uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY2RwO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZXhlY3V0ZVNxbFNjcmlwdChmaWxlTmFtZTpzdHJpbmcpe1xyXG4gICAgICAgIHZhciBzZWxmPXRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMuYXR0ZW1wdFRvRXhlY3V0ZVNxbFNjcmlwdE9uTm90Q29ubmVjdGVkK1wiIFwiKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlKGZpbGVOYW1lLCd1dGYtOCcpLnRoZW4oZnVuY3Rpb24oY29udGVudCl7XHJcbiAgICAgICAgICAgIHZhciBzZW50ZW5jZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuXFxyP1xcbi8pO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5leGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlcy5hdHRlbXB0VG9idWxrSW5zZXJ0T25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaV9yb3dzPTA7XHJcbiAgICAgICAgd2hpbGUoaV9yb3dzPHBhcmFtcy5yb3dzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCk7XHJcbiAgICAgICAgICAgIH1jYXRjaChlcnIpe1xyXG4gICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHBhcmFtcy5vbmVycm9yKGVyciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaV9yb3dzKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29weUZyb21QYXJzZVBhcmFtcyhvcHRzOkNvcHlGcm9tT3B0cyl7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW1PcHRzRG9uZUV4cGVyaW1lbnRhbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmF0dGVtcHRUb2NvcHlGcm9tT25Ob3RDb25uZWN0ZWQrXCIgXCIrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZnJvbSA9IG9wdHMuaW5TdHJlYW0gPyAnU1RESU4nIDogcXVvdGVMaXRlcmFsKG9wdHMuZmlsZW5hbWUpO1xyXG4gICAgICAgIHZhciBzcWwgPSBgQ09QWSAke29wdHMudGFibGV9ICR7b3B0cy5jb2x1bW5zP2AoJHtvcHRzLmNvbHVtbnMubWFwKG5hbWU9PnF1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywnKX0pYDonJ30gRlJPTSAke2Zyb219ICR7b3B0cy53aXRoPydXSVRIICcrb3B0cy53aXRoOicnfWA7XHJcbiAgICAgICAgcmV0dXJuIHtzcWwsIF9jbGllbnQ6dGhpcy5fY2xpZW50fTtcclxuICAgIH1cclxuICAgIGFzeW5jIGNvcHlGcm9tRmlsZShvcHRzOkNvcHlGcm9tT3B0c0ZpbGUpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57XHJcbiAgICAgICAgdmFyIHtzcWx9ID0gdGhpcy5jb3B5RnJvbVBhcnNlUGFyYW1zKG9wdHMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KHNxbCkuZXhlY3V0ZSgpO1xyXG4gICAgfVxyXG4gICAgY29weUZyb21JbmxpbmVEdW1wU3RyZWFtKG9wdHM6Q29weUZyb21PcHRzU3RyZWFtKXtcclxuICAgICAgICB2YXIge3NxbCwgX2NsaWVudH0gPSB0aGlzLmNvcHlGcm9tUGFyc2VQYXJhbXMob3B0cyk7XHJcbiAgICAgICAgdmFyIHN0cmVhbSA9IF9jbGllbnQucXVlcnkoY29weUZyb20oc3FsKSk7XHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgc2tpcHBpbmcgZXhwZXJtaWVudGFsIGZlYXR1cmUgKi9cclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlbmQnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Nsb3NlJywgb3B0cy5kb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYob3B0cy5pblN0cmVhbSl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IHNraXBwaW5nIGV4cGVybWllbnRhbCBmZWF0dXJlICovXHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBza2lwcGluZyBleHBlcm1pZW50YWwgZmVhdHVyZSAqL1xyXG4gICAgICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuaW5TdHJlYW0ucGlwZShzdHJlYW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyZWFtO1xyXG4gICAgfVxyXG4gICAgZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAobnVsbGFibGU6YW55KXtcclxuICAgICAgICBpZihudWxsYWJsZT09bnVsbCl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2UgaWYodHlwZW9mIG51bGxhYmxlID09PSBcIm51bWJlclwiICYmIGlzTmFOKG51bGxhYmxlKSl7XHJcbiAgICAgICAgICAgIHJldHVybiAnXFxcXE4nXHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsYWJsZS50b1N0cmluZygpLnJlcGxhY2UoLyhcXHIpfChcXG4pfChcXHQpfChcXFxcKS9nLCBcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKF9hbGw6c3RyaW5nLGJzcjpzdHJpbmcsYnNuOnN0cmluZyxic3Q6c3RyaW5nLGJzOnN0cmluZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnNyKSByZXR1cm4gJ1xcXFxyJztcclxuICAgICAgICAgICAgICAgICAgICBpZihic24pIHJldHVybiAnXFxcXG4nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzdCkgcmV0dXJuICdcXFxcdCc7XHJcbiAgICAgICAgICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgcG9yIGxhIHJlZ2V4cCBlcyBpbXBvc2libGUgcXVlIHBhc2UgYWwgZWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzKSByZXR1cm4gJ1xcXFxcXFxcJztcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCBFc3RvIGVzIGltcG9zaWJsZSBxdWUgc3VjZWRhICovXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLmZvcm1hdE51bGxhYmxlVG9JbmxpbmVEdW1wRXJyb3JQYXJzaW5nKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tQXJyYXlTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHNTdHJlYW0pe1xyXG4gICAgICAgIHZhciBjID0gdGhpcztcclxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSh7XHJcbiAgICAgICAgICAgIHdyaXRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICByZWFkYWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgdHJhbnNmb3JtKGFycmF5Q2h1bms6YW55W10sIF9lbmNvZGluZywgbmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goYXJyYXlDaHVuay5tYXAoeD0+Yy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCh4KSkuam9pbignXFx0JykrJ1xcbicpXHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZsdXNoKG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKCdcXFxcLlxcbicpO1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIHtpblN0cmVhbSwgLi4ucmVzdH0gPSBvcHRzO1xyXG4gICAgICAgIGluU3RyZWFtLnBpcGUodHJhbnNmb3JtKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW0oe2luU3RyZWFtOnRyYW5zZm9ybSwgLi4ucmVzdH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBxdWVyeVJlc3VsdDpwZy5RdWVyeVJlc3VsdDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0e1xyXG4gICAgcm93Q291bnQ6bnVtYmVyXHJcbiAgICBmaWVsZHM6dHlwZW9mIHF1ZXJ5UmVzdWx0LmZpZWxkc1xyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Q29tbWFuZHtcclxuICAgIGNvbW1hbmQ6c3RyaW5nLCByb3dDb3VudDpudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvdyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdzp7W2tleTpzdHJpbmddOmFueX1cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvd0lmRXhpc3RzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Pzp7W2tleTpzdHJpbmddOmFueX18bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Um93cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvd3M6e1trZXk6c3RyaW5nXTphbnl9W11cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFZhbHVlIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgdmFsdWU6YW55XHJcbn1cclxuLy8gZXhwb3J0IGludGVyZmFjZSBSZXN1bHRHZW5lcmljIGV4dGVuZHMgUmVzdWx0VmFsdWUsIFJlc3VsdFJvd3MsIFJlc3VsdE9uZVJvd0lmRXhpc3RzLCBSZXN1bHRPbmVSb3csIFJlc3VsdHt9XHJcbmV4cG9ydCB0eXBlIFJlc3VsdEdlbmVyaWMgPSBSZXN1bHRWYWx1ZXxSZXN1bHRSb3dzfFJlc3VsdE9uZVJvd0lmRXhpc3RzfFJlc3VsdE9uZVJvd3xSZXN1bHR8UmVzdWx0Q29tbWFuZFxyXG5cclxuLypcclxuZnVuY3Rpb24gYnVpbGRRdWVyeUNvdW50ZXJBZGFwdGVyKFxyXG4gICAgbWluQ291bnRSb3c6bnVtYmVyLCBcclxuICAgIG1heENvdW50Um93Om51bWJlciwgXHJcbiAgICBleHBlY3RUZXh0OnN0cmluZywgXHJcbiAgICBjYWxsYmFja090aGVyQ29udHJvbD86KHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkXHJcbil7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcXVlcnlDb3VudGVyQWRhcHRlcihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKXsgXHJcbiAgICAgICAgaWYocmVzdWx0LnJvd3MubGVuZ3RoPG1pbkNvdW50Um93IHx8IHJlc3VsdC5yb3dzLmxlbmd0aD5tYXhDb3VudFJvdyApe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyAnK2V4cGVjdFRleHQrJyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dzLmxlbmd0aCsnIHJvd3MnKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKGNhbGxiYWNrT3RoZXJDb250cm9sKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrT3RoZXJDb250cm9sKHJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLm90aGVyfSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5vdGhlcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4qL1xyXG5cclxudHlwZSBOb3RpY2UgPSBzdHJpbmc7XHJcblxyXG5mdW5jdGlvbiBsb2dFcnJvcklmTmVlZGVkPFQ+KGVycjpFcnJvciwgY29kZT86VCk6RXJyb3J7XHJcbiAgICBpZihjb2RlICE9IG51bGwpe1xyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICBlcnIuY29kZT1jb2RlO1xyXG4gICAgfVxyXG4gICAgaWYobG9nKXtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgbG9nKCctLUVSUk9SISAnK2Vyci5jb2RlKycsICcrZXJyLm1lc3NhZ2UsICdFUlJPUicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVycjtcclxufVxyXG5cclxuZnVuY3Rpb24gb2J0YWlucyhtZXNzYWdlOnN0cmluZywgY291bnQ6bnVtYmVyKTpzdHJpbmd7XHJcbiAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKCckMScsXHJcbiAgICAgICAgY291bnQ/bWVzc2FnZXMub2J0YWluczEucmVwbGFjZSgnJDEnLGNvdW50LnRvU3RyaW5nKCkpOm1lc3NhZ2VzLm9idGFpbnNOb25lXHJcbiAgICApO1xyXG59IFxyXG5cclxuXHJcbmNsYXNzIFF1ZXJ5e1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfcXVlcnk6cGcuUXVlcnksIHB1YmxpYyBjbGllbnQ6Q2xpZW50LCBwcml2YXRlIF9pbnRlcm5hbENsaWVudDpwZy5DbGllbnR8cGcuUG9vbENsaWVudCl7XHJcbiAgICB9XHJcbiAgICBvbk5vdGljZShjYWxsYmFja05vdGljZUNvbnN1bWVyOihub3RpY2U6Tm90aWNlKT0+dm9pZCk6UXVlcnl7XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub3RpY2VDYWxsYmFjaz1mdW5jdGlvbihub3RpY2U6Tm90aWNlKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFISBMQUNLUyBvZiBhY3RpdmVRdWVyeVxyXG4gICAgICAgICAgICBpZihxLl9pbnRlcm5hbENsaWVudC5hY3RpdmVRdWVyeT09cS5fcXVlcnkpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tOb3RpY2VDb25zdW1lcihub3RpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdub3RpY2UnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgdGhpcy5faW50ZXJuYWxDbGllbnQub24oJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHZhciByZW1vdmVOb3RpY2VDYWxsYmFjaz1mdW5jdGlvbiByZW1vdmVOb3RpY2VDYWxsYmFjaygpe1xyXG4gICAgICAgICAgICBxLl9pbnRlcm5hbENsaWVudC5yZW1vdmVMaXN0ZW5lcignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlbmQnLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZXJyb3InLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBwcml2YXRlIF9leGVjdXRlPFRSIGV4dGVuZHMgUmVzdWx0R2VuZXJpYz4oXHJcbiAgICAgICAgYWRhcHRlckNhbGxiYWNrOm51bGx8KChyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpUUik9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWQpLFxyXG4gICAgICAgIGNhbGxiYWNrRm9yRWFjaFJvdz86KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPiwgXHJcbiAgICApOlByb21pc2U8VFI+e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VFI+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIHZhciBwZW5kaW5nUm93cz0wO1xyXG4gICAgICAgICAgICB2YXIgZW5kTWFyazpudWxsfHtyZXN1bHQ6cGcuUXVlcnlSZXN1bHR9PW51bGw7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlcnJvcicsZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ3JvdycpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ3JvdycsYXN5bmMgZnVuY3Rpb24ocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tGb3JFYWNoUm93KXtcclxuICAgICAgICAgICAgICAgICAgICBwZW5kaW5nUm93cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZygnLS0gJytKU09OLnN0cmluZ2lmeShyb3cpLCAnUk9XJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGNhbGxiYWNrRm9yRWFjaFJvdyhyb3csIHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLS1wZW5kaW5nUm93cztcclxuICAgICAgICAgICAgICAgICAgICB3aGVuRW5kKCk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIGFkZFJvdyBvbW1pdGVkIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuYWRkUm93KHJvdyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiB3aGVuRW5kKCl7XHJcbiAgICAgICAgICAgICAgICBpZihlbmRNYXJrICYmICFwZW5kaW5nUm93cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYWRhcHRlckNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWRhcHRlckNhbGxiYWNrKGVuZE1hcmsucmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZW5kTWFyaz17cmVzdWx0fTtcclxuICAgICAgICAgICAgICAgIHdoZW5FbmQoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgdGhyb3cgbG9nRXJyb3JJZk5lZWRlZChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0VmFsdWU+ICB7IFxyXG4gICAgICAgIHZhciB7cm93LCAuLi5yZXN1bHR9ID0gYXdhaXQgdGhpcy5mZXRjaFVuaXF1ZVJvdygpO1xyXG4gICAgICAgIGlmKHJlc3VsdC5maWVsZHMubGVuZ3RoIT09MSl7XHJcbiAgICAgICAgICAgIHRocm93IGxvZ0Vycm9ySWZOZWVkZWQoXHJcbiAgICAgICAgICAgICAgICBuZXcgRXJyb3Iob2J0YWlucyhlcnJvck1lc3NhZ2V8fG1lc3NhZ2VzLnF1ZXJ5RXhwZWN0c09uZUZpZWxkQW5kMSwgcmVzdWx0LmZpZWxkcy5sZW5ndGgpKSxcclxuICAgICAgICAgICAgICAgICc1NFUxMSEnXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhlcnJvck1lc3NhZ2U/OnN0cmluZyxhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihvYnRhaW5zKGVycm9yTWVzc2FnZXx8bWVzc2FnZXMucXVlcnlFeHBlY3RzT25lUm93QW5kMSxyZXN1bHQucm93Q291bnQpKTtcclxuICAgICAgICAgICAgICAgIC8vQHRzLWlnbm9yZSBlcnIuY29kZVxyXG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnNTQwMTEhJ1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoZXJyb3JNZXNzYWdlPzpzdHJpbmcpOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoVW5pcXVlUm93KGVycm9yTWVzc2FnZSx0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKG1lc3NhZ2VzLmZldGNoUm93QnlSb3dNdXN0UmVjZWl2ZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nMzkwMDQhJztcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2V4ZWN1dGUobnVsbCwgY2IpO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgb25Sb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hSb3dCeVJvdyhjYik7XHJcbiAgICB9XHJcbiAgICB0aGVuKCl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2VzLnF1ZXJ5TXVzdE5vdEJlVGhlbmVkKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZXMucXVlcnlNdXN0Tm90QmVDYXRjaGVkKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpOlByb21pc2U8Q2xpZW50PntcclxuICAgIGlmKGFsbFR5cGVzKXtcclxuICAgICAgICBzZXRBbGxUeXBlcygpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgdmFyIGlkQ29ubmVjdFBhcmFtZXRlcnMgPSBKU09OLnN0cmluZ2lmeShjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgdmFyIHBvb2wgPSBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXXx8bmV3IHBnLlBvb2woY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdID0gcG9vbDtcclxuICAgICAgICBwb29sLmNvbm5lY3QoZnVuY3Rpb24oZXJyLCBjbGllbnQsIGRvbmUpe1xyXG4gICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShuZXcgQ2xpZW50KG51bGwsIGNsaWVudCwgZG9uZSAvKiwgRE9JTkcge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlbGVhc2VUaW1lb3V0OiBjaGFuZ2luZyhwZ1Byb21pc2VTdHJpY3QuZGVmYXVsdHMucmVsZWFzZVRpbWVvdXQsY29ubmVjdFBhcmFtZXRlcnMucmVsZWFzZVRpbWVvdXR8fHt9KVxyXG4gICAgICAgICAgICAgICAgfSovKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciByZWFkeUxvZyA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuLyogeHhpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nTGFzdEVycm9yKG1lc3NhZ2U6c3RyaW5nLCBtZXNzYWdlVHlwZTpzdHJpbmcpOnZvaWR7XHJcbiAgICBpZihtZXNzYWdlVHlwZSl7XHJcbiAgICAgICAgaWYobWVzc2FnZVR5cGU9PSdFUlJPUicpe1xyXG4gICAgICAgICAgICBpZihsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbGluZXM9WydQRy1FUlJPUiAnK21lc3NhZ2VdO1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0ciBpbiBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbGluZXMucHVzaChcIi0tLS0tLS0gXCIrYXR0citcIjpcXG5cIitsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3Jpbjp0cnVlICovXHJcbiAgICAgICAgICAgICAgICAvKmVzbGludCBndWFyZC1mb3ItaW46IDAqL1xyXG4gICAgICAgICAgICAgICAgcmVhZHlMb2cgPSByZWFkeUxvZy50aGVuKF89PmZzLndyaXRlRmlsZShsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSxsaW5lcy5qb2luKCdcXG4nKSkpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBpZihtZXNzYWdlVHlwZT09TUVTU0FHRVNfU0VQQVJBVE9SX1RZUEUpe1xyXG4gICAgICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaChtZXNzYWdlcy51bmJhbGFuY2VkQ29ubmVjdGlvbisnICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbnByb2Nlc3Mub24oJ2V4aXQnLGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG59KTtcclxuIl19