"use strict";
const sqlite3 = require("better-sqlite3");
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");
//const mariadb = require("mariadb");

class TDatabaseControl{
		constructor(filename, accessmode = {}){
			try {
				if (filename === ":memory:")
					this.db = new sqlite3(":memory:");
				else
					this.db = new sqlite3(filename, accessmode);
			}
			catch(err){
				throw err;
			}
		}
		selectQuery(cmdline){
			let sqd = this.db.prepare(cmdline);
			let retval = -1;
			try{
				retval = sqd.all();
			}
			catch (err){
				throw err;
				retval = null;
			}
			return retval;
		}
		PselectQuery(cmdline){
			return new Promise((resolve, reject) => {
				let sqd = this.db.prepare(cmdline);
				let retval = -1;
				try{
					retval = sqd.all();
				}
				catch (err){
					reject(err);
				}
				resolve(retval);
			})
		}
		insertQuery(cmdline){
			//console.log(`executing: ${cmdline}`);
			let sqd = this.db.prepare(cmdline);
			let retval = -1;
			try{
				retval = sqd.run();
			}
			catch (err){
				throw err;
				retval = null;
			}
			return retval;
		}
		PinsertQuery(cmdline){
			return new Promise((resolve, reject) => {
				let sqd = this.db.prepare(cmdline);
				let retval;
				try{
					retval = sqd.run();
				}
				catch (err){
					reject(err);
				}
				resolve(retval);
			})
		}
		stat(inJSON=false){
			if (inJSON)
				return {	"open": this.db.open,
							"inTransaction": this.db.inTransaction,
							"isMemory": this.db.memory,
							"isReadOnly": this.db.readonly };
			else
				return `database stats: open: ${this.db.open}, in transaction: ${this.db.inTransaction}, memory db?: ${this.db.memory}, readonly?: ${this.db.readonly}`;
		}
		close(){
			this.db.close();
		}
}

/*
 * Technically functional mariaDB util, but its not used.
class TMariadbConnection{
	constructor(serverAddr, serverPort, dbuser, dbpassword, dbname, connlimit=10){
		try{
			this.pool = mariadb.createPool({host: serverAddr, port: serverPort, user: dbuser, database: dbname, password: dbpassword});
		}
		catch(err){
			throw `<mariadb connection> Unable to connect to the database server at ${serverAddr}: ${err}`;
			process.exit(1);
		}
	}
	PQuery(cmdline){
		return new Promise((resolve, reject) => {
			this.pool.query(cmdline).then((rrows) => {
				resolve(rrows);
			}).catch((err) => { reject(err); });
		});
	}
	close(){
		this.pool.end();
	}
}
*/

function InitMessageQueueDatabase(){
	nlt.msgqdb.insertQuery("PRAGMA encoding = \"UTF-8\"");
	nlt.msgqdb.insertQuery(
	`CREATE TABLE "mq" (
		"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
		"targetchannel"	INTEGER,
		"context" TEXT NOT NULL,
		"message"	INTEGER,
		"priority"	INTEGER DEFAULT 0
	);`);
	nlt.msgqdb.insertQuery(`
		CREATE TABLE "cooldowns" (
			"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
			"channel" INTEGER,
			"unick" TEXT NOT NULL,
			"cmdname" TEXT NOT NULL,
			"posttime" INTEGER
			);`);
}

exports.TDatabaseControl	= TDatabaseControl;
//exports.TMariadbConnection	= TMariadbConnection;
exports.InitMessageQueueDatabase = InitMessageQueueDatabase;
