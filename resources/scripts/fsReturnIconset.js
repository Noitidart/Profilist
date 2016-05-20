var timeStart1 = new Date();

// start - functionalities
var imgPathData = {}; //keys are image path, and value is object holding data

// var bootstrapCallbacks = {
	function loadImg(aArg, aComm) {
		var {aProvidedPath, aLoadPath} = aArg;
		// aProvidedPath must be file uri, or chrome path, or http NOT os path
		console.log('in loadImg');
		
		var deferredMain_loadImg = new Deferred();
		
		if (aProvidedPath in imgPathData) {
			console.log('aProvidedPath is already loaded in imgPathData so dont reload it');
			deferredMain_drawScaled.resolve(imgPathData[aProvidedPath]);
			return deferredMain_drawScaled.promise;
		}
		
		imgPathData[aProvidedPath] = {};
		
		imgPathData[aProvidedPath].Image = new Image();
		
		imgPathData[aProvidedPath].Image.onload = function() {
			// imgPathData[aProvidedPath].Canvas = document.createElementNS(NS_HTML, 'canvas')
			// imgPathData[aProvidedPath].Ctx = imgPathData[aProvidedPath].Canvas.getContext('2d');
			imgPathData[aProvidedPath].w = this.naturalWidth;
			imgPathData[aProvidedPath].h = this.naturalHeight;
			imgPathData[aProvidedPath].status = 'img-ok';
			deferredMain_loadImg.resolve({
				status: 'img-ok',
				w: imgPathData[aProvidedPath].w,
				h: imgPathData[aProvidedPath].h
			});
		};
		
		imgPathData[aProvidedPath].Image.onabort = function() {
			imgPathData[aProvidedPath].status = 'img-abort';
			deferredMain_loadImg.resolve({
				status: 'img-abort'
			});
		};
		
		imgPathData[aProvidedPath].Image.onerror = function() {
			imgPathData[aProvidedPath].status = 'img-error';
			deferredMain_loadImg.resolve({
				status: 'img-error'
			});
		};
		
		imgPathData[aProvidedPath].Image.src = aLoadPath;
		
		return deferredMain_loadImg.promise;
	}
	function drawScaled(aArg, aComm) {
		var {aProvidedPath, aDrawAtSize} = aArg;
		// aProvidedPath is one of keys in imgPathData, so its devuser provided path
		// must be square obiouvsly, i am assuming it is
		// aDrawAtSize is what the width and height will be set to
		// a canvas is created, and and saved in this object
		console.error('in drawScaled, arguments:', aProvidedPath, aDrawAtSize);
		var deferredMain_drawScaled = new Deferred();
		
		if (!('scaleds' in imgPathData[aProvidedPath])) {
			imgPathData[aProvidedPath].scaleds = {};
		}
		
		if (!(aDrawAtSize in imgPathData[aProvidedPath].scaleds)) {
			imgPathData[aProvidedPath].scaleds[aDrawAtSize] = {};
			imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can = document.createElement('canvas');
			var Ctx = imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.getContext('2d');
			
			imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.width = aDrawAtSize;
			imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.height = aDrawAtSize;
			
			if (aDrawAtSize == imgPathData[aProvidedPath].w) {
				Ctx.drawImage(imgPathData[aProvidedPath].Image, 0, 0)
			} else {
				Ctx.drawImage(imgPathData[aProvidedPath].Image, 0, 0, aDrawAtSize, aDrawAtSize);
			}
		}
		
		(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlobHD || imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlob).call(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can, function(blob) {
			var reader = new FileReader();
			reader.onloadend = function() {
				// reader.result contains the ArrayBuffer.
				deferredMain_drawScaled.resolve(new aComm.CallbackTransferReturn({
					status: 'ok',
					arrbuf: reader.result
				}, [reader.result]));
			};
			reader.onabort = function() {
				deferredMain_drawScaled.resolve({
					status: 'fail',
					reason: 'Abortion on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"'
				});
			};
			reader.onerror = function() {
				deferredMain_drawScaled.resolve({
					status: 'fail',
					reason: 'Error on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"'
				});
			};
			reader.readAsArrayBuffer(blob);
		}, 'image/png');
		
		return deferredMain_drawScaled.promise;
	}
	function drawScaled_optBuf_optOverlapOptScaled_buf(aArg, aComm) {
		var {aProvidedPath, aDrawAtSize, optBuf, optOverlapObj} = aArg;
		// this method will polute the imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can with the overlap // link165151
		
		// aProvidedPath
		// aDrawAtSize - size to draw aProvidedImgPath at. this will also be the canvas size
		// optBuf - after drawing scaled aProvidedImgPath then optionally get non-overlaped buf. set to true. only obyed if optOverlapProvidedImgPath is set, else throws
		// optOverlapObj - {
		//  	aProvidedPath
		//  	aDrawAtX
		//  	aDrawAtY
		//  	aDrawAtSize
		//  }
		var deferredMain_dSoBoOOSb = new Deferred();
		
		if (optBuf && !optOverlapObj) {
			deferredMain_dSoBoOOSb.resolve({
				status: 'fail',
				reason: 'devusre asking for optBuf but they arent overlapping, so this is redudant, as optBuf will be same as final buf'
			});
			return deferredMain_dSoBoOOSb.promise;
		}
		
		// globals for steps
		var rezObj = {};
		var Ctx;
		
		//////
		var step1 = function() {
			console.error('step1');
			// check if imgPathData has (it will be canvas if it has it) size of aDrawAtSize else create it
			if (!('scaleds' in imgPathData[aProvidedPath])) {
				imgPathData[aProvidedPath].scaleds = {};
			}
			
			if (!(aDrawAtSize in imgPathData[aProvidedPath].scaleds)) {
				imgPathData[aProvidedPath].scaleds[aDrawAtSize] = {};
				imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can = document.createElement('canvas');
				Ctx = imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.getContext('2d');
				
				imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.width = aDrawAtSize;
				imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.height = aDrawAtSize;
				
				if (aDrawAtSize == imgPathData[aProvidedPath].w) {
					Ctx.drawImage(imgPathData[aProvidedPath].Image, 0, 0)
				} else {
					Ctx.drawImage(imgPathData[aProvidedPath].Image, 0, 0, aDrawAtSize, aDrawAtSize);
				}
			} else {
				Ctx = imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.getContext('2d');
			}
			step2();
		};
		
		var step2 = function() {
			console.error('step2');
			// optBuf
			if (optBuf) {
				var deferred_optBuf = new Deferred();
				(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlobHD || imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlob).call(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can, blobCb.bind(null, aProvidedPath, deferred_optBuf), 'image/png');
				deferred_optBuf.promise.then(
					function(aVal) {
						console.log('Fullfilled - deferred_optBuf - ', aVal);
						// start - do stuff here - deferred_optBuf
						rezObj.optBuf = aVal;
						step3();
						// end - do stuff here - deferred_optBuf
					},
					function(aReason) {
						var rejObj = {name:'deferred_optBuf', aReason:aReason};
						console.warn('Rejected - deferred_optBuf - ', rejObj);
						// deferred_createProfile.reject(rejObj);
						deferredMain_dSoBoOOSb.resolve({
							status: 'fail',
							reason: aReason
						});
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'deferred_optBuf', aCaught:aCaught};
						console.error('Caught - deferred_optBuf - ', rejObj);
						// deferred_createProfile.reject(rejObj);
						deferredMain_dSoBoOOSb.resolve({
							status: 'fail',
							aCaught: aCaught
						});
					}
				);
			} else {
				step3();
			}
		};
		
		var step3 = function() {
			console.error('step3');
			// overlap
			if (optOverlapObj) {
				// check of optOverlapObj.aProvidedPath at optOverlapObj.aDrawAtSize exists, else draw it to the current canvas at that size
				if (imgPathData[optOverlapObj.aProvidedPath].scaleds && optOverlapObj.aDrawAtSize in imgPathData[optOverlapObj.aProvidedPath].scaleds) {
					Ctx.drawImage(imgPathData[optOverlapObj.aProvidedPath].scaleds[optOverlapObj.aDrawAtSize].Can, optOverlapObj.aDrawAtX, optOverlapObj.aDrawAtY); // pollution link165151
				} else {
					Ctx.drawImage(imgPathData[optOverlapObj.aProvidedPath].Image, optOverlapObj.aDrawAtX, optOverlapObj.aDrawAtY, optOverlapObj.aDrawAtSize, optOverlapObj.aDrawAtSize); // pollution link165151
				}
				step4();
			} else {
				step4();
			}
		};
		
		var step4 = function() {
			console.error('step4');
			// final buf
			var deferred_finalBuf = new Deferred();
			(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlobHD || imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can.toBlob).call(imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can, blobCb.bind(null, aProvidedPath, deferred_finalBuf), 'image/png');
			deferred_finalBuf.promise.then(
				function(aVal) {
					console.log('Fullfilled - deferred_finalBuf - ', aVal);
					// start - do stuff here - deferred_finalBuf
					rezObj.finalBuf = aVal;
					rezObj.status = 'ok';
					deferredMain_dSoBoOOSb.resolve(new aComm.CallbackTransferReturn(rezObj, [rezObj.finalBuf]));
					// end - do stuff here - deferred_finalBuf
				},
				function(aReason) {
					var rejObj = {name:'deferred_finalBuf', aReason:aReason};
					console.warn('Rejected - deferred_finalBuf - ', rejObj);
					// deferred_createProfile.reject(rejObj);
					deferredMain_dSoBoOOSb.resolve({
						status: 'fail',
						reason: aReason
					});
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'deferred_finalBuf', aCaught:aCaught};
					console.error('Caught - deferred_finalBuf - ', rejObj);
					// deferred_createProfile.reject(rejObj);
					deferredMain_dSoBoOOSb.resolve({
						status: 'fail',
						aCaught: aCaught
					});
				}
			);
		};

		step1();
		//////
		
		return deferredMain_dSoBoOOSb.promise;
	}
	function getImgDatasOfFinals(reqObj, aComm) {
		var rezObj = {}; // key is output size, value is image data arrbuf
		var transfers = [];
		for (var i=0; i<reqObj.length; i++) {
			var providedImgPath = reqObj[i].aProvidedPath;
			var outputSize = reqObj[i].aOutputSize;
			rezObj[outputSize] = imgPathData[providedImgPath].scaleds[outputSize].Can.getContext('2d').getImageData(0, 0, outputSize, outputSize).data.buffer;
			transfers.push(rezObj[outputSize]);
		}
		return new aComm.CallbackTransferReturn(rezObj, transfers);
	}
// };

		
function blobCb(aProvidedPath, aDeferred_blobCb, blob) {
	// gets arrbuf
	
	var reader = new FileReader();
	reader.onloadend = function() {
		// reader.result contains the ArrayBuffer.
		aDeferred_blobCb.resolve(reader.result);
	};
	reader.onabort = function() {
		aDeferred_blobCb.reject('Abortion on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"');
	};
	reader.onerror = function() {
		aDeferred_blobCb.reject('Error on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"');
	};
	reader.readAsArrayBuffer(blob);
}
// end - functionalities

// end - common helper functions

// start - load unload stuff
function onPageReady(aEvent) {
	var aContentWindow = aEvent.target.defaultView;
	console.info('domcontentloaded time:', (new Date().getTime() - timeStart1));
	console.log('fsReturnIconset.js page ready, window.location:', window.location.href, 'aContentWindow.location:', aContentWindow.location.href);
}
var gBsComm = new msgchanComm(); // handshake doesnt happen till after DOMContentLoaded so i dont need to use onPageReady. this is becaseu aBrowser.addEventListener for DOMContentLoaded see cross-file-link381743613524242
var gId;

function initFw(aId) {
	// will not fire till after onPageReady because i dont register msgchanComm till onPageReady
	gId = aId;
	gBsComm.postMessage('fsReturnIconsetReady', {
		id: aId
	});
}

window.addEventListener('DOMContentLoaded', onPageReady, false);
// end - load unload stuff

// start - common helper functions
function Deferred() {
	try {
		this.resolve = null;
		this.reject = null;
		this.promise = new Promise(function(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
		Object.freeze(this);
	} catch (ex) {
		console.log('Promise not available!', ex);
		throw new Error('Promise not available!');
	}
}

function genericReject(aPromiseName, aPromiseToReject, aReason) {
	var rejObj = {
		name: aPromiseName,
		aReason: aReason
	};
	console.error('Rejected - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}
function genericCatch(aPromiseName, aPromiseToReject, aCaught) {
	var rejObj = {
		name: aPromiseName,
		aCaught: aCaught
	};
	console.error('Caught - ' + aPromiseName + ' - ', rejObj);
	if (aPromiseToReject) {
		aPromiseToReject.reject(rejObj);
	}
}

function msgchanComm(onHandshakeComplete) {
	// cross-file-link0048958576532536411 - this is the contentWindow/html side msgchanComm
	
	// onHandshakeComplete is triggerd when handshake completed and this.postMessage becomes usable
	var handshakeComplete = false; // indicates this.postMessage will now work
	
	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers
	};
	
	this.listener = function(e) {
		var payload = e.data;
		console.log('incoming msgchan to window, payload:', payload, 'e:', e, 'this:', this);
		
		if (payload.method) {
			if (!(payload.method in window)) { console.error('method of "' + payload.method + '" not in WINDOW'); throw new Error('method of "' + payload.method + '" not in WINDOW') } // dev line remove on prod
			var rez_win_call = window[payload.method](payload.arg, this);
			console.log('rez_win_call:', rez_win_call);
			if (payload.cbid) {
				if (rez_win_call && rez_win_call.constructor.name == 'Promise') {
					rez_win_call.then(
						function(aVal) {
							console.log('Fullfilled - rez_win_call - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_win_call', 0)
					).catch(genericCatch.bind(null, 'rez_win_call', 0));
				} else {
					console.log('calling postMessage for callback with rez_win_call:', rez_win_call);
					this.postMessage(payload.cbid, rez_win_call);
				}
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			throw new Error('invalid combination');
		}
	}.bind(this);
	
	this.nextcbid = 1; //next callback id
	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {
		
		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling
		if (aArg && aArg.constructor == this.CallbackTransferReturn) {
			// aTransfers is undefined - this is the assumption as i use it prorgramtic
			// i needed to create CallbackTransferReturn so that callbacks can transfer data back
			aTransfers = aArg.xfer;
			aArg = aArg.arg;
		}
		var cbid = null;
		if (typeof(aMethod) == 'number') {
			// this is a response to a callack waiting in framescript
			cbid = aMethod;
			aMethod = null;
		} else {
			if (aCallback) {
				cbid = this.nextcbid++;
				this.callbackReceptacle[cbid] = aCallback;
			}
		}
		
		// return;
		port.postMessage({
			method: aMethod,
			arg: aArg,
			cbid
		}, aTransfers ? aTransfers : undefined);
	};
	
	this.callbackReceptacle = {};
	
	var port;
	
	var winMsgListener = function(e) {
		var data = e.data;
		console.log('incoming message to HTML, data:', data, 'source:', e.source, 'ports:', e.ports);
		switch (data.topic) {
			case 'msgchanComm_handshake':
				
					window.removeEventListener('message', winMsgListener, false);
					port = data.port2;
					port.onmessage = this.listener;
					this.postMessage('msgchanComm_handshake_finalized');
					handshakeComplete = true;
					if (onHandshakeComplete) {
						onHandshakeComplete(true);
					}
					
				break;
			default:
				console.error('unknown topic to HTML, data:', data);
		}
	}.bind(this);
	window.addEventListener('message', winMsgListener, false);

}