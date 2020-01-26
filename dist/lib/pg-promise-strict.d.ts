/// <reference types="node" />
import * as pg from 'pg';
import { Stream } from 'stream';
export declare var messages: {
    attemptTobulkInsertOnNotConnected: string;
    attemptTocopyFromOnNotConnected: string;
    attemptToExecuteSentencesOnNotConnected: string;
    attemptToExecuteSqlScriptOnNotConnected: string;
    clientAlreadyDone: string;
    clientConenctMustNotReceiveParams: string;
    copyFromInlineDumpStreamOptsDoneExperimental: string;
    fetchRowByRowMustReceiveCallback: string;
    formatNullableToInlineDumpErrorParsing: string;
    insaneName: string;
    lackOfClient: string;
    mustNotConnectClientFromPool: string;
    mustNotEndClientFromPool: string;
    nullInQuoteLiteral: string;
    obtains1: string;
    obtainsNone: string;
    queryExpectsOneFieldAnd1: string;
    queryExpectsOneRowAnd1: string;
    queryMustNotBeCatched: string;
    queryMustNotBeThened: string;
    queryNotConnected: string;
    unbalancedConnection: string;
};
export declare var i18n: {
    messages: {
        en: typeof messages;
        [k: string]: Partial<typeof messages>;
    };
};
export declare function setLang(lang: string): void;
export declare var debug: {
    pool?: true | {
        [key: string]: {
            count: number;
            client: (pg.Client | pg.PoolClient) & {
                secretKey: string;
            };
        };
    };
};
export declare var defaults: {
    releaseTimeout: {
        inactive: number;
        connection: number;
    };
};
export declare function noLog(_message: string, _type: string): void;
export declare var log: (message: string, type: string) => void;
export declare function quoteIdent(name: string): string;
export declare function quoteIdentList(objectNames: string[]): string;
export declare type AnyQuoteable = string | number | Date | {
    isRealDate: boolean;
    toYmd: () => string;
} | {
    toPostgres: () => string;
} | {
    toString: () => string;
};
export declare function quoteNullable(anyValue: null | AnyQuoteable): string;
export declare function quoteLiteral(anyValue: AnyQuoteable): string;
export declare function adaptParameterTypes(parameters?: any[]): any[] | null;
export declare var easy: boolean;
export declare type ConnectParams = {
    motor?: "postgres";
    database?: string;
    user?: string;
    password?: string;
    port?: number;
};
export declare type CopyFromOptsCommon = {
    table: string;
    columns?: string[];
    done?: (err?: Error) => void;
    with?: string;
};
export declare type CopyFromOptsFile = {
    inStream?: undefined;
    filename: string;
} & CopyFromOptsCommon;
export declare type CopyFromOptsStream = {
    inStream: Stream;
    filename?: undefined;
} & CopyFromOptsCommon;
export declare type CopyFromOpts = CopyFromOptsFile | CopyFromOptsStream;
export declare type BulkInsertParams = {
    schema?: string;
    table: string;
    columns: string[];
    rows: any[][];
    onerror?: (err: Error, row: any[]) => Promise<void>;
};
/** TODO: any en opts */
export declare class Client {
    private _done;
    private connected;
    private fromPool;
    private postConnect;
    private _client;
    constructor(connOpts: ConnectParams | null, client: (pg.Client | pg.PoolClient), _done: () => void, _opts?: any);
    connect(): Promise<unknown>;
    end(): void;
    done(): any;
    query(sql: string): Query;
    query(sql: string, params: any[]): Query;
    query(sqlObject: {
        text: string;
        values: any[];
    }): Query;
    executeSentences(sentences: string[]): Promise<void | ResultCommand>;
    executeSqlScript(fileName: string): Promise<void | ResultCommand>;
    bulkInsert(params: BulkInsertParams): Promise<void>;
    copyFromParseParams(opts: CopyFromOpts): {
        sql: string;
        _client: (pg.Client & {
            secretKey: string;
        }) | (pg.PoolClient & {
            secretKey: string;
        });
    };
    copyFromFile(opts: CopyFromOptsFile): Promise<ResultCommand>;
    copyFromInlineDumpStream(opts: CopyFromOptsStream): import("pg-copy-streams").CopyStreamQuery;
    formatNullableToInlineDump(nullable: any): any;
    copyFromArrayStream(opts: CopyFromOptsStream): import("pg-copy-streams").CopyStreamQuery;
}
declare var queryResult: pg.QueryResult;
export interface Result {
    rowCount: number;
    fields: typeof queryResult.fields;
}
export interface ResultCommand {
    command: string;
    rowCount: number;
}
export interface ResultOneRow extends Result {
    row: {
        [key: string]: any;
    };
}
export interface ResultOneRowIfExists extends Result {
    row?: {
        [key: string]: any;
    } | null;
}
export interface ResultRows extends Result {
    rows: {
        [key: string]: any;
    }[];
}
export interface ResultValue extends Result {
    value: any;
}
export declare type ResultGeneric = ResultValue | ResultRows | ResultOneRowIfExists | ResultOneRow | Result | ResultCommand;
declare type Notice = string;
declare class Query {
    private _query;
    client: Client;
    private _internalClient;
    constructor(_query: pg.Query, client: Client, _internalClient: pg.Client | pg.PoolClient);
    onNotice(callbackNoticeConsumer: (notice: Notice) => void): Query;
    private _execute;
    fetchUniqueValue(errorMessage?: string): Promise<ResultValue>;
    fetchUniqueRow(errorMessage?: string, acceptNoRows?: boolean): Promise<ResultOneRow>;
    fetchOneRowIfExists(errorMessage?: string): Promise<ResultOneRow>;
    fetchAll(): Promise<ResultRows>;
    execute(): Promise<ResultCommand>;
    fetchRowByRow(cb: (row: {}, result: pg.QueryResult) => Promise<void>): Promise<void>;
    onRow(cb: (row: {}, result: pg.QueryResult) => Promise<void>): Promise<void>;
    then(): void;
    catch(): void;
}
export declare var allTypes: boolean;
export declare function setAllTypes(): void;
export declare function connect(connectParameters: ConnectParams): Promise<Client>;
export declare var readyLog: Promise<void>;
export declare function logLastError(message: string, messageType: string): void;
export declare namespace logLastError {
    var inFileName: string;
    var receivedMessages: {
        [key: string]: string;
    };
}
export declare function poolBalanceControl(): string;
export {};
