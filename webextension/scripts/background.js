console.error('in bg.js');
var port = browser.runtime.connectNative('profilist');
port.onMessage.addListener(response => console.log('Received: ', response) );

browser.browserAction.onClicked.addListener(() => {
	console.log('Sending:  ping');
	port.postMessage('ping');
});
