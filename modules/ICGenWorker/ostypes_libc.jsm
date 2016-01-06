var EXPORTED_SYMBOLS = ['ostypes'];

// no need to define core or import cutils as all the globals of the worker who importScripts'ed it are availble here

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bit?!?!');
}

var macTypes = function() {

	// ABIs
	this.CALLBACK_ABI = ctypes.default_abi;
	this.ABI = ctypes.default_abi;

	// C TYPES
	this.char = ctypes.char;
	this.int = ctypes.int;
	this.int16_t = ctypes.int16_t;
	this.int64_t = ctypes.int64_t;
	this.intptr_t = ctypes.intptr_t;
	this.long = ctypes.long;
	this.short = ctypes.short;
	this.size_t = ctypes.size_t;
	this.uint16_t = ctypes.uint16_t;
	this.uint32_t = ctypes.uint32_t;
	this.uintptr_t = ctypes.uintptr_t;
	this.uint64_t = ctypes.uint64_t;
	this.unsigned_char = ctypes.unsigned_char;
	this.unsigned_long = ctypes.unsigned_long;
	this.void = ctypes.void_t;
	
	// ADV C TYPES
	this.time_t = this.long; // https://github.com/j4cbo/chiral/blob/3c66a8bb64e541c0f63b04b78ec2d0ffdf5b473c/chiral/os/kqueue.py#L34 AND also based on this github search https://github.com/search?utf8=%E2%9C%93&q=time_t+ctypes&type=Code&ref=searchresults AND based on this answer here: http://stackoverflow.com/a/471287/1828637

	// STRUCTURES
	// consts for structures
	var struct_const = {

	};

	// SIMPLE STRUCTS // based on any of the types above
	
	// FUNCTION TYPES
	
	// STRUCTS USING FUNC TYPES
	
	// GUESS TYPES
	this.FILE = ctypes.void_t; // not really a guess, i just dont have a need to fill it
}

var libcInit = function() {
	var self = this;

	this.IS64BIT = is64bit;

	this.TYPE = new macTypes();

	// CONSTANTS
	var _const = {}; // lazy load consts
	this.CONST = {
		//get CGRectNull () { if (!('CGRectNull' in _const)) { _const['CGRectNull'] = lib('CoreGraphics').declare('CGRectNull', self.TYPE.CGRect); } return _const['CGRectNull']; }, // lazy loaded const
		
	};

	var _lib = {}; // cache for lib
	var lib = function(path) {
		//ensures path is in lib, if its in lib then its open, if its not then it adds it to lib and opens it. returns lib
		//path is path to open library
		//returns lib so can use straight away

		if (!(path in _lib)) {
			//need to open the library
			//default it opens the path, but some things are special like libc in mac is different then linux or like x11 needs to be located based on linux version
			switch (path) {
				case 'libc':

						switch (core.os.name) {
							case 'darwin':
								_lib[path] = ctypes.open('libc.dylib');
								break;
							case 'freebsd':
								_lib[path] = ctypes.open('libc.so.7');
								break;
							case 'openbsd':
								_lib[path] = ctypes.open('libc.so.61.0');
								break;
							case 'android':
							case 'sunos':
							case 'netbsd': // physically unverified
							case 'dragonfly': // physcially unverified
								_lib[path] = ctypes.open('libc.so');
								break;
							case 'linux':
								_lib[path] = ctypes.open('libc.so.6');
								break;
							case 'gnu/kfreebsd': // physically unverified
								lib = ctypes.open('libc.so.0.1');
								break;
							default:
								throw new Error({
									name: 'watcher-api-error',
									message: 'Path to libc on operating system of , "' + OS.Constants.Sys.Name + '" is not supported for kqueue'
								});
						}

					break;
				default:
					try {
						_lib[path] = ctypes.open(path);
					} catch (ex) {
						throw new Error({
							name: 'addon-error',
							message: 'Could not open ctypes library path of "' + path + '"',
							ex_msg: ex.message
						});
					}
			}
		}
		return _lib[path];
	};

	// start - function declares
	var _api = {};
	this.API = function(declaration) { // it means ensureDeclared and return declare. if its not declared it declares it. else it returns the previously declared.
		if (!(declaration in _api)) {
			_api[declaration] = preDec[declaration](); //if declaration is not in preDec then dev messed up
		}
		return _api[declaration];
	};

	// start - predefine your declares here
	var preDec = { //stands for pre-declare (so its just lazy stuff) //this must be pre-populated by dev // do it alphabateized by key so its ez to look through
		popen: function() {
			/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man3/popen.3.html
			 * FILE *popen(
			 *   const char *command,
			 *   const char *mode
			 * );
			 */
			return lib('libc').declare('popen', self.TYPE.ABI,
				self.TYPE.FILE.ptr,		// return
				self.TYPE.char.ptr,		// *command
				self.TYPE.char.ptr		// *mode
			);
		},
		pclose: function() {
			/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man3/popen.3.html
			 * int pclose(
			 *   FILE *stream
			 * );
			 */
			return lib('libc').declare('pclose', self.TYPE.ABI,
				self.TYPE.int,			// return
				self.TYPE.FILE.ptr		// *stream
			);
		},
	};
	// end - predefine your declares here
	// end - function declares

	this.HELPER = {
		
	};
}

var ostypes = new libcInit();