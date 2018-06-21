declare module "pg-promise-strict"{
    export var easy:boolean
    export type ConnectParams={
        motor?:string
        database?:string
        user?:string
        password?:string
        port?:string
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
    export type Client={
        executeSqlScript(fileName:string):Promise<void>
        query(queryString:string, params?:any[]):{
            fetchUniqueValue():Promise<ResultValue>
            fetchUniqueRow():Promise<ResultOneRow>
            fetchOneRowIfExists():Promise<ResultOneRow>
            fetchAll():Promise<ResultRows>
            execute():Promise<Result>
        }
        done():void
    }
    export function connect(opts:ConnectParams):Client
    export var debug:{
        pool?:boolean
    }
    export function setAllTypes():void
    export function quoteText(textValue:string):string // deprecated
    export function quoteLiteral(textValue:string):string
    export function quoteNullable(textValue:string|null):string
    export function quoteIdent(name:string):string
    export function quoteObject(name:string):string // deprecated
}

