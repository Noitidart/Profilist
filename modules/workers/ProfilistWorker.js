importScripts('resource://gre/modules/workers/require.js');
var PromiseWorker = require('chrome://profilist/content/modules/workers/PromiseWorker.js');
importScripts('resource://gre/modules/osfile.jsm')
var lib = {};
var D = {}; //D means declared

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
function queryProfileLocked(IsRelative, Path, rootPathDefault) {
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
					return true;
				} else {
					throw new Error('Could not open profile lock file and it was NOT locked. Path:' + lockPaths.win + ' ex:' + ex);
				}
			}
			//its NOT locked
			aVal.close();
			return false;
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
			
			var fcntl = checkFcntl(lockPaths.unixFcntl);
			if (fcntl === -1) {
				var sym = checkSym(lockPaths.unixSym);
				if (sym === -1) {
					throw new Error('Could not verify if profile is in use via fcntl NOR sym');
				} else {
					return sym == 1 ? true : false;
				}
			} else {
				return fcntl == 1 ? true : false;
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
			
			var fcntl = checkFcntl(lockPaths.unixFcntl);
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
}