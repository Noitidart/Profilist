var gBgComm = new Comm.client.webexttabs();

var callInBackground = Comm.callInX.bind(null, gBgComm, null);

callInBackground('testCallFromTabToBg', 'hi there', function(aArg, aComm) {
	console.log('in callback of testCallFromTabToBg', 'aArg:', aArg, 'aComm:', aComm);
});
