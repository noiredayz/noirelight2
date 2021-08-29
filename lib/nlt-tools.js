"use strict";
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");
let _replaceall;
if(!String.replaceAll){
	try{
		_replaceall = require("replaceall");
	}
	catch(err){
		printtolog(LOG_WARN, `<nlt-tools> Warning: current nodejs doesn't support String.replaceall but the module verison of it cannot be loaded: ${err}`);
	}
}

function getunixtime(){
	return Math.floor(new Date / 1000 );
}

function replaceall(_what, _with, _where){
	if(String.replaceAll){
		return _where.replaceAll(_what, _with);
	} else {
		return _replaceall(_what, _with, _where);
	}
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printtolog (llvl, sText) {
	if (llvl <= nlt.c.loglevel){
		console.log(`${sText}`);
		const timestamp = getunixtime() - nlt.starttime+1;
		if (nlt.logfile){
			nlt.fs.writeSync(nlt.logfile, `[${timestamp}] ${sText}${nlt.os.EOL}`);
		}
	}
}

function cleanupArray(inArray){
	let retval = [];
	for(const c of inArray){
		if(!c || c===" " || c==="" || c===`\u{E0000}`) continue;
		retval.push(c);
	}
	return retval;
}

class TCooldownController{
	constructor(context="twitch"){
		this.context = context;
	}
	cprinttolog(sText){
		nlt.util.printtolog(LOG_WARN, `<${this.context} cdctl> ${sText}`);
	}
	setCD(unick, target_channel, cmdname){
		if (unick === nlt.c.usr_adming) return;
		if(!unick.length || isNaN(target_channel) || !cmdname.length){
			this.cprinttolog(`Cannot set cooldown: invalid argument`);
			return;
		}
		let c = nlt.msgqdb.insertQuery(`INSERT INTO cooldowns
										(channel, unick, cmdname, posttime)
										VALUES
										('${target_channel}', '${unick}', '${cmdname}', '${nlt.util.getunixtime()}');`);
		return c;
	}
	setSecurityTimeout(unick){
		if(unick.length<3){
			this.cprinttolog(`Cannot set security timeout: invalid argument`);
			return;
		}
		let c = nlt.msgqdb.insertQuery(`INSERT INTO cooldowns
										(channel, unick, cmdname, posttime)
										VALUES
										('__global_security', '${unick}', '__global_security_cd', '${nlt.util.getunixtime()}');`);
		return c;
	}
	getUserSecTO(unick){
		
		if(unick.length<3){
			this.cprinttolog(`Cannot get security timeout: invalid argument`);
			return;
		}
		let rrows = nlt.msgqdb.selectQuery(`SELECT *
											FROM cooldowns
											WHERE channel='__global_security' AND unick='${unick}'
											ORDER BY id DESC
											LIMIT 1;`);
		if(!rrows){
			this.cprinttolog(`Cannot get user security CD due to an sql error (nick: ${unick})`);
			return -1;
		}
		if(rrows.length===0)
			return 0;
		let tm_exp = Number(nlt.util.getunixtime() - rrows[0].posttime);
		if	(tm_exp >= nlt.c.sec_to_len)
			return 0;
		else
			return 1;
	}
	getUserCD(unick, target_channel, cmdname){
		let cmdid;
		cmdid = nlt.cmd.cmds.findIndex(c => c.cmdname === cmdname);
		if(cmdid === -1){
			this.cprinttolog(`Cannot get user CD of nonexistent command "${cmdname}"`);
			return -1;
		}
		if(!nlt.channels[target_channel]){
			this.cprinttolog(`Cannot get user CD in nonexistent channel "${nlt.channels[target_channel].name}"`);
			return -1;
		}
		let rrows = nlt.msgqdb.selectQuery(`SELECT *
											FROM cooldowns
											WHERE unick='${unick}' AND channel='${target_channel}' AND cmdname='${cmdname}'
											ORDER BY posttime DESC
											LIMIT 1;`);
		if(!rrows){
			this.cprinttolog(`Cannot get user CD due to an sql error (nick: ${unick}, ch: ${nlt.channels[target_channel].name}, cmd: ${cmdname}`);
			return -1;
		}
		if(rrows.length===0)
			return 0;
		let cmd_cd = nlt.cmd.cmds[cmdid].cooldowns.user;
		let tm_exp = nlt.util.getunixtime() - rrows[0].posttime;
		if (tm_exp >= cmd_cd)
			return 0;
		else
			return 1;

	}
	getCmdCCD(target_channel, cmdname){
		let cmdid;
		cmdid = nlt.cmd.cmds.findIndex(c => c.cmdname === cmdname);
		if(cmdid === -1){
			this.cprinttolog(`Cannot get channel CD of nonexistent command "${cmdname}"`);
			return -1;
		}
		if(!nlt.channels[target_channel]){
			this.cprinttolog(`Cannot get command's channel CD in nonexistent channel "${nlt.channels[target_channel].name}"`);
			return -1;
		}
		let rrows = nlt.msgqdb.selectQuery(`SELECT *
											FROM cooldowns
											WHERE channel='${target_channel}' AND cmdname='${cmdname}'
											ORDER BY posttime DESC
											LIMIT 1;`);
		if(!rrows){
			this.cprinttolog(`Cannot get channel CD due to an sql error (ch: ${nlt.channels[target_channel].name}, cmd: ${cmdname}`);
			return -1;
		}
		if(rrows.length===0) return 0;
		let cmd_cd = nlt.cmd.cmds[cmdid].cooldowns.channel;
		if ((nlt.util.getunixtime() - rrows[0].posttime) >= cmd_cd)
			return 0;
		else
			return 1;
	}
	getCmdGCD(cmdname){
		let cmdid;
		cmdid = nlt.cmd.cmds.findIndex(c => c.cmdname === cmdname);
		if(cmdid === -1){
			this.cprinttolog(`Cannot get global CD of nonexistent command "${cmdname}"`);
			return -1;
		}
		let rrows = nlt.msgqdb.selectQuery(`SELECT *
											FROM cooldowns
											WHERE cmdname='${cmdname}'
											ORDER BY posttime DESC
											LIMIT 1;`);
		if(!rrows){
			this.cprinttolog(`Cannot get command's global CD due to an sql error (cmd: ${cmdname}`);
			return -1;
		}
		if(rrows.length===0) return 0;	//if no lines are returned this command was not used at all.
		let cmd_cd = nlt.cmd.cmds[cmdid].cooldowns.global;
		if ((nlt.util.getunixtime() - rrows[0].posttime) >= cmd_cd)
			return 0;
		else
			return 1;
	}
	getChannelCD(target_channel){
		if(!nlt.channels[target_channel]){
			this.cprinttolog(`Cannot get channel CD in nonexistent channel "${nlt.channels[target_channel].name}"`);
			return -1;
		}
		let rrows = nlt.msgqdb.selectQuery(`SELECT *
											FROM cooldowns
											WHERE channel='${target_channel}'
											ORDER BY posttime DESC
											LIMIT 1;`);
		if(!rrows){
			this.cprinttolog(`Cannot get channel CD due to an sql error.`);
			return -1;
		}
		if(rrows.length===0) return 0;	//if no lines are returned the channel is not on cd.
		if ((nlt.util.getunixtime() - rrows[0].posttime) >= nlt.c.chcd)
			return 0;
		else
			return 1;
	}
	getCombined(unick, target_channel, cmdname){
		//extempt the operator from cooldowns, learned this the donk way
		if (unick === nlt.c.usr_admin) {
			//nlt.util.printtolog(LOG_DBG, `<cdctl> ${unick} is extempted from cooldowns`);
			return 0;
		}	
		
		let uCD = this.getUserCD(unick, target_channel, cmdname);
		let cCD = this.getCmdCCD(target_channel, cmdname);
		let gCD = this.getCmdGCD(cmdname);
		let chCD = this.getChannelCD(target_channel);
		//nlt.util.printtolog(LOG_DBG, `<debug>cdctl ${uCD}/${cCD}/${gCD}/${chCD}`);
		if (uCD === -1 || cCD === -1 || gCD === -1 || chCD === -1)
			return -1
		else
			return (uCD || cCD || gCD || chCD);
	}
}

function donktime(nsecs){
	//Yeah, but moment.js is a 3rd party thing and idk
	if(isNaN(nsecs)) return "NaM";
	let tday, thour, tmin, tsecs;
	let retval = "";

	tsecs 	= nsecs;
	tday	= Math.floor(tsecs/86400);
	tsecs  -= tday*86400;
	thour	= Math.floor(tsecs/3600);
	tsecs  -= thour*3600
	tmin	= Math.floor(tsecs/60);
	tsecs  -= tmin*60;

	if(tday>0) retval = retval.concat(`${tday}d `);
	if(thour>0) retval = retval.concat(`${thour}h `);
	if(tmin>0) retval = retval.concat(`${tmin}min `);
	if(tsecs>0) retval = retval.concat(`${tsecs}sec`);

	return retval;
}

function memusage(){
	let gg = Number(process.memoryUsage().rss)/1024/1024;
	return `${gg.toFixed(2)}MiB`;
}

function internal_banphrase(stext){
	//const trashEmotes = new Set(['KEKW', 'BibleThump', 'AngelThump', 'pepeJAM', 'pepeJAMMER', 'pepeJAMJAM', 'AYAYA', 'FeelsBirthdayMan', 'FeelsStrongMan', 'FeelsStrongJAM']);
	//incomplete list of various, commonly used slurs
	const racism = new Set(['nigger', 'negro', 'nigga', 'nibba', 'boong', 'slanteye']);
	const phobic = new Set (['fag', 'faggot', 'lesbo', 'dyke', 'tranny', 'trannie']);
	let stx = String(stext).split(" ");
	for(let i=0;i<stx.length;i++){
		if (racism.has(stx[i]) || phobic.has(stx[i])) return 1;
	}
	return 0;
}

function su_check(unick, target_channel, context){
	if (unick === nlt.c.usr_admin.toLowerCase()) return 3;
	if (unick.toLowerCase() === nlt.channels[target_channel].name) return 2;
	let rrows = nlt.maindb.selectQuery(`SELECT * FROM grants WHERE channel='${nlt.channels[target_channel].name}' AND context='${context}' AND unick='${unick}';`);
	if (rrows.length>0){
		return 1;
	} else {
		return 0;
	}
}

//donk promise based "wrapper" for su_check for executing shit with .then and co.
function Psu_check(unick, target_channel, su_level){
	return new Promise((resolve, reject) => {
		let g = su_check(unick, target_channel);
		if (g>=su_level)
			resolve(g);
		else
			reject(g);
	})
}

function locateCharInStr(sText, sChar, pos=1){
	if(typeof(sText) != "string")	return -2;	//parameter was not a string
	if(sChar.length  != 1)			return -3;		//searched character was more than a character
	if(pos<1 && pos>sText.length)	return -4;	//requested position is out of bound

	let i, g=0;
	for(let i=0;i<sText.length-1;i++){
		if(sText[i] === sChar){
			g++;
			if(g===pos) return i;
		}
	}
	if(g>0)
		return -1;	//character was found, but less than the asked
	else
		return -5;	//character was not found
}

function PlocateCharInStr(sText, sChar, pos=1){
	return new Promise((resolve, reject) => {
	        if(typeof(sText) != "string")   reject("first parameter not a string");
        	if(sChar.length  != 1)          reject("second parameter not a character");
	        if(pos<1 && pos>sText.length)   reject("invalid position");

        	let i, g=0;
	        for(let i=0;i<sText.length-1;i++){
	                if(sText[i] === sChar){
	                        g++;
	                        if(g===pos) resolve(i)
	                }
	        }
	        if(g>0)
	                reject("character found, but less than the amount");
	        else
	                reject("character not found");

	})
}

function tlToStr(rlv){
	switch(rlv){
		case "0":
			return "not handled";
			break;
		case "1":
			return "disabled";
			break;
		case "S":
			return "single-user";
			break;
		case "2":
			return "normal";
			break;
		default:
			return "unknown";
			break;
	}
}

function floatToPercentText(sNum){
	if(isNaN(sNum)) return "NaM";
	return Number(sNum*100).toFixed(2);
}

//incomplete list of known bots to be used by some functions.
const knownBots = new Set ([
  'botdonk',          'botfactory',
  'charlestonbieber', 'egexchange',
  'enlightenbot',     'huwobot',
  'kunszgbot',        'mm_sutilitybot',
  'nam_nam_bot',      'nightbot',
  'obote',            'okayegbot',
  'pajbot',           'scriptorex',
  'snusbot',          'spergbot02',
  'streamelements',   'supibot',
  'supidev',          'supinifrontend',
  'thepositivebot',   'titlechange_bot',
  'buttsbot'
]);
const high_load_channels = new Set(["forsen", "xqcow"]);
exports.valid_chmodes = new Set(["0", "1", "2", "S"]);


exports.getunixtime = getunixtime;
exports.getRndInteger = getRndInteger;
exports.sleep = sleep;
exports.printtolog = printtolog;
exports.donktime = donktime;
exports.memusage = memusage;
exports.internal_banphrase = internal_banphrase;
exports.knownBots = knownBots;
exports.su_check = su_check;
exports.Psu_check = Psu_check;
exports.TCooldownController = TCooldownController;
exports.locateCharInStr = locateCharInStr;
exports.PlocateCharInStr = PlocateCharInStr;
exports.high_load_channels = high_load_channels;
exports.tlToStr = tlToStr;
exports.floatToPercentText = floatToPercentText;
exports.replaceall = replaceall;
exports.cleanupArray = cleanupArray;
