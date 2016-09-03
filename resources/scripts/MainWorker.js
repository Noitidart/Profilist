// Imports
importScripts('resource://gre/modules/osfile.jsm');
importScripts('chrome://profilist/content/resources/scripts/comm/Comm.js');
var {callInBootstrap, callInChildworker1} = CommHelper.mainworker;

// Globals
var core;
var gWorker = this; // needed for png.js
var gBsComm = new Comm.client.worker();

var OSStuff = {};

function dummyForInstantInstantiate() {}
function init(objCore) {
	//console.log('in worker init');

	core = objCore;

	addOsInfoToCore();

	// core.addon.path.storage = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id, 'simple-storage');
	// core.addon.path.filestore = OS.Path.join(core.addon.path.storage, 'store.json');

	// load all localization pacakages
	formatStringFromName('blah', 'main');
	// formatStringFromName('blah', 'chrome://global/locale/dateFormat.properties');
	core.addon.l10n = _cache_formatStringFromName_packages;

	// importScripts(core.addon.path.scripts + '3rd/PNGReader.js');
	importScripts(core.addon.path.scripts + '3rd/zlib.js');
	importScripts(core.addon.path.scripts + '3rd/png.js');

	// Import ostypes
	importScripts(core.addon.path.scripts + 'ostypes/cutils.jsm');
	importScripts(core.addon.path.scripts + 'ostypes/ctypes_math.jsm');
	switch (core.os.mname) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_win.jsm');
			break;
		case 'gtk':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_x11.jsm');
			break;
		case 'darwin':
			importScripts(core.addon.path.scripts + 'ostypes/ostypes_mac.jsm');
			break;
		default:
			throw new Error('Operating system, "' + OS.Constants.Sys.Name + '" is not supported');
	}

	return {
		core
	};
}

// Start - Addon Functionality

function onBeforeTerminate() {
	console.log('doing mainworker term proc');
	var promises_main = [];

	// writeFilestore();

	Comm.server.unregAll('worker');

	switch (core.os.mname) {
		case 'android':

				if (OSStuff.jenv) {
					JNI.UnloadClasses(OSStuff.jenv);
				}

			break;
		case 'gtk':

				ostypes.HELPER.ifOpenedXCBConnClose();

			break;
	}


	console.log('ok onBeforeTerminate return point');

	return Promise.all(promises_main);

}

function fetchCore(aArg) {
	console.log('in fetchCore');
	var { hydrant_ex_instructions, nocore } = aArg || {};

	var deferredmain = new Deferred();

	var rez = { };
	var promiseallarr = [];

	if (!nocore) {
		rez.core = core;
	}

	Promise.all(promiseallarr).then(function(vals) {
		deferredmain.resolve(rez);
	});

	return deferredmain.promise;
}

function testgl() {
	var img, tex, vloc, tloc, sloc, vertexBuff, texBuff;

	var cvs3d = new OffscreenCanvas(64, 64);
	var ctx3d = cvs3d.getContext('webgl', {
		preserveDrawingBuffer: true,
	});
	var uLoc;

	// create shaders
	var vertexShaderSrc = `
		attribute vec2 aVertex;
		attribute vec2 aUV;
		varying vec2 vTex;
		uniform vec2 pos;
		uniform vec2 scale;
		void main(void) {
			gl_Position = vec4(aVertex * scale + pos, 0.0, 1.0);
			vTex = aUV;
		}
	`;

	var fragmentShaderSrc = `
		precision highp float;
		varying vec2 vTex;
		uniform sampler2D sampler0;
		void main(void){
			gl_FragColor = texture2D(sampler0, vTex);
		}
	`;

	var vertShaderObj = ctx3d.createShader(ctx3d.VERTEX_SHADER);
	var fragShaderObj = ctx3d.createShader(ctx3d.FRAGMENT_SHADER);
	ctx3d.shaderSource(vertShaderObj, vertexShaderSrc);
	ctx3d.shaderSource(fragShaderObj, fragmentShaderSrc);
	ctx3d.compileShader(vertShaderObj);
	ctx3d.compileShader(fragShaderObj);

	var progObj = ctx3d.createProgram();
	ctx3d.attachShader(progObj, vertShaderObj);
	ctx3d.attachShader(progObj, fragShaderObj);

	ctx3d.linkProgram(progObj);
	ctx3d.useProgram(progObj);

	vertexBuff = ctx3d.createBuffer();
	ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, vertexBuff);
	ctx3d.bufferData(ctx3d.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]), ctx3d.STATIC_DRAW);

	texBuff = ctx3d.createBuffer();
	ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, texBuff);
	ctx3d.bufferData(ctx3d.ARRAY_BUFFER, new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]), ctx3d.STATIC_DRAW);

	vloc = ctx3d.getAttribLocation(progObj, 'aVertex');
	tloc = ctx3d.getAttribLocation(progObj, 'aUV');
	uLoc = ctx3d.getUniformLocation(progObj, 'pos');
	sLoc = ctx3d.getUniformLocation(progObj, 'scale');

	var drawImage = function(imgobj, x, y, w, h) {
		tex = ctx3d.createTexture();
		ctx3d.bindTexture(ctx3d.TEXTURE_2D, tex);
		ctx3d.texParameteri(ctx3d.TEXTURE_2D, ctx3d.TEXTURE_MIN_FILTER, ctx3d.NEAREST);
		ctx3d.texParameteri(ctx3d.TEXTURE_2D, ctx3d.TEXTURE_MAG_FILTER, ctx3d.NEAREST);
		ctx3d.texImage2D(ctx3d.TEXTURE_2D, 0, ctx3d.RGBA, w, h, 0, ctx3d.RGBA, ctx3d.UNSIGNED_BYTE, imgobj);

		ctx3d.enableVertexAttribArray(vloc);
		ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, vertexBuff);
		ctx3d.vertexAttribPointer(vloc, 2, ctx3d.FLOAT, false, 0, 0);

		ctx3d.enableVertexAttribArray(tloc);
		ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, texBuff);
		ctx3d.bindTexture(ctx3d.TEXTURE_2D, tex);
		ctx3d.vertexAttribPointer(tloc, 2, ctx3d.FLOAT, false, 0, 0);

		// convert x, y to clip space (assuming viewport matches canvas size)
		var cx = x / ctx3d.canvas.width * 2 - 1;
		var cy = y / ctx3d.canvas.height * 2 - 1;

		// convert w, h to clip space (quad is 2 units big)
		var cw = w / ctx3d.canvas.width;
		var ch = h / ctx3d.canvas.height;

		// because the quad centered over 0.0 we have to add in
		// half the width and height (cw, ch are already half because
		// it's 2 unit quad
		cx += cw;
		cy += ch;

		// then we negate cy and ch because webgl -1 is at the bottom
		ctx3d.uniform2f(uLoc, cx, -cy)
		ctx3d.uniform2f(sLoc, cw, -ch);

		ctx3d.drawArrays(ctx3d.TRIANGLE_FAN, 0, 4);
	};


	var deferred_baseimg = new Deferred();
	var deferred_badgeimg = new Deferred();

	var promiseallarr_imgs = [deferred_baseimg.promise, deferred_badgeimg.promise];


	// PNGReader.js fails to read the twitter 64 image, its really weird. but png.js and zlib.js works ah!
	// var req_base = xhr('file:///C:/Users/Mercurius/Documents/GitHub/Firefox-PNG-Icon-Collections/_nightly/64.png', {
	// 	responseType: 'arraybuffer'
	// });
	// var pngreader_base = new PNGReader(req_base.response);
	// pngreader_base.parse({
	// 	data: true
	// }, function(err, png) {
	// 	if (err) {
	// 		console.error('failed to read png data:', err);
	// 		deferred_baseimg.resolve(err);
	// 	} else {
	// 		console.log('png:', png);
	// 		deferred_baseimg.resolve(png);
	// 	}
	// });
	//
	// var req_badge = xhr('file:///C:/Users/Mercurius/Documents/GitHub/Firefox-PNG-Icon-Collections/Badges%20Random%20-%20Collection/Twitter%20-%20Collection/Identity%20by%20Chameleon%20Design/64.png', {
	// 	responseType: 'arraybuffer'
	// });
	// var pngreader_badge = new PNGReader(req_badge.response);
	// pngreader_badge.parse({
	// 	data: true
	// }, function(err, png) {
	// 	if (err) {
	// 		console.error('failed to read png data:', err);
	// 		deferred_badgeimg.resolve(err);
	// 	} else {
	// 		console.log('png:', png);
	// 		deferred_badgeimg.resolve(png);
	// 	}
	// });

	PNG.load('file:///C:/Users/Mercurius/Documents/GitHub/Firefox-PNG-Icon-Collections/_nightly/64.png', function(pnginfo) {
		var imagedata = new ImageData(pnginfo.width, pnginfo.height);
		pnginfo.copyToImageData(imagedata, pnginfo.decodePixels());
		// callInBootstrap('testDraw', imagedata.data.buffer);
		pnginfo.pixels = imagedata.data;
		deferred_baseimg.resolve(pnginfo);
	});

	PNG.load('file:///C:/Users/Mercurius/Documents/GitHub/Firefox-PNG-Icon-Collections/Badges%20Random%20-%20Collection/Twitter%20-%20Collection/Identity%20by%20Chameleon%20Design/64.png', function(pnginfo) {
		var imagedata = new ImageData(pnginfo.width, pnginfo.height);
		pnginfo.copyToImageData(imagedata, pnginfo.decodePixels());
		// callInBootstrap('testDraw', imagedata.data.buffer);
		pnginfo.pixels = imagedata.data;
		deferred_badgeimg.resolve(pnginfo);
	});

	var validateImgs = function(imgs) {
		console.log('imgs parsed:', imgs);
		for (img of imgs) {
			// make sure none of the errored
			if (typeof(img) == 'string') {
				console.error('it errored, error:', img);
				return;
			}

			// make sure they are all square
		}

		var [base_img, badge_img] = imgs;

		callInBootstrap('testDraw', base_img.pixels.buffer);
		callInBootstrap('testDraw', badge_img.pixels.buffer);

		// draw them
		drawImage(base_img.pixels, 0, 0, 64, 64);
		drawImage(badge_img.pixels, 64 - 16, 64 - 16, 16, 16);

		// make blob
		cvs3d.toBlob().then(handleBlob);
	};
	Promise.all(promiseallarr_imgs).then(validateImgs);

	var handleBlob = function(blob) {
		var url = URL.createObjectURL(blob);
		console.log('url:', url);

		var filereader = new FileReader();
		filereader.onload = handleArrBuf;
		filereader.readAsArrayBuffer(blob);
	};

	var handleArrBuf = function() {
		var buf = this.result;
		OS.File.writeAtomic(OS.Path.join(OS.Constants.Path.desktopDir, 'webgl.png'), new Uint8Array(buf));
		console.log('ok done saving to disk');
	};
}

// start - common worker functions

function bootstrapTimeout(milliseconds) {
	var mainDeferred_bootstrapTimeout = new Deferred();
	setTimeout(function() {
		mainDeferred_bootstrapTimeout.resolve();
	}, milliseconds)
	return mainDeferred_bootstrapTimeout.promise;
}

// rev2 - https://gist.github.com/Noitidart/ec1e6b9a593ec7e3efed
function xhr(aUrlOrFileUri, aOptions={}) {
	// console.error('in xhr!!! aUrlOrFileUri:', aUrlOrFileUri);

	// all requests are sync - as this is in a worker
	var aOptionsDefaults = {
		responseType: 'text',
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		headers: null, // make it an object of key value pairs
		method: 'GET', // string
		data: null // make it whatever you want (formdata, null, etc), but follow the rules, like if aMethod is 'GET' then this must be null
	};
	aOptions = Object.assign(aOptionsDefaults, aOptions);

	var cRequest = new XMLHttpRequest();

	cRequest.open(aOptions.method, aUrlOrFileUri, false); // 3rd arg is false for synchronus

	if (aOptions.headers) {
		for (var h in aOptions.headers) {
			cRequest.setRequestHeader(h, aOptions.headers[h]);
		}
	}

	cRequest.responseType = aOptions.responseType;
	cRequest.send(aOptions.data);

	// console.log('response:', cRequest.response);

	// console.error('done xhr!!!');
	return cRequest;
}
// rev2 - https://gist.github.com/Noitidart/ea840a3a0fab9af6687edbad3ae63f48
var _cache_formatStringFromName_packages = {}; // holds imported packages
function formatStringFromName(aKey, aLocalizedPackageName, aReplacements) {
	// depends on ```core.addon.path.locale``` it must be set to the path to your locale folder

	// aLocalizedPackageName is name of the .properties file. so mainworker.properties you would provide mainworker // or if it includes chrome:// at the start then it fetches that
	// aKey - string for key in aLocalizedPackageName
	// aReplacements - array of string

	// returns null if aKey not found in pacakage

	var packagePath;
	var packageName;
	if (aLocalizedPackageName.indexOf('chrome:') === 0 || aLocalizedPackageName.indexOf('resource:') === 0) {
		packagePath = aLocalizedPackageName;
		packageName = aLocalizedPackageName.substring(aLocalizedPackageName.lastIndexOf('/') + 1, aLocalizedPackageName.indexOf('.properties'));
	} else {
		packagePath = core.addon.path.locale + aLocalizedPackageName + '.properties';
		packageName = aLocalizedPackageName;
	}

	if (!_cache_formatStringFromName_packages[packageName]) {
		var packageStr = xhr(packagePath).response;
		var packageJson = {};

		var propPatt = /(.*?)=(.*?)$/gm;
		var propMatch;
		while (propMatch = propPatt.exec(packageStr)) {
			packageJson[propMatch[1].trim()] = propMatch[2];
		}

		_cache_formatStringFromName_packages[packageName] = packageJson;

		console.log('packageJson:', packageJson);
	}

	var cLocalizedStr = _cache_formatStringFromName_packages[packageName][aKey];
	if (!cLocalizedStr) {
		return null;
	}
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}

	return cLocalizedStr;
}
function addOsInfoToCore() {
	// request core.os.toolkit
	// OS.File import

	// add stuff to core
	core.os.name = OS.Constants.Sys.Name.toLowerCase();
	core.os.mname = core.os.toolkit.indexOf('gtk') == 0 ? 'gtk' : core.os.name; // mname stands for modified-name // this will treat solaris, linux, unix, *bsd systems as the same. as they are all gtk based
	// core.os.version
	switch (core.os.name) {
		case 'winnt':
				var version_win = navigator.userAgent.match(/Windows NT (\d+.\d+)/);
				if (version_win) {
					core.os.version = parseFloat(version_win[1]);
					// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
					switch (core.os.version) {
						case 5.1:
						case 5.2:
							core.os.version_name = 'xp';
							break;
						case 6:
							core.os.version_name = 'vista';
							break;
						case 6.1:
							core.os.version_name = '7';
							break;
						case 6.2:
							core.os.version_name = '8';
							break;
						case 6.3:
							core.os.version_name = '8.1';
							break;
						case 10:
							core.os.version_name = '10';
							break;
					}
				}
			break;
		case 'darwin':
				var version_osx = navigator.userAgent.match(/Mac OS X 10\.([\d\.]+)/);
				if (version_osx) {
					var version_osx_str = version_osx[1];
					var ints_split = version_osx[1].split('.');
					if (ints_split.length == 1) {
						core.os.version = parseInt(ints_split[0]);
					} else if (ints_split.length >= 2) {
						core.os.version = ints_split[0] + '.' + ints_split[1];
						if (ints_split.length > 2) {
							core.os.version += ints_split.slice(2).join('');
						}
						core.os.version = parseFloat(core.os.version);
					}
				}
			break;
	}
}

function buildOSFileErrorString(aMethod, aOSFileError) { // rev3 - https://gist.github.com/Noitidart/a67dc6c83ae79aeffe5e3123d42d8f65
	// aMethod:string - enum[writeAtomic]

	var rez;
	aMethod = aMethod.toLowerCase();

	switch (aMethod) {
		case 'writeatomic':
				var explain;
				if (aOSFileError.becauseNoSuchFile) {
					explain = formatStringFromName('osfileerror_writeatomic_nosuchfile', 'main');
				} else {
					explain = formatStringFromName('osfileerror_unnamedreason', 'main');
				}
				rez = formatStringFromName('osfileerror_' + aMethod, 'main', [explain, aOSFileError.winLastError || aOSFileError.unixErrno])
			break;
	}

	return rez;
}

// https://gist.github.com/Noitidart/7810121036595cdc735de2936a7952da -rev1
function writeThenDir(aPlatPath, aContents, aDirFrom, aOptions={}) {
	// tries to writeAtomic
	// if it fails due to dirs not existing, it creates the dir
	// then writes again
	// if fail again for whatever reason it throws

	var cOptionsDefaults = {
		encoding: 'utf-8',
		noOverwrite: false
		// tmpPath: aPlatPath + '.tmp'
	};

	aOptions = Object.assign(cOptionsDefaults, aOptions);

	var do_write = function() {
		OS.File.writeAtomic(aPlatPath, aContents, aOptions); // doing unixMode:0o4777 here doesn't work, i have to `OS.File.setPermissions(path_toFile, {unixMode:0o4777})` after the file is made
	};

	try {
		do_write();
	} catch (OSFileError) {
		if (OSFileError.becauseNoSuchFile) { // this happens when directories dont exist to it
			OS.File.makeDir(OS.Path.dirname(aPlatPath), {from:aDirFrom});
			do_write(); // if it fails this time it will throw outloud
		} else {
			throw OSFileError;
		}
	}

}
// end - common worker functions
