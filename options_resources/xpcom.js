const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const myPrefBranch = 'extensions.Profilist@jetpack.';
const subDataSplitter = '::'; //used if observer from cp-server wants to send a subtopic and subdata, as i cant use subject in notifyObserver, which sucks, my other option is to register on a bunch of topics like `profilist.` but i dont want to 
const clientId = Math.random();

Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
var ini;
/*global el holders*/
var innerbg;
var sect_gen;
var sect_dev;
var shortcutSelect;
var loader;
var load_img;
var buildsCont;
/*end - global el holders*/

document.addEventListener('DOMContentLoaded', setup, false);
window.addEventListener('unload', uninit, false);

function setup() {

	/*global el holders*/
	innerbg = document.getElementById('innerbg');
	sect_gen = document.getElementById('sectGen');
	sect_dev = document.getElementById('sectDev');
	shortcutSelect = document.getElementById('profiles');
	loader = document.getElementById('scLoader');
	load_img = loader.querySelector('img');
	buildsCont = document.getElementById('buildsCont');
	/*end - global el holders*/
	
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
	//var shortcutSelect = document.querySelector('#profiles');
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
				var just_pref_name = p.substr(10);
				if (just_pref_name in onSettingChange) {
					onSettingChange[just_pref_name](ini.General.props[p]);
				}
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
				/*start - generic not specific to profilist cp comm*/
				case 'queryClients_doCb_basedOnIfResponse':
					cpCommPostMsg(['responseClients_doCb_basedOnIfResponse', subData].join(subDataSplitter));
					break;
				/*end - generic not specific to profilist cp comm*/
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
						if (pref_name in onSettingChange) {
							onSettingChange[pref_name](ini.General.props['Profilist.' + pref_name]);
						}
					} else {
						console.warn('no control found for', pref_name);
					}
					//ini.General.props['Profilist.' + pref_name] = pref_val; //i dont think this should be here 082914 12p
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
		load_img.src = 'options_resources/loading.gif';
		
		loader.style.opacity = 1;
		var select = shortcutSelect;
		select.disabled = true;
		
		var successAnim = function() {
			setTimeout(function() {
				loader.style.opacity = 0;
			}, 300);
			setTimeout(function() {
				load_img.src = 'options_resources/loading-done.gif';
				loader.style.opacity = 1;
			}, 400); //do in 100s because 200ms is transition time so opactiy only gets to 0.5 before i go for 1
			setTimeout(function() {
				loader.style.opacity = 0;
				select.selectedIndex = 0;
				select.removeAttribute('disabled');
			}, 700);
		}
		
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
			var myShortcut = FileUtils.getFile('Desk', ['Firefox - ' + prof_props.Name + '.lnk']);
			var myShortcutWin = myShortcut.QueryInterface(Ci.nsILocalFileWin);

			//var myScIcon = new FileUtils.File('moz-icon:' + Services.io.newFileURI(exe).spec);
			//can use identifier as path because identifier is path. i thought but it didnt work out right so moving tgo full path to profile
			myShortcutWin.setShortcut(exe, null, '-profile "' + fullPathToProfile + '" -no-remote', 'Launches Mozilla Firefox with "' + prof_props.Name + '" Profile', exe);
			successAnim();
		} else if (OS.Constants.Sys.Name == 'Linux') {
			var exe = FileUtils.getFile('XREExeF', []);
			var args = '-profile "' + fullPathToProfile + '" -no-remote';

			var name = 'Firefox - ' + prof_props.Name;
			var target = exe;
			var icon_path = 'firefox'; //OS.Path.join(OS.Constants.Path.desktopDir, 'beta.png');
			var cmd = [];
			cmd.push('[Desktop Entry]');
			cmd.push('Name=' + name);
			cmd.push('Type=Application');
			cmd.push('Comment=Launches Mozilla Firefox with "' + prof_props.Name + '" Profile');
			cmd.push('Exec=' + target.path + ' ' + args);
			cmd.push('Icon=' + icon_path);
			cmdStr = cmd.join('\n');

			var path = OS.Path.join(OS.Constants.Path.desktopDir, name + '.desktop');
			var tmpPath = OS.Path.join(OS.Constants.Path.desktopDir, name + '.desktop.tmp');

			var encoder = new TextEncoder();
			var promise = OS.File.writeAtomic(path, encoder.encode(cmdStr), {tmpPath: tmpPath});
			promise.then(
			  function(aVal) {
				var promise2 = OS.File.setPermissions(path, {unixMode: 0o4777});
				promise2.then(
				 function(aVal) {
				   //console.log('promise2 success', 'aVal:', aVal);
				   successAnim();
				 },
				  function(aReason) {
					console.warn('promise2 rejected', 'aReason:', aReason);
					alert('Desktop File Trust Failed - Desktop file was created but could not be marked as trusted - After closing this message see "Browser Console" for more information');
					loader.style.opacity = 0;
					throw new Error('Desktop File Trust Failed - Desktop file was created but could not be marked as trusted - Reason: ' + aReason);
				  }
				);
			  },
			  function(aReason) {
				alert('Desktop File Write Failed - After closing this message see "Browser Console" for more information');
				loader.style.opacity = 0;
				throw new Error('Desktop File Write Failed - Reason: ' + aReason);
				//Services.ww.activeWindow.alert('rejected for reason: ' + uneval(aReason))
			  }
			);
		} else {
			alert('Unrecognized Operating System - Desktop shortcut creation failed');
			loader.style.opacity = 0;
		}
	}
	
	function changeIcon(e) {
		var target = e.target;
		var oTarg = e.originalTarget;
		if (oTarg.classList.contains('browse-icon')) {
			//clicked browse icon
			var fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
			fp.init(window, 'Profilist - Select Custom Build Icon', Ci.nsIFilePicker.modeOpen);
			fp.appendFilters(Ci.nsIFilePicker.filterImages);
			fp.displayDirectory = new FileUtils.File(OS.Constants.Path.userApplicationDataDir);
			var rv = fp.show();
			if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {
				var file = fp.file; // Get the path as string. Note that you usually won't need to work with the string paths.
				var path = fp.file.path; // work with returned nsILocalFile...
				
				//start - size to 16x16 and save it to profile folder
				//using canvas technique because in case i need to resize it i can do so right away. rather than xhr first then if not right size the go to canvas anyways
				var img = new Image();
				img.onload = function() {
					var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
					canvas.width = 16;
					canvas.height = 16;
					var ctx = canvas.getContext('2d');
					if (img.naturalHeight != 16 || img.naturalWidth != 16) {
						ctx.drawImage(img, 0, 0, 16, 16);
					} else {
						ctx.drawImage(img, 0, 0);
					}
					/*
					var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
					var XOR = data.length;
					var AND = canvas.width * canvas.height / 8;
					var size = XOR + AND;
					var buffer = new ArrayBuffer(size);
					var png = new Uint8Array(buffer);
					*/
					(canvas.toBlobHD || canvas.toBlob).call(canvas, function(b) {
						var r = new FileReader();
						r.onloadend = function () {
							// r.result contains the ArrayBuffer.
							var basename = OS.Path.basename(fp.file.path);
							var dirname = OS.Path.dirname(fp.file.path).toLowerCase();
							console.log('dirname = ', dirname, 'OS.Const:', OS.Constants.Path.userApplicationDataDir);
							if (dirname == OS.Constants.Path.userApplicationDataDir.toLowerCase()) {
								//alert('no need to write just use as its in userAppDataDir');
								var dontWriteJustUse = true;
							}
							var basename_noext = basename.substr(0, basename.lastIndexOf('.'));
							var postImgReady = function() {
								target = target.parentNode;
								target.classList.remove('browse');
								//console.log('os.file newfileuir:', OS.Path.toFileURI(writePath + '#' + Math.random()));
								//console.log('fileutils newfileuir:', Services.io.newFileURI(new FileUtils.File(writePath + '#' + Math.random())));
								//both newFileURI methods encode the `#` to `%23` i think this makes sense, so lets just put the # outside of the tofileuri func
								target.style.backgroundImage = 'url(' + OS.Path.toFileURI(writePath) + '#' + Math.random() + ')'; //may need to add math.random to bypass weird cache issue
							}
							
							var writePath = OS.Path.join(OS.Constants.Path.userApplicationDataDir, basename_noext + '.png');
							if (dontWriteJustUse) {
								console.log('user selected image from AppDataDir so no need to write just use it');
								postImgReady();
							} else {
								var writeAttempt = 0;
								var writeIt = function() {
									if (writeAttempt > 0) {
										writePath = OS.Path.join(OS.Constants.Path.userApplicationDataDir, basename_noext + '-' + writeAttempt + '.png');
									}
									var promise = OS.File.writeAtomic(writePath, new Uint8Array(r.result), {tmpPath:writePath + '.tmp', noOverwrite:true});
									promise.then(
										function(aVal) {
											console.log('succesfully saved image to disk');
											postImgReady();
										},
										function(aReason) {
											if (aReason instanceof OS.File.Error && aReason.becauseExists) {
												console.warn('failed simply cuz a file with that name already exists so will writeAttempt++');
												writeAttempt++;
												writeIt();
											} else {
												alert('Custom image for build failed to copy to Profilist directory on disk, see "Browser Console" after closing this message for more information');
												throw new Error('Custom image for build failed to copy to Profilist directory on disk - ' + aReason);
											}
											//console.log('writeAtomic failed for reason:', aReason);
										}
									);
								};
								writeIt();
							}
						};
						r.readAsArrayBuffer(b);
					}, 'image/png');
				};
				img.src = OS.Path.toFileURI(fp.file.path);
				//end - size to 16x16 and save it to profile folder
			}
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
		} else {
			//showing a custom image, take it to release
			target.style.backgroundImage = '';
			target.classList.add('release');
		}
	}
	
	function browseEnter(e) {
		console.log('hide swithcer');
		e.target.parentNode.classList.add('noswitch');
		//var iconSwitcher = e.target.parentNode.querySelector('.change-icon');
		//iconSwitcher.style.opacity = '0';
	}
	
	var rowTempalateDomJson = 
								['div', {class:'devBuildSortable', style:'position:relative; top:0; transition:top 100ms;'}, //class can be attn //style should hold order
									['span', {class:'release', style:'', onclick:'changeIcon(event)'}, //class can be release/beta/etc or style can be url background-image
										['span', {class:'icon change-icon'}],
										['span',{class:'icon browse-icon', onmouseenter:'browseEnter(event)', onmouseleave:'browseLeave(event)'}]
									],
									['span', {},
										['input', {type:'text'}],
										['span', {class:'icon'}]
									],
									['span', {},
										['span', {class:'icon cancel'}],
										['span', {class:'icon updown', onmousedown:'dragParent(event)'}],
										['span', {class:'icon current-build'}]
									]
								];
		
	function devBuildsStrToDom(sizeIt) {
		var rows = document.querySelectorAll('.builds-cont > div'); //first row is header
		console.log('num rows = ', rows.length);
		var propName = 'Profilist.dev-builds'
		var propVal = ini.General.props[propName];
		
		//remove all rows
		for (var i=rows.length-1; i>0; i--) {
			rows[i].parentNode.removeChild(rows[i]);
		}
		//done remove all rows
		if (propVal == '') {
			/*
			if (rows.length == 1) {
				//add single row
			} else if (rows.length > 2) {
				//remove ending rows
				for (var i=rows.length-1; i>1; i--) {
					rows[i].parentNode.removeChild(rows[i]);
				}
			}
			*/
			var rowDomJson = JSON.parse(JSON.stringify(rowTempalateDomJson));
			rowDomJson[1].style = 'order:0;';
			buildsCont.appendChild(jsonToDOM(rowDomJson, document, {}));
		} else {
			var json = JSON.parse(propVal);
			for (var i=0; i<=json.length-1; i++) {
				var rowDomJson = JSON.parse(JSON.stringify(rowTempalateDomJson));
				rowDomJson[1].style += 'order:' + i + ';';
				//rowDomJson[1].class = ''; //remove `attn` class
				var builtinIcon = json[i][0].match(/^(?:release|beta|aurora|nightly)$/im);
				console.log('builtinIcon match:', builtinIcon);
				if (builtinIcon) {
					rowDomJson[2][1].class = builtinIcon[0].toLowerCase();
				} else {
					rowDomJson[2][1].class = ''; //remove the release class
					rowDomJson[2][1].style = 'background-image:url("' + json[i][0] + '")';
				}
				rowDomJson[3][2][1].value = json[i][1]; //textbox value
				buildsCont.appendChild(jsonToDOM(rowDomJson, document, {}));
			}
			//add blank row
			var rowDomJson = JSON.parse(JSON.stringify(rowTempalateDomJson));
			rowDomJson[1].class = '';
			rowDomJson[1].style += 'order:' + json.length + ';';
			buildsCont.appendChild(jsonToDOM(rowDomJson, document, {}));
		}
		sizeContToDev(sizeIt);
		
		
		//start - setup drag drop
		var cont = document.getElementById('buildsCont');
		devBuildRows = cont.querySelectorAll('.devBuildSortable');
		for (var i=0; i<devBuildRows.length; i++) {
			devBuildRowYs.push(devBuildRows[i].offsetTop);
		}
		devBuildRowH = devBuildRowYs[1] - devBuildRowYs[0];
		for (var i=0; i<devBuildRows.length; i++) {
			//devBuildMoveRowYs.push([devBuildRowYs, devBuildRowYs + (devBuildRowH/2)]); //array of min y when closest is row 1, max y when closest is row 1
			devBuildMoveRowYs.push(devBuildRowYs);
			devBuildMoveRowYs.push(devBuildRowYs + (devBuildRowH/2));
		}		
		//end - setup drag drop
		
	}
	
	var devBuildRows;
	var parentInitY = 0;
	var parentEl = 0;
	var parentElOrder = -1;
	var devBuildRowYs = [];
	var devBuildMoveRowYs = [];
	var devBuildMoveRowYsREL = [];
	var devBuildRowYsRel = []; //
	var devBuildRowYSteps = [];
	var devBuildRowH = 0; //row height
	var devBuildEmptyRow = -1; //order at which empty
	
	var devBuildRowsLIVE = [];
	
	function moveParent(e) {
		var offsetY = (parentInitY - e.clientY) * -1;
		if (offsetY < devBuildRowYsRel[0]) { //not <= but < otherwise 1px off
			offsetY = devBuildRowYsRel[0]; //min
		}
		if (offsetY > devBuildRowYsRel[devBuildRowYsRel.length-1]) {
			offsetY = devBuildRowYsRel[devBuildRowYsRel.length-1]; //max
		}
		parentEl.style.top = offsetY + 'px';
		
		
		for (var i=0; i<devBuildMoveRowYsREL.length; i++) {
			if (offsetY >= devBuildMoveRowYsREL[i] && offsetY <= devBuildMoveRowYsREL[i+1]) {
				//var prevEmptyRow = devBuildEmptyRow;
				//devBuildEmptyRow = i; //order at which is on right now
				
				var moveOutRowI = Math.ceil(i / 2);
				if (moveOutRowI < 0) {
					moveOutRowI = 0;
				}
				
				//console.log('need to move out row from position of order', moveOutRowI);
				
				var cEmptyI = devBuildRowsLIVE.indexOf('');
				if (devBuildRowsLIVE[moveOutRowI] != '') {
					//its not empty, so move it out
					if (cEmptyI < moveOutRowI) {
						//move row at moveOutRowI up
						devBuildRowsLIVE[moveOutRowI][0].style.top = (parseInt(devBuildRowsLIVE[moveOutRowI][0].style.top) - devBuildRowH) + 'px';
						devBuildRowsLIVE.splice(cEmptyI, 1);
						devBuildRowsLIVE.splice(moveOutRowI, 0, '');
						cEmptyI = moveOutRowI;
						console.log('after shifting empty:', devBuildRowsLIVE, 'needed to move UP row at:', moveOutRowI);
					} else if (cEmptyI > moveOutRowI) {
						//move row at moveOutRowI down
						devBuildRowsLIVE[moveOutRowI][0].style.top = (parseInt(devBuildRowsLIVE[moveOutRowI][0].style.top) + devBuildRowH) + 'px';
						devBuildRowsLIVE.splice(cEmptyI, 1);
						devBuildRowsLIVE.splice(moveOutRowI, 0, '');
						cEmptyI = moveOutRowI;
						console.log('after shifting empty:', devBuildRowsLIVE, 'needed to move DOWN row at:', moveOutRowI);
					} else {
						console.warn('huh? can cEmptyI == current row? they are now..', i, cEmptyI);
					}
				} else {
					//console.log('its already empty, dont do anything');
					console.log('already empty do nothing', 'needed to move out row from position of order', moveOutRowI);
				}
				break;
			}
		}
	}

	function dragParent(e) {
		//startDrag
		parentInitY = e.clientY;
		parentEl = e.target.parentNode.parentNode;
		
		devBuildRowsLIVE = [];
		for (var i=0; i<devBuildRows.length; i++) {
			var cOrder = parseInt(devBuildRows[i].style.order);
			devBuildRowsLIVE.push([devBuildRows[i], cOrder]);
			devBuildRows[i].style.transition = 'top 100ms';
		}
		devBuildRowsLIVE.sort(function(a, b) {
			return a[1] > b[1];
		});
		
		parentEl.style.transition = '';
		parentEl.style.zIndex = 1;
		
		parentElOrder = parseInt(parentEl.style.order);
		
		devBuildEmptyRow = parentElOrder;
		
		console.log('parentElOrder:', parentElOrder);
		devBuildRowYsRel = [];
		devBuildMoveRowYsREL = [];
		
		for (var i=0; i<devBuildRows.length; i++) {
			if (devBuildRowsLIVE[i][1] == parentElOrder) {
				devBuildRowsLIVE.splice(i, 1, '');
				devBuildEmptyRow = i;
				break;
			}
		}
		
		console.log(devBuildRowsLIVE);
		
		for (var i=0; i<devBuildRowYs.length; i++) {
			devBuildRowYsRel.push(devBuildRowYs[i] - devBuildRowYs[parentElOrder]);
			devBuildMoveRowYsREL.push(devBuildRowYsRel[i]);
			devBuildMoveRowYsREL.push(devBuildRowYsRel[i] + (devBuildRowH/2));
		}
		
		console.log(devBuildRowYs);
		console.log(devBuildRowYsRel);
		console.log('parentInitY:', parentInitY);
		console.log('parentEl:', parentEl);
		document.addEventListener('mousemove', moveParent, false);
		document.addEventListener('mouseup', droppedParent, false);
	}
	
	function droppedParent(e) {
		document.removeEventListener('mousemove', moveParent, false);
		document.removeEventListener('mouseup', droppedParent, false);
		parentEl.style.transition = 'top 100ms';
		
		/*
		var closestRel = 10000;
		var closestRelI = 0;
		var cTop = parseInt(parentEl.style.top);
		for (var i=0; i<devBuildRowYsRel.length; i++) {
			var RelDiff = Math.abs(devBuildRowYsRel[i] - cTop);
			//console.log('RelDiff with i', i, 'is', RelDiff);
			if (RelDiff < closestRel) {
				closestRel = RelDiff;
				closestRelI = i;
			}
		}
		*/
		
		//alt to closestreli
		var offsetY = parseInt(parentEl.style.top);
		var cTop = offsetY;
		for (var i=0; i<devBuildMoveRowYsREL.length; i++) {
			if (offsetY >= devBuildMoveRowYsREL[i] && offsetY <= devBuildMoveRowYsREL[i+1]) {
				var moveOutRowI = Math.ceil(i / 2);
				if (moveOutRowI < 0) {
					moveOutRowI = 0;
				}
				//console.log('need to move out row from position of order', moveOutRowI);
				break;
			}
		}
		//alt to closestRelI
		
		//console.log('moveOutRowI:', moveOutRowI, 'closestRelI:', closestRelI);
		
		var postTrans = function() {
			console.log('transition ended');
			if (cTop != devBuildRowYsRel[moveOutRowI]) {
				console.log('removing transend listener');
				parentEl.removeEventListener('transitionend', arguments.callee, false);
			}
			
			for (var i=0; i<devBuildRowsLIVE.length; i++) {
				if (devBuildRowsLIVE[i] == '') {
					parentEl.style.transition = '';
					parentEl.style.order = i;
					parentEl.style.top = '0px';
					//parentEl.style.transition = 'top 100ms';
				} else {
					devBuildRowsLIVE[i][0].style.transition = '';
					devBuildRowsLIVE[i][0].style.order = i;
					devBuildRowsLIVE[i][0].style.top = '0px';
					//devBuildRowsLIVE[i][0].style.transition = 'top 100ms';
				}
			}
			parentEl.style.zIndex = 0;
			parentEl = 0;
			//console.log('post trans stuff ended');
		};
		if (cTop == devBuildRowYsRel[moveOutRowI]) {
			postTrans();
		} else {
			//do transition
			parentEl.style.top = devBuildRowYsRel[moveOutRowI] + 'px';
			parentEl.addEventListener('transitionend', postTrans, false);
		}
		console.log('dropped');
	}
	
	function generateDevBuildsStr() {
		//ini.General.props.devbuilds
		var devbuildsJson = [];
		var rows = document.querySelectorAll('.builds-cont > div');
		for (var i=1; i<rows.length; i++) {
			var iconSpan = rows[i].childNodes[0];
			var textbox = rows[i].querySelector('input[type=text]');
			
			var buildPath = textbox.value.trim();
			if (iconSpan.classList.contains('browse')) {
				continue;
			}
			if (buildPath == '') {
				continue;
			}
			var iconPath = iconSpan.style.backgroundImage;
			if (iconPath == '') {
				var iconPath = iconSpan.getAttribute('class').match(/(?:release|beta|aurora|nightly)/);
				console.log('iconPath:', iconPath[0]);
			} else {
				var iconPath = iconSpan.style.backgroundImage.substr(5, iconPath.length-2);
			}
			console.log('iconPath:', iconPath);
			devbuildsJson.push([buildPath, iconPath]);
		}
	}
	
	function browseLeave(e) {
		console.log('make icon in app dir');
		e.target.parentNode.classList.remove('noswitch');
		setTimeout(function() {
			alert(e.target.parentNode.style.backgroundImage + '\n' + e.target.parentNode.getAttribute('class'));
			if (e.target.parentNode.style.backgroundImage != '') {
				//custom image applied
				//check if textbox value is not blank and if it isnt then update profiles.ini `dev-builds`
				var textbox = e.target.parentNode.parentNode.querySelector('input[type=text]');
				if (textbox.value != '') {
					
				}
			}
		}, 100);
		//var iconSwitcher = e.target.parentNode.querySelector('.change-icon');
		//iconSwitcher.style.opacity = '';
	}
	
	function sizeContToDev(dowhat) {			
			 if (dowhat == -2) {
				//figure out what state should be based on .sect-dev-on
				if (sect_dev.classList.innerbgains('sect-dev-on')) {
					newVal = 1;
				} else {
					newVal = 0;
				}
			} else if (dowhat == -1) {
				//figure out what state should be based on select value
				var newVal = document.getElementById('Profilist.dev').value;
				if (newVal == 'true') {
					newVal = 1;
				} else {
					newVal = 2;
				}
			} else if (dowhat == 0) {
				//close dev sect-dev
				newVal = 0;
			} else if (dowhat == 1) {
				//show dev sect
				newVal = 1;
			}
			console.error('in sizeinnerbgToDev');

			
			var sect_gen_height = sect_gen.offsetHeight;
			var sect_dev_height = sect_dev.offsetHeight;
			//var innerbg_height = innerbg.offsetHeight;
			
			if (newVal == 1) {
				innerbg.style.height = (sect_gen_height + sect_dev_height) + 'px';
				sect_dev.style.opacity = 1;
			} else if (newVal == 0) {
				innerbg.style.height = sect_gen_height + 'px';
				sect_dev.style.opacity = 0;
			} else {
				throw new Error('newVal is not true/false');
			}
	}
	
	//this contians some communication stuff
	var onSettingChange = { //keys are pref_name
		'dev': function(newVal) {
			//purpose of this is to toggle the sect-div-on class
			console.error('in onSettingChange dev newVal == ', newVal);
			if (newVal == 'true' || newVal == true) {
				newVal = 1;
			} else if (newVal == 'false' || newVal == false) {
				newVal = 0;
			} else {
				throw new Error('onSettingChange: "dev"', 'newVal is not true/false');
			}
		
			var sect_gen = document.querySelector('.sect-gen');
			var devOn = sect_gen.classList.contains('sect-dev-on');
			
			if (newVal == 1) {
				if (devOn) {
					//dom already showing as state of `true`
				} else {
					sect_gen.classList.add('sect-dev-on');
				}
			} else if (newVal == 0) {
				if (!devOn) {
					//dom already showing as state of `false`
				} else {
					sect_gen.classList.remove('sect-dev-on');
				}
			} else {
				throw('huh???');
			}
			devBuildsStrToDom(newVal);
		}
	}
	
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
		
		if (pref_name in onSettingChange) {
			onSettingChange[pref_name](selectedValue);
		}
	 }
	 //end - this contains some communication stuff
	 
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
/* end - non communication stuff, just internal js like creating shortcuts and handling select changes*/