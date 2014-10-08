importScripts('resource://gre/modules/workers/require.js');
var PromiseWorker = require('chrome://profilist/content/modules/workers/PromiseWorker.js');
importScripts('resource://gre/modules/osfile.jsm')

var lib = {};
var D = {}; //D means declared

switch (OS.Constants.Sys.Name.toLowerCase()) {
	case 'winnt':
	case 'winmo':
	case 'wince':
		importScripts('chrome://profilist/content/modules/ostypes_win.jsm');
		break;
	case 'linux':
	case 'freebsd':
	case 'openbsd':
	case 'sunos':
	case 'webos': // Palm Pre
	case 'android': //profilist doesnt support android (i dont think android has profiles, im not sure) but i include here anyways as its linux
		importScripts('chrome://profilist/content/modules/ostypes_nix.jsm');
		break;
	case 'darwin':
		importScripts('chrome://profilist/content/modules/ostypes_mac.jsm');
		break;
	default:
		throw new Error('OS not recognized, OS: "' + OS.Constants.Sys.Name + '"');
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

//returns true or false if locked
function queryProfileLocked(IsRelative, Path, rootPathDefault, retPid) {
	//returns -1 if fcntl not supported or sym not supported
	//returns 0 if profile is NOT locked so not in use
	//returns 1 if profile is LOCKED so in use
	//if unix/mac and if retPid is set, returns pid if LOCKED else returns 0
		//retPid only supported for unix (darwin included), it will return pid if running else it will return 0
	
	//msgBox(0, IsRelative, "Asking Question", 4);
	//msgBox(0, Path, "Asking Question", 4);
	//msgBox(0, rootPathDefault, "Asking Question", 4);
	if (IsRelative == '1') {
		var dirName = OS.Path.basename(OS.Path.normalize(Path));
		var PathRootDir = OS.Path.join(rootPathDefault, dirName);
	} else {
		var PathRootDir = Path;
	}
	var lockPaths = {
		win: OS.Path.join(PathRootDir, 'parent.lock'),
		unixFcntl: OS.Path.join(PathRootDir, '.parentlock'),
		unixSym: OS.Path.join(PathRootDir, 'lock')
		//note: im missing vms: http://mxr.mozilla.org/mozilla-release/source/profile/dirserviceprovider/src/nsProfileLock.cpp#581
	};
	lockPaths.macSym = lockPaths.unixFcntl;
	//msgBox(0, lockPaths.win, "Asking Question", 4);
	switch (OS.Constants.Sys.Name.toLowerCase()) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			//msgBox(0, lockPaths.win, "Asking Question", MB_YESNO);
			try {
				var aVal = OS.File.open(lockPaths.win);
			} catch (ex) {
				if (ex.winLastError == 32) {
					//its locked
					return 1;
				} else {
					throw new Error('Could not open profile lock file and it was NOT locked. Path:' + lockPaths.win + ' ex:' + ex);
				}
			}
			//its NOT locked
			aVal.close();
			return 0;
			break;
		case 'linux':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
		case 'webos': // Palm Pre
		case 'android': //profilist doesnt support android (i dont think android has profiles, im not sure) but i include here anyways as its linux
			//start - try to open libc
			if (!lib.libc) {
				lib.libc = returnFirstLibThatOpens(['libc.so.6', 'libc.so.7', 'libc.so.61.0', 'libc.so']);
			}
			//end - try to open libc
			
			return checkLockNsiProfileToolkitWay(lockPaths, retPid, false);
			
			break;
		case 'darwin':
			if (!lib.libc) {
				lib.libc = returnFirstLibThatOpens(['libc.dylib']);
			}
			
			return checkLockNsiProfileToolkitWay(lockPaths, retPid, true);
			
			break;
		
		default:
			throw new Error('OS not recognized for queryProfileLocked, OS is: "' + OS.Constants.Sys.Name + '"');
	}
}

function returnFirstLibThatOpens(libsToTry) {
	for (var i=0; i<libsToTry.length; i++) {
		try {
			return ctypes.open(libsToTry[i]);
		} catch(ex) {
			if (ex.message == 'couldn\'t open library ' + libsToTry[i]) {
				if (i == libsToTry.length - 1)  {
					throw new Error('None of the libraries to try could be opened, OS is: "' + OS.Constants.Sys.Name + '"');
				} //else { //its ok keep going }
			} else {
				throw ex;
			}
		}
	}
	throw new Error('returnFirstLibThatOpens: SHOULD NEVER GET HERE');
}

function checkLockNsiProfileToolkitWay(lockPaths, retPid, isMac) {
	var fcntl = checkFcntl(lockPaths.unixFcntl, retPid);
	if (fcntl === -1) {
		if (isMac) {
			var sym = checkSym(lockPaths.macSym);
		} else {
			var sym = checkSym(lockPaths.unixSym);
		}
		if (sym === -1) {
			throw new Error('Could not verify if profile is in use via fcntl NOR sym');
		} else {
			return sym; //return sym == 1 ? true : false;
		}
	} else {
		return fcntl; //return fcntl == 1 ? true : false;
	}
}

function checkFcntl(lockPath, retPid) {
	//supports queryProfileLocked
	//returns:
	//0 = NOT locked
	//1 = LOCKED
	//-1 = fnctl failed (fnctl not available)
	
	if (!D.fcntl) {
		try {
			//int fcntl(int fd, int cmd, ... /* arg */ );
			/*
			 * int fcntl(int fd, int cmd);
			 * int fcntl(int fd, int cmd, long arg);
			 * int fcntl(int fd, int cmd, struct flock *lock);
			 */
			D.fcntl = lib.libc.declare('fcntl',
				ctypes.default_abi,
				ctypes.int,
				ctypes.int,
				ctypes.int,
				ostypes.flock.ptr
			);
		} catch(ex) {
			//fcntl not available
			return -1;
		}
	}
	
	if (!D.openFd) {
		//int open(const char *pathname, int flags, mode_t mode);
		//https://github.com/downthemall/downthemall-mirror/blob/c8fd56c464b2af6b8dc7ddee1f9bbe6e9f6e8382/modules/manager/worker_posix.js#L35
		D.openFd = lib.libc.declare(
			'open',
			ctypes.default_abi,
			ctypes.int, // retval
			ctypes.char.ptr, // path
			ctypes.int // flags
		);
	}
	
	if (!D.closeFd) {
		D.closeFd = lib.libc.declare(
			'close',
			ctypes.default_abi,
			ctypes.int, // retval
			ctypes.int // fd
		);
	}
	
	OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump2.txt'), 'lockPath:' + lockPath, {encoding:'utf-8'}); //debug
	
	var fd = D.openFd(lockPath, OS.Constants.libc.O_RDWR | OS.Constants.libc.O_CREAT); //setting this to O_RDWR fixes errno of 9 on fcntl
	if (fd == -1) {
		//if file does not exist and O_CREAT was not set. errno is == 2
		//if file is a dangling symbolic link. errno is == 2
		//console.error('failed to open file, fd:', fd, 'errno:', ctypes.errno);
		//OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump.txt'), 'failed open:' + ctypes.errno, {encoding:'utf-8'}); //debug
		return -1;
	}
	
	try {
		var testlock 	   = ostypes.flock();
		testlock.l_type    = ostypes.F_WRLCK; //can use F_RDLCK but keep openFd at O_RDWR, it just works
		testlock.l_start   = 0;
		testlock.l_whence  = OS.Constants.libc.SEEK_SET;
		testlock.l_len     = 0;
		
		var rez = D.fcntl(fd, ostypes.F_GETLK, testlock.address());
		//console.log('rez:', rez);
		//OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump.txt'), 'rez:' + uneval(rez), {encoding:'utf-8'});
		if (rez != -1) {
			//check testlock.l_type
			//console.log('testlock:', uneval(testlock));
			if (retPid) {
				return parseInt(testlock.l_pid);
			} else {
				return parseInt(testlock.l_pid) == 0 ? 0 : 1;
			}
			/*
			if (testlock.l_type == ostypes.F_UNLCK) {
				//can also test if testlock.l_pid is not 0
				//console.info('file is NOT locked');
				return 0;
			} else if (testlock.l_type == ostypes.F_WRLCK) {
				//console.info('file is WRITE LOCKED, it may be read locked too');
				return 1;
			} else if (testlock.l_type == ostypes.F_RDLCK) {
				//console.info('file is NOT write locked but just READ LOCKED'); //we know this because testlock tested for write lock first
				return 1;
			} else {
				//console.error('testlock.l_type is unknown, l_type:', testlock.l_type);
				return 1; //even though its unknown we return 1, meanings it locked
			}
			*/
		} else {
			//console.log('rez was -1, errno', ctypes.errno);
			var retNeg1 = true;
		}
	} finally {
		var rez = D.closeFd(fd);
		if (rez == 0) {
			//console.log('succesfully closed, rez:', rez);
		} else {
			//console.error('FAILED to close, rez:', rez, 'errno', ctypes.errno);
		}
	}
	
	if (retNeg1) {
		return -1;
	}
}

function checkSym(lockPath, retPid) {
	if (!('readLink' in D)) {
	
	}
	
	return -1; //temporary
	
	//get pid from readLink
	//get last modified date of sym file
	//use popen to get birth time of pid
	//if `birthtime of pid` is > than `last modified date of sym file` then sym file is stale and profile is not in use
}

function focusMostRecentWinOfProfile(IsRelative, Path, rootPathDefault) {
	//if provide checkIfRunning, must povide it as an object like this:
	//MUST CHECK IF PROFILE IS RUNNING
	var retPid = true;
	var rez_QPL = queryProfileLocked(IsRelative, Path, rootPathDefault, retPid);
	if (rez_QPL === 0) {
		throw new Error('Profile is not running, so cannot focus it');
	} else if (rez_QPL === -1) {
		throw new Error('Failed at checking profile is in use');
	} else if (rez_QPL >= 1) {
		// its either 1 for pid saying its running, or its a pid for nix/mac saying its running so this is good carry on
	} else {
		throw new Error('huhhh?? should never get here, rez_QPL: "' + rez_QPL + '"');
	}
	
	/////////////////////////////////////////////////////////////////////////////
	switch (OS.Constants.Sys.Name.toLowerCase()) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			//start - get pid of all running firefoxes
			if (!lib.user32) {
				lib.user32 = ctypes.open('user32.dll');
			}
			
			if (!D.EnumWindowsProc) {
				D.EnumWindowsProc = ctypes.FunctionType(ostypes.CallBackABI, ostypes.BOOL, [ostypes.HWND, ostypes.LPARAM]);
			}
			if (!D.EnumWindows) {
				D.EnumWindows = lib.user32.declare('EnumWindows', ostypes.WinABI, ostypes.BOOL, D.EnumWindowsProc.ptr, ostypes.LPARAM);
			}
			if (!D.EnumChildWindows) {
				D.EnumChildWindows = lib.user32.declare('EnumChildWindows', ostypes.WinABI, ostypes.BOOL, ostypes.HWND, D.EnumWindowsProc.ptr, ostypes.LPARAM);
			}
			if (!D.GetClassName) {
				D.GetClassName = lib.user32.declare('GetClassNameW', ostypes.WinABI, ostypes.INT, ostypes.HWND, ostypes.LPTSTR, ostypes.INT);
			}
			
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633522%28v=vs.85%29.aspx
			 * DWORD WINAPI GetWindowThreadProcessId(
			 * __in_ HWND hWnd,
			 * __out_opt_ LPDWORD lpdwProcessId
			 * );
			 */
			if (!D.GetWindowThreadProcessId) {
				D.GetWindowThreadProcessId = lib.user32.declare('GetWindowThreadProcessId', ostypes.WinABI, ostypes.DWORD,
					ostypes.HWND, // hWnd
					ostypes.LPDWORD // lpdwProcessId
				);
			}
			
			var ffPids = {};
			var PID = new ostypes.DWORD;
			var buf = new new ctypes.ArrayType(ctypes.jschar, 255);

			var SearchPD = function(hwnd, lParam) {    
				var rez_GCN = D.GetClassName(hwnd, buf, 255);
				if (rez_GCN == 0) {
					//console.warn('GetClassName failed');
				} else {
					var className = buf.readString();
					if (className == 'MozillaWindowClass') {
						var rez = D.GetWindowThreadProcessId(hwnd, PID.address());
						ffPids[PID.value] = 0;
					};
				}
				return true; //let enum continue till nothing to enum
			}

			SearchPD_ptr = D.EnumWindowsProc.ptr(SearchPD);
			var wnd = ostypes.LPARAM(0);
			//console.time('EnumWindows');
			D.EnumWindows(SearchPD_ptr, ctypes.cast(wnd.address(), ostypes.LPARAM));
			//console.timeEnd('EnumWindows');

			//ffPids = Object.keys(ffPids);
			//end - get pid of all running firefoxes
			
			if (IsRelative == '1') {
				var dirName = OS.Path.basename(OS.Path.normalize(Path));
				var PathRootDir = OS.Path.join(rootPathDefault, dirName);
			} else {
				var PathRootDir = Path;
			}
			var lockPaths = {
				win: OS.Path.join(PathRootDir, 'parent.lock')
			};
			
			//start - get pid of profile by enum handles of all fiefoxes checking for lock file path
			if (!lib.ntdll) {
				lib.ntdll = ctypes.open('ntdll.dll');
			}
			
			if (!lib.kernel32) {
				lib.kernel32 = ctypes.open('kernel32.dll');
			}
			
			if (!D.GetCurrentProcess) {
				//HANDLE WINAPI GetCurrentProcess(void);
				D.GetCurrentProcess = lib.kernel32.declare('GetCurrentProcess', ostypes.WinABI, ostypes.HWND);
			}
			
			if (!D.GetCurrentProcessId) {
				//DWORD WINAPI GetCurrentProcessId(void);
				D.GetCurrentProcessId = lib.kernel32.declare('GetCurrentProcessId', ostypes.WinABI, ostypes.DWORD);
			}
			
			var currentProcessID = D.GetCurrentProcessId();
			delete ffPids[currentProcessID];
			//ffPids = Object.keys(ffPids);
			
			if (!D.OpenProcess) {
				//http://msdn.microsoft.com/en-us/library/windows/desktop/ms684320%28v=vs.85%29.aspx
				D.OpenProcess = lib.kernel32.declare('OpenProcess', ostypes.WinABI, ostypes.HANDLE, // return
					ostypes.DWORD, // dwDesiredAccess
					ostypes.BOOL, // bInheritHandle
					ostypes.DWORD // dwProcessId
				);
			}
			
			var currentProcessHandle = D.GetCurrentProcess();
			
			if (!D.CloseHandle) {
				D.CloseHandle = lib.kernel32.declare('CloseHandle', ostypes.WinABI, ostypes.BOOL, // return type: 1 indicates success, 0 failure
					ostypes.HANDLE // hObject
				);
			}
			
			if (!D.DuplicateHandle) {
				 /*
				BOOL WINAPI DuplicateHandle(
				__in HANDLE hSourceProcessHandle,
				__in HANDLE hSourceHandle,
				__in HANDLE hTargetProcessHandle,
				__out LPHANDLE lpTargetHandle,
				__in DWORD dwDesiredAccess,
				__in BOOL bInheritHandle,
				__in DWORD dwOptions
				);
				*/
				D.DuplicateHandle = lib.kernel32.declare('DuplicateHandle', ostypes.WinABI, ostypes.BOOL, // return
					ostypes.HANDLE, // hSourceProcessHandle
					ostypes.HANDLE, // hSourceHandle
					ostypes.HANDLE, // hTargetProcessHandle
					ostypes.LPHANDLE, // lpTargetHandle
					ostypes.DWORD, // dwDesiredAccess
					ostypes.BOOL, // bInheritHandle
					ostypes.DWORD // dwOptions
				);
			}
			
			if (!D.NtQuerySystemInformation) {
				D.NtQuerySystemInformation = lib.ntdll.declare('NtQuerySystemInformation', ostypes.WinABI, ostypes.NTSTATUS, // return
					ostypes.SYSTEM_INFORMATION_CLASS, // SystemInformationClass
					ostypes.PVOID, // SystemInformation //ctypes.void_t.ptr
					ostypes.ULONG, // SystemInformationLength 
					ostypes.PULONG
				);
			}
			
			if (!D.NtQueryInformationFile) {
				/* http://msdn.microsoft.com/en-us/library/windows/hardware/ff556646%28v=vs.85%29.aspx --> http://msdn.microsoft.com/en-us/library/windows/hardware/ff567052%28v=vs.85%29.aspx
				 * NTSTATUS ZwQueryInformationFile(
				 * __in_   HANDLE FileHandle,
				 * __out_  PIO_STATUS_BLOCK IoStatusBlock
				 * __out_  PVOID FileInformation,
				 * __in_   ULONG Length,
				 * __in_   FILE_INFORMATION_CLASS FileInformationClass
				 * );
				 */
				D.NtQueryInformationFile = lib.ntdll.declare('NtQueryInformationFile', ctypes.winapi_abi, ctypes.long, // return //NTSTATUS 
					ostypes.HANDLE, // FileHandle
					ostypes.IO_STATUS_BLOCK.ptr, // PIO_STATUS_BLOCK
					ostypes.PVOID, // PVOID //ctypes.void_t.ptr //copied style of NtQuerySystemInformation for second arg where they can pass in any structure //but everyone else makes PVOID ctypes.voidptr_t like this: `ctypes.voidptr_t, // PVOID`
					ostypes.ULONG, // ULONG
					ostypes.DWORD // dword based on here https://github.com/fabioz/PyDev.Debugger/blob/bec51edbfedc46a299490d56ab266689dcc89778/pydevd_attach_to_process/winappdbg/win32/ntdll.py#L517 // im guessing its an int //copied style of NtQuerySystemInformation for second arg where they can pass in any structure //but everyone else makes PVOID ctypes.voidptr_t like this: `ctypes.voidptr_t, // PVOID`
				);
			}
			
			var lockFileFoundForPid = {};
			var handlesPerPid = {};
			var system_handle_info_ex = ostypes.SYSTEM_HANDLE_INFORMATION_EX();
			
			var _enumBufSize = ostypes.ULONG(system_handle_info_ex.constructor.size);
			var status = D.NtQuerySystemInformation(ostypes.SystemExtendedHandleInformation, system_handle_info_ex.address(), _enumBufSize, _enumBufSize.address());
			var parsedNum = parseInt(system_handle_info_ex.NumberOfHandles); //this should at least avoid that error when system_handle_info.NumberOfHandles changes to larger on os but when i created the array it was less so it will throw `invalid index` //this also seriously speeds up the for loop. it went from average of 250ms to 130ms
			
			//system_handle_info_ex.Handles = ostypes.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr.array(parsedNum)();
			system_handle_info_ex = ctypes.StructType('SYSTEM_HANDLE_INFORMATION_EX', [
				{'NumberOfHandles': ostypes.ULONG},
				{'Reserved': ostypes.ULONG},
				{'Handles': ctypes.ArrayType(ostypes.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX, parsedNum)}
			])();
			_enumBufSize = ostypes.ULONG(system_handle_info_ex.constructor.size);
			
			var status = D.NtQuerySystemInformation(ostypes.SystemExtendedHandleInformation, system_handle_info_ex.address(), _enumBufSize, _enumBufSize.address());
			if (status != 0) {
				//console.warn('even more handles available now but not liekly the parent.lock as in like absolutely 0% chance they are the parent.lock, numbero of hadles must have changed between the two reps in order to fail and get here, status:', status.toString());
			}
			
			var isb;
			var fni;
			
			for (var i=0; i<parsedNum; i++) {
				try {
					var UniqueProcessId = system_handle_info_ex.Handles[i].UniqueProcessId.toString();
				} catch (ex) {
					if (ex.message == 'invalid index') {
						//console.warn('i:', i, 'ex:', ex);
						//console.warn('this usually happens towards end when i think NumberOfHandles changes, so I think maybe I should test if system_handle_info.NumberOfHandles > str value of NumberOfHandles at start, then quit', 'system_handle_info.NumberOfHandles:', system_handle_info.NumberOfHandles.toString()); //cuz handles arre changing by about 100 every second or so it seems //so keep in mind the handles can also reduce so i can have handles that no longer exist by time loop is up, this is becuase loop takes couple hundred ms //and also because the system_handle_info values are live they change as handles change
						break;
					} else {
						//console.error('i:', i, 'ex:', ex);
						throw ex;
					}
				   //throw ex;
				}
				if (UniqueProcessId in lockFileFoundForPid) {
					continue;
				}
				//verified that number of processes matches task manager by not targeting specific UniqueProcessId
				if (UniqueProcessId in ffPids) {
						if (system_handle_info_ex.Handles[i].UniqueProcessId != currentProcessID) {
							//need to duplicate handle
							if (ffPids[UniqueProcessId] == 0) { //i set it to 0 while collecting
								ctypes.winLastError = 0;
								ffPids[UniqueProcessId] = D.OpenProcess(ostypes.PROCESS_DUP_HANDLE | ostypes.PROCESS_QUERY_INFORMATION, false, system_handle_info_ex.Handles[i].UniqueProcessId);
								if (ctypes.winLastError > 0) {
									//console.error('error opening process for pid:', p);
									ffPids[UniqueProcessId] = 0; //so it skips on closing
									throw new Error('failed to open process id: ' + UniqueProcessId);
									continue; //need to continue because could not even open process so cannot dupe it
								}
							}
							var useHandle = ctypes.voidptr_t();
							var duped = D.DuplicateHandle(ffPids[UniqueProcessId], ostypes.HANDLE(system_handle_info_ex.Handles[i].HandleValue), currentProcessHandle, useHandle.address(), 0, false, ostypes.DUPLICATE_SAME_ACCESS);
							if (!duped) {
								continue;
								//console.warn('failed to dupe handle of id:', UniqueProcessId, 'winLastError:', ctypes.winLastError, 'useHandle:', useHandle.toString());
							}
						} else {
							//should never get here, i dont list processes of own pid as i already know the lock file, and i dont ever allow focus most recent window of own profile because that is obviously the window thye just clicked from
						   var useHandle = ostypes.HANDLE(system_handle_info_ex.Handles[i].HandleValue);
						}
						//var gfpnbh_bufType = ctypes.ArrayType(ctypes.jschar);
						//var gfpnbh_buffer = new gfpnbh_bufType(1024);
						//GetFinalPathNameByHandle(useHandle, gfpnbh_buffer, gfpnbh_buffer.length, 0);
						isb = ostypes.IO_STATUS_BLOCK();
						fni = ostypes.FILE_NAME_INFORMATION();
						var rez_NQIF = D.NtQueryInformationFile(useHandle, isb.address(), fni.address(), fni.addressOfField('FileName').contents.constructor.size, ostypes.FileNameInformation);
					//console.log('gfpnbh_buffer:', gfpnbh_buffer.readString());
					if (rez_NQIF == -2147483643) {
						throw new Error('status buffer overlfow, need to increase size of buffer');
						//increase size of buffer `fni.addressOfField('FileName').length` to `fni.FileNameLength / 2` //cant do this as of now as the second field is hardcoded in the structure as length of 260
						//var rez = NtQueryInformationFile(system_handle_info.Handles[i].HandleValue, isb.address(), fni.address(), fni.addressOfField('FileName').contents.constructor.size, FileNameInformation);
					} else if (rez_NQIF == 0) { //-2147483643 == STATUS_BUFFER_OVERFLOW
						//ok now re-NtQueryInfoFile to get the accurate handle name with duped handle
						//console.log('rez0:', fni.FileName.readString());

						/*
						if (!(UniqueProcessId in res)) {
							res[UniqueProcessId] = [];
						}
						*/
						//gfpnbh //res[UniqueProcessId][GrantedAccess].push(gfpnbh_buffer.readString());
						//res[UniqueProcessId].push(fni.FileName.readString() + ' | ' + gfpnbh_buffer.readString());
						var handlePath = fni.FileName.readString();
						if (handlePath.substr(handlePath.length - 11) == 'parent.lock') {
							if (lockPaths.win.indexOf(handlePath) > -1) {
								var pid = parseInt(UniqueProcessId);
							}
							lockFileFoundForPid[UniqueProcessId] = true;
							// do not continue as need to close file handle
						}
						
					} else {
						//i dont care, keep going
					}
					
					if (duped) {
						duped = false;
					   var rez_CHFile = D.CloseHandle(useHandle);
						if (!rez_CHFile) {
							//console.warn('FAILED TO CLOSE file hanlde');
							// this is a big deal because it can lead to false positives in future checks
						}
					} /* else {
						//console.log(' no need close')
					} */
					if (pid) {
						break; //as it was found
					}
				}
			}
			for (var p in ffPids) {
				if (ffPids[p] !== 0) { //if (p != currentProcessID) { //changed to check if not !== 0 so this way it will close the ones that opened. and any that failed will obviously be 0 so it wont close that
				   var rez_CH = D.CloseHandle(ffPids[p]);
					if (!rez_CH) {
						//console.error('failed closing handle for pid:', p);
						// this might be a big deal
					}
				}
			}
		
			if (!pid) {
				throw new Error('Could not find a Firefox PID that was linked to the paths lock file. Path: "' +  Path + '"');
			}
			//end - get pid of profile by enum handles of all fiefoxes checking for lock file path
			
			//start - focus most recent window of profile
			if (!D.GetTopWindow) {
				/* http://msdn.microsoft.com/en-us/library/ms633514%28VS.85%29.aspx
				 * HWND WINAPI GetTopWindow(
				 * __in_opt_  HWND hWnd
				 * );
				 */
				D.GetTopWindow = lib.user32.declare('GetTopWindow', ctypes.winapi_abi, ostypes.HWND, // return
				  ostypes.HWND // hWnd
				);
			}
			
			if (!D.GetWindow) {
				/* http://msdn.microsoft.com/en-us/library/ms633515%28v=vs.85%29.aspx
				 * I was trying to use GetNextWindow however that is not available through DLL, but that just calls GetWindow so am using GetWindow with GW_HWNDNEXT instead
				 * HWND WINAPI GetWindow(
				 *  __in_  HWND hWnd,
				 *  __in_  UINT wCmd
				 * );
				 */
				D.GetWindow = lib.user32.declare('GetWindow', ostypes.WinABI, ostypes.HWND, // return
				  ostypes.HWND, // hWnd
				  ostypes.UINT // wCmd
				);
			}
			
			if (!D.GetWindowLong) {
				if (ostypes.is64bit) {
					//64bit
					/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633585%28v=vs.85%29.aspx
					 *	LONG_PTR WINAPI GetWindowLongPtr(
					 *	  _In_  HWND hWnd,
					 *	  _In_  int nIndex
					 *	);
					 */
				  D.GetWindowLong64 = lib.user32.declare('GetWindowLongPtrW', ostypes.WinABI, ostypes.LONG_PTR, // return
					ostypes.HWND, // hWnd
					ostypes.INT // nIndex
				  );
				  D.GetWindowLong = function(hWnd, nIndex) {
					var retLongPtr = D.GetWindowLong64(hWnd, nIndex);
					if ('contents' in retLongPtr) { // untested im just guessing here
						return retLongPtr.contents;
					} else {
						return retLongPtr;
					}
				  }
				} else {
					//32bit
					/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633584%28v=vs.85%29.aspx
					 *	LONG WINAPI GetWindowLong(
					 *	  _In_  HWND hWnd,
					 *	  _In_  int nIndex
					 *	);
					 */
				  D.GetWindowLong32 = lib.user32.declare('GetWindowLongW', ostypes.WinABI, ostypes.LONG, // return
					ostypes.HWND, // hWnd
					ostypes.INT // nIndex
				  );
				  
				  D.GetWindowLong = function(hWnd, nIndex) {
					var retLong = D.GetWindowLong32(hWnd, nIndex);
					return retLong;
				  }
				}
			}
			
			//D.GetClassName is already available above
			//D.GetWindowThreadProcessId is already available above
			
			if (!D.SetForegroundWindow) {
				/* http://msdn.microsoft.com/en-us/library/ms633539%28v=vs.85%29.aspx
				* BOOL WINAPI SetForegroundWindow(
				*   __in HWND hWnd
				* );
				*/
				D.SetForegroundWindow = lib.user32.declare('SetForegroundWindow', ostypes.WinABI, ostypes.BOOL, // return
				  ostypes.HWND // hWnd
				);
			}
			
			if (!D.IsIconic) {
				/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633507%28v=vs.85%29.aspx
				* BOOL WINAPI IsIconic(
				*   __in HWND hWnd
				* );
				*/
				D.IsIconic = lib.user32.declare('IsIconic', ostypes.WinABI, ostypes.BOOL, // return
					ostypes.HWND // hWnd
				);
			}

			if (!D.ShowWindow) {
				/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633507%28v=vs.85%29.aspx
				* BOOL WINAPI ShowWindow(
				*   __in HWND hWnd
				*   __in INT nCmdShow
				* );
				*/
				D.ShowWindow = lib.user32.declare('ShowWindow', ostypes.WinABI, ostypes.BOOL, // BOOL
					ostypes.HWND, // hWnd
					ostypes.INT // nCmdShow
				);
			}
			
			
			var winFocusWindow = function(hwnd) {
				var rez_II = D.IsIconic(hwnd);
				if (rez_II) {
					//console.warn('its minimized so un-minimize it');
					//its minimized so unminimize it
					var rez_SW = D.ShowWindow(hwnd, ostypes.SW_RESTORE);
					if (!rez_SW) {
						throw new Error('Failed to un-minimize window');
					}
				}
				var rez_SFW = D.SetForegroundWindow(hwnd);
				if (!rez_SFW) {
					//console.log('could not set to foreground window for a reason other than minimized, maybe process is not foreground, lets try that now');
					throw new Error('could not set to foreground window for a reason other than minimized, maybe process is not foreground, lets try that now');
					/*
					var cPid = 	ctypes.cast(ctypes.voidptr_t(0), ctypes.unsigned_long);
					var rez = GetWindowThreadProcessId(hwnd, cPid.address());
					if (!rez) {
						throw new Error('Failed to get PID');
					} else {
						console.log('trying to set pid to foreground process');
						return false;
					}
					*/
				} else {
					return rez_SFW;
				}
			}
			
			var hwndC = D.GetTopWindow(ostypes.NULL); //works with `null` as well
			var hwndStyle;
			var i = 0;
			var buf;
			var PID = new ostypes.DWORD;
			var styleIsInAltTab = ostypes.WS_VISIBLE | ostypes.WS_CAPTION; //visible OR caption //how to do visible AND caption?
			var dumpThis = [];
			
			//debug stuff
			var WINSTYLE_NAME_TO_HEX = {'WS_BORDER':0x00800000,'WS_CAPTION':0x00C00000,'WS_CHILD':0x40000000,'WS_CHILDWINDOW':0x40000000,'WS_CLIPCHILDREN':0x02000000,'WS_CLIPSIBLINGS':0x04000000,'WS_DISABLED':0x08000000,'WS_DLGFRAME':0x00400000,'WS_GROUP':0x00020000,'WS_HSCROLL':0x00100000,'WS_ICONIC':0x20000000,'WS_MAXIMIZE':0x01000000,'WS_MAXIMIZEBOX':0x00010000,'WS_MINIMIZE':0x20000000,'WS_MINIMIZEBOX':0x00020000,'WS_OVERLAPPED':0x00000000,'WS_POPUP':0x80000000,'WS_SIZEBOX':0x00040000,'WS_SYSMENU':0x00080000,'WS_TABSTOP':0x00010000,'WS_THICKFRAME':0x00040000,'WS_TILED':0x00000000,'WS_VISIBLE':0x10000000,'WS_VSCROLL':0x00200000};

			WINSTYLE_NAME_TO_HEX['WS_OVERLAPPEDWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_OVERLAPPED | WINSTYLE_NAME_TO_HEX.WS_CAPTION | WINSTYLE_NAME_TO_HEX.WS_SYSMENU | WINSTYLE_NAME_TO_HEX.WS_THICKFRAME | WINSTYLE_NAME_TO_HEX.WS_MINIMIZEBOX | WINSTYLE_NAME_TO_HEX.WS_MAXIMIZEBOX;
			WINSTYLE_NAME_TO_HEX['WS_POPUPWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_POPUP | WINSTYLE_NAME_TO_HEX.WS_BORDER | WINSTYLE_NAME_TO_HEX.WS_SYSMENU;
			WINSTYLE_NAME_TO_HEX['WS_TILEDWINDOW'] = WINSTYLE_NAME_TO_HEX.WS_OVERLAPPED | WINSTYLE_NAME_TO_HEX.WS_CAPTION | WINSTYLE_NAME_TO_HEX.WS_SYSMENU | WINSTYLE_NAME_TO_HEX.WS_THICKFRAME | WINSTYLE_NAME_TO_HEX.WS_MINIMIZEBOX | WINSTYLE_NAME_TO_HEX.WS_MAXIMIZEBOX;

			var WINSTYLE_HEX_TO_NAME = {'0x00800000':'WS_BORDER','0x00C00000':'WS_CAPTION','0x40000000':'WS_CHILD','0x40000000':'WS_CHILDWINDOW','0x02000000':'WS_CLIPCHILDREN','0x04000000':'WS_CLIPSIBLINGS','0x08000000':'WS_DISABLED','0x00400000':'WS_DLGFRAME','0x00020000':'WS_GROUP','0x00100000':'WS_HSCROLL','0x20000000':'WS_ICONIC','0x01000000':'WS_MAXIMIZE','0x00010000':'WS_MAXIMIZEBOX','0x20000000':'WS_MINIMIZE','0x00020000':'WS_MINIMIZEBOX','0x00000000':'WS_OVERLAPPED','(WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX':'WS_OVERLAPPEDWINDOW','0x80000000':'WS_POPUP','(WS_POPUP | WS_BORDER | WS_SYSMENU':'WS_POPUPWINDOW','0x00040000':'WS_SIZEBOX','0x00080000':'WS_SYSMENU','0x00010000':'WS_TABSTOP','0x00040000':'WS_THICKFRAME','0x00000000':'WS_TILED','(WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX':'WS_TILEDWINDOW','0x10000000':'WS_VISIBLE','0x00200000':'WS_VSCROLL'}
			var WINSTYLE_HEX_TO_DEC = {'0x00800000':8388608,'0x00C00000':12582912,'0x40000000':1073741824,'0x40000000':1073741824,'0x02000000':33554432,'0x04000000':67108864,'0x08000000':134217728,'0x00400000':4194304,'0x00020000':131072,'0x00100000':1048576,'0x20000000':536870912,'0x01000000':16777216,'0x00010000':65536,'0x20000000':536870912,'0x00020000':131072,'0x00000000':0,'0x80000000':2147483648,'0x00040000':262144,'0x00080000':524288,'0x00010000':65536,'0x00040000':262144,'0x00000000':0,'0x10000000':268435456,'0x00200000':2097152}
			//end debug stuff
			
			while (hwndC != ostypes.NULL) {
			  //console.log('i:', i);
			  hwndC = D.GetWindow(hwndC, ostypes.GW_HWNDNEXT);

			  var rez_GWTPI = D.GetWindowThreadProcessId(hwndC, PID.address());
			  //console.log(i, 'rez_GWTPI:', rez_GWTPI.toString(), 'pid:', PID.value);
			  if (rez_GWTPI > 0 && PID.value == pid) {
				//console.log('pid found:', PID.value);
				hwndStyle = D.GetWindowLong(hwndC, ostypes.GWL_STYLE);
				//console.log('hwndStyle', hwndStyle.toString());
				var str = [];
				for (var S in WINSTYLE_NAME_TO_HEX) {
					if (hwndStyle & WINSTYLE_NAME_TO_HEX[S]) {
						str.push(S);
					}
				}
				if (str.length > 0) {
					str = ' winstyles: ' + str.join(' | ');
				} else {
					str = '';
				}
				dumpThis.push('found hwnd of pid, hwnd:"' + hwndC.toString() + '" hwndStyle:"' + hwndStyle + '"' + str);
				if ((hwndStyle & ostypes.WS_VISIBLE) && (hwndStyle & ostypes.WS_CAPTION)) {
				//var rawrrr = undefined;
				//if (rawrrr) {
				   var rez_WFW = winFocusWindow(hwndC);
				   //console.log('rez_WFW:', rez_WFW);
				  if (!rez_WFW) {
					throw new Error('failed to focus most recent window');
				  }
				  OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump.txt'), 'yay focused it, the pid of window was: ' + pid + ' and handle of window was: ' + hwndC.toString() + '\n\ndumpReport' + dumpThis.join('\n'), {encoding:'utf-8'});
				  return 'yay focused it, the pid of window was: ' + pid + ' and handle of window was: ' + hwndC.toString();
				  break;
				}
			  }
			  i++;
			  if (i >= 3000) {
				//console.warn('breaking because went through too many windows, i:', i);
				OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump.txt'), 'could not find most recent window of pid: ' + pid + '\n\ndumpReport' + dumpThis.join('\n'), {encoding:'utf-8'});
				throw new Error('could not find most recent window of this pid')
				break;
			  }
			}
			
			//end - focus most recent window of profile
			
			break;
		case 'linux':
		case 'freebsd':
		case 'openbsd':
		case 'sunos':
		case 'webos': // Palm Pre
		case 'android': //profilist doesnt support android (i dont think android has profiles, im not sure) but i include here anyways as its linux
			//start - try to open libX11
			if (!lib.libX11) {
				lib.libX11 = returnFirstLibThatOpens(['libX11.so.6', 'libX11.so.7', 'libX11.so.61.0', 'libX11.so']);
			}
			//end - try to open libX11
			
			
			var focusThisPID = rez_QPL;
			
			
			///////////////////////
	//start - type constants
	X11Atom = ctypes.unsigned_long;
	X11Bool = ctypes.int;
	X11Display = new ctypes.StructType('Display');
	X11Window = ctypes.unsigned_long;
	X11Status = ctypes.int;
	//end - type constants
	
	//start - constants
	var XA_CARDINAL = 6; //https://github.com/foudfou/FireTray/blob/d0c49867ea7cb815647bf13f2f1edb26439506ff/src/modules/ctypes/linux/x11.jsm#L117
	None = 0; //https://github.com/foudfou/FireTray/blob/d0c49867ea7cb815647bf13f2f1edb26439506ff/src/modules/ctypes/linux/x11.jsm#L63
	Success = 0;
	//end - constants

	/*
	 * typedef struct {
	 *     int type;
	 *     unsigned long serial;	/ * # of last request processed by server * /
	 *     Bool send_event;			/ * true if this came from a SendEvent request * /
	 *     Display *display;		/ * Display the event was read from * /
	 *     Window window;
	 *     Atom message_type;
	 *     int format;
	 *     union {
	 *         char b[20];
	 *         short s[10];
	 *         long l[5];
	 *     } data;
	 * } XClientMessageEvent;
	 */
	XClientMessageEvent = new ctypes.StructType('XClientMessageEvent', [
		{'type': ctypes.int},
		{'serial': ctypes.unsigned_long},
		{'send_event': X11Bool},
		{'display': X11Display.ptr},
		{'window': X11Window},
		{'message_type': X11Atom},
		{'format': ctypes.int},
		{'l0': ctypes.long},
		{'l1': ctypes.long},
		{'l2': ctypes.long},
		{'l3': ctypes.long},
		{'l4': ctypes.long}
	]);

	/*
	 * Status XFetchName(
	 *    Display*		display,
	 *    Window		w,
	 *    char**		window_name_return
	 * );
	 */
	XFetchName = lib.libX11.declare('XFetchName', ctypes.default_abi, X11Status,
		X11Display.ptr, X11Window, ctypes.char.ptr.ptr);

	/*
	 * Status XQueryTree(
	 *    Display*		display,
	 *    Window		w,
	 *    Window*		root_return,
	 *    Window*		parent_return,
	 *    Window**		children_return,
	 *    unsigned int*	nchildren_return
	 * );
	 */
	XQueryTree = lib.libX11.declare('XQueryTree', ctypes.default_abi, X11Status,
		X11Display.ptr, X11Window, X11Window.ptr, X11Window.ptr, X11Window.ptr.ptr,
		ctypes.unsigned_int.ptr);

	/*
	 * int XFree(
	 *    void*		data
	 * );
	 */
	XFree = lib.libX11.declare('XFree', ctypes.default_abi, ctypes.int, ctypes.voidptr_t);

	/*
	 * Display *XOpenDisplay(
	 *     _Xconst char*	display_name
	 * );
	 */
	XOpenDisplay = lib.libX11.declare('XOpenDisplay', ctypes.default_abi, X11Display.ptr,
		ctypes.char.ptr);

	/*
	 * int XCloseDisplay(
	 *     Display*		display
	 * );
	 */
	XCloseDisplay = lib.libX11.declare('XCloseDisplay', ctypes.default_abi, ctypes.int,
		X11Display.ptr);

	/*
	 * int XFlush(
	 *     Display*		display
	 * );
	 */
	XFlush = lib.libX11.declare('XFlush', ctypes.default_abi, ctypes.int, X11Display.ptr);

	/*
	 * Window XDefaultRootWindow(
	 *     Display*		display
	 * );
	 */
	XDefaultRootWindow = lib.libX11.declare('XDefaultRootWindow', ctypes.default_abi,
		X11Window, X11Display.ptr);

	/*
	 * Atom XInternAtom(
	 *     Display*			display,
	 *     _Xconst char*	atom_name,
	 *     Bool				only_if_exists
	 * );
	 */
	XInternAtom = lib.libX11.declare('XInternAtom', ctypes.default_abi, X11Atom,
		X11Display.ptr, ctypes.char.ptr, X11Bool);

	/*
	 * Status XSendEvent(
	 *     Display*		display,
	 *     Window		w,
	 *     Bool			propagate,
	 *     long			event_mask,
	 *     XEvent*		event_send
	 * );
	 */
	XSendEvent = lib.libX11.declare('XSendEvent', ctypes.default_abi, X11Status,
		X11Display.ptr, X11Window, X11Bool, ctypes.long, XClientMessageEvent.ptr);

	/*
	 * int XMapRaised(
	 *     Display*		display,
	 *     Window		w
	 * );
	 */
	XMapRaised = lib.libX11.declare('XMapRaised', ctypes.default_abi, ctypes.int,
		X11Display.ptr, X11Window);

	/*
	 * extern int XGetWindowProperty(
	 *     Display*		 display,
	 *     Window		 w,
	 *     Atom		 property,
	 *     long		 long_offset,
	 *     long		 long_length,
	 *     Bool		 delete,
	 *     Atom		 req_type,
	 *     Atom*		 actual_type_return,
	 *     int*		 actual_format_return,
	 *     unsigned long*	 nitems_return,
	 *     unsigned long*	 bytes_after_return,
	 *     unsigned char**	 prop_return
	 * );
	 */
	XGetWindowProperty = lib.libX11.declare('XGetWindowProperty', ctypes.default_abi,
		ctypes.int, X11Display.ptr, X11Window, X11Atom, ctypes.long, ctypes.long,
		X11Bool, X11Atom, X11Atom.ptr, ctypes.int.ptr, ctypes.unsigned_long.ptr,
		ctypes.unsigned_long.ptr, ctypes.char.ptr.ptr);

	////////////////////////
	////END DECLARATIONS
	////////////////////////
	
	var _x11Display = XOpenDisplay(null);
	if (!_x11Display) {
		throw new Error('Integration: Could not open display; not activating');
		return;
	}	


	var _x11RootWindow = XDefaultRootWindow(_x11Display);
	if (!_x11RootWindow) {
		throw new Error('Integration: Could not get root window; not activating');
		return;
	}

	//start - WindowsMatchingPid from  http://stackoverflow.com/questions/151407/how-to-get-an-x11-window-from-a-process-id
	//start - searchForPidStartingAtWindow func
	var _atomPIDInited = false;
	var _matchingWins = [];
	var searchForPidStartingAtWindow = function (w, _disp, targetPid, isRecurse) { // when you call must always leave isRecurse null or false, its only used by the function to identify when to clear out _matchingWins
		if (!isRecurse) {
			//user just called this function so clear _matchingWins
			_matchingWins = [];
		}
		//console.log('h1');
		//make sure to clear _matchingWins arr before running this
		/*
		if (!_atomPIDInited) {
			var fetchAtomsForNames = ['_NET_WM_PID', '_NET_WM_USER_TIME', '_NET_WM_WINDOW_TYPE', '_NET_WM_WINDOW_TYPE_NORMAL'];
			fetchAtomsForNames.forEach(function(atomName) {
				if (!D[atomName]) {
					D[atomName] = XInternAtom(_disp, atomName, true);
					if(D[atomName] == None) {
						//console.error('No such atom ("' + atomName + '"), D[atomName]:', D[atomName]);
						throw new Error('No such atom ("' + atomName + '"), D[atomName]:' + D[atomName]);
					}
				}
			});
			_atomPIDInited = true;
		}
		*/
		
		
		var windowMatchesPID = false;
		
		//start - get pid
		var pid = xGetWinProp(_disp, w, '_NET_WM_PID', XA_CARDINAL, ctypes.unsigned_long, true);
		if (pid == None) {
			//console.warn('failed to get pid');
			pid = null;
		} else {
			//debugOut.push('pid got:"' + pid + '"');
			//debugOutWRITE(true);
			if (ctypes.UInt64.compare(pid, ctypes.UInt64(targetPid)) == 0) { //if == 0 then they are equal
				//console.log('pid match at', pid.toString(), targetPid);
				windowMatchesPID = true;
				_matchingWins.push({'window': w});
			}
		}
		
		//start - get extar stuff if pid is right
		if (windowMatchesPID) { //only bother to get time access if the pid matches
			var lasttime = xGetWinProp(_disp, w, '_NET_WM_USER_TIME', XA_CARDINAL, ctypes.unsigned_long, true);
			if (lasttime == None) {
				//no lasttime on this win
			} else {
				_matchingWins[_matchingWins.length-1].lasttime = lasttime.toString();
			}
			
			var fetchProp = xGetWinProp(_disp, w, '_NET_WM_WINDOW_TYPE', 1, X11Atom, false);
			if (fetchProp != None) {
				_matchingWins[_matchingWins.length-1]._NET_WM_WINDOW_TYPE = fetchProp.toString();
			}
			
			var fetchProp = xGetWinProp(_disp, w, '_NET_WM_ICON', XA_CARDINAL, ctypes.unsigned_long, false);
			if (fetchProp != None) {
				_matchingWins[_matchingWins.length-1]._NET_WM_ICON = fetchProp;
				//debugOut.push('icon on this window is:' + fetchProp);
			}
		}
		//end - get extar stuff if pid is right

		// recurse into child windows
		var wRoot = new X11Window();
		var wParent = new X11Window();
		var wChild = new X11Window.ptr();
		var nChildren = new ctypes.unsigned_int();
		
		var rez = XQueryTree(_disp, w, wRoot.address(), wParent.address(), wChild.address(), nChildren.address());
		if(rez != 0) { //can probably test this against `None` instead of `0`
			var nChildrenCasted = ctypes.cast(nChildren, ctypes.unsigned_int).value;
			//console.log('nChildrenCasted:', nChildrenCasted);
			
			if (nChildrenCasted > 0) {
				var wChildCasted = ctypes.cast(wChild, X11Window.array(nChildrenCasted).ptr).contents; //SAME AS: `var wChildCasted = ctypes.cast(wChild, ctypes.ArrayType(X11Window, nChildrenCasted).ptr).contents;`
				
				for(var i=0; i<wChildCasted.length; i++) {
					var wChildElementCasted = wChildCasted.addressOfElement(i).contents; //DO NOT DO `var wChildElementCasted = ctypes.cast(wChildCasted.addressOfElement(i), X11Window).value;`, it crashes on line 234 when passing as `w` into `XGetWindowProperty`
					//console.log('wChildElementCasted:', wChildElementCasted, 'w:', w);
					searchForPidStartingAtWindow(wChildElementCasted, _disp, targetPid, true);
				}
			} else {
				console.log('this window has no children, nChildrenCasted:', nChildrenCasted);
			}
		} else {
			//console.warn('XQueryTree failed:', rez);
			//throw new Error('XQueryTree failed:' + rez); //i dont think this is a massive fail
			
		}
		
		return _matchingWins;
	}
	//end - searchForPidStartingAtWindow func
	
	debugOutCLEAR();
	var wins = searchForPidStartingAtWindow(_x11RootWindow, _x11Display, focusThisPID); //dont pass isRecurse here, important, otherwise if use this func multiple times, you'll have left over windows in the returned array from a previous run of this func
	//console.log('wins:', wins);
	debugOutWRITE();
	
	//find win with most recent time
	var mostRecentTime = 0;
	var mostRecentWin = 0;
	var lastWinWithLastTime = -1;
	var firstWin = -1; //first one with last time
	var lastNoLastTimeAfterFirstWin;
	var firstNoLastTimeAfterFirstWin;
	for (var i=0; i<wins.length; i++) {
		if (wins[i].lasttime) {
			if (firstWin == -1) {
				firstWin = i;
				continue;
			} else if (firstNoLastTimeAfterFirstWin !== -1) {
				lastWinWithLastTime = i;
				break;
			}
			OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump3.txt'), 'found at i:' + i + ' it is:' + uneval(wins[i]), {encoding:'utf-8'}); //debug
			//break;
		} else {
			if (firstWin != -1) {
				firstNoLastTimeAfterFirstWin = i;
				OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump3.txt'), 'found at i:' + i + ' it is:' + uneval(wins[i]), {encoding:'utf-8'}); //debug
			}
		}
	}
	
	if (lastWinWithLastTime !== -1) {
		//focus it now
		//start - activate window
		OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump2.txt'), 'wins:' + uneval(wins).split('}, {').join('},\n{') + '\n\nwill focus this guy: ' + uneval(wins[lastWinWithLastTime]), {encoding:'utf-8'}); //debug
		var event = new XClientMessageEvent();
		event.type = 33; /* ClientMessage*/
		event.serial = 0;
		event.send_event = 1;
		event.message_type = XInternAtom(_x11Display, '_NET_ACTIVE_WINDOW', 0); //need this here so get right display
		event.display = _x11Display;
		event.window = wins[lastWinWithLastTime].window;
		event.format = 32;
		event.l0 = 2;
		var mask = 1 << 20 /* SubstructureRedirectMask */ | 1 << 19 /* SubstructureNotifyMask */ ;
		if (XSendEvent(_x11Display, _x11RootWindow, 0, mask, event.address())) {
			XMapRaised(_x11Display, wins[lastWinWithLastTime].window);
			XFlush(_x11Display);
			//console.info("Integration: Activated successfully");
			OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'worker_dump.txt'), 'succesfully done', {encoding:'utf-8'}); //debug
		} else {
			throw new Error("Integration: An error occurred activating the window");
		}
		//end - activate window
		
		
		return true;
	} else {
		//console.warn('no most recent window found'); //just a warning, but its weird how is it running but no most recent window found, so lets throw this
		throw new Error('no most recent window found');
		return false;
	}
	//end - WindowsMatchingPid
	
	XCloseDisplay(_x11Display);

	//_X11BringToForeground(win, intervalID);
			///////////////////////
			
			break;
		case 'darwin':
			throw new Error('focusing most recent window not yet supported on Mac OS X');
			
			var pid = rez_QPL;
			
			break;
		
		default:
			throw new Error('OS not recognized for queryProfileLocked, OS is: "' + OS.Constants.Sys.Name + '"');
	}
	/////////////////////////////////////////////////////////////////////////////
	
}

var debugOut = [];

function xGetWinProp(_DISP, tWin, tAtomName, tPropType, tPropDataCType, SINGLE) {
//this func is meant for getting properties that have just single value, but can be easily just needs slight mod to make handle multi. mod needed is to make it not error out on finding nElements == 1 and return the array
//tPropDataCType should be like `ctypes.unsigned_long`
//tPropType = XA_CARDINAL
//(win, propertyName, propertyType)
	if (!D[tAtomName]) {
		D[tAtomName] = XInternAtom(_DISP, tAtomName, true);
		if(D[tAtomName] == None) {
			//console.error('No such atom ("' + tAtomName + '"), D[tAtomName]:', D[tAtomName]);
			throw new Error('No such atom ("' + tAtomName + '"), D[tAtomName]:' + D[tAtomName]);
		}
	}
	var tAtom = D[tAtomName];
	
	
		var returnType = new X11Atom(),
		returnFormat = new ctypes.int(),
		nItemsReturned = new ctypes.unsigned_long(),
		nBytesAfterReturn = new ctypes.unsigned_long(),
		propData = new ctypes.char.ptr();
	
	//tAtom is the actualy XInternAtom'ed atom
	//x11 get window property
		var rez_XGWP = XGetWindowProperty(_DISP, tWin, tAtom, 0, 1024, false, tPropType, returnType.address(), returnFormat.address(), nItemsReturned.address(), nBytesAfterReturn.address(), propData.address());
		if (rez_XGWP == Success) {
			var nElements = ctypes.cast(nItemsReturned, ctypes.unsigned_int).value;
			if (tAtomName == '_NET_WM_WINDOW_TYPE') {
				debugOut.push('tAtomName = "_NET_WM_WINDOW_TYPE" | nElements:' + nElements);
			}
			if(nElements) {
				//var rezArr = [propData, nElements];
				//console.log('nElements > 0:', nElements, '(should always be one, as per window should have only one pid, but its an array so lets loop through just to make sure)');
				
				
				if (SINGLE) {
					if (nElements > 1) {
						throw new Error('how on earth??? nElements is > 1, windows should only have one pid...', 'nElements:' + uneval(nElements));
					}
				}
				//var clientList = ctypes.cast(res[0], X11Window.array(nClients).ptr).contents,
				
				var dataList = ctypes.cast(propData, tPropDataCType.array(nElements).ptr).contents;
				if (SINGLE) {
					var dat = dataList.addressOfElement(0).contents;
				} else {
					var retDatArr = [];
					for (var i=0; i<nElements; i++) {
						var dat = dataList.addressOfElement(i).contents;
						retDatArr.push(dat);
						//console.log('dat:', dat);
					}
				}
				for (var i=0; i<nElements; i++) {
					var dat = dataList.addressOfElement(i).contents;
					//console.log('dat:', dat);
				}
				//debugOut.push('dat pre xfree:' + dat);
				var rezXF = XFree(propData); //i dont know if i should xfree anything // i think mamybe only xf after casting? maybe? or maybe if nElements > 0, for now going with nEl > 0
				//console.log('rez of XFree on propData:', rezXF);
				debugOut.push('rezXF on propData when nElements not 0:' + rezXF + ' | propName:' + tAtomName + ' nElements:' + nElements);
				if (SINGLE) {
					//debugOut.push('dat:' + dat);
					return dat;
				} else {
					//debugOut.push('retDatArr:' + retDatArr);
					return retDatArr;
				}
			} else {			
				var rezXF = XFree(propData); //i dont know if i should xfree anything // i think mamybe only xf after casting? maybe? or maybe if nElements > 0, for now going with nEl > 0
				debugOut.push('rezXF on propData when nElements == 0:' + rezXF + ' | propName:' + tAtomName + ' nElements:' + nElements);
				//console.log('no elements, nElements:', nElements, 'THUS meaning no pid on this window');
				return None;
			}
		} else {
			//console.warn('failed on XGetWindowProperty, rez:', rez); //i think just warn
			return None;
		}
}

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