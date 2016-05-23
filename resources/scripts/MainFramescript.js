const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);
Cu.import('resource://gre/modules/Services.jsm');

var core = {
	addon: {
		id: 'Profilist@jetpack'
	}
};
console.error('this:', this);
var gCFMM = this;
var gMainComm;

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
var gBootstrapComms = [];
function bootstrapComm_unregAll() {
	var l = gBootstrapComms.length;
	for (var i=0; i<l; i++) {
		gBootstrapComms[i].unregister();
	}
}
var bootstrapMethods = {
	// methods called by bootstrap
	UNINIT_FRAMESCRIPT: function() { // link4757484773732
		uninit();
	},
	callInContent: function(aArg) {
		var {method, arg, wait} = aArg;
		// wait - bool - set to true if you want to wait for response from content, and then return it to bootstrap

		if (!gWinComm) {
			console.warn('no currently connected window');
			return 'no currently connected window';
		}
		var cWinCommCb = undefined;
		var rez = undefined;
		if (wait) {
			var deferred_callInContent = new Deferred();

			cWinCommCb = function(aVal) {
				deferred_callInContent.resolve(aVal);
			};

			rez = deferred_callInContent.promise;
		}
		gWinComm.postMessage(method, arg, undefined, cWinCommCb); // :todo: design a way so it can transfer to content. for sure though the info that comes here from bootstap is copied. but from here to content i should transfer if possible
		return rez;
	}
};
function bootstrapComm(aChannelID) {
	// framescript side of bootstrap-framescript comm layer cross-file-link55565665464644
	this.id = aChannelID;
	gBootstrapComms.push(this);

	this.unregister = function() {
		removeMessageListener(this.id, this.listener);

		var l = gBootstrapComms.length;
		for (var i=0; i<l; i++) {
			if (gBootstrapComms[i] == this) {
				gBootstrapComms.splice(i, 1);
				break;
			}
		}
	};
	this.listener = {
		receiveMessage: function(e) {
			var payload = e.data;
			console.log('incoming message to framescript, payload:', payload);
			// console.log('this in receiveMessage framescript:', this);

			if (payload.method) {
				if (!(payload.method in bootstrapMethods)) { console.error('method of "' + payload.method + '" not in BOOTSTRAPMETHODS'); throw new Error('method of "' + payload.method + '" not in BOOTSTRAPMETHODS') } // dev line remove on prod
				var rez_fs_call = bootstrapMethods[payload.method](payload.arg, this);
				console.log('rez_fs_call:', rez_fs_call);
				if (payload.cbid) {
					if (rez_fs_call && rez_fs_call.constructor.name == 'Promise') {
						rez_fs_call.then(
							function(aVal) {
								console.log('Fullfilled - rez_fs_call - ', aVal);
								this.transcribeMessage(payload.cbid, aVal);
							}.bind(this),
							genericReject.bind(null, 'rez_fs_call', 0)
						).catch(genericCatch.bind(null, 'rez_fs_call', 0));
					} else {
						console.log('calling transcribeMessage for callback with rez_fs_call:', rez_fs_call);
						this.transcribeMessage(payload.cbid, rez_fs_call);
					}
				}
			} else if (!payload.method && payload.cbid) {
				// its a cbid
				this.callbackReceptacle[payload.cbid](payload.arg, this);
				delete this.callbackReceptacle[payload.cbid];
			} else {
				throw new Error('invalid combination');
			}
		}.bind(this)
	};
	this.nextcbid = 1; //next callback id
	this.transcribeMessage = function(aMethod, aArg, aCallback) {
		// console.log('framescript sending message to bootstrap', aMethod, aArg);

		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling
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
		gCFMM.sendAsyncMessage(this.id, {
			method: aMethod,
			arg: aArg,
			cbid
		});
	};
	this.callbackReceptacle = {};

	addMessageListener(this.id, this.listener);
}


var gWinComm;  // works with gFsComm in content

// start - msgChanComm module
var contentMethods = {
	// methods called by content (gFsComm from content)
	callInBootstrap: function(aArg, aComm) {
		var {method, arg, wait} = aArg;
		// wait - bool - set to true if you want value returned to content // cross-file-link11192911

		var rez;
		var cbResolver = undefined;

		if (wait) {
			var deferred_callInBootstrap = new Deferred();
			cbResolver = function(aArg, aComm) {
				console.log('callInBootstrap transcribe complete, aArg:', aArg);
				deferred_callInBootstrap.resolve(aArg);
			}
			rez = deferred_callInBootstrap.promise;
		}
		gMainComm.transcribeMessage(method, arg, cbResolver);

		return rez;
	}
};
function msgchanComm(aContentWindow) {
	var portWorker = new Worker(core.addon.path.scripts + 'msgchanWorker.js');

	this.listener = function(e) {
		var payload = e.data;
		console.log('incoming msgchan to framescript, payload:', payload, 'e:', e);

		if (payload.method) {
			if (!(payload.method in contentMethods)) { console.error('method of "' + payload.method + '" not in CONTENTMETHODS'); throw new Error('method of "' + payload.method + '" not in CONTENTMETHODS') } // dev line remove on prod
			var rez_fs_call_for_win = contentMethods[payload.method](payload.arg, this);
			console.log('rez_fs_call_for_win:', rez_fs_call_for_win);
			if (payload.cbid) {
				if (rez_fs_call_for_win && rez_fs_call_for_win.constructor.name == 'Promise') {
					rez_fs_call_for_win.then(
						function(aVal) {
							console.log('Fullfilled - rez_fs_call_for_win - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_fs_call_for_win', 0)
					).catch(genericCatch.bind(null, 'rez_fs_call_for_win', 0));
				} else {
					console.log('calling postMessage for callback with rez_fs_call_for_win:', rez_fs_call_for_win, 'this:', this);
					this.postMessage(payload.cbid, rez_fs_call_for_win);
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

	portWorker.onmessage = function(e) {
		portWorker.terminate();
		var port = e.data.port1;
		var port2 = e.data.port2;
		console.log('port:', port, 'port2:', port2);


		this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {

			// aMethod is a string - the method to call in framescript
			// aCallback is a function - optional - it will be triggered when aMethod is done calling
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
			this.port.postMessage({
				method: aMethod,
				arg: aArg,
				cbid
			}, aTransfers ? [aTransfers] : undefined);
		}

		this.port = port;
		port.onmessage = this.listener;
		this.callbackReceptacle = {};

		aContentWindow.postMessage({
			topic: 'msgchanComm_handshake',
			port2: port2
		}, '*', [port2]);

	}.bind(this);

}
// end - msgChanComm module

// start - pageLoader
var pageLoader = {
	// start - devuser editable
	IGNORE_FRAMES: true,
	IGNORE_LOAD: true,
	IGNORE_NONMATCH: false,
	matches: function(aHREF, aLocation) {
		// do your tests on aHREF, which is aLocation.href.toLowerCase(), return true if it matches
		return (aHREF.indexOf('about:profilist') === 0);
	},
	ready: function(aContentWindow) {
		// triggered on page ready
		// triggered for each frame if IGNORE_FRAMES is false
		// to test if frame do `if (aContentWindow.frameElement)`

		var contentWindow = aContentWindow;
		console.log('reallyReady enter');

		// contentWindow.wrappedJSObject.sendAsyncMessageWithCallback = sendAsyncMessageWithCallback;
		// var waivedWindow = Components.utils.waiveXrays(contentWindow);
		// Cu.exportFunction(gMainComm.transcribeMessage, contentWindow, {
			// defineAs: 'transcribeMessage'
		// });

		// contentWindow.postMessage({
			// test: true
		// }, '*')
		gWinComm = new msgchanComm(contentWindow);

		console.log('reallyReady done');
	},
	load: function(aContentWindow) {}, // triggered on page load if IGNORE_LOAD is false
	error: function(aContentWindow, aDocURI) {
		// triggered when page fails to load due to error
		console.warn('hostname page ready, but an error page loaded, so like offline or something, aHref:', aContentWindow.location.href, 'aDocURI:', aDocURI);
	},
	readyNonmatch: function(aContentWindow) {
		gWinComm = null;
	},
	loadNonmatch: function(aContentWindow) {},
	errorNonmatch: function(aContentWindow, aDocURI) {
		gWinComm = null;
	},
	// not yet supported
	// timeout: function(aContentWindow) {
	// 	// triggered on timeout
	// },
	// timeoutNonmatch: function(aContentWindow) {
	// 	// triggered on timeout
	// },
	// end - devuser editable
	// start - BOILERLATE - DO NOT EDIT
	register: function() {
		// DO NOT EDIT - boilerplate
		addEventListener('DOMContentLoaded', pageLoader.onPageReady, false);
	},
	unregister: function() {
		// DO NOT EDIT - boilerplate
		removeEventListener('DOMContentLoaded', pageLoader.onPageReady, false);
	},
	onPageReady: function(e) {
		// DO NOT EDIT
		// boilerpate triggered on DOMContentLoaded
		// frames are skipped if IGNORE_FRAMES is true

		var contentWindow = e.target.defaultView;
		console.log('page ready, contentWindow.location.href:', contentWindow.location.href);

		// i can skip frames, as DOMContentLoaded is triggered on frames too
		if (pageLoader.IGNORE_FRAMES && contentWindow.frameElement) { return }

		var href = contentWindow.location.href.toLowerCase();
		if (pageLoader.matches(href, contentWindow.location)) {
			// ok its our intended, lets make sure its not an error page
			var webNav = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
			var docURI = webNav.document.documentURI;
			// console.info('docURI:', docURI);

			if (docURI.indexOf('about:neterror') === 0) {
				pageLoader.error(contentWindow, docURI);
			} else {
				// our page ready without error

				if (!pageLoader.IGNORE_LOAD) {
					// i can attach the load listener here, and remove it on trigger of it, because for sure after this point the load will fire
					contentWindow.addEventListener('load', pageLoader.onPageLoad, false);
				}

				pageLoader.ready(contentWindow);
			}
		} else {
			if (!this.IGNORE_NONMATCH) {
				console.log('page ready, but its not match:', uneval(contentWindow.location));
				var webNav = contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
				var docURI = webNav.document.documentURI;
				// console.info('docURI:', docURI);

				if (docURI.indexOf('about:neterror') === 0) {
					pageLoader.errorNonmatch(contentWindow, docURI);
				} else {
					// our page ready without error

					if (!pageLoader.IGNORE_LOAD) {
						// i can attach the load listener here, and remove it on trigger of it, because for sure after this point the load will fire
						contentWindow.addEventListener('load', pageLoader.onPageLoadNonmatch, false);
					}

					pageLoader.readyNonmatch(contentWindow);
				}
			}
		}
	},
	onPageLoad: function(e) {
		// DO NOT EDIT
		// boilerplate triggered on load if IGNORE_LOAD is false
		var contentWindow = e.target.defaultView;
		contentWindow.removeEventListener('load', pageLoader.onPageLoad, false);
		pageLoader.load(contentWindow);
	},
	onPageLoadNonmatch: function(e) {
		// DO NOT EDIT
		// boilerplate triggered on load if IGNORE_LOAD is false
		var contentWindow = e.target.defaultView;
		contentWindow.removeEventListener('load', pageLoader.onPageLoadNonmatch, false);
		pageLoader.loadNonmatch(contentWindow);
	}
	// end - BOILERLATE - DO NOT EDIT
};
// end - pageLoader

function init() {
	gMainComm = new bootstrapComm(core.addon.id);

	gMainComm.transcribeMessage('fetchCore', null, function(aCore, aComm) {
		core = aCore;
		console.log('ok updated core to:', core);

		addEventListener('unload', uninit, false);

		pageLoader.register(); // pageLoader boilerpate

		try {
			initAndRegisterAboutProfilist();
		} catch(ignore) {} // its non-e10s so it will throw saying already registered
	});
}

function uninit() { // link4757484773732
	// an issue with this unload is that framescripts are left over, i want to destory them eventually
	if (aboutFactory_profilist) {
		aboutFactory_profilist.unregister();
	}
	removeEventListener('unload', uninit, false);

	pageLoader.unregister(); // pageLoader boilerpate

	bootstrapComm_unregAll();
}
init();


// start - common helper functions
function Deferred() {
	this.resolve = null;
	this.reject = null;
	this.promise = new Promise(function(resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));
	Object.freeze(this);
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

// end - common helper functions
