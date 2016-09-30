var gBgComm = new Comm.client.webexttabs();

var callInBackground = Comm.callInX.bind(null, gBgComm, null);
var callInExe = Comm.callInX.bind(null, gBgComm, 'callInExe');

function testCallFromPortToBg(aArg, aReportProgress, aComm, aTabId) {
	console.error('SHOULD NOT EVER TRIGGER! I am testing if doing `callInBackground` from one tab (menu.js) will cause event listener in another tab (options.js) to trigger. `testCallFromPortToBg` is defined in background.js and i copied here to test. I dont want it sending message to other tabs who also registered chrome.runtime.onMessage because then its sending copies of data everywhere! and data is only needed to background!');
	return;
	// aReportProgress is undefined if the tab who triggered this function is not waiting for reply back
	console.log('in testCallFromTabToBg', 'aArg:', aArg, 'aReportProgress:', aReportProgress, 'aComm:', aComm, 'aTabId:', aTabId);

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
