var core  = {
	self: {
		id: chrome.runtime.id,
		version: chrome.runtime.getManifest().version,
		chromemanifestkey: 'profilist'
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
		// non-webext paths - SPECIAL prefixed with underscore - means it is from chrome://core.addon.id/content/
		_exe: 'exe/',
		// chrome path versions set after this block
		chrome: {}
	},
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
	nativemessaging: { // only used by firefox
		manifest_json: {
		  name: 'profilist', // i use this as child entry for windows registry entry, so make sure this name is compatible with injection into windows registry link39191
		  description: 'Platform helper for Profilist',
		  path: undefined, // set by `getNativeMessagingInfo` in bootstrap
		  type: 'stdio',
		  allowed_extensions: [ chrome.runtime.id ]
		}
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

// set chrome:// paths in core.path
for (var pathkey in core.path) {
	if (pathkey == 'chrome') continue;
	var prefix = 'chrome://' + core.self.chromemanifestkey + '/content/';
	var suffix;
	if (pathkey[0] == '_') pathkey = pathkey.substr(1);
	if (core.path['_' + pathkey]) {
		// its a chrome path only
		suffix = core.path['_' + pathkey];
	} else {
		suffix = 'webextension/' + core.path[pathkey];
	}
	core.path.chrome[pathkey] = prefix + suffix;
}

var gExeComm;
var gPortsComm = new Comm.server.webextports();
var gBsComm = new Comm.client.webext();

var callInAPort = Comm.callInX2.bind(null, gPortsComm, null);
var callInExe = Comm.callInX2.bind(null, 'gExeComm', null, null); // cannot use `gExeComm` it must be `"gExeComm"` as string because `gExeComm` var was not yet assigned
var callInBootstrap = Comm.callInX2.bind(null, gBsComm, null, null);
var callInMainworker = Comm.callInX2.bind(null, gBsComm, 'callInMainworker', null);

// start - init
preinit();

// never retries - only one special case of retry is after auto install native messaging
function preinit(aIsRetry) {

	var promiseallarr = [];
	/*
	 promises in promiseallarr when get rejected, reject with:
		{
			reason: string;enum[STORE_CONNECT, EXE_CONNECT, EXE_MISMATCH]
			text: string - non-localized associated text to show - NOT formated text. this is something i would insert into the template shown
			data: object - only if EXE_MISMATCH - keys: exeversion
		}
	*/
	// give bootstrap core
	callInBootstrap('sendCore', { core:core });

	// fetch storage
	promiseallarr.push(new Promise(function(resolve, reject) {
		// start async-proc19292
		var tries = 0;
		const maxtries = 100;
		const timebetween = 50; // ms

		var getStore = function() {
			tries++;
			if (tries >= maxtries) {
				reject({
					reason: 'STORE_CONNECT',
					text: chrome.runtime.lastError
				});
			} else {
				chrome.storage.local.get(Object.keys(core.store), gotStore);
			}
		};

		var gotStore = function(storeds) {
			if (chrome.runtime.lastError) {
				setTimeout(getStore, timebetween);
			} else {
				for (var key in storeds) {
					Object.assign(core.store[key], storeds[key]);
				}
				resolve();
			}
		};

		getStore();

		// end async-proc19292
	}));

	// get platform info - and startup exe (desktop) or mainworker (android)
	promiseallarr.push(new Promise(function(resolve, reject) {
		// start async-proc133934
		var getPlat = function() {
			chrome.runtime.getPlatformInfo(gotPlat);
		};

		var gotPlat = function(platinfo) {
			console.log('platinfo:', platinfo);
			core.platform = platinfo;

			// if didnt have to startup exe/mainworker i could resolve here with `resolve('ok platinfo got')`
			startNativeHost();
		};

		var startNativeHost = function() {
			if (core.platform.os == 'android') {
				callInBootstrap('startupMainworker', { path:'chrome://profilist/content/webextension/scripts/mainworker.js' });
				// worker doesnt start till first call, so just assume it connected
				verifyNativeHost();
			} else {
				gExeComm = new Comm.server.webextexe(
					'profilist',
					function() {
						// exe connected
						verifyNativeHost();
					},
					function(aErr) {
						// exe failed to connect
						console.error('failed to connect to exe, aErr:', aErr);
						if (aErr) aErr = aErr.toString(); // because at the time of me writing this, Comm::webext.js does not give an error reason fail, i tried but i couldnt get the error reason, it is only logged to console
						verifyNativeHost({ reason:'EXE_CONNECT', text:aErr });
					}
				);
			}
		};

		var verifyNativeHost = function(aRejectObj) {
			// last step of async-proc - responsible for calling `resolve` or `reject`
			console.log('in verifyNativeHost');
			if (aRejectObj) {
				reject(aRejectObj);
			} else {
				// verifies the native host version matches that of the extension
				if (core.platform.os == 'android') {
					resolve('ok platinfo got AND nativehost (mainworker) started up');
				} else {
					callInExe('getExeVersion', undefined, function(exeversion) {
						var extversion = core.self.version;
						if (exeversion === extversion) {
							resolve('ok platinfo got AND exe started up AND exe version matches extension version');
						} else {
							reject({ reason:'EXE_MISMATCH', data:{ exeversion:exeversion } });
						}
					});
				}
			}
		};

		getPlat();
		// end async-proc133934
	}));

	Promise.all(promiseallarr)
	.then(function(valarr) {
		console.log('valarr:', valarr);
		// ok `preinit` completed successfully
		init();
	})
	.catch(function onPreinitFailed(err) {
		console.error('onPreinitFailed, err:', err);
		// start sync-proc39
		var shouldRetry = function() {
			if (aIsRetry) {
				// do not retry again, even if it was for another reason - i only do 1 retry
				displayError();
			} else {
				switch (err.reason) {
					case 'EXE_CONNECT':
					case 'EXE_MISMATCH':
							if (core.browser.name == 'Firefox')
								doRetry();
							else
								displayError();
						break;
					default:
						displayError();
				}
			}
		};

		var doRetry = function() {
			if (err.reason.indexOf('EXE_') === 0) {
				callInBootstrap('installNativeMessaging', { nativemessaging:core.nativemessaging, path:core.path }, function(aInstallFailed) {
					if (!aInstallFailed)
						setTimeout(preinit.bind(null, true), 0); // so it gets out of this catch scope
					else
						displayError(aInstallFailed);
				});
			}
		};

		var displayError = function(errex) {
			// last step

			// build body, based on err.reason, with localized template and with err.text and errex
			var body, bodyarr;
			switch (err.reason) {
				// case 'STORE_CONNECT': // let default handler take care of this
				// 		//
				// 	break;
				case 'EXE_CONNECT':

						bodyarr = [chrome.i18n.getMessage('startupfailed_execonnect') + ' ' + (err.text || chrome.i18n.getMessage('startupfailed_unknown'))]
						if (errex) bodyarr[0] += ' ' + errex.toString();

					break;
				case 'EXE_MISMATCH':

						// build howtofixstr
						var extversion = core.self.version;
						var exeversion = err.data.exeversion;
						console.log('going to isSemVer', extversion, exeversion);
						console.log('semver:', isSemVer(extversion, '>' + exeversion));
						var howtofixstr = isSemVer(extversion, '>' + exeversion) ? chrome.i18n.getMessage('startupfailed_exemismatch_howtofix1') : chrome.i18n.getMessage('startupfailed_exemismatch_howtofix2');
						bodyarr = [ chrome.i18n.getMessage('startupfailed_exemismatch', [exeversion, extversion, howtofixstr]) ];
						if (errex) bodyarr[0] += ' ' + errex.toString();

					break;
				default:
					var txt = '';
					if (err && err.text) txt += err.text;
					if (errex) txt += '\n' + errex;

					body = chrome.i18n.getMessage('startupfailed_body', [ txt || chrome.i18n.getMessage('startupfailed_unknown') ]);
			}
			var body = chrome.i18n.getMessage('startupfailed_body', bodyarr);

			// show error to user
			callInBootstrap('showSystemAlert', { title:chrome.i18n.getMessage('startupfailed_title'), body:body });
		};

		shouldRetry();
		// end sync-proc39
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
			resolve('OK DONESKIS');
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
