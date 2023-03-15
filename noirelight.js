#!/usr/bin/node
"use strict";
/* LICENSE BL OMEGALUL CK
* noirelight - Another Twitch chat bot
* Copyright (C) 2020 twitch.tv/noiredayz
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* Full text of the license is available in the accompanying COPYING.txt
* or you can read it online at <https://www.gnu.org/licenses/>.
*
* Additional permissions per Section 7 of the license:
* This program supports extensions (additional chat commands) via a
* system I call "dynamic commands". When developing dynamic commands
* you are permitted to use/invoke otherwise AGPL-3.0-or-later licensed
* parts of the code, even if your dynamic module is not under a license
* compatible with the AGPL-3.0-or-later. (If this is even required, I'm
* not a GPL lawyer FeelsDonkMan)
*
* This program uses various other libraries with different licenses.
* Please refer to the documentation of such libraries about their own
* terms and conditions
*/
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");

global.nlt = new Object;

/* modules */

nlt.fs		= require("fs");
nlt.got		= require("got");
nlt.os		= require("os");					//os information
nlt.dns		= require("dns");					//domain resolver query
nlt.exec	= require("child_process");			//execute external commands and shit
nlt.mongo	= require("mongodb");
nlt.util	= require("./lib/nlt-tools.js");	//utils and common commands
nlt.db		= require("./lib/nlt-db.js");		//donk sqlite database
nlt.conf	= require("./config/config.js");	//configuration
nlt.c		= nlt.conf.nltConfig;				//configuration options
nlt.ps		= require("./lib/twitch-pubsub.js");//pubsub 
nlt.router	= require("./lib/nlt-router.js");	//web server
nlt.cmd		= require("./lib/nlt-commands.js");	//command execution
nlt.chctl	= require("./lib/nlt-channels.js");	//channel control
nlt.cache	= require("./lib/nlt-cache.js");	//memory cache


nlt.ss		= new Object;
nlt.ss["twitch"] = require("./subsystems/twitch.js");	//the Twitch subsystem

nlt.starttime	= nlt.util.getunixtime();
nlt.channels	= [];
nlt.timebombs	= 0;
nlt.restarts	= {twitch: 0, cytube: 0, discord: 0};
nlt.identities	= {};

console.log(`noirelight2 ${nlt.c.bver} starting up on ${nlt.os.platform} @ ${nlt.os.hostname}`);
console.log(`node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);
nlt.logfile = nlt.fs.openSync(nlt.c.logfile, 'a', '644');
nlt.util.printtolog(LOG_INFO, `==================== New session: ${nlt.starttime} ====================`);
nlt.util.printtolog(LOG_WARN, `<system> Attempting to open the main database file`);
nlt.maindb = new nlt.db.TDatabaseControl(nlt.c.dbfile, { fileMustExists: true });
nlt.util.printtolog(LOG_WARN, `<system> Attempting to open the message log database file`);
nlt.logdb = new nlt.db.TDatabaseControl(nlt.c.logdbfile, {fileMustExists: true});
nlt.util.printtolog(LOG_WARN, `<system> Attempting to open the twitch lottery database file`);
nlt.tldb = new nlt.db.TDatabaseControl(nlt.c.tldb, {fileMustExists: true});
nlt.util.printtolog(LOG_WARN, `<system> Attempting to create and set up the memory only database`);
nlt.msgqdb = new nlt.db.TDatabaseControl(":memory:");
nlt.db.InitMessageQueueDatabase();
nlt.util.printtolog(LOG_WARN, `<system> Successfully opened the databases.`);

process.on('exit', () => { nlt.maindb.close(); nlt.logdb.close(); nlt.fs.closeSync(nlt.logfile);});

/*
process.on('unhandledRejection', function(reason, promise){
	nlt.util.printtolog(LOG_WARN, `<system> Unhandled promise rejection (${promise}): ${reason}`);
});
*/

nlt.cache.InitCache();
nlt.cmd.LoadCommands();				//Load commands from files
nlt.chctl.LoadChannels();			//Load all channels, but not yet join them
nlt.ss["twitch"].Start();			//Connect and log into Twitch

//nlt.ps.start();					//Start pubsub
//nlt.cytube.Start();				//Connect and log into CyTube
nlt.Router = new nlt.router.Router;
nlt.Router.createServer();


/*
⠄⠄⠄⠄⠄⠄⠄⠄⣾⣿⣿⣿⣷⣤⣤⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⠄⣿⣿
⠄⠄⠄⠄⠄⠄⠄⣀⣀⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠄⠄⠄⠄⠄⠄⠄⠄⢹
⠄⠄⠄⣶⣶⣶⣶⣝⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠄⠄⠄⠄⠄⠄⠄⢀⣼
⠄⠄⣸⣧⣄⣰⠆⢙⠳⡹⣿⣿⣿⣿⣿⣿⣿⠇⠄⠄⠄⠄⠄⠄⠄⠄⢸⣿
⠄⣾⣿⣿⣿⣽⣂⣈⣁⣌⣿⣿⣿⣿⣿⣿⣿⡆⠄⠄⠄⠄⠄⠄⢀⣀⣾⣿
⠄⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⢩⡅⠄⠄⠄⠄⠄⠄⠄⣤⣿⣿⣿⣿⣿
⠄⠄⠰⢿⣿⣯⣽⣿⣿⣿⡿⠁⠄⠈⠁⠄⠄⠄⣠⣶⣶⣾⣿⣿⣿⣿⣿⣿
⢠⡄⣤⡀⠈⠛⣿⣟⢿⣿⡇⠄⢠⣼⣷⣦⠄⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⢸⣷⣿⣷⣾⣶⣿⡌⠄⠄⠄⠄⠈⠛⠿⠟⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣸⣿⣿⣿⣿⣿⣿⣧⣤⠄⠄⠄⠄⢀⣤⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣉⠿⢿⣿⣿⣿⠋⠄⢀⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⢻⣿⣤⣄⠈⠉⠁⣠⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣀⣀⣉⣡⣤⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
*/
