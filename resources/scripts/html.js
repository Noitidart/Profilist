// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
var core = {
	addon: {
		name: 'Profilist',
		id: 'Profilist@jetpack',
		path: {
			name: 'profilist',
			//
			content: 'chrome://profilist/content/',
			locale: 'chrome://profilist/locale/',
			//
			modules: 'chrome://profilist/content/modules/',
			workers: 'chrome://profilist/content/modules/workers/',
			//
			resources: 'chrome://profilist/content/resources/',
			images: 'chrome://profilist/content/resources/images/',
			scripts: 'chrome://profilist/content/resources/scripts/',
			styles: 'chrome://profilist/content/resources/styles/',
			fonts: 'chrome://profilist/content/resources/styles/fonts/',
			pages: 'chrome://profilist/content/resources/pages/'
		},
		cache_key: Math.random() // set to version on release
	}
};


// Lazy imports
var myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'cp.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

function doOnBeforeUnload() {

	contentMMFromContentWindow_Method2(window).removeMessageListener(core.addon.id, bootstrapMsgListener);

}

function doOnLoad() {
	initPage
}

document.addEventListener('DOMContentLoaded', doOnLoad, false);
window.addEventListener('beforeunload', doOnBeforeUnload, false);

// End - DOM Event Attachments
// Start - Page Functionalities
function initPage(isReInit) {
	// if isReInit then it will skip some stuff
	
	console.log('in init');
	
	var promiseAllArr_digest = [];
	
	if (!isReInit) {
		// get core obj
		var deferred_getCore = new Deferred();
		promiseAllArr_digest.push(deferred_getCore.promise);
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchCore'], bootstrapMsgListener.funcScope, function(aCore) {
			console.log('got aCore:', aCore);
			core = aCore;
			$scope.BC.core = core;
			deferred_getCore.resolve();
		});
	}
	
	// update prefs object
	var promise_updatePrefs = BC.updatePrefsFromServer(false, isReInit ? false : true);
	promiseAllArr_digest.push(promise_updatePrefs);
	
	// get json config from bootstrap
	var deferred_getUserConfig = new Deferred();
	promiseAllArr_digest.push(deferred_getUserConfig.promise);
	sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchConfig'], bootstrapMsgListener.funcScope, function(aConfigJson) {
		console.log('got aConfigJson into ng:', aConfigJson);
		$scope.BC.configs = aConfigJson;
		deferred_getUserConfig.resolve();
	});
	
	// wait for all to finish then digest
	var promiseAll_digest = Promise.all(promiseAllArr_digest);
	promiseAll_digest.then(
		function(aVal) {
			console.log('Fullfilled - promiseAll_digest - ', aVal);
			// start - do stuff here - promiseAll_digest
			$scope.$digest();
			console.log('ok digested');
			suppressPrefSetterWatcher = false;
			// end - do stuff here - promiseAll_digest
		},
		function(aReason) {
			var rejObj = {name:'promiseAll_digest', aReason:aReason};
			console.warn('Rejected - promiseAll_digest - ', rejObj);
			// deferred_createProfile.reject(rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {name:'promiseAll_digest', aCaught:aCaught};
			console.error('Caught - promiseAll_digest - ', rejObj);
			// deferred_createProfile.reject(rejObj);
		}
	);
}

// create dom of options
BC.options = [ // order here is the order it is displayed in, in the dom
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.general'),
		label: myServices.sb.GetStringFromName('profilist.cp.auto-up'),
		type: 'select',
		pref_name: 'Profilist.automatic_updates',
		pref_type: 'bool', // pref_type is custom, so the setter handles
		values: {
			0: myServices.sb.GetStringFromName('profilist.cp.off')
			1: myServices.sb.GetStringFromName('profilist.cp.on'),
		},
		desc: myServices.sb.GetStringFromName('profilist.cp.auto-up-desc'),
		// default_value: 1, // sent over from bootstrap
		// default_profile_specificness: true, // sent over from bootstrap
		// value: ? // sent over from bootstrap
		// profile_specificness: ? // sent over from bootstrap
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.general'),
		label: myServices.sb.GetStringFromName('profilist.cp.restore-defaults'),
		type: 'button',
		values: [ // for type button. values is an arr holding objects
			{
				label: myServices.sb.GetStringFromName('profilist.cp.restore'),
				action: function() { alert('ok restoring defaults :debug:') }
			}
		],
		desc: myServices.sb.GetStringFromName('profilist.cp.restore-defaults-desc')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-gen'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-port'),
		type: 'button',
		values: [
			{
				label: myServices.sb.GetStringFromName('profilist.cp.export'),
				action: BC.export
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.import'),
				action: BC.import
			}
		],
		desc: ''
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-time'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-multispeed'),
		type: 'text',
		pref_name: 'multi-speed',
		pref_type: 'int',
		desc: myServices.sb.GetStringFromName('profilist.cp.item_desc-multispeed')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-time'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-holdduration'),
		type: 'text',
		pref_name: 'hold-duration',
		pref_type: 'int',
		desc: myServices.sb.GetStringFromName('profilist.cp.item_desc-holdduration')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-time'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-clickspeed'),
		type: 'text',
		pref_name: 'click-speed',
		pref_type: 'int',
		desc: myServices.sb.GetStringFromName('profilist.cp.item_desc-clickspeed')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-time'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-ignoreautorepeatduration'),
		type: 'text',
		pref_name: 'ignore-autorepeat-duration',
		pref_type: 'int',
		desc: myServices.sb.GetStringFromName('profilist.cp.item_desc-ignoreautorepeatduration')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-tabs'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-newtabpos'),
		type: 'select',
		pref_name: 'new-tab-pos',
		pref_type: 'int',
		values: {
			'0': myServices.sb.GetStringFromName('profilist.cp.endofbar'),
			'1': myServices.sb.GetStringFromName('profilist.cp.nexttocur')
		},
		desc: ''
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-tabs'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-duptabpos'),
		type: 'select',
		pref_name: 'dup-tab-pos',
		pref_type: 'int',
		values: {
			'0': myServices.sb.GetStringFromName('profilist.cp.endofbar'),
			'1': myServices.sb.GetStringFromName('profilist.cp.nexttocur')
		},
		desc: ''
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-zoom'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-zoomlabel'),
		type: 'select',
		pref_name: 'zoom-indicator',
		pref_type: 'bool',
		values: {
			'false': myServices.sb.GetStringFromName('profilist.cp.hide'),
			'true': myServices.sb.GetStringFromName('profilist.cp.show')
		},
		desc: myServices.sb.GetStringFromName('profilist.cp.item_desc-zoomlabel')
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-zoom'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-zoomcontext'),
		type: 'select',
		pref_name: 'zoom-context',
		pref_type: 'int',
		values: {
			'0': myServices.sb.GetStringFromName('profilist.cp.allcont'),
			'1': myServices.sb.GetStringFromName('profilist.cp.txtonly')
		},
		desc: ''
	},
	{
		group_name: myServices.sb.GetStringFromName('profilist.cp.group-zoom'),
		label: myServices.sb.GetStringFromName('profilist.cp.item_name-zoomstyle'),
		type: 'select',
		pref_name: 'zoom-style',
		pref_type: 'int',
		values: {
			'0': myServices.sb.GetStringFromName('profilist.cp.global'),
			'1': myServices.sb.GetStringFromName('profilist.cp.sitespec'),
			'2': myServices.sb.GetStringFromName('profilist.cp.temp')
		},
		desc: ''
	}
];

// End - Page Functionalities
		
		// start - l10n injection into ng
		
		BC.l10n = {};
		// get all the localized strings into ng
		var l10ns = myServices.sb_dom.getSimpleEnumeration();
		while (l10ns.hasMoreElements()) {
			var l10nProp = l10ns.getNext();
			var l10nPropEl = l10nProp.QueryInterface(Ci.nsIPropertyElement);
			// doing console.log(propEl) shows the object has some fields that interest us

			var l10nPropKey = l10nPropEl.key;
			var l10nPropStr = l10nPropEl.value;

			BC.l10n[l10nPropKey] = l10nPropStr;
		}
		
		// set version for dom
		BC.l10n['profilist.cp.addon_version'] = core.addon.cache_key;
		// end - l10n injection into ng
		
		// start - modal stuff
		BC.modal = {
			type: 'trash', // trash/share/config
			config_type: 'add', // add/edit // if type==config
			show: false,
		};
		
		BC.hideModalIfEsc = function(aEvent) {
			if (aEvent.keyCode == 27) {
				BC.modal.show = false;
			}
		};
		BC.hideModal = function() {
			BC.modal.show = false;
		};
		BC.showModal = function(type, aObjKeys={}) {
			// update the keys that are in modal and also aObjKeys, to value of aObjKeys
			// and delete what is not found in aObjkeys
			BC.modal.type = type;
			for (var p in BC.modal) {
				if (p == 'show') { continue }
				if (p == 'type') { continue }
				if (p in aObjKeys) {
					BC.modal[p] = aObjKeys[p];
				} else {
					delete BC.modal[p];
				}
			}
			
			// add from aObjKeys to BC.modal, the keys that are not in BC.modal
			for (var p in aObjKeys) {
				BC.modal[p] = aObjKeys[p];
			}
			
			// special stuff for config
			if (BC.modal.type == 'config') {
				
				
				// reset BC.building_newly_created_group_name
				BC.building_newly_created_group_name = '';
				
				// build BC.building_groups
				BC.building_groups = [];
				
				for (var i=0; i<BC.configs.length; i++) {
					if (BC.building_groups.indexOf(BC.configs[i].group) == -1) {
						BC.building_groups.push(BC.configs[i].group);
					}
				}
				
				BC.building_groups.sort();
				
				BC.createNewGroupLabel = myServices.sb.GetStringFromName('profilist.cp.createnewgroup');
				while (BC.building_groups.indexOf(BC.createNewGroupLabel) > -1) {
					BC.createNewGroupLabel += ' ';
				}
				BC.building_groups.push(BC.createNewGroupLabel);
						
				// special stuff for edit or for add
				if (BC.modal.config_type == 'edit') {
					// make sure keys from aConfig show in BC.building
					for (var p in BC.modal.aConfig) {
						if (p == 'config') {
							BC.building.config = BC.modal.aConfig.config.slice();
						} else {
							BC.building[p] = BC.modal.aConfig[p];
						}
					}
					
					// // make sure non existing keys from aConfig dont show in BC.buliding
					// for (var p in BC.building) {
						// if (!(p in BC.modal.aConfig)) {
							// delete BC.modal.aConfig[p];
						// }
					// }
				} else if (BC.modal.type == 'config' && BC.modal.config_type == 'add') {
					// find smallest negative id
					// because if id is negative, then that means it hasnt got a server id yet. but i need to keep decrementing the negative id, as i cant have multiple of the same ids
					var smallestNegativeId = 0;
					for (var i=0; i<BC.configs.length; i++) {
						if (BC.configs[i].id < smallestNegativeId) {
							smallestNegativeId = BC.configs[i].id;
						}
					}
					
					var newAddId = smallestNegativeId - 1;
					BC.building = {
						id: newAddId,
						func: '',
						name: '',
						group: '',
						desc: '',
						config: []
						// :note: :maintain: make sure all the default keys go in here
					};
				}
			}
			// show it
			BC.modal.show = true;
		};
		
		BC.modalOkBtn = function() {
			
			BC.hideModal();
			
			switch (BC.modal.type) {
				case 'trash':
					
						for (var i=0; i<BC.configs.length; i++) {
							if (BC.configs[i].id == BC.modal.aConfig.id) {
								BC.configs.splice(i, 1);
								updateConfigsOnServer();
								return;
							}
						}
					
					break;
				case 'share':
					
						//
					
					break;
				case 'config':

						switch (BC.modal.config_type) {
							case 'add':

									var pushThis = {};
									
									for (var p in BC.building) {
										if (p == 'config') {
											pushThis[p] = BC.building[p].slice();
										} else {
											pushThis[p] = BC.building[p];
										}
										
									}
									if (BC.guiShouldShowNewGroupTxtBox()) {
										pushThis.group = BC.building_newly_created_group_name;
									}
									
									BC.configs.push(pushThis);
									
									// BC.configs.push(BC.building);
									// not simply doing push of BC.building because, the hide modal is an animation. and if BC.guiShouldShowNewGroupTxtBox() then if I change BC.building.group to that value of BC.building_newly_created_group_name it will change the dom while its in hiding transition for 200ms
								
									updateConfigsOnServer();
									
								break;
							case 'edit':
									
									for (var i=0; i<BC.configs.length; i++) {
										if (BC.configs[i].id == BC.modal.aConfig.id) {
											for (var p in BC.configs[i]) {
												if (p == 'group' && BC.guiShouldShowNewGroupTxtBox()) {
													BC.configs[i].group = BC.building_newly_created_group_name;
												} else if (p == 'config') {
													BC.configs[i][p] = BC.building[p].slice();
												} else {
													BC.configs[i][p] = BC.building[p];
												}
											}
											updateConfigsOnServer();
											return;
										}
									}
								
								break;
							default:
								console.error('should never ever get here');
						}
					
					break;
				default:
					console.error('should never ever get here');
			}
		};
		// end - modal stuff
		
		// start - create/add new function
		BC.building = {};
		BC.building_groups = [];
		
		BC.guiShouldShowNewGroupTxtBox = function() {
			// purely ng gui func
			if (BC.building.group == BC.createNewGroupLabel) { // :note: BC.createNewGroupLabel is just a gui helper. to help test if selected index is last one which will be "Create New Group". had to go through this mess in case in localizations they have "Create New Group" as same value as a group name
				// show the create new group textbox
				// BC.building_newly_created_group_name = '';
				return true;
			} else {
				return false;
			}
		};
		
		var getCleanConfigs = function() {
			// clone the BC.configs array, but delete the $$hashKey item from each element as thats ng stuff
			/*
			var intermediateClean = JSON.parse(JSON.stringify(BC.configs));
			for (var p in intermediateClean) {
				delete intermediateClean[p].$$hashKey;
				for (var i=0; i<intermediateClean[p].config.length; i++) {
					delete intermediateClean[p].config[i].$$hashKey;
				}
			}
			return intermediateClean;
			*/
			return BC.configs.map(function(curEl) {
				delete curEl.$$hashKey;
				for (var i=0; i<curEl.config.length; i++) {
					// i checked, but make sure that curEl.config doesnt modify into BC.configs[x].config by asking on StackOverflow if curEl is duplicated already
					delete curEl.config[i].$$hashKey;
				}
				return curEl;
			});
		};
		var updateConfigsOnServer = function() {
			// tells bootstrap to updates configs in its global AND save it to disk

			console.log('in saveConfigsToFile');
			
			var configs = getCleanConfigs();
			
			console.log('configs cleaned:', JSON.stringify(configs), configs);
			
			contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, ['updateConfigsOnServer', configs]);
		};
		// end - create/add new function
		
		// start - recording mouse events
		BC.requestingWitholdMouseEvents = function(aEvent) {
			aEvent.stopPropagation();
			console.log('ok moused over it');
			contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, ['requestingWitholdMouseEvents']);
		};
		BC.requestingMouseEvents = function(aEvent) {
			aEvent.stopPropagation();
			console.log('ok mouse left');
			contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, ['requestingMouseEvents']);
		};
		// end - recording mouse events
		
		// start - init

		init();
		// end - init
	}]);

// start - server/framescript comm layer
// sendAsyncMessageWithCallback - rev3
var bootstrapCallbacks = { // can use whatever, but by default it uses this
	// put functions you want called by bootstrap/server here
	
};
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap; // :todo: figure out how to get global scope here, as bootstrap is undefined
	aCallbackScope[thisCallbackId] = function(aMessageArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}
var bootstrapMsgListener = {
	funcScope: bootstrapCallbacks,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.log('framescript getting aMsgEvent, unevaled:', uneval(aMsgEventData));
		// aMsgEvent.data should be an array, with first item being the unfction name in this.funcScope
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_fs_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_fs_call must be an array or promise that resolves with an array
				if (rez_fs_call.constructor.name == 'Promise') {
					rez_fs_call.then(
						function(aVal) {
							// aVal must be an array
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					contentMMFromContentWindow_Method2(content).sendAsyncMessage(core.addon.id, [callbackPendingId, rez_fs_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
contentMMFromContentWindow_Method2(content).addMessageListener(core.addon.id, bootstrapMsgListener);
// end - server/framescript comm layer
// start - common helper functions
function contentMMFromContentWindow_Method2(aContentWindow) {
	if (!gCFMM) {
		gCFMM = aContentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIDocShell)
							  .QueryInterface(Ci.nsIInterfaceRequestor)
							  .getInterface(Ci.nsIContentFrameMessageManager);
	}
	return gCFMM;

}
function Deferred() {
	try {
		/* A method to resolve the associated Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} value : This value is used to resolve the promise
		 * If the value is a Promise then the associated promise assumes the state
		 * of Promise passed as value.
		 */
		this.resolve = null;

		/* A method to reject the assocaited Promise with the value passed.
		 * If the promise is already settled it does nothing.
		 *
		 * @param {anything} reason: The reason for the rejection of the Promise.
		 * Generally its an Error object. If however a Promise is passed, then the Promise
		 * itself will be the reason for rejection no matter the state of the Promise.
		 */
		this.reject = null;

		/* A newly created Pomise object.
		 * Initially in pending state.
		 */
		this.promise = new Promise(function(resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
		Object.freeze(this);
	} catch (ex) {
		console.log('Promise not available!', ex);
		throw new Error('Promise not available!');
	}
}
// end - common helper functions