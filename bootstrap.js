const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Profilist',
	chrome_path: 'chrome://profilist/content/',
	aData: 0,
};

const myServices = {};
var cssUri;
var collapsedheight = 0; //holds height stack should be when collapsed
var expandedheight = 0; //holds height stack should be when expanded
var stackDOMJson = []; //array holding menu structure in stack /*:note: :important:must insert the "Default: profile" into stackDOMJson last as last element in stack is top most*/
var unloaders = {};

const { TextEncoder, TextDecoder } = Cu.import("resource://gre/modules/commonjs/toolkit/loader.js", {});
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/Promise.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });
XPCOMUtils.defineLazyGetter(myServices, 'tps', function(){ return Cc['@mozilla.org/toolkit/profile-service;1'].createInstance(Ci.nsIToolkitProfileService) });
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService) });

var pathProfilesIni = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
var ini = {};
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

function readIni() {
	console.log('in read');
	if (!decoder) {
		console.log('decoder not inited');
		decoder = new TextDecoder(); // This decoder can be reused for several reads
	}
	console.log('decoder got');
	console.log('starting read');
	let promise = OS.File.read(pathProfilesIni); // Read the complete file as an array
	console.log('read promise started');
	promise = promise.then(
		function(ArrayBuffer) {
			var readStr = decoder.decode(ArrayBuffer); // Convert this array to a text
			//console.log(readStr);
			ini = {};
			var patt = /\[(.*?)(\d*?)\](?:\s+?(.+)=(.+))(?:\s+?(.+)=(.+))?(?:\s+?(.+)=(.+))?(?:\s+?(.+)=(.+))?(?:\s+?(.+)=(.+))?/mg;
			var blocks = [];

			var match;
			while (match = patt.exec(readStr)) {
				//console.log('MAAAAAAAAAAATCH', match);

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
					ini[ini[group].props.Name] = ini[group];
					delete ini[group];
				}
			}
			console.log('successfully read ini = ', ini);
			return ini;
		},
		function(aRejectReason) {
			console.error('Read ini failed');
			return new Error('Profiles.ini could not be read to memoery. ' + aRejectReason.message);
		}
	);

	return promise;
}

function writeIni() {
	var writeStr = [];
	var profileI = -1;
	for (var p in ini) {


		if ('num' in ini[p]) {
			//is profile
			profileI++; //because we init profileI at -1
			var group = 'Profile' + profileI;
			if (ini[p].num != profileI) {
				console.log('profile I of profile changed from ' + ini[p].num + ' to ' + profileI + ' the object from ini read is =', ini[p]);
			}
		} else {
			var group = p;
		}

		writeStr.push('[' + group + ']');

		for (var p2 in ini[p].props) {
			writeStr.push(p2 + '=' + ini[p].props[p2]);
		}

		writeStr.push('');
	}

	writeStr[writeStr.length - 1] = '\n'; //we want double new line at end of file

	if (!encoder) {
		encoder = new TextEncoder(); // This encoder can be reused for several writes
	}
	
	let BufferArray = encoder.encode(writeStr.join('\n')); // Convert the text to an array
	let promise = OS.File.writeAtomic(pathProfilesIni, BufferArray, // Write the array atomically to "file.txt", using as temporary
		{
			tmpPath: pathProfilesIni + '.profilist.tmp'
		}); // buffer "file.txt.tmp".
	promise.then(
		function() {},
		function(aRejectReason) {
			console.error('writeIni failed');
			return new Error('Profiles.ini could not be be written to disk. ' + aRejectReason.message);
		}
	);
	return promise;
}
/*start - salt generator from http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js?raw=1*/
var kSaltTable = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
	'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
];

var kSaltString = '';
for (var i = 0; i < 8; ++i) {
	kSaltString += kSaltTable[Math.floor(Math.random() * kSaltTable.length)];
}

function saltName(aName) {
	return kSaltString + '.' + aName;
}
/*end - salt generator*/
function createProfile(refreshIni, profName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				console.log('now that ini read it will now createProfile with name = ' + profName);
				return createProfile(2, profName);
			},
			function(aRejectReason) {
				console.error('Failed to refresh ini object from file during renameProfile');
				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {
		console.log('in createProfile create part');
		if (profName in ini) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot create profile with name "' + newName + '" because this name is already taken by another profile.');
			return Promise.reject(new Error('Cannot create profile with name "' + newName + '" because this name is already taken by another profile.'));
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
		ini[profName] = {
			num: numProfiles,
			props: {
				Name: profName,
				IsRelative: 1,
				Path: 'Profiles/' + dirName
			}
		}
		console.log('created ini entry for profName', ini[profName]);

		var rootPathDefaultDirName = OS.Path.join(profToolkit.rootPathDefault, dirName);
		var localPathDefaultDirName = OS.Path.join(profToolkit.localPathDefault, dirName);
		console.log('rootPathDefaultDirName=',rootPathDefaultDirName);
		console.log('localPathDefaultDirName=',localPathDefaultDirName);
		
		var profilesIniUpdateDone;
		var rootDirMakeDirDone;
		var localDirMakeDirDone;
		var checkReadyAndLaunch = function() {
			if (!profilesIniUpdateDone) {
				console.warn('profiles ini update not yet done');
			}
			if (!rootDirMakeDirDone) {
				console.warn('root dir not yet made');
			}
			if (profToolkit.rootPathDefault == profToolkit.localPathDefault) {
				localDirMakeDirDone = true; //i dont have to check if rootDirMakeDirDone to set this to true, because when both paths are same we dont make a local dir
			}
			if (!localDirMakeDirDone) {
				console.warn('local dir not yet made');
			}
			if (profilesIniUpdateDone && rootDirMakeDirDone && localDirMakeDirDone) {
				launchProfile(null, profName, 1, self.aData.installPath.path);
				console.log('profile launched and now updating prof toolkit with refreshIni 1');
				return updateProfToolkit(1, 1);
			}
		}
		console.log('starting promise for make root dir');
		var PromiseAllArr = [];
		var promise = OS.File.makeDir(rootPathDefaultDirName);
		promise.then(
			function() {
				console.log('successfully created root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
				if (!encoder) {
					encoder = new TextEncoder(); // This encoder can be reused for several writes
				}
					let BufferArray = encoder.encode('{\n"created": ' + new Date().getTime() + '}\n');
					let promise3 = OS.File.writeAtomic(OS.Path.join(rootPathDefaultDirName, 'times.json'), BufferArray,
						{
							tmpPath: OS.Path.join(rootPathDefaultDirName, 'times.json') + '.profilist.tmp'
						}
					);
					promise3.then(
						function() {
							console.log('succesfully created times.json for profName of ' + profName + ' path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
							rootDirMakeDirDone = true;
							checkReadyAndLaunch();
						},
						function() {
							console.error('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
							return new Error('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
						}
					);
					return promise3;
			},
			function() {
				console.error('FAILED to create root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
				return new Error('FAILED to create root dir for profile ' + profName + ' the path is = ' + rootPathDefaultDirName);
			}
		);
		PromiseAllArr.push(promise);
		if (profToolkit.rootPathDefault != profToolkit.localPathDefault) {
			var promise2 = OS.File.makeDir(localPathDefaultDirName);
			promise2.then(
				function() {
					console.log('successfully created local dir for profile ' + profName + ' the path is = ', localPathDefaultDirName);
					localDirMakeDirDone = true;
					checkReadyAndLaunch();
				},
				function() {
					console.error('FAILED to create local dir for profile "' + profName + '" the path is = ', localPathDefaultDirName);
					return new Error('FAILED to create local dir for profile "' + profName + '" the path is = ' + localPathDefaultDirName);
				}
			);
			PromiseAllArr.push(promise2);
		}
		var promise4 = writeIni();
		promise4.then(
			function() {
				console.log('SUCCESS on updating ini with new profile');
				profilesIniUpdateDone = true;
				checkReadyAndLaunch();
			},
			function() {
				console.log('updating ini with newly created profile failed');
				return new Error('updating ini with newly created profile failed');
			}
		);
		PromiseAllArr.push(promise4);
		
		return Promise.all(PromiseAllArr);
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
}

function renameProfile(refreshIni, profName, newName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				return renameProfile(2, profName, newName);
			},
			function(aRejectReason) {
				console.error('Failed to refresh ini object from file during renameProfile');
				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {
		//check if name is taken
		if (profName in ini == false) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot rename it.');
			return Promise.reject(new Error('Cannot find profile name, "' + profName + '", in Profiles.ini in memory.'));
		}
		if (newName in ini) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot rename to "' + newName + '" because this name is already taken by another profile.');
			return Promise.reject(new Error('Profile name of "' + newName + '" is already taken.'));
		}
		ini[profName].props.Name = newName; //NOTE: LEARNED: learned something about self programming, no need to delete ini[profName] and create ini[newName] because when writeIni it doesn't use the key, the key is just for my convenience use in programming
		/* for (var i=0; i<stackDOMJson.length; i++) { // no longer do this block because what if renamed from another profile, it wont catch it then
			if (stackDOMJson[i].props.profpath == ini[profName].props.Path) {
				stackDOMJson[i].label = newName;
				break;
			}
		} */
		var promise = writeIni();
		promise.then(
			function() {
				console.log('successfully edited name of ' + profName + ' to ' + newName + ' in Profiles.ini now refrehsing it');
				return updateProfToolkit(1, 1);
			},
			function() {
				console.error('FAILED to edit name of ' + profName + ' to ' + newName + ' in Profiles.ini');
				return new Error('FAILED to edit name of ' + profName + ' to ' + newName + ' in Profiles.ini');
			}
		);
		
		return promise;
	}
	
	
}

function deleteProfile(refreshIni, profName) {
	//refreshIni is 0,1 or programmatically 2
//start check if profile in use
	if (profName == profToolkit.selectedProfile.name) {
		//cannot delete profile that is in use
		//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" is currently in use, cannot delete.');
		return Promise.reject(new Error('The profile, "' + profName + '", is currently in use.'));
	} else {
		if (!(profName in ini)) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" could not be found in Profiles.ini in memory so could not delete.');
			return Promise.reject(new Error('The profile "' + profName + '" could not be found in Profiles.ini in memory.'));
		}

		 console.log('found profile name in ini it is == ', ini[profName]);
		 if (ini[profName].props.IsRelative == '1') {
			var dirName = OS.Path.basename(OS.Path.normalize(ini[profName].props.Path));
			console.info('dirname of this profile is = ', dirName);
			var PathRootDir = OS.Path.join(profToolkit.rootPathDefault, dirName);
			var PathLocalDir = OS.Path.join(profToolkit.localPathDefault, dirName);
			
			var aDirect = new FileUtils.File(PathRootDir);
			if (!aDirect.exists()){
				return Promise.reject(new Error('Could not find the root profile directory at relative path specified in Profiles.ini.\nPath: ' + PathRootDir));
			}			
			var aTemp = new FileUtils.File(PathLocalDir);
			if (!aTemp.exists()){
				return Promise.reject(new Error('Could not find the local profile directory at relative path specified in Profiles.ini.\nPath: ' + PathLocalDir));
			}
		 } else {
			var aDirect = new FileUtils.File(ini[profName].props.Path); //may need to normalize this for other os's than xp and 7  im not sure
			if (!aDirect.exists()){
				return Promise.reject(new Error('Could not find the profile directory at path specified in Profiles.ini.\nPath: ' + ini[profName].props.Path));
			}
			var aTemp = aDirect;
		 }
		 try {
			 var locker = myServices.tps.lockProfilePath(aDirect,aTemp);
			 //if it gets to this line then the profile was not in use as it was succesfully locked
			 locker.unlock(); //its not in use so lets unlock the profile
			 console.log('continue as profile is not in use');
		 } catch (ex) {
			if (ex.result == Components.results.NS_ERROR_FILE_ACCESS_DENIED) {
				console.warn('PROFILE IS IN USE');
				//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" is currently in use, cannot delete.');
				return Promise.reject(new Error('The profile, "' + profName + '", is currently in use.'));
			} else {
				//throw ex;
				console.log('ex happend = ', ex);
				console.log('ex.result = ', ex.result);
				return Promise.reject(new Error('Could not delete beacuse an error occured during profile use test.\nMessage: ' + ex.message));
			}
		 }
	 }
//end check if profile in use	 
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				return deleteProfile(2, profName);
			},
			function(aRejectReason) {
				console.error('Failed to refresh ini object from file on deleteProfile');
				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {
		//before deleting check if its default profile
		//check if its in use
		if (profName in ini == false) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot delete it.');
			return Promise.reject(new Error('Cannot find profile name, "' + profName + '", in Profiles.ini in memory.'));
		}
		//if (Object.keys(ini).length == 2) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot delete this profile as it is the last profile remaining.'); //dont need this anymore as if its the last profile its currently in use
			//return;
		//}
		//todo: figure out how to check if the profile is running, if it is dont delete but msg its open		
		
		var done = {
			ini: false,
			root: false,
			local: false
		}
		var checkReadyAndUpdateStack = function () {
			if (!done.ini) {
				console.log('ini not yet updated');
			}
			if (!done.ini) {
				console.log('root dir not yet deleted');
			}
			if (PathRootDir == PathLocalDir) {
				done.local = true;
			}
			if (!done.local) {
				console.log('local dir not yet deleted');
			}
			
			for (var p in done) {
				if (!done[p]) {
					return;
				}
			}
			console.log('ALLLL done so updateProfToolkit');
			updateProfToolkit(1, 1);
		}
		var PromiseAllArr = [];
		if (ini[profName].props.IsRelative == '1') {
			var dirName = OS.Path.basename(OS.Path.normalize(ini[profName].props.Path));
			console.info('dirname of this profile is = ', dirName);
			var PathRootDir = OS.Path.join(profToolkit.rootPathDefault, dirName);
			var PathLocalDir = OS.Path.join(profToolkit.localPathDefault, dirName);
			
			console.log('now removing PathRootDir', PathRootDir);
			var promise = OS.File.removeDir(PathRootDir, {ignoreAbsent:true, ignorePermissions:false});
			promise.then(
				function() {
					console.log('successfully removed PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir);
					done.root = true;
					checkReadyAndUpdateStack();
				},
				function(aRejectReason) {
					console.warn('FAILED to remove PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir, 'aRejectReason=', aRejectReason);
					return new Error('FAILED to remove PathRootDir for profName of ' + profName);
				}
			);
			PromiseAllArr.push(promise);
			if (PathRootDir != PathLocalDir) {
				console.log('now removing PathLocalDir', PathLocalDir);
				var promise2 = OS.File.removeDir(PathLocalDir, {ignoreAbsent:true, ignorePermissions:false});
				promise2.then(
					function() {
						console.info('successfully removed PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir);
						done.local = true;
						checkReadyAndUpdateStack();
					},
					function(aRejectReason) {
						console.warn('FAILED to remove PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir, 'aRejectReason=', aRejectReason);
						return new Error('FAILED to remove PathLocalDir for profName of ' + profName);
					}
				);
				PromiseAllArr.push(promise2);
			}
		} else {
			var Path = ini[profName].props.Path;
			var promise = OS.File.removeDir(Path);
			promise.then(
				function() {
					console.log('successfully removed Path for profName of ' + profName, 'Path=', Path);
					done.root = true;
					checkReadyAndUpdateStack();
				},
				function() {
					console.warn('FAILED to remove Path for profName of ' + profName + ' path = ' + Path);
					return new Error('FAILED to remove Path for profName of ' + profName + ' path = ' + Path);
				}
			);
			PromiseAllArr.push(promise);
		}
		delete ini[profName];
		var promise0 = writeIni();
		promise0.then(
			function() {
				console.log('successfully edited out profName of ' + profName + ' from Profiles.ini');
				done.ini = true;
				checkReadyAndUpdateStack();
			},
			function() {
				console.error('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
				return new Error('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
			}
		);
		PromiseAllArr.push(promise0);
		
		return Promise.all(PromiseAllArr);
	}
}
function initProfToolkit() {
	console.log('in initProfToolkit');
	
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
	
	profToolkit.rootPathDefault = FileUtils.getFile('DefProfRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.localProfileDir); //will work as long as at least one profile is in the default profile folder //i havent tested when only custom profile
	console.log('initProfToolkit 1');
	profToolkit.localPathDefault = FileUtils.getFile('DefProfLRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.profileDir);
	console.log('initProfToolkit 2');

	profToolkit.selectedProfile.rootDirName = OS.Path.basename(OS.Constants.Path.profileDir);
	profToolkit.selectedProfile.localDirName = OS.Path.basename(OS.Constants.Path.localProfileDir);

	profToolkit.selectedProfile.rootDirPath = OS.Constants.Path.profileDir;
	profToolkit.selectedProfile.localDirPath = OS.Constants.Path.localProfileDir;
	
	console.log('initProfToolkit DONE');
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

function updateOnPanelShowing(e) {
	console.error('e on panel showing = ', e);
	if (e.target.id == 'PanelUI-popup') {
		updateProfToolkit(1, 1);
	} else {
		console.log('not main panel showing so dont updateProfToolkit');
	}
}

function updateProfToolkit(refreshIni, refreshStack) {
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				updateProfToolkit(0, refreshStack);
			},
			function(aRejectReason) {
				console.error('Failed to refresh ini object from file on deleteProfile');
				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {
		if (profToolkit.rootPathDefault === 0) {
			console.log('initing prof toolkit');
			refreshStack = true;
			console.log('initing prof toolkit');
			initProfToolkit();
			console.log('init done');
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
		
		if (!selectedProfileNameFound) {
			console.log('looking for selectedProfile name');
			for (var p in ini) {
				if (ini[p].props.IsRelative == '1') {
					console.log('ini[p] is relative',ini[p]);
					var iniDirName = OS.Path.basename(OS.Path.normalize(ini[p].props.Path));
					if (iniDirName == profToolkit.selectedProfile.rootDirName) {
						console.log('iniDirName matches profToolkit.selectedProfile.rootDirName so set selectedProfile.name to this ini[p].Name', 'iniDirName', iniDirName, 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
					if (iniDirName == profToolkit.selectedProfile.localDirName) {
						console.log('iniDirName matches profToolkit.selectedProfile.localDirName so set selectedProfile.name to this ini[p].Name', 'iniDirName', iniDirName, 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
				} else {
					console.log('ini[p] is absolute',ini[p]);
					if (ini[p].Path == profToolkit.selectedProfile.rootDirPath) {
						console.log('ini[p].Path matches profToolkit.selectedProfile.rootDirPath so set selectedProfile.name to this ini[p].Name', 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
					if (ini[p].Path == profToolkit.selectedProfile.localDirPath) {
						console.log('ini[p].Path matches profToolkit.selectedProfile.localDirPath so set selectedProfile.name to this ini[p].Name', 'ini[p]=', ini[p], 'profToolkit=', profToolkit);
						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
				}
			}
			//profToolkit.selectedProfile.name = 1;
			console.log('selectedProfile searching proc done');
		}
		
		
		if (refreshStack) {
			updateStackDOMJson_basedOnToolkit();
		}
	}
}

function updateStackDOMJson_basedOnToolkit() { //and based on ini as well
			console.log('updating stackDOMJson based on profToolkit AND ini');
			var stackUpdated = false; //if splice in anything new in or anything old out then set this to true, if true then run dom update
			if (stackDOMJson.length == 0) {
				console.log('stackDOMJson is 0 length', stackDOMJson);
				console.log('profToolkit=',profToolkit);
				stackDOMJson = [
					{nodeToClone:'PUIsync', identifier:'.create', label:'Create New Profile', class:'PanelUI-profilist create', id:null, oncommand:null, status:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  addEventListener:['command',createUnnamedProfile,false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					{nodeToClone:'PUIsync', identifier:'[label="' + profToolkit.selectedProfile.name + '"]', label:profToolkit.selectedProfile.name, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null, status:'active', addEventListener:['command', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profpath:ini[profToolkit.selectedProfile.name].props.Path}}
				];
				var profNamesCurrentlyInMenu = [ini[profToolkit.selectedProfile.name].props.Path];
				stackUpdated = true;
			} else {
				console.log('stackDOMJson has more than 0 length so:', stackDOMJson);
				var profNamesCurrentlyInMenu = [];
				for (var i=0; i<stackDOMJson.length; i++) {
					var m = stackDOMJson[i];
					if ('props' in m && 'profpath' in m.props) {
						if (!(m.props.pathname in profToolkit.pathsInIni)) {
							//this is in the stack object but no longer exists so need to remove
							console.log('m.props.profpath is not in ini = ', m.props.profpath)
							stackUpdated = true;
							stackDOMJson.splice(i, 1); //this takes care of deletes
							i--;
						} else {
							console.log('this stack value is in profToolkit', 'stack val = ', m.props.pathname, 'pathsInIni', profToolkit.pathsInIni);
							profNamesCurrentlyInMenu.push(m.props.profpath);
						}
					}
				}
			}
			
			console.info('after updating that profNamesCurrentlyInMenu is = ', profNamesCurrentlyInMenu);
			
			var stackPositionsAccountedFor = []; //use this to see if should delete a stack entry from array
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
				var posOfProfInStack = -1; //actually cannot do this because have create profile button::::var posOfProfInStack = profNamesCurrentlyInMenu.indexOf(ini[p].props.Path); //identifies prop by path and gives location of it in stackDOMJson, this works because i do a for loop through stackDOMJson and create profNamesCurrentlyInMenu in that order
				console.log('looking for position in stack of profpath = ', ini[p].props.Path);
				for (var i=0; i<stackDOMJson.length; i++) {
					if ('props' in stackDOMJson[i]) {
						if (stackDOMJson[i].props.profpath == ini[p].props.Path) {
							posOfProfInStack = i;
							break;
						} else {
							console.log('stackDOMJson[i].props.profpath != ini[p].props.Path', stackDOMJson[i].props.profpath, ini[p].props.Path);
							continue; //dont really need continue as there is no code below in this for but ya
						}
					} else {
						continue; //dont really need continue as there is no code below in this for but ya
					}
				}
				console.log('index of ini[p].props.Path in stack object is', ini[p].props.Path, posOfProfInStack);
				
				if (posOfProfInStack > -1) {
					stackPositionsAccountedFor.push(posOfProfInStack);
					//check if any properties changed else continue
					var justRenamed = false; //i had this as propsChanged but realized the only prop that can change is name and this happens on a rename so changed this to justRenamed. :todo: maybe im not sure but consider justDeleted
					if (stackDOMJson[posOfProfInStack].label != ini[p].props.Name) {
						stackDOMJson[posOfProfInStack].justRenamed = true;
						stackDOMJson[posOfProfInStack].label = ini[p].props.Name;
						justRenamed = true;
						if (!stackUpdated) {
							stackUpdated = true; //now stack is not really updated (stack is stackDOMJson but we set this to true becuase if stackUpdated==true then it physically updates all PanelUi
							console.log('forcing stackUpdated as something was justRenamed');
						} else {
							console.log('was just renamed but no need to force stackUpdated as its already stackUpdated == true');
						}
					}
					continue; //contin as it even if it was renamed its not new so nothing to splice, and this profpath for ini[p] was found in stackDOMJson
				}
				

					console.log('splicing p = ', ini[p], 'stackDOMjson=', stackDOMJson);
					stackUpdated = true;
					(function(pClosure) {
						var objToSplice = {nodeToClone:'PUIsync', identifier:'[label="' + pClosure + '"]', label:p, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:'inactive', addEventListener:['command', launchProfile, false], addEventListener2:['mousedown', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profpath:ini[pClosure].props.Path}};
						
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
			
			/* if (!stackUpdated) {
				for (var i=0; i<stackDOMJson.length; i++) {
					if (stackDOMJson[i].justRenamed) {
						stackUpdated = true;
						console.log('forcing stackUpdated as something was justRenamed');
						break;
					}
				}
			} */
			
			/* //check if anything deleted
			if (stackPositionsAccountedFor.length < stackDOMJson.length) {
				for (var i=0; i<stackDOMJson.length; i++) {
					if (stackPositionsAccountedFor.indexOf(i) == -1) {
						console.warn('need to (i dont do it yet im just testing) delete stackDOMJson at position i =', i, 'stackDOMJson at this pos =', stackDOMJson[i], 'stackPositionsAccountedFor=', stackPositionsAccountedFor, 'stackDOMJson=', stackDOMJson);
					}
				}
			} */
			console.info('stackDOMJson before checking if stackUpdated==true',stackDOMJson);
			if (stackUpdated) {
				console.info('something was changed in stack so will update all menus now');
				let DOMWindows = Services.wm.getEnumerator(null);
				while (DOMWindows.hasMoreElements()) {
					let aDOMWindow = DOMWindows.getNext();
					if (aDOMWindow.document.querySelector('#profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create
						updateMenuDOM(aDOMWindow, stackDOMJson);
					}
				}
			}
}

var observers = {
    /*
    inlineOptsHid: {
        observe:    function(aSubject, aTopic, aData) {
                        //##Cu.reportError('incoming inlineOptsHid: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
                        if (aTopic == 'addon-options-hidden' && aData == selfId + '@jetpack') {
                            addonMgrXulWin = null; //trial as of 112713
                        }
                    },
        reg:    function() {
                obs.addObserver(observers.inlineOptsHid, 'addon-options-hidden', false);
            },
        unreg:    function() {
                obs.removeObserver(observers.inlineOptsHid, 'addon-options-hidden');
            }
    }
    */
    'profile-do-change': {
        observe: function(aSubject, aTopic, aData) {
			console.info('incoming profile-do-change: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
        },
        reg: function() {
			Services.obs.addObserver(observers['profile-do-change'], 'profile-do-change', false);
        },
        unreg: function() {
			Services.obs.removeObserver(observers['profile-do-change'], 'profile-do-change');
        }
    },
    'profile-before-change': {
        observe: function(aSubject, aTopic, aData) {
			console.info('incoming profile-before-change: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
        },
        reg: function() {
			Services.obs.addObserver(observers['profile-before-change'], 'profile-before-change', false);
        },
        unreg: function() {
			Services.obs.removeObserver(observers['profile-before-change'], 'profile-before-change');
        }
    }
};

var renameTimeouts = [];

function makeRename(e) {
	if (e.type == 'mousedown' && e.button != 0) {
		//ensure it must be primary click
		console.warn('not primary click so returning e=', e);
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
				console.log('timeout fired BUT already in edit mode so just remove event listener and nothing else');
				return;
			}
			win.clearTimeout(renameTimeouts[winID].timeout);
			delete renameTimeouts[winID];
			console.log('canceled actuallyMakeRename timeout');
		}, false);
		
	}
}

function actuallyMakeRename(el) {
	console.info('el on actuallyMakeRename = ', el);
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
			var confirmResult = Services.prompt.confirmCheck(null, self.name + ' - ' + 'Delete Profile', 'Are you sure you want to delete the profile named "' + oldProfName + '"? All profile files will be deleted.', 'Confirm Deletion', confirmCheck);
			if (confirmResult) {				
				if (confirmCheck.value) {
					var promise = deleteProfile(1, oldProfName);
					promise.then(
						function() {
							//Services.prompt.alert(null, self.name + ' - ' + 'Success', 'The profile "' + oldProfName +'" was succesfully deleted.');
							myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Profile Deleted', 'The profile "' + oldProfName +'" was succesfully deleted.');
						},
						function(aRejectReason) {
							console.warn('Delete failed. An exception occured when trying to delete the profile, see Browser Console for details. Ex = ', aRejectReason);
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
						myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Profile Renamed', 'The profile "' + oldProfName +'" was succesfully renamed to "' + newProfName + '"');
						updateProfToolkit(1, 1);
					},
					function(aRejectReason) {
						console.warn('Rename failed. An exception occured when trying to rename the profile, see Browser Console for details. Ex = ', aRejectReason);
						Services.prompt.alert(null, self.name + ' - ' + 'Renamed Failed', aRejectReason.message);
					}
				);
			}
		}
	}
	delete win.ProfilistInRenameMode;
	//Services.prompt.alert(null, self.name + ' - ' + 'debug', 'deleted ProfilistInRenameMode');
	return;
	el.style.fontWeight = 'bold';
	
	var PanelUI = doc.querySelector('#PanelUI-popup');
	PanelUI.addEventListener('popuphiding', prevHide, false) // //add on blur it should remove prevHide //actually no need for this because right now on blur it is set up to hide popup
}

function submitRename() {
	//when user presses enter in field
	var el = this;
	var doc = this.ownerDocument;
	var win = doc.defaultView;
	
	var PanelUI = doc.querySelector('#PanelUI-popup');
	PanelUI.removeEventListener('popuphiding', prevHide, false) // //add on blur it should remove prevHide //actually no need for this because right now on blur it is set up to hide popup
	
	delete win.ProfilistInRenameMode;
	//renameProfile(1, oldProfName, newProfName);
}

function launchProfile(e, profName, suppressAlert, url) {
	if (!profName) {
		var el = this;
		profName = el.getAttribute('label');
	}
	var win = Services.wm.getMostRecentWindow('navigator:browser');
	if (win.ProfilistInRenameMode) {
		//in rename mode;
		console.log('window is in rename mode so dont launch profile');
		return;
	}
	//Services.prompt.alert(null, self.name + ' - ' + 'INFO', 'Will attempt to launch profile named "' + profName + '".');
	if (!suppressAlert) {
		myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Launching Profile', 'Profile Name: "' + profName + '"');
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
		Services.prompt.alert(null, self.name + ' - ' + 'Launch Failed', 'An error occured while trying to launch profile named "' + profName + '". Proflie name not found in Profiles.ini in memory.');
		console.info('dump of profiles = ', ini);
		return false;
	}

	var exe = FileUtils.getFile('XREExeF', []); //this gives path to executable
	var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
	process.init(exe);
	
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
	promise.then(
		function() {
			console.log('now that readIni success it will do stuff');
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
			}
			
			var digit = 1;
			var profName = 'Unnamed Profile 1'; //creates with default name
			while (profName in ini) {
				digit++;
				profName = 'Unnamed Profile ' + digit
			}

			console.log('will now createProfile with name = ', profName);
			var promise1 = createProfile(0, profName);
			promise1.then(
				function() {
					console.log('createProfile promise succesfully completed');
				},
				function(aRejectReason) {
					console.warn('Create profile failed. An exception occured when trying to delete the profile, see Browser Console for details. Ex = ', aRejectReason);
					Services.prompt.alert(null, self.name + ' - ' + 'Create Failed', aRejectReason.message);
					return new Error('Create Failed. ' + aRejectReason.message);
				}
			);
			return promise1;
		},
		function(aRejectReason) {
			console.error('createProfile readIni promise rejected');
			Services.prompt.alert(null, self.name + ' - ' + 'Read Failed', aRejectReason.message);
			return new Error('Read Failed. ' + aRejectReason.message);
		}
	);
	
	return promise;
}

function prevHide(e) {
	e.preventDefault();
	e.stopPropagation();
}

function updateMenuDOM(aDOMWindow, json) {
	//identifier is the querySelector to run to match the element, if its matched it updates this el, if not matched then creates new el based on nodeToClone
	var profilist_box = aDOMWindow.document.querySelector('#profilist_box');
	if (!profilist_box) {
		console.warn('no profilist_box to add to');
		return;
	}
	var stack = profilist_box.childNodes[0];
	
	var cumHeight = 0;
	var PUIsync;
	for (var i=0; i<json.length; i++) {
		console.log('in json arr = ', i);
		var el = null;
		var appendChild = false;
		if (json[i].identifier) {
			console.log('identifier  string =', json[i].identifier);
			el = stack.querySelector(json[i].identifier);
			console.log('post ident el = ', el);
		}
		if (!el) {
			if (json[i].nodeToClone == 'PUIsync') {
				if (!PUIsync) {
					PUIsync = aDOMWindow.document.querySelector('#PanelUI-popup').querySelector('#PanelUI-fxa-status');
				}
				json[i].nodeToClone = PUIsync;
			}
			el = json[i].nodeToClone.cloneNode(true);
			appendChild = true;
			console.log('el created');
		} else {
			console.log('el idented');
		}
		if (!el.hasAttribute('top')) {
			el.setAttribute('top', '0');
		}
		
		if (appendChild) {
			for (var p in json[i]) {
				if (p == 'nodeToClone' || p == 'identifier' || p == 'props') { continue }
				if (p.indexOf('addEventListener') == 0) {
					(function(elClosure, jsonIClosure, pClosure) {
						//console.log('elClosure',elClosure.getAttribute('label'),'jsonIClosure',jsonIClosure);
						console.log('elClosure label',elClosure.getAttribute('label'));
						elClosure.addEventListener(jsonIClosure[pClosure][0], jsonIClosure[pClosure][1], jsonIClosure[pClosure][2]);
					})(el, json[i], p);
					continue;
				}
				if (json[i][p] === null) {
					el.removeAttribute(p);
				} else {
					el.setAttribute(p, json[i][p]);
				}
			}
		} else {
			//if appendChild false then obviously idented
			if ('justRenamed' in json[i]) {
				console.log('it was justRenamed');
				delete json[i].justRenamed;
				el.setAttribute('label', json[i].label);
				console.log('label set');
				json[i].identifer = '[label="' + json[i].label + '"]'; //have to do this here as needed the identifier to ident this el
			}
		}
		if (appendChild) {
			if (json[i].status != 'active') { //this if makes sure the selected profile one gets added last note: again this is important because the last most element is top most on stack when collapsed, but in my case its more important because it gets the perm-hover class
				stack.insertBefore(el, stack.firstChild);
			} else {
				stack.appendChild(el);
			}
			console.log('appended', el);
		}
		el.style.height = '';
		var elHeight = el.boxObject.height;
		//var elHeight = el.ownerDocument.defaultView.getComputedStyle(el,null).getPropertyValue('height'); //have to use getComputedStyle instead of boxObject.height because boxObject.height is rounded, i need cumHeight added with non-rounded values but top is set with rounded value
		//elHeight = parseFloat(elHeight);
		if (elHeight == 0) {
			if (appendChild) {
				elHeight = json[i].nodeToClone.boxObject.height;
				//elHeight = json[i].nodeToClone.ownerDocument.defaultView.getComputedStyle(json[i].nodeToClone,null).getPropertyValue('height');
				//elHeight = parseFloat(elHeight);
				console.log('elHeight was 0 but just appendedChild so assuming cloned node height which is', elHeight);
			} else {
				console.error('ERROR deal with this, elHeight was 0 and it was NOT just appended so cannot assume cloned node height');
			}
		}
		el.style.height = elHeight + 'px';
		console.log('el.boxObject.height = ', elHeight);
		cumHeight += elHeight;
		console.log('cumHeight after adding = ' + cumHeight);
		if (i < json.length - 1) {
			el.setAttribute('top', cumHeight); //cant do this here because stack element expands to fit contents so this will mess up the cumHeight and make it think the element is longe that it is  //actually can do this now, now that i :learned: that if you set the top to some value it the element will not expand to take up 100% height of stack :learned:
			//el.setAttribute('bottom', cumHeight + elHeight);
			console.log('set el top to ', cumHeight);
		} else {
			el.setAttribute('top', '0');
			console.log('set el top to 0');
		}
	}
	collapsedheight = elHeight;
	expandedheight = cumHeight;
	console.log('collapsedheight', collapsedheight);
	console.log('expandedheight', expandedheight);

	var stackChilds = stack.childNodes;
	for (var i=0; i<stackChilds.length; i++) {
		console.log('checking if label of ' + stackChilds[i].getAttribute('label') + ' is in ini', 'ini=', ini);
		if (stackChilds[i].hasAttribute('status') && !(stackChilds[i].getAttribute('label') in ini)) { //:assume: only profiles have status attribute
			console.log('this profile is not in ini so remove it', 'ini=', ini);
			stack.removeChild(stackChilds[i]);
			i--;
		}	
	}
	
	/* [].forEach.call(stackChilds, function(sc) {
		console.log('checking if label of ' + sc.getAttribute('label') + ' is in ini', 'ini=', ini);
		if (sc.hasAttribute('status') && !(sc.getAttribute('label') in ini)) { //:assume: only profiles have status attribute
			console.log('this profile is not in ini so remove it', 'ini=', ini);
			stack.removeChild(sc);
		}
	}); */
	
	console.info('json=',json);
}

function beforecustomization(e) {
	console.info('beforecustomization e = ', e);
	var doc = e.target.ownerDocument;
	var stack = doc.querySelector('#profilist_box');
	var active = stack.querySelector('[status=active]');
	active.setAttribute('disabled', true);
}

function customizationending(e) {
	console.info('customizationending e = ', e);
	var doc = e.target.ownerDocument;
	var stack = doc.querySelector('#profilist_box');
	var active = stack.querySelector('[status=active]');
	active.removeAttribute('disabled');
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
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
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {			
			var PUIsync = PanelUI.querySelector('#PanelUI-fxa-status');
			console.info('PUIsync on start up = ', PUIsync);
			var PUIsync_height = PUIsync.boxObject.height; //parseInt(aDOMWindow.getComputedStyle(PUIsync, null).getPropertyValue('height'));
			if (PanelUI.state != 'open' && PanelUI.state != 'showing') { //USED TO BE "if (PUIsync_height == 0)"
				console.warn('PanelUI not open', PanelUI);
				var unloaderId = new Date().getTime();
				var createMenuOnPopup = function() {
					PanelUI.removeEventListener('popupshowing', createMenuOnPopup, false);
					delete unloaders[unloaderId];
					console.warn('running loading into window to create menuuuuuuuuuu....');
					windowListener.loadIntoWindow(aDOMWindow);
				}
				unloaders[unloaderId] = function() {
					console.log('RUNNING UNLOADER');
					PanelUI.removeEventListener('popupshowing', createMenuOnPopup, false);
				}
				PanelUI.addEventListener('popupshowing', createMenuOnPopup, false);
				return;
			}
			var PUIf = PanelUI.querySelector('#PanelUI-footer');
			var PUIcs = PanelUI.querySelector('#PanelUI-contents-scroller');
			
			//console.log('PUIcs.style.width',PUIcs.style.width);
			var profilistHBoxJSON =
			['xul:vbox', {id: 'profilist_box'},
				['xul:stack', {key:'profilist_stack',style:'width:100%'}]
			];
			var referenceNodes = {};
			PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, referenceNodes), PUIf.firstChild);
			
			console.log('CREATING MENU JSON');
			var PUIfi = PanelUI.querySelector('#PanelUI-footer-inner');
			console.log('PUIsync height', PUIsync.boxObject);
			console.log('PUIfi height', PUIfi.boxObject);
			if (stackDOMJson.length == 0) {
				console.log('stockDOMJson.length == 0');
				stackDOMJson = [
					{nodeToClone:PUIsync, identifier:'.create', label:'Create New Profile', class:'PanelUI-profilist create', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:null, addEventListener:['command',createProfile,false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					{nodeToClone:PUIsync, identifier:'[label="' + profToolkit.selectedProfile.name + '"]', label:profToolkit.selectedProfile.name, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null, status:'active', addEventListener:['command', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profpath:activeProfpath}}
				];
			}
			
			updateMenuDOM(aDOMWindow, stackDOMJson);
			
			referenceNodes.profilist_stack.style.height = collapsedheight + 'px';

			//todo: probably should only do this overflow stuff if scrollbar is not vis prior to mouseenter, but i think for usual case scrollbar is not vis.
			referenceNodes.profilist_stack.addEventListener('mouseenter', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				PUIcs.style.overflow = 'hidden'; //prevents scrollbar from showing
				referenceNodes.profilist_stack.style.height = expandedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.add('perm-hover');
			}, false);
			referenceNodes.profilist_stack.addEventListener('mouseleave', function() {
				/*//commenting out this block as using services prompt for renaming right now
				if (aDOMWindow.ProfilistInRenameMode) {
					console.log('in rename mdoe so dont close');
					return;
				}
				*/
				referenceNodes.profilist_stack.addEventListener('transitionend', function() {
					referenceNodes.profilist_stack.removeEventListener('transitionend', arguments.callee, false);
					if (referenceNodes.profilist_stack.style.height == collapsedheight + 'px') {
						PUIcs.style.overflow = ''; //remove the hidden style i had forced on it
						console.info('overflow RESET');
					} else {
						console.info('overflow not reset as height is not collapsed height (' + collapsedheight + ') but it is right now = ', referenceNodes.profilist_stack.style.height);
					}
				}, false);
				referenceNodes.profilist_stack.style.height = collapsedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.remove('perm-hover');
			}, false);
			//PanelUI.addEventListener('popuphiding', prevHide, false);
			PanelUI.addEventListener('popupshowing', updateOnPanelShowing, false);
			console.log('aDOMWindow.gNavToolbox', aDOMWindow.gNavToolbox);
			aDOMWindow.gNavToolbox.addEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.addEventListener('customizationending', customizationending, false);
		}
		
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {
			delete aDOMWindow.ProfilistInRenameMode;
			PanelUI.removeEventListener('popupshowing', updateOnPanelShowing, false);
			PanelUI.removeEventListener('popuphiding', prevHide, false);
			aDOMWindow.gNavToolbox.removeEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.removeEventListener('customizationending', customizationending, false);
			var profilistHBox = aDOMWindow.document.querySelector('#profilist_box');
			if (profilistHBox) {
				profilistHBox.parentNode.removeChild(profilistHBox);
			}
		}
	}
};
/*end - windowlistener*/

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

function startup(aData, aReason) {
	console.log('in startup');
	console.log('initing prof toolkit');
	initProfToolkit();
	console.log('init done');
	updateProfToolkit(1, 1); //although i dont need the 2nd arg as its init
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	console.log('aData', aData);
	//var css = '.findbar-container {-moz-binding:url(' + self.path.chrome + 'findbar.xml#matchword_xbl)}';
	//var cssEnc = encodeURIComponent(css);
	var newURIParam = {
		aURL: self.aData.resourceURI.spec + 'main.css', //'data:text/css,' + cssEnc,
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.register();
	
	//register all observers
	for (var o in observers) {
		observers[o].reg();
	}
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	
	//unregister all observers
	for (var o in observers) {
		observers[o].unreg();
	}
	
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.unregister();
}

function install() {}

function uninstall() {}