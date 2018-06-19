declare module "pg-promise-strict"{
    var easy:boolean
    type ConnectParams={
        motor?:string
        database?:string
        user?:string
        password?:string
        port?:string
    }
    interface Result{
        rowCount:number
    }
    interface ResultOneRow extends Result{
        row:{[key:string]:any}
    }
    interface ResultOneRowIfExists extends Result{
        row?:{[key:string]:any}|null
    }
    interface ResultRows extends Result{
        rows:{[key:string]:any}[]
    }
    interface ResultValue extends Result{
        value:any
    }
    type Client={
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
    function connect(opts:ConnectParams):Client
    var debug:{
        pool?:boolean
    }
    function setAllTypes():void
    function quoteText(textValue:string):string // deprecated
    function quoteLiteral(textValue:string):string
    function quoteNullable(textValue:string|null):string
    function quoteIdent(name:string):string
    function quoteObject(name:string):string // deprecated
}

