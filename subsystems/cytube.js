"use strict";
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");
const {printtolog, stringCheck} = require(process.cwd()+"/lib/nlt-tools.js");

let ctcdctl = new nlt.tools.TCooldownController("cytube");

const Cytube = require("cytube-connector");

let ctclient=new Object;


function Start(){
	if(!nlt.c.cytube){
		printtolog(LOG_WARN, `<cytube> Settings are missing from config. Cannot start the subsystem.`);
		return;
	}
	if(stringCheck(nlt.c.cytube.password) || stringCheck(nlt.c.cytube.username)){
		printtolog(LOG_WARN, `<cytube> Settings are missing from config. Cannot start the subsystem.`);
		return;
	}
	for (const c of nlt.channels){
		if(c.context!="cytube") continue;
		//NaM
	}
}

function onReady(

