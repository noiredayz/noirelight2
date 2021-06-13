"use strict";

const http = require("http");
const mime = require("mime-types");
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK


exports.Router = class {
	constructor(inPort=7775){
		this.inPort = inPort;
	}
	createServer(){
		try{
			http.createServer(this.requestHandler).listen(this.inPort, 'localhost');
		}
		catch(err){
			nlt.util.printtolog(LOG_WARN, `<Router> Fatal error while trying to create http server: ${err.message}`);
			throw (err);
		}
		nlt.util.printtolog(LOG_WARN, `<Router> http service successfully started on port ${this.inPort}`);
	}
	async requestHandler(req, res){
		nlt.util.printtolog(LOG_INFO, `<http> Incoming request for "${req.url}"`);
		let nam;
		let inurl = req.url.split("?");
		switch(inurl[0]){
			case "/index.htm":
			case "/index.html":
			case "/":
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.write("Where do you want to go today?");
				res.end();
				break;
			case "/status":
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.write(await stats());
				res.end();
				break;
			default:
				nlt.util.printtolog(LOG_WARN, `<Router> invalid path ${req.url}, sending back 404`);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write("404 - Content not found");
				res.end();
				break;
		}
	}	
}


async function stats(){
	//TODO: refactor function to use Promise.all once I make the cytube connector
	let tmiping;
	try { tmiping = await nlt.ss["twitch"].ping(); }
	catch(err){
		tmiping="(unknown)";
	}
	let cytubeping;
	/*
	try { cytubeping = await nlt.ss["cytube"].ping(); }
	catch(err){
		cytubeping="(unknown)";
	}
	*/
	cytubeping = "(module offline)";  
	//let cytubeping = nlt.ss["cytube"].ping();
	let knownChannels = nlt.channels.length;
	let mode2Channels = 0;
	for(let ch of nlt.channels){
		if(ch.chmode==="2") mode2Channels++;
	}
	//TODO: later handle maintenance mode etc. here
	let botStatus = "online";
	let botuptime = nlt.util.donktime(nlt.util.getunixtime() - nlt.starttime);
	let retval = {status: botStatus, uptime: botuptime, kch: knownChannels, ach: mode2Channels, pings: {tmi: tmiping, cytube: cytubeping}};
	return JSON.stringify(retval);
}

function generatePogchamp(cmdline){
	let rrows;
	if(cmdline===""){
		rrows = nlt.maindb.selectQuery(`SELECT * FROM pogchamp ORDER BY id DESC LIMIT 1;`);
		return {emote: rrows[0].emote, date: rrows[0].date, comment: rrows[0].comment, sourceLinks: rrows[0].source};
	}
	if(cmdline.substr(0, 5) != "date=" || cmdline.length != 15 || !Date.parse(cmdline.substr(5, 15)))
		return {error: "invalid parameter"};
	rrows = nlt.maindb.selectQuery(`SELECT * FROM pogchamp WHERE date='${cmdline.substr(5, 15)}';`);
	if(rrows.length === 0)
		return {error: "no data for that date", sentDate: cmdline.substr(5, 15)};
	else
		return {emote: rrows[0].emote, date: cmdline.substr(5, 15), comment: rrows[0].comment, sourceLinks: rrows[0].source};
}


