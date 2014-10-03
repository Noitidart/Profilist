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

/****/
var user32 = ctypes.open('user32.dll');

var msgBox = user32.declare('MessageBoxW',
                         ctypes.winapi_abi,
                         ctypes.int32_t,
                         ctypes.int32_t,
                         ctypes.jschar.ptr,
                         ctypes.jschar.ptr,
                         ctypes.int32_t);
/****/

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
			if (!('libc' in lib)) {
				var libsToTry = ['libc.so.6', 'libc.so.7', 'libc.so.61.0', 'libc.so'];
				for (var i=0; i<libsToTry.length; i++) {
					try {
						ctypes.open(libsToTry);
						break; //only gets here if succesfully opens
					} catch(ex) {
						if (ex.message == 'couldn\'t open library ' + libsToTry[i]) {
							//its ok keep going
							if (i == libsToTry.length - 1)  {
								throw new Error('None of the libraries to try could be opened, OS is: "' + OS.Constants.Sys.Name + '"');
							}
						} else {
							throw ex;
						}
					}
				}
			}
			//end - try to open libc
			
			if (!('F_GETLK' in D)) {
				D.F_GETLK = 5;
				D.F_RDLCK = 0;
				D.F_WRLCK = 1;
				D.F_UNLCK = 2;
				
				/* http://linux.die.net/man/2/fcntl
				 * typedef struct flock {
				 * ...
				 * short l_type;     //Type of lock: F_RDLCK, F_WRLCK, F_UNLCK
				 * short l_whence;   //How to interpret l_start: SEEK_SET, SEEK_CUR, SEEK_END
				 * off_t l_start;    //Starting offset for lock
				 * off_t l_len;      //Number of bytes to lock
				 * pid_t l_pid;      //PID of process blocking our lock (F_GETLK only) 
				 * ...
				 * };
				 */
				//order matters:
				// http://chat.stackexchange.com/transcript/message/17822233#17822233
				// https://ask.mozilla.org/question/1134/order-of-strcuture-matters-test-case-flock-for-use-by-fcntl/
				D.flock = new ctypes.StructType('flock', [
					{'l_type': ctypes.unsigned_short},
					{'l_whence': ctypes.unsigned_short},
					{'l_start': ctypes.unsigned_long},
					{'l_len': ctypes.unsigned_long},
					{'l_pid': ctypes.int}
				]);
			}
			
			var fcntl = checkFcntl(lockPaths.unixFcntl, retPid);
			if (fcntl === -1) {
				var sym = checkSym(lockPaths.unixSym);
				if (sym === -1) {
					throw new Error('Could not verify if profile is in use via fcntl NOR sym');
				} else {
					return sym;
				}
			} else {
				return fcntl;
			}
			
			break;
		case 'darwin':
			if (!('libc' in lib)) {
				libc = ctypes.open('libc.dylib');
			}
			
			if (!('F_GETLK' in D)) {
				D.F_GETLK = 7;
				D.F_RDLCK = 1;
				D.F_WRLCK = 3;
				D.F_UNLCK = 2;
				
				/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man2/fcntl.2.html
				 *       struct flock {
				 *           off_t       l_start;    // starting offset
				 *           off_t       l_len;      // len = 0 means until end of file
				 *           pid_t       l_pid;      // lock owner
				 *           short       l_type;     // lock type: read/write, etc.
				 *           short       l_whence;   // type of l_start
				 *       };
				 */
				//order matters:
				// http://chat.stackexchange.com/transcript/message/17822233#17822233
				// https://ask.mozilla.org/question/1134/order-of-strcuture-matters-test-case-flock-for-use-by-fcntl/
				D.flock = new ctypes.StructType('flock', [
					{'l_start': ctypes.unsigned_long},
					{'l_len': ctypes.unsigned_long},
					{'l_pid': ctypes.int},
					{'l_type': ctypes.unsigned_short},
					{'l_whence': ctypes.unsigned_short}
				]);
			}
			
			var fcntl = checkFcntl(lockPaths.unixFcntl, retPid);
			if (fcntl === -1) {
				var sym = checkSym(lockPaths.macSym);
				if (sym === -1) {
					throw new Error('Could not verify if profile is in use via fcntl NOR sym');
				} else {
					return sym == 1 ? true : false;
				}
			} else {
				return fcntl == 1 ? true : false;
			}
			
			break;
		
		default:
			throw new Error('OS not recognized for queryProfileLocked, OS is: "' + OS.Constants.Sys.Name + '"');
	}
}

function checkFnctl(lockPath, retPid) {
	//supports queryProfileLocked
	//returns:
	//0 = NOT locked
	//1 = LOCKED
	//-1 = fnctl failed (fnctl not available)
	
	if (!('fcntl' in D)) {
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
				flock.ptr
			);
		} catch(ex) {
			//fcntl not available
			return -1;
		}
	}
	
	if (!('openFd' in D)) {
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
	
	if (!('closeFd' in D)) {
		D.closeFd = _libc.declare(
			'close',
			ctypes.default_abi,
			ctypes.int, // retval
			ctypes.int // fd
		);
	}
	
	var fd = openFd(lockPath, OS.Constants.libc.O_RDWR | OS.Constants.libc.O_CREAT); //setting this to O_RDWR fixes errno of 9 on fcntl
	if (fd == -1) {
		//if file does not exist and O_CREAT was not set. errno is == 2
		//if file is a dangling symbolic link. errno is == 2
		//console.error('failed to open file, fd:', fd, 'errno:', ctypes.errno);
		return -1;
	}
	
	try {
		var testlock = new flock();
		testlock.l_type    = F_WRLCK; //can use F_RDLCK but keep openFd at O_RDWR, it just works
		testlock.l_start   = 0;
		testlock.l_whence  = OS.Constants.libc.SEEK_SET;
		testlock.l_len     = 0;
		
		var rez = fcntl(fd, F_GETLK, testlock.address());
		//console.log('rez:', rez);
		if (rez != -1) {
			//check testlock.l_type
			//console.log('testlock:', uneval(testlock));
			if (retPid) {
				return parseInt(testlock.l_pid);
			} else {
				return parseInt(testlock.l_pid) == 0 ? 0 : 1;
			}
			/*
			if (testlock.l_type == F_UNLCK) {
				//can also test if testlock.l_pid is not 0
				//console.info('file is NOT locked');
				return 0;
			} else if (testlock.l_type == F_WRLCK) {
				//console.info('file is WRITE LOCKED, it may be read locked too');
				return 1;
			} else if (testlock.l_type == F_RDLCK) {
				//console.info('file is NOT write locked but just READ LOCKED'); //we know this because testlock tested for write lock first
				return 1;
			} else {
				//console.error('testlock.l_type is unknown, l_type:', testlock.l_type);
				return 1; //even though its unknown we return 1, meanings it locked
			}
			*/
		} else {
			//console.log('rez was -1, errno', ctypes.errno);
			retNeg1
		}
	} finally {
		var rez = closeFd(fd);
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
	} else if (rez_QPL === 1) {
		//continue
	} else {
		throw new Error('huhhh?? should never get here');
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
			var styleIsInAltTab = ostypes.WS_VISIBLE | ostypes.WS_CAPTION;
			
			while (hwndC != ostypes.NULL) {
			  //console.log('i:', i);  
			  hwndC = D.GetWindow(hwndC, ostypes.GW_HWNDNEXT);

			  var rez_GWTPI = D.GetWindowThreadProcessId(hwndC, PID.address());
			  //console.log(i, 'rez_GWTPI:', rez_GWTPI.toString(), 'pid:', PID.value);
			  if (rez_GWTPI > 0 && PID.value == pid) {
				//console.log('pid found:', PID.value);
				hwndStyle = D.GetWindowLong(hwndC, ostypes.GWL_STYLE);
				//console.log('hwndStyle', hwndStyle.toString());
				if (hwndStyle & ostypes.WS_VISIBLE) {
				   var rez_WFW = winFocusWindow(hwndC);
				   //console.log('rez_WFW:', rez_WFW);
				  if (!rez_WFW) {
					throw new Error('failed to focus most recent window');
				  }
				  break;
				}
			  }
			  i++;
			  if (i >= 3000) {
				//console.warn('breaking because went through too many windows, i:', i);
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
			//start - try to open libc
			if (!('libX11' in lib)) {
				var libsToTry = ['libX11.so.6', 'libX11.so.7', 'libX11.so.61.0', 'libX11.so'];
				for (var i=0; i<libsToTry.length; i++) {
					try {
						ctypes.open(libsToTry);
						break; //only gets here if succesfully opens
					} catch(ex) {
						if (ex.message == 'couldn\'t open library ' + libsToTry[i]) {
							//its ok keep going
							if (i == libsToTry.length - 1)  {
								throw new Error('None of the libraries to try could be opened, OS is: "' + OS.Constants.Sys.Name + '"');
							}
						} else {
							throw ex;
						}
					}
				}
			}
			//end - try to open libc
			
			
			var pid = rez_QPL;
			
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