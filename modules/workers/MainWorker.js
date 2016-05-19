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
importScripts(core.addon.path.modules + 'ctypes_math.jsm');
importScripts(core.addon.path.modules + 'commonProfilistFuncs.js');

// Setup PromiseWorker
// SIPWorker - rev9 - https://gist.github.com/Noitidart/92e55a3f7761ed60f14c
var PromiseWorker = require('resource://gre/modules/workers/PromiseWorker.js');

// Instantiate AbstractWorker (see below).
var worker = new PromiseWorker.AbstractWorker()

// worker.dispatch = function(method, args = []) {
worker.dispatch = function(method, args = []) {// start - noit hook to allow PromiseWorker methods to return promises
  // Dispatch a call to method `method` with args `args`
  // start - noit hook to allow PromiseWorker methods to return promises
  // return self[method](...args);
  console.log('dispatch args:', args);
  var earlierResult = gEarlyDispatchResults[args[0]]; // i change args[0] to data.id
  delete gEarlyDispatchResults[args[0]];
  if (Array.isArray(earlierResult) && earlierResult[0] == 'noit::throw::') {
	  console.error('ok need to throw but i want to ensure .constructor.name is in promiseworker.js"s EXCEPTION_NAMES, it is:', earlierResult[1].constructor.name);
	  throw earlierResult[1];
  }
  return earlierResult;
  // end - noit hook to allow PromiseWorker methods to return promises
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
var gEarlyDispatchResults = {};
self.addEventListener('message', function(aMsgEvent) { // this is what you do if you want SIPWorker mainthread calling ability
	var aMsgEventData = aMsgEvent.data;
	if (Array.isArray(aMsgEventData)) {
		// console.log('worker got response for main thread calling SIPWorker functionality:', aMsgEventData)
		var funcName = aMsgEventData.shift();
		if (funcName in WORKER) {
			var rez_worker_call = WORKER[funcName].apply(null, aMsgEventData);
		}
		else { console.error('funcName', funcName, 'not in scope of WORKER') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
	} else {
		// console.log('no this is just regular promise worker message');
		var earlyDispatchErr;
		var earlyDispatchRes;
		try {
			earlyDispatchRes = self[aMsgEvent.data.fun](...aMsgEvent.data.args);
			console.error('earlyDispatchRes:', earlyDispatchRes);
		} catch(earlyDispatchErr) {
			earlyDispatchRes = ['noit::throw::', earlyDispatchErr];
			console.error('error in earlyDispatchRes:', earlyDispatchErr);
			// throw new Error('blah');
		}
		aMsgEvent.data.args.splice(0, 0, aMsgEvent.data.id)
		if (earlyDispatchRes && earlyDispatchRes.constructor.name == 'Promise') { // as earlyDispatchRes may be undefined
			console.log('in earlyDispatchRes as promise block');
			earlyDispatchRes.then(
				function(aVal) {
					console.log('earlyDispatchRes resolved:', aVal);
					gEarlyDispatchResults[aMsgEvent.data.id] = aVal;
					worker.handleMessage(aMsgEvent);
				},
				function(aReason) {
					console.warn('earlyDispatchRes rejected:', aReason);
				}
			).catch(
				function(aCatch) {
					console.error('earlyDispatchRes caught:', aCatch);
					gEarlyDispatchResults[aMsgEvent.data.id] = ['noit::throw::', aCatch];
					console.error('aCatch:', aCatch);
				}
			);
		} else {
			console.log('not a promise so setting it to gEarlyDispatchResults, it is:', earlyDispatchRes);
			if (earlyDispatchRes) {
				console.log('not undefined or null so constructor is:', earlyDispatchRes.constructor.name);
			}
			gEarlyDispatchResults[aMsgEvent.data.id] = earlyDispatchRes;
			worker.handleMessage(aMsgEvent);
		}
	}
});

const SIP_CB_PREFIX = '_a_gen_cb_';
const SIP_TRANS_WORD = '_a_gen_trans_';
var sip_last_cb_id = -1;
self.postMessageWithCallback = function(aPostMessageArr, aCB, aPostMessageTransferList) {
	var aFuncExecScope = WORKER;
	
	sip_last_cb_id++;
	var thisCallbackId = SIP_CB_PREFIX + sip_last_cb_id;
	aFuncExecScope[thisCallbackId] = function(aResponseArgsArr) {
		delete aFuncExecScope[thisCallbackId];
		console.log('in worker callback trigger wrap, will apply aCB with these arguments:', aResponseArgsArr);
		aCB.apply(null, aResponseArgsArr);
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
	core.os.filesystem_seperator = platformFilePathSeperator();
	
	// load all localization pacakages
	formatStringFromName('blah', 'bootstrap');
	formatStringFromName('blah', 'browseicon');
	formatStringFromName('blah', 'cp');
	formatStringFromName('blah', 'html');
	formatStringFromName('blah', 'iconsetpicker');
	formatStringFromName('blah', 'mainworker');
	core.addon.l10n = _cache_formatStringFromName_packages;
	
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
		case 'winnt':
		case 'winmo':
		case 'wince':
				
				OSStuff.windowLastSet_ExeIconPath = undefined;
				OSStuff.windowShouldBe_ExeIconPath = undefined;
				
			break;
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
	
	// if need the icon, then lets make sures existing - this must go after readIni as that does formatNoWriteObjs
	if ('windowShouldBe_ExeIconPath' in OSStuff) {
		// if its in OSStuff then this means needCurProfIconToBeEnsuredExisting AND it needs windowShouldBe_ExeIconPath set
		
		var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
		var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
		
		var cBadgeLoc = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBadgeLoc');
		var cIconInfosObj = getIconPathInfosForParamsFromIni(core.profilist.path.XREExeF, core.firefox.channel, gCurProfIniEntry.ProfilistBadge, cBadgeLoc);
		
		OSStuff.windowShouldBe_ExeIconPath = cIconInfosObj.path;
		console.log('OSStuff.windowShouldBe_ExeIconPath:', OSStuff.windowShouldBe_ExeIconPath);
		
		var deferred_ensureIconMade = new Deferred();
		
		var promise_createIcon = createIconForParamsFromFS(cIconInfosObj, cBadgeLoc);
		promise_createIcon.then(
			function(aVal) {
				console.log('Fullfilled - promise_createIcon - ', aVal);
				console.log('MainWorker init success');
				deferred_ensureIconMade.resolve(core);
			},
			genericReject.bind(null, 'promise_createIcon', 0)
		).catch(genericCatch.bind(null, 'promise_createIcon', 0));
		
		return deferred_ensureIconMade.promise;
	} else {
		console.log('MainWorker init success');
		return core; // required for SIPWorker
	}
}

function afterBootstrapInit() {
	// OS Specific Init
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				
				var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);

				// figure out if the taskbar.grouping.useprofile pref should be set to true or false
				var groupPrefShouldBe;
				if (gCurProfIniEntry.Default === '1') {
					groupPrefShouldBe = false;
				} else {
					groupPrefShouldBe = true;
				}
				OSStuff.groupPrefShouldBe = groupPrefShouldBe;
				
				// check if the group pref that was there on startup is what "should be" was calculated to be
				var groupPrefStartup = core.firefox.prefs['taskbar.grouping.useprofile'];
				OSStuff.groupPrefStartup = groupPrefStartup;
				if (groupPrefStartup != groupPrefShouldBe) {
					self.postMessage(['setPref', 'taskbar.grouping.useprofile', groupPrefShouldBe]);
					core.firefox.prefs['taskbar.grouping.useprofile'] = groupPrefShouldBe; // as currently mainthread does not update prefs in the worker, or even in the core. but its not important
				}
				
				// determeine what the window listener - that will be setup by registerWorkerWindowListener - should do
					// if groupPrefShouldBe is false, then that means this is the default profile
				
				// :debug: i commented this block out for now, stilling thinking through window logic
				// // this goes here, and not in init, because readIni has to run first, so i can get gCurProfIniEntry
				// // check if should toggle taskbar.grouping.useprofile pref - this should be done "on set of default profile" - but i have to do it here as well as its startup
				// var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
				// if (gCurProfIniEntry.Default === '1') {
				// 	// current profile IS default
				// 	if (core.firefox.prefs['taskbar.grouping.useprofile']) {
				// 		// need to set it to false, but do not update `core.firefox.prefs['taskbar.grouping.useprofile']` because the new value doesn't take affect till restart
				// 		console.log('setPref to false');
				// 		self.postMessage(['setPref', 'taskbar.grouping.useprofile', false]);
				// 	}
				// } else {
				// 	// current profile is NOT default
				// 	if (!core.firefox.prefs['taskbar.grouping.useprofile']) {
				// 		// need to set it to true, but do not update `core.firefox.prefs['taskbar.grouping.useprofile']` because the new value doesn't take affect till restart
				// 		console.log('setPref to true');
				// 		self.postMessage(['setPref', 'taskbar.grouping.useprofile', true]);
				// 	}
				// }
				
				// start the window listener, needs to just go after readIni - but i like it here after the "taskbar.grouping.useprofile" stuff
				self.postMessage(['registerWorkerWindowListener']);
				
			break;
		case 'gtk':
			
				// if not unity de, then set up window listener, else dont, for now am setting it up
				self.postMessage(['registerWorkerWindowListener']);
			
			break;
		case 'darwin':
				
				console.log('no need for postInit on mac');
				
			break;
		default:
			// do nothing special
	}
	
	console.log('ok compelted post init');
}

// Start - Addon Functionality

/*
### OSStuff breakdown
### Windows
* last_iconSlug_appliedToWindows - the last iconSlug (meaning with badge on base) that was applied

*/

function prepForTerminate() {
	return 'ok ready to terminate';
}

function testConnInit() {
	setInterval(function() {
		self.postMessage(['testConnUpdate', (new Date()).toLocaleString() + ' -- ' + (new Date()).getTime()])
	}, 1000);
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
	ProfilistBadge: {			// imgSlug - not iconSlug
		pref: false,
		specificOnly: true
	},
	ProfilistBadgeLoc: {
		pref: true,
		// unspecificOnly: true,
		specificOnly: false,
		defaultSpecificness: false,
		defaultValue: '3',
		possibleValues: [
			'1',				// top left
			'2',				// top right
			'3',				// bottom left
			'4'					// bottom right
		]
	},
	ProfilistTie: {			// slug_of_icon_in_icons_folder
		pref: false,
		specificOnly: true
		// value should be id of something in the ProfilistBuilds.
	},
	// link33223361217 - for actual funcitonality of ProfilistTemp
	ProfilistTemp: {			// if profilist installed into, its same, treated as a temp profile
		pref: true,
		unspecificOnly: true,	// because if doesnt make sense if profile A has it set to 1, and profile B has it set to 0. if profile A worker builds the gIniObj, then it will delete it, but if profile B builds it then it wont delete it. so thats why this is unspecificOnly
		// defaultValue: '0',
		defaultValue: '1',
		possibleValues: [
			'0',				// do not keep them in ini, after it is found to be not running. ALSO do not show them in menu if they are not running.
			'1'					// keep them in ini even after it is found to be not running. BUT the folder must exist, if the folder doesnt exist then it is removed from ini. ALSO show them in the menu even when not running.
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
	
	// console.log('rez_read:', rez_read);
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
		// console.log('matchIniBlock:', matchIniBlock);
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
	// if (!foundCurrentProfile || (foundCurrentProfile && curProfIniEntry.groupName.indexOf('TempProfile') === 0)) {
		// its a temp profile
		if (!curProfIniEntry) {
			// create new ini entry for this profile, to match the level of formatting a ini entry should have up to this point in formatNoWriteObjs
			curProfIniEntry = {
				groupName: 'TempProfile' + getNextProfNum(gIniObj),
				Name: OS.Path.basename(curProfRt),
				IsRelative: curProf_isRelative ? '1' : '0',
				Path: curProf_isRelative ? curProf_relativeDescriptor : curProfRt,
				noWriteObj: {
					currentProfile: true
				}
			};
			gIniObj.push(curProfIniEntry);
		}
	// }

	// go through and note in noWriteObj if its a temporary profile
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].groupName.indexOf('TempProfile') === 0) {
			gIniObj[i].noWriteObj.temporaryProfile = true;
		}
	}
	
	// fetch all pid - needed for windows to "set running statusses" - and needed for all platforms to adoptOrphanTempProfs
	console.log('will now fetch fxOnlyPidInfos');
	var fxOnlyPidInfos = getAllPID({firefoxOnly:true});
	console.log('got fxOnlyPidInfos:', fxOnlyPidInfos);
	
	// set running statuses
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			gIniObj[i].noWriteObj.status = getIsRunningFromIniFromPlat(gIniObj[i].Path, {
				winProcessIdsInfos: (['winnt', 'wince', 'winmo'].indexOf(core.os.mname) == -1 ? undefined : fxOnlyPidInfos)
			});
		}
	}
	
	// adopt any orphan profiles - which are temp profs obviously - :important: :note: i have to do this AFTER the running statuses of the profiles in the ini are set && BEFORE the exeIconSlug stuff below. because the formatting in adoptOrphanTempProfs is not done throughly, it just adds a noWriteObj with status. which is ok as everything above this line in formatNoWriteObjs is all the formatting done by adoptOrphanTempProfs (set if its temp profile, and set running status). the remaining important part is setting exeIconSlug and populating imgSrcObj_nearest16_forImgSlug etc as its running and the code below this line in the remaining of this function will take care of that  - actually this is a big big big reason why the level of formatting done by adoptOrphanTempProfs is enough link18384394949050
	console.log('will now try adopting orphans');
	var cntTempProfsAdopted = adoptOrphanTempProfs({
		dontWriteIni: true,
		processIdsInfos: fxOnlyPidInfos
	});
	console.log('done adopting orphans');
	
	// get gGenIniEntry
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General'); // not really global. i usually use g prefix on real global vars. but here im just using it to idicate that the general etnry if from gIniObj
	
	// set global var telling if dev mode is on or off
	var keyValDev = getPrefLikeValForKeyInIniEntry(curProfIniEntry, gGenIniEntry, 'ProfilistDev');
	gJProfilistDev = keyValDev === '1' ? true : false;
	console.error('gJProfilistDev:', gJProfilistDev);

	// figure out doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning - for use in next block where temporaryProfile's are deleted from the ini
	var doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning = false;
	var generalKeyValTemp = gGenIniEntry.ProfilistTemp === undefined ? gKeyInfoStore.ProfilistTemp.defaultValue : gGenIniEntry.ProfilistTemp;
	var generalKeyValDev = gGenIniEntry.ProfilistDev === undefined ? gKeyInfoStore.ProfilistDev.defaultValue : gGenIniEntry.ProfilistDev;
	console.log('generalKeyValTemp:', generalKeyValTemp, 'generalKeyValDev:', generalKeyValDev);
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			if ((!('ProfilistDev' in gIniObj[i]) && generalKeyValDev === '1') || gIniObj[i].ProfilistDev === '1') {
				console.log('gIniObj entry path:', gIniObj[i], 'has dev mode enabled');
				if ((!('ProfilistTemp' in gIniObj[i]) && generalKeyValTemp === '1') || gIniObj[i].ProfilistTemp === '1') {
					console.log('gIniObj entry path:', gIniObj[i], 'has persist temp profiles enabled');
					doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning = true;
					break;
				}
			}
		}
	}
	console.error('doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning:', doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning);
	
	// check if any of the temporaryProfile are no longer running. if they are no longer running, check if its profile folder exists, if it doesnt, then delete it from ini.
		// this block needs to go after setting all running statuses
		// ACTUALLY NEVER MIND THIS COMMENT TO THE RIGHT because the profile dir is only looked into if the profile is running, which means the profile dir has to exist see link33325356464644387 -------> :important: reason for placing this before the ```IF dev mode is enabled in currentProfile THEN do the appropriate stuff``` block below - i want to do this block before i get exeIconSlug because that needs to check for channel and exePath, which needs to read inside the profile directory, AND SO if profile directory doesnt exist, then its not going to be able to find channel and will error. the channel is checked on link11119831811
	var cntTempProfsRemoved = 0;
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path && gIniObj[i].noWriteObj.temporaryProfile && !gIniObj[i].noWriteObj.status) {
			// its a temporary profile that is not running
			// :todo: this is wrong, if gJProfilistDev in this profile, it will delete it. but what if another profile has it enabled. so i should leave it in but hide it for non-dev profiles enabled
			var cTempProfRootDirExists = OS.File.exists(getFullPathToProfileDirFromIni(gIniObj[i].Path));
			console.log('temp prof root dir of ("', getFullPathToProfileDirFromIni(gIniObj[i].Path), '") exists?:', cTempProfRootDirExists);
			if (!cTempProfRootDirExists || !doesAnyOtherProfile_haveDevModeOn_andAsksForPresistNonRunning) { // link9344656561
				// not a single one of this users profiles (all of them were checked) is (in dev mode && asking for persist of non-running profiles) SO delete non-running temp profiles EVEN IF the profile directory exists
				// OR profile directory doesnt exist
				console.log('temporary profile of:', gIniObj[i], ' needs to be deleted from ini, because either 1) dev mode is off 2) dev mode is on and user said to not persist profiles 3) or the profile dir doesnt exist');
				gIniObj.splice(i, 1);
				i--;
				cntTempProfsRemoved++;
			}
		}
	}
	
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
				gIniObj[i].noWriteObj.exePath = getLastExePathForProfFromFS(gIniObj[i].Path); // link33325356464644387 // will never return null here, as for sure at this point the profile is running as noWriteObj.status is not !
				console.log(gIniObj[i].Name, 'exePath:', gIniObj[i].noWriteObj.exePath);
				var cExePathChan = getExeChanForParamsFromFSFromCache(gIniObj[i].noWriteObj.exePath); // link11119831811
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
	
	// I COMMENTED THIS OUT BECAUSE if another profile updates this current profile, that profile should communicate with this instance as it has profilist installed and tell it to trigger this. rather then i check every time on formatNoWriteObjs, its not right it messes up logic, im thinking
	// switch (core.os.mname) {
	// 	case 'winnt':
	// 	// case 'gtk':
	// 	
	// 			// update OSStuff.windowShouldBe_ExeIconPath for this current profile
	// 			OSStuff.windowShouldBe_ExeIconPath = getIconPathInfosForParamsFromIni(core.profilist.path.XREExeF, core.firefox.channel, curProfIniEntry.ProfilistBadge, getPrefLikeValForKeyInIniEntry(curProfIniEntry, gGenIniEntry, 'ProfilistBadgeLoc'));
	// 			if (OSStuff.windowLastSet_ExeIconPath !== undefined) { // if its undefined then that means this is the formatNoWriteObjs run due to the readIni on bootstrap `startup`. so the `init` function will take care of `reUpdateIntoAllWindows` which will actually not an update, but first time into windows. but `init` will first ensure the icon is set
	// 				if (OSStuff.windowLastSet_ExeIconPath != OSStuff.windowShouldBe_ExeIconPath) {
	// 					// reUpdateIntoAllWindows on all windows
	// 				}
	// 			}
	// 			
	// 		break;
	// 	default:
	// 		// do nothing
	// }
	
	// figure out if need to touch ini for currentProfile, and if have to, then touch it, then write it to ini and inibkp
	if (!('ProfilistStatus' in curProfIniEntry) || curProfIniEntry.ProfilistStatus !== '1') { // INIOBJ_RULE#3 // even though i store as string, i am doing ```key in``` check instead of !curProfIniEntry.ProfilistStatus - just in case somehow in future ProfilistStatus = "0" gets parsed as int, it should never though
		// need to touch
		curProfIniEntry.ProfilistStatus = '1';
		writeIni();
	} else {
		// any other reasons to write to ini?
		if (cntTempProfsAdopted || cntTempProfsRemoved) {
			writeIni();
		}
	}
}

function writeIni() {
	// write gIniObj to core.profilist.path.ini && core.profilist.path.inibkp
	// :note: :important: things in noWriteObj are not strings, and even if they are, it doesnt get written
	
	var writeStrArr = [];
	
	var thisProfileGroupNum = 0;
	for (var i=0; i<gIniObj.length; i++) {
		var indexOfProfile = gIniObj[i].groupName.indexOf('Profile');
		if (indexOfProfile === 0 /* std profile group */ || indexOfProfile == 4 /* temp profile */) {
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

function fetchJustIniObjJustRefreshed() {
	// goes through gIniObj and checks the status for each profile. if any of them have a changed status, then it will return gIniObj. if none of them have changed it returns null
	
	// link1999937887877777 main goal of this, is to just look for things that shutdown. as shutdown is not immediate. so this is why I dont call formatNoWriteObjs if anything changed
	
	// var fxOnlyPidInfos = getAllPID({firefoxOnly:true});
	
	var anyStatusChanged = false;
	
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path && gIniObj[i].noWriteObj.status) {
			console.log(gIniObj[i].Name, 'was running, so check now to see if it is no longer running');
			var cStatus = getIsRunningFromIniFromPlat(gIniObj[i].Path, {
				// winProcessIdsInfos: (['winnt', 'wince', 'winmo'].indexOf(core.os.mname) == -1 ? undefined : fxOnlyPidInfos)
			});
			
			// link1999937887877777 i am only looking for things that shutdown. if something new started up, i dont care, user will have to lose focus and refocus the tab or something. but i dont do it because else ill have to run formatNoWriteObjs
				// link1999937887877777 for this reason I also do not run adoptOrphanTempProfs in here
			
			if (!cStatus) {
				anyStatusChanged = true;
				console.log('FOUND THAT IT IS NO LONGER RUNNING');
				gIniObj[i].noWriteObj.status = 0;
				delete gIniObj[i].noWriteObj.exePath;
				delete gIniObj[i].noWriteObj.exeIconSlug;
				
				if (gIniObj[i].noWriteObj.temporaryProfile) {
					// if its a temp prof, make sure the dir exists, if it doesnt then remove it from ini
					var cTempProfRootDirExists = OS.File.exists(getFullPathToProfileDirFromIni(gIniObj[i].Path));
					if (!cTempProfRootDirExists) {
						console.log('was temp profile and the dir no longer exists, so remove it, path to root prof dir:', getFullPathToProfileDirFromIni(gIniObj[i].Path));
						gIniObj.splice(i, 1);
						i--;
					}
				}
			}
		}
	}
	
	return (anyStatusChanged ? gIniObj : undefined);
}

function userManipulatedIniObj_updateIniFile(aNewIniObjStr) {
	gIniObj = JSON.parse(aNewIniObjStr);
	formatNoWriteObjs();
	
	writeIni();
	
	return JSON.stringify(gIniObj);
}

// start - profilist helper functions FOR WORKER ONLY
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
// end - profilist helper functions FOR WORKER ONLY

// START - COMMON PROFILIST HELPER FUNCTIONS
// start - xIniObj helper functions
// start - xIniObj functions with no options
var gCache_getImgSrcsForImgSlug = {}; // used to store paths for custom slugs, until this is invalidated
function invalidateCache_getImgSrcsFormImgSlug(aImgSlug) {
	delete gCache_getImgSrcsForImgSlug[aImgSlug];
}
function getImgSrcsForImgSlug(aImgSlug) {
	// returns an imgObj, which is key being the size, of all the strings you would put in <img src="HEREEEE" /> for all available sizes for this aImgSlug
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
					var cImgDirPath = OS.Path.join(core.profilist.path.images, aImgSlug);
					
					// :note: each entry MUST be in format OS.Path.join(core.profilist.path.images, aImgSlug, aImgSlug + '_##.ext'); where ## is size here!! ext can be png gif jpeg jpg svg etc etc
					
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
							
							rezObj[cImgSize] = OS.Path.toFileURI(aEntry.path);
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
function addBuild(aImgSlug, aExePath, aBool_doNotPostProcess) {
	// adds a new build t ProfilistBuilds and saves/reformats ini
	// aBool_doNotPostProcess is for use when dev will handle formating ini obj (if needed) and writing to ini, this is done only in one case right now, which is in mainworker in saveTieForProf
	
	// RETURN
		// if !aBool_doNotPostProcess THEN array with one element, holding gIniObj, as the only reason for this as a response to callInPromiseWorker
		// if true for aBool_doNotPostProcess THEN a copy of the entry added
	
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
	
	
	var maxBuildId = 0; // 0 means minimum id is 1. should this be so? cross file link38817716352
	for (var i=0; i<j_gProfilistBuilds.length; i++) {
		if (j_gProfilistBuilds[i].id > maxBuildId) {
			maxBuildId = j_gProfilistBuilds[i].id;
		}
		if (j_gProfilistBuilds[i].p == aExePath) {
			console.error('this aExePath is already in ProfilistBuilds');
			// throw new Error('this aExePath is already in ProfilistBuilds');
			return [gIniObj];
		}
	}
	console.error('maxBuildIdmaxBuildIdmaxBuildIdmaxBuildIdmaxBuildId:', maxBuildId);
	j_gProfilistBuilds.push({
		id: maxBuildId + 1,
		i: aImgSlug,
		p: aExePath
	});
	
	var new_gProfilistBuilds = JSON.stringify(j_gProfilistBuilds);
	
	setPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds', new_gProfilistBuilds);
	
	if (!aBool_doNotPostProcess) {
		formatNoWriteObjs();
		
		writeIni();
		
		return [gIniObj];
	} else {
		return j_gProfilistBuilds[j_gProfilistBuilds.length - 1];
	}
}
function removeBuild(aBuildId, aBool_doNotPostProcess) {
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
	
	// remove anything that is tied to this build from ini
	var aBuildIdStr = aBuildId + '';
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			// its a prof type
			if (gIniObj[i].ProfilistTie && gIniObj[i].ProfilistTie == aBuildIdStr) {
				delete gIniObj[i].ProfilistTie;
			}
		}
	}
	
	for (var i=0; i<j_gProfilistBuilds.length; i++) {
		if (j_gProfilistBuilds[i].id == aBuildId) {
			j_gProfilistBuilds.splice(i, 1);
	
			var new_gProfilistBuilds = JSON.stringify(j_gProfilistBuilds);
			
			setPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds', new_gProfilistBuilds);
			
			if (!aBool_doNotPostProcess) {
				formatNoWriteObjs();
				
				writeIni();
			}
			break;
		}
	}
	
	return [gIniObj];
}
function replaceBuildEntry(aBuildId, aNewBuildEntry) {
	// aBuildId - number 
	// aNewBuildEntry - js object of what the new entry should be
	// returns an array hold ref to new gIniObj
	
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
	
	for (var i=0; i<j_gProfilistBuilds.length; i++) {
		if (j_gProfilistBuilds[i].id == aBuildId) {
			
			j_gProfilistBuilds[i] = aNewBuildEntry;
			var new_gProfilistBuilds = JSON.stringify(j_gProfilistBuilds);
			
			setPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds', new_gProfilistBuilds);
			
			formatNoWriteObjs();
			
			writeIni();
			break;
		}
	}
	
	return [gIniObj];
}

function replaceBadgeForProf(aProfPath, aNewBadge) {
	// aNewBadge - string which is new imgSlug to apply, or null/undefined t oremove it
	var cIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	
	var needToUpdate = false;
	
	if (aNewBadge) {
		if (!cIniEntry.ProfilistBadge || cIniEntry.ProfilistBadge != aNewBadge) {
			cIniEntry.ProfilistBadge = aNewBadge;
			needToUpdate = true;
		}
	} else {
		if (cIniEntry.ProfilistBadge) {
			delete cIniEntry.ProfilistBadge;
			needToUpdate = true;
		}
	}
	
	if (needToUpdate) {
		formatNoWriteObjs(); // have to do this so it brings in the imgSrcObj_nearest16_forImgSlug for the new one
		writeIni();
		return gIniObj;
	} else {
		return null;
	}
}

function saveTieForProf(aProfPath, aNewTieId) {
	
	var gIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
	
	var aNewProfilistTie;
	if (aNewTieId == -2) {
		aNewProfilistTie = undefined;
	} else if (aNewTieId == -1) {
		var curProfBuildsEntry = getBuildEntryByKeyValue(j_gProfilistBuilds, 'p', gCurProfIniEntry.noWriteObj.exePath);
		if (!curProfBuildsEntry) {
			// curProfBuildsEntry is null meaning its not in jProfilistBuilds so we have to insert one
			aNewProfilistTie = addBuild(gCurProfIniEntry.noWriteObj.exeIconSlug, gCurProfIniEntry.noWriteObj.exePath, true).id + '';
		} else {
			aNewProfilistTie = curProfBuildsEntry.id + '';
		}
	} else {
		aNewProfilistTie = aNewTieId + '';
	}
	
	// aNewProfilistTie must be a string OR undefined
	
	if (gIniEntry.ProfilistTie !== aNewProfilistTie) {
		
		if (aNewProfilistTie === undefined) {
			delete gIniEntry.ProfilistTie;
		} else {
			gIniEntry.ProfilistTie = aNewProfilistTie;
		}
		
		// formatNoWriteObjs(); // no need for this (even if had to addBuild on current build to ProfilistBuilds), because the icon info is already in imgSrcObj_nearest16_forImgSlug
		
		writeIni();
		
		return gIniObj;
	} else {
		return null;
	}
	
	
}
// end - xIniObj functions with no options
// END - COMMON PROFILIST HELPER FUNCTIONS

// Start - Launching profile and other profile functionality
function getIsRunningFromIniFromPlat(aProfPath, aOptions={}) {
	// does not update ini
	// RETURNS
		// 1 or pid (number) - if running - on windows it just returns 1, on nix/mac this returns the pid if its running. ON windows, if run this on the self profile, it will give you the pid.
		// 0 - if NOT running
	// currentProfile must be marked in gIniObj before using this

	var cOptionsDefaults = {
		winProcessIdsInfos: undefined // provide thte return value from getAllPID, it needs to have creation time of the pid in here. then this function will return the pid for windows as well
	};
	// :todo: for profilist purposes winProcessIdsInfos is REQUIRED, its not an option if windows. make it throw if it isnt submitted
	
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
	
	console.time('getIsRunningFromIniFromPlat');
	
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
						console.error('getIsRunningFromIniFromPlat', {msg: 'Could not open profile lock file and it was NOT locked. Path of lock file: "' + cParentLockPath + '"',OSFileError: OSFileError});
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
					cIsRunning = parseInt(closestPidInfo.pid);
				}

			break;
		case 'gtk':
		case 'darwin':

				var cParentLockPath = OS.Path.join(cProfRootDir, '.parentlock');
				console.log('cParentLockPath:', cParentLockPath);
				
				var rez_lockFd = ostypes.API('open')(cParentLockPath, OS.Constants.libc.O_RDWR); //setting this to O_RDWR fixes errno of 9 on fcntl
				console.log('rez_lockFd:', rez_lockFd);
				if (cutils.jscEqual(rez_lockFd, -1)) {
					// failed to open
					if (ctypes.errno == OS.Constants.libc.ENOENT) {
						// file doesnt exist. so obviously not running. maybe profile hasnt been made yet.
						cIsRunning = 0;
					} else {
						console.error('should never get here - getIsRunningFromIniFromPlat -> ostypes.api.open', {msg: 'failed to open cParentLockPath: "' + cParentLockPath + '"',errno: ctypes.errno});
						throw new MainWorkerError('getIsRunningFromIniFromPlat -> ostypes.api.open', {
							msg: 'failed to open cParentLockPath: "' + cParentLockPath + '"',
							errno: ctypes.errno
						});
					}
				}
				
				var closeLockFd = function() {
					if (!cutils.jscEqual(rez_lockFd, -1)) {
						console.info('CLOSING LOCKFD');
						var rez_closeLockFd = ostypes.API('close')(rez_lockFd);
						console.log('rez_closeLockFd:', rez_closeLockFd);
						if (!cutils.jscEqual(rez_closeLockFd, 0)) {
							// failed to close
							throw new MainWorkerError('getIsRunningFromIniFromPlat -> ostypes.api.close', {
								msg: 'failed to close cParentLockPath: "' + cParentLockPath + '"',
								errno: ctypes.errno
							});
						}
					} else {
						console.info('NO NEED TO CLOSE LOCKFD');
					}
				};
				
				if (cIsRunning !== 0) {
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
						closeLockFd();
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
				} else {
					closeLockFd();
				}

			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	// :note: maybe verify or something - there seems to be some platform called vms, but i cant find such an os for virtualmachine - http://mxr.mozilla.org/mozilla-release/source/profile/dirserviceprovider/src/nsProfileLock.cpp#581
	
	console.timeEnd('getIsRunningFromIniFromPlat');
	return cIsRunning;
}
function getLastExePathForProfFromFS(aProfPath) {
	// the difference between this function and ```getCalcdExePathForProfFromIniFromFS``` is explained on link883939272722
	// RETURNS
		// string or null - the last exePath its compatibility.ini was updated to. :note: :assume: i tested awhile back, that the compaitiblity.ini stores the last exePath-like path in there right away on startup :todo: verify this again // :todo: verify - if profile is running, the path in compaitiblity.ini should be the exePath it is running in right now
		// 		if could not open compat.ini for any reason it returns `null` meaning it was never launched in any exePath
		
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

	try {
		var rez_readCompatIni = OS.File.read(cProfCompatIniPath, {encoding:'utf-8'}); // ACTUALLY NEVER MIND THIS COMMENT TO RIGHT WHICH IS TODO becasue link33325356464644387 is the only place it checks this, and it only gets here if the profile is running ----> :todo: :important: if the profile was never launched yet, it has no last exePath so use what it is tied to (if dev mode is on) else use what the currentProfile ini entries build is
	} catch(OSFileError) {
		console.error('failed to read compat.ini because it probably doesnt exist, so returning null', 'OSFileError:', OSFileError, 'OSFileError.becauseNoSuchFile:', OSFileError.becauseNoSuchFile, 'OSFileError.becauseExists:', OSFileError.becauseExists, 'OSFileError.becauseClosed:', OSFileError.becauseClosed, 'OSFileError.unixErrno:', OSFileError.unixErrno, 'OSFileError.winLastError:', OSFileError.winLastError, '');
		return null;
	}
	
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
function getIconPathInfosForParamsFromIni(aExePath, aExeChannel, aBadgeIconSlug, aBadgeLocation) {
	// :note: this does not do running check, it just returns the icon path based on what is in in gIniObj
	// returns object
	//	{
	//		base: {
	//			slug: '' // same thing as dirName, this is imgSlug
	//			DEPRECATED--dir: '' path to directory holding images of different sizes. no ending slash
	//			DEPRECATED--prefix: '' full path to the image without the ##.png
	//			DEPRECATED--chrome: isSlugInChromeChannelIconsets
	//		},
	//		badge: { // is not set if no aBadgeIconSlug
	//			same keys as base
	//		},
	//		path: 'string to file system path.png', on linux this is same as name
	//		name: the stuff before the .png safedForPlatFS
	//		slug: the stuff before the .png NOT safedForPlatFS this is iconSlug
	//	}
	
	var iconInfosObj = {}; // short for iconInfoObj	
	
	iconInfosObj.base = {};
	iconInfosObj.base.slug = getSlugForExePathFromParams(aExePath, gJProfilistDev, gJProfilistBuilds, aExeChannel);
	
	// if (isSlugInChromeChannelIconsets(iconInfosObj.base.slug)) {
		// iconInfosObj.base.chrome = true;
		// iconInfosObj.base.dir = core.addon.path.images + 'channel-iconsets/' + iconInfosObj.base.slug;
		// iconInfosObj.base.prefix = iconInfosObj.base.dir + '/' + iconInfosObj.base.slug + '_';
	// } else {
		// iconInfosObj.base.dir = OS.Path.join(core.profilist.path.images, iconInfosObj.base.slug);
		// iconInfosObj.base.prefix = OS.Path.join(iconInfosObj.base.dir, iconInfosObj.base.slug + '_');
	// }
		
	
	iconInfosObj.slug = iconInfosObj.base.slug;
	
	if (aBadgeIconSlug) {
		iconInfosObj.badge = {};
		iconInfosObj.badge.slug = aBadgeIconSlug;
		// if (isSlugInChromeChannelIconsets(aBadgeIconSlug)) {
			// iconInfosObj.badge.chrome = true;
			// iconInfosObj.badge.dir = core.addon.path.images + 'channel-iconsets/' + iconInfosObj.badge.slug;
			// iconInfosObj.badge.prefix = iconInfosObj.badge.dir + '/' + iconInfosObj.badge.slug + '_';
		// } else {
			// iconInfosObj.badge.dir = OS.Path.join(core.profilist.path.images, iconInfosObj.badge.slug);
			// iconInfosObj.badge.prefix = OS.Path.join(iconInfosObj.badge.dir, iconInfosObj.badge.slug + '_');
		// }
		iconInfosObj.slug += '__' + iconInfosObj.badge.slug + '-';
		
		// i spell right as rite as it matches len of left. for no special reason right now
		if (typeof(aBadgeLocation) == 'string') {
			aBadgeLocation = parseInt(aBadgeLocation);
		}
		
		switch (aBadgeLocation) {
			case 1:
					
					iconInfosObj.slug += 'topleft';
					
				break;
			case 2:
					
					iconInfosObj.slug += 'toprite';
					
				break;
			case 3:
					
					iconInfosObj.slug += 'botleft';
					
				break;
			case 4:
					
					iconInfosObj.slug += 'botrite';
					
				break;
			default:
				console.error('invalid aBadgeLocation:', aBadgeLocation);
				throw new Error('invalid aBadgeLocation');
		}
	}
	
	iconInfosObj.name = safedForPlatFS(iconInfosObj.slug);
	// set iconInfosObj.path
	if (core.os.mname == 'gtk') {
		iconInfosObj.path = iconInfosObj.name; // :todo: test if i should append ".profilist" here because really the path is name plus .profilist
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
					cOutputSizesArr = [16, 32, 48, 256];
					
				break
			case 'gtk':
					
					cCreatePathDir = null;
					cCreateName += '.profilist'; // link787575758
					cCreateType = 'Linux';
					cOutputSizesArr = [16, 24, 48, 96];
					
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
		var cBaseSrcImgPathArr = [];
		// for (var i=0; i<cOutputSizesArr.length; i++) {
			// cBaseSrcImgPathArr.push(aIconInfosObj.base.prefix + cOutputSizesArr[i] + '.png');
		// }
		var cBaseSlug_imgObj = getImgSrcsForImgSlug(aIconInfosObj.base.slug);
		for (var aImgSize in cBaseSlug_imgObj) {
			cBaseSrcImgPathArr.push(cBaseSlug_imgObj[aImgSize]);
		}
	
		// if badge stuff
		if (aIconInfosObj.badge) {
			cOptions.aBadgeSizePerOutputSize = {
				16: 10,
				24: 12,
				32: 16,
				48: 24,
				64: 32,
				96: 48,
				128: 64,
				256: 128,
				512: 256,
				1024: 512
			};
			// populate cOptions.aBadgeSrcImgPathArr
			cOptions.aBadgeSrcImgPathArr = [];
			var cBadgeSlug_imgObj = getImgSrcsForImgSlug(aIconInfosObj.badge.slug);
			cOptions.aBadgeSrcImgPathArr = [];
			for (var aImgSize in cBadgeSlug_imgObj) {
				cOptions.aBadgeSrcImgPathArr.push(cBadgeSlug_imgObj[aImgSize]);
			}
			
			cOptions.aBadge = aBadgeLoc;
		}
		
		console.time('promiseWorker-createIcon');
		console.log('rawr:', ['createIcon', cCreateType, cCreateName, cCreatePathDir, cBaseSrcImgPathArr, cOutputSizesArr, cOptions]);
		console.log('aIconInfosObj:', aIconInfosObj);
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
								var hr_SetIconLocation = shellLink.SetIconLocation(shellLinkPtr, aLauncherIconPath, /*core.os.version > 5.2 ? 1 : 2*/ 0); // 'iconIndex' in cObj ? cObj.iconIndex : 0
								ostypes.HELPER.checkHRESULT(hr_SetIconLocation, 'createLauncher -> SetIconLocation');
							}
							
							// step5 - verify/update exePath (the build it launches into)
							if (eLauncherExePath != aLauncherExePath) {
								console.log('have to SetPath because --', 'eLauncherExePath:', eLauncherExePath, 'is not what it should be, it should be aLauncherExePath:', aLauncherExePath);
								var hr_SetPath = shellLink.SetPath(shellLinkPtr, aLauncherExePath);
								ostypes.HELPER.checkHRESULT(hr_SetPath, 'createLauncher -> SetPath');
							}
							
							var hr_Save = persistFile.Save(persistFilePtr, eLauncherPath, false);
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
							cLauncherContents = cLauncherContents.replace(eLauncherExePath_patt, 'Exec="' + aLauncherExePath + '" -profile "');
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
						var needDummyDir = false; // to update icon
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
						if (eLauncherIconPath != aLauncherIconPath || eLauncherExePath != aLauncherExePath) {
							// i have to do even if eLauncherExePath != aLauncherExePath because if exe path is changed, then i need to create the icon in that new exe app resources folder. for instance, if currently it is tied to dev. and then i have a custom build which i gave it the dev icon. and now user ties it to the other. well then it sees eLauncherIconPath and cLauncherIconPath are the same, so it does not create the icon.
							if (eLauncherExePath == aLauncherExePath) { console.log('have to update icon because --', 'eLauncherIconPath:', eLauncherIconPath, 'is not what it should be, it should be aLauncherIconPath:', aLauncherIconPath); } else { console.log('have to update icon because --', 'eLauncherExePath:', eLauncherExePath, 'is changing to another exe, it os now be aLauncherExePath:', aLauncherExePath); }
							
							var rez_copyIcon = OS.File.copy(aLauncherIconPath, OS.Path.join(cTargetContentsPath, 'Resources', 'profilist-' + cLauncherDirName + '.icns'), {noOverwrite:false}); // i copy the icon into the main folder, because i alias the folders
							cLauncherJsonLine.LauncherIconPathName = aLauncherIconPath.substring(core.profilist.path.icons.length + 1, aLauncherIconPath.length - 5);
							
							// create dummy folder in Contents to update icon
							needDummyDir = true;
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
						
						if (needDummyDir) {
							// create dummy folder in Contents to update icon
							OS.File.makeDir(OS.Path.join(cLauncherPath, 'dummy for update icon'));
							setTimeout(function() {
								OS.File.removeDir(OS.Path.join(cLauncherPath, 'dummy for update icon'));
							}, 1000);
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
						var hr_SetIconLocation = shellLink.SetIconLocation(shellLinkPtr, aLauncherIconPath, /*core.os.version > 5.2 ? 1 : 2*/ 0); // 'iconIndex' in cObj ? cObj.iconIndex : 0
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
						'Exec="' + aLauncherExePath + '" -profile "' + aFullPathToProfileDir + '" -no-remote'
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
		args: undefined // string of arguments to use when launching, ignored if only focusing
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
							// var rez_focus = ostypes.API('SetForegroundWindow')(matchingWinInfos[i].hwndPtr);
							// var rez_focus = winForceForegroundWindow(matchingWinInfos[i].hwndPtr);
							
							while (true) {
								var rez_focus = ostypes.API('SetForegroundWindow')(matchingWinInfos[i].hwndPtr);
								console.log('rez_focus:', rez_focus);
								
								var hFrom = ostypes.API('GetForegroundWindow')();
								if (hFrom.isNull()) {
									// nothing in foreground, so calling process is free to focus anything
									console.error('nothing in foreground right now');
									continue;
								}
								

								/*
								console.time('jsc compare');
								// var comparePointersJsc = (cutils.jscGetDeepest(matchingWinInfos[i].hwndPtr) == cutils.jscGetDeepest(hFrom));
								var comparePointersJsc = (cutils.jscEqual(matchingWinInfos[i].hwndPtr, hFrom));
								console.timeEnd('jsc compare');
								
								console.time('cutils compare');
								var comparePointersCutils = (cutils.comparePointers(hFrom, matchingWinInfos[i].hwndPtr) === 0 ? true : false);
								console.timeEnd('cutils compare');
								
								console.log('compare results:', comparePointersJsc, comparePointersCutils); // both methods work, and are equally as fast, nice ah
								*/
								
								if (cutils.comparePointers(hFrom, matchingWinInfos[i].hwndPtr) === 0) {
									break;
								}
								// setTimeoutSync(10);
							}
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
	
	var cBadgeLoc; // as number
	if (cBadgeIconSlug) {
		cBadgeLoc = getPrefLikeValForKeyInIniEntry(cIniEntry, getIniEntryByKeyValue(gIniObj, 'groupName', 'General'), 'ProfilistBadgeLoc');
		if (cBadgeLoc) {
			cBadgeLoc = parseInt(cBadgeLoc);
		}
	}
	
	var cIconInfosObj = getIconPathInfosForParamsFromIni(cExePath, cExeChannel, cBadgeIconSlug, cBadgeLoc);
	console.info('cIconInfosObj:', cIconInfosObj);
	var cLauncherDirPath = getLauncherDirPathFromParams(aProfPath);
	console.info('cLauncherDirPath:', cLauncherDirPath);
	var cLauncherName = getLauncherNameFromParams(cExeChannel, cIniEntry.Name)
	console.info('cLauncherName:', cLauncherName);
	
	var cFullPathToProfileDir = getFullPathToProfileDirFromIni(aProfPath);
	console.info('cFullPathToProfileDir:', cFullPathToProfileDir);
	
	
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
					var cLaunchOptions = {
						args: aOptions.args ? aOptions.args : undefined
					};
					if (cIniEntry.ProfilistStatus && cIniEntry.ProfilistStatus === '-1') {
						var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
						if (!cLaunchOptions.args) {
							cLaunchOptions.args = '"' + OS.Path.join(getFullPathToProfileDirFromIni(gCurProfIniEntry.Path), 'extensions', 'Profilist@jetpack.xpi') + '"';
						} else {
							cLaunchOptions.args += ' "' + OS.Path.join(getFullPathToProfileDirFromIni(gCurProfIniEntry.Path), 'extensions', 'Profilist@jetpack.xpi') + '"';
						}
						delete cIniEntry.ProfilistStatus;
						setTimeout(function() { // setTimeout so it runs after the launch and return // need to write as I deleted ProfilistStatus
							writeIni();
						}, 0);
					}
					launchFile(didCreateLauncher, cLaunchOptions);
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

function getNextProfNum(aIniObj) {
	// find next ## for [Profile##]/[TempProfile##] PER the names in the ini. NOT the count of profiles. this is important because the latest added should be the highest number for sorting by created date. writeIni of course writes it per profile count. but that isnt read into gIniObj on write. so just maintain it by as newly added, the number is greater
	var groupNameNumberNext = 0;
	for (var i=0; i<aIniObj.length; i++) {
		if (aIniObj[i].Path) {
			var indexOfProfile = aIniObj[i].groupName.indexOf('Profile');
			if (indexOfProfile === 0 /* std profile group [Profile##] */ || indexOfProfile == 4 /* temp profile [TempProfile##] */) {
				groupNameNumberThis = parseInt(aIniObj[i].groupName.substr(indexOfProfile + 7 /* len of word Profile */));
				console.log('found groupNameNumberThis:', groupNameNumberThis);
				if (groupNameNumberThis >= groupNameNumberNext) {
					groupNameNumberNext = groupNameNumberThis + 1;
				}
			}
		}
	}
	
	console.log('ok this is next prof type group names number:', groupNameNumberNext);
	return groupNameNumberNext;
	
	/*
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
	*/
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
		
		newIniEntry = {
			groupName: 'Profile' + getNextProfNum(gIniObj),
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
	
	// add in ProfilistStatus of "-1" if necessary
	if (!aLaunchIt) {
		newIniEntry.ProfilistStatus = '-1';
	}
	
	// manual format this entry // link8393938311
	newIniEntry.noWriteObj = {
		status: 0
	};
	
	// update gIniObj and write to disk ini
	if (!cFailedReason) {
		gIniObj.push(newIniEntry);
		
		// // :todo: format this iniEntry for returning to framescript - for now i format the whole gIniObj
		// formatNoWriteObjs();
		// no more formating full as i do do it here - link8393938311
		
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
				launchOrFocusProfile(newIniEntry.Path, {
					args: '"' + OS.Path.join(getFullPathToProfileDirFromIni(gCurProfIniEntry.Path), 'extensions', 'Profilist@jetpack.xpi') + '"'
				});
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

	// :todo: for windows
		// win7+
			// maintain selfs taskbar.grouping.useprofile
			// somehow tell the one that was changed, to update its own taskbar.grouping.useprofile ---- issue: profilist installed in target is a factor. if its installed then somehow i can tell profilist of that one to toggle (:todo:). if its not installed, there is no way i can tell it to toggle. (:todo:) maybe if the target does not have profilist installed, dont handle it at all
	
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
						var resultMakeDeskcut = createHardLink(cPathToDeskcut, aPathToLauncher);
						if (core.os.mname == 'darwin' && resultMakeDeskcut == 'exists') {
							// ensure icon updates - only needed if it was already existing
							OS.File.makeDir(OS.Path.join(cPathToDeskcut, 'dummy for update icon 2'));
							setTimeout(function() {
								OS.File.removeDir(OS.Path.join(cPathToDeskcut, 'dummy for update icon 2'));
							}, 1000);
						}
					
					break;
				default:
					// make symlink
					
						try {
							OS.File.unixSymLink(aPathToLauncher, cPathToDeskcut);
						} catch (OSFileError) {
							if (OSFileError.unixErrno == 17) {
								console.warn('symlink already exists:', OSFileError);
							} else {
								console.error('symlink already exists:', OSFileError);
								throw new Error('symlink got error!');
							}
						}
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

function winSetExeIcon(aPlatPath, aIcoPlatPath) {
	// aPlatPath - string; to a full platform path to a file like C:\\firefox.exe
	// aIcoPlatPath - string; to a full platform path to a file like C:\\blah.ico
	
	// based on http://stackoverflow.com/a/22597049/1828637

	// test it with:
		// try { winSetExeIcon(OS.Path.join(OS.Constants.Path.desktopDir, 'qw.exe'), OS.Path.join(core.profilist.path.icons, 'abstract.ico')) } catch(ex) { console.error(ex) }
	
	
	var cIcoUint8 = OS.File.read(aIcoPlatPath);
	console.log('cIcoUint8:', cIcoUint8);
	
	var cIcoBufSize = cIcoUint8.length;
	console.log('cIcoBufSize:', cIcoBufSize);
	
	var cIcoBuf = ostypes.TYPE.BYTE.array(cIcoBufSize)(cIcoUint8.buffer);
	console.log('cIcoBuf:', cIcoBuf);
	
	var hWhere = ostypes.API('BeginUpdateResource')(aPlatPath, false);
	console.log('hWhere:', hWhere);
	
	// var mainIconEx = ostypes.TYPE.LPWSTR.targetType.array('MAINICON'.length + 1)();
	// var rez_multiByte = ostypes.API('MultiByteToWideChar')(ostypes.CONST.CP_ACP, 0, 'MAINICON', -1, mainIconEx, 'MAINICON'.length + 1);
	// console.log('rez_multiByte:', rez_multiByte);
	
	
	var imageCount = 1;
	var headerSize = 6 + imageCount * 16;
	
	console.log('cIcoBuf:', cIcoBuf, cIcoBuf.address());
	console.log('headerSize:', headerSize);
	
	var uint64_buf = ctypes.cast(cIcoBuf.address(), ctypes.uintptr_t).value;
	var uint64_shifted = ctypes_math.UInt64.add(uint64_buf, ctypes.UInt64(headerSize));
	console.log('uint64_shifted:', uint64_shifted, uint64_shifted.toString());
	var skipHeaderBytes = ostypes.TYPE.LPVOID(uint64_shifted);
	
	var rez_update = ostypes.API('UpdateResource')(
		hWhere,  // Handle to executable
		ostypes.CONST.RT_ICON, // Resource type - icon
		'1', // Make the id 1
		ostypes.HELPER.MAKELANGID(ostypes.CONST.LANG_ENGLISH, ostypes.CONST.SUBLANG_DEFAULT), // Default language
		skipHeaderBytes, // cIcoUint8.buffer, // Skip the header bytes
		cIcoBufSize - headerSize  // Length of buffer
	);
	console.log('rez_update:', rez_update);

	var grData = ostypes.TYPE.GROUPICON();

	grData.Reserved1 = 0;     // reserved, must be 0
	grData.ResourceType = 1;  // type is 1 for icons
	grData.ImageCount = 1;    // number of icons in structure (1)

	grData.Width = 32;        // icon width (32)
	grData.Height = 32;       // icon height (32)
	grData.Colors = 0;        // colors (256)
	grData.Reserved2 = 0;     // reserved, must be 0
	grData.Planes = 2;        // color planes
	grData.BitsPerPixel = 32; // bit depth
	grData.ImageSize = cIcoBufSize - 22; // size of image
	grData.ResourceID = 1;       // resource ID is 1
	
	console.log('grData.constructor.size:', grData.constructor.size);
	
	var rez_update2 = ostypes.API('UpdateResource')(
		hWhere,  // Handle to executable
		ostypes.CONST.RT_GROUP_ICON, // Resource type - icon
		'MAINICON', // mainIconEx,
		ostypes.HELPER.MAKELANGID(ostypes.CONST.LANG_ENGLISH, ostypes.CONST.SUBLANG_DEFAULT), // Default language
		grData.address(), // Skip the header bytes
		grData.constructor.size  // Length of buffer
	);
	console.log('rez_update2:', rez_update2);
	if (!rez_update) {
		throw new Error('update failed');
	}
	
	// Write changes then close it.
	var rez_endUpdate = ostypes.API('EndUpdateResource')(hWhere, false)
	console.log('rez_endUpdate:', rez_endUpdate);
	
	if (!rez_endUpdate) {
		throw new Error('failed to end update');
	}
	
	return 'ok';
}

function winReadFileResources(aPlatPath) {
	// aPlatPath - string; to a full platform path to a file like C:\\firefox.exe
	
	// based on https://msdn.microsoft.com/en-us/library/ms648008%28v=vs.85%29.aspx#_win32_Updating_Resources
	// and http://stackoverflow.com/questions/5144999/exe-file-icon-change-icon-taken-from-shell32-dll
	
	
	// based on http://www.go4expert.com/articles/change-icon-exe-file-code-extracting-t643/
	
	// Load the .EXE file that contains the dialog box you want to copy.
	var hSrcExe = ostypes.API('LoadLibrary')(aPlatPath);
	console.log('hSrcExe:', hSrcExe);
	if (hSrcExe.isNull()) {
		throw new Error('Could not load exe.');
	}
	
	// Locate the ICON resource in the .EXE file.
	var iLoop = 0;
	while (true) {
		iLoop++;
		
		var hRes = ostypes.API('FindResource')(hSrcExe, '#' + iLoop, ostypes.CONST.RT_ICON);
		console.log('hRes:', hRes);
		if (!hRes.isNull()) {
			break;
		} else {
			if (iLoop == 10) {
				console.error('Could not find icon resource for exe at ', aPlatPath);
				throw new Error('Could not find icon resource for exe');
			} // else continue
		}
	}
	
	// Load the ICON into global memory.
	var hResLoad = ostypes.API('LoadResource')(hSrcExe, hRes);
	console.log('hResLoad:', hResLoad);
	if (hResLoad.isNull()) {
		throw new Error('failed to load resource');
	}
	
	// // Lock the ICON into global memory.
	// var lpResLock = ostypes.API('LockResource')(hResLoad);
	// console.log('lpResLock:', lpResLock);
	// if (lpResLock.isNull()) {
	// 	throw new Error('failed to lock icon into global mem');
	// }
	
	var hResSize = ostypes.API('SizeofResource')(hSrcExe, hRes)
	console.log('hResSize:', hResSize);
	
	
}

function winReadShortcutParams(eLauncherPath) {
	// eLauncherPath should be platform path to a shortcut
	// reads icon path, icon index
	// reads target path
	// reads appUserModelId
	
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
		console.log('exeIconPath:', eLauncherIconPath, 'exeIconPath_iconIndex:', eIconIndex);
		
		// step2 - get eLauncherExePath
		var buffer_eLauncherExePath = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
		var hr_GetPath = shellLink.GetPath(shellLinkPtr, buffer_eLauncherExePath/*.address()*/, buffer_eLauncherExePath.length, null, ostypes.CONST.SLGP_RAWPATH);
		ostypes.HELPER.checkHRESULT(hr_Load, 'createLauncher -> GetPath');
		
		var eLauncherExePath = buffer_eLauncherExePath.readString();
		console.log('exePath:', '"' + eLauncherExePath + '"');
		
		if (core.os.version >= 6.1) {
			// win7 and up
			var eLauncherAppUserModelId = ostypes.HELPER.IPropertyStore_GetValue(propertyStorePtr, propertyStore, ostypes.CONST.PKEY_APPUSERMODEL_ID.address(), null); // can throw if something goes wrong inside
			console.log('appUserModelId:', eLauncherAppUserModelId);
		}
		
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
}

// Start - Window watcher
_cache_getWin7TaskbarId = {};
function getWin7TaskbarIdForExePath(aExePath) {
	// returns string
	if (!(aExePath in _cache_getWin7TaskbarId)) {
		console.time('winRegistryRead');
		_cache_getWin7TaskbarId[aExePath] = winRegistryRead('HKEY_CURRENT_USER', 'Software\\Mozilla\\Firefox\\TaskBarIDs', aExePath); // :todo: instead of read from registry, i should CityHash64 like per - ```CityHash::GetCityHash64 "$R9"``` - https://dxr.mozilla.org/mozilla-central/source/toolkit/mozapps/installer/windows/nsis/common.nsh#7295
		console.timeEnd('winRegistryRead');
		
		if (_cache_getWin7TaskbarId[aExePath] === null) {
			console.error('should never happen! as this registry entry is made on instal of aExePath, it has to exist!');
			throw new Error('should never happen! as this registry entry is made on instal of aExePath, it has to exist!');
		}
	}
	return _cache_getWin7TaskbarId[aExePath];
}
/*
function getWin7TaskbarId(aProfPath) {
	var gProfIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath);
	
	var cProfIsDefault = gProfIniEntry.Default === '1' ? '1' : '0';
	
	var strToHash;
	if (cProfIsDefault === '0') {
		strToHash = aProfPath;
		if (!(strToHash in _cache_getWin7TaskbarId)) {
			_cache_getWin7TaskbarId[strToHash] = HashString(strToHash);
		}
	} else {
		var cProfIsRunning = gProfIniEntry.noWriteObj.status ? true : false;
		if (cProfIsRunning) {
			strToHash = OS.Path.dirname(gProfIniEntry.noWriteObj.exePath);
		} else {
			var devWant_lastExePath_or_shouldBeExePath = true; // false for lastExePath, true for shouldBePath
			// i decided ill take lastExePath, in case shouldBeExePath doesnt exist in registry - i think this is poor decision, but lets try it out
			// actually i decided on shouldBe - as that takes the running one if there is one
			// strToHash = ''; // the last exe path it ran in? or the exe path it should be (should be means, if its not tied then it will be launched in this curProfIniEntry.noWriteObj.exePath, or if its tied then what the exePath of that tie is)?
			if (!devWant_lastExePath_or_shouldBeExePath) {
				// lastExePath
				strToHash = getLastExePathForProfFromFS(aProfPath);
			} else {
				// shouldBe
				strToHash = OS.Path.dirname(getCalcdExePathForProfFromIniFromFS(aProfPath));
			}
		}
		if (!(strToHash in _cache_getWin7TaskbarId)) {
			console.time('winRegistryRead');
			_cache_getWin7TaskbarId[strToHash] = winRegistryRead('HKEY_CURRENT_USER', 'Software\\Mozilla\\Firefox\\TaskBarIDs', strToHash); // :todo: instead of read from registry, i should CityHash64 like per - ```CityHash::GetCityHash64 "$R9"``` - https://dxr.mozilla.org/mozilla-central/source/toolkit/mozapps/installer/windows/nsis/common.nsh#7295
			console.timeEnd('winRegistryRead');
			console.error('just did timeEnd on winRegistryRead');
			
			if (_cache_getWin7TaskbarId[strToHash] === null) {
				// fallback to just HashString of profpath, it just has to be consistent with how profilist handles it. at this point.
				strToHash = aProfPath;
				if (!(strToHash in _cache_getWin7TaskbarId)) {
					_cache_getWin7TaskbarId[strToHash] = HashString(strToHash);
				}
			}
		}
	}
	
	return _cache_getWin7TaskbarId[strToHash];
}
*/
function updateIntoWindow(aNativeWindowPtrStr) {
	// job is to maintain the ICON PER WINDOW
		// on win7+ it has extra job of having to maintain RELAUNCH PROPERTIES
	
	// :IMPORTANT: this function assumes that the icon that needs to be applied is readymade/exists
	
	// this does not care about other windows. :todo: something else will have to decide if it needs to run updateIntoWindow on all windows again.
	// this function just applies the proper state to the window it was called on - therefore function renamed from loadIntoWindow to updateIntoWindow
		// even when this runs SetWindowLongPtr to update all icons. this function is only thinking about this window, on whether it needs to apply it to this one. if it happens it needs to apply it to this one then it will apply it and record that it was applied in OSStuff. and a side affect of this is all other windows are maintained
		
	console.log('loading into aNativeWindowPtrStr:', aNativeWindowPtrStr);
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				
				var cNativeWindowPtr = ostypes.TYPE.HWND(ctypes.UInt64(aNativeWindowPtrStr));
				
				// should we set window ptr long on this window?
				var shouldSetWindowPtr = false;
				if (OSStuff.windowLastSet_ExeIconPath != OSStuff.windowShouldBe_ExeIconPath) {
					shouldSetWindowPtr = true;
				}
				
				// ok lets set it
				if (shouldSetWindowPtr) {
					//load hicon
					var hIconBig;
					/*
					if (core.os.version == 6.1) {
						//win7
						hIconBig = ostypes.API('LoadImage')(null, OSStuff.windowShouldBe_ExeIconPath, IMAGE_ICON, 256, 256, LR_LOADFROMFILE);
					} else if (cOSVersion == 5.1) {
						//winXP
						hIconBig = ostypes.API('LoadImage')(null, OSStuff.windowShouldBe_ExeIconPath, IMAGE_ICON, 32, 32, LR_LOADFROMFILE); 
					} else {
						//just do 256 as fallback
						hIconBig = ostypes.API('LoadImage')(null, OSStuff.windowShouldBe_ExeIconPath, IMAGE_ICON, 256, 256, LR_LOADFROMFILE);
					}
					*/
					hIconBig = ostypes.API('LoadImage')(null, OSStuff.windowShouldBe_ExeIconPath, ostypes.CONST.IMAGE_ICON, 0, 0, ostypes.CONST.LR_DEFAULTSIZE | ostypes.CONST.LR_LOADFROMFILE); // per http://stackoverflow.com/a/2237192/1828637 - "(For the large icon, you can also just pass LR_DEFAULTSIZE to LoadImage with 0 size)"
					console.log('hIconBig:', hIconBig);
					
					var hIconSmall = ostypes.API('LoadImage')(null, OSStuff.windowShouldBe_ExeIconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE);
					console.log('hIconSmall:', hIconSmall);
					
					// set class long
					var iconSmallCastedForSetLong = ctypes.cast(hIconSmall, ostypes.IS64Bit ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
					var iconBigCastedForSetLong = ctypes.cast(hIconBig, ostypes.IS64Bit ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
					
					var oldBigIcon = ostypes.API('SetClassLong')(cNativeWindowPtr, ostypes.CONST.GCLP_HICON, iconBigCastedForSetLong);
					console.log('oldBigIcon:', oldBigIcon);
					if (cutils.jscEqual(oldBigIcon, 0)) {
						console.error('Failed to apply BIG icon with setClassLong, winLastError:', ctypes.winLastError);
					}
					
					// tested and verified with the ostypes.TYPE.HWND(ctypes.UInt64('0x310b38')) above, that if oldBigIcon causes winLastError to go to non-0, then if oldSmallIcon call succeeds, winLastError is set back to 0
					var oldSmallIcon = ostypes.API('SetClassLong')(cNativeWindowPtr, ostypes.CONST.GCLP_HICONSM, iconSmallCastedForSetLong);
					console.log('oldSmallIcon:', oldSmallIcon);
					if (cutils.jscEqual(oldSmallIcon, 0)) {
						console.error('Failed to apply SMALL icon with setClassLong, winLastError:', ctypes.winLastError);
					}

					// free mem of old icons
					if (!cutils.jscEqual(oldBigIcon, 0)) {
						var oldBigHICON;
						if (ostypes.IS64Bit) {
							oldBigHICON = ctypes.cast(ostypes.TYPE.ULONG_PTR(cutils.jscGetDeepest(oldBigIcon)), ostypes.TYPE.HICON);
						} else {
							oldBigHICON = ctypes.cast(ostypes.TYPE.DWORD(cutils.jscGetDeepest(oldBigIcon)), ostypes.TYPE.HICON);
						}
						var rez_destroyBig = ostypes.API('DestroyIcon')(oldBigHICON);
						console.log('rez_destroyBig:', rez_destroyBig);
					}
					if (!cutils.jscEqual(oldSmallIcon, 0)) {
						var oldSmallHICON;
						if (ostypes.IS64Bit) {
							oldSmallHICON = ctypes.cast(ostypes.TYPE.ULONG_PTR(cutils.jscGetDeepest(oldSmallIcon)), ostypes.TYPE.HICON);
						} else {
							oldSmallHICON = ctypes.cast(ostypes.TYPE.DWORD(cutils.jscGetDeepest(oldSmallIcon)), ostypes.TYPE.HICON);
						}
						var rez_destroySmall = ostypes.API('DestroyIcon')(oldSmallHICON);
						console.log('rez_destroySmall:', rez_destroySmall);
					}
					
					// update last
					OSStuff.windowLastSet_ExeIconPath = OSStuff.windowShouldBe_ExeIconPath;
				}
				
				if (core.os.version >= 6.1) {
					// win7 and up - we have to set it for every window regardless of OSStuff.windowLastSet_ExeIconPath
					var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
					
					var ppsPtr = ostypes.TYPE.IPropertyStore.ptr();
					var hr_SHGetPropertyStoreForWindow = ostypes.API('SHGetPropertyStoreForWindow')(cNativeWindowPtr, ostypes.CONST.IID_IPROPERTYSTORE.address(), ppsPtr.address());
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'SHGetPropertyStoreForWindow');
					
					var pps = ppsPtr.contents.lpVtbl.contents;
					
					// set icon
					var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_APPUSERMODEL_RELAUNCHICONRESOURCE.address(), OSStuff.windowLastSet_ExeIconPath + ',0'); // it works ine withou reource id, i actually am just guessing -2 is pointing to the 48x48 icon im no sure but whaever number i put after - it looks like is 48x48 so its weird but looking right
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'RelaunchIconResource');
					
					// set display name
					var launcherName = getLauncherNameFromParams(core.firefox.channel, gCurProfIniEntry.Name);
					var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_APPUSERMODEL_RELAUNCHDISPLAYNAMERESOURCE.address(), launcherName);
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'RelaunchDisplayNameResource');
					
					// set launcher path - to the path in the profilist_data exes folder
					var launcherPath = OS.Path.join(getLauncherDirPathFromParams(gCurProfIniEntry.Path), launcherName);
					var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_APPUSERMODEL_RELAUNCHCOMMAND.address(), launcherPath);
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'RelaunchCommand');
					
					// set AppUserModelId - depends on if the profile is default or not
					var cAppUserModelID;
					if (gCurProfIniEntry.Default === '1') {
						cAppUserModelID = getWin7TaskbarIdForExePath(OS.Path.dirname(core.profilist.path.XREExeF));
						if (!cAppUserModelID) {
							throw new Error('should never happen!!!!! registry entry must exist for ' + OS.Path.dirname(core.profilist.path.XREExeF));
						}
					} else {
						cAppUserModelID = HashString(gCurProfIniEntry.Path) + ''; // make it a string as it needs to be a string to get passed into the ctypes. else i get error "can't pass the number 741175429 to argument 1 of long SHStrDupW(char16_t*, char16_t**)"
					}
					console.log('cAppUserModelID:', cAppUserModelID);
					var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_APPUSERMODEL_ID.address(), 'PROFILISTDUMMY'); // need to set it away, as the above 3 IPropertyStore_SetValue's only take affect on ID change per msdn docs // :todo: i think this moves the group to the end of the taskbar if there is only one left and its not pinned, so MAYBE try to figure out a way to do this without change spot if not pinned
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'ID dummy');
					var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_APPUSERMODEL_ID.address(), cAppUserModelID); // set it to what it really should be
					ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'ID real');
				}
				
				// :debug: i commented this block out for now, stilling thinking through window logic
				// // set application long if it hasnt been set already
				// var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
				// if (OSStuff.last_iconSlug_appliedToWindows == gCurProfIniEntry.noWriteObj.exeIcon
				// 
				// // figure out if need to set appusermodelid on every window
				// if (core.os.version >= 6.1) {
				// 	// win7 and up
				// 	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
				// 	if (gCurProfIniEntry.Default === '1') {
				// 		// current profile IS default
				// 		if (core.firefox.prefs['taskbar.grouping.useprofile']) {
				// 			// need to set appUserModelId in window to default one
				// 			getWin7TaskbarId
				// 		}
				// 	} else {
				// 		// current profile is NOT default
				// 		if (!core.firefox.prefs['taskbar.grouping.useprofile']) {
				// 			// need to set it to true, but do not update `core.firefox.prefs['taskbar.grouping.useprofile']` because the new value doesn't take affect till restart
				// 			self.postMessage(['setPref', 'taskbar.grouping.useprofile', true]);
				// 		}
				// 	}
				// } else {
                // 
				// }
				
				
			
			break;
		case 'gtk':
		
				// if not ubuntu, then set window icon
		
			break;
		// case 'darwin':
		// 		
		// 		// no need on mac
		// 		
		// 	break;
		default:
			// do nothing special
	}
}

function unloadFromWindow(aNativeWindowPtrStr) {
	console.log('unloading from aNativeWindowPtrStr:', aNativeWindowPtrStr);
}
// End - Windo watcher

// Start - Icon browse picker dialog
function browseiconInit() {
	return {
		iconConfig: 'rawr'
	};
}
// End - Icon browse picker dialog

// Start - Iconset Picker
// var gArrBufs = {}; // key is URL.createURL and value is blob
function releaseBlobsAndUrls(aArrOfTempFileUris) {
	console.log('in worker will release aArrOfTempFileUris:', aArrOfTempFileUris);
	
	for (var i=0; i<aArrOfTempFileUris.length; i++) {
		console.log('releasing:', aArrOfTempFileUris[i]);
		// URL.revokeObjectURL(aArrOfTempFileUris[i]);
		// delete gArrBufs[aArrOfTempFileUris[i]];
		delete gArrGithubUrls[aArrOfTempFileUris[i]];
		OS.File.remove(OS.Path.fromFileURI(aArrOfTempFileUris[i]));
	}
	
	return true;
}
function saveAsIconset(aImgObj) {
	// triggered when "Apply this Icon" is clicked so props.select_callback so onSelectCallback
	// paths in aImgObj MUST have ext
	// paths in aImgObj are url's or file uri strings
	console.log('doing saveAsIconset, aImgObj:', aImgObj);
	
	var isGithubUrls = false;
	
	var generateSlugForImgObj_setLocalGlobals_makeDir = function() {
		// depends on isGithubUrls
		// for use only when aImgObj contains all full platform or github urls. MUST have extension `.png` or something
		// sets cImgSlug and cImgSlugDirPath
		// also makes the dir
		/*
		var allImgObjFilenames = [];
		for (var aSize in aImgObj) {
			
			if (!isGithubUrls) {
				// its platform paths then
				var cFilename = OS.Path.basename(aImgObj[aSize]);
				var cFilenameNoExt = cFilename.substr(0, cFilename.lastIndexOf('.'));
			} else {
				// url
				var cFilename = aImgObj[aSize];
				cFilename = cFilename.substr(cFilename.lastIndexOf('/') + 1);
				cFilename = decodeURIComponent(cFilename);
				var cFilenameNoExt = cFilename.substr(0, cFilename.lastIndexOf('.'));
			}
			
			allImgObjFilenames.push(cFilenameNoExt);
		}
		var anyCommonStr = longestCommonSubstringInArr(allImgObjFilenames).trim();
		if (anyCommonStr === '' || anyCommonStr.replace(/[^a-z]/g, '') === '') {
			// nothing in common, so just take first entry of allImgObjFilenames
			anyCommonStr = allImgObjFilenames[0];
		}
		*/
		// user the directory name
		var anyCommonStr;
		for (var aSize in aImgObj) {
			if (!isGithubUrls) {
				// its platform paths then
				var cSubdirName = OS.Path.split(OS.Path.fromFileURI(aImgObj[aSize])).components;
				cSubdirName = cSubdirName[cSubdirName.length - 2]; // - 2 as -1 is the filename
			} else {
				// url
				// var githubUrl = gArrBufs[aImgObj[aSize]].github_url;
				var githubUrl = gArrGithubUrls[aImgObj[aSize]].github_url;

				var githubRepo = '/Noitidart/Firefox-PNG-Icon-Collections/master/';
				var githubConsequential = githubUrl.substr(githubUrl.indexOf(githubRepo) + githubRepo.length);
				var githubComponentsStr = githubConsequential.substr(0, githubConsequential.lastIndexOf('/'));

				var githubSplitByCollection = githubComponentsStr.split('%20-%20Collection/');

				// replace all the by's
				for (var i = 0; i < githubSplitByCollection.length; i++) {
					if (githubSplitByCollection[i].indexOf('%20by%20') > -1) {
						githubSplitByCollection[i] = githubSplitByCollection[i].substr(0, githubSplitByCollection[i].lastIndexOf('%20by%20'));
					}
				}

				cSubdirName = safedForPlatFS(decodeURIComponent(githubSplitByCollection.join('-')).toLowerCase());
			}
			anyCommonStr = cSubdirName.toLowerCase().replace(/ /g, '-');
			break;
		}
		// ensure its avaiable, if not then append -## till it is avail
		var retryWithStr = anyCommonStr;
		var cRetry = 2;
		while (allProfilistUserImages.indexOf(retryWithStr) > -1) {
			retryWithStr = anyCommonStr + '-' + cRetry;
			cRetry++;
		}
		
		cImgSlug = retryWithStr;
		cImgSlugDirPath = OS.Path.join(core.profilist.path.images, cImgSlug);
		
		OS.File.makeDir(cImgSlugDirPath, {from:OS.Constants.Path.userApplicationDataDir});
	};
	
	// get imgSlug (save to disk if necessary)
	var cImgSlug;
	var cImgObj = {};
	var cImgSlugDirPath;
	var coreProfilistPathImages_fileuri = OS.Path.toFileURI(core.profilist.path.images);
	for (var aSize in aImgObj) {
		var cUrl = aImgObj[aSize];
		console.error('cUrl:', cUrl);
		if (cUrl.indexOf(core.addon.path.images) === 0 || cUrl.indexOf(coreProfilistPathImages_fileuri) === 0) {
			// its already a saved slug, just apply that
			if (!cImgSlug) {
				if (cUrl.indexOf(core.addon.path.images) === 0) {
					// chrome:// path
					cImgSlug = cUrl.substr(cUrl.lastIndexOf('/') + 1);
					cImgSlug = cImgSlug.substr(0, cImgSlug.lastIndexOf('_'));
				} else {
					cImgSlug = OS.Path.basename(OS.Path.fromFileURI(cUrl));
					cImgSlug = cImgSlug.substr(0, cImgSlug.lastIndexOf('_'));
				}
				cImgObj = getImgSrcsForImgSlug(cImgSlug);
				console.error('cImgSlug:', '"' + cImgSlug + '"');
			}
			break;
		} else {
			// if (cUrl.indexOf('blob:') === 0) {
			if (cUrl.indexOf(gGithubDownloadPrefix) > -1) {
				// take the blobs to arrbuff, save it, then delete the blobs
				if (!cImgSlug) {
					isGithubUrls = true;
					generateSlugForImgObj_setLocalGlobals_makeDir();
					console.error('cImgSlug:', '"' + cImgSlug + '"');
				}
				
				// var cUrlExt = gArrBufs[cUrl].github_url;
				var cUrlExt = gArrGithubUrls[cUrl].github_url;
				cUrlExt = cUrlExt.substr(cUrlExt.lastIndexOf('.') + 1);
				
				var cWritePath = OS.Path.join(cImgSlugDirPath, cImgSlug + '_' + aSize + '.' + cUrlExt);
				// OS.File.writeAtomic(cWritePath, new Uint8Array(gArrBufs[cUrl].arrbuf)); // :note: i dont write as .png in case the image was non .png
				OS.File.move(OS.Path.fromFileURI(cUrl), cWritePath);
				cImgObj[aSize] = OS.Path.toFileURI(cWritePath);
				
				// URL.revokeObjectURL(cUrl);
				// delete gArrBufs[cUrl];
				delete gArrGithubUrls[cUrl];
			} else {
				// its a file path
				if (!cImgSlug) {
					isGithubUrls = false;
					generateSlugForImgObj_setLocalGlobals_makeDir();
					console.error('cImgSlug:', '"' + cImgSlug + '"');
				}
				
				var cUrlExt = cUrl.substr(cUrl.lastIndexOf('.') + 1);
				
				var cWritePath = OS.Path.join(cImgSlugDirPath, cImgSlug + '_' + aSize + '.' + cUrlExt);
				OS.File.copy(OS.Path.fromFileURI(cUrl), cWritePath);
				cImgObj[aSize] = OS.Path.toFileURI(cWritePath);
			}
		}
	}
	gCache_getImgSrcsForImgSlug[cImgSlug] = cImgObj; // does nothing for if this was a slug. but if github or browse then yes
	
	// apply imgSlug
	
	return [cImgSlug, cImgObj];
}
function deleteIconset(aImgSlug) {
	if (isSlugInChromeChannelIconsets(aImgSlug)) {
		throw new Error('cannot delete a chrome img slug');
	}
	
	OS.File.removeDir(OS.Path.join(core.profilist.path.images, aImgSlug));
	console.log('ok removed iconset with slug:', aImgSlug);
	
	invalidateCache_getImgSrcsFormImgSlug(aImgSlug);
	
	var doWriteIni = false;
	// :todo: if any profiles use aImgSlug as a ProfilistBadge then delete from that entry ProfilistBadge
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path) {
			// its a prof type
			if (gIniObj[i].ProfilistBadge && gIniObj[i].ProfilistBadge == aImgSlug) {
				doWriteIni = true;
				delete gIniObj[i].ProfilistBadge;
			}
		}
	}
	
	// :todo: if any jProfilistBuildEntry uses this as an icon then delete that entry? or give it a missing icon image? or try to get channel for that build and use that?
	//	i decided that i should just disallow delete from the gui, if the iconset is in use by a build // cross file link171111174957393
	
	/* // this was the stuff i was doing when i was considering making delete default the icon to "release" or delete the build entry
	var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
	var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
	var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
	// var buildEntryIdsToRemove = [];
	for (var i=0; i<j_gProfilistBuilds.length; i++) {
		if (j_gProfilistBuilds[i].i == aImgSlug) {
			doWriteIni = true; // not really needed because of link1711111
			// buildEntryIdsToRemove.push(j_gProfilistBuilds[i].id);
			j_gProfilistBuilds[i].i = 'release'; // default it to release
		}
	}
	// for (var i=0; i<buildEntryIdsToRemove.length; i++) {
		// doWriteIni = true; // link1711111
		// removeBuild(buildEntryIdsToRemove[i], false);
	// }
	*/
	
	if (doWriteIni) {
		// formatNoWriteObjs(); // i dont have to format it as things were just removed
		writeIni();
		return gIniObj;
	} else {
		return null;
	}
}

var gGithubDownloadId = -1;
const gGithubDownloadPrefix = 'prflst-_-dl_-_'; // cross file link1110238471
var gArrGithubUrls = {}; // key is plat path file uri, and value is github url // these should all be released (meaning deleted)

function readImgsInDir(aDirPlatPath) {
	// aDirPlatPath is either a plat path OR object {profilist_imgslug:aImgSlug} - gurantted aImgSlug must exist, as i dont handle errors in here if it doesnt
	// returns
		// if profilist_slug then aImgObj (which is keys size and value is string you would put in img src="HERE")
		// else it is aPartialImgObj which is an array of images found. only gif, jpeg, jpg, and png are supported
			// if no images found it is a string saying "error-noimgs"
			// if no cannot read directory contents "error-read"
			// if more than 20 images "error-toomanyimgs"
		
	var rezObj;
	
	if(typeof(aDirPlatPath) == 'string') {

		var validImgExts = ['gif', 'jpg', 'jpeg', 'png'];
		var tooManyImgs = 20;
		
		if (aDirPlatPath.indexOf('/Noitidart/Firefox-PNG-Icon-Collections') > -1) {
			// proflist_github
			console.log('profilist_github:', aDirPlatPath);
			rezObj = {};
			
			var githubHtml = xhr(aDirPlatPath).response;
			// console.log('githubHtml:', githubHtml);
			var githubPatt = /<a.*?\/Noitidart\/Firefox-PNG-Icon-Collections\/blob\/master\/([^ "']+)[^>]+>([^<]+)/g
			var githubMatch;
			
			while(githubMatch = githubPatt.exec(githubHtml)) {
				var name = githubMatch[2];
				var path = githubMatch[1];
				// console.log(name, path);
				
				var dotIndex = name.lastIndexOf('.');
				if (dotIndex == -1) {
					continue;
				}
				var ext = name.substr(dotIndex + 1);
				if (validImgExts.indexOf(ext.toLowerCase()) == -1) {
					// not an image or not an acceptable image
					continue;
				}
				
				var size = name.substr(0, dotIndex);
				rezObj[size] = 'https://raw.githubusercontent.com/Noitidart/Firefox-PNG-Icon-Collections/master/' + path;
			}
			
			OS.File.makeDir(core.profilist.path.root, {from:OS.Constants.Path.userApplicationDataDir});
			
			for (var aSize in rezObj) {
				var request_imgdata = xhr(rezObj[aSize], {
					responseType: 'arraybuffer'
				});
				gGithubDownloadId++;
				var thisTempPngDlPlatPath = OS.Path.join(core.profilist.path.root, gGithubDownloadPrefix + gGithubDownloadId + '.png');
				OS.File.writeAtomic(thisTempPngDlPlatPath, new Uint8Array(request_imgdata.response));
				
				var thisTmpPngDlFileUri = OS.Path.toFileURI(thisTempPngDlPlatPath);
				gArrGithubUrls[thisTmpPngDlFileUri] = {
					github_url: rezObj[aSize]
				};
				// var cBlobUrl = URL.createObjectURL(new Blob([request_imgdata.response], {type:'image/png'}));
				// // need to keep saved in gArrBufs in case user selects this one, it gets released if user does not
				// gArrBufs[cBlobUrl] = { // important that key is cBlobUrl
				// 	arrbuf: request_imgdata.response,
				// 	github_url: rezObj[aSize]
				// };
				rezObj[aSize] = thisTmpPngDlFileUri;
			}
			// console.error('ok here it is:', gArrBufs);
			console.error('ok here it is:', gArrGithubUrls);
			
		} else {
			rezObj = [];
			var cDirIterator = new OS.File.DirectoryIterator(aDirPlatPath);
			try {
				cDirIterator.forEach(function(aEntry, aIndex, aIterator) {
					
					// this block tests if the format is valid of the image filename, it also gets details of cImgSize, cImgExt, and sImgSlug
					// get extension
					var cDotIndex = aEntry.name.lastIndexOf('.');
					if (cDotIndex == -1) {
						// no extension
						return;
					}
					
					var cExt = aEntry.name.substr(cDotIndex + 1);
					if (validImgExts.indexOf(cExt.toLowerCase()) == -1) {
						// not an image or not an acceptable image
						return;
					}
					
					rezObj.push(OS.Path.toFileURI(aEntry.path));
					
					if (rezObj.length == tooManyImgs) {
						rezObj = 'error-toomanyimgs';
						cDirIterator.close();
					}

				});
			} catch(OSFileError) {
				throw new MainWorkerError('readImgsInDir', OSFileError);
			} finally {
				if (rezObj != 'error-toomanyimgs') {
					// cuz if too many images reached it closes it already to break the iteration
					cDirIterator.close();
				}
			}
			
			if (Array.isArray(rezObj) && rezObj.length == 0) {
				rezObj = 'error-noimgs';
			}
		}
	
	} else {
		// its a imgSlug
		rezObj = getImgSrcsForImgSlug(aDirPlatPath.profilist_imgslug);
	}
	
	return rezObj; // need to return array because am going through my custom communication stuff
}

var allProfilistUserImages = []; // for use when generating slug, and verifying rename is acceptable. holds all the dir names in the profilist_user_images directory which is core.profilist.path.images
function readSubdirsInDir(aDirPlatPath) {
	// aDirPlatPath - string, either platform dir path or specials: "desktop", "documents", "pictures", "home", "downloads", "profilist_user_images", "profilist_github"
	// returns
		// array all of objects
			/*
			{
				name: folder name
				path: full plat path to folder
			}
			*/
	if (aDirPlatPath == 'profilist_github') {
		aDirPlatPath = 'https://github.com/Noitidart/Firefox-PNG-Icon-Collections';
	}
	if (aDirPlatPath.indexOf('/Noitidart/Firefox-PNG-Icon-Collections') > -1) { // second part of if is to detect subcollections
		var rezGithub = [];
		var githubHtml = xhr(aDirPlatPath).response;
		
		var githubPatt = /<a.*?\/Noitidart\/Firefox-PNG-Icon-Collections\/tree\/master\/([^ "']+)[^>]+>([^<]+)/g
		var githubMatch;
		
		while(githubMatch = githubPatt.exec(githubHtml)) {
			if (githubMatch[2] == '..') {
				// skip this as its the title="Go to parent directory" link
				continue;
			}
			rezGithub.push({
				name: githubMatch[2],
				path: 'https://github.com/Noitidart/Firefox-PNG-Icon-Collections/tree/master/' + githubMatch[1]
			});
		}
		
		return [rezGithub];
	}
	switch(aDirPlatPath) {
		case 'profilist_user_images':
			
				aDirPlatPath = core.profilist.path.images;
			
			break;
		case 'home':
		
				aDirPlatPath = OS.Constants.Path.homeDir;
				
			break;
		case 'desktop':
		
				aDirPlatPath = OS.Constants.Path.desktopDir;
				
			break;
		case 'documents':
		
				aDirPlatPath = core.profilist.path.documents;
				
			break;
		case 'pictures':
		
				aDirPlatPath = core.profilist.path.pictures
				
			break;
		case 'downloads':
		
				aDirPlatPath = core.profilist.path.downloads
				
			break;
		default:
			// do nothing - assume its a platpath
	}
	
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
		rezArr.splice(0, 0,
			{name:'aurora', path:core.addon.path.images + 'channel-iconsets/aurora'},
			{name:'beta', path:core.addon.path.images + 'channel-iconsets/beta'},
			{name:'dev', path:core.addon.path.images + 'channel-iconsets/dev'},
			{name:'nightly', path:core.addon.path.images + 'channel-iconsets/nightly'},
			{name:'release', path:core.addon.path.images + 'channel-iconsets/release'}
		);
		
		// push all names to
		allProfilistUserImages = [];
		for (var i=0; i<rezArr.length; i++) {
			allProfilistUserImages.push(rezArr[i].name);
		}
	}
	
	return rezArr; // because this goes through callInPromiseWorker
}
// End - Iconset Picker

function adoptOrphanTempProfs(aOptions={}) {
	// description: if any firefox processes are found running, but were not in ini, then they are obviously temporary profiles. so usurp them into ini as [TempProfile##]
	// this function will push the new ini entires into gIniObj. by default it will not write to ini. if you want it to, then set dontWriteIni:false in options
	// requires that gIniObj have formatted noWriteObj
	// returns number of new temp profiles found
	
	console.time('adoptOrphanTempProfs');
	
	var cOptionsDefaults = {
		processIdsInfos: null, // supply here the return from getAllPID
		dontWriteIni: true
	}
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	var pidSnapshot = aOptions.processIdsInfos ? aOptions.processIdsInfos : getAllPID({firefoxOnly:true});
	
	// check if each pid is in gIniObj, if it is not, then its a temp profile. then figure out its parent.lock file path, from which i can get its full prof path
	var pidsNotInIni = []; // holding them as strings
	
	var pidsInIni = []; // holding them as strings
	for (var i=0; i<gIniObj.length; i++) {
		if (gIniObj[i].Path && gIniObj[i].noWriteObj.status) {
			pidsInIni.push(gIniObj[i].noWriteObj.status + '');
		}
	}
	
	for (var pid in pidSnapshot) {
		if (pidsInIni.indexOf(pid + '') == -1) {
			pidsNotInIni.push(pid);
		}
	}
	
	// pidsNotInIni = pidsInIni; // :debug:
	// pidsNotInIni.splice(pidsNotInIni.indexOf(core.firefox.pid + ''), 1); // :debug: i have to make sure the current pid is not in there, as WINNT duplicates handle, so it will make the mem all messy
	console.log('pidsNotInIni:', pidsNotInIni);
	
	if (pidsNotInIni.length == 0) {
		console.timeEnd('adoptOrphanTempProfs');
		return 0; // no new temp profiles found
	}
	
	// figure out parent.lock / .parentlock file path for each pid in pidsNotInIni, from which i can get its full prof path
	console.time('populate lockPlatPath');
	var lockPlatPath = {}; // key is pid, value is parent lock platform path
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				// step - collect all handles for each pid
				console.time('collect handles per pid');
				var handlesForPid = {}; // key is pid, value is array of handles
				for (var i=0; i<pidsNotInIni.length; i++) {
					handlesForPid[pidsNotInIni[i]] = [];
				}
				
				var bufferNtQrySysProcs = ostypes.TYPE.BYTE.array(0)();
				var enumBufSizeNtQrySysProcs = ostypes.TYPE.ULONG(bufferNtQrySysProcs.constructor.size);
				// console.log('sizof(bufferNtQrySysProcs):', bufferNtQrySysProcs.constructor.size);
				
				var cntQuery = 0;
				var rez_ntqrysysprocs;
				console.time('queries');
				while (true) {
					rez_ntqrysysprocs = ostypes.API('NtQuerySystemInformation')(ostypes.CONST.SystemExtendedHandleInformation, bufferNtQrySysProcs, enumBufSizeNtQrySysProcs, enumBufSizeNtQrySysProcs.address());
					cntQuery++;
					// console.log('rez_ntqrysysprocs:', rez_ntqrysysprocs);
					// console.log('rez_ntqrysysprocs jscGetDeepest:', cutils.jscGetDeepest(rez_ntqrysysprocs));
					// console.log('ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH jscGetDeepest:', cutils.jscGetDeepest(ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH));
					if (cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_BUFFER_TOO_SMALL) || cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH)) {
						console.log('last buf size:', bufferNtQrySysProcs.constructor.size);
						console.log('new buf size:', parseInt(cutils.jscGetDeepest(enumBufSizeNtQrySysProcs)));
						if (cntQuery == 3) {
							// because on first query, buf size is 0, so it just tells us the size to use for SYSTEM_HANDLE_INFORMATION_EX, which will be ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.size HAVING ONLY ONE ELEMENT IN THE HANDLES ARR (as thats how its defined) in enumBufSizeNtQrySysProcs which is 36 on my win10 --- buf size is still 0 at this point
							// on second query, it does not populate the array Handles in the field of SYSTEM_HANDLE_INFORMATION_EX, it just populates the NumberOfHandles field and tells us how mauch the size of buf should be to get them all in enumBufSizeNtQrySysProcs --- buf size is still 36 at this point
							// on third query it populates the Handles array field
							// on greater then thid query, if i keep getting STATUS_BUFFER_TOO_SMALL or STATUS_INFO_LENGTH_MISMATCH thats because the number of the handles on the system is changing every millisecond it seems, but only a few, so the count might increase by 1 or 2 handles (which causes this too small error), or it might decrease by 1 or 2 (which causes the mismatch error) - but my target handle is not one of these new handles so i dont care to query more
							break; // because i dont need the very last handles that are changing every nanosecond or so
						}
						bufferNtQrySysProcs = ostypes.TYPE.BYTE.array(parseInt(cutils.jscGetDeepest(enumBufSizeNtQrySysProcs)))();
						// console.log('increasing bufferNtQrySysProcs size and NtQuery-ing again');
					} else break;
				}
				console.timeEnd('queries');
				
				// if (parseInt(cutils.jscGetDeepest(rez_ntqrysysprocs)) < 0) {
				if (!cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_SUCCESS) && !cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_BUFFER_TOO_SMALL) && !cutils.jscEqual(rez_ntqrysysprocs, ostypes.CONST.STATUS_INFO_LENGTH_MISMATCH)) {
					console.error('failed to NtQry, getStrOfResult:', ostypes.HELPER.getStrOfResult(parseInt(cutils.jscGetDeepest(rez_ntqrysysprocs))));
					return null;
				}
				
				// have to figure out real number of handles as i dont lop cntQuery until it doesnt get "STATUS_BUFFER_TOO_SMALL" or "STATUS_INFO_LENGTH_MISMATCH"				
				
				// the number of handles that are actually available
				var cntHandlesActual = parseInt(cutils.jscGetDeepest(ctypes.cast(bufferNtQrySysProcs.addressOfElement(0), ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.fields[0].NumberOfHandles.ptr).contents));
				// cntHandles -= 1000;
				console.log('cntHandlesActual:', cntHandlesActual);
				
				// the number of handles i have, based on the size
				var cntHandlesSize = (bufferNtQrySysProcs.constructor.size - ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.fields[0].NumberOfHandles.size - ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.fields[1].Reserved.size) / ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size;
				console.log('cntHandlesSize:', cntHandlesSize);
				
				// what i actually am holding in buffer. i cannot read more then the size. but if actually available is less then the size. then that is my cntHandles
				var cntHandles = Math.min(cntHandlesActual, cntHandlesSize);
				console.log('cntHandles:', cntHandles);
				
				// var sizeOf_entryObject = ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.fields[0].Object.size;
				// var UniqueProcessIdPtr = ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.fields[1].UniqueProcessId.ptr;
				
				/*
				// "method b" - crashing i have no idea why
				var cEntryOffset = (ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.size - (ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size * 1)); // as i declared the structure as having an element of 1 in the array
				var Handles = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.array(cntHandles).ptr).contents;
				var pidObj = {};
				for (var i=0; i<cntHandles; i++) {
					// var cPID = cutils.jscGetDeepest(Handles[i].UniqueProcessId);
					var cPID = Handles[i].UniqueProcessId.toString();
					pidObj[cPID] = true;
				}
				console.log('pidObj:', pidObj);
				*/
				
				/*
				// "method a" - not crashing ah!
				var pidObj = {};
				var cEntryOffset = (ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.size - (ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size * 1)); // as i declared the structure as having an element of 1 in the array
				var iHandle = 0;
				while (iHandle < cntHandles) {
					var cHandleInfoObj = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr).contents;
					var cPid = cHandleInfoObj.UniqueProcessId.toString();
					// console.log('cPid:', cPid);
					pidObj[cPid] = true;
					cEntryOffset += ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size;
					iHandle++;
				}
				console.log('pidObj:', pidObj);
				*/
				
				// "method a optimized" - average is 20ms less then "method a"
				var sizeOf_entry = ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size
				var ptrOf_entry = ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr;
				
				var cEntryOffset = (ostypes.TYPE.SYSTEM_HANDLE_INFORMATION_EX.size - (ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size * 1)); // as i declared the structure as having an element of 1 in the array
				var iHandle = 0;
				while (iHandle < cntHandles) {
					var cHandleInfoObj = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ptrOf_entry).contents;
					var cPid = cHandleInfoObj.UniqueProcessId.toString();
					// console.log('cPid:', cPid);
					if (cPid in handlesForPid) {
						handlesForPid[cPid].push(cHandleInfoObj.HandleValue);
					}
					cEntryOffset += sizeOf_entry;
					iHandle++;
				}
				console.log('handlesForPid:', handlesForPid);
				
				/*
				// "method c" - cast whole thing to array, like "method a" but turn it to string then do index of to get stuff - i hate this
				var Handles = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.array(cntHandles).ptr).contents;
				var HandlesAsStr = Handles.toString();
				console.log('HandlesAsStr ending:', HandlesAsStr.substr(HandlesAsStr.length - 1000));
				var pidObj = {};
				var lastEntryIndex = -1;
				// for (var i=0; i<cntHandles; i++) {
				for (var i=0; i<cntHandles; i++) {
					// console.log('cEntryOffset:', cEntryOffset);
					var cEntryIndex = HandlesAsStr.indexOf('{"Object":', lastEntryIndex);
					lastEntryIndex = cEntryIndex;
					
					var cPIDIndex = HandlesAsStr.indexOf('UniqueProcessId": ctypes.UInt64("', cEntryIndex);
					var cPIDEndIndex = HandlesAsStr.indexOf(')', cPIDIndex);
					
					// var cHandleInfoObj = ctypes.cast(bufferNtQrySysProcs.addressOfElement(cEntryOffset), ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr).contents;
					// var cPid = Handles[i].UniqueProcessId.toString();
					// pidObj[cPid] = true;
					// var cPID = cutils.jscGetDeepest(cHandleInfoObj.UniqueProcessId);
					// cEntryOffset += ostypes.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.size;
				}
				console.log('pidObj:', pidObj);
				*/
				console.timeEnd('collect handles per pid');
				
				// step - check the file path on each handle until you find parent.lock
				console.time('find parent.lock handle');
				
				var currentProcessHandle = ostypes.API('GetCurrentProcess')(); // https://msdn.microsoft.com/en-us/library/windows/desktop/ms683179%28v=vs.85%29.aspx - "The pseudo handle need not be closed when it is no longer needed. Calling the CloseHandle function with a pseudo handle has no effect. If the pseudo handle is duplicated by DuplicateHandle, the duplicate handle must be closed." // link9999993338383
				
				// i use currentProcessHandle with DuplicateHandle and the docs say - https://msdn.microsoft.com/en-us/library/windows/desktop/ms724251%28v=vs.85%29.aspx - "If hSourceHandle is a pseudo handle returned by GetCurrentProcess or GetCurrentThread, DuplicateHandle converts it to a real handle to a process or thread, respectively." - so I must close handle on this when I am done // link9999993338383
				
				var isb = ostypes.TYPE.IO_STATUS_BLOCK();
				var fni = ostypes.TYPE.FILE_NAME_INFORMATION();
				
				for (var pid in handlesForPid) {
					var openedProcHandle = ostypes.API('OpenProcess')(ostypes.CONST.PROCESS_DUP_HANDLE | ostypes.CONST.PROCESS_QUERY_INFORMATION, false, parseInt(pid));
					console.log('openedProcHandle:', openedProcHandle);
					try {
						var lockFound = false;
						for (var i=0; i<handlesForPid[pid].length; i++) {
							// not cFileHandle as it may not be a file-handle but some other kind of handle.
							var cObjHandle = ostypes.TYPE.HANDLE();
							// i always have to DuplicateHandle because I never run this code on pid that is self. there is absolutely no reason for that, I can easily get the lockPlatPath for the currentProfile. if i did run on currentProfile then i would have to NOT duplicateHandle for self proc
							var rez_duplicateHandle = ostypes.API('DuplicateHandle')(openedProcHandle, ostypes.TYPE.HANDLE(handlesForPid[pid][i]), currentProcessHandle, cObjHandle.address(), 0, false, ostypes.CONST.DUPLICATE_SAME_ACCESS); // link9999993338383
							// console.log('rez_duplicateHandle:', rez_duplicateHandle);
							if (!rez_duplicateHandle) {
								// console.error('Failed to duplicate handle! so will skip this one. winLastError:', ctypes.winLastError, 'handle:', ostypes.TYPE.HANDLE(handlesForPid[pid][i]));
								// throw new Error('Failed to duplicate handle!');
								handlesForPid[pid][i] = 'failed to duplicate, skipped - winLastError: ' + ctypes.winLastError; // :debug:
							} else {
								// cObjHandle holds a usable handle
								var rez_qiPath = ostypes.API('NtQueryInformationFile')(cObjHandle, isb.address(), fni.address(), ostypes.TYPE.FILE_NAME_INFORMATION.fields[1].FileName.size, ostypes.CONST.FileNameInformation);
								// console.log('rez_qiPath:', rez_qiPath);
								
								if (cutils.jscEqual(rez_qiPath, ostypes.CONST.STATUS_SUCCESS)) {
									var cRelSysPath = fni.FileName.readString();
									if (cRelSysPath.indexOf('parent.lock') > -1) {
										lockFound = true;
										
										var nqoReturnLength = ostypes.TYPE.ULONG();
										var rez_qoSize = ostypes.API('NtQueryObject')(cObjHandle, ostypes.CONST.ObjectNameInformation, null, 0, nqoReturnLength.address())
										
										console.log('nqoReturnLength:', nqoReturnLength);
										
										var j_nqoReturnLength = parseInt(cutils.jscGetDeepest(nqoReturnLength)); // actual size of the information requested

										// method
										var nqoBufSize = j_nqoReturnLength;
										var nqoBuf = ostypes.TYPE.BYTE.array(nqoBufSize)();
										console.warn('nqoBuf.constructor.size:', nqoBuf.constructor.size);
										
										// method
										// var nqoBufSize = j_nqoReturnLength;
										// var nqoBufLength = nqoBufSize / ostypes.TYPE.OBJECT_NAME_INFORMATION.fields[0].Name.fields[2].Buffer.size;
										// var nqoBuf = ostypes.TYPE.OBJECT_NAME_INFORMATION();
										// nqoBuf.Name.Length = nqoBufLength;
										// nqoBuf.Name.MaximumLength = nqoBufLength;
										// nqoBuf.Name.Buffer = ostypes.TYPE.OBJECT_NAME_INFORMATION.fields[0].Name.fields[2].Buffer.targetType.array(nqoBufLength)();
										
										var rez_qoBuf = ostypes.API('NtQueryObject')(cObjHandle, ostypes.CONST.ObjectNameInformation, nqoBuf, nqoBufSize, nqoReturnLength.address()) // i have to do ostypes.TYPE.OBJECT_NAME_INFORMATION.fields[0].Name.fields[2].Buffer.size because i cant access size once i make something like ctypes.jschar(10)() nor can i access its length. because i cant access length i `* j_nqoReturnLength`
										console.log('rez_qoBuf:', rez_qoBuf);
										
										// var UNICODE_STRING_pad = ctypes.StructType('UNICODE_STRING_pad', [
										// 	{ 'Length': ostypes.TYPE.USHORT },
										// 	{ 'MaximumLength': ostypes.TYPE.USHORT },
										// 	{ 'no_idea_1': ostypes.TYPE.USHORT },
										// 	{ 'no_idea_2': ostypes.TYPE.USHORT },
										// 	{ 'Buffer': ostypes.TYPE.PWSTR }
										// ]);
										// var nqoBuf_casted = ctypes.cast(nqoBuf.address(), ostypes.UNICODE_STRING_pad.ptr).contents; // works
										// var nqoBuf_casted = ctypes.cast(nqoBuf, ostypes.TYPE.UNICODE_STRING.ptr).contents; // this crashes it
										// var nqoBuf_casted = ctypes.cast(nqoBuf.address(), ostypes.TYPE.UNICODE_STRING.ptr).contents; // works - i have to use .address() - i saw i didnt have to use .address() if i wanted to cast to something that doesnt contain a .ptr, the ostypes.TYPE.PWSTR is a .ptr so i think thats why

										var nqoBuf_casted = ctypes.cast(nqoBuf.address(), ostypes.TYPE.OBJECT_NAME_INFORMATION.ptr).contents;
										console.log('nqoBuf_casted:', nqoBuf_casted);
										
										console.log('nqoBuf_casted.Name.Length:', nqoBuf_casted.Name.Length); // size of Buffer in bytes
										console.log('nqoBuf_casted.Name.MaximumLength:', nqoBuf_casted.Name.MaximumLength); // size of Buffer in bytes plus 2 bytes for null terminator it seems -- it seems if Buffer is null terminated, then MaximumLength is 2 bytes bigger in size then Length. i have not encountered a nno-null terminated Buffer yet so I cant say for sure.
										console.log('nqoBuf_casted.Name.Buffer:', nqoBuf_casted.Name.Buffer);
										
										var bufferLength = parseInt(nqoBuf_casted.Name.Length) / nqoBuf_casted.Name.Buffer.constructor.targetType.size;
										bufferLength += 2; // i have no idea why, but there are 4 bytes of junk between MaximumLength and Buffer, see method "individ cast" below
										var bufferCasted = ctypes.cast(nqoBuf_casted.Name.Buffer.address(), nqoBuf_casted.Name.Buffer.constructor.targetType.array(bufferLength).ptr).contents;
										console.log('bufferCasted:', bufferCasted);
										console.log('readString:', bufferCasted.readString());
										console.log('readString shifted:', bufferCasted.readString().substring(2));
										
										// // method - individ cast
										// var lengthOfBuffer = nqoBufSize / ostypes.TYPE.WCHAR.size;
										// console.log('lengthOfBuffer:', lengthOfBuffer);
										// var nqoBuf_casted_ushort = ctypes.cast(nqoBuf.address(), ostypes.TYPE.USHORT.array(lengthOfBuffer).ptr).contents;
										// console.log('nqoBuf_casted_ushort:', nqoBuf_casted_ushort);
										// var nqoBuf_casted = ctypes.cast(nqoBuf.address(), ostypes.TYPE.WCHAR.array(lengthOfBuffer).ptr).contents;
										// console.log('nqoBuf_casted:', nqoBuf_casted);
										// console.log('nqoBuf_casted readString:', nqoBuf_casted.readString());
										// 
										// // nqoBuf.constructor.size: 128 MainWorker.js:3666:12
										// // rez_qoBuf: 0 MainWorker.js:3677:12
										// // lengthOfBuffer: 64 MainWorker.js:3681:12
										// // nqoBuf_casted_ushort: ctypes.unsigned_short.array(64)([118, 120, 43784, 9336, 92, 68, 101, 118, 105, 99, 101, 92, 72, 97, 114, 100, 100, 105, 115, 107, 86, 111, 108, 117, 109, 101, 49, 92, 80, 114, 111, 103, 114, 97, 109, 32, 70, 105, 108, 101, 115, 32, 40, 120, 56, 54, 41, 92, 77, 111, 122, 105, 108, 108, 97, 32, 70, 105, 114, 101, 102, 111, 120, 0]) MainWorker.js:3683:12
										// // nqoBuf_casted: ctypes.char16_t.array(64)(["v", "x", "\uAB08", "\u2478", "\\", "D", "e", "v", "i", "c", "e", "\\", "H", "a", "r", "d", "d", "i", "s", "k", "V", "o", "l", "u", "m", "e", "1", "\\", "P", "r", "o", "g", "r", "a", "m", " ", "F", "i", "l", "e", "s", " ", "(", "x", "8", "6", ")", "\\", "M", "o", "z", "i", "l", "l", "a", " ", "F", "i", "r", "e", "f", "o", "x", "\x00"]) MainWorker.js:3685:12
										// // nqoBuf_casted readString: vx꬈⑸\Device\HarddiskVolume1\Program Files (x86)\Mozilla Firefox
										// // 
										// // nqoBuf.constructor.size: 134 MainWorker.js:3666:12
										// // rez_qoBuf: 0 MainWorker.js:3677:12
										// // lengthOfBuffer: 67 MainWorker.js:3681:12
										// // nqoBuf_casted_ushort: ctypes.unsigned_short.array(67)([124, 126, 712, 9543, 92, 68, 101, 118, 105, 99, 101, 92, 72, 97, 114, 100, 100, 105, 115, 107, 86, 111, 108, 117, 109, 101, 49, 92, 87, 105, 110, 100, 111, 119, 115, 92, 82, 101, 103, 105, 115, 116, 114, 97, 116, 105, 111, 110, 92, 82, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 100, 46, 99, 108, 98, 0]) MainWorker.js:3683:12
										// // nqoBuf_casted: ctypes.char16_t.array(67)(["|", "~", "\u02C8", "\u2547", "\\", "D", "e", "v", "i", "c", "e", "\\", "H", "a", "r", "d", "d", "i", "s", "k", "V", "o", "l", "u", "m", "e", "1", "\\", "W", "i", "n", "d", "o", "w", "s", "\\", "R", "e", "g", "i", "s", "t", "r", "a", "t", "i", "o", "n", "\\", "R", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "d", ".", "c", "l", "b", "\x00"]) MainWorker.js:3685:12
										// // nqoBuf_casted readString: |~ˈ╇\Device\HarddiskVolume1\Windows\Registration\R00000000000d.clb
										// // 
										// // nqoBuf.constructor.size: 228 MainWorker.js:3666:12
										// // rez_qoBuf: 0 MainWorker.js:3677:12
										// // lengthOfBuffer: 114 MainWorker.js:3681:12
										// // nqoBuf_casted_ushort: ctypes.unsigned_short.array(114)([218, 220, 54472, 8554, 92, 68, 101, 118, 105, 99, 101, 92, 72, 97, 114, 100, 100, 105, 115, 107, 86, 111, 108, 117, 109, 101, 49, 92, 85, 115, 101, 114, 115, 92, 77, 101, 114, 99, 117, 114, 105, 117, 115, 92, 65, 112, 112, 68, 97, 116, 97, 92, 82, 111, 97, 109, 105, 110, 103, 92, 77, 111, 122, 105, 108, 108, 97, 92, 70, 105, 114, 101, 102, 111, 120, 92, 80, 114, 111, 102, 105, 108, 101, 115, 92, 52, 104, 114, 97, 113, 115, 113, 120, 46, 100, 101, 102, 97, 117, 108, 116, 92, 112, 97, 114, 101, 110, 116, 46, 108, 111, 99, 107, 0]) MainWorker.js:3683:12
										// // nqoBuf_casted: ctypes.char16_t.array(114)(["\xDA", "\xDC", "\uD4C8", "\u216A", "\\", "D", "e", "v", "i", "c", "e", "\\", "H", "a", "r", "d", "d", "i", "s", "k", "V", "o", "l", "u", "m", "e", "1", "\\", "U", "s", "e", "r", "s", "\\", "M", "e", "r", "c", "u", "r", "i", "u", "s", "\\", "A", "p", "p", "D", "a", "t", "a", "\\", "R", "o", "a", "m", "i", "n", "g", "\\", "M", "o", "z", "i", "l", "l", "a", "\\", "F", "i", "r", "e", "f", "o", "x", "\\", "P", "r", "o", "f", "i", "l", "e", "s", "\\", "4", "h", "r", "a", "q", "s", "q", "x", ".", "d", "e", "f", "a", "u", "l", "t", "\\", "p", "a", "r", "e", "n", "t", ".", "l", "o", "c", "k", "\x00"]) MainWorker.js:3685:12
										// // nqoBuf_casted readString: ÚÜ퓈Ⅺ\Device\HarddiskVolume1\Users\Mercurius\AppData\Roaming\Mozilla\Firefox\Profiles\4hraqsqx.default\parent.lock
										
										var cFullSysPath = bufferCasted.readString().substring(2); // this gives - "\Device\HarddiskVolume1\Users\Mercurius\AppData\Roaming\Mozilla\Firefox\Profiles\4hraqsqx.default\parent.lock"
										lockPlatPath[pid] = cFullSysPath;
									}
									handlesForPid[pid][i] = cRelSysPath; // this gives - "\Users\Mercurius\AppData\Roaming\Mozilla\Firefox\Profiles\4hraqsqx.default\parent.lock"
								} else {
									// i seem to get lots of ```Failed to read path of handle for pid: 3864 handle index: 16 error rez_qiPath: -1073741788 getStrOfResult: Object { strPrim: "0xc0000024", NTSTATUS: "STATUS_OBJECT_TYPE_MISMATCH" }``` - i guess this means its not a file-handle but some other kind of handle
									// console.error('Failed to read path of handle for pid:', pid, 'handle index:', i, 'error rez_qiPath:', cutils.jscGetDeepest(rez_qiPath), 'getStrOfResult:', ostypes.HELPER.getStrOfResult(parseInt(cutils.jscGetDeepest(rez_qiPath))));
									handlesForPid[pid][i] = ostypes.HELPER.getStrOfResult(parseInt(cutils.jscGetDeepest(rez_qiPath))).NTSTATUS; // :debug:
								}
								
								// release duplicated handle
								var closeObjHandle = ostypes.API('CloseHandle')(cObjHandle);
								// console.log('closeObjHandle:', closeObjHandle);
								if (!closeObjHandle) {
									console.error('failed to close OBJ handle, this is probably a bad deal for mem, winLastError:', ctypes.winLastError);
									throw new Error('this should never happen, it should close handle');
								}
								
								// if lockFound
								if (lockFound) {
									console.error('ok gooooood - lockFound so breaking, will go onto next pid');
									break;
								}
							}
						}
					} finally {
						var closeProcHandle = ostypes.API('CloseHandle')(openedProcHandle);
						// console.log('closeProcHandle:', closeProcHandle);
						if (!closeProcHandle) {
							console.error('failed to close PROC handle, this is probably a bad deal for mem, winLastError:', ctypes.winLastError);
							throw new Error('this should never happen, it should close handle');
						}
					}
				}
				
				var rez_closeCurProcHandle = ostypes.API('CloseHandle')(currentProcessHandle); // i have to close it because DuplicateHandle converts it to a real handle, and the docs say when its a real handle i should close it. if it wasnt converted, to a real handle, then CloseHandle has no effect, so lets just be safe // link9999993338383
				// console.log('rez_closeCurProcHandle:', rez_closeCurProcHandle);
				if (!rez_closeCurProcHandle) {
					console.warn('failed to close handle on currentProcessHandle, this is no big deal see links of link9999993338383', 'winLastError:', ctypes.winLastError);
				}
				
				console.info('handlesForPid after converting to paths:', handlesForPid);
				
				console.timeEnd('find parent.lock handle');
				// typical dump of finding parent.lock is here:
					// C:\Users\Mercurius\Pictures\enum-handles-read-paths-dump-win10-fx45.png
					// average time is 35ms per pid
				console.log('lockPlatPath with full sys path (NOT PLAT PATH):', lockPlatPath);
				
				console.time('convert nt path');
				// convert lockPlat full sys path to proper plat path
				for (var pid in lockPlatPath) {
					lockPlatPath[pid] = winGetDosPathFromNtPath(lockPlatPath[pid]);
				}
				console.timeEnd('convert nt path');
				console.log('lockPlatPath after nt conversion:', lockPlatPath);
				
			break;
		case 'gtk':
		case 'darwin':

				
				var cReadChunks = {
					chunkSize: 1000
				};
				var rez_lsof = unixSubprocess('lsof -p ' + pidsNotInIni.join(',') + ' | grep .parentlock', {
					readChunks: cReadChunks
				});
				console.log('rez_lsof:', rez_lsof);
				console.log('cReadChunks:', cReadChunks);
				
				if (rez_lsof === 0) {
					// Mac OS X 10.10.1
						// "firefox 1527 noida    4w     REG                1,2         0 414826 /Users/noida/Library/Application Support/Firefox/Profiles/1sd3b67o.default/.parentlock"
						// "firefox 1558 noida    4w     REG                1,2         0 419056 /Users/noida/Library/Application Support/Firefox/Profiles/d62n1gi5.Unnamed Profile 1/.parentlock"
						
					// Ubunut 15.01
						// "firefox 9194  noi   11wW     REG                8,1        0  926487 /home/noi/.mozilla/firefox/hrupz8x8.Unnamed Profile 1/.parentlock"
						// "firefox 9259  noi   11wW     REG                8,1        0  926895 /home/noi/.mozilla/firefox/wt6j8vm4.Unnamed Profile 1/.parentlock"
					
					for (var i=0; i<pidsNotInIni.length; i++) {
						var indexOfPid = cReadChunks.contents.indexOf('firefox ' + pidsNotInIni[i]);
						if (indexOfPid == -1) {
							// this can happen. like when i ran ```jpm run -b "/usr/lib/firefox/firefox"``` this was found in ps: "node /usr/local/bin/jpm run -b /usr/lib/firefox/firefox"
							continue;
						}
						var indexOfPath = cReadChunks.contents.indexOf(' /', indexOfPid);
						var indexOfParentlock = cReadChunks.contents.indexOf('/.parentlock', indexOfPath);
						lockPlatPath[pidsNotInIni[i]] = cReadChunks.contents.substring(indexOfPath + 1, indexOfParentlock + 12);
					}
				} // else {
					// on both ubutnu and mac, if i get no results for those pid, it comes back rez_lsof is 256
					// this happens, when firefox pid is found for firefox profile manager is open but profile hasnt been selected/started yet
					// :todo: test on linux (already tested on mac)
				// }
					
			break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	console.timeEnd('populate lockPlatPath');
	console.log('lockPlatPath:', lockPlatPath);
	
	// create new ini entry for each and push to gIniObj
	var nextProfNum = getNextProfNum(gIniObj);
	nextProfNum--;
	var cntTempProfsFound = 0;
	for (var pid in lockPlatPath) {
		nextProfNum++;
		cntTempProfsFound++;
		var cLockPlatPath = lockPlatPath[pid];
		var cFullPathToProfileDir = OS.Path.dirname(cLockPlatPath);
		var newIniEntry = {
			groupName: 'TempProfile' + nextProfNum,
			Name: OS.Path.basename(cFullPathToProfileDir),
			IsRelative: OS.Path.dirname(cFullPathToProfileDir) == core.profilist.path.defProfRt ? '1' : '0',
			// Path: cFullPathToProfileDir // depends on IsRelative
			noWriteObj: {
				temporaryProfile: true,
				status: parseInt(pid)
			}
		};

		newIniEntry.Path = newIniEntry.IsRelative === '0' ? cFullPathToProfileDir : getRelativeDescriptor(cFullPathToProfileDir, OS.Constants.Path.userApplicationDataDir);
		
		// no need to format whole gIniObj as per link8393938311 - ACTUALLY the more important reason for this being enough level of formatting is link18384394949050
		
		console.log('newIniEntry:', newIniEntry);
		
		gIniObj.push(newIniEntry);
	}
	
	if (cntTempProfsFound && !aOptions.dontWriteIni) {
		writeIni();
	}
	
	console.timeEnd('adoptOrphanTempProfs');
	
	return cntTempProfsFound;
}
// End - Addon Functionality

// START - platform helpers
function winRegistryRead(aHkeyGroup, aKeyDirPath, aKeyName) {
	// aHkeyGroup - string; "HKEY_LOCAL_MACHINE", "HKEY_CURRENT_USER", no others are supported
	// aKeyDirPath - string; with double back slash - like "Hardware\\DeviceMap\\SerialComm"
	// aKeyName - string; like "\\Device\\Serial0"
	
	// returns
		// cKeyValue as string -- curently max length returned is 50 link90000000000
		// else on error it throws
		// else if it doesnt exist it returns null
	
	var h_Key = ostypes.TYPE.HKEY();
	var rez_openKey = ostypes.API('RegOpenKeyEx')(ostypes.CONST[aHkeyGroup], aKeyDirPath, 0, ostypes.CONST.KEY_QUERY_VALUE, h_Key.address());
	if (!cutils.jscEqual(rez_openKey, ostypes.CONST.ERROR_SUCCESS)) {
		console.error('failed opening registry key:', cutils.jscGetDeepest(rez_openKey));
		throw new Error('failed opening registry key');
	}
	
	var cKeyValue;
	try {
		var u16_cKeyData = ostypes.TYPE.WCHAR.array(50)(); // link90000000000
		
		var u32_Type = ostypes.TYPE.DWORD();
		var u32_Size = ostypes.TYPE.DWORD(u16_cKeyData.constructor.size);
		
		var u16_cKeyData_castedAsByte = ctypes.cast(u16_cKeyData.address(), ostypes.TYPE.BYTE.ptr);
		
		// var a = ctypes.jschar.array(50)(); // CData { length: 50 }
		// var ac = ctypes.cast(a.address(), ctypes.char.array(a.constructor.size / ctypes.char.size).ptr).contents; // CData { length: 100 }
		
		var rez_queryKey = ostypes.API('RegQueryValueEx')(h_Key, aKeyName, null, u32_Type.address(), u16_cKeyData_castedAsByte, u32_Size.address());
		if (!cutils.jscEqual(rez_queryKey, ostypes.CONST.ERROR_SUCCESS)) {
			if (cutils.jscEqual(rez_queryKey, ostypes.CONST.ERROR_FILE_NOT_FOUND)) {
				// if it is 2 then the value of u16_NTPath doesnt exist in this registry, its common to registry querying
				console.warn('this aKeyName does not exist at aKeyDirPath in aHkeyGroup so returning null.', aHkeyGroup, aKeyDirPath, aKeyName);
				cKeyValue = null;
			} else {
				console.error('failed querying registry key:', cutils.jscGetDeepest(rez_queryKey));
				throw new Error('failed querying registry key');
			}
		} else {
			cKeyValue = u16_cKeyData.readString();
		}
	} finally {
		var rez_closeKey = ostypes.API('RegCloseKey')(h_Key);
		if (!cutils.jscEqual(rez_closeKey, ostypes.CONST.ERROR_SUCCESS)) {
			console.error('failed closing registry key:', cutils.jscGetDeepest(rez_closeKey));
			throw new Error('failed closing registry key');
		}
		else { console.log('closed key'); }
	}
	
	return cKeyValue;
}
function unixSubprocess(aCmd, aOptions={}) {
	// for unix based systems only
	
	// RETURNS
		// aOptions.dontWaitExit == true
			// exit code of process
		// else
			// undefined
	
	// if the aCmd returns nothing and aOptions.readChunks was supplied, if nothing read, then no `contents` key exists
	
	console.log('starting unixSubprocess with aCmd:', aCmd);
	console.time('unixSubprocess');
	
	var cOptionsDefaults = {
		readChunks: null, // either not set OR an object. see cReadChunksDefaults for more info
		dontWaitExit: false // if you do set readChunks true though, it will wait till it gets to end of file. and i think exit happens immeidately after reaching eof. so if you set readChunks, i think setting dontWaitExit is pointless
	};
	
	validateOptionsObj(aOptions, cOptionsDefaults);
	
	if (aOptions.readChunks) {
		cReadChunksDefaults = {
			chunkSize: 100, // (number) default chunk size - bigger the chunk size, the less amount of times ill have to fread to get all data thats the theory
			dontTestEof: 0, // (number) if set to > 0, then it will return return when done reading, it will wait for at least 1 char though. otherwise if it didReadAnything is false this many times then it breaks
			chunks: [], // NOT USER OPTION - set default for programttic use - array of chunks read
			// contents: '' // this is only set if somethign was succesfully read // NOT USER OPTION - set default string of chunks read
		};
		validateOptionsObj(aOptions.readChunks, cReadChunksDefaults)
	}
	
				//
				/*
				// method - totally fail
				if (sA) {
					var popenFile = ostypes.API('popen')('/bin/bash -c /bin/ps aux > ' + sA.replace(/\W/g, '\\$&'), 'r');
				} else {
					var popenFile = ostypes.API('popen')('/bin/bash -c /bin/ps aux', 'r');
				}
				console.log('popenFile:', popenFile);

				var popenBufSize = 1000;
				var popenBuf = ostypes.TYPE.char.array(popenBufSize)(''); // i just picked 1000, you can do however much you want
				
				var redChunks = [];
				var redSize = popenBufSize;
				var i = 0;
				while (redSize == popenBufSize) {
					console.log('i:', i);
					i++;
					redSize = ostypes.API('fread')(popenBuf, 1, popenBufSize, popenFile); // ostypes.TYPE.char.size is 1
					redChunks.push(popenBuf.readString().substring(0, redSize));
				}
				
				console.log('redChunks:', redChunks);
				
				var rez_plcose = ostypes.API('pclose')(popenFile); // waits for process to exit
				console.log('rez_plcose:', cutils.jscGetDeepest(rez_plcose));
				
				var redRows = redChunks.join('').split('\n');
				*/
				
					/*
					// method - popen fread first_char_known - this loops forever if the command returns nothing such as pgrep with something that has no processes
					// submethod - pgrep --- with \x01 - this works good if data will eventually return by popen. however if no data returns, then this will loop forever
					var popenFile = ostypes.API('popen')('/bin/bash -c "pgrep -u "$(whoami)" -l ' + (aOptions.firefoxOnly ? 'firefoxx' : '.') + '"', 'r');
					console.log('popenFile:', popenFile);

					var popenBufSize = 50;
					var popenBuf = ostypes.TYPE.char.array(popenBufSize)('\x01'); // i just picked 1000, you can do however much you want
					
					// var rez_fgets = ostypes.API('fgets')(popenBuf, popenBufSize, popenFile);
					// console.log('rez_fgets:', rez_fgets);
					
					// console.log('popenBuf:', popenBuf.readString());
					
					var redChunks = [];
					var redSize = popenBufSize;
					var i = 0;
					while (redSize == popenBufSize || popenBuf[0] == 1) {
						console.log('i:', i);
						i++;
						redSize = ostypes.API('fread')(popenBuf, 1, popenBufSize, popenFile); // ostypes.TYPE.char.size is 1
						console.log('redSize:', redSize, 'popenBuf:', popenBuf);
						redChunks.push(popenBuf.readString().substring(0, redSize));
					}
					console.log('redChunks:', redChunks.join(''));
					
					
					var rez_plcose = ostypes.API('pclose')(popenFile); // waits for process to exit
					console.log('rez_plcose:', cutils.jscGetDeepest(rez_plcose));
					*/
					
	// method - popen fread feof
	
	var popenFile = ostypes.API('popen')(aCmd, 'r');
	// console.log('popenFile:', popenFile);
	// :todo: error handling if popen fails
	var cntDidNotReadAnything = 0; // number of times it did not read anything
	
	if (aOptions.readChunks) {
		var popenBuf;
		if (aOptions.dontTestEof) {
			popenBuf = ostypes.TYPE.char.array(aOptions.readChunks.chunkSize)();
		} else {
			popenBuf = ostypes.TYPE.char.array(aOptions.readChunks.chunkSize)('\x01'); // first_char_known method
		}
		// the \x01 first char (known first char method) doesnt work because if the command returns nothing, then it will loop forever as buf is never updated as it always reads 0
		
		var i = 0;
		var reachedEof;
		if (!aOptions.readChunks.dontTestEof) {
			var didReadAnything = false; // can just use the length of aOptions.readChunks.chunks to determine if anything read, but this var name just makes things clearer
		}
		while (!reachedEof) {
			// console.log('i:', i);
			i++;
			
			redSize = ostypes.API('fread')(popenBuf, 1, aOptions.readChunks.chunkSize, popenFile); // ostypes.TYPE.char.size is 1, hence 1 for second arg
			// console.log('redSize:', redSize, redSize.toString());
			redSize = parseInt(redSize); // have to parseInt as fread returns a ctypes.size_t which is wrapped in UInt64 - at least on my Ubuntu 15.02 testing							
			// console.log('redSize:', redSize);
			
			if (redSize !== 0) { // i cant do redSize as ctypes.size_t is wrapped in ctypes.UInt64 - at least on ubuntu
				didReadAnything = true;
				aOptions.readChunks.chunks.push(popenBuf.readString().substring(0, redSize)); // need substring, as i am reusing a buffer, and the read doesnt return null terminated.
			}
			
			if (!aOptions.readChunks.dontTestEof) {
				if (redSize != aOptions.readChunks.chunkSize) {
					reachedEof = ostypes.API('feof')(popenFile); // returns non-zero if reached eof
					console.log('reachedEof:', reachedEof);
				} // else dont even bother check if reachedEof as there is very likely more to read. if it read > 0 and < popenBufSize then likely no more to read, but it could be the process is still running so check eof. if read 0 then definitely check if reached eof
			} else {
				if (!didReadAnything) { // synonomous with if (!aOptions.readChunks.chunks.length)
					// assume did not reach eof
					cntDidNotReadAnything++;
					if (cntDidNotReadAnything == aOptions.readChunks.dontTestEof) {
						// reached max times to try to read
						reachedEof = true;
					}
				} else {
					if (redSize != aOptions.readChunks.chunkSize) {
						// assume that because it read a size that is less then chunkSize, assume there is nothing more. i assume this because assuming if process insntantly wrote everything, then if gets a red size less then chunkSize then there is obviously no more to read.
						// this is dangerous assumption as if process hangs/delays mid write, then it will read 0 or not all and it will think it reached eof
						reachedEof = true;
					}
				}
			}
		}
		if (aOptions.readChunks.chunks.length) { // synonomous with didReadAnything
			// console.log('aOptions.readChunks.contents:', aOptions.readChunks.chunks.join(''));
			aOptions.readChunks.contents = aOptions.readChunks.chunks.join('');
		}
	}
	
	if (!aOptions.dontWaitExit) {
		var rez_pclose = ostypes.API('pclose')(popenFile); // waits for process to exit
		// console.log('rez_pclose:', cutils.jscGetDeepest(rez_pclose));
		
		console.timeEnd('unixSubprocess');
		return rez_pclose;
	} else {
		// as pclose MUST be called per each popen
		setTimeout(function() {
			var rez_pclose = ostypes.API('pclose')(popenFile); // waits for process to exit
			// console.log('rez_pclose:', cutils.jscGetDeepest(rez_pclose));
		}, 0);
		
		console.timeEnd('unixSubprocess');
		return undefined;
	}
}

function winGetDosPathFromNtPath(u16_NTPath) {
	// copy of http://stackoverflow.com/a/18792477/1828637
	// u16_NTPath (string)
	// RETURNS
		// success - dos path
		// error - throws
	
	// converts
	// "\Device\HarddiskVolume3"                                -> "E:"
	// "\Device\HarddiskVolume3\Temp"                           -> "E:\Temp"
	// "\Device\HarddiskVolume3\Temp\transparent.jpeg"          -> "E:\Temp\transparent.jpeg"
	// "\Device\Harddisk1\DP(1)0-0+6\foto.jpg"                  -> "I:\foto.jpg"
	// "\Device\TrueCryptVolumeP\Data\Passwords.txt"            -> "P:\Data\Passwords.txt"
	// "\Device\Floppy0\Autoexec.bat"                           -> "A:\Autoexec.bat"
	// "\Device\CdRom1\VIDEO_TS\VTS_01_0.VOB"                   -> "H:\VIDEO_TS\VTS_01_0.VOB"
	// "\Device\Serial1"                                        -> "COM1"
	// "\Device\USBSER000"                                      -> "COM4"
	// "\Device\Mup\ComputerName\C$\Boot.ini"                   -> "\\ComputerName\C$\Boot.ini"
	// "\Device\LanmanRedirector\ComputerName\C$\Boot.ini"      -> "\\ComputerName\C$\Boot.ini"
	// "\Device\LanmanRedirector\ComputerName\Shares\Dance.m3u" -> "\\ComputerName\Shares\Dance.m3u"
	// returns an error for any other device type
	
	if (u16_NTPath.indexOf('\\Device\\Serial') === 0 || u16_NTPath.indexOf('\\Device\\UsbSer') === 0) { // "Serial1" or "USBSER000"
		
		var h_Key = ostypes.TYPE.HKEY();
		var rez_openKey = ostypes.API('RegOpenKeyEx')(ostypes.CONST.HKEY_LOCAL_MACHINE, 'Hardware\\DeviceMap\\SerialComm', 0, ostypes.CONST.KEY_QUERY_VALUE, h_Key.address());
		if (!cutils.jscEqual(rez_openKey, ostypes.CONST.ERROR_SUCCESS)) {
			console.error('failed opening registry key:', cutils.jscGetDeepest(rez_openKey));
			throw new Error('failed opening registry key');
		}
		
		try {
			var u16_ComPort = ostypes.TYPE.WCHAR.array(50)();
			
			var u32_Type = ostypes.TYPE.DWORD();
			var u32_Size = ostypes.TYPE.DWORD(u16_ComPort.constructor.size);
			
			var u16_ComPort_castedAsByte = ctypes.cast(u16_ComPort.address(), ostypes.TYPE.BYTE.ptr);
			
			// var a = ctypes.jschar.array(50)(); // CData { length: 50 }
			// var ac = ctypes.cast(a.address(), ctypes.char.array(a.constructor.size / ctypes.char.size).ptr).contents; // CData { length: 100 }
			
			var rez_queryKey = ostypes.API('RegQueryValueEx')(h_Key, u16_NTPath, null, u32_Type.address(), u16_ComPort_castedAsByte, u32_Size.address());
			if (!cutils.jscEqual(rez_queryKey, ostypes.CONST.ERROR_SUCCESS)) {
				// if it is 2 then the value of u16_NTPath doesnt exist in this registry, its common to registry querying
				console.error('failed querying registry key:', cutils.jscGetDeepest(rez_queryKey));
				throw new Error('failed querying registry key');
			}
		} finally {
			var rez_closeKey = ostypes.API('RegCloseKey')(h_Key);
			if (!cutils.jscEqual(rez_closeKey, ostypes.CONST.ERROR_SUCCESS)) {
				console.error('failed closing registry key:', cutils.jscGetDeepest(rez_closeKey));
				throw new Error('failed closing registry key');
			}
			else { console.log('closed key'); }
		}
		
		return u16_ComPort.readString();
	}
	
	if (u16_NTPath.indexOf('\\Device\\LanmanRedirector\\') === 0) { // Win XP
		return '\\\\' + u16_NTPath.substr(25);
	}
	
	if (u16_NTPath.indexOf('\\Device\\Mup\\') === 0) { // Win 7
		return '\\\\' + u16_NTPath.substr(12);
	}
	
	var u16_Drives = ostypes.TYPE.WCHAR.array(300)();
	var rez_getLogis = ostypes.API('GetLogicalDriveStrings')(u16_Drives.length, u16_Drives);
	if (cutils.jscEqual(rez_getLogis, 0)) {
		console.error('failed to get logical drive strings, winLastError:', ctypes.winLastError);
		throw new Error('failed to get logical drive strings');
	}
	
	// console.log('u16_Drives:', u16_Drives); // u16_Drives: ctypes.char16_t.array(300)(["C", ":", "\\", "\x00", "D", ":", "\\", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", ....])
	console.log('u16_Drives.readString:', u16_Drives.readString());
	
	
	
	var js_u16_Drives = ['']; // assuming there has to be at least 1 drive
	for (var i=0; i<u16_Drives.length; i++) {
		if (u16_Drives[i] == '\x00') {
			if (u16_Drives[i + 1] == '\x00') {
				break; // no more drives as hit a double null terminator
			}
			js_u16_Drives.push('');
		} else {
			js_u16_Drives[js_u16_Drives.length - 1] += u16_Drives[i];
		}
	}
	
	console.log('js_u16_Drives:', js_u16_Drives); // js_u16_Drives: Array [ "C:\", "D:\" ]
	
	var u16_NtVolume = ostypes.TYPE.WCHAR.array(300)();
	for (var i=0; i<js_u16_Drives.length; i++) {
		
		var u16_Drv = js_u16_Drives[i];
		u16_Drv = u16_Drv.substr(0, u16_Drv.length - 1); // the backslash is not allowed for QueryDosDevice()
		
        // may return multiple strings!
        // returns very weird strings for network shares
		var rez_queryDos = ostypes.API('QueryDosDevice')(u16_Drv, u16_NtVolume, u16_NtVolume.constructor.size / 2);
		if (cutils.jscEqual(rez_queryDos, 0)) {
			console.error('failed to query dos device, winLastError:', ctypes.winLastError);
			throw new Error('failed to query dos device');
		}
		
		// console.log('u16_NtVolume:', u16_NtVolume); // u16_NtVolume: ctypes.char16_t.array(300)(["\\", "D", "e", "v", "i", "c", "e", "\\", "H", "a", "r", "d", "d", "i", "s", "k", "V", "o", "l", "u", "m", "e", "3", "\x00", "\x00", "\x00", "
		console.log('u16_NtVolume.readString:', u16_NtVolume.readString()); // u16_NtVolume.readString: \Device\HarddiskVolume3
		
		var js_u16_NtVolume = u16_NtVolume.readString();
		
		console.log('u16_NTPath:', u16_NTPath);
		console.log('js_u16_NtVolume:', js_u16_NtVolume);
		console.log('index:', u16_NTPath.indexOf(js_u16_NtVolume));
		if(u16_NTPath.indexOf(js_u16_NtVolume) === 0) {
			return u16_Drv + u16_NTPath.substr(js_u16_NtVolume.length);
		}
	}
	
	console.error('ERROR_BAD_PATHNAME');
	throw new Error('ERROR_BAD_PATHNAME');
}

function winForceForegroundWindow(aHwndToFocus) {
	// windows only!
	// focus a window even if this process, that is calling this function, is not the foreground window
	// copy of work from here - ForceForegroundWindow - http://www.asyncop.com/MTnPDirEnum.aspx?treeviewPath=[o]+Open-Source\WinModules\Infrastructure\SystemAPI.cpp
	
	// aHwndToFocus should be ostypes.TYPE.HWND
	// RETURNS
		// true - if focused
		// false - if it could not focus
	
	if (core.os.mname != 'winnt') {
		throw new Error('winForceForegroundWindow is only for Windows platform');
	}
	
	var hTo = aHwndToFocus;
	
	var hFrom = ostypes.API('GetForegroundWindow')();
	if (hFrom.isNull()) {
		// nothing in foreground, so calling process is free to focus anything
		var rez_SetSetForegroundWindow = ostypes.API('SetForegroundWindow')(hTo);
		console.log('rez_SetSetForegroundWindow:', rez_SetSetForegroundWindow);
		return rez_SetSetForegroundWindow ? true : false;
	}

	if (cutils.comparePointers(hTo, hFrom) === 0) {
		// window is already focused
		console.log('window is already focused');
		return true;
	}
	
	var pidFrom = ostypes.TYPE.DWORD();
	var threadidFrom = ostypes.API('GetWindowThreadProcessId')(hFrom, pidFrom.address());
	console.info('threadidFrom:', threadidFrom);
	console.info('pidFrom:', pidFrom);
	
	var pidTo = ostypes.TYPE.DWORD();
	var threadidTo = ostypes.API('GetWindowThreadProcessId')(hTo, pidTo.address()); // threadidTo is thread of my firefox id, and hTo is that of my firefox id so this is possible to do
	console.info('threadidTo:', threadidTo);
	console.info('pidTo:', pidTo);
	
	// impossible to get here if `cutils.jscEqual(threadidFrom, threadidTo)` because if thats the case, then the window is already focused!!
	// if (cutils.jscEqual(threadidFrom, threadidTo) {
	
	// from testing, it shows that ```cutils.jscEqual(pidFrom, pidTo)``` works only if i allow at least 100ms of wait time between, which is very weird
	if (/*cutils.jscEqual(pidFrom, pidTo) || */cutils.jscEqual(pidFrom, core.firefox.pid)) {
		// the pid that needs to be focused, is already focused, so just focus it
		// or
		// the pid that needs to be focused is not currently focused, but the calling pid is currently focused. the current pid is allowed to shift focus to anything else it wants
		// if (cutils.jscEqual(pidFrom, pidTo)) {
		// 	console.info('the process, of the window that is to be focused, is already focused, so just focus it - no need for attach');
		// } else if (cutils.jscEqual(pidFrom, core.firefox.pid)) {
			console.log('the process, of the window that is currently focused, is of this calling thread, so i can go ahead and just focus it - no need for attach');
		// }
		var rez_SetSetForegroundWindow = ostypes.API('SetForegroundWindow')(hTo);
		console.log('rez_SetSetForegroundWindow:', rez_SetSetForegroundWindow);
		return rez_SetSetForegroundWindow ? true : false;
	}
	
	var threadidOfCallingProcess = ostypes.API('GetCurrentThreadId')();
	console.log('threadidOfCallingProcess:', threadidOfCallingProcess);
	
	var rez_AttachThreadInput = ostypes.API('AttachThreadInput')(threadidOfCallingProcess, threadidFrom, true);
	console.info('rez_AttachThreadInput:', rez_AttachThreadInput);
	if (!rez_AttachThreadInput) {
		throw new Error('failed to attach thread input');
	}
	var rez_SetSetForegroundWindow = ostypes.API('SetForegroundWindow')(hTo);
	console.log('rez_SetSetForegroundWindow:', rez_SetSetForegroundWindow);

	var rez_AttachThreadInput = ostypes.API('AttachThreadInput')(threadidOfCallingProcess, threadidFrom, false);
	console.info('rez_AttachThreadInput:', rez_AttachThreadInput);
	
	return rez_SetSetForegroundWindow ? true : false;
}

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
							return 'exists';
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
		args: undefined // string - arguments to launch file with
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
				if (aOptions.args) {
					sei.lpParameters = ostypes.TYPE.LPCTSTR.targetType.array()(aOptions.args);
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
				
				var eLauncherContents;
				if (aOptions.args) {
					// special args for .desktop, just add it to exec, then remove it
					eLauncherContents = OS.File.read(aLaunchPlatPath, {encoding:'utf-8'});
					
					// step2 - get Exec line
					var eLauncherExecLine_patt = /^Exec=[^$]+/m;
					var eLauncherExecLine_match = eLauncherExecLine_patt.exec(eLauncherContents);
					
					var eExecLine = eLauncherExecLine_match[0];
					var cExecLine = eExecLine + ' ' + aOptions.args;
					
					cLauncherContents = eLauncherContents.replace(eExecLine, cExecLine);
					
					var eLauncherFD = OS.File.open(aLaunchPlatPath, {truncate:true}); // FD stands for file descriptor
					eLauncherFD.write(getTxtEncodr().encode(cLauncherContents));
					eLauncherFD.close();
				}
				
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

				if (aOptions.args) {
					// special args for .desktop, just add it to exec, then remove it
					var eLauncherFD = OS.File.open(aLaunchPlatPath, {truncate:true}); // FD stands for file descriptor
					eLauncherFD.write(getTxtEncodr().encode(eLauncherContents));
					eLauncherFD.close();
				}
			break;
		case 'darwin':
				
				// open
				var cmdStr = [
					'open',
					'-a',
					'"' + aLaunchPlatPath.replace(/ /g, '\ ') + '"'
				];
				if (aOptions.args) {
					cmdStr.push('--args');
					cmdStr.push(aOptions.args)
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
						// console.log('has cWinObj so do it:', cWinObj);
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
					} else {
						console.warn('no cWinObj so dont:', cWinObj);
					}
				}

				console.error('rezWinArr pre proccess:', rezWinArr);
				
				var cWinObj = null;
				for (var i = 0; i < rezWinArr.length; i++) {
					// console.log('checking rezWinArr i', i, rezWinArr[i], 'and cWinObj is currently:', cWinObj);
					if (rezWinArr[i].pid || rezWinArr[i].title) { // apparently sometimes you can hvae a new win title but no pid. like after "browser console" came a "compiz" title but no pid on it
						// the ```(rezWinArr[i].title && cWinObj && cWinObj.title)``` test if a new title has been encountered. if so then push block of pervious windows
						// i would think i should use just rezWinArr[i].title however it gets Compiz which is some invisible window so dang weird
						pushItBlock();
						// console.log('doing push for i:', i, rezWinArr[i]);
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

				console.error('rezWinArr post proccess:', analyzedArr);
				
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
				
				console.error('completed analyizing rezWinArr:', analyzedArr);
				
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
					// createTime - js date object, of time pid was mide
					// imageName - only present if the process has a name. if it does, then this is a string.
				// OSX
					// processName
					// exePath - platform path to executable
				// Linux
					// processName

	console.time('getAllPID');
	
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
					rez_ntqrysysprocs = ostypes.API('NtQuerySystemInformation')(ostypes.CONST.SystemProcessInformation, bufferNtQrySysProcs, enumBufSizeNtQrySysProcs, enumBufSizeNtQrySysProcs.address());
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
						// cProcessIdsInfos[pid].createTimeStr = cProcessIdsInfos[pid].createTime.toString();
						
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
		case 'darwin':  // works on mac as well. with console open and a bunch of console.logging avg of 60ms.

				var cReadChunks = {
					chunkSize: (aOptions.firefoxOnly ? 200 : 1000)
				};
				var rez_pgrep = unixSubprocess('pgrep -u "$(whoami)" ' + (aOptions.firefoxOnly ? 'firefox' : '-l .'), {
					readChunks: cReadChunks
				});
				console.log('rez_pgrep:', rez_pgrep);
				console.log('cReadChunks:', cReadChunks);
				
				if (aOptions.firefoxOnly && rez_pgrep == 256) {
					// on mac, pgrep does not find itself, so it wont find self pid - i dont test specifically for mac, because it might be some random *nix that doesnt either
					cProcessIdsInfos[core.firefox.pid] = {
						processName: 'firefox'
					};
				} else if (rez_pgrep === 0) {
					var pidInfoRows = cReadChunks.contents.split('\n');
					console.log('pidInfoRows:', pidInfoRows);
					if (aOptions.firefoxOnly) {
						for (var i=0; i<pidInfoRows.length; i++) {
							if (pidInfoRows[i] == '') {
								continue; // its a blank row, on ubuntu the last row is blank
							}
							cProcessIdsInfos[pidInfoRows[i]] = {
								processName: 'firefox',
								pid: pidInfoRows[i]
							}
						}
						// pgrep on mac doesnt find itself's pid, so if its not in there, add it in
						if (!(core.firefox.pid in cProcessIdsInfos)) {
							console.log('pid of self was not in there so adding it in!!!');
							cProcessIdsInfos[core.firefox.pid] = {
								processName: 'firefox'
							};
						}
					} else {
						for (var i=0; i<pidInfoRows.length; i++) {
							if (pidInfoRows[i] == '') {
								continue; // its a blank row, on ubuntu the last row is blank
							}
							var cRowSplit = pidInfoRows[i].split(' ');
							var cPid = cRowSplit[0];
							var cProcessName = cRowSplit[1];
							cProcessIdsInfos[cPid] = {
								processName: cProcessName,
								pid: cPid
							};
						}
					}
				} else {
					throw new Error('pgrep failed!!!');
				}
				
			break;
		
		// case 'darwin':
			
				/*
				// this runningAppsArr method takes average of 150ms with console open. with it closed it takes avg 60ms. which his horrendous! so im using the pgrep method of unix for darwin as well
				// [[NSWorkspace sharedWorkspace] runningApplications];
				var NSWorkspace = ostypes.HELPER.class('NSWorkspace');
				var workspace = ostypes.API('objc_msgSend')(NSWorkspace, ostypes.HELPER.sel('sharedWorkspace'));
				
				var runningAppsArr = ostypes.API('objc_msgSend')(workspace, ostypes.HELPER.sel('runningApplications'));
				
				var runningAppsCnt = ostypes.API('objc_msgSend')(runningAppsArr, ostypes.HELPER.sel('count'));
				// console.log('runningAppsCnt:', runningAppsCnt, cutils.jscGetDeepest(runningAppsCnt), cutils.jscGetDeepest(runningAppsCnt, 10), cutils.jscGetDeepest(runningAppsCnt, 16));
				
				var runningAppsCnt_j = parseInt(cutils.jscGetDeepest(runningAppsCnt, 10));
				// console.log('runningAppsCnt_j:', runningAppsCnt_j);
				
				for (var i=0; i<runningAppsCnt_j; i++) {
					
					// console.log('runningApp i:', i);
					
					var runningApp = ostypes.API('objc_msgSend')(runningAppsArr, ostypes.HELPER.sel('objectAtIndex:'), ostypes.TYPE.NSUInteger(i));
					
					var runningAppPid = ostypes.API('objc_msgSend')(runningApp, ostypes.HELPER.sel('processIdentifier'));
					// console.log('runningAppPid:', cutils.jscGetDeepest(runningAppPid, 10));
					
					var runningAppPid_jStr = cutils.jscGetDeepest(runningAppPid, 10); // about my personal naming of this var: jStr as i exepct pid to be number, but i have it here as string, if i made it parseInt of this I would have just said _j
					
					var runningAppExeUrl = ostypes.API('objc_msgSend')(runningApp, ostypes.HELPER.sel('executableURL'));
					
					var runningAppExeAbsStr = ostypes.API('objc_msgSend')(runningAppExeUrl, ostypes.HELPER.sel('absoluteString'));
					var runningAppExeAbsStr_j = ostypes.HELPER.readNSString(runningAppExeAbsStr);
					// console.log('runningAppExeAbsStr_j:', runningAppExeAbsStr_j); // gives like  "file://localhost/Applications/FirefoxNightly.app/Contents/MacOS/firefox", "file://localhost/System/Library/PrivateFrameworks/Noticeboard.framework/Versions/A/Resources/nbagent.app/Contents/MacOS/nbagent"

					var runningAppExePlatPath = OS.Path.fromFileURI(runningAppExeAbsStr_j); // this converts "file://localhost/Applications/FirefoxNightly.app/Contents/MacOS/firefox" to "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
					
					// var runningAppName = ostypes.API('objc_msgSend')(runningApp, ostypes.HELPER.sel('localizedName'));
					// console.log('runningAppName:', ostypes.HELPER.readNSString(runningAppName)); // this gives "Nightly" etc not what i want, i want the process name which is Nighlty.app/Contents/MacOS/firefox
					
					cProcessIdsInfos[runningAppPid_jStr] = {
						processName: OS.Path.basename(runningAppExePlatPath),
						exePath: runningAppExePlatPath
					};
				}
				*/
			
			// break;
		default:
			throw new MainWorkerError({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	console.timeEnd('getAllPID');
	console.log('cProcessIdsInfos:', cProcessIdsInfos);
	
	return cProcessIdsInfos;
}
// END - platform helpers

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
// modded it for caching
var _cache_HashString = {};
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
		if (!(text in _cache_HashString)) {
			var data = encoder.encode(text);

			// Compute the actual hash
			var rv = 0;
			for (var c of data) {
				rv = add(rv, c | 0);
			}
			_cache_HashString[text] = rv;
		}
		return _cache_HashString[text];
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

// rev1 - https://gist.github.com/Noitidart/ec1e6b9a593ec7e3efed
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
	return cRequest;
}

var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aReplacements, aLocalizedPackageName) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string
	
	if (!_cache_formatStringFromName_packages[aLocalizedPackageName]) {
		var packageStr = xhr(core.addon.path.locale + aLocalizedPackageName + '.properties').response;
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
function longestCommonSubstring(lcstest, lcstarget) {
	// jan 30 2016 - noida
    /*
    http://cache.mifio.com/javascript002.html
     Here is a down and dirty Javascript function that returns the longest substring shared by two string variables. In other words, given the two sentences:

    "I'm looking for a little string within a big string." and
    "Why here's a little string now!",:

    The function will return the string " a little string".

    The function, named lcs, will return a string as small as a single character. "123" and "345" will return "3". If no match is found, lcs returns a null string. 
    */
    var matchfound = 0;
    var result;
    var lsclen = lcstest.length;
    for (var lcsi = 0; lcsi < lcstest.length; lcsi++) {
        var lscos = 0;
        for (var lcsj = 0; lcsj < lcsi + 1; lcsj++) {
            var re = new RegExp("(?:.{" + lscos + "})(.{" + lsclen + "})", "i");
            var temp = re.test(lcstest);
            re = new RegExp("(" + RegExp.$1 + ")", "i");
            if (re.test(lcstarget)) {
                matchfound = 1;
                result = RegExp.$1;
                break;
            }
            lscos = lscos + 1;
        }
        if (matchfound == 1) {
            return result;
            break;
        }
        lsclen = lsclen - 1;
    }
    result = "";
    return result;
}
function longestCommonSubstringInArr(aArrOfStrs) {
	// jan 30 2016 - noida
	// depends on longestCommonSubstring
	
	if (aArrOfStrs.length < 2) { console.error('aArrOfStrs must have at least two tring elements'); throw new Error('aArrOfStrs must have at least two tring elements'); }
	
	var lastCommon = aArrOfStrs[0];
	for (var i=1; i<aArrOfStrs.length; i++) {
		lastCommon = longestCommonSubstring(lastCommon, aArrOfStrs[i]);
	}
	
	return lastCommon;
}
function setTimeoutSync(aMilliseconds) {
	var breakDate = Date.now() + aMilliseconds;
	while (Date.now() < breakDate) {}
}

// rev4 - https://gist.github.com/Noitidart/6d8a20739b9a4a97bc47
var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker // or if it includes chrome:// at the start then it fetches that
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string
	
	// returns null if aKey not found in pacakage

	var packagePath;
	var packageName;
	if (aLocalizedPackageName.indexOf('chrome:') === 0 || aLocalizedPackageName.indexOf('resource:') === 0) {
		packagePath = aLocalizedPackageName;
		packageName = aLocalizedPackageName.substring(aLocalizedPackageName.lastIndexOf('/') + 1, aLocalizedPackageName.indexOf('.properties'));
	} else {
		packagePath = core.addon.path.locale + aLocalizedPackageName + '.properties';
		packageName = aLocalizedPackageName;
	}
	
	if (!_cache_formatStringFromName_packages[packageName]) {
		var packageStr = xhr(packagePath).response;
		var packageJson = {};
		
		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1]] = propMatch[2];
		}
		
		_cache_formatStringFromName_packages[packageName] = packageJson;
		
		console.log('packageJson:', packageJson);
	}
	
	var cLocalizedStr = _cache_formatStringFromName_packages[packageName][aKey];
	if (!cLocalizedStr) {
		return null;
	}
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}
	
	return cLocalizedStr;
}
// end - common helper functions