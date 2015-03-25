importScripts('resource://gre/modules/workers/require.js');
var PromiseWorker = require('chrome://profilist/content/modules/workers/PromiseWorker.js');
importScripts('resource://gre/modules/osfile.jsm')

var cOS = OS.Constants.Sys.Name.toLowerCase();
var info; //populated by init

switch (cOS) {
	case 'winnt':
	//case 'winmo':
	//case 'wince':
		importScripts('chrome://profilist/content/modules/ostypes_win.jsm');
		break;
	case 'linux':
	//case 'freebsd':
	//case 'openbsd':
	//case 'sunos':
	//case 'webos': // Palm Pre
	//case 'android': //profilist doesnt support android (android doesnt have profiles)
		importScripts('chrome://profilist/content/modules/ostypes_nix.jsm');
		break;
	case 'darwin':
		importScripts('chrome://profilist/content/modules/ostypes_mac.jsm');
		break;
	default:
		throw new Error(['os-unsupported', OS.Constants.Sys.Name]);
}

function init(objOfInitVars) {
	switch (cOS) {
		case 'winnt':
		//case 'winmo':
		//case 'wince':
			var requiredKeys = ['OSVersion'];
			for (var i=0; i<requiredKeys.length; i++) {
				if (!(requiredKeys[i] in objOfInitVars)) {
					throw new Error('failed to init, required key of ' + requiredKeys[i] + ' not found in info obj');
				}
			}
			break;
		default:
			// do nothing
			var requiredKeys = ['FFVersion', 'FFVersionLessThan30'];
			for (var i=0; i<requiredKeys.length; i++) {
				if (!(requiredKeys[i] in objOfInitVars)) {
					throw new Error('failed to init, required key of ' + requiredKeys[i] + ' not found in info obj');
				}
			}
	}
	
	info = objOfInitVars;
}

//start - promiseworker setup
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
//end - promiseworker setup

var debugOut = [];
function debugOutCLEAR() {
	debugOut = [];
}
function debugOutWRITE(dontClear) {
	var str = debugOut.join('\n');
	OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'debugOut.txt'), str, {encoding:'utf-8'});
	if (!dontClear) {
		debugOutCLEAR();
	}
}

//////////////////////////////////////////////////////// new way

function refreshIconAtPath(iconPath) {

	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			// returns ostypes.TYPE.VOID
			//todo get this working with path
			ostypes.API('SHChangeNotify')(ostypes.CONST.SHCNE_ASSOCCHANGED, ostypes.CONST.SHCNF_IDLIST, null, null); //updates all
			rezMain = 'void';
			break;
		default:
			throw new Error('os-unsupported'); // if dont do new Error it wont give line number
	}
	
	return rezMain;
}

function queryProfileLocked(IsRelative, Path, path_DefProfRt) {
	// IsRelative is the value from profiles.ini for the profile you want to target
	// Path is the value from profiles.ini for the profile you want to target
	// path_DefProfRt is Services.dirsvc.get('DefProfRt', Ci.nsIFile).path - ChromeWorker's don't have access to it so has to be passed in

	if (IsRelative == '1') {
		var cProfileDirName = OS.Path.basename(OS.Path.normalize(Path));
		var path_cProfRootDir = OS.Path.join(path_DefProfRt, cProfileDirName);
	} else {
		var path_cProfRootDir = Path;
	}
	
	//note: im missing vms: http://mxr.mozilla.org/mozilla-release/source/profile/dirserviceprovider/src/nsProfileLock.cpp#581
	switch (cOS) {
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
				if (ex.winLastError == 32) {
					//its locked
					rezMain = 1;
				} else {
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

function test(tst) {
	var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(tst));
	
	var curBigIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_BIG, 0);
	console.info('curBigIcon_LRESULT:', curBigIcon_LRESULT, curBigIcon_LRESULT.toString(), uneval(curBigIcon_LRESULT));
	if (ctypes.winLastError != 0) { console.error('Failed curBigIcon_LRESULT, winLastError:', ctypes.winLastError) }
	
	var curBigIcon_HANDLE = ostypes.TYPE.HANDLE(curBigIcon_LRESULT); //ctypes.cast(curBigIcon, ostypes.TYPE.HANDLE);
	console.info('curBigIcon_HANDLE:', curBigIcon_HANDLE, curBigIcon_HANDLE.toString(), uneval(curBigIcon_HANDLE));
	
	var curSmallIcon_LRESULT = ostypes.API('SendMessage')(cHwnd, ostypes.CONST.WM_GETICON, ostypes.CONST.ICON_SMALL, 0);
	console.info('curSmallIcon_LRESULT:', curSmallIcon_LRESULT, curSmallIcon_LRESULT.toString(), uneval(curSmallIcon_LRESULT));
	if (ctypes.winLastError != 0) { console.error('Failed curSmallIcon_LRESULT, winLastError:', ctypes.winLastError) }
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
	switch (cOS) {
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
			
			var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(arrWinHandlePtrStrs[0]));
			
			var hIconBig_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 256, 256, ostypes.CONST.LR_LOADFROMFILE); //todo: detect if winxp and if so then use 32 instead of 256 per https://gist.github.com/Noitidart/0f55b7ca0f89fe2610fa#file-_ff-addon-snippet-browseforbadgethencreatesaveanapply-js-L328
			var hIconSmall_HANDLE = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE);
			// LoadImage was returning null because i had declared LoadImageA but then i defeined LPCTSTR as ctypes.jschar. i had to use LoadImageW to use with ctypes.jschar. I didnt test but i guess to use with LoadImageA you have to use ctypes.char
			
			// todo: ask if LoadImage is really taking the right size from the the ico CONTAINER, as im supplying containers
			
			console.info('hIconBig_HANDLE:', hIconBig_HANDLE, hIconBig_HANDLE.toString(), uneval(hIconBig_HANDLE));
			console.info('hIconSmall_HANDLE:', hIconSmall_HANDLE, hIconSmall_HANDLE.toString(), uneval(hIconSmall_HANDLE));
			
			console.info('ostypes.HELPER.jscGetDeepest(hIconBig_HANDLE):', ostypes.HELPER.jscGetDeepest(hIconBig_HANDLE), ostypes.HELPER.jscGetDeepest(hIconBig_HANDLE).toString(), uneval(ostypes.HELPER.jscGetDeepest(hIconBig_HANDLE)));
			console.info('ostypes.HELPER.jscGetDeepest(hIconSmall_HANDLE):', ostypes.HELPER.jscGetDeepest(hIconSmall_HANDLE), ostypes.HELPER.jscGetDeepest(hIconSmall_HANDLE).toString(), uneval(ostypes.HELPER.jscGetDeepest(hIconSmall_HANDLE)));
			
			if (hIconBig_HANDLE.isNull()) {
				throw new Error('Failed to LoadImage of BIG icon at path: ' + iconPath);
			}
			if (hIconSmall_HANDLE.isNull()) {
				throw new Error('Failed to LoadImage of SMALL icon at path: ' + iconPath);
			}

			if (ostypes.HELPER.jscEqual(hIconSmall_HANDLE, hIconBig_HANDLE)) {
				console.error('WARNING hIconSmall_HANDLE and hIconBig_HANDLE are equal');
			} else {
				console.log('good to go hIconSmall_HANDLE and hIconBig_HANDLE are NOT equal');
			}
			
			if (!winntPathToWatchedFile) {
				// update icon to pid that owns this thread
				// i noticed with SetClassLong/Ptr changing the icon when it changes in taskbar(unpinned) then the on hover color change which is based on the dominant color of the icon doesnt take after applying it once, maybe i need to destroy the old icon or something
				var hIconBig_LONG_PTR = ctypes.cast(hIconBig_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
				var hIconSmall_LONG_PTR = ctypes.cast(hIconSmall_HANDLE, ostypes.IS64BIT ? ostypes.TYPE.LONG_PTR : ostypes.TYPE.LONG);
				
				console.info('hIconBig_LONG_PTR:', hIconBig_LONG_PTR, hIconBig_LONG_PTR.toString(), uneval(hIconBig_LONG_PTR));
				console.info('hIconSmall_LONG_PTR:', hIconSmall_LONG_PTR, hIconSmall_LONG_PTR.toString(), uneval(hIconSmall_LONG_PTR));
				
				
				var oldBigIcon = ostypes.API('SetClassLong')(cHwnd/*ostypes.TYPE.HWND(ctypes.UInt64('0x310b38'))*/, ostypes.CONST.GCLP_HICON, hIconBig_LONG_PTR);			
				console.info('winLastError:', ctypes.winLastError);
				if (ostypes.HELPER.jscEqual(oldBigIcon, 0)) {
					//console.log('Got 0 for oldBigIcon, this does not mean that bigIcon did not apply, it just means that there was no PREVIOUS big icon');
					if (ctypes.winLastError != 0) {
						console.error('Failed to apply BIG icon with setClassLong, winLastError:', ctypes.winLastError);
					}
				}
				
				// tested and verified with the ostypes.TYPE.HWND(ctypes.UInt64('0x310b38')) above, that if oldBigIcon causes winLastError to go to non-0, then if oldSmallIcon call succeeds, winLastError is set back to 0
				var oldSmallIcon = ostypes.API('SetClassLong')(cHwnd, ostypes.CONST.GCLP_HICONSM, hIconSmall_LONG_PTR);
				console.info('winLastError:', ctypes.winLastError);
				if (ostypes.HELPER.jscEqual(oldSmallIcon, 0)) {
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
				
				debugOut.push('rez_destroyBig: ' + rez_destroyBig.toString());
				debugOut.push('rez_destroySmall: ' + rez_destroySmall.toString());
				*/
			} else {
				// update icon to pid that does not own this PromiseWorker thread
				
				var hIconBig_LPARAM = ctypes.cast(hIconBig_HANDLE, ostypes.TYPE.LPARAM);
				console.info('hIconBig_LPARAM:', hIconBig_LPARAM, hIconBig_LPARAM.toString(), uneval(hIconBig_LPARAM));
				
				var hIconSmall_LPARAM = ctypes.cast(hIconSmall_HANDLE, ostypes.TYPE.LPARAM);
				console.info('hIconSmall_LPARAM:', hIconSmall_LPARAM, hIconSmall_LPARAM.toString(), uneval(hIconSmall_LPARAM));
				
				
				try {
					var winntChangedIconForeignPID_JSON = JSON.parse(read_encoded(winntPathToWatchedFile.fullPathToFile, {encoding:'utf-8'}));
					winntChangedIconForeignPID_JSON.hwndPtrStrsAppliedTo = []; // clear the applied to array as this is only used by on activate of the window of ff profile that has profilist installed, it goes through these hwnd and if they still exist it removes the WM_SETICON so it can make the SetClassLong icon show through. it also does SetClassLong so to handle future opened windows
				} catch (aReason if aReason.becauseNoSuchFile) {
					// file not existing is ok
					console.log('making object');
					var winntChangedIconForeignPID_JSON = {
						lastAppliedIcon_LRESULT: { // LRESULT and LPARAM are both LONG_PTR
							big: null,
							sm: null
						},
						hwndPtrStrsAppliedTo: []
					};
					console.info('winntChangedIconForeignPID_JSON:', JSON.stringify(winntChangedIconForeignPID_JSON));
				}
				
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
						
						if ((ostypes.HELPER.jscEqual(curBigIcon_LRESULT, 0)/* && ostypes.HELPER.jscEqual(curSmallIcon_LRESULT, 0)*/) || (winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big && ostypes.HELPER.jscEqual(curBigIcon_LRESULT, winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big))) {
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

							// debugOut.push(['gwOwner_HWND: ', gwOwner_HWND, gwOwner_HWND.toString()].join(' '));
							
							// var successBigGwowner = ostypes.API('SendMessage')(gwOwner_HWND, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, hIconBig_LPARAM);
							// var successSmallGwowner = ostypes.API('SendMessage')(gwOwner_HWND, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, hIconSmall_LPARAM);			
							// debugOut.push(['successBigGwowner: ', successBigGwowner, successBigGwowner.toString()].join(' '));
							// debugOut.push(['successSmallGwowner: ', successSmallGwowner, successSmallGwowner.toString()].join(' '));
						}
				}
				if (winntChangedIconForeignPID_JSON.hwndPtrStrsAppliedTo.length > 0) {
					// write to disk
					winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.big = ostypes.HELPER.jscGetDeepest(hIconBig_LPARAM);
					winntChangedIconForeignPID_JSON.lastAppliedIcon_LRESULT.sm = ostypes.HELPER.jscGetDeepest(hIconSmall_LPARAM);
					tryOsFile_ifDirsNoExistMakeThenRetry('writeAtomic', [winntPathToWatchedFile.fullPathToFile, JSON.stringify(winntChangedIconForeignPID_JSON), {encoding:'utf-8', tmpPath:winntPathToWatchedFile.fullPathToFile+'.tmp'}], winntPathToWatchedFile.fromDir);
				}
			}
			
			debugOutWRITE(true);
			break;
		case 'linux':
			// arrWinHandlePtrStrs needs all windows handles
			break;
		default:
			throw new Error('os-unsupported');
	}
	
}

function getPtrStrToWinOfProf(aProfilePID, allWin) {
	// have to use one of the profile PID obtaining methods before using this function (on nix/max can use queryProfileLocked) (windows has to use getPidForProfile)
	// dont be an idiot, dont run this function when not running, but if you do this it will go through everything and find no window and return null, but be smart, its much better perf to use the isRunning function (queryProfileLocked) first, especially on windows
	
	// resolves to string of ptr of window handle
		// if allWin is true then an array of all string of ptr of windows of the pid
	// aProfilePID should be jsInt
	
	debugOutCLEAR();
	debugOut.push(['aProfilePID: ', aProfilePID, aProfilePID.toString()].join(' '));
	switch (cOS) {
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
				debugOut.push(['PID.value: ', PID.value, PID.value == aProfilePID].join(' '));
				if (PID.value == aProfilePID) {
					found = true;
					arrWinPtrStrs.push(hwnd.toString().match(/.*"(.*?)"/)[1]);
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
			debugOutWRITE();
			
			if (found) {
				console.info('found this:', arrWinPtrStrs);
				//var ancestor = ostypes.API('GetAncestor')(foundMatchingHwnd, ostypes.CONST.GA_PARENT);
				//console.info('ancestor:', ancestor.toString());
				//var ptrStr = ancestor.toString();
				//var ptrStr = ancestor.toString();
				//ptrStr = ptrStr.match(/.*"(.*?)"/)[1]; // aleternatively do: `ctypes.cast(foundMatchingHwnd, ctypes.uintptr_t).value.toString(16)` this is `hwndToHexStr` from: https://github.com/foudfou/FireTray/blob/master/src/modules/winnt/FiretrayWin32.jsm#L52
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
	debugOutCLEAR();
	var rezMain;
	if (IsRelative == '1') {
		var cProfileDirName = OS.Path.basename(OS.Path.normalize(Path));
		var path_cProfRootDir = OS.Path.join(path_DefProfRt, cProfileDirName);
	} else {
		var path_cProfRootDir = Path;
	}

	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			// returns
				// if LOCKED - 1
				// if NOT locked - 0
			
			var path_lock = OS.Path.join(path_cProfRootDir, 'parent.lock');
			
			try { // using try-finally just for the finally
				var dwSession;
				rezMain = function() {
					// START SESSION
					dwSession = new ostypes.TYPE.DWORD();
					var szSessionKey = ostypes.TYPE.WCHAR.array(ostypes.CONST.CCH_RM_SESSION_KEY + 1)(); //this is a buffer
					ostypes.HELPER.memset(szSessionKey, '0', ostypes.CONST.CCH_RM_SESSION_KEY ); // remove + 1 as we want null terminated // can do memset(szSessionKey, ostypes.WCHAR('0'), ostypes.CCH_RM_SESSION_KEY + 1); // js-ctypes initializes at 0 filled: ctypes.char16_t.array(33)(["\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00", "\x00"])"
					
					var rez_RmStartSession = ostypes.API('RmStartSession')(dwSession.address(), 0, szSessionKey);
					if (!ostypes.HELPER.jscEqual(rez_RmStartSession, ostypes.CONST.ERROR_SUCCESS)) {
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
					
					if (!ostypes.HELPER.jscEqual(rez_RmRegisterResources, ostypes.CONST.ERROR_SUCCESS)) {
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
					if (ostypes.HELPER.jscEqual(rez_RmGetList_Query, ostypes.CONST.ERROR_SUCCESS)) {
						//console.log('RmGetList succeeded but there are no processes on this so return as I had capped it to 0, so it should return ERROR_MORE_DATA if there was more than 0, rez_RmGetList_Query:', rez_RmGetList_Query);
						return 0;
					} else if (!ostypes.HELPER.jscEqual(rez_RmGetList_Query, ostypes.CONST.ERROR_MORE_DATA)) {
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
									
					if (!ostypes.HELPER.jscEqual(rez_RmGetList_Fetch, ostypes.CONST.ERROR_SUCCESS)) {
						if (ostypes.HELPER.jscEqual(rez_RmGetList_Fetch, ostypes.CONST.ERROR_MORE_DATA)) {
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
							pid: ostypes.HELPER.jscGetDeepest(rgpi[i].Process.dwProcessId),
							appName: ostypes.HELPER.readAsChar8ThenAsChar16(rgpi[i].strAppName),
							dwLowDateTime: parseInt(ostypes.HELPER.jscGetDeepest(rgpi[i].Process.ProcessStartTime.dwLowDateTime)),
							dwHighDateTime: parseInt(ostypes.HELPER.jscGetDeepest(rgpi[i].Process.ProcessStartTime.dwHighDateTime))
						});
						//console.log('PROCESS ' + i + ' DETAILS', 'PID:', rgpi[i].Process.dwProcessId, 'Application Name:', rgpi[i].strAppName.readStringReplaceMalformed());
					}
					
					if (rezMain.length > 1) {
						// really should never be greater then 1, but this is just a fallback
						rezMain.sort(function(a,b) {
							if (a.dwHighDateTime != b.dwHighDateTime) {
								return a.dwHighDateTime > b.dwHighDateTime; // sort asc
							} else {
								return a.dwLowDateTime > b.dwLowDateTime; // sort asc
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
					if (!ostypes.HELPER.jscEqual(rez_RmEndSession, ostypes.CONST.ERROR_SUCCESS)) {
						//console.error('RmEndSession Failed with error code:', rez_RmEndSession);
						debugOut.push('failed to end session');
					} else {
						debugOut.push('succesfully ended session');
					}
				} else {
					debugOut.push('NO NEED to end session');
				}
				debugOutWRITE();
				// with or without catch, the finally does run. without catch, it even rejects the promise. this is good and expected!!
			}
			
			break;
		default:
			throw new Error('os-unsupported');
	}

	return rezMain;
	
}
// my ipc plan for winnt
	// on deactivate of window start listening, only need inbound
	// other firefox profile can send message so that will need to init as outbound only
function IPC_send(utf8or16_string) {
	// sends message to target
	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			
			//msg shoud look like: Profilist--randomId--msg
			
			var jsStr_pipeName = 'Profilist';
			jsStr_pipeName = '\\\\.\\pipe\\' + jsStr_pipeName;
			var cStr_pipeName = ostypes.TYPE.LPCTSTR.targetType.array()(jsStr_pipeName);
			
			var rez_WaitNamedPipe = ostypes.API('WaitNamedPipe')(cStr_pipeName, ostypes.CONST.NMPWAIT_WAIT_FOREVER);
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			if (!rez_WaitNamedPipe) {
				throw new Error('WaitNamedPipe failed with error: ' + ctypes.winLastError);
			}
			
			var hOut = ostypes.API('CreateFile')(
				cStr_pipeName,
				ostypes.CONST.GENERIC_WRITE,
				0,	// do not share this pipe with others
				null,
				ostypes.CONST.OPEN_EXISTING,
				ostypes.CONST.FILE_ATTRIBUTE_NORMAL,
				null
			);
			
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			if (ostypes.HELPER.jscEqual(hOut, ostypes.CONST.INVALID_HANDLE_VALUE)) {
				throw new Error('CreateFile failed with error: ' + ctypes.winLastError);
			}
			
			var len = ostypes.TYPE.DWORD();
			var dwWritten = ostypes.TYPE.DWORD();
			/*
			for (var j=0; j<5; j++) {
				let i = j;
				setTimeout(function() {
					var msg = 'SIGNAL ' + i;
					var buf = ostypes.TYPE.WCHAR.array()(msg);
					// if (buf.constructor.size > 1024) {
						// console.error('cannot send message of', msg, 'because it is greather 1024 in size');
						// return;
					// }
					console.log('Sending message:', msg);
					var rez_WriteFile;
					var rez_WriteFile = ostypes.API('WriteFile')(hOut, buf, buf.length, dwWritten.address(), null);
					if (!rez_WriteFile) {
						console.error('WriteFile failed with error: ' + ctypes.winLastError);
						return;
					}
					console.info('dwWritten:', dwWritten, dwWritten.toString());
					// var rez_Flush = ostypes.API('FlushFileBuffers')(hOut);
					// console.info('rez_Flush:', rez_Flush, rez_Flush.toString(), uneval(rez_Flush));
				}, i*1000);
			}
			
			setTimeout(function() {
				var rez_CloseHandle = ostypes.API('CloseHandle')(hOut);
				console.info('rez_CloseHandle:', rez_CloseHandle, rez_CloseHandle.toString(), uneval(rez_CloseHandle));
			}, 5*1000);
			*/
			
			var msg = 'SIGNALING';
			var buf = ostypes.TYPE.WCHAR.array()(msg);
			console.log('Sending message:', msg);
			
			var rez_WriteFile = ostypes.API('WriteFile')(hOut, buf, buf.length, dwWritten.address(), null);
			if (!rez_WriteFile) {
				console.error('WriteFile failed with error: ' + ctypes.winLastError);
			}
			console.info('dwWritten:', dwWritten, dwWritten.toString());
			
			var rez_CloseHandle = ostypes.API('CloseHandle')(hOut);
			console.info('rez_CloseHandle:', rez_CloseHandle, rez_CloseHandle.toString(), uneval(rez_CloseHandle));
			break;
		
		default:
			throw new Error('os-unsupported');
	}
}

function IPC_init() {
	// responds to messages i send
	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			// target must be string of HWND, which is window target

			//var hIn = ostypes.TYPE.HANDLE();
			
			var jsStr_pipeName = 'Profilist';
			jsStr_pipeName = '\\\\.\\pipe\\' + jsStr_pipeName;
			var cStr_pipeName = ostypes.TYPE.LPCTSTR.targetType.array()(jsStr_pipeName);
			var /*rez_CreateNamedPipe*/hIn = ostypes.API('CreateNamedPipe')(
				cStr_pipeName, // name
				ostypes.CONST.PIPE_ACCESS_INBOUND, // open mode
				ostypes.CONST.PIPE_WAIT, // pipe mode
				ostypes.CONST.PIPE_UNLIMITED_INSTANCES, // max instances
				1024, // out buffer size
				1024, // in buffer size
				2000, // timeout ms
				null // security
			);
			
			if (ostypes.HELPER.jscEqual(hIn, ostypes.CONST.INVALID_HANDLE_VALUE)) {
				throw new Error('Could not create the pipe');
			}			
			
			console.info('hIn:', hIn, hIn.toString(), uneval(hIn));
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			
			var rez_ConnectNamedPipe = ostypes.API('ConnectNamedPipe')(hIn, null); // on this line, then it just hangs waiting for message
			console.info('rez_ConnectNamedPipe:', rez_ConnectNamedPipe, rez_ConnectNamedPipe.toString(), uneval(rez_ConnectNamedPipe));
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			
			var buf = ostypes.TYPE.WCHAR.array(100)();
			var dwBytesRead = ostypes.TYPE.DWORD();
			for (;;) {
				var rez_ReadFile = ostypes.API('ReadFile')(hIn, buf, buf.constructor.size, dwBytesRead.address(), null);
				if (!rez_ReadFile) {
					console.info('rez_ReadFile:', rez_ReadFile, rez_ReadFile.toString(), uneval(rez_ReadFile));
					if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
					//throw new Error('ReadFile failed -- probably EOF');
					break;
				}
			}
			
			var rez_DisconnectNamedPipe = ostypes.API('DisconnectNamedPipe')(hIn);
			console.info('rez_DisconnectNamedPipe:', rez_DisconnectNamedPipe, rez_DisconnectNamedPipe.toString(), uneval(rez_DisconnectNamedPipe));
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			
			console.info('buf.readStringReplaceMalformed:', ostypes.HELPER.readAsChar8ThenAsChar16(buf));
			console.info('dwBytesRead:', dwBytesRead, dwBytesRead.toString(), uneval(dwBytesRead));
			//console.info('buf:', buf, buf.toString(), uneval(buf));
			
			var rez_CloseHandle = ostypes.API('CloseHandle')(hIn);
			console.info('rez_CloseHandle:', rez_CloseHandle, rez_CloseHandle.toString(), uneval(rez_CloseHandle));
			if (ctypes.winLastError != 0) { console.error('winLastError:', ctypes.winLastError) }
			
			break;
		
		default:
			throw new Error('os-unsupported');
	}
}

// start - helper functions
var txtDecodr; // holds TextDecoder if created
function getTxtDecodr() {
	if (!txtDecodr) {
		txtDecodr = new TextDecoder();
	}
	return txtDecodr;
}
function read_encoded(path, options) {
	// async version of read_encoded from bootstrap.js
	// because the options.encoding was introduced only in Fx30, this function enables previous Fx to use it
	// must pass encoding to options object, same syntax as OS.File.read >= Fx30
	// TextDecoder must have been imported with Cu.importGlobalProperties(['TextDecoder']);

	if (options && !('encoding' in options)) {
		throw new Error('Must pass encoding in options object, otherwise just use OS.File.read');
	}
	
	if (options && info.FFVersionLessThan30) { // tests if version is less then 30
		//var encoding = options.encoding; // looks like i dont need to pass encoding to TextDecoder, not sure though for non-utf-8 though
		delete options.encoding;
	}
	
	var aVal = OS.File.read(path, options);

	if (info.FFVersionLessThan30) { // tests if version is less then 30
		//console.info('decoded aVal', getTxtDecodr().decode(aVal));
		return getTxtDecodr().decode(aVal); // Convert this array to a text
	} else {
		//console.info('aVal', aVal);
		return aVal;
	}
}
function writeDirsFrom_tileLastThenWriteAtomic() {
	
}

function tryOsFile_ifDirsNoExistMakeThenRetry(nameOfOsFileFunc, argsOfOsFileFunc, fromDir) {
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
				throw new Error('nameOfOsFileFunc of "' + nameOfOsFileFunc + '" is not supported');
		}
		makeDir_Bug934283(toDir, {from: fromDir});
		return retryIt();
	};
	
	// do initial attempt
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
// end - helper functions