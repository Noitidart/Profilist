// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');

// Lazy Imports

// Globals
var core = {
	addon: {
		id: 'Profilist@jetpack',
		version: null, // populated by `startup`
		path: {
			name: 'profilist',
			//
			content: 'chrome://profilist/content/',
			//
			exe: 'chrome://profilist/content/exe/',
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
	},
	os: {
		// // name: OS.Constants.Sys.Name, // added by worker
		// // mname: added by worker
		// toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		// xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version,
		channel: Services.prefs.getCharPref('app.update.channel')
	}
};

var gAndroidMenuIds = [];

var webext;

// set addon paths
core.addon.path.jetpackdir = OS.Path.join(OS.Constants.Path.profileDir, 'jetpack', core.addon.id);
core.addon.path.storage = OS.Path.join(core.addon.path.jetpackdir, 'simple-storage');
core.addon.path.filestore = OS.Path.join(core.addon.path.storage, 'store.json');

// set the paths
core.profilist.path.dirstore = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist');
core.profilist.path.exestore = OS.Path.join(core.profilist.path.dirstore, 'exe');
core.profilist.path.iconstore = OS.Path.join(core.profilist.path.dirstore, 'icon');
core.profilist.path.iconimgsstore = OS.Path.join(core.profilist.path.dirstore, 'iconset'); // images that are used to make file in `iconstore`
core.profilist.path.inibkp = OS.Path.join(core.profilist.path.dirstore, 'profiles.profilist.ini');

// add the OS.Constants.Path's because webext doesnt have it
core.addon.path.homeDir = OS.Constants.Path.homeDir;
core.addon.path.userApplicationDataDir = OS.Constants.Path.userApplicationDataDir;
core.addon.path.profileDir = OS.Constants.Path.profileDir;
core.addon.path.localProfileDir = OS.Constants.Path.localProfileDir;

function install() {}
function uninstall(aData, aReason) {
    if (aReason == ADDON_UNINSTALL) {
		// delete storage
		OS.File.removeDir(core.addon.path.jetpackdir, {ignorePermissions:true, ignoreAbsent:true}); // will reject if `jetpack` folder does not exist

		uninstallNativeMessaging()
		.then(valarr => console.log('uninstalled:', valarr))
		.catch(err => console.error('uninstall error:', err));
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

	promiseallarr.push( installNativeMessaging() );

	// wait for all promises, then startup webext
	Promise.all(promiseallarr).then(valarr => {
		console.log('valarr:', valarr)
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

// start - native messaging stuff
function getNativeMessagingInfo() {
	// returns { os_sname, exe_path, exe_from, exe_name, exemanifest_path, exemanifest_from, exemanifest_json, winregistry_path }
	// `winregistry_path` is undefined if not windows
	// os_sname is win/mac/nix

	var exemanifest_json = {
	  'name': 'profilist', // i use this as child entry for windows registry entry, so make sure this name is compatible with injection into windows registry link39191
	  'description': 'Platform helper for Profilist',
	  'path': undefined, // set below to `exe_path`,
	  'type': 'stdio',
	  'allowed_extensions': [ core.addon.id ]
	};

	var exe_name;
	var sname = OS.Constants.Sys.Name.toLowerCase(); // stands for "simplified name". different from `mname`
	if (sname.startsWith('win')) {
		sname = 'win';
		exe_name = exemanifest_json.name + '.exe';
	} else if (sname == 'darwin') {
		sname = 'mac';
		exe_name = exemanifest_json.name;
	} else {
		sname = 'nix';
		exe_name = exemanifest_json.name;
	}

	var exe_path;
	exe_path = OS.Path.join(core.addon.path.userApplicationDataDir, 'extension-exes', exe_name);

	var exe_from = core.addon.path.userApplicationDataDir; // dir that exists for sure in subpath of `exe_path`. where to `makeDir` from for exe

	// update exemanifest_json
	exemanifest_json.path = exe_path;
	exemanifest_json.description += ' for ' + sname;

	var exemanifest_path;
	var exemanifest_from; // dir that exists for sure in subpath of `exemanifest_path`. where to `makeDir` from for exe
	switch (sname) {
		case 'win':
				// exemanifest_path = OS.Path.join(core.addon.path.storage, 'profilist.json');
				// exemanifest_from = core.addon.path.profileDir;
				exemanifest_path = OS.Path.join(core.addon.path.userApplicationDataDir, 'extension-exes', 'profilist.json');
				exemanifest_from = core.addon.path.userApplicationDataDir;
			break;
		case 'mac':
				exemanifest_path = OS.Path.join(core.addon.path.homeDir, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts', 'profilist.json');
				exemanifest_from = OS.Path.join(core.addon.path.homeDir, 'Library', 'Application Support');
			break;
		case 'nix':
				exemanifest_path = OS.Path.join(core.addon.path.homeDir, '.mozilla', 'native-messaging-hosts', 'profilist.json');
				exemanifest_from = core.addon.path.homeDir;
			break;
	}

	var winregistry_path;
	if (sname == 'win') {
		winregistry_path = 'SOFTWARE\\Mozilla\\NativeMessagingHosts';
	}

	return { os_sname:sname, exe_path, exe_from, exe_name, exemanifest_path, exemanifest_from, exemanifest_json, winregistry_path };

}

function installNativeMessaging() {
	var { exe_path, exe_from, exe_name, exemanifest_path, exemanifest_from, exemanifest_json, winregistry_path, os_sname } = getNativeMessagingInfo();

	var promiseallarrmain = [];

	// copy the exes
	promiseallarrmain.push(new Promise( (resolve, reject) =>
		OS.File.makeDir(OS.Path.dirname(exe_path), { from:exe_from })
		.then( dirmade => {
			var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Ci.nsIXMLHttpRequest);
			console.log(core.addon.path.exe + os_sname + '/' + exe_name);
			xhr.open('GET', core.addon.path.exe + os_sname + '/' + exe_name, false);
			xhr.responseType = 'arraybuffer';
			xhr.send();

			// i dont use `writeThenDirMT` because ArrayBuffer's get neutred, so if first write fails, then the arrbuf is gone I think. it might not neuter on fail though.
				// i actually i tested it on 092816 in "52.0a1 (2016-09-28) (64-bit)", and on fail, it does not neuter the arrbuf, only on success
			writeThenDirMT(exe_path, new Uint8Array(xhr.response), exe_from, { encoding:undefined })
			// OS.File.writeAtomic(exe_path, new Uint8Array(xhr.response), { encoding:undefined })
			.then( copied => {
				if (os_sname != 'win') {
					OS.File.setPermissions(exe_path, { unixMode:0o4777 }) // makes it executable, tested on mac, not yet on nix
					.then( resolve() )
					.catch( osfileerr => reject(osfileerr) )
				} else {
					resolve();
				}
			})
			.catch( osfileerr => reject(osfileerr) )
		})
		.catch( osfileerr => reject(osfileerr) )
	));

	// make sure exe manifest is in place
	promiseallarrmain.push(new Promise( (resolve, reject) =>
		writeThenDirMT(exemanifest_path, JSON.stringify(exemanifest_json), exemanifest_from, { noOverwrite:true, encoding:'utf-8' })
		.then( ok => resolve() )
		.catch( osfileerr => osfileerr.becauseExists ? resolve() : reject(osfileerr) )
	));

	// if Windows then update registry
	if (winregistry_path) {
		var wrk = Cc['@mozilla.org/windows-registry-key;1'].createInstance(Ci.nsIWindowsRegKey);
		wrk.create(wrk.ROOT_KEY_CURRENT_USER, winregistry_path + '\\' + exemanifest_json.name, wrk.ACCESS_WRITE); // link39191
		wrk.writeStringValue('', exemanifest_path);
		wrk.close();
		// not ignoring errors during write, if it errors, startup fails
	}

	return Promise.all(promiseallarrmain);
}

function uninstallNativeMessaging() {
	var { exe_path, exe_from, exe_name, exemanifest_path, exemanifest_from, exemanifest_json, winregistry_path } = getNativeMessagingInfo();

	var promiseallarrmain = [];

	// delete exe
	promiseallarrmain.push( OS.File.remove(exe_path, { ignorePermissions:true, ignoreAbsent:true }) ); // ignoreAbsent because maybe another profile already deleted it

	// TODO: if `exe_path` parent dir is empty, remove it, because parent dir is my own created one of "extensions-exes"

	// delete manifest
	promiseallarrmain.push( OS.File.remove(exemanifest_path, { ignorePermissions:true, ignoreAbsent:true }) ); // ignoreAbsent because if windows, then its in core.addon.path.filestore which is already deleted by now

	// if Windows then update registry
	if (winregistry_path) {
		var wrk = Cc['@mozilla.org/windows-registry-key;1'].createInstance(Ci.nsIWindowsRegKey);
		try {
			wrk.open(wrk.ROOT_KEY_CURRENT_USER, winregistry_path, wrk.ACCESS_WRITE);
			wrk.removeChild(exemanifest_json.name); // link39191
		} finally {
			wrk.close();
		}
		// NOTE: i am ignoring errors that happen during uninstall from registry
	}

	return Promise.all(promiseallarrmain);
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
// rev2 - https://gist.github.com/Noitidart/5257376b54935556173e8d13c2821f4e
function writeThenDirMT(aPlatPath, aContents, aDirFrom, options={}) {
	// tries to writeAtomic
	// if it fails due to dirs not existing, it creates the dir
	// then writes again
	// if fail again for whatever reason it rejects with `osfileerr`
	// on success resolves with `true`

	var default_options = {
		encoding: 'utf-8',
		noOverwrite: false
		// tmpPath: aPlatPath + '.tmp'
	};

	options = Object.assign(default_options, options);

	var writeTarget = () => OS.File.writeAtomic(aPlatPath, aContents, options);

	return new Promise((resolvemain, rejectmain) =>
		writeTarget().then( ()=>resolvemain() ).catch( osfileerr => {
			if (osfileerr.becauseNoSuchFile) { // this happens when directories dont exist to it
				OS.File.makeDir(OS.Path.dirname(aPlatPath), {from:aDirFrom}).then(
					()=>writeTarget().then( ()=>resolvemain() ).catch( osfileerr=>rejectmain(osfileerr) )
				// ).catch( osfileerr=>resolvemain(false) );
				).catch( osfileerr=>rejectmain(osfileerr) );
			} else {
				rejectmain(osfileerr);
				// resolvemain(false);
			}
		})
	);
}
