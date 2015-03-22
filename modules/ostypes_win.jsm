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
	this.LPCWSTR = ctypes.jschar.ptr;
	this.LPWSTR = ctypes.jschar.ptr; // WCHAR
	this.LRESULT = this.LONG_PTR;
	this.WPARAM = this.UINT_PTR;
	this.LPARAM = ctypes.size_t; // this.LONG_PTR;
	this.FARPROC = ctypes.voidptr_t; // typedef INT_PTR (FAR WINAPI *FARPROC)();
	this.COLORREF = this.DWORD; // 0x00bbggrr
	this.LPHANDLE = this.HANDLE.ptr;
	
	
	this.LPCVOID = ctypes.voidptr_t;
	this.VOID = ctypes.void_t;
	
	// ADVANCED TYPES
	this.NTSTATUS = this.LONG;
	this.SYSTEM_INFORMATION_CLASS = this.INT;
	
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
}

var winInit = function() {
	var self = this;
	
	this.IS64BIT = is64bit;
	
	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		// GetWindow
		GW_OWNER: 4,
		
		// LoadImage
		IMAGE_ICON: 1,
		LR_LOADFROMFILE: 16,
		
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
			return lib('user32').declare('LoadImageA', ctypes.winapi_abi,
				self.TYPE.HANDLE,		// return
				self.TYPE.HINSTANCE,	// hinst
				self.TYPE.LPCTSTR,		// uType		// ctypes.char.ptr
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
				self.TYPE.UINT,			// Msg
				self.TYPE.WPARAM,		// wParam		// ctypes.int32_t
				self.TYPE.LPARAM		// lParam		// ctypes.voidptr_t
			);
		},
		SetClassLong: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633589%28v=vs.85%29.aspx
			 * ULONG_PTR WINAPI SetClassLongPtr(
			 *   __in_  HWND hWnd,
			 *   __in_  int nIndex,
			 *   __in_  LONG_PTR dwNewLong
			 * );
			 */
			return lib('user32').declare(self.IS64BIT ? 'SetClassLongPtrW' : 'SetClassLongW', ctypes.winapi_abi,
				self.TYPE.ULONG_PTR,	// return
				self.TYPE.HWND,			// hWnd
				self.TYPE.INT,			// nIndex
				self.TYPE.ULONG_PTR		// dwNewLong
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
		blah: function() {
			// this is a helper function
		}
	};
}

var ostypes = new winInit();