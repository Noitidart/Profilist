var EXPORTED_SYMBOLS = ['ostypes'];

// no need to define core or import cutils as all the globals of the worker who importScripts'ed it are availble here

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bit?!?!');
}

var ifdef_UNICODE = true;

var winTypes = function() {

	// ABIs
	if (is64bit) {
	  this.CALLBACK_ABI = ctypes.default_abi;
	  this.ABI = ctypes.default_abi;
	} else {
	  this.CALLBACK_ABI = ctypes.stdcall_abi;
	  this.ABI = ctypes.winapi_abi;
	}

	// C TYPES
	this.char = ctypes.char;
	this.int = ctypes.int;
	this.size_t = ctypes.size_t;
	this.void = ctypes.void_t;

	// SIMPLE TYPES // based on ctypes.BLAH // as per WinNT.h etc
	this.LONG = ctypes.long;
	this.LPCVOID = ctypes.voidptr_t;
	this.UINT = ctypes.unsigned_int;
	this.VOID = ctypes.void_t;
	
	// STRUCTURES
	// consts for structures
	var struct_const = {

	};

	// SIMPLE STRUCTS // based on any of the types above

	// FUNCTION TYPES
	
	// GUESS TYPES
	
	// STRUCTS USING FUNC TYPES

}

var winInit = function() {
	var self = this;

	this.IS64BIT = is64bit;

	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		SHCNE_ASSOCCHANGED: 0x8000000,
		SHCNE_UPDATEITEM: 0x02000,
		SHCNF_IDLIST: 0x0000
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
		SHChangeNotify: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/bb762118%28v=vs.85%29.aspx
			 * void SHChangeNotify(
			 *   __in_		LONG wEventId,
			 *   __in_		UINT uFlags,
			 *   __in_opt_	LPCVOID dwItem1,
			 *   __in_opt_	LPCVOID dwItem2
			 * );
			 */
			return lib('shell32').declare('SHChangeNotify', self.TYPE.ABI,
				self.TYPE.VOID,		// return
				self.TYPE.LONG,		// wEventId
				self.TYPE.UINT,		// uFlags
				self.TYPE.LPCVOID,	// dwItem1
				self.TYPE.LPCVOID	// dwItem2
			);
		}
	};
	// end - predefine your declares here
	// end - function declares

	this.HELPER = {
		
	};
}

var ostypes = new winInit();