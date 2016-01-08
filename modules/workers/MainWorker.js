// Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('resource://gre/modules/workers/require.js');

// Globals
var core = { // have to set up the main keys that you want when aCore is merged from mainthread in init
	addon: {
		path: {
			modules: 'chrome://profilist/content/modules/'
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase()
	}
};

var OSStuff = {}; // global vars populated by init, based on OS
var gIniObj;
var gKeyInfoStore;
var gJProfilistBuilds;
var gJProfilistDev;

// Imports that use stuff defined in chrome
// I don't import ostypes_*.jsm yet as I want to init core first, as they use core stuff like core.os.isWinXP etc
// imported scripts have access to global vars on MainWorker.js
importScripts(core.addon.path.modules + 'cutils.jsm');
// importScripts(core.addon.path.modules + 'ctypes_math.jsm');

// Setup PromiseWorker
// SIPWorker - rev2 - https://gist.github.com/Noitidart/92e55a3f7761ed60f14c
var PromiseWorker = require('resource://gre/modules/workers/PromiseWorker.js');

// Instantiate AbstractWorker (see below).
var worker = new PromiseWorker.AbstractWorker()

worker.dispatch = function(method, args = []) {
  // Dispatch a call to method `method` with args `args`
  return self[method](...args);
};
worker.postMessage = function(...args) {
  // Post a message to the main thread
  self.postMessage(...args);
};
worker.close = function() {
  // Close the worker
  self.close();
};
worker.log = function(...args) {
  // Log (or discard) messages (optional)
  dump('Worker: ' + args.join(' ') + '\n');
};

// Connect it to message port.
// self.addEventListener('message', msg => worker.handleMessage(msg)); // this is what you do if you want PromiseWorker without mainthread calling ability
// start - setup SIPWorker
var WORKER = this;
self.addEventListener('message', function(aMsgEvent) { // this is what you do if you want SIPWorker mainthread calling ability
	var aMsgEventData = aMsgEvent.data;
	if (Array.isArray(aMsgEventData)) {
		console.error('worker got response for main thread calling SIPWorker functionality:', aMsgEventData)
		var funcName = aMsgEventData.shift();
		if (funcName in WORKER) {
			var rez_worker_call = WORKER[funcName].apply(null, aMsgEventData);
		}
		else { console.error('funcName', funcName, 'not in scope of WORKER') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
	} else {
		console.error('no this is just regular promise worker message');
		worker.handleMessage(aMsgEvent)
	}
});

const SIP_CB_PREFIX = '_a_gen_cb_';
const SIP_TRANS_WORD = '_a_gen_trans_';
var sic_last_cb_id = -1;
self.postMessageWithCallback = function(aPostMessageArr, aCB, aPostMessageTransferList) {
	var aFuncExecScope = WORKER;
	
	sic_last_cb_id++;
	var thisCallbackId = SIP_CB_PREFIX + sic_last_cb_id;
	aFuncExecScope[thisCallbackId] = function() {
		delete aFuncExecScope[thisCallbackId];
		console.log('in worker callback trigger wrap, will apply aCB with these arguments:', arguments);
		aCB.apply(null, arguments[0]);
	};
	aPostMessageArr.push(thisCallbackId);
	self.postMessage(aPostMessageArr, aPostMessageTransferList);
};
// end - setup SIPWorker

// Define a custom error prototype.
function MainWorkerError(name, msg) {
  this.msg = msg;
  this.name = name;
}
MainWorkerError.prototype.toMsg = function() {
	return {
		exn: 'MainWorkerError',
		msg: this.msg,
		name: this.name
	};
};
////// end of imports and definitions

function init(objCore) { // function name init required for SIPWorker
	//console.log('in worker init');
	
	// merge objCore into core
	// core and objCore is object with main keys, the sub props
	
	core = objCore;

	core.profilist.path.root = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data');
	core.profilist.path.icons = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'icons');
	core.profilist.path.images = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'icons'); // :note: this directory should hold all the original sizes provided by the user
	core.profilist.path.exes = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'exes');
	core.profilist.path.ini = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
	core.profilist.path.inibkp = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'profiles.ini.bkp');
	
	core.os.mname = core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name; // mname stands for modified-name	
	
	// I import ostypes_*.jsm in init as they may use things like core.os.isWinXp etc
	console.log('bringing in ostypes');
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.modules + 'ostypes_win.jsm');
			break
		case 'gtk':
			importScripts(core.addon.path.modules + 'ostypes_x11.jsm');
			break;
		case 'darwin':
			importScripts(core.addon.path.modules + 'ostypes_mac.jsm');
			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	console.log('brought in ostypes');
	
	// OS Specific Init
	switch (core.os.name) {
		// case 'winnt':
		// case 'winmo':
		// case 'wince':
		// 		
		// 		OSStuff.hiiii = true;
		// 		
		// 	break;
		default:
			// do nothing special
	}
	
	// Profilist Specific Init
	console.log('starting profilist specifc init');
	readIni();
	
	console.log('MainWorker init success');
	return true; // required for SIPWorker
}

// Start - Addon Functionality

function prepForTerminate() {
	return 'ok ready to terminate';
}

gKeyInfoStore = { //info on the Profilist keys i write into ini // all values must be strings as i writing and reading from file
	ProfilistStatus: {
		// pref: false		// i dont need this key. i can just test for lack of any of the keys only for prefs. but anyways fallse/missing means not a preference. means its programtically set
		possibleValues: [	// if not provided, then the value can be set to anything
			'0',			// installed BUT disabled
			'1'				// installed AND enabled
		]					// if key does not exist, then profilist is not installed in that profile
	},
	ProfilistDev: {				// developer mode on/off
		pref: true,				// i dont really need this key, i can detect if its pref by testing if it has any of the "this key only for prefs"
		specificOnly: false,	// means, it cannot be set across all profiles // this key only for prefs
		defaultSpecificness: false,	// means by default it affects all profiles (its unspecific) // this key only for prefs // this key only for prefs with specificOnly:false
		defaultValue: '0',		// this key only for prefs // if value not found in profile group, or general group. then this value is used. // if value found in general, but specific is set to true by user, then use the value from general. // if value found in profile, and specific is set to false by user, then set general value, and delete the one from profile group
		possibleValues: [
			'0',				// devmode off
			'1'					// devmode on
		]
	},
	ProfilistSort: {			// the order in which to show the other-profiles in the profilist menu.
		pref: true,
		specificOnly: false,
		defaultSpecificness: false,
		defaultValue: '0',
		possibleValues: [		// link83737383
			'0',				// by create order ASC
			// '1',				// by create order DESC
			'2',				// by alpha-numeric-insensitive ASC
			// '3'					// by alpha-numeric-insensitive DESC
		]
	},
	ProfilistNotif: {			// whether or not to show notifications
		pref: true,
		specificOnly: false,
		defaultSpecificness: false,
		defaultValue: '1',
		possibleValues: [
			'0',				// dont show
			'1'					// show
		]
	},
	ProfilistLaunch: {			// whether on user click "create new profile" if should launch right away using default naming scheme for Path and Name
		pref: true,
		specificOnly: false,
		defaultSpecificness: false,
		defaultValue: '1',
		possibleValues: [
			'0',				// dont launch right away, allow user to type a path, then hit enter (just create dont launch), alt+enter (create with this name then launch) // if user types a system path, then it is created as IsRelative=0
			'1'					// launch right away, as IsRelative=1, with default naming scheme for Path and Name
		]
	},
	ProfilistBadge: {			// slug_of_icon_in_icons_folder
		specificOnly: true
	},
	ProfilistTie: {			// slug_of_icon_in_icons_folder
		specificOnly: true
		// value should be id of something in the ProfilistBuilds.
	},
	ProfilistTemp: {			// tells whether (temporary profiles found && that did NOT have profilist installed) into them (so no ProfilistStatus), should remain in ini after it is found to be not running. only way to remove is to delete from menu. // if profilist is installed into that profile, it will be a temporary profile still so group will be [TempProfile#] but it will stay regardless of this key setting
		unspecificOnly: true,
		// defaultValue: '0',
		defaultValue: '1',
		possibleValues: [
			'0',				// do not keep them in ini, after it is found to be not running
			'1'					// keep them in ini even after it is found to be not running
		]
	},
	ProfilistBuilds: {			// whether or not to show notifications
		pref: true,
		defaultValue: '[]',
		unspecificOnly: true	// this pref affects all profiles, cannot be set to currently running (specific)
		// value should be a json array of objects. ie: [{id:date_get_time_on_create, i:slug_of_icon_in_icons_folder, p:path_to_exe},{i:slug_of_icon_in_icons_folder, p:path_to_exe}] // id should be date in ms on create, so no chance of ever getting reused
	}
};

function readIni() {
	// returns nothing
	
	
	
	//	do:read_ini_set_strIniContents_to_this
	//	if ini is touched
			// true - continue to do:parse_gIniObj
			// false - 
				// do:read_inibkp
				// if inibkp exists
					// true - do:set_strIniContents_to_this_then_continue_to_parse_gIniObj
					// false - do nothing, obviously it go to read_inibkp as it couldnt find ini was touched. so at the 
	//	do:parse_gIniObj
	//	if touched for this profile
		// true - do nothing
		// false -
			// do: touch it and write to it
			// do: save to ini && save to inibkp
	var strIniContents;
	var rez_read;
	

	try {
	   rez_read = OS.File.read(core.profilist.path.ini, {encoding:'utf-8'});
	} catch (ex) {
	   if (ex instanceof OS.File.Error) {
			// ex.becauseNoSuchFile // The file does not exist
			throw ex;
	   } else {
		 throw ex; // Other error
	   }
	}
	
	console.log('rez_read:', rez_read);
	strIniContents = rez_read;
	
	if (rez_read.indexOf('ProfilistStatus') == -1) {
		// read bkp
		try {
		   rez_read = OS.File.read(core.profilist.path.inibkp, {encoding:'utf-8'});
		} catch (ex if ex instanceof OS.File.Error && ex.becauseNoSuchFile) {
			console.log('inibkp does not exist!');
		}
	}
	
	// parse_gIniObj
	/*
	var pattIniBlock = /\[.*?\][\s\S]*?(?:^$|$(?![\s\S]))/mg;
	// 
	// var matchIniBlock;
	// while (matchIniBlock = pattIniBlock.exec(strIniContents)) {
	// 	console.log('matchIniBlock:', matchIniBlock);
	// }
	
	var arrIniBlocks = strIniContents.match(pattIniBlock);
	console.log('arrIniBlocks:', arrIniBlocks);
	
	var pattIniGroupName = /\[(.*?)\]/
	gIniObj = [];
	for (var i=0; i<arrIniBlocks.length; i++) {
		var groupName = arrIniBlocks[i].match
	}
	*/
	
	console.time('parse_gIniObj');
	gIniObj = [];
	var pattIniBlockWithDetails = /\[(.*?)\](?:\s+?(.+?)=(.*))(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?/mg; //currently supports 16 lines max per block `(?:\s+?(.+?)=(.*))?` repeat that at end

	var matchIniBlock;
	while (matchIniBlock = pattIniBlockWithDetails.exec(strIniContents)) {
		console.log('matchIniBlock:', matchIniBlock);
		var cNewEntry = {
			groupName: matchIniBlock[1]
		}
		for (var i=2; i<matchIniBlock.length; i=i+2) {
			if (matchIniBlock[i] === undefined) {
				break;
			}
			cNewEntry[matchIniBlock[i]] = matchIniBlock[i + 1];
		}
		gIniObj.push(cNewEntry);
	}
	console.timeEnd('parse_gIniObj');
	console.log('gIniObj:', gIniObj);
	
	formatNoWriteObjs();
}

function formatNoWriteObjs() {
	// delets the noWriteObj in each entry, then populates it
	// works on gIniObj
	
	// also triggers writeIni in cases where it is needed, does so in these instances:
	//	* if the curProf_iniEntry is not touched
	//	* 
	
	// format gIniObj - :note: :important: all values must be strings, UNLESS in noWriteObj
	// format means to go through and set noWriteObj in the gIniObj appropariately. appropariately means based on the prefs it will set stuff
	// for testing if currentProfile
	var curProf_iniEntry;
	var osFilePathSeperator = OS.Path.join(' ', ' ').replace(/ /g, '');
	var curProfRt = OS.Constants.Path.profileDir; // using same pattern as ```defProfRt: Services.dirsvc.get('DefProfRt', Ci.nsIFile).path,```
	var curProf_isRelative;
	var curProf_relativeDescriptor; // only set it curProf_isRelative == true
	if (curProfRt.indexOf(core.profilist.path.defProfRt) > -1) {
		curProf_isRelative = true;
		curProf_relativeDescriptor = getRelativeDescriptor(curProfRt, OS.Constants.Path.userApplicationDataDir);
	} else {
		curProf_isRelative = false;
	}
	
	// end - for testing if currentProfile
	for (var i=0; i<gIniObj.length; i++) {
		gIniObj[i].noWriteObj = {};
		
		// if its a profile
		if (gIniObj[i].Path) {
			
			// test if it is the currentProfile
			if (!curProf_iniEntry) {
				if (curProf_isRelative && gIniObj[i].IsRelative == '1') {
					if (curProf_relativeDescriptor == gIniObj[i].Path) {
						foundCurrentProfile = true;
						gIniObj[i].noWriteObj.currentProfile = true;
						curProf_iniEntry = gIniObj[i];
					}
				} else if (!curProf_isRelative && (gIniObj[i].IsRelative == '0' || !gIniObj[i].IsRelative /* verify if a non-relative profile exists, check to see if ever IsRelative is omitted, or is it everytime set equal to 0*/)) {
					if (curProfRt == gIniObj[i].Path) {
						foundCurrentProfile = true;
						gIniObj[i].noWriteObj.currentProfile = true;
						curProf_iniEntry = gIniObj[i];
					}
				}
			}
			
		}
		
		
		
	}
	
	// settle curProf_iniEntry - meaning if its temporary profile, and it has no entry in ini, then put one in -- no need to test/set writeIni here, at the end i test if curProf_iniEntry is touched, and obviously it wont be so it will get touched and written
	// update noWriteObj of currentProfile OR if its a temp profile then update gIniObj with it and write it to ini
	// if (!foundCurrentProfile || (foundCurrentProfile && curProf_iniEntry.groupName.indexOf('TempProfile') == 0)) {
		// its a temp profile
		if (!curProf_iniEntry) {
			// find max num
			var cMaxProfileNum = -1;
			var pattProfileNum = /\[(?:Temp)?Profile(\d+)\]/;
			for (var i=0; i<gIniObj.length; i++) {
				var matchProfileNum = pattProfileNum.exec(gIniObj[i].groupName);
				if (matchProfileNum) {
					var cNum = parseInt(matchProfileNum[1]);
					if (cNum > cMaxProfileNum) {
						cMaxProfileNum = cNum;
					}
				}
			}
			curProf_iniEntry = {
				groupName: 'TempProfile' + (cMaxProfileNum + 1)
			}
		}
	// }

	// go through and note in noWriteObj if its a temporary profile
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].groupName.indexOf('[TempProfile') > -1) {
			gIniObj[i].noWriteObj.TempProfile = true;
		}
	}
	
	// set running statuses
	curProf_iniEntry.noWriteObj.status = true; // :note: if anything is running it needs exePath, this is not a GUI requirement, but a business-layer requirement link135246970
	curProf_iniEntry.noWriteObj.exePath = core.profilist.path.XREExeF;
	// :todo: do for rest in gIniObj
	
	
	// set gJProfilistBuilds
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	if (!this.debuggedProfilistBuilds) { // :debug:
		gGenIniEntry.ProfilistBuilds = '[{"id":10,"p":"d.exe","i":"dev"},{"id":9,"p":"a.exe","i":"aurora"},{"id":8,"p":"n.exe","i":"nightly"}]'; // :debug:
		this.debuggedProfilistBuilds = true; // :debug:
	} // :debug:
	gJProfilistDev = getPrefLikeValForKeyInIniEntry(curProf_iniEntry, gGenIniEntry, 'ProfilistDev') == '1' ? true : false;
	console.error('gJProfilistDev:', gJProfilistDev);
	
	// IF dev mode is enabled in currentProfile THEN do the appropriate stuff
	if (gJProfilistDev) {
		// set gJProfilistBuilds
		gJProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(curProf_iniEntry, gGenIniEntry, 'ProfilistBuilds'));
		
		// start - for all that are running set exePath :todo:
		curProf_iniEntry.noWriteObj.exePath = core.profilist.path.XREExeF;
		// end - for all that are running set exePath
		
		// start - for all that are running set exeIconSlug
			//////////
			// LOGIC
			// get slug for img its exePath
			//	 check if one exists in in tie
			//		true - take that slug
			//		false -
			//			getSlugForChannel(that channel, for curProf you can use core.firefox.channel)
			//////////
			// do currentProfile
			var cBuildEntryForExePath = getBuildEntryByKeyValue(gJProfilistBuilds, 'p', curProf_iniEntry.exePath);
			if (cBuildEntryForExePath) {
				curProf_iniEntry.noWriteObj.exeIconSlug = cBuildEntryForExePath.i;
			} else {
				curProf_iniEntry.noWriteObj.exeIconSlug = getSlugForChannel(core.firefox.channel);
			}
			// do remaining that are running
		// start - for all that are running set exeIconSlug
	}
	
	// figure out if need to touch ini for currentProfile, and if have to, then touch it, then write it to ini and inibkp
	if (!('ProfilistStatus' in curProf_iniEntry)) { // even though i store as string, i am doing ```key in``` check instead of !curProf_iniEntry.ProfilistStatus - just in case somehow in future ProfilistStatus = "0" gets parsed as int, it should never though
		// need to touch
		curProf_iniEntry.ProfilistStatus = '1';
		writeIni();
	}
}

function writeIni() {
	// write gIniObj to core.profilist.path.ini && core.profilist.path.inibkp
	// :note: :important: things in noWriteObj are not strings, and even if they are, it doesnt get written
}

function fetchAll() {
	// returns an object with gIniObj, gKeyInfoStore, and core
	/*
	var sIniObj = JSON.parse(JSON.stringify(gIniObj)); // s means for state in react
	
	for (var i=0; i<sIniObj.length; i++) {
		sIniObj[i].noWriteObj = {};
	}
	*/
	
	return {
		aIniObj: gIniObj,
		aKeyInfoStore: gKeyInfoStore,
		aCore: core
	};
}

function fetchJustIniObj() {
	// returns gIniObj
	
	return gIniObj;
}

function userManipulatedIniObj_updateIniFile(aNewIniObjStr) {
	gIniObj = JSON.parse(aNewIniObjStr);
	formatNoWriteObjs();
	
	return JSON.stringify(gIniObj);
}

// start - profilist helper functions FOR WORKER ONLY
function isSlugInChromeChannelIconsets(aPossibleSlug) {
	// if returns true, it means aPossibleSlug images dir is in ```core.addon.path.images + 'channel-iconsets/' + aSlug + '/' + aSlug + '_##.png'```
	switch (aPossibleSlug) {
		case 'release':
		case 'beta':
		case 'dev':
		case 'aurora':
		case 'nightly':
			return true;
		default:
			return false;
	}
}
function getSlugForChannel(aChannel) {
	switch (aChannel) {
		case 'esr':
		case 'release':
				
				return 'release';
				
			break;
		case 'beta':
				
				return aChannel;
				
			break;
		case 'aurora':
		
				return 'dev'
				
			break;
		case 'default':
		case 'nightly':
				
				return 'nightly';
				
			break;
		default:
			
				throw new Error('no slug for this channel... should never ever get here!!! channel value was "' + aChannel + '"');
	}
}
function getBuildEntryByKeyValue(aJProfilistBuilds, aKeyName, aKeyValue) {
	// returns null if entry with aKeyName having a val of aKeyValue is not found, else it returns that entry
	for (var i=0; i<aJProfilistBuilds.length; i++) {
		if (aJProfilistBuilds[i][aKeyName] == aKeyValue) {
			return aJProfilistBuilds[i];
		}
	}
	
	return null;
}
// end - profilist helper functions FOR WORKER ONLY

// START - COMMON PROFILIST HELPER FUNCTIONS
// start - xIniObj helper functions

function getIniEntryByNoWriteObjKeyValue(aIniObj, aKeyName, aKeyVal) {
	//*******************************************
	// RETURNS
	//	null
	//	an element in the aIniObj
	//*******************************************
	for (var i=0; i<aIniObj.length; i++) {
		if (aKeyName in aIniObj[i].noWriteObj && aIniObj[i].noWriteObj[aKeyName] == aKeyVal) {
			return aIniObj[i];
		}
	}
	
	return null;
}
function getIniEntryByKeyValue(aIniObj, aKeyName, aKeyVal) {
	//*******************************************
	// DESC
	// 	Iterates through the ini object provided, once it finds an entry that has aKeyName that equals aKeyVal it returns it
	//	If nothing is found then it returns NULL
	// RETURNS
	//	null
	//	an element in the aIniObj
	// ARGS
	//	aIniObj - the ini object you want to get value from
	// 	aKeyName - the name of the field
	//	aVal - the value the field should be
	//*******************************************

	for (var i=0; i<aIniObj.length; i++) {
		if (aKeyName in aIniObj[i] && aIniObj[i][aKeyName] == aKeyVal) {
			return aIniObj[i];
		}
	}
	
	return null;
}

// start - xIniObj functions with no options
function getBuildValByTieId(aJProfilistBuilds, aTieId, aKeyName) {
	// returns null if aTieId is not found, or undefined if aKeyName is not found ELSE value
	for (var i=0; i<aJProfilistBuilds.length; i++) {
		if (aJProfilistBuilds[i].id == aTieId) {
			return aJProfilistBuilds[i][aKeyName]; // if aKeyName does not exist it returns undefined
		}
	}
	
	return null;
}

function getPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	if (gKeyInfoStore[aKeyName].unspecificOnly) {
		// get profile-unspecific value else null
		if (aKeyName in aGenIniEntry) {
			return aGenIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				return null;
			}
		}
	} else {
		// check if profile-unspecific value exists return else continue on
		if (!gKeyInfoStore[aKeyName].specificOnly) {
			if (aKeyName in aGenIniEntry) {
				return aGenIniEntry[aKeyName];
			}
		}
		// return profile-specific value else null
		if (aKeyName in aIniEntry) {
			return aIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				return null;
			}
		}
	}
	
	
	if (aKeyName in aGenIniEntry) {
		// user set it to profile-unspecific
		return aGenIniEntry[aKeyName];
	} else {
		// user set it to profile-specific
		if (aKeyName in aIniEntry) {
			return aIniEntry[aKeyName];
		} else {
			// not found so return default value if it has one
			if ('defaultValue' in gKeyInfoStore[aKeyName]) { // no need to test `'defaultValue' in gKeyInfoStore[aKeyName]` because i expect all values in xIniObj to be strings // :note: :important: all values in xIniObj must be strings!!!
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				// no default value
				return null;
			}
		}
	}
}
function getImgPathOfSlug(aSlug) {
	//*******************************************
	// DESC
	// 	Provided aSlug, such as "esr", "release", "beta", "dev", "nightly", or any user defined one, this will return the full path to that image
	// RETURNS
	//	null
	//	string
	// ARGS
	//	aSlug - icon short name
	//*******************************************

	console.info('getImgPathOfSlug, aSlug:', aSlug);
	
	switch (aSlug) {
		// case 'esr': // esr should go to release. but worker should never set it to esr, as esr here is a slug, not channel name
		case 'release':
		case 'beta':
		case 'dev':
		case 'aurora':
		case 'nightly':
				
				return core.addon.path.images + 'channel-iconsets/' + aSlug + '/' + aSlug + '_16.png';
				
			break;
		default:
			
				return OS.Path.join(core.profilist.path.icons, aSlug, aSlug + '_16.png');
	}
}
// end - xIniObj functions with no options
// END - COMMON PROFILIST HELPER FUNCTIONS

// Start - Launching profile and other profile functionality
function getRunningExePathForProfFromPlat(aProfPath) {
	// get the firefox path a profile is running in, else null
	// synonomous with getIsProfRunning
	// this does heavy ctypes stuff to check system
	// tests if profile is running, if it is, it returns to you the exepath it is running in, if not running it returns false
	// RETURNS
		// if RUNNING - path to build its running
		// if NOT running - returns null
}
// start - get profile spec functions based on gIniObj
function getExePathForProfFromIni(aProfPath) {
	// test gIniObj for if it is running, if it is tied
	// :note: this does not do running check, it just returns the exe path based on what is in in gIniObj and tie
	// RETURNS
		// if, based on gIniObj, it is RUNNING, then it returns that path
		// if, based on gIniObj, it is NOT running, then it returns the tied path if it has one ELSE the currentProfile path
		
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (cIniEntry.noWriteObj.status) {
		// its running
		return cIniEntry.noWriteObj.exePath; // link135246970
	} else {
		if (gJProfilistDev && cIniEntry.ProfilistTie) {
			// :note: if the current profile is in dev mode, then we check for tie. else we dont consider tie - :todo: tell this to users in description somewhere
			var cBuildEntry = getBuildEntryByKeyValue(gJProfilistBuilds, 'id', cIniEntry.ProfilistTie);
			if (!cBuildEntry) {
				console.error('no build entry found for this, this should never happen, as when an id is deleted, all things tied to it should have been untied'); // :todo: ensure this comment, code up the untie on tie deletion
				throw new MainWorkerError('should_never_happen!', 'no build entry found for this, this should never happen, as when an id is deleted, all things tied to it should have been untied');
			}
			return cBuildEntry.p;
		}
		// gets to this point if gJProfilistDev is false, OR it was true but no tie in the ini
		// var curProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // link135246970
		// return curProfIniEntry.noWriteObj.exePath;
		// well obviously the currentProfile is running in core.profilist.path.XREExeF so lets just return this, save some looping
		return core.profilist.path.XREExeF; // the link135246970 for the immediately 3 lines above comment is valid though
	}
}
function getBadgeSlugForProfFromIni(aProfPath) {
	// RETURNS
		// slug - string of the slug for icon used for the badge
		// null - no badge for this profile in gIniObj
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (cIniEntry.ProfilistBadge) {
		return cIniEntry.ProfilistBadge;
	}
	return null;
}
// end - get profile spec functions based on gIniObj
// start - get profile spec based on function arguments
_cache_getExeChanForParamsFromFS = {};
function getExeChanForParamsFromFS(aExePath) {
	// :note: this does not do running check, it just returns the exe path based on what parameters passed
	// RETURNS
		// string - beta etc
		// if any error then null
	// if (!(aExePath in _cache_getExeChanForParamsFromFS)) {
	if (!_cache_getExeChanForParamsFromFS[aExePath]) { // changed from in to do this, because if it was null for some reason i want to keep checking it
		if (aExePath == core.profilist.path.XREExeF) {
			_cache_getExeChanForParamsFromFS[aExePath] = core.firefox.channel;
		} else {
			console.time('getExeChanFromFS');
			var channelPrefsJsPath;
			if (core.os.name == 'darwin') {
				channelPrefsJsPath = OS.Path.join(aExePath.substr(0, aExePath.indexOf('.app') + 4), 'Contents', 'Resources', 'defaults', 'pref', 'channel-prefs.js'); // :note::assume:i assume that aExePath is properly cased meaning the .app is always lower, so its never .APP // :note::important::todo: therefore when allow browse to .app from cp.js i should display only till the .app in the gui, but i should save it up till the .app/Contents/MacOS/firefox
			} else {
				channelPrefsJsPath = OS.Path.join(OS.Path.dirname(aExePath), 'defaults', 'pref', 'channel-prefs.js');
			}
			console.log('channelPrefsJsPath:', channelPrefsJsPath);
			
			var rez_read;
			try {
			   rez_read = OS.File.read(channelPrefsJsPath, {encoding:'utf-8'});
			} catch (ex) {
				console.error('can get here if the build doesnt exist anymore, ex:', ex);
				if (ex instanceof OS.File.Error) {
					// ex.becauseNoSuchFile // The file does not exist
					throw ex;
				} else {
					throw ex; // Other error
				}
			}
			
			// console.log('rez_read:', rez_read);

			var channel_name = rez_read.match(/app\.update\.channel", "([^"]+)/);
			console.log('channel_name:', channel_name);
			if (!channel_name) {
				_cache_getExeChanForParamsFromFS[aExePath] = null;
			} else {
				_cache_getExeChanForParamsFromFS[aExePath] = channel_name[0];
			}
			console.timeEnd('getExeChanFromFS');
		}
	}
	return _cache_getExeChanForParamsFromFS[aExePath];
}
function getIconPathInfosForParamsFromIni(aExePath, aExeChannel, aBadgeIconSlug) {
	// :note: this does not do running check, it just returns the icon path based on what is in in gIniObj
	// returns object
	//	{
	//		base: {
	//			slug: '' // same thing as dirName
	//			dir: '' path to directory holding images of different sizes. no ending slash
	//			prefix: '' full path to the image without the ##.png
	//			chrome: isSlugInChromeChannelIconsets
	//		},
	//		badge: { // is not set if no aBadgeIconSlug
	//			same keys as base
	//		},
	//		path: 'string to file system path.png', on linux this is same as name
	//		name: the stuff before the .png safedForPlatFS
	//		slug: the stuff before the .png NOT safedForPlatFS
	//	}
	
	var iconInfosObj = {}; // short for iconInfoObj	
	
	iconInfosObj.base = {};
	if (gJProfilistDev) {
		// note: if dev mode is on in this current profile, then check if there is a custom icon for aExePath. else dont check custom just check channel
		var cBuildEntry = getBuildEntryByKeyValue(gJProfilistBuilds, 'p', aExePath);
		if (cBuildEntry) {
			iconInfosObj.base.slug = cBuildEntry.i;
		} // else it is totally possible for cBuildEntry to be null, because i searched by `p` it just means that path does not have a custom icon
	}
	if (!iconInfosObj.base.slug) {
		// means no custom icon set or dev mode is off... so use aExeChannel to determine base
		iconInfosObj.base.slug = getSlugForChannel(aExeChannel);
	}
	
	if (isSlugInChromeChannelIconsets(iconInfosObj.base.slug)) {
		iconInfosObj.base.chrome = true;
		iconInfosObj.base.dir = core.addon.path.images + 'channel-iconsets/' + iconInfosObj.base.slug;
		iconInfosObj.base.prefix = iconInfosObj.base.dir + '/' + iconInfosObj.base.slug + '_';
	} else {
		iconInfosObj.base.dir = OS.Path.join(core.profilist.path.images, iconInfosObj.base.slug);
		iconInfosObj.base.prefix = OS.Path.join(iconInfosObj.base.baseImagesDir, iconInfosObj.base.slug + '_');
	}
		
	
	iconInfosObj.slug = iconInfosObj.base.slug;
	
	if (aBadgeIconSlug) {
		iconInfosObj.badge = {};
		if (isSlugInChromeChannelIconsets(aBadgeIconSlug)) {
			iconInfosObj.badge.chrome = true;
			iconInfosObj.badge.badgeImagesSlug = aBadgeIconSlug;
			iconInfosObj.badge.badgeImagesDir = core.addon.path.images + 'channel-iconsets/' + iconInfosObj.badge.badgeImagesSlug;
			iconInfosObj.badge.badgeImagesPrefix = iconInfosObj.badge.badgeImagesDir + '/' + iconInfosObj.badge.badgeImagesSlug + '_';
		} else {
			iconInfosObj.badge.badgeImagesSlug = aBadgeIconSlug;
			iconInfosObj.badge.badgeImagesDir = OS.Path.join(core.profilist.path.images, iconInfosObj.badge.badgeImagesSlug);
			iconInfosObj.badge.badgeImagesPrefix = OS.Path.join(iconInfosObj.badge.badgeImagesDir, iconInfosObj.badge.badgeImagesSlug + '_');
		}
		iconInfosObj.slug += '__' + iconInfosObj.badge.badgeImagesSlug;
	}
	
	iconInfosObj.name = safedForPlatFS(iconInfosObj.slug);
	// set iconInfosObj.path
	if (core.os.mname == 'gtk') {
		iconInfosObj.path = iconInfosObj.name;
	} else {
		iconInfosObj.path = OS.Path.join(core.profilist.path.icons, iconInfosObj.name);
		if (core.os.mname == 'darwin') {
			// icns
			iconInfosObj.path += '.icns';
		} else {
			// its windows, so ico
			iconInfosObj.path += '.ico';
		}
	}
	
	return iconInfosObj;
}
// end - get profile spec based on function arguments

function getLinuxIsIconInstalledFromFS(aIconName) {
	// NOT aIconSlug, but aIconName, which is the safedForPlatFS
	// function is for linux only
	// because linux output sizes are [16, 24, 48, 96];, i will just check in folder of 16 for existence
	var linuxIconOutputSizes = [16, 24, 48, 96];
	switch (core.os.mname) {
		case 'qt':
			
				console.error('unsupported-platform', 'QT platform not yet supported, only GTK as of right now.');
				throw new MainWorkerError('unsupported-platform', 'QT platform not yet supported');
			
			break;
		case 'gtk':
			
				var dirpathHicolor = OS.Path.join(
					OS.Constants.Path.homeDir,
					'.local',
					'share',
					'icons',
					'hicolor'
				);
				
				var cSize = linuxIconOutputSizes[0];
				var cSizeIconPath = OS.Path.join(dirpathHicolor, cSizeName, 'apps', aIconName + '_' + cSize + '.profilist.png'); // link787575758 :note: because on linux i am installing to a global folder, instead of just .png i make it .profilist.png so its easy to identify what all profilist did on the system, when it comes time to uninstall
				
			break;
		default:
			throw new MainWorkerError('unsupported-platform', 'This function is only for Linux platforms, GTK only right now.');
	}
}

function uninstallLinuxIconForParamsFromFS(aIconName) {
	// NOT aIconSlug, but aIconName, which is the safedForPlatFS
	// because linux output sizes are [16, 24, 48, 96];, i will just check in folder of 16 for existence
	if (core.os.mname != 'gtk') {
		throw new MainWorkerError('unsupported-platform', 'This function is only for Linux platforms, GTK or QT.');
	}
	
	var linuxIconOutputSizes = [16, 24, 48, 96];
	
	
	var dirpathHicolor = OS.Path.join(
		OS.Constants.Path.homeDir,
		'.local',
		'share',
		'icons',
		'hicolor'
	);
	
	for (var i=0; i<linuxIconOutputSizes.length; i++) {
		var cSize = linuxIconOutputSizes[i];
		var cSizeName;
		if (cSize == 'svg') {
			cSizeName = 'scalable';
		} else {
			cSizeName = cSize + 'x' + cSize;
		}
		var cSizeIconPath = OS.Path.join(dirpathHicolor, cSizeName, 'apps', aIconName + '_' + cSize + '.profilist.png'); // :note: link787575758 because on linux i am installing to a global folder, instead of just .png i make it .profilist.png so its easy to identify what all profilist did on the system, when it comes time to uninstall
		OS.File.remove(cSizeIconPath, {ignoreAbsent:true});
	}
}

function createIconForParamsFromFS(aIconInfosObj) {
	// RETURNS
		// promise
			// resolve -
				// true - if created
				// false - if it already existed
			// reject -
				// i do not reject it as of now
			// caught -
				// i do not reject it as of now
	
	
	// aIconInfosObj is what is returned from getIconPathInfosForParamsFromIni
	
	
	var deferredMain_createIconForParamsFromFS = new Deferred();
	
	// check if it is installed(linux)/exists(win/darwin)
	if (core.os.mname == 'gtk') {
		rez_exists = getLinuxIsIconInstalledFromFS(aIconInfosObj.name); // i can use aIconInfosObj.path as when linux aIconInfosObj.path === aIconInfosObj.name in the getIconPathInfosForParamsFromIni function, but it makes more sense to use .name, in case i need to review the code in the future
	} else {
		rez_exists = OS.File.exists(aIconInfosObj.path);
	}
	if (rez_exists) {
		deferredMain_createIconForParamsFromFS.resolve(false);
	} else {
		var cCreateName = aIconInfosObj.name; // plat specific only for linux link787575758
		var cCreatePathDir = core.profilist.path.icons;
		var cOptions = {
			aBadge: aIconInfosObj.badge ? 4 : 0, // bottom right
			aScalingAlgo: 0 // jagged first
		};
		var cCreateType;
		var cOutputSizesArr;
		switch (core.os.mname) {
			case 'winnt':
			case 'winmo':
			case 'wince':
					
					cCreateType = 'ICO';
					cOutputSizesArr = [16, 24, 32, 48, 256];
					if (aIconInfosObj.badge) {
						cOptions.aBadgeSizePerOutputSize = [10, 12, 16, 24, 128];
					}
					
				break
			case 'gtk':
					
					cCreateName += '.profilist'; // link787575758
					cCreateType = 'Linux';
					cOutputSizesArr = [16, 24, 48, 96];
					if (aIconInfosObj.badge) {
						cOptions.aBadgeSizePerOutputSize = [10, 12, 16, 24, 128];
					}
					
				break
			case 'darwin':
					
					cCreateType = 'ICNS';
					cOutputSizesArr = [16, 32, 64, 128, 256, 512, 1024];
					
				break
			default:
				throw new MainWorkerError({
					name: 'addon-error',
					message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
				});
		}
		
		// populate cBaseSrcImgPathArr
		cBaseSrcImgPathArr = [];
		for (var i=0; i<cOutputSizesArr.length; i++) {
			cBaseSrcImgPathArr.push(aIconInfosObj.base.prefix + cOutputSizesArr[i] + '.png');
		}
	
		// if badge stuff
		if (aIconInfosObj.badge) {
			cOptions.aBadgeSizePerOutputSize = cOutputSizesArr.map(function(aOutputSize) {
				if (aOutputSize == 16) {
					return 10;
				} else {
					return aOutputSize / 2;
				}
			});
			// populate cOptions.aBadgeSrcImgPathArr
			cOptions.aBadgeSrcImgPathArr = [];
			for (var i=0; i<cOutputSizesArr.length; i++) {
				cOptions.aBadgeSrcImgPathArr.push(aIconInfosObj.badge.prefix + '_' + cOutputSizesArr[i] + '.png');
			}
		}
		
		console.time('promiseWorker-createIcon');
		self.postMessageWithCallback(['createIcon', cCreateType, cCreateName, cCreatePathDir, cBaseSrcImgPathArr, cOutputSizesArr, cOptions], function(aCreateIconRez) { // :note: this is how to call WITH callback
			console.timeEnd('promiseWorker-createIcon');
			console.log('back in promiseworker after calling createIcon, aCreateIconRez:', aCreateIconRez);
			deferredMain_createIconForParamsFromFS.resolve(true);
		});
	}
	return deferredMain_createIconForParamsFromFS.promise;
}

function getLauncherDirPathFromParams(aProfPath) {
	// RETURNS
		// string - platform path to the launcher
		
	var launcherDirName = HashString(aProfPath);
	// console.info('launcherDirName:', launcherDirName, '');
	// console.info('core.profilist.path.exes:', core.profilist.path.exes, '');
	var launcherDirPath = OS.Path.join(core.profilist.path.exes, launcherDirName + ''); // need to make launcherDirName a string otherwise OS.Path.join causes this error ```path.startsWith is not a function```
	console.info('launcherDirPath:', launcherDirPath, '');
	

	
	return launcherDirName;
}

function getFullPathToProfileDirFromIni(aProfPath) {
	// gets the full platform path to the profile directory, used for argument of launcher with -profile
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (cIniEntry.IsRelative == '1') {
		var cProfDirName = OS.Path.basename(OS.Path.normalize(ini[for_ini_key].props.Path));
		return OS.Path.join(core.profilist.path.defProfRt, cProfDirName);
	} else {
		return aProfPath;
	}
}

function getLauncherNameFromParams(aExeChannel, aProfName) {
	// RETURNS
		// string - current platform safed, the name in format Firefox CHANNEL_NAME - PROFILE_NAME
	
	var exeChannelDisplayName;
	switch (aExeChannel) {
		case 'esr':
				
				return 'ESR'; // :todo::l10n: localize?
			
			break;
		case 'release':
				
				return '';
			
			break;
		case 'beta':
				
				return 'BETA'; // :todo::l10n: localize?
			
			break;
		case 'aurora':
				
				return 'Developer Edition'; // :todo::l10n: localize?
			
			break;
		case 'nightly':
				
				return 'Nightly'; // :todo::l10n: localize?
			
			break;
		case 'default':
				
				return 'Custom Build'; // :todo::l10n: localize
			
			break;
		default:
			console.error('A programtic channel value of "' + aExeChannel + '" does not have a recognized display name, so returning same thing');
			return aExeChannel.substr(0, 1).toUpperCase() + aExeChannel.substr(1);
	}
	
	if (exeChannelDisplayName != '') {
		exeChannelDisplayName = ' ' + exeChannelDisplayName; // link22323432345
	}
	
	return safedForPlatFS('Firefox' + exeChannelDisplayName + ' - ' + aProfName); // link22323432345 need prefixed space for exeChannelDisplayName
}

function createLauncherForParams(aLauncherDirPath, aLauncherName, aLauncherIconPath, aLauncherExePath, aFullPathToProfileDir) {
	// the arguments are what the launch should be created with, except aLuncherDirPath as that will be same for all
	// aLauncherExePath is the build the launcher should launch the profile into. such as exePath to beta or release or etc
	// aLauncherName is plat safed
	// RETURNS
		// string to launcher path (with .lnk, .app, .desktop, or whatever, i dont do it elsewhere as this createLauncherForParams is what decides what it should be) - if created
		// false - if it already existed
	// APIs ACCESSED
		// filesystem for channel - but cached so maybe not everytime
		// gIniObj for profile details on what it should be
	// if launcher already exists, then do nothing, else create it
	// :note::important: icon MUST exist before calling this function. this function assumes icon already exists for it.
	// :note: launchers name should "Firefox CHANNEL_NAME - PROFILE_NAME" and should be in ```OS.Path.join(core.profilist.path.exes, HashString(aProfPath))```. It should be the ONLY file in there.
	
	// get EXISTING launcherExeEntry - so this is different from getLauncherDirPathFromParams - the dir will be the same, but the existing name may be different
	var eLauncherEntry;
	var eLauncherDirIterator = new OS.File.DirectoryIterator(aLauncherDirPath);
	try {
		eLauncherEntry = eLauncherDirIterator.next(); // :todo: :note: this assumes that the exe is the ONLY file in there, maybe in future shoudl ensure, but we'll see how it works out with this assumption for now
	} catch(OSFileError) {
		console.info('OSFileError:', OSFileError, 'OSFileError.becauseNoSuchFile:', OSFileError.becauseNoSuchFile, 'OSFileError.becauseExists:', OSFileError.becauseExists, 'OSFileError.becauseClosed:', OSFileError.becauseClosed, 'OSFileError.unixErrno:', OSFileError.unixErrno, 'OSFileError.winLastError:', OSFileError.winLastError, '');
		if (!OSFileError.becauseNoSuchFile) {
			throw new MainWorkerError('createeLauncher', OSFileError);
		} // if it does not exist, thats ok, this func will carry on to create the launcher :todo: should make the dir though at this point, when we get error that dir doesnt exist
	} finally {
		eLauncherDirIterator.close();
	}

	var cLauncherPath;
	// assume if eLauncherEntry is undefined then assume eLauncher does not exist, so need to make it
	if (eLauncherEntry) {
		// assume eLauncher exists, as the dir exists :assumption: :todo: maybe i should not assume this, we'll see as i use it
		// get EXISTING eLauncherPath
			var eLauncherPath = eLauncherEntry.path; // this does not need test/verification, but it is used for the rename process if needed
			var eLauncherName = eLauncherEntry.name;
			
			var eLauncherIconSlug; // platform specific get method
			var eLauncherExePath; // platform specific get method // this is the exe/build it launches the profile in
			
			
			// start plat dependent stuff - the switch below does these steps for each platform
			// step1 - get eLauncherIconSlug
			// step2 - get eLauncherExePath
			// step3 - verify/update name
			// step4 - verify/update icon
			// step5 - verify/update exePath (the build it launches into)
			// step6 - return full path (with extension)
			
			switch (core.os.mname) {
				case 'winnt':
				case 'winmo':
				case 'wince':
				
						// step1 - get eLauncherIconSlug
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// step6 - return full path (with extension)
						
					break;
				case 'gtk':
				
						// step1 - get eLauncherIconSlug
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// step6 - return full path (with extension)
						
					break;
				case 'darwin':
				
						// step1 - get eLauncherIconSlug
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// step6 - return full path (with extension)
						
					break;
				default:
					throw new MainWorkerError({
						name: 'addon-error',
						message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
					});
			}
			
			/*
			// verify/update name
			if (eLauncherName != aLauncherName) {
				// rename file
			}
			
			// verify/update icon
			if (eLauncherIconSlug != aIconSlug){
				// update icon
			}
			
			if (eLauncherExePath != aLauncherExePath) {
				// update exe path within launcher
			}
			*/
			
		// :todo: verify/update icon
		// :todo: verify/update exe path (cannot verify this by name even if i include channel_name in it, because mutiple builds can have same build see link3347348473)
		// :todo: verify/update name - the name should be Firefox CHANNEL_NAME - PROFILE_NAME // just because CHANNEL_NAME is correct, does not mean the exe path is correct. as multiple builds can be "default" channel name instance - link3347348473
	} else {
		// assume eLauncher does not exist - so need to make it
		
		// start plat dependent stuff - the switch below does these steps for each platform
		// straight create the launcher
		
		switch (core.os.mname) {
			case 'winnt':
			case 'winmo':
			case 'wince':

					// create .lnk
					cLauncherPath = OS.Path.join(aLauncherDirPath, aLauncherName + '.lnk');
					
					var shellLinkPtr;
					var shellLink;
					var persistFile;
					var persistFilePtr;
					var propertyStore;
					var propertyStorePtr;
					try {
						var hr_CoInitializeEx = ostypes.API('CoInitializeEx')(null, ostypes.CONST.COINIT_APARTMENTTHREADED);
						console.info('hr_CoInitializeEx:', hr_CoInitializeEx, hr_CoInitializeEx.toString(), uneval(hr_CoInitializeEx));
						if (cutils.jscEqual(ostypes.CONST.S_OK, hr_CoInitializeEx)) {
							console.log('CoInitializeEx says successfully initialized');
							//shouldUninitialize = true; // no need for this, as i always unit even if this returned false, as per the msdn docs
						} else if (cutils.jscEqual(ostypes.CONST.S_FALSE, hr_CoInitializeEx)) {
							console.error('CoInitializeEx says the COM library is already initialized on this thread!!! This is weird I dont expect this to ever happen.'); // i made this console.error so it brings it to my attention. i dont expect this, if it happens i need to deal with it. thats why i dont throw new error here
						} else {
							console.error('Unexpected return value from CoInitializeEx: ' + hr);
							throw new Error('Unexpected return value from CoInitializeEx: ' + hr);
						}
						
						shellLinkPtr = ostypes.TYPE.IShellLinkW.ptr();
						var hr_CoCreateInstance = ostypes.API('CoCreateInstance')(ostypes.CONST.CLSID_ShellLink.address(), null, ostypes.CONST.CLSCTX_INPROC_SERVER, ostypes.CONST.IID_IShellLink.address(), shellLinkPtr.address());
						ostypes.HELPER.checkHRESULT(hr_CoCreateInstance, 'createLauncher -> CoCreateInstance');
						shellLink = shellLinkPtr.contents.lpVtbl.contents;

						persistFilePtr = ostypes.TYPE.IPersistFile.ptr();
						var hr_shellLinkQI = shellLink.QueryInterface(shellLinkPtr, ostypes.CONST.IID_IPersistFile.address(), persistFilePtr.address());
						ostypes.HELPER.checkHRESULT(hr_shellLinkQI, 'createLauncher -> QueryInterface (IShellLink->IPersistFile)');
						persistFile = persistFilePtr.contents.lpVtbl.contents;
						
						if (core.os.version >= 6.1) {
							// win7 and up
							propertyStorePtr = ostypes.TYPE.IPropertyStore.ptr();
							var hr_shellLinkQI2 = shellLink.QueryInterface(shellLinkPtr, ostypes.CONST.IID_IPropertyStore.address(), propertyStorePtr.address());
							ostypes.HELPER.checkHRESULT(hr_shellLinkQI2, 'createLauncher -> QueryInterface (IShellLink->IPropertyStore)');
							propertyStore = propertyStorePtr.contents.lpVtbl.contents;
						}
						
						var hr_SetPath = shellLink.SetPath(shellLinkPtr, aLauncherExePath);
						ostypes.HELPER.checkHRESULT(hr_SetPath, 'createLauncher -> SetPath');
						
						var hr_SetArguments = shellLink.SetArguments(shellLinkPtr, '-profile "' + aFullPathToProfileDir + '" -no-remote');
						ostypes.HELPER.checkHRESULT(hr_SetArguments, 'createLauncher -> SetArguments');
						
						var hr_SetIconLocation = shellLink.SetIconLocation(shellLinkPtr, aLauncherIconPath, 0); // 'iconIndex' in cObj ? cObj.iconIndex : 0
						ostypes.HELPER.checkHRESULT(hr_SetIconLocation, 'createLauncher -> SetIconLocation');
						
						if (core.os.version >= 6.1) {
							// win7 and up
							var hr_appUserModelId = ostypes.HELPER.IPropertyStore_SetValue(propertyStorePtr, propertyStore, ostypes.CONST.PKEY_AppUserModel_ID.address(), cObj.appUserModelId);
							ostypes.HELPER.checkHRESULT(OS.Path.basename(aLauncherDirPath), 'createLauncher -> hr_appUserModelId');
						}
						
						var hr_Save = persistFile.Save(persistFilePtr, cLauncherPath, false);
						ostypes.HELPER.checkHRESULT(hr_Save, 'createLauncher -> Save');
						
					} finally {
						console.log('doing winntShellFile_DoerAndFinalizer finalization');
						var sumThrowMsg = [];
						if (persistFile) {
							try {
								ostypes.HELPER.checkHRESULT(persistFile.Release(persistFilePtr), 'createLauncher -> persistFile.Release');
							} catch(e) {
								console.error("Failure releasing refs.persistFile: ", e.toString());
								sumThrowMsg.push(e.message);
							}
						}
						
						if (propertyStore) {
							try {
								ostypes.HELPER.checkHRESULT(propertyStore.Release(propertyStorePtr), 'createLauncher -> propertyStore.Release');
							} catch(e) {
								console.error("Failure releasing refs.propertyStore: ", e.message.toString());
								sumThrowMsg.push(e.message);
							}
						}

						if (shellLink) {
							try {
								ostypes.HELPER.checkHRESULT(shellLink.Release(shellLinkPtr), 'createLauncher -> shellLink.Release');
							} catch(e) {
								console.error("Failure releasing refs.shellLink: ", e.message.toString());
								sumThrowMsg.push(e.message);
							}
						}
						
						//if (shouldUninitialize) { // should always CoUninit even if CoInit returned false, per the docs on msdn
							ostypes.API('CoUninitialize')(); // return void
						//}
						
						if (sumThrowMsg.length > 0) {
							throw new Error(sumThrowMsg.join(' |||| '));
						}
						console.log('completed winntShellFile_DoerAndFinalizer finalization');
					}

				break;
			case 'gtk':

					// create .desktop
					cLauncherPath = OS.Path.join(aLauncherDirPath, aLauncherName + '.desktop');
					
					var cmdArr = [
						'[Desktop Entry]',
						'Name=' + aLauncherName,
						'Type=Application',
						'Icon=' + aLauncherIconPath,
						'Exec=' + aLauncherExePath + ' -profile "' + aFullPathToProfileDir + '" -no-remote'
					];
					
					try {
						var promise_writeScript = OS.File.writeAtomic(cLauncherPath, cmdArr.join('\n'), {encoding:'utf-8', /*unixMode:0o4777,*/ noOverwrite:true}); // doing unixMode:0o4777 here doesn't work, i have to `OS.File.setPermissions(path_toFile, {unixMode:0o4777})` after the file is made
					} catch(ex) {
						console.error('createLauncher-platform-error', ex);
						throw new MainWorkerError('createLauncher-platform-error', ex);
					}
					
					var promise_setPermsScript = OS.File.setPermissions(cLauncherPath, {unixMode:0o4777});

				break;
			case 'darwin':

					// create .app
					cLauncherPath = OS.Path.join(aLauncherDirPath, aLauncherName + '.app');

				break;
			default:
				throw new MainWorkerError({
					name: 'addon-error',
					message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
				});
		}
	}
	
	return cLauncherPath;
}

function launchOrFocusProfile(aProfPath, aOptions={}) {
	// get path to launcher. if it doesnt exist create it then return the path. if it exists, just return the path.
	
	// aOptions
	var cOptionsDefaults = {
		usePlat: false // by default will use ini
	}
	
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	// console.error('core.profilist.path.XREExeF:', core.profilist.path.XREExeF);
	var cProfIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (!cProfIniEntry) { console.error('should-nver-happen!', 'cProfIniEntry could not be found'); throw new MainWorkerError('should-nver-happen!', 'cProfIniEntry could not be found'); }
	
	if (aOptions.usePlat) {
		// get from platform, if the profile is running, and if it is then get the exePath it is in
		// :consider: right now i am updating gIniObj with the newly fetch details, but have :todo: deliver it to everywehre.
		var cRunningExePath = getRunningExePathForProfFromPlat(aProfPath);
		// :todo: check if gIniObj matches, if not as i modify it, then update it and send updates to gui's
		if (cRunningExePath) {
			cProfIniEntry.noWriteObj.status = true;
			cProfIniEntry.noWriteObj.exePath = cRunningExePath;
		} else {
			delete cProfIniEntry.noWriteObj.status;
			delete cProfIniEntry.noWriteObj.exepath;
		}
	}
	
	if (cProfIniEntry.noWriteObj.status) { // link6847494493
		// :todo: if its running, then run code to focus, then carry on to the createIconForParamsFromFS and createLauncherForParams
	}
	
	// these vars, are all the things it should SET-TO/NOW be - on launching
	var cExePath = getExePathForProfFromIni(aProfPath);
	console.info('cExePath:', cExePath);
	var cExeChannel = getExeChanForParamsFromFS(cExePath);
	console.info('cExeChannel:', cExeChannel);
	var cBadgeIconSlug = getBadgeSlugForProfFromIni(aProfPath);
	console.info('cBadgeIconSlug:', cBadgeIconSlug);
	var cIconInfosObj = getIconPathInfosForParamsFromIni(cExePath, cExeChannel, cBadgeIconSlug);
	console.info('cIconInfosObj:', cIconInfosObj);
	var cLauncherDirPath = getLauncherDirPathFromParams(aProfPath);
	console.info('cLauncherDirPath:', cLauncherDirPath);
	var cLauncherName = getLauncherNameFromParams(cExeChannel, cProfIniEntry.Name)
	console.info('cLauncherName:', cLauncherName);
	
	var cFullPathToProfileDir = getFullPathToProfileDirFromIni(aProfPath);
	
	// this is done after promise_createIcon
	var postCreateIcon = function() {
		var didCreateLauncher = createLauncherForParams(cLauncherDirPath, cLauncherName, cIconInfosObj.path, cExePath, cFullPathToProfileDir);
		
		if (!cProfIniEntry.noWriteObj.status) { // link6847494493 this tells me that it wasnt focused, so i launch it now
		
		}
	};
	
	var promise_createIcon = createIconForParamsFromFS(cIconInfosObj);
	promise_createIcon.then(
		function(aVal) {
			console.log('Fullfilled - promise_createIcon - ', aVal);
			postCreateIcon();
		},
		genericReject.bind(null, 'promise_createIcon', 0)
	).catch(genericReject.bind(null, 'promise_createIcon', 0));

	
	return 'ok launched aProfPath: ' + aProfPath;
}
// End - Launching profile and other profile functionality

// platform helpers
function createHardLink(aCreatePlatformPath, aTargetPlatformPath) {
	// returns true/false
	
	console.error('entered createHardLink - aCreatePlatformPath:', aCreatePlatformPath, 'aTargetPlatformPath:', aTargetPlatformPath);
	
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				// returns true/false
				// creates a hard link
				// directory must be different otherwise hard link fails to make, it makes a blank file, clicking it, pops open the windows "use what program to open this" thing
				// names can be different. // update of icon name or target path updates to the other. // update of file name does not propogate to the other
					// when make hardlink, the name can be different however the extension must be the same otherwise the hardlink doesnt connect and when you try to open windows asks you "open it with what?"
				// path_create and path_target must include extenions
				
				// cannot make hard link of a directory, files only
				
				var rez_CreateHardLink = ostypes.API('CreateHardLink')(path_create, path_target, null);
				console.info('rez_CreateHardLink:', rez_CreateHardLink.toString(), uneval(rez_CreateHardLink));
				if (ctypes.winLastError != 0) {
					if (ctypes.winLastError == OS.Constants.Win.ERROR_ALREADY_EXISTS) {
						// it already exists so it was already made so just return true
						console.log('CreateHardLink got winLastError for already existing, its rez was:', rez_CreateHardLink, 'but lets return true as if hard link was already made then no need to make again, all hardlinks update right away to match all from what it is hard linekd to');
						return true;
					}
					console.error('Failed rez_CreateHardLink, winLastError:', ctypes.winLastError);
					throw new Error('Failed rez_CreateHardLink, winLastError:', ctypes.winLastError);
				}
				return rez_CreateHardLink;
				
			break;
		case 'darwin':

				// http://stackoverflow.com/a/20467353/1828637
				// https://developer.apple.com/library/ios/documentation/Cocoa/Reference/Foundation/Classes/NSFileManager_Class/index.html#//apple_ref/occ/instm/NSFileManager/linkItemAtPath:toPath:error:
				/*
				 [[NSFileManager defaultManager] linkItemAtPath:<application path>
                                                toPath:shortCutDestPath
                                                 error:&error];
													 
					To update icon

					BOOL result = [[NSWorkspace sharedWorkspace] setIcon:imageIcon
                                       forFile: shortCutDestPath
                                       options:NSExclude10_4ElementsIconCreationOption];
				*/
				var NSFileManager = ostypes.HELPER.class('NSFileManager');
				var defaultManager = ostypes.HELPER.sel('defaultManager');
				var fm = ostypes.API('objc_msgSend')(NSFileManager, defaultManager);
				
				var chlNSStrings = new ostypes.HELPER.nsstringColl();
				try {
					
					// var NSError = ostypes.HELPER.class('NSError');
					var error = ctypes.voidptr_t(); //ostypes.API('objc_msgSend')(NSError, ostypes.HELPER.sel('errorWithDomain:code:userInfo:'), chlNSStrings.get('profilist'), ostypes.TYPE.NSInteger(0), ostypes.CONST.NIL);
					
					var rez_linkItemAtPath = ostypes.API('objc_msgSend')(fm, ostypes.HELPER.sel('linkItemAtPath:toPath:error:'), chlNSStrings.get(aTargetPlatformPath), chlNSStrings.get(aCreatePlatformPath), error.address());
					console.log('rez_linkItemAtPath:', rez_linkItemAtPath, cutils.jscGetDeepest(rez_linkItemAtPath));
					
					// have to cast it, because it returns a voidptr_t which is a "ctypes.voidptr_t(ctypes.UInt64("0x1"))" for YES, intersting
					
					if (cutils.jscEqual(ctypes.cast(rez_linkItemAtPath, ostypes.TYPE.BOOL), ostypes.CONST.YES)) {
						return true;
					} else {
						console.log('error was voidptr_t');
						// if it already exists, it will also be ostypes.CONST.NO, check error object to verify
						var errCode = ostypes.API('objc_msgSend')(error, ostypes.HELPER.sel('code'));
						console.log('errCode:', errCode);
						
						// var errDesc = ostypes.API('objc_msgSend')(error, ostypes.HELPER.sel('localizedDescription'));
						// console.log('errDesc:', errDesc, ostypes.HELPER.readNSString(errDesc));		
						
						// var errDomain = ostypes.API('objc_msgSend')(error, ostypes.HELPER.sel('domain'));
						// console.log('errDomain:', errDomain, ostypes.HELPER.readNSString(errDomain));

						
						var jsErrCode = ctypes.cast(errCode, ostypes.TYPE.NSInteger);
						console.log('jsErrCode:', jsErrCode);
						if (cutils.jscEqual(jsErrCode, ostypes.CONST.NSFileWriteFileExistsError)) {
							// it already exists
							console.warn('already exists');
							return true;
						}
						
						console.error('failed to create hard link with NSCocoaErrorDomain code of:', jsErrCode);
						
						return false;
					}
				} finally {
					chlNSStrings.releaseAll()
				}
			
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function createAlias(aCreatePlatformPath, aTargetPlatformPath) {
	switch (core.os.name) {
		case 'darwin':
				
				// this method is for OS X 10.6 +
				// http://stackoverflow.com/a/17923494/1828637
				/*
				http://developer.apple.com/library/mac/#documentation/Cocoa/Reference/Foundation/Classes/NSURL_Class/Reference/Reference.html#//apple_ref/occ/clm/NSURL/writeBookmarkData%3atoURL%3aoptions%3aerror%3a
				
				NSURL *originalUrl = [NSURL fileURLWithPath:@"/this/is/your/path"];
				NSURL *aliasUrl = [NSURL fileURLWithPath:@"/your/alias/path"];
				NSData *bookmarkData = [url bookmarkDataWithOptions: NSURLBookmarkCreationSuitableForBookmarkFile includingResourceValuesForKeys:nil relativeToURL:nil error:NULL];

				if(bookmarkData != nil) {
					BOOL success = [NSURL writeBookmarkData:bookmarkData toURL:aliasUrl options:NSURLBookmarkCreationSuitableForBookmarkFile error:NULL];
					if(NO == success) {
						//error
					}
				}
				*/
				
				var caNSStrings = new ostypes.HELPER.nsstringColl();
				
				try {
					var NSURL = ostypes.HELPER.class('NSURL');
					var originalUrl = ostypes.API('objc_msgSend')(NSURL, ostypes.HELPER.sel('fileURLWithPath:'), caNSStrings.get(aTargetPlatformPath));
					var aliasUrl = ostypes.API('objc_msgSend')(NSURL, ostypes.HELPER.sel('fileURLWithPath:'), caNSStrings.get(aCreatePlatformPath));
					
					console.log('originalUrl:', originalUrl);
					console.log('aliasUrl:', aliasUrl);
					
					var NULL = ctypes.voidptr_t(ctypes.UInt64('0x0')).address(); // because this is getting set to a pointer to error by this API call, i have to use a new NULL, not ostypes.CONST.NULL
					var bookmarkData = ostypes.API('objc_msgSend')(originalUrl, ostypes.HELPER.sel('bookmarkDataWithOptions:includingResourceValuesForKeys:relativeToURL:error:'), ostypes.CONST.NSURLBookmarkCreationSuitableForBookmarkFile, ostypes.CONST.NIL, ostypes.CONST.NIL, NULL);
					console.log('bookmarkData:', bookmarkData);

					if (cutils.jscEqual(bookmarkData, ostypes.CONST.NIL)) {
						console.error('failed to create bookmarkData');
						return false;
					} else {
						var NULL = ctypes.voidptr_t(ctypes.UInt64('0x0')).address();
						var rez_writeAlias = ostypes.API('objc_msgSend')(NSURL, ostypes.HELPER.sel('writeBookmarkData:toURL:options:error:'), bookmarkData, aliasUrl, ostypes.CONST.NSURLBookmarkCreationSuitableForBookmarkFile, NULL);
						console.log('rez_writeAlias:', rez_writeAlias);
						rez_writeAlias = ctypes.cast(rez_writeAlias, ostypes.TYPE.BOOL);
						console.log('casted:', rez_writeAlias);
						
						if (cutils.jscEqual(rez_writeAlias, ostypes.CONST.NO)) {
							console.error('failed to create alias for some reason');
							return false;
						} else {
							return true;
						}
					}
				}
				catch (ex) { console.error('ex happend:', ex); }
				finally {
					caNSStrings.releaseAll();
				}
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}
// End - Addon Functionality

// start - common helper functions
function getRelativeDescriptor(ofOsPath, fromOsPath) {
	// requires escapeRegExp
	
	// aim of this function is to provide a worker equivalent for:
		// for: ```new FileUtils.File(OS.Constants.Path.profileDir).getRelativeDescriptor(Services.dirsvc.get('UAppData', Ci.nsIFile))```
		// so now is: ```getRelativeDescriptor(OS.Constants.Path.profileDir, OS.Constants.Path.userApplicationDataDir)```
	
	var osFilePathSeperator = OS.Path.join(' ', ' ').replace(/ /g, '');
	// console.error('osFilePathSeperator:', osFilePathSeperator);
	
	var pattGlobalFileSperator = new RegExp(escapeRegExp(osFilePathSeperator), 'g');
	
	return ofOsPath.replace(fromOsPath, '').replace(pattGlobalFileSperator, '/').substr(1); // substr 1 because first char will be osFilePathSeperator
}

function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g'); // doesnt work in strict mode ```'use strict';```
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}

// rev1 - https://gist.github.com/Noitidart/8684e8f9488bd0bdc3f8 - https://gist.github.com/Noitidart/8684e8f9488bd0bdc3f8
var gTxtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!gTxtDecodr) {
		gTxtDecodr = new TextDecoder();
	}
	return gTxtDecodr;
}
var gTxtEncodr; // holds TextDecoder if created
function getTxtEncodr() {
	if (!gTxtEncodr) {
		gTxtEncodr = new TextEncoder();
	}
	return gTxtEncodr;
}

// rev3 - _ff-addon-snippet-mfbtHashString - https://gist.github.com/Noitidart/d4bbbf56250a9c3f88ce
var HashString = (function (){
	/**
	 * Javascript implementation of
	 * https://hg.mozilla.org/mozilla-central/file/0cefb584fd1a/mfbt/HashFunctions.h
	 * aka. the mfbt hash function.
	 */ 
	// Note: >>>0 is basically a cast-to-unsigned for our purposes.
	const encoder = getTxtEncodr();
	const kGoldenRatio = 0x9E3779B9;

	// Multiply two uint32_t like C++ would ;)
	const mul32 = (a, b) => {
	// Split into 16-bit integers (hi and lo words)
		var ahi = (a >> 16) & 0xffff;
		var alo = a & 0xffff;
		var bhi = (b >> 16) & 0xffff
		var blo = b & 0xffff;
		// Compute new hi and lo seperately and recombine.
		return (
			(((((ahi * blo) + (alo * bhi)) & 0xffff) << 16) >>> 0) +
			(alo * blo)
		) >>> 0;
	};

	// kGoldenRatioU32 * (RotateBitsLeft32(aHash, 5) ^ aValue);
	const add = (hash, val) => {
		// Note, cannot >> 27 here, but / (1<<27) works as well.
		var rotl5 = (
			((hash << 5) >>> 0) |
			(hash / (1<<27)) >>> 0
		) >>> 0;
		return mul32(kGoldenRatio, (rotl5 ^ val) >>> 0);
	}

	return function(text) {
		// Convert to utf-8.
		// Also decomposes the string into uint8_t values already.
		var data = encoder.encode(text);

		// Compute the actual hash
		var rv = 0;
		for (var c of data) {
			rv = add(rv, c | 0);
		}
		return rv;
	};
})();

// rev1 - _ff-addon-snippet-safedForPlatFS.js - https://gist.github.com/Noitidart/e6dbbe47fbacc06eb4ca
var _safedForPlatFS_pattWIN = /([\\*:?<>|\/\"])/g;
var _safedForPlatFS_pattNIXMAC = /\//g;
function safedForPlatFS(aStr, aOptions={}) {
	// short for getSafedForPlatformFilesystem - meaning after running this on it, you can safely use the return in a filename on this current platform
	// aOptions
	//	repStr - use this string, in place of the default repCharForSafePath in place of non-platform safe characters
	//	allPlatSafe - by default it will return a path safed for the current OS. Set this to true if you want to to get a string that can be used on ALL platforms filesystems. A Windows path is safe on all other platforms
	
	// set defaults on aOptions
	if (!('allPlatSafe' in aOptions)) {
		aOptions.allPlatSafe = false;
	}
	if (!('repStr' in aOptions)) {
		aOptions.repStr = '-';
	}
	
	var usePlat = aOptions.allPlatSafe ? 'winnt' : core.os.name; // a windows path is safe in all platforms so force that. IF they dont want all platforms then use the current platform
	switch (usePlat) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				return aStr.replace(_safedForPlatFS_pattWIN, aOptions.repStr);
				
			break;
		default:
		
				return aStr.replace(_safedForPlatFS_pattNIXMAC, aOptions.repStr);
	}
}
function validateOptionsObj(aOptions, aOptionsDefaults) {
	// ensures no invalid keys are found in aOptions, any key found in aOptions not having a key in aOptionsDefaults causes throw new Error as invalid option
	for (var aOptKey in aOptions) {
		if (!(aOptKey in aOptionsDefaults)) {
			console.error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value, aOptionsDefaults:', aOptionsDefaults, 'aOptions:', aOptions);
			throw new Error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value');
		}
	}
	
	// if a key is not found in aOptions, but is found in aOptionsDefaults, it sets the key in aOptions to the default value
	for (var aOptKey in aOptionsDefaults) {
		if (!(aOptKey in aOptions)) {
			aOptions[aOptKey] = aOptionsDefaults[aOptKey];
		}
	}
}
function Deferred() { // rev3 - https://gist.github.com/Noitidart/326f1282c780e3cb7390
	// update 062115 for typeof
	if (typeof(Promise) != 'undefined' && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
		/* A method to resolve the associated Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} value : This value is used to resolve the promise
		 * If the value is a Promise then the associated promise assumes the state
		 * of Promise passed as value.
		 */
		this.resolve = null;

		/* A method to reject the assocaited Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} reason: The reason for the rejection of the Promise.
		 * Generally its an Error object. If however a Promise is passed, then the Promise
		 * itself will be the reason for rejection no matter the state of the Promise.
		 */
		this.reject = null;

		/* A newly created Pomise object.
		 * Initially in pending state.
		 */
		this.promise = new Promise(function(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
		Object.freeze(this);
	}
}
function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};
	console.error('Rejected - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};
	console.error('Caught - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
// end - common helper functions