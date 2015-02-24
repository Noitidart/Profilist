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
Cu.import('resource://gre/modules/PromiseUtils.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm');
//XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });
XPCOMUtils.defineLazyGetter(myServices, 'tps', function(){ return Cc['@mozilla.org/toolkit/profile-service;1'].createInstance(Ci.nsIToolkitProfileService) });
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });
XPCOMUtils.defineLazyGetter(myServices, 'dsp', function () { return Cc['@mozilla.org/file/directory_service;1'].getService(Ci.nsIProperties) });
XPCOMUtils.defineLazyGetter(myServices, 'stringBundle', function () { return Services.strings.createBundle('chrome://profilist/locale/bootstrap.properties?' + Math.random()) /* Randomize URI to work around bug 719376 */ });

var PromiseWorker;
var ProfilistWorker;

var ini = {UnInitialized:true};
var iniStr = ''; //str of ini on last read // for detection for if should write if diff
var iniReadStr = ''; //same like iniStr but no JSON'ing for detection if should continue parsing obj on read
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
var iniKeys_thatAffectDOM = ['Profilist.dev', 'Profilist.dev-builds'/*, 'StartWithLastProfile'*/, 'Default', 'Name', 'Profilist.tie', 'Profilist.badge']; // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
/*
//keys that i add to thatAffectDOM object:
num - outside of props // i just add num here so its known to me that i use it as affected to dom, but its outside of props so it wont be caught so i manually add it into the obj ~LINK683932~ //and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
Profilist.defaultProfilePath
Profilist.defaultProfileIsRelative - (not outside of props as if deafultProfilePath doesnt change this obviously doesnt change)
Profilist.currentThisBuildsIconPath
*/
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
		var promise_readIniAndParseObjs = new Deferred();
		var promise_iniObjFinalized = new Deferred();
		promise_iniObjFinalized.promise.then(
			function(aVal) {
				console.log('Success - promise_iniObjFinalized - aVal:', aVal);
				//parse objs
				iniStr = aVal; //or can do JSON.stringify(ini);
				//iniStr_thatAffectDOM
				iniObj_thatAffectDOM = {};
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
						}
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
						if (!('General' in iniObj_thatAffectDOM)) { // this block is needed because if its a totally untouched by profilist ini then no props are found so General doesnt exist in iniObj_thatAffectDOM
							iniObj_thatAffectDOM.General = {props:{}};
						}
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
				
				if (writeIfDiff || doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni) {
					if (doWriteCuzPrefsAreNotAllDefaultAndPrefValsNotFoundInIni) {
						console.log('will now do write because not all prefs were at default AND because none of the prefs were in the ini, if none were there but all were defalut i wouldnt bother doing this write');
					}
					// start - im not sure if i need to writeIniAndBkpIfDiff here // edit: is needed if prefs are not all at default
					var promise_writeIniAndBkpIfDiff = writeIniAndBkpIfDiff();
					return promise_writeIniAndBkpIfDiff.then(
						function(aVal) {
							console.log('Fullfilled - promise_writeIniAndBkpIfDiff - ', aVal);
							return promise_readIniAndParseObjs.resolve('objs parsed and wroteIfDiff');
						},
						function(aReason) {
							var refObj = {name:'promise_writeIniAndBkpIfDiff', aReason:aReason};
							console.error('Rejected - promise_writeIniAndBkpIfDiff - ', refObj);
							return promise_readIniAndParseObjs.resolve('objs parsed BUT wroteIfDiff failed');
						}
					).catch(
						function(aCaught) {
							console.error('Caught - promise_writeIniAndBkpIfDiff - ', aCaught);
							// throw aCaught;
						}
					);
					// end - im not sure if i need to writeIniAndBkpIfDiff here
				} else {
					return promise_readIniAndParseObjs.resolve('objs parsed');
				}
			},
			function(aReason) {
				var refObj = {name:'promise_iniObjFinalized', aReason:aReason};
				console.error('Rejected - promise_iniObjFinalized - ', refObj);
				return promise_readIniAndParseObjs.reject(refObj);
				//return Promise.reject('Rejected promise_iniObjFinalized aReason:' + aReason.message);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_iniObjFinalized - ', aCaught);
				// throw aCaught;
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
				console.log('Success', 'promise_readIni');
				if (Services.vc.compare(Services.appinfo.version, 30) < 0) {
					if (!decoder) {
						decoder = new TextDecoder(); // This decoder can be reused for several reads
					}
					var readStr = decoder.decode(aVal); // Convert this array to a text
				} else {
					var readStr = aVal;
				}
				if (iniReadStr == readStr) {
					promise_readIniAndParseObjs.resolve('no need to parse regex even, the readStr is same');
					console.log('no need to parse regex even, the readStr is same');
				} else {
					iniReadStr = readStr;
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
					if (readStr.indexOf('Profilist.touched=') > -1) { //note: Profilist.touched is json.stringify of an array holding paths it profilist was installed from, on uninstall it should remove self path from Profilist.touched and if its empty then it should prompt to delete all profilist settings & files
						console.log('ini object finalized via non-bkp');
						iniStr = JSON.stringify(ini);
						return promise_iniObjFinalized.resolve(iniStr);
						//return Promise.resolve('Success promise_readIni',);
					} else {
						console.log('ini was not touched');
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
								var somethingRestoredFromBkpToIni = false;
								for (var p in ini) {
									if (p in iniBkp) {
										for (var sub_p in iniBkp[p]) {
											if (sub_p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
												somethingRestoredFromBkpToIni = true;
												ini[p][sub_p] = iniBkp[p][sub_p];
											}
										}
										if ('num' in ini[p]) {
											//its a profile entry
											for (var sub_p in iniBkp[p].props) {
												if (sub_p.substr(0, 10/*'Profilist.'.length*/) == 'Profilist.') {
													somethingRestoredFromBkpToIni = true;
													ini[p].props[sub_p] = iniBkp[p].props[sub_p];
												}
											}
										}
									}
								}
								if (somethingRestoredFromBkpToIni) {
									iniStr = JSON.stringify(ini);
								}
								//return promise_iniObjFinalized.resolve('ini object finalized via bkp'); //promise_iniObjFinalized.then.promise onFulliflled expects aVal to be iniStr
								return promise_iniObjFinalized.resolve(iniStr);
							},
							function(aReason) {
								//console.error('Rejected', 'promise_readIniBkp', 'aReason:', aReason);
								if (aReason.becauseNoSuchFile) {
									// rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made
									//return promise_iniObjFinalized.resolve('rejected as bkp doesnt exist, so in this case then just resolve with what was read from initially and a profilist touch has to be made');
									console.warn('Rejected because .profilist.bkp doesnt exist, but still resolving as bkp will be made on next write when there is one, but because of htis line im not queueing a write');
									return promise_iniObjFinalized.resolve(iniStr); //promise_iniObjFinalized.then.promise onFulliflled expects aVal to be iniStr
								} else {
									console.error('Rejected - promise_readIniBkp - aReason:', aReason, 'Profiles.ini was not touched by Profilist and .profilist.bkp could not be read.');
									return promise_iniObjFinalized.reject('Profiles.ini was not touched by Profilist and .profilist.bkp could not be read. ' + aReason.message); //note: todo: should revisit, because if profilist.bkp cannot be read then this rejection cause it to not function at all, i should consider making it just continue as if ini was untouched
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
			},
			function(aReason) {
				var refObj = {name:'promise_readIni', aReason:aReason};
				console.error('Rejected - promise_readIni - ', refObj);
				return promise_iniObjFinalized.reject(refObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_readIni - ', aCaught);
				// throw aCaught;
			}
		);
		//end - read the ini file and if needed read the bkp to create the ini object
		return promise_readIniAndParseObjs.promise;
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
				var refObj = {name:'promise_writeIniAndBkp', aReason:aReason};
				console.error('Rejected - promise_writeIniAndBkp - ', refObj);
				//throw refObj;
				deferred_writeIniAndBkpIfDiff.reject(refObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_writeIniAndBkp - ', aCaught);
				deferred_writeIniAndBkpIfDiff.reject(refObj);
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
				var refObj = {name:'promise_writeIniBkp', aReason:aReason};
				console.error('Rejected - promise_writeIniBkp - ', refObj);
				//promise_iniObjFinalized.reject(refObj);
				throw refObj;
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
				var refObj = {name:'promise_writeIni', aReason:aReason};
				console.error('Rejected - promise_writeIni - ', refObj);
				//promise_iniObjFinalized.reject(refObj);
				throw refObj;
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
function createProfileNew(theProfileName, absolutProfile_pathToParentDir, refreshIni) {
	// returns promise
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
				if (ini[p].props.Name.toLowerCase() == LCased_theProfileName) {
					console.warn('The profile name of "' + theProfileName + '" is already taken.');
					deferred_createProfile.reject('The profile name of "' + theProfileName + '" is already taken.');
					return; // just to stop further execution into this postRefreshIni function
				}
				NProfiles++;
			}
			
			// generate folder path to create based on theProfileName
			var theDirName = saltName(theProfileName.replace(/([\\*:?<>|\/\"])/g, '%')); // ensure the folder name generated based on theProfileName works on the os file directory system
			var theRootPath;
			var theLocalPath;
			if (!absolutProfile_pathToParentDir) {
				theRootPath = OS.Path.join(profToolkit.rootPathDefault, dirName);
				theLocalPath = OS.Path.join(profToolkit.localPathDefault, dirName);
			} else {
				// absolute path profiles dont have a seperate local dir
				theRootPath = OS.Path.join(absolutProfile_pathToParentDir, theDirName);
			}
			
			// setup updateThenWriteIni
			var updateThenWriteIni = function() {
				// get PathToWriteToIni
				var PathToWriteToIni;
				if (!absolutProfile_pathToParentDir) {
					//get relative path
					var mRootDir = new FileUtils.File(OS.Constants.Path.userApplicationDataDir);
					var IniPathStr = FileUtils.getFile('DefProfRt', [dirName]);
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
				
				// write ini
				var promise_updateIniFile = writeIniAndBkp();
				promise_updateIniFile.then(
					function(aVal) {
						console.log('Fullfilled - promise_updateIniFile - ', aVal);
						// update then write ini
						deferred_createProfile.resolve('Profile "' + theProfileName + '" succesfully created');
					},
					function(aReason) {
						var refObj = {name:'promise_updateIniFile', aReason:aReason};
						console.warn('Rejected - promise_updateIniFile - ', refObj);
						deferred_createProfile.reject(refObj);
					}
				).catch(
					function(aCaught) {
						console.error('Caught - promise_updateIniFile - ', aCaught);
						var refObj = {name:'promise_updateIniFile', aCaught:aCaught};
						deferred_createProfile.reject(refObj);
					}
				);
			}
			// end setup updateThenWriteIni
			
			var promiseAllArr_make = [];
			
			var promise_makeRoot = OS.File.makeDir(theRootPath);
			promiseAllArr_make.push(promise_makeRoot);
			
			var deferred_writeTimesJson = new Deferred();
			promiseAllArr_make.push(deferred_writeTimesJson.promise);
			
			// set up to do the promise_writeTimes
			promise_makeRoot.then(
				function(aVal) {
					console.log('Fullfilled - promise_makeRoot - ', aVal);
					// start - writeTimes promise
						var writeStrForTimesJson = '{\n"created": ' + new Date().getTime() + '}\n';
						var timeJsonPath = OS.Path.join(theRootPath, 'times.json');
						var promise_writeAtomicTimes = OS.File.writeAtomic(timeJsonPath, writeStrForTimesJson, {tmpPath: timeJsonPath + '.profilist.tmp', encoding:'utf-8'});
						promise_writeAtomicTimes.then(
							function(aVal) {
								console.log('Fullfilled - promise_writeAtomicTimes - ', aVal);
								// do stuff here
								deferred_writeTimesJson.resolve('times json succesfully written');
							},
							function(aReason) {
								var refObj = {name:'promise_writeAtomicTimes', aReason:aReason};
								console.warn('Rejected - promise_writeAtomicTimes - ', refObj);
								deferred_writeTimesJson.reject(refObj);
							}
						).catch(
							function(aCaught) {
								console.error('Caught - promise_writeAtomicTimes - ', aCaught);
								var refObj = {name:'promise_writeAtomicTimes', aCaught:aCaught};
								deferred_writeTimesJson.reject(refObj);
							}
						);
					// end - writeTimes promise
				}
			);
			// dont need the reject or catch as these promise all go to promiseAll_make
			// end set up to do the promise_writeTimes
			
			if (absolutProfile_pathToParentDir) {
				var deferred_makeLocal = new Deferred();
				promiseAllArr_make.push(deferred_makeLocal.promise);
			}
			var promiseAll_make = Promise.all(promiseAllArr_make);			
			promiseAll_make.then(
				function(aVal) {
					console.log('Fullfilled - promiseAll_make - ', aVal);
					// update then write ini
					updateThenWriteIni();
				},
				function(aReason) {
					var refObj = {name:'promiseAll_make', aReason:aReason};
					console.warn('Rejected - promiseAll_make - ', refObj);
					deferred_createProfile.reject(refObj); //throw refObj;
				}
			).catch(
				function(aCaught) {
					console.error('Caught - promiseAll_make - ', aCaught);
					var refObj = {name:'promiseAll_make', aCaught:aCaught};
					deferred_createProfile.reject(refObj); // throw aCaught;
				}
			);
			
			// run promise to make root dir
			// run promise to make local dir
			// wait for root and local dir promise to complete, if they both complete, then promise write to ini
		//end - once i have ini contents updated then go here
	};
	// end - set up function for post ini read
	
	// start - setup post read ini stuff
	var deferred_waitReadIni = new Deferred();
	deferred_waitReadIni.then(
		function(aVal) {
			console.log('Fullfilled - deferred_waitReadIni - ', aVal);
			postRefreshIni();
		},
		function(aReason) {
			var refObj = {name:'deferred_waitReadIni', aReason:aReason};
			console.warn('Rejected - deferred_waitReadIni - ', refObj);
			deferred_createProfile.reject(refObj); //throw refObj;
		}
	).catch(
		function(aCaught) {
			console.error('Caught - deferred_waitReadIni - ', aCaught);
			var refObj = {name:'deferred_waitReadIni', aCaught:aCaught};
			deferred_createProfile.reject(refObj); // throw aCaught;
		}
	);
	// end - setup post read ini stuff
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		deferred_waitReadIni.resolve('no refresh arg set');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				deferred_waitReadIni.resolve('ini refreshed'); // go to post waitReadIni
			},
			function(aReason) {
				var refObj = {name:'promise_refreshIni', aReason:aReason};
				console.warn('Rejected - promise_refreshIni - ', refObj);
				deferred_createProfile.reject(refObj); //throw refObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var refObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_createProfile.reject(refObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_createProfile.promise;
}

function renameProfile(theProfileCurrentName, theProfileNewName, refreshIni) {
	// returns promise
	
	var deferred_renameProfile = new Deferred(); // function promise return
	
	// setup postRefreshIni
	var postRefreshIni = function() {
		// start by looping through to find profile in ini and also check if new name is available (as in not taken by another)
		var LCased_theProfileCurrentName = theProfileCurrentName.toLowerCase();
		var LCased_theProfileNewName = theProfileNewName.toLowerCase();
		var iniIdentifier = null;
		var newNameTaken = false;
		for (var p in ini) {
			var LCased_iteratedProfileName = ini[p].props.Name.toLowerCase();
			if (LCased_iteratedProfileName == LCased_theProfileCurrentName) {
				iniIdentifier = p;
			}
			if (LCased_iteratedProfileName == LCased_theProfileNewName) {
				newNameTaken = true;
			}
		}
		if (iniIdentifier === null) {
			console.warn('Could not find a profile with the name of "' + theProfileCurrentName + '" - so nothing to rename.');
			deferred_renameProfile.reject('Could not find a profile with the name of "' + theProfileCurrentName + '" - so nothing to rename.');
			return; // just to stop further execution into this function
		}
		if (newNameTaken === null) {
			console.warn('Another profile already has the new name of "' + theProfileNewName + '" - so cannot rename the profile of "' + theProfileCurrentName + '".');
			deferred_renameProfile.reject('Another profile already has the new name of "' + theProfileNewName + '" - so cannot rename the profile of "' + theProfileCurrentName + '".');
			return; // just to stop further execution into this function
		}
		
		// rename in bootstrap ini
		ini[theIdenter].props.Name = theProfileNewName;

		// write ini
		var promise_updateIniFile = writeIniAndBkp();
		promise_updateIniFile.then(
			function(aVal) {
				console.log('Fullfilled - promise_updateIniFile - ', aVal);
				deferred_renameProfile.resolve('Profile "' + theProfileCurrentNameName + '" succesfully renamed to "' + theProfileNewName + '"');
			},
			function(aReason) {
				var refObj = {name:'promise_updateIniFile', aReason:aReason};
				console.warn('Rejected - promise_updateIniFile - ', refObj);
				deferred_renameProfile.reject(refObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_updateIniFile - ', aCaught);
				var refObj = {name:'promise_updateIniFile', aCaught:aCaught};
				deferred_renameProfile.reject(refObj);
			}
		);
	};
	// end - setup postRefreshIni
	
	// start - setup post read ini stuff
	var deferred_waitReadIni = new Deferred();
	deferred_waitReadIni.then(
		function(aVal) {
			console.log('Fullfilled - deferred_waitReadIni - ', aVal);
			postRefreshIni();
		},
		function(aReason) {
			var refObj = {name:'deferred_waitReadIni', aReason:aReason};
			console.warn('Rejected - deferred_waitReadIni - ', refObj);
			deferred_renameProfile.reject(refObj); //throw refObj;
		}
	).catch(
		function(aCaught) {
			console.error('Caught - deferred_waitReadIni - ', aCaught);
			var refObj = {name:'deferred_waitReadIni', aCaught:aCaught};
			deferred_renameProfile.reject(refObj); // throw aCaught;
		}
	);
	// end - setup post read ini stuff
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		deferred_waitReadIni.resolve('no refresh arg set');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				deferred_waitReadIni.resolve('ini refreshed'); // go to post waitReadIni
			},
			function(aReason) {
				var refObj = {name:'promise_refreshIni', aReason:aReason};
				console.warn('Rejected - promise_refreshIni - ', refObj);
				deferred_renameProfile.reject(refObj); //throw refObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var refObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_renameProfile.reject(refObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_renameProfile.promise;
}

function deleteProfile(theProfileName, refreshIni) {
	// returns promise
	
	var deferred_deleteProfile = new Deferred(); // function promise return
	
	if (theProfileName.toLowerCase() == profToolkit.selectedProfile.name.toLowerCase()) {
		console.warn('"' + theProfileName + '" - is this profile, cannot delete a profile that is in use.');
		deferred_deleteProfile.reject('"' + theProfileName + '" - is this profile, cannot delete a profile that is in use.');
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
				for (var p in ini) {
					if (ini[p].num > ini[theIdenter].num) { // this expects .num to be parsed
						ini[p].num--; // this expects .num to be parsed
					}
				}
				delete ini[theIdenter];

				// write ini
				var promise_updateIniFile = writeIniAndBkp();
				promise_updateIniFile.then(
					function(aVal) {
						console.log('Fullfilled - promise_updateIniFile - ', aVal);
						// update then write ini
						deferred_deleteProfile.resolve('Profile "' + theProfileName + '" succesfully deleted');
					},
					function(aReason) {
						var refObj = {name:'promise_updateIniFile', aReason:aReason};
						console.warn('Rejected - promise_updateIniFile - ', refObj);
						deferred_deleteProfile.reject(refObj);
					}
				).catch(
					function(aCaught) {
						console.error('Caught - promise_updateIniFile - ', aCaught);
						var refObj = {name:'promise_updateIniFile', aCaught:aCaught};
						deferred_deleteProfile.reject(refObj);
					}
				);
				// end - remove from bootstrap ini then update ini
			},
			function(aReason) {
				var refObj = {name:'promiseAll_doDel', aReason:aReason};
				console.warn('Rejected - promiseAll_doDel - ', refObj);
				deferred_deleteProfile.reject(refObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promiseAll_doDel - ', aCaught);
				var refObj = {name:'promiseAll_doDel', aCaught:aCaught};
				deferred_deleteProfile.reject(refObj);
			}
		);
	};
	// end setup doDeletion
	
	// setup postRefreshIni
	var postRefreshIni = function() {
		var LCased_theProfileName = theProfileName.toLowerCase();
		var iniIdentifier = null;
		for (var p in ini) {
			if (ini[p].props.Name.toLowerCase() == LCased_theProfileName) {
				iniIdentifier = p;
			}
		}
		if (iniIdentifier === null) {
			console.warn('Could not find a profile with the name of "' + theProfileName + '" - so nothing to delete.');
			deferred_deleteProfile.reject('Could not find a profile with the name of "' + theProfileName + '" - so nothing to delete.');
			return; // just to stop further execution into this function
		}
		
		// check if profile is in use
		var promise_profInUseCheck = ProfilistWorker.post('queryProfileLocked', [ini[iniIdentifier].props.IsRelative, ini[iniIdentifier].props.Path, profToolkit.rootPathDefault]);
		promise_profInUseCheck.then(
			function(aVal) {
				console.log('Fullfilled - promise_profInUseCheck - ', aVal);
				// do stuff here
				if (aVal) {
					// aVal is true if locked
					deferred_deleteProfile.reject('"' + theProfileName + '" - is currently running, cannot delete a profile that is in use.');
					return; // to prevent further execution into func
				} else {
					doDeletion(iniIdentifier);
				}
			},
			function(aReason) {
				var refObj = {name:'promise_profInUseCheck', aReason:aReason};
				console.warn('Rejected - promise_profInUseCheck - ', refObj);
				deferred_deleteProfile.reject(refObj);
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_profInUseCheck - ', aCaught);
				var refObj = {name:'promise_profInUseCheck', aCaught:aCaught};
				deferred_deleteProfile.reject(refObj);
			}
		);
		
		
		promise_profLokChk.then(
			function(aVal) {
				console.log('Fullfilled - promise_profLokChk - ', aVal, 'objBoot[hoisted_p].num:', objBoot[hoisted_p].num, 'objBoot[hoisted_p].props.Name:', objBoot[hoisted_p].props.Name);
				
				//aVal is TRUE if LOCKED
				//aVal is FALSE if NOT locked
				if (aVal) {
					console.info('profile', objBoot[hoisted_p].props.Name, 'is IN USE');
					//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'active');
					PStack.childNodes[getChildNodeI(hoisted_p, objBoot, PStack)].setAttribute('status', 'active');
				} else {
					console.info('profile', objBoot[hoisted_p].props.Name, 'is NOT in use');
					//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'inactive');
					PStack.childNodes[getChildNodeI(hoisted_p, objBoot, PStack)].setAttribute('status', 'inactive');
				}
				
				return 'Success promise_profLokChk num: ' + objBoot[hoisted_p].num + ' and name: ' + objBoot[hoisted_p].props.Name;
			},
			function(aReason) {
				var refObj = {name:'promise_profLokChk', aReason:aReason, aExtra:objBoot[hoisted_p].num, aExtra2:objBoot[hoisted_p].props.Name};
				console.error('Rejected - promise_profLokChk - ', refObj);
				throw refObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_profLokChk - ', aCaught);
				// throw aCaught;
			}
		);		
	}
	// end setup postRefreshIni
	
	// start - setup post read ini stuff
	var deferred_waitReadIni = new Deferred();
	deferred_waitReadIni.then(
		function(aVal) {
			console.log('Fullfilled - deferred_waitReadIni - ', aVal);
			postRefreshIni();
		},
		function(aReason) {
			var refObj = {name:'deferred_waitReadIni', aReason:aReason};
			console.warn('Rejected - deferred_waitReadIni - ', refObj);
			deferred_deleteProfile.reject(refObj); //throw refObj;
		}
	).catch(
		function(aCaught) {
			console.error('Caught - deferred_waitReadIni - ', aCaught);
			var refObj = {name:'deferred_waitReadIni', aCaught:aCaught};
			deferred_deleteProfile.reject(refObj); // throw aCaught;
		}
	);
	// end - setup post read ini stuff
	
	// start - figure out and based on do refresh ini
	if (!refreshIni) {
		deferred_waitReadIni.resolve('no refresh arg set');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
		promise_refreshIni.then(
			function(aVal) {
				console.log('Fullfilled - promise_refreshIni - ', aVal);
				deferred_waitReadIni.resolve('ini refreshed'); // go to post waitReadIni
			},
			function(aReason) {
				var refObj = {name:'promise_refreshIni', aReason:aReason};
				console.warn('Rejected - promise_refreshIni - ', refObj);
				deferred_deleteProfile.reject(refObj); //throw refObj;
			}
		).catch(
			function(aCaught) {
				console.error('Caught - promise_refreshIni - ', aCaught);
				var refObj = {name:'promise_refreshIni', aCaught:aCaught};
				deferred_deleteProfile.reject(refObj); // throw aCaught;
			}
		);
	}
	// end - figure out and based on do refresh ini
	
	return deferred_deleteProfile.promise;
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
	profToolkit.path_iniBkpFile = OS.Path.join(profToolkit.path_iniDir, 'profilist_data', 'profiles.ini.profilist.bkp'); // profToolkit.path_iniFile + '.profilist.bkp';
	
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

function updateOnPanelHid(e) {
	// do these actions on hid because like if we dont close it, then if user goes to customize, then it remains open blah blah ya
	console.log('execing updateOnPanelHid, e:', e);
	if (e.target.id != 'PanelUI-popup') { return }
	
	var DOMWin = e.view;
	DOMWin.Profilist.PBox.style.height = collapsedheight + 'px';
	DOMWin.Profilist.PBox.classList.remove('profilist-hovered');
}

function updateOnPanelShowing(e, aDOMWindow, dontRefreshIni) { //returns promise
	//does not fire when entering customize mode
	
	//get aDOMWindow
	if (!aDOMWindow) {
		if (!e) {
			throw new Error('no e and no aDOMWindow');
			//return false;
			//return Promise.reject('no e and no aDOMWindow');
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
	// http://mxr.mozilla.org/mozilla-beta/source/browser/components/customizableui/content/panelUI.js#26
	// tells you like .panel is PanelUI-popup etc
	
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
					['xul:box', {class:'profilist-tbb-box', id:'profilist-loading', /*key:'profilist-loading', */disabled:'true', label:myServices.stringBundle.GetStringFromName('loading-profiles')}]
				]
			];
			var basePNodes = {}; //baseProfilistNodes
			var PBox = jsonToDOM(profilistHBoxJSON, aDOMWindow.document, basePNodes);
			PUIf.insertBefore(PBox, PUIf.firstChild);
			PStack = PBox.childNodes[0];
			PLoading = PStack.childNodes[0];
			
			aDOMWindow.Profilist.PBox = PBox; /* link 646432132158 */
			aDOMWindow.Profilist.PStack = PStack;
			//aDOMWindow.Profilist.PLoading = PLoading;
			
			if (!PUIsync_height) {
				PUIsync_height = PLoading.boxObject.height;
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
			
			PBox.addEventListener('mouseenter', function(e) {
				e.stopPropagation();
				expandedheight = PStack.childNodes.length * PUIsync_height;
				PBox.addEventListener('transitionend', function(e2) {
					PBox.removeEventListener('transitionend', arguments.callee, false);
					e2.stopPropagation();
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
			}, false);
			PBox.addEventListener('mouseleave', function(e) {
				e.stopPropagation();
				if (PBox.classList.contains('profilist-keep-open')) { return }
				PBox.style.height = collapsedheight + 'px';
				PBox.classList.remove('profilist-hovered');
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
		var defer_refreshIni = new Deferred();
		var promise_refreshIni = defer_refreshIni.promise;
		promise_refreshIni.resolve('dontRefreshIni is true so will skipped readIniAndParseObjs');
	} else {
		var promise_refreshIni = readIniAndParseObjs();
	}
	return promise_refreshIni.then( /* note LINK 87318*/
		function(aVal) {
			console.log('Fullfilled - promise_refreshIni - ', aVal);
			//////////////////////////////// start - do dom stuff
			//compare aDOMWindow.Profilist.iniObj_thatAffectDOM to global iniObj_thatAffectDOM
			
			//note, in the dom, the tbb_boxes should be in order as they are seen in iniFile
			
			//and also i only check for changes in .props so num is outside of it so i just use that for childNode targeting ~LINK65484200~
			if (!('iniObj_thatAffectDOM' in aDOMWindow.Profilist)) {
				aDOMWindow.Profilist.iniObj_thatAffectDOM = {};
				
				PStack.removeChild(PStack.childNodes[0]); //remove loading
				
				//create and add create new profile tbb
				var elFromJson_createNewProfile = jsonToDOM(
					['xul:box', {class:'profilist-tbb-box profilist-create', label:myServices.stringBundle.GetStringFromName('create-new-profile'), top:0}]
					, aDOMWindow.document
					, {}
				);
				//{identifier:'[label="Create New Profile"]', label:'Create New Profile', class:'profilist-tbb-box profilist-create profilist-do_not_auto_remove', addEventListener:['click',createUnnamedProfile,false], style:tbb_style}
				elFromJson_createNewProfile.addEventListener('click', tbb_box_click, false);
				PStack.appendChild(elFromJson_createNewProfile);
				
				//profToolkit.selectedProfile.iniKey == null then this is a temporary profile
				/*
				var elFromJson_currentProfile = jsonToDOM(
					['xul:box', {class:'profilist-tbb-box profilist-cur-prof', label:myServices.stringBundle.GetStringFromName('temporary-profile'), status:'active', top:0}]
					, aDOMWindow.document
					, {}
				);
				*/
				////// copy/modification/strips of block 8752123154
				var elJson = ['xul:box', {class:['profilist-tbb-box', 'profilist-tbb-box-inactivatable profilist-cur-profile'], status:'active', style:['margin-top:0'], top:0}];
				var sIniKey = profToolkit.selectedProfile.iniKey;
				if (sIniKey) {
					elJson[1].label = ini[sIniKey].props.Name;
					if ('Default' in ini[sIniKey].props && ini[sIniKey].props.Default == '1') {
						elJson[1].isdefault = true;
					}
					if (/*myPrefListener.watchBranches[myPrefBranch].prefNames['dev'] == 'true' && */'Profilist.tie' in ini[sIniKey].props) {
						var bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse = cssBackgroundUrl_for_devBuildExePath(ini[sIniKey].props['Profilist.tie']);
						if (bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse) {
							elJson[1].class.push('profilist-tied');
							elJson[1].style.push('backgroundImage: url("' + bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse + '")');
						} else {
							console.warn('profile is tied, but tied path was not found in dev-builds array', 'dev-builds:', devBuildsPathsAndIconsArr, 'tie:', ini[sIniKey].props['Profilist.tie'], 'sIniKey:', sIniKey);
							throw 'profile is tied' + ' '  + 'but tied path was not found in dev-builds array' + ' ' + 'dev-builds:' + ' ' + devBuildsPathsAndIconsArr + ' ' + 'tie:' + ' ' + ini[sIniKey].props['Profilist.tie'] + ' ' + 'sIniKey:' + ' ' + sIniKey;
						}
					}
					if ('Profilist.badge' in ini[sIniKey].props) {
						elJson[1].badge = getPathToBadge(ini[sIniKey].props['Profilist.badge'], 16);
					}
					elJson[1].class = elJson[1].class.join(' ');
					elJson[1].style = elJson[1].style.join('; ');
				} else {
					//is temp profile
					elJson[1].label = myServices.stringBundle.GetStringFromName('temporary-profile');
				}
				var elFromJson = jsonToDOM(	// make jsonToDOM of ini[pb].props
					elJson
					, aDOMWindow.document
					, {}
				);
				elFromJson.addEventListener('click', tbb_box_click, false);
				////// end copy/modification/strips of block 8752123154
				
				PStack.appendChild(elFromJson);
			}
			
			var objWin = aDOMWindow.Profilist.iniObj_thatAffectDOM; //just to short form it
			var objBoot = iniObj_thatAffectDOM; //just to short form it
			
			var str_ObjWin = JSON.stringify(objWin);
			var str_ObjBoot = JSON.stringify(objBoot);
			
			//console.log('str_ObjBoot', str_ObjBoot, 'str_ObjWin', str_ObjWin);
			
			if (str_ObjBoot != str_ObjWin) {
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
								}
							} else if ('num' in objWin[pw]) { //can alternatively do `'num' in objBoot[pw]` notice the objBoot
								var childNodeI = getChildNodeI(pw, objWin, PStack);
								if (ppChanged[i].pp == 'Profilist.tie') {
									PStack.childNodes[childNodeI].style.backgroundImage = 'url("' + cssBackgroundUrl_for_devBuildExePath(ppChanged[i].now) + '")';
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
								if (ppAdded[i].pp == 'Profilist.tie') {
									PStack.childNodes[childNodeI].classList.add('profilist-tied');
									PStack.childNodes[childNodeI].style.backgroundImage = 'url("' + cssBackgroundUrl_for_devBuildExePath(ppAdded[i].now) + '")';
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
								if (/*myPrefListener.watchBranches[myPrefBranch].prefNames['dev'] == 'true' &&*/ 'Profilist.tie' in objBoot[pb].props) {
									var bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse = cssBackgroundUrl_for_devBuildExePath(objBoot[pb].props['Profilist.tie']);
									if (bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse) {
										elJson[1].class.push('profilist-tied');
										elJson[1].style.push('backgroundImage: url("' + bgImgUrl_elseIfTiePathNotFoundInDevBuildsIAmFalse + '")');
									} else {
										console.warn('profile is tied, but tied path was not found in dev-builds array', 'dev-builds:', devBuildsPathsAndIconsArr, 'tie:', objBoot[pb].props['Profilist.tie'], 'pb:', pb);
										throw 'profile is tied' + ' '  + 'but tied path was not found in dev-builds array' + ' ' + 'dev-builds:' + ' ' + devBuildsPathsAndIconsArr + ' ' + 'tie:' + ' ' + objBoot[pb].props['Profilist.tie'] + ' ' + 'pb:' + ' ' + pb;
									}
								}
								if ('Profilist.badge' in objBoot[pb].props) {
									elJson[1].badge = getPathToBadge(objBoot[pb].props['Profilist.badge'], 16);
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
								PStack.insertBefore(elFromJson, PStack.childNodes[childNodeI]); // note: assuming: no need to do `PStack.childNodes[objBoot[pb].num + 1] ? PStack.childNodes[objBoot[pb].num + 1] : PStack.childNodes[PStack.childNodes.length - 1]` because there always has to be at least "create new button" element, so profile button is never inserted as last child
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
				
			//10. update running icons
			//var PTbbBoxes = PStack.childNodes;
			var promiseAll_updateStatuses = [];
			for (var p in ini) {
				if ('num' in ini[p]) {
					if (p == profToolkit.selectedProfile.iniKey) { // alt to `if (ini[p].props.Name == profToolkit.selectedProfile.name) {`
						console.log('profile', p, 'is the active profile so in use duh', 'prof name:', ini[p].props.Name);
						continue;
					}
					var promise_profLokChk = ProfilistWorker.post('queryProfileLocked', [ini[p].props.IsRelative, ini[p].props.Path, profToolkit.rootPathDefault]);
					promiseAll_updateStatuses.push(promise_profLokChk);
					
					let hoisted_p = p;
					promise_profLokChk.then(
						function(aVal) {
							console.log('Fullfilled - promise_profLokChk - ', aVal, 'objBoot[hoisted_p].num:', objBoot[hoisted_p].num, 'objBoot[hoisted_p].props.Name:', objBoot[hoisted_p].props.Name);
							
							//aVal is TRUE if LOCKED
							//aVal is FALSE if NOT locked
							if (aVal) {
								console.info('profile', objBoot[hoisted_p].props.Name, 'is IN USE');
								//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'active');
								PStack.childNodes[getChildNodeI(hoisted_p, objBoot, PStack)].setAttribute('status', 'active');
							} else {
								console.info('profile', objBoot[hoisted_p].props.Name, 'is NOT in use');
								//tbb_boxes[tbb_boxes_name_to_i[p]].setAttribute('status', 'inactive');
								PStack.childNodes[getChildNodeI(hoisted_p, objBoot, PStack)].setAttribute('status', 'inactive');
							}
							
							return 'Success promise_profLokChk num: ' + objBoot[hoisted_p].num + ' and name: ' + objBoot[hoisted_p].props.Name;
						},
						function(aReason) {
							var refObj = {name:'promise_profLokChk', aReason:aReason, aExtra:objBoot[hoisted_p].num, aExtra2:objBoot[hoisted_p].props.Name};
							console.error('Rejected - promise_profLokChk - ', refObj);
							throw refObj;
						}
					).catch(
						function(aCaught) {
							console.error('Caught - promise_profLokChk - ', aCaught);
							// throw aCaught;
						}
					);
				}
			}
			
			return Promise.all(promiseAll_updateStatuses).then(
				function(aVal) {
					console.log('Fullfilled - promiseAll_updateStatuses - ', aVal);
					return 'all statuses updated';
				},
				function(aReason) {
					var refObj = {name:'promiseAll_updateStatuses', aReason:aReason, aExtra:ini[p].num, aExtra2:ini[p].props.Name};
					console.error('Rejected - promiseAll_updateStatuses - ', refObj);
					throw refObj;
				}
			).catch(
				function(aCaught) {
					console.error('Caught - promiseAll_updateStatuses - ', aCaught);
					// throw aCaught;
				}
			);
			
			/* // i dont think i need this, updatePanel's purpose is just to take ini to dom
			// start - im not sure if i need to writeIniAndBkpIfDiff here
			var promise_writeIniAndBkpIfDiff = writeIniAndBkpIfDiff();
			return promise_writeIniAndBkpIfDiff.then(
				function(aVal) {
					console.log('Fullfilled - promise_writeIniAndBkpIfDiff - ', aVal);
					return aVal;
				},
				function(aReason) {
					var refObj = {name:'promise_writeIniAndBkpIfDiff', aReason:aReason};
					console.error('Rejected - promise_writeIniAndBkpIfDiff - ', refObj);
					throw refObj;
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
		},
		function(aReason) {
			var refObj = {name:'promise_refreshIni', aReason:aReason};
			console.error('Rejected - promise_refreshIni - ', refObj);
		}
	).catch(
		function(aCaught) {
			console.error('Caught - promise_refreshIni - ', aCaught);
			// throw aCaught;
		}
	);

	//end read ini
	
	//////////////////////////// start - old stuff
	/* old stuff
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
	old stuff */
	//////////////////////////// end - old stuff
}

function getChildNodeI(key, obj, stack) {
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

function cssBackgroundUrl_for_devBuildExePath(exePath) {
	var devBuildsPathsAndIconsArr = JSON.parse(myPrefListener.watchBranches[myPrefBranch].prefNames['dev-builds']);
	//var tieFoundInArr = false;
	for (var i=0; i<devBuildsPathsAndIconsArr.length; i++) {
		if (devBuildsPathsAndIconsArr[i][1] == exePath) {
			//tieFoundInArr = true;
			console.info('tieFound/path so path to icon of this tiePath is:', devBuildsPathsAndIconsArr[i][0]);
			if (/^(?:release|beta|aurora|nightly)$/m.test(exePath)) {
				return self.chrome_path + 'bullet_' + b[0] + '.png';
			} else {
				return OS.Path.toFileURI(OS.Path.join(OS.Constants.Path.userApplicationDataDir, exePath) + '#' + Math.random());
			}
			break;
		}
	}
	return false; //will only get here if it doesnt find return th tie
	
	/* if (!tieFoundInArr) {
		return false;
	} else {
		throw 'should never get here as if tie was found it should have returend it';
	} */
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
	var targetedTBB = e.target;
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
			
			var targetedProfileName = targetedTBB.getAttribute('label');
			targetedTBB.classList.add('profilist-in-badge-change');
			console.log('targetedProfileName:', targetedProfileName);
			
			var PUI = origTarg.ownerDocument.defaultView.PanelUI.panel;
			PUI.addEventListener('popuphiding', keepPuiShowing, false);
			
			origTarg.ownerDocument.defaultView.Profilist.PBox.classList.add('profilist-keep-open');
			
			Services.prompt.alert(origTarg.ownerDocument.defaultView, 'Profilist - Badging Process', 'You are on Mac OS X, ideally you should multi-select from the upcoming file dialog, 7 images. They should each be a square image of sizes 16px, 32px, 64px, 128px, 256px, and 512px. Only the 16px will be shown in the Firefox Profilist menu, but the other sizes will be used for generating badged icons for shortcuts. If a match for the size needed is not found, then the nearest sized one is scaled, this will lead to reduced quality on the scaled images. So supply high quality images of each image if you can.');
			var promise_doBadgeProc = showPick4Badging(origTarg.ownerDocument.defaultView);
			
			var postPromise = function() {
				origTarg.ownerDocument.defaultView.Profilist.PBox.classList.remove('profilist-keep-open');
				PUI.removeEventListener('popuphiding', keepPuiShowing, false);
				targetedTBB.classList.remove('profilist-in-badge-change');
			};
			
			promise_doBadgeProc.then(
				function(aVal) {
					console.log('Fullfilled - promise_doBadgeProc - ', aVal);
					// start - do stuff here - promise_doBadgeProc
					//Services.prompt.alert(null, '', aVal + '_16.png');
					for (var k in ini) {
						if ('num' in ini[k] && ini[k].props.Name == targetedProfileName) {
							ini[k].props['Profilist.badge'] = aVal;
							break;
						}
					}
					targetedTBB.setAttribute('badge', getPathToBadge(ini[k].props['Profilist.badge'], '16'));
					writeIniAndBkp();
					postPromise();
					// end - do stuff here - promise_doBadgeProc
				},
				function(aReason) {
					var refObj = {name:'promise_doBadgeProc', aReason:aReason};
					console.warn('Rejected - promise_doBadgeProc - ', refObj);
					postPromise();
				}
			).catch(
				function(aCaught) {
					var refObj = {name:'promise_doBadgeProc', aCaught:aCaught};
					console.error('Caught - promise_doBadgeProc - ', refObj);
					postPromise();
				}
			);
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

function keepPuiShowing(e) {
	console.log('keepPuiShowing, e:', e);
	var PUI = e.target.ownerDocument.defaultView.PanelUI.panel;
	PUI.style.opacity = 1;
	e.stopPropagation();
	e.preventDefault();
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
	//var stack = doc.getElementById('profilist_box');
	//var active = stack.querySelector('[status=active]');
	//active.setAttribute('disabled', true);
	
	var aDOMWindow = doc.defaultView;
	console.info('aDOMWindow.Profilist:', aDOMWindow.Profilist); //if aDOMWindow.Profilist is undefined then it hasnt been built yet
	updateOnPanelShowing(null, aDOMWindow); //builds it if its not there
	aDOMWindow.Profilist.PBox.setAttribute('disabled', true);
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
	aDOMWindow.Profilist.PBox.removetAttribute('disabled');
}

var lastMaxStackHeight = 0;

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
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
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
			domWinUtils.loadSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet //NOTE: IMPORTANT: Intermittently this errors, it says illegal value, but when i dump cssUri value its this: `"jar:file:///C:/Users/Vayeate/AppData/Roaming/Mozilla/Firefox/Profiles/j0a1zjle.Unnamed%20Profile%201/extensions/Profilist@jetpack.xpi!/main.css"` SO i changed cssUri = to self.chrome_path INSTEAD of `self.aData.resourceURI.spec` ill see how that works out ACTUALLY event with chrome_path its doing the same but only on second and after, meaning its not getting unregistered on uninstall
			
			pnl.addEventListener('popupshowing', updateOnPanelShowing, false);
			pnl.addEventListener('popuphidden', updateOnPanelHid, false);
			aDOMWindow.gNavToolbox.addEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.addEventListener('customizationending', customizationending, false);
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
			PUI.removeEventListener('popuphiding', prevHide, false);
			aDOMWindow.gNavToolbox.removeEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.removeEventListener('customizationending', customizationending, false);
			
			if (aDOMWindow.Profilist !== null) {
				//note: as soon as Profilist is initated as object it should come with PBox, thats why i can just check for null here /* link 646432132158 */
				var PBox = aDOMWindow.Profilist.PBox;
				PBox.parentNode.removeChild(PBox);
			}
			
			var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			domWinUtils.removeSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet
			delete aDOMWindow.Profilist;
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
					  if (value_in_ini == 'false' || value_in_ini == '0') {
						value_in_ini = false;
						ini.General.props['Profilist.' + refObj.pref_name] = false;
						console.error('HAD TO MAKE FIX programtically, this needs to be fixed as it will cause problems, so go trace how the boolean pref was stored as string');
					  } else if (value_in_ini == 'true' || value_in_ini == '1') {
						value_in_ini = true;
						ini.General.props['Profilist.' + refObj.pref_name] = true;
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
					ini.General.props['Profilist.' + refObj.pref_name] = newVal;
					console.log('starting writeIni');
					var promise_writeIniAndBkpForPrefObs = writeIniAndBkp(); // no need to do writeIniAndBkpIfDiff() as pref val is changing so obviously different (i think)
					promise_writeIniAndBkpForPrefObs.then(
						function(aVal) {
							console.log('Fullfilled - promise_writeIniAndBkpForPrefObs - ', aVal, 'succesfully updated ini with new pref value. the pref name is:', refObj.pref_name);
						},
						function(aReason) {
							var refObj = {name:'promise_writeIniAndBkpForPrefObs', aReason:aReason, aExtra:'failed to update ini with new pref value. the pref name is:"' + refObj.pref_name + '" and the new value is "' + newVal + '"'};
							console.error('Rejected - promise_writeIniAndBkpForPrefObs - ', refObj);
						}
					).catch(
						function(aCaught) {
							console.error('Caught - promise_writeIniAndBkpForPrefObs - ', aCaught);
							// throw aCaught;
						}
					);
				}
				console.info('POST info', 'value_in_ini:', value_in_ini, 'newVal:', newVal, 'uneval(ini.General.props)', uneval(ini.General.props))
				//updateOptionTabsDOM(refObj.pref_name, newVal);
				cpCommPostMsg(['pref-to-dom', refObj.pref_name, newVal].join(subDataSplitter));
				
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
						var refObj = {name:'promise_iniReadForPrefObs', aReason:aReason, aExtra:'failed readIni in writePrefToIni'};
						console.error('Rejected - promise_iniReadForPrefObs - ', refObj);
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
				var refObj = {name:'promise_iniReadForOptsTabResponse', aReason:aReason, aExtra:'Failed to read ini on reponse-clients-alive-for-win-activated-ini-refresh-and-dom-update'};
				console.error('Rejected - promise_iniReadForOptsTabResponse - ', refObj);
				throw new Error(refObj);
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

// start - file picker for changing badge
var getPathToBadge_templateFileUri;
var getPathToBadge_templatePlatformPath;
var getPathToBadge_seperator;
function getPathToBadge(uniqueName, size, pathType) {
	if (!getPathToBadge_templatePlatformPath) {
		getPathToBadge_templatePlatformPath = OS.Path.join(profToolkit.path_iniDir, 'profilist_data', 'badge_iconsets', 'UNIQUE____NAME', 'UNIQUE____NAME');
		getPathToBadge_templateFileUri = OS.Path.toFileURI(getPathToBadge_templatePlatformPath);
	}
	if (!pathType) {
		//return fileuri
		return getPathToBadge_templateFileUri.replace(/UNIQUE____NAME/g, uniqueName) + '_' + size + '.png';
	} else {
		//return platform path
		return getPathToBadge_templatePlatformPath.replace(/UNIQUE____NAME/g, uniqueName) + '_' + size + '.png';
	}
}
function showPick4Badging(win) {
	// returns promise
	// if badge succesfully made, it resolves to the uniqueName, get a path to it like this: OS.Path.toFileURI(OS.Path.join(profToolkit.path_iniDir, 'profilist_data', 'badge_iconsets', aVal, aVal + '_16.png')) NO LONGER THIS: `with the platform path without ext or size. so to use it append a _SIZE.png`
	var deferred_mainnnn = new Deferred();
	var deferred_badgeProcess;
	
	var msgsToUser = [];
	var reqdSizes = [16, 32, 64, 128, 256, 512]; //for mac
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
					var refObj = {name:'promiseAllArr_writePngs.promise', aReason:aReason};
					console.warn('Rejected - promiseAllArr_writePngs - ', refObj);
					refDeferred.reject(refObj);
				}
			).catch(
				function(aCaught) {
					var refObj = {name:'promiseAllArr_writePngs', aCaught:aCaught};
					console.error('Caught - promiseAllArr_writePngs - ', refObj);
					refDeferred.reject(refObj);
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
				var refObj = {name:'promiseAll_scaleAndWriteAll', aReason:aReason};
				console.warn('Rejected - promiseAll_scaleAndWriteAll - ', refObj);
				deferred_badgeProcess.reject(refObj);
			}
		).catch(
			function(aCaught) {
				var refObj = {name:'promiseAll_scaleAndWriteAll', aCaught:aCaught};
				console.error('Caught - promiseAll_scaleAndWriteAll - ', refObj);
				deferred_badgeProcess.reject(refObj);
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
				var refObj = {name:'deferred_badgeProcess', aReason:aReason};
				console.warn('Rejected - deferred_badgeProcess - ', refObj);
				if (msgsToUser.length >0) {
					Services.prompt.alert(win, 'Profilist - Badging Failed', msgsToUser.join('\n'));
				}
				deferred_mainnnn.reject('rejected');
			}
		).catch(
			function(aCaught) {
				var refObj = {name:'deferred_badgeProcess', aCaught:aCaught};
				console.error('Caught - deferred_badgeProcess - ', refObj);
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
				var refObj = {name:'promiseAll_loadAllImgs', aReason:aReason};
				console.warn('Rejected - promiseAll_loadAllImgs - ', refObj);
				deferred_badgeProcess.reject('Should never get here, I never reject it');
			}
		).catch(
			function(aCaught) {
				var refObj = {name:'promiseAll_loadAllImgs', aCaught:aCaught};
				console.error('Caught - promiseAll_loadAllImgs - ', refObj);
				msgsToUser.splice(0, 0, 'Error during code exectuion, this one is fault of developer.\n');
				deferred_badgeProcess.reject('Error during code exectuion, this one is fault of developer.');
			}
		);
	} else {
		deferred_mainnnn.resolve('canceled picker');
	}
	
	return deferred_mainnnn.promise;
}
// end - file picker for changing badge

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
		aURL: self.chrome_path /*self.aData.resourceURI.spec*/ + 'main.css', //'data:text/css,' + cssEnc,
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
	
	var promise_iniFirstRead = readIniAndParseObjs();
	promise_iniFirstRead.then(
		function(aVal) {
			console.log('Fullfilled - promise_iniFirstRead - ', aVal);
			
			windowListener.register();
			
			for (var o in observers) {
				if (observers[o].preReg) { observers[o].preReg() }
				Services.obs.addObserver(observers[o].anObserver, o, false);
				observers[o].WAS_REGGED = true;
				if (observers[o].postReg) { observers[o].postReg() }
			}
			//ifClientsAliveEnsure_thenEnsureListenersAlive();
			onResponseEnsureEnabledElseDisabled();
			//Services.obs.notifyObservers(null, 'profilist-update-cp-dom', 'restart');
		},
		function(aReason) {
			var refObj = {name:'promise_iniFirstRead', aReason:aReason};
			console.error('Rejected - promise_iniFirstRead - ', refObj);
		}
	).catch(
		function(aCaught) {
			console.error('Caught - promise_iniFirstRead - ', aCaught);
			// throw aCaught;
		}
	);
	
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

// start - custom to profilist helper functions
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
// end - custom to profilist helper functions

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

	if (!('from' in options)) {
		console.error('you have no need to use this, as this is meant to allow creation from a folder that you know for sure exists');
		throw new Error('you have no need to use this, as this is meant to allow creation from a folder that you know for sure exists');
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
		var promise_makeDir = OS.File.makeDir(pathExistsForCertain);
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
				console.warn('Rejected - ' + rejObj.promiseName + ' - ', rejObj);
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
	// returns promise
	
	var deferred_tryOsFile_ifDirsNoExistMakeThenRetry = new Deferred();
	
	if (['writeAtomic', 'copy'].indexOf(nameOfOsFileFunc) == -1) {
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
				console.warn('Rejected - promise_retryAttempt - ', rejObj);
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
				console.warn('Rejected - promise_makeDirsRecurse - ', rejObj);
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
			console.warn('Rejected - promise_initialAttempt - ', rejObj);
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
// end - common helper functions
