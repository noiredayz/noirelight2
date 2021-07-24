const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK
"use strict";

const Discord = require("discord.js");
const dsclient = new Discord.Client();
let dscdctl = new nlt.util.TCooldownController("discord");
let dsmsgq = 

nlt.util.printtolog(LOG_WARN, `<discord> Discord subsystem starting`);

dsclient.on("message", onMessageArrive);
dsclient.once("ready", onReady);
