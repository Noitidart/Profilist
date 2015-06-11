/* TODO
delete mac override paths files
delete ovveride paths pref
*/

// Imports
const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
const {TextDecoder, TextEncoder, OS} = Cu.import('resource://gre/modules/osfile.jsm', {});
Cu.import('resource://gre/modules/Promise.jsm');
//Cu.import('resource://gre/modules/PromiseUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
const core = {
	addon: {
		name: 'Profilist',
		id: 'Profilist@jetpack',
		path: {
			name: 'profilist',
			content: 'chrome://profilist/content/',
			locale: 'chrome://profilist/locale/',
			modules: 'chrome://profilist/content/modules/',
			workers: 'chrome://profilist/content/modules/workers/',
			resources: 'chrome://profilist/content/resources/',
			images: 'chrome://profilist/content/resources/images/',
			styles: 'chrome://profilist/content/resources/styles/',
			bindings: 'chrome://profilist/content/resources/bindings/'
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase()
	}
};

var PromiseWorker;
var bootstrap = this;

const myPrefBranch = 'extensions.' + core.addon.name + '@jetpack.';

const tbb_box_style = '';
const tbb_style = ''; //old full style::-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);
const BreakException = {};

var cssUri;
var collapsedheight = 0; //holds height stack should be when collapsed
var expandedheight = 0; //holds height stack should be when expanded
var stackDOMJson = []; //array holding menu structure in stack /*:note: :important:must insert the "Default: profile" into stackDOMJson last as last element in stack is top most*/
var unloaders = {};
var PUIsync_height;
var PUIsync;

var devBuildsStrOnLastUpdateToGlobalVar = ''; //named this for global var instead of dom as im thinking of making it not update all windows, just update the current window on menu panel show
var currentThisBuildsIconPath = '';

var cOS = OS.Constants.Sys.Name.toLowerCase();
var OSStuff = {}; // global vars populated by init, based on OS
var updateLauncherAndCutIconsOnBrowserShutdown; // set this to a function if this profiles build tie was changed while it was running, it will update the icon on browser shutdown

const iconsetSizes_OS = {
	darwin: [16, 32, 64, 128, 256, 512, 1024],
	linux: [16, 24, 48, 96],
	//winnt: [16, 32, 48] // XP
	//winnt: [16, 32, 48, 64] // Vista
	winnt: [16, 32, 48, 256] // 7 and 8
};
const iconsetSizes_Profilist = {
	darwin: [10/*badge*/, 16, 32, 64, 128, 256, 512, 1024],
	linux: [10/*badge*/, 12/*badge*/, 16, 24, 48, 96],
	//winnt: [10, 16, 32, 48] // XP
	//winnt: [10, 16, 32, 48, 64] // Vista
	//winnt: [10/*badge*/, 16, 24/*badge*/, 32, 48, 128/*badge*/, 256] // 7 and 8
	winnt: [16, 32, 48, 256] // 7 and 8
};

//var pathProfilesIni = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
//var pathProfilesIniBkp = profToolkit.path_iniFile + '.profilist.bkp';

var ini = {UnInitialized:true};
var devBuilds;
var gDevBuilds = [];
var iniStr = ''; //str of ini on last read // for detection for if should write if diff
var iniReadStr = ''; //same like iniStr but no JSON'ing for detection if should continue parsing obj on read
var profToolkit = {
	rootPathDefault: 0,
	localPathDefault: 0,
	profileCount: 0,
	/*profiles: {},*/
	selectedProfile: {
		rootDirName: 0,
		localDirName: 0,
		rootDirPath: 0,
		localDirPath: 0,
		name: null
	} //reference to the profiles object but to the current profile in the profiles object
};

var decoder = 0;
var encoder = 0;

var iniStr_thatAffectDOM = ''; //str of ini on last read (but just the props that affect dom) (so like properties like Profilist.launch_on_create doesnt affect dom as the function creatProfile checks this Profilist.launch_on_create property when deciding to launch or not
var iniObj_thatAffectDOM = {};
//learned: that if StartWithLastProfile=1 then profile manager/startup obeys the Default=1 but note that Default=1 is never removed
var iniKeys_thatAffectDOM = ['Profilist.dev', 'Profilist.dev-builds'/*, 'StartWithLastProfile'*/, 'Default', 'Name'/*, 'Profilist.tie'*/, 'Profilist.badge']; // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~ // Profilist.tie is pushed in or removed, depending on pref of myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value
/*
//keys that i add to thatAffectDOM object:
num - outside of props // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
Profilist.defaultProfilePath
Profilist.defaultProfileIsRelative - (not outside of props as if deafultProfilePath doesnt change this obviously doesnt change)
Profilist.currentThisBuildsIconPath
*/
var profStatObj;
const repCharForSafePath = '-';
var cloneProfIniKey;

var launchedInTieId = null;
var devBuildsArrStruct = { // holds index of key
	id: 2,
	exe_path: 1,
	base_icon: 0 // folder name in iconset
};

var tbb_msg_restore_handlers = {};

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + Math.random()); /* Randomize URI to work around bug 719376 */ });
XPCOMUtils.defineLazyGetter(myServices, 'wt7', function () { return Cc["@mozilla.org/windows-taskbar;1"].getService(Ci.nsIWinTaskbar); });

function extendCore() {
	// adds some properties i use to core
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;
			//console.info('userAgent:', userAgent);
			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);
			//console.info('version_osx matched:', version_osx);
			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
				var version_osx_str = version_osx[1];
				var ints_split = version_osx[1].split('.');
				if (ints_split.length == 1) {
					core.os.version = parseInt(ints_split[0]);
				} else if (ints_split.length >= 2) {
					core.os.version = ints_split[0] + '.' + ints_split[1];
					if (ints_split.length > 2) {
						core.os.version += ints_split.slice(2).join('');
					}
					core.os.version = parseFloat(core.os.version);
				}
				// this makes it so that 10.10.0 becomes 10.0
				// 10.10.1 => 10.1
				// so can compare numerically, as 10.0 is less then 10.1
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
	}
	
	core.os.toolkit = Services.appinfo.widgetToolkit.toLowerCase();
	core.os.xpcomabi = Services.appinfo.XPCOMABI;
	
	core.firefox = {};
	core.firefox.version = Services.appinfo.version;
	core.firefox.channel = Services.prefs.getCharPref('app.update.channel'); // esr|release|beta|aurora|dev|nightly|default
	// link5060513255 - see that i alias esr to release and default to nightly, and aurora to dev if version is < 35
	if (core.firefox.channel == 'aurora') {
		if (Services.vc.compare(Services.appinfo.version, 35) >= 0) {
			// aurora became dev icon in version 35
			core.firefox.channel = 'dev'; // NOT for image purposes
		}
	}
	
	console.log('done adding to core, it is now:', core);
}

// START - Addon Functionalities
function readIniAndParseObjs(writeIfDiff) { //as of yet nothing uses writeIfDiff arg
//is promise
//reads ini and if its not touched by profilist, then it reads bkp, if bkp doesnt exist than it touches ini and queus writeIniBkp and writeIni
/* //updates:
ini
iniStr
iniStr_thatAffectDOM
watchBranches[myPrefBranch]
current builds icon if dev mode is enabled
*/
	var deferred_riapoMAIN = new Deferred();
	var deferred_readIniAndMaybeBkp = new Deferred();		
	deferred_readIniAndMaybeBkp.promise.then(
		function(aVal) {
			console.log('Fullfilled - deferred_readIniAndMaybeBkp.promise - ', {d:{d:aVal}});
			// start - do stuff here - deferred_readIniAndMaybeBkp.promise
			//parse objs
			iniStr = aVal; //or can do JSON.stringify(ini);
			//iniStr_thatAffectDOM
			iniObj_thatAffectDOM = {};
			if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {
				iniKeys_thatAffectDOM.push('Profilist.tie');
			} else {
				var ProfilistTieKeyIndex = iniKeys_thatAffectDOM.indexOf('Profilist.tie');
				if (ProfilistTieKeyIndex > -1) {
					iniKeys_thatAffectDOM.splice(ProfilistTieKeyIndex, 1);
				}
			}
			for (var k=0; k<iniKeys_thatAffectDOM.length; k++) {
				for (var p in ini) {
					if (iniKeys_thatAffectDOM[k] in ini[p].props) {
						if (iniKeys_thatAffectDOM[k] == 'Default') {
							var defaultProfilePath = ini[p].props['Path'];
							var defaultProfileIsRelative = ini[p].props['IsRelative'];
						}
						if (!(p in iniObj_thatAffectDOM)) {
							iniObj_thatAffectDOM[p] = {props:{}};
						}/*  else if (!('props' in iniObj_thatAffectDOM)) {
							iniObj_thatAffectDOM[p].props = {};
						} */
						iniObj_thatAffectDOM[p].props[iniKeys_thatAffectDOM[k]] = ini[p].props[iniKeys_thatAffectDOM[k]];
					}
					if ('num' in ini[p]) { // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ 
						if (!(p in iniObj_thatAffectDOM)) {
							iniObj_thatAffectDOM[p] = {props:{}};
						}
						iniObj_thatAffectDOM[p].num = ini[p].num;
					}
				}
			}
			//iniStr_thatAffectDOM = JSON.stringify(iniObj_thatAffectDOM); //dont do this here as i need to first update currentThisBuildsIconPath
			console.info('iniObj_thatAffectDOM:', iniObj_thatAffectDOM);
			//update watchBranches[myPrefBranch] AND make boolean type prefs, boolean type in ini object
			for (var pref_name_in_obj in myPrefListener.watchBranches[myPrefBranch].prefNames) {
				var pref_name_in_ini = 'Profilist.' + pref_name_in_obj;
				if (pref_name_in_ini in ini.General.props) {
					var prefValInPrefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value;
					var prefValInIni = ini.General.props[pref_name_in_ini];
					if (myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].type == Ci.nsIPrefBranch.PREF_BOOL) {
						if (prefValInIni == 'false' || prefValInIni == '0') {
							prefValInIni = false;
							myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value = false;
						} else if (prefValInIni == 'true' || prefValInIni == '1') {
							prefValInIni = true;
							myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value = true;
						}
					} else if (myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].type == Ci.nsIPrefBranch.PREF_INT) { // i dont use PREF_INT type but just for sake of accuracy im adding htis in
						myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value = parseInt(myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value);
					}
					if (prefValInIni != prefValInPrefObj) {
						myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].setval(prefValInIni, true); //i dont have to pass seoncd arg of true, as the onChange listener will see that the ini value is == newVal so it wont writeIni
					}
				} else {
					//take value from pref and write it to ini, as pref is not found in ini
					ini.General.props[pref_name_in_ini] = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value;
					//console.log('ini of name', pref_name_in_ini, 'not found in ini, now will check if the current value of the pref is the default', 'cur:', myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value, 'default:', myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].default);
					if (myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value != myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].default) {
						var doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni = true;
						console.error('doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni');
					}
					//note:todo:11/14/14 112a: i edited in something to ini, so i should do a writeIni or mark it so that a writeIni is done sometime
				}
			}
			
			//update icon `currentThisBuildsIconPath`
			//if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) { //if (ini.General.props['Profilist.dev'] == 'true') { //OR I can test `if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {` but if i use this pref test method then i need to update watch branches block before this currentBuildIcons
			
				if ('Profilist.dev-builds' in ini.General.props) {
					gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']); // JSON.parse(myPrefListener.watchBranches[myPrefBranch].prefNames['dev-builds'].value);
					
					// also update iniObj_thatAffectDOM with base icons used
					
					var tieIdsActive = []; // meaning with info in gDevBuilds
					for (var i=0; i<gDevBuilds.length; i++) {
						var cTieId = gDevBuilds[i][devBuildsArrStruct.id];
						var cBaseIcon = gDevBuilds[i][devBuildsArrStruct.base_icon];
						tieIdsActive.push(cTieId);
						iniObj_thatAffectDOM.General.props['Profilist.dev-build-base_icon-' + cTieId] = cBaseIcon;
					}
					
					console.error('scanning active tie ids:', tieIdsActive);
					
					for (var p in ini) {
						if (!('num' in ini[p])) { continue }
						if ('Profilist.tie' in ini[p].props) {
							if (tieIdsActive.indexOf(ini[p].props['Profilist.tie']) == -1) {
								console.warn('tieid of ', ini[p].props['Profilist.tie'], 'was found in use in ini, however it is not in left over tieids, so removing from ini.', 'left over tie ids:', tieIdsActive);
								delete ini[p].props['Profilist.tie'];
							}
						}
					}
				}
				//start the generic-ish check stuff
				// copy block link011012154 slight modif
				currentThisBuildsIconPath = '';
				// does currently running path have a tied icon
				var runningExeTieId = getDevBuildTieIdOfExePath(profToolkit.exePath);
				if (runningExeTieId !== null) {
					// currently running a tied, so use tied icon
					currentThisBuildsIconPath = getPathTo16Img(getDevBuildPropForTieId(runningExeTieId, 'base_icon'), false); // no random, so i can compare for diffs
				} else {
					// use channel default icon
					currentThisBuildsIconPath = getPathTo16Img(core.firefox.channel);
				}
				// end copy block link011012154
				//end the generic-ish check stuff
			
				//have to add this in as another prop because its possible that currentThisBuildsIconPath can change even though Profilist.dev did not (ie: it reamined true)
				//actually ignore this crap comment on right::: i think i sould set selectedProfile here //i dont figure out the default=1 profile and add is prop as that can be done on run time, that inf
				iniObj_thatAffectDOM.General.props['Profilist.currentThisBuildsIconPath'] = currentThisBuildsIconPath; //important: note: so remember, iniObj_thatAffectDOM the _thatAffectDOM stuff is just read only, never read from it to save to ini
			//}
			
			// start - identify if Default profile
			var found_defaultProfile = false;
			for (var q in ini) {
				if ('num' in ini[q]) {
					if ('Default' in ini[q].props) {
						found_defaultProfile = true;
						iniObj_thatAffectDOM.General.props['Profilist.defaultProfileIniKey'] = q;
						break;
					}
				}
			}
			
			if (!found_defaultProfile) {
				delete iniObj_thatAffectDOM.General.props['Profilist.defaultProfileIniKey'];
				if (ini.General.props.StartWithLastProfile != '1') {
					ini.General.props.StartWithLastProfile = '1'; // :todo: should probably say to write to ini this is mainly the logic i want followed, if no default profile then I want StartWithLastProfile to be 0
				}
			} else {
				if (ini.General.props.StartWithLastProfile != '0') {
					ini.General.props.StartWithLastProfile = '0'; // :todo: should probably say to write to ini this is mainly the logic i want followed, if no default profile then I want StartWithLastProfile to be 0
				}				
			}
			// end - identify if Default profile
			
			iniStr_thatAffectDOM = JSON.stringify(iniObj_thatAffectDOM);
			
			
			//figure selectedProfile.name and selectedProfile.iniKey			
			//get from selectedProfile.rootDirPath to iniPath format to get its name
			if (profToolkit.selectedProfile.relativeDescriptor_rootDirPath !== null) {
				//its possible to be relative
				profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.relativeDescriptor_rootDirPath].props.Name;
				profToolkit.selectedProfile.iniKey = profToolkit.selectedProfile.relativeDescriptor_rootDirPath;
			} else {
				if (profToolkit.selectedProfile.rootDirPath in ini) {
					//its absolute
					profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.rootDirPath].props.Name;
					profToolkit.selectedProfile.iniKey = profToolkit.selectedProfile.rootDirPath;
				} else {
					//its a temporary profile!
					profToolkit.selectedProfile.isTemp = true;
					profToolkit.selectedProfile.iniKey = null;
					profToolkit.selectedProfile.name = OS.Path.basename(getPathToProfileDir(null, false));
				}
			}
			
			if (writeIfDiff || doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni) {
				if (doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni) {
					console.log('will now do write because not all prefs were at default AND because none of the prefs were in the ini, if none were there but all were defalut i wouldnt bother doing this write');
				}
				// start - im not sure if i need to writeIniAndBkpIfDiff here // edit: is needed if prefs are not all at default
				var promise_writeIniAndBkpIfDiff = writeIniAndBkpIfDiff();
				promise_writeIniAndBkpIfDiff.then(
					function(aVal) {
						console.log('Fullfilled - promise_writeIniAndBkpIfDiff - ', aVal);
						// start - do stuff here - promise_writeIniAndBkpIfDiff
						deferred_riapoMAIN.resolve('objs parsed and wroteIfDiff');
						// end - do stuff here - promise_writeIniAndBkpIfDiff
					},
					function(aReason) {
						var rejObj = {name:'promise_writeIniAndBkpIfDiff', aReason:aReason};
						console.error('Rejected - promise_writeIniAndBkpIfDiff - ', rejObj);
						deferred_riapoMAIN.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promise_writeIniAndBkpIfDiff', aCaught:aCaught};
						console.error('Caught - promise_writeIniAndBkpIfDiff - ', rejObj);
						deferred_riapoMAIN.reject(rejObj);
					}
				);
				// end - im not sure if i need to writeIniAndBkpIfDiff here
			} else {
				deferred_riapoMAIN.resolve('objs parsed');
			}
			// end - do stuff here - deferred_readIniAndMaybeBkp.promise
		},
		function(aReason) {
			var rejObj = {name:'deferred_readIniAndMaybeBkp.promise', aReason:aReason};
			console.error('Rejected - deferred_readIniAndMaybeBkp.promise - ', rejObj);
			deferred_riapoMAIN.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'deferred_readIniAndMaybeBkp.promise', aCaught:aCaught};
			console.error('Caught - deferred_readIniAndMaybeBkp.promise - ', rejObj);
			deferred_riapoMAIN.reject(rejObj);
		}
	);
	
	
	///////////
	//start - read the ini file and if needed read the bkp to create the ini object
//	console.log('in read');
//	console.log('decoder got');
//	console.log('starting read');
	var promise_readIni = read_encoded(profToolkit.path_iniFile, {encoding:'utf-8'});
	
	promise_readIni.then(
		function(aVal) {
			console.log('Fullfilled - promise_readIni - ', {b:{b:aVal}});
			// start - do stuff here - promise_readIni
			var readStr = aVal;
			if (iniReadStr == readStr) {
				deferred_readIniAndMaybeBkp.resolve('no need to parse regex even, the readStr is same');
				console.log('no need to parse regex even, the readStr is same');
			} else {
				iniReadStr = readStr;
				//console.log('radStr:', readStr);
				ini = {};
				var patt = /\[(.*?)(\d*?)\](?:\s+?(.+?)=(.*))(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?/mg; //currently supports 15 lines max per block `(?:\s+?(.+?)=(.*))?` repeat that at end
				var blocks = [];

				var match;
				while (match = patt.exec(readStr)) {
	//				//console.log('MAAAAAAAAAAATCH', match);

					var group = match[1];
					ini[group] = {};

					if (group == 'Profile') {
						ini[group]['num'] = parseInt(match[2]);
					}

					ini[group].props = {};

					for (var i = 3; i < match.length; i = i + 2) {
						var prop = match[i];
						if (prop === undefined) {
							break;
						}
						var propVal = match[i + 1]
						ini[group].props[prop] = propVal;
					}

					if (group == 'Profile') {
						//Object.defineProperty(ini, ini[group].props.Name, Object.getOwnPropertyDescriptor(ini[group], group));
						ini[ini[group].props.Path] = ini[group];
						delete ini[group];
					}
				}
				if (/^Profilist\./m.test(readStr)) { //note: Profilist.touched is json.stringify of an array holding paths it profilist was installed from, on uninstall it should remove self path from Profilist.touched and if its empty then it should prompt to delete all profilist settings & files
					console.log('ini object finalized via non-bkp');
					iniStr = JSON.stringify(ini);
					deferred_readIniAndMaybeBkp.resolve(iniStr);
					//return Promise.resolve('Success promise_readIni',);
				} else {
					console.log('ini was not touched');
					//ini was not touched
					//so read from bkp and update ini with properties (so just .props are restored, any missing groups are not restored as they were probably inteiontally removed) that are missing
					var promise_readIniBkp = read_encoded(profToolkit.path_iniBkpFile, {encoding:'utf-8'});
					promise_readIniBkp.then(
						function(aVal) {
							console.log('Fullfilled - promise_readIniBkp - ', {c:{c:aVal}});
							// start - do stuff here - promise_readIniBkp
							var readStr = aVal;
							//i dont do the iniReadStr == readStr check here, BECAUSE what if user made new profiles with the profile manager, then this backup method needs to be called. im thinking that even if backup restored stuff to ini object, and the iniReadStr is prior to backup, then on next read, if it finds iniStr is same then it wont blah blah blah im thinking no need
							//should readStr
							//ini is currently the untouched ini
							//go through readStr and update ini with the properties that are missing (if a profile is in ini but not in iniBkp then it means that profile no longer exists)
								//meaning add all Profilist. properties to the ini that dont exist there
							//console.log('readStrBkp:', readStr);
							//start read ini to str
							var iniBkp = {};
							//no need to redefine patt //var patt = /\[(.*?)(\d*?)\](?:\s+?(.+?)=(.*))(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?/mg; //supports 10 lines max per block `(?:\s+?(.+?)=(.*))?` repeat that at end
							var blocks = [];

							var match;
							while (match = patt.exec(readStr)) {
				//				//console.log('MAAAAAAAAAAATCH', match);

								var group = match[1];
								iniBkp[group] = {};

								if (group == 'Profile') {
									iniBkp[group]['num'] = parseInt(match[2]);
								}

								iniBkp[group].props = {};

								for (var i = 3; i < match.length; i = i + 2) {
									var prop = match[i];
									if (prop === undefined) {
										break;
									}
									var propVal = match[i + 1]
									iniBkp[group].props[prop] = propVal;
								}

								if (group == 'Profile') {
									//Object.defineProperty(iniBkp, iniBkp[group].props.Name, Object.getOwnPropertyDescriptor(iniBkp[group], group));
									iniBkp[iniBkp[group].props.Path] = iniBkp[group];
									delete iniBkp[group];
								}
							}
							//end read str to obj
							console.info('iniBkp:', iniBkp);
							var somethingRestoredFromBkpToIni = false;
							for (var p in ini) {
								if (p in iniBkp) {
									for (var sub_p in iniBkp[p].props) {
										if (sub_p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
											console.log('restoring', sub_p, 'from bkp to ini');
											somethingRestoredFromBkpToIni = true;
											ini[p].props[sub_p] = iniBkp[p].props[sub_p];
										}
									}
									/*
									if ('num' in ini[p]) {
										//its a profile entry
										for (var sub_p in iniBkp[p].props) {
											if (sub_p.substr(0, 10) == 'Profilist.') {
												somethingRestoredFromBkpToIni = true;
												ini[p].props[sub_p] = iniBkp[p].props[sub_p];
											}
										}
									}
									*/
								}
							}
							if (somethingRestoredFromBkpToIni) {
								iniStr = JSON.stringify(ini);
							}
							//return deferred_readIniAndMaybeBkp.resolve('ini object finalized via bkp'); //deferred_readIniAndMaybeBkp.then.promise onFulliflled expects aVal to be iniStr
							deferred_readIniAndMaybeBkp.resolve(iniStr);
							// end - do stuff here - promise_readIniBkp
						},
						function(aReason) {
							var rejObj = {name:'promise_readIniBkp', aReason:aReason, extra:'Profiles.ini was not touched by Profilist and .profilist.bkp could not be read.'}; //note: todo: should revisit, because if profilist.bkp cannot be read then this rejection cause it to not function at all, i should consider making it just continue as if ini was untouched
							console.error('Rejected - promise_readIniBkp - ', rejObj);
							
							var deepestReason = aReasonMax(aReason);
							if (deepestReason.becauseNoSuchFile) {
								// rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made
								//return deferred_readIniAndMaybeBkp.resolve('rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made');
								console.error('Rejected because .profilist.bkp doesnt exist, but still resolving as bkp will be made on next write when there is one, but because of htis line im not queueing a write');
								deferred_readIniAndMaybeBkp.resolve(iniStr); //deferred_readIniAndMaybeBkp.then.promise onFulliflled expects aVal to be iniStr
							} else {
								console.error('Rejected - promise_readIniBkp - aReason:', aReason, 'Profiles.ini was not touched by Profilist and .profilist.bkp could not be read.');
								deferred_riapoMAIN.reject(rejObj);
							}
							
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_readIniBkp', aCaught:aCaught};
							console.error('Caught - promise_readIniBkp - ', rejObj);
							deferred_riapoMAIN.reject(rejObj);
						}
					);
					promise_readIniBkp.then(
						function() {
							console.log('Success', 'promise_readIniBkp');

						},
						function(aReason) {
							//console.error('Rejected', 'promise_readIniBkp', 'aReason:', aReason);
							if (aReason.becauseNoSuchFile) {
								// rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made
								//return deferred_readIniAndMaybeBkp.resolve('rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made');
								console.error('Rejected because .profilist.bkp doesnt exist, but still resolving as bkp will be made on next write when there is one, but because of htis line im not queueing a write');
								deferred_readIniAndMaybeBkp.resolve(iniStr); //deferred_readIniAndMaybeBkp.then.promise onFulliflled expects aVal to be iniStr
							} else {
								console.error('Rejected - promise_readIniBkp - aReason:', aReason, 'Profiles.ini was not touched by Profilist and .profilist.bkp could not be read.');
								deferred_readIniAndMaybeBkp.reject('Profiles.ini was not touched by Profilist and .profilist.bkp could not be read. ' + aReason.message); //note: todo: should revisit, because if profilist.bkp cannot be read then this rejection cause it to not function at all, i should consider making it just continue as if ini was untouched
							}
						}
					).catch(
						function(aCaught) {
							console.error('Caught - promise_readIniBkp - ', aCaught);
							// throw aCaught;
						}
					);
				}
			}
			// end - do stuff here - promise_readIni
		},
		function(aReason) {
			var rejObj = {name:'promise_readIni', aReason:aReason};
			console.error('Rejected - promise_readIni - ', rejObj);
			deferred_riapoMAIN.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_readIni', aCaught:aCaught};
			console.error('Caught - promise_readIni - ', rejObj);
			deferred_riapoMAIN.reject(rejObj);
		}
	);

	//end - read the ini file and if needed read the bkp to create the ini object
	return deferred_riapoMAIN.promise;
}

function writeIniAndBkpIfDiff() {
	// makes str out of current ini, then checks if iniStr is different, if it is then it writes
	// iniStr is what it was on last readIniAndParseObjs
	// returns promise
	var deferred_writeIniAndBkpIfDiff = new Deferred();
	var nowIniStr = JSON.stringify(ini);
	if (nowIniStr != iniStr) {
		var promise_writeIniAndBkp = writeIniAndBkp();
		promise_writeIniAndBkp.then(
			function(aVal) {
				console.log('Fullfilled - promise_writeIniAndBkp - ', aVal);
				deferred_writeIniAndBkpIfDiff.resolve(aVal);
			},
			function(aReason) {
				var rejObj = {name:'promise_writeIniAndBkp', aReason:aReason};
				console.error('Rejected - promise_writeIniAndBkp - ', rejObj);
				//throw rejObj;
				deferred_writeIniAndBkpIfDiff.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_writeIniAndBkp - ', aCaught);
				deferred_writeIniAndBkpIfDiff.reject(rejObj);
				// throw aCaught;
			}
		);
	} else {
		deferred_writeIniAndBkpIfDiff.resolve('no diff, so didnt write');
	}
	
	return deferred_writeIniAndBkpIfDiff.promise;
}

function writeIniAndBkp() {
	//is promise
	//writes ini to files
		var appendNonProfilesAndGens = 8000; //so this allows user to have 8000 profiles then it will push the non general and non profile# blocks after it
		var writeStr = [];
		var profileI = -1;
		var blocksToWriteWithGroupOrder = [];
		for (var p in ini) {
			var blockNum = -1;
			var blockLines = [];
			
			if ('num' in ini[p]) {
				//is profile
				profileI++; //because we init profileI at -1
				var group = 'Profile' + ini[p].num;
				blockNum = ini[p].num;
				if (profileI != blockNum) {
					console.warn('profileI != blockNum', profileI, blockNum); //this is a problem because the order profiles show in profiles.ini is how i show them in stack, and things like promiseAll_updateStatuses uses that order to figure out which childNode is which profile
				}
			} else {
				var group = p;
				if (group == 'General') {
					blockNum = -1; //well can make this anything <= -1, its just that the first profile in ini is Profile0 so i cant use 0 here
				} else {
					blockNum = appendNonProfilesAndGens;
					appendNonProfilesAndGens++;
				}
			}

			blockLines.push('[' + group + ']');
			
			for (var p2 in ini[p].props) {
				blockLines.push(p2 + '=' + ini[p].props[p2]);
			}

			blockLines.push('');
			
			blocksToWriteWithGroupOrder.push([parseInt(blockNum), blockLines.join('\n')]);
		}

		blocksToWriteWithGroupOrder.sort(function(a, b) {
			return a[0] > b[0]; // sorts ascending
		});
		
		for (var i=0; i<blocksToWriteWithGroupOrder.length; i++) {
			writeStr.push(blocksToWriteWithGroupOrder[i][1]);
		}
		//writeStr[writeStr.length - 1] = '\n'; //we want double new line at end of file
		writeStr.push('');

		var writeStrJoined = writeStr.join('\n');
		
		var promise_writeIni = OS.File.writeAtomic(profToolkit.path_iniFile, writeStrJoined, {tmpPath:profToolkit.path_iniFile + '.profilist.tmp', encoding:'utf-8'});
		//var promise_writeIniBkp = OS.File.writeAtomic(profToolkit.path_iniBkpFile, writeStrJoined, {tmpPath:profToolkit.path_iniBkpFile + '.profilist.tmp', encoding:'utf-8'});
		var promise_writeIniBkp = tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [profToolkit.path_iniBkpFile, writeStrJoined, {tmpPath:profToolkit.path_iniBkpFile + '.profilist.tmp', encoding:'utf-8'}], profToolkit.path_iniDir);
		promise_writeIniBkp.then(
			function() {
				console.log('Success', 'promise_writeIniBkp');
				return 'Success promise_writeIniBkp';
			},
			function(aReason) {
				console.error('Rejected', 'promise_writeIniBkp', 'aReason:', aReason);
				var rejObj = {name:'promise_writeIniBkp', aReason:aReason};
				console.error('Rejected - promise_writeIniBkp - ', rejObj);
				//promise_iniObjFinalized.reject(rejObj);
				throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_writeIniBkp - ', aCaught);
				// throw aCaught;
			}
		);
		return promise_writeIni.then(
			function() {
				console.log('Success', 'promise_writeIni');
				return 'Success, promise_writeIni'; //return Promise.resolve('Success, promise_writeIni');
			},
			function(aReason) {
				//console.error('Rejected', 'promise_writeIni', 'aReason:', aReason);
				//return Promise.reject('Profiles.ini could not be be written to disk. ' + aReason.message);
				var rejObj = {name:'promise_writeIni', aReason:aReason};
				console.error('Rejected - promise_writeIni - ', rejObj);
				//promise_iniObjFinalized.reject(rejObj);
				throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_writeIni - ', aCaught);
				// throw aCaught;
			}
		);
}

/*start - salt generator from http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js?raw=1*/
var kSaltTable = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
	'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
];

function saltName(aName) {
	var kSaltString = '';
	for (var i = 0; i < 8; ++i) {
		kSaltString += kSaltTable[Math.floor(Math.random() * kSaltTable.length)];
	}
	return kSaltString + '.' + aName;
}
/*end - salt generator*/
var _getSafedForOSPath_pattWIN = /([\\*:?<>|\/\"])/g;
var _getSafedForOSPath_pattNIXMAC = /\//g;
function getSafedForOSPath(aStr, useNonDefaultRepChar) {
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				return aStr.replace(_getSafedForOSPath_pattWIN, useNonDefaultRepChar ? useNonDefaultRepChar : repCharForSafePath);
				
			break;
		default:
		
				return aStr.replace(_getSafedForOSPath_pattNIXMAC, useNonDefaultRepChar ? useNonDefaultRepChar : repCharForSafePath);
	}
}
function createProfileNew(theProfileName, absolutProfile_pathToParentDir, refreshIni, aIniKeyToClone) {
	// returns promise
		// resolves to aProfIniKey for newly created profile
	// if want to make an absolute path profile, then absolutProfile_pathToParentDir should be path to directoy we want the profile folder created ELSE null
	// the dir at absolutProfile_pathToParentDir MUST EXSIT	
	
	// reason i refreshIni is to make sure that i have latest profile num etc, and that i can check if theProfileName is not already taken
	
	var deferred_createProfile = new Deferred(); // function promise return
	
	// start - set up function for post ini read
	var postRefreshIni = function() {
		//start - once i have ini contents updated then go here
			// ensure theProfileName is not already in use by another profile
			var LCased_theProfileName = theProfileName.toLowerCase();
			var NProfiles = 0;
			for (var p in ini) {
				if (!('num' in ini[p])) { continue }
				if (ini[p].props.Name.toLowerCase() == LCased_theProfileName) {
					console.warn('The profile name of "' + theProfileName + '" is already taken.');
					deferred_createProfile.reject('ERROR: Name already taken');
					return; // just to stop further execution into this postRefreshIni function
				}
				NProfiles++;
			}
			
			// generate folder path to create based on theProfileName
			var theDirName = saltName(getSafedForOSPath(theProfileName)); // ensure the folder name generated based on theProfileName works on the os file directory system
			var theRootPath;
			var theLocalPath;
			
			var OSPath_theRootDir;
			var OSPath_theRootBase;
			var OSPath_theLocalDir;
			var OSPath_theLocalBase;
			
			if (!absolutProfile_pathToParentDir) {
				OSPath_theRootDir = profToolkit.rootPathDefault;
				OSPath_theRootBase = theDirName;
				OSPath_theLocalDir = profToolkit.localPathDefault;
				OSPath_theLocalBase = theDirName;
				
				theRootPath = OS.Path.join(profToolkit.rootPathDefault, theDirName);
				theLocalPath = OS.Path.join(profToolkit.localPathDefault, theDirName);
			} else {
				// absolute path profiles dont have a seperate local dir
				OSPath_theRootDir = absolutProfile_pathToParentDir;
				OSPath_theRootBase = theDirName;
				theRootPath = OS.Path.join(absolutProfile_pathToParentDir, theDirName);
			}
			
			// setup updateThenWriteIni
			var updateThenWriteIni = function() {
				// get PathToWriteToIni
				var PathToWriteToIni;
				if (!absolutProfile_pathToParentDir) {
					//get relative path
					var mRootDir = Services.dirsvc.get('UAppData', Ci.nsIFile); //new FileUtils.File(OS.Constants.Path.userApplicationDataDir);
					var IniPathStr = FileUtils.getFile('DefProfRt', [theDirName]);
					var PathToWriteToIni = IniPathStr.getRelativeDescriptor(mRootDir); //returns "Profiles/folderName"
					//end get relative path
				} else {
					var PathToWriteToIni = OS.Path.join(absolutProfile_pathToParentDir, theDirName);
				}
				
				// update bootstrap ini
				ini[PathToWriteToIni] = {
					num: NProfiles, //cuz profiles start at 0
					props: {
						Name: theProfileName,
						IsRelative: absolutProfile_pathToParentDir ? 0 : 1,
						Path: PathToWriteToIni
					}
				}
				
				if (aIniKeyToClone) {
					// this loop copies Profilist. props of profile to clone from, so like badge, and tie
					for (var p in ini[aIniKeyToClone].props) {
						if (p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
							ini[PathToWriteToIni][p] = ini[aIniKeyToClone].props[p];
						}
					}
				}
				
				// write ini
				var promise_updateIniFile = writeIniAndBkp();
				promise_updateIniFile.then(
					function(aVal) {
						console.log('Fullfilled - promise_updateIniFile - ', aVal);
						// update then write ini
						//deferred_createProfile.resolve('Profile "' + theProfileName + '" succesfully created');
						deferred_createProfile.resolve(PathToWriteToIni);
					},
					function(aReason) {
						var rejObj = {name:'promise_updateIniFile', aReason:aReason};
						console.error('Rejected - promise_updateIniFile - ', rejObj);
						deferred_createProfile.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						console.error('Caught - promise_updateIniFile - ', aCaught);
						var rejObj = {name:'promise_updateIniFile', aCaught:aCaught};
						deferred_createProfile.reject(rejObj);
					}
				);
			}
			// end setup updateThenWriteIni
			
			var promiseAllArr_make = [];
			
			if (!aIniKeyToClone) {
				// make root dir
				var promise_makeRoot = OS.File.makeDir(theRootPath);
				promiseAllArr_make.push(promise_makeRoot);
				
				var deferred_writeTimesJson = new Deferred();
				promiseAllArr_make.push(deferred_writeTimesJson.promise);
				
				if (!absolutProfile_pathToParentDir) {
					// making absolute path dir
					var promise_makeLocal = OS.File.makeDir(theLocalPath);
					promiseAllArr_make.push(promise_makeLocal);
				}
				
				// set up to do the promise_writeTimes in root dir
				promise_makeRoot.then(
					function(aVal) {
						console.log('Fullfilled - promise_makeRoot - ', aVal);
						// start - writeTimes promise
							var writeStrForTimesJson = '{\n"created": ' + new Date().getTime() + '}\n';
							var timeJsonPath = OS.Path.join(theRootPath, 'times.json');
							var promise_writeAtomicTimes = OS.File.writeAtomic(timeJsonPath, writeStrForTimesJson, {tmpPath: timeJsonPath + '.profilist.tmp', encoding:'utf-8'});
							promise_writeAtomicTimes.then(
								function(aVal2) {
									console.log('Fullfilled - promise_writeAtomicTimes - ', aVal2);
									// do stuff here
									deferred_writeTimesJson.resolve('times json succesfully written');
								},
								function(aReason) {
									var rejObj = {name:'promise_writeAtomicTimes', aReason:aReason};
									console.error('Rejected - promise_writeAtomicTimes - ', rejObj);
									deferred_writeTimesJson.reject(rejObj);
								}
							).catch(
								function(aCaught) {
									console.error('Caught - promise_writeAtomicTimes - ', aCaught);
									var rejObj = {name:'promise_writeAtomicTimes', aCaught:aCaught};
									deferred_writeTimesJson.reject(rejObj);
								}
							);
						// end - writeTimes promise
					}
				);
			} else {
				// figure out dir paths that we are going to clone
				var cloneProfileDirPaths = getPathToProfileDir(aIniKeyToClone, true);
				var promise_cloneRoot = ProfilistWorker.post('copyDirAs', [cloneProfileDirPaths.OSPath_root, OSPath_theRootDir, OSPath_theRootBase]);
				promiseAllArr_make.push(promise_makeRoot);

				if (!absolutProfile_pathToParentDir) {
					// clone target is a relative profile SO needs local dir SOOO copy the local dir IF clone source is a Relative profile ELSE create a local dir
					// im hoping that things work fine if i clone a Relative to Absolute profile AND if clone a Absolute to a Relative
					if ('OSPath_local' in cloneProfileDirPaths) {
						// clone source is a Relative profile SO copy local
						var promise_cloneLocal = ProfilistWorker.post('copyDirAs', [cloneProfileDirPaths.OSPath_local, OSPath_theLocalDir, OSPath_theLocalBase]);
						promiseAllArr_make.push(promise_cloneLocal);
					} else {
						// clone source is an Absolute profile SO create local
						var promise_makeLocal = OS.File.makeDir(theLocalPath);
						promiseAllArr_make.push(promise_makeLocal);
					}
				}
			}
			

			// dont need the reject or catch as these promise all go to promiseAll_make
			// end set up to do the promise_writeTimes
			
			var promiseAll_make = Promise.all(promiseAllArr_make);			
			promiseAll_make.then(
				function(aVal) {
					console.log('Fullfilled - promiseAll_make - ', aVal);
					// update then write ini
					updateThenWriteIni();
				},
				function(aReason) {
					var rejObj = {name:'promiseAll_make', aReason:aReason};
					console.error('Rejected - promiseAll_make - ', rejObj);
					deferred_createProfile.reject(rejObj); //throw rejObj;
				}
			).catch(
				function(aCaught) {
					console.error('Caught - promiseAll_make - ', aCaught);
					var rejObj = {name:'promiseAll_make', aCaught:aCaught};
					deferred_createProfile.reject(rejObj); // throw aCaught;
				}
			);
			
			// run promise to make root dir
			// run promise to make local dir
			// wait for root and local dir promise to complete, if they both complete, then promise write to ini
		//end - once i have ini contents updated then go here
	};
	// end - set up function for post ini read
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		postRefreshIni();
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				postRefreshIni();
			},
			function(aReason) {
				var rejObj = {name:'promise_refreshIni', aReason:aReason};
				console.error('Rejected - promise_refreshIni - ', rejObj);
				deferred_createProfile.reject(rejObj); //throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var rejObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_createProfile.reject(rejObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_createProfile.promise;
}

function renameProfile(aProfIniKey, theProfileNewName, refreshIni) {
	// returns promise
	
	var deferred_renameProfile = new Deferred(); // function promise return
	
	var theProfileCurrentName = ini[aProfIniKey].props.Name;
	
	// setup postRefreshIni
	var postRefreshIni = function() {
		// start by looping through to find profile in ini and also check if new name is available (as in not taken by another)
		var LCased_theProfileNewName = theProfileNewName.toLowerCase();
		var iniIdentifier = aProfIniKey;
		var theIdenter = aProfIniKey;
		var newNameTaken = false;
		for (var p in ini) {
			if (!('num' in ini[p])) { continue }
			var LCased_iteratedProfileName = ini[p].props.Name.toLowerCase();
			if (LCased_iteratedProfileName == LCased_theProfileNewName) {
				newNameTaken = true;
				console.warn('Another profile already has the new name of "' + theProfileNewName + '" - so cannot rename the profile of "' + theProfileCurrentName + '".');
				deferred_renameProfile.reject('name-taken');
				return; // just to stop further execution into this function				
			}
		}
		
		// rename in bootstrap ini
		ini[theIdenter].props.Name = theProfileNewName;

		// write ini
		var promise_updateIniFile = writeIniAndBkp();
		promise_updateIniFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_updateIniFile - ', aVal);
				deferred_renameProfile.resolve('Profile "' + theProfileCurrentName + '" succesfully renamed to "' + theProfileNewName + '"');
			},
			function(aReason) {
				var rejObj = {name:'promise_updateIniFile', aReason:aReason};
				console.error('Rejected - promise_updateIniFile - ', rejObj);
				deferred_renameProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_updateIniFile - ', aCaught);
				var rejObj = {name:'promise_updateIniFile', aCaught:aCaught};
				deferred_renameProfile.reject(rejObj);
			}
		);
	};
	// end - setup postRefreshIni
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		postRefreshIni();
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				postRefreshIni();
			},
			function(aReason) {
				var rejObj = {name:'promise_refreshIni', aReason:aReason};
				console.error('Rejected - promise_refreshIni - ', rejObj);
				deferred_renameProfile.reject(rejObj); //throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var rejObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_renameProfile.reject(rejObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_renameProfile.promise;
}

function deleteProfile(aProfIniKey, refreshIni) {
	// returns promise
	
	var deferred_deleteProfile = new Deferred(); // function promise return
	
	var theProfileName = ini[aProfIniKey].props.Name;
	if (aProfIniKey == profToolkit.selectedProfile.iniKey) {
		console.warn('"' + theProfileName + '" - is this profile, cannot delete a profile that is in use.');
		deferred_deleteProfile.reject(myServices.sb.GetStringFromName('temporary-profile') + ' ' + myServices.sb.GetStringFromName('profile-in-use'));
		return deferred_deleteProfile.promise; // have to return the promise here, even though this return is mostly to prevent further executing into function, but we havent returned the promise yet so have to here
	}
	
	// setup doDeletion
	var doDeletion = function(theIdenter) {
		var promiseAllArr_doDel = [];
		var PathRootDir;
		var PathLocalDir;
		if (ini[theIdenter].props.IsRelative == '1') {
			var theDirName = OS.Path.basename(OS.Path.normalize(ini[theIdenter].props.Path));
			PathRootDir = OS.Path.join(profToolkit.rootPathDefault, theDirName);
			PathLocalDir = OS.Path.join(profToolkit.localPathDefault, theDirName);
			
			var promise_delLocal = OS.File.removeDir(PathLocalDir, {ignoreAbsent:true, ignorePermissions:false});
			promiseAllArr_doDel.push(promise_delLocal);
		} else {
			PathRootDir = ini[theIdenter].props.Path; //may need to normalize this for other os's than xp and 7  im not sure
		}
		var promise_delRoot = OS.File.removeDir(PathRootDir, {ignoreAbsent:true, ignorePermissions:false});
		promiseAllArr_doDel.push(promise_delRoot);
		
		var promiseAll_doDel = Promise.all(promiseAllArr_doDel);
		promiseAll_doDel.then(
			function(aVal) {
				console.log('Fullfilled - promiseAll_doDel - ', aVal);
				// start - remove from bootstrap ini then update ini
				console.info('ini pre num mod:', JSON.stringify(ini));
				for (var p in ini) {
					if (!('num' in ini[p])) { continue }
					if (ini[p].num > ini[theIdenter].num) { // this expects .num to be parsed
						ini[p].num--; // this expects .num to be parsed
					}
				}
				console.info('ini post num mod:', JSON.stringify(ini));
				delete ini[theIdenter];
				console.info('ini post num mod and del:', JSON.stringify(ini));

				// write ini
				var promise_updateIniFile = writeIniAndBkp();
				promise_updateIniFile.then(
					function(aVal) {
						console.log('Fullfilled - promise_updateIniFile - ', aVal);
						// update then write ini
						deferred_deleteProfile.resolve('Profile "' + theProfileName + '" succesfully deleted');
					},
					function(aReason) {
						var rejObj = {name:'promise_updateIniFile', aReason:aReason};
						console.error('Rejected - promise_updateIniFile - ', rejObj);
						deferred_deleteProfile.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						console.error('Caught - promise_updateIniFile - ', aCaught);
						var rejObj = {name:'promise_updateIniFile', aCaught:aCaught};
						deferred_deleteProfile.reject(rejObj);
					}
				);
				// end - remove from bootstrap ini then update ini
			},
			function(aReason) {
				var rejObj = {name:'promiseAll_doDel', aReason:aReason};
				console.error('Rejected - promiseAll_doDel - ', rejObj);
				deferred_deleteProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promiseAll_doDel - ', aCaught);
				var rejObj = {name:'promiseAll_doDel', aCaught:aCaught};
				deferred_deleteProfile.reject(rejObj);
			}
		);
	};
	// end setup doDeletion
	
	// setup postRefreshIni
	var postRefreshIni = function() {
		var iniIdentifier = aProfIniKey;
		
		/*
		if (iniIdentifier === null) {
			console.warn('Could not find a profile with the name of "' + theProfileName + '" - so nothing to delete.');
			deferred_deleteProfile.reject('Could not find a profile with the name of "' + theProfileName + '" - so nothing to delete.');
			return; // just to stop further execution into this function
		}
		*/
		
		// check if profile is in use
		var promise_profInUseCheck = ProfilistWorker.post('queryProfileLocked', [ini[iniIdentifier].props.IsRelative, ini[iniIdentifier].props.Path, profToolkit.rootPathDefault]);
		promise_profInUseCheck.then(
			function(aVal) {
				console.log('Fullfilled - promise_profInUseCheck - ', aVal);
				// do stuff here
				if (aVal) {
					// aVal is true if locked
					deferred_deleteProfile.reject(myServices.sb.GetStringFromName('error') + ' ' + myServices.sb.GetStringFromName('profile-in-use')); // '"' + theProfileName + '" - is currently running, cannot delete a profile that is in use.'
				} else {
					doDeletion(iniIdentifier);
				}
			},
			function(aReason) {
				var rejObj = {name:'promise_profInUseCheck', aReason:aReason};
				console.error('Rejected - promise_profInUseCheck - ', rejObj);
				deferred_deleteProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_profInUseCheck - ', aCaught);
				var rejObj = {name:'promise_profInUseCheck', aCaught:aCaught};
				deferred_deleteProfile.reject(rejObj);
			}
		);
	}
	// end setup postRefreshIni
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		postRefreshIni();
		//deferred_waitReadIni.resolve('no refresh arg set');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				postRefreshIni();
			},
			function(aReason) {
				var rejObj = {name:'promise_refreshIni', aReason:aReason};
				console.error('Rejected - promise_refreshIni - ', rejObj);
				deferred_deleteProfile.reject(rejObj); //throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var rejObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_deleteProfile.reject(rejObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_deleteProfile.promise;
}

function defaultProfile(aProfIniKey, refreshIni) {
	// sets/unsets default profile
	// if aProfIniKey is already default, it unsets it, and sets StartWithLastProfile to 0
		// else it makes it default, and finds what was perviously default and unsets that, and sets StartWithLastProfile to 1
	// returns promise
	
	var deferred_defaultProfile = new Deferred(); // function promise return
	
	var theProfileCurrentName = ini[aProfIniKey].props.Name;
	
	// setup postRefreshIni
	var postRefreshIni = function() {
		// start by looping through to find profile in ini and also check if new name is available (as in not taken by another)
		var cDefaultProfInfo = getDefaultIniKeyInObj(ini);
		
		if (cDefaultProfInfo !== null) {
			if (cDefaultProfInfo.iniKey == aProfIniKey) {
				// unset self from being default
				delete ini[aProfIniKey].props.Default;
				ini.General.props.StartWithLastProfile = 0;
			} else {
				// unset other from being default
				delete ini[cDefaultProfInfo.iniKey].props.Default;
				ini[aProfIniKey].props.Default = 1;
				ini.General.props.StartWithLastProfile = 1;
			}
		} else {
			//nothing was set to default my logic follows that StartWithLastProfile should be 0
			ini[aProfIniKey].props.Default = 1;
			ini.General.props.StartWithLastProfile = 1;
		}

		// write ini
		var promise_updateIniFile = writeIniAndBkp();
		promise_updateIniFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_updateIniFile - ', aVal);
				deferred_defaultProfile.resolve('Profile succesfuly marked as default');
			},
			function(aReason) {
				var rejObj = {name:'promise_updateIniFile', aReason:aReason};
				console.error('Rejected - promise_updateIniFile - ', rejObj);
				deferred_defaultProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_updateIniFile - ', aCaught);
				var rejObj = {name:'promise_updateIniFile', aCaught:aCaught};
				deferred_defaultProfile.reject(rejObj);
			}
		);
	};
	// end - setup postRefreshIni
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		postRefreshIni();
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				postRefreshIni();
			},
			function(aReason) {
				var rejObj = {name:'promise_refreshIni', aReason:aReason};
				console.error('Rejected - promise_refreshIni - ', rejObj);
				deferred_defaultProfile.reject(rejObj); //throw rejObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var rejObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_defaultProfile.reject(rejObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_defaultProfile.promise;
}

function initProfToolkit() {
//	console.log('in initProfToolkit');
	
	profToolkit = {
		rootPathDefault: 0,
		localPathDefault: 0,
		profileCount: 0,
		/*profiles: {},*/
		selectedProfile: {
			rootDirName: 0,
			localDirName: 0,
			rootDirPath: 0,
			localDirPath: 0,
			name: null
		} //reference to the profiles object but to the current profile in the profiles object
	};
	
	profToolkit.exePath = Services.dirsvc.get('XREExeF', Ci.nsIFile).path;
	profToolkit.exePathLower = profToolkit.exePath.toLowerCase();
	
	_cache_getChannelNameOfExePath[profToolkit.exePathLower] = core.firefox.channel; // link354869099
	
	profToolkit.path_exeCur = profToolkit.exePath; //currently running channels exe
	profToolkit.rootPathDefault =  Services.dirsvc.get('DefProfRt', Ci.nsIFile).path; //FileUtils.getFile('DefProfRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.localProfileDir); //will work as long as at least one profile is in the default profile folder //i havent tested when only custom profile
//	console.log('initProfToolkit 1');
	profToolkit.localPathDefault = Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path //FileUtils.getFile('DefProfLRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.profileDir);
//	console.log('initProfToolkit 2');

	profToolkit.selectedProfile.rootDirPath = OS.Constants.Path.profileDir;
	profToolkit.selectedProfile.localDirPath = OS.Constants.Path.localProfileDir;
	
	profToolkit.selectedProfile.rootDirName = OS.Path.basename(profToolkit.selectedProfile.rootDirPath);
	profToolkit.selectedProfile.localDirName = OS.Path.basename(profToolkit.selectedProfile.localDirPath);
	
	//var profToolkit.path_iniFile = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
	//var profToolkit.path_iniBkpFile = profToolkit.path_iniFile + '.profilist.bkp';
	
	profToolkit.path_iniDir = OS.Constants.Path.userApplicationDataDir;
	profToolkit.path_iniFile = OS.Path.join(profToolkit.path_iniDir, 'profiles.ini');
	
	//profToolkit.nsIFile_iniDir = new FileUtils.File(profToolkit.path_iniDir); //for getRelativeDescriptor use
	
	if (profToolkit.selectedProfile.rootDirPath.indexOf(profToolkit.rootPathDefault) > -1) {
		//then its PROBABLY relative as its in the folder it should be
		//console.log('setting XYZ here:', profToolkit.selectedProfile.rootDirPath, profToolkit.rootPathDefault);
		var IniPathStr = new FileUtils.File(profToolkit.selectedProfile.rootDirPath); //OS.Path.join(profToolkit.rootPathDefault, profToolkit.selectedProfile.rootDirName);
		var PathToWriteToIni = IniPathStr.getRelativeDescriptor(Services.dirsvc.get('UAppData', Ci.nsIFile)); //returns "Profiles/folderName" /***console.time('blah'); var sep = sep.getRelativeDescriptor(sep2); console.timeEnd('blah'); console.log(sep); ~~~ 0.04ms***/
		profToolkit.selectedProfile.relativeDescriptor_rootDirPath = PathToWriteToIni;
	} else {
		//its not relative
		//console.log('setting XYZ null');
		profToolkit.selectedProfile.relativeDescriptor_rootDirPath = null;
	}
	profToolkit.selectedProfile.iniKey = undefined; //note: i set it to undefined meaning it hasnt been verified yet, i set it to null for temp profile meaning name not found, i set it to string once it was verified
	
	profToolkit.PrfDef = Services.dirsvc.get('PrfDef', Ci.nsIFile).path;
	
	
	// start - define profilist_data structure and paths
	profToolkit.path_profilistData_root = OS.Path.join(profToolkit.path_iniDir, 'profilist_data');
	profToolkit.path_profilistData_root__fromDir = profToolkit.path_iniDir; // should be the first bit from os.path.join of path_profilistData_root // for when dirs need to be made from a dir that exists for sure
	profToolkit.path_iniBkpFile = OS.Path.join(profToolkit.path_profilistData_root, 'profiles.ini.profilist.bkp'); // profToolkit.path_iniFile + '.profilist.bkp'; // path_iniBkpFile is located in this root folder at least per my decision as of now
	profToolkit.path_profilistData_iconsets = OS.Path.join(profToolkit.path_profilistData_root, 'iconsets');
	profToolkit.path_profilistData_launcherIcons = OS.Path.join(profToolkit.path_profilistData_root, 'launcher_icons');
	profToolkit.path_profilistData_launcherExes = OS.Path.join(profToolkit.path_profilistData_root, 'launcher_exes');
	profToolkit.path_profilistData_idsJson = OS.Path.join(profToolkit.path_profilistData_root, 'ids.json');
	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				profToolkit.path_profilistData_winntWatchDir = OS.Path.join(profToolkit.path_profilistData_root, 'winnt_watch_dir');
				if (core.os.version_name == '7+') {
					profToolkit.path_system_dirForNormalPins = OS.Path.join(OS.Constants.Path.winAppDataDir, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar'); // :note: implementation specific, test on win10 and all windows version
					profToolkit.path_system_dirForRelaunchCmdPins = OS.Path.join(OS.Constants.Path.winAppDataDir, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'ImplicitAppShortcuts'); // :note: implementation specific, test on win10 and all windows version
					profToolkit.path_system_dirStartScreen = Services.dirsvc.get('CmPrgs', Ci.nsIFile).path; // im guessing on this one, based on right click and open file location from start screen, it gave me C:\ProgramData\Microsoft\Windows\Start Menu\Programs on right click, and this dirsvc special matches that
				}
				profToolkit.path_system_dirQuickLaunch = OS.Path.join(OS.Constants.Path.winAppDataDir, 'Microsoft', 'Internet Explorer', 'Quick Launch'); //C:\Users\Vayeate\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch // https://gist.github.com/Noitidart/f43784329caaa5f75382#file-_ff-addon-snippet-os-shortcutservice-js-L51
				profToolkit.path_system_dirPrograms = OS.Constants.Path.winStartMenuProgsDir; // same as Services.dirsvc.get('Progs', Ci.nsIFile).path; // drivsvc paths are cached
			break;
			
		default:
			// do nothing
	}
	// end - define profilist_data structure and paths
	
	//get relative path
	//this way too slow dont do it: var IniPathStr = FileUtils.getFile('DefProfRt', ['name of folder you want in profiles folder']); //3.32ms
	//var IniPathStr = OS.Path.join(profToolkit.rootPathDefault, 'name of folder you want in profiles folder'); //0.1ms /***console.time('blah'); var sep = new FileUtils.File(OS.Path.join(scope.profToolkit.rootPathDefault, 'name of folder you want in profiles folder')); console.timeEnd('blah'); console.log(sep); ~~~ 0.17ms***/
	//var PathToWriteToIni = IniPathStr.getRelativeDescriptor(profToolkit.nsIFile_iniDir); //returns "Profiles/folderName" /***console.time('blah'); var sep = sep.getRelativeDescriptor(sep2); console.timeEnd('blah'); console.log(sep); ~~~ 0.04ms***/
	//btw if do 
	//end get relative path
	
	
//	console.log('initProfToolkit DONE');
	/*
	var selectedRootDir = OS.Path.basename(OS.Constants.Path.profileDir);
	var selectedLocalDir = OS.Path.basename(OS.Constants.Path.localProfileDir);
	var me = Services.wm.getMostRecentWindow(null);
	me.alert(selectedRootDir + '\n' + selectedLocalDir)
	// from custom:
	// on desk
	// on desk
	// from default:
	// ncc90nnv.default
	// ncc90nnv.default
	*/
	
	/*
	var rootPathDefault = FileUtils.getFile('DefProfRt', [])
	var localPathDefault = FileUtils.getFile('DefProfLRt', [])
	var me = Services.wm.getMostRecentWindow(null);

	me.alert(rootPathDefault.path + '\n' + OS.Constants.Path.profileDir)
	// from custom:
	// C:\Users\ali57233\AppData\Roaming\Mozilla\Firefox\Profiles
	// C:\Users\ali57233\Desktop\on desk
	// from default:
	// C:\Users\ali57233\AppData\Roaming\Mozilla\Firefox\Profiles
	// C:\Users\ali57233\AppData\Roaming\Mozilla\Firefox\Profiles\ncc90nnv.default

	me.alert(localPathDefault.path + '\n' + OS.Constants.Path.localProfileDir)
	// from custom:
	// C:\Users\ali57233\AppData\Local\Mozilla\Firefox\Profiles
	// C:\Users\ali57233\Desktop\on desk
	// from  default:
	// C:\Users\ali57233\AppData\Local\Mozilla\Firefox\Profiles
	// C:\Users\ali57233\AppData\Local\Mozilla\Firefox\Profiles\ncc90nnv.default
	*/
}

function updateOnPanelHid(e) {
	// do these actions on hid because like if we dont close it, then if user goes to customize, then it remains open blah blah ya
	//console.log('execing updateOnPanelHid, e:', e); //todo: figure out why its called so much
	if (e.originalTarget.id != 'PanelUI-popup') { return }

	var DOMWin = e.view;
	DOMWin.Profilist.PBox.style.height = collapsedheight + 'px';
	DOMWin.Profilist.PBox.classList.remove('profilist-hovered');
	
	tbb_msg_close(null, DOMWin);
	
}

var collapseTimer = 0;
var expandTimer = 0;
const collapseDelay = 500;
const expandDelay = 300;
function updateOnPanelShowing(e, aDOMWindow, dontRefreshIni, forCustomizationTabInsertItDisabled) { //returns promise
	//does not fire when entering customize mode
	var deferred_updateOnPanelShowing = new Deferred();
	
	//get aDOMWindow
	if (!aDOMWindow) {
		if (!e) {
			console.error('no e and no aDOMWindow');
			deferred_updateOnPanelShowing.reject('no e and no aDOMWindow');
			return deferred_updateOnPanelShowing.promise;
		} else {
			//console.log('e on panel showing = ', e);
			//console.log('e.view == e.target.ownerDocument.defaultView == ', e.view == e.target.ownerDocument.defaultView); //is true!! at least when popup id is PanelUI-popup
			aDOMWindow = e.view;
			if (e.target.id != 'PanelUI-popup') {
				console.warn('not main panel showing so dont updateProfToolkit');
				deferred_updateOnPanelShowing.reject('not main panel showing so dont updateProfToolkit');
				return deferred_updateOnPanelShowing.promise;
			}
		}
	} else {
		console.error('has aDOMWindow');
	}
	
	//get panel
	// http://mxr.mozilla.org/mozilla-beta/source/browser/components/customizableui/content/panelUI.js#26
	// tells you like .panel is PanelUI-popup etc
	
	console.error('aDOMWindow.PanelUI._initialized:', aDOMWindow.PanelUI._initialized);
	
	var PUI = aDOMWindow.PanelUI.panel; //PanelUI-popup
	var PUIf = aDOMWindow.PanelUI.mainView.childNodes[1]; //PanelUI-footer //aDOMWindow.PanelUI.mainView.childNodes == NodeList [ <vbox#PanelUI-contents-scroller>, <footer#PanelUI-footer> ]
	
	//var PUIcs = aDOMWindow.PanelUI.mainView.childNodes[0]; //PanelUI-contents-scroller
	
	//check if profilist is in there already and get profilist nodes
	var PBox;
	var PStack; //dom element key=profilist_stack
	var PLoading;
	console.log('aDOMWindow.Profilist:', aDOMWindow.Profilist);
	if (/*!('Profilist' in aDOMWindow)*/ aDOMWindow.Profilist === null) {
			console.log('as profilist is null we set up');
			aDOMWindow.Profilist = {};
			
			var profilistHBoxJSON =
			['xul:vbox', {id:'profilist_box', class:'', style:''},
				['xul:stack', {/*key:'profilist_stack'*/},
					['xul:box', {class:'profilist-tbb-box', id:'profilist-loading', /*key:'profilist-loading',*/ disabled:'true', label:myServices.sb.GetStringFromName('loading-profiles')}]
				]
			];
			var basePNodes = {}; //baseProfilistNodes
			var PBox = jsonToDOM(profilistHBoxJSON, aDOMWindow.document, basePNodes);
			
			PUIf.insertBefore(PBox, PUIf.firstChild);
			
			PStack = PBox.childNodes[0];
			PLoading = /*basePNodes['profilist-loading']; //*/PStack.childNodes[0];
			console.error('PLoading:', PLoading);
			
			aDOMWindow.Profilist.PBox = PBox; /* link 646432132158 */
			aDOMWindow.Profilist.PStack = PStack;
			//aDOMWindow.Profilist.PLoading = PLoading;
			
			if (!PUIsync_height) {
				console.error('getComputed:', aDOMWindow.getComputedStyle(PLoading, '').height);
				PUIsync_height = PLoading.boxObject.height;
				console.error('PLoading.boxObject.height:', PLoading.boxObject.height);

				collapsedheight = PUIsync_height;
				//var computedHeight = win.getComputedStyle(el, '').height;
				//console.log('computed PUIsync_height:', computedHeight);
				console.log('PUIsync_height determined to be = ', PUIsync_height);
			}
			PBox.style.height = PUIsync_height + 'px';
			
			//note: maybe desired enhancement, rather then do getElementById everytime to get profilist_box i can store it in the window object, but that increases memory ~LINK678132
			/*
			aDOMWindow.Profilist.basePNodes = {
				'profilist_stack': basePNodes.profilist_stack
			}
			*/
			
			PBox.addEventListener('mouseenter', function(e_ME) {
				if (PStack.lastChild.hasAttribute('disabled')) {
					return;
				}
				// aDOMWindow.clearTimeout(collapseTimer);
				// aDOMWindow.clearTimeout(expandTimer);
				// expandTimer = aDOMWindow.setTimeout(function() {
					e_ME.stopPropagation();
					expandedheight = PStack.childNodes.length * PUIsync_height;
					PBox.addEventListener('transitionend', function(e_ETE) {
						PBox.removeEventListener('transitionend', arguments.callee, false);
						e_ETE.stopPropagation();
						console.log('PBox height transed');
						// start test if overflowing to show custom scroll bar
						console.info('PUI.boxObject.height:', PUI.boxObject.height);
						console.info('PBox.boxObject.height:', PBox.boxObject.height);
						if (PUI.boxObject.height < PBox.boxObject.height) {
							console.log('need to show scroll bar');
						} else {
							console.log('no need 4 scrollbar');
						}
						// end test if overflowing to show custom scroll bar
					}, false);
					PBox.style.height = expandedheight + 'px';
					PBox.classList.add('profilist-hovered');
					updateStatusImgs(aDOMWindow);
				// }, expandDelay);
			}, false);
			PBox.addEventListener('mouseleave', function(e_ML) {
				e_ML.stopPropagation();
				if (PBox.classList.contains('profilist-keep-open')) { return }
				// aDOMWindow.clearTimeout(collapseTimer);
				// aDOMWindow.clearTimeout(expandTimer);
				// collapseTimer = aDOMWindow.setTimeout(function() {
					PBox.classList.remove('profilist-hovered');
					PBox.style.height = collapsedheight + 'px';
					tbb_msg_close(null, aDOMWindow);
				// }, collapseDelay);
			}, false);
	} else {
		//note: maybe desired enhancement, rather then do getElementById everytime to get profilist_box i can store it in the window object, but that increases memory ~LINK678132
		console.time('PBox getElementById');
		PBox = aDOMWindow.Profilist.PBox; //aDOMWindow.document.getElementById('profilist_box'); //alternative `PUI.querySelector('#profilist_box')`
		console.timeEnd('PBox getElementById');
		PStack = aDOMWindow.Profilist.PStack; //PBox.childNodes[0];
	}
	
	//make sure its PStack is collapsed
	//PStack.style.height = collapsedheight + 'px'; //maybe not needed //was doing this in past: `if (collapsedheight != PUIsync_height || stack.style.height == '') {`
	
	//start read ini
	if (dontRefreshIni) {
		var deferred_uopsReadIni = new Deferred();
		var promise_uopsReadIni = deferred_uopsReadIni.promise;
		deferred_uopsReadIni.resolve('dontRefreshIni is true so will skipped readIniAndParseObjs');
	} else {
		var promise_uopsReadIni = readIniAndParseObjs();
	}
	
	promise_uopsReadIni.then(
		function(aVal) {
			console.log('Fullfilled - promise_uopsReadIni - ', aVal);
			// start - do stuff here - promise_uopsReadIni
			//////////////////////////////// start - do dom stuff
			//compare aDOMWindow.Profilist.iniObj_thatAffectDOM to global iniObj_thatAffectDOM
			
			//note, in the dom, the tbb_boxes should be in order as they are seen in iniFile
			
			//and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
			var initialPanelDomSetup = false;
			if (!('iniObj_thatAffectDOM' in aDOMWindow.Profilist)) {
				aDOMWindow.Profilist.iniObj_thatAffectDOM = {};
				initialPanelDomSetup = true;
				
				PStack.removeChild(PStack.childNodes[0]); //remove loading
				
				//create and add create new profile tbb
				var elFromJson_createNewProfile = jsonToDOM(
					['xul:box', {class:'profilist-tbb-box profilist-create', label:myServices.sb.GetStringFromName('create-new-profile'), top:0}]
					, aDOMWindow.document
					, {}
				);
				//{identifier:'[label="Create New Profile"]', label:'Create New Profile', class:'profilist-tbb-box profilist-create profilist-do_not_auto_remove', addEventListener:['click',createUnnamedProfile,false], style:tbb_style}
				elFromJson_createNewProfile.addEventListener('click', tbb_box_click, false);
				elFromJson_createNewProfile.addEventListener('mousedown', properactive, false);
				PStack.appendChild(elFromJson_createNewProfile);
				var SMItem_profilistClone = aDOMWindow.document.getAnonymousElementByAttribute(elFromJson_createNewProfile, 'class', 'profilist-clone'); // getAnon must go after PStack.appendChild as anon nodes dont come in until its added to doc
				console.error('info SMItem_profilistClone:', SMItem_profilistClone);
				SMItem_profilistClone.addEventListener('mouseenter', function() {
					if (!('clone-profile' in tbb_msg_restore_handlers)) {
						tbb_msg('clone-profile', 'Clone Profile', 'restoreStyleMouseLeave', aDOMWindow, elFromJson_createNewProfile, SMItem_profilistClone, {onrestore:function(){if(PBox.classList.contains('profilist-cloning')){return true}}}, false);
					} // else { // already handled so dont do it. cuz if its on "Pick a profile..." it iwll then overwrite message with "Clone Profile" on mouseenter
				}, false);
				
				//profToolkit.selectedProfile.iniKey == null then this is a temporary profile
				/*
				var elFromJson_currentProfile = jsonToDOM(
					['xul:box', {class:'profilist-tbb-box profilist-cur-prof', label:myServices.sb.GetStringFromName('temporary-profile'), status:'active', top:0}]
					, aDOMWindow.document
					, {}
				);
				*/
				////// copy/modification/strips of block 8752123154 //except for the he forCustomizationTabInsertItDisabled
				/*
				if (profToolkit.selectedProfile.isTemp) {
					// its a temp prof
					var elJson = ['xul:box', {class:['profilist-tbb-box', 'profilist-tbb-box-inactivatable profilist-cur-profile profilist-temp-profile'], status:'active', style:['margin-top:0'], top:0}];
					elJson[1].label = myServices.sb.GetStringFromName('temporary-profile');
					var elFromJson = jsonToDOM(	// make jsonToDOM of ini[pb].props
						elJson
						, aDOMWindow.document
						, {}
					);
					//elFromJson.addEventListener('click', tbb_box_click, false);
				}
				*/
				var elJson = ['xul:box', {class:['profilist-tbb-box', 'profilist-tbb-box-inactivatable profilist-cur-profile'], status:'active', style:['margin-top:0'], top:0}];
				var sIniKey = profToolkit.selectedProfile.iniKey;
				if (sIniKey) { // so profToolkit.selectedProfile.isTemp is true
					console.error('sIniKey is == ', sIniKey);
					if (forCustomizationTabInsertItDisabled) {
						elJson[1].disabled = 'true';
						PStack.style.pointerEvents = 'none';
					}
					elJson[1].label = ini[sIniKey].props.Name;
					if ('Default' in ini[sIniKey].props && ini[sIniKey].props.Default == '1') {
						elJson[1].isdefault = true;
					}
					if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true && 'Profilist.tie' in ini[sIniKey].props) {
						elJson[1].class.push('profilist-tied');
						elJson[1].style.push('background-image: url("' + iniObj_thatAffectDOM.General.props['Profilist.currentThisBuildsIconPath'] + '")');
					}
					if ('Profilist.badge' in ini[sIniKey].props) {
						elJson[1].badge = getPathToBadge(ini[sIniKey].props['Profilist.badge'], 16);
					}
					elJson[1].class = elJson[1].class.join(' ');
					elJson[1].style = elJson[1].style.join('; ');
				} else {
					//is temp profile
					elJson[1].label = myServices.sb.formatStringFromName('temporary-profile-with-dir-name', [profToolkit.selectedProfile.name], 1); //myServices.sb.GetStringFromName('temporary-profile');
					elJson[1].class.push('profilist-temp-prof');
					elJson[1].class = elJson[1].class.join(' ');
				}
				var elFromJson = jsonToDOM(	// make jsonToDOM of ini[pb].props
					elJson
					, aDOMWindow.document
					, {}
				);
				elFromJson.addEventListener('click', tbb_box_click, false);
				////// end copy/modification/strips of block 8752123154
				
				PStack.appendChild(elFromJson);
				var boxAnons = elFromJson.ownerDocument.getAnonymousNodes(elFromJson);
				var setdefault = boxAnons[1].querySelector('.profilist-default');
				//console.info('setdefault', setdefault);
				setdefault.addEventListener('mouseenter', subenter, false);
				setdefault.addEventListener('mouseleave', subleave, false);
			}
			
			var objWin = aDOMWindow.Profilist.iniObj_thatAffectDOM; //just to short form it
			var objBoot = iniObj_thatAffectDOM; //just to short form it
			
			var str_ObjWin = JSON.stringify(objWin);
			var str_ObjBoot = JSON.stringify(objBoot);
			
			//console.log('str_ObjBoot', str_ObjBoot, 'str_ObjWin', str_ObjWin);
			
			if (str_ObjBoot != str_ObjWin) {
				console.info('str_ObjWin:', str_ObjWin, 'objWin:', objWin);
				
				if (initialPanelDomSetup || objWin.General.props['Profilist.dev'] != myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value + '') { // :todo: need to remove Profilist.dev from objBoot.General.props['Profilist.dev']
					if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == false) { //if (objBoot.General.props['Profilist.dev'] == 'false') {
						aDOMWindow.Profilist.PBox.classList.remove('profilist-dev-enabled');
					} else {
						aDOMWindow.Profilist.PBox.classList.add('profilist-dev-enabled');
					}
				}
				
				console.info('pref val dev:', myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value);
				if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {
					if (initialPanelDomSetup || objWin.General.props['Profilist.currentThisBuildsIconPath'] != objBoot.General.props['Profilist.currentThisBuildsIconPath']) {
						// :todo: consider if currentThisBuildsIconPath is same name, but user deleted old img with that name and saved new img with that, so i probably need a force update of backgroundImage or something to compare string paths with Math.random
						aDOMWindow.Profilist.PBox.style.backgroundImage = 'url("' + objBoot.General.props['Profilist.currentThisBuildsIconPath'] + '#' + Math.random() + '")';
					}
				}

				/* no need for this, as this is handled on a profile tbb level
				if (initialPanelDomSetup || objWin.General.props['Profilist.defaultProfileIniKey'] != objBoot.General.props['Profilist.defaultProfileIniKey']) {
					// 
				}
				*/
				
				//figure out main key that were REMOVED in global (thus was FOUND in aDOMWindow... and NOT found in global)
				var removeTheseChildIndexes = [];
				var pwAdded = []; //this p was found in objBoot but not in objWin
				var pwRemoved = []; //this p was found in objWin but not in objBoot
				var pwChanged = []; //the pp of what is objWin[pw] has changed
				for (var pw in objWin) { //pw means p_from_window
					if (!(pw in objBoot)) {
						pwRemoved.push(pw);
						if ('num' in objWin[pw]) {
							removeTheseChildIndexes.push(objWin[pw].num);
						}
					} else {
						//the pw is in objBoot, so lets check if the pp of pw changed
						//start - handleProps
						var ppAdded = [];
						var ppRemoved = [];
						var ppChanged = [];
						for (var pp in objBoot[pw].props) {
							if (pp in objWin[pw].props) {
								// link 32547584324
								if (objWin[pw].props[pp] != objBoot[pw].props[pp]) {
									console.log('prop key of', pp, 'CHANGED');
									ppChanged.push({pp:pp, was:objWin[pw].props[pp], now:objBoot[pw].props[pp]});
								}
							} else {
								console.log('prop key of', pp, 'ADDED');
								ppAdded.push({pp:pp, was:null, now:objBoot[pw].props[pp]});
							}
						}
						for (var pp in objWin[pw].props) {
							if (pp in objBoot[pw].props) {
								// redundant see link 32547584324
								// if (objWin[pw].props[pp] != objBoot[pw].props[pp]) {
									// ppChanged.push({pp:pp, was:objWin[pw].props[pp], now:objBoot[pw].props[pp]});
								// }
							} else {
								console.log('prop key of', pp, 'REMOVED');
								ppRemoved.push({pp:pp, was:objWin[pw].props[pp], now:null});
							}
						}
						
						//start - writePPToDOM
						function pp_to_attr(pp) {
							var dict = {
								'Name': 'label',
								'Default': 'isdefault',
								'Profilist.badge': 'badge'
							};
							if (dict[pp]) {
								return dict[pp];
							} else {
								return pp;
							}
						}
						
						function process_attr_of(pp, attr) {
							var dict = {
								'Profilist.badge': function() { return getPathToBadge(attr, '16'); }
							};
							if (dict[pp]) {
								return dict[pp]();
							} else {
								return attr;
							}
						}
						
						for (var i=0; i<ppChanged.length; i++) {
							if (pw == 'General') {
								if (ppChanged[i].pp == 'Profilist.currentThisBuildsIconPath') {
									PBox.style.backgroundImage = 'url("' + ppChanged[i].now + '")';
								} else if (pp == 'Profilist.defaultProfilePath') {
									PBox.setAttribute('defaultProfilePath', ppChanged[i].now);
								} else if (ppChanged[i].pp.indexOf('Profilist.dev-build-base_icon-') == 0) {
									// base_icon of tieid was updated
									var cTieId = ppChanged[i].pp.substr('Profilist.dev-build-base_icon-'.length);
									var cNewBgImgUrl = getPathTo16Img(ppChanged[i].now, true);
									console.error('change on base_icon of cTieId:', cTieId, 'here is the change set obj:', ppChanged[i]);
									for (var iniKey in objWin) { // use objWin as the added's and removed's not yet updated, and the goal here is to just update the old ones anyways, the new ones will get added in with proper icon. the only issue is that i might update removed's and this is useless as it will get removed anyways
										if ('num' in objWin[iniKey]) {
											if ('Profilist.tie' in objWin[iniKey].props) {
												if (objWin[iniKey].props['Profilist.tie'] == cTieId) { // :todo: what if image contents change but name is same, should implement, using uncached feature og getPathTo16Img well it wont even trigger that it changed. so its interesting
													var box = aDOMWindow.Profilist.PStack.childNodes[getChildNodeI(iniKey, objWin, aDOMWindow.Profilist.PStack)]; // using objWin here because the removed's and added's have not been updated yet
													console.error('ok updated bg img!!!!');
													box.style.backgroundImage = 'url("' + cNewBgImgUrl + '")';
													console.error('ok updated bg img!!!! DONE');
												}
											}
										}
									}
								}
							} else if ('num' in objWin[pw]) { //can alternatively do `'num' in objBoot[pw]` notice the objBoot
								var childNodeI = getChildNodeI(pw, objWin, PStack);
								if (ppChanged[i].pp == 'Profilist.tie') {
									PStack.childNodes[childNodeI].style.backgroundImage = 'url("' + getPathTo16Img(getDevBuildPropForTieId(ppChanged[i].now, 'base_icon')) + '")';
								} else {
									PStack.childNodes[childNodeI].setAttribute(pp_to_attr(ppChanged[i].pp), process_attr_of(ppChanged[i].pp, ppChanged[i].now));
								}
							} else {
								console.warn('pw/pp combination is unrecognized', 'pw:', pw, 'pp:', pp);
								throw 'pw/pp combination is unrecognized' + ' ' + 'pw:' + ' ' + pw + ' ' + 'pp:' + ' ' + pp;
								continue;
							}
						}
						for (var i=0; i<ppRemoved.length; i++) {
							if (pw == 'General') {
								if (ppRemoved[i].pp == 'Profilist.currentThisBuildsIconPath') {
									PBox.style.backgroundImage = '';
								} else if (pp == 'Profilist.defaultProfilePath') {
									PBox.removeAttribute('defaultProfilePath');
								}
							} else if ('num' in objWin[pw]) { //can alternatively do `'num' in objBoot[pw]` notice the objBoot
								var childNodeI = getChildNodeI(pw, objWin, PStack);
								if (ppRemoved[i].pp == 'Profilist.tie') {
									PStack.childNodes[childNodeI].classList.remove('profilist-tied');
									PStack.childNodes[childNodeI].style.backgroundImage = '';
								} else {
									PStack.childNodes[childNodeI].removeAttribute(pp_to_attr(ppRemoved[i].pp));
								}
							} else {
								console.warn('pw/pp combination is unrecognized', 'pw:', pw, 'pp:', pp);
								throw 'pw/pp combination is unrecognized' + ' ' + 'pw:' + ' ' + pw + ' ' + 'pp:' + ' ' + pp;
								continue;
							}
						}
						for (var i=0; i<ppAdded.length; i++) {
							if (pw == 'General') {
								if (ppAdded[i].pp == 'Profilist.currentThisBuildsIconPath') {
									PBox.style.backgroundImage = 'url("' + ppAdded[i].now + '")';
								} else if (pp == 'Profilist.defaultProfilePath') {
									PBox.setAttribute('defaultProfilePath', ppAdded[i].now);
								}
							} else if ('num' in objWin[pw]) { //can alternatively do `'num' in objBoot[pw]` notice the objBoot
								var childNodeI = getChildNodeI(pw, objWin, PStack);
								if (ppAdded[i].pp == 'Profilist.tie' && myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {
									PStack.childNodes[childNodeI].classList.add('profilist-tied');
									PStack.childNodes[childNodeI].style.backgroundImage = 'url("' + getPathTo16Img(getDevBuildPropForTieId(ppAdded[i].now, 'base_icon')) + '")';
								} else {
									if (ppAdded[i].pp == 'Profilist.badge') {
										console.error('YESS ITS HERE:', uneval(ppAdded[i]));
									}
									PStack.childNodes[childNodeI].setAttribute(pp_to_attr(ppAdded[i].pp), process_attr_of(ppAdded[i].pp, ppAdded[i].now));
								}
							} else {
								console.warn('pw/pp combination is unrecognized', 'pw:', pw, 'pp:', pp);
								throw 'pw/pp combination is unrecognized' + ' ' + 'pw:' + ' ' + pw + ' ' + 'pp:' + ' ' + pp;
								continue;
							}
						}
						//end - writePPToDOM
						if (ppRemoved.length != 0 || ppChanged.length != 0 || ppAdded.length != 0) {
							pwChanged.push(pw);
						}
						//end - handleProps
					}
				}

				removeTheseChildIndexes.sort(function(a, b){return b-a}); //sort descending
				for (var i=0; i<removeTheseChildIndexes.length; i++) {
					PStack.removeChild(PStack.childNodes[removeTheseChildIndexes[i]]);
				}
				
				//figure out main key that are NEWLY ADDED in global (thus NOT found in aDOMWindow... but FOUND in global)
				for (var pb in objBoot) { //pb means p_from_bootstrap
					if (!(pb in objWin)) {
						
						console.log('key of', pb, 'ADDED');
						pwAdded.push(pb);
						//console.log('uneval(objBoot[pb].props):', uneval(objBoot[pb].props));
						//for (var p in objBoot[pb].props) {
							if (pb == 'General') {
								
							} else if ('num' in objBoot[pb]) {
								//its a profile
								if (profToolkit.selectedProfile.iniKey && pb == profToolkit.selectedProfile.iniKey) {
									//dont add the selected profile
									continue;
								}
								////// block 8752123154
								var elJson = ['xul:box', {class:['profilist-tbb-box'], label:objBoot[pb].props.Name, status:'inactive', style:[], top:'0'}];
								if ('Default' in objBoot[pb].props && objBoot[pb].props.Default == '1') {
									elJson[1].isdefault = true;
								}
								if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true && 'Profilist.tie' in objBoot[pb].props) {
									elJson[1].class.push('profilist-tied');
									console.info('exploring tie id:', objBoot[pb].props['Profilist.tie']);
									elJson[1].style.push('background-image: url("' + getPathTo16Img(getDevBuildPropForTieId(objBoot[pb].props['Profilist.tie'], 'base_icon')) + '")');
								}
								if ('Profilist.badge' in objBoot[pb].props) {
									elJson[1].badge = getPathToBadge(objBoot[pb].props['Profilist.badge'], '16');
								}
								if (profToolkit.selectedProfile.iniKey && pb == profToolkit.selectedProfile.iniKey) { // updated after revisit, was doing this before revisit: if (objBoot[pb].props.Name == profToolkit.selectedProfile.name) { //note: revisit as i should be able to just see if pb is the selected key rather then compare names
									elJson.status = 'active';
								}
								//elJson[1].style.push('margin-top: ' + (objBoot[pb].num * PUIsync_height) + 'px'); // its stretching it, weird, having to use xul top attr
								//elJson[1].style.push('height: ' + PUIsync_height + 'px'); //not needed for some reason its auto height is correct
								elJson[1].style.push('margin-top: ' + ((getChildNodeI(pb, objBoot, PStack)+1) * PUIsync_height) + 'px');//elJson[1].top = (getChildNodeI(pb, objBoot, PStack)+1) * PUIsync_height;
								elJson[1].class = elJson[1].class.join(' ');
								elJson[1].style = elJson[1].style.join('; ');
								var elFromJson = jsonToDOM(	// make jsonToDOM of objBoot[pb].props
									elJson
									, aDOMWindow.document
									, {}
								);
								elFromJson.addEventListener('click', tbb_box_click, false);
								////// end block 8752123154
								//assuming that as we go through objBoot they are in asc order of .num
								var childNodeI = getChildNodeI(pb, objBoot, PStack);
								console.log('doing insert of:', childNodeI);
								elFromJson.addEventListener('mousedown', properactive, false);
								PStack.insertBefore(elFromJson, PStack.childNodes[childNodeI]); // note: assuming: no need to do `PStack.childNodes[objBoot[pb].num + 1] ? PStack.childNodes[objBoot[pb].num + 1] : PStack.childNodes[PStack.childNodes.length - 1]` because there always has to be at least "create new button" element, so profile button is never inserted as last child
								var boxAnons = elFromJson.ownerDocument.getAnonymousNodes(elFromJson);
								var setdefault = boxAnons[1].querySelector('.profilist-default');
								//console.info('setdefault', setdefault);
								setdefault.addEventListener('mouseenter', subenter, false);
								setdefault.addEventListener('mouseleave', subleave, false);
							} else {
								console.warn('pb is unrecognized', 'pb:', pb);
								continue;
							}
						//}
					}
				}
				
				aDOMWindow.Profilist.iniObj_thatAffectDOM = JSON.parse(str_ObjBoot);
				
				if (pwAdded.length > 0 || pwRemoved.length > 0) {
					//re-calc margin-top's
					//adjust top of create-new-profile
					PStack.childNodes[PStack.childNodes.length-2].style.marginTop = ((PStack.childNodes.length - 1) * PUIsync_height) + 'px'; //PStack.childNodes[PStack.childNodes.length-2].setAttribute('top', (PStack.childNodes.length - 1) * PUIsync_height); //PStack.childNodes.length-2 is create new profile and -1 is currentProfile
				}
				//ok done
			} else { // close if objWin objBoot str compairson
				console.log('no changes based on obj str comparison, so no need for dom update');
			}

			deferred_updateOnPanelShowing.resolve('dom stuff done, will do update statuses but thats not something i need to wait for, that can happen in parallell'); //maybe do this, see link5143646250 // if do go for this, then remove the deferred_uopsReadIni.reject from the failing on things in prof lock checking
			
			//10. update running icons
			//var PTbbBoxes = PStack.childNodes;
			updateStatusImgs(aDOMWindow)
			
			/* // i dont think i need this, updatePanel's purpose is just to take ini to dom
			// start - im not sure if i need to writeIniAndBkpIfDiff here
			var promise_writeIniAndBkpIfDiff = writeIniAndBkpIfDiff();
			return promise_writeIniAndBkpIfDiff.then(
				function(aVal) {
					console.log('Fullfilled - promise_writeIniAndBkpIfDiff - ', aVal);
					return aVal;
				},
				function(aReason) {
					var rejObj = {name:'promise_writeIniAndBkpIfDiff', aReason:aReason};
					console.error('Rejected - promise_writeIniAndBkpIfDiff - ', rejObj);
					throw rejObj;
				}
			).catch(
				function(aCaught) {
					console.error('Caught - promise_writeIniAndBkpIfDiff - ', aCaught);
					// throw aCaught;
				}
			);
			// end - im not sure if i need to writeIniAndBkpIfDiff here
			*/
			//////////////////////////////// end - do dom stuff
			
			// end - do stuff here - promise_uopsReadIni
		},
		function(aReason) {
			var rejObj = {name:'promise_uopsReadIni', aReason:aReason};
			console.error('Rejected - promise_uopsReadIni - ', rejObj);
			deferred_updateOnPanelShowing.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_uopsReadIni', aCaught:aCaught};
			console.error('Caught - promise_uopsReadIni - ', rejObj);
			deferred_updateOnPanelShowing.reject(rejObj);
		}
	);
	//end read ini
	
	console.error('returning the upos deferred.promise');
	return deferred_updateOnPanelShowing.promise;
}

function getChildNodeI(key, obj, stack) {
	// remember to always + 1 to get the actual child node i, i dont know why its like that but yea it is
	if ('num' in obj[key]) {
		if (profToolkit.selectedProfile.iniKey && key == profToolkit.selectedProfile.iniKey) {
			var childNodeI = stack.childNodes.length - 1; // this works but its too much weird thinking about it, it wont hold true if there are more then General and all rest are Profile blocks in ini `Object.keys(obj).length;` // get the profilist-cur-prof element // last element in stack
		} else {							
			if (profToolkit.selectedProfile.iniKey) {
				//meaning not a temp profile
				if (obj[key].num > obj[profToolkit.selectedProfile.iniKey].num) {
					var childNodeI = obj[key].num - 1;
				} else {
					var childNodeI = obj[key].num;
				}
			} else {
				var childNodeI = obj[key].num;
			}
		}
	}
	return childNodeI;
}

function updateStatusImgs(aDOMWindow) {
	// doesnt return anything, just does it
	var objWin = aDOMWindow.Profilist.iniObj_thatAffectDOM;
	var promiseAllArr_updateStatuses = [];
	for (var p in objWin) {
		if ('num' in ini[p]) {
			if (p == profToolkit.selectedProfile.iniKey) { // alt to `if (ini[p].props.Name == profToolkit.selectedProfile.name) {`
				console.log('profile', p, 'is the active profile so in use duh', 'prof name:', ini[p].props.Name);
				continue;
			}
			var promise_profLokChk = ProfilistWorker.post('queryProfileLocked', [ini[p].props.IsRelative, ini[p].props.Path, profToolkit.rootPathDefault]);
			promiseAllArr_updateStatuses.push(promise_profLokChk);

			let hoisted_p = p;
			promise_profLokChk.then(
				function(aVal) {
					console.log('Fullfilled - promise_profLokChk - ', aVal);
					// start - do stuff here - promise_profLokChk
					//aVal is TRUE if LOCKED
					//aVal is FALSE if NOT locked
					if (aVal) {
						//console.info('profile', objWin[hoisted_p].props.Name, 'is IN USE');
						//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'active');
						aDOMWindow.Profilist.PStack.childNodes[getChildNodeI(hoisted_p, objWin, aDOMWindow.Profilist.PStack)].setAttribute('status', 'active');
					} else {
						//console.info('profile', objWin[hoisted_p].props.Name, 'is NOT in use');
						//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'inactive');
						aDOMWindow.Profilist.PStack.childNodes[getChildNodeI(hoisted_p, objWin, aDOMWindow.Profilist.PStack)].setAttribute('status', 'inactive');
					}
					
					//console.log('Success promise_profLokChk num: ' + objWin[hoisted_p].num + ' and name: ' + objWin[hoisted_p].props.Name);
					// end - do stuff here - promise_profLokChk
				},
				function(aReason) {
					var rejObj = {name:'promise_profLokChk', aReason:aReason};
					console.error('Rejected - promise_profLokChk - ', rejObj);
					//deferred_updateOnPanelShowing.reject(rejObj);
					//deferred_updateOnPanelShowing.reject(rejObj); //no need, Promise.all .reject will handle it
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_profLokChk', aCaught:aCaught};
					console.error('Caught - promise_profLokChk - ', rejObj);
					//deferred_updateOnPanelShowing.reject(rejObj); //no need, Promise.all .catch will handle it
				}
			);
		}
	}
	
	var promiseAll_updateStatuses = Promise.all(promiseAllArr_updateStatuses);			
	promiseAll_updateStatuses.then(
		function(aVal) {
			console.log('Fullfilled - promiseAll_updateStatuses - ', aVal);
			// start - do stuff here - promiseAll_updateStatuses
			//deferred_updateOnPanelShowing.resolve('dom stuff and status updating done'); // optional, see link5143646250
			// end - do stuff here - promiseAll_updateStatuses
		},
		function(aReason) {
			var rejObj = {name:'promiseAll_updateStatuses', aReason:aReason};
			console.error('Rejected - promiseAll_updateStatuses - ', rejObj);
			//deferred_updateOnPanelShowing.reject(rejObj); // rem here link5143646250
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promiseAll_updateStatuses', aCaught:aCaught};
			console.error('Caught - promiseAll_updateStatuses - ', rejObj);
			//deferred_updateOnPanelShowing.reject(rejObj); // rem here link5143646250
		}
	);
}

function properactive(e) {
	var origTarg = e.originalTarget;
	var box = e.target;
	//console.log('entered origTarg:', origTarg);
	
	/*
	var obj = {
		explicitOriginalTarget: e.explicitOriginalTarget.nodeName,
		originalTarget: e.originalTarget.nodeName,
		//relatedTarget: e.relatedTarget.className,
		target: e.target.nodeName
	};
	console.log('obj on md:', obj);
	*/
	
	
	console.log('origTarg.nodeName', origTarg.nodeName);
	/*
	if (origTarg.nodeName == 'div') {
		//clicked in text box
	}
	*/

	if (origTarg.nodeName == 'div') {
		console.log('in input parentNode:', origTarg);
		box.classList.add('profilist-tbb-box-inactivatable');
		origTarg.parentNode.addEventListener('mouseleave', function() {
			origTarg.parentNode.removeEventListener('mouseleave', arguments.callee, false);
			console.log('doing remove on left');
			box.classList.remove('profilist-tbb-box-inactivatable');
		}, false);
		console.log('added');
		return;
	}
	
	if (origTarg.parentNode.className == 'profilist-submenu') {
		console.log('over submenu');
		box.classList.add('profilist-tbb-box-inactivatable');
		origTarg.parentNode.addEventListener('mouseleave', function() {
			origTarg.parentNode.removeEventListener('mouseleave', arguments.callee, false);
			console.log('doing remove on left');
			box.classList.remove('profilist-tbb-box-inactivatable');
		}, false);
		console.log('added');
		return;
	}
	console.log('origTarg.parentNode:', origTarg.parentNode);
	if (origTarg.nodeName == 'xul:image') { //origTarg.classList.contains('toolbarbutton-icon') || origTarg.classList.contains('profilist-submenu')) {
		//*NEVERMIND*: //check if they are clicking on the icon of create new profile, do this by seeing if this is the first toolbar element of the stack *NOTE**IMPORTANT* this is why it is important for create new profile button to be first child of stack
		if (origTarg.className == 'toolbarbutton-icon' && origTarg.parentNode.parentNode.classList.contains('profilist-create')) {
			return;
		}
		box.classList.add('profilist-tbb-box-inactivatable');
		origTarg.addEventListener('mouseleave', function() {
			origTarg.removeEventListener('mouseleave', arguments.callee, false);
			console.log('doing remove on left');
			box.classList.remove('profilist-tbb-box-inactivatable');
		}, false);
		console.log('added');
	}
}

var _subenter_lastMarkedChildI = null;
var _subenter_markTimeout = 0;
var _subenter_marked = false;
function subenter(e) {
	
	console.log('set default enter');
	var smItem = e.originalTarget; // was origTarg
	var box = e.target;
	var domDoc = box.ownerDocument;
	var domWin = domDoc.defaultView;
	
	var cDefaultProfInfo = getDefaultIniKeyInObj(null, domWin);
	if (cDefaultProfInfo !== null) {
		_subenter_lastMarkedChildI = cDefaultProfInfo.childNodeI;
		_subenter_markTimeout = domWin.setTimeout(function() {
			console.log('marking show on child node i:', _subenter_lastMarkedChildI);
			domWin.Profilist.PStack.childNodes[_subenter_lastMarkedChildI].classList.add('profilist-show-is-default');
			_subenter_marked = true;
		}, 300); //so we wait for previous submenu width animation to finish in case it happend
	} else {
		_subenter_lastMarkedChildI = null;
	}
	/*
	var origTarg = e.originalTarget;
	var box = e.target;
	//console.log('entered origTarg:', origTarg);
	
	var obj = {
		explicitOriginalTarget: e.explicitOriginalTarget.className,
		originalTarget: e.originalTarget.className,
		relatedTarget: e.relatedTarget.className,
		target: e.target.className
	};
	
	if (origTarg.classList.contains('toolbarbutton-icon')) {
		box.classList.add('profilist-tbb-box-inactivatable');
		console.log('added', obj);
	} else if (origTarg.classList.contains('profilist-submenu')) {
		box.classList.add('profilist-tbb-box-inactivatable');
		console.log('added', obj);
	}
	*/
	
}

function subleave(e) {
	console.log('set default leave');
	var smItem = e.originalTarget; // was origTarg
	var box = e.target;
	var domDoc = box.ownerDocument;
	var domWin = domDoc.defaultView;

	if (_subenter_lastMarkedChildI !== null) {
		console.log('UNmarking show on child node i:', _subenter_lastMarkedChildI);
		domWin.clearTimeout(_subenter_markTimeout);
		if (_subenter_marked) {
			_subenter_marked = false;
			domWin.Profilist.PStack.childNodes[_subenter_lastMarkedChildI].classList.remove('profilist-show-is-default');
		} else {
			console.log('it was not sucesfully marked so no need to dom unmark it');
		}
		_subenter_lastMarkedChildI = null;
	}
	/*
	var origTarg = e.originalTarget;
	var box = e.target;
	//console.log('left origTarg:', origTarg);
	
	if (origTarg.classList.contains('toolbarbutton-icon')) {
		box.classList.remove('profilist-tbb-box-inactivatable');
		console.log('removed, origTarg className:', origTarg.className);
	} else if (origTarg.classList.contains('profilist-submenu')) {
		box.classList.remove('profilist-tbb-box-inactivatable');
		console.log('removed, origTarg className:', origTarg.className);
	}
	*/
}

function tbb_msg_close(aHandlerName, aDOMWindow, allButThisHandler/*, aRestoreStyleStr*/) {
	// if aHandlerName is null then all things in tbb_msg_restore_handlers are restored
		// if aHandlerName is null and aDOMWindow is provided, then all things in tbb_msg_restore_handlers with matching DOMWindow are restored
	
	// if aRestoreStyleStr is set, if that key is not found, then it will not restore it
	
	// see checkAndExecPanelHidUnloaders
	if (aHandlerName && !allButThisHandler) {
		console.error('closing specific handler name', aHandlerName);
		/*
		if (aRestoreStyleStr && aRestoreStyleStr in tbb_msg_restore_handlers[aHandlerName]) {
			console.error('aRestoreStyleStr was set to ', aRestoreStyleStr, 'but it this style wasnt found in handler', aHandlerName, 'so will not restore func on it');
			return;
		}
		*/
		if (aDOMWindow && tbb_msg_restore_handlers[aHandlerName].domWindow != aDOMWindow) {
			// DOMWin doesnt match
			return;
		}
		tbb_msg_restore_handlers[aHandlerName].restoreFunc();
	} else {
		for (var h in tbb_msg_restore_handlers) {
			if (allButThisHandler && h == aHandlerName) {
				continue;
			}
			if (aDOMWindow && tbb_msg_restore_handlers[h].domWindow != aDOMWindow) {
				continue;
			}
			/*
			if (aRestoreStyleStr && aRestoreStyleStr in tbb_msg_restore_handlers[h]) {
				console.error('aRestoreStyleStr was set to ', aRestoreStyleStr, 'but it this style wasnt found in handler', h, 'so will not restore func on it');
				return;
			}
			*/
			console.error('destroying from all iter');
			tbb_msg_restore_handlers[h].restoreFunc();
		}
	}
}

function tbb_msg(aHandlerName, aNewLblVal, aRestoreStyle, aDOMWindow, aTBBBox, aSMItem, aCB, aOverwrite) {
	// aSMItem is the submenu item clicked
	// aNewLblVal is message to show
		// if aNewLblVal is == 'input' then it fades out in the input
	// aRestoreStyle is a string
		// restoreStyleTimeout - timeout
			// hndlr.cb.ms - required, ms to tbb_msg_close after
			// hndlr.cb.ontimeout - optional, callback to do, first arg is hndlr
		// restoreStyleKeyPress - enter/esc listener
			// hndlr.cb.onconfrim - optional, callback when enter is keydowned, first arg is hndlr, second is e, third is userInputVal what he typed
			// hndlr.cb.oncancel - optional, callback when esc is keydowned, first arg is hndlr, second is e
		// restoreStyleMouseLeave - mouse out restore
			// aCB not set up for this yet
		// restoreStyleDefault - when panel closes, or stack collapses
			// all styles support restore default callback
			// onrestore - optional, callback when calling restoreFunc, first arg is hndlr
	// make callbacks return true if you do a tbb_msg with an overwrite in them, otherwise it will exec the restoreFunction, also set aOverwrite arg to true well i think that i need to, may not.
	// cCB was originally a callback but after designing it turned out i need that as a transfer obj
	
		console.log('tbb_msg');
		var cDoc = aDOMWindow.document;
		var cWin = aDOMWindow;
		
		if (cWin.PanelUI.panel.state != 'open') {
			throw new Error('will not send tbb_msg as panel is not open');
		}
		
		var hndlr;
		if (!(aHandlerName in tbb_msg_restore_handlers)) {
			// it wasnt open so initalize it
			var lbl = cDoc.getAnonymousElementByAttribute(aTBBBox, 'class', 'toolbarbutton-text');
			var input = cDoc.getAnonymousElementByAttribute(aTBBBox, 'class', 'profilist-input');
			tbb_msg_restore_handlers[aHandlerName] = {};
			hndlr = tbb_msg_restore_handlers[aHandlerName];
			hndlr.handlerName = aHandlerName;
			hndlr.domWindow = cWin;
			hndlr.smItem = aSMItem;
			hndlr.tbbBox = aTBBBox;
			hndlr.domLbl = lbl;
			hndlr.domInput = input;
			hndlr.origLblVal = lbl.getAttribute('value');
			console.error('SEEEET ORIG LABEL HERE to ', hndlr.origLblVal);
			hndlr.nextLblVal_onTransEnd = 0;
			hndlr.lastLblVal_onTransEnd = 0;
			hndlr.cb = aCB;
			hndlr.submenuWidth = 2;
			hndlr.restoreFunc = function() {
				if (hndlr.cb && hndlr.cb.onrestore) {
					var overwrit = hndlr.cb.onrestore(hndlr);
					console.error('ran onrestore and got:', overwrit);
					if (overwrit) { return }
				}
				if (hndlr.restoreStyleMouseLeave) {
					// remove mouse leave handler if we had added one
					hndlr.smItem.removeEventListener('mouseleave', hndlr.restoreFunc, false);
				}
				if (hndlr.restoreStyleKeyPress) {
					hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
				}
				if (hndlr.domWindow.PanelUI.panel.state == 'open') {
					hndlr.restoring = true;
					console.error('in panel state open restore proc');
					if (hndlr.nextLblVal_onTransEnd == 'INPUT') {
						// copy block link 58632101400
						if (hndlr.MORPHED) {
							console.error('had morphed');
							hndlr.domLbl.style.visibility = '';
						} else {
							console.error('had faded in, so fade it out, and its inputTransHandler should set val of domLbl and bring its opacity to 1');
							console.error('1 setting opacity to 0 here on handlerName:', hndlr.handlerName);
							hndlr.domInput.style.opacity = '0';
						}
						hndlr.domInput.style.clip = 'rect(-1px, -1px, 25px, -1px)';
						// end copy block link 58632101400
					} else {
						console.error('2 setting opacity to 0 here on handlerName:', hndlr.handlerName);
						hndlr.domLbl.style.opacity = '0';
					}
					hndlr.lastLblVal_onTransEnd = hndlr.nextLblVal_onTransEnd;
					hndlr.nextLblVal_onTransEnd = hndlr.origLblVal;
					hndlr.domWindow.setTimeout(function() {
						hndlr.tbbBox.classList.remove('profilist-edit');
					}, 100);
				} else {
					hndlr.finalizeRestore();
					console.error('tbb restore proc completed and handler destroyed VIA PANEL CLOSED METHOD');
				}
			};
			console.error('rrrrr:', hndlr.submenuWidth);
			hndlr.keyRestoreFunc = function(e) {
				if (e.keyCode == 27) {
					// escape
					hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
					e.preventDefault();
					e.stopPropagation();
					if (hndlr.MORPHED) {
						hndlr.domInput.selectionStart = 0;
						hndlr.domInput.selectionEnd = 0;
						hndlr.domLbl.value = hndlr.domInput.value;
					}
					hndlr.domInput.blur();
					if (hndlr.cb && hndlr.cb.oncancel) {
						var overwrit = hndlr.cb.oncancel(hndlr, e);
						if (overwrit) { return } // restore handler overwrit
					}
					hndlr.restoreFunc();
				} else if (e.keyCode == 13) {
					// enter
					hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
					e.preventDefault();
					e.stopPropagation();
					var userInputVal = hndlr.domInput.value;
					if (hndlr.MORPHED) {
						hndlr.domInput.selectionStart = 0;
						hndlr.domInput.selectionEnd = 0;
						hndlr.domLbl.setAttribute('value', userInputVal);
					}
					hndlr.domInput.blur();
					if (hndlr.cb && hndlr.cb.onconfirm) {
						var overwrit = hndlr.cb.onconfirm(hndlr, e, userInputVal);
						if (overwrit) { return } // restore handler overwrit
					}
					hndlr.restoreFunc();
				}
			},
			hndlr.finalizeRestore = function() {
				hndlr.domLbl.removeEventListener('transitionend', hndlr.transHandler, false);
				hndlr.domLbl.style.transition = '';
				hndlr.domLbl.style.visibility = '';
				hndlr.domLbl.style.opacity = '1';
				
				hndlr.domInput.removeEventListener('transitionend', hndlr.inputTransHandler, false);
				hndlr.domInput.style.transition = '';
				hndlr.domInput.style.clip = '';
				hndlr.domInput.style.opacity = '';
				
				delete tbb_msg_restore_handlers[hndlr.handlerName];
				console.error('deteld handlerName of', hndlr.handlerName, 'remaining:', tbb_msg_restore_handlers);
			}
			hndlr.transHandler = function(e) {
				console.error('text trans end', 'propertyname:', e.propertyName);
				if (e.target.style.opacity < 1) {
					if (hndlr.nextLblVal_onTransEnd == 'INPUT') {
						console.error('fade in input');
						// fade it in
						hndlr.domInput.style.clip = 'rect(-1px, ' + (hndlr.domInput.offsetWidth+hndlr.submenuWidth) + 'px, 25px, -1px)';
						hndlr.domInput.style.opacity = '1';
					} else {
						e.target.style.opacity = 1;
						hndlr.domLbl.setAttribute('value', hndlr.nextLblVal_onTransEnd);
						console.error('set new val to:', hndlr.nextLblVal_onTransEnd);
					}
				} else {
					delete hndlr.MORPHED;
					if (hndlr.restoring) {
						// restore was requested and now restore has completed, so do restore completion proc
						console.error('restoring text transend', e.propertyName);
						hndlr.finalizeRestore();
						console.error('tbb restore proc completed and handler destroyed');
					}
				}
			};
			hndlr.inputTransHandler = function(e) {
				if (hndlr.restoring) {
					/* restoring and morphing in order
						"input trans end RESTORING" "propertyname" "opacity" bootstrap.js:3176
						"input trans end RESTORING" "propertyname" "background-color" bootstrap.js:3176
						"input trans end RESTORING" "propertyname" "clip" bootstrap.js:3176
						"GOING TO INPUT, input trans end" "propertyname" "clip" bootstrap.js:3190
						"GOING TO INPUT, input trans end" "propertyname" "background-color" bootstrap.js:3190
						"GOING TO INPUT, input trans end" "propertyname" "color"
					*/
					if (hndlr.lastLblVal_onTransEnd == 'INPUT') {
						console.error('input trans end RESTORING', 'propertyname', e.propertyName);
						if (e.propertyName == 'clip') {
							//hndlr.domLbl.style.opacity = 1;
							// because the the domLbl was visibility hidden, we dont set opacity back to 1 on that, thats what the issue was
							hndlr.finalizeRestore();
						} else if (e.propertyName == 'opacity') {
							hndlr.domLbl.style.opacity = 1;
						}
						hndlr.domLbl.setAttribute('value', hndlr.origLblVal);
						/*
						hndlr.domLbl.style.opacity = 1;
						hndlr.domLbl.style.visibility = '';
						hndlr.domInput.style.opacity = '';
						hndlr.domInput.style.width = '';
						*/
						//hndlr.domInput.style[e.propertyName] = '';
					} // else it is going to do anim as the css for this is not inline, it is in file, but these anims are meaningless as INPUT was never showing
				} else {
					if (hndlr.nextLblVal_onTransEnd == 'INPUT') {
						console.error('GOING TO INPUT, input trans end', 'propertyname', e.propertyName);
						if (e.propertyName == 'color' || e.propertyName == 'opacity') {
							// color last propertyName is for end of morph
							// opacity is last propertyname for end of fade in
							if (e.propertyName == 'color') { // can do hndlr.MORPHED
								hndlr.domLbl.style.visibility = 'hidden';
							}
							hndlr.domInput.selectionStart = 0;
							hndlr.domInput.selectionEnd = 0;
							hndlr.domInput.focus();
						}
					} else if (hndlr.lastLblVal_onTransEnd == 'INPUT') {
						// copy of block link 2345133455
						// input removed
						// bring back tbbtext
						delete hndlr.IF_DEVUSER_OVERWRITES_BEFORE_THIS_FADES_OUT_THEN_INPUTTRANSHANDLER_WILL_FIND_NEITHER_SO_IN_THAT_CASE_FADEIN_TBB;
						console.error('GOING TO NON-RESTORE-LBL FROM INPUT, input trans end', 'propertyname', e.propertyName);
						hndlr.domLbl.style.visibility = '';
						hndlr.domLbl.style.opacity = 1;
						hndlr.domLbl.value = hndlr.nextLblVal_onTransEnd;
						// end copy of block link 2345133455
					} else {
						console.warn('neither next nor last were INPUT');
						if (hndlr.IF_DEVUSER_OVERWRITES_BEFORE_THIS_FADES_OUT_THEN_INPUTTRANSHANDLER_WILL_FIND_NEITHER_SO_IN_THAT_CASE_FADEIN_TBB) {
							delete hndlr.IF_DEVUSER_OVERWRITES_BEFORE_THIS_FADES_OUT_THEN_INPUTTRANSHANDLER_WILL_FIND_NEITHER_SO_IN_THAT_CASE_FADEIN_TBB;
							// copy of block link 2345133455
							// input removed
							// bring back tbbtext
							console.error('GOING TO NON-RESTORE-LBL FROM INPUT, input trans end', 'propertyname', e.propertyName);
							hndlr.domLbl.style.visibility = '';
							hndlr.domLbl.style.opacity = 1;
							hndlr.domLbl.value = hndlr.nextLblVal_onTransEnd;
							// end copy of block link 2345133455
						}
					}
				}
			};
			hndlr.timeoutHandler = function() {
				if (hndlr.cb && hndlr.cb.ontimeout) {
					var overwrit = hndlr.cb.ontimeout(hndlr);
					if (overwrit) { return } // restore handler overwrit
				}
				hndlr.restoreFunc();
			};
			
			hndlr.domLbl.style.transition = 'opacity 250ms'; // i match opacity time to that of submenu fade out time
			hndlr.domLbl.addEventListener('transitionend', hndlr.transHandler, false);
			hndlr.domInput.addEventListener('transitionend', hndlr.inputTransHandler, false);
			hndlr.smItem.classList.add('profilist-sub-clicked');
			hndlr.tbbBox.classList.add('profilist-edit');
			
			// restore logic
			if (aRestoreStyle == 'restoreStyleDefault') {
				// let blur/panel hide (called default) handle closing (which i call restoring) message
				hndlr.restoreStyleDefault = true;
			} else if (aRestoreStyle == 'restoreStyleMouseLeave') {
				// default AND mouse restore style
				hndlr.restoreStyleDefault = true;
				hndlr.restoreStyleMouseLeave = true;
				hndlr.smItem.addEventListener('mouseleave', hndlr.restoreFunc, false);
			} else if (aRestoreStyle == 'restoreStyleKeyPress') {
				// default AND key restore style
				hndlr.restoreStyleDefault = true;
				hndlr.restoreStyleKeyPress = true;
				hndlr.domWindow.addEventListener('keydown', hndlr.keyRestoreFunc, true);
			} else if (aRestoreStyle == 'restoreStyleTimeout') {
				hndlr.restoreStyleDefault = true;
				hndlr.restoreStyleTimeout = true;
				hndlr.timer = hndlr.domWindow.setTimeout(hndlr.timeoutHandler, hndlr.cb.ms);
			}
			
		} else {
			console.error('need to overwrite restore logic');
			hndlr = tbb_msg_restore_handlers[aHandlerName];			
			// restore logic
			if (aOverwrite) {
				hndlr.cb = aCB;
			}
			if (aRestoreStyle == 'restoreStyleDefault') {
				// let blur/panel hide (called default) handle closing (which i call restoring) message
				hndlr.restoreStyleDefault = true;
				// cannot test hndlr.restoreStyleDefault because if it has that, it like has others like restoreStyleMouseLeave
				if (aOverwrite) {
					// if aOverwrite == true then remove the the other handlers
					if (hndlr.restoreStyleMouseLeave) {
						hndlr.smItem.removeEventListener('mouseleave', hndlr.restoreFunc, false);
						delete hndlr.restoreStyleMouseLeave;
						console.error('overwrit mouse handler');
					}
					if (hndlr.restoreStyleKeyPress) {
						hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
						delete hndlr.restoreStyleMouseLeave;
						console.error('overwrit key handler');
					}
					if (hndlr.restoreStyleTimeout) {
						delete hndlr.restoreStyleTimeout;
						hndlr.domWindow.clearTimeout(hndlr.timer);
					}
				}
			} else if (aRestoreStyle == 'restoreStyleMouseLeave') {
				if (hndlr.restoreStyleMouseLeave) {
					// already has restoreStyleMouseLeave so dont do it
				} else {
					// default AND mouse restore style
					hndlr.restoreStyleDefault = true;
					hndlr.restoreStyleMouseLeave = true;
					hndlr.smItem.addEventListener('mouseleave', hndlr.restoreFunc, false);
				}
				if (aOverwrite) {
					// remove the other handlers
					if (hndlr.restoreStyleKeyPress) {
						hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
						delete hndlr.restoreStyleKeyPress;
						console.error('overwrit key handler');						
					}
					if (hndlr.restoreStyleTimeout) {
						delete hndlr.restoreStyleTimeout;
						hndlr.domWindow.clearTimeout(hndlr.timer);
					}
				}
			} else if (aRestoreStyle == 'restoreStyleKeyPress') {
				if (hndlr.restoreStyleKeyPress) {
					// already has restoreStyleKeyPress so dont do it
				} else {
					// default AND key restore style
					hndlr.restoreStyleDefault = true;
					hndlr.restoreStyleKeyPress = true;
					hndlr.domWindow.addEventListener('keydown', hndlr.keyRestoreFunc, true);
				}
				if (aOverwrite) {
					// remove the other handlers
					if (hndlr.restoreStyleMouseLeave) {
						hndlr.smItem.removeEventListener('mouseleave', hndlr.restoreFunc, false);
						delete hndlr.restoreStyleMouseLeave;
						console.error('overwrit mouse handler');
					}
					if (hndlr.restoreStyleTimeout) {
						delete hndlr.restoreStyleTimeout;
						hndlr.domWindow.clearTimeout(hndlr.timer);
					}
				}
			} else if (aRestoreStyle == 'restoreStyleTimeout') {
				hndlr.restoreStyleDefault = true;
				hndlr.restoreStyleTimeout = true;
				hndlr.timer = hndlr.domWindow.setTimeout(hndlr.timeoutHandler, hndlr.cb.ms);
				if (aOverwrite) {
					// if aOverwrite == true then remove the the other handlers
					if (hndlr.restoreStyleMouseLeave) {
						hndlr.smItem.removeEventListener('mouseleave', hndlr.restoreFunc, false);
						delete hndlr.restoreStyleMouseLeave;
						console.error('overwrit mouse handler');
					}
					if (hndlr.restoreStyleKeyPress) {
						hndlr.domWindow.removeEventListener('keydown', hndlr.keyRestoreFunc, true);
						delete hndlr.restoreStyleKeyPress;
						console.error('overwrit key handler');
					}
				}
			}
		}
		
		// open it logic
		if (hndlr.nextLblVal_onTransEnd == aNewLblVal) {
			console.log('no need to open its already open at that msg');
		} else {
			if (aNewLblVal == 'INPUT' && hndlr.origLblVal == hndlr.cb.initInputWithValue) {
				hndlr.MORPHED = true;
				// morph
				if (hndlr.origLblVal == hndlr.cb.initInputWithValue) {
					// morph
					/*
					hndlr.domInput.addEventListener('transitionend', function() {
						hndlr.domInput.removeEventListener('transitionend', arguments.callee, false);
						//if (hndlr.smItem.classList.contains('profilist-sub-clicked')) {
							// this is needed for labels that are elipsiid, meaning they take the whole width, and collapsing the submenu to just one icon gave it more room
							hndlr.domInput.removeEventListener('transitionend', arguments.callee, false);
							hndlr.domInput.style.clip = 'rect(-1px, ' + (hndlr.domInput.offsetWidth+hndlr.submenuWidth) + 'px, 25px, -1px)';
						//}
					}, false);
					*/
					hndlr.lastLblVal_onTransEnd = hndlr.nextLblVal_onTransEnd;
					hndlr.nextLblVal_onTransEnd = aNewLblVal;
					hndlr.domInput.setAttribute('placeholder', 'Enter new name for this profile');
					hndlr.domInput.style.clip = 'rect(-1px, ' + (hndlr.domInput.offsetWidth+hndlr.submenuWidth) + 'px, 25px, -1px)';
				}
			} else {
				delete hndlr.MORPHED;
				if (aNewLblVal == 'INPUT') {
					console.log('prep for fade in, as not doing morph');
					hndlr.domInput.value = hndlr.cb.initInputWithValue;
					hndlr.domInput.setAttribute('placeholder', 'Enter name for new profile');
					console.error('3 setting opacity to 0 here on handlerName:', hndlr.handlerName);
					hndlr.domInput.style.opacity = '0';
					hndlr.domInput.style.width = '280px';
					hndlr.domInput.style.transition = 'opacity 250ms';
					hndlr.lastLblVal_onTransEnd = hndlr.nextLblVal_onTransEnd;
					hndlr.nextLblVal_onTransEnd = aNewLblVal;
					
					hndlr.domLbl.style.opacity = 0;
					console.error('4 setting opacity to 0 here on handlerName:', hndlr.handlerName);
				} else {
					if (hndlr.nextLblVal_onTransEnd == 'INPUT') {
						// input is currently showing
						hndlr.lastLblVal_onTransEnd = hndlr.nextLblVal_onTransEnd;
						hndlr.nextLblVal_onTransEnd = aNewLblVal;
						//hndlr.domLbl.style.opacity = 0;
						console.error('6 setting opacity to 0 here on handlerName:', hndlr.handlerName);
						// copy block link 58632101400
						if (hndlr.MORPHED) {
							console.error('had morphed');
							hndlr.domLbl.style.visibility = '';
							hndlr.domInput.style.clip = 'rect(-1px, -1px, 25px, -1px)';
						} else {
							console.error('had faded in, so fade it out');
							console.error('1 setting opacity to 0 here on handlerName:', hndlr.handlerName);
							hndlr.domInput.style.opacity = '0';
							console.log('expect inputTransHandler to set domLbl opacity to 1 and its value after fade out is complete');
							hndlr.IF_DEVUSER_OVERWRITES_BEFORE_THIS_FADES_OUT_THEN_INPUTTRANSHANDLER_WILL_FIND_NEITHER_SO_IN_THAT_CASE_FADEIN_TBB = true;
						}
						// end copy block link 58632101400
					} else {
						hndlr.lastLblVal_onTransEnd = hndlr.nextLblVal_onTransEnd;
						hndlr.nextLblVal_onTransEnd = aNewLblVal;
						hndlr.domLbl.style.opacity = 0;
						console.error('5 setting opacity to 0 here on handlerName:', hndlr.handlerName);
					}
				}
			}
		}
		
}

function getDefaultIniKeyInObj(iniObj, aDOMWindow) {
	// returns ini key of default, null if no default is selected
		// if want position of child then pass in aDOMWindow and dont pass iniObj, it will use the iniObj of the win

	// returns obj. with key of iniKey and childNodeI if requested by setting aDOMWindow
	
	if (aDOMWindow) {
		iniObj = aDOMWindow.Profilist.iniObj_thatAffectDOM;
	}
	var cDefaultIniKey = null;
	for (var p in iniObj) {
		if (!('num' in iniObj[p])) { continue }
		if ('Default' in iniObj[p].props && iniObj[p].props.Default == '1') {
			cDefaultIniKey = p;
			break;
		}
	}
	
	if (cDefaultIniKey === null) {
		return null; // no default selected
	}
		
	var rezObj = {};
	rezObj.iniKey = cDefaultIniKey;
	
	if (aDOMWindow) {
		rezObj.childNodeI = getChildNodeI(cDefaultIniKey, iniObj, aDOMWindow.Profilist.PStack); // was TbbI
		console.info('obj el num of cur default is:', iniObj[cDefaultIniKey].num, 'getChildNodeI:', rezObj.childNodeI);
	} else {
		console.info('no default profile selected');
	}
	
	return rezObj;
}

function tbb_box_click(e) {
	console.log('tbb_box_click e.origTarg:', e.originalTarget);
	var origTarg = e.originalTarget;
	var box = e.target;
	var targetedTBB = e.target;
	console.log('clicked target == box it should:', box, 'origTarg:', origTarg);
	var className;
	var classList = origTarg.classList;

	var cDoc = origTarg.ownerDocument;
	var cWin = cDoc.defaultView;
	
	var classAction = {
		'profilist-tbb-box': function() {
			if (classList.contains('perm-hover')) {
				//e.view.document.documentElement.click();
				console.log('do nothing as its the active profile - maybe rename?');
			} else if (classList.contains('profilist-create') || cWin.Profilist.PBox.classList.contains('profilist-cloning-picking')) {
				var hasCloning = cWin.Profilist.PBox.classList.contains('profilist-cloning-picking');
				if (hasCloning && classList.contains('profilist-create')) {
					// fool clicked on "Pick a profile..." what an idiot
					return;
				}
				var cInitVal = '';
				if (hasCloning && !classList.contains('profilist-create')) {
					var profName = origTarg.getAttribute('label');
					var profIniKey = getIniKeyFromProfName(profName);
				
					cWin.Profilist.PBox.classList.remove('profilist-cloning-picking');
					cloneProfIniKey = profIniKey;
					console.log('this guy but no returns so why not restore properly?');

					cInitVal = 'Copy of ' + profName;
					console.log('cloning', profName);
				}
				var aId_tabmsg;
				
				var tbbFinalizer = function() {};
				if (cloneProfIniKey) {
					console.log('clone new profile');
					aId_tabmsg = 'clone-profile';
				} else {
					console.log('create new profile');
					aId_tabmsg = 'create-prof';
					classList.add('profilist-hide-clone');
					tbbFinalizer = function() {
						classList.add('profilist-hide-clone');
					};
				}
				tbb_msg_close(aId_tabmsg, cWin, true);
				var cCB = {
					initInputWithValue: cInitVal,
					onconfirm: function(aHndlr, aEvent, aInput) {
						// if hold ctrl, it launches on create
						// if hold shift+alt it creates profile at absolute path
						//console.error('got onconfirm aInput:', aInput);
						
						var do_checkCustPath = function() {
							if (aEvent.altKey && aEvent.shiftKey) {
								// create absolute path profile
								var dirpath = OS.Path.dirname(aInput);
								var profname = OS.Path.basename(aInput);
								if (dirpath == profname) {
									tbb_msg(aId_tabmsg, 'error: invalid path', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
										ms: 3000,
										ontimeout: function() {
											// send back to input with path val
											cCB.initInputWithValue = aInput;
											tbb_msg(aId_tabmsg, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
											return true;
										}
									} , true);
								} else if (profname == '') {
									tbb_msg(aId_tabmsg, 'error: final dir must be profile name', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
										ms: 3000,
										ontimeout: function() {
											// send back to input with path val
											cCB.initInputWithValue = aInput;
											tbb_msg(aId_tabmsg, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
											return true;
										}
									} , true);
								} else {
									var promise_dirpathExists = OS.File.exists(dirpath);
									promise_dirpathExists.then(
										function(aVal) {
											console.log('Fullfilled - promise_dirpathExists - ', aVal);
											// start - do stuff here - promise_dirpathExists
											if (!aVal) {
												tbb_msg(aId_tabmsg, 'error: directory path does not exist', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
													ms: 3000,
													ontimeout: function() {
														// send back to input with path val
														cCB.initInputWithValue = aInput;
														tbb_msg(aId_tabmsg, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
														return true;
													}
												} , true);
											} else {
												do_create(profname, dirpath, cloneProfIniKey);
											}
											// end - do stuff here - promise_dirpathExists
										},
										function(aReason) {
											var rejObj = {name:'promise_dirpathExists', aReason:aReason};

											var deepestReason = aReasonMax(aReason);
											tbb_msg(aId_tabmsg, 'error: ' + deepestReason, 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
												ms: 3000,
												onrestore: tbbFinalizer
											}, true);
											
											console.warn('Rejected - promise_dirpathExists - ', rejObj);
											//deferred_createProfile.reject(rejObj);
										}
									).catch(
										function(aCaught) {
											var rejObj = {name:'promise_dirpathExists', aCaught:aCaught};
											console.error('Caught - promise_dirpathExists - ', rejObj);
											//deferred_createProfile.reject(rejObj);
										}
									);
								}
							} else {
								do_create(aInput, null, cloneProfIniKey);
							}
						};
						var do_create = function(theprofname, theabspath, cloneofinikey) {
							cloneProfIniKey = null;
							var promise_createProf = createProfileNew(theprofname, theabspath, true, cloneofinikey);
							promise_createProf.then(
								function(aVal) {
									// aVal is aProfIniKey
									console.log('Fullfilled - promise_createProf - ', aVal);
									// start - do stuff here - promise_createProf
									tbb_msg(aId_tabmsg, 'ok prof made', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
										ms: 3000,
										ontimeout: function() {
											console.error(':todo: add tbb gui here');
										},
										onrestore: tbbFinalizer
									}, true);
									if (aEvent.ctrlKey) {
										// launch on create
										launchProfile(aVal);
									} else {
										console.error(':todo: ok need to add to gui here');
									}
									// end - do stuff here - promise_createProf
								},
								function(aReason) {
									var rejObj = {name:'promise_createProf', aReason:aReason};
									
									var deepestReason = aReasonMax(aReason);
									tbb_msg(aId_tabmsg, 'error: ' + deepestReason, 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
										ms: 3000,
										onrestore: tbbFinalizer
									}, true);
									
									console.warn('Rejected - promise_createProf - ', rejObj);
									//deferred_createProfile.reject(rejObj);
								}
							).catch(
								function(aCaught) {
									var rejObj = {name:'promise_createProf', aCaught:aCaught};
									console.error('Caught - promise_createProf - ', rejObj);
									//deferred_createProfile.reject(rejObj);
								}
							);
						};
						tbb_msg(aId_tabmsg, 'creating...', 'restoreStyleDefault', origTarg.ownerDocument.defaultView, box, origTarg, {onrestore:function(){ console.log('creating overwrit'); return true }}, true);
						//cWin.setTimeout(function(){do_checkCustPath()}, 5000);
						do_checkCustPath();
						return true;
					},
					oncancel: function() {
						console.log('dont return, continue to normal restore');
					}
				};
				console.log('bringing up cCB input');
				tbb_msg(aId_tabmsg, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
			} else {
				var profName = origTarg.getAttribute('label');
				var profIniKey = getIniKeyFromProfName(profName);
				
					e.view.PanelUI.toggle();// hide panel
					launchProfile(profIniKey);
					
			}
		},
		'profilist-clone': function() {
			var cloneOnCancel = function() {
				cWin.Profilist.PBox.classList.remove('profilist-cloning-picking');
				cWin.Profilist.PBox.classList.remove('profilist-cloning');
			};
			var cloneOnConfirm = function() {
				cWin.Profilist.PBox.classList.remove('profilist-cloning-picking');
				return true;
			};
			var cloneOnRestore = function() {
				// didnt keypress confirm or cancel, but restoring so do it an dont return
				cWin.Profilist.PBox.classList.remove('profilist-cloning-picking');
				cWin.Profilist.PBox.classList.remove('profilist-cloning');
			}
			/*
			var remWigg = function() {
				cWin.Profilist.PBox.classList.remove('profilist-cloning-picking');
				if (cloneProfIniKey) {
					// user confirmed
					return true;
				} else {
					// user canceled
					cWin.Profilist.PBox.classList.remove('profilist-cloning');
				}
			};
			*/
			var enterPickProfile = function() {
				// enter pick profile
				console.log('wiggle for clone');
				cWin.Profilist.PBox.classList.add('profilist-cloning');
				cWin.Profilist.PBox.classList.add('profilist-cloning-picking');
				tbb_msg_close('clone-profile', cWin, true);
				cloneProfIniKey = null;
				tbb_msg('clone-profile', 'Pick a profile...', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, {
					onconfirm: cloneOnConfirm,
					oncancel: cloneOnCancel,
					onrestore: cloneOnRestore
				}, true);
			};
			if ('clone-profile' in tbb_msg_restore_handlers) {
				if (tbb_msg_restore_handlers['clone-profile'].nextLblVal_onTransEnd == 'Clone Profile') { 
					enterPickProfile();
				} else {
					// cancel clone
					tbb_msg_close('clone-profile', cWin);
					cWin.Profilist.PBox.classList.remove('profilist-cloning');
				}
			} else {
				// copy of block link123121
				enterPickProfile();
			}
		},
		'profilist-inactive-del': function() {
			var cProfName = box.getAttribute('label');
			var cProfIniKey = getIniKeyFromProfName(cProfName);
			
			console.log('delete, cProfName:', cProfName);
			tbb_msg_close('del-profile-' + cProfName, cWin, true);
			
			var cCB = {
				onconfirm: function() {
					tbb_msg('del-profile-' + cProfName, 'Deleting...', 'restoreStyleDefault', origTarg.ownerDocument.defaultView, box, origTarg, { onrestore:function(){ return true } }, true);
					var promise_delProf = deleteProfile(cProfIniKey, true);
					promise_delProf.then(
						function(aVal) {
							console.log('Fullfilled - promise_delProf - ', aVal);
							// start - do stuff here - promise_delProf
							tbb_msg('del-profile-' + cProfName, 'ok profile deleted', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
								ms: 3000,
								ontimeout: function() {
									//box.parentNode.removeChild(box);
									console.error(':todo: del gui panel dom');
									// should animate this removal, maybe refresh stack dom
								}
							}, true);
							// end - do stuff here - promise_delProf
						},
						function(aReason) {
							var rejObj = {name:'promise_delProf', aReason:aReason};
							
							tbb_msg('del-profile-' + cProfName, aReason, 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
								ms: 3000
							}, true);
							
							console.error('Rejected - promise_delProf - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_delProf', aCaught:aCaught};
							console.error('Caught - promise_delProf - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					);
					return true; // as i do a tbb_msg in here, so true tells it to not exec its own restoreFunc
				}
			}
			
			tbb_msg('del-profile-' + cProfName, myServices.sb.GetStringFromName('confirm-delete'), 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
		},
		'profilist-default': function() {
			console.log('set this profile as default');
			var cProfName = box.getAttribute('label');
			var cProfIniKey = getIniKeyFromProfName(cProfName);
			
			var winObj = cWin.Profilist.iniObj_thatAffectDOM;
			
			var cDefaultProfInfo = getDefaultIniKeyInObj(null, cWin);

			var zeroingDefault = false; // meaning im unseting default
			var restoreOnRej;
			if (cDefaultProfInfo !== null) {
				cWin.Profilist.PStack.childNodes[cDefaultProfInfo.childNodeI].removeAttribute('isdefault');
				if (cDefaultProfInfo.iniKey == cProfIniKey) {
					box.removeAttribute('isdefault'); //classList.remove('profilist-tbb-is-default');
					zeroingDefault = true;
					restoreOnRej = function() {
						cWin.Profilist.PStack.childNodes[cDefaultProfInfo.childNodeI].setAttribute('isdefault', 1);
						box.setAttribute('isdefault', 1);
					};
				} else {
					box.setAttribute('isdefault', 1); // box.classList.add('profilist-tbb-is-default');
					restoreOnRej = function() {
						cWin.Profilist.PStack.childNodes[cDefaultProfInfo.childNodeI].setAttribute('isdefault', 1);
						box.removeAttribute('isdefault');
					};
				}
			} else {
				console.info('no default profile selected'); // so user is obviously setting this clicked on one to the default
				box.setAttribute('isdefault', 1);
				restoreOnRej = function() {
					box.removeAttribute('isdefault');
				};
			}
			
			var promise_makeDefault = defaultProfile(cProfIniKey, true);
			promise_makeDefault.then(
				function(aVal) {
					console.log('Fullfilled - promise_makeDefault - ', aVal);
					// start - do stuff here - promise_makeDefault
					if (cDefaultProfInfo !== null) {
						delete cWin.Profilist.iniObj_thatAffectDOM[cDefaultProfInfo.iniKey].props.Default;
					}
					if (zeroingDefault) {
						delete cWin.Profilist.iniObj_thatAffectDOM[cProfIniKey].props.Default;
					} else {
						cWin.Profilist.iniObj_thatAffectDOM[cProfIniKey].props.Default = 1;
					}
					//cWin.Profilist.iniObj_thatAffectDOM.General.props['Profilist.defaultProfilePath'] = cProfIniKey;
					//cWin.Profilist.iniObj_thatAffectDOM.General.props['Profilist.defaultProfileIsRelative']
					// end - do stuff here - promise_makeDefault
				},
				function(aReason) {
					// restore old default, i only handle dom restore and setting from this func, ini setting happens from the defualtProfile func
					restoreOnRej();
					var rejObj = {name:'promise_makeDefault', aReason:aReason};
					console.error('Rejected - promise_makeDefault - ', rejObj);
					//deferred_createProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_makeDefault', aCaught:aCaught};
					console.error('Caught - promise_makeDefault - ', rejObj);
					//deferred_createProfile.reject(rejObj);
				}
			);
		},
		'profilist-rename': function() {
			var cProfName = box.getAttribute('label');
			var cProfIniKey = getIniKeyFromProfName(cProfName);
			
			console.log('rename, cProfIniKey:', cProfName);
			tbb_msg_close('ren-profile-' + cProfIniKey, cWin, true);
			
			var cCB = {
				initInputWithValue: cProfName,
				onconfirm: function(aHndlr, aEvent, aInput) {
					/*
					tbb_msg('ren-profile-' + cProfIniKey, 'renaming...', 'restoreStyleDefault', origTarg.ownerDocument.defaultView, box, origTarg, {
						onrestore: function() {
							return true;
						}
					}, true);
					*/
					console.log('override origLblVal here with renamed val, on fail it should go to previous val which is cProfName');
					aHndlr.origLblVal = aInput;
					box.setAttribute('label', aInput);
					
					var promise_renIt = renameProfile(cProfIniKey, aInput, true);
					promise_renIt.then(
						function(aVal) {
							console.log('Fullfilled - promise_renIt - ', aVal);
							// start - do stuff here - promise_renIt
							/*
							aHndlr.origLblVal = aInput;
							tbb_msg('ren-profile-' + cProfIniKey, 'ok profile renamed', 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
								ms: 3000,
								ontimeout: function() {
									//box.parentNode.removeChild(box);
									console.error(':todo: del gui panel dom');
									// should animate this removal, maybe refresh stack dom
								}
							}, true);
							*/
							// end - do stuff here - promise_renIt
						},
						function(aReason) {
							
							console.log('override origLblVal back to cProfName as rename was rejected');
							aHndlr.origLblVal = cProfName;
							box.setAttribute('label', cProfName); // let restore handler do this
							aHndlr.domLbl.setAttribute('value', aInput);
							//hndlr.domLbl.setAttribute('value', hndlr.nextLblVal_onTransEnd);
							
							tbb_msg('ren-profile-' + cProfIniKey, aReason, 'restoreStyleTimeout', origTarg.ownerDocument.defaultView, box, origTarg, {
								ms: 3000,
								ontimeout: function() {
									//box.parentNode.removeChild(box);
									console.error(':todo: del gui panel dom');
									if (aReason == 'name-taken') {
										tbb_msg('ren-profile-' + cProfIniKey, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, true);
									}
									return true;
									// should animate this removal, maybe refresh stack dom
								}
							}, true);
							
							var rejObj = {name:'promise_renIt', aReason:aReason};
							console.warn('Rejected - promise_renIt - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_renIt', aCaught:aCaught};
							console.error('Caught - promise_renIt - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					);
				}
			};
			
			tbb_msg('ren-profile-' + cProfIniKey, 'INPUT', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, false);
		},
		'profilist-dev-build': function() {
			var cProfName = box.getAttribute('label');
			var cProfIniKey = getIniKeyFromProfName(cProfName);
			
			console.log('prof dev build click, cProfName:', cProfName);
			//gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']); // uncomment if you want to refresh gDevBuilds
			
			if (unsavedTie === null) {
				unsavedTie = {
					iniKey: cProfIniKey,
					tiePreInitialToggle: 'Profilist.tie' in ini[cProfIniKey].props ? ini[cProfIniKey].props['Profilist.tie'] : null
				};
				// changing it from original so add mouseleave
				console.log('initial click so attach mouseleave');
				origTarg.addEventListener('mouseleave', saveTie, false); //learned: same e that got passed to tbb_box_click which is the containing parent func. gets passed to this addEventListener. very good. this is what i was hoping for.
			}
			
			var runningExeTieId = getDevBuildTieIdOfExePath(profToolkit.exePath);
			if (runningExeTieId === null) { // ensure that this exe path is in gDevBuilds
				// add it in
				// get next tie id
				var daNextTieId = 0;
				for (var i=0; i<gDevBuilds.length; i++) {
					var tieIdC = parseInt(gDevBuilds[i][devBuildsArrStruct.id]);
					if (tieIdC >= daNextTieId) {
						daNextTieId = tieIdC + 1;
					}
				}
				// push it in
				var arr_addInToDevBuild = [];
				arr_addInToDevBuild[devBuildsArrStruct.id] = daNextTieId;
				arr_addInToDevBuild[devBuildsArrStruct.exe_path] = profToolkit.exePath;
				arr_addInToDevBuild[devBuildsArrStruct.base_icon] = core.firefox.channel;
				gDevBuilds.push(arr_addInToDevBuild);
				ini.General.props['Profilist.dev-builds'] = JSON.stringify(gDevBuilds);
				runningExeTieId = daNextTieId;
			}
			console.info('runningExeTieId:', runningExeTieId);
			
			var untieIt = function() {
				delete ini[cProfIniKey].props['Profilist.tie'];
				box.style.backgroundImage = '';
				box.classList.remove('profilist-tied');
			}
			
			if (!box.classList.contains('profilist-tied')) {
				// is currently untied
				box.classList.add('profilist-tied');
				
				// tie it in ini
				ini[cProfIniKey].props['Profilist.tie'] = runningExeTieId;
				box.classList.add('profilist-tied');
			} else {
				// is currently tied
				if (ini[cProfIniKey].props['Profilist.tie'] == runningExeTieId) {
					console.log('tied to runningExeTieId', 'runningExeTieId:', 'ini[cProfIniKey].props[Profilist.tie]:', ini[cProfIniKey].props['Profilist.tie']);
					// start at first tie id that in gDevBuilds that is not runningExeTieId
					if (gDevBuilds.length == 1) {
						untieIt();
					} else {
						for (var i=0; i<gDevBuilds.length; i++) {
							console.info('iterA', 'i:', i, 'i - 1:', i - 1, 'gDevBuilds.length:', gDevBuilds.length, 'gDevBuilds.length - 1', gDevBuilds.length - 1, 'runningExeTieId:', runningExeTieId, 'gDevBuilds[i][devBuildsArrStruct.id]:', gDevBuilds[i][devBuildsArrStruct.id]);
							if (gDevBuilds[i][devBuildsArrStruct.id] != runningExeTieId) {
								// tie to this one
								console.error('setting to path for:', gDevBuilds[i][devBuildsArrStruct.base_icon]);
								ini[cProfIniKey].props['Profilist.tie'] = gDevBuilds[i][devBuildsArrStruct.id];
								box.style.backgroundImage = 'url("' + getPathTo16Img(gDevBuilds[i][devBuildsArrStruct.base_icon], true) + '")';
								break;
							}
						}
					}
				} else {
					// tie to next in line in gDevBuilds
					console.log('tie to non- runningExeTieId');
					// find the current index of current tie in gDevBuilds
					var cTieIdIndex = 0;
					for (var i=0; i<gDevBuilds.length; i++) {
						if (gDevBuilds[i][devBuildsArrStruct.id] == ini[cProfIniKey].props['Profilist.tie']) {
							cTieIdIndex = i;
						}
					}
					console.info('found cTieIdIndex:', cTieIdIndex, 'gDevBuilds.length:', gDevBuilds.length);
					if (cTieIdIndex == gDevBuilds.length - 1) {
						untieIt();
					} else {
						// tie to next tieId that is not of runningExeTieId
						cTieIdIndex++;
						for (var i=cTieIdIndex; i<gDevBuilds.length; i++) {
							console.info('iter B:', 'i:', i);
							if (gDevBuilds[i][devBuildsArrStruct.id] != runningExeTieId) {
								// tie it
								console.log('tying it to:', gDevBuilds[i][devBuildsArrStruct.id]);
								ini[cProfIniKey].props['Profilist.tie'] = gDevBuilds[i][devBuildsArrStruct.id];
								box.style.backgroundImage = 'url("' + getPathTo16Img(gDevBuilds[i][devBuildsArrStruct.base_icon], true) + '")';
								break;
							}
							if (i == gDevBuilds.length - 1) {
								console.log('ok untie it');
								untieIt();
							}
						}
					}
				}
			}
		},
		'profilist-dev-safe': function() {
			console.log('launch this profile in safe mode');
			
			var cProfName = box.getAttribute('label');
			var cProfIniKey = getIniKeyFromProfName(cProfName);
			
			if (cProfIniKey == profToolkit.selectedProfile.iniKey) {
				// https://dxr.mozilla.org/mozilla-central/source/browser/components/nsBrowserGlue.js#778
				var cancelQuit = Cc['@mozilla.org/supports-PRBool;1'].createInstance(Ci.nsISupportsPRBool);
				Services.obs.notifyObservers(cancelQuit, 'quit-application-requested', 'restart');
				if (!cancelQuit.data) {
					Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
				}
				return;
			}
			
			
			console.log('rename, cProfIniKey:', cProfName);
			tbb_msg_close(null, cWin);
			
			var postRunCheck = function(isRunning) {
				if (isRunning) {
					var cCB = {
						onconfirm: function(aHndlr, aEvent, aInput) {
							console.log('ok terminate pid then launch');
							cWin.PanelUI.toggle();// hide panel
							var promise_forceQuit = ProfilistWorker.post('forceQuit', [isRunning, ini[cProfIniKey].props.IsRelative, ini[cProfIniKey].props.Path, profToolkit.rootPathDefault]); // for WINNT isRunning will be 1, else its the PID, for WINNT the realative and onwards args are used to get the pid
							promise_forceQuit.then(
							  function(aVal) {
								console.log('Fullfilled - promise_forceQuit - ', aVal);
								// start - do stuff here - promise_forceQuit
								if (aVal) {
									launchProfile(cProfIniKey, ['-safe-mode']);
								} else {
									throw new Error('TerminateProcess was false, this is weird should never happen as its a force quit');
								}
								// end - do stuff here - promise_forceQuit
							  },
							  function(aReason) {
								var rejObj = {name:'promise_forceQuit', aReason:aReason};
								console.warn('Rejected - promise_forceQuit - ', rejObj);
								//deferred_createProfile.reject(rejObj);
							  }
							).catch(
							  function(aCaught) {
								var rejObj = {name:'promise_forceQuit', aCaught:aCaught};
								console.error('Caught - promise_forceQuit - ', rejObj);
								//deferred_createProfile.reject(rejObj);
							  }
							);
						},
						oncancel: function() {
							// focus the most recent window then
							var promise_doFocus = ProfilistWorker.post('focusMostRecentWindowOfProfile', [isRunning, ini[cProfIniKey].props.IsRelative, ini[cProfIniKey].props.Path, profToolkit.rootPathDefault]);
							// consider, if rejected, then should re-loop function or something, till it launches (as im guessing if tries to focus because isRunning, and focus fails, then that profile was in shutdown process)
							promise_doFocus.then(
								function(aVal) {
									console.log('Fullfilled - promise_doFocus - ', aVal);
									// start - do stuff here - promise_doFocus
									//deferredMain_launchProfile.resolve(true);
									// end - do stuff here - promise_doFocus
								},
								function(aReason) {
									var rejObj = {name:'promise_doFocus', aReason:aReason};
									console.error('Rejected - promise_doFocus - ', rejObj);
									//deferredMain_launchProfile.reject(rejObj);
								}
							).catch(
								function(aCaught) {
									var rejObj = {name:'promise_doFocus', aCaught:aCaught};
									console.error('Caught - promise_doFocus - ', rejObj);
									//deferredMain_launchProfile.reject(rejObj);
								}
							);
						}
					};
					tbb_msg('prompt-force-restart' + cProfIniKey, 'Profile is running, force restart?', 'restoreStyleKeyPress', origTarg.ownerDocument.defaultView, box, origTarg, cCB, false);
				} else {
					cWin.PanelUI.toggle();// hide panel
					launchProfile(cProfIniKey, ['-safe-mode']);
				}
			};
			
			var promise_testProfRunning = ProfilistWorker.post('queryProfileLocked', [ini[cProfIniKey].props.IsRelative, ini[cProfIniKey].props.Path, profToolkit.rootPathDefault]);
			promise_testProfRunning.then(
				function(aVal) {
					console.log('Fullfilled - promise_testProfRunning - ', aVal);
					// start - do stuff here - promise_testProfRunning
					// aVal is - if not running across all platforms. on all platforms if 1, it means its running, on non-winnt if >1 then its the pid as its running
					postRunCheck(aVal);
					// end - do stuff here - promise_testProfRunning
				},
				function(aReason) {
					var rejObj = {name:'promise_testProfRunning', aReason:aReason};
					console.error('Rejected - promise_testProfRunning - ', rejObj);
					//deferredMain_getProfileSpecs.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_testProfRunning', aCaught:aCaught};
					console.error('Caught - promise_testProfRunning - ', rejObj);
					//deferredMain_getProfileSpecs.reject(rejObj);
				}
			);
			
			// check if profile is running
				// if it is then tbb msg if ok to force quit
					// if yes, then launchProfile with -safe-mode
				// else not running
					// launchProfile with -safe-mode
			
		},
		'toolbarbutton-icon': function() {
			if (!box.hasAttribute('status')) {
				console.warn('clicked on toolbarbutton-icon of non-profile tbb-box so redirect to profilist-tbb-box');
				origTarg = box;
				className = 'profilist-tbb-box';
				classList = box.classList;
				classAction[className]();
				return;
			}
			console.log('should prevent closing of menu - change badge');
			//e.stopPropagation();  //just need preventDefault to stop panel from closing on click
			e.preventDefault();

			tbb_msg_close(null, cWin); // close whatever is open
			
			var targetedProfileName = targetedTBB.getAttribute('label');
			console.info('targetedProfileName:', targetedProfileName);
			var targetedProfileIniKey = getIniKeyOfProfileName(targetedProfileName);
			
			if (targetedProfileIniKey === null) {
				throw new Error('could not find key for this profile name, this should never happen');
			}
			
			var cDoc = origTarg.ownerDocument;
			var cWin = cDoc.defaultView;
			
			// start - panel dynamics
			var PUI = cWin.PanelUI.panel; // needs this outside as makePanelClosableOnBlur_doCompleteAnimation also uses it
			var makePanelStay = function() {
				targetedTBB.classList.add('profilist-in-badge-change');
				console.log('targetedProfileName:', targetedProfileName);
				
				PUI.addEventListener('popuphiding', keepPuiShowing, false);
				
				cWin.Profilist.PBox.classList.add('profilist-keep-open');
			}
			
			var makePanelClosableOnBlur_doCompleteAnimation = function() {
				cWin.Profilist.PBox.classList.remove('profilist-keep-open');
				PUI.removeEventListener('popuphiding', keepPuiShowing, false);
				//targetedTBB.classList.add('profilist-POST-badge-change'); //experimental
				targetedTBB.classList.remove('profilist-in-badge-change');
			};
			// end - panel dynamics
			
			if ('Profilist.badge' in ini[targetedProfileIniKey].props) {
				// has badge already applied
				
				console.log('morph for remove');
				// morph to say Enter = Remove Esc = Cancel
				// with thrid option "Del = Remove & Delete" , IF no other profile uses that badge, ask if want to "remove AND delete badge from hard drive"
				targetedTBB.removeAttribute('badge');
				delete ini[targetedProfileIniKey].props['Profilist.badge'];
				writeIniAndBkp();
				
				var cCB = function(cProfSpecs) {
					updateIconToAllWindows(targetedProfileIniKey, cProfSpecs);
					updateIconToSystemLaunchers(targetedProfileIniKey, cProfSpecs); // for winnt this will update exe's, but its not set up yet, so on winnt to update system launchers i use updateIconToLauncher with winUpdateIconToSystemShortcutLaunchers true
					updateIconToDesktcut(targetedProfileIniKey, cProfSpecs);
					updateIconToLauncher(targetedProfileIniKey, cProfSpecs, {winUpdateIconToSystemShortcutLaunchers:true});
				};
				getProfileSpecs_WithCB(null, targetedProfileIniKey, null, true, cCB);
			} else {
				// does not have badge applied
				makePanelStay();
				
				/* in proces of converting to use WithCB functions just for niceness, the below is old way and it works
				var cCB = function(aProfSpec) {
					ensureIconExists_WithCB(null, targetedProfileIniKey, aProfSpec, cCB2);
				};
				
				var cCB2 = function(cProfSpec) {
					
				};
				getProfileSpecs_WithCB(null, targetedProfileIniKey, null, true, cCB);
				*/
				
				var step1 = function() {
					var promise_pickerProcess = pickerIconset(cWin);
					promise_pickerProcess.then(
					  function(aVal) {
						console.log('Fullfilled - promise_pickerProcess - ', aVal);
						// start - do stuff here - promise_pickerProcess
						step2(aVal);
						// end - do stuff here - promise_pickerProcess
					  },
					  function(aReason) {
						var rejObj = {name:'promise_pickerProcess', aReason:aReason};
						console.warn('Rejected - promise_pickerProcess - ', rejObj);
						
						var deepestReason = aReasonMax(aReason);
						console.info('deepestReason:', deepestReason);
						if (Object.prototype.toString.call(deepestReason) === '[object Array]') {
							try {
								var errorTxt = myServices.sb.formatStringFromName('iconset-picker-error-txt-' + deepestReason[0], deepestReason.slice(1), deepestReason.slice(1).length) // link3632035
							} catch(ex if ex.result == Cr.NS_ERROR_FAILURE) {
								console.warn('GetStringFromName/formatStringFromName - the `name` on id of `' + 'iconset-picker-error-txt-' + deepestReason[0] + '` doesnt exist');
							}
							if (errorTxt) {
								Services.prompt.alert(
									cWin,
									myServices.sb.GetStringFromName('iconset-picker-error-title'),
									myServices.sb.formatStringFromName('iconset-picker-error-txt-' + deepestReason[0], deepestReason.slice(1), deepestReason.slice(1).length) // link3632035
								);
								makePanelClosableOnBlur_doCompleteAnimation();
								return; //prevent deeper execution
							}
						}
						
						switch (deepestReason) {
							case 'canceled picker':
								// no user notification, as its obvious, user knows when they cancelled the picker
								console.log('user cancled picker, dont alert');
								break;
							default:
								Services.prompt.alert(
									cWin,
									myServices.sb.GetStringFromName('profilist-error-title'),
									myServices.sb.formatStringFromName('profilist-error-txt-something', [JSON.stringify(deepestReason)], 1)
								);
						}
						
						makePanelClosableOnBlur_doCompleteAnimation();						
						//deferred_createProfile.reject(rejObj);
					  }
					).catch(
					  function(aCaught) {
						var rejObj = {name:'promise_pickerProcess', aCaught:aCaught};
						console.error('Caught - promise_pickerProcess - ', rejObj);
						Services.prompt.alert(null, 'profilist', 'in catching');
						//deferred_createProfile.reject(rejObj);
					  }
					);
				};
				
				var step2 = function(pickerPicked) {
					var step2_1 = function() {
						console.log('badge picked');
						
						targetedTBB.setAttribute('badge', pickerPicked['16'].FileURI);
						var iconsetId = OS.Path.split(pickerPicked['16'].OSPath).components;
						iconsetId = iconsetId[iconsetId.length-2];
						
						console.info('iconsetId from post pickerProcess:', iconsetId);
						
						cWin.setTimeout(makePanelClosableOnBlur_doCompleteAnimation, 500);
						
						ini[targetedProfileIniKey].props['Profilist.badge'] = iconsetId;
						writeIniAndBkp();
						
						getProfileSpecs_WithCB(null, targetedProfileIniKey, null, true, step2_2);
					};
					
					var step2_2 = function(aProfSpec) {
						ensureIconExists_WithCB(null, targetedProfileIniKey, aProfSpec, step3);
					};
					
					step2_1();
				};
				
				var step3 = function(targetedProfSpecs) {
					updateIconToAllWindows(targetedProfileIniKey, targetedProfSpecs);
					updateIconToSystemLaunchers(targetedProfileIniKey, targetedProfSpecs);
					updateIconToLauncher(targetedProfileIniKey, targetedProfSpecs, {winUpdateIconToSystemShortcutLaunchers:true});
					updateIconToDesktcut(targetedProfileIniKey, targetedProfSpecs);
				};
				
				step1();
			}
		}
	};
	
	try {
		var i = 0;
		while (i < 5) {
			i++;
			//console.log('checking classes on origTarg of:', origTarg);
			Object.keys(classList).forEach.call(classList, function(c) {
				if (classAction[c]) {
					className = c;
					throw BreakException;
				}
			});
			origTarg = origTarg.parentNode;
			classList = origTarg.classList;
		}
		if (i == 4) {
			console.warn('could not find suitable action 4 levels up so quitting');
			return;
		}
	} catch (ex) {
		if (ex !== BreakException) {
			throw ex;
		}
	}
	
	classAction[className]();
}

function getDevBuildTieIdOfExePath(aExePath, refreshDevBuildsJson) {
	// aExePath is a OS path
	// returns null if aExePath not found in gDevBuilds
	
	if (refreshDevBuildsJson) {
		gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']);
	}
	var pathLowered = aExePath.toLowerCase();
	for (var i=0; i<gDevBuilds.length; i++) {
		if (gDevBuilds[i][devBuildsArrStruct.exe_path].toLowerCase() == pathLowered) {
			return gDevBuilds[i][devBuildsArrStruct.id];
		}
	}
	return null;
}

function getDevBuildPropForExePath(aExePath, getPropName, refreshDevBuildsJson) {
	// if refreshDevBuildsJson then it return data might be stale
	console.log('in getDevBuildPropForTieId');
	if (refreshDevBuildsJson) {
		gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']);
	}
	
	var aExePathLowered = aExePath.toLowerCase();
	for (var i=0; i<gDevBuilds.length; i++) {
		if (gDevBuilds[i][devBuildsArrStruct.exe_path].toLowerCase() == aExePathLowered) {
			return gDevBuilds[i][devBuildsArrStruct[getPropName]];
		}
	}
	// if got here obviously nothing was found
	console.warn('exe path of', aExePath, 'not found in gDevBuilds');
	
	return null;
}

function getDevBuildPropForTieId(cTieId, getPropName, refreshDevBuildsJson) {
	// if refreshDevBuildsJson then it return data might be stale
	console.log('in getDevBuildPropForTieId');
	if (refreshDevBuildsJson) {
		gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']);
	}
	
	for (var i=0; i<gDevBuilds.length; i++) {
		if (gDevBuilds[i][devBuildsArrStruct.id] == cTieId) {
			return gDevBuilds[i][devBuildsArrStruct[getPropName]];
		}
	}
	// if got here obviously nothing was found
	console.warn('exe path of', aExePath, 'not found in gDevBuilds');
	
	return null;
}

function getIconsetForChannelName(channel_name, firefox_version) {
	// firefox_version is double, used for determining if aurora is dev or aurora
	// for a channel name it gives the name of the folder name in in core.addon.path.images + 'channel-iconsets/' + FOLDER_NAME_HERE + '/' + FOLDER_NAME_HERE + '_##.png'
	console.error('enter:', channel_name, firefox_version);
	switch (channel_name) {
		case 'esr':
		case 'release':
		
			return 'release';
		
		case 'beta':
			
			return 'beta'
		
		case 'aurora':
		
			/*
			if (firefox_version) {
				if (Services.vc.compare(firefox_version, 35) >= 0) {
					// aurora became dev icon in version 35
					return 'dev';
				} else {
					return 'aurora';
				}
			} else {
				// default to dev
				return 'dev';
			}
			*/
			return 'aurora';
			
		case 'dev':
		
			return 'dev';
			
		case 'default':
		case 'nightly':
		
			return 'nightly';
			
		default:
		
			throw new Error('unrecognized channel_name! no preset iconset for this channel name!!! channel_name: "' + channel_name + '"');
			
	}
}

function getPathTo16Img(iconset_name, uncached) {
	// copied to options.js
	// returns file uri of path to 16x16 img of the iconset_name, if it is channel or if custom
	if (/^(?:esr|release|beta|aurora|dev|nightly|default)$/m.test(iconset_name)) {
		iconset_name = getIconsetForChannelName(iconset_name);
		console.info('returning', core.addon.path.images + 'channel-iconsets/' + iconset_name + '/' + iconset_name + '_16.png');
		return core.addon.path.images + 'channel-iconsets/' + iconset_name + '/' + iconset_name + '_16.png'; // chrome path so no need for file uri
		//aDOMWindow.Profilist.PBox.style.backgroundImage = 'url("' + core.addon.path.images + 'channel-iconsets/' + cChanImgName + '/' + cChanImgName + '_16.png' + '")';
	} else {
		if (uncached) {
			console.info('returning', OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconset_name, iconset_name)) + '_16.png#' + Math.random());
			return OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconset_name, iconset_name)) + '_16.png#' + Math.random();
		} else {
			console.info('returning', OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconset_name, iconset_name)) + '_16.png');
			return OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconset_name, iconset_name)) + '_16.png';
		}
	}
}
// start - functions to update icons at various locations
function updateIconToAllWindows(aProfIniKey, useSpecObj, aOptions={}) {
	// if aProfilePath is of cur profile it uses XPCOM to get all windows
	
	// useIconNameStr should be string of path
	
	// resolves
		// true if done	
		// false if not needed
		
	var deferredMain_updateIconToAllWindows = new Deferred();
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				var cbPost_ProgSpecsGot_and_IconEnsured = function(cProfSpec) {
					// step globals
					var cWinHandlePtrStr;
					var winntPathToWatchedFile = null;
					
					var step1 = function() {
						// collect hwndPtrStr's
						if (aProfIniKey == profToolkit.selectedProfile.iniKey) {
							// is current profile so no need for ctypes to get handles for all visible windows
							cWinHandlePtrStr = [];
							var DOMWindows = Services.wm.getEnumerator(null);
							while (DOMWindows.hasMoreElements()) {
								var aDOMWin = DOMWindows.getNext();
								var aBaseWin = aDOMWin.QueryInterface(Ci.nsIInterfaceRequestor)
													  .getInterface(Ci.nsIWebNavigation)
													  .QueryInterface(Ci.nsIDocShellTreeItem)
													  .treeOwner
													  .QueryInterface(Ci.nsIInterfaceRequestor)
													  .getInterface(Ci.nsIBaseWindow);
								cWinHandlePtrStr.push(aBaseWin.nativeHandle);
								setWinPPSProps(profToolkit.selectedProfile.iniKey, cProfSpec, aDOMWin);
							}
							
							step2();
						} else {
							// test if profile at aProfIniKey is running
								// if it isnt then resolve
								// if it is then continue to badge apply after getting handle for one of its windows
							
							var step1_1 = function() {
								// get pid for aProfIniKey
								// even for xp just go ahead and run this, it will return 0 if not found. if not found it will go through absolutely all handles which can take up to 1s but its not going to apply so its not a delay
								var promise_pidOfProfile = ProfilistWorker.post('getPidForRunningProfile', [ini[aProfIniKey].props.IsRelative, aProfIniKey, profToolkit.rootPathDefault]);
								promise_pidOfProfile.then(
									function(aVal) {
										console.log('Fullfilled - promise_pidOfProfile - ', aVal);
										// start - do stuff here - promise_pidOfProfile
										if (aVal > 0) {
											step1_2(aVal);
										} else {
											console.warn('not running so no windows to update'); // this is an acceptable resolve to this function as before running this, devuser is not expected to check if running
											deferredMain_updateIconToAllWindows.resolve(false);
										}
										// end - do stuff here - promise_pidOfProfile
									},
									function(aReason) {
										var rejObj = {name:'promise_pidOfProfile', aReason:aReason};
										console.error('Rejected - promise_pidOfProfile - ', rejObj);
										deferredMain_updateIconToAllWindows.reject(rejObj);
									}
								).catch(
									function(aCaught) {
										var rejObj = {name:'promise_pidOfProfile', aCaught:aCaught};
										console.error('Caught - promise_pidOfProfile - ', rejObj);
										deferredMain_updateIconToAllWindows.reject(rejObj);
									}
								);
							};
							
							var step1_2 = function(aProfPID) {
								// collect all visible window handles
								var promise_getWinHandleForPid = ProfilistWorker.post('getPtrStrToWinOfProf', [aProfPID, true, true]); // returns array of hwnd ptr str's
								promise_getWinHandleForPid.then(
									function(aVal) {
										console.log('Fullfilled - promise_getWinHandleForPid - ', aVal);
										// start - do stuff here - promise_getWinHandleForPid
										// aVal is a string to pointer on success, else it is 0
											// i set allWin to true so it will be a an array of strings
										if (!aVal) {
											console.error('no windows found, maybe not running anymore? unlikely but this should not happen as only get here if didnt get 0 for pid in `promise_pidOfProfile`');
											deferredMain_updateIconToAllWindows.resolve(false);
										} else {
											winntPathToWatchedFile = {
												fullPathToFile: OS.Path.join(profToolkit.path_profilistData_winntWatchDir, getSafedForOSPath(aProfIniKey) + '.json'),
												fromDir: profToolkit.path_profilistData_root__fromDir // this is used in case the dirs leading to fullPathToFile dont exist
											};
											cWinHandlePtrStr = aVal;
											step2();
										}
										// end - do stuff here - promise_getWinHandleForPid
									},
									function(aReason) {
										var rejObj = {name:'promise_getWinHandleForPid', aReason:aReason};
										console.error('Rejected - promise_getWinHandleForPid - ', rejObj);
										deferredMain_updateIconToAllWindows.reject(rejObj);
									}
								).catch(
									function(aCaught) {
										var rejObj = {name:'promise_getWinHandleForPid', aCaught:aCaught};
										console.error('Caught - promise_getWinHandleForPid - ', rejObj);
										deferredMain_updateIconToAllWindows.reject(rejObj);
									}
								);
							}
							
							step1_1();
						}
					};
					
					var step2 = function() {
						console.info('cWinHandlePtrStr:', cWinHandlePtrStr);
						var useIconNameStr = OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico');
						console.info('will apply this icon:', useIconNameStr);
						var promise_changeIconForWindows = ProfilistWorker.post('changeIconForAllWindows', [
							useIconNameStr,			// iconPath
							cWinHandlePtrStr,		// arrWinHandlePtrStrs
							winntPathToWatchedFile	// is undefined for samePid
						]);
						promise_changeIconForWindows.then(
							function(aVal) {
								console.log('Fullfilled - promise_changeIconForWindows - ', aVal);
								// start - do stuff here - promise_changeIconForWindows
								deferredMain_updateIconToAllWindows.resolve(true);
								// end - do stuff here - promise_changeIconForWindows
							},
							function(aReason) {
								var rejObj = {name:'promise_changeIconForWindows', aReason:aReason};
								console.error('Rejected - promise_changeIconForWindows - ', rejObj);
								deferredMain_updateIconToAllWindows.reject(rejObj);
							}
						).catch(
							function(aCaught) {
								var rejObj = {name:'promise_changeIconForWindows', aCaught:aCaught};
								console.error('Caught - promise_changeIconForWindows - ', rejObj);
								deferredMain_updateIconToAllWindows.reject(rejObj);
							}
						);
					};
					
					step1();
				};
		
			break;
		default:
			console.error('os-unsupported');
			deferredMain_updateIconToAllWindows.reject('os-unsupported');
			return deferredMain_updateIconToAllWindows.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		console.error('ok going to call get ensure icon now');
		ensureIconExists_WithCB(deferredMain_updateIconToAllWindows, aProfIniKey, aProfSpec, cbPost_ProgSpecsGot_and_IconEnsured);
	};
	
	console.error('going to call get prof spec now');
	getProfileSpecs_WithCB(deferredMain_updateIconToAllWindows, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	
	return deferredMain_updateIconToAllWindows.promise;
}

function updateIconToLauncher(aProfIniKey, useSpecObj, aOptions={}) {
	console.error('entered updateIconToLauncher');
	// if launcher exists, update it, else do nothing
		// update means: ensure launcher has not just right icon but right everything, as if icon is wrong, very likely everything else is wrong
	// for winnt, aOptions can contain, winUpdateIconToSystemShortcutLaunchers, so i dont have to run updateIconToSystemLaunchers, as they are same style both are shortcuts, so in one com initialize i can knock them all out
	
	console.log('updateIconToLauncher run - not yet implemented');
	
	// todo: for windows, make sure to check for pinned shortcuts and update those as well
	
	// update the launcher so it has accurate info, possibly update the deskcut here too if needed (winnt doesnt need desktcut update as its hardlink, but osx probably does)

	var deferredMain_updateIconToLauncher = new Deferred();
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				var cbPost_ProgSpecsGot_and_IconEnsured = function(cProfSpec) {
					// start link060609853
					// determine dirs
					var searchDirs = {};
					searchDirs[profToolkit.path_profilistData_launcherExes] = 1; // profilist launcher dir
					if (aOptions.winUpdateIconToSystemShortcutLaunchers) {
						// for updateIconToSystemLaunchers
						if (core.os.version_name == '7+') {
							searchDirs[profToolkit.path_system_dirForNormalPins] = 1; // win7+ pinned taskbar
							searchDirs[profToolkit.path_system_dirForRelaunchCmdPins] = 2; // win7+ pinned taskbar
							if (core.os.version == 6.2 || core.os.version == 6.3) {
								//searchDirs[profToolkit.path_system_dirStartScreen] = 1; // win8+ start screen, when programs are pinned to start screen on install, they are found here I THINK i asked q on stackoverflow here: http://stackoverflow.com/questions/30682241/location-of-shortcuts-pinned-to-win8-8-1-start-screen?noredirect=1#comment49426104_30682241 // it seems its this path for non start screen pin too on win8/win81 i havent tested other os yet // many progs were inside a subfolder, so depth may need to be 2 here, however firefox was not in a subfolder
							}
						}
						if (core.os.version < 6.2) {
							// if less then win8 i think the start menu program shortctus are here:
							//searchDirs[profToolkit.path_system_dirPrograms] = 1;
						}
						
						// untested, as it didnt play a role in win81, which is what i devd on, path_system_dirQuickLaunch, path_system_dirPrograms
						//searchDirs[profToolkit.path_system_dirQuickLaunch] = 1;
					}
					// end determine dirs
					
					if (aProfIniKey === null) {
						if (profToolkit.selectedProfile.isTemp) {
							// its for temp profile which is selected profile
							var profName = profToolkit.selectedProfile.name;
						} else {
							console.error('aProfIniKey is null but isTemp is not true, profToolkit.selectedProfile:', profToolkit.selectedProfile);
							throw new Error('aProfIniKey is null but isTemp is not true');
						}
					} else {
						var profName = ini[aProfIniKey].props.Name;
					}
					
					var commonCutInfoObj = {
						// keys for worker__createShortcuts
						//dir: OS.Path.dirname(rezFindsArr[i]),
						//name: OS.Path.basename(rezFindsArr[i]), // remove the .lnk
						name: cProfSpec.launcherName,
						//dirNameLnk: rezFindsArr[i], // worker__makeDeskcut requires path safed dirNameLnk, specObj returns path safed name so no need to do it here
						args: '-profile "' + getPathToProfileDir(aProfIniKey) + '" -no-remote',
						desc: 'Launches ' + getAppNameFromChan(cProfSpec.channel_exeForProfile) + ' with "' + profName + '" Profile',
						icon: OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico'),
						targetFile: cProfSpec.path_exeForProfile,
						
						//updateIfDiff: true, // will be set by winnt_updateFoundShortcutLaunchers_withObj to true anyways, so lets data to post
						//refreshIcon: 1 // will be set by anyways...
					};
					
					var promise_winnt_updateFoundShortcutLaunchers_withObj = ProfilistWorker.post('winnt_updateFoundShortcutLaunchers_withObj', [searchDirs, getPathToProfileDir(aProfIniKey), commonCutInfoObj]);
					promise_winnt_updateFoundShortcutLaunchers_withObj.then(
					  function(aVal) {
						console.log('Fullfilled - promise_winnt_updateFoundShortcutLaunchers_withObj - ', aVal);
						// start - do stuff here - promise_winnt_updateFoundShortcutLaunchers_withObj
						console.error('completed updateIconToLauncher');
						// end - do stuff here - promise_winnt_updateFoundShortcutLaunchers_withObj
					  },
					  function(aReason) {
						var rejObj = {name:'promise_winnt_updateFoundShortcutLaunchers_withObj', aReason:aReason};
						console.warn('Rejected - promise_winnt_updateFoundShortcutLaunchers_withObj - ', rejObj);
						//deferred_createProfile.reject(rejObj);
					  }
					).catch(
					  function(aCaught) {
						var rejObj = {name:'promise_winnt_updateFoundShortcutLaunchers_withObj', aCaught:aCaught};
						console.error('Caught - promise_winnt_updateFoundShortcutLaunchers_withObj - ', rejObj);
						//deferred_createProfile.reject(rejObj);
					  }
					);
					// end link060609853
				};
		
			break;
		default:
			console.error('os-unsupported');
			deferredMain_updateIconToLauncher.reject('os-unsupported');
			return deferredMain_updateIconToLauncher.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		ensureIconExists_WithCB(deferredMain_updateIconToLauncher, aProfIniKey, aProfSpec, cbPost_ProgSpecsGot_and_IconEnsured);
	};
	
	getProfileSpecs_WithCB(deferredMain_updateIconToLauncher, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	
	return deferredMain_updateIconToLauncher.promise;
}

function updateIconToSKELETON(aProfIniKey, useSpecObj, aOptions={}) {
	// updates things like exe files on winnt and also all systemShortcutLaunchers, however if aOptions.winDONTUpdateSystemShortcutLaunchers, then it just does the exe files
	// on osx it updates the main .app
	
	var deferredMain_updateIconToSKELETON = new Deferred();
	
	switch (core.os.name) {
		case 'BLAH':
		
				var cbPost_ProgSpecsGot_and_IconEnsured = function(cProfSpec) {
					// do stuff
				};
		
			break;
		default:
			console.error('os-unsupported');
			deferredMain_updateIconToSKELETON.reject('os-unsupported');
			return deferredMain_updateIconToSKELETON.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		ensureIconExists_WithCB(deferredMain_updateIconToSKELETON, aProfIniKey, aProfSpec, cbPost_ProgSpecsGot_and_IconEnsured);
	};
	
	getProfileSpecs_WithCB(deferredMain_updateIconToSKELETON, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	
	return deferredMain_updateIconToSKELETON.promise;
}

function updateIconToSystemLaunchers(aProfIniKey, useSpecObj, aOptions={}) {
	// updates things like exe files on winnt and also all systemShortcutLaunchers, however if aOptions.winDONTUpdateSystemShortcutLaunchers, then it just does the exe files
	// on osx it updates the main .app
	
	var deferredMain_updateIconToSystemLaunchers = new Deferred();
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				var cbPost_ProgSpecsGot_and_IconEnsured = function(cProfSpec) {
					console.log('not yet implemeented, but needed');
					// find exe's
					// if aOptions.winDONTUpdateSystemShortcutLaunchers == true then dont do shortcuts, else if its false then do same from link060609853 minus the path_profilistData_launcherExes
				};
		
			break;
		default:
			console.error('os-unsupported');
			deferredMain_updateIconToSystemLaunchers.reject('os-unsupported');
			return deferredMain_updateIconToSystemLaunchers.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		ensureIconExists_WithCB(deferredMain_updateIconToSystemLaunchers, aProfIniKey, aProfSpec, cbPost_ProgSpecsGot_and_IconEnsured);
	};
	
	getProfileSpecs_WithCB(deferredMain_updateIconToSystemLaunchers, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	
	return deferredMain_updateIconToSystemLaunchers.promise;
}

function updateIconToDesktcut(aProfIniKey, useSpecObj, aOptions={}) {
	
	// get all files on desktop
	// check if the path of shortcut (windows) or symlink (nix/mac) point to launcher file path
		// check if launcher exists
			// if does NOT exist, then delete deskCut
			// if it does EXIST then
				// first reads what build it was last used at by getting Profilist.tie, if it doesnt have Profilist.tie then it gets last used build by reading icon CHANNEL-REF
				// checks if the icon of launcher is correct, by reading icon file of that profile -- icon file is in form of `____BADGE-ID_#####__TIE-ID_#### or __BADGE-ID_#####__CHANNEL-REF_#### (does not have to have a BADGE_ID but has to have TIE-ID or CHANNEL_REF)
				// if it has correct stuff then it doesnt update

	var deferredMain_updateIconToDesktcut = new Deferred();
	
	switch (core.os.name) {
		case 'darwin':
		
				var cbPost_ProgSpecsGot_and_IconEnsured = function(cProfSpec) {
					console.log('not yet implemented but i think i need it, but maybe not if i can figure out how to get alias to refresh to match icon, right now it works if i rename the alias ahh so maybe find all things aliased to it then rename or something i dont know think about it');
				};
		
			break;
		case 'winnt':
		case 'winmo':
		case 'wince':
			// for winnt no need, because i create hardlinks, and when i update the icon of the file a hardlink links to, the hardlink icon updates aH!
		default:
			console.error('os-unsupported');
			deferredMain_updateIconToDesktcut.reject('os-unsupported');
			return deferredMain_updateIconToDesktcut.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		ensureIconExists_WithCB(deferredMain_updateIconToDesktcut, aProfIniKey, aProfSpec, cbPost_ProgSpecsGot_and_IconEnsured);
	};
	
	getProfileSpecs_WithCB(deferredMain_updateIconToDesktcut, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	
	return deferredMain_updateIconToDesktcut.promise;
	
}
// end - functions to update icons at various locations

function iniKeyOfName(theProfileName) {
	// given a profile name, it will get the ini key of it
	// theProfileName is case sensitive
	for (var p in ini) {
		if ('num' in ini[p]) {
			if (ini[p].props.Name == theProfileName) {
				return p;
			}
		}
	}
}

function keepPuiShowing(e) {
	//console.log('keepPuiShowing, e:', e); //todo: figure out why its called so much
	var PUI = e.target.ownerDocument.defaultView.PanelUI.panel;
	PUI.style.opacity = 1;
	e.stopPropagation();
	e.preventDefault();
}

var unsavedTie = null; // when nothing to save, set this back to null
function saveTie(e) {
	// if this happens, unsavedTie can never be null
	e.target.removeEventListener('mouseleave', saveTie, false);
	var tieOnMouseLeave = 'Profilist.tie' in ini[unsavedTie.iniKey].props ? ini[unsavedTie.iniKey].props['Profilist.tie'] : null
	if (tieOnMouseLeave !== unsavedTie.tiePreInitialToggle) {
		console.log('need to write ini as tie on leave is diff from before initial toggle');
		writeIniAndBkp(); // no need for writeIniAndBkpIfDiff becuause if saveTie happens it is only because the tie changed, this is handlded by attaching saveTie on mouseleave by the toggler in submenu click
	} else {
		console.log('no need to write ini as after initial toggle, user toggled back to same state');
	}
	unsavedTie = null;
}

function prevHide(e) {
	e.preventDefault();
	e.stopPropagation();
}

function beforecustomization(e) {
//	console.info('beforecustomization e = ', e);
	var doc = e.target.ownerDocument;
	//var stack = doc.getElementById('profilist_box');
	//var active = stack.querySelector('[status=active]');
	//active.setAttribute('disabled', true);
	console.log('loc:', e);
	var aDOMWindow = doc.defaultView;
	//console.error('aDOMWindow:', aDOMWindow.location);
	//console.info('aDOMWindow.Profilist:', aDOMWindow.Profilist); //if aDOMWindow.Profilist is undefined then it hasnt been built yet
	//aDOMWindow.setTimeout(function() { //if i dont do this setTimeout, and profilist menu wasnt built, and user goes to customize first, then PLoading.boxObject and computed height is 0, i have no idea why, so have to use this setTimeout of 0ms thing, i have noooo idea why this works
	// find the 'about:customizing' tab and wait for it to finish loading
	//e10s safe?
	/*
	var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
	var customizeTabI;
	for (var i=0; i<tabs.length; i++) {
		if (tabs[i].getAttribute('image').indexOf('/skin/customizableui/')) {
			customizeTabI = i;
			break;
		}
	}
	let tab = tabs[customizeTabI];
	if (customizeTabI === undefined) {
		throw new Error('could not find the customize tab');
	}
	*/
	if ('Profilist' in aDOMWindow && aDOMWindow.Profilist !== null) {
		var alreadyDisabled = true;
		aDOMWindow.Profilist.PStack.style.pointerEvents = 'none';
		aDOMWindow.Profilist.PStack.lastChild.setAttribute('disabled', true); //if its already built, so then i dont wait for the promise
	}
	var holder = doc.getElementById('customization-panelHolder');
	
	var mobs = new aDOMWindow.MutationObserver(function(mutations) {
	  mutations.forEach(function(mutation) {          
		console.log(mutation.type, mutation);
		/*
		if (mutation.attributeName == 'progress' && tab.getAttribute('progress') == '') {
		  //alert('tab done loading');
		  init();
		  mobs.disconnect();
		}
		*/
			if (mutation.addedNodes && mutation.addedNodes.length > 0) {
				console.log('target:', mutation.target);
				if (mutation.target.id == 'customization-panelHolder') {
					console.log('target:', mutation.target, mutation);
					mobs.disconnect()
					// do it
					console.error('customize tab done loading');
					var promise_doUp = updateOnPanelShowing(null, aDOMWindow, null, true); //builds it if its not there, if alrady built, this ensures dom data is up to date
					promise_doUp.then(
						function(aVal) {
							console.log('Fullfilled - promise_doUp - ', aVal);
							// start - do stuff here - promise_doUp
							if (!alreadyDisabled) {
								aDOMWindow.Profilist.PStack.lastChild.setAttribute('disabled', true);
							}
							// end - do stuff here - promise_doUp
						},
						function(aReason) {
							var rejObj = {name:'promise_doUp', aReason:aReason};
							console.error('Rejected - promise_doUp - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_doUp', aCaught:aCaught};
							console.error('Caught - promise_doUp - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					);
					// end do it
				}
				
			}

	  });
	});
	mobs.observe(holder, {childList:true, subtree:true});
	
	console.log('holder:', holder);
	console.log('aDOMWindow.PanelUI._initialized:', aDOMWindow.PanelUI.contents.parentNode.parentNode.parentNode);
	// when panel moved into customize its `PanelUI.contents.parentNode.parentNode.parentNode` is `<hbox id="customization-panelHolder">` otherwise its `<xul:vbox anonid="mainViewContainer" class="panel-mainview" panelid="PanelUI-popup">`
	

	//}, 1000);
}

function customizationending(e) {
//	console.info('customizationending e = ', e);

	/*
	var doc = e.target.ownerDocument;
	var stack = doc.getElementById('profilist_box');
	var active = stack.querySelector('[status=active]');
	active.removeAttribute('disabled');
	*/
	var doc = e.target.ownerDocument;
	var aDOMWindow = doc.defaultView;
	aDOMWindow.Profilist.PStack.style.pointerEvents = '';
	aDOMWindow.Profilist.PStack.lastChild.removeAttribute('disabled');
}

var lastMaxStackHeight = 0;

var _cache_useOsSetObj = {};
const _cache_expiryTime_useOsSetObj = 1000; // 1sec
function setWinPPSProps(aProfIniKey, useSpecObj, aNativeHandlePtrStr_OR_aDOMWindow) {
	// aDOMWindow only used by if setWinPPSProps on self. meaning if triggering on self profile
	console.error('doing setWinPPSProps');
	var deferredMain_setWinPPSProps = new Deferred();
	
	var cDOMWindow;
	var cNativeHandlePtrStr;
	if (typeof aNativeHandlePtrStr_OR_aDOMWindow == 'string') {
		// its aNativeHandlePtrStr
		cNativeHandlePtrStr = aNativeHandlePtrStr_OR_aDOMWindow
	} else {
		// its aDOMWindow
		cDOMWindow = aNativeHandlePtrStr_OR_aDOMWindow;
		var cBaseWindow = cDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor)
									.getInterface(Ci.nsIWebNavigation)
									.QueryInterface(Ci.nsIDocShellTreeItem)
									.treeOwner
									.QueryInterface(Ci.nsIInterfaceRequestor)
									.getInterface(Ci.nsIBaseWindow);
		cNativeHandlePtrStr = cBaseWindow.nativeHandle;
	}
	
	// win7+ only
	if (core.os.version_name != '7+') {
		deferredMain_setWinPPSProps.reject('win7+ only');
		return deferredMain_setWinPPSProps.promise;
	}

	var do_setItOnWin = function(aOSSetObj) {
		if (cDOMWindow) {
			var wasFocused = isDOMWindowFocused(cDOMWindow);
		}
		
		var promise_setWinPPSProps = ProfilistWorker.post('setWinPPSProps', [cNativeHandlePtrStr, _cache_useOsSetObj[aProfIniKey].cacheVal]);
		promise_setWinPPSProps.then(
			function(aVal) {
				console.log('Fullfilled - promise_setWinPPSProps - ', aVal);
				// start - do stuff here - promise_setWinPPSProps
					if (wasFocused) {
						cDOMWindow.focus(); // cuz when change SystemAppUserModelID it loses focus
					}
					console.error('wasFocused:', wasFocused);
				// end - do stuff here - promise_setWinPPSProps
			},
			function(aReason) {
				var rejObj = {name:'promise_setWinPPSProps', aReason:aReason};
				console.error('Rejected - promise_setWinPPSProps - ', rejObj);
				//consider throw
				//deferred_createProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_setWinPPSProps', aCaught:aCaught};
				console.error('Caught - promise_setWinPPSProps - ', rejObj);
				// consider throw
				//deferred_createProfile.reject(rejObj);
			}
		);
	};
	
	var do_createTransferObj = function(cProfSpec) {
		_cache_useOsSetObj[aProfIniKey] = {
			cacheVal: {
				RelaunchIconResource: OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico'), // im assuming here that the icon exists, :todo: this assumption can be a source of trouble
				RelaunchCommand: ' "' + cProfSpec.path_exeForProfile + '" -profile "' + getPathToProfileDir(profToolkit.selectedProfile.iniKey) + '" -no-remote', // absolutely no idea why but i had to put a leading space, otherwise the double quotes wouldnt take, and if i didnt use double quotes it wouldnt work either iA this works solid
				RelaunchDisplayNameResource: cProfSpec.launcherName,
				IDHash: getPathToProfileDir(profToolkit.selectedProfile.iniKey)
			},
			cacheTime: new Date().getTime()
		};
		do_setItOnWin(_cache_useOsSetObj[aProfIniKey]);
	};
	
	if (!useSpecObj) {
		if (aProfIniKey in _cache_useOsSetObj) {
			if (new Date().getTime() - _cache_useOsSetObj[aProfIniKey].cacheTime < _cache_expiryTime_useOsSetObj) {
				// cached val is within _cache_expiryTime_useOsSetObj (i initally set this to 1sec) old
				console.error('USING CACHED');
				do_setItOnWin(_cache_useOsSetObj[aProfIniKey]);
			} else {
				console.error('refreshing cache');
				getProfileSpecs_WithCB(deferredMain_setWinPPSProps, aProfIniKey, null, true, do_createTransferObj);
			}
		} else {
			console.error('initing cache');
			getProfileSpecs_WithCB(deferredMain_setWinPPSProps, aProfIniKey, null, true, do_createTransferObj);
		}
	} else {
		do_createTransferObj(useSpecObj);
	}
	
	return deferredMain_setWinPPSProps.promise;
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
		windowListener.loadIntoWindowBeforeLoad(aDOMWindow);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.loadIntoWindowBeforeLoad(aDOMWindow, true);
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		
		for (var u in unloaders) {
			unloaders[u]();
		}
		
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		// start - do os specific stuff
		if (core.os.name == 'darwin') {
			/*
			OS.Constants.Path.libDir = Services.dirsvc.get('GreBinD', Ci.nsIFile).path;
			OS.Constants.Path.libsqlite3 = Services.dirsvc.get('GreBinD', Ci.nsIFile).path;
			OS.Constants.Path.libxul = 	Services.dirsvc.get('XpcomLib', Ci.nsIFile).path;
			*/
		}
		// end - do os specific stuff
		
		aDOMWindow.addEventListener('activate', activated, false); //because might have the options tab open in a non PanelUI window
		//var PanelUI = aDOMWindow.document.getElementById('PanelUI-popup'); //even doc.getElementById wont exist if window isnt loaded yet, meaning readyState == complete
		//console.log('PanelUI:', PanelUI);
		if (aDOMWindow.PanelUI) {
			//on startup PanelUI._initialized is false, i have to figure out a way to wait for this to hit true
			//console.info('aDOMWindow.PanelUI:', uneval(aDOMWindow.PanelUI));
			if (aDOMWindow.PanelUI._initialized == false) {
				var pnl = aDOMWindow.document.getElementById('PanelUI-popup'); // have to do it this way, doing PanelUI.panel does getElementById anyways so this is no pref loss
			} else {
				var pnl = aDOMWindow.PanelUI.panel;
			}
			aDOMWindow.Profilist = null;
			var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			console.info('cssUri:', cssUri);
			domWinUtils.loadSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet //NOTE: IMPORTANT: Intermittently this errors, it says illegal value, but when i dump cssUri value its this: `"jar:file:///C:/Users/Vayeate/AppData/Roaming/Mozilla/Firefox/Profiles/j0a1zjle.Unnamed%20Profile%201/extensions/Profilist@jetpack.xpi!/main.css"` SO i changed cssUri = to core.chrome_path INSTEAD of `core.aData.resourceURI.spec` ill see how that works out ACTUALLY event with chrome_path its doing the same but only on second and after, meaning its not getting unregistered on uninstall
			
			pnl.addEventListener('popupshowing', updateOnPanelShowing, false);
			pnl.addEventListener('popuphidden', updateOnPanelHid, false);
			aDOMWindow.addEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.addEventListener('customizationending', customizationending, false);
//			console.log('aDOMWindow.gNavToolbox', aDOMWindow.gNavToolbox);

			if ((pnl.state == 'open' || pnl.state == 'showing') || aDOMWindow.document.documentElement.hasAttribute('customizing')) { //or if in customize mode
			//start: point of this if is to populate panel dom IF it is visible
				console.log('visible in this window so populate its dom, aDOMWindow:', aDOMWindow);
				updateOnPanelShowing(null, aDOMWindow, true);
			} // end: point of this if is to populate panel dom IF it is visible
		}
		
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		aDOMWindow.removeEventListener('activate', activated, false);
		if ('Profilist' in aDOMWindow) {
			delete aDOMWindow.ProfilistInRenameMode;
			
			var PUI = aDOMWindow.PanelUI.panel; //PanelUI-popup 
			PUI.removeEventListener('popupshowing', updateOnPanelShowing, false);
			PUI.addEventListener('popuphidden', updateOnPanelHid, false);
			PUI.removeEventListener('popuphiding', prevHide, false);
			aDOMWindow.removeEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.removeEventListener('customizationending', customizationending, false);
			
			if (aDOMWindow.Profilist !== null) {
				//note: as soon as Profilist is initated as object it should come with PBox, thats why i can just check for null here /* link 646432132158 */
				var PBox = aDOMWindow.Profilist.PBox;
				PBox.parentNode.removeChild(PBox);
			}
			
			var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			domWinUtils.removeSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet
			delete aDOMWindow.Profilist;
		}
	},
	loadIntoWindowBeforeLoad: function(aDOMWindow, isRegister) {
		if (!aDOMWindow) {
			console.error('no aDOMWindow!!! this is weird shouldnt happen');
		}
		
		switch (core.os.name) {
			case 'winnt':
			case 'winmo':
			case 'wince':
					
					if (!isRegister) {
						setWinPPSProps(profToolkit.selectedProfile.iniKey, null, aDOMWindow); // returns promise // passing null to 2nd arg makes setWinPPSProps get first spec obj and then cached for the rest
					} else {
						console.error('will not setWinPPSProps as this is loadIntoWindowBeforeLoad from register loop');
					}
					
				break;
			default:
				// do nothing
		}
	}
};
/*end - windowlistener*/

//start - calcualting cubic-bezier stuff
function getValOnCubicBezier_givenXorY(options) {
  /*
  options = {
   cubicBezier: {xs:[x1, x2, x3, x4], ys:[y1, y2, y3, y4]};
   x: NUMBER //this is the known x, if provide this must not provide y, a number for x will be returned
   y: NUMBER //this is the known y, if provide this must not provide x, a number for y will be returned
  }
  */
  if ('x' in options && 'y' in options) {
    throw new Error('cannot provide known x and known y');
  }
  if (!('x' in options) && !('y' in options)) {
    throw new Error('must provide EITHER a known x OR a known y');
  }

  var x1 = options.cubicBezier.xs[0];
  var x2 = options.cubicBezier.xs[1];
  var x3 = options.cubicBezier.xs[2];
  var x4 = options.cubicBezier.xs[3];

  var y1 = options.cubicBezier.ys[0];
  var y2 = options.cubicBezier.ys[1];
  var y3 = options.cubicBezier.ys[2];
  var y4 = options.cubicBezier.ys[3];

  var LUT = {
    x: [],
    y: []
  }

  for(var i=0; i<100; i++) {
    var t = i/100;
    LUT.x.push( (1-t)*(1-t)*(1-t)*x1 + 3*(1-t)*(1-t)*t*x2 + 3*(1-t)*t*t*x3 + t*t*t*x4 );
    LUT.y.push( (1-t)*(1-t)*(1-t)*y1 + 3*(1-t)*(1-t)*t*y2 + 3*(1-t)*t*t*y3 + t*t*t*y4 );
  }

  if ('x' in options) {
    var knw = 'x'; //known
    var unk = 'y'; //unknown
  } else {
    var knw = 'y'; //known
    var unk = 'x'; //unknown
  }

  for (var i=1; i<100; i++) {
    if (options[knw] >= LUT[knw][i] && options[knw] <= LUT[knw][i+1]) {
		console.log('found at t between:', (i/100), ((i+1)/100));
      var linearInterpolationValue = options[knw] - LUT[knw][i];
	  var linearInterpolationFactor = (options[knw] - LUT[knw][i])/ options[knw];
      retObj = {};
	  retObj[unk] = LUT[unk][i] + linearInterpolationValue;
	  retObj.percent = (i/100) + linearInterpolationFactor;
	  return retObj;
    }
  }

}

var cubicBezier_ease = { //cubic-bezier(0.25, 0.1, 0.25, 1.0)
  xs: [0, .25, .25, 1],
  ys: [0, .1, 1, 1]
};


//var theBezier = ease;
//me.alert(getBezier(.8, new coord(theBezier.xs[3]*finalTime,theBezier.ys[3]*finalHeight), new coord(theBezier.xs[2]*finalTime,theBezier.ys[2]*finalHeight), new coord(theBezier.xs[1]*finalTime,theBezier.ys[1]*finalHeight), new coord(theBezier.xs[0]*finalTime,theBezier.ys[0]*finalHeight)).toSource());
//me.alert(getPointOnCubicBezier_AtPercent(.8, myC1, myC2, myC3, myC4).toSource());

function splitCubicBezier(options) {
  var z = options.z,
      cz = z-1,
      z2 = z*z,
      cz2 = cz*cz,
      z3 = z2*z,
      cz3 = cz2*cz,
      x = options.x,
      y = options.y;

  var left = [
    x[0],
    y[0],
    z*x[1] - cz*x[0], 
    z*y[1] - cz*y[0], 
    z2*x[2] - 2*z*cz*x[1] + cz2*x[0],
    z2*y[2] - 2*z*cz*y[1] + cz2*y[0],
    z3*x[3] - 3*z2*cz*x[2] + 3*z*cz2*x[1] - cz3*x[0],
    z3*y[3] - 3*z2*cz*y[2] + 3*z*cz2*y[1] - cz3*y[0]];

  var right = [
    z3*x[3] - 3*z2*cz*x[2] + 3*z*cz2*x[1] - cz3*x[0],
    z3*y[3] - 3*z2*cz*y[2] + 3*z*cz2*y[1] - cz3*y[0],
                    z2*x[3] - 2*z*cz*x[2] + cz2*x[1],
                    z2*y[3] - 2*z*cz*y[2] + cz2*y[1],
                                    z*x[3] - cz*x[2], 
                                    z*y[3] - cz*y[2], 
                                                x[3],
                                                y[3]];
  
  if (options.fitUnitSquare) {
    return {
      left: left.map(function(el, i) {
        if (i % 2 == 0) {
          //return el * (1 / left[6])
          var Xmin = left[0];
          var Xmax = left[6]; //should be 1
          var Sx = 1 / (Xmax - Xmin);
          return (el - Xmin) * Sx;
        } else {
          //return el * (1 / left[7])
          var Ymin = left[1];
          var Ymax = left[7]; //should be 1
          var Sy = 1 / (Ymax - Ymin);
          return (el - Ymin) * Sy;
        }
      }),
      right: right.map(function(el, i) {
        if (i % 2 == 0) {
          //xval
          var Xmin = right[0]; //should be 0
          var Xmax = right[6];
          var Sx = 1 / (Xmax - Xmin);
          return (el - Xmin) * Sx;
        } else {
          //yval
          var Ymin = right[1]; //should be 0
          var Ymax = right[7];
          var Sy = 1 / (Ymax - Ymin);
          return (el - Ymin) * Sy;
        }
      })
    }
  } else {
   return { left: left, right: right};
  }
}
var ease = { //cubic-bezier(0.25, 0.1, 0.25, 1.0)
  xs: [0, .25, .25, 1],
  ys: [0, .1, 1, 1]
};

//end - calcualting cubic-bezier stuff

/*dom insertion library function from MDN - https://developer.mozilla.org/en-US/docs/XUL_School/DOM_Building_and_HTML_Insertion*/
jsonToDOM.namespaces = {
    html: 'http://www.w3.org/1999/xhtml',
    xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
};
jsonToDOM.defaultNamespace = jsonToDOM.namespaces.html;
function jsonToDOM(xml, doc, nodes) {
    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);        
        return [jsonToDOM.namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || jsonToDOM.defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'key')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
			try {
				elem.appendChild(
									Object.prototype.toString.call(e) == '[object Array]'
									?
										tag.apply(null, e)
									:
										e instanceof doc.defaultView.Node
										?
											e
										:
											doc.createTextNode(e)
								);
			} catch (ex) {
				elem.appendChild(doc.createTextNode(ex));
			}
        });
        return elem;
    }
    return tag.apply(null, xml);
}
/*end - dom insertion library function from MDN*/

//start pref stuff
//needs ES5, i dont know what min browser version of FF starts support for ES5
/**
 * if want to change value of preference dont do prefs.holdTime.value = blah, instead must do `prefs.holdTime.setval(500)`
 * because this will then properly set the pref on the branch then it will do the onChange properly with oldVal being correct
 * NOTE: this fucntion prefSetval is not to be used directly, its only here as a contructor
 */
PrefListener.prototype.prefSetval = function(pass_pref_name, pass_branch_name) {
	//console.log('this outside', this);
	var passBranchObj = this.watchBranches[pass_branch_name];
	var passPrefObj = passBranchObj.prefNames[pass_pref_name];
	var func = function(updateTo, iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
		var pref_name = pass_pref_name;
		var branch_name = pass_branch_name;
		var branchObj = passBranchObj; //this.watchBranches[branch_name];
		var prefObj = passPrefObj; //branchObj.prefNames[pref_name];
		//console.info('in prefSetval', 'this:', this, 'branchObj', branchObj, 'prefObj', prefObj, 'pref_name', pass_pref_name);
		if (iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
			var curValOnTree = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name);
			if (curValOnTree == updateTo) {
				console.warn('setval called said to mark it for skipOnChange, however updateTo and curValOnTree are same so on_PrefOnTree_Change will not call after running this updateTo so will not mark for skip');
			} else {
				prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute = new Date().getTime();
			}
		}
		branchObj._branchLive['set' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name, updateTo);
		console.log('set   doooone');
	};
	return func;
}
function typeStr_from_typeLong(typeLong) {
	switch (typeLong) {
		case Ci.nsIPrefBranch.PREF_STRING:
			return 'Char';
		case Ci.nsIPrefBranch.PREF_INT:
			return 'Int';
		case Ci.nsIPrefBranch.PREF_BOOL:
			return 'Bool';
		case Ci.nsIPrefBranch.PREF_INVALID:
			//probably pref does not exist
			throw new Error('typeLong is PREF_INVALID so probably pref DOES NOT EXIST');
		default:
			throw new Error('unrecognized typeLong:', typeLong);
	}
}
///pref listener generic stuff NO NEED TO EDIT
/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
 //note: a weakness with this api i made for prefs, is that, if upgrading/downgrading and in installing rev a pref is no longer in use, the old pref will stay in the about:config system. prefs are only deleted when addon is uninstalled note: as of 080314 though i think i have a solution for this, watch the info/warn dump and if it holds true than edit it in
 //note: good thing about this overhaul of the pref skeleton is that i can have this skeleton pasted in, and if no prefs being watched it doesnt do anything funky
function PrefListener() {
	//is an array
  // Keeping a reference to the observed preference branch or it will get garbage collected.
	Object.keys(this.watchBranches).forEach(function(branch_name) {
		this.watchBranches[branch_name]._branchLive = Services.prefs.getBranch(branch_name);
		this.watchBranches[branch_name]._branchDefault = Services.prefs.getDefaultBranch(branch_name);
		//this.watchBranches[branch_name]._branchLive.QueryInterface(Ci.nsIPrefBranch2); //do not need this anymore as i dont support FF3.x
	}.bind(this));
}
//start - edit in here your prefs to watch
PrefListener.prototype.watchBranches = {}

PrefListener.prototype.watchBranches[myPrefBranch] = { //have to do it this way because in the watchBranches obj i can't do { myPrefBranch: {...} }
	ownType: 0, //0-full, 1-none, 2-partial
	prefNames: {
		'notifications': {
			owned: true,
			default: true,
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_BOOL,
			on_PrefOnObj_Change: writePrefToIni
		},
		'dev': {
			owned: true,
			default: false,
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_BOOL,
			on_PrefOnObj_Change: writePrefToIni
		},
		'dev-builds': {
			owned: true,
			default: '',
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_STRING,
			on_PrefOnObj_Change: writePrefToIni
		},
		'launch_on_create': {
			owned: true,
			default: true,
			value: undefined,
			type: Ci.nsIPrefBranch.PREF_BOOL,
			on_PrefOnObj_Change: writePrefToIni
		}
	},
	on_UnknownPrefNameOnObj_Change: function(oldVal, newVal, rejObj) {
		console.warn('on_UnknownPrefNameOnObj_Change', 'oldVal:', oldVal, 'newVal:', newVal, 'rejObj:', rejObj);
	}
};

//end - edit in here your prefs to watch
PrefListener.prototype.observe = function(subject, topic, data) {
	//console.log('incoming PrefListener observe :: ', 'topic:', topic, 'data:', data, 'subject:', subject);
	//console.info('compare subject to this._branchLive[extensions.MailtoWebmails@jetpack.]', this.watchBranches[subject.root]._branchLive);
	if (topic == 'nsPref:changed') {
		var branch_name = subject.root;
		var pref_name = data;
		this.on_PrefOnTree_Change(branch_name, pref_name);
	} else {
		console.warn('topic is something totally unexpected it is:', topic);
	}
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(aReason, exec__on_PrefOnObj_Change__onRegister) {
	var branchesOnObj = Object.keys(this.watchBranches);
	for (var i=0; i<branchesOnObj.length; i++) {
		var branch_name = branchesOnObj[i];
		var branchObj = this.watchBranches[branch_name];
		if (branchObj.ownType == 0) {
			var unusedPrefNamesOnTree = branchObj._branchLive.getChildList('', {});
		}
		var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
		for (var j=0; j<prefNamesOnObj.length; j++) {
			var pref_name_on_obj = prefNamesOnObj[j];
			var prefObj = branchObj.prefNames[pref_name_on_obj];
			if (prefObj.owned) {
				prefObj.setval = this.prefSetval(pref_name_on_obj, branch_name);
				if (aReason == ADDON_INSTALL) {
					prefObj.value = prefObj.default;
				} else {
					console.log('not install so fetching value of owned pref, as it should exist, may need to catch error here and on error set to default');
					console.info('aReason == ', aReason);
					try {
						prefObj.value = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
					} catch(ex) {
						//console.warn('excpetion occured when trying to fetch value, startup is not install so it should exist, however it probably doesnt so weird, so setting it to default, CAN GET HERE IF say have v1.2 installed and prefs were introduced in v1.3, so on update it can get here. ex:', ex); //this may happen if prefs were deleted somehow even though not uninstalled
						console.warn('pref is missing, aReason == ', aReason); //expected if startup and pref value was default value on shutdown. or if upgrade/downgrade to new version which has prefs that were not there in previous version.
						prefObj.value = prefObj.default;
						var prefMissing = true;
					}
				}
				if (prefMissing || [ADDON_INSTALL, ADDON_UPGRADE, ADDON_DOWNGRADE].indexOf(aReason) > -1) {
					if (prefMissing) {
						console.error('setting on default branch because prefMissing is true, aReason btw is ', aReason);
					} else {
						console.error('setting on default branch because aReason == ', aReason);
					}
					branchObj._branchDefault['set' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj, prefObj.default);
				} else {
					console.error('NOT setting on default branch because aReason == ', aReason);
				}
				if (branchObj.ownType == 0) {
					var indexOfPrefName_ON_unusedPrefNamesOnTree = unusedPrefNamesOnTree.indexOf(pref_name_on_obj);
					if (indexOfPrefName_ON_unusedPrefNamesOnTree > -1) {
						unusedPrefNamesOnTree.splice(indexOfPrefName_ON_unusedPrefNamesOnTree, 1);
					}
				}
			} else {
				prefObj.type = branchObj._branchLive.getPrefType(pref_name_on_obj); //use _branchLive in case it doesnt have default value //and its got to have _branchLive value as it is NOT owned UNLESS dev messed ownership up
				prefObj.default = branchObj._branchDefault['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
				prefObj.value = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_obj);
				prefObj.setval = this.prefSetval(pref_name_on_obj, branch_name);
			}
		}
		branchObj._branchLive.addObserver('', this, false);
		
		for (var j=0; j<unusedPrefNamesOnTree.length; j++) {
			var pref_name_in_arr = unusedPrefNamesOnTree[j];
			/*
			if (!this._branchDefault) {
				this._branchDefault = Services.prefs.getDefaultBranch(null);
			}
			this._branchDefault.deleteBranch(branch_name + pref_name); //delete default value
			branchObj._branchLive.clearUserPref(pref_name_in_arr); //delete live value
			*/
			Services.prefs.deleteBranch(branch_name + pref_name_in_arr); //deletes the default and live value so pref_name is gone from tree
		}
	}
	
	if (exec__on_PrefOnObj_Change__onRegister) { //for robustness this must not be a per branch or a per pref property but on the whole watchBranches
		for (var i=0; i<branchesOnObj.length; i++) {
			var branch_name = branchesOnObj[i];
			var branchObj = this.watchBranches[branch_name];
			var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
			for (var j=0; j<prefNamesOnObj.length; j++) {
				var pref_name_on_obj = prefNamesOnObj[j];
				var prefObj = branchObj.prefNames[pref_name_on_obj];
				if (prefObj.on_PrefOnObj_Change) {
					var oldVal = undefined; //because this is what value on obj was before i set it to something
					var newVal = prefObj.value;
					var rejObj = {
						branch_name: branch_name,
						pref_name: pref_name_on_obj,
						prefObj: prefObj,
						branchObj: branchObj
					};
					prefObj.on_PrefOnObj_Change(oldVal, newVal, rejObj);
				}
			}
		}
	}
};

PrefListener.prototype.unregister = function() {
	var branchesOnObj = Object.keys(this.watchBranches);
	for (var i=0; i<branchesOnObj.length; i++) {
		var branch_name = branchesOnObj[i];
		var branchObj = this.watchBranches[branch_name];
		branchObj._branchLive.removeObserver('', this);
		console.log('removed observer from branch_name', branch_name);
	}
};

PrefListener.prototype.uninstall = function(aReason) {
	console.log('in PrefListener.uninstall proc');
	if (aReason == ADDON_UNINSTALL) {
		var branchesOnObj = Object.keys(this.watchBranches);
		for (var i=0; i<branchesOnObj.length; i++) {
			var branch_name = branchesOnObj[i];
			var branchObj = this.watchBranches[branch_name];
			if (branchObj.ownType == 0) {
				Services.prefs.deleteBranch(branch_name);
			} else {
				var prefNamesOnObj = Object.keys(this.watchBranches[branch_name].prefNames);
				for (var j=0; j<prefNamesOnObj.length; j++) {
					var pref_name_on_obj = prefNamesOnObj[j];
					var prefObj = branchObj.prefNames[pref_name_on_obj];
					if (prefObj.owned) {
						Services.prefs.deleteBranch(branch_name + pref_name_on_obj);
					}
				}
			}
		}
	} else {
		console.log('not real uninstall so quitting preflistener.uninstall proc');
	}
};

PrefListener.prototype.on_PrefOnTree_Change = function (branch_name, pref_name_on_tree) {
	console.log('on_PrefOnTree_Change', 'pref_name_on_tree:', pref_name_on_tree, 'branch_name:', branch_name);
	var branchObj = this.watchBranches[branch_name];
	var rejObj = {
		branch_name: branch_name,
		pref_name: pref_name_on_tree,
		branchObj: branchObj
	};
	if (pref_name_on_tree in branchObj.prefNames) {
		var prefObj = branchObj.prefNames[pref_name_on_tree];
		var oldVal = prefObj.value;
		try {
			var newVal = branchObj._branchLive['get' + typeStr_from_typeLong(prefObj.type) + 'Pref'](pref_name_on_tree);
		} catch (ex) {
			console.info('probably deleted', 'newVal exception:', ex);
		}
		rejObj.prefObj = prefObj;
		if (prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
			var msAgo_markedForSkip = new Date().getTime() - prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute;
			console.log('skipping this onChange as 2nd arg told to skip it, it was marked for skip this many ms ago:', msAgo_markedForSkip);
			delete prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute
		} else {
			if (prefObj.on_PrefOnObj_Change) {
				prefObj.on_PrefOnObj_Change(oldVal, newVal, rejObj);
			} else {
				//do nothing
			}
		}
		prefObj.value = newVal;
		console.log('prefObj value updated, prefObj:', prefObj);
	} else {
		if (branchObj.on_UnknownPrefNameOnObj_Change) {
			var oldVal = null; //i actually dont know if it existed before
			rejObj.type = branchObj._branchLive.getPrefType(pref_name_on_tree);
			console.info('rejObj.type:', rejObj.type);
			if (rejObj.type == 0) {
				console.info('unknownNameOnObj pref probably deleted');
				newVal = null;
			}
			var newVal = branchObj._branchLive['get' + typeStr_from_typeLong(rejObj.type) + 'Pref'](pref_name_on_tree);
			rejObj.setval = function(updateTo) {
				branchObj._branchLive['set' + typeStr_from_typeLong(rejObj.type) + 'Pref'](pref_name_on_tree, updateTo);
			}
			branchObj.on_UnknownPrefNameOnObj_Change(oldVal, newVal, rejObj);
		} else {
			//do nothing
		}
	}
	console.log('DONE on_PrefOnTree_Change');
};
////end pref listener stuff
//end pref stuff

var myPrefListener;
function writePrefToIni(oldVal, newVal, rejObj) {
	console.info('on_PrefOnObj_Change', 'oldVal:', oldVal, 'newVal:', newVal, 'rejObj:', rejObj);
/*
	var promise0 = readIni();
	promise0.then(
		function() {
*/		
			var meat = function() {
				var value_in_ini = ini.General.props['Profilist.' + rejObj.pref_name];
				if (rejObj.prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
					//value_in_ini = value_in_ini == 'false' ? false : true;
					//value_in_ini = ['false', false, 0].indexOf(value_in_ini) > -1 ? false : true;
					if (typeof(value_in_ini) != 'boolean') {
					  if (value_in_ini == 'false' || value_in_ini == '0') {
						value_in_ini = false;
						ini.General.props['Profilist.' + rejObj.pref_name] = false;
						console.error('HAD TO MAKE FIX programtically, this needs to be fixed as it will cause problems, so go trace how the boolean pref was stored as string');
					  } else if (value_in_ini == 'true' || value_in_ini == '1') {
						value_in_ini = true;
						ini.General.props['Profilist.' + rejObj.pref_name] = true;
						console.error('HAD TO MAKE FIX programtically, this needs to be fixed as it will cause problems, so go trace how the boolean pref was stored as string');
					  } else {
						console.error('not a boolean');
						throw new Error('not a boolean');
					  }
					}
				}
				console.info('pre info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
				if (value_in_ini == newVal) {
					console.log('no need to writePrefToIni as the ini value is already what we are setting the pref to which is newVal');
				} else {
					console.log('updating ini right now');
					ini.General.props['Profilist.' + rejObj.pref_name] = newVal;
					console.log('starting writeIni');
					var promise_writeIniAndBkpForPrefObs = writeIniAndBkp(); // no need to do writeIniAndBkpIfDiff() as pref val is changing so obviously different (i think)
					promise_writeIniAndBkpForPrefObs.then(
						function(aVal) {
							console.log('Fullfilled - promise_writeIniAndBkpForPrefObs - ', aVal, 'succesfully updated ini with new pref value. the pref name is:', rejObj.pref_name);
						},
						function(aReason) {
							var rejObj = {name:'promise_writeIniAndBkpForPrefObs', aReason:aReason, aExtra:'failed to update ini with new pref value. the pref name is:"' + rejObj.pref_name + '" and the new value is "' + newVal + '"'};
							console.error('Rejected - promise_writeIniAndBkpForPrefObs - ', rejObj);
						}
					).catch(
						function(aCaught) {
							console.error('Caught - promise_writeIniAndBkpForPrefObs - ', aCaught);
							// throw aCaught;
						}
					);
				}
				console.info('POST info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
				//updateOptionTabsDOM(rejObj.pref_name, newVal);
				cpCommPostMsg(['pref-to-dom', rejObj.pref_name, newVal].join(subDataSplitter));
				
				console.info('destiny info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
			};
			
			if (!ini || !ini.General) {
				console.error('i dont think it should ever get here, trace this if it occours and think about it');
				var promise_iniReadForPrefObs = readIniAndParseObjs();
				promise_iniReadForPrefObs.then(
					function(aVal) {
						console.log('Fullfilled - promise_iniReadForPrefObs - ', aVal);
						meat();
					},
					function(aReason) {
						var rejObj = {name:'promise_iniReadForPrefObs', aReason:aReason, aExtra:'failed readIni in writePrefToIni'};
						console.error('Rejected - promise_iniReadForPrefObs - ', rejObj);
					}
				).catch(
					function(aCaught) {
						console.error('Caught - promise_iniReadForPrefObs - ', aCaught);
						// throw aCaught;
					}
				);
			} else {
				meat();
			}
/*			
		},
		function(aRejectReason) {
			console.error('writePrefToIni failed to read ini', aRejectReason);
		}
	);
*/	
}

function activated(e) {
	//console.log('activated browser window so check if clients-alive and on  reponse readIni and updateDom:');	
	queryClients_doCb_basedOnIfResponse(
	  function onResponse() {
		var promise_iniReadForOptsTabResponse = readIniAndParseObjs();
		promise_iniReadForOptsTabResponse.then(
			function(aVal) {
				console.log('Fullfilled - promise_iniReadForOptsTabResponse - ', aVal);
				cpCommPostMsg(['read-ini-to-dom', JSON.stringify(ini)].join(subDataSplitter));
			},
			function(aReason) {
				var rejObj = {name:'promise_iniReadForOptsTabResponse', aReason:aReason, aExtra:'Failed to read ini on reponse-clients-alive-for-win-activated-ini-refresh-and-dom-update'};
				console.error('Rejected - promise_iniReadForOptsTabResponse - ', rejObj);
				throw new Error(rejObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_iniReadForOptsTabResponse - ', aCaught);
				// throw aCaught;
			}
		);
	  },
	  function onNoResp(){
		//alert('all dead');
	  },
	  'window_activated'
	);

	
	
	/*
	if (openCPContWins.length > 0) {
		console.log('cp tabs are open somewhere, e:', e);
		var found = false;
		for (var i=0; i<openCPContWins.length; i++) {
			var contWin = openCPContWins[i].get();
			var domWin = contWin.QueryInterface(Ci.nsIInterfaceRequestor)
								.getInterface(Ci.nsIWebNavigation)
								.QueryInterface(Ci.nsIDocShellTreeItem)
								.rootTreeItem
								.QueryInterface(Ci.nsIInterfaceRequestor)
								.getInterface(Ci.nsIDOMWindow);
			if (domWin == e.target) {
				console.log('user just activated a window that has a cp contwin in it so send notify obs for updateDomFromIni.refresh');
				found = true;
				Services.obs.notifyObservers(null, 'profilist-update-cp-dom', 'updateDomFromIni.refresh');
				break;
			}
		}
		if (!found) {
			console.warn('cp tabs are open, but the window the user just activated doesnt have the cp contwin so DO NOT notify obs');
		}
	}
	*/
	
	// start - os specific stuff
	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			// check if 
			if (profToolkit.selectedProfile.isTemp) {
				// its a temp prof, dont do this
				break;
			}
			var fullFilePathToWM_SETICON = OS.Path.join(profToolkit.path_profilistData_winntWatchDir, getSafedForOSPath(profToolkit.selectedProfile.iniKey) + '.json') // profToolkit.selectedProfile.iniKey == profToolkit.selectedProfile.iniKey.props.Path
			var promise_checkWmSeticoned = read_encoded(fullFilePathToWM_SETICON, {encoding:'utf8'});
			promise_checkWmSeticoned.then(
				function(aVal) {
					console.log('Fullfilled - promise_checkWmSeticoned - ', aVal);
					// start - do stuff here - promise_checkWmSeticoned
					
					var mostRecWinHwndPtrStr = Services.wm.getMostRecentWindow(null).QueryInterface(Ci.nsIInterfaceRequestor) // no chance for most rec win to be null as this is in the activated event listener which was attached to a window
										  .getInterface(Ci.nsIWebNavigation)
										  .QueryInterface(Ci.nsIDocShellTreeItem)
										  .treeOwner
										  .QueryInterface(Ci.nsIInterfaceRequestor)
										  .getInterface(Ci.nsIBaseWindow).nativeHandle;
					var contents_JSON = JSON.parse(aVal);					
					var promise_removeWinIcons_thenSetLong = ProfilistWorker.post('removeWmSetIcons_thenSetLong', [contents_JSON, fullFilePathToWM_SETICON, mostRecWinHwndPtrStr]);
					promise_removeWinIcons_thenSetLong.then(
						function(aVal) {
							console.log('Fullfilled - promise_removeWinIcons_thenSetLong - ', aVal);
							// start - do stuff here - promise_removeWinIcons_thenSetLong
							
							// end - do stuff here - promise_removeWinIcons_thenSetLong
						},
						function(aReason) {
							var rejObj = {name:'promise_removeWinIcons_thenSetLong', aReason:aReason};
							console.error('Rejected - promise_removeWinIcons_thenSetLong - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_removeWinIcons_thenSetLong', aCaught:aCaught};
							console.error('Caught - promise_removeWinIcons_thenSetLong - ', rejObj);
							//deferred_createProfile.reject(rejObj);
						}
					);
					// end - do stuff here - promise_checkWmSeticoned
				},
				function(aReason) {
					if (aReasonMax(aReason).becauseNoSuchFile) {
						console.log('was not WmSeticoned');
						return;
					}
					var rejObj = {name:'promise_checkWmSeticoned', aReason:aReason};
					console.error('Rejected - promise_checkWmSeticoned - ', rejObj);
					//deferred_createProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_checkWmSeticoned', aCaught:aCaught};
					console.error('Caught - promise_checkWmSeticoned - ', rejObj);
					//deferred_createProfile.reject(rejObj);
				}
			);
			break;
		default:
			// do nothing
	}
	// end - os specific stuff
}

var observers = {
	// key should be `aTopic`
	'profilist-cp-client': {
		anObserver: {
			observe: function (aSubject, aTopic, aData) {
				cpClientListener(aSubject, aTopic, aData);
			}
		}/*,
		preReg: function() {},
		postReg: function() {},
		preUnreg: function() {},
		postUnreg: function() {} */
	}
};

// start - shortcut creation
/*
* on macs the Profilist.launcher is CFBundleIdentifier
*/
function channelNameTo_refName(ch_name) {
	// because my base icon sets and my base channel reference names are release, beta, dev, aurora, or nightly
	if (/nightly/i.test(ch_name)) {
		return 'nightly';
	} else if (/beta/i.test(ch_name)) {
		return 'beta';
	} else if (/aurora/i.test(ch_name)) {
		return 'dev';
	} else if (/(release|esr)/i.test(ch_name)) {
		return 'release';
	} else {
		console.error('channelNameTo_refName unrecognized ch_name of: "' + ch_name + '"');
		throw new Error('channelNameTo_refName unrecognized ch_name of: "' + ch_name + '"');
	}
}

var _cache_getChannelNameOfExePath = {}; //{exePath: channelName, exePath2: channelName}
function getChannelNameOfExePath(aExePath) {
	var deferredMain_getChannelNameOfExePath = new Deferred();
	
	var aExePathLowered = aExePath.toLowerCase();
	if (_cache_getChannelNameOfExePath[aExePathLowered]) { // link803206654
		deferredMain_getChannelNameOfExePath.resolve(_cache_getChannelNameOfExePath[aExePathLowered]);
	} else {
		// if (aExePathLowered == profToolkit.exePathLower) { // no more need for this block check due to i added to cache on initProfToolkit link354869099 so it will already exist and link803206654 would have returned it
		// 	deferredMain_getChannelNameOfExePath.resolve(_cache_getChannelNameOfExePath[profToolkit.exePathLower]);
		// }
		var path_channelName;
		if (core.os.name != 'darwin') {
			path_channelName = OS.Path.join(OS.Path.dirname(aExePath), 'defaults', 'pref', 'channel-prefs.js');
		} else {
			path_channelName = OS.Path.join(aExePath.substr(0, aExePathLowered.indexOf('.app') + 4), 'Contents', 'Resources', 'defaults', 'pref', 'channel-prefs.js');
		}

		var promise_readChanPref = read_encoded(path_channelName, {encoding:'utf-8'});
		promise_readChanPref.then(
			function(aVal) {
				console.log('Fullfilled - promise_readChanPref - ', aVal);
				// start - do stuff here - promise_readChanPref
				var chanVal = aVal.match(/pref\("app\.update\.channel", "(.*?)"/);
				if (!chanVal) {
					var rejObj = {name:'promise_readChanPref', aReason:'Regex match failed', fileContents:aVal, regexMatchVal:chanVal};
					console.error('Rejected - promise_readChanPref - ', rejObj);
					deferredMain_getChannelNameOfExePath.reject(rejObj);
				} else {
					if (chanVal[1] == 'aurora') {
						// i should test the version in the path_channelName or somewhere (i just checked version is not available in path_channelName file) file to see if its < 35 or not
						// but for now im setting it to dev
						chanVal[1] = 'dev';
					}
					_cache_getChannelNameOfExePath[aExePathLowered] = chanVal[1];
					deferredMain_getChannelNameOfExePath.resolve(chanVal[1]);
				}
				// end - do stuff here - promise_readChanPref
			},
			function(aReason) {
				var rejObj = {name:'promise_readChanPref', aReason:aReason};
				console.error('Rejected - promise_readChanPref - ', rejObj);
				deferredMain_getChannelNameOfExePath.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_readChanPref', aCaught:aCaught};
				console.error('Caught - promise_readChanPref - ', rejObj);
				deferredMain_getChannelNameOfExePath.reject(rejObj);
			}
		);
	}
	
	return deferredMain_getChannelNameOfExePath.promise;
}

function getExePathProfileLastLaunchedIn(aProfIniKey) {
	// get last build a profile was launched with, also the last firefox version
	// resolve values:
		// null - meaning never launched before
		// {exePath:, fxVersion:} // fxVersion is a string it can be like `41.0a1` so have to use Services.vc to compare on it, its not a js number
	
	console.error('in getExePathProfileLastLaunchedIn');
	
	var deferredMain_getExePathProfileLastLaunchedIn = new Deferred();
	var step0 = function() {
		// test if its selectedProfile/tempProfile
		console.error('in getExePathProfileLastLaunchedIn', 'aProfIniKey:', aProfIniKey);
		if (aProfIniKey == profToolkit.selectedProfile.iniKey) {
			// is temp or not
			// is sleected profile though
			console.error('in getExePathProfileLastLaunchedIn', 'equivalent so lets return cur info:', aProfIniKey, profToolkit.selectedProfile.iniKey);
			deferredMain_getExePathProfileLastLaunchedIn.resolve({
				exePath: profToolkit.exePath,
				fxVersion: core.firefox.version
			});
		} else {
			console.error('non equiv so going to step1');
			step1();
		}
	};
	
	var step1 = function() {
		// read compat ini
		var path_aProfileCompatIni = OS.Path.join(getPathToProfileDir(aProfIniKey, false), 'compatibility.ini');
		console.error('in getExePathProfileLastLaunchedIn', 'path_aProfileCompatIni', path_aProfileCompatIni);
		
		var promise_readCompatIni = read_encoded(path_aProfileCompatIni, {encoding:'utf-8'});
		promise_readCompatIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_readCompatIni - ', aVal);
				// start - do stuff here - promise_readCompatIni
					step2(aVal);
				// end - do stuff here - promise_readCompatIni
			},
			function(aReason) {
				var deepestReason = aReasonMax(aReason);
				if (deepestReason.becauseNoSuchFile) {
					// this happens for brand new profiles that havent been launched yet
						// so return null, the one receiving can then decide whether to use path of current build, or tied build if its tieable (ie: not temp prof) and tied
					deferredMain_getExePathProfileLastLaunchedIn.resolve(null);
				}
				var rejObj = {name:'promise_readCompatIni', aReason:aReason};
				console.error('Rejected - promise_readCompatIni - ', rejObj);
				deferredMain_getExePathProfileLastLaunchedIn.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_readCompatIni', aCaught:aCaught};
				console.error('Caught - promise_readCompatIni - ', rejObj);
				deferredMain_getExePathProfileLastLaunchedIn.reject(rejObj);
			}
		);
	};
	
	var step2 = function(compatIniContents) {
		// parse compatIniContents
		
		var LastPlatformDir = /LastPlatformDir=(.*?)$/m.exec(compatIniContents);
		var LastVersion = /LastVersion=(.*?)_/.exec(compatIniContents);
		console.error('in getExePathProfileLastLaunchedIn', 'LastPlatformDir', LastPlatformDir);
		console.error('in getExePathProfileLastLaunchedIn', 'LastVersion', LastVersion);
		
		if (!LastPlatformDir) {
			consolee.error('regex failed on LastPlatformDir, compatIniContents was:', compatIniContents);
			throw 'regex failed on LastPlatformDir';
		}
		
		if (!LastVersion) {
			consolee.error('regex failed on LastVersion, compatIniContents was:', compatIniContents);
			throw 'regex failed on LastVersion';
		}
		
		var path_aProfileLastPlatformDir = LastPlatformDir[1];
		
		if (core.os.name == 'darwin') {
			// :todo: test that this block work after i added in the dont readCompatIni if aProfilePath == profToolkit.selectedProfile.iniKey 052415
			if (path_aProfileLastPlatformDir.indexOf(profToolkit.path_profilistData_root) > -1) {
				// i have to do this to get the non-aliased path
				var nsifile_aProfileLastPlatformDir = new FileUtils.File(path_aProfileLastPlatformDir);
				path_aProfileLastPlatformDir = nsifile_aProfileLastPlatformDir.target;
			}	
			var split_exeCur = OS.Path.split(profToolkit.path_exeCur).components;
			var endingArr_exeCur = split_exeCur.slice(split_exeCur.indexOf('MacOS'));
			var endingStr_exeCur = OS.Path.join.apply(OS.File, endingArr_exeCur);
			
			var split_aProfileLastPlatformDir = OS.Path.split(path_aProfileLastPlatformDir).components;
			var startArr_aProfileLastPlatformDir = split_aProfileLastPlatformDir.slice(0, split_aProfileLastPlatformDir.indexOf('Contents') + 1);
			var startStr_aProfileLastPlatformDir = OS.Path.join.apply(OS.File, startArr_aProfileLastPlatformDir);
			var exePath = OS.Path.join(startStr_aProfileLastPlatformDir, endingStr_exeCur);
		} else {
			var split_exeCur = OS.Path.split(profToolkit.path_exeCur).components;
			var endingStr_exeCur = split_exeCur[split_exeCur.length-1];
			var exePath = OS.Path.join(path_aProfileLastPlatformDir, endingStr_exeCur);
		}
		
		deferredMain_getExePathProfileLastLaunchedIn.resolve({
			exePath: exePath,
			fxVersion: LastVersion[1]
		});
	};
	
	step0();
	
	return deferredMain_getExePathProfileLastLaunchedIn.promise;
}



function getChannelNameProfileLastLaunchedIn(aProfIniKey, aExePath) {
	// NOTE: not yet used anywhere, function not completed, 061015
	// resolves to channel string: esr, release, beta, aurora, nightly, default
	// if aExePath is not provided, it is obtained via getExePathProfileLastLaunchedIn
	var deferredMain_getChannelNameProfileLastLaunchedIn = new Deferred();
	
	if (aProfIniKey == profToolkit.selectedProfile.iniKey) {
		// either temp profile or current profile
		deferredMain_getChannelNameProfileLastLaunchedIn.resolve(core.firefox.channel);
	} else {
		// new way: call getExePathProfileLastLaunchedIn then call getChannelNameOfExePath
		
		var step1 = function() {
			//getExePathProfileLastLaunchedIn
		};
		
		var step2 = function() {
			//getChannelNameOfExePath
		};
		
		if (!aExePath) {
			step1();
		} else {
			step2();
		}
		
		/* old crap which is horrible
		var path_channelName;
		var buildPath; //build of the profile for_ini_key
		//var path_channelName = OS.Path.join(profToolkit.PrfDef, 'channel-prefs.js');
		if ('Profilist.tie' in ini[for_ini_key]) {
			buildPath = getDevBuildPropForTieId(ini[for_ini_key].props['Profilist.tie'], 'exe_path');
		} else {
			buildPath = profToolkit.exePath; // todo: this is incorrect!!! 032015 1207p
			asfsadfd(); // put here as it brings attention to me so i fix this
		}
		if (cOS != 'darwin') {
			path_channelName = OS.Path.join(OS.Path.dirname(buildPath), 'defaults', 'pref', 'channel-prefs.js');
		} else {
			path_channelName = OS.Path.join(buildPath.substr(0, buildPath.toLowerCase().indexOf('.app') + 4), 'Contents', 'Resources', 'defaults', 'pref', 'channel-prefs.js');
		}
		if (path_channelName in getChannelNameOfProfile_cache_perBuild) { // note:important: requires tie id to have proper cassing on tie paths
			deferred_getChannelNameOfProfile.resolve(getChannelNameOfProfile_cache_perBuild[path_channelName]);
		} else {
			var promise_readChanPref = read_encoded(path_channelName, {encoding:'utf-8'});
			promise_readChanPref.then(
				function(aVal) {
					console.log('Fullfilled - promise_readChanPref - ', aVal);
					// start - do stuff here - promise_readChanPref
					var chanVal = aVal.match(/pref\("app\.update\.channel", "(.*?)"/);
					if (!chanVal) {
						var rejObj = {name:'promise_readChanPref', aReason:'Regex match failed', fileContents:aVal, regexMatchVal:chanVal};
						deferred_getChannelNameOfProfile.reject('Regex match failed');
					} else {
						chanVal = chanVal[1];
						getChannelNameOfProfile_cache_perBuild[path_channelName] = chanVal;
						deferred_getChannelNameOfProfile.resolve(chanVal);
					}
					// end - do stuff here - promise_readChanPref
				},
				function(aReason) {
					var rejObj = {name:'promise_readChanPref', aReason:aReason};
					console.error('Rejected - promise_readChanPref - ', rejObj);
					deferred_getChannelNameOfProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_readChanPref', aCaught:aCaught};
					console.error('Caught - promise_readChanPref - ', rejObj);
					deferred_getChannelNameOfProfile.reject(rejObj);
				}
			);
		}
		*/
	}
	
	
	return deferredMain_getChannelNameProfileLastLaunchedIn.promise;
};

var getChannelNameOfProfile_cache_perBuild = {}; // [buildPath] = chan
function getChannelNameOfProfile(for_ini_key) {
	// :todo: 061015 DEPRECATE THIS, it is horrible it mixes tie id and crap. im replacing it with getChannelNameProfileLastLaunchedIn, and why the hell cache it? thats horrible as this can change all the time as users launch close launch and so on. so the replacement of `getChannelNameProfileLastLaunchedIn` depends on `getExePathProfileLastLaunchedIn`
	// can pass `null` for `for_ini_key` and if this is temp profile it will give that else will give regular error of not found
	// returns promise
	// resolves to channel string: esr, release, beta, aurora, nightly, default
	
	var deferred_getChannelNameOfProfile = new Deferred();
	
	getChannelNameOfProfile_cache_perBuild[profToolkit.exePath] = core.firefox.channel;
	
	if (!for_ini_key || for_ini_key == profToolkit.selectedProfile.iniKey) {
		// either temp profile, or current profile, so return whatever is the current profiles build
		deferred_getChannelNameOfProfile.resolve(getChannelNameOfProfile_cache_perBuild[profToolkit.exePath]);
	} else {
		var path_channelName;
		var buildPath; //build of the profile for_ini_key
		//var path_channelName = OS.Path.join(profToolkit.PrfDef, 'channel-prefs.js');
		if ('Profilist.tie' in ini[for_ini_key]) {
			buildPath = getDevBuildPropForTieId(ini[for_ini_key].props['Profilist.tie'], 'exe_path');
		} else {
			buildPath = profToolkit.exePath; // todo: this is incorrect!!! 032015 1207p
			asfsadfd(); // put here as it brings attention to me so i fix this
		}
		if (cOS != 'darwin') {
			path_channelName = OS.Path.join(OS.Path.dirname(buildPath), 'defaults', 'pref', 'channel-prefs.js');
		} else {
			path_channelName = OS.Path.join(buildPath.substr(0, buildPath.toLowerCase().indexOf('.app') + 4), 'Contents', 'Resources', 'defaults', 'pref', 'channel-prefs.js');
		}
		if (path_channelName in getChannelNameOfProfile_cache_perBuild) { // note:important: requires tie id to have proper cassing on tie paths
			deferred_getChannelNameOfProfile.resolve(getChannelNameOfProfile_cache_perBuild[path_channelName]);
		} else {
			var promise_readChanPref = read_encoded(path_channelName, {encoding:'utf-8'});
			promise_readChanPref.then(
				function(aVal) {
					console.log('Fullfilled - promise_readChanPref - ', aVal);
					// start - do stuff here - promise_readChanPref
					var chanVal = aVal.match(/pref\("app\.update\.channel", "(.*?)"/);
					if (!chanVal) {
						var rejObj = {name:'promise_readChanPref', aReason:'Regex match failed', fileContents:aVal, regexMatchVal:chanVal};
						deferred_getChannelNameOfProfile.reject('Regex match failed');
					} else {
						chanVal = chanVal[1];
						getChannelNameOfProfile_cache_perBuild[path_channelName] = chanVal;
						deferred_getChannelNameOfProfile.resolve(chanVal);
					}
					// end - do stuff here - promise_readChanPref
				},
				function(aReason) {
					var rejObj = {name:'promise_readChanPref', aReason:aReason};
					console.error('Rejected - promise_readChanPref - ', rejObj);
					deferred_getChannelNameOfProfile.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_readChanPref', aCaught:aCaught};
					console.error('Caught - promise_readChanPref - ', rejObj);
					deferred_getChannelNameOfProfile.reject(rejObj);
				}
			);
		}
	}
	
	return deferred_getChannelNameOfProfile.promise;
}


// start - helper functions for makeLauncher Darwin
function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}

function duplicateDirAndContents(pathToSrcDir, pathToDestDir, max_depth, targetDirExists) {
	// returns promise
	// copies all stuff at depth i, then does depth i + 1, then i + 2 depth, so on // does not start at depth i and if subdir found it doesnt start copying into that right away, it completes depth levels first, i should make this change in future though as enhancement
	// if targetDirExists mark as true, else, set to false. if you set to true when it does not exist, then promise will reject due to failing to copy to non-existant dir. if it does exist, and you set it to false, then you are just wasting a couple extra function calls, function will complete succesfully though, as it tries to make the dir but it will not overwrite if already found

	var deferred_duplicateDirAndContents = new Deferred();
	var promise_duplicateDirAndContents = deferred_duplicateDirAndContents.promise;

	var stuffToMakeAtDepth = [];
	var smallestDepth = 0;
	var largestDepth = 0;

	var delegate_handleEntry = function(entry, depth) {
		// return true to make enumeration stop
		if (depth < smallestDepth) {
			smallestDepth = depth;
		}
		if (depth > largestDepth) {
			largestDepth = depth;
		}
		stuffToMakeAtDepth.push({
			depth: depth,
			isDir: entry.isDir,
			path: entry.path
		});
	};

	var promise_collectAllPathsInSrcDir = enumChildEntries(pathToSrcDir, delegate_handleEntry, max_depth, !targetDirExists);
	
	promise_collectAllPathsInSrcDir.then(
		function(aVal) {
			console.log('Fullfilled - promise_collectAllPathsInSrcDir - ', aVal);
			// start - do stuff here - promise_collectAllPathsInSrcDir
			// start - promise generator func
			var curDepth = smallestDepth;
			var makeStuffsFor_CurDepth = function() {
				var promiseAllArr_madeForCurDepth = [];
				for (var i = 0; i < stuffToMakeAtDepth.length; i++) {
					if (stuffToMakeAtDepth[i].depth == curDepth) {
						var copyToPath = stuffToMakeAtDepth[i].path.replace(new RegExp(escapeRegExp(pathToSrcDir), 'i'), pathToDestDir);
						promiseAllArr_madeForCurDepth.push(
							stuffToMakeAtDepth[i].isDir // if (stuffToMakeAtDepth[i].isDir) {
							?
								OS.File.makeDir(copyToPath)
							: // } else {
								OS.File.unixSymLink(stuffToMakeAtDepth[i].path, stuffToMakeAtDepth[i].path.replace(new RegExp(escapeRegExp(pathToSrcDir), 'i'), pathToDestDir))
								//OS.File.copy(stuffToMakeAtDepth[i].path, copyToPath)
							// }
						);
					}
				}
				var promiseAll_madeForCurDepth = Promise.all(promiseAllArr_madeForCurDepth);
				promiseAll_madeForCurDepth.then(
					function(aVal) {
						//console.log('Fullfilled - promiseAll_madeForCurDepth - ', aVal);
						// start - do stuff here - promiseAll_madeForCurDepth
						if (curDepth < largestDepth) {
							curDepth++;
							makeStuffsFor_CurDepth();
						} else {
							deferred_duplicateDirAndContents.resolve('all depths made up to and including:' + largestDepth);
						}
						// end - do stuff here - promiseAll_madeForCurDepth
					},
					function(aReason) {
						var rejObj = {name:'promiseAll_madeForCurDepth', aReason:aReason};
						console.error('Rejected - promiseAll_madeForCurDepth - ', rejObj);
						deferred_duplicateDirAndContents.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promiseAll_madeForCurDepth', aCaught:aCaught};
						console.error('Caught - promiseAll_madeForCurDepth - ', rejObj);
						deferred_duplicateDirAndContents.reject(rejObj);
					}
				);
			};
			// end - promise generator func
			makeStuffsFor_CurDepth();
			// end - do stuff here - promise_collectAllPathsInSrcDir
		},
		function(aReason) {
			var rejObj = {name:'promise_collectAllPathsInSrcDir', aReason:aReason};
			console.error('Rejected - promise_collectAllPathsInSrcDir - ', rejObj);
			deferred_duplicateDirAndContents.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_collectAllPathsInSrcDir', aCaught:aCaught};
			console.error('Caught - promise_collectAllPathsInSrcDir - ', rejObj);
			deferred_duplicateDirAndContents.reject(rejObj);
		}
	);

	return promise_duplicateDirAndContents;
}
// end - helper functions for makeLauncher Darwin

function delAliasThenMake(pathTrg, pathMake) {
	var deferred_delAliasThenMake = new Deferred();
	
	var do_makeAlias = function() {
		var promise_makeAlias = OS.File.unixSymLink(pathTrg, pathMake);
		promise_makeAlias.then(
			function(aVal) {
				console.log('Fullfilled - promise_makeAlias - ', aVal);
				// start - do stuff here - promise_makeAlias
				deferred_delAliasThenMake.resolve('alias made:' + pathMake + ' point to:' + pathTrg);
				// end - do stuff here - promise_makeAlias
			},
			function(aReason) {
				var rejObj = {name:'promise_makeAlias', aReason:aReason};
				console.error('Rejected - promise_makeAlias - ', rejObj);
				deferred_delAliasThenMake.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_makeAlias', aCaught:aCaught};
				console.error('Caught - promise_makeAlias - ', rejObj);
				deferred_delAliasThenMake.reject(rejObj);
			}
		);
	}
	
	var promise_deleteThisAlias = OS.File.remove(pathMake); // succeeds if its not there
	promise_deleteThisAlias.then(
		function(aVal) {
			console.log('Fullfilled - promise_deleteThisAlias - ', aVal);
			// start - do stuff here - promise_deleteThisAlias
			do_makeAlias();
			// end - do stuff here - promise_deleteThisAlias
		},
		function(aReason) {
			var rejObj = {name:'promise_deleteThisAlias', aReason:aReason};
			console.error('Rejected - promise_deleteThisAlias - ', rejObj);
			deferred_delAliasThenMake.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_deleteThisAlias', aCaught:aCaught};
			console.error('Caught - promise_deleteThisAlias - ', rejObj);
			deferred_delAliasThenMake.reject(rejObj);
		}
	);
	
	return deferred_delAliasThenMake.promise;
}

var _getProfId = {}; // cache
function getProfId(aProfilePath, preProfToolkitInit) {
	// returns promise
		// resolves with string of id or null if temp profile
		
	// if preProfToolkitInit then it will get itselfs id
	
	var deferredMain_getProfId = new Deferred();
	
	if (!preProfToolkitInit && profToolkit.selectedProfile.isTemp) {
		// temporary profile
		deferredMain_getProfId.resolve(null);
	} else if (!preProfToolkitInit && aProfilePath == profToolkit.selectedProfile.iniKey && 'selectedProfile' in _getProfId) {
		deferredMain_getProfId.resolve(_getProfId.selectedProfile);
	}  else if (!preProfToolkitInit && aProfilePath in _getProfId) {
		deferredMain_getProfId.resolve(_getProfId[aProfilePath]);
	} else {
		if (preProfToolkitInit) {
			var path_aProfileDir = OS.Constants.Path.profileDir;
		} else {
			var path_aProfileDir = getPathToProfileDir(aProfilePath);
		}
		var path_aProfileTimesDotJson = OS.Path.join(path_aProfileDir, 'times.json');
		var promise_readTimes = read_encoded(path_aProfileTimesDotJson, {encoding:'utf-8'});
		promise_readTimes.then(
			function(aVal) {
				console.log('Fullfilled - promise_readTimes - ', aVal);
				// start - do stuff here - promise_readTimes
				var theProfId = JSON.parse(aVal).created;
				if (!preProfToolkitInit) {
					_getProfId[aProfilePath] = theProfId;
				} else {
					_getProfId.selectedProfile = theProfId;
				}
				deferredMain_getProfId.resolve(ini[aProfilePath].props['Profilist.id']);
				// end - do stuff here - promise_readTimes
			},
			function(aReason) {
				var rejObj = {name:'promise_readTimes', aReason:aReason};
				console.error('Rejected - promise_readTimes - ', rejObj);
				deferred_createProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_readTimes', aCaught:aCaught};
				console.error('Caught - promise_readTimes - ', rejObj);
				deferred_createProfile.reject(rejObj);
			}
		);
	}
	
	return deferredMain_getProfId.promise;
}

const iconName_keyVal_joiner = '_';
const iconName_set_joiner = '__';

function getProfileSpecs(aProfIniKey, presetIsRunning, ignoreRunning) {
	// if set ignoreRunning then the key isRunning will be DNE
	// presetIsRunning should be set to 0 if its not running, or anything greater then 0 if it srunning. as general practice if > 1 then its the running pid
	
	// by default this function repsects what it is if its running
	// isRunning is 0 if not running or > 0 if it is, this just avoids a double run check in this function if you already got the running status before
	// ignoreRunning will give you the profile specs irrespective of what it is currently running in (if it is running)
	
	/* returns object like this:
	{
		channel_exeForProfile: esr|release|beta|aurora|dev|nightly, // will give aurora if < fx35 and dev if >= 35 // for firefox builds, the channel is "default" this gets replaced with "nightly" // requires channel check
		iconNameObj: {
			components: {
				'BASE': iconset name folder of base depending on channel exe path, and if it that exe path has a custom icon,
				'BADGE': iconset name folder of badge, if no badge then DNE
			},
			str: join of the commoponents with _ seperatoer between key and val, and __ between each entry
		},
		iconsetId_badge: iconset name in profilist_data folder, // dne if no badge
		iconsetId_base: iconset name in profilist_data folder, if this is a regular channel its name is here // requires channel check
		isRunning: ya, // 0 for not, 1 if yes > 1 if yes and its a pid // DNE if ignoreRunning is true
		launhcerName: 'Firefox Nightly - ' + getSafedForOSPath(profile name), // requires channel check
		path_exeForProfile: path to build exe,
		tieId: if its tied else DNE,
		fxVersion: ya
	}
	*/
	var deferredMain_getProfileSpecs = new Deferred();
	
	// globals for steps
	var specObj = {};
	var iniInfo; // obj
	
	var step0 = function() {
		// :todo: review if fxVersion is in right place, like it should above whatever depends on it
		// resolves with obj if its of selectedProfile (either temp prof or not)
		
		if (aProfIniKey === profToolkit.selectedProfile.iniKey) {
			if (presetIsRunning === 0) {
				throw new Error('devuser you are a fool, this is currently running profile, isRunning IS NOT 0 and thats what you said');
			}
			
			if (profToolkit.selectedProfile.isTemp) {
				// not possible to ignoreRunning even if devuser set it to true
				// its a temp profile
				var step0_1 = function() {
					// set isRunning
					if (!ignoreRunning) {
						specObj.isRunning = Services.appinfo.processID;
					}

					// set tieId
						// not possible for temp profile, as no ini key exists in ini
							// so DNE
					
					// path_exeForProfile (depends on ignoreRunning and tieId);
						// not possible to depend on ignoreRunning as no tie can exist for this, so impossible to depend on tieId too
					specObj.path_exeForProfile = profToolkit.exePath;
					
					// set fxVersion
					specObj.fxVersion = core.firefox.version; // because cannot depend on ignoreRunning, it has to be this version
					
					// set channel_exeForProfile (depends on path_exeForProfile and if aurora then depends on fxVersion)
					specObj.channel_exeForProfile = core.firefox.channel; // because cannot depend on ignoreRunning, it has to be this channel

					// set iconsetId_badge
						// impossible for temp profile as there is no iniKey in ini for it
							// so DNE
					
					// set iconsetId_base (depends on path_exeForProfile)
					specObj.iconsetId_base = getDevBuildPropForExePath(specObj.path_exeForProfile, 'base_icon');
					if (!specObj.iconsetId_base) { // is null if exePath was not found in gDevBuilds meaning it has no custom icon
						specObj.iconsetId_base = getIconsetForChannelName(specObj.channel_exeForProfile);
					}
					
					// set iconnameObj (depends on iconsetId_badge and iconsetId_base)
					specObj.iconNameObj = {}; // impossible for this to be tied as its a temp profile meaning it has no entry in ini
					specObj.iconNameObj.components = {};
					specObj.iconNameObj.components['BASE'] = specObj.iconsetId_base; // depends on iconsetId_base
					// // impossible to have a badge for temp profile as there is no ini key
					// if (specObj.iconsetId_badge) {
						// specObj.iconNameObj.components['BADGE'] = specObj.iconsetId_badge;
					// }
					var iconNameObjStrArr = [];
					for (var c in specObj.iconNameObj.components) {
						iconNameObjStrArr.push(c + iconName_keyVal_joiner + specObj.iconNameObj.components[c]);
					}
					specObj.iconNameObj.str = iconNameObjStrArr.join(iconName_set_joiner);
					
					// set launcherName (depends on channel_exeForProfile and Name prop)
					specObj.launcherName = getLauncherName(profToolkit.selectedProfile.iniKey/*is null obviously*/, specObj.channel_exeForProfile);
					
					deferredMain_getProfileSpecs.resolve(specObj);
				};
			} else {
				// not temp profile
				// is possible to ignoreRunning
				// do stuff as if it were temporary profile (then after it i pouplate the stuff that is for a non-temp prof
				var step0_1 = function() {
					// set isRunning
					if (!ignoreRunning) {
						specObj.isRunning = Services.appinfo.processID;
					}

					// set tieId
					if ('Profilist.tie' in ini[profToolkit.selectedProfile.iniKey].props) {
						specObj.tieId = ini[profToolkit.selectedProfile.iniKey].props['Profilist.tie'];
					} // else DNE
					
					// path_exeForProfile (depends on ignoreRunning and tieId);
					if (ignoreRunning) {
						if ('tieId' in specObj) {
							specObj.path_exeForProfile = getDevBuildPropForTieId(specObj.tieId, 'id');
						} else {
							specObj.path_exeForProfile = profToolkit.exePath;
						}
					} else {
						specObj.path_exeForProfile = profToolkit.exePath;
					}
					
					// set fxVersion
					if (specObj.path_exeForProfile == profToolkit.exePath) {
						specObj.fxVersion = core.firefox.version;
					} else {
						// :todo: figure out how to get version of other exe path, not a big deal though as it just affects aurora to dev // and further insignificance as only gets here if ignoreRunning=true and i dont do that as of yet 061015
					}
					
					// set channel_exeForProfile (depends on path_exeForProfile and if aurora then depends on fxVersion)
					var path_exeForProfile_Lowered = specObj.path_exeForProfile.toLowerCase();
					if (path_exeForProfile_Lowered == profToolkit.exePathLower) {
						specObj.channel_exeForProfile = _cache_getChannelNameOfExePath[path_exeForProfile_Lowered]; // will respect ignoreRunning as is based on specObj.path_exeForProfile which was determined based on ignoreRunning
					}
					if (!specObj.channel_exeForProfile) {
						// so ignoreRunning has got to be true, so probably path_exeForProfile is that of a tied exe path, i want to now get the channel of that exe path. // :todo: do some console logging around here to verify im not going to waste my time here as i dont know if a single situation yet where i ignoreRunning=true
						// do promise on specObj.path_exeForProfile
						// .then step0_2()
						var promise_getChForExeForProfile = getChannelNameOfExePath(specObj.path_exeForProfile);
						promise_getChForExeForProfile.then(
							function(aVal) {
								console.log('Fullfilled - promise_getChForExeForProfile - ', aVal);
								// start - do stuff here - promise_getChForExeForProfile
								if (aVal == 'aurora') {
									if ('fxVersion' in specObj) {
										if (Services.vc.compare(specObj.fxVersion, 35) >= 0) {
											specObj.channel_exeForProfile = 'dev';
										} else {
											specObj.channel_exeForProfile = aVal; // aVal is aurora
										}
									} else {
										specObj.channel_exeForProfile = 'dev';
									}
								} else {
									specObj.channel_exeForProfile = aVal;
								}
								step0_2();
								// end - do stuff here - promise_getChForExeForProfile
							},
							function(aReason) {
								var rejObj = {name:'promise_getChForExeForProfile', aReason:aReason};
								console.warn('Rejected - promise_getChForExeForProfile - ', rejObj);
								deferredMain_getProfileSpecs.reject(rejObj);
							}
						).catch(
							function(aCaught) {
								var rejObj = {name:'promise_getChForExeForProfile', aCaught:aCaught};
								console.error('Caught - promise_getChForExeForProfile - ', rejObj);
								deferredMain_getProfileSpecs.reject(rejObj);
							}
						);
					} else {
						step0_2();
					}
				};
				
				var step0_2 = function() {
					// set iconsetId_badge
					if ('Profilist.badge' in ini[profToolkit.selectedProfile.iniKey].props) {
						specObj.iconsetId_badge = ini[profToolkit.selectedProfile.iniKey].props['Profilist.badge'];
					} // else DNE
					
					// set iconsetId_base (depends on path_exeForProfile, this makes it respect ignoreRunning as path_exeForProfile was determined based on ignoreRunning)
					specObj.iconsetId_base = getDevBuildPropForExePath(specObj.path_exeForProfile, 'base_icon'); // this makes it respect ignoreRunning as path_exeForProfile which was based on ignoreRunning
					if (!specObj.iconsetId_base) { // is null if exePath was not found in gDevBuilds meaning it has no custom icon
						specObj.iconsetId_base = getIconsetForChannelName(specObj.channel_exeForProfile); // this makes it respect ignoreRunning as channel_exeForProfile was based on path_exeForProfile which was based on ignoreRunning
					}
					
					// set iconnameObj (depends on iconsetId_badge and iconsetId_base)
					specObj.iconNameObj = {}; // impossible for this to be tied as its a temp profile meaning it has no entry in ini
					specObj.iconNameObj.components = {};
					specObj.iconNameObj.components['BASE'] = specObj.iconsetId_base; // depends on iconsetId_base
					if (specObj.iconsetId_badge) {
						specObj.iconNameObj.components['BADGE'] = specObj.iconsetId_badge;
					}
					var iconNameObjStrArr = [];
					for (var c in specObj.iconNameObj.components) {
						iconNameObjStrArr.push(c + iconName_keyVal_joiner + specObj.iconNameObj.components[c]);
					}
					specObj.iconNameObj.str = iconNameObjStrArr.join(iconName_set_joiner);
					
					// set launcherName (depends on channel_exeForProfile and Name prop)
					specObj.launcherName = getLauncherName(profToolkit.selectedProfile.iniKey, specObj.channel_exeForProfile);
					
					specObj.fxVersion = core.firefox.version;
					
					deferredMain_getProfileSpecs.resolve(specObj);
				};
			}
			
			step0_1();
		} else {
			step1();
		}
	};
	
	var step1 = function() {
		// gets here as aProfIniKey is not of selectedProfile
		// sets specObj.isRunning depending on ignoreRunning
		// also sets path_exeForProfile
		// also sets tieId
		
			// if do not ignore running
				// if presetIsRunning is preset to yes its running > 0
					// if running
						// it sets specObj.isRunning to isRunning
						// path_exeForProfile/fxVersion is set to what its running in
					// if not running
						// isRunning is set to 0
						// path_exeForProfile is set to path of current build
				// if presetIsRunning is NOT preset
					// if running
						// it sets isRunning to 1 on WINNT if running on on UNIX it sets to PID if running
						// path_exeForProfile/fxVersion is set to what its running in
					// if not running
						// isRunning is set to 0
						// path_exeForProfile is set to path of current build
			// else ignore running
				// isRunning is DNE
				// path_exeForProfile/fxVersion set to to path of current build IF NOT TIED, if its tied then set to that of TIED
		if ('Profilist.tie' in ini[aProfIniKey].props) {
			specObj.tieId = ini[aProfIniKey].props['Profilist.tie'];
		}
		
		if (!ignoreRunning) {
			if (presetIsRunning === null || presetIsRunning === undefined) {
				var promise_testAProfilePathRunning = ProfilistWorker.post('queryProfileLocked', [ini[aProfIniKey].props.IsRelative, ini[aProfIniKey].props.Path, profToolkit.rootPathDefault]);
				promise_testAProfilePathRunning.then(
					function(aVal) {
						console.log('Fullfilled - promise_testAProfilePathRunning - ', aVal);
						// start - do stuff here - promise_testAProfilePathRunning
						step1_05b(aVal);
						// end - do stuff here - promise_testAProfilePathRunning
					},
					function(aReason) {
						var rejObj = {name:'promise_testAProfilePathRunning', aReason:aReason};
						console.error('Rejected - promise_testAProfilePathRunning - ', rejObj);
						deferredMain_getProfileSpecs.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promise_testAProfilePathRunning', aCaught:aCaught};
						console.error('Caught - promise_testAProfilePathRunning - ', rejObj);
						deferredMain_getProfileSpecs.reject(rejObj);
					}
				);
			} else {
				// devuser preset its running status so no need to queryProfileLocked
				step1_05b(presetIsRunning);
			}
		} else {
			step1_05a();
		}
	};
	
	var step1_05a = function() {
		// post stuff after step1 if ignoreRunning is true
		// goes to step2
		if ('tieId' in specObj) {
			console.error('setting path_exeForProfile to tieid search 2');
			specObj.path_exeForProfile = getDevBuildPropForTieId(specObj.tieId, 'exe_path');
			if (specObj.path_exeForProfile == profToolkit.exePath) {
				specObj.fxVersion = core.firefox.version;
			} else {
				// :todo: figure out how to get version of another exe path // and further insignificance as only gets here if ignoreRunning=true and i dont do that as of yet 061015
				//specObj.fxVersion = core.firefox.version; // this is wrong i need to figure out the fxVersion of the exeForProfile IF its aurora, this is lo priority as defaulting to dev is super likely like 90% // link788036830231
			}
		} else {
			console.error('setting path_exeForProfile to cur path 1');
			specObj.path_exeForProfile = profToolkit.exePath;
			specObj.fxVersion = core.firefox.version;
		}
		step2();
	};
	
	var step1_05b = function(obtainedRunningVal) {
		// post stuff after step1 if ignoreRunning is false
		// goes to step1_1
		specObj.isRunning = obtainedRunningVal;
		if (specObj.isRunning == 0) {
			// not running
			console.error('not running so cur path or tie if tied');
			if ('tieId' in specObj) {
				specObj.path_exeForProfile = getDevBuildPropForTieId(specObj.tieId, 'exe_path'); //note: will make this go into one of the areas where it has no fxVersion so if aurora for channel it will default to dev
				if (specObj.path_exeForProfile == profToolkit.exePath) {
					specObj.fxVersion = core.firefox.version;
				} else {
					// :todo: figure out how to get version of another exe path // and further insignificance as only gets here if ignoreRunning=true and i dont do that as of yet 061015
					//specObj.fxVersion = core.firefox.version; // this is wrong i need to figure out the fxVersion of the exeForProfile IF its aurora, this is lo priority as defaulting to dev is super likely like 90% // link788036830231
				}
			} else {
				specObj.path_exeForProfile = profToolkit.exePath;
				specObj.fxVersion = core.firefox.version;
			}
			step2();
		} else {
			// running
			console.error('sending to 1_1');
			step1_1();
		}
	};
	
	var step1_1 = function() {
		// get fxVersion and path_exeForProfile for running profile
		// goes to step2
		console.error('in step 1_1');
		var promise_getFxVerAndExe = getExePathProfileLastLaunchedIn(aProfIniKey);
		promise_getFxVerAndExe.then(
			function(aVal) {
				console.log('Fullfilled - promise_getFxVerAndExe - ', aVal);
				// start - do stuff here - promise_getFxVerAndExe
				specObj.fxVersion = aVal.fxVersion;
				specObj.path_exeForProfile = aVal.exePath;
				step2();
				// end - do stuff here - promise_getFxVerAndExe
			},
			function(aReason) {
				var rejObj = {name:'promise_getFxVerAndExe', aReason:aReason};
				console.warn('Rejected - promise_getFxVerAndExe - ', rejObj);
				deferredMain_getProfileSpecs.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_getFxVerAndExe', aCaught:aCaught};
				console.error('Caught - promise_getFxVerAndExe - ', rejObj);
				deferredMain_getProfileSpecs.reject(rejObj);
			}
		);
	};
	
	var step2 = function() {
		// set channel_exeForProfile (depends on path_exeForProfile and fxVersion if aurora)
		console.error('sending for getChannelNameOfExePath for specObj.path_exeForProfile:', specObj.path_exeForProfile);
		var promise_getChOfExe = getChannelNameOfExePath(specObj.path_exeForProfile);
		promise_getChOfExe.then(
			function(aVal) {
				console.log('Fullfilled - promise_getChOfExe - ', aVal);
				// start - do stuff here - promise_getChOfExe
				if (aVal == 'aurora') {
					if ('fxVersion' in specObj) {
						if (Services.vc.compare(specObj.fxVersion, 35) >= 0) {
							specObj.channel_exeForProfile = 'dev';
						} else {
							specObj.channel_exeForProfile = 'aurora';
						}
					} else {
						//default to dev
						specObj.channel_exeForProfile = 'dev';
					}
				} else {
					specObj.channel_exeForProfile = aVal;
				}
				step3();
				// end - do stuff here - promise_getChOfExe
			},
			function(aReason) {
				var rejObj = {name:'promise_getChOfExe', aReason:aReason};
				console.warn('Rejected - promise_getChOfExe - ', rejObj);
				deferredMain_getProfileSpecs.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_getChOfExe', aCaught:aCaught};
				console.error('Caught - promise_getChOfExe - ', rejObj);
				deferredMain_getProfileSpecs.reject(rejObj);
			}
		);
	};
	
	var step3 = function() {
		// set iconsetId_badge
		if ('Profilist.badge' in ini[aProfIniKey].props) {
			specObj.iconsetId_badge = ini[aProfIniKey].props['Profilist.badge'];
		} // else DNE
		
		// set iconsetId_base (depends on path_exeForProfile, this makes it respect ignoreRunning as path_exeForProfile was determined based on ignoreRunning)
		specObj.iconsetId_base = getDevBuildPropForExePath(specObj.path_exeForProfile, 'base_icon'); // this makes it respect ignoreRunning as path_exeForProfile which was based on ignoreRunning
		if (!specObj.iconsetId_base) { // is null if exePath was not found in gDevBuilds meaning it has no custom icon
			specObj.iconsetId_base = getIconsetForChannelName(specObj.channel_exeForProfile); // this makes it respect ignoreRunning as channel_exeForProfile was based on path_exeForProfile which was based on ignoreRunning
		}
		
		// set iconnameObj (depends on iconsetId_badge and iconsetId_base)
		specObj.iconNameObj = {}; // impossible for this to be tied as its a temp profile meaning it has no entry in ini
		specObj.iconNameObj.components = {};
		specObj.iconNameObj.components['BASE'] = specObj.iconsetId_base; // depends on iconsetId_base
		if (specObj.iconsetId_badge) {
			specObj.iconNameObj.components['BADGE'] = specObj.iconsetId_badge;
		}
		var iconNameObjStrArr = [];
		for (var c in specObj.iconNameObj.components) {
			iconNameObjStrArr.push(c + iconName_keyVal_joiner + specObj.iconNameObj.components[c]);
		}
		specObj.iconNameObj.str = iconNameObjStrArr.join(iconName_set_joiner);
		
		// set launcherName (depends on channel_exeForProfile and Name prop)
		specObj.launcherName = getLauncherName(aProfIniKey, specObj.channel_exeForProfile);
		
		deferredMain_getProfileSpecs.resolve(specObj);
	};
	step0();
	
	return deferredMain_getProfileSpecs.promise;
}

function getDefaultBrowserPath() {
	// todo: not yet supported
	var deferredMain_getDefaultBrowserPath = new Deferred();
	
	deferredMain_getDefaultBrowserPath.resolve(null);
	
	switch (cOS) {
		case 'winnt':
			// copy this http://en.code-bude.net/2013/04/28/how-to-retrieve-default-browsers-path-in-c/
			// that works properly based on this article: https://newoldthing.wordpress.com/2007/03/23/how-does-your-browsers-know-that-its-not-the-default-browser/
			break;
		
		case 'linux':
			// GDK
				// https://developer.gnome.org/gio/stable/GAppInfo.html#g-app-info-get-default-for-uri-scheme
			break;
		
		case 'darwin':
			// http://stackoverflow.com/questions/15404723/how-to-get-version-of-default-browser-on-my-mac-os-x/15406479#15406479
			break;
			
		default:
			deferredMain_getProfileSpecs.reject('os-unsupported');
	}
	
	return deferredMain_getDefaultBrowserPath.promise;
}

function getIconName(for_ini_key, ch_name) {
	// :todo: 061015 DEPRECATE
	var nameArr_launcherIcns = [];
	if ('Profilist.badge' in ini[for_ini_key].props) {
		nameArr_launcherIcns.push('BADGE-ID_' + ini[for_ini_key].props['Profilist.badge']);
	}
	if ('Profilist.tie' in ini[for_ini_key].props) { //ini[Profilist.tie] should hold a generated tie id
		nameArr_launcherIcns.push('TIE-ID_' + ini[for_ini_key].props['Profilist.tie']); //TIE-ID is used to get base paths
	} else {
		nameArr_launcherIcns.push('CHANNEL-REF_' + channelNameTo_refName(ch_name));
	}
	// name starts with `CHANNEL-REF_` then i should just copy the icns from the current build icon
	
	// icon names have either TIE-ID_ or CHANNEL-REF_ but never both
	
	var name_launcherIcns = nameArr_launcherIcns.join('__')/* + '.icns'*/;
	return name_launcherIcns;	
}

function getPathToProfileDir(for_ini_key, objOfRootAndLocal) {
	// returns root dir
	// if set objOfRootAndLocal to true, it returns an object, and the object holds two keys. root for rootdir of prof. and local IF it is a IsRelative=1 prof.
	if (for_ini_key === null && profToolkit.selectedProfile.isTemp) {
		console.warn('IS A TEMP PROF');
		if (!objOfRootAndLocal) {
			return profToolkit.selectedProfile.rootDirPath;
		} else {
			// just a root dir
			return {
				OSPath_root: profToolkit.selectedProfile.rootDirPath
			}
		}
	} else if (!(for_ini_key in ini)) {
		throw new Error('getPathToProfileDir for_ini_key "' + for_ini_key + '" not found in ini');
	}
	
	if (!objOfRootAndLocal) {
		if (for_ini_key == profToolkit.selectedProfile.iniKey) { // works even if its temp prof
			return profToolkit.selectedProfile.rootDirPath;
		}
		
		if (ini[for_ini_key].props.IsRelative == '1') {
			return OS.Path.join(profToolkit.rootPathDefault, OS.Path.basename(OS.Path.normalize(ini[for_ini_key].props.Path)));
		} else {
			return ini[for_ini_key].props.Path;
		}
	} else {
		var rezObj = {};
		if (ini[for_ini_key].props.IsRelative == '1') {
			// root and local
			var theDirName = OS.Path.basename(OS.Path.normalize(ini[for_ini_key].props.Path));
			rezObj.OSPath_root = OS.Path.join(profToolkit.rootPathDefault, theDirName);
			rezObj.OSPath_local = OS.Path.join(profToolkit.localPathDefault, theDirName);
		} else {
			// just a root dir
			rezObj.OSPath_root = ini[for_ini_key].props.Path;
		}
		return rezObj;
	}
}

function getAppNameFromChan(theChName, firefox_version) {
	// firefox_version used for determining aurora/dev for aurora
	//based on channel name returns what the app name should be
	// link5060513255 - see that i alias esr to release and default to nightly, and aurora to dev if version is < 35
	switch (theChName) {
		case 'esr':
			return 'Firefox ESR';
		case 'release':
			return 'Mozilla Firefox';
		case 'beta':
			return 'Firefox Beta';
		case 'aurora':
			if (firefox_version) {
				if (Services.vc.compare(firefox_version, 35) >= 0) {
					// aurora became dev icon in version 35
					return 'Firefox Developer Edition';
				} else {
					return 'Firefox Aurora';
				}
			} else {
				// default to developer as aurora is outdated so its very likely dev
				return 'Firefox Developer';
			}
			break;
		case 'dev':
			return 'Firefox Developer Edition';
		case 'default': // this is what it is on custom build
			return 'Firefox Custom Build';
		case 'nightly':
			return 'Firefox Nightly';
		default:
			console.warn('`theChName` of "' + theChName + '" is unidentified, so just returning it proper cased');
			return theChName;
	}
}

function launchProfile(aProfIniKey, arrOfArgs) {
	// arrOfArgs is array of other command line arguments you want it launched with
	
	/*** LOGIC ***/
	// if running
		// then its most recent window is focused
	// if not running
		// decide launching/build path to use
			// if tied, then use that (caution: user could have re-tied it, so icon may need updating)
			// if not tied, then use current builds path
		// get channel of launching build path
		// ensure icon exists for buildsChannel/profilesBadge combination
		// do os specific functions
			// winnt
				// if tied
					// make launcher if it doesnt exist with tied build path and icon
					// ensure icon exists for this (cuz on startup if profilist is installed it changes the icon), if it doesnt, then update launcher and deskcut with it
					// ensure build path is right on launcher
					// get build path from ini and nsIProcess launch with that
					
				// if not tied
					// dont change build path in launcher, launcher doesnt have to exist, but make it (with icon of channel default browser if firefox, if default build not firefox, then use current build) (maybe dont wait for it to complete making)
					// ensure icon with this channel and badge exist, as if profilist is installed in it, it will change the icon of the windows
					// nsIProcess launch with build of current executing
					
				// REVISIT 052315
				// if not tied
					// ensure icon with current execing channel and badge exist
					// update all launchers to have this icon and target of current execing build
					// ctypes launch
				// if tied
					// ensure icon with tied channel and badge exist
					// update all launchers to have this icon and target of tied build
					// ctypes launch
			// mac
				// calculate launcherName and update .app to it
				// ensure .app are matches target launch build
					// if tied
						// ensure the icon of the .app is of the tied build
					// if not tied
						// ensure the icon of the .app is what it is supposed to be (may not be of the build path its launching with)
				// launch it
				// detect if profilist is installed and eanbled in launchiing profile
					// if it is installed dont do anything
					// if it is NOT installed
						// monitor every second till queryProfileLocked comes back as running then
							// update .app build path back to what it should be
							// update .app icon back to what it should be
							// do not update dock
				// on startup
					// if profilist is installed
						// update .app build path back to what it should be
						// update .app icon back to what it should be
					// if not installed
						// do nothing
			// nix
				// if tied
				
				// if not tied
			// else, default to nsIProcess launch with build of current executing
	
	var deferredMain_launchProfile = new Deferred();
	
	if (aProfIniKey == profToolkit.selectedProfile.iniKey) {
		Services.prompt.alert(null, 'whaa', 'cannot launch self!!!');
		deferredMain_launchProfile.reject('cannot try to launch currently running profile, its already running!');
		return deferredMain_launchProfile.promise;
	}
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				var cb_sendMsg_focusMostRecentWin = function(cProfSpec) {
					// focus most recent window
					// if non-winnt then isRunning holds pid
					var promise_doFocus = ProfilistWorker.post('focusMostRecentWindowOfProfile', [cProfSpec.isRunning, ini[aProfIniKey].props.IsRelative, ini[aProfIniKey].props.Path, profToolkit.rootPathDefault]);
					// consider, if rejected, then should re-loop function or something, till it launches (as im guessing if tries to focus because isRunning, and focus fails, then that profile was in shutdown process)
					promise_doFocus.then(
						function(aVal) {
							console.log('Fullfilled - promise_doFocus - ', aVal);
							// start - do stuff here - promise_doFocus
							deferredMain_launchProfile.resolve(true);
							// end - do stuff here - promise_doFocus
						},
						function(aReason) {
							var rejObj = {name:'promise_doFocus', aReason:aReason};
							console.error('Rejected - promise_doFocus - ', rejObj);
							deferredMain_launchProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_doFocus', aCaught:aCaught};
							console.error('Caught - promise_doFocus - ', rejObj);
							deferredMain_launchProfile.reject(rejObj);
						}
					);
				};
				
				var cb_sendMsg_launchProfile = function(cProfSpec) {
					// shortcut is checked to make sure it has right targetFile, icon, and args
					var cutInfoObj = {
						// keys for worker__createShortcuts
						dir: profToolkit.path_profilistData_launcherExes,
						name: cProfSpec.launcherName,
						dirNameLnk: OS.Path.join(profToolkit.path_profilistData_launcherExes, cProfSpec.launcherName + '.lnk'), // worker__makeDeskcut requires path safed dirNameLnk, specObj returns path safed name so no need to do it here
						args: '-profile "' + getPathToProfileDir(aProfIniKey) + '" -no-remote',
						desc: 'Launches ' + getAppNameFromChan(cProfSpec.channel_exeForProfile) + ' with "' + ini[aProfIniKey].props.Name + '" Profile',
						icon: OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico'),
						targetFile: cProfSpec.path_exeForProfile,
						
						updateIfDiff: true,
						refreshIcon: 1,
						
						// keys for worker__makeLauncher
						IDHash: core.os.version_name == '7+' ? getPathToProfileDir(aProfIniKey) : null,
						profRootDir: getPathToProfileDir(aProfIniKey)
					};
					
					console.info('ready to send msg to launch, pathsObj:', cutInfoObj);
					
					var promise_doLaunch = ProfilistWorker.post('launchProfile', [cutInfoObj, arrOfArgs]);
					promise_doLaunch.then(
						function(aVal) {
							console.log('Fullfilled - promise_doLaunch - ', aVal);
							// start - do stuff here - promise_doLaunch
							deferredMain_launchProfile.resolve(true);
							// end - do stuff here - promise_doLaunch
						},
						function(aReason) {
							var rejObj = {name:'promise_doLaunch', aReason:aReason};
							console.error('Rejected - promise_doLaunch - ', rejObj);
							deferredMain_launchProfile.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_doLaunch', aCaught:aCaught};
							console.error('Caught - promise_doLaunch - ', rejObj);
							deferredMain_launchProfile.reject(rejObj);
						}
					);
				};
		
			break;
		default:
			console.error('os-unsupported');
			deferredMain_launchProfile.reject('os-unsupported');
			return deferredMain_launchProfile.promise;
	}
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		if (aProfSpec.isRunning) {
			cb_sendMsg_focusMostRecentWin(aProfSpec);
		} else {
			ensureIconExists_WithCB(deferredMain_launchProfile, aProfIniKey, aProfSpec, cb_sendMsg_launchProfile);
		}
	};
	
	getProfileSpecs_WithCB(deferredMain_launchProfile, aProfIniKey, null, true, cbPostProgSpecsGot);
	
	return deferredMain_launchProfile.promise;
}

function updateLauncherAndDeskcut(updateReason) {
	// returns promise
	// updateReason is 4:
		// renamed
		// deleted (if running, reject)
		// rebadged
		// rechanneled
		
	// updates launcher and deskcut if they exist
	// if rebadged/rechanneled then that changes the icon
		// winnt
			// if running or not update launcher and deskcut, but dont update windows
		// mac
			// if running or not update launcher and deskcut, but dont update dock
		// nix
}

// start - CB helpers for promises, CB's are called on success
// so far using with makeDeskcut
function getProfileSpecs_WithCB(aDeferred, aProfIniKey, aSpecObj, aIfRunningThenTakeThat, aCB) {
	// aIfRunningThenTakeThat arg is useless as of 061015
	// optional: aDeferred, aSpecObj
	// required: aProfIniKey, aCB
	// aCB is called with profSpecs for aProfIniKey
	
	if (aSpecObj) {
		aCB(aSpecObj);
		return; // to prevent deeper exec
	}
	var promise_cProfSpecs = getProfileSpecs(aProfIniKey, null, false);
	promise_cProfSpecs.then(
		function(aVal) {
			console.log('Fullfilled - promise_cProfSpecs - ', aVal);
			// start - do stuff here - promise_cProfSpecs
			
				aCB(aVal);
				
			// end - do stuff here - promise_cProfSpecs
		},
		function(aReason) {
			var rejObj = {name:'promise_cProfSpecs', aReason:aReason};
			console.error('Rejected - promise_cProfSpecs - ', rejObj);
			if (aDeferred) {
				aDeferred.reject(rejObj);
			}
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_cProfSpecs', aCaught:aCaught};
			console.error('Caught - promise_cProfSpecs - ', rejObj);
			if (aDeferred) {
				aDeferred.reject(rejObj);
			}
		}
	);
};

function ensureIconExists_WithCB(aDeferred, aProfIniKey, useSpecObj, aCB) {
	// optinal: aDeferred, useSpecObj
	// required: aProfIniKey, aCB
	// aCB is called with profSpecs for aProfIniKey
	
	//console.error('in ensureIconExists_WithCB with aProfIniKey:', aProfIniKey);
	
	var cbPostProgSpecsGot = function(aProfSpec) {
		var promise_ensureIconRdyAndMade = makeIcon(aProfIniKey, aProfSpec);
		promise_ensureIconRdyAndMade.then(
			function(aVal) {
				console.log('Fullfilled - promise_ensureIconRdyAndMade - ', aVal);
				// start - do stuff here - promise_ensureIconRdyAndMade
				
					aCB(aVal.profSpecs);
					
				// end - do stuff here - promise_ensureIconRdyAndMade
			},
			function(aReason) {
				var rejObj = {name:'promise_ensureIconRdyAndMade', aReason:aReason};
				console.error('Rejected - promise_ensureIconRdyAndMade - ', rejObj);
				if (aDeferred) {
					aDeferred.reject(rejObj);
				}
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_ensureIconRdyAndMade', aCaught:aCaught};
				console.error('Caught - promise_ensureIconRdyAndMade - ', rejObj);
				if (aDeferred) {
					aDeferred.reject(rejObj);
				}
			}
		);
	};
	
	if (!useSpecObj) {
		console.error('calling get prof sepc from ensure icon');
		getProfileSpecs_WithCB(aDeferred, aProfIniKey, useSpecObj, true, cbPostProgSpecsGot);
	} else {
		cbPostProgSpecsGot(useSpecObj);
	}
	
};
// end - CB helpers for promises

function makeDeskCut(for_ini_key, useSpecObj) {
	// returns promise
	
	// creates desktop shortcut to the launcher
	// if launcher doesnt exist it makes it first
	
	var deferredMain_makeDeskCut = new Deferred();
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				var cbPostGetProfSpecs = function(cProfSpec) {
					console.info('cProfSpec:', cProfSpec);
					var cbPostIconEnsured = function() {
						var cutInfoObj = {
							// keys for worker__createShortcut
							dir: profToolkit.path_profilistData_launcherExes,
							name: cProfSpec.launcherName,
							dirNameLnk: OS.Path.join(profToolkit.path_profilistData_launcherExes, cProfSpec.launcherName + '.lnk'), // worker__makeDeskcut requires path safed dirNameLnk, specObj returns path safed name so no need to do it here
							args: '-profile "' + getPathToProfileDir(for_ini_key) + '" -no-remote',
							desc: 'Launches ' + getAppNameFromChan(cProfSpec.channel_exeForProfile) + ' with "' + ini[for_ini_key].props.Name + '" Profile',
							icon: OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico'),
							targetFile: cProfSpec.path_exeForProfile,
							
							updateIfDiff: true,
							refreshIcon: 1,
							
							// keys for worker__makeLauncher
							IDHash: core.os.version_name == '7+' ? getPathToProfileDir(for_ini_key) : null,
							profRootDir: getPathToProfileDir(for_ini_key),
							
							// keys for worker__makeDeskcut
							IfExists_ThenDontCreateShortcuts: false // i want it to updateIfDiff
						};
						
						var promise_doMakeDeskcut = ProfilistWorker.post('makeDeskcut', [cutInfoObj]);
						promise_doMakeDeskcut.then(
							function(aVal) {
								console.log('Fullfilled - promise_doMakeDeskcut - ', aVal);
								// start - do stuff here - promise_doMakeDeskcut
								deferredMain_makeDeskCut.resolve(true);
								// end - do stuff here - promise_doMakeDeskcut
							},
							function(aReason) {
								var rejObj = {name:'promise_doMakeDeskcut', aReason:aReason};
								console.error('Rejected - promise_doMakeDeskcut - ', rejObj);
								deferredMain_makeDeskCut.reject(rejObj);
							}
						).catch(
							function(aCaught) {
								var rejObj = {name:'promise_doMakeDeskcut', aCaught:aCaught};
								console.error('Caught - promise_doMakeDeskcut - ', rejObj);
								deferredMain_makeDeskCut.reject(rejObj);
							}
						);

					};
					
					ensureIconExists_WithCB(deferredMain_makeDeskCut, for_ini_key, cProfSpec.iconNameObj, cbPostIconEnsured);
				};
				
				getProfileSpecs_WithCB(deferredMain_makeDeskCut, for_ini_key, useSpecObj, true, cbPostGetProfSpecs);

			break;
		default:
			// nothing special
			throw new Error(['os-unsupported', OS.Constants.Sys.Name]);
	}
	
	return deferredMain_makeDeskCut.promise;
}
function getLauncherName(for_ini_key, theChName) {
	// theChName must be provided, it is usually gotten through a promise unless its selectedProfile
	// for_ini_key is used to get the Name, although i can use this to get theChName if it wasnt provided, but i chose not to do this yet
	if (for_ini_key === null) {
		//  then obviously profToolkit.selectedProfile.isTemp
		console.warn('this is a temporary profile');
		var theProfName_safedForPath = myServices.sb.formatStringFromName('temporary-profile-with-dir-name', [profToolkit.selectedProfile.name], 1); //profToolkit.selectedProfile.name; // as i set this name to earlier OS.Path.basename(getPathToProfileDir(profToolkit.selectedProfile.iniKey, false)); // as we dont want to use profToolkit.selectedProfile.name as that is "Temp Profile"
	} else {
		var theProfName_safedForPath = getSafedForOSPath(ini[for_ini_key].props.Name);
	}
	return getAppNameFromChan(theChName) + ' - ' + theProfName_safedForPath;
}
// end - shortcut creation

/* start - makeIcon */
function makeIcon(aProfIniKey, useSpecObj, doc, forceOverwrite) {
	// if forceOverwrite is true, it doesnt check existence first, and it will overwrite icon path, icon path is what is returned from specObj.iconNameObj.str
	// has to be done on mainthread because i need to use canvas
	
	// resolve values:
		// if forceOverwrite is false, and it is found to exist then
		/*
		{
			prexisted: true,
			path_icon: path_icon,
		}
		*/
	
	var deferredMain_makeIcon = new Deferred();
	
	// globals for steps
	var cProfSpec;
	var path_icon;
	var imgObj_base;
	var imgObj_badge;
	var resolveObj = {};
	
	var step0 = function() {
		doc.removeEventListener('DOMContentLoaded', step0, false);
		step1();
	};
	
	var step1 = function() {
		getProfileSpecs_WithCB(deferredMain_makeIcon, aProfIniKey, useSpecObj, null, step2);
	};
	
	// step2 is a bit os specific, but not enough to put it into the main switch
	var step2 = function(aProfSpec) {
		// set cProfSpec
		// and check existence of icon path with respect to forceOverwrite
		// and start loading image assets in paralell with existence check
		// and determine path_icon;
		
		resolveObj.profSpec = aProfSpec;
		cProfSpec = aProfSpec;
		
		var promiseAllArr_existanceAndLoadAssets = [];

		// start loading assets
		promiseAllArr_existanceAndLoadAssets.push(loadImagePaths(null, cProfSpec.iconNameObj.components['BASE'], doc));
		if ('BADGE' in cProfSpec.iconNameObj.components) {
			promiseAllArr_existanceAndLoadAssets.push(loadImagePaths(null, cProfSpec.iconNameObj.components['BADGE'], doc));
		}

		// determine path_icon
		switch (core.os.name) {
			case 'winnt':
			case 'winmo':
			case 'wince':
			
					path_icon = OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.ico')
				
				break;
			case 'darwin':
			
					path_icon = OS.Path.join(profToolkit.path_profilistData_launcherIcons, cProfSpec.iconNameObj.str + '.icns')
				
				break;
			default:
				
					// path_icon is a directory which holds a bunch of pngs
					path_icon = OS.Path.join(profToolkit.path_profilistData_launcherIcons, iconNameObj.str)
				
		}
		
		if (!forceOverwrite) {
			var promise_iconPrexists = OS.File.exists(path_icon);
			promise_iconPrexists.then(
				function(aVal) {
					console.log('Fullfilled - promise_iconPrexists - ', aVal);
					// start - do stuff here - promise_iconPrexists
					// icon already exists, and devuser asked that overwrite not happen so resolve link11564380025
					deferredMain_makeIcon.resolve({
						prexisted: true,
						path_icon: path_icon,
						profSpecs: cProfSpec
					});
					// end - do stuff here - promise_iconPrexists
				},
				function(aReason) {
					var rejObj = {name:'promise_iconPrexists', aReason:aReason};
					console.warn('Rejected - promise_iconPrexists - ', rejObj);
					deferredMain_makeIcon.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_iconPrexists', aCaught:aCaught};
					console.error('Caught - promise_iconPrexists - ', rejObj);
					deferredMain_makeIcon.reject(rejObj);
				}
			);
			promiseAllArr_existanceAndLoadAssets.push(promise_iconPrexists);
		} // else dont check for existence
		
		var promiseAll_existanceAndLoadAssets = Promise.all(promiseAllArr_existanceAndLoadAssets);
		promiseAll_existanceAndLoadAssets.then(
			function(aVal) {
				console.log('Fullfilled - promiseAll_existanceAndLoadAssets - ', aVal);
				// start - do stuff here - promiseAll_existanceAndLoadAssets
				if (aVal.length == 3 && aVal[2] == true) {
					// devuser asked that forceOverwrite note happen, so existance was tested, and it was found to have existed, so it link11564380025 will already have resolved deferredMain_makeIcon so do nothing
				} else {
					// continue to start creation/writing process
					step3(aVal);
				}
				// end - do stuff here - promiseAll_existanceAndLoadAssets
			},
			function(aReason) {
				var rejObj = {name:'promiseAll_existanceAndLoadAssets', aReason:aReason};
				console.warn('Rejected - promiseAll_existanceAndLoadAssets - ', rejObj);
				deferredMain_makeIcon.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promiseAll_existanceAndLoadAssets', aCaught:aCaught};
				console.error('Caught - promiseAll_existanceAndLoadAssets - ', rejObj);
				deferredMain_makeIcon.reject(rejObj);
			}
		);
		
	};
	
	// step3 and onwards are os specific
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':

				var step3 = function(aVal) {
					imgObj_base = aVal[0];
					if (cProfSpec.iconNameObj.components['BADGE']) {
						imgObj_badge = aVal[1];
					}
					
					// start - draw overlaid icons and turn save image data
					var imgDataArr = [];
					// maybe consider drawing smaller badges on beta
					var badgeSizePerBaseSize = {
						'16': 10,
						'32': 16,
						'48': 24,
						'256': 128
					};
					
					for (var baseSize in badgeSizePerBaseSize) {
						var canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
						var ctx = canvas.getContext('2d');
						
						baseSize = parseInt(baseSize)
						canvas.width = baseSize;
						canvas.height = baseSize;
						//ctx.clearRect(0, 0, size, size);
						
						// draw nearest sized base img
						var nearestSizedBaseImg = getImg_of_exactOrNearest_Bigger_then_Smaller(baseSize, imgObj_base);
						console.info('nearestSizedBaseImg:', nearestSizedBaseImg.toString());
						if (nearestSizedBaseImg.height == baseSize) { //switching away from height to height as what if it is a HTMLCanvasElement instead of a HTMLImageElement (i dont think canvas'es hav height)
							// its exact
							console.log('base is exact at ', nearestSizedBaseImg.height , 'so no need to scale, as size it is:', baseSize);
							ctx.drawImage(nearestSizedBaseImg, 0, 0);
						} else {
							// need to scale it
							console.log('scalling base from size of ', nearestSizedBaseImg.height , 'to', baseSize);
							ctx.drawImage(nearestSizedBaseImg, 0, 0, baseSize, baseSize);
						}
						
						if (imgObj_badge) {
							// overlay nearest sized badge
							var badgeSize = badgeSizePerBaseSize[baseSize];
							console.log('badgeSize needed for this size is:', badgeSize, 'base size is:', baseSize);
							var nearestSizedBadgeImg = getImg_of_exactOrNearest_Bigger_then_Smaller(badgeSize, imgObj_badge);
							console.info('nearestSizedBadgeImg:', nearestSizedBadgeImg.toString());
							if (nearestSizedBadgeImg.height == badgeSize) {
								// its exact
								console.log('badge is exact at ', nearestSizedBadgeImg.height, 'so no need to scale, as badgeSize it is:', badgeSize);
								ctx.drawImage(nearestSizedBadgeImg, baseSize-badgeSize, baseSize-badgeSize);
							} else {
								// need to scale it
								console.log('scalling badge from size of ', nearestSizedBadgeImg.height, 'to', badgeSize);
								ctx.drawImage(nearestSizedBadgeImg, baseSize-badgeSize, baseSize-badgeSize, badgeSize, badgeSize);
							}
						}
						
						imgDataArr.push({baseSize:baseSize, data:ctx.getImageData(0, 0, baseSize, baseSize).data});
					}
					// end - draw overlaid icons and turn save image data
					
					// start - put imageDataArr to ico container, as buffer
					// start - ico make proc
					var sizeof_ICONDIR = 6;
					var sizeof_ICONDIRENTRY = 16;
					var sizeof_BITMAPHEADER = 40;
					var sizeof_ICONIMAGEs = 0;
					
					for (var i=0; i<imgDataArr.length; i++) {
						imgDataArr[i].XOR = imgDataArr[i].data.length;
						imgDataArr[i].AND = imgDataArr[i].baseSize * imgDataArr[i].baseSize / 8;
						sizeof_ICONIMAGEs += imgDataArr[i].XOR;
						sizeof_ICONIMAGEs += imgDataArr[i].AND;
						sizeof_ICONIMAGEs += sizeof_BITMAPHEADER;
						imgDataArr[i].sizeof_ICONIMAGE = imgDataArr[i].XOR + imgDataArr[i].AND + sizeof_BITMAPHEADER;
					}
					
					// let XOR = data.length;
					// let AND = canvas.width * canvas.height / 8;
					// let csize = 22 /* ICONDIR + ICONDIRENTRY */ + 40 /* BITMAPHEADER */ + XOR + AND;
					var csize = sizeof_ICONDIR + (sizeof_ICONDIRENTRY * imgDataArr.length) + sizeof_ICONIMAGEs;
					var buffer = new ArrayBuffer(csize);
				   
					// Every ICO file starts with an ICONDIR
					// ICONDIR
					/* 
					typedef struct																	6+?
					{
						WORD           idReserved;   // Reserved (must be 0)						2
						WORD           idType;       // Resource Type (1 for icons)					2
						WORD           idCount;      // How many images?							2
						ICONDIRENTRY   idEntries[1]; // An entry for each image (idCount of 'em)	?
					} ICONDIR, *LPICONDIR;
					*/
					var lilEndian = isLittleEndian();
					var view = new DataView(buffer);
					//view.setUint16(0, 0, lilEndian);					//	WORD	//	idReserved	//	Reserved (must be 0) /* i commented this out because its not needed, by default the view value is 0 */
					view.setUint16(2, 1, lilEndian);					//	WORD	//	idType		//	Resource Type (1 for icons)
					view.setUint16(4, imgDataArr.length, lilEndian);	//	WORD	//	idCount;	// How many images?
					
					// There exists one ICONDIRENTRY for each icon image in the file
					/*
					typedef struct																16
					{
						BYTE        bWidth;          // Width, in pixels, of the image			1
						BYTE        bHeight;         // Height, in pixels, of the image			1
						BYTE        bColorCount;     // Number of colors in image (0 if >=8bpp)	1
						BYTE        bReserved;       // Reserved ( must be 0)					1
						WORD        wPlanes;         // Color Planes							2
						WORD        wBitCount;       // Bits per pixel							2
						DWORD       dwBytesInRes;    // How many bytes in this resource?		4
						DWORD       dwImageOffset;   // Where in the file is this image?		4
					} ICONDIRENTRY, *LPICONDIRENTRY;
					*/
					// ICONDIRENTRY creation for each image
					var sumof__prior_sizeof_ICONIMAGE = 0;
					for (var i=0; i<imgDataArr.length; i++) {
						/*
						var countof_ICONIMAGES_prior_to_this_ICONIMAGE = i;
						var sizeof_ICONIMAGES_prior_to_this_ICONIMAGE = 0;
						for (var i=0; i<countof_ICONIMAGES_prior_to_this_ICONIMAGE; i++) {
							sizeof_ICONIMAGES_prior_to_this_ICONIMAGE += path_data[paths[i]].sizeof_ICONIMAGE;
						}
						*/
						
						view = new DataView(buffer, sizeof_ICONDIR + (sizeof_ICONDIRENTRY * i /* sum_of_ICONDIRENTRYs_before_this_one */));
						view.setUint8(0, imgDataArr[i].baseSize /* % 256 i dont understand why the modulus?? */ );																		// BYTE        bWidth;          // Width, in pixels, of the image
						view.setUint8(1, imgDataArr[i].baseSize /* % 256 i dont understand why the modulus?? */);																		// BYTE        bHeight;         // Height, in pixels, of the image
						//view.setUint8(2, 0);																																					// BYTE        bColorCount;     // Number of colors in image (0 if >=8bpp)
						//view.setUint8(3, 0);																																					// BYTE        bReserved;       // Reserved ( must be 0)
						view.setUint16(4, 1, lilEndian);																																		// WORD        wPlanes;         // Color Planes
						view.setUint16(6, 32, lilEndian);																																		// WORD        wBitCount;       // Bits per pixel
						view.setUint32(8, imgDataArr[i].sizeof_ICONIMAGE /* sizeof_BITMAPHEADER + imgDataArr[i].XOR + imgDataArr[i].AND */, lilEndian);											// DWORD       dwBytesInRes;    // How many bytes in this resource?			// data size
						view.setUint32(12, sizeof_ICONDIR + (sizeof_ICONDIRENTRY * imgDataArr.length) + sumof__prior_sizeof_ICONIMAGE /*sizeof_ICONIMAGES_prior_to_this_ICONIMAGE*/, lilEndian);		// DWORD       dwImageOffset;   // Where in the file is this image?			// data start
						
						sumof__prior_sizeof_ICONIMAGE += imgDataArr[i].sizeof_ICONIMAGE;
					}
					/*
					typdef struct
					{
					   BITMAPINFOHEADER   icHeader;      // DIB header
					   RGBQUAD         icColors[1];   // Color table
					   BYTE            icXOR[1];      // DIB bits for XOR mask
					   BYTE            icAND[1];      // DIB bits for AND mask
					} ICONIMAGE, *LPICONIMAGE;
					*/
					// ICONIMAGE creation for each image
					var sumof__prior_sizeof_ICONIMAGE = 0;
					for (var i=0; i<imgDataArr.length; i++) {
						/*
						typedef struct tagBITMAPINFOHEADER {
						  DWORD biSize;				4
						  LONG  biWidth;			4
						  LONG  biHeight;			4
						  WORD  biPlanes;			2
						  WORD  biBitCount;			2
						  DWORD biCompression;		4
						  DWORD biSizeImage;		4
						  LONG  biXPelsPerMeter;	4
						  LONG  biYPelsPerMeter;	4
						  DWORD biClrUsed;			4
						  DWORD biClrImportant;		4
						} BITMAPINFOHEADER, *PBITMAPINFOHEADER;		40
						*/
						// BITMAPHEADER
						view = new DataView(buffer, sizeof_ICONDIR + (sizeof_ICONDIRENTRY * imgDataArr.length) + sumof__prior_sizeof_ICONIMAGE);
						view.setUint32(0, sizeof_BITMAPHEADER, lilEndian); // BITMAPHEADER size
						view.setInt32(4, imgDataArr[i].baseSize, lilEndian);
						view.setInt32(8, imgDataArr[i].baseSize * 2, lilEndian);
						view.setUint16(12, 1, lilEndian); // Planes
						view.setUint16(14, 32, lilEndian); // BPP
						view.setUint32(20, imgDataArr[i].XOR + imgDataArr[i].AND, lilEndian); // size of data
						
						// Reorder RGBA -> BGRA
						for (var ii = 0; ii < imgDataArr[i].XOR; ii += 4) {
							var temp = imgDataArr[i].data[ii];
							imgDataArr[i].data[ii] = imgDataArr[i].data[ii + 2];
							imgDataArr[i].data[ii + 2] = temp;
						}
						var ico = new Uint8Array(buffer, sizeof_ICONDIR + (sizeof_ICONDIRENTRY * imgDataArr.length) + sumof__prior_sizeof_ICONIMAGE + sizeof_BITMAPHEADER);
						var stride = imgDataArr[i].baseSize * 4;
						
						// Write bottom to top
						for (var ii = 0; ii < imgDataArr[i].baseSize; ++ii) {
							var su = imgDataArr[i].data.subarray(imgDataArr[i].XOR - ii * stride, imgDataArr[i].XOR - ii * stride + stride);
							ico.set(su, ii * stride);
						}
						
						sumof__prior_sizeof_ICONIMAGE += imgDataArr[i].sizeof_ICONIMAGE; /*imgDataArr[i].XOR + imgDataArr[i].AND + sizeof_BITMAPHEADER;*/
					}
					
					//return buffer;
					// end - put imageDataArr to ico container, as buffer
					
					// start - save it to disk
					// note: i use here `resolveObj.OSPath` which is set in the promise_iconPrexists, for WINNT and Darwin
					// IMPORTANT TODO: if a iconsetId from profilist_data/iconsets gets deleted DELETE icon files associated with it. i discovered this in windows. it makes sense for all os though. as user may bring back the same iconsetId but with a different image/art/drawing. so just checking if path exists will return true, but the art/drawing work inside the icon is different
					var promise_writeIco = tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [path_icon, new Uint8Array(buffer), {tmpPath:path_icon+'.tmp'}], profToolkit.path_iniDir);
					promise_writeIco.then(
						function(aVal) {
							console.log('Fullfilled - promise_writeIco - ', aVal);
							// start - do stuff here - promise_writeIco
							step4();
							// end - do stuff here - promise_writeIco
						},
						function(aReason) {
							var rejObj = {name:'promise_writeIco', aReason:aReason};
							console.error('Rejected - promise_writeIco - ', rejObj);
							deferredMain_makeIcon.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_writeIco', aCaught:aCaught};
							console.error('Caught - promise_writeIco - ', rejObj);
							deferredMain_makeIcon.reject(rejObj);
						}
					);
					// end - save it to disk
				};
				
				var step4 = function() {
					// start - this is done after save to disk
					// cuz if same badge-id and channel-ref/tie-id combo existed before, it uses the old one
					var refreshIconAtPath = function() {
						var promise_refIco = ProfilistWorker.post('refreshIconAtPath', [path_icon]);
						promise_refIco.then(
							function(aVal) {
								console.log('Fullfilled - promise_refIco - ', aVal);
								// start - do stuff here - promise_refIco
								deferredMain_makeIcon.resolve(resolveObj);
								// end - do stuff here - promise_refIco
							},
							function(aReason) {
								var rejObj = {name:'promise_refIco', aReason:aReason};
								console.error('Rejected - promise_refIco - ', rejObj);
								deferredMain_makeIcon.reject(rejObj);
							}
						).catch(
							function(aCaught) {
								var rejObj = {name:'promise_refIco', aCaught:aCaught};
								console.error('Caught - promise_refIco - ', rejObj);
								deferredMain_makeIcon.reject(rejObj);
							}
						);
					}
					// end - this is done after save to disk
				};
			
			break;
		default:
			console.error('os-unsupported');
			deferredMain_makeIcon.reject('os-unsupported');
			return deferredMain_makeIcon.promise;
	}
	
	// main
	if (!doc) {
		doc = Services.appShell.hiddenDOMWindow.document;
		if (doc.readyState != 'complete') {
			doc.addEventListener('DOMContentLoaded', step0, false);
		} else {
			step1();
		}
	} else {
		step1();
	}
	
	return deferredMain_makeIcon.promise;
};

// start - helper functions for makeIcon

function getImg_of_exactOrNearest_Bigger_then_Smaller(targetSize, objOfImgs) {
	// objOfImgs should be an object with key's representing the size of the image. images are expected to be square. so size is == height == width of image
	// objOfImgs should hvae the Image() loaded in objOfImgs[k].Image
	// finds and returns the image which matches targetSize, if not found then it returns the image in objOfImgs that is immediately bigger, if nothing bigger, then returns what it is immediately smaller
	
	//objOfImgs should have key of the size of the image. the size of the img should be square. and each item should be an object of {Image:Image()}			
	var nearestDiff;
	var nearestKey;
	for (var k in objOfImgs) {
		var cDiff = k - targetSize;
		if (cDiff === 0) {
			nearestKey = k;
			nearestDiff = 0;
			break;
		} else if (nearestKey === undefined) {
			nearestKey = k;
			nearestDiff = cDiff;					
		} else if (cDiff < 0) {
			// k.Image is smaller then targetSize
			if (nearestDiff > 0) {
				// already have a key of something bigger than targetSize so dont take this to holder, as k.Image a smaller
			} else {
				// then nearestDiff in holder is something smaller then targetSize
				// take to holder if this is closer to 0 then nearestDiff
				if (cDiff - targetSize < nearestDiff - targetSize) {
					nearestDiff = cDiff;
					nearestKey = k;
				}
			}
		} else {
			// cDiff is > 0
			if (nearestDiff < 0) {
				// the current in holder is a smaller then targetSize, so lets take this one as its a bigger
				nearestDiff = cDiff;
				nearestKey = k;
			} else {
				//nearestDiff is positive, and so is cDiff // being positive means that the k.thatKey is bigger then targetSize
				//take the key of whichever is closer to target, so whichever is smaller
				if (cDiff < nearestDiff) {
					nearestDiff = cDiff;
					nearestKey = k;
				}
			}
			// bigger then targetSize takes priority so always take it, if its closer then nearestDiff in holder
			if (cDiff - targetSize < nearestDiff - targetSize) {
				nearestDiff = cDiff;
				nearestKey = k;
			}					
		}
	}
	
	console.log('the nearest found is of size: ', nearestKey, 'returning img:', objOfImgs[nearestKey].Image.toString());
	
	return objOfImgs[nearestKey].Image;
}

function loadImagePaths(arrOfOsPaths, iconsetId, doc) {
	// need to make all rejection 1st arr el be hyphenated for localization see link3632035, after clicking on badge the promise reject handles showing alert localized
	// arrOfOsPaths is os paths OR chrome:// paths
	// can provide iconsetId or arrOfOsPaths but not both, if provide iconsetId it will get the paths needed
	
	// returns promise
	// resolves to:
		// object with keys as the size of icon (aVal == { 16: {Image:HTMLImage, OSPath:os_path_loaded_from FileURI:blah} })
	// this function loads images, it rejects if
		// found icon is not square (meaning width == height) (aReason == ['non-square', osPathOfFailed])
		// image fails to load (aReason == ['load failed', osPathOfFailed])
		// if found image that has duplicate size (size was already found in obj of loadeds) (aReason == ['duplicate size', osPathOfFoundDuplicate, osPathOfImageThatHadSameSize])
		// if duplicate os path found (aReason == ['duplicate path', pathFoundThatsADupe]
		// load aborts (aReason == ['load aborted', pathOfImageThatAborted])
		// file is probably not an image (aReason == ['corrupt', pathOfErroedImg])
	
	var deferredMain_loadImagePaths = new Deferred();
	if (arrOfOsPaths && iconsetId) {
		console.error('as developer you should know not to pass both arr of paths and iconsetid, just one or the other');
		throw new Error('as developer you should know not to pass both arr of paths and iconsetid, just one or the other');
	}
	if (!doc) {
		throw new Error('doc must be provided');
	}
	
	var imgsObj = {};
	var OSPathToFileURI = {}; //keys are ospath, values are fileuri
	var FileURIToOSPath = {};
	
	if (iconsetId) {
		var iconsetPaths = getPathsInIconset(iconsetId); // because i dont do liveFetch here, i dont have to code in this loadImagePaths function to check if iconset is corrupt, as in missing an image or something, as if it is mising it will go to onerror
		arrOfOsPaths = [];
		for (var k in iconsetPaths) {
			arrOfOsPaths.push(iconsetPaths[k].OSPath);
			FileURIToOSPath[iconsetPaths[k].FileURI] = iconsetPaths[k].OSPath;
			OSPathToFileURI[iconsetPaths[k].OSPath] = iconsetPaths[k].FileURI;
		}
	} else {
		for (var i=0; i<arrOfOsPaths.length; i++) {
			if (arrOfOsPaths[i] in OSPathToFileURI) {
				deferredMain_loadImagePaths.reject([
					'duplicate-path',
					arrOfOsPaths[i]
				]);
				return deferredMain_loadImagePaths.promise;
			} else {
				if (arrOfOsPaths[i].substr(0, 9) == 'chrome://') {
					OSPathToFileURI[arrOfOsPaths[i]] = arrOfOsPaths[i];
				} else {
					OSPathToFileURI[arrOfOsPaths[i]] = OS.Path.toFileURI(arrOfOsPaths[i]);
				}
				FileURIToOSPath[OSPathToFileURI[arrOfOsPaths[i]]] = arrOfOsPaths[i];					
			}
		}
	}
	//console.info('OSPathToFileURI:', OSPathToFileURI);
	//console.info('FileURIToOSPath:', FileURIToOSPath);
	
	var promiseAllArr_loadImgs = [];
	
	var handleImgLoad = function(refDeferred) {
		var theImg = this;
		//console.log('Success on load of path: "' + theImg.src + '"');
		if (theImg.naturalHeight != theImg.naturalWidth) {
			console.warn('Unsquare image on path: "' + theImg.src + '"');
			refDeferred.reject('Unsquare image on paths: "' + theImg.src + '"');
			deferredMain_loadImagePaths.reject([
				'non-square',
				theImg.naturalHeight,	
				theImg.naturalWidth,
				FileURIToOSPath[theImg.src]
			]);
		} else if (theImg.naturalHeight in imgsObj) {
			console.warn('Multiple images with same size on path: "' + theImg.src + '"');
			refDeferred.reject('Multiple images with same size on path: "' + theImg.src + '"');
			deferredMain_loadImagePaths.reject([
				'duplicate-size',
				FileURIToOSPath[theImg.src],
				imgsObj[theImg.naturalHeight].OSPath
			]);
		} else {
			imgsObj[theImg.naturalHeight] = {
				Image:theImg,
				OSPath: FileURIToOSPath[theImg.src],
				FileURI: theImg.src
			};
			refDeferred.resolve('Success on load of path: "' + theImg.src + '"');
		}
	};
	
	var handleImgAbort = function(refDeferred) {
		var theImg = this;
		console.warn('Abortion on load of path: "' + theImg.src + '"');
		refDeferred.reject('Abortion on load of path: "' + theImg.src + '"');
		deferredMain_loadImagePaths.reject([
			'load-aborted',
			FileURIToOSPath[theImg.src]
		]);
	};
	
	var handleImgError = function(refDeferred) {
		//if (['esr','release','beta','aurora','dev','nightly'].indexOf(iconsetId) > -1 && theImg.src == OSPathToFileURI[theImg.src] /* this check tells me they are chrome paths, as when chrome paths, then OSPath is same as FileURI*/) {
		var theImg = this;
		console.warn('Error on load of path: "' + theImg.src + '"');
		refDeferred.reject('Error on load of path: "' + theImg.src + '"');
		deferredMain_loadImagePaths.reject([
			'corrupt-img', // or `img-dne`
			FileURIToOSPath[theImg.src]
		]);
	};
	
	for (var i=0; i<arrOfOsPaths.length; i++) {
		var deferred_loadImg = new Deferred();
		promiseAllArr_loadImgs.push(deferred_loadImg.promise);
		
		var img = new doc.defaultView.Image();
		img.onload = handleImgLoad.bind(img, deferred_loadImg);
		img.onabort = handleImgAbort.bind(img, deferred_loadImg);
		img.onerror = handleImgError.bind(img, deferred_loadImg);
		
		//console.info('arrOfOsPaths[i]:', arrOfOsPaths[i]);
		if (arrOfOsPaths[i].substr(0, 9) == 'chrome://') {
			//console.info('img.src is chrome path so use as is:', arrOfOsPaths[i]);
			img.src = arrOfOsPaths[i];
		} else {
			//console.info('img.src was os path so making file uri:', OSPathToFileURI[arrOfOsPaths[i]]);
			img.src = OSPathToFileURI[arrOfOsPaths[i]];
		}
	}
	
	//console.info('paths_concatenated:', paths_concatenated);
	//console.info('deferreds_loadImgs:', deferreds_loadImgs);
	
	var promiseAll_loadImgs = Promise.all(promiseAllArr_loadImgs);
	promiseAll_loadImgs.then(
		function(aVal) {
			console.log('Fullfilled - promiseAll_loadImgs - ', aVal);
			// start - do stuff here - promiseAll_loadImgs
			deferredMain_loadImagePaths.resolve(imgsObj);
			// end - do stuff here - promiseAll_loadImgs
		},
		function(aReason) {
			var rejObj = {name:'promiseAll_loadImgs', aReason:aReason};
			console.error('Rejected - promiseAll_loadImgs - ', rejObj);
			//deferredMain_loadImagePaths.reject(rejObj);
			// i dont reject main here because i plan to make the individual promise in promiseAllArr_loadImgs to have a .then and its reject should reject main
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promiseAll_loadImgs', aCaught:aCaught};
			console.error('Caught - promiseAll_loadImgs - ', rejObj);
			deferredMain_loadImagePaths.reject(rejObj);
		}
	);
		
	return deferredMain_loadImagePaths.promise;
}
// end - helper functions for makeIcon

// start - a helper
function getIniKeyOfProfileName(aProfileName) {
	// returns string on success
	// returns null if key not found
	
	// case sensitive
	//var aProfileNameLOWER = aProfileName.toLowerCase();
	for (var k in ini) {
		if ('num' in ini[k] && ini[k].props.Name == aProfileName) {
			return k;
		}
	}
	
	return null; // key not found
}
// end - a helper
// start - pickerIconset
function pickerIconset(tWin) {
	// need to make all rejection 1st arr el be hyphenated for localization see link3632035, after clicking on badge the promise reject handles showing alert localized
	// returns promise
		// on success resolves with object of fileURI paths and also OS paths and .Image (which is HTMLCanvasElement or HTMLImageElement) with key as size of image (if not selected from profilist_data/iconsets/ then it also has the images)
		// on reject, string message indicating reason of failure, so far: `os-unsupported`, `canceled picker`, `no files selected in picker`
		
	// these iconsets can be used for base OR badge
	// makes the target window (tWin) modal during this time
	// this function tells users the icon sizes needed for an iconset per their os
	// they can multi pick sizes
	// the common name is taken from the files picked, if its a number, then i take the folder name, then i check if this a folder with this name exists in profilist_data/iconsets/ if it does then i append `-#` until i find one available
	// if they pick an icon images that are in profilist_data/iconsets/ then i dont copy, but just return all images from that folder
	// , whatever sizes are not picked, are resized and saved as with append to file name `-AutoScaled`
	// the sized images are copied to profilist_data folder
	var deferredMain_pickerIconset = new Deferred();
	
	// start - define callbacks
	// start - globals for callbacks
	var iconsetId; //string
	var path_iconsetDir; //string - os path
	
	var path_selectedIcons = []; //array of strings - os path
	var data_selectedIcons = []; //populated by doLoadImages
	var nsifiles_selectedIcons = []; //array of nsIFile'sIniKey
	var loaded_imgObj = {}; //populated by doLoadImages
	
	var iconSizesNeeded;
	var collection_selectedImagesAndPaths = {}; //colllection obj, keys are size of images, holds .Image as new Image(), .OSPath and .FileURI
	
	// end - globals for callbacks
	// start - setup writeBlob
	var writeBlobCallback = function(path_to_save_at, refDeferred, blob) {
        var reader = Cc['@mozilla.org/files/filereader;1'].createInstance(Ci.nsIDOMFileReader); //new FileReader();
        reader.onloadend = function() {
            // reader.result contains the ArrayBuffer.			
			var arrview = new Uint8Array(reader.result);
			
			var promise_writeArrView = tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [path_to_save_at, arrview, {tmpPath:path_to_save_at+'.tmp'}], profToolkit.path_iniDir);

			promise_writeArrView.then(
				function(aVal) {
					console.log('Fullfilled - promiseAllArr_writePngs - ', aVal);
					// start - do stuff here - promiseAllArr_writePngs
					refDeferred.resolve('Saved blob to png: "' + OS.Path.basename(path_to_save_at) + '"');
					// end - do stuff here - promiseAllArr_writePngs
				},
				function(aReason) {
					var rejObj = {name:'promiseAllArr_writePngs.promise', aReason:aReason};
					console.error('Rejected - promiseAllArr_writePngs - ', rejObj);
					refDeferred.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promiseAllArr_writePngs', aCaught:aCaught};
					console.error('Caught - promiseAllArr_writePngs - ', rejObj);
					refDeferred.reject(rejObj);
				}
			);
        };
		reader.onabort = function() {
			refDeferred.reject('Abortion on nsIDOMFileReader, failed reading blob for saving: "' + OS.Path.basename(path_to_save_at) + '"');
		};
		reader.onerror = function() {
			refDeferred.reject('Error on nsIDOMFileReader, failed reading blob for saving: "' + OS.Path.basename(path_to_save_at) + '"');
		};
        reader.readAsArrayBuffer(blob);
	};
	// end - setup writeBlob
	
	// start - scaleAndWrite
	var scaleAndWrite = function() {
		// goes through images loaded
			// if it finds a size thats needed, it (DOES NOT COPY IT, as it may not be .png), it draws it and writes it
			// if it doesnt find a size thats needed, it finds the next biggest size and scales it down then starts write
		/////////////
		var promiseAllArr_scaleAndWriteAll = [];
		//var destPathBase = OS.Path.join(profToolkit.path_iconsetDir, iconsetId, 'iconsetId-');
		var collection_drawnImagesAndPaths = getPathsInIconset(iconsetId);
		console.info('collection_drawnImagesAndPaths:', collection_drawnImagesAndPaths);
		
		for (var i=0; i<iconSizesNeeded.length; i++) {
			var canvas = Services.appShell.hiddenDOMWindow.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			var ctx = canvas.getContext('2d');
			canvas.width = iconSizesNeeded[i];
			canvas.height = iconSizesNeeded[i];
			//ctx.clearRect(0, 0, iconSizesNeeded[i], iconSizesNeeded[i]);
			
			var destPath = collection_drawnImagesAndPaths[iconSizesNeeded[i]].OSPath; //destPathBase + iconSizesNeeded[i] + '.png';
			
			var nearestImg = getImg_of_exactOrNearest_Bigger_then_Smaller(iconSizesNeeded[i], collection_selectedImagesAndPaths);
			if (nearestImg.naturalHeight == iconSizesNeeded[i]) {
				console.log('nearest found is exact of required size, so no need for scalling. just OS.File.copy this image. required size:', iconSizesNeeded[i], 'nearest size:', nearestImg.naturalHeight);
				//promiseAllArr_scaleAndWriteAll.push(tryOsFile_ifDirsNoExistMakeThenRetry('copy', [fileUri_to_platformPath[nearestImg.src], destPath, {tmpPath:destPath+'.tmp', encoding:'utf-8'}], fromPathBase));
				// i dont do the copy anymore, as the file may not be a png, we want to draw and save it as a png
				ctx.drawImage(nearestImg, 0, 0);
				collection_drawnImagesAndPaths.Image = collection_selectedImagesAndPaths[iconSizesNeeded[i]].Image;
			} else {
				console.log('nearest found is not exact of required size, so scalling. required size:', iconSizesNeeded[i], 'nearest size:', nearestImg.naturalHeight);
				ctx.drawImage(nearestImg, 0, 0, iconSizesNeeded[i], iconSizesNeeded[i]);
				collection_drawnImagesAndPaths.Image = canvas;
				// note: .Image has to be something that can be drawing with ctx.drawImage, i usually set it to HTMLImageElement, but here i set it to HTMLCanvasElement, which also works
				//msgsToUser.push('Exact match for size of ' + iconSizesNeeded[i] + ' was not available among files you selected, therefore the image for this size was scaled from "' + OS.Path.basename(fileUri_to_platformPath[nearestImg.src]) + '" which was had a size of ' + nearestImg.naturalHeight + 'px');
			}			
			var deferred_blobAndWriteScaled = new Deferred();
			promiseAllArr_scaleAndWriteAll.push(deferred_blobAndWriteScaled.promise);
			(canvas.toBlobHD || canvas.toBlob).call(canvas, writeBlobCallback.bind(null, destPath, deferred_blobAndWriteScaled), 'image/png');						
		}
		
		var promiseAll_scaleAndWriteAll = Promise.all(promiseAllArr_scaleAndWriteAll);
		promiseAll_scaleAndWriteAll.then(
			function(aVal) {
				console.log('Fullfilled - promiseAll_scaleAndWriteAll - ', aVal);
				// start - do stuff here - promiseAll_scaleAndWriteAll
				//msgsToUser.splice(0, 0, 'Successfully created iconset of this badge!\n');
				deferredMain_pickerIconset.resolve(collection_drawnImagesAndPaths);
				// end - do stuff here - promiseAll_scaleAndWriteAll
			},
			function(aReason) {
				var rejObj = {name:'promiseAll_scaleAndWriteAll', aReason:aReason};
				console.error('Rejected - promiseAll_scaleAndWriteAll - ', rejObj);
				deferredMain_pickerIconset.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promiseAll_scaleAndWriteAll', aCaught:aCaught};
				console.error('Caught - promiseAll_scaleAndWriteAll - ', rejObj);
				deferredMain_pickerIconset.reject(rejObj);
			}
		);
		//////////////
	};
	// end - scaleAndWrite
	// start - ensureNameAvailable
	var ensureNameAvailable = function() {
		// goes through all folders in profilist_data/iconset/ and checks if name is available, if its not it will append `-#` until it finds one available
		// once finds availabie it makes the dir
		// on success goes to copy_or_writeIfScaled
		// rejects main on promise catch or promise rejected due to something other then becauseExists

		if (['esr', 'release', 'beta', 'aurora', 'dev', 'nightly', 'default'].indexOf(iconsetId) > -1) {
			//check if its a reserved word
			iconsetId += '-1';
		}
		path_iconsetDir = OS.Path.join(profToolkit.path_profilistData_iconsets, iconsetId);
		
		var promise_makeIconsetDir = tryOsFile_ifDirsNoExistMakeThenRetry('makeDir', [path_iconsetDir, {ignoreExisting:false}], profToolkit.path_iniDir);
		promise_makeIconsetDir.then(
			function(aVal) {
				console.log('Fullfilled - promise_makeIconsetDir - ', aVal);
				// start - do stuff here - promise_makeIconsetDir
				scaleAndWrite();
				// end - do stuff here - promise_makeIconsetDir
			},
			function(aReason) {
				var deepestReason = aReasonMax(aReason);
				if (/*aReason.aReason.becauseExists*/deepestReason.becauseExists) {
					// append and/or increment `-#`
					var matchTest = iconsetId.match(/(.*)-(\d)$/m);
					if (matchTest) {
						iconsetId = matchTest[1] + repCharForSafePath + (parseInt(matchTest[2]) + 1);
					} else {
						iconsetId += '-1';
					}
					ensureNameAvailable();
				} else {
					var rejObj = {name:'promise_makeIconsetDir', aReason:aReason};
					console.error('Rejected - promise_makeIconsetDir - ', rejObj);
					deferredMain_pickerIconset.reject(rejObj);
				}
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_makeIconsetDir', aCaught:aCaught};
				console.error('Caught - promise_makeIconsetDir - ', rejObj);
				deferredMain_pickerIconset.reject(rejObj);
			}
		);
	};
	// end - ensureNameAvailable
	
	// start - doLoadImages
	var doLoadImages = function(selectedFromProfilistDataDir) {
		// loads all images and determines sizes available
		// if selectedFromProfilistDataDir is false, it then determines a common name from the file names selected
		// saves to dir
		// rejects main
			// if any of the files failed to load, telling the user
			// if any of the loaded images is not square (width == height)
			// if duplicate size found, then it rejects telling user
		// on success - sends to:
			// if selectedFromProfilistDataDir is true, then resolves main with file paths and sizes
			// if selectedFromProfilistDataDir is false, then sends to ensureNameAvailable
			
		var promise_doImgLoads = loadImagePaths(path_selectedIcons, null, tWin.document);
		promise_doImgLoads.then(
			function(aVal) {
				console.log('Fullfilled - promise_doImgLoads - ', aVal);
				// start - do stuff here - promise_doImgLoads
				loaded_imgObj = aVal;
				if (selectedFromProfilistDataDir) {
					// then resolves main with file paths and sizes
					//Services.prompt.alert(tWin, 'profilist', 'img loading complete, resolve as from data dir');
					// user may not have selected all the icons in the dir
					var collection_selectedPathsInIconset = getPathsInIconset(iconsetId);
					// should i put .Image into collection_selectedPathsInIconset, i think i should, take whatever .Image from selected is available. then load the remaining, in case user did not select all of the images from the profilist-data/iconsets/iconsetId/ folder
					var keysInCollSeldPathsInIconset_missingImage = {};
					for (var imgSizeInIconset in collection_selectedPathsInIconset) {
						keysInCollSeldPathsInIconset_missingImage[imgSizeInIconset] = 1;
					}
					var sizesSelected = [];
					for (var imgSize in aVal) {
						if (imgSize in collection_selectedPathsInIconset) {
							collection_selectedPathsInIconset[imgSize].Image = aVal[imgSize].Image;
							delete keysInCollSeldPathsInIconset_missingImage[imgSize];
							sizesSelected.push(imgSize);
						}
					}
					var sizesInIconsetNeedingImage = Object.keys(keysInCollSeldPathsInIconset_missingImage);
					if (sizesInIconsetNeedingImage.length > 0) {
						deferredMain_pickerIconset.reject([
							'datadir-incomplete-sel',
							sizesSelected.join('px, ') + 'px',
							sizesInIconsetNeedingImage.join('px, ') + 'px'
						]);
					} else {
						deferredMain_pickerIconset.resolve(collection_selectedPathsInIconset);
					}
				} else {
					// determine a common name from the file names selected
					//Services.prompt.alert(tWin, 'profilist', 'img loading complete, find common name then send to ensureNameAvailable');
						
					// start - determine common name part
					var patt_winSafe = /([\\*:?<>|\/\"])/g;
					var patt_trimLeadingTrailingNonWord = /\w.*\w/;
					var leafNames = {};
					for (var size in loaded_imgObj) {
						var thisLeafName = OS.Path.basename(loaded_imgObj[size].OSPath);
						thisLeafName = thisLeafName.substr(0, thisLeafName.lastIndexOf('.'));
						thisLeafName = thisLeafName.replace(new RegExp(size, 'g'), '');
						thisLeafName = getSafedForOSPath(thisLeafName); //note: possible issue, i should replace special chars, as in mac and nix can use all chars, but in windows it cant, so this reduces portability, but replacing \W should fix this // use this `.replace(/([\\*:?<>|\/\"])/g, repCharForSafePath)` to make windows file name safe// make windows safe
						thisLeafName = patt_trimLeadingTrailingNonWord.exec(thisLeafName);// trim trailing and leading non word characters

						if (thisLeafName === null) { continue } // its null if thisLeafName pre exec was empty string, or a string of all non word characters
						leafNames[thisLeafName[0]] = 0;
					}
					var leafNames = Object.keys(leafNames);
					console.info('leafNames:', leafNames);
					
					var longestCommonSubstring = longestInCommon(leafNames);
					console.info('longestCommonSubstring:', longestCommonSubstring);
					
					if (longestCommonSubstring.length > 1) { // i want at least 2 characters for name
						iconsetId = longestCommonSubstring;
					} else {
						//set iconetsetId to the folder name
						iconsetId = nsifiles_selectedIcons[0].parent.leafName; //note:assuming all image multi selected image files have to come from same folder
					}
					
					console.info('common name determined:', iconsetId);
					// start - determine common name part
					
					collection_selectedImagesAndPaths = aVal;
					// then sends to ensureNameAvailable
					ensureNameAvailable();
				}
				// end - do stuff here - promise_doImgLoads
			},
			function(aReason) {
				var rejObj = {name:'promise_doImgLoads', aReason:aReason};
				console.error('Rejected - promise_doImgLoads - ', rejObj);
				deferredMain_pickerIconset.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_doImgLoads', aCaught:aCaught};
				console.error('Caught - promise_doImgLoads - ', rejObj);
				deferredMain_pickerIconset.reject(rejObj);
			}
		);
	};
	// end - doLoadImages

	// start - doPicker
	var doPicker = function() {
		// shows picker, tell them about the process
		// success
			// sends to doLoadImages which THEN will find a common name if icons not picked from a directory in path_profilistData_iconsets
			// if icons were picked from a directory in path_profilistData_iconsets then sends to doLoadImages(true) to find out sizes, i shouldnt rely on file name as users may edit (even though i warn them not to)
		// rejects main if cancelled or no files selected
		
		var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		fp.init(tWin, myServices.sb.GetStringFromName('iconset-picker-title'), Ci.nsIFilePicker.modeOpenMultiple);
		fp.appendFilters(Ci.nsIFilePicker.filterImages);

		var startDir = Services.dirsvc.get('UAppData', Ci.nsIFile); // same as OS.Constants.Path.userApplicationDataDir
		startDir.append('profilist_data');
		startDir.append('iconsets'); //OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'iconsets');
		//console.log('the path:', startDir.path, startDir.exists());
		fp.displayDirectory = startDir;

		var rv = fp.show();
		if (rv == Ci.nsIFilePicker.returnOK) {
			
			var files = fp.files;
			//console.log('files:', files);
			
			while (files.hasMoreElements()) {
				var aFile = files.getNext().QueryInterface(Ci.nsIFile);
				//console.log('aFile:', aFile.path);

				nsifiles_selectedIcons.push(aFile);
				path_selectedIcons.push(aFile.path); //aFile.path are OS paths
			}
			
			if (path_selectedIcons.length == 0) {
				deferredMain_pickerIconset.reject('no-files-selected');
				return; // to stop deeper execution
			}
			
			// test to see if they selected icons from profilistData dir
			// assuming if first path contains path_profilistData_iconsets then rest are same, as multi select can only happen from one directory im pretty sure
			var normalized_dataDirPath = OS.Path.normalize(profToolkit.path_profilistData_iconsets).toLowerCase();
			var normalized_selectedIconPath = OS.Path.normalize(path_selectedIcons[0]).toLowerCase();
			if (normalized_selectedIconPath.indexOf(normalized_dataDirPath) > -1) {
				iconsetId = OS.Path.basename(nsifiles_selectedIcons[0].parent.path);
				console.info('from profilistData iconsetId:', iconsetId);
				doLoadImages(true);
			} else {				
				doLoadImages();
			}
		} else {
			deferredMain_pickerIconset.reject('canceled picker'); // no need for hyphen here, can use space, as there is no localization for this
		}
	};
	// end - doPicker
	
	// start - doInform
	var doInform = function() {		
		switch (cOS) {
			case 'winnt':
				var title = myServices.sb.GetStringFromName('inform-iconset-title');
				var msg = myServices.sb.GetStringFromName('inform-iconset-txt-win');
				break;
			
			case 'linux':
				var title = myServices.sb.GetStringFromName('inform-iconset-title');
				var msg = myServices.sb.GetStringFromName('inform-iconset-txt-linux');
				break;
			
			case 'darwin':
				var title = myServices.sb.GetStringFromName('inform-iconset-title');
				var msg = myServices.sb.GetStringFromName('inform-iconset-txt-mac');
				break;
				
			default:
				deferredMain_pickerIconset.reject(['os-unsupported', cOS]);
				return;
		}
		
		iconSizesNeeded = iconsetSizes_Profilist[cOS];
		Services.prompt.alert(tWin, title, msg);
		doPicker();
	};
	// end - doInform
	// end - define callbacks
	
	// start - main
	doInform();
	// end - main
	
	return deferredMain_pickerIconset.promise;
}
// end - pickerIconset

// start - makeIcon
// end - makeIcon

function getIniKeyFromProfName(aProfName) {
	// case sensitive
	
	for (var p in ini) {
		if ('num' in ini[p]) {
			// its a profile
			if (ini[p].props.Name == aProfName) {
				return p;
			}
		}
	}
	
	throw new Error('could not find inikey of prof with name "' + aProfName +'"');
}

/* start - control panel server/client communication */
const subDataSplitter = ':~:~:~:'; //note: must match splitter const used in client //used if observer from cp-server wants to send a subTopic and subData, as i cant use subject in notifyObserver, which sucks, my other option is to register on a bunch of topics like `profilist.` but i dont want to 

var addonListener = {
  onPropertyChanged: function(addon, properties) {
	//console.log('props changed on addon:', addon.id, 'properties:', properties);
	if (addon.id == core.id) {
	  if (properties.indexOf('applyBackgroundUpdates') > -1){
		//updateOptionTabsDOM('autoupdate', addon.applyBackgroundUpdates);
		cpCommPostMsg(['pref-to-dom', 'autoupdate', addon.applyBackgroundUpdates].join(subDataSplitter));
	  }
	}
  }
};

var listenersForClientsEnabled = false;

function enableListenerForClients() {
	if (!listenersForClientsEnabled) {
		listenersForClientsEnabled = true;
		AddonManager.addAddonListener(addonListener);
	} else {
		console.log('enableListenerForClients was called but listeners are ALREADY ENABLED so do nothing');
	}
}

function disableListenerForClients() {
	if (listenersForClientsEnabled) {
		listenersForClientsEnabled = false;
		console.log('addon props listener removed');
		AddonManager.removeAddonListener(addonListener);
	} else {
		console.log('disableListenerForClients was called but listeners ALREADY DISABLED so do nothing');
	}
}
/* start - generic not specific for profilist cp comm*/
var noResponseCbsObj = {};
const suitableAmountOfTimeToWaitBeforeDeclareNoResponse = 1000; //1sec //amount of time to wait before deciding no response received
var noResponseActiveTimers = {};
function queryClients_doCb_basedOnIfResponse(cb_onResponse, cb_onNone, timerName, cb_onCancel) {
	//added timerName so can cancel
	if (!timerName) {
		throw new Error('timerName not provided!');
	}
	if (timerName in noResponseActiveTimers) {
		throw new Error('timerName of "' + timerName + '" is already active so will not start this queryClients_doCb_basedOnIfResponse');
		return false;
	} else {
		noResponseActiveTimers[timerName] = {};
		noResponseActiveTimers[timerName].timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer)
	}
	//var timer_NoResponse = noResponseActiveTimers[timerName];
	var timer_event_NOResponse = {
		notify: function(timer) {
			console.log('ABSOLUTELY NO response for cb based on resp');
			cb_onNone();
			delete noResponseActiveTimers[timerName];
			delete noResponseCbsObj[onResponseSubTopic];
		}
	};
	var onResponseSubTopic = Math.random();
	while (onResponseSubTopic in noResponseCbsObj) {
		console.log('generated onResponseSubTopic of ', onResponseSubTopic, 'in noResponseCbsObj so gen again');
		onResponseSubTopic = Math.random();
	}
	
	noResponseActiveTimers[timerName].cancel = function() {
		noResponseActiveTimers[timerName].timer.cancel();
		console.warn('CANCELED timerName', timerName, ' was canceled');
		delete noResponseCbsObj[onResponseSubTopic];
		if (cb_onCancel) {
			cb_onCancel();
		}
		delete noResponseActiveTimers[timerName];
	}
	
	noResponseCbsObj[onResponseSubTopic] = function(subData) {
		console.log('RESPONSE RECEIVED for cb based on resp');
		noResponseActiveTimers[timerName].timer.cancel();
		delete noResponseActiveTimers[timerName];
		delete noResponseCbsObj[onResponseSubTopic];
		cb_onResponse();
	}
	
	noResponseActiveTimers[timerName].timer.initWithCallback(timer_event_NOResponse, suitableAmountOfTimeToWaitBeforeDeclareNoResponse, Ci.nsITimer.TYPE_ONE_SHOT);
	cpCommPostMsg(['queryClients_doCb_basedOnIfResponse', onResponseSubTopic].join(subDataSplitter));
}
/***************** how to use
console.time('rawr');
queryClients_doCb_basedOnIfResponse(
  function onResponse() {
    console.timeEnd('rawr');
    alert('SOMETHINGS ALIVE');
  },
  function onNoResp(){
	console.timeEnd('rawr');
    alert('all dead');
  },
  'must_provide_a_timer_name', //used for cancelling
  cb_onCancel //this is optional
);
******************/
/* end - generic not specific for profilist cp comm*/
function onResponseEnsureEnabledElseDisabled() {
	queryClients_doCb_basedOnIfResponse(
	  function onResponse() {
		enableListenerForClients();
	  },
	  function onNoResp(){
		disableListenerForClients();
	  },
	  'onResponseEnsureEnabledElseDisabled'
	);
}

function cpCommPostMsg(msg) {
	console.info('"profilist-cp-server" broadcasting message to "profilist-cp-client\'s"', 'msg:', msg);
	Services.obs.notifyObservers(null, /*'msg-from---profilist-cp-server'*/'profilist-cp-server', msg);
}

function cpCommPostJson(topic, msgJson) {
	// server side cpCommPostJson
	msgJson.msgJson = 1;
	console.info('"profilist-cp-server" broadcasting message to "profilist-cp-client\'s"', 'msgJson:', msgJson);
	Services.obs.notifyObservers(null, /*'msg-from---profilist-cp-server'*/'profilist-cp-server', [topic, JSON.stringify(msgJson)].join(subDataSplitter));
}

function cpClientListener(aSubject, aTopic, aData) {
	console.info('incoming message to server from "profilist-cp-client"', 's', aSubject, 't', aTopic, 'd', aData);
	var aDataSplit = aData.split(subDataSplitter);
	if (aDataSplit.length == 1) {
		var subTopic = aData;
		var subData = aData;
	} else if (aDataSplit.length == 2) {
		var subTopic = aDataSplit[0];
		var subData = aDataSplit[1];
		if (subData.indexOf('msgJson') > -1) {
			var incomingJson = JSON.parse(subData);
			console.info('incomingJson for subTopic:', subTopic, 'json:', incomingJson);
		}
	} else {
		var subTopic = aDataSplit[0];
		//var subData = subDataSplitter + 'ARRAY';
		var subDataArr = aDataSplit.slice(1);
	}
	
	switch (subTopic) {
		/*start - generic not specific to profilist cp comm*/
		case 'responseClients_doCb_basedOnIfResponse': //not profilist specific, i can do the reverse of this for clients to test if server is alive, but as of 082914 522p i didnt have a need for it so didnt make one
			if (subData in noResponseCbsObj) {
				noResponseCbsObj[subData]();
			} else {
				console.warn('subData not found in noResponseCbsObj and this is probably because there were multiple clients open, and on first response the function was deleted');
			}
			break;
		/*end - generic not specific to profilist cp comm*/
		case 'query-make-desktop-shortcut':
		
				var promise_makeRequestedCut = makeDeskCut(incomingJson.key_in_ini);
				promise_makeRequestedCut.then(
					function(aVal) {
						console.log('Fullfilled - promise_makeRequestedCut - ', aVal);
						// start - do stuff here - promise_makeRequestedCut
						var responseJson = {
							clientId: incomingJson.clientId,
							status: 1
						};
						cpCommPostJson('response-make-desktop-shortcut', responseJson);
						// end - do stuff here - promise_makeRequestedCut
					},
					function(aReason) {
						var rejObj = {name:'promise_makeRequestedCut', aReason:aReason};
						console.error('Rejected - promise_makeRequestedCut - ', rejObj);
						var deepestReason = aReasonMax(aReason);
						var responseJson = {
							clientId: incomingJson.clientId,
							status: 0,
							explanation: deepestReason
						};
						cpCommPostJson('response-make-desktop-shortcut', responseJson);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promise_makeRequestedCut', aCaught:aCaught};
						console.error('Caught - promise_makeRequestedCut - ', rejObj);
						var deepestReason = aReasonMax(aCaught);
						var responseJson = {
							clientId: incomingJson.clientId,
							status: 0,
							explanation: deepestReason
						};
						cpCommPostJson('response-make-desktop-shortcut', responseJson);
					}
				);
				
			break;
		case 'query-client-born':
			if ('client-closing-if-i-no-other-clients-then-shutdown-listeners' in noResponseActiveTimers) {
				noResponseActiveTimers['client-closing-if-i-no-other-clients-then-shutdown-listeners'].cancel();
			}
			enableListenerForClients();
			var promise = readIniAndParseObjs();
			promise.then(
				function() {
					//console.log('now that ini read it will now send notification to clientid with name = ' + profName);
					var clientId = subData;
					var writeToIni = false;
					for (var pref_name_in_obj in myPrefListener.watchBranches[myPrefBranch].prefNames) {
						//make sure pref is in ini
						//make sure pref in tree is that of ini
						console.log('making sure pref of', pref_name_in_obj, 'is in ini and then IF IT IS IN INI then will make sure the tree val matches that of ini val');
						var pref_name_in_ini = 'Profilist.' + pref_name_in_obj;
						var prefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj];
						if (pref_name_in_ini in ini.General.props) {
							var pref_val_in_ini = ini.General.props[pref_name_in_ini];
							if (prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
								if (typeof(pref_val_in_ini) != 'boolean') {
								  if (pref_val_in_ini == 'false') {
									pref_val_in_ini = false;
								  } else if (pref_val_in_ini == 'true') {
									pref_val_in_ini = true;
								  } else {
									throw new Error('not a boolean pref_val_in_ini == "' + pref_val_in_ini + '"');
								  }
								}
							}
							if (prefObj.value != pref_val_in_ini) {
								prefObj.setval(pref_val_in_ini, true); //skipping on change because we are reading ini to pref tree here, meaning we just read ini, even though the onprefchange will see that the ini val is same as newVal so it wont write anyways
							}
						} else {
							//not in ini
							ini.General.props[pref_name_in_ini] = prefObj.value;
							writeToIni = true;
						}
					}
					console.error('sending profToolkit of:', profToolkit);
					var responseJson = {
						clientId: clientId,
						ini: ini,
						transObj: { // transferObj
							profToolkit: profToolkit,
							core: core
						}
					};
					//Services.obs.notifyObservers(null, 'profilist-cp-server', ['response-client-born', JSON.stringify(responseJson)].join(subDataSplitter));
					cpCommPostMsg(['response-client-born', JSON.stringify(responseJson)].join(subDataSplitter));
					if (writeToIni) {
						var promise2 = writeIni();
						promise2.then(
							function() {
								console.log('succesfully wrote ini for storing new prefs');
							},
							function() {
								console.error('FAILED to write ini to store new prefs, no big though i think as it will just use the default values in ini obj in runtime');
							}
						);
					}
				},
				function(aRejectReason) {
					throw new Error('Failed to read ini on query-client-born for reason: ' + aRejectReason);
				}
			);
			break;
		case 'read-ini-to-tree':
			//start - make sure prefs on tree are what is pref values in ini
			//and if any pref-on-tree is not found in ini then write to ini and send message from server (to clients) to update dom value and their ini objects
			Services.obs.notifyObservers(null, 'profilist-cp-client', 'read-ini-to-tree'); //note: 022415 is this needed?
			var prefNames = myPrefListener.watchBranches[myPrefBranch].prefNames;
			var writeIniForNewPrefs = false;
			for (var pref_name_in_obj in prefNames) {
				var prefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj];
				var pref_name_in_ini = 'Profilist.' + pref_name_in_obj;
				if (pref_name_in_ini in ini.General.props) {
					var value_in_ini = ini.General.props[pref_name_in_ini];
					if (prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
						//value_in_ini = value_in_ini == 'false' ? false : true;
						if (typeof(value_in_ini) != 'boolean') {
						  if (value_in_ini == 'false') {
							value_in_ini = false;
						  } else if (value_in_ini == 'true') {
							value_in_ini = true;
						  } else {
							throw new Error('not a boolean');
						  }
						}
					}
					if (prefObj.value != value_in_ini) {
						console.log('value of pref_name_in_ini in tree does not equal that of in ini so update tree to value of ini');
						console.log('value_in_ini:', value_in_ini);
						console.log('value_in_tree:', prefObj.value);
						prefObj.setval(value_in_ini, false);
						console.log('setval done');
					} else {
						console.log('ini and tree values match on pref_name:', pref_name_in_obj, prefObj.value, value_in_ini);
					}
				} else {
					ini.General.props[pref_name_in_ini] = prefObj.value;
					writeIniForNewPrefs = true;
					console.log('pref_name_in_ini of ', pref_name_in_ini, ' is not in ini so using prefObj.value of ', prefObj.value, ' and set it in the ini obj and bool marked for writing ini', 'ini.General:', ini.General);
					//Services.obs.notifyObservers(null, 'profilist-cp-server', ['pref-to-dom', pref_name, prefObj.value].join(subDataSplitter));
					cpCommPostMsg(['pref-to-dom', pref_name, prefObj.value].join(subDataSplitter));
				}
			}
			if (writeIniForNewPrefs) {
				var promise89 = writeIni();
				promise89.then(
					function() {
						console.log('succesfully wrote ini for storing new prefs');
					},
					function() {
						console.error('FAILED to write ini to store new prefs, no big though i think as it will just use the default values in ini obj in runtime');
					}
				);
			}
			break;
		case 'client-closing-if-i-no-other-clients-then-shutdown-listeners':
			//ifClientsAliveEnsure_thenEnsureListenersAlive();
			queryClients_doCb_basedOnIfResponse(
			  function onResponse() {
				enableListenerForClients();
			  },
			  function onNoResp(){
				disableListenerForClients();
			  },
			  'client-closing-if-i-no-other-clients-then-shutdown-listeners'
			);
			break;
		case 'update-pref-so-ini-too-with-user-setting':
			var pref_name = subDataArr[0];
			var user_set_val = subDataArr[1];
			if (!(pref_name in myPrefListener.watchBranches[myPrefBranch].prefNames)) {
				throw new Error('pref_name of ' + pref_name + ' not found in myPrefListener watchedBranches');
				return;
			}
			var prefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name];
			if (prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
				if (typeof(user_set_val) != 'boolean') {
				  if (user_set_val == 'false') {
					user_set_val = false;
				  } else if (user_set_val == 'true') {
					user_set_val = true;
				  } else {
					throw new Error('not a boolean');
				  }
				}
			}			
			prefObj.setval(user_set_val);
			/* removed this write to ini and to ini file on 082914 104p because doing setval will trigger this it its onChange. the onChange also handles broadacasting to all cp clients to update dom to that value, and thats important (ie: if multiple clients open)
			ini.General.props['Profilist.' + pref_name] = user_set_val;
			var promise = writeIni();
			promise.then(
				function() {
					//Services.obs.notifyObservers(null, 'profilist-cp-server', ['pref-to-dom', pref_name, pref_val].join(subDataSplitter));
					cpCommPostMsg(['pref-to-dom', pref_name, pref_val].join(subDataSplitter));
				},
				function(aRejectReason) {
					throw new Error('Failed to write ini on update-pref-so-ini-too-with-user-setting for reason: ' + aRejectReason);
				}
			);
			*/
			break;
		case 'query-browser-base-iconset':
				var cWin = Services.wm.getMostRecentWindow('navigator:browser')
				var promise_basePick = pickerIconset(cWin);
				promise_basePick.then(
					function(aVal) {
						console.log('Fullfilled - promise_basePick - ', aVal);
						// start - do stuff here - promise_basePick
							// :todo: go through and check if anything is tied to incomingJson.tieId and if it is then updates it icon
							cpCommPostMsg(['response-browser-base-iconset', JSON.stringify({
								img: aVal['16'].FileURI,
								tieid: incomingJson.tieid
							})].join(subDataSplitter));
						// end - do stuff here - promise_basePick
					},
					function(aReason) {
						var rejObj = {name:'promise_basePick', aReason:aReason};
						console.warn('Rejected - promise_basePick - ', rejObj);

						var deepestReason = aReasonMax(aReason);
						console.info('deepestReason:', deepestReason);
						if (Object.prototype.toString.call(deepestReason) === '[object Array]') {
							try {
								var errorTxt = myServices.sb.formatStringFromName('iconset-picker-error-txt-' + deepestReason[0], deepestReason.slice(1), deepestReason.slice(1).length) // link3632035
							} catch(ex if ex.result == Cr.NS_ERROR_FAILURE) {
								console.error('GetStringFromName/formatStringFromName - the `name` on id of `' + 'iconset-picker-error-txt-' + deepestReason[0] + '` doesnt exist');
							}
							if (errorTxt) {
								Services.prompt.alert(
									cWin,
									myServices.sb.GetStringFromName('iconset-picker-error-title'),
									myServices.sb.formatStringFromName('iconset-picker-error-txt-' + deepestReason[0], deepestReason.slice(1), deepestReason.slice(1).length) // link3632035
								);
								makePanelClosableOnBlur_doCompleteAnimation();
								return; //prevent deeper execution
							}
							cpCommPostMsg(['response-browser-base-iconset', JSON.stringify({
								errorTxt: errorTxt
							})].join(subDataSplitter));
							return;
						}
						
						switch (deepestReason) {
							case 'canceled picker':
								
									// no user notification, as its obvious, user knows when they cancelled the picker
									console.log('user cancled picker, dont alert');
								
								break;
							default:
								Services.prompt.alert(
									cWin,
									myServices.sb.GetStringFromName('profilist-error-title'),
									myServices.sb.formatStringFromName('profilist-error-txt-something', [JSON.stringify(deepestReason)], 1)
								);
						}
						
						//deferred_createProfile.reject(rejObj);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promise_basePick', aCaught:aCaught};
						console.error('Caught - promise_basePick - ', rejObj);
						//deferred_createProfile.reject(rejObj);
					}
				);
				
			break;
		case 'query-browser-base-iconset-updated-for-tieid':
			
				console.error('hitting query-browser-base-iconset-updated-for-tieid'); // :debug:
				return; // :debug:
				
				switch (core.os.name) {
					case 'winnt':
					case 'winmo':
					case 'wince':
						
							// check if anything is tied to this id, if it is then updateAllLaunchers
							// if those profiles are running, then update windows, actually no need to check, as the updateWindows thing checks anyways
							// respect running
							var cTieId = incomingJson.tieid;
							
							for (var iniKey in ini) {
								if ('num' in ini[iniKey] && 'Profilist.tie' in ini[iniKey].props && ini[iniKey].props['Profilist.tie'] == cTieId) {
									var step1 = function() {
										getProfileSpecs_WithCB(null, iniKey, null, true, step2);
									};
									
									var step2 = function(aProfSpec) {
										ensureIconExists_WithCB(null, iniKey, aProfSpec, step3);
									};
									
									var step3 = function(cProfSpecs) {
										updateIconToAllWindows(iniKey, cProfSpecs);
										updateIconToSystemLaunchers(iniKey, cProfSpecs); // for winnt this will update exe's, but its not set up yet, so on winnt to update system launchers i use updateIconToLauncher with winUpdateIconToSystemShortcutLaunchers true
										updateIconToDesktcut(iniKey, cProfSpecs);
										updateIconToLauncher(iniKey, cProfSpecs, {winUpdateIconToSystemShortcutLaunchers:true});
									};									

									step1();
								}
							}
							
						break;
					default:
						// nothing special
				}				
			
			break;
		default:
			throw new Error('"profilist-cp-server": aTopic of "' + aTopic + '" is unrecognized');
	}
}
/* end - control panel server/client communication */

// start - file picker for changing badge
function getPathsInIconset(iconsetId, liveFetch) {
	// does not check for file existence, assumes they exist
	// returns null if os is not supported
	// default, it returns OSPath, set FileURIPath to true to ALSO get FileURI
	// returns obj with keys as size, and .OSPath and .FileURI
	
	// if liveFetch is done, then it actually goes the foldre named iconsetId in profilist-data/iconsets/ and fetches all file paths
		// NOT YET IMPLEMENTED
	
	var arryOfSizes = [];
	if (['winnt', 'linux', 'darwin'].indexOf(cOS) == -1) {
		return null;
	}

	if (['esr','release','beta','aurora','dev','nightly','default'].indexOf(iconsetId) > -1) {
		//iconsetId = getIconsetForChannelName(iconsetId);
		var pathBase_OSPath = core.addon.path.images + 'channel-iconsets/' + iconsetId + '/' + iconsetId;
		var pathBase_FileURI = pathBase_OSPath;
	} else {
		var pathBase_OSPath = OS.Path.join(profToolkit.path_profilistData_iconsets, iconsetId, iconsetId);
		var pathBase_FileURI = OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconsetId, iconsetId));
	}
	var imgObj = {};
	for (var i=0; i<iconsetSizes_OS[cOS].length; i++) {
		imgObj[iconsetSizes_OS[cOS][i]] = {
			OSPath: pathBase_OSPath + '_' + iconsetSizes_OS[cOS][i] + '.png',
			FileURI: pathBase_FileURI + '_' + iconsetSizes_OS[cOS][i] + '.png'
		};
	}
	
	return imgObj;
}
function getPathToBadge(iconsetId, size, OSPath) {
	// default OSPath is false, so returns FileURI, set it to `true` to get OSPath
	//does not check for file existence, assumes they exist
	if (OSPath) {
		return OS.Path.join(profToolkit.path_profilistData_iconsets, iconsetId, iconsetId + '_' + size + '.png');
	} else {
		return OS.Path.toFileURI(OS.Path.join(profToolkit.path_profilistData_iconsets, iconsetId, iconsetId + '_' + size + '.png'));
	}
}

function showPick4Badging(win) {
	// returns promise
	// if badge succesfully made, it resolves to the uniqueName, get a path to it like this: OS.Path.toFileURI(OS.Path.join(profToolkit.path_iniDir, 'profilist_data', 'badge_iconsets', aVal, aVal + '_16.png')) NO LONGER THIS: `with the platform path without ext or size. so to use it append a _SIZE.png`
	var deferred_mainnnn = new Deferred();
	var deferred_badgeProcess;
	
	var msgsToUser = [];
	var reqdSizes = [10, 16, 32, 64, 128, 256, 512]; //for mac
	var uniqueName = new Date().getTime() + '';
	var destPathBase = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'badge_iconsets', uniqueName, uniqueName); //without the extensions
	var fromPathBase = OS.Constants.Path.userApplicationDataDir; // for dir recurse
	var fileUri_to_platformPath = {};
	// load imgs, if any error, notify user
		// do OS.File.copy on paths of images that meet exact size
		// scale the ones that dont meet exact size from nearestSized then OS.File.writeAtomic, and keep a record of this, i want to notify user that badges were made but X Y and Z had to be scaled so suffer suboptimal quality
	var collectionImgs = {}; // with key equal to size
	
	// start - setup image load stuff
	var handleImgLoad = function(refDeffered) {
		var img = this;
		var platformPath = fileUri_to_platformPath[img.src];
		var imgBaseName = OS.Path.basename(platformPath);
		
		if (this.naturalHeight != this.naturalWidth) {
			msgsToUser.push('Did not use "' + imgBaseName + '" as it is unsquare, image must have same height and width.');
		} else if (this.naturalHeight in collectionImgs) {
			var alreadyExistingImgBaseName = OS.Path.basename(fileUri_to_platformPath[collectionImgs[this.naturalHeight].Image.src]);
			msgsToUser.push('Did not use "' + imgBaseName + '" has same size as "' + alreadyExistingImgBaseName + '".');
		} else {
			collectionImgs[this.naturalHeight] = {
				platformPath: platformPath,
				Image: img
			};
		}
		
		refDeffered.resolve('Loaded: "' + img.src + '"');
	};	
	var handleImgAbort = function(refDeffered) {
		var img = this;
		var imgBaseName = OS.Path.basename(OS.Path.fromFileURI(img.src));
		msgsToUser.push('Could not use "' + imgBaseName + '" as image load was unexpectedly aborted.');
		refDeffered.resolve('Unexpected abortion on : "' + img.src + '"');
	};	
	var handleImgError = function(refDeffered) {
		var img = this;
		var imgBaseName = OS.Path.basename(OS.Path.fromFileURI(img.src));
		msgsToUser.push('Did not use "' + imgBaseName + '" as it failed to load, ensure the file is an image and not corrupt.');
		refDeffered.resolve('Unexpected error on : "' + img.src + '"');
	};
	
	var loadImgAndSaveData = function(platformPath) {
		var deferred_loadImgAndSaveData = new Deferred();
		var img = new Services.appShell.hiddenDOMWindow.Image();
		
		img.onload = handleImgLoad.bind(img, deferred_loadImgAndSaveData);
		img.onabort = handleImgAbort.bind(img, deferred_loadImgAndSaveData);
		img.onerror = handleImgError.bind(img, deferred_loadImgAndSaveData);
		
		var fileUri = OS.Path.toFileURI(platformPath);
		fileUri_to_platformPath[fileUri/*.toLowerCase()*/] = platformPath; //note: may need to lower case it, im not sure, it depdns on after load if it maintins the same casing, as i use it to get matching in fileUri_to_platformPath object
		img.src = fileUri;
		
		return deferred_loadImgAndSaveData.promise;
	};
	// end - setup image load stuff
	
	// start - setup blobAndWrite
	var blobCallback = function(path_to_save_at, refDeferred, blob) {
        var reader = Cc['@mozilla.org/files/filereader;1'].createInstance(Ci.nsIDOMFileReader); //new FileReader();
        reader.onloadend = function() {
            // reader.result contains the ArrayBuffer.			
			var arrview = new Uint8Array(reader.result);
			
			var promise_writeArrView = tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [path_to_save_at, arrview, {tmpPath:path_to_save_at+'.tmp', encoding:'utf-8'}], fromPathBase);

			promise_writeArrView.then(
				function(aVal) {
					console.log('Fullfilled - promiseAllArr_writePngs - ', aVal);
					// start - do stuff here - promiseAllArr_writePngs
					refDeferred.resolve('Saved blob to png: "' + OS.Path.basename(path_to_save_at) + '"');
					// end - do stuff here - promiseAllArr_writePngs
				},
				function(aReason) {
					var rejObj = {name:'promiseAllArr_writePngs.promise', aReason:aReason};
					console.error('Rejected - promiseAllArr_writePngs - ', rejObj);
					refDeferred.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promiseAllArr_writePngs', aCaught:aCaught};
					console.error('Caught - promiseAllArr_writePngs - ', rejObj);
					refDeferred.reject(rejObj);
				}
			);
        };
		reader.onabort = function() {
			refDeferred.reject('Abortion on nsIDOMFileReader, failed reading blob for saving: "' + OS.Path.basename(path_to_save_at) + '"');
		};
		reader.onerror = function() {
			refDeferred.reject('Error on nsIDOMFileReader, failed reading blob for saving: "' + OS.Path.basename(path_to_save_at) + '"');
		};
        reader.readAsArrayBuffer(blob);
	};
	// end - setup blobAndWrite
	
	// start - copy to badge_iconsets folder
	var scaleAndWriteAll = function() {
		var promiseAllArr_scaleAndWriteAll = [];
		
		for (var i=0; i<reqdSizes.length; i++) {
			var canvas = Services.appShell.hiddenDOMWindow.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			var ctx = canvas.getContext('2d');
			canvas.width = reqdSizes[i];
			canvas.height = reqdSizes[i];
			//ctx.clearRect(0, 0, reqdSizes[i], reqdSizes[i]);
			
			var destPath = destPathBase + '_' + reqdSizes[i] + '.png';
			
			var nearestImg = getImg_of_exactOrNearest_Bigger_then_Smaller(reqdSizes[i], collectionImgs);
			if (nearestImg.naturalHeight == reqdSizes[i]) {
				console.log('nearest found is exact of required size, so no need for scalling. just OS.File.copy this image. required size:', reqdSizes[i], 'nearest size:', nearestImg.naturalHeight);
				//promiseAllArr_scaleAndWriteAll.push(tryOsFile_ifDirsNoExistMakeThenRetry('copy', [fileUri_to_platformPath[nearestImg.src], destPath, {tmpPath:destPath+'.tmp', encoding:'utf-8'}], fromPathBase));
				// i dont do the copy anymore, as the file may not be a png, we want to draw and save it as a png
				ctx.drawImage(nearestImg, 0, 0);
			} else {
				console.log('nearest found is not exact of required size, so scalling. required size:', reqdSizes[i], 'nearest size:', nearestImg.naturalHeight);
				ctx.drawImage(nearestImg, 0, 0, reqdSizes[i], reqdSizes[i]);
				
				msgsToUser.push('Exact match for size of ' + reqdSizes[i] + ' was not available among files you selected, therefore the image for this size was scaled from "' + OS.Path.basename(fileUri_to_platformPath[nearestImg.src]) + '" which was had a size of ' + nearestImg.naturalHeight + 'px');
			}			
			var deferred_blobAndWriteScaled = new Deferred();
			promiseAllArr_scaleAndWriteAll.push(deferred_blobAndWriteScaled.promise);
			(canvas.toBlobHD || canvas.toBlob).call(canvas, blobCallback.bind(null, destPath, deferred_blobAndWriteScaled), 'image/png');						
		}
		
		var promiseAll_scaleAndWriteAll = Promise.all(promiseAllArr_scaleAndWriteAll);
		promiseAll_scaleAndWriteAll.then(
			function(aVal) {
				console.log('Fullfilled - promiseAll_scaleAndWriteAll - ', aVal);
				// start - do stuff here - promiseAll_scaleAndWriteAll
				msgsToUser.splice(0, 0, 'Successfully created iconset of this badge!\n');
				deferred_badgeProcess.resolve('Badges succesfully saved to iconset folder');
				// end - do stuff here - promiseAll_scaleAndWriteAll
			},
			function(aReason) {
				var rejObj = {name:'promiseAll_scaleAndWriteAll', aReason:aReason};
				console.error('Rejected - promiseAll_scaleAndWriteAll - ', rejObj);
				deferred_badgeProcess.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promiseAll_scaleAndWriteAll', aCaught:aCaught};
				console.error('Caught - promiseAll_scaleAndWriteAll - ', rejObj);
				deferred_badgeProcess.reject(rejObj);
			}
		);
	};
	// end - copy to badge_iconsets folder
	var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
	fp.init(win, 'Profilist - Select Badge Images', Ci.nsIFilePicker.modeOpenMultiple);
	fp.appendFilters(Ci.nsIFilePicker.filterImages);

	var startDir = Services.dirsvc.get('UAppData', Ci.nsIFile);
	startDir.append('profilist_data');
	startDir.append('badge_iconsets'); //OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'badge_iconsets');
	//console.log('the path:', startDir.path, startDir.exists());
	fp.displayDirectory = startDir;

	var rv = fp.show();
	if (rv == Ci.nsIFilePicker.returnOK) {
		deferred_badgeProcess = new Deferred();
		deferred_badgeProcess.promise.then(
			function(aVal) {
				console.log('Fullfilled - deferred_badgeProcess - ', aVal);
				// start - do stuff here - deferred_badgeProcess
				if (msgsToUser.length > 0) {
					Services.prompt.alert(win, 'Profilist - Badging Successful', msgsToUser.join('\n'));
				}
				deferred_mainnnn.resolve(uniqueName);
				// end - do stuff here - deferred_badgeProcess
			},
			function(aReason) {
				var rejObj = {name:'deferred_badgeProcess', aReason:aReason};
				console.error('Rejected - deferred_badgeProcess - ', rejObj);
				if (msgsToUser.length >0) {
					Services.prompt.alert(win, 'Profilist - Badging Failed', msgsToUser.join('\n'));
				}
				deferred_mainnnn.reject('rejected');
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'deferred_badgeProcess', aCaught:aCaught};
				console.error('Caught - deferred_badgeProcess - ', rejObj);
				if (msgsToUser.length >0) {
					Services.prompt.alert(win, 'Profilist - Badging Errored', msgsToUser.join('\n'));
				}
				deferred_mainnnn.resolve('errored');
			}
		);
		var files = fp.files;
		console.log('files:', files);

		var promiseAllArr_loadAllImgs = [];
		while (files.hasMoreElements()) {
			var aFile = files.getNext().QueryInterface(Ci.nsIFile);
			console.log('aFile:', aFile.path);

			// go through images, and see what all sizes they have
			promiseAllArr_loadAllImgs.push(loadImgAndSaveData(aFile.path));
		}
		var promiseAll_loadAllImgs = Promise.all(promiseAllArr_loadAllImgs);
		promiseAll_loadAllImgs.then(
			function(aVal) {
				console.log('Fullfilled - promiseAll_loadAllImgs - ', aVal);
				// start - do stuff here - promiseAll_loadAllImgs
				if (Object.keys(collectionImgs).length == 0) {
					msgsToUser.splice(0, 0, 'No badge images created all, as out of the files selected files, none were suitable for image creation.\n');
					deferred_badgeProcess.reject('No badge images created all, as out of the files selected files, none were suitable for image creation.');
				} else {
					scaleAndWriteAll();
				}
				// end - do stuff here - promiseAll_loadAllImgs
			},
			function(aReason) {
				var rejObj = {name:'promiseAll_loadAllImgs', aReason:aReason};
				console.error('Rejected - promiseAll_loadAllImgs - ', rejObj);
				deferred_badgeProcess.reject('Should never get here, I never reject it');
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promiseAll_loadAllImgs', aCaught:aCaught};
				console.error('Caught - promiseAll_loadAllImgs - ', rejObj);
				msgsToUser.splice(0, 0, 'Error during code exectuion, this one is fault of developer.\n');
				deferred_badgeProcess.reject('Error during code exectuion, this one is fault of developer.');
			}
		);
	} else {
		deferred_mainnnn.reject('canceled picker');
	}
	
	return deferred_mainnnn.promise;
}
// end - file picker for changing badge

//start - mac over and unover ride stuff
var specialKeyReplaceType;
var nsIFile_origAlias = {};
function mac_doPathsOverride() {
	// returns promise
	var deferred_mac_doPathsOverride = new Deferred();
	
	var string_prefContents;
	try {
		string_prefContents = Services.prefs.getCharPref('extension.Profilist@jetpack.mac-paths-fixup');
	} catch (ex/* if ex.result != Cr.NS_ERROR_UNEXPECTED*/) {
		// Cr.NS_ERROR_UNEXPECTED is what is thrown when pref doesnt exist
		//throw ex;
	}
	
	var json_prefContents;
	var overrideSpecialPaths = function() {
		// returns nothing
		//var nsIFile_origAlias = {};
		
		var aliasAppPath = Services.dirsvc.get('XREExeF', Ci.nsIFile).parent.parent.parent.path;
		var mainAppPath = json_prefContents.mainAppPath;
		var main_profLD_LDS_basename = json_prefContents.main_profLD_LDS_basename;
		
		specialKeyReplaceType = {
			//group
			'XREExeF': 3,
			'XREAppDist': 3,
			'DefRt': 3,
			'PrfDef': 3,
			'profDef': 3,
			'ProfDefNoLoc': 3,
			'ARes': 3,
			'AChrom': 3,
			'APlugns': 3,
			'SrchPlugns': 3,
			'XPIClnupD': 3,
			'CurProcD': 3,
			'XCurProcD': 3,
			'XpcomLib': 3,
			'GreD': 3,
			'GreBinD': 3,
			//group
			'UpdRootD': 5,
			//group
			'ProfLDS': 4,
			'ProfLD': 4
		};
		
		var replaceTypes = {
			3: function(key) {
				//replace aliasAppPath with mainAppPath after getting orig key value
				var newpath = nsIFile_origAlias[key].path.replace(aliasAppPath, mainAppPath);
				return new FileUtils.File(newpath);
			},
			4: function(key) {
				// for ProfLD and ProfLDS
				// replace basename of alias with basename of main IF its IsRelative=1
				// ProfLD and ProfLDS are same in all cases, IsRelative==1 || 0 and reg || alias
				// DefProfLRt AND DefProfRt are same in alias and reg in both IsRelative 1 and 0
				// IsRelative=1 ProfLD and ProfLDS are based on DefProfLRt in regular, but on DefProfRt in alias
				// so to detect if IsRelative == 1 I can test to see if ProfLD and ProfLDS contain DefProfLRt OR DefProfRt
				if (nsIFile_origAlias[key].path.indexOf(Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path) > -1 || nsIFile_origAlias[key].path.indexOf(Services.dirsvc.get('DefProfRt', Ci.nsIFile).path) > -1) {
					// ProfLD or ProfLDS are keys, and they contain either DefProfLRt or DefProfRt, so its a realtive profile
					// IsRelative == 1
					// so need fix up on ProfLD and ProfLDS
					var newAlias_ProfLD_or_ProfLDS = nsIFile_origAlias[key].path.replace(nsIFile_origAlias[key].parent.path, main_profLD_LDS_basename);
					// disovered that DefProfLRt is correct in alias of rel path and abs path. so i dont have to store it, can just do replace .parent.path with : `var newAlias_ProfLD_or_ProfLDS = nsIFile_origAlias[key].path.replace(nsIFile_origAlias[key].parent.path, Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path);`
					return new FileUtils.File(newAlias_ProfLD_or_ProfLDS);
				} else {
					//IsRelative == 0
					// so no need for fix up, just return what it was
					console.log('no need for fixup of ProfLD or ProfLDS as this is custom path profile, meaning its absolute path, meaning IsRelative==0');
					return nsIFile_origAlias[key];
				}
			},
			5: function() {
				// for UpdRootD
				// replaces the aliasAppPath (minus the .app) in UpdRootD with mainAppPath (minus the .app)
				var aliasAppPath_noExt = aliasAppPath.substr(0, aliasAppPath.length-('.app'.length));
				var mainAppPath_noExt = mainAppPath.substr(0, mainAppPath.length-('.app'.length));
				var newpath = nsIFile_origAlias['UpdRootD'].path.replace(aliasAppPath_noExt, mainAppPath_noExt);
				return new FileUtils.File(newpath);
			}
			// not yet cross checked with custom path
		};
		
		OSStuff.overidingDirProvider = {
			getFile: function(aProp, aPersistent) {
				aPersistent.value = true;
				if (replaceTypes[specialKeyReplaceType[aProp]]) {
					return replaceTypes[specialKeyReplaceType[aProp]](aProp);
				}
				return null;
			},
			QueryInterface: function(aIID) {
				if (aIID.equals(Ci.nsIDirectoryServiceProvider) || aIID.equals(Ci.nsISupports)) {
					return this;
				}
				console.error('override DirProvider error:', Cr.NS_ERROR_NO_INTERFACE, 'aIID:', aIID);
			}
		};

		for (var key in specialKeyReplaceType) {
			nsIFile_origAlias[key] = Services.dirsvc.get(key, Ci.nsIFile);
			/*
			if (specialKeyReplaceType[key] == 2) {
				path_origAlias[key] = Services.dirsvc.get(key, Ci.nsIFile).path;
			}
			*/
			Services.dirsvc.undefine(key);
		}
		Services.dirsvc.registerProvider(OSStuff.overidingDirProvider);
		//myServices.ds.unregisterProvider(dirProvider);
		console.log('oevrrid');
	};
	
	if (string_prefContents) {
		// actually forget it, just on shutdown i should unregister the dirProvider
		json_prefContents = JSON.parse(string_prefContents);
		overrideSpecialPaths();
		deferred_mac_doPathsOverride.resolve('paths overrid');
	} else {
		//var path_to_ThisPathsFile = OS.Path.join(Services.dirsvc.get('GreBinD', Ci.nsIFile).path, 'profilist-main-paths.json'); // because immediate children of Contents are aliased specifically the Resource dir, i can just access it like this, no matter if overrid or not, and it (GreD) is not overrid at this point		
		var path_to_ThisPathsFile = OS.Path.join(Services.dirsvc.get('XREExeF', Ci.nsIFile).parent.path, 'profilist-main-paths.json'); // because immediate children of Contents are aliased specifically the Resource dir, i can just access it like this, no matter if overrid or not, and it (GreD) is not overrid at this point		
		var promise_readThisPathsFile = read_encoded(path_to_ThisPathsFile, {encoding:'utf-8'});
		promise_readThisPathsFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_readThisPathsFile - ', aVal);
				// start - do stuff here - promise_readThisPathsFile
				string_prefContents = aVal;
				json_prefContents = JSON.parse(aVal);
				overrideSpecialPaths(); //lets go stragiht to override, we'll right the pref afterwards, just to save a ms or two
				Services.prefs.setCharPref('extension.Profilist@jetpack.mac-paths-fixup', aVal); // im not going to set a default on this, because if i do then on startup the pref wont exist so it would have to written first, which would require me to read the file on disk, which we want to avoid
				deferred_mac_doPathsOverride.resolve('paths overrid');
				// end - do stuff here - promise_readThisPathsFile
			},
			function(aReason) {
				var rejObj = {name:'promise_readThisPathsFile', aReason:aReason};
				console.error('Rejected - promise_readThisPathsFile - ', rejObj);
				deferred_mac_doPathsOverride.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_readThisPathsFile', aCaught:aCaught};
				console.error('Caught - promise_readThisPathsFile - ', rejObj);
				deferred_mac_doPathsOverride.reject(rejObj);
			}
		);
	}
	
	return deferred_mac_doPathsOverride.promise;
}

function mac_doPathsUNoveride() {
	if (!OSStuff.overidingDirProvider) {
		console.log('nothing to unoverride');
		return;
	}
	
	Services.dirsvc.unregisterProvider(OSStuff.overidingDirProvider);
	console.warn('ok took it out the overidingProvider');
	
	OSStuff.UNoveridingDirProvider = {
		getFile: function(aProp, aPersistent) {
			aPersistent.value = true;
			return nsIFile_origAlias[aProp];
		},
		QueryInterface: function(aIID) {
			if (aIID.equals(Ci.nsIDirectoryServiceProvider) || aIID.equals(Ci.nsISupports)) {
				return this;
			}
			console.error('UNoverride DirProvider error:', Cr.NS_ERROR_NO_INTERFACE, 'aIID:', aIID);
		}
	};

	for (var key in specialKeyReplaceType) {
		// have to try catch because if it was not referenced meaning no one did Services.dirsvc.get('blah', ...) then it never got defined
		try {
			Services.dirsvc.undefine(key);
		} catch (ex) {
			console.warn('warn on key:', key, ex);
		}
	}
	Services.dirsvc.registerProvider(OSStuff.UNoveridingDirProvider);
	
	for (var key in specialKeyReplaceType) {
		// because will be unregistering this provider i have to run through them and get them defined, otherwise they will never get defined, and referencing them via Serv.dirvs.get('blah'...) will throw as theres no dir provider to provide it
		var dummy = Services.dirsvc.get(key, Ci.nsIFile);
		console.log('did unooveride on key', key, 'path:', dummy.path);
	}
	Services.dirsvc.unregisterProvider(OSStuff.UNoveridingDirProvider);

}
//end - mac over and unover ride stuff

function startup(aData, aReason) {
//	console.log('in startup');
	// todo: check tie path, if current path does not match tie path then restart at that path (MAYBE)
	// todo: if build path is correct then ensure proper icon is applied
	
	extendCore();
	
	var do_postProfilistStartup_OSSpecific = function() {
		// start - os specific post-startup stuff
		switch (cOS) {
			case 'winnt':
			case 'winmo':
			case 'wince':
		
					// apply icon to windows
					var promise_getIconName = makeIcon(profToolkit.selectedProfile.iniKey);
					promise_getIconName.then(
						function(aVal) {
							console.log('Fullfilled - promise_getIconName - ', aVal);
							// start - do stuff here - promise_getIconName
							var useProfSpecs = aVal.profSpecs; //.iconNameObj.str;
							updateIconToAllWindows(profToolkit.selectedProfile.iniKey, useProfSpecs);
							updateIconToSystemLaunchers(profToolkit.selectedProfile.iniKey, useProfSpecs); // updates specs/icon to exe's but not yet implemented
							updateIconToLauncher(profToolkit.selectedProfile.iniKey, useProfSpecs, {winUpdateIconToSystemShortcutLaunchers:true}); // updates all system launchers too
							// end - do stuff here - promise_getIconName
						},
						function(aReason) {
							var rejObj = {name:'promise_getIconName', aReason:aReason};
							console.error('Rejected - promise_getIconName - ', rejObj);
							//deferredMain_updateIconToAllWindows.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promise_getIconName', aCaught:aCaught};
							console.error('Caught - promise_getIconName - ', rejObj);
							//deferredMain_updateIconToAllWindows.reject(rejObj);
						}
					);
					
					
					
				break;
			default:
				// do nothing
		}
		// end - os specific post-startup stuff
	}
	
	var do_profilistStartup = function() { // wrap this so have time to do whatever os specific stuff before starting up profilist
		//core.aData = aData; //must go first, because functions in loadIntoWindow use core.aData
		
		var promiseAllArr_startup = [];
		
		PromiseWorker = Cu.import(core.addon.path.modules + 'PromiseWorker.jsm').BasePromiseWorker;
		var promise_startMainWorker = SIPWorker('ProfilistWorker', core.addon.path.workers + 'ProfilistWorker.js');
		
		initProfToolkit();
		var promise_iniFirstRead = readIniAndParseObjs(); // requires initProfToolkit be done
		
		var newURIParam = {
			aURL: core.addon.path.styles + 'main.css',
			aOriginCharset: null,
			aBaseURI: null
		}
		cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
		
		//start pref stuff more
		myPrefListener = new PrefListener(); //init
		console.info('myPrefListener', myPrefListener);
		myPrefListener.register(aReason, false);
		//end pref stuff more
		
		promiseAllArr_startup = [promise_startMainWorker, promise_iniFirstRead];
		
		var promiseAll_startup = Promise.all(promiseAllArr_startup);
		promiseAll_startup.then(
			function(aVal) {
				console.log('Fullfilled - promiseAllArr_startup - ', aVal);
				// start - do stuff here - promiseAllArr_startup
				
					if (profToolkit.selectedProfile.iniKey) {
						// its not a temp prof
						updateProfStatObj({ // requires initProfToolkit be done
							aProfilePath: OS.Constants.Path.profileDir,
							aStatus: 1,
							readFirst: true,
							markOnlyIfDiff: true
						});
					}

					windowListener.register(); // requires promise_startMainWorker be done // requires promise_iniFirstRead be done
					
					for (var o in observers) {
						if (observers[o].preReg) { observers[o].preReg() }
						Services.obs.addObserver(observers[o].anObserver, o, false);
						if (observers[o].postReg) { observers[o].postReg() }
					}
					observers[o].WAS_REGGED = true;
					
					onResponseEnsureEnabledElseDisabled(); // requires promise_iniFirstRead be done // requires observers addObserver'ed
					
					do_postProfilistStartup_OSSpecific(); // this requires all the above post startup stuff done
					
				// end - do stuff here - promiseAllArr_startup
			},
			function(aReason) {
				var rejObj = {name:'promiseAllArr_startup', aReason:aReason};
				console.error('Rejected - promiseAllArr_startup - ', rejObj);
				//deferred_createProfile.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promiseAllArr_startup', aCaught:aCaught};
				console.error('Caught - promiseAllArr_startup - ', rejObj);
				//deferred_createProfile.reject(rejObj);
			}
		);
	};
	
	// start - os specific pre-startup stuff
	switch (cOS) {
		case 'darwin':
			// check if should override paths
			if (OS.Constants.Path.libDir.indexOf('profilist_data') > -1) {
				OSStuff.isProfilistLauncher = true;
				// need to override
				var promise_overridePaths = mac_doPathsOverride();
				promise_overridePaths.then(
					function(aVal) {
						console.log('Fullfilled - promise_overridePaths - ', aVal);
						// start - do stuff here - promise_overridePaths
						do_profilistStartup();
						// end - do stuff here - promise_overridePaths
					},
					function(aReason) {
						var rejObj = {name:'promise_overridePaths', aReason:aReason};
						console.error('Rejected - promise_overridePaths - ', rejObj);
						Services.prompt.alert(Services.wm.getMostRecentWindow(null), 'Profilist - Critical Error', 'Profilist failed to startup in this Mac OS X launcher, you can only use Profilist from non-shortcut paths, report this to developer at noitidart@gmail.com as this is very bad and should be fixed');
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'promise_overridePaths', aCaught:aCaught};
						console.error('Caught - promise_overridePaths - ', rejObj);
						Services.prompt.alert(Services.wm.getMostRecentWindow(null), 'Profilist - Critical Error', 'Profilist failed to startup in this Mac OS X launcher, you can only use Profilist from non-shortcut paths, report this to developer at noitidart@gmail.com as this is very bad and should be fixed');
					}
				);
			} else {
				// actually no need to create, as when first launcher is made the paths get made so ignore: `//create pathsPrefContentsJson;`
				do_profilistStartup();
			}
			
			
			break;
		default:
			do_profilistStartup();
	}
	
	// end - os specific pre-startup stuff	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) {
		if (updateLauncherAndCutIconsOnBrowserShutdown) {
			updateLauncherAndCutIconsOnBrowserShutdown();
		}
		return;
	}
	//myServices.sss.unregisterSheet(cssUri, myServices.sss.AUTHOR_SHEET);
	
	windowListener.unregister();
	//if ([ADDON_DISABLE, ADDON_UNINSTALL].indexOf(aReason) > -1) {
		console.log('will disable listener for clients if it was enabled');
		disableListenerForClients();
	//}
	
	if (aReason == ADDON_UNINSTALL) {
		/*
		if (openCPContWins.length > 0) {
			myPrefListener.watchBranches[myPrefBranch].prefNames['system-cp-tabs-open'].setval(true);
		}
		*/
	}
	
	for (var o in observers) {
		if (observers[o].WAS_REGGED) {
			if (observers[o].preUnreg) { observers[o].preUnreg() }
			Services.obs.removeObserver(observers[o].anObserver, o, false);
			if (observers[o].postUnreg) { observers[o].postUnreg() }
		} else {
			console.warn('observer named', o, 'was not regged so no need to unreg');
		}
	}
	
	//start pref stuff more
	myPrefListener.unregister();
	//end pref stuff more
	
	Cu.unload(core.addon.path.modules + 'PromiseWorker.jsm');
	
	if (aReason == ADDON_DISABLE) {
		updateProfStatObj({ // requires initProfToolkit be done
			aProfilePath: OS.Constants.Path.profileDir,
			aStatus: 0,
			readFirst: true,
			markOnlyIfDiff: true // its gotta be non-0 right now so a diff will definitely exist
		});
	}
	
	// start - os specific stuff
	if (core.os.name == 'darwin') {
		//if ([ADDON_DOWNGRADE, ADDON_UPGRADE].indexOf(aReason) > -1 || OSStuff.overidingDirProvider) { // its not bad to leave this registered so im going to leave it on disable/uninstall, but on upgrade/downgrade i unreg it so on the upgrade i can properly recognize that its a profilist launcher as opposed to main Firefox.app
			mac_doPathsUNoveride();
			//console.log('unregistered dir provider');
			// old notes below:
				// its not undefined, so it was registered
				// in ureg because its needed so Profilist can upgrade gracefully
		//}
	}
	// end - os specific stuff
}

function getIsProfilistEnabledInProfile(aProfilePath) {
	// returns promise
		// resolves to true or false depending on if enabled
	var deferredMain_getIsProfilistEnabledInProfile = new Deferred();
	
	if (aProfilePath === null) {
		// temporary profile
		deferredMain_getIsProfilistEnabledInProfile.resolve(null);
	} else if (aProfilePath == profToolkit.selectedProfile.iniKey) {
		
	}
	
	return deferredMain_getIsProfilistEnabledInProfile.promise;
}

function getIsProfilistUninstalledInAllOtherProfiles() {
	
}

function getSystemAppUserModelId(aProfilePath) {
	// WINNT function only
	
	if (core.os.version_name != '7+') {
		
	}
}

function getProfStat(aProfilePath, dontRefreshStatObj) { // better name for this would be getProfProfilistStatus
	// updates prof stat obj and returns profile status, 0-disabled, 1-enabled, -1-uninstalled
	// if dontRefreshStatObj is true, then it doesnt read the file
	var deferredMain_getProfStat = new Deferred();
	
	if (profToolkit.selectedProfile.iniKey) {
		// meaning its a temp profile
		deferredMain_getProfStat.resolve(1);
	} else if (aProfilePath == profToolkit.selectedProfile.iniKey) {
		// its selected profile
		deferredMain_getProfStat.resolve(1);
	} else {
		if (dontRefreshStatObj && profStatObj) { //if devuser set dontRefreshStatObj to true, then if profStatObj is not undefined/uninited then it wont refresh it
			var promise_updateProfStatObj = updateProfStatObj();
			promise_updateProfStatObj.then(
				function(aVal) {
					console.log('Fullfilled - promise_updateProfStatObj - ', aVal);
					// start - do stuff here - promise_updateProfStatObj
					doResolving();
					// end - do stuff here - promise_updateProfStatObj
				},
				function(aReason) {
					var rejObj = {name:'promise_updateProfStatObj', aReason:aReason};
					console.error('Rejected - promise_updateProfStatObj - ', rejObj);
					deferredMain_getProfStat.reject(rejObj);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'promise_updateProfStatObj', aCaught:aCaught};
					console.error('Caught - promise_updateProfStatObj - ', rejObj);
					deferredMain_getProfStat.reject(rejObj);
				}
			);
		} else {
			doResolving();
		}
	}
	
	var doResolving = function() {
		if (aProfilePath in profStatObj) {
			deferredMain_getProfStat.resolve(profStatObj[aProfilePath]);
		} else {
			deferredMain_getProfStat.resolve(-1);
		}
	};
	
	return deferredMain_getProfStat.promise;
}

function updateProfStatObj(markObj) {
	// unique key for profiles is the profile path
	// if markObj supplied it will read then write based on options provided
	// if markObj is NOT supplied then it will read file into obj
		
	// if markObj is set, then it will not read the ini file unless specifically told to do so // this comment affects defaults
	
	var deferredMain_updateProfStatObj = new Deferred();
	
	var defaultsMarkObj = {
		readFirst: false,
		markOnlyIfDiff: true // if aStatus in current obj profStatObj does not equal (differs from) aStatus then it will mark, if it is equal then it does nothing // if do readFirst:true then should definitely set markOnlyIfDiff to true, otherwise it will do an absolutely unncessary write. wherease if readFirst was false, then if we write, it will write the contents of the current obj, which might overwrite changes
		// aProfilePath: jsStr, // must be devuser supplied
		// aStatus: jsInt, // must be devuser supplied: 0 for disabled, 1 for enabled, -1 for uninstalled (if uninstalled the key will be deleted from obj and file)
	};
	
	var do_readProfStatFile = function(gotoWriteObj) {
		var promise_readProfStatFile = read_encoded(profToolkit.path_profilistData_idsJson, {encoding:'utf-8'});
		promise_readProfStatFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_readProfStatFile - ', aVal);
				// start - do stuff here - promise_readProfStatFile
				profStatObj = JSON.parse(aVal);
				/*
				if (profToolkit.selectedProfile.iniKey) {
					// current prof is not a temp prof
					profStatObj[profToolkit.selectedProfile.iniKey] = 1;
				}
				*/
				if (gotoWriteObj) {
					do_testIfShouldWrite();
				} else {
					deferredMain_updateProfStatObj.resolve('had to just read, done');
				}
				// end - do stuff here - promise_readProfStatFile
			},
			function(aReason) {
				if (aReasonMax(aReason).becauseNoSuchFile) {
					profStatObj = {};
					/*
					if (profToolkit.selectedProfile.iniKey) {
						// current prof is not a temp prof
						profStatObj[profToolkit.selectedProfile.iniKey] = 1;
					}
					*/
					if (gotoWriteObj) {
						do_testIfShouldWrite();
					} else {
						deferredMain_updateProfStatObj.resolve('had to just read, done');
					}
				} else {
					var rejObj = {name:'promise_readProfStatFile', aReason:aReason};
					console.error('Rejected - promise_readProfStatFile - ', rejObj);
					deferredMain_updateProfStatObj.reject(rejObj);
				}
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_readProfStatFile', aCaught:aCaught};
				console.error('Caught - promise_readProfStatFile - ', rejObj);
				deferredMain_updateProfStatObj.reject(rejObj);
			}
		);
	};
	
	var do_testIfShouldWrite = function() {
		if (markObj.markOnlyIfDiff) {
			if (!profStatObj) {
				do_writeProfStatFile();
			} else  if ((!(markObj.aProfilePath in profStatObj) && markObj.aStatus != -1) || (profStatObj[markObj.aProfilePath] != markObj.aStatus)) {
				if (markObj.aStatus == -1) {
					delete profStatObj[markObj.aProfilePath];
				} else {
					profStatObj[markObj.aProfilePath] = markObj.aStatus;
				}
				do_writeProfStatFile();
			} else {
				deferredMain_updateProfStatObj.resolve('no need to write as there are no differences');;
			}
		} else {
			do_writeProfStatFile();
		}		
	}
	
	var do_writeProfStatFile = function() {
		var promise_writeProfStatFile = OS.File.writeAtomic(profToolkit.path_profilistData_idsJson, JSON.stringify(profStatObj), {encoding:'utf-8'});
		promise_writeProfStatFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_writeProfStatFile - ', aVal);
				// start - do stuff here - promise_writeProfStatFile
				deferredMain_updateProfStatObj.resolve('went all the way through, and succesfully wrote stat file');
				// end - do stuff here - promise_writeProfStatFile
			},
			function(aReason) {
				var rejObj = {name:'promise_writeProfStatFile', aReason:aReason};
				console.error('Rejected - promise_writeProfStatFile - ', rejObj);
				deferredMain_updateProfStatObj.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_writeProfStatFile', aCaught:aCaught};
				console.error('Caught - promise_writeProfStatFile - ', rejObj);
				deferredMain_updateProfStatObj.reject(rejObj);
			}
		);
	};
	
	if (markObj) {
		for (var d in defaultsMarkObj) {
			if (!(d in markObj)) {
				markObj[d] = defaultsMarkObj[d];
			}
		}
		var requiredByDevUser = {aProfilePath:1, aStatus:1};
		for (var k in requiredByDevUser) {
			if (!(k in markObj)) {
				throw new Error('Missing required key of "' + k + '" from markObj');
			}
		}
		
		if (markObj.readFirst) {
			do_readProfStatFile(true);
		}
	} else {
		do_readProfStatFile();
	}
	
	return deferredMain_updateProfStatObj.promise;
}

function install() {}

function uninstall(aData, aReason) {
	//start pref stuff more
	if (!myPrefListener) {
		//lets not register observer/listener lets just "install" it which populates branches
		console.log('in uninstall had to init (soft install) myPrefListener')
		myPrefListener = new PrefListener(); //this pouplates this.watchBranches[branch_name] so we can access .branchLive and .branchDefault IT WILL NOT register the perf observer/listener so no overhead there
	}
	myPrefListener.uninstall(aReason); //deletes owned branches AND owned prefs on UNowned branches, this is optional, you can choose to leave your preferences on the users computer	
	//end pref stuff more
	
	if (aReason == ADDON_UNINSTALL) {
		// real uninstall, have to do this becuse this uninstall function triggers for ADDON_DOWNGRADE and ADDON_UPGRADE too
		// :todo: figure out if ADDON_DISABLE fires on uninstall, because if it does then it will be extra overhead for no reason (in that it will mark prof stat file disabled then mark it uninstalled)
		updateProfStatObj({ // requires initProfToolkit be done
			aProfilePath: OS.Constants.Path.profileDir,
			aStatus: -1,
			readFirst: true,
			markOnlyIfDiff: true // its gotta be non--1 right now so a diff will definitely exist
		});
	}
}

// start - custom to profilist helper functions

// end - custom to profilist helper functions

var _cache_getAllFxBuilds;
function getAllFxBuilds(notFromCache) {
	// currently win7+ only
	// gets all the builds found in the registry
	// returns to array of objects (containing SystemAppUserModelID and path) see image: file:///C:/Users/Vayeate/Pictures/getAllFxBuilds%20resolve.png
	
	/* how i used this in the old getPathToPinnedCut
			var installedFxInfos = getAllFxBuilds();
			
			for (var i=0; i<installedFxInfos.length; i++) {
				var cBuildPath = installedFxInfos.Name.toLowerCase();
				if (searchCriterias.matchesStr.indexOf(cBuildPath) === -1) {
					searchCriterias.matchesStr.push(cBuildPath);
				}
			}
	*/
	
	if (core.os.version_name != '7+') {
		throw new Error(['os-unsupported', OS.Constants.Sys.Name]); // im not sure why this is win7+ i should test on xp and vista
	} else {
		if (!_cache_getAllFxBuilds || notFromCache) {
			_cache_getAllFxBuilds = [];
			var wrk = Cc['@mozilla.org/windows-registry-key;1'].createInstance(Components.interfaces.nsIWindowsRegKey);
			var keypath = 'Software\\Mozilla\\' + Services.appinfo.name + '\\TaskBarIDs'; //Services.appinfo.name == appInfo->GetName(appName) // http://mxr.mozilla.org/comm-central/source/mozilla/widget/windows/WinTaskbar.cpp#284
			try {
			  wrk.open(wrk.ROOT_KEY_LOCAL_MACHINE, keypath, wrk.ACCESS_READ);
			} catch(ex) {
			  //console.warn(ex)
			  if (ex.message != 'Component returned failure code: 0x80004005 (NS_ERROR_FAILURE) [nsIWindowsRegKey.open]') {
				throw ex;
			  } else {
				try {
				  wrk.open(wrk.ROOT_KEY_CURRENT_USER, keypath, wrk.ACCESS_READ);
				} catch (ex) {
				  throw ex;
				}
			  }
			}
			//list children
			var numVals = wrk.valueCount;
			for (var i=0; i<numVals; i++) {
			  var keyval = {
				Name: wrk.getValueName(i)
			  };
			  keyval.Type = wrk.getValueType(keyval.Name);
			  keyval.TypeStr = win_RegTypeStr_from_RegTypeInt(keyval.Type);
			  if (keyval.Type == 0) {
				throw new Error('keyval.Type is `0` I have no idea how to read this value keyval.Type == `' + keyval.Type + '` and keyval. Name == `' + keyval.Name + '`');    
			  }
			  keyval.Value = wrk['read' + keyval.TypeStr + 'Value'](keyval.Name)
			  //console.log('keyval:', uneval(keyval), keyval);
			  _cache_getAllFxBuilds.push(keyval);
			}
			wrk.close();
		}
		
		return _cache_getAllFxBuilds;
	}
}

// start - common helper functions
function Deferred() {
	if (Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (PromiseUtils.defer) {
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

function makeDir_Bug934283(path, options) {
	// pre FF31, using the `from` option would not work, so this fixes that so users on FF 29 and 30 can still use my addon
	// the `from` option should be a string of a folder that you know exists for sure. then the dirs after that, in path will be created
	// for example: path should be: `OS.Path.join('C:', 'thisDirExistsForSure', 'may exist', 'may exist2')`, and `from` should be `OS.Path.join('C:', 'thisDirExistsForSure')`
	// options of like ignoreExisting is exercised on final dir
	
	if (!options || !('from' in options)) {
		console.error('you have no need to use this, as this is meant to allow creation from a folder that you know for sure exists, you must provide options arg and the from key');
		throw new Error('you have no need to use this, as this is meant to allow creation from a folder that you know for sure exists, you must provide options arg and the from key');
	}

	if (path.toLowerCase().indexOf(options.from.toLowerCase()) == -1) {
		console.error('The `from` string was not found in `path` string');
		throw new Error('The `from` string was not found in `path` string');
	}

	var options_from = options.from;
	delete options.from;

	var dirsToMake = OS.Path.split(path).components.slice(OS.Path.split(options_from).components.length);
	console.log('dirsToMake:', dirsToMake);

	var deferred_makeDir_Bug934283 = new Deferred();
	var promise_makeDir_Bug934283 = deferred_makeDir_Bug934283.promise;

	var pathExistsForCertain = options_from;
	var makeDirRecurse = function() {
		pathExistsForCertain = OS.Path.join(pathExistsForCertain, dirsToMake[0]);
		dirsToMake.splice(0, 1);
		var promise_makeDir = OS.File.makeDir(pathExistsForCertain, options);
		promise_makeDir.then(
			function(aVal) {
				console.log('Fullfilled - promise_makeDir - ', 'ensured/just made:', pathExistsForCertain, aVal);
				if (dirsToMake.length > 0) {
					makeDirRecurse();
				} else {
					deferred_makeDir_Bug934283.resolve('this path now exists for sure: "' + pathExistsForCertain + '"');
				}
			},
			function(aReason) {
				var rejObj = {
					promiseName: 'promise_makeDir',
					aReason: aReason,
					curPath: pathExistsForCertain
				};
				console.error('Rejected - ' + rejObj.promiseName + ' - ', rejObj);
				deferred_makeDir_Bug934283.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_makeDir', aCaught:aCaught};
				console.error('Caught - promise_makeDir - ', rejObj);
				deferred_makeDir_Bug934283.reject(rejObj); // throw aCaught;
			}
		);
	};
	makeDirRecurse();

	return promise_makeDir_Bug934283;
}

function tryOsFile_ifDirsNoExistMakeThenRetry(nameOfOsFileFunc, argsOfOsFileFunc, fromDir) {
	// i use this with writeAtomic, copy, i havent tested with other things
	// argsOfOsFileFunc is array of args
	// will execute nameOfOsFileFunc with argsOfOsFileFunc, if rejected and reason is directories dont exist, then dirs are made then rexecute the nameOfOsFileFunc
	// i added makeDir as i may want to create a dir with ignoreExisting on final dir as was the case in pickerIconset()
	// returns promise
	
	var deferred_tryOsFile_ifDirsNoExistMakeThenRetry = new Deferred();
	
	if (['writeAtomic', 'copy', 'makeDir'].indexOf(nameOfOsFileFunc) == -1) {
		deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject('nameOfOsFileFunc of "' + nameOfOsFileFunc + '" is not supported');
		// not supported because i need to know the source path so i can get the toDir for makeDir on it
		return deferred_tryOsFile_ifDirsNoExistMakeThenRetry.promise; //just to exit further execution
	}
	
	// setup retry
	var retryIt = function() {
		var promise_retryAttempt = OS.File[nameOfOsFileFunc].apply(OS.File, argsOfOsFileFunc);
		promise_retryAttempt.then(
			function(aVal) {
				console.log('Fullfilled - promise_retryAttempt - ', aVal);
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.resolve('retryAttempt succeeded');
			},
			function(aReason) {
				var rejObj = {name:'promise_retryAttempt', aReason:aReason};
				console.error('Rejected - promise_retryAttempt - ', rejObj);
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); //throw rejObj;
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_retryAttempt', aCaught:aCaught};
				console.error('Caught - promise_retryAttempt - ', rejObj);
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); // throw aCaught;
			}
		);
	};
	
	// setup recurse make dirs
	var makeDirs = function() {
		var toDir;
		switch (nameOfOsFileFunc) {
			case 'writeAtomic':
				toDir = OS.Path.dirname(argsOfOsFileFunc[0]);
				break;
				
			case 'copy':
				toDir = OS.Path.dirname(argsOfOsFileFunc[1]);
				break;

			case 'makeDir':
				toDir = OS.Path.dirname(argsOfOsFileFunc[0]);
				break;
				
			default:
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject('nameOfOsFileFunc of "' + nameOfOsFileFunc + '" is not supported');
				return; // to prevent futher execution
		}
		var promise_makeDirsRecurse = makeDir_Bug934283(toDir, {from: fromDir});
		promise_makeDirsRecurse.then(
			function(aVal) {
				console.log('Fullfilled - promise_makeDirsRecurse - ', aVal);
				retryIt();
			},
			function(aReason) {
				var rejObj = {name:'promise_makeDirsRecurse', aReason:aReason};
				console.error('Rejected - promise_makeDirsRecurse - ', rejObj);
				if (aReason.becauseNoSuchFile) {
					console.log('make dirs then do retryAttempt');
					makeDirs();
				} else {
					// did not get becauseNoSuchFile, which means the dirs exist (from my testing), so reject with this error
					deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); //throw rejObj;
				}
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_makeDirsRecurse', aCaught:aCaught};
				console.error('Caught - promise_makeDirsRecurse - ', rejObj);
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); // throw aCaught;
			}
		);
	};
	
	// do initial attempt
	var promise_initialAttempt = OS.File[nameOfOsFileFunc].apply(OS.File, argsOfOsFileFunc);
	promise_initialAttempt.then(
		function(aVal) {
			console.log('Fullfilled - promise_initialAttempt - ', aVal);
			deferred_tryOsFile_ifDirsNoExistMakeThenRetry.resolve('initialAttempt succeeded');
		},
		function(aReason) {
			var rejObj = {name:'promise_initialAttempt', aReason:aReason};
			console.error('Rejected - promise_initialAttempt - ', rejObj);
			if (aReason.becauseNoSuchFile) {
				console.log('make dirs then do secondAttempt');
				makeDirs();
			} else {
				deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); //throw rejObj;
			}
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_initialAttempt', aCaught:aCaught};
			console.error('Caught - promise_initialAttempt - ', rejObj);
			deferred_tryOsFile_ifDirsNoExistMakeThenRetry.reject(rejObj); // throw aCaught;
		}
	);
	
	
	return deferred_tryOsFile_ifDirsNoExistMakeThenRetry.promise;
}

var txtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!txtDecodr) {
		txtDecodr = new TextDecoder();
	}
	return txtDecodr;
}

function read_encoded(path, options) {
	// because the options.encoding was introduced only in Fx30, this function enables previous Fx to use it
	// must pass encoding to options object, same syntax as OS.File.read >= Fx30
	// TextDecoder must have been imported with Cu.importGlobalProperties(['TextDecoder']);
	
	var deferred_read_encoded = new Deferred();
	
	if (options && !('encoding' in options)) {
		deferred_read_encoded.reject('Must pass encoding in options object, otherwise just use OS.File.read');
		return deferred_read_encoded.promise;
	}
	
	if (options && Services.vc.compare(Services.appinfo.version, 30) < 0) { // tests if version is less then 30
		//var encoding = options.encoding; // looks like i dont need to pass encoding to TextDecoder, not sure though for non-utf-8 though
		delete options.encoding;
	}
	var promise_readIt = OS.File.read(path, options);
	
	promise_readIt.then(
		function(aVal) {
			console.log('Fullfilled - promise_readIt - ', {a:{a:aVal}});
			// start - do stuff here - promise_readIt
			var readStr;
			if (Services.vc.compare(Services.appinfo.version, 30) < 0) { // tests if version is less then 30
				readStr = getTxtDecodr().decode(aVal); // Convert this array to a text
			} else {
				readStr = aVal;
			}
			deferred_read_encoded.resolve(readStr);
			// end - do stuff here - promise_readIt
		},
		function(aReason) {
			var rejObj = {name:'promise_readIt', aReason:aReason};
			console.error('Rejected - promise_readIt - ', rejObj);
			deferred_read_encoded.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promise_readIt', aCaught:aCaught};
			console.error('Caught - promise_readIt - ', rejObj);
			deferred_read_encoded.reject(rejObj);
		}
	);
	
	return deferred_read_encoded.promise;
}

function immediateChildPaths(path_dir) {
	// returns promise
	// path_dir is string to path of dir
	// resolves to hold array of all paths that are immediate children of path_dir
	var deferred_immediateChildPaths = new Deferred();
	
	var paths_children = [];
	var callback_collectChildPaths = function(entry) {
		paths_children.push(entry.path);
	};
	
	var itr_pathDir = new OS.File.DirectoryIterator(path_dir);
	var promise_collectChildPaths = itr_pathDir.forEach(callback_collectChildPaths);
	promise_collectChildPaths.then(
		function(aVal) {
			itr_pathDir.close();
			console.log('Fullfilled - promise_collectChildPaths - ', aVal);
			// start - do stuff here - promise_collectChildPaths
			deferred_immediateChildPaths.resolve(paths_children);
			// end - do stuff here - promise_collectChildPaths
		},
		function(aReason) {
			itr_pathDir.close();
			var rejObj = {name:'promise_collectChildPaths', aReason:aReason};
			console.error('Rejected - promise_collectChildPaths - ', rejObj);
			deferred_immediateChildPaths.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			itr_pathDir.close();
			var rejObj = {name:'promise_collectChildPaths', aCaught:aCaught};
			console.error('Caught - promise_collectChildPaths - ', rejObj);
			deferred_immediateChildPaths.reject(rejObj);
		}
	);
	
	return deferred_immediateChildPaths.promise;
}
function aReasonMax(aReason) {
	var deepestReason = aReason;
	while (deepestReason.hasOwnProperty('aReason') || deepestReason.hasOwnProperty()) {
		if (deepestReason.hasOwnProperty('aReason')) {
			deepestReason = deepestReason.aReason;
		} else if (deepestReason.hasOwnProperty('aCaught')) {
			deepestReason = deepestReason.aCaught;
		}
	}
	return deepestReason;
}
function longestInCommon(candidates, index) {
	//my mods
  if (!index) {
    index = 0;
  }
  if (candidates.length == 0) {
    return '';
  }
  //end my mods
// source: http://stackoverflow.com/a/1897480/1828637
// finds the longest common substring in the given data set.
// takes an array of strings and a starting index
  var i, ch, memo
  do {
    memo = null
    for (i=0; i < candidates.length; i++) {
      ch = candidates[i].charAt(index)
      if (!ch) break
      if (!memo) memo = ch
      else if (ch != memo) break
    }
  } while (i == candidates.length && ++index)

  return candidates[0].slice(0, index)
}

function isLittleEndian() {
	var buffer = new ArrayBuffer(2);
	new DataView(buffer).setInt16(0, 256, true);
	return new Int16Array(buffer)[0] === 256;
};

/*
var HashString = (function (){
	/**
	 * Javascript implementation of
	 * https://hg.mozilla.org/mozilla-central/file/0cefb584fd1a/mfbt/HashFunctions.h
	 * aka. the mfbt hash function.
	 * / 
  // Note: >>>0 is basically a cast-to-unsigned for our purposes.
  const encoder = getTxtEncodr();
  const kGoldenRatio = 0x9E3779B9;

  // Multiply two uint32_t like C++ would ;)
  const mul32 = (a, b) => {
    // Split into 16-bit integers (hi and lo words)
    let ahi = (a >> 16) & 0xffff;
    let alo = a & 0xffff;
    let bhi = (b >> 16) & 0xffff
    let blo = b & 0xffff;
    // Compute new hi and lo seperately and recombine.
    return (
      (((((ahi * blo) + (alo * bhi)) & 0xffff) << 16) >>> 0) +
      (alo * blo)
    ) >>> 0;
  };

  // kGoldenRatioU32 * (RotateBitsLeft32(aHash, 5) ^ aValue);
  const add = (hash, val) => {
    // Note, cannot >> 27 here, but / (1<<27) works as well.
    let rotl5 = (
      ((hash << 5) >>> 0) |
      (hash / (1<<27)) >>> 0
    ) >>> 0;
    return mul32(kGoldenRatio, (rotl5 ^ val) >>> 0);
  }

  return function(text) {
    // Convert to utf-8.
    // Also decomposes the string into uint8_t values already.
    let data = encoder.encode(text);

    // Compute the actual hash
    let rv = 0;
    for (let c of data) {
      rv = add(rv, c | 0);
    }
    return rv;
  };
})();
*/

function enumChildEntries(pathToDir, delegate, max_depth, runDelegateOnRoot, depth) {
	// IMPORTANT: as dev calling this functiopn `depth` arg must ALWAYS be undefined (dont even set it to 0 or null, must completly omit setting it, or set it to undefined). this arg is meant for internal use for iteration
	// `delegate` is required
	// pathToDir is required, it is string
	// max_depth should be set to null/undefined if you want to enumerate till every last bit is enumerated. paths will be iterated to including max_depth.
	// if runDelegateOnRoot, then delegate runs on the root path with depth arg of -1
	// this function iterates all elements at depth i, then after all done then it iterates all at depth i + 1, and then so on
	// if arg of `runDelegateOnRoot` is true then minimum depth is -1 (and is of the root), otherwise min depth starts at 0, contents of root
	// if delegate returns true, it will stop iteration
	// if set max_depth to 0, it will just iterate immediate children of pathToDir, unlesss you set runDelegateOnRoot to true, then it will just run delegate on the root
	var deferredMain_enumChildEntries = new Deferred();
	
	if (depth === undefined) {
		// at root pathDir
		depth = 0;
		if (runDelegateOnRoot) {
			var entry = {
				isDir: true,
				name: OS.Path.basename(pathToDir),
				path: pathToDir
			};
			var rez_delegate = delegate(entry, -1);
			if (rez_delegate) {
				deferredMain_enumChildEntries.resolve(entry);
				return deferredMain_enumChildEntries.promise; // to break out of this func, as if i dont break here it will go on to iterate through this dir
			}
		}
	} else {
		depth++;
	}
	
	if ((max_depth === null || max_depth === undefined) || (depth <= max_depth)) {
		var iterrator = new OS.File.DirectoryIterator(pathToDir);
		var subdirs = [];
		var promise_batch = iterrator.nextBatch();
		// :TODO: iterrator.close() somewhere!! maybe here as i dont use iterrator anymore after .nextBatch()
		promise_batch.then(
			function(aVal) {
				iterrator.close();
				console.log('Fullfilled - promise_batch - ', aVal);
				// start - do stuff here - promise_batch
				for (var i = 0; i < aVal.length; i++) {
					if (aVal[i].isDir) {
						subdirs.push(aVal[i]);
					}
					var rez_delegate_on_child = delegate(aVal[i], depth);
					if (rez_delegate_on_child) {
						deferredMain_enumChildEntries.resolve(aVal[i]);
						return/* deferredMain_enumChildEntries.promise -- im pretty sure i dont need this, as of 040115*/; //to break out of this if loop i cant use break, because it will get into the subdir digging, so it will not see the `return deferredMain_enumChildEntries.promise` after this if block so i have to return deferredMain_enumChildEntries.promise here
					}
				}
				// finished running delegate on all items at this depth and delegate never returned true

				if (subdirs.length > 0) {
					var promiseArr_itrSubdirs = [];
					for (var i = 0; i < subdirs.length; i++) {
						promiseArr_itrSubdirs.push(enumChildEntries(subdirs[i].path, delegate, max_depth, null, depth)); //the runDelegateOnRoot arg doesnt matter here anymore as depth arg is specified
					}
					var promiseAll_itrSubdirs = Promise.all(promiseArr_itrSubdirs);
					promiseAll_itrSubdirs.then(
						function(aVal) {
							console.log('Fullfilled - promiseAll_itrSubdirs - ', aVal);
							// start - do stuff here - promiseAll_itrSubdirs
							deferredMain_enumChildEntries.resolve('done iterating all - including subdirs iteration is done - in pathToDir of: ' + pathToDir);
							// end - do stuff here - promiseAll_itrSubdirs
						},
						function(aReason) {
							var rejObj = {name:'promiseAll_itrSubdirs', aReason:aReason};
							rejObj.aExtra = 'meaning finished iterating all entries INCLUDING subitering subdirs in dir of pathToDir';
							rejobj.pathToDir = pathToDir;
							console.error('Rejected - promiseAll_itrSubdirs - ', rejObj);
							deferredMain_enumChildEntries.reject(rejObj);
						}
					).catch(
						function(aCaught) {
							var rejObj = {name:'promiseAll_itrSubdirs', aCaught:aCaught};
							console.error('Caught - promiseAll_itrSubdirs - ', rejObj);
							deferredMain_enumChildEntries.reject(rejObj);
						}
					);
				} else {
					deferredMain_enumChildEntries.resolve('done iterating all - no subdirs - in pathToDir of: ' + pathToDir);
				}
				// end - do stuff here - promise_batch
			},
			function(aReason) {
				iterrator.close();
				var rejObj = {name:'promise_batch', aReason:aReason};
				if (aReason.winLastError == 2) {
					rejObj.probableReason = 'directory at pathToDir doesnt exist';
				}
				console.error('Rejected - promise_batch - ', rejObj);
				deferredMain_enumChildEntries.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				iterrator.close();
				var rejObj = {name:'promise_batch', aCaught:aCaught};
				console.error('Caught - promise_batch - ', rejObj);
				deferredMain_enumChildEntries.reject(rejObj);
			}
		);
	} else {
		deferredMain_enumChildEntries.resolve('max depth exceeded, so will not do it, at pathToDir of: ' + pathToDir);
	}

	return deferredMain_enumChildEntries.promise;
}

function win_RegTypeStr_from_RegTypeInt(int) {
  if (int == 1) {
    return 'String';
  } else if (int == 3) {
    return 'Binary';
  } else if (int == 4) {
    return 'Int';
  } else if (int == 11) {
    return 'Int64';
  } else if (int == 0) {
    return 'NONE';
  } else {
    throw new Error('keyval.Type is not any of the expected values of 0, 2, 3, 4, or 11 so am now confused. keyval.Type == `' + int + '`');
  }
}
function SIPWorker(workerScopeName, aPath, aCore=core) {
	// "Start and Initialize PromiseWorker"
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`
	
	// :todo: add support and detection for regular ChromeWorker // maybe? cuz if i do then ill need to do ChromeWorker with callback
	
	var deferredMain_SIPWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new PromiseWorker(aPath);
		
		//aCore = JSON.parse(JSON.stringify(aCore));
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var promise_initWorker = bootstrap[workerScopeName].post('init', [aCore]);
		promise_initWorker.then(
			function(aVal) {
				console.log('Fullfilled - promise_initWorker - ', aVal);
				// start - do stuff here - promise_initWorker
				deferredMain_SIPWorker.resolve(true);
				// end - do stuff here - promise_initWorker
			},
			function(aReason) {
				var rejObj = {name:'promise_initWorker', aReason:aReason};
				console.error('Rejected - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_initWorker', aCaught:aCaught};
				console.error('Caught - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		);
		
	} else {
		deferredMain_SIPWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SIPWorker.promise;
	
}
function isDOMWindowFocused(aDOMWindow) {
	// http://stackoverflow.com/questions/27179766/how-to-test-if-window-is-currently-focused/27323849#27323849

	let childTargetWindow = {};
	Services.focus.getFocusedElementForWindow(aDOMWindow, true, childTargetWindow);
	childTargetWindow = childTargetWindow.value;

	let focusedChildWindow = {};
	if (Services.focus.activeWindow) {
		Services.focus.getFocusedElementForWindow(Services.focus.activeWindow, true, focusedChildWindow);
		focusedChildWindow = focusedChildWindow.value;
	}

	return (focusedChildWindow === childTargetWindow);
}
// end - common helper functions