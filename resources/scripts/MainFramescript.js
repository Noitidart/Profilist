const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);
Cu.import('resource://gre/modules/Services.jsm');

var core = {
	addon: {
		id: 'Profilist@jetpack'
	}
};

// start - about module
var aboutFactory_profilist;
function AboutProfilist() {}

function initAndRegisterAboutProfilist() {
	// init it
	AboutProfilist.prototype = Object.freeze({
		classDescription: core.addon.l10n.bootstrap['about-page-class-description'],
		contractID: '@mozilla.org/network/protocol/about;1?what=profilist',
		classID: Components.ID('{f7b6f390-a0c2-11e5-a837-0800200c9a66}'),
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

		getURIFlags: function(aURI) {
			return Ci.nsIAboutModule.ALLOW_SCRIPT | Ci.nsIAboutModule.URI_MUST_LOAD_IN_CHILD;
		},

		newChannel: function(aURI, aSecurity_or_aLoadInfo) {
			var redirUrl;
			if (aURI.path.toLowerCase().indexOf('?html') > -1) {
				redirUrl = core.addon.path.pages + 'html.xhtml';
			} else {
				redirUrl = core.addon.path.pages + 'cp.xhtml';
			}
			
			var channel;
			if (Services.vc.compare(core.firefox.version, '47.*') > 0) {
				var redirURI = Services.io.newURI(redirUrl, null, null);
				channel = Services.io.newChannelFromURIWithLoadInfo(redirURI, aSecurity_or_aLoadInfo);
			} else {
				console.error('doing old way');
				channel = Services.io.newChannel(redirUrl, null, null);
			}
			channel.originalURI = aURI;
			
			return channel;
		}
	});
	
	// register it
	aboutFactory_profilist = new AboutFactory(AboutProfilist);
}

function AboutFactory(component) {
	this.createInstance = function(outer, iid) {
		if (outer) {
			throw Cr.NS_ERROR_NO_AGGREGATION;
		}
		return new component();
	};
	this.register = function() {
		Cm.registerFactory(component.prototype.classID, component.prototype.classDescription, component.prototype.contractID, this);
	};
	this.unregister = function() {
		Cm.unregisterFactory(component.prototype.classID, this);
	}
	Object.freeze(this);
	this.register();
}
// end - about module
// start - server/framescript comm layer
// sendAsyncMessageWithCallback - rev3
var bootstrapCallbacks = { // can use whatever, but by default it uses this
	pushIniObj: function(aIniObj, aDoTbbEnterAnim) {
		content.bootstrapCallbacks.pushIniObj(aIniObj, aDoTbbEnterAnim);
	},
	testConnUpdate: function(newContent) {
		content.bootstrapCallbacks.testConnUpdate(newContent);
	},
	destroySelf: function() {
		removeEventListener('unload', unload, false);
		removeEventListener('DOMContentLoaded', onPageReady, false);
	}
};
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
var gCFMM = this;
function sendAsyncMessageWithCallback(aMessageArr, aCallback) {
	var aMessageManager = gCFMM;
	var aGroupId = core.addon.id;
	var aCallbackScope = bootstrapMsgListener.funcScope;
	
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap; // :todo: figure out how to get global scope here, as bootstrap is undefined
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
		// console.log('framescript getting aMsgEvent, unevaled:', uneval(aMsgEventData));
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
							this.sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							this.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							this.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					this.sendAsyncMessage(core.addon.id, [callbackPendingId, rez_fs_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
this.addMessageListener(core.addon.id, bootstrapMsgListener);
// end - server/framescript comm layer

function init() {
	sendAsyncMessageWithCallback(['fetchCore'], function(aObj) {
		core = aObj.core;
		addEventListener('unload', unload, false);
		addEventListener('DOMContentLoaded', onPageReady, false);
		try {
			initAndRegisterAboutProfilist();
		} catch(ignore) {} // its non-e10s so it will throw saying already registered
	});
}

function unload() {
	// an issue with this unload is that framescripts are left over, i want to destory them eventually
	aboutFactory_profilist.unregister();
}


function onPageReady(aEvent) {
	var aContentWindow = aEvent.target.defaultView;
	console.log('MainFramescript.js page ready, aContentWindow.location.href:', aContentWindow.location.href);
	doOnReady(aContentWindow);
}

function doOnReady(aContentWindow) {

	if (aContentWindow.frameElement) {
		// console.warn('frame element DOMContentLoaded, so dont respond yet:', aContentWindow.location.href);
		return;
	} else {
		// parent window loaded (not frame)
		if (aContentWindow.location.href.toLowerCase().indexOf('about:profilist') === 0) {
			// ok twitter page ready, lets make sure its not an error page
			// check if got error loading page:
			var webnav = aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
			var docuri = webnav.document.documentURI;
			// console.info('docuri:', docuri);
			if (docuri.indexOf('about:') === 0 && docuri.indexOf('about:profilist') !== 0) {
				// twitter didnt really load, it was an error page
				console.log('about:profilist hostname page ready, but an error page loaded, so like offline or something:', aContentWindow.location.href, 'docuri:', docuri);
				// unregReason = 'error-loading';
				return;
			} else {
				// twitter actually loaded
				// twitterReady = true;
				console.log('ok about:profilist page ready, lets ensure page loaded finished');
				reallyReady(aContentWindow);
				// ensureLoaded(aContentWindow); // :note: commented out as not needing content script right now
			}
		} else {
			console.log('page ready, but its not about:profilist so do nothing:', uneval(aContentWindow.location));
			return;
		}
	}
}

function idedSendAsyncMessage(aPayload) {
	this.sendAsyncMessage(core.addon.id, aPayload);
}

function reallyReady(aContentWindow) {
	console.log('reallyReady enter');
	// aContentWindow.wrappedJSObject.sendAsyncMessageWithCallback = sendAsyncMessageWithCallback;
	// var waivedWindow = Components.utils.waiveXrays(aContentWindow);
	Cu.exportFunction(sendAsyncMessageWithCallback, aContentWindow, {
		defineAs: 'sendAsyncMessageWithCallback'
	});
	
	Cu.exportFunction(idedSendAsyncMessage, aContentWindow, {
		defineAs: 'sendAsyncMessage'
	})
	console.log('reallyReady done');
}

init();