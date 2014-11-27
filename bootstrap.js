const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Profilist',
	id: 'Profilist@jetpack',
	chrome_path: 'chrome://profilist/content/',
	aData: 0,
};

const myPrefBranch = 'extensions.' + self.name + '@jetpack.';
const tbb_box_style = '';
const tbb_style = ''; //old full style::-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);
const BreakException = {};

const myServices = {};
var cssUri;
var collapsedheight = 0; //holds height stack should be when collapsed
var expandedheight = 0; //holds height stack should be when expanded
var stackDOMJson = []; //array holding menu structure in stack /*:note: :important:must insert the "Default: profile" into stackDOMJson last as last element in stack is top most*/
var unloaders = {};
var PUIsync_height;
var PUIsync;

var updateChannel = '';
var devBuildsStrOnLastUpdateToGlobalVar = ''; //named this for global var instead of dom as im thinking of making it not update all windows, just update the current window on menu panel show
var currentThisBuildsIconPath = '';

//var pathProfilesIni = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
//var pathProfilesIniBkp = profToolkit.path_iniFile + '.profilist.bkp';

const { TextDecoder } = Cu.import("resource://gre/modules/commonjs/toolkit/loader.js", {});
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm');
//XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });
XPCOMUtils.defineLazyGetter(myServices, 'tps', function(){ return Cc['@mozilla.org/toolkit/profile-service;1'].createInstance(Ci.nsIToolkitProfileService) });
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });
XPCOMUtils.defineLazyGetter(myServices, 'dsp', function () { return Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties) });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle('chrome://profilist/locale/bootstrap.properties?' + Math.random()) /* Randomize URI to work around bug 719376 */ });
var PromiseWorker;
var ProfilistWorker;

var ini = {UnInitialized:true};
var iniStr = ''; //str of ini on last read
var iniStr_thatAffectsDOM = ''; //str of ini on last read (but just the props that affect dom) (so like properties like Profilist.launch_on_create doesnt affect dom as the function creatProfile checks this Profilist.launch_on_create property when deciding to launch or not
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
		name: 0
	} //reference to the profiles object but to the current profile in the profiles object
};

var decoder = 0;
var encoder = 0;

var iniStr_thatAffectDOM = '';
var iniObj_thatAffectDOM = {};
//learned: that if StartWithLastProfile=1 then profile manager/startup obeys the Default=1 but note that Default=1 is never removed
var iniKeys_thatAffectDOM = ['Profilist.dev', 'Profilist.dev-builds'/*, 'StartWithLastProfile'*/, 'Default', 'Name', 'Profilist.tie']; // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
/*
//keys that i add to thatAffectDOM object:
num - outside of props // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
Profilist.defaultProfilePath
Profilist.defaultProfileIsRelative - (not outside of props as if deafultProfilePath doesnt change this obviously doesnt change)
Profilist.currentThisBuildsIconPath
*/
function readIniAndParseObjs() {
//is promise
//reads ini and if its not touched by profilist, then it reads bkp, if bkp doesnt exist than it touches ini and queus writeIniBkp and writeIni
/* //updates:
ini
iniStr
iniStr_thatAffectDOM
watchBranches[myPrefBranch]
current builds icon if dev mode is enabled
*/
	try {
		var promise_readIniAndParseObjs = Promise.defer();
		var promise_iniObjFinalized = Promise.defer();
		promise_iniObjFinalized.then(
			function(aVal) {
				console.error('Success', 'promise_iniObjFinalized');
				//parse objs
				iniStr = readStr; //or can do JSON.stringify(ini);
				//iniStr_thatAffectDOM
				iniObj_thatAffectDOM = {};
				for (var k=0; k<iniKeys_thatAffectDOM.length; k++) {
					for (var p in ini) {
						if (iniKeys_thatAffectDOM[k] in ini[p].props) {
							if (iniKeys_thatAffectDOM[k] == 'Default') {
								var defaultProfilePath = ini[p].props['Path'];
								var defaultProfileIsRelative = ini[p].props['IsRelative'];
							}
							iniObj_thatAffectDOM[p].props[iniKeys_thatAffectDOM[k]] = ini[p].props[iniKeys_thatAffectDOM[k]];
						}
						if ('num' in ini[p]) { // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ 
							iniObj_thatAffectDOM[p].num = ini[p].num;
						}
					}
				}
				//iniStr_thatAffectDOM = JSON.stringify(iniObj_thatAffectDOM); //dont do this here as i need to first update currentThisBuildsIconPath
				
				//update watchBranches[myPrefBranch]
				for (var pref_name_in_obj in myPrefListener.watchBranches[myPrefBranch].prefNames) {
					var pref_name_in_ini = 'Profilist.' + pref_name_in_obj;
					if (pref_name_in_ini in ini.General.props) {
						var prefValInPrefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].value;
						var prefValInIni = ini.General.props[pref_name_in_ini];
						if (myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].type == Ci.nsIPrefBranch.PREF_BOOL) {
							if (prefValInIni == 'false' || prefValInIni == '0') {
								prefValInIni = false;
							} else if (prefValInIni == 'true' || prefValInIni == '1') {
								prefValInIni = true;
							}
						}
						if (prefValInIni != prefValInPrefObj) {
							myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj].setval(prefValInIni, true); //i dont have to pass seoncd arg of true, as the onChange listener will see that the ini value is == newVal so it wont writeIni
						}
					} else {
						//take value from pref and write it to ini
						ini.General.props['Profilist.' + pref_name_in_ini] = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_ini].value;
						//note:todo:11/14/14 112a: i edited in something to ini, so i should do a writeIni or mark it so that a writeIni is done sometime
					}
				}
				
				//update icon `currentThisBuildsIconPath`
				if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'] == true) { //if (ini.General.props['Profilist.dev'] == 'true') { //OR I can test `if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'] == true) {` but if i use this pref test method then i need to update watch branches block before this currentBuildIcons
				
				
					//start the generic-ish check stuff
					var devBuilds = JSON.parse(myPrefListener.watchBranches[myPrefBranch].prefNames['dev-builds']); //can instead use `JSON.parse(ini.General.props['Profilist.dev-builds'])` here
					//var OLDcurrentThisBuildsIconPath = currentThisBuildsIconPath;
					//start - figure out from dev_builds_str what icon path should be
					try {
						devBuilds.forEach(function(b) {
							if (b[1].toLowerCase() == profToolkit.exePathLower) {
								if (/^(?:release|beta|aurora|nightly)$/m.test(b[0])) {
									console.log('making bullet');
									currentThisBuildsIconPath = self.chrome_path + 'bullet_' + b[0] + '.png';
								} else {
									currentThisBuildsIconPath = OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.userApplicationDataDir, b[0])) + '#' + Math.random();
								}
								throw BreakException;
							}
						});
						//if got here, then it didnt throw BreakException so that means it didnt find an icon so use default branding
						if (updateChannel == '') {
							updateChannel = Services.prefs.getCharPref('app.update.channel');
						}
						if (updateChannel.indexOf('beta') > -1) { //have to do this because beta branding icon is same as release, so i apply my custom beta bullet png
							currentThisBuildsIconPath = self.chrome_path + 'bullet_beta.png';
						} else {
							currentThisBuildsIconPath = 'chrome://branding/content/icon16.png';
						}
					} catch (ignore if ex === BreakException) {}
					//end - figure out from dev_builds_str what icon path should be
					/*
					if (currentThisBuildsIconPath != OLDcurrentThisBuildsIconPath) {
						//icon of currentThisBuildsIconPath CHANGED
						//console.log('icon of currentThisBuildsIconPath CHANGED');
						//icon_changed = true;
						//devBuildsStrOnLastUpdateToGlobalVar = dev_builds_str;
					} else {
						//icon of currentThisBuildsIconPath is unchanged
						//console.log('icon of currentThisBuildsIconPath is unchanged')
					}
					*/
					//end the generic-ish check stuff
				
					//have to add this in as another prop because its possible that currentThisBuildsIconPath can change even though Profilist.dev did not (ie: it reamined true)
					//actually ignore this crap comment on right::: i think i sould set selectedProfile here //i dont figure out the default=1 profile and add is prop as that can be done on run time, that inf
					iniObj_thatAffectDOM.General.props['Profilist.currentThisBuildsIconPath'] = currentThisBuildsIconPath; //important: note: so remember, iniObj_thatAffectDOM the _thatAffectDOM stuff is just read only, never read from it to save to ini
				}
				
				//update which profile is the Default profile
				if (ini.General.props.StartWithLastProfile == '1') {
					if (defaultProfilePath) {
						iniObj_thatAffectDOM.General.props['Profilist.defaultProfilePath'] = defaultProfilePath; //important: note: so remember, iniObj_thatAffectDOM the _thatAffectDOM stuff is just read only, never read from it to save to ini
						iniObj_thatAffectDOM.General.props['Profilist.defaultProfileIsRelative'] = defaultProfileIsRelative; //important: note: so remember, iniObj_thatAffectDOM the _thatAffectDOM stuff is just read only, never read from it to save to ini
					} else {
						console.warn('start with last profile is 1 however no default profile marked in ini');
					}
				} else {
					//its 0
					delete iniObj_thatAffectDOM[defaultProfilePath].props.Default;
				}
				
				iniStr_thatAffectDOM = JSON.stringify(iniObj_thatAffectDOM);
				
				
				//figure selectedProfile.name					
				//get from selectedProfile.rootDirPath to iniPath format to get its name
				if (profToolkit.selectedProfile.relativeDescriptor_rootDirPath !== null) {
					//its possible to be relative
					profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.relativeDescriptor_rootDirPath].props.Name;
				} else {
					//its absolute
					profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.rootDirPath].props.Name;
				}
				
				if (!profToolkit.selectedProfile.name) { //probably null
					console.warn('this profile at path does not exist, so its a temporary profile');
					profToolkit.selectedProfile.name = 'Temporary Profile'; //as it has no name
					profToolkit.selectedProfile.iniKey = null;
				} else {
					profToolkit.selectedProfile.iniKey = profToolkit.selectedProfile.relativeDescriptor_rootDirPath ? profToolkit.selectedProfile.relativeDescriptor_rootDirPath : profToolkit.selectedProfile.rootDirPath;
				}
				
				promise_readIniAndParseObjs.resolve('objs parsed');
			},
			function(aReason) {
				console.error('Rejected', 'promise_iniObjFinalized', 'aReason:' + aReason.message);
				promise_readIniAndParseObjs.reject('Rejected promise_iniObjFinalized aReason:' + aReason.message);
				//return Promise.reject('Rejected promise_iniObjFinalized aReason:' + aReason.message);
			}
		);
		///////////
		//start - read the ini file and if needed read the bkp to create the ini object
	//	console.log('in read');
	//	console.log('decoder got');
	//	console.log('starting read');
		if (Services.vc.compare(Services.appinfo.version, 30) < 0) {
			var promise_readIni = OS.File.read(profToolkit.path_iniFile); // Read the complete file as an array
		} else {
			var promise_readIni = OS.File.read(profToolkit.path_iniFile, {encoding:'utf-8'});
		}
	//	console.log('read promise started');
		promise_readIni.then(
			function(aVal) {
				console.log('Success', 'promise_readIni',
				if (Services.vc.compare(Services.appinfo.version, 30) < 0) {
					if (!decoder) {
						decoder = new TextDecoder(); // This decoder can be reused for several reads
					}
					var readStr = decoder.decode(aVal); // Convert this array to a text
				} else {
					var readStr = aVal;
				}
				//console.log('radStr:', readStr);
				ini = {};
				var patt = /\[(.*?)(\d*?)\](?:\s+?(.+?)=(.*))(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?(?:\s+?(.+?)=(.*))?/mg; //supports 10 lines max per block `(?:\s+?(.+?)=(.*))?` repeat that at end
				var blocks = [];

				var match;
				while (match = patt.exec(readStr)) {
	//				//console.log('MAAAAAAAAAAATCH', match);

					var group = match[1];
					ini[group] = {};

					if (group == 'Profile') {
						ini[group]['num'] = match[2];
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
				if (readStr.indexOf('Profilist.touched=') > -1) { //note: Profilist.touched is json.stringify of an array holding paths it profilist was installed from, on uninstall it should remove self path from Profilist.touched and if its empty then it should prompt to delete all profilist settings & files
					promise_iniObjFinalized.resolve('ini object finalized via non-bkp');
					//return Promise.resolve('Success promise_readIni',);
				} else {
					//ini was not touched
					//so read from bkp and update ini with properties that are missing
					if (Services.vc.compare(Services.appinfo.version, 30) < 0) {
						var promise_readIniBkp = OS.File.read(profToolkit.path_iniBkpFile); // Read the complete file as an array
					} else {
						var promise_readIniBkp = OS.File.read(profToolkit.path_iniBkpFile, {encoding:'utf-8'});
					}
					promise_readIniBkp.then(
						function() {
							console.log('Success', 'promise_readIniBkp');
							if (Services.vc.compare(Services.appinfo.version, 30) < 0) {
								//dont need the decoder check here as already did that above
								var readStr = decoder.decode(aVal); // Convert this array to a text
							} else {
								var readStr = aVal;
							}
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
									iniBkp[group]['num'] = match[2];
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
							var somethingResotredFromBkpToIni = false;
							for (var p in ini) {
								if (p in iniBkp) {
									for (var sub_p in iniBkp[p]) {
										if (sub_p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
											somethingResotredFromBkpToIni = true;
											ini[p][sub_p] = iniBkp[p][sub_p];
										}
									}
									if ('num' in ini[p]) {
										//its a profile entry
										for (var sub_p in iniBkp[p].props) {
											if (sub_p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
												somethingResotredFromBkpToIni = true;
												ini[p].props[sub_p] = iniBkp[p].props[sub_p];
											}
										}
									}
								}
							}
							if (somethingResotredFromBkpToIni) {
								iniStr = JSON.stringify(ini);
							}
							promise_iniObjFinalized.resolve('ini object finalized via bkp');
						},
						function() {
							console.error('Rejected', 'promise_readIniBkp', 'aReason:', aReason);
							promise_iniObjFinalized.reject('Profiles.ini was not touched by Profilist and .profilist.bkp could not be read. ' + aReason.message);
						}
					);
				}
			},
			function(aReason) {
				console.error('Rejected', 'promise_readIni', 'aReason:', aReason);
				promise_iniObjFinalized.reject('Profiles.ini could not be read. ' + aReason.message);
				//return Promise.reject('Profiles.ini could not be read. ' + aReason.message);
			}
		);
		//end - read the ini file and if needed read the bkp to create the ini object
		return promise_readIniAndParseObjs.promise;
	} catch (ex) {
		console.error('Promise Rejected `readIni` - ', ex);
		return Promise.reject('Promise Rejected `readIni` - ' + ex);
	}
}

function writeIniAndBkp() {
	//is promise
	//writes ini to files
	try {
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
					console.warn('profileI != blockNum', profileI, blockNum); //this is a problem because the order profiles show in profiles.ini is how i show them in stack, and things like promise_all_updateProfStatuses uses that order to figure out which childNode is which profile
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

			
			writeStr.push('[' + group + ']');
			blockLines.push('[' + group + ']');
			
			for (var p2 in ini[p].props) {
				writeStr.push(p2 + '=' + ini[p].props[p2]);
				blockLines.push(p2 + '=' + ini[p].props[p2]);
			}

			blockLines.push('');
			
			blocksToWriteWithGroupOrder.push([blockNum, blockLines.join('\n');
		}

		blocksToWriteWithGroupOrder.sort(function(a, b) {
			return a[0] > b[0];
		});
		
		for (var i=0; i<blocksToWriteWithGroupOrder.length; i++) {
			writeStr.push(blocksToWriteWithGroupOrder[i][1]);
		}
		//writeStr[writeStr.length - 1] = '\n'; //we want double new line at end of file
		writeStr.push('');

		var writeStrJoined = writeStr.join('\n');
		
		var promise_writeIni = OS.File.writeAtomic(profToolkit.path_iniFile, writeStrJoined, {tmpPath:profToolkit.path_iniFile + '.profilist.tmp', encoding:'utf-8'});
		var promise_writeIniBkp = OS.File.writeAtomic(profToolkit.path_iniBkpFile, writeStrJoined, {tmpPath:profToolkit.path_iniBkpFile + '.profilist.tmp', encoding:'utf-8'});
		promise_writeIniBkp.then(
			function() {
				console.log('Success', 'promise_writeIniBkp');
			},
			function(aReason) {
				console.error('Rejected', 'promise_writeIniBkp', 'aReason:', aReason);
			}
		);
		return promise_writeIni.then(
			function() {
				console.log('Success', 'promise_writeIni');
				return Promise.resolve('Success, promise_writeIni');
			},
			function(aReason) {
				console.error('Rejected', 'promise_writeIni', 'aReason:', aReason);
				return Promise.reject('Profiles.ini could not be be written to disk. ' + aReason.message);
			}
		);
	} catch(ex) {
		console.error('Rejected', 'writeIniAndBkp', 'ex:', ex);
		return Promise.reject('Rejected `writeIniAndBkp` - ' + ex);
	}
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
function createProfile(refreshIni, profName) {
//is promise
	try {
		//refreshIni is 0,1 or programmatically 2
		if (refreshIni == 1) {
			var promise = readIni();
			return promise.then(
				function() {
	//				console.log('now that ini read it will now createProfile with name = ' + profName);
					return createProfile(2, profName);
				},
				function(aRejectReason) {
	//				console.error('Failed to refresh ini object from file during renameProfile');
					return Promise.reject(aRejectReason.message);
				}
			);
		} else {
	//		console.log('in createProfile create part');
			if (profName in ini) {
				//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot create profile with name "' + newName + '" because this name is already taken by another profile.');
				return Promise.reject('Cannot create profile with name "' + newName + '" because this name is already taken by another profile.');
			}
			//create folder in root dir (in it, one file "times.json" with contents:
			/*
			{
			"created": 1395861287491
			}

			*/
			//todo: im curious i should ask at ask.m.o how come when profile is custom driectory, a folder in local path is not created, of course the one to the custom path will be root. b ut why not make a local folder? like is done for IsRelative createds?
			//create folder in local dir if root dir is different (this one is empty)
			//add to profiles ini
			//check if profile exists first
			var numProfiles = profToolkit.profileCount; //Object.keys(ini) - 1;
			var dirName = saltName(profName);
			
			//get relative path
			var mRootDir = new FileUtils.File(OS.Constants.Path.userApplicationDataDir);
			var IniPathStr = FileUtils.getFile('DefProfRt', [dirName]);
			var PathToWriteToIni = IniPathStr.getRelativeDescriptor(mRootDir); //returns "Profiles/folderName"
			//end get relative path
			
			ini[profName] = {
				num: numProfiles,
				props: {
					Name: profName,
					IsRelative: 1,
					Path: PathToWriteToIni
				}
			}
	//		console.log('created ini entry for profName', ini[profName]);

			var rootPathDefaultDirName = OS.Path.join(profToolkit.rootPathDefault, dirName);
			var localPathDefaultDirName = OS.Path.join(profToolkit.localPathDefault, dirName);
	//		console.log('rootPathDefaultDirName=',rootPathDefaultDirName);
	//		console.log('localPathDefaultDirName=',localPathDefaultDirName);
			/*
			var profilesIniUpdateDone;
			var rootDirMakeDirDone;
			var localDirMakeDirDone;
			var checkReadyAndLaunch = function() {
				if (!profilesIniUpdateDone) {
	//				console.warn('profiles ini update not yet done');
				}
				if (!rootDirMakeDirDone) {
	//				console.warn('root dir not yet made');
				}
				if (profToolkit.rootPathDefault == profToolkit.localPathDefault) {
					localDirMakeDirDone = true; //i dont have to check if rootDirMakeDirDone to set this to true, because when both paths are same we dont make a local dir
				}
				if (!localDirMakeDirDone) {
	//				console.warn('local dir not yet made');
				}
				if (profilesIniUpdateDone && rootDirMakeDirDone && localDirMakeDirDone) {
					myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Creating Profile', 'Default Name: "' + profName + '"', false, null, null, 'Profilist');
					launchProfile(null, profName, 1, self.aData.installPath.path);
	//				console.log('profile launched and now updating prof toolkit with refreshIni 1');
					return updateProfToolkit(1, 1);
				}
			}
			*/
	//		console.log('starting promise for make root dir');
			var PromiseAllArr = [];
			var promise = OS.File.makeDir(rootPathDefaultDirName);
			promise.then(
				function() {
	//				console.log('successfully created root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
					var writeStrForTimesJson = '{\n"created": ' + new Date().getTime() + '}\n';
					var timeJsonPath = OS.Path.join(rootPathDefaultDirName, 'times.json');
					let promise3 = OS.File.writeAtomic(timeJsonPath, writeStrForTimesJson, {tmpPath: timeJsonPath + '.profilist.tmp', encoding:'utf-8'});
					return promise3.then(
						function() {
//							console.log('succesfully created times.json for profName of ' + profName + ' path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
							//rootDirMakeDirDone = true;
							//checkReadyAndLaunch();
							return Promise.resolve('succesfully created rootPathDefaultDirName and times.json');
						},
						function() {
//							console.error('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
							return Promise.reject('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ' + OS.Path.join(rootPathDefaultDirName, 'times.json'));
						}
					);
				},
				function() {
	//				console.error('FAILED to create root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
					return Promise.reject('FAILED to create root dir for profile ' + profName + ' the path is = ' + rootPathDefaultDirName);
				}
			);
			PromiseAllArr.push(promise);
			if (profToolkit.rootPathDefault != profToolkit.localPathDefault) {
				var promise2 = OS.File.makeDir(localPathDefaultDirName);
				promise2.then(
					function() {
	//					console.log('successfully created local dir for profile ' + profName + ' the path is = ', localPathDefaultDirName);
						//localDirMakeDirDone = true;
						//checkReadyAndLaunch();
						return Promise.resolve('localPathDefaultDirName made');
					},
					function() {
	//					console.error('FAILED to create local dir for profile "' + profName + '" the path is = ', localPathDefaultDirName);
						return Promise.reject('FAILED to create local dir for profile "' + profName + '" the path is = ' + localPathDefaultDirName);
					}
				);
				PromiseAllArr.push(promise2);
			}
			var promise4 = writeIni();
			promise4.then(
				function() {
	//				console.log('SUCCESS on updating ini with new profile');
					//profilesIniUpdateDone = true;
					//checkReadyAndLaunch();
					return Promise.resolve('writeIni success');
				},
				function() {
	//				console.log('updating ini with newly created profile failed');
					return Promise.reject('updating ini with newly created profile failed');
				}
			);
			PromiseAllArr.push(promise4);
			
			return Promise.all(PromiseAllArr).then(
				function onSuc(aDat) {
					//checkReadyAndLaunch();
					myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Creating Profile', 'Default Name: "' + profName + '"', false, null, null, 'Profilist');
					launchProfile(null, profName, 1, self.aData.installPath.path);
	//				console.log('profile launched and now updating prof toolkit with refreshIni 1');
					return updateProfToolkit(1, 1).then(
						function() {
							return Promise.resolve('updateProfToolkit success');
						},
						function() {
							return Promise.reject('updateProfToolkit failed');
						}
					);
				},
				function onRej(aReas) {
					console.error('PromiseAllArr of failed:', aReas);
					return Promise.reject('PromiseAllArr of failed:' + aReas);
				}
			);
			//see here: http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js
			
	/*
	29     var dirService = C["@mozilla.org/file/directory_service;1"].getService(I.nsIProperties);
	30     gDefaultProfileParent = dirService.get("DefProfRt", I.nsIFile);
	73   var defaultProfileDir = gDefaultProfileParent.clone();
	74   defaultProfileDir.append(saltName(document.getElementById("profileName").value));
	75   gProfileRoot = defaultProfileDir;
	*/

			//see here for internal: http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/profileSelection.js#139
			//actually see here for internal: http://mxr.mozilla.org/mozilla-central/source/toolkit/profile/nsToolkitProfileService.cpp#699
			
		}
	} catch(ex) {
		console.error('Promise Rejected `createProfile` - ', ex);
		return Promise.reject('Promise Rejected `createProfile` - ' + ex);
	}
}

function renameProfile(refreshIni, profName, newName) {
	try {
		//refreshIni is 0,1 or programmatically 2
		if (refreshIni == 1) {
			var promise = readIni();
			return promise.then(
				function() {
	//				console.log('starting programattic rename');
					return renameProfile(2, profName, newName);
				},
				function(aRejectReason) {
	//				console.error('Failed to refresh ini object from file during renameProfile');
					return Promise.reject(aRejectReason.message);
				}
			);
		} else {
			//check if name is taken
			if (profName in ini == false) {
				Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot rename it.');
				return Promise.reject('Cannot find profile name, "' + profName + '", in Profiles.ini in memory.');
			}
			if (newName in ini) {
	//			console.error('Profile name of "' + newName + '" is already taken.');
				//Services.prompt.alert(null, self.name + ' - ' + 'Rename Error', 'Cannot rename to "' + newName + '" because this name is already taken by another profile.');
	//			console.error('Profile name of "' + newName + '" is already taken.');
	//			console.log('got to this pre line');
				throw new Error('Cannot rename this profile to "' + newName + '" because this name is already taken by another profile.');
	//			console.log('got to this post line');
			}
			ini[profName].props.Name = newName; //NOTE: LEARNED: learned something about self programming, no need to delete ini[profName] and create ini[newName] because when writeIni it doesn't use the key, the key is just for my convenience use in programming
			/* for (var i=0; i<stackDOMJson.length; i++) { // no longer do this block because what if renamed from another profile, it wont catch it then
				if (stackDOMJson[i].props.profpath == ini[profName].props.Path) {
					stackDOMJson[i].label = newName;
					break;
				}
			} */
			var promise = writeIni();
			return promise.then(
				function() {
	//				console.log('successfully edited name of ' + profName + ' to ' + newName + ' in Profiles.ini now refrehsing it');
					return updateProfToolkit(1, 1).then(
						function() {
							return Promise.resolve('updateProfToolkit success');
						},
						function() {
							return Promise.reject('updateProfToolkit failed');
						}
					);
				},
				function() {
	//				console.error('FAILED to edit name of ' + profName + ' to ' + newName + ' in Profiles.ini');
					return Promise.reject('FAILED to edit name of ' + profName + ' to ' + newName + ' in Profiles.ini');
				}
			);
		}
	} catch(ex) {
		console.error('Promise Rejected `renameProfile` - ', ex);
		return Promise.reject('Promise Rejected `renameProfile` - ' + ex);
	}
	
}

function deleteProfile(refreshIni, profName) {
	try {
		//refreshIni is 0,1 or programmatically 2
	//start check if profile in use
		if (profName == profToolkit.selectedProfile.name) {
			//cannot delete profile that is in use
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" is currently in use, cannot delete.');
			return Promise.reject('The profile, "' + profName + '", is currently in use.');
		} else {
			if (!(profName in ini)) {
				//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" could not be found in Profiles.ini in memory so could not delete.');
				return Promise.reject('The profile "' + profName + '" could not be found in Profiles.ini in memory.');
			}

	//		 console.log('found profile name in ini it is == ', ini[profName]);

		 }
	//end check if profile in use	 
		if (refreshIni == 1) {
			var promise = readIni();
			return promise.then(
				function() {
					return deleteProfile(2, profName);
				},
				function(aRejectReason) {
	//				console.error('Failed to refresh ini object from file on deleteProfile');
					return Promise.reject(aRejectReason.message);
				}
			);
		} else {
			//check if profile is in use and get the PathRootDir and PathLocalDir
			if (ini[profName].props.IsRelative == '1') {
				var dirName = OS.Path.basename(OS.Path.normalize(ini[profName].props.Path));
				var PathRootDir = OS.Path.join(profToolkit.rootPathDefault, dirName);
				var PathLocalDir = OS.Path.join(profToolkit.localPathDefault, dirName);
			} else {
				var PathRootDir = ini[profName].props.Path; //may need to normalize this for other os's than xp and 7  im not sure
				var PathLocalDir = null;
			}
			var promise_queryProfileLocked = ProfilistWorker.post('queryProfileLocked', [ini[profName].props.IsRelative, ini[profName].props.Path, profToolkit.rootPathDefault]);
			return promise_queryProfileLocked.then(
				function(aVal) {
					//aVal is TRUE if LOCKED
					//aVal is FALSE if NOT locked
					if (aVal) {
						return Promise.reject('Could not delete beacuse the profile, "' + profName + '", is currently in use.');
					} else {
						////do the delete
						var PromiseAllArr = [];
							
						var promise_DeleteRootDir = OS.File.removeDir(PathRootDir, {ignoreAbsent:true, ignorePermissions:false});
						promise_DeleteRootDir.then(
							function() {
								console.log('successfully removed PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir);
								return Promise.resolve('PathRootDir deleted');
							},
							function(aRejectReason) {
								console.error('FAILED to remove PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir, 'aRejectReason=', aRejectReason);
								return Promise.reject('FAILED to remove PathRootDir for profName of ' + profName);
							}
						);
						PromiseAllArr.push(promise_DeleteRootDir);
						
						if (PathLocalDir !== null && PathRootDir != PathLocalDir) {
							var promise_DeleteLocalDir = OS.File.removeDir(PathLocalDir, {ignoreAbsent:true, ignorePermissions:false});
							promise_DeleteLocalDir.then(
								function() {
									console.error('successfully removed PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir);
									return Promise.resolve('PathLocalDir deleted');
								},
								function(aRejectReason) {
									console.error('FAILED to remove PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir, 'aRejectReason=', aRejectReason);
									return Promise.reject('FAILED to remove PathLocalDir for profName of ' + profName);
								}
							);
							PromiseAllArr.push(promise_DeleteLocalDir);
						}
						
						var iniProfEntryBkp = JSON.stringify(ini[profName]);//used to restore to ini file on deletion fail
						delete ini[profName];
						
						var promise_UpdateIni = writeIni();
						promise_UpdateIni.then(
							function() {
				//				console.log('successfully edited out profName of ' + profName + ' from Profiles.ini');
								//done.ini = true;
								//checkReadyAndUpdateStack();
								return Promise.resolve('promise_UpdateIni=suc');
							},
							function() {
				//				console.error('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
								return Promise.reject('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
							}
						);
						PromiseAllArr.push(promise_UpdateIni);
						
						return Promise.all(PromiseAllArr).then(
							function(aDat) {
								console.log('ALLLL done so updateProfToolkit');
								return updateProfToolkit(1, 1).then(
									function() {
										return Promise.resolve('updateProfToolkit success');
									},
									function() {
										return Promise.reject('updateProfToolkit failed');
									}
								);
							},
							function onRej(aReas) {
								ini[profName] = JSON.parse(iniProfEntryBkp); //restore prof name details to profiles.ini as delete failed, this way they can try to delete again from profilist, else they have to try to delete from some other way which they probably dont know how
								console.error('Promise Rejected - `PromiseAllArr`:', aReas);
								return Promise.reject('Promise Rejected - `PromiseAllArr`:' + aReas);
							}
						);
						//end do the delete
					}
				},
				function(aReason) {
					console.error('failed to figure out if profile is in use, aReason:', aReason);
					return Promise.reject('Could not delete because failed to figure out if the profile, "' + profName + '", is in use.');
				}
			);
		}
	} catch(ex) {
		console.error('Promise Rejected `renameProfile` - ', ex);
		return Promise.reject('Promise Rejected `renameProfile` - ' + ex);
	}
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
			name: 0
		} //reference to the profiles object but to the current profile in the profiles object
	};
	
	profToolkit.exePath = myServices.dsp.get('XREExeF', Ci.nsIFile).path;
	profToolkit.exePathLower = profToolkit.exePath.toLowerCase();
	profToolkit.rootPathDefault =  myServices.dsp.get('DefProfRt', Ci.nsIFile).path; //FileUtils.getFile('DefProfRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.localProfileDir); //will work as long as at least one profile is in the default profile folder //i havent tested when only custom profile
//	console.log('initProfToolkit 1');
	profToolkit.localPathDefault = myServices.dsp.get('DefProfLRt', Ci.nsIFile).path //FileUtils.getFile('DefProfLRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.profileDir);
//	console.log('initProfToolkit 2');

	profToolkit.selectedProfile.rootDirPath = OS.Constants.Path.profileDir;
	profToolkit.selectedProfile.localDirPath = OS.Constants.Path.localProfileDir;
	
	profToolkit.selectedProfile.rootDirName = OS.Path.basename(profToolkit.selectedProfile.rootDirPath);
	profToolkit.selectedProfile.localDirName = OS.Path.basename(profToolkit.selectedProfile.localDirPath);
	
	//var profToolkit.path_iniFile = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
	//var profToolkit.path_iniBkpFile = profToolkit.path_iniFile + '.profilist.bkp';
	
	profToolkit.path_iniDir = OS.Constants.Path.userApplicationDataDir;
	profToolkit.path_iniFile = OS.Path.join(profToolkit.path_iniDir, 'profiles.ini');
	profToolkit.path_iniBkpFile = profToolkit.path_iniFile + '.profilist.bkp';
	
	profToolkit.nsIFile_iniDir = new FileUtils.File(profToolkit.path_iniDir); //for getRelativeDescriptor use
	
	if (profToolkit.selectedProfile.rootDirPath.indexOf(profToolkit.rootPathDefault) > -1) {
		//then its PROBABLY relative as its in the folder it should be
		var IniPathStr = new FileUtils.File(profToolkit.selectedProfile.rootDirPath); //OS.Path.join(profToolkit.rootPathDefault, profToolkit.selectedProfile.rootDirName);
		var PathToWriteToIni = IniPathStr.getRelativeDescriptor(profToolkit.nsIFile_iniDir); //returns "Profiles/folderName" /***console.time('blah'); var sep = sep.getRelativeDescriptor(sep2); console.timeEnd('blah'); console.log(sep); ~~~ 0.04ms***/
		profToolkit.selectedProfile.relativeDescriptor_rootDirPath = PathToWriteToIni;
	} else {
		//its not relative
		profToolkit.selectedProfile.relativeDescriptor_rootDirPath = null;
	}
	profToolkit.selectedProfile.iniKey = undefined; //note: i set it to undefined meaning it hasnt been verified yet, i set it to null for temp profile meaning name not found, i set it to string once it was verified
	
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

function updateOnPanelShowing(e, aDOMWindow, dontRefreshIni) { //returns promise
	//does not fire when entering customize mode
	
	//get aDOMWindow
	if (!aDOMWindow) {
		if (!e) {
			throw new Error('no e and no aDOMWindow');
			//return false;
			return Promise.reject('no e and no aDOMWindow');
		} else {
			//console.log('e on panel showing = ', e);
			//console.log('e.view == e.target.ownerDocument.defaultView == ', e.view == e.target.ownerDocument.defaultView); //is true!! at least when popup id is PanelUI-popup
			aDOMWindow = e.view;
			if (e.target.id != 'PanelUI-popup') {
				console.info('not main panel showing so dont updateProfToolkit');
				//return false;
				return Promise.reject('not main panel showing so dont updateProfToolkit');
			}
		}
	}
	
	//get panel
	var PUI = aDOMWindow.PanelUI.panel; //PanelUI-popup
	var PUIf = aDOMWindow.PanelUI.mainView.childNodes[1]; //PanelUI-footer //aDOMWindow.PanelUI.mainView.childNodes == NodeList [ <vbox#PanelUI-contents-scroller>, <footer#PanelUI-footer> ]
	//var PUIcs = aDOMWindow.PanelUI.mainView.childNodes[0]; //PanelUI-contents-scroller
	
	//check if profilist is in there already and get profilist nodes
	var PBox;
	var PStack; //dom element key=profilist_stack
	var PLoading;
	if (!('Profilist' in aDOMWindow)) {
			var profilistHBoxJSON =
			['xul:vbox', {id:'profilist_box', class:'', style:''},
				['xul:stack', {/*key:'profilist_stack'*/},
					['xul:box', {class:'profilist-tbb-box', id:'profilist-loading', /*key:'profilist-loading', */disabled:'true', label:'Loading Profiles...'}]
				]
			];
			var basePNodes = {}; //baseProfilistNodes
			var PBox = jsonToDOM(profilistHBoxJSON, aDOMWindow.document, basePNodes);
			PUIf.insertBefore(PBox, PUIf.firstChild);
			PStack = PBox.childNodes[0];
			PLoading = PStack.childNodes[0];
			
			if (!PUIsync_height) {
				PUIsync_height = PLoading.boxObject.height;
				collapsedheight = PUIsync_height;
				//var computedHeight = win.getComputedStyle(el, '').height;
				//console.log('computed PUIsync_height:', computedHeight);
				console.log('PUIsync_height determined to be = ', PUIsync_height);
			}
			
			//note: maybe desired enhancement, rather then do getElementById everytime to get profilist_box i can store it in the window object, but that increases memory ~LINK678132
			/*
			aDOMWindow.Profilist.basePNodes = {
				'profilist_stack': basePNodes.profilist_stack
			}
			*/
			aDOMWindow.Profilist = {};
			
			PStack.addEventListener('mouseenter', function() {
			
			}, false);
			PStack.addEventListener('mouseleave', function() {
			
			}, false);
	} else {
		//note: maybe desired enhancement, rather then do getElementById everytime to get profilist_box i can store it in the window object, but that increases memory ~LINK678132
		console.time('PBox getElementById');
		PBox = aDOMWindow.document.getElementById('profilist_box'); //alternative `PUI.querySelector('#profilist_box')`
		console.timeEnd('PBox getElementById');
		PStack = PBox.childNodes[0];
	}
	
	//make sure its PStack is collapsed
	//PStack.style.height = collapsedheight + 'px'; //maybe not needed //was doing this in past: `if (collapsedheight != PUIsync_height || stack.style.height == '') {`
	
	//start read ini
	if (dontRefreshIni) {
		var defer_refreshIni = Promise.defer();
		var promise_refreshIni = defer_refreshIni.promise;
		promise_refreshIni.resolve('dontRefreshIni is true so will skip readIniAndParseObjs and just resolve the promise');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
	}
	
	
	
	return promise_refreshIni.then( /* note LINK 87318*/
		function(aVal) {
			console.log('Success', 'promise_refreshIni', 'aVal:', aVal);
			//compare aDOMWindow.Profilist.iniObj_thatAffectDOM to global iniObj_thatAffectDOM
			
			//note, in the dom, the tbb_boxes should be in order as they are seen in iniFile
			
			//and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
			if ('iniObj_thatAffectDOM' in aDOMWindow.Profilist) {
				var objWin = aDOMWindow.Profilist.iniObj_thatAffectDOM; //just to short form it
				var objBoot = iniObj_thatAffectDOM; //just to short form it
				//figure out main key that were REMOVED in global (thus was FOUND in aDOMWindow... and NOT found in global)
				var removeTheseChildIndexes = [];
				for (var pw in objWin) { //pw means p_from_window
					if (!(pw in objBoot)) {
						for (var p in objWin[pw].props) {
							if (pw == 'General') {
								
							} else if ('num' in objWin[pw]) {
								//its a profile
								removeTheseChildIndexes.push(objWin.num);
							} else {
								console.warn('pw is unrecognized', 'pw:', pw);
								continue;
							}
						}
					}
				}
				removeTheseChildIndexes.sort(function(a, b){return b-a});
				for (var i=0; i<removeTheseChildIndexes.length; i++) {
					PStack.removeChild(PStack.childNodes[removeTheseChildIndexes[i]]);
				}
				//figure out main key that are NEWLY ADDED in global (thus NOT found in aDOMWindow... but FOUND in global)
				for (var pb in objBoot) { //pb means p_from_bootstrap
					if (!(pb in objWin)) {
						for (var p in objBoot[pb].props) {
							if (pb == 'General') {
								
							} else if ('num' in objBoot[pb]) {
								//its a profile
								var newElement = ;// make jsonToDOM of objBoot[pb].props
								//assuming that as we go through objBoot they are in asc order of .num
								PStack.insertBefore(newElement, PStack.childNodes[objBoot[pb].num + 1]); // note: assuming: no need to do `PStack.childNodes[objBoot[pb].num + 1] ? PStack.childNodes[objBoot[pb].num + 1] : PStack.childNodes[PStack.childNodes.length - 1]` because there always has to be at least "create new button" element, so profile button is never inserted as last child
							} else {
								console.warn('pb is unrecognized', 'pb:', pb);
								continue;
							}
						}
					}
				}
				//figure out prop key that were CHANGED in global (thus was FOUND in aDOMWindow... and FOUND in global but value in aDOMWindow... is different from what is in global)
					//note: i only check PROPS object differences to see if change needs to be made
				for (var pw in objWin) { //pw means p_from_window
					if (pw in objBoot) {
						for (var p in objBoot[pw].props) { //going through objBoot here instead of objWin BECAUSE objBoot vals are what are to be shown //so if something was in objWin and is no longer there, then the key will not be in objBoot this is a problem //so this handles only if it existed before (in win) and is now changed (in boot) OR if it did not exist before (in win) and is now added (in boot)
							if (pw == 'General') {
								if (objBoot[pw].props[p] != objWin[pw].props[p]) {
									
									if (p == 'Profilist.currentThisBuildsIconPath') {
										PBox.style.backgroundImage = 'url("' + objBoot[pw].props[p] + '")';
									} else if (p == 'Profilist.defaultProfilePath') {
										
									}
								}
							} else if ('num' in objWin[pw]) {
								//its a profile
								if (objWin[pw].props[p] != objBoot[pw].props[p]) {
									//so num in objWin COULD have changed, so use num of objBoot as I handled the removing and adding of nodes so objBoot num is now the childNodes order that is in win
									PStack.childNodes[objBoot[pw].num].setAttribute(p, objBoot[pw].props[p])
								}
							} else {
								console.warn('pw is unrecognized', 'pw:', pw);
								continue;
							}
						}
					}
				}
				
				//ok done
			} else {
				//create json of global iniObj_thatAffectDOM (remember to add the "Create Profile" button) //note: important: all profiles should follow ini[p].num childNode order. all non profile tbbBoxes should go after that. so create profile tbbBox is lastChild if just all profiles and that button
				//remove loading
				//insert jsonToDom of the json created
			}
			
			//10. update running icons
			//var PTbbBoxes = PStack.childNodes;
			var promise_all_updateProfStatuses = [];
			for (var p in ini) {
				if ('num' in ini[p]) {
					if (p == profToolkit.selectedProfile.iniKey) { // alt to `if (ini[p].props.Name == profToolkit.selectedProfile.name) {`
						//console.log('profile', p, 'is the active profile so in use duh');
						continue;
					}
					var promise_profLokChk = ProfilistWorker.post('queryProfileLocked', [ini[p].props.IsRelative, ini[p].props.Path, profToolkit.rootPathDefault]);
					promise_all_updateProfStatuses.push(promise_profLokChk);
					promise_profLokChk.then(
						function(aVal) {
							console.log('Success', 'promise_profLokChk', 'ini[p].num:', ini[p].num, 'ini[p].props.Name:', ini[p].props.Name, 'aVal:', aVal);
							
							//aVal is TRUE if LOCKED
							//aVal is FALSE if NOT locked
							if (aVal) {
								console.info('profile', ini[p].props.Name, 'is IN USE');
								//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'active');
								PStack.childNodes[ini[p].num].setAttribute('status', 'active');
							} else {
								console.info('profile', ini[p].props.Name, 'is NOT in use');
								//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'inactive');
								PStack.childNodes[ini[p].num].setAttribute('status', 'inactive');
							}
							
							return Promise.resolve('Success promise_profLokChk num:' + ini[p].num);
						},
						function(aReason) {
							console.error('Rejected', 'promise_profLokChk', 'ini[p].num:', ini[p].num, 'ini[p].props.Name:', ini[p].props.Name, 'aReason:' + aReason.message);
							return Promise.reject('Rejected' +' '+ 'promise_profLokChk' +' '+ 'ini[p].num:' +' '+ ini[p].num +' '+ 'ini[p].props.Name:' +' '+ ini[p].props.Name +' '+ 'aReason:' +' '+ aReason.message);
						}
					);
				}
			}
			
			return Promise.all(promise_all_updateProfStatuses).then(
				function(aVal) {
					console.log('Success', 'promise_all_updateProfStatuses');				
					return Promise.resolve('statuses updated');
				},
				function(aReason) {
					console.error('Rejected', 'promise_all_updateProfStatuses', 'aReason:' + aReason.message);
					return Promise.reject('Rejected promise_all_updateProfStatuses aReason:' + aReason.message);
				}
			);
		},
		function(aReason) {
			console.error('Rejected', 'promise_refreshIni', 'aReason:' + aReason.message);
			promise_readIniAndParseObjs.reject('Rejected promise_refreshIni aReason:' + aReason.message);
			return Promise.reject('Rejected promise_refreshIni aReason:' + aReason.message); //if i return here then i should do the /*return */promise_re /* note LINK 87318*/
		}
	);
	//end read ini
	
	//////////////////////////// old stuff
		var updateIni = 1;
		if (dontUpdateIni) {
			updateIni = 0;
		}

		//win.setTimeout(function() { updateProfToolkit(updateIni, 1, win); }, 5000); //was testing to see how it handles when os.file takes long time to read
		updateProfToolkit(updateIni, 1, win).then(
			function() {
				console.log('update statuses of proflies now');
				updateDomProfileStatuses(stack);
				//return Promise.resolve('updateProfToolkit success');
			},
			function() {
				throw new Error('updateProfToolkit failed');
			}
		);

}

function updateDomProfileStatuses(pb_stack) {
	var tbb_boxes = pb_stack.childNodes;
	console.log(tbb_boxes);
	var tbb_boxes_name_to_i = {}
	Array.prototype.forEach.call(tbb_boxes, function(tbb_box, i) {
	  var profName = tbb_box.getAttribute('label');
	  if (profName in ini && 'num' in ini[profName]) {
		tbb_boxes_name_to_i[profName] = i;
	  }
	});
	Object.keys(ini).forEach(function(p) {
		if ('num' in ini[p]) {
			if (p == profToolkit.selectedProfile.name) {
				console.log('profile', p, 'is the active profile so in use duh');
				return; //continue;
			}
			var promise_queryProfileLocked = ProfilistWorker.post('queryProfileLocked', [ini[p].props.IsRelative, ini[p].props.Path, profToolkit.rootPathDefault]);
			promise_queryProfileLocked.then(
				function(aVal) {
					//aVal is TRUE if LOCKED
					//aVal is FALSE if NOT locked
					if (aVal) {
						console.log('profile', p, 'is IN USE');
						tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'active');
					} else {
						console.log('profile', p, 'is NOT in use');
						tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'inactive');
					}
				},
				function(aReason) {
					console.warn('failed to get status of profName', p, 'aReason:', aReason);
				}
			);
		}
	});
}

function updateProfToolkit(refreshIni, refreshStack, iDOMWindow) {
//is promise
	try {
		if (refreshIni == 1) {
			var promise = readIni();
			return promise.then(
				function() {
					return updateProfToolkit(0, refreshStack).then(
						function() {
							return Promise.resolve('updateProfToolkit success');
						},
						function() {
							return Promise.reject('updateProfToolkit failed');
						}
					);
				},
				function(aRejectReason) {
	//				console.error('Failed to refresh ini object from file on deleteProfile');
					return Promise.reject(aRejectReason.message);
				}
			);
		} else {
			if (profToolkit.rootPathDefault === 0) {
	//			console.log('initing prof toolkit');
				if (refreshStack !== 0) {
					refreshStack = true;
				}
	//			console.log('initing prof toolkit');
				initProfToolkit();
	//			console.log('init done');
			}
			var profileCount = 0;
			profToolkit.profiles = {};
			var selectedProfileNameFound = false;
			var pathsInIni = [];
			for (var p in ini) {
				if ('num' in ini[p]) {
					profileCount++;
					pathsInIni.push(ini[p].props.Path);
				}
				if (!selectedProfileNameFound && profToolkit.selectedProfile.name !== 0 && ini[p].Name == profToolkit.selectedProfile.name) {
					selectedProfileNameFound = true;
				}
			}
			profToolkit.profileCount = profileCount;
			profToolkit.pathsInIni = pathsInIni;
			
			var prefNames = myPrefListener.watchBranches[myPrefBranch].prefNames;
			var writeIniForNewPrefs = false;
			for (var pref_name_in_obj in prefNames) {
				var prefObj = myPrefListener.watchBranches[myPrefBranch].prefNames[pref_name_in_obj];
				var pref_name_in_ini = 'Profilist.' + pref_name_in_obj;
				if (pref_name_in_ini in ini.General.props) {
					var value_in_ini = ini.General.props[pref_name_in_ini];
					if (prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
						//value_in_ini = value_in_ini == 'false' ? false : value_in_ini == 'true' ? true : value_in_ini;
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
					console.log('pref_name_in_ini of ', pref_name_in_ini, ' is not in ini so using prefObj.value of ', prefObj.value, ' and set it in the ini obj but didnt write it', 'ini.General:', ini.General);
				}
			}
			if (writeIniForNewPrefs) {
				//i decided against writing the ini when programatically determined they are missing, so will just use default prefs
				/*
				var promise89 = writeIni();
				promise89.then(
					function() {
						console.log('succesfully wrote ini for storing new prefs');
					},
					function() {
						console.error('FAILED to write ini to store new prefs, no big though i think as it will just use the default values in ini obj in runtime');
					}
				);
				*/
			}
			/*
			for (var g in ini.General.props) {
				if (g.substr(0, 10) == 'Profilist.') {
					var pref_name_in_ini = g.substr(10);
					var prefObj = myPrefListener.watchBranches['extensions.Profilist@jetpack'].prefNames[pref_name_in_ini];
					console.log('pref_name_in_ini:', pref_name_in_ini);
					var value_in_ini = ini.General.props[g];
					if (prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
						//value_in_ini = ['false', false, 0].indexOf(value_in_ini) > -1 ? false : true;
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
					if (prefObj.value != ini.General.props[g]) {
						console.log('value of prev_name_in_ini in tree does not equal that of in ini so update tree to value of ini');
						console.log('value_in_ini:', ini.General.props[g]);
						console.log('value_in_tree:', prefObj.value);
						
						prefObj.setval(value_in_ini);
						console.log('setval done');
					}
				}
			}
			*/
	//		console.info('profToolkit.selectedProfile.name = ', profToolkit.selectedProfile.name);
	//		console.info('selectedProfileNameFound = ', selectedProfileNameFound);

			if (!selectedProfileNameFound) {
	//			console.log('looking for selectedProfile name');
				for (var p in ini) {
					if (!('IsRelative' in ini[p].props)) {
	//					console.warn('skipping ini[p] because no IsRelative prop', 'ini[p]=', ini[p], 'p=', p)
						continue;
					}
					if (ini[p].props.IsRelative == '1') {
	//					console.log('ini[p] is relative',ini[p]);
						var iniDirName = OS.Path.basename(OS.Path.normalize(ini[p].props.Path));
						
	//					console.info('rel iniDirName=', iniDirName);
	//					console.info('rel profToolkit.selectedProfile.rootDirName=', profToolkit.selectedProfile.rootDirName);
	//					console.info('rel profToolkit.selectedProfile.localDirName=', profToolkit.selectedProfile.localDirName);

						if (iniDirName == profToolkit.selectedProfile.rootDirName) {
	//						console.log('iniDirName matches profToolkit.selectedProfile.rootDirName so set selectedProfile.name to this ini[p].Name', 'iniDirName', iniDirName, 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
							profToolkit.selectedProfile.name = ini[p].props.Name;
							break;
						}
						if (iniDirName == profToolkit.selectedProfile.localDirName) {
	//						console.log('iniDirName matches profToolkit.selectedProfile.localDirName so set selectedProfile.name to this ini[p].Name', 'iniDirName', iniDirName, 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
							profToolkit.selectedProfile.name = ini[p].props.Name;
							break;
						}
					} else {
	//					console.log('ini[p] is absolute',ini[p]);
	//					console.info('abs ini[p].props.Path=', ini[p].props.Path);
	//					console.info('abs profToolkit.selectedProfile.rootDirPath=', profToolkit.selectedProfile.rootDirPath);
	//					console.info('abs profToolkit.selectedProfile.localDirPath=', profToolkit.selectedProfile.localDirPath);
						
						if (ini[p].props.Path == profToolkit.selectedProfile.rootDirPath) {
	//						console.log('ini[p].Path matches profToolkit.selectedProfile.rootDirPath so set selectedProfile.name to this ini[p].Name', 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
							profToolkit.selectedProfile.name = ini[p].props.Name;
							break;
						}
						if (ini[p].props.Path == profToolkit.selectedProfile.localDirPath) {
	//						console.log('ini[p].Path matches profToolkit.selectedProfile.localDirPath so set selectedProfile.name to this ini[p].Name', 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
							profToolkit.selectedProfile.name = ini[p].props.Name;
							break;
						}
					}
				}
				//profToolkit.selectedProfile.name = 1;
				if (!profToolkit.selectedProfile.name) {
	//				console.log('selectedProfile.name not found so I ASSUME IT IS A TEMP PROFILE')
	//				console.log('trying to change label')
					var profilistLoadingT = Services.wm.getMostRecentWindow('navigator:browser').document.getElementById('profilist-loading');
					if (profilistLoadingT) {
	//					console.log('profilistLoadingT found')
						profilistLoadingT.setAttribute('label', 'Temporary Profile');
						profilistLoadingT.setAttribute('id', 'profilistTempProfile');
						profilistLoadingT.classList.add('profilist-do_not_auto_remove');
						return Promise.reject('Using Temporary Profile - Profilist will not work');
					}
				}
	//			console.log('selectedProfile searching proc done');
			}
			
			
			if (refreshStack) {
				updateStackDOMJson_basedOnToolkit(false, iDOMWindow);
			}
			
			return Promise.resolve('success');
		}
	} catch(ex) {
		console.error('Promise Rejected `updateProfToolkit` - ', ex);
		return Promise.reject('Promise Rejected `updateProfToolkit` - ' + ex);
	}
}

function updateStackDOMJson_basedOnToolkit(dontUpdateStack, iDOMWindow) { //and based on ini as well
//			console.log('updating stackDOMJson based on profToolkit AND ini');
			var stackUpdated = false; //if splice in anything new in or anything old out then set this to true, if true then run dom update
			if (stackDOMJson.length == 0) {
//				console.log('stackDOMJson is 0 length', stackDOMJson);
//				console.log('profToolkit=',profToolkit);
				stackDOMJson = [
					{identifier:'[label="Create New Profile"]', label:'Create New Profile', class:'profilist-tbb-box profilist-create profilist-do_not_auto_remove', addEventListener:['click',createUnnamedProfile,false], style:tbb_style},
					{identifier:'[path="' + ini[profToolkit.selectedProfile.name].props.Path + '"]', label:profToolkit.selectedProfile.name, class:'profilist-tbb-box', status:'active', addEventListener:['click', makeRename, false], style:tbb_style, props:{profpath:ini[profToolkit.selectedProfile.name].props.Path}}
				];
				var profNamesCurrentlyInMenu = [ini[profToolkit.selectedProfile.name].props.Path];
				stackUpdated = true;
			} else {
//				console.log('stackDOMJson has more than 0 length so:', stackDOMJson);
				var profNamesCurrentlyInMenu = [];
				for (var i=0; i<stackDOMJson.length; i++) {
					var m = stackDOMJson[i];
					if ('props' in m && 'profpath' in m.props) {
						if (profToolkit.pathsInIni.indexOf(m.props.profpath) == -1) {
							//this is in the stack object but no longer exists so need to remove
//							console.log('m.props.profpath is not in pathsInIni = ', 'm.props.profpath=', m.props.profpath, 'pathsInIni=', profToolkit.pathsInIni, 'ini=', ini)
							stackUpdated = true;
							console.log('deleted:', stackDOMJson[i]);
							stackDOMJson.splice(i, 1); //this takes care of deletes
							i--;	
						} else {
//							console.log('this stack value is in profToolkit', 'stack val = ', m.props.profpath, 'pathsInIni', profToolkit.pathsInIni);
							profNamesCurrentlyInMenu.push(m.props.profpath);
						}
					}
				}
			}
			
//			console.info('after updating that profNamesCurrentlyInMenu is = ', profNamesCurrentlyInMenu);
			
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
				var posOfProfInStack = -1; //actually cannot do this because have create profile button::::var posOfProfInStack = profNamesCurrentlyInMenu.indexOf(ini[p].props.Path); //identifies prop by path and gives location of it in stackDOMJson, this works because i do a for loop through stackDOMJson and create profNamesCurrentlyInMenu in that order
//				console.log('looking for position in stack of profpath ', 'profpath = ', ini[p].props.Path);
				for (var i=0; i<stackDOMJson.length; i++) {
					if ('props' in stackDOMJson[i]) {
						if (stackDOMJson[i].props.profpath == ini[p].props.Path) {
							posOfProfInStack = i;
							break;
						} else {
//							//console.log('stackDOMJson[i].props.profpath != ini[p].props.Path', stackDOMJson[i].props.profpath, ini[p].props.Path);
							continue; //dont really need continue as there is no code below in this for but ya
						}
					} else {
						continue; //dont really need continue as there is no code below in this for but ya
					}
				}
//				console.log('index of ini[p].props.Path in stack object is', ini[p].props.Path, posOfProfInStack);
				
				if (posOfProfInStack > -1) {
					//check if any properties changed else continue
					//var justRenamed = false; //i had this as propsChanged but realized the only prop that can change is name and this happens on a rename so changed this to justRenamed. :todo: maybe im not sure but consider justDeleted
					if (stackDOMJson[posOfProfInStack].label != ini[p].props.Name) {
//						console.log('currently in menu the item "' + stackDOMJson[posOfProfInStack].label + '" was renamed to "' + ini[p].props.Name + '"');
						stackDOMJson[posOfProfInStack].justRenamed = true;
						stackDOMJson[posOfProfInStack].label = ini[p].props.Name;
						//justRenamed = true;
						if (!stackUpdated) {
							stackUpdated = true; //now stack is not really updated (stack is stackDOMJson but we set this to true becuase if stackUpdated==true then it physically updates all PanelUi
//							console.log('forcing stackUpdated as something was justRenamed');
						} else {
//							console.log('was just renamed but no need to force stackUpdated as its already stackUpdated == true');
						}
					}
					continue; //contin as it even if it was renamed its not new so nothing to splice, and this profpath for ini[p] was found in stackDOMJson
				} else {
//					console.log('splicing p = ', ini[p], 'stackDOMjson=', stackDOMJson);
					stackUpdated = true;
					(function(pClosure) {
						var objToSplice = {identifier:'[path="' + ini[pClosure].props.Path + '"]', label:p, class:'profilist-tbb-box',  status:'inactive', addEventListener:['click', launchProfile, false], addEventListener2:['mousedown', makeRename, false], style:tbb_style, props:{profpath:ini[pClosure].props.Path}};
						
						if (pClosure == profToolkit.selectedProfile.name) {
							//should never happend because stackDOMJson length was not 0 if in this else of the parent if IT WIL CONTNIUE on this: if (profIdsCurrentlyInMenu.indexOf(p.id) > -1) { continue }
							//actually this CAN happen because i will now be running refresh from time to time and user may rename current profile
							objToSplice.status = 'active';
							delete objToSplice.addEventListener;
							objToSplice.addEventListener2[0] = 'command';
							stackDOMJson.push(objToSplice);
						} else {
							stackDOMJson.splice(0, 0, objToSplice);
						}
					})(p);
				}
			}

//			console.info('stackDOMJson before checking if stackUpdated==true',stackDOMJson);
			if (iDOMWindow) {
//				console.log('will just run updateMenuDOM on iDOMWindow');
				updateMenuDOM(iDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
			} else {
//				console.log('will now run updateMenuDOM on all windows');
				let DOMWindows = Services.wm.getEnumerator(null);
				while (DOMWindows.hasMoreElements()) {
					let aDOMWindow = DOMWindows.getNext();
					if (aDOMWindow.document.getElementById('profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create
//						console.info('updatngMenuDOM on this window == ', 'aDOMWindow = ', aDOMWindow);
						updateMenuDOM(aDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
					}
				}
			}
			for (var i=0; i<stackDOMJson.length; i++) {
				if (stackDOMJson[i].justRenamed) {
					delete stackDOMJson[i].justRenamed;
				}
			}
			/* if (stackUpdated) { //also should check to see if dom matches stack, if it doesnt then should update stack
//				console.info('something was changed in stack so will update all menus now');
				if (dontUpdateStack) {
//					console.warn('dontUpdateStack is set to true so ABORTING update all menus');
				} else {
					if (iDOMWindow) {
//						console.log('just updating iDOMWindow');
						updateMenuDOM(iDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
					} else {
						let DOMWindows = Services.wm.getEnumerator(null);
						while (DOMWindows.hasMoreElements()) {
							let aDOMWindow = DOMWindows.getNext();
							if (aDOMWindow.document.getElementById('profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create
//								console.info('updatngMenuDOM on this window == ', 'aDOMWindow = ', aDOMWindow);
								updateMenuDOM(aDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
							}
						}
					}
					//now delete the justRenamed property, we have to delete the property after all windows are updated, otherwise only first window gets its toolbarbutton renmaed
					//consider putting a if (somethingRenamed) { on this block :todo:
					for (var i=0; i<stackDOMJson.length; i++) {
						if (stackDOMJson[i].justRenamed) {
							delete stackDOMJson[i].justRenamed;
						}
					}
					//end now delete teh justRenamed property
				}
			} */
}

function updateMenuDOM(aDOMWindow, json, jsonStackChanged, dontUpdateDom) {
	//if jsonStackChanged is true then it will update for sure
	
	//identifier is the querySelector to run to match the element, if its matched it updates this el, if not matched then creates new el based on nodeToClone
	var profilist_box = aDOMWindow.document.getElementById('profilist_box');
	if (!profilist_box) {
//		console.warn('no profilist_box to add to');
		return new Error('no profilist_box to update to');
	}
	var stack = profilist_box.childNodes[0];
	
	var stackChilds = stack.childNodes;
	var identObj = {};
	/*
	Array.prototype.forEach.call(stackChilds, function(elC) {
		var identifierRead = elC.getAttribute('identifier');
		identObj[identifierRead] = elC;
		//console.log('in forEach:', identifierRead, elC);
		//console.log('them anons', aDOMWindow.document.getAnonymousNodes(elC));
	});
	*/
 	for (var i=0; i<stackChilds.length; i++) {
		var identifierRead = stackChilds[i].getAttribute('identifier');
		identObj[identifierRead] = stackChilds[i];
	}
	//start - test if dom matches json
	if (!jsonStackChanged) {
//		console.info('jsonStack was not just changed so will now test if dom matches json because jsonStack was not just changed');
		var domMatchesJson = true; //start by assuming its true
		var calcedTops = {}; //index matches order of json
		var cumHeight = 0;
		for (var i=0; i<json.length; i++) {
			if (json[i].identifier in identObj) {
				//start - check to see if all properties match
				var el = identObj[json[i].identifier];
				for (var p in json[i]) {
					if (p == 'nodeToClone' || p == 'props' || p == 'style' || p.indexOf('addEventListener') == 0) { continue }
					//continue if style because i do a style.height = which adds to the style tag
						if (json[i][p] === null) {
							if (el.hasAttribute(p)) {
//								console.log('el hasAtribute when it shouldnt', 'attr=', p, 'el=', el);
								domMatchesJson = false;
								break;
							}
						} else {
							if (el.getAttribute(p) != json[i][p]) {
//								console.log('el attr is not right', 'attr=', p, 'attr shud be=', json[i][p], 'el=', el);
								domMatchesJson = false;
								break;
							}
						}
				}
				//end - check to see if all properties match
			} else {
				domMatchesJson = false;
				break;
			}
		}
		
//		console.log('elHeight will use PUIsync_height', 'PUIsync_height=', PUIsync_height);
		if (elHeight == 0) {
//			console.error('elHeight == 0 this is an ERROR');
		}
					
		if (domMatchesJson) { //else no need to test as its going to get updated anyways
			//test if dom tops match calced tops
			var domTopsMatchesCalcedTops = true; //start out assuming it does
			for (var i=0; i<json.length; i++) {
					var elHeight = PUIsync_height;
					cumHeight += elHeight;
					if (json[i].status == 'active') {
						calcedTops[json[i].identifier] = 0;
					} else {
						calcedTops[json[i].identifier] = cumHeight;
					}
			}
			for (var p in identObj) {
				if (identObj[p].getAttribute('top') != calcedTops[p]) {
					domTopsMatchesCalcedTops = false;
					break;
				}
			}
			//end - test if dom matches json
		}

		if (domMatchesJson) {
			if (!domTopsMatchesCalcedTops) {
//				console.info('just needs top fixing');
			} else {
//				console.info('domMatchesJson && domTopsMatchesCalcedTops SO DO NOTHING');
				return false; //return false indiciating nothing was done but not returning error so indicating no error happend
			}
		} else if (!domMatchesJson) {
//			console.info('needs full dom update');
		}
	} else {
//		console.info('jsonStack was just changed so have to do full dom update');
	}
	
	if (dontUpdateDom) {
//		console.info('need to update dom but dontUpdateDom was set to true so will not update it');
		return false; //note: i think i need to return promise here
	}
	
	var cumHeight = 0;
	
	//cant set stack height here because popup state is now open. well can change it, but have to resize panel with the panelFit function i cant find here. because if i make it any taller than it is, then the scrollbar will show as the panel wont be sized to fit properly
	
	for (var i=0; i<json.length; i++) {
//		console.log('in json arr = ', i);
		var el = null;
		var appendChild = false;
		if (json[i].identifier) {
			//console.log('identifier  string =', json[i].identifier);
			el = identObj[json[i].identifier]; //stack.querySelector(json[i].identifier);
			//console.log('post ident el = ', el);
		}
		if (!el) {
			/* if (json[i].nodeToClone == 'PUIsync') {
				json[i].nodeToClone = PUIsync;
			}
			el = json[i].nodeToClone.cloneNode(true); */
			var toolbarbuttonJSON = ['xul:box', {style:tbb_box_style, class:'profilist-tbb-box newly-created', label:'newly created'}];
			el = jsonToDOM(toolbarbuttonJSON, aDOMWindow.document, {});
			appendChild = true;
//			console.log('el created');
		} else {
//			console.log('el idented');
		}
		if (!el.hasAttribute('top')) {
			el.setAttribute('top', '0'); //this is important, it prevents toolbaritems from taking 100% height of the stacks its in
		}
		
		//console.log('ini entry of this prof:', ini[json[i].label]);
		if (ini[json[i].label] && ini[json[i].label].props.Default == '1') {
			profilist_box.setAttribute('default_profile_name', json[i].label);
		}
		
		if (appendChild) {
			console.log('added tbb_box_click');
			el.addEventListener('click', tbb_box_click, false);
			for (var p in json[i]) {
				if (p == 'nodeToClone' || p == 'props' || p.indexOf('addEventListener') == 0) { continue }
				//dont add anything here that needs to be added onto the tbb, like addEventListener, because its now in xbl, the tbb gets created only after box inserted into dom
				if (json[i][p] === null) {
					el.removeAttribute(p);
				} else {
					el.setAttribute(p, json[i][p]);
				}
			}
		} else {
			//if appendChild false then obviously idented
			if ('justRenamed' in json[i]) {
//				console.log('it was justRenamed');
				//delete json[i].justRenamed; //cant delete this here, as if we are updating multiple windows, only the first window gets renamed properly
				el.setAttribute('label', json[i].label);
//				console.log('label set');
				//dont need this anymore as i am now using path for idnetifier //json[i].identifier = '[path="' + json[i].label + '"]'; //have to do this here as needed the identifier to ident this el
			}
		}
		
		//el.style.height = '';
		var elHeight = PUIsync_height; //el.boxObject.height;
		//var elHeight = el.ownerDocument.defaultView.getComputedStyle(el,null).getPropertyValue('height'); //have to use getComputedStyle instead of boxObject.height because boxObject.height is rounded, i need cumHeight added with non-rounded values but top is set with rounded value
		//elHeight = parseFloat(elHeight);
		if (elHeight == 0) {
			myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'DEBUG', 'elHeight = 0', false, null, null, 'Profilist');
			if (appendChild) {
				elHeight = PUIsync_height; //json[i].nodeToClone.boxObject.height;
				//elHeight = json[i].nodeToClone.ownerDocument.defaultView.getComputedStyle(json[i].nodeToClone,null).getPropertyValue('height');
				//elHeight = parseFloat(elHeight);
//				console.log('elHeight was 0 but just appendedChild so assuming cloned node height which is', elHeight);
			} else {
//				console.log('elHeight was 0 and it was NOT just appended so cannot assume cloned node height');
			}
		}
		//el.style.height = elHeight + 'px';
//		console.log('PUIsync_height = ', PUIsync_height);
//		console.log('el.boxObject.height = ', el.boxObject.height);
		cumHeight += elHeight;
//		console.log('cumHeight after adding = ' + cumHeight);
		if (i < json.length - 1) {
			el.setAttribute('top', cumHeight); //cant do this here because stack element expands to fit contents so this will mess up the cumHeight and make it think the element is longe that it is  //actually can do this now, now that i :learned: that if you set the top to some value it the element will not expand to take up 100% height of stack :learned:
			//el.setAttribute('bottom', cumHeight + elHeight);
//			console.log('set el top to ', cumHeight);
		} else {
			el.setAttribute('top', '0');
//			console.log('set el top to 0');
		}
		
		if (appendChild) {
			if (json[i].status != 'active') { //this if makes sure the selected profile one gets added last note: again this is important because the last most element is top most on stack when collapsed, but in my case its more important because it gets the perm-hover class
				stack.insertBefore(el, stack.firstChild);
			} else {
				stack.appendChild(el);
			}
			var boxAnons = el.ownerDocument.getAnonymousNodes(el);
			//console.log('boxAnons:', boxAnons);
			//var tbb = boxAnons[0];
			var sm = boxAnons[1];
			//console.log('tbb:', tbb);
			//console.log('sm:', sm);
			//var badge = tbb.ownerDocument.getAnonymousElementByAttribute(tbb, 'class', 'profilist-badge');
			var setdefault = boxAnons[1].querySelector('.profilist-default');
			//console.log('badge', badge);
			//console.log('setdefault', setdefault);

			//badge.addEventListener('mouseenter', subenter, false);
			setdefault.addEventListener('mouseenter', subenter, false);
			//badge.addEventListener('mouseleave', subleave, false);
			setdefault.addEventListener('mouseleave', subleave, false);

			//el.addEventListener('mouseenter', subenter, false);
			el.addEventListener('mousedown', properactive, false);
			//el.addEventListener('mouseleave', subleave, false);
			
			for (var p in json[i]) {
				if (p.indexOf('addEventListener') == 0) {
					//console.log('found it needs addEventListener on tbb so doing that now');
					(function(elClosure, jsonIClosure, pClosure) {
						//this doesnt work anymore as xbl doesnt put in the toolbarbutton till after element is appended4444
						//console.log('elClosure',elClosure.getAttribute('label'),'jsonIClosure',jsonIClosure);
						//console.log('elClosure label',elClosure.getAttribute('label'));
						//console.info('elClosure:', elClosure);
						//elClosure.querySelector('.profilist-tbb').addEventListener(jsonIClosure[pClosure][0], jsonIClosure[pClosure][1], jsonIClosure[pClosure][2]);
						//elCosure.ownerDocument.
				////var cTbb = elClosure.ownerDocument.getAnonymousElementByAttribute(elClosure, 'class', 'profilist-tbb');
						//console.info(jsonIClosure.identifier.replace(/["\\]/g, '\\$&'));
						//var cTbb = profilist_box.querySelector('[identifier="' + jsonIClosure.identifier.replace(/["\\]/g, '\\$&') + '"]');
						//console.log('cTbb', cTbb);
				////console.error(jsonIClosure[pClosure][0], jsonIClosure[pClosure][1], jsonIClosure[pClosure][2]);
						//cTbb.addEventListener(jsonIClosure[pClosure][0], jsonIClosure[pClosure][1], jsonIClosure[pClosure][2]);
					})(el, json[i], p);
				}
			}
//			console.log('appended', el);
		}

	}
	if (expandedheight != cumHeight) {
//		console.log('glboal var of expandedheight does not equal new calced cumheight so update it now', 'expandedheight pre update = ', expandedheight, 'cumHeight=', cumHeight);
		var oldExpandedheight = expandedheight;
		expandedheight = cumHeight;
//		console.log('oldExpandedheight = ' + oldExpandedheight);
	}
//	//console.log('stack.boxObject.height = ' + stack.boxObject.height);
//	//console.log('stack.style.height = ' + stack.style.height);
//	//console.log('aDOMWindow.getComputedStyle(stack).getPropertyValue(\'height\') = ' + aDOMWindow.getComputedStyle(stack).getPropertyValue('height'));
	
	var cStackHeight = parseInt(stack.style.height);
	if (isNaN(cStackHeight)) {
//		console.log('the panel containing this stack, in this window has never been opened so set it to collapsed');
		stack.style.height = collapsedheight + 'px';
		cStackHeight = collapsedheight;
	}
	if (cStackHeight != collapsedheight && cStackHeight != expandedheight) {
//		console.warn('stack style height is not collapsed so assuming that its in expanded mode AND it is not at the correct expandedheight so update its height now', 'cStackHeight = ', cStackHeight, 'expandedheight=', expandedheight);
		stack.style.height = expandedheight + 'px';
//		//console.warn('stack.boxObject.height EQUALS oldExpandedheight', 'oldExpandedheight', oldExpandedheight, 'stack.boxObject.height', stack.boxObject.height)
	}
//	console.log('collapsedheight', collapsedheight);
//	console.log('expandedheight', expandedheight);

	var stackChilds = stack.childNodes;
	for (var i=0; i<stackChilds.length; i++) {
		//console.log('checking if label of ' + stackChilds[i].getAttribute('label') + ' is in ini', 'ini=', ini);
		if (stackChilds[i].hasAttribute('status')) {
			if (!(stackChilds[i].getAttribute('label') in ini)) { //:assume: only profiles have status attribute
				console.log('this profile is not in ini so remove it', 'ini=', ini);
				stack.removeChild(stackChilds[i]);
				i--;
			}
		} else {
			//its not a profile toolbarbutton, should we keep it?
			if (!stackChilds[i].classList.contains('profilist-do_not_auto_remove')) {
				console.log('this is not a profile button and it doesnot have the DO NOT REMOVE class so remove it');
				stack.removeChild(stackChilds[i]);
				i--;
			}
		}
	}

	//i was putting a check here for if in dev mode, to check if current build icon matches, but realized i should do that on pref change instead
	//actually i think it should go here
	
	//start - make sure the dev mode and dev-build icon is right
	if (ini.General.props['Profilist.dev'] == 'true') {//does not work: `if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {`
		//so learned as a note: that i should use (for programmatic stuff) ini to check props rather than pref system, pref system is only there for communication between user interface
		//make sure its enabled in menu dom
		/*
		if (!profilist_box.classList.contains('profilist-dev-enabled')) {
			console.warn('dev is ENABLED, but menu dom is not, so ENABLING it');
		}
		*/
		profilist_box.classList.add('profilist-dev-enabled');
		checkIfIconIsRight(ini.General.props['Profilist.dev-builds'], profilist_box, true);
	} else {
		//make sure its disabled in menu dom
		/*
		if (profilist_box.classList.contains('profilist-dev-enabled')) {
			console.warn('dev is DISABLED, but menu dom is not, so DISABLING it');
		}
		*/
		profilist_box.classList.remove('profilist-dev-enabled');
	}
	//end - make sure the dev mode and dev-build icon is right
	
	/* [].forEach.call(stackChilds, function(sc) {
//		console.log('checking if label of ' + sc.getAttribute('label') + ' is in ini', 'ini=', ini);
		if (sc.hasAttribute('status') && !(sc.getAttribute('label') in ini)) { //:assume: only profiles have status attribute
//			console.log('this profile is not in ini so remove it', 'ini=', ini);
			stack.removeChild(sc);
		}
	}); */
	
//	console.info('json=',json);
}

function checkIfIconIsRight(dev_builds_str, dom_element_to_update_profilist_box, update_dom_element_even_if_icon_unchanged) {
//im moving this computation to on read so i think i can discontinue this function 11/13/14

	//if `dom_element_to_update_profilist_box` == string of `ALL WINDOWS` then update all windows
	//if `dom_element_to_update_profilist_box` === null THEN no dom is updated
	
	//if icon changed then it is definitely going to update
	
		var icon_changed = false;
		//make sure the icon is up to date
		if (currentThisBuildsIconPath != '' && devBuildsStrOnLastUpdateToGlobalVar == dev_builds_str) {
			console.log('dev_builds_str is unchanged, so no need to bother with looping to check for update');
		} else {
			//start the generic-ish check stuff
			var devBuilds = JSON.parse(dev_builds_str);
			var OLDcurrentThisBuildsIconPath = currentThisBuildsIconPath;
			//start - figure out from dev_builds_str what icon path should be
			try {
				devBuilds.forEach(function(b) {
					if (b[1].toLowerCase() == profToolkit.exePathLower) {
						if (/^(?:release|beta|aurora|nightly)$/m.test(b[0])) {
							console.log('making bullet');
							currentThisBuildsIconPath = self.chrome_path + 'bullet_' + b[0] + '.png';
						} else {
							currentThisBuildsIconPath = OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.userApplicationDataDir, b[0])) + '#' + Math.random();
						}
						throw BreakException;
					}
				});
				//if got here, then it didnt throw BreakException so that means it didnt find an icon so use default branding
				if (updateChannel == '') {
					updateChannel = Services.prefs.getCharPref('app.update.channel');
				}
				if (updateChannel.indexOf('beta') > -1) { //have to do this because beta branding icon is same as release, so i apply my custom beta bullet png
					currentThisBuildsIconPath = self.chrome_path + 'bullet_beta.png';
				} else {
					currentThisBuildsIconPath = 'chrome://branding/content/icon16.png';
				}
			} catch (ex) {
				if (ex !== BreakException) {
					throw ex;
				}
			}
			//end - figure out from dev_builds_str what icon path should be
			if (currentThisBuildsIconPath != OLDcurrentThisBuildsIconPath) {
				//icon of currentThisBuildsIconPath CHANGED
				console.log('icon of currentThisBuildsIconPath CHANGED');
				icon_changed = true;
				devBuildsStrOnLastUpdateToGlobalVar = dev_builds_str;
			} else {
				//icon of currentThisBuildsIconPath is unchanged
				console.log('icon of currentThisBuildsIconPath is unchanged')
			}
			//end the generic-ish check stuff
		}
		
		if (dom_element_to_update_profilist_box !== null) {
			if (update_dom_element_even_if_icon_unchanged == true || icon_changed == true) {
				console.log('updating dom for checkIfIconIsRight');
				if (dom_element_to_update_profilist_box == 'ALL WINDOWS') {
					var DOMWindows = Services.wm.getEnumerator(null);
					while (DOMWindows.hasMoreElements()) {
						var aDOMWindow = DOMWindows.getNext();
						var profilistBox = aDOMWindow.document.getElementById('profilist_box');
						if (profilistBox) {
							//console.log('profilistBox found updating its profilistBox.style.backgroundImage:', profilistBox.style.backgroundImage);
							profilistBox.style.backgroundImage = 'url("' + currentThisBuildsIconPath + '")';
							//console.log('after update profilistBox.style.backgroundImage:', profilistBox.style.backgroundImage);
						}
					}
				} else {
					//it must be a dom element
					console.log('updating this dom element bg img to:', 'url("' + currentThisBuildsIconPath + '")');
					dom_element_to_update_profilist_box.style.backgroundImage = 'url("' + currentThisBuildsIconPath + '")';
				}
			}
		}
}

var renameTimeouts = [];

function makeRename(e) {
//	console.error('e', e);
	return;
	if (e.type == 'mousedown' && e.button != 0) {
		//ensure it must be primary click
//		console.warn('not primary click so returning e=', e);
		return;
	}
	//only allow certain chracters
	//cannot rename profile to a name that already exists
	
	//makes the menu button editable field and keeps popup open till blur from field
	var el = this;
		
	var doc = el.ownerDocument;
	var win = doc.defaultView;
	delete win.ProfilistInRenameMode;
	
	//make the el button an editable field
	//add event listener on blur it should cancel and restore menu look (as in not editable)
	//add event listener on enter submitRename
	
	if (el.getAttribute('status') == 'active') {
		//make editable right away
		actuallyMakeRename(el);
	} else {
		//make editable in 300ms if user doesnt mouseup
		var util = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		var winID = util.currentInnerWindowID;
		renameTimeouts[winID] = {DOMWindow: win, timeout: 0};
		
		renameTimeouts[winID].timeout = win.setTimeout(function(){ actuallyMakeRename(el) }, 500);
		el.addEventListener('mouseleave', function() {
			el.removeEventListener('mouseleave', arguments.callee, false);
			if (win.ProfilistInRenameMode) {
				//already in edit mode so just remove event listener and nothing else
//				console.log('timeout fired BUT already in edit mode so just remove event listener and nothing else');
				return;
			}
			win.clearTimeout(renameTimeouts[winID].timeout);
			delete renameTimeouts[winID];
//			console.log('canceled actuallyMakeRename timeout');
		}, false);
		
	}
}

function actuallyMakeRename(el) {
//	console.info('el on actuallyMakeRename = ', el);
	var doc = el.ownerDocument;
	var win = doc.defaultView;
	
	win.ProfilistInRenameMode = true;
	
	var oldProfName = el.getAttribute('label');
	var promptInput = {value:oldProfName}
	var promptCheck = {value:false}
	var promptResult = Services.prompt.prompt(null, self.name + ' - ' + 'Rename Profile', 'Enter what you would like to rename the profile "' + oldProfName + '" to. To delete the profile, leave blank and press OK', promptInput, null, promptCheck);
	if (promptResult) {
		if (promptInput.value == '') {
			var confirmCheck = {value:false};
			var confirmResult = Services.prompt.confirmCheck(null, self.name + ' - ' + 'Delete Profile', 'Are you sure you want to delete the profile named "' + oldProfName + '"? All of its files will be deleted.', 'Confirm Deletion', confirmCheck);
			if (confirmResult) {				
				if (confirmCheck.value) {
					var promise = deleteProfile(1, oldProfName);
					promise.then(
						function() {
							//Services.prompt.alert(null, self.name + ' - ' + 'Success', 'The profile "' + oldProfName +'" was succesfully deleted.');
							myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Profile Deleted', 'The profile "' + oldProfName +'" was succesfully deleted.', false, null, null, 'Profilist');
						},
						function(aRejectReason) {
//							console.warn('Delete failed. An exception occured when trying to delete the profile, see Browser Console for details. Ex = ', aRejectReason);
							Services.prompt.alert(null, self.name + ' - ' + 'Delete Failed', aRejectReason.message);
						}
					);
				} else {
					Services.prompt.alert(null, self.name + ' - ' + 'Delete Aborted', 'Profile deletion aborted because "Confirm" box was not checked.');
				}
			}
		} else {
			var newProfName = promptInput.value;
			if (newProfName != oldProfName) {
				var promise = renameProfile(1, oldProfName, newProfName);
				promise.then(
					function() {
						//Services.prompt.alert(null, self.name + ' - ' + 'Success', 'The profile "' + oldProfName +'" was succesfully renamed to "' + newProfName +'"');
//						console.warn('Rename promise completed succesfully');
						myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Profile Renamed', 'The profile "' + oldProfName +'" was succesfully renamed to "' + newProfName + '"', false, null, null, 'Profilist');
						updateProfToolkit(1, 1).then(
							function() {
								//return Promise.resolve('updateProfToolkit success');
							},
							function() {
								throw new Error('updateProfToolkit failed');
							}
						);
					},
					function(aRejectReason) {
//						console.warn('Rename failed. An exception occured when trying to rename the profile, see Browser Console for details. Ex = ', aRejectReason);
						Services.prompt.alert(null, self.name + ' - ' + 'Rename Failed', aRejectReason.message);
					}
				);
			}
		}
	}
	delete win.ProfilistInRenameMode;
	//Services.prompt.alert(null, self.name + ' - ' + 'debug', 'deleted ProfilistInRenameMode');
	return;
	el.style.fontWeight = 'bold';
	
	var PanelUI = doc.getElementById('PanelUI-popup');
	PanelUI.addEventListener('popuphiding', prevHide, false) // //add on blur it should remove prevHide //actually no need for this because right now on blur it is set up to hide popup
}

function submitRename() {
	//when user presses enter in field
	var el = this;
	var doc = this.ownerDocument;
	var win = doc.defaultView;
	
	var PanelUI = doc.getElementById('PanelUI-popup');
	PanelUI.removeEventListener('popuphiding', prevHide, false) // //add on blur it should remove prevHide //actually no need for this because right now on blur it is set up to hide popup
	
	delete win.ProfilistInRenameMode;
	//renameProfile(1, oldProfName, newProfName);
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

function subenter(e) {
	console.log('set default enter');
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

function tbb_box_click(e) {
	console.log('tbb_box_click e.origTarg:', e.originalTarget);
	var origTarg = e.originalTarget;
	var box = e.target;
	console.log('clicked target == box it should:', box);
	var className;
	var classList = origTarg.classList;
	
	var classAction = {
		'profilist-tbb-box': function() {
			if (classList.contains('perm-hover')) {
				//e.view.document.documentElement.click();
				console.log('do nothing as its the active profile - maybe rename?');
			} else if (classList.contains('profilist-create')) {
				console.log('create new profile');
			} else {
				e.view.PanelUI.toggle();
				var profName = origTarg.getAttribute('label');
				console.log('checking if running, either focus or launch profile');
				var promise_queryProfileLocked = ProfilistWorker.post('queryProfileLocked', [ini[profName].props.IsRelative, ini[profName].props.Path, profToolkit.rootPathDefault]);
				promise_queryProfileLocked.then(
					function(aVal) {
						//aVal is TRUE if LOCKED
						//aVal is FALSE if NOT locked
						if (aVal === 1) {
							console.log('profile', profName, 'is IN USE so FOCUS it');
							var promise_FMRWOP = ProfilistWorker.post('focusMostRecentWinOfProfile', [ini[profName].props.IsRelative, ini[profName].props.Path, profToolkit.rootPathDefault]);
							promise_FMRWOP.then(
								function() {
									console.log('succesfully focused most recent window');
								},
								function(aReason) {
									console.error('failed to focus most recent window, aReason:', aReason);
								}
							);
						} else if (aVal === 0) {
							console.log('profile', profName, 'is NOT in use so LAUNCH it');
							launchProfile(null, profName);
						} else {
							throw new Error('huh??? should not get here');
						}
					},
					function(aReason) {
						console.warn('failed to get status of profName', profName, 'aReason:', aReason);
					}
				);
			}
		},
		'profilist-clone': function() {
			console.log('wiggle for clone');
		},
		'profilist-inactive-del': function() {
			var nameOfProfileToDelete = origTarg.parentNode.parentNode.getAttribute('label');
			console.log('delete, prof name:', nameOfProfileToDelete);
			var promise_deleteProf = deleteProfile(0, nameOfProfileToDelete);
			promise_deleteProf.then(
				function() {
					console.log('succesfully deleted prof');
				},
				function(aReason) {
					console.error('deleting profile failed for aReason:', aReason);
				}
			);
		},
		'profilist-default': function() {
			console.log('set this profile as default');
		},
		'profilist-rename': function() {
			console.log('rename this one');
		},
		'profilist-dev-build': function() {
			console.log('change build');
			console.log('box:', box, 'origTarg:', origTarg);
			//box == box
			//origTarg == .profilist-dev-build
			var nameOfProfileSubmenuClickedOn = origTarg.parentNode.parentNode.getAttribute('label');
			console.log('prof dev build click, nameOfProfileSubmenuClickedOn:', nameOfProfileSubmenuClickedOn);
			if (tieOnEnter == '') {
				tieOnEnter = ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'];
			}
			
			var devBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']);
			
			if (!box.classList.contains('profilist-tied')) {
				box.classList.add('profilist-tied');
				ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'] = profToolkit.exePath; //do this to get proper casing, rather than profToolkit.exePathLower
				//check if profToolkit.exePathLower is in dev-builds, if it is then use its icon right way, else on mouse out download icon and add to dev-builds
				/*
				//check to make sure that exe path is in dev-builds
				try {
					devBuilds.forEach(function(b) {
						if (b[1].toLowerCase() == profToolkit.exePathLower) {
							box.style.backgroundImage = 'url("' + currentThisBuildsIconPath + '")'; //can use current as it will have been file formatted already
							ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'] = b[1];
							throw BreakException;
						}
					}
					//got here so it wasn't found so add this to dev-builds
					box.addEventListener('mouseleave', saveTieAndDownload, false);
				} catch (ex) {
					if (ex != BreakException) throw ex
				}
				*/
			} else {
				//has profilist-tied				
				try {
					devBuilds.forEach(function(b) {
						if (b[1].toLowerCase() != profToolkit.exePathLower && b[1] != ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie']) {
							if (/^(?:release|beta|aurora|nightly)$/m.test(b[0])) {
								var useIconPath = self.chrome_path + 'bullet_' + b[0] + '.png';
							} else {
								var useIconPath = OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.userApplicationDataDir, b[0])) + '#' + Math.random();
							}
							box.style.backgroundImage = 'url("' + useIconPath + '")';
							ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'] = b[1];
							throw BreakException;
						}
					});
					//either had nothing in there, or had just profToolkit.exePathLower in there. I THINK nothing in there is not supposed to happen. but its time to untie
					box.style.backgroundImage = '';
					delete ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'];
					box.classList.remove('profilist-tied');
				} catch (ex) { if (ex != BreakException) throw ex }
			}
			
			origTarg.addEventListener('mouseleave', saveTie, false); //learned: same e that got passed to tbb_box_click which is the containing parent func. gets passed to this addEventListener. very good. this is what i was hoping for.
		},
		'profilist-dev-safe': function() {
			console.log('launch this profile in safe mode');
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

var tieOnEnter = '';
function saveTie(e) {
	e.target.removeEventListener('mouseleave', saveTie, false);
	console.log('saving tie on e.target:', e.target); //e.target == .profilist-dev-build
	
	var nameOfProfileSubmenuClickedOn = e.target.parentNode.parentNode.getAttribute('label');
	console.log('saveTie nameOfProfileSubmenuClickedOn:', nameOfProfileSubmenuClickedOn);
	
	var theTieOnEnter = tieOnEnter;
	tieOnEnter = '';
	var tieOnLeave = ini[nameOfProfileSubmenuClickedOn].props['Profilist.tie'];
	if (theTieOnEnter != tieOnLeave) {
		console.log('SAVING ini as tie is different, it was:', theTieOnEnter, 'is now:', tieOnLeave);
		//start - if tie is not undefined, then check if its dev-builds if not then add it, this only happens if user clicks to enable first time, as that uses the current build, and if that current builds path was not already in dev-builds
		if (tieOnLeave && tieOnLeave.toLowerCase() == profToolkit.exePathLower) {
			var devBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']);
			try {
				devBuilds.forEach(function(b) {
					if (b[1].toLowerCase() == profToolkit.exePathLower) {
						throw BreakException;
					}
				});
				//start - profToolkit.exePathLower wasnt found in dev-builds so add it
				var iconP = updateChannel + '_auto.png'; //icon path
				var downloadP = currentThisBuildsIconPath; //its obviously the current builds path if got here
				xhr(downloadP, data => {
					//Services.prompt.alert(null, 'XHR Success', data);
					var file = OS.Path.join(OS.Constants.Path.userApplicationDataDir, iconP);
					var promise_downloadP_save = OS.File.writeAtomic(file, new Uint8Array(data));
					promise_downloadP_save.then(
						function() {
							console.log('succesfully saved image to desktop');
						},
						function(ex) {
							 console.error('FAILED in saving image to desktop');
						}
					);
				});
				devBuilds.push([iconP, tieOnLeave]);
				ini.General.props['Profilist.dev-builds'] = JSON.stringify(devBuilds);
				//end - it wasnt found in dev-builds so add it
			} catch (ex) { if (ex != BreakException) throw ex }
		}
		//end - if tie is not undefined, then check if its dev-builds if not then add it, this only happens if user clicks to enable first time, as that uses the current build, and if that current builds path was not already in dev-builds
		var promise_saveTie = writeIni();
		promise_saveTie.then(
			function() {
				//return Promise.resolve('writeIni success');
			},
			function(aReason) {
				//return Promise.reject('updating ini with newly created profile failed');
				console.error('failed to save ini for promise_saveTie, aReason:', aReason);
			}
		);
	} else {
		console.log('tie state UNCHANGED so do no saving');
	}
}

function xhr(url, cb) {
    let xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);

    let handler = ev => {
        evf(m => xhr.removeEventListener(m, handler, !1));
        switch (ev.type) {
            case 'load':
                if (xhr.status == 200) {
                    cb(xhr.response);
                    break;
                }
            default:
                Services.prompt.alert(null, 'XHR Error', 'Error Fetching Package: ' + xhr.statusText + ' [' + ev.type + ':' + xhr.status + ']');
                break;
        }
    };

    let evf = f => ['load', 'error', 'abort'].forEach(f);
    evf(m => xhr.addEventListener(m, handler, false));

    xhr.mozBackgroundRequest = true;
    xhr.open('GET', url, true);
    xhr.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_BYPASS_CACHE | Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING;
    xhr.responseType = "arraybuffer"; //dont set it, so it returns string, you dont want arraybuffer. you only want this if your url is to a zip file or some file you want to download and make a nsIArrayBufferInputStream out of it or something
    xhr.send(null);
}

function launchProfile(e, profName, suppressAlert, url) {
	console.info('in launchProfile');
	if (!profName) {
		var el = this;
		profName = el.getAttribute('label');
	}
	var win = Services.wm.getMostRecentWindow('navigator:browser');
	if (win.ProfilistInRenameMode) {
		//in rename mode;
//		console.log('window is in rename mode so dont launch profile');
		return;
	}
	//Services.prompt.alert(null, self.name + ' - ' + 'INFO', 'Will attempt to launch profile named "' + profName + '".');
	if (!suppressAlert) {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Launching Profile', 'Profile Name: "' + profName + '"', false, null, null, 'Profilist');
	}

	var found = false;
	for (var p in ini) {
		if (!('num' in ini[p])) { continue } //as its not a profile
		if (profName == p) {
			found = true;
			break;
		}
	}
			
	if (!found) {
		Services.prompt.alert(null, self.name + ' - ' + 'Launch Failed', 'An error occured while trying to launch profile named "' + profName + '". Profile name not found in Profiles.ini in memory.');
//		console.info('dump of profiles = ', ini);
		return false;
	}

	//var exe = FileUtils.getFile('XREExeF', []); //this gives path to executable
	var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
	process.init(profToolkit.exePath);
	
	var args = ['-P', profName, '-no-remote']; //-new-instance
	if (url) {
		args.push('about:home');
		args.push(url);
	}
	process.run(false, args, args.length);
}

function createUnnamedProfile() {
	//creating profile with name that already exists does nothing
	var promise = readIni();
	return promise.then(
		function() {
//			console.log('now that readIni success it will do stuff');
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
			}
			
			var digit = 1;
			var profName = 'Unnamed Profile 1'; //creates with default name
			while (profName in ini) {
				digit++;
				profName = 'Unnamed Profile ' + digit
			}

//			console.log('will now createProfile with name = ', profName);
			var promise1 = createProfile(0, profName);
			return promise1.then(
				function() {
//					console.log('createProfile promise succesfully completed');
					return Promise.resolve('createUnnamedProfile success');
				},
				function(aRejectReason) {
//					console.warn('Create profile failed. An exception occured when trying to delete the profile, see Browser Console for details. Ex = ', aRejectReason);
					Services.prompt.alert(null, self.name + ' - ' + 'Create Failed', aRejectReason.message);
					return Promise.reject('Create Failed. ' + aRejectReason.message);
				}
			);
		},
		function(aRejectReason) {
//			console.error('createProfile readIni promise rejected');
			Services.prompt.alert(null, self.name + ' - ' + 'Read Failed', aRejectReason.message);
			return Promise.reject('Read Failed. ' + aRejectReason.message);
		}
	);
}

function prevHide(e) {
	e.preventDefault();
	e.stopPropagation();
}

function beforecustomization(e) {
//	console.info('beforecustomization e = ', e);
	var doc = e.target.ownerDocument;
	var stack = doc.getElementById('profilist_box');
	var active = stack.querySelector('[status=active]');
	active.setAttribute('disabled', true);
}

function customizationending(e) {
//	console.info('customizationending e = ', e);

	/*
	var doc = e.target.ownerDocument;
	var stack = doc.getElementById('profilist_box');
	var active = stack.querySelector('[status=active]');
	active.removeAttribute('disabled');
	*/
}

var lastMaxStackHeight = 0;

/*start - windowlistener*/
var registered = false;
var updateThesePanelUI_on_promise_riapo_success = [];

var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.loadIntoWindow(aDOMWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
		
		registered = true;
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
		
		aDOMWindow.addEventListener('activate', activated, false); //because might have the options tab open in a non PanelUI window
		//var PanelUI = aDOMWindow.document.getElementById('PanelUI-popup');
		if (aDOMWindow.PanelUI) {
			PanelUI.panel.addEventListener('popupshowing', updateOnPanelShowing, false);
			aDOMWindow.gNavToolbox.addEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.addEventListener('customizationending', customizationending, false);
//			console.log('aDOMWindow.gNavToolbox', aDOMWindow.gNavToolbox);

			if ((aDOMWindow.PanelUI.panel.state == 'open' || aDOMWindow.PanelUI.panel.state == 'showing') || aDOMWindow.document.documentElement.hasAttribute('customizing')) { //or if in customize mode
			//start: point of this if is to populate panel dom IF it is visible
				console.log('visible in this window so populate its dom, aDOMWindow:', aDOMWindow);
				if (ini.UnInitialized) { //do this test to figure out if need to readIni
					ini.Pending_RIAPO = true;
					delete ini.UnInitialized;
					var promise_riapo = readIniAndParseObjs();
					updateThesePanelUI_on_promise_riapo_success.push(aDOMWindow);
					promise_riapo.then(
						function(aVal) {
							console.log('Success', 'promise_riapo');
							updateThesePanelUI_on_promise_riapo_success.forEach(function(subADOMWindow) {
								var upos_args = {
									e: null,
									aDOMWindow: subADOMWindow,
									readIni: 0
								};
								var promise_upos_liw_with_riapo = updatePanelOnShowing(upos_args.e, upos_args.aDOMWindow, upos_args.readIni);
								promise_upos_liw_with_riapo.then(
									function(aVal) {
										console.log('Success', 'promise_upos_liw_with_riapo', i);
									},
									function(aReason) {
										console.error('Rejected', 'promise_upos_liw_with_riapo', i, 'aReason:', aReason);
									}
								);
							});
							updateThesePanelUI_on_promise_riapo_success = null; //i hope this trashes the referenced dom windows in there //note: need to verify
						},
						function(aReason) {
							console.error('Rejected', 'promise_riapo', 'aReason:', aReason);
						}
					);
				} else if (ini.Pending_RIAPO) {
					updateThesePanelUI_on_promise_riapo_success.push(aDOMWindow);
				} else {
					var upos_args = {
						e: null,
						aDOMWindow: aDOMWindow,
						readIni: 0
					};
					var promise_upos_liw = updatePanelOnShowing(upos_args.e, upos_args.aDOMWindow, upos_args.readIni);
					promise_upos_liw.then(
						function(aVal) {
							console.log('Success', 'promise_upos_liw');
						},
						function(aReason) {
							console.error('Rejected', 'promise_upos_liw', 'aReason:', aReason);
						}
					);
				}
			} // end: point of this if is to populate panel dom IF it is visible
		}
		
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		aDOMWindow.removeEventListener('activate', activated, false);
		var PanelUI = aDOMWindow.document.getElementById('PanelUI-popup');
		if (PanelUI) {
			delete aDOMWindow.ProfilistInRenameMode;
			PanelUI.removeEventListener('popupshowing', updateOnPanelShowing, false);
			PanelUI.removeEventListener('popuphiding', prevHide, false);
			aDOMWindow.gNavToolbox.removeEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.removeEventListener('customizationending', customizationending, false);
			var profilistHBox = aDOMWindow.document.getElementById('profilist_box');
			if (profilistHBox) {
				profilistHBox.parentNode.removeChild(profilistHBox);
			}
			var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			domWinUtils.removeSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet
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
	on_UnknownPrefNameOnObj_Change: function(oldVal, newVal, refObj) {
		console.warn('on_UnknownPrefNameOnObj_Change', 'oldVal:', oldVal, 'newVal:', newVal, 'refObj:', refObj);
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
					var refObj = {
						branch_name: branch_name,
						pref_name: pref_name_on_obj,
						prefObj: prefObj,
						branchObj: branchObj
					};
					prefObj.on_PrefOnObj_Change(oldVal, newVal, refObj);
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
	var refObj = {
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
		refObj.prefObj = prefObj;
		if (prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute) {
			var msAgo_markedForSkip = new Date().getTime() - prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute;
			console.log('skipping this onChange as 2nd arg told to skip it, it was marked for skip this many ms ago:', msAgo_markedForSkip);
			delete prefObj.iHave__on_PrefOnObj_Change__butOnNextChangeSkipExecute
		} else {
			if (prefObj.on_PrefOnObj_Change) {
				prefObj.on_PrefOnObj_Change(oldVal, newVal, refObj);
			} else {
				//do nothing
			}
		}
		prefObj.value = newVal;
		console.log('prefObj value updated, prefObj:', prefObj);
	} else {
		if (branchObj.on_UnknownPrefNameOnObj_Change) {
			var oldVal = null; //i actually dont know if it existed before
			refObj.type = branchObj._branchLive.getPrefType(pref_name_on_tree);
			console.info('refObj.type:', refObj.type);
			if (refObj.type == 0) {
				console.info('unknownNameOnObj pref probably deleted');
				newVal = null;
			}
			var newVal = branchObj._branchLive['get' + typeStr_from_typeLong(refObj.type) + 'Pref'](pref_name_on_tree);
			refObj.setval = function(updateTo) {
				branchObj._branchLive['set' + typeStr_from_typeLong(refObj.type) + 'Pref'](pref_name_on_tree, updateTo);
			}
			branchObj.on_UnknownPrefNameOnObj_Change(oldVal, newVal, refObj);
		} else {
			//do nothing
		}
	}
	console.log('DONE on_PrefOnTree_Change');
};
////end pref listener stuff
//end pref stuff

var myPrefListener;
function writePrefToIni(oldVal, newVal, refObj) {
	console.info('on_PrefOnObj_Change', 'oldVal:', oldVal, 'newVal:', newVal, 'refObj:', refObj);
/*
	var promise0 = readIni();
	promise0.then(
		function() {
*/		
			var meat = function() {
				var value_in_ini = ini.General.props['Profilist.' + refObj.pref_name];
				if (refObj.prefObj.type == Ci.nsIPrefBranch.PREF_BOOL) {
					//value_in_ini = value_in_ini == 'false' ? false : true;
					//value_in_ini = ['false', false, 0].indexOf(value_in_ini) > -1 ? false : true;
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
				console.info('pre info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
				if (value_in_ini == newVal) {
					console.log('no need to writePrefToIni as the ini value is already what we are setting the pref to which is newVal');
				} else {
					console.log('updating ini right now');
					ini.General.props['Profilist.' + refObj.pref_name] = newVal;
					console.log('starting writeIni');
					var promise = writeIni();
					promise.then(
						function() {
							console.log('succesfully updated ini with pref value of ' + refObj.pref_name);
						},
						function() {
							console.error('failed to update ini with pref value of ' + refObj.pref_name);
						}
					);
				}
				console.info('POST info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
				//updateOptionTabsDOM(refObj.pref_name, newVal);
				cpCommPostMsg(['pref-to-dom', refObj.pref_name, newVal].join(subDataSplitter));
				
				console.info('destiny info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
			};
			
			if (!ini || !ini.General) {
				var promise0 = readIni();
				promise0.then(
					function() {
						meat();
					},
					function() {
						console.error('failed readIni in writePrefToIni');
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
		var promise = readIni();
		promise.then(
			function() {
				//Services.obs.notifyObservers(null, 'profilist-cp-server', ['read-ini-to-dom', JSON.stringify(ini)].join(subDataSplitter));
				cpCommPostMsg(['read-ini-to-dom', JSON.stringify(ini)].join(subDataSplitter));
			},
			function(aRejectReason) {
				throw new Error('Failed to read ini on reponse-clients-alive-for-win-activated-ini-refresh-and-dom-update for reason: ' + aRejectReason);
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
}

var observers = {
	'profilist-cp-client': {
		observe: function (aSubject, aTopic, aData) {
			cpClientListener(aSubject, aTopic, aData);
		},
		reg: function () {
			Services.obs.addObserver(observers['profilist-cp-client'], 'profilist-cp-client', false);
		},
		unreg: function () {
			console.error('removing server side observer for messages from profilist-cp-client');
			Services.obs.removeObserver(observers['profilist-cp-client'], 'profilist-cp-client');
		}
	}
};

/* start - control panel server/client communication */
const subDataSplitter = ':~:~:~:'; //note: must match splitter const used in client //used if observer from cp-server wants to send a subtopic and subdata, as i cant use subject in notifyObserver, which sucks, my other option is to register on a bunch of topics like `profilist.` but i dont want to 

var addonListener = {
  onPropertyChanged: function(addon, properties) {
	//console.log('props changed on addon:', addon.id, 'properties:', properties);
	if (addon.id == self.id) {
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
	Services.obs.notifyObservers(null, 'profilist-cp-server', msg);
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
		case 'query-client-born':
			if ('client-closing-if-i-no-other-clients-then-shutdown-listeners' in noResponseActiveTimers) {
				noResponseActiveTimers['client-closing-if-i-no-other-clients-then-shutdown-listeners'].cancel();
			}
			enableListenerForClients();
			var promise = readIni();
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
					var responseJson = {
						ini: ini,
						clientId: clientId
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
			Services.obs.notifyObservers(null, 'profilist-cp-client', 'read-ini-to-tree');
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
		default:
			throw new Error('"profilist-cp-server": aTopic of "' + aTopic + '" is unrecognized');
	}
}
/* end - control panel server/client communication */

function startup(aData, aReason) {
//	console.log('in startup');
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	PromiseWorker = Cu.import(self.chrome_path + 'modules/PromiseWorker.jsm').BasePromiseWorker;
	ProfilistWorker = new PromiseWorker(self.chrome_path + 'modules/workers/ProfilistWorker.js');
	//console.log('aData', aData);
//	//console.log('initing prof toolkit');
	initProfToolkit();
//	//console.log('init done');
	//updateProfToolkit(1, 1); //although i dont need the 2nd arg as its init
	//var css = '.findbar-container {-moz-binding:url(' + self.path.chrome + 'findbar.xml#matchword_xbl)}';
	//var cssEnc = encodeURIComponent(css);
	var newURIParam = {
		aURL: self.aData.resourceURI.spec + 'main.css', //'data:text/css,' + cssEnc,
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	//myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.AUTHOR_SHEET);
	
	//start pref stuff more
	myPrefListener = new PrefListener(); //init
	console.info('myPrefListener', myPrefListener);
	myPrefListener.register(aReason, false);
	//end pref stuff more
	
	windowListener.register();

	for (var o in observers) {
		observers[o].reg();
	}
	//ifClientsAliveEnsure_thenEnsureListenersAlive();
	onResponseEnsureEnabledElseDisabled();
	//Services.obs.notifyObservers(null, 'profilist-update-cp-dom', 'restart');
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
		
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
		observers[o].unreg();
	}
	
	//start pref stuff more
	myPrefListener.unregister();
	//end pref stuff more
	
	Cu.unload(self.chrome_path + 'modules/PromiseWorker.jsm');
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
}