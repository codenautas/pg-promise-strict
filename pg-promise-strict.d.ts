declare module "pg-promise-strict"{
    export var easy:boolean
    export type ConnectParams={
        motor?:string
        database?:string
        user?:string
        password?:string
        port?:number
    }
    export interface Result{
        rowCount:number
    }
    export interface ResultOneRow extends Result{
        row:{[key:string]:any}
    }
    export interface ResultOneRowIfExists extends Result{
        row?:{[key:string]:any}|null
    }
    export interface ResultRows extends Result{
        rows:{[key:string]:any}[]
    }
    export interface ResultValue extends Result{
        value:any
    }
    export type BulkInsertParams={schema?:string,table:string,columns:string[],rows:[][], onerror?:(err:Error, row:[])=>void}
    export type CopyFromOpts={stream:Stream, table:string,columns?:string[],done?:(err?:Error)=>void}
    export type Client={
        executeSqlScript(fileName:string):Promise<void>
        executeSentences(sentences:string[]):Promise<void>
        query(queryString:string, params?:any[]):{
            fetchUniqueValue():Promise<ResultValue>
            fetchUniqueRow():Promise<ResultOneRow>
            fetchOneRowIfExists():Promise<ResultOneRow>
            fetchAll():Promise<ResultRows>
            execute():Promise<Result>
        }
        done():void
        bulkInsert(opts:BulkInsertParams):Promise<void>
        copyFrom(opts:CopyFromOpts):Promise<void>
    }
    export function connect(opts:ConnectParams):Client
    export var debug:{
        pool?:any
        Client?:boolean
        Query?:boolean
    }
    export function setAllTypes():void
    export function quoteText(textValue:string):string // deprecated
    export function quoteLiteral(value:{}):string
    export function quoteNullable(value:any):string
    export function quoteIdent(name:string):string
    export function quoteIdentList(name:string[]):string
    export function quoteObject(name:{}):string // deprecated
    export var defaults:{
        releaseTimeout:{
            inactive:number, 
            connection:number
        }
    }
    export var log:(message:string, type:string)=>void
}
