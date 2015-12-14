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
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'html.properties?' + core.addon.cache_key); });


/* notes on notesObj
status: bool. tells whethere its running or not. if not set, undefined is equivlanet of false
*/
var iniObj = [ // notesObj are not written to file
	{
		groupName: 0, // 'Profile0',
		notesObj: {},
		Name: 'default',
		IsRelative: '1',
		Path: 'Profiles/4hraqsqx.default',
		Default: '1'
	},
	{
		groupName: 1, // 'Profile1',
		notesObj: {},
		Name: 'Dev',
		IsRelative: '1',
		Path: 'Profiles/m2b8zkct.Unnamed Profile 1'
	},
	{
		groupName: 'General',
		notesObj: {},
		StartWithLastProfile: '1'
	}
];

var MyStore = {};

var Menu = React.createClass({
    displayName: 'Menu',
	getInitialState: function() {
		return {
			iniObj: [],
			searchPhrase: '',
			searchResultsCount: 0,
			arrowIndex: '' // when user does up/down arrow keys this will keep track of the index it has selected
		};
	},
	componentDidMount: function() {
		MyStore.updateStatedIniObj = this.updateStatedIniObj;
		MyStore.setState = this.setState;
		
		document.addEventListener('keypress', this.onKeyPress, false);
	},
	updateStatedIniObj: function() {
		this.setState({
			iniObj: iniObj
		});
	},
	executeSearch: function() {
		// this.state.searchPhrase var should be set - then this func will calc search results, and then do setState
		
		var cResultsCount = 0;
		if (this.state.searchPhrase == '') {
			for (var i=0; i<this.state.iniObj.length; i++) {
				if (this.state.iniObj[i].Path) {
					// its a profile
					cResultsCount++;
				}
			}
		} else {
			var searchPatt = new RegExp(escapeRegExp(this.state.searchPhrase), 'i');
			for (var i=0; i<this.state.iniObj.length; i++) {
				if (this.state.iniObj[i].Path && searchPatt.test(this.state.iniObj[i].Name)) {
					// its a profile
					cResultsCount++;
				}
			}
		}
		this.setState({
			searchPhrase: this.state.searchPhrase,
			searchResultsCount: cResultsCount
		});
		console.log('cResultsCount:', cResultsCount);
	},
	onKeyPress: function(e) {
		console.log('onKeyPress, e:', e);
		switch (e.key) {
			case 'ArrowUp':
			
					console.log('ok move arrowIndex up 1');
					
				break;
			case 'ArrowDown':
			
					console.log('ok move arrowIndex up 1');
					
				break;
			case 'Backspace':
			
					if (this.state.searchPhrase.length > 0) {
						this.state.searchPhrase = this.state.searchPhrase.substr(0, this.state.searchPhrase.length - 1);
						this.executeSearch();
					}
					
				break;
			case 'Escape':
				
					// if editing something, then cancel edit. if mouse is not over the stack, then close profilist_menu. as during edit, force open happens
					// if cloning, then cancel clone.
					
					if (this.state.searchPhrase.length > 1) {
						this.state.searchPhrase = '';
						this.executeSearch();
					}
					
				break;
			default:
				if (e.key.length == 1) { // test to make sure its a character, not a special key like Home or something
					// append to searchPhrase
					this.state.searchPhrase = this.state.searchPhrase + e.key;
					
					this.executeSearch();
				} // else do nothing
		}
		
		console.log('this.state.searchPhrase:', this.state.searchPhrase);
	},
    render: function render() {
		var THAT = this;
		var addToolbarButton = function(aPath, aOtherProps) {
			// only pass nohting for aPath when its initial state. to show the loading tbb
			console.log('addToolbarButton, aPath:', aPath);
			var cProps = {key: aPath, path: aPath};
			
			for (var p in aOtherProps) {
				cProps[p] = aOtherProps[p];
			}
			
			list.push(
				React.createElement(ToolbarButton, cProps)  // link1049403002 key must be set to aPath --- never mind learned that key is not accessible via this.props.key
			);
		};
		
		var list = [];
		
		if (this.state.iniObj.length == 0) {
			// creating loading item
			addToolbarButton('loading');
		} else {
			for (var i=0; i<this.state.iniObj.length; i++) {
				if (this.state.iniObj[i].Path) { // so we dont make one for "General"
					addToolbarButton(this.state.iniObj[i].Path, {
						searchPhrase: this.state.searchPhrase
					});
				}
			}
			addToolbarButton('noresultsfor', {
				searchPhrase: this.state.searchPhrase,
				searchResultsCount: this.state.searchResultsCount
			});
			addToolbarButton('createnewprofile');
		}
		
        return React.createElement(
            'div', {id: 'profilist_menu'},
				list
        );
    }
});

function getIniEntryOf(aPathOrGroupName) {
	// returns reference to the object in ini
	// aPath can be "loading", it will return undefined though in that case
	console.log('in getIniEntryOf, aPath:', aPathOrGroupName);
	for (var i=0; i<iniObj.length; i++) {
		if (('Path' in iniObj[i] && iniObj[i].Path == aPathOrGroupName) || iniObj[i].groupName == aPathOrGroupName) {
			return iniObj[i];
		}
	}
	// return undefined; // no need, by default it returns undefined
}
function getBadgeImgPathOf(aPath) {
	// returns a string, which is path to image of the badge, for profile with Path == aPath
	var cIniEntry = getIniEntryOf(aPath);
	if (!cIniEntry || !cIniEntry.profilistBadge) { // is `!cIniEntry` when aPath == 'loading' as duh its not found in iniObj
		return 'chrome://mozapps/skin/places/defaultFavicon.png';
	} else {
		return cIniEntry.profilistBadge;
	}
}
function getStatusImgOf(aPath) {
	// returns string, of the image to use
	// should have something to run to get status, and on resolve, this will just obtain the key from notesObj
	var cIniEntry = getIniEntryOf(aPath);
	if (!cIniEntry) {
		// this should never happen
		// actually this will happen when aPath == 'loading';
		return 'chrome://profilist/content/resources/images/icon16.png';
	} else {
		if (cIniEntry.notesObj.status) {
			return 'chrome://profilist/content/resources/images/status-active.png';
		} else {
			return 'chrome://profilist/content/resources/images/status-inactive.png';
		}
	}
}
function getStatusOf(aPath) {
	// returns bool
	var cIniEntry = getIniEntryOf(aPath);
	if (!cIniEntry) {
		// this should never happen
		// actually this will happen when aPath == 'loading';
		return false;
	} else {
		return cIniEntry.notesObj.status === undefined ? false : cIniEntry.notesObj.status;
	}
}
var ToolbarButton = React.createClass({
    displayName: 'ToolbarButton',

    render: function render() {
		//var cPath = this.props.key; // link1049403002 this is a reason why i have to set key to aPath --- never mind learned that key is not accessible via this.props.key
		var cPath = this.props.path;
		console.log('ToolbarButton-render, cPath:', cPath, 'this:', this);
		var cIniEntry = getIniEntryOf(cPath); // will be undefined for 'loading', 'createnewprofile' // if it exists i assume its a profile, which obviously makes sesne
		console.log('ToolbarButton-render, cIniEntry:', cIniEntry);
		return React.createElement('div', {className: 'profilist-tbb', 'data-tbb-type': (!cIniEntry ? cPath : (cIniEntry.notesObj.status ? 'active' : 'inactive')), style: (cPath == 'noresultsfor' ? (this.props.searchResultsCount == 0 && this.props.searchPhrase != '' ? undefined : {display:'none'}) : undefined)}, // , 'data-loading': cIniEntry ? undefined : '1'
			React.createElement('div', {className: 'profilist-tbb-primary'},
				cPath == 'noresultsfor' ? undefined : React.createElement('div', {className: 'profilist-tbb-hover'}),
				cPath == 'noresultsfor' ? undefined : React.createElement('div', {className: 'profilist-tbb-icon'},
					React.createElement('img', {className: 'profilist-tbb-badge', src: (!cIniEntry ? '' : getBadgeImgPathOf(cPath))}),
					React.createElement('img', {className: 'profilist-tbb-status'})
				),
				!cIniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-highlight'},
					cIniEntry ? cIniEntry.Name : myServices.sb.GetStringFromName(cPath)
				),
				React.createElement('input', {className: 'profilist-tbb-textbox', disabled:'disabled', defaultValue: (cIniEntry ? cIniEntry.Name : undefined), value: (!cIniEntry ? (cPath == 'noresultsfor' ? myServices.sb.formatStringFromName(cPath, [this.props.searchPhrase], 1) : myServices.sb.GetStringFromName(cPath)) : undefined) })
			),
			cPath == 'noresultsfor' || cPath == 'loading' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu'},
				cPath != 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-clone'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-isdefault'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-dots'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-build profilist-devmode'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-safe profilist-devmode'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-setdefault'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-rename'}),
				cPath == 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-del'})
			)
        );
    }
});

/*
var Label = React.createClass({
    displayName: 'ProfilistLabel',

    render: function render() {
        return React.createElement(
            'div', {
                contentEditable: 'true'
            },
            this.props.name
        );
    }
});

var Subicon = React.createClass({
    displayName: 'Subicon',
    render: function() {

    }
});

*/

var myMenu = React.createElement(Menu);

document.addEventListener('DOMContentLoaded', function() {
	ReactDOM.render(
		myMenu,
		document.getElementById('profilist_menu_container')
	);
	
	setTimeout(function() {
		MyStore.updateStatedIniObj();
	}, 2000);
	
	setTimeout(function() {
		iniObj[0].notesObj.status = true
		MyStore.updateStatedIniObj();
	}, 4000);
}, false);

/*

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
			0: myServices.sb.GetStringFromName('profilist.cp.off'),
			1: myServices.sb.GetStringFromName('profilist.cp.on')
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
*/
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
		this.resolve = null;


		this.reject = null;


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
function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}
// end - common helper functions