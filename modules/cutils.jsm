/*** CTypes Utilities ***
 * Stuff that I find useful in my CTypes work under all Operating Systems
 */

var EXPORTED_SYMBOLS = ['cutils'];

if (ctypes.voidptr_t.size == 4 /* 32-bit */) {
	var is64bit = false;
} else if (ctypes.voidptr_t.size == 8 /* 64-bit */) {
	var is64bit = true;
} else {
	throw new Error('huh??? not 32 or 64 bit?!?!');
}

function utilsInit() {
	// start - comparison stuff
	this.jscGetDeepest = function(obj) {
		if (obj !== null && obj !== undefined) {
			console.log('trying on:', obj.toString())
		}
		while (obj && isNaN(obj) && ('contents' in obj || 'value' in obj)) {
			if ('contents' in obj) {
				if (obj.constructor.targetType && obj.constructor.targetType.size === undefined) {
					console.error('breaking as no targetType.size on obj level:', obj.toString());
					break;
				} else {
					obj = obj.contents;
				}
			} else if ('value' in obj) {
				if (obj.constructor.targetType && obj.constructor.targetType.size === undefined) {
					console.error('breaking as no targetType.size on obj level:', obj.toString());
					break;
				} else {
					obj = obj.value;
				}
			}
		}
		if (obj && obj.toString) {
			obj = obj.toString();
		}
		return obj;
	};
	
	this.jscEqual = function(obj1, obj2) {
		// ctypes numbers equal
		// compares obj1 and obj2
		// if equal returns true, else returns false
		
		// check if equal first
		var str1 = obj1;
		var str2 = obj2;
		
		var str1 = this.jscGetDeepest(str1); //cuz apparently its not passing by reference
		var str2 = this.jscGetDeepest(str2); //cuz apparently its not passing by reference
		
		console.info('comparing:', str1, str2);
		
		if (str1 == str2) {
			return true;
		} else {
			return false;
		}
	};
	// end - comparison stuff
	
	// start - mem stuff mimicking
	this.memset = function(array, val, size) {
		/* http://stackoverflow.com/questions/24466228/memset-has-no-dll-so-how-ctype-it
		 * https://gist.github.com/nmaier/ab4bfe59e8c8fcdc5b90
		 * https://gist.github.com/Noitidart/2d9b44b18493f9339629
		 * Note that size is the number of array elements to set, not the number of bytes.
		 * by @nmaier
		 */
		for (var i = 0; i < size; ++i) {
			array[i] = val;
		}
	};
	
	this.memcpy = function(dst, src, size) {
		/* https://gist.github.com/nmaier/ab4bfe59e8c8fcdc5b90
		 * This would be in theory good enough and is a reasonable memcpy implementation
		 * (although we could test if both arrays are the same and skip the copy in that case).
		 * 
		 * But we want memmove, which makes sure that if the arrays overlap data will be still
		 * copied correctly. To do that, we need to compare the addresses and if src.address() < dst.address() then
		 * we'll need to copy back to front, else if src.address() < dst.address() then copy front to back, or
		 * if both are equal, it is actually the same array and we can skip the copy.
		 * by @nmaier
		 */
		if (!dst.constructor.elementType &&
			dst.constructor.elementType != src.constructor.elementType) {
				throw Error("Invalid CType: not an array, or array type mismatch");
		}
		for (var i = 0; i < size; ++i) {
			dst[i] = src[i];
		}
	},
	this.comparePointers = function(a, b) {
		/* https://gist.github.com/nmaier/ab4bfe59e8c8fcdc5b90
		 */
		return ctypes.UInt64.compare(
			ctypes.cast(a, ctypes.uintptr_t).value,
			ctypes.cast(b, ctypes.uintptr_t).value
		);
	},
	this.memmove = function(dst, src, size) {
		/* https://gist.github.com/nmaier/ab4bfe59e8c8fcdc5b90
		 * by @nmaier
		 */
		if (!dst.constructor.elementType &&
			dst.constructor.elementType != src.constructor.elementType) {
				throw Error("Invalid CType: not an array, or array type mismatch");
		}
		let cmp = comparePointers(src.address(), dst.address());
		if (cmp == 0) {
			// arrays point to the same memory location == are the same; skip
			return;
		}
		if (cmp < 0) { // src < dst -> back to front
			for (var i = size - 1; i >= 0; --i) {
				dst[i] = src[i];
			}
			return;
		}
		// else; src > dst -> front to back
		for (var i = 0; i < size; ++i) {
			dst[i] = src[i];
		}
	},
	// end - mem stuff mimicking
	
	// start - my alternative to .readStringReplaceMalformed
	this.readAsChar8ThenAsChar16 = function(stringPtr, known_len, jschar) {
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
	// end - my alternative to .readStringReplaceMalformed
}

var cutils = new utilsInit();