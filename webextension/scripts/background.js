var core;

var gExeComm;
var gPortsComm;
var gBsComm = new Comm.client.webext();

// this is how to do it without CommHelper
var callInAPort = Comm.callInX2.bind(null, 'gPortsComm', null); // must pass first arg as `aPortName` // cannot use `gPortsComm` it must be `"gPortsComm"` as string because `gPortsComm` var was not yet assigned
var callInExe = Comm.callInX2.bind(null, 'gExeComm', null, null); // cannot use `gExeComm` it must be `"gExeComm"` as string because `gExeComm` var was not yet assigned
// // can also use CommHelper if using var name of `gBgComm` and `gPortsComm`
// var callInExe = CommHelper.webextbackground.callInExe;
// var callInAPort = CommHelper.webextbackground.callInAPort;
console.log('gBsComm:', gBsComm);
var callInBootstrap = Comm.callInX2.bind(null, gBsComm, null, null);
var callInMainworker = Comm.callInX2.bind(null, gBsComm, 'gWkComm', null);

callInBootstrap('fetchCore', undefined, function(aArg) {
	({ core } = aArg);
	console.log('got core in background, core:', core);
	console.log('geturl:', chrome.runtime.getURL('images/group-outline.svg'));
	preinit();
});

function preinit() {

	var promiseallarr = [];

	promiseallarr.push(new Promise(function(resolve) {
		chrome.runtime.getPlatformInfo(function(platinfo) {
			console.log('platinfo:', platinfo);
			core.platform = platinfo;
			resolve();
		});
	}));

	Promise.all(promiseallarr).then(function(valarr) {
		console.log('valarr:', valarr);

		init();
	});
}

function uninit() {
	// from IRC on 093016 - no need to unregister these ports, they are done for me on addon sutdown
	// gPortsComm.unregister();
	// gExeComm.unregister();
}

function init() {
	// after receiving core
	console.log('in init, core:', core);

	if (core.platform.os == 'android') {
		callInBootstrap('startupAndroid', {
			browseraction: {
				title: chrome.i18n.getMessage('browseraction_label'),
				iconpath: chrome.runtime.getURL('images/group-outline.svg')
			}
		});
	} else {
		gExeComm = new Comm.server.webextexe('profilist', onExeStartup, onExeFailed);
	}
}

function onExeFailed(err) {
	console.error('failed to connect to exe, err:', err)
}

function onExeStartup() {
	console.log('ok exe started up');

	gPortsComm = new Comm.server.webextports();
	startupBrowserAction();
}

// start - browseraction
function startupBrowserAction() {
	chrome.browserAction.onClicked.addListener(onBrowserActionClicked);
}
function onBrowserActionClicked() {
	// chrome.tabs.create({
	// 	url: chrome.extension.getURL('pages/options.html')
	// });
	//
	// setTimeout(function() {
	// 	console.log('opening menu.html now');
	// 	chrome.tabs.create({
	// 		url: chrome.extension.getURL('pages/menu.html')
	// 	});
	// }, 1000);

	callInExe('testCallFromBgToExe', {sub:'hi there'}, function(aArg, aComm) {
		console.log('in callback of testCallFromBgToExe', 'aArg:', aArg, 'aComm:', aComm);
	});
}
// end - browseraction

function testCallFromExeToBg(aArg, aReportProgress, aComm) {
	console.log('in testCallFromPortToBg', 'aArg:', aArg, 'aReportProgress:', aReportProgress, 'aComm:', aComm);
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
