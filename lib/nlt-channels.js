"use strict";
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");
const {helixGetData} = require(process.cwd()+"/lib/nlt-got.js");

class TChannel{
	constructor (name, chmode, context, bpapi, sr, monitor, chid, links, monitorbans, pb2, offlineOnly) {
		this.name = name;
		this.chmode = chmode;
		this.context = context;
		this.bpapi = bpapi;
		this.sr = sr;
		this.lts = 0;
		this.monitor = monitor;
		this.chid = chid;
		this.links = links;
		this.monitorbans = monitorbans;
		this.pb2 = pb2;
		this.offlineOnly = offlineOnly;
	}
	getLts(){
		if (this.lts===0){
			this.lts=1;
			return ' \u{E0000}';
		} else {
			this.lts = 0;
			return '';
		}
	}
}

function findChannel(name, context){
	const retval = nlt.channels.findIndex(tch => tch.name === name && tch.context === context);
	//if(retval === -1)
	//	nlt.util.printtolog(LOG_DBG, `<findch> Warning: received unknown channel "${name}" with context "${context}"`);
	return retval;	
}

function LoadChannels(){
	let rrows = nlt.maindb.selectQuery("SELECT * FROM channels ORDER BY id ASC;");
	if (rrows.length===0){
		nlt.util.printtolog(LOG_WARN, `<loadch> Couldn't find any channels in sql, you sure about this m8?`);
		return;
	}
	let a;
	rrows.forEach(row => { a= LoadSingleChannel(row); });
	nlt.util.printtolog(LOG_WARN, `<loadch> Loading channels complete, loaded a total of ${nlt.channels.length} channels.`);
	
}
//constructor (name, chmode, context, bpapi, sr, monitor, chid)
function LoadSingleChannel(chr){
	if((!chr.chid || chr.chid===0) && chr.context==="twitch"){
		nlt.util.printtolog(LOG_INFO, `<loadch> ${chr.name} has no twitch ID set, attempting to get it from Helix.`);
		helixGetData("users", "login="+chr.name).then((data) => {
			if(data){
				nlt.util.printtolog(LOG_INFO, `<loadch> Successfully updated the channel id of channel ${chr.name} to ${data[0].id}`);
				nlt.maindb.insertQuery(`UPDATE channels
										SET chid='${data[0].id}'
										WHERE name='${chr.name}' AND context='twitch';`);
				nlt.channels.push(new TChannel(chr.name, chr.chmode, chr.context, chr.bpapi_url, chr.sr, chr.monitor, data[0].id, chr.links, chr.monitorbans, chr.pajbot2, chr.offlineOnly));
				return 2;
			} else {
				nlt.utl.printtolog(LOG_INFO, `<loadch> warning: helix returned an empty set when searching for user ${chr.name} does that channel even exist?`);
				nlt.channels.push(new TChannel(chr.name, chr.chmode, chr.context, chr.bpapi_url, chr.sr, chr.monitor, chr.chid, chr.links, chr.monitorbans, chr.pajbot2, chr.offlineOnly));
				return 1;
			}
		}).catch((err)=>{
			nlt.utl.printtolog(LOG_INFO, `<loadch> warning: helix returned an error when searching for user ${chr.name}: ${err}`);
			nlt.channels.push(new TChannel(chr.name, chr.chmode, chr.context, chr.bpapi_url, chr.sr, chr.monitor, chr.chid, chr.links, chr.monitorbans, chr.pajbot2, chr.offlineOnly));
			return 1;
			});
	} else {
		nlt.channels.push(new TChannel(chr.name, chr.chmode, chr.context, chr.bpapi_url, chr.sr, chr.monitor, chr.chid, chr.links, chr.monitorbans, chr.pajbot2, chr.offlineOnly));
		return 0;
	}
}

exports.LoadChannels	= LoadChannels;
exports.findChannel		= findChannel;
exports.LoadSingleChannel = LoadSingleChannel;
