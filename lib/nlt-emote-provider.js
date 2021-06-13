"use strict";
//wip
//SETTINGS
logger = console.log;
const got = require("got");
const bttvBaseURL	= "https://api.betterttv.net/3/cached/users/twitch/";	//add twitch ID to the end for data
const ffzUserURL	= "https://api.frankerfacez.com/v1/_room/";				//add user name to the end for user data
const ffzRoomURL	= "https://api.frankerfacez.com/v1/user/";				//add set ID from userurl to the end for data
const sosilBaseURL	= "";

const epgot = require("got");


class TEpChannel {
	constructor (chName=null, chTWID=null){
		if(chName==="" && chTWID===0){
			throw("<emote provider> must specify at least one of the parameters(name or twitch ID)");
		}
	}

} 

function epLoadBTTV(target_channel){
	return new Promise((resolve,reject) => {
		got.get(bttvBaseURL+target_channel).json().then((data) => {
			resolve(data.sharedEmotes);
			return;
		}).catch((err) => {
			reject(err);
		});
	});
}

function epLoadFFZ(target_channel){
	return new Promise((resolve,reject) => {
		got.get(ffzUserURL+target_channel).json().then((data) => {
			if(data.error){
				reject(data);
				return;
				got.get(ffzRoomURL+data.room.set).json().then((rdata) => {
					resolve(rdata.emoticons);
					return;
				}).catch((rerr) => { reject(rerr); return; });
			}
		}).catch((err) => {	reject(err); });
	});
}

function epLoadSosil(target_channel){
	return new Promise((resolve,reject) => {
	logger("<ep> epLoadSosil: function not implemented");
	reject({"error": "function not implemented"});
	});
}
