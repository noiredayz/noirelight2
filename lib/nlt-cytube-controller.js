"use strict";
/* Logging levels */
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK

const Cytube = require('cytube-connector');

class TCytubeController{
	constructor(channel){
		this.channel = channel;
		nlt.util.printtolog(LOG_WARN, `<cytube> Set up controller for CyTube channel ${this.channel}`);
	}
	start(){
		
	}
	onReady(){
		
	}
	onError(in_err){
		
	}
	onMessageArrive(data){
		
	}
}
