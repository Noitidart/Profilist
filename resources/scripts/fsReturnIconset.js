/*start - chrome stuff*/
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;;
Cu.import('resource://gre/modules/devtools/Console.jsm');

if (!Ci.nsIDOMFileReader) {
	Cu.importGlobalProperties(['FileReader']);
}

// Globals
const core = {
	addon: {
		id: 'Profilist@jetpack',
		path: {
			name: 'profilist',
		},
		cache_key: Math.random() // set to version on release
	}
};
var gCFMM;
const NS_HTML = 'http://www.w3.org/1999/xhtml';

// start - functionalities
var imgPathData = {}; //keys are image path, and value is object holding data

var bootstrapCallbacks = {
	loadImg: function(aProvidedPath, aLoadPath) {
		// aProvidedPath must be file uri, or chrome path, or http NOT os path
		console.log('in loadImg');
		
		var deferredMain_loadImg = new Deferred();
		
		if (aProvidedPath in imgPathData) {
			console.log('aProvidedPath is already loaded in imgPathData so dont reload it');
			deferredMain_drawScaled.resolve(imgPathData[aProvidedPath]);
			return deferredMain_drawScaled.promise;
		}
		
		imgPathData[aProvidedPath] = {};
		
		imgPathData[aProvidedPath].Image = new content.Image();
		
		imgPathData[aProvidedPath].Image.onload = function() {
			// imgPathData[aProvidedPath].Canvas = content.document.createElementNS(NS_HTML, 'canvas')
			// imgPathData[aProvidedPath].Ctx = imgPathData[aProvidedPath].Canvas.getContext('2d');
			imgPathData[aProvidedPath].w = this.naturalWidth;
			imgPathData[aProvidedPath].h = this.naturalHeight;
			imgPathData[aProvidedPath].status = 'img-ok';
			deferredMain_loadImg.resolve([{
				status: 'img-ok',
				w: imgPathData[aProvidedPath].w,
				h: imgPathData[aProvidedPath].h
			}]);
		};
		
		imgPathData[aProvidedPath].Image.onabort = function() {
			imgPathData[aProvidedPath].status = 'img-abort';
			deferredMain_loadImg.resolve([{
				status: 'img-abort'
			}]);
		};
		
		imgPathData[aProvidedPath].Image.onerror = function() {
			imgPathData[aProvidedPath].status = 'img-error';
			deferredMain_loadImg.resolve([{
				status: 'img-error'
			}]);
		};
		
		imgPathData[aProvidedPath].Image.src = aLoadPath;
		
		return deferredMain_loadImg.promise;
	},
	drawScaled: function(aProvidedPath, aDrawAtSize) {
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
			imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can = content.document.createElement('canvas');
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
			var reader = Ci.nsIDOMFileReader ? Cc['@mozilla.org/files/filereader;1'].createInstance(Ci.nsIDOMFileReader) : new FileReader();
			reader.onloadend = function() {
				// reader.result contains the ArrayBuffer.
				deferredMain_drawScaled.resolve([{
					status: 'ok',
					arrbuf: reader.result
				}]);
			};
			reader.onabort = function() {
				deferredMain_drawScaled.resolve([{
					status: 'fail',
					reason: 'Abortion on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"'
				}]);
			};
			reader.onerror = function() {
				deferredMain_drawScaled.resolve([{
					status: 'fail',
					reason: 'Error on nsIDOMFileReader, failed reading blob of provided path: "' + aProvidedPath + '"'
				}]);
			};
			reader.readAsArrayBuffer(blob);
		}, 'image/png');
		
		return deferredMain_drawScaled.promise;
	},
	drawScaled_optBuf_optOverlapOptScaled_buf: function(aProvidedPath, aDrawAtSize, optBuf, optOverlapObj) {
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
			deferredMain_dSoBoOOSb.resolve([{
				status: 'fail',
				reason: 'devusre asking for optBuf but they arent overlapping, so this is redudant, as optBuf will be same as final buf'
			}]);
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
				imgPathData[aProvidedPath].scaleds[aDrawAtSize].Can = content.document.createElement('canvas');
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
						deferredMain_dSoBoOOSb.resolve([{
							status: 'fail',
							reason: aReason
						}]);
					}
				).catch(
					function(aCaught) {
						var rejObj = {name:'deferred_optBuf', aCaught:aCaught};
						console.error('Caught - deferred_optBuf - ', rejObj);
						// deferred_createProfile.reject(rejObj);
						deferredMain_dSoBoOOSb.resolve([{
							status: 'fail',
							aCaught: aCaught
						}]);
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
					deferredMain_dSoBoOOSb.resolve([rezObj]);
					// end - do stuff here - deferred_finalBuf
				},
				function(aReason) {
					var rejObj = {name:'deferred_finalBuf', aReason:aReason};
					console.warn('Rejected - deferred_finalBuf - ', rejObj);
					// deferred_createProfile.reject(rejObj);
					deferredMain_dSoBoOOSb.resolve([{
						status: 'fail',
						reason: aReason
					}]);
				}
			).catch(
				function(aCaught) {
					var rejObj = {name:'deferred_finalBuf', aCaught:aCaught};
					console.error('Caught - deferred_finalBuf - ', rejObj);
					// deferred_createProfile.reject(rejObj);
					deferredMain_dSoBoOOSb.resolve([{
						status: 'fail',
						aCaught: aCaught
					}]);
				}
			);
		};

		step1();
		//////
		
		return deferredMain_dSoBoOOSb.promise;
	},
	getImgDatasOfFinals: function(reqObj) {
		var rezObj = {}; // key is output size, value is image data arrbuf
		for (var i=0; i<reqObj.length; i++) {
			var providedImgPath = reqObj[i].aProvidedPath;
			var outputSize = reqObj[i].aOutputSize;
			rezObj[outputSize] = imgPathData[providedImgPath].scaleds[outputSize].Can.getContext('2d').getImageData(0, 0, outputSize, outputSize).data.buffer;
		}
		return [rezObj];
	}
};

		
function blobCb(aProvidedPath, aDeferred_blobCb, blob) {
	// gets arrbuf
	
	var reader = Ci.nsIDOMFileReader ? Cc['@mozilla.org/files/filereader;1'].createInstance(Ci.nsIDOMFileReader) : new FileReader();
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

// start - common helper functions
function contentMMFromContentWindow_Method2(aContentWindow) {
	if (!gCFMM) {
		gCFMM = aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIDocShell)
							  .QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIContentFrameMessageManager);
	}
	return gCFMM;

}

function Deferred() {
	try {
		/* A method to resolve the associated Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} value : This value is used to resolve the promise
		 * If the value is a Promise then the associated promise assumes the state
		 * of Promise passed as value.
		 */
		this.resolve = null;

		/* A method to reject the assocaited Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} reason: The reason for the rejection of the Promise.
		 * Generally its an Error object. If however a Promise is passed, then the Promise
		 * itself will be the reason for rejection no matter the state of the Promise.
		 */
		this.reject = null;

		/* A newly created Pomise object.
		 * Initially in pending state.
		 */
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

// end - common helper functions

// start - comm layer with server
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap; // todo: figure out how to get global scope here, as bootstrap is undefined
	aCallbackScope[thisCallbackId] = function(aMessageReceivedArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageReceivedArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}
var bootstrapMsgListener = {
	funcScope: bootstrapCallbacks,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.log('framescript getting aMsgEvent, unevaled:', uneval(aMsgEventData));
		// aMsgEvent.data should be an array, with first item being the unfction name in this.funcScope
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_fs_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_fs_call must be an array or promise that resolves with an array
				if (rez_fs_call.constructor.name == 'Promise') {
					rez_fs_call.then(
						function(aVal) {
							// aVal must be an array
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, rez_fs_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
contentMMFromContentWindow_Method2(content).addMessageListener(core.addon.id, bootstrapMsgListener);
// end - comm layer with server

// start - load unload stuff
function fsUnloaded() {
	// framescript on unload
	console.log('fsReturnIconset.js framworker unloading');
	contentMMFromContentWindow_Method2(content).removeMessageListener(core.addon.id, bootstrapMsgListener); // framescript comm

}
function onPageReady(aEvent) {
	var aContentWindow = aEvent.target.defaultView;
	console.info('domcontentloaded time:', (new Date().getTime() - timeStart1.getTime()));
	console.log('fsReturnIconset.js page ready, content.location:', content.location.href, 'aContentWindow.location:', aContentWindow.location.href);
	contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, ['frameworkerReady']);
}

addEventListener('unload', fsUnloaded, false);
var timeStart1 = new Date();
if (content.location.href == 'chrome://profilist/content/content_remote/frameworker.htm') {
	console.log('no need for DOMContentLoaded event, as current location is already of frameworker.htm:', content.location.href);
	onPageReady({target:{defaultView:content}});
} else {
	addEventListener('DOMContentLoaded', onPageReady, false);
	console.log('added DOMContentLoaded event, as frameworker.htm not yet loaded, current location is:', content.location.href);
}
// end - load unload stuff