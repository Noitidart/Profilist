var gBgComm = new Comm.client.webextports('tab');

var callInBackground = Comm.callInX.bind(null, gBgComm, null);
var callInExe = Comm.callInX.bind(null, gBgComm, 'callInExe');

// callInBackground('testCallFromPortToBg', 'hi there');
callInBackground('testCallFromPortToBg', 'hi there', function(aArg, aComm) {
	console.log('in callback of testCallFromTabToBg', 'aArg:', aArg, 'aComm:', aComm);
});

// function testCallFromBgToTab(aArg, aReportProgress, aComm, aTabId) {
// 	// aReportProgress is undefined if background is not waiting for reply back
// 	console.log('in testCallFromBgToTab', 'aArg:', aArg, 'aReportProgress:', aReportProgress, 'aComm:', aComm, 'aTabId:', aTabId);
//
// 	if (aReportProgress) { // tab who triggered, has a callback setup
// 		aReportProgress({ iprogress:'step' });
// 	}
//
// 	var promisemain = new Promise(function(resolve) {
// 		setTimeout(function() {
// 			resolve({ ireturn:'promise' });
// 		}, 2000);
// 	});
// 	// return { ireturn:'this' };
// 	return promisemain;
// }
//
// setTimeout(function() {
// 	callInBackground('callFromTabToBgTestTabId');
// }, 5000);
