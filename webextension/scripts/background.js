console.error('in bg.js');
var port = browser.runtime.connectNative('profilist');
port.onMessage.addListener(function (response) {
	console.log('Received: ', response);
});

browser.browserAction.onClicked.addListener(function() {

	console.log('Sending:  ping');
	port.postMessage('ping');

	chrome.tabs.create({
		url: chrome.extension.getURL('my-page.html')
	});

});
