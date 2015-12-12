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
	this.FXPT2DOT30 = ctypes.long; // http://stackoverflow.com/a/20864995/1828637 // https://github.com/wine-mirror/wine/blob/a7247df6ca54fd1209eff9f9199447643ebdaec5/include/wingdi.h#L150
	this.INT = ctypes.int;
	this.INT_PTR = is64bit ? ctypes.int64_t : ctypes.int;
	this.LONG = ctypes.long;
	this.LONG_PTR = is64bit ? ctypes.int64_t : ctypes.long; // i left it at what i copied pasted it as but i thought it would be `ctypes.intptr_t`
	this.LPCVOID = ctypes.voidptr_t;
	this.LPVOID = ctypes.voidptr_t;
	this.NTSTATUS = ctypes.long; // https://msdn.microsoft.com/en-us/library/cc230357.aspx // typedef long NTSTATUS;
	this.PVOID = ctypes.voidptr_t;
	this.RM_APP_TYPE = ctypes.unsigned_int; // i dont know im just guessing, i cant find a typedef that makes sense to me: https://msdn.microsoft.com/en-us/library/windows/desktop/aa373670%28v=vs.85%29.aspx
	this.SHORT = ctypes.short;
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
	this.PULONG_PTR = this.ULONG.ptr;
	this.PUINT = this.UINT.ptr;
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
	this.HMONITOR = this.HANDLE;
	this.HRAWINPUT = this.HANDLE;
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
	this.DISPLAY_DEVICE = ctypes.StructType('_DISPLAY_DEVICE', [
		{ cb:			this.DWORD },
		{ DeviceName:	this.TCHAR.array(32) },
		{ DeviceString:	this.TCHAR.array(128) },
		{ StateFlags:	this.DWORD },
		{ DeviceID:		this.TCHAR.array(128) },
		{ DeviceKey:	this.TCHAR.array(128) }
	]);
	this.POINT = ctypes.StructType('tagPOINT', [
		{ x: this.LONG },
		{ y: this.LONG }
	]);
	this.POINTL = ctypes.StructType('_POINTL', [ // https://github.com/wine-mirror/wine/blob/7eddb864b36d159fa6e6807f65e117ca0a81485c/include/windef.h#L368
		{ x: this.LONG },
		{ y: this.LONG }
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
    this.PRECT = this.RECT.ptr;
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
	
	// FURTHER ADVANCED STRUCTS
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
	
	// FURTHER ADV STRUCTS
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
		XBUTTON2: 0x0002
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
		}
	};
}

var ostypes = new winInit();