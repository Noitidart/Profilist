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
importScripts(core.addon.path.modules + 'commonProfilistFuncs.js');

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
	core.profilist.path.images = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'images'); // :note: this directory should hold all the original sizes provided by the user
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
		case 'darwin':
				
				if (core.profilist.path.XREExeF.indexOf(core.profilist.path.root) === 0) {
					console.warn('XREExeF is a symlink path!:', core.profilist.path.XREExeF);
					var XREExeF_filename = OS.Path.basename(core.profilist.path.XREExeF); // i have never seen it be anything other then "firefox" but just to be safe. i do assume "firefox" in other places in my code, i should make that code be not assumption based
					core.profilist.path.XREExeF = OS.Path.join(resolveSymlinkPath(OS.Path.dirname(core.profilist.path.XREExeF)), XREExeF_filename); // I do OS.Path.dirname(core.profilist.path.XREExeF) because `/Users/noida/Library/Application Support/Firefox/profilist_data/exes/1756982928/Firefox Developer Edition - Unnamed Profile 1.app/Contents/MacOS/firefox` is NOT a symlink, so it readlink will give rez of -1 and errno of EINVAL which is 22 meaning file is not a symlink or buffer size is negative. MacOS folder is a symlink though so thats why i do it
					console.log('XREExeF UN-linkd path:', core.profilist.path.XREExeF);
				}
				
			break;
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
		defaultValue: '2',
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
		defaultValue: '0',
		possibleValues: [
			'0',				// dont launch right away, allow user to type a path, then hit enter (just create dont launch), alt+enter (create with this name then launch) // if user types a system path, then it is created as IsRelative=0
			'1'					// launch right away, as IsRelative=1, with default naming scheme for Path and Name
		]
	},
	ProfilistBadge: {			// slug_of_icon_in_icons_folder
		specificOnly: true
	},
	ProfilistBadgeLoc: {	// slug_of_icon_in_icons_folder
		unspecificOnly: true,
		defaultValue: '4',
		possibleValues: [
			'1',				// top left
			'2',				// top right
			'3',				// bottom left
			'4'					// bottom right
		]
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
		console.error('needs to read backup file as no ProfilistStatus found in ini');
		try {
		   rez_read = OS.File.read(core.profilist.path.inibkp, {encoding:'utf-8'});
		} catch (ex if ex instanceof OS.File.Error && ex.becauseNoSuchFile) {
			console.log('inibkp does not exist!');
		}
		strIniContents = rez_read;
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
	// deletes the noWriteObj in each entry, then populates it
	// acts on gIniObj
	
	// also triggers writeIni in cases where it is needed, does so in these instances:
	//	* if the curProfIniEntry is not touched
	//	* 
	
	// format gIniObj - :note: :important: all values must be strings, UNLESS in noWriteObj
	// format means to go through and set noWriteObj in the gIniObj appropariately. appropariately means based on the prefs it will set stuff
	
	
	// give every iniEntry a noWriteObj
	for (var i=0; i<gIniObj.length; i++) {
		gIniObj[i].noWriteObj = {};
	}
	
	// identify AND mark the ini entry that is of the currently selected profile (meaning this profile that is running the code)
	var curProfIniEntry; // short for currently selected profile's ini entry
	var curProfRt = OS.Constants.Path.profileDir; // using same pattern as ```defProfRt: Services.dirsvc.get('DefProfRt', Ci.nsIFile).path,```
	var curProf_isRelative;
	var curProf_relativeDescriptor; // only set it curProf_isRelative == true
	if (curProfRt.indexOf(core.profilist.path.defProfRt) > -1) {
		curProf_isRelative = true;
		curProf_relativeDescriptor = getRelativeDescriptor(curProfRt, OS.Constants.Path.userApplicationDataDir);
	} else {
		curProf_isRelative = false;
	}
	for (var i=0; i<gIniObj.length; i++) {
		// if its a profile
		if (gIniObj[i].Path) {
			
			// test if it is the currentProfile
			if (!curProfIniEntry) {
				if (curProf_isRelative && gIniObj[i].IsRelative == '1' && curProf_relativeDescriptor == gIniObj[i].Path) {
					foundCurrentProfile = true;
					gIniObj[i].noWriteObj.currentProfile = true;
					curProfIniEntry = gIniObj[i];
				} else if (!curProf_isRelative && (gIniObj[i].IsRelative == '0' || !gIniObj[i].IsRelative /* verify if a non-relative profile exists, check to see if ever IsRelative is omitted, or is it everytime set equal to 0*/) && curProfRt == gIniObj[i].Path) {
					foundCurrentProfile = true;
					gIniObj[i].noWriteObj.currentProfile = true;
					curProfIniEntry = gIniObj[i];
				}
			}
			
		}
	}
	
	// settle curProfIniEntry - meaning if its temporary profile, and it has no entry in ini, then put one in -- no need to test/set writeIni here, at the end i test if curProfIniEntry is touched, and obviously it wont be so it will get touched and written
	// update noWriteObj of currentProfile OR if its a temp profile then update gIniObj with it and write it to ini
	// if (!foundCurrentProfile || (foundCurrentProfile && curProfIniEntry.groupName.indexOf('TempProfile') == 0)) {
		// its a temp profile
		if (!curProfIniEntry) {
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
			curProfIniEntry = {
				groupName: 'TempProfile' + (cMaxProfileNum + 1)
			}
		}
	// }

	// go through and note in noWriteObj if its a temporary profile
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].groupName.indexOf('[TempProfile') > -1) {
			gIniObj[i].noWriteObj.temporaryProfile = true;
		}
	}
	
	// set running statuses
	var optsFor_GetIsRunningFromIniFromPlat = {};
	if (['winnt', 'wince', 'winmo'].indexOf(core.os.mname) > -1) {
		optsFor_GetIsRunningFromIniFromPlat.winProcessIdsInfos = getAllPID({firefoxOnly:false});
	}
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			gIniObj[i].noWriteObj.status = getIsRunningFromIniFromPlat(gIniObj[i].Path, optsFor_GetIsRunningFromIniFromPlat);
		}
	}
	
	// set global var telling if dev mode is on or off
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General'); // not really global. i usually use g prefix on real global vars. but here im just using it to idicate that the general etnry if from gIniObj
	gJProfilistDev = getPrefLikeValForKeyInIniEntry(curProfIniEntry, gGenIniEntry, 'ProfilistDev') == '1' ? true : false;
	console.error('gJProfilistDev:', gJProfilistDev);
	
	// IF dev mode is enabled in currentProfile THEN do the appropriate stuff
	if (gJProfilistDev) {
		
		/////// debug
		// set gJProfilistBuilds
		// if (!this.debuggedProfilistBuilds) { // :debug:
		// 	gGenIniEntry.ProfilistBuilds = '[{"id":10,"p":"d.exe","i":"dev"},{"id":9,"p":"a.exe","i":"aurora"},{"id":8,"p":"n.exe","i":"nightly"}]'; // :debug:
		// 	this.debuggedProfilistBuilds = true; // :debug:
		// } // :debug:
		/////// debug

		// set gJProfilistBuilds
		gJProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(curProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));		
		
		// for all that are running set exeIconSlug and exePath
		// in order to set exeIconSlug I need exePath (since i need exePath anyways i set it - this is INIOBJ_RULE#7)
		for (var i=0; i<gIniObj.length; i++) {
			if (gIniObj[i].noWriteObj.status) { // this loop will for sure hit the curProfIniEntry.noWriteObj.currentProfile entry as it has obviously status
				// its profile type tbb with exe needed
				gIniObj[i].noWriteObj.exePath = getLastExePathForProfFromFS(gIniObj[i].Path);
				console.log(gIniObj[i].Name, 'exePath:', gIniObj[i].noWriteObj.exePath);
				var cExePathChan = getExeChanForParamsFromFSFromCache(gIniObj[i].noWriteObj.exePath);
				// console.log('cExePathChan:', cExePathChan);
				var cExeImgSlug = getSlugForExePathFromParams(gIniObj[i].noWriteObj.exePath, gJProfilistDev, gJProfilistBuilds, cExePathChan);// check gJProfilistBuilds if this exePath has a custom icon - IF TRUE then set exeIconSlug to that ELSE then set exeIconSlug to getSlugForChannel(getExeChanForParamsFromFSFromCache(exePath))
				gIniObj[i].noWriteObj.exeIconSlug = cExeImgSlug
			}
		}
		
	} else {
		gJProfilistBuilds = [];
	}
	
	// for all imgSlug's in iniObj lets get the img src path for the size nearest to 16
		// must go after the dev block where I get all exeIconSlug's, because in case dev mode is on then i will be populating those img srcs for those slugs
		// set imgsrc rez objs for all exePath slugs - because all, i ahve to do this after get all exePaths
		// set imgsrc rez objs for all ProfilistBadge slugs
	gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug = {}; // not just forExeImgSlug but also forBadgeImgSlug
	if (gJProfilistDev) {
		for (var i=0; i<gJProfilistBuilds.length; i++) {
			var exeImgSlug = gJProfilistBuilds[i].i;
			gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[exeImgSlug] = 'todo';
		}
	}
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			// its profile type tbb
			
			if (gJProfilistDev) {
				var profExeImgSlug = gIniObj[i].noWriteObj.exeIconSlug;
				
				if (profExeImgSlug) {
					gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[profExeImgSlug] = 'todo';
				}
			}
			
			var profBadgeSlug = gIniObj[i].ProfilistBadge;
			if (profBadgeSlug) {
				gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[profBadgeSlug] = 'todo';
			}
		}
	}
	
		// now go through and fetch all the nearest 16 img srcs
	for (var aImgSlug in gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug) {
		gGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[aImgSlug] = getImgSrcForSize(getImgSrcsForImgSlug(aImgSlug), 16);
	}
	
	// figure out if need to touch ini for currentProfile, and if have to, then touch it, then write it to ini and inibkp
	if (!('ProfilistStatus' in curProfIniEntry) || curProfIniEntry.ProfilistStatus !== '1') { // INIOBJ_RULE#3 // even though i store as string, i am doing ```key in``` check instead of !curProfIniEntry.ProfilistStatus - just in case somehow in future ProfilistStatus = "0" gets parsed as int, it should never though
		// need to touch
		curProfIniEntry.ProfilistStatus = '1';
		writeIni();
	}
}

function writeIni() {
	// write gIniObj to core.profilist.path.ini && core.profilist.path.inibkp
	// :note: :important: things in noWriteObj are not strings, and even if they are, it doesnt get written
	
	var writeStrArr = [];
	
	var thisProfileGroupNum = 0;
	for (var i=0; i<gIniObj.length; i++) {
		var indexOfProfile = gIniObj[i].groupName.indexOf('Profile');
		if (indexOfProfile == 0 /* std profile group */ || indexOfProfile == 4 /* temp profile */) {
			writeStrArr.push('[' + gIniObj[i].groupName.substr(0, indexOfProfile + 7 /* len of word Profile */) + thisProfileGroupNum + ']'); // i calculate the TempProfile## or the Profile## so when I create or delete a profile I dont have to worry about using right number :note: // link88574221
			thisProfileGroupNum++;
		} else {
			writeStrArr.push('[' + gIniObj[i].groupName + ']');
		}
		for (var p in gIniObj[i]) {
			if (p == 'noWriteObj' || p == 'groupName') {
				continue;
			}
			writeStrArr.push(p + '=' + gIniObj[i][p]);
		}
		writeStrArr.push('');
	}
	writeStrArr.push('');
	var writeStr = writeStrArr.join('\n');
	console.log('should now write:', writeStr);
	
	OS.File.writeAtomic(core.profilist.path.ini, writeStr, {encoding:'utf-8'});
	
	OS.File.writeAtomic(core.profilist.path.inibkp, writeStr, {encoding:'utf-8'});
}

function fetchAll() {
	// returns an object with gIniObj, gKeyInfoStore, and core
	/*
	var sIniObj = JSON.parse(JSON.stringify(gIniObj)); // s means for state in react
	
	for (var i=0; i<sIniObj.length; i++) {
		sIniObj[i].noWriteObj = {};
	}
	*/
	readIni(); // // link9111119111 this is temporary, till i hook up file watcher
	return {
		aIniObj: gIniObj,
		aKeyInfoStore: gKeyInfoStore,
		aCore: core
	};
}

function fetchJustIniObj() {
	// returns gIniObj
	readIni(); // // link9111119111 this is temporary, till i hook up file watcher
	return gIniObj;
}

function userManipulatedIniObj_updateIniFile(aNewIniObjStr) {
	gIniObj = JSON.parse(aNewIniObjStr);
	formatNoWriteObjs();
	
	writeIni();
	
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
	// GEN_RULE#1 slug is a plat slafed string
	// console.info('aChannel: -----' + aChannel + '------');
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

function getSlugForExePathFromParams(aExePath, aJProfilistDev, aJProfilistBuilds, aExeChannel) {
	// 010916
	// FromChannel means it may read platform (so FromFS) to figure out channel of that exePath, but after it figures it once, then it is cached and it is no longer FromFS it is FromCache
	// RETURNS
		// string - platform safed phrase. this phrase is found at ```OS.Path.join(core.profilist.path.icons, PHRASE, PHRASE + '_##.png')``` OR ```core.addon.path.images + 'channel-iconsets/' + PHRASE + '_##.png'``` - GEN_RULE#1
	
	if (aJProfilistDev) {
		var cBuildEntry = getBuildEntryByKeyValue(aJProfilistBuilds, 'p', aExePath);
		if (cBuildEntry) {
			return cBuildEntry.i;
		} // else it is totally possible for cBuildEntry to be null, because i searched by `p` it just means that path does not have a custom icon
	}
	// if get to this line - it means no custom icon set or dev mode is off... so use aExeChannel to determine base
	return getSlugForChannel(aExeChannel);
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
var gCache_getImgSrcsForImgSlug = {}; // used to store paths for custom slugs, until this is invalidated
function invalidateCache_getImgSrcsFormImgSlug(aImgSlug) {
	delete gCache_getImgSrcsForImgSlug[aImgSlug];
}
function getImgSrcsForImgSlug(aImgSlug) {
	// returns an object, with key being the size, of all the strings you would put in <img src="HEREEEE" /> for all available sizes for this aImgSlug
	// :note: the size is square, as i dont accept icons thare not square in size
	// a size can be 'svg'
	
	var rezObj = {};
	
	switch (aImgSlug) {
		// case 'esr': // esr should go to release. but worker should never set it to esr, as esr here is a slug, not channel name
		case 'release':
		case 'beta':
		case 'dev':
		case 'aurora':
		case 'nightly':
				
				// return core.addon.path.images + 'channel-iconsets/' + aSlug + '/' + aSlug + '_16.png';
				var availSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
				for (var i=0; i<availSizes.length; i++) {
					rezObj[availSizes[i]] = core.addon.path.images + 'channel-iconsets/' + aImgSlug + '/' + aImgSlug + '_' + availSizes[i] + '.png';;
				}
				
			break;
		default:
			
				if (aImgSlug in gCache_getImgSrcsForImgSlug) {
					rezObj = gCache_getImgSrcsForImgSlug[aImgSlug];
				} else {
					var cImgEntry;
					var cImgDirPath = OS.Path.join(core.profilist.path.icons, aImgSlug);
					
					// :note: each entry MUST be in format OS.Path.join(core.profilist.path.icons, aImgSlug, aImgSlug + '_##.ext'); where ## is size here!! ext can be png gif jpeg jpg svg etc etc
					
					var cImgNamePatt = /^(.+)_(\d+)\.(.+)$/;
					
					var cImgDirIterator = new OS.File.DirectoryIterator(cImgDirPath);
					try {
						cImgDirIterator.forEach(function(aEntry, aIndex, aIterator) {
							
							// this block tests if the format is valid of the image filename, it also gets details of cImgSize, cImgExt, and sImgSlug
							var cImgSlug;
							var cImgSize;
							var cImgExt;
							// test if svg
							if (aEntry.name == aImgSlug + '.svg' || aEntry.name == aImgSlug + '.SVG') {
								cImgExt = 'svg';
								cImgSize = 'svg';
								cImgSlug = aImgSlug;
								// ok good dont skip this one
							} else {
								var cImgNameMatch = cImgNamePatt.exec(aEntry.name);
								
								if (!cImgNameMatch) {
									console.warn('invalid format on filename of this icon, filename:', aEntry.name);
									return;
								}
								
								cImgSlug = cImgNameMatch[1];
								cImgSize = cImgNameMatch[2];
								cImgExt = cImgNameMatch[3];
								
								if (cImgSlug != aImgSlug) {
									console.warn('invalid format on file in this directory, filename:', aEntry.name);
									return;
								}
								
								// ok good dont skip this one
							}
							
							rezObj[cImgSize] = aEntry.path;
						});
					} catch(OSFileError) {
						// console.info('OSFileError:', OSFileError, 'OSFileError.becauseNoSuchFile:', OSFileError.becauseNoSuchFile, 'OSFileError.becauseExists:', OSFileError.becauseExists, 'OSFileError.becauseClosed:', OSFileError.becauseClosed, 'OSFileError.unixErrno:', OSFileError.unixErrno, 'OSFileError.winLastError:', OSFileError.winLastError, '');
						throw new MainWorkerError('getImgSrcsForImgSlug', OSFileError);
					} finally {
						cImgDirIterator.close();
					}
					// return OS.Path.join(core.profilist.path.icons, aSlug, aSlug + '_16.png');
					
					gCache_getImgSrcsForImgSlug[aImgSlug] = rezObj;
				}
	}
	
	return rezObj;
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
function getIsRunningFromIniFromPlat(aProfPath, aOptions={}) {
	// does not update ini
	// RETURNS
		// 1 or pid - if running - on windows it just returns 1, on nix/mac this returns the pid if its running. ON windows, if run this on the self profile, it will give you the pid.
		// false - if NOT running
	// currentProfile must be marked in gIniObj before using this

	var cOptionsDefaults = {
		winProcessIdsInfos: undefined // provide thte return value from getAllPID, it needs to have creation time of the pid in here. then this function will return the pid for windows as well
	};
	
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	
	var cIsRunning;
	
	// for non-windows, the fcntl method. will not return properly if testing for the current profile. so say im running profile A. and from profile A i tell it to test getting a lock on its lock file. it will not return valid result of a pid. i dont know why. but from profile A i can test if all other profiles are running. its obvious, if running code from profile A that you already know its running.
	// so anyways thats why i added this test
	var curProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // this is the currently running profiles ini entry
	if (aProfPath == curProfIniEntry.Path) {
		cIsRunning = core.firefox.pid;
		return cIsRunning;
	}
	
	var cProfRootDir = getFullPathToProfileDirFromIni(aProfPath);
	
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				var cParentLockPath = OS.Path.join(cProfRootDir, 'parent.lock');
				
				try {
					var rez_openLock = OS.File.open(cParentLockPath);
					// didnt error as got to this line, so its NOT locked
					cIsRunning = 0;
					rez_openLock.close();
				} catch (OSFileError) {
					if (OSFileError.winLastError == OS.Constants.Win.ERROR_SHARING_VIOLATION) {
						//its locked
						cIsRunning = 1; // :todo: see if i can get pid some day, so i can match the behavior of fcntrl on nix/mac
					} else if (OSFileError.winLastError == OS.Constants.Win.ERROR_FILE_NOT_FOUND) {
						// if it doesnt exist, this is very likely due to it being an unlaunched profile so return that it is unlocked //this was my todo notes from profilistv2 im not sure what it means - :todo: do equivalent for fnctl for nix/mac
						cIsRunning = 0;
					} else if (OSFileError.winLastError == OS.Constants.Win.ERROR_PATH_NOT_FOUND) {
						// path not even there, this is weird shouldnt happen, but if its not there obviously the profile doesnt exist so nothing in use so just return 0
						cIsRunning = 0;
					} else {
						console.error('getIsRunningFromIniFromPlat', {
							msg: 'Could not open profile lock file and it was NOT locked. Path of lock file: "' + cParentLockPath + '"',
							OSFileError: OSFileError
						});
						throw new MainWorkerError('getIsRunningFromIniFromPlat', {
							msg: 'Could not open profile lock file and it was NOT locked. Path of lock file: "' + cParentLockPath + '"',
							OSFileError: OSFileError
						});
					}
				}
				
				if (cIsRunning && aOptions.winProcessIdsInfos) {
					// get pid for the firefox locking this file
					
					// ok lets get the time the parentlock was locked
					var rez_statLock = OS.File.stat(cParentLockPath);
					// console.info('rez_statLock:', 'lastModificationDate:', rez_statLock.lastModificationDate.toLocaleString());
					
					var lockTime = rez_statLock.lastModificationDate;
					
					// compare with all the pids creation time in infos, and set it to pid that has creationTime that is closest to lockTime
					var closestPidInfo = {
						pid: null,
						msBetween_createTime_lockTime: null
					};
					for (var pid in aOptions.winProcessIdsInfos) {
						var msBetween_createTime_lockTime = Math.abs(aOptions.winProcessIdsInfos[pid].createTime - lockTime);
						if (closestPidInfo.pid === null || msBetween_createTime_lockTime < closestPidInfo.msBetween_createTime_lockTime) {
							closestPidInfo.pid = pid;
							closestPidInfo.msBetween_createTime_lockTime = msBetween_createTime_lockTime;
						}
					}
					// console.log('closest pid is:', closestPidInfo, 'its info obj is:', aOptions.winProcessIdsInfos[closestPidInfo.pid], 'cParentLockPath:', cParentLockPath);
					cIsRunning = closestPidInfo.pid;
				}

			break;
		case 'gtk':
		case 'darwin':

				var cParentLockPath = OS.Path.join(cProfRootDir, '.parentlock');
				console.log('cParentLockPath:', cParentLockPath);
				
				var rez_lockFd = ostypes.API('open')(cParentLockPath, OS.Constants.libc.O_RDWR | OS.Constants.libc.O_CREAT); //setting this to O_RDWR fixes errno of 9 on fcntl
				console.log('rez_lockFd:', rez_lockFd);
				if (cutils.jscEqual(rez_lockFd, -1)) {
					// failed to open
					// :todo: add test for errno, if it tells me it file doesnt exist then obviously return 0 meaning its not in use
					console.error('getIsRunningFromIniFromPlat -> ostypes.api.open', {
						msg: 'failed to open cParentLockPath: "' + cParentLockPath + '"',
						errno: ctypes.errno
					});
					throw new MainWorkerError('getIsRunningFromIniFromPlat -> ostypes.api.open', {
						msg: 'failed to open cParentLockPath: "' + cParentLockPath + '"',
						errno: ctypes.errno
					});
				}

				
				try {
					var testlock = ostypes.TYPE.flock();
					testlock.l_type = OS.Constants.libc.F_WRLCK; //can use F_RDLCK but keep openFd at O_RDWR, it just works
					testlock.l_start = 0;
					testlock.l_whence = OS.Constants.libc.SEEK_SET;
					testlock.l_len = 0;
					
					var rez_fcntl = ostypes.API('fcntl')(rez_lockFd, OS.Constants.libc.F_GETLK, testlock.address());
					console.log('rez_fcntl:', rez_fcntl);
					if (cutils.jscEqual(rez_fcntl, -1)) {
						// failed to open
						throw new MainWorkerError('getIsRunningFromIniFromPlat -> ostypes.api.fcntl', {
							msg: 'failed to fcntl cParentLockPath: "' + cParentLockPath + '"',
							errno: ctypes.errno
						});
					}
					
					// l_pid is unchanged if it wasnt locked, and since js-ctypes instatiates the struct at value of 0, i can just return that value, so 0 means its not running
					cIsRunning = parseInt(cutils.jscGetDeepest(testlock.l_pid));
					console.info('got cIsRunning:', cIsRunning);
					
				} finally {
					var rez_closeLockFd = ostypes.API('close')(rez_lockFd);
					console.log('rez_closeLockFd:', rez_closeLockFd);
					if (!cutils.jscEqual(rez_closeLockFd, 0)) {
						// failed to close
						throw new MainWorkerError('getIsRunningFromIniFromPlat -> ostypes.api.close', {
							msg: 'failed to close cParentLockPath: "' + cParentLockPath + '"',
							errno: ctypes.errno
						});
					}
				}
				
				if (core.os.mname != 'darwin' && cIsRunning === undefined) {
					// then its gtk, and cIsRunning was found so break
					// meaning it still has not determined if the profile is running or not, and it is a (non-mac) unix system
					var cSymLockPath = OS.Path.join(cProfRootDir, 'lock');
					// i guess old versions of unix have this symlock path
					// :todo: find a scenario, i could not find it as of yet, so i havent written this up yet. i just recall i saw this in the code from mxr
						// so for now just guess its not running
					cIsRunning = 0;
				}

			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	// :note: maybe verify or something - there seems to be some platform called vms, but i cant find such an os for virtualmachine - http://mxr.mozilla.org/mozilla-release/source/profile/dirserviceprovider/src/nsProfileLock.cpp#581
	
	return cIsRunning;
}
function getLastExePathForProfFromFS(aProfPath) {
	// the difference between this function and ```getCalcdExePathForProfFromIniFromFS``` is explained on link883939272722
	// RETURNS
		// string - the last exePath its compatibility.ini was updated to. :note: :assume: i tested awhile back, that the compaitiblity.ini stores the last exePath-like path in there right away on startup :todo: verify this again // :todo: verify - if profile is running, the path in compaitiblity.ini should be the exePath it is running in right now
	// gIniObj must have currentProfile noted (WITH exePath noted within) before calling this function 
	
	var curProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // this is the currently running profiles ini entry
	if (aProfPath == curProfIniEntry.Path) {
		console.log('checking self prof, so returning XREExeF');
		return core.profilist.path.XREExeF;
	}
	
	var cProfCompatIniPath = OS.Path.join(getFullPathToProfileDirFromIni(aProfPath), 'compatibility.ini');
	console.info('cProfCompatIniPath:', cProfCompatIniPath);

	// contents of compaitiblity.ini on diff plats
		// on win10 - as of 010816
			// [Compatibility]
			// LastVersion=44.0_20160104162232/20160104162232
			// LastOSABI=WINNT_x86-msvc
			// LastPlatformDir=C:\Program Files (x86)\Mozilla Firefox
			// LastAppDir=C:\Program Files (x86)\Mozilla Firefox\browser
		// on osx10.1 - as of 010816
			// [Compatibility]
			// LastVersion=43.0.4_20160105164030/20160105164030
			// LastOSABI=Darwin_x86_64-gcc3
			// LastPlatformDir=/Applications/Firefox.app/Contents/Resources
			// LastAppDir=/Applications/Firefox.app/Contents/Resources/browser

			// InvalidateCaches=1
		// on ubuntu15.01 - as of 010816
			// [Compatibility]
			// LastVersion=43.0_20151210084639/20151210084639
			// LastOSABI=Linux_x86_64-gcc3
			// LastPlatformDir=/usr/lib/firefox
			// LastAppDir=/usr/lib/firefox/browser

	// Services.dirsvc.get('XREExeF', Ci.nsIFile).path
		// win
			// "C:\Program Files (x86)\Mozilla Firefox\firefox.exe"
		// osx
			// "/Applications/Firefox.app/Contents/MacOS/firefox"
		// ubuntu15.01
			// "/usr/lib/firefox/firefox"

	var rez_readCompatIni = OS.File.read(cProfCompatIniPath, {encoding:'utf-8'});
	
	var cLastPlatformDir = /LastPlatformDir=(.*?)$/m.exec(rez_readCompatIni);
	if (!cLastPlatformDir) {
		console.error('getLastExePathForProfFromFS', 'regex failed on cLastPlatformDir');
		throw new MainWorkerError('getLastExePathForProfFromFS', 'regex failed on cLastPlatformDir');
	}
	cLastPlatformDir = cLastPlatformDir[1];
	
	var cLastExePath; // calculate exePath based on cLastPlatformDir
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				cLastExePath = OS.Path.join(cLastPlatformDir, 'firefox.exe');

			break;
		case 'gtk':

				cLastExePath = OS.Path.join(cLastPlatformDir, 'firefox');

			break;
		case 'darwin':
				
				if (cLastPlatformDir.indexOf(core.profilist.path.root) === 0) {
					console.warn('cLastPlatformDir is a symlinked path:', cLastPlatformDir);
					cLastPlatformDir = resolveSymlinkPath(cLastPlatformDir); // works because LastPlatformDir is to the Contents/Resources/ dir, which i do copy as symlink
					console.log('cLastPlatformDir was resolved from symlink path, it is actually:', cLastPlatformDir);
					// I do not cache this, as if user changes tie or something of this profile then it will change the exe path it points to
				}
				cLastExePath = OS.Path.join(OS.Path.dirname(cLastPlatformDir), 'MacOS', 'firefox');

			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	return cLastExePath;
}
// start - get profile spec functions based on gIniObj
function getCalcdExePathForProfFromIniFromFS(aProfPath) {
	// this is different from `getLastExePathForProfFromFS` in that it -- this is a calculated exePath, it tells what it SHOULD BE, of course if its running then this function will use `getLastExePathForProfFromFS` (link883939272722) -- tests gIniObj for 1) if it is running - if it is then getLastExePathForProfFromFS, 2) if it is not running - 2a) if it is tied - then that, 2b) current profile exe so XREExeF
	// :note: this does not do running check, it just returns the exe path based on what is in in gIniObj and tie
	// RETURNS
		// if, based on gIniObj, it is RUNNING, then it gets the path for that profile from platform with getLastExePathForProfFromFS
		// if, based on gIniObj, it is NOT running, then it returns the tied path if it has one ELSE the currentProfile path
		
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (cIniEntry.noWriteObj.status) {
		// its running
		if (gJProfilistDev) {
			// :note: per INIOB_RULE#7 - ini entires have exePath so just return that, which saves some filestystem checks which would haveen from running ```getLastExePathForProfFromFS(aProfPath)```
			return cIniEntry.noWriteObj.exePath;
		}
		return getLastExePathForProfFromFS(aProfPath);
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
		// well obviously the currentProfile is running in core.profilist.path.XREExeF so lets just return this, save some looping which would have happend if i ran ```getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true).noWriteObj.exePath```
		return core.profilist.path.XREExeF;
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
_cache_getExeChanForParamsFromFSFromCache = {};
function getExeChanForParamsFromFSFromCache(aExePath) {
	// :note: this does not do running check, it just returns the exe path based on what parameters passed
	// RETURNS
		// string - beta etc
		// if any error then null
	// if (!(aExePath in _cache_getExeChanForParamsFromFSFromCache)) {
	if (!_cache_getExeChanForParamsFromFSFromCache[aExePath]) { // changed from in to do this, because if it was null for some reason i want to keep checking it
		if (aExePath == core.profilist.path.XREExeF) {
			_cache_getExeChanForParamsFromFSFromCache[aExePath] = core.firefox.channel;
		} else {
			console.time('getExeChanFromFS');
			var channelPrefsJsPath;
			if (core.os.name == 'darwin') {
				channelPrefsJsPath = OS.Path.join(aExePath.substr(0, aExePath.indexOf('.app') + 4), 'Contents', 'Resources', 'defaults', 'pref', 'channel-prefs.js'); // :note::assume:i assume that aExePath is properly cased meaning the .app is always lower, so its never .APP // :note::important::todo: therefore when allow browse to .app from cp.js i should display only till the .app in the gui, but i should save it up till the .app/Contents/MacOS/firefox // link009838393
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
			
			// console.log('rez_read channelPrefsJsPath:', rez_read);

			var channel_name = rez_read.match(/app\.update\.channel", "([^"]+)/);
			// console.log('channel_name post regex match:', channel_name);
			if (!channel_name) {
				_cache_getExeChanForParamsFromFSFromCache[aExePath] = null;
				console.error('should-nver-happen!', 'as a exe path must exist for all builds!!!');
				throw new MainWorkerError('should-nver-happen!', 'as a exe path must exist for all builds!!!');
			} else {
				_cache_getExeChanForParamsFromFSFromCache[aExePath] = channel_name[1];
			}
			console.timeEnd('getExeChanFromFS');
		}
	}
	return _cache_getExeChanForParamsFromFSFromCache[aExePath];
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
	iconInfosObj.base.slug = getSlugForExePathFromParams(aExePath, gJProfilistDev, gJProfilistBuilds, aExeChannel);
	
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
				var cSizeName = cSize + 'x' + cSize;
				var cSizeIconPath = OS.Path.join(dirpathHicolor, cSizeName, 'apps', aIconName + '.profilist.png'); // link787575758 :note: because on linux i am installing to a global folder, instead of just .png i make it .profilist.png so its easy to identify what all profilist did on the system, when it comes time to uninstall
				
				return OS.File.exists(cSizeIconPath);

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

function createIconForParamsFromFS(aIconInfosObj, aBadgeLoc) {
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
			// aBadge: aBadgeLoc, // set this only if there are badges, as if there are no badges then this must be 0 otherwise the function throws "must provide at least one BADGE image as devuser specified aBadge not to be 0, meaning he wants a badge"
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
					
					cCreatePathDir = null;
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
			
			cOptions.aBadge = aBadgeLoc;
		}
		
		console.time('promiseWorker-createIcon');
		self.postMessageWithCallback(['createIcon', cCreateType, cCreateName, cCreatePathDir, cBaseSrcImgPathArr, cOutputSizesArr, cOptions], function(aCreateIconRez) { // :note: this is how to call WITH callback
			console.timeEnd('promiseWorker-createIcon');
			console.log('back in promiseworker after calling createIcon, aCreateIconRez:', aCreateIconRez);
			if (aCreateIconRez.status == 'fail') {
				deferredMain_createIconForParamsFromFS.reject(aCreateIconRez.reason);
			} else {
				deferredMain_createIconForParamsFromFS.resolve(true);
			}
		});
	}
	return deferredMain_createIconForParamsFromFS.promise;
}

function getLauncherDirPathFromParams(aProfPath) {
	// RETURNS
		// string - platform path to the launcher directory
		
	var launcherDirName = HashString(aProfPath);
	// console.info('launcherDirName:', launcherDirName, '');
	// console.info('core.profilist.path.exes:', core.profilist.path.exes, '');
	var launcherDirPath = OS.Path.join(core.profilist.path.exes, launcherDirName + ''); // need to make launcherDirName a string otherwise OS.Path.join causes this error ```path.startsWith is not a function```
	// console.info('launcherDirPath:', launcherDirPath, '');
	
	return launcherDirPath;
}

function getFullPathToProfileDirFromIni(aProfPath) {
	// gets the full platform path to the profile root directory, used for argument of launcher with -profile
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (cIniEntry.IsRelative == '1') {
		var cProfDirName = OS.Path.basename(OS.Path.normalize(aProfPath));
		return OS.Path.join(core.profilist.path.defProfRt, cProfDirName);
	} else {
		return aProfPath;
	}
}

function getLauncherNameFromParams(aExeChannel, aProfName) {
	// RETURNS
		// string - current platform safed, the name in format Firefox CHANNEL_NAME - PROFILE_NAME
	
	console.info('aExeChannel:', aExeChannel, 'aProfName:', aProfName, '');
	
	var exeChannelDisplayName;
	switch (aExeChannel) {
		case 'esr':
				
				exeChannelDisplayName = 'ESR'; // :todo::l10n: localize?
			
			break;
		case 'release':
				
				exeChannelDisplayName = '';
			
			break;
		case 'beta':
				
				exeChannelDisplayName = 'Beta'; // :todo::l10n: localize?
			
			break;
		case 'aurora':
				
				exeChannelDisplayName = 'Developer Edition'; // :todo::l10n: localize?
			
			break;
		case 'nightly':
				
				exeChannelDisplayName = 'Nightly'; // :todo::l10n: localize?
			
			break;
		case 'default':
				
				exeChannelDisplayName = 'Custom Build'; // :todo::l10n: localize
			
			break;
		default:
			console.error('A programtic channel value of "' + aExeChannel + '" does not have a recognized display name, so returning same thing');
			exeChannelDisplayName = aExeChannel.substr(0, 1).toUpperCase() + aExeChannel.substr(1);
	}
	
	if (exeChannelDisplayName != '') {
		exeChannelDisplayName = ' ' + exeChannelDisplayName; // link22323432345
	}

	return safedForPlatFS('Firefox' + exeChannelDisplayName + ' - ' + aProfName); // link22323432345 need prefixed space for exeChannelDisplayName // link18494940498498 all launcher names must start with "Firefox" as this is how i dentify the file in the folder, well the start and the end should be the extension
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
	
	// local globals
	var cLauncherDirName = OS.Path.basename(aLauncherDirPath);
	
	var cLauncherExtension;
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				cLauncherExtension = 'lnk';
				
			break;
		case 'gtk':
		
				cLauncherExtension = 'desktop';
				
			break;
		case 'darwin':
		
				cLauncherExtension = 'app';
				
			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	var cLauncherPath = OS.Path.join(aLauncherDirPath, aLauncherName + '.' + cLauncherExtension);
	
	// get EXISTING launcher entry - so this is different from getLauncherDirPathFromParams - the dir will be the same, but the existing name may be different
	var eLauncherEntry;
	var eLauncherDirIterator = new OS.File.DirectoryIterator(aLauncherDirPath);
	try {
		eLauncherDirIterator.forEach(function(aEntry, aIndex, aIterator) {
			console.log(aIndex, '------------', aEntry, aIterator);
			if (aEntry.name.indexOf('Firefox') == 0) { // link18494940498498 all launchers must start with Firefox
				if (aEntry.name.substr(aEntry.name.lastIndexOf('.') + 1) == cLauncherExtension) {
					eLauncherEntry = aEntry;
					aIterator.close(); // end the iteration // link3742848743
				}
			}
		});
	} catch(OSFileError) {
		console.info('OSFileError:', OSFileError, 'OSFileError.becauseNoSuchFile:', OSFileError.becauseNoSuchFile, 'OSFileError.becauseExists:', OSFileError.becauseExists, 'OSFileError.becauseClosed:', OSFileError.becauseClosed, 'OSFileError.unixErrno:', OSFileError.unixErrno, 'OSFileError.winLastError:', OSFileError.winLastError, '');
		if (!OSFileError.becauseNoSuchFile) {
			throw new MainWorkerError('createeLauncher', OSFileError);
		} // if it does not exist, thats ok, this func will carry on to create the launcher :todo: should make the dir though at this point, when we get error that dir doesnt exist
	} finally {
		if (!eLauncherEntry) {
			eLauncherDirIterator.close();
		} // else, if it was found i already closed it link3742848743
	}

	// assume if eLauncherEntry is undefined then assume eLauncher does not exist, so need to make it
	if (eLauncherEntry) {
		// assume eLauncher exists, as the dir exists :assumption: :todo: maybe i should not assume this, we'll see as i use it
		// get EXISTING eLauncherPath
			var eLauncherPath = eLauncherEntry.path; // this does not need test/verification, but it is used for the rename process if needed
			var eLauncherName = eLauncherEntry.name.substr(0, eLauncherEntry.name.lastIndexOf('.'));
			
			console.info('eLauncherPath:', eLauncherPath);
			console.info('eLauncherName:', eLauncherName);
			
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
						var shellLinkPtr;
						var shellLink;
						var persistFile;
						var persistFilePtr;
						// no need for propertyStore because you cant edit the AppUserModelId once it has already been set, so I only do this on creation - http://stackoverflow.com/questions/28246057/ipropertystore-change-system-appusermodel-id-of-existing-shortcut
						// var propertyStore;
						// var propertyStorePtr;
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
							var hr_CoCreateInstance = ostypes.API('CoCreateInstance')(ostypes.CONST.CLSID_SHELLLINK.address(), null, ostypes.CONST.CLSCTX_INPROC_SERVER, ostypes.CONST.IID_ISHELLLINK.address(), shellLinkPtr.address());
							ostypes.HELPER.checkHRESULT(hr_CoCreateInstance, 'createLauncher -> CoCreateInstance');
							shellLink = shellLinkPtr.contents.lpVtbl.contents;

							persistFilePtr = ostypes.TYPE.IPersistFile.ptr();
							var hr_shellLinkQI = shellLink.QueryInterface(shellLinkPtr, ostypes.CONST.IID_IPERSISTFILE.address(), persistFilePtr.address());
							ostypes.HELPER.checkHRESULT(hr_shellLinkQI, 'createLauncher -> QueryInterface (IShellLink->IPersistFile)');
							persistFile = persistFilePtr.contents.lpVtbl.contents;
							
							var hr_Load = persistFile.Load(persistFilePtr, eLauncherPath, 0);
							ostypes.HELPER.checkHRESULT(hr_Load, 'createLauncher -> Load');

							// step1 - get eLauncherIconSlug
							// :note: iconSlug is different from imgSlug, as for imgSlug I have to append _##.png to it where the ## is variable. while with iconSlug it is just append .ico or .icns or no extension for linux style
							
							var buffer_eLauncherIconPath = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
							var c_eIconIndex = ostypes.TYPE.INT();
							var hr_GetIconLocation = shellLink.GetIconLocation(shellLinkPtr, buffer_eLauncherIconPath/*.address()*/, buffer_eLauncherIconPath.length, c_eIconIndex.address());
							ostypes.HELPER.checkHRESULT(hr_GetIconLocation, 'createLauncher -> GetIconLocation');
							
							var eLauncherIconPath = buffer_eLauncherIconPath.readString();
							var eIconIndex = c_eIconIndex.value;
							// var eLauncherIconSlug = OS.Path.basename(eLauncherIconPath).replace('.ico', '');
							console.log('eLauncherIconPath:', eLauncherIconPath, 'eIconIndex:', eIconIndex);
							
							// step2 - get eLauncherExePath
							var buffer_eLauncherExePath = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
							var hr_GetPath = shellLink.GetPath(shellLinkPtr, buffer_eLauncherExePath/*.address()*/, buffer_eLauncherExePath.length, null, ostypes.CONST.SLGP_RAWPATH);
							ostypes.HELPER.checkHRESULT(hr_Load, 'createLauncher -> GetPath');
							
							var eLauncherExePath = buffer_eLauncherExePath.readString();
							console.log('eLauncherExePath:', '"' + eLauncherExePath + '"');
							
							// step3 - verify/update name
							// moved to step3-continued because have to do the rename after the persistFile.Save
							
							// step4 - verify/update icon
							if (eLauncherIconPath != aLauncherIconPath) {
								console.log('have to SetIconLocation because --', 'eLauncherIconPath:', eLauncherIconPath, 'is not what it should be, it should be aLauncherIconPath:', aLauncherIconPath);
								var hr_SetIconLocation = shellLink.SetIconLocation(shellLinkPtr, aLauncherIconPath, core.os.version > 5.2 ? 1 : 2); // 'iconIndex' in cObj ? cObj.iconIndex : 0
								ostypes.HELPER.checkHRESULT(hr_SetIconLocation, 'createLauncher -> SetIconLocation');
							}
							
							// step5 - verify/update exePath (the build it launches into)
							if (eLauncherExePath != aLauncherExePath) {
								console.log('have to SetPath because --', 'eLauncherExePath:', eLauncherExePath, 'is not what it should be, it should be aLauncherExePath:', aLauncherExePath);
								var hr_SetPath = shellLink.SetPath(shellLinkPtr, aLauncherExePath);
								ostypes.HELPER.checkHRESULT(hr_SetPath, 'createLauncher -> SetPath');
							}
							
							var hr_Save = persistFile.Save(persistFilePtr, cLauncherPath, false);
							ostypes.HELPER.checkHRESULT(hr_Save, 'createLauncher -> Save');
							
							// step3-continued - becase have to do the rename after the persistFile.Save
							if (eLauncherName != aLauncherName) {
								console.log('have to rename because --', 'eLauncherName:', eLauncherName, 'is not what it should be, it should be aLauncherName:', aLauncherName);
								OS.File.move(eLauncherPath, cLauncherPath);
							}
							
						} finally {
							if (persistFile) {
								var rez_refCntPFile = persistFile.Release(persistFilePtr);
								console.log('rez_refCntPFile:', rez_refCntPFile);
							}

							if (shellLink) {
								var rez_refCntShelLink = shellLink.Release(shellLinkPtr);
								console.log('rez_refCntShelLink:', rez_refCntShelLink);
							}
							
							//if (shouldUninitialize) { // should always CoUninit even if CoInit returned false, per the docs on msdn
								ostypes.API('CoUninitialize')(); // return void
							//}
						}
						
					break;
				case 'gtk':
				
						// step1 - get eLauncherIconSlug
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// step6 - return full path (with extension)
						
						
						var eLauncherContents = OS.File.read(eLauncherPath, {encoding:'utf-8'});
						var cLauncherContents = eLauncherContents;
						console.log('eLauncherContents:', eLauncherContents);
						
						// step1 - get eLauncherIconPath (for gtk only the icon slug is stored as path with .profilist appended) (meaning aLauncherIconPath is also just iconSlug) // link787575758
						var eLauncherIconPath_patt = /Icon=(.+)/;
						var eLauncherIconPath_match = eLauncherIconPath_patt.exec(eLauncherContents);
						
						var eLauncherIconPath = eLauncherIconPath_match[1];
						
						// step2 - get eLauncherExePath
						var eLauncherExePath_patt = /Exec=(.+) -profile "/;
						var eLauncherExePath_match = eLauncherExePath_patt.exec(eLauncherContents);
						
						var eLauncherExePath = eLauncherExePath_match[1];
						
						// step3 - verify/update name
						if (eLauncherName != aLauncherName) {
							console.log('have to rename because --', 'eLauncherName:', eLauncherName, 'is not what it should be, it should be aLauncherName:', aLauncherName);
							var eLauncherName_patt = /Name=(.+)/; // :note: I make the Name match the filenme wthout .desktop //link3771919171700
							cLauncherContents = cLauncherContents.replace(eLauncherName_patt, 'Name=' + aLauncherName);
						}
						
						// step4 - verify/update icon
						if (eLauncherIconPath != aLauncherIconPath + '.profilist') { // link787575758
							console.log('have to update icon because --', 'eLauncherIconPath:', eLauncherIconPath, 'is not what it should be, it should be aLauncherIconPath:', aLauncherIconPath);
							cLauncherContents = cLauncherContents.replace(eLauncherIconPath_patt, 'Icon=' + aLauncherIconPath + '.profilist'); // link787575758
						}
						
						// step5 - verify/update exePath (the build it launches into)
						if (eLauncherExePath != aLauncherExePath) {
							console.log('have to update exePath because --', 'eLauncherExePath:', eLauncherExePath, 'is not what it should be, it should be aLauncherExePath:', aLauncherExePath);
							cLauncherContents = cLauncherContents.replace(eLauncherExePath_patt, 'Exec=' + aLauncherExePath + ' -profile "');
						}
						
						// final step
						if (eLauncherContents != cLauncherContents) {
							console.log('cLauncherContents is modded:', cLauncherContents);
							// means i updated it, so lets write it to file now
							var eLauncherFD = OS.File.open(eLauncherPath, {truncate:true}); // FD stands for file descriptor
							eLauncherFD.write(getTxtEncodr().encode(cLauncherContents));
							eLauncherFD.close();
						}
						
						// step3-continued
						if (eLauncherName != aLauncherName) {
							console.log('have to rename because --', 'eLauncherName:', eLauncherName, 'is not what it should be, it should be aLauncherName:', aLauncherName);
							OS.File.move(eLauncherPath, cLauncherPath);
						}
						
					break;
				case 'darwin':
				
						// step1 - get eLauncherIconSlug
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// step6 - return full path (with extension)

						// initial step - get current 
						// step1 - get eLauncherIconPath (for gtk only the icon slug is stored as path with .profilist appended) (meaning aLauncherIconPath is also just iconSlug) // link787575758
						// step2 - get eLauncherExePath
						// step3 - verify/update name
						// step4 - verify/update icon
						// step5 - verify/update exePath (the build it launches into)
						// final step - write modified contents
						// step3-continued - rename file on disk

						// initial step - get current contents
						var eLauncherExecPath = OS.Path.join(eLauncherPath, 'Contents', 'MacOS', 'profilist-' + cLauncherDirName) // LauncherExePath is different from LauncherExecPath. Exec is that shell script
						
						var eLauncherContents = OS.File.read(eLauncherExecPath, {encoding:'utf-8'});
						console.log('eLauncherContents:', eLauncherContents);
						
						// mac only get json line
						eLauncherJsonLine_patt = /^##(\{.*?\})##$/m;
						var eLauncherJsonLine_match = eLauncherJsonLine_patt.exec(eLauncherContents);
						console.log('eLauncherJsonLine_match:', eLauncherJsonLine_match);
						
						var eLauncherJsonLine = JSON.parse(eLauncherJsonLine_match[1]);
						console.log('eLauncherJsonLine:', eLauncherJsonLine, 'stringified:', eLauncherJsonLine_match[1]);
						var cLauncherJsonLine = JSON.parse(eLauncherJsonLine_match[1]);
						
						// mac only defined target app path
						var cTargetAppPath = aLauncherExePath.substr(0, aLauncherExePath.indexOf('.app') + 4); // link009838393
						var cTargetContentsPath = OS.Path.join(cTargetAppPath, 'Contents');
						
						// step1 - get eLauncherIconPath (for darwin only the icon slug is stored as path) (meaning aLauncherIconPath is also just iconSlug) // link9900001
						var eLauncherIconPath = OS.Path.join(core.profilist.path.icons, eLauncherJsonLine.LauncherIconPathName + '.icns'); // LauncherIconPathName is really iconSlug
						
						// step2 - get eLauncherExePath
						var eLauncherExePath = OS.Path.join(eLauncherJsonLine.XREExeF_APP, 'Contents', 'MacOS', 'firefox');
						
						// step3 - verify/update name
						// if (eLauncherName != aLauncherName) {
						// 	console.log('have to rename because --', 'eLauncherName:', eLauncherName, 'is not what it should be, it should be aLauncherName:', aLauncherName);
						// }
						
						// step4 - verify/update icon
						if (eLauncherIconPath != aLauncherIconPath) {
							console.log('have to update icon because --', 'eLauncherIconPath:', eLauncherIconPath, 'is not what it should be, it should be aLauncherIconPath:', aLauncherIconPath);
							var rez_copyIcon = OS.File.copy(aLauncherIconPath, OS.Path.join(cTargetContentsPath, 'Resources', 'profilist-' + cLauncherDirName + '.icns'), {noOverwrite:false}); // i copy the icon into the main folder, because i alias the folders
							cLauncherJsonLine.LauncherIconPathName = aLauncherIconPath.substring(core.profilist.path.icons.length + 1, aLauncherIconPath.length - 5);
						}
						
						// step5 - verify/update exePath (the build it launches into)
						if (eLauncherExePath != aLauncherExePath) {
							console.log('have to update exePath because --', 'eLauncherExePath:', eLauncherExePath, 'is not what it should be, it should be aLauncherExePath:', aLauncherExePath);
							
							cLauncherJsonLine.XREExeF_APP = cTargetAppPath;
							
							// :todo: redo symlinks - if already exists unixSymLink throws errno 17
							
							var eLauncherAppPath = eLauncherPath;
							var eLauncherContentsPath = OS.Path.join(eLauncherAppPath, 'Contents');
							
							// OS.File.remove deletes all unixSymLink, even if it was a folder that was linked
							var rez_delHardLinkCodeSig = OS.File.remove(OS.Path.join(eLauncherContentsPath, '_CodeSignature'));
							var rez_delhardLinkMacOs = OS.File.remove(OS.Path.join(eLauncherContentsPath, 'MacOS'));
							var rez_delhardLinkPkgInfo = OS.File.remove(OS.Path.join(eLauncherContentsPath, 'PkgInfo'));
							var rez_delhardResources = OS.File.remove(OS.Path.join(eLauncherContentsPath, 'Resources'));
							
							// have to delete first, as unixSymLink has no overwrite feature, so if it already exists it throws errno 17
							var rez_hardLinkCodeSig = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, '_CodeSignature'), OS.Path.join(eLauncherContentsPath, '_CodeSignature'));
							var rez_hardLinkMacOs = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'MacOS'), OS.Path.join(eLauncherContentsPath, 'MacOS'));
							var rez_hardLinkPkgInfo = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'PkgInfo'), OS.Path.join(eLauncherContentsPath, 'PkgInfo'));
							var rez_hardResources = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'Resources'), OS.Path.join(eLauncherContentsPath, 'Resources'));
							
							var rez_readPlistInfo = OS.File.read(OS.Path.join(cTargetContentsPath, 'Info.plist'), {encoding:'utf-8'});
							var launcherPlistInfo = rez_readPlistInfo;
							launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleExecutable<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b) {
								// this function gets the original executable name (i cant assume its firefox, it might nightly etc)
								// it also replaces it with profilist-exec
								return a.replace(b, 'profilist-' + cLauncherDirName);
							});
							launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleIconFile<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b, c) {
								// this function replaces icon with profilist-badged.icns, so in future i can easily replace it without having to know name first, like i dont know if its firefox.icns for nightly etc
								return a.replace(b, 'profilist-' + cLauncherDirName);
							});
							launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleIdentifier<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b, c) {
								// this function replaces the bundle identifier
								// on macs the Profilist.launcher key holds the bundle identifier
								return a.replace(b, cLauncherDirName/*.replace(/[^a-z\.0-9]/ig, '-')*/); //no need for the replace as its all numbers, but i left it here so i know whats allowed in a bundle-identifier
								//The bundle identifier string identifies your application to the system. This string must be a uniform type identifier (UTI) that contains only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.) characters. The string should also be in reverse-DNS format. For example, if your companyâ€™s domain is Ajax.com and you create an application named Hello, you could assign the string com.Ajax.Hello as your applicationâ€™s bundle identifier. The bundle identifier is used in validating the application signature. source (apple developer: https://developer.apple.com/library/ios/#documentation/CoreFoundation/Conceptual/CFBundles/BundleTypes/BundleTypes.html#//apple_ref/doc/uid/10000123i-CH101-SW1)
								//An identifier used by iOS and Mac OS X to recognize any future updates to your app. Your Bundle ID must be registered with Apple and unique to your app. Bundle IDs are app-type specific (either iOS or Mac OS X). The same Bundle ID cannot be used for both iOS and Mac OS X apps. source https://itunesconnect.apple.com/docs/iTunesConnect_DeveloperGuide.pdf
							});
							var rez_writePlistInfo = OS.File.writeAtomic(OS.Path.join(eLauncherContentsPath, 'Info.plist'), launcherPlistInfo, {encoding:'utf-8', noOverwrite:false});
							
							
						}
						
						// final step - write modified contents
						if (eLauncherName != aLauncherName || eLauncherJsonLine.XREExeF_APP != cLauncherJsonLine.XREExeF_APP || eLauncherJsonLine.LauncherIconPathName != cLauncherJsonLine.LauncherIconPathName) {
							// eLauncherName != aLauncherName because that changes cLauncherAppPath
							console.log('cLauncherContents is modded:', cLauncherJsonLine, JSON.stringify(cLauncherJsonLine));
							// means i updated it, so lets write it to file now
							var cLauncherAppPath = cLauncherPath;
							var execContents = [
								'#!/bin/sh',
								'##' + JSON.stringify(cLauncherJsonLine) + '##', // link9900001
								'exec "' + OS.Path.join(cLauncherAppPath, 'Contents', 'MacOS', 'firefox') + '" -profile "' + aFullPathToProfileDir + '" -no-remote "$@"' // i think i have to use path to launcher so it gets icon even on killall Dock etc
							];
							
							//if (eLauncherExePath != aLauncherExePath) {
								console.log('replacing it with writeAtomic');
								// it may not be there, if this .app is being used for first time
								var rez_writeExec = OS.File.writeAtomic(eLauncherExecPath, execContents.join('\n'));// i write the exec into the main folder, because i alias the folders)
								var rez_permExec = OS.File.setPermissions(eLauncherExecPath, {unixMode: core.FileUtils.PERMS_DIRECTORY});
								// i dont think i need to xattr this, i just had to xattr the cLauncherPath (which is cLauncherAppPath) on first creation
							// } else {
							// 	console.log('trying to open it');
							// 	var eLauncherFD = OS.File.open(eLauncherExecPath, {truncate:true}); // FD stands for file descriptor
							// 	eLauncherFD.write(getTxtEncodr().encode(execContents.join('\n')));
							// 	eLauncherFD.close();
							// }
						}
						
						// step3-continued - rename file on disk
						if (eLauncherName != aLauncherName) {
							console.log('have to rename because --', 'eLauncherName:', eLauncherName, 'is not what it should be, it should be aLauncherName:', aLauncherName);
							OS.File.move(eLauncherPath, cLauncherPath);
						}
						
					break;
				default:
					throw new MainWorkerError({
						name: 'addon-error',
						message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
					});
			}

	} else {
		// assume eLauncher does not exist - so need to make it
		
		// make the directory
		var rez_makedir = OS.File.makeDir(aLauncherDirPath, {from:OS.Constants.Path.userApplicationDataDir});
		
		// start plat dependent stuff - the switch below does these steps for each platform
		// straight create the launcher
		
		switch (core.os.mname) {
			case 'winnt':
			case 'winmo':
			case 'wince':

					// create .lnk
					console.info('aLauncherDirPath:', aLauncherDirPath);
					console.info('aLauncherName:', aLauncherName);
					
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
						var hr_CoCreateInstance = ostypes.API('CoCreateInstance')(ostypes.CONST.CLSID_SHELLLINK.address(), null, ostypes.CONST.CLSCTX_INPROC_SERVER, ostypes.CONST.IID_ISHELLLINK.address(), shellLinkPtr.address());
						ostypes.HELPER.checkHRESULT(hr_CoCreateInstance, 'createLauncher -> CoCreateInstance');
						shellLink = shellLinkPtr.contents.lpVtbl.contents;

						persistFilePtr = ostypes.TYPE.IPersistFile.ptr();
						var hr_shellLinkQI = shellLink.QueryInterface(shellLinkPtr, ostypes.CONST.IID_IPERSISTFILE.address(), persistFilePtr.address());
						ostypes.HELPER.checkHRESULT(hr_shellLinkQI, 'createLauncher -> QueryInterface (IShellLink->IPersistFile)');
						persistFile = persistFilePtr.contents.lpVtbl.contents;
						
						if (core.os.version >= 6.1) {
							// win7 and up
							propertyStorePtr = ostypes.TYPE.IPropertyStore.ptr();
							var hr_shellLinkQI2 = shellLink.QueryInterface(shellLinkPtr, ostypes.CONST.IID_IPROPERTYSTORE.address(), propertyStorePtr.address());
							ostypes.HELPER.checkHRESULT(hr_shellLinkQI2, 'createLauncher -> QueryInterface (IShellLink->IPropertyStore)');
							propertyStore = propertyStorePtr.contents.lpVtbl.contents;
						}
						
						var hr_SetPath = shellLink.SetPath(shellLinkPtr, aLauncherExePath);
						ostypes.HELPER.checkHRESULT(hr_SetPath, 'createLauncher -> SetPath');
						
						var hr_SetArguments = shellLink.SetArguments(shellLinkPtr, '-profile "' + aFullPathToProfileDir + '" -no-remote');
						ostypes.HELPER.checkHRESULT(hr_SetArguments, 'createLauncher -> SetArguments');
						
						console.error('usssssing aLauncherIconPath:', aLauncherIconPath);
						var hr_SetIconLocation = shellLink.SetIconLocation(shellLinkPtr, aLauncherIconPath, core.os.version > 5.2 ? 1 : 2); // 'iconIndex' in cObj ? cObj.iconIndex : 0
						ostypes.HELPER.checkHRESULT(hr_SetIconLocation, 'createLauncher -> SetIconLocation');
						
						if (core.os.version >= 6.1) {
							// win7 and up
							var hr_appUserModelId = ostypes.HELPER.IPropertyStore_SetValue(propertyStorePtr, propertyStore, ostypes.CONST.PKEY_APPUSERMODEL_ID.address(), cLauncherDirName);
							ostypes.HELPER.checkHRESULT(hr_appUserModelId, 'createLauncher -> hr_appUserModelId');
						}
						
						var hr_Save = persistFile.Save(persistFilePtr, cLauncherPath, false);
						ostypes.HELPER.checkHRESULT(hr_Save, 'createLauncher -> Save');
						
					} finally {
						if (persistFile) {
							var rez_refCntPFile = persistFile.Release(persistFilePtr);
							console.log('rez_refCntPFile:', rez_refCntPFile);
						}
						
						if (propertyStore) {
							var rez_refCntPropStore = propertyStore.Release(propertyStorePtr);
							console.log('rez_refCntPropStore:', rez_refCntPropStore);
						}

						if (shellLink) {
							var rez_refCntShelLink = shellLink.Release(shellLinkPtr);
							console.log('rez_refCntShelLink:', rez_refCntShelLink);
						}
						
						//if (shouldUninitialize) { // should always CoUninit even if CoInit returned false, per the docs on msdn
							ostypes.API('CoUninitialize')(); // return void
						//}
					}

				break;
			case 'gtk':

					// create .desktop
					
					var cmdArr = [
						'[Desktop Entry]',
						'Name=' + aLauncherName, //link3771919171700
						'Type=Application',
						'Icon=' + aLauncherIconPath + '.profilist', // link787575758
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
					
					var cLauncherAppPath = cLauncherPath;
					console.info('cLauncherAppPath:', cLauncherAppPath);
					var rez_makeLauncherApp = OS.File.makeDir(cLauncherAppPath);
					
					var cLauncherContentsPath = OS.Path.join(cLauncherAppPath, 'Contents');
					console.info('cLauncherContentsPath:', cLauncherContentsPath);
					var rez_makeLauncherContents = OS.File.makeDir(cLauncherContentsPath);
					
					
					// C:\Users\Mercurius\Pictures\osx firefox.app contents dir entries.png
					var cTargetAppPath = aLauncherExePath.substr(0, aLauncherExePath.indexOf('.app') + 4); // link009838393
					console.info('cTargetAppPath:', cTargetAppPath);
					var cTargetContentsPath = OS.Path.join(cTargetAppPath, 'Contents');
					// var rez_hardLinkCodeSig = createAlias(OS.Path.join(cLauncherContentsPath, '_CodeSignature'), OS.Path.join(cTargetContentsPath, '_CodeSignature'));
					// var rez_hardLinkMacOs = createAlias(OS.Path.join(cLauncherContentsPath, 'MacOS'), OS.Path.join(cTargetContentsPath, 'MacOS'));
					// var rez_hardLinkPkgInfo = createAlias(OS.Path.join(cLauncherContentsPath, 'PkgInfo'), OS.Path.join(cTargetContentsPath, 'PkgInfo'));
					// var rez_hardResources = createAlias(OS.Path.join(cLauncherContentsPath, 'Resources'), OS.Path.join(cTargetContentsPath, 'Resources'));
					var rez_hardLinkCodeSig = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, '_CodeSignature'), OS.Path.join(cLauncherContentsPath, '_CodeSignature'));
					var rez_hardLinkMacOs = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'MacOS'), OS.Path.join(cLauncherContentsPath, 'MacOS'));
					var rez_hardLinkPkgInfo = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'PkgInfo'), OS.Path.join(cLauncherContentsPath, 'PkgInfo'));
					var rez_hardResources = OS.File.unixSymLink(OS.Path.join(cTargetContentsPath, 'Resources'), OS.Path.join(cLauncherContentsPath, 'Resources'));

					var rez_copyIcon = OS.File.copy(aLauncherIconPath, OS.Path.join(cTargetContentsPath, 'Resources', 'profilist-' + cLauncherDirName + '.icns'), {noOverwrite:false}); // i copy the icon into the main folder, because i alias the folders
					
					var execContents = [
						'#!/bin/sh',
						'##' + JSON.stringify({XREExeF_APP:cTargetAppPath, LauncherIconPathName:aLauncherIconPath.substring(core.profilist.path.icons.length + 1, aLauncherIconPath.length - 5)}) + '##', // link9900001
						'exec "' + OS.Path.join(cLauncherAppPath, 'Contents', 'MacOS', 'firefox') + '" -profile "' + aFullPathToProfileDir + '" -no-remote "$@"' // i think i have to use path to launcher so it gets icon even on killall Dock etc
					];
					var cLauncherExecPath = OS.Path.join(cTargetContentsPath, 'MacOS', 'profilist-' + cLauncherDirName); // we place it into the target folder because i alias the folders
					var rez_writeExec = OS.File.writeAtomic(cLauncherExecPath, execContents.join('\n'));// i write the exec into the main folder, because i alias the folders)
					var rez_permExec = OS.File.setPermissions(cLauncherExecPath, {unixMode: core.FileUtils.PERMS_DIRECTORY});
					
					var rez_readPlistInfo = OS.File.read(OS.Path.join(cTargetContentsPath, 'Info.plist'), {encoding:'utf-8'});
					var launcherPlistInfo = rez_readPlistInfo;
					launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleExecutable<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b) {
						// this function gets the original executable name (i cant assume its firefox, it might nightly etc)
						// it also replaces it with profilist-exec
						return a.replace(b, 'profilist-' + cLauncherDirName);
					});
					launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleIconFile<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b, c) {
						// this function replaces icon with profilist-badged.icns, so in future i can easily replace it without having to know name first, like i dont know if its firefox.icns for nightly etc
						return a.replace(b, 'profilist-' + cLauncherDirName);
					});
					launcherPlistInfo = launcherPlistInfo.replace(/<key>CFBundleIdentifier<\/key>[\s\S]*?<string>(.*?)<\/string>/, function(a, b, c) {
						// this function replaces the bundle identifier
						// on macs the Profilist.launcher key holds the bundle identifier
						return a.replace(b, cLauncherDirName/*.replace(/[^a-z\.0-9]/ig, '-')*/); //no need for the replace as its all numbers, but i left it here so i know whats allowed in a bundle-identifier
						//The bundle identifier string identifies your application to the system. This string must be a uniform type identifier (UTI) that contains only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.) characters. The string should also be in reverse-DNS format. For example, if your companyâ€™s domain is Ajax.com and you create an application named Hello, you could assign the string com.Ajax.Hello as your applicationâ€™s bundle identifier. The bundle identifier is used in validating the application signature. source (apple developer: https://developer.apple.com/library/ios/#documentation/CoreFoundation/Conceptual/CFBundles/BundleTypes/BundleTypes.html#//apple_ref/doc/uid/10000123i-CH101-SW1)
						//An identifier used by iOS and Mac OS X to recognize any future updates to your app. Your Bundle ID must be registered with Apple and unique to your app. Bundle IDs are app-type specific (either iOS or Mac OS X). The same Bundle ID cannot be used for both iOS and Mac OS X apps. source https://itunesconnect.apple.com/docs/iTunesConnect_DeveloperGuide.pdf
					});
					var rez_writePlistInfo = OS.File.writeAtomic(OS.Path.join(cLauncherContentsPath, 'Info.plist'), launcherPlistInfo, {encoding:'utf-8'});
					
					// xattr it
					console.log('xattr-ing the regular app - trying symlink');
					var rez_xattrOpen = ostypes.API('popen')('/usr/bin/xattr -d com.apple.quarantine "' + cLauncherAppPath.replace(/ /g, '\ ') + '"', 'r')
					var rez_xattrClose = ostypes.API('pclose')(rez_xattrOpen); // waits for process to exit
					console.log('rez_xattrClose:', cutils.jscGetDeepest(rez_xattrClose));

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

var debugVar = false;
function launchOrFocusProfile(aProfPath, aOptions={}, aDeferredForCreateDesktopShortcutToResolve) {
	// get path to launcher. if it doesnt exist create it then return the path. if it exists, just return the path.
	// aDeferredForCreateDesktopShortcutToResolve is a deferred that is resolved after all things are done. setting this, will not focus or launch, it will just create the launcher as if it were launching. resolves with path to the launcher.
	
	// aOptions
	var cOptionsDefaults = {
		// refreshRunningStatus: false // re-check if it is indeeded running - i havent set this up yet, and i plan not to, but leaving it here as a comment as it was a thought of mine
	}
	
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	// console.error('core.profilist.path.XREExeF:', core.profilist.path.XREExeF);
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (!cIniEntry) { console.error('should-nver-happen!', 'cIniEntry could not be found'); throw new MainWorkerError('should-nver-happen!', 'cIniEntry could not be found'); }
	
	/*
	if (aOptions.refreshRunningStatus) {
		
	}
	*/
	
	if (!aDeferredForCreateDesktopShortcutToResolve) {
		if (cIniEntry.noWriteObj.status) { // link6847494493
			// :todo: if its running, then run code to focus, then carry on to the createIconForParamsFromFS and createLauncherForParams - it will not launch as .status is existing
			// no need to continue to create launcher, just focus it, i changed my desciion to this on 011016, before this i was thinking launch it, and in the bg adjust the launcher to match, maybe should do this not sure, :todo: consider
			
			// focus all windows of that pid
			switch (core.os.mname) {
				case 'winnt':
				case 'winmo':
				case 'wince':
				
						var allWinInfos = getAllWin({
							filterVisible: true,
							getPid: true
						});
						console.log('allWinInfos:', allWinInfos);
						
						var matchingWinInfos = allWinInfos.filter(function(aWinInfo) {
							if (aWinInfo.pid == cIniEntry.noWriteObj.status) {
								aWinInfo.hwndPtr = ctypes.voidptr_t(ctypes.UInt64(aWinInfo.hwnd));
								aWinInfo.isMinimized = ostypes.API('IsIconic')(aWinInfo.hwndPtr);
								return true;
							}
						});
						
						// :todo: maybe consider, instead of focusing all in order - find all minimized. if all minimized, then focus in order such that last one is top most. if all non-minimized then focus such that first one is top most focus. if mixed, then focus all windows but make the second to top be the last most minimized, and then the top most is the one that was first non-minimized
						// :todo: test and figure out how to get the right order such that it is "last used" order
						// for now just focusing them in the order that they come up

						for (var i=matchingWinInfos.length-1; i>=0; i--) {
							if (matchingWinInfos[i].isMinimized) {
								var rez_unMinimize = ostypes.API('ShowWindow')(matchingWinInfos[i].hwndPtr, ostypes.CONST.SW_RESTORE);
								console.log('rez_unMinimize:', rez_unMinimize);
							}
							var rez_focus = ostypes.API('SetForegroundWindow')(matchingWinInfos[i].hwndPtr);
							console.log('rez_focus:', rez_focus);
						}
						
					break;
				case 'gtk':

						var allWinInfos = getAllWin({
							filterVisible: true,
							getPid: true,
							getTitle: true,
							getBounds: true // this is force set to true if i dont specify this or set it to false for gtk
						});
						
						console.log('allWinInfos:', allWinInfos);
						
						var matchingWinInfos = allWinInfos.filter(function(aWinInfo) {
							if (aWinInfo.pid == cIniEntry.noWriteObj.status) {
								return true;
							}
						});
						
						console.log('matchingWinInfos:', matchingWinInfos);
						
						// focus the matching windows
						var xevent = ostypes.TYPE.XEvent();

						xevent.xclient.type = ostypes.CONST.ClientMessage;
						xevent.xclient.serial = 0;
						xevent.xclient.send_event = ostypes.CONST.True;
						xevent.xclient.display = ostypes.HELPER.cachedXOpenDisplay();
						// xevent.xclient.window = ostypes.HELPER.gdkWinPtrToXID(hwndPtr); // gdkWinPtrToXID returns ostypes.TYPE.XID, but XClientMessageEvent.window field wants ostypes.TYPE.Window..... but XID and Window are same type so its ok no need to cast
						xevent.xclient.message_type = ostypes.HELPER.cachedAtom('_NET_ACTIVE_WINDOW');
						xevent.xclient.format = 32; // because xclient.data is long, i defined that in the struct union
						xevent.xclient.data = ostypes.TYPE.long.array(5)([ostypes.CONST._NET_WM_STATE_TOGGLE /* requestor type; we're a tool */, ostypes.CONST.CurrentTime /* timestamp, the tv_sec of timeval struct */, ostypes.CONST.None /* currently active window */, 0, 0]); // im not sure if i set this right // i got this idea because this is how this guy did it - https://github.com/vovochka404/deadbeef-statusnotifier-plugin/blob/8d72fffc0fb98ed0efb3ca86e4abf6e8b5c749ba/src/x11-force-focus.c#L67-L69
						
						// ubuntu is cool in that even if minimized, the order is proper z order, unlike windows
						
						for (var i=matchingWinInfos.length-1; i>=0; i--) {
							console.log('setting xclient.window to:', matchingWinInfos[i].hwndXid);
							xevent.xclient.window = matchingWinInfos[i].hwndXid;
							var rez_focus = ostypes.API('XSendEvent')(ostypes.HELPER.cachedXOpenDisplay(), ostypes.HELPER.cachedDefaultRootWindow(), ostypes.CONST.False, ostypes.CONST.SubstructureRedirectMask | ostypes.CONST.SubstructureNotifyMask, xevent.address()); // need for SubstructureRedirectMask is because i think this topic - http://stackoverflow.com/q/650223/1828637 - he says "I've read that Window Managers try to stop this behaviour, so tried to disable configure redirection"
							console.log('rez_focus:', rez_focus);
							// the zotero guy tests if rez_focus is 1, and if so then he does XMapRaised, i dont know why, as simply doing a flush after this focuses. this is zotero - https://github.com/zotero/zotero/blob/7d404e8d4ad636987acfe33d0b8620263004d6d0/chrome/content/zotero/xpcom/integration.js#L619
							// i suspect zotero does that for cross window manager abilty, as just simply flushing worked for me on ubuntu
							ostypes.API('XFlush')(ostypes.HELPER.cachedXOpenDisplay()); // will not set on top if you dont do this, wont even change window title name which was done via XChangeProperty, MUST FLUSH
						}

					break;
				case 'darwin':

						// app = [NSRuningApplication runningApplicationWithProcessIdentifier: pid];
						var NSRunningApplication = ostypes.API('objc_getClass')('NSRunningApplication');
						var runningApplicationWithProcessIdentifier = ostypes.API('sel_registerName')('runningApplicationWithProcessIdentifier:');
						var app = ostypes.API('objc_msgSend')(NSRunningApplication, runningApplicationWithProcessIdentifier, ostypes.TYPE.pid_t(cIniEntry.noWriteObj.status));
						console.info('app:', app, app.toString(), uneval(app));
						
						// [app activateWithOptions: NSApplicationActivateAllWindows]
						var activateWithOptions = ostypes.API('sel_registerName')('activateWithOptions:');
						var rez_focus = ostypes.API('objc_msgSend')(app, activateWithOptions, ostypes.TYPE.NSUInteger(3));
						
						// C:\Users\Mercurius\OneDrive\Documents\jscGetDepeest with args.png
						//// console.info('rez_focus:', rez_focus, rez_focus.toString(), uneval(rez_focus));
						//// 
						//// console.info('rez_focus jscGetDeepest:', cutils.jscGetDeepest(rez_focus));
						//// console.info('rez_focus jscGetDeepest 16:', cutils.jscGetDeepest(rez_focus, 16));
						//// console.info('rez_focus jscGetDeepest 10:', cutils.jscGetDeepest(rez_focus, 10));
						//// 
						//// rez_focus = ctypes.cast(rez_focus, ostypes.TYPE.BOOL);
						//// console.info('rez_focus casted:', rez_focus);
						//// console.info('rez_focus casted jscGetDeepest:', cutils.jscGetDeepest(rez_focus));
						//// 
						//// console.info('YES jscGetDeepest:', cutils.jscGetDeepest(ostypes.CONST.YES));
						
						rez_focus = ctypes.cast(rez_focus, ostypes.TYPE.BOOL);
						
						if (cutils.jscEqual(rez_focus, ostypes.CONST.YES)) {
							console.log('App was focused!');
						} else {
							console.log('Failed to focus app :(');
						}
						
						debugVar = !debugVar;
						// if (!debugVar) {
						// 	var unhide = ostypes.API('sel_registerName')('unhide');
						// 	var rez_unhide = ostypes.API('objc_msgSend')(app, unhide);
						// 	console.log('rez_unhide:', rez_unhide);
						// } else {
						// 	var hide = ostypes.API('sel_registerName')('hide');
						// 	var rez_hide = ostypes.API('objc_msgSend')(app, hide);
						// 	console.log('rez_hide:', rez_hide);
						// }
						
					break;
				default:
					throw new MainWorkerError({
						name: 'addon-error',
						message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
					});
			}
			
			return;
		}
	}
	
	// these vars, are all the things it should SET-TO/NOW be - on launching
	var cExePath = getCalcdExePathForProfFromIniFromFS(aProfPath);
	console.info('cExePath:', cExePath);
	var cExeChannel = getExeChanForParamsFromFSFromCache(cExePath);
	console.info('cExeChannel:', cExeChannel);
	var cBadgeIconSlug = getBadgeSlugForProfFromIni(aProfPath);
	console.info('cBadgeIconSlug:', cBadgeIconSlug);
	var cIconInfosObj = getIconPathInfosForParamsFromIni(cExePath, cExeChannel, cBadgeIconSlug);
	console.info('cIconInfosObj:', cIconInfosObj);
	var cLauncherDirPath = getLauncherDirPathFromParams(aProfPath);
	console.info('cLauncherDirPath:', cLauncherDirPath);
	var cLauncherName = getLauncherNameFromParams(cExeChannel, cIniEntry.Name)
	console.info('cLauncherName:', cLauncherName);
	
	var cFullPathToProfileDir = getFullPathToProfileDirFromIni(aProfPath);
	console.info('cFullPathToProfileDir:', cFullPathToProfileDir);
	
	var cBadgeLoc = getPrefLikeValForKeyInIniEntry(cIniEntry, getIniEntryByKeyValue(gIniObj, 'groupName', 'General'), 'ProfilistBadgeLoc');
	
	// this is done after promise_createIcon
	var postCreateIcon = function() {
		var didCreateLauncher = createLauncherForParams(cLauncherDirPath, cLauncherName, cIconInfosObj.path, cExePath, cFullPathToProfileDir); // on success it is the launcher full path
		
		if (aDeferredForCreateDesktopShortcutToResolve) {
			if (didCreateLauncher) {
				aDeferredForCreateDesktopShortcutToResolve.resolve(didCreateLauncher);
			} else {
				aDeferredForCreateDesktopShortcutToResolve.reject();
			}
		}
		
		if (!aDeferredForCreateDesktopShortcutToResolve) {
			if (!cIniEntry.noWriteObj.status) { // link6847494493 this tells me that it wasnt focused, so i launch it now
				// i do this test, because even if just have to focus, i should create launcher in background
				if (didCreateLauncher) {
					launchFile(didCreateLauncher);
				} else {
					throw new Error('launcher did not create so cannot launch');
				}
			}
		}
	};
	
	var promise_createIcon = createIconForParamsFromFS(cIconInfosObj, cBadgeLoc);
	promise_createIcon.then(
		function(aVal) {
			console.log('Fullfilled - promise_createIcon - ', aVal);
			postCreateIcon();
		},
		genericReject.bind(null, 'promise_createIcon', 0)
	).catch(genericCatch.bind(null, 'promise_createIcon', 0));

	
	return 'ok launched aProfPath: ' + aProfPath;
}

function createNewProfile(aNewProfName, aCloneProfPath, aNameIsPlatPath, aLaunchIt) {
	// aNameIsPlatPath - should be true, if user wants aNewProfName to be considered as a platform path. If this is true, the name of the profile is the directory name, and this directory must not exist, therefore the name must be platform safe as i dont run safedForPlatFS on it
	// aNewProfName - string for new profile that will be made. OR set to null to use preset name. can be platform path, but in this case set aNameIsPlatPath to true
	// aCloneProfPath - the path of the profile to clone. `null` if this is not a clone
	// aLaunchIt - set to false, if you want to just create. set to true if you want to create it then launch it soon after creation
	
	console.error('in createNewProfile in worker');
	
	var cFailedReason;
	
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);

	var keyValNotif = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistNotif');
	
	var gCloneIniEntry;
	if (aCloneProfPath) {
		gCloneIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aCloneProfPath);
		if (!gCloneIniEntry) {
			cFailedReason = 'cannot find target clone profile in profiles.ini'; // :l10n:
		}
	}
	
	if (!cFailedReason) {
		if (!aNewProfName) { // even if aNewProfName comes in as '' it will calc preset. but i made the gui not accept blank textbox values
			// calculate preset
			if (!aCloneProfPath) {
				// get next available number for "New Profile ##"
				// start original block link37371017111
				var presetPattStr = escapeRegExp(formatStringFromName('preset-profile-name', ['DIGITS_REP_REP_REP_HERE_NOIDA'], 'mainworker'));
				presetPattStr = presetPattStr.replace('DIGITS_REP_REP_REP_HERE_NOIDA', '(\\d+)');
				var presetPatt = new RegExp(presetPattStr);
				var presetNextNumber = 1;
				for (var i=0; i<gIniObj.length; i++) {
					if (gIniObj[i].Path) {
						var presetMatch = presetPatt.exec(gIniObj[i].Name);
						if (presetMatch) {
							var presetThisNumber = parseInt(presetMatch[1]);
							console.log('presetThisNumber:', presetThisNumber);
							if (presetThisNumber >= presetNextNumber) {
								presetNextNumber = presetThisNumber + 1;
							}
						}
					}
				}
				aNewProfName = formatStringFromName('preset-profile-name', [presetNextNumber], 'mainworker');
				// end original block link37371017111
			} else {
				// assume that non-multiple form is taken, so calc for next preset number
				// start modded copy of block link37371017111
				var presetPattStr = escapeRegExp(formatStringFromName('preset-profile-name-clone-multiple', [gCloneIniEntry.Name, 'DIGITS_REP_REP_REP_HERE_NOIDA'], 'mainworker'));
				presetPattStr = presetPattStr.replace('DIGITS_REP_REP_REP_HERE_NOIDA', '(\\d+)');
				var presetPatt = new RegExp(presetPattStr);
				var presetNextNumber = 1;
				for (var i=0; i<gIniObj.length; i++) {
					if (gIniObj[i].Path) {
						var presetMatch = presetPatt.exec(gIniObj[i].Name);
						if (presetMatch) {
							var presetThisNumber = parseInt(presetMatch[1]);
							console.log('presetThisNumber:', presetThisNumber);
							if (presetThisNumber >= presetNextNumber) {
								presetNextNumber = presetThisNumber + 1;
							}
						}
					}
				}
				if (presetNextNumber == 1) {
					aNewProfName = formatStringFromName('preset-profile-name-clone', [gCloneIniEntry.Name], 'mainworker');
					var gPrexistingNameEntry = getIniEntryByKeyValue(gIniObj, 'Name', aNewProfName);
					if (gPrexistingNameEntry) {
						aNewProfName = formatStringFromName('preset-profile-name-clone-multiple', [gCloneIniEntry.Name, 2], 'mainworker');
					}
				} else {
					aNewProfName = formatStringFromName('preset-profile-name-clone-multiple', [gCloneIniEntry.Name, presetNextNumber], 'mainworker');
				}
				// end copy of block link37371017111
			}
		} else {
			if (aNameIsPlatPath) {
				// strip trailing platformFilePathSeperator
				var pattTFSPS = new RegExp('(?:' + escapeRegExp(platformFilePathSeperator()) + ')+$', 'm'); // TFSPS stands for trailing file system path seperators
				var aNewProfPlatPath_TFSPSS = aNewProfName.replace(pattTFSPS, ''); // TFSPSS stands for trailing file system seperators stripped
				
				var startStrOfProfName = OS.Path.basename(aNewProfPlatPath_TFSPSS);
				var startIndexOfProfName = aNewProfPlatPath_TFSPSS.lastIndexOf(startStrOfProfName);
				aNewProfName = aNewProfName.substr(startIndexOfProfName);
				
				var aNewProfPlatPath = aNewProfPlatPath_TFSPSS.substr(0, startIndexOfProfName) /* this first portion includes the path seperator */ + safedForPlatFS(aNewProfName); // link900073
				
				console.error('aNewProfPlatPath:', aNewProfPlatPath);
				console.error('aNewProfName:', aNewProfName);
			}
			if (aNewProfName == '') {
				cFailedReason = 'New name cannot be blank.'; //:l10n:
			} else {
				// check if someone already has this name
				var gPrexistingNameEntry = getIniEntryByKeyValue(gIniObj, 'Name', aNewProfName);
				if (gPrexistingNameEntry) {
					cFailedReason = formatStringFromName('reason_name-taken', [aNewProfName], 'mainworker');
				}
			}
		}
	}
	
	// initiate newIniEntry and get cProfPlatPathToRootDir
	var newIniEntry;
	var cProfPlatPathToRootDir;
	if (!cFailedReason) {
		// no errors so far
		
		// find next ## for [Profile##]/[TempProfile##]
		var groupNameNumberNext = 0;
		for (var i=0; i<gIniObj.length; i++) {
			if (gIniObj[i].Path) {
				var indexOfProfile = gIniObj[i].groupName.indexOf('Profile');
				if (indexOfProfile == 0 /* std profile group [Profile##] */ || indexOfProfile == 4 /* temp profile [TempProfile##] */) {
					groupNameNumberThis = parseInt(gIniObj[i].groupName.substr(0, indexOfProfile + 7 /* len of word Profile */));
					if (groupNameNumberThis >= groupNameNumberNext) {
						groupNameNumberNext = groupNameNumberThis + 1;
					}
				}
			}
		}
		
		newIniEntry = {
			groupName: 'Profile' + groupNameNumberNext,
			Name: aNewProfName, // depends on aNameIsPlatPath but can use aNewProfName here because of link900073
			// IsRelative: depends on aNameIsPlatPath
			// Path: depends on aNameIsPlatPath
		};

		// cannot use getFullPathToProfileDirFromIni as this newIniEntry hasnt been added to gIniObj yet
		if (aNameIsPlatPath) { // really is aName__WAS__PlatPath now because of link900073
			newIniEntry.IsRelative = '0';
			newIniEntry.Path = aNewProfPlatPath;
			cProfPlatPathToRootDir = aNewProfPlatPath;
			// directory must NOT exist
			var rez_nonRelPathExists = OS.File.exists(newIniEntry.Path);
			if (rez_nonRelPathExists) {
				cFailedReason = formatStringFromName('reason_custom-path-exists', [newIniEntry.Path], 'mainworker');
			}
		} else {
			newIniEntry.IsRelative = '1';
			cProfPlatPathToRootDir = OS.Path.join(core.profilist.path.defProfRt, mozSaltName(safedForPlatFS(aNewProfName)));
			newIniEntry.Path = getRelativeDescriptor(cProfPlatPathToRootDir, OS.Constants.Path.userApplicationDataDir);
		}
	}
	
	// create profile root dir
	if (!cFailedReason) {
		console.log('cProfPlatPathToRootDir:', cProfPlatPathToRootDir);
		if (!aCloneProfPath) {
			try {
				OS.File.makeDir(cProfPlatPathToRootDir);
			} catch(OSFileError) {
				if (OSFileError.becauseNoSuchFile) { // this will only happen if aNameIsPlatPath because if it is a relative path the userApplicationDataDir/Profiles always exists
					cFailedReason = formatStringFromName('reason_parent-dir-missing', [OS.Path.dirname(cProfPlatPathToRootDir)], 'mainworker');
				}
			}
		} // else dont make dir, as copyDirRecursive makes the dir for me
	}
	
	// populate profile root dir
	if (!cFailedReason) {
		
		if (!aCloneProfPath) {
			// write time.json
			var rez_writeTimesJson = OS.File.writeAtomic(OS.Path.join(cProfPlatPathToRootDir, 'times.json'), '{\n"created": ' + new Date().getTime() + '\n}\n', {encoding:'utf-8'});
		} else {
			//  if it is clone, then copy into root dir
			// DO NOT COPY: parent.lock/.parentlock
			
			if (keyValNotif == '1') {
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_clone-started', null, 'mainworker'), formatStringFromName('notif-body_clone-started', [], 'mainworker')]);
			}
			var cCloneProfPlatPathToRootDir = getFullPathToProfileDirFromIni(aCloneProfPath);
			copyDirRecursive(cCloneProfPlatPathToRootDir, OS.Path.dirname(cProfPlatPathToRootDir), {
				newDirName: OS.Path.basename(cProfPlatPathToRootDir),
				excludeFiles: [(['winnt', 'wince', 'winmo'].indexOf(core.os.mname) > -1 ? 'parent.lock' : '.parentlock')]
			});
		}
	}
	
	// create profile local dir
	if (!cFailedReason) {
		// local profile directories only exist for IsRelative == '1' meaning aNameIsPlatPath is false
		if (newIniEntry.IsRelative == '1') {
			// i decided yes make it for ```if aCloneProfPath``` as well
			// if (aCloneProfPath) {
			// 	// :todo: i think when i clone a profile, if i copy the local dir it screws up, i think thats why my old clone method was bad. i need to test and verify this
			// } else {
				// not a clone, so make a local dir i am sure about this
				var cProfPlatPathToLocalDir = OS.Path.join(core.profilist.path.defProfLRt, OS.Path.basename(cProfPlatPathToRootDir));
				console.log('cProfPlatPathToLocalDir:', cProfPlatPathToLocalDir);
				var rez_makeLocalDir = OS.File.makeDir(cProfPlatPathToLocalDir);
			// }
		}
	}
	
	// update gIniObj and write to disk ini
	if (!cFailedReason) {
		gIniObj.push(newIniEntry);
		
		// :todo: format this iniEntry for returning to framescript - for now i format the whole gIniObj
		formatNoWriteObjs();
		
		writeIni();
	}
	
	if (cFailedReason) {
		if (keyValNotif == '1') {
			if (!aCloneProfPath) {
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_create-failed', null, 'mainworker'), formatStringFromName('notif-body_create-failed', [cFailedReason], 'mainworker')]);
			} else {
				// clone
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_clone-failed', null, 'mainworker'), formatStringFromName('notif-body_clone-failed', [cFailedReason], 'mainworker')]);
			}
		}
		throw new MainWorkerError('something-bad-happend', {
			reason: cFailedReason,
			aIniObj: gIniObj
		});
	} else {
		/*
		if (keyValNotif == '1') {
			if (!aCloneProfPath) {
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_create-profile', null, 'mainworker'), formatStringFromName('notif-body_create-profile', [aNewProfName], 'mainworker')]);
			} else {
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_clone-profile', null, 'mainworker'), formatStringFromName('notif-body_clone-profile', [gCloneIniEntry.Name, aNewProfName], 'mainworker')]);
			}
		}
		*/
		
		// :debug:
		if (aLaunchIt) {
			setTimeout(function() { // setTimeout so it triggers after the return
				launchOrFocusProfile(newIniEntry.Path)
			}, 0);
		}
		
		return gIniObj;
	}
}

function renameProfile(aProfPath, aNewProfName) {
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);

	var keyValNotif = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistNotif');
	
	var gTargetIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	if (gTargetIniEntry.Name == aNewProfName) {
		return 'already set to that name'; // dont error, just dont rename
	}
	
	var cFailedReason;
	
	if (aNewProfName === '') {
		cFailedReason = 'New name cannot be blank.'; //:l10n:
	} else {
		// check if someone already has this name
		var gPrexistingNameEntry = getIniEntryByKeyValue(gIniObj, 'Name', aNewProfName);
		if (gPrexistingNameEntry) {
			cFailedReason = formatStringFromName('reason_name-taken', [aNewProfName], 'mainworker');
		} else {
			// ok no errors, go ahead and rename
			gTargetIniEntry.Name = aNewProfName;
			writeIni();
		}
	}
	
	if (cFailedReason) {
		if (keyValNotif == '1') {
			self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_rename-failed', null, 'mainworker'), formatStringFromName('notif-body_rename-failed', [gTargetIniEntry.Name, aNewProfName, cFailedReason], 'mainworker')]);
		}
		throw new MainWorkerError('something-bad-happend', {
			reason: cFailedReason,
			aIniObj: gIniObj
		});
	}
}

function deleteProfile(aProfPath) {
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);

	var keyValNotif = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistNotif');
	
	var gTargetIniEntry;
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path && gIniObj[i].Path == aProfPath) {
			gTargetIniEntry = gIniObj[i];
			break;
		}
	}

	var cFailedReason;
	if (!gTargetIniEntry) {
		cFailedReason = 'profile not found in profiles.ini'; // :l10n:
	} else {
		if (gTargetIniEntry.noWriteObj.status) {
			cFailedReason = 'profile is in use!'; // :l10n:
		} else {
			
			// delete root profile directory
			var delPlatPath_profRootDir;
			var profDirName; // only used/set for relative profile
			if (gTargetIniEntry.IsRelative == '1') {
				profDirName = OS.Path.basename(OS.Path.normalize(gTargetIniEntry.Path));
				delPlatPath_profRootDir = OS.Path.join(core.profilist.path.defProfRt, profDirName);
				
			} else {
				delPlatPath_profRootDir = gTargetIniEntry.Path;
			}
			try {
				OS.File.removeDir(delPlatPath_profRootDir, {ignoreAbsent:true, ignorePermissions:false});
			} catch (OSFileError) {
				console.error('error deleting root profile directory - ', OSFileError);
				// this is cause for do not remove from ini
				cFailedReason = 'Could not delete root directory. Windows error: ' + ctypes.winLastError + '. Unix error: ' + ctypes.errno; // :l10n:
			}
			
			// delete local profile directory
			if (gTargetIniEntry.IsRelative == '1') {
				var delPlatPath_profLocalDir = OS.Path.join(core.profilist.path.defProfLRt, profDirName);
				try {
					OS.File.removeDir(delPlatPath_profLocalDir, {ignoreAbsent:true, ignorePermissions:false});
				} catch (OSFileError) {
					console.error('error deleting local profile directory - ', OSFileError);
					// if this delete fails its ok, delete from ini, as profile is unusable - however there will be left over files on the users computer. :todo: figure out how to clean it up if delete fails - i never encounterd failed delete though
						// this is why i dont set cFailedReason
				}
			} // else - no local profile directory for non-relative profile
			
			if (!cFailedReason) {
				// if didnt fail, then splice from ini and update to disk
				gIniObj.splice(i, 1);
				writeIni();
			}
		}
	}
	
	if (cFailedReason) {
		if (keyValNotif == '1') {
			self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_delete-failed', null, 'mainworker'), formatStringFromName('notif-body_delete-failed', [gTargetIniEntry ? gTargetIniEntry.Name : 'NULL', cFailedReason], 'mainworker')]);
		}
		throw new MainWorkerError('something-bad-happend', {
			reason: cFailedReason,
			aIniObj: gIniObj
		});
	}
}

function toggleDefaultProfile(aProfPath) {
	// aProfPath is checked if its default
		// if it is then it is unset and nothing is left as default
		// else, then the current default is found, and deleted, then this one is set to default

	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);

	var keyValNotif = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistNotif');
	
	var gTargetIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	var cFailedReason;
	if (!gTargetIniEntry) {
		cFailedReason = 'profile not found in profiles.ini'; // :l10n:
	} else {
		if (gTargetIniEntry.Default == '1') {
			var gIniEntry_toUndefault = gTargetIniEntry;
			delete gIniEntry_toUndefault.Default;

			gGenIniEntry.StartWithLastProfile = '0';
		} else {
			var gIniEntry_toUndefault = getIniEntryByKeyValue(gIniObj, 'Default', '1');
			if (gIniEntry_toUndefault) { // as there may be no default
				delete gIniEntry_toUndefault.Default;
			} else {
				// there was no default set, so we need to set StartWithLastProfile to 1
				gGenIniEntry.StartWithLastProfile = '1';
			}
		
			var gIniEntry_toSetDefault = gTargetIniEntry;
			gIniEntry_toSetDefault.Default = '1';
		}
		writeIni();
	}

	if (cFailedReason) {
		if (keyValNotif == '1') {
			self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + formatStringFromName('notif-title_default-failed', null, 'mainworker'), formatStringFromName('notif-body_default-failed', [cFailedReason], 'mainworker')]);
		}
		throw new MainWorkerError('something-bad-happend', {
			reason: cFailedReason,
			aIniObj: gIniObj
		});
	}
}

function createDesktopShortcut(aProfPath, aCbIdToResolveToFramescript) {
	
	var deferred_ensureLauncher = new Deferred();
	
	self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + 'creating deskcut', 'for aProfPath of ' + aProfPath]);
	
	deferred_ensureLauncher.promise.then(
		function(aPathToLauncher) {
			console.log('ok launcher ensured, now make desktop shortcut, then call. aPathToLauncher:', aPathToLauncher);
			
			var cPathToDeskcut = OS.Path.join(OS.Constants.Path.desktopDir, OS.Path.basename(aPathToLauncher));
			
			switch (core.os.mname) {
				case 'winnt':
				case 'wince':
				case 'winmo':
				case 'darwin':
					
						// create hard link
						createHardLink(cPathToDeskcut, aPathToLauncher);
					
					break;
				default:
					// make symlink
					
						OS.File.unixSymLink(aPathToLauncher, cPathToDeskcut);
			}
			
			self.postMessage([aCbIdToResolveToFramescript]);
			
			var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
			var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
			var keyValNotif = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistNotif');
			if (keyValNotif) {
				self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + 'created desktop shortcut', 'ok destop shortcut was successfully made']);
			}
		},
		function() {
			self.postMessage(['showNotification', formatStringFromName('addon-name', null, 'mainworker') + ' - ' + 'creating deskcut failed', 'failed ensuring launcher']);
			self.postMessage([aCbIdToResolveToFramescript]);
		}
	);
	
	console.log('calling launchOrFocusProfile with deferred_ensureLauncher');
	launchOrFocusProfile(aProfPath, {}, deferred_ensureLauncher);
	
	// will not return anything here, because this calls launchOrFocusProfile with params to not launch and not focus, just to createLauncher as if it were laucnhing or focusing though and that might call async function of createIcon
}
// End - Launching profile and other profile functionality

// Start - Icon browse picker dialog
function browseiconInit() {
	return {
		iconConfig: 'rawr'
	};
}
// End - Icon browse picker dialog

// Start - Iconset Picker
function readSubdirsInDir(aDirPlatPath) {
	// returns
		// array all of objects
			/*
			{
				name: folder name
				path: full plat path to folder
			}
			*/
	
	var rezArr = [];
	
	var cDirIterator = new OS.File.DirectoryIterator(aDirPlatPath);
	try {
		cDirIterator.forEach(function(aEntry, aIndex, aIterator) {
			if (aEntry.isDir) {
				rezArr.push({
					name: aEntry.name,
					path: aEntry.path
				});
			}
		});
	} catch(OSFileError) {
		if (!OSFileError.becauseNoSuchFile) {
			throw new MainWorkerError('readSubdirsInDir', OSFileError);
		} // its ok if it doesnt exist, then just report back no files. for instance core.profilist.path.images doesnt exist and so will get here
	} finally {
		cDirIterator.close();
	}

	rezArr.sort(function(a, b) {
		return a.name > b.name;
	});
	
	if (aDirPlatPath == core.profilist.path.images) {
		console.log('splicing in');
		rezArr.splice(0, 0,
			{name:'aurora', path:core.addon.path.images + 'channel-iconsets/aurora'},
			{name:'beta', path:core.addon.path.images + 'channel-iconsets/beta'},
			{name:'dev', path:core.addon.path.images + 'channel-iconsets/dev'},
			{name:'nightly', path:core.addon.path.images + 'channel-iconsets/nightly'},
			{name:'release', path:core.addon.path.images + 'channel-iconsets/release'}
		);
	}
	
	return [rezArr]; // because this goes through callInPromiseWorker
}
// End - Iconset Picker

// platform helpers
function resolveSymlinkPath(aSymlinkPlatPath) {
	// aSymlinkPlatPath is a path that you know for sure is a symlinked path. if a parent dir is symlinked, and not the final child, then it will throw EINVAL
		// if its not, then the platform functiosn will through, so ill throw a OSFile.Error
	
	switch (core.os.name) {
		case 'darwin':
		case 'linux':
		case 'android':
		case 'sunos':
		case 'netbsd':
		case 'dragonfly':
		case 'openbsd':
		case 'freebsd':
		case 'gnu/kfreebsd':
			
				// i havent tested this on anything else other then mac yet, but it should be true for all linux
				var rlBuffer = ostypes.TYPE.char.array(OS.Constants.libc.PATH_MAX)();
				var rez_rl = ostypes.API('readlink')(aSymlinkPlatPath, rlBuffer, rlBuffer.length); // works because LastPlatformDir is to the Contents/Resources/ dir, which i do copy as symlink
				// console.log('rez_rl:', rez_rl);
				
				if (cutils.jscEqual(rez_rl, -1)) {
					switch(ctypes.errno) {
						case OS.Constants.libc.ENOENT:
								throw new OS.File.Error('Failed to resolve path because no file exists at path', ctypes.errno, aSymlinkPlatPath);
							break;
						case OS.Constants.libc.EINVAL:
								if (buffer.length <= 0) {
									throw new OS.File.Error('Failed to resolve path because buffer size is not positive. Buffer size was set to OS.Constants.libc.PATH_MAX which is: "' + OS.Constants.libc.PATH_MAX + '"', ctypes.errno, aSymlinkPlatPath);
								} else {
									throw new OS.File.Error('Failed to resolve path because no file exists at path because file at path is NOT a symbolic link', ctypes.errno, aSymlinkPlatPath);
								}
							break;
						default:
							throw new OS.File.Error('Failed to resolve path for some unknown reason, see errno', ctypes.errno, aSymlinkPlatPath);
					}
				} else {
					return rlBuffer.readString();
				}				
			
			break;
		default:
			throw new Error('os-unsupported');
	}

}
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
				
				var rez_CreateHardLink = ostypes.API('CreateHardLink')(aCreatePlatformPath, aTargetPlatformPath, null);
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

function launchFile(aLaunchPlatPath, aOptions={}) { // checkExistanceFirst to check if launcher exists first? not used yet
	// on linux, this works with .desktop files and the like only
	// on windows and osx it works with everything i tested
	
	var cOptionsDefaults = {
		arguments: [] // i havent figured out how to get this to work on .desktop's yet, so this option is just windows and osx for now 010816
	}
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				var sei = ostypes.TYPE.SHELLEXECUTEINFO();
				//console.info('ostypes.TYPE.SHELLEXECUTEINFO.size:', ostypes.TYPE.SHELLEXECUTEINFO.size);
				sei.cbSize = ostypes.TYPE.SHELLEXECUTEINFO.size;
				sei.lpFile = ostypes.TYPE.LPCTSTR.targetType.array()(aLaunchPlatPath);
				if (aOptions.arguments.length > 0) {
					sei.lpParameters = ostypes.TYPE.LPCTSTR.targetType.array()(arrOfArgs.join(' '));
				}
				//sei.lpVerb = ostypes.TYPE.LPCTSTR.targetType.array()('open');
				sei.nShow = ostypes.CONST.SW_SHOWNORMAL;
				
				var rez_ShellExecuteEx = ostypes.API('ShellExecuteEx')(sei.address());
				console.log('rez_ShellExecuteEx:', rez_ShellExecuteEx.toString(), uneval(rez_ShellExecuteEx));
				if (ctypes.winLastError != 0) { console.error('Failed rez_ShellExecuteEx, winLastError:', ctypes.winLastError); }
				
			break;
		// case 'linux':
		// case 'freebsd':
		// case 'openbsd':
		// case 'sunos':
		// case 'webos':
		// case 'android':
		case 'gtk':

				// gio
				var launcher = ostypes.API('g_desktop_app_info_new_from_filename')(aLaunchPlatPath);
				console.info('launcher:', launcher, launcher.toString(), uneval(launcher));
				
				if (launcher.isNull()) {
					throw new Error('No file exists at path: "' + aLaunchPlatPath + '"');
				}
				
				launcher = ctypes.cast(launcher, ostypes.TYPE.GAppInfo.ptr);
				var uris = ostypes.TYPE.GList(); // can use `null`
				var launch_context = null; // have to use null due o this explanation here: // cannot use `var launch_context = new ostypes.TYPE.GAppLaunchContext();` //throws `Error: cannot construct an opaque StructType` so i have to get launch_context from something like `gdk_display_get_app_launch_context` because i dont know he structure to it, and i obviously cannto create opaque structures
				var error = ostypes.TYPE.GError.ptr(); // can use `null`

				var rez_launch_uris = ostypes.API('g_app_info_launch_uris')(launcher, uris.address(), launch_context, error.address());
				console.info('rez_launch_uris:', rez_launch_uris, rez_launch_uris.toString(), uneval(rez_launch_uris));
				console.info('error:', error, error.toString(), uneval(error));

			break;
		case 'darwin':
				
				// open
				var cmdStr = [
					'open',
					'-a',
					'"' + aLaunchPlatPath.replace(/ /g, '\ ') + '"'
				];
				if (aOptions.arguments.length > 0) {
					cmdStr.push('--args');
					cmdStr = cmdStr.concat(aOptions.arguments);
				}
				var rez_popenOpen = ostypes.API('popen')(cmdStr.join(' '), 'r');
				
				// :debug:
				/*
				console.log('cmdStr:', cmdStr.join(' '));
				var bufferSize = 1000;
				var buffer = ctypes.char.array(bufferSize)('');
				var size = bufferSize;
				var outList = [];
				while (size == bufferSize) {
					size = ostypes.API('fread')(buffer, 1, bufferSize, rez_popenOpen);
					outList.push(buffer.readString().substring(0, size));
					console.log('did read');
				}
				console.log('pout:', outList.join(''));
				*/
				// :debug:
				
				var rez_plcoseOpen = ostypes.API('pclose')(rez_popenOpen); // waits for process to exit
				console.log('rez_plcoseOpen:', cutils.jscGetDeepest(rez_plcoseOpen));
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}

// rev1 - https://gist.github.com/Noitidart/a544b6642a8e3a628ad9
function getAllWin(aOptions) {
	// returns an array of objects a list of all the windows in z order front to back:
	/*
		[
			{
				hwnd: window handle, hwnd for windows, gdkWindow* for gtk, nswindow for mac,
				pid: process id, if set getPid to true
				title: window title name, set getTitle true,
				bounds: window rect, set getBounds true,
				icon: custom icon for the window, set getIcon true,
			},
			{},
		]
	*/
	/*
	aOptions = {
		filterVisible: bool, will only contain windows that are visible,
		filterActiveWorkspace: bool, set to true if you want only the windows on the active workspace from each monitor,
		getPid: bool, set to true if u want it,
		getTitle: bool, set to true if you want it,
		getBounds: bool, set to true if you want it,
		getIcon: bool, set to true if you want to test if window has custom icon, if it does it returns its byte data? maybe hwnd? not sure maybe different per os, but if it doesnt have custom icon then key is present but set to null, // NOT YET SUPPORTED
		getAlwaysTop: bool, set to true if you want to test if window is set to always on top, // NOT YET SUPPORTED
		hwndAsPtr: bool, set to true if you want the hwnd to be ptr, otherwise it will be string of pointer, i recall that the loop would jack up and pointers would be bad so by default it will give strings, should verify and fix why the pointers were bad if they are aug 7 2015
		macGetCgWinId: bool, // mac only
		macGetWorkspace: bool, // mac only
	}
	*/
	
	var rezWinArr = [];
	
	switch (core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name) {
		case 'winnt':
			
				if (aOptions.getPid) {
					var PID = ostypes.TYPE.DWORD();
				}
				
				if (aOptions.getTitle) {
					var lpStringMax = 500; // i dont think there is a max length to this so lets just go with 500
					var lpString = ostypes.TYPE.LPTSTR.targetType.array(lpStringMax)();
				}
				
				if (aOptions.getBounds) {
					var lpRect = ostypes.TYPE.RECT();
				}
				
				var f = 0;
				var SearchPD = function(hwnd, lparam) {
					f++;
					var thisWin = {};
					
					thisWin.hwnd = aOptions.hwndAsPtr ? hwnd : cutils.strOfPtr(hwnd);
					
					if (aOptions.filterVisible) {
						var hwndStyle = ostypes.API('GetWindowLongPtr')(hwnd, ostypes.CONST.GWL_STYLE);
						hwndStyle = parseInt(cutils.jscGetDeepest(hwndStyle));
						if (hwndStyle & ostypes.CONST.WS_VISIBLE) {
							
						} else {
							// window is not visible
							return true; // continue iterating // do not push thisWin into rezWinArr
						}
					}
					
					if (aOptions.getPid) {
						var rez_GWTPI = ostypes.API('GetWindowThreadProcessId')(hwnd, PID.address());
						thisWin.pid = cutils.jscGetDeepest(PID);
					}
					
					if (aOptions.getTitle) {
						var rez_lenNotInclNullTerm = ostypes.API('GetWindowText')(hwnd, lpString, lpStringMax);
						thisWin.title = lpString.readString();
						var lenParseInt = parseInt(cutils.jscGetDeepest(rez_lenNotInclNullTerm)); // i dont think the rez_lenNotInclNullTerm will exceed lpStringMax even if truncated
						for (var i=0; i<=lenParseInt; i++) { // need <= as len is till the last char, we need to reset it so we can reuse this var, otherwise if we read next thing into same buffer and its length is shorter, then we'll have left over chars from previous tagged on to the current
							lpString[i] = 0;
						}
					}
					
					if (aOptions.getBounds) {
						var rez_rect = ostypes.API('GetWindowRect')(hwnd, lpRect.address());
						thisWin.left = parseInt(cutils.jscGetDeepest(lpRect.left));
						thisWin.top = parseInt(cutils.jscGetDeepest(lpRect.top));
						thisWin.bottom = parseInt(cutils.jscGetDeepest(lpRect.bottom));
						thisWin.right = parseInt(cutils.jscGetDeepest(lpRect.right));
						
						thisWin.width = thisWin.right - thisWin.left;
						thisWin.height = thisWin.bottom - thisWin.top;
					}
					
					/*
					if (cutils.jscEqual(PID, tPid)) {
						var hwndStyle = ostypes.API('GetWindowLongPtr')(hwnd, ostypes.CONST.GWL_STYLE);
						if (cutils.jscEqual(hwndStyle, 0)) {
							throw new Error('Failed to GetWindowLongPtr');
						}
						hwndStyle = parseInt(cutils.jscGetDeepest(hwndStyle));
						
						// debug block
						foundInOrder.push([cutils.strOfPtr(hwnd) + ' - ' + debugPrintAllStylesOnIt(hwndStyle)]); //debug
						if (!focusThisHwnd && (hwndStyle & ostypes.CONST.WS_VISIBLE) && (hwndStyle & ostypes.CONST.WS_CAPTION)) {
							foundInOrder.push('the hwnd above this row is what i will focus');
							focusThisHwnd = cutils.strOfPtr(hwnd); // for some reason if i set this to just hwnd, the global var of focusThisHwnd is getting cut shortend to just 0x2 after this enum is complete later on, even though on find it is 0x10200 so weird!!
						}
						// end // debug block
						return true; // keep iterating as debug
					}
					*/
					
					rezWinArr.push(thisWin);
					
					return true; // keep iterating
				}
				var SearchPD_ptr = ostypes.TYPE.WNDENUMPROC.ptr(SearchPD);
				var wnd = ostypes.TYPE.LPARAM();
				var rez_EnuMWindows = ostypes.API('EnumWindows')(SearchPD_ptr, wnd);
			

			break;
		case 'gtk':
			
				aOptions.getBounds = true; // required for gtk, as it needs to correlate-groups-from-xquerytree-data-to-a-window
				var xqRoot = ostypes.TYPE.Window();
				var xqParent = ostypes.TYPE.Window();
				var xqChildArr = ostypes.TYPE.Window.ptr();
				var nChilds = ostypes.TYPE.unsigned_int();
				
				var gpTypeReturned = ostypes.TYPE.Atom();
				var gpFormatReturned = ostypes.TYPE.int();
				var gpNItemsReturned = ostypes.TYPE.unsigned_long();
				var gpBytesAfterReturn = ostypes.TYPE.unsigned_long();
				var gpItemsArr = ostypes.TYPE.unsigned_char.ptr();
				
				var geoRoot = ostypes.TYPE.Window();
				var geoX = ostypes.TYPE.int();
				var geoY = ostypes.TYPE.int();
				var geoW = ostypes.TYPE.unsigned_int();
				var geoH = ostypes.TYPE.unsigned_int();
				var geoBorderWidth = ostypes.TYPE.unsigned_int();
				var geoDepth = ostypes.TYPE.unsigned_int();
				
				var wAttr = ostypes.TYPE.XWindowAttributes();
				
				var processWin = function(w) {
					if (aOptions.filterVisible) {
						var rez_WA = ostypes.API('XGetWindowAttributes')(ostypes.HELPER.cachedXOpenDisplay(), w, wAttr.address());

						if (!cutils.jscEqual(wAttr.map_state, ostypes.CONST.IsViewable)) {
							return; // continue as this is a hidden window, do not list features, do not dig this window
						}
					}
					
					var thisWin = {};
					// fetch props on thisWin
					
					thisWin.hwndXid = parseInt(cutils.jscGetDeepest(w));
					
					if (aOptions.getPid) {
						var rez_pid = ostypes.API('XGetWindowProperty')(ostypes.HELPER.cachedXOpenDisplay(), w, ostypes.HELPER.cachedAtom('_NET_WM_PID'), 0, 1, ostypes.CONST.False, ostypes.CONST.XA_CARDINAL, gpTypeReturned.address(), gpFormatReturned.address(), gpNItemsReturned.address(), gpBytesAfterReturn.address(), gpItemsArr.address());
						if (ostypes.HELPER.getWinProp_ReturnStatus(ostypes.CONST.XA_CARDINAL, gpTypeReturned, gpFormatReturned, gpBytesAfterReturn) == 1) {
							var jsN = parseInt(cutils.jscGetDeepest(gpNItemsReturned));
							if (jsN == 0) {
								thisWin.pid = null; // set to null as this window did not have a pid, but i add the key indicating i tested for it and the window had the proerty
							} else {

								thisWin.pid = parseInt(cutils.jscGetDeepest(ctypes.cast(gpItemsArr, ostypes.TYPE.CARD32.array(1).ptr).contents[0]));
							}
							ostypes.API('XFree')(gpItemsArr);
						} else {
							thisWin.pid = undefined; // window didnt even have property
						}
					}
					
					if (aOptions.getTitle) {
						var rez_title = ostypes.API('XGetWindowProperty')(ostypes.HELPER.cachedXOpenDisplay(), w, ostypes.HELPER.cachedAtom('_NET_WM_NAME'), 0, 256 /* this number times 4 is maximum ctypes.char that can be returned*/, ostypes.CONST.False, ostypes.HELPER.cachedAtom('UTF8_STRING'), gpTypeReturned.address(), gpFormatReturned.address(), gpNItemsReturned.address(), gpBytesAfterReturn.address(), gpItemsArr.address());
						if (ostypes.HELPER.getWinProp_ReturnStatus(ostypes.HELPER.cachedAtom('UTF8_STRING'), gpTypeReturned, gpFormatReturned, gpBytesAfterReturn) == 1) {
							var jsN = parseInt(cutils.jscGetDeepest(gpNItemsReturned));
							if (jsN == 0) {
								thisWin.title = ''; // window had property but not title
							} else {
								thisWin.title = ctypes.cast(gpItemsArr, ostypes.TYPE.char.array(jsN).ptr).contents.readString();
							}
							ostypes.API('XFree')(gpItemsArr);
						} else {
							thisWin.title = undefined; // window didnt even have property
						}
					}
					
					if (aOptions.getBounds) {
						if (aOptions.filterVisible) {
							// then get the info from wAttr as its already available
							thisWin.left = parseInt(cutils.jscGetDeepest(wAttr.x));
							thisWin.top = parseInt(cutils.jscGetDeepest(wAttr.y));
							
							var borderWidth = parseInt(cutils.jscGetDeepest(wAttr.border_width));
							thisWin.borderWidth = borderWidth;
							
							thisWin.width = parseInt(cutils.jscGetDeepest(wAttr.width))/* + borderWidth*/;
							thisWin.height = parseInt(cutils.jscGetDeepest(wAttr.height))/* + borderWidth*/;
							
							thisWin.right = thisWin.left + thisWin.width;
							thisWin.bottom = thisWin.top + thisWin.height;
						} else {
							var rez_bounds = ostypes.API('XGetGeometry')(ostypes.HELPER.cachedXOpenDisplay(), w, geoRoot.address(), geoX.address(), geoY.address(), geoW.address(), geoH.address(), geoBorderWidth.address(), geoDepth.address());
							thisWin.left = parseInt(cutils.jscGetDeepest(geoX));
							thisWin.top = parseInt(cutils.jscGetDeepest(geoY));
							
							var borderWidth = parseInt(cutils.jscGetDeepest(wAttr.border_width));
							thisWin.borderWidth = borderWidth;
							
							thisWin.width = parseInt(cutils.jscGetDeepest(wAttr.width))/* + borderWidth*/;
							thisWin.height = parseInt(cutils.jscGetDeepest(wAttr.height))/* + borderWidth*/;
							
							thisWin.right = thisWin.left + thisWin.width;
							thisWin.bottom = thisWin.top + thisWin.height;
						}
					}
					
					rezWinArr.splice(0, 0, thisWin);
					
					// dig the win even if it doesnt qualify
					var rez_XQ = ostypes.API('XQueryTree')(ostypes.HELPER.cachedXOpenDisplay(), w, xqRoot.address(), xqParent.address(), xqChildArr.address(), nChilds.address()); // interesting note about XQueryTree and workspaces: "The problem with this approach is that it will only return windows on the same virtual desktop.  In the case of multiple virtual desktops, windows on other virtual desktops will be ignored." source: http://www.experts-exchange.com/Programming/System/Q_21443252.html
					
					var jsNC = parseInt(cutils.jscGetDeepest(nChilds));
					
					if (jsNC > 0) {
						var jsChildArr = ctypes.cast(xqChildArr, ostypes.TYPE.Window.array(jsNC).ptr).contents;
						
						// for (var i=jsNC-1; i>-1; i--) {
						for (var i=0; i<jsNC; i++) {
							var wChild = jsChildArr[i];
							processWin(wChild);
						}
						
						ostypes.API('XFree')(xqChildArr);
					}
				}
				
				processWin(ostypes.HELPER.cachedDefaultRootWindow());
				
				// start - post analysis, per http://stackoverflow.com/questions/31914311/correlate-groups-from-xquerytree-data-to-a-window?noredirect=1#comment53135178_31914311
				var analyzedArr = [];
				var pushItBlock = function() {
					if (cWinObj) {
						
						// start - mini algo to find proper x and y. it first gets max x and y. if they are both 0, then it checks if min x and y are negative and then set its to that (as user may have set up window to left or above or something)
						var minLeft = Math.min.apply(Math, cWinObj.left);
						var minTop = Math.min.apply(Math, cWinObj.top);
						cWinObj.left = Math.max.apply(Math, cWinObj.left);
						cWinObj.top = Math.max.apply(Math, cWinObj.top);
						
						if (cWinObj.left == 0 && cWinObj.top == 0) {
							if (minLeft != -1 && minTop != -1) {
								cWinObj.left = minLeft;
								cWinObj.top = minTop;
							}
						}
						// end - mini algo to find proper x and y
						cWinObj.width = Math.max.apply(Math, cWinObj.width);
						cWinObj.height = Math.max.apply(Math, cWinObj.height);
						
						cWinObj.right = cWinObj.left + cWinObj.width;
						cWinObj.bottom = cWinObj.top + cWinObj.height;
						
						analyzedArr.push(cWinObj);
					}
				}

				var cWinObj = null;
				for (var i = 0; i < rezWinArr.length; i++) {
					if (rezWinArr[i].pid || (rezWinArr[i].title && cWinObj.title)) { // apparently sometimes you can hvae a new win title but no pid. like after "browser console" came a "compiz" title but no pid on it
						pushItBlock();
						cWinObj = {}
						for (var p in rezWinArr[i]) {
							cWinObj[p] = rezWinArr[i][p];
						}
						cWinObj.left = [];
						cWinObj.top = [];
						cWinObj.width = [];
						cWinObj.height = [];
					}
					if (cWinObj) {
						cWinObj.left.push(rezWinArr[i].left);
						cWinObj.top.push(rezWinArr[i].top);
						cWinObj.width.push(rezWinArr[i].width);
						cWinObj.height.push(rezWinArr[i].height);
					}
				}
				pushItBlock();

				// post pushing analysis
				// 1) remove all windows who have height and width of 1
				for (var i = 0; i < analyzedArr.length; i++) {
					if (analyzedArr[i].width == 1 && analyzedArr[i].height == 1) {
						analyzedArr.splice(i, 1);
						i--;
					}
				}
				// 2) remove all windows who have height and width == to Desktop which is that last entry
				// if (analyzedArr[analyzedArr.length - 1].title != 'Desktop') {
                // 
				// }
				var deskW = analyzedArr[analyzedArr.length - 1].width;
				var deskH = analyzedArr[analyzedArr.length - 1].height;
				for (var i = 0; i < analyzedArr.length - 1; i++) { // - 1 as we dont want the very last item
					if (analyzedArr[i].width == deskW && analyzedArr[i].height == deskH) {
						analyzedArr.splice(i, 1);
						i--;
					}
				}
				/*
				// 3) remove windows up till and including the last window with title "nativeshot_canvas"
				var iOfLastNativeshotCanvas = -1;
				for (var i = 0; i < analyzedArr.length; i++) {
					if (analyzedArr[i].title == 'nativeshot_canvas') {
						iOfLastNativeshotCanvas = i;
					}
				}
				if (iOfLastNativeshotCanvas > -1) {
					analyzedArr.splice(0, iOfLastNativeshotCanvas + 1);
				}
				*/
				// set rezWinArr to analyzedArr
				
				rezWinArr = analyzedArr;
				// end - post analysis
			
			break;
		case 'darwin':
			
				var cfarr_win = ostypes.API('CGWindowListCopyWindowInfo')(ostypes.CONST.kCGWindowListOptionOnScreenOnly, ostypes.CONST.kCGNullWindowID);
				try {
					var myNSStrings = new ostypes.HELPER.nsstringColl();
					
					var cnt_win = ostypes.API('CFArrayGetCount')(cfarr_win);

					cnt_win = parseInt(cutils.jscGetDeepest(cnt_win));

					
					for (var i=0; i<cnt_win; i++) {
						var thisWin = {};
						var c_win = ostypes.API('CFArrayGetValueAtIndex')(cfarr_win, i);
						
						if (aOptions.getTitle) {
							var windowName = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowName')); // (NSString *)[window objectForKey:@"kCGWindowName"];
							var windowNameLen = ostypes.API('objc_msgSend')(windowName, ostypes.HELPER.sel('length'));

							windowNameLen = ctypes.cast(windowNameLen, ostypes.TYPE.NSUInteger);

							windowNameLen = parseInt(cutils.jscGetDeepest(windowNameLen));

							
							if (windowNameLen == 0) { // can be 0 as its stated that kCGWindowName is an optional source: https://developer.apple.com/library/mac/documentation/Carbon/Reference/CGWindow_Reference/Constants/Constants.html#//apple_ref/doc/constant_group/Required_Window_List_Keys
								thisWin.title = '';
							} else {
								var utf8str = ostypes.API('objc_msgSend')(windowName, ostypes.HELPER.sel('UTF8String'));
								var str_casted = ctypes.cast(utf8str, ostypes.TYPE.char.array(windowNameLen+1).ptr).contents; // +1 as it doesnt include the null char, and readString needs that

								thisWin.title = str_casted.readString();
							}
						}
						
						if (aOptions.getPid) {
							var rez_pid = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowOwnerPID'));

							
							// rez_pid = ctypes.cast(rez_pid, ostypes.TYPE.NSInteger);

							
							// rez_pid = parseInt(cutils.jscGetDeepest(rez_pid));

							// thisWin.pid = rez_pid;
							
							var int_pid = ostypes.API('objc_msgSend')(rez_pid, ostypes.HELPER.sel('integerValue'));
							int_pid = ctypes.cast(int_pid, ostypes.TYPE.NSInteger);

							
							int_pid = parseInt(cutils.jscGetDeepest(int_pid));

							thisWin.pid = int_pid;
						}
						
						/*
						// start debug i just want to see if fullscreen apps have a different workspace number
						// if (aOptions.getPid) {
							var rez_ws = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowWorkspace'));
							var int_ws = ostypes.API('objc_msgSend')(rez_ws, ostypes.HELPER.sel('integerValue'));
							int_ws = ctypes.cast(int_ws, ostypes.TYPE.NSInteger);
							int_ws = parseInt(cutils.jscGetDeepest(int_ws));
							thisWin.ws = int_ws;
						// }
						*/
						
						if (aOptions.getBounds) {
							var rez_bs = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowBounds'));

							
							var bounds = ostypes.TYPE.CGRect();
							rez_bs = ctypes.cast(rez_bs, ostypes.TYPE.CFDictionaryRef);

							
							var rez_makeBounds = ostypes.API('CGRectMakeWithDictionaryRepresentation')(rez_bs, bounds.address());

							

							
							thisWin.left = parseInt(cutils.jscGetDeepest(bounds.origin.x));
							thisWin.top = parseInt(cutils.jscGetDeepest(bounds.origin.y));
							thisWin.width = parseInt(cutils.jscGetDeepest(bounds.size.width));
							thisWin.height = parseInt(cutils.jscGetDeepest(bounds.size.height));

							thisWin.right = thisWin.left + thisWin.width;
							thisWin.bottom = thisWin.top + thisWin.height;
						}
						
						if (aOptions.macGetWorkspace) {
							var rez_workspace = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowWorkspace'));
							
							var int_workspace = ostypes.API('objc_msgSend')(rez_workspace, ostypes.HELPER.sel('integerValue'));
							int_workspace = ctypes.cast(int_workspace, ostypes.TYPE.NSInteger);

							
							int_workspace = parseInt(cutils.jscGetDeepest(int_workspace));

							thisWin.workspace = int_workspace;
						}
						
						if (aOptions.macGetCgWinId) {
							var rez_cgwinid = ostypes.API('objc_msgSend')(c_win, ostypes.HELPER.sel('objectForKey:'), myNSStrings.get('kCGWindowNumber'));
							
							var int_cgwinid = ostypes.API('objc_msgSend')(rez_cgwinid, ostypes.HELPER.sel('integerValue'));
							int_cgwinid = ctypes.cast(int_cgwinid, ostypes.TYPE.NSInteger);

							
							int_cgwinid = parseInt(cutils.jscGetDeepest(int_cgwinid));

							thisWin.cgwinid = int_cgwinid;
						}
						
						rezWinArr.push(thisWin);
					}
					
					// post analysis
					// 1) remove all windows who have height and width == to Desktop which is that last entry
					// osx has multiple desktop elements, if two mon, then two desktops, i can know number of mon by counting number of "nativeshot_canvas" titled windows
					// and nativeshot_canvas width and height is equal to that of its respective desktop width and height
					var numDesktop = 0;
					var desktopDimWxH = [];
					for (var i=0; i<rezWinArr.length-1; i++) {
						if (rezWinArr[i].title == 'nativeshot_canvas') {
							numDesktop++;
							desktopDimWxH.push(rezWinArr[i].width + ' x ' + rezWinArr[i].height);
						}
					}
					// now splice out all things that have any dimensions matching these EXCEPT the last numMon elements as they will be titled Desktop
					for (var i=rezWinArr.length-numDesktop; i<rezWinArr.length; i++) {
						if (rezWinArr[i].title != 'DesktopAA') {

						}
					}
					for (var i=0; i<rezWinArr.length-numDesktop; i++) {
						if (rezWinArr[i].title == 'nativeshot_canvas') { // need to leave nativeshot_canvas in as mainthread uses it as a pointer position to start from
							continue;
						}
						if (desktopDimWxH.indexOf(rezWinArr[i].width + ' x ' + rezWinArr[i].height) > -1) {

							rezWinArr.splice(i, 1);
							i--;
						}
					}

					// end - post analysis
				} finally {
					ostypes.API('CFRelease')(cfarr_win);
					
					if (myNSStrings) {
						myNSStrings.releaseAll()
					}
				}
			
			break;
		default:

	}
	
	return rezWinArr;
	
}
function getAllPID(aOptions={}) {
	// gets all proccess ids that are currently running
	// RETURNS
		// object, key is pid, and value is an object with a bunch of info, the info varies per os
			// info on different os's
				// Windows
				
				// OSX
				
				// Linux

	// console.time('getAllPID');
	
	var cOptionsDefaults = {
		firefoxOnly: false // setting to true will filter out results, will remove everything that doesnt belong to firefox
	};
	
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	var cProcessIdsInfos = {};

	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				var bufferNtQrySysProcs = ostypes.TYPE.BYTE.array(0)();
				var enumBufSizeNtQrySysProcs = ostypes.TYPE.ULONG(bufferNtQrySysProcs.constructor.size);
				// console.log('sizof(bufferNtQrySysProcs):', bufferNtQrySysProcs.constructor.size);
				
				var rez_ntqrysysprocs;
				while (true) {
					rez_ntqrysysprocs = ostypes.API('NtQuerySystemInformation')(ostypes.CONST.SYSTEMPROCESSINFORMATION, bufferNtQrySysProcs, enumBufSizeNtQrySysProcs, enumBufSizeNtQrySysProcs.address());
					// console.log('rez_ntqrysysprocs:', rez_ntqrysysprocs);
					// console.log('rez_ntqrysysprocs jscGetDeepest:', cutils.jscGetDeepest(rez_ntqrysysprocs));
					// console.log('ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH jscGetDeepest:', cutils.jscGetDeepest(ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH));
					if (cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_BUFFER_TOO_SMALL) || cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH)) {
						// console.log('new buf size:', parseInt(cutils.jscGetDeepest(enumBufSizeNtQrySysProcs)));
						bufferNtQrySysProcs = ostypes.TYPE.BYTE.array(parseInt(cutils.jscGetDeepest(enumBufSizeNtQrySysProcs)))();
						// console.log('increasing bufferNtQrySysProcs size and NtQuery-ing again');
					} else break;
				}
				
				// if (parseInt(cutils.jscGetDeepest(rez_ntqrysysprocs)) < 0) {
				if (!cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_SUCCESS)) {
					console.error('failed to NtQry, getStrOfResult:', ostypes.HELPER.getStrOfResult(parseInt(cutils.jscGetDeepest(rez_ntqrysysprocs))));
					return null;
				}
				
				var cEntryOffset = 0;
				while (true) {
					// console.log('cEntryOffset:', cEntryOffset);
					var cProcessPlatInfoObj = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ostypes.TYPE.SYSTEM_PROCESS_INFORMATION.ptr).contents;

					var filterOutThisEntry = false;
					if (aOptions.firefoxOnly) {
						if (cProcessPlatInfoObj.ImageName.Buffer.isNull() || cProcessPlatInfoObj.ImageName.Buffer.readString() != 'firefox.exe') { // :todo: verify if all Firefox builds are firefox.exe, like if nightly is firefox.exe etc
							filterOutThisEntry = true;
						}
					}
					
					if (!filterOutThisEntry) {
						var pid = cutils.jscGetDeepest(cProcessPlatInfoObj.UniqueProcessId, 10);
						cProcessIdsInfos[pid] = {};
						
						cProcessIdsInfos[pid].createTime = new Date();
						var createTimeInMsSinceEpoch = ((parseInt(cutils.jscGetDeepest(cProcessPlatInfoObj.CreateTime.QuadPart)) - 116444736000000000) / 10000).toFixed();
						cProcessIdsInfos[pid].createTime.setTime(createTimeInMsSinceEpoch);
						cProcessIdsInfos[pid].createTimeStr = cProcessIdsInfos[pid].createTime.toString();
						
						// :debug:
						if (!cProcessPlatInfoObj.ImageName.Buffer.isNull()) {
							cProcessIdsInfos[pid].imageName = cProcessPlatInfoObj.ImageName.Buffer.readString();
						}
						// :debug:
					}
					
					var nextEntryOffset = parseInt(cProcessPlatInfoObj.NextEntryOffset);
					cEntryOffset += nextEntryOffset;
					if (nextEntryOffset == 0) {
						break;
					}
				}

			break;
		case 'gtk':

				//

			break;
		case 'darwin':

				//

			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	// console.timeEnd('getAllPID');
	
	return cProcessIdsInfos;
}
// End - Addon Functionality

// start - common helper functions
function getRelativeDescriptor(ofOsPath, fromOsPath) {
	// requires escapeRegExp
	
	// aim of this function is to provide a worker equivalent for:
		// for: ```new FileUtils.File(OS.Constants.Path.profileDir).getRelativeDescriptor(Services.dirsvc.get('UAppData', Ci.nsIFile))```
		// so now is: ```getRelativeDescriptor(OS.Constants.Path.profileDir, OS.Constants.Path.userApplicationDataDir)```
	
	var pattGlobalFileSperator = new RegExp(escapeRegExp(platformFilePathSeperator()), 'g');
	
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

// var _cache_platformFilePathSeperator;
function platformFilePathSeperator() {
	// if (!_cache_platformFilePathSeperator) {
	// 	_cache_platformFilePathSeperator = OS.Path.join(' ', ' ').replace(/ /g, '');
	// }
	// return _cache_platformFilePathSeperator;
	return OS.Path.join(' ', ' ').replace(/ /g, '');
}

function xhr(aUrlOrFileUri, aOptions={}) {
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);
	
	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
	};
	validateOptionsObj(aOptions, aOptionsDefaults);
	
	var cRequest = new XMLHttpRequest();
	
	cRequest.open(aOptions.method, aUrlOrFileUri, false); // 3rd arg is false for synchronus
	
	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			cRequest.setRequestHeader(h, aOptions.headers[h]);
		}
	}
	
	cRequest.responseType = aOptions.responseType;
	cRequest.send(aOptions.data);
	
	// console.log('response:', cRequest.response);
	
	// console.error('done xhr!!!');
	return cRequest.response;
}

var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aReplacements, aLocalizedPackageName) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string
	
	if (!_cache_formatStringFromName_packages[aLocalizedPackageName]) {
		var packageStr = xhr(core.addon.path.locale + aLocalizedPackageName + '.properties');
		var packageJson = {};
		
		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}
		
		_cache_formatStringFromName_packages[aLocalizedPackageName] = packageJson;
		
		console.log('packageJson:', packageJson);
	}
	
	var cLocalizedStr = _cache_formatStringFromName_packages[aLocalizedPackageName][aKey];
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}
	
	return cLocalizedStr;
}

function mozSaltName(aName) {
	// salt generator from http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js?raw=1*/

	var mozKSaltTable = [
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
		'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
	];

	var kSaltString = '';
	for (var i = 0; i < 8; ++i) {
		kSaltString += mozKSaltTable[Math.floor(Math.random() * mozKSaltTable.length)];
	}
	return kSaltString + '.' + aName;
}

// rev1 - https://gist.github.com/Noitidart/18f314bc508554fe6144
function enumChildEntries(pathToDir, delegate, max_depth, runDelegateOnRoot) {
	// update 061215 0401p - just comments on throwing link10000002551
	// if pathToDir does not exist this will throw on link10000002551
	
	// sync version of https://gist.github.com/Noitidart/0104294ce25386e4788f
	// C:\Users\Vayeate\Pictures\enumChildEntries sync version varviewer.png
	// if delegate returns true, then enumChildEntries returns the entry it ended on
	/* dig techqniue if max_depth 3:
	root > SubDir1
	root > SubDir2
	root > SubDir1 > SubSubDir1
	root > SubDir1 > SubSubDir2
	root > SubDir1 > SubSubDir3
	root > SubDir2 > SubSubDir1
	root > SubDir2 > SubSubDir1 > SubSubSubDir1
	// so it digs deepest into all level X then goes X+1 then goes X+2
		1 "C:\Users\Vayeate\Desktop\p\p in" ProfilistWorker.js:2092:2
		2 "C:\Users\Vayeate\Desktop\p\p in\a0" ProfilistWorker.js:2092:2
		2 "C:\Users\Vayeate\Desktop\p\p in\a1" ProfilistWorker.js:2092:2
		3 "C:\Users\Vayeate\Desktop\p\p in\a0\b" ProfilistWorker.js:2092:2
		3 "C:\Users\Vayeate\Desktop\p\p in\a1\b1" ProfilistWorker.js:2092:2
		4 "C:\Users\Vayeate\Desktop\p\p in\a1\b1\o"
	*/
	var depth = 0;
	// at root pathDir
	if (runDelegateOnRoot) {
		var entry = {
			isDir: true,
			name: OS.Path.basename(pathToDir),
			path: pathToDir
		};
		var rez_delegate = delegate(entry, -1);
		if (rez_delegate) {
			return entry;
		}
	}
	
	if (max_depth === 0) {
		console.log('only wanted to run delegate on root, done');
		return true; // max_depth reached
	}
	
	var subdirs = {}; // key is level int, and val is arr of all entries within
	subdirs[0] = [pathToDir];
	while (true) {
		depth++;
		if (max_depth === null || max_depth === undefined) {
			// go till iterate all
		} else {
			if (depth > max_depth) {
				// finished iterating over all files/dirs at depth of max_depth
				// depth here will be max_depth + 1
				console.log('finished running delegate on all files/dirs up to max_depth of', max_depth, 'depth was:', (depth-1));
				return true;
			}
		}
		subdirs[depth] = []; // holds OSPath's of subdirs
		var sLen = subdirs[depth-1].length;
		if (sLen == 0) {
			return true; // didnt reach max_depth but finished iterating all subdirs
		}
		for (var h=0; h<sLen; h++) {
			try {
				var iterrator = new OS.File.DirectoryIterator(subdirs[depth-1][h]);
				var aVal = iterrator.nextBatch();  // this will throw if path at str doesnt exist, this only happens on pathToDir though, as the rest is on stuff thats found link10000002551 i got this: `message:"Error: Win error 2 during operation DirectoryIterator.prototype.next on file C:\Users\Vayeate\AppData\Roaming\Mozilla\Firefox\profilist_data\launcher_exes (The system cannot find the file specified.)`
			} finally {
				iterrator.close();
			}
			for (var i=0; i<aVal.length; i++) {
				if (aVal[i].isDir) {
					subdirs[depth].push(aVal[i].path);
				}
				var rez_delegate_on_child = delegate(aVal[i], depth);
				if (rez_delegate_on_child) {
					return aVal[i];
				}
			}
		}
		// finished running delegate on all items at this depth and delegate never returned true
	}
}

// rev2 - https://gist.github.com/Noitidart/bf7ebc46f4209468e8c2
function copyDirRecursive(aDirPlatPath, aNewDirParentPlatPath, aOptions={}) {
	// aDirPlatPath is a platform path to a directory you want to copy. Such as "C:\\Users\noi\Desktop\mydir"
	// aNewDirParentPlatPath is the platform path to directory in which aDirPlatPath shold be placed into. IT MUST EXIST. So if you set it to "C:\\Windows". Then the copied dir will be at "C:\\Windows\\mydir"
	// aOptions - see cOptionsDefaults

	// fails if a directory already exists at the new path - link362548787
	// on error throws OSFile.Error
	// if aDirPlatPath does not exist you will get an error like this - Object { operation: "DirectoryIterator.prototype.next", path: "C:\Users\Mercurius\Desktop\rawr\sub", winLastError: 2 }
	
	var cOptionsDefaults = {
		newDirName: null, // a string you want the newly copied dir to be named. default it will use the same name as aDirToCopy
		excludeFiles: null, // array of strings, of filenames that should be excluded, case-sensitive
		depth: null // null or undefined, this is based on enumChildEntries definitions. means it will complete directory contents
	};
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	// in aNewDirParentPlatPath, the folder aDirPlatPath will be copied and "pasted" into
	var dirName = OS.Path.basename(aDirPlatPath);
	var newDirName = aOptions.newDirName ? aOptions.newDirName : dirName;
	var newDirPlatPath = OS.Path.join(aNewDirParentPlatPath, newDirName);
	
	//var aDirParentPlatPath = OS.Path.dirname(aDirPlatPath);
	if (newDirPlatPath == aDirPlatPath) {
		// this tests if devuser did something like this:
			// copyDirRecursive('C:\\Desktop\\rawr', 'C:\\Desktop')
			// copyDirRecursive('C:\\Desktop\\rawr', 'C:\\Desktop', {newDirName:'rawr'})
		throw new OS.File.Error('No operation, but calculated that if it goes forward, the new directory to be made has exact same path as source directory. See `path` key to see the path for the new directory that was to be created.', 0, newDirPlatPath);
	}
	
	try {
		// var rez_makeNewDir =
		OS.File.makeDir(newDirPlatPath, {ignoreExisting:false}); // fail if a directory already exists at platform path for new dir to make link362548787
	} catch (OSFileError) {
		if (OSFileError.becauseNoSuchFile) {
			OSFileError.custom_message = 'you specified that the copied dir be placed in a non-existing parent folder, the path at which it was to be created is seen in `path` key of this error object. the parent folder does not exist at "' + aNewDirParentPlatPath + '"';
			throw OSFileError;
		} else if (OSFileError.becauseExists) {
			OSFileError.custom_message = 'a directory already exists at the path the new dir was to be copied to. the path at which it was to be created is seen in `path` key of this error object.';
			throw OSFileError;
		} else {
			throw OSFileError;
		}
	}

	var delegateCopy = function(aEntry, aDepth) {
		if (aOptions.excludeFiles) {
			if (aOptions.excludeFiles.indexOf(aEntry.name) > -1) {
				return; // skip copying this file as it is in excludeFiles list // return false/undefined to continue recursion
			}
		}
		var entryPlatPath_relativeTo_aDirPlatPath = aEntry.path.substr(aDirPlatPath.length);
		var newEntryPlatPath = newDirPlatPath + entryPlatPath_relativeTo_aDirPlatPath;
		
		if (aEntry.isDir) {
			OS.File.makeDir(newEntryPlatPath);
		} else {
			OS.File.copy(aEntry.path, newEntryPlatPath);
		}
		
		// return false/undefined to continue recursion
	};
	
	enumChildEntries(aDirPlatPath, delegateCopy, aOptions.depth, false); // 4th arg is false, meaning dont run on root
	
	return true;
}
// end - common helper functions