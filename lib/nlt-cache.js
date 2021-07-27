"use strict;"
/*
 * Noirelight2 cache module
 * Redis is like a 3rd party thing so idk 
 * 
 * Also, it doesn't have a windows port, only a proprietary shitware DansGame
 * This module is good enough for the usage of the bot Copesen 
 */
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log everything

const cleanup_delay = 15000;	//ms
 
let thecache;

function InitCache(){
	thecache = new Array;
	cleanup();
	nlt.util.printtolog(LOG_WARN, `<cache> Cache initialized and cleanup started. Expired entries will be prunned every ${cleanup_delay}ms`);
}

function getd(dname, opts={} ){
	let idx = thecache.findIndex(i => i.name === dname);
	//return null if there is no data with that id
	if (idx === -1) return undefined;
	//return valid data
	if (thecache[idx].dexp < nlt.util.getunixtime()){
		return thecache[idx].data;
	}
	//check if asked for data that might be expired and return that
	//if the option is not set return undefined.
	if (opts.ignoreExpired)
		return thecache[idx].data;
	else return undefined;	
}

function setd(dname, dval, dexpr=0){
	if(!dname || dname==="") return 1;			//invalid name
	if(dname.length<3) return 2;				//too short name
	if(dval===undefined) return 3;				//undefined value
	if(dexpr<0) return 4;						//expiry time that makes no sense
	let texp;
	if(dexpr===0)
		texp = 0;
	else	
		texp = dexpr+nlt.util.getunixtime();
	
	thecache.push({name: dname, data: dval, dexp: texp});
	return 0;
	
}

function deld(dname){
	let idx = thecache.findIndex(i => { if(i) return i.name === dname; else return false; });
	if (idx === -1) return false;
	delete thecache[idx];
	return true;
}

function stat(returnJSON=false){
	let kc=0, jskc=0;
	for(let i of thecache){
		if(i){
			if(i.expires<nlt.util.getunixtime()) continue;
			kc++;
			//TODO: compex data types (json, array, object etc.) here.
			//basically shit that's not just number or string Okayeg
		}
	}
	if(returnJSON){
		//TODO: add compex object count to result json
		return {keyCount: kc};
	} else {
		return `valid keys: ${kc}`;
	}
}


async function cleanup(){
	let i;
	while(1){
		await nlt.util.sleep(cleanup_delay);
		for(i=0;i<thecache.length;i++){
			if(!thecache[i]) continue;
			if(!thecache[i].dexp || thecache[i].dexp===0) continue;
			if(thecache[i].dexp<nlt.util.getunixtime())
				delete thecache[i];
		}
	}
}

exports.InitCache = InitCache;
exports.deld = deld;
exports.getd = getd;
exports.setd = setd;
exports.stat = stat;

