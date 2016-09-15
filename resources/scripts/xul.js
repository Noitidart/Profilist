// responsible for the xul menu in the main window
var { callInMainworker, callInBootstrap } = CommHelper.content;

var Profilist = {
	initxul: function() {
		console.log('in initxul');
		callInBootstrap('testalert');
	}
};
setTimeout(()=>alert('going to set gBsComm'), 1000);
var gBsComm = new Comm.client.content(Profilist.initxul);
