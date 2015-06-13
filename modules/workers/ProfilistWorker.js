'use strict';

// Non-Custom Path Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('resource://gre/modules/workers/require.js');

// Globals
const core = { // have to set up the main keys that you want when aCore is merged from mainthread in init
	addon: {
		path: {
			content: 'chrome://profilist/content/',
		}
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase()
	},
	firefox: {}
};

var OSStuff = {}; // global vars populated by init, based on OS

// Custom Path Imports - imports that use stuff defined in core - imported scripts have access to global vars on MainWorker.js, so no need to import within them, like the imported cutils doesnt need to import ctypes_math.jsm as it was already imported in MainWorker.js
// I don't import ostypes_*.jsm yet as I want to init core first, as they use core stuff like core.os.version_name == 'xp' etc
importScripts(core.addon.path.content + 'modules/cutils.jsm');
importScripts(core.addon.path.content + 'modules/ctypes_math.jsm');

var OSStuff = {}; // global vars populated by init, based on OS

// Setup PromiseWorker
var PromiseWorker = require(core.addon.path.content + 'modules/workers/PromiseWorker.js');
var worker = new PromiseWorker.AbstractWorker();
worker.dispatch = function(method, args = []) {
	return self[method](...args);
};
worker.postMessage = function(result, ...transfers) {
	self.postMessage(result, ...transfers);
};
worker.close = function() {
	self.close();
};
self.addEventListener('message', msg => worker.handleMessage(msg));

////// end of imports and definitions

function init(objCore) {
	//console.log('in worker init');
	
	// merge objCore into core
	// core and objCore is object with main keys, the sub props
	
	for (var p in objCore) {
		/* // cant set things on core as its const
		if (!(p in core)) {
			core[p] = {};
		}
		*/
		
		for (var pp in objCore[p]) {
			core[p][pp] = objCore[p][pp];
		}
	}

	/*
	if (core.os.toolkit == 'gtk2') {
		core.os.name = 'gtk';
	}
	*/
	
	// I import ostypes_*.jsm in init as they may use things like core.os.isWinXp etc
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.content + 'modules/ostypes_win.jsm');
			break
		case 'gtk':
			importScripts(core.addon.path.content + 'modules/ostypes_gtk.jsm');
			break;
		case 'darwin':
			importScripts(core.addon.path.content + 'modules/ostypes_mac.jsm');
			break;
		default:
			throw new Error({
				name: 'addon-error',
				message: 'Operating system, "' + OS.Constants.Sys.Name + '" is not supported'
			});
	}
	
	// OS Specific Init
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				
				OSStuff.hiiii = true;
				
			break;
		default:
			// do nothing special
	}
	
	return true;
}

// Start - Addon Functionality
function setWinPPSProps(jsStr_aNativeHandle, transferObj) {
	// winnt only
	// transferObj requires keys: RelaunchIconResource, RelaunchCommand, RelaunchDisplayNameResource, IDHash
	
	ostypes.HELPER.InitPropStoreConsts();
	
	var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(jsStr_aNativeHandle));
	var ppsPtr = ostypes.TYPE.IPropertyStore.ptr();
	var hr_SHGetPropertyStoreForWindow = ostypes.API('SHGetPropertyStoreForWindow')(cHwnd, ostypes.CONST.IID_IPropertyStore.address(), ppsPtr.address());
	ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'SHGetPropertyStoreForWindow');
	
	transferObj.ID = HashString(transferObj.IDHash) + ''; // made string as jsctypes converts it to cstring otherwise it takes it as cint
	
	var pps = ppsPtr.contents.lpVtbl.contents;
	try {
		//console.log('now setting on', arrWinHandlePtrStrs[i]);
		console.info('setting RelaunchIconResource:', transferObj.RelaunchIconResource + ',-2');
		var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchIconResource.address(), transferObj.RelaunchIconResource + ',-2'); // it works ine withou reource id, i actually am just guessing -2 is pointing to the 48x48 icon im no sure but whaever number i put after - it looks like is 48x48 so its weird but looking right
		//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchIconResource.address(), 'C:\\Users\\Vayeate\\AppData\\Roaming\\Mozilla\\Firefox\\profilist_data\\launcher_icons\\BADGE-ID_mdn__CHANNEL-REF_beta.ico,-6'); // it works ine withou reource id, i actually am just guessing -2 is pointing to the 48x48 icon im no sure but whaever number i put after - it looks like is 48x48 so its weird but looking right
		console.info('setting RelaunchDisplayNameResource:', transferObj.RelaunchDisplayNameResource);
		var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchDisplayNameResource.address(), transferObj.RelaunchDisplayNameResource);
		console.info('setting transferObj.RelaunchCommand:', transferObj.RelaunchCommand);
		var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchCommand.address(), transferObj.RelaunchCommand);
		
		console.info('setting transferObj.ID to DUMMY');
		var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_ID.address(), 'PROFILISTDUMMY'); // need to set it away, as the above 3 IPropertyStore_SetValue's only take affect on ID change per msdn docs
		console.info('setting transferObj.ID:', transferObj.ID);
		var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_ID.address(), transferObj.ID); // set it to what it really should be
		//console.log('done set on', arrWinHandlePtrStrs[i]);
		//ostypes.HELPER.checkHRESULT(hr_IPSSetValue, 'IPropertyStore_SetValue PKEY_AppUserModel_ID');
	} catch(ex) {
		console.error('ex caught when setting IPropertyStore:', ex);
		throw ex;
	} finally {
		pps.Release(ppsPtr);
	}
	
	return true;
}
function focusWindow(jsStr_nativeHandlePtr, nativeHandlePtr) {
	// provide one or the ther (nativeHandlePtr or jsStr_nativeHandlePtr)
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				
				if (jsStr_nativeHandlePtr) {
					console.info('received jsStr_nativeHandlePtr:', jsStr_nativeHandlePtr.toString());
					var hwnd = ostypes.TYPE.HWND(ctypes.UInt64(jsStr_nativeHandlePtr));
				} else if (nativeHandlePtr) {
					console.info('received nativeHandlePtr:', nativeHandlePtr.toString());
					var hwnd = nativeHandlePtr;
				} else {
					throw new Error('must provide one or the other');
				}
				
				console.info('focusing hwnd:', hwnd.toString());
				
				if (ostypes.API('IsIconic')(hwnd)) {
					ostypes.API('ShowWindow')(hwnd, ostypes.CONST.SW_RESTORE);
				}
				
				return ostypes.API('SetForegroundWindow')(hwnd);
			
			break;
		default:
			throw new Error('os-unsupported'); // if dont do new Error it wont give line number
	}		
}

function focusMostRecentWindowOfProfile(pidOfTargetProfile, IsRelative, Path, rootPathDefault) {
	// if non-winnt then if pidOfTargetProfile is not 0 or null or undefined, then it should be the pid of the running profile, it will then skip a profile locked check // if winnt this is 1, thats what queryProfileLocked returns
	// if non-winnt and pidOfTargetProfile is not provided then must provide IsRelative Path and rootPathDefault
	// if winnt then must provide IsRelative Path and rootPathDefault
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			
				var tPid = getPidForRunningProfile(IsRelative, Path, rootPathDefault); // targetPID
				
				// start find windows
				
				var method = 2;
				
				if (method == 1) {
					// behavior research from experimentation
					// win81 - exact same behavior as method 2
						// total win iteration regardless of pid, f, is not crazy its 275 in my current experiemnts when i have like 30 windows in taskbar, so i dont fear infinite loop with this method
						// if all windows not iconic then the first one found with WS_CAPTION and WS_VISIBLE is the most recent
						// if all windows iconic then the last one found with WS_CAPTION and WS_VISIBLE is the most recent
							// based on two above and experiment, if two windows, most recent was minimized, then the first win this finds will be the non iconic one which is NOT the most recent one, i dont have any ideas on how to differntiate on which was most recent
							
							
					// http://stackoverflow.com/questions/26103316/hwnds-of-alttab-menu-in-order - my post here on win81 behavior is wrong
					var PID = ostypes.TYPE.DWORD();
					var hwndC = ostypes.API('GetTopWindow')(null);
					var foundInOrder = []; // debug
					var f = 0; // debug
					var focusThisHwnd;
					while (!hwndC.isNull()) {
						f++; // debug
						var rez_GWTPI = ostypes.API('GetWindowThreadProcessId')(hwndC, PID.address());
						if (cutils.jscEqual(rez_GWTPI, 0)) {
							throw new Error('failed to GetWindowThreadProcessId');
						}
							
						if (cutils.jscEqual(PID, tPid)) {
							var hwndStyle = ostypes.API('GetWindowLongPtr')(hwndC, ostypes.CONST.GWL_STYLE);
							if (cutils.jscEqual(hwndStyle, 0)) {
								throw new Error('Failed to GetWindowLongPtr');
							}
							hwndStyle = parseInt(cutils.jscGetDeepest(hwndStyle));
							
							// debug block
							foundInOrder.push([cutils.strOfPtr(hwndC) + ' - ' + debugPrintAllStylesOnIt(hwndStyle)]); //debug
							if (!focusThisHwnd && (hwndStyle & ostypes.CONST.WS_VISIBLE) && (hwndStyle & ostypes.CONST.WS_CAPTION)) {
								foundInOrder.push('the hwnd above this row is what i will focus');
								focusThisHwnd = hwndC;
							}
							// end // debug block
							/* // debug
							if ((hwndStyle & ostypes.CONST.WS_VISIBLE) && (hwndStyle & ostypes.CONST.WS_CAPTION)) {
								return focusWindow(null, hwndC);
							}
							*/
						}
						
						hwndC = ostypes.API('GetWindow')(hwndC, ostypes.CONST.GW_HWNDNEXT);
					}
					
					console.error('debug:', 'method 1', 'total win itered:', f, '\n' + foundInOrder.join('\n') + '\n'); // debug i want to see when the loop ends, and i want to see the different styles on it
					
					return focusWindow(null, focusThisHwnd); // debug
					
				} else if (method == 2) {
					// behavior research from experimentation
					// win81 - exact same behavior as method 1
						// total win iteration regardless of pid, f, is not crazy its 275 in my current experiemnts when i have like 30 windows in taskbar, so i dont fear infinite loop with this method
						// if all windows not iconic then the first one found with WS_CAPTION and WS_VISIBLE is the most recent
						// if all windows iconic then the last one found with WS_CAPTION and WS_VISIBLE is the most recent
							// based on two above and experiment, if two windows, most recent was minimized, then the first win this finds will be the non iconic one which is NOT the most recent one, i dont have any ideas on how to differntiate on which was most recent
					var PID = ostypes.TYPE.DWORD();
					
					var foundInOrder = []; // debug
					var f = 0; // debug
					var focusThisHwnd;
					
					var SearchPD = function(hwnd, lparam) {
						f++;
						var rez_GWTPI = ostypes.API('GetWindowThreadProcessId')(hwnd, PID.address());
						//console.log(['PID.value: ', PID.value, PID.value == aProfilePID].join(' '));
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
						
						return true;
					}
					var SearchPD_ptr = ostypes.TYPE.WNDENUMPROC.ptr(SearchPD);
					var wnd = ostypes.TYPE.LPARAM();
					var rez_EnuMWindows = ostypes.API('EnumWindows')(SearchPD_ptr, wnd);
					
					// debug block
					console.error('debug:', 'method 2', 'total win itered:', f, '\n' + foundInOrder.join('\n') + '\n'); // debug i want to see when the loop ends, and i want to see the different styles on it
					return focusWindow(focusThisHwnd, null); // debug
					// end debug block
				} else {
					throw new Error('invalid method');
				}
				
			break;
		default:
			throw new Error('os-unsupported'); // if dont do new Error it wont give line number
	}
}

function refreshIconAtPath(iconPath) {

	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// returns ostypes.TYPE.VOID
				if (!iconPath) {
					// refresh all
					ostypes.API('SHChangeNotify')(ostypes.CONST.SHCNE_ASSOCCHANGED, ostypes.CONST.SHCNF_IDLIST, null, null); //updates all
				} else {
					//todo get this working with path
					ostypes.API('SHChangeNotify')(ostypes.CONST.SHCNE_ASSOCCHANGED, ostypes.CONST.SHCNF_IDLIST, null, null); //updates all
				}
				return true;
				
			break;
		default:
			throw new Error('os-unsupported'); // if dont do new Error it wont give line number
	}
}

function winnt_updateFoundShortcutLaunchers_withObj(objDirDepth, aProfRootDirOsPath, commonCutInfoObj) {
	// if shortcut found in these dirs, it is updated
		// if launcher is not found it is not made
	
	// console.error('winnt_updateFoundShortcutLaunchers_withObj', 'ENTERED');
	
	// console.info('objDirDepth:', objDirDepth);
	// console.info('aProfRootDirOsPath:', aProfRootDirOsPath);
	// console.info('commonCutInfoObj:', commonCutInfoObj);
	
	var rezFindsArr = findLaunchers(objDirDepth, aProfRootDirOsPath);
	
	var cArrOfObjs = [];
	for (var i=0; i<rezFindsArr.length; i++) {
		console.info('i:', i);
		cArrOfObjs.push({
			dirNameLnk: rezFindsArr[i],
			args: commonCutInfoObj.args,
			desc: commonCutInfoObj.desc,
			icon: commonCutInfoObj.icon,
			targetFile: commonCutInfoObj.targetFile,
			
			renameToName: commonCutInfoObj.name,
			updateIfDiff: true,
			refreshIcon: 1
		});
		if (core.os.version_name == '7+') {
			cArrOfObjs[cArrOfObjs.length-1].appUserModelId = HashStringHelper(aProfRootDirOsPath);
		}
	}
	// console.error('winnt_updateFoundShortcutLaunchers_withObj', 'cArrOfObjs:', cArrOfObjs);
	
	createShortcuts(cArrOfObjs); // if length of objs is 0 it will not do anything
	
	// console.error('winnt_updateFoundShortcutLaunchers_withObj', 'DONE');
}

function makeLauncher(pathsObj) {
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':				
				
				// note to dev: requires pathsObj.dir be passed in arg
				if (!('dir' in pathsObj)) {
					throw new Error('makeLauncher for WINNT requires that pathsObj.dir be specified');
				}
				if (!('profRootDir' in pathsObj)) {
					throw new Error('makeLauncher for WINNT requires that pathsObj.profRootDir be specified');
				}
				
				if (core.os.version_name == '7+') {
					if (pathsObj.IDHash) {
						pathsObj.appUserModelId = HashStringHelper(pathsObj.IDHash) + ''; // make it a jsStr
						delete pathsObj.IDHash;
					}
				}
				
				tryOsFile_ifDirsNoExistMakeThenRetry('makeDir', [pathsObj.dir], OS.Constants.Path.userApplicationDataDir); // assumption that drom dir is userApplicationDataDir
				
				// :todo: make tryOsFile_ifDirsNoExistMakeThenRetry return differently, letting me know if it made the dir, or it was already there, cuz if it wasnt there, then i can skip the findLaunchers proc as the folder didnt exist so its obvious the launcher didnt exist
				
				// check launch directory if it already exists and just needs rename
				var searchDirs = {};
				searchDirs[pathsObj.dir] = 1;
				var rezFindsArr = findLaunchers(searchDirs, pathsObj.profRootDir); // should return 1 or 0 entries
				console.info('rezFindsArr:', rezFindsArr);
				if (rezFindsArr.length == 1) {
					pathsObj.renameToName = pathsObj.name;
					pathsObj.dirNameLnk = rezFindsArr[0];
				} else if (rezFindsArr.length > 1) {
					// :todo: maybe rather then error'ing i should warn and delete all but one
					console.error('found more then 1 launcher in profilist_data/launcher_exes/, rezFindsArr:', rezFindsArr);
					throw new Error('found more then 1 launcher in profilist_data/launcher_exes/, rezFindsArr');
				}
				
				delete pathsObj.profRootDir;
				
				return createShortcuts([pathsObj]);
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function makeDeskcut(cutInfoObj) {
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
				// actually no: // dont check existance of launcher, just write/overwrite
				// check existance of launcher, check its props to ensure they match in pathsObj, if they dont match ten overwrite it with corrections
				
				if (!('dirNameLnk' in cutInfoObj)) {
					throw new Error('makeDeskcut requires path safed dirNameLnk');
				}
				if (!('dir' in cutInfoObj)) {
					throw new Error('makeDeskcut requires path safed dir'); // and createShortcuts requires name if i provide dir, so make sure to provide name as well
				}
				if ('renameToName' in cutInfoObj) {
					throw new Error('makeDeskcut requires that renameToName not be set, because it relies on the fed dirNameLnk');
				}
				
				if (cutInfoObj.IfExists_ThenDontCreateLauncher) { // default of IfExists_ThenDontCreateLauncher is false/null/undefined
					delete cutInfoObj.IfExists_ThenDontCreateLauncher; // this key was specifically for makeDeskcut
					
					console.error('will check if launcher exists, if it does then it wont makeLauncher');
					if (!('exists' in cutInfoObj)) {
						// `exists` wasnt in obj so check existance, this is required before a hard link can be made
						cutInfoObj.exists = OS.File.exists(cutInfoObj.dirNameLnk);
					}
					
					if (!cutInfoObj.exists) {
						makeLauncher(cutInfoObj);
					}
				} else {
					console.error('ok going straight to makeLauncher');
					makeLauncher(cutInfoObj);
				}
				
				return makeAlias(OS.Path.join(OS.Constants.Path.desktopDir, cutInfoObj.name + '.lnk'), cutInfoObj.dirNameLnk); // when make hardlink, the name can be different however the extension must be the same otherwise the hardlink doesnt connect and when you try to open windows asks you "open it with what?"
			
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function forceQuit(aPID, IsRelative, Path, path_DefProfRt) {
	// IsRelative, Path, path_DefProfRt is for WINNT so it can get PID, you should check if its running before calling this, but its not so bad if you call this while its not running it wont find a PID and it will return failure
	// force kills the process
	// aPID is ofcourse a process id that is running
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			
				var cProfPID = aPID > 1 ? aPID : getPidForRunningProfile(IsRelative, Path, path_DefProfRt); // throws if pid not found // assuming that PID can never be 1
				
				var hProcess = ostypes.API('OpenProcess')(ostypes.CONST.PROCESS_TERMINATE | ostypes.CONST.SYNCHRONIZE, false, cProfPID);
				console.info('hProcess:', hProcess.toString(), uneval(hProcess), cutils.jscGetDeepest(hProcess));
				if (ctypes.winLastError != 0) {
				  console.error('Failed hProcess, winLastError:', ctypes.winLastError);
				  throw new Error({
					name: 'os-api-error',
					message: 'Failed hProcess, winLastError: "' + ctypes.winLastError + '" and hProcess: "' + hProcess.toString(),
					winLastError: ctypes.winLastError
				  });
				}
				try {
					var rez_term = ostypes.API('TerminateProcess')(hProcess, 0);
					console.info('rez_term:', rez_term.toString(), uneval(rez_term), cutils.jscGetDeepest(rez_term));
					if (ctypes.winLastError != 0) {
					  console.error('Failed rez_term, winLastError:', ctypes.winLastError);
					  throw new Error({
						name: 'os-api-error',
						message: 'Failed rez_term, winLastError: "' + ctypes.winLastError + '" and rez_term: "' + rez_term.toString(),
						winLastError: ctypes.winLastError
					  });
					}

					var rez_wait = ostypes.API('WaitForSingleObject')(hProcess, ostypes.CONST.INFINITE);
					console.info('rez_wait:', rez_wait.toString(), uneval(rez_wait), cutils.jscGetDeepest(rez_wait));
					if (ctypes.winLastError != 0) {
					  console.error('Failed rez_wait, winLastError:', ctypes.winLastError);
					  throw new Error({
						name: 'os-api-error',
						message: 'Failed rez_wait, winLastError: "' + ctypes.winLastError + '" and rez_wait: "' + rez_wait.toString(),
						winLastError: ctypes.winLastError
					  });
					}
					
				} finally {
					var rez_CloseHandle = ostypes.API('CloseHandle')(hProcess);
					console.info('rez_CloseHandle:', rez_CloseHandle.toString(), uneval(rez_CloseHandle), cutils.jscGetDeepest(rez_CloseHandle));
					if (ctypes.winLastError != 0) {
					  console.error('Failed rez_CloseHandle, winLastError:', ctypes.winLastError);
					  throw new Error({
						name: 'os-api-error',
						message: 'Failed rez_CloseHandle, winLastError: "' + ctypes.winLastError + '" and rez_CloseHandle: "' + rez_CloseHandle.toString(),
						winLastError: ctypes.winLastError
					  });
					}
				}
				
				return rez_term;
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function gracefulQuit(aPID, IsRelative, Path, path_DefProfRt) {
	// IsRelative, Path, path_DefProfRt is for WINNT so it can get PID, you should check if its running before calling this, but its not so bad if you call this while its not running it wont find a PID and it will return failure
	// aPID is ofcourse a process id that is running
	// sends message to close, so user gets prompted by the default prompt things (ie: needs to save document)
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			
				// get all windows, and SendMessage WM_CLOSE or WM_QUIT to each
				var cProfPID = aPID > 1 ? aPID : getPidForRunningProfile(IsRelative, Path, path_DefProfRt); // throws if pid not found // assuming that PID can never be 1
				
				
				/*
				// method1 - tested works save dialogs shown
				// issue is though, that if a save dialog is shown, its window is not focused, it just flashes in taskbar, i should figure out someway to focus it
				var arr_strPtrWin = getPtrStrToWinOfProf(cProfPID, true, true);
				for (var i=0; i<arr_strPtrWin.length; i++) {
					
					var hWnd = ostypes.TYPE.HWND(ctypes.UInt64(arr_strPtrWin[i]));
					
					var rez_SendMessage = ostypes.API('SendMessage')(hWnd, ostypes.CONST.WM_CLOSE, 0, 0);
					console.info('rez_SendMessage:', rez_SendMessage.toString(), uneval(rez_SendMessage), cutils.jscGetDeepest(rez_SendMessage));
					if (ctypes.winLastError != 0) {
					  console.error('Failed rez_SendMessage, winLastError:', ctypes.winLastError);
					  throw new Error({
						name: 'os-api-error',
						message: 'Failed rez_SendMessage, winLastError: "' + ctypes.winLastError + '" and rez_SendMessage: "' + rez_SendMessage.toString(),
						winLastError: ctypes.winLastError
					  });
					}
					
					//break; // testing to see what happens if i send WM_QUIT to just any window of the pid, im hoping it does graceful quit on the whole process
					
				}
				*/
				
				
				// method2 - tested works, sending to any one of the windows, vis or invis, quits whole app without forcing it, however the save promps didnt show
				// issue is though, none of the save dialog boxes are shown on windows that need it
				var strPtrWin = getPtrStrToWinOfProf(cProfPID, false, false); // i dont think i need a visible win for this method
				var hWnd = ostypes.TYPE.HWND(ctypes.UInt64(strPtrWin));
				
				var idThread = ostypes.API('GetWindowThreadProcessId')(hWnd, null);
				console.info('idThread:', idThread.toString(), uneval(idThread), cutils.jscGetDeepest(idThread));
				if (ctypes.winLastError != 0) {
				  console.error('Failed idThread, winLastError:', ctypes.winLastError);
				  throw new Error({
					name: 'os-api-error',
					message: 'Failed idThread, winLastError: "' + ctypes.winLastError + '" and idThread: "' + idThread.toString(),
					winLastError: ctypes.winLastError
				  });
				}
				
				var rez_PostThreadMessage = ostypes.API('PostThreadMessage')(idThread, ostypes.CONST.WM_QUIT, 0, 0);
				console.info('rez_PostThreadMessage:', rez_PostThreadMessage.toString(), uneval(rez_PostThreadMessage), cutils.jscGetDeepest(rez_PostThreadMessage));
				if (ctypes.winLastError != 0) {
				  console.error('Failed rez_PostThreadMessage, winLastError:', ctypes.winLastError);
				  throw new Error({
					name: 'os-api-error',
					message: 'Failed rez_PostThreadMessage, winLastError: "' + ctypes.winLastError + '" and rez_PostThreadMessage: "' + rez_PostThreadMessage.toString(),
					winLastError: ctypes.winLastError
				  });
				}
				
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function launchProfile(pathsObj, arrOfArgs) { // checkExistanceFirst to check if launcher exists first? not used yet
	
	// pathsObj should be same as that needed to be passed to makeLauncher
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				//try {
					// can just do makeLauncher and catch on error, as that does exist check, and i set appUserModelId so if it exists it wont continue
					
					// find if it already exists in dir
					var launchPath = pathsObj.dirNameLnk; // as if rename is needed the obj changes, so i save it here
					
					makeLauncher(pathsObj); // shortcut compares args and targetFile, if not matched, then updates shortcut
					console.info('ok shortcut updated?');
					
					// shellExecEx
					// http://blogs.msdn.com/b/oldnewthing/archive/2010/11/18/10092914.aspx
					// i get access denied as it requires STA
					//var rez_CoInitializeEx = ostypes.API('CoInitializeEx')(null, 0x2 | 0x4);
					//console.info('rez_CoInitializeEx:', rez_CoInitializeEx.toString(), uneval(rez_CoInitializeEx));
					//if (ctypes.winLastError != 0) { console.error('Failed rez_CoInitializeEx, winLastError:', ctypes.winLastError); }
					
					var sei = ostypes.TYPE.SHELLEXECUTEINFO();
					//console.info('ostypes.TYPE.SHELLEXECUTEINFO.size:', ostypes.TYPE.SHELLEXECUTEINFO.size);
					sei.cbSize = ostypes.TYPE.SHELLEXECUTEINFO.size;
					sei.lpFile = ostypes.TYPE.LPCTSTR.targetType.array()(launchPath);
					if (arrOfArgs && arrOfArgs.length > 0) {
						sei.lpParameters = ostypes.TYPE.LPCTSTR.targetType.array()(arrOfArgs.join(' '));
					}
					//sei.lpVerb = ostypes.TYPE.LPCTSTR.targetType.array()('open');
					sei.nShow = ostypes.CONST.SW_SHOWNORMAL;
					
					var rez_ShellExecuteEx = ostypes.API('ShellExecuteEx')(sei.address());
					console.info('rez_ShellExecuteEx:', rez_ShellExecuteEx.toString(), uneval(rez_ShellExecuteEx));
					if (ctypes.winLastError != 0) { console.error('Failed rez_ShellExecuteEx, winLastError:', ctypes.winLastError); }
					
					//console.info('sei:', sei.toString());
					//console.log('sei.hInstApp:', sei.hInstApp.toString());
				//} finally {
					//var rez_CoUninitialize = ostypes.API('CoUninitialize')();
				//}
				
			break;
		case 'linux':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
		case 'webos':
		case 'android':
		
				// gio
			
			break;
		case 'darwin':
				
				// open
				
			break;
		default:
			throw new Error('os-unsupported');
	}
}

function findLaunchersByExePath(objDirDepth, aExePath, aOptions={}) {
	// returns array of paths to launchers found that launch aProfRootDirOsPath, if profile is default, then it also returns all launchers that launch into default profile
	/* objDirDepth is like this:
	{
		path1: depth jsInt OR null for no max depth
		path2: depth jsInt
	}
	*/
	// aProfRootDirOsPath is required
	// optional: aOptions
	/* aOptions
	{
		isDefaultProf: jsBool, // cuases exes to be found too on windows
		profName: jsStr, // another check type `-P "name_here"` not yet impelemnted
		returnObj: false is default and an array of paths is returned, if false, if true WINNT it returs obj with info on the launchers
	}
	*/
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// find shortcut launchers
				var arrLauncherPaths = [];
				var arrCollectedPaths = []; // paths of all of the files found in the selected paths
				var dlgtCollect = function(aEntry) {
					if (!aEntry.isDir) {
						if (aEntry.path.substr(-3).toLowerCase() == 'lnk') {
							arrCollectedPaths.push(aEntry.path);
						}
					}
				};
				
				// get cut details
				for (var p in objDirDepth) {
					try {
						enumChildEntries(p, dlgtCollect, objDirDepth[p], false);
					} catch(ex) {
						if ('winLastError' in ex && ex.winLastError == 2) {
							// the directory at p doesnt exist so continue
						} else {
							console.error('findLaunchers', 2.6, 'ex on enumChildEntries:', ex.winLastError, 'ex:', ex);
							throw new Error(ex.toString());
						}
					}
				}
				
				var cutInfos = winnt_getInfoOnShortcuts(arrCollectedPaths, {
					winGetTargetPath: true,
					winGetArgs: true
				});
				console.info('cutInfos:', cutInfos);
				
				// filter out based on cuts that launch this profile
				var criteriaForMatchingCut = [];
				criteriaForMatchingCut.push(aExePath.toLowerCase());
				//console.log('testing for', criteriaForMatchingCut[0]);
				for (var p in cutInfos) {
					//console.log('testing', cutInfos[p].TargetArgs, 'test:', cutInfos[p].TargetArgs.indexOf(criteriaForMatchingCut[0]));
					if (cutInfos[p].TargetPath.toLowerCase().indexOf(criteriaForMatchingCut[0]) > -1) {
						arrLauncherPaths.push(p);
					} else {
						if (aOptions.returnObj) {
							delete cutInfos[p];
						}
					}
				}
				
				console.error('ok these are filtered:', arrLauncherPaths);
				if (aOptions.returnObj) {
					return cutInfos;
				} else {
					return arrLauncherPaths;
				}
				// end find shortcut launchers
				
				// :todo: find exe launchers
				
			break;
		default:
			throw new Error('os-unsupported')
	}	
};

function findLaunchers(objDirDepth, aProfRootDirOsPath, aOptions={}) {
	// returns array of paths to launchers found that launch aProfRootDirOsPath, if profile is default, then it also returns all launchers that launch into default profile
	/* objDirDepth is like this:
	{
		path1: depth jsInt OR null for no max depth
		path2: depth jsInt
	}
	*/
	// aProfRootDirOsPath is required
	// optional: aOptions
	/* aOptions
	{
		isDefaultProf: jsBool, // cuases exes to be found too on windows
		profName: jsStr, // another check type `-P "name_here"` not yet impelemnted
		returnObj: false is default and an array of paths is returned, if false, on WINNT it returs obj
	}
	*/
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// find shortcut launchers
				
				var arrLauncherPaths = [];
				var arrCollectedPaths = []; // paths of all of the files found in the selected paths
				var dlgtCollect = function(aEntry) {
					if (!aEntry.isDir) {
						if (aEntry.path.substr(-3).toLowerCase() == 'lnk') {
							arrCollectedPaths.push(aEntry.path);
						}
					}
				};
				
				// get cut details
				for (var p in objDirDepth) {
					try {
						enumChildEntries(p, dlgtCollect, objDirDepth[p], false);
					} catch(ex) {
						if ('winLastError' in ex && ex.winLastError == 2) {
							// the directory at p doesnt exist so continue
						} else {
							console.error('findLaunchers', 2.6, 'ex on enumChildEntries:', ex.winLastError, 'ex:', ex);
							throw new Error(ex.toString());
						}
					}
				}
				
				var cutInfos = winnt_getInfoOnShortcuts(arrCollectedPaths, {winGetArgs:true});
				
				console.info('cutInfos:', cutInfos);
				
				// filter out based on cuts that launch this profile
				var criteriaForMatchingCut = [];
				criteriaForMatchingCut.push('-profile "' + aProfRootDirOsPath.toLowerCase() + '"');
				
				if (aOptions.profName) {
					// not yet implemented, may never need to
				}
				console.log('testing for', criteriaForMatchingCut[0]);
				for (var p in cutInfos) {
					//if (aProfRootDirOsPath) {
						console.log('testing', cutInfos[p].TargetArgs, 'test:', cutInfos[p].TargetArgs.indexOf(criteriaForMatchingCut[0]));
						if (cutInfos[p].TargetArgs.indexOf(criteriaForMatchingCut[0]) > -1) {
							arrLauncherPaths.push(p);
						}
					//}
				}
				console.error('ok these are filtered:', arrLauncherPaths);
				if (aOptions.returnObj) {
					for (var p in cutInfos) {
						if (arrLauncherPaths.indexOf(p) == -1) {
							delete cutInfos[p];
						}
					}
					return cutInfos;
				} else {
					return arrLauncherPaths;
				}
				// end find shortcut launchers
				
				// :todo: find exe launchers
				
			break;
		default:
			throw new Error('os-unsupported')
	}
}

function createShortcuts(aArrOfObjs) {
	//aArrOfObjs is array of shortcuts to make each obj is like this:
	// temporarily: appUserModelId is only used if it has to needToCreate. the stuff is written though, so uncomment the commented out test in the updateIfDiff section and comment out the if exists check before the appUserModelId setting // link787845
	/*
		{
			dir:					// jsStr. OSPath. short for OSPath_dirToMakeShortcutFileIn // example: C:\blah
			name:					// jsStr. short for jsStr_nameOfShortcutFileNoLnk which is name of shortcut file, without the .lnk. if name is not safe for a winnt path, then set doPathSafeWith to a character to replace it with to safe it. // example: cut
			dirNameLnk:			// jsStr. OSPath. full path with .lnk at end // example: C:\blah\cut.lnk // if this is provided along with dir and name. dirNameLnk is used and dir and name are calced from dirNameLnk
			
			targetFile:			// jsStr. OSPath. optional if the shortcut already exists
			icon:				// jsStr. OSPath. path to icon to use // ex: C:\blah\rawr.ico
			iconIndex:			// jsInt. optional. if icon is provided, then iconIndex is used, if omitted but icon is not omitted, default iconIndex of 0 is used
			args:				// jsStr. arguments that should be applied to targetFile // example: -profile "C:\hi"
			desc:				// jsStr. text that goes in description. // ex: This is my shortcut yay!
			
			workDir:			// jsStr. OSPath. i dont understand the MSDN docs about this but i added it here just in case, omit if you dont need to set a working directory
			
			appUserModelId:		// jsStr. if provided, and shortcut exists, then the shortcut is deleted and recreated :todo: add an option to keep creation time constant on recreated shortcut
			
			// options
			exists:				// jsBool. set to true or false if you know it exists or not, omit if you dont know and this function will do a check // if set it to true/false and you are wrong, some quirky stuff will happen probably
			// if cut does not exist, then jsStr_OSPath_targetFile is required
			
			updateIfDiff:		// jsBool. default is false. meaning by default it will overwrite. it gets the shortcut properties first, and if different from the ones provided then it will update it, else it will not // currently does not check if descriptions `desc` differ, or if workingDirectory `workDir` differs // also does not check if iconIndex differs. it does but it doesnt use that as a reponse to update it. i should fix this in future. if icon paths are same even though iconIndex's differ, it will not update the iconIndex, :todo: // this means if icon, targetFile, or appUserModelId all match, then even if desc, workingDir, iconindex dont match they will not be updated
			refreshIcon:		// jsInt. default is 0. or omitted meaning dont. if set to 1 then it will refresh at path, if set to 2 it will refresh full windows icon cache // if icon was not updated then it will not refresh if even refreshicon is set to 1 or 2
			doPathSafeWith:		// jsStr. default is it wont safe it. so if you dont want to safe it, then omit this
			renameToName:		// omit if you dont want to rename. otherwise provide a name. without the .lnk. if it is found that the name of the current file doesnt match, then it is renamed. this does not consider updateIfDiff, test is always made, just cause the needed data is already available (the current path, and the new name)
		}
		
		MUST provide either (OSPath_dir AND jsStr_name) OR OSPath_dirNameLnk
	*/
	
	if (aArrOfObjs.length == 0) {
		return true; // nothing to make
	};
	
	var refs = {};
	ostypes.HELPER.InitShellLinkAndPersistFileConsts();
	
	if (core.os.version_name == '7+') {
		// check if we need IPropertyStore
		for (var i=0; i<aArrOfObjs.length; i++) {
			if ('appUserModelId' in aArrOfObjs[i]) {
				refs.propertyStore = undefined;  // this tells winntShellFile_DoerAndFinalizer to get IPropertyStore interface
				ostypes.HELPER.InitPropStoreConsts();
				break;
			}
		}
	}
	
	var doer = function() {
		var refreshAtPath = [];
		var refreshAllIconNeeded = false; // sets to true if any of the shortcuts in the aArrOfObjs had setting of iconRefresh of 2. also if there is a mix of 1 and 2. at the very end of the loop, if refreshAllIconNeeded still false, then it goes through and refreshes each path
		for (var i=0; i<aArrOfObjs.length; i++) {
			
			var cObj = aArrOfObjs[i];
			console.info('cObj is:', cObj);
			
			if (core.os.version_name != '7+') {
				if ('appUserModelId' in cObj) {
					delete cObj.appUserModelId;
				}
			}
			
			var needToCreate = false; // if need to create or recreate the file this is set to true. if exist then if just needing to update certain properties then this is false. we start out assuming false.
			
			// start path stuff
			var fullPath;
			var dir;
			var name;
			
			if ('dir' in cObj && 'name' in cObj && 'dirNameLnk' in cObj) { // all 3 were provided, so just use dirNameLnk, i dont test if name and dir match that of dirNameLnk, its a devuser issue he shouldnt be stupid
				fullPath = cObj.dirNameLnk;
			} else if (!('dir' in cObj) && !('name' in cObj) && !('dirNameLnk' in cObj)) {
				throw new Error('In obj ' + i + ' NONE of the three were provided. Either provide (dir and name) OR (dirNameLnk)');
			} else {
				if ('dirNameLnk' in cObj) {
					fullPath = cObj.dirNameLnk;
				} else {
					if (('dir' in cObj && !('name' in cObj)) || ((!('dir' in cObj) && 'name' in cObj))) {
						throw new Error('In obj ' + i + ', dirNameLnk was not provided AND either dir or name was provided. MUST provided dir and name ELSE provide dirNameLnk');
					} else {
						fullPath = OS.Path.join(cObj.dir, cObj.name + '.lnk');
					}
				}
			}
			
			if ('doPathSafeWith' in cObj) {
				fullPath = fullPath.replace(/([\\*:?<>|\/\"])/g, cObj.doPathSafeWith);
			}
			
			dir = OS.Path.dirname(fullPath);
			name = OS.Path.basename(fullPath);
			name = name.substr(0, name.length - 4); // remove .lnk extension
			// end path stuff
			
			console.log('begin shortcut creation proc on fullPath:', fullPath);
			
			if (!('exists' in cObj)) {
				cObj.exists = OS.File.exists(fullPath);
				console.info('existance check for fullPath of', fullPath, 'is:', cObj.exists);
			}
			
			if (!cObj.exists && !('targetFile' in cObj)) {
				needToCreate = true;
				throw new Error('In obj ' + i + ' it was marked or it was found that the shortcut file was not pre-existing, so a targetFile MUST be provided, ');
			}

			if ('renameToName' in cObj) {
				if ('doPathSafeWith' in cObj) {
					var renameToName = getSafedForOSPath(cObj.renameToName, cObj.doPathSafeWith);
				} else {
					var renameToName = cObj.renameToName;
				}
			}
			
			if (cObj.exists) {
				// lets see if we should rename it
				if ('renameToName' in cObj) {
					if (renameToName != name) {
						// ok rename it
						console.log('needing to rename it as old name was "' + name + '" and new name based on devuser set should be "' + renameToName + '"');
						var fullPathRENAMED = OS.Path.join(dir, renameToName + '.lnk');
						var rez_rename = OS.File.move(fullPath, fullPathRENAMED);
						
						// update fullPath
						fullPath = fullPathRENAMED;
						
						// update name
						name = renameToName;
						console.log('fullPath moded due to renameToRename, its is now:', fullPath);
					} // else its already named renameToName so no need to rename
				}
				
				// ok load it, it exists
				var hr_Load = refs.persistFile.Load(refs.persistFilePtr, fullPath, 0);
				//console.info('hr_Load:', hr_Load.toString(), uneval(hr_Load));
				ostypes.HELPER.checkHRESULT(hr_Load, 'Load');
			} else {
				if ('renameToName' in cObj) {
					console.log('it doesnt exist, but devuser set a renameToName so going to use this as name i dont test if name and renameToName match im just taking renameToName', 'name:', name, 'renameToName:', renameToName);
					name = renameToName;
					var fullPathRENAMED = OS.Path.join(dir, renameToName);
					fullPath = fullPathRENAMED;
					console.log('fullPath moded due to renameToRename, its is now:', fullPath);
				}
				needToCreate = true;
			}
			
			if (cObj.updateIfDiff) {
				if (cObj.exists) {
					// fetch current values on shortcut of what devuser wnats to set in obj
					var cPreExisting = {}; // holds what is currently set on it, based on what was in cObj
					
					if ('icon' in cObj) {

						var pszIconPath = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
						var piIcon = ostypes.TYPE.INT();
						var hr_GetIconLocation = refs.shellLink.GetIconLocation(refs.shellLinkPtr, pszIconPath/*.address()*/, OS.Constants.Win.MAX_PATH, piIcon.address());
						ostypes.HELPER.checkHRESULT(hr_GetIconLocation);
						cPreExisting.icon = cutils.readAsChar8ThenAsChar16(pszIconPath);
						console.info('updateIfDiff icon check yielded:', pszIconPath.readString());

						/* // i dont check for diff in iconIndex yet
						if ('iconIndex' in cObj) {
							cPreExisting.iconIndex = piIcon.value;
						}
						*/
					}
					
					if ('targetFile' in cObj) {
						var pszFile = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
						var fFlags = ostypes.CONST.SLGP_RAWPATH;
						var hr_GetPath = refs.shellLink.GetPath(refs.shellLinkPtr, pszFile/*.address()*/, OS.Constants.Win.MAX_PATH, null, fFlags);
						ostypes.HELPER.checkHRESULT(hr_GetIconLocation);
						cPreExisting.targetFile = cutils.readAsChar8ThenAsChar16(pszFile).toLowerCase();
					}
					
					if ('args' in cObj) {
						var pszArgs = ostypes.TYPE.LPTSTR.targetType.array(ostypes.CONST.INFOTIPSIZE)();
						var hr_GetArguments = refs.shellLink.GetArguments(refs.shellLinkPtr, pszArgs/*.address()*/, ostypes.CONST.INFOTIPSIZE);
						ostypes.HELPER.checkHRESULT(hr_GetArguments);
						cPreExisting.args = cutils.readAsChar8ThenAsChar16(pszArgs).toLowerCase();
					}
					/* link787845
					if ('appUserModelId' in cObj) {
						cPreExisting.appUserModelId = IPropertyStore_GetValue(refs.propertyStorePtr, refs.propertyStore, ostypes.CONST.PKEY_AppUserModel_ID.address(), null);
					}
					*/
					if ('appUserModelId' in cPreExisting && cPreExisting.appUserModelId != cObj.appUserModelId) {
						// start copy block link65484651
						// delete currently existing one and mark for needToCreate as cannot update appUserModelid of existing shortcut: http://stackoverflow.com/questions/28246057/ipropertystore-change-system-appusermodel-id-of-existing-shortcut
						var rez_delete = OS.File.remove(fullPath);
						console.log('as have to update appUserModelId have to delete, so now setting exists to false, but no one after this block uses it so i really dont have to');
						cObj.exists = false;
						needToCreate = true;
						// end copy block link65484651
					} else {
						delete cObj.appUserModelId; // can delete these as i know they match based on if of this else
						delete cPreExisting.appUserModelId;
						for (var cP in cPreExisting) {
							if (cPreExisting[cP] == cObj[cP]) {
								console.log('will not update ' + cP + ' because preexisting value matches what devuser set value');
								delete cObj[cP];
								delete cPreExisting[cP];
							}
						}
						var somethingToUpdate = false;
						for (var cP in cPreExisting) {
							somethingToUpdate = true;
							break;
						}
						if (!somethingToUpdate) {
							// no need to update this thing at all so go to next cObj
							continue;
						}
					}
				} // else it doenst exist so its going to write it, so obviously everything is different
			} else {
				if (cObj.exists) {
					if ('appUserModelId' in cObj) {
						// so user is not wanting to updateIfDiff, lets check if it prexists, if it does then we have to delete, then recreate shortcut, as we cannot change appUserModelId on existing shortcut: http://stackoverflow.com/questions/28246057/ipropertystore-change-system-appusermodel-id-of-existing-shortcut
						// start copy block link65484651
						// delete currently existing one and mark for needToCreate as cannot update appUserModelid of existing shortcut: http://stackoverflow.com/questions/28246057/ipropertystore-change-system-appusermodel-id-of-existing-shortcut
						var rez_delete = OS.File.remove(fullPath);
						console.log('as have to update appUserModelId have to delete, so now setting exists to false, but no one after this block uses it so i really dont have to');
						cObj.exists = false;
						needToCreate = true;
						// end copy block link65484651
					}
				} // else it doenst exist so its going to write it, so obviously everything is different
			}
			
			if (needToCreate && !('targetFile' in cObj)) { // when creating, the minimum needed is a targetFile (and of course fullPath)
				throw new Error('for obj ' + i + ' it was found it needs to create the shortcut HOWEVER a targetFile was not provided! provide one!');
			}
			
			// ok start the set to the devuser settings in cObj
			if ('targetFile' in cObj) {
				var hr_SetPath = refs.shellLink.SetPath(refs.shellLinkPtr, cObj.targetFile);
				ostypes.HELPER.checkHRESULT(hr_SetPath, 'SetPath');
			}

			if ('workDir' in cObj) {
				var hr_SetWorkingDirectory = refs.shellLink.SetWorkingDirectory(refs.shellLinkPtr, cObj.workDir);
				ostypes.HELPER.checkHRESULT(hr, 'SetWorkingDirectory');
			}

			if ('args' in cObj) {
				var hr_SetArguments = refs.shellLink.SetArguments(refs.shellLinkPtr, cObj.args);
				ostypes.HELPER.checkHRESULT(hr_SetArguments, 'SetArguments');
			}

			if ('desc' in cObj) {
				var hr_SetDescription = refs.shellLink.SetDescription(refs.shellLinkPtr, cObj.desc);
				ostypes.HELPER.checkHRESULT(hr_SetDescription, 'SetDescription');
			}

			if ('icon' in cObj) {
				var hr_SetIconLocation = refs.shellLink.SetIconLocation(refs.shellLinkPtr, cObj.icon, 'iconIndex' in cObj ? cObj.iconIndex : 0);
				ostypes.HELPER.checkHRESULT(hr_SetIconLocation, 'SetIconLocation');
			}

			if (!cObj.exists) { // this logic is link787845, the contents within is not linked to link787845 so if remove this just remove the if logic and curly, the content within should remain
				if ('appUserModelId' in cObj) {
					var hr_appUserModelId = ostypes.HELPER.IPropertyStore_SetValue(refs.propertyStorePtr, refs.propertyStore, ostypes.CONST.PKEY_AppUserModel_ID.address(), cObj.appUserModelId);
					ostypes.HELPER.checkHRESULT(hr_appUserModelId, 'hr_appUserModelId');
					
					//var jsstr_IPSGetValue = ostypes.HELPER.IPropertyStore_GetValue(refs.propertyStorePtr, refs.propertyStore, ostypes.CONST.PKEY_AppUserModel_ID.address(), null);
					//console.info('jsstr_IPSGetValue:', jsstr_IPSGetValue.toString(), uneval(jsstr_IPSGetValue));
				}
			}
			
			var hr_Save = refs.persistFile.Save(refs.persistFilePtr, fullPath, false);
			//console.info('hr_Save:', hr_Save.toString(), uneval(hr_Save));
			ostypes.HELPER.checkHRESULT(hr_Save, 'Save');
			
			console.log('Shortcut succesfully saved on fullPath:', fullPath);
			// ok end set the settings
			
			if ('refreshIcon' in cObj && 'icon' in cObj) { // `'icon' in cObj` means that icon was updated
				if (cObj.refreshIcon == 1) {
					refreshAtPath.push(fullPath);
				} else if (cObj.refreshIcon == 2) {
					refreshAllIconNeeded = true;
				}
			}

		}
		
		if (refreshAllIconNeeded) {
			refreshIconAtPath(); // pass null arg to get all icons to refresh
			// dont care if any of the cObj's requested path refresh, as refresh whole cache was done so it will get all of those
		} else {
			// as not refreshing whole icon cache, check if any paths requested refresh and if they did then refresh them
			if (refreshAtPath.length > 0) {
				for (var i=0; i<refreshAtPath.length; i++) {
					refreshIconAtPath(refreshAtPath[i]);
				}
			}
		}
		
		return true;
	};
	return winntShellFile_DoerAndFinalizer(doer, refs);
}

function queryProfileLocked(IsRelative, Path, path_DefProfRt) {
	// IsRelative is the value from profiles.ini for the profile you want to target
	// Path is the value from profiles.ini for the profile you want to target
	// path_DefProfRt is Services.dirsvc.get('DefProfRt', Ci.nsIFile).path - ChromeWorker's don't have access to it so has to be passed in

	var rezMain; // jsInt
	
	if (IsRelative == '1') {
		var cProfileDirName = OS.Path.basename(OS.Path.normalize(Path));
		var path_cProfRootDir = OS.Path.join(path_DefProfRt, cProfileDirName);
	} else {
		var path_cProfRootDir = Path;
	}
	
	//note: im missing vms: http://mxr.mozilla.org/mozilla-release/source/profile/dirserviceprovider/src/nsProfileLock.cpp#581
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// returns
					// if LOCKED - 1
					// if NOT locked - 0
				
				var path_lock = OS.Path.join(path_cProfRootDir, 'parent.lock');
				try {
					var aOSFile = OS.File.open(path_lock);
					// didnt error as got to this line, so its NOT locked
					rezMain = 0;
					aOSFile.close();
				} catch (ex) {
					if (ex.winLastError == ostypes.CONST.ERROR_SHARING_VIOLATION) {
						//its locked
						rezMain = 1;
					} else if (ex.winLastError == ostypes.CONST.ERROR_FILE_NOT_FOUND) {
						rezMain = 0; // if it doesnt exist, this is very likely due to it being an unlaunched profile so return that it is unlocked //:todo: do equivalent for fnctl for nix/mac
					} else if (ex.winLastError == ostypes.CONST.ERROR_PATH_NOT_FOUND) {
						rezMain = 0; // path not even there, this is weird shouldnt happen, but if its not there obviously the profile doesnt exist so nothing in use so just return 0
					} else {
						console.error('ex:', ex);
						throw new Error('Could not open profile lock file and it was NOT locked. Path of lock file: "' + path_lock + '" ex: "' + ex + '"');
					}
				}
			
			break;
		case 'linux':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
		case 'webos':
		case 'android':
		
				// returns
					// if LOCKED - jsInt > 0 which is the PID
					// if NOT locked - 0 if NOT locked, otherwise 
				
				var path_lock = OS.Path.join(path_cProfRootDir, '.parentlock');
				var path_lock_sym = OS.Path.join(path_cProfRootDir, 'lock');
				
			break;
		case 'darwin':
		
				// returns
					// if LOCKED - jsInt > 0 which is the PID
					// if NOT locked - 0 if NOT locked, otherwise 
				
				var path_lock = OS.Path.join(path_cProfRootDir, '.parentlock');
				// var path_lock_sym = OS.Path.join(path_cProfRootDir, 'lock'); // do macs have symlink'ed lock?
				
			break;
		default:
			throw new Error('os-unsupported');
	}
	
	return rezMain;
}

function makeAlias(path_create, path_target) {
	console.error('in makeAlias:', 'path_create:', path_create, 'path_target:', path_target);
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
				
				var rez_CreateHardLink = ostypes.API('CreateHardLink')(path_create, path_target, null);
				console.info('rez_CreateHardLink:', rez_CreateHardLink.toString(), uneval(rez_CreateHardLink));
				if (ctypes.winLastError != 0) {
					if (ctypes.winLastError == ostypes.CONST.ERROR_ALREADY_EXISTS) {
						// it already exists so it was already made so just return true
						console.log('CreateHardLink got winLastError for already existing, its rez was:', rez_CreateHardLink, 'but lets return true as if hard link was already made then no need to make again, all hardlinks update right away to match all from what it is hard linekd to');
						return true;
					}
					console.error('Failed rez_CreateHardLink, winLastError:', ctypes.winLastError);
					throw new Error('Failed rez_CreateHardLink, winLastError:', ctypes.winLastError);
				}
				return rez_CreateHardLink;
			
			break;
		case 'linux':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
		case 'webos':
		case 'android':
		case 'darwin':
		
				// if alread exists it throws with ctypes.unixErrno 17
				var rez_unixSymLink = OS.File.unixSymLink(path_target, path_create);
				return rez_unixSymLink;
				
			break;
		default:
			throw new Error('os-unsupported');
	}	
}

function removeWmSetIcons_thenSetLong(contents_JSON, fullPathToFile, mostRecWinHwndPtrStr) {
	// WINNT only
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				for (var i=0; i<contents_JSON.hwndPtrStrsAppliedTo.length; i++) {
					var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(contents_JSON.hwndPtrStrsAppliedTo[i]));
					
					// may need to check if window is open first
					
					// remove the icon
					var oldBigIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, 0);
					console.info('oldBigIcon:', oldBigIcon.toString(), uneval(oldBigIcon));
					if (ctypes.winLastError != 0) { console.error('Failed oldBigIcon, winLastError:', ctypes.winLastError); }
					
					// remove the icon
					var oldSmallIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, 0);
					console.info('oldSmallIcon:', oldSmallIcon.toString(), uneval(oldSmallIcon));
					if (ctypes.winLastError != 0) { console.error('Failed oldSmallIcon, winLastError:', ctypes.winLastError); }
				}
				
				// actually scratch this comment, i have to use a hwnd of a visible window otherwise it behaves weirdly, it sometimes gives winLastError 6 which is INVALID_HANDLE or gives 0 but doesnt update // will use the last cHwnd from the for loop here
				cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(mostRecWinHwndPtrStr));
				
				/*
				// set back with long
				var hIconBig_LONG_PTR = ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR(ctypes.Int64(contents_JSON.lastAppliedIcon_LRESULT.big)) : ostypes.TYPE.LONG(ctypes.Int64(contents_JSON.lastAppliedIcon_LRESULT.big));
				var hIconSmall_LONG_PTR = ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR(ctypes.Int64(contents_JSON.lastAppliedIcon_LRESULT.sm)) : ostypes.TYPE.LONG(ctypes.Int64(contents_JSON.lastAppliedIcon_LRESULT.sm));
				*/
				// actually scrap the set back with long, i have to set back by LoadImage again otherwise if the profile the icon was applied from is closed, it will mem release the icon, even if use LR_SHARED as its cross process
				if (core.os.version_name == 'xp') { // if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
					// winxp
					var bigSize = 32;
				} else {
					var bigSize = 256;
				}
				var hIconBig_HANDLE = ostypes.API('LoadImage')(null, contents_JSON.lastAppliedIconPath, ostypes.CONST.IMAGE_ICON, bigSize, bigSize, ostypes.CONST.LR_LOADFROMFILE);
				var hIconSmall_HANDLE = ostypes.API('LoadImage')(null, contents_JSON.lastAppliedIconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE);
				
				var hIconBig_LONG_PTR = ctypes.cast(hIconBig_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
				var hIconSmall_LONG_PTR = ctypes.cast(hIconSmall_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
							
				console.info('hIconBig_LONG_PTR:', cutils.jscGetDeepest(hIconBig_LONG_PTR), hIconBig_LONG_PTR.toString(), uneval(hIconBig_LONG_PTR));
				console.info('hIconSmall_LONG_PTR:', cutils.jscGetDeepest(hIconSmall_LONG_PTR), hIconSmall_LONG_PTR.toString(), uneval(hIconSmall_LONG_PTR));
				
				var oldBigIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICON, hIconBig_LONG_PTR);			
				console.info('winLastError:', ctypes.winLastError);
				if (cutils.jscEqual(oldBigIcon, 0)) {
					//console.log('Got 0 for oldBigIcon, this does not mean that bigIcon did not apply, it just means that there was no PREVIOUS big icon');
					if (ctypes.winLastError != 0) {
						console.error('Failed to apply BIG icon with setClassLong, winLastError:', ctypes.winLastError);
					}
				}
				
				var oldSmallIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICONSM, hIconSmall_LONG_PTR);
				console.info('winLastError:', ctypes.winLastError);
				if (cutils.jscEqual(oldSmallIcon, 0)) {
					//console.log('Got 0 for oldSmallIcon, this does not mean that smallIcon did not apply, it just means that there was no PREVIOUS small icon');
					if (ctypes.winLastError != 0) {
						console.error('Failed to apply SMALL icon with setClassLong, winLastError:', ctypes.winLastError);
					}
				}
				
				// delete the fullFilePathToWM_SETICON
				OS.File.remove(fullPathToFile);
			
			break;
		default:
			throw new Error(['os-unsupported', OS.Constants.Sys.Name]);
	}
}

function changeIconForAllWindows(iconPath, arrWinHandlePtrStrs, winntPathToWatchedFile) {
	// arrWinHandlePtrStrs is an array of strings of window pointers, https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Finding_Window_Handles#OS_Specific_Examples_Using_nsIBaseWindow_-%3E_nativeHandle
	// iconPath is an os path
	// winHandlePtrStrs should be passed in as array of arguments, requires at least 1
	/*
	if (arguments.length < 2) {
		throw new Error('Must provide at least one winHandlePtrStr in arguments');
	}
	var arrWinHandlePtrStrs = [];
	for (var i=1; i<arguments.length; i++) {
		arrWinHandlePtrStrs.push(arguments[i]);
	}
	*/
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// mark samePid to true if targeting update same profile this is script is running from
					// arrWinHandlePtrStrs, just needs to be a single element
				// else if false, it will update all windows icons with WM_SETICON, write to file the handle of the newBigIcon and newSmIcon
					// the WM_GETICON of it is null change icon (as first apply to window)
					// if its not null, check to see if file object has this hwnd. if it does and the WM_GETICON handle matches wats in the file, then do WM_SETICON on it, and update file that its last icon handle was the newBigIcon and newSmIcon
					// written to file obj look like this: {lastAppliedIconHandle: {big: '0x65454', sm: '0x698798'}, hwndsAppliedTo: ['0x554', '0x5054', ...]
				// returns
					// if LOCKED - 1
					// if NOT locked - 0
				
				console.log('iconPath: ' + iconPath);
				console.log('arrWinHandlePtrStrs: ' + arrWinHandlePtrStrs.toString());
				
				if (core.os.version_name == 'xp') { // if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
					// winxp
					var bigSize = 32;
				} else {
					var bigSize = 256;
				}
				var hIconBig_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, bigSize, bigSize, ostypes.CONST.LR_LOADFROMFILE);
				var hIconSmall_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE);
				// LoadImage was returning null because i had declared LoadImageA but then i defeined LPCTSTR as ctypes.jschar. i had to use LoadImageW to use with ctypes.jschar. I didnt test but i guess to use with LoadImageA you have to use ctypes.char
				
				// todo: ask if LoadImage is really taking the right size from the the ico CONTAINER, as im supplying containers
				
				console.info('hIconBig_HANDLE:', hIconBig_HANDLE, hIconBig_HANDLE.toString(), uneval(hIconBig_HANDLE));
				console.info('hIconSmall_HANDLE:', hIconSmall_HANDLE, hIconSmall_HANDLE.toString(), uneval(hIconSmall_HANDLE));
				
				console.info('cutils.jscGetDeepest(hIconBig_HANDLE):', cutils.jscGetDeepest(hIconBig_HANDLE), cutils.jscGetDeepest(hIconBig_HANDLE).toString(), uneval(cutils.jscGetDeepest(hIconBig_HANDLE)));
				console.info('cutils.jscGetDeepest(hIconSmall_HANDLE):', cutils.jscGetDeepest(hIconSmall_HANDLE), cutils.jscGetDeepest(hIconSmall_HANDLE).toString(), uneval(cutils.jscGetDeepest(hIconSmall_HANDLE)));
				
				if (hIconBig_HANDLE.isNull()) {
					throw new Error('Failed to LoadImage of BIG icon at path: ' + iconPath);
				}
				if (hIconSmall_HANDLE.isNull()) {
					throw new Error('Failed to LoadImage of SMALL icon at path: ' + iconPath);
				}

				if (cutils.jscEqual(hIconSmall_HANDLE, hIconBig_HANDLE)) {
					console.error('WARNING hIconSmall_HANDLE and hIconBig_HANDLE are equal');
				} else {
					console.log('good to go hIconSmall_HANDLE and hIconBig_HANDLE are NOT equal');
				}
				
				var cHwnd;
				if (!winntPathToWatchedFile) {
					// update icon to pid that owns this thread
					// i noticed with SetClassLong/Ptr changing the icon when it changes in taskbar(unpinned) then the on hover color change which is based on the dominant color of the icon doesnt take after applying it once, maybe i need to destroy the old icon or something
					var hIconBig_LONG_PTR = ctypes.cast(hIconBig_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
					var hIconSmall_LONG_PTR = ctypes.cast(hIconSmall_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
					
					console.info('hIconBig_LONG_PTR:', hIconBig_LONG_PTR, hIconBig_LONG_PTR.toString(), uneval(hIconBig_LONG_PTR));
					console.info('hIconSmall_LONG_PTR:', hIconSmall_LONG_PTR, hIconSmall_LONG_PTR.toString(), uneval(hIconSmall_LONG_PTR));
					
					cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(arrWinHandlePtrStrs[0]));
					var oldBigIcon = ostypes.API('SetClassLong')(cHwnd/*ostypes.TYPE.HWND(ctypes.UInt64('0x310b38'))*/, ostypes.CONST.GCLP_HICON, hIconBig_LONG_PTR);
					if (cutils.jscEqual(oldBigIcon, 0)) {
						//console.log('Got 0 for oldBigIcon, this does not mean that bigIcon did not apply, it just means that there was no PREVIOUS big icon');
						if (ctypes.winLastError != 0) {
							console.error('Failed to apply BIG icon with setClassLong, winLastError:', ctypes.winLastError);
						}
					}
					
					// tested and verified with the ostypes.TYPE.HWND(ctypes.UInt64('0x310b38')) above, that if oldBigIcon causes winLastError to go to non-0, then if oldSmallIcon call succeeds, winLastError is set back to 0
					var oldSmallIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICONSM, hIconSmall_LONG_PTR);
					if (cutils.jscEqual(oldSmallIcon, 0)) {
						//console.log('Got 0 for oldSmallIcon, this does not mean that smallIcon did not apply, it just means that there was no PREVIOUS small icon');
						if (ctypes.winLastError != 0) {
							console.error('Failed to apply SMALL icon with setClassLong, winLastError:', ctypes.winLastError);
						}
					}
					// getting ERROR_ACCESS_DENIED (ctypes.winLastError == 5) when trying to setClassLongPtr on other process
						// possible work around:
							// https://social.msdn.microsoft.com/Forums/vstudio/en-US/25b8e6e4-d5bd-4541-8fa8-9df8f7af4206/moving-a-non-mine-window?forum=vclanguage
							// http://www.codeproject.com/Articles/4610/Three-Ways-to-Inject-Your-Code-into-Another-Proces
					
					/*
					// todo: check if i need to destroy/release these icons, and when
					var rez_destroyBig = ostypes.API('DestroyIcon')(hIconBig_HANDLE);
					var rez_destroySmall = ostypes.API('DestroyIcon')(hIconSmall_HANDLE);
					
					console.log('rez_destroyBig: ' + rez_destroyBig.toString());
					console.log('rez_destroySmall: ' + rez_destroySmall.toString());
					*/
				} else {
					// update icon to pid that does not own this PromiseWorker thread
					
					try {
						var winntChangedIconForeignPID_JSON = JSON.parse(read_encoded(winntPathToWatchedFile.fullPathToFile, {encoding:'utf-8'}));
						winntChangedIconForeignPID_JSON.hwndPtrStrsAppliedTo = []; // clear the applied to array as this is only used by on activate of the window of ff profile that has profilist installed, it goes through these hwnd and if they still exist it removes the WM_SETICON so it can make the SetClassLong icon show through. it also does SetClassLong so to handle future opened windows
					} catch (aReason if aReason.becauseNoSuchFile) {
						// file not existing is ok
						console.log('making object');
						var winntChangedIconForeignPID_JSON = {
							lastAppliedIcon_LRESULT: { // LRESULT and LPARAM are both LONG_PTR, this is used if user makes a 2nd or more change, so then it wont think that all icons are WM_ICONSET
								big: null,
								sm: null
							},
							hwndPtrStrsAppliedTo: []
						};
						console.info('winntChangedIconForeignPID_JSON:', JSON.stringify(winntChangedIconForeignPID_JSON));
					}
					
					var hIconBig_LPARAM = ctypes.cast(hIconBig_HANDLE, ostypes.TYPE.LPARAM);
					console.info('hIconBig_LPARAM:', hIconBig_LPARAM, hIconBig_LPARAM.toString(), uneval(hIconBig_LPARAM));
					
					var hIconSmall_LPARAM = ctypes.cast(hIconSmall_HANDLE, ostypes.TYPE.LPARAM);
					console.info('hIconSmall_LPARAM:', hIconSmall_LPARAM, hIconSmall_LPARAM.toString(), uneval(hIconSmall_LPARAM));
					
					for (var i=0; i<arrWinHandlePtrStrs.length; i++) {
							cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(arrWinHandlePtrStrs[i]));
							var curBigIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_BIG, 0);
							console.info('curBigIcon_LRESULT:', curBigIcon_LRESULT, curBigIcon_LRESULT.toString(), uneval(curBigIcon_LRESULT));
							if (ctypes.winLastError != 0) { console.error('Failed curBigIcon_LRESULT, winLastError:', ctypes.winLastError); continue; }
							
							//var curBigIcon_HANDLE = ostypes.TYPE.HANDLE(curBigIcon_LRESULT); //ctypes.cast(curBigIcon, ostypes.TYPE.HANDLE);
							//console.info('curBigIcon_HANDLE:', curBigIcon_HANDLE, curBigIcon_HANDLE.toString(), uneval(curBigIcon_HANDLE));
							// see study here on HANDLE an LRESULT of the icons are same reardless of PID accessed from: https://gist.github.com/Noitidart/35d0cd738830c9c2f417#comment-1419624
							
							/*
							var curSmallIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_SMALL, 0);
							console.info('curSmallIcon_LRESULT:', curSmallIcon_LRESULT, curSmallIcon_LRESULT.toString(), uneval(curSmallIcon_LRESULT));
							if (ctypes.winLastError != 0) { console.error('Failed curSmallIcon_LRESULT, winLastError:', ctypes.winLastError) }
							*/
							// im just testin ICON_BIG as it seems everything has that, and not always a small. so on my win81 testin, it looks like if has ICON_BIG it has ICON_SMALL, but sometimes it just has ICON_BIG but no ICON_SMALL. I have never seen a has ICON_SMALL and does not have ICON_BIG yet, but it may be a case so then if i find that true just uncomment the curSmallIcon_LRESULT check in if below and block above
							
							if ((cutils.jscEqual(curBigIcon_LRESULT, 0)/* && cutils.jscEqual(curSmallIcon_LRESULT, 0)*/) || (winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big && cutils.jscEqual(curBigIcon_LRESULT, winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big))) {
								// apply icon here as it doesnt have a WM_SETICON on it, so like is not DOM Inspector or ChatZilla
								winntChangedIconForeignPID_JSON.hwndPtrStrsAppliedTo.push(arrWinHandlePtrStrs[i]);
								
								var oldBigIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, hIconBig_LPARAM);
								console.info('oldBigIcon:', oldBigIcon.toString(), uneval(oldBigIcon));
								if (ctypes.winLastError != 0) { console.error('Failed oldBigIcon, winLastError:', ctypes.winLastError); }
								
								var oldSmallIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, hIconSmall_LPARAM);
								console.info('oldSmallIcon:', oldSmallIcon.toString(), uneval(oldSmallIcon));
								if (ctypes.winLastError != 0) { console.error('Failed oldSmallIcon, winLastError:', ctypes.winLastError); }
								// SendMessage //if it was success it will return 0? im not sure. on first time running it, and it was succesful it returns 0 for some reason
								
								//// testing if pinned icon changes per: 
								// var gwOwner_HWND = ostypes.API('GetWindow')(cHwnd, ostypes.CONST.GW_OWNER);
								// console.info('gwOwner_HWND:', gwOwner_HWND.toString(), uneval(gwOwner_HWND));
								// if (ctypes.winLastError != 0) { console.error('Failed gwOwner_HWND, winLastError:', ctypes.winLastError); }

								// console.log(['gwOwner_HWND: ', gwOwner_HWND, gwOwner_HWND.toString()].join(' '));
								
								// var successBigGwowner = ostypes.API('SendMessage')(gwOwner_HWND, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, hIconBig_LPARAM);
								// var successSmallGwowner = ostypes.API('SendMessage')(gwOwner_HWND, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, hIconSmall_LPARAM);			
								// console.log(['successBigGwowner: ', successBigGwowner, successBigGwowner.toString()].join(' '));
								// console.log(['successSmallGwowner: ', successSmallGwowner, successSmallGwowner.toString()].join(' '));
							}
					}
					if (winntChangedIconForeignPID_JSON.hwndPtrStrsAppliedTo.length > 0) {
						// write to disk
						console.log('will now write to disk');
						winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big = cutils.jscGetDeepest(hIconBig_LPARAM);
						winntChangedIconForeignPID_JSON.lastAppliedIconPath = iconPath;
						console.log('did jscGD on hIconBig_LPARAM and came out with:', winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big);
						winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.sm = cutils.jscGetDeepest(hIconSmall_LPARAM);
						tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [winntPathToWatchedFile.fullPathToFile, JSON.stringify(winntChangedIconForeignPID_JSON), {encoding:'utf-8', tmpPath:winntPathToWatchedFile.fullPathToFile+'.tmp'}], winntPathToWatchedFile.fromDir);
					}
				}
				
				//console.log('OSVersion:', parseFloat(core.OSVersion), core.OSVersion);
				if (core.os.version_name == '7+') {
					console.log('win7+');
					// win7+
					if (!ostypes.CONST.IID_IPropertyStore) {
						console.log('defining IPropertyStore CONSTs');
						ostypes.CONST.IID_IPropertyStore = ostypes.HELPER.CLSIDFromString('886d8eeb-8cf2-4446-8d02-cdba1dbdcf99');
						//console.info('IID_IPropertyStore:', ostypes.CONST.IID_IPropertyStore.toString());
						
						// this test vaidates that the js version o ostypes.HELPER.CLSIDFromString matches and works fine
						// var aIID_IPropertyStore = ostypes.TYPE.GUID();
						// var hr_CLSIDFromString_IIDIPropertyStore = ostypes.API('CLSIDFromString')('{886d8eeb-8cf2-4446-8d02-cdba1dbdcf99}', aIID_IPropertyStore.address());
						// ostypes.HELPER.checkHRESULT(hr_CLSIDFromString_IIDIPropertyStore, 'CLSIDFromString (IID_IPropertyStore)');
						// console.info('hresult passed fine, aIID_IPropertyStore2:', aIID_IPropertyStore.toString());
										
						var fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource = ostypes.HELPER.CLSIDFromString('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3');
						//console.info('fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource:', fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource.toString());
						
						ostypes.CONST.PKEY_AppUserModel_ID = ostypes.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 5); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391569%28v=vs.85%29.aspx
						ostypes.CONST.PKEY_AppUserModel_RelaunchCommand = ostypes.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 2);// guid and pid from: http://msdn.microsoft.com/en-us/library/dd391571%28v=vs.85%29.aspx
						ostypes.CONST.PKEY_AppUserModel_RelaunchDisplayNameResource = ostypes.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 4); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391572%28v=vs.85%29.aspx
						ostypes.CONST.PKEY_AppUserModel_RelaunchIconResource = ostypes.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 3); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391573%28v=vs.85%29.aspx
						//console.log('done defining IPropertyStore CONSTs');
					}
					
					for (var i=0; i<arrWinHandlePtrStrs.length; i++) {
						cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(arrWinHandlePtrStrs[i]));
						var ppsPtr = ostypes.TYPE.IPropertyStore.ptr();
						var hr_SHGetPropertyStoreForWindow = ostypes.API('SHGetPropertyStoreForWindow')(cHwnd, ostypes.CONST.IID_IPropertyStore.address(), ppsPtr.address());
						ostypes.HELPER.checkHRESULT(hr_SHGetPropertyStoreForWindow, 'SHGetPropertyStoreForWindow');
						
						var pps = ppsPtr.contents.lpVtbl.contents;
						try {
							//console.log('now setting on', arrWinHandlePtrStrs[i]);
							//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_ID.address(), 'Contoso.Scratch');
							//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchIconResource.address(), iconPath + ',-2'); // it works ine withou reource id, i actually am just guessing -2 is pointing to the 48x48 icon im no sure but whaever number i put after - it looks like is 48x48 so its weird but looking right
							//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchIconResource.address(), 'C:\\Users\\Vayeate\\AppData\\Roaming\\Mozilla\\Firefox\\profilist_data\\launcher_icons\\BADGE-ID_mdn__CHANNEL-REF_beta.ico,-6'); // it works ine withou reource id, i actually am just guessing -2 is pointing to the 48x48 icon im no sure but whaever number i put after - it looks like is 48x48 so its weird but looking right
							//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchDisplayNameResource.address(), '')
							//var hr_IPSSetValue = ostypes.HELPER.IPropertyStore_SetValue(ppsPtr, pps, ostypes.CONST.PKEY_AppUserModel_RelaunchCommand.address(), '');
							//console.log('done set on', arrWinHandlePtrStrs[i]);
							//ostypes.HELPER.checkHRESULT(hr_IPSSetValue, 'IPropertyStore_SetValue PKEY_AppUserModel_ID');
						} catch(ex) {
							console.error('ex caught when setting IPropertyStore:', ex);
							throw ex;
						} finally {
							pps.Release(ppsPtr);
						}
					}
					console.log('done win7+ proc');
				}

			break;
		case 'linux':
			// arrWinHandlePtrStrs needs all windows handles
			break;
		default:
			throw new Error('os-unsupported');
	}
	
}

function getPtrStrToWinOfProfObj(arrProfilePID, allWin, visWinOnly) {
	// returns object with key pid and value array of string ptrs
	
	// do not have duplicates in arrProfilePID, but it might not be so bad it might not cause issues, but dont be a fool see link02098604
	
	// have to use one of the profile PID obtaining methods before using this function (on nix/max can use queryProfileLocked) (windows has to use getPidForProfile)
	// dont be an idiot, dont run this function when not running, but if you do this it will go through everything and find no window and return null, but be smart, its much better perf to use the isRunning function (queryProfileLocked) first, especially on windows
	
	// resolves to string of ptr of window handle
		// if allWin is true then an array of all string of ptr of windows of the pid
	// if allWin is false, and visWinOnly is true
		// it will return the first found handle regardless of visibility, so it ingore visWinOnly
		// if allWin is true, then it returns array with strPtrs of only visible windows
	// aProfilePID should be jsInt
	
	var objProfilePID = {};
	for (var i=0; i<arrProfilePID.length; i++) {
		objProfilePID[arrProfilePID[i]] = [];
	}
	
	var objPidForWhichOneWinFound = {}; // used for if !allWin, to keep track of if i found a window for this pid already, and if all pids are in here, then return
	
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// find first window that has aProfilePID
				
				// https://gist.github.com/Noitidart/1f9d574451b8aaaef219#file-_ff-addon-snippet-winapi_getrunningpids-js-L47
				
				var PID = ostypes.TYPE.DWORD();
				
				var arrWinPtrStrs = [];
				var found = 0;
				var SearchPD = function(hwnd, lparam) {
					var rez_GWTPI = ostypes.API('GetWindowThreadProcessId')(hwnd, PID.address());
					//console.log(['PID.value: ', PID.value, PID.value == aProfilePID].join(' '));
					if (PID.value in objProfilePID) {
						found = true;
						if (!allWin) {
							if (PID.value in objPidForWhichOneWinFound) {
								return false; // already pushed first win into rezObj which is objProfilePID so dont care anymore to find more and obviously there are more PIDs to find for so continue enum
							}
						}
						
						if (visWinOnly) {
							// test if visible
							var hwndStyle = ostypes.API('GetWindowLongPtr')(hwnd, ostypes.CONST.GWL_STYLE);
							if (cutils.jscEqual(hwndStyle, 0)) {
								throw new Error('Failed to GetWindowLongPtr');
							}
							hwndStyle = parseInt(cutils.jscGetDeepest(hwndStyle));
							
							if ((hwndStyle & ostypes.CONST.WS_VISIBLE) && (hwndStyle & ostypes.CONST.WS_CAPTION)) {
								objProfilePID[PID.value].push(cutils.strOfPtr(hwnd));
								// block link54654554545
								if (!allWin) {
									// check if any other PIDs remain for which we need to find a win for
									if (Object.keys(objProfilePID).length == Object.keys(objProfilePID).length /*arrProfilePID.length*/) { // i use `Object.keys(objProfilePID).length` instead of `arrProfilePID.length` in case devuser is a fool and puts duplicates into arrProfilePID link02098604
										return true; // found all so stop enum
									}
								}
								// end block
							} else {
								// win not visible
							}
						} else {
							// i dont care if its vis or not
							objProfilePID[PID.value].push(cutils.strOfPtr(hwnd));
							
							// block link54654554545
							if (!allWin) {
								// check if any other PIDs remain for which we need to find a win for
								if (Object.keys(objProfilePID).length == Object.keys(objProfilePID).length /*arrProfilePID.length*/) { // i use `Object.keys(objProfilePID).length` instead of `arrProfilePID.length` in case devuser is a fool and puts duplicates into arrProfilePID link02098604
									return true; // found all so stop enum
								}
							}
							// end block
							
						}
						return false; // continue enum, the quitting of enum will be done by blocks of link54654554545
					} else {
						return true;
					}
				}
				var SearchPD_ptr = ostypes.TYPE.WNDENUMPROC.ptr(SearchPD);
				var wnd = ostypes.TYPE.LPARAM(0);
				var rez_EnuMWindows = ostypes.API('EnumWindows')(SearchPD_ptr, wnd);
				
				if (found) {
					console.info('found this:', objProfilePID);
					//var ancestor = ostypes.API('GetAncestor')(foundMatchingHwnd, ostypes.CONST.GA_PARENT);
					//console.info('ancestor:', ancestor.toString());
					//var ptrStr = ancestor.toString();
					//var ptrStr = ancestor.toString();
					//ptrStr = ptrStr.match(/.*"(.*?)"/)[1]; // aleternatively do: `ptrStr = '0x' + ctypes.cast(foundMatchingHwnd, ctypes.uintptr_t).value.toString(16)` this is `hwndToHexStr` from: https://github.com/foudfou/FireTray/blob/master/src/modules/winnt/FiretrayWin32.jsm#L52
					if (allWin) {
						return arrWinPtrStrs;
					} else {
						return arrWinPtrStrs[0];
					}
				} else {
					return 0;
				}
				return foundMatchingHwnd;
			
			break;
			
		default:
			throw new Error('os-unsupported');
	}
}

function getPtrStrToWinOfProf(aProfilePID, allWin, visWinOnly) {
	// have to use one of the profile PID obtaining methods before using this function (on nix/max can use queryProfileLocked) (windows has to use getPidForProfile)
	// dont be an idiot, dont run this function when not running, but if you do this it will go through everything and find no window and return null, but be smart, its much better perf to use the isRunning function (queryProfileLocked) first, especially on windows
	
	// resolves to string of ptr of window handle
		// if allWin is true then an array of all string of ptr of windows of the pid
	// if allWin is false, and visWinOnly is true
		// it will return the first found handle regardless of visibility, so it ingore visWinOnly
		// if allWin is true, then it returns array with strPtrs of only visible windows
	// aProfilePID should be jsInt
	
	console.log(['aProfilePID: ', aProfilePID, aProfilePID.toString()].join(' '));
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// find first window that has aProfilePID
				
				// https://gist.github.com/Noitidart/1f9d574451b8aaaef219#file-_ff-addon-snippet-winapi_getrunningpids-js-L47
				
				var PID = ostypes.TYPE.DWORD();
				
				var arrWinPtrStrs = [];
				var found = 0;
				var SearchPD = function(hwnd, lparam) {
					var rez_GWTPI = ostypes.API('GetWindowThreadProcessId')(hwnd, PID.address());
					//console.log(['PID.value: ', PID.value, PID.value == aProfilePID].join(' '));
					if (PID.value == aProfilePID) {
						found = true;
						if (visWinOnly) {
							// test if visible
							var hwndStyle = ostypes.API('GetWindowLongPtr')(hwnd, ostypes.CONST.GWL_STYLE);
							if (cutils.jscEqual(hwndStyle, 0)) {
								throw new Error('Failed to GetWindowLongPtr');
							}
							hwndStyle = parseInt(cutils.jscGetDeepest(hwndStyle));
							
							// debug block
							if ((hwndStyle & ostypes.CONST.WS_VISIBLE) && (hwndStyle & ostypes.CONST.WS_CAPTION)) {
								arrWinPtrStrs.push(cutils.strOfPtr(hwnd));
							} else {
								// win not visible
							}
						} else {
							// i dont care if its vis or not
							arrWinPtrStrs.push(cutils.strOfPtr(hwnd));
						}
						if (!allWin) {
							return false;
						} else {
							return true;
						}
					} else {
						return true;
					}
				}
				var SearchPD_ptr = ostypes.TYPE.WNDENUMPROC.ptr(SearchPD);
				var wnd = ostypes.TYPE.LPARAM(0);
				var rez_EnuMWindows = ostypes.API('EnumWindows')(SearchPD_ptr, wnd);
				
				if (found) {
					console.info('found this:', arrWinPtrStrs);
					//var ancestor = ostypes.API('GetAncestor')(foundMatchingHwnd, ostypes.CONST.GA_PARENT);
					//console.info('ancestor:', ancestor.toString());
					//var ptrStr = ancestor.toString();
					//var ptrStr = ancestor.toString();
					//ptrStr = ptrStr.match(/.*"(.*?)"/)[1]; // aleternatively do: `ptrStr = '0x' + ctypes.cast(foundMatchingHwnd, ctypes.uintptr_t).value.toString(16)` this is `hwndToHexStr` from: https://github.com/foudfou/FireTray/blob/master/src/modules/winnt/FiretrayWin32.jsm#L52
					if (allWin) {
						return arrWinPtrStrs;
					} else {
						return arrWinPtrStrs[0];
					}
				} else {
					return 0;
				}
				return foundMatchingHwnd;
			
			break;
			
		default:
			throw new Error('os-unsupported');
	}
}

function getPidForRunningProfile(IsRelative, Path, path_DefProfRt) {
	// todo: for nix/mac just redir to queryProfileLocked
	// todo: add in xp support
	
	// this function is for windows only, nix/mac should use queryProfileLocked (windows can use queryProfileLocked before this and its not a big deal for perf, as queryProfileLocked is a simple OS.File.open)
	// IsRelative is the value from profiles.ini for the profile you want to target
	// Path is the value from profiles.ini for the profile you want to target
	// path_DefProfRt is Services.dirsvc.get('DefProfRt', Ci.nsIFile).path - ChromeWorker's don't have access to it so has to be passed in
	
	// resolves to jsInt 0 if not running, resolves to jsStr > 0 if found
	var rezMain;
	if (IsRelative == '1') {
		var cProfileDirName = OS.Path.basename(OS.Path.normalize(Path));
		var path_cProfRootDir = OS.Path.join(path_DefProfRt, cProfileDirName);
	} else {
		var path_cProfRootDir = Path;
	}

	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
		
				// returns
					// if LOCKED - 1
					// if NOT locked - 0
				
				var path_lock = OS.Path.join(path_cProfRootDir, 'parent.lock');
				
				if (core.os.version_name == 'xp') {
					
				} else {
					// assuming its >winxp, i dont think ff29 installs on < winxp
					try { // using try-finally just for the finally
						var dwSession;
						rezMain = function() {
							// START SESSION
							dwSession = new ostypes.TYPE.DWORD();
							var szSessionKey = ostypes.TYPE.WCHAR.array(ostypes.CONST.CCH_RM_SESSION_KEY + 1)(); //this is a buffer
							cutils.memset(szSessionKey, '0', ostypes.CONST.CCH_RM_SESSION_KEY ); // remove + 1 as we want null terminated // can do memset(szSessionKey, ostypes.WCHAR('0'), ostypes.CCH_RM_SESSION_KEY + 1); // js-ctypes initializes at 0 filled: ctypes.char16_t.array(33)(["\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00"])"
							
							var rez_RmStartSession = ostypes.API('RmStartSession')(dwSession.address(), 0, szSessionKey);
							if (!cutils.jscEqual(rez_RmStartSession, ostypes.CONST.ERROR_SUCCESS)) {
								throw new Error('RmEndSession Failed with error code:' + rez_RmStartSession);
							}
							
							// REGISTER RESOURCES
							var jsStr_pszFilepath1 = path_lock; //path to file name
							var pszFilepath1 = ostypes.TYPE.WCHAR.array()(jsStr_pszFilepath1); //creates null terminated c string, null terminated string is required for RmRegisterResources
							//console.info('pszFilepath1:', pszFilepath1, pszFilepath1.toString(), uneval(pszFilepath1));
							
							var jsArr = [pszFilepath1];
							var pszFilepathsArr = ostypes.TYPE.PCWSTR.array(/*no need, but can have it*//*jsArr.length*/)(jsArr); // when 2 it is: [ctypes.char16_t.ptr(ctypes.UInt64("0x0")), ctypes.char16_t.ptr(ctypes.UInt64("0x0"))]
							//console.info('pszFilepathsArr:', pszFilepathsArr, pszFilepathsArr.toString(), uneval(pszFilepathsArr));
							
							var rez_RmRegisterResources = ostypes.API('RmRegisterResources')(dwSession, jsArr.length, pszFilepathsArr, 0, null, 0, null);
							//console.info('rez_RmRegisterResources:', rez_RmRegisterResources, rez_RmRegisterResources.toString(), uneval(rez_RmRegisterResources));
							
							if (!cutils.jscEqual(rez_RmRegisterResources, ostypes.CONST.ERROR_SUCCESS)) {
								throw new Error('RmRegisterResources Failed with error code:', rez_RmRegisterResources);
							}

							var nProcInfoNeeded = ostypes.TYPE.UINT(0); // 0 to fetch
							var rgpi = null;
							var nProcInfo = ostypes.TYPE.UINT(0); // this here is us telling how many array elements to fill, we initially provide null as rgpi so it has to be 0, otherwise it will probably crash asit will try to fill this number into null. after RmGetlist, it gets set to how many were actually filled
							var dwReason = ostypes.TYPE.DWORD(0);
							
							//console.info('INIT nProcInfoNeeded:', nProcInfoNeeded, nProcInfoNeeded.toString());
							//console.info('INIT nProcInfo:', nProcInfo, nProcInfo.toString());
							
							var rez_RmGetList_Query = ostypes.API('RmGetList')(dwSession, nProcInfoNeeded.address(), nProcInfo.address(), rgpi, dwReason.address());
							//console.info('rez_RmGetList_Query:', rez_RmGetList_Query, rez_RmGetList_Query.toString(), uneval(rez_RmGetList_Query));	
							if (cutils.jscEqual(rez_RmGetList_Query, ostypes.CONST.ERROR_SUCCESS)) {
								//console.log('RmGetList succeeded but there are no processes on this so return as I had capped it to 0, so it should return ERROR_MORE_DATA if there was more than 0, rez_RmGetList_Query:', rez_RmGetList_Query);
								return 0;
							} else if (!cutils.jscEqual(rez_RmGetList_Query, ostypes.CONST.ERROR_MORE_DATA)) {
								throw new Error('RmGetList failed, rez_RmGetList_Query:' + rez_RmGetList_Query);
							}
							
							//console.info('POST nProcInfoNeeded:', nProcInfoNeeded, nProcInfoNeeded.toString());
							//console.info('POST nProcInfo:', nProcInfo, nProcInfo.toString());
							//console.info('POST dwReason:', dwReason, dwReason.toString());
							
							rgpi = ostypes.TYPE.RM_PROCESS_INFO.array(nProcInfoNeeded.value)(); //alrady ptr so dont need to pass rgpi.ptr to RmGetList
							nProcInfo = ostypes.TYPE.UINT(rgpi.length);
							
							console.info('RE-INIT nProcInfo:', nProcInfo, nProcInfo.toString());
							
							var rez_RmGetList_Fetch = ostypes.API('RmGetList')(dwSession, nProcInfoNeeded.address(), nProcInfo.address(), rgpi, dwReason.address());
							console.info('rez_RmGetList_Fetch:', rez_RmGetList_Fetch, rez_RmGetList_Fetch.toString(), uneval(rez_RmGetList_Fetch));	
											
							if (!cutils.jscEqual(rez_RmGetList_Fetch, ostypes.CONST.ERROR_SUCCESS)) {
								if (cutils.jscEqual(rez_RmGetList_Fetch, ostypes.CONST.ERROR_MORE_DATA)) {
									//console.warn('RmGetList found that since last RmGetList there is now new/more processes available, so you can opt to run again but I dont need to as I want the first process which opened it, which should be Firefox profile');
								} else {
									throw new Error('RmGetList Failed with error code:' + rez_RmGetList_Fetch);
								}
							}
							
							//console.info('FINAL nProcInfoNeeded:', nProcInfoNeeded, nProcInfoNeeded.toString());
							//console.info('FINAL nProcInfo:', nProcInfo, nProcInfo.toString());
							//console.info('FINAL dwReason:', dwReason, dwReason.toString());
							//console.info('FINAL rgpi:', rgpi, rgpi.toString());
							
							rezMain = [];
							for (var i=0; i<rgpi.length; i++) {
								rezMain.push({
									pid: cutils.jscGetDeepest(rgpi[i].Process.dwProcessId),
									appName: cutils.readAsChar8ThenAsChar16(rgpi[i].strAppName),
									dwLowDateTime: parseInt(cutils.jscGetDeepest(rgpi[i].Process.ProcessStartTime.dwLowDateTime)),
									dwHighDateTime: parseInt(cutils.jscGetDeepest(rgpi[i].Process.ProcessStartTime.dwHighDateTime))
								});
								//console.log('PROCESS ' + i + ' DETAILS', 'PID:', rgpi[i].Process.dwProcessId, 'Application Name:', rgpi[i].strAppName.readStringReplaceMalformed());
							}
							
							if (rezMain.length > 1) {
								// really should never be greater then 1, but this is just a fallback
								rezMain.sort(function(a,b) {
									if (a.dwHighDateTime != b.dwHighDateTime) {
										return ctypes.UInt64.compare(a.dwHighDateTime, b.dwHighDateTime) > 0; // sort asc
									} else {
										return ctypes.UInt64.compare(a.dwLowDateTime, b.dwLowDateTime) > 0; // sort asc
									}
								});
							}
							
							return parseInt(rezMain[0].pid);
							// END SESSION // in finally so it will happen right after this line
						}();
					} /*catch(mainEx) { // if do catch it wont reject promise
						
					} */finally {
						if (dwSession && dwSession.value != 0) { // dwSession is new ostypes.DWORD so `if (dwSession)` will always be true, need to fix this here: https://gist.github.com/Noitidart/6203ba1b410b7bacaa82#file-_ff-addon-snippet-winapi_rstrtmgr-js-L234
							var rez_RmEndSession = ostypes.API('RmEndSession')(dwSession);
							console.info('rez_RmEndSession:', rez_RmEndSession, rez_RmEndSession.toString(), uneval(rez_RmEndSession));
							if (!cutils.jscEqual(rez_RmEndSession, ostypes.CONST.ERROR_SUCCESS)) {
								//console.error('RmEndSession Failed with error code:', rez_RmEndSession);
								console.log('failed to end session');
							} else {
								console.log('succesfully ended session');
							}
						} else {
							console.log('NO NEED to end session');
						}
						// with or without catch, the finally does run. without catch, it even rejects the promise. this is good and expected!!
					}
				}
			
			break;
		default:
			throw new Error('os-unsupported');
	}

	return rezMain;
	
}

function winnt_getInfoOnShortcuts(arrOSPath, aOptions) {
	// winnt only
	// returns an object key:values are:
		// win7+ only - SystemAppUserModelID - jsStr
		// target path
		// target args
		// icon path
	
	// aOptions:
		// cross-platform
			// getIconPath - default false.
		// winnt
			// winGetTargetPath - default false.
			// winGetArgs - default false.
	
	if (arrOSPath.length == 0) {
		return {};
	}
	
	var references = {
		//propertyStore: undefined // this tells winntShellFile_DoerAndFinalizer to get IPropertyStore interface
	}
	var doer = function() {
		var rezObj = {};
		
		for (var i=0; i<arrOSPath.length; i++) {
			
			//console.info('trying to load arrOSPath[i]:', arrOSPath[i]);
			var ext = arrOSPath[i].substr(-3);
			if (ext != 'lnk'/* && ext != 'exe'*/) { // cannot do this as IPersistFile::Load doesnt work on exe files, just lnk files from my experience
				console.log('skipping path as it is not a shortcut .lnk and Load will fail', arrOSPath[i]);
				continue;
			}
			
			rezObj[arrOSPath[i]] = {};
			
			var hr_Load = references.persistFile.Load(references.persistFilePtr, arrOSPath[i], 0);
			//console.info('hr_Load:', hr_Load.toString(), uneval(hr_Load));
			ostypes.HELPER.checkHRESULT(hr_Load, 'Load');
			
			// :todo: perf enhancement. consider setting in the updateIfDiff option, or add option updateIfArgHasProf so then i dont have to do findLaunchers then iterate again with COM to update launchers/createShortcuts
			
			// i dont use these from this yet
			if (aOptions.getIconPath) {
				var pszIconPath = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
				var piIcon = ostypes.TYPE.INT();
				var hr_GetIconLocation = references.shellLink.GetIconLocation(references.shellLinkPtr, pszIconPath/*.address()*/, OS.Constants.Win.MAX_PATH, piIcon.address());
				ostypes.HELPER.checkHRESULT(hr_GetIconLocation);
				rezObj[arrOSPath[i]].OSPath_icon = cutils.readAsChar8ThenAsChar16(pszIconPath);
			}
			
			if (aOptions.winGetTargetPath) {
				var pszFile = ostypes.TYPE.LPTSTR.targetType.array(OS.Constants.Win.MAX_PATH)();
				var fFlags = ostypes.CONST.SLGP_RAWPATH;
				var hr_GetPath = references.shellLink.GetPath(references.shellLinkPtr, pszFile/*.address()*/, OS.Constants.Win.MAX_PATH, null, fFlags);
				ostypes.HELPER.checkHRESULT(hr_GetIconLocation);
				rezObj[arrOSPath[i]].TargetPath = cutils.readAsChar8ThenAsChar16(pszFile).toLowerCase();
			}
			
			if (aOptions.winGetArgs) {
				var pszArgs = ostypes.TYPE.LPTSTR.targetType.array(ostypes.CONST.INFOTIPSIZE)();
				var hr_GetArguments = references.shellLink.GetArguments(references.shellLinkPtr, pszArgs/*.address()*/, ostypes.CONST.INFOTIPSIZE);
				ostypes.HELPER.checkHRESULT(hr_GetArguments);
				rezObj[arrOSPath[i]].TargetArgs = cutils.readAsChar8ThenAsChar16(pszArgs).toLowerCase();
			}
			// if (core.os.version_name == '7+') {
				// rezObj[arrOSPath[i]].SystemAppUserModelID = ostypes.HELPER.IPropertyStore_GetValue(references.propertyStorePtr, references.propertyStore, ostypes.CONST.PKEY_AppUserModel_ID.address(), null);
			// }
		}
		
		return rezObj;
	};
	return winntShellFile_DoerAndFinalizer(doer, references);
}

function winntShellFile_DoerAndFinalizer(funcDoer, refs) {
	// helper function for windows, so dont need to coy paste the shell, persistfile, and propertystore initialization everywhere
	// whatever is returned by funcDoer is returned by winntShellFile_DoerAndFinalizer
	try {
		var hr_CoInitializeEx = ostypes.API('CoInitializeEx')(null, ostypes.CONST.COINIT_APARTMENTTHREADED);
		console.info('hr_CoInitializeEx:', hr_CoInitializeEx, hr_CoInitializeEx.toString(), uneval(hr_CoInitializeEx));
		if (cutils.jscEqual(ostypes.CONST.S_OK, hr_CoInitializeEx) || cutils.jscEqual(ostypes.CONST.S_FALSE, hr_CoInitializeEx)) {
			//shouldUninitialize = true; // no need for this, as i always unit even if this returned false, as per the msdn docs
		} else {
			throw new Error('Unexpected return value from CoInitializeEx: ' + hr);
		}
		
		ostypes.HELPER.InitShellLinkAndPersistFileConsts();

		refs.shellLinkPtr = ostypes.TYPE.IShellLinkW.ptr();
		var hr_CoCreateInstance = ostypes.API('CoCreateInstance')(ostypes.CONST.CLSID_ShellLink.address(), null, ostypes.CONST.CLSCTX_INPROC_SERVER, ostypes.CONST.IID_IShellLink.address(), refs.shellLinkPtr.address());
		console.info('hr_CoCreateInstance:', hr_CoCreateInstance.toString(), uneval(hr_CoCreateInstance));
		ostypes.HELPER.checkHRESULT(hr_CoCreateInstance, 'CoCreateInstance');
		refs.shellLink = refs.shellLinkPtr.contents.lpVtbl.contents;

		
		refs.persistFilePtr = ostypes.TYPE.IPersistFile.ptr();
		var hr_shellLinkQI = refs.shellLink.QueryInterface(refs.shellLinkPtr, ostypes.CONST.IID_IPersistFile.address(), refs.persistFilePtr.address());
		console.info('hr_shellLinkQI:', hr_shellLinkQI.toString(), uneval(hr_shellLinkQI));
		ostypes.HELPER.checkHRESULT(hr_shellLinkQI, 'QueryInterface (IShellLink->IPersistFile)');
		refs.persistFile = refs.persistFilePtr.contents.lpVtbl.contents;

		if ('propertyStore' in refs) {
			ostypes.HELPER.InitPropStoreConsts();
			refs.propertyStorePtr = ostypes.TYPE.IPropertyStore.ptr();
			var hr_shellLinkQI2 = refs.shellLink.QueryInterface(refs.shellLinkPtr, ostypes.CONST.IID_IPropertyStore.address(), refs.propertyStorePtr.address());
			console.info('hr_shellLinkQI2:', hr_shellLinkQI2.toString(), uneval(hr_shellLinkQI2));
			ostypes.HELPER.checkHRESULT(hr_shellLinkQI2, 'QueryInterface (IShellLink->IPropertyStore)');
			refs.propertyStore = refs.propertyStorePtr.contents.lpVtbl.contents;
		}
		
		return funcDoer();
		
	} finally {
		console.log('doing winntShellFile_DoerAndFinalizer finalization');
		var sumThrowMsg = [];
		if (refs.persistFile) {
			try {
				refs.persistFile.Release(refs.persistFilePtr);
			} catch(e) {
				console.error("Failure releasing refs.persistFile: ", e.toString());
				sumThrowMsg.push(e.message);
			}
		}
		
		if (refs.propertyStore) {
			try {
				refs.propertyStore.Release(refs.propertyStorePtr);
			} catch(e) {
				console.error("Failure releasing refs.propertyStore: ", e.message.toString());
				sumThrowMsg.push(e.message);
			}
		}

		if (refs.shellLink) {
			try {
				refs.shellLink.Release(refs.shellLinkPtr);
			} catch(e) {
				console.error("Failure releasing refs.shellLink: ", e.message.toString());
				sumThrowMsg.push(e.message);
			}
		}
		
		//if (shouldUninitialize) { // should always CoUninit even if CoInit returned false, per the docs on msdn
			try {
				ostypes.API('CoUninitialize')(); // return void
			} catch(e) {
				console.error("Failure calling CoUninitialize: ", e.message.toString());
				sumThrowMsg.push(e.message);
			}
		//}
		
		if (sumThrowMsg.length > 0) {
			throw new Error(sumThrowMsg.join(' |||| '));
		}
		console.log('completed winntShellFile_DoerAndFinalizer finalization');
	}
}
// End - Addon Functionality

// START - Common
var txtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!txtDecodr) {
		txtDecodr = new TextDecoder();
	}
	return txtDecodr;
}
var txtEncodr; // holds TextDecoder if created
function getTxtEncodr() {
	if (!txtEncodr) {
		txtEncodr = new TextEncoder();
	}
	return txtEncodr;
}
function read_encoded(path, options) {
	// async version of read_encoded from bootstrap.js
	// because the options.encoding was introduced only in Fx30, this function enables previous Fx to use it
	// must pass encoding to options object, same syntax as OS.File.read >= Fx30
	// TextDecoder must have been imported with Cu.importGlobalProperties(['TextDecoder']);

	if (options && !('encoding' in options)) {
		throw new Error('Must pass encoding in options object, otherwise just use OS.File.read');
	}
	
	if (options && core.firefox.version < 30) { // tests if version is less then 30
		//var encoding = options.encoding; // looks like i dont need to pass encoding to TextDecoder, not sure though for non-utf-8 though
		delete options.encoding;
	}
	
	var aVal = OS.File.read(path, options);

	if (core.firefox.version < 30) { // tests if version is less then 30
		//console.info('decoded aVal', getTxtDecodr().decode(aVal));
		return getTxtDecodr().decode(aVal); // Convert this array to a text
	} else {
		//console.info('aVal', aVal);
		return aVal;
	}
}

function tryOsFile_ifDirsNoExistMakeThenRetry(nameOfOsFileFunc, argsOfOsFileFunc, fromDir, aOptions={}) {
	// last update 061215 0540p - to add support for aOptions.causesNeutering
	// aOptions
		// causesNeutering - default is false, if you use writeAtomic or another function and use an ArrayBuffer then set this to true, it will ensure directory exists first before trying. if it tries then fails the ArrayBuffer gets neutered and the retry will fail with "invalid arguments"
	// sync version of the one from bootstrap
	//argsOfOsFileFunc must be array
	
	if (['writeAtomic', 'copy', 'makeDir'].indexOf(nameOfOsFileFunc) == -1) {
		throw new Error('nameOfOsFileFunc of "' + nameOfOsFileFunc + '" is not supported');
	}
	
	
	// setup retry
	var retryIt = function() {
		//try {
			var promise_retryAttempt = OS.File[nameOfOsFileFunc].apply(OS.File, argsOfOsFileFunc);
			return 'tryOsFile succeeded after making dirs';
		//} catch (ex) {
			
		//}
		// no try so it throws if errors
	};
	
	// popToDir
	var toDir;
	var popToDir = function() {
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
				throw new Error('nameOfOsFileFunc of "' + nameOfOsFileFunc + '" is not supported');
		}
	};
	
	// setup recurse make dirs
	var makeDirs = function() {
		if (!toDir) {
			popToDir();
		}
		makeDir_Bug934283(toDir, {from: fromDir});
		return retryIt();
	};
	
	// do initial attempt
	var doInitialAttempt = function() {
		try {
			var promise_initialAttempt = OS.File[nameOfOsFileFunc].apply(OS.File, argsOfOsFileFunc);
			return 'initialAttempt succeeded'
		} catch (ex) {
			if (ex.becauseNoSuchFile) {
				console.log('make dirs then do secondAttempt');
				return makeDirs();
			}
		}
	}
	
	if (aOptions.causesNeutering) {
		// check exists first
		popToDir();
		var promise_firstCheckDirExists = OS.File.exists(toDir);
		if (promise_firstCheckDirExists) {
			//yes exists
			doInitialAttempt();
		} else {
			// make dirs first
			makeDirs();
		}
	} else {
		doInitialAttempt();
	}
	
}

function makeDir_Bug934283(path, options) {
	// sync version of one in bootstrap.js
	
	if (!options || !('from' in options)) {
		throw new Error('you have no need to use this, as this is meant to allow creation from a folder that you know for sure exists, you must provide options arg and the from key');
	}

	if (path.toLowerCase().indexOf(options.from.toLowerCase()) == -1) {
		throw new Error('The `from` string was not found in `path` string');
	}

	var options_from = options.from;
	delete options.from;

	var dirsToMake = OS.Path.split(path).components.slice(OS.Path.split(options_from).components.length);
	console.log('dirsToMake:', dirsToMake);

	var pathExistsForCertain = options_from;
	var makeDirRecurse = function() {
		pathExistsForCertain = OS.Path.join(pathExistsForCertain, dirsToMake[0]);
		dirsToMake.splice(0, 1);
		var promise_makeDir = OS.File.makeDir(pathExistsForCertain, options);
		if (dirsToMake.length > 0) {
			return makeDirRecurse();
		} else {
			return 'this path now exists for sure: "' + pathExistsForCertain + '"';
		}
	};
	return makeDirRecurse();
}
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

var _cache_HashStringHelper = {};
function HashStringHelper(aText) {
	if (!(aText in _cache_HashStringHelper)) {
		_cache_HashStringHelper[aText] = HashString(aText);
	}
	return _cache_HashStringHelper[aText];
}

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

function copyDir(aSrcDir, aTargetDir) {
	// in aTargetDir, the folder aSrcDir will be copied and pasted into
	// aTargetDir must exist
	
	var aSrcDirBasename = OS.Path.dirname(aSrcDir);
	var bl = aSrcDirBasename.length;
	var delegateCopy = function(aEntry, aDepth) {
		var relativeFromASrcDir = aEntry.path.substr(bl);
		var targetPath = aTargetDir + relativeFromASrcDir;
		console.info(aDepth, aEntry.path, targetPath);
		
		if (aEntry.isDir) {
			OS.File.makeDir(targetPath);
		} else {
			OS.File.copy(aEntry.path, targetPath);
		}
	}
	
	enumChildEntries(aSrcDir, delegateCopy, null, true); // null to max_depth so it gets all
	
	return true;
}

function copyDirAs(aSrcDir, aTargetDir, pasteAsDirName) {
	// copies aSrcDir to aTargetDir, but changes aSrcDir name to pasteAsDirName
	// aTargetDir must exist
	
	// in aTargetDir, the folder aSrcDir will be copied and pasted into
	var newSrcDirBasename = OS.Path.join(aTargetDir, pasteAsDirName);
	
	aTargetDir = OS.Path.join(aTargetDir, pasteAsDirName);
	var pasteDirAs = OS.File.makeDir(aTargetDir);
	
	var bl = aSrcDir.length;
	var delegateCopy = function(aEntry, aDepth) {
		var relativeFromASrcDir = aEntry.path.substr(bl);
		var targetPath = aTargetDir + relativeFromASrcDir;
		console.info(aDepth, aEntry.path, targetPath);
		
		if (aEntry.isDir) {
			OS.File.makeDir(targetPath);
		} else {
			OS.File.copy(aEntry.path, targetPath);
		}
	}
	
	enumChildEntries(aSrcDir, delegateCopy, null, false); // null to max_depth so it gets all, dont run on root
	
	return true;
}
var _getSafedForOSPath_pattWIN = /([\\*:?<>|\/\"])/g;
var _getSafedForOSPath_pattNIXMAC = /\//g;
const repCharForSafePath = '-';
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
// END - Common

// scratch
function test(tst, tst2) {
	/*
	// symbolic link requires elevated privelages so ditched this, as i dont know if user needs to be logged in as admin for an elevated com obj to be made
	var symPth = ostypes.TYPE.LPCTSTR.targetType.array()(tst);
	var trgPth = ostypes.TYPE.LPCTSTR.targetType.array()(tst2);
	var rez = ostypes.API('CreateSymbolicLink')(symPth, trgPth, 0);
	console.info('rez:', rez.toString(), uneval(rez));
	if (ctypes.winLastError != 0) { console.error('Failed rez, winLastError:', ctypes.winLastError); }
	*/

	
	var createPth = ostypes.TYPE.LPCTSTR.targetType.array()(tst);
	var trgPth = ostypes.TYPE.LPCTSTR.targetType.array()(tst2);
	var rez = ostypes.API('CreateHardLink')(symPth, trgPth, null);
	console.info('rez:', rez.toString(), uneval(rez));
	if (ctypes.winLastError != 0) { console.error('Failed rez, winLastError:', ctypes.winLastError); }
	
	// hard link is working how i was hoping a symlink would, user can rename it, move it around, and it remains connected, even icon change reflects
	
	return;
	/*
	var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(tst));
	
	var curBigIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_BIG, 0);
	console.info('curBigIcon_LRESULT:', curBigIcon_LRESULT, curBigIcon_LRESULT.toString(), uneval(curBigIcon_LRESULT));
	if (ctypes.winLastError != 0) { console.error('Failed curBigIcon_LRESULT, winLastError:', ctypes.winLastError) }
	
	var curBigIcon_HANDLE = ostypes.TYPE.HANDLE(curBigIcon_LRESULT); //ctypes.cast(curBigIcon, ostypes.TYPE.HANDLE);
	console.info('curBigIcon_HANDLE:', curBigIcon_HANDLE, curBigIcon_HANDLE.toString(), uneval(curBigIcon_HANDLE));
	
	var curSmallIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_SMALL, 0);
	console.info('curSmallIcon_LRESULT:', curSmallIcon_LRESULT, curSmallIcon_LRESULT.toString(), uneval(curSmallIcon_LRESULT));
	if (ctypes.winLastError != 0) { console.error('Failed curSmallIcon_LRESULT, winLastError:', ctypes.winLastError) }
	*/
	
	
	
	/*****
	// testing jscGetDeepest
	var iconPath = 'C:\\Users\\Vayeate\\AppData\\Roaming\\Mozilla\\Firefox\\profilist_data\\launcher_icons\\BADGE-ID_amo-puzzle__CHANNEL-REF_beta.ico';
	var hIconBig_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 256, 256, ostypes.CONST.LR_LOADFROMFILE); //todo: detect if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
	console.info('hIconBig_HANDLE:', hIconBig_HANDLE.toString(), uneval(hIconBig_HANDLE));
	
	//console.log('ding jscGD on HANDLE');
	//console.info('cutils.jscGetDeepest(hIconBig_HANDLE):', cutils.jscGetDeepest(hIconBig_HANDLE).toString()));

	
	if (hIconBig_HANDLE.isNull()) {
		throw new Error('Failed to LoadImage of BIG icon at path: ' + iconPath);
	}
	
	var hIconBig_LPARAM = ctypes.cast(hIconBig_HANDLE, ostypes.TYPE.LPARAM);
	console.info('hIconBig_LPARAM:', hIconBig_LPARAM.toString(), uneval(hIconBig_LPARAM));
	
	var jscGD = cutils.jscGetDeepest(hIconBig_LPARAM);
	console.info('jscGD:', jscGD.toString(), uneval(jscGD));
	
	
	console.log('hIconBig_LPARAM.value:', hIconBig_LPARAM.value);
	
	
	
	cutils.jscEqual(hIconBig_LPARAM, 0);
	
		cHwnd = ostypes.TYPE.HWND(ctypes.UInt64('0x1750d4e'));
		var curBigIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_BIG, 0);
		console.info('curBigIcon_LRESULT:', curBigIcon_LRESULT.toString(), uneval(curBigIcon_LRESULT));
		
		console.log('do jscgd now');
		
		var jscGD2 = cutils.jscGetDeepest(curBigIcon_LRESULT);
		
		cutils.jscEqual(curBigIcon_LRESULT, 0);
	******/

	///*
		// remove WM_SETICON
		var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(tst));
		var oldBigIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, 0);
		var oldSmallIcon = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, 0);
		console.info('oldBigIcon:', oldBigIcon.toString(), uneval(oldBigIcon));
		if (ctypes.winLastError != 0) { console.error('Failed oldBigIcon, winLastError:', ctypes.winLastError); }
	//*/
	/*
		// set class long
		var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(tst));
		var iconPath = 'C:\\Users\\Vayeate\\AppData\\Roaming\\Mozilla\\Firefox\\profilist_data\\launcher_icons\\BADGE-ID_mdn__CHANNEL-REF_beta.ico';
		
		var hIconBig_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 256, 256, ostypes.CONST.LR_LOADFROMFILE); //todo: detect if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
		var hIconSmall_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE); //todo: detect if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
		var hIconBig_LONG_PTR = ctypes.cast(hIconBig_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
		var hIconSmall_LONG_PTR = ctypes.cast(hIconSmall_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
		console.info('hIconBig_HANDLE:', hIconBig_HANDLE.toString(), uneval(hIconBig_HANDLE));
		
				var oldBigIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICON, hIconBig_LONG_PTR);			
				console.info('winLastError:', ctypes.winLastError);
				if (cutils.jscEqual(oldBigIcon, 0)) {
					//console.log('Got 0 for oldBigIcon, this does not mean that bigIcon did not apply, it just means that there was no PREVIOUS big icon');
					if (ctypes.winLastError != 0) {
						console.error('Failed to apply BIG icon with setClassLong, winLastError:', ctypes.winLastError);
					}
				}
				
				// tested and verified with the ostypes.TYPE.HWND(ctypes.UInt64('0x310b38')) above, that if oldBigIcon causes winLastError to go to non-0, then if oldSmallIcon call succeeds, winLastError is set back to 0
				var oldSmallIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICONSM, hIconSmall_LONG_PTR);
				console.info('winLastError:', ctypes.winLastError);
				if (cutils.jscEqual(oldSmallIcon, 0)) {
					//console.log('Got 0 for oldSmallIcon, this does not mean that smallIcon did not apply, it just means that there was no PREVIOUS small icon');
					if (ctypes.winLastError != 0) {
						console.error('Failed to apply SMALL icon with setClassLong, winLastError:', ctypes.winLastError);
					}
				}
	//*/
	
	
}

function testEnum(path) {
	var del = function(aEntry, aDepth) {
		console.info(aDepth, aEntry);
	}
	
	enumChildEntries(path, del, null, true);
	/*
var XPIScope = Cu.import('resource://gre/modules/addons/XPIProvider.jsm');
var scope = XPIScope.XPIProvider.bootstrapScopes['Profilist@jetpack'];
scope.ProfilistWorker.post('testEnum', [OS.Path.join(OS.Constants.Path.desktopDir, 'p')]).then(
  x => console.log('x:', x),
  y => console.error('y:', y)
).catch(
  z => console.error('z:', z)
);

	*/
}

// end scratch

// start winnt debug functions
var WINSTYLE_NAME_TO_HEX = {'WS_BORDER':0x00800000,'WS_CAPTION':0x00C00000,'WS_CHILD':0x40000000,'WS_CHILDWINDOW':0x40000000,'WS_CLIPCHILDREN':0x02000000,'WS_CLIPSIBLINGS':0x04000000,'WS_DISABLED':0x08000000,'WS_DLGFRAME':0x00400000,'WS_GROUP':0x00020000,'WS_HSCROLL':0x00100000,'WS_ICONIC':0x20000000,'WS_MAXIMIZE':0x01000000,'WS_MAXIMIZEBOX':0x00010000,'WS_MINIMIZE':0x20000000,'WS_MINIMIZEBOX':0x00020000,'WS_OVERLAPPED':0x00000000,'WS_POPUP':0x80000000,'WS_SIZEBOX':0x00040000,'WS_SYSMENU':0x00080000,'WS_TABSTOP':0x00010000,'WS_THICKFRAME':0x00040000,'WS_TILED':0x00000000,'WS_VISIBLE':0x10000000,'WS_VSCROLL':0x00200000};
WINSTYLE_NAME_TO_HEX['WS_OVERLAPPEDWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_OVERLAPPED | WINSTYLE_NAME_TO_HEX.WS_CAPTION | WINSTYLE_NAME_TO_HEX.WS_SYSMENU | WINSTYLE_NAME_TO_HEX.WS_THICKFRAME | WINSTYLE_NAME_TO_HEX.WS_MINIMIZEBOX | WINSTYLE_NAME_TO_HEX.WS_MAXIMIZEBOX;
WINSTYLE_NAME_TO_HEX['WS_POPUPWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_POPUP | WINSTYLE_NAME_TO_HEX.WS_BORDER | WINSTYLE_NAME_TO_HEX.WS_SYSMENU;
WINSTYLE_NAME_TO_HEX['WS_TILEDWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_OVERLAPPED | WINSTYLE_NAME_TO_HEX.WS_CAPTION | WINSTYLE_NAME_TO_HEX.WS_SYSMENU | WINSTYLE_NAME_TO_HEX.WS_THICKFRAME | WINSTYLE_NAME_TO_HEX.WS_MINIMIZEBOX | WINSTYLE_NAME_TO_HEX.WS_MAXIMIZEBOX;	
function debugPrintAllStylesOnIt(jsPrim_theHwndStyles) {
	var flagsOnIt = [];
	for (var S in WINSTYLE_NAME_TO_HEX) {
		if (jsPrim_theHwndStyles & WINSTYLE_NAME_TO_HEX[S]) {
			flagsOnIt.push(S);
		}
	}
	//console.info('debug', 'all flags on it:', flagsOnIt);
	return flagsOnIt.join(' | ');
}