const { stringCheck, cleanupArray } = require("./nlt-tools.js");

function parseCmdParam(inparam){
	let retval = {freestr: ""};
	let pmname = "", dun=false;
	if(!stringCheck(inparam))
		return retval;
	let pparam = inparam.split(" ");
	pparam = cleanupArray(pparam);
	for(let i=0;i<pparam.length;i++){
		if(pparam[i].substr(0, 1)==="-"){
			if(pparam[i]==="-"){										//solo "-" is not allowed
				//console.log("<paramparser> solo hyphen is not allwed");
				return undefined;
			}
			
			pmname = pparam[i].substr(1);
			
			/* breaks negative numbers are parameters, cannot be used
			if(pparam[i+1].substr(0, 1)==="-"){							//flag without value and followed by another flag is
				retval[pmname] = true;									//considered boolean set to true (LULW)
				continue;
			}
			*/
			
			if(pparam[i+1].substr(0,1)==="\""){
				retval[pmname] = "";
				
				if(pparam[i+1].substr(pparam[i+1].length-2)==="\""){
					retval[pmname] = pparam[i+1].substr(1, pparam[i+1].length-2);
					i++;
					continue;
				}
				
				i++;
				retval[pmname] = pparam[i].substr(1)+" ";
				while(!dun){											//okayeg
					i++;
					if(i>=pparam.length) return retval;					//we reached the end of the array
					if(pparam[i].substr(0, 1)==="\""){
						//console.log("<paramparser> tilde must not be at the start of a word other than the first");
						//console.log("tested word was "+pparam[i]);
						return undefined;								//" must be at the end not at the start of a word
					}
					if(pparam[i].substr(pparam[i].length-1)==="\""){	//we reched the end of the encased string
						retval[pmname] += pparam[i].substr(0, pparam[i].length-1);
						//console.log(pparam[i]+" is the end of the encased string");
						dun = true;
						continue;
					}
					//console.log(pparam[i] + " was not the end of the encased string.");
					retval[pmname] += pparam[i]+" ";						//middle word reached
																		//also valid case: no " and the end of the encased string
																		//commands will need to handle the stray space at the end
				}
			} else {
				if(!isNaN(pparam[i+1])){								//store numbers as numbers
					retval[pmname] = Number(pparam[i+1]);
					i++;
					continue;
				}
				if(pparam[i+1]==="true" || pparam[i+1]==="false"){		//store boolean as boolean
					retval[pmname] = !!pparam[i+1];
					i++;
					continue;
				}
				retval[pmname] = pparam[i+1];							//everything else is string
				i++;
			}
		} else {
			retval.freestr += pparam[i]+" "								//parts of the param list that are not prefixed by a tilde
		}																//or values after a parameter are stored as "free string"
	}
	return retval;
}

exports.parseCmdParam = parseCmdParam;
