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
	this.bool = ctypes.bool;
	this.char = ctypes.char;
	this.int = ctypes.int;
	this.int16_t = ctypes.int16_t;
	this.int32_t = ctypes.int32_t;
	this.int64_t = ctypes.int64_t;
	this.intptr_t = ctypes.intptr_t;
	this.long = ctypes.long;
	this.short = ctypes.short;
	this.size_t = ctypes.size_t;
	this.ssize_t = ctypes.ssize_t;
	this.uint16_t = ctypes.uint16_t;
	this.uint32_t = ctypes.uint32_t;
	this.uintptr_t = ctypes.uintptr_t;
	this.uint64_t = ctypes.uint64_t;
	this.unsigned_char = ctypes.unsigned_char;
	this.unsigned_long = ctypes.unsigned_long;
	this.unsigned_long_long = ctypes.unsigned_long_long;
	this.void = ctypes.void_t;
	this.float = ctypes.float;
	
	// LIBC SIMPLE TYPES
	this.pid_t = ctypes.int32_t;
	this.off_t = ctypes.off_t;
	
	// LIBC GUESS TYPES
	this.FILE = ctypes.void_t; // not really a guess, i just dont have a need to fill it
	
	// ADV C TYPES
	this.time_t = this.long; // https://github.com/j4cbo/chiral/blob/3c66a8bb64e541c0f63b04b78ec2d0ffdf5b473c/chiral/os/kqueue.py#L34 AND also based on this github search https://github.com/search?utf8=%E2%9C%93&q=time_t+ctypes&type=Code&ref=searchresults AND based on this answer here: http://stackoverflow.com/a/471287/1828637
	
	// SIMPLE TYPES // based on ctypes.BLAH // as per WinNT.h etc
	this.Boolean = ctypes.unsigned_char;
	this.CFIndex = ctypes.long;
	this.CFOptionFlags = ctypes.unsigned_long;
	this.CFTimeInterval = ctypes.double;
	this.CFTypeRef = ctypes.voidptr_t;
	this.CGDirectDisplayID = ctypes.uint32_t;
	this.CGError = ctypes.int32_t;
	this.CGEventMask = ctypes.uint64_t;
	this.CGEventTapOptions = ctypes.uint32_t;
	this.CGEventTapPlacement = ctypes.uint32_t;
	this.CGEventType = ctypes.uint32_t;
	this.CGFloat = is64bit ? ctypes.double : ctypes.float; // ctypes.float is 32bit deosntw ork as of May 10th 2015 see this bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1163406 this would cause crash on CGDisplayGetBounds http://stackoverflow.com/questions/28216681/how-can-i-get-screenshot-from-all-displays-on-mac#comment48414568_28247749
	this.CGEventField = ctypes.uint32_t;
	this.CGSConnection = ctypes.int;
	this.CGSTransitionOption = ctypes.int; // type is enum so i guess int - https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L162
	this.CGSTransitionType = ctypes.int; // type is enum so i guess int - https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L148
	this.CGSWindow = ctypes.int;
	this.CGSWindowOrderingMode = ctypes.int; // type is enum so i guess int - https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L66
	this.CGSWorkspace = ctypes.int;
	this.CGSValue = ctypes.int;
	this.CGWindowID = ctypes.uint32_t;
	this.CGWindowLevel = ctypes.int32_t;
	this.CGWindowLevelKey = ctypes.int32_t;
	this.CGWindowListOption = ctypes.uint32_t;
	this.ConstStr255Param = ctypes.unsigned_char.ptr;
	this.ConstStringPtr = ctypes.unsigned_char.ptr;
	this.SInt16 = ctypes.short;
	this.SInt32 = ctypes.long;
	this.UInt16 = ctypes.unsigned_short;
	this.UInt32 = ctypes.unsigned_long;
	this.UInt64 = ctypes.unsigned_long_long;
	this.UniChar = ctypes.jschar;
	this.VOID = ctypes.void_t;
	
	// ADVANCED TYPES // as per how it was defined in WinNT.h // defined by "simple types"
	this.AlertType = this.SInt16;
	this.DialogItemIndex = this.SInt16;
	this.EventKind = this.UInt16;
	this.FSEventStreamCreateFlags = this.UInt32;
	this.FSEventStreamEventFlags = this.UInt32;
	this.FSEventStreamEventId = this.UInt64;
	this.EventModifiers = this.UInt16;
	this.OSErr = this.SInt16;
	
	// SUPER ADVANCED TYPES // defined by "advanced types"
	
	// SUPER DUPER ADVANCED TYPES // defined by "super advanced types"

	// INACCRURATE TYPES - i know these are something else but setting them to voidptr_t or something just works and all the extra work isnt needed
	
	// STRUCTURES
	// consts for structures
	var struct_const = {

	};

	// LIBC SIMPLE STRUCTS
	
	var flockHollowStruct = new cutils.HollowStructure('flock', OS.Constants.libc.OSFILE_SIZEOF_FLOCK);
	flockHollowStruct.add_field_at(OS.Constants.libc.OSFILE_OFFSETOF_FLOCK_L_WHENCE, 'l_whence', this.short);
	flockHollowStruct.add_field_at(OS.Constants.libc.OSFILE_OFFSETOF_FLOCK_L_TYPE, 'l_type', this.short);
	flockHollowStruct.add_field_at(OS.Constants.libc.OSFILE_OFFSETOF_FLOCK_L_START, 'l_start', this.off_t);
	flockHollowStruct.add_field_at(OS.Constants.libc.OSFILE_OFFSETOF_FLOCK_L_PID, 'l_pid', this.pid_t);
	flockHollowStruct.add_field_at(OS.Constants.libc.OSFILE_OFFSETOF_FLOCK_L_LEN, 'l_len', this.off_t);
	this.flock = flockHollowStruct.getType().implementation;
	
	// SIMPLE STRUCTS // based on any of the types above
	this.__CFAllocator = ctypes.StructType('__CFAllocator');
	this.__CFArray = ctypes.StructType('__CFArray');
	this.__CFDictionary = ctypes.StructType('__CFDictionary');
	this.__CFMachPort = ctypes.StructType("__CFMachPort");
	this.__CFRunLoop = ctypes.StructType('__CFRunLoop');
    this.__CFRunLoopSource = ctypes.StructType("__CFRunLoopSource");
	this.__CFString = ctypes.StructType('__CFString');
	this.__CFURL = ctypes.StructType('__CFURL');
	this.__CGEvent = ctypes.StructType("__CGEvent");
    this.__CGEventTapProxy = ctypes.StructType("__CGEventTapProxy");
	this.__FSEventStream = ctypes.StructType('__FSEventStream');
	
	this.Block_descriptor_1 = ctypes.StructType('Block_descriptor_1', [
		{ reserved: this.unsigned_long_long },
		{ size: this.unsigned_long_long }
	]);
	
	this.Block_literal_1 = ctypes.StructType('Block_literal_1', [
		{ isa: this.void.ptr },
		{ flags: this.int32_t },
		{ reserved: this.int32_t },
		{ invoke: this.void.ptr },
		{ descriptor: this.Block_descriptor_1.ptr }
	]);
	
	this.CFDictionaryRef = this.__CFDictionary.ptr;
	this.CGImage = ctypes.StructType('CGImage');
	this.CGContext = ctypes.StructType('CGContext');
	this.CGPoint = ctypes.StructType('CGPoint', [
		{ x: this.CGFloat },
		{ y: this.CGFloat }
	]);
	this.CGSize = ctypes.StructType('CGSize', [
		{ width: this.CGFloat },
		{ height: this.CGFloat }
	]);
	this.OpaqueDialogPtr = ctypes.StructType('OpaqueDialogPtr');
	this.Point = ctypes.StructType('Point', [
		{ v: this.short },
		{ h: this.short }
	]);
	this.ProcessSerialNumber = new ctypes.StructType('ProcessSerialNumber', [
		{ highLongOfPSN: this.UInt32 },
		{ lowLongOfPSN: this.UInt32 }
	]);
	this.timespec = ctypes.StructType('timespec', [ // http://www.opensource.apple.com/source/text_cmds/text_cmds-69/sort/timespec.h
		{ tv_sec: this.time_t },
		{ tv_nsec: this.long }
	]);
	
	// ADVANCED STRUCTS // based on "simple structs" to be defined first
	this.CFAllocatorRef = this.__CFAllocator.ptr;
	this.CFArrayRef = this.__CFArray.ptr;
	this.CFMachPortRef = this.__CFMachPort.ptr;
	this.CFRunLoopRef = this.__CFRunLoop.ptr;
	this.CFRunLoopSourceRef = this.__CFRunLoopSource.ptr;
	this.CFStringRef = this.__CFString.ptr;
	this.CFURLRef = this.__CFURL.ptr;
	this.CGImageRef = this.CGImage.ptr;
	this.CGContextRef = this.CGContext.ptr;
	this.CGEventRef = this.__CGEvent.ptr;
	this.CGEventTapProxy = this.__CGEventTapProxy.ptr;
	this.CGRect = ctypes.StructType('CGRect', [
		{ origin: this.CGPoint },
		{ size: this.CGSize }
	]);
	this.ConstFSEventStreamRef = this.__FSEventStream.ptr;
	this.DialogPtr = this.OpaqueDialogPtr.ptr;
	this.EventRecord = ctypes.StructType('EventRecord', [
		{ what: this.EventKind },
		{ message: this.unsigned_long },
		{ when: this.UInt32 },
		{ where: this.Point },
		{ modifiers: this.EventModifiers }
	]);
	this.FSEventStreamRef = this.__FSEventStream.ptr;
	
	// FURTHER ADVANCED STRUCTS
	this.DialogRef = this.DialogPtr;
	
	// FURTHER ADV STRUCTS

	// FUNCTION TYPES
	this.CFAllocatorCopyDescriptionCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.CFStringRef, [this.void.ptr]).ptr;
	this.CFAllocatorRetainCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.void.ptr, [this.void.ptr]).ptr;
	this.CFAllocatorReleaseCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.void, [this.void.ptr]).ptr;
	this.CFArrayCopyDescriptionCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.CFStringRef, [this.void.ptr]).ptr;
	this.CFArrayEqualCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.Boolean, [this.void.ptr, this.void.ptr]).ptr;
	this.CFArrayReleaseCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.void, [this.CFAllocatorRef, this.void.ptr]).ptr;
	this.CFArrayRetainCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.void.ptr, [this.CFAllocatorRef, this.void.ptr]).ptr;
	this.FSEventStreamCallback = ctypes.FunctionType(this.CALLBACK_ABI, this.void, [this.ConstFSEventStreamRef, this.void.ptr, this.size_t, this.void.ptr, this.FSEventStreamEventFlags.ptr, this.FSEventStreamEventId.ptr]).ptr;
	this.ModalFilterProcPtr = ctypes.FunctionType(this.CALLBACK_ABI, this.Boolean, [this.DialogRef, this.EventRecord.ptr, this.DialogItemIndex.ptr]).ptr;
	this.CGEventTapCallBack = ctypes.FunctionType(this.CALLBACK_ABI, this.CGEventRef, [this.CGEventTapProxy, this.CGEventType, this.CGEventRef, this.VOID.ptr]).ptr;
	
	// ADVANCED FUNCTION TYPES
	this.ModalFilterUPP = this.ModalFilterProcPtr;
	
	// STRUCTS USING FUNC TYPES
	this.AlertStdAlertParamRec = ctypes.StructType('AlertStdAlertParamRec', [
		{ movable: this.Boolean },
		{ helpButton: this.Boolean },
		{ filterProc: this.ModalFilterUPP },
		{ defaultText: this.ConstStringPtr },
		{ cancelText: this.ConstStringPtr },
		{ otherText: this.ConstStringPtr },
		{ defaultButton: this.SInt16 },
		{ cancelButton: this.SInt16 },
		{ position: this.UInt16 }
	]);
	this.CFArrayCallBacks = ctypes.StructType('CFArrayCallBacks', [
		{ version: this.CFIndex },
		{ retain: this.CFArrayRetainCallBack },
		{ release: this.CFArrayReleaseCallBack },
		{ copyDescription: this.CFArrayCopyDescriptionCallBack },
		{ equal: this.CFArrayEqualCallBack }
	]);
	this.FSEventStreamContext = ctypes.StructType('FSEventStreamContext', [
		{version: this.CFIndex},
		{info: this.void.ptr},
		{retain: this.CFAllocatorRetainCallBack},
		{release: this.CFAllocatorReleaseCallBack},
		{copyDescription: this.CFAllocatorCopyDescriptionCallBack}
	]);
	
	
	///// OBJC
	
	// SIMPLE OBJC TYPES
	this.BOOL = ctypes.signed_char;
	this.NSInteger = is64bit ? ctypes.long: ctypes.int;
	this.NSUInteger = is64bit ? ctypes.unsigned_long : ctypes.unsigned_int;
	
	// ADV OBJC TYPES
	this.NSBitmapFormat = this.NSUInteger;
	this.NSEventType = this.NSUInteger;
	this.NSEventMask = this.NSUInteger;
	this.NSURLBookmarkCreationOptions = this.NSUInteger;
	
	// GUESS TYPES OBJC - they work though
	this.id = ctypes.voidptr_t;
	this.IMP = ctypes.voidptr_t;
	this.SEL = ctypes.voidptr_t;
	this.Class = ctypes.voidptr_t;
	this.NSEvent = ctypes.voidptr_t;
	this.NSWindow = ctypes.voidptr_t;
	
	// NULL CONSTs that i use for vaiadic args
	
	
	// SIMPLE OBJC STRUCTS
	
	// ADV OBJC STRUCTS
	
	// FUNC OBJC TYPES
	this.IMP_for_EventMonitorCallback = ctypes.FunctionType(this.CALLBACK_ABI, this.NSEvent.ptr, [this.id, this.NSEvent.ptr]);
	
	// dispatch stuff
	this.dispatch_block_t = ctypes.FunctionType(this.CALLBACK_ABI, this.void, []).ptr;
	this.dispatch_queue_t = ctypes.voidptr_t; // guess
}

var macInit = function() {
	var self = this;

	this.IS64BIT = is64bit;

	this.TYPE = new macTypes();

	// CONSTANTS
	var _const = {}; // lazy load consts
	this.CONST = {
		get CGRectNull () { if (!('CGRectNull' in _const)) { _const['CGRectNull'] = lib('CoreGraphics').declare('CGRectNull', self.TYPE.CGRect); } return _const['CGRectNull']; },
		get kCFTypeArrayCallBacks () { if (!('kCFTypeArrayCallBacks' in _const)) { _const['kCFTypeArrayCallBacks'] = lib('CoreFoundation').declare('kCFTypeArrayCallBacks', self.TYPE.CFArrayCallBacks); } return _const['kCFTypeArrayCallBacks']; },
		get _NSConcreteGlobalBlock () { if (!('_NSConcreteGlobalBlock' in _const)) { _const['_NSConcreteGlobalBlock'] = lib('objc').declare('_NSConcreteGlobalBlock', self.TYPE.void.ptr); } return _const['_NSConcreteGlobalBlock']; },
		get kCFAllocatorDefault () { if (!('kCFAllocatorDefault' in _const)) { _const['kCFAllocatorDefault'] = lib('CoreFoundation').declare('kCFAllocatorDefault', self.TYPE.CFAllocatorRef); } return _const['kCFAllocatorDefault']; },
		get kCFRunLoopDefaultMode () { if (!('kCFRunLoopDefaultMode' in _const)) { _const['kCFRunLoopDefaultMode'] = lib('CoreFoundation').declare('kCFRunLoopDefaultMode', self.TYPE.CFStringRef); } return _const['kCFRunLoopDefaultMode']; },
		get kCFRunLoopCommonModes () { if (!('kCFRunLoopCommonModes' in _const)) { _const['kCFRunLoopCommonModes'] = lib('CoreFoundation').declare('kCFRunLoopCommonModes', self.TYPE.CFStringRef); } return _const['kCFRunLoopCommonModes']; },
		get CGSDefaultConnection () { if (!('CGSDefaultConnection' in _const)) { _const['CGSDefaultConnection'] = self.API('_CGSDefaultConnection')(); } return _const['CGSDefaultConnection']; }, // https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L39
		
		kCGErrorSuccess: 0,
		kCGNullDirectDisplay: 0,
		kCGBaseWindowLevelKey: 0,
		kCGMinimumWindowLevelKey: 1,
		kCGDesktopWindowLevelKey: 2,
		kCGBackstopMenuLevelKey: 3,
		kCGNormalWindowLevelKey: 4,
		kCGFloatingWindowLevelKey: 5,
		kCGTornOffMenuWindowLevelKey: 6,
		kCGDockWindowLevelKey: 7,
		kCGMainMenuWindowLevelKey: 8,
		kCGStatusWindowLevelKey: 9,
		kCGModalPanelWindowLevelKey: 10,
		kCGPopUpMenuWindowLevelKey: 11,
		kCGDraggingWindowLevelKey: 12,
		kCGScreenSaverWindowLevelKey: 13,
		kCGMaximumWindowLevelKey: 14,
		kCGOverlayWindowLevelKey: 15,
		kCGHelpWindowLevelKey: 16,
		kCGUtilityWindowLevelKey: 17,
		kCGDesktopIconWindowLevelKey: 18,
		kCGCursorWindowLevelKey: 19,
		kCGAssistiveTechHighWindowLevelKey: 20,
		kCGNumberOfWindowLevelKeys: 21,
		kCGNullWindowID: 0,
		kCGWindowListOptionAll: 0,
		kCGWindowListOptionOnScreenOnly: 1,
		kCGWindowListOptionOnScreenAboveWindow: 2,
		kCGWindowListOptionOnScreenBelowWindow: 4,
		kCGWindowListOptionIncludingWindow: 8,
		kCGWindowListExcludeDesktopElements: 16,
		
		NSLeftMouseDown: 1,				// TYPES.NSEventType
		NSLeftMouseUp: 2,				// TYPES.NSEventType
		NSRightMouseDown: 3,			// TYPES.NSEventType
		NSRightMouseUp: 4,				// TYPES.NSEventType
		NSMouseMoved: 5,				// TYPES.NSEventType
		NSLeftMouseDragged: 6,			// TYPES.NSEventType
		NSRightMouseDragged: 7,			// TYPES.NSEventType
		NSMouseEntered: 8,				// TYPES.NSEventType
		NSMouseExited: 9,				// TYPES.NSEventType
		NSKeyDown: 10,					// TYPES.NSEventType
		NSKeyUp: 11,					// TYPES.NSEventType
		NSFlagsChanged: 12,				// TYPES.NSEventType
		NSAppKitDefined: 13,			// TYPES.NSEventType
		NSSystemDefined: 14,			// TYPES.NSEventType
		NSApplicationDefined: 15,		// TYPES.NSEventType
		NSPeriodic: 16,					// TYPES.NSEventType
		NSCursorUpdate: 17,				// TYPES.NSEventType
		NSScrollWheel: 22,				// TYPES.NSEventType
		NSTabletPoint: 23,				// TYPES.NSEventType
		NSTabletProximity: 24,			// TYPES.NSEventType
		NSOtherMouseDown: 25,			// TYPES.NSEventType
		NSOtherMouseUp: 26,				// TYPES.NSEventType
		NSOtherMouseDragged: 27,		// TYPES.NSEventType
		NSEventTypeGesture: 29,			// TYPES.NSEventType
		NSEventTypeMagnify: 30,			// TYPES.NSEventType
		NSEventTypeSwipe: 31,			// TYPES.NSEventType
		NSEventTypeRotate: 18,			// TYPES.NSEventType
		NSEventTypeBeginGesture: 19,	// TYPES.NSEventType
		NSEventTypeEndGesture: 20,		// TYPES.NSEventType
		NSEventTypeSmartMagnify: 32,	// TYPES.NSEventType
		NSEventTypeQuickLook: 33,		// TYPES.NSEventType
		NSEventTypePressure: 34,		// TYPES.NSEventType
		NSUIntegerMax: this.TYPE.NSUInteger(is64bit ? '0xffffffff' : '0xffff'),		// TYPES.NSUInteger

		BLOCK_HAS_COPY_DISPOSE: 1 << 25,
		BLOCK_HAS_CTOR: 1 << 26,
		BLOCK_IS_GLOBAL: 1 << 28,
		BLOCK_HAS_STRET: 1 << 29,
		BLOCK_HAS_SIGNATURE: 1 << 30,
		
		kCGHeadInsertEventTap: 0,
		kCGEventTapOptionDefault: 0,
		
		kCGEventNull: 0,
		kCGEventLeftMouseDown: 1,
		kCGEventLeftMouseUp: 2,
		kCGEventRightMouseDown: 3,
		kCGEventRightMouseUp: 4,
		kCGEventMouseMoved: 5,
		kCGEventLeftMouseDragged: 6,
		kCGEventRightMouseDragged: 7,
		kCGEventKeyDown: 10,
		kCGEventKeyUp: 11,
		kCGEventFlagsChanged: 12,
		kCGEventScrollWheel: 22,
		kCGEventTabletPointer: 23,
		kCGEventTabletProximity: 24,
		kCGEventOtherMouseDown: 25,
		kCGEventOtherMouseUp: 26,
		kCGEventOtherMouseDragged: 27,
		kCGEventTapDisabledByTimeout: 0xFFFFFFFE, // this.TYPE.CGEventType('0xFFFFFFFE'),
		kCGEventTapDisabledByUserInput: 0xFFFFFFFF, // this.TYPE.CGEventType('0xFFFFFFFF'),
		kCGEventMaskForAllEvents: ctypes.UInt64('0xffffffffffffffff'), // #define kCGEventMaskForAllEvents	(~(CGEventMask)0) // https://github.com/sschiesser/ASK_server/blob/a51e2fbdac894c37d97142fc72faa35f89057744/MacOSX10.6/System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/CoreGraphics.framework/Versions/A/Headers/CGEventTypes.h#L380
		
		kCGMouseEventNumber: 0,
		kCGMouseEventClickState: 1,
		kCGMouseEventPressure: 2,
		kCGMouseEventButtonNumber: 3,
		kCGMouseEventDeltaX: 4,
		kCGMouseEventDeltaY: 5,
		kCGMouseEventInstantMouser: 6,
		kCGMouseEventSubtype: 7,
		
		kCGScrollWheelEventDeltaAxis1: 11,
		kCGScrollWheelEventDeltaAxis2: 12,
		kCGScrollWheelEventDeltaAxis3: 13,
		kCGScrollWheelEventFixedPtDeltaAxis1: 93,
		kCGScrollWheelEventFixedPtDeltaAxis2: 94,
		kCGScrollWheelEventFixedPtDeltaAxis3: 95,
		kCGScrollWheelEventPointDeltaAxis1: 96,
		kCGScrollWheelEventPointDeltaAxis2: 97,
		kCGScrollWheelEventPointDeltaAxis3: 98,
		kCGScrollWheelEventInstantMouser: 14,
		
		kCFRunLoopRunFinished: 1,
		kCFRunLoopRunStopped: 2,
		kCFRunLoopRunTimedOut: 3,
		kCFRunLoopRunHandledSource: 4,
		
		kCGSOrderAbove: 1,
		kCGSOrderBelow: -1,
		kCGSOrderOut: 0,
		
		///////// OBJC - all consts are wrapped in a type as if its passed to variadic it needs to have type defind, see jsctypes chat with arai on 051015 357p
		NO: self.TYPE.BOOL(0),
		NSPNGFileType: self.TYPE.NSUInteger(4),
		YES: self.TYPE.BOOL(1), // i do this instead of 1 becuase for varidic types we need to expclicitly define it
		NIL: self.TYPE.void.ptr(ctypes.UInt64('0x0')), // needed for varidic args, as i cant pass null there
		NSFileWriteFileExistsError: 516, // i dont use this a variadic, just for compare so i dont wrap this in a type, but the type is  NSInteger. I figured this because NSError says its code value is NSInteger. The types for NSFileWriteFileExistsError says its enum - but by looking up code i can see that enum is type NSInteger - sources: https://developer.apple.com/library/ios/documentation/Cocoa/Reference/Foundation/Classes/NSError_Class/index.html#//apple_ref/occ/instp/NSError/code && https://developer.apple.com/library/ios/documentation/Cocoa/Reference/Foundation/Miscellaneous/Foundation_Constants/index.html#//apple_ref/doc/constant_group/NSError_Codes
		NSURLBookmarkCreationSuitableForBookmarkFile: self.TYPE.NSURLBookmarkCreationOptions(1 << 10),
		
		NSApplicationActivateAllWindows: self.TYPE.NSUInteger(1 << 0),
		NSApplicationActivateIgnoringOtherApps: self.TYPE.NSUInteger(1 << 1)
	};
	
	
	// ADVANCED CONST
	this.CONST.NULL = this.CONST.NIL.address();
	
	
	this.CONST.NSLeftMouseDownMask = 1 << this.CONST.NSLeftMouseDown;
	this.CONST.NSLeftMouseUpMask = 1 << this.CONST.NSLeftMouseUp;
	this.CONST.NSRightMouseDownMask = 1 << this.CONST.NSRightMouseDown;
	this.CONST.NSRightMouseUpMask = 1 << this.CONST.NSRightMouseUp;
	this.CONST.NSMouseMovedMask = 1 << this.CONST.NSMouseMoved;
	this.CONST.NSLeftMouseDraggedMask = 1 << this.CONST.NSLeftMouseDragged;
	this.CONST.NSRightMouseDraggedMask = 1 << this.CONST.NSRightMouseDragged;
	this.CONST.NSMouseEnteredMask = 1 << this.CONST.NSMouseEntered;
	this.CONST.NSMouseExitedMask = 1 << this.CONST.NSMouseExited;
	this.CONST.NSKeyDownMask = 1 << this.CONST.NSKeyDown;
	this.CONST.NSKeyUpMask = 1 << this.CONST.NSKeyUp;
	this.CONST.NSFlagsChangedMask = 1 << this.CONST.NSFlagsChanged;
	this.CONST.NSAppKitDefinedMask = 1 << this.CONST.NSAppKitDefined;
	this.CONST.NSSystemDefinedMask = 1 << this.CONST.NSSystemDefined;
	this.CONST.NSApplicationDefinedMask = 1 << this.CONST.NSApplicationDefined;
	this.CONST.NSPeriodicMask = 1 << this.CONST.NSPeriodic;
	this.CONST.NSCursorUpdateMask = 1 << this.CONST.NSCursorUpdate;
	this.CONST.NSScrollWheelMask = 1 << this.CONST.NSScrollWheel;
	this.CONST.NSTabletPointMask = 1 << this.CONST.NSTabletPoint;
	this.CONST.NSTabletProximityMask = 1 << this.CONST.NSTabletProximity;
	this.CONST.NSOtherMouseDownMask = 1 << this.CONST.NSOtherMouseDown;
	this.CONST.NSOtherMouseUpMask = 1 << this.CONST.NSOtherMouseUp;
	this.CONST.NSOtherMouseDraggedMask = 1 << this.CONST.NSOtherMouseDragged;
	this.CONST.NSEventMaskGesture = 1 << this.CONST.NSEventTypeGesture;
	this.CONST.NSEventMaskMagnify = 1 << this.CONST.NSEventTypeMagnify;
	this.CONST.NSEventMaskSwipe = 1 << this.CONST.NSEventTypeSwipe;	// 1U << NSEventTypeSwipe
	this.CONST.NSEventMaskRotate = 1 << this.CONST.NSEventTypeRotate;
	this.CONST.NSEventMaskBeginGesture = 1 << this.CONST.NSEventTypeBeginGesture;
	this.CONST.NSEventMaskEndGesture = 1 << this.CONST.NSEventTypeEndGesture;
	this.CONST.NSEventMaskSmartMagnify = 1 << this.CONST.NSEventTypeSmartMagnify;	// 1ULL << NSEventTypeSmartMagnify;
	this.CONST.NSEventMaskPressure = 1 << this.CONST.NSEventTypePressure;	// 1ULL << NSEventTypePressure
	this.CONST.NSAnyEventMask = this.CONST.NSUIntegerMax; //0xffffffffU

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
				case 'CarbonCore':
				
						_lib[path] = ctypes.open('/System/Library/Frameworks/CoreServices.framework/Frameworks/CarbonCore.framework/CarbonCore');
					
					break;
				case 'CoreFoundation':
				
						_lib[path] = ctypes.open('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
					
					break;
				case 'CoreGraphics':
				
						_lib[path] = ctypes.open('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics');

					break;
				case 'FSEvents':
				
						var possibles = ['/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/FSEvents.framework/Versions/A/FSEvents', '/System/Library/Frameworks/CoreServices.framework/Frameworks/CarbonCore.framework/CarbonCore'];
						
						var preferred;
						// all values of preferred MUST exist in possibles reason is link123543939
						if (core.os.version >= 10) {
							preferred = possibles[0];
						} else {
							preferred = possibles[1];
						}
						
						libAttempter(path, preferred, possibles);
					
					break;
				case 'libc':

						var possibles = ['libc.dylib', 'libc.so.7', 'libc.so.61.0', 'libc.so', 'libc.so.6', 'libc.so.0.1'];
						var preferred;
						// all values of preferred MUST exist in possibles reason is link123543939
						switch (core.os.name) {
							case 'darwin':
								preferred = 'libc.dylib';
								break;
							case 'freebsd':
								preferred = 'libc.so.7';
								break;
							case 'openbsd':
								preferred = 'libc.so.61.0';
								break;
							case 'android':
							case 'sunos':
							case 'netbsd': // physically unverified
							case 'dragonfly': // physcially unverified
								preferred = 'libc.so';
								break;
							case 'linux':
								preferred = 'libc.so.6';
								break;
							case 'gnu/kfreebsd': // physically unverified
								preferred = 'libc.so.0.1';
								break;
							default:
								// do nothing
						}
						
						libAttempter(path, preferred, possibles);

					break;
				case 'objc':
				
						_lib[path] = ctypes.open(ctypes.libraryName('objc'));
					
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
		_CGSDefaultConnection: function () {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L39
			 * CGSConnection _CGSDefaultConnection(
			 *   void
			 * );
			 */
			return lib('CoreGraphics').declare('_CGSDefaultConnection', self.TYPE.ABI,
				self.TYPE.CGSConnection		// return
			);
		},
		CGSConnectionGetPID: function () {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L108
			 * CGError CGSConnectionGetPID(
			 *   const CGSConnection cid,
			 *   pid_t *pid,
			 *   const CGSConnection ownerCid
			 * );
			 */
			return lib('CoreGraphics').declare('CGSConnectionGetPID', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.pid_t.ptr,		// *pid
				self.TYPE.CGSConnection		// ownerCid
			);
		},
		CGSGetWindowCount: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L48
			 * CGError CGSGetWindowCount(
			 *   const CGSConnection cid,
			 *   CGSConnection targetCID,
			 *   int* outCount
			 * );
			 */
			return lib('CoreGraphics').declare('CGSGetWindowCount', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.CGSConnection,	// targetCID
				self.TYPE.int.ptr			// outCount
			);
		},
		CGSGetWindowWorkspace: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L196
			 * CGError CGSGetWindowWorkspace(
			 *   const CGSConnection cid,
			 *   const CGSWindow wid,
			 *   CGSWorkspace *workspace
			 * );
			 */
			return lib('CoreGraphics').declare('CGSGetWindowWorkspace', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.CGSWindow,		// wid
				self.TYPE.CGSWorkspace.ptr	// *workspace
			);
		},
		CGSGetWindowOwner: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L107
			 * CGError CGSGetWindowOwner(
			 *   const CGSConnection cid,
			 *   const CGSWindow wid,
			 *   CGSConnection *ownerCid
			 * );
			 */
			return lib('CoreGraphics').declare('CGSGetWindowOwner', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.CGSWindow,		// wid
				self.TYPE.CGSConnection.ptr	// *ownerCid
			);
		},
		CGSGetWorkspace: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L56
			 * CGSGetWorkspace(
			 *   const CGSConnection cid,
			 *   CGSWorkspace *workspace
			 * );
			 */
			return lib('CoreGraphics').declare('CGSGetWorkspace', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.CGSWorkspace.ptr	// *workspace
			);
		},
		CGSOrderWindow: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L72
			 * CGError CGSOrderWindow(
			 *   const CGSConnection cid,
			 *   const CGSWindow wid,
			 *   CGSWindowOrderingMode place,
			 *   CGSWindow relativeToWindowID		// can be NULL
			 * );
			 */
			return lib('CoreGraphics').declare('CGSOrderWindow', self.TYPE.ABI,
				self.TYPE.CGError,					// return
				self.TYPE.CGSConnection,			// cid
				self.TYPE.CGSWindow,				// wid
				self.TYPE.CGSWindowOrderingMode,	// place
				self.TYPE.CGSWindow					// relativeToWindowID
			);
		},
		CGSSetWorkspace: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L197
			 * CGError CGSSetWorkspace(
			 *   const CGSConnection cid,
			 *   CGSWorkspace workspace
			 * );
			 */
			return lib('CoreGraphics').declare('CGSSetWorkspace', self.TYPE.ABI,
				self.TYPE.CGError,			// return
				self.TYPE.CGSConnection,	// cid
				self.TYPE.CGSWorkspace		// workspace
			);
		},
		CGSSetWorkspaceWithTransition: function() {
			/* https://gist.github.com/Noitidart/3664c5c2059c9aa6779f#file-cgsprivate-h-L198
			 * CGError CGSSetWorkspaceWithTransition(
			 *   const CGSConnection cid,
			 *   CGSWorkspace workspace,
			 *   CGSTransitionType transition,
			 *   CGSTransitionOption subtype,
			 *   float time
			 * );
			 */
			return lib('CoreGraphics').declare('CGSSetWorkspaceWithTransition', self.TYPE.ABI,
				self.TYPE.CGError,				// return
				self.TYPE.CGSConnection,		// cid
				self.TYPE.CGSWorkspace,			// workspace
				self.TYPE.CGSTransitionType,	// transition
				self.TYPE.CGSTransitionOption,	// subtype
				self.TYPE.float					// time
			);
		},
		CFArrayCreate: function() {
			return lib('CoreFoundation').declare('CFArrayCreate', self.TYPE.ABI,
				self.TYPE.CFArrayRef,
				self.TYPE.CFAllocatorRef,
				self.TYPE.void.ptr.ptr,
				self.TYPE.CFIndex,
				self.TYPE.CFArrayCallBacks.ptr
			);
		},
		CFArrayGetCount: function() {
			return lib('CoreFoundation').declare('CFArrayGetCount', self.TYPE.ABI,
				self.TYPE.CFIndex,
				self.TYPE.CFArrayRef
			);
		},
		CFArrayGetValueAtIndex: function() {
			return lib('CoreFoundation').declare('CFArrayGetValueAtIndex', self.TYPE.ABI,
				self.TYPE.void.ptr,
				self.TYPE.CFArrayRef,
				self.TYPE.CFIndex
			);
		},
		CFMachPortCreateRunLoopSource: function() {
			return lib('CoreFoundation').declare('CFMachPortCreateRunLoopSource', self.TYPE.ABI,
				self.TYPE.CFRunLoopSourceRef,
				self.TYPE.CFAllocatorRef,
				self.TYPE.CFMachPortRef,
				self.TYPE.CFIndex
			);
		},
		CFRunLoopAddSource: function() {
			return lib('CoreFoundation').declare('CFRunLoopAddSource', self.TYPE.ABI,
				self.TYPE.VOID,
				self.TYPE.CFRunLoopRef,
				self.TYPE.CFRunLoopSourceRef,
				self.TYPE.CFStringRef
			);
		},
		CFRunLoopGetCurrent: function() {
			return lib('CoreFoundation').declare('CFRunLoopGetCurrent', self.TYPE.ABI,
				self.TYPE.CFRunLoopRef
			);
		},
		CFRunLoopSourceInvalidate: function() {
			return lib('CoreFoundation').declare('CFRunLoopSourceInvalidate', self.TYPE.ABI,
				self.TYPE.VOID,
				self.TYPE.CFRunLoopSourceRef
			);
		},
		CFRunLoopRemoveSource: function() {
			lib('CoreFoundation').declare('CFRunLoopRemoveSource', self.TYPE.ABI,
				self.TYPE.VOID,
				self.TYPE.CFRunLoopRef,
				self.TYPE.CFRunLoopSourceRef,
				self.TYPE.CFStringRef
			);
		},
		CFRunLoopRun: function() {
			/* https://developer.apple.com/library/ios/documentation/CoreFoundation/Reference/CFRunLoopRef/index.html#//apple_ref/c/func/CFRunLoopRun
			*/
			return lib('CoreFoundation').declare('CFRunLoopRun', self.TYPE.ABI,
				self.TYPE.VOID
			);
		},
		CFRunLoopRunInMode: function() {
			/* https://developer.apple.com/library/ios/documentation/CoreFoundation/Reference/CFRunLoopRef/index.html#//apple_ref/c/func/CFRunLoopRunInMode
			*/
			return lib('CoreFoundation').declare("CFRunLoopRunInMode", self.TYPE.ABI,
				self.TYPE.SInt32,
				self.TYPE.CFStringRef,
				self.TYPE.CFTimeInterval,
				self.TYPE.Boolean
			);
		},
		CFRunLoopStop: function() {
			/* https://developer.apple.com/library/ios/documentation/CoreFoundation/Reference/CFRunLoopRef/index.html#//apple_ref/c/func/CFRunLoopStop
			*/
			return lib('CoreFoundation').declare('CFRunLoopStop', self.TYPE.ABI,
				self.TYPE.VOID,
				self.TYPE.CFRunLoopRef
			);
		},
		CFStringCreateWithCharacters: function() {
			/* https://developer.apple.com/library/mac/documentation/CoreFoundation/Reference/CFStringRef/#//apple_ref/c/func/CFStringCreateWithCharacters
			 * CFStringRef CFStringCreateWithCharacters (
			 *   CFAllocatorRef alloc,
			 *   const UniChar *chars,
			 *   CFIndex numChars
			 * ); 
			 */
			return lib('CoreFoundation').declare('CFStringCreateWithCharacters', self.TYPE.ABI,
				self.TYPE.CFStringRef,		// return
				self.TYPE.CFAllocatorRef,	// alloc
				self.TYPE.UniChar.ptr,		// *chars
				self.TYPE.CFIndex			// numChars
			);
		},
		CFRelease: function() {
			/* https://developer.apple.com/library/mac/documentation/CoreFoundation/Reference/CFTypeRef/#//apple_ref/c/func/CFRelease
			 * void CFRelease (
			 *   CFTypeRef cf
			 * ); 
			 */
			return lib('CoreFoundation').declare('CFRelease', self.TYPE.ABI,
				self.TYPE.void,		// return
				self.TYPE.CFTypeRef	// cf
			);
		},
		CGContextClearRect: function() {
			return lib('CoreGraphics').declare('CGContextClearRect', self.TYPE.ABI,
				self.TYPE.void,
				self.TYPE.CGContextRef,
				self.TYPE.CGRect
			);
		},
		CGContextDrawImage: function() {
			/* https://developer.apple.com/library/mac/documentation/GraphicsImaging/Reference/CGContext/index.html#//apple_ref/c/func/CGContextDrawImage
			 * void CGContextDrawImage (
			 *   CGContextRef c,
			 *   CGRect rect,
			 *   CGImageRef image
			 * ); 
			 */
			return lib('CoreGraphics').declare('CGContextDrawImage', self.TYPE.ABI,
				self.TYPE.void,		// return
				self.TYPE.CGContextRef,	// c
				self.TYPE.CGRect,		// rect
				self.TYPE.CGImageRef		// image
			);
		},
		CGDisplayBounds: function() {
			return lib('CoreGraphics').declare('CGDisplayBounds', self.TYPE.ABI,
				self.TYPE.CGRect,
				self.TYPE.CGDirectDisplayID
			);
		},
		CGDisplayCreateImage: function() {
			return lib('CoreGraphics').declare('CGDisplayCreateImage', self.TYPE.ABI,
				self.TYPE.CGImageRef,
				self.TYPE.CGDirectDisplayID
			);
		},
		CGDisplayHideCursor: function() {
			return lib('CoreGraphics').declare('CGDisplayHideCursor', self.TYPE.ABI,
				self.TYPE.CGError,
				self.TYPE.CGDirectDisplayID
			);
		},
		CGDisplayMirrorsDisplay: function() {
			return lib('CoreGraphics').declare('CGDisplayMirrorsDisplay', self.TYPE.ABI,
				self.TYPE.CGDirectDisplayID,
				self.TYPE.CGDirectDisplayID
			);
		},
		CGDisplayShowCursor: function() {
			return lib('CoreGraphics').declare('CGDisplayShowCursor', self.TYPE.ABI,
				self.TYPE.CGError,
				self.TYPE.CGDirectDisplayID
			);
		},
		CGEventGetIntegerValueField: function() {
			/* https://developer.apple.com/library/mac/documentation/Carbon/Reference/QuartzEventServicesRef/index.html#//apple_ref/c/func/CGEventGetIntegerValueField
			 * int64_t CGEventGetIntegerValueField (
			 *   CGEventRef event,
			 *   CGEventField field
			 * ); 
			 */
			return lib('CoreGraphics').declare('CGEventGetIntegerValueField', self.TYPE.ABI,
				self.TYPE.int64_t,		// return
				self.TYPE.CGEventRef,	// event
				self.TYPE.CGEventField	// field
			);
		},
		CGEventMaskBit: function() {
			/* https://developer.apple.com/library/mac/documentation/Carbon/Reference/QuartzEventServicesRef/index.html#//apple_ref/c/macro/CGEventMaskBit
			 * CGEventMask CGEventMaskBit (
			 *   CGEventType eventType
			 * ); 
			 */
			// its inlined apparently: as this doesnt work
			  // return lib('CoreGraphics').declare('CGEventMaskBit', self.TYPE.ABI,
			  // 	self.TYPE.CGEventType
			  // );
			// inlined found here: https://github.com/sschiesser/ASK_server/blob/a51e2fbdac894c37d97142fc72faa35f89057744/MacOSX10.6/System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/CoreGraphics.framework/Versions/A/Headers/CGEventTypes.h#L377
			  // #define CGEventMaskBit(eventType) ((CGEventMask)1 << (eventType))
			return function(eventType) {
				return self.TYPE.CGEventMask(1 << eventType);
			};
		},
		CGEventTapCreateForPSN: function() {
			/* https://developer.apple.com/library/mac/documentation/Carbon/Reference/QuartzEventServicesRef/index.html#//apple_ref/c/func/CGEventTapCreateForPSN
			 * CFMachPortRef CGEventTapCreateForPSN (
			 *   void *processSerialNumber,
			 *   CGEventTapPlacement place,
			 *   CGEventTapOptions options,
			 *   CGEventMask eventsOfInterest,
			 *   CGEventTapCallBack callback,
			 *   void *userInfo
			 * );
			 */
			// oxtypes uses libpath: '/System/Library/Frameworks/ApplicationServices.framework/Frameworks/CoreGraphics.framework/CoreGraphics' both work for me though,  tested on osx 10
			return lib('CoreGraphics').declare('CGEventTapCreateForPSN', self.TYPE.ABI,
				self.TYPE.CFMachPortRef,
				self.TYPE.VOID.ptr,
				self.TYPE.CGEventTapPlacement,
				self.TYPE.CGEventTapOptions,
				self.TYPE.CGEventMask,
				self.TYPE.CGEventTapCallBack,
				self.TYPE.VOID.ptr
			);
		},
		CGEventTapEnable: function() {
			return lib('CoreGraphics').declare('CGEventTapEnable', self.TYPE.ABI,
				self.TYPE.VOID,
				self.TYPE.CFMachPortRef,
				self.TYPE.bool
			);
		},
		CGGetActiveDisplayList: function() {
			/* https://developer.apple.com/library/mac/documentation/GraphicsImaging/Reference/Quartz_Services_Ref/index.html#//apple_ref/c/func/CGGetActiveDisplayList
			 * CGError CGGetActiveDisplayList (
			 *   uint32_t maxDisplays,
			 *   CGDirectDisplayID *activeDisplays,
			 *   uint32_t *displayCount
			 * ); 
			 */
			return lib('CoreGraphics').declare('CGGetActiveDisplayList', self.TYPE.ABI,
				self.TYPE.CGError,					// return
				self.TYPE.uint32_t,					// maxDisplays
				self.TYPE.CGDirectDisplayID.ptr,	// *activeDisplays
				self.TYPE.uint32_t.ptr				// *displayCount
			);
		},
		CGWindowLevelForKey: function() {
			return lib('CoreGraphics').declare('CGWindowLevelForKey', self.TYPE.ABI,
				self.TYPE.CGWindowLevel,
				self.TYPE.CGWindowLevelKey
			);
		},
		CGWindowListCopyWindowInfo: function() {
			/* https://developer.apple.com/library/mac/documentation/Carbon/Reference/CGWindow_Reference/Reference/Functions.html
			 * CFArrayRef CGWindowListCopyWindowInfo(
			 *   CGWindowListOption option,
			 *   CGWindowID relativeToWindow
			 * );
			 */
			return lib('CoreGraphics').declare('CGWindowListCopyWindowInfo', self.TYPE.ABI,
				self.TYPE.CFArrayRef,
				self.TYPE.CGWindowListOption,
				self.TYPE.CGWindowID
			);
		},
		CGImageRelease: function() {
			return lib('CoreGraphics').declare('CGImageRelease', self.TYPE.ABI,
				self.TYPE.void,
				self.TYPE.CGImageRef
			);
		},
		CGRectMake: function() {
			/* https://developer.apple.com/library/ios/documentation/GraphicsImaging/Reference/CGGeometry/index.html#//apple_ref/c/func/CGRectMake
			 *  CGRect CGRectMake (
			 *    CGFloat x,
			 *    CGFloat y,
			 *    CGFloat width,
			 *    CGFloat height
			 * ); 
			 */
			// doesnt work, its inlined
			  // return lib('CGGeometry').declare('CGRectMake', self.TYPE.ABI,
			  // 	self.TYPE.CGRect,	// return
			  // 	self.TYPE.CGFloat,	// x
			  // 	self.TYPE.CGFloat,	// y
			  // 	self.TYPE.CGFloat,	// width
			  // 	self.TYPE.CGFloat	// height
			  // );
			// its inlined, see: http://stackoverflow.com/questions/30158864/cgrectmake-symbol-not-found#comment48456276_30173759
			return function(x, y, width, height) {
				return self.TYPE.CGRect(
					self.TYPE.CGPoint(x, y),
					self.TYPE.CGSize(width, height)
				);
			};
		},
		CGRectMakeWithDictionaryRepresentation: function() {
			/* https://developer.apple.com/library/ios/documentation/GraphicsImaging/Reference/CGGeometry/index.html#//apple_ref/c/func/CGRectMakeWithDictionaryRepresentation
			 * bool CGRectMakeWithDictionaryRepresentation (
			 *   CFDictionaryRef dict,
			 *   CGRect *rect
			 * ); 
			 */
			return lib('CoreGraphics').declare('CGRectMakeWithDictionaryRepresentation', self.TYPE.ABI,
				ctypes.bool,				// return
				self.TYPE.CFDictionaryRef,	// dict
				self.TYPE.CGRect.ptr		// *rect
			);
		},
		CGRectGetHeight: function() {
			return lib('CoreGraphics').declare('CGRectGetHeight', self.TYPE.ABI,
				self.TYPE.CGFloat,
				self.TYPE.CGRect
			);
		},
		CGRectGetWidth: function() {
			return lib('CoreGraphics').declare('CGRectGetWidth', self.TYPE.ABI,
				self.TYPE.CGFloat,
				self.TYPE.CGRect
			);
		},
		CGRectUnion: function() {
			return lib('CoreGraphics').declare('CGRectUnion', self.TYPE.ABI,
				self.TYPE.CGRect,
				self.TYPE.CGRect,
				self.TYPE.CGRect
			);
		},
		GetCurrentProcess: function() {
			return lib('/System/Library/Frameworks/ApplicationServices.framework/Frameworks/HIServices.framework/HIServices').declare('GetCurrentProcess', self.TYPE.ABI,
				self.TYPE.OSErr,
				self.TYPE.ProcessSerialNumber.ptr
			);
		},
		//////////// OBJC
		objc_getClass: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_getClass
			 * Class objc_getClass (
			 *   const char *name
			 * ); 
			 */
			return lib('objc').declare('objc_getClass', self.TYPE.ABI,
				self.TYPE.Class,		// return
				self.TYPE.char.ptr		// *name
			);
		},
		objc_msgSend: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_getClass
			 * id objc_msgSend (
			 *   id self,
			 *   SEL op,
			 *   ... 
			 * ); 
			 */
			return lib('objc').declare('objc_msgSend', self.TYPE.ABI,
				self.TYPE.id,		// return
				self.TYPE.id,		// self
				self.TYPE.SEL,		// op
				'...'				// variable arguments
			);
		},
		sel_registerName: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_getClass
			 * SEL sel_registerName (
			 *   const char *str
			 * ); 
			 */
			return lib('objc').declare('sel_registerName', self.TYPE.ABI,
				self.TYPE.SEL,		// return
				self.TYPE.char.ptr	// *str
			);
		},
		objc_registerClassPair: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_registerClassPair
			 * void objc_registerClassPair (
			 *   Class cls
			 * ); 
			 */
			return lib('objc').declare('objc_registerClassPair', self.TYPE.ABI,
				self.TYPE.void,	// return
				self.TYPE.Class	// cls
			);
		},
		objc_allocateClassPair: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_allocateClassPair
			 *  Class objc_allocateClassPair (
			 *   Class superclass,
			 *   const char *name,
			 *   size_t extraBytes
			 * );
			 */
			return lib('objc').declare('objc_allocateClassPair', self.TYPE.ABI,
				self.TYPE.Class,		// return
				self.TYPE.Class,		// superclass
				self.TYPE.char.ptr,		// *name
				self.TYPE.size_t		// extraBytes
			);
		},
		class_addMethod: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/class_addMethod
			 * BOOL class_addMethod (
			 *   Class cls,
			 *   SEL name,
			 *   IMP imp,
			 *   const char *types
			 * ); 
			 */
			return lib('objc').declare('class_addMethod', self.TYPE.ABI,
				self.TYPE.BOOL,		// return
				self.TYPE.Class,	// cls
				self.TYPE.SEL,		// name
				self.TYPE.IMP,		// imp
				self.TYPE.char.ptr	// *types
			);
		},
		objc_disposeClassPair: function() {
			/* https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ObjCRuntimeRef/index.html#//apple_ref/c/func/objc_disposeClassPair
			 * void objc_disposeClassPair (
			 *   Class cls
			 * ); 
			 */
			return lib('objc').declare('objc_disposeClassPair', self.TYPE.ABI,
				self.TYPE.void,	// return
				self.TYPE.Class	// cls
			);
		},
		///////////// LIBC
		close: function() {
			/* http://linux.die.net/man/2/close
			 * int close(int fd);
			 *
			 * https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man2/close.2.html#//apple_ref/doc/man/2/close
			 * int close(int fildes);
			 */
			return lib('libc').declare('close', self.TYPE.ABI,
				self.TYPE.int,	// return
				self.TYPE.int	// fd
			);
		},
		dispatch_get_main_queue: function() {
			/* https://developer.apple.com/library/prerelease/mac/documentation/Performance/Reference/GCD_libdispatch_Ref/#//apple_ref/c/func/dispatch_get_main_queue
			 *  dispatch_queue_t dispatch_get_main_queue (
			 *   void
			 * ); 
			 */
			// return lib('/usr/lib/system/libdispatch.dylib').declare('_dispatch_main_q', self.TYPE.ABI,
			// 	self.TYPE.dispatch_queue_t	// return
			// );
			// do not do ostypes.API('dispatch_get_main_queue')() the () will give error not FuncitonType.ptr somhting like that, must just use ostypes.API('dispatch_get_main_queue')
			// http://stackoverflow.com/questions/31637321/standard-library-containing-dispatch-get-main-queue-gcd
			return lib('/usr/lib/system/libdispatch.dylib').declare('_dispatch_main_q', self.TYPE.dispatch_queue_t);
		},
		dispatch_sync: function() {
			/* https://developer.apple.com/library/prerelease/mac/documentation/Performance/Reference/GCD_libdispatch_Ref/#//apple_ref/c/func/dispatch_sync
			 * void dispatch_sync (
			 *   dispatch_queue_t queue,
			 *   dispatch_block_t block
			 * ); 
			 */
			return lib('/usr/lib/system/libdispatch.dylib').declare('dispatch_sync', self.TYPE.ABI,
				self.TYPE.void,					// return
				self.TYPE.dispatch_queue_t,		// queue
				self.TYPE.dispatch_block_t		// block
			);
		},
		fcntl: function() {
			/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man2/fcntl.2.html
			 * http://linux.die.net/man/2/fcntl
			 * fcntl() can take an optional third argument. Whether or not this argument is required is determined by cmd.
			 * F_GETLK, F_SETLK and F_SETLKW are used to acquire, release, and test for the existence of record locks (also known as file-segment or file-region locks). The third argument, lock, is a pointer to a structure that has at least the following fields (in unspecified order). 
			 * int fcntl(int fd, int cmd);
			 * int fcntl(int fd, int cmd, long arg);
			 * int fcntl(int fd, int cmd, struct flock *lock);
			 */
			return lib('libc').declare('fcntl', self.TYPE.ABI,
				self.TYPE.int,			// return
				self.TYPE.int,			// fd
				self.TYPE.int,			// cmd
				self.TYPE.flock.ptr		// *lock
			);
		},
		fread: function() {
			/* http://linux.die.net/man/3/fread
			 * size_t fread (
			 *   void *ptr,
			 *   size_t size,
			 *   size_t nmemb,
			 *   FILE *stream
			 * );
			 */
			return lib('libc').declare('fread', self.TYPE.ABI, 
				self.TYPE.size_t,		// return
				self.TYPE.void.ptr,		// *ptr
				self.TYPE.size_t, 		// size
				self.TYPE.size_t, 		// count
				self.TYPE.FILE.ptr		// *stream
			);
		},
		memcpy: function() {
			/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man3/memcpy.3.html#//apple_ref/doc/man/3/memcpy
			 * void *memcpy (
			 *   void *restrict dst,
			 *   const void *restrict src,
			 *   size_t n
			 * );
			 */
			return lib('libc').declare('memcpy', self.TYPE.ABI,
				self.TYPE.void,		// return
				self.TYPE.void.ptr,	// *dst
				self.TYPE.void.ptr,	// *src
				self.TYPE.size_t	// n
			);
		},
		open: function() {
			/* http://linux.die.net/man/2/open
			 * int open(const char *pathname, int flags);
			 * int open(const char *pathname, int flags, mode_t mode);
			 * int creat(const char *pathname, mode_t mode);
			 *
			 * https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man2/open.2.html#//apple_ref/doc/man/2/open
			 * int open(const char *path, int oflag, ...);
			 */
			return lib('libc').declare('open', self.TYPE.ABI,
				self.TYPE.int,		// return
				self.TYPE.char.ptr,	// *path
				self.TYPE.int		// flags
			);
		},
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
		readlink: function() {
			/* https://developer.apple.com/library/mac/documentation/Darwin/Reference/ManPages/man2/readlink.2.html
			 * ssize_t readlink(
			 *   const char *restrict path,
			 *   char *restrict buf,
			 *   size_t bufsize
			 * );
			 */
			return lib('libc').declare('readlink', self.TYPE.ABI,
				self.TYPE.ssize_t,		// return
				self.TYPE.char.ptr,		// *restrict path
				self.TYPE.char.ptr,		// *restrict buf
				self.TYPE.size_t		// bufsize
			);
		}
	};
	// end - predefine your declares here
	// end - function declares

	this.HELPER = {
		makeCFStr: function(jsStr) {
			// js str is just a string
			// returns a CFStr that must be released with CFRelease when done
			return self.API('CFStringCreateWithCharacters')(null, jsStr, jsStr.length);
		},
		Str255: function(str) {
			return String.fromCharCode(str.length) + str;
		},
		// OBJC HELPERS
		_selLC: {}, // LC = Lazy Cache
		sel: function(jsStrSEL) {
			if (!(jsStrSEL in self.HELPER._selLC)) {
				self.HELPER._selLC[jsStrSEL] = self.API('sel_registerName')(jsStrSEL);
				// console.info('sel c got', jsStrSEL, self.HELPER._selLC[jsStrSEL].toString());
			}
			return self.HELPER._selLC[jsStrSEL];
		},
		_classLC: {}, // LC = Lazy Cache
		class: function(jsStrCLASS) {
			if (!(jsStrCLASS in self.HELPER._classLC)) {
				self.HELPER._classLC[jsStrCLASS] = self.API('objc_getClass')(jsStrCLASS);
				// console.info('class c got', jsStrCLASS, self.HELPER._classLC[jsStrCLASS].toString());
			}
			return self.HELPER._classLC[jsStrCLASS];
		},
		nsstringColl: function() { // collection of NSStrings with methods of .release to release all of them
			// creates a collection
			// if get and it doesnt exist then it makes and stores it
			// if get and already exists then it returns that lazy
			// can releaseAll on it
			// console.error('nssstringColll');
			this.coll = {};
			this.class = {};
			this.get = function(jsStr) {
				// console.error('enter get');
				if (!(jsStr in this.coll)) {
					// console.error('here');
					this.class[jsStr] = self.API('objc_msgSend')(self.HELPER.class('NSString'), self.HELPER.sel('alloc'));;
					// console.info('pre init this.class[jsStr]:', jsStr, this.class[jsStr].toString());
					
					var rez_initWithUTF8String = self.API('objc_msgSend')(this.class[jsStr], self.HELPER.sel('initWithUTF8String:'), self.TYPE.char.array()(jsStr));
					this.coll[jsStr] = rez_initWithUTF8String;
					// console.info('post init this.class:', jsStr, this.class[jsStr].toString(), 'this.coll[jsStr]:', this.coll[jsStr].toString());
				}
				// else { console.error('jsStr already in coll', jsStr); }
				return this.coll[jsStr];
			};
			
			this.releaseAll = function() {
				for (var nsstring in this.coll) {
					var rez_relNSS = self.API('objc_msgSend')(this.coll[nsstring], self.HELPER.sel('release'));
					var rez_relCLASS = self.API('objc_msgSend')(this.class[nsstring], self.HELPER.sel('release'));
					// console.info(nsstring, 'rez_relNSS:', rez_relNSS.toString(), 'rez_relCLASS:', rez_relCLASS.toString());
				}
				this.coll = null;
			};
		},
		readNSString: function(aNSStringPtr) {
			var cUTF8Ptr = self.API('objc_msgSend')(aNSStringPtr, self.HELPER.sel('UTF8String'));
			var cCharPtr = ctypes.cast(cUTF8Ptr, ctypes.char.ptr);
			return cCharPtr.readStringReplaceMalformed();
		},
		createBlock: function(aFuncTypePtr) {
			// based on work from here: https://github.com/trueinteractions/tint2/blob/f6ce18b16ada165b98b07869314dad1d7bee0252/modules/Bridge/core.js#L370-L394
			var bl = self.TYPE.Block_literal_1();
			
			// Set the class of the instance
			bl.isa = self.CONST._NSConcreteGlobalBlock;
			
			// Global flags
			bl.flags = self.CONST.BLOCK_HAS_STRET;
			bl.reserved = 0;
			bl.invoke = aFuncTypePtr;
			
			// create descriptor
			var desc = self.TYPE.Block_descriptor_1();
			desc.reserved = 0;
			desc.size = self.TYPE.Block_literal_1.size;
			
			// set descriptor into block literal
			bl.descriptor = desc.address();

			return bl;
		}
	};
}

var ostypes = new macInit();