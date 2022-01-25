"use strict;"
/*
 * Noirelight2 cache module, providing caching in native nodejs objects
 * Also, Redis is like a 3rd party thing so idk
 * 
 */
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");

const cleanup_delay = 15000;	//ms
 
let thecache;

function InitCache(){
	thecache = new Array;
	cleanup();
	nlt.util.printtolog(LOG_WARN, `<cache> Cache initialized and cleanup started. Expired entries will be prunned every ${cleanup_delay}ms`);
}

function getd(dname, opts={} ){
	let idx = thecache.findIndex(i => {if (i) return i.name === dname; else return false;});
	//return null if there is no data with that id
	if (idx === -1) return undefined;
	//return valid data
	if (thecache[idx].dexp > nlt.util.getunixtime() || thecache[idx].dexp===0){
		return thecache[idx].data;
	}
	//check if asked for data that might be expired and return that
	//if the option is not set return undefined.
	if (opts.ignoreExpired)
		return thecache[idx].data;
	else return undefined;	
}

function setd(dname, dval, dexpr=0){
	if(!dname || dname==="")	throw new TypeError("cache setd: undefined or zero length variable name");
	if(dname.length<3)			throw new Error(`cache setd: too short variable name ${dname.length} < 3`);
	if(dval===undefined)		throw new TypeError("cache setd: undefined cache data, set it to anything (emptry string or 0) if unused/irrelevant");
	if(dexpr<0)					throw new RangeError("cache setd: negative expiration time makes no sense, it must be 0 for non-expiring and >0 for expiring");
	let texp=0;
	if(dexpr===0)
		texp = 0;
	else	
		texp = dexpr+nlt.util.getunixtime();
	
	thecache.push({name: dname, data: dval, dexp: texp});
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
			//TODO: optionally count complex data types here
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

