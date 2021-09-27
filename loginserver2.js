"use strict;"

const db = require("./lib/nlt-db.js");
const conf = require("./config/config.js").nltConfig;
const crypto = require("crypto");
const http = require("http");

const cnonce = crypto.randomBytes(20).toString('hex').slice(-8);
const permList = "chat:read chat:edit channel:moderate whispers:read whispers:edit channel_editor moderation:read moderator:manage:automod";
const tehUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${conf.twitch.clientID}&redirect_uri=http://localhost:7775/auth&response_type=code&state=${cnonce}&scope=${permList}`;

const ptl = console.log;

ptl("Noirelight2 login token server starting up.");
try{
	http.createServer(requestHandler).listen(7775, 'localhost');
}
catch(err){
	throw (err);
}
ptl("Please navigate to http://localhost:7775 in your web browser and follow the instructions.");

async function requestHandler(req, res){
	ptl(`<http> Incoming request for "${req.url}"`);
	let nam;
	let inurl = req.url.split("?");
	switch(inurl[0]){
		case "/index.htm":
		case "/index.html":
		case "/":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			res.write(loginpage());
			res.end();
			break;
		case "/auth2":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			res.write(parseAuth(inurl[1]));
			res.end();
			break;
		case "/auth":
			res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
			//res.write(authRedir());
			res.write(parseAuth(inurl[1]));
			res.end();
			break;
		default:
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.write("404 - Content not found");
			res.end();
			break;
	}
}

function authRedir(){
	return `
	<html>
	<head><title>Redirecting...</title>
	<script>
	function NaM(){
		const turl = document.location.origin + "/auth2?" + document.location.hash.substring(1);
		window.location.href = turl;
	}
	</script>
	</head>
	<body onLoad="NaM()">
	Redirecting...
	</body></html>`;
	
}

function parseAuth(inmsg){
	let splitmsg = inmsg.split("&");
	let retval = `
	<html>
	<head><title>Authentication results Okayge</title></head>
	<body>
	<b>cnonce:</b> <code>${cnonce}</code> <b>NEEDS TO BE THE SAME AS <code>state</code><b><br><br>
	<b>If cnonce and state are not the same it could signal a MitM attack!</b><br><br>
	`;
	for(let i of splitmsg){
		let g = i.split("=");
		retval += `<b>${g[0]}:</b> <code>${g[1]}</code><br>`;
	}
	retval += `
	<br>
	<b>Save this data to the database to the auth table!</b><br>
	keyname: <code>twitch-oauth</code><br>
	data: the access_token<br>
	type: <code>bearer</code>
	</body></html>`;
	return retval;
	
	
}

function loginpage(){
	return `
	<html>
	<head><title>SUPA LOGIN PAGE FOR NOIRELIGHT2</title></head>
	<body>
	Click this link to get redirected to twitch authentication.<br>
	You need to verify it USING THE BOTS ACCOUNT!!!!<br>
	It is for the bot so it can use chat <img src="https://cdn.betterttv.net/emote/5de9cb6191129e77b47ca987/1x"><br>
	CLICK IT FORS <img src="https://static-cdn.jtvnw.net/emoticons/v1/425618/1.0"> 👉🏽 : <a href="${tehUrl}">totally not an imgur 'jpeg'</a><br><br>
	Side note: there will be a separate login page for the operator and other broadcasters<br>
	if I even add functions like allowing the bot to change the title etc.<br>
	</body></html>`;
}
