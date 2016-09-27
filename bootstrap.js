// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');

// Lazy Imports

// Globals
var core = {
	addon: {
		version: null, // populated by `startup`
		path: {
			name: 'profilist',
			//
			content: 'chrome://profilist/content/',
			//
			exe: : 'chrome://profilist/content/exe/',
			//
			images: 'chrome://profilist/content/webextension/images/',
			scripts: 'chrome://profilist/content/webextension/scripts/',
			styles: 'chrome://profilist/content/webextension/styles/',
			fonts: 'chrome://profilist/content/webextension/styles/fonts/',
			pages: 'chrome://profilist/content/webextension/pages/'
			// below are added by worker
		},
		cache_key: Math.random()
	},
	profilist: {
		path: {
			// as now using webext, i have to send it these paths
		}
	}
	// os: {
	// 	// // name: OS.Constants.Sys.Name, // added by worker
	// 	// // mname: added by worker
	// 	toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
	// 	xpcomabi: Services.appinfo.XPCOMABI
	// },
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		channel: Services.prefs.getCharPref('app.update.channel')
	}
};

var gAndroidMenuIds = [];

function install() {}
function uninstall(aData, aReason) {
    if (aReason == ADDON_UNINSTALL) {
		// OS.File.removeDir(OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id), {ignorePermissions:true, ignoreAbsent:true}); // will reject if `jetpack` folder does not exist
	}
}

function webextListener(msg, sender, sendReply) {
	if (msg == 'WEBEXT_INIT') {
		sendReply({
			core
		});
	}
}

function startup(aData, aReason) {
	var promiseallarr = [];

	// set version
	core.addon.version = aData.version;

	// set the paths
	core.profilist.path.dirstore = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist');
	core.profilist.path.exestore = OS.Path.join(core.profilist.path.dirstore, 'exe');
	core.profilist.path.iconstore = OS.Path.join(core.profilist.path.dirstore, 'icon');
	core.profilist.path.iconimgsstore = OS.Path.join(core.profilist.path.dirstore, 'iconset'); // images that are used to make file in `iconstore`
	core.profilist.path.inibkp = OS.Path.join(core.profilist.path.dirstore, 'profiles.profilist.ini');

	// add the OS.Constants.Path's because webext doesnt have it
	core.profilist.path.userApplicationDataDir = OS.Constants.Path.userApplicationDataDir;
	core.profilist.path.profileDir = OS.Constants.Path.profileDir;
	core.profilist.path.localProfileDir = OS.Constants.Path.localProfileDir;

	// copy the exes
	var exename = 'profilist';
	var sname = OS.Constants.Sys.Name.toLowerCase(); // stands for "simplified name". different from `mname`
	if (sname.startsWith('win')) {
		sname = 'win';
		exename += '.exe';
	} else if (sname == 'darwin') {
		sname = 'mac';
	} else {
		sname = 'nix';
	}
	var exepath = OS.Path.join(core.profilist.path.dirstore, exename);
	promiseallarr.push(new Promise( (resolve, reject) => {
		OS.File.copy(OS.Path.join(core.addon.path.exe, sname, exename), OS.Path.join(core.profilist.path.dirstore, exename), { noOverwrite:true }).then( copy_ok => resolve(true) ).catch( OSFileError => OSFileError.becauseExists() ? resolve(false) : reject(OSFileError) );
	}));

	// make sure exe manifest is in place
	var exemanifest_path;
	switch (sname) {

	}
	promiseallarr.push(new Promise( resolve => {
		if (OS.File.exists()) {

		}
	}));

	// if windows make sure registry is updated
	promiseallarr.push(new Promise( resolve => {
		if (OS.File.exists())
	}));

	Promise.all(promiseallarr).then(() => {
		aData.webExtension.startup().then(api => {
			({ browser:webext } = api);
			webext.runtime.onMessage.addListener(webextListener);
	    });
	}).catch( caught => console.error('Failed to prepare for webext startup, caught:', caught) );
}

function shutdown(aData, aReason) {
	// callInMainworker('writeFilestore'); // do even on APP_SHUTDOWN

	if (aReason == APP_SHUTDOWN) return;

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

	windowListener.unregister();

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
	onCloseWindow: function (aXULWindow) {
		var aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

	},
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
				if (aDOMWindow.gBrowser) {
					// var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
					// domWinUtils.loadSheet(Services.io.newURI(core.addon.path.styles + 'xul.css', null, null), domWinUtils.AUTHOR_SHEET);
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
            if (aDOMWindow.gBrowser) {
				// var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
				// domWinUtils.removeSheet(Services.io.newURI(core.addon.path.styles + 'xul.css', null, null), domWinUtils.AUTHOR_SHEET);
			}

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

// start - common helper functions
function getNativeHandlePtrStr(aDOMWindow) {
	var aDOMBaseWindow = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIWebNavigation)
								   .QueryInterface(Ci.nsIDocShellTreeItem)
								   .treeOwner
								   .QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIBaseWindow);
	return aDOMBaseWindow.nativeHandle;
}
