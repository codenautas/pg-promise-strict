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
        define(["require", "exports", "fs-extra", "pg", "pg-copy-streams", "util", "like-ar", "best-globals", "stream"], factory);
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
    const stream_1 = require("stream");
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
        copyFromInlineDumpStream(opts) {
            if (!this._client || !this.connected) {
                /* istanbul ignore next */
                throw new Error('pg-promise-strict: atempt to copyFrom on not connected ' + !this._client + ',' + !this.connected);
            }
            var stream = this._client.query(pg_copy_streams_1.from(`COPY ${opts.table} ${opts.columns ? `(${opts.columns.map(name => quoteIdent(name)).join(',')})` : ''} FROM STDIN`));
            if (opts.done) {
                stream.on('error', opts.done);
                stream.on('end', opts.done);
                stream.on('close', opts.done);
            }
            if (opts.inStream != null) {
                if (opts.done) {
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
                    if (bs)
                        return '\\\\';
                    throw new Error("formatNullableToInlineDump error parsing");
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
            var { inStream } = opts, rest = __rest(opts, ["inStream"]);
            inStream.pipe(transform);
            return this.copyFromInlineDumpStream(Object.assign({ inStream: transform }, rest));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGctcHJvbWlzZS1zdHJpY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3BnLXByb21pc2Utc3RyaWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBLFlBQVksQ0FBQzs7SUFFYiwrQkFBK0I7SUFDL0IseUJBQXlCO0lBQ3pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFFekIscURBQWlEO0lBQ2pELDZCQUE2QjtJQUM3QixrQ0FBa0M7SUFDbEMsNENBQTRDO0lBQzVDLG1DQUF5QztJQUU5QixRQUFBLEtBQUssR0FJZCxFQUFFLENBQUM7SUFFTSxRQUFBLFFBQVEsR0FBQztRQUNoQixjQUFjLEVBQUMsRUFBQyxRQUFRLEVBQUMsS0FBSyxFQUFFLFVBQVUsRUFBQyxNQUFNLEVBQUM7S0FDckQsQ0FBQztJQUVGLDJCQUEyQjtJQUMzQixTQUFTLEtBQUssQ0FBQyxRQUFlLEVBQUUsS0FBWSxJQUFFLENBQUM7SUFFcEMsUUFBQSxHQUFHLEdBQXFDLEtBQUssQ0FBQztJQUV6RCxTQUFnQixVQUFVLENBQUMsSUFBVztRQUNsQyxJQUFHLE9BQU8sSUFBSSxLQUFHLFFBQVEsRUFBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsT0FBTyxHQUFHLEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUMsR0FBRyxDQUFDO0lBQzVDLENBQUM7SUFMRCxnQ0FLQztJQUFBLENBQUM7SUFFRixTQUFnQixjQUFjLENBQUMsV0FBb0I7UUFDL0MsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVMsVUFBVSxJQUFHLE9BQU8sVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFGRCx3Q0FFQztJQUFB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TyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7cUJBQzVEO29CQUNELHNCQUFzQjtvQkFDdEIsMEJBQTBCO2lCQUM3QjtnQkFDRCxZQUFZLENBQUMsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO2FBQ3RDO2lCQUFJO2dCQUNELFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxPQUFPLENBQUM7YUFDeEQ7U0FDSjtJQUNMLENBQUM7SUEzQkQsb0NBMkJDO0lBRUQsWUFBWSxDQUFDLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQztJQUNsRCxZQUFZLENBQUMsZ0JBQWdCLEdBQUMsRUFFN0IsQ0FBQztJQUVGLFNBQWdCLGtCQUFrQjtRQUM5QixJQUFJLEdBQUcsR0FBVSxFQUFFLENBQUM7UUFDcEIsSUFBRyxPQUFPLGFBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFDO1lBQzlCLE1BQU0sQ0FBQyxhQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSTtnQkFDcEMsSUFBRyxJQUFJLENBQUMsS0FBSyxFQUFDO29CQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsbURBQW1ELEdBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNwRjtZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ047UUFDRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQVZELGdEQVVDO0lBQUEsQ0FBQztJQUVGLDBCQUEwQjtJQUMxQixPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBQztRQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCAqIGFzIHBnIGZyb20gJ3BnJztcclxuY29uc3QgcGdUeXBlcyA9IHBnLnR5cGVzO1xyXG5cclxuaW1wb3J0IHtmcm9tIGFzIGNvcHlGcm9tfSBmcm9tICdwZy1jb3B5LXN0cmVhbXMnO1xyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJ3V0aWwnO1xyXG5pbXBvcnQgKiBhcyBsaWtlQXIgZnJvbSAnbGlrZS1hcic7XHJcbmltcG9ydCAqIGFzIGJlc3RHbG9iYWxzIGZyb20gJ2Jlc3QtZ2xvYmFscyc7XHJcbmltcG9ydCB7U3RyZWFtLCBUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XHJcblxyXG5leHBvcnQgdmFyIGRlYnVnOntcclxuICAgIHBvb2w/OnRydWV8e1xyXG4gICAgICAgIFtrZXk6c3RyaW5nXTp7IGNvdW50Om51bWJlciwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCkme3NlY3JldEtleTpzdHJpbmd9fVxyXG4gICAgfVxyXG59PXt9O1xyXG5cclxuZXhwb3J0IHZhciBkZWZhdWx0cz17XHJcbiAgICByZWxlYXNlVGltZW91dDp7aW5hY3RpdmU6NjAwMDAsIGNvbm5lY3Rpb246NjAwMDAwfVxyXG59O1xyXG5cclxuLyogaW5zdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmZ1bmN0aW9uIG5vTG9nKF9tZXNzYWdlOnN0cmluZywgX3R5cGU6c3RyaW5nKXt9XHJcblxyXG5leHBvcnQgdmFyIGxvZzoobWVzc2FnZTpzdHJpbmcsIHR5cGU6c3RyaW5nKT0+dm9pZD1ub0xvZztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50KG5hbWU6c3RyaW5nKXtcclxuICAgIGlmKHR5cGVvZiBuYW1lIT09XCJzdHJpbmdcIil7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zYW5lIG5hbWVcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJ1wiJytuYW1lLnJlcGxhY2UoL1wiL2csICdcIlwiJykrJ1wiJztcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUlkZW50TGlzdChvYmplY3ROYW1lczpzdHJpbmdbXSl7XHJcbiAgICByZXR1cm4gb2JqZWN0TmFtZXMubWFwKGZ1bmN0aW9uKG9iamVjdE5hbWUpeyByZXR1cm4gcXVvdGVJZGVudChvYmplY3ROYW1lKTsgfSkuam9pbignLCcpO1xyXG59O1xyXG5cclxuZXhwb3J0IHR5cGUgQW55UXVvdGVhYmxlID0gc3RyaW5nfG51bWJlcnxEYXRlfHtpc1JlYWxEYXRlOmJvb2xlYW4sIHRvWW1kOigpPT5zdHJpbmd9fHt0b1Bvc3RncmVzOigpPT5zdHJpbmd9fHt0b1N0cmluZzooKT0+c3RyaW5nfTtcclxuZXhwb3J0IGZ1bmN0aW9uIHF1b3RlTnVsbGFibGUoYW55VmFsdWU6bnVsbHxBbnlRdW90ZWFibGUpe1xyXG4gICAgaWYoYW55VmFsdWU9PW51bGwpe1xyXG4gICAgICAgIHJldHVybiAnbnVsbCc7XHJcbiAgICB9XHJcbiAgICB2YXIgdGV4dDpzdHJpbmdcclxuICAgIGlmKHR5cGVvZiBhbnlWYWx1ZT09PVwic3RyaW5nXCIpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZTtcclxuICAgIH1lbHNlIGlmKCEoYW55VmFsdWUgaW5zdGFuY2VvZiBPYmplY3QpKXtcclxuICAgICAgICB0ZXh0PWFueVZhbHVlLnRvU3RyaW5nKCk7XHJcbiAgICB9ZWxzZSBpZignaXNSZWFsRGF0ZScgaW4gYW55VmFsdWUgJiYgYW55VmFsdWUuaXNSZWFsRGF0ZSl7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvWW1kKCk7XHJcbiAgICB9ZWxzZSBpZihhbnlWYWx1ZSBpbnN0YW5jZW9mIERhdGUpe1xyXG4gICAgICAgIHRleHQgPSBhbnlWYWx1ZS50b0lTT1N0cmluZygpO1xyXG4gICAgfWVsc2UgaWYoJ3RvUG9zdGdyZXMnIGluIGFueVZhbHVlICYmIGFueVZhbHVlLnRvUG9zdGdyZXMgaW5zdGFuY2VvZiBGdW5jdGlvbil7XHJcbiAgICAgICAgdGV4dCA9IGFueVZhbHVlLnRvUG9zdGdyZXMoKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHRleHQgPSBKU09OLnN0cmluZ2lmeShhbnlWYWx1ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gXCInXCIrdGV4dC5yZXBsYWNlKC8nL2csXCInJ1wiKStcIidcIjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBxdW90ZUxpdGVyYWwoYW55VmFsdWU6QW55UXVvdGVhYmxlKXtcclxuICAgIGlmKGFueVZhbHVlPT1udWxsKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJudWxsIGluIHF1b3RlTGl0ZXJhbFwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBxdW90ZU51bGxhYmxlKGFueVZhbHVlKTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhZGFwdFBhcmFtZXRlclR5cGVzKHBhcmFtZXRlcnM/OmFueVtdKXtcclxuICAgIC8vIEB0cy1pZ25vcmUgXHJcbiAgICBpZihwYXJhbWV0ZXJzPT1udWxsKXtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXJhbWV0ZXJzLm1hcChmdW5jdGlvbih2YWx1ZSl7XHJcbiAgICAgICAgaWYodmFsdWUgJiYgdmFsdWUudHlwZVN0b3JlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnRvTGl0ZXJhbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbmV4cG9ydCB2YXIgZWFzeTpib29sZWFuPXRydWU7IC8vIGRlcHJlY2F0ZWQhXHJcblxyXG5leHBvcnQgdHlwZSBDb25uZWN0UGFyYW1zPXtcclxuICAgIG1vdG9yPzpcInBvc3RncmVzXCJcclxuICAgIGRhdGFiYXNlPzpzdHJpbmdcclxuICAgIHVzZXI/OnN0cmluZ1xyXG4gICAgcGFzc3dvcmQ/OnN0cmluZ1xyXG4gICAgcG9ydD86bnVtYmVyXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIENvcHlGcm9tT3B0cz17aW5TdHJlYW06U3RyZWFtLCB0YWJsZTpzdHJpbmcsY29sdW1ucz86c3RyaW5nW10sZG9uZT86KGVycj86RXJyb3IpPT52b2lkfVxyXG5leHBvcnQgdHlwZSBCdWxrSW5zZXJ0UGFyYW1zPXtzY2hlbWE/OnN0cmluZyx0YWJsZTpzdHJpbmcsY29sdW1uczpzdHJpbmdbXSxyb3dzOltdW10sIG9uZXJyb3I/OihlcnI6RXJyb3IsIHJvdzpbXSk9PnZvaWR9XHJcblxyXG4vKiogVE9ETzogYW55IGVuIG9wdHMgKi9cclxuZXhwb3J0IGNsYXNzIENsaWVudHtcclxuICAgIHByaXZhdGUgY29ubmVjdGVkOm51bGx8e1xyXG4gICAgICAgIGxhc3RPcGVyYXRpb25UaW1lc3RhbXA6bnVtYmVyLFxyXG4gICAgICAgIGxhc3RDb25uZWN0aW9uVGltZXN0YW1wOm51bWJlclxyXG4gICAgfT1udWxsO1xyXG4gICAgcHJpdmF0ZSBmcm9tUG9vbDpib29sZWFuPWZhbHNlO1xyXG4gICAgcHJpdmF0ZSBwb3N0Q29ubmVjdCgpe1xyXG4gICAgICAgIHZhciBub3dUcz1uZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICB0aGlzLmNvbm5lY3RlZCA9IHtcclxuICAgICAgICAgICAgbGFzdE9wZXJhdGlvblRpbWVzdGFtcDpub3dUcyxcclxuICAgICAgICAgICAgbGFzdENvbm5lY3Rpb25UaW1lc3RhbXA6bm93VHNcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcml2YXRlIF9jbGllbnQ6KHBnLkNsaWVudHxwZy5Qb29sQ2xpZW50KSZ7c2VjcmV0S2V5OnN0cmluZ318bnVsbDtcclxuICAgIGNvbnN0cnVjdG9yKGNvbm5PcHRzOkNvbm5lY3RQYXJhbXN8bnVsbCwgY2xpZW50OihwZy5DbGllbnR8cGcuUG9vbENsaWVudCksIHByaXZhdGUgX2RvbmU6KCk9PnZvaWQsIF9vcHRzPzphbnkpe1xyXG4gICAgICAgIHRoaXMuX2NsaWVudCA9IGNsaWVudCBhcyAocGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpJntzZWNyZXRLZXk6c3RyaW5nfTtcclxuICAgICAgICBpZihjb25uT3B0cz09bnVsbCl7XHJcbiAgICAgICAgICAgIHRoaXMuZnJvbVBvb2w9dHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAvKiBET0lOR1xyXG4gICAgICAgICAgICBpZihzZWxmLm9wdHMudGltZW91dENvbnRyb2xsZXIpe1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsVGltZW91dChzZWxmLnRpbWVvdXRDb250cm9sbGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWxmLnRpbWVvdXRDb250cm9sbGVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCd6enp6enp6enp6enp6JyxuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdE9wZXJhdGlvblRpbWVzdGFtcCwgc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlKVxyXG4gICAgICAgICAgICAgICAgaWYobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzZWxmLmxhc3RPcGVyYXRpb25UaW1lc3RhbXAgID4gc2VsZi5vcHRzLnJlbGVhc2VUaW1lb3V0LmluYWN0aXZlXHJcbiAgICAgICAgICAgICAgICB8fCBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHNlbGYubGFzdENvbm5lY3Rpb25UaW1lc3RhbXAgPiBzZWxmLm9wdHMucmVsZWFzZVRpbWVvdXQuY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgKXtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmRvbmUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxNYXRoLm1pbigxMDAwLHNlbGYub3B0cy5yZWxlYXNlVGltZW91dC5pbmFjdGl2ZS80KSk7XHJcbiAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGlmKGRlYnVnLnBvb2wpe1xyXG4gICAgICAgICAgICAgICAgaWYoZGVidWcucG9vbD09PXRydWUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2w9e307XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighKHRoaXMuX2NsaWVudC5zZWNyZXRLZXkgaW4gZGVidWcucG9vbCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnLnBvb2xbdGhpcy5fY2xpZW50LnNlY3JldEtleV0gPSB7Y2xpZW50OnRoaXMuX2NsaWVudCwgY291bnQ6MH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBkZWJ1Zy5wb29sW3RoaXMuX2NsaWVudC5zZWNyZXRLZXldLmNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgLy8gcGdQcm9taXNlU3RyaWN0LmxvZygnbmV3IENsaWVudCcpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQgPSBuZXcgcGcuQ2xpZW50KGNvbm5PcHRzKSBhcyBwZy5DbGllbnQme3NlY3JldEtleTpzdHJpbmd9O1xyXG4gICAgICAgICAgICB0aGlzLl9jbGllbnQuc2VjcmV0S2V5ID0gdGhpcy5fY2xpZW50LnNlY3JldEtleXx8J3NlY3JldF8nK01hdGgucmFuZG9tKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29ubmVjdCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgY29ubmVjdCBjbGllbnQgZnJvbSBwb29sXCIpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpe1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdjbGllbnQuY29ubmVjdCBtdXN0IG5vIHJlY2VpdmUgcGFyYW1ldGVycywgaXQgcmV0dXJucyBhIFByb21pc2UnKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNsaWVudCA9IHRoaXMuX2NsaWVudDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihlcnIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wb3N0Q29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGVuZCgpe1xyXG4gICAgICAgIGlmKHRoaXMuZnJvbVBvb2wpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogTXVzdCBub3QgZW5kIGNsaWVudCBmcm9tIHBvb2xcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYodGhpcy5fY2xpZW50IGluc3RhbmNlb2YgcGcuQ2xpZW50KXtcclxuICAgICAgICAgICAgdGhpcy5fY2xpZW50LmVuZCgpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogbGFjayBvZiBDbGllbnQuX2NsaWVudFwiKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgZG9uZSgpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdCBjbGllbnQgYWxyZWFkeSBkb25lXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihkZWJ1Zy5wb29sKXtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBERUJVR0dJTkdcclxuICAgICAgICAgICAgZGVidWcucG9vbFt0aGlzLl9jbGllbnQuc2VjcmV0S2V5XS5jb3VudC0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgY2xpZW50VG9Eb25lPXRoaXMuX2NsaWVudDtcclxuICAgICAgICB0aGlzLl9jbGllbnQ9bnVsbDtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIGFyZ3VtZW50cyBBcnJheSBsaWtlIGFuZCBhcHBseWFibGVcclxuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZS5hcHBseShjbGllbnRUb0RvbmUsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBxdWVyeShzcWw6c3RyaW5nKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsOnN0cmluZywgcGFyYW1zOmFueVtdKTpRdWVyeVxyXG4gICAgcXVlcnkoc3FsT2JqZWN0Ont0ZXh0OnN0cmluZywgdmFsdWVzOmFueVtdfSk6UXVlcnlcclxuICAgIHF1ZXJ5KCk6UXVlcnl7XHJcbiAgICAgICAgaWYoIXRoaXMuY29ubmVjdGVkIHx8ICF0aGlzLl9jbGllbnQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZy1wcm9taXNlLXN0cmljdDogcXVlcnkgaW4gbm90IGNvbm5lY3RlZFwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbm5lY3RlZC5sYXN0T3BlcmF0aW9uVGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgdmFyIHF1ZXJ5QXJndW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcXVlcnlUZXh0O1xyXG4gICAgICAgIHZhciBxdWVyeVZhbHVlcz1udWxsO1xyXG4gICAgICAgIGlmKHR5cGVvZiBxdWVyeUFyZ3VtZW50c1swXSA9PT0gJ3N0cmluZycpe1xyXG4gICAgICAgICAgICBxdWVyeVRleHQgPSBxdWVyeUFyZ3VtZW50c1swXTtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBxdWVyeUFyZ3VtZW50c1sxXSA9IGFkYXB0UGFyYW1ldGVyVHlwZXMocXVlcnlBcmd1bWVudHNbMV18fG51bGwpO1xyXG4gICAgICAgIH1lbHNlIGlmKHF1ZXJ5QXJndW1lbnRzWzBdIGluc3RhbmNlb2YgT2JqZWN0KXtcclxuICAgICAgICAgICAgcXVlcnlUZXh0ID0gcXVlcnlBcmd1bWVudHNbMF0udGV4dDtcclxuICAgICAgICAgICAgcXVlcnlWYWx1ZXMgPSBhZGFwdFBhcmFtZXRlclR5cGVzKHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlc3x8bnVsbCk7XHJcbiAgICAgICAgICAgIHF1ZXJ5QXJndW1lbnRzWzBdLnZhbHVlcyA9IHF1ZXJ5VmFsdWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICB2YXIgc3FsPXF1ZXJ5VGV4dDtcclxuICAgICAgICAgICAgbG9nKCctLS0tLS0nLCctLS0tLS0nKTtcclxuICAgICAgICAgICAgaWYocXVlcnlWYWx1ZXMpe1xyXG4gICAgICAgICAgICAgICAgbG9nKCdgJytzcWwrJ1xcbmAnLCdRVUVSWS1QJyk7XHJcbiAgICAgICAgICAgICAgICBsb2coJy0tICcrSlNPTi5zdHJpbmdpZnkocXVlcnlWYWx1ZXMpLCdRVUVSWS1BJyk7XHJcbiAgICAgICAgICAgICAgICBxdWVyeVZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlOmFueSwgaTpudW1iZXIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHNxbD1zcWwucmVwbGFjZShuZXcgUmVnRXhwKCdcXFxcJCcrKGkrMSkrJ1xcXFxiJyksIHR5cGVvZiB2YWx1ZSA9PSBcIm51bWJlclwiIHx8IHR5cGVvZiB2YWx1ZSA9PSBcImJvb2xlYW5cIj92YWx1ZTpxdW90ZU51bGxhYmxlKHZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2coc3FsKyc7JywnUVVFUlknKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJldHVybmVkUXVlcnkgPSB0aGlzLl9jbGllbnQucXVlcnkobmV3IHBnLlF1ZXJ5KHF1ZXJ5QXJndW1lbnRzWzBdLCBxdWVyeUFyZ3VtZW50c1sxXSkpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUXVlcnkocmV0dXJuZWRRdWVyeSwgdGhpcywgdGhpcy5fY2xpZW50KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBleGVjdXRlU2VudGVuY2VzKHNlbnRlbmNlczpzdHJpbmdbXSl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGV4ZWN1dGVTZW50ZW5jZXMgb24gbm90IGNvbm5lY3RlZCAnKyF0aGlzLl9jbGllbnQrJywnKyF0aGlzLmNvbm5lY3RlZClcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNkcDpQcm9taXNlPFJlc3VsdENvbW1hbmR8dm9pZD4gPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICBzZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSl7XHJcbiAgICAgICAgICAgIGNkcCA9IGNkcC50aGVuKGFzeW5jIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICBpZighc2VudGVuY2UudHJpbSgpKXtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHNlbGYucXVlcnkoc2VudGVuY2UpLmV4ZWN1dGUoKS5jYXRjaChmdW5jdGlvbihlcnI6RXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdFUlJPUicsZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhzZW50ZW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjZHA7XHJcbiAgICB9XHJcbiAgICBhc3luYyBleGVjdXRlU3FsU2NyaXB0KGZpbGVOYW1lOnN0cmluZyl7XHJcbiAgICAgICAgdmFyIHNlbGY9dGhpcztcclxuICAgICAgICBpZighdGhpcy5fY2xpZW50IHx8ICF0aGlzLmNvbm5lY3RlZCl7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncGctcHJvbWlzZS1zdHJpY3Q6IGF0ZW1wdCB0byBleGVjdXRlU3FsU2NyaXB0IG9uIG5vdCBjb25uZWN0ZWQgJyshdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZShmaWxlTmFtZSwndXRmLTgnKS50aGVuKGZ1bmN0aW9uKGNvbnRlbnQpe1xyXG4gICAgICAgICAgICB2YXIgc2VudGVuY2VzID0gY29udGVudC5zcGxpdCgvXFxyP1xcblxccj9cXG4vKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNlbGYuZXhlY3V0ZVNlbnRlbmNlcyhzZW50ZW5jZXMpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYnVsa0luc2VydChwYXJhbXM6QnVsa0luc2VydFBhcmFtcyk6UHJvbWlzZTx2b2lkPntcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYoIXRoaXMuX2NsaWVudCB8fCAhdGhpcy5jb25uZWN0ZWQpe1xyXG4gICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BnLXByb21pc2Utc3RyaWN0OiBhdGVtcHQgdG8gYnVsa0luc2VydCBvbiBub3QgY29ubmVjdGVkICcrIXRoaXMuX2NsaWVudCsnLCcrIXRoaXMuY29ubmVjdGVkKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3FsID0gXCJJTlNFUlQgSU5UTyBcIisocGFyYW1zLnNjaGVtYT9xdW90ZUlkZW50KHBhcmFtcy5zY2hlbWEpKycuJzonJykrXHJcbiAgICAgICAgICAgIHF1b3RlSWRlbnQocGFyYW1zLnRhYmxlKStcIiAoXCIrXHJcbiAgICAgICAgICAgIHBhcmFtcy5jb2x1bW5zLm1hcChxdW90ZUlkZW50KS5qb2luKCcsICcpK1wiKSBWQUxVRVMgKFwiK1xyXG4gICAgICAgICAgICBwYXJhbXMuY29sdW1ucy5tYXAoZnVuY3Rpb24oX25hbWU6c3RyaW5nLCBpX25hbWU6bnVtYmVyKXsgcmV0dXJuICckJysoaV9uYW1lKzEpOyB9KStcIilcIjtcclxuICAgICAgICB2YXIgaW5zZXJ0T25lUm93QW5kQ29udGludWVJbnNlcnRpbmcgPSBmdW5jdGlvbiBpbnNlcnRPbmVSb3dBbmRDb250aW51ZUluc2VydGluZyhpX3Jvd3M6bnVtYmVyKTpQcm9taXNlPHZvaWQ+e1xyXG4gICAgICAgICAgICBpZihpX3Jvd3M8cGFyYW1zLnJvd3MubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnF1ZXJ5KHNxbCwgcGFyYW1zLnJvd3NbaV9yb3dzXSkuZXhlY3V0ZSgpLmNhdGNoKGZ1bmN0aW9uKGVycjpFcnJvcil7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYocGFyYW1zLm9uZXJyb3Ipe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMub25lcnJvcihlcnIsIHBhcmFtcy5yb3dzW2lfcm93c10pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnNlcnRPbmVSb3dBbmRDb250aW51ZUluc2VydGluZyhpX3Jvd3MrMSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gaW5zZXJ0T25lUm93QW5kQ29udGludWVJbnNlcnRpbmcoMCk7XHJcbiAgICB9XHJcbiAgICBjb3B5RnJvbUlubGluZUR1bXBTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIGlmKCF0aGlzLl9jbGllbnQgfHwgIXRoaXMuY29ubmVjdGVkKXtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwZy1wcm9taXNlLXN0cmljdDogYXRlbXB0IHRvIGNvcHlGcm9tIG9uIG5vdCBjb25uZWN0ZWQgJyshdGhpcy5fY2xpZW50KycsJyshdGhpcy5jb25uZWN0ZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzdHJlYW0gPSB0aGlzLl9jbGllbnQucXVlcnkoY29weUZyb20oYENPUFkgJHtvcHRzLnRhYmxlfSAke29wdHMuY29sdW1ucz9gKCR7b3B0cy5jb2x1bW5zLm1hcChuYW1lPT5xdW90ZUlkZW50KG5hbWUpKS5qb2luKCcsJyl9KWA6Jyd9IEZST00gU1RESU5gKSk7XHJcbiAgICAgICAgaWYob3B0cy5kb25lKXtcclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIHN0cmVhbS5vbignZW5kJywgb3B0cy5kb25lKTtcclxuICAgICAgICAgICAgc3RyZWFtLm9uKCdjbG9zZScsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKG9wdHMuaW5TdHJlYW0gIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIGlmKG9wdHMuZG9uZSl7XHJcbiAgICAgICAgICAgICAgICBvcHRzLmluU3RyZWFtLm9uKCdlcnJvcicsIG9wdHMuZG9uZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3B0cy5pblN0cmVhbS5waXBlKHN0cmVhbSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzdHJlYW07XHJcbiAgICB9XHJcbiAgICBmb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcChudWxsYWJsZTphbnkpe1xyXG4gICAgICAgIGlmKG51bGxhYmxlPT1udWxsKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZSBpZih0eXBlb2YgbnVsbGFibGUgPT09IFwibnVtYmVyXCIgJiYgaXNOYU4obnVsbGFibGUpKXtcclxuICAgICAgICAgICAgcmV0dXJuICdcXFxcTidcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxhYmxlLnRvU3RyaW5nKCkucmVwbGFjZSgvKFxccil8KFxcbil8KFxcdCl8KFxcXFwpL2csIFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oX2FsbDpzdHJpbmcsYnNyOnN0cmluZyxic246c3RyaW5nLGJzdDpzdHJpbmcsYnM6c3RyaW5nKXtcclxuICAgICAgICAgICAgICAgICAgICBpZihic3IpIHJldHVybiAnXFxcXHInO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJzbikgcmV0dXJuICdcXFxcbic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYnN0KSByZXR1cm4gJ1xcXFx0JztcclxuICAgICAgICAgICAgICAgICAgICBpZihicykgcmV0dXJuICdcXFxcXFxcXCc7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZm9ybWF0TnVsbGFibGVUb0lubGluZUR1bXAgZXJyb3IgcGFyc2luZ1wiKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvcHlGcm9tQXJyYXlTdHJlYW0ob3B0czpDb3B5RnJvbU9wdHMpe1xyXG4gICAgICAgIHZhciBjID0gdGhpcztcclxuICAgICAgICB2YXIgdHJhbnNmb3JtID0gbmV3IFRyYW5zZm9ybSh7XHJcbiAgICAgICAgICAgIHdyaXRhYmxlT2JqZWN0TW9kZTp0cnVlLFxyXG4gICAgICAgICAgICByZWFkYWJsZU9iamVjdE1vZGU6dHJ1ZSxcclxuICAgICAgICAgICAgdHJhbnNmb3JtKGFycmF5Q2h1bms6YW55W10sIF9lbmNvZGluZywgbmV4dCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnB1c2goYXJyYXlDaHVuay5tYXAoeD0+Yy5mb3JtYXROdWxsYWJsZVRvSW5saW5lRHVtcCh4KSkuam9pbignXFx0JykrJ1xcbicpXHJcbiAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGZsdXNoKG5leHQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wdXNoKCdcXFxcLlxcbicpO1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIHtpblN0cmVhbSwgLi4ucmVzdH0gPSBvcHRzO1xyXG4gICAgICAgIGluU3RyZWFtLnBpcGUodHJhbnNmb3JtKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5jb3B5RnJvbUlubGluZUR1bXBTdHJlYW0oe2luU3RyZWFtOnRyYW5zZm9ybSwgLi4ucmVzdH0pXHJcbiAgICB9XHJcbn1cclxuXHJcbnZhciBxdWVyeVJlc3VsdDpwZy5RdWVyeVJlc3VsdDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0e1xyXG4gICAgcm93Q291bnQ6bnVtYmVyXHJcbiAgICBmaWVsZHM6dHlwZW9mIHF1ZXJ5UmVzdWx0LmZpZWxkc1xyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Q29tbWFuZHtcclxuICAgIGNvbW1hbmQ6c3RyaW5nLCByb3dDb3VudDpudW1iZXJcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvdyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvdzp7W2tleTpzdHJpbmddOmFueX1cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdE9uZVJvd0lmRXhpc3RzIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgcm93Pzp7W2tleTpzdHJpbmddOmFueX18bnVsbFxyXG59XHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVzdWx0Um93cyBleHRlbmRzIFJlc3VsdHtcclxuICAgIHJvd3M6e1trZXk6c3RyaW5nXTphbnl9W11cclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3VsdFZhbHVlIGV4dGVuZHMgUmVzdWx0e1xyXG4gICAgdmFsdWU6YW55XHJcbn1cclxuLy8gZXhwb3J0IGludGVyZmFjZSBSZXN1bHRHZW5lcmljIGV4dGVuZHMgUmVzdWx0VmFsdWUsIFJlc3VsdFJvd3MsIFJlc3VsdE9uZVJvd0lmRXhpc3RzLCBSZXN1bHRPbmVSb3csIFJlc3VsdHt9XHJcbmV4cG9ydCB0eXBlIFJlc3VsdEdlbmVyaWMgPSBSZXN1bHRWYWx1ZXxSZXN1bHRSb3dzfFJlc3VsdE9uZVJvd0lmRXhpc3RzfFJlc3VsdE9uZVJvd3xSZXN1bHR8UmVzdWx0Q29tbWFuZFxyXG5cclxuLypcclxuZnVuY3Rpb24gYnVpbGRRdWVyeUNvdW50ZXJBZGFwdGVyKFxyXG4gICAgbWluQ291bnRSb3c6bnVtYmVyLCBcclxuICAgIG1heENvdW50Um93Om51bWJlciwgXHJcbiAgICBleHBlY3RUZXh0OnN0cmluZywgXHJcbiAgICBjYWxsYmFja090aGVyQ29udHJvbD86KHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdEdlbmVyaWMpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkXHJcbil7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcXVlcnlDb3VudGVyQWRhcHRlcihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRHZW5lcmljKT0+dm9pZCwgcmVqZWN0OihlcnI6RXJyb3IpPT52b2lkKXsgXHJcbiAgICAgICAgaWYocmVzdWx0LnJvd3MubGVuZ3RoPG1pbkNvdW50Um93IHx8IHJlc3VsdC5yb3dzLmxlbmd0aD5tYXhDb3VudFJvdyApe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcigncXVlcnkgZXhwZWN0cyAnK2V4cGVjdFRleHQrJyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dzLmxlbmd0aCsnIHJvd3MnKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBFWFRFTkRFRCBFUlJPUlxyXG4gICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGlmKGNhbGxiYWNrT3RoZXJDb250cm9sKXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrT3RoZXJDb250cm9sKHJlc3VsdCwgcmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIge3Jvd3MsIC4uLm90aGVyfSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoe3Jvdzpyb3dzWzBdLCAuLi5vdGhlcn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG4qL1xyXG5cclxudHlwZSBOb3RpY2UgPSBzdHJpbmc7XHJcblxyXG5jbGFzcyBRdWVyeXtcclxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgX3F1ZXJ5OnBnLlF1ZXJ5LCBwdWJsaWMgY2xpZW50OkNsaWVudCwgcHJpdmF0ZSBfaW50ZXJuYWxDbGllbnQ6cGcuQ2xpZW50fHBnLlBvb2xDbGllbnQpe1xyXG4gICAgfVxyXG4gICAgb25Ob3RpY2UoY2FsbGJhY2tOb3RpY2VDb25zdW1lcjoobm90aWNlOk5vdGljZSk9PnZvaWQpOlF1ZXJ5e1xyXG4gICAgICAgIHZhciBxID0gdGhpcztcclxuICAgICAgICB2YXIgbm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24obm90aWNlOk5vdGljZSl7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgIERPRVMgTk9UIEhBVkUgVEhFIENPUlJFQ1QgVFlQRSEgTEFDS1Mgb2YgYWN0aXZlUXVlcnlcclxuICAgICAgICAgICAgaWYocS5faW50ZXJuYWxDbGllbnQuYWN0aXZlUXVlcnk9PXEuX3F1ZXJ5KXtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrTm90aWNlQ29uc3VtZXIobm90aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBAdHMtaWdub3JlIC5vbignbm90aWNlJykgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgIHRoaXMuX2ludGVybmFsQ2xpZW50Lm9uKCdub3RpY2UnLG5vdGljZUNhbGxiYWNrKTtcclxuICAgICAgICB2YXIgcmVtb3ZlTm90aWNlQ2FsbGJhY2s9ZnVuY3Rpb24gcmVtb3ZlTm90aWNlQ2FsbGJhY2soKXtcclxuICAgICAgICAgICAgcS5faW50ZXJuYWxDbGllbnQucmVtb3ZlTGlzdGVuZXIoJ25vdGljZScsbm90aWNlQ2FsbGJhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9xdWVyeS5vbignZW5kJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgdGhpcy5fcXVlcnkub24oJ2Vycm9yJyxyZW1vdmVOb3RpY2VDYWxsYmFjayk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG4gICAgcHJpdmF0ZSBfZXhlY3V0ZTxUUiBleHRlbmRzIFJlc3VsdEdlbmVyaWM+KFxyXG4gICAgICAgIGFkYXB0ZXJDYWxsYmFjazpudWxsfCgocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6VFIpPT52b2lkLCByZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpPT52b2lkKSxcclxuICAgICAgICBjYWxsYmFja0ZvckVhY2hSb3c/Oihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4sIFxyXG4gICAgKTpQcm9taXNlPFRSPntcclxuICAgICAgICB2YXIgcSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgICAgICBxLl9xdWVyeS5vbignZXJyb3InLGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgICAgICBpZihsb2cpe1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgRVhURU5ERUQgRVJST1JcclxuICAgICAgICAgICAgICAgICAgICBsb2coJy0tRVJST1IhICcrZXJyLmNvZGUrJywgJytlcnIubWVzc2FnZSwgJ0VSUk9SJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgLm9uKCdyb3cnKSBET0VTIE5PVCBIQVZFIFRIRSBDT1JSRUNUIFRZUEUhXHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdyb3cnLGZ1bmN0aW9uKHJvdzp7fSwgcmVzdWx0OnBnLlF1ZXJ5UmVzdWx0KXtcclxuICAgICAgICAgICAgICAgIGlmKGNhbGxiYWNrRm9yRWFjaFJvdyl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobG9nKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJvdyksICdST1cnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tGb3JFYWNoUm93KHJvdywgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmUgYWRkUm93IG9tbWl0ZWQgRE9FUyBOT1QgSEFWRSBUSEUgQ09SUkVDVCBUWVBFIVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5hZGRSb3cocm93KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHEuX3F1ZXJ5Lm9uKCdlbmQnLGZ1bmN0aW9uKHJlc3VsdCl7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBWRVIgU0kgRVNUTyBFUyBORUNFU0FSSU9cclxuICAgICAgICAgICAgICAgIC8vIHJlc3VsdC5jbGllbnQgPSBxLmNsaWVudDtcclxuICAgICAgICAgICAgICAgIGlmKGxvZyl7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nKCctLSAnK0pTT04uc3RyaW5naWZ5KHJlc3VsdC5yb3dzKSwgJ1JFU1VMVCcpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoYWRhcHRlckNhbGxiYWNrKXtcclxuICAgICAgICAgICAgICAgICAgICBhZGFwdGVyQ2FsbGJhY2socmVzdWx0LCByZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBhc3luYyBmZXRjaFVuaXF1ZVZhbHVlKCk6UHJvbWlzZTxSZXN1bHRWYWx1ZT4gIHsgXHJcbiAgICAgICAgdmFyIHtyb3csIC4uLnJlc3VsdH0gPSBhd2FpdCB0aGlzLmZldGNoVW5pcXVlUm93KCk7XHJcbiAgICAgICAgaWYocmVzdWx0LmZpZWxkcy5sZW5ndGghPT0xKXtcclxuICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgb25lIGZpZWxkIGFuZCBvYnRhaW5zICcrcmVzdWx0LmZpZWxkcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSc1NFUxMSEnO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7dmFsdWU6cm93W3Jlc3VsdC5maWVsZHNbMF0ubmFtZV0sIC4uLnJlc3VsdH07XHJcbiAgICB9XHJcbiAgICBmZXRjaFVuaXF1ZVJvdyhhY2NlcHROb1Jvd3M/OmJvb2xlYW4pOlByb21pc2U8UmVzdWx0T25lUm93PiB7IFxyXG4gICAgICAgIHJldHVybiB0aGlzLl9leGVjdXRlKGZ1bmN0aW9uKHJlc3VsdDpwZy5RdWVyeVJlc3VsdCwgcmVzb2x2ZToocmVzdWx0OlJlc3VsdE9uZVJvdyk9PnZvaWQsIHJlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgaWYocmVzdWx0LnJvd0NvdW50IT09MSAmJiAoIWFjY2VwdE5vUm93cyB8fCAhIXJlc3VsdC5yb3dDb3VudCkpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGVycj1uZXcgRXJyb3IoJ3F1ZXJ5IGV4cGVjdHMgb25lIHJvdyBhbmQgb2J0YWlucyAnK3Jlc3VsdC5yb3dDb3VudCk7XHJcbiAgICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgICAgICBlcnIuY29kZT0nNTQwMTEhJztcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciB7cm93cywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtyb3c6cm93c1swXSwgLi4ucmVzdH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaE9uZVJvd0lmRXhpc3RzKCk6UHJvbWlzZTxSZXN1bHRPbmVSb3c+IHsgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hVbmlxdWVSb3codHJ1ZSk7XHJcbiAgICB9XHJcbiAgICBmZXRjaEFsbCgpOlByb21pc2U8UmVzdWx0Um93cz57XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4ZWN1dGUoZnVuY3Rpb24ocmVzdWx0OnBnLlF1ZXJ5UmVzdWx0LCByZXNvbHZlOihyZXN1bHQ6UmVzdWx0Um93cyk9PnZvaWQsIF9yZWplY3Q6KGVycjpFcnJvcik9PnZvaWQpOnZvaWR7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGV4ZWN1dGUoKTpQcm9taXNlPFJlc3VsdENvbW1hbmQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5fZXhlY3V0ZShmdW5jdGlvbihyZXN1bHQ6cGcuUXVlcnlSZXN1bHQsIHJlc29sdmU6KHJlc3VsdDpSZXN1bHRDb21tYW5kKT0+dm9pZCwgX3JlamVjdDooZXJyOkVycm9yKT0+dm9pZCk6dm9pZHtcclxuICAgICAgICAgICAgdmFyIHtyb3dzLCBvaWQsIGZpZWxkcywgLi4ucmVzdH0gPSByZXN1bHQ7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmZXRjaFJvd0J5Um93KGNiOihyb3c6e30sIHJlc3VsdDpwZy5RdWVyeVJlc3VsdCk9PlByb21pc2U8dm9pZD4pOlByb21pc2U8dm9pZD57IFxyXG4gICAgICAgIGlmKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpe1xyXG4gICAgICAgICAgICB2YXIgZXJyPW5ldyBFcnJvcignZmV0Y2hSb3dCeVJvdyBtdXN0IHJlY2VpdmUgYSBjYWxsYmFjayB0aGF0IGV4ZWN1dGVzIGZvciBlYWNoIHJvdycpO1xyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIEVYVEVOREVEIEVSUk9SXHJcbiAgICAgICAgICAgIGVyci5jb2RlPSczOTAwNCEnO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5fZXhlY3V0ZShudWxsLCBjYik7XHJcbiAgICB9XHJcbiAgICBhc3luYyBvblJvdyhjYjoocm93Ont9LCByZXN1bHQ6cGcuUXVlcnlSZXN1bHQpPT5Qcm9taXNlPHZvaWQ+KTpQcm9taXNlPHZvaWQ+eyBcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFJvd0J5Um93KGNiKTtcclxuICAgIH1cclxuICAgIHRoZW4oKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciB0aGVuZWQnKVxyXG4gICAgfVxyXG4gICAgY2F0Y2goKXtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3BnLXByb21pc2Utc3RyaWN0OiBRdWVyeSBtdXN0IG5vdCBiZSBhd2FpdGVkIG5vciBjYXRjaGVkJylcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydCB2YXIgYWxsVHlwZXM9ZmFsc2U7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0QWxsVHlwZXMoKXtcclxuICAgIHZhciBUeXBlU3RvcmUgPSByZXF1aXJlKCd0eXBlLXN0b3JlJyk7XHJcbiAgICB2YXIgREFURV9PSUQgPSAxMDgyO1xyXG4gICAgcGdUeXBlcy5zZXRUeXBlUGFyc2VyKERBVEVfT0lELCBmdW5jdGlvbiBwYXJzZURhdGUodmFsKXtcclxuICAgICAgIHJldHVybiBiZXN0R2xvYmFscy5kYXRlLmlzbyh2YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsaWtlQXIoVHlwZVN0b3JlLnR5cGUpLmZvckVhY2goZnVuY3Rpb24oX3R5cGVEZWYsIHR5cGVOYW1lKXtcclxuICAgICAgICB2YXIgdHlwZXIgPSBuZXcgVHlwZVN0b3JlLnR5cGVbdHlwZU5hbWVdKCk7XHJcbiAgICAgICAgaWYodHlwZXIucGdTcGVjaWFsUGFyc2Upe1xyXG4gICAgICAgICAgICAodHlwZXIucGdfT0lEU3x8W3R5cGVyLnBnX09JRF0pLmZvckVhY2goZnVuY3Rpb24oT0lEOm51bWJlcil7XHJcbiAgICAgICAgICAgICAgICBwZ1R5cGVzLnNldFR5cGVQYXJzZXIoT0lELCBmdW5jdGlvbih2YWwpe1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlci5mcm9tU3RyaW5nKHZhbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG52YXIgcG9vbHM6e1xyXG4gICAgW2tleTpzdHJpbmddOnBnLlBvb2xcclxufSA9IHt9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChjb25uZWN0UGFyYW1ldGVyczpDb25uZWN0UGFyYW1zKTpQcm9taXNlPENsaWVudD57XHJcbiAgICBpZihhbGxUeXBlcyl7XHJcbiAgICAgICAgc2V0QWxsVHlwZXMoKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xyXG4gICAgICAgIHZhciBpZENvbm5lY3RQYXJhbWV0ZXJzID0gSlNPTi5zdHJpbmdpZnkoY29ubmVjdFBhcmFtZXRlcnMpO1xyXG4gICAgICAgIHZhciBwb29sID0gcG9vbHNbaWRDb25uZWN0UGFyYW1ldGVyc118fG5ldyBwZy5Qb29sKGNvbm5lY3RQYXJhbWV0ZXJzKTtcclxuICAgICAgICBwb29sc1tpZENvbm5lY3RQYXJhbWV0ZXJzXSA9IHBvb2w7XHJcbiAgICAgICAgcG9vbC5jb25uZWN0KGZ1bmN0aW9uKGVyciwgY2xpZW50LCBkb25lKXtcclxuICAgICAgICAgICAgaWYoZXJyKXtcclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV3IENsaWVudChudWxsLCBjbGllbnQsIGRvbmUgLyosIERPSU5HIHtcclxuICAgICAgICAgICAgICAgICAgICByZWxlYXNlVGltZW91dDogY2hhbmdpbmcocGdQcm9taXNlU3RyaWN0LmRlZmF1bHRzLnJlbGVhc2VUaW1lb3V0LGNvbm5lY3RQYXJhbWV0ZXJzLnJlbGVhc2VUaW1lb3V0fHx7fSlcclxuICAgICAgICAgICAgICAgIH0qLykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2dMYXN0RXJyb3IobWVzc2FnZTpzdHJpbmcsIG1lc3NhZ2VUeXBlOnN0cmluZyk6dm9pZHtcclxuICAgIGlmKG1lc3NhZ2VUeXBlKXtcclxuICAgICAgICBpZihtZXNzYWdlVHlwZT09J0VSUk9SJyl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQRy1FUlJPUiBwZ1Byb21pc2VTdHJpY3QubG9nTGFzdEVycm9yLmluRmlsZU5hbWUnLGxvZ0xhc3RFcnJvci5pbkZpbGVOYW1lKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1BHLUVSUk9SJyxtZXNzYWdlKTtcclxuICAgICAgICAgICAgaWYobG9nTGFzdEVycm9yLmluRmlsZU5hbWUpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGxpbmVzPVsnUEctRVJST1IgJyttZXNzYWdlXTtcclxuICAgICAgICAgICAgICAgIC8qanNoaW50IGZvcmluOmZhbHNlICovXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGF0dHIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goXCItLS0tLS0tIFwiK2F0dHIrXCI6XFxuXCIrbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXNbYXR0cl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZShsb2dMYXN0RXJyb3IuaW5GaWxlTmFtZSxsaW5lcy5qb2luKCdcXG4nKSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46ZmFsc2UgKi9cclxuICAgICAgICAgICAgICAgIGZvcih2YXIgYXR0cjIgaW4gbG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGF0dHIyLCBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1thdHRyMl0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLypqc2hpbnQgZm9yaW46dHJ1ZSAqL1xyXG4gICAgICAgICAgICAgICAgLyplc2xpbnQgZ3VhcmQtZm9yLWluOiAwKi9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlcyA9IHt9O1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBsb2dMYXN0RXJyb3IucmVjZWl2ZWRNZXNzYWdlc1ttZXNzYWdlVHlwZV0gPSBtZXNzYWdlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubG9nTGFzdEVycm9yLmluRmlsZU5hbWUgPSAnLi9sb2NhbC1zcWwtZXJyb3IubG9nJztcclxubG9nTGFzdEVycm9yLnJlY2VpdmVkTWVzc2FnZXM9e30gYXMge1xyXG4gICAgW2tleTpzdHJpbmddOnN0cmluZ1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvb2xCYWxhbmNlQ29udHJvbCgpe1xyXG4gICAgdmFyIHJ0YTpzdHJpbmdbXT1bXTtcclxuICAgIGlmKHR5cGVvZiBkZWJ1Zy5wb29sID09PSBcIm9iamVjdFwiKXtcclxuICAgICAgICBsaWtlQXIoZGVidWcucG9vbCkuZm9yRWFjaChmdW5jdGlvbihwb29sKXtcclxuICAgICAgICAgICAgaWYocG9vbC5jb3VudCl7XHJcbiAgICAgICAgICAgICAgICBydGEucHVzaCgncGdQcm9taXNlU3RyaWN0LmRlYnVnLnBvb2wgdW5iYWxhbmNlZCBjb25uZWN0aW9uICcrdXRpbC5pbnNwZWN0KHBvb2wpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJ0YS5qb2luKCdcXG4nKTtcclxufTtcclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbnByb2Nlc3Mub24oJ2V4aXQnLGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLndhcm4ocG9vbEJhbGFuY2VDb250cm9sKCkpO1xyXG59KTtcclxuIl19