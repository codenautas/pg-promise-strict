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
    /* instanbul ignore next */
    function noLog(_message, _type) { }
    exports.log = noLog;
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
            text = JSON.stringify(anyValue);
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
                /* istanbul ignore next */
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
                /* istanbul ignore next */
                throw new Error("pg-promise-strict: Must not end client from pool");
            }
            if (this._client instanceof pg.Client) {
                this._client.end();
            }
            else {
                /* istanbul ignore next */
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
            if (!this.connected || !this._client) {
                /* istanbul ignore next */
                throw new Error("pg-promise-strict: query in not connected");
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
                /* istanbul ignore next */
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
                /* istanbul ignore next */
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
                /* istanbul ignore next */
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
                /* istanbul ignore next */
                throw new Error('pg-promise-strict: atempt to copyFrom on not connected ' + !this._client + ',' + !this.connected);
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
                if (result.rowCount !== 1 && (!acceptNoRows || !!result.rowCount)) {
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
    /* istanbul ignore next */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBLFlBQVksQ0FBQzs7SUFFYiwrQkFBK0I7SUFDL0IseUJBQXlCO0lBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFFekIscURBQWlEO0lBQ2pELDZCQUE2QjtJQUM3QixrQ0FBa0M7SUFDbEMsNENBQTRDO0lBR2pDLFFBQUEsS0FBSyxHQUlkLEVBQUUsQ0FBQztJQUVNLFFBQUEsUUFBUSxHQUFDO1FBQ2hCLGNBQWMsRUFBQyxFQUFDLFFBQVEsRUFBQyxLQUFLLEVBQUUsVUFBVSxFQUFDLE1BQU0sRUFBQztLQUNyRCxDQUFDO0lBRUYsMkJBQTJCO0lBQzNCLFNBQVMsS0FBSyxDQUFDLFFBQWUsRUFBRSxLQUFZLElBQUUsQ0FBQztJQUVwQyxRQUFBLEdBQUcsR0FBcUMsS0FBSyxDQUFDO0lBRXpELFNBQWdCLFVBQVUsQ0FBQyxJQUFXO1FBQ2xDLElBQUcsT0FBTyxJQUFJLEtBQUcsUUFBUSxFQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDbEM7UUFDRCxPQUFPLEdBQUcsR0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBQyxHQUFHLENBQUM7SUFDNUMsQ0FBQztJQUxELGdDQUtDO0lBQUEsQ0FBQztJQUVGLFNBQWdCLGNBQWMsQ0FBQyxXQUFvQjtRQUMvQyxPQUFPLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBUyxVQUFVLElBQUcsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUZELHdDQUVDO0lBQUEsQ0FBQztJQUdGLFNB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LENBQUM7SUFFRixTQUFnQixrQkFBa0I7UUFDOUIsSUFBSSxHQUFHLEdBQVUsRUFBRSxDQUFDO1FBQ3BCLElBQUcsT0FBTyxhQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBQztZQUM5QixNQUFNLENBQUMsYUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLElBQUk7Z0JBQ3BDLElBQUcsSUFBSSxDQUFDLEtBQUssRUFBQztvQkFDVixHQUFHLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxHQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDcEY7WUFDTCxDQUFDLENBQUMsQ0FBQztTQUNOO1FBQ0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFWRCxnREFVQztJQUFBLENBQUM7SUFFRiwwQkFBMEI7SUFDMUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUM7UUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwZyBmcm9tICdwZyc7XHJcbmNvbnN0IHBnVHlwZXMgPSBwZy50eXBlcztcclxuXHJcbmltcG9ydCB7ZnJvbSBhcyBjb3B5RnJvbX0gZnJvbSAncGctY29weS1zdHJlYW1zJztcclxuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcclxuaW1wb3J0ICogYXMgbGlrZUFyIGZyb20gJ2xpa2UtYXInO1xyXG5pbXBvcnQgKiBhcyBiZXN0R2xvYmFscyBmcm9tICdiZXN0LWdsb2JhbHMnO1xyXG5pbXBvcnQge1N0cmVhbX0gZnJvbSAnc3RyZWFtJztcclxuXHJcbmV4cG9ydCB2YXIgZGVidWc6e1xyXG4gICAgcG9vbD86dHJ1ZXx7XHJcbiAgICAgICAgW2tleTpzdHJpbmddOnsgY291bnQ6bnVtYmVyLCBjbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ319XHJcbiAgICB9XHJcbn09e307XHJcblxyXG5leHBvcnQgdmFyIGRlZmF1bHRzPXtcclxuICAgIHJlbGVhc2VUaW1lb3V0OntpbmFjdGl2ZTo2MDAwMCwgY29ubmVjdGlvbjo2MDAwMDB9XHJcbn07XHJcblxyXG4vKiBpbnN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZnVuY3Rpb24gbm9Mb2coX21lc3NhZ2U6c3RyaW5nLCBfdHlwZTpzdHJpbmcpe31cclxuXHJcbmV4cG9ydCB2YXIgbG9nOihtZXNzYWdlOnN0cmluZywgdHlwZTpzdHJpbmcpPT52b2lkPW5vTG9nO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnQobmFtZTpzdHJpbmcpe1xyXG4gICAgaWYodHlwZW9mIG5hbWUhPT1cInN0cmluZ1wiKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNhbmUgbmFtZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiAnXCInK25hbWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKSsnXCInO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlSWRlbnRMaXN0KG9iamVjdE5hbWVzOnN0cmluZ1tdKXtcclxuICAgIHJldHVybiBvYmplY3ROYW1lcy5tYXAoZnVuY3Rpb24ob2JqZWN0TmFtZSl7IHJldHVybiBxdW90ZUlkZW50KG9iamVjdE5hbWUpOyB9KS5qb2luKCcsJyk7XHJcbn07XHJcblxyXG5leHBvcnQgdHlwZSBBbnlRdW90ZWFibGUgPSBzdHJpbmd8bnVtYmVyfERhdGV8e2lzUmVhbERhdGU6Ym9vbGVhbiwgdG9ZbWQ6KCk9PnN0cmluZ318e3RvUG9zdGdyZXM6KCk9PnN0cmluZ318e3RvU3RyaW5nOigpPT5zdHJpbmd9O1xyXG5leHBvcnQgZnVuY3Rpb24gcXVvdGVOdWxsYWJsZShhbnlWYWx1ZTpudWxsfEFueVF1b3RlYWJsZSl7XHJcbiAgICBpZihhbnlWYWx1ZT09bnVsbCl7XHJcbiAgICAgICAgcmV0dXJuICdudWxsJztcclxuICAgIH1cclxuICAgIHZhciB0ZXh0OnN0cmluZ1xyXG4gICAgaWYodHlwZW9mIGFueVZhbHVlPT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlO1xyXG4gICAgfWVsc2UgaWYoIShhbnlWYWx1ZSBpbnN0YW5jZW9mIE9iamVjdCkpe1xyXG4gICAgICAgIHRleHQ9YW55VmFsdWUudG9TdHJpbmcoKTtcclxuICAgIH1lbHNlIGlmKCdpc1JlYWxEYXRlJyBpbiBhbnlWYWx1ZSAmJiBhbnlWYWx1ZS5pc1JlYWxEYXRlKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9ZbWQoKTtcclxuICAgIH1lbHNlIGlmKGFueVZhbHVlIGluc3RhbmNlb2YgRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZigndG9Qb3N0Z3JlcycgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUudG9Qb3N0Z3JlcyBpbnN0YW5jZW9mIEZ1bmN0aW9uKXtcclxuICAgICAgICB0ZXh0ID0gYW55VmFsdWUudG9Qb3N0Z3JlcygpO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KGFueVZhbHVlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBcIidcIit0ZXh0LnJlcGxhY2UoLycvZyxcIicnXCIpK1wiJ1wiO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTGl0ZXJhbChhbnlWYWx1ZTpBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm51bGwgaW4gcXVvdGVMaXRlcmFsXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHF1b3RlTnVsbGFibGUoYW55VmFsdWUpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFkYXB0UGFyYW1ldGVyVHlwZXMocGFyYW1ldGVycz86YW55W10pe1xyXG4gICAgLy8gQHRzLWlnbm9yZSBcclxuICAgIGlmKHBhcmFtZXRlcnM9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtZXRlcnMubWFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICBpZih2YWx1ZSAmJiB2YWx1ZS50eXBlU3RvcmUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUudG9MaXRlcmFsKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IHZhciBlYXN5OmJvb2xlYW49dHJ1ZTsgLy8gZGVwcmVjYXRlZCFcclxuXHJcbmV4cG9ydCB0eXBlIENvbm5lY3RQYXJhbXM9e1xyXG4gICAgbW90b3I/OlwicG9zdGdyZXNcIlxyXG4gICAgZGF0YWJhc2U/OnN0cmluZ1xyXG4gICAgdXNlcj86c3RyaW5nXHJcbiAgICBwYXNzd29yZD86c3RyaW5nXHJcbiAgICBwb3J0PzpudW1iZXJcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29weUZyb21PcHRzPXtzdHJlYW06U3RyZWFtLCB0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkfVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOltdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzpbXSk9PnZvaWR9XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd6enp6enp6enp6enp6JyxuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdE9wZXJhdGlvblRpbWVzdGFtcCwgc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlKVxyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgY29ubmVjdCBjbGllbnQgZnJvbSBwb29sXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdjbGllbnQuY29ubmVjdCBtdXN0IG5vIHJlY2VpdmUgcGFyYW1ldGVycywgaXQgcmV0dXJucyBhIFByb21pc2UnKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqIEB0eXBlIHtwZy5DbGllbnR9ICovXHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgZW5kIGNsaWVudCBmcm9tIHBvb2xcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdCBjbGllbnQgYWxyZWFkeSBkb25lXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgaW4gbm90IGNvbm5lY3RlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbm5lY3RlZC5sYXN0T3BlcmF0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5QXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcXVlcnlUZXh0O1xyXG4gICAgICAgIHZhciBxdWVyeVZhbHVlcz1udWxsO1xyXG4gICAgICAgIGlmKHR5cGVvZiBxdWVyeUFyZ3VtZW50c1swXSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXTtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBxdWVyeUFyZ3VtZW50c1sxXSA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMV18fG51bGwpO1xyXG4gICAgICAgIH1lbHNlIGlmKHF1ZXJ5QXJndW1lbnRzWzBdIGluc3RhbmNlb2YgT2JqZWN0KXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF0udGV4dDtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlc3x8bnVsbCk7XHJcbiAgICAgICAgICAgIHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlcyA9IHF1ZXJ5VmFsdWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICB2YXIgc3FsPXF1ZXJ5VGV4dDtcclxuICAgICAgICAgICAgbG9nKCctLS0tLS0nLCctLS0tLS0nKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMpe1xyXG4gICAgICAgICAgICAgICAgbG9nKCdgJytzcWwrJ1xcbmAnLCdRVUVSWS1QJyk7XHJcbiAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocXVlcnlWYWx1ZXMpLCdRVUVSWS1BJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlOmFueSwgaTpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNxbD1zcWwucmVwbGFjZShuZXcgUmVnRXhwKCdcXFxcJCcrKGkrMSkrJ1xcXFxiJyksIHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PSBcImJvb2xlYW5cIj92YWx1ZTpxdW90ZU51bGxhYmxlKHZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2coc3FsKyc7JywnUVVFUlknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJldHVybmVkUXVlcnkgPSB0aGlzLl9jbGllbnQucXVlcnkobmV3IHBnLlF1ZXJ5KHF1ZXJ5QXJndW1lbnRzWzBdLCBxdWVyeUFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUXVlcnkocmV0dXJuZWRRdWVyeSwgdGhpcywgdGhpcy5fY2xpZW50KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZCAnKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdFUlJPUicsZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzZW50ZW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjZHA7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU3FsU2NyaXB0KGZpbGVOYW1lOnN0cmluZyl7XHJcbiAgICAgICAgdmFyIHNlbGY9dGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWQgJyshdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZShmaWxlTmFtZSwndXRmLTgnKS50aGVuKGZ1bmN0aW9uKGNvbnRlbnQpe1xyXG4gICAgICAgICAgICB2YXIgc2VudGVuY2VzID0gY29udGVudC5zcGxpdCgvXFxyP1xcblxccj9cXG4vKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqIEBwYXJhbSB7cGdwcy59IHBhcmFtcyovXHJcbiAgICBidWxrSW5zZXJ0KHBhcmFtczpCdWxrSW5zZXJ0UGFyYW1zKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBidWxrSW5zZXJ0IG9uIG5vdCBjb25uZWN0ZWQgJyshdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzcWwgPSBcIklOU0VSVCBJTlRPIFwiKyhwYXJhbXMuc2NoZW1hP3F1b3RlSWRlbnQocGFyYW1zLnNjaGVtYSkrJy4nOicnKStcclxuICAgICAgICAgICAgcXVvdGVJZGVudChwYXJhbXMudGFibGUpK1wiIChcIitcclxuICAgICAgICAgICAgcGFyYW1zLmNvbHVtbnMubWFwKHF1b3RlSWRlbnQpLmpvaW4oJywgJykrXCIpIFZBTFVFUyAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChmdW5jdGlvbihfbmFtZTpzdHJpbmcsIGlfbmFtZTpudW1iZXIpeyByZXR1cm4gJyQnKyhpX25hbWUrMSk7IH0pK1wiKVwiO1xyXG4gICAgICAgIHZhciBpbnNlcnRPbmVSb3dBbmRDb250aW51ZUluc2VydGluZyA9IGZ1bmN0aW9uIGluc2VydE9uZVJvd0FuZENvbnRpbnVlSW5zZXJ0aW5nKGlfcm93czpudW1iZXIpOlByb21pc2U8dm9pZD57XHJcbiAgICAgICAgICAgIGlmKGlfcm93czxwYXJhbXMucm93cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYucXVlcnkoc3FsLCBwYXJhbXMucm93c1tpX3Jvd3NdKS5leGVjdXRlKCkuY2F0Y2goZnVuY3Rpb24oZXJyOkVycm9yKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihwYXJhbXMub25lcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5vbmVycm9yKGVyciwgcGFyYW1zLnJvd3NbaV9yb3dzXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc2VydE9uZVJvd0FuZENvbnRpbnVlSW5zZXJ0aW5nKGlfcm93cysxKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBpbnNlcnRPbmVSb3dBbmRDb250aW51ZUluc2VydGluZygwKTtcclxuICAgIH1cclxuICAgIGNvcHlGcm9tKG9wdHM6Q29weUZyb21PcHRzKXtcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBjb3B5RnJvbSBvbiBub3QgY29ubmVjdGVkICcrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3RyZWFtID0gdGhpcy5fY2xpZW50LnF1ZXJ5KGNvcHlGcm9tKGAnQ09QWSAke29wdHMudGFibGV9ICR7b3B0cy5jb2x1bW5zP2AoJHtvcHRzLmNvbHVtbnMubWFwKG5hbWU9PnF1b3RlSWRlbnQobmFtZSkpLmpvaW4oJywnKX0pYDonJ30gRlJPTSBTVERJTmApKTtcclxuICAgICAgICBpZihvcHRzLmRvbmUpe1xyXG4gICAgICAgICAgICBzdHJlYW0ub24oJ2Vycm9yJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlbmQnLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihvcHRzLnN0cmVhbSl7XHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICBvcHRzLnN0cmVhbS5vbignZXJyb3InLCBvcHRzLmRvbmUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wdHMuc3RyZWFtLnBpcGUoc3RyZWFtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgIH1cclxufVxyXG5cclxudmFyIHF1ZXJ5UmVzdWx0OnBnLlF1ZXJ5UmVzdWx0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHR7XHJcbiAgICByb3dDb3VudDpudW1iZXJcclxuICAgIGZpZWxkczp0eXBlb2YgcXVlcnlSZXN1bHQuZmllbGRzXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRDb21tYW5ke1xyXG4gICAgY29tbWFuZDpzdHJpbmcsIHJvd0NvdW50Om51bWJlclxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93IGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Ontba2V5OnN0cmluZ106YW55fVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0T25lUm93SWZFeGlzdHMgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICByb3c/Ontba2V5OnN0cmluZ106YW55fXxudWxsXHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBSZXN1bHRSb3dzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93czp7W2tleTpzdHJpbmddOmFueX1bXVxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0VmFsdWUgZXh0ZW5kcyBSZXN1bHR7XHJcbiAgICB2YWx1ZTphbnlcclxufVxyXG4vLyBleHBvcnQgaW50ZXJmYWNlIFJlc3VsdEdlbmVyaWMgZXh0ZW5kcyBSZXN1bHRWYWx1ZSwgUmVzdWx0Um93cywgUmVzdWx0T25lUm93SWZFeGlzdHMsIFJlc3VsdE9uZVJvdywgUmVzdWx0e31cclxuZXhwb3J0IHR5cGUgUmVzdWx0R2VuZXJpYyA9IFJlc3VsdFZhbHVlfFJlc3VsdFJvd3N8UmVzdWx0T25lUm93SWZFeGlzdHN8UmVzdWx0T25lUm93fFJlc3VsdHxSZXN1bHRDb21tYW5kXHJcblxyXG4vKlxyXG5mdW5jdGlvbiBidWlsZFF1ZXJ5Q291bnRlckFkYXB0ZXIoXHJcbiAgICBtaW5Db3VudFJvdzpudW1iZXIsIFxyXG4gICAgbWF4Q291bnRSb3c6bnVtYmVyLCBcclxuICAgIGV4cGVjdFRleHQ6c3RyaW5nLCBcclxuICAgIGNhbGxiYWNrT3RoZXJDb250cm9sPzoocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0R2VuZXJpYyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWRcclxuKXtcclxuICAgIHJldHVybiBmdW5jdGlvbiBxdWVyeUNvdW50ZXJBZGFwdGVyKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpeyBcclxuICAgICAgICBpZihyZXN1bHQucm93cy5sZW5ndGg8bWluQ291bnRSb3cgfHwgcmVzdWx0LnJvd3MubGVuZ3RoPm1heENvdW50Um93ICl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKCdxdWVyeSBleHBlY3RzICcrZXhwZWN0VGV4dCsnIGFuZCBvYnRhaW5zICcrcmVzdWx0LnJvd3MubGVuZ3RoKycgcm93cycpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSc1NDAxMSEnO1xyXG4gICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgaWYoY2FsbGJhY2tPdGhlckNvbnRyb2wpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tPdGhlckNvbnRyb2wocmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ub3RoZXJ9ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7cm93OnJvd3NbMF0sIC4uLm90aGVyfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcbiovXHJcblxyXG50eXBlIE5vdGljZSA9IHN0cmluZztcclxuXHJcbmNsYXNzIFF1ZXJ5e1xyXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSBfcXVlcnk6cGcuUXVlcnksIHB1YmxpYyBjbGllbnQ6Q2xpZW50LCBwcml2YXRlIF9pbnRlcm5hbENsaWVudDpwZy5DbGllbnR8cGcuUG9vbENsaWVudCl7XHJcbiAgICB9XHJcbiAgICBvbk5vdGljZShjYWxsYmFja05vdGljZUNvbnN1bWVyOihub3RpY2U6Tm90aWNlKT0+dm9pZCk6UXVlcnl7XHJcbiAgICAgICAgdmFyIHEgPSB0aGlzO1xyXG4gICAgICAgIHZhciBub3RpY2VDYWxsYmFjaz1mdW5jdGlvbihub3RpY2U6Tm90aWNlKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFISBMQUNLUyBvZiBhY3RpdmVRdWVyeVxyXG4gICAgICAgICAgICBpZihxLl9pbnRlcm5hbENsaWVudC5hY3RpdmVRdWVyeT09cS5fcXVlcnkpe1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2tOb3RpY2VDb25zdW1lcihub3RpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdub3RpY2UnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgdGhpcy5faW50ZXJuYWxDbGllbnQub24oJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIHZhciByZW1vdmVOb3RpY2VDYWxsYmFjaz1mdW5jdGlvbiByZW1vdmVOb3RpY2VDYWxsYmFjaygpe1xyXG4gICAgICAgICAgICBxLl9pbnRlcm5hbENsaWVudC5yZW1vdmVMaXN0ZW5lcignbm90aWNlJyxub3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX3F1ZXJ5Lm9uKCdlbmQnLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZXJyb3InLHJlbW92ZU5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcbiAgICBwcml2YXRlIF9leGVjdXRlPFRSIGV4dGVuZHMgUmVzdWx0R2VuZXJpYz4oXHJcbiAgICAgICAgYWRhcHRlckNhbGxiYWNrOm51bGx8KChyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpUUik9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk9PnZvaWQpLFxyXG4gICAgICAgIGNhbGxiYWNrRm9yRWFjaFJvdz86KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPiwgXHJcbiAgICApOlByb21pc2U8VFI+e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8VFI+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlcnJvcicsZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICAgICAgICAgIGxvZygnLS1FUlJPUiEgJytlcnIuY29kZSsnLCAnK2Vyci5tZXNzYWdlLCAnRVJST1InKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAub24oJ3JvdycpIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSFcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ3JvdycsZnVuY3Rpb24ocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpe1xyXG4gICAgICAgICAgICAgICAgaWYoY2FsbGJhY2tGb3JFYWNoUm93KXtcclxuICAgICAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocm93KSwgJ1JPVycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3cocm93LCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBhZGRSb3cgb21taXRlZCBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmFkZFJvdyhyb3cpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcS5fcXVlcnkub24oJ2VuZCcsZnVuY3Rpb24ocmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFZFUiBTSSBFU1RPIEVTIE5FQ0VTQVJJT1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdWx0LmNsaWVudCA9IHEuY2xpZW50O1xyXG4gICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocmVzdWx0LnJvd3MpLCAnUkVTVUxUJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZihhZGFwdGVyQ2FsbGJhY2spe1xyXG4gICAgICAgICAgICAgICAgICAgIGFkYXB0ZXJDYWxsYmFjayhyZXN1bHQsIHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGFzeW5jIGZldGNoVW5pcXVlVmFsdWUoKTpQcm9taXNlPFJlc3VsdFZhbHVlPiAgeyBcclxuICAgICAgICB2YXIge3JvdywgLi4ucmVzdWx0fSA9IGF3YWl0IHRoaXMuZmV0Y2hVbmlxdWVSb3coKTtcclxuICAgICAgICBpZihyZXN1bHQuZmllbGRzLmxlbmd0aCE9PTEpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyBvbmUgZmllbGQgYW5kIG9idGFpbnMgJytyZXN1bHQuZmllbGRzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzU0VTExISc7XHJcbiAgICAgICAgICAgIHRocm93IGVycjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHt2YWx1ZTpyb3dbcmVzdWx0LmZpZWxkc1swXS5uYW1lXSwgLi4ucmVzdWx0fTtcclxuICAgIH1cclxuICAgIGZldGNoVW5pcXVlUm93KGFjY2VwdE5vUm93cz86Ym9vbGVhbik6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0T25lUm93KT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICBpZihyZXN1bHQucm93Q291bnQhPT0xICYmICghYWNjZXB0Tm9Sb3dzIHx8ICEhcmVzdWx0LnJvd0NvdW50KSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyBvbmUgcm93IGFuZCBvYnRhaW5zICcrcmVzdWx0LnJvd0NvdW50KTtcclxuICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgICAgIGVyci5jb2RlPSc1NDAxMSEnO1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIHtyb3dzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5yZXN0fSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZldGNoT25lUm93SWZFeGlzdHMoKTpQcm9taXNlPFJlc3VsdE9uZVJvdz4geyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFVuaXF1ZVJvdyh0cnVlKTtcclxuICAgIH1cclxuICAgIGZldGNoQWxsKCk6UHJvbWlzZTxSZXN1bHRSb3dzPntcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRSb3dzKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZXhlY3V0ZSgpOlByb21pc2U8UmVzdWx0Q29tbWFuZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdENvbW1hbmQpPT52b2lkLCBfcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKTp2b2lke1xyXG4gICAgICAgICAgICB2YXIge3Jvd3MsIG9pZCwgZmllbGRzLCAuLi5yZXN0fSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGFzeW5jIGZldGNoUm93QnlSb3coY2I6KHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KT0+UHJvbWlzZTx2b2lkPik6UHJvbWlzZTx2b2lkPnsgXHJcbiAgICAgICAgaWYoIShjYiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSl7XHJcbiAgICAgICAgICAgIHZhciBlcnI9bmV3IEVycm9yKCdmZXRjaFJvd0J5Um93IG11c3QgcmVjZWl2ZSBhIGNhbGxiYWNrIHRoYXQgZXhlY3V0ZXMgZm9yIGVhY2ggcm93Jyk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgZXJyLmNvZGU9JzM5MDA0ISc7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCB0aGlzLl9leGVjdXRlKG51bGwsIGNiKTtcclxuICAgIH1cclxuICAgIGFzeW5jIG9uUm93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoUm93QnlSb3coY2IpO1xyXG4gICAgfVxyXG4gICAgdGhlbigpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIHRoZW5lZCcpXHJcbiAgICB9XHJcbiAgICBjYXRjaCgpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IFF1ZXJ5IG11c3Qgbm90IGJlIGF3YWl0ZWQgbm9yIGNhdGNoZWQnKVxyXG4gICAgfVxyXG59O1xyXG5cclxuZXhwb3J0IHZhciBhbGxUeXBlcz1mYWxzZTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRBbGxUeXBlcygpe1xyXG4gICAgdmFyIFR5cGVTdG9yZSA9IHJlcXVpcmUoJ3R5cGUtc3RvcmUnKTtcclxuICAgIHZhciBEQVRFX09JRCA9IDEwODI7XHJcbiAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoREFURV9PSUQsIGZ1bmN0aW9uIHBhcnNlRGF0ZSh2YWwpe1xyXG4gICAgICAgcmV0dXJuIGJlc3RHbG9iYWxzLmRhdGUuaXNvKHZhbCk7XHJcbiAgICB9KTtcclxuICAgIGxpa2VBcihUeXBlU3RvcmUudHlwZSkuZm9yRWFjaChmdW5jdGlvbihfdHlwZURlZiwgdHlwZU5hbWUpe1xyXG4gICAgICAgIHZhciB0eXBlciA9IG5ldyBUeXBlU3RvcmUudHlwZVt0eXBlTmFtZV0oKTtcclxuICAgICAgICBpZih0eXBlci5wZ1NwZWNpYWxQYXJzZSl7XHJcbiAgICAgICAgICAgICh0eXBlci5wZ19PSURTfHxbdHlwZXIucGdfT0lEXSkuZm9yRWFjaChmdW5jdGlvbihPSUQ6bnVtYmVyKXtcclxuICAgICAgICAgICAgICAgIHBnVHlwZXMuc2V0VHlwZVBhcnNlcihPSUQsIGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVyLmZyb21TdHJpbmcodmFsKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbnZhciBwb29sczp7XHJcbiAgICBba2V5OnN0cmluZ106cGcuUG9vbFxyXG59ID0ge31cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KGNvbm5lY3RQYXJhbWV0ZXJzOkNvbm5lY3RQYXJhbXMpe1xyXG4gICAgaWYoYWxsVHlwZXMpe1xyXG4gICAgICAgIHNldEFsbFR5cGVzKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcclxuICAgICAgICB2YXIgaWRDb25uZWN0UGFyYW1ldGVycyA9IEpTT04uc3RyaW5naWZ5KGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICB2YXIgcG9vbCA9IHBvb2xzW2lkQ29ubmVjdFBhcmFtZXRlcnNdfHxuZXcgcGcuUG9vbChjb25uZWN0UGFyYW1ldGVycyk7XHJcbiAgICAgICAgcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc10gPSBwb29sO1xyXG4gICAgICAgIHBvb2wuY29ubmVjdChmdW5jdGlvbihlcnIsIGNsaWVudCwgZG9uZSl7XHJcbiAgICAgICAgICAgIGlmKGVycil7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKG5ldyBDbGllbnQobnVsbCwgY2xpZW50LCBkb25lIC8qLCBET0lORyB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsZWFzZVRpbWVvdXQ6IGNoYW5naW5nKHBnUHJvbWlzZVN0cmljdC5kZWZhdWx0cy5yZWxlYXNlVGltZW91dCxjb25uZWN0UGFyYW1ldGVycy5yZWxlYXNlVGltZW91dHx8e30pXHJcbiAgICAgICAgICAgICAgICB9Ki8pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nTGFzdEVycm9yKG1lc3NhZ2U6c3RyaW5nLCBtZXNzYWdlVHlwZTpzdHJpbmcpOnZvaWR7XHJcbiAgICBpZihtZXNzYWdlVHlwZSl7XHJcbiAgICAgICAgaWYobWVzc2FnZVR5cGU9PSdFUlJPUicpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUEctRVJST1IgcGdQcm9taXNlU3RyaWN0LmxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lJyxsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQRy1FUlJPUicsbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGlmKGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKXtcclxuICAgICAgICAgICAgICAgIHZhciBsaW5lcz1bJ1BHLUVSUk9SICcrbWVzc2FnZV07XHJcbiAgICAgICAgICAgICAgICAvKmpzaGludCBmb3JpbjpmYWxzZSAqL1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBhdHRyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKFwiLS0tLS0tLSBcIithdHRyK1wiOlxcblwiK2xvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzW2F0dHJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUobG9nTGFzdEVycm9yLmluRmlsZU5hbWUsbGluZXMuam9pbignXFxuJykpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIyIGluIGxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzKXtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhhdHRyMiwgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cjJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOnRydWUgKi9cclxuICAgICAgICAgICAgICAgIC8qZXNsaW50IGd1YXJkLWZvci1pbjogMCovXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMgPSB7fTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbbWVzc2FnZVR5cGVdID0gbWVzc2FnZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lID0gJy4vbG9jYWwtc3FsLWVycm9yLmxvZyc7XHJcbmxvZ0xhc3RFcnJvci5yZWNlaXZlZE1lc3NhZ2VzPXt9IGFzIHtcclxuICAgIFtrZXk6c3RyaW5nXTpzdHJpbmdcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb29sQmFsYW5jZUNvbnRyb2woKXtcclxuICAgIHZhciBydGE6c3RyaW5nW109W107XHJcbiAgICBpZih0eXBlb2YgZGVidWcucG9vbCA9PT0gXCJvYmplY3RcIil7XHJcbiAgICAgICAgbGlrZUFyKGRlYnVnLnBvb2wpLmZvckVhY2goZnVuY3Rpb24ocG9vbCl7XHJcbiAgICAgICAgICAgIGlmKHBvb2wuY291bnQpe1xyXG4gICAgICAgICAgICAgICAgcnRhLnB1c2goJ3BnUHJvbWlzZVN0cmljdC5kZWJ1Zy5wb29sIHVuYmFsYW5jZWQgY29ubmVjdGlvbiAnK3V0aWwuaW5zcGVjdChwb29sKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBydGEuam9pbignXFxuJyk7XHJcbn07XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5wcm9jZXNzLm9uKCdleGl0JyxmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS53YXJuKHBvb2xCYWxhbmNlQ29udHJvbCgpKTtcclxufSk7XHJcbiJdfQ==