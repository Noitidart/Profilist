// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/osfile.jsm');
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
var core = {
	addon: {
		id: 'Profilist@jetpack',
		path: {
			locale: 'chrome://profilist/locale/'
		},
		cache_key: Math.random() // set to version on release
	}
};

var gIniObj;
var gKeyInfoStore;

var gCFMM; // needed for contentMMFromContentWindow_Method2

// Lazy imports
var myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'html.properties?' + core.addon.cache_key); });


/*
GEN_RULEs - stands for GENERAL_RULES
1. Icon Slug
	* platform safed phrase. this phrase is found at ```OS.Path.join(core.profilist.path.icons, PHRASE, PHRASE + '_##.png')``` OR ```core.addon.path.images + 'channel-iconsets/' + PHRASE + '_##.png'```
INIOBJ_RULEs
1. groupName
	* This is the text between the square brackets [] in the ini group title
	* Valids
		* General - this is standard
		* Profile# - this is standard
		* TempProfile#
			* Whenever profilist is installed into a temporary profile, it should add this, the # should be one plus the previous #, the seequence of profile and TempProfile should be in order. So like Profile0 Profile1 TempProfile2 Profile3
			* Also added in when profilist finds a temp profile running
2. ProfilistBadge
	* On profile entry if it is badged
	* It is the icon slug, which is the platform safed file name before the .png, from jProfilistBuilds
3. ProfilistStatus
	* Found on all profile ini entrys that have profilist installed - meaing if it is not on it, then profilist is not installed on it
	* '0' - installed BUT disabled
	* '1' - installed AND enabled
4. ProfilistBuilds
	* JSON.stringify of:
	  ```
	  [
		{
			i: string - slug of icon. slug is plat safed, slug is defined on cross-file-link33464648958
			id: max increment - should never reduce, always find the max one, and the next id is one plus that
			p: string - exePath
		}
	  ]
	  ```
5. noWriteObj.currentProfile
	* The profile that the code is running from
6. noWriteObj.status
	* Integer
	* 0 if profile is not running
	* >= 1 if its running
		* on windows the currentProfile is always pid, all others are just 1
		* on unix based it is always pid
7. noWriteObj.exePath
	* String to XREExeF the profile IS RUNNING IN
	* Only required if dev mode is on && profile is running
		* DOM
			* Required on currentProfile
		* BL
	* Even though not required, it is provided if dev mode is on && profile is running ---- because it is needed to calculate exeIconSlug
8. noWriteObj.exeIconSlug
	* Only required if dev mode is on && profile is running
		* It is used to show the buildhint icon
9. noWriteObj.temporaryProfile
	* If the profile is temporary, then it is marked true
------------
var gIniObj = [ // noWriteObj are not written to file
	{
		groupName: 'Profile0',
		noWriteObj: {},
		Name: 'defaulted',
		IsRelative: '1',
		Path: 'Profiles/4hraqsqx.default',
		Default: '1',
		ProfilistStatus: '1'
	},
	{
		groupName: 'Profile1',
		noWriteObj: { // noWriteObj is not written to ini
			status: jsInt of pid, // this is obvious, because if its currentProfile then it is obviously running
			currentProfile: true, // indicates that the running profile is this one
			exePath: Services.dirsvc.get('XREExeF', Ci.nsIFile).path.toLowerCase(), // is needed if devmode is on. needed for mouseLeave of SubiconTie. needed ONLY for currentProfile:true entry // lower case what is needed to be lowered - link472738374
			exeIconSlug: 'beta' // REQUIRED if this profile status:true && devmode is true // currentProfile should be slug of icon for the exePath. this key is only available when it is running, meaning noWriteObj.status == true // this is needed only if ProfilistDev=='1' meaning devmode is on. it is used to show in the profilist-si-buildhint
		},
		Name: 'Developer',
		IsRelative: '1',
		Path: 'Profiles/m2b8zkct.Unnamed Profile 1'
		ProfilistStatus: '1'
	},
	{
		groupName: 'General',
		noWriteObj: {},
		StartWithLastProfile: '1',
		ProfilistBuilds: '[{"id":8,"p":"c:\\\\program files (x86)\\\\mozilla firefox\\\\nightly.exe","i":"nightly"}]' // allow exePath's to gui must be lower case lower case what is needed to be lowered - link472738374
	},
	{
		groupName: 'TempProfile2',
		noWriteObj: {},
		Name: 'Temp1',
		IsRelative: '1',
		Path: 'C:\\temp1'
		// NOWRITE: true // because profilist is not installed into here (no ProfilistStatus) // actually i decided to discontinue NOWRITE on these. i will write it to file. because so user can name the profiels while they are running and the name will show consistent across all profiles
	},
	{
		groupName: 'Profile3',
		noWriteObj: {},
		Name: 'Yass',
		IsRelative: '1',
		Path: 'C:\\yass'
	},
	{
		groupName: 'TempProfile4',
		noWriteObj: {},
		Name: 'Temp2',
		IsRelative: '1',
		Path: 'C:\\temp2',
		ProfilistStatus: '1' // because profilist is installed in it, it must be written to ini
	}
];
*/

function doOnBeforeUnload() {

	contentMMFromContentWindow_Method2(window).removeMessageListener(core.addon.id, bootstrapMsgListener);

}

function doOnContentLoad() {
	initPage();
}

document.addEventListener('DOMContentLoaded', doOnContentLoad, false);
window.addEventListener('beforeunload', doOnBeforeUnload, false);

// End - DOM Event Attachments
// Start - Page Functionalities
function initPage(isReInit) {
	// if isReInit then it will skip some stuff
	
	initReactComponent()
	
	setTimeout(function() {
		// get core and config objs
		console.time('fetchReq');
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchCoreAndConfigs'], bootstrapMsgListener.funcScope, function(aObjs) {
			console.timeEnd('fetchReq');
			console.log('got core and configs:', aObjs);
			core = aObjs.aCore;
			gIniObj = aObjs.aIniObj;
			gKeyInfoStore = aObjs.aKeyInfoStore;
			
			MyStore.updateStatedIniObj();
		});
	}, 2000);

}

function initReactComponent() {
	var myMenu = React.createElement(Menu);

	ReactDOM.render(
		myMenu,
		document.getElementById('profilist_menu_container')
	);
}

var MyStore = {};
// start - xIniObj sort functions - for use on a clone of xIniObj
var reProfCreateOrder = /Profile(\d+)/;
var gSortIniFunc = { // link83737383 // these sort functions must only run on an array of ini entires that are for profiles - meaning a and b should both have .Path
	'0': undefined, 		// by create order ASC
	'1': function(a, b) {	// by create order DESC
		
		return b.noWriteObj.createOrder - a.noWriteObj.createOrder;
	},
	'2': function(a, b) {	// by alpha-numeric-insensitive profile name ASC		
		return compareAlphaNumeric(a.noWriteObj.lowerCaseName, b.noWriteObj.lowerCaseName);
		
	},
	'3': function(a, b) {	// by alpha-numeric-insensitive profile name DESC
		return compareAlphaNumeric(a.noWriteObj.lowerCaseName, b.noWriteObj.lowerCaseName) * -1;
	}
};
// end - xIniObj sort functions

// START - COMMON PROFILIST HELPER FUNCTIONS
// start - xIniObj helper functions

function getIniEntryByNoWriteObjKeyValue(aIniObj, aKeyName, aKeyVal) {
	//*******************************************
	// RETURNS
	//	null
	//	an element in the aIniObj
	//*******************************************
	for (var i=0; i<aIniObj.length; i++) {
		if (aKeyName in aIniObj[i].noWriteObj && aIniObj[i].noWriteObj[aKeyName] == aKeyVal) {
			return aIniObj[i];
		}
	}
	
	return null;
}
function getIniEntryByKeyValue(aIniObj, aKeyName, aKeyVal) {
	//*******************************************
	// DESC
	// 	Iterates through the ini object provided, once it finds an entry that has aKeyName that equals aKeyVal it returns it
	//	If nothing is found then it returns NULL
	// RETURNS
	//	null
	//	an element in the aIniObj
	// ARGS
	//	aIniObj - the ini object you want to get value from
	// 	aKeyName - the name of the field
	//	aVal - the value the field should be
	//*******************************************

	for (var i=0; i<aIniObj.length; i++) {
		if (aKeyName in aIniObj[i] && aIniObj[i][aKeyName] == aKeyVal) {
			return aIniObj[i];
		}
	}
	
	return null;
}

// start - xIniObj functions with no options
function getBuildValByTieId(aJProfilistBuilds, aTieId, aKeyName) {
	// returns null if aTieId is not found, or undefined if aKeyName is not found ELSE value
	for (var i=0; i<aJProfilistBuilds.length; i++) {
		if (aJProfilistBuilds[i].id == aTieId) {
			return aJProfilistBuilds[i][aKeyName]; // if aKeyName does not exist it returns undefined
		}
	}
	
	return null;
}

function getPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	if (gKeyInfoStore[aKeyName].unspecificOnly) {
		// get profile-unspecific value else null
		if (aKeyName in aGenIniEntry) {
			return aGenIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				return null;
			}
		}
	} else {
		// check if profile-unspecific value exists return else continue on
		if (!gKeyInfoStore[aKeyName].specificOnly) {
			if (aKeyName in aGenIniEntry) {
				return aGenIniEntry[aKeyName];
			}
		}
		// return profile-specific value else null
		if (aKeyName in aIniEntry) {
			return aIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				return null;
			}
		}
	}
	
	
	if (aKeyName in aGenIniEntry) {
		// user set it to profile-unspecific
		return aGenIniEntry[aKeyName];
	} else {
		// user set it to profile-specific
		if (aKeyName in aIniEntry) {
			return aIniEntry[aKeyName];
		} else {
			// not found so return default value if it has one
			if ('defaultValue' in gKeyInfoStore[aKeyName]) { // no need to test `'defaultValue' in gKeyInfoStore[aKeyName]` because i expect all values in xIniObj to be strings // :note: :important: all values in xIniObj must be strings!!!
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				// no default value
				return null;
			}
		}
	}
}
function getImgPathOfSlug(aSlug) {
	//*******************************************
	// DESC
	// 	Provided aSlug, such as "esr", "release", "beta", "dev", "nightly", or any user defined one, this will return the full path to that image
	// RETURNS
	//	null
	//	string
	// ARGS
	//	aSlug - icon short name
	//*******************************************

	console.info('getImgPathOfSlug, aSlug:', aSlug);
	
	switch (aSlug) {
		// case 'esr': // esr should go to release. but worker should never set it to esr, as esr here is a slug, not channel name
		case 'release':
		case 'beta':
		case 'dev':
		case 'aurora':
		case 'nightly':
				
				return core.addon.path.images + 'channel-iconsets/' + aSlug + '/' + aSlug + '_16.png';
				
			break;
		default:
			
				return OS.Path.join(core.profilist.path.icons, aSlug, aSlug + '_16.png');
	}
}
// end - xIniObj functions with no options
// END - COMMON PROFILIST HELPER FUNCTIONS

// start - react components
var Menu = React.createClass({
    displayName: 'Menu',
	getInitialState: function() {
		return {
			sIniObj: [], // sIniObj stands for stateIniObject
			sSearchPhrase: '',
			sSearchHasResults: false,
			sArrowIndex: '', // when user does up/down arrow keys this will keep track of the index it has selected
			sMsgObj: {} // key is sKey, value is object
		};
	},
	componentDidMount: function() {
		MyStore.updateStatedIniObj = this.updateStatedIniObj; // no need for bind here else React warns "Warning: bind(): You are binding a component method to the component. React does this for you automatically in a high-performance way, so you can safely remove this call. See Menu"
		MyStore.setState = this.setState.bind(this);
		
		document.addEventListener('keypress', this.onKeyPress, false);
	},
	updateStatedIniObj: function() {
		this.setState({
			sIniObj: JSON.parse(JSON.stringify(gIniObj))
		});
	},
	executeSearch: function(newSearchPhrase) {
		
		// only searches on all non-currentProfile's
		
		console.log('newSearchPhrase:', newSearchPhrase);
		
		var cSearchHasResults = 0;
		if (newSearchPhrase == '') {
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile) {
					// its a profile
					cSearchHasResults++;
				}
			}
		} else {
			var searchPatt = new RegExp(escapeRegExp(newSearchPhrase), 'i');
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile && searchPatt.test(this.state.sIniObj[i].Name)) {
					// its a profile
					cSearchHasResults++;
				}
			}
		}
		this.setState({
			sSearchPhrase: newSearchPhrase,
			sSearchHasResults: cSearchHasResults
		});
		console.log('cSearchHasResults:', cSearchHasResults);
	},
	onKeyPress: function(e) {
		console.log('onKeyPress, e:', e);
		if (e.ctrlKey || e.altKey || e.metaKey) {
			return;
		}
		switch (e.key) {
			case 'ArrowUp':
			
					console.log('ok move arrowIndex up 1');
					
				break;
			case 'ArrowDown':
			
					console.log('ok move arrowIndex up 1');
					
				break;
			case 'Backspace':
			
					// search stuff
					if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
						if (this.state.sSearchPhrase.length > 0) {
							this.executeSearch(this.state.sSearchPhrase.substr(0, this.state.sSearchPhrase.length - 1));
							// e.preventDefault(); // so page doesnt go back // needed if decide to use div contentEditable. For textbox this is not needed
						}
					}
					
				break;
			case 'Escape':
				
					// if editing something, then cancel edit. if mouse is not over the stack, then close profilist_menu. as during edit, force open happens
					// if cloning, then cancel clone.
					
					// tbb-msg stuff
					if (this.state.sMsgObj) {
						if (this.state.sMsgObj.onCancel) {
							this.state.sMsgObj.onCancel();
						} else {
							this.setState({
								sMsgObj: {}
							});
						}
					}
					
					// search stuff
					if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
						if (this.state.sSearchPhrase.length > 0) {
							this.executeSearch('');
						}
					}
					
				break;
				
			case 'Enter':
				
					// tbb-msg stuff
					if (this.state.sMsgObj) {
						if (this.state.sMsgObj.onAccept) {
							this.state.sMsgObj.onAccept();
						} else {
							this.setState({
								sMsgObj: {}
							});
						}
					}
				
				break;
			default:
			
				// search stuff
				if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
					if (e.key.length == 1) { // test to make sure its a character, not a special key like Home or something
						// append to sSearchPhrase
						this.executeSearch(this.state.sSearchPhrase + e.key);
					} // else do nothing
				}
		}
	},
    render: function render() {
		
		var THAT = this;
		var addToolbarButton = function(aProps) {
			// note: aProps must contain key of nonProfileType OR tbbIniEntry. never both.
			if ((aProps.nonProfileType && aProps.tbbIniEntry) || (!aProps.nonProfileType && !aProps.tbbIniEntry)) { console.error('aProps must contain key of nonProfileType OR tbbIniEntry. never both.'); throw new Error('aProps must contain key of nonProfileType OR tbbIniEntry. never both.'); }  // on same line as console as its a dev error
			
			// start - common props, everything should get these
			aProps.key = aProps.nonProfileType ? aProps.nonProfileType : aProps.tbbIniEntry.Path; // note: key of "nonProfileType" indicates that its not a profile toolbarbutton, and holds what type it is, only accepted values right now are seen in line below link9391813 // i set key to avoid react-reconciliation
			aProps.sKey = aProps.key; // because this.props.key is not accessible to the child i pass it to, i have to create sKey. its a react thing.
			aProps.sMsgObj = THAT.state.sMsgObj.aKey == aProps.key || aProps.key == 'createnewprofile' ? THAT.state.sMsgObj : undefined;
			// end - common props, everything should get these
			
			list.push(
				React.createElement(ToolbarButton, aProps)  // link1049403002 key must be set to aPath --- never mind learned that key is not accessible via this.props.key
			);
		};
		
		var list = [];
		
		if (this.state.sIniObj.length == 0) {
			// creating loading item
			addToolbarButton({
				nonProfileType: 'loading'
			});
		} else {
			var sGenIniEntry = getIniEntryByKeyValue(this.state.sIniObj, 'groupName', 'General');
			
			var sCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(this.state.sIniObj, 'currentProfile', true);

			var keyValSort = getPrefLikeValForKeyInIniEntry(sCurProfIniEntry, sGenIniEntry, 'ProfilistSort');
			
			// start - sort it properly and put currentProfile at top
			// copy sIniObj and remove all but the profile entries, and place currentProfile entry on top, and create case insensitive name field
			var onlyProfilesIniObj = JSON.parse(JSON.stringify(this.state.sIniObj)); // copy it because i sort this, and i dont want sort to affect this.state.sIniObj
			
			for (var i=0; i<onlyProfilesIniObj.length; i++) {
				if (!onlyProfilesIniObj[i].Path) {
					// remove this as its non-profile
					onlyProfilesIniObj.splice(i, 1);
					i--;
				} else {
					// create the sortBy field in entries noWriteObj
					// link83737383
					if (keyValSort == 1) {
						onlyProfilesIniObj[i].noWriteObj.createOrder = onlyProfilesIniObj[i].groupName.match(reProfCreateOrder)[1];
					} else if (keyValSort == 2 || keyValSort == 3) {
						onlyProfilesIniObj[i].noWriteObj.lowerCaseName = onlyProfilesIniObj[i].Name.toLowerCase();
					}
					
					// if its the currentProfile entry remove it
					if (onlyProfilesIniObj[i].noWriteObj.currentProfile) {
						sCurProfIniEntry = onlyProfilesIniObj.splice(i, 1)[0]; // update the sCurProfIniEntry to the one from onlyProfilesIniObj because here we aded in createBy key see link83737383
						i--;
					}
				}
			};
			if (gSortIniFunc[keyValSort]) { // because default sort order is create order asc it can be undefined so no need for sorting
				onlyProfilesIniObj.sort(gSortIniFunc[keyValSort]);
			}
			// after sorting put sCurProfIniEntry as first element
			onlyProfilesIniObj.splice(0, 0, sCurProfIniEntry);

			// end - sort it properly and put currentProfile at top
			

			
			// add in the profiles in order
			var keyValDevMode = getPrefLikeValForKeyInIniEntry(sCurProfIniEntry, sGenIniEntry, 'ProfilistDev');
			var jProfilistBuilds; // j prefix stands for ProfilistBuilds parsed as jvascript with JSON.parse // declared this semi-global do this if so i only have to do JSON.parse on the first time link84727229
			
			for (var i=0; i<onlyProfilesIniObj.length; i++) {
				var aProfTbbProps = {
					tbbIniEntry: onlyProfilesIniObj[i],
					sGenIniEntry: sGenIniEntry, // for statedIniObj_GeneralEntry
					// sIniObj: this.state.sIniObj,
				};
				
				// search/filter stuff
				if (i != 0) {
					aProfTbbProps.sSearchPhrase = this.state.sSearchPhrase;
				}

				
				// devmode stuff
				if (keyValDevMode == '1') {
					aProfTbbProps.jProfilistDev = true;
					aProfTbbProps.sCurProfIniEntry = sCurProfIniEntry;
					
					if (!jProfilistBuilds) { // do this if so i only have to do JSON.parse on the first time link84727229
						var keyValBuilds = getPrefLikeValForKeyInIniEntry({}, sGenIniEntry, 'ProfilistBuilds'); // first arg of aIniEntry not used by getPrefLikeValForKeyInIniEntry because ProfilistBuilds is unspecificOnly, so this function gets the value from gen otherwise returns default value
						jProfilistBuilds = JSON.parse(keyValBuilds);
					}
					aProfTbbProps.jProfilistBuilds = jProfilistBuilds;
				}
				addToolbarButton(aProfTbbProps);
			}

			// add in the ending toolbar buttons
			addToolbarButton({
				nonProfileType: 'noresultsfor',
				sSearchPhrase: this.state.sSearchPhrase,
				sSearchHasResults: this.state.sSearchHasResults
			});
			addToolbarButton({
				nonProfileType: 'createnewprofile'
			});
		}
		
		var cClassList = [];
		if (this.state.sMsgObj.aKey == 'createnewprofile' && this.state.sMsgObj.label == myServices.sb.GetStringFromName('pick-to-clone')) {
			cClassList.push('profilist-clone-pick');
		}
		if (cClassList.length) {
			cClassList = cClassList.join(' ');
		}
		if (this.state.sIniObj.length > 0) {
			// give the container the data-state open attribute
			document.getElementById('profilist_menu_container').setAttribute('data-state', 'open');
		} else {
			document.getElementById('profilist_menu_container').removeAttribute('data-state');
		}
        return React.createElement(
            'div', {id: 'profilist_menu', className:cClassList, 'data-state': (this.state.sIniObj.length == 0 ? undefined : 'open') },
				list
        );
    }
});
var ToolbarButton = React.createClass({
    displayName: 'ToolbarButton',
	click: function() {
		console.error('TBB CLICKED, props:', this.props);
		if (this.props.sKey == 'createnewprofile') {
			alert('create new profile');
		} else if (this.props.tbbIniEntry) {
			if (this.props.tbbIniEntry.noWriteObj.currentProfile) {
				alert('clicked on current profile tbb, do any acction? nothing planned as of now');
			} else {
				// launch this profile
				// alert('launch profile');
				contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['launchOrFocusProfile', this.props.tbbIniEntry.Path]);
			}
		}
		else { console.log('dev_info - clicked something other then create new profile or launch profile'); }
	},
    render: function render() {
		// this.props.tbbIniEntry is not set, so undefined, for non-porilfes, so for "loading", "createnewprofile"
			// instead, the nonProfileType key will be set, so this.props.nonProfileType // so if nonProfileType not set, then assume its "profile" (so "inactive" or "active") toolbarbutton
		console.log('ToolbarButton-render FOR key:', this.props.tbbIniEntry ? this.props.tbbIniEntry.Path : this.props.nonProfileType, 'this.props:', this.props);
		
		// test if in search mode
		var hideDueToSearch = false;
		
		var searchMatchedAtIndex = []; // holds index at which sSearchPhrase was found in name. the end is obviously known, its the index PLUS sSearchPhrase length
		if (this.props.sSearchPhrase && this.props.sSearchPhrase != '') {
			// searchInProccess = true;
			if (this.props.nonProfileType == 'noresultsfor') {
				if (this.props.sSearchHasResults) {
					hideDueToSearch = true;
				} // else { hideDueToSearch = false; } // no need as it inits at false
			} else if (this.props.tbbIniEntry && this.props.tbbIniEntry.Path) {
				// its a profile
				var searchPatt = new RegExp(escapeRegExp(this.props.sSearchPhrase), 'ig');
				while (searchPatt.exec(this.props.tbbIniEntry.Name)) {
					searchMatchedAtIndex.push(searchPatt.lastIndex - this.props.sSearchPhrase.length);
				}
				if (searchMatchedAtIndex.length == 0) {
					hideDueToSearch = true;
				}
			}
		} else {
			if (this.props.nonProfileType == 'noresultsfor') {
				hideDueToSearch = true;
			} // else { hideDueToSearch = false; } // no need as it inits at false
		}
		
		
		var cClassList = ['profilist-tbb'];
		if (this.props.sMsgObj && this.props.sMsgObj.aKey == this.props.sKey) {
			cClassList.push('profilist-tbb-show-msg');
		}
		return React.createElement('div', {className: cClassList.join(' '), 'data-tbb-type': (!this.props.tbbIniEntry ? this.props.nonProfileType : (this.props.tbbIniEntry.noWriteObj.status ? 'active' : 'inactive')), style: (hideDueToSearch ? {display:'none'} : undefined), onClick: this.click},
			React.createElement('div', {className: 'profilist-tbb-primary'},
				this.props.nonProfileType == 'noresultsfor' || this.props.nonProfileType == 'loading' ? undefined : React.createElement('div', {className: 'profilist-tbb-hover'}),
				this.props.sKey == 'noresultsfor' ? undefined: React.createElement(PrimaryIcon, {tbbIniEntry: this.props.tbbIniEntry, sKey: this.props.sKey}),
				!this.props.sMsgObj || this.props.sMsgObj.aKey != this.props.sKey ? undefined : React.createElement(TBBMsg, {sKey: this.props.sKey, sMsgObj: this.props.sMsgObj}),
				searchMatchedAtIndex.length == 0 ? undefined : React.createElement(LabelHighlighted, {value:this.props.tbbIniEntry.Name, searchMatchedAtIndex: searchMatchedAtIndex, sSearchPhrase: this.props.sSearchPhrase}),
				React.createElement('input', {className: 'profilist-tbb-textbox', type:'text', disabled:'disabled', /*defaultValue: (!this.props.tbbIniEntry ? undefined : this.props.tbbIniEntry.Name),*/ value: (this.props.tbbIniEntry ? /*undefined*/ this.props.tbbIniEntry.Name : (this.props.nonProfileType == 'noresultsfor' ? myServices.sb.formatStringFromName('noresultsfor', [this.props.sSearchPhrase], 1) : myServices.sb.GetStringFromName(this.props.nonProfileType))) })
				// React.createElement('div', {className: 'profilist-tbb-textbox', contentEditable:true, disabled:'disabled'},
				// 	(this.props.tbbIniEntry ? /*undefined*/ this.props.tbbIniEntry.Name : (this.props.nonProfileType == 'noresultsfor' ? myServices.sb.formatStringFromName('noresultsfor', [this.props.sSearchPhrase], 1) : myServices.sb.GetStringFromName(this.props.nonProfileType)))
				// )
			),
			this.props.nonProfileType != 'createnewprofile' && !this.props.tbbIniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu'},
				this.props.nonProfileType != 'createnewprofile' ? undefined : React.createElement(SubiconClone, {sMsgObj: this.props.sMsgObj}),
				!this.props.tbbIniEntry || !this.props.tbbIniEntry.Default ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-isdefault'}),
				!this.props.tbbIniEntry || !this.props.jProfilistDev || (!this.props.tbbIniEntry.noWriteObj.status && !this.props.tbbIniEntry.ProfilistTie /*is not running and is not tied, so dont show this*/) ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-buildhint profilist-devmode', style: {backgroundImage: 'url("' + (this.props.tbbIniEntry.noWriteObj.status ? /*means its running so show the running exeIcon*/ getImgPathOfSlug(this.props.tbbIniEntry.noWriteObj.exeIconSlug) : /*means its NOT RUNNING and is tied (if it wasnt running and NOT tied it would never render this element)*/ getImgPathOfSlug(getBuildValByTieId(this.props.jProfilistBuilds, this.props.tbbIniEntry.ProfilistTie, 'i'))) + '")'} }), // profilist-si-isrunning-inthis-exeicon-OR-notrunning-and-clicking-this-will-launch-inthis-exeicon
				!this.props.tbbIniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-dots'}),
				!this.props.tbbIniEntry || !this.props.jProfilistDev ? undefined : React.createElement(SubiconTie, {tbbIniEntry: this.props.tbbIniEntry, jProfilistBuilds: this.props.jProfilistBuilds, sCurProfIniEntry: this.props.sCurProfIniEntry}),
				!this.props.tbbIniEntry || !this.props.jProfilistDev ? undefined : React.createElement(SubiconSafe),
				!this.props.tbbIniEntry ? undefined : React.createElement(SubiconSetDefault, {tbbIniEntry: this.props.tbbIniEntry}),
				!this.props.tbbIniEntry ? undefined : React.createElement(SubiconRename),
				!this.props.tbbIniEntry || this.props.tbbIniEntry.noWriteObj.status == true || this.props.tbbIniEntry.noWriteObj.currentProfile /*currentProfile check is not needed because if its currentProfile obviously .status == true */ ? undefined : React.createElement(SubiconDel, {tbbIniEntry: this.props.tbbIniEntry, sKey: this.props.sKey})
			)
        );
    }
});

var LabelHighlighted = React.createClass({
    displayName: 'ToolbarButton',
	render: function render() {
		var inner = [];
		
		// console.info('this.props.searchMatchedAtIndex:', this.props.searchMatchedAtIndex);
		var leaveOffIndex = 0;
		for (var i=0; i<this.props.searchMatchedAtIndex.length; i++) {
			if (leaveOffIndex < this.props.searchMatchedAtIndex[i]) {
				inner.push(this.props.value.substring(leaveOffIndex, this.props.searchMatchedAtIndex[i]));
				leaveOffIndex = this.props.searchMatchedAtIndex[i] + 1;
			}
			// console.log('start index:', this.props.searchMatchedAtIndex[i]);
			inner.push(React.createElement('span', {className:'profilist-tbb-highlight-this'},
				this.props.value.substr(this.props.searchMatchedAtIndex[i], this.props.sSearchPhrase.length)
			));
			leaveOffIndex = this.props.searchMatchedAtIndex[i] + this.props.sSearchPhrase.length;
		}
		
		if (leaveOffIndex < this.props.value.length) {
			inner.push(this.props.value.substr(leaveOffIndex));
		}
		return React.createElement('div', {className: 'profilist-tbb-highlight'}, // link1958939383
			inner
		);
		// return React.createElement.apply(this, ['div', {className: 'profilist-tbb-highlight'}].concat(inner)); // this method throws no warning of ```"Warning: Each child in an array or iterator should have a unique "key" prop. Check the render method of `ToolbarButton`. See https://fb.me/react-warning-keys for more information." react.dev.js:18780:9``` // but the above doesnt need apply or concat, so its two less functions so ill go with that // see link1958939383
	}
});
var PrimaryIcon = React.createClass({
    displayName: 'PrimaryIcon',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('ICON CLICKED');
		
	},
	render: function render() {
		// props
		//	sKey

		var aProps = {
			className: 'profilist-tbb-icon',
			onClick: this.click
		};
		
		if (this.props.sKey == 'createnewprofile' || this.props.sKey == 'loading') {
			// icon is not clickable
			delete aProps.onClick;
		}
		
		var aRendered = React.createElement('div', aProps,
			!this.props.tbbIniEntry ? undefined : React.createElement('img', {className: 'profilist-tbb-badge', src: this.props.tbbIniEntry.ProfilistBadge ? getImgPathOfSlug(this.props.tbbIniEntry.ProfilistBadge) : core.addon.path.images + 'missing.png' }),
			React.createElement('img', {className: 'profilist-tbb-status'})
		)
		return aRendered;
	}
});
var SubiconRename = React.createClass({
    displayName: 'SubiconRename',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('RENAME CLICKED');
		
	},
	render: function render() {
		// props - none

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-rename',
			onClick: this.click
		};
		
		return React.createElement('div', aProps);
	}
});
var SubiconSetDefault = React.createClass({
    displayName: 'SubiconSetDefault',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('SETDEFAULT CLICKED');
		
		var gIniEntry_toUndefault = getIniEntryByKeyValue(gIniObj, 'Default', '1'); // gIniEntry is alias for liveIniEntry
		delete gIniEntry_toUndefault.Default;
		
		var gIniEntry_toSetDefault = getIniEntryByKeyValue(gIniObj, 'Path', this.props.tbbIniEntry.Path); // gIniEntry is alias for liveIniEntry
		gIniEntry_toSetDefault.Default = '1';
		
		MyStore.setState({
			sIniObj: gIniObj
		});
		
	},
	render: function render() {
		// this.props
		//	tbbIniEntry
		
		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-setdefault',
			onClick: this.click
		};
		
		if (this.props.tbbIniEntry.Default) {
			aProps.style = {
				filter: 'grayscale(0%)'
			}
		}
		
		return React.createElement('div', aProps);
	}
});
var SubiconSafe = React.createClass({
    displayName: 'SubiconSafe',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('SAFE CLICKED');
		
	},
	render: function render() {
		// props - none

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-safe profilist-devmode',
			onClick: this.click
		};
		
		return React.createElement('div', aProps);
	}
});
var TBBMsg = React.createClass({
    displayName: 'TBBMsg',
	componentDidMount: function(e) {
		if (this.props.sMsgObj.text) {
			var field = ReactDOM.findDOMNode(this.refs.msgTextbox);
			field.setSelectionRange(0, field.value.length, 'backward'); //backwards so if the value.length is longer then field width, on select all it will not end at end, it will be at start
			field.focus()
		}
	},
	render: function render() {
		// props
		//	sKey
		//	sMsgObj
		
		var aRender = React.createElement('div', {className: 'profilist-tbb-msg'},
			!this.props.sMsgObj.text ? this.props.sMsgObj.label : React.createElement('input', {ref:'msgTextbox', type:'text', defaultValue: this.props.sMsgObj.text})
		);
		
		return aRender;
	}
});
var SubiconDel = React.createClass({
    displayName: 'SubiconDel',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('DEL CLICKED');
		if (this.props.tbbIniEntry.noWriteObj.status) {
			alert('error! cannot delete this profile because it is currently running!');
		} else {
			var THAT = this;
			MyStore.setState({
				sMsgObj: {
					aKey: this.props.sKey,
					label: myServices.sb.GetStringFromName('confirm-delete'),
					onAccept: function() {
						var cIniObj = gIniObj;
						for (var i=0; i<cIniObj.length; i++) {
							if (cIniObj[i].Path && cIniObj[i].Path == THAT.props.tbbIniEntry.Path) {
								cIniObj.splice(i, 1);
								MyStore.setState({
									sIniObj: cIniObj,
									sMsgObj: {}
								});
								return;
							}
						}
					}
				}
			});
		}
		
	},
	render: function render() {
		// props
		//	tbbIniEntry

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-del',
			onClick: this.click
		};
		
		var aRendered = React.createElement('div', aProps);
		return aRendered;
	}
});
var SubiconClone = React.createClass({
    displayName: 'SubiconClone',
	click: function(e) {
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('CLONE CLICKED');
		MyStore.setState({
			sMsgObj: {
				aKey: 'createnewprofile',
				label: myServices.sb.GetStringFromName('pick-to-clone'),
				onAccept: function(){}
			}
		});
		
	},
	mouseEnter: function() {
		if (this.props.sMsgObj.label != myServices.sb.GetStringFromName('pick-to-clone')) {
			MyStore.setState({
				sMsgObj: {
					aKey: 'createnewprofile',
					label: myServices.sb.GetStringFromName('clone-profile'),
					onAccept: function(){},
					onCancel: function(){}
				}
			});
		}
	},
	mouseLeave: function() {
		if (this.props.sMsgObj.label != myServices.sb.GetStringFromName('pick-to-clone')) {
			MyStore.setState({
				sMsgObj: {}
			});
		}
	},
	render: function render() {
		// props
		//	tbbIniEntry

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-clone',
			onClick: this.click,
			onMouseEnter: this.mouseEnter,
			onMouseLeave: this.mouseLeave
		};
		
		var aRendered = React.createElement('div', aProps);
		return aRendered;
	}
});
var SubiconTie = React.createClass({
    displayName: 'SubiconTie',
	getInitialState: function() {
		console.warn('getting initail state on subicontie');
		return {
			bi: -3, // stands for build_index_tied_to // -3 means not yet initialized, so check if ini has one and initialize it
			onent: -2 // means tie on onMouseEnter
		}
	},
	click: function(e) {
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('TIE CLICKED');
		var newBi;
		if (this.state.bi == -2) { // its untied
			newBi = -1; // tie to current
		} else {
			var i = this.state.bi + 1;
			// find next entry that isnt currentProfile's exePath
			while (i < this.props.jProfilistBuilds.length) {
				console.log('while i:', i);
				if (this.props.jProfilistBuilds[i].p != this.props.sCurProfIniEntry.noWriteObj.exePath) {
					newBi = i;
					break;
				}
				i++;
			}
			if (newBi === undefined) {
				// nothing found so untie it
				newBi = -2;
			}
		}

		this.setState({
			bi: newBi
		});
	},
	mouseEnter: function() {

		this.setState({
			onent: this.state.bi
		});
	},
	mouseLeave: function() {
		if (this.state.bi != this.state.onent) {
			console.log('will now save');
			// :todo: send message to bootstrap to save to ini
			var gIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', this.props.tbbIniEntry.Path);
			console.log('gIniEntry:', gIniEntry);
			
			if (this.state.bi == -2) {
				// means untied
				delete gIniEntry.ProfilistTie;
				console.log('gIniEntry after deleting tie:', gIniEntry);
			} else {
				// tied to current or something else
				
				var cTieId;
				if (this.state.bi == -1) {
					// when send message to bootstrap here as well, read below for what it should do
					// get aTieId(ProfilistTie) from bi
						// if current is not in there, add it at last index, bootstrap will do the same but bootstrap will also write it to file :todo:
					
					var cMaxId = 0; // if need to add, this is what bootstrap will do as well, so minimum id to set should be 1 :note: :todo: :link: :important: // i set this to aMinId - 1
					for (var i=0; i<this.props.jProfilistBuilds.length; i++) {
						if (this.props.jProfilistBuilds[i].p == this.props.sCurProfIniEntry.noWriteObj.exePath) {
							cTieId = this.props.jProfilistBuilds[i].id;
							cMaxId = null; // not needed, as i only need this for if currentProfile
							break;
						}
						if (this.props.jProfilistBuilds[i].id > cMaxId) {
							cMaxId = this.props.jProfilistBuilds[i].id;
						}
					}
					if (!cTieId) { // especially because of this test, minimum id to set should be 1
						var cNextId = cMaxId + 1;
						cTieId = cNextId;
						
						this.props.jProfilistBuilds.push({
							id: cTieId,
							p: this.props.sCurProfIniEntry.noWriteObj.exePath,
							i: this.props.sCurProfIniEntry.noWriteObj.exeIconSlug
						});
						
						var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
						gGenIniEntry.ProfilistBuilds = JSON.stringify(this.props.jProfilistBuilds);
					}
				} else {
					cTieId = this.props.jProfilistBuilds[this.state.bi].id;
				}
				gIniEntry.ProfilistTie = cTieId + '';
				
				console.log('gIniEntry after adding tie:', gIniEntry);
			}
			
			MyStore.updateStatedIniObj();
		}
	},
	render: function render() {
		// props
		//		jProfilistBuilds
		//		sCurProfIniEntry
		//		tbbIniEntry
		// getImgPathOfSlug(this.props.sCurProfIniEntry.noWriteObj.exeIconSlug)
		console.info('this.props:', this.props);
		console.log('parsedBuilds:', this.props.jProfilistBuilds);
		// if current is not in ProfilistBuilds then add it in

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-tie profilist-devmode',
			style: {},
			onMouseEnter: this.mouseEnter,
			onMouseLeave: this.mouseLeave,
			onClick: this.click
		};
		
		if (this.state.bi == -3) {
			// first render of component, so component is uninted, so check if tbbIniEntry is tied, and if it then store its index in parsedBuilds to this.state.bi
			if (this.props.tbbIniEntry.ProfilistTie) {
				for (var i=0; i<this.props.jProfilistBuilds.length; i++) {
					if (this.props.jProfilistBuilds[i].id == this.props.tbbIniEntry.ProfilistTie) {
						this.state.bi = i;
						break;
					}
				}
				if (this.state.bi == -3) {
					console.error('error error! this should never happen, how can its tbbIniEntry have a ProfilistTie but then I couldnt find it in parsedBuilds???', 'parsedBuilds:', this.props.jProfilistBuilds, 'tbbIniEntry:', this.props.tbbIniEntry);
					throw new Error('error error!!!!! should never get here!!! so i have no fallback setup!!!');
				}
			} else {
				this.state.bi = -2; // its untied
			}
		}
		
		if (this.state.bi > -1) {
			// its tied to something other then current
			aProps.style.filter = 'grayscale(0%)';
			aProps.style.backgroundImage = 'url("' + getImgPathOfSlug(this.props.jProfilistBuilds[this.state.bi].i) + '")';
		} else {
			if (this.state.bi == -1) {
				// its tied to current
				aProps.style.filter = 'grayscale(0%)';
			} else { // its untied (this.state.bi should be -2), so show current
				aProps.style.filter = 'grayscale(100%)';
			}
			aProps.style.backgroundImage = 'url("' + getImgPathOfSlug(this.props.sCurProfIniEntry.noWriteObj.exeIconSlug) + '")';
		}
		
		var aRendered = React.createElement('div', aProps); // , this.state.bi, ' ', this.state.onent
		return aRendered;
	}
});

// end - react components

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
var reA = /[^a-zA-Z]/g; // for compareAlphaNumeric
var reN = /[^0-9]/g; // for compareAlphaNumeric
function compareAlphaNumeric(a, b) {
	// useful for sorting algo, originally inteded for alpha-numeric asc sort. taken from - http://stackoverflow.com/a/4340339/1828637
	// returns -1 if a < b
	// returns -1 if a == b
	// returns -1 if a > b
    var aA = a.replace(reA, '');
    var bA = b.replace(reA, '');
    if(aA === bA) {
        var aN = parseInt(a.replace(reN, ''), 10);
        var bN = parseInt(b.replace(reN, ''), 10);
        return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
        return aA > bA ? 1 : -1;
    }
}
// end - common helper functions