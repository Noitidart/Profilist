//todo: figure out if for 64bit the abis are different as done here: https://gist.github.com/Noitidart/1f9d574451b8aaaef219#file-_ff-addon-snippet-winapi_getrunningpids-js-L16
//todo: work on jscGetDeepest, in EnuMWindows it goes berserk but doesnt error, good place to experiemnt

var EXPORTED_SYMBOLS = ['ostypes'];
//const {utils: Cu} = Components;
//Cu.import('resource://gre/modules/ctypes.jsm');
//Cu.reportError('os:' + os);

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bit?!?!');
}

var winTypes = function() {
	// SIMPLE TYPES
	this.BOOL = ctypes.bool;
	this.USHORT = ctypes.unsigned_short;
	this.BYTE = ctypes.unsigned_char;
	this.INT = ctypes.int;
	this.INT_PTR = is64bit ? ctypes.int64_t : ctypes.int;
	this.UINT = ctypes.unsigned_int;
	this.UINT_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_int;
	this.WORD = this.USHORT;
	this.DWORD = ctypes.uint32_t;
	this.LPDWORD = this.DWORD.ptr;
	this.PVOID = ctypes.voidptr_t;
	this.LPVOID = ctypes.voidptr_t;
	this.LONG = ctypes.long;
	this.PLONG = this.LONG.ptr;
	this.LONG_PTR = ctypes.intptr_t; //is64bit ? ctypes.int64_t : ctypes.long;
	this.ULONG = ctypes.unsigned_long;
	this.PULONG = this.ULONG.ptr;
	this.ULONG_PTR = ctypes.uintptr_t; //is64bit ? ctypes.uint64_t : ctypes.unsigned_long;
	this.SIZE_T = this.ULONG_PTR;
	this.DWORD_PTR = this.ULONG_PTR;
	this.ATOM = this.WORD;
	this.HANDLE = ctypes.voidptr_t;
	this.HWND = this.HANDLE;
	this.HICON = this.HANDLE;
	this.HINSTANCE = this.HANDLE;
	this.HMODULE = this.HANDLE;
	this.HMENU = this.HANDLE;
	this.HBRUSH = this.HICON;
	this.HCURSOR = this.HANDLE;
	this.HHOOK = this.HANDLE;
	this.HDC = this.HANDLE;
	this.HGDIOBJ = this.HANDLE;
	this.HBITMAP = this.HANDLE;
	this.HFONT = this.HANDLE;
	this.TCHAR = ctypes.jschar, // Mozilla compiled with UNICODE/_UNICODE macros and wchar_t = jschar
	this.LPSTR = ctypes.char.ptr;
	this.LPCSTR = ctypes.char.ptr;
	this.LPTSTR = ctypes.jschar.ptr; // UNICODE
	this.LPCTSTR = ctypes.jschar.ptr;
	this.LPWSTR = ctypes.jschar.ptr; // WCHAR
	this.LRESULT = this.LONG_PTR;
	this.WPARAM = this.UINT_PTR;
	this.LPARAM = ctypes.size_t; // this.LONG_PTR;
	this.FARPROC = ctypes.voidptr_t; // typedef INT_PTR (FAR WINAPI *FARPROC)();
	this.COLORREF = this.DWORD; // 0x00bbggrr
	this.LPHANDLE = this.HANDLE.ptr;
	
	
	this.LPCVOID = ctypes.voidptr_t;
	this.RM_APP_TYPE = ctypes.unsigned_int;
	this.VOID = ctypes.void_t;
	this.WCHAR = ctypes.jschar;
	
	// ADVANCED TYPES
	this.NTSTATUS = this.LONG;
	this.SYSTEM_INFORMATION_CLASS = this.INT;
	this.WNDENUMPROC = ctypes.FunctionType(ctypes.default_abi, this.BOOL, [this.HWND, this.LPARAM]);
	
	this.PCWSTR = new ctypes.PointerType(this.WCHAR);
	this.LPCWSTR = this.PCWSTR;
	
	if (ctypes.size_t.size == 8) {
	  this.CallBackABI = ctypes.default_abi;
	  this.WinABI = ctypes.default_abi;
	} else {
	  this.CallBackABI = ctypes.stdcall_abi;
	  this.WinABI = ctypes.winapi_abi;
	}
	
	// STRUCTURES
	
	/* http://msdn.microsoft.com/en-us/library/windows/hardware/ff545817%28v=vs.85%29.aspx
	 * typedef struct _FILE_NAME_INFORMATION {
	 * ULONG FileNameLength;
	 * WCHAR FileName[1];
	 * } FILE_NAME_INFORMATION, *PFILE_NAME_INFORMATION;
	 */
	this.FILE_NAME_INFORMATION = ctypes.StructType('_FILE_NAME_INFORMATION', [
		{'FileNameLength': this.ULONG},
		{'FileName': ctypes.ArrayType(this.TCHAR, OS.Constants.Win.MAX_PATH * 2 * 2)}
	]);
	/* http://msdn.microsoft.com/en-us/library/windows/hardware/ff550671%28v=vs.85%29.aspx
	 * typedef struct _IO_STATUS_BLOCK {
	 *   union {
	 *     NTSTATUS Status;
	 *     PVOID    Pointer;
	 *   };
	 *   ULONG_PTR Information;
	 * } IO_STATUS_BLOCK, *PIO_STATUS_BLOCK;;
	 */
	this.IO_STATUS_BLOCK = ctypes.StructType('_IO_STATUS_BLOCK', [
		{'Status': this.NTSTATUS}, // NTSTATUS //union not supported, but i know im going to be using Status so forget the `PVOID Pointer` the doc page says Re: `PVOID Pointer`: "Reserved. For internal use only."
		{'Information': this.ULONG_PTR} //maybe make this this.PULONG, not sure
	]);
	
	//http://processhacker.sourceforge.net/doc/struct___s_y_s_t_e_m___h_a_n_d_l_e___t_a_b_l_e___e_n_t_r_y___i_n_f_o___e_x.html
	this.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX = ctypes.StructType('SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX', [ //typedef struct _TagHANDLEINFO
		{'Object': this.PVOID},
		{'UniqueProcessId': this.ULONG_PTR},
		{'HandleValue': this.ULONG_PTR},
		{'GrantedAccess': this.ULONG},
		{'CreatorBackTraceIndex': this.USHORT},
		{'HandleAttributes': this.ULONG},
		{'Reserved': this.ULONG}
	]);
	
	this.SYSTEM_HANDLE_INFORMATION_EX = ctypes.StructType('SYSTEM_HANDLE_INFORMATION_EX', [
		{'NumberOfHandles': this.ULONG},
		{'Reserved': this.ULONG},
		{'Handles': ctypes.ArrayType(this.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX, 1)}
		//{'Handles': this.TYPE.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr.array()}
	]);
	
	// start - structures used by Rstrtmgr.dll
	/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms724284%28v=vs.85%29.aspx
	 * typedef struct _FILETIME {
	 *   DWORD dwLowDateTime;
	 *   DWORD dwHighDateTime;
	 * } FILETIME, *PFILETIME;
	 */
	this.FILETIME = ctypes.StructType('_FILETIME', [
	  { 'dwLowDateTime': this.DWORD },
	  { 'dwHighDateTime': this.DWORD }
	]);
	this.PFILETIME = this.FILETIME.ptr;
	
	/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373677%28v=vs.85%29.aspx
	 * typedef struct {
	 *   DWORD    dwProcessId;
	 *   FILETIME ProcessStartTime;
	 * } RM_UNIQUE_PROCESS, *PRM_UNIQUE_PROCESS;
	*/
	this.RM_UNIQUE_PROCESS = ctypes.StructType('RM_UNIQUE_PROCESS', [
	  { 'dwProcessId': this.DWORD },
	  { 'ProcessStartTime': this.FILETIME }
	]);
	this.PRM_UNIQUE_PROCESS = this.RM_UNIQUE_PROCESS.ptr;
	
	this.CCH_RM_MAX_APP_NAME = 255; // should be in CONST section but needed for defining RM_PROCESS_INFO, so i put them there as well
	this.CCH_RM_MAX_SVC_NAME = 63; // should be in CONST section but needed for defining RM_PROCESS_INFO, so i put them there as well
	/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373674%28v=vs.85%29.aspx
	 * typedef struct {
	 *   RM_UNIQUE_PROCESS Process;
	 *   WCHAR             strAppName[CCH_RM_MAX_APP_NAME+1];
	 *   WCHAR             strServiceShortName[CCH_RM_MAX_SVC_NAME+1];
	 *   RM_APP_TYPE       ApplicationType;
	 *   ULONG             AppStatus;
	 *   DWORD             TSSessionId;
	 *   BOOL              bRestartable;
	 * } RM_PROCESS_INFO;
	 */
	this.RM_PROCESS_INFO = ctypes.StructType('RM_PROCESS_INFO', [
	  { 'Process': this.RM_UNIQUE_PROCESS },
	  { 'strAppName': this.WCHAR.array(this.CCH_RM_MAX_APP_NAME + 1) }, // WCHAR of size [CCH_RM_MAX_APP_NAME+1]
	  { 'strServiceShortName': this.WCHAR.array(this.CCH_RM_MAX_SVC_NAME + 1) }, // WCHAR of size [CCH_RM_MAX_SVC_NAME+1]
	  { 'ApplicationType': this.RM_APP_TYPE }, // integer of RM_APP_TYPE
	  { 'AppStatus': this.ULONG }, // ULONG
	  { 'TSSessionId': this.DWORD }, // DWORD
	  { 'bRestartable': this.BOOL } // BOOL
	]);

	/* http://msdn.microsoft.com/en-us/library/ff718266.aspx
	 * typedef struct {
	 *   unsigned long Data1;
	 *   unsigned short Data2;
	 *   unsigned short Data3;
	 *   byte Data4[8];
	 * } GUID, UUID, *PGUID;
	 */
	this.GUID = ctypes.StructType('GUID', [
	  { 'Data1': this.ULONG },
	  { 'Data2': this.USHORT },
	  { 'Data3': this.USHORT },
	  { 'Data4': this.BYTE.array(8) }
	]);
	this.PGUID = this.GUID.ptr;
	// end - structures used by Rstrtmgr.dll
}

var winInit = function() {
	var self = this;
	
	this.IS64BIT = is64bit;
	
	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		// GetAncestor
		GA_PARENT: 1,
		GA_ROOT: 2,
		GA_ROOTOWNER: 3, //same as if calling with GetParent

		// GetWindow
		GW_OWNER: 4,
		
		// LoadImage
		IMAGE_ICON: 1,
		LR_LOADFROMFILE: 16,
		
		// Rstrtmgr.dll
		CCH_RM_MAX_APP_NAME: 255, // this is also in TYPES because I needed it to define a struct
		CCH_RM_MAX_SVC_NAME: 63, // this is also in TYPES because I needed it to define a struct
		ERROR_SUCCESS: 0,
		ERROR_MORE_DATA: 234,
		RM_SESSION_KEY_LEN: self.TYPE.GUID.size, //https://github.com/wine-mirror/wine/blob/c87901d3f8cebfb7d28b42718c1c78035730d6ce/include/restartmanager.h#L26
		CCH_RM_SESSION_KEY: /*this.RM_SESSION_KEY_LEN*/self.TYPE.GUID.size * 2, //https://github.com/wine-mirror/wine/blob/c87901d3f8cebfb7d28b42718c1c78035730d6ce/include/restartmanager.h#L27
		RmUnknownApp: 0,
		RmMainWindow: 1,
		RmOtherWindow: 2,
		RmService: 3,
		RmExplorer: 4,
		RmConsole: 5,
		RmCritical: 1000,
		
		// SendMessage
		ICON_SMALL: 0,
		ICON_BIG: 1,
		WM_SETICON: 0x0080,
		
		// SetClassLong
		GCLP_HICON: -14,
		GCLP_HICONSM: -34,
		
		// SHChangeNotify
		SHCNE_ASSOCCHANGED: 0x8000000,
		SHCNF_IDLIST: 0x0000,
		SHCNE_UPDATEITEM: 0x02000,
		
		
		
		PROCESS_DUP_HANDLE: 0x0040,
		PROCESS_QUERY_INFORMATION: 0x0400,
		MAXIMUM_ALLOWED: 0x02000000,
		
		DUPLICATE_SAME_ACCESS: 0x00000002,

		STATUS_BUFFER_TOO_SMALL: 0xC0000023>>0,
		STATUS_INFO_LENGTH_MISMATCH: 0xC0000004>>0,
		
		FileNameInformation: 9, //https://github.com/dezelin/kBuild/blob/1046ac4032f3b455d251067f46083435ce18d9ad/src/kmk/w32/tstFileInfo.c#L40 //http://msdn.microsoft.com/en-us/library/cc232099.aspx //constant for 5th arg of NtQueryInformationFile: `__in_   FILE_INFORMATION_CLASS FileInformationClass`
		SystemExtendedHandleInformation: 64,
		
		GW_HWNDNEXT: 2,
		
		GWL_STYLE: -16,
		WS_VISIBLE: 0x10000000,
		WS_CAPTION: 0x00C00000,
		
		SW_RESTORE: 9
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
					} catch (e) {
						//console.error('Integration Level 1: Could not get open path:', path, 'e:' + e);
						throw new Error('Integration Level 1: Could not get open path:"' + path + '" e: "' + e + '"');
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
		DestroyIcon: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648063%28v=vs.85%29.aspx
			 * BOOL WINAPI DestroyIcon(
			 *   _In_  HICON hIcon
			 * );
			 */
			return lib('user32').declare('DestroyIcon', ctypes.winapi_abi,
				self.TYPE.BOOL,		// return
				self.TYPE.HICON		// hIcon
			);
		},
		EnumWindows: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633497%28v=vs.85%29.aspx
			 * BOOL WINAPI EnumWindows(
			 *   __in_  WNDENUMPROC lpEnumFunc,
			 *   __in_  LPARAM lParam
			 * );
			 */
			return lib('user32').declare('EnumWindows', ctypes.winapi_abi,
				self.TYPE.BOOL,				// return
				self.TYPE.WNDENUMPROC.ptr,	// lpEnumFunc
				self.TYPE.LPARAM			// lParam
			);
		},
		GetAncestor: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633502%28v=vs.85%29.aspx
			 * HWND WINAPI GetAncestor(
			 * __in_  HWND hwnd,
			 * __in_  UINT gaFlags
			 * );
			 */
			return lib('user32').declare('GetAncestor', ctypes.winapi_abi,
				self.TYPE.HWND,	// return
				self.TYPE.HWND,	// hwnd
				self.TYPE.UINT	// gaFlags
			);
		},
		GetWindow: function() {
			/* http://msdn.microsoft.com/en-us/library/ms633515%28v=vs.85%29.aspx
			 * HWND WINAPI GetWindow(
			 *   __in_  HWND hWnd,
			 *   __in_  UINT wCmd
			 * );
			 */
			return lib('user32').declare('GetWindow', ctypes.winapi_abi,
				self.TYPE.HWND,	// return
				self.TYPE.HWND,	// hWnd
				self.TYPE.UINT	// wCmd
			);
		},
		GetWindowThreadProcessId: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633522%28v=vs.85%29.aspx
			 * DWORD WINAPI GetWindowThreadProcessId(
			 *   __in_		HWND hWnd,
			 *   __out_opt_	LPDWORD lpdwProcessId
			 * );
			 */
			return lib('user32').declare('GetWindowThreadProcessId', ctypes.winapi_abi,
				self.TYPE.DWORD,	// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.LPDWORD	// lpdwProcessId
			);
		},
		LoadImage: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms648045%28v=vs.85%29.aspx
			 * HANDLE WINAPI LoadImage(
			 *   __in_opt_  HINSTANCE hinst,
			 *   __in_      LPCTSTR lpszName,
			 *   __in_      UINT uType,
			 *   __in_      int cxDesired,
			 *   __in_      int cyDesired,
			 *   __in_      UINT fuLoad
			 * );
			 */
			return lib('user32').declare('LoadImageW', ctypes.winapi_abi,
				self.TYPE.HANDLE,		// return
				self.TYPE.HINSTANCE,	// hinst
				self.TYPE.LPCTSTR,		// lpszName		// ctypes.char.ptr
				self.TYPE.UINT,			// uType
				self.TYPE.INT,			// cxDesired
				self.TYPE.INT,			// cyDesired
				self.TYPE.UINT			// fuLoad
			);
		},
		RmStartSession: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373668%28v=vs.85%29.aspx
			 * DWORD WINAPI RmStartSession(
			 *   __out_       DWORD *pSessionHandle,
			 *   __reserved_  DWORD dwSessionFlags,
			 *   __out_       WCHAR strSessionKey[ ]
			 * );
			 */
			return lib('Rstrtmgr.dll').declare('RmStartSession', ctypes.winapi_abi,
				self.TYPE.DWORD,		// return
				self.TYPE.DWORD.ptr,	// *pSessionHandle
				self.TYPE.DWORD,		// dwSessionFlags
				self.TYPE.WCHAR.ptr		// strSessionKey[ ]
			);
		},
		RmRegisterResources: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373663%28v=vs.85%29.aspx
			 * DWORD WINAPI RmRegisterResources(
			 *   __in_      DWORD dwSessionHandle,
			 *   __in_      UINT nFiles,
			 *   __in_opt_  LPCWSTR rgsFilenames[ ],
			 *   __in_      UINT nApplications,
			 *   __in_opt_  RM_UNIQUE_PROCESS rgApplications[ ],
			 *   __in_      UINT nServices,
			 *   __in_opt_  LPCWSTR rgsServiceNames[ ]
			 * );
			 */
			return lib('Rstrtmgr.dll').declare('RmRegisterResources', ctypes.winapi_abi,
				self.TYPE.DWORD,					// return
				self.TYPE.DWORD,					// dwSessionHandle
				self.TYPE.UINT,						// nFiles
				self.TYPE.LPCWSTR.ptr,				// rgsFilenames[ ]
				self.TYPE.UINT,						// nApplications
				self.TYPE.RM_UNIQUE_PROCESS.ptr,	// rgApplications[ ]
				self.TYPE.UINT,						// nServices
				self.TYPE.LPCWSTR.ptr				// rgsServiceNames[ ]
			);
		},
		RmGetList: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373661%28v=vs.85%29.aspx
			 * DWORD WINAPI RmGetList(
			 *   __in_         DWORD dwSessionHandle,
			 *   __out_        UINT *pnProcInfoNeeded,
			 *   __inout_      UINT *pnProcInfo,
			 *   __inout_opt_  RM_PROCESS_INFO rgAffectedApps[ ],
			 *   __out_        LPDWORD lpdwRebootReasons
			 * );
			 */
			return lib('Rstrtmgr.dll').declare('RmGetList', ctypes.winapi_abi,
				self.TYPE.DWORD, 				// return
				self.TYPE.DWORD,				// dwSessionHandle
				self.TYPE.UINT.ptr,				// *pnProcInfoNeeded
				self.TYPE.UINT.ptr,				// *pnProcInfo
				self.TYPE.RM_PROCESS_INFO.ptr,	// rgAffectedApps[ ]
				self.TYPE.LPDWORD				// lpdwRebootReasons
			);
		},
		RmEndSession: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa373659%28v=vs.85%29.aspx
			 * DWORD WINAPI RmEndSession(
			 *   __in_       DWORD dwSessionHandle
			 * );
			 */
			return lib('Rstrtmgr.dll').declare('RmEndSession', ctypes.winapi_abi,
				self.TYPE.DWORD,	// return
				self.TYPE.DWORD		// dwSessionHandle
			);
		},
		SendMessage: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms644950%28v=vs.85%29.aspx
			 * LRESULT WINAPI SendMessage(
			 *   __in_ HWND hWnd,
			 *   __in_ UINT Msg,
			 *   __in_ WPARAM wParam,
			 *   __in_ LPARAM lParam
			 * );
			 */
			return lib('user32').declare('SendMessageW', ctypes.winapi_abi,
				self.TYPE.LRESULT,		// return		// ctypes.uintptr_t
				self.TYPE.HWND,			// hWnd
				self.TYPE.UINT,			// Msg
				self.TYPE.WPARAM,		// wParam		// ctypes.int32_t
				self.TYPE.LPARAM		// lParam		// ctypes.voidptr_t
			);
		},
		SetClassLong: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633589%28v=vs.85%29.aspx
			 * I tried SetClassLongW on 32bit, and it gave me the symbol not found error
			 * ULONG_PTR WINAPI SetClassLongPtr(
			 *   __in_  HWND hWnd,
			 *   __in_  int nIndex,
			 *   __in_  LONG_PTR dwNewLong
			 * );
			 */
			 /* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633588%28v=vs.85%29.aspx
			 * I tried SetClassLongW on 32bit, and it gave me the symbol not found error
			 * DWORD WINAPI SetClassLong(
			 *   __in_  HWND hWnd,
			 *   __in_  int nIndex,
			 *   __in_  LONG dwNewLong
			 * );
			 */
			return lib('user32').declare(self.IS64BIT ? 'SetClassLongPtrW' : 'SetClassLongW', ctypes.winapi_abi,
				self.IS64BIT ? self.TYPE.ULONG_PTR : self.TYPE.DWORD,	// return
				self.TYPE.HWND,											// hWnd
				self.TYPE.INT,											// nIndex
				self.IS64BIT ? self.TYPE.LONG_PTR : self.TYPE.LONG		// dwNewLong
			);
		},
		SHChangeNotify: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/bb762118%28v=vs.85%29.aspx
			 * void SHChangeNotify(
			 *   __in_		LONG wEventId,
			 *   __in_		UINT uFlags,
			 *   __in_opt_	LPCVOID dwItem1,
			 *   __in_opt_	LPCVOID dwItem2
			 * );
			 */
			return lib('shell32.dll').declare('SHChangeNotify', ctypes.winapi_abi,
				self.TYPE.VOID,		// return
				self.TYPE.LONG,		//wEventId
				self.TYPE.UINT,		//uFlags
				self.TYPE.LPCVOID,	//dwItem1
				self.TYPE.LPCVOID	//dwItem2
			);
		}
	};
	// end - predefine your declares here
	// end - function declares
	
	this.HELPER = {
		jscGetDeepest: function(obj) {
			try {
				console.info(Math.round(Math.random() * 10) + ' starting jscGetDeepest:', obj, obj.toString());
			} catch(ignore) {}

			while (typeof obj === 'object' && obj !== null && ('contents' in obj || 'value' in obj)) {
				if ('contents' in obj) {
					try {
						obj = obj.contents;
					} catch (ex if ex.message == 'cannot get contents of undefined size') {
						console.error('breaking as got tha contents size undef error, so obj is now:', obj.toString(), obj);
						break;
					}
				} else if ('value' in obj) {
					obj = obj.value;
				}
				//console.info('loop jscGetDeepest:', obj.toString());
			}
			
			if (obj !== null && typeof obj != 'undefined') {
				obj = obj.toString();
			}
			console.info('finaled jscGetDeepest:', obj);
			return obj;
		},
		jscEqual: function(obj1, obj2) {
			// ctypes numbers equal
			// compares obj1 and obj2
			// if equal returns true, else returns false
			
			// check if equal first
			var str1 = obj1;
			var str2 = obj2;
			
			var str1 = self.HELPER.jscGetDeepest(str1); //cuz apparently its not passing by reference
			var str2 = self.HELPER.jscGetDeepest(str2); //cuz apparently its not passing by reference
			
			if (str1 == str2) {
				return true;
			} else {
				return false;
			}
		},
		memset: function memset(array, val, size) {
			/* http://stackoverflow.com/questions/24466228/memset-has-no-dll-so-how-ctype-it
			 * https://gist.github.com/nmaier/ab4bfe59e8c8fcdc5b90
			 * https://gist.github.com/Noitidart/2d9b44b18493f9339629
			 * Note that size is the number of array elements to set, not the number of bytes.
			 */
			for (var i = 0; i < size; ++i) {
				array[i] = val;
			}
		},
		readAsChar8ThenAsChar16: function(stringPtr, known_len, jschar) {
			// when reading as jschar it assumes max length of 500

			// stringPtr is either char or jschar, if you know its jschar for sure, pass 2nd arg as true
			// if known_len is passed, then assumption is not made, at the known_len position in array we will see a null char
			// i tried getting known_len from stringPtr but its not possible, it has be known, i tried this:
				//"stringPtr.contents.toString()" "95"
				//"stringPtr.toString()" "ctypes.unsigned_char.ptr(ctypes.UInt64("0x7f73d5c87650"))"
				// so as we see neither of these is 77, this is for the example of "_scratchpad/EnTeHandle.js at master · Noitidart/_scratchpad - Mozilla Firefox"

			// tries to do read string on stringPtr, if it fails then it falls to read as jschar

			var readJSCharString = function() {
				var assumption_max_len = known_len ? known_len : 500;
				var ptrAsArr = ctypes.cast(stringPtr, ctypes.unsigned_char.array(assumption_max_len).ptr).contents; // MUST cast to unsigned char (not ctypes.jschar, or ctypes.char) as otherwise i dont get foreign characters, as they are got as negative values, and i should read till i find a 0 which is null terminator which will have unsigned_char code of 0 // can test this by reading a string like this: "_scratchpad/EnTeHandle.js at master · Noitidart/_scratchpad - Mozilla Firefox" at js array position 36 (so 37 if count from 1), we see 183, and at 77 we see char code of 0 IF casted to unsigned_char, if casted to char we see -73 at pos 36 but pos 77 still 0, if casted to jschar we see chineese characters in all spots expect spaces even null terminator is a chineese character
				//console.info('ptrAsArr.length:', ptrAsArr.length);
				//console.log('debug-msg :: dataCasted:', dataCasted, uneval(dataCasted), dataCasted.toString());
				var charCode = [];
				var fromCharCode = []
				for (var i=0; i<ptrAsArr.length; i++) { //if known_len is correct, then will not hit null terminator so like in example of "_scratchpad/EnTeHandle.js at master · Noitidart/_scratchpad - Mozilla Firefox" if you pass length of 77, then null term will not get hit by this loop as null term is at pos 77 and we go till `< known_len`
					var thisUnsignedCharCode = ptrAsArr.addressOfElement(i).contents;
					if (thisUnsignedCharCode == 0) {
						// reached null terminator, break
						//console.log('reached null terminator, at pos: ', i);
						break;
					}
					charCode.push(thisUnsignedCharCode);
					fromCharCode.push(String.fromCharCode(thisUnsignedCharCode));
				}
				//console.info('charCode:', charCode);
				//console.info('fromCharCode:', fromCharCode);
				var char16_val = fromCharCode.join('');
				//console.info('char16_val:', char16_val);
				return char16_val;
			}

			if (!jschar) {
				try {
					var char8_val = stringPtr.readString();
					//console.info('stringPtr.readString():', char8_val);
					return char8_val;
				} catch (ex if ex.message.indexOf('malformed UTF-8 character sequence at offset ') == 0) {
					//console.warn('ex of offset utf8 read error when trying to do readString so using alternative method, ex:', ex);
					return readJSCharString();
				}
			} else {
				return readJSCharString();
			}
		}
	};
}

var ostypes = new winInit();