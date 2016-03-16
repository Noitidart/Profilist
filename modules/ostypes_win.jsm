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
	this.BOOL = ctypes.bool;
	this.BYTE = ctypes.unsigned_char;
	this.CHAR = ctypes.char;
	this.DWORD = ctypes.unsigned_long; // IntSafe.h defines it as: // typedef unsigned long DWORD; // so maybe can change this to ctypes.unsigned_long // i was always using `ctypes.uint32_t`
	this.FILE_INFORMATION_CLASS = ctypes.int; // https://msdn.microsoft.com/en-us/library/windows/hardware/ff728840%28v=vs.85%29.aspx // this is an enum, im guessing enum is ctypes.int
	this.FXPT2DOT30 = ctypes.long; // http://stackoverflow.com/a/20864995/1828637 // https://github.com/wine-mirror/wine/blob/a7247df6ca54fd1209eff9f9199447643ebdaec5/include/wingdi.h#L150
	this.INT = ctypes.int;
	this.INT_PTR = is64bit ? ctypes.int64_t : ctypes.int;
	this.KPRIORITY = ctypes.long; // Definition at line 51 of file ntbasic.h.
	this.KWAIT_REASON = ctypes.int; // im guessing its int because its enum - https://github.com/wine-mirror/wine/blob/1d19eb15d4abfdd14dccc5ac05b83c0ee1a1ace1/include/ddk/wdm.h#L105-L133
	this.LONG = ctypes.long;
	this.LONGLONG = ctypes.long_long;
	this.LONG_PTR = is64bit ? ctypes.int64_t : ctypes.long; // i left it at what i copied pasted it as but i thought it would be `ctypes.intptr_t`
	this.LPCVOID = ctypes.voidptr_t;
	this.LPVOID = ctypes.voidptr_t;
	this.NTSTATUS = ctypes.long; // https://msdn.microsoft.com/en-us/library/cc230357.aspx // typedef long NTSTATUS;
	this.OBJECT_INFORMATION_CLASS = ctypes.int; // im guessing its in, it is an enum though for sure
	this.PVOID = ctypes.voidptr_t;
	this.RM_APP_TYPE = ctypes.unsigned_int; // i dont know im just guessing, i cant find a typedef that makes sense to me: https://msdn.microsoft.com/en-us/library/windows/desktop/aa373670%28v=vs.85%29.aspx
	this.SHORT = ctypes.short;
	this.UINT = ctypes.unsigned_int;
	this.UINT_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_int;
	this.ULONG = ctypes.unsigned_long;
	this.ULONGLONG = ctypes.unsigned_long_long;
	this.ULONG_PTR = is64bit ? ctypes.uint64_t : ctypes.unsigned_long; // i left it at what i copied pasted it as, but i thought it was this: `ctypes.uintptr_t`
	this.USHORT = ctypes.unsigned_short;
	this.VARIANT_BOOL = ctypes.short;
	this.VARTYPE = ctypes.unsigned_short;
	this.VOID = ctypes.void_t;
	this.WCHAR = ctypes.jschar;
	this.WORD = ctypes.unsigned_short;

	// ADVANCED TYPES // as per how it was defined in WinNT.h // defined by "simple types"
	this.ACCESS_MASK = this.DWORD; // https://msdn.microsoft.com/en-us/library/windows/desktop/aa374892%28v=vs.85%29.aspx
	this.ATOM = this.WORD;
	this.BOOLEAN = this.BYTE; // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
	this.COLORREF = this.DWORD; // when i copied/pasted there was this comment next to this: // 0x00bbggrr
	this.DWORD_PTR = this.ULONG_PTR;
	this.HANDLE = this.PVOID;
	this.HRESULT = this.LONG;
	this.LPBYTE = this.BYTE.ptr;
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
	this.PULONG_PTR = this.ULONG.ptr;
	this.PUINT = this.UINT.ptr;
	this.PCWSTR = this.WCHAR.ptr;
	this.SIZE_T = this.ULONG_PTR;
	this.SYSTEM_INFORMATION_CLASS = this.INT; // i think due to this search: http://stackoverflow.com/questions/28858849/where-is-system-information-class-defined // as this is an enum so i guess ctypes.int
	this.TCHAR = ifdef_UNICODE ? this.WCHAR : ctypes.char; // when i copied pasted this it was just ctypes.char and had this comment: // Mozilla compiled with UNICODE/_UNICODE macros and wchar_t = jschar // in "advanced types" section even though second half is ctypes.char because it has something that is advanced, which is the first part, this.WCHAR
	this.WPARAM = this.UINT_PTR;

	// SUPER ADVANCED TYPES // defined by "advanced types"
	this.HBITMAP = this.HANDLE;
	this.HBRUSH = this.HANDLE;
	this.HDC = this.HANDLE;
	this.HFONT = this.HANDLE;
	this.HGDIOBJ = this.HANDLE;
	this.HGLOBAL = this.HANDLE;
	this.HHOOK = this.HANDLE;
	this.HICON = this.HANDLE;
	this.HINSTANCE = this.HANDLE;
	this.HKEY = this.HANDLE;
	this.HMENU = this.HANDLE;
	this.HMONITOR = this.HANDLE;
	this.HRAWINPUT = this.HANDLE;
	this.HRSRC = this.HANDLE;
	this.HWND = this.HANDLE;
	this.LPCOLESTR = this.OLECHAR.ptr; // typedef [string] const OLECHAR *LPCOLESTR; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L288
	this.LPCTSTR = ifdef_UNICODE ? this.LPCWSTR : this.LPCSTR;
	this.LPHANDLE = this.HANDLE.ptr;
	this.LPOLESTR = this.OLECHAR.ptr; // typedef [string] OLECHAR *LPOLESTR; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L287 // http://stackoverflow.com/a/1607335/1828637 // LPOLESTR is usually to be allocated with CoTaskMemAlloc()
	this.LPTSTR = ifdef_UNICODE ? this.LPWSTR : this.LPSTR;
	this.PWSTR = this.LPWSTR; // PWSTR and LPWSTR are the same. The L in LPWSTR stands for "long/far pointer" and it is a leftover from 16 bit when pointers were "far" or "near". Such a distinction no longer exists on 32/64 bit, all pointers have the same size. SOURCE: https://social.msdn.microsoft.com/Forums/vstudio/en-US/52ab8d94-f8f8-427f-ad66-5b38db9a61c9/difference-between-lpwstr-and-pwstr?forum=vclanguage
	this.REGSAM = this.ACCESS_MASK; // https://github.com/wine-mirror/wine/blob/9bd963065b1fb7b445d010897d5f84967eadf75b/include/winreg.h#L53
	
	// SUPER DUPER ADVANCED TYPES // defined by "super advanced types"
	this.HCURSOR = this.HICON;
	this.HMODULE = this.HINSTANCE;
	this.PHKEY = this.HKEY.ptr;
	this.WNDENUMPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.BOOL, [this.HWND, this.LPARAM]); // "super advanced type" because its highest type is `this.HWND` which is "advanced type"

	// inaccrurate types - i know these are something else but setting them to voidptr_t or something just works and all the extra work isnt needed
	this.LPUNKNOWN = ctypes.voidptr_t; // ctypes.StructType('LPUNKNOWN'); // public typedef IUnknown* LPUNKNOWN; // i dont use the full struct so just leave it like this, actually lets just make it voidptr_t
	this.MONITOR_DPI_TYPE = ctypes.unsigned_int;
	this.PCIDLIST_ABSOLUTE = ctypes.voidptr_t; // https://github.com/west-mt/ssbrowser/blob/452e21d728706945ad00f696f84c2f52e8638d08/chrome/content/modules/WindowsShortcutService.jsm#L115
	this.PIDLIST_ABSOLUTE = ctypes.voidptr_t;
	this.WIN32_FIND_DATA = ctypes.voidptr_t;
	this.WINOLEAPI = ctypes.voidptr_t; // i guessed on this one

	// STRUCTURES
	// consts for structures
	var struct_const = {
		CCHDEVICENAME: 32,
		CCHFORMNAME: 32
	};

	// SIMPLE STRUCTS // based on any of the types above
	this.BITMAPINFOHEADER = ctypes.StructType('BITMAPINFOHEADER', [
		{ biSize: this.DWORD },
		{ biWidth: this.LONG },
		{ biHeight: this.LONG },
		{ biPlanes: this.WORD },
		{ biBitCount: this.WORD },
		{ biCompression: this.DWORD },
		{ biSizeImage: this.DWORD },
		{ biXPelsPerMeter: this.LONG },
		{ biYPelsPerMeter: this.LONG },
		{ biClrUsed: this.DWORD },
		{ biClrImportant: this.DWORD }
	]);
	this.CIEXYZ = ctypes.StructType('CIEXYZ', [
		{ ciexyzX: this.FXPT2DOT30 },
		{ ciexyzY: this.FXPT2DOT30 },
		{ ciexyzZ: this.FXPT2DOT30 }
	]);
	this.CLIENT_ID = ctypes.StructType('_CLIENT_ID', [ // http://processhacker.sourceforge.net/doc/struct___c_l_i_e_n_t___i_d.html
		{ UniqueProcess: this.HANDLE },
		{ UniqueThread: this.HANDLE }
	]);
	this.DISPLAY_DEVICE = ctypes.StructType('_DISPLAY_DEVICE', [
		{ cb:			this.DWORD },
		{ DeviceName:	this.TCHAR.array(32) },
		{ DeviceString:	this.TCHAR.array(128) },
		{ StateFlags:	this.DWORD },
		{ DeviceID:		this.TCHAR.array(128) },
		{ DeviceKey:	this.TCHAR.array(128) }
	]);
	this.FILE_NAME_INFORMATION = ctypes.StructType('_FILE_NAME_INFORMATION', [ // https://msdn.microsoft.com/en-us/library/windows/hardware/ff545817%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
		{ FileNameLength: this.ULONG },
		{ FileName: this.WCHAR.array(OS.Constants.Win.MAX_PATH) } // { FileName: this.WCHAR.array(1) }
	]);
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
	this.GROUPICON = ctypes.StructType('_GROUPICON', [ // http://stackoverflow.com/a/22597049/1828637
		{ Reserved1: this.WORD },		// reserved, must be 0
		{ ResourceType: this.WORD },	// type is 1 for icons
		{ ImageCount: this.WORD },		// number of icons in structure (1)
		{ Width: this.BYTE },			// icon width (32)
		{ Height: this.BYTE },			// icon height (32)
		{ Colors: this.BYTE },			// colors (0 means more than 8 bits per pixel)
		{ Reserved2: this.BYTE },		// reserved, must be 0
		{ Planes: this.WORD },			// color planes
		{ BitsPerPixel: this.WORD },	// bit depth
		{ ImageSize: this.DWORD },		// size of structure
		{ ResourceID: this.WORD }		// resource ID
	]);
	this.IO_STATUS_BLOCK = ctypes.StructType('_IO_STATUS_BLOCK', [ // https://msdn.microsoft.com/en-us/library/windows/hardware/ff550671%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
		{ Pointer: this.PVOID }, // union { NTSTATUS Status; PVOID Pointer; } // i just picked PVOID
		{ Information: this.ULONG_PTR }
	]);
	this.LARGE_INTEGER = ctypes.StructType('_LARGE_INTEGER', [ // its a union, so i picked the one that my use case needs // https://msdn.microsoft.com/en-us/library/windows/desktop/aa383713%28v=vs.85%29.aspx
		{ QuadPart: this.LONGLONG }
	]);
	this.POINT = ctypes.StructType('tagPOINT', [
		{ x: this.LONG },
		{ y: this.LONG }
	]);
	this.POINTL = ctypes.StructType('_POINTL', [ // https://github.com/wine-mirror/wine/blob/7eddb864b36d159fa6e6807f65e117ca0a81485c/include/windef.h#L368
		{ x: this.LONG },
		{ y: this.LONG }
	]);
	this.PROPVARIANT = ctypes.StructType('PROPVARIANT', [ // http://msdn.microsoft.com/en-us/library/windows/desktop/bb773381%28v=vs.85%29.aspx
		{ 'vt': this.VARTYPE }, // constants for this are available at MSDN: http://msdn.microsoft.com/en-us/library/windows/desktop/aa380072%28v=vs.85%29.aspx
		{ 'wReserved1': this.WORD },
		{ 'wReserved2': this.WORD },
		{ 'wReserved3': this.WORD },
		{ 'pwszVal': this.LPWSTR } // union, i just use pwszVal so I picked that one // for InitPropVariantFromString // when using this see notes on MSDN doc page chat of PROPVARIANT ( http://msdn.microsoft.com/en-us/library/windows/desktop/aa380072%28v=vs.85%29.aspx )this guy says: "VT_LPWSTR must be allocated with CoTaskMemAlloc :: (Presumably this also applies to VT_LPSTR) VT_LPWSTR is described as being a string pointer with no information on how it is allocated. You might then assume that the PROPVARIANT doesn't own the string and just has a pointer to it, but you'd be wrong. In fact, the string stored in a VT_LPWSTR PROPVARIANT must be allocated using CoTaskMemAlloc and be freed using CoTaskMemFree. Evidence for this: Look at what the inline InitPropVariantFromString function does: It sets a VT_LPWSTR using SHStrDupW, which in turn allocates the string using CoTaskMemAlloc. Knowing that, it's obvious that PropVariantClear is expected to free the string using CoTaskMemFree. I can't find this explicitly documented anywhere, which is a shame, but step through this code in a debugger and you can confirm that the string is freed by PropVariantClear: ```#include <Propvarutil.h>	int wmain(int argc, TCHAR *lpszArgv[])	{	PROPVARIANT pv;	InitPropVariantFromString(L"Moo", &pv);	::PropVariantClear(&pv);	}```  If  you put some other kind of string pointer into a VT_LPWSTR PROPVARIANT your program is probably going to crash."
	]);
	this.RGBQUAD = ctypes.StructType('RGBQUAD', [
		{ rgbBlue:		this.BYTE },
		{ rgbGreen:		this.BYTE },
		{ rgbRed:		this.BYTE },
		{ rgbReserved:	this.BYTE }
	]);
	this.RAWINPUTHEADER = ctypes.StructType('tagRAWINPUTHEADER', [
		{ dwType: this.DWORD },
		{ dwSize: this.DWORD },
		{ hDevice: this.HANDLE },
		{ wParam: this.WPARAM }
	]);
	this.RAWINPUTDEVICE = ctypes.StructType('tagRAWINPUTDEVICE', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/ms645565%28v=vs.85%29.aspx
		{ usUsagePage: this.USHORT },
		{ usUsage: this.USHORT },
		{ dwFlags: this.DWORD },
		{ hwndTarget: this.HWND }
	]);
	this.RAWMOUSE = ctypes.StructType('tagRAWMOUSE', [
		{ usFlags: this.USHORT },
		{ _padding0: this.USHORT },
		{ usButtonFlags: this.USHORT },
		{ usButtonData: this.USHORT },
		{ ulRawButtons: this.ULONG },
		{ lLastX: this.LONG },
		{ lLastY: this.LONG },
		{ ulExtraInformation: this.ULONG }
	]);
    this.RECT = ctypes.StructType('_RECT', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/dd162897%28v=vs.85%29.aspx
        { left: this.LONG },
        { top: this.LONG },
        { right: this.LONG },
        { bottom: this.LONG }
    ]);
	this.SECURITY_ATTRIBUTES = ctypes.StructType('_SECURITY_ATTRIBUTES', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/aa379560%28v=vs.85%29.aspx
		{ 'nLength': this.DWORD },
		{ 'lpSecurityDescriptor': this.LPVOID },
		{ 'bInheritHandle': this.BOOL }
	]);
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
	this.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX = ctypes.StructType('_SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX', [ // http://processhacker.sourceforge.net/doc/struct___s_y_s_t_e_m___h_a_n_d_l_e___t_a_b_l_e___e_n_t_r_y___i_n_f_o___e_x.html // http://processhacker.sourceforge.net/doc/ntexapi_8h_source.html line 1864
		{ Object: this.PVOID },
		{ UniqueProcessId: this.ULONG_PTR  },
		{ HandleValue: this.ULONG_PTR  },
		{ GrantedAccess: this.ULONG },
		{ CreatorBackTraceIndex: this.USHORT },
		{ ObjectTypeIndex: this.USHORT },
		{ HandleAttributes: this.ULONG },
		{ Reserved: this.ULONG }
	]);
	this.UNICODE_STRING = ctypes.StructType('_LSA_UNICODE_STRING', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/aa380518%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
		{ 'Length': this.USHORT },
		{ 'MaximumLength': this.USHORT },
		{ 'Buffer': this.PWSTR }
	]);

	// ADVANCED STRUCTS // based on "simple structs" to be defined first
	this.BITMAPINFO = ctypes.StructType('BITMAPINFO', [
		{ bmiHeader: this.BITMAPINFOHEADER },
		{ bmiColors: this.RGBQUAD.array(1) }
	]);
	this.CIEXYZTRIPLE = ctypes.StructType('CIEXYZTRIPLE', [
		{ ciexyzRed: this.CIEXYZ },
		{ ciexyzGreen: this.CIEXYZ },
		{ ciexyzBlue: this.CIEXYZ }
	]);
	this.CLSID = this.GUID;
	this.DEVMODE = ctypes.StructType('_devicemode', [ // https://msdn.microsoft.com/en-us/library/windows/desktop/dd183565%28v=vs.85%29.aspx // https://github.com/mdsitton/pyglwindow/blob/5aab9de8036938166c01caf26b220c43400aaadb/src/library/win32/wintypes.py#L150
		{ 'dmDeviceName': this.TCHAR.array(struct_const.CCHDEVICENAME) },
		{ 'dmSpecVersion': this.WORD },
		{ 'dmDriverVersion': this.WORD },
		{ 'dmSize': this.WORD },
		{ 'dmDriverExtra': this.WORD },
		{ 'dmFields': this.DWORD },
		{
			'u': ctypes.StructType('_U', [	// union1
				{ 'dmPosition': this.POINTL },
				{ 'dmDisplayOrientation': this.DWORD },
				{ 'dmDisplayFixedOutput': this.DWORD }
			])
		},
		{ 'dmColor': this.SHORT },
		{ 'dmDuplex': this.SHORT },
		{ 'dmYResolution': this.SHORT },
		{ 'dmTTOption': this.SHORT },
		{ 'dmCollate': this.SHORT },
		{ 'dmFormName': this.TCHAR.array(struct_const.CCHFORMNAME) },
		{ 'dmLogPixels': this.WORD },
		{ 'dmBitsPerPel': this.DWORD },
		{ 'dmPelsWidth': this.DWORD },
		{ 'dmPelsHeight': this.DWORD },
		{ 'dmDisplayFlags': this.DWORD  },	// union2
		{ 'dmDisplayFrequency': this.DWORD },
		{ 'dmICMMethod': this.DWORD },
		{ 'dmICMIntent': this.DWORD },
		{ 'dmMediaType': this.DWORD },
		{ 'dmDitherType': this.DWORD },
		{ 'dmReserved1': this.DWORD },
		{ 'dmReserved2': this.DWORD },
		{ 'dmPanningWidth': this.DWORD },
		{ 'dmPanningHeight': this.DWORD }
	]);
	this.IID = this.GUID;
	this.LPSECURITY_ATTRIBUTES = this.SECURITY_ATTRIBUTES.ptr;
	this.MONITORINFOEX = ctypes.StructType('tagMONITORINFOEX', [
		{ cbSize:		this.DWORD },
		{ rcMonitor:	this.RECT },
		{ rcWork:		this.RECT },
		{ dwFlags:		this.DWORD },
		{ szDevice:		this.TCHAR.array(struct_const.CCHDEVICENAME) }
	]);
	this.MSLLHOOKSTRUCT = ctypes.StructType('tagMSLLHOOKSTRUCT', [
		{ pt: this.POINT },
		{ mouseData: this.DWORD },
		{ flags: this.DWORD },
		{ time: this.DWORD },
		{ dwExtraInfo: this.ULONG_PTR }
	]);
	this.MSG = ctypes.StructType('tagMSG', [
		{ hwnd: this.HWND },
		{ message: this.UINT },
		{ wParam: this.WPARAM },
		{ lParam: this.LPARAM },
		{ time: this.DWORD },
		{ pt: this.POINT }
	]);
	this.OBJECT_NAME_INFORMATION = ctypes.StructType('_OBJECT_NAME_INFORMATION', [ // https://github.com/wine-mirror/wine/blob/80ea5a01ef42b0e9e0b6c872f8f5bbbf393c0ae7/include/winternl.h#L1107
		{ Name: this.UNICODE_STRING }
	]);
	this.PGUID = this.GUID.ptr;
	this.PIO_STATUS_BLOCK = this.IO_STATUS_BLOCK.ptr;
    this.PRECT = this.RECT.ptr;
	this.PROPERTYKEY = new ctypes.StructType('PROPERTYKEY', [
		{ 'fmtid': this.GUID },
		{ 'pid': this.DWORD }
	]);
    this.LPRECT = this.RECT.ptr;
    this.LPCRECT = this.RECT.ptr;
	this.LPPOINT = this.POINT.ptr;
	this.PBITMAPINFOHEADER = this.BITMAPINFOHEADER.ptr;
	this.PDISPLAY_DEVICE = this.DISPLAY_DEVICE.ptr;
	this.PCRAWINPUTDEVICE = this.RAWINPUTDEVICE.ptr;
	this.RAWINPUT = ctypes.StructType('tagRAWINPUT', [
		{ header: this.RAWINPUTHEADER },
		{ mouse: this.RAWMOUSE } // use this.RAWMOUSE instead of RAWHID or RAWKEYBOARD as RAWMOUSE struct is the biggest, the tutorial linked below also says this
	]);
	this.REFPROPVARIANT = this.PROPVARIANT.ptr;
	this.SYSTEM_HANDLE_INFORMATION_EX = ctypes.StructType('_SYSTEM_HANDLE_INFORMATION_EX', [ // http://processhacker.sourceforge.net/doc/ntexapi_8h_source.html#l01876 // http://processhacker.sourceforge.net/doc/struct___s_y_s_t_e_m___h_a_n_d_l_e___i_n_f_o_r_m_a_t_i_o_n___e_x.html#a207406a9486f1f35c2e9bf5214612e62
		{ NumberOfHandles: this.ULONG_PTR },
		{ Reserved: this.ULONG_PTR },
		{ Handles: this.SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX.array(1) }
	])
	this.SYSTEM_THREAD_INFORMATION = ctypes.StructType('_SYSTEM_THREAD_INFORMATION', [ // http://processhacker.sourceforge.net/doc/struct___s_y_s_t_e_m___t_h_r_e_a_d___i_n_f_o_r_m_a_t_i_o_n.html
		{ KernelTime: this.LARGE_INTEGER },
		{ UserTime: this.LARGE_INTEGER },
		{ CreateTime: this.LARGE_INTEGER },
		{ WaitTime: this.ULONG },
		{ StartAddress: this.PVOID },
		{ ClientId: this.CLIENT_ID },
		{ Priority: this.KPRIORITY },
		{ BasePriority: this.LONG },
		{ ContextSwitches: this.ULONG },
		{ ThreadState: this.ULONG },
		{ WaitReason: this.KWAIT_REASON }
	]);
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

	// FURTHER ADVANCED STRUCTS
	this.REFCLSID = this.CLSID.ptr; // https://github.com/wine-mirror/wine/blob/bdeb761357c87d41247e0960f71e20d3f05e40e6/include/wtypes.idl#L288
	this.REFIID = this.IID.ptr;
	this.REFPROPERTYKEY = this.PROPERTYKEY.ptr; // note: if you use any REF... (like this.REFPROPERTYKEY) as an arg to a declare, that arg expects a ptr. this is basically like
	this.SYSTEM_PROCESS_INFORMATION = ctypes.StructType('_SYSTEM_PROCESS_INFORMATION', [ // http://processhacker.sourceforge.net/doc/struct___s_y_s_t_e_m___p_r_o_c_e_s_s___i_n_f_o_r_m_a_t_i_o_n.html
		{ NextEntryOffset: this.ULONG },
		{ NumberOfThreads: this.ULONG },
		{ WorkingSetPrivateSize: this.LARGE_INTEGER },		// since VISTA
		{ HardFaultCount: this.ULONG },						// since WIN7
		{ NumberOfThreadsHighWatermark: this.ULONG },		// since WIN7
		{ CycleTime: this.ULONGLONG },						// since WIN7
		{ CreateTime: this.LARGE_INTEGER },
		{ UserTime: this.LARGE_INTEGER },
		{ KernelTime: this.LARGE_INTEGER },
		{ ImageName: this.UNICODE_STRING },
		{ BasePriority: this.KPRIORITY },
		{ UniqueProcessId: this.HANDLE },
		{ InheritedFromUniqueProcessId: this.HANDLE },
		{ HandleCount: this.ULONG },
		{ SessionId: this.ULONG },
		{ UniqueProcessKey: this.ULONG_PTR },				// since VISTA (requires SystemExtendedProcessInformation)
		{ PeakVirtualSize: this.size_t },
		{ VirtualSize: this.size_t },
		{ PageFaultCount: this.ULONG },
		{ PeakWorkingSetSize: this.size_t },
		{ WorkingSetSize: this.size_t },
		{ QuotaPeakPagedPoolUsage: this.size_t },
		{ QuotaPagedPoolUsage: this.size_t },
		{ QuotaPeakNonPagedPoolUsage: this.size_t },
		{ QuotaNonPagedPoolUsage: this.size_t },
		{ PagefileUsage: this.size_t },
		{ PeakPagefileUsage: this.size_t },
		{ PrivatePageCount: this.size_t },
		{ ReadOperationCount: this.LARGE_INTEGER },
		{ WriteOperationCount: this.LARGE_INTEGER },
		{ OtherOperationCount: this.LARGE_INTEGER },
		{ ReadTransferCount: this.LARGE_INTEGER },
		{ WriteTransferCount: this.LARGE_INTEGER },
		{ OtherTransferCount: this.LARGE_INTEGER },
		{ Threads: this.SYSTEM_THREAD_INFORMATION.array(1) }
	]);

	this.BITMAPV5HEADER = ctypes.StructType('BITMAPV5HEADER', [
		{ bV5Size:			this.DWORD },
		{ bV5Width:			this.LONG },
		{ bV5Height:		this.LONG },
		{ bV5Planes:		this.WORD },
		{ bV5BitCount:		this.WORD },
		{ bV5Compression:	this.DWORD },
		{ bV5SizeImage:		this.DWORD },
		{ bV5XPelsPerMeter:	this.LONG },
		{ bV5YPelsPerMeter:	this.LONG },
		{ bV5ClrUsed:		this.DWORD },
		{ bV5ClrImportant:	this.DWORD },
		{ bV5RedMask:		this.DWORD },
		{ bV5GreenMask:		this.DWORD },
		{ bV5BlueMask:		this.DWORD },
		{ bV5AlphaMask:		this.DWORD },
		{ bV5CSType:		this.DWORD },
		{ bV5Endpoints:		this.CIEXYZTRIPLE },
		{ bV5GammaRed:		this.DWORD },
		{ bV5GammaGreen:	this.DWORD },
		{ bV5GammaBlue:		this.DWORD },
		{ bV5Intent:		this.DWORD },
		{ bV5ProfileData:	this.DWORD },
		{ bV5ProfileSize:	this.DWORD },
		{ bV5Reserved:		this.DWORD }
	]);
	this.LPMONITORINFOEX = this.MONITORINFOEX.ptr;
	this.PMSG = this.MSG.ptr;
	
	// SUPER ADVANCED STRUCTS
	this.PBITMAPINFO = this.BITMAPINFO.ptr;
	this.LPMSG = this.MSG.ptr;	
	
	// FUNCTION TYPES
	this.MONITORENUMPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.BOOL, [this.HMONITOR, this.HDC, this.LPRECT, this.LPARAM]);
	this.LowLevelMouseProc = ctypes.FunctionType(this.CALLBACK_ABI, this.LRESULT, [this.INT, this.WPARAM, this.LPARAM]);
	this.WNDPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.LRESULT, [
		this.HWND,		// hwnd,
		this.UINT,		// uMsg,
		this.WPARAM,	// wParam,
		this.LPARAM	// lParam
	]);
	this.TIMERPROC = ctypes.FunctionType(this.CALLBACK_ABI, this.VOID, [this.HWND, this.UINT, this.UINT_PTR, this.DWORD]);
	
	// some more guess types
	this.HOOKPROC = this.LowLevelMouseProc.ptr; // not a guess really, as this is the hook type i use, so yeah it has to be a pointer to it
	
	// STRUCTS USING FUNC TYPES
	this.WNDCLASS = ctypes.StructType('tagWNDCLASS', [
		{ style: this.UINT },
		{ lpfnWndProc: this.WNDPROC.ptr },
		{ cbClsExtra: this.INT },
		{ cbWndExtra: this.INT },
		{ hInstance: this.HINSTANCE },
		{ hIcon: this.HICON },
		{ hCursor: this.HCURSOR },
		{ hbrBackground: this.HBRUSH },
		{ lpszMenuName: this.LPCTSTR },
		{ lpszClassName: this.LPCTSTR }
	]);
	
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

}

var winInit = function() {
	var self = this;

	this.IS64BIT = is64bit;

	this.TYPE = new winTypes();

	// CONSTANTS
	this.CONST = {
		BI_BITFIELDS: 3,
		BI_RGB: 0,
		BITSPIXEL: 12,
		CCHDEVICENAME: 32,
		DIB_RGB_COLORS: 0,
		DISPLAY_DEVICE_ATTACHED_TO_DESKTOP: 1, // same as DISPLAY_DEVICE_ACTIVE
		DISPLAY_DEVICE_PRIMARY_DEVICE: 4,
		DISPLAY_DEVICE_MIRRORING_DRIVER: 8,
		DM_BITSPERPEL: 0x00040000,
		DM_DISPLAYFREQUENCY: 0x00400000,
		DM_PELSHEIGHT: 0x00100000,
		DM_PELSWIDTH: 0x00080000,
		ENUM_CURRENT_SETTINGS: self.TYPE.DWORD.size == 4 ? /*use 8 letters for size 4*/ self.TYPE.DWORD('0xFFFFFFFF') : /*size is 8 so use 16 letters*/ self.TYPE.DWORD('0xFFFFFFFFFFFFFFFF'),
		ENUM_REGISTRY_SETTINGS: self.TYPE.DWORD.size == 4 ? self.TYPE.DWORD('0xFFFFFFFE') : self.TYPE.DWORD('0xFFFFFFFFFFFFFFFE'),
		HORZRES: 8,
		HWND_MESSAGE: -3,
		LOGPIXELSX: 88,
		LOGPIXELSY: 90,
		MONITOR_DEFAULTTONEAREST: 2,
		PM_NOREMOVE: 0,
		PM_REMOVE: 1,
		S_OK: 0,
		S_FALSE: 1,
		SRCCOPY: self.TYPE.DWORD('0x00CC0020'),
		VERTRES: 10,
		HWND_TOPMOST: self.TYPE.HWND(-1), // toString: "ctypes.voidptr_t(ctypes.UInt64("0xffffffff"))" cannot do self.TYPE.HWND('-1') as that puts out `TypeError: can't convert the string "-1" to the type ctypes.voidptr_t`
		SWP_NOSIZE: 1,
		SWP_NOMOVE: 2,
		SWP_NOREDRAW: 8,
		MDT_Effective_DPI: 0,
		MDT_Angular_DPI: 1,
		MDT_Raw_DPI: 2,
		MDT_Default: 0, // MDT_Effective_DPI
		WS_VISIBLE: 0x10000000,
		GWL_STYLE: -16,
		WM_MOUSEMOVE: 0x200,
		WM_LBUTTONDOWN: 0x201,
		WM_LBUTTONUP: 0x202,
		WM_LBUTTONDBLCLK: 0x203,
		WM_RBUTTONDOWN: 0x204,
		WM_RBUTTONUP: 0x205,
		WM_RBUTTONDBLCLK: 0x206,
		WM_MBUTTONDOWN: 0x207,
		WM_MBUTTONUP: 0x208,
		WM_MBUTTONDBLCLK: 0x209,
		WM_MOUSEWHEEL: 0x20A,
		WM_XBUTTONDOWN: 0x20B,
		WM_XBUTTONUP: 0x20C,
		WM_XBUTTONDBLCLK: 0x20D,
		WM_MOUSEHWHEEL: 0x20E,
		WM_NCXBUTTONDOWN: 0x00AB,
		WM_NCXBUTTONUP: 0x00AC,
		WM_NCXBUTTONDBLCLK: 0x00AD,
		WH_MOUSE_LL: 14,
		RIDEV_INPUTSINK: 0x00000100,
		RID_INPUT: 0x10000003,
		WM_CREATE: 0x0001,
		WM_INPUT: 0x00FF,
		RI_MOUSE_LEFT_BUTTON_DOWN: 0x0001,
		RI_MOUSE_LEFT_BUTTON_UP: 0x0002,
		RI_MOUSE_MIDDLE_BUTTON_DOWN: 0x0010,
		RI_MOUSE_MIDDLE_BUTTON_UP: 0x0020,
		RI_MOUSE_RIGHT_BUTTON_DOWN: 0x0004,
		RI_MOUSE_RIGHT_BUTTON_UP: 0x0008,
		RI_MOUSE_BUTTON_1_DOWN: 0x0001,
		RI_MOUSE_BUTTON_1_UP: 0x0002,
		RI_MOUSE_BUTTON_2_DOWN: 0x0004,
		RI_MOUSE_BUTTON_2_UP: 0x0008,
		RI_MOUSE_BUTTON_3_DOWN: 0x0010,
		RI_MOUSE_BUTTON_3_UP: 0x0020,
		RI_MOUSE_BUTTON_4_DOWN: 0x0040,
		RI_MOUSE_BUTTON_4_UP: 0x0080,
		RI_MOUSE_BUTTON_5_DOWN: 0x100,
		RI_MOUSE_BUTTON_5_UP: 0x0200,
		RI_MOUSE_WHEEL: 0x0400,
		RI_MOUSE_HORIZONTAL_WHEEL: 0x0800,
		XBUTTON1: 0x0001,
		XBUTTON2: 0x0002,
		
		CLSCTX_INPROC_SERVER: 0x1,
		COINIT_APARTMENTTHREADED: 0x2,
		
		VARIANT_FALSE: 0, // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
		VARIANT_TRUE: -1, // http://blogs.msdn.com/b/oldnewthing/archive/2004/12/22/329884.aspx
		VT_LPWSTR: 0x001F, // 31
		
		SW_SHOWNORMAL: 1,
		
		STATUS_SUCCESS: 0x00000000,
		STATUS_BUFFER_TOO_SMALL: 0xC0000023 >> 0, // link847456312312132 - need the >> 0
		STATUS_INFO_LENGTH_MISMATCH: 0xC0000004 >> 0, // link847456312312132 - need the >> 0 otherwise cutils.jscGetDeepest of return of NtQuerySystemInformation is -1073741820 and jscGetDeepest of CONST.STATUS_INFO_LENGTH_MISMATCH is 3221225476
		
		SystemProcessInformation: 5, // https://github.com/wine-mirror/wine/blob/80ea5a01ef42b0e9e0b6c872f8f5bbbf393c0ae7/include/winternl.h#L771-L847
		SystemHandleInformation: 16,
		SystemExtendedHandleInformation: 64, // http://processhacker.sourceforge.net/doc/ntexapi_8h.html#ad5d815b48e8f4da1ef2eb7a2f18a54e0a6b30a1ad494061a4d95fd1d0b2c2e9b5 - as the wine repo shows it as unknown. process hacker has them listed out in order of enum which is just from ntextapi.h - http://processhacker.sourceforge.net/doc/ntexapi_8h_source.html --- and note that SystemBasicInformation is 0 so 64 lines below that is this, cool stuff
		
		SW_RESTORE: 9,
		
		SLGP_RAWPATH: 0x4,
		
		FileNameInformation: 9, // https://msdn.microsoft.com/en-us/library/windows/hardware/ff728840%28v=vs.85%29.aspx
		
		PROCESS_DUP_HANDLE: 0x0040,
		PROCESS_QUERY_INFORMATION: 0x0400,
		MAXIMUM_ALLOWED: 0x02000000,
		DUPLICATE_SAME_ACCESS: 0x00000002,
		
		ObjectNameInformation: 1,
		
		HKEY_CURRENT_USER: self.TYPE.HKEY(0x80000001), // https://github.com/wine-mirror/wine/blob/9bd963065b1fb7b445d010897d5f84967eadf75b/include/winreg.h#L29
		HKEY_LOCAL_MACHINE: self.TYPE.HKEY(0x80000002), // https://github.com/wine-mirror/wine/blob/9bd963065b1fb7b445d010897d5f84967eadf75b/include/winreg.h#L30
		KEY_QUERY_VALUE: 0x00000001,
		
		ERROR_SUCCESS: 0x00000000,
		ERROR_FILE_NOT_FOUND: 0x00000002,
		
		RT_ICON: '3', // https://github.com/wine-mirror/wine/blob/c266d373deb417abef4883f59daa5d517b77e76c/include/winuser.h#L761
		RT_GROUP_ICON: '14', // https://github.com/wine-mirror/wine/blob/c266d373deb417abef4883f59daa5d517b77e76c/include/winuser.h#L771
		
		LANG_ENGLISH: 0x0C09,
		SUBLANG_DEFAULT: 0x01,
		
		CP_ACP: 0,
		
		GCLP_HICON: -14,
		GCLP_HICONSM: -34,
		
		IMAGE_ICON: 1,
		LR_DEFAULTSIZE: 0x00000040,
		LR_LOADFROMFILE: 16
	};
	
	var _lib = {}; // cache for lib
	var libAttempter = function(aPath, aPrefered, aPossibles) {
		// place aPrefered at front of aPossibles
		if (aPrefered) {
			aPossibles.splice(aPossibles.indexOf(aPrefered), 1); // link123543939
			aPossibles.splice(0, 0, aPrefered);
		}
		
		for (var i=0; i<aPossibles.length; i++) {
			try {
				_lib[aPath] = ctypes.open(aPossibles[i]);
				break;
			} catch (ignore) {
				// on windows ignore.message == "couldn't open library rawr: error 126"
				// on ubuntu ignore.message == ""couldn't open library rawr: rawr: cannot open shared object file: No such file or directory""
			}
		}
		if (!_lib[aPath]) {
			throw new Error({
				name: 'platform-error',
				message: 'Path to ' + path + ' on operating system of , "' + OS.Constants.Sys.Name + '" was not found. This does not mean it is not supported, it means that the author of this addon did not specify the proper name. Report this to author.'
			});
		}
	};
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
		_swab: function() {
			return lib('msvcrt').declare('_swab', self.TYPE.ABI,
				self.TYPE.void,
				self.TYPE.char.ptr,
				self.TYPE.char.ptr,
				self.TYPE.int
			);
		},
		AttachThreadInput: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms681956%28v=vs.85%29.aspx
			 * BOOL WINAPI AttachThreadInput(
			 *   __in_ DWORD idAttach,
			 *   __in_ DWORD idAttachTo,
			 *   __in_ BOOL  fAttach
			 * );
			 */
			return lib('user32').declare('AttachThreadInput', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.DWORD,	// idAttach
				self.TYPE.DWORD,	// idAttachTo
				self.TYPE.BOOL		// fAttach
			);
		},
		BeginUpdateResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648030%28v=vs.85%29.aspx
			 * HANDLE WINAPI BeginUpdateResource(
			 *   __in_ LPCTSTR pFileName,
			 *   __in_ BOOL    bDeleteExistingResources
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'BeginUpdateResourceW' : 'BeginUpdateResourceA', self.TYPE.ABI,
				self.TYPE.HANDLE,		// return
				self.TYPE.LPCTSTR,		// pFileName
				self.TYPE.BOOL			// bDeleteExistingResources
			);
		},
		BitBlt: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183370%28v=vs.85%29.aspx
			 * BOOL BitBlt(
			 *   __in_  HDC hdcDest,
			 *   __in_  int nXDest,
			 *   __in_  int nYDest,
			 *   __in_  int nWidth,
			 *   __in_  int nHeight,
			 *   __in_  HDC hdcSrc,
			 *   __in_  int nXSrc,
			 *   __in_  int nYSrc,
			 *   __in_  DWORD dwRop
			 * );
			 */
			return lib('gdi32').declare('BitBlt', self.TYPE.ABI,
				self.TYPE.BOOL, //return
				self.TYPE.HDC, // hdcDest
				self.TYPE.INT, // nXDest
				self.TYPE.INT, // nYDest
				self.TYPE.INT, // nWidth
				self.TYPE.INT, // nHeight
				self.TYPE.HDC, // hdcSrc
				self.TYPE.INT, // nXSrc
				self.TYPE.INT, // nYSrc
				self.TYPE.DWORD // dwRop
			);
		},
		CloseHandle: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724211%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
			 * BOOL WINAPI CloseHandle(
			 *   __in_ HANDLE hObject
			 * );
			 */
			return lib('kernel32').declare('CloseHandle', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HANDLE	// hObject
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
			return lib('ole32').declare('CoCreateInstance', self.TYPE.ABI,
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
			return lib('ole32').declare('CoInitializeEx', self.TYPE.ABI,
				self.TYPE.HRESULT,	// result
				self.TYPE.LPVOID,	// pvReserved
				self.TYPE.DWORD		// dwCoInit
			);
		},
		CoUninitialize: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms688715%28v=vs.85%29.aspx
			 * void CoUninitialize(void);
			 */
			return lib('ole32').declare('CoUninitialize', self.TYPE.ABI,
				self.TYPE.VOID	// return
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
			return lib('kernel32').declare('CreateHardLinkW', self.TYPE.ABI,
				self.TYPE.BOOL,					// return
				self.TYPE.LPCTSTR,				// lpFileName
				self.TYPE.LPCTSTR,				// lpExistingFileName
				self.TYPE.LPSECURITY_ATTRIBUTES	// lpSecurityAttributes
			);
		},
		CreateCompatibleBitmap: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183488%28v=vs.85%29.aspx
			 * HBITMAP CreateCompatibleBitmap(
			 *   __in_  HDC hdc,
			 *   __in_  int nWidth,
			 *   __in_  int nHeight
			 * );
			 */
			return lib('gdi32').declare('CreateCompatibleBitmap', self.TYPE.ABI,
				self.TYPE.HBITMAP, //return
				self.TYPE.HDC, // hdc
				self.TYPE.INT, // nWidth
				self.TYPE.INT // nHeight
			);
		},
		CreateCompatibleDC: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183489%28v=vs.85%29.aspx
			 * HDC CreateCompatibleDC(
			 *   __in_  HDC hdc
			 * );
			 */
			return lib('gdi32').declare('CreateCompatibleDC', self.TYPE.ABI,
				self.TYPE.HDC, //return
				self.TYPE.HDC // hdc
			);
		},
		CreateDC: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd183490%28v=vs.85%29.aspx
			 * HDC CreateDC(
			 *  __in_  LPCTSTR lpszDriver,
			 *  __in_  LPCTSTR lpszDevice,
			 *  __in_  LPCTSTR lpszOutput,
			 *  __in_  const DEVMODE *lpInitData
			 * );
			 */
			return lib('gdi32').declare(ifdef_UNICODE ? 'CreateDCW' : 'CreateDCA', self.TYPE.ABI,
				self.TYPE.HDC, //return
				self.TYPE.LPCTSTR,		// lpszDriver
				self.TYPE.LPCTSTR, 		// lpszDevice
				self.TYPE.LPCTSTR, 		// lpszOutput
				self.TYPE.DEVMODE.ptr	// *lpInitData
			);
		},
		CreateDIBSection: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd183494%28v=vs.85%29.aspx
			 * HBITMAP CreateDIBSection(
			 *   __in_   HDC        hdc,
			 *   __in_   const BITMAPINFO *pbmi,
			 *   __in_   UINT       iUsage,
			 *   __out_  VOID       **ppvBits,
			 *   __in_   HANDLE     hSection,
			 *   __in_   DWORD      dwOffset
			 * );
			 */
			return lib('gdi32').declare('CreateDIBSection', self.TYPE.ABI,
				self.TYPE.HBITMAP,			//return
				self.TYPE.HDC,				// hdc
				self.TYPE.BITMAPINFO.ptr,	// *pbmi
				self.TYPE.UINT,				// iUsage
				self.TYPE.BYTE.ptr.ptr,		// **ppvBits
				self.TYPE.HANDLE,			// hSection
				self.TYPE.DWORD				// dwOffset
			);
		},
		CreateWindowEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms632680%28v=vs.85%29.aspx
			 * HWND WINAPI CreateWindowEx(
			 *   __in_     DWORD     dwExStyle,
			 *   __in_opt_ LPCTSTR   lpClassName,
			 *   __in_opt_ LPCTSTR   lpWindowName,
			 *   __in_     DWORD     dwStyle,
			 *   __in_     int       x,
			 *   __in_     int       y,
			 *   __in_     int       nWidth,
			 *   __in_     int       nHeight,
			 *   __in_opt_ HWND      hWndParent,
			 *   __in_opt_ HMENU     hMenu,
			 *   __in_opt_ HINSTANCE hInstance,
			 *   __in_opt_ LPVOID    lpParam
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'CreateWindowExW' : 'CreateWindowExA', self.TYPE.ABI,
				self.TYPE.HWND,			// return
				self.TYPE.DWORD,		// dwExStyle
				self.TYPE.LPCTSTR,		// lpClassName
				self.TYPE.LPCTSTR,		// lpWindowName
				self.TYPE.DWORD,		// dwStyle
				self.TYPE.INT,			// x
				self.TYPE.INT,			// y
				self.TYPE.INT,			// nWidth
				self.TYPE.INT,			// nHeight
				self.TYPE.HWND,			// hWndParent
				self.TYPE.HMENU,		// hMenu
				self.TYPE.HINSTANCE,	// hInstance
				self.TYPE.LPVOID		// lpParam
			);
		},
		DefWindowProc: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633572%28v=vs.85%29.aspx
			 * LRESULT WINAPI DefWindowProc(
			 *   __in_ HWND   hWnd,
			 *   __in_ UINT   Msg,
			 *   __in_ WPARAM wParam,
			 *   __in_ LPARAM lParam
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'DefWindowProcW' : 'DefWindowProcA', self.TYPE.ABI,
				self.TYPE.LRESULT,	// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.UINT,		// Msg
				self.TYPE.WPARAM,	// wParam
				self.TYPE.LPARAM	// lParam
			);
		},
		DeleteDC: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183489%28v=vs.85%29.aspx
			 * BOOL DeleteDC(
			 *   __in_  HDC hdc
			 * );
			 */
			return lib('gdi32').declare('DeleteDC', self.TYPE.ABI,
				self.TYPE.BOOL, //return
				self.TYPE.HDC // hdc
			);
		},
		DeleteObject: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd183539%28v=vs.85%29.aspx
			 * BOOL DeleteObject(
			 *   _in_  HGDIOBJ hObject
			 * );
			 */
			return lib('gdi32').declare('DeleteObject', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HGDIOBJ	// hObject
			);
		},
		DestroyIcon: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648063%28v=vs.85%29.aspx
			 * BOOL WINAPI DestroyIcon(
			 *   _In_  HICON hIcon
			 * );
			 */
			return lib('user32').declare('DestroyIcon', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HICON		// hIcon
			);
		},
		DestroyWindow: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms632682%28v=vs.85%29.aspx
			 * BOOL WINAPI DestroyWindow(
			 *   __in_ HWND hWnd
			 * );
			 */
			return lib('user32').declare('DestroyWindow', self.TYPE.ABI,
				self.TYPE.BOOL,	// return
				self.TYPE.HWND	// hWnd
			);
		},
		DispatchMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644934%28v=vs.85%29.aspx
			 * LRESULT WINAPI DispatchMessage(
			 *   __in_ const MSG *lpmsg
			 * );
			 */
			return lib('user32').declare('DestroyWindow', self.TYPE.ABI,
				self.TYPE.LRESULT,	// return
				self.TYPE.MSG.ptr	// *lpmsg
			);
		},
		DuplicateHandle: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724251%28v=vs.85%29.aspx
			 * BOOL WINAPI DuplicateHandle(
			 *   __in_  HANDLE   hSourceProcessHandle,
			 *   __in_  HANDLE   hSourceHandle,
			 *   __in_  HANDLE   hTargetProcessHandle,
			 *   __out_ LPHANDLE lpTargetHandle,
			 *   __in_  DWORD    dwDesiredAccess,
			 *   __in_  BOOL     bInheritHandle,
			 *   __in_  DWORD    dwOptions
			 * );
			 */
			return lib('kernel32').declare('DuplicateHandle', self.TYPE.ABI,
				self.TYPE.BOOL,			// return
				self.TYPE.HANDLE,		// hSourceProcessHandle
				self.TYPE.HANDLE,		// hSourceHandle
				self.TYPE.HANDLE,		// hTargetProcessHandle
				self.TYPE.LPHANDLE,		// lpTargetHandle
				self.TYPE.DWORD,		// dwDesiredAccess
				self.TYPE.BOOL,			// bInheritHandle
				self.TYPE.DWORD			// dwOptions
			);
		},
		EndUpdateResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648032%28v=vs.85%29.aspx
			 * BOOL WINAPI EndUpdateResource(
			 *   __in_ HANDLE hUpdate,
			 *   __in_ BOOL   fDiscard
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'EndUpdateResourceW' : 'EndUpdateResourceA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HANDLE,	// hUpdate
				self.TYPE.BOOL		// fDiscard
			);
		},
		EnumDisplayDevices: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd162609%28v=vs.85%29.aspx
			 * BOOL EnumDisplayDevices(
			 *   _In_   LPCTSTR         lpDevice,
			 *   _In_   DWORD           iDevNum,
			 *   _Out_  PDISPLAY_DEVICE lpDisplayDevice,
			 *   _In_   DWORD           dwFlags
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'EnumDisplayDevicesW' : 'EnumDisplayDevicesA', self.TYPE.ABI,
				self.TYPE.BOOL,				// return
				self.TYPE.LPCTSTR,			// lpDevice
				self.TYPE.DWORD,			// iDevNum
				self.TYPE.PDISPLAY_DEVICE,	// lpDisplayDevice
				self.TYPE.DWORD				// dwFlags
			);
		},
		EnumDisplayMonitors: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183489%28v=vs.85%29.aspx
			 * BOOL EnumDisplayMonitors(
			 *   __in_  HDC             hdc,
			 *   __in_  LPCRECT         lprcClip,
			 *   __in_  MONITORENUMPROC *lpfnEnum,
			 *   __in_  LPARAM          dwData
			 * );
			 */
			return lib('user32').declare('EnumDisplayMonitors', self.TYPE.ABI,
				self.TYPE.BOOL,					// return
				self.TYPE.HDC,					// hdc,
				self.TYPE.LPCRECT,				// lprcClip,
				self.TYPE.MONITORENUMPROC.ptr,	// lpfnEnum,
				self.TYPE.LPARAM				// dwData
			);
		},
		EnumDisplaySettings: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd162611%28v=vs.85%29.aspx
			 * BOOL EnumDisplaySettings(
			 *   _In_   LPCTSTR lpszDeviceName,
			 *   _In_   DWORD   iModeNum,
			 *   _Out_  DEVMODE *lpDevMode
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'EnumDisplaySettingsW' : 'EnumDisplaySettingsA', self.TYPE.ABI,
				self.TYPE.BOOL,			// return
				self.TYPE.LPCTSTR,		// lpszDeviceName
			    self.TYPE.DWORD,		// iModeNum
			    self.TYPE.DEVMODE.ptr	// *lpDevMode
			);
		},
		EnumWindows: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633497%28v=vs.85%29.aspx
			 * BOOL WINAPI EnumWindows(
			 *   __in_  WNDENUMPROC lpEnumFunc,
			 *   __in_  LPARAM lParam
			 * );
			 */
			return lib('user32').declare('EnumWindows', self.TYPE.ABI,
				self.TYPE.BOOL,				// return
				self.TYPE.WNDENUMPROC.ptr,	// lpEnumFunc
				self.TYPE.LPARAM			// lParam
			);
		},
		FindResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648042%28v=vs.85%29.aspx
			 * HRSRC WINAPI FindResource(
			 *   _in_opt_ HMODULE hModule,
			 *   _in_     LPCTSTR lpName,
			 *   _in_     LPCTSTR lpType
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'FindResourceW' : 'FindResourceA', self.TYPE.ABI,
				self.TYPE.HRSRC,		// return
				self.TYPE.HMODULE,		// hModule
				self.TYPE.LPCTSTR,		// lpName
				self.TYPE.LPCTSTR		// lpType
			);
		},
		FindResourceEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648043%28v=vs.85%29.aspx
			 * HRSRC WINAPI FindResourceEx(
			 *   __in_opt_ HMODULE hModule,
			 *   __in_     LPCTSTR lpType,
			 *   __in_     LPCTSTR lpName,
			 *   __in_     WORD    wLanguage
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'FindResourceExW' : 'FindResourceExA', self.TYPE.ABI,
				self.TYPE.HRSRC,		// return
				self.TYPE.HMODULE,		// hModule
				self.TYPE.LPCTSTR,		// lpType
				self.TYPE.LPCTSTR,		// lpName
				self.TYPE.WORD			// wLanguage
			);
		},
		FreeLibrary: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms683152%28v=vs.85%29.aspx
			 * BOOL WINAPI FreeLibrary(
			 *   __in_ HMODULE hModule
			 * );
			 */
			return lib('kernel32').declare('FreeLibrary', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HMODULE	// hModule
			);
		},
		GetClientRect: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633503%28v=vs.85%29.aspx
			 * BOOL WINAPI GetClientRect(
			 *   __in_   HWND hWnd,
			 *   __out_  LPRECT lpRect
			 * );
			 */
			return lib('user32').declare('GetClientRect', self.TYPE.ABI,
				self.TYPE.BOOL, //return
				self.TYPE.HWND, // hWnd
				self.TYPE.LPRECT // lpRec
			);
		},
		GetCurrentProcess: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms683179%28v=vs.85%29.aspx
			 * HANDLE WINAPI GetCurrentProcess(
			 *   void
			 * );
			 */
			return lib('kernel32').declare('GetCurrentProcess', self.TYPE.ABI,
				self.TYPE.HANDLE	// return
			);
		},
		GetCursorPos: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648390%28v=vs.85%29.aspx
			 * BOOL WINAPI GetCursorPos(
			 *   __out_ LPPOINT lpPoint
			 * );
			 */
			return lib('user32').declare('GetCursorPos', self.TYPE.ABI,
				self.TYPE.BOOL,		//return
				self.TYPE.LPPOINT	// hWnd
			);
		},
		GetDC: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd144871%28v=vs.85%29.aspx
			 * HDC GetDC(
			 *   __in_ HWND hWnd
			 * );
			 */
			return lib('user32').declare('GetDC', self.TYPE.ABI,
				self.TYPE.HDC,	//return
				self.TYPE.HWND	// hWnd
			);
		},
		GetDesktopWindow: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633504%28v=vs.85%29.aspx
			 * HWND WINAPI GetDesktopWindow(void);
			 */
			return lib('user32').declare('GetDesktopWindow', self.TYPE.ABI,
				self.TYPE.HWND	//return
			);
		},
		GetDeviceCaps: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd144877%28v=vs.85%29.aspx
			 * int GetDeviceCaps(
			 *   __in_  HDC hdc,
			 *   __in_  int nIndex
			 * );
			 */
			return lib('gdi32').declare('GetDeviceCaps', self.TYPE.ABI,
				self.TYPE.INT,	//return
				self.TYPE.HDC,	// hdc
				self.TYPE.INT	// nIndex
			);
		},
		GetDpiForMonitor: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dn280510%28v=vs.85%29.aspx
			 * HRESULT WINAPI GetDpiForMonitor(
			 *   __in_  HMONITOR         hmonitor,
			 *   __in_  MONITOR_DPI_TYPE dpiType,
			 *   __out_ UINT             *dpiX,
			 *   __out_ UINT             *dpiY
			 * );
			 */
			return lib('shcore').declare('GetDpiForMonitor', self.TYPE.ABI,
				self.TYPE.HRESULT,			// return
				self.TYPE.HMONITOR,			// hmonitor
				self.TYPE.MONITOR_DPI_TYPE,	// dpiType
				self.TYPE.UINT.ptr,			// *dpiX
				self.TYPE.UINT.ptr			// *dpiY
			);
		},
		GetForegroundWindow: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633505%28v=vs.85%29.aspx
			 * HWND WINAPI GetForegroundWindow(
			 *   void
			 * );
			 */
			return lib('user32').declare('GetForegroundWindow', self.TYPE.ABI,
				self.TYPE.HWND		// return
			)
		},
		GetLogicalDriveStrings: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa364975%28v=vs.85%29.aspx
			 * DWORD WINAPI GetLogicalDriveStrings(
			 *   __in_  DWORD  nBufferLength,
			 *   __out_ LPTSTR lpBuffer
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'GetLogicalDriveStringsW' : 'GetLogicalDriveStringsA', self.TYPE.ABI,
				self.TYPE.DWORD,	// return
				self.TYPE.DWORD,	// nBufferLength
				self.TYPE.LPTSTR	// lpBuffer
			);
		},
		GetMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644936%28v=vs.85%29.aspx
			 * BOOL WINAPI GetMessage(
			 *   __out_    LPMSG lpMsg,
			 *   __in_opt_ HWND  hWnd,
			 *   __in_     UINT  wMsgFilterMin,
			 *   __in_     UINT  wMsgFilterMax
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'GetMessageW' : 'GetMessageA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.LPMSG,	// lpMsg
				self.TYPE.HWND, 	// hWnd
				self.TYPE.UINT, 	// wMsgFilterMin
				self.TYPE.UINT		// wMsgFilterMax
			);
		},
		GetMonitorInfo: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd144901%28v=vs.85%29.aspx
			 * BOOL GetMonitorInfo(
			 *   __in_   HMONITOR      hMonitor,
			 *   __out_  LPMONITORINFO lpmi
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'GetMonitorInfoW' : 'GetMonitorInfoA', self.TYPE.ABI,
				self.TYPE.BOOL,				//return
				self.TYPE.HMONITOR,			// hMonitor
				self.TYPE.LPMONITORINFOEX	// lpmi
			);
		},
		GetPixel: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd144909%28v=vs.85%29.aspx
			 * COLORREF GetPixel(
			 *   __in_  HDC hdc,
			 *   __in_  int nXPos,
			 *   __in_  int nYPos
			 * );
			 */
			return lib('gdi32').declare('GetPixel', self.TYPE.ABI,
				self.TYPE.COLORREF, //return
				self.TYPE.HDC, // hWnd
				self.TYPE.INT, // nXPos
				self.TYPE.INT // nYPos
			);
		},
		GetRawInputData: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms645596%28v=vs.85%29.aspx
			 *  UINT WINAPI GetRawInputData(
			 *    __in_      HRAWINPUT hRawInput,
			 *    __in_      UINT      uiCommand,
			 *    __out_opt_ LPVOID    pData,
			 *    __inout_   PUINT     pcbSize,
			 *    __in_      UINT      cbSizeHeader
			 *  );
			 */
			return lib('user32').declare('GetRawInputData', self.TYPE.ABI,
				self.TYPE.UINT,			// return
				self.TYPE.HRAWINPUT,	// hRawInput
				self.TYPE.UINT,			// uiCommand
				self.TYPE.LPVOID,		// pData
				self.TYPE.PUINT,		// pcbSize
				self.TYPE.UINT			// cbSizeHeader
			);
		},
		GetWindowLongPtr: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633585%28v=vs.85%29.aspx
			 *	LONG_PTR WINAPI GetWindowLongPtr(
			 *	  __in_  HWND hWnd,
			 *	  __in_  int nIndex
			 *	);
			 */
			return lib('user32').declare(is64bit ? (ifdef_UNICODE ? 'GetWindowLongPtrW' : 'GetWindowLongPtrA') : (ifdef_UNICODE ? 'GetWindowLongW' : 'GetWindowLongA'), self.TYPE.ABI,
				is64bit ? self.TYPE.LONG_PTR : self.TYPE.LONG,	// return
				self.TYPE.HWND,									// hWnd
				self.TYPE.INT									// nIndex
			);
		},
		GetWindowText: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633520%28v=vs.85%29.aspx
			 * int WINAPI GetWindowText(
			 *   _In_  HWND   hWnd,
			 *   _Out_ LPTSTR lpString,
			 *   _In_  int    nMaxCount
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'GetWindowTextW' : 'GetWindowTextA', self.TYPE.ABI,
				self.TYPE.INT,		// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.LPTSTR,	// lpString
				self.TYPE.INT		// nMaxCount
			);
		},
		GetWindowThreadProcessId: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633522%28v=vs.85%29.aspx
			 * DWORD WINAPI GetWindowThreadProcessId(
			 *   __in_      HWND    hWnd,
			 *   __out_opt_ LPDWORD lpdwProcessId
			 * );
			 */
			return lib('user32').declare('GetWindowThreadProcessId', self.TYPE.ABI,
				self.TYPE.DWORD,		// return
				self.TYPE.HWND,			// hWnd
				self.TYPE.LPDWORD		// lpdwProcessId
			);
		},
		GetWindowRect: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633519.aspx
			 * BOOL WINAPI GetWindowRect(
			 *   _In_  HWND   hWnd,
			 *   _Out_ LPRECT lpRect
			 * );
			 */
			return lib('user32').declare('GetWindowRect', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.LPRECT	// lpRect
			);
		},
		GetWindowThreadProcessId: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633522%28v=vs.85%29.aspx
			 * DWORD WINAPI GetWindowThreadProcessId(
			 *   __in_		HWND hWnd,
			 *   __out_opt_	LPDWORD lpdwProcessId
			 * );
			 */
			return lib('user32').declare('GetWindowThreadProcessId', self.TYPE.ABI,
				self.TYPE.DWORD,	// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.LPDWORD	// lpdwProcessId
			);
		},
		IsIconic: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633507%28v=vs.85%29.aspx
			 * BOOL WINAPI IsIconic(
			 *   __in_ HWND hWnd
			 * );
			 */
			return lib('user32').declare('IsIconic', self.TYPE.ABI,
				self.TYPE.BOOL,	// return
				self.TYPE.HWND	// hWnd
			);
		},
		KillTimer: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633522%28v=vs.85%29.aspx
			 * BOOL WINAPI KillTimer(
			 *   _in_opt_ HWND     hWnd,
			 *   _in_     UINT_PTR uIDEvent
			 * );
			 */
			return lib('user32').declare('KillTimer', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HWND,		// hWnd
				self.TYPE.UINT_PTR	// uIDEvent
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
			return lib('user32').declare(ifdef_UNICODE ? 'LoadImageW' : 'LoadImageA', self.TYPE.ABI,
				self.TYPE.HANDLE,		// return
				self.TYPE.HINSTANCE,	// hinst
				self.TYPE.LPCTSTR,		// lpszName
				self.TYPE.UINT,			// uType
				self.TYPE.int,			// cxDesired
				self.TYPE.int,			// cyDesired
				self.TYPE.UINT			// fuLoad
			);
		},
		LoadLibrary: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms684175%28v=vs.85%29.aspx
			 * HMODULE WINAPI LoadLibrary(
			 *   _In_ LPCTSTR lpFileName
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'LoadLibraryW' : 'LoadLibraryA', self.TYPE.ABI,
				self.TYPE.HMODULE,	// return
				self.TYPE.LPCTSTR	// lpFileName
			);
		},
		LoadLibraryEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms684179%28v=vs.85%29.aspx
			 * HMODULE WINAPI LoadLibraryEx(
			 *   _in_       LPCTSTR lpFileName,
			 *   _reserved_ HANDLE  hFile,
			 *   _in_       DWORD   dwFlags
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'LoadLibraryExW': 'LoadLibraryExA', self.TYPE.ABI,
				self.TYPE.HMODULE,		// return
				self.TYPE.LPCTSTR,		// lpFileName
				self.TYPE.HANDLE,		// hFile
				self.TYPE.DWORD			// dwFlags
			);
		},
		LoadResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648046%28v=vs.85%29.aspx
			 * HGLOBAL WINAPI LoadResource(
			 *   _In_opt_ HMODULE hModule,
			 *   _In_     HRSRC   hResInfo
			 * );
			 */
			return lib('kernel32').declare('LoadResource', self.TYPE.ABI,
				self.TYPE.HGLOBAL,		// return
				self.TYPE.HMODULE,		// hModule
				self.TYPE.HRSRC			// hResInfo
			);
		},
		LockResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648047%28v=vs.85%29.aspx
			 * LPVOID WINAPI LockResource(
			 *   __in_ HGLOBAL hResData
			 * );
			 */
			return lib('kernel32').declare('LockResource', self.TYPE.ABI,
				self.TYPE.LPVOID,	// return
				self.TYPE.HGLOBAL	// hResData
			);
		},
		OpenProcess: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms684320%28v=vs.85%29.aspx
			 * HANDLE WINAPI OpenProcess(
			 *   __in_ DWORD dwDesiredAccess,
			 *   __in_ BOOL  bInheritHandle,
			 *   __in_ DWORD dwProcessId
			 * );
			 */
			return lib('kernel32').declare('OpenProcess', self.TYPE.ABI,
				self.TYPE.HANDLE,	// return
				self.TYPE.DWORD,	// dwDesiredAccess
				self.TYPE.BOOL,		// bInheritHandle
				self.TYPE.DWORD		// dwProcessId
			);
		},
		PostMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644944%28v=vs.85%29.aspx
			 * BOOL WINAPI PostMessage(
			 *   __in_opt_ HWND   hWnd,
			 *   __in_     UINT   Msg,
			 *   __in_     WPARAM wParam,
			 *   __in_     LPARAM lParam
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'PostMessageW' : 'PostMessageA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HWND, 	// hWnd
				self.TYPE.UINT,		// Msg
				self.TYPE.WPARAM, 	// wParam
				self.TYPE.LPARAM	// lParam
			);
		},
		PostThreadMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644946%28v=vs.85%29.aspx
			 * BOOL WINAPI PostThreadMessage(
			 *   __in_ DWORD  idThread,
			 *   __in_ UINT   Msg,
			 *   __in_ WPARAM wParam,
			 *   __in_ LPARAM lParam
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'PostThreadMessageW' : 'PostThreadMessageA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.DWORD, 	// idThread
				self.TYPE.UINT,		// Msg
				self.TYPE.WPARAM, 	// wParam
				self.TYPE.LPARAM	// lParam
			);
		},
		memcpy: function() {
			/* https://msdn.microsoft.com/en-us/library/dswaw1wk.aspx
			 * void *memcpy(
			 *    void *dest,
			 *    const void *src,
			 *    size_t count
			 * );
			 */
			return lib('msvcrt').declare('memcpy', self.TYPE.ABI,
				self.TYPE.void,		// return
				self.TYPE.void.ptr,	// *dest
				self.TYPE.void.ptr,	// *src
				self.TYPE.size_t	// count
			);
		},
		MultiByteToWideChar: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd319072%28v=vs.85%29.aspx
			 * int MultiByteToWideChar(
			 *   __in_      UINT   CodePage,
			 *   __in_      DWORD  dwFlags,
			 *   __in_      LPCSTR lpMultiByteStr,
			 *   __in_      int    cbMultiByte,
			 *   __out_opt_ LPWSTR lpWideCharStr,
			 *   __in_      int    cchWideChar
			 * );
			 */
			return lib('kernel32').declare('MultiByteToWideChar', self.TYPE.ABI,
				self.TYPE.int,		// return
				self.TYPE.UINT,		// CodePage
				self.TYPE.DWORD,	// dwFlags
				self.TYPE.LPCSTR,	// lpMultiByteStr
				self.TYPE.int,		// cbMultiByte
				self.TYPE.LPWSTR,	// lpWideCharStr
				self.TYPE.int		// cchWideChar
			);
		},
		MonitorFromPoint: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/dd145062%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
			 * HMONITOR MonitorFromPoint(
			 *   __in_  POINT pt,
			 *   __in_  DWORD dwFlags
			 * );
			 */
			return lib('user32').declare('MonitorFromPoint', self.TYPE.ABI,
				self.TYPE.HMONITOR,	// HMONITOR
				self.TYPE.POINT,	// pt
				self.TYPE.DWORD		// dwFlags
			);
		},
		NtQueryInformationFile: function() {
			/* https://github.com/wine-mirror/wine/blob/80ea5a01ef42b0e9e0b6c872f8f5bbbf393c0ae7/dlls/ntdll/file.c#L2272
			 * https://msdn.microsoft.com/en-us/library/windows/hardware/ff556646%28v=vs.85%29.aspx --> https://msdn.microsoft.com/en-us/library/windows/hardware/ff567052%28v=vs.85%29.aspx --- they have it wrong though, they say ULONG
			 * NTSTATUS WINAPI NtQueryInformationFile(
			 *   __in_ HANDLE hFile,
			 *   __out_ PIO_STATUS_BLOCK io,
			 *   __out_ PVOID ptr,
			 *   __in_ LONG len,
			 *   __in_ FILE_INFORMATION_CLASS class
			 * );
			 */
			return lib('ntdll').declare('NtQueryInformationFile', self.TYPE.ABI,
				self.TYPE.NTSTATUS,					// return
				self.TYPE.HANDLE,					// hFile
				self.TYPE.PIO_STATUS_BLOCK,			// io
				self.TYPE.PVOID,					// ptr
				self.TYPE.LONG,						// len
				self.TYPE.FILE_INFORMATION_CLASS	// class
			);
		},
		NtQueryObject: function() {
			/* https://msdn.microsoft.com/en-us/library/bb432383%28v=vs.85%29.aspx
			 * NTSTATUS NtQueryObject(
			 *   __in_opt_  HANDLE Handle,
			 *   __in_      OBJECT_INFORMATION_CLASS ObjectInformationClass,
			 *   __out_opt_ PVOID ObjectInformation,
			 *   __in_      ULONG ObjectInformationLength,
			 *   __out_opt_ PULONG ReturnLength
			 * );
			 */
			return lib('ntdll').declare('NtQueryObject', self.TYPE.ABI,
				self.TYPE.NTSTATUS,						// return
				self.TYPE.HANDLE,						// Handle
				self.TYPE.OBJECT_INFORMATION_CLASS,		// ObjectInformationClass
				self.TYPE.PVOID,						// ObjectInformation
				self.TYPE.ULONG,						// ObjectInformationLength
				self.TYPE.PULONG						// ReturnLength
			);
		},
		NtQuerySystemInformation: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724509%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
			 * NTSTATUS WINAPI NtQuerySystemInformation(
			 *  __in_      SYSTEM_INFORMATION_CLASS SystemInformationClass,
			 *  __inout_   PVOID                    SystemInformation,
			 *  __in_      ULONG                    SystemInformationLength,
			 *  __out_opt_ PULONG                   ReturnLength
			 * );
			 */
			return lib('ntdll').declare('NtQuerySystemInformation', self.TYPE.ABI,
				self.TYPE.NTSTATUS,					// return
				self.TYPE.SYSTEM_INFORMATION_CLASS,	// SystemInformationClass
				self.TYPE.PVOID,					// SystemInformation
				self.TYPE.ULONG,					// SystemInformationLength
				self.TYPE.PULONG					// ReturnLength
			);
		},
		PeekMessage: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644943%28v=vs.85%29.aspx
			 * BOOL WINAPI PeekMessage(
			 *   __out_    LPMSG lpMsg,
			 *   __in_opt_ HWND  hWnd,
			 *   __in_     UINT  wMsgFilterMin,
			 *   __in_     UINT  wMsgFilterMax,
			 *   __in_     UINT  wRemoveMsg
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'PeekMessageW' : 'PeekMessageA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.LPMSG,	// lpMsg
				self.TYPE.HWND, 	// hWnd
				self.TYPE.UINT, 	// wMsgFilterMin
				self.TYPE.UINT,		// wMsgFilterMax
				self.TYPE.UINT		// wRemoveMsg
			);
		},
		PropVariantClear: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/aa380073%28v=vs.85%29.aspx
			 * WINOLEAPI PropVariantClear(
			 * __in_ PROPVARIANT *pvar
			 * );
			 */
			return lib('ole32').declare('PropVariantClear', self.TYPE.ABI,
				self.TYPE.WINOLEAPI,			// return
				self.TYPE.PROPVARIANT.ptr		// *pvar
			);
		},
		QueryDosDevice: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/aa365461%28v=vs.85%29.aspx
			 * DWORD WINAPI QueryDosDevice(
			 *   _in_opt_ LPCTSTR lpDeviceName,
			 *   _out_    LPTSTR  lpTargetPath,
			 *   _in_     DWORD   ucchMax
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'QueryDosDeviceW' : 'QueryDosDeviceA', self.TYPE.ABI,
				self.TYPE.DWORD,		// return
				self.TYPE.LPCTSTR,		// lpDeviceName
				self.TYPE.LPTSTR,		// lpTargetPath
				self.TYPE.DWORD			// ucchMax
			);
		},
		RegCloseKey: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724837%28v=vs.85%29.aspx
			 * LONG WINAPI RegCloseKey(
			 *   __in_ HKEY hKey
			 * );
			 */
			return lib('advapi32').declare('RegCloseKey', self.TYPE.ABI,
				self.TYPE.LONG,		// return
				self.TYPE.HKEY		// hKey
			);
		},
		RegisterClass: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633586%28v=vs.85%29.aspx
			 * ATOM WINAPI RegisterClass(
			 *   __in_ const WNDCLASS *lpWndClass
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'RegisterClassW' : 'RegisterClassA', self.TYPE.ABI,
				self.TYPE.ATOM,			// return
				self.TYPE.WNDCLASS.ptr	// *lpWndClass
			);
		},
		RegOpenKeyEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724897%28v=vs.85%29.aspx
			 * LONG WINAPI RegOpenKeyEx(
			 *   __in_     HKEY    hKey,
			 *   __in_opt_ LPCTSTR lpSubKey,
			 *   __in_     DWORD   ulOptions,
			 *   __in_     REGSAM  samDesired,
			 *   __out_    PHKEY   phkResult
			 * );
			 */
			return lib('advapi32').declare(ifdef_UNICODE ? 'RegOpenKeyExW' : 'RegOpenKeyExA', self.TYPE.ABI,
				self.TYPE.LONG,		// return
				self.TYPE.HKEY,		// hKey
				self.TYPE.LPCTSTR,	// lpSubKey
				self.TYPE.DWORD,	// ulOptions
				self.TYPE.REGSAM,	// samDesired
				self.TYPE.PHKEY		// phkResult
			);
		},
		RegQueryValueEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms724911%28v=vs.85%29.aspx
			 * LONG WINAPI RegQueryValueEx(
			 *   __in_        HKEY    hKey,
			 *   __in_opt_    LPCTSTR lpValueName,
			 *   __reserved_  LPDWORD lpReserved,
			 *   __out_opt_   LPDWORD lpType,
			 *   __out_opt_   LPBYTE  lpData,
			 *   __inout_opt_ LPDWORD lpcbData
			 * );
			 */
			return lib('advapi32').declare(ifdef_UNICODE ? 'RegQueryValueExW' : 'RegQueryValueExA', self.TYPE.ABI,
				self.TYPE.LONG,		// return
				self.TYPE.HKEY,		// hKey
				self.TYPE.LPCTSTR,	// lpValueName
				self.TYPE.LPDWORD,	// lpReserved
				self.TYPE.LPDWORD,	// lpType
				self.TYPE.LPBYTE,	// lpData
				self.TYPE.LPDWORD	// lpcbData
			);
		},
		ReleaseDC: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd162920%28v=vs.85%29.aspx
			 * int ReleaseDC(
			 *   __in_  HWND hWnd,
			 *   __in_  HDC hDC
			 * );
			 */
			return lib('user32').declare('ReleaseDC', self.TYPE.ABI,
				self.TYPE.INT, //return
				self.TYPE.HWND, // hWnd
				self.TYPE.HDC // hDc
			);
		},
		SelectObject: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/dd183489%28v=vs.85%29.aspx
			 * HGDIOBJ SelectObject(
			 *   __in_  HDC hdc,
			 *   __in_  HGDIOBJ hgdiobj
			 * );
			 */
			return lib('gdi32').declare('SelectObject', self.TYPE.ABI,
				self.TYPE.HGDIOBJ, //return
				self.TYPE.HDC, // hdc
				self.TYPE.HGDIOBJ // hgdiobj
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
			return lib('user32').declare(is64bit ? (ifdef_UNICODE ? 'SetClassLongPtrW' : 'SetClassLongPtrA') : (ifdef_UNICODE ? 'SetClassLongW' : 'SetClassLongA'), self.TYPE.ABI,
				is64bit ? self.TYPE.ULONG_PTR : self.TYPE.DWORD,	// return
				self.TYPE.HWND,										// hWnd
				self.TYPE.INT,										// nIndex
				is64bit ? self.TYPE.LONG_PTR : self.TYPE.LONG		// dwNewLong
			);
		},
		SetForegroundWindow: function() {
			/* http://msdn.microsoft.com/en-us/library/ms633539%28v=vs.85%29.aspx
			 * BOOL WINAPI SetForegroundWindow(
			 *   __in_ HWND hWnd
			 * );
			 */
			return lib('user32').declare('SetForegroundWindow', self.TYPE.ABI,
				self.TYPE.BOOL,	// return
				self.TYPE.HWND	// hWnd
			);
		},
		SetTimer: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644906%28v=vs.85%29.aspx
			 * UINT_PTR WINAPI SetTimer(
			 *   _in_opt_ HWND      hWnd,
			 *   _in_     UINT_PTR  nIDEvent,
			 *   _in_     UINT      uElapse,
			 *   _in_opt_ TIMERPROC lpTimerFunc
			 * );
			 */
			return lib('user32').declare('SetTimer', self.TYPE.ABI,
				self.TYPE.UINT_PTR,		//return
				self.TYPE.HWND,			// hWnd
				self.TYPE.UINT_PTR,		// nIDEvent
				self.TYPE.UINT,			// uElapse
				self.TYPE.TIMERPROC.ptr	// lpTimerFunc
			);
		},
		SetWindowPos: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms633545%28v=vs.85%29.aspx
			 * BOOL WINAPI SetWindowPos(
			 *   __in_     HWND hWnd,
			 *   __in_opt_ HWND hWndInsertAfter,
			 *   __in_     int  X,
			 *   __in_     int  Y,
			 *   __in_     int  cx,
			 *   __in_     int  cy,
			 *   __in_     UINT uFlags
			 *);
			 */
			return lib('user32').declare('SetWindowPos', self.TYPE.ABI,
				self.TYPE.BOOL,				// return
				self.TYPE.HWND,				// hWnd
				self.TYPE.HWND,				// hWndInsertAfter
				self.TYPE.INT,				// X
				self.TYPE.INT,				// Y
				self.TYPE.INT,				// cx
				self.TYPE.INT,				// cy
				self.TYPE.UINT				// uFlags
			);
		},
		ShellExecuteEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/bb762154%28v=vs.85%29.aspx
			 * BOOL ShellExecuteEx(
			 *   __inout_  SHELLEXECUTEINFO *pExecInfo
			 * );
			 */
			return lib('shell32.dll').declare('ShellExecuteExW', self.TYPE.ABI,
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
			return lib('shell32').declare('SHGetPropertyStoreForWindow', self.TYPE.ABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.HWND,			// hwnd
				self.TYPE.REFIID,		// riid
				ctypes.voidptr_t		// **ppv // i can set this to `self.TYPE.IPropertyStore.ptr.ptr` // however i cannot set this to ctypes.void_t.ptr.ptr i have no iea why, and i thouh `void **ppv` is either void_t.ptr.ptr or ctypes.voidptr_t.ptr // ctypes.voidptr_t as was one here: `void**` the `QueryInterface` also has out argument `void**` and he used `ctypes.voidptr_t` (https://github.com/west-mt/ssbrowser/blob/452e21d728706945ad00f696f84c2f52e8638d08/chrome/content/modules/WindowsShortcutService.jsm#L74)
			);
		},
		ShowWindow: function() {
				/* http://msdn.microsoft.com/en-us/library/windows/desktop/ms633507%28v=vs.85%29.aspx
				* BOOL WINAPI ShowWindow(
				*   __in HWND hWnd
				*   __in INT nCmdShow
				* );
				*/
				return lib('user32').declare('ShowWindow', self.TYPE.ABI,
					self.TYPE.BOOL,		// BOOL
					self.TYPE.HWND,		// hWnd
					self.TYPE.INT		// nCmdShow
				);
		},
		SHStrDup: function() {
			/* http://msdn.microsoft.com/en-us/library/windows/desktop/bb759924%28v=vs.85%29.aspx
			* HRESULT SHStrDup(
			* __in_ LPCTSTR pszSource,
			* __out_ LPTSTR *ppwsz
			* );
			*/
			return lib('shlwapi').declare('SHStrDupW', self.TYPE.ABI,
				self.TYPE.HRESULT,		// return
				self.TYPE.LPCTSTR,		// pszSource
				self.TYPE.LPTSTR.ptr	// *ppwsz
			); 
		},
		SizeofResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648048%28v=vs.85%29.aspx
			 * DWORD WINAPI SizeofResource(
			 *   __in_opt_ HMODULE hModule,
			 *   __in_     HRSRC   hResInfo
			 * );
			 */
			return lib('kernel32').declare('SizeofResource', self.TYPE.ABI,
				self.TYPE.DWORD,		// return
				self.TYPE.HMODULE,		// hModule
				self.TYPE.HRSRC			// hResInfo
			);
		},
		UnregisterClass: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644899%28v=vs.85%29.aspx
			 * BOOL WINAPI UnregisterClass(
			 *   __in_     LPCTSTR   lpClassName,
			 *   __in_opt_ HINSTANCE hInstance
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'UnregisterClassW' : 'UnregisterClassA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.LPCTSTR,	// lpClassName
				self.TYPE.HINSTANCE	// hInstance
			);
		},
		UpdateResource: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms648049%28v=vs.85%29.aspx
			 * BOOL WINAPI UpdateResource(
			 *   __in_     HANDLE  hUpdate,
			 *   __in_     LPCTSTR lpType,
			 *   __in_     LPCTSTR lpName,
			 *   __in_     WORD    wLanguage,
			 *   __in_opt_ LPVOID  lpData,
			 *   __in_     DWORD   cbData
			 * );
			 */
			return lib('kernel32').declare(ifdef_UNICODE ? 'UpdateResourceW' : 'UpdateResourceA', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.HANDLE,	// hUpdate
				self.TYPE.LPCTSTR,	// lpType
				self.TYPE.LPCTSTR,	// lpName
				self.TYPE.WORD,		// wLanguage
				self.TYPE.LPVOID,	// lpData
				self.TYPE.DWORD		// cbData
			);
		},
		////////////////// mousecontrol stuff
		SetWindowsHookEx: function() {
			/* HHOOK WINAPI SetWindowsHookEx(
			 *   __in_ int       idHook,
			 *   __in_ HOOKPROC  lpfn,
			 *   __in_ HINSTANCE hMod,
			 *   __in_ DWORD     dwThreadId
			 * );
			 */
			return lib('user32').declare(ifdef_UNICODE ? 'SetWindowsHookExW' : 'SetWindowsHookExA', self.TYPE.ABI,
				self.TYPE.HHOOK,
				self.TYPE.INT,
				self.TYPE.HOOKPROC,
				self.TYPE.HINSTANCE,
				self.TYPE.DWORD
			);
		},
		UnhookWindowsHookEx: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms644993%28v=vs.85%29.aspx
			 * BOOL WINAPI UnhookWindowsHookEx(
			 *   _in_ HHOOK hhk
			 * );
			 */
			return lib('user32').declare('UnhookWindowsHookEx', self.TYPE.ABI,
				self.TYPE.BOOL,
				self.TYPE.HHOOK
			);
		},
		CallNextHookEx: function() {
			/* LRESULT WINAPI CallNextHookEx(
			 *   __in_opt_ HHOOK  hhk,
			 *   __in_     int    nCode,
			 *   __in_     WPARAM wParam,
			 *   __in_     LPARAM lParam
			 * );			
			 */
			return lib('user32').declare('CallNextHookEx', self.TYPE.ABI,
				self.TYPE.LRESULT,
				self.TYPE.HHOOK,
				self.TYPE.INT,
				self.TYPE.WPARAM,
				self.TYPE.LPARAM
			);
		},
		RegisterRawInputDevices: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms645600%28v=vs.85%29.aspx
			 * BOOL WINAPI RegisterRawInputDevices(
			 *  __in_ PCRAWINPUTDEVICE pRawInputDevices,
			 *  __in_ UINT             uiNumDevices,
			 *  __in_ UINT             cbSize
			 * );
			 */
			return lib('user32').declare('RegisterRawInputDevices', self.TYPE.ABI,
				self.TYPE.BOOL,					// return
				self.TYPE.PCRAWINPUTDEVICE,		// pRawInputDevices
				self.TYPE.UINT,					// uiNumDevices
				self.TYPE.UINT					// cbSize
			);
		},
		GetCurrentThreadId: function() {
			/* https://msdn.microsoft.com/en-us/library/windows/desktop/ms683183%28v=vs.85%29.aspx
			 * DWORD WINAPI GetCurrentThreadId(
			 *   void
			 * );
			 */
			return lib('kernel32').declare('GetCurrentThreadId', self.TYPE.ABI,
				self.TYPE.DWORD	// return
			);
		}
	};
	// end - predefine your declares here
	// end - function declares

	this.HELPER = {
		checkHRESULT: function(hr /*HRESULT*/, funcName /*jsStr*/) {
			// https://msdn.microsoft.com/en-us/library/windows/desktop/ff485842%28v=vs.85%29.aspx
			// throws if bad hresult
			var primitiveHR = parseInt(cutils.jscGetDeepest(hr))
			if (cutils.jscEqual(primitiveHR, ostypes.CONST.S_FALSE)) {
				console.error('SPECIAL HRESULT FAIL RESULT!!!', 'HRESULT is 1!!! hr:', hr, 'funcName:', funcName);
			} else if (primitiveHR < 0) {
				// FAILED macro does this, linked from the msdn page at top of this func
				console.error('HRESULT', hr, 'returned from function', funcName, 'getStrOfResult:', self.HELPER.getStrOfResult(primitiveHR));
				throw new Error('HRESULT ' + hr + ' returned from function ' + funcName + ' getStrOfResult:' + JSON.stringify(self.HELPER.getStrOfResult(primitiveHR)));
			} // else then it was success
		},
		getStrOfResult: function(PrimitiveJS_RESULT) {
			var rezObj = {}
			PrimitiveJS_RESULT = PrimitiveJS_RESULT >>> 0;
			rezObj.strPrim = '0x' + PrimitiveJS_RESULT.toString(16);
			for (var group in WIN32_ERROR_STR) {
				for (var str in WIN32_ERROR_STR[group]) {
					//console.error(WIN32_ERROR_STR[group][str], PrimativeJS_RESULT, str);
					if (WIN32_ERROR_STR[group][str] == PrimitiveJS_RESULT) {
						rezObj[group] = str;
						break;
					}
				}
			}
			return rezObj;
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
		IPropertyStore_SetValue: function(vtblPpsPtr, pps/*IPropertyStore*/, pkey/*REFPROPERTYKEY*/, pszValue/*PCWSTR*/) {
			// from: http://blogs.msdn.com/b/oldnewthing/archive/2011/06/01/10170113.aspx
			// for strings!! InitPropVariantFromString
			// returns hr of SetValue, but if hr of it failed it will throw, so i dont have to check the return value
			
			var ppropvar = self.TYPE.PROPVARIANT();

			var hr_InitPropVariantFromString = self.HELPER.InitPropVariantFromString(pszValue, ppropvar.address());
			self.HELPER.checkHRESULT(hr_InitPropVariantFromString, 'failed InitPropVariantFromString'); //this will throw if HRESULT is bad

			var hr_SetValue = pps.SetValue(vtblPpsPtr, pkey, ppropvar.address());
			self.HELPER.checkHRESULT(hr_SetValue, 'IPropertyStore_SetValue');
			
			var rez_PropVariantClear = self.API('PropVariantClear')(ppropvar.address());
			// console.info('rez_PropVariantClear:', rez_PropVariantClear, rez_PropVariantClear.toString(), uneval(rez_PropVariantClear));

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
			self.HELPER.checkHRESULT(hr_GetValue, 'IPropertyStore_GetValue');
			
			//console.info('ppropvar:', ppropvar.toString(), uneval(ppropvar));
			
			if (ret_js) {
				//console.info('ppropvar.pwszVal:', ppropvar.pwszVal.toString(), uneval(ppropvar.pwszVal));
				var jsstr;
				if (ppropvar.pwszVal.isNull()) {
					console.log('ppropvar.pwszVal is NULL so blank string was found');
					jsstr = '';
				} else {
					jsstr = ppropvar.pwszVal.readStringReplaceMalformed();
				}
				
				var rez_PropVariantClear = self.API('PropVariantClear')(ppropvar.address());
				//console.info('rez_PropVariantClear:', rez_PropVariantClear.toString(), uneval(rez_PropVariantClear));

				return jsstr;
			} else {
				// console.warn('remember to clear the PROPVARIANT yourself then');
				return hr_GetValue;
			}
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
			// console.info('hr_SHStrDup:', hr_SHStrDup.toString(), uneval(hr_SHStrDup));
			
			// console.log('propvarPtr.contents.pwszVal', propvarPtr.contents.pwszVal);
			self.HELPER.checkHRESULT(hr_SHStrDup, 'InitPropVariantFromString -> hr_SHStrDup'); // this will throw if HRESULT is bad

			ppropvar.contents.vt = self.CONST.VT_LPWSTR;

			return hr_SHStrDup;
		},
		MAKELANGID: function(p, s) {
			// MACRO: https://github.com/wine-mirror/wine/blob/b1ee60f22fbd6b854c3810a89603458ec0585369/include/winnt.h#L2180
			// #define MAKELANGID(p, s) ((((WORD)(s))<<10) | (WORD)(p))
			
			// p is js int
			// s is js int
			return ((((s))<<10) | (p));
		}
	};
	
	// ADVANCED HELPER CONST - constants that are defined by using HELPER functions and also SIMPLE constants

	this.CONST.CLSID_SHELLLINK = this.HELPER.CLSIDFromString('00021401-0000-0000-C000-000000000046');
	this.CONST.IID_ISHELLLINK = this.HELPER.CLSIDFromString('000214F9-0000-0000-C000-000000000046');
	this.CONST.IID_IPERSISTFILE = this.HELPER.CLSIDFromString('0000010b-0000-0000-C000-000000000046');
	this.CONST.IID_IPROPERTYSTORE = this.HELPER.CLSIDFromString('886d8eeb-8cf2-4446-8d02-cdba1dbdcf99');
	
	// formatID and propID are from https://msdn.microsoft.com/en-us/library/dd391569%28v=vs.85%29.aspx
	this.CONST.FORMAT_ID_APPUSERMODEL = this.HELPER.CLSIDFromString('9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3');
		
	this.CONST.PKEY_APPUSERMODEL_ID = this.TYPE.PROPERTYKEY(this.CONST.FORMAT_ID_APPUSERMODEL, 5);
	this.CONST.PKEY_APPUSERMODEL_RELAUNCHCOMMAND = this.TYPE.PROPERTYKEY(this.CONST.FORMAT_ID_APPUSERMODEL, 2);
	this.CONST.PKEY_APPUSERMODEL_RELAUNCHDISPLAYNAMERESOURCE = this.TYPE.PROPERTYKEY(this.CONST.FORMAT_ID_APPUSERMODEL, 4);
	this.CONST.PKEY_APPUSERMODEL_RELAUNCHICONRESOURCE = this.TYPE.PROPERTYKEY(this.CONST.FORMAT_ID_APPUSERMODEL, 3);
}

var ostypes = new winInit();

var WIN32_ERROR_STR = {
	HRESULT: {
		'STG_S_CONVERTED': 0x00030200,
		'STG_S_BLOCK': 0x00030201,
		'STG_S_RETRYNOW': 0x00030202,
		'STG_S_MONITORING': 0x00030203,
		'STG_S_MULTIPLEOPENS': 0x00030204,
		'STG_S_CONSOLIDATIONFAILED': 0x00030205,
		'STG_S_CANNOTCONSOLIDATE': 0x00030206,
		'OLE_S_USEREG': 0x00040000,
		'OLE_S_STATIC': 0x00040001,
		'OLE_S_MAC_CLIPFORMAT': 0x00040002,
		'DRAGDROP_S_DROP': 0x00040100,
		'DRAGDROP_S_CANCEL': 0x00040101,
		'DRAGDROP_S_USEDEFAULTCURSORS': 0x00040102,
		'DATA_S_SAMEFORMATETC': 0x00040130,
		'VIEW_S_ALREADY_FROZEN': 0x00040140,
		'CACHE_S_FORMATETC_NOTSUPPORTED': 0x00040170,
		'CACHE_S_SAMECACHE': 0x00040171,
		'CACHE_S_SOMECACHES_NOTUPDATED': 0x00040172,
		'OLEOBJ_S_INVALIDVERB': 0x00040180,
		'OLEOBJ_S_CANNOT_DOVERB_NOW': 0x00040181,
		'OLEOBJ_S_INVALIDHWND': 0x00040182,
		'EVENT_S_SOME_SUBSCRIBERS_FAILED': 0x00040200,
		'EVENT_S_NOSUBSCRIBERS': 0x00040202,
		'SCHED_S_TASK_READY': 0x00041300,
		'SCHED_S_TASK_RUNNING': 0x00041301,
		'SCHED_S_TASK_DISABLED': 0x00041302,
		'SCHED_S_TASK_HAS_NOT_RUN': 0x00041303,
		'SCHED_S_TASK_NO_MORE_RUNS': 0x00041304,
		'SCHED_S_TASK_NOT_SCHEDULED': 0x00041305,
		'SCHED_S_TASK_TERMINATED': 0x00041306,
		'SCHED_S_TASK_NO_VALID_TRIGGERS': 0x00041307,
		'SCHED_S_EVENT_TRIGGER': 0x00041308,
		'CO_S_NOTALLINTERFACES': 0x00080012,
		'CO_S_MACHINENAMENOTFOUND': 0x00080013,
		'SEC_I_CONTINUE_NEEDED': 0x00090312,
		'SEC_I_COMPLETE_NEEDED': 0x00090313,
		'SEC_I_COMPLETE_AND_CONTINUE': 0x00090314,
		'SEC_I_LOCAL_LOGON': 0x00090315,
		'SEC_I_CONTEXT_EXPIRED': 0x00090317,
		'SEC_I_INCOMPLETE_CREDENTIALS': 0x00090320,
		'SEC_I_RENEGOTIATE': 0x00090321,
		'SEC_I_NO_LSA_CONTEXT': 0x00090323,
		'CRYPT_I_NEW_PROTECTION_REQUIRED': 0x00091012,
		'ERROR_GRAPHICS_MODE_NOT_PINNED': 0x00262307,
		'ERROR_GRAPHICS_PATH_CONTENT_GEOMETRY_TRANSFORMATION_NOT_PINNED': 0x00262351,
		'PLA_S_PROPERTY_IGNORED': 0x00300100,
		'ERROR_NDIS_INDICATION_REQUIRED': 0x00340001,
		'ERROR_GRAPHICS_DRIVER_MISMATCH': 0x40262009,
		'ERROR_GRAPHICS_LEADLINK_START_DEFERRED': 0x40262437,
		'ERROR_GRAPHICS_POLLING_TOO_FREQUENTLY': 0x40262439,
		'E_NOTIMPL': 0x80004001,
		'E_NOINTERFACE': 0x80004002,
		'E_POINTER': 0x80004003,
		'E_ABORT': 0x80004004,
		'E_FAIL': 0x80004005,
		'CO_E_INIT_TLS': 0x80004006,
		'CO_E_INIT_SHARED_ALLOCATOR': 0x80004007,
		'CO_E_INIT_MEMORY_ALLOCATOR': 0x80004008,
		'CO_E_INIT_CLASS_CACHE': 0x80004009,
		'CO_E_INIT_SCM_MAP_VIEW_OF_FILE': 0x80004010,
		'CO_E_INIT_SCM_EXEC_FAILURE': 0x80004011,
		'CO_E_INIT_ONLY_SINGLE_THREADED': 0x80004012,
		'CO_E_CANT_REMOTE': 0x80004013,
		'CO_E_BAD_SERVER_NAME': 0x80004014,
		'CO_E_WRONG_SERVER_IDENTITY': 0x80004015,
		'CO_E_OLE1DDE_DISABLED': 0x80004016,
		'CO_E_RUNAS_SYNTAX': 0x80004017,
		'CO_E_CREATEPROCESS_FAILURE': 0x80004018,
		'CO_E_RUNAS_CREATEPROCESS_FAILURE': 0x80004019,
		'CO_E_IIDREG_INCONSISTENT': 0x80004020,
		'CO_E_NOT_SUPPORTED': 0x80004021,
		'CO_E_RELOAD_DLL': 0x80004022,
		'CO_E_MSI_ERROR': 0x80004023,
		'CO_E_ATTEMPT_TO_CREATE_OUTSIDE_CLIENT_CONTEXT': 0x80004024,
		'CO_E_SERVER_PAUSED': 0x80004025,
		'CO_E_SERVER_NOT_PAUSED': 0x80004026,
		'CO_E_CLASS_DISABLED': 0x80004027,
		'CO_E_CLRNOTAVAILABLE': 0x80004028,
		'CO_E_ASYNC_WORK_REJECTED': 0x80004029,
		'CO_E_TRACKER_CONFIG': 0x80004030,
		'CO_E_THREADPOOL_CONFIG': 0x80004031,
		'CO_E_SXS_CONFIG': 0x80004032,
		'CO_E_MALFORMED_SPN': 0x80004033,
		'RPC_E_CALL_REJECTED': 0x80010001,
		'RPC_E_CALL_CANCELED': 0x80010002,
		'RPC_E_CANTPOST_INSENDCALL': 0x80010003,
		'RPC_E_CANTCALLOUT_INASYNCCALL': 0x80010004,
		'RPC_E_CANTCALLOUT_INEXTERNALCALL': 0x80010005,
		'RPC_E_CONNECTION_TERMINATED': 0x80010006,
		'RPC_E_SERVER_DIED': 0x80010007,
		'RPC_E_CLIENT_DIED': 0x80010008,
		'RPC_E_INVALID_DATAPACKET': 0x80010009,
		'RPC_E_INVALID_PARAMETER': 0x80010010,
		'RPC_E_CANTCALLOUT_AGAIN': 0x80010011,
		'RPC_E_SERVER_DIED_DNE': 0x80010012,
		'RPC_E_SYS_CALL_FAILED': 0x80010100,
		'RPC_E_OUT_OF_RESOURCES': 0x80010101,
		'RPC_E_ATTEMPTED_MULTITHREAD': 0x80010102,
		'RPC_E_NOT_REGISTERED': 0x80010103,
		'RPC_E_FAULT': 0x80010104,
		'RPC_E_SERVERFAULT': 0x80010105,
		'RPC_E_CHANGED_MODE': 0x80010106,
		'RPC_E_INVALIDMETHOD': 0x80010107,
		'RPC_E_DISCONNECTED': 0x80010108,
		'RPC_E_RETRY': 0x80010109,
		'RPC_E_VERSION_MISMATCH': 0x80010110,
		'RPC_E_INVALID_HEADER': 0x80010111,
		'RPC_E_INVALID_EXTENSION': 0x80010112,
		'RPC_E_INVALID_IPID': 0x80010113,
		'RPC_E_INVALID_OBJECT': 0x80010114,
		'RPC_S_CALLPENDING': 0x80010115,
		'RPC_S_WAITONTIMER': 0x80010116,
		'RPC_E_CALL_COMPLETE': 0x80010117,
		'RPC_E_UNSECURE_CALL': 0x80010118,
		'RPC_E_TOO_LATE': 0x80010119,
		'RPC_E_NO_SYNC': 0x80010120,
		'RPC_E_FULLSIC_REQUIRED': 0x80010121,
		'RPC_E_INVALID_STD_NAME': 0x80010122,
		'CO_E_FAILEDTOIMPERSONATE': 0x80010123,
		'CO_E_FAILEDTOGETSECCTX': 0x80010124,
		'CO_E_FAILEDTOOPENTHREADTOKEN': 0x80010125,
		'CO_E_FAILEDTOGETTOKENINFO': 0x80010126,
		'CO_E_TRUSTEEDOESNTMATCHCLIENT': 0x80010127,
		'CO_E_FAILEDTOQUERYCLIENTBLANKET': 0x80010128,
		'CO_E_FAILEDTOSETDACL': 0x80010129,
		'CO_E_LOOKUPACCSIDFAILED': 0x80010130,
		'CO_E_NOMATCHINGNAMEFOUND': 0x80010131,
		'CO_E_LOOKUPACCNAMEFAILED': 0x80010132,
		'CO_E_SETSERLHNDLFAILED': 0x80010133,
		'CO_E_FAILEDTOGETWINDIR': 0x80010134,
		'CO_E_PATHTOOLONG': 0x80010135,
		'CO_E_FAILEDTOGENUUID': 0x80010136,
		'CO_E_FAILEDTOCREATEFILE': 0x80010137,
		'CO_E_FAILEDTOCLOSEHANDLE': 0x80010138,
		'CO_E_EXCEEDSYSACLLIMIT': 0x80010139,
		'CO_E_CANCEL_DISABLED': 0x80010140,
		'DISP_E_UNKNOWNINTERFACE': 0x80020001,
		'DISP_E_MEMBERNOTFOUND': 0x80020003,
		'DISP_E_PARAMNOTFOUND': 0x80020004,
		'DISP_E_TYPEMISMATCH': 0x80020005,
		'DISP_E_UNKNOWNNAME': 0x80020006,
		'DISP_E_NONAMEDARGS': 0x80020007,
		'DISP_E_BADVARTYPE': 0x80020008,
		'DISP_E_EXCEPTION': 0x80020009,
		'DISP_E_BADCALLEE': 0x80020010,
		'DISP_E_NOTACOLLECTION': 0x80020011,
		'DISP_E_DIVBYZERO': 0x80020012,
		'DISP_E_BUFFERTOOSMALL': 0x80020013,
		'TYPE_E_BUFFERTOOSMALL': 0x80028016,
		'TYPE_E_FIELDNOTFOUND': 0x80028017,
		'TYPE_E_INVDATAREAD': 0x80028018,
		'TYPE_E_UNSUPFORMAT': 0x80028019,
		'TYPE_E_UNDEFINEDTYPE': 0x80028027,
		'TYPE_E_QUALIFIEDNAMEDISALLOWED': 0x80028028,
		'TYPE_E_INVALIDSTATE': 0x80028029,
		'STG_E_INVALIDFUNCTION': 0x80030001,
		'STG_E_FILENOTFOUND': 0x80030002,
		'STG_E_PATHNOTFOUND': 0x80030003,
		'STG_E_TOOMANYOPENFILES': 0x80030004,
		'STG_E_ACCESSDENIED': 0x80030005,
		'STG_E_INVALIDHANDLE': 0x80030006,
		'STG_E_INSUFFICIENTMEMORY': 0x80030008,
		'STG_E_INVALIDPOINTER': 0x80030009,
		'STG_E_NOMOREFILES': 0x80030012,
		'STG_E_DISKISWRITEPROTECTED': 0x80030013,
		'STG_E_SEEKERROR': 0x80030019,
		'STG_E_SHAREVIOLATION': 0x80030020,
		'STG_E_LOCKVIOLATION': 0x80030021,
		'STG_E_FILEALREADYEXISTS': 0x80030050,
		'STG_E_INVALIDPARAMETER': 0x80030057,
		'STG_E_MEDIUMFULL': 0x80030070,
		'STG_E_INUSE': 0x80030100,
		'STG_E_NOTCURRENT': 0x80030101,
		'STG_E_REVERTED': 0x80030102,
		'STG_E_CANTSAVE': 0x80030103,
		'STG_E_OLDFORMAT': 0x80030104,
		'STG_E_OLDDLL': 0x80030105,
		'STG_E_SHAREREQUIRED': 0x80030106,
		'STG_E_NOTFILEBASEDSTORAGE': 0x80030107,
		'STG_E_EXTANTMARSHALLINGS': 0x80030108,
		'STG_E_DOCFILECORRUPT': 0x80030109,
		'STG_E_BADBASEADDRESS': 0x80030110,
		'STG_E_DOCFILETOOLARGE': 0x80030111,
		'STG_E_NOTSIMPLEFORMAT': 0x80030112,
		'STG_E_INCOMPLETE': 0x80030201,
		'STG_E_TERMINATED': 0x80030202,
		'STG_E_STATUS_COPY_PROTECTION_FAILURE': 0x80030305,
		'STG_E_CSS_AUTHENTICATION_FAILURE': 0x80030306,
		'STG_E_CSS_KEY_NOT_PRESENT': 0x80030307,
		'STG_E_CSS_KEY_NOT_ESTABLISHED': 0x80030308,
		'STG_E_CSS_SCRAMBLED_SECTOR': 0x80030309,
		'OLE_E_OLEVERB': 0x80040000,
		'OLE_E_ADVF': 0x80040001,
		'OLE_E_ENUM_NOMORE': 0x80040002,
		'OLE_E_ADVISENOTSUPPORTED': 0x80040003,
		'OLE_E_NOCONNECTION': 0x80040004,
		'OLE_E_NOTRUNNING': 0x80040005,
		'OLE_E_NOCACHE': 0x80040006,
		'OLE_E_BLANK': 0x80040007,
		'OLE_E_CLASSDIFF': 0x80040008,
		'OLE_E_CANT_GETMONIKER': 0x80040009,
		'OLE_E_NOT_INPLACEACTIVE': 0x80040010,
		'OLE_E_CANTCONVERT': 0x80040011,
		'OLE_E_NOSTORAGE': 0x80040012,
		'DV_E_FORMATETC': 0x80040064,
		'DV_E_DVTARGETDEVICE': 0x80040065,
		'DV_E_STGMEDIUM': 0x80040066,
		'DV_E_STATDATA': 0x80040067,
		'DV_E_LINDEX': 0x80040068,
		'DV_E_TYMED': 0x80040069,
		'DRAGDROP_E_NOTREGISTERED': 0x80040100,
		'DRAGDROP_E_ALREADYREGISTERED': 0x80040101,
		'DRAGDROP_E_INVALIDHWND': 0x80040102,
		'CLASS_E_NOAGGREGATION': 0x80040110,
		'CLASS_E_CLASSNOTAVAILABLE': 0x80040111,
		'CLASS_E_NOTLICENSED': 0x80040112,
		'VIEW_E_DRAW': 0x80040140,
		'REGDB_E_READREGDB': 0x80040150,
		'REGDB_E_WRITEREGDB': 0x80040151,
		'REGDB_E_KEYMISSING': 0x80040152,
		'REGDB_E_INVALIDVALUE': 0x80040153,
		'REGDB_E_CLASSNOTREG': 0x80040154,
		'REGDB_E_IIDNOTREG': 0x80040155,
		'REGDB_E_BADTHREADINGMODEL': 0x80040156,
		'CAT_E_CATIDNOEXIST': 0x80040160,
		'CAT_E_NODESCRIPTION': 0x80040161,
		'CS_E_PACKAGE_NOTFOUND': 0x80040164,
		'CS_E_NOT_DELETABLE': 0x80040165,
		'CS_E_CLASS_NOTFOUND': 0x80040166,
		'CS_E_INVALID_VERSION': 0x80040167,
		'CS_E_NO_CLASSSTORE': 0x80040168,
		'CS_E_OBJECT_NOTFOUND': 0x80040169,
		'CACHE_E_NOCACHE_UPDATED': 0x80040170,
		'OLEOBJ_E_NOVERBS': 0x80040180,
		'OLEOBJ_E_INVALIDVERB': 0x80040181,
		'EVENT_E_ALL_SUBSCRIBERS_FAILED': 0x80040201,
		'EVENT_E_QUERYSYNTAX': 0x80040203,
		'EVENT_E_QUERYFIELD': 0x80040204,
		'EVENT_E_INTERNALEXCEPTION': 0x80040205,
		'EVENT_E_INTERNALERROR': 0x80040206,
		'EVENT_E_INVALID_PER_USER_SID': 0x80040207,
		'EVENT_E_USER_EXCEPTION': 0x80040208,
		'EVENT_E_TOO_MANY_METHODS': 0x80040209,
		'EVENT_E_PER_USER_SID_NOT_LOGGED_ON': 0x80040210,
		'SCHED_E_TRIGGER_NOT_FOUND': 0x80041309,
		'SCHED_E_ACCOUNT_NAME_NOT_FOUND': 0x80041310,
		'SCHED_E_ACCOUNT_DBASE_CORRUPT': 0x80041311,
		'SCHED_E_NO_SECURITY_SERVICES': 0x80041312,
		'SCHED_E_UNKNOWN_OBJECT_VERSION': 0x80041313,
		'SCHED_E_UNSUPPORTED_ACCOUNT_OPTION': 0x80041314,
		'SCHED_E_SERVICE_NOT_RUNNING': 0x80041315,
		'SCHED_E_UNEXPECTEDNODE': 0x80041316,
		'SCHED_E_NAMESPACE': 0x80041317,
		'SCHED_E_INVALIDVALUE': 0x80041318,
		'SCHED_E_MISSINGNODE': 0x80041319,
		'SCHED_E_USER_NOT_LOGGED_ON': 0x80041320,
		'SCHED_E_INVALID_TASK_HASH': 0x80041321,
		'SCHED_E_SERVICE_NOT_AVAILABLE': 0x80041322,
		'SCHED_E_SERVICE_TOO_BUSY': 0x80041323,
		'SCHED_E_TASK_ATTEMPTED': 0x80041324,
		'E_ACCESSDENIED': 0x80070005,
		'ERROR_NOT_SUPPORTED': 0x80070032,
		'E_INVALIDARG': 0x80070057,
		'CO_E_CLASS_CREATE_FAILED': 0x80080001,
		'CO_E_SCM_ERROR': 0x80080002,
		'CO_E_SCM_RPC_FAILURE': 0x80080003,
		'CO_E_BAD_PATH': 0x80080004,
		'CO_E_SERVER_EXEC_FAILURE': 0x80080005,
		'CO_E_OBJSRV_RPC_FAILURE': 0x80080006,
		'MK_E_NO_NORMALIZED': 0x80080007,
		'CO_E_SERVER_STOPPING': 0x80080008,
		'MEM_E_INVALID_ROOT': 0x80080009,
		'MEM_E_INVALID_LINK': 0x80080010,
		'MEM_E_INVALID_SIZE': 0x80080011,
		'CO_E_MISSING_DISPLAYNAME': 0x80080015,
		'CO_E_RUNAS_VALUE_MUST_BE_AAA': 0x80080016,
		'CO_E_ELEVATION_DISABLED': 0x80080017,
		'NTE_BAD_UID': 0x80090001,
		'NTE_BAD_HASH': 0x80090002,
		'NTE_BAD_KEY': 0x80090003,
		'NTE_BAD_LEN': 0x80090004,
		'NTE_BAD_DATA': 0x80090005,
		'NTE_BAD_SIGNATURE': 0x80090006,
		'NTE_BAD_VER': 0x80090007,
		'NTE_BAD_ALGID': 0x80090008,
		'NTE_BAD_FLAGS': 0x80090009,
		'NTE_PERM': 0x80090010,
		'NTE_NOT_FOUND': 0x80090011,
		'NTE_DOUBLE_ENCRYPT': 0x80090012,
		'NTE_BAD_PROVIDER': 0x80090013,
		'NTE_BAD_PROV_TYPE': 0x80090014,
		'NTE_BAD_PUBLIC_KEY': 0x80090015,
		'NTE_BAD_KEYSET': 0x80090016,
		'NTE_PROV_TYPE_NOT_DEF': 0x80090017,
		'NTE_PROV_TYPE_ENTRY_BAD': 0x80090018,
		'NTE_KEYSET_NOT_DEF': 0x80090019,
		'NTE_FAIL': 0x80090020,
		'NTE_SYS_ERR': 0x80090021,
		'NTE_SILENT_CONTEXT': 0x80090022,
		'NTE_TOKEN_KEYSET_STORAGE_FULL': 0x80090023,
		'NTE_TEMPORARY_PROFILE': 0x80090024,
		'NTE_FIXEDPARAMETER': 0x80090025,
		'NTE_INVALID_HANDLE': 0x80090026,
		'NTE_INVALID_PARAMETER': 0x80090027,
		'NTE_BUFFER_TOO_SMALL': 0x80090028,
		'NTE_NOT_SUPPORTED': 0x80090029,
		'SEC_E_INSUFFICIENT_MEMORY': 0x80090300,
		'SEC_E_INVALID_HANDLE': 0x80090301,
		'SEC_E_UNSUPPORTED_FUNCTION': 0x80090302,
		'SEC_E_TARGET_UNKNOWN': 0x80090303,
		'SEC_E_INTERNAL_ERROR': 0x80090304,
		'SEC_E_SECPKG_NOT_FOUND': 0x80090305,
		'SEC_E_NOT_OWNER': 0x80090306,
		'SEC_E_CANNOT_INSTALL': 0x80090307,
		'SEC_E_INVALID_TOKEN': 0x80090308,
		'SEC_E_CANNOT_PACK': 0x80090309,
		'SEC_E_OUT_OF_SEQUENCE': 0x80090310,
		'SEC_E_NO_AUTHENTICATING_AUTHORITY': 0x80090311,
		'SEC_E_BAD_PKGID': 0x80090316,
		'SEC_E_CONTEXT_EXPIRED': 0x80090317,
		'SEC_E_INCOMPLETE_MESSAGE': 0x80090318,
		'SEC_E_INCOMPLETE_CREDENTIALS': 0x80090320,
		'SEC_E_BUFFER_TOO_SMALL': 0x80090321,
		'SEC_E_WRONG_PRINCIPAL': 0x80090322,
		'SEC_E_TIME_SKEW': 0x80090324,
		'SEC_E_UNTRUSTED_ROOT': 0x80090325,
		'SEC_E_ILLEGAL_MESSAGE': 0x80090326,
		'SEC_E_CERT_UNKNOWN': 0x80090327,
		'SEC_E_CERT_EXPIRED': 0x80090328,
		'SEC_E_ENCRYPT_FAILURE': 0x80090329,
		'SEC_E_DECRYPT_FAILURE': 0x80090330,
		'SEC_E_ALGORITHM_MISMATCH': 0x80090331,
		'SEC_E_SECURITY_QOS_FAILED': 0x80090332,
		'SEC_E_UNFINISHED_CONTEXT_DELETED': 0x80090333,
		'SEC_E_NO_TGT_REPLY': 0x80090334,
		'SEC_E_NO_IP_ADDRESSES': 0x80090335,
		'SEC_E_WRONG_CREDENTIAL_HANDLE': 0x80090336,
		'SEC_E_CRYPTO_SYSTEM_INVALID': 0x80090337,
		'SEC_E_MAX_REFERRALS_EXCEEDED': 0x80090338,
		'SEC_E_MUST_BE_KDC': 0x80090339,
		'SEC_E_KDC_INVALID_REQUEST': 0x80090340,
		'SEC_E_KDC_UNABLE_TO_REFER': 0x80090341,
		'SEC_E_KDC_UNKNOWN_ETYPE': 0x80090342,
		'SEC_E_UNSUPPORTED_PREAUTH': 0x80090343,
		'SEC_E_DELEGATION_REQUIRED': 0x80090345,
		'SEC_E_BAD_BINDINGS': 0x80090346,
		'SEC_E_MULTIPLE_ACCOUNTS': 0x80090347,
		'SEC_E_NO_KERB_KEY': 0x80090348,
		'SEC_E_CERT_WRONG_USAGE': 0x80090349,
		'SEC_E_DOWNGRADE_DETECTED': 0x80090350,
		'SEC_E_SMARTCARD_CERT_REVOKED': 0x80090351,
		'SEC_E_ISSUING_CA_UNTRUSTED': 0x80090352,
		'SEC_E_REVOCATION_OFFLINE_C': 0x80090353,
		'SEC_E_PKINIT_CLIENT_FAILURE': 0x80090354,
		'SEC_E_SMARTCARD_CERT_EXPIRED': 0x80090355,
		'SEC_E_NO_S4U_PROT_SUPPORT': 0x80090356,
		'SEC_E_CROSSREALM_DELEGATION_FAILURE': 0x80090357,
		'SEC_E_REVOCATION_OFFLINE_KDC': 0x80090358,
		'SEC_E_ISSUING_CA_UNTRUSTED_KDC': 0x80090359,
		'CRYPT_E_MSG_ERROR': 0x80091001,
		'CRYPT_E_UNKNOWN_ALGO': 0x80091002,
		'CRYPT_E_OID_FORMAT': 0x80091003,
		'CRYPT_E_INVALID_MSG_TYPE': 0x80091004,
		'CRYPT_E_UNEXPECTED_ENCODING': 0x80091005,
		'CRYPT_E_AUTH_ATTR_MISSING': 0x80091006,
		'CRYPT_E_HASH_VALUE': 0x80091007,
		'CRYPT_E_INVALID_INDEX': 0x80091008,
		'CRYPT_E_ALREADY_DECRYPTED': 0x80091009,
		'CRYPT_E_STREAM_MSG_NOT_READY': 0x80091010,
		'CRYPT_E_STREAM_INSUFFICIENT_DATA': 0x80091011,
		'CRYPT_E_BAD_LEN': 0x80092001,
		'CRYPT_E_BAD_ENCODE': 0x80092002,
		'CRYPT_E_FILE_ERROR': 0x80092003,
		'CRYPT_E_NOT_FOUND': 0x80092004,
		'CRYPT_E_EXISTS': 0x80092005,
		'CRYPT_E_NO_PROVIDER': 0x80092006,
		'CRYPT_E_SELF_SIGNED': 0x80092007,
		'CRYPT_E_DELETED_PREV': 0x80092008,
		'CRYPT_E_NO_MATCH': 0x80092009,
		'CRYPT_E_REVOKED': 0x80092010,
		'CRYPT_E_NO_REVOCATION_DLL': 0x80092011,
		'CRYPT_E_NO_REVOCATION_CHECK': 0x80092012,
		'CRYPT_E_REVOCATION_OFFLINE': 0x80092013,
		'CRYPT_E_NOT_IN_REVOCATION_DATABASE': 0x80092014,
		'CRYPT_E_INVALID_NUMERIC_STRING': 0x80092020,
		'CRYPT_E_INVALID_PRINTABLE_STRING': 0x80092021,
		'CRYPT_E_INVALID_IA5_STRING': 0x80092022,
		'CRYPT_E_INVALID_X500_STRING': 0x80092023,
		'CRYPT_E_NOT_CHAR_STRING': 0x80092024,
		'CRYPT_E_FILERESIZED': 0x80092025,
		'CRYPT_E_SECURITY_SETTINGS': 0x80092026,
		'CRYPT_E_NO_VERIFY_USAGE_DLL': 0x80092027,
		'CRYPT_E_NO_VERIFY_USAGE_CHECK': 0x80092028,
		'CRYPT_E_VERIFY_USAGE_OFFLINE': 0x80092029,
		'CRYPT_E_OSS_ERROR': 0x80093000,
		'OSS_MORE_BUF': 0x80093001,
		'OSS_NEGATIVE_UINTEGER': 0x80093002,
		'OSS_PDU_RANGE': 0x80093003,
		'OSS_MORE_INPUT': 0x80093004,
		'OSS_DATA_ERROR': 0x80093005,
		'OSS_BAD_ARG': 0x80093006,
		'OSS_BAD_VERSION': 0x80093007,
		'OSS_OUT_MEMORY': 0x80093008,
		'OSS_PDU_MISMATCH': 0x80093009,
		'OSS_TOO_LONG': 0x80093010,
		'OSS_CONSTRAINT_VIOLATED': 0x80093011,
		'OSS_FATAL_ERROR': 0x80093012,
		'OSS_ACCESS_SERIALIZATION_ERROR': 0x80093013,
		'OSS_NULL_TBL': 0x80093014,
		'OSS_NULL_FCN': 0x80093015,
		'OSS_BAD_ENCRULES': 0x80093016,
		'OSS_UNAVAIL_ENCRULES': 0x80093017,
		'OSS_CANT_OPEN_TRACE_WINDOW': 0x80093018,
		'OSS_UNIMPLEMENTED': 0x80093019,
		'OSS_REAL_CODE_NOT_LINKED': 0x80093020,
		'OSS_OUT_OF_RANGE': 0x80093021,
		'OSS_COPIER_DLL_NOT_LINKED': 0x80093022,
		'OSS_CONSTRAINT_DLL_NOT_LINKED': 0x80093023,
		'OSS_COMPARATOR_DLL_NOT_LINKED': 0x80093024,
		'OSS_COMPARATOR_CODE_NOT_LINKED': 0x80093025,
		'OSS_MEM_MGR_DLL_NOT_LINKED': 0x80093026,
		'OSS_PDV_DLL_NOT_LINKED': 0x80093027,
		'OSS_PDV_CODE_NOT_LINKED': 0x80093028,
		'OSS_API_DLL_NOT_LINKED': 0x80093029,
		'CRYPT_E_ASN1_ERROR': 0x80093100,
		'CRYPT_E_ASN1_INTERNAL': 0x80093101,
		'CRYPT_E_ASN1_EOD': 0x80093102,
		'CRYPT_E_ASN1_CORRUPT': 0x80093103,
		'CRYPT_E_ASN1_LARGE': 0x80093104,
		'CRYPT_E_ASN1_CONSTRAINT': 0x80093105,
		'CRYPT_E_ASN1_MEMORY': 0x80093106,
		'CRYPT_E_ASN1_OVERFLOW': 0x80093107,
		'CRYPT_E_ASN1_BADPDU': 0x80093108,
		'CRYPT_E_ASN1_BADARGS': 0x80093109,
		'CRYPT_E_ASN1_PDU_TYPE': 0x80093133,
		'CRYPT_E_ASN1_NYI': 0x80093134,
		'CRYPT_E_ASN1_EXTENDED': 0x80093201,
		'CRYPT_E_ASN1_NOEOD': 0x80093202,
		'CERTSRV_E_BAD_REQUESTSUBJECT': 0x80094001,
		'CERTSRV_E_NO_REQUEST': 0x80094002,
		'CERTSRV_E_BAD_REQUESTSTATUS': 0x80094003,
		'CERTSRV_E_PROPERTY_EMPTY': 0x80094004,
		'CERTSRV_E_INVALID_CA_CERTIFICATE': 0x80094005,
		'CERTSRV_E_SERVER_SUSPENDED': 0x80094006,
		'CERTSRV_E_ENCODING_LENGTH': 0x80094007,
		'CERTSRV_E_ROLECONFLICT': 0x80094008,
		'CERTSRV_E_RESTRICTEDOFFICER': 0x80094009,
		'CERTSRV_E_ALIGNMENT_FAULT': 0x80094010,
		'CERTSRV_E_ENROLL_DENIED': 0x80094011,
		'CERTSRV_E_TEMPLATE_DENIED': 0x80094012,
		'CERTSRV_E_DOWNLEVEL_DC_SSL_OR_UPGRADE': 0x80094013,
		'CERTSRV_E_UNSUPPORTED_CERT_TYPE': 0x80094800,
		'CERTSRV_E_NO_CERT_TYPE': 0x80094801,
		'CERTSRV_E_TEMPLATE_CONFLICT': 0x80094802,
		'CERTSRV_E_SUBJECT_ALT_NAME_REQUIRED': 0x80094803,
		'CERTSRV_E_ARCHIVED_KEY_REQUIRED': 0x80094804,
		'CERTSRV_E_SMIME_REQUIRED': 0x80094805,
		'CERTSRV_E_BAD_RENEWAL_SUBJECT': 0x80094806,
		'CERTSRV_E_BAD_TEMPLATE_VERSION': 0x80094807,
		'CERTSRV_E_TEMPLATE_POLICY_REQUIRED': 0x80094808,
		'CERTSRV_E_SIGNATURE_POLICY_REQUIRED': 0x80094809,
		'CERTSRV_E_ARCHIVED_KEY_UNEXPECTED': 0x80094810,
		'CERTSRV_E_KEY_LENGTH': 0x80094811,
		'CERTSRV_E_SUBJECT_EMAIL_REQUIRED': 0x80094812,
		'CERTSRV_E_UNKNOWN_CERT_TYPE': 0x80094813,
		'CERTSRV_E_CERT_TYPE_OVERLAP': 0x80094814,
		'CERTSRV_E_TOO_MANY_SIGNATURES': 0x80094815,
		'CERTSRV_E_RENEWAL_BAD_PUBLIC_KEY': 0x80094816,
		'CERTSRV_E_INVALID_EK': 0x80094817,
		'XENROLL_E_KEY_NOT_EXPORTABLE': 0x80095000,
		'XENROLL_E_CANNOT_ADD_ROOT_CERT': 0x80095001,
		'XENROLL_E_RESPONSE_KA_HASH_NOT_FOUND': 0x80095002,
		'XENROLL_E_RESPONSE_UNEXPECTED_KA_HASH': 0x80095003,
		'XENROLL_E_RESPONSE_KA_HASH_MISMATCH': 0x80095004,
		'XENROLL_E_KEYSPEC_SMIME_MISMATCH': 0x80095005,
		'TRUST_E_SYSTEM_ERROR': 0x80096001,
		'TRUST_E_NO_SIGNER_CERT': 0x80096002,
		'TRUST_E_COUNTER_SIGNER': 0x80096003,
		'TRUST_E_CERT_SIGNATURE': 0x80096004,
		'TRUST_E_TIME_STAMP': 0x80096005,
		'TRUST_E_BAD_DIGEST': 0x80096010,
		'TRUST_E_BASIC_CONSTRAINTS': 0x80096019,
		'MSSIPOTF_E_OUTOFMEMRANGE': 0x80097001,
		'MSSIPOTF_E_CANTGETOBJECT': 0x80097002,
		'MSSIPOTF_E_NOHEADTABLE': 0x80097003,
		'MSSIPOTF_E_BAD_MAGICNUMBER': 0x80097004,
		'MSSIPOTF_E_BAD_OFFSET_TABLE': 0x80097005,
		'MSSIPOTF_E_TABLE_TAGORDER': 0x80097006,
		'MSSIPOTF_E_TABLE_LONGWORD': 0x80097007,
		'MSSIPOTF_E_BAD_FIRST_TABLE_PLACEMENT': 0x80097008,
		'MSSIPOTF_E_TABLES_OVERLAP': 0x80097009,
		'MSSIPOTF_E_FAILED_POLICY': 0x80097010,
		'MSSIPOTF_E_FAILED_HINTS_CHECK': 0x80097011,
		'MSSIPOTF_E_NOT_OPENTYPE': 0x80097012,
		'MSSIPOTF_E_FILE': 0x80097013,
		'MSSIPOTF_E_CRYPT': 0x80097014,
		'MSSIPOTF_E_BADVERSION': 0x80097015,
		'MSSIPOTF_E_DSIG_STRUCTURE': 0x80097016,
		'MSSIPOTF_E_PCONST_CHECK': 0x80097017,
		'MSSIPOTF_E_STRUCTURE': 0x80097018,
		'ERROR_CRED_REQUIRES_CONFIRMATION': 0x80097019,
		'SCARD_F_INTERNAL_ERROR': 0x80100001,
		'SCARD_E_CANCELLED': 0x80100002,
		'SCARD_E_INVALID_HANDLE': 0x80100003,
		'SCARD_E_INVALID_PARAMETER': 0x80100004,
		'SCARD_E_INVALID_TARGET': 0x80100005,
		'SCARD_E_NO_MEMORY': 0x80100006,
		'SCARD_F_WAITED_TOO_LONG': 0x80100007,
		'SCARD_E_INSUFFICIENT_BUFFER': 0x80100008,
		'SCARD_E_UNKNOWN_READER': 0x80100009,
		'SCARD_E_NOT_READY': 0x80100010,
		'SCARD_E_INVALID_VALUE': 0x80100011,
		'SCARD_E_SYSTEM_CANCELLED': 0x80100012,
		'SCARD_F_COMM_ERROR': 0x80100013,
		'SCARD_F_UNKNOWN_ERROR': 0x80100014,
		'SCARD_E_INVALID_ATR': 0x80100015,
		'SCARD_E_NOT_TRANSACTED': 0x80100016,
		'SCARD_E_READER_UNAVAILABLE': 0x80100017,
		'SCARD_P_SHUTDOWN': 0x80100018,
		'SCARD_E_PCI_TOO_SMALL': 0x80100019,
		'SCARD_E_ICC_INSTALLATION': 0x80100020,
		'SCARD_E_ICC_CREATEORDER': 0x80100021,
		'SCARD_E_UNSUPPORTED_FEATURE': 0x80100022,
		'SCARD_E_DIR_NOT_FOUND': 0x80100023,
		'SCARD_E_FILE_NOT_FOUND': 0x80100024,
		'SCARD_E_NO_DIR': 0x80100025,
		'SCARD_E_NO_FILE': 0x80100026,
		'SCARD_E_NO_ACCESS': 0x80100027,
		'SCARD_E_WRITE_TOO_MANY': 0x80100028,
		'SCARD_E_BAD_SEEK': 0x80100029,
		'SCARD_E_NO_KEY_CONTAINER': 0x80100030,
		'SCARD_E_SERVER_TOO_BUSY': 0x80100031,
		'SCARD_W_UNSUPPORTED_CARD': 0x80100065,
		'SCARD_W_UNRESPONSIVE_CARD': 0x80100066,
		'SCARD_W_UNPOWERED_CARD': 0x80100067,
		'SCARD_W_RESET_CARD': 0x80100068,
		'SCARD_W_REMOVED_CARD': 0x80100069,
		'COMADMIN_E_OBJECTERRORS': 0x80110401,
		'COMADMIN_E_OBJECTINVALID': 0x80110402,
		'COMADMIN_E_KEYMISSING': 0x80110403,
		'COMADMIN_E_ALREADYINSTALLED': 0x80110404,
		'COMADMIN_E_APP_FILE_WRITEFAIL': 0x80110407,
		'COMADMIN_E_APP_FILE_READFAIL': 0x80110408,
		'COMADMIN_E_APP_FILE_VERSION': 0x80110409,
		'COMADMIN_E_INVALIDUSERIDS': 0x80110410,
		'COMADMIN_E_NOREGISTRYCLSID': 0x80110411,
		'COMADMIN_E_BADREGISTRYPROGID': 0x80110412,
		'COMADMIN_E_AUTHENTICATIONLEVEL': 0x80110413,
		'COMADMIN_E_USERPASSWDNOTVALID': 0x80110414,
		'COMADMIN_E_CLSIDORIIDMISMATCH': 0x80110418,
		'COMADMIN_E_REMOTEINTERFACE': 0x80110419,
		'COMADMIN_E_REGISTRARFAILED': 0x80110423,
		'COMADMIN_E_COMPFILE_DOESNOTEXIST': 0x80110424,
		'COMADMIN_E_COMPFILE_LOADDLLFAIL': 0x80110425,
		'COMADMIN_E_COMPFILE_GETCLASSOBJ': 0x80110426,
		'COMADMIN_E_COMPFILE_CLASSNOTAVAIL': 0x80110427,
		'COMADMIN_E_COMPFILE_BADTLB': 0x80110428,
		'COMADMIN_E_COMPFILE_NOTINSTALLABLE': 0x80110429,
		'COMADMIN_E_REGISTERTLB': 0x80110430,
		'COMADMIN_E_SYSTEMAPP': 0x80110433,
		'COMADMIN_E_COMPFILE_NOREGISTRAR': 0x80110434,
		'COMADMIN_E_COREQCOMPINSTALLED': 0x80110435,
		'COMADMIN_E_SERVICENOTINSTALLED': 0x80110436,
		'COMADMIN_E_PROPERTYSAVEFAILED': 0x80110437,
		'COMADMIN_E_OBJECTEXISTS': 0x80110438,
		'COMADMIN_E_COMPONENTEXISTS': 0x80110439,
		'COMADMIN_E_APPLID_MATCHES_CLSID': 0x80110446,
		'COMADMIN_E_ROLE_DOES_NOT_EXIST': 0x80110447,
		'COMADMIN_E_START_APP_NEEDS_COMPONENTS': 0x80110448,
		'COMADMIN_E_REQUIRES_DIFFERENT_PLATFORM': 0x80110449,
		'COMADMIN_E_BASE_PARTITION_ONLY': 0x80110450,
		'COMADMIN_E_START_APP_DISABLED': 0x80110451,
		'COMADMIN_E_CAT_DUPLICATE_PARTITION_NAME': 0x80110457,
		'COMADMIN_E_CAT_INVALID_PARTITION_NAME': 0x80110458,
		'COMADMIN_E_CAT_PARTITION_IN_USE': 0x80110459,
		'COMADMIN_E_REGDB_NOTINITIALIZED': 0x80110472,
		'COMADMIN_E_REGDB_NOTOPEN': 0x80110473,
		'COMADMIN_E_REGDB_SYSTEMERR': 0x80110474,
		'COMADMIN_E_REGDB_ALREADYRUNNING': 0x80110475,
		'COMADMIN_E_MIG_VERSIONNOTSUPPORTED': 0x80110480,
		'COMADMIN_E_MIG_SCHEMANOTFOUND': 0x80110481,
		'COMADMIN_E_CAT_BITNESSMISMATCH': 0x80110482,
		'COMADMIN_E_CAT_UNACCEPTABLEBITNESS': 0x80110483,
		'COMADMIN_E_CAT_WRONGAPPBITNESS': 0x80110484,
		'COMADMIN_E_CAT_PAUSE_RESUME_NOT_SUPPORTED': 0x80110485,
		'COMADMIN_E_CAT_SERVERFAULT': 0x80110486,
		'COMQC_E_APPLICATION_NOT_QUEUED': 0x80110600,
		'COMQC_E_NO_QUEUEABLE_INTERFACES': 0x80110601,
		'COMQC_E_QUEUING_SERVICE_NOT_AVAILABLE': 0x80110602,
		'COMQC_E_NO_IPERSISTSTREAM': 0x80110603,
		'COMQC_E_BAD_MESSAGE': 0x80110604,
		'COMQC_E_UNAUTHENTICATED': 0x80110605,
		'COMQC_E_UNTRUSTED_ENQUEUER': 0x80110606,
		'MSDTC_E_DUPLICATE_RESOURCE': 0x80110701,
		'COMADMIN_E_OBJECT_PARENT_MISSING': 0x80110808,
		'COMADMIN_E_OBJECT_DOES_NOT_EXIST': 0x80110809,
		'COMADMIN_E_CANTRECYCLESERVICEAPPS': 0x80110811,
		'COMADMIN_E_PROCESSALREADYRECYCLED': 0x80110812,
		'COMADMIN_E_PAUSEDPROCESSMAYNOTBERECYCLED': 0x80110813,
		'COMADMIN_E_CANTMAKEINPROCSERVICE': 0x80110814,
		'COMADMIN_E_PROGIDINUSEBYCLSID': 0x80110815,
		'COMADMIN_E_DEFAULT_PARTITION_NOT_IN_SET': 0x80110816,
		'COMADMIN_E_RECYCLEDPROCESSMAYNOTBEPAUSED': 0x80110817,
		'COMADMIN_E_PARTITION_ACCESSDENIED': 0x80110818,
		'COMADMIN_E_PARTITION_MSI_ONLY': 0x80110819,
		'COMADMIN_E_CANNOT_ALIAS_EVENTCLASS': 0x80110820,
		'COMADMIN_E_PRIVATE_ACCESSDENIED': 0x80110821,
		'COMADMIN_E_SAFERINVALID': 0x80110822,
		'COMADMIN_E_REGISTRY_ACCESSDENIED': 0x80110823,
		'COMADMIN_E_PARTITIONS_DISABLED': 0x80110824,
		'ERROR_HUNG_DISPLAY_DRIVER_THREAD': 0x80260001,
		'ERROR_MONITOR_NO_DESCRIPTOR': 0x80261001,
		'ERROR_MONITOR_UNKNOWN_DESCRIPTOR_FORMAT': 0x80261002,
		'DWM_E_COMPOSITIONDISABLED': 0x80263001,
		'DWM_E_REMOTING_NOT_SUPPORTED': 0x80263002,
		'DWM_E_NO_REDIRECTION_SURFACE_AVAILABLE': 0x80263003,
		'DWM_E_NOT_QUEUING_PRESENTS': 0x80263004,
		'TPM_E_ERROR_MASK': 0x80280000,
		'TPM_E_AUTHFAIL': 0x80280001,
		'TPM_E_BADINDEX': 0x80280002,
		'TPM_E_BAD_PARAMETER': 0x80280003,
		'TPM_E_AUDITFAILURE': 0x80280004,
		'TPM_E_CLEAR_DISABLED': 0x80280005,
		'TPM_E_DEACTIVATED': 0x80280006,
		'TPM_E_DISABLED': 0x80280007,
		'TPM_E_DISABLED_CMD': 0x80280008,
		'TPM_E_FAIL': 0x80280009,
		'TPM_E_INVALID_PCR_INFO': 0x80280010,
		'TPM_E_NOSPACE': 0x80280011,
		'TPM_E_NOSRK': 0x80280012,
		'TPM_E_NOTSEALED_BLOB': 0x80280013,
		'TPM_E_OWNER_SET': 0x80280014,
		'TPM_E_RESOURCES': 0x80280015,
		'TPM_E_SHORTRANDOM': 0x80280016,
		'TPM_E_SIZE': 0x80280017,
		'TPM_E_WRONGPCRVAL': 0x80280018,
		'TPM_E_BAD_PARAM_SIZE': 0x80280019,
		'TPM_E_ENCRYPT_ERROR': 0x80280020,
		'TPM_E_DECRYPT_ERROR': 0x80280021,
		'TPM_E_INVALID_AUTHHANDLE': 0x80280022,
		'TPM_E_NO_ENDORSEMENT': 0x80280023,
		'TPM_E_INVALID_KEYUSAGE': 0x80280024,
		'TPM_E_WRONG_ENTITYTYPE': 0x80280025,
		'TPM_E_INVALID_POSTINIT': 0x80280026,
		'TPM_E_INAPPROPRIATE_SIG': 0x80280027,
		'TPM_E_BAD_KEY_PROPERTY': 0x80280028,
		'TPM_E_BAD_MIGRATION': 0x80280029,
		'TPM_E_AUDITFAIL_UNSUCCESSFUL': 0x80280030,
		'TPM_E_AUDITFAIL_SUCCESSFUL': 0x80280031,
		'TPM_E_NOTRESETABLE': 0x80280032,
		'TPM_E_NOTLOCAL': 0x80280033,
		'TPM_E_BAD_TYPE': 0x80280034,
		'TPM_E_INVALID_RESOURCE': 0x80280035,
		'TPM_E_NOTFIPS': 0x80280036,
		'TPM_E_INVALID_FAMILY': 0x80280037,
		'TPM_E_NO_NV_PERMISSION': 0x80280038,
		'TPM_E_REQUIRES_SIGN': 0x80280039,
		'TPM_E_FAMILYCOUNT': 0x80280040,
		'TPM_E_WRITE_LOCKED': 0x80280041,
		'TPM_E_BAD_ATTRIBUTES': 0x80280042,
		'TPM_E_INVALID_STRUCTURE': 0x80280043,
		'TPM_E_KEY_OWNER_CONTROL': 0x80280044,
		'TPM_E_BAD_COUNTER': 0x80280045,
		'TPM_E_NOT_FULLWRITE': 0x80280046,
		'TPM_E_CONTEXT_GAP': 0x80280047,
		'TPM_E_MAXNVWRITES': 0x80280048,
		'TPM_E_NOOPERATOR': 0x80280049,
		'TPM_E_DAA_RESOURCES': 0x80280050,
		'TPM_E_DAA_INPUT_DATA0': 0x80280051,
		'TPM_E_DAA_INPUT_DATA1': 0x80280052,
		'TPM_E_DAA_ISSUER_SETTINGS': 0x80280053,
		'TPM_E_DAA_TPM_SETTINGS': 0x80280054,
		'TPM_E_DAA_STAGE': 0x80280055,
		'TPM_E_DAA_ISSUER_VALIDITY': 0x80280056,
		'TPM_E_DAA_WRONG_W': 0x80280057,
		'TPM_E_BAD_HANDLE': 0x80280058,
		'TPM_E_BAD_DELEGATE': 0x80280059,
		'TPM_E_PERMANENTEK': 0x80280061,
		'TPM_E_BAD_SIGNATURE': 0x80280062,
		'TPM_E_NOCONTEXTSPACE': 0x80280063,
		'TPM_E_COMMAND_BLOCKED': 0x80280400,
		'TPM_E_INVALID_HANDLE': 0x80280401,
		'TPM_E_DUPLICATE_VHANDLE': 0x80280402,
		'TPM_E_EMBEDDED_COMMAND_BLOCKED': 0x80280403,
		'TPM_E_EMBEDDED_COMMAND_UNSUPPORTED': 0x80280404,
		'TPM_E_RETRY': 0x80280800,
		'TPM_E_NEEDS_SELFTEST': 0x80280801,
		'TPM_E_DOING_SELFTEST': 0x80280802,
		'TPM_E_DEFEND_LOCK_RUNNING': 0x80280803,
		'TBS_E_INTERNAL_ERROR': 0x80284001,
		'TBS_E_BAD_PARAMETER': 0x80284002,
		'TBS_E_INVALID_OUTPUT_POINTER': 0x80284003,
		'TBS_E_INVALID_CONTEXT': 0x80284004,
		'TBS_E_INSUFFICIENT_BUFFER': 0x80284005,
		'TBS_E_IOERROR': 0x80284006,
		'TBS_E_INVALID_CONTEXT_PARAM': 0x80284007,
		'TBS_E_SERVICE_NOT_RUNNING': 0x80284008,
		'TBS_E_TOO_MANY_TBS_CONTEXTS': 0x80284009,
		'TPMAPI_E_INVALID_STATE': 0x80290100,
		'TPMAPI_E_NOT_ENOUGH_DATA': 0x80290101,
		'TPMAPI_E_TOO_MUCH_DATA': 0x80290102,
		'TPMAPI_E_INVALID_OUTPUT_POINTER': 0x80290103,
		'TPMAPI_E_INVALID_PARAMETER': 0x80290104,
		'TPMAPI_E_OUT_OF_MEMORY': 0x80290105,
		'TPMAPI_E_BUFFER_TOO_SMALL': 0x80290106,
		'TPMAPI_E_INTERNAL_ERROR': 0x80290107,
		'TPMAPI_E_ACCESS_DENIED': 0x80290108,
		'TPMAPI_E_AUTHORIZATION_FAILED': 0x80290109,
		'TPMAPI_E_ENCRYPTION_FAILED': 0x80290110,
		'TPMAPI_E_INVALID_KEY_PARAMS': 0x80290111,
		'TPMAPI_E_INVALID_MIGRATION_AUTHORIZATION_BLOB': 0x80290112,
		'TPMAPI_E_INVALID_PCR_INDEX': 0x80290113,
		'TPMAPI_E_INVALID_DELEGATE_BLOB': 0x80290114,
		'TPMAPI_E_INVALID_CONTEXT_PARAMS': 0x80290115,
		'TPMAPI_E_INVALID_KEY_BLOB': 0x80290116,
		'TPMAPI_E_INVALID_PCR_DATA': 0x80290117,
		'TPMAPI_E_INVALID_OWNER_AUTH': 0x80290118,
		'TBSIMP_E_BUFFER_TOO_SMALL': 0x80290200,
		'TBSIMP_E_CLEANUP_FAILED': 0x80290201,
		'TBSIMP_E_INVALID_CONTEXT_HANDLE': 0x80290202,
		'TBSIMP_E_INVALID_CONTEXT_PARAM': 0x80290203,
		'TBSIMP_E_TPM_ERROR': 0x80290204,
		'TBSIMP_E_HASH_BAD_KEY': 0x80290205,
		'TBSIMP_E_DUPLICATE_VHANDLE': 0x80290206,
		'TBSIMP_E_INVALID_OUTPUT_POINTER': 0x80290207,
		'TBSIMP_E_INVALID_PARAMETER': 0x80290208,
		'TBSIMP_E_RPC_INIT_FAILED': 0x80290209,
		'TBSIMP_E_NOT_ENOUGH_TPM_CONTEXTS': 0x80290210,
		'TBSIMP_E_COMMAND_FAILED': 0x80290211,
		'TBSIMP_E_UNKNOWN_ORDINAL': 0x80290212,
		'TBSIMP_E_RESOURCE_EXPIRED': 0x80290213,
		'TBSIMP_E_INVALID_RESOURCE': 0x80290214,
		'TBSIMP_E_NOTHING_TO_UNLOAD': 0x80290215,
		'TBSIMP_E_HASH_TABLE_FULL': 0x80290216,
		'TBSIMP_E_TOO_MANY_TBS_CONTEXTS': 0x80290217,
		'TBSIMP_E_TOO_MANY_RESOURCES': 0x80290218,
		'TBSIMP_E_PPI_NOT_SUPPORTED': 0x80290219,
		'TPM_E_PPI_ACPI_FAILURE': 0x80290300,
		'TPM_E_PPI_USER_ABORT': 0x80290301,
		'TPM_E_PPI_BIOS_FAILURE': 0x80290302,
		'TPM_E_PPI_NOT_SUPPORTED': 0x80290303,
		'PLA_E_DCS_NOT_FOUND': 0x80300002,
		'PLA_E_TOO_MANY_FOLDERS': 0x80300045,
		'PLA_E_NO_MIN_DISK': 0x80300070,
		'PLA_E_PROPERTY_CONFLICT': 0x80300101,
		'PLA_E_DCS_SINGLETON_REQUIRED': 0x80300102,
		'PLA_E_CREDENTIALS_REQUIRED': 0x80300103,
		'PLA_E_DCS_NOT_RUNNING': 0x80300104,
		'PLA_E_CONFLICT_INCL_EXCL_API': 0x80300105,
		'PLA_E_NETWORK_EXE_NOT_VALID': 0x80300106,
		'PLA_E_EXE_ALREADY_CONFIGURED': 0x80300107,
		'PLA_E_EXE_PATH_NOT_VALID': 0x80300108,
		'PLA_E_DC_ALREADY_EXISTS': 0x80300109,
		'PLA_E_PLA_CHANNEL_NOT_ENABLED': 0x80300110,
		'PLA_E_TASKSCHED_CHANNEL_NOT_ENABLED': 0x80300111,
		'FVE_E_LOCKED_VOLUME': 0x80310000,
		'FVE_E_NOT_ENCRYPTED': 0x80310001,
		'FVE_E_NO_TPM_BIOS': 0x80310002,
		'FVE_E_NO_MBR_METRIC': 0x80310003,
		'FVE_E_NO_BOOTSECTOR_METRIC': 0x80310004,
		'FVE_E_NO_BOOTMGR_METRIC': 0x80310005,
		'FVE_E_WRONG_BOOTMGR': 0x80310006,
		'FVE_E_SECURE_KEY_REQUIRED': 0x80310007,
		'FVE_E_NOT_ACTIVATED': 0x80310008,
		'FVE_E_ACTION_NOT_ALLOWED': 0x80310009,
		'FVE_E_BAD_INFORMATION': 0x80310010,
		'FVE_E_TOO_SMALL': 0x80310011,
		'FVE_E_SYSTEM_VOLUME': 0x80310012,
		'FVE_E_FAILED_WRONG_FS': 0x80310013,
		'FVE_E_FAILED_BAD_FS': 0x80310014,
		'FVE_E_NOT_SUPPORTED': 0x80310015,
		'FVE_E_BAD_DATA': 0x80310016,
		'FVE_E_VOLUME_NOT_BOUND': 0x80310017,
		'FVE_E_TPM_NOT_OWNED': 0x80310018,
		'FVE_E_NOT_DATA_VOLUME': 0x80310019,
		'FVE_E_OS_NOT_PROTECTED': 0x80310020,
		'FVE_E_PROTECTION_DISABLED': 0x80310021,
		'FVE_E_RECOVERY_KEY_REQUIRED': 0x80310022,
		'FVE_E_FOREIGN_VOLUME': 0x80310023,
		'FVE_E_OVERLAPPED_UPDATE': 0x80310024,
		'FVE_E_TPM_SRK_AUTH_NOT_ZERO': 0x80310025,
		'FVE_E_FAILED_SECTOR_SIZE': 0x80310026,
		'FVE_E_FAILED_AUTHENTICATION': 0x80310027,
		'FVE_E_NOT_OS_VOLUME': 0x80310028,
		'FVE_E_AUTOUNLOCK_ENABLED': 0x80310029,
		'FVE_E_BOOTABLE_CDDVD': 0x80310030,
		'FVE_E_PROTECTOR_EXISTS': 0x80310031,
		'FVE_E_RELATIVE_PATH': 0x80310032,
		'FWP_E_CALLOUT_NOT_FOUND': 0x80320001,
		'FWP_E_CONDITION_NOT_FOUND': 0x80320002,
		'FWP_E_FILTER_NOT_FOUND': 0x80320003,
		'FWP_E_LAYER_NOT_FOUND': 0x80320004,
		'FWP_E_PROVIDER_NOT_FOUND': 0x80320005,
		'FWP_E_PROVIDER_CONTEXT_NOT_FOUND': 0x80320006,
		'FWP_E_SUBLAYER_NOT_FOUND': 0x80320007,
		'FWP_E_NOT_FOUND': 0x80320008,
		'FWP_E_ALREADY_EXISTS': 0x80320009,
		'FWP_E_SESSION_ABORTED': 0x80320010,
		'FWP_E_INCOMPATIBLE_TXN': 0x80320011,
		'FWP_E_TIMEOUT': 0x80320012,
		'FWP_E_NET_EVENTS_DISABLED': 0x80320013,
		'FWP_E_INCOMPATIBLE_LAYER': 0x80320014,
		'FWP_E_KM_CLIENTS_ONLY': 0x80320015,
		'FWP_E_LIFETIME_MISMATCH': 0x80320016,
		'FWP_E_BUILTIN_OBJECT': 0x80320017,
		'FWP_E_TOO_MANY_BOOTTIME_FILTERS': 0x80320018,
		'FWP_E_NOTIFICATION_DROPPED': 0x80320019,
		'FWP_E_INVALID_RANGE': 0x80320020,
		'FWP_E_INVALID_INTERVAL': 0x80320021,
		'FWP_E_ZERO_LENGTH_ARRAY': 0x80320022,
		'FWP_E_NULL_DISPLAY_NAME': 0x80320023,
		'FWP_E_INVALID_ACTION_TYPE': 0x80320024,
		'FWP_E_INVALID_WEIGHT': 0x80320025,
		'FWP_E_MATCH_TYPE_MISMATCH': 0x80320026,
		'FWP_E_TYPE_MISMATCH': 0x80320027,
		'FWP_E_OUT_OF_BOUNDS': 0x80320028,
		'FWP_E_RESERVED': 0x80320029,
		'FWP_E_INCOMPATIBLE_AUTH_METHOD': 0x80320030,
		'FWP_E_INCOMPATIBLE_DH_GROUP': 0x80320031,
		'FWP_E_EM_NOT_SUPPORTED': 0x80320032,
		'FWP_E_NEVER_MATCH': 0x80320033,
		'FWP_E_PROVIDER_CONTEXT_MISMATCH': 0x80320034,
		'FWP_E_INVALID_PARAMETER': 0x80320035,
		'FWP_E_TOO_MANY_SUBLAYERS': 0x80320036,
		'FWP_E_CALLOUT_NOTIFICATION_FAILED': 0x80320037,
		'FWP_E_INCOMPATIBLE_AUTH_CONFIG': 0x80320038,
		'FWP_E_INCOMPATIBLE_CIPHER_CONFIG': 0x80320039,
		'ERROR_NDIS_INTERFACE_CLOSING': 0x80340002,
		'ERROR_NDIS_BAD_VERSION': 0x80340004,
		'ERROR_NDIS_BAD_CHARACTERISTICS': 0x80340005,
		'ERROR_NDIS_ADAPTER_NOT_FOUND': 0x80340006,
		'ERROR_NDIS_OPEN_FAILED': 0x80340007,
		'ERROR_NDIS_DEVICE_FAILED': 0x80340008,
		'ERROR_NDIS_MULTICAST_FULL': 0x80340009,
		'ERROR_NDIS_INVALID_DEVICE_REQUEST': 0x80340010,
		'ERROR_NDIS_ADAPTER_NOT_READY': 0x80340011,
		'ERROR_NDIS_INVALID_LENGTH': 0x80340014,
		'ERROR_NDIS_INVALID_DATA': 0x80340015,
		'ERROR_NDIS_BUFFER_TOO_SHORT': 0x80340016,
		'ERROR_NDIS_INVALID_OID': 0x80340017,
		'ERROR_NDIS_ADAPTER_REMOVED': 0x80340018,
		'ERROR_NDIS_UNSUPPORTED_MEDIA': 0x80340019,
		'ERROR_NDIS_INVALID_ADDRESS': 0x80340022,
		'ERROR_NDIS_DOT11_AUTO_CONFIG_ENABLED': 0x80342000,
		'ERROR_NDIS_DOT11_MEDIA_IN_USE': 0x80342001,
		'ERROR_NDIS_DOT11_POWER_STATE_INVALID': 0x80342002
	},
	Win32Err: {
		'ERROR_SUCCESS': 0x00000000,
		'NERR_Success': 0x00000000,
		'ERROR_INVALID_FUNCTION': 0x00000001,
		'ERROR_FILE_NOT_FOUND': 0x00000002,
		'ERROR_PATH_NOT_FOUND': 0x00000003,
		'ERROR_TOO_MANY_OPEN_FILES': 0x00000004,
		'ERROR_ACCESS_DENIED': 0x00000005,
		'ERROR_INVALID_HANDLE': 0x00000006,
		'ERROR_ARENA_TRASHED': 0x00000007,
		'ERROR_NOT_ENOUGH_MEMORY': 0x00000008,
		'ERROR_INVALID_BLOCK': 0x00000009,
		'ERROR_BAD_ENVIRONMENT': 0x0000000A,
		'ERROR_BAD_FORMAT': 0x0000000B,
		'ERROR_INVALID_ACCESS': 0x0000000C,
		'ERROR_INVALID_DATA': 0x0000000D,
		'ERROR_OUTOFMEMORY': 0x0000000E,
		'ERROR_INVALID_DRIVE': 0x0000000F,
		'ERROR_CURRENT_DIRECTORY': 0x00000010,
		'ERROR_NOT_SAME_DEVICE': 0x00000011,
		'ERROR_NO_MORE_FILES': 0x00000012,
		'ERROR_WRITE_PROTECT': 0x00000013,
		'ERROR_BAD_UNIT': 0x00000014,
		'ERROR_NOT_READY': 0x00000015,
		'ERROR_BAD_COMMAND': 0x00000016,
		'ERROR_CRC': 0x00000017,
		'ERROR_BAD_LENGTH': 0x00000018,
		'ERROR_SEEK': 0x00000019,
		'ERROR_NOT_DOS_DISK': 0x0000001A,
		'ERROR_SECTOR_NOT_FOUND': 0x0000001B,
		'ERROR_OUT_OF_PAPER': 0x0000001C,
		'ERROR_WRITE_FAULT': 0x0000001D,
		'ERROR_READ_FAULT': 0x0000001E,
		'ERROR_GEN_FAILURE': 0x0000001F,
		'ERROR_SHARING_VIOLATION': 0x00000020,
		'ERROR_LOCK_VIOLATION': 0x00000021,
		'ERROR_WRONG_DISK': 0x00000022,
		'ERROR_SHARING_BUFFER_EXCEEDED': 0x00000024,
		'ERROR_HANDLE_EOF': 0x00000026,
		'ERROR_HANDLE_DISK_FULL': 0x00000027,
		'ERROR_NOT_SUPPORTED': 0x00000032,
		'ERROR_REM_NOT_LIST': 0x00000033,
		'ERROR_DUP_NAME': 0x00000034,
		'ERROR_BAD_NETPATH': 0x00000035,
		'ERROR_NETWORK_BUSY': 0x00000036,
		'ERROR_DEV_NOT_EXIST': 0x00000037,
		'ERROR_TOO_MANY_CMDS': 0x00000038,
		'ERROR_ADAP_HDW_ERR': 0x00000039,
		'ERROR_BAD_NET_RESP': 0x0000003A,
		'ERROR_UNEXP_NET_ERR': 0x0000003B,
		'ERROR_BAD_REM_ADAP': 0x0000003C,
		'ERROR_PRINTQ_FULL': 0x0000003D,
		'ERROR_NO_SPOOL_SPACE': 0x0000003E,
		'ERROR_PRINT_CANCELLED': 0x0000003F,
		'ERROR_NETNAME_DELETED': 0x00000040,
		'ERROR_NETWORK_ACCESS_DENIED': 0x00000041,
		'ERROR_BAD_DEV_TYPE': 0x00000042,
		'ERROR_BAD_NET_NAME': 0x00000043,
		'ERROR_TOO_MANY_NAMES': 0x00000044,
		'ERROR_TOO_MANY_SESS': 0x00000045,
		'ERROR_SHARING_PAUSED': 0x00000046,
		'ERROR_REQ_NOT_ACCEP': 0x00000047,
		'ERROR_REDIR_PAUSED': 0x00000048,
		'ERROR_FILE_EXISTS': 0x00000050,
		'ERROR_CANNOT_MAKE': 0x00000052,
		'ERROR_FAIL_I24': 0x00000053,
		'ERROR_OUT_OF_STRUCTURES': 0x00000054,
		'ERROR_ALREADY_ASSIGNED': 0x00000055,
		'ERROR_INVALID_PASSWORD': 0x00000056,
		'ERROR_INVALID_PARAMETER': 0x00000057,
		'ERROR_NET_WRITE_FAULT': 0x00000058,
		'ERROR_NO_PROC_SLOTS': 0x00000059,
		'ERROR_TOO_MANY_SEMAPHORES': 0x00000064,
		'ERROR_EXCL_SEM_ALREADY_OWNED': 0x00000065,
		'ERROR_SEM_IS_SET': 0x00000066,
		'ERROR_TOO_MANY_SEM_REQUESTS': 0x00000067,
		'ERROR_INVALID_AT_INTERRUPT_TIME': 0x00000068,
		'ERROR_SEM_OWNER_DIED': 0x00000069,
		'ERROR_SEM_USER_LIMIT': 0x0000006A,
		'ERROR_DISK_CHANGE': 0x0000006B,
		'ERROR_DRIVE_LOCKED': 0x0000006C,
		'ERROR_BROKEN_PIPE': 0x0000006D,
		'ERROR_OPEN_FAILED': 0x0000006E,
		'ERROR_BUFFER_OVERFLOW': 0x0000006F,
		'ERROR_DISK_FULL': 0x00000070,
		'ERROR_NO_MORE_SEARCH_HANDLES': 0x00000071,
		'ERROR_INVALID_TARGET_HANDLE': 0x00000072,
		'ERROR_INVALID_CATEGORY': 0x00000075,
		'ERROR_INVALID_VERIFY_SWITCH': 0x00000076,
		'ERROR_BAD_DRIVER_LEVEL': 0x00000077,
		'ERROR_CALL_NOT_IMPLEMENTED': 0x00000078,
		'ERROR_SEM_TIMEOUT': 0x00000079,
		'ERROR_INSUFFICIENT_BUFFER': 0x0000007A,
		'ERROR_INVALID_NAME': 0x0000007B,
		'ERROR_INVALID_LEVEL': 0x0000007C,
		'ERROR_NO_VOLUME_LABEL': 0x0000007D,
		'ERROR_MOD_NOT_FOUND': 0x0000007E,
		'ERROR_PROC_NOT_FOUND': 0x0000007F,
		'ERROR_WAIT_NO_CHILDREN': 0x00000080,
		'ERROR_CHILD_NOT_COMPLETE': 0x00000081,
		'ERROR_DIRECT_ACCESS_HANDLE': 0x00000082,
		'ERROR_NEGATIVE_SEEK': 0x00000083,
		'ERROR_SEEK_ON_DEVICE': 0x00000084,
		'ERROR_IS_JOIN_TARGET': 0x00000085,
		'ERROR_IS_JOINED': 0x00000086,
		'ERROR_IS_SUBSTED': 0x00000087,
		'ERROR_NOT_JOINED': 0x00000088,
		'ERROR_NOT_SUBSTED': 0x00000089,
		'ERROR_JOIN_TO_JOIN': 0x0000008A,
		'ERROR_SUBST_TO_SUBST': 0x0000008B,
		'ERROR_JOIN_TO_SUBST': 0x0000008C,
		'ERROR_SUBST_TO_JOIN': 0x0000008D,
		'ERROR_BUSY_DRIVE': 0x0000008E,
		'ERROR_SAME_DRIVE': 0x0000008F,
		'ERROR_DIR_NOT_ROOT': 0x00000090,
		'ERROR_DIR_NOT_EMPTY': 0x00000091,
		'ERROR_IS_SUBST_PATH': 0x00000092,
		'ERROR_IS_JOIN_PATH': 0x00000093,
		'ERROR_PATH_BUSY': 0x00000094,
		'ERROR_IS_SUBST_TARGET': 0x00000095,
		'ERROR_SYSTEM_TRACE': 0x00000096,
		'ERROR_INVALID_EVENT_COUNT': 0x00000097,
		'ERROR_TOO_MANY_MUXWAITERS': 0x00000098,
		'ERROR_INVALID_LIST_FORMAT': 0x00000099,
		'ERROR_LABEL_TOO_LONG': 0x0000009A,
		'ERROR_TOO_MANY_TCBS': 0x0000009B,
		'ERROR_SIGNAL_REFUSED': 0x0000009C,
		'ERROR_DISCARDED': 0x0000009D,
		'ERROR_NOT_LOCKED': 0x0000009E,
		'ERROR_BAD_THREADID_ADDR': 0x0000009F,
		'ERROR_BAD_ARGUMENTS': 0x000000A0,
		'ERROR_BAD_PATHNAME': 0x000000A1,
		'ERROR_SIGNAL_PENDING': 0x000000A2,
		'ERROR_MAX_THRDS_REACHED': 0x000000A4,
		'ERROR_LOCK_FAILED': 0x000000A7,
		'ERROR_BUSY': 0x000000AA,
		'ERROR_CANCEL_VIOLATION': 0x000000AD,
		'ERROR_ATOMIC_LOCKS_NOT_SUPPORTED': 0x000000AE,
		'ERROR_INVALID_SEGMENT_NUMBER': 0x000000B4,
		'ERROR_INVALID_ORDINAL': 0x000000B6,
		'ERROR_ALREADY_EXISTS': 0x000000B7,
		'ERROR_INVALID_FLAG_NUMBER': 0x000000BA,
		'ERROR_SEM_NOT_FOUND': 0x000000BB,
		'ERROR_INVALID_STARTING_CODESEG': 0x000000BC,
		'ERROR_INVALID_STACKSEG': 0x000000BD,
		'ERROR_INVALID_MODULETYPE': 0x000000BE,
		'ERROR_INVALID_EXE_SIGNATURE': 0x000000BF,
		'ERROR_EXE_MARKED_INVALID': 0x000000C0,
		'ERROR_BAD_EXE_FORMAT': 0x000000C1,
		'ERROR_ITERATED_DATA_EXCEEDS_64k': 0x000000C2,
		'ERROR_INVALID_MINALLOCSIZE': 0x000000C3,
		'ERROR_DYNLINK_FROM_INVALID_RING': 0x000000C4,
		'ERROR_IOPL_NOT_ENABLED': 0x000000C5,
		'ERROR_INVALID_SEGDPL': 0x000000C6,
		'ERROR_AUTODATASEG_EXCEEDS_64k': 0x000000C7,
		'ERROR_RING2SEG_MUST_BE_MOVABLE': 0x000000C8,
		'ERROR_RELOC_CHAIN_XEEDS_SEGLIM': 0x000000C9,
		'ERROR_INFLOOP_IN_RELOC_CHAIN': 0x000000CA,
		'ERROR_ENVVAR_NOT_FOUND': 0x000000CB,
		'ERROR_NO_SIGNAL_SENT': 0x000000CD,
		'ERROR_FILENAME_EXCED_RANGE': 0x000000CE,
		'ERROR_RING2_STACK_IN_USE': 0x000000CF,
		'ERROR_META_EXPANSION_TOO_LONG': 0x000000D0,
		'ERROR_INVALID_SIGNAL_NUMBER': 0x000000D1,
		'ERROR_THREAD_1_INACTIVE': 0x000000D2,
		'ERROR_LOCKED': 0x000000D4,
		'ERROR_TOO_MANY_MODULES': 0x000000D6,
		'ERROR_NESTING_NOT_ALLOWED': 0x000000D7,
		'ERROR_EXE_MACHINE_TYPE_MISMATCH': 0x000000D8,
		'ERROR_EXE_CANNOT_MODIFY_SIGNED_BINARY': 0x000000D9,
		'ERROR_EXE_CANNOT_MODIFY_STRONG_SIGNED_BINARY': 0x000000DA,
		'ERROR_FILE_CHECKED_OUT': 0x000000DC,
		'ERROR_CHECKOUT_REQUIRED': 0x000000DD,
		'ERROR_BAD_FILE_TYPE': 0x000000DE,
		'ERROR_FILE_TOO_LARGE': 0x000000DF,
		'ERROR_FORMS_AUTH_REQUIRED': 0x000000E0,
		'ERROR_VIRUS_INFECTED': 0x000000E1,
		'ERROR_VIRUS_DELETED': 0x000000E2,
		'ERROR_PIPE_LOCAL': 0x000000E5,
		'ERROR_BAD_PIPE': 0x000000E6,
		'ERROR_PIPE_BUSY': 0x000000E7,
		'ERROR_NO_DATA': 0x000000E8,
		'ERROR_PIPE_NOT_CONNECTED': 0x000000E9,
		'ERROR_MORE_DATA': 0x000000EA,
		'ERROR_VC_DISCONNECTED': 0x000000F0,
		'ERROR_INVALID_EA_NAME': 0x000000FE,
		'ERROR_EA_LIST_INCONSISTENT': 0x000000FF,
		'WAIT_TIMEOUT': 0x00000102,
		'ERROR_NO_MORE_ITEMS': 0x00000103,
		'ERROR_CANNOT_COPY': 0x0000010A,
		'ERROR_DIRECTORY': 0x0000010B,
		'ERROR_EAS_DIDNT_FIT': 0x00000113,
		'ERROR_EA_FILE_CORRUPT': 0x00000114,
		'ERROR_EA_TABLE_FULL': 0x00000115,
		'ERROR_INVALID_EA_HANDLE': 0x00000116,
		'ERROR_EAS_NOT_SUPPORTED': 0x0000011A,
		'ERROR_NOT_OWNER': 0x00000120,
		'ERROR_TOO_MANY_POSTS': 0x0000012A,
		'ERROR_PARTIAL_COPY': 0x0000012B,
		'ERROR_OPLOCK_NOT_GRANTED': 0x0000012C,
		'ERROR_INVALID_OPLOCK_PROTOCOL': 0x0000012D,
		'ERROR_DISK_TOO_FRAGMENTED': 0x0000012E,
		'ERROR_DELETE_PENDING': 0x0000012F,
		'ERROR_MR_MID_NOT_FOUND': 0x0000013D,
		'ERROR_SCOPE_NOT_FOUND': 0x0000013E,
		'ERROR_FAIL_NOACTION_REBOOT': 0x0000015E,
		'ERROR_FAIL_SHUTDOWN': 0x0000015F,
		'ERROR_FAIL_RESTART': 0x00000160,
		'ERROR_MAX_SESSIONS_REACHED': 0x00000161,
		'ERROR_THREAD_MODE_ALREADY_BACKGROUND': 0x00000190,
		'ERROR_THREAD_MODE_NOT_BACKGROUND': 0x00000191,
		'ERROR_PROCESS_MODE_ALREADY_BACKGROUND': 0x00000192,
		'ERROR_PROCESS_MODE_NOT_BACKGROUND': 0x00000193,
		'ERROR_INVALID_ADDRESS': 0x000001E7,
		'ERROR_USER_PROFILE_LOAD': 0x000001F4,
		'ERROR_ARITHMETIC_OVERFLOW': 0x00000216,
		'ERROR_PIPE_CONNECTED': 0x00000217,
		'ERROR_PIPE_LISTENING': 0x00000218,
		'ERROR_VERIFIER_STOP': 0x00000219,
		'ERROR_ABIOS_ERROR': 0x0000021A,
		'ERROR_WX86_WARNING': 0x0000021B,
		'ERROR_WX86_ERROR': 0x0000021C,
		'ERROR_TIMER_NOT_CANCELED': 0x0000021D,
		'ERROR_UNWIND': 0x0000021E,
		'ERROR_BAD_STACK': 0x0000021F,
		'ERROR_INVALID_UNWIND_TARGET': 0x00000220,
		'ERROR_INVALID_PORT_ATTRIBUTES': 0x00000221,
		'ERROR_PORT_MESSAGE_TOO_LONG': 0x00000222,
		'ERROR_INVALID_QUOTA_LOWER': 0x00000223,
		'ERROR_DEVICE_ALREADY_ATTACHED': 0x00000224,
		'ERROR_INSTRUCTION_MISALIGNMENT': 0x00000225,
		'ERROR_PROFILING_NOT_STARTED': 0x00000226,
		'ERROR_PROFILING_NOT_STOPPED': 0x00000227,
		'ERROR_COULD_NOT_INTERPRET': 0x00000228,
		'ERROR_PROFILING_AT_LIMIT': 0x00000229,
		'ERROR_CANT_WAIT': 0x0000022A,
		'ERROR_CANT_TERMINATE_SELF': 0x0000022B,
		'ERROR_UNEXPECTED_MM_CREATE_ERR': 0x0000022C,
		'ERROR_UNEXPECTED_MM_MAP_ERROR': 0x0000022D,
		'ERROR_UNEXPECTED_MM_EXTEND_ERR': 0x0000022E,
		'ERROR_BAD_FUNCTION_TABLE': 0x0000022F,
		'ERROR_NO_GUID_TRANSLATION': 0x00000230,
		'ERROR_INVALID_LDT_SIZE': 0x00000231,
		'ERROR_INVALID_LDT_OFFSET': 0x00000233,
		'ERROR_INVALID_LDT_DESCRIPTOR': 0x00000234,
		'ERROR_TOO_MANY_THREADS': 0x00000235,
		'ERROR_THREAD_NOT_IN_PROCESS': 0x00000236,
		'ERROR_PAGEFILE_QUOTA_EXCEEDED': 0x00000237,
		'ERROR_LOGON_SERVER_CONFLICT': 0x00000238,
		'ERROR_SYNCHRONIZATION_REQUIRED': 0x00000239,
		'ERROR_NET_OPEN_FAILED': 0x0000023A,
		'ERROR_IO_PRIVILEGE_FAILED': 0x0000023B,
		'ERROR_CONTROL_C_EXIT': 0x0000023C,
		'ERROR_MISSING_SYSTEMFILE': 0x0000023D,
		'ERROR_UNHANDLED_EXCEPTION': 0x0000023E,
		'ERROR_APP_INIT_FAILURE': 0x0000023F,
		'ERROR_PAGEFILE_CREATE_FAILED': 0x00000240,
		'ERROR_INVALID_IMAGE_HASH': 0x00000241,
		'ERROR_NO_PAGEFILE': 0x00000242,
		'ERROR_ILLEGAL_FLOAT_CONTEXT': 0x00000243,
		'ERROR_NO_EVENT_PAIR': 0x00000244,
		'ERROR_DOMAIN_CTRLR_CONFIG_ERROR': 0x00000245,
		'ERROR_ILLEGAL_CHARACTER': 0x00000246,
		'ERROR_UNDEFINED_CHARACTER': 0x00000247,
		'ERROR_FLOPPY_VOLUME': 0x00000248,
		'ERROR_BIOS_FAILED_TO_CONNECT_INTERRUPT': 0x00000249,
		'ERROR_BACKUP_CONTROLLER': 0x0000024A,
		'ERROR_MUTANT_LIMIT_EXCEEDED': 0x0000024B,
		'ERROR_FS_DRIVER_REQUIRED': 0x0000024C,
		'ERROR_CANNOT_LOAD_REGISTRY_FILE': 0x0000024D,
		'ERROR_DEBUG_ATTACH_FAILED': 0x0000024E,
		'ERROR_SYSTEM_PROCESS_TERMINATED': 0x0000024F,
		'ERROR_DATA_NOT_ACCEPTED': 0x00000250,
		'ERROR_VDM_HARD_ERROR': 0x00000251,
		'ERROR_DRIVER_CANCEL_TIMEOUT': 0x00000252,
		'ERROR_REPLY_MESSAGE_MISMATCH': 0x00000253,
		'ERROR_LOST_WRITEBEHIND_DATA': 0x00000254,
		'ERROR_CLIENT_SERVER_PARAMETERS_INVALID': 0x00000255,
		'ERROR_NOT_TINY_STREAM': 0x00000256,
		'ERROR_STACK_OVERFLOW_READ': 0x00000257,
		'ERROR_CONVERT_TO_LARGE': 0x00000258,
		'ERROR_FOUND_OUT_OF_SCOPE': 0x00000259,
		'ERROR_ALLOCATE_BUCKET': 0x0000025A,
		'ERROR_MARSHALL_OVERFLOW': 0x0000025B,
		'ERROR_INVALID_VARIANT': 0x0000025C,
		'ERROR_BAD_COMPRESSION_BUFFER': 0x0000025D,
		'ERROR_AUDIT_FAILED': 0x0000025E,
		'ERROR_TIMER_RESOLUTION_NOT_SET': 0x0000025F,
		'ERROR_INSUFFICIENT_LOGON_INFO': 0x00000260,
		'ERROR_BAD_DLL_ENTRYPOINT': 0x00000261,
		'ERROR_BAD_SERVICE_ENTRYPOINT': 0x00000262,
		'ERROR_IP_ADDRESS_CONFLICT1': 0x00000263,
		'ERROR_IP_ADDRESS_CONFLICT2': 0x00000264,
		'ERROR_REGISTRY_QUOTA_LIMIT': 0x00000265,
		'ERROR_NO_CALLBACK_ACTIVE': 0x00000266,
		'ERROR_PWD_TOO_SHORT': 0x00000267,
		'ERROR_PWD_TOO_RECENT': 0x00000268,
		'ERROR_PWD_HISTORY_CONFLICT': 0x00000269,
		'ERROR_UNSUPPORTED_COMPRESSION': 0x0000026A,
		'ERROR_INVALID_HW_PROFILE': 0x0000026B,
		'ERROR_INVALID_PLUGPLAY_DEVICE_PATH': 0x0000026C,
		'ERROR_QUOTA_LIST_INCONSISTENT': 0x0000026D,
		'ERROR_EVALUATION_EXPIRATION': 0x0000026E,
		'ERROR_ILLEGAL_DLL_RELOCATION': 0x0000026F,
		'ERROR_DLL_INIT_FAILED_LOGOFF': 0x00000270,
		'ERROR_VALIDATE_CONTINUE': 0x00000271,
		'ERROR_NO_MORE_MATCHES': 0x00000272,
		'ERROR_RANGE_LIST_CONFLICT': 0x00000273,
		'ERROR_SERVER_SID_MISMATCH': 0x00000274,
		'ERROR_CANT_ENABLE_DENY_ONLY': 0x00000275,
		'ERROR_FLOAT_MULTIPLE_FAULTS': 0x00000276,
		'ERROR_FLOAT_MULTIPLE_TRAPS': 0x00000277,
		'ERROR_NOINTERFACE': 0x00000278,
		'ERROR_DRIVER_FAILED_SLEEP': 0x00000279,
		'ERROR_CORRUPT_SYSTEM_FILE': 0x0000027A,
		'ERROR_COMMITMENT_MINIMUM': 0x0000027B,
		'ERROR_PNP_RESTART_ENUMERATION': 0x0000027C,
		'ERROR_SYSTEM_IMAGE_BAD_SIGNATURE': 0x0000027D,
		'ERROR_PNP_REBOOT_REQUIRED': 0x0000027E,
		'ERROR_INSUFFICIENT_POWER': 0x0000027F,
		'ERROR_SYSTEM_SHUTDOWN': 0x00000281,
		'ERROR_PORT_NOT_SET': 0x00000282,
		'ERROR_DS_VERSION_CHECK_FAILURE': 0x00000283,
		'ERROR_RANGE_NOT_FOUND': 0x00000284,
		'ERROR_NOT_SAFE_MODE_DRIVER': 0x00000286,
		'ERROR_FAILED_DRIVER_ENTRY': 0x00000287,
		'ERROR_DEVICE_ENUMERATION_ERROR': 0x00000288,
		'ERROR_MOUNT_POINT_NOT_RESOLVED': 0x00000289,
		'ERROR_INVALID_DEVICE_OBJECT_PARAMETER': 0x0000028A,
		'ERROR_MCA_OCCURED': 0x0000028B,
		'ERROR_DRIVER_DATABASE_ERROR': 0x0000028C,
		'ERROR_SYSTEM_HIVE_TOO_LARGE': 0x0000028D,
		'ERROR_DRIVER_FAILED_PRIOR_UNLOAD': 0x0000028E,
		'ERROR_VOLSNAP_PREPARE_HIBERNATE': 0x0000028F,
		'ERROR_HIBERNATION_FAILURE': 0x00000290,
		'ERROR_FILE_SYSTEM_LIMITATION': 0x00000299,
		'ERROR_ASSERTION_FAILURE': 0x0000029C,
		'ERROR_ACPI_ERROR': 0x0000029D,
		'ERROR_WOW_ASSERTION': 0x0000029E,
		'ERROR_PNP_BAD_MPS_TABLE': 0x0000029F,
		'ERROR_PNP_TRANSLATION_FAILED': 0x000002A0,
		'ERROR_PNP_IRQ_TRANSLATION_FAILED': 0x000002A1,
		'ERROR_PNP_INVALID_ID': 0x000002A2,
		'ERROR_WAKE_SYSTEM_DEBUGGER': 0x000002A3,
		'ERROR_HANDLES_CLOSED': 0x000002A4,
		'ERROR_EXTRANEOUS_INFORMATION': 0x000002A5,
		'ERROR_RXACT_COMMIT_NECESSARY': 0x000002A6,
		'ERROR_MEDIA_CHECK': 0x000002A7,
		'ERROR_GUID_SUBSTITUTION_MADE': 0x000002A8,
		'ERROR_STOPPED_ON_SYMLINK': 0x000002A9,
		'ERROR_LONGJUMP': 0x000002AA,
		'ERROR_PLUGPLAY_QUERY_VETOED': 0x000002AB,
		'ERROR_UNWIND_CONSOLIDATE': 0x000002AC,
		'ERROR_REGISTRY_HIVE_RECOVERED': 0x000002AD,
		'ERROR_DLL_MIGHT_BE_INSECURE': 0x000002AE,
		'ERROR_DLL_MIGHT_BE_INCOMPATIBLE': 0x000002AF,
		'ERROR_DBG_EXCEPTION_NOT_HANDLED': 0x000002B0,
		'ERROR_DBG_REPLY_LATER': 0x000002B1,
		'ERROR_DBG_UNABLE_TO_PROVIDE_HANDLE': 0x000002B2,
		'ERROR_DBG_TERMINATE_THREAD': 0x000002B3,
		'ERROR_DBG_TERMINATE_PROCESS': 0x000002B4,
		'ERROR_DBG_CONTROL_C': 0x000002B5,
		'ERROR_DBG_PRINTEXCEPTION_C': 0x000002B6,
		'ERROR_DBG_RIPEXCEPTION': 0x000002B7,
		'ERROR_DBG_CONTROL_BREAK': 0x000002B8,
		'ERROR_DBG_COMMAND_EXCEPTION': 0x000002B9,
		'ERROR_OBJECT_NAME_EXISTS': 0x000002BA,
		'ERROR_THREAD_WAS_SUSPENDED': 0x000002BB,
		'ERROR_IMAGE_NOT_AT_BASE': 0x000002BC,
		'ERROR_RXACT_STATE_CREATED': 0x000002BD,
		'ERROR_SEGMENT_NOTIFICATION': 0x000002BE,
		'ERROR_BAD_CURRENT_DIRECTORY': 0x000002BF,
		'ERROR_FT_READ_RECOVERY_FROM_BACKUP': 0x000002C0,
		'ERROR_FT_WRITE_RECOVERY': 0x000002C1,
		'ERROR_IMAGE_MACHINE_TYPE_MISMATCH': 0x000002C2,
		'ERROR_RECEIVE_PARTIAL': 0x000002C3,
		'ERROR_RECEIVE_EXPEDITED': 0x000002C4,
		'ERROR_RECEIVE_PARTIAL_EXPEDITED': 0x000002C5,
		'ERROR_EVENT_DONE': 0x000002C6,
		'ERROR_EVENT_PENDING': 0x000002C7,
		'ERROR_CHECKING_FILE_SYSTEM': 0x000002C8,
		'ERROR_FATAL_APP_EXIT': 0x000002C9,
		'ERROR_PREDEFINED_HANDLE': 0x000002CA,
		'ERROR_WAS_UNLOCKED': 0x000002CB,
		'ERROR_WAS_LOCKED': 0x000002CD,
		'ERROR_ALREADY_WIN32': 0x000002CF,
		'ERROR_IMAGE_MACHINE_TYPE_MISMATCH_EXE': 0x000002D0,
		'ERROR_NO_YIELD_PERFORMED': 0x000002D1,
		'ERROR_TIMER_RESUME_IGNORED': 0x000002D2,
		'ERROR_ARBITRATION_UNHANDLED': 0x000002D3,
		'ERROR_CARDBUS_NOT_SUPPORTED': 0x000002D4,
		'ERROR_MP_PROCESSOR_MISMATCH': 0x000002D5,
		'ERROR_HIBERNATED': 0x000002D6,
		'ERROR_RESUME_HIBERNATION': 0x000002D7,
		'ERROR_FIRMWARE_UPDATED': 0x000002D8,
		'ERROR_DRIVERS_LEAKING_LOCKED_PAGES': 0x000002D9,
		'ERROR_WAKE_SYSTEM': 0x000002DA,
		'ERROR_ABANDONED_WAIT_0': 0x000002DF,
		'ERROR_ELEVATION_REQUIRED': 0x000002E4,
		'ERROR_REPARSE': 0x000002E5,
		'ERROR_OPLOCK_BREAK_IN_PROGRESS': 0x000002E6,
		'ERROR_VOLUME_MOUNTED': 0x000002E7,
		'ERROR_RXACT_COMMITTED': 0x000002E8,
		'ERROR_NOTIFY_CLEANUP': 0x000002E9,
		'ERROR_PRIMARY_TRANSPORT_CONNECT_FAILED': 0x000002EA,
		'ERROR_PAGE_FAULT_TRANSITION': 0x000002EB,
		'ERROR_PAGE_FAULT_DEMAND_ZERO': 0x000002EC,
		'ERROR_PAGE_FAULT_COPY_ON_WRITE': 0x000002ED,
		'ERROR_PAGE_FAULT_GUARD_PAGE': 0x000002EE,
		'ERROR_PAGE_FAULT_PAGING_FILE': 0x000002EF,
		'ERROR_CACHE_PAGE_LOCKED': 0x000002F0,
		'ERROR_CRASH_DUMP': 0x000002F1,
		'ERROR_BUFFER_ALL_ZEROS': 0x000002F2,
		'ERROR_REPARSE_OBJECT': 0x000002F3,
		'ERROR_RESOURCE_REQUIREMENTS_CHANGED': 0x000002F4,
		'ERROR_TRANSLATION_COMPLETE': 0x000002F5,
		'ERROR_NOTHING_TO_TERMINATE': 0x000002F6,
		'ERROR_PROCESS_NOT_IN_JOB': 0x000002F7,
		'ERROR_PROCESS_IN_JOB': 0x000002F8,
		'ERROR_VOLSNAP_HIBERNATE_READY': 0x000002F9,
		'ERROR_FSFILTER_OP_COMPLETED_SUCCESSFULLY': 0x000002FA,
		'ERROR_INTERRUPT_VECTOR_ALREADY_CONNECTED': 0x000002FB,
		'ERROR_INTERRUPT_STILL_CONNECTED': 0x000002FC,
		'ERROR_WAIT_FOR_OPLOCK': 0x000002FD,
		'ERROR_DBG_EXCEPTION_HANDLED': 0x000002FE,
		'ERROR_DBG_CONTINUE': 0x000002FF,
		'ERROR_CALLBACK_POP_STACK': 0x00000300,
		'ERROR_COMPRESSION_DISABLED': 0x00000301,
		'ERROR_CANTFETCHBACKWARDS': 0x00000302,
		'ERROR_CANTSCROLLBACKWARDS': 0x00000303,
		'ERROR_ROWSNOTRELEASED': 0x00000304,
		'ERROR_BAD_ACCESSOR_FLAGS': 0x00000305,
		'ERROR_ERRORS_ENCOUNTERED': 0x00000306,
		'ERROR_NOT_CAPABLE': 0x00000307,
		'ERROR_REQUEST_OUT_OF_SEQUENCE': 0x00000308,
		'ERROR_VERSION_PARSE_ERROR': 0x00000309,
		'ERROR_BADSTARTPOSITION': 0x0000030A,
		'ERROR_MEMORY_HARDWARE': 0x0000030B,
		'ERROR_DISK_REPAIR_DISABLED': 0x0000030C,
		'ERROR_INSUFFICIENT_RESOURCE_FOR_SPECIFIED_SHARED_SECTION_SIZE': 0x0000030D,
		'ERROR_SYSTEM_POWERSTATE_TRANSITION': 0x0000030E,
		'ERROR_SYSTEM_POWERSTATE_COMPLEX_TRANSITION': 0x0000030F,
		'ERROR_MCA_EXCEPTION': 0x00000310,
		'ERROR_ACCESS_AUDIT_BY_POLICY': 0x00000311,
		'ERROR_ACCESS_DISABLED_NO_SAFER_UI_BY_POLICY': 0x00000312,
		'ERROR_ABANDON_HIBERFILE': 0x00000313,
		'ERROR_LOST_WRITEBEHIND_DATA_NETWORK_DISCONNECTED': 0x00000314,
		'ERROR_LOST_WRITEBEHIND_DATA_NETWORK_SERVER_ERROR': 0x00000315,
		'ERROR_LOST_WRITEBEHIND_DATA_LOCAL_DISK_ERROR': 0x00000316,
		'ERROR_EA_ACCESS_DENIED': 0x000003E2,
		'ERROR_OPERATION_ABORTED': 0x000003E3,
		'ERROR_IO_INCOMPLETE': 0x000003E4,
		'ERROR_IO_PENDING': 0x000003E5,
		'ERROR_NOACCESS': 0x000003E6,
		'ERROR_SWAPERROR': 0x000003E7,
		'ERROR_STACK_OVERFLOW': 0x000003E9,
		'ERROR_INVALID_MESSAGE': 0x000003EA,
		'ERROR_CAN_NOT_COMPLETE': 0x000003EB,
		'ERROR_INVALID_FLAGS': 0x000003EC,
		'ERROR_UNRECOGNIZED_VOLUME': 0x000003ED,
		'ERROR_FILE_INVALID': 0x000003EE,
		'ERROR_FULLSCREEN_MODE': 0x000003EF,
		'ERROR_NO_TOKEN': 0x000003F0,
		'ERROR_BADDB': 0x000003F1,
		'ERROR_BADKEY': 0x000003F2,
		'ERROR_CANTOPEN': 0x000003F3,
		'ERROR_CANTREAD': 0x000003F4,
		'ERROR_CANTWRITE': 0x000003F5,
		'ERROR_REGISTRY_RECOVERED': 0x000003F6,
		'ERROR_REGISTRY_CORRUPT': 0x000003F7,
		'ERROR_REGISTRY_IO_FAILED': 0x000003F8,
		'ERROR_NOT_REGISTRY_FILE': 0x000003F9,
		'ERROR_KEY_DELETED': 0x000003FA,
		'ERROR_NO_LOG_SPACE': 0x000003FB,
		'ERROR_KEY_HAS_CHILDREN': 0x000003FC,
		'ERROR_CHILD_MUST_BE_VOLATILE': 0x000003FD,
		'ERROR_NOTIFY_ENUM_DIR': 0x000003FE,
		'ERROR_DEPENDENT_SERVICES_RUNNING': 0x0000041B,
		'ERROR_INVALID_SERVICE_CONTROL': 0x0000041C,
		'ERROR_SERVICE_REQUEST_TIMEOUT': 0x0000041D,
		'ERROR_SERVICE_NO_THREAD': 0x0000041E,
		'ERROR_SERVICE_DATABASE_LOCKED': 0x0000041F,
		'ERROR_SERVICE_ALREADY_RUNNING': 0x00000420,
		'ERROR_INVALID_SERVICE_ACCOUNT': 0x00000421,
		'ERROR_SERVICE_DISABLED': 0x00000422,
		'ERROR_CIRCULAR_DEPENDENCY': 0x00000423,
		'ERROR_SERVICE_DOES_NOT_EXIST': 0x00000424,
		'ERROR_SERVICE_CANNOT_ACCEPT_CTRL': 0x00000425,
		'ERROR_SERVICE_NOT_ACTIVE': 0x00000426,
		'ERROR_FAILED_SERVICE_CONTROLLER_CONNECT': 0x00000427,
		'ERROR_EXCEPTION_IN_SERVICE': 0x00000428,
		'ERROR_DATABASE_DOES_NOT_EXIST': 0x00000429,
		'ERROR_SERVICE_SPECIFIC_ERROR': 0x0000042A,
		'ERROR_PROCESS_ABORTED': 0x0000042B,
		'ERROR_SERVICE_DEPENDENCY_FAIL': 0x0000042C,
		'ERROR_SERVICE_LOGON_FAILED': 0x0000042D,
		'ERROR_SERVICE_START_HANG': 0x0000042E,
		'ERROR_INVALID_SERVICE_LOCK': 0x0000042F,
		'ERROR_SERVICE_MARKED_FOR_DELETE': 0x00000430,
		'ERROR_SERVICE_EXISTS': 0x00000431,
		'ERROR_ALREADY_RUNNING_LKG': 0x00000432,
		'ERROR_SERVICE_DEPENDENCY_DELETED': 0x00000433,
		'ERROR_BOOT_ALREADY_ACCEPTED': 0x00000434,
		'ERROR_SERVICE_NEVER_STARTED': 0x00000435,
		'ERROR_DUPLICATE_SERVICE_NAME': 0x00000436,
		'ERROR_DIFFERENT_SERVICE_ACCOUNT': 0x00000437,
		'ERROR_CANNOT_DETECT_DRIVER_FAILURE': 0x00000438,
		'ERROR_CANNOT_DETECT_PROCESS_ABORT': 0x00000439,
		'ERROR_NO_RECOVERY_PROGRAM': 0x0000043A,
		'ERROR_SERVICE_NOT_IN_EXE': 0x0000043B,
		'ERROR_NOT_SAFEBOOT_SERVICE': 0x0000043C,
		'ERROR_END_OF_MEDIA': 0x0000044C,
		'ERROR_FILEMARK_DETECTED': 0x0000044D,
		'ERROR_BEGINNING_OF_MEDIA': 0x0000044E,
		'ERROR_SETMARK_DETECTED': 0x0000044F,
		'ERROR_NO_DATA_DETECTED': 0x00000450,
		'ERROR_PARTITION_FAILURE': 0x00000451,
		'ERROR_INVALID_BLOCK_LENGTH': 0x00000452,
		'ERROR_DEVICE_NOT_PARTITIONED': 0x00000453,
		'ERROR_UNABLE_TO_LOCK_MEDIA': 0x00000454,
		'ERROR_UNABLE_TO_UNLOAD_MEDIA': 0x00000455,
		'ERROR_MEDIA_CHANGED': 0x00000456,
		'ERROR_BUS_RESET': 0x00000457,
		'ERROR_NO_MEDIA_IN_DRIVE': 0x00000458,
		'ERROR_NO_UNICODE_TRANSLATION': 0x00000459,
		'ERROR_DLL_INIT_FAILED': 0x0000045A,
		'ERROR_SHUTDOWN_IN_PROGRESS': 0x0000045B,
		'ERROR_NO_SHUTDOWN_IN_PROGRESS': 0x0000045C,
		'ERROR_IO_DEVICE': 0x0000045D,
		'ERROR_SERIAL_NO_DEVICE': 0x0000045E,
		'ERROR_IRQ_BUSY': 0x0000045F,
		'ERROR_MORE_WRITES': 0x00000460,
		'ERROR_COUNTER_TIMEOUT': 0x00000461,
		'ERROR_FLOPPY_ID_MARK_NOT_FOUND': 0x00000462,
		'ERROR_FLOPPY_WRONG_CYLINDER': 0x00000463,
		'ERROR_FLOPPY_UNKNOWN_ERROR': 0x00000464,
		'ERROR_FLOPPY_BAD_REGISTERS': 0x00000465,
		'ERROR_DISK_RECALIBRATE_FAILED': 0x00000466,
		'ERROR_DISK_OPERATION_FAILED': 0x00000467,
		'ERROR_DISK_RESET_FAILED': 0x00000468,
		'ERROR_EOM_OVERFLOW': 0x00000469,
		'ERROR_NOT_ENOUGH_SERVER_MEMORY': 0x0000046A,
		'ERROR_POSSIBLE_DEADLOCK': 0x0000046B,
		'ERROR_MAPPED_ALIGNMENT': 0x0000046C,
		'ERROR_SET_POWER_STATE_VETOED': 0x00000474,
		'ERROR_SET_POWER_STATE_FAILED': 0x00000475,
		'ERROR_TOO_MANY_LINKS': 0x00000476,
		'ERROR_OLD_WIN_VERSION': 0x0000047E,
		'ERROR_APP_WRONG_OS': 0x0000047F,
		'ERROR_SINGLE_INSTANCE_APP': 0x00000480,
		'ERROR_RMODE_APP': 0x00000481,
		'ERROR_INVALID_DLL': 0x00000482,
		'ERROR_NO_ASSOCIATION': 0x00000483,
		'ERROR_DDE_FAIL': 0x00000484,
		'ERROR_DLL_NOT_FOUND': 0x00000485,
		'ERROR_NO_MORE_USER_HANDLES': 0x00000486,
		'ERROR_MESSAGE_SYNC_ONLY': 0x00000487,
		'ERROR_SOURCE_ELEMENT_EMPTY': 0x00000488,
		'ERROR_DESTINATION_ELEMENT_FULL': 0x00000489,
		'ERROR_ILLEGAL_ELEMENT_ADDRESS': 0x0000048A,
		'ERROR_MAGAZINE_NOT_PRESENT': 0x0000048B,
		'ERROR_DEVICE_REINITIALIZATION_NEEDED': 0x0000048C,
		'ERROR_DEVICE_REQUIRES_CLEANING': 0x0000048D,
		'ERROR_DEVICE_DOOR_OPEN': 0x0000048E,
		'ERROR_DEVICE_NOT_CONNECTED': 0x0000048F,
		'ERROR_NOT_FOUND': 0x00000490,
		'ERROR_NO_MATCH': 0x00000491,
		'ERROR_SET_NOT_FOUND': 0x00000492,
		'ERROR_POINT_NOT_FOUND': 0x00000493,
		'ERROR_NO_TRACKING_SERVICE': 0x00000494,
		'ERROR_NO_VOLUME_ID': 0x00000495,
		'ERROR_UNABLE_TO_REMOVE_REPLACED': 0x00000497,
		'ERROR_UNABLE_TO_MOVE_REPLACEMENT': 0x00000498,
		'ERROR_UNABLE_TO_MOVE_REPLACEMENT_2': 0x00000499,
		'ERROR_JOURNAL_DELETE_IN_PROGRESS': 0x0000049A,
		'ERROR_JOURNAL_NOT_ACTIVE': 0x0000049B,
		'ERROR_POTENTIAL_FILE_FOUND': 0x0000049C,
		'ERROR_JOURNAL_ENTRY_DELETED': 0x0000049D,
		'ERROR_SHUTDOWN_IS_SCHEDULED': 0x000004A6,
		'ERROR_SHUTDOWN_USERS_LOGGED_ON': 0x000004A7,
		'ERROR_BAD_DEVICE': 0x000004B0,
		'ERROR_CONNECTION_UNAVAIL': 0x000004B1,
		'ERROR_DEVICE_ALREADY_REMEMBERED': 0x000004B2,
		'ERROR_NO_NET_OR_BAD_PATH': 0x000004B3,
		'ERROR_BAD_PROVIDER': 0x000004B4,
		'ERROR_CANNOT_OPEN_PROFILE': 0x000004B5,
		'ERROR_BAD_PROFILE': 0x000004B6,
		'ERROR_NOT_CONTAINER': 0x000004B7,
		'ERROR_EXTENDED_ERROR': 0x000004B8,
		'ERROR_INVALID_GROUPNAME': 0x000004B9,
		'ERROR_INVALID_COMPUTERNAME': 0x000004BA,
		'ERROR_INVALID_EVENTNAME': 0x000004BB,
		'ERROR_INVALID_DOMAINNAME': 0x000004BC,
		'ERROR_INVALID_SERVICENAME': 0x000004BD,
		'ERROR_INVALID_NETNAME': 0x000004BE,
		'ERROR_INVALID_SHARENAME': 0x000004BF,
		'ERROR_INVALID_PASSWORDNAME': 0x000004C0,
		'ERROR_INVALID_MESSAGENAME': 0x000004C1,
		'ERROR_INVALID_MESSAGEDEST': 0x000004C2,
		'ERROR_SESSION_CREDENTIAL_CONFLICT': 0x000004C3,
		'ERROR_REMOTE_SESSION_LIMIT_EXCEEDED': 0x000004C4,
		'ERROR_DUP_DOMAINNAME': 0x000004C5,
		'ERROR_NO_NETWORK': 0x000004C6,
		'ERROR_CANCELLED': 0x000004C7,
		'ERROR_USER_MAPPED_FILE': 0x000004C8,
		'ERROR_CONNECTION_REFUSED': 0x000004C9,
		'ERROR_GRACEFUL_DISCONNECT': 0x000004CA,
		'ERROR_ADDRESS_ALREADY_ASSOCIATED': 0x000004CB,
		'ERROR_ADDRESS_NOT_ASSOCIATED': 0x000004CC,
		'ERROR_CONNECTION_INVALID': 0x000004CD,
		'ERROR_CONNECTION_ACTIVE': 0x000004CE,
		'ERROR_NETWORK_UNREACHABLE': 0x000004CF,
		'ERROR_HOST_UNREACHABLE': 0x000004D0,
		'ERROR_PROTOCOL_UNREACHABLE': 0x000004D1,
		'ERROR_PORT_UNREACHABLE': 0x000004D2,
		'ERROR_REQUEST_ABORTED': 0x000004D3,
		'ERROR_CONNECTION_ABORTED': 0x000004D4,
		'ERROR_RETRY': 0x000004D5,
		'ERROR_CONNECTION_COUNT_LIMIT': 0x000004D6,
		'ERROR_LOGIN_TIME_RESTRICTION': 0x000004D7,
		'ERROR_LOGIN_WKSTA_RESTRICTION': 0x000004D8,
		'ERROR_INCORRECT_ADDRESS': 0x000004D9,
		'ERROR_ALREADY_REGISTERED': 0x000004DA,
		'ERROR_SERVICE_NOT_FOUND': 0x000004DB,
		'ERROR_NOT_AUTHENTICATED': 0x000004DC,
		'ERROR_NOT_LOGGED_ON': 0x000004DD,
		'ERROR_CONTINUE': 0x000004DE,
		'ERROR_ALREADY_INITIALIZED': 0x000004DF,
		'ERROR_NO_MORE_DEVICES': 0x000004E0,
		'ERROR_NO_SUCH_SITE': 0x000004E1,
		'ERROR_DOMAIN_CONTROLLER_EXISTS': 0x000004E2,
		'ERROR_ONLY_IF_CONNECTED': 0x000004E3,
		'ERROR_OVERRIDE_NOCHANGES': 0x000004E4,
		'ERROR_BAD_USER_PROFILE': 0x000004E5,
		'ERROR_NOT_SUPPORTED_ON_SBS': 0x000004E6,
		'ERROR_SERVER_SHUTDOWN_IN_PROGRESS': 0x000004E7,
		'ERROR_HOST_DOWN': 0x000004E8,
		'ERROR_NON_ACCOUNT_SID': 0x000004E9,
		'ERROR_NON_DOMAIN_SID': 0x000004EA,
		'ERROR_APPHELP_BLOCK': 0x000004EB,
		'ERROR_ACCESS_DISABLED_BY_POLICY': 0x000004EC,
		'ERROR_REG_NAT_CONSUMPTION': 0x000004ED,
		'ERROR_CSCSHARE_OFFLINE': 0x000004EE,
		'ERROR_PKINIT_FAILURE': 0x000004EF,
		'ERROR_SMARTCARD_SUBSYSTEM_FAILURE': 0x000004F0,
		'ERROR_DOWNGRADE_DETECTED': 0x000004F1,
		'ERROR_MACHINE_LOCKED': 0x000004F7,
		'ERROR_CALLBACK_SUPPLIED_INVALID_DATA': 0x000004F9,
		'ERROR_SYNC_FOREGROUND_REFRESH_REQUIRED': 0x000004FA,
		'ERROR_DRIVER_BLOCKED': 0x000004FB,
		'ERROR_INVALID_IMPORT_OF_NON_DLL': 0x000004FC,
		'ERROR_ACCESS_DISABLED_WEBBLADE': 0x000004FD,
		'ERROR_ACCESS_DISABLED_WEBBLADE_TAMPER': 0x000004FE,
		'ERROR_RECOVERY_FAILURE': 0x000004FF,
		'ERROR_ALREADY_FIBER': 0x00000500,
		'ERROR_ALREADY_THREAD': 0x00000501,
		'ERROR_STACK_BUFFER_OVERRUN': 0x00000502,
		'ERROR_PARAMETER_QUOTA_EXCEEDED': 0x00000503,
		'ERROR_DEBUGGER_INACTIVE': 0x00000504,
		'ERROR_DELAY_LOAD_FAILED': 0x00000505,
		'ERROR_VDM_DISALLOWED': 0x00000506,
		'ERROR_UNIDENTIFIED_ERROR': 0x00000507,
		'ERROR_INVALID_CRUNTIME_PARAMETER': 0x00000508,
		'ERROR_BEYOND_VDL': 0x00000509,
		'ERROR_INCOMPATIBLE_SERVICE_SID_TYPE': 0x0000050A,
		'ERROR_DRIVER_PROCESS_TERMINATED': 0x0000050B,
		'ERROR_IMPLEMENTATION_LIMIT': 0x0000050C,
		'ERROR_PROCESS_IS_PROTECTED': 0x0000050D,
		'ERROR_SERVICE_NOTIFY_CLIENT_LAGGING': 0x0000050E,
		'ERROR_DISK_QUOTA_EXCEEDED': 0x0000050F,
		'ERROR_CONTENT_BLOCKED': 0x00000510,
		'ERROR_INCOMPATIBLE_SERVICE_PRIVILEGE': 0x00000511,
		'ERROR_INVALID_LABEL': 0x00000513,
		'ERROR_NOT_ALL_ASSIGNED': 0x00000514,
		'ERROR_SOME_NOT_MAPPED': 0x00000515,
		'ERROR_NO_QUOTAS_FOR_ACCOUNT': 0x00000516,
		'ERROR_LOCAL_USER_SESSION_KEY': 0x00000517,
		'ERROR_NULL_LM_PASSWORD': 0x00000518,
		'ERROR_UNKNOWN_REVISION': 0x00000519,
		'ERROR_REVISION_MISMATCH': 0x0000051A,
		'ERROR_INVALID_OWNER': 0x0000051B,
		'ERROR_INVALID_PRIMARY_GROUP': 0x0000051C,
		'ERROR_NO_IMPERSONATION_TOKEN': 0x0000051D,
		'ERROR_CANT_DISABLE_MANDATORY': 0x0000051E,
		'ERROR_NO_LOGON_SERVERS': 0x0000051F,
		'ERROR_NO_SUCH_LOGON_SESSION': 0x00000520,
		'ERROR_NO_SUCH_PRIVILEGE': 0x00000521,
		'ERROR_PRIVILEGE_NOT_HELD': 0x00000522,
		'ERROR_INVALID_ACCOUNT_NAME': 0x00000523,
		'ERROR_USER_EXISTS': 0x00000524,
		'ERROR_NO_SUCH_USER': 0x00000525,
		'ERROR_GROUP_EXISTS': 0x00000526,
		'ERROR_NO_SUCH_GROUP': 0x00000527,
		'ERROR_MEMBER_IN_GROUP': 0x00000528,
		'ERROR_MEMBER_NOT_IN_GROUP': 0x00000529,
		'ERROR_LAST_ADMIN': 0x0000052A,
		'ERROR_WRONG_PASSWORD': 0x0000052B,
		'ERROR_ILL_FORMED_PASSWORD': 0x0000052C,
		'ERROR_PASSWORD_RESTRICTION': 0x0000052D,
		'ERROR_LOGON_FAILURE': 0x0000052E,
		'ERROR_ACCOUNT_RESTRICTION': 0x0000052F,
		'ERROR_INVALID_LOGON_HOURS': 0x00000530,
		'ERROR_INVALID_WORKSTATION': 0x00000531,
		'ERROR_PASSWORD_EXPIRED': 0x00000532,
		'ERROR_ACCOUNT_DISABLED': 0x00000533,
		'ERROR_NONE_MAPPED': 0x00000534,
		'ERROR_TOO_MANY_LUIDS_REQUESTED': 0x00000535,
		'ERROR_LUIDS_EXHAUSTED': 0x00000536,
		'ERROR_INVALID_SUB_AUTHORITY': 0x00000537,
		'ERROR_INVALID_ACL': 0x00000538,
		'ERROR_INVALID_SID': 0x00000539,
		'ERROR_INVALID_SECURITY_DESCR': 0x0000053A,
		'ERROR_BAD_INHERITANCE_ACL': 0x0000053C,
		'ERROR_SERVER_DISABLED': 0x0000053D,
		'ERROR_SERVER_NOT_DISABLED': 0x0000053E,
		'ERROR_INVALID_ID_AUTHORITY': 0x0000053F,
		'ERROR_ALLOTTED_SPACE_EXCEEDED': 0x00000540,
		'ERROR_INVALID_GROUP_ATTRIBUTES': 0x00000541,
		'ERROR_BAD_IMPERSONATION_LEVEL': 0x00000542,
		'ERROR_CANT_OPEN_ANONYMOUS': 0x00000543,
		'ERROR_BAD_VALIDATION_CLASS': 0x00000544,
		'ERROR_BAD_TOKEN_TYPE': 0x00000545,
		'ERROR_NO_SECURITY_ON_OBJECT': 0x00000546,
		'ERROR_CANT_ACCESS_DOMAIN_INFO': 0x00000547,
		'ERROR_INVALID_SERVER_STATE': 0x00000548,
		'ERROR_INVALID_DOMAIN_STATE': 0x00000549,
		'ERROR_INVALID_DOMAIN_ROLE': 0x0000054A,
		'ERROR_NO_SUCH_DOMAIN': 0x0000054B,
		'ERROR_DOMAIN_EXISTS': 0x0000054C,
		'ERROR_DOMAIN_LIMIT_EXCEEDED': 0x0000054D,
		'ERROR_INTERNAL_DB_CORRUPTION': 0x0000054E,
		'ERROR_INTERNAL_ERROR': 0x0000054F,
		'ERROR_GENERIC_NOT_MAPPED': 0x00000550,
		'ERROR_BAD_DESCRIPTOR_FORMAT': 0x00000551,
		'ERROR_NOT_LOGON_PROCESS': 0x00000552,
		'ERROR_LOGON_SESSION_EXISTS': 0x00000553,
		'ERROR_NO_SUCH_PACKAGE': 0x00000554,
		'ERROR_BAD_LOGON_SESSION_STATE': 0x00000555,
		'ERROR_LOGON_SESSION_COLLISION': 0x00000556,
		'ERROR_INVALID_LOGON_TYPE': 0x00000557,
		'ERROR_CANNOT_IMPERSONATE': 0x00000558,
		'ERROR_RXACT_INVALID_STATE': 0x00000559,
		'ERROR_RXACT_COMMIT_FAILURE': 0x0000055A,
		'ERROR_SPECIAL_ACCOUNT': 0x0000055B,
		'ERROR_SPECIAL_GROUP': 0x0000055C,
		'ERROR_SPECIAL_USER': 0x0000055D,
		'ERROR_MEMBERS_PRIMARY_GROUP': 0x0000055E,
		'ERROR_TOKEN_ALREADY_IN_USE': 0x0000055F,
		'ERROR_NO_SUCH_ALIAS': 0x00000560,
		'ERROR_MEMBER_NOT_IN_ALIAS': 0x00000561,
		'ERROR_MEMBER_IN_ALIAS': 0x00000562,
		'ERROR_ALIAS_EXISTS': 0x00000563,
		'ERROR_LOGON_NOT_GRANTED': 0x00000564,
		'ERROR_TOO_MANY_SECRETS': 0x00000565,
		'ERROR_SECRET_TOO_LONG': 0x00000566,
		'ERROR_INTERNAL_DB_ERROR': 0x00000567,
		'ERROR_TOO_MANY_CONTEXT_IDS': 0x00000568,
		'ERROR_LOGON_TYPE_NOT_GRANTED': 0x00000569,
		'ERROR_NT_CROSS_ENCRYPTION_REQUIRED': 0x0000056A,
		'ERROR_NO_SUCH_MEMBER': 0x0000056B,
		'ERROR_INVALID_MEMBER': 0x0000056C,
		'ERROR_TOO_MANY_SIDS': 0x0000056D,
		'ERROR_LM_CROSS_ENCRYPTION_REQUIRED': 0x0000056E,
		'ERROR_NO_INHERITANCE': 0x0000056F,
		'ERROR_FILE_CORRUPT': 0x00000570,
		'ERROR_DISK_CORRUPT': 0x00000571,
		'ERROR_NO_USER_SESSION_KEY': 0x00000572,
		'ERROR_LICENSE_QUOTA_EXCEEDED': 0x00000573,
		'ERROR_WRONG_TARGET_NAME': 0x00000574,
		'ERROR_MUTUAL_AUTH_FAILED': 0x00000575,
		'ERROR_TIME_SKEW': 0x00000576,
		'ERROR_CURRENT_DOMAIN_NOT_ALLOWED': 0x00000577,
		'ERROR_INVALID_WINDOW_HANDLE': 0x00000578,
		'ERROR_INVALID_MENU_HANDLE': 0x00000579,
		'ERROR_INVALID_CURSOR_HANDLE': 0x0000057A,
		'ERROR_INVALID_ACCEL_HANDLE': 0x0000057B,
		'ERROR_INVALID_HOOK_HANDLE': 0x0000057C,
		'ERROR_INVALID_DWP_HANDLE': 0x0000057D,
		'ERROR_TLW_WITH_WSCHILD': 0x0000057E,
		'ERROR_CANNOT_FIND_WND_CLASS': 0x0000057F,
		'ERROR_WINDOW_OF_OTHER_THREAD': 0x00000580,
		'ERROR_HOTKEY_ALREADY_REGISTERED': 0x00000581,
		'ERROR_CLASS_ALREADY_EXISTS': 0x00000582,
		'ERROR_CLASS_DOES_NOT_EXIST': 0x00000583,
		'ERROR_CLASS_HAS_WINDOWS': 0x00000584,
		'ERROR_INVALID_INDEX': 0x00000585,
		'ERROR_INVALID_ICON_HANDLE': 0x00000586,
		'ERROR_PRIVATE_DIALOG_INDEX': 0x00000587,
		'ERROR_LISTBOX_ID_NOT_FOUND': 0x00000588,
		'ERROR_NO_WILDCARD_CHARACTERS': 0x00000589,
		'ERROR_CLIPBOARD_NOT_OPEN': 0x0000058A,
		'ERROR_HOTKEY_NOT_REGISTERED': 0x0000058B,
		'ERROR_WINDOW_NOT_DIALOG': 0x0000058C,
		'ERROR_CONTROL_ID_NOT_FOUND': 0x0000058D,
		'ERROR_INVALID_COMBOBOX_MESSAGE': 0x0000058E,
		'ERROR_WINDOW_NOT_COMBOBOX': 0x0000058F,
		'ERROR_INVALID_EDIT_HEIGHT': 0x00000590,
		'ERROR_DC_NOT_FOUND': 0x00000591,
		'ERROR_INVALID_HOOK_FILTER': 0x00000592,
		'ERROR_INVALID_FILTER_PROC': 0x00000593,
		'ERROR_HOOK_NEEDS_HMOD': 0x00000594,
		'ERROR_GLOBAL_ONLY_HOOK': 0x00000595,
		'ERROR_JOURNAL_HOOK_SET': 0x00000596,
		'ERROR_HOOK_NOT_INSTALLED': 0x00000597,
		'ERROR_INVALID_LB_MESSAGE': 0x00000598,
		'ERROR_SETCOUNT_ON_BAD_LB': 0x00000599,
		'ERROR_LB_WITHOUT_TABSTOPS': 0x0000059A,
		'ERROR_DESTROY_OBJECT_OF_OTHER_THREAD': 0x0000059B,
		'ERROR_CHILD_WINDOW_MENU': 0x0000059C,
		'ERROR_NO_SYSTEM_MENU': 0x0000059D,
		'ERROR_INVALID_MSGBOX_STYLE': 0x0000059E,
		'ERROR_INVALID_SPI_VALUE': 0x0000059F,
		'ERROR_SCREEN_ALREADY_LOCKED': 0x000005A0,
		'ERROR_HWNDS_HAVE_DIFF_PARENT': 0x000005A1,
		'ERROR_NOT_CHILD_WINDOW': 0x000005A2,
		'ERROR_INVALID_GW_COMMAND': 0x000005A3,
		'ERROR_INVALID_THREAD_ID': 0x000005A4,
		'ERROR_NON_MDICHILD_WINDOW': 0x000005A5,
		'ERROR_POPUP_ALREADY_ACTIVE': 0x000005A6,
		'ERROR_NO_SCROLLBARS': 0x000005A7,
		'ERROR_INVALID_SCROLLBAR_RANGE': 0x000005A8,
		'ERROR_INVALID_SHOWWIN_COMMAND': 0x000005A9,
		'ERROR_NO_SYSTEM_RESOURCES': 0x000005AA,
		'ERROR_NONPAGED_SYSTEM_RESOURCES': 0x000005AB,
		'ERROR_PAGED_SYSTEM_RESOURCES': 0x000005AC,
		'ERROR_WORKING_SET_QUOTA': 0x000005AD,
		'ERROR_PAGEFILE_QUOTA': 0x000005AE,
		'ERROR_COMMITMENT_LIMIT': 0x000005AF,
		'ERROR_MENU_ITEM_NOT_FOUND': 0x000005B0,
		'ERROR_INVALID_KEYBOARD_HANDLE': 0x000005B1,
		'ERROR_HOOK_TYPE_NOT_ALLOWED': 0x000005B2,
		'ERROR_REQUIRES_INTERACTIVE_WINDOWSTATION': 0x000005B3,
		'ERROR_TIMEOUT': 0x000005B4,
		'ERROR_INVALID_MONITOR_HANDLE': 0x000005B5,
		'ERROR_INCORRECT_SIZE': 0x000005B6,
		'ERROR_SYMLINK_CLASS_DISABLED': 0x000005B7,
		'ERROR_SYMLINK_NOT_SUPPORTED': 0x000005B8,
		'ERROR_EVENTLOG_FILE_CORRUPT': 0x000005DC,
		'ERROR_EVENTLOG_CANT_START': 0x000005DD,
		'ERROR_LOG_FILE_FULL': 0x000005DE,
		'ERROR_EVENTLOG_FILE_CHANGED': 0x000005DF,
		'ERROR_INVALID_TASK_NAME': 0x0000060E,
		'ERROR_INVALID_TASK_INDEX': 0x0000060F,
		'ERROR_THREAD_ALREADY_IN_TASK': 0x00000610,
		'ERROR_INSTALL_SERVICE_FAILURE': 0x00000641,
		'ERROR_INSTALL_USEREXIT': 0x00000642,
		'ERROR_INSTALL_FAILURE': 0x00000643,
		'ERROR_INSTALL_SUSPEND': 0x00000644,
		'ERROR_UNKNOWN_PRODUCT': 0x00000645,
		'ERROR_UNKNOWN_FEATURE': 0x00000646,
		'ERROR_UNKNOWN_COMPONENT': 0x00000647,
		'ERROR_UNKNOWN_PROPERTY': 0x00000648,
		'ERROR_INVALID_HANDLE_STATE': 0x00000649,
		'ERROR_BAD_CONFIGURATION': 0x0000064A,
		'ERROR_INDEX_ABSENT': 0x0000064B,
		'ERROR_INSTALL_SOURCE_ABSENT': 0x0000064C,
		'ERROR_INSTALL_PACKAGE_VERSION': 0x0000064D,
		'ERROR_PRODUCT_UNINSTALLED': 0x0000064E,
		'ERROR_BAD_QUERY_SYNTAX': 0x0000064F,
		'ERROR_INVALID_FIELD': 0x00000650,
		'ERROR_DEVICE_REMOVED': 0x00000651,
		'ERROR_INSTALL_ALREADY_RUNNING': 0x00000652,
		'ERROR_INSTALL_PACKAGE_OPEN_FAILED': 0x00000653,
		'ERROR_INSTALL_PACKAGE_INVALID': 0x00000654,
		'ERROR_INSTALL_UI_FAILURE': 0x00000655,
		'ERROR_INSTALL_LOG_FAILURE': 0x00000656,
		'ERROR_INSTALL_LANGUAGE_UNSUPPORTED': 0x00000657,
		'ERROR_INSTALL_TRANSFORM_FAILURE': 0x00000658,
		'ERROR_INSTALL_PACKAGE_REJECTED': 0x00000659,
		'ERROR_FUNCTION_NOT_CALLED': 0x0000065A,
		'ERROR_FUNCTION_FAILED': 0x0000065B,
		'ERROR_INVALID_TABLE': 0x0000065C,
		'ERROR_DATATYPE_MISMATCH': 0x0000065D,
		'ERROR_UNSUPPORTED_TYPE': 0x0000065E,
		'ERROR_CREATE_FAILED': 0x0000065F,
		'ERROR_INSTALL_TEMP_UNWRITABLE': 0x00000660,
		'ERROR_INSTALL_PLATFORM_UNSUPPORTED': 0x00000661,
		'ERROR_INSTALL_NOTUSED': 0x00000662,
		'ERROR_PATCH_PACKAGE_OPEN_FAILED': 0x00000663,
		'ERROR_PATCH_PACKAGE_INVALID': 0x00000664,
		'ERROR_PATCH_PACKAGE_UNSUPPORTED': 0x00000665,
		'ERROR_PRODUCT_VERSION': 0x00000666,
		'ERROR_INVALID_COMMAND_LINE': 0x00000667,
		'ERROR_INSTALL_REMOTE_DISALLOWED': 0x00000668,
		'ERROR_SUCCESS_REBOOT_INITIATED': 0x00000669,
		'ERROR_PATCH_TARGET_NOT_FOUND': 0x0000066A,
		'ERROR_PATCH_PACKAGE_REJECTED': 0x0000066B,
		'ERROR_INSTALL_TRANSFORM_REJECTED': 0x0000066C,
		'ERROR_INSTALL_REMOTE_PROHIBITED': 0x0000066D,
		'ERROR_PATCH_REMOVAL_UNSUPPORTED': 0x0000066E,
		'ERROR_UNKNOWN_PATCH': 0x0000066F,
		'ERROR_PATCH_NO_SEQUENCE': 0x00000670,
		'ERROR_PATCH_REMOVAL_DISALLOWED': 0x00000671,
		'ERROR_INVALID_PATCH_XML': 0x00000672,
		'ERROR_PATCH_MANAGED_ADVERTISED_PRODUCT': 0x00000673,
		'ERROR_INSTALL_SERVICE_SAFEBOOT': 0x00000674,
		'RPC_S_INVALID_STRING_BINDING': 0x000006A4,
		'RPC_S_WRONG_KIND_OF_BINDING': 0x000006A5,
		'RPC_S_INVALID_BINDING': 0x000006A6,
		'RPC_S_PROTSEQ_NOT_SUPPORTED': 0x000006A7,
		'RPC_S_INVALID_RPC_PROTSEQ': 0x000006A8,
		'RPC_S_INVALID_STRING_UUID': 0x000006A9,
		'RPC_S_INVALID_ENDPOINT_FORMAT': 0x000006AA,
		'RPC_S_INVALID_NET_ADDR': 0x000006AB,
		'RPC_S_NO_ENDPOINT_FOUND': 0x000006AC,
		'RPC_S_INVALID_TIMEOUT': 0x000006AD,
		'RPC_S_OBJECT_NOT_FOUND': 0x000006AE,
		'RPC_S_ALREADY_REGISTERED': 0x000006AF,
		'RPC_S_TYPE_ALREADY_REGISTERED': 0x000006B0,
		'RPC_S_ALREADY_LISTENING': 0x000006B1,
		'RPC_S_NO_PROTSEQS_REGISTERED': 0x000006B2,
		'RPC_S_NOT_LISTENING': 0x000006B3,
		'RPC_S_UNKNOWN_MGR_TYPE': 0x000006B4,
		'RPC_S_UNKNOWN_IF': 0x000006B5,
		'RPC_S_NO_BINDINGS': 0x000006B6,
		'RPC_S_NO_PROTSEQS': 0x000006B7,
		'RPC_S_CANT_CREATE_ENDPOINT': 0x000006B8,
		'RPC_S_OUT_OF_RESOURCES': 0x000006B9,
		'RPC_S_SERVER_UNAVAILABLE': 0x000006BA,
		'RPC_S_SERVER_TOO_BUSY': 0x000006BB,
		'RPC_S_INVALID_NETWORK_OPTIONS': 0x000006BC,
		'RPC_S_NO_CALL_ACTIVE': 0x000006BD,
		'RPC_S_CALL_FAILED': 0x000006BE,
		'RPC_S_CALL_FAILED_DNE': 0x000006BF,
		'RPC_S_PROTOCOL_ERROR': 0x000006C0,
		'RPC_S_PROXY_ACCESS_DENIED': 0x000006C1,
		'RPC_S_UNSUPPORTED_TRANS_SYN': 0x000006C2,
		'RPC_S_UNSUPPORTED_TYPE': 0x000006C4,
		'RPC_S_INVALID_TAG': 0x000006C5,
		'RPC_S_INVALID_BOUND': 0x000006C6,
		'RPC_S_NO_ENTRY_NAME': 0x000006C7,
		'RPC_S_INVALID_NAME_SYNTAX': 0x000006C8,
		'RPC_S_UNSUPPORTED_NAME_SYNTAX': 0x000006C9,
		'RPC_S_UUID_NO_ADDRESS': 0x000006CB,
		'RPC_S_DUPLICATE_ENDPOINT': 0x000006CC,
		'RPC_S_UNKNOWN_AUTHN_TYPE': 0x000006CD,
		'RPC_S_MAX_CALLS_TOO_SMALL': 0x000006CE,
		'RPC_S_STRING_TOO_LONG': 0x000006CF,
		'RPC_S_PROTSEQ_NOT_FOUND': 0x000006D0,
		'RPC_S_PROCNUM_OUT_OF_RANGE': 0x000006D1,
		'RPC_S_BINDING_HAS_NO_AUTH': 0x000006D2,
		'RPC_S_UNKNOWN_AUTHN_SERVICE': 0x000006D3,
		'RPC_S_UNKNOWN_AUTHN_LEVEL': 0x000006D4,
		'RPC_S_INVALID_AUTH_IDENTITY': 0x000006D5,
		'RPC_S_UNKNOWN_AUTHZ_SERVICE': 0x000006D6,
		'EPT_S_INVALID_ENTRY': 0x000006D7,
		'EPT_S_CANT_PERFORM_OP': 0x000006D8,
		'EPT_S_NOT_REGISTERED': 0x000006D9,
		'RPC_S_NOTHING_TO_EXPORT': 0x000006DA,
		'RPC_S_INCOMPLETE_NAME': 0x000006DB,
		'RPC_S_INVALID_VERS_OPTION': 0x000006DC,
		'RPC_S_NO_MORE_MEMBERS': 0x000006DD,
		'RPC_S_NOT_ALL_OBJS_UNEXPORTED': 0x000006DE,
		'RPC_S_INTERFACE_NOT_FOUND': 0x000006DF,
		'RPC_S_ENTRY_ALREADY_EXISTS': 0x000006E0,
		'RPC_S_ENTRY_NOT_FOUND': 0x000006E1,
		'RPC_S_NAME_SERVICE_UNAVAILABLE': 0x000006E2,
		'RPC_S_INVALID_NAF_ID': 0x000006E3,
		'RPC_S_CANNOT_SUPPORT': 0x000006E4,
		'RPC_S_NO_CONTEXT_AVAILABLE': 0x000006E5,
		'RPC_S_INTERNAL_ERROR': 0x000006E6,
		'RPC_S_ZERO_DIVIDE': 0x000006E7,
		'RPC_S_ADDRESS_ERROR': 0x000006E8,
		'RPC_S_FP_DIV_ZERO': 0x000006E9,
		'RPC_S_FP_UNDERFLOW': 0x000006EA,
		'RPC_S_FP_OVERFLOW': 0x000006EB,
		'RPC_X_NO_MORE_ENTRIES': 0x000006EC,
		'RPC_X_SS_CHAR_TRANS_OPEN_FAIL': 0x000006ED,
		'RPC_X_SS_CHAR_TRANS_SHORT_FILE': 0x000006EE,
		'RPC_X_SS_IN_NULL_CONTEXT': 0x000006EF,
		'RPC_X_SS_CONTEXT_DAMAGED': 0x000006F1,
		'RPC_X_SS_HANDLES_MISMATCH': 0x000006F2,
		'RPC_X_SS_CANNOT_GET_CALL_HANDLE': 0x000006F3,
		'RPC_X_NULL_REF_POINTER': 0x000006F4,
		'RPC_X_ENUM_VALUE_OUT_OF_RANGE': 0x000006F5,
		'RPC_X_BYTE_COUNT_TOO_SMALL': 0x000006F6,
		'RPC_X_BAD_STUB_DATA': 0x000006F7,
		'ERROR_INVALID_USER_BUFFER': 0x000006F8,
		'ERROR_UNRECOGNIZED_MEDIA': 0x000006F9,
		'ERROR_NO_TRUST_LSA_SECRET': 0x000006FA,
		'ERROR_NO_TRUST_SAM_ACCOUNT': 0x000006FB,
		'ERROR_TRUSTED_DOMAIN_FAILURE': 0x000006FC,
		'ERROR_TRUSTED_RELATIONSHIP_FAILURE': 0x000006FD,
		'ERROR_TRUST_FAILURE': 0x000006FE,
		'RPC_S_CALL_IN_PROGRESS': 0x000006FF,
		'ERROR_NETLOGON_NOT_STARTED': 0x00000700,
		'ERROR_ACCOUNT_EXPIRED': 0x00000701,
		'ERROR_REDIRECTOR_HAS_OPEN_HANDLES': 0x00000702,
		'ERROR_PRINTER_DRIVER_ALREADY_INSTALLED': 0x00000703,
		'ERROR_UNKNOWN_PORT': 0x00000704,
		'ERROR_UNKNOWN_PRINTER_DRIVER': 0x00000705,
		'ERROR_UNKNOWN_PRINTPROCESSOR': 0x00000706,
		'ERROR_INVALID_SEPARATOR_FILE': 0x00000707,
		'ERROR_INVALID_PRIORITY': 0x00000708,
		'ERROR_INVALID_PRINTER_NAME': 0x00000709,
		'ERROR_PRINTER_ALREADY_EXISTS': 0x0000070A,
		'ERROR_INVALID_PRINTER_COMMAND': 0x0000070B,
		'ERROR_INVALID_DATATYPE': 0x0000070C,
		'ERROR_INVALID_ENVIRONMENT': 0x0000070D,
		'RPC_S_NO_MORE_BINDINGS': 0x0000070E,
		'ERROR_NOLOGON_INTERDOMAIN_TRUST_ACCOUNT': 0x0000070F,
		'ERROR_NOLOGON_WORKSTATION_TRUST_ACCOUNT': 0x00000710,
		'ERROR_NOLOGON_SERVER_TRUST_ACCOUNT': 0x00000711,
		'ERROR_DOMAIN_TRUST_INCONSISTENT': 0x00000712,
		'ERROR_SERVER_HAS_OPEN_HANDLES': 0x00000713,
		'ERROR_RESOURCE_DATA_NOT_FOUND': 0x00000714,
		'ERROR_RESOURCE_TYPE_NOT_FOUND': 0x00000715,
		'ERROR_RESOURCE_NAME_NOT_FOUND': 0x00000716,
		'ERROR_RESOURCE_LANG_NOT_FOUND': 0x00000717,
		'ERROR_NOT_ENOUGH_QUOTA': 0x00000718,
		'RPC_S_NO_INTERFACES': 0x00000719,
		'RPC_S_CALL_CANCELLED': 0x0000071A,
		'RPC_S_BINDING_INCOMPLETE': 0x0000071B,
		'RPC_S_COMM_FAILURE': 0x0000071C,
		'RPC_S_UNSUPPORTED_AUTHN_LEVEL': 0x0000071D,
		'RPC_S_NO_PRINC_NAME': 0x0000071E,
		'RPC_S_NOT_RPC_ERROR': 0x0000071F,
		'RPC_S_UUID_LOCAL_ONLY': 0x00000720,
		'RPC_S_SEC_PKG_ERROR': 0x00000721,
		'RPC_S_NOT_CANCELLED': 0x00000722,
		'RPC_X_INVALID_ES_ACTION': 0x00000723,
		'RPC_X_WRONG_ES_VERSION': 0x00000724,
		'RPC_X_WRONG_STUB_VERSION': 0x00000725,
		'RPC_X_INVALID_PIPE_OBJECT': 0x00000726,
		'RPC_X_WRONG_PIPE_ORDER': 0x00000727,
		'RPC_X_WRONG_PIPE_VERSION': 0x00000728,
		'RPC_S_GROUP_MEMBER_NOT_FOUND': 0x0000076A,
		'EPT_S_CANT_CREATE': 0x0000076B,
		'RPC_S_INVALID_OBJECT': 0x0000076C,
		'ERROR_INVALID_TIME': 0x0000076D,
		'ERROR_INVALID_FORM_NAME': 0x0000076E,
		'ERROR_INVALID_FORM_SIZE': 0x0000076F,
		'ERROR_ALREADY_WAITING': 0x00000770,
		'ERROR_PRINTER_DELETED': 0x00000771,
		'ERROR_INVALID_PRINTER_STATE': 0x00000772,
		'ERROR_PASSWORD_MUST_CHANGE': 0x00000773,
		'ERROR_DOMAIN_CONTROLLER_NOT_FOUND': 0x00000774,
		'ERROR_ACCOUNT_LOCKED_OUT': 0x00000775,
		'OR_INVALID_OXID': 0x00000776,
		'OR_INVALID_OID': 0x00000777,
		'OR_INVALID_SET': 0x00000778,
		'RPC_S_SEND_INCOMPLETE': 0x00000779,
		'RPC_S_INVALID_ASYNC_HANDLE': 0x0000077A,
		'RPC_S_INVALID_ASYNC_CALL': 0x0000077B,
		'RPC_X_PIPE_CLOSED': 0x0000077C,
		'RPC_X_PIPE_DISCIPLINE_ERROR': 0x0000077D,
		'RPC_X_PIPE_EMPTY': 0x0000077E,
		'ERROR_NO_SITENAME': 0x0000077F,
		'ERROR_CANT_ACCESS_FILE': 0x00000780,
		'ERROR_CANT_RESOLVE_FILENAME': 0x00000781,
		'RPC_S_ENTRY_TYPE_MISMATCH': 0x00000782,
		'RPC_S_NOT_ALL_OBJS_EXPORTED': 0x00000783,
		'RPC_S_INTERFACE_NOT_EXPORTED': 0x00000784,
		'RPC_S_PROFILE_NOT_ADDED': 0x00000785,
		'RPC_S_PRF_ELT_NOT_ADDED': 0x00000786,
		'RPC_S_PRF_ELT_NOT_REMOVED': 0x00000787,
		'RPC_S_GRP_ELT_NOT_ADDED': 0x00000788,
		'RPC_S_GRP_ELT_NOT_REMOVED': 0x00000789,
		'ERROR_KM_DRIVER_BLOCKED': 0x0000078A,
		'ERROR_CONTEXT_EXPIRED': 0x0000078B,
		'ERROR_PER_USER_TRUST_QUOTA_EXCEEDED': 0x0000078C,
		'ERROR_ALL_USER_TRUST_QUOTA_EXCEEDED': 0x0000078D,
		'ERROR_USER_DELETE_TRUST_QUOTA_EXCEEDED': 0x0000078E,
		'ERROR_AUTHENTICATION_FIREWALL_FAILED': 0x0000078F,
		'ERROR_REMOTE_PRINT_CONNECTIONS_BLOCKED': 0x00000790,
		'ERROR_INVALID_PIXEL_FORMAT': 0x000007D0,
		'ERROR_BAD_DRIVER': 0x000007D1,
		'ERROR_INVALID_WINDOW_STYLE': 0x000007D2,
		'ERROR_METAFILE_NOT_SUPPORTED': 0x000007D3,
		'ERROR_TRANSFORM_NOT_SUPPORTED': 0x000007D4,
		'ERROR_CLIPPING_NOT_SUPPORTED': 0x000007D5,
		'ERROR_INVALID_CMM': 0x000007DA,
		'ERROR_INVALID_PROFILE': 0x000007DB,
		'ERROR_TAG_NOT_FOUND': 0x000007DC,
		'ERROR_TAG_NOT_PRESENT': 0x000007DD,
		'ERROR_DUPLICATE_TAG': 0x000007DE,
		'ERROR_PROFILE_NOT_ASSOCIATED_WITH_DEVICE': 0x000007DF,
		'ERROR_PROFILE_NOT_FOUND': 0x000007E0,
		'ERROR_INVALID_COLORSPACE': 0x000007E1,
		'ERROR_ICM_NOT_ENABLED': 0x000007E2,
		'ERROR_DELETING_ICM_XFORM': 0x000007E3,
		'ERROR_INVALID_TRANSFORM': 0x000007E4,
		'ERROR_COLORSPACE_MISMATCH': 0x000007E5,
		'ERROR_INVALID_COLORINDEX': 0x000007E6,
		'ERROR_PROFILE_DOES_NOT_MATCH_DEVICE': 0x000007E7,
		'NERR_NetNotStarted': 0x00000836,
		'NERR_UnknownServer': 0x00000837,
		'NERR_ShareMem': 0x00000838,
		'NERR_NoNetworkResource': 0x00000839,
		'NERR_RemoteOnly': 0x0000083A,
		'NERR_DevNotRedirected': 0x0000083B,
		'ERROR_CONNECTED_OTHER_PASSWORD': 0x0000083C,
		'ERROR_CONNECTED_OTHER_PASSWORD_DEFAULT': 0x0000083D,
		'NERR_ServerNotStarted': 0x00000842,
		'NERR_ItemNotFound': 0x00000843,
		'NERR_UnknownDevDir': 0x00000844,
		'NERR_RedirectedPath': 0x00000845,
		'NERR_DuplicateShare': 0x00000846,
		'NERR_NoRoom': 0x00000847,
		'NERR_TooManyItems': 0x00000849,
		'NERR_InvalidMaxUsers': 0x0000084A,
		'NERR_BufTooSmall': 0x0000084B,
		'NERR_RemoteErr': 0x0000084F,
		'NERR_LanmanIniError': 0x00000853,
		'NERR_NetworkError': 0x00000858,
		'NERR_WkstaInconsistentState': 0x00000859,
		'NERR_WkstaNotStarted': 0x0000085A,
		'NERR_BrowserNotStarted': 0x0000085B,
		'NERR_InternalError': 0x0000085C,
		'NERR_BadTransactConfig': 0x0000085D,
		'NERR_InvalidAPI': 0x0000085E,
		'NERR_BadEventName': 0x0000085F,
		'NERR_DupNameReboot': 0x00000860,
		'NERR_CfgCompNotFound': 0x00000862,
		'NERR_CfgParamNotFound': 0x00000863,
		'NERR_LineTooLong': 0x00000865,
		'NERR_QNotFound': 0x00000866,
		'NERR_JobNotFound': 0x00000867,
		'NERR_DestNotFound': 0x00000868,
		'NERR_DestExists': 0x00000869,
		'NERR_QExists': 0x0000086A,
		'NERR_QNoRoom': 0x0000086B,
		'NERR_JobNoRoom': 0x0000086C,
		'NERR_DestNoRoom': 0x0000086D,
		'NERR_DestIdle': 0x0000086E,
		'NERR_DestInvalidOp': 0x0000086F,
		'NERR_ProcNoRespond': 0x00000870,
		'NERR_SpoolerNotLoaded': 0x00000871,
		'NERR_DestInvalidState': 0x00000872,
		'NERR_QinvalidState': 0x00000873,
		'NERR_JobInvalidState': 0x00000874,
		'NERR_SpoolNoMemory': 0x00000875,
		'NERR_DriverNotFound': 0x00000876,
		'NERR_DataTypeInvalid': 0x00000877,
		'NERR_ProcNotFound': 0x00000878,
		'NERR_ServiceTableLocked': 0x00000884,
		'NERR_ServiceTableFull': 0x00000885,
		'NERR_ServiceInstalled': 0x00000886,
		'NERR_ServiceEntryLocked': 0x00000887,
		'NERR_ServiceNotInstalled': 0x00000888,
		'NERR_BadServiceName': 0x00000889,
		'NERR_ServiceCtlTimeout': 0x0000088A,
		'NERR_ServiceCtlBusy': 0x0000088B,
		'NERR_BadServiceProgName': 0x0000088C,
		'NERR_ServiceNotCtrl': 0x0000088D,
		'NERR_ServiceKillProc': 0x0000088E,
		'NERR_ServiceCtlNotValid': 0x0000088F,
		'NERR_NotInDispatchTbl': 0x00000890,
		'NERR_BadControlRecv': 0x00000891,
		'NERR_ServiceNotStarting': 0x00000892,
		'NERR_AlreadyLoggedOn': 0x00000898,
		'NERR_NotLoggedOn': 0x00000899,
		'NERR_BadUsername': 0x0000089A,
		'NERR_BadPassword': 0x0000089B,
		'NERR_UnableToAddName_W': 0x0000089C,
		'NERR_UnableToAddName_F': 0x0000089D,
		'NERR_UnableToDelName_W': 0x0000089E,
		'NERR_UnableToDelName_F': 0x0000089F,
		'NERR_LogonsPaused': 0x000008A1,
		'NERR_LogonServerConflict': 0x000008A2,
		'NERR_LogonNoUserPath': 0x000008A3,
		'NERR_LogonScriptError': 0x000008A4,
		'NERR_StandaloneLogon': 0x000008A6,
		'NERR_LogonServerNotFound': 0x000008A7,
		'NERR_LogonDomainExists': 0x000008A8,
		'NERR_NonValidatedLogon': 0x000008A9,
		'NERR_ACFNotFound': 0x000008AB,
		'NERR_GroupNotFound': 0x000008AC,
		'NERR_UserNotFound': 0x000008AD,
		'NERR_ResourceNotFound': 0x000008AE,
		'NERR_GroupExists': 0x000008AF,
		'NERR_UserExists': 0x000008B0,
		'NERR_ResourceExists': 0x000008B1,
		'NERR_NotPrimary': 0x000008B2,
		'NERR_ACFNotLoaded': 0x000008B3,
		'NERR_ACFNoRoom': 0x000008B4,
		'NERR_ACFFileIOFail': 0x000008B5,
		'NERR_ACFTooManyLists': 0x000008B6,
		'NERR_UserLogon': 0x000008B7,
		'NERR_ACFNoParent': 0x000008B8,
		'NERR_CanNotGrowSegment': 0x000008B9,
		'NERR_SpeGroupOp': 0x000008BA,
		'NERR_NotInCache': 0x000008BB,
		'NERR_UserInGroup': 0x000008BC,
		'NERR_UserNotInGroup': 0x000008BD,
		'NERR_AccountUndefined': 0x000008BE,
		'NERR_AccountExpired': 0x000008BF,
		'NERR_InvalidWorkstation': 0x000008C0,
		'NERR_InvalidLogonHours': 0x000008C1,
		'NERR_PasswordExpired': 0x000008C2,
		'NERR_PasswordCantChange': 0x000008C3,
		'NERR_PasswordHistConflict': 0x000008C4,
		'NERR_PasswordTooShort': 0x000008C5,
		'NERR_PasswordTooRecent': 0x000008C6,
		'NERR_InvalidDatabase': 0x000008C7,
		'NERR_DatabaseUpToDate': 0x000008C8,
		'NERR_SyncRequired': 0x000008C9,
		'NERR_UseNotFound': 0x000008CA,
		'NERR_BadAsgType': 0x000008CB,
		'NERR_DeviceIsShared': 0x000008CC,
		'NERR_NoComputerName': 0x000008DE,
		'NERR_MsgAlreadyStarted': 0x000008DF,
		'NERR_MsgInitFailed': 0x000008E0,
		'NERR_NameNotFound': 0x000008E1,
		'NERR_AlreadyForwarded': 0x000008E2,
		'NERR_AddForwarded': 0x000008E3,
		'NERR_AlreadyExists': 0x000008E4,
		'NERR_TooManyNames': 0x000008E5,
		'NERR_DelComputerName': 0x000008E6,
		'NERR_LocalForward': 0x000008E7,
		'NERR_GrpMsgProcessor': 0x000008E8,
		'NERR_PausedRemote': 0x000008E9,
		'NERR_BadReceive': 0x000008EA,
		'NERR_NameInUse': 0x000008EB,
		'NERR_MsgNotStarted': 0x000008EC,
		'NERR_NotLocalName': 0x000008ED,
		'NERR_NoForwardName': 0x000008EE,
		'NERR_RemoteFull': 0x000008EF,
		'NERR_NameNotForwarded': 0x000008F0,
		'NERR_TruncatedBroadcast': 0x000008F1,
		'NERR_InvalidDevice': 0x000008F6,
		'NERR_WriteFault': 0x000008F7,
		'NERR_DuplicateName': 0x000008F9,
		'NERR_DeleteLater': 0x000008FA,
		'NERR_IncompleteDel': 0x000008FB,
		'NERR_MultipleNets': 0x000008FC,
		'NERR_NetNameNotFound': 0x00000906,
		'NERR_DeviceNotShared': 0x00000907,
		'NERR_ClientNameNotFound': 0x00000908,
		'NERR_FileIdNotFound': 0x0000090A,
		'NERR_ExecFailure': 0x0000090B,
		'NERR_TmpFile': 0x0000090C,
		'NERR_TooMuchData': 0x0000090D,
		'NERR_DeviceShareConflict': 0x0000090E,
		'NERR_BrowserTableIncomplete': 0x0000090F,
		'NERR_NotLocalDomain': 0x00000910,
		'NERR_IsDfsShare': 0x00000911,
		'NERR_DevInvalidOpCode': 0x0000091B,
		'NERR_DevNotFound': 0x0000091C,
		'NERR_DevNotOpen': 0x0000091D,
		'NERR_BadQueueDevString': 0x0000091E,
		'NERR_BadQueuePriority': 0x0000091F,
		'NERR_NoCommDevs': 0x00000921,
		'NERR_QueueNotFound': 0x00000922,
		'NERR_BadDevString': 0x00000924,
		'NERR_BadDev': 0x00000925,
		'NERR_InUseBySpooler': 0x00000926,
		'NERR_CommDevInUse': 0x00000927,
		'NERR_InvalidComputer': 0x0000092F,
		'NERR_MaxLenExceeded': 0x00000932,
		'NERR_BadComponent': 0x00000934,
		'NERR_CantType': 0x00000935,
		'NERR_TooManyEntries': 0x0000093A,
		'NERR_ProfileFileTooBig': 0x00000942,
		'NERR_ProfileOffset': 0x00000943,
		'NERR_ProfileCleanup': 0x00000944,
		'NERR_ProfileUnknownCmd': 0x00000945,
		'NERR_ProfileLoadErr': 0x00000946,
		'NERR_ProfileSaveErr': 0x00000947,
		'NERR_LogOverflow': 0x00000949,
		'NERR_LogFileChanged': 0x0000094A,
		'NERR_LogFileCorrupt': 0x0000094B,
		'NERR_SourceIsDir': 0x0000094C,
		'NERR_BadSource': 0x0000094D,
		'NERR_BadDest': 0x0000094E,
		'NERR_DifferentServers': 0x0000094F,
		'NERR_RunSrvPaused': 0x00000951,
		'NERR_ErrCommRunSrv': 0x00000955,
		'NERR_ErrorExecingGhost': 0x00000957,
		'NERR_ShareNotFound': 0x00000958,
		'NERR_InvalidLana': 0x00000960,
		'NERR_OpenFiles': 0x00000961,
		'NERR_ActiveConns': 0x00000962,
		'NERR_BadPasswordCore': 0x00000963,
		'NERR_DevInUse': 0x00000964,
		'NERR_LocalDrive': 0x00000965,
		'NERR_AlertExists': 0x0000097E,
		'NERR_TooManyAlerts': 0x0000097F,
		'NERR_NoSuchAlert': 0x00000980,
		'NERR_BadRecipient': 0x00000981,
		'NERR_AcctLimitExceeded': 0x00000982,
		'NERR_InvalidLogSeek': 0x00000988,
		'NERR_BadUasConfig': 0x00000992,
		'NERR_InvalidUASOp': 0x00000993,
		'NERR_LastAdmin': 0x00000994,
		'NERR_DCNotFound': 0x00000995,
		'NERR_LogonTrackingError': 0x00000996,
		'NERR_NetlogonNotStarted': 0x00000997,
		'NERR_CanNotGrowUASFile': 0x00000998,
		'NERR_TimeDiffAtDC': 0x00000999,
		'NERR_PasswordMismatch': 0x0000099A,
		'NERR_NoSuchServer': 0x0000099C,
		'NERR_NoSuchSession': 0x0000099D,
		'NERR_NoSuchConnection': 0x0000099E,
		'NERR_TooManyServers': 0x0000099F,
		'NERR_TooManySessions': 0x000009A0,
		'NERR_TooManyConnections': 0x000009A1,
		'NERR_TooManyFiles': 0x000009A2,
		'NERR_NoAlternateServers': 0x000009A3,
		'NERR_TryDownLevel': 0x000009A6,
		'NERR_UPSDriverNotStarted': 0x000009B0,
		'NERR_UPSInvalidConfig': 0x000009B1,
		'NERR_UPSInvalidCommPort': 0x000009B2,
		'NERR_UPSSignalAsserted': 0x000009B3,
		'NERR_UPSShutdownFailed': 0x000009B4,
		'NERR_BadDosRetCode': 0x000009C4,
		'NERR_ProgNeedsExtraMem': 0x000009C5,
		'NERR_BadDosFunction': 0x000009C6,
		'NERR_RemoteBootFailed': 0x000009C7,
		'NERR_BadFileCheckSum': 0x000009C8,
		'NERR_NoRplBootSystem': 0x000009C9,
		'NERR_RplLoadrNetBiosErr': 0x000009CA,
		'NERR_RplLoadrDiskErr': 0x000009CB,
		'NERR_ImageParamErr': 0x000009CC,
		'NERR_TooManyImageParams': 0x000009CD,
		'NERR_NonDosFloppyUsed': 0x000009CE,
		'NERR_RplBootRestart': 0x000009CF,
		'NERR_RplSrvrCallFailed': 0x000009D0,
		'NERR_CantConnectRplSrvr': 0x000009D1,
		'NERR_CantOpenImageFile': 0x000009D2,
		'NERR_CallingRplSrvr': 0x000009D3,
		'NERR_StartingRplBoot': 0x000009D4,
		'NERR_RplBootServiceTerm': 0x000009D5,
		'NERR_RplBootStartFailed': 0x000009D6,
		'NERR_RPL_CONNECTED': 0x000009D7,
		'NERR_BrowserConfiguredToNotRun': 0x000009F6,
		'NERR_RplNoAdaptersStarted': 0x00000A32,
		'NERR_RplBadRegistry': 0x00000A33,
		'NERR_RplBadDatabase': 0x00000A34,
		'NERR_RplRplfilesShare': 0x00000A35,
		'NERR_RplNotRplServer': 0x00000A36,
		'NERR_RplCannotEnum': 0x00000A37,
		'NERR_RplWkstaInfoCorrupted': 0x00000A38,
		'NERR_RplWkstaNotFound': 0x00000A39,
		'NERR_RplWkstaNameUnavailable': 0x00000A3A,
		'NERR_RplProfileInfoCorrupted': 0x00000A3B,
		'NERR_RplProfileNotFound': 0x00000A3C,
		'NERR_RplProfileNameUnavailable': 0x00000A3D,
		'NERR_RplProfileNotEmpty': 0x00000A3E,
		'NERR_RplConfigInfoCorrupted': 0x00000A3F,
		'NERR_RplConfigNotFound': 0x00000A40,
		'NERR_RplAdapterInfoCorrupted': 0x00000A41,
		'NERR_RplInternal': 0x00000A42,
		'NERR_RplVendorInfoCorrupted': 0x00000A43,
		'NERR_RplBootInfoCorrupted': 0x00000A44,
		'NERR_RplWkstaNeedsUserAcct': 0x00000A45,
		'NERR_RplNeedsRPLUSERAcct': 0x00000A46,
		'NERR_RplBootNotFound': 0x00000A47,
		'NERR_RplIncompatibleProfile': 0x00000A48,
		'NERR_RplAdapterNameUnavailable': 0x00000A49,
		'NERR_RplConfigNotEmpty': 0x00000A4A,
		'NERR_RplBootInUse': 0x00000A4B,
		'NERR_RplBackupDatabase': 0x00000A4C,
		'NERR_RplAdapterNotFound': 0x00000A4D,
		'NERR_RplVendorNotFound': 0x00000A4E,
		'NERR_RplVendorNameUnavailable': 0x00000A4F,
		'NERR_RplBootNameUnavailable': 0x00000A50,
		'NERR_RplConfigNameUnavailable': 0x00000A51,
		'NERR_DfsInternalCorruption': 0x00000A64,
		'NERR_DfsVolumeDataCorrupt': 0x00000A65,
		'NERR_DfsNoSuchVolume': 0x00000A66,
		'NERR_DfsVolumeAlreadyExists': 0x00000A67,
		'NERR_DfsAlreadyShared': 0x00000A68,
		'NERR_DfsNoSuchShare': 0x00000A69,
		'NERR_DfsNotALeafVolume': 0x00000A6A,
		'NERR_DfsLeafVolume': 0x00000A6B,
		'NERR_DfsVolumeHasMultipleServers': 0x00000A6C,
		'NERR_DfsCantCreateJunctionPoint': 0x00000A6D,
		'NERR_DfsServerNotDfsAware': 0x00000A6E,
		'NERR_DfsBadRenamePath': 0x00000A6F,
		'NERR_DfsVolumeIsOffline': 0x00000A70,
		'NERR_DfsNoSuchServer': 0x00000A71,
		'NERR_DfsCyclicalName': 0x00000A72,
		'NERR_DfsNotSupportedInServerDfs': 0x00000A73,
		'NERR_DfsDuplicateService': 0x00000A74,
		'NERR_DfsCantRemoveLastServerShare': 0x00000A75,
		'NERR_DfsVolumeIsInterDfs': 0x00000A76,
		'NERR_DfsInconsistent': 0x00000A77,
		'NERR_DfsServerUpgraded': 0x00000A78,
		'NERR_DfsDataIsIdentical': 0x00000A79,
		'NERR_DfsCantRemoveDfsRoot': 0x00000A7A,
		'NERR_DfsChildOrParentInDfs': 0x00000A7B,
		'NERR_DfsInternalError': 0x00000A82,
		'NERR_SetupAlreadyJoined': 0x00000A83,
		'NERR_SetupNotJoined': 0x00000A84,
		'NERR_SetupDomainController': 0x00000A85,
		'NERR_DefaultJoinRequired': 0x00000A86,
		'NERR_InvalidWorkgroupName': 0x00000A87,
		'NERR_NameUsesIncompatibleCodePage': 0x00000A88,
		'NERR_ComputerAccountNotFound': 0x00000A89,
		'NERR_PersonalSku': 0x00000A8A,
		'NERR_PasswordMustChange': 0x00000A8D,
		'NERR_AccountLockedOut': 0x00000A8E,
		'NERR_PasswordTooLong': 0x00000A8F,
		'NERR_PasswordNotComplexEnough': 0x00000A90,
		'NERR_PasswordFilterError': 0x00000A91,
		'ERROR_UNKNOWN_PRINT_MONITOR': 0x00000BB8,
		'ERROR_PRINTER_DRIVER_IN_USE': 0x00000BB9,
		'ERROR_SPOOL_FILE_NOT_FOUND': 0x00000BBA,
		'ERROR_SPL_NO_STARTDOC': 0x00000BBB,
		'ERROR_SPL_NO_ADDJOB': 0x00000BBC,
		'ERROR_PRINT_PROCESSOR_ALREADY_INSTALLED': 0x00000BBD,
		'ERROR_PRINT_MONITOR_ALREADY_INSTALLED': 0x00000BBE,
		'ERROR_INVALID_PRINT_MONITOR': 0x00000BBF,
		'ERROR_PRINT_MONITOR_IN_USE': 0x00000BC0,
		'ERROR_PRINTER_HAS_JOBS_QUEUED': 0x00000BC1,
		'ERROR_SUCCESS_REBOOT_REQUIRED': 0x00000BC2,
		'ERROR_SUCCESS_RESTART_REQUIRED': 0x00000BC3,
		'ERROR_PRINTER_NOT_FOUND': 0x00000BC4,
		'ERROR_PRINTER_DRIVER_WARNED': 0x00000BC5,
		'ERROR_PRINTER_DRIVER_BLOCKED': 0x00000BC6,
		'ERROR_PRINTER_DRIVER_PACKAGE_IN_USE': 0x00000BC7,
		'ERROR_CORE_DRIVER_PACKAGE_NOT_FOUND': 0x00000BC8,
		'ERROR_FAIL_REBOOT_REQUIRED': 0x00000BC9,
		'ERROR_FAIL_REBOOT_INITIATED': 0x00000BCA,
		'ERROR_IO_REISSUE_AS_CACHED': 0x00000F6E,
		'ERROR_WINS_INTERNAL': 0x00000FA0,
		'ERROR_CAN_NOT_DEL_LOCAL_WINS': 0x00000FA1,
		'ERROR_STATIC_INIT': 0x00000FA2,
		'ERROR_INC_BACKUP': 0x00000FA3,
		'ERROR_FULL_BACKUP': 0x00000FA4,
		'ERROR_REC_NON_EXISTENT': 0x00000FA5,
		'ERROR_RPL_NOT_ALLOWED': 0x00000FA6,
		'PEERDIST_ERROR_CONTENTINFO_VERSION_UNSUPPORTED': 0x00000FD2,
		'PEERDIST_ERROR_CANNOT_PARSE_CONTENTINFO': 0x00000FD3,
		'PEERDIST_ERROR_MISSING_DATA': 0x00000FD4,
		'PEERDIST_ERROR_NO_MORE': 0x00000FD5,
		'PEERDIST_ERROR_NOT_INITIALIZED': 0x00000FD6,
		'PEERDIST_ERROR_ALREADY_INITIALIZED': 0x00000FD7,
		'PEERDIST_ERROR_SHUTDOWN_IN_PROGRESS': 0x00000FD8,
		'PEERDIST_ERROR_INVALIDATED': 0x00000FD9,
		'PEERDIST_ERROR_ALREADY_EXISTS': 0x00000FDA,
		'PEERDIST_ERROR_OPERATION_NOTFOUND': 0x00000FDB,
		'PEERDIST_ERROR_ALREADY_COMPLETED': 0x00000FDC,
		'PEERDIST_ERROR_OUT_OF_BOUNDS': 0x00000FDD,
		'PEERDIST_ERROR_VERSION_UNSUPPORTED': 0x00000FDE,
		'PEERDIST_ERROR_INVALID_CONFIGURATION': 0x00000FDF,
		'PEERDIST_ERROR_NOT_LICENSED': 0x00000FE0,
		'PEERDIST_ERROR_SERVICE_UNAVAILABLE': 0x00000FE1,
		'ERROR_DHCP_ADDRESS_CONFLICT': 0x00001004,
		'ERROR_WMI_GUID_NOT_FOUND': 0x00001068,
		'ERROR_WMI_INSTANCE_NOT_FOUND': 0x00001069,
		'ERROR_WMI_ITEMID_NOT_FOUND': 0x0000106A,
		'ERROR_WMI_TRY_AGAIN': 0x0000106B,
		'ERROR_WMI_DP_NOT_FOUND': 0x0000106C,
		'ERROR_WMI_UNRESOLVED_INSTANCE_REF': 0x0000106D,
		'ERROR_WMI_ALREADY_ENABLED': 0x0000106E,
		'ERROR_WMI_GUID_DISCONNECTED': 0x0000106F,
		'ERROR_WMI_SERVER_UNAVAILABLE': 0x00001070,
		'ERROR_WMI_DP_FAILED': 0x00001071,
		'ERROR_WMI_INVALID_MOF': 0x00001072,
		'ERROR_WMI_INVALID_REGINFO': 0x00001073,
		'ERROR_WMI_ALREADY_DISABLED': 0x00001074,
		'ERROR_WMI_READ_ONLY': 0x00001075,
		'ERROR_WMI_SET_FAILURE': 0x00001076,
		'ERROR_INVALID_MEDIA': 0x000010CC,
		'ERROR_INVALID_LIBRARY': 0x000010CD,
		'ERROR_INVALID_MEDIA_POOL': 0x000010CE,
		'ERROR_DRIVE_MEDIA_MISMATCH': 0x000010CF,
		'ERROR_MEDIA_OFFLINE': 0x000010D0,
		'ERROR_LIBRARY_OFFLINE': 0x000010D1,
		'ERROR_EMPTY': 0x000010D2,
		'ERROR_NOT_EMPTY': 0x000010D3,
		'ERROR_MEDIA_UNAVAILABLE': 0x000010D4,
		'ERROR_RESOURCE_DISABLED': 0x000010D5,
		'ERROR_INVALID_CLEANER': 0x000010D6,
		'ERROR_UNABLE_TO_CLEAN': 0x000010D7,
		'ERROR_OBJECT_NOT_FOUND': 0x000010D8,
		'ERROR_DATABASE_FAILURE': 0x000010D9,
		'ERROR_DATABASE_FULL': 0x000010DA,
		'ERROR_MEDIA_INCOMPATIBLE': 0x000010DB,
		'ERROR_RESOURCE_NOT_PRESENT': 0x000010DC,
		'ERROR_INVALID_OPERATION': 0x000010DD,
		'ERROR_MEDIA_NOT_AVAILABLE': 0x000010DE,
		'ERROR_DEVICE_NOT_AVAILABLE': 0x000010DF,
		'ERROR_REQUEST_REFUSED': 0x000010E0,
		'ERROR_INVALID_DRIVE_OBJECT': 0x000010E1,
		'ERROR_LIBRARY_FULL': 0x000010E2,
		'ERROR_MEDIUM_NOT_ACCESSIBLE': 0x000010E3,
		'ERROR_UNABLE_TO_LOAD_MEDIUM': 0x000010E4,
		'ERROR_UNABLE_TO_INVENTORY_DRIVE': 0x000010E5,
		'ERROR_UNABLE_TO_INVENTORY_SLOT': 0x000010E6,
		'ERROR_UNABLE_TO_INVENTORY_TRANSPORT': 0x000010E7,
		'ERROR_TRANSPORT_FULL': 0x000010E8,
		'ERROR_CONTROLLING_IEPORT': 0x000010E9,
		'ERROR_UNABLE_TO_EJECT_MOUNTED_MEDIA': 0x000010EA,
		'ERROR_CLEANER_SLOT_SET': 0x000010EB,
		'ERROR_CLEANER_SLOT_NOT_SET': 0x000010EC,
		'ERROR_CLEANER_CARTRIDGE_SPENT': 0x000010ED,
		'ERROR_UNEXPECTED_OMID': 0x000010EE,
		'ERROR_CANT_DELETE_LAST_ITEM': 0x000010EF,
		'ERROR_MESSAGE_EXCEEDS_MAX_SIZE': 0x000010F0,
		'ERROR_VOLUME_CONTAINS_SYS_FILES': 0x000010F1,
		'ERROR_INDIGENOUS_TYPE': 0x000010F2,
		'ERROR_NO_SUPPORTING_DRIVES': 0x000010F3,
		'ERROR_CLEANER_CARTRIDGE_INSTALLED': 0x000010F4,
		'ERROR_IEPORT_FULL': 0x000010F5,
		'ERROR_FILE_OFFLINE': 0x000010FE,
		'ERROR_REMOTE_STORAGE_NOT_ACTIVE': 0x000010FF,
		'ERROR_REMOTE_STORAGE_MEDIA_ERROR': 0x00001100,
		'ERROR_NOT_A_REPARSE_POINT': 0x00001126,
		'ERROR_REPARSE_ATTRIBUTE_CONFLICT': 0x00001127,
		'ERROR_INVALID_REPARSE_DATA': 0x00001128,
		'ERROR_REPARSE_TAG_INVALID': 0x00001129,
		'ERROR_REPARSE_TAG_MISMATCH': 0x0000112A,
		'ERROR_VOLUME_NOT_SIS_ENABLED': 0x00001194,
		'ERROR_DEPENDENT_RESOURCE_EXISTS': 0x00001389,
		'ERROR_DEPENDENCY_NOT_FOUND': 0x0000138A,
		'ERROR_DEPENDENCY_ALREADY_EXISTS': 0x0000138B,
		'ERROR_RESOURCE_NOT_ONLINE': 0x0000138C,
		'ERROR_HOST_NODE_NOT_AVAILABLE': 0x0000138D,
		'ERROR_RESOURCE_NOT_AVAILABLE': 0x0000138E,
		'ERROR_RESOURCE_NOT_FOUND': 0x0000138F,
		'ERROR_SHUTDOWN_CLUSTER': 0x00001390,
		'ERROR_CANT_EVICT_ACTIVE_NODE': 0x00001391,
		'ERROR_OBJECT_ALREADY_EXISTS': 0x00001392,
		'ERROR_OBJECT_IN_LIST': 0x00001393,
		'ERROR_GROUP_NOT_AVAILABLE': 0x00001394,
		'ERROR_GROUP_NOT_FOUND': 0x00001395,
		'ERROR_GROUP_NOT_ONLINE': 0x00001396,
		'ERROR_HOST_NODE_NOT_RESOURCE_OWNER': 0x00001397,
		'ERROR_HOST_NODE_NOT_GROUP_OWNER': 0x00001398,
		'ERROR_RESMON_CREATE_FAILED': 0x00001399,
		'ERROR_RESMON_ONLINE_FAILED': 0x0000139A,
		'ERROR_RESOURCE_ONLINE': 0x0000139B,
		'ERROR_QUORUM_RESOURCE': 0x0000139C,
		'ERROR_NOT_QUORUM_CAPABLE': 0x0000139D,
		'ERROR_CLUSTER_SHUTTING_DOWN': 0x0000139E,
		'ERROR_INVALID_STATE': 0x0000139F,
		'ERROR_RESOURCE_PROPERTIES_STORED': 0x000013A0,
		'ERROR_NOT_QUORUM_CLASS': 0x000013A1,
		'ERROR_CORE_RESOURCE': 0x000013A2,
		'ERROR_QUORUM_RESOURCE_ONLINE_FAILED': 0x000013A3,
		'ERROR_QUORUMLOG_OPEN_FAILED': 0x000013A4,
		'ERROR_CLUSTERLOG_CORRUPT': 0x000013A5,
		'ERROR_CLUSTERLOG_RECORD_EXCEEDS_MAXSIZE': 0x000013A6,
		'ERROR_CLUSTERLOG_EXCEEDS_MAXSIZE': 0x000013A7,
		'ERROR_CLUSTERLOG_CHKPOINT_NOT_FOUND': 0x000013A8,
		'ERROR_CLUSTERLOG_NOT_ENOUGH_SPACE': 0x000013A9,
		'ERROR_QUORUM_OWNER_ALIVE': 0x000013AA,
		'ERROR_NETWORK_NOT_AVAILABLE': 0x000013AB,
		'ERROR_NODE_NOT_AVAILABLE': 0x000013AC,
		'ERROR_ALL_NODES_NOT_AVAILABLE': 0x000013AD,
		'ERROR_RESOURCE_FAILED': 0x000013AE,
		'ERROR_CLUSTER_INVALID_NODE': 0x000013AF,
		'ERROR_CLUSTER_NODE_EXISTS': 0x000013B0,
		'ERROR_CLUSTER_JOIN_IN_PROGRESS': 0x000013B1,
		'ERROR_CLUSTER_NODE_NOT_FOUND': 0x000013B2,
		'ERROR_CLUSTER_LOCAL_NODE_NOT_FOUND': 0x000013B3,
		'ERROR_CLUSTER_NETWORK_EXISTS': 0x000013B4,
		'ERROR_CLUSTER_NETWORK_NOT_FOUND': 0x000013B5,
		'ERROR_CLUSTER_NETINTERFACE_EXISTS': 0x000013B6,
		'ERROR_CLUSTER_NETINTERFACE_NOT_FOUND': 0x000013B7,
		'ERROR_CLUSTER_INVALID_REQUEST': 0x000013B8,
		'ERROR_CLUSTER_INVALID_NETWORK_PROVIDER': 0x000013B9,
		'ERROR_CLUSTER_NODE_DOWN': 0x000013BA,
		'ERROR_CLUSTER_NODE_UNREACHABLE': 0x000013BB,
		'ERROR_CLUSTER_NODE_NOT_MEMBER': 0x000013BC,
		'ERROR_CLUSTER_JOIN_NOT_IN_PROGRESS': 0x000013BD,
		'ERROR_CLUSTER_INVALID_NETWORK': 0x000013BE,
		'ERROR_CLUSTER_NODE_UP': 0x000013C0,
		'ERROR_CLUSTER_IPADDR_IN_USE': 0x000013C1,
		'ERROR_CLUSTER_NODE_NOT_PAUSED': 0x000013C2,
		'ERROR_CLUSTER_NO_SECURITY_CONTEXT': 0x000013C3,
		'ERROR_CLUSTER_NETWORK_NOT_INTERNAL': 0x000013C4,
		'ERROR_CLUSTER_NODE_ALREADY_UP': 0x000013C5,
		'ERROR_CLUSTER_NODE_ALREADY_DOWN': 0x000013C6,
		'ERROR_CLUSTER_NETWORK_ALREADY_ONLINE': 0x000013C7,
		'ERROR_CLUSTER_NETWORK_ALREADY_OFFLINE': 0x000013C8,
		'ERROR_CLUSTER_NODE_ALREADY_MEMBER': 0x000013C9,
		'ERROR_CLUSTER_LAST_INTERNAL_NETWORK': 0x000013CA,
		'ERROR_CLUSTER_NETWORK_HAS_DEPENDENTS': 0x000013CB,
		'ERROR_INVALID_OPERATION_ON_QUORUM': 0x000013CC,
		'ERROR_DEPENDENCY_NOT_ALLOWED': 0x000013CD,
		'ERROR_CLUSTER_NODE_PAUSED': 0x000013CE,
		'ERROR_NODE_CANT_HOST_RESOURCE': 0x000013CF,
		'ERROR_CLUSTER_NODE_NOT_READY': 0x000013D0,
		'ERROR_CLUSTER_NODE_SHUTTING_DOWN': 0x000013D1,
		'ERROR_CLUSTER_JOIN_ABORTED': 0x000013D2,
		'ERROR_CLUSTER_INCOMPATIBLE_VERSIONS': 0x000013D3,
		'ERROR_CLUSTER_MAXNUM_OF_RESOURCES_EXCEEDED': 0x000013D4,
		'ERROR_CLUSTER_SYSTEM_CONFIG_CHANGED': 0x000013D5,
		'ERROR_CLUSTER_RESOURCE_TYPE_NOT_FOUND': 0x000013D6,
		'ERROR_CLUSTER_RESTYPE_NOT_SUPPORTED': 0x000013D7,
		'ERROR_CLUSTER_RESNAME_NOT_FOUND': 0x000013D8,
		'ERROR_CLUSTER_NO_RPC_PACKAGES_REGISTERED': 0x000013D9,
		'ERROR_CLUSTER_OWNER_NOT_IN_PREFLIST': 0x000013DA,
		'ERROR_CLUSTER_DATABASE_SEQMISMATCH': 0x000013DB,
		'ERROR_RESMON_INVALID_STATE': 0x000013DC,
		'ERROR_CLUSTER_GUM_NOT_LOCKER': 0x000013DD,
		'ERROR_QUORUM_DISK_NOT_FOUND': 0x000013DE,
		'ERROR_DATABASE_BACKUP_CORRUPT': 0x000013DF,
		'ERROR_CLUSTER_NODE_ALREADY_HAS_DFS_ROOT': 0x000013E0,
		'ERROR_RESOURCE_PROPERTY_UNCHANGEABLE': 0x000013E1,
		'ERROR_CLUSTER_MEMBERSHIP_INVALID_STATE': 0x00001702,
		'ERROR_CLUSTER_QUORUMLOG_NOT_FOUND': 0x00001703,
		'ERROR_CLUSTER_MEMBERSHIP_HALT': 0x00001704,
		'ERROR_CLUSTER_INSTANCE_ID_MISMATCH': 0x00001705,
		'ERROR_CLUSTER_NETWORK_NOT_FOUND_FOR_IP': 0x00001706,
		'ERROR_CLUSTER_PROPERTY_DATA_TYPE_MISMATCH': 0x00001707,
		'ERROR_CLUSTER_EVICT_WITHOUT_CLEANUP': 0x00001708,
		'ERROR_CLUSTER_PARAMETER_MISMATCH': 0x00001709,
		'ERROR_NODE_CANNOT_BE_CLUSTERED': 0x0000170A,
		'ERROR_CLUSTER_WRONG_OS_VERSION': 0x0000170B,
		'ERROR_CLUSTER_CANT_CREATE_DUP_CLUSTER_NAME': 0x0000170C,
		'ERROR_CLUSCFG_ALREADY_COMMITTED': 0x0000170D,
		'ERROR_CLUSCFG_ROLLBACK_FAILED': 0x0000170E,
		'ERROR_CLUSCFG_SYSTEM_DISK_DRIVE_LETTER_CONFLICT': 0x0000170F,
		'ERROR_CLUSTER_OLD_VERSION': 0x00001710,
		'ERROR_CLUSTER_MISMATCHED_COMPUTER_ACCT_NAME': 0x00001711,
		'ERROR_CLUSTER_NO_NET_ADAPTERS': 0x00001712,
		'ERROR_CLUSTER_POISONED': 0x00001713,
		'ERROR_CLUSTER_GROUP_MOVING': 0x00001714,
		'ERROR_CLUSTER_RESOURCE_TYPE_BUSY': 0x00001715,
		'ERROR_RESOURCE_CALL_TIMED_OUT': 0x00001716,
		'ERROR_INVALID_CLUSTER_IPV6_ADDRESS': 0x00001717,
		'ERROR_CLUSTER_INTERNAL_INVALID_FUNCTION': 0x00001718,
		'ERROR_CLUSTER_PARAMETER_OUT_OF_BOUNDS': 0x00001719,
		'ERROR_CLUSTER_PARTIAL_SEND': 0x0000171A,
		'ERROR_CLUSTER_REGISTRY_INVALID_FUNCTION': 0x0000171B,
		'ERROR_CLUSTER_INVALID_STRING_TERMINATION': 0x0000171C,
		'ERROR_CLUSTER_INVALID_STRING_FORMAT': 0x0000171D,
		'ERROR_CLUSTER_DATABASE_TRANSACTION_IN_PROGRESS': 0x0000171E,
		'ERROR_CLUSTER_DATABASE_TRANSACTION_NOT_IN_PROGRESS': 0x0000171F,
		'ERROR_CLUSTER_NULL_DATA': 0x00001720,
		'ERROR_CLUSTER_PARTIAL_READ': 0x00001721,
		'ERROR_CLUSTER_PARTIAL_WRITE': 0x00001722,
		'ERROR_CLUSTER_CANT_DESERIALIZE_DATA': 0x00001723,
		'ERROR_DEPENDENT_RESOURCE_PROPERTY_CONFLICT': 0x00001724,
		'ERROR_CLUSTER_NO_QUORUM': 0x00001725,
		'ERROR_CLUSTER_INVALID_IPV6_NETWORK': 0x00001726,
		'ERROR_CLUSTER_INVALID_IPV6_TUNNEL_NETWORK': 0x00001727,
		'ERROR_QUORUM_NOT_ALLOWED_IN_THIS_GROUP': 0x00001728,
		'ERROR_ENCRYPTION_FAILED': 0x00001770,
		'ERROR_DECRYPTION_FAILED': 0x00001771,
		'ERROR_FILE_ENCRYPTED': 0x00001772,
		'ERROR_NO_RECOVERY_POLICY': 0x00001773,
		'ERROR_NO_EFS': 0x00001774,
		'ERROR_WRONG_EFS': 0x00001775,
		'ERROR_NO_USER_KEYS': 0x00001776,
		'ERROR_FILE_NOT_ENCRYPTED': 0x00001777,
		'ERROR_NOT_EXPORT_FORMAT': 0x00001778,
		'ERROR_FILE_READ_ONLY': 0x00001779,
		'ERROR_DIR_EFS_DISALLOWED': 0x0000177A,
		'ERROR_EFS_SERVER_NOT_TRUSTED': 0x0000177B,
		'ERROR_BAD_RECOVERY_POLICY': 0x0000177C,
		'ERROR_EFS_ALG_BLOB_TOO_BIG': 0x0000177D,
		'ERROR_VOLUME_NOT_SUPPORT_EFS': 0x0000177E,
		'ERROR_EFS_DISABLED': 0x0000177F,
		'ERROR_EFS_VERSION_NOT_SUPPORT': 0x00001780,
		'ERROR_CS_ENCRYPTION_INVALID_SERVER_RESPONSE': 0x00001781,
		'ERROR_CS_ENCRYPTION_UNSUPPORTED_SERVER': 0x00001782,
		'ERROR_CS_ENCRYPTION_EXISTING_ENCRYPTED_FILE': 0x00001783,
		'ERROR_CS_ENCRYPTION_NEW_ENCRYPTED_FILE': 0x00001784,
		'ERROR_CS_ENCRYPTION_FILE_NOT_CSE': 0x00001785,
		'ERROR_NO_BROWSER_SERVERS_FOUND': 0x000017E6,
		'SCHED_E_SERVICE_NOT_LOCALSYSTEM': 0x00001838,
		'ERROR_LOG_SECTOR_INVALID': 0x000019C8,
		'ERROR_LOG_SECTOR_PARITY_INVALID': 0x000019C9,
		'ERROR_LOG_SECTOR_REMAPPED': 0x000019CA,
		'ERROR_LOG_BLOCK_INCOMPLETE': 0x000019CB,
		'ERROR_LOG_INVALID_RANGE': 0x000019CC,
		'ERROR_LOG_BLOCKS_EXHAUSTED': 0x000019CD,
		'ERROR_LOG_READ_CONTEXT_INVALID': 0x000019CE,
		'ERROR_LOG_RESTART_INVALID': 0x000019CF,
		'ERROR_LOG_BLOCK_VERSION': 0x000019D0,
		'ERROR_LOG_BLOCK_INVALID': 0x000019D1,
		'ERROR_LOG_READ_MODE_INVALID': 0x000019D2,
		'ERROR_LOG_NO_RESTART': 0x000019D3,
		'ERROR_LOG_METADATA_CORRUPT': 0x000019D4,
		'ERROR_LOG_METADATA_INVALID': 0x000019D5,
		'ERROR_LOG_METADATA_INCONSISTENT': 0x000019D6,
		'ERROR_LOG_RESERVATION_INVALID': 0x000019D7,
		'ERROR_LOG_CANT_DELETE': 0x000019D8,
		'ERROR_LOG_CONTAINER_LIMIT_EXCEEDED': 0x000019D9,
		'ERROR_LOG_START_OF_LOG': 0x000019DA,
		'ERROR_LOG_POLICY_ALREADY_INSTALLED': 0x000019DB,
		'ERROR_LOG_POLICY_NOT_INSTALLED': 0x000019DC,
		'ERROR_LOG_POLICY_INVALID': 0x000019DD,
		'ERROR_LOG_POLICY_CONFLICT': 0x000019DE,
		'ERROR_LOG_PINNED_ARCHIVE_TAIL': 0x000019DF,
		'ERROR_LOG_RECORD_NONEXISTENT': 0x000019E0,
		'ERROR_LOG_RECORDS_RESERVED_INVALID': 0x000019E1,
		'ERROR_LOG_SPACE_RESERVED_INVALID': 0x000019E2,
		'ERROR_LOG_TAIL_INVALID': 0x000019E3,
		'ERROR_LOG_FULL': 0x000019E4,
		'ERROR_COULD_NOT_RESIZE_LOG': 0x000019E5,
		'ERROR_LOG_MULTIPLEXED': 0x000019E6,
		'ERROR_LOG_DEDICATED': 0x000019E7,
		'ERROR_LOG_ARCHIVE_NOT_IN_PROGRESS': 0x000019E8,
		'ERROR_LOG_ARCHIVE_IN_PROGRESS': 0x000019E9,
		'ERROR_LOG_EPHEMERAL': 0x000019EA,
		'ERROR_LOG_NOT_ENOUGH_CONTAINERS': 0x000019EB,
		'ERROR_LOG_CLIENT_ALREADY_REGISTERED': 0x000019EC,
		'ERROR_LOG_CLIENT_NOT_REGISTERED': 0x000019ED,
		'ERROR_LOG_FULL_HANDLER_IN_PROGRESS': 0x000019EE,
		'ERROR_LOG_CONTAINER_READ_FAILED': 0x000019EF,
		'ERROR_LOG_CONTAINER_WRITE_FAILED': 0x000019F0,
		'ERROR_LOG_CONTAINER_OPEN_FAILED': 0x000019F1,
		'ERROR_LOG_CONTAINER_STATE_INVALID': 0x000019F2,
		'ERROR_LOG_STATE_INVALID': 0x000019F3,
		'ERROR_LOG_PINNED': 0x000019F4,
		'ERROR_LOG_METADATA_FLUSH_FAILED': 0x000019F5,
		'ERROR_LOG_INCONSISTENT_SECURITY': 0x000019F6,
		'ERROR_LOG_APPENDED_FLUSH_FAILED': 0x000019F7,
		'ERROR_LOG_PINNED_RESERVATION': 0x000019F8,
		'ERROR_INVALID_TRANSACTION': 0x00001A2C,
		'ERROR_TRANSACTION_NOT_ACTIVE': 0x00001A2D,
		'ERROR_TRANSACTION_REQUEST_NOT_VALID': 0x00001A2E,
		'ERROR_TRANSACTION_NOT_REQUESTED': 0x00001A2F,
		'ERROR_TRANSACTION_ALREADY_ABORTED': 0x00001A30,
		'ERROR_TRANSACTION_ALREADY_COMMITTED': 0x00001A31,
		'ERROR_TM_INITIALIZATION_FAILED': 0x00001A32,
		'ERROR_RESOURCEMANAGER_READ_ONLY': 0x00001A33,
		'ERROR_TRANSACTION_NOT_JOINED': 0x00001A34,
		'ERROR_TRANSACTION_SUPERIOR_EXISTS': 0x00001A35,
		'ERROR_CRM_PROTOCOL_ALREADY_EXISTS': 0x00001A36,
		'ERROR_TRANSACTION_PROPAGATION_FAILED': 0x00001A37,
		'ERROR_CRM_PROTOCOL_NOT_FOUND': 0x00001A38,
		'ERROR_TRANSACTION_INVALID_MARSHALL_BUFFER': 0x00001A39,
		'ERROR_CURRENT_TRANSACTION_NOT_VALID': 0x00001A3A,
		'ERROR_TRANSACTION_NOT_FOUND': 0x00001A3B,
		'ERROR_RESOURCEMANAGER_NOT_FOUND': 0x00001A3C,
		'ERROR_ENLISTMENT_NOT_FOUND': 0x00001A3D,
		'ERROR_TRANSACTIONMANAGER_NOT_FOUND': 0x00001A3E,
		'ERROR_TRANSACTIONMANAGER_NOT_ONLINE': 0x00001A3F,
		'ERROR_TRANSACTIONMANAGER_RECOVERY_NAME_COLLISION': 0x00001A40,
		'ERROR_TRANSACTIONAL_CONFLICT': 0x00001A90,
		'ERROR_RM_NOT_ACTIVE': 0x00001A91,
		'ERROR_RM_METADATA_CORRUPT': 0x00001A92,
		'ERROR_DIRECTORY_NOT_RM': 0x00001A93,
		'ERROR_TRANSACTIONS_UNSUPPORTED_REMOTE': 0x00001A95,
		'ERROR_LOG_RESIZE_INVALID_SIZE': 0x00001A96,
		'ERROR_OBJECT_NO_LONGER_EXISTS': 0x00001A97,
		'ERROR_STREAM_MINIVERSION_NOT_FOUND': 0x00001A98,
		'ERROR_STREAM_MINIVERSION_NOT_VALID': 0x00001A99,
		'ERROR_MINIVERSION_INACCESSIBLE_FROM_SPECIFIED_TRANSACTION': 0x00001A9A,
		'ERROR_CANT_OPEN_MINIVERSION_WITH_MODIFY_INTENT': 0x00001A9B,
		'ERROR_CANT_CREATE_MORE_STREAM_MINIVERSIONS': 0x00001A9C,
		'ERROR_REMOTE_FILE_VERSION_MISMATCH': 0x00001A9E,
		'ERROR_HANDLE_NO_LONGER_VALID': 0x00001A9F,
		'ERROR_NO_TXF_METADATA': 0x00001AA0,
		'ERROR_LOG_CORRUPTION_DETECTED': 0x00001AA1,
		'ERROR_CANT_RECOVER_WITH_HANDLE_OPEN': 0x00001AA2,
		'ERROR_RM_DISCONNECTED': 0x00001AA3,
		'ERROR_ENLISTMENT_NOT_SUPERIOR': 0x00001AA4,
		'ERROR_RECOVERY_NOT_NEEDED': 0x00001AA5,
		'ERROR_RM_ALREADY_STARTED': 0x00001AA6,
		'ERROR_FILE_IDENTITY_NOT_PERSISTENT': 0x00001AA7,
		'ERROR_CANT_BREAK_TRANSACTIONAL_DEPENDENCY': 0x00001AA8,
		'ERROR_CANT_CROSS_RM_BOUNDARY': 0x00001AA9,
		'ERROR_TXF_DIR_NOT_EMPTY': 0x00001AAA,
		'ERROR_INDOUBT_TRANSACTIONS_EXIST': 0x00001AAB,
		'ERROR_TM_VOLATILE': 0x00001AAC,
		'ERROR_ROLLBACK_TIMER_EXPIRED': 0x00001AAD,
		'ERROR_TXF_ATTRIBUTE_CORRUPT': 0x00001AAE,
		'ERROR_EFS_NOT_ALLOWED_IN_TRANSACTION': 0x00001AAF,
		'ERROR_TRANSACTIONAL_OPEN_NOT_ALLOWED': 0x00001AB0,
		'ERROR_LOG_GROWTH_FAILED': 0x00001AB1,
		'ERROR_TRANSACTED_MAPPING_UNSUPPORTED_REMOTE': 0x00001AB2,
		'ERROR_TXF_METADATA_ALREADY_PRESENT': 0x00001AB3,
		'ERROR_TRANSACTION_SCOPE_CALLBACKS_NOT_SET': 0x00001AB4,
		'ERROR_TRANSACTION_REQUIRED_PROMOTION': 0x00001AB5,
		'ERROR_CANNOT_EXECUTE_FILE_IN_TRANSACTION': 0x00001AB6,
		'ERROR_TRANSACTIONS_NOT_FROZEN': 0x00001AB7,
		'ERROR_TRANSACTION_FREEZE_IN_PROGRESS': 0x00001AB8,
		'ERROR_NOT_SNAPSHOT_VOLUME': 0x00001AB9,
		'ERROR_NO_SAVEPOINT_WITH_OPEN_FILES': 0x00001ABA,
		'ERROR_DATA_LOST_REPAIR': 0x00001ABB,
		'ERROR_SPARSE_NOT_ALLOWED_IN_TRANSACTION': 0x00001ABC,
		'ERROR_TM_IDENTITY_MISMATCH': 0x00001ABD,
		'ERROR_FLOATED_SECTION': 0x00001ABE,
		'ERROR_CANNOT_ACCEPT_TRANSACTED_WORK': 0x00001ABF,
		'ERROR_CANNOT_ABORT_TRANSACTIONS': 0x00001AC0,
		'ERROR_CTX_WINSTATION_NAME_INVALID': 0x00001B59,
		'ERROR_CTX_INVALID_PD': 0x00001B5A,
		'ERROR_CTX_PD_NOT_FOUND': 0x00001B5B,
		'ERROR_CTX_WD_NOT_FOUND': 0x00001B5C,
		'ERROR_CTX_CANNOT_MAKE_EVENTLOG_ENTRY': 0x00001B5D,
		'ERROR_CTX_SERVICE_NAME_COLLISION': 0x00001B5E,
		'ERROR_CTX_CLOSE_PENDING': 0x00001B5F,
		'ERROR_CTX_NO_OUTBUF': 0x00001B60,
		'ERROR_CTX_MODEM_INF_NOT_FOUND': 0x00001B61,
		'ERROR_CTX_INVALID_MODEMNAME': 0x00001B62,
		'ERROR_CTX_MODEM_RESPONSE_ERROR': 0x00001B63,
		'ERROR_CTX_MODEM_RESPONSE_TIMEOUT': 0x00001B64,
		'ERROR_CTX_MODEM_RESPONSE_NO_CARRIER': 0x00001B65,
		'ERROR_CTX_MODEM_RESPONSE_NO_DIALTONE': 0x00001B66,
		'ERROR_CTX_MODEM_RESPONSE_BUSY': 0x00001B67,
		'ERROR_CTX_MODEM_RESPONSE_VOICE': 0x00001B68,
		'ERROR_CTX_TD_ERROR': 0x00001B69,
		'ERROR_CTX_WINSTATION_NOT_FOUND': 0x00001B6E,
		'ERROR_CTX_WINSTATION_ALREADY_EXISTS': 0x00001B6F,
		'ERROR_CTX_WINSTATION_BUSY': 0x00001B70,
		'ERROR_CTX_BAD_VIDEO_MODE': 0x00001B71,
		'ERROR_CTX_GRAPHICS_INVALID': 0x00001B7B,
		'ERROR_CTX_LOGON_DISABLED': 0x00001B7D,
		'ERROR_CTX_NOT_CONSOLE': 0x00001B7E,
		'ERROR_CTX_CLIENT_QUERY_TIMEOUT': 0x00001B80,
		'ERROR_CTX_CONSOLE_DISCONNECT': 0x00001B81,
		'ERROR_CTX_CONSOLE_CONNECT': 0x00001B82,
		'ERROR_CTX_SHADOW_DENIED': 0x00001B84,
		'ERROR_CTX_WINSTATION_ACCESS_DENIED': 0x00001B85,
		'ERROR_CTX_INVALID_WD': 0x00001B89,
		'ERROR_CTX_SHADOW_INVALID': 0x00001B8A,
		'ERROR_CTX_SHADOW_DISABLED': 0x00001B8B,
		'ERROR_CTX_CLIENT_LICENSE_IN_USE': 0x00001B8C,
		'ERROR_CTX_CLIENT_LICENSE_NOT_SET': 0x00001B8D,
		'ERROR_CTX_LICENSE_NOT_AVAILABLE': 0x00001B8E,
		'ERROR_CTX_LICENSE_CLIENT_INVALID': 0x00001B8F,
		'ERROR_CTX_LICENSE_EXPIRED': 0x00001B90,
		'ERROR_CTX_SHADOW_NOT_RUNNING': 0x00001B91,
		'ERROR_CTX_SHADOW_ENDED_BY_MODE_CHANGE': 0x00001B92,
		'ERROR_ACTIVATION_COUNT_EXCEEDED': 0x00001B93,
		'ERROR_CTX_WINSTATIONS_DISABLED': 0x00001B94,
		'ERROR_CTX_ENCRYPTION_LEVEL_REQUIRED': 0x00001B95,
		'ERROR_CTX_SESSION_IN_USE': 0x00001B96,
		'ERROR_CTX_NO_FORCE_LOGOFF': 0x00001B97,
		'ERROR_CTX_ACCOUNT_RESTRICTION': 0x00001B98,
		'ERROR_RDP_PROTOCOL_ERROR': 0x00001B99,
		'ERROR_CTX_CDM_CONNECT': 0x00001B9A,
		'ERROR_CTX_CDM_DISCONNECT': 0x00001B9B,
		'ERROR_CTX_SECURITY_LAYER_ERROR': 0x00001B9C,
		'ERROR_TS_INCOMPATIBLE_SESSIONS': 0x00001B9D,
		'FRS_ERR_INVALID_API_SEQUENCE': 0x00001F41,
		'FRS_ERR_STARTING_SERVICE': 0x00001F42,
		'FRS_ERR_STOPPING_SERVICE': 0x00001F43,
		'FRS_ERR_INTERNAL_API': 0x00001F44,
		'FRS_ERR_INTERNAL': 0x00001F45,
		'FRS_ERR_SERVICE_COMM': 0x00001F46,
		'FRS_ERR_INSUFFICIENT_PRIV': 0x00001F47,
		'FRS_ERR_AUTHENTICATION': 0x00001F48,
		'FRS_ERR_PARENT_INSUFFICIENT_PRIV': 0x00001F49,
		'FRS_ERR_PARENT_AUTHENTICATION': 0x00001F4A,
		'FRS_ERR_CHILD_TO_PARENT_COMM': 0x00001F4B,
		'FRS_ERR_PARENT_TO_CHILD_COMM': 0x00001F4C,
		'FRS_ERR_SYSVOL_POPULATE': 0x00001F4D,
		'FRS_ERR_SYSVOL_POPULATE_TIMEOUT': 0x00001F4E,
		'FRS_ERR_SYSVOL_IS_BUSY': 0x00001F4F,
		'FRS_ERR_SYSVOL_DEMOTE': 0x00001F50,
		'FRS_ERR_INVALID_SERVICE_PARAMETER': 0x00001F51,
		'ERROR_DS_NOT_INSTALLED': 0x00002008,
		'ERROR_DS_MEMBERSHIP_EVALUATED_LOCALLY': 0x00002009,
		'ERROR_DS_NO_ATTRIBUTE_OR_VALUE': 0x0000200A,
		'ERROR_DS_INVALID_ATTRIBUTE_YNTAX': 0x0000200B,
		'ERROR_DS_ATTRIBUTE_TYPE_UNDEFINED': 0x0000200C,
		'ERROR_DS_ATTRIBUTE_OR_VALUE_EXISTS': 0x0000200D,
		'ERROR_DS_BUSY': 0x0000200E,
		'ERROR_DS_UNAVAILABLE': 0x0000200F,
		'ERROR_DS_NO_RIDS_ALLOCATED': 0x00002010,
		'ERROR_DS_NO_MORE_RIDS': 0x00002011,
		'ERROR_DS_INCORRECT_ROLE_OWNER': 0x00002012,
		'ERROR_DS_RIDMGR_INIT_ERROR': 0x00002013,
		'ERROR_DS_OBJ_CLASS_VIOLATION': 0x00002014,
		'ERROR_DS_CANT_ON_NON_LEAF': 0x00002015,
		'ERROR_DS_CANT_ON_RDN': 0x00002016,
		'ERROR_DS_CANT_MOD_OBJ_CLASS': 0x00002017,
		'ERROR_DS_CROSS_DOM_MOVE_ERROR': 0x00002018,
		'ERROR_DS_GC_NOT_AVAILABLE': 0x00002019,
		'ERROR_SHARED_POLICY': 0x0000201A,
		'ERROR_POLICY_OBJECT_NOT_FOUND': 0x0000201B,
		'ERROR_POLICY_ONLY_IN_DS': 0x0000201C,
		'ERROR_PROMOTION_ACTIVE': 0x0000201D,
		'ERROR_NO_PROMOTION_ACTIVE': 0x0000201E,
		'ERROR_DS_OPERATIONS_ERROR': 0x00002020,
		'ERROR_DS_PROTOCOL_ERROR': 0x00002021,
		'ERROR_DS_TIMELIMIT_EXCEEDED': 0x00002022,
		'ERROR_DS_SIZELIMIT_EXCEEDED': 0x00002023,
		'ERROR_DS_ADMIN_LIMIT_EXCEEDED': 0x00002024,
		'ERROR_DS_COMPARE_FALSE': 0x00002025,
		'ERROR_DS_COMPARE_TRUE': 0x00002026,
		'ERROR_DS_AUTH_METHOD_NOT_SUPPORTED': 0x00002027,
		'ERROR_DS_STRONG_AUTH_REQUIRED': 0x00002028,
		'ERROR_DS_INAPPROPRIATE_AUTH': 0x00002029,
		'ERROR_DS_AUTH_UNKNOWN': 0x0000202A,
		'ERROR_DS_REFERRAL': 0x0000202B,
		'ERROR_DS_UNAVAILABLE_CRIT_EXTENSION': 0x0000202C,
		'ERROR_DS_CONFIDENTIALITY_REQUIRED': 0x0000202D,
		'ERROR_DS_INAPPROPRIATE_MATCHING': 0x0000202E,
		'ERROR_DS_CONSTRAINT_VIOLATION': 0x0000202F,
		'ERROR_DS_NO_SUCH_OBJECT': 0x00002030,
		'ERROR_DS_ALIAS_PROBLEM': 0x00002031,
		'ERROR_DS_INVALID_DN_SYNTAX': 0x00002032,
		'ERROR_DS_IS_LEAF': 0x00002033,
		'ERROR_DS_ALIAS_DEREF_PROBLEM': 0x00002034,
		'ERROR_DS_UNWILLING_TO_PERFORM': 0x00002035,
		'ERROR_DS_LOOP_DETECT': 0x00002036,
		'ERROR_DS_NAMING_VIOLATION': 0x00002037,
		'ERROR_DS_OBJECT_RESULTS_TOO_LARGE': 0x00002038,
		'ERROR_DS_AFFECTS_MULTIPLE_DSAS': 0x00002039,
		'ERROR_DS_SERVER_DOWN': 0x0000203A,
		'ERROR_DS_LOCAL_ERROR': 0x0000203B,
		'ERROR_DS_ENCODING_ERROR': 0x0000203C,
		'ERROR_DS_DECODING_ERROR': 0x0000203D,
		'ERROR_DS_FILTER_UNKNOWN': 0x0000203E,
		'ERROR_DS_PARAM_ERROR': 0x0000203F,
		'ERROR_DS_NOT_SUPPORTED': 0x00002040,
		'ERROR_DS_NO_RESULTS_RETURNED': 0x00002041,
		'ERROR_DS_CONTROL_NOT_FOUND': 0x00002042,
		'ERROR_DS_CLIENT_LOOP': 0x00002043,
		'ERROR_DS_REFERRAL_LIMIT_EXCEEDED': 0x00002044,
		'ERROR_DS_SORT_CONTROL_MISSING': 0x00002045,
		'ERROR_DS_OFFSET_RANGE_ERROR': 0x00002046,
		'ERROR_DS_ROOT_MUST_BE_NC': 0x0000206D,
		'ERROR_DS_ADD_REPLICA_INHIBITED': 0x0000206E,
		'ERROR_DS_ATT_NOT_DEF_IN_SCHEMA': 0x0000206F,
		'ERROR_DS_MAX_OBJ_SIZE_EXCEEDED': 0x00002070,
		'ERROR_DS_OBJ_STRING_NAME_EXISTS': 0x00002071,
		'ERROR_DS_NO_RDN_DEFINED_IN_SCHEMA': 0x00002072,
		'ERROR_DS_RDN_DOESNT_MATCH_SCHEMA': 0x00002073,
		'ERROR_DS_NO_REQUESTED_ATTS_FOUND': 0x00002074,
		'ERROR_DS_USER_BUFFER_TO_SMALL': 0x00002075,
		'ERROR_DS_ATT_IS_NOT_ON_OBJ': 0x00002076,
		'ERROR_DS_ILLEGAL_MOD_OPERATION': 0x00002077,
		'ERROR_DS_OBJ_TOO_LARGE': 0x00002078,
		'ERROR_DS_BAD_INSTANCE_TYPE': 0x00002079,
		'ERROR_DS_MASTERDSA_REQUIRED': 0x0000207A,
		'ERROR_DS_OBJECT_CLASS_REQUIRED': 0x0000207B,
		'ERROR_DS_MISSING_REQUIRED_ATT': 0x0000207C,
		'ERROR_DS_ATT_NOT_DEF_FOR_CLASS': 0x0000207D,
		'ERROR_DS_ATT_ALREADY_EXISTS': 0x0000207E,
		'ERROR_DS_CANT_ADD_ATT_VALUES': 0x00002080,
		'ERROR_DS_SINGLE_VALUE_CONSTRAINT': 0x00002081,
		'ERROR_DS_RANGE_CONSTRAINT': 0x00002082,
		'ERROR_DS_ATT_VAL_ALREADY_EXISTS': 0x00002083,
		'ERROR_DS_CANT_REM_MISSING_ATT': 0x00002084,
		'ERROR_DS_CANT_REM_MISSING_ATT_VAL': 0x00002085,
		'ERROR_DS_ROOT_CANT_BE_SUBREF': 0x00002086,
		'ERROR_DS_NO_CHAINING': 0x00002087,
		'ERROR_DS_NO_CHAINED_EVAL': 0x00002088,
		'ERROR_DS_NO_PARENT_OBJECT': 0x00002089,
		'ERROR_DS_PARENT_IS_AN_ALIAS': 0x0000208A,
		'ERROR_DS_CANT_MIX_MASTER_AND_REPS': 0x0000208B,
		'ERROR_DS_CHILDREN_EXIST': 0x0000208C,
		'ERROR_DS_OBJ_NOT_FOUND': 0x0000208D,
		'ERROR_DS_ALIASED_OBJ_MISSING': 0x0000208E,
		'ERROR_DS_BAD_NAME_SYNTAX': 0x0000208F,
		'ERROR_DS_ALIAS_POINTS_TO_ALIAS': 0x00002090,
		'ERROR_DS_CANT_DEREF_ALIAS': 0x00002091,
		'ERROR_DS_OUT_OF_SCOPE': 0x00002092,
		'ERROR_DS_OBJECT_BEING_REMOVED': 0x00002093,
		'ERROR_DS_CANT_DELETE_DSA_OBJ': 0x00002094,
		'ERROR_DS_GENERIC_ERROR': 0x00002095,
		'ERROR_DS_DSA_MUST_BE_INT_MASTER': 0x00002096,
		'ERROR_DS_CLASS_NOT_DSA': 0x00002097,
		'ERROR_DS_INSUFF_ACCESS_RIGHTS': 0x00002098,
		'ERROR_DS_ILLEGAL_SUPERIOR': 0x00002099,
		'ERROR_DS_ATTRIBUTE_OWNED_BY_SAM': 0x0000209A,
		'ERROR_DS_NAME_TOO_MANY_PARTS': 0x0000209B,
		'ERROR_DS_NAME_TOO_LONG': 0x0000209C,
		'ERROR_DS_NAME_VALUE_TOO_LONG': 0x0000209D,
		'ERROR_DS_NAME_UNPARSEABLE': 0x0000209E,
		'ERROR_DS_NAME_TYPE_UNKNOWN': 0x0000209F,
		'ERROR_DS_NOT_AN_OBJECT': 0x000020A0,
		'ERROR_DS_SEC_DESC_TOO_SHORT': 0x000020A1,
		'ERROR_DS_SEC_DESC_INVALID': 0x000020A2,
		'ERROR_DS_NO_DELETED_NAME': 0x000020A3,
		'ERROR_DS_SUBREF_MUST_HAVE_PARENT': 0x000020A4,
		'ERROR_DS_NCNAME_MUST_BE_NC': 0x000020A5,
		'ERROR_DS_CANT_ADD_SYSTEM_ONLY': 0x000020A6,
		'ERROR_DS_CLASS_MUST_BE_CONCRETE': 0x000020A7,
		'ERROR_DS_INVALID_DMD': 0x000020A8,
		'ERROR_DS_OBJ_GUID_EXISTS': 0x000020A9,
		'ERROR_DS_NOT_ON_BACKLINK': 0x000020AA,
		'ERROR_DS_NO_CROSSREF_FOR_NC': 0x000020AB,
		'ERROR_DS_SHUTTING_DOWN': 0x000020AC,
		'ERROR_DS_UNKNOWN_OPERATION': 0x000020AD,
		'ERROR_DS_INVALID_ROLE_OWNER': 0x000020AE,
		'ERROR_DS_COULDNT_CONTACT_FSMO': 0x000020AF,
		'ERROR_DS_CROSS_NC_DN_RENAME': 0x000020B0,
		'ERROR_DS_CANT_MOD_SYSTEM_ONLY': 0x000020B1,
		'ERROR_DS_REPLICATOR_ONLY': 0x000020B2,
		'ERROR_DS_OBJ_CLASS_NOT_DEFINED': 0x000020B3,
		'ERROR_DS_OBJ_CLASS_NOT_SUBCLASS': 0x000020B4,
		'ERROR_DS_NAME_REFERENCE_INVALID': 0x000020B5,
		'ERROR_DS_CROSS_REF_EXISTS': 0x000020B6,
		'ERROR_DS_CANT_DEL_MASTER_CROSSREF': 0x000020B7,
		'ERROR_DS_SUBTREE_NOTIFY_NOT_NC_HEAD': 0x000020B8,
		'ERROR_DS_NOTIFY_FILTER_TOO_COMPLEX': 0x000020B9,
		'ERROR_DS_DUP_RDN': 0x000020BA,
		'ERROR_DS_DUP_OID': 0x000020BB,
		'ERROR_DS_DUP_MAPI_ID': 0x000020BC,
		'ERROR_DS_DUP_SCHEMA_ID_GUID': 0x000020BD,
		'ERROR_DS_DUP_LDAP_DISPLAY_NAME': 0x000020BE,
		'ERROR_DS_SEMANTIC_ATT_TEST': 0x000020BF,
		'ERROR_DS_SYNTAX_MISMATCH': 0x000020C0,
		'ERROR_DS_EXISTS_IN_MUST_HAVE': 0x000020C1,
		'ERROR_DS_EXISTS_IN_MAY_HAVE': 0x000020C2,
		'ERROR_DS_NONEXISTENT_MAY_HAVE': 0x000020C3,
		'ERROR_DS_NONEXISTENT_MUST_HAVE': 0x000020C4,
		'ERROR_DS_AUX_CLS_TEST_FAIL': 0x000020C5,
		'ERROR_DS_NONEXISTENT_POSS_SUP': 0x000020C6,
		'ERROR_DS_SUB_CLS_TEST_FAIL': 0x000020C7,
		'ERROR_DS_BAD_RDN_ATT_ID_SYNTAX': 0x000020C8,
		'ERROR_DS_EXISTS_IN_AUX_CLS': 0x000020C9,
		'ERROR_DS_EXISTS_IN_SUB_CLS': 0x000020CA,
		'ERROR_DS_EXISTS_IN_POSS_SUP': 0x000020CB,
		'ERROR_DS_RECALCSCHEMA_FAILED': 0x000020CC,
		'ERROR_DS_TREE_DELETE_NOT_FINISHED': 0x000020CD,
		'ERROR_DS_CANT_DELETE': 0x000020CE,
		'ERROR_DS_ATT_SCHEMA_REQ_ID': 0x000020CF,
		'ERROR_DS_BAD_ATT_SCHEMA_SYNTAX': 0x000020D0,
		'ERROR_DS_CANT_CACHE_ATT': 0x000020D1,
		'ERROR_DS_CANT_CACHE_CLASS': 0x000020D2,
		'ERROR_DS_CANT_REMOVE_ATT_CACHE': 0x000020D3,
		'ERROR_DS_CANT_REMOVE_CLASS_CACHE': 0x000020D4,
		'ERROR_DS_CANT_RETRIEVE_DN': 0x000020D5,
		'ERROR_DS_MISSING_SUPREF': 0x000020D6,
		'ERROR_DS_CANT_RETRIEVE_INSTANCE': 0x000020D7,
		'ERROR_DS_CODE_INCONSISTENCY': 0x000020D8,
		'ERROR_DS_DATABASE_ERROR': 0x000020D9,
		'ERROR_DS_GOVERNSID_MISSING': 0x000020DA,
		'ERROR_DS_MISSING_EXPECTED_ATT': 0x000020DB,
		'ERROR_DS_NCNAME_MISSING_CR_REF': 0x000020DC,
		'ERROR_DS_SECURITY_CHECKING_ERROR': 0x000020DD,
		'ERROR_DS_SCHEMA_NOT_LOADED': 0x000020DE,
		'ERROR_DS_SCHEMA_ALLOC_FAILED': 0x000020DF,
		'ERROR_DS_ATT_SCHEMA_REQ_SYNTAX': 0x000020E0,
		'ERROR_DS_GCVERIFY_ERROR': 0x000020E1,
		'ERROR_DS_DRA_SCHEMA_MISMATCH': 0x000020E2,
		'ERROR_DS_CANT_FIND_DSA_OBJ': 0x000020E3,
		'ERROR_DS_CANT_FIND_EXPECTED_NC': 0x000020E4,
		'ERROR_DS_CANT_FIND_NC_IN_CACHE': 0x000020E5,
		'ERROR_DS_CANT_RETRIEVE_CHILD': 0x000020E6,
		'ERROR_DS_SECURITY_ILLEGAL_MODIFY': 0x000020E7,
		'ERROR_DS_CANT_REPLACE_HIDDEN_REC': 0x000020E8,
		'ERROR_DS_BAD_HIERARCHY_FILE': 0x000020E9,
		'ERROR_DS_BUILD_HIERARCHY_TABLE_FAILED': 0x000020EA,
		'ERROR_DS_CONFIG_PARAM_MISSING': 0x000020EB,
		'ERROR_DS_COUNTING_AB_INDICES_FAILED': 0x000020EC,
		'ERROR_DS_HIERARCHY_TABLE_MALLOC_FAILED': 0x000020ED,
		'ERROR_DS_INTERNAL_FAILURE': 0x000020EE,
		'ERROR_DS_UNKNOWN_ERROR': 0x000020EF,
		'ERROR_DS_ROOT_REQUIRES_CLASS_TOP': 0x000020F0,
		'ERROR_DS_REFUSING_FSMO_ROLES': 0x000020F1,
		'ERROR_DS_MISSING_FSMO_SETTINGS': 0x000020F2,
		'ERROR_DS_UNABLE_TO_SURRENDER_ROLES': 0x000020F3,
		'ERROR_DS_DRA_GENERIC': 0x000020F4,
		'ERROR_DS_DRA_INVALID_PARAMETER': 0x000020F5,
		'ERROR_DS_DRA_BUSY': 0x000020F6,
		'ERROR_DS_DRA_BAD_DN': 0x000020F7,
		'ERROR_DS_DRA_BAD_NC': 0x000020F8,
		'ERROR_DS_DRA_DN_EXISTS': 0x000020F9,
		'ERROR_DS_DRA_INTERNAL_ERROR': 0x000020FA,
		'ERROR_DS_DRA_INCONSISTENT_DIT': 0x000020FB,
		'ERROR_DS_DRA_CONNECTION_FAILED': 0x000020FC,
		'ERROR_DS_DRA_BAD_INSTANCE_TYPE': 0x000020FD,
		'ERROR_DS_DRA_OUT_OF_MEM': 0x000020FE,
		'ERROR_DS_DRA_MAIL_PROBLEM': 0x000020FF,
		'ERROR_DS_DRA_REF_ALREADY_EXISTS': 0x00002100,
		'ERROR_DS_DRA_REF_NOT_FOUND': 0x00002101,
		'ERROR_DS_DRA_OBJ_IS_REP_SOURCE': 0x00002102,
		'ERROR_DS_DRA_DB_ERROR': 0x00002103,
		'ERROR_DS_DRA_NO_REPLICA': 0x00002104,
		'ERROR_DS_DRA_ACCESS_DENIED': 0x00002105,
		'ERROR_DS_DRA_NOT_SUPPORTED': 0x00002106,
		'ERROR_DS_DRA_RPC_CANCELLED': 0x00002107,
		'ERROR_DS_DRA_SOURCE_DISABLED': 0x00002108,
		'ERROR_DS_DRA_SINK_DISABLED': 0x00002109,
		'ERROR_DS_DRA_NAME_COLLISION': 0x0000210A,
		'ERROR_DS_DRA_SOURCE_REINSTALLED': 0x0000210B,
		'ERROR_DS_DRA_MISSING_PARENT': 0x0000210C,
		'ERROR_DS_DRA_PREEMPTED': 0x0000210D,
		'ERROR_DS_DRA_ABANDON_SYNC': 0x0000210E,
		'ERROR_DS_DRA_SHUTDOWN': 0x0000210F,
		'ERROR_DS_DRA_INCOMPATIBLE_PARTIAL_SET': 0x00002110,
		'ERROR_DS_DRA_SOURCE_IS_PARTIAL_REPLICA': 0x00002111,
		'ERROR_DS_DRA_EXTN_CONNECTION_FAILED': 0x00002112,
		'ERROR_DS_INSTALL_SCHEMA_MISMATCH': 0x00002113,
		'ERROR_DS_DUP_LINK_ID': 0x00002114,
		'ERROR_DS_NAME_ERROR_RESOLVING': 0x00002115,
		'ERROR_DS_NAME_ERROR_NOT_FOUND': 0x00002116,
		'ERROR_DS_NAME_ERROR_NOT_UNIQUE': 0x00002117,
		'ERROR_DS_NAME_ERROR_NO_MAPPING': 0x00002118,
		'ERROR_DS_NAME_ERROR_DOMAIN_ONLY': 0x00002119,
		'ERROR_DS_NAME_ERROR_NO_SYNTACTICAL_MAPPING': 0x0000211A,
		'ERROR_DS_CONSTRUCTED_ATT_MOD': 0x0000211B,
		'ERROR_DS_WRONG_OM_OBJ_CLASS': 0x0000211C,
		'ERROR_DS_DRA_REPL_PENDING': 0x0000211D,
		'ERROR_DS_DS_REQUIRED': 0x0000211E,
		'ERROR_DS_INVALID_LDAP_DISPLAY_NAME': 0x0000211F,
		'ERROR_DS_NON_BASE_SEARCH': 0x00002120,
		'ERROR_DS_CANT_RETRIEVE_ATTS': 0x00002121,
		'ERROR_DS_BACKLINK_WITHOUT_LINK': 0x00002122,
		'ERROR_DS_EPOCH_MISMATCH': 0x00002123,
		'ERROR_DS_SRC_NAME_MISMATCH': 0x00002124,
		'ERROR_DS_SRC_AND_DST_NC_IDENTICAL': 0x00002125,
		'ERROR_DS_DST_NC_MISMATCH': 0x00002126,
		'ERROR_DS_NOT_AUTHORITIVE_FOR_DST_NC': 0x00002127,
		'ERROR_DS_SRC_GUID_MISMATCH': 0x00002128,
		'ERROR_DS_CANT_MOVE_DELETED_OBJECT': 0x00002129,
		'ERROR_DS_PDC_OPERATION_IN_PROGRESS': 0x0000212A,
		'ERROR_DS_CROSS_DOMAIN_CLEANUP_REQD': 0x0000212B,
		'ERROR_DS_ILLEGAL_XDOM_MOVE_OPERATION': 0x0000212C,
		'ERROR_DS_CANT_WITH_ACCT_GROUP_MEMBERSHPS': 0x0000212D,
		'ERROR_DS_NC_MUST_HAVE_NC_PARENT': 0x0000212E,
		'ERROR_DS_CR_IMPOSSIBLE_TO_VALIDATE': 0x0000212F,
		'ERROR_DS_DST_DOMAIN_NOT_NATIVE': 0x00002130,
		'ERROR_DS_MISSING_INFRASTRUCTURE_CONTAINER': 0x00002131,
		'ERROR_DS_CANT_MOVE_ACCOUNT_GROUP': 0x00002132,
		'ERROR_DS_CANT_MOVE_RESOURCE_GROUP': 0x00002133,
		'ERROR_DS_INVALID_SEARCH_FLAG': 0x00002134,
		'ERROR_DS_NO_TREE_DELETE_ABOVE_NC': 0x00002135,
		'ERROR_DS_COULDNT_LOCK_TREE_FOR_DELETE': 0x00002136,
		'ERROR_DS_COULDNT_IDENTIFY_OBJECTS_FOR_TREE_DELETE': 0x00002137,
		'ERROR_DS_SAM_INIT_FAILURE': 0x00002138,
		'ERROR_DS_SENSITIVE_GROUP_VIOLATION': 0x00002139,
		'ERROR_DS_CANT_MOD_PRIMARYGROUPID': 0x0000213A,
		'ERROR_DS_ILLEGAL_BASE_SCHEMA_MOD': 0x0000213B,
		'ERROR_DS_NONSAFE_SCHEMA_CHANGE': 0x0000213C,
		'ERROR_DS_SCHEMA_UPDATE_DISALLOWED': 0x0000213D,
		'ERROR_DS_CANT_CREATE_UNDER_SCHEMA': 0x0000213E,
		'ERROR_DS_INSTALL_NO_SRC_SCH_VERSION': 0x0000213F,
		'ERROR_DS_INSTALL_NO_SCH_VERSION_IN_INIFILE': 0x00002140,
		'ERROR_DS_INVALID_GROUP_TYPE': 0x00002141,
		'ERROR_DS_NO_NEST_GLOBALGROUP_IN_MIXEDDOMAIN': 0x00002142,
		'ERROR_DS_NO_NEST_LOCALGROUP_IN_MIXEDDOMAIN': 0x00002143,
		'ERROR_DS_GLOBAL_CANT_HAVE_LOCAL_MEMBER': 0x00002144,
		'ERROR_DS_GLOBAL_CANT_HAVE_UNIVERSAL_MEMBER': 0x00002145,
		'ERROR_DS_UNIVERSAL_CANT_HAVE_LOCAL_MEMBER': 0x00002146,
		'ERROR_DS_GLOBAL_CANT_HAVE_CROSSDOMAIN_MEMBER': 0x00002147,
		'ERROR_DS_LOCAL_CANT_HAVE_CROSSDOMAIN_LOCAL_MEMBER': 0x00002148,
		'ERROR_DS_HAVE_PRIMARY_MEMBERS': 0x00002149,
		'ERROR_DS_STRING_SD_CONVERSION_FAILED': 0x0000214A,
		'ERROR_DS_NAMING_MASTER_GC': 0x0000214B,
		'ERROR_DS_DNS_LOOKUP_FAILURE': 0x0000214C,
		'ERROR_DS_COULDNT_UPDATE_SPNS': 0x0000214D,
		'ERROR_DS_CANT_RETRIEVE_SD': 0x0000214E,
		'ERROR_DS_KEY_NOT_UNIQUE': 0x0000214F,
		'ERROR_DS_WRONG_LINKED_ATT_SYNTAX': 0x00002150,
		'ERROR_DS_SAM_NEED_BOOTKEY_PASSWORD': 0x00002151,
		'ERROR_DS_SAM_NEED_BOOTKEY_FLOPPY': 0x00002152,
		'ERROR_DS_CANT_START': 0x00002153,
		'ERROR_DS_INIT_FAILURE': 0x00002154,
		'ERROR_DS_NO_PKT_PRIVACY_ON_CONNECTION': 0x00002155,
		'ERROR_DS_SOURCE_DOMAIN_IN_FOREST': 0x00002156,
		'ERROR_DS_DESTINATION_DOMAIN_NOT_IN_FOREST': 0x00002157,
		'ERROR_DS_DESTINATION_AUDITING_NOT_ENABLED': 0x00002158,
		'ERROR_DS_CANT_FIND_DC_FOR_SRC_DOMAIN': 0x00002159,
		'ERROR_DS_SRC_OBJ_NOT_GROUP_OR_USER': 0x0000215A,
		'ERROR_DS_SRC_SID_EXISTS_IN_FOREST': 0x0000215B,
		'ERROR_DS_SRC_AND_DST_OBJECT_CLASS_MISMATCH': 0x0000215C,
		'ERROR_SAM_INIT_FAILURE': 0x0000215D,
		'ERROR_DS_DRA_SCHEMA_INFO_SHIP': 0x0000215E,
		'ERROR_DS_DRA_SCHEMA_CONFLICT': 0x0000215F,
		'ERROR_DS_DRA_EARLIER_SCHEMA_CONFLICT': 0x00002160,
		'ERROR_DS_DRA_OBJ_NC_MISMATCH': 0x00002161,
		'ERROR_DS_NC_STILL_HAS_DSAS': 0x00002162,
		'ERROR_DS_GC_REQUIRED': 0x00002163,
		'ERROR_DS_LOCAL_MEMBER_OF_LOCAL_ONLY': 0x00002164,
		'ERROR_DS_NO_FPO_IN_UNIVERSAL_GROUPS': 0x00002165,
		'ERROR_DS_CANT_ADD_TO_GC': 0x00002166,
		'ERROR_DS_NO_CHECKPOINT_WITH_PDC': 0x00002167,
		'ERROR_DS_SOURCE_AUDITING_NOT_ENABLED': 0x00002168,
		'ERROR_DS_CANT_CREATE_IN_NONDOMAIN_NC': 0x00002169,
		'ERROR_DS_INVALID_NAME_FOR_SPN': 0x0000216A,
		'ERROR_DS_FILTER_USES_CONTRUCTED_ATTRS': 0x0000216B,
		'ERROR_DS_UNICODEPWD_NOT_IN_QUOTES': 0x0000216C,
		'ERROR_DS_MACHINE_ACCOUNT_QUOTA_EXCEEDED': 0x0000216D,
		'ERROR_DS_MUST_BE_RUN_ON_DST_DC': 0x0000216E,
		'ERROR_DS_SRC_DC_MUST_BE_SP4_OR_GREATER': 0x0000216F,
		'ERROR_DS_CANT_TREE_DELETE_CRITICAL_OBJ': 0x00002170,
		'ERROR_DS_INIT_FAILURE_CONSOLE': 0x00002171,
		'ERROR_DS_SAM_INIT_FAILURE_CONSOLE': 0x00002172,
		'ERROR_DS_FOREST_VERSION_TOO_HIGH': 0x00002173,
		'ERROR_DS_DOMAIN_VERSION_TOO_HIGH': 0x00002174,
		'ERROR_DS_FOREST_VERSION_TOO_LOW': 0x00002175,
		'ERROR_DS_DOMAIN_VERSION_TOO_LOW': 0x00002176,
		'ERROR_DS_INCOMPATIBLE_VERSION': 0x00002177,
		'ERROR_DS_LOW_DSA_VERSION': 0x00002178,
		'ERROR_DS_NO_BEHAVIOR_VERSION_IN_MIXEDDOMAIN': 0x00002179,
		'ERROR_DS_NOT_SUPPORTED_SORT_ORDER': 0x0000217A,
		'ERROR_DS_NAME_NOT_UNIQUE': 0x0000217B,
		'ERROR_DS_MACHINE_ACCOUNT_CREATED_PRENT4': 0x0000217C,
		'ERROR_DS_OUT_OF_VERSION_STORE': 0x0000217D,
		'ERROR_DS_INCOMPATIBLE_CONTROLS_USED': 0x0000217E,
		'ERROR_DS_NO_REF_DOMAIN': 0x0000217F,
		'ERROR_DS_RESERVED_LINK_ID': 0x00002180,
		'ERROR_DS_LINK_ID_NOT_AVAILABLE': 0x00002181,
		'ERROR_DS_AG_CANT_HAVE_UNIVERSAL_MEMBER': 0x00002182,
		'ERROR_DS_MODIFYDN_DISALLOWED_BY_INSTANCE_TYPE': 0x00002183,
		'ERROR_DS_NO_OBJECT_MOVE_IN_SCHEMA_NC': 0x00002184,
		'ERROR_DS_MODIFYDN_DISALLOWED_BY_FLAG': 0x00002185,
		'ERROR_DS_MODIFYDN_WRONG_GRANDPARENT': 0x00002186,
		'ERROR_DS_NAME_ERROR_TRUST_REFERRAL': 0x00002187,
		'ERROR_NOT_SUPPORTED_ON_STANDARD_SERVER': 0x00002188,
		'ERROR_DS_CANT_ACCESS_REMOTE_PART_OF_AD': 0x00002189,
		'ERROR_DS_CR_IMPOSSIBLE_TO_VALIDATE_V2': 0x0000218A,
		'ERROR_DS_THREAD_LIMIT_EXCEEDED': 0x0000218B,
		'ERROR_DS_NOT_CLOSEST': 0x0000218C,
		'ERROR_DS_CANT_DERIVE_SPN_WITHOUT_SERVER_REF': 0x0000218D,
		'ERROR_DS_SINGLE_USER_MODE_FAILED': 0x0000218E,
		'ERROR_DS_NTDSCRIPT_SYNTAX_ERROR': 0x0000218F,
		'ERROR_DS_NTDSCRIPT_PROCESS_ERROR': 0x00002190,
		'ERROR_DS_DIFFERENT_REPL_EPOCHS': 0x00002191,
		'ERROR_DS_DRS_EXTENSIONS_CHANGED': 0x00002192,
		'ERROR_DS_REPLICA_SET_CHANGE_NOT_ALLOWED_ON_DISABLED_CR': 0x00002193,
		'ERROR_DS_NO_MSDS_INTID': 0x00002194,
		'ERROR_DS_DUP_MSDS_INTID': 0x00002195,
		'ERROR_DS_EXISTS_IN_RDNATTID': 0x00002196,
		'ERROR_DS_AUTHORIZATION_FAILED': 0x00002197,
		'ERROR_DS_INVALID_SCRIPT': 0x00002198,
		'ERROR_DS_REMOTE_CROSSREF_OP_FAILED': 0x00002199,
		'ERROR_DS_CROSS_REF_BUSY': 0x0000219A,
		'ERROR_DS_CANT_DERIVE_SPN_FOR_DELETED_DOMAIN': 0x0000219B,
		'ERROR_DS_CANT_DEMOTE_WITH_WRITEABLE_NC': 0x0000219C,
		'ERROR_DS_DUPLICATE_ID_FOUND': 0x0000219D,
		'ERROR_DS_INSUFFICIENT_ATTR_TO_CREATE_OBJECT': 0x0000219E,
		'ERROR_DS_GROUP_CONVERSION_ERROR': 0x0000219F,
		'ERROR_DS_CANT_MOVE_APP_BASIC_GROUP': 0x000021A0,
		'ERROR_DS_CANT_MOVE_APP_QUERY_GROUP': 0x000021A1,
		'ERROR_DS_ROLE_NOT_VERIFIED': 0x000021A2,
		'ERROR_DS_WKO_CONTAINER_CANNOT_BE_SPECIAL': 0x000021A3,
		'ERROR_DS_DOMAIN_RENAME_IN_PROGRESS': 0x000021A4,
		'ERROR_DS_EXISTING_AD_CHILD_NC': 0x000021A5,
		'ERROR_DS_REPL_LIFETIME_EXCEEDED': 0x000021A6,
		'ERROR_DS_DISALLOWED_IN_SYSTEM_CONTAINER': 0x000021A7,
		'ERROR_DS_LDAP_SEND_QUEUE_FULL': 0x000021A8,
		'ERROR_DS_DRA_OUT_SCHEDULE_WINDOW': 0x000021A9,
		'ERROR_DS_POLICY_NOT_KNOWN': 0x000021AA,
		'ERROR_NO_SITE_SETTINGS_OBJECT': 0x000021AB,
		'ERROR_NO_SECRETS': 0x000021AC,
		'ERROR_NO_WRITABLE_DC_FOUND': 0x000021AD,
		'ERROR_DS_NO_SERVER_OBJECT': 0x000021AE,
		'ERROR_DS_NO_NTDSA_OBJECT': 0x000021AF,
		'ERROR_DS_NON_ASQ_SEARCH': 0x000021B0,
		'ERROR_DS_AUDIT_FAILURE': 0x000021B1,
		'ERROR_DS_INVALID_SEARCH_FLAG_SUBTREE': 0x000021B2,
		'ERROR_DS_INVALID_SEARCH_FLAG_TUPLE': 0x000021B3,
		'ERROR_DS_HIGH_DSA_VERSION': 0x000021C2,
		'ERROR_DS_SPN_VALUE_NOT_UNIQUE_IN_FOREST': 0x000021C7,
		'ERROR_DS_UPN_VALUE_NOT_UNIQUE_IN_FOREST': 0x000021C8,
		'DNS_ERROR_RCODE_FORMAT_ERROR': 0x00002329,
		'DNS_ERROR_RCODE_SERVER_FAILURE': 0x0000232A,
		'DNS_ERROR_RCODE_NAME_ERROR': 0x0000232B,
		'DNS_ERROR_RCODE_NOT_IMPLEMENTED': 0x0000232C,
		'DNS_ERROR_RCODE_REFUSED': 0x0000232D,
		'DNS_ERROR_RCODE_YXDOMAIN': 0x0000232E,
		'DNS_ERROR_RCODE_YXRRSET': 0x0000232F,
		'DNS_ERROR_RCODE_NXRRSET': 0x00002330,
		'DNS_ERROR_RCODE_NOTAUTH': 0x00002331,
		'DNS_ERROR_RCODE_NOTZONE': 0x00002332,
		'DNS_ERROR_RCODE_BADSIG': 0x00002338,
		'DNS_ERROR_RCODE_BADKEY': 0x00002339,
		'DNS_ERROR_RCODE_BADTIME': 0x0000233A,
		'DNS_INFO_NO_RECORDS': 0x0000251D,
		'DNS_ERROR_BAD_PACKET': 0x0000251E,
		'DNS_ERROR_NO_PACKET': 0x0000251F,
		'DNS_ERROR_RCODE': 0x00002520,
		'DNS_ERROR_UNSECURE_PACKET': 0x00002521,
		'DNS_ERROR_INVALID_TYPE': 0x0000254F,
		'DNS_ERROR_INVALID_IP_ADDRESS': 0x00002550,
		'DNS_ERROR_INVALID_PROPERTY': 0x00002551,
		'DNS_ERROR_TRY_AGAIN_LATER': 0x00002552,
		'DNS_ERROR_NOT_UNIQUE': 0x00002553,
		'DNS_ERROR_NON_RFC_NAME': 0x00002554,
		'DNS_STATUS_FQDN': 0x00002555,
		'DNS_STATUS_DOTTED_NAME': 0x00002556,
		'DNS_STATUS_SINGLE_PART_NAME': 0x00002557,
		'DNS_ERROR_INVALID_NAME_CHAR': 0x00002558,
		'DNS_ERROR_NUMERIC_NAME': 0x00002559,
		'DNS_ERROR_NOT_ALLOWED_ON_ROOT_SERVER': 0x0000255A,
		'DNS_ERROR_NOT_ALLOWED_UNDER_DELEGATION': 0x0000255B,
		'DNS_ERROR_CANNOT_FIND_ROOT_HINTS': 0x0000255C,
		'DNS_ERROR_INCONSISTENT_ROOT_HINTS': 0x0000255D,
		'DNS_ERROR_DWORD_VALUE_TOO_SMALL': 0x0000255E,
		'DNS_ERROR_DWORD_VALUE_TOO_LARGE': 0x0000255F,
		'DNS_ERROR_BACKGROUND_LOADING': 0x00002560,
		'DNS_ERROR_NOT_ALLOWED_ON_RODC': 0x00002561,
		'DNS_ERROR_ZONE_DOES_NOT_EXIST': 0x00002581,
		'DNS_ERROR_NO_ZONE_INFO': 0x00002582,
		'DNS_ERROR_INVALID_ZONE_OPERATION': 0x00002583,
		'DNS_ERROR_ZONE_CONFIGURATION_ERROR': 0x00002584,
		'DNS_ERROR_ZONE_HAS_NO_SOA_RECORD': 0x00002585,
		'DNS_ERROR_ZONE_HAS_NO_NS_RECORDS': 0x00002586,
		'DNS_ERROR_ZONE_LOCKED': 0x00002587,
		'DNS_ERROR_ZONE_CREATION_FAILED': 0x00002588,
		'DNS_ERROR_ZONE_ALREADY_EXISTS': 0x00002589,
		'DNS_ERROR_AUTOZONE_ALREADY_EXISTS': 0x0000258A,
		'DNS_ERROR_INVALID_ZONE_TYPE': 0x0000258B,
		'DNS_ERROR_SECONDARY_REQUIRES_MASTER_IP': 0x0000258C,
		'DNS_ERROR_ZONE_NOT_SECONDARY': 0x0000258D,
		'DNS_ERROR_NEED_SECONDARY_ADDRESSES': 0x0000258E,
		'DNS_ERROR_WINS_INIT_FAILED': 0x0000258F,
		'DNS_ERROR_NEED_WINS_SERVERS': 0x00002590,
		'DNS_ERROR_NBSTAT_INIT_FAILED': 0x00002591,
		'DNS_ERROR_SOA_DELETE_INVALID': 0x00002592,
		'DNS_ERROR_FORWARDER_ALREADY_EXISTS': 0x00002593,
		'DNS_ERROR_ZONE_REQUIRES_MASTER_IP': 0x00002594,
		'DNS_ERROR_ZONE_IS_SHUTDOWN': 0x00002595,
		'DNS_ERROR_PRIMARY_REQUIRES_DATAFILE': 0x000025B3,
		'DNS_ERROR_INVALID_DATAFILE_NAME': 0x000025B4,
		'DNS_ERROR_DATAFILE_OPEN_FAILURE': 0x000025B5,
		'DNS_ERROR_FILE_WRITEBACK_FAILED': 0x000025B6,
		'DNS_ERROR_DATAFILE_PARSING': 0x000025B7,
		'DNS_ERROR_RECORD_DOES_NOT_EXIST': 0x000025E5,
		'DNS_ERROR_RECORD_FORMAT': 0x000025E6,
		'DNS_ERROR_NODE_CREATION_FAILED': 0x000025E7,
		'DNS_ERROR_UNKNOWN_RECORD_TYPE': 0x000025E8,
		'DNS_ERROR_RECORD_TIMED_OUT': 0x000025E9,
		'DNS_ERROR_NAME_NOT_IN_ZONE': 0x000025EA,
		'DNS_ERROR_CNAME_LOOP': 0x000025EB,
		'DNS_ERROR_NODE_IS_CNAME': 0x000025EC,
		'DNS_ERROR_CNAME_COLLISION': 0x000025ED,
		'DNS_ERROR_RECORD_ONLY_AT_ZONE_ROOT': 0x000025EE,
		'DNS_ERROR_RECORD_ALREADY_EXISTS': 0x000025EF,
		'DNS_ERROR_SECONDARY_DATA': 0x000025F0,
		'DNS_ERROR_NO_CREATE_CACHE_DATA': 0x000025F1,
		'DNS_ERROR_NAME_DOES_NOT_EXIST': 0x000025F2,
		'DNS_WARNING_PTR_CREATE_FAILED': 0x000025F3,
		'DNS_WARNING_DOMAIN_UNDELETED': 0x000025F4,
		'DNS_ERROR_DS_UNAVAILABLE': 0x000025F5,
		'DNS_ERROR_DS_ZONE_ALREADY_EXISTS': 0x000025F6,
		'DNS_ERROR_NO_BOOTFILE_IF_DS_ZONE': 0x000025F7,
		'DNS_INFO_AXFR_COMPLETE': 0x00002617,
		'DNS_ERROR_AXFR': 0x00002618,
		'DNS_INFO_ADDED_LOCAL_WINS': 0x00002619,
		'DNS_STATUS_CONTINUE_NEEDED': 0x00002649,
		'DNS_ERROR_NO_TCPIP': 0x0000267B,
		'DNS_ERROR_NO_DNS_SERVERS': 0x0000267C,
		'DNS_ERROR_DP_DOES_NOT_EXIST': 0x000026AD,
		'DNS_ERROR_DP_ALREADY_EXISTS': 0x000026AE,
		'DNS_ERROR_DP_NOT_ENLISTED': 0x000026AF,
		'DNS_ERROR_DP_ALREADY_ENLISTED': 0x000026B0,
		'DNS_ERROR_DP_NOT_AVAILABLE': 0x000026B1,
		'DNS_ERROR_DP_FSMO_ERROR': 0x000026B2,
		'WSAEINTR': 0x00002714,
		'WSAEBADF': 0x00002719,
		'WSAEACCES': 0x0000271D,
		'WSAEFAULT': 0x0000271E,
		'WSAEINVAL': 0x00002726,
		'WSAEMFILE': 0x00002728,
		'WSAEWOULDBLOCK': 0x00002733,
		'WSAEINPROGRESS': 0x00002734,
		'WSAEALREADY': 0x00002735,
		'WSAENOTSOCK': 0x00002736,
		'WSAEDESTADDRREQ': 0x00002737,
		'WSAEMSGSIZE': 0x00002738,
		'WSAEPROTOTYPE': 0x00002739,
		'WSAENOPROTOOPT': 0x0000273A,
		'WSAEPROTONOSUPPORT': 0x0000273B,
		'WSAESOCKTNOSUPPORT': 0x0000273C,
		'WSAEOPNOTSUPP': 0x0000273D,
		'WSAEPFNOSUPPORT': 0x0000273E,
		'WSAEAFNOSUPPORT': 0x0000273F,
		'WSAEADDRINUSE': 0x00002740,
		'WSAEADDRNOTAVAIL': 0x00002741,
		'WSAENETDOWN': 0x00002742,
		'WSAENETUNREACH': 0x00002743,
		'WSAENETRESET': 0x00002744,
		'WSAECONNABORTED': 0x00002745,
		'WSAECONNRESET': 0x00002746,
		'WSAENOBUFS': 0x00002747,
		'WSAEISCONN': 0x00002748,
		'WSAENOTCONN': 0x00002749,
		'WSAESHUTDOWN': 0x0000274A,
		'WSAETOOMANYREFS': 0x0000274B,
		'WSAETIMEDOUT': 0x0000274C,
		'WSAECONNREFUSED': 0x0000274D,
		'WSAELOOP': 0x0000274E,
		'WSAENAMETOOLONG': 0x0000274F,
		'WSAEHOSTDOWN': 0x00002750,
		'WSAEHOSTUNREACH': 0x00002751,
		'WSAENOTEMPTY': 0x00002752,
		'WSAEPROCLIM': 0x00002753,
		'WSAEUSERS': 0x00002754,
		'WSAEDQUOT': 0x00002755,
		'WSAESTALE': 0x00002756,
		'WSAEREMOTE': 0x00002757,
		'WSASYSNOTREADY': 0x0000276B,
		'WSAVERNOTSUPPORTED': 0x0000276C,
		'WSANOTINITIALISED': 0x0000276D,
		'WSAEDISCON': 0x00002775,
		'WSAENOMORE': 0x00002776,
		'WSAECANCELLED': 0x00002777,
		'WSAEINVALIDPROCTABLE': 0x00002778,
		'WSAEINVALIDPROVIDER': 0x00002779,
		'WSAEPROVIDERFAILEDINIT': 0x0000277A,
		'WSASYSCALLFAILURE': 0x0000277B,
		'WSASERVICE_NOT_FOUND': 0x0000277C,
		'WSATYPE_NOT_FOUND': 0x0000277D,
		'WSA_E_NO_MORE': 0x0000277E,
		'WSA_E_CANCELLED': 0x0000277F,
		'WSAEREFUSED': 0x00002780,
		'WSAHOST_NOT_FOUND': 0x00002AF9,
		'WSATRY_AGAIN': 0x00002AFA,
		'WSANO_RECOVERY': 0x00002AFB,
		'WSANO_DATA': 0x00002AFC,
		'WSA_QOS_RECEIVERS': 0x00002AFD,
		'WSA_QOS_SENDERS': 0x00002AFE,
		'WSA_QOS_NO_SENDERS': 0x00002AFF,
		'WSA_QOS_NO_RECEIVERS': 0x00002B00,
		'WSA_QOS_REQUEST_CONFIRMED': 0x00002B01,
		'WSA_QOS_ADMISSION_FAILURE': 0x00002B02,
		'WSA_QOS_POLICY_FAILURE': 0x00002B03,
		'WSA_QOS_BAD_STYLE': 0x00002B04,
		'WSA_QOS_BAD_OBJECT': 0x00002B05,
		'WSA_QOS_TRAFFIC_CTRL_ERROR': 0x00002B06,
		'WSA_QOS_GENERIC_ERROR': 0x00002B07,
		'WSA_QOS_ESERVICETYPE': 0x00002B08,
		'WSA_QOS_EFLOWSPEC': 0x00002B09,
		'WSA_QOS_EPROVSPECBUF': 0x00002B0A,
		'WSA_QOS_EFILTERSTYLE': 0x00002B0B,
		'WSA_QOS_EFILTERTYPE': 0x00002B0C,
		'WSA_QOS_EFILTERCOUNT': 0x00002B0D,
		'WSA_QOS_EOBJLENGTH': 0x00002B0E,
		'WSA_QOS_EFLOWCOUNT': 0x00002B0F,
		'WSA_QOS_EUNKOWNPSOBJ': 0x00002B10,
		'WSA_QOS_EPOLICYOBJ': 0x00002B11,
		'WSA_QOS_EFLOWDESC': 0x00002B12,
		'WSA_QOS_EPSFLOWSPEC': 0x00002B13,
		'WSA_QOS_EPSFILTERSPEC': 0x00002B14,
		'WSA_QOS_ESDMODEOBJ': 0x00002B15,
		'WSA_QOS_ESHAPERATEOBJ': 0x00002B16,
		'WSA_QOS_RESERVED_PETYPE': 0x00002B17,
		'ERROR_IPSEC_QM_POLICY_EXISTS': 0x000032C8,
		'ERROR_IPSEC_QM_POLICY_NOT_FOUND': 0x000032C9,
		'ERROR_IPSEC_QM_POLICY_IN_USE': 0x000032CA,
		'ERROR_IPSEC_MM_POLICY_EXISTS': 0x000032CB,
		'ERROR_IPSEC_MM_POLICY_NOT_FOUND': 0x000032CC,
		'ERROR_IPSEC_MM_POLICY_IN_USE': 0x000032CD,
		'ERROR_IPSEC_MM_FILTER_EXISTS': 0x000032CE,
		'ERROR_IPSEC_MM_FILTER_NOT_FOUND': 0x000032CF,
		'ERROR_IPSEC_TRANSPORT_FILTER_EXISTS': 0x000032D0,
		'ERROR_IPSEC_TRANSPORT_FILTER_NOT_FOUND': 0x000032D1,
		'ERROR_IPSEC_MM_AUTH_EXISTS': 0x000032D2,
		'ERROR_IPSEC_MM_AUTH_NOT_FOUND': 0x000032D3,
		'ERROR_IPSEC_MM_AUTH_IN_USE': 0x000032D4,
		'ERROR_IPSEC_DEFAULT_MM_POLICY_NOT_FOUND': 0x000032D5,
		'ERROR_IPSEC_DEFAULT_MM_AUTH_NOT_FOUND': 0x000032D6,
		'ERROR_IPSEC_DEFAULT_QM_POLICY_NOT_FOUND': 0x000032D7,
		'ERROR_IPSEC_TUNNEL_FILTER_EXISTS': 0x000032D8,
		'ERROR_IPSEC_TUNNEL_FILTER_NOT_FOUND': 0x000032D9,
		'ERROR_IPSEC_MM_FILTER_PENDING_DELETION': 0x000032DA,
		'ERROR_IPSEC_TRANSPORT_FILTER_ENDING_DELETION': 0x000032DB,
		'ERROR_IPSEC_TUNNEL_FILTER_PENDING_DELETION': 0x000032DC,
		'ERROR_IPSEC_MM_POLICY_PENDING_ELETION': 0x000032DD,
		'ERROR_IPSEC_MM_AUTH_PENDING_DELETION': 0x000032DE,
		'ERROR_IPSEC_QM_POLICY_PENDING_DELETION': 0x000032DF,
		'WARNING_IPSEC_MM_POLICY_PRUNED': 0x000032E0,
		'WARNING_IPSEC_QM_POLICY_PRUNED': 0x000032E1,
		'ERROR_IPSEC_IKE_NEG_STATUS_BEGIN': 0x000035E8,
		'ERROR_IPSEC_IKE_AUTH_FAIL': 0x000035E9,
		'ERROR_IPSEC_IKE_ATTRIB_FAIL': 0x000035EA,
		'ERROR_IPSEC_IKE_NEGOTIATION_PENDING': 0x000035EB,
		'ERROR_IPSEC_IKE_GENERAL_PROCESSING_ERROR': 0x000035EC,
		'ERROR_IPSEC_IKE_TIMED_OUT': 0x000035ED,
		'ERROR_IPSEC_IKE_NO_CERT': 0x000035EE,
		'ERROR_IPSEC_IKE_SA_DELETED': 0x000035EF,
		'ERROR_IPSEC_IKE_SA_REAPED': 0x000035F0,
		'ERROR_IPSEC_IKE_MM_ACQUIRE_DROP': 0x000035F1,
		'ERROR_IPSEC_IKE_QM_ACQUIRE_DROP': 0x000035F2,
		'ERROR_IPSEC_IKE_QUEUE_DROP_MM': 0x000035F3,
		'ERROR_IPSEC_IKE_QUEUE_DROP_NO_MM': 0x000035F4,
		'ERROR_IPSEC_IKE_DROP_NO_RESPONSE': 0x000035F5,
		'ERROR_IPSEC_IKE_MM_DELAY_DROP': 0x000035F6,
		'ERROR_IPSEC_IKE_QM_DELAY_DROP': 0x000035F7,
		'ERROR_IPSEC_IKE_ERROR': 0x000035F8,
		'ERROR_IPSEC_IKE_CRL_FAILED': 0x000035F9,
		'ERROR_IPSEC_IKE_INVALID_KEY_USAGE': 0x000035FA,
		'ERROR_IPSEC_IKE_INVALID_CERT_TYPE': 0x000035FB,
		'ERROR_IPSEC_IKE_NO_PRIVATE_KEY': 0x000035FC,
		'ERROR_IPSEC_IKE_DH_FAIL': 0x000035FE,
		'ERROR_IPSEC_IKE_INVALID_HEADER': 0x00003600,
		'ERROR_IPSEC_IKE_NO_POLICY': 0x00003601,
		'ERROR_IPSEC_IKE_INVALID_SIGNATURE': 0x00003602,
		'ERROR_IPSEC_IKE_KERBEROS_ERROR': 0x00003603,
		'ERROR_IPSEC_IKE_NO_PUBLIC_KEY': 0x00003604,
		'ERROR_IPSEC_IKE_PROCESS_ERR': 0x00003605,
		'ERROR_IPSEC_IKE_PROCESS_ERR_SA': 0x00003606,
		'ERROR_IPSEC_IKE_PROCESS_ERR_PROP': 0x00003607,
		'ERROR_IPSEC_IKE_PROCESS_ERR_TRANS': 0x00003608,
		'ERROR_IPSEC_IKE_PROCESS_ERR_KE': 0x00003609,
		'ERROR_IPSEC_IKE_PROCESS_ERR_ID': 0x0000360A,
		'ERROR_IPSEC_IKE_PROCESS_ERR_CERT': 0x0000360B,
		'ERROR_IPSEC_IKE_PROCESS_ERR_CERT_REQ': 0x0000360C,
		'ERROR_IPSEC_IKE_PROCESS_ERR_HASH': 0x0000360D,
		'ERROR_IPSEC_IKE_PROCESS_ERR_SIG': 0x0000360E,
		'ERROR_IPSEC_IKE_PROCESS_ERR_NONCE': 0x0000360F,
		'ERROR_IPSEC_IKE_PROCESS_ERR_NOTIFY': 0x00003610,
		'ERROR_IPSEC_IKE_PROCESS_ERR_DELETE': 0x00003611,
		'ERROR_IPSEC_IKE_PROCESS_ERR_VENDOR': 0x00003612,
		'ERROR_IPSEC_IKE_INVALID_PAYLOAD': 0x00003613,
		'ERROR_IPSEC_IKE_LOAD_SOFT_SA': 0x00003614,
		'ERROR_IPSEC_IKE_SOFT_SA_TORN_DOWN': 0x00003615,
		'ERROR_IPSEC_IKE_INVALID_COOKIE': 0x00003616,
		'ERROR_IPSEC_IKE_NO_PEER_CERT': 0x00003617,
		'ERROR_IPSEC_IKE_PEER_CRL_FAILED': 0x00003618,
		'ERROR_IPSEC_IKE_POLICY_CHANGE': 0x00003619,
		'ERROR_IPSEC_IKE_NO_MM_POLICY': 0x0000361A,
		'ERROR_IPSEC_IKE_NOTCBPRIV': 0x0000361B,
		'ERROR_IPSEC_IKE_SECLOADFAIL': 0x0000361C,
		'ERROR_IPSEC_IKE_FAILSSPINIT': 0x0000361D,
		'ERROR_IPSEC_IKE_FAILQUERYSSP': 0x0000361E,
		'ERROR_IPSEC_IKE_SRVACQFAIL': 0x0000361F,
		'ERROR_IPSEC_IKE_SRVQUERYCRED': 0x00003620,
		'ERROR_IPSEC_IKE_GETSPIFAIL': 0x00003621,
		'ERROR_IPSEC_IKE_INVALID_FILTER': 0x00003622,
		'ERROR_IPSEC_IKE_OUT_OF_MEMORY': 0x00003623,
		'ERROR_IPSEC_IKE_ADD_UPDATE_KEY_FAILED': 0x00003624,
		'ERROR_IPSEC_IKE_INVALID_POLICY': 0x00003625,
		'ERROR_IPSEC_IKE_UNKNOWN_DOI': 0x00003626,
		'ERROR_IPSEC_IKE_INVALID_SITUATION': 0x00003627,
		'ERROR_IPSEC_IKE_DH_FAILURE': 0x00003628,
		'ERROR_IPSEC_IKE_INVALID_GROUP': 0x00003629,
		'ERROR_IPSEC_IKE_ENCRYPT': 0x0000362A,
		'ERROR_IPSEC_IKE_DECRYPT': 0x0000362B,
		'ERROR_IPSEC_IKE_POLICY_MATCH': 0x0000362C,
		'ERROR_IPSEC_IKE_UNSUPPORTED_ID': 0x0000362D,
		'ERROR_IPSEC_IKE_INVALID_HASH': 0x0000362E,
		'ERROR_IPSEC_IKE_INVALID_HASH_ALG': 0x0000362F,
		'ERROR_IPSEC_IKE_INVALID_HASH_SIZE': 0x00003630,
		'ERROR_IPSEC_IKE_INVALID_ENCRYPT_ALG': 0x00003631,
		'ERROR_IPSEC_IKE_INVALID_AUTH_ALG': 0x00003632,
		'ERROR_IPSEC_IKE_INVALID_SIG': 0x00003633,
		'ERROR_IPSEC_IKE_LOAD_FAILED': 0x00003634,
		'ERROR_IPSEC_IKE_RPC_DELETE': 0x00003635,
		'ERROR_IPSEC_IKE_BENIGN_REINIT': 0x00003636,
		'ERROR_IPSEC_IKE_INVALID_RESPONDER_LIFETIME_NOTIFY': 0x00003637,
		'ERROR_IPSEC_IKE_INVALID_CERT_KEYLEN': 0x00003639,
		'ERROR_IPSEC_IKE_MM_LIMIT': 0x0000363A,
		'ERROR_IPSEC_IKE_NEGOTIATION_DISABLED': 0x0000363B,
		'ERROR_IPSEC_IKE_QM_LIMIT': 0x0000363C,
		'ERROR_IPSEC_IKE_MM_EXPIRED': 0x0000363D,
		'ERROR_IPSEC_IKE_PEER_MM_ASSUMED_INVALID': 0x0000363E,
		'ERROR_IPSEC_IKE_CERT_CHAIN_POLICY_MISMATCH': 0x0000363F,
		'ERROR_IPSEC_IKE_UNEXPECTED_MESSAGE_ID': 0x00003640,
		'ERROR_IPSEC_IKE_INVALID_UMATTS': 0x00003641,
		'ERROR_IPSEC_IKE_DOS_COOKIE_SENT': 0x00003642,
		'ERROR_IPSEC_IKE_SHUTTING_DOWN': 0x00003643,
		'ERROR_IPSEC_IKE_CGA_AUTH_FAILED': 0x00003644,
		'ERROR_IPSEC_IKE_PROCESS_ERR_NATOA': 0x00003645,
		'ERROR_IPSEC_IKE_INVALID_MM_FOR_QM': 0x00003646,
		'ERROR_IPSEC_IKE_QM_EXPIRED': 0x00003647,
		'ERROR_IPSEC_IKE_TOO_MANY_FILTERS': 0x00003648,
		'ERROR_IPSEC_IKE_NEG_STATUS_END': 0x00003649,
		'ERROR_SXS_SECTION_NOT_FOUND': 0x000036B0,
		'ERROR_SXS_CANT_GEN_ACTCTX': 0x000036B1,
		'ERROR_SXS_INVALID_ACTCTXDATA_FORMAT': 0x000036B2,
		'ERROR_SXS_ASSEMBLY_NOT_FOUND': 0x000036B3,
		'ERROR_SXS_MANIFEST_FORMAT_ERROR': 0x000036B4,
		'ERROR_SXS_MANIFEST_PARSE_ERROR': 0x000036B5,
		'ERROR_SXS_ACTIVATION_CONTEXT_DISABLED': 0x000036B6,
		'ERROR_SXS_KEY_NOT_FOUND': 0x000036B7,
		'ERROR_SXS_VERSION_CONFLICT': 0x000036B8,
		'ERROR_SXS_WRONG_SECTION_TYPE': 0x000036B9,
		'ERROR_SXS_THREAD_QUERIES_DISABLED': 0x000036BA,
		'ERROR_SXS_PROCESS_DEFAULT_ALREADY_SET': 0x000036BB,
		'ERROR_SXS_UNKNOWN_ENCODING_GROUP': 0x000036BC,
		'ERROR_SXS_UNKNOWN_ENCODING': 0x000036BD,
		'ERROR_SXS_INVALID_XML_NAMESPACE_URI': 0x000036BE,
		'ERROR_SXS_ROOT_MANIFEST_DEPENDENCY_OT_INSTALLED': 0x000036BF,
		'ERROR_SXS_LEAF_MANIFEST_DEPENDENCY_NOT_INSTALLED': 0x000036C0,
		'ERROR_SXS_INVALID_ASSEMBLY_IDENTITY_ATTRIBUTE': 0x000036C1,
		'ERROR_SXS_MANIFEST_MISSING_REQUIRED_DEFAULT_NAMESPACE': 0x000036C2,
		'ERROR_SXS_MANIFEST_INVALID_REQUIRED_DEFAULT_NAMESPACE': 0x000036C3,
		'ERROR_SXS_PRIVATE_MANIFEST_CROSS_PATH_WITH_REPARSE_POINT': 0x000036C4,
		'ERROR_SXS_DUPLICATE_DLL_NAME': 0x000036C5,
		'ERROR_SXS_DUPLICATE_WINDOWCLASS_NAME': 0x000036C6,
		'ERROR_SXS_DUPLICATE_CLSID': 0x000036C7,
		'ERROR_SXS_DUPLICATE_IID': 0x000036C8,
		'ERROR_SXS_DUPLICATE_TLBID': 0x000036C9,
		'ERROR_SXS_DUPLICATE_PROGID': 0x000036CA,
		'ERROR_SXS_DUPLICATE_ASSEMBLY_NAME': 0x000036CB,
		'ERROR_SXS_FILE_HASH_MISMATCH': 0x000036CC,
		'ERROR_SXS_POLICY_PARSE_ERROR': 0x000036CD,
		'ERROR_SXS_XML_E_MISSINGQUOTE': 0x000036CE,
		'ERROR_SXS_XML_E_COMMENTSYNTAX': 0x000036CF,
		'ERROR_SXS_XML_E_BADSTARTNAMECHAR': 0x000036D0,
		'ERROR_SXS_XML_E_BADNAMECHAR': 0x000036D1,
		'ERROR_SXS_XML_E_BADCHARINSTRING': 0x000036D2,
		'ERROR_SXS_XML_E_XMLDECLSYNTAX': 0x000036D3,
		'ERROR_SXS_XML_E_BADCHARDATA': 0x000036D4,
		'ERROR_SXS_XML_E_MISSINGWHITESPACE': 0x000036D5,
		'ERROR_SXS_XML_E_EXPECTINGTAGEND': 0x000036D6,
		'ERROR_SXS_XML_E_MISSINGSEMICOLON': 0x000036D7,
		'ERROR_SXS_XML_E_UNBALANCEDPAREN': 0x000036D8,
		'ERROR_SXS_XML_E_INTERNALERROR': 0x000036D9,
		'ERROR_SXS_XML_E_UNEXPECTED_WHITESPACE': 0x000036DA,
		'ERROR_SXS_XML_E_INCOMPLETE_ENCODING': 0x000036DB,
		'ERROR_SXS_XML_E_MISSING_PAREN': 0x000036DC,
		'ERROR_SXS_XML_E_EXPECTINGCLOSEQUOTE': 0x000036DD,
		'ERROR_SXS_XML_E_MULTIPLE_COLONS': 0x000036DE,
		'ERROR_SXS_XML_E_INVALID_DECIMAL': 0x000036DF,
		'ERROR_SXS_XML_E_INVALID_HEXIDECIMAL': 0x000036E0,
		'ERROR_SXS_XML_E_INVALID_UNICODE': 0x000036E1,
		'ERROR_SXS_XML_E_WHITESPACEORQUESTIONMARK': 0x000036E2,
		'ERROR_SXS_XML_E_UNEXPECTEDENDTAG': 0x000036E3,
		'ERROR_SXS_XML_E_UNCLOSEDTAG': 0x000036E4,
		'ERROR_SXS_XML_E_DUPLICATEATTRIBUTE': 0x000036E5,
		'ERROR_SXS_XML_E_MULTIPLEROOTS': 0x000036E6,
		'ERROR_SXS_XML_E_INVALIDATROOTLEVEL': 0x000036E7,
		'ERROR_SXS_XML_E_BADXMLDECL': 0x000036E8,
		'ERROR_SXS_XML_E_MISSINGROOT': 0x000036E9,
		'ERROR_SXS_XML_E_UNEXPECTEDEOF': 0x000036EA,
		'ERROR_SXS_XML_E_BADPEREFINSUBSET': 0x000036EB,
		'ERROR_SXS_XML_E_UNCLOSEDSTARTTAG': 0x000036EC,
		'ERROR_SXS_XML_E_UNCLOSEDENDTAG': 0x000036ED,
		'ERROR_SXS_XML_E_UNCLOSEDSTRING': 0x000036EE,
		'ERROR_SXS_XML_E_UNCLOSEDCOMMENT': 0x000036EF,
		'ERROR_SXS_XML_E_UNCLOSEDDECL': 0x000036F0,
		'ERROR_SXS_XML_E_UNCLOSEDCDATA': 0x000036F1,
		'ERROR_SXS_XML_E_RESERVEDNAMESPACE': 0x000036F2,
		'ERROR_SXS_XML_E_INVALIDENCODING': 0x000036F3,
		'ERROR_SXS_XML_E_INVALIDSWITCH': 0x000036F4,
		'ERROR_SXS_XML_E_BADXMLCASE': 0x000036F5,
		'ERROR_SXS_XML_E_INVALID_STANDALONE': 0x000036F6,
		'ERROR_SXS_XML_E_UNEXPECTED_STANDALONE': 0x000036F7,
		'ERROR_SXS_XML_E_INVALID_VERSION': 0x000036F8,
		'ERROR_SXS_XML_E_MISSINGEQUALS': 0x000036F9,
		'ERROR_SXS_PROTECTION_RECOVERY_FAILED': 0x000036FA,
		'ERROR_SXS_PROTECTION_PUBLIC_KEY_OO_SHORT': 0x000036FB,
		'ERROR_SXS_PROTECTION_CATALOG_NOT_VALID': 0x000036FC,
		'ERROR_SXS_UNTRANSLATABLE_HRESULT': 0x000036FD,
		'ERROR_SXS_PROTECTION_CATALOG_FILE_MISSING': 0x000036FE,
		'ERROR_SXS_MISSING_ASSEMBLY_IDENTITY_ATTRIBUTE': 0x000036FF,
		'ERROR_SXS_INVALID_ASSEMBLY_IDENTITY_ATTRIBUTE_NAME': 0x00003700,
		'ERROR_SXS_ASSEMBLY_MISSING': 0x00003701,
		'ERROR_SXS_CORRUPT_ACTIVATION_STACK': 0x00003702,
		'ERROR_SXS_CORRUPTION': 0x00003703,
		'ERROR_SXS_EARLY_DEACTIVATION': 0x00003704,
		'ERROR_SXS_INVALID_DEACTIVATION': 0x00003705,
		'ERROR_SXS_MULTIPLE_DEACTIVATION': 0x00003706,
		'ERROR_SXS_PROCESS_TERMINATION_REQUESTED': 0x00003707,
		'ERROR_SXS_RELEASE_ACTIVATION_ONTEXT': 0x00003708,
		'ERROR_SXS_SYSTEM_DEFAULT_ACTIVATION_CONTEXT_EMPTY': 0x00003709,
		'ERROR_SXS_INVALID_IDENTITY_ATTRIBUTE_VALUE': 0x0000370A,
		'ERROR_SXS_INVALID_IDENTITY_ATTRIBUTE_NAME': 0x0000370B,
		'ERROR_SXS_IDENTITY_DUPLICATE_ATTRIBUTE': 0x0000370C,
		'ERROR_SXS_IDENTITY_PARSE_ERROR': 0x0000370D,
		'ERROR_MALFORMED_SUBSTITUTION_STRING': 0x0000370E,
		'ERROR_SXS_INCORRECT_PUBLIC_KEY_OKEN': 0x0000370F,
		'ERROR_UNMAPPED_SUBSTITUTION_STRING': 0x00003710,
		'ERROR_SXS_ASSEMBLY_NOT_LOCKED': 0x00003711,
		'ERROR_SXS_COMPONENT_STORE_CORRUPT': 0x00003712,
		'ERROR_ADVANCED_INSTALLER_FAILED': 0x00003713,
		'ERROR_XML_ENCODING_MISMATCH': 0x00003714,
		'ERROR_SXS_MANIFEST_IDENTITY_SAME_BUT_CONTENTS_DIFFERENT': 0x00003715,
		'ERROR_SXS_IDENTITIES_DIFFERENT': 0x00003716,
		'ERROR_SXS_ASSEMBLY_IS_NOT_A_DEPLOYMENT': 0x00003717,
		'ERROR_SXS_FILE_NOT_PART_OF_ASSEMBLY': 0x00003718,
		'ERROR_SXS_MANIFEST_TOO_BIG': 0x00003719,
		'ERROR_SXS_SETTING_NOT_REGISTERED': 0x0000371A,
		'ERROR_SXS_TRANSACTION_CLOSURE_INCOMPLETE': 0x0000371B,
		'ERROR_EVT_INVALID_CHANNEL_PATH': 0x00003A98,
		'ERROR_EVT_INVALID_QUERY': 0x00003A99,
		'ERROR_EVT_PUBLISHER_METADATA_NOT_FOUND': 0x00003A9A,
		'ERROR_EVT_EVENT_TEMPLATE_NOT_FOUND': 0x00003A9B,
		'ERROR_EVT_INVALID_PUBLISHER_NAME': 0x00003A9C,
		'ERROR_EVT_INVALID_EVENT_DATA': 0x00003A9D,
		'ERROR_EVT_CHANNEL_NOT_FOUND': 0x00003A9F,
		'ERROR_EVT_MALFORMED_XML_TEXT': 0x00003AA0,
		'ERROR_EVT_SUBSCRIPTION_TO_DIRECT_CHANNEL': 0x00003AA1,
		'ERROR_EVT_CONFIGURATION_ERROR': 0x00003AA2,
		'ERROR_EVT_QUERY_RESULT_STALE': 0x00003AA3,
		'ERROR_EVT_QUERY_RESULT_INVALID_POSITION': 0x00003AA4,
		'ERROR_EVT_NON_VALIDATING_MSXML': 0x00003AA5,
		'ERROR_EVT_FILTER_ALREADYSCOPED': 0x00003AA6,
		'ERROR_EVT_FILTER_NOTELTSET': 0x00003AA7,
		'ERROR_EVT_FILTER_INVARG': 0x00003AA8,
		'ERROR_EVT_FILTER_INVTEST': 0x00003AA9,
		'ERROR_EVT_FILTER_INVTYPE': 0x00003AAA,
		'ERROR_EVT_FILTER_PARSEERR': 0x00003AAB,
		'ERROR_EVT_FILTER_UNSUPPORTEDOP': 0x00003AAC,
		'ERROR_EVT_FILTER_UNEXPECTEDTOKEN': 0x00003AAD,
		'ERROR_EVT_INVALID_OPERATION_OVER_ENABLED_DIRECT_CHANNEL': 0x00003AAE,
		'ERROR_EVT_INVALID_CHANNEL_PROPERTY_VALUE': 0x00003AAF,
		'ERROR_EVT_INVALID_PUBLISHER_PROPERTY_VALUE': 0x00003AB0,
		'ERROR_EVT_CHANNEL_CANNOT_ACTIVATE': 0x00003AB1,
		'ERROR_EVT_FILTER_TOO_COMPLEX': 0x00003AB2,
		'ERROR_EVT_MESSAGE_NOT_FOUND': 0x00003AB3,
		'ERROR_EVT_MESSAGE_ID_NOT_FOUND': 0x00003AB4,
		'ERROR_EVT_UNRESOLVED_VALUE_INSERT': 0x00003AB5,
		'ERROR_EVT_UNRESOLVED_PARAMETER_INSERT': 0x00003AB6,
		'ERROR_EVT_MAX_INSERTS_REACHED': 0x00003AB7,
		'ERROR_EVT_EVENT_DEFINITION_NOT_OUND': 0x00003AB8,
		'ERROR_EVT_MESSAGE_LOCALE_NOT_FOUND': 0x00003AB9,
		'ERROR_EVT_VERSION_TOO_OLD': 0x00003ABA,
		'ERROR_EVT_VERSION_TOO_NEW': 0x00003ABB,
		'ERROR_EVT_CANNOT_OPEN_CHANNEL_OF_QUERY': 0x00003ABC,
		'ERROR_EVT_PUBLISHER_DISABLED': 0x00003ABD,
		'ERROR_EC_SUBSCRIPTION_CANNOT_ACTIVATE': 0x00003AE8,
		'ERROR_EC_LOG_DISABLED': 0x00003AE9,
		'ERROR_MUI_FILE_NOT_FOUND': 0x00003AFC,
		'ERROR_MUI_INVALID_FILE': 0x00003AFD,
		'ERROR_MUI_INVALID_RC_CONFIG': 0x00003AFE,
		'ERROR_MUI_INVALID_LOCALE_NAME': 0x00003AFF,
		'ERROR_MUI_INVALID_ULTIMATEFALLBACK_NAME': 0x00003B00,
		'ERROR_MUI_FILE_NOT_LOADED': 0x00003B01,
		'ERROR_RESOURCE_ENUM_USER_STOP': 0x00003B02,
		'ERROR_MUI_INTLSETTINGS_UILANG_NOT_INSTALLED': 0x00003B03,
		'ERROR_MUI_INTLSETTINGS_INVALID_LOCALE_NAME': 0x00003B04,
		'ERROR_MCA_INVALID_CAPABILITIES_STRING': 0x00003B60,
		'ERROR_MCA_INVALID_VCP_VERSION': 0x00003B61,
		'ERROR_MCA_MONITOR_VIOLATES_MCCS_SPECIFICATION': 0x00003B62,
		'ERROR_MCA_MCCS_VERSION_MISMATCH': 0x00003B63,
		'ERROR_MCA_UNSUPPORTED_MCCS_VERSION': 0x00003B64,
		'ERROR_MCA_INTERNAL_ERROR': 0x00003B65,
		'ERROR_MCA_INVALID_TECHNOLOGY_TYPE_RETURNED': 0x00003B66,
		'ERROR_MCA_UNSUPPORTED_COLOR_TEMPERATURE': 0x00003B67,
		'ERROR_AMBIGUOUS_SYSTEM_DEVICE': 0x00003B92,
		'ERROR_SYSTEM_DEVICE_NOT_FOUND': 0x00003BC3
	},
	NTSTATUS: {
		'STATUS_SUCCESS': 0x00000000,
		'STATUS_WAIT_0': 0x00000000,
		'STATUS_WAIT_1': 0x00000001,
		'STATUS_WAIT_2': 0x00000002,
		'STATUS_WAIT_3': 0x00000003,
		'STATUS_WAIT_63': 0x0000003F,
		'STATUS_ABANDONED': 0x00000080,
		'STATUS_ABANDONED_WAIT_0': 0x00000080,
		'STATUS_ABANDONED_WAIT_63': 0x000000BF,
		'STATUS_USER_APC': 0x000000C0,
		'STATUS_ALERTED': 0x00000101,
		'STATUS_TIMEOUT': 0x00000102,
		'STATUS_PENDING': 0x00000103,
		'STATUS_REPARSE': 0x00000104,
		'STATUS_MORE_ENTRIES': 0x00000105,
		'STATUS_NOT_ALL_ASSIGNED': 0x00000106,
		'STATUS_SOME_NOT_MAPPED': 0x00000107,
		'STATUS_OPLOCK_BREAK_IN_PROGRESS': 0x00000108,
		'STATUS_VOLUME_MOUNTED': 0x00000109,
		'STATUS_RXACT_COMMITTED': 0x0000010A,
		'STATUS_NOTIFY_CLEANUP': 0x0000010B,
		'STATUS_NOTIFY_ENUM_DIR': 0x0000010C,
		'STATUS_NO_QUOTAS_FOR_ACCOUNT': 0x0000010D,
		'STATUS_PRIMARY_TRANSPORT_CONNECT_FAILED': 0x0000010E,
		'STATUS_PAGE_FAULT_TRANSITION': 0x00000110,
		'STATUS_PAGE_FAULT_DEMAND_ZERO': 0x00000111,
		'STATUS_PAGE_FAULT_COPY_ON_WRITE': 0x00000112,
		'STATUS_PAGE_FAULT_GUARD_PAGE': 0x00000113,
		'STATUS_PAGE_FAULT_PAGING_FILE': 0x00000114,
		'STATUS_CACHE_PAGE_LOCKED': 0x00000115,
		'STATUS_CRASH_DUMP': 0x00000116,
		'STATUS_BUFFER_ALL_ZEROS': 0x00000117,
		'STATUS_REPARSE_OBJECT': 0x00000118,
		'STATUS_RESOURCE_REQUIREMENTS_CHANGED': 0x00000119,
		'STATUS_TRANSLATION_COMPLETE': 0x00000120,
		'STATUS_DS_MEMBERSHIP_EVALUATED_LOCALLY': 0x00000121,
		'STATUS_NOTHING_TO_TERMINATE': 0x00000122,
		'STATUS_PROCESS_NOT_IN_JOB': 0x00000123,
		'STATUS_PROCESS_IN_JOB': 0x00000124,
		'STATUS_VOLSNAP_HIBERNATE_READY': 0x00000125,
		'STATUS_FSFILTER_OP_COMPLETED_SUCCESSFULLY': 0x00000126,
		'STATUS_INTERRUPT_VECTOR_ALREADY_CONNECTED': 0x00000127,
		'STATUS_INTERRUPT_STILL_CONNECTED': 0x00000128,
		'STATUS_PROCESS_CLONED': 0x00000129,
		'STATUS_FILE_LOCKED_WITH_ONLY_READERS': 0x0000012A,
		'STATUS_FILE_LOCKED_WITH_WRITERS': 0x0000012B,
		'STATUS_RESOURCEMANAGER_READ_ONLY': 0x00000202,
		'STATUS_WAIT_FOR_OPLOCK': 0x00000367,
		'DBG_EXCEPTION_HANDLED': 0x00010001,
		'DBG_CONTINUE': 0x00010002,
		'STATUS_FLT_IO_COMPLETE': 0x001C0001,
		'STATUS_FILE_NOT_AVAILABLE': 0xC0000467,
		'STATUS_CALLBACK_RETURNED_THREAD_AFFINITY': 0xC0000721,
		'STATUS_OBJECT_NAME_EXISTS': 0x40000000,
		'STATUS_THREAD_WAS_SUSPENDED': 0x40000001,
		'STATUS_WORKING_SET_LIMIT_RANGE': 0x40000002,
		'STATUS_IMAGE_NOT_AT_BASE': 0x40000003,
		'STATUS_RXACT_STATE_CREATED': 0x40000004,
		'STATUS_SEGMENT_NOTIFICATION': 0x40000005,
		'STATUS_LOCAL_USER_SESSION_KEY': 0x40000006,
		'STATUS_BAD_CURRENT_DIRECTORY': 0x40000007,
		'STATUS_SERIAL_MORE_WRITES': 0x40000008,
		'STATUS_REGISTRY_RECOVERED': 0x40000009,
		'STATUS_FT_READ_RECOVERY_FROM_BACKUP': 0x4000000A,
		'STATUS_FT_WRITE_RECOVERY': 0x4000000B,
		'STATUS_SERIAL_COUNTER_TIMEOUT': 0x4000000C,
		'STATUS_NULL_LM_PASSWORD': 0x4000000D,
		'STATUS_IMAGE_MACHINE_TYPE_MISMATCH': 0x4000000E,
		'STATUS_RECEIVE_PARTIAL': 0x4000000F,
		'STATUS_RECEIVE_EXPEDITED': 0x40000010,
		'STATUS_RECEIVE_PARTIAL_EXPEDITED': 0x40000011,
		'STATUS_EVENT_DONE': 0x40000012,
		'STATUS_EVENT_PENDING': 0x40000013,
		'STATUS_CHECKING_FILE_SYSTEM': 0x40000014,
		'STATUS_FATAL_APP_EXIT': 0x40000015,
		'STATUS_PREDEFINED_HANDLE': 0x40000016,
		'STATUS_WAS_UNLOCKED': 0x40000017,
		'STATUS_SERVICE_NOTIFICATION': 0x40000018,
		'STATUS_WAS_LOCKED': 0x40000019,
		'STATUS_LOG_HARD_ERROR': 0x4000001A,
		'STATUS_ALREADY_WIN32': 0x4000001B,
		'STATUS_WX86_UNSIMULATE': 0x4000001C,
		'STATUS_WX86_CONTINUE': 0x4000001D,
		'STATUS_WX86_SINGLE_STEP': 0x4000001E,
		'STATUS_WX86_BREAKPOINT': 0x4000001F,
		'STATUS_WX86_EXCEPTION_CONTINUE': 0x40000020,
		'STATUS_WX86_EXCEPTION_LASTCHANCE': 0x40000021,
		'STATUS_WX86_EXCEPTION_CHAIN': 0x40000022,
		'STATUS_IMAGE_MACHINE_TYPE_MISMATCH_EXE': 0x40000023,
		'STATUS_NO_YIELD_PERFORMED': 0x40000024,
		'STATUS_TIMER_RESUME_IGNORED': 0x40000025,
		'STATUS_ARBITRATION_UNHANDLED': 0x40000026,
		'STATUS_CARDBUS_NOT_SUPPORTED': 0x40000027,
		'STATUS_WX86_CREATEWX86TIB': 0x40000028,
		'STATUS_MP_PROCESSOR_MISMATCH': 0x40000029,
		'STATUS_HIBERNATED': 0x4000002A,
		'STATUS_RESUME_HIBERNATION': 0x4000002B,
		'STATUS_FIRMWARE_UPDATED': 0x4000002C,
		'STATUS_DRIVERS_LEAKING_LOCKED_PAGES': 0x4000002D,
		'STATUS_MESSAGE_RETRIEVED': 0x4000002E,
		'STATUS_SYSTEM_POWERSTATE_TRANSITION': 0x4000002F,
		'STATUS_ALPC_CHECK_COMPLETION_LIST': 0x40000030,
		'STATUS_SYSTEM_POWERSTATE_COMPLEX_TRANSITION': 0x40000031,
		'STATUS_ACCESS_AUDIT_BY_POLICY': 0x40000032,
		'STATUS_ABANDON_HIBERFILE': 0x40000033,
		'STATUS_BIZRULES_NOT_ENABLED': 0x40000034,
		'STATUS_WAKE_SYSTEM': 0x40000294,
		'STATUS_DS_SHUTTING_DOWN': 0x40000370,
		'DBG_REPLY_LATER': 0x40010001,
		'DBG_UNABLE_TO_PROVIDE_HANDLE': 0x40010002,
		'DBG_TERMINATE_THREAD': 0x40010003,
		'DBG_TERMINATE_PROCESS': 0x40010004,
		'DBG_CONTROL_C': 0x40010005,
		'DBG_PRINTEXCEPTION_C': 0x40010006,
		'DBG_RIPEXCEPTION': 0x40010007,
		'DBG_CONTROL_BREAK': 0x40010008,
		'DBG_COMMAND_EXCEPTION': 0x40010009,
		'RPC_NT_UUID_LOCAL_ONLY': 0x40020056,
		'RPC_NT_SEND_INCOMPLETE': 0x400200AF,
		'STATUS_CTX_CDM_CONNECT': 0x400A0004,
		'STATUS_CTX_CDM_DISCONNECT': 0x400A0005,
		'STATUS_SXS_RELEASE_ACTIVATION_CONTEXT': 0x4015000D,
		'STATUS_RECOVERY_NOT_NEEDED': 0x40190034,
		'STATUS_RM_ALREADY_STARTED': 0x40190035,
		'STATUS_LOG_NO_RESTART': 0x401A000C,
		'STATUS_VIDEO_DRIVER_DEBUG_REPORT_REQUEST': 0x401B00EC,
		'STATUS_GRAPHICS_PARTIAL_DATA_POPULATED': 0x401E000A,
		'STATUS_GRAPHICS_DRIVER_MISMATCH': 0x401E0117,
		'STATUS_GRAPHICS_MODE_NOT_PINNED': 0x401E0307,
		'STATUS_GRAPHICS_NO_PREFERRED_MODE': 0x401E031E,
		'STATUS_GRAPHICS_DATASET_IS_EMPTY': 0x401E034B,
		'STATUS_GRAPHICS_NO_MORE_ELEMENTS_IN_DATASET': 0x401E034C,
		'STATUS_GRAPHICS_PATH_CONTENT_GEOMETRY_TRANSFORMATION_NOT_PINNED': 0x401E0351,
		'STATUS_GRAPHICS_UNKNOWN_CHILD_STATUS': 0x401E042F,
		'STATUS_GRAPHICS_LEADLINK_START_DEFERRED': 0x401E0437,
		'STATUS_GRAPHICS_POLLING_TOO_FREQUENTLY': 0x401E0439,
		'STATUS_GRAPHICS_START_DEFERRED': 0x401E043A,
		'STATUS_NDIS_INDICATION_REQUIRED': 0x40230001,
		'STATUS_GUARD_PAGE_VIOLATION': 0x80000001,
		'STATUS_DATATYPE_MISALIGNMENT': 0x80000002,
		'STATUS_BREAKPOINT': 0x80000003,
		'STATUS_SINGLE_STEP': 0x80000004,
		'STATUS_BUFFER_OVERFLOW': 0x80000005,
		'STATUS_NO_MORE_FILES': 0x80000006,
		'STATUS_WAKE_SYSTEM_DEBUGGER': 0x80000007,
		'STATUS_HANDLES_CLOSED': 0x8000000A,
		'STATUS_NO_INHERITANCE': 0x8000000B,
		'STATUS_GUID_SUBSTITUTION_MADE': 0x8000000C,
		'STATUS_PARTIAL_COPY': 0x8000000D,
		'STATUS_DEVICE_PAPER_EMPTY': 0x8000000E,
		'STATUS_DEVICE_POWERED_OFF': 0x8000000F,
		'STATUS_DEVICE_OFF_LINE': 0x80000010,
		'STATUS_DEVICE_BUSY': 0x80000011,
		'STATUS_NO_MORE_EAS': 0x80000012,
		'STATUS_INVALID_EA_NAME': 0x80000013,
		'STATUS_EA_LIST_INCONSISTENT': 0x80000014,
		'STATUS_INVALID_EA_FLAG': 0x80000015,
		'STATUS_VERIFY_REQUIRED': 0x80000016,
		'STATUS_EXTRANEOUS_INFORMATION': 0x80000017,
		'STATUS_RXACT_COMMIT_NECESSARY': 0x80000018,
		'STATUS_NO_MORE_ENTRIES': 0x8000001A,
		'STATUS_FILEMARK_DETECTED': 0x8000001B,
		'STATUS_MEDIA_CHANGED': 0x8000001C,
		'STATUS_BUS_RESET': 0x8000001D,
		'STATUS_END_OF_MEDIA': 0x8000001E,
		'STATUS_BEGINNING_OF_MEDIA': 0x8000001F,
		'STATUS_MEDIA_CHECK': 0x80000020,
		'STATUS_SETMARK_DETECTED': 0x80000021,
		'STATUS_NO_DATA_DETECTED': 0x80000022,
		'STATUS_REDIRECTOR_HAS_OPEN_HANDLES': 0x80000023,
		'STATUS_SERVER_HAS_OPEN_HANDLES': 0x80000024,
		'STATUS_ALREADY_DISCONNECTED': 0x80000025,
		'STATUS_LONGJUMP': 0x80000026,
		'STATUS_CLEANER_CARTRIDGE_INSTALLED': 0x80000027,
		'STATUS_PLUGPLAY_QUERY_VETOED': 0x80000028,
		'STATUS_UNWIND_CONSOLIDATE': 0x80000029,
		'STATUS_REGISTRY_HIVE_RECOVERED': 0x8000002A,
		'STATUS_DLL_MIGHT_BE_INSECURE': 0x8000002B,
		'STATUS_DLL_MIGHT_BE_INCOMPATIBLE': 0x8000002C,
		'STATUS_STOPPED_ON_SYMLINK': 0x8000002D,
		'STATUS_DEVICE_REQUIRES_CLEANING': 0x80000288,
		'STATUS_DEVICE_DOOR_OPEN': 0x80000289,
		'STATUS_DATA_LOST_REPAIR': 0x80000803,
		'DBG_EXCEPTION_NOT_HANDLED': 0x80010001,
		'STATUS_CLUSTER_NODE_ALREADY_UP': 0x80130001,
		'STATUS_CLUSTER_NODE_ALREADY_DOWN': 0x80130002,
		'STATUS_CLUSTER_NETWORK_ALREADY_ONLINE': 0x80130003,
		'STATUS_CLUSTER_NETWORK_ALREADY_OFFLINE': 0x80130004,
		'STATUS_CLUSTER_NODE_ALREADY_MEMBER': 0x80130005,
		'STATUS_COULD_NOT_RESIZE_LOG': 0x80190009,
		'STATUS_NO_TXF_METADATA': 0x80190029,
		'STATUS_CANT_RECOVER_WITH_HANDLE_OPEN': 0x80190031,
		'STATUS_TXF_METADATA_ALREADY_PRESENT': 0x80190041,
		'STATUS_TRANSACTION_SCOPE_CALLBACKS_NOT_SET': 0x80190042,
		'STATUS_VIDEO_HUNG_DISPLAY_DRIVER_THREAD_RECOVERED': 0x801B00EB,
		'STATUS_FLT_BUFFER_TOO_SMALL': 0x801C0001,
		'STATUS_FVE_PARTIAL_METADATA': 0x80210001,
		'STATUS_FVE_TRANSIENT_STATE': 0x80210002,
		'STATUS_UNSUCCESSFUL': 0xC0000001,
		'STATUS_NOT_IMPLEMENTED': 0xC0000002,
		'STATUS_INVALID_INFO_CLASS': 0xC0000003,
		'STATUS_INFO_LENGTH_MISMATCH': 0xC0000004,
		'STATUS_ACCESS_VIOLATION': 0xC0000005,
		'STATUS_IN_PAGE_ERROR': 0xC0000006,
		'STATUS_PAGEFILE_QUOTA': 0xC0000007,
		'STATUS_INVALID_HANDLE': 0xC0000008,
		'STATUS_BAD_INITIAL_STACK': 0xC0000009,
		'STATUS_BAD_INITIAL_PC': 0xC000000A,
		'STATUS_INVALID_CID': 0xC000000B,
		'STATUS_TIMER_NOT_CANCELED': 0xC000000C,
		'STATUS_INVALID_PARAMETER': 0xC000000D,
		'STATUS_NO_SUCH_DEVICE': 0xC000000E,
		'STATUS_NO_SUCH_FILE': 0xC000000F,
		'STATUS_INVALID_DEVICE_REQUEST': 0xC0000010,
		'STATUS_END_OF_FILE': 0xC0000011,
		'STATUS_WRONG_VOLUME': 0xC0000012,
		'STATUS_NO_MEDIA_IN_DEVICE': 0xC0000013,
		'STATUS_UNRECOGNIZED_MEDIA': 0xC0000014,
		'STATUS_NONEXISTENT_SECTOR': 0xC0000015,
		'STATUS_MORE_PROCESSING_REQUIRED': 0xC0000016,
		'STATUS_NO_MEMORY': 0xC0000017,
		'STATUS_CONFLICTING_ADDRESSES': 0xC0000018,
		'STATUS_NOT_MAPPED_VIEW': 0xC0000019,
		'STATUS_UNABLE_TO_FREE_VM': 0xC000001A,
		'STATUS_UNABLE_TO_DELETE_SECTION': 0xC000001B,
		'STATUS_INVALID_SYSTEM_SERVICE': 0xC000001C,
		'STATUS_ILLEGAL_INSTRUCTION': 0xC000001D,
		'STATUS_INVALID_LOCK_SEQUENCE': 0xC000001E,
		'STATUS_INVALID_VIEW_SIZE': 0xC000001F,
		'STATUS_INVALID_FILE_FOR_SECTION': 0xC0000020,
		'STATUS_ALREADY_COMMITTED': 0xC0000021,
		'STATUS_ACCESS_DENIED': 0xC0000022,
		'STATUS_BUFFER_TOO_SMALL': 0xC0000023,
		'STATUS_OBJECT_TYPE_MISMATCH': 0xC0000024,
		'STATUS_NONCONTINUABLE_EXCEPTION': 0xC0000025,
		'STATUS_INVALID_DISPOSITION': 0xC0000026,
		'STATUS_UNWIND': 0xC0000027,
		'STATUS_BAD_STACK': 0xC0000028,
		'STATUS_INVALID_UNWIND_TARGET': 0xC0000029,
		'STATUS_NOT_LOCKED': 0xC000002A,
		'STATUS_PARITY_ERROR': 0xC000002B,
		'STATUS_UNABLE_TO_DECOMMIT_VM': 0xC000002C,
		'STATUS_NOT_COMMITTED': 0xC000002D,
		'STATUS_INVALID_PORT_ATTRIBUTES': 0xC000002E,
		'STATUS_PORT_MESSAGE_TOO_LONG': 0xC000002F,
		'STATUS_INVALID_PARAMETER_MIX': 0xC0000030,
		'STATUS_INVALID_QUOTA_LOWER': 0xC0000031,
		'STATUS_DISK_CORRUPT_ERROR': 0xC0000032,
		'STATUS_OBJECT_NAME_INVALID': 0xC0000033,
		'STATUS_OBJECT_NAME_NOT_FOUND': 0xC0000034,
		'STATUS_OBJECT_NAME_COLLISION': 0xC0000035,
		'STATUS_PORT_DISCONNECTED': 0xC0000037,
		'STATUS_DEVICE_ALREADY_ATTACHED': 0xC0000038,
		'STATUS_OBJECT_PATH_INVALID': 0xC0000039,
		'STATUS_OBJECT_PATH_NOT_FOUND': 0xC000003A,
		'STATUS_OBJECT_PATH_SYNTAX_BAD': 0xC000003B,
		'STATUS_DATA_OVERRUN': 0xC000003C,
		'STATUS_DATA_LATE_ERROR': 0xC000003D,
		'STATUS_DATA_ERROR': 0xC000003E,
		'STATUS_CRC_ERROR': 0xC000003F,
		'STATUS_SECTION_TOO_BIG': 0xC0000040,
		'STATUS_PORT_CONNECTION_REFUSED': 0xC0000041,
		'STATUS_INVALID_PORT_HANDLE': 0xC0000042,
		'STATUS_SHARING_VIOLATION': 0xC0000043,
		'STATUS_QUOTA_EXCEEDED': 0xC0000044,
		'STATUS_INVALID_PAGE_PROTECTION': 0xC0000045,
		'STATUS_MUTANT_NOT_OWNED': 0xC0000046,
		'STATUS_SEMAPHORE_LIMIT_EXCEEDED': 0xC0000047,
		'STATUS_PORT_ALREADY_SET': 0xC0000048,
		'STATUS_SECTION_NOT_IMAGE': 0xC0000049,
		'STATUS_SUSPEND_COUNT_EXCEEDED': 0xC000004A,
		'STATUS_THREAD_IS_TERMINATING': 0xC000004B,
		'STATUS_BAD_WORKING_SET_LIMIT': 0xC000004C,
		'STATUS_INCOMPATIBLE_FILE_MAP': 0xC000004D,
		'STATUS_SECTION_PROTECTION': 0xC000004E,
		'STATUS_EAS_NOT_SUPPORTED': 0xC000004F,
		'STATUS_EA_TOO_LARGE': 0xC0000050,
		'STATUS_NONEXISTENT_EA_ENTRY': 0xC0000051,
		'STATUS_NO_EAS_ON_FILE': 0xC0000052,
		'STATUS_EA_CORRUPT_ERROR': 0xC0000053,
		'STATUS_FILE_LOCK_CONFLICT': 0xC0000054,
		'STATUS_LOCK_NOT_GRANTED': 0xC0000055,
		'STATUS_DELETE_PENDING': 0xC0000056,
		'STATUS_CTL_FILE_NOT_SUPPORTED': 0xC0000057,
		'STATUS_UNKNOWN_REVISION': 0xC0000058,
		'STATUS_REVISION_MISMATCH': 0xC0000059,
		'STATUS_INVALID_OWNER': 0xC000005A,
		'STATUS_INVALID_PRIMARY_GROUP': 0xC000005B,
		'STATUS_NO_IMPERSONATION_TOKEN': 0xC000005C,
		'STATUS_CANT_DISABLE_MANDATORY': 0xC000005D,
		'STATUS_NO_LOGON_SERVERS': 0xC000005E,
		'STATUS_NO_SUCH_LOGON_SESSION': 0xC000005F,
		'STATUS_NO_SUCH_PRIVILEGE': 0xC0000060,
		'STATUS_PRIVILEGE_NOT_HELD': 0xC0000061,
		'STATUS_INVALID_ACCOUNT_NAME': 0xC0000062,
		'STATUS_USER_EXISTS': 0xC0000063,
		'STATUS_NO_SUCH_USER': 0xC0000064,
		'STATUS_GROUP_EXISTS': 0xC0000065,
		'STATUS_NO_SUCH_GROUP': 0xC0000066,
		'STATUS_MEMBER_IN_GROUP': 0xC0000067,
		'STATUS_MEMBER_NOT_IN_GROUP': 0xC0000068,
		'STATUS_LAST_ADMIN': 0xC0000069,
		'STATUS_WRONG_PASSWORD': 0xC000006A,
		'STATUS_ILL_FORMED_PASSWORD': 0xC000006B,
		'STATUS_PASSWORD_RESTRICTION': 0xC000006C,
		'STATUS_LOGON_FAILURE': 0xC000006D,
		'STATUS_ACCOUNT_RESTRICTION': 0xC000006E,
		'STATUS_INVALID_LOGON_HOURS': 0xC000006F,
		'STATUS_INVALID_WORKSTATION': 0xC0000070,
		'STATUS_PASSWORD_EXPIRED': 0xC0000071,
		'STATUS_ACCOUNT_DISABLED': 0xC0000072,
		'STATUS_NONE_MAPPED': 0xC0000073,
		'STATUS_TOO_MANY_LUIDS_REQUESTED': 0xC0000074,
		'STATUS_LUIDS_EXHAUSTED': 0xC0000075,
		'STATUS_INVALID_SUB_AUTHORITY': 0xC0000076,
		'STATUS_INVALID_ACL': 0xC0000077,
		'STATUS_INVALID_SID': 0xC0000078,
		'STATUS_INVALID_SECURITY_DESCR': 0xC0000079,
		'STATUS_PROCEDURE_NOT_FOUND': 0xC000007A,
		'STATUS_INVALID_IMAGE_FORMAT': 0xC000007B,
		'STATUS_NO_TOKEN': 0xC000007C,
		'STATUS_BAD_INHERITANCE_ACL': 0xC000007D,
		'STATUS_RANGE_NOT_LOCKED': 0xC000007E,
		'STATUS_DISK_FULL': 0xC000007F,
		'STATUS_SERVER_DISABLED': 0xC0000080,
		'STATUS_SERVER_NOT_DISABLED': 0xC0000081,
		'STATUS_TOO_MANY_GUIDS_REQUESTED': 0xC0000082,
		'STATUS_GUIDS_EXHAUSTED': 0xC0000083,
		'STATUS_INVALID_ID_AUTHORITY': 0xC0000084,
		'STATUS_AGENTS_EXHAUSTED': 0xC0000085,
		'STATUS_INVALID_VOLUME_LABEL': 0xC0000086,
		'STATUS_SECTION_NOT_EXTENDED': 0xC0000087,
		'STATUS_NOT_MAPPED_DATA': 0xC0000088,
		'STATUS_RESOURCE_DATA_NOT_FOUND': 0xC0000089,
		'STATUS_RESOURCE_TYPE_NOT_FOUND': 0xC000008A,
		'STATUS_RESOURCE_NAME_NOT_FOUND': 0xC000008B,
		'STATUS_ARRAY_BOUNDS_EXCEEDED': 0xC000008C,
		'STATUS_FLOAT_DENORMAL_OPERAND': 0xC000008D,
		'STATUS_FLOAT_DIVIDE_BY_ZERO': 0xC000008E,
		'STATUS_FLOAT_INEXACT_RESULT': 0xC000008F,
		'STATUS_FLOAT_INVALID_OPERATION': 0xC0000090,
		'STATUS_FLOAT_OVERFLOW': 0xC0000091,
		'STATUS_FLOAT_STACK_CHECK': 0xC0000092,
		'STATUS_FLOAT_UNDERFLOW': 0xC0000093,
		'STATUS_INTEGER_DIVIDE_BY_ZERO': 0xC0000094,
		'STATUS_INTEGER_OVERFLOW': 0xC0000095,
		'STATUS_PRIVILEGED_INSTRUCTION': 0xC0000096,
		'STATUS_TOO_MANY_PAGING_FILES': 0xC0000097,
		'STATUS_FILE_INVALID': 0xC0000098,
		'STATUS_ALLOTTED_SPACE_EXCEEDED': 0xC0000099,
		'STATUS_INSUFFICIENT_RESOURCES': 0xC000009A,
		'STATUS_DFS_EXIT_PATH_FOUND': 0xC000009B,
		'STATUS_DEVICE_DATA_ERROR': 0xC000009C,
		'STATUS_DEVICE_NOT_CONNECTED': 0xC000009D,
		'STATUS_FREE_VM_NOT_AT_BASE': 0xC000009F,
		'STATUS_MEMORY_NOT_ALLOCATED': 0xC00000A0,
		'STATUS_WORKING_SET_QUOTA': 0xC00000A1,
		'STATUS_MEDIA_WRITE_PROTECTED': 0xC00000A2,
		'STATUS_DEVICE_NOT_READY': 0xC00000A3,
		'STATUS_INVALID_GROUP_ATTRIBUTES': 0xC00000A4,
		'STATUS_BAD_IMPERSONATION_LEVEL': 0xC00000A5,
		'STATUS_CANT_OPEN_ANONYMOUS': 0xC00000A6,
		'STATUS_BAD_VALIDATION_CLASS': 0xC00000A7,
		'STATUS_BAD_TOKEN_TYPE': 0xC00000A8,
		'STATUS_BAD_MASTER_BOOT_RECORD': 0xC00000A9,
		'STATUS_INSTRUCTION_MISALIGNMENT': 0xC00000AA,
		'STATUS_INSTANCE_NOT_AVAILABLE': 0xC00000AB,
		'STATUS_PIPE_NOT_AVAILABLE': 0xC00000AC,
		'STATUS_INVALID_PIPE_STATE': 0xC00000AD,
		'STATUS_PIPE_BUSY': 0xC00000AE,
		'STATUS_ILLEGAL_FUNCTION': 0xC00000AF,
		'STATUS_PIPE_DISCONNECTED': 0xC00000B0,
		'STATUS_PIPE_CLOSING': 0xC00000B1,
		'STATUS_PIPE_CONNECTED': 0xC00000B2,
		'STATUS_PIPE_LISTENING': 0xC00000B3,
		'STATUS_INVALID_READ_MODE': 0xC00000B4,
		'STATUS_IO_TIMEOUT': 0xC00000B5,
		'STATUS_FILE_FORCED_CLOSED': 0xC00000B6,
		'STATUS_PROFILING_NOT_STARTED': 0xC00000B7,
		'STATUS_PROFILING_NOT_STOPPED': 0xC00000B8,
		'STATUS_COULD_NOT_INTERPRET': 0xC00000B9,
		'STATUS_FILE_IS_A_DIRECTORY': 0xC00000BA,
		'STATUS_NOT_SUPPORTED': 0xC00000BB,
		'STATUS_REMOTE_NOT_LISTENING': 0xC00000BC,
		'STATUS_DUPLICATE_NAME': 0xC00000BD,
		'STATUS_BAD_NETWORK_PATH': 0xC00000BE,
		'STATUS_NETWORK_BUSY': 0xC00000BF,
		'STATUS_DEVICE_DOES_NOT_EXIST': 0xC00000C0,
		'STATUS_TOO_MANY_COMMANDS': 0xC00000C1,
		'STATUS_ADAPTER_HARDWARE_ERROR': 0xC00000C2,
		'STATUS_INVALID_NETWORK_RESPONSE': 0xC00000C3,
		'STATUS_UNEXPECTED_NETWORK_ERROR': 0xC00000C4,
		'STATUS_BAD_REMOTE_ADAPTER': 0xC00000C5,
		'STATUS_PRINT_QUEUE_FULL': 0xC00000C6,
		'STATUS_NO_SPOOL_SPACE': 0xC00000C7,
		'STATUS_PRINT_CANCELLED': 0xC00000C8,
		'STATUS_NETWORK_NAME_DELETED': 0xC00000C9,
		'STATUS_NETWORK_ACCESS_DENIED': 0xC00000CA,
		'STATUS_BAD_DEVICE_TYPE': 0xC00000CB,
		'STATUS_BAD_NETWORK_NAME': 0xC00000CC,
		'STATUS_TOO_MANY_NAMES': 0xC00000CD,
		'STATUS_TOO_MANY_SESSIONS': 0xC00000CE,
		'STATUS_SHARING_PAUSED': 0xC00000CF,
		'STATUS_REQUEST_NOT_ACCEPTED': 0xC00000D0,
		'STATUS_REDIRECTOR_PAUSED': 0xC00000D1,
		'STATUS_NET_WRITE_FAULT': 0xC00000D2,
		'STATUS_PROFILING_AT_LIMIT': 0xC00000D3,
		'STATUS_NOT_SAME_DEVICE': 0xC00000D4,
		'STATUS_FILE_RENAMED': 0xC00000D5,
		'STATUS_VIRTUAL_CIRCUIT_CLOSED': 0xC00000D6,
		'STATUS_NO_SECURITY_ON_OBJECT': 0xC00000D7,
		'STATUS_CANT_WAIT': 0xC00000D8,
		'STATUS_PIPE_EMPTY': 0xC00000D9,
		'STATUS_CANT_ACCESS_DOMAIN_INFO': 0xC00000DA,
		'STATUS_CANT_TERMINATE_SELF': 0xC00000DB,
		'STATUS_INVALID_SERVER_STATE': 0xC00000DC,
		'STATUS_INVALID_DOMAIN_STATE': 0xC00000DD,
		'STATUS_INVALID_DOMAIN_ROLE': 0xC00000DE,
		'STATUS_NO_SUCH_DOMAIN': 0xC00000DF,
		'STATUS_DOMAIN_EXISTS': 0xC00000E0,
		'STATUS_DOMAIN_LIMIT_EXCEEDED': 0xC00000E1,
		'STATUS_OPLOCK_NOT_GRANTED': 0xC00000E2,
		'STATUS_INVALID_OPLOCK_PROTOCOL': 0xC00000E3,
		'STATUS_INTERNAL_DB_CORRUPTION': 0xC00000E4,
		'STATUS_INTERNAL_ERROR': 0xC00000E5,
		'STATUS_GENERIC_NOT_MAPPED': 0xC00000E6,
		'STATUS_BAD_DESCRIPTOR_FORMAT': 0xC00000E7,
		'STATUS_INVALID_USER_BUFFER': 0xC00000E8,
		'STATUS_UNEXPECTED_IO_ERROR': 0xC00000E9,
		'STATUS_UNEXPECTED_MM_CREATE_ERR': 0xC00000EA,
		'STATUS_UNEXPECTED_MM_MAP_ERROR': 0xC00000EB,
		'STATUS_UNEXPECTED_MM_EXTEND_ERR': 0xC00000EC,
		'STATUS_NOT_LOGON_PROCESS': 0xC00000ED,
		'STATUS_LOGON_SESSION_EXISTS': 0xC00000EE,
		'STATUS_INVALID_PARAMETER_1': 0xC00000EF,
		'STATUS_INVALID_PARAMETER_2': 0xC00000F0,
		'STATUS_INVALID_PARAMETER_3': 0xC00000F1,
		'STATUS_INVALID_PARAMETER_4': 0xC00000F2,
		'STATUS_INVALID_PARAMETER_5': 0xC00000F3,
		'STATUS_INVALID_PARAMETER_6': 0xC00000F4,
		'STATUS_INVALID_PARAMETER_7': 0xC00000F5,
		'STATUS_INVALID_PARAMETER_8': 0xC00000F6,
		'STATUS_INVALID_PARAMETER_9': 0xC00000F7,
		'STATUS_INVALID_PARAMETER_10': 0xC00000F8,
		'STATUS_INVALID_PARAMETER_11': 0xC00000F9,
		'STATUS_INVALID_PARAMETER_12': 0xC00000FA,
		'STATUS_REDIRECTOR_NOT_STARTED': 0xC00000FB,
		'STATUS_REDIRECTOR_STARTED': 0xC00000FC,
		'STATUS_STACK_OVERFLOW': 0xC00000FD,
		'STATUS_NO_SUCH_PACKAGE': 0xC00000FE,
		'STATUS_BAD_FUNCTION_TABLE': 0xC00000FF,
		'STATUS_VARIABLE_NOT_FOUND': 0xC0000100,
		'STATUS_DIRECTORY_NOT_EMPTY': 0xC0000101,
		'STATUS_FILE_CORRUPT_ERROR': 0xC0000102,
		'STATUS_NOT_A_DIRECTORY': 0xC0000103,
		'STATUS_BAD_LOGON_SESSION_STATE': 0xC0000104,
		'STATUS_LOGON_SESSION_COLLISION': 0xC0000105,
		'STATUS_NAME_TOO_LONG': 0xC0000106,
		'STATUS_FILES_OPEN': 0xC0000107,
		'STATUS_CONNECTION_IN_USE': 0xC0000108,
		'STATUS_MESSAGE_NOT_FOUND': 0xC0000109,
		'STATUS_PROCESS_IS_TERMINATING': 0xC000010A,
		'STATUS_INVALID_LOGON_TYPE': 0xC000010B,
		'STATUS_NO_GUID_TRANSLATION': 0xC000010C,
		'STATUS_CANNOT_IMPERSONATE': 0xC000010D,
		'STATUS_IMAGE_ALREADY_LOADED': 0xC000010E,
		'STATUS_NO_LDT': 0xC0000117,
		'STATUS_INVALID_LDT_SIZE': 0xC0000118,
		'STATUS_INVALID_LDT_OFFSET': 0xC0000119,
		'STATUS_INVALID_LDT_DESCRIPTOR': 0xC000011A,
		'STATUS_INVALID_IMAGE_NE_FORMAT': 0xC000011B,
		'STATUS_RXACT_INVALID_STATE': 0xC000011C,
		'STATUS_RXACT_COMMIT_FAILURE': 0xC000011D,
		'STATUS_MAPPED_FILE_SIZE_ZERO': 0xC000011E,
		'STATUS_TOO_MANY_OPENED_FILES': 0xC000011F,
		'STATUS_CANCELLED': 0xC0000120,
		'STATUS_CANNOT_DELETE': 0xC0000121,
		'STATUS_INVALID_COMPUTER_NAME': 0xC0000122,
		'STATUS_FILE_DELETED': 0xC0000123,
		'STATUS_SPECIAL_ACCOUNT': 0xC0000124,
		'STATUS_SPECIAL_GROUP': 0xC0000125,
		'STATUS_SPECIAL_USER': 0xC0000126,
		'STATUS_MEMBERS_PRIMARY_GROUP': 0xC0000127,
		'STATUS_FILE_CLOSED': 0xC0000128,
		'STATUS_TOO_MANY_THREADS': 0xC0000129,
		'STATUS_THREAD_NOT_IN_PROCESS': 0xC000012A,
		'STATUS_TOKEN_ALREADY_IN_USE': 0xC000012B,
		'STATUS_PAGEFILE_QUOTA_EXCEEDED': 0xC000012C,
		'STATUS_COMMITMENT_LIMIT': 0xC000012D,
		'STATUS_INVALID_IMAGE_LE_FORMAT': 0xC000012E,
		'STATUS_INVALID_IMAGE_NOT_MZ': 0xC000012F,
		'STATUS_INVALID_IMAGE_PROTECT': 0xC0000130,
		'STATUS_INVALID_IMAGE_WIN_16': 0xC0000131,
		'STATUS_LOGON_SERVER_CONFLICT': 0xC0000132,
		'STATUS_TIME_DIFFERENCE_AT_DC': 0xC0000133,
		'STATUS_SYNCHRONIZATION_REQUIRED': 0xC0000134,
		'STATUS_DLL_NOT_FOUND': 0xC0000135,
		'STATUS_OPEN_FAILED': 0xC0000136,
		'STATUS_IO_PRIVILEGE_FAILED': 0xC0000137,
		'STATUS_ORDINAL_NOT_FOUND': 0xC0000138,
		'STATUS_ENTRYPOINT_NOT_FOUND': 0xC0000139,
		'STATUS_CONTROL_C_EXIT': 0xC000013A,
		'STATUS_LOCAL_DISCONNECT': 0xC000013B,
		'STATUS_REMOTE_DISCONNECT': 0xC000013C,
		'STATUS_REMOTE_RESOURCES': 0xC000013D,
		'STATUS_LINK_FAILED': 0xC000013E,
		'STATUS_LINK_TIMEOUT': 0xC000013F,
		'STATUS_INVALID_CONNECTION': 0xC0000140,
		'STATUS_INVALID_ADDRESS': 0xC0000141,
		'STATUS_DLL_INIT_FAILED': 0xC0000142,
		'STATUS_MISSING_SYSTEMFILE': 0xC0000143,
		'STATUS_UNHANDLED_EXCEPTION': 0xC0000144,
		'STATUS_APP_INIT_FAILURE': 0xC0000145,
		'STATUS_PAGEFILE_CREATE_FAILED': 0xC0000146,
		'STATUS_NO_PAGEFILE': 0xC0000147,
		'STATUS_INVALID_LEVEL': 0xC0000148,
		'STATUS_WRONG_PASSWORD_CORE': 0xC0000149,
		'STATUS_ILLEGAL_FLOAT_CONTEXT': 0xC000014A,
		'STATUS_PIPE_BROKEN': 0xC000014B,
		'STATUS_REGISTRY_CORRUPT': 0xC000014C,
		'STATUS_REGISTRY_IO_FAILED': 0xC000014D,
		'STATUS_NO_EVENT_PAIR': 0xC000014E,
		'STATUS_UNRECOGNIZED_VOLUME': 0xC000014F,
		'STATUS_SERIAL_NO_DEVICE_INITED': 0xC0000150,
		'STATUS_NO_SUCH_ALIAS': 0xC0000151,
		'STATUS_MEMBER_NOT_IN_ALIAS': 0xC0000152,
		'STATUS_MEMBER_IN_ALIAS': 0xC0000153,
		'STATUS_ALIAS_EXISTS': 0xC0000154,
		'STATUS_LOGON_NOT_GRANTED': 0xC0000155,
		'STATUS_TOO_MANY_SECRETS': 0xC0000156,
		'STATUS_SECRET_TOO_LONG': 0xC0000157,
		'STATUS_INTERNAL_DB_ERROR': 0xC0000158,
		'STATUS_FULLSCREEN_MODE': 0xC0000159,
		'STATUS_TOO_MANY_CONTEXT_IDS': 0xC000015A,
		'STATUS_LOGON_TYPE_NOT_GRANTED': 0xC000015B,
		'STATUS_NOT_REGISTRY_FILE': 0xC000015C,
		'STATUS_NT_CROSS_ENCRYPTION_REQUIRED': 0xC000015D,
		'STATUS_DOMAIN_CTRLR_CONFIG_ERROR': 0xC000015E,
		'STATUS_FT_MISSING_MEMBER': 0xC000015F,
		'STATUS_ILL_FORMED_SERVICE_ENTRY': 0xC0000160,
		'STATUS_ILLEGAL_CHARACTER': 0xC0000161,
		'STATUS_UNMAPPABLE_CHARACTER': 0xC0000162,
		'STATUS_UNDEFINED_CHARACTER': 0xC0000163,
		'STATUS_FLOPPY_VOLUME': 0xC0000164,
		'STATUS_FLOPPY_ID_MARK_NOT_FOUND': 0xC0000165,
		'STATUS_FLOPPY_WRONG_CYLINDER': 0xC0000166,
		'STATUS_FLOPPY_UNKNOWN_ERROR': 0xC0000167,
		'STATUS_FLOPPY_BAD_REGISTERS': 0xC0000168,
		'STATUS_DISK_RECALIBRATE_FAILED': 0xC0000169,
		'STATUS_DISK_OPERATION_FAILED': 0xC000016A,
		'STATUS_DISK_RESET_FAILED': 0xC000016B,
		'STATUS_SHARED_IRQ_BUSY': 0xC000016C,
		'STATUS_FT_ORPHANING': 0xC000016D,
		'STATUS_BIOS_FAILED_TO_CONNECT_INTERRUPT': 0xC000016E,
		'STATUS_PARTITION_FAILURE': 0xC0000172,
		'STATUS_INVALID_BLOCK_LENGTH': 0xC0000173,
		'STATUS_DEVICE_NOT_PARTITIONED': 0xC0000174,
		'STATUS_UNABLE_TO_LOCK_MEDIA': 0xC0000175,
		'STATUS_UNABLE_TO_UNLOAD_MEDIA': 0xC0000176,
		'STATUS_EOM_OVERFLOW': 0xC0000177,
		'STATUS_NO_MEDIA': 0xC0000178,
		'STATUS_NO_SUCH_MEMBER': 0xC000017A,
		'STATUS_INVALID_MEMBER': 0xC000017B,
		'STATUS_KEY_DELETED': 0xC000017C,
		'STATUS_NO_LOG_SPACE': 0xC000017D,
		'STATUS_TOO_MANY_SIDS': 0xC000017E,
		'STATUS_LM_CROSS_ENCRYPTION_REQUIRED': 0xC000017F,
		'STATUS_KEY_HAS_CHILDREN': 0xC0000180,
		'STATUS_CHILD_MUST_BE_VOLATILE': 0xC0000181,
		'STATUS_DEVICE_CONFIGURATION_ERROR': 0xC0000182,
		'STATUS_DRIVER_INTERNAL_ERROR': 0xC0000183,
		'STATUS_INVALID_DEVICE_STATE': 0xC0000184,
		'STATUS_IO_DEVICE_ERROR': 0xC0000185,
		'STATUS_DEVICE_PROTOCOL_ERROR': 0xC0000186,
		'STATUS_BACKUP_CONTROLLER': 0xC0000187,
		'STATUS_LOG_FILE_FULL': 0xC0000188,
		'STATUS_TOO_LATE': 0xC0000189,
		'STATUS_NO_TRUST_LSA_SECRET': 0xC000018A,
		'STATUS_NO_TRUST_SAM_ACCOUNT': 0xC000018B,
		'STATUS_TRUSTED_DOMAIN_FAILURE': 0xC000018C,
		'STATUS_TRUSTED_RELATIONSHIP_FAILURE': 0xC000018D,
		'STATUS_EVENTLOG_FILE_CORRUPT': 0xC000018E,
		'STATUS_EVENTLOG_CANT_START': 0xC000018F,
		'STATUS_TRUST_FAILURE': 0xC0000190,
		'STATUS_MUTANT_LIMIT_EXCEEDED': 0xC0000191,
		'STATUS_NETLOGON_NOT_STARTED': 0xC0000192,
		'STATUS_ACCOUNT_EXPIRED': 0xC0000193,
		'STATUS_POSSIBLE_DEADLOCK': 0xC0000194,
		'STATUS_NETWORK_CREDENTIAL_CONFLICT': 0xC0000195,
		'STATUS_REMOTE_SESSION_LIMIT': 0xC0000196,
		'STATUS_EVENTLOG_FILE_CHANGED': 0xC0000197,
		'STATUS_NOLOGON_INTERDOMAIN_TRUST_ACCOUNT': 0xC0000198,
		'STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT': 0xC0000199,
		'STATUS_NOLOGON_SERVER_TRUST_ACCOUNT': 0xC000019A,
		'STATUS_DOMAIN_TRUST_INCONSISTENT': 0xC000019B,
		'STATUS_FS_DRIVER_REQUIRED': 0xC000019C,
		'STATUS_IMAGE_ALREADY_LOADED_AS_DLL': 0xC000019D,
		'STATUS_INCOMPATIBLE_WITH_GLOBAL_SHORT_NAME_REGISTRY_SETTING': 0xC000019E,
		'STATUS_SHORT_NAMES_NOT_ENABLED_ON_VOLUME': 0xC000019F,
		'STATUS_SECURITY_STREAM_IS_INCONSISTENT': 0xC00001A0,
		'STATUS_INVALID_LOCK_RANGE': 0xC00001A1,
		'STATUS_INVALID_ACE_CONDITION': 0xC00001A2,
		'STATUS_IMAGE_SUBSYSTEM_NOT_PRESENT': 0xC00001A3,
		'STATUS_NOTIFICATION_GUID_ALREADY_DEFINED': 0xC00001A4,
		'STATUS_NETWORK_OPEN_RESTRICTION': 0xC0000201,
		'STATUS_NO_USER_SESSION_KEY': 0xC0000202,
		'STATUS_USER_SESSION_DELETED': 0xC0000203,
		'STATUS_RESOURCE_LANG_NOT_FOUND': 0xC0000204,
		'STATUS_INSUFF_SERVER_RESOURCES': 0xC0000205,
		'STATUS_INVALID_BUFFER_SIZE': 0xC0000206,
		'STATUS_INVALID_ADDRESS_COMPONENT': 0xC0000207,
		'STATUS_INVALID_ADDRESS_WILDCARD': 0xC0000208,
		'STATUS_TOO_MANY_ADDRESSES': 0xC0000209,
		'STATUS_ADDRESS_ALREADY_EXISTS': 0xC000020A,
		'STATUS_ADDRESS_CLOSED': 0xC000020B,
		'STATUS_CONNECTION_DISCONNECTED': 0xC000020C,
		'STATUS_CONNECTION_RESET': 0xC000020D,
		'STATUS_TOO_MANY_NODES': 0xC000020E,
		'STATUS_TRANSACTION_ABORTED': 0xC000020F,
		'STATUS_TRANSACTION_TIMED_OUT': 0xC0000210,
		'STATUS_TRANSACTION_NO_RELEASE': 0xC0000211,
		'STATUS_TRANSACTION_NO_MATCH': 0xC0000212,
		'STATUS_TRANSACTION_RESPONDED': 0xC0000213,
		'STATUS_TRANSACTION_INVALID_ID': 0xC0000214,
		'STATUS_TRANSACTION_INVALID_TYPE': 0xC0000215,
		'STATUS_NOT_SERVER_SESSION': 0xC0000216,
		'STATUS_NOT_CLIENT_SESSION': 0xC0000217,
		'STATUS_CANNOT_LOAD_REGISTRY_FILE': 0xC0000218,
		'STATUS_DEBUG_ATTACH_FAILED': 0xC0000219,
		'STATUS_SYSTEM_PROCESS_TERMINATED': 0xC000021A,
		'STATUS_DATA_NOT_ACCEPTED': 0xC000021B,
		'STATUS_NO_BROWSER_SERVERS_FOUND': 0xC000021C,
		'STATUS_VDM_HARD_ERROR': 0xC000021D,
		'STATUS_DRIVER_CANCEL_TIMEOUT': 0xC000021E,
		'STATUS_REPLY_MESSAGE_MISMATCH': 0xC000021F,
		'STATUS_MAPPED_ALIGNMENT': 0xC0000220,
		'STATUS_IMAGE_CHECKSUM_MISMATCH': 0xC0000221,
		'STATUS_LOST_WRITEBEHIND_DATA': 0xC0000222,
		'STATUS_CLIENT_SERVER_PARAMETERS_INVALID': 0xC0000223,
		'STATUS_PASSWORD_MUST_CHANGE': 0xC0000224,
		'STATUS_NOT_FOUND': 0xC0000225,
		'STATUS_NOT_TINY_STREAM': 0xC0000226,
		'STATUS_RECOVERY_FAILURE': 0xC0000227,
		'STATUS_STACK_OVERFLOW_READ': 0xC0000228,
		'STATUS_FAIL_CHECK': 0xC0000229,
		'STATUS_DUPLICATE_OBJECTID': 0xC000022A,
		'STATUS_OBJECTID_EXISTS': 0xC000022B,
		'STATUS_CONVERT_TO_LARGE': 0xC000022C,
		'STATUS_RETRY': 0xC000022D,
		'STATUS_FOUND_OUT_OF_SCOPE': 0xC000022E,
		'STATUS_ALLOCATE_BUCKET': 0xC000022F,
		'STATUS_PROPSET_NOT_FOUND': 0xC0000230,
		'STATUS_MARSHALL_OVERFLOW': 0xC0000231,
		'STATUS_INVALID_VARIANT': 0xC0000232,
		'STATUS_DOMAIN_CONTROLLER_NOT_FOUND': 0xC0000233,
		'STATUS_ACCOUNT_LOCKED_OUT': 0xC0000234,
		'STATUS_HANDLE_NOT_CLOSABLE': 0xC0000235,
		'STATUS_CONNECTION_REFUSED': 0xC0000236,
		'STATUS_GRACEFUL_DISCONNECT': 0xC0000237,
		'STATUS_ADDRESS_ALREADY_ASSOCIATED': 0xC0000238,
		'STATUS_ADDRESS_NOT_ASSOCIATED': 0xC0000239,
		'STATUS_CONNECTION_INVALID': 0xC000023A,
		'STATUS_CONNECTION_ACTIVE': 0xC000023B,
		'STATUS_NETWORK_UNREACHABLE': 0xC000023C,
		'STATUS_HOST_UNREACHABLE': 0xC000023D,
		'STATUS_PROTOCOL_UNREACHABLE': 0xC000023E,
		'STATUS_PORT_UNREACHABLE': 0xC000023F,
		'STATUS_REQUEST_ABORTED': 0xC0000240,
		'STATUS_CONNECTION_ABORTED': 0xC0000241,
		'STATUS_BAD_COMPRESSION_BUFFER': 0xC0000242,
		'STATUS_USER_MAPPED_FILE': 0xC0000243,
		'STATUS_AUDIT_FAILED': 0xC0000244,
		'STATUS_TIMER_RESOLUTION_NOT_SET': 0xC0000245,
		'STATUS_CONNECTION_COUNT_LIMIT': 0xC0000246,
		'STATUS_LOGIN_TIME_RESTRICTION': 0xC0000247,
		'STATUS_LOGIN_WKSTA_RESTRICTION': 0xC0000248,
		'STATUS_IMAGE_MP_UP_MISMATCH': 0xC0000249,
		'STATUS_INSUFFICIENT_LOGON_INFO': 0xC0000250,
		'STATUS_BAD_DLL_ENTRYPOINT': 0xC0000251,
		'STATUS_BAD_SERVICE_ENTRYPOINT': 0xC0000252,
		'STATUS_LPC_REPLY_LOST': 0xC0000253,
		'STATUS_IP_ADDRESS_CONFLICT1': 0xC0000254,
		'STATUS_IP_ADDRESS_CONFLICT2': 0xC0000255,
		'STATUS_REGISTRY_QUOTA_LIMIT': 0xC0000256,
		'STATUS_PATH_NOT_COVERED': 0xC0000257,
		'STATUS_NO_CALLBACK_ACTIVE': 0xC0000258,
		'STATUS_LICENSE_QUOTA_EXCEEDED': 0xC0000259,
		'STATUS_PWD_TOO_SHORT': 0xC000025A,
		'STATUS_PWD_TOO_RECENT': 0xC000025B,
		'STATUS_PWD_HISTORY_CONFLICT': 0xC000025C,
		'STATUS_PLUGPLAY_NO_DEVICE': 0xC000025E,
		'STATUS_UNSUPPORTED_COMPRESSION': 0xC000025F,
		'STATUS_INVALID_HW_PROFILE': 0xC0000260,
		'STATUS_INVALID_PLUGPLAY_DEVICE_PATH': 0xC0000261,
		'STATUS_DRIVER_ORDINAL_NOT_FOUND': 0xC0000262,
		'STATUS_DRIVER_ENTRYPOINT_NOT_FOUND': 0xC0000263,
		'STATUS_RESOURCE_NOT_OWNED': 0xC0000264,
		'STATUS_TOO_MANY_LINKS': 0xC0000265,
		'STATUS_QUOTA_LIST_INCONSISTENT': 0xC0000266,
		'STATUS_FILE_IS_OFFLINE': 0xC0000267,
		'STATUS_EVALUATION_EXPIRATION': 0xC0000268,
		'STATUS_ILLEGAL_DLL_RELOCATION': 0xC0000269,
		'STATUS_LICENSE_VIOLATION': 0xC000026A,
		'STATUS_DLL_INIT_FAILED_LOGOFF': 0xC000026B,
		'STATUS_DRIVER_UNABLE_TO_LOAD': 0xC000026C,
		'STATUS_DFS_UNAVAILABLE': 0xC000026D,
		'STATUS_VOLUME_DISMOUNTED': 0xC000026E,
		'STATUS_WX86_INTERNAL_ERROR': 0xC000026F,
		'STATUS_WX86_FLOAT_STACK_CHECK': 0xC0000270,
		'STATUS_VALIDATE_CONTINUE': 0xC0000271,
		'STATUS_NO_MATCH': 0xC0000272,
		'STATUS_NO_MORE_MATCHES': 0xC0000273,
		'STATUS_NOT_A_REPARSE_POINT': 0xC0000275,
		'STATUS_IO_REPARSE_TAG_INVALID': 0xC0000276,
		'STATUS_IO_REPARSE_TAG_MISMATCH': 0xC0000277,
		'STATUS_IO_REPARSE_DATA_INVALID': 0xC0000278,
		'STATUS_IO_REPARSE_TAG_NOT_HANDLED': 0xC0000279,
		'STATUS_REPARSE_POINT_NOT_RESOLVED': 0xC0000280,
		'STATUS_DIRECTORY_IS_A_REPARSE_POINT': 0xC0000281,
		'STATUS_RANGE_LIST_CONFLICT': 0xC0000282,
		'STATUS_SOURCE_ELEMENT_EMPTY': 0xC0000283,
		'STATUS_DESTINATION_ELEMENT_FULL': 0xC0000284,
		'STATUS_ILLEGAL_ELEMENT_ADDRESS': 0xC0000285,
		'STATUS_MAGAZINE_NOT_PRESENT': 0xC0000286,
		'STATUS_REINITIALIZATION_NEEDED': 0xC0000287,
		'STATUS_ENCRYPTION_FAILED': 0xC000028A,
		'STATUS_DECRYPTION_FAILED': 0xC000028B,
		'STATUS_RANGE_NOT_FOUND': 0xC000028C,
		'STATUS_NO_RECOVERY_POLICY': 0xC000028D,
		'STATUS_NO_EFS': 0xC000028E,
		'STATUS_WRONG_EFS': 0xC000028F,
		'STATUS_NO_USER_KEYS': 0xC0000290,
		'STATUS_FILE_NOT_ENCRYPTED': 0xC0000291,
		'STATUS_NOT_EXPORT_FORMAT': 0xC0000292,
		'STATUS_FILE_ENCRYPTED': 0xC0000293,
		'STATUS_WMI_GUID_NOT_FOUND': 0xC0000295,
		'STATUS_WMI_INSTANCE_NOT_FOUND': 0xC0000296,
		'STATUS_WMI_ITEMID_NOT_FOUND': 0xC0000297,
		'STATUS_WMI_TRY_AGAIN': 0xC0000298,
		'STATUS_SHARED_POLICY': 0xC0000299,
		'STATUS_POLICY_OBJECT_NOT_FOUND': 0xC000029A,
		'STATUS_POLICY_ONLY_IN_DS': 0xC000029B,
		'STATUS_VOLUME_NOT_UPGRADED': 0xC000029C,
		'STATUS_REMOTE_STORAGE_NOT_ACTIVE': 0xC000029D,
		'STATUS_REMOTE_STORAGE_MEDIA_ERROR': 0xC000029E,
		'STATUS_NO_TRACKING_SERVICE': 0xC000029F,
		'STATUS_SERVER_SID_MISMATCH': 0xC00002A0,
		'STATUS_DS_NO_ATTRIBUTE_OR_VALUE': 0xC00002A1,
		'STATUS_DS_INVALID_ATTRIBUTE_SYNTAX': 0xC00002A2,
		'STATUS_DS_ATTRIBUTE_TYPE_UNDEFINED': 0xC00002A3,
		'STATUS_DS_ATTRIBUTE_OR_VALUE_EXISTS': 0xC00002A4,
		'STATUS_DS_BUSY': 0xC00002A5,
		'STATUS_DS_UNAVAILABLE': 0xC00002A6,
		'STATUS_DS_NO_RIDS_ALLOCATED': 0xC00002A7,
		'STATUS_DS_NO_MORE_RIDS': 0xC00002A8,
		'STATUS_DS_INCORRECT_ROLE_OWNER': 0xC00002A9,
		'STATUS_DS_RIDMGR_INIT_ERROR': 0xC00002AA,
		'STATUS_DS_OBJ_CLASS_VIOLATION': 0xC00002AB,
		'STATUS_DS_CANT_ON_NON_LEAF': 0xC00002AC,
		'STATUS_DS_CANT_ON_RDN': 0xC00002AD,
		'STATUS_DS_CANT_MOD_OBJ_CLASS': 0xC00002AE,
		'STATUS_DS_CROSS_DOM_MOVE_FAILED': 0xC00002AF,
		'STATUS_DS_GC_NOT_AVAILABLE': 0xC00002B0,
		'STATUS_DIRECTORY_SERVICE_REQUIRED': 0xC00002B1,
		'STATUS_REPARSE_ATTRIBUTE_CONFLICT': 0xC00002B2,
		'STATUS_CANT_ENABLE_DENY_ONLY': 0xC00002B3,
		'STATUS_FLOAT_MULTIPLE_FAULTS': 0xC00002B4,
		'STATUS_FLOAT_MULTIPLE_TRAPS': 0xC00002B5,
		'STATUS_DEVICE_REMOVED': 0xC00002B6,
		'STATUS_JOURNAL_DELETE_IN_PROGRESS': 0xC00002B7,
		'STATUS_JOURNAL_NOT_ACTIVE': 0xC00002B8,
		'STATUS_NOINTERFACE': 0xC00002B9,
		'STATUS_DS_ADMIN_LIMIT_EXCEEDED': 0xC00002C1,
		'STATUS_DRIVER_FAILED_SLEEP': 0xC00002C2,
		'STATUS_MUTUAL_AUTHENTICATION_FAILED': 0xC00002C3,
		'STATUS_CORRUPT_SYSTEM_FILE': 0xC00002C4,
		'STATUS_DATATYPE_MISALIGNMENT_ERROR': 0xC00002C5,
		'STATUS_WMI_READ_ONLY': 0xC00002C6,
		'STATUS_WMI_SET_FAILURE': 0xC00002C7,
		'STATUS_COMMITMENT_MINIMUM': 0xC00002C8,
		'STATUS_REG_NAT_CONSUMPTION': 0xC00002C9,
		'STATUS_TRANSPORT_FULL': 0xC00002CA,
		'STATUS_DS_SAM_INIT_FAILURE': 0xC00002CB,
		'STATUS_ONLY_IF_CONNECTED': 0xC00002CC,
		'STATUS_DS_SENSITIVE_GROUP_VIOLATION': 0xC00002CD,
		'STATUS_PNP_RESTART_ENUMERATION': 0xC00002CE,
		'STATUS_JOURNAL_ENTRY_DELETED': 0xC00002CF,
		'STATUS_DS_CANT_MOD_PRIMARYGROUPID': 0xC00002D0,
		'STATUS_SYSTEM_IMAGE_BAD_SIGNATURE': 0xC00002D1,
		'STATUS_PNP_REBOOT_REQUIRED': 0xC00002D2,
		'STATUS_POWER_STATE_INVALID': 0xC00002D3,
		'STATUS_DS_INVALID_GROUP_TYPE': 0xC00002D4,
		'STATUS_DS_NO_NEST_GLOBALGROUP_IN_MIXEDDOMAIN': 0xC00002D5,
		'STATUS_DS_NO_NEST_LOCALGROUP_IN_MIXEDDOMAIN': 0xC00002D6,
		'STATUS_DS_GLOBAL_CANT_HAVE_LOCAL_MEMBER': 0xC00002D7,
		'STATUS_DS_GLOBAL_CANT_HAVE_UNIVERSAL_MEMBER': 0xC00002D8,
		'STATUS_DS_UNIVERSAL_CANT_HAVE_LOCAL_MEMBER': 0xC00002D9,
		'STATUS_DS_GLOBAL_CANT_HAVE_CROSSDOMAIN_MEMBER': 0xC00002DA,
		'STATUS_DS_LOCAL_CANT_HAVE_CROSSDOMAIN_LOCAL_MEMBER': 0xC00002DB,
		'STATUS_DS_HAVE_PRIMARY_MEMBERS': 0xC00002DC,
		'STATUS_WMI_NOT_SUPPORTED': 0xC00002DD,
		'STATUS_INSUFFICIENT_POWER': 0xC00002DE,
		'STATUS_SAM_NEED_BOOTKEY_PASSWORD': 0xC00002DF,
		'STATUS_SAM_NEED_BOOTKEY_FLOPPY': 0xC00002E0,
		'STATUS_DS_CANT_START': 0xC00002E1,
		'STATUS_DS_INIT_FAILURE': 0xC00002E2,
		'STATUS_SAM_INIT_FAILURE': 0xC00002E3,
		'STATUS_DS_GC_REQUIRED': 0xC00002E4,
		'STATUS_DS_LOCAL_MEMBER_OF_LOCAL_ONLY': 0xC00002E5,
		'STATUS_DS_NO_FPO_IN_UNIVERSAL_GROUPS': 0xC00002E6,
		'STATUS_DS_MACHINE_ACCOUNT_QUOTA_EXCEEDED': 0xC00002E7,
		'STATUS_CURRENT_DOMAIN_NOT_ALLOWED': 0xC00002E9,
		'STATUS_CANNOT_MAKE': 0xC00002EA,
		'STATUS_SYSTEM_SHUTDOWN': 0xC00002EB,
		'STATUS_DS_INIT_FAILURE_CONSOLE': 0xC00002EC,
		'STATUS_DS_SAM_INIT_FAILURE_CONSOLE': 0xC00002ED,
		'STATUS_UNFINISHED_CONTEXT_DELETED': 0xC00002EE,
		'STATUS_NO_TGT_REPLY': 0xC00002EF,
		'STATUS_OBJECTID_NOT_FOUND': 0xC00002F0,
		'STATUS_NO_IP_ADDRESSES': 0xC00002F1,
		'STATUS_WRONG_CREDENTIAL_HANDLE': 0xC00002F2,
		'STATUS_CRYPTO_SYSTEM_INVALID': 0xC00002F3,
		'STATUS_MAX_REFERRALS_EXCEEDED': 0xC00002F4,
		'STATUS_MUST_BE_KDC': 0xC00002F5,
		'STATUS_STRONG_CRYPTO_NOT_SUPPORTED': 0xC00002F6,
		'STATUS_TOO_MANY_PRINCIPALS': 0xC00002F7,
		'STATUS_NO_PA_DATA': 0xC00002F8,
		'STATUS_PKINIT_NAME_MISMATCH': 0xC00002F9,
		'STATUS_SMARTCARD_LOGON_REQUIRED': 0xC00002FA,
		'STATUS_KDC_INVALID_REQUEST': 0xC00002FB,
		'STATUS_KDC_UNABLE_TO_REFER': 0xC00002FC,
		'STATUS_KDC_UNKNOWN_ETYPE': 0xC00002FD,
		'STATUS_SHUTDOWN_IN_PROGRESS': 0xC00002FE,
		'STATUS_SERVER_SHUTDOWN_IN_PROGRESS': 0xC00002FF,
		'STATUS_NOT_SUPPORTED_ON_SBS': 0xC0000300,
		'STATUS_WMI_GUID_DISCONNECTED': 0xC0000301,
		'STATUS_WMI_ALREADY_DISABLED': 0xC0000302,
		'STATUS_WMI_ALREADY_ENABLED': 0xC0000303,
		'STATUS_MFT_TOO_FRAGMENTED': 0xC0000304,
		'STATUS_COPY_PROTECTION_FAILURE': 0xC0000305,
		'STATUS_CSS_AUTHENTICATION_FAILURE': 0xC0000306,
		'STATUS_CSS_KEY_NOT_PRESENT': 0xC0000307,
		'STATUS_CSS_KEY_NOT_ESTABLISHED': 0xC0000308,
		'STATUS_CSS_SCRAMBLED_SECTOR': 0xC0000309,
		'STATUS_CSS_REGION_MISMATCH': 0xC000030A,
		'STATUS_CSS_RESETS_EXHAUSTED': 0xC000030B,
		'STATUS_PKINIT_FAILURE': 0xC0000320,
		'STATUS_SMARTCARD_SUBSYSTEM_FAILURE': 0xC0000321,
		'STATUS_NO_KERB_KEY': 0xC0000322,
		'STATUS_HOST_DOWN': 0xC0000350,
		'STATUS_UNSUPPORTED_PREAUTH': 0xC0000351,
		'STATUS_EFS_ALG_BLOB_TOO_BIG': 0xC0000352,
		'STATUS_PORT_NOT_SET': 0xC0000353,
		'STATUS_DEBUGGER_INACTIVE': 0xC0000354,
		'STATUS_DS_VERSION_CHECK_FAILURE': 0xC0000355,
		'STATUS_AUDITING_DISABLED': 0xC0000356,
		'STATUS_PRENT4_MACHINE_ACCOUNT': 0xC0000357,
		'STATUS_DS_AG_CANT_HAVE_UNIVERSAL_MEMBER': 0xC0000358,
		'STATUS_INVALID_IMAGE_WIN_32': 0xC0000359,
		'STATUS_INVALID_IMAGE_WIN_64': 0xC000035A,
		'STATUS_BAD_BINDINGS': 0xC000035B,
		'STATUS_NETWORK_SESSION_EXPIRED': 0xC000035C,
		'STATUS_APPHELP_BLOCK': 0xC000035D,
		'STATUS_ALL_SIDS_FILTERED': 0xC000035E,
		'STATUS_NOT_SAFE_MODE_DRIVER': 0xC000035F,
		'STATUS_ACCESS_DISABLED_BY_POLICY_DEFAULT': 0xC0000361,
		'STATUS_ACCESS_DISABLED_BY_POLICY_PATH': 0xC0000362,
		'STATUS_ACCESS_DISABLED_BY_POLICY_PUBLISHER': 0xC0000363,
		'STATUS_ACCESS_DISABLED_BY_POLICY_OTHER': 0xC0000364,
		'STATUS_FAILED_DRIVER_ENTRY': 0xC0000365,
		'STATUS_DEVICE_ENUMERATION_ERROR': 0xC0000366,
		'STATUS_MOUNT_POINT_NOT_RESOLVED': 0xC0000368,
		'STATUS_INVALID_DEVICE_OBJECT_PARAMETER': 0xC0000369,
		'STATUS_MCA_OCCURED': 0xC000036A,
		'STATUS_DRIVER_BLOCKED_CRITICAL': 0xC000036B,
		'STATUS_DRIVER_BLOCKED': 0xC000036C,
		'STATUS_DRIVER_DATABASE_ERROR': 0xC000036D,
		'STATUS_SYSTEM_HIVE_TOO_LARGE': 0xC000036E,
		'STATUS_INVALID_IMPORT_OF_NON_DLL': 0xC000036F,
		'STATUS_NO_SECRETS': 0xC0000371,
		'STATUS_ACCESS_DISABLED_NO_SAFER_UI_BY_POLICY': 0xC0000372,
		'STATUS_FAILED_STACK_SWITCH': 0xC0000373,
		'STATUS_HEAP_CORRUPTION': 0xC0000374,
		'STATUS_SMARTCARD_WRONG_PIN': 0xC0000380,
		'STATUS_SMARTCARD_CARD_BLOCKED': 0xC0000381,
		'STATUS_SMARTCARD_CARD_NOT_AUTHENTICATED': 0xC0000382,
		'STATUS_SMARTCARD_NO_CARD': 0xC0000383,
		'STATUS_SMARTCARD_NO_KEY_CONTAINER': 0xC0000384,
		'STATUS_SMARTCARD_NO_CERTIFICATE': 0xC0000385,
		'STATUS_SMARTCARD_NO_KEYSET': 0xC0000386,
		'STATUS_SMARTCARD_IO_ERROR': 0xC0000387,
		'STATUS_DOWNGRADE_DETECTED': 0xC0000388,
		'STATUS_SMARTCARD_CERT_REVOKED': 0xC0000389,
		'STATUS_ISSUING_CA_UNTRUSTED': 0xC000038A,
		'STATUS_REVOCATION_OFFLINE_C': 0xC000038B,
		'STATUS_PKINIT_CLIENT_FAILURE': 0xC000038C,
		'STATUS_SMARTCARD_CERT_EXPIRED': 0xC000038D,
		'STATUS_DRIVER_FAILED_PRIOR_UNLOAD': 0xC000038E,
		'STATUS_SMARTCARD_SILENT_CONTEXT': 0xC000038F,
		'STATUS_PER_USER_TRUST_QUOTA_EXCEEDED': 0xC0000401,
		'STATUS_ALL_USER_TRUST_QUOTA_EXCEEDED': 0xC0000402,
		'STATUS_USER_DELETE_TRUST_QUOTA_EXCEEDED': 0xC0000403,
		'STATUS_DS_NAME_NOT_UNIQUE': 0xC0000404,
		'STATUS_DS_DUPLICATE_ID_FOUND': 0xC0000405,
		'STATUS_DS_GROUP_CONVERSION_ERROR': 0xC0000406,
		'STATUS_VOLSNAP_PREPARE_HIBERNATE': 0xC0000407,
		'STATUS_USER2USER_REQUIRED': 0xC0000408,
		'STATUS_STACK_BUFFER_OVERRUN': 0xC0000409,
		'STATUS_NO_S4U_PROT_SUPPORT': 0xC000040A,
		'STATUS_CROSSREALM_DELEGATION_FAILURE': 0xC000040B,
		'STATUS_REVOCATION_OFFLINE_KDC': 0xC000040C,
		'STATUS_ISSUING_CA_UNTRUSTED_KDC': 0xC000040D,
		'STATUS_KDC_CERT_EXPIRED': 0xC000040E,
		'STATUS_KDC_CERT_REVOKED': 0xC000040F,
		'STATUS_PARAMETER_QUOTA_EXCEEDED': 0xC0000410,
		'STATUS_HIBERNATION_FAILURE': 0xC0000411,
		'STATUS_DELAY_LOAD_FAILED': 0xC0000412,
		'STATUS_AUTHENTICATION_FIREWALL_FAILED': 0xC0000413,
		'STATUS_VDM_DISALLOWED': 0xC0000414,
		'STATUS_HUNG_DISPLAY_DRIVER_THREAD': 0xC0000415,
		'STATUS_INSUFFICIENT_RESOURCE_FOR_SPECIFIED_SHARED_SECTION_SIZE': 0xC0000416,
		'STATUS_INVALID_CRUNTIME_PARAMETER': 0xC0000417,
		'STATUS_NTLM_BLOCKED': 0xC0000418,
		'STATUS_DS_SRC_SID_EXISTS_IN_FOREST': 0xC0000419,
		'STATUS_DS_DOMAIN_NAME_EXISTS_IN_FOREST': 0xC000041A,
		'STATUS_DS_FLAT_NAME_EXISTS_IN_FOREST': 0xC000041B,
		'STATUS_INVALID_USER_PRINCIPAL_NAME': 0xC000041C,
		'STATUS_ASSERTION_FAILURE': 0xC0000420,
		'STATUS_VERIFIER_STOP': 0xC0000421,
		'STATUS_CALLBACK_POP_STACK': 0xC0000423,
		'STATUS_INCOMPATIBLE_DRIVER_BLOCKED': 0xC0000424,
		'STATUS_HIVE_UNLOADED': 0xC0000425,
		'STATUS_COMPRESSION_DISABLED': 0xC0000426,
		'STATUS_FILE_SYSTEM_LIMITATION': 0xC0000427,
		'STATUS_INVALID_IMAGE_HASH': 0xC0000428,
		'STATUS_NOT_CAPABLE': 0xC0000429,
		'STATUS_REQUEST_OUT_OF_SEQUENCE': 0xC000042A,
		'STATUS_IMPLEMENTATION_LIMIT': 0xC000042B,
		'STATUS_ELEVATION_REQUIRED': 0xC000042C,
		'STATUS_NO_SECURITY_CONTEXT': 0xC000042D,
		'STATUS_PKU2U_CERT_FAILURE': 0xC000042E,
		'STATUS_BEYOND_VDL': 0xC0000432,
		'STATUS_ENCOUNTERED_WRITE_IN_PROGRESS': 0xC0000433,
		'STATUS_PTE_CHANGED': 0xC0000434,
		'STATUS_PURGE_FAILED': 0xC0000435,
		'STATUS_CRED_REQUIRES_CONFIRMATION': 0xC0000440,
		'STATUS_CS_ENCRYPTION_INVALID_SERVER_RESPONSE': 0xC0000441,
		'STATUS_CS_ENCRYPTION_UNSUPPORTED_SERVER': 0xC0000442,
		'STATUS_CS_ENCRYPTION_EXISTING_ENCRYPTED_FILE': 0xC0000443,
		'STATUS_CS_ENCRYPTION_NEW_ENCRYPTED_FILE': 0xC0000444,
		'STATUS_CS_ENCRYPTION_FILE_NOT_CSE': 0xC0000445,
		'STATUS_INVALID_LABEL': 0xC0000446,
		'STATUS_DRIVER_PROCESS_TERMINATED': 0xC0000450,
		'STATUS_AMBIGUOUS_SYSTEM_DEVICE': 0xC0000451,
		'STATUS_SYSTEM_DEVICE_NOT_FOUND': 0xC0000452,
		'STATUS_RESTART_BOOT_APPLICATION': 0xC0000453,
		'STATUS_INSUFFICIENT_NVRAM_RESOURCES': 0xC0000454,
		'STATUS_NO_RANGES_PROCESSED': 0xC0000460,
		'STATUS_DEVICE_FEATURE_NOT_SUPPORTED': 0xC0000463,
		'STATUS_DEVICE_UNREACHABLE': 0xC0000464,
		'STATUS_INVALID_TOKEN': 0xC0000465,
		'STATUS_INVALID_TASK_NAME': 0xC0000500,
		'STATUS_INVALID_TASK_INDEX': 0xC0000501,
		'STATUS_THREAD_ALREADY_IN_TASK': 0xC0000502,
		'STATUS_CALLBACK_BYPASS': 0xC0000503,
		'STATUS_FAIL_FAST_EXCEPTION': 0xC0000602,
		'STATUS_IMAGE_CERT_REVOKED': 0xC0000603,
		'STATUS_PORT_CLOSED': 0xC0000700,
		'STATUS_MESSAGE_LOST': 0xC0000701,
		'STATUS_INVALID_MESSAGE': 0xC0000702,
		'STATUS_REQUEST_CANCELED': 0xC0000703,
		'STATUS_RECURSIVE_DISPATCH': 0xC0000704,
		'STATUS_LPC_RECEIVE_BUFFER_EXPECTED': 0xC0000705,
		'STATUS_LPC_INVALID_CONNECTION_USAGE': 0xC0000706,
		'STATUS_LPC_REQUESTS_NOT_ALLOWED': 0xC0000707,
		'STATUS_RESOURCE_IN_USE': 0xC0000708,
		'STATUS_HARDWARE_MEMORY_ERROR': 0xC0000709,
		'STATUS_THREADPOOL_HANDLE_EXCEPTION': 0xC000070A,
		'STATUS_THREADPOOL_SET_EVENT_ON_COMPLETION_FAILED': 0xC000070B,
		'STATUS_THREADPOOL_RELEASE_SEMAPHORE_ON_COMPLETION_FAILED': 0xC000070C,
		'STATUS_THREADPOOL_RELEASE_MUTEX_ON_COMPLETION_FAILED': 0xC000070D,
		'STATUS_THREADPOOL_FREE_LIBRARY_ON_COMPLETION_FAILED': 0xC000070E,
		'STATUS_THREADPOOL_RELEASED_DURING_OPERATION': 0xC000070F,
		'STATUS_CALLBACK_RETURNED_WHILE_IMPERSONATING': 0xC0000710,
		'STATUS_APC_RETURNED_WHILE_IMPERSONATING': 0xC0000711,
		'STATUS_PROCESS_IS_PROTECTED': 0xC0000712,
		'STATUS_MCA_EXCEPTION': 0xC0000713,
		'STATUS_CERTIFICATE_MAPPING_NOT_UNIQUE': 0xC0000714,
		'STATUS_SYMLINK_CLASS_DISABLED': 0xC0000715,
		'STATUS_INVALID_IDN_NORMALIZATION': 0xC0000716,
		'STATUS_NO_UNICODE_TRANSLATION': 0xC0000717,
		'STATUS_ALREADY_REGISTERED': 0xC0000718,
		'STATUS_CONTEXT_MISMATCH': 0xC0000719,
		'STATUS_PORT_ALREADY_HAS_COMPLETION_LIST': 0xC000071A,
		'STATUS_CALLBACK_RETURNED_THREAD_PRIORITY': 0xC000071B,
		'STATUS_INVALID_THREAD': 0xC000071C,
		'STATUS_CALLBACK_RETURNED_TRANSACTION': 0xC000071D,
		'STATUS_CALLBACK_RETURNED_LDR_LOCK': 0xC000071E,
		'STATUS_CALLBACK_RETURNED_LANG': 0xC000071F,
		'STATUS_CALLBACK_RETURNED_PRI_BACK': 0xC0000720,
		'STATUS_DISK_REPAIR_DISABLED': 0xC0000800,
		'STATUS_DS_DOMAIN_RENAME_IN_PROGRESS': 0xC0000801,
		'STATUS_DISK_QUOTA_EXCEEDED': 0xC0000802,
		'STATUS_CONTENT_BLOCKED': 0xC0000804,
		'STATUS_BAD_CLUSTERS': 0xC0000805,
		'STATUS_VOLUME_DIRTY': 0xC0000806,
		'STATUS_FILE_CHECKED_OUT': 0xC0000901,
		'STATUS_CHECKOUT_REQUIRED': 0xC0000902,
		'STATUS_BAD_FILE_TYPE': 0xC0000903,
		'STATUS_FILE_TOO_LARGE': 0xC0000904,
		'STATUS_FORMS_AUTH_REQUIRED': 0xC0000905,
		'STATUS_VIRUS_INFECTED': 0xC0000906,
		'STATUS_VIRUS_DELETED': 0xC0000907,
		'STATUS_BAD_MCFG_TABLE': 0xC0000908,
		'STATUS_CANNOT_BREAK_OPLOCK': 0xC0000909,
		'STATUS_WOW_ASSERTION': 0xC0009898,
		'STATUS_INVALID_SIGNATURE': 0xC000A000,
		'STATUS_HMAC_NOT_SUPPORTED': 0xC000A001,
		'STATUS_IPSEC_QUEUE_OVERFLOW': 0xC000A010,
		'STATUS_ND_QUEUE_OVERFLOW': 0xC000A011,
		'STATUS_HOPLIMIT_EXCEEDED': 0xC000A012,
		'STATUS_PROTOCOL_NOT_SUPPORTED': 0xC000A013,
		'STATUS_LOST_WRITEBEHIND_DATA_NETWORK_DISCONNECTED': 0xC000A080,
		'STATUS_LOST_WRITEBEHIND_DATA_NETWORK_SERVER_ERROR': 0xC000A081,
		'STATUS_LOST_WRITEBEHIND_DATA_LOCAL_DISK_ERROR': 0xC000A082,
		'STATUS_XML_PARSE_ERROR': 0xC000A083,
		'STATUS_XMLDSIG_ERROR': 0xC000A084,
		'STATUS_WRONG_COMPARTMENT': 0xC000A085,
		'STATUS_AUTHIP_FAILURE': 0xC000A086,
		'STATUS_DS_OID_MAPPED_GROUP_CANT_HAVE_MEMBERS': 0xC000A087,
		'STATUS_DS_OID_NOT_FOUND': 0xC000A088,
		'STATUS_HASH_NOT_SUPPORTED': 0xC000A100,
		'STATUS_HASH_NOT_PRESENT': 0xC000A101,
		'STATUS_OFFLOAD_READ_FLT_NOT_SUPPORTED': 0xC000A2A1,
		'STATUS_OFFLOAD_WRITE_FLT_NOT_SUPPORTED': 0xC000A2A2,
		'STATUS_OFFLOAD_READ_FILE_NOT_SUPPORTED': 0xC000A2A3,
		'STATUS_OFFLOAD_WRITE_FILE_NOT_SUPPORTED': 0xC000A2A4,
		'DBG_NO_STATE_CHANGE': 0xC0010001,
		'DBG_APP_NOT_IDLE': 0xC0010002,
		'RPC_NT_INVALID_STRING_BINDING': 0xC0020001,
		'RPC_NT_WRONG_KIND_OF_BINDING': 0xC0020002,
		'RPC_NT_INVALID_BINDING': 0xC0020003,
		'RPC_NT_PROTSEQ_NOT_SUPPORTED': 0xC0020004,
		'RPC_NT_INVALID_RPC_PROTSEQ': 0xC0020005,
		'RPC_NT_INVALID_STRING_UUID': 0xC0020006,
		'RPC_NT_INVALID_ENDPOINT_FORMAT': 0xC0020007,
		'RPC_NT_INVALID_NET_ADDR': 0xC0020008,
		'RPC_NT_NO_ENDPOINT_FOUND': 0xC0020009,
		'RPC_NT_INVALID_TIMEOUT': 0xC002000A,
		'RPC_NT_OBJECT_NOT_FOUND': 0xC002000B,
		'RPC_NT_ALREADY_REGISTERED': 0xC002000C,
		'RPC_NT_TYPE_ALREADY_REGISTERED': 0xC002000D,
		'RPC_NT_ALREADY_LISTENING': 0xC002000E,
		'RPC_NT_NO_PROTSEQS_REGISTERED': 0xC002000F,
		'RPC_NT_NOT_LISTENING': 0xC0020010,
		'RPC_NT_UNKNOWN_MGR_TYPE': 0xC0020011,
		'RPC_NT_UNKNOWN_IF': 0xC0020012,
		'RPC_NT_NO_BINDINGS': 0xC0020013,
		'RPC_NT_NO_PROTSEQS': 0xC0020014,
		'RPC_NT_CANT_CREATE_ENDPOINT': 0xC0020015,
		'RPC_NT_OUT_OF_RESOURCES': 0xC0020016,
		'RPC_NT_SERVER_UNAVAILABLE': 0xC0020017,
		'RPC_NT_SERVER_TOO_BUSY': 0xC0020018,
		'RPC_NT_INVALID_NETWORK_OPTIONS': 0xC0020019,
		'RPC_NT_NO_CALL_ACTIVE': 0xC002001A,
		'RPC_NT_CALL_FAILED': 0xC002001B,
		'RPC_NT_CALL_FAILED_DNE': 0xC002001C,
		'RPC_NT_PROTOCOL_ERROR': 0xC002001D,
		'RPC_NT_UNSUPPORTED_TRANS_SYN': 0xC002001F,
		'RPC_NT_UNSUPPORTED_TYPE': 0xC0020021,
		'RPC_NT_INVALID_TAG': 0xC0020022,
		'RPC_NT_INVALID_BOUND': 0xC0020023,
		'RPC_NT_NO_ENTRY_NAME': 0xC0020024,
		'RPC_NT_INVALID_NAME_SYNTAX': 0xC0020025,
		'RPC_NT_UNSUPPORTED_NAME_SYNTAX': 0xC0020026,
		'RPC_NT_UUID_NO_ADDRESS': 0xC0020028,
		'RPC_NT_DUPLICATE_ENDPOINT': 0xC0020029,
		'RPC_NT_UNKNOWN_AUTHN_TYPE': 0xC002002A,
		'RPC_NT_MAX_CALLS_TOO_SMALL': 0xC002002B,
		'RPC_NT_STRING_TOO_LONG': 0xC002002C,
		'RPC_NT_PROTSEQ_NOT_FOUND': 0xC002002D,
		'RPC_NT_PROCNUM_OUT_OF_RANGE': 0xC002002E,
		'RPC_NT_BINDING_HAS_NO_AUTH': 0xC002002F,
		'RPC_NT_UNKNOWN_AUTHN_SERVICE': 0xC0020030,
		'RPC_NT_UNKNOWN_AUTHN_LEVEL': 0xC0020031,
		'RPC_NT_INVALID_AUTH_IDENTITY': 0xC0020032,
		'RPC_NT_UNKNOWN_AUTHZ_SERVICE': 0xC0020033,
		'EPT_NT_INVALID_ENTRY': 0xC0020034,
		'EPT_NT_CANT_PERFORM_OP': 0xC0020035,
		'EPT_NT_NOT_REGISTERED': 0xC0020036,
		'RPC_NT_NOTHING_TO_EXPORT': 0xC0020037,
		'RPC_NT_INCOMPLETE_NAME': 0xC0020038,
		'RPC_NT_INVALID_VERS_OPTION': 0xC0020039,
		'RPC_NT_NO_MORE_MEMBERS': 0xC002003A,
		'RPC_NT_NOT_ALL_OBJS_UNEXPORTED': 0xC002003B,
		'RPC_NT_INTERFACE_NOT_FOUND': 0xC002003C,
		'RPC_NT_ENTRY_ALREADY_EXISTS': 0xC002003D,
		'RPC_NT_ENTRY_NOT_FOUND': 0xC002003E,
		'RPC_NT_NAME_SERVICE_UNAVAILABLE': 0xC002003F,
		'RPC_NT_INVALID_NAF_ID': 0xC0020040,
		'RPC_NT_CANNOT_SUPPORT': 0xC0020041,
		'RPC_NT_NO_CONTEXT_AVAILABLE': 0xC0020042,
		'RPC_NT_INTERNAL_ERROR': 0xC0020043,
		'RPC_NT_ZERO_DIVIDE': 0xC0020044,
		'RPC_NT_ADDRESS_ERROR': 0xC0020045,
		'RPC_NT_FP_DIV_ZERO': 0xC0020046,
		'RPC_NT_FP_UNDERFLOW': 0xC0020047,
		'RPC_NT_FP_OVERFLOW': 0xC0020048,
		'RPC_NT_CALL_IN_PROGRESS': 0xC0020049,
		'RPC_NT_NO_MORE_BINDINGS': 0xC002004A,
		'RPC_NT_GROUP_MEMBER_NOT_FOUND': 0xC002004B,
		'EPT_NT_CANT_CREATE': 0xC002004C,
		'RPC_NT_INVALID_OBJECT': 0xC002004D,
		'RPC_NT_NO_INTERFACES': 0xC002004F,
		'RPC_NT_CALL_CANCELLED': 0xC0020050,
		'RPC_NT_BINDING_INCOMPLETE': 0xC0020051,
		'RPC_NT_COMM_FAILURE': 0xC0020052,
		'RPC_NT_UNSUPPORTED_AUTHN_LEVEL': 0xC0020053,
		'RPC_NT_NO_PRINC_NAME': 0xC0020054,
		'RPC_NT_NOT_RPC_ERROR': 0xC0020055,
		'RPC_NT_SEC_PKG_ERROR': 0xC0020057,
		'RPC_NT_NOT_CANCELLED': 0xC0020058,
		'RPC_NT_INVALID_ASYNC_HANDLE': 0xC0020062,
		'RPC_NT_INVALID_ASYNC_CALL': 0xC0020063,
		'RPC_NT_PROXY_ACCESS_DENIED': 0xC0020064,
		'RPC_NT_NO_MORE_ENTRIES': 0xC0030001,
		'RPC_NT_SS_CHAR_TRANS_OPEN_FAIL': 0xC0030002,
		'RPC_NT_SS_CHAR_TRANS_SHORT_FILE': 0xC0030003,
		'RPC_NT_SS_IN_NULL_CONTEXT': 0xC0030004,
		'RPC_NT_SS_CONTEXT_MISMATCH': 0xC0030005,
		'RPC_NT_SS_CONTEXT_DAMAGED': 0xC0030006,
		'RPC_NT_SS_HANDLES_MISMATCH': 0xC0030007,
		'RPC_NT_SS_CANNOT_GET_CALL_HANDLE': 0xC0030008,
		'RPC_NT_NULL_REF_POINTER': 0xC0030009,
		'RPC_NT_ENUM_VALUE_OUT_OF_RANGE': 0xC003000A,
		'RPC_NT_BYTE_COUNT_TOO_SMALL': 0xC003000B,
		'RPC_NT_BAD_STUB_DATA': 0xC003000C,
		'RPC_NT_INVALID_ES_ACTION': 0xC0030059,
		'RPC_NT_WRONG_ES_VERSION': 0xC003005A,
		'RPC_NT_WRONG_STUB_VERSION': 0xC003005B,
		'RPC_NT_INVALID_PIPE_OBJECT': 0xC003005C,
		'RPC_NT_INVALID_PIPE_OPERATION': 0xC003005D,
		'RPC_NT_WRONG_PIPE_VERSION': 0xC003005E,
		'RPC_NT_PIPE_CLOSED': 0xC003005F,
		'RPC_NT_PIPE_DISCIPLINE_ERROR': 0xC0030060,
		'RPC_NT_PIPE_EMPTY': 0xC0030061,
		'STATUS_PNP_BAD_MPS_TABLE': 0xC0040035,
		'STATUS_PNP_TRANSLATION_FAILED': 0xC0040036,
		'STATUS_PNP_IRQ_TRANSLATION_FAILED': 0xC0040037,
		'STATUS_PNP_INVALID_ID': 0xC0040038,
		'STATUS_IO_REISSUE_AS_CACHED': 0xC0040039,
		'STATUS_CTX_WINSTATION_NAME_INVALID': 0xC00A0001,
		'STATUS_CTX_INVALID_PD': 0xC00A0002,
		'STATUS_CTX_PD_NOT_FOUND': 0xC00A0003,
		'STATUS_CTX_CLOSE_PENDING': 0xC00A0006,
		'STATUS_CTX_NO_OUTBUF': 0xC00A0007,
		'STATUS_CTX_MODEM_INF_NOT_FOUND': 0xC00A0008,
		'STATUS_CTX_INVALID_MODEMNAME': 0xC00A0009,
		'STATUS_CTX_RESPONSE_ERROR': 0xC00A000A,
		'STATUS_CTX_MODEM_RESPONSE_TIMEOUT': 0xC00A000B,
		'STATUS_CTX_MODEM_RESPONSE_NO_CARRIER': 0xC00A000C,
		'STATUS_CTX_MODEM_RESPONSE_NO_DIALTONE': 0xC00A000D,
		'STATUS_CTX_MODEM_RESPONSE_BUSY': 0xC00A000E,
		'STATUS_CTX_MODEM_RESPONSE_VOICE': 0xC00A000F,
		'STATUS_CTX_TD_ERROR': 0xC00A0010,
		'STATUS_CTX_LICENSE_CLIENT_INVALID': 0xC00A0012,
		'STATUS_CTX_LICENSE_NOT_AVAILABLE': 0xC00A0013,
		'STATUS_CTX_LICENSE_EXPIRED': 0xC00A0014,
		'STATUS_CTX_WINSTATION_NOT_FOUND': 0xC00A0015,
		'STATUS_CTX_WINSTATION_NAME_COLLISION': 0xC00A0016,
		'STATUS_CTX_WINSTATION_BUSY': 0xC00A0017,
		'STATUS_CTX_BAD_VIDEO_MODE': 0xC00A0018,
		'STATUS_CTX_GRAPHICS_INVALID': 0xC00A0022,
		'STATUS_CTX_NOT_CONSOLE': 0xC00A0024,
		'STATUS_CTX_CLIENT_QUERY_TIMEOUT': 0xC00A0026,
		'STATUS_CTX_CONSOLE_DISCONNECT': 0xC00A0027,
		'STATUS_CTX_CONSOLE_CONNECT': 0xC00A0028,
		'STATUS_CTX_SHADOW_DENIED': 0xC00A002A,
		'STATUS_CTX_WINSTATION_ACCESS_DENIED': 0xC00A002B,
		'STATUS_CTX_INVALID_WD': 0xC00A002E,
		'STATUS_CTX_WD_NOT_FOUND': 0xC00A002F,
		'STATUS_CTX_SHADOW_INVALID': 0xC00A0030,
		'STATUS_CTX_SHADOW_DISABLED': 0xC00A0031,
		'STATUS_RDP_PROTOCOL_ERROR': 0xC00A0032,
		'STATUS_CTX_CLIENT_LICENSE_NOT_SET': 0xC00A0033,
		'STATUS_CTX_CLIENT_LICENSE_IN_USE': 0xC00A0034,
		'STATUS_CTX_SHADOW_ENDED_BY_MODE_CHANGE': 0xC00A0035,
		'STATUS_CTX_SHADOW_NOT_RUNNING': 0xC00A0036,
		'STATUS_CTX_LOGON_DISABLED': 0xC00A0037,
		'STATUS_CTX_SECURITY_LAYER_ERROR': 0xC00A0038,
		'STATUS_TS_INCOMPATIBLE_SESSIONS': 0xC00A0039,
		'STATUS_MUI_FILE_NOT_FOUND': 0xC00B0001,
		'STATUS_MUI_INVALID_FILE': 0xC00B0002,
		'STATUS_MUI_INVALID_RC_CONFIG': 0xC00B0003,
		'STATUS_MUI_INVALID_LOCALE_NAME': 0xC00B0004,
		'STATUS_MUI_INVALID_ULTIMATEFALLBACK_NAME': 0xC00B0005,
		'STATUS_MUI_FILE_NOT_LOADED': 0xC00B0006,
		'STATUS_RESOURCE_ENUM_USER_STOP': 0xC00B0007,
		'STATUS_CLUSTER_INVALID_NODE': 0xC0130001,
		'STATUS_CLUSTER_NODE_EXISTS': 0xC0130002,
		'STATUS_CLUSTER_JOIN_IN_PROGRESS': 0xC0130003,
		'STATUS_CLUSTER_NODE_NOT_FOUND': 0xC0130004,
		'STATUS_CLUSTER_LOCAL_NODE_NOT_FOUND': 0xC0130005,
		'STATUS_CLUSTER_NETWORK_EXISTS': 0xC0130006,
		'STATUS_CLUSTER_NETWORK_NOT_FOUND': 0xC0130007,
		'STATUS_CLUSTER_NETINTERFACE_EXISTS': 0xC0130008,
		'STATUS_CLUSTER_NETINTERFACE_NOT_FOUND': 0xC0130009,
		'STATUS_CLUSTER_INVALID_REQUEST': 0xC013000A,
		'STATUS_CLUSTER_INVALID_NETWORK_PROVIDER': 0xC013000B,
		'STATUS_CLUSTER_NODE_DOWN': 0xC013000C,
		'STATUS_CLUSTER_NODE_UNREACHABLE': 0xC013000D,
		'STATUS_CLUSTER_NODE_NOT_MEMBER': 0xC013000E,
		'STATUS_CLUSTER_JOIN_NOT_IN_PROGRESS': 0xC013000F,
		'STATUS_CLUSTER_INVALID_NETWORK': 0xC0130010,
		'STATUS_CLUSTER_NO_NET_ADAPTERS': 0xC0130011,
		'STATUS_CLUSTER_NODE_UP': 0xC0130012,
		'STATUS_CLUSTER_NODE_PAUSED': 0xC0130013,
		'STATUS_CLUSTER_NODE_NOT_PAUSED': 0xC0130014,
		'STATUS_CLUSTER_NO_SECURITY_CONTEXT': 0xC0130015,
		'STATUS_CLUSTER_NETWORK_NOT_INTERNAL': 0xC0130016,
		'STATUS_CLUSTER_POISONED': 0xC0130017,
		'STATUS_ACPI_INVALID_OPCODE': 0xC0140001,
		'STATUS_ACPI_STACK_OVERFLOW': 0xC0140002,
		'STATUS_ACPI_ASSERT_FAILED': 0xC0140003,
		'STATUS_ACPI_INVALID_INDEX': 0xC0140004,
		'STATUS_ACPI_INVALID_ARGUMENT': 0xC0140005,
		'STATUS_ACPI_FATAL': 0xC0140006,
		'STATUS_ACPI_INVALID_SUPERNAME': 0xC0140007,
		'STATUS_ACPI_INVALID_ARGTYPE': 0xC0140008,
		'STATUS_ACPI_INVALID_OBJTYPE': 0xC0140009,
		'STATUS_ACPI_INVALID_TARGETTYPE': 0xC014000A,
		'STATUS_ACPI_INCORRECT_ARGUMENT_COUNT': 0xC014000B,
		'STATUS_ACPI_ADDRESS_NOT_MAPPED': 0xC014000C,
		'STATUS_ACPI_INVALID_EVENTTYPE': 0xC014000D,
		'STATUS_ACPI_HANDLER_COLLISION': 0xC014000E,
		'STATUS_ACPI_INVALID_DATA': 0xC014000F,
		'STATUS_ACPI_INVALID_REGION': 0xC0140010,
		'STATUS_ACPI_INVALID_ACCESS_SIZE': 0xC0140011,
		'STATUS_ACPI_ACQUIRE_GLOBAL_LOCK': 0xC0140012,
		'STATUS_ACPI_ALREADY_INITIALIZED': 0xC0140013,
		'STATUS_ACPI_NOT_INITIALIZED': 0xC0140014,
		'STATUS_ACPI_INVALID_MUTEX_LEVEL': 0xC0140015,
		'STATUS_ACPI_MUTEX_NOT_OWNED': 0xC0140016,
		'STATUS_ACPI_MUTEX_NOT_OWNER': 0xC0140017,
		'STATUS_ACPI_RS_ACCESS': 0xC0140018,
		'STATUS_ACPI_INVALID_TABLE': 0xC0140019,
		'STATUS_ACPI_REG_HANDLER_FAILED': 0xC0140020,
		'STATUS_ACPI_POWER_REQUEST_FAILED': 0xC0140021,
		'STATUS_SXS_SECTION_NOT_FOUND': 0xC0150001,
		'STATUS_SXS_CANT_GEN_ACTCTX': 0xC0150002,
		'STATUS_SXS_INVALID_ACTCTXDATA_FORMAT': 0xC0150003,
		'STATUS_SXS_ASSEMBLY_NOT_FOUND': 0xC0150004,
		'STATUS_SXS_MANIFEST_FORMAT_ERROR': 0xC0150005,
		'STATUS_SXS_MANIFEST_PARSE_ERROR': 0xC0150006,
		'STATUS_SXS_ACTIVATION_CONTEXT_DISABLED': 0xC0150007,
		'STATUS_SXS_KEY_NOT_FOUND': 0xC0150008,
		'STATUS_SXS_VERSION_CONFLICT': 0xC0150009,
		'STATUS_SXS_WRONG_SECTION_TYPE': 0xC015000A,
		'STATUS_SXS_THREAD_QUERIES_DISABLED': 0xC015000B,
		'STATUS_SXS_ASSEMBLY_MISSING': 0xC015000C,
		'STATUS_SXS_PROCESS_DEFAULT_ALREADY_SET': 0xC015000E,
		'STATUS_SXS_EARLY_DEACTIVATION': 0xC015000F,
		'STATUS_SXS_INVALID_DEACTIVATION': 0xC0150010,
		'STATUS_SXS_MULTIPLE_DEACTIVATION': 0xC0150011,
		'STATUS_SXS_SYSTEM_DEFAULT_ACTIVATION_CONTEXT_EMPTY': 0xC0150012,
		'STATUS_SXS_PROCESS_TERMINATION_REQUESTED': 0xC0150013,
		'STATUS_SXS_CORRUPT_ACTIVATION_STACK': 0xC0150014,
		'STATUS_SXS_CORRUPTION': 0xC0150015,
		'STATUS_SXS_INVALID_IDENTITY_ATTRIBUTE_VALUE': 0xC0150016,
		'STATUS_SXS_INVALID_IDENTITY_ATTRIBUTE_NAME': 0xC0150017,
		'STATUS_SXS_IDENTITY_DUPLICATE_ATTRIBUTE': 0xC0150018,
		'STATUS_SXS_IDENTITY_PARSE_ERROR': 0xC0150019,
		'STATUS_SXS_COMPONENT_STORE_CORRUPT': 0xC015001A,
		'STATUS_SXS_FILE_HASH_MISMATCH': 0xC015001B,
		'STATUS_SXS_MANIFEST_IDENTITY_SAME_BUT_CONTENTS_DIFFERENT': 0xC015001C,
		'STATUS_SXS_IDENTITIES_DIFFERENT': 0xC015001D,
		'STATUS_SXS_ASSEMBLY_IS_NOT_A_DEPLOYMENT': 0xC015001E,
		'STATUS_SXS_FILE_NOT_PART_OF_ASSEMBLY': 0xC015001F,
		'STATUS_ADVANCED_INSTALLER_FAILED': 0xC0150020,
		'STATUS_XML_ENCODING_MISMATCH': 0xC0150021,
		'STATUS_SXS_MANIFEST_TOO_BIG': 0xC0150022,
		'STATUS_SXS_SETTING_NOT_REGISTERED': 0xC0150023,
		'STATUS_SXS_TRANSACTION_CLOSURE_INCOMPLETE': 0xC0150024,
		'STATUS_SMI_PRIMITIVE_INSTALLER_FAILED': 0xC0150025,
		'STATUS_GENERIC_COMMAND_FAILED': 0xC0150026,
		'STATUS_SXS_FILE_HASH_MISSING': 0xC0150027,
		'STATUS_TRANSACTIONAL_CONFLICT': 0xC0190001,
		'STATUS_INVALID_TRANSACTION': 0xC0190002,
		'STATUS_TRANSACTION_NOT_ACTIVE': 0xC0190003,
		'STATUS_TM_INITIALIZATION_FAILED': 0xC0190004,
		'STATUS_RM_NOT_ACTIVE': 0xC0190005,
		'STATUS_RM_METADATA_CORRUPT': 0xC0190006,
		'STATUS_TRANSACTION_NOT_JOINED': 0xC0190007,
		'STATUS_DIRECTORY_NOT_RM': 0xC0190008,
		'STATUS_TRANSACTIONS_UNSUPPORTED_REMOTE': 0xC019000A,
		'STATUS_LOG_RESIZE_INVALID_SIZE': 0xC019000B,
		'STATUS_REMOTE_FILE_VERSION_MISMATCH': 0xC019000C,
		'STATUS_CRM_PROTOCOL_ALREADY_EXISTS': 0xC019000F,
		'STATUS_TRANSACTION_PROPAGATION_FAILED': 0xC0190010,
		'STATUS_CRM_PROTOCOL_NOT_FOUND': 0xC0190011,
		'STATUS_TRANSACTION_SUPERIOR_EXISTS': 0xC0190012,
		'STATUS_TRANSACTION_REQUEST_NOT_VALID': 0xC0190013,
		'STATUS_TRANSACTION_NOT_REQUESTED': 0xC0190014,
		'STATUS_TRANSACTION_ALREADY_ABORTED': 0xC0190015,
		'STATUS_TRANSACTION_ALREADY_COMMITTED': 0xC0190016,
		'STATUS_TRANSACTION_INVALID_MARSHALL_BUFFER': 0xC0190017,
		'STATUS_CURRENT_TRANSACTION_NOT_VALID': 0xC0190018,
		'STATUS_LOG_GROWTH_FAILED': 0xC0190019,
		'STATUS_OBJECT_NO_LONGER_EXISTS': 0xC0190021,
		'STATUS_STREAM_MINIVERSION_NOT_FOUND': 0xC0190022,
		'STATUS_STREAM_MINIVERSION_NOT_VALID': 0xC0190023,
		'STATUS_MINIVERSION_INACCESSIBLE_FROM_SPECIFIED_TRANSACTION': 0xC0190024,
		'STATUS_CANT_OPEN_MINIVERSION_WITH_MODIFY_INTENT': 0xC0190025,
		'STATUS_CANT_CREATE_MORE_STREAM_MINIVERSIONS': 0xC0190026,
		'STATUS_HANDLE_NO_LONGER_VALID': 0xC0190028,
		'STATUS_LOG_CORRUPTION_DETECTED': 0xC0190030,
		'STATUS_RM_DISCONNECTED': 0xC0190032,
		'STATUS_ENLISTMENT_NOT_SUPERIOR': 0xC0190033,
		'STATUS_FILE_IDENTITY_NOT_PERSISTENT': 0xC0190036,
		'STATUS_CANT_BREAK_TRANSACTIONAL_DEPENDENCY': 0xC0190037,
		'STATUS_CANT_CROSS_RM_BOUNDARY': 0xC0190038,
		'STATUS_TXF_DIR_NOT_EMPTY': 0xC0190039,
		'STATUS_INDOUBT_TRANSACTIONS_EXIST': 0xC019003A,
		'STATUS_TM_VOLATILE': 0xC019003B,
		'STATUS_ROLLBACK_TIMER_EXPIRED': 0xC019003C,
		'STATUS_TXF_ATTRIBUTE_CORRUPT': 0xC019003D,
		'STATUS_EFS_NOT_ALLOWED_IN_TRANSACTION': 0xC019003E,
		'STATUS_TRANSACTIONAL_OPEN_NOT_ALLOWED': 0xC019003F,
		'STATUS_TRANSACTED_MAPPING_UNSUPPORTED_REMOTE': 0xC0190040,
		'STATUS_TRANSACTION_REQUIRED_PROMOTION': 0xC0190043,
		'STATUS_CANNOT_EXECUTE_FILE_IN_TRANSACTION': 0xC0190044,
		'STATUS_TRANSACTIONS_NOT_FROZEN': 0xC0190045,
		'STATUS_TRANSACTION_FREEZE_IN_PROGRESS': 0xC0190046,
		'STATUS_NOT_SNAPSHOT_VOLUME': 0xC0190047,
		'STATUS_NO_SAVEPOINT_WITH_OPEN_FILES': 0xC0190048,
		'STATUS_SPARSE_NOT_ALLOWED_IN_TRANSACTION': 0xC0190049,
		'STATUS_TM_IDENTITY_MISMATCH': 0xC019004A,
		'STATUS_FLOATED_SECTION': 0xC019004B,
		'STATUS_CANNOT_ACCEPT_TRANSACTED_WORK': 0xC019004C,
		'STATUS_CANNOT_ABORT_TRANSACTIONS': 0xC019004D,
		'STATUS_TRANSACTION_NOT_FOUND': 0xC019004E,
		'STATUS_RESOURCEMANAGER_NOT_FOUND': 0xC019004F,
		'STATUS_ENLISTMENT_NOT_FOUND': 0xC0190050,
		'STATUS_TRANSACTIONMANAGER_NOT_FOUND': 0xC0190051,
		'STATUS_TRANSACTIONMANAGER_NOT_ONLINE': 0xC0190052,
		'STATUS_TRANSACTIONMANAGER_RECOVERY_NAME_COLLISION': 0xC0190053,
		'STATUS_TRANSACTION_NOT_ROOT': 0xC0190054,
		'STATUS_TRANSACTION_OBJECT_EXPIRED': 0xC0190055,
		'STATUS_COMPRESSION_NOT_ALLOWED_IN_TRANSACTION': 0xC0190056,
		'STATUS_TRANSACTION_RESPONSE_NOT_ENLISTED': 0xC0190057,
		'STATUS_TRANSACTION_RECORD_TOO_LONG': 0xC0190058,
		'STATUS_NO_LINK_TRACKING_IN_TRANSACTION': 0xC0190059,
		'STATUS_OPERATION_NOT_SUPPORTED_IN_TRANSACTION': 0xC019005A,
		'STATUS_TRANSACTION_INTEGRITY_VIOLATED': 0xC019005B,
		'STATUS_EXPIRED_HANDLE': 0xC0190060,
		'STATUS_TRANSACTION_NOT_ENLISTED': 0xC0190061,
		'STATUS_LOG_SECTOR_INVALID': 0xC01A0001,
		'STATUS_LOG_SECTOR_PARITY_INVALID': 0xC01A0002,
		'STATUS_LOG_SECTOR_REMAPPED': 0xC01A0003,
		'STATUS_LOG_BLOCK_INCOMPLETE': 0xC01A0004,
		'STATUS_LOG_INVALID_RANGE': 0xC01A0005,
		'STATUS_LOG_BLOCKS_EXHAUSTED': 0xC01A0006,
		'STATUS_LOG_READ_CONTEXT_INVALID': 0xC01A0007,
		'STATUS_LOG_RESTART_INVALID': 0xC01A0008,
		'STATUS_LOG_BLOCK_VERSION': 0xC01A0009,
		'STATUS_LOG_BLOCK_INVALID': 0xC01A000A,
		'STATUS_LOG_READ_MODE_INVALID': 0xC01A000B,
		'STATUS_LOG_METADATA_CORRUPT': 0xC01A000D,
		'STATUS_LOG_METADATA_INVALID': 0xC01A000E,
		'STATUS_LOG_METADATA_INCONSISTENT': 0xC01A000F,
		'STATUS_LOG_RESERVATION_INVALID': 0xC01A0010,
		'STATUS_LOG_CANT_DELETE': 0xC01A0011,
		'STATUS_LOG_CONTAINER_LIMIT_EXCEEDED': 0xC01A0012,
		'STATUS_LOG_START_OF_LOG': 0xC01A0013,
		'STATUS_LOG_POLICY_ALREADY_INSTALLED': 0xC01A0014,
		'STATUS_LOG_POLICY_NOT_INSTALLED': 0xC01A0015,
		'STATUS_LOG_POLICY_INVALID': 0xC01A0016,
		'STATUS_LOG_POLICY_CONFLICT': 0xC01A0017,
		'STATUS_LOG_PINNED_ARCHIVE_TAIL': 0xC01A0018,
		'STATUS_LOG_RECORD_NONEXISTENT': 0xC01A0019,
		'STATUS_LOG_RECORDS_RESERVED_INVALID': 0xC01A001A,
		'STATUS_LOG_SPACE_RESERVED_INVALID': 0xC01A001B,
		'STATUS_LOG_TAIL_INVALID': 0xC01A001C,
		'STATUS_LOG_FULL': 0xC01A001D,
		'STATUS_LOG_MULTIPLEXED': 0xC01A001E,
		'STATUS_LOG_DEDICATED': 0xC01A001F,
		'STATUS_LOG_ARCHIVE_NOT_IN_PROGRESS': 0xC01A0020,
		'STATUS_LOG_ARCHIVE_IN_PROGRESS': 0xC01A0021,
		'STATUS_LOG_EPHEMERAL': 0xC01A0022,
		'STATUS_LOG_NOT_ENOUGH_CONTAINERS': 0xC01A0023,
		'STATUS_LOG_CLIENT_ALREADY_REGISTERED': 0xC01A0024,
		'STATUS_LOG_CLIENT_NOT_REGISTERED': 0xC01A0025,
		'STATUS_LOG_FULL_HANDLER_IN_PROGRESS': 0xC01A0026,
		'STATUS_LOG_CONTAINER_READ_FAILED': 0xC01A0027,
		'STATUS_LOG_CONTAINER_WRITE_FAILED': 0xC01A0028,
		'STATUS_LOG_CONTAINER_OPEN_FAILED': 0xC01A0029,
		'STATUS_LOG_CONTAINER_STATE_INVALID': 0xC01A002A,
		'STATUS_LOG_STATE_INVALID': 0xC01A002B,
		'STATUS_LOG_PINNED': 0xC01A002C,
		'STATUS_LOG_METADATA_FLUSH_FAILED': 0xC01A002D,
		'STATUS_LOG_INCONSISTENT_SECURITY': 0xC01A002E,
		'STATUS_LOG_APPENDED_FLUSH_FAILED': 0xC01A002F,
		'STATUS_LOG_PINNED_RESERVATION': 0xC01A0030,
		'STATUS_VIDEO_HUNG_DISPLAY_DRIVER_THREAD': 0xC01B00EA,
		'STATUS_FLT_NO_HANDLER_DEFINED': 0xC01C0001,
		'STATUS_FLT_CONTEXT_ALREADY_DEFINED': 0xC01C0002,
		'STATUS_FLT_INVALID_ASYNCHRONOUS_REQUEST': 0xC01C0003,
		'STATUS_FLT_DISALLOW_FAST_IO': 0xC01C0004,
		'STATUS_FLT_INVALID_NAME_REQUEST': 0xC01C0005,
		'STATUS_FLT_NOT_SAFE_TO_POST_OPERATION': 0xC01C0006,
		'STATUS_FLT_NOT_INITIALIZED': 0xC01C0007,
		'STATUS_FLT_FILTER_NOT_READY': 0xC01C0008,
		'STATUS_FLT_POST_OPERATION_CLEANUP': 0xC01C0009,
		'STATUS_FLT_INTERNAL_ERROR': 0xC01C000A,
		'STATUS_FLT_DELETING_OBJECT': 0xC01C000B,
		'STATUS_FLT_MUST_BE_NONPAGED_POOL': 0xC01C000C,
		'STATUS_FLT_DUPLICATE_ENTRY': 0xC01C000D,
		'STATUS_FLT_CBDQ_DISABLED': 0xC01C000E,
		'STATUS_FLT_DO_NOT_ATTACH': 0xC01C000F,
		'STATUS_FLT_DO_NOT_DETACH': 0xC01C0010,
		'STATUS_FLT_INSTANCE_ALTITUDE_COLLISION': 0xC01C0011,
		'STATUS_FLT_INSTANCE_NAME_COLLISION': 0xC01C0012,
		'STATUS_FLT_FILTER_NOT_FOUND': 0xC01C0013,
		'STATUS_FLT_VOLUME_NOT_FOUND': 0xC01C0014,
		'STATUS_FLT_INSTANCE_NOT_FOUND': 0xC01C0015,
		'STATUS_FLT_CONTEXT_ALLOCATION_NOT_FOUND': 0xC01C0016,
		'STATUS_FLT_INVALID_CONTEXT_REGISTRATION': 0xC01C0017,
		'STATUS_FLT_NAME_CACHE_MISS': 0xC01C0018,
		'STATUS_FLT_NO_DEVICE_OBJECT': 0xC01C0019,
		'STATUS_FLT_VOLUME_ALREADY_MOUNTED': 0xC01C001A,
		'STATUS_FLT_ALREADY_ENLISTED': 0xC01C001B,
		'STATUS_FLT_CONTEXT_ALREADY_LINKED': 0xC01C001C,
		'STATUS_FLT_NO_WAITER_FOR_REPLY': 0xC01C0020,
		'STATUS_MONITOR_NO_DESCRIPTOR': 0xC01D0001,
		'STATUS_MONITOR_UNKNOWN_DESCRIPTOR_FORMAT': 0xC01D0002,
		'STATUS_MONITOR_INVALID_DESCRIPTOR_CHECKSUM': 0xC01D0003,
		'STATUS_MONITOR_INVALID_STANDARD_TIMING_BLOCK': 0xC01D0004,
		'STATUS_MONITOR_WMI_DATABLOCK_REGISTRATION_FAILED': 0xC01D0005,
		'STATUS_MONITOR_INVALID_SERIAL_NUMBER_MONDSC_BLOCK': 0xC01D0006,
		'STATUS_MONITOR_INVALID_USER_FRIENDLY_MONDSC_BLOCK': 0xC01D0007,
		'STATUS_MONITOR_NO_MORE_DESCRIPTOR_DATA': 0xC01D0008,
		'STATUS_MONITOR_INVALID_DETAILED_TIMING_BLOCK': 0xC01D0009,
		'STATUS_MONITOR_INVALID_MANUFACTURE_DATE': 0xC01D000A,
		'STATUS_GRAPHICS_NOT_EXCLUSIVE_MODE_OWNER': 0xC01E0000,
		'STATUS_GRAPHICS_INSUFFICIENT_DMA_BUFFER': 0xC01E0001,
		'STATUS_GRAPHICS_INVALID_DISPLAY_ADAPTER': 0xC01E0002,
		'STATUS_GRAPHICS_ADAPTER_WAS_RESET': 0xC01E0003,
		'STATUS_GRAPHICS_INVALID_DRIVER_MODEL': 0xC01E0004,
		'STATUS_GRAPHICS_PRESENT_MODE_CHANGED': 0xC01E0005,
		'STATUS_GRAPHICS_PRESENT_OCCLUDED': 0xC01E0006,
		'STATUS_GRAPHICS_PRESENT_DENIED': 0xC01E0007,
		'STATUS_GRAPHICS_CANNOTCOLORCONVERT': 0xC01E0008,
		'STATUS_GRAPHICS_PRESENT_REDIRECTION_DISABLED': 0xC01E000B,
		'STATUS_GRAPHICS_PRESENT_UNOCCLUDED': 0xC01E000C,
		'STATUS_GRAPHICS_NO_VIDEO_MEMORY': 0xC01E0100,
		'STATUS_GRAPHICS_CANT_LOCK_MEMORY': 0xC01E0101,
		'STATUS_GRAPHICS_ALLOCATION_BUSY': 0xC01E0102,
		'STATUS_GRAPHICS_TOO_MANY_REFERENCES': 0xC01E0103,
		'STATUS_GRAPHICS_TRY_AGAIN_LATER': 0xC01E0104,
		'STATUS_GRAPHICS_TRY_AGAIN_NOW': 0xC01E0105,
		'STATUS_GRAPHICS_ALLOCATION_INVALID': 0xC01E0106,
		'STATUS_GRAPHICS_UNSWIZZLING_APERTURE_UNAVAILABLE': 0xC01E0107,
		'STATUS_GRAPHICS_UNSWIZZLING_APERTURE_UNSUPPORTED': 0xC01E0108,
		'STATUS_GRAPHICS_CANT_EVICT_PINNED_ALLOCATION': 0xC01E0109,
		'STATUS_GRAPHICS_INVALID_ALLOCATION_USAGE': 0xC01E0110,
		'STATUS_GRAPHICS_CANT_RENDER_LOCKED_ALLOCATION': 0xC01E0111,
		'STATUS_GRAPHICS_ALLOCATION_CLOSED': 0xC01E0112,
		'STATUS_GRAPHICS_INVALID_ALLOCATION_INSTANCE': 0xC01E0113,
		'STATUS_GRAPHICS_INVALID_ALLOCATION_HANDLE': 0xC01E0114,
		'STATUS_GRAPHICS_WRONG_ALLOCATION_DEVICE': 0xC01E0115,
		'STATUS_GRAPHICS_ALLOCATION_CONTENT_LOST': 0xC01E0116,
		'STATUS_GRAPHICS_GPU_EXCEPTION_ON_DEVICE': 0xC01E0200,
		'STATUS_GRAPHICS_INVALID_VIDPN_TOPOLOGY': 0xC01E0300,
		'STATUS_GRAPHICS_VIDPN_TOPOLOGY_NOT_SUPPORTED': 0xC01E0301,
		'STATUS_GRAPHICS_VIDPN_TOPOLOGY_CURRENTLY_NOT_SUPPORTED': 0xC01E0302,
		'STATUS_GRAPHICS_INVALID_VIDPN': 0xC01E0303,
		'STATUS_GRAPHICS_INVALID_VIDEO_PRESENT_SOURCE': 0xC01E0304,
		'STATUS_GRAPHICS_INVALID_VIDEO_PRESENT_TARGET': 0xC01E0305,
		'STATUS_GRAPHICS_VIDPN_MODALITY_NOT_SUPPORTED': 0xC01E0306,
		'STATUS_GRAPHICS_INVALID_VIDPN_SOURCEMODESET': 0xC01E0308,
		'STATUS_GRAPHICS_INVALID_VIDPN_TARGETMODESET': 0xC01E0309,
		'STATUS_GRAPHICS_INVALID_FREQUENCY': 0xC01E030A,
		'STATUS_GRAPHICS_INVALID_ACTIVE_REGION': 0xC01E030B,
		'STATUS_GRAPHICS_INVALID_TOTAL_REGION': 0xC01E030C,
		'STATUS_GRAPHICS_INVALID_VIDEO_PRESENT_SOURCE_MODE': 0xC01E0310,
		'STATUS_GRAPHICS_INVALID_VIDEO_PRESENT_TARGET_MODE': 0xC01E0311,
		'STATUS_GRAPHICS_PINNED_MODE_MUST_REMAIN_IN_SET': 0xC01E0312,
		'STATUS_GRAPHICS_PATH_ALREADY_IN_TOPOLOGY': 0xC01E0313,
		'STATUS_GRAPHICS_MODE_ALREADY_IN_MODESET': 0xC01E0314,
		'STATUS_GRAPHICS_INVALID_VIDEOPRESENTSOURCESET': 0xC01E0315,
		'STATUS_GRAPHICS_INVALID_VIDEOPRESENTTARGETSET': 0xC01E0316,
		'STATUS_GRAPHICS_SOURCE_ALREADY_IN_SET': 0xC01E0317,
		'STATUS_GRAPHICS_TARGET_ALREADY_IN_SET': 0xC01E0318,
		'STATUS_GRAPHICS_INVALID_VIDPN_PRESENT_PATH': 0xC01E0319,
		'STATUS_GRAPHICS_NO_RECOMMENDED_VIDPN_TOPOLOGY': 0xC01E031A,
		'STATUS_GRAPHICS_INVALID_MONITOR_FREQUENCYRANGESET': 0xC01E031B,
		'STATUS_GRAPHICS_INVALID_MONITOR_FREQUENCYRANGE': 0xC01E031C,
		'STATUS_GRAPHICS_FREQUENCYRANGE_NOT_IN_SET': 0xC01E031D,
		'STATUS_GRAPHICS_FREQUENCYRANGE_ALREADY_IN_SET': 0xC01E031F,
		'STATUS_GRAPHICS_STALE_MODESET': 0xC01E0320,
		'STATUS_GRAPHICS_INVALID_MONITOR_SOURCEMODESET': 0xC01E0321,
		'STATUS_GRAPHICS_INVALID_MONITOR_SOURCE_MODE': 0xC01E0322,
		'STATUS_GRAPHICS_NO_RECOMMENDED_FUNCTIONAL_VIDPN': 0xC01E0323,
		'STATUS_GRAPHICS_MODE_ID_MUST_BE_UNIQUE': 0xC01E0324,
		'STATUS_GRAPHICS_EMPTY_ADAPTER_MONITOR_MODE_SUPPORT_INTERSECTION': 0xC01E0325,
		'STATUS_GRAPHICS_VIDEO_PRESENT_TARGETS_LESS_THAN_SOURCES': 0xC01E0326,
		'STATUS_GRAPHICS_PATH_NOT_IN_TOPOLOGY': 0xC01E0327,
		'STATUS_GRAPHICS_ADAPTER_MUST_HAVE_AT_LEAST_ONE_SOURCE': 0xC01E0328,
		'STATUS_GRAPHICS_ADAPTER_MUST_HAVE_AT_LEAST_ONE_TARGET': 0xC01E0329,
		'STATUS_GRAPHICS_INVALID_MONITORDESCRIPTORSET': 0xC01E032A,
		'STATUS_GRAPHICS_INVALID_MONITORDESCRIPTOR': 0xC01E032B,
		'STATUS_GRAPHICS_MONITORDESCRIPTOR_NOT_IN_SET': 0xC01E032C,
		'STATUS_GRAPHICS_MONITORDESCRIPTOR_ALREADY_IN_SET': 0xC01E032D,
		'STATUS_GRAPHICS_MONITORDESCRIPTOR_ID_MUST_BE_UNIQUE': 0xC01E032E,
		'STATUS_GRAPHICS_INVALID_VIDPN_TARGET_SUBSET_TYPE': 0xC01E032F,
		'STATUS_GRAPHICS_RESOURCES_NOT_RELATED': 0xC01E0330,
		'STATUS_GRAPHICS_SOURCE_ID_MUST_BE_UNIQUE': 0xC01E0331,
		'STATUS_GRAPHICS_TARGET_ID_MUST_BE_UNIQUE': 0xC01E0332,
		'STATUS_GRAPHICS_NO_AVAILABLE_VIDPN_TARGET': 0xC01E0333,
		'STATUS_GRAPHICS_MONITOR_COULD_NOT_BE_ASSOCIATED_WITH_ADAPTER': 0xC01E0334,
		'STATUS_GRAPHICS_NO_VIDPNMGR': 0xC01E0335,
		'STATUS_GRAPHICS_NO_ACTIVE_VIDPN': 0xC01E0336,
		'STATUS_GRAPHICS_STALE_VIDPN_TOPOLOGY': 0xC01E0337,
		'STATUS_GRAPHICS_MONITOR_NOT_CONNECTED': 0xC01E0338,
		'STATUS_GRAPHICS_SOURCE_NOT_IN_TOPOLOGY': 0xC01E0339,
		'STATUS_GRAPHICS_INVALID_PRIMARYSURFACE_SIZE': 0xC01E033A,
		'STATUS_GRAPHICS_INVALID_VISIBLEREGION_SIZE': 0xC01E033B,
		'STATUS_GRAPHICS_INVALID_STRIDE': 0xC01E033C,
		'STATUS_GRAPHICS_INVALID_PIXELFORMAT': 0xC01E033D,
		'STATUS_GRAPHICS_INVALID_COLORBASIS': 0xC01E033E,
		'STATUS_GRAPHICS_INVALID_PIXELVALUEACCESSMODE': 0xC01E033F,
		'STATUS_GRAPHICS_TARGET_NOT_IN_TOPOLOGY': 0xC01E0340,
		'STATUS_GRAPHICS_NO_DISPLAY_MODE_MANAGEMENT_SUPPORT': 0xC01E0341,
		'STATUS_GRAPHICS_VIDPN_SOURCE_IN_USE': 0xC01E0342,
		'STATUS_GRAPHICS_CANT_ACCESS_ACTIVE_VIDPN': 0xC01E0343,
		'STATUS_GRAPHICS_INVALID_PATH_IMPORTANCE_ORDINAL': 0xC01E0344,
		'STATUS_GRAPHICS_INVALID_PATH_CONTENT_GEOMETRY_TRANSFORMATION': 0xC01E0345,
		'STATUS_GRAPHICS_PATH_CONTENT_GEOMETRY_TRANSFORMATION_NOT_SUPPORTED': 0xC01E0346,
		'STATUS_GRAPHICS_INVALID_GAMMA_RAMP': 0xC01E0347,
		'STATUS_GRAPHICS_GAMMA_RAMP_NOT_SUPPORTED': 0xC01E0348,
		'STATUS_GRAPHICS_MULTISAMPLING_NOT_SUPPORTED': 0xC01E0349,
		'STATUS_GRAPHICS_MODE_NOT_IN_MODESET': 0xC01E034A,
		'STATUS_GRAPHICS_INVALID_VIDPN_TOPOLOGY_RECOMMENDATION_REASON': 0xC01E034D,
		'STATUS_GRAPHICS_INVALID_PATH_CONTENT_TYPE': 0xC01E034E,
		'STATUS_GRAPHICS_INVALID_COPYPROTECTION_TYPE': 0xC01E034F,
		'STATUS_GRAPHICS_UNASSIGNED_MODESET_ALREADY_EXISTS': 0xC01E0350,
		'STATUS_GRAPHICS_INVALID_SCANLINE_ORDERING': 0xC01E0352,
		'STATUS_GRAPHICS_TOPOLOGY_CHANGES_NOT_ALLOWED': 0xC01E0353,
		'STATUS_GRAPHICS_NO_AVAILABLE_IMPORTANCE_ORDINALS': 0xC01E0354,
		'STATUS_GRAPHICS_INCOMPATIBLE_PRIVATE_FORMAT': 0xC01E0355,
		'STATUS_GRAPHICS_INVALID_MODE_PRUNING_ALGORITHM': 0xC01E0356,
		'STATUS_GRAPHICS_INVALID_MONITOR_CAPABILITY_ORIGIN': 0xC01E0357,
		'STATUS_GRAPHICS_INVALID_MONITOR_FREQUENCYRANGE_CONSTRAINT': 0xC01E0358,
		'STATUS_GRAPHICS_MAX_NUM_PATHS_REACHED': 0xC01E0359,
		'STATUS_GRAPHICS_CANCEL_VIDPN_TOPOLOGY_AUGMENTATION': 0xC01E035A,
		'STATUS_GRAPHICS_INVALID_CLIENT_TYPE': 0xC01E035B,
		'STATUS_GRAPHICS_CLIENTVIDPN_NOT_SET': 0xC01E035C,
		'STATUS_GRAPHICS_SPECIFIED_CHILD_ALREADY_CONNECTED': 0xC01E0400,
		'STATUS_GRAPHICS_CHILD_DESCRIPTOR_NOT_SUPPORTED': 0xC01E0401,
		'STATUS_GRAPHICS_NOT_A_LINKED_ADAPTER': 0xC01E0430,
		'STATUS_GRAPHICS_LEADLINK_NOT_ENUMERATED': 0xC01E0431,
		'STATUS_GRAPHICS_CHAINLINKS_NOT_ENUMERATED': 0xC01E0432,
		'STATUS_GRAPHICS_ADAPTER_CHAIN_NOT_READY': 0xC01E0433,
		'STATUS_GRAPHICS_CHAINLINKS_NOT_STARTED': 0xC01E0434,
		'STATUS_GRAPHICS_CHAINLINKS_NOT_POWERED_ON': 0xC01E0435,
		'STATUS_GRAPHICS_INCONSISTENT_DEVICE_LINK_STATE': 0xC01E0436,
		'STATUS_GRAPHICS_NOT_POST_DEVICE_DRIVER': 0xC01E0438,
		'STATUS_GRAPHICS_ADAPTER_ACCESS_NOT_EXCLUDED': 0xC01E043B,
		'STATUS_GRAPHICS_OPM_NOT_SUPPORTED': 0xC01E0500,
		'STATUS_GRAPHICS_COPP_NOT_SUPPORTED': 0xC01E0501,
		'STATUS_GRAPHICS_UAB_NOT_SUPPORTED': 0xC01E0502,
		'STATUS_GRAPHICS_OPM_INVALID_ENCRYPTED_PARAMETERS': 0xC01E0503,
		'STATUS_GRAPHICS_OPM_PARAMETER_ARRAY_TOO_SMALL': 0xC01E0504,
		'STATUS_GRAPHICS_OPM_NO_PROTECTED_OUTPUTS_EXIST': 0xC01E0505,
		'STATUS_GRAPHICS_PVP_NO_DISPLAY_DEVICE_CORRESPONDS_TO_NAME': 0xC01E0506,
		'STATUS_GRAPHICS_PVP_DISPLAY_DEVICE_NOT_ATTACHED_TO_DESKTOP': 0xC01E0507,
		'STATUS_GRAPHICS_PVP_MIRRORING_DEVICES_NOT_SUPPORTED': 0xC01E0508,
		'STATUS_GRAPHICS_OPM_INVALID_POINTER': 0xC01E050A,
		'STATUS_GRAPHICS_OPM_INTERNAL_ERROR': 0xC01E050B,
		'STATUS_GRAPHICS_OPM_INVALID_HANDLE': 0xC01E050C,
		'STATUS_GRAPHICS_PVP_NO_MONITORS_CORRESPOND_TO_DISPLAY_DEVICE': 0xC01E050D,
		'STATUS_GRAPHICS_PVP_INVALID_CERTIFICATE_LENGTH': 0xC01E050E,
		'STATUS_GRAPHICS_OPM_SPANNING_MODE_ENABLED': 0xC01E050F,
		'STATUS_GRAPHICS_OPM_THEATER_MODE_ENABLED': 0xC01E0510,
		'STATUS_GRAPHICS_PVP_HFS_FAILED': 0xC01E0511,
		'STATUS_GRAPHICS_OPM_INVALID_SRM': 0xC01E0512,
		'STATUS_GRAPHICS_OPM_OUTPUT_DOES_NOT_SUPPORT_HDCP': 0xC01E0513,
		'STATUS_GRAPHICS_OPM_OUTPUT_DOES_NOT_SUPPORT_ACP': 0xC01E0514,
		'STATUS_GRAPHICS_OPM_OUTPUT_DOES_NOT_SUPPORT_CGMSA': 0xC01E0515,
		'STATUS_GRAPHICS_OPM_HDCP_SRM_NEVER_SET': 0xC01E0516,
		'STATUS_GRAPHICS_OPM_RESOLUTION_TOO_HIGH': 0xC01E0517,
		'STATUS_GRAPHICS_OPM_ALL_HDCP_HARDWARE_ALREADY_IN_USE': 0xC01E0518,
		'STATUS_GRAPHICS_OPM_PROTECTED_OUTPUT_NO_LONGER_EXISTS': 0xC01E051A,
		'STATUS_GRAPHICS_OPM_SESSION_TYPE_CHANGE_IN_PROGRESS': 0xC01E051B,
		'STATUS_GRAPHICS_OPM_PROTECTED_OUTPUT_DOES_NOT_HAVE_COPP_SEMANTICS': 0xC01E051C,
		'STATUS_GRAPHICS_OPM_INVALID_INFORMATION_REQUEST': 0xC01E051D,
		'STATUS_GRAPHICS_OPM_DRIVER_INTERNAL_ERROR': 0xC01E051E,
		'STATUS_GRAPHICS_OPM_PROTECTED_OUTPUT_DOES_NOT_HAVE_OPM_SEMANTICS': 0xC01E051F,
		'STATUS_GRAPHICS_OPM_SIGNALING_NOT_SUPPORTED': 0xC01E0520,
		'STATUS_GRAPHICS_OPM_INVALID_CONFIGURATION_REQUEST': 0xC01E0521,
		'STATUS_GRAPHICS_I2C_NOT_SUPPORTED': 0xC01E0580,
		'STATUS_GRAPHICS_I2C_DEVICE_DOES_NOT_EXIST': 0xC01E0581,
		'STATUS_GRAPHICS_I2C_ERROR_TRANSMITTING_DATA': 0xC01E0582,
		'STATUS_GRAPHICS_I2C_ERROR_RECEIVING_DATA': 0xC01E0583,
		'STATUS_GRAPHICS_DDCCI_VCP_NOT_SUPPORTED': 0xC01E0584,
		'STATUS_GRAPHICS_DDCCI_INVALID_DATA': 0xC01E0585,
		'STATUS_GRAPHICS_DDCCI_MONITOR_RETURNED_INVALID_TIMING_STATUS_BYTE': 0xC01E0586,
		'STATUS_GRAPHICS_DDCCI_INVALID_CAPABILITIES_STRING': 0xC01E0587,
		'STATUS_GRAPHICS_MCA_INTERNAL_ERROR': 0xC01E0588,
		'STATUS_GRAPHICS_DDCCI_INVALID_MESSAGE_COMMAND': 0xC01E0589,
		'STATUS_GRAPHICS_DDCCI_INVALID_MESSAGE_LENGTH': 0xC01E058A,
		'STATUS_GRAPHICS_DDCCI_INVALID_MESSAGE_CHECKSUM': 0xC01E058B,
		'STATUS_GRAPHICS_INVALID_PHYSICAL_MONITOR_HANDLE': 0xC01E058C,
		'STATUS_GRAPHICS_MONITOR_NO_LONGER_EXISTS': 0xC01E058D,
		'STATUS_GRAPHICS_ONLY_CONSOLE_SESSION_SUPPORTED': 0xC01E05E0,
		'STATUS_GRAPHICS_NO_DISPLAY_DEVICE_CORRESPONDS_TO_NAME': 0xC01E05E1,
		'STATUS_GRAPHICS_DISPLAY_DEVICE_NOT_ATTACHED_TO_DESKTOP': 0xC01E05E2,
		'STATUS_GRAPHICS_MIRRORING_DEVICES_NOT_SUPPORTED': 0xC01E05E3,
		'STATUS_GRAPHICS_INVALID_POINTER': 0xC01E05E4,
		'STATUS_GRAPHICS_NO_MONITORS_CORRESPOND_TO_DISPLAY_DEVICE': 0xC01E05E5,
		'STATUS_GRAPHICS_PARAMETER_ARRAY_TOO_SMALL': 0xC01E05E6,
		'STATUS_GRAPHICS_INTERNAL_ERROR': 0xC01E05E7,
		'STATUS_GRAPHICS_SESSION_TYPE_CHANGE_IN_PROGRESS': 0xC01E05E8,
		'STATUS_FVE_LOCKED_VOLUME': 0xC0210000,
		'STATUS_FVE_NOT_ENCRYPTED': 0xC0210001,
		'STATUS_FVE_BAD_INFORMATION': 0xC0210002,
		'STATUS_FVE_TOO_SMALL': 0xC0210003,
		'STATUS_FVE_FAILED_WRONG_FS': 0xC0210004,
		'STATUS_FVE_FAILED_BAD_FS': 0xC0210005,
		'STATUS_FVE_FS_NOT_EXTENDED': 0xC0210006,
		'STATUS_FVE_FS_MOUNTED': 0xC0210007,
		'STATUS_FVE_NO_LICENSE': 0xC0210008,
		'STATUS_FVE_ACTION_NOT_ALLOWED': 0xC0210009,
		'STATUS_FVE_BAD_DATA': 0xC021000A,
		'STATUS_FVE_VOLUME_NOT_BOUND': 0xC021000B,
		'STATUS_FVE_NOT_DATA_VOLUME': 0xC021000C,
		'STATUS_FVE_CONV_READ_ERROR': 0xC021000D,
		'STATUS_FVE_CONV_WRITE_ERROR': 0xC021000E,
		'STATUS_FVE_OVERLAPPED_UPDATE': 0xC021000F,
		'STATUS_FVE_FAILED_SECTOR_SIZE': 0xC0210010,
		'STATUS_FVE_FAILED_AUTHENTICATION': 0xC0210011,
		'STATUS_FVE_NOT_OS_VOLUME': 0xC0210012,
		'STATUS_FVE_KEYFILE_NOT_FOUND': 0xC0210013,
		'STATUS_FVE_KEYFILE_INVALID': 0xC0210014,
		'STATUS_FVE_KEYFILE_NO_VMK': 0xC0210015,
		'STATUS_FVE_TPM_DISABLED': 0xC0210016,
		'STATUS_FVE_TPM_SRK_AUTH_NOT_ZERO': 0xC0210017,
		'STATUS_FVE_TPM_INVALID_PCR': 0xC0210018,
		'STATUS_FVE_TPM_NO_VMK': 0xC0210019,
		'STATUS_FVE_PIN_INVALID': 0xC021001A,
		'STATUS_FVE_AUTH_INVALID_APPLICATION': 0xC021001B,
		'STATUS_FVE_AUTH_INVALID_CONFIG': 0xC021001C,
		'STATUS_FVE_DEBUGGER_ENABLED': 0xC021001D,
		'STATUS_FVE_DRY_RUN_FAILED': 0xC021001E,
		'STATUS_FVE_BAD_METADATA_POINTER': 0xC021001F,
		'STATUS_FVE_OLD_METADATA_COPY': 0xC0210020,
		'STATUS_FVE_REBOOT_REQUIRED': 0xC0210021,
		'STATUS_FVE_RAW_ACCESS': 0xC0210022,
		'STATUS_FVE_RAW_BLOCKED': 0xC0210023,
		'STATUS_FVE_NO_FEATURE_LICENSE': 0xC0210026,
		'STATUS_FVE_POLICY_USER_DISABLE_RDV_NOT_ALLOWED': 0xC0210027,
		'STATUS_FVE_CONV_RECOVERY_FAILED': 0xC0210028,
		'STATUS_FVE_VIRTUALIZED_SPACE_TOO_BIG': 0xC0210029,
		'STATUS_FVE_VOLUME_TOO_SMALL': 0xC0210030,
		'STATUS_FWP_CALLOUT_NOT_FOUND': 0xC0220001,
		'STATUS_FWP_CONDITION_NOT_FOUND': 0xC0220002,
		'STATUS_FWP_FILTER_NOT_FOUND': 0xC0220003,
		'STATUS_FWP_LAYER_NOT_FOUND': 0xC0220004,
		'STATUS_FWP_PROVIDER_NOT_FOUND': 0xC0220005,
		'STATUS_FWP_PROVIDER_CONTEXT_NOT_FOUND': 0xC0220006,
		'STATUS_FWP_SUBLAYER_NOT_FOUND': 0xC0220007,
		'STATUS_FWP_NOT_FOUND': 0xC0220008,
		'STATUS_FWP_ALREADY_EXISTS': 0xC0220009,
		'STATUS_FWP_IN_USE': 0xC022000A,
		'STATUS_FWP_DYNAMIC_SESSION_IN_PROGRESS': 0xC022000B,
		'STATUS_FWP_WRONG_SESSION': 0xC022000C,
		'STATUS_FWP_NO_TXN_IN_PROGRESS': 0xC022000D,
		'STATUS_FWP_TXN_IN_PROGRESS': 0xC022000E,
		'STATUS_FWP_TXN_ABORTED': 0xC022000F,
		'STATUS_FWP_SESSION_ABORTED': 0xC0220010,
		'STATUS_FWP_INCOMPATIBLE_TXN': 0xC0220011,
		'STATUS_FWP_TIMEOUT': 0xC0220012,
		'STATUS_FWP_NET_EVENTS_DISABLED': 0xC0220013,
		'STATUS_FWP_INCOMPATIBLE_LAYER': 0xC0220014,
		'STATUS_FWP_KM_CLIENTS_ONLY': 0xC0220015,
		'STATUS_FWP_LIFETIME_MISMATCH': 0xC0220016,
		'STATUS_FWP_BUILTIN_OBJECT': 0xC0220017,
		'STATUS_FWP_TOO_MANY_BOOTTIME_FILTERS': 0xC0220018,
		'STATUS_FWP_TOO_MANY_CALLOUTS': 0xC0220018,
		'STATUS_FWP_NOTIFICATION_DROPPED': 0xC0220019,
		'STATUS_FWP_TRAFFIC_MISMATCH': 0xC022001A,
		'STATUS_FWP_INCOMPATIBLE_SA_STATE': 0xC022001B,
		'STATUS_FWP_NULL_POINTER': 0xC022001C,
		'STATUS_FWP_INVALID_ENUMERATOR': 0xC022001D,
		'STATUS_FWP_INVALID_FLAGS': 0xC022001E,
		'STATUS_FWP_INVALID_NET_MASK': 0xC022001F,
		'STATUS_FWP_INVALID_RANGE': 0xC0220020,
		'STATUS_FWP_INVALID_INTERVAL': 0xC0220021,
		'STATUS_FWP_ZERO_LENGTH_ARRAY': 0xC0220022,
		'STATUS_FWP_NULL_DISPLAY_NAME': 0xC0220023,
		'STATUS_FWP_INVALID_ACTION_TYPE': 0xC0220024,
		'STATUS_FWP_INVALID_WEIGHT': 0xC0220025,
		'STATUS_FWP_MATCH_TYPE_MISMATCH': 0xC0220026,
		'STATUS_FWP_TYPE_MISMATCH': 0xC0220027,
		'STATUS_FWP_OUT_OF_BOUNDS': 0xC0220028,
		'STATUS_FWP_RESERVED': 0xC0220029,
		'STATUS_FWP_DUPLICATE_CONDITION': 0xC022002A,
		'STATUS_FWP_DUPLICATE_KEYMOD': 0xC022002B,
		'STATUS_FWP_ACTION_INCOMPATIBLE_WITH_LAYER': 0xC022002C,
		'STATUS_FWP_ACTION_INCOMPATIBLE_WITH_SUBLAYER': 0xC022002D,
		'STATUS_FWP_CONTEXT_INCOMPATIBLE_WITH_LAYER': 0xC022002E,
		'STATUS_FWP_CONTEXT_INCOMPATIBLE_WITH_CALLOUT': 0xC022002F,
		'STATUS_FWP_INCOMPATIBLE_AUTH_METHOD': 0xC0220030,
		'STATUS_FWP_INCOMPATIBLE_DH_GROUP': 0xC0220031,
		'STATUS_FWP_EM_NOT_SUPPORTED': 0xC0220032,
		'STATUS_FWP_NEVER_MATCH': 0xC0220033,
		'STATUS_FWP_PROVIDER_CONTEXT_MISMATCH': 0xC0220034,
		'STATUS_FWP_INVALID_PARAMETER': 0xC0220035,
		'STATUS_FWP_TOO_MANY_SUBLAYERS': 0xC0220036,
		'STATUS_FWP_CALLOUT_NOTIFICATION_FAILED': 0xC0220037,
		'STATUS_FWP_INCOMPATIBLE_AUTH_CONFIG': 0xC0220038,
		'STATUS_FWP_INCOMPATIBLE_CIPHER_CONFIG': 0xC0220039,
		'STATUS_FWP_DUPLICATE_AUTH_METHOD': 0xC022003C,
		'STATUS_FWP_TCPIP_NOT_READY': 0xC0220100,
		'STATUS_FWP_INJECT_HANDLE_CLOSING': 0xC0220101,
		'STATUS_FWP_INJECT_HANDLE_STALE': 0xC0220102,
		'STATUS_FWP_CANNOT_PEND': 0xC0220103,
		'STATUS_NDIS_CLOSING': 0xC0230002,
		'STATUS_NDIS_BAD_VERSION': 0xC0230004,
		'STATUS_NDIS_BAD_CHARACTERISTICS': 0xC0230005,
		'STATUS_NDIS_ADAPTER_NOT_FOUND': 0xC0230006,
		'STATUS_NDIS_OPEN_FAILED': 0xC0230007,
		'STATUS_NDIS_DEVICE_FAILED': 0xC0230008,
		'STATUS_NDIS_MULTICAST_FULL': 0xC0230009,
		'STATUS_NDIS_MULTICAST_EXISTS': 0xC023000A,
		'STATUS_NDIS_MULTICAST_NOT_FOUND': 0xC023000B,
		'STATUS_NDIS_REQUEST_ABORTED': 0xC023000C,
		'STATUS_NDIS_RESET_IN_PROGRESS': 0xC023000D,
		'STATUS_NDIS_INVALID_PACKET': 0xC023000F,
		'STATUS_NDIS_INVALID_DEVICE_REQUEST': 0xC0230010,
		'STATUS_NDIS_ADAPTER_NOT_READY': 0xC0230011,
		'STATUS_NDIS_INVALID_LENGTH': 0xC0230014,
		'STATUS_NDIS_INVALID_DATA': 0xC0230015,
		'STATUS_NDIS_BUFFER_TOO_SHORT': 0xC0230016,
		'STATUS_NDIS_INVALID_OID': 0xC0230017,
		'STATUS_NDIS_ADAPTER_REMOVED': 0xC0230018,
		'STATUS_NDIS_UNSUPPORTED_MEDIA': 0xC0230019,
		'STATUS_NDIS_GROUP_ADDRESS_IN_USE': 0xC023001A,
		'STATUS_NDIS_FILE_NOT_FOUND': 0xC023001B,
		'STATUS_NDIS_ERROR_READING_FILE': 0xC023001C,
		'STATUS_NDIS_ALREADY_MAPPED': 0xC023001D,
		'STATUS_NDIS_RESOURCE_CONFLICT': 0xC023001E,
		'STATUS_NDIS_MEDIA_DISCONNECTED': 0xC023001F,
		'STATUS_NDIS_INVALID_ADDRESS': 0xC0230022,
		'STATUS_NDIS_PAUSED': 0xC023002A,
		'STATUS_NDIS_INTERFACE_NOT_FOUND': 0xC023002B,
		'STATUS_NDIS_UNSUPPORTED_REVISION': 0xC023002C,
		'STATUS_NDIS_INVALID_PORT': 0xC023002D,
		'STATUS_NDIS_INVALID_PORT_STATE': 0xC023002E,
		'STATUS_NDIS_LOW_POWER_STATE': 0xC023002F,
		'STATUS_NDIS_NOT_SUPPORTED': 0xC02300BB,
		'STATUS_NDIS_OFFLOAD_POLICY': 0xC023100F,
		'STATUS_NDIS_OFFLOAD_CONNECTION_REJECTED': 0xC0231012,
		'STATUS_NDIS_OFFLOAD_PATH_REJECTED': 0xC0231013,
		'STATUS_NDIS_DOT11_AUTO_CONFIG_ENABLED': 0xC0232000,
		'STATUS_NDIS_DOT11_MEDIA_IN_USE': 0xC0232001,
		'STATUS_NDIS_DOT11_POWER_STATE_INVALID': 0xC0232002,
		'STATUS_NDIS_PM_WOL_PATTERN_LIST_FULL': 0xC0232003,
		'STATUS_NDIS_PM_PROTOCOL_OFFLOAD_LIST_FULL': 0xC0232004,
		'STATUS_IPSEC_BAD_SPI': 0xC0360001,
		'STATUS_IPSEC_SA_LIFETIME_EXPIRED': 0xC0360002,
		'STATUS_IPSEC_WRONG_SA': 0xC0360003,
		'STATUS_IPSEC_REPLAY_CHECK_FAILED': 0xC0360004,
		'STATUS_IPSEC_INVALID_PACKET': 0xC0360005,
		'STATUS_IPSEC_INTEGRITY_CHECK_FAILED': 0xC0360006,
		'STATUS_IPSEC_CLEAR_TEXT_DROP': 0xC0360007,
		'STATUS_IPSEC_AUTH_FIREWALL_DROP': 0xC0360008,
		'STATUS_IPSEC_THROTTLE_DROP': 0xC0360009,
		'STATUS_IPSEC_DOSP_BLOCK': 0xC0368000,
		'STATUS_IPSEC_DOSP_RECEIVED_MULTICAST': 0xC0368001,
		'STATUS_IPSEC_DOSP_INVALID_PACKET': 0xC0368002,
		'STATUS_IPSEC_DOSP_STATE_LOOKUP_FAILED': 0xC0368003,
		'STATUS_IPSEC_DOSP_MAX_ENTRIES': 0xC0368004,
		'STATUS_IPSEC_DOSP_KEYMOD_NOT_ALLOWED': 0xC0368005,
		'STATUS_IPSEC_DOSP_MAX_PER_IP_RATELIMIT_QUEUES': 0xC0368006,
		'STATUS_VOLMGR_MIRROR_NOT_SUPPORTED': 0xC038005B,
		'STATUS_VOLMGR_RAID5_NOT_SUPPORTED': 0xC038005C,
		'STATUS_VIRTDISK_PROVIDER_NOT_FOUND': 0xC03A0014,
		'STATUS_VIRTDISK_NOT_VIRTUAL_DISK': 0xC03A0015,
		'STATUS_VHD_PARENT_VHD_ACCESS_DENIED': 0xC03A0016,
		'STATUS_VHD_CHILD_PARENT_SIZE_MISMATCH': 0xC03A0017,
		'STATUS_VHD_DIFFERENCING_CHAIN_CYCLE_DETECTED': 0xC03A0018,
		'STATUS_VHD_DIFFERENCING_CHAIN_ERROR_IN_PARENT': 0xC03A0019
	}
};