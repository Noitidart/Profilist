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
var PUIsync_height = 0;
var PUIsync;

const { TextEncoder, TextDecoder } = Cu.import("resource://gre/modules/commonjs/toolkit/loader.js", {});
Cu.import('resource://gre/modules/Services.jsm');
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

	if (!decoder) {

		decoder = new TextDecoder(); // This decoder can be reused for several reads
	}


	let promise = OS.File.read(pathProfilesIni); // Read the complete file as an array

	promise = promise.then(
		function(ArrayBuffer) {
			var readStr = decoder.decode(ArrayBuffer); // Convert this array to a text

			ini = {};
			var patt = /\[(.*?)(\d*?)\](?:\s+?(.+?)=(.+))(?:\s+?(.+?)=(.+))?(?:\s+?(.+?)=(.+))?(?:\s+?(.+?)=(.+))?(?:\s+?(.+?)=(.+))?/mg;
			var blocks = [];

			var match;
			while (match = patt.exec(readStr)) {


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

			return ini;
		},
		function(aRejectReason) {

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

function saltName(aName) {
	var kSaltString = '';
	for (var i = 0; i < 8; ++i) {
		kSaltString += kSaltTable[Math.floor(Math.random() * kSaltTable.length)];
	}
	return kSaltString + '.' + aName;
}
/*end - salt generator*/
function createProfile(refreshIni, profName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {

				return createProfile(2, profName);
			},
			function(aRejectReason) {

				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {

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


		var rootPathDefaultDirName = OS.Path.join(profToolkit.rootPathDefault, dirName);
		var localPathDefaultDirName = OS.Path.join(profToolkit.localPathDefault, dirName);


		
		var profilesIniUpdateDone;
		var rootDirMakeDirDone;
		var localDirMakeDirDone;
		var checkReadyAndLaunch = function() {
			if (!profilesIniUpdateDone) {

			}
			if (!rootDirMakeDirDone) {

			}
			if (profToolkit.rootPathDefault == profToolkit.localPathDefault) {
				localDirMakeDirDone = true; //i dont have to check if rootDirMakeDirDone to set this to true, because when both paths are same we dont make a local dir
			}
			if (!localDirMakeDirDone) {

			}
			if (profilesIniUpdateDone && rootDirMakeDirDone && localDirMakeDirDone) {
				myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Creating Profile', 'Default Name: "' + profName + '"', false, null, null, 'Profilist');
				launchProfile(null, profName, 1, self.aData.installPath.path);

				return updateProfToolkit(1, 1);
			}
		}

		var PromiseAllArr = [];
		var promise = OS.File.makeDir(rootPathDefaultDirName);
		promise.then(
			function() {

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

							rootDirMakeDirDone = true;
							checkReadyAndLaunch();
						},
						function() {

							return new Error('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
						}
					);
					return promise3;
			},
			function() {

				return new Error('FAILED to create root dir for profile ' + profName + ' the path is = ' + rootPathDefaultDirName);
			}
		);
		PromiseAllArr.push(promise);
		if (profToolkit.rootPathDefault != profToolkit.localPathDefault) {
			var promise2 = OS.File.makeDir(localPathDefaultDirName);
			promise2.then(
				function() {

					localDirMakeDirDone = true;
					checkReadyAndLaunch();
				},
				function() {

					return new Error('FAILED to create local dir for profile "' + profName + '" the path is = ' + localPathDefaultDirName);
				}
			);
			PromiseAllArr.push(promise2);
		}
		var promise4 = writeIni();
		promise4.then(
			function() {

				profilesIniUpdateDone = true;
				checkReadyAndLaunch();
			},
			function() {

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
		return promise.then(
			function() {

				return renameProfile(2, profName, newName);
			},
			function(aRejectReason) {

				return new Error(aRejectReason.message);
			}
		);
	} else {
		//check if name is taken
		if (profName in ini == false) {
			Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot rename it.');
			return Promise.reject(new Error('Cannot find profile name, "' + profName + '", in Profiles.ini in memory.'));
		}
		if (newName in ini) {

			//Services.prompt.alert(null, self.name + ' - ' + 'Rename Error', 'Cannot rename to "' + newName + '" because this name is already taken by another profile.');


			throw new Error('Cannot rename this profile to "' + newName + '" because this name is already taken by another profile.');

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

				return updateProfToolkit(1, 1);
			},
			function() {

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


		 if (ini[profName].props.IsRelative == '1') {
			var dirName = OS.Path.basename(OS.Path.normalize(ini[profName].props.Path));

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

		 } catch (ex) {
			if (ex.result == Components.results.NS_ERROR_FILE_ACCESS_DENIED) {

				//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'The profile "' + profName + '" is currently in use, cannot delete.');
				return Promise.reject(new Error('The profile, "' + profName + '", is currently in use.'));
			} else {
				//throw ex;


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

			}
			if (!done.ini) {

			}
			if (PathRootDir == PathLocalDir) {
				done.local = true;
			}
			if (!done.local) {

			}
			
			for (var p in done) {
				if (!done[p]) {
					return;
				}
			}

			updateProfToolkit(1, 1);
		}
		var PromiseAllArr = [];
		if (ini[profName].props.IsRelative == '1') {
			var dirName = OS.Path.basename(OS.Path.normalize(ini[profName].props.Path));

			var PathRootDir = OS.Path.join(profToolkit.rootPathDefault, dirName);
			var PathLocalDir = OS.Path.join(profToolkit.localPathDefault, dirName);
			

			var promise = OS.File.removeDir(PathRootDir, {ignoreAbsent:true, ignorePermissions:false});
			promise.then(
				function() {

					done.root = true;
					checkReadyAndUpdateStack();
				},
				function(aRejectReason) {

					return new Error('FAILED to remove PathRootDir for profName of ' + profName);
				}
			);
			PromiseAllArr.push(promise);
			if (PathRootDir != PathLocalDir) {

				var promise2 = OS.File.removeDir(PathLocalDir, {ignoreAbsent:true, ignorePermissions:false});
				promise2.then(
					function() {

						done.local = true;
						checkReadyAndUpdateStack();
					},
					function(aRejectReason) {

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

					done.root = true;
					checkReadyAndUpdateStack();
				},
				function() {

					return new Error('FAILED to remove Path for profName of ' + profName + ' path = ' + Path);
				}
			);
			PromiseAllArr.push(promise);
		}
		delete ini[profName];
		var promise0 = writeIni();
		promise0.then(
			function() {

				done.ini = true;
				checkReadyAndUpdateStack();
			},
			function() {

				return new Error('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
			}
		);
		PromiseAllArr.push(promise0);
		
		return Promise.all(PromiseAllArr);
	}
}
function initProfToolkit() {

	
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

	profToolkit.localPathDefault = FileUtils.getFile('DefProfLRt', []).path; //following method does not work on custom profile: OS.Path.dirname(OS.Constants.Path.profileDir);


	profToolkit.selectedProfile.rootDirName = OS.Path.basename(OS.Constants.Path.profileDir);
	profToolkit.selectedProfile.localDirName = OS.Path.basename(OS.Constants.Path.localProfileDir);

	profToolkit.selectedProfile.rootDirPath = OS.Constants.Path.profileDir;
	profToolkit.selectedProfile.localDirPath = OS.Constants.Path.localProfileDir;
	

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

function updateOnPanelShowing(e, aDOMWindow, dontUpdateIni) {
	if (!e) {
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		var win = aDOMWindow;
	} else {


		if (e.target.id != 'PanelUI-popup') {

			return;
		} else {
			var PanelUI = e.target;
			var win = e.view;
		}
	}
		/*if edit anything here make sure to copy updateOnPanelShowing*/
		PUIsync = PanelUI.querySelector('#PanelUI-fxa-status');
		if (!PUIsync) {
			Services.prompt.alert(null, self.name + ' - ' + 'Menu Creation Failed', 'Profilist will not work properly because the "Sync" button was not found. Profilist creates its menu by cloning this element.');
			return new Error('Profilist will not work properly because the "Sync" button was not found. Profilist creates its menu by cloning this element.');
		}
		var puisynch = PUIsync.boxObject.height;
		if (puisynch == 0) {
			//try to get height from 'PanelUI-footer-inner'

			var PUIfi = PanelUI.querySelector('#PanelUI-footer-inner');
			if (PUIfi) {
				puisynch = PUIfi.boxObject.height;

			}
		}
		if (puisynch == 0) {

			puisynch = 38;
		}
		if (puisynch != 0 && PUIsync_height != puisynch) {

			PUIsync_height = puisynch;
		}
		
		var stack = PanelUI.querySelector('#profilist_box').childNodes[0];
		//assume its supposed to be in collapsed state right now
		if (collapsedheight != puisynch || stack.style.height == '') {
			var oldCollapsedheight = collapsedheight;
			//if collapsedheight != puisynch then obviously we have to set stack.style.height because we are assuming on popupshowing it should already be in collapsed style.height, (this is why i dont bother checking style.height) so if it is in this collapsed style.height then the last one used was the oldCollapsedheight obviously, so we want to set style.height as we are updating collapsedheight now to puisynch so set style.height to puisync too
			collapsedheight = puisynch;

			stack.style.height = collapsedheight + 'px';
		}
		/*end if edit anything here make sure to copy updateOnPanelShowing*/
		
		var updateIni = 1;
		if (dontUpdateIni) {
			updateIni = 0;
		}

		//win.setTimeout(function() { updateProfToolkit(updateIni, 1, win); }, 5000); //was testing to see how it handles when os.file takes long time to read
		updateProfToolkit(updateIni, 1, win)

}

function updateProfToolkit(refreshIni, refreshStack, iDOMWindow) {
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				updateProfToolkit(0, refreshStack);
			},
			function(aRejectReason) {

				return new Error(aRejectReason.message);
			}
		);
		return promise;
	} else {
		if (profToolkit.rootPathDefault === 0) {

			if (refreshStack !== 0) {
				refreshStack = true;
			}

			initProfToolkit();

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

			for (var p in ini) {
				if (!('IsRelative' in ini[p].props)) {

					continue;
				}
				if (ini[p].props.IsRelative == '1') {

					var iniDirName = OS.Path.basename(OS.Path.normalize(ini[p].props.Path));
					




					if (iniDirName == profToolkit.selectedProfile.rootDirName) {

						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
					if (iniDirName == profToolkit.selectedProfile.localDirName) {

						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
				} else {




					
					if (ini[p].props.Path == profToolkit.selectedProfile.rootDirPath) {

						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
					if (ini[p].props.Path == profToolkit.selectedProfile.localDirPath) {

						profToolkit.selectedProfile.name = ini[p].props.Name;
						break;
					}
				}
			}
			//profToolkit.selectedProfile.name = 1;
			if (!profToolkit.selectedProfile.name) {


				var profilistLoadingT = Services.wm.getMostRecentWindow('navigator:browser').document.querySelector('#profilistLoading');
				if (profilistLoadingT) {

					profilistLoadingT.setAttribute('label', 'Temporary Profile');
					profilistLoadingT.setAttribute('id', 'profilistTempProfile');
					return new Error('Using Temporary Profile - Profilist will not work');
				}
			}

		}
		
		
		if (refreshStack) {
			return updateStackDOMJson_basedOnToolkit(false, iDOMWindow);
		}
	}
}

function updateStackDOMJson_basedOnToolkit(dontUpdateStack, iDOMWindow) { //and based on ini as well

			var stackUpdated = false; //if splice in anything new in or anything old out then set this to true, if true then run dom update
			if (stackDOMJson.length == 0) {


				stackDOMJson = [
					{nodeToClone:'PUIsync', identifier:'[label="Create New Profile"]', label:'Create New Profile', class:'PanelUI-profilist create', hidden:null, id:null, oncommand:null, status:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  addEventListener:['command',createUnnamedProfile,false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					{nodeToClone:'PUIsync', identifier:'[path="' + ini[profToolkit.selectedProfile.name].props.Path + '"]', label:profToolkit.selectedProfile.name, class:'PanelUI-profilist', hidden:null, id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null, status:'active', addEventListener:['command', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profpath:ini[profToolkit.selectedProfile.name].props.Path}}
				];
				var profNamesCurrentlyInMenu = [ini[profToolkit.selectedProfile.name].props.Path];
				stackUpdated = true;
			} else {

				var profNamesCurrentlyInMenu = [];
				for (var i=0; i<stackDOMJson.length; i++) {
					var m = stackDOMJson[i];
					if ('props' in m && 'profpath' in m.props) {
						if (profToolkit.pathsInIni.indexOf(m.props.profpath) == -1) {
							//this is in the stack object but no longer exists so need to remove

							stackUpdated = true;
							stackDOMJson.splice(i, 1); //this takes care of deletes
							i--;
						} else {

							profNamesCurrentlyInMenu.push(m.props.profpath);
						}
					}
				}
			}
			

			
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
				var posOfProfInStack = -1; //actually cannot do this because have create profile button::::var posOfProfInStack = profNamesCurrentlyInMenu.indexOf(ini[p].props.Path); //identifies prop by path and gives location of it in stackDOMJson, this works because i do a for loop through stackDOMJson and create profNamesCurrentlyInMenu in that order

				for (var i=0; i<stackDOMJson.length; i++) {
					if ('props' in stackDOMJson[i]) {
						if (stackDOMJson[i].props.profpath == ini[p].props.Path) {
							posOfProfInStack = i;
							break;
						} else {

							continue; //dont really need continue as there is no code below in this for but ya
						}
					} else {
						continue; //dont really need continue as there is no code below in this for but ya
					}
				}

				
				if (posOfProfInStack > -1) {
					//check if any properties changed else continue
					//var justRenamed = false; //i had this as propsChanged but realized the only prop that can change is name and this happens on a rename so changed this to justRenamed. :todo: maybe im not sure but consider justDeleted
					if (stackDOMJson[posOfProfInStack].label != ini[p].props.Name) {

						stackDOMJson[posOfProfInStack].justRenamed = true;
						stackDOMJson[posOfProfInStack].label = ini[p].props.Name;
						//justRenamed = true;
						if (!stackUpdated) {
							stackUpdated = true; //now stack is not really updated (stack is stackDOMJson but we set this to true becuase if stackUpdated==true then it physically updates all PanelUi

						} else {

						}
					}
					continue; //contin as it even if it was renamed its not new so nothing to splice, and this profpath for ini[p] was found in stackDOMJson
				} else {

					stackUpdated = true;
					(function(pClosure) {
						var objToSplice = {nodeToClone:'PUIsync', identifier:'[path="' + ini[pClosure].props.Path + '"]', label:p, class:'PanelUI-profilist', hidden:null, id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:'inactive', addEventListener:['command', launchProfile, false], addEventListener2:['mousedown', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profpath:ini[pClosure].props.Path}};
						
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


			if (iDOMWindow) {

				updateMenuDOM(iDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
			} else {

				let DOMWindows = Services.wm.getEnumerator(null);
				while (DOMWindows.hasMoreElements()) {
					let aDOMWindow = DOMWindows.getNext();
					if (aDOMWindow.document.querySelector('#profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create

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

				if (dontUpdateStack) {

				} else {
					if (iDOMWindow) {

						updateMenuDOM(iDOMWindow, stackDOMJson, stackUpdated, dontUpdateStack);
					} else {
						let DOMWindows = Services.wm.getEnumerator(null);
						while (DOMWindows.hasMoreElements()) {
							let aDOMWindow = DOMWindows.getNext();
							if (aDOMWindow.document.querySelector('#profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create

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
	var profilist_box = aDOMWindow.document.querySelector('#profilist_box');
	if (!profilist_box) {

		return new Error('no profilist_box to update to');
	}
	var stack = profilist_box.childNodes[0];
	
	var stackChilds = stack.childNodes;
	var identObj = {};
	for (var i=0; i<stackChilds.length; i++) {
		var identifierRead = stackChilds[i].getAttribute('identifier');
		identObj[identifierRead] = stackChilds[i];
	}
	//start - test if dom matches json
	if (!jsonStackChanged) {

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

								domMatchesJson = false;
								break;
							}
						} else {
							if (el.getAttribute(p) != json[i][p]) {

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
		

		if (elHeight == 0) {

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

			} else {

				return false; //return false indiciating nothing was done but not returning error so indicating no error happend
			}
		} else if (!domMatchesJson) {

		}
	} else {

	}
	
	if (dontUpdateDom) {

		return false;
	}
	
	var cumHeight = 0;
	
	//cant set stack height here because popup state is now open. well can change it, but have to resize panel with the panelFit function i cant find here. because if i make it any taller than it is, then the scrollbar will show as the panel wont be sized to fit properly
	
	for (var i=0; i<json.length; i++) {

		var el = null;
		var appendChild = false;
		if (json[i].identifier) {

			el = identObj[json[i].identifier]; //stack.querySelector(json[i].identifier);

		}
		if (!el) {
			if (json[i].nodeToClone == 'PUIsync') {
				json[i].nodeToClone = PUIsync;
			}
			el = json[i].nodeToClone.cloneNode(true);
			appendChild = true;

		} else {

		}
		if (!el.hasAttribute('top')) {
			el.setAttribute('top', '0'); //this is important, it prevents toolbaritems from taking 100% height of the stacks its in
		}
		
		if (appendChild) {
			for (var p in json[i]) {
				if (p == 'nodeToClone' || p == 'props') { continue }
				if (p.indexOf('addEventListener') == 0) {
					(function(elClosure, jsonIClosure, pClosure) {


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

				//delete json[i].justRenamed; //cant delete this here, as if we are updating multiple windows, only the first window gets renamed properly
				el.setAttribute('label', json[i].label);

				//dont need this anymore as i am now using path for idnetifier //json[i].identifier = '[path="' + json[i].label + '"]'; //have to do this here as needed the identifier to ident this el
			}
		}
		
		//el.style.height = '';
		var elHeight = PUIsync_height; //el.boxObject.height;
		//var elHeight = el.ownerDocument.defaultView.getComputedStyle(el,null).getPropertyValue('height'); //have to use getComputedStyle instead of boxObject.height because boxObject.height is rounded, i need cumHeight added with non-rounded values but top is set with rounded value
		//elHeight = parseFloat(elHeight);
		if (elHeight == 0) {
			if (appendChild) {
				elHeight = json[i].nodeToClone.boxObject.height;
				//elHeight = json[i].nodeToClone.ownerDocument.defaultView.getComputedStyle(json[i].nodeToClone,null).getPropertyValue('height');
				//elHeight = parseFloat(elHeight);

			} else {

			}
		}
		el.style.height = elHeight + 'px';


		cumHeight += elHeight;

		if (i < json.length - 1) {
			el.setAttribute('top', cumHeight); //cant do this here because stack element expands to fit contents so this will mess up the cumHeight and make it think the element is longe that it is  //actually can do this now, now that i :learned: that if you set the top to some value it the element will not expand to take up 100% height of stack :learned:
			//el.setAttribute('bottom', cumHeight + elHeight);

		} else {
			el.setAttribute('top', '0');

		}
		
		if (appendChild) {
			if (json[i].status != 'active') { //this if makes sure the selected profile one gets added last note: again this is important because the last most element is top most on stack when collapsed, but in my case its more important because it gets the perm-hover class
				stack.insertBefore(el, stack.firstChild);
			} else {
				stack.appendChild(el);
			}

		}

	}
	if (expandedheight != cumHeight) {

		var oldExpandedheight = expandedheight;
		expandedheight = cumHeight;

	}



	
	var cStackHeight = parseInt(stack.style.height);
	if (isNaN(cStackHeight)) {

		stack.style.height = collapsedheight + 'px';
		cStackHeight = collapsedheight;
	}
	if (cStackHeight != collapsedheight && cStackHeight != expandedheight) {

		stack.style.height = expandedheight + 'px';

	}



	var stackChilds = stack.childNodes;
	for (var i=0; i<stackChilds.length; i++) {

		if (stackChilds[i].hasAttribute('status') && !(stackChilds[i].getAttribute('label') in ini)) { //:assume: only profiles have status attribute

			stack.removeChild(stackChilds[i]);
			i--;
		}	
	}
	
	/* [].forEach.call(stackChilds, function(sc) {

		if (sc.hasAttribute('status') && !(sc.getAttribute('label') in ini)) { //:assume: only profiles have status attribute

			stack.removeChild(sc);
		}
	}); */
	

}

var renameTimeouts = [];

function makeRename(e) {
	if (e.type == 'mousedown' && e.button != 0) {
		//ensure it must be primary click

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

				return;
			}
			win.clearTimeout(renameTimeouts[winID].timeout);
			delete renameTimeouts[winID];

		}, false);
		
	}
}

function actuallyMakeRename(el) {

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

						myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'Profile Renamed', 'The profile "' + oldProfName +'" was succesfully renamed to "' + newProfName + '"', false, null, null, 'Profilist');
						updateProfToolkit(1, 1);
					},
					function(aRejectReason) {

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
		Services.prompt.alert(null, self.name + ' - ' + 'Launch Failed', 'An error occured while trying to launch profile named "' + profName + '". Proflie name not found in Profiles.ini in memory.');

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

			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
			}
			
			var digit = 1;
			var profName = 'Unnamed Profile 1'; //creates with default name
			while (profName in ini) {
				digit++;
				profName = 'Unnamed Profile ' + digit
			}


			var promise1 = createProfile(0, profName);
			promise1.then(
				function() {

				},
				function(aRejectReason) {

					Services.prompt.alert(null, self.name + ' - ' + 'Create Failed', aRejectReason.message);
					return new Error('Create Failed. ' + aRejectReason.message);
				}
			);
			return promise1;
		},
		function(aRejectReason) {

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

function beforecustomization(e) {

	var doc = e.target.ownerDocument;
	var stack = doc.querySelector('#profilist_box');
	var active = stack.querySelector('[status=active]');
	active.setAttribute('disabled', true);
}

function customizationending(e) {

	var doc = e.target.ownerDocument;
	var stack = doc.querySelector('#profilist_box');
	var active = stack.querySelector('[status=active]');
	active.removeAttribute('disabled');
}

/*start - windowlistener*/
var registered = false;
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
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {			
			//var PUIsync = PanelUI.querySelector('#PanelUI-fxa-status');


			var PUIf = PanelUI.querySelector('#PanelUI-footer');
			var PUIcs = PanelUI.querySelector('#PanelUI-contents-scroller');
			

			var profilistHBoxJSON =
			['xul:vbox', {id:'profilist_box'},
				['xul:stack', {key:'profilist_stack', style:'width:100%;'},
					['xul:toolbarbutton', {'id':'profilistLoading', label:'Loading Profiles...', disabled:'true', class:'PanelUI-profilist', status:'active', style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'}]
				]
			];
			var referenceNodes = {};
			PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, referenceNodes), PUIf.firstChild);

			var THIS = PanelUI.querySelector('#PanelUI-multiView');
			//todo: probably should only do this overflow stuff if scrollbar is not vis prior to mouseenter, but i think for usual case scrollbar is not vis.
			referenceNodes.profilist_stack.addEventListener('mouseenter', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				var PUIcs_scrollsVis = PUIcs.scrollHeight - PUIcs.clientHeight > 0 ? true : false;

				if (!PUIcs_scrollsVis) {
					PUIcs.style.overflow = 'hidden'; //prevents scrollbar from showing
				}
				
				var cPopHeight = THIS._viewStack.clientHeight;
				var heightChildren = PUIf.childNodes;
				var expandedFooterHeight = 0;
				var profilistBoxFound = false;
				for (var i=0; i<heightChildren.length; i++) {
				    if (!profilistBoxFound && heightChildren[i].getAttribute('id') == 'profilist_box') {
				        expandedFooterHeight += expandedheight;
				        profilistBoxFound = true;
				    } else {
				       //expandedFooterHeight += heightChildren[i].boxObject.height;
				       var childHeight = parseFloat(aDOMWindow.getComputedStyle(heightChildren[i],null).getPropertyValue('height'));
				       if (isNaN(childHeight)) {

				       	childHeight = 0;
				       }

				       expandedFooterHeight += Math.floor(parseFloat(childHeight));
				    }
				}
				

				//me.alert(scopeProfilist.expandedheight)
				if (cPopHeight < expandedFooterHeight) {

					THIS._ignoreMutations = true;
					THIS._mainViewHeight = THIS._viewStack.clientHeight;
					THIS._transitioning = true;
					THIS._viewContainer.style.transition = 'height 300ms'; //need to make this take longer than the 0.25s of the profilist_box expand anim so it doesnt show any white space
					THIS._viewContainer.addEventListener('transitionend', function trans() {
						THIS._viewContainer.removeEventListener('transitionend', trans);
						//THIS._ignoreMutations = false; //important to set this to false before setting THIS._transitioning to false, because when set ignoreMut to false it runs `syncContainerWithMainView` and if it finds ignoreMut is false AND showingSubView is false AND transitioning is false then it will set the panel height to regular without anim
						THIS._transitioning = false;
					});
					
					THIS._viewContainer.style.height = Math.round(expandedFooterHeight) + 'px';
				} else {

				}

				


				referenceNodes.profilist_stack.style.height = expandedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.add('perm-hover');
			}, false);
			referenceNodes.profilist_stack.addEventListener('mouseleave', function() {
				//commenting out this block as using services prompt for renaming right now
				// if (aDOMWindow.ProfilistInRenameMode) {

					// return;
				// }
				if (!collapsedheight) {

					return;
				}
				var cStackHeight = parseInt(referenceNodes.profilist_stack.style.height);


				if (cStackHeight == collapsedheight) {

					return;
				}
				if (THIS._ignoreMutations) { //meaning that i did for reflow of panel

					THIS._transitioning = true;
					THIS._viewContainer.style.transition = 'height 150ms'; //need to make this take quicker than the 0.25s of the profilist_box expand anim so it doesnt show any white space
					THIS._viewContainer.addEventListener('transitionend', function trans() {
						THIS._viewContainer.removeEventListener('transitionend', trans);
						THIS._viewContainer.style.transition = '';
						THIS._ignoreMutations = false; //important to set this to false before setting THIS._transitioning to false, because when set ignoreMut to false it runs `syncContainerWithMainView` and if it finds ignoreMut is false AND showingSubView is false AND transitioning is false then it will set the panel height to regular without anim
						THIS._transitioning = false;
					});
					
					THIS._viewContainer.style.height = THIS._mainViewHeight + 'px';
				}
				referenceNodes.profilist_stack.addEventListener('transitionend', function() {

					referenceNodes.profilist_stack.removeEventListener('transitionend', arguments.callee, false);

					if (referenceNodes.profilist_stack.style.height == collapsedheight + 'px') {
						if (PUIcs.style.overflow == 'hidden') {
							PUIcs.style.overflow = ''; //remove the hidden style i had forced on it

						}
					} else {

					}
				}, false);

				referenceNodes.profilist_stack.style.height = collapsedheight + 'px';

				referenceNodes.profilist_stack.lastChild.classList.remove('perm-hover');
			}, false);
			//PanelUI.addEventListener('popuphiding', prevHide, false);
			PanelUI.addEventListener('popupshowing', updateOnPanelShowing, false);

			aDOMWindow.gNavToolbox.addEventListener('beforecustomization', beforecustomization, false);
			aDOMWindow.gNavToolbox.addEventListener('customizationending', customizationending, false);
			
			if (PanelUI.state == 'open') { //USED TO BE "if (PUIsync_height == 0)"
			
				if (!registered) {
					if (Object.keys(ini).length == 0) {
						updateOnPanelShowing(null, aDOMWindow);
					} else {
						updateOnPanelShowing(null, aDOMWindow, 1); //for dont read ini //we also dont want it to updateStack but i dont think its an expensive operation so i didnt program the skip in
						//updateMenuDOM(aDOMWindow, stackDOMJson);
					}
				} else {
					//will get here on new window open AND of course panel.state  is open (i removed the .state==showing from the if)
					updateOnPanelShowing(null, aDOMWindow);
				}
			}
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

	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData


	//initProfToolkit();

	//updateProfToolkit(1, 1); //although i dont need the 2nd arg as its init
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
	
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
		
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.unregister();
}

function install() {}

function uninstall() {}
