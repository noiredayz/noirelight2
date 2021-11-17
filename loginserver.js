"use strict;"

const db = require("./lib/nlt-db.js");
const conf = require("./config/config.js").nltConfig;
const crypto = require("crypto");
const http = require("http");

const cnonce = crypto.randomBytes(20).toString('hex').slice(-8);
const permList = "chat:read chat:edit channel:moderate whispers:read whispers:edit channel_editor moderation:read moderator:manage:automod";
const tehUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${conf.twitch.clientID}&redirect_uri=http://localhost:7775/auth&response_type=token&state=${cnonce}&scope=${permList}`;

const ptl = console.log;

ptl("Noirelight2 login token server starting up.");
try{
	http.createServer(requestHandler).listen(7775, 'localhost');
}
catch(err){
	throw (err);
}
ptl("Предупреждение! This was the legacy login server when the bot still used the implicit code flow!");
ptl("It can still be used to generate an oauth code using the bot's registered application,");
ptl("however the generated code can NOT be used with noirelight2!");
ptl("If you need an initial oauth code for the bot with auth code flow, start loginserver2.js");
ptl("If you however need a code from the implicit flow go to http://localhost:7775 in your web browser and follow the instructions.");

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
			res.write(authRedir());
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
	You can use this oauth code with pepega chatbots that don't have auth code flow with renew tokens<br>
	or to log into twitch using IRC.<br>
	Your client ID (required for helix calls): <b>${conf.twitch.clientID}</b>
	</body></html>`;
	return retval;
	
	
}

function loginpage(){
	return `
	<html>
	<head><title>noirelight2 legacy implicit oauth code generator</title></head>
	<body>
	Click this link to get redirected to twitch authentication.<br>
	You need to be logged in with the account you need access from.<br>
	CLICK IT FORS <img src="https://static-cdn.jtvnw.net/emoticons/v1/425618/1.0"> 👉🏽 : <a href="${tehUrl}">totally not an imgur 'jpeg'</a><br><br>
	</body></html>`;
}
