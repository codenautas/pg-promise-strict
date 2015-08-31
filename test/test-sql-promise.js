"use strict";

if(process.env.COVER!=="sdb") return;

var tester=require('sql-promise').tester;

var pg = require('..');

tester.test(pg, {});