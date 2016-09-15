// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.importGlobalProperties(['Blob', 'URL']); // needed for Comm

// Lazy Imports

// Globals
var core = {
	addon: {
		name: 'Profilist',
		id: 'Profilist@jetpack',
		version: null, // populated by `startup`
		path: {
			name: 'profilist',
			//
			content: 'chrome://profilist/content/',
			locale: 'chrome://profilist/locale/',
			//
			resources: 'chrome://profilist/content/resources/',
			images: 'chrome://profilist/content/resources/images/',
			scripts: 'chrome://profilist/content/resources/scripts/',
			styles: 'chrome://profilist/content/resources/styles/',
			fonts: 'chrome://profilist/content/resources/styles/fonts/',
			pages: 'chrome://profilist/content/resources/pages/'
			// below are added by worker
		},
		cache_key: Math.random()
	},
	os: {
		// // name: OS.Constants.Sys.Name, // added by worker
		// // mname: added by worker
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		channel: Services.prefs.getCharPref('app.update.channel')
	}
};

var gWkComm;
var gFsComm;
var callInMainworker, callInContentinframescript, callInFramescript;

var gAndroidMenuIds = [];

const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

var gContentComms = [];

function onBeforeTerminateMainworker() {
	return new Promise(resolve =>
		callInMainworker( 'onBeforeTerminate', null, ()=>resolve() )
	);
}

function install() {}
function uninstall(aData, aReason) {
    if (aReason == ADDON_UNINSTALL) {
		OS.File.removeDir(OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id), {ignorePermissions:true, ignoreAbsent:true}); // will reject if `jetpack` folder does not exist
	}
}

function testDraw(aArrBuf) {
	var win = Services.wm.getMostRecentWindow('navigator:browser');
	var doc = win.document;
	var can = doc.createElementNS(NS_HTML, 'canvas');
	var ctx = can.getContext('2d');
	can.setAttribute('width', 64);
	can.setAttribute('height', 64);
	can.setAttribute('flex', 0);
	var imagedata = new win.ImageData(new Uint8ClampedArray(aArrBuf), 64, 64);
	ctx.putImageData(imagedata, 0, 0);
	doc.documentElement.appendChild(can);
	can.addEventListener('click', function() {
		can.parentNode.removeChild(can);
	}, false);
}

function startup(aData, aReason) {
	core.addon.version = aData.version;


    Services.scriptloader.loadSubScript(core.addon.path.scripts + 'comm/Comm.js');
	({ callInMainworker, callInContentinframescript, callInFramescript } = CommHelper.bootstrap);

	gWkComm = new Comm.server.worker(core.addon.path.scripts + 'MainWorker.js?' + core.addon.cache_key, ()=>core, function(aArg, aComm) {

		core = aArg.core;

		gFsComm = new Comm.server.framescript(core.addon.id);

		Services.mm.loadFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key, true);

		// desktop:insert_gui
		if (core.os.name != 'android') {

			// gGenCssUri = Services.io.newURI(core.addon.path.styles + 'general.css', null, null);
			// gCuiCssUri = Services.io.newURI(core.addon.path.styles + getCuiCssFilename(), null, null);
			//
			// // insert cui
			// Cu.import('resource:///modules/CustomizableUI.jsm');
			// CustomizableUI.createWidget({
			// 	id: 'cui_' + core.addon.path.name,
			// 	defaultArea: CustomizableUI.AREA_NAVBAR,
			// 	label: formatStringFromNameCore('gui_label', 'main'),
			// 	tooltiptext: formatStringFromNameCore('gui_tooltip', 'main'),
			// 	onCommand: guiClick
			// });

		}

		// // register must go after the above, as i set gCuiCssUri above
		windowListener.register();
	}, onBeforeTerminateMainworker);

	callInMainworker('dummyForInstantInstantiate');

}

function shutdown(aData, aReason) {
	callInMainworker('writeFilestore'); // do even on APP_SHUTDOWN

	if (aReason == APP_SHUTDOWN) {
		return;
	}

	Services.mm.removeDelayedFrameScript(core.addon.path.scripts + 'MainFramescript.js?' + core.addon.cache_key);

    Comm.server.unregAll('framescript');
    Comm.server.unregAll('worker');
    Comm.server.unregAll('content');
	gContentComms = null;

    // // desktop_android:insert_gui
    // if (core.os.name != 'android') {
	// 	CustomizableUI.destroyWidget('cui_' + core.addon.path.name);
	// } else {
	// 	for (var androidMenu of gAndroidMenus) {
	// 		var domwin = getStrongReference(androidMenu.domwin);
	// 		if (!domwin) {
	// 			// its dead
	// 			continue;
	// 		}
	// 		domwin.NativeWindow.menu.remove(androidMenu.menuid);
	// 	}
	// }

	// windowListener.unregister();

}

// start - addon functions
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
		aDOMWindow.addEventListener('load', function () {
			aDOMWindow.removeEventListener('load', arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {

		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			if (aDOMWindow.document.readyState == 'complete') { //on startup `aDOMWindow.document.readyState` is `uninitialized`
				windowListener.loadIntoWindow(aDOMWindow);
			} else {
				aDOMWindow.addEventListener('load', function () {
					aDOMWindow.removeEventListener('load', arguments.callee, false);
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
			}
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		/*
		for (var u in unloaders) {
			unloaders[u]();
		}
		*/

		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }

            // desktop_android:insert_gui
			if (core.os.name != 'android') {
                // // desktop:insert_gui
				// if (aDOMWindow.gBrowser) {
				// 	var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
				// 	domWinUtils.loadSheet(gCuiCssUri, domWinUtils.AUTHOR_SHEET);
				// 	domWinUtils.loadSheet(gGenCssUri, domWinUtils.AUTHOR_SHEET);
				// }
				if (aDOMWindow.gBrowser) {
					if (!aDOMWindow.Comm) {
						// resource://devtools/client/shared/vendor/react.js
						Services.scriptloader.loadSubScript(core.addon.path.scripts + '3rd/react-with-addons.js?' + core.addon.cache_key, aDOMWindow); // even if i load it into aDOMWindow.blah and .blah is an object, it goes into global, so i just do aDOMWindow now
						// resource://devtools/client/shared/vendor/react-dom.js
						Services.scriptloader.loadSubScript(core.addon.path.scripts + '3rd/react-dom.js?' + core.addon.cache_key, aDOMWindow);

						Services.scriptloader.loadSubScript(core.addon.path.scripts + '3rd/redux.js?' + core.addon.cache_key, aDOMWindow);
						Services.scriptloader.loadSubScript(core.addon.path.scripts + '3rd/react-redux.js?' + core.addon.cache_key, aDOMWindow);

						Services.scriptloader.loadSubScript(core.addon.path.scripts + 'comm/Comm.js?' + core.addon.cache_key, aDOMWindow);
					}

					Services.scriptloader.loadSubScript(core.addon.path.scripts + 'xul.js?' + core.addon.cache_key, aDOMWindow);
					var comm = new Comm.server.content(aDOMWindow, ()=>console.error('ok bootstrap side setup'), undefined, undefined, Services.vc.compare(core.firefox.version, '46.*') > 0 ? true : false);
					gContentComms.push({
						win: aDOMWindow,
						comm,
						callInContent: Comm.callInX.bind(null, comm, null)
					});
				}
			} else {
                // // android:insert_gui
				// if (aDOMWindow.NativeWindow && aDOMWindow.NativeWindow.menu) {
				// 	var menuid = aDOMWindow.NativeWindow.menu.add(formatStringFromNameCore('gui_label', 'main'), core.addon.path.images + 'icon-color16.png', guiClick)
				// 	gAndroidMenus.push({
				// 		domwin: Cu.getWeakReference(aDOMWindow),
				// 		menuid
				// 	});
				// }
			}
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) { return }

        // desktop:insert_gui
        if (core.os.name != 'android') {
            // if (aDOMWindow.gBrowser) {
			// 	var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			// 	domWinUtils.removeSheet(gCuiCssUri, domWinUtils.AUTHOR_SHEET);
			// 	domWinUtils.removeSheet(gGenCssUri, domWinUtils.AUTHOR_SHEET);
			// }

        }
	}
};

function setApplyBackgroundUpdates(aNewApplyBackgroundUpdates) {
	// 0 - off, 1 - respect global setting, 2 - on
	AddonManager.getAddonByID(core.addon.id, addon =>
		addon.applyBackgroundUpdates = aNewApplyBackgroundUpdates
	);
}

function getAddonInfo(aAddonId=core.addon.id) {
	var deferredmain_getaddoninfo = new Deferred();
	AddonManager.getAddonByID(aAddonId, addon =>
		deferredmain_getaddoninfo.resolve({
			applyBackgroundUpdates: parseInt(addon.applyBackgroundUpdates) === 1 ? (AddonManager.autoUpdateDefault ? 2 : 0) : parseInt(addon.applyBackgroundUpdates),
			updateDate: addon.updateDate.getTime()
		})
	);

	return deferredmain_getaddoninfo.promise;
}

function testalert(aArg, aReportProgress, aComm) {
	// triggered by content
	Services.wm.getMostRecentWindow('navigator:browser').setTimeout(()=>Services.prompt.alert(null, 'rawr', 'testing alert post load'), 1000);
}
// start - common helper functions
var ostypes;
var OSStuff = {};
function initOstypes() {
	if (!ostypes) {
		if (typeof(ctypes) == 'undefined') {
			Cu.import('resource://gre/modules/ctypes.jsm');
		}

		Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/cutils.jsm'); // need to load cutils first as ostypes_mac uses it for HollowStructure
		Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ctypes_math.jsm');
		switch (Services.appinfo.OS.toLowerCase()) {
			case 'winnt':
			case 'winmo':
			case 'wince':
					Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_win.jsm');
				break;
			case 'darwin':
					Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_mac.jsm');
				break;
			default:
				// assume xcb (*nix/bsd)
				Services.scriptloader.loadSubScript(core.addon.path.scripts + 'ostypes/ostypes_x11.jsm');
		}
	}
}
function formatStringFromNameCore(aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements) {
	// 051916 update - made it core.addon.l10n based
    // formatStringFromNameCore is formating only version of the worker version of formatStringFromName, it is based on core.addon.l10n cache

	try { var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr]; if (!cLocalizedStr) { throw new Error('localized is undefined'); } } catch (ex) { console.error('formatStringFromNameCore error:', ex, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements); } // remove on production

	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr];
	// console.log('cLocalizedStr:', cLocalizedStr, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
    if (aReplacements) {
        for (var i=0; i<aReplacements.length; i++) {
            cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
        }
    }

    return cLocalizedStr;
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

// rev1 - https://gist.github.com/Noitidart/1071353ea84906900432
function isWindowFocused(window) {
    var childTargetWindow = {};
    Services.focus.getFocusedElementForWindow(window, true, childTargetWindow);
    childTargetWindow = childTargetWindow.value;

    var focusedChildWindow = {};
    if (Services.focus.activeWindow) {
        Services.focus.getFocusedElementForWindow(Services.focus.activeWindow, true, focusedChildWindow);
        focusedChildWindow = focusedChildWindow.value;
    }

    return (focusedChildWindow === childTargetWindow);
}
