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
	curProf_iniEntry.noWriteObj.status = true;
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
		return cIniEntry.exePath;
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
		var curProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
		return curProfIniEntry.exePath;
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
function getLauncherNameForParamsFromIni(aProfName, aExePath, aExeChannel) {
	// :note: this does not do running check, nor does it do any of the get***ForIniEntry calls it just returns based on the arguments provided
	// RETURNS
		// "Firefox CHANNEL_NAME_OF_THAT_PATH - PROFILE_NAME" path
}
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
	//			dirPath: ''
	//			imagesPathPrefix: ''
	//			isChromePath: true/false // only if isSlugInChromeChannelIconsets
	//		},
	//		badge: {
	//			slug: '' // same thing as dirName
	//			dirPath: ''
	//			imagesPathPrefix: ''
	//			isChromePath: true/false // only if isSlugInChromeChannelIconsets
	//		},
	//		iconPath: 'string to file system path'
	//	}
	
	var iconInfoObj = {};
	var baseImagesDir;
	var badgeImagesDir;
	var baseImagesPrefix; // holds the path to images prefix. this means so like `chrome://profilist/blah/blah/aurora_` or `core.profilist.path.images/user-picked-img_` so I have to just append the size number and .png so like 16.png or 48.png etc to it
	var badgeImagesPrefix;
	var baseImagesSlug;
	var badgeImagesSlug;
	
	iconInfoObj.base = {};
	if (gJProfilistDev) {
		// note: if dev mode is on in this current profile, then check if there is a custom icon for aExePath. else dont check custom just check channel
		var cBuildEntry = getBuildEntryByKeyValue(gJProfilistBuilds, 'p', aExePath);
		if (cBuildEntry) {
			baseImagesSlug = cBuildEntry.i;
			baseImagesDir = OS.Path.join(core.profilist.path.images, baseImagesSlug);
			baseImagesPrefix = OS.Path.join(baseImagesDir, baseImagesSlug + '_');
		} // else it is totally possible for cBuildEntry to be null, because i searched by `p` it just means that path does not have a custom icon
	}
	if (!baseImagesDir) {
		// means no custom icon set or dev mode is off... so use aExeChannel to determine base
		baseImagesSlug = getSlugForChannel(aExeChannel);
		baseImagesDir = core.addon.path.images + 'channel-iconsets/' + baseImagesSlug;
		baseImagesPrefix = baseImagesDir + '/' + baseImagesSlug + '_';
	}
	
	var iconDirName = baseImagesSlug;
	
	if (aBadgeIconSlug) {
		iconInfoObj.badge = {};
		if (isSlugInChromeChannelIconsets(aBadgeIconSlug)) {
			badgeImagesSlug = aBadgeIconSlug;
			badgeImagesDir = core.addon.path.images + 'channel-iconsets/' + badgeImagesSlug;
			badgeImagesPrefix = baseImagesDir + '/' + badgeImagesSlug + '_';
		} else {
			badgeImagesSlug = aBadgeIconSlug;
			badgeImagesDir = OS.Path.join(core.profilist.path.images, badgeImagesSlug);
			badgeImagesPrefix = OS.Path.join(baseImagesDir, badgeImagesSlug + '_');
		}
		iconDirName += '__' + badgeImagesSlug;
	}
	
	iconInfoObj.iconPath = OS.Path.join(core.profilist.path.icons, iconDirName)
	return iconInfoObj;
}
// end - get profile spec based on function arguments
function shouldCreateIcon(aProfPath) {
	// checks filesystem with getIconPathForParams() based on getExePathForIniEntry() (so this tests for tie and running from gIniObj)
	return false;
}

function createLauncher(aProfPath) {
	// RETURNS
		// path to launcher
	// APIs ACCESSED
		// filesystem for channel - but cached so maybe not everytime
		// gIniObj for profile details on what it should be
	// if launcher already exists, then do nothing, else create it
	// :note::important: icon MUST exist before calling this function. this function assumes icon already exists for it.
	// :note: launchers name should "Firefox CHANNEL_NAME - PROFILE_NAME" and should be in ```OS.Path.join(core.profilist.path.exes, HashString(aProfPath))```. It should be the ONLY file in there.
	
	var launcherDirName = HashString(aProfPath);
	// console.info('launcherDirName:', launcherDirName, '');
	// console.info('core.profilist.path.exes:', core.profilist.path.exes, '');
	var launcherDirPath = OS.Path.join(core.profilist.path.exes, launcherDirName + ''); // need to make launcherDirName a string otherwise OS.Path.join causes this error ```path.startsWith is not a function```
	console.info('launcherDirPath:', launcherDirPath, '');
	
	// get launcherExePath
	var launcherExeEntry;
	var launcherDirIterator = new OS.File.DirectoryIterator(launcherDirPath);
	try {
		launcherExeEntry = launcherDirIterator.next(); // :todo: :note: this assumes that the exe is the ONLY file in there, maybe in future shoudl ensure, but we'll see how it works out with this assumption for now
	} catch(OSFileError) {
		if (!OSFileError.becauseNoSuchFile) {
			console.error('OSFileError:', OSFileError, 'OSFileError.becauseNoSuchFile:', OSFileError.becauseNoSuchFile, 'OSFileError.becauseExists:', OSFileError.becauseExists, 'OSFileError.becauseClosed:', OSFileError.becauseClosed, 'OSFileError.unixErrno:', OSFileError.unixErrno, 'OSFileError.winLastError:', OSFileError.winLastError, '');
			throw new MainWorkerError('createLauncher', OSFileError);
		}
	} finally {
		launcherDirIterator.close();
	}
	
	// assume if launcherExeEntry is undefined then assume launcher does not exist, so need to make it
	var launcherExePath;
	// get cacluated values for the verify/set part
	var shouldBeExePath = getExePathForIniEntry(aProfPath);
	var shouldBeExeChannel = getExeChannelForParams(shouldBeExePath);
	var shouldBeBadge = getBadgeForIniEntry(aProfPath);
	var shouldBeIconPath = getIconPathForParams(shouldBeExePath);
	var shouldBeName = getLauncherNameForProf(aProfPath);
	if (launcherExeEntry) {
		// assume launcher exists, as the dir exists :assumption: :todo: maybe i should not assume this, we'll see as i use it
		launcherExePath = launcherExeEntry.path;
		// :todo: verify/update icon
		// :todo: verify/update exe path (cannot verify this by name even if i include channel_name in it, because mutiple builds can have same build see link3347348473)
		// :todo: verify/update name - the name should be Firefox CHANNEL_NAME - PROFILE_NAME // just because CHANNEL_NAME is correct, does not mean the exe path is correct. as multiple builds can be "default" channel name instance - link3347348473
	} else {
		// assume launcher does not exist - so need to make it
	}
	
	return launcherExePath;
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
	
	// check if need to create icon
	// self.postMessage(['createIcon', 'aPathsObj']); // :note: this is how to call with no callback
	self.postMessageWithCallback(['createIcon', 'aPathsObj'], function(aCreateIconRez) { // :note: this is how to call WITH callback
		console.log('back in promiseworker after calling createIcon, aCreateIconRez:', aCreateIconRez);
	});
	
	getExeChanForParamsFromFS(core.profilist.path.XREExeF);
	// var launcherExePath = createLauncher(aProfPath);
	
	
	
	return 'ok launched aProfPath: ' + aProfPath;
}
// End - Launching profile and other profile functionality

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
// end - common helper functions