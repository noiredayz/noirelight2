"use strict";
const {printtolog, getRndInteger, floatToPercentText, stringCheck, getAuthKey, isJSON} = require(process.cwd()+"/lib/nlt-tools.js");
const {LOG_NO, LOG_DBG, LOG_INFO, LOG_WARN} = require(process.cwd()+"/lib/nlt-const.js");


const fake_user_agents = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36" ];
//more to be added is required

function getRandomUserAgent(){
	return fake_user_agents[getRndInteger(0, fake_user_agents.length-1)];
}

function helixGetData(source,  lparam){
return new Promise(async (resolve, reject) => {
	//note: not making many checks here
	//the calling functions and commands should be responsible for supplying valid parameters
	//otherwise gachiPls HTTP 400
	//lparam should be constructed by the caller function in a form like
	//id=321&page=32cf330
	//it will be appended after source which must be a helix GET endpoint
	//such as "users" okeg

	await nlt.ss["twitch"].ttvAuthenticate();
	//not even catching here KUKLE
	const helixKey = getAuthKey("twitch-helix-oauth", "bearer");

	let turl="";
	if(stringCheck(lparam))
		turl = "https://api.twitch.tv/helix/"+source+"?"+lparam;
	else
		turl = "https://api.twitch.tv/helix/"+source;

	const https_options = {
		url: turl,
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
		return;
	}
	const rdata = JSON.parse(retval.body);
	if(rdata.data.length === 0) resolve(undefined);
	else resolve(rdata.data);



});
}

function helixWhoAmI(){
return new Promise(async (resolve, reject) => {
	/* this separate function is required, because the users endpoint
	 * without parameters (which is the way to determine your own identity)
	 * only works with user tokens and not with the application token
	 * used by helixGetData.
	 * While helixGetData successfully returns the bots data when supplied
	 * with an ID or login name the whole point of getting own identity
	 * is to deprecate the need to save the bots account name and it at all
	 */
	 
	await nlt.ss["twitch"].ttvAuthenticate();
	//not even catching here KUKLE
	const helixKey = getAuthKey("twitch-access-token", "access-token");
	
	const https_options = {
		url: "https://api.twitch.tv/helix/users",
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
		return;
	}
	const rdata = JSON.parse(retval.body);
	if(rdata.data.length === 0) resolve("unhandled twitch API error (cannot look up own identity)");
	else resolve(rdata.data[0]);
});
}

/*
 * Handled opts:
 * returnArray (boolean): return an Array of the results, rather than formatted text
 * withFullCategories(boolean): in the formatted text reply mention every detected category.
 * 								this option is ignored if returnArray is true
 */

function nsfwCheckURL(inURL, opts={}){
return new Promise((resolve, reject) => {

const ignoredCategories = ["COVERED_GENITALIA_F", "COVERED_GENITALIA_M", "COVERED_BELLY"];
let retval="";

if(!stringCheck(inURL)){
	reject("must specify an URL");
	return;
}

if(inURL.toLowerCase().includes("imgur.com")){
	resolve("(new NSFW check api doesn't support imgur, click at your own risk)");
	return;
}

const rapi_key = getAuthKey("rapidapi-key", "apikey");
if(!rapi_key){
	reject("missing RapidAPI key for the NSFW check");
	return;
}

const https_options = {
  method: 'POST',
  url: 'https://nsfw-images-detection-and-classification.p.rapidapi.com/adult-content',
  headers: {
    'content-type': 'application/json',
    'X-RapidAPI-Key': rapi_key,
    'X-RapidAPI-Host': 'nsfw-images-detection-and-classification.p.rapidapi.com',
    'User-Agent': nlt.c.userAgent
  },
  body: JSON.stringify({ url: inURL })
};

nlt.got(https_options).json().then((d)=>{
	if(opts.returnArray){
		resolve(d);
		return;
	}
	if(d.unsafe) retval += "NSFW, ";
		else retval += "probably SFW, ";
	if(d.objects.length === 0){
		retval += "nothing detected";
		resolve(retval);
		return;
	}
	retval += "detected: ";
	for(const c of d.objects){
		if(opts.withFullCategories || (ignoredCategories.findIndex(i => i === c.label) === -1)){
			retval = retval + nsfwCategory(c.label) + "(" + floatToPercentText(c.score) + "%) ";
		}
	}
	resolve(retval);
	return;
}).catch((err)=>{
	printtolog(LOG_WARN, `<nsfwcheckurl> http request error: ${err}`);
	reject("http error while trying to check for NSFW content");
	return;
}); //catch
}); //promise
};  //function

function nsfwCategory(intext){
	const textMatch = [
			["EXPOSED_ANUS", "anus"],
			["EXPOSED_ARMPITS", "armpits"],
			["COVERED_BELLY", "belly(covered)"],
			["EXPOSED_BELLY", "belly"],
			["COVERED_BUTTOCKS", "ass(covered)"],
			["EXPOSED_BUTTOCKS", "ass(exposed)"],
			["FACE_M", "male"],
			["FACE_F", "female"],
			["COVERED_FEET", "feet"],
			["EXPOSED_FEET", "feet"],
			["COVERED_BREAST_F", "breasts(covered)"],
			["EXPOSED_BREAST_F", "breasts"],
			["COVERED_GENITALIA_F", "vagina(covered)"],
			["EXPOSED_GENITALIA_F", "vagina"],
			["EXPOSED_BREAST_M", "male chest BillyApprove "],
			["EXPOSED_GENITALIA_M", "penis"] ];
	for(const ccat of textMatch){
		if(ccat[0] === intext){
			return ccat[1];
		}
	}
	return intext;
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

exports.shortCatText = nsfwCategory;
exports.nsfwCheckURL = nsfwCheckURL;
exports.getRandomUserAgent = getRandomUserAgent;
exports.thumbnailExists = thumbnailExists;
exports.helixGetData = helixGetData;
exports.helixWhoAmI = helixWhoAmI;
