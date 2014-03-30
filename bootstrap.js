const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Profilist',
	chrome_path: 'chrome://profilist/content/',
	aData: 0,
};

const myServices = {};
var cssUri;
var collapsedheight = 0; //holds height stack should be when collapsed
var expandedheight = 0; //holds height stack should be when expanded
var stackDOMJson = []; //array holding menu structure in stack
var exeInited = false;
var unloaders = {};

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });
XPCOMUtils.defineLazyGetter(myServices, 'proc', function(){ return Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess) });
XPCOMUtils.defineLazyGetter(myServices, 'tps', function(){ return Cc['@mozilla.org/toolkit/profile-service;1'].createInstance(Ci.nsIToolkitProfileService) });

var pathProfilesIni = OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profiles.ini');
var ini = {};
var profToolkit = {
	rootPathDefault: 0,
	localPathDefault: 0,
	profileCount: 0,
	/*profiles: {},*/
	selectedProfile: 0, //reference to the profiles object but to the current profile in the profiles object
};

var decoder = 0;
var encoder = 0;

function readIni() {
	console.log('in read');
	if (!decoder) {
		console.log('decoder not inited');
		decoder = new Services.appShell.hiddenDOMWindow.TextDecoder(); // This decoder can be reused for several reads
	}
	console.log('decoder got');
	console.log('starting read');
	let promise = OS.File.read(pathProfilesIni); // Read the complete file as an array
	console.log('read promise started');
	promise = promise.then(
		function onSuccess(ArrayBuffer) {
			var readStr = decoder.decode(ArrayBuffer); // Convert this array to a text
			console.log(readStr);
			ini = {};
			var patt = /\[(.*?)(\d*?)\](?:\s+?([\S]+)=([\S]+))(?:\s+?([\S]+)=([\S]+))?(?:\s+?([\S]+)=([\S]+))?(?:\s+?([\S]+)=([\S]+))?(?:\s+?([\S]+)=([\S]+))?/mg;
			var blocks = [];

			var match;
			while (match = patt.exec(readStr)) {
				console.log('MAAAAAAAAAAATCH', match);

				var group = match[1];
				ini[group] = {};

				if (group == 'Profile') {
					ini[group]['num'] = match[2];
				}

				ini[group].props = {};

				for (var i = 3; i < match.length; i = i + 2) {
					var prop = match[i];
					if (prop === undefined) {
						break;
					}
					var propVal = match[i + 1]
					ini[group].props[prop] = propVal;
				}

				if (group == 'Profile') {
					//Object.defineProperty(ini, ini[group].props.Name, Object.getOwnPropertyDescriptor(ini[group], group));
					ini[ini[group].props.Name] = ini[group];
					delete ini[group];
				}
			}
			console.log('successfully read ini = ', ini);
			updateProfToolkit();
			return ini;
		},
		function onReject() {
			console.error('Read ini failed');
		}
	);

	return promise;
}

function writeIni() {
	var writeStr = [];
	var profileI = -1;
	for (var p in ini) {


		if ('num' in ini[p]) {
			//is profile
			profileI++; //because we init profileI at -1
			var group = 'Profile' + profileI;
			if (ini[p].num != profileI) {
				console.log('profile I of profile changed from ' + ini[p].num + ' to ' + profileI + ' the object from ini read is =', ini[p]);
			}
		} else {
			var group = p;
		}

		writeStr.push('[' + group + ']');

		for (var p2 in ini[p].props) {
			writeStr.push(p2 + '=' + ini[p].props[p2]);
		}

		writeStr.push('');
	}

	writeStr[writeStr.length - 1] = '\n'; //we want double new line at end of file

	if (!encoder) {
		encoder = new Services.appShell.hiddenDOMWindow.TextEncoder(); // This encoder can be reused for several writes
	}
	
	let BufferArray = encoder.encode(writeStr.join('\n')); // Convert the text to an array
	let promise = OS.File.writeAtomic(pathProfilesIni, BufferArray, // Write the array atomically to "file.txt", using as temporary
		{
			tmpPath: pathProfilesIni + '.profilist.tmp'
		}); // buffer "file.txt.tmp".
	promise.then(
		function() {},
		function() {
			console.error('writeIni failed');
		}
	);
	return promise;
}
/*start - salt generator from http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js?raw=1*/
var kSaltTable = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
	'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
];

var kSaltString = '';
for (var i = 0; i < 8; ++i) {
	kSaltString += kSaltTable[Math.floor(Math.random() * kSaltTable.length)];
}

function saltName(aName) {
	return kSaltString + '.' + aName;
}
/*end - salt generator*/
function createProfile(refreshIni, profName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				createProfile(2, profName);
			},
			function() {
				console.error('Failed to refresh ini object from file during renameProfile');
			}
		);
	} else {
		if (profName in ini) {
			Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot create profile with name "' + newName + '" because this name is already taken by another profile.');
			return;		
		}
		//create folder in root dir (in it, one file "times.json" with contents:
		/*
		{
		"created": 1395861287491
		}

		*/
		//todo: im curious i should ask at ask.m.o how come when profile is custom driectory, a folder in local path is not created, of course the one to the custom path will be root. b ut why not make a local folder? like is done for IsRelative createds?
		//create folder in local dir if root dir is different (this one is empty)
		//add to profiles ini
		//check if profile exists first
		var numProfiles = Object.keys(ini) - 1;
		var dirName = saltName(profName);
		ini[profName] = {
			num: numProfiles,
			props: {
				Name: profName,
				IsRelative: 1,
				Path: 'Profiles/' + dirName
			}
		}
		
		var rootPathDefaultDirName = OS.File.join(profToolkit.rootPathDefault, dirName);
		var localPathDefaultDirName = OS.File.join(profToolkit.localPathDefault, dirName);
		var promise = OS.File.makeDir(rootPathDefaultDirName);
		promise.then(
			function onSuc() {
				console.log('successfully created root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
					let encoder = new TextEncoder();
					let BufferArray = encoder.encode('{\n"created": ' + new Date().getTime() + '}\n');
					let promise3 = OS.File.writeAtomic(OS.Path.join(rootPathDefaultDirName, 'times.json'), BufferArray,
						{
							tmpPath: OS.Path.join(rootPathDefaultDirName, 'times.json') + '.profilist.tmp'
						}
					);
					promise3.then(
						function() {
							console.log('succesfully created times.json for profName of ' + profName + ' path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
						},
						function() {
							console.error('FAILED creating times.json for profName of ' + profName + ' failed times.json path is = ', OS.Path.join(rootPathDefaultDirName, 'times.json'));
						}
					);
					return promise3;
			},
			function onRej() {
				console.error('FAILED to create root dir for profile ' + profName + ' the path is = ', rootPathDefaultDirName);
			}
		);
		if (profToolkit.rootPathDefault != profToolkit.localPathDefault) {
			var promise2 = OS.File.makeDir(localPathDefaultDirName);
			promise2.then(
				function onSuc() {
					console.log('successfully created local dir for profile ' + profName + ' the path is = ', localPathDefaultDirName);
				},
				function onRej() {
					console.error('FAILED to create local dir for profile ' + profName + ' the path is = ', localPathDefaultDirName);
				}
			);
		}
		
		//see here: http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/createProfileWizard.js
		
/*
29     var dirService = C["@mozilla.org/file/directory_service;1"].getService(I.nsIProperties);
30     gDefaultProfileParent = dirService.get("DefProfRt", I.nsIFile);
73   var defaultProfileDir = gDefaultProfileParent.clone();
74   defaultProfileDir.append(saltName(document.getElementById("profileName").value));
75   gProfileRoot = defaultProfileDir;
*/

		//see here for internal: http://mxr.mozilla.org/mozilla-aurora/source/toolkit/profile/content/profileSelection.js#139
		//actually see here for internal: http://mxr.mozilla.org/mozilla-central/source/toolkit/profile/nsToolkitProfileService.cpp#699
		
	}
}

function renameProfile(refreshIni, profName, newName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				renameProfile(2, profName, newName);
			},
			function() {
				console.error('Failed to refresh ini object from file during renameProfile');
			}
		);
	} else {
		//check if name is taken
		if (profName in ini == false) {
			Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot delete it.');
			return;		
		}
		if (newName in ini) {
			Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot rename to "' + newName + '" because this name is already taken by another profile.');
			return;		
		}
		ini[profName].props.Name = newName;
		var promise = writeIni();
		promise.then(
			function onSuc() {
				console.log('successfully edited name of ' + profName + ' to ' + newName + ' in Profiles.ini');
			},
			function onRej() {
				console.error('FAILED to edit name of ' + profName + ' to ' + newName + ' in Profiles.ini');
			}
		);
	}
	
	
}

function deleteProfile(refreshIni, profName) {
	//refreshIni is 0,1 or programmatically 2
	if (refreshIni == 1) {
		var promise = readIni();
		promise.then(
			function() {
				deleteProfile(2, profName);
			},
			function() {
				console.error('Failed to refresh ini object from file on deleteProfile');
			}
		);
	} else {
		//before deleting check if its default profile
		if (profName in ini == false) {
			Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot find this profile name, "' + profName + '" so cannot delete it.');
			return;		
		}
		//if (Object.keys(ini).length == 2) {
			//Services.prompt.alert(null, self.name + ' - ' + 'EXCEPTION', 'Cannot delete this profile as it is the last profile remaining.');
			//return;
		//}
		//todo: figure out how to check if the profile is running, if it is dont delete but msg its open		
		if (ini[profName].props.IsRelative == '1') {
			var PathRootDir = OS.Path.join(profToolkit.rootPathDefault, profToolkit.profiles[profName].rootDirName);
			var PathLocalDir = OS.Path.join(profToolkit.localPathDefault, profToolkit.profiles[profName].localDirName);
			
			var promise = OS.File.remove(PathRootDir);
			promise.then(
				function() {
					console.log('successfully removed PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir);
				},
				function() {
					console.warn('FAILED to remove PathRootDir for profName of ' + profName, 'PathRootDir=', PathRootDir);
				}
			);
			var promise2 = OS.File.remove(PathLocalDir);
			promise2.then(
				function() {
					console.info('successfully removed PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir);
				},
				function() {
					console.warn('FAILED to remove PathLocalDir for profName of ' + profName, 'PathLocalDir=', PathLocalDir);
				}
			);
		} else {
			var Path = ini[profName].props.Path;
			var promise = OS.File.remove(Path);
			promise.then(
				function() {
					console.log('successfully removed Path for profName of ' + profName, 'Path=', Path);
				},
				function() {
					console.warn('FAILED to remove Path for profName of ' + profName, 'Path=', Path);
				}
			);
		}
		delete ini[profName];
		var promise0 = writeIni();
		promise0.then(
			function() {
				console.log('successfully edited out profName of ' + profName + ' from Profiles.ini');
			},
			function() {
				console.error('FAILED to edit out profName of ' + profName + ' from Profiles.ini');
			}
		);
	}
}
function initProfToolkit() {
	console.log('in initProfToolkit');
	profToolkit = {};
	profToolkit.localPathDefault = OS.Path.dirname(OS.Constants.Path.localProfileDir); //will work as long as at least one profile is in the default profile folder //i havent tested when only custom profile
	console.log('initProfToolkit 1');
	profToolkit.rootPathDefault = OS.Path.dirname(OS.Constants.Path.profileDir);
	console.log('initProfToolkit 2');
	profToolkit.selectedProfile = {};
	profToolkit.selectedProfile.name = myServices.tps.selectedProfile.name;
	console.log('initProfToolkit 3');
	console.log('tps.selectedProfile.name = ', myServices.tps.selectedProfile.name);
	updateStackDOMJson_basedOnToolkit();
	console.log('initProfToolkit DONE');
}

function updateProfToolkit() {
	if (!profToolkit.selectedProfile) {
		console.log('initing prof toolkit');
		initProfToolkit();
	}
	var profileCount = 0;
	profToolkit.profiles = {};
	for (var p in ini) {
		if ('num' in p) {
			profileCount++;
		}
	}
	profToolkit.profileCount = profileCount;
}

readIni();

function updateStackDOMJson_basedOnToolkit() {
			//update stackDOMJson based on profToolkit
			var stackUpdated = false; //if splice in anything new in or anything old out then set this to true, if true then run dom update
			if (stackDOMJson.length == 0) {
				stackDOMJson = [
					{nodeToClone:'PUIsync', identifier:'.create', label:'Create New Profile', class:'PanelUI-profilist create', id:null, oncommand:null, status:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  addEventListener:['command',createUnnamedProfile,false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					{nodeToClone:'PUIsync', identifier:'[label="' + profToolkit.selectedProfile.name + '"]', label:profToolkit.selectedProfile.name, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,   status:'active', addEventListener:['mousedown', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profname:profToolkit.selectedProfile.name}}
				];
				var profNamesCurrentlyInMenu = [profToolkit.selectedProfile.name];
				stackUpdated = true;
			} else {
				var profNamesCurrentlyInMenu = [];
				for (var i=0; i<stackDOMJson.length; i++) {
					var m = stackDOMJson[i];
					if ('props' in m && 'profname' in m.props) {
						if (!(m.props.profname in ini)) {
							//this is in the stack/menu but no longer exists so need to remove
							stackUpdated = true;
							stackDOMJson.splice(i, 1);
							i--;
						} else {
							profNamesCurrentlyInMenu.push(m.props.profname);
						}
					}
				}
			}			
			
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
				if (profNamesCurrentlyInMenu.indexOf(p) > -1) { continue }
				

					console.log('splicing p = ', ini[p]);
					stackUpdated = true;
					(function(pClosure) {
						//stackDOMJson.splice(0, 0, {nodeToClone:'PUIsync', identifier:'[label="' + profToolkit.profiles[p].name + '"]', label:profToolkit.profiles[p].name, class:'PanelUI-profilist', id:null, oncommand:null, status:'inactive', addEventListener:['command', function(){ launchProfile(profToolkit.profiles[p].name) }, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profid:profToolkit.profiles[p].id, profname:profToolkit.profiles[p].name}});
						var objToSplice = {nodeToClone:'PUIsync', identifier:'[label="' + p + '"]', label:p, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:'inactive', addEventListener:['command', function(){ launchProfile(p) }, false], addEventListener2:['mousedown', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profname:p}};
						
						
						if (p == profToolkit.selectedProfile.name) {
							//should never happend because stackDOMJson length was not 0 if in this else of the parent if IT WIL CONTNIUE on this: if (profIdsCurrentlyInMenu.indexOf(p.id) > -1) { continue }
							//actually this CAN happen because i will now be running refresh from time to time and user may rename current profile
							//stackDOMJson.push({nodeToClone:'PUIsync', identifier:'[label="' + p.name + '"]', label:p.name, class:'PanelUI-profilist', id:null, status:'active', style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profid:p.id, profname:p.name}});
							objToSplice.status = 'active';
							delete objToSplice.addEventListener;
						}
						
						stackDOMJson.splice(0, 0, objToSplice);
					})(p);
			}
			console.info('stackDOMJson after promise fin = ', stackDOMJson);
			if (stackUpdated) {
				console.info('something was changed in stack so will update all menus now');
				let DOMWindows = Services.wm.getEnumerator(null);
				while (DOMWindows.hasMoreElements()) {
					let aDOMWindow = DOMWindows.getNext();
					if (aDOMWindow.document.querySelector('#profilist_box')) { //if this is true then the menu was already crated so lets update it, otherwise no need to update as we updated the stackDOMJson and the onPopupShowing will handle menu create
						updateMenuDOM(aDOMWindow, stackDOMJson);
					}
				}
			}
}

var observers = {
    /*
    inlineOptsHid: {
        observe:    function(aSubject, aTopic, aData) {
                        //##Cu.reportError('incoming inlineOptsHid: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
                        if (aTopic == 'addon-options-hidden' && aData == selfId + '@jetpack') {
                            addonMgrXulWin = null; //trial as of 112713
                        }
                    },
        reg:    function() {
                obs.addObserver(observers.inlineOptsHid, 'addon-options-hidden', false);
            },
        unreg:    function() {
                obs.removeObserver(observers.inlineOptsHid, 'addon-options-hidden');
            }
    }
    */
    'profile-do-change': {
        observe: function(aSubject, aTopic, aData) {
			console.info('incoming profile-do-change: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
        },
        reg: function() {
			Services.obs.addObserver(observers['profile-do-change'], 'profile-do-change', false);
        },
        unreg: function() {
			Services.obs.removeObserver(observers['profile-do-change'], 'profile-do-change');
        }
    },
    'profile-before-change': {
        observe: function(aSubject, aTopic, aData) {
			console.info('incoming profile-before-change: aSubject = ' + aSubject + ' | aTopic = ' + aTopic + ' | aData = ' + aData);
        },
        reg: function() {
			Services.obs.addObserver(observers['profile-before-change'], 'profile-before-change', false);
        },
        unreg: function() {
			Services.obs.removeObserver(observers['profile-before-change'], 'profile-before-change');
        }
    }
};

function makeRename() {
	//only allow certain chracters
	//cannot rename profile to a name that already exists
	
	//makes the menu button editable field and keeps popup open till blur from field
	var el = this;
	el.style.fontWeight = 'bold';
	
	var doc = this.ownerDocument;
	//var PanelUI = doc.querySelector('#PanelUI-popup');
	//PanelUI.addEventListener('popuphiding', prevHide, false) // //add on blur it should remove prevHide //actually no need for this because right now on blur it is set up to hide popup
	
	//make the el button an editable field
	//add event listener on blur it should cancel and restore menu look (as in not editable)
	//add event listener on enter submitRename
	
	if (this.getAttribute('status') == 'active') {
		//make editable right away
	} else {
		//make editable in 300ms if user doesnt mouseup
	}
}

function submitRename() {
	//when user presses enter in field
}

function launchProfile(profName) {

	Services.prompt.alert(null, self.name + ' - ' + 'INFO', 'Will attempt to launch profile named "' + profName + '".');

	var found = false;
	for (var p in ini) {
		if (!('num' in ini[p])) { continue } //as its not a profile
		if (profName == p) {
			found = true;
			break;
		}
	}
			
	if (!found) {
		Services.prompt.alert(null, self.name + ' - ' + 'ERROR', 'An error occured while trying to launch profile named "' + profName + '": Proflie name not found in memory.');
		console.info('dump of profiles = ', ini);
		return false;
	}

	if (!exeInited) {
		var exe = FileUtils.getFile('XREExeF', []); //this gives path to executable
		try {
			myServices.proc.init(exe);
			exeInited = true;
		} catch (ex) {
			console.warn('exception thrown on nsiProc.init of exe, probably already initalized: ex = ', ex);
		}
	}
	var args = ['-P', profName, '-no-remote'];
	myServices.proc.run(false, args, args.length);
}

function createUnnamedProfile() {
	//creating profile with name that already exists does nothing	
	var promise = readIni();
	promise.then(
		function() {
			for (var p in ini) {
				if (!('num' in ini[p])) { continue } //as its not a profile
				profNamesCurrentlyInMenu.push(p);
			}
			
			var digit = 1;
			var profName = 'Unnamed Profile'; //creates with default name
			while (profName in ini) {
				digit++;
			}
			profName = profName + ' ' + digit;

			createProfile(0, profName);
		},
		function () {
			console.error('createProfile readIni promise rejected');
		}
	);
}

function prevHide(e) {
	e.preventDefault();
	e.stopPropagation();
}

function updateMenuDOM(aDOMWindow, json) {
	//identifier is the querySelector to run to match the element, if its matched it updates this el, if not matched then creates new el based on nodeToClone
	var profilist_box = aDOMWindow.document.querySelector('#profilist_box');
	if (!profilist_box) {
		console.warn('no profilist_box to add to');
		return;
	}
	var stack = profilist_box.childNodes[0];
	var stackChilds = stack.childNodes;
	[].forEach.call(stackChilds, function(sc) {
		stack.removeChild(sc);
	});
	
	var cumHeight = 0;
	var elRefs = [];
	var setTops = [];
	var PUIsync;
	for (var i=0; i<json.length; i++) {
		console.log('in json arr = ', i);
		var el = null;
		var appendChild = false;
		if (json[i].identifier) {
			el = stack.querySelector(json[i].identifier);
			console.log('identifier  string = "' + json[i].identifier + '"');
			console.log('el = ' + el);
		}
		if (!el) {
			if (json[i].nodeToClone == 'PUIsync') {
				if (!PUIsync) {
					PUIsync = aDOMWindow.document.querySelector('#PanelUI-popup').querySelector('#PanelUI-fxa-status');
				}
				json[i].nodeToClone = PUIsync;
			}
			el = json[i].nodeToClone.cloneNode(true);
			appendChild = true;
			console.log('el created');
		} else {
			console.log('el idented');
		}
		elRefs.push(el);
		
		for (var p in json[i]) {
			if (p == 'nodeToClone' || p == 'identifier' || p == 'props') { continue }
			if (p.indexOf('addEventListener') == 0) {
				(function(elClosure, jsonIClosure, pClosure) {
					console.log('elClosure',elClosure.getAttribute('label'),'jsonIClosure',jsonIClosure);
					elClosure.addEventListener(jsonIClosure[pClosure][0], jsonIClosure[pClosure][1], jsonIClosure[pClosure][2]);
				})(el, json[i], p);
				continue;
			}
			if (json[i][p] === null) {
				el.removeAttribute(p);
			} else {
				el.setAttribute(p, json[i][p]);
			}
		}
		if (appendChild) {
			stack.appendChild(el);
			console.log('appended', el);
		}
		console.log('el.boxObject.height = ', el.boxObject);
		cumHeight += el.boxObject.height;
		console.log('cumHeight after adding = ' + cumHeight);
		if (i < json.length - 1) {
			//el.setAttribute('top', cumHeight); //cant do this here because stack element expands to fit contents so this will mess up the cumHeight and make it think the element is longe that it is 
			setTops.push(cumHeight);
		} else {
			setTops.push(0);
		}
	}
	collapsedheight = el.boxObject.height;
	expandedheight = cumHeight;
	console.log('collapsedheight', collapsedheight);
	console.log('expandedheight', expandedheight);
	
	[].forEach.call(elRefs, function(elRef, i) {
		elRef.setAttribute('top', setTops[i]);
	});
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.loadIntoWindow(aDOMWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		
		for (var u in unloaders) {
			unloaders[u]();
		}
		
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {
			var PUIsync = PanelUI.querySelector('#PanelUI-fxa-status');
			console.info('PUIsync on start up = ', PUIsync);
			var PUIsync_height = PUIsync.boxObject.height; //parseInt(aDOMWindow.getComputedStyle(PUIsync, null).getPropertyValue('height'));
			if (PanelUI.state != 'open' && PanelUI.state != 'showing') { //USED TO BE "if (PUIsync_height == 0)"
				console.warn('PanelUI not open', PanelUI);
				var unloaderId = new Date().getTime();
				var createMenuOnPopup = function() {
					PanelUI.removeEventListener('popupshowing', createMenuOnPopup, false);
					delete unloaders[unloaderId];
					console.warn('running loading into window to create menuuuuuuuuuu....');
					windowListener.loadIntoWindow(aDOMWindow);
				}
				unloaders[unloaderId] = function() {
					console.log('RUNNING UNLOADER');
					PanelUI.removeEventListener('popupshowing', createMenuOnPopup, false);
				}
				PanelUI.addEventListener('popupshowing', createMenuOnPopup, false);
				return;
			}
			var PUIf = PanelUI.querySelector('#PanelUI-footer');
			var PUIcs = PanelUI.querySelector('#PanelUI-contents-scroller');
			
			//console.log('PUIcs.style.width',PUIcs.style.width);
			var profilistHBoxJSON =
			['xul:vbox', {id: 'profilist_box'},
				['xul:stack', {key:'profilist_stack',style:'width:100%'}]
			];
			var referenceNodes = {};
			PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, referenceNodes), PUIf.firstChild);
			
			/*must insert the "Default: profile" into stack last*/
			
			console.log('CREATING MENU JSON');
			var PUIfi = PanelUI.querySelector('#PanelUI-footer-inner');
			console.log('PUIsync height', PUIsync.boxObject);
			console.log('PUIfi height', PUIfi.boxObject);
			if (stackDOMJson.length == 0) {
				stackDOMJson = [
					//{nodeToClone:PUIsync, identifier:'.create', label:'Create New Profile', class:'PanelUI-profilist create', id:null, status:null, style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					//{nodeToClone:PUIsync, identifier:'[label="' + cProfName + '"]', label:cProfName, class:'PanelUI-profilist', id:null, status:'active', style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profid:cProfId, profname:cProfName}}
					{nodeToClone:PUIsync, identifier:'.create', label:'Create New Profile', class:'PanelUI-profilist create', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:null, addEventListener:['command',createProfile,false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);'},
					{nodeToClone:PUIsync, identifier:'[label="' + profToolkit.selectedProfile.name + '"]', label:profToolkit.selectedProfile.name, class:'PanelUI-profilist', id:null, oncommand:null, tooltiptext:null, signedin:null, defaultlabel:null, errorlabel:null,  status:'active', addEventListener:['mousedown', makeRename, false], style:'-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);', props:{profname:profToolkit.selectedProfile.name}}
				];
			}
			
			updateMenuDOM(aDOMWindow, stackDOMJson);
			
			referenceNodes.profilist_stack.style.height = collapsedheight + 'px';

			//todo: probably should only do this overflow stuff if scrollbar is not vis prior to mouseenter, but i think for usual case scrollbar is not vis.
			referenceNodes.profilist_stack.addEventListener('mouseenter', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				PUIcs.style.overflow = 'hidden'; //prevents scrollbar from showing
				referenceNodes.profilist_stack.style.height = expandedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.add('perm-hover');
			}, false);
			referenceNodes.profilist_stack.addEventListener('mouseleave', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				referenceNodes.profilist_stack.addEventListener('transitionend', function() {
					referenceNodes.profilist_stack.removeEventListener('transitionend', arguments.callee, false);
					if (referenceNodes.profilist_stack.style.height == collapsedheight + 'px') {
						PUIcs.style.overflow = ''; //remove the hidden style i had forced on it
						console.info('overflow RESET');
					} else {
						console.info('overflow not reset as height is not collapsed height (' + collapsedheight + ') but it is right now = ', referenceNodes.profilist_stack.style.height);
					}
				}, false);
				referenceNodes.profilist_stack.style.height = collapsedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.remove('perm-hover');
			}, false);
		}
		
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {
			PanelUI.removeEventListener('popuphiding', prevHide, false)
			var profilistHBox = aDOMWindow.document.querySelector('#profilist_box');
			if (profilistHBox) {
				profilistHBox.parentNode.removeChild(profilistHBox);
			}
		}
	}
};
/*end - windowlistener*/

/*dom insertion library function from MDN - https://developer.mozilla.org/en-US/docs/XUL_School/DOM_Building_and_HTML_Insertion*/
jsonToDOM.namespaces = {
    html: 'http://www.w3.org/1999/xhtml',
    xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
};
jsonToDOM.defaultNamespace = jsonToDOM.namespaces.html;
function jsonToDOM(xml, doc, nodes) {
    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);        
        return [jsonToDOM.namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || jsonToDOM.defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'key')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
			try {
				elem.appendChild(
									Object.prototype.toString.call(e) == '[object Array]'
									?
										tag.apply(null, e)
									:
										e instanceof doc.defaultView.Node
										?
											e
										:
											doc.createTextNode(e)
								);
			} catch (ex) {
				elem.appendChild(doc.createTextNode(ex));
			}
        });
        return elem;
    }
    return tag.apply(null, xml);
}
/*end - dom insertion library function from MDN*/

function startup(aData, aReason) {
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	console.log('aData', aData);
	//var css = '.findbar-container {-moz-binding:url(' + self.path.chrome + 'findbar.xml#matchword_xbl)}';
	//var cssEnc = encodeURIComponent(css);
	var newURIParam = {
		aURL: self.aData.resourceURI.spec + 'main.css', //'data:text/css,' + cssEnc,
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.register();
	
	//register all observers
	for (var o in observers) {
		observers[o].reg();
	}
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	
	//unregister all observers
	for (var o in observers) {
		observers[o].unreg();
	}
	
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.unregister();
}

function install() {}

function uninstall() {}