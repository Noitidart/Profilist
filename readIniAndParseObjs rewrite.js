var gIniStr = '';
var gIni = {};
var gIniAffectingDOM = {};

var gIniBkp = {};
var gIniStr = '';

var iniKeysThatCausePanelDomUpdate = [];

const DELETE = '{{DELETE}}';

var on_IniKey_Change = {
	
};

var on_IniSubKey_Change = {
	// object of keys that require special event on change
	// if affects panel dom, then return true
	// first arg passed to these functions is aIniKey, so from that we can figure out val if we need it
	// second arg is bool suprressPanelDomUpdate, meaning return true if you want panel dom update, and dont do the update in the callback
	'dev': function(aIniKey, aOldVal, aNewVal) {
		// write ini to file
		// trigger panel dom update if its visible
		// in on_PrefOnObj_Change of 'dev' i should make it updateGIni
		
		return true; // affects panel dom
	},
	'dev-builds': function(aIniKey, aOldVal, aNewVal) {
		// if cp is open, then trigger its dom update
		// go through and see if any profiles are tied to a tie-id that no longer is found in here, // note: therefore i should never decrement nextTieId in CP i should keep incrementing, well maybe, cuz say user deletes a tie, and adds a new tie, the path and image change, well maybe its not an issue cuz i should update
		
		//return true; // affects panel dom IF any profile was tied to to tie-id no longer in dev-builds
	},
	'Profilist.tie': function(aIniKey, aOldVal, aNewVal) {
		return true; // affects panel dom
	},
	'Default': function(aIniKey, aOldVal, aNewVal) {
		return true; // affects panel dom
	},
	'Name': function(aIniKey, aOldVal, aNewVal) {
		return true; // affects panel dom
	},
	'num': function(aIniKey, aOldVal, aNewVal) {
		return true; // affects panel dom
	}
};

// start - parse gIniStr to gIni functions
function testWasProfile_soSwitchKeys_PathAndNum(aLastKey) {
  if (!isNaN(aLastKey)) {
    gIni[aLastKey].num = parseInt(aLastKey);
    gIni[gIni[aLastKey].Path] = gIni[aLastKey];
    delete gIni[aLastKey];
  }
}

var lastIniKey;
function parseIniStr () {
	var linePatt = /^(?:\[(?:Profile)?(.*)\]|(.*?)=(.*))$/gm;
	while(match = linePatt.exec(gIniStr)) {
	  //console.info(match);
	  // Array [ "[General]", "General", undefined, undefined ]
	  // Array [ "StartWithLastProfile=0", undefined, "StartWithLastProfile", "0" ]
	  if (match[1]) {
		testWasProfile_soSwitchKeys_PathAndNum(lastIniKey);
		lastIniKey = match[1];
		gIni[lastIniKey] = {};
	  } else {
		gIni[lastIniKey][match[2]] = match[3];
	  }
	}
	testWasProfile_soSwitchKeys_PathAndNum(lastIniKey);
}
// end - parse gIniStr to gIni functions

function updateGIni(aIniKey, aIniSubKey, aVal, updateDOM) {
	
	if (aIniSubKey) {
		// get sub key val
		var oldVal = gIni[aIniKey][aIniSubKey];
	} else {
		// get key val
		var oldVal = gIni[aIniKey];
	}
	
	if (aIniSubKey == DELETE) {
		// delete block
	} else if (aVal == DELETE) {
		// delete iniSubKey
		delete gIni[aIniKey][aIniSubKey];
	} else {
		if (!aIniSubKey) {
			// update block
			
		} else {
			// update sub key
			gIni[aIniKey][aIniSubKey] = aVal;
		}
	}
	
	if (oldVal == aVal) {
		// no change
	} else {
		// changed trigger it
		if (aIniSubKey in on_IniSubKey_Change) {
			on_IniSubKey_Change[aIniSubKey]();
		}
	}
	
	// i can do test here, if aBlockKey == 'General' && aSubKey == 'Profilist.dev-builds' then i can do special stuff like write to pref
	
}

function readIniAndPrefs_thenParseAffectingObj(writeIfDiff) { //as of yet nothing uses writeIfDiff arg
	// does not do single updates to ini so updateGIni is not used, it does bulk parse, so after changing ini do a bulk scan and make the respective on_IniSubKey_Change
	
	// globals for steps
	var oldGIni = JSON.parse(JSON.stringify(gIni)); // so i can compare after reading in new ini, to see if prefs or other special things need to be updated
	
	var step1 = function() {
		// read_encoded profiles.ini then go to step2
	};
	
	var step2 = function() {
		// if read str is same as gIniStr then quit else go to step3
	};
	
	var step3 = function() {
		// if read str does not contain Profilist.touched then read bkp step3_1
	};
	
	var step3_1 = function() {
		// read_encoded profiles.ini.profilist.bkp
			// on reject due to non-existance go to step4 as there is nothing to recover from .bkp
	};
	
	var step3_2 = function() {
		// if str is same as gIniBkp str then no need to parse, just use gIniBkp
			// else set gIniBkp = parseIniStr();
	};
	
	var step3_3 = function() {
		// go through the keys in gIni
			// if key exists in gIniBkp
				// go thrugh subKeys that start with 'Profilist.' of gIniBkp[key]
					// gIni[subkey] = gIniBkp[subkey]
	};
	
	var step4 = function() {
		// compare gIni to oldGIni
			// if any differences to special keys, do appropriate things, LIKE update pref for Profilist.dev
				// if change is a paneldom update, delay it till the final bulk panel dom update of this func link80398699
		for (var iniKey in gIni) {
			if (iniKey in oldGIni) {
				for (var iniSubKey in gIni[iniKey]) {
					if (iniSubKey in oldGIni[iniKey]) {
						if (oldGIni[iniKey][iniSubKey] != gIni[iniKey][iniSubKey]) {
							if (iniSubKey in on_IniSubKey_Change) {
								on_IniSubKey_Change[iniSubKey](iniKey);
							}
						}
					}
				}
			}
		}
	};
	
	var step5 = function() {
		// maybe swap with step4
		// create gIniAffectingDOM
	};
	
	var stepLAST = function() {
		// if panel dom is visible, then update it link80398699
	};
}


function readIniAndPrefs_thenParseAffectingObj(writeIfDiff) { //as of yet nothing uses writeIfDiff arg
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
			
				gDevBuilds = JSON.parse(ini.General.props['Profilist.dev-builds']); // JSON.parse(myPrefListener.watchBranches[myPrefBranch].prefNames['dev-builds'].value);
				
				var tieIdsActive = []; // meaning with info in gDevBuilds
				for (var i=0; i<gDevBuilds.length; i++) {
					tieIdsActive.push(gDevBuilds[i][devBuildsArrStruct.id]);
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
				
				//start the generic-ish check stuff
				// copy block link 011012154 slight modif
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
				// end copy block link 011012154
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
			
			
			//figure selectedProfile.name					
			//get from selectedProfile.rootDirPath to iniPath format to get its name
			if (profToolkit.selectedProfile.relativeDescriptor_rootDirPath !== null) {
				//its possible to be relative
				profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.relativeDescriptor_rootDirPath].props.Name;
			} else {
				if (profToolkit.selectedProfile.rootDirPath in ini) {
					//its absolute
					profToolkit.selectedProfile.name = ini[profToolkit.selectedProfile.rootDirPath].props.Name;
				} // else { its a temporary profile! }
			}
			
			if (profToolkit.selectedProfile.name === null || profToolkit.selectedProfile.name === myServices.sb.GetStringFromName('temporary-profile')) { //probably null
				console.error('XYZ this profile at path does not exist, so its a temporary profile');
				profToolkit.selectedProfile.name = myServices.sb.GetStringFromName('temporary-profile'); //as it has no name
				profToolkit.selectedProfile.iniKey = null;
			} else {
				console.error('XYZ SET IT HERE, it has name and it is:', profToolkit.selectedProfile.name);
				profToolkit.selectedProfile.iniKey = profToolkit.selectedProfile.relativeDescriptor_rootDirPath ? profToolkit.selectedProfile.relativeDescriptor_rootDirPath : profToolkit.selectedProfile.rootDirPath;
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
				if (readStr.indexOf('Profilist.touched=') > -1) { //note: Profilist.touched is json.stringify of an array holding paths it profilist was installed from, on uninstall it should remove self path from Profilist.touched and if its empty then it should prompt to delete all profilist settings & files
					console.log('ini object finalized via non-bkp');
					iniStr = JSON.stringify(ini);
					deferred_readIniAndMaybeBkp.resolve(iniStr);
					//return Promise.resolve('Success promise_readIni',);
				} else {
					console.log('ini was not touched');
					//ini was not touched
					//so read from bkp and update ini with properties that are missing
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