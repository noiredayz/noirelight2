"use strict";
const {printtolog, getRndInteger} = require("./lib/nlt-tools.js");
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require("./lib/nlt-const.js");
const aidenGetUID = "https://customapi.aidenwallis.co.uk/api/v1/twitch/toID/"; //add channel name right after this


const fake_user_agents = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36" ];
//more to be added is required

function getRandomUserAgent(){
	return fake_user_agents[getRndInteger(0, fake_user_agents.length-1)];
}

let helix = new Object;
helix.status = 0;

helix.init = async function(){
	if(!nlt.ss["twitch"]){
		printtolog(LOG_WARN, `<helix> Initialization failure: Cannot use helix without a working Twitch subsystem.`);
		helix.status = 0;
		return;
	}
	if(!nlt.c.twitch.clientID || !nlt.c.twitch.clientSecret){
		printtolog(LOG_WARN, `<helix> Initialization failure: missing Twithc App creditenials (client ID and/or secret)`);
		helix.status = 0;
		return;
	}
	try{
		await nlt.ss["twitch"].ttvAuthenticate();
	}
	catch(err){
		printtolog(LOG_WARN, `<helix> Unable to initialize, see the Twitch SS auth error above if any.`);
		helix.status = 0;
		return;
	}
	printtolog(LOG_INFO, `<helix> Initialization complete Okayge`);
	helix.status = 1;
	return 0;
}

helix.getUserID = function(unick){
	return new Promise((resolve, reject) => {
		if(helix.status===0){
			printtolog(LOG_INFO, `<helix-uid> Warning: Helix is not ready. Getting user ID using Aiden's CustomAPI`);
			
		};
	});
}

