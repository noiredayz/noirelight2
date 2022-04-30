"use strict";

const DB = require("./lib/nlt-db.js");
const ptl = console.log;
const process = require("process");

ptl('noirelight2 nfs json loader v0.1');
const tfile = process.argv[process.argv.length-1];
if(tfile.substring(tfile.length-5) != '.json'){
	printtolog('Specify a json file to load.');
	process.exit(1);
}

//not doing tests here, if it fails it fails
const infile = require(infile);
