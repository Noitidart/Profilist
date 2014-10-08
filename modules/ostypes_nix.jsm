var EXPORTED_SYMBOLS = ['ostypes'];

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bi?!?!');
}

var nixtypesInit = function() {
	this.is64bit = is64bit;
	
	this.F_GETLK = 5;
	this.F_RDLCK = 0;
	this.F_WRLCK = 1;
	this.F_UNLCK = 2;
	
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
	this.flock = new ctypes.StructType('flock', [
		{'l_type': ctypes.unsigned_short},
		{'l_whence': ctypes.unsigned_short},
		{'l_start': ctypes.unsigned_long},
		{'l_len': ctypes.unsigned_long},
		{'l_pid': ctypes.int}
	]);
}

var ostypes = new nixtypesInit();