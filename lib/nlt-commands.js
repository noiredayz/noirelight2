"use strict";
/* Logging levels */
const LOG_NO	= 0;	//don't log
const LOG_WARN	= 2;	//log warnings and handled errors
const LOG_INFO	= 4;	//log more stuff
const LOG_DBG	= 8;	//log fucking everything WAYTOODANK
const cedir = process.cwd()+"/commands-enabled/";
let cmds = [];

function getEnabledCommands(){
	let cdirlist, retval=[], sltarget, tdir;
	try{ cdirlist = nlt.fs.readdirSync(cedir, {withFileTypes: true}); }
	catch(err){
		nlt.util.printtolog(LOG_WARN, `<cmdload> Fatál error while trying to stat the enabled commands' directory: ${err}`);
		process.exit(1);
	}
	for (const de of cdirlist){
		if(de.isDirectory()){
			retval.push(de.name);
			continue;
		}
		if(de.isSymbolicLink()){
			try{
				sltarget = nlt.fs.statSync(cedir+de.name);
			}
			catch(err){
				nlt.util.printtolog(LOG_WARN, `<cmdload> stat(2) error on "${de.name}": ${err}`);
				continue;
			}
			if(sltarget.isDirectory()){
				retval.push(de.name);
			}
		}
	}
	if(retval.size===0){
		nlt.util.printtolog(LOG_WARN, `<cmdload> You have no commands enabled, you sure about this m8?`);
	}
	return retval;
}

function LoadSingleCommand(cmdname){
	return new Promise((resolve, reject) => {
		if(cmds.find(cmd => cmd.name === cmdname)){
			nlt.util.printtolog(LOG_WARN, `<scmdload> error: ${cmd.name} already exists.`);
			reject("command already exists");
			return;
		}
		try{
			cmds.push(require(cedir+cmdname+"/dcmd.js").noirelight2_command);
		}
		catch(err){
			nlt.util.printtolog(LOG_WARN, `<scmdload> error: unable to load the descriptor of ${cmdname}: ${err}`);
			reject(`unable to load the descriptor of command ${cmdname}: ${err}`);
			return;
		}
		let tarID = cmds.findIndex(cmd => cmd.cmdname === cmdname);
		if(!cmds[tarID].nlt2_compatible){
			delete(cmds[tarID]);
			nlt.util.printtolog(LOG_WARN, `<scmdload> Error: command ${cmdname} is not marked as nlt2 compatible, not loading it.`);
			return;
		} 
		try{
			cmds[tarID].help = require(cedir+cmdname+"/dcmd.js").nlt2_cmd_help;
		}
		catch(err){
			nlt.util.printtolog(LOG_WARN, `<scmdload> Error while trying to load the help for ${cmdname}: ${err}. Help for that command will not be available.`);
		}
		try{
			cmds[tarID].exec = require(cedir+cmdname+"/code.js").noirelight2_command_code;
		}
		catch(err){
			delete(cmds[tarID]);	//remove the record of the incomplete command
			nlt.util.printtolog(LOG_WARN, `<scmdload> error in the executable code of ${cmdname}: ${err}`);
			reject(`unable to load the executable code of command ${cmdname}: ${err}`);
			return;
		}
		resolve(`command ${cmdname} loaded successfully.`);
	});
}

function LoadCommands(){
	const cmdlist = getEnabledCommands();
	if(cmdlist.length === 0){
		nlt.util.printtolog(LOG_WARN, `<cmds> No commands to load saj`);
		return;
	}
	cmdlist.forEach(cmd => {
		LoadSingleCommand(cmd).then((d)=>{
			nlt.util.printtolog(LOG_WARN, `<cmd load> success: ${d}`);
		}).catch((e)=>{ nlt.util.printtolog(LOG_WARN, `<cmd load> failed: ${e}`); });
	});
	nlt.util.printtolog(LOG_WARN, `<cmd load> Finished loading ${cmds.length} commands.`);
}

function getAlias(incmd){
	let cmd;
	for(cmd of cmds){
		if(typeof(cmd)==="undefined") continue;
		if(cmd.aliases){
			if (cmd.aliases.findIndex(b => b === incmd) != -1)
				return cmd.cmdname;			
		}
	}
	return incmd;
}


function process_command(inmsg, unick, target_channel, fullmessage, context){
	const permnames = ["user", "authorized user", "channel owner", "operator"];
	const incmd = getAlias(inmsg.split(" ")[0]);
	if(!nlt.ss[context]) return;
	const cmdid = cmds.findIndex(cmd => cmd.cmdname === incmd);	
	if(cmdid === -1) return;	//command does not exist
	//nlt.util.printtolog(LOG_DBG, `<dcmd> executing command ${cmds[cmdid].cmdname} with command line ${inmsg}`);
	//TODO: insert check for existing, but disabled commands here
	
	//users currently on "security timeout" for trying to use a privileged
	//command may not use other commands
	if(nlt.ss[context].cdctl.getUserSecTO(unick)) {
		nlt.util.printtolog(LOG_DBG, `<debug> not executing command, because user is on security timeout`);
		return true;
	}
	let dcmdperm = nlt.util.su_check(unick, target_channel);
	if(cmds[cmdid].minternal === 1){
		nlt.ss[context].postmsg(target_channel, `${unick} stop trying to call internal commands directly.`);
		if(unick != nlt.c.usr_admin){
			nlt.ss[context].cdctl.setSecurityTimeout(unick);
			nlt.util.printtolog(LOG_WARN, `<security> "${unick}" tried to run an internal command "${incmd}" in channel "${nlt.channels[target_channel].name}"`);
		}
		return true;
	}
	if (cmds[cmdid].clearance > dcmdperm){
		nlt.ss[context].postmsg(target_channel, `${unick}, at least ${permnames[cmds[cmdid].clearance]} clearance is required to execute this command.`);
		nlt.util.printtolog(LOG_WARN, `<security> "${unick}" tried to run restricted command "${incmd}" in channel "${nlt.channels[target_channel].name}" (level: ${dcmdperm}, req: ${cmds[cmdid].clearance})`);
		nlt.ss[context].cdctl.setSecurityTimeout(unick);
		return true;
	}
	if (cmds[cmdid].mgreenlist === 1){
		if (!checkCmdGreenlist(incmd, nlt.channels[target_channel].name, context)){
			/*  nlt.ss[context].postmsg(target_channel, `Command ${incmd} is not allowed to be ran from this channel.`);
			if(unick != nlt.c.usr_admin)
				nlt.cdctl.setCD(unick, target_channel, "__unallowed_greenlisted_command");
			*/
			nlt.util.printtolog(LOG_INFO, `<security> ${unick} tried to run command ${incmd} in channel ${nlt.channels[target_channel].name} where its not greenlisted.`); 
			return true;
		}
	}
	//NOTE: cooldown getCombined always returns 0 (not on cd) if unick is the operator
	if (nlt.ss[context].cdctl.getCombined(unick, target_channel, incmd) != 0){
		//nlt.util.printtolog(LOG_DBG, `<debug> not executing command, because cooldowns.`);
		return true;
	}
	nlt.ss[context].cdctl.setCD(unick, target_channel, incmd);
	
	let rText;
	cmds[cmdid].exec(fullmessage, unick, target_channel, context).then((rText) => {
		if (rText != "self-printing")
			nlt.ss[context].postmsg(target_channel, `${unick}, ${rText}`);
	}).catch((rErr) => {
		nlt.ss[context].postmsg(target_channel, `${unick}, failed to run the command: ${rErr}`);
		nlt.util.printtolog(LOG_WARN, `<dcmd> Error running command ${incmd} in channel ${nlt.channels[target_channel].name}: ${rErr}`);
	});
		
	return true;
}

function process_special_message(fullmessage, unick, target_channel, target_context){
	//First check if the postprocessor "command" exists. This name is reserved and 
	//should used only for message postprocessing. Return if it doesn't and run it if it does.
	const ippm = cmds.findIndex(cmd => cmd.cmdname === "internal-postprocess-message");
	if (ippm === -1) return false;
	
	cmds[ippm].exec(fullmessage, unick, target_channel, target_context).then((d) =>{
		if(d==="handled") return true;
			else return false;
	}).catch((errrval) => {
		//xd
	})
}

function checkCmdGreenlist(cmdname, target_channel, context){
	let rrows = nlt.maindb.selectQuery(`SELECT * FROM greenlist WHERE command='${cmdname}' AND channel='${target_channel}' AND context='${context}';`);
	if(rrows.length>0)
		return true;
	else
		return false;	
}

exports.process_command = process_command;
exports.process_special_message = process_special_message;
exports.cmds = cmds;
exports.getAlias = getAlias;
exports.LoadCommands = LoadCommands;
exports.checkCmdGreenlist = checkCmdGreenlist;