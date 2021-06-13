"use strict";
/*
 * Twitch pubsub module of nlt
 * 
 * Based on the code of scriptorex:
 * https://github.com/Leppunen/scriptorex
 * Original code (c) 2019 Leppunen
 * Released under the MIT license, see the accompanying copying.txt
 * for the full text of the license.
 * 
 * Modifications made by: noiredayz 2020
 */


/* Logging levels */
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK

const RWS = require('reconnecting-websocket');
const WS = require('ws');
const crypto = require('crypto');
let psdb =  new nlt.db.TDatabaseControl(":memory:");
initPsDB();
let lastmsg = Date.now();
const wsdelay = 500;			//ms

let ps = new RWS('wss://pubsub-edge.twitch.tv', [], {WebSocket: WS, startClosed: true});

//pubsubTopics = [];

module.exports.connect = () => {
	ps.reconnect();
};

ps.addEventListener('open', function () {
		joinChannels();
	});

async function joinChannels(){
	await psdb.PinsertQuery("DELETE FROM ps;");
	nlt.util.printtolog(LOG_WARN, `<pubsub> Connected to Twitch pubsub. Adding listeners...`);
	let rrows = nlt.maindb.selectQuery("SELECT * FROM channels WHERE monitor='1' ORDER BY id ASC;");
	if (rrows.length===0){
		nlt.util.printtolog(LOG_WARN, `<pubsub> No channels are marked for monitoring ppL not starting.`);
		deletePsListener();
	} else {
		nlt.util.printtolog(LOG_DBG, `<pubsub> sql initializing ${rrows.length} channels for start/stop events`);
		for (let i=0; i<rrows.length; i++) {
			psdb.insertQuery(`INSERT INTO ps (name, topic, status, nonce) VALUES ('${rrows[i].name}', '', 'unknown', '');`);
			listenStreamStatus(rrows[i].name);
		}
	}
}	

function deletePsListener(){
	psdb.close();
	ps.close();
}

ps.addEventListener('message', ({data}) => {
	const msg = JSON.parse(data);
	switch (msg.type) {
	case 'PONG':
		break;

	case 'RESPONSE':
		handleWSResp(msg);
		break;

	case 'MESSAGE':
		if (msg.data) {
			const msgData = JSON.parse(msg.data.message);
			const msgTopic = msg.data.topic;
			switch (msgData.type) {
			case 'reward-redeemed':
                handleWSMsg({channel: msgData.data.redemption.channel_id, type: msgData.type, data: msgData.data.redemption});
                break;	
			case 'viewcount':
				//nlt.util.printtolog(LOG_INFO, `<pubsub> Channel viewcount update received, but it's not used so eShrug`);
				break;
			case 'commercial':
				nlt.util.printtolog(LOG_INFO, `<pubsub> A channel is running a commercial... uBlock gang WideHard`);
				break;
			case 'stream-up':
			case 'stream-down':
				handleWSMsg({channel: msgTopic.replace('video-playback.', ''), type: msgData.type});
				break;;
			default:
				nlt.util.printtolog(LOG_WARN, `<pubsub> unknown topic message type: [${msgTopic}] ${JSON.stringify(msgData)}`);
			}
		} else {
			nlt.util.printtolog(LOG_WARN, `<pubsub> no data associated with message [${JSON.stringify(msg)}]`);
		}
		break;
	case 'RECONNECT':
		nlt.util.printtolog(LOG_WARN, '<pubsub> Pubsub server sent a reconnect message. restarting the socket');
		ps.reconnect();
		break;
	default:
		nlt.util.printtolog(LOG_WARN, `<pubsub> received unknown pubsub message type: ${msg.type}`);
	}
});

async function listenStreamStatus (target_channel) {
	const nonce = crypto.randomBytes(20).toString('hex').slice(-8);
	//nlt.util.printtolog(LOG_DBG, `<pubsub> debug: subscribing to channel ${target_channel}`);
	await psdb.PinsertQuery(`UPDATE ps SET nonce='${nonce}', topic='video-playback' WHERE name='${target_channel}';`);
	const message = {
		'type': 'LISTEN',
		'nonce': nonce,
		'data': {
			'topics': [`video-playback.${target_channel}`],
			'auth_token': nlt.opts.identity.password,
		},
	};
	let g = wsdelay - (Date.now() - lastmsg);
	if (g>0) await nlt.util.sleep(g);
	ps.send(JSON.stringify(message));
	lastmsg = Date.now();
};

async function listenChannelPoints (target_channel) {
	const cnonce = crypto.randomBytes(20).toString('hex').slice(-8);
	await psdb.PinsertQuery(`UPDATE ps SET pnonce='${cnonce}' WHERE name='${target_channel}';`);
	const message = {
		'type': 'LISTEN',
		'nonce': nonce,
		'data': {
			'topics': [`video-playback.${target_channel}`],
			'auth_token': nlt.opts.identity.password,
		},
	};
	let g = wsdelay - (Date.now() - lastmsg);
	if (g>0) await nlt.util.sleep(g);
	ps.send(JSON.stringify(message));
	lastmsg = Date.now();
};

async function handleWSMsg (msg = {}) {
	let target_channel = msg.channel;
	let rrows, uptext, downtext;
	if (msg) {
		switch (msg.type) {
		case 'viewcount':
			//unused
			break;
		case 'reward-redeemed':
			//TODO: NaM
			nlt.util.printtolog(LOG_INFO, `<pubsub> Channelpoint redemption on channel ${target_channel} by ${msg.data.user.display_name}, item: ${msg.data.reward.title}, optional text if any: ${msg.data.usr_input}`);
			break;
		case 'stream-up':
			rrows = await nlt.maindb.PselectQuery(`SELECT ps_online_message FROM channels WHERE name='${target_channel}';`);
			if (rrows.length!=0)
				uptext = rrows[0].ps_online_message;
			else
				uptext = "Channel is online!";
			nlt.util.printtolog(LOG_WARN, `<pubsub> ${target_channel} is online`);
			rrows = await psdb.PselectQuery(`SELECT * FROM ps WHERE name='${target_channel}';`);
			if (rrows[0].status!='online'){
				await psdb.PinsertQuery(`UPDATE ps SET status='online' WHERE name='${target_channel}';`);
				nlt.postmsg(`${target_channel}`, uptext);
			}
			break;
		case 'stream-down':
			rrows = await nlt.maindb.PselectQuery(`SELECT ps_offline_message FROM channels WHERE name='${target_channel}';`);
			if (rrows.length!=0)
				downtext = rrows[0].ps_offline_message;
			else
				downtext = "Channel is now offline.";
			nlt.util.printtolog(LOG_WARN, `<pubsub> ${target_channel} is offline`);
			rrows = await psdb.PselectQuery(`SELECT * FROM ps WHERE name='${target_channel}';`);
			if (rrows[0].status!='offline'){
				await psdb.PinsertQuery(`UPDATE ps SET status='offline' WHERE name='${target_channel}';`);
				nlt.postmsg(`${target_channel}`, downtext);
			}
			break;
		}
	}
};

function handleWSResp (msg) {
	if (!msg.nonce) {
		nlt.util.printtolog(LOG_WARN, `<pubsub> Unknown message without nonce: ${JSON.stringify(msg)}`);
		return;
	}
	let rrows = psdb.selectQuery(`SELECT * FROM ps WHERE nonce='${msg.nonce}';`);
	if (msg.error) {
		nlt.util.printtolog(LOG_WARN, `<pubsub> Error occurred while subscribing to topic ${rrows[0].topic} for channel ${rrows[0].name}: ${msg.error}`);
	} else {
		nlt.util.printtolog(LOG_WARN, `<pubsub> Successfully subscribed to topic ${rrows[0].topic} for channel ${rrows[0].name}`);
	}
};

function initPsDB(){
	psdb.insertQuery("PRAGMA encoding = \"UTF-8\"");
	psdb.insertQuery(
	`CREATE TABLE "ps" (
	"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"topic" TEXT,
	"name"	TEXT NOT NULL UNIQUE,
	"status"	TEXT DEFAULT 'unknown',
	"nonce"	TEXT, 
	"pnonce" TEXT
	);`);
}

// Keepalive

setInterval(pspinger, 250 * 1000);

function pspinger(){
	ps.send(JSON.stringify({type: 'PING', }));
}
