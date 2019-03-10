"use strict";

var MAX_CLIENTS=24;
var MAX_QUERIES=100;
var MAX_CICLES=24;

var expect = require('expect.js');
var pg0 = require('pg');
var pg = require('..');
var colors = require('colors'); 
console.warn(pg.poolBalanceControl());
var fs = require('fs');
const { Transform, Readable } = require('stream');
const { LineSplitter, LineJoiner, EscapeCharsTransform, streamSignalsDone }  = require("line-splitter");
// const { from } = require('pg-copy-streams');
// var copyFrom = from;

var miniTools = require('mini-tools');

describe('intensive tests', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    for(var iClient=1; iClient<=MAX_CLIENTS; iClient++){
        describe('pool connection '+iClient, function(){
            var client;
            before(function(done){
                miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                    return pg.connect(config.db);
                }).then(function(clientFromPool){
                    client=clientFromPool;
                }).then(done).catch(done);
            });
            after(function(){
                client.done();
            });
            for(var iCicle=0; iCicle<(iClient==MAX_CLIENTS?MAX_CICLES:1); iCicle++){
                it('call queries '+MAX_QUERIES+': '+(iCicle||''), function(done){
                    var p=Promise.resolve();
                    for(var iQuery=1; iQuery<=MAX_QUERIES; iQuery++){
                        p=p.then(function(){
                            return client.query("SELECT $1::integer c, $2::integer q, $3::integer i",[iClient, iQuery, iCicle]).fetchAll();
                        }).then(function(result){
                            // console.log('xxxxxxxxxxxx',result);
                            expect(result.rows).to.eql([{c: iClient, q:iQuery, i:iCicle}]);
                        });
                    };  
                    p.then(done).catch(done);
                });
            }
        });
    };
});

describe('streams', function(){
    var connectParams = {
        user: 'test_user',
        password: 'test_pass',
        database: 'test_db',
        host: 'localhost',
        port: 5432
    }
    describe('inserting from stream', function(){
        var client;
        before(function(done){
            miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                return pg.connect(config.db);
            }).then(function(clientFromPool){
                client=clientFromPool;
            }).then(done).catch(done);
        });
        after(function(){
            client.done();
        });
        it('reading fixture', async function(){
            this.timeout(5000)
            await client.query(`
                DROP TABLE IF EXISTS attributes;
            `).execute();
            await client.query(`
                CREATE TABLE attributes(
                    id serial primary key, 
                    line text
                );
            `).execute();
            var fileStream = fs.createReadStream('test/fixtures/many-lines.txt',{encoding:'utf8'});
            var lineSplitter = new LineSplitter();
            var escape = new EscapeCharsTransform({
                charsToEscape:',\\"\';', prefixChar:'\\'
            });
            var addEot = new Transform({
                objectMode:true,
                transform(chunk,_,next){
                    this.push({line:chunk.line.toString(), eol:'\n'});
                    next();
                },
                flush(next){
                    this.push({line:'\\.',eol:'\n'});
                    this.push(null);
                    next();
                }
            })
            var lineJoiner = new LineJoiner();
            fileStream.pipe(lineSplitter).pipe(escape).pipe(addEot).pipe(lineJoiner);
            var ws=client.copyFromInlineDumpStream({table:'attributes', columns:['line'], inStream:lineJoiner});
            await streamSignalsDone(ws);
            var result = await client.query("SELECT * FROM attributes ORDER BY id DESC LIMIT 2").fetchAll();
            expect(result.rows).to.eql([
                {id:156, line:"    ['wrap', 'textarea', 'How the value of the form control is to be wrapped for form submission', '\"soft\"; \"hard\"']"},
                {id:155, line:"    ['width', 'canvas; embed; iframe; img; input; object; video', 'Horizontal dimension', 'Valid non-negative integer'],"},
            ])
        });
    });
    describe('inserting from array stream', function(){
        var client;
        before(function(done){
            miniTools.readConfig([{db:connectParams}, 'local-config'], {whenNotExist:'ignore'}).then(function(config){
                return pg.connect(config.db);
            }).then(function(clientFromPool){
                client=clientFromPool;
            }).then(done).catch(done);
        });
        after(function(){
            client.done();
        });
        it('creating array on the fly', async function(){
            this.timeout(5000)
            await client.query(`
                DROP TABLE IF EXISTS four_columns;
            `).execute();
            await client.query(`
                CREATE TABLE four_columns(
                    one text,
                    two integer primary key,
                    three decimal,
                    four boolean
                );
            `).execute();
            var r = new Readable({objectMode:true});
            r.push(['one', 2, 3.3, true]);
            r.push(['uno', -2, 33.00003, false]);
            r.push(['Один', 12, NaN, undefined]);
            r.push(['a\\.b\ttab\r\nLínea \\z cortada\\n\\N. tengo \\.\\\\N', 22, null, null]);
            r.push(['a\\.b\ttab\r\nLínea cortada\\n\\N. tengo \\.\\N', 23, null, null]);
            r.push(null);
            var ws=client.copyFromArrayStream({table:'four_columns', inStream:r});
            ws.on('error', function(err){
                console.error('######################### ',err)
            })
            await streamSignalsDone(ws);
            var result = await client.query("SELECT * FROM four_columns ORDER BY two").fetchAll();
            expect(result.rows).to.eql([
                {one:'uno' , two:-2  , three:"33.00003", four:false},
                {one:'one' , two: 2  , three:"3.3"     , four:true },
                {one:'Один', two:12, three:null      , four:null },
                {one:'a\\.b\ttab\r\nLínea \\z cortada\\n\\N. tengo \\.\\\\N', two:22, three:null      , four:null },
                {one:'a\\.b\ttab\r\nLínea cortada\\n\\N. tengo \\.\\N', two:23, three:null      , four:null },
            ])
        });
    });
});
