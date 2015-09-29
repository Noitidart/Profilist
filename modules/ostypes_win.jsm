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

var wintypesInit = function() {
	this.is64bit = is64bit;
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
	
	// SPECIAL TYPES
	this.NTSTATUS = this.LONG;
	this.SYSTEM_INFORMATION_CLASS = this.INT;
	
	if (ctypes.size_t.size == 8) {
	  this.CallBackABI = ctypes.default_abi;
	  this.WinABI = ctypes.default_abi;
	} else {
	  this.CallBackABI = ctypes.stdcall_abi;
	  this.WinABI = ctypes.winapi_abi;
	}
	
	// CONSTANTS
	this.NULL = ctypes.cast(ctypes.uint64_t(0x0), ctypes.voidptr_t);
	this.PROCESS_DUP_HANDLE = 0x0040;
	this.PROCESS_QUERY_INFORMATION = 0x0400;
	this.MAXIMUM_ALLOWED = 0x02000000;
	
	this.DUPLICATE_SAME_ACCESS = 0x00000002;

	this.STATUS_BUFFER_TOO_SMALL = 0xC0000023>>0;
	this.STATUS_INFO_LENGTH_MISMATCH = 0xC0000004>>0;
	
	this.FileNameInformation = 9; //https://github.com/dezelin/kBuild/blob/1046ac4032f3b455d251067f46083435ce18d9ad/src/kmk/w32/tstFileInfo.c#L40 //http://msdn.microsoft.com/en-us/library/cc232099.aspx //constant for 5th arg of NtQueryInformationFile: `__in_   FILE_INFORMATION_CLASS FileInformationClass`
	this.SystemExtendedHandleInformation = 64;
	
	this.GW_HWNDNEXT = 2;
	
	this.GWL_STYLE = -16;
	this.WS_VISIBLE = 0x10000000;
	this.WS_CAPTION = 0x00C00000;
	
	this.SW_RESTORE = 9;
	
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
		//{'Handles': ostypes.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.ptr.array()}
	]);
}

var ostypes = new wintypesInit();