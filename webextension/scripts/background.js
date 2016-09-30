var core;
var callInExe;
var callInContent;

var gExeComm;
var gPortsComm;

var callInPort = Comm.callInX2.bind(null, 'gPortsComm', null); // must pass first arg as `aPortName` // cannot use `gPortsComm` it must be `"gPortsComm"` as string because `gPortsComm` var was not yet assigned
var callInExe = Comm.callInX.bind(null, 'gExeComm', null); // cannot use `gExeComm` it must be `"gExeComm"` as string because `gExeComm` var was not yet assigned

browser.runtime.sendMessage('WEBEXT_INIT').then(aReply => {
	console.log('background js received response to WEBEXT_INIT, aReply:', aReply);
	({ core } = aReply);
	init();
});

function init() {
	// after receiving core
	console.log('in init, core:', core);

	gExeComm = new Comm.server.webextexe('profilist', onExeStartup, onExeFailed);
	gPortsComm = new Comm.server.webextports();
}

function onExeFailed(err) {
	console.error('failed to connect to exe, err:', err)
}

function onExeStartup() {
	console.log('ok exe started up');

	chrome.browserAction.onClicked.addListener(function() {

		// if (callInExe) {
			// chrome.tabs.create({
			// 	url: chrome.extension.getURL('pages/options.html')
			// });

			// setTimeout(function() {
				console.log('opening menu.html now');
				chrome.tabs.create({
					url: chrome.extension.getURL('pages/menu.html')
				});
			// }, 1000);
		// }
		// else { console.error('callInExe is missing!') }

	});

}

function CommServerExe() {
	console.error('in bg.js');
	var port = browser.runtime.connectNative('profilist');
	port.onMessage.addListener(function (response) {
		console.log('Received: ', response);
	});
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

// function callFromTabToBgTestTabId(aArg, aReportProgress, aComm, aTabId) {
// 	var tabid = aTabId;
// 	setTimeout(function() {
// 		console.log('ok starting calling into tab');
// 		// callInLastTab = Comm.callInX2.bind(null, gTabsComm, null, tabid); // can use 'gTabsComm' as string here as well
// 		// callInLastTab('testCallFromBgToTab', 'hithere', function(aArg, aComm) {
// 		// 	console.log('in callback of testCallFromBgToTab', 'aArg:', aArg, 'aComm:', aComm);
// 		// });
//
// 		callInTab(tabid, 'testCallFromBgToTab', 'hithere', function(aArg, aComm) {
// 			console.log('in callback of testCallFromBgToTab', 'aArg:', aArg, 'aComm:', aComm);
// 		});
// 	}, 5000);
// 	return 'ok after 5 sec will start calling into tab';
// }
