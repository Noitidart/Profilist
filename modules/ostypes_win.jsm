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

var ifdef_UNICODE = true

var winTypes = function() {
	
	// ABIs
	if (is64bit) {
	  this.CALLBACK_ABI = ctypes.default_abi;
	  this.WINABI = ctypes.default_abi;
	} else {
	  this.CALLBACK_ABI = ctypes.stdcall_abi;
	  this.WINABI = ctypes.winapi_abi;
	}
	
	// SIMPLE TYPES // based on ctypes.BLAH // as per WinNT.h etc
	this.BOOL = ctypes.bool;
	this.BYTE = ctypes.unsigned_char;
	this.CHAR = ctypes.char;
	this.DWORD = ctypes.unsigned_long; // IntSafe.h defines it as: // typedef unsigned long DWORD; // so maybe can change this to ctypes.unsigned_long // i was always using `ctypes.uint32_t`
	this.INT = ctypes.int;
	this.INT_PTR = is64bit ? ctypes.int64_t : ctypes.int;
	this.LONG = ctypes.long;
	this.LONG_PTR = is64bit ? ctypes.int64_t : ctypes.long; // i left it at what i copied pasted it as but i thought it would be `ctypes.intptr_t`
	this.LPCVOID = ctypes.voidptr_t;
	this.LPVOID = ctypes.voidptr_t;	
	this.NTSTATUS = ctypes.long; // https://msdn.microsoft.com/en-us/library/cc230357.aspx // typedef long NTSTATUS;
	this.PVOID = ctypes.voidptr_t;
	this.RM_APP_TYPE = ctypes.unsigned_int; // i dont know im just guessing, i cant find a typedef that makes sense to me: https://msdn.microsoft.com/en-us/library/windows/desktop/aa373670%28v=vs.85%29.aspx
	this.UINT = ctypes.unsigned_int;
	this.UINT_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_int;
	this.ULONG = ctypes.unsigned_long;
	this.ULONG_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_long; // i left it at what i copied pasted it as, but i thought it was this: `ctypes.uintptr_t`
	this.USHORT = ctypes.unsigned_short;
	this.VOID = ctypes.void_t;
	this.WCHAR = ctypes.jschar;
	this.WORD = ctypes.unsigned_short;
	
	// ADVANCED TYPES // as per how it was defined in WinNT.h // defined by "simple types"
	this.ATOM = this.WORD;
	this.COLORREF = this.DWORD; // when i copied/pasted there was this comment next to this: // 0x00bbggrr
	this.DWORD_PTR = this.ULONG_PTR;
	this.HANDLE = this.PVOID;
	this.LPCSTR = this.CHAR.ptr; // typedef __nullterminated CONST CHAR *LPCSTR;
	this.LPCWSTR = this.WCHAR.ptr;
	this.LPARAM = this.LONG_PTR;
	this.LPDWORD = this.DWORD.ptr;
	this.LPSTR = this.CHAR.ptr;
	this.LPWSTR = this.WCHAR.ptr;
	this.LRESULT = this.LONG_PTR;
	this.PLONG = this.LONG.ptr;
	this.PULONG = this.ULONG.ptr;
	this.PCWSTR = this.WCHAR.ptr;
	this.SIZE_T = this.ULONG_PTR;
	this.SYSTEM_INFORMATION_CLASS = this.INT; // i think due to this search: http://stackoverflow.com/questions/28858849/where-is-system-information-class-defined
	this.TCHAR = ifdef_UNICODE ? this.WCHAR : ctypes.char; // when i copied pasted this it was just ctypes.char and had this comment: // Mozilla compiled with UNICODE/_UNICODE macros and wchar_t = jschar // in "advanced types" section even though second half is ctypes.char because it has something that is advanced, which is the first part, this.WCHAR
	this.WPARAM = this.UINT_PTR;
	
	// SUPER ADVANCED TYPES // defined by "advanced types"
	this.HBITMAP = this.HANDLE;
	this.HBRUSH = this.HANDLE;
	this.HDC = this.HANDLE;
	this.HFONT = this.HANDLE;
	this.HGDIOBJ = this.HANDLE;
	this.HHOOK = this.HANDLE;
	this.HICON = this.HANDLE;
	this.HINSTANCE = this.HANDLE;
	this.HMENU = this.HANDLE;
	this.HWND = this.HANDLE;
	this.LPCTSTR = ifdef_UNICODE ? this.LPCWSTR : this.LPCSTR;
	this.LPHANDLE = this.HANDLE.ptr;
	this.LPTSTR = ifdef_UNICODE ? this.LPWSTR : this.LPSTR;	
	
	// SUPER DUPER ADVANCED TYPES // defined by "super advanced types"
	this.HCURSOR = this.HICON;
	this.HMODULE = this.HINSTANCE;
	this.WNDENUMPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.BOOL, [this.HWND, this.LPARAM]); // "super advanced type" because its highest type is `this.HWND` which is "advanced type"


	// STRUCTURES
	
	// SIMPLE STRUCTS // based on any of the types above
	
	// ADVANCED STRUCTS // based on "simple structs" to be defined first
	
	
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
	
	// SendMessage structs
	/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms649010%28v=vs.85%29.aspx
	 * typedef struct tagCOPYDATASTRUCT {
	 *   ULONG_PTR dwData;
	 *   DWORD     cbData;
	 *   PVOID     lpData;
	 * } COPYDATASTRUCT, *PCOPYDATASTRUCT;
	 */
	this.COPYDATASTRUCT = ctypes.StructType('tagCOPYDATASTRUCT', [
		{ 'dwData': this.ULONG_PTR },
		{ 'cbData': this.DWORD },
		{ 'lpData': this.PVOID }
	]);
	this.PCOPYDATASTRUCT = this.COPYDATASTRUCT.ptr;
	 
	// Named Pipes
	/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa379560%28v=vs.85%29.aspx
	 * typedef struct _SECURITY_ATTRIBUTES {
	 *   DWORD  nLength;
	 *   LPVOID lpSecurityDescriptor;
	 *   BOOL   bInheritHandle;
	 * } SECURITY_ATTRIBUTES, *PSECURITY_ATTRIBUTES, *LPSECURITY_ATTRIBUTES;
	 */
	this.SECURITY_ATTRIBUTES = ctypes.StructType('_SECURITY_ATTRIBUTES');
	this.LPSECURITY_ATTRIBUTES = this.SECURITY_ATTRIBUTES.ptr;
	
	/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms684342%28v=vs.85%29.aspx
	 *  typedef struct _OVERLAPPED {
	 *    ULONG_PTR Internal;
	 *    ULONG_PTR InternalHigh;
	 *    union {
	 *  	struct {
	 *  	  DWORD Offset;
	 *  	  DWORD OffsetHigh;
	 *  	};
	 *  	PVOID  Pointer;
	 *    };
	 *    HANDLE    hEvent;
	 *  } OVERLAPPED, *LPOVERLAPPED;
	 */
	this.OVERLAPPED = ctypes.StructType('_OVERLAPPED');
	this.LPOVERLAPPED = this.OVERLAPPED.ptr;
}

var winInit = function() {
	var self = this;
	
	this.IS64BIT = is64bit;
	
	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		// BroadcastSystemMessage
		BSM_APPLICATIONS: 0x00000008,
		BSF_FORCEIFHUNG: 0x00000020,
		
		// GetAncestor
		GA_PARENT: 1,
		GA_ROOT: 2,
		GA_ROOTOWNER: 3, //same as if calling with GetParent

		// GetWindow
		GW_OWNER: 4,
		
		// LoadImage
		IMAGE_ICON: 1,
		LR_LOADFROMFILE: 16,
		
		// Named Pipes
		FILE_ATTRIBUTE_NORMAL: 0x80, // same as 128
		GENERIC_WRITE: 0x40000000,
		INVALID_HANDLE_VALUE: -1,
		OPEN_EXISTING: 3,
		PIPE_ACCESS_DUPLEX: 0x00000003,
		PIPE_READMODE_BYTE: 0x00000000,
		PIPE_TYPE_BYTE: 0x00000000,
		PIPE_UNLIMITED_INSTANCES: 255,
		PIPE_WAIT: 0x00000000,
		WRITE_DAC: 0x00040000,
		
		NMPWAIT_WAIT_FOREVER: 0xffffffff,
		
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
		WM_COPYDATA: 0x004A,
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
		BroadcastSystemMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644932%28v=vs.85%29.aspx
			 * long WINAPI BroadcastSystemMessage(
			 *   __in_         DWORD dwFlags,
			 *   __inout_opt_  LPDWORD lpdwRecipients,
			 *   __in_         UINT uiMessage,
			 *   __in_         WPARAM wParam,
			 *   __in_         LPARAM lParam
			 * );
			 */
			return lib('user32').declare('BroadcastSystemMessageW', self.TYPE.WINABI,
				self.TYPE.LONG,		// return
				self.TYPE.LPDWORD,	// lpdwRecipients
				self.TYPE.UINT,		// uiMessage
				self.TYPE.WPARAM,	// wParam
				self.TYPE.LPARAM	// lParam
			);
		},
		DestroyIcon: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648063%28v=vs.85%29.aspx
			 * BOOL WINAPI DestroyIcon(
			 *   _In_  HICON hIcon
			 * );
			 */
			return lib('user32').declare('DestroyIcon', self.TYPE.WINABI,
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
			return lib('user32').declare('EnumWindows', self.TYPE.WINABI,
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
			return lib('user32').declare('GetAncestor', self.TYPE.WINABI,
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
			return lib('user32').declare('GetWindow', self.TYPE.WINABI,
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
			return lib('user32').declare('GetWindowThreadProcessId', self.TYPE.WINABI,
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
			return lib('user32').declare('LoadImageW', self.TYPE.WINABI,
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
			return lib('Rstrtmgr.dll').declare('RmStartSession', self.TYPE.WINABI,
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
			return lib('Rstrtmgr.dll').declare('RmRegisterResources', self.TYPE.WINABI,
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
			return lib('Rstrtmgr.dll').declare('RmGetList', self.TYPE.WINABI,
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
			return lib('Rstrtmgr.dll').declare('RmEndSession', self.TYPE.WINABI,
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
			return lib('user32').declare('SendMessageW', self.TYPE.WINABI,
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
			return lib('user32').declare(self.IS64BIT ? 'SetClassLongPtrW' : 'SetClassLongW', self.TYPE.WINABI,
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
			return lib('shell32.dll').declare('SHChangeNotify', self.TYPE.WINABI,
				self.TYPE.VOID,		// return
				self.TYPE.LONG,		//wEventId
				self.TYPE.UINT,		//uFlags
				self.TYPE.LPCVOID,	//dwItem1
				self.TYPE.LPCVOID	//dwItem2
			);
		},
		ConnectNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365146%28v=vs.85%29.aspx
			 * BOOL WINAPI ConnectNamedPipe(
			 *   __in_         HANDLE hNamedPipe,
			 *   __inout_opt_  LPOVERLAPPED lpOverlapped
			 * );
			 */
			return lib('Kernel32').declare('ConnectNamedPipe', self.TYPE.WINABI,
				self.TYPE.BOOL,			// return
				self.TYPE.HANDLE,		// hNamedPipe
				self.TYPE.LPOVERLAPPED	// lpOverlapped
			);
		},
		CloseHandle: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724211%28v=vs.85%29.aspx
			 * BOOL WINAPI CloseHandle(
			 *   __in_  HANDLE hObject
			 * );
			 */
			return lib('Kernel32').declare('CloseHandle', self.TYPE.WINABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HANDLE	// hObject
			);
		},
		CreateNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365150%28v=vs.85%29.aspx
			 *  HANDLE WINAPI CreateNamedPipe(
			 *    __in_      LPCTSTR lpName,
			 *    __in_      DWORD dwOpenMode,
			 *    __in_      DWORD dwPipeMode,
			 *    __in_      DWORD nMaxInstances,
			 *    __in_      DWORD nOutBufferSize,
			 *    __in_      DWORD nInBufferSize,
			 *    __in_      DWORD nDefaultTimeOut,
			 *    __in_opt_  LPSECURITY_ATTRIBUTES lpSecurityAttributes
			 *  );
			 */
			return lib('Kernel32').declare('CreateNamedPipeW', self.TYPE.WINABI,
				self.TYPE.HANDLE,					// return
				self.TYPE.LPCTSTR,					// lpName
				self.TYPE.DWORD,					// dwOpenMode
				self.TYPE.DWORD,					// dwPipeMode
				self.TYPE.DWORD,					// nMaxInstances
				self.TYPE.DWORD,					// nOutBufferSize
				self.TYPE.DWORD,					// nInBufferSize
				self.TYPE.DWORD,					// nDefaultTimeOut
				self.TYPE.LPSECURITY_ATTRIBUTES		// lpSecurityAttributes	// todo:
			);
		},
		CreateFile: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa363858%28v=vs.85%29.aspx
			 * HANDLE WINAPI CreateFile(
			 *   __in_      LPCTSTR lpFileName,
			 *   __in_      DWORD dwDesiredAccess,
			 *   __in_      DWORD dwShareMode,
			 *   __in_opt_  LPSECURITY_ATTRIBUTES lpSecurityAttributes,
			 *   __in_      DWORD dwCreationDisposition,
			 *   __in_      DWORD dwFlagsAndAttributes,
			 *   __in_opt_  HANDLE hTemplateFile
			 * );
			 */
			return lib('Kernel32').declare('CreateFileW', self.TYPE.WINABI,
				self.TYPE.HANDLE,					// return
				self.TYPE.LPCTSTR,					// lpFileName
				self.TYPE.DWORD,					// dwDesiredAccess
				self.TYPE.DWORD,					// dwShareMode
				self.TYPE.LPSECURITY_ATTRIBUTES,	// lpSecurityAttributes
				self.TYPE.DWORD,					// dwCreationDisposition
				self.TYPE.DWORD,					// dwFlagsAndAttributes
				self.TYPE.HANDLE					// hTemplateFile
			);
		},
		DisconnectNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365166%28v=vs.85%29.aspx
			 * BOOL WINAPI DisconnectNamedPipe(
			 *   __in_  HANDLE hNamedPipe
			 * );
			 */
			return lib('Kernel32').declare('DisconnectNamedPipe', self.TYPE.WINABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HANDLE	// hNamedPipe
			);
		},
		ReadFile: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365467%28v=vs.85%29.aspx
			 * BOOL WINAPI ReadFile(
			 *   __in_         HANDLE hFile,
			 *   __out_        LPVOID lpBuffer,
			 *   __in_         DWORD nNumberOfBytesToRead,
			 *   __out_opt_    LPDWORD lpNumberOfBytesRead,
			 *   __inout_opt_  LPOVERLAPPED lpOverlapped
			 * );
			 */
			return lib('Kernel32').declare('ReadFile', self.TYPE.WINABI,
				self.TYPE.BOOL,				// return
				self.TYPE.HANDLE,			// hFile
				self.TYPE.LPVOID,			// lpBuffer
				self.TYPE.DWORD,			// nNumberOfBytesToRead
				self.TYPE.LPDWORD,			// lpNumberOfBytesRead
				self.TYPE.LPOVERLAPPED		// lpOverlapped
			);
		},
		WriteFile: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365747%28v=vs.85%29.aspx
			 * BOOL WINAPI WriteFile(
			 *   __in_         HANDLE hFile,
			 *   __in_         LPCVOID lpBuffer,
			 *   __in_         DWORD nNumberOfBytesToWrite,
			 *   __out_opt_    LPDWORD lpNumberOfBytesWritten,
			 *   __inout_opt_  LPOVERLAPPED lpOverlapped
			 * );
			 */
			return lib('Kernel32').declare('WriteFile', self.TYPE.WINABI,
				self.TYPE.BOOL,			// return
				self.TYPE.HANDLE,		// hFile
				self.TYPE.LPCVOID,		// lpBuffer
				self.TYPE.DWORD,		// nNumberOfBytesToWrite
				self.TYPE.LPDWORD,		// lpNumberOfBytesWritten
				self.TYPE.LPOVERLAPPED	// lpOverlapped
			);
		},
		WaitNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365800%28v=vs.85%29.aspx
			 * BOOL WINAPI WaitNamedPipe(
			 *   __in_  LPCTSTR lpNamedPipeName,
			 *   __in_  DWORD nTimeOut
			 * );
			 */
			return lib('Kernel32').declare('WaitNamedPipeW', self.TYPE.WINABI,
				self.TYPE.BOOL,		// return
				self.TYPE.LPCTSTR,	// lpNamedPipeName
				self.TYPE.DWORD		// nTimeOut
			);
		},
		FlushFileBuffers: function() {
			return lib('Kernel32').declare('FlushFileBuffers', self.TYPE.WINABI, self.TYPE.BOOL, self.TYPE.HANDLE);
		}
	};
	// end - predefine your declares here
	// end - function declares
	
	this.HELPER = {
		jscGetDeepest: function(obj) {
			try {
				//console.info(Math.round(Math.random() * 10) + ' starting jscGetDeepest:', obj, obj.toString());
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
			//console.info('finaled jscGetDeepest:', obj);
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
			
			console.info('comparing:', str1, str2);
			
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