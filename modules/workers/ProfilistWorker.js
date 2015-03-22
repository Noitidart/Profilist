importScripts('resource://gre/modules/workers/require.js');
var PromiseWorker = require('chrome://profilist/content/modules/workers/PromiseWorker.js');
importScripts('resource://gre/modules/osfile.jsm')

var cOS = OS.Constants.Sys.Name.toLowerCase();

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

function changeIconForAllWindows(iconPath) {
	// arrWinHandlePtrStrs is an array of strings of window pointers, https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Finding_Window_Handles#OS_Specific_Examples_Using_nsIBaseWindow_-%3E_nativeHandle
	// iconPath is an os path
	// winHandlePtrStrs should be passed in as array of arguments, requires at least 1
	
	if (arguments.length < 2) {
		throw new Error('Must provide at least one winHandlePtrStr in arguments');
	}
	var arrWinHandlePtrStrs = [];
	for (var i=1; i<arguments.length; i++) {
		arrWinHandlePtrStrs.push(arguments[i]);
	}
	
	switch (cOS) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			// arrWinHandlePtrStrs, just needs to be a single element
			// returns
				// if LOCKED - 1
				// if NOT locked - 0
			debugOut.push('iconPath: ' + iconPath);
			debugOut.push('arrWinHandlePtrStrs: ' + arrWinHandlePtrStrs.toString());
			debugOut.push('arrWinHandlePtrStrs[0]: ' + arrWinHandlePtrStrs[0]);
			debugOutWRITE();
			
			var cHwnd = ostypes.TYPE.HWND(ctypes.UInt64(arrWinHandlePtrStrs[0]));
			
			var hIconBig = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 256, 256, ostypes.CONST.LR_LOADFROMFILE);
			var hIconSmall = ostypes.API('LoadImage')(null, iconPath, ostypes.CONST.IMAGE_ICON, 16, 16, ostypes.CONST.LR_LOADFROMFILE);
			
			debugOut.push('hIconBig: ' + hIconBig.toString());
			debugOut.push('hIconSmall: ' + hIconSmall.toString());
			
			var successBig = SendMessage(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_BIG, hIconBig); //if it was success it will return 0? im not sure. on first time running it, and it was succesful it returns 0 for some reason
			var successSmall = SendMessage(cHwnd, ostypes.CONST.WM_SETICON, ostypes.CONST.ICON_SMALL, hIconSmall); //if it was success it will return 0? im not sure. on first time running it, and it was succesful it returns 0 for some reason
			
			debugOut.push('successBig: ' + successBig.toString());
			debugOut.push('successSmall: ' + successSmall.toString());
			
			debugOutWRITE(true);
			
			//var rez_destoryBig = ostypes.API('DestroyIcon')(hIconBig);
			//var rez_destorySmall = ostypes.API('DestroyIcon')(hIconSmall);
			
			/*
				var oldBigIcon = SetClassLongPtr(cHwnd, ostypes.CONST.GCLP_HICON, ctypes.cast(hIconBig, ostypes.TYPE.ULONG_PTR));
				var oldSmallIcon = SetClassLongPtr(cHwnd, ostypes.CONST.GCLP_HICONSM, ctypes.cast(hIconSmall, ostypes.TYPE.ULONG_PTR));
				
			*/
			
			break;
		case 'linux':
			// arrWinHandlePtrStrs needs all windows handles
			break;
		default:
			throw new Error('os-unsupported');
	}
	
}