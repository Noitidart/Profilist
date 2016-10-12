var core = {};

var gExeComm;
var gPortsComm = new Comm.server.webextports();
var gBsComm = new Comm.client.webext();

var callInAPort = Comm.callInX2.bind(null, gPortsComm, null);
var callInExe = Comm.callInX2.bind(null, 'gExeComm', null, null); // cannot use `gExeComm` it must be `"gExeComm"` as string because `gExeComm` var was not yet assigned
var callInBootstrap = Comm.callInX2.bind(null, gBsComm, null, null);
var callInMainworker = Comm.callInX2.bind(null, gBsComm, 'callInMainworker', null);

// start - init
preinit();

function preinit() {

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

	// get platform info - and startup exe (desktop) or mainworker (android)
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
				gExeComm = new Comm.server.webextexe('profilist', ()=>resolve('ok platinfo got AND exe started up'), onExeFailed.bind(null, reject));
			}
		});
	}));

	Promise.all(promiseallarr)
	.then(function(valarr) {
		console.log('valarr:', valarr);
		// ok `preinit` completed successfully
		init();
	})
	.catch(function(err) {
		console.error('failed to complete `preinit` proc, err:', err)

		callInBootstrap('showSystemAlert', {
			title: chrome.i18n.getMessage('startup_failed_critical_title'),
			body: chrome.i18n.getMessage('startup_failed_critical_body', ['Failed to complete `preinit` proc, see browser console.'])
		});
	});
}

function onExeFailed(rejector, err) {
	console.error('failed to connect to exe, err:', err);
	rejector('failed to connect to exe, err:' + err.toString());

	callInBootstrap('showSystemAlert', {
		title: chrome.i18n.getMessage('startup_failed_critical_title'),
		body: chrome.i18n.getMessage('startup_failed_critical_body', [err])
	});
}

function init() {
	// after receiving core
	console.log('in init, core:', core);

	startupBrowserAction();
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
	if (core.platform.os != 'android') {
		chrome.tabs.create({ url:url });
	} else {
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
// end - common helper functions
