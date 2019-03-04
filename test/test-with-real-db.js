"use strict";

// // IN TRAVIS-CI ONLY TEST WITH REAL DB IN ONE VERSION 0.12
// if(process.versions.node.substr(0,4)!=="0.12" && process.env.TRAVIS) return;

// WHEN COVER with NO DB NO DB
if(process.env.COVER==="ndb") return;

var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var colors = require('colors'); 
var bestGlobals = require('best-globals');
var discrepances = require('discrepances');
var MiniTools = require('mini-tools');
var TypeStore = require('type-store');
console.warn(pg.poolBalanceControl());

describe('pg-promise-strict with real database', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    var expectedTable1Data = [
        {id:1, text1:'one'},
        {id:2, text1:'two'},
    ];
    describe('pool connections', function(){
        it.skip('failed connection', function(){
            MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                return pg.connect(config.db);
            }).then(function(client){
                if(process.env.TRAVIS){
                    console.log('**************** MAY BE AN ERROR. I MUST STUDY MORE THIS ISSUE ************** ');
                    client.query("SELECT 1").execute().then(function(result){
                        console.log('** SOMETHING IS WRONG IN TRAVIS WITH PG PASSs ***',result);
                        client.done();
                    }).catch(function(err){
                        console.log("ok. error detected when execute");
                    });
                }else{
                    throw new Error('must raise error');
                }
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.code).to.be('28P01');
                expect(err.message).to.match(/(aut.*|pass.*){2}/);
            });
        });
        it('successful connection', function(done){
            pg.debug.Client=true;
            pg.debug.pool=true;
            MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                return pg.connect(config.db);
            }).then(function(client){
                expect(client).to.be.a(pg.Client);
                expect(client._client).to.be.a(pg0.Client);
                expect(pg.poolBalanceControl().length>0).to.be.ok();
                client.done();
                expect(pg.poolBalanceControl().length==0).to.be.ok();
                done();
            }).catch(function(err){
                console.log('Check your postgresql instalation. Then be sure to create the user and db with:');
                console.log("create user test_user password 'test_pass';".cyan);
                console.log("create database test_db owner test_user;".cyan);
                done(err);
            }).then(function(){
                pg.debug.Client=false;
            });
        });
    });
    describe('call queries', function(){
        var client;
        var poolLog;
        before(function(done){
            pg.setAllTypes();
            pg.easy=true;
            MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                return pg.connect(config.db);
            }).then(function(returnedClient){
                // if(pg.poolBalanceControl().length>0) done(new Error("There are UNEXPECTED unbalanced conections"));
                pg.easy=false;
                client = returnedClient;
                done();
            });
        });
        after(function(){
            if(client){
                client.done();
            }
        });
        it("successful query that doesn't return rows", function(done){
            pg.easy=true;
            pg.debug.Query=true;
            client.query("drop schema if exists test_pgps cascade;").then(function(result){
                expect(result.command).to.be("DROP");
                expect(result.rowCount).to.not.be.ok();
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
            });
        });
        it("executeSqlScript succefull", function(){
            return client.executeSqlScript("test/script-example.sql").then(function(result){
                expect(result.command).to.be("SELECT");
                expect(result.rows).to.eql([{count:4}]);
            }).then(function(){
                pg.debug.Query=false;
            });
        });
        it("executeSqlScript with error", function(){
            return client.executeSqlScript("test/script-err-example.sql").then(function(result){
                throw new Error('must throw an error');
            },function(err){
                expect(err.code).to.eql('42601');;
            });
        });
        function tipicalExecuteWay(queryText,done,commandExpected,resultExpected,functionName,params){
            pg.easy=false;
            return client.query(queryText,params)[functionName||"execute"]().then(function(result){
                if(resultExpected){
                    for(var attr in resultExpected){
                        expect([attr,result[attr]]).to.eql([attr,resultExpected[attr]]);
                        discrepances.showAndThrow(result[attr],resultExpected[attr]);
                    }
                }else{
                    expect(result.rowCount).to.not.be.ok();
                }
                expect(result.command).to.be(commandExpected);
                done();
            }).catch(done).then(function(){
                pg.debug.Query=false;
            });
        }
        it("call execute directly", function(done){
            this.timeout(5000);
            tipicalExecuteWay("create schema test_pgps;",done,'CREATE');
        });
        function tipicalFail(textQuery,done,reason,code,msg,functionName){
            client.query(textQuery)[functionName||"execute"]().then(function(result){
                console.log("EXPECT FAIL BUT OBTAINS",result);
                done(new Error("Must fail because "+reason));
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.code).to.be(code);
                expect(err).to.match(msg);
                done();
            }).catch(done).then(function(){
            });
        }
        it("failed call", function(done){
            tipicalFail("create schema test_pgps;",done,"the schema exists",'42P06',/(exist.*|test_pgps.*){2}/);
        });
        it("call a compound", function(done){
            tipicalExecuteWay(
                "do $$ begin "+
                "create table test_pgps.table1(id integer primary key, text1 text); "+
                "create table test_pgps.table2(text2 text primary key, int2 integer); "+
                "create table test_pgps.table3(id3 integer primary key, num3 numeric, dou3 double precision, dat3 date, big3 bigint); "+
                "end$$;",
                done,
                "DO"
            )
        });
        it("call multiple insert with returning clause", function(done){
            tipicalExecuteWay("insert into test_pgps.table1 values (1,'one'), (2,'two');",done,"INSERT",{
                rowCount:2
            })
        });
        it("query unique value", function(done){
            tipicalExecuteWay("select 3+$1",done,"SELECT",{
                value:8
            },"fetchUniqueValue",[5])
        });
        it("fail to query unique value", function(done){
            tipicalFail("select 1, 2",done,"returns 2 columns","54U11!",/query expects.*one field.*and obtains 2/,"fetchUniqueValue")
        });
        it("query unique row", function(done){
            tipicalExecuteWay("select * from test_pgps.table1 order by id limit 1",done,"SELECT",{
                row:expectedTable1Data[0]
            },"fetchUniqueRow")
        });
        it("fail to query unique row", function(done){
            tipicalFail("select * from test_pgps.table1",done,"returns 2 rows","54011!",/query expects.*one row.*and obtains 2/,"fetchUniqueRow")
        });
        it("query row by row", function(){
            var accumulate=[];
            return client.query({
                text:"select * from test_pgps.table1 where id<$1 order  by id",
                values:[99]
            }).onRow(function(row){
                accumulate.unshift(row);
            }).then(function(){
                accumulate.reverse();
                expect(accumulate).to.eql(expectedTable1Data);
            });
        });
        it("control not call query row by row without callback", function(done){
            tipicalFail("select 1, 2",done,"no callback provide","39004!",/fetchRowByRow must receive a callback/,"fetchRowByRow")
        });
        it("bulk insert", function(){
            return client.bulkInsert({
                schema: "test_pgps", 
                table: "table1", 
                columns: ['id', 'text1'],
                rows: [
                    [3, 'three'],
                    [4, 'four'],
                    [5, 'five'],
                    [6, 'six'],
                    [7, 'seven'],
                    [8, 'eight'],
                    [9, 'nine'],
                    [10, 'ten'],
                    [11, 'eleven'],
                    [12, 'twelve'],
                    [13, 'thirteen'],
                    [14, 'fourteen'],
                    [15, 'fifteen'],
                    [16, 'sixteen'],
                    [17, 'seventeen'],
                    [18, 'eighteen'],
                    [19, 'nineteen'],
                    [20, 'twenty'],
                    [21, 'twenty-one'],
                    [22, 'twenty-two'],
                    [23, 'twenty-three'],
                    [30, 'thirty'],
                    [40, 'forty'],
                    [50, 'fifty'],
                    [60, 'sixty'],
                    [70, 'seventy'],
                    [80, 'eighty'],
                    [90, 'ninety'],
                    [100, 'one hundred'],
                    [101, 'one hundred and one'],
                    [200, 'two hundred'],
                    [300, 'three hundred'],
                    [1000, 'one thousand'],
                    [1000000, 'one million'],
                    [10000000, 'ten million'],               
                ]
            }).then(function(){
                return client.query("select sum(id) as sum_id from test_pgps.table1").fetchUniqueRow();
            }).then(function(result){
                expect(result.row.sum_id).to.eql(11002397);
            });
        });
        it("bulk insert", function(){
            return client.bulkInsert({
                table: "table3", 
                columns: ['id', 'text1'],
                rows: [
                    [3, 'three'],
                ]
            }).then(function(){
                throw new Error('must throw error');
            }, function(err){
                expect(err.code).to.eql('42P01');
            });
        });
        it("inserting dates", function(done){
            tipicalExecuteWay("insert into test_pgps.table3 (id3, dat3) values (1,'1999-12-31') returning dat3, big3;",done,"INSERT",{
                rows:[{
                    dat3: bestGlobals.date.iso("1999-12-31"),
                    big3: null
                }]
            })
        });
        it("inserting big bigint", function(done){
            var bigIntData="123456789012345678";
            tipicalExecuteWay("insert into test_pgps.table3 (id3, big3) values (2,$1) returning big3::text as big4,dat3;",done,"INSERT",{
                rows:[{
                    big4: bigIntData,
                    dat3: null
                }]
            },null, [new TypeStore.class.Big(bigIntData)])
            // },null, [bigIntData])
        });
        it("inserting medium bigint", function(done){
            var bigIntData="123456789012341";
            tipicalExecuteWay("insert into test_pgps.table3 (id3, big3) values (3,$1) returning big3,dat3;",done,"INSERT",{
                rows:[{
                    big3: Number(bigIntData),
                    dat3: null
                }]
            },null, [Number(bigIntData)])
        });
        it("query reading notices in execute", async function(){
            var accumulate=[];
            await client.query('SET client_min_messages TO NOTICE');
            return client.query({
                text:`
                do language plpgsql
                $$
                begin
                  raise notice 'notice 1';
                  raise notice 'notice 2';
                  drop function if exists function_with_notice(text);
                  create function function_with_notice(p_value text) returns text 
                    language plpgsql
                  as
                  $body$
                  begin
                    raise notice 'notice inside 1 %',p_value;
                    raise notice 'notice inside 2 %',p_value;
                    return p_value;
                  end;
                  $body$;
                end;
                $$;
                `,
            }).onNotice(function(notice){
                accumulate.push(notice.message);
            }).execute().then(function(){
                expect(accumulate.slice(0,2)).to.eql([
                    "notice 1", "notice 2"
                ]);
            });
        });
        it("query reading notices with value", function(){
            var accumulate=[];
            return client.query("select function_with_notice($1);",['valor']).onNotice(function(notice){
                accumulate.push(notice.message);
            }).fetchUniqueValue().then(function(result){
                expect(result.value).to.eql("valor");
                expect(accumulate).to.eql([
                    "notice inside 1 valor", "notice inside 2 valor"
                ]);
            }).then(function(){
                var accumulate2=[];
                return client.query("select function_with_notice($1);",['other']).onNotice(function(notice){
                    accumulate2.push(notice.message);
                }).fetchUniqueValue().then(function(result){
                    expect(result.value).to.eql("other");
                    expect(accumulate2).to.eql([
                        "notice inside 1 other", "notice inside 2 other"
                    ]);
                    expect(accumulate).to.eql([
                        "notice inside 1 valor", "notice inside 2 valor"
                    ]);
                });
            })
        });
    });
    describe('pool-less connections', function(){
        describe('call queries', function(){
            var client;
            before(function(done){
                MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                    client = new pg.Client(config.db);
                    done();
                });
            });
            it("successful query", function(done){
                pg.easy=true;
                client.connect().then(function(){
                    return client.query("select * from test_pgps.table1 where id<3 order by id;");
                }).then(function(result){
                    expect(result.rows).to.eql(expectedTable1Data);
                    result.client.end();
                    done();
                }).catch(done).then(function(){
                });
            });
            it("unsuccessful query", function(done){
                this.timeout(5000);
                pg.easy=true;
                pg.debug.Client=true;
                MiniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                    client = new pg.Client("this_user@localhost:"+config.db.port+"/nonex");
                    expect(client).to.be.a(pg.Client);
                    expect(client._client).to.be.a(pg0.Client);
                    client.connect().then(function(){
                        done(new Error("must raise error"));
                    }).catch(function(err){
                        if(config.db.port==5432){
                            expect(err.message).to.match(/(aut.*|pass.*){2}|database.*does not exist/);
                        }else{
                            expect(err.message).to.match(/ECONNREFUSED.*5432/);
                        }
                        done();
                    }).catch(done).then(function(){
                    });
                });
            });
            it("connect with extra parameter", function(done){
                this.timeout(5000);
                pg.easy=true;
                pg.debug.Client=true;
                client = new pg.Client("this_user@xxxx");
                expect(client).to.be.a(pg.Client);
                expect(client._client).to.be.a(pg0.Client);
                client.connect("extra parameter").then(function(){
                    done(new Error("must raise error because must not have parameters"));
                }).catch(function(err){
                    expect(err.message).to.match(/must no receive parameters/);
                    done();
                }).catch(done).then(function(){
                });
            });
        });
    });
});

