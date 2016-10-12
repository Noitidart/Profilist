var core  = {
	self: {
		id: chrome.runtime.id,
		version: chrome.runtime.getManifest().version,
	},
	browser: {
		name: getBrowser().name,
		version: getBrowser().version
	},
	path: {
		// webext relative paths
		images: 'images/',
		fonts: 'styles/fonts/',
		pages: 'pages/',
		scripts: 'scripts/',
		styles: 'styles/',
		// non-webext paths - SPECIAL prefixed with underscore
		_exe: 'exe/',
		// chrome path version
		get chrome(key) {
			// key must be one of the keys in path or null/undefined/blank to just get chrome path
			// if its a non-webext key, you dont need the prefix of underscore, it will figure it out
			var prefix = 'chrome://' + core.self.id + '/content/';
			var suffix;
			if (key[0] == '_') key = key.substr(1);
			if (core.path['_' + key]) {
				// its a chrome path only
				suffix = core.path['_' + key];
			} else {
				suffix = 'webextension/' + core.path[key];
			}
			return prefix + suffix;
		}
	}
	// os: {
	// 	name: OS.Constants.Sys.Name,
	// 	mname: ['winnt', 'winmo', 'wince', 'darwin'].includes(OS.Constants.Sys.Name.toLowerCase()) ? OS.Constants.Sys.Name.toLowerCase() : 'gtk',
	// 	toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
	// 	xpcomabi: Services.appinfo.XPCOMABI
	// },
	// firefox: {
	// 	pid: Services.appinfo.processID,
	// 	version: Services.appinfo.version,
	// 	channel: Services.prefs.getCharPref('app.update.channel')
	// }
	nativemessaging: {

	},
	store: {
		// defaults - keys that present in here during `preinit` are fetched on startup
			// 3 types
				// prefs are prefeixed with "pref_"
				// mem are prefeixed with "mem_" - mem stands for extension specific "cookies"/"system memory"
				// filesystem-like stuff is prefixied with "fs_"
		mem_lastversion: '-1' // indicates not installed - the "last installed version"
	}
};

var gExeComm;
var gPortsComm = new Comm.server.webextports();
var gBsComm = new Comm.client.webext();

var callInAPort = Comm.callInX2.bind(null, gPortsComm, null);
var callInExe = Comm.callInX2.bind(null, 'gExeComm', null, null); // cannot use `gExeComm` it must be `"gExeComm"` as string because `gExeComm` var was not yet assigned
var callInBootstrap = Comm.callInX2.bind(null, gBsComm, null, null);
var callInMainworker = Comm.callInX2.bind(null, gBsComm, 'callInMainworker', null);

// start - init
preinit();

function preinit(aRetryReasons={}) {
	// in below cases, `preinit` can be retried. every time it retries it adds a key which signifies the reason for retrying.
		// EXE_AUTOINSTALL - retrying due to `cantryexeautoinstall`

	var promiseallarr = [];

	// fetch core from bootstrap - i dont use anything from here, but fetching it for hell of it (as this is how i used to do things pre webext)
	promiseallarr.push(new Promise(resolve => {
		callInBootstrap('fetchCore', undefined, function(aArg) {
			var { core:gotcore } = aArg;

			Object.assign(core, gotcore);

			console.log('got core in background, core:', core);
			resolve('ok got core from bootstrap into background');
		});
	}));

	// fetch storage
	promiseallarr.push(new Promise(function(resolve) {
		chrome.storage.local.get(Object.keys(core.store), function(storeds) {
			for (var key in storeds) {
				Object.assign(core.store[key], storeds[key]);
			}
			resolve();
		});
	}));

	// get platform info - and startup exe (desktop) or mainworker (android)
	var cantryexeautoinstall = false; // mark this to true, if reject due to exe error and auto-installing it can possibly fix it
	promiseallarr.push(new Promise(function(resolve, reject) {
		chrome.runtime.getPlatformInfo(function(platinfo) {
			console.log('platinfo:', platinfo);
			core.platform = platinfo;

			// if didnt have to startup exe/mainworker i could resolve here with `resolve('ok platinfo got')`

			// startup exe or mainworker
			if (core.platform.os == 'android') {
				callInBootstrap('startupMainworker', { path:'chrome://profilist/content/webextension/scripts/mainworker.js' });
				resolve('ok platinfo got AND mainworker started up');
				// its lazy started up, so cant wait on it to startup with proimise
				// // callInBootstrap(
				// // 	'startupMainworker',
				// // 	{
				// // 		path: 'chrome://profilist/content/webextension/scripts/mainworker.js'
				// // 		// path: chrome.runtime.getURL('scripts/mainworker.js') // cant use `chrome.runtime.getURL('scripts/mainworker.js')` as this will cause error of `SecurityError: Failed to load worker script at "moz-extension://269e9e5e-c45a-4863-8846-05311321b58b/scripts/mainworker.js"`
				// // 	},
				// // 	()=>resolve('ok platinfo got AND mainworker started up')
				// // );
			} else {
				gExeComm = new Comm.server.webextexe(
					'profilist',
					function onExeConnected() {
						// resolve('ok platinfo got AND exe started up')
						// lets make sure the exe version and extension version match
						callInExe('getVersion', undefined, function(exeversion) {
							var extversion = core.self.version;
							if (exeversion === extversion) {
								resolve('ok platinfo got AND exe started up AND exe version matches extension version');
							} else {
								// reject('ok platinfo got AND exe started up BUT exe version does not match extension version')
								cantryexeautoinstall = true;
								var howtofixstr;
								if (isSemVer(extversion, '>' + exeversion)) {
									// user needs to upgrade the exe OR downgrade the extension
									howtofixstr = chrome.i18n.getMessage('startupfailed_exemismatch_howtofix1');
								} else {
									// user needs to downgrade the exe OR upgrade the extension
									howtofixstr = chrome.i18n.getMessage('startupfailed_exemismatch_howtofix2');
								}
								reject(chrome.i18n.getMessage('startupfailed_exemismatch', [exeversion, extversion, howtofixstr]));
							}
						});
					},
					function onExeFailed(err) {
						cantryexeautoinstall = true;
						console.error('failed to connect to exe, err:', err);
						// reject('failed to connect to exe, err:' + err.toString());
						reject(chrome.i18n.getMessage('startupfailed_execonnect') + ' ' err.toString());
					}
				);
			}
		});
	}));

	Promise.all(promiseallarr)
	.then(function(valarr) {
		console.log('valarr:', valarr);
		// ok `preinit` completed successfully
		init();
	})
	.catch(function onPreinitFailed(err) {

		var displayError = function(errex) {
			// errex - an additional error message to show due to retry failures
			console.error('failed to complete `preinit` proc, err:', err)
			if (!err) {
				err = '';
			} else {
				err = err.toString();
			}

			if (errex) {
				console.error('failed on a retry as well, errex:', errex);
				err += '\n\n' + errex.toString();
			}

			if (!err.length) err = null; // for link1992930

			callInBootstrap('showSystemAlert', {
				title: chrome.i18n.getMessage('startupfailed_title'),
				body: chrome.i18n.getMessage('startupfailed_body', [err || chrome.i18n.getMessage('startupfailed_seeconsole') ]) // link1992930 is due to the `||` here
			});
		};
		if (cantryexeautoinstall && !aRetryReasons.EXE_AUTOINSTALL && core.browser.name == 'Firefox') {
			// !aRetryReasons.EXE_AUTOINSTALL - means it hasnt retried for this reason yet. as i dont want to retry for the same reason multiple times
			callInBootstrap('installNativeMessaging', core.nativemessaging, function(failreason) {
				if (!failreason) {
					setTimeout(function(){ preinit(Object.assign({}, aRetryReasons, { EXE_AUTOINSTALL:true })); }, 0); // so it gets out of this catch scope
				} else {
					displayError(failreason);
				}
			});
		} else {
			displayError();
		}
	});
}

function init() {
	// after receiving core
	console.log('in init, core:', core);

	startupBrowserAction();

	var lastversion = core.store.mem_lastversion;
	if (lastversion === '-1') {
		// installed / first run
	} else if (lastversion !== core.self.version) {
		// downgrade or upgrade
		if (isSemVer(core.self.version, '>' + lastversion)) {
			// upgrade
		} else {
			// downgrade
		}
		chrome.storage.local.set({ mem_lastversion:core.self.version });
	} // else if (lastversion === core.self.version) { } // browser startup OR enabled after having disabled
}

function uninit() {
	// from IRC on 093016 - no need to unregister these ports, they are done for me on addon sutdown
	// gPortsComm.unregister();
	// gExeComm.unregister();
}
// end - init

// start - browseraction
function startupBrowserAction() {
	// browser_action/chrome.browserAction is not supported on Android, so tell bootstrap to inject action item to NativeWindow.menu
	if (core.platform.os == 'android') {
		callInBootstrap('startupAndroid', {
			browseraction: {
				title: chrome.i18n.getMessage('browseraction_title'),
				iconpath: chrome.runtime.getURL('images/group-outline.svg')
			}
		});
	} else {
		chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
	}
}
function onBrowserActionClicked() {
	// chrome.tabs.create({
	// 	url: chrome.extension.getURL('pages/options.html')
	// });
	//

	console.log('opening menu.html now');
	addTab(chrome.extension.getURL('pages/menu.html'));

	if (core.platform.os == 'android') {
		setTimeout(function() {
			callInMainworker('getSystemDirectory_android', 'DIRECTORY_PICTURES', path=>console.log('got path in background.js, path:', path));
		}, 10000);
	}

	// callInExe('testCallFromBgToExe', {sub:'hi there'}, function(aArg, aComm) {
	// 	console.log('in callback of testCallFromBgToExe', 'aArg:', aArg, 'aComm:', aComm);
	// });
}
// end - browseraction

// start - polyfill for android
function addTab(url) {
	if (chrome.tabs && chrome.tabs.create) {
		chrome.tabs.create({ url:url });
	} else {
		// its android
		callInBootstrap('addTab', { url:url });
	}
}
function reuseElseAddTab(url) {
	// find tab by url, if it exists focus its window and tab and the reuse it. else add tab
}
// end - polyfill for android

function testCallFromExeToBg(aArg, aReportProgress, aComm) {
	console.log('in testCallFromExeToBg', 'aArg:', aArg, 'aReportProgress:', aReportProgress, 'aComm:', aComm);
	setTimeout(function() {
		aReportProgress({step:'5k baby!'});
	}, 1000);
	setTimeout(function() {
		aReportProgress({step:'ANOTHER 5k'});
	}, 3000);

	var promisemain = new Promise(function(resolve) {
		setTimeout(function() {
			resolve();
		}, 5000);
	});
	return promisemain;
}

function testCallFromPortToBg(aArg, aReportProgress, aComm, aPortName) {
	// aReportProgress is undefined if the tab who triggered this function is not waiting for reply back
	console.log('in testCallFromPortToBg', 'aArg:', aArg, 'aReportProgress:', aReportProgress, 'aComm:', aComm, 'aPortName:', aPortName);

	if (aReportProgress) { // tab who triggered, has a callback setup
		aReportProgress({ iprogress:'step' });
	}

	var promisemain = new Promise(function(resolve) {
		setTimeout(function() {
			resolve({ ireturn:'promise' });
		}, 2000);
	});
	// return { ireturn:'this' };
	return promisemain;
}

function callFromTabToBgTestTabId(aArg, aReportProgress, aComm, aPortName) {
	var portname = aPortName;
	setTimeout(function() {
		console.log('ok starting calling into tab/port');
		// callInLastPort = Comm.callInX2.bind(null, gPortsComm, null, portname); // can use 'gPortsComm' as string here as well
		// callInLastPort('testCallFromBgToTab', 'hithere', function(aArg, aComm) {
		// 	console.log('in callback of testCallFromBgToTab', 'aArg:', aArg, 'aComm:', aComm);
		// });

		callInAPort(portname, 'testCallFromBgToTab', 'hithere', function(aArg, aComm) {
			console.log('in callback of testCallFromBgToTab', 'aArg:', aArg, 'aComm:', aComm);
		});
	}, 5000);
	return 'ok after 5 sec will start calling into tab';
}
