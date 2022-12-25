"use strict";
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");
const {printtolog, validateTwitchUsername} = require(process.cwd()+"/lib/nlt-tools.js");
const {helixGetData} = require(process.cwd()+"/lib/nlt-got.js");



function twGetUserByID(uID){
return new Promise((resolve, reject) =>{
	if(isNaN(uID)){
		reject(new TypeError(`twGetUserByID: parameter must be a number`));
		return;
	}
	let retval;
	retval = nlt.maindb.selectQuery(`SELECT * from twUsers WHERE uid='${uID}';`);
	if(retval.length===0){
		helixGetData("users", "id="+uID).then((d) =>{
			
		}
	} else 
		resolve(retval[0]);
});	
}

function twGetUserByName(unick){
return new Promise(async(resolve, reject) =>{
	if(validateTwitchUsername(unick)){
		reject(new TypeError(`twGetUserByID: not a valid Twitch username`));
		return;
	}
	let retval;
	retval = nlt.maindb.selectQuery(`SELECT * from twUsers WHERE nickname='${unick}';`);
	if(retval.length===0){
		
	} else 
		resolve(retval[0]);
});	
}
