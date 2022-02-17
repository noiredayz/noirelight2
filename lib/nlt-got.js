"use strict";
const {printtolog, getRndInteger, floatToPercentText, stringCheck, getAuthKey, isJSON} = require(process.cwd()+"/lib/nlt-tools.js");
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");


const fake_user_agents = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36" ];
//more to be added is required

function getRandomUserAgent(){
	return fake_user_agents[getRndInteger(0, fake_user_agents.length-1)];
}

function hxGetUserData(query, method){
return new Promise(async (resolve, reject) => {
	//note: not making many checks here
	//the calling functions and commands should be responsible for supplying valid parameters
	//otherwise gachiPls HTTP 400
	
	if(!(method==="login" || method==="id")){
		reject("invalid method (must be login or id)");
		return;
	}
	
	await nlt.ss["twitch"].ttvAuthenticate();
	//not even catching here KUKLE
	const helixKey = getAuthKey("twitch-helix-oauth", "bearer");
	
	const https_options = {
		url: "https://api.twitch.tv/helix/users?"+method+"="+query,
		method: "GET",
		headers:{
			'User-Agent': nlt.c.userAgent,
			'Authorization': 'Bearer '+helixKey,
			'Client-ID': nlt.c.twitch.clientID
		},
		retry: 2,
		timeout: 2000
	};
	let retval;
	try{
		retval = await nlt.got(https_options);
	}
	catch(err){
		printtolog(LOG_WARN, `<helix getuserdata> Error while trying to query Twitch: ${err}`);
		reject(err);
	}
	const rdata = JSON.parse(retval.body);
	if(rdata.data.length === 0) resolve(undefined);
	else resolve(rdata.data[0]);
			
	
		
});
}

function nsfwCheckURL(inURL){
	return new Promise((resolve, reject) => {
	if(!nlt.c.deepai_key){
		reject("missing API key for deepAI");
		return;
	}
	if(inURL.length===0){
		reject("empty string");
		return;
	}
	let tlHttpOpts = {
		method: "POST",
		responseType: "json",
		url: "https://api.deepai.org/api/nsfw-detector",
		headers: {
			"Api-Key": nlt.c.deepai_key,
			"User-Agent": nlt.c.userAgent
		},
		form: {
			image: inURL
			},
		retry: 2,
		timeout: 5000
		};
	nlt.got(tlHttpOpts).json().then((data) => {
		let retval="";
		if(data.output.nsfw_score){
			retval = `NSFW score: ${floatToPercentText(data.output.nsfw_score)}%, detection(s): `;
			if (data.output.detections.length===0){
				retval += "none";
				resolve(retval);
				return;
			} else {
				for(let i=0; i<data.output.detections.length;i++){
					retval += `${shortCatText(data.output.detections[i].name)} (${floatToPercentText(data.output.detections[i].confidence)}%) `;
				}
				resolve(retval);
				return;
			}
		}	
	}).catch((errVal) => {
		nlt.util.printtolog(4, `<nsfwCheckURL> Error while checking ${inURL}: ${errVal}`);
		reject(`got error while trying to run the API request.`);
	});
	});
	
}

function shortCatText(inText){
	switch(inText){
		case "Male Breast - Exposed":
			return "male breast";
			break;
		case "Male Genitalia - Exposed":
			return "penis";
			break;
		case "Male Genitalia - Covered":
			return "penis (covered)";
			break;
		case "Female Genitalia - Exposed":
			return "vagina";
			break;
		case "Female Genitalia - Covered":
			return "vagina (covered)";
			break;
		case "Female Breast - Exposed":
			return "breast";
			break;
		case "Female Breast - Covered":
			return "covered breast";
			break;
		case "Buttocks - Exposed":
			return "ass";
			break;
		case "Buttocks - Covered":	
			return "ass (covered)";
			break;
		default:
			return inText;
			break;
	}
}

function thumbnailExists(inUrl){
return new Promise((resolve, reject) =>{
	const https_options = {
		method: "HEAD",
		url: inUrl,
		timeout: 2000,
		retry: 2 };
	nlt.got(https_options).then((d) => {
		if(d.redirectUrls.length!=0)
			if(Array.isArray(d.request.redirects[0].match("404_preview")))
				resolve(false)
			else
				resolve(true)	
		else
			resolve(true);
	}).catch((err)=>{
		reject(err);
	});	
});	
}

/* Technically it could be enough to just check if the d.request.redirects
 * array exists and if it does then its a redir to 404.
 * However who knows then they add redirects to something other than
 * the gray 404 image. Better safe than sorry.
 */

function parseBraizeHealth(inStr){
	/* Example data:
	 * Uptime: 1231h2m6.289516249s - Memory: Alloc=710 MiB, TotalAlloc=34575273 MiB, Sys=3673 MiB, NumGC=157899
	 * GC stands for garbage collector cycles pennjillette.jpg
	 */
	 const b = inStr.split(" ");
	 const buptime = b[1].split(".")[0].replace("h", "h ").replace("m", "m ")+" s";
	 const balloc = b[4].split("=")[1];
	 const btotalalloc = b[6].split("=")[1];
	 const bsys = b[8].split("=")[1];
	 const bGC = b[10].split("=")[1];
	 return {uptime: buptime, alloc: balloc, totalalloc: btotalalloc, sys: bsys, totalgc: bGC};
}

exports.shortCatText = shortCatText;
exports.nsfwCheckURL = nsfwCheckURL;
exports.getRandomUserAgent = getRandomUserAgent;
exports.thumbnailExists = thumbnailExists;
