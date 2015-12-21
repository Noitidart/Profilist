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
self.addEventListener('message', msg => worker.handleMessage(msg));

// Define a custom error prototype.
function MainWorkerError(msgObj) {
  this.message = msgObj.message;
  this.name = msgObj.name;
}
MainWorkerError.prototype.toMsg = function() {
  return {
    exn: 'MainWorkerError',
    message: this.message,
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
	core.profilist.path.images = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'icons');
	core.profilist.path.exes = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'exes');
	core.profilist.path.ini = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
	core.profilist.path.inibkp = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'profiles.ini.bkp');
	
	core.os.mname = core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name; // mname stands for modified-name	
	
	// I import ostypes_*.jsm in init as they may use things like core.os.isWinXp etc
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.modules + 'ostypes_win.jsm');
			break
		case 'gtk':
			importScripts(core.addon.path.modules + 'ostypes_gtk.jsm');
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
	readIni();
	
	console.log('MainWorker init success');
	return true; // required for SIPWorker
}

// Start - Addon Functionality

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
		defaultSpecific: false,	// means by default it affects all profiles (its unspecific) // this key only for prefs // this key only for prefs with specificOnly:false
		defaultValue: '1',		// this key only for prefs // if value not found in profile group, or general group. then this value is used. // if value found in general, but specific is set to true by user, then use the value from general. // if value found in profile, and specific is set to false by user, then set general value, and delete the one from profile group
		possibleValues: [
			'0',				// devmode off
			'1'					// devmode on
		]
	},
	ProfilistSort: {			// the order in which to show the other-profiles in the profilist menu.
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
		defaultValue: '2',
		possibleValues: [		// link83737383
			'0',				// by create order ASC
			'1',				// by create order DESC
			'2',				// by alpha-numeric-insensitive ASC
			'3'					// by alpha-numeric-insensitive DESC
		]
	},
	ProfilistNotif: {			// whether or not to show notifications
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
		defaultValue: '1',
		possibleValues: [
			'0',				// dont show
			'1'					// show
		]
	},
	ProfilistLaunch: {			// whether on user click "create new profile" if should launch right away using default naming scheme for Path and Name
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
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
		defaultValue: '0',
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
	
	// format gIniObj - :note: :important: all values must be strings, UNLESS in noWriteObj
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
	gJProfilistDev = getPrefLikeValForKeyInIniEntry(curProf_iniEntry, gGenIniEntry, 'ProfilistDev') == '1' ? true : false;
	
	// IF dev mode is enabled in currentProfile THEN do the appropriate stuff
	if (gJProfilistDev) {
		// set gJProfilistBuilds
		gJProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(curProf_iniEntry, gGenIniEntry, 'ProfilistBuilds'));
		
		// start - for all that are running set exePath
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

// start - profilist helper functions FOR WORKER ONLY
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

// End - Addon Functionality

// start - common helper functions
function getRelativeDescriptor(ofOsPath, fromOsPath) {
	// requires escapeRegExp
	
	// aim of this function is to provide a worker equivalent for:
		// for: ```new FileUtils.File(OS.Constants.Path.profileDir).getRelativeDescriptor(Services.dirsvc.get('UAppData', Ci.nsIFile))```
		// so now is: ```getRelativeDescriptor(OS.Constants.Path.profileDir, OS.Constants.Path.userApplicationDataDir)```
	
	var osFilePathSeperator = OS.Path.join(' ', ' ').replace(/ /g, '');
	console.error('osFilePathSeperator:', osFilePathSeperator);
	
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
// end - common helper functions