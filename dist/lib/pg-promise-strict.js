var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs-extra", "pg", "pg-copy-streams", "util", "like-ar", "best-globals"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs-extra");
    const pg = require("pg");
    const pgTypes = pg.types;
    const pg_copy_streams_1 = require("pg-copy-streams");
    const util = require("util");
    const likeAr = require("like-ar");
    const bestGlobals = require("best-globals");
    exports.debug = {};
    exports.defaults = {
        releaseTimeout: { inactive: 60000, connection: 600000 }
    };
    exports.log = function () { };
    function quoteIdent(name) {
        if (typeof name !== "string") {
            throw new Error("insane name");
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
            text = anyValue.toString();
        }
        return "'" + text.replace(/'/g, "''") + "'";
    }
    exports.quoteNullable = quoteNullable;
    ;
    function quoteLiteral(anyValue) {
        if (anyValue == null) {
            throw new Error("null in quoteLiteral");
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
    function rejecter() {
        return Promise.reject(new Error("pg-promise-strict: not call function as thenable"));
    }
    function NotTheneable() {
        return {
            then: rejecter(),
            catch: rejecter(),
        };
    }
    exports.NotTheneable = NotTheneable;
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
                throw new Error("pg-promise-strict: Must not connect client from pool");
            }
            if (arguments.length) {
                return Promise.reject(new Error('client.connect must no receive parameters, it returns a Promise'));
            }
            if (!this._client) {
                throw new Error("pg-promise-strict: lack of Client._client");
            }
            /** @type {pg.Client} */
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
                throw new Error("pg-promise-strict: Must not end client from pool");
            }
            if (this._client instanceof pg.Client) {
                this._client.end();
            }
            else {
                throw new Error("pg-promise-strict: lack of Client._client");
            }
        }
        ;
        done() {
            if (!this._client) {
                throw new Error("pg-promise-strict client already done");
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
            if (!this.connected) {
                throw new Error("pg-promise-strict: query in not connected");
            }
            if (!this._client) {
                // @ts-ignore THIS IS A HACK FOR LEGACY CALLS TO wait ...query();
                return NotTheneable();
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
                exports.log('------', '------');
                if (queryValues) {
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
                throw new Error('pg-promise-strict: atempt to executeSentences on not connected ' + !this._client + ',' + !this.connected);
            }
            var cdp = Promise.resolve();
            sentences.forEach(function (sentence) {
                cdp = cdp.then(async function () {
                    if (!sentence.trim()) {
                        return;
                    }
                    return await self.query(sentence).execute().catch(function (err) {
                        // console.log('ERROR',err);
                        // console.log(sentence);
                        throw err;
                    });
                });
            });
            return cdp;
        }
        async executeSqlScript(fileName) {
            var self = this;
            if (!this._client || !this.connected) {
                throw new Error('pg-promise-strict: atempt to executeSqlScript on not connected ' + !this._client + ',' + !this.connected);
            }
            return fs.readFile(fileName, 'utf-8').then(function (content) {
                var sentences = content.split(/\r?\n\r?\n/);
                return self.executeSentences(sentences);
            });
        }
        /** @param {pgps.} params*/
        bulkInsert(params) {
            var self = this;
            if (!this._client || !this.connected) {
                throw new Error('pg-promise-strict: atempt to bulkInsert on not connected ' + !this._client + ',' + !this.connected);
            }
            var sql = "INSERT INTO " + (params.schema ? quoteIdent(params.schema) + '.' : '') +
                quoteIdent(params.table) + " (" +
                params.columns.map(quoteIdent).join(', ') + ") VALUES (" +
                params.columns.map(function (_name, i_name) { return '$' + (i_name + 1); }) + ")";
            var insertOneRowAndContinueInserting = function insertOneRowAndContinueInserting(i_rows) {
                if (i_rows < params.rows.length) {
                    return self.query(sql, params.rows[i_rows]).execute().catch(function (err) {
                        if (params.onerror) {
                            params.onerror(err, params.rows[i_rows]);
                        }
                        else {
                            throw err;
                        }
                    }).then(function () {
                        return insertOneRowAndContinueInserting(i_rows + 1);
                    });
                }
                return Promise.resolve();
            };
            return insertOneRowAndContinueInserting(0);
        }
        copyFrom(opts) {
            if (!this._client || !this.connected) {
                throw new Error('pg-promise-strict: atempt to copyFrom on not connected ' + !this._client + ',' + !this.connected);
            }
            if (!this._client) {
                throw new Error("pg-promise-stric: no Client._client in copyFrom");
            }
            var stream = this._client.query(pg_copy_streams_1.from(`'COPY ${opts.table} ${opts.columns ? `(${opts.columns.map(name => quoteIdent(name)).join(',')})` : ''} FROM STDIN`));
            if (opts.done) {
                stream.on('error', opts.done);
                stream.on('end', opts.done);
            }
            if (opts.stream) {
                if (opts.done) {
                    opts.stream.on('error', opts.done);
                }
                opts.stream.pipe(stream);
            }
            return stream;
        }
    }
    exports.Client = Client;
    var queryResult;
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
                q._query.on('error', function (err) {
                    if (exports.log) {
                        // @ts-ignore EXTENDED ERROR
                        exports.log('--ERROR! ' + err.code + ', ' + err.message, 'ERROR');
                    }
                    reject(err);
                });
                // @ts-ignore .on('row') DOES NOT HAVE THE CORRECT TYPE!
                q._query.on('row', function (row, result) {
                    if (callbackForEachRow) {
                        if (exports.log) {
                            exports.log('-- ' + JSON.stringify(row), 'ROW');
                        }
                        callbackForEachRow(row, result);
                    }
                    else {
                        // @ts-ignore addRow ommited DOES NOT HAVE THE CORRECT TYPE!
                        result.addRow(row);
                    }
                });
                q._query.on('end', function (result) {
                    // TODO: VER SI ESTO ES NECESARIO
                    // result.client = q.client;
                    if (exports.log) {
                        exports.log('-- ' + JSON.stringify(result.rows), 'RESULT');
                    }
                    if (adapterCallback) {
                        adapterCallback(result, resolve, reject);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        ;
        async fetchUniqueValue() {
            var _a = await this.fetchUniqueRow(), { row } = _a, result = __rest(_a, ["row"]);
            if (result.fields.length !== 1) {
                var err = new Error('query expects one field and obtains ' + result.fields.length);
                // @ts-ignore EXTENDED ERROR
                err.code = '54U11!';
                throw err;
            }
            return Object.assign({ value: row[result.fields[0].name] }, result);
        }
        fetchUniqueRow(acceptNoRows) {
            return this._execute(function (result, resolve, reject) {
                if (result.rowCount !== 1 && (!acceptNoRows || !result.rowCount)) {
                    var err = new Error('query expects one row and obtains ' + result.rowCount);
                    // @ts-ignore EXTENDED ERROR
                    err.code = '54011!';
                    reject(err);
                }
                else {
                    var { rows } = result, rest = __rest(result, ["rows"]);
                    resolve(Object.assign({ row: rows[0] }, rest));
                }
            });
        }
        fetchOneRowIfExists() {
            return this.fetchUniqueRow(true);
        }
        fetchAll() {
            return this._execute(function (result, resolve, _reject) {
                resolve(result);
            });
        }
        execute() {
            return this._execute(function (result, resolve, _reject) {
                var { rows, oid, fields } = result, rest = __rest(result, ["rows", "oid", "fields"]);
                resolve(rest);
            });
        }
        async fetchRowByRow(cb) {
            if (!(cb instanceof Function)) {
                var err = new Error('fetchRowByRow must receive a callback that executes for each row');
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
            throw new Error('pg-promise-strict: Query must not be awaited nor thened');
        }
        catch() {
            throw new Error('pg-promise-strict: Query must not be awaited nor catched');
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
    function logLastError(message, messageType) {
        if (messageType) {
            if (messageType == 'ERROR') {
                console.log('PG-ERROR pgPromiseStrict.logLastError.inFileName', logLastError.inFileName);
                console.log('PG-ERROR', message);
                if (logLastError.inFileName) {
                    var lines = ['PG-ERROR ' + message];
                    /*jshint forin:false */
                    for (var attr in logLastError.receivedMessages) {
                        lines.push("------- " + attr + ":\n" + logLastError.receivedMessages[attr]);
                    }
                    /*jshint forin:true */
                    /*eslint guard-for-in: 0*/
                    fs.writeFile(logLastError.inFileName, lines.join('\n'));
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
                    rta.push('pgPromiseStrict.debug.pool unbalanced connection ' + util.inspect(pool));
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
});
//# sourceMappingURL=pg-promise-strict.js.map