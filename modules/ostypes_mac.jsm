var EXPORTED_SYMBOLS = ['ostypes'];
Cu.import('resource://gre/modules/ctypes.jsm');

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bi?!?!');
}

var mactypesInit = function() {
	this.is64bit = is64bit;
	this.F_GETLK = 7;
	this.F_RDLCK = 1;
	this.F_WRLCK = 3;
	this.F_UNLCK = 2;
	
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
	this.flock = new ctypes.StructType('flock', [
		{'l_start': ctypes.unsigned_long},
		{'l_len': ctypes.unsigned_long},
		{'l_pid': ctypes.int},
		{'l_type': ctypes.unsigned_short},
		{'l_whence': ctypes.unsigned_short}
	]);
}

var ostypes = new mactypesInit();