// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
const PromiseWorker = Cu.import('resource://gre/modules/PromiseWorker.jsm').BasePromiseWorker;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
var core = {
	addon: {
		name: 'Profilist',
		id: 'Profilist@jetpack',
		path: {
			name: 'profilist',
			//
			content: 'chrome://profilist/content/',
			locale: 'chrome://profilist/locale/',
			content_remote: 'chrome://profilist/content/content_remote/',
			//
			modules: 'chrome://profilist/content/modules/',
			workers: 'chrome://profilist/content/modules/workers/',
			//
			resources: 'chrome://profilist/content/resources/',
			images: 'chrome://profilist/content/resources/images/',
			scripts: 'chrome://profilist/content/resources/scripts/',
			styles: 'chrome://profilist/content/resources/styles/',
			fonts: 'chrome://profilist/content/resources/styles/fonts/',
			pages: 'chrome://profilist/content/resources/pages/'
		},
		cache_key: Math.random() // set to version on release
	},
	os: {
		name: OS.Constants.Sys.Name.toLowerCase(),
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		prefs: {}
	}
};

const JETPACK_DIR_BASENAME = 'jetpack';
const OSPath_simpleStorage = OS.Path.join(OS.Constants.Path.profileDir, JETPACK_DIR_BASENAME, core.addon.id, 'simple-storage');
const OSPath_config = OS.Path.join(OSPath_simpleStorage, 'config.json');
const myPrefBranch = 'extensions.' + core.addon.id + '.';

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

var bootstrap = this;
var BOOTSTRAP = this;
var ADDON_MANAGER_ENTRY;

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });

// START - Addon Functionalities	
// start - about module
var aboutFactory_profilist;
function AboutProfilist() {}

function initAndRegisterAboutProfilist() {
	// init it
	AboutProfilist.prototype = Object.freeze({
		classDescription: myServices.sb.GetStringFromName('about-page-class-description'),
		contractID: '@mozilla.org/network/protocol/about;1?what=profilist',
		classID: Components.ID('{f7b6f390-a0c2-11e5-a837-0800200c9a66}'),
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

		getURIFlags: function(aURI) {
			return Ci.nsIAboutModule.ALLOW_SCRIPT | Ci.nsIAboutModule.URI_CAN_LOAD_IN_CHILD;
		},

		newChannel: function(aURI, aSecurity) {

			// var channel = Services.io.newChannel(core.addon.path.pages + 'cp.xhtml', null, null);
			var channel;
			if (aURI.path.toLowerCase().indexOf('?html') > -1) {
				channel = Services.io.newChannel(core.addon.path.pages + 'html.xhtml', null, null);
			} else {
				channel = Services.io.newChannel(core.addon.path.pages + 'cp.xhtml', null, null);
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

// Start - Launching profile and other profile functionality
var MainWorkerMainThreadFuncs = {
	createIcon: function(aCreateType, aCreateName, aCreatePathDir, aBaseSrcImgPathArr, aOutputSizesArr, aOptions) {
		console.log('in createIcon in MainWorkerMainThreadFuncs, arguments:', arguments);
		// return ['hi arr 1']; // :note: this is how to return no promise
		// :note: this is how to return with promise
		var deferredMain_createIcon = new Deferred();
		
		// deferredMain_createIcon.resolve(['hi arr 1 from promise']);
		var triggerCreation = function() {
			console.log('in triggerCreation');
			ICGenWorker.postMessageWithCallback(['returnIconset', aCreateType, aCreateName, aCreatePathDir, aBaseSrcImgPathArr, aOutputSizesArr, aOptions], function(aStatusObj) {
				console.log('returnIconset completed, aStatusObj:', aStatusObj);
				deferredMain_createIcon.resolve([aStatusObj]);
			});
		};
		
		if (typeof(ICGenWorker) == 'undefined') {
			console.log('sicing icgenworker');
			var promise_getICGenWorker = SICWorker('ICGenWorker', core.addon.path.modules + 'ICGenWorker/worker.js?' + core.addon.cache_key, ICGenWorkerFuncs);
			promise_getICGenWorker.then(
				function(aVal) {
					console.log('Fullfilled - promise_getICGenWorker - ', aVal);
					triggerCreation();
				},
				genericReject.bind(null, 'promise_getICGenWorker', deferredMain_createIcon)
			).catch(genericReject.bind(null, 'promise_getICGenWorker', deferredMain_createIcon));
		} else {
			triggerCreation();
		}
		
		
		return deferredMain_createIcon.promise;
	},
	showNotification: function(aTitle, aBody) {
		myServices.as.showAlertNotification(core.addon.path.content + 'icon.png', aTitle, aBody, false, null, null, 'Profilist');
	},
	registerWorkerWindowListener: function() {
		gWorkerWindowListener = workerWindowListenerRegister();
	},
	setPref: function(aPrefName, aPrefVal) {
		// aPrefName - string like "taskbar.grouping.useprofile"
		// aPrefVal - new value
		
		switch (typeof(aPrefVal)) {
			case 'string':
					
					Services.prefs.setCharPref(aPrefName, aPrefVal);
					
				break;
			case 'number':
					
					Services.prefs.setIntPref(aPrefName, aPrefVal);
					
				break;
			case 'boolean':
					
					Services.prefs.setBoolPref(aPrefName, aPrefVal);
					
				break;
			default:
				console.error('invalid type!!!!');
		}
	}
};
// End - Launching profile and other profile functionality

function setupMainWorkerCustomErrors() {
	// Define a custom error prototype.
	function MainWorkerError(name, msg) {
		this.msg = msg;
		this.name = name;
	}
	MainWorkerError.fromMsg = function(aErrParams) {
		return new MainWorkerError(aErrParams.name, aErrParams.msg);
	};

	// Register a constructor.
	MainWorker.ExceptionHandlers['MainWorkerError'] = MainWorkerError.fromMsg;
}

// start - icon generator stuff
var ICGenWorkerFuncs = { // functions for worker to call in main thread
	loadImagePathsAndSendBackBytedata: function(aImagePathArr, aWorkerCallbackFulfill, aWorkerCallbackReject) {
		// aImagePathArr is an arrya of os paths to the images to load
		// this will load the images, then draw to canvas, then get get image data, then get array buffer/Bytedata for each image, and transfer object back it to the worker
	},
	fwInstances: {}, // frameworker instances, obj with id is aId which is arg of setupFrameworker
	setupFrameworker: function(aId) {
		// aId is the id to create frameworker with
		console.log('mainthread: setupFrameworker, aId:', aId);

		var deferredMain_setupFrameworker = new Deferred();
		
		var aWindow = Services.wm.getMostRecentWindow('navigator:browser');
		var aDocument = aWindow.document;
		
		var doAfterAppShellDomWinReady = function() {
			var aBrowser = aDocument.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'browser');
			aBrowser.setAttribute('data-icon-container-generator-fwinstance-id', aId);
			if (core.os.mname != 'darwin') {
				aBrowser.setAttribute('remote', 'true');
			}
			// aBrowser.setAttribute('disablesecurity', true);
			// aBrowser.setAttribute('disablehistory', 'true');
			aBrowser.setAttribute('type', 'content');
			// aBrowser.setAttribute('style', 'height:100px;border:10px solid steelblue;');
			aBrowser.setAttribute('style', 'display:none;');
			// aBrowser.setAttribute('src', 'data:text/html,back to content');
			aBrowser.setAttribute('src', core.addon.path.content_remote + 'frameworker.htm');
			
			ICGenWorkerFuncs.fwInstances[aId] = {
				browser: aBrowser,
				deferredMain_setupFrameworker: deferredMain_setupFrameworker
			};
			
			aDocument.documentElement.appendChild(aBrowser);
			console.log('aBrowser.messageManager:', aBrowser.messageManager);
			aBrowser.messageManager.loadFrameScript(core.addon.path.scripts + 'fsReturnIconset.js?' + core.addon.cache_key, false);			
			
			// ICGenWorkerFuncs.fwInstances[aId].browser.messageManager.IconContainerGenerator_id = aId; // doesnt work
			// console.log('ICGenWorkerFuncs.fwInstances[aId].browser.messageManager:', ICGenWorkerFuncs.fwInstances[aId].browser.messageManager);
			
		};
		
		
		if (aDocument.readyState == 'complete') {
			doAfterAppShellDomWinReady();
		} else {
			aWindow.addEventListener('load', function() {
				aWindow.removeEventListener('load', arguments.callee, false);
				doAfterAppShellDomWinReady();
			}, false);
		}
		
		return deferredMain_setupFrameworker.promise;
	},
	destroyFrameworker: function(aId) {
		
		// var aTimer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
		// aTimer.initWithCallback({
			// notify: function() {
					console.log('will now destory remote browser, i hope this will trigger the framescript unload event, because that removes the listener, otherwise i think that the attached message listener from that framescript stays alive somehow');
					ICGenWorkerFuncs.fwInstances[aId].browser.parentNode.removeChild(ICGenWorkerFuncs.fwInstances[aId].browser); // im hoping this triggers the unload event on framescript
					delete ICGenWorkerFuncs.fwInstances[aId];
			// }
		// }, 10000, Ci.nsITimer.TYPE_ONE_SHOT);
		

	},
	tellFrameworkerLoadImg: function(aProvidedPath, aLoadPath, aId) {
		var deferredMain_tellFrameworkerLoadImg = new Deferred();
		sendAsyncMessageWithCallback(ICGenWorkerFuncs.fwInstances[aId].browser.messageManager, core.addon.id, ['loadImg', aProvidedPath, aLoadPath], fsMsgListener.funcScope, function(aImgDataObj) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			deferredMain_tellFrameworkerLoadImg.resolve([aImgDataObj]);
		});
		return deferredMain_tellFrameworkerLoadImg.promise;
	},
	tellFrameworkerDrawScaled: function(aImgPath, aDrawAtSize, aId) {
		var deferredMain_tellFrameworkerDrawScaled = new Deferred();
		sendAsyncMessageWithCallback(ICGenWorkerFuncs.fwInstances[aId].browser.messageManager, core.addon.id, ['drawScaled', aImgPath, aDrawAtSize], fsMsgListener.funcScope, function(aImgDataObj) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			var resolveWithArr = [aImgDataObj];
			if (aImgDataObj.arrbuf) {
				resolveWithArr.push([aImgDataObj.arrbuf]);
				resolveWithArr.push(SIC_TRANS_WORD);
			}
			deferredMain_tellFrameworkerDrawScaled.resolve(resolveWithArr);		
		});
		return deferredMain_tellFrameworkerDrawScaled.promise;
	},
	tellFrameworker_dSoBoOOSb: function(aImgPath, aDrawAtSize, optBuf, optOverlapObj, aId) {
		var deferredMain_tellFrameworker_dSoBoOOSb = new Deferred();
		sendAsyncMessageWithCallback(ICGenWorkerFuncs.fwInstances[aId].browser.messageManager, core.addon.id, ['drawScaled_optBuf_optOverlapOptScaled_buf', aImgPath, aDrawAtSize, optBuf, optOverlapObj], fsMsgListener.funcScope, function(aImgDataObj) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			var resolveWithArr = [aImgDataObj];
			var bufTrans = [];
			if (aImgDataObj.optBuf) {
				bufTrans.push(aImgDataObj.optBuf);
			}
			if (aImgDataObj.finalBuf) {
				bufTrans.push(aImgDataObj.finalBuf);
			}
			if (aImgDataObj.optBuf || aImgDataObj.finalBuf) {
				resolveWithArr.push(bufTrans);
				resolveWithArr.push(SIC_TRANS_WORD);
			}
			deferredMain_tellFrameworker_dSoBoOOSb.resolve(resolveWithArr);	
		});
		return deferredMain_tellFrameworker_dSoBoOOSb.promise;
	},
	tellFrameworkerGetImgDatasOfFinals: function(reqObj, aId) {
		var deferredMain_tellFrameworker_gIDOF = new Deferred();
		sendAsyncMessageWithCallback(ICGenWorkerFuncs.fwInstances[aId].browser.messageManager, core.addon.id, ['getImgDatasOfFinals', reqObj], fsMsgListener.funcScope, function(aObjOfBufs) {
			
			var resolveWithArr = [aObjOfBufs, [], SIC_TRANS_WORD];
			for (var p in aObjOfBufs) {
				resolveWithArr[1].push(aObjOfBufs[p]);
			}
			console.log('in bootstrap callback of tellFrameworkerGetImgDatasOfFinals, resolving with:', resolveWithArr);

			deferredMain_tellFrameworker_gIDOF.resolve(resolveWithArr);	
		});
		return deferredMain_tellFrameworker_gIDOF.promise;
	}
};
// end - icon generator stuff

function windowListenerForPuiBtn() {

	var onclick = `
		(function() {
			var cntTabs = gBrowser.tabs.length;
			for (var i=0; i<cntTabs; i++) {
				// e10s safe way to check content of tab
				if (gBrowser.tabs[i].getAttribute('label') == 'Profilist') { // crossfile-link381787872 - i didnt link over there but &profilist.html.page-title; is what this is equal do
					gBrowser.selectedTab = gBrowser.tabs[i];
					return;
				}
			}
			var newProfilistTab = gBrowser.loadOneTab(\'about:profilist?html\', {inBackground:false});
			gBrowser.pinTab(newProfilistTab);
			gBrowser.moveTabToStart(newProfilistTab)
		})();
	`;
	// console.log('onclick:', onclick);
	var profilistHBoxJSON = ['xul:toolbarbutton', {id:'PanelUI-profilist-box', label:myServices.sb.GetStringFromName('moved'), image:core.addon.path.images + 'icon16.png', onclick:onclick}]

	var xulCssUri = Services.io.newURI(core.addon.path.styles + 'xul.css', null, null);
	
	var getPUIMembers = function(aDOMWindow) {
		// returns null if DNE or the object
		var PUI = aDOMWindow.PanelUI;
		if (!PUI) {
			return {
				PUI: null,
				PUIp: null,
				PUIf: null
			}
		}
		
		var PUIp;
		if (!PUI._initialized) {
			PUIp = aDOMWindow.document.getElementById('PanelUI-popup'); // have to do it this way, doing PanelUI.panel does getElementById anyways so this is no pref loss
		} else {
			PUIp = PUI.panel; // PanelUI-popup
		}

		// console.log('PUI.mainView:', PUI.mainView, PUI.mainView.childNodes);
		var PUIf = PUI.mainView ? PUI.mainView.childNodes[1] : null; // PanelUI-footer // aDOMWindow.PanelUI.mainView.childNodes == NodeList [ <vbox#PanelUI-contents-scroller>, <footer#PanelUI-footer> ]
		
		return {
			PUI: PUI,
			PUIp: PUIp,
			PUIf: PUIf
		};
	};
	
	var insertProfilistBox = function(e) {
		var aDOMWindow = e.view;
		
		var {PUI, PUIp, PUIf} = getPUIMembers(aDOMWindow);
		if (!PUI) { return null }
		
		PUIp.removeEventListener('popupshowing', insertProfilistBox, false);
		PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, {}), PUIf.firstChild);
	};
	
	var loadIntoWindow = function(aDOMWindow) {
		if (!aDOMWindow) { return }
		
		var {PUI, PUIp, PUIf} = getPUIMembers(aDOMWindow);
		if (!PUI) { return }
		
		var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		domWinUtils.loadSheet(xulCssUri, domWinUtils.AUTHOR_SHEET); 
		
		if (PUIp.state == 'open' || PUIp.state == 'showing') {
			insertProfilistBox({view:aDOMWindow});
		} else {
			PUIp.addEventListener('popupshowing', insertProfilistBox, false);
		}
		
	};
	
	var unloadFromWindow = function(aDOMWindow) {
		if (!aDOMWindow) { return }
		
		var {PUI, PUIp, PUIf} = getPUIMembers(aDOMWindow);
		if (!PUI) { return }
		
		var PUIprofilist = aDOMWindow.document.getElementById('PanelUI-profilist-box');
		if (PUIprofilist) {
			PUIprofilist.parentNode.removeChild(PUIprofilist);
			console.error('ok removed it');
		} else {
			PUIp.removeEventListener('popupshowing', insertProfilistBox, false);
			console.error('ok removed listener');
		}
		
		var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		domWinUtils.removeSheet(xulCssUri, domWinUtils.AUTHOR_SHEET); 
		
	};
	
	var windowListener = {
		//DO NOT EDIT HERE
		onOpenWindow: function (aXULWindow) {
			// Wait for the window to finish loading
			var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			aDOMWindow.addEventListener('load', function () {
				aDOMWindow.removeEventListener('load', arguments.callee, false);
				loadIntoWindow(aDOMWindow);
			}, false);
		},
		onCloseWindow: function (aXULWindow) {},
		onWindowTitleChange: function (aXULWindow, aNewTitle) {}
		//END - DO NOT EDIT HERE
	};
	
	var register = function() {
		
		// Load into any existing windows
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	};
	
	var unregister = function() {
		// Unload from any existing windows
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	};
	
	register();
	
	return unregister;
}

var gWorkerWindowListener;
function workerWindowListenerRegister() {
	// returns function - unregisterer
	
	var loadIntoWindow = function(aDOMWindow) {
		var promise_loadIntoWindow = MainWorker.post('loadIntoWindow', [getNativeHandlePtrStr(aDOMWindow)]);
		promise_loadIntoWindow.then(
			function(aVal) {
				console.log('Fullfilled - promise_loadIntoWindow - ', aVal);
				
			},
			genericReject.bind(null, 'promise_loadIntoWindow', 0)
		).catch(genericCatch.bind(null, 'promise_loadIntoWindow', 0));
	};
	
	var unloadFromWindow = function(aDOMWindow) {
		var promise_unloadFromWindow = MainWorker.post('unloadFromWindow', [getNativeHandlePtrStr(aDOMWindow)]);
		promise_unloadFromWindow.then(
			function(aVal) {
				console.log('Fullfilled - promise_unloadFromWindow - ', aVal);
				
			},
			genericReject.bind(null, 'promise_unloadFromWindow', 0)
		).catch(genericCatch.bind(null, 'promise_unloadFromWindow', 0));
	};
	
	var windowListener = {
		//DO NOT EDIT HERE
		onOpenWindow: function (aXULWindow) {
			// Wait for the window to finish loading
			var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			aDOMWindow.addEventListener('load', function () {
				aDOMWindow.removeEventListener('load', arguments.callee, false);
				loadIntoWindow(aDOMWindow);
			}, false);
		},
		onCloseWindow: function (aXULWindow) {},
		onWindowTitleChange: function (aXULWindow, aNewTitle) {}
		//END - DO NOT EDIT HERE
	};
	
	var register = function() {
		// Load into any existing windows
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			// if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				loadIntoWindow(aDOMWindow);
			// } else {
			// 	aDOMWindow.addEventListener('load', function () {
			// 		aDOMWindow.removeEventListener('load', arguments.callee, false);
			// 		loadIntoWindow(aDOMWindow);
			// 	}, false);
			// }
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	};
	
	var reLoadIntoWindows = function() {
		// Load into any existing windows
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			// if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				loadIntoWindow(aDOMWindow);
			// } else {
			// 	aDOMWindow.addEventListener('load', function () {
			// 		aDOMWindow.removeEventListener('load', arguments.callee, false);
			// 		loadIntoWindow(aDOMWindow);
			// 	}, false);
			// }
		}
	};
	
	var unregister = function() {
		// Unload from any existing windows
		var DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			var aDOMWindow = DOMWindows.getNext();
			unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	};
	
	register();
	
	return {
		unregister: unregister,
		reLoadIntoWindows: reLoadIntoWindows
	};
}

function install() {}

function uninstall(aData, aReason) {
	if (aReason == ADDON_UNINSTALL) {
		
	}
}

var gWindowListenerForPuiBtn;
function startup(aData, aReason) {
	// core.addon.aData = aData;
	extendCore();
	
	// custom core extending
	core.profilist = {};
	core.profilist.path = {
		defProfRt: Services.dirsvc.get('DefProfRt', Ci.nsIFile).path,
		defProfLRt: Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path,
		XREExeF: Services.dirsvc.get('XREExeF', Ci.nsIFile).path
	};
	
	// get pictures folder, used by iconsetpicker readSubdirsInDir
	try {
		core.profilist.path.pictures = Services.dirsvc.get('XDGPict', Ci.nsIFile).path; // works on linux
	} catch (ex) {
		try {
			core.profilist.path.pictures = Services.dirsvc.get('Pict', Ci.nsIFile).path; // works on windows
		} catch (ex) {
			try {
				core.profilist.path.pictures = Services.dirsvc.get('Pct', Ci.nsIFile).path; // works on mac
			} catch (ex) {
				core.profilist.path.pictures = OS.Constants.Path.desktopDir; // as a fall back
			}
		}
	}
	
	// get documents folder
	try {
		core.profilist.path.documents = Services.dirsvc.get('XDGDocs', Ci.nsIFile).path; // works on linux
	} catch (ex) {
		try {
			core.profilist.path.documents = Services.dirsvc.get('Docs', Ci.nsIFile).path; // works on windows
		} catch (ex) {
			try {
				core.profilist.path.documents = Services.dirsvc.get('UsrDocs', Ci.nsIFile).path; // works on mac
			} catch (ex) {
				core.profilist.path.documents = OS.Constants.Path.desktopDir; // as a fall back
			}
		}
	}
	
	core.profilist.path.downloads = Services.dirsvc.get('DfltDwnld', Ci.nsIFile).path;
	
	core.FileUtils = {
		PERMS_DIRECTORY: FileUtils.PERMS_DIRECTORY
	};
	core.firefox.channel = Services.prefs.getCharPref('app.update.channel'); // esr|release|beta|aurora|dev|nightly|default
	
	
	if (['winnt', 'wince', 'winmo'].indexOf(OS.Constants.Sys.Name.toLowerCase()) > -1) {
		try {
			core.firefox.prefs['taskbar.grouping.useprofile'] = Services.prefs.getBoolPref('taskbar.grouping.useprofile');
		} catch(err) {
			// probably doesnt exist, this is what throws when it doesnt exist
				// message:"Component returned failure code: 0x8000ffff (NS_ERROR_UNEXPECTED) [nsIPrefBranch.getBoolPref]"
				// name:"NS_ERROR_UNEXPECTED"
				// result:2147549183
			core.firefox.prefs['taskbar.grouping.useprofile'] = false;
		}
	}
	
	var afterWorker = function() { // because i init worker, then continue init
		// register about page
		initAndRegisterAboutProfilist();
		
		// register about pages listener
		Services.mm.addMessageListener(core.addon.id, fsMsgListener);
		
		// // bring in react
		// Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react.dev.js', bootstrap);
		// Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-dom.dev.js', bootstrap);
		// 
		// testReact();
		
		gWindowListenerForPuiBtn = windowListenerForPuiBtn();
		
		var promise_afterBootstrapInit = MainWorker.post('afterBootstrapInit', []);
		promise_afterBootstrapInit.then(
			function(aVal) {
				console.log('Fullfilled - promise_afterBootstrapInit - ', aVal);
				
			},
			genericReject.bind(null, 'promise_afterBootstrapInit', 0)
		).catch(genericCatch.bind(null, 'promise_afterBootstrapInit', 0));
	};
	
	/*
	// add to core the l10n properties
	var coreForMainWorker = JSON.parse(JSON.stringify(core));
	coreForMainWorker.l10n = {};
	coreForMainWorker.l10n.bootstrap = {};

	var l10ns = myServices.sb.getSimpleEnumeration();
	while (l10ns.hasMoreElements()) {
		var l10nProp = l10ns.getNext();
		var l10nPropEl = l10nProp.QueryInterface(Ci.nsIPropertyElement);
		// doing console.log(propEl) shows the object has some fields that interest us

		var l10nPropKey = l10nPropEl.key;
		var l10nPropStr = l10nPropEl.value;

		coreForMainWorker.l10n.bootstrap[l10nPropKey] = l10nPropStr;
	}
	*/
	
	// startup worker
	var promise_initMainWorker = SIPWorker('MainWorker', core.addon.path.workers + 'MainWorker.js', core, MainWorkerMainThreadFuncs).post();
	promise_initMainWorker.then(
		function(aVal) {
			console.log('Fullfilled - promise_initMainWorker - ', aVal);
			// start - do stuff here - promise_initMainWorker
			core = aVal;
			setupMainWorkerCustomErrors();
			afterWorker();
			// end - do stuff here - promise_initMainWorker
		},
		function(aReason) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aReason: aReason
			};
			console.warn('Rejected - promise_initMainWorker - ', rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aCaught: aCaught
			};
			console.error('Caught - promise_initMainWorker - ', rejObj);
		}
	);
	
}

function shutdown(aData, aReason) {
	
	if (aReason == APP_SHUTDOWN) { return }
	
	// an issue with this unload is that framescripts are left over, i want to destory them eventually
	aboutFactory_profilist.unregister();
	
	// unregister about pages listener
	Services.mm.removeMessageListener(core.addon.id, fsMsgListener);
	
	
	// unregister gPUIprUnreg
	if (gWindowListenerForPuiBtn) {
		gWindowListenerForPuiBtn();
	}
	
	if (gWorkerWindowListener) {
		gWorkerWindowListener.unregister();
	}
	
	// terminate worker
	if (typeof(MainWorker) != 'undefined') {
		var promise_prepForTerm = MainWorker.post('prepForTerminate', []);
		promise_prepForTerm.then(
			function(aVal) {
				console.log('Fullfilled - promise_prepForTerm - ', aVal);
				MainWorker._worker.terminate();
				console.log('mainworker terminated');
			},
			genericReject.bind(null, 'promise_prepForTerm', 0)
		).catch(genericReject.bind(null, 'promise_prepForTerm', 0));
	}
	
	if (typeof(ICGenWorker) != 'undefined') {
		ICGenWorker.terminate();
	}
}
// END - Addon Functionalities
// start - server/framescript comm layer
// functions for framescripts to call in main thread
var fsFuncs = { // can use whatever, but by default its setup to use this
	// fsReturnIconset.js functions
	frameworkerReady: function(aMsgEvent) {
		var aBrowser = aMsgEvent.target;
		console.info('fwInstancesId:', aBrowser);
		var fwInstancesId = aBrowser.getAttribute('data-icon-container-generator-fwinstance-id');
		console.info('fwInstancesId:', fwInstancesId);
		
		ICGenWorkerFuncs.fwInstances[fwInstancesId].deferredMain_setupFrameworker.resolve(['ok send me imgs now baby']);
	},
	// end - fsReturnIconset.js functions
	fetchCoreAndConfigs: function() {
		var deferredMain_fetchConfigObjs = new Deferred();
		
		console.log('sending over fetchCoreAndConfigs');
		
		var promise_fetch = MainWorker.post('fetchAll', []);
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchConfigObjs.resolve([aVal]);
				// end - do stuff here - promise_fetch
			}
		);
		
		return deferredMain_fetchConfigObjs.promise;
	},
	fetchJustIniObj: function() {
		// just gets gIniObj
		var deferredMain_fetchJustIniObj = new Deferred();
		
		var promise_fetch = MainWorker.post('fetchJustIniObj', []);
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchJustIniObj.resolve([aVal]);
				// end - do stuff here - promise_fetch
			}
		);
		
		return deferredMain_fetchJustIniObj.promise;
	},
	userManipulatedIniObj_updateIniFile: function(aNewIniObjStr) {
		var deferredMain_userManipulatedIniObj_updateIniFile = new Deferred();
		console.log('telling mainworker userManipulatedIniObj_updateIniFile');
		
		var promise_updateini = MainWorker.post('userManipulatedIniObj_updateIniFile', [aNewIniObjStr]);
		promise_updateini.then(
			function(aNewlyFormattedIniObj) {
				console.log('Fullfilled - promise_updateini - ', aNewlyFormattedIniObj);
				// start - do stuff here - promise_updateini
				deferredMain_userManipulatedIniObj_updateIniFile.resolve([aNewlyFormattedIniObj]);
				// end - do stuff here - promise_updateini
			}
		);
		
		return deferredMain_userManipulatedIniObj_updateIniFile.promise;
	},
	launchOrFocusProfile: function(aProfPath) {
		// launch profile - this will create launcher if it doesnt exist already
		var deferredMain_launchOrFocusProfile = new Deferred();
		var promise_launchfocus = MainWorker.post('launchOrFocusProfile', [aProfPath]);
		promise_launchfocus.then(
			function(aVal) {
				console.log('Fullfilled - promise_launchfocus - ', aVal);
				deferredMain_launchOrFocusProfile.resolve([aVal]);
			},
			genericReject.bind(null, 'promise_launchfocus', deferredMain_launchOrFocusProfile)
		).catch(genericReject.bind(null, 'promise_launchfocus', deferredMain_launchOrFocusProfile));
		
		return deferredMain_launchOrFocusProfile.promise;
	},
	createNewProfile: function(aNewProfName, aCloneProfPath, aNameIsPlatPath, aLaunchIt, aMsgEvent) {
		// aNewProfName - string for new profile that will be made. OR set to null to use preset name "Unnamed Profile ##"
		// aCloneProfPath - the path of the profile to clone. `null` if this is not a clone
		// aLaunchIt - set to false, if you want to just create. set to true if you want to create it then launch it soon after creation

		var promise_workerCreate = MainWorker.post('createNewProfile', [aNewProfName, aCloneProfPath, aNameIsPlatPath, aLaunchIt]);
		promise_workerCreate.then(
			function(aIniObj) {
				console.log('Fullfilled - promise_workerCreate - ', aIniObj);
				
				var aBrowser = aMsgEvent.target;
				aBrowser.messageManager.sendAsyncMessage(core.addon.id, ['pushIniObj', aIniObj, true]);
			},
			genericReject.bind(null, 'promise_workerCreate', 0)
		).catch(genericCatch.bind(null, 'promise_workerCreate', 0));

	},
	renameProfile: function(aProfPath, aNewProfName, aMsgEvent) {
		var promise_workerRename = MainWorker.post('renameProfile', [aProfPath, aNewProfName]);
		promise_workerRename.then(
			function(aVal) {
				console.log('Fullfilled - promise_workerRename - ', aVal);
				
			},
			function(aReason) {
				var rejObj = {
					name: 'promise_workerRename',
					aReason: aReason
				};
				console.error('Rejected - promise_workerRename - ', rejObj);
				// push aIniObj back to content, as it had premptively renamed
				var aBrowser = aMsgEvent.target;
				aBrowser.messageManager.sendAsyncMessage(core.addon.id, ['pushIniObj', aReason.msg.aIniObj]);
			}
		).catch(genericCatch.bind(null, 'promise_workerRename', 0));
	},
	deleteProfile: function(aProfPath, aMsgEvent) {
		var promise_workerDel = MainWorker.post('deleteProfile', [aProfPath]);
		promise_workerDel.then(
			function(aVal) {
				console.log('Fullfilled - promise_workerDel - ', aVal);
				
			},
			function(aReason) {
				var rejObj = {
					name: 'promise_workerDel',
					aReason: aReason
				};
				console.error('Rejected - promise_workerDel - ', rejObj);
				// push aIniObj back to content, as it had premptively deleted
				var aBrowser = aMsgEvent.target;
				aBrowser.messageManager.sendAsyncMessage(core.addon.id, ['pushIniObj', aReason.msg.aIniObj]);
			}
		).catch(genericCatch.bind(null, 'promise_workerDel', 0));
	},
	toggleDefaultProfile: function(aProfPath, aMsgEvent) {
		var promise_workerTogDefault = MainWorker.post('toggleDefaultProfile', [aProfPath]);
		promise_workerTogDefault.then(
			function(aVal) {
				console.log('Fullfilled - promise_workerTogDefault - ', aVal);
				
			},
			function(aReason) {
				var rejObj = {
					name: 'promise_workerTogDefault',
					aReason: aReason
				};
				console.error('Rejected - promise_workerTogDefault - ', rejObj);
				// push aIniObj back to content, as it had premptively toggled default 
				var aBrowser = aMsgEvent.target;
				aBrowser.messageManager.sendAsyncMessage(core.addon.id, ['pushIniObj', aReason.msg.aIniObj]);
			}
		).catch(genericCatch.bind(null, 'promise_workerTogDefault', 0));
	},
	createDesktopShortcut: function(aProfPath) {

		
		var deferredMain_createDesktopShortcut = new Deferred();
		
		gCreateDesktopShortcutId++;
		var thisCreateDesktopShortcutId = 'createDesktopShortcut_callback_' + gCreateDesktopShortcutId;
		MainWorkerMainThreadFuncs[thisCreateDesktopShortcutId] = function() {
			console.error('ok in mainthread callback for createDesktopShortcut');
			delete MainWorkerMainThreadFuncs[thisCreateDesktopShortcutId];
			deferredMain_createDesktopShortcut.resolve();
		};
		
		var promise_workerCreateDeskCut = MainWorker.post('createDesktopShortcut', [aProfPath, thisCreateDesktopShortcutId]);
		promise_workerCreateDeskCut.then(
			function(aVal) {
				console.log('Fullfilled - promise_workerCreateDeskCut - ', aVal);
				// dont do anything, as this calls in mainworker launchOrFocusProfile which does async stuff, that will call MainWorkerMainThreadFuncs[thisCreateDesktopShortcutId] when it finishes
			},
			genericReject.bind(null, 'promise_workerCreateDeskCut', 0)
		).catch(genericCatch.bind(null, 'promise_workerCreateDeskCut', 0));
		
		return deferredMain_createDesktopShortcut.promise;
	},
	browseExe: function() {

		var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
		
		var browseExeDialogTitle;
		
		switch (OS.Constants.Sys.Name.toLowerCase()) {
			case 'winnt':
			case 'wince':
			case 'winmo':
				
					browseExeDialogTitle = myServices.sb.GetStringFromName('browse-exe-win');
				
				break;
			case 'darwin':
				
					browseExeDialogTitle = myServices.sb.GetStringFromName('browse-exe-mac');
				
				break;
			default:
			
					// assume unix, it has no extension apparently
					browseExeDialogTitle = myServices.sb.GetStringFromName('browse-exe-nix');

		}
		
		fp.init(Services.wm.getMostRecentWindow(null), browseExeDialogTitle, Ci.nsIFilePicker.modeOpen);
		
		switch (OS.Constants.Sys.Name.toLowerCase()) {
			case 'winnt':
			case 'wince':
			case 'winmo':
				
					// fp.appendFilter('Firefox Executeable (application/exe)', 'firefoxg.exe');
					fp.appendFilter(myServices.sb.GetStringFromName('filter-exe-win'), 'firefox.exe');
					fp.displayDirectory = Services.dirsvc.get('XREExeF', Ci.nsIFile).parent;
					
				break;
			case 'darwin':
				
					// fp.appendFilter('Firefox Application Bundle', '*.app');
					fp.appendFilter(myServices.sb.GetStringFromName('filter-exe-mac'), '*.app');
					// fp.displayDirectory = Services.dirsvc.get('XREExeF', Ci.nsIFile).parent.parent.parent;
					fp.displayDirectory = (new FileUtils.File(core.profilist.path.XREExeF)).parent.parent.parent;
					// .parent = MacOs
					// .parent.parent = Contents
					// .parent.parent.parent = .app
					// .parent.parent.parent.parent = parent of .app
					
				break;
			default:
			
					// assume unix, it has no extension apparently
					// fp.appendFilter('Firefox Binary (application/x-sharedlib)', 'firefox');
					fp.appendFilter(myServices.sb.GetStringFromName('filter-exe-nix'), 'firefox');
					fp.displayDirectory = Services.dirsvc.get('XREExeF', Ci.nsIFile).parent;

		}

		var rv = fp.show();
		if (rv == Ci.nsIFilePicker.returnOK) {
			
			return [fp.file.path];

		}// else { // cancelled	}
		
		return [undefined]; // cancelled
	},
	// start - browse icon stuff
	gBIWin: null,
	gBIPanel: null,
	gBIDeferred: null,
	browseiconRequest: function() {
		// framescript messages fsFuncs, telling it wants to do a browse, so fsFuncs is entry point
		if (fsFuncs.gBIPanel) {
			throw new Error('browse icon dialog already there and in progress');
		}
		fsFuncs.gBIDeferred = new Deferred();
		
		fsFuncs.gBIWin = Services.wm.getMostRecentWindow('navigator:browser');
		fsFuncs.gBIPanel = fsFuncs.gBIWin.document.createElementNS(NS_XUL, 'panel');

		var props = {
			id: 'profilist-browseicon-panel',
			noautohide: false,
			noautofocus: false,
			level: 'parent',
			style: 'padding:0; margin:0; width:100px; height:100px; background-color:steelblue;',
			type: 'arrow'
		}
		for (var p in props) {
			fsFuncs.gBIPanel.setAttribute(p, props[p]);
		}

		var cIframe = fsFuncs.gBIWin.document.createElementNS(NS_XUL, 'iframe');
		cIframe.setAttribute('type', 'chrome');
		cIframe.setAttribute('src', core.addon.path.content_remote + 'browseicon.htm');
		fsFuncs.gBIPanel.appendChild(cIframe);
		
		fsFuncs.gBIWin.document.getElementById('mainPopupSet').appendChild(fsFuncs.gBIPanel);


		fsFuncs.gBIPanel.addEventListener('popuphiding', function () {
			fsFuncs.gBIPanel.parentNode.removeChild(fsFuncs.gBIPanel);
			console.log('fsFuncs:', fsFuncs);
			fsFuncs.biFinalize();
		}, false);
		
		return fsFuncs.gBIDeferred.promise;
	},
	biShow: function() {
		// after browseicon.htm loads it will call fsFuncs
		fsFuncs.gBIPanel.openPopup(fsFuncs.gBIWin.gBrowser, 'overlap', 10, 10);
	},
	biFinalize: function() {
		fsFuncs.gBIPanel = null;
		fsFuncs.gBIWin = null;
		fsFuncs.gBIDeferred = null;
	},
	biCancel: function() {
		fsFuncs.gBIDeferred.resolve(['cancel']);
		fsFuncs.gBIPanel.hide();
	},
	biAccept: function(aImgObj) {
		fsFuncs.gBIDeferred.resolve(['accept', aImgObj]);
		fsFuncs.gBIPanel.hide();
	},
	biInit: function() {
		var deferredMain_biInit = new Deferred();
		
		var promise_fetch = MainWorker.post('browseiconInit', []);
		promise_fetch.then(
			function(aObjs) {
				console.log('Fullfilled - promise_fetch - ', aObjs);
				// start - do stuff here - promise_fetch
				deferredMain_biInit.resolve([aObjs]);
				// end - do stuff here - promise_fetch
			}
		);
		
		return deferredMain_biInit.promise;		
	},
	// end - browse icon stuff
	// start - iconpicker set
	callInPromiseWorker: function(aArrOfFuncnameThenArgs) {
		// for use with sendAsyncMessageWithCallback from framescripts
		
		var mainDeferred_callInPromiseWorker = new Deferred();
		
		var rez_pwcall = MainWorker.post(aArrOfFuncnameThenArgs.shift(), aArrOfFuncnameThenArgs);
		rez_pwcall.then(
			function(aVal) {
				console.log('Fullfilled - rez_pwcall - ', aVal);
				if (Array.isArray(aVal)) {
					mainDeferred_callInPromiseWorker.resolve(aVal);
				} else {
					mainDeferred_callInPromiseWorker.resolve([aVal]);
				}
			},
			function(aReason) {
				var rejObj = {
					name: 'rez_pwcall',
					aReason: aReason
				};
				console.error('Rejected - rez_pwcall - ', rejObj);
				mainDeferred_callInPromiseWorker.resolve([rejObj]);
			}
		).catch(
			function(aCaught) {
				var rejObj = {
					name: 'rez_pwcall',
					aCaught: aCaught
				};
				console.error('Caught - rez_pwcall - ', rejObj);
				mainDeferred_callInPromiseWorkerr.resolve([rejObj]);
			}
		);
		
		return mainDeferred_callInPromiseWorker.promise;
	},
	// end - iconpicker set
	restartInSafemode: function() {
		// restarts self in safe mode
		var cancelQuit = Cc['@mozilla.org/supports-PRBool;1'].createInstance(Ci.nsISupportsPRBool);
		Services.obs.notifyObservers(cancelQuit, 'quit-application-requested', 'restart');
		if (!cancelQuit.data) {
			Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
		}
	}
};
var gCreateDesktopShortcutId = -1;
var fsMsgListener = {
	funcScope: fsFuncs,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.log('fsMsgListener getting aMsgEventData:', aMsgEventData, 'aMsgEvent:', aMsgEvent);
		// aMsgEvent.data should be an array, with first item being the unfction name in bootstrapCallbacks
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		aMsgEventData.push(aMsgEvent); // this is special for server side, so the function can do aMsgEvent.target.messageManager to send a response
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_parentscript_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_parentscript_call must be an array or promise that resolves with an array
				if (rez_parentscript_call.constructor.name == 'Promise') {
					rez_parentscript_call.then(
						function(aVal) {
							// aVal must be an array
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, rez_parentscript_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
// end - server/framescript comm layer
// start - common helper functions
function Deferred() { // rev3 - https://gist.github.com/Noitidart/326f1282c780e3cb7390
	// update 062115 for typeof
	if (typeof(Promise) != 'undefined' && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
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
	}
}

// var bootstrap = this; // needed for SIPWorker and SICWorker - rev8 // i put this in the top in globals section
const SIC_CB_PREFIX = '_a_gen_cb_';
const SIC_TRANS_WORD = '_a_gen_trans_';
var sic_last_cb_id = -1;
function SICWorker(workerScopeName, aPath, aFuncExecScope=bootstrap, aCore=core) {
	// creates a global variable in bootstrap named workerScopeName which will hold worker, do not set up a global for it like var Blah; as then this will think something exists there
	// aScope is the scope in which the functions are to be executed
	// ChromeWorker must listen to a message of 'init' and on success of it, it should sendMessage back saying aMsgEvent.data == {aTopic:'init', aReturn:true}
	// "Start and Initialize ChromeWorker" // based on SIPWorker
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`	
	var deferredMain_SICWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new ChromeWorker(aPath);
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var afterInitListener = function(aMsgEvent) {
			// note:all msgs from bootstrap must be postMessage([nameOfFuncInWorker, arg1, ...])
			var aMsgEventData = aMsgEvent.data;
			console.log('mainthread receiving message:', aMsgEventData);
			
			// postMessageWithCallback from worker to mt. so worker can setup callbacks after having mt do some work
			var callbackPendingId;
			if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SIC_CB_PREFIX) == 0) {
				callbackPendingId = aMsgEventData.pop();
			}
			
			var funcName = aMsgEventData.shift();
			
			if (funcName in aFuncExecScope) {
				var rez_mainthread_call = aFuncExecScope[funcName].apply(null, aMsgEventData);
				
				if (callbackPendingId) {
					if (rez_mainthread_call.constructor.name == 'Promise') {
						rez_mainthread_call.then(
							function(aVal) {
								if (aVal.length >= 2 && aVal[aVal.length-1] == SIC_TRANS_WORD && Array.isArray(aVal[aVal.length-2])) {
									// to transfer in callback, set last element in arr to SIC_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
									console.error('doing transferrrrr');
									aVal.pop();
									bootstrap[workerScopeName].postMessage([callbackPendingId, aVal], aVal.pop());
								} else {
									bootstrap[workerScopeName].postMessage([callbackPendingId, aVal]);
								}
							},
							function(aReason) {
								console.error('aReject:', aReason);
								bootstrap[workerScopeName].postMessage([callbackPendingId, ['promise_rejected', aReason]]);
							}
						).catch(
							function(aCatch) {
								console.error('aCatch:', aCatch);
								bootstrap[workerScopeName].postMessage([callbackPendingId, ['promise_rejected', aCatch]]);
							}
						);
					} else {
						// assume array
						if (rez_mainthread_call.length > 2 && rez_mainthread_call[rez_mainthread_call.length-1] == SIC_TRANS_WORD && Array.isArray(rez_mainthread_call[rez_mainthread_call.length-2])) {
							// to transfer in callback, set last element in arr to SIC_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
							rez_mainthread_call.pop();
							bootstrap[workerScopeName].postMessage([callbackPendingId, rez_mainthread_call], rez_mainthread_call.pop());
						} else {
							bootstrap[workerScopeName].postMessage([callbackPendingId, rez_mainthread_call]);
						}
					}
				}
			}
			else { console.warn('funcName', funcName, 'not in scope of aFuncExecScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out

		};
		
		var beforeInitListener = function(aMsgEvent) {
			// note:all msgs from bootstrap must be postMessage([nameOfFuncInWorker, arg1, ...])
			var aMsgEventData = aMsgEvent.data;
			if (aMsgEventData[0] == 'init') {
				bootstrap[workerScopeName].removeEventListener('message', beforeInitListener);
				bootstrap[workerScopeName].addEventListener('message', afterInitListener);
				deferredMain_SICWorker.resolve(true);
				if ('init' in aFuncExecScope) {
					aFuncExecScope[aMsgEventData.shift()].apply(null, aMsgEventData);
				}
			}
		};
		
		// var lastCallbackId = -1; // dont do this, in case multi SICWorker's are sharing the same aFuncExecScope so now using new Date().getTime() in its place // link8888881
		bootstrap[workerScopeName].postMessageWithCallback = function(aPostMessageArr, aCB, aPostMessageTransferList) {
			// lastCallbackId++; // link8888881
			sic_last_cb_id++;
			var thisCallbackId = SIC_CB_PREFIX + sic_last_cb_id; // + lastCallbackId; // link8888881
			aFuncExecScope[thisCallbackId] = function() {
				delete aFuncExecScope[thisCallbackId];
				// console.log('in mainthread callback trigger wrap, will apply aCB with these arguments:', arguments, 'turned into array:', Array.prototype.slice.call(arguments));
				aCB.apply(null, arguments[0]);
			};
			aPostMessageArr.push(thisCallbackId);
			// console.log('aPostMessageArr:', aPostMessageArr);
			bootstrap[workerScopeName].postMessage(aPostMessageArr, aPostMessageTransferList);
		};
		
		bootstrap[workerScopeName].addEventListener('message', beforeInitListener);
		bootstrap[workerScopeName].postMessage(['init', aCore]);
		
	} else {
		deferredMain_SICWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SICWorker.promise;
	
}

// SIPWorker - rev9 - https://gist.github.com/Noitidart/92e55a3f7761ed60f14c
const SIP_CB_PREFIX = '_a_gen_cb_';
const SIP_TRANS_WORD = '_a_gen_trans_';
var sip_last_cb_id = -1;
function SIPWorker(workerScopeName, aPath, aCore=core, aFuncExecScope=BOOTSTRAP) {
	// update 022016 - delayed init till first .post
	// update 010516 - allowing pomiseworker to execute functions in this scope, supply aFuncExecScope, else leave it undefined and it will not set this part up
	// update 122115 - init resolves the deferred with the value returned from Worker, rather then forcing it to resolve at true
	// "Start and Initialize PromiseWorker"
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`
	
	// :todo: add support and detection for regular ChromeWorker // maybe? cuz if i do then ill need to do ChromeWorker with callback
	
	// var deferredMain_SIPWorker = new Deferred();

	var cWorkerInited = false;
	var cWorkerPost_orig;
	
	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new PromiseWorker(aPath);
		
		cWorkerPost_orig = bootstrap[workerScopeName].post;
		
		bootstrap[workerScopeName].post = function(pFun, pArgs, pCosure, pTransfers) {
			if (!cWorkerInited) {
				var deferredMain_post = new Deferred();
				
				bootstrap[workerScopeName].post = cWorkerPost_orig;
				
				var doInit = function() {
					var promise_initWorker = bootstrap[workerScopeName].post('init', [aCore]);
					promise_initWorker.then(
						function(aVal) {
							console.log('Fullfilled - promise_initWorker - ', aVal);
							// start - do stuff here - promise_initWorker
							if (pFun) {
								doOrigPost();
							} else {
								// pFun is undefined, meaning devuser asked for instant init
								deferredMain_post.resolve(aVal);
							}
							// end - do stuff here - promise_initWorker
						},
						genericReject.bind(null, 'promise_initWorker', deferredMain_post)
					).catch(genericCatch.bind(null, 'promise_initWorker', deferredMain_post));
				};
				
				var doOrigPost = function() {
					var promise_origPosted = bootstrap[workerScopeName].post(pFun, pArgs, pCosure, pTransfers);
					promise_origPosted.then(
						function(aVal) {
							console.log('Fullfilled - promise_origPosted - ', aVal);
							deferredMain_post.resolve(aVal);
						},
						genericReject.bind(null, 'promise_origPosted', deferredMain_post)
					).catch(genericCatch.bind(null, 'promise_origPosted', deferredMain_post));
				};
				
				doInit();
				return deferredMain_post.promise;
			}
		};
		
		// start 010516 - allow worker to execute functions in bootstrap scope and get value
		if (aFuncExecScope) {
			// this triggers instantiation of the worker immediately
			var origOnmessage = bootstrap[workerScopeName]._worker.onmessage;
			var origOnerror = bootstrap[workerScopeName]._worker.onerror;
			
			bootstrap[workerScopeName]._worker.onerror = function(onErrorEvent) {
				// got an error that PromiseWorker did not know how to serialize. so we didnt get a {fail:.....} postMessage. so in onerror it does pop of the deferred. however with allowing promiseworker to return async, we cant simply pop if there are more then 1 promises pending
				var cQueue = bootstrap[workerScopeName]._queue._array;
				if (cQueue.length === 1) {
					// console.log('its fine for origOnerror it will just pop the only one there, which is the one to reject for sure as there are no other promises');
					// DO NOTE THOUGH - .onerror message might come in from any error, it is innate to worker to send this message on error, so it will pop out the promise early, so maybe i might run this origOnerror before the actual promise rejects due to catch
					origOnerror(onErrorEvent);
				} else {
					onErrorEvent.preventDefault(); // as they do this in origOnerror so i prevent here too
					console.error('queue has more then one promises in there, i dont know which one to reject', 'onErrorEvent:', onErrorEvent, 'queue:', bootstrap[workerScopeName]._queue._array);
				}
			};
			
			bootstrap[workerScopeName]._worker.onmessage = function(aMsgEvent) {
				////// start - my custom stuff
				var aMsgEventData = aMsgEvent.data;
				console.log('promiseworker receiving msg:', aMsgEventData);
				if (Array.isArray(aMsgEventData)) {
					// my custom stuff, PromiseWorker did self.postMessage to call a function from here
					console.log('promsieworker is trying to execute function in mainthread');
					
					var callbackPendingId;
					if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SIP_CB_PREFIX) == 0) {
						callbackPendingId = aMsgEventData.pop();
					}
					
					var funcName = aMsgEventData.shift();
					if (funcName in aFuncExecScope) {
						var rez_mainthread_call = aFuncExecScope[funcName].apply(null, aMsgEventData);
						
						if (callbackPendingId) {
							if (rez_mainthread_call.constructor.name == 'Promise') { // if get undefined here, that means i didnt return an array from the function in main thread that the worker called
								rez_mainthread_call.then(
									function(aVal) {
										if (aVal.length >= 2 && aVal[aVal.length-1] == SIP_TRANS_WORD && Array.isArray(aVal[aVal.length-2])) {
											// to transfer in callback, set last element in arr to SIP_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
											console.error('doing transferrrrr');
											aVal.pop();
											bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, aVal], aVal.pop());
										} else {
											bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, aVal]);
										}
									},
									function(aReason) {
										console.error('aReject:', aReason);
										bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, ['promise_rejected', aReason]]);
									}
								).catch(
									function(aCatch) {
										console.error('aCatch:', aCatch);
										bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, ['promise_rejected', aCatch]]);
									}
								);
							} else {
								// assume array
								if (rez_mainthread_call.length > 2 && rez_mainthread_call[rez_mainthread_call.length-1] == SIP_TRANS_WORD && Array.isArray(rez_mainthread_call[rez_mainthread_call.length-2])) {
									// to transfer in callback, set last element in arr to SIP_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
									rez_mainthread_call.pop();
									console.log('doiing traansfer');
									bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, rez_mainthread_call], rez_mainthread_call.pop());
								} else {
									bootstrap[workerScopeName]._worker.postMessage([callbackPendingId, rez_mainthread_call]);
								}
							}
						}
					}
					else { console.error('funcName', funcName, 'not in scope of aFuncExecScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
					////// end - my custom stuff
				} else {
					// find the entry in queue that matches this id, and move it to first position, otherwise i get the error `Internal error: expecting msg " + handler.id + ", " + " got " + data.id + ` --- this guy uses pop and otherwise might get the wrong id if i have multiple promises pending
					var cQueue = bootstrap[workerScopeName]._queue._array;
					var cQueueItemFound;
					for (var i=0; i<cQueue.length; i++) {
						if (cQueue[i].id == aMsgEvent.data.id) {
							cQueueItemFound = true;
							if (i !== 0) {
								// move it to first position
								var wasQueue = cQueue.slice(); // console.log('remove on production');
								cQueue.splice(0, 0, cQueue.splice(i, 1)[0]);
								console.log('ok moved q item from position', i, 'to position 0, this should fix that internal error, aMsgEvent.data.id:', aMsgEvent.data.id, 'queue is now:', cQueue, 'queue was:', wasQueue);
							}
							else { console.log('no need to reorder queue, the element of data.id:', aMsgEvent.data.id, 'is already in first position:', bootstrap[workerScopeName]._queue._array); }
							break;
						}
					}
					if (!cQueueItemFound) {
						console.error('errrrror: how on earth can it not find the item with this id in the queue? i dont throw here as the .pop will throw the internal error, aMsgEvent.data.id:', aMsgEvent.data.id, 'cQueue:', cQueue);
					}
					origOnmessage(aMsgEvent);
				}
			}
		}
		// end 010516 - allow worker to execute functions in bootstrap scope and get value
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
	} else {
		throw new Error('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	// return deferredMain_SIPWorker.promise;
	return bootstrap[workerScopeName];
	
}

function aReasonMax(aReason) {
	var deepestReason = aReason;
	while (deepestReason.hasOwnProperty('aReason') || deepestReason.hasOwnProperty()) {
		if (deepestReason.hasOwnProperty('aReason')) {
			deepestReason = deepestReason.aReason;
		} else if (deepestReason.hasOwnProperty('aCaught')) {
			deepestReason = deepestReason.aCaught;
		}
	}
	return deepestReason;
}

// sendAsyncMessageWithCallback - rev3
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap;
	aCallbackScope[thisCallbackId] = function(aMessageArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}


function extendCore() {
	// adds some properties i use to core based on the current operating system, it needs a switch, thats why i couldnt put it into the core obj at top
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;

			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);

			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
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
				// this makes it so that 10.10.0 becomes 10.100
				// 10.10.1 => 10.101
				// so can compare numerically, as 10.100 is less then 10.101
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
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

// not my modified version, this is straight from on 021616 - https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/DOM_Building_and_HTML_Insertion#JSON_Templating
jsonToDOM.namespaces = {
    html: "http://www.w3.org/1999/xhtml",
    xul: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
};
jsonToDOM.defaultNamespace = jsonToDOM.namespaces.html;
function jsonToDOM(jsonTemplate, doc, nodes) {
    function namespace(name) {
        var reElemNameParts = /^(?:(.*):)?(.*)$/.exec(name);
        return { namespace: jsonToDOM.namespaces[reElemNameParts[1]], shortName: reElemNameParts[2] };
    }

    // Note that 'elemNameOrArray' is: either the full element name (eg. [html:]div) or an array of elements in JSON notation
    function tag(elemNameOrArray, elemAttr) {
        // Array of elements?  Parse each one...
        if (Array.isArray(elemNameOrArray)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function(thisElem) {
                frag.appendChild(tag.apply(null, thisElem));
            });
            return frag;
        }

        // Single element? Parse element namespace prefix (if none exists, default to defaultNamespace), and create element
        var elemNs = namespace(elemNameOrArray);
        var elem = doc.createElementNS(elemNs.namespace || jsonToDOM.defaultNamespace, elemNs.shortName);

        // Set element's attributes and/or callback functions (eg. onclick)
        for (var key in elemAttr) {
            var val = elemAttr[key];
            if (nodes && key == "key") {
                nodes[val] = elem;
                continue;
            }

            var attrNs = namespace(key);
            if (typeof val == "function") {
                // Special case for function attributes; don't just add them as 'on...' attributes, but as events, using addEventListener
                elem.addEventListener(key.replace(/^on/, ""), val, false);
            }
            else {
                // Note that the default namespace for XML attributes is, and should be, blank (ie. they're not in any namespace)
                elem.setAttributeNS(attrNs.namespace || "", attrNs.shortName, val);
            }
        }

        // Create and append this element's children
        var childElems = Array.slice(arguments, 2);
        childElems.forEach(function(childElem) {
            if (childElem != null) {
                elem.appendChild(
                    childElem instanceof doc.defaultView.Node ? childElem :
                        Array.isArray(childElem) ? tag.apply(null, childElem) :
                            doc.createTextNode(childElem));
            }
        });

        return elem;
    }

    return tag.apply(null, jsonTemplate);
}
function getNativeHandlePtrStr(aDOMWindow) {
	var aDOMBaseWindow = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIWebNavigation)
								   .QueryInterface(Ci.nsIDocShellTreeItem)
								   .treeOwner
								   .QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIBaseWindow);
	return aDOMBaseWindow.nativeHandle;
}
// end - common helper functions