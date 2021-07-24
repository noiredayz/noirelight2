"use strict";
/* Logging levels */
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK

const { ChatClient} = require("dank-twitch-irc");
let twitchclient;
let twHelix="", twOauth="";

//twitch specific variables
let lastbing	= 0;
let tmiping 	= 0;
let twchannels	= [];
let ps_started	= 0;
let twcdctl		= new nlt.util.TCooldownController("twitch");


function ttvAuthenticate(forceUpdate=false){
	return new Promise(async (resolve, reject) => {
		if (!nlt.c.twitch.clientID || !nlt.c.twitch.clientSecret){
			reject("missing credentials");
			return;
		}
		let rrows;
		let needs_update = false;
		rrows = nlt.maindb.selectQuery("SELECT * FROM auth WHERE keyname='twitch-helix-oauth';");
		if(rrows.length===0){
			needs_update = true;
			nlt.util.printtolog(LOG_DBG, `<twauth> No stored key exists, downloading a new one.`);
		}
		else {
			if (rrows[0].expires < (nlt.util.getunixtime()+120)){
				needs_update = true;
				nlt.util.printtolog(LOG_DBG, `<twauth> Stored helix key expired, downloading a new one.`);
			}
			}
		if(forceUpdate){
			needs_update = true;	
			nlt.util.printtolog(LOG_DBG, `<twauth> Force-updating helix key.`);
		}
		if (!needs_update){
			nlt.cache.deld("helix_bearer");
			nlt.cache.setd("helix_bearer", rrows[0].data, nlt.util.getunixtime()-rrows[0].expires);
			nlt.util.printtolog(LOG_INFO, `<twitch> Valid Helix token loaded from db, expires in ${nlt.util.donktime(rrows[0].expires-nlt.util.getunixtime())}`);
			resolve("update success");
			return;
		} else {	
			let twReply, twAuth;
			const https_options = {
				url: 'https://id.twitch.tv/oauth2/token?client_id='+nlt.c.twitch.clientID+'&client_secret='+nlt.c.twitch.clientSecret+'&grant_type=client_credentials',
				method: 'POST',
				headers: {
					'User-Agent': nlt.c.userAgent
				},
				timeout: 2000,
				retry: 2
			}
			try{
				twAuth = await nlt.got(https_options).json();
			}
			catch(err){
			reject(err);
			return;
			}
			nlt.cache.deld("helix_bearer");
			nlt.cache.setd("helix_bearer", twAuth.access_token, twAuth.expires_in);
			nlt.util.printtolog(LOG_INFO, `<twitch> Helix token updated, expires in ${nlt.util.donktime(twAuth.expires_in)}`);
			nlt.maindb.insertQuery("DELETE FROM auth WHERE keyname='twitch-helix-oauth';");
			nlt.maindb.insertQuery(`INSERT INTO auth
									(keyname, data, type, expires)
									VALUES
									('twitch-helix-oauth', '${twAuth.access_token}', 'bearer', '${nlt.util.getunixtime()+twAuth.expires_in}');`);
			resolve("update success");
		}
		
	});
}


function Start(){
	nlt.util.printtolog(LOG_WARN, `<twitch> Twitch Subsystem starting up TriHard 7`);
	let rrows;
	rrows = nlt.maindb.selectQuery("SELECT * FROM auth WHERE keyname='twitch-oauth';");
	if (!rrows || rrows.length===0){
		nlt.util.printtolog(LOG_WARN, `<twitch> Fatal error: no oauth bearer token for twitch login. Please run the login service and store the data to the db.`);
		process.exit(1);
	}
	twOauth = "oauth:" + rrows[0].data;
	twitchclient = new ChatClient({username: nlt.c.twitch.username, password: twOauth, rateLimits: nlt.c.twitch.rateLimits});
	setEventHandlers();
	twitchclient.connect();
	twmessagequeue();
}

function setEventHandlers(){
	//DTI event handlers
	twitchclient.on("connecting", onConnecting);
	twitchclient.on("connect", onConnect);
	twitchclient.on("ready", onReady);
	twitchclient.on("close", onClose);
	twitchclient.on("error", onError);
	twitchclient.on("PRIVMSG", onMessageArrive);
	twitchclient.on("RECONNECT", onReconnect);
	twitchclient.on("CLEARCHAT", onBan);
}

function onConnecting(){
	nlt.util.printtolog(LOG_WARN, `<dti> 1/3 Connecting to TMI`);
}
function onConnect(){
	nlt.util.printtolog(LOG_WARN, `<dti> 2/3 Successfully connected to TMI\n<dti> 3/3 Attempting to log in...`);
}
function onReady(){
	nlt.util.printtolog(LOG_WARN, `<dti> Login successful. Chatclient is ready.`);
	let f, cmstr="";
	try{
		f = nlt.fs.readFileSync(process.cwd()+"/.git/refs/heads/main");
	}
	catch(err){
		nlt.util.printtolog(LOG_WARN, `<twitch> Cannot read latest commit ORIG_HEAD: ${err}`);
	}
	if(f){
		cmstr="commit: "+String(f).substr(0, 6)+", ";
	}
	postmsg(nlt.chctl.findChannel(nlt.c.twitch.username, "twitch"), `noirePls connected (${cmstr}session: ${nlt.starttime})`);
	
	joinChannels();
}
function onClose(){
	nlt.util.printtolog(LOG_WARN, `<dti> Connection to TMI was closed.`);
}

function onReconnect(){
	nlt.util.printtolog(LOG_WARN, `<dti> Client reconnecting per TMI request`);
}
function onError(ierror){
	nlt.util.printtolog(LOG_WARN, `<dti> Client encountered a TMI error: ${ierror}`);
	if (String(ierror).match(/CapabilitiesError/)){
		nlt.util.printtolog(LOG_WARN, `Fatál: communication error to TMI detected, cannot continue. Terminating application.`);
		process.exit(1);
		return;
	}
	if (String(ierror).match(/LoginError/)){
		nlt.util.printtolog(LOG_WARN, `Fatál: communication error to TMI detected, cannot continue. Terminating application.`);
		process.exit(1);
		return;
	}
}

async function onMessageArrive (inmsg) {
	//Twitch specific messagearrive function
	
	if (inmsg.senderUsername === nlt.c.twitch.username) return;
	
	//easier to type Pepega Clap
	let unick 	= inmsg.senderUsername;
	let message = inmsg.messageText;
	let channel = nlt.chctl.findChannel(inmsg.channelName, "twitch");
	if(channel === -1){
		nlt.util.printtolog(LOG_WARN, `<twitch> Warning: received message from an unknown channel ${inmsg.channelName}, not handling it`);
		return;
	}
	
	
	let rrows=await nlt.maindb.PselectQuery(`SELECT * FROM bans WHERE username='${unick}' AND command='_global';`);
	if (rrows.length>0) return;	//discarding messages of any kind from globally banned users.
	
	let handled=false;

	let in_cmd = message.trim().split(" ");				//trim front and rear whitespace
	//in_cmd = in_cmd.split(" ");						//turn text to array based on spaces

	if(nlt.channels[channel].chmode ==="1") return;
	//no action if the channel is in singleuser but the user isn't the operator
	//TODO: should this be enabled for sudoers too?
	if(nlt.channels[channel].chmode ==="S" && unick!=nlt.c.usr_admin) return;


	if(in_cmd[0][0] === nlt.c.cmd_prefix && in_cmd[0].length > 1)
		handled = nlt.cmd.process_command(message.substr(1), unick, channel, inmsg, "twitch");
	else
		handled = nlt.cmd.process_special_message(inmsg, unick, channel, "twitch");

	//if we got to this point then the message was not a command or a special line we handle as a command eShrug
	const botname = new RegExp(nlt.c.twitch.username, "i");
	if (!handled && botname.test(message) && !nlt.util.knownBots.has(unick.toLowerCase())){
		if ((nlt.util.getunixtime() - lastbing) > 20){
			lastbing = nlt.util.getunixtime();
			postmsg(channel, `${unick} FeelsDankMan 🤜 🔔`, undefined, false);
		}
	}
}

async function onBan(inMsg){
	const minTO = 60*60*2;	//2h
	let duration = inMsg.banDuration;
	let channel = inMsg.channelName;
	let username = inMsg.targetUsername;
	if(inMsg.isPermaban()){
		postmsg(nlt.chctl.findChannel(nlt.c.twitch.username, "twitch"), `MODS Clap #${channel} ${username} was permanently banned. https://logs.ivr.fi/?channel=${channel}&username=${username}`);
		return;
	}
	if(inMsg.isTimeout()){
		if(duration>=minTO)
			postmsg(nlt.chctl.findChannel(nlt.c.twitch.username, "twitch"), `MODS 👉🏽 #${channel} ${username} was timed out for ${nlt.util.donktime(duration)}. https://logs.ivr.fi/?channel=${channel}&username=${username}`);
	}
}

async function postmsg(target_channel, tmsg, flags=[]){
	if(!nlt.channels[target_channel]){
		nlt.util.printtolog(LOG_WARN, `<twitch postmsg> received undefined channel ID ${target_channel}, excuse me wtf r u doin`);
		return;
	}
	const fflags = new Set(flags);
	let mprio;
	if (fflags.has("highprio"))
		mprio = 100;
	else
		mprio = 0;
	//sanitize text to dont screw with sqlite
	let ibp = nlt.util.internal_banphrase(tmsg);
	let outmsg = String(tmsg).replace(/'/g, "''");
	await nlt.logdb.PinsertQuery(`INSERT INTO selfposts (session, time, channel, message, ibp) VALUES ('${nlt.starttime}', '${nlt.util.getunixtime()}', '${target_channel}', '${outmsg}', '${ibp}');`);
	let antispam = nlt.channels[target_channel].getLts();
	if(ibp){
		outmsg = "Reply text triggered an internal banphrase.";
	}
	if (nlt.channels[target_channel].bpapi === "none"){
		await nlt.msgqdb.PinsertQuery(`INSERT INTO mq (targetchannel, message, priority, context) VALUES ('${target_channel}', '${outmsg}${antispam}', '${mprio}', 'twitch');`);
	} else {
		pbotBanphraseCheck(nlt.channels[target_channel].bpapi, outmsg).then((bpdata) => {
			if (!bpdata.banned){
				nlt.msgqdb.insertQuery(`INSERT INTO mq (targetchannel, message, priority, context) VALUES ('${target_channel}', '${outmsg}${antispam}', '${mprio}', 'twitch');`);
			} else {
				nlt.util.printtolog(LOG_INFO, `<bpapi> text "${outmsg}" triggered (priority: ${mprio}) a banphrase in channel "${target_channel}"`);
				nlt.util.printtolog(LOG_INFO, `<bpapi> -> ${JSON.stringify(bpdata)}`);
				nlt.msgqdb.insertQuery(`INSERT INTO mq (targetchannel, message, priority, context) VALUES ('${target_channel}', 'Reply text is banphrased monkaS${antispam}', '0', 'twitch');`);
			}
		}).catch((err) => {
			nlt.msgqdb.insertQuery(`INSERT INTO mq (targetchannel, message, priority, context) VALUES ('${target_channel}', 'Banphrase API error monkaS ${antispam}', '0', 'twitch');`);
			nlt.util.printtolog(LOG_INFO, `<postmsg> Failure checking the pajbot banphrase API in channel "${target_channel}"`);
			return;
		});
	}
}

async function twmessagequeue(){
	let lastcmd = Date.now();
	let wecoo = 0;
	let imq, ctlwait;

	while(1){
		imq = await nlt.msgqdb.PselectQuery(`SELECT * FROM mq WHERE context='twitch' ORDER BY priority DESC, id ASC LIMIT 1;`);
		if (imq.length === 0){
			await nlt.util.sleep(100);
			continue;
		}
		while(!twitchclient.ready){
			if (wecoo){
				nlt.util.printtolog(LOG_WARN, "<tw-msgq> TMI is not operational. Pausing message queue.");
				wecoo = 0;
			}
			await nlt.util.sleep(100);
		}
		if (!wecoo){
			nlt.util.printtolog(LOG_WARN, "<tw-msgq> TMI is now operational, message queue resuming operation.");
			wecoo = 1;
		}
		//When doing THIS \/ we only delay replies when needed and only by time needed
		ctlwait = nlt.c.msgq_delay - (Date.now() - lastcmd);
		if (ctlwait > 0 ) await nlt.util.sleep(ctlwait);

		try {
			await twitchclient.say(nlt.channels[imq[0].targetchannel].name, imq[0].message);
		}
		catch(errval){
			nlt.util.printtolog(LOG_WARN, `<tw-msgq> TMI SayError: ${errval}`);
		}
		await nlt.msgqdb.PinsertQuery(`DELETE FROM mq WHERE id='${imq[0].id}';`);	
		lastcmd = Date.now();
	}
}


async function joinTwitchChannel(target_channel){
	twitchclient.join(target_channel).then(() => {
		nlt.util.printtolog(LOG_WARN, `<twitch> Successfully joined channel ${target_channel}`);
	}).catch((err) => {
		nlt.util.printtolog(LOG_WARN, `<twitch> Error while joining channel ${target_channel}: ${err}`);
	});
}

function joinChannels(){
	for(const ch of nlt.channels){
		if(ch.chmode != "0" && ch.context === "twitch"){
			joinTwitchChannel(ch.name);
		}
	}
}

function pbotBanphraseCheck(url, incmd){
	return new Promise((resolve, reject) => {
		const mdata = JSON.stringify({message: incmd});
		const https_options = {
			url: 'https://' + url + '/api/v1/banphrases/test',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': nlt.c.userAgent
			},
			body: 'message=' + incmd,
			timeout: 2000,
			retry: 2
		};
		nlt.got(https_options).json().then((d)=>{
			resolve(d);
		}).catch((err) => {
			nlt.util.printtolog(LOG_WARN, `<pajbot pbcheck> Error while trying to check "${incmd}" on server ${url}: ${err}`);
			reject(err);
		});
	});
}

function ping(){
	return new Promise((resolve, reject) => {
		let stime = new Date, pingtime;
		twitchclient.ping().then(()=>{
			pingtime = (new Date)-stime;
			resolve(`${pingtime}ms`);
			return;
		}).catch((err) => {
			nlt.util.printtolog(LOG_WARN, `<twitch> dti ping() error: ${err}`);
			reject("(unknown)");
			return;
		});
		
	});
}

function sendwhisper(unick, msg){
	if(!unick || !msg) return;
	twitchclient.whisper(unick, msg);
}

exports.Start = Start;
exports.client = twitchclient;
exports.sendwhisper = sendwhisper;
exports.pbotBanphraseCheck = pbotBanphraseCheck;
exports.cdctl = twcdctl;
exports.postmsg = postmsg;
exports.ping = ping;
exports.joinTwitchChannel = joinTwitchChannel;
exports.ttvAuthenticate = ttvAuthenticate;
