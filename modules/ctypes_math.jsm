/* Thanks to @arai */

var EXPORTED_SYMBOLS = ['ctypes_math'];

var ctypes_math = (function() {
  const UInt64 = ctypes.UInt64;
  const Unt64 = ctypes.Unt64;

  function UInt64_add(a, b) {
    var hi = UInt64.hi(a) + UInt64.hi(b);
    var lo = UInt64.lo(a) + UInt64.lo(b);
    if (lo > 0x100000000) {
      hi += 1;
    }

    return UInt64.join(hi >>> 0, lo >>> 0);
  }

  function UInt64_sub(a, b) {
    var hi = UInt64.hi(a) - UInt64.hi(b);
    var lo = UInt64.lo(a) - UInt64.lo(b);
    if (lo < 0) {
      hi -= 1;
    }

    return UInt64.join(hi >>> 0, lo >>> 0);
  }

  function UInt64_mul(a, b) {
    var ah = UInt64.hi(a);
    var al = UInt64.lo(a);

    var bh = UInt64.hi(b);
    var bl = UInt64.lo(b);

    var a5 = ah >>> 20;
    var a4 = (ah >>> 7) & 0x1fff;
    var a3 = ((ah << 6) | (al >>> 26)) & 0x1fff;
    var a2 = (al >>> 13) & 0x1fff;
    var a1 = al & 0x1fff;

    var b5 = bh >>> 20;
    var b4 = (bh >>> 7) & 0x1fff;
    var b3 = ((bh << 6) | (bl >>> 26)) & 0x1fff;
    var b2 = (bl >>> 13) & 0x1fff;
    var b1 = bl & 0x1fff;

    var c1 = a1 * b1;
    var c2 = a1 * b2 + a2 * b1;
    var c3 = a1 * b3 + a2 * b2 + a3 * b1;
    var c4 = a1 * b4 + a2 * b3 + a3 * b2 + a4 * b1;
    var c5 = a1 * b5 + a2 * b4 + a3 * b3 + a4 * b2 + a5 * b1;

    c2 += c1 >>> 13;
    c1 &= 0x1fff;
    c3 += c2 >>> 13;
    c2 &= 0x1fff;
    c4 += c3 >>> 13;
    c3 &= 0x1fff;
    c5 += c4 >>> 13;
    c4 &= 0x1fff;

    var ch = ((c5 << 20) | (c4 << 7) | (c3 >>> 6)) >>> 0;
    var cl = ((c3 << 26) | (c2 << 13) | c1) >>> 0;

    return UInt64.join(ch, cl);
  }

  return {
    UInt64: {
      add: UInt64_add,
      sub: UInt64_sub,
      mul: UInt64_mul,
    },
    Int64: {
    }
  };
})();