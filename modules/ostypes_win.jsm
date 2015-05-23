var EXPORTED_SYMBOLS = ['ostypes'];

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
	this.VARIANT_BOOL = ctypes.short;
	this.VARTYPE = ctypes.unsigned_short;
	this.VOID = ctypes.void_t;
	this.WCHAR = ctypes.jschar;
	this.WORD = ctypes.unsigned_short;
	
	// ADVANCED TYPES // as per how it was defined in WinNT.h // defined by "simple types"
	this.ATOM = this.WORD;
	this.BOOLEAN = this.BYTE; // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
	this.COLORREF = this.DWORD; // when i copied/pasted there was this comment next to this: // 0x00bbggrr
	this.DWORD_PTR = this.ULONG_PTR;
	this.HANDLE = this.PVOID;
	this.HRESULT = this.LONG;
	this.LPCSTR = this.CHAR.ptr; // typedef __nullterminated CONST CHAR *LPCSTR;
	this.LPCWSTR = this.WCHAR.ptr;
	this.LPARAM = this.LONG_PTR;
	this.LPDWORD = this.DWORD.ptr;
	this.LPSTR = this.CHAR.ptr;
	this.LPWSTR = this.WCHAR.ptr;
	this.LRESULT = this.LONG_PTR;
	this.OLECHAR = this.WCHAR; // typedef WCHAR OLECHAR; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L286
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
	this.HKEY = this.HANDLE;
	this.HMENU = this.HANDLE;
	this.HWND = this.HANDLE;
	this.LPCOLESTR = this.OLECHAR.ptr; // typedef [string] const OLECHAR *LPCOLESTR; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L288
	this.LPCTSTR = ifdef_UNICODE ? this.LPCWSTR : this.LPCSTR;
	this.LPHANDLE = this.HANDLE.ptr;
	this.LPOLESTR = this.OLECHAR.ptr; // typedef [string] OLECHAR *LPOLESTR; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L287 // http://stackoverflow.com/a/1607335/1828637 // LPOLESTR is usually to be allocated with CoTaskMemAlloc()
	this.LPTSTR = ifdef_UNICODE ? this.LPWSTR : this.LPSTR;	
	
	// SUPER DUPER ADVANCED TYPES // defined by "super advanced types"
	this.HCURSOR = this.HICON;
	this.HMODULE = this.HINSTANCE;
	this.WNDENUMPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.BOOL, [this.HWND, this.LPARAM]); // "super advanced type" because its highest type is `this.HWND` which is "advanced type"

	// inaccrurate types - i know these are something else but setting them to voidptr_t or something just works and all the extra work isnt needed
	this.PCIDLIST_ABSOLUTE = ctypes.voidptr_t; // https://github.com/west-mt/ssbrowser/blob/452e21d728706945ad00f696f84c2f52e8638d08/chrome/content/modules/WindowsShortcutService.jsm#L115
	this.PIDLIST_ABSOLUTE = ctypes.voidptr_t;
	this.WIN32_FIND_DATA = ctypes.voidptr_t;
	this.WINOLEAPI = ctypes.voidptr_t; // i guessed on this one
	
	// consts for structures
	var struct_const = {
		blah: false
	};
	
	// STRUCTURES
	
	// SIMPLE STRUCTS // based on any of the types above
	this.FILETIME = ctypes.StructType('_FILETIME', [ // http://msdn.microsoft.com/en-us/library/windows/desktop/ms724284%28v=vs.85%29.aspx
	  { 'dwLowDateTime': this.DWORD },
	  { 'dwHighDateTime': this.DWORD }
	]);
	this.GUID = ctypes.StructType('GUID', [
	  { 'Data1': this.ULONG },
	  { 'Data2': this.USHORT },
	  { 'Data3': this.USHORT },
	  { 'Data4': this.BYTE.array(8) }
	]);
	this.PROPVARIANT = ctypes.StructType('PROPVARIANT', [ // http://msdn.microsoft.com/en-us/library/windows/desktop/bb773381%28v=vs.85%29.aspx
		{ 'vt': this.VARTYPE }, // constants for this are available at MSDN: http://msdn.microsoft.com/en-us/library/windows/desktop/aa380072%28v=vs.85%29.aspx
		{ 'wReserved1': this.WORD },
		{ 'wReserved2': this.WORD },
		{ 'wReserved3': this.WORD },
		{ 'pwszVal': this.LPWSTR } // union, i just use pwszVal so I picked that one // for InitPropVariantFromString // when using this see notes on MSDN doc page chat of PROPVARIANT ( http://msdn.microsoft.com/en-us/library/windows/desktop/aa380072%28v=vs.85%29.aspx )this guy says: "VT_LPWSTR must be allocated with CoTaskMemAlloc :: (Presumably this also applies to VT_LPSTR) VT_LPWSTR is described as being a string pointer with no information on how it is allocated. You might then assume that the PROPVARIANT doesn't own the string and just has a pointer to it, but you'd be wrong. In fact, the string stored in a VT_LPWSTR PROPVARIANT must be allocated using CoTaskMemAlloc and be freed using CoTaskMemFree. Evidence for this: Look at what the inline InitPropVariantFromString function does: It sets a VT_LPWSTR using SHStrDupW, which in turn allocates the string using CoTaskMemAlloc. Knowing that, it's obvious that PropVariantClear is expected to free the string using CoTaskMemFree. I can't find this explicitly documented anywhere, which is a shame, but step through this code in a debugger and you can confirm that the string is freed by PropVariantClear: ```#include <Propvarutil.h>	int wmain(int argc, TCHAR *lpszArgv[])	{	PROPVARIANT pv;	InitPropVariantFromString(L"Moo", &pv);	::PropVariantClear(&pv);	}```  If  you put some other kind of string pointer into a VT_LPWSTR PROPVARIANT your program is probably going to crash."
	]);
	this.SECURITY_ATTRIBUTES = ctypes.StructType('_SECURITY_ATTRIBUTES', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/aa379560%28v=vs.85%29.aspx
		{ 'nLength': this.DWORD },
		{ 'lpSecurityDescriptor': this.LPVOID },
		{ 'bInheritHandle': this.BOOL }
	]);
	
	// ADVANCED STRUCTS // based on "simple structs" to be defined first
	this.CLSID = this.GUID;
	this.IID = this.GUID;
	this.LPSECURITY_ATTRIBUTES = this.SECURITY_ATTRIBUTES.ptr;
	this.PGUID = this.GUID.ptr;
	this.PFILETIME = this.FILETIME.ptr;
	
	// SUPER ADV STRUCTS
	this.WIN32_FIND_DATA = ctypes.StructType('_WIN32_FIND_DATA', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/aa365740%28v=vs.85%29.aspx
		{ 'dwFileAttributes': this.DWORD },
		{ 'ftCreationTime': this.FILETIME },
		{ 'ftLastAccessTime': this.FILETIME },
		{ 'ftLastWriteTime': this.FILETIME },
		{ 'nFileSizeHigh': this.DWORD },
		{ 'nFileSizeLow': this.DWORD },
		{ 'dwReserved0': this.DWORD },
		{ 'dwReserved1': this.DWORD },
		{ 'cFileName': this.TCHAR.array(OS.Constants.Win.MAX_PATH) },
		{ 'cAlternateFileName': this.TCHAR.array(14) }
	]);
	
	// SUPER DUPER ADV STRUCTS
	this.PWIN32_FIND_DATA = this.WIN32_FIND_DATA.ptr;
	this.LPWIN32_FIND_DATA = this.WIN32_FIND_DATA.ptr;
	
	/* http://msdn.microsoft.com/en-us/library/windows/desktop/bb773381%28v=vs.85%29.aspx
	 * typedef struct {
	 *   GUID  fmtid;
	 *   DWORD pid;	
	 * } PROPERTYKEY;	                                                           
	 */
	this.PROPERTYKEY = new ctypes.StructType('PROPERTYKEY', [
		{ 'fmtid': this.GUID },                                
		{ 'pid': this.DWORD }                                  
	]);                                                        
	
	// SUPER ADVANCED STRUCTURES - based on advanced structs
	this.REFCLSID = this.CLSID.ptr; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L288
	this.REFIID = this.IID.ptr;
	this.REFPROPERTYKEY = this.PROPERTYKEY.ptr; // note: if you use any REF... (like this.REFPROPERTYKEY) as an arg to a declare, that arg expects a ptr. this is basically like
	this.REFPROPVARIANT = this.PROPVARIANT.ptr;
	
	// VTABLE's
	var IPropertyStoreVtbl = ctypes.StructType('IPropertyStoreVtbl');
	this.IPropertyStore = ctypes.StructType('IPropertyStore', [{
		'lpVtbl': IPropertyStoreVtbl.ptr
	}]);
	//this.IPropertyStorePtr = IPropertyStore.ptr;
	IPropertyStoreVtbl.define(
		[{ //start inherit from IUnknown
			'QueryInterface': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr,
					this.REFIID,		// riid
					this.VOID.ptr.ptr	// **ppvObject
				]).ptr
		}, {
			'AddRef': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IPropertyStore.ptr
				]).ptr
		}, {
			'Release': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IPropertyStore.ptr
				]).ptr
		}, { //end inherit from IUnknown
			'GetCount': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr,
					this.DWORD.ptr	// *cProps
				]).ptr
		}, {
			'GetAt': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr,
					this.DWORD,				// iProp
					this.PROPERTYKEY.ptr	// *pkey
				]).ptr
		}, {
			'GetValue': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr,
					this.REFPROPERTYKEY,	// key
					this.PROPVARIANT.ptr	// *pv
				]).ptr
		}, {
			'SetValue': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr,
					this.REFPROPERTYKEY,	// key
					this.REFPROPVARIANT		// propvar
				]).ptr
		}, {
			'Commit': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPropertyStore.ptr
				]).ptr
		}]
	);
	
	var IShellLinkWVtbl = ctypes.StructType('IShellLinkWVtbl');
	this.IShellLinkW = ctypes.StructType('IShellLinkW', [{
		'lpVtbl': IShellLinkWVtbl.ptr
	}]);
	//this.IShellLinkWPtr = new ctypes.PointerType(IShellLinkW);
	IShellLinkWVtbl.define(
		[{ //start inherit from IUnknown
			'QueryInterface': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.REFIID,	// riid
					this.VOID.ptr	// **ppvObject
				]).ptr
		}, {
			'AddRef': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IShellLinkW.ptr
				]).ptr
		}, {
			'Release': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IShellLinkW.ptr
				]).ptr
		}, { //end inherit from IUnknown //start IShellLinkW
			'GetPath': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPTSTR,				// pszFile
					this.INT,					// cchMaxPath
					this.WIN32_FIND_DATA.ptr,	// *pfd
					this.DWORD					// fFlags
				]).ptr
		}, {
			'GetIDList': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.PIDLIST_ABSOLUTE.ptr	// *ppidl
				]).ptr
		}, {
			'SetIDList': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.PCIDLIST_ABSOLUTE	// pidl
				]).ptr
		}, {
			'GetDescription': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPTSTR,	// pszName
					this.INT		// cchMaxName
				]).ptr
		}, {
			'SetDescription': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR		// pszName
				]).ptr
		}, {
			'GetWorkingDirectory': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPTSTR,		// pszDir
					this.INT			// cchMaxPath
				]).ptr
		}, {
			'SetWorkingDirectory': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR
				]).ptr
		}, {
			'GetArguments': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPTSTR,	// pszArgs
					this.INT		// cchMaxPath
				]).ptr
		}, {
			'SetArguments': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR		// pszArgs
				]).ptr
		}, {
			'GetHotKey': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.WORD.ptr	// *pwHotkey
				]).ptr
		}, {
			'SetHotKey': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.WORD	// wHotkey
				]).ptr
		}, {
			'GetShowCmd': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.INT.ptr		// *piShowCmd
				]).ptr
		}, {
			'SetShowCmd': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.INT		// iShowCmd
				]).ptr
		}, {
			'GetIconLocation': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPTSTR,	// pszIconPath
					this.INT,		// cchIconPath
					this.INT.ptr	// *piIcon
				]).ptr
		}, {
			'SetIconLocation': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR,	// pszIconPath
					this.INT		// iIcon
				]).ptr
		}, {
			'SetRelativePath': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR,	// pszPathRel
					this.DWORD		// dwReserved
				]).ptr
		}, {
			'Resolve': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.HWND,	// hwnd
					this.DWORD	// fFlags
				]).ptr
		}, {
			'SetPath': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IShellLinkW.ptr,
					this.LPCTSTR	// pszFile
				]).ptr
		}]
	);
	
	var IPersistFileVtbl = ctypes.StructType('IPersistFileVtbl');
	this.IPersistFile = ctypes.StructType('IPersistFile',[{
			'lpVtbl': IPersistFileVtbl.ptr
		}]
	);
	IPersistFileVtbl.define(
		[{ //start inherit from IUnknown
			'QueryInterface': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.REFIID,	// riid
					this.VOID.ptr	// **ppvObject
				]).ptr
		}, {
			'AddRef': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IPersistFile.ptr
				]).ptr
		}, {
			'Release': ctypes.FunctionType(this.CALLBACK_ABI,
				this.ULONG, [
					this.IPersistFile.ptr
				]).ptr
		}, { //end inherit from IUnknown //start inherit from IPersist
			'GetClassID': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.CLSID.ptr	// *pClassID
				]).ptr
		}, { //end inherit from IPersist // start IPersistFile
			'IsDirty': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
				]).ptr
		}, {
			'Load': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.LPCOLESTR,	// pszFileName
					this.DWORD		// dwMode
				]).ptr
		}, {
			'Save': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.LPCOLESTR,	// pszFileName
					this.BOOL		// fRemember
				]).ptr
		}, {
			'SaveCompleted': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.LPCOLESTR	// pszFileName
				]).ptr
		}, {
			'GetCurFile': ctypes.FunctionType(this.CALLBACK_ABI,
				this.HRESULT, [
					this.IPersistFile.ptr,
					this.LPOLESTR.ptr	// *ppszFileName
				]).ptr
		}
	]);
	
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
	
	// IPropertyStore
	this.LPUNKNOWN = ctypes.voidptr_t; // ctypes.StructType('LPUNKNOWN'); // public typedef IUnknown* LPUNKNOWN; // i dont use the full struct so just leave it like this, actually lets just make it voidptr_t
	
	/* typedef struct _SHELLEXECUTEINFO {
	 *   DWORD     cbSize;
	 *   ULONG     fMask;
	 *   HWND      hwnd;
	 *   LPCTSTR   lpVerb;
	 *   LPCTSTR   lpFile;
	 *   LPCTSTR   lpParameters;
	 *   LPCTSTR   lpDirectory;
	 *   int       nShow;
	 *   HINSTANCE hInstApp;
	 *   LPVOID    lpIDList;
	 *   LPCTSTR   lpClass;
	 *   HKEY      hkeyClass;
	 *   DWORD     dwHotKey;
	 *   union {
	 *     HANDLE hIcon;
	 *     HANDLE hMonitor;
	 *   } DUMMYUNIONNAME;
	 *   HANDLE    hProcess;
	 * } SHELLEXECUTEINFO, *LPSHELLEXECUTEINFO;
	 */
	this.SHELLEXECUTEINFO = ctypes.StructType('_SHELLEXECUTEINFO', [
		{ 'cbSize': this.DWORD },
		{ 'fMask': this.ULONG },
		{ 'hwnd': this.HWND },
		{ 'lpVerb': this.LPCTSTR },
		{ 'lpFile': this.LPCTSTR },
		{ 'lpParameters': this.LPCTSTR },
		{ 'lpDirectory': this.LPCTSTR },
		{ 'nShow': this.INT },
		{ 'hInstApp': this.HINSTANCE },
		{ 'lpIDList': this.LPVOID },
		{ 'lpClass': this.LPCTSTR },
		{ 'hkeyClass': this.HKEY },
		{ 'dwHotKey': this.DWORD },
		{ 'hIcon': this.HANDLE }, // union {HANDLE hIcon;  HANDLE hMonitor;} DUMMYUNIONNAME; // i picked hIcon because i might be able to get winxp to seperate its groups ia
		{ 'hProcess': this.HANDLE }
	]);
}

var winInit = function() {
	var self = this;
	
	this.IS64BIT = is64bit;
	
	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		COINIT_APARTMENTTHREADED: 0x2,
		CLSCTX_INPROC_SERVER: 0x1,
		SW_SHOWNORMAL: 1,
		VARIANT_FALSE: 0, // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
		VARIANT_TRUE: -1, // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
		VT_LPWSTR: 0x001F, // 31

		// BroadcastSystemMessage
		BSM_APPLICATIONS: 0x00000008,
		BSF_FORCEIFHUNG: 0x00000020,
		
		// GetAncestor
		GA_PARENT: 1,
		GA_ROOT: 2,
		GA_ROOTOWNER: 3, //same as if calling with GetParent

		// GetWindow
		GW_OWNER: 4,

		// HRESULTs - http://msdn.microsoft.com/en-us/library/windows/desktop/aa378137%28v=vs.85%29.aspx
		S_OK: 0,
		S_FALSE: 1,
		
		// LoadImage
		IMAGE_ICON: 1,
		LR_LOADFROMFILE: 16,
		
		// Named Pipes
		FILE_ATTRIBUTE_NORMAL: 0x80, // same as 128
		GENERIC_WRITE: 0x40000000,
		INVALID_HANDLE_VALUE: -1,
		OPEN_EXISTING: 3,
		PIPE_ACCESS_DUPLEX: 0x00000003,
		PIPE_ACCESS_INBOUND: 0x00000001,
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
		WM_GETICON: 0x007F,
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
		
		SW_RESTORE: 9,
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
		CLSIDFromString: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms680589%28v=vs.85%29.aspx
			 * HRESULT CLSIDFromString(
			 *   __in_ LPCOLESTR lpsz,
			 *   __out_ LPCLSID pclsid
			 * );
			 */
			return lib('Ole32.dll').declare('CLSIDFromString', self.TYPE.WINABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.LPCOLESTR,	// lpsz
				self.TYPE.GUID.ptr		// pclsid
			); 
		},
		CoCreateInstance: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms686615%28v=vs.85%29.aspx
			 * HRESULT CoCreateInstance(
			 *   __in_   REFCLSID rclsid,
			 *   __in_   LPUNKNOWN pUnkOuter,
			 *   __in_   DWORD dwClsContext,
			 *   __in_   REFIID riid,
			 *   __out_  LPVOID *ppv
			 * );
			 */
			return lib('Ole32.dll').declare('CoCreateInstance', self.TYPE.WINABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.REFCLSID,		// rclsid
				self.TYPE.LPUNKNOWN,	// pUnkOuter
				self.TYPE.DWORD,		// dwClsContext
				self.TYPE.REFIID,		// riid
				self.TYPE.LPVOID		// *ppv
			);
		},
		CoInitializeEx: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms695279%28v=vs.85%29.aspx
			 * HRESULT CoInitializeEx(
			 *   __in_opt_  LPVOID pvReserved,
			 *   __in_      DWORD dwCoInit
			 * );
			 */
			return lib('Ole32.dll').declare('CoInitializeEx', self.TYPE.WINABI,
				self.TYPE.HRESULT,	// result
				self.TYPE.LPVOID,	// pvReserved
				self.TYPE.DWORD		// dwCoInit
			);
		},
		CoUninitialize: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms688715%28v=vs.85%29.aspx
			 * void CoUninitialize(void);
			 */
			return lib('Ole32.dll').declare('CoUninitialize', self.TYPE.WINABI,
				self.TYPE.VOID	// return
			);
		},
		CreateSymbolicLink: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa363866%28v=vs.85%29.aspx
			 * BOOLEAN WINAPI CreateSymbolicLink(
			 *   __in_  LPTSTR lpSymlinkFileName,
			 *   __in_  LPTSTR lpTargetFileName,
			 *   __in_  DWORD dwFlags
			 * );
			 */
			return lib('kernel32').declare('CreateSymbolicLinkW', self.TYPE.WINABI,
				self.TYPE.BOOLEAN,	// return
				self.TYPE.LPTSTR,	// lpSymlinkFileName
				self.TYPE.LPTSTR,	// lpTargetFileName
				self.TYPE.DWORD		// dwFlags
			);
		},
		CreateHardLink: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa363860%28v=vs.85%29.aspx
			 * BOOL WINAPI CreateHardLink(
			 *   __in_        LPCTSTR lpFileName,
			 *   __in_        LPCTSTR lpExistingFileName,
			 *   __reserved_  LPSECURITY_ATTRIBUTES lpSecurityAttributes
			 * );
			 */
			return lib('kernel32').declare('CreateHardLinkW', self.TYPE.WINABI,
				self.TYPE.BOOL,					// return
				self.TYPE.LPCTSTR,				// lpFileName
				self.TYPE.LPCTSTR,				// lpExistingFileName
				self.TYPE.LPSECURITY_ATTRIBUTES	// lpSecurityAttributes
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
		GetCurrentProcessExplicitAppUserModelID: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd378419.aspx
			 * HRESULT GetCurrentProcessExplicitAppUserModelID(
			 *   __out_  PWSTR *AppID
			 * );
			 */
			return lib('shell32').declare('GetCurrentProcessExplicitAppUserModelID', self.TYPE.WINABI,
				self.TYPE.HRESULT,	// return
				self.TYPE.PWSTR.ptr	// *AppID
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
		PropVariantClear: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa380073%28v=vs.85%29.aspx
			 * WINOLEAPI PropVariantClear(
			 * __in_ PROPVARIANT *pvar
			 * );
			 */
			return lib('Ole32.dll').declare('PropVariantClear', self.TYPE.WINABI,
				self.TYPE.WINOLEAPI,			// return
				self.TYPE.PROPVARIANT.ptr		// *pvar
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
		SetFileTime: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724933%28v=vs.85%29.aspx
			 * BOOL WINAPI SetFileTime(
			 *   __in_      HANDLE hFile,
			 *   __in_opt_  const FILETIME *lpCreationTime,
			 *   __in_opt_  const FILETIME *lpLastAccessTime,
			 *   __in_opt_  const FILETIME *lpLastWriteTime
			 * );
			 */
			return lib('kernel32').declare('SetFileTime', self.TYPE.WINABI,
				self.TYPE.BOOL,				// return
				self.TYPE.FILETIME.ptr,		// *lpCreationTime
				self.TYPE.FILETIME.ptr,		// *lpLastAccessTime
				self.TYPE.FILETIME.ptr		// *lpLastWriteTime
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
		ShellExecuteEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/bb762154%28v=vs.85%29.aspx
			 * BOOL ShellExecuteEx(
			 *   __inout_  SHELLEXECUTEINFO *pExecInfo
			 * );
			 */
			return lib('shell32.dll').declare('ShellExecuteExW', self.TYPE.WINABI,
				self.TYPE.BOOL,					// return
				self.TYPE.SHELLEXECUTEINFO.ptr	// *pExecInfo
			);
		},
		SHGetPropertyStoreForWindow: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd378430%28v=vs.85%29.aspx
			 * HRESULT SHGetPropertyStoreForWindow(
			 * __in_ HWND hwnd,
			 * __in_ REFIID riid,
			 * __out_ void **ppv
			 * );
			 */
			return lib('shell32').declare('SHGetPropertyStoreForWindow', self.TYPE.WINABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.HWND,			// hwnd
				self.TYPE.REFIID,		// riid
				ctypes.voidptr_t		// **ppv // i can set this to `self.TYPE.IPropertyStore.ptr.ptr` // however i cannot set this to ctypes.void_t.ptr.ptr i have no iea why, and i thouh `void **ppv` is either void_t.ptr.ptr or ctypes.voidptr_t.ptr // ctypes.voidptr_t as was one here: `void**` the `QueryInterface` also has out argument `void**` and he used `ctypes.voidptr_t` (https://github.com/west-mt/ssbrowser/blob/452e21d728706945ad00f696f84c2f52e8638d08/chrome/content/modules/WindowsShortcutService.jsm#L74)
			);
		},
		SHStrDup: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/bb759924%28v=vs.85%29.aspx
			* HRESULT SHStrDup(
			* __in_ LPCTSTR pszSource,
			* __out_ LPTSTR *ppwsz
			* );
			*/
			return lib('Shlwapi.dll').declare('SHStrDupW', self.TYPE.WINABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.LPCTSTR,		// pszSource
				self.TYPE.LPTSTR.ptr	// *ppwsz
			); 
		},
		ConnectNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365146%28v=vs.85%29.aspx
			 * BOOL WINAPI ConnectNamedPipe(
			 *   __in_         HANDLE hNamedPipe,
			 *   __inout_opt_  LPOVERLAPPED lpOverlapped
			 * );
			 */
			return lib('kernel32').declare('ConnectNamedPipe', self.TYPE.WINABI,
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
			return lib('kernel32').declare('CloseHandle', self.TYPE.WINABI,
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
			return lib('kernel32').declare('CreateNamedPipeW', self.TYPE.WINABI,
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
			return lib('kernel32').declare('CreateFileW', self.TYPE.WINABI,
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
			return lib('kernel32').declare('DisconnectNamedPipe', self.TYPE.WINABI,
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
			return lib('kernel32').declare('ReadFile', self.TYPE.WINABI,
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
			return lib('kernel32').declare('WriteFile', self.TYPE.WINABI,
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
			return lib('kernel32').declare('WaitNamedPipeW', self.TYPE.WINABI,
				self.TYPE.BOOL,		// return
				self.TYPE.LPCTSTR,	// lpNamedPipeName
				self.TYPE.DWORD		// nTimeOut
			);
		},
		SetNamedPipeHandleState: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365787%28v=vs.85%29.aspx
			 * BOOL WINAPI SetNamedPipeHandleState(
			 *   __in_      HANDLE hNamedPipe,
			 *   __in_opt_  LPDWORD lpMode,
			 *   __in_opt_  LPDWORD lpMaxCollectionCount,
			 *   __in_opt_  LPDWORD lpCollectDataTimeout
			 * );
			 */
			return lib('kernel32').declare('SetNamedPipeHandleState', self.TYPE.WINABI,
				self.type.HANDLE,	// hNamedPipe
				self.type.LPDWORD,  // lpMode
				self.type.LPDWORD,  // lpMaxCollectionCount
				self.type.LPDWORD  // lpCollectDataTimeout
			);
		},
		TransactNamedPipe: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365790%28v=vs.85%29.aspx
			 * BOOL WINAPI TransactNamedPipe(
			 *   __in_         HANDLE hNamedPipe,
			 *   __in_         LPVOID lpInBuffer,
			 *   __in_         DWORD nInBufferSize,
			 *   __out_        LPVOID lpOutBuffer,
			 *   __in_         DWORD nOutBufferSize,
			 *   __out_        LPDWORD lpBytesRead,
			 *   __inout_opt_  LPOVERLAPPED lpOverlapped
			 * );
			 */
			return lib('kernel32').declare('TransactNamedPipe', self.TYPE.WINABI,
				self.TYPE.HANDLE,		// hNamedPipe,
				self.TYPE.LPVOID,		// lpInBuffer,
				self.TYPE.DWORD,		// nInBufferSize,
				self.TYPE.LPVOID,		// lpOutBuffer,
				self.TYPE.DWORD,		// nOutBufferSize,
				self.TYPE.LPDWORD,		// lpBytesRead,
				self.TYPE.LPOVERLAPPED	// lpOverlapped
			);
		}
	};
	// end - predefine your declares here
	// end - function declares
	
	this.HELPER = {
		checkHRESULT: function(hr /*HRESULT*/, funcName /*jsStr*/) {
			if(parseInt(cutils.jscGetDeepest(hr)) < 0) {
				throw new Error('HRESULT ' + hr + ' returned from function ' + funcName);
			}
		},
		CLSIDFromString: function(lpsz /*jsStr*/) {
			// lpsz should look like: "886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99" no quotes
			var GUID_or_IID = self.TYPE.GUID();

			var pieces = lpsz.split('-');
			
			GUID_or_IID.Data1 = parseInt(pieces[0], 16);
			GUID_or_IID.Data2 = parseInt(pieces[1], 16);
			GUID_or_IID.Data3 = parseInt(pieces[2], 16);
			
			var piece34 = pieces[3] + '' + pieces[4];
			
			for (var i=0; i<8; i++) {
			  GUID_or_IID.Data4[i] = parseInt(piece34.substr(i*2,2), 16);
			};

			return GUID_or_IID;
		},
		InitPropVariantFromString: function(psz/*PCWSTR*/, ppropvar/*PROPVARIANT.ptr*/) {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/bb762305%28v=vs.85%29.aspx
			 * NOTE1: I have to write my own InitPropVariantFromString because its not in a dll its defined in a header
			 * NOTE2: When using this see notes on MSDN doc page chat of PROPVARIANT ( http://msdn.microsoft.com/en-us/library/windows/desktop/aa380072%28v=vs.85%29.aspx )this guy says: "VT_LPWSTR must be allocated with CoTaskMemAlloc :: (Presumably this also applies to VT_LPSTR) VT_LPWSTR is described as being a string pointer with no information on how it is allocated. You might then assume that the PROPVARIANT doesn't own the string and just has a pointer to it, but you'd be wrong. In fact, the string stored in a VT_LPWSTR PROPVARIANT must be allocated using CoTaskMemAlloc and be freed using CoTaskMemFree. Evidence for this: Look at what the inline InitPropVariantFromString function does: It sets a VT_LPWSTR using SHStrDupW, which in turn allocates the string using CoTaskMemAlloc. Knowing that, it's obvious that PropVariantClear is expected to free the string using CoTaskMemFree. I can't find this explicitly documented anywhere, which is a shame, but step through this code in a debugger and you can confirm that the string is freed by PropVariantClear: ```#include <Propvarutil.h>	int wmain(int argc, TCHAR *lpszArgv[])	{	PROPVARIANT pv;	InitPropVariantFromString(L"Moo", &pv);	::PropVariantClear(&pv);	}```  If  you put some other kind of string pointer into a VT_LPWSTR PROPVARIANT your program is probably going to crash."
			 * HRESULT InitPropVariantFromString(
			 *   __in_   PCWSTR psz,
			 *   __out_  PROPVARIANT *ppropvar
			 * );
			 */
			// SHStrDup uses CoTaskMemAlloc to allocate the strin so is true to the noe from MSDN
			var hr_SHStrDup = self.API('SHStrDup')(psz, ppropvar.contents.pwszVal.address()); //note in PROPVARIANT defintion `pwszVal` is defined as `LPWSTR` and `SHStrDup` expects second arg as `LPTSTR.ptr` but both `LPTSTR` and `LPWSTR` are defined the same with `ctypes.jschar` so this should be no problem // after learnin that LPTSTR is wchar when ifdef_UNICODE and i have ifdef_UNICODE set to true so they are the same
			console.info('hr_SHStrDup:', hr_SHStrDup.toString(), uneval(hr_SHStrDup));
			
			// console.log('propvarPtr.contents.pwszVal', propvarPtr.contents.pwszVal);
			this.checkHRESULT(hr_SHStrDup, 'InitPropVariantFromString -> hr_SHStrDup'); // this will throw if HRESULT is bad

			ppropvar.contents.vt = self.CONST.VT_LPWSTR;

			return hr_SHStrDup;
		},
		InitShellLinkAndPersistFileConsts: function() {
			if (!self.CONST.CLSID_ShellLink || (self.CONST.CLSID_ShellLink.isNull && self.CONST.CLSID_ShellLink.isNull())) {
				if (self.CONST.CLSID_ShellLink && (self.CONST.CLSID_ShellLink.isNull && self.CONST.CLSID_ShellLink.isNull())) {
					console.error('in here because self.CONST.CLSID_ShellLink.isNull() which is ok, i was just curious to see if it ever went to null after set it as const, you kno gc stuff');
				}
				self.CONST.CLSID_ShellLink = self.HELPER.CLSIDFromString('00021401-0000-0000-C000-000000000046');
				// var CLSID_ShellLink = self.TYPE.GUID();
				// var hr_CLSID_ShellLink = ostypes.API('CLSIDFromString')('{}', CLSID_ShellLink.address());
				// //console.info('hr_CLSID_ShellLink:', hr_CLSID_ShellLink, hr_CLSID_ShellLink.toString(), uneval(hr_CLSID_ShellLink));
				// ostypes.HELPER.checkHRESULT(hr_CLSID_ShellLink, 'CLSIDFromString (CLSID_ShellLink)');
				// //console.info('CLSID_ShellLink:', CLSID_ShellLink, CLSID_ShellLink.toString(), uneval(CLSID_ShellLink));
				
				self.CONST.IID_IShellLink = self.HELPER.CLSIDFromString('000214F9-0000-0000-C000-000000000046');
				// var IID_IShellLink = self.TYPE.GUID();
				// hr_IID_IShellLink = ostypes.API('CLSIDFromString')('{000214F9-0000-0000-C000-000000000046}', IID_IShellLink.address());
				// //console.info('hr_IID_IShellLink:', hr_IID_IShellLink, hr_IID_IShellLink.toString(), uneval(hr_IID_IShellLink));
				// ostypes.HELPER.checkHRESULT(hr_IID_IShellLink, 'CLSIDFromString (IID_ShellLink)');
				// //console.info('IID_IShellLink:', IID_IShellLink, IID_IShellLink.toString(), uneval(IID_IShellLink));
				
				self.CONST.IID_IPersistFile = self.HELPER.CLSIDFromString('0000010b-0000-0000-C000-000000000046');
				// var IID_IPersistFile = self.TYPE.GUID();
				// var hr_IID_IPersistFile = ostypes.API('CLSIDFromString')('{0000010b-0000-0000-C000-000000000046}', IID_IPersistFile.address());
				// console.info('hr_IID_IPersistFile:', hr_IID_IPersistFile, hr_IID_IPersistFile.toString(), uneval(hr_IID_IPersistFile));
				// ostypes.HELPER.checkHRESULT(hr_IID_IPersistFile, 'CLSIDFromString (IID_IPersistFile)');
				// console.info('IID_IPersistFile:', IID_IPersistFile, IID_IPersistFile.toString(), uneval(IID_IPersistFile));
			}
		},
		InitPropStoreConsts: function() {
			if (!self.CONST.IID_IPropertyStore || (self.CONST.IID_IPropertyStore.isNull && self.CONST.IID_IPropertyStore.isNull())) {
				if (self.CONST.IID_IPropertyStore && (self.CONST.IID_IPropertyStore.isNull && self.CONST.IID_IPropertyStore.isNull())) {
					console.error('in here because self.CONST.IID_IPropertyStore.isNull() which is ok, i was just curious to see if it ever went to null after set it as const, you kno gc stuff');
				}
				console.log('defining IPropertyStore CONSTs');
				self.CONST.IID_IPropertyStore = self.HELPER.CLSIDFromString('886d8eeb-8cf2-4446-8d02-cdba1dbdcf99');
				//console.info('IID_IPropertyStore:', self.CONST.IID_IPropertyStore.toString());
				
				// this test vaidates that the js version o self.HELPER.CLSIDFromString matches and works fine
				// var aIID_IPropertyStore = self.TYPE.GUID();
				// var hr_CLSIDFromString_IIDIPropertyStore = self.API('CLSIDFromString')('{886d8eeb-8cf2-4446-8d02-cdba1dbdcf99}', aIID_IPropertyStore.address());
				// self.HELPER.checkHRESULT(hr_CLSIDFromString_IIDIPropertyStore, 'CLSIDFromString (IID_IPropertyStore)');
				// console.info('hresult passed fine, aIID_IPropertyStore2:', aIID_IPropertyStore.toString());
								
				var fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource = self.HELPER.CLSIDFromString('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3');
				//console.info('fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource:', fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource.toString());
				
				self.CONST.PKEY_AppUserModel_ID = self.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 5); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391569%28v=vs.85%29.aspx
				self.CONST.PKEY_AppUserModel_RelaunchCommand = self.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 2);// guid and pid from: http://msdn.microsoft.com/en-us/library/dd391571%28v=vs.85%29.aspx
				self.CONST.PKEY_AppUserModel_RelaunchDisplayNameResource = self.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 4); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391572%28v=vs.85%29.aspx
				self.CONST.PKEY_AppUserModel_RelaunchIconResource = self.TYPE.PROPERTYKEY(fmtid_ID_RelaunchCommand_RelaunchDisplayNameResource_RelaunchIconResource, 3); // guid and pid from: http://msdn.microsoft.com/en-us/library/dd391573%28v=vs.85%29.aspx
				//console.log('done defining IPropertyStore CONSTs');
			}
		},
		IPropertyStore_SetValue: function(vtblPpsPtr, pps/*IPropertyStore*/, pkey/*REFPROPERTYKEY*/, pszValue/*PCWSTR*/) {
			// from: http://blogs.msdn.com/b/oldnewthing/archive/2011/06/01/10170113.aspx
			// for strings!! InitPropVariantFromString
			// returns hr of SetValue, but if hr of it failed it will throw, so i dont have to check the return value
			
			var ppropvar = self.TYPE.PROPVARIANT();

			var hr_InitPropVariantFromString = this.InitPropVariantFromString(pszValue, ppropvar.address());
			this.checkHRESULT(hr_InitPropVariantFromString, 'failed InitPropVariantFromString'); //this will throw if HRESULT is bad

			var hr_SetValue = pps.SetValue(vtblPpsPtr, pkey, ppropvar.address());
			this.checkHRESULT(hr_SetValue, 'IPropertyStore_SetValue');
			
			var rez_PropVariantClear = self.API('PropVariantClear')(ppropvar.address());
			console.info('rez_PropVariantClear:', rez_PropVariantClear, rez_PropVariantClear.toString(), uneval(rez_PropVariantClear));

			return hr_SetValue;
		},
		IPropertyStore_GetValue: function(vtblPpsPtr, pps/*IPropertyStore*/, pkey/*REFPROPERTYKEY*/, ppropvar /*PROPVARIANT*/ /* or null if you want jsstr returned */) {
			// currently setup for String propvariants only, meaning  key pwszVal is populated
			// returns hr of GetValue if a ostypes.PROPVARIANT() is supplied as ppropvar arg
			// returns jsstr if ppropvar arg is not supplied (creates a temp propvariant and clears it for function use)
			
			var ret_js = false;
			if (!ppropvar) {
				ppropvar = self.TYPE.PROPVARIANT();
				ret_js = true;
			}
			
			//console.info('pps.GetValue', pps.GetValue);
			var hr_GetValue = pps.GetValue(vtblPpsPtr, pkey, ppropvar.address());
			this.checkHRESULT(hr_GetValue, 'IPropertyStore_GetValue');
			
			//console.info('ppropvar:', ppropvar.toString(), uneval(ppropvar));
			
			if (ret_js) {
				//console.info('ppropvar.pwszVal:', ppropvar.pwszVal.toString(), uneval(ppropvar.pwszVal));
				if (ppropvar.pwszVal.isNull()) {
					console.log('ppropvar.pwszVal is NULL so blank string was found');
					var jsstr = '';
				} else {
					var jsstr = cutils.readAsChar8ThenAsChar16(ppropvar.pwszVal);
				}
				
				var rez_PropVariantClear = self.API('PropVariantClear')(ppropvar.address());
				//console.info('rez_PropVariantClear:', rez_PropVariantClear.toString(), uneval(rez_PropVariantClear));

				return jsstr;
			} else {
				console.warn('remember to clear the PROPVARIANT yourself then');
				return hr_GetValue;
			}
		}
	};
}

var ostypes = new winInit();