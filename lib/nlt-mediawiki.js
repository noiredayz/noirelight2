"use strict";
const {printtolog, getRndInteger, replaceall} = require("./lib/nlt-tools.js");
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require("./lib/nlt-const.js");


function mwOpenSearch(sterms, wikiurl){
	return new Promise((resolve, reject) => {
		if(sterms.length===0){
			reject("empty search string");
			return;
		}
		const interms = replaceall(" ", "_", sterms);
		const https_options = {
			
		
	});
}
