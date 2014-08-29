const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const myPrefBranch = 'extensions.Profilist@jetpack.';
const subDataSplitter = '::'; //used if observer from cp-server wants to send a subtopic and subdata, as i cant use subject in notifyObserver, which sucks, my other option is to register on a bunch of topics like `profilist.` but i dont want to 
const clientId = Math.random();

Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
var ini;

document.addEventListener('DOMContentLoaded', setup, false);
window.addEventListener('unload', uninit, false);

function setup() {
	for (var o in observers) {
		observers[o].reg();
	}
	
	AddonManager.getAddonByID('Profilist@jetpack', function(addon) {
		document.getElementById('Profilist.autoupdate').value = addon.applyBackgroundUpdates;
		//addon.applyBackgroundUpdates = 0; //off
		//addon.applyBackgroundUpdates = 1; //default
		//addon.applyBackgroundUpdates = 2; //on
	});
	
	//Services.obs.notifyObservers(null, 'profilist-cp-server', ['query-client-born', clientId].join(subDataSplitter)); //i sent notification to server. server sends back data as string. i use that to do stuff here.
	cpCommPostMsg(['query-client-born', clientId].join(subDataSplitter));
}

function uninit() {
	for (var o in observers) {
		observers[o].unreg();
	}
	//Services.obs.notifyObservers(null, 'profilist-cp-client', 'client-closing-if-i-no-other-clients-then-shutdown-listeners'); //must do this after unregistering observers here, otherwise this guys observers will send back a message saying its open but when its actually closing
	cpCommPostMsg('client-closing-if-i-no-other-clients-then-shutdown-listeners');
}

function readIniToDom() {
	console.log('start readIniToDom on client', clientId);
	//start - populate shortcut select
	var profileNames = [];
	var profileIdentifiers = [];
	
	//console.log('INI IS:', ini);
	
	for (var p in ini) {
		if ('num' in ini[p]) {
			profileNames.push([ini[p].props.Name, ini[p].props.Path]);
		}
	}
	//console.log('profileNames arr populated:', profileNames);
	profileNames.sort(function(a, b) {
		a = a[0];
		b = b[0];
		return a > b;
	});
	var shortcutSelect = document.querySelector('#profiles');
	var opts = shortcutSelect.querySelectorAll('option');
	for (var i=opts.length-1; i>0; i--) {
	  opts[i].parentNode.removeChild(opts[i])
	}
	for (var i=0; i<profileNames.length; i++) {
		var opt = document.createElement('option');
		opt.text = profileNames[i][0];
		opt.value = profileNames[i][1];
		shortcutSelect.appendChild(opt);
	}
	//end - populate shortcut select
	for (var p in ini.General.props) {
		if (p.indexOf('Profilist.') > -1) {
			var control = document.getElementById(p);
			if (control) {
				control.value = ini.General.props[p];
			} else {
				console.warn('no control found for', p);
			}
		}
	}
	//Services.obs.notifyObservers(null, 'profilist-cp-client', 'read-ini-to-tree'); //this also handles updating pref-to-dom if it finds that ini is missing some pref values, it updates dome with deafult value
	//cpCommPostMsg('read-ini-to-tree');
	//end - make sure prefs on tree are what is pref values in ini
	
	console.log('finished readIniToDom on client', clientId);
}

function cpCommPostMsg(msg) {
	console.info('"profilist-cp-client" (id: ' + clientId + ') sending message to "profilist-cp-server"', 'msg:', msg);
	Services.obs.notifyObservers(null, 'profilist-cp-client', msg);
}

var observers = {
	'profilist-cp-server': {
		observe: function (aSubject, aTopic, aData) {
			console.info('incoming message to client (id:' + clientId +')  from "profilist-cp-server"', 's', aSubject, 't', aTopic, 'd', aData);
			var aDataSplit = aData.split(subDataSplitter);
			if (aDataSplit.length == 1) {
				var subTopic = aData;
				var subData = aData;
			} else if (aDataSplit.length == 2) {
				var subTopic = aDataSplit[0];
				var subData = aDataSplit[1];
			} else {
				var subTopic = aDataSplit[0];
				//var subData = subDataSplitter + 'ARRAY';
				var subDataArr = aDataSplit.slice(1);
			}

			switch (subTopic) {
				case 'response-client-born':
					var responseJson = JSON.parse(subData);
					if (responseJson.clientId == clientId) {
						ini = responseJson.ini;
						//ini = JSON.parse(JSON.stringify(responseJson.ini));
						console.error('just read ini as =', ini);
						readIniToDom();
					} else {
						//this isnt the client that was just born. in other words, this isnt the client that asked for birth data
					}
					break;
				case 'read-ini-to-dom':
					ini = JSON.parse(subData);
					readIniToDom();
					break;
				case 'pref-to-dom':
					//also update clients ini object to have this pref value
					//note: server should handle writing the pref-to-ini
					var pref_name = subDataArr[0];
					var pref_val = subDataArr[1];
					var control = document.getElementById('Profilist.' + pref_name);
					if (control) {
						control.value = pref_val;
					} else {
						console.warn('no control found for', pref_name);
					}
					//ini.General.props['Profilist.' + pref_name] = pref_val; //i dont think this should be here 082914 12p
					break;
				case 'query-clients-alive': //should rename to `query-clients-alive-for-enabling-or-keeping-listeners-alive'
					//server is wondering if any clients are alive so it can --> restart its processes/listeners to support clients alive
					//Services.obs.notifyObservers(null, 'profilist-cp-client', 'response-clients-alive');
					cpCommPostMsg(['response-clients-alive', 'clientId = ' + clientId].join(subDataSplitter));
					break;
				case 'query-clients-alive-for-win-activated-ini-refresh-and-dom-update':
					//Services.obs.notifyObservers(null, 'profilist-cp-client', 'reponse-clients-alive-for-win-activated-ini-refresh-and-dom-update');
					cpCommPostMsg('reponse-clients-alive-for-win-activated-ini-refresh-and-dom-update');
					break;
				default:
					throw new Error('"profilist-cp-server": subTopic of "' + subTopic + '" is unrecognized');
			}
		},
		reg: function () {
			Services.obs.addObserver(observers['profilist-cp-server'], 'profilist-cp-server', false);
		},
		unreg: function () {
			Services.obs.removeObserver(observers['profilist-cp-server'], 'profilist-cp-server');
		}
	}
};


/* start - non communication stuff, just internal js like creating shortcuts and handling select changes*/
	var changeTracker = {};
	function selectChange(e) {
		//start test if really changed
		var targ = e.target;
		if (targ.id in changeTracker) {
			//if (this.text == this.changeTracker.text
		}
		//end test if really changed
		console.log('targ', targ);
		console.log('selected changed, new profile name =', targ[targ.selectedIndex].text, targ[targ.selectedIndex].value);
		var profile_name = targ[targ.selectedIndex].text;
		var identifier = targ[targ.selectedIndex].value;
		createShortcut(identifier);
	}
	
	function createShortcut(identifier) {
		var loader = document.querySelector('#scLoader');
		loader.style.opacity = 1;
		
		var prof_props;
		for (var p in ini) {
			if ('num' in ini[p]) {
				//is profile
				if (ini[p].props.Path == identifier) {
					prof_props = ini[p].props;
					break;
				}
			}
		}
		if (!prof_props) {
			alert('ERROR - Could not find idnetifier of "' + identifier + '" in profiles list');
			loader.style.opacity = 0;
			return;
		}
		
		if (prof_props.IsRelative == '1') {
			var dirName = OS.Path.basename(OS.Path.normalize(prof_props.Path));
			var fullPathToProfile = OS.Path.join(FileUtils.getFile('DefProfRt', []).path, dirName);
		} else {
			var fullPathToProfile = prof_props.Path;
		}
		
		loader.style.display = 'flex-block';
		if (OS.Constants.Sys.Name == 'WINNT') {
			var exe = FileUtils.getFile('XREExeF', []);
			var myShortcut = FileUtils.getFile('Desk', ['Mozilla Firefox - ' + prof_props.Name + '.lnk']);
			var myShortcutWin = myShortcut.QueryInterface(Ci.nsILocalFileWin);

			//var myScIcon = new FileUtils.File('moz-icon:' + Services.io.newFileURI(exe).spec);
			//can use identifier as path because identifier is path. i thought but it didnt work out right so moving tgo full path to profile
			myShortcutWin.setShortcut(exe, null, '-profile "' + fullPathToProfile + '" -no-remote', 'Launches Mozilla Firefox with "' + prof_props.Name + '" Profile', exe);
		} else if (OS.Constants.Sys.Name == '') {
		
		} else {
			alert('Unrecognized Operating System - Desktop shortcut creation failed');
		}
		
		loader.style.opacity = 0;
	}
	
	function changeIcon(e) {
		var target = e.target;
		var oTarg = e.originalTarget;
		if (oTarg.classList.contains('browse-icon')) {
			//clicked browse icon
			alert('open browse');
			return;
		}
		if (oTarg.classList.contains('change-icon')) {
			target = target.parentNode;
		}
		if (target.classList.contains('release')) {
			target.classList.remove('release');
			target.classList.add('beta');
		} else if (target.classList.contains('beta')) {
			target.classList.remove('beta');
			target.classList.add('aurora');
		} else if (target.classList.contains('aurora')) {
			target.classList.remove('aurora');
			target.classList.add('nightly');
		} else if (target.classList.contains('nightly')) {
			target.classList.remove('nightly');
			target.classList.add('browse');
		} else if (target.classList.contains('browse')) {
			target.classList.remove('browse');
			target.classList.add('release');
		}
	}
	
	function browseEnter(e) {
		console.log('hide swithcer');
		e.target.parentNode.classList.add('noswitch');
		//var iconSwitcher = e.target.parentNode.querySelector('.change-icon');
		//iconSwitcher.style.opacity = '0';
	}
	
	function browseLeave(e) {
		console.log('make icon in app dir');
		e.target.parentNode.classList.remove('noswitch');
		//var iconSwitcher = e.target.parentNode.querySelector('.change-icon');
		//iconSwitcher.style.opacity = '';
	}
	
	//this contians some communication stuff
	 function updatePrefAndIni_to_UserSetting(e) {
		var targ = e.target;
		var selectedText = targ[targ.selectedIndex].text;
		var selectedValue = targ[targ.selectedIndex].value;
		
		if (targ.id.substr(0, 10) != 'Profilist.') {
			console.warn('not set up to listen to non-Profilist. selects');
			return;
		}
		var pref_name = targ.id.substr(10);
		console.log('pref_name of select:', pref_name);
		console.log('newval:', selectedValue);
		
		if (pref_name == 'autoupdate') {
			AddonManager.getAddonByID('Profilist@jetpack', function(addon) {
				addon.applyBackgroundUpdates = selectedValue;
				//addon.applyBackgroundUpdates = 0; //off
				//addon.applyBackgroundUpdates = 1; //default
				//addon.applyBackgroundUpdates = 2; //on
			});
		} else {
			//Services.obs.notifyObservers(null, 'profilist-cp-client', ['update-ini-with-selected-pref-value', pref_name, selectedValue].join(subDataSplitter));
			cpCommPostMsg(['update-pref-so-ini-too-with-user-setting', pref_name, selectedValue].join(subDataSplitter));
		}
	 }
	 //end - this contains some communication stuff
/* end - non communication stuff, just internal js like creating shortcuts and handling select changes*/