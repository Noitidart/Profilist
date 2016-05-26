// Imports
const {interfaces: Ci, utils: Cu} = Components;
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
var gFsComm;
var gTestWorker;

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });
XPCOMUtils.defineLazyGetter(myServices, 'as', function () { return Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService) });

// START - Addon Functionalities

// Start - Launching profile and other profile functionality
// start - MainWorkerMainThreadFuncs
	function testConnUpdate(aNewContent, aComm) {
		gFsComm.transcribeMessage(gTestConnMM, 'callInContent', {
			method: 'testConnUpdate',
			arg: aNewContent
		});
	}
	function createIcon(aArg, aComm) {
		var { aCreateType, aCreateName, aCreatePathDir, aBaseSrcImgPathArr, aOutputSizesArr, aOptions } = aArg;
		console.log('in createIcon in MainWorkerMainThreadFuncs, arguments:', arguments);
		// return ['hi arr 1']; // :note: this is how to return no promise
		// :note: this is how to return with promise
		var deferredMain_createIcon = new Deferred();

		// deferredMain_createIcon.resolve(['hi arr 1 from promise']);
		var triggerCreation = function() {
			console.log('in triggerCreation');
			ICGenWorker.postMessage('returnIconset', {aCreateType, aCreateName, aCreatePathDir, aBaseSrcImgPathArr, aOutputSizesArr, aOptions}, function(aStatusObj, aComm) {
				console.log('returnIconset completed, aStatusObj:', aStatusObj);
				deferredMain_createIcon.resolve(aStatusObj);
			});
		};

		if (typeof(ICGenWorker) == 'undefined') {
			console.log('sicing icgenworker');
			ICGenWorker = new workerComm(core.addon.path.modules + 'ICGenWorker/worker.js?' + core.addon.cache_key, ()=>{return core}, triggerCreation);
		} else {
			triggerCreation();
		}


		return deferredMain_createIcon.promise;
	}
	function showNotification(aArg, aComm) {
		var { aTitle, aBody } = aArg;
		myServices.as.showAlertNotification(core.addon.path.content + 'icon.png', aTitle, aBody, false, null, null, 'Profilist');
	}
	function registerWorkerWindowListener() {
		gWorkerWindowListener = workerWindowListenerRegister();
	}
	function setPref(aArg, aComm) {
		var { aPrefName, aPrefVal } = aArg;
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
	function reUpdateIntoAllWindows() {
		gWorkerWindowListener.reLoadIntoWindows();
	}
// end - MainWorkerMainThreadFuncs
// End - Launching profile and other profile functionality

// start - icon generator stuff - ICGenWorkerFuncs - functions for worker to call in main thread
	function loadImagePathsAndSendBackBytedata(aArg, aComm) {
		var { aImagePathArr, aWorkerCallbackFulfill, aWorkerCallbackReject } = aArg;
		// aImagePathArr is an arrya of os paths to the images to load
		// this will load the images, then draw to canvas, then get get image data, then get array buffer/Bytedata for each image, and transfer object back it to the worker
	}
	var fwInstances = {}; // frameworker instances, obj with id is aId which is arg of setupFrameworker
	function setupFrameworker(aArg, aComm) {
		var {aId, aBootPort, aFwPort} = aArg;

		// aId is the id to create frameworker with
		console.log('mainthread: setupFrameworker, aId:', aId);

		var deferredMain_setupFrameworker = new Deferred();

		var aWindow = Services.wm.getMostRecentWindow('navigator:browser');
		var aDocument = aWindow.document;

		var doAfterAppShellDomWinReady = function() {
			var aBrowser = aDocument.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'browser');
			// aBrowser.setAttribute('data-icon-container-generator-fwinstance-id', aId);


			aBrowser.setAttribute('type', 'content');
			// aBrowser.setAttribute('style', 'height:100px;border:10px solid steelblue;');
			aBrowser.setAttribute('style', 'display:none;');


			var initFw = function(aFwComm) {
				aComm.postMessage('initFw', aId);
			};


			ICGenWorkerFuncs.fwInstances[aId] = {
				browser: aBrowser,
				// comm is added in DOMContentLoaded
				deferredMain_setupFrameworker: deferredMain_setupFrameworker
			};

			aBrowser.addEventListener('DOMContentLoaded', function(e) { // cross-file-link381743613524242 - need this because there is no aBrowser.contentWindow until the page loads
				// for now im going with assumption of this test - this DOMContentLoaded is triggering after the DOMContentLoaded in fsReturnIconset.js of fsReturnIconset.htm
				aBrowser.removeEventListener('DOMContentLoaded', arguments.callee, false);
				console.error('content loaded in aBrowser!, aBrowser.contentWindow.location.href:', aBrowser.contentWindow.location.href)

				ICGenWorkerFuncs.fwInstances[aId].comm = new contentComm(aBrowser.contentWindow, aBootPort, aFwPort, initFw);
			}, false);

			aBrowser.setAttribute('src', core.addon.path.pages + 'fsReturnIconset.htm');




			aDocument.documentElement.appendChild(aBrowser);
			// console.log('aBrowser.messageManager:', aBrowser.messageManager);
			// aBrowser.messageManager.loadFrameScript(core.addon.path.scripts + 'fsReturnIconset.js?' + core.addon.cache_key, false);

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
	}
	function destroyFrameworker(aId, aComm) {

		// var aTimer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
		// aTimer.initWithCallback({
			// notify: function() {
					console.log('will now destory remote browser, i hope this will trigger the framescript unload event, because that removes the listener, otherwise i think that the attached message listener from that framescript stays alive somehow');
					ICGenWorkerFuncs.fwInstances[aId].browser.parentNode.removeChild(ICGenWorkerFuncs.fwInstances[aId].browser); // im hoping this triggers the unload event on framescript
					delete ICGenWorkerFuncs.fwInstances[aId];
			// }
		// }, 10000, Ci.nsITimer.TYPE_ONE_SHOT);


	}
	function tellFrameworkerLoadImg(aArg, aComm) {
		var { aProvidedPath, aLoadPath, aId } = aArg;
		var deferredMain_tellFrameworkerLoadImg = new Deferred();
		ICGenWorkerFuncs.fwInstances[aId].comm.postMessage('loadImg', {aProvidedPath, aLoadPath}, null, function(aImgDataObj, aFwComm) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			deferredMain_tellFrameworkerLoadImg.resolve(aImgDataObj);
		});
		return deferredMain_tellFrameworkerLoadImg.promise;
	}
	function tellFrameworkerDrawScaled(aArg, aComm) {
		var { aImgPath, aDrawAtSize, aId } = aArg;
		var deferredMain_tellFrameworkerDrawScaled = new Deferred();
		ICGenWorkerFuncs.fwInstances[aId].comm.postMessage('drawScaled', {aProvidedPath:aImgPath, aDrawAtSize}, null, function(aImgDataObj, aFwComm) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			var resolveWithArr = [aImgDataObj];
			var xfers;
			if (aImgDataObj.arrbuf) {
				xfers = [aImgDataObj.arrbuf];
			}
			deferredMain_tellFrameworkerDrawScaled.resolve(aComm.CallbackTransferReturn(aImgDataObj, xfers));
		});
		return deferredMain_tellFrameworkerDrawScaled.promise;
	}
	function tellFrameworker_dSoBoOOSb(aArg, aComm) {
		var { aImgPath, aDrawAtSize, optBuf, optOverlapObj, aId } = aArg;
		var deferredMain_tellFrameworker_dSoBoOOSb = new Deferred();
		ICGenWorkerFuncs.fwInstances[aId].comm.postMessage('drawScaled_optBuf_optOverlapOptScaled_buf', {aProvidedPath: aImgPath, aDrawAtSize, optBuf, optOverlapObj}, null, function(aImgDataObj, aFwComm) {
			console.log('in bootstrap callback of tellFrameworkerLoadImg, resolving');
			var resolveWithArr = [aImgDataObj];
			var bufTrans = [];
			if (aImgDataObj.optBuf) {
				bufTrans.push(aImgDataObj.optBuf);
			}
			if (aImgDataObj.finalBuf) {
				bufTrans.push(aImgDataObj.finalBuf);
			}
			if (!aImgDataObj.optBuf && !aImgDataObj.finalBuf) {
				bufTrans = undefined;
			}
			deferredMain_tellFrameworker_dSoBoOOSb.resolve(aComm.CallbackTransferReturn(aImgDataObj, bufTrans));
		});
		return deferredMain_tellFrameworker_dSoBoOOSb.promise;
	}
	function tellFrameworkerGetImgDatasOfFinals(aArg, aComm) {
		var { reqObj, aId } = aArg;
		var deferredMain_tellFrameworker_gIDOF = new Deferred();
		ICGenWorkerFuncs.fwInstances[aId].comm.postMessage('getImgDatasOfFinals', reqObj, null, function(aObjOfBufs, aFwComm) {

			var xfers = [];
			for (var p in aObjOfBufs) {
				xfers.push(aObjOfBufs[p]);
			}

			console.log('in bootstrap callback of tellFrameworkerGetImgDatasOfFinals, resolving with:', resolveWithArr);

			deferredMain_tellFrameworker_gIDOF.resolve(aComm.CallbackTransferReturn(aObjOfBufs, xfers));
		});
		return deferredMain_tellFrameworker_gIDOF.promise;
	}
// end - icon generator stuff - ICGenWorkerFuncs - functions for worker to call in main thread

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
		var promise_updateIntoWindow = MainWorker.post('updateIntoWindow', [getNativeHandlePtrStr(aDOMWindow)]);
		promise_updateIntoWindow.then(
			function(aVal) {
				console.log('Fullfilled - promise_updateIntoWindow - ', aVal);

			},
			genericReject.bind(null, 'promise_updateIntoWindow', 0)
		).catch(genericCatch.bind(null, 'promise_updateIntoWindow', 0));
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
		// register framescript listener
		gFsComm = new crossprocComm(core.addon.id);

		// register framescript injector - i register gFsComm first, because on inject of this, it inits by sending message
		Services.mm.loadFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key, true);

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
	var MainWorker = new workerComm(core.addon.path.workers + 'MainWorker.js', ()=>{return core}, function(aArg, aComm) {
		console.log('Fullfilled - promise_initMainWorker - ', aVal);
		// start - do stuff here - promise_initMainWorker
		core = aVal;
		afterWorker();
		// end - do stuff here - promise_initMainWorker
	});
	MainWorker.postMessage('dummyForInstantInstantiate');
}

function shutdown(aData, aReason) {

	if (aReason == APP_SHUTDOWN) { return }

	crossprocComm_unregAll();

	// unregister framescript injector
	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

	// unregister gPUIprUnreg
	if (gWindowListenerForPuiBtn) {
		gWindowListenerForPuiBtn();
	}

	if (gWorkerWindowListener) {
		gWorkerWindowListener.unregister();
	}

	workerComm_unregAll();
}
// END - Addon Functionalities
// start - server/framescript comm layer
// functions for framescripts to call in main thread
var gTestConnMM;
// start - functions called by framescripts
	// fsReturnIconset.js functions
	function fsReturnIconsetReady(aArg, aComm) {
		var {id} = aArg; // id is fwInstanceId
		console.info('fwInstanceId:', id);

		ICGenWorkerFuncs.fwInstances[id].deferredMain_setupFrameworker.resolve([true]); // 'ok send me imgs now baby'
	}
	// end - fsReturnIconset.js functions
	function fetchCoreAndConfigs(aArg, aMessageManager, aBrowser, aComm) {
		var deferredMain_fetchConfigObjs = new Deferred();
		gTestConnMM = aMessageManager;
		// MainWorker._worker.postMessage(['testConnInit']);

		console.log('sending over fetchCoreAndConfigs');

		var promise_fetch = MainWorker.post('fetchAll', []);
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchConfigObjs.resolve(aVal);
				// end - do stuff here - promise_fetch
			}
		);

		return deferredMain_fetchConfigObjs.promise;
	}
	function fetchCore(aArg, aMessageManager, aBrowser, aComm) {
		return core;
	}
	function fetchJustIniObj(aArg, aMessageManager, aBrowser, aComm) {
		// just gets gIniObj
		var deferredMain_fetchJustIniObj = new Deferred();

		var promise_fetch = MainWorker.post('fetchJustIniObj', []);
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchJustIniObj.resolve(aVal);
				// end - do stuff here - promise_fetch
			}
		);

		return deferredMain_fetchJustIniObj.promise;
	}
	function userManipulatedIniObj_updateIniFile(aNewIniObjStr, aMessageManager, aBrowser, aComm) {
		var deferredMain_userManipulatedIniObj_updateIniFile = new Deferred();
		console.log('telling mainworker userManipulatedIniObj_updateIniFile');

		var promise_updateini = MainWorker.post('userManipulatedIniObj_updateIniFile', [aNewIniObjStr]);
		promise_updateini.then(
			function(aNewlyFormattedIniObj) {
				console.log('Fullfilled - promise_updateini - ', aNewlyFormattedIniObj);
				// start - do stuff here - promise_updateini
				deferredMain_userManipulatedIniObj_updateIniFile.resolve(aNewlyFormattedIniObj);
				// end - do stuff here - promise_updateini
			}
		);

		return deferredMain_userManipulatedIniObj_updateIniFile.promise;
	}
	function launchOrFocusProfile(aProfPath, aMessageManager, aBrowser, aComm) {
		// launch profile - this will create launcher if it doesnt exist already
		var deferredMain_launchOrFocusProfile = new Deferred();
		var promise_launchfocus = MainWorker.post('launchOrFocusProfile', [aProfPath]);
		promise_launchfocus.then(
			function(aVal) {
				console.log('Fullfilled - promise_launchfocus - ', aVal);
				deferredMain_launchOrFocusProfile.resolve(aVal);
			},
			genericReject.bind(null, 'promise_launchfocus', deferredMain_launchOrFocusProfile)
		).catch(genericReject.bind(null, 'promise_launchfocus', deferredMain_launchOrFocusProfile));

		return deferredMain_launchOrFocusProfile.promise;
	}
	function createNewProfile(aArg, aMessageManager, aBrowser, aComm) {
		var {aNewProfName, aCloneProfPath, aNameIsPlatPath, aLaunchIt} = aArg;
		// aNewProfName - string for new profile that will be made. OR set to null to use preset name "Unnamed Profile ##"
		// aCloneProfPath - the path of the profile to clone. `null` if this is not a clone
		// aLaunchIt - set to false, if you want to just create. set to true if you want to create it then launch it soon after creation

		var promise_workerCreate = MainWorker.post('createNewProfile', [aNewProfName, aCloneProfPath, aNameIsPlatPath, aLaunchIt]);
		promise_workerCreate.then(
			function(aIniObj) {
				console.log('Fullfilled - promise_workerCreate - ', aIniObj);

				aComm.transcribeMessage(aMessageManager, 'callInContent', {
					method: 'pushIniObj',
					arg: {
						aIniObj: aIniObj,
						aDoTbbEnterAnim: true
					}
				});
			},
			genericReject.bind(null, 'promise_workerCreate', 0)
		).catch(genericCatch.bind(null, 'promise_workerCreate', 0));

	}
	function renameProfile(aArg, aMessageManager, aBrowser, aComm) {
		var {aProfPath, aNewProfName} = aArg;
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
				aComm.transcribeMessage(aMessageManager, 'callInContent', {
					method: 'pushIniObj',
					arg: {
						aIniObj: aReason.msg.aIniObj
					}
				});
			}
		).catch(genericCatch.bind(null, 'promise_workerRename', 0));
	}
	function deleteProfile(aProfPath, aMessageManager, aBrowser, aComm) {
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
				aComm.transcribeMessage(aMessageManager, 'callInContent', {
					method: 'pushIniObj',
					arg: {
						aIniObj: aReason.msg.aIniObj
					}
				});
			}
		).catch(genericCatch.bind(null, 'promise_workerDel', 0));
	}
	function toggleDefaultProfile(aProfPath, aMessageManager, aBrowser, aComm) {
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
				aComm.transcribeMessage(aMessageManager, 'callInContent', {
					method: 'pushIniObj',
					arg: {
						aIniObj: aReason.msg.aIniObj
					}
				});
			}
		).catch(genericCatch.bind(null, 'promise_workerTogDefault', 0));
	}
	function createDesktopShortcut(aProfPath, aMessageManager, aBrowser, aComm) {


		var deferredMain_createDesktopShortcut = new Deferred();

		gCreateDesktopShortcutId++;
		var thisCreateDesktopShortcutId = 'createDesktopShortcut_callback_' + gCreateDesktopShortcutId;
		gBootstrap[thisCreateDesktopShortcutId] = function() {
			console.error('ok in mainthread callback for createDesktopShortcut');
			delete gBootstrap[thisCreateDesktopShortcutId];
			deferredMain_createDesktopShortcut.resolve();
		};

		var promise_workerCreateDeskCut = MainWorker.postMessage('createDesktopShortcut', {aProfPath, aCbIdToResolveToFramescript:thisCreateDesktopShortcutId});
		promise_workerCreateDeskCut.then(
			function(aVal) {
				console.log('Fullfilled - promise_workerCreateDeskCut - ', aVal);
				// dont do anything, as this calls in mainworker launchOrFocusProfile which does async stuff, that will call gBootstrap[thisCreateDesktopShortcutId] when it finishes
			},
			genericReject.bind(null, 'promise_workerCreateDeskCut', 0)
		).catch(genericCatch.bind(null, 'promise_workerCreateDeskCut', 0));

		return deferredMain_createDesktopShortcut.promise;
	}
	function browseExe(aArg, aMessageManager, aBrowser, aComm) {

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

			return fp.file.path;

		}// else { // cancelled	}

		return undefined; // cancelled
	}
	// start - iconpicker set
	function callInPromiseWorker(aArrOfFuncnameThenArgs, aMessageManager, aBrowser, aComm) {
		// for use with sendAsyncMessageWithCallback from framescripts

		var mainDeferred_callInPromiseWorker = new Deferred();

		 MainWorker.postMessage(aArrOfFuncnameThenArgs.shift(), aArrOfFuncnameThenArgs, function(aArg, aComm) {
			 console.log('Fullfilled - callInPromiseWorker - ', aArg);
			 mainDeferred_callInPromiseWorker.resolve(aArg);
		 });

		return mainDeferred_callInPromiseWorker.promise;
	}
	// end - iconpicker set
	function restartInSafemode(aArg, aMessageManager, aBrowser, aComm) {
		// restarts self in safe mode
		var cancelQuit = Cc['@mozilla.org/supports-PRBool;1'].createInstance(Ci.nsISupportsPRBool);
		Services.obs.notifyObservers(cancelQuit, 'quit-application-requested', 'restart');
		if (!cancelQuit.data) {
			Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
		}
	}
// end - functions called by framescripts

var gCreateDesktopShortcutId = -1;
// start - common helper functions
function Deferred() { // rev3 - https://gist.github.com/Noitidart/326f1282c780e3cb7390
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


// start - CommAPI
// common to all of these apis
	// whenever you use the message method, the method MUST not be a number, as if it is, then it is assumed it is a callback
	// if you want to do a transfer of data from a callback, if transferring is supported by the api, then you must wrapp it in aComm.CallbackTransferReturn

var gBootstrap = this;

// start - CommAPI for bootstrap-framescript - bootstrap side - cross-file-link55565665464644
// message method - transcribeMessage - it is meant to indicate nothing can be transferred, just copied/transcribed to the other process
// first arg to transcribeMessage is a message manager, this is different from the other comm api's
var gCrossprocComms = [];
function crossprocComm_unregAll() {
	var l = gCrossprocComms.length;
	for (var i=0; i<l; i++) {
		gCrossprocComms[i].unregister();
	}
}
function crossprocComm(aChannelId) {
	// when a new framescript creates a crossprocComm on framscript side, it requests whatever it needs on init, so i dont offer a onBeforeInit or onAfterInit on bootstrap side

	var scope = gBootstrap;
	gCrossprocComms.push(this);

	this.unregister = function() {
		Services.mm.removeMessageListener(aChannelId, this.listener);

		var l = gCrossprocComms.length;
		for (var i=0; i<l; i++) {
			if (gCrossprocComms[i] == this) {
				gCrossprocComms.splice(i, 1);
				break;
			}
		}

		// kill framescripts
		Services.mm.broadcastAsyncMessage(aChannelId, {
			method: 'UNINIT_FRAMESCRIPT'
		});
	};

	this.listener = {
		receiveMessage: function(e) {
			var messageManager = e.target.messageManager;
			var browser = e.target;
			var payload = e.data;
			console.log('bootstrap crossprocComm - incoming, payload:', payload); //, 'e:', e);
			// console.log('this in receiveMessage bootstrap:', this);

			if (payload.method) {
				if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') }  // dev line remove on prod
				var rez_bs_call = scope[payload.method](payload.arg, messageManager, browser, this); // only on bootstrap side, they get extra 2 args
				if (payload.cbid) {
					if (rez_bs_call && rez_bs_call.constructor.name == 'Promise') {
						rez_bs_call.then(
							function(aVal) {
								console.log('Fullfilled - rez_bs_call - ', aVal);
								this.transcribeMessage(messageManager, payload.cbid, aVal);
							}.bind(this),
							genericReject.bind(null, 'rez_bs_call', 0)
						).catch(genericCatch.bind(null, 'rez_bs_call', 0));
					} else {
						console.log('calling transcribeMessage for callbck with args:', payload.cbid, rez_bs_call);
						this.transcribeMessage(messageManager, payload.cbid, rez_bs_call);
					}
				}
			} else if (!payload.method && payload.cbid) {
				// its a cbid
				this.callbackReceptacle[payload.cbid](payload.arg, messageManager, browser, this);
				delete this.callbackReceptacle[payload.cbid];
			} else {
				throw new Error('invalid combination');
			}
		}.bind(this)
	};
	this.nextcbid = 1; //next callback id
	this.transcribeMessage = function(aMessageManager, aMethod, aArg, aCallback) {
		// console.log('bootstrap sending message to framescript', aMethod, aArg);
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
		aMessageManager.sendAsyncMessage(aChannelId, {
			method: aMethod,
			arg: aArg,
			cbid
		});
	};
	this.callbackReceptacle = {};

	Services.mm.addMessageListener(aChannelId, this.listener);
}
// start - CommAPI for bootstrap-framescript - bootstrap side - cross-file-link55565665464644
// start - CommAPI for bootstrap-content - bootstrap side - cross-file-link0048958576532536411
// message method - postMessage - content is in-process-content-windows, transferring works
// there is a framescript version of this, because framescript cant get aPort1 and aPort2 so it has to create its own
function contentComm(aContentWindow, aPort1, aPort2, onHandshakeComplete) {
	// onHandshakeComplete is triggered when handshake is complete
	// when a new contentWindow creates a contentComm on contentWindow side, it requests whatever it needs on init, so i dont offer a onBeforeInit. I do offer a onHandshakeComplete which is similar to onAfterInit, but not exactly the same
	// no unregister for this really, as no listeners setup, to unregister you just need to GC everything, so just break all references to it

	var handshakeComplete = false; // indicates this.postMessage will now work i think. it might work even before though as the messages might be saved till a listener is setup? i dont know i should ask
	var scope = gBootstrap;

	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};

	this.listener = function(e) {
		var payload = e.data;
		console.log('bootstrap contentComm - incoming, payload:', payload); //, 'e:', e);

		if (payload.method) {
			if (payload.method == 'contentComm_handshake_finalized') {
				handshakeComplete = false;
				if (onHandshakeComplete) {
					onHandshakeComplete(this);
				}
				return;
			}
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_bs_call_for_win = scope[payload.method](payload.arg, this);
			console.log('rez_bs_call_for_win:', rez_bs_call_for_win);
			if (payload.cbid) {
				if (rez_bs_call_for_win && rez_bs_call_for_win.constructor.name == 'Promise') {
					rez_bs_call_for_win.then(
						function(aVal) {
							console.log('Fullfilled - rez_bs_call_for_win - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_bs_call_for_win', 0)
					).catch(genericCatch.bind(null, 'rez_bs_call_for_win', 0));
				} else {
					console.log('calling postMessage for callback with rez_bs_call_for_win:', rez_bs_call_for_win, 'this:', this);
					this.postMessage(payload.cbid, rez_bs_call_for_win);
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
			// aTransfers is undefined
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
		aPort1.postMessage({
			method: aMethod,
			arg: aArg,
			cbid
		}, aTransfers ? aTransfers : undefined);
	}

	aPort1.onmessage = this.listener;
	this.callbackReceptacle = {};

	aContentWindow.postMessage({
		topic: 'contentComm_handshake',
		port2: aPort2
	}, '*', [aPort2]);

}
// end - CommAPI for bootstrap-content - bootstrap side - cross-file-link0048958576532536411
// start - CommAPI for bootstrap-worker - bootstrap side - cross-file-link5323131347
// message method - postMessage
// on unregister, workers are terminated
var gWorkerComms = [];
function workerComm_unregAll() {
	var l = gWorkerComms.length;
	for (var i=0; i<l; i++) {
		gWorkerComms[i].unregister();
	}
}
function workerComm(aWorkerPath, onBeforeInit, onAfterInit, aWebWorker) {
	// limitations:
		// the first call is guranteed
		// devuser should never postMessage from worker with method name "triggerOnAfterInit" - this is reserved for programtic use
		// devuser should never postMessage from bootstrap with method name "init" - progmaticcaly this is automatically done in this.createWorker

	// worker is lazy loaded, it is not created until the first call. if you want instant instantiation, call this.createWorker() with no args
	// creates a ChromeWorker, unless aWebWorker is true

	// if onBeforeInit is set
		// if worker has `init` function
			// it is called by bootstrap, (progrmatically, i determine this by basing the first call to the worker)
	// if onBeforeInit is NOT set
		// if worker has `init` function
			// it is called by the worker before the first call to any method in the worker
	// onAfterInit is not called if `init` function does NOT exist in the worker. it is called by worker doing postMessage to bootstrap

	// onBeforeInit - args: this - it is a function, return a single var to send to init function in worker. can return CallbackTransferReturn if you want to transfer. it is run to build the data the worker should be inited with.
	// onAfterInit - args: aArg, this - a callback that happens after init is complete. aArg is return value of init from in worker. the first call to worker will happen after onAfterInit runs in bootstrap
	// these init features are offered because most times, workers need some data before starting off. and sometimes data is sent back to bootstrap like from init of MainWorker's
	// no featuere for prep term, as the prep term should be done in the `self.onclose = function(event) { ... }` of the worker
	gWorkerComms.push(this);

	var worker;
	var scope = gBootstrap;
	this.nextcbid = 1; //next callback id
	this.callbackReceptacle = {};
	this.CallbackTransferReturn = function(aArg, aTransfers) {
		// aTransfers should be an array
		this.arg = aArg;
		this.xfer = aTransfers;
	};
	this.createWorker = function(onAfterCreate) {
		// only triggered by postMessage when `var worker` has not yet been set
		worker = aWebWorker ? new Worker(aWorkerPath) : new ChromeWorker(aWorkerPath);
		worker.addEventListener('message', this.listener);

		if (onAfterInit) {
			var oldOnAfterInit = onAfterInit;
			onAfterInit = function(aArg, aComm) {
				oldOnAfterInit(aArg, aComm);
				if (onAfterCreate) {
					onAfterCreate(); // link39399999
				}
			}
		}

		var initArg;
		if (onBeforeInit) {
			initArg = onBeforeInit(this);
			this.postMessage('init', initArg); // i dont put onAfterCreate as a callback here, because i want to gurantee that the call of onAfterCreate happens after onAfterInit is triggered link39399999
		} else {
			// else, worker is responsible for calling init. worker will know because it keeps track in listener, what is the first postMessage, if it is not "init" then it will run init
			if (onAfterCreate) {
				onAfterCreate(); // as postMessage i the only one who calls this.createWorker(), onAfterCreate is the origianl postMessage intended by the devuser
			}
		}
	};
	this.postMessage = function(aMethod, aArg, aTransfers, aCallback) {
		// aMethod is a string - the method to call in framescript
		// aCallback is a function - optional - it will be triggered when aMethod is done calling

		if (!worker) {
			this.createWorker(this.postMessage.bind(this, aMethod, aArg, aTransfers, aCallback));
		} else {
			if (aArg && aArg.constructor == this.CallbackTransferReturn) {
				// aTransfers is undefined
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

			worker.postMessage({
				method: aMethod,
				arg: aArg,
				cbid
			}, aTransfers ? aTransfers : undefined);
		}
	};
	this.unregister = function() {

		var l = gWorkerComms.length;
		for (var i=0; i<l; i++) {
			if (gWorkerComms[i] == this) {
				gWorkerComms.splice(i, 1);
				break;
			}
		}

		if (worker) { // because maybe it was setup, but never instantiated
			worker.terminate();
		}

	};
	this.listener = function(e) {
		var payload = e.data;
		console.log('bootstrap workerComm - incoming, payload:', payload); //, 'e:', e);

		if (payload.method) {
			if (payload.method == 'triggerOnAfterInit') {
				if (onAfterInit) {
					onAfterInit(payload.arg, this);
				}
				return;
			}
			if (!(payload.method in scope)) { console.error('method of "' + payload.method + '" not in scope'); throw new Error('method of "' + payload.method + '" not in scope') } // dev line remove on prod
			var rez_bs_call_for_worker = scope[payload.method](payload.arg, this);
			console.log('rez_bs_call_for_worker:', rez_bs_call_for_worker);
			if (payload.cbid) {
				if (rez_bs_call_for_worker && rez_bs_call_for_worker.constructor.name == 'Promise') {
					rez_bs_call_for_worker.then(
						function(aVal) {
							console.log('Fullfilled - rez_bs_call_for_worker - ', aVal);
							this.postMessage(payload.cbid, aVal);
						}.bind(this),
						genericReject.bind(null, 'rez_bs_call_for_worker', 0)
					).catch(genericCatch.bind(null, 'rez_bs_call_for_worker', 0));
				} else {
					console.log('calling postMessage for callback with rez_bs_call_for_worker:', rez_bs_call_for_worker, 'this:', this);
					this.postMessage(payload.cbid, rez_bs_call_for_worker);
				}
			}
		} else if (!payload.method && payload.cbid) {
			// its a cbid
			this.callbackReceptacle[payload.cbid](payload.arg, this);
			delete this.callbackReceptacle[payload.cbid];
		} else {
			console.error('bootstrap workerComm - invalid combination');
			throw new Error('bootstrap workerComm - invalid combination');
		}
	}.bind(this);
}
// end - CommAPI for bootstrap-worker - bootstrap side - cross-file-link5323131347
// end - CommAPI

// end - common helper functions
