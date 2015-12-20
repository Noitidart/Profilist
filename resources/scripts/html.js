// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cu.import('resource://gre/modules/osfile.jsm');
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
	},
	profilist: {
		path: {
			icons: OS.Path.join(OS.Constants.Path.userApplicationDataDir, 'profilist_data', 'icons')
		}
	}
};


// Lazy imports
var myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'html.properties?' + core.addon.cache_key); });


/* notes on noWriteObj
status: bool. tells whethere its running or not. if not set, undefined is equivlanet of false
*/
var gKeyInfoStore = { //info on the Profilist keys i write into ini // all values must be strings as i writing and reading from file
	ProfilistStatus: {
		// pref: false		// i dont need this key. i can just test for lack of any of the keys only for prefs. but anyways fallse/missing means not a preference. means its programtically set
		possibleValues: [	// if not provided, then the value can be set to anything
			'0',			// installed BUT disabled
			'1'				// installed AND enabled
		]
	},
	ProfilistDev: {				// developer mode on/off
		pref: true,				// i dont really need this key, i can detect if its pref by testing if it has any of the "this key only for prefs"
		specificOnly: false,	// means, it cannot be set across all profiles // this key only for prefs
		defaultSpecific: false,	// means by default it affects all profiles (its unspecific) // this key only for prefs // this key only for prefs with specificOnly:false
		defaultValue: '0',		// this key only for prefs // if value not found in profile group, or general group. then this value is used. // if value found in general, but specific is set to true by user, then use the value from general. // if value found in profile, and specific is set to false by user, then set general value, and delete the one from profile group
		possibleValues: [
			'0',				// devmode off
			'1'					// devmode on
		]
	},
	ProfilistSort: {			// the order in which to show the other-profiles in the profilist menu.
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
		defaultValue: '2',
		possibleValues: [		// link83737383
			'0',				// by create order ASC
			'1',				// by create order DESC
			'2',				// by alpha-numeric-insensitive ASC
			'3'					// by alpha-numeric-insensitive DESC
		]
	},
	ProfilistNotif: {			// whether or not to show notifications
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
		defaultValue: '1',
		possibleValues: [
			'0',				// dont show
			'1'					// show
		]
	},
	ProfilistLaunch: {			// whether on user click "create new profile" if should launch right away using default naming scheme for Path and Name
		pref: true,
		specificOnly: false,
		defaultSpecific: false,
		defaultValue: '1',
		possibleValues: [
			'0',				// dont launch right away, allow user to type a path, then hit enter (just create dont launch), alt+enter (create with this name then launch) // if user types a system path, then it is created as IsRelative=0
			'1'					// launch right away, as IsRelative=1, with default naming scheme for Path and Name
		]
	},
	ProfilistBadge: {			// slug_of_icon_in_icons_folder
		specificOnly: true
	},
	ProfilistTie: {			// slug_of_icon_in_icons_folder
		specificOnly: true
		// value should be id of something in the ProfilistBuilds.
	},
	ProfilistTemp: {			// tells whether (temporary profiles found && that did NOT have profilist installed) into them (so no ProfilistStatus), should remain in ini after it is found to be not running. only way to remove is to delete from menu. // if profilist is installed into that profile, it will be a temporary profile still so group will be [TempProfile#] but it will stay regardless of this key setting
		unspecificOnly: true,
		defaultValue: '0',
		possibleValues: [
			'0',				// do not keep them in ini, after it is found to be not running
			'1'					// keep them in ini even after it is found to be not running
		]
	},
	ProfilistBuilds: {			// whether or not to show notifications
		pref: true,
		unspecificOnly: true	// this pref affects all profiles, cannot be set to currently running (specific)
		// value should be a json array of objects. ie: [{id:date_get_time_on_create, i:slug_of_icon_in_icons_folder, p:path_to_exe},{i:slug_of_icon_in_icons_folder, p:path_to_exe}] // id should be date in ms on create, so no chance of ever getting reused
	}
};

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
			currentProfile: true // indicates that the running profile is this one
		},
		Name: 'Developer',
		IsRelative: '1',
		Path: 'Profiles/m2b8zkct.Unnamed Profile 1'
		//ProfilistStatus: '1' // if it does not have this key, then profilist is not installed in it
	},
	{
		groupName: 'General',
		noWriteObj: {},
		StartWithLastProfile: '1'
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

var Menu = React.createClass({
    displayName: 'Menu',
	getInitialState: function() {
		return {
			sIniObj: [], // sIniObj stands for stateIniObject
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
			sIniObj: JSON.parse(JSON.stringify(gIniObj))
		});
	},
	executeSearch: function(newSearchPhrase) {
		
		// only searches on all non-currentProfile's
		
		console.log('newSearchPhrase:', newSearchPhrase);
		
		var cResultsCount = 0;
		if (newSearchPhrase == '') {
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile) {
					// its a profile
					cResultsCount++;
				}
			}
		} else {
			var searchPatt = new RegExp(escapeRegExp(newSearchPhrase), 'i');
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile && searchPatt.test(this.state.sIniObj[i].Name)) {
					// its a profile
					cResultsCount++;
				}
			}
		}
		this.setState({
			searchPhrase: newSearchPhrase,
			searchResultsCount: cResultsCount
		});
		console.log('cResultsCount:', cResultsCount);
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
						if (this.state.searchPhrase.length > 0) {
							this.executeSearch(this.state.searchPhrase.substr(0, this.state.searchPhrase.length - 1));
							// e.preventDefault(); // so page doesnt go back // needed if decide to use div contentEditable. For textbox this is not needed
						}
					}
					
				break;
			case 'Escape':
				
					// if editing something, then cancel edit. if mouse is not over the stack, then close profilist_menu. as during edit, force open happens
					// if cloning, then cancel clone.
					
					// search stuff
					if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
						if (this.state.searchPhrase.length > 0) {
							this.executeSearch('');
						}
					}
					
				break;
			default:
			
				// search stuff
				if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
					if (e.key.length == 1) { // test to make sure its a character, not a special key like Home or something
						// append to searchPhrase
						this.executeSearch(this.state.searchPhrase + e.key);
					} // else do nothing
				}
		}
	},
    render: function render() {
		var THAT = this;
		var addToolbarButton = function(aProps) {
			// note: aProps must contain key of nonProfileType OR iniEntry. never both.
			if ((aProps.nonProfileType && aProps.iniEntry) || (!aProps.nonProfileType && !aProps.iniEntry)) {
				throw new Error('aProps must contain key of nonProfileType OR iniEntry. never both.');
			}
			// only pass nohting for aPath when its initial state. to show the loading tbb
			
			// if set field name of "key" in props, the prop of "key" will not show up in props in the react-child
			// set key to avoid react-reconciliation
			if (aProps.nonProfileType) {
				// note: key of "nonProfileType" indicates that its not a profile toolbarbutton, and holds what type it is, only accepted values right now are seen in line below link9391813
				if (['createnewprofile', 'loading', 'noresultsfor'].indexOf(aProps.nonProfileType) == -1) { // link9391813
					throw new Error('Unrecgonized value for nonProfileType');
				}
				aProps.key = aProps.nonProfileType;
			} else {
				// no "nonProfileType" key so its "profile" type toolbarbutton
				aProps.key = aProps.iniEntry.Path;
			}
			
			console.log('addToolbarButton of key:', aProps.key);
			
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
			var cGenIniEntry = getIniEntryByKeyValue(this.state.sIniObj, 'groupName', 'General');
			
			var keyValSort = getKeyValForIniEntry('ProfilistSort', cGenIniEntry /*not used by getKeyValForIniEntry but I have to put in something*/, {
				aGenIniEntry: cGenIniEntry,
				aIniObj: this.state.sIniObj
			});
			
			// start - sort it properly and put currentProfile at top
			// copy sIniObj and remove all but the profile entries, and place currentProfile entry on top, and create case insensitive name field
			var onlyProfilesIniObj = JSON.parse(JSON.stringify(this.state.sIniObj));
			
			var curProfIniEntry; // the ini entry with currentProfile set to true
			for (var i=0; i<onlyProfilesIniObj.length; i++) {
				if (!onlyProfilesIniObj[i].Path) {
					onlyProfilesIniObj.splice(i, 1);
					i--;
				} else {
					// if its the currentProfile remove it and save it for later, we dont need this during sorting, as we will insert this back in as first element
					
					// create the sortBy field
					// link83737383
					if (keyValSort == 1) {
						onlyProfilesIniObj[i].noWriteObj.createOrder = onlyProfilesIniObj[i].groupName.match(reProfCreateOrder)[1];
					} else if (keyValSort == 2 || keyValSort == 3) {
						onlyProfilesIniObj[i].noWriteObj.lowerCaseName = onlyProfilesIniObj[i].Name.toLowerCase();
					}
					
					if (onlyProfilesIniObj[i].noWriteObj.currentProfile) {
						curProfIniEntry = onlyProfilesIniObj.splice(i, 1)[0];
						i--;
					}
				}
			};
			if (gSortIniFunc[keyValSort]) { // because default sort order is create order asc it can be undefined so no need for sorting
				onlyProfilesIniObj.sort(gSortIniFunc[keyValSort]);
			}
			// after sorting put curProfIniEntry as first element
			onlyProfilesIniObj.splice(0, 0, curProfIniEntry);
			
			// end - sort it properly and put currentProfile at top
			
			// add in the profiles in order
			for (var i=0; i<onlyProfilesIniObj.length; i++) {
				if (i == 0) {
					// add button without searchPhrase
					addToolbarButton({
						iniEntry: onlyProfilesIniObj[i],
						genIniEntry: cGenIniEntry
					});
				} else {
					addToolbarButton({
						searchPhrase: this.state.searchPhrase,
						iniEntry: onlyProfilesIniObj[i],
						genIniEntry: cGenIniEntry
					});
				}
			}

			// add in the ending toolbar buttons
			addToolbarButton({
				nonProfileType: 'noresultsfor',
				searchPhrase: this.state.searchPhrase,
				searchResultsCount: this.state.searchResultsCount
			});
			addToolbarButton({
				nonProfileType: 'createnewprofile'
			});
		}
		
        return React.createElement(
            'div', {id: 'profilist_menu'},
				list
        );
    }
});
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
function getKeyValForIniEntry(aKeyName, aProfIniEntryOrProfPath, aOptions={}) {
	//*******************************************
	// DESC
	// 	Gets value from provied iniEntry or gets it from gIniObj. and if value is not found it returns default if has one. if no default then returns NULL.
	// 	This function is read only on which xIniObj is provided
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	// ARGS
	//	aKeyName - the name of key from ini you want, such as ProfilistBadge
	// 	aProfIniEntryOrProfPath - if typeof is object, it is assumed aIniEntry. else it is aProfilePath which will be used to iterate through gIniObj
	//	aOptions - optonal
	//		aIniObj - set it to sIniObj or gIniObj - only needed if aProfIniEntryOrProfPath is a string && aOptions.aGenIniEntry is not provided
	//		aGenIniEntry - if not set, it will call getIniEntryByKeyValue
	// LOGIC
	// 	if gKeyInfoStore[aKeyName].unspecificOnly
	// 		true - if aKeyName in cGenIniEntry
	// 			true - return cGenIniEntry[aKeyName]
	// 			false - if defaultValue in gKeyInfoStore[aKeyName]
	// 				true - return gKeyInfoStore[aKeyName].defaultValue
	// 				false - return null
	// 		false - if NOT gKeyInfoStore[aKeyName].specificOnly
	// 			true - if aKeyName in cGenIniEntry # check if profile-unspecific value exists return else continue on
	// 				true - return cGenIniEntry[aKeyName]
	// 			# return profile-specific value else null
	// 				if aKeyName in cIniEntry
	// 					true - return cIniEntry[aKeyName]
	// 					false - if defaultValue in gKeyInfoStore[aKeyName]
	// 						true - return gKeyInfoStore[aKeyName].defaultValue
	// 						false - return null
	//*******************************************
	
	var cIniObj = aOptions.aIniObj ? aOptions.aIniObj : gIniObj;
	var cIniEntry = typeof(aProfIniEntryOrProfPath) == 'string' ? getIniEntryByKeyValue(cIniObj, 'Path', aProfIniEntryOrProfPath) : aProfIniEntryOrProfPath;
	var cGenIniEntry = aOptions.aGenIniEntry ? aOptions.aGenIniEntry : getIniEntryByKeyValue(cIniObj, 'groupName', 'General');
	
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	if (gKeyInfoStore[aKeyName].unspecificOnly) {
		// get profile-unspecific value else null
		if (aKeyName in cGenIniEntry) {
			return cGenIniEntry[aKeyName];
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
			if (aKeyName in cGenIniEntry) {
				return cGenIniEntry[aKeyName];
			}
		}
		// return profile-specific value else null
		if (aKeyName in cIniEntry) {
			return cIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				return null;
			}
		}
	}
	
	
	if (aKeyName in cGenIniEntry) {
		// user set it to profile-unspecific
		return cGenIniEntry[aKeyName];
	} else {
		// user set it to profile-specific
		if (aKeyName in cIniEntry) {
			return cIniEntry[aKeyName];
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
var ToolbarButton = React.createClass({
    displayName: 'ToolbarButton',

    render: function render() {
		// this.props.iniEntry is not set, so undefined, for non-porilfes, so for "loading", "createnewprofile"
			// instead, the nonProfileType key will be set, so this.props.nonProfileType // so if nonProfileType not set, then assume its "profile" (so "inactive" or "active") toolbarbutton
		console.log('ToolbarButton-render, this.props.iniEntry:', this.props.iniEntry);
		
		// test if in search mode
		var hideDueToSearch = false;
		
		var searchMatchedAtIndex = []; // holds index at which searchPhrase was found in name. the end is obviously known, its the index PLUS searchPhrase length
		if (this.props.searchPhrase && this.props.searchPhrase != '') {
			// searchInProccess = true;
			if (this.props.nonProfileType == 'noresultsfor') {
				if (this.props.searchResultsCount > 0) {
					hideDueToSearch = true;
				} // else { hideDueToSearch = false; } // no need as it inits at false
			} else if (this.props.iniEntry && this.props.iniEntry.Path) {
				// its a profile
				var searchPatt = new RegExp(escapeRegExp(this.props.searchPhrase), 'ig');
				while (searchPatt.exec(this.props.iniEntry.Name)) {
					searchMatchedAtIndex.push(searchPatt.lastIndex - this.props.searchPhrase.length);
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
			
		return React.createElement('div', {className: 'profilist-tbb', 'data-tbb-type': (!this.props.iniEntry ? this.props.nonProfileType : (this.props.iniEntry.noWriteObj.status ? 'active' : 'inactive')), style: (hideDueToSearch ? {display:'none'} : undefined)},
			React.createElement('div', {className: 'profilist-tbb-primary'},
				this.props.nonProfileType == 'noresultsfor' || this.props.nonProfileType == 'loading' ? undefined : React.createElement('div', {className: 'profilist-tbb-hover'}),
				this.props.nonProfileType == 'noresultsfor' ? undefined : React.createElement('div', {className: 'profilist-tbb-icon'},
					!this.props.iniEntry ? undefined : React.createElement('img', {className: 'profilist-tbb-badge', src: this.props.iniEntry.ProfilistBadge ? OS.Path.join(core.profilist.path.icons, this.props.iniEntry.ProfilistBadge, this.props.iniEntry.ProfilistBadge + '16.png') : 'chrome://mozapps/skin/places/defaultFavicon.png' }),
					React.createElement('img', {className: 'profilist-tbb-status'})
				),
				searchMatchedAtIndex.length == 0 ? undefined : React.createElement(LabelHighlighted, {value:this.props.iniEntry.Name, searchMatchedAtIndex: searchMatchedAtIndex, searchPhrase: this.props.searchPhrase}),
				React.createElement('input', {className: 'profilist-tbb-textbox', disabled:'disabled', /*defaultValue: (!this.props.iniEntry ? undefined : this.props.iniEntry.Name),*/ value: (this.props.iniEntry ? /*undefined*/ this.props.iniEntry.Name : (this.props.nonProfileType == 'noresultsfor' ? myServices.sb.formatStringFromName('noresultsfor', [this.props.searchPhrase], 1) : myServices.sb.GetStringFromName(this.props.nonProfileType))) })
				// React.createElement('div', {className: 'profilist-tbb-textbox', contentEditable:true, disabled:'disabled'},
				// 	(this.props.iniEntry ? /*undefined*/ this.props.iniEntry.Name : (this.props.nonProfileType == 'noresultsfor' ? myServices.sb.formatStringFromName('noresultsfor', [this.props.searchPhrase], 1) : myServices.sb.GetStringFromName(this.props.nonProfileType)))
				// )
			),
			this.props.nonProfileType != 'createnewprofile' && !this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu'},
				this.props.nonProfileType != 'createnewprofile' ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-clone'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-isdefault'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-dots'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-build profilist-devmode'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-safe profilist-devmode'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-setdefault'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-rename'}),
				!this.props.iniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-del'})
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
				this.props.value.substr(this.props.searchMatchedAtIndex[i], this.props.searchPhrase.length)
			));
			leaveOffIndex = this.props.searchMatchedAtIndex[i] + this.props.searchPhrase.length;
		}
		
		if (leaveOffIndex < this.props.value.length) {
			inner.push(this.props.value.substr(leaveOffIndex));
		}
		return React.createElement('div', {className: 'profilist-tbb-highlight'},
			inner
		);
	}
});
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
		// gIniObj[0].noWriteObj.status = true;
		// gIniObj[0].Name = 'RAWR';
		// MyStore.updateStatedIniObj();
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