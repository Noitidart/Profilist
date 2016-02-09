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
:TODO:
1. When rename profile, consider updating launcher right away
2. When createLauncher figures out it needs to rename, consider also testing if desktop has a link to it, and if it does, then rename that as well
*/
/*
GEN_RULEs - stands for GENERAL_RULES
1. Icon Slug
	* platform safed phrase. this phrase is found at ```OS.Path.join(core.profilist.path.icons, PHRASE, PHRASE + '_##.png')``` OR ```core.addon.path.images + 'channel-iconsets/' + PHRASE + '_##.png'```
	* IMPORTANT - iconSlug is different from imgSlug, as for imgSlug I have to append _##.png to it where the ## is variable. while with iconSlug it is just append .ico or .icns or no extension for linux style
2. Reason for using [TempProfile##] is so that regular Firefox profile manager doesn't pick these up and show them
3. The ## in [Profile##] or [TempProfile##] is not guranteed in properly numbered. It is only gurnateed on initial read. If do delete or create profile, it doesnt properly number it. It is properly numbered on write though. However it is guranteed that they are in chronological order. So on create it will take and use the max number + 1 that was found.
4. To create a profile with a non-relative path. Only way is to set "Launch on Create" option to disabled.
5. :TODO: If dev mode is on, then in General.noWriteObj i should put in the imgSrc path for the one closest to 16, tell if i should resize
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
	* On 020916 I added -1, so this is no longer true, if user install profilist on that profile then ProfilistStatus is changed to 1 -- Found on all profile ini entrys that have profilist installed - meaing if it is not on it, then profilist is not installed on it
	* '0' - installed BUT disabled
	* '1' - installed AND enabled
	* '-1' - NOT installed but it was a profile created by Profilist, and the offer of installing profilist hasnt been made yet
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
			exeIconSlug: 'beta' // REQUIRED if this profile status:true && devmode is true // currentProfile should be slug of icon for the exePath. this key is only available when it is running, meaning noWriteObj.status set to pid // this is needed only if ProfilistDev=='1' meaning devmode is on. it is used to show in the profilist-si-buildhint
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

// :note: should attach doOnBlur to window.blur after page is init'ed for first time, or if widnow not focused, then attach focus listener link147928272
function ifNotFocusedDoOnBlur() { // was ifNotFocusedAttachFocusListener
	if (!isFocused(window)) {
		attachFocusListener();
	}
}

function attachFocusListener() {
	// :note: i dont know why im removing focus on blur, but thats how i did it in nativeshot, it must avoid some redundancy
	window.addEventListener('focus', doOnFocus, false);
}

function detachFocusListener() {
	window.removeEventListener('focus', doOnFocus, false);
}

function doOnFocus() {
	detachFocusListener();
	// fetch prefs from bootstrap, and update dom
	fetchJustIniObj();
}

// End - DOM Event Attachments
// Start - Page Functionalities
function fetchJustIniObj() {
	sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchJustIniObj'], bootstrapMsgListener.funcScope, function(aIniObj) {
		console.log('ok got new ini obj, will now set global nad update react component:', aIniObj);
		// alert('ok got new ini obj, will now set global nad update react component');
		gIniObj = aIniObj;
		console.error('ok setting up new gIniObj to this:', aIniObj);
		
		MyStore.setState({
			sIniObj: JSON.parse(JSON.stringify(gIniObj))
		})
	});
}
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
			
			window.addEventListener('blur', attachFocusListener, false); // link147928272
			ifNotFocusedDoOnBlur();
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

function setInteractiveMsg(aMessage, aKey, aDetails, aInteractiveCallbacks) {
	
	if (!aDetails) { console.error('dev error! must set aDetails!!!'); throw new Error('dev error! must set aDetails!!!'); }
	
	aMessage.interactive = {
		sKey: aKey,
		details: aDetails
	};
	
	if (!aInteractiveCallbacks) {
		gInteractiveCallbacks = {};
	} else {
		gInteractiveCallbacks = aInteractiveCallbacks;
	}
	
	// dont worry about gInteractiveRefs, that is set on componentDidMount
}

// start - react components
var Menu = React.createClass({
    displayName: 'Menu',
	getInitialState: function() {
		return {
			sIniObj: [], // sIniObj stands for stateIniObject
			sSearchPhrase: '',
			sSearchHasResults: false,
			sArrowIndex: '', // when user does up/down arrow keys this will keep track of the index it has selected
			sMsgObj: {}, // key is sKey, value is object
			sSearch: null, // if search is in progress this is an object. {phrase:'what he typed', matches:{key is tbbIniEntry.Path : [value is array of indexes matched at]}}
			sMessage: {interactive:{},hover:{}}
			/*
			{
				interactive: { ///// link38181 :note: :important: neeeeeeeever set .interactive object with new_```sMessage.interactive = {......}````
					sKey:,
					details: { // generic messagesdetails object - link214111222
						type: 'textbox' || 'label',
						placeholder: string, only for textbox
						text: string. if type is textbox, then this it is initialized to this text
					}
					// onAccept: optional - gets e passed to it. moved to gInteractiveCallbacks.onAccept - because i need to keep this difffable objects simple - but more importantly, the JSON.stringify on it kills the function/domnode etc
					// onCancel: optional - moved to gInteractiveCallbacks.onCancel
					// refs: - moved to gInteractiveRefs // this is added if there are refs in the PrimaryMessage component - as of now refs exists for textbox type and its .refs.textbox
				},
				hover: {
					sKey: {
						// generic messagesdetails object - see link214111222
					}
				}
			}
			*/
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
		var new_sSearch;
		if (newSearchPhrase == '') {
			new_sSearch = null;
			/*
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile) {
					// its a profile
					cSearchHasResults++;
				}
			}
			*/
		} else {
			new_sSearch = {
				phrase: newSearchPhrase,
				matches: {}
			}
			var searchPatt = new RegExp(escapeRegExp(new_sSearch.phrase), 'ig');
			for (var i=0; i<this.state.sIniObj.length; i++) {
				if (this.state.sIniObj[i].Path && !this.state.sIniObj[i].noWriteObj.currentProfile) {
					// its a profile so test it
					var searchPattMatch;
					var searchMatchedAtIndex = []; // indexes in tbbIniEntry.Name substring where it matches
					searchPatt.lastIndex = 0;
					while (searchPattMatch = searchPatt.exec(this.state.sIniObj[i].Name)) {
						searchMatchedAtIndex.push(searchPatt.lastIndex - new_sSearch.phrase.length);
					}
					if (searchMatchedAtIndex.length) {
						new_sSearch.matches[this.state.sIniObj[i].Path] = searchMatchedAtIndex;
					}
					// cSearchHasResults++;
				}
			}
		}
		// this.setState({
			// sSearchPhrase: newSearchPhrase,
			// sSearchHasResults: cSearchHasResults
		// });
		console.info('new_sSearch:', new_sSearch);
		this.setState({
			sSearch: new_sSearch
		});
		// console.log('cSearchHasResults:', cSearchHasResults);
	},
	onKeyPress: function(e) {
		console.log('onKeyPress, e:', e);
		if (e.key != 'Enter' && (e.ctrlKey || e.altKey || e.metaKey)) { // disallow modifier keys if its not enter
			return;
		}
		// test if textbox field is showing in interactive
		if (e.key != 'Escape' && e.key != 'Enter') {
			// check if user is typing in a message field textbox
			// if user is typing in a field, so dont listen UNLESS key is Escape. Because Escape should cancel out of that field
			if (this.state.sMessage.interactive.sKey && this.state.sMessage.interactive.details.type == 'textbox' && document.activeElement == gInteractiveRefs.textbox) {
				// there is message in interactive
				// the interactive is a textbox
				// focus is in that textbox
				return;
			}
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
						if (this.state.sSearch) {
							// search was already in progress, so delete last char
							if (this.state.sSearch.phrase.length > 0) {
								this.executeSearch(this.state.sSearch.phrase.substr(0, this.state.sSearch.phrase.length - 1));
								// e.preventDefault(); // so page doesnt go back // needed if decide to use div contentEditable. For textbox this is not needed
							}
						}
					}
					
				break;
			case 'Escape':
				
					// message stuff
					if (this.state.sMessage.interactive.sKey) {
						// meaning an interactive message is showing somewhere
						// cancel it
						if (gInteractiveCallbacks.onCancel) {
							var rez_cbOnCancel = gInteractiveCallbacks.onCancel(); // :note: return true; from sMessage.interactive.onCancel to prevent the canceling
							if (rez_cbOnCancel === true) {
								return;
							}
						}
						// gets here if the onCancel did not return true
						var new_sMessage = JSON.parse(JSON.stringify(this.state.sMessage));
						new_sMessage.interactive = {}; // link38181 its ok to set interactive here, as i am clearing gInteractiveCallbacks
						gInteractiveCallbacks = {};
						gInteractiveRefs = {}; // for good measure, mem stuff, theres no need to clear gInteractiveRefs though it wont harm
						
						MyStore.setState({sMessage:new_sMessage});
					} else {
					
						// search stuff
						if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
							if (this.state.sSearch) {
								// search is in progress - cancel it
								this.executeSearch('');
							}
						}
					
					}

				break;
				
			case 'Enter':
				
					// message stuff
					if (this.state.sMessage.interactive.sKey) {
						// meaning an interactive message is showing somewhere
						// accept it - meaning get the object they return, added in cleared sMessage and then setState link331266162
						var rez_cbOnAccept;
						if (gInteractiveCallbacks.onAccept) {
							rez_cbOnAccept = gInteractiveCallbacks.onAccept(e); // :note: return true; from sMessage.interactive.onCancel to prevent the accepting link331266162 - return an object for setState, it will get sMessage with .interactive cleared added into it
							if (rez_cbOnAccept === true) {
								return; // meaning dont handle setState or clearing sMessage link331266162
							}
						}
						// gets here if the onAccept did not return true OR if there was no gInteractiveCallbacks.onAccept - it must be an object then!!! link331266162
						// console.log('rez_cbOnAccept:', rez_cbOnAccept);
						if (!rez_cbOnAccept) {
							// gets here if there was no onAccept callback
							// need to do this, as new_sMessage gets set into here
							rez_cbOnAccept = {};
						}
						
						var new_sMessage = JSON.parse(JSON.stringify(this.state.sMessage)); // link3818888888
						new_sMessage.interactive = {}; // link38181 its ok to set interactive here, as i am clearing gInteractiveCallbacks
						gInteractiveCallbacks = {};
						gInteractiveRefs = {}; // for good measure, mem stuff, theres no need to clear gInteractiveRefs though it wont harm
						
						rez_cbOnAccept.sMessage = new_sMessage;
						MyStore.setState(rez_cbOnAccept);
					}
				
				break;
			default:
			
				// search stuff
				if (this.state.sIniObj.length > 0) { // test to make sure its not in "loading" state
					if (e.key.length == 1) { // test to make sure its a character, not a special key like Home or something
						if (this.state.sSearch) {
							// search was in progress, so append to current phrase
							this.executeSearch(this.state.sSearch.phrase + e.key);
						} else {
							// its a new search
							this.executeSearch(e.key);
						}
					} // else do nothing
				}
		}
	},
	hoverOnSetDefault: function(aDefault) {
		// var aDefault = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath).Default;
		console.error('hovering set default, this.refs:', this.refs, 'aDefault:', aDefault);
		if (!aDefault || aDefault !== '1') {
			if (this.refs.ToolbarButton_IsDefault) {
				this.refs.ToolbarButton_IsDefault.refs.Submenu_IsDefault.classList.add('profilist-showasdefault');
			}
		}
	},
	hoverOffSetDefault: function(aDefault) {
		// var aDefault = getIniEntryByKeyValue(gIniObj, 'Path', aProfPath).Default;
		console.error('hovering set default, this.refs:', this.refs, 'aDefault:', aDefault);
		if (!aDefault || aDefault !== '1') {
			if (this.refs.ToolbarButton_IsDefault) {
				this.refs.ToolbarButton_IsDefault.refs.Submenu_IsDefault.style.display = 'none';
				// putting this in a timeout of 0 is a trick. i first set it to none, because when display is none, transitions do not happen. so i set it to none, then i have to remove the showasdefault class. normally, without the showasdefault there is transition. but because its display was none, there will be no transition
				setTimeout(function() {
					this.refs.ToolbarButton_IsDefault.refs.Submenu_IsDefault.classList.remove('profilist-showasdefault');
					this.refs.ToolbarButton_IsDefault.refs.Submenu_IsDefault.style.display = '';
				}.bind(this), 0);
			}
		}
	},
    render: function() {
		
		var THAT = this;
		var addToolbarButton = function(aProps) {
			// note: aProps must contain key of nonProfileType OR tbbIniEntry. never both.
			if ((aProps.nonProfileType && aProps.tbbIniEntry) || (!aProps.nonProfileType && !aProps.tbbIniEntry)) { console.error('aProps must contain key of nonProfileType OR tbbIniEntry. never both.'); throw new Error('aProps must contain key of nonProfileType OR tbbIniEntry. never both.'); }  // on same line as console as its a dev error
			
			// start - common props, everything should get these
			aProps.key = aProps.nonProfileType ? aProps.nonProfileType : aProps.tbbIniEntry.Path; // note: key of "nonProfileType" indicates that its not a profile toolbarbutton, and holds what type it is, only accepted values right now are seen in line below link9391813 // i set key to avoid react-reconciliation
			aProps.sKey = aProps.key; // because this.props.key is not accessible to the child i pass it to, i have to create sKey. its a react thing.
			// aProps.sMsgObj = THAT.state.sMsgObj.aKey == aProps.key || aProps.key == 'createnewprofile' ? THAT.state.sMsgObj : undefined;
			aProps.sMessage = THAT.state.sMessage;
			// end - common props, everything should get these
			
			delete aProps.nonProfileType;
			
			if (aProps.tbbIniEntry) {
				aProps.hoverOnSetDefault = THAT.hoverOnSetDefault;
				aProps.hoverOffSetDefault = THAT.hoverOffSetDefault;
				if (aProps.tbbIniEntry.Default && aProps.tbbIniEntry.Default === '1') {
					aProps.ref = 'ToolbarButton_IsDefault';
				}
			}
			
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
					sMessage: this.state.sMessage
				};
				
				// search/filter stuff
				if (i != 0) {
					// we dont give the currentProfile the sSearch object
					// aProfTbbProps.sSearchPhrase = this.state.sSearchPhrase;
					aProfTbbProps.sSearch = this.state.sSearch;
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
				// sSearchPhrase: this.state.sSearchPhrase,
				// sSearchHasResults: this.state.sSearchHasResults
				sSearch: this.state.sSearch
			});
			addToolbarButton({
				nonProfileType: 'createnewprofile',
				sMessage: this.state.sMessage,
				sCurProfIniEntry: sCurProfIniEntry,
				sGenIniEntry: sGenIniEntry
			});
		}
		
		var cClassList = [];
		if (this.state.sMessage.interactive.sKey && this.state.sMessage.interactive.sKey == 'createnewprofile' && this.state.sMessage.interactive.details.text == myServices.sb.GetStringFromName('pick-to-clone')) {
			// i have to test the text, because if it can be interactive but in typing profile name, or showing an error message due to like "already used profile name" etc
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
		var doTbbEnterAnim = gDoTbbEnterAnim;
		gDoTbbEnterAnim = false;
		var doTbbLeaveAnim = gDoTbbLeaveAnim;
		gDoTbbLeaveAnim = false;
		
        return React.createElement(React.addons.CSSTransitionGroup, {component:'div', transitionName:'profilist-slowfade', transitionEnterTimeout:300, transitionLeaveTimeout:300, transitionEnter:doTbbEnterAnim, transitionLeave:doTbbLeaveAnim, id: 'profilist_menu', className:cClassList, 'data-state': (this.state.sIniObj.length == 0 ? undefined : 'open') },
			list
        );
    }
});

var nameThenCreateProfileAcceptor = function(aKeyForClone, e) {
	// aKeyForClone should be the .Path of the profile to clone
	
	console.error('nameThenCreateProfileAcceptor, gInteractiveRefs:', gInteractiveRefs);
	
	if (gInteractiveRefs.textbox.value == '') {
		return true; // cancel accept - i dont accept blank values
	}
	
	if (document.activeElement != gInteractiveRefs.textbox) {
		console.error('cancel accept as focus is not textbox when hit enter, user obviously hit enter as onAccept is only called on hit enter');
		return true; // cancel accept
	}
	
	var newProfileName = gInteractiveRefs.textbox.value;
	// console.log('newProfileName:', newProfileName);
	
	
	var cNameIsPlatPath = e.altKey && e.shiftKey;
	var cLaunchIt = e.ctrlKey || e.metaKey;
	console.error('cLaunchIt:', cLaunchIt);
	
	console.error('ok create here are args:', 'aKeyForClone:', aKeyForClone, 'e:', e);
	
	contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['createNewProfile', newProfileName, aKeyForClone, cNameIsPlatPath, cLaunchIt]);
	// send message to worker to create it
}

var gDoTbbEnterAnim = false;
var gDoTbbLeaveAnim = false;

var ToolbarButton = React.createClass({
    displayName: 'ToolbarButton',
	click: function() {
		console.error('TBB CLICKED, props:', this.props);
		if (this.props.sKey == 'createnewprofile') {
			var keyValLaunchOnCreate = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, 'ProfilistLaunch');
			if (keyValLaunchOnCreate === '0') {
				// dont launch right away, allow naming
				var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
				setInteractiveMsg(new_sMessage, 'createnewprofile',
					{
						type: 'textbox',
						placeholder: 'enter name for new profile' // :l10n:
					},
					{
						onAccept: nameThenCreateProfileAcceptor.bind(this, null)
					}
				);
				MyStore.setState({
					sMessage: new_sMessage
				});
			} else {
				// keyValLaunchOnCreate === '1'
				// launch right away
				contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['createNewProfile', null, null, false, true]);
				// alert('create profile with predefined name "Unnamed Profile ##" and then launch it right away');
			}
		} else if (this.props.tbbIniEntry) {
			// check if there is interactive message showing, if it is, then dont do the click action, if its a textbox then focus that
			if (this.props.sMessage.interactive.sKey == this.props.sKey) {
				// console.log('cancel click because this prof tbb is in interactive message');
				if (this.props.sMessage.interactive.details.type == 'textbox') {
					// if not focused on the textbox then focus it
					// console.log('its a textbox message, so gInteractiveRefs should have textbox, gInteractiveRefs:', gInteractiveRefs);
					if (document.activeElement != gInteractiveRefs.textbox) {
						// console.log('focusing the textbox as it wasnt focused');
						gInteractiveRefs.textbox.focus();
					}
				}
				return;
			}
			if (this.props.sMessage.interactive.sKey == 'createnewprofile' && this.props.sMessage.interactive.details.text == myServices.sb.GetStringFromName('pick-to-clone')) {
				// this was picked for clone
				// check if should create with preset name, or allow naming field
				var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // have to do this because i dont pass in sCurProfIniEntry when dev mode is off
				var keyValLaunchOnCreate = getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, this.props.sGenIniEntry, 'ProfilistLaunch');
				
				if (keyValLaunchOnCreate === '0') {
					// assume that non-multiple form is taken, so calc for next preset number
					// start modded copy of block link37371017111 - this link is in mainworker.js
					var presetPattStr = escapeRegExp(myServices.sb.formatStringFromName('preset-profile-name-clone-multiple', [this.props.tbbIniEntry.Name, 'DIGITS_REP_REP_REP_HERE_NOIDA'], 2));
					presetPattStr = presetPattStr.replace('DIGITS_REP_REP_REP_HERE_NOIDA', '(\\d+)');
					console.log('presetPattStr:', presetPattStr);
					var presetPatt = new RegExp(presetPattStr);
					var presetNextNumber = 1;
					for (var i=0; i<gIniObj.length; i++) {
						if (gIniObj[i].Path) {
							var presetMatch = presetPatt.exec(gIniObj[i].Name);
							if (presetMatch) {
								var presetThisNumber = parseInt(presetMatch[1]);
								console.log('presetThisNumber:', presetThisNumber);
								if (presetThisNumber >= presetNextNumber) {
									presetNextNumber = presetThisNumber + 1;
								}
							}
						}
					}
					var aPresetCloneName;
					if (presetNextNumber == 1) {
						aPresetCloneName = myServices.sb.formatStringFromName('preset-profile-name-clone', [this.props.tbbIniEntry.Name], 1);
						var gPrexistingNameEntry = getIniEntryByKeyValue(gIniObj, 'Name', aPresetCloneName);
						if (gPrexistingNameEntry) {
							aPresetCloneName = myServices.sb.formatStringFromName('preset-profile-name-clone-multiple', [this.props.tbbIniEntry.Name, 2], 2);
						}
					} else {
						aPresetCloneName = myServices.sb.formatStringFromName('preset-profile-name-clone-multiple', [this.props.tbbIniEntry.Name, presetNextNumber], 2);
					}
					// end copy of block link37371017111 - this link is in mainworker.js
					
					// dont launch right away, allow naming
					var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
					setInteractiveMsg(new_sMessage, 'createnewprofile',
						{
							type: 'textbox',
							text: aPresetCloneName,
							placeholder: 'enter name for new profile' // :l10n:
						},
						{
							onAccept: nameThenCreateProfileAcceptor.bind(this, this.props.sKey)
						}
					);
					MyStore.setState({
						sMessage: new_sMessage
					});
				} else {
					// keyValLaunchOnCreate === '1'
					// launch right away
					contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['createNewProfile', null, this.props.sKey, false, true]);
					
					var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
					new_sMessage.interactive = {}; // link38181 its ok to set interactive here, as i am clearing gInteractiveCallbacks
					gInteractiveCallbacks = {};
					gInteractiveRefs = {}; // for good measure, mem stuff, theres no need to clear gInteractiveRefs though it wont harm
					
					MyStore.setState({sMessage:new_sMessage});
				}
				return;
			}
			if (this.props.tbbIniEntry.noWriteObj.currentProfile) {
				alert('clicked on current profile tbb, do any acction? nothing planned as of now');
			} else {
				// launch this profile
				// alert('launch profile');
				// contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['launchOrFocusProfile', this.props.tbbIniEntry.Path]);
				sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['launchOrFocusProfile', this.props.tbbIniEntry.Path], bootstrapMsgListener.funcScope, function() {
					console.error('okkkk back from launching');
					// setTimeout(fetchJustIniObj, 3000); // this is for updating the running status a bit overkill
				});
			}
		}
		else { console.log('dev_info - clicked something other then create new profile or launch profile'); }
	},
    render: function() {
		// incoming props
			// sMessage - only for createnewprofile and profile tbb's
			// sKey - for profiles its the .Path, others are createnewprofile, loading, noresultsfor link885754342
			// sSearch - available to all non-currentProfile tbb's and noresultsfor tbb
			// tbbIniEntry - only to profile type tbb's - it is really sTbbIniEntry but i haven't got a chance to rename it. what i want to clarify is that it is not connected to gIniObj, so modifying it would have no effect
			// sCurProfIniEntry - present if dev mode is on OR this is createnewprofile
			// sGenIniEntry - present for createnewprofile and all profile type tbb's
			// jProfilistDev - present and set to true if dev mode is on. js version, so bool, of keyValDevMode which is ProfilistDev
			// hoverOnSetDefault - present if profile type tbb
			// hoverOffSetDefault - present if profile type tbb
			
		// console.log('ToolbarButton-render FOR key:', this.props.sKey, 'this.props:', this.props, 'this:', this);
		
		// // test if in search mode
		var hideDueToSearch = false;
		if (this.props.sKey == 'noresultsfor') {
			if (this.props.sSearch) {
				for (var anyMatchesInSearch in this.props.sSearch.matches) {
					// yes matches exist so dont show the "no results" button
					hideDueToSearch = true;
					break;
				}
			} else {
				// no search in progress
				hideDueToSearch = true;
			}
		} else {
			if (this.props.sSearch) {
				if (this.props.sKey in this.props.sSearch.matches) { // same thing as `this.props.tbbIniEntry.Path in this.sSearch.matches)` because sKey for profile tbb's is the .Path
					hideDueToSearch = false;
				} else {
					hideDueToSearch = true;
				}
			} // else no search is in progress
		}
		
		var buildHintImg16Obj;
		if (this.props.tbbIniEntry && this.props.jProfilistDev) {
			if (this.props.tbbIniEntry.noWriteObj.status || this.props.tbbIniEntry.ProfilistTie) { // link884746111
				if (this.props.tbbIniEntry.noWriteObj.status) {
					// means its running so show the running exeIcon
					buildHintImg16Obj = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.tbbIniEntry.noWriteObj.exeIconSlug];
				} else {
					// means its NOT RUNNING and is tied (if it wasnt running and NOT tied it would never pass the if link884746111)
					buildHintImg16Obj = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[getBuildValByTieId(this.props.jProfilistBuilds, this.props.tbbIniEntry.ProfilistTie, 'i')];
				}
			} // else is not running AND is not tied, so dont show this
		}
		
		// subicon count and width calc for submenu
		var cntSubiconsIn = 0; // in/introverted means the ones on the right side
		var cntSubiconsEx = 0; // ex/extroverted means the ones on the left side of the divider
		var cntSubiconsDiv = 0; // either 0 or 1, if divider or not
		if (this.props.sKey == 'noresultsfor' || this.props.sKey == 'loading') { // link8857467674
			// no submenu
		} else {
			if (this.props.sKey == 'createnewprofile') {
				cntSubiconsDiv = 0;
				cntSubiconsEx = 1;
			} else {
				// it is a profile type tbb, for sure, as only possibles are noresultsfor, loading, createnewprofile, and profile type tbb link885754342
				cntSubiconsDiv = 1;
				if (buildHintImg16Obj) {
					cntSubiconsEx++; // build hint icon
				}
				if (!this.props.tbbIniEntry.noWriteObj.status) {
					cntSubiconsIn++; // delete icon
				}
				if (this.props.jProfilistDev) {
					cntSubiconsIn++; // toggle tie icon
					if ((this.props.tbbIniEntry.noWriteObj.status && this.props.tbbIniEntry.noWriteObj.currentProfile) || !this.props.tbbIniEntry.noWriteObj.status) {
						cntSubiconsIn++; // safemode wrench icon
					}
				}
				cntSubiconsIn++; // rename icon
				cntSubiconsIn++; // set default icon
			}
		}
		var cntSubicons = cntSubiconsIn + cntSubiconsEx + cntSubiconsDiv;
		var widSubicon = 20; // cross file link22433425566 from the css file, width given to the subicon
		
		// is submenu interactive message with something? // link22345531115122
		var submenuInInteractiveMode = false;
		if (this.props.tbbIniEntry) { // if tbbIniEntry then its a profile type tbb, and all profile type tbb's have submenu (well unless in profilist-clone-pick state)
			if (this.props.sMessage.interactive && this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) {
				if (this.props.sMessage.interactive.details.type == 'textbox') {
					// is interacting with rename
					submenuInInteractiveMode = true;
				} else if (this.props.sMessage.interactive.details.text == myServices.sb.GetStringFromName('confirm-delete')) {
					// interacting with delete
					submenuInInteractiveMode = true;
				}
			}
		}
		
		var cClassList = ['profilist-tbb'];
		// if (this.props.sMsgObj && this.props.sMsgObj.aKey == this.props.sKey) {
			// cClassList.push('profilist-tbb-show-msg');
		// }
		return React.createElement('div', {className: cClassList.join(' '), 'data-tbb-type': (!this.props.tbbIniEntry ? this.props.sKey : (this.props.tbbIniEntry.noWriteObj.status ? 'active' : 'inactive')), style: (!hideDueToSearch ? undefined : {display:'none'}), onClick: this.click},
			React.createElement('div', {className: 'profilist-tbb-primary'},
				this.props.sKey == 'noresultsfor' || this.props.sKey == 'loading' ? undefined : React.createElement('div', {className: 'profilist-tbb-hover'}),
				this.props.sKey == 'noresultsfor' ? undefined: React.createElement(PrimaryIcon, {tbbIniEntry: this.props.tbbIniEntry, sKey: this.props.sKey, sMessage:this.props.sMessage, sGenIniEntry:(!this.props.tbbIniEntry ? undefined : this.props.sGenIniEntry)}),
				this.props.sKey == 'noresultsfor' || this.props.sKey == 'loading' ? myServices.sb.formatStringFromName(this.props.sKey, [(!hideDueToSearch && this.props.sKey == 'noresultsfor' ? this.props.sSearch.phrase : undefined)], 1) : React.createElement(PrimarySquishy, {sKey:this.props.sKey, tbbIniEntry:this.props.tbbIniEntry, sSearch:(hideDueToSearch ? undefined : this.props.sSearch), sMessage:this.props.sMessage}) // :note: reason squishy is needed: so i can stack stuff over each other with position absolute div which has contents within so textbox doesnt take 100% is so as submenu expands in decreases the width of the contents in here (like full width textbox) // :note: only ONE thing in squish must be visible at any time. all things inside are position absolute. should be within a div. all must be pointer-events none UNLESS it needs interactive like a textbox
			),
			this.props.sKey == 'noresultsfor' || this.props.sKey == 'loading' /* link8857467674 must be -- create new profile button or a profile button -- this.props.sKey != 'createnewprofile' && !this.props.tbbIniEntry */ ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu' + (buildHintImg16Obj ? ' profilist-hasbuildhint' : '') + (submenuInInteractiveMode ? ' profilist-interacting' : ''), style:{width:(cntSubicons * widSubicon)+'px'}, ref:((!this.props.tbbIniEntry || !this.props.tbbIniEntry.Default) ? undefined : 'Submenu_IsDefault') },
				this.props.sKey != 'createnewprofile' ? undefined : React.createElement(SubiconClone, {sMessage: this.props.sMessage, sKey: this.props.sKey}),
				// !this.props.tbbIniEntry || !this.props.tbbIniEntry.Default ? undefined : React.createElement('div', {ref:'SubiconIsDefault', className: 'profilist-tbb-submenu-subicon profilist-si-isdefault'}),
				!buildHintImg16Obj ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-buildhint profilist-devmode', style: {backgroundImage:'url("' + buildHintImg16Obj.src + '")', backgroundSize:(!buildHintImg16Obj.resize ? undefined : '16px 16px')} }), // profilist-si-isrunning-inthis-exeicon-OR-notrunning-and-clicking-this-will-launch-inthis-exeicon
				!this.props.tbbIniEntry ? undefined : React.createElement('div', {className: 'profilist-tbb-submenu-subicon profilist-si-dots'}),
				!this.props.tbbIniEntry || !this.props.jProfilistDev ? undefined : React.createElement(SubiconTie, {tbbIniEntry: this.props.tbbIniEntry, jProfilistBuilds: this.props.jProfilistBuilds, sCurProfIniEntry: this.props.sCurProfIniEntry, sGenIniEntry:this.props.sGenIniEntry, sKey: this.props.sKey, sMessage:this.props.sMessage}),
				(!this.props.tbbIniEntry || !this.props.jProfilistDev || (this.props.tbbIniEntry.noWriteObj.status && !this.props.tbbIniEntry.noWriteObj.currentProfile)) ? undefined : React.createElement(SubiconSafe, {tbbIniEntry: this.props.tbbIniEntry, sKey:this.props.sKey, sMessage:this.props.sMessage}),
				!this.props.tbbIniEntry ? undefined : React.createElement(SubiconSetDefault, {hoverOffSetDefault:this.props.hoverOffSetDefault, hoverOnSetDefault:this.props.hoverOnSetDefault, tbbIniEntry: this.props.tbbIniEntry, sKey: this.props.sKey, sMessage: this.props.sMessage}),
				!this.props.tbbIniEntry ? undefined : React.createElement(SubiconRename, {tbbIniEntry:this.props.tbbIniEntry, sKey:this.props.sKey, sMessage:this.props.sMessage}),
				!this.props.tbbIniEntry || this.props.tbbIniEntry.noWriteObj.status /*noWriteObj.currentProfile check is not needed because if its currentProfile obviously .status is set to pid */ ? undefined : React.createElement(SubiconDel, {tbbIniEntry: this.props.tbbIniEntry, sKey: this.props.sKey, sMessage:this.props.sMessage})
			)
        );
    }
});

var PrimarySquishy = React.createClass({
	displayName: 'PrimarySquishy',
	render: function() {
		// incoming props
			// sKey
			// tbbIniEntry - only comes in for profile type tbb. not for createnewprofile sKey. squishy is not made for any other tbb types, just createnewprofile and profile type tbb's
			// sMessage
			// sSearch - only comes in if a search is in progress and this is a match

		// check if this entry has a message

		// if (this.props.sKey == 'createnewprofile') {
			// console.error('hover:', this.props.sMessage.hover[this.props.sKey], 'this.props.sMessage:', this.props.sMessage);
		// }

		var cPrimarySquishySingleElement;
		
		// determine what primary content should be
		if ((this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) || this.props.sMessage.hover[this.props.sKey])  {
			// show sMessage
			// classNamePrimarySquishy += ' profilist-tbb-show-msg';
			// only increment lastMsgId if the text of last was different
			
			var cMessage;
			if (this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) {
				cMessage = this.props.sMessage.interactive;
			} else if (this.props.sMessage.hover[this.props.sKey]) {
				cMessage = this.props.sMessage.hover[this.props.sKey];
			}
			
			cPrimarySquishySingleElement = React.createElement(PrimaryMessage, {key:cMessage.details.type + '__' + cMessage.details.text, sKey:this.props.sKey, sMessage:this.props.sMessage});
		} else {
			// show sKey name
			cPrimarySquishySingleElement = React.createElement(PrimaryLabel, {key:'primarylabel', sKey:this.props.sKey, tbbIniEntry:this.props.tbbIniEntry, sSearch:this.props.sSearch});
		}
		
		return React.createElement('div', {className:'profilist-tbb-primary-squishy'},
			React.createElement(React.addons.CSSTransitionGroup, {className:'profilist-fastswap-cont', transitionName:'profilist-fastswap', transitionEnterTimeout:200, transitionLeaveTimeout:100},
				cPrimarySquishySingleElement // because im doing CSSTransitionGroup I cant set this equal to `'show message'` i have to set it to `Reacte.createElement('div', {}, 'show message')`
			)
		);
	}
});

var PrimaryLabel = React.createClass({ // capable of highlighting self
	displayName: 'PrimaryLabel',
	render: function() {
		// incoming props
			// sKey - only possibilities are createnewprofile and a profilepath (loading and noresultsfor dont have a squishy element as they dont have a submenu)
			// tbbIniEntry - this is 
			// sSearch - only if tbbIniEntry exists for this one (meaning this is PrimaryLabel for a profile tbb) and search is in progress AND this is a match. if it wasnt a match it would never get sSearch
		
		var labelChildren = [];
		if (this.props.tbbIniEntry) {
			if (this.props.sSearch) {
				// search is in progress, and this is a match. if it wasnt it would never get sSearch in props
				var searchMatchedAtIndex = this.props.sSearch.matches[this.props.sKey]
				var leaveOffIndex = 0;
				var cProfName = this.props.tbbIniEntry.Name;
				for (var i=0; i<searchMatchedAtIndex.length; i++) {
					if (leaveOffIndex < searchMatchedAtIndex[i]) {
						labelChildren.push(cProfName.substring(leaveOffIndex, searchMatchedAtIndex[i]));
						leaveOffIndex = searchMatchedAtIndex[i] + 1;
					}
					// console.log('start index:', searchMatchedAtIndex[i]);
					labelChildren.push(React.createElement('span', {className:'profilist-highlight-txt'},
						cProfName.substr(searchMatchedAtIndex[i], this.props.sSearch.phrase.length)
					));
					leaveOffIndex = searchMatchedAtIndex[i] + this.props.sSearch.phrase.length;
				}
				
				if (leaveOffIndex < cProfName.length) {
					labelChildren.push(cProfName.substr(leaveOffIndex));
				}
			} else {
				labelChildren.push(this.props.tbbIniEntry.Name);
			}
		} else {
			labelChildren.push(myServices.sb.GetStringFromName(this.props.sKey));
		}
		
		return React.createElement('div', {},
			labelChildren
		);
	}
});

var gInteractiveRefs;
var gInteractiveCallbacks = {
	onAccept: null,
	onCancel: null
};
var PrimaryMessage = React.createClass({ // has two fields always there, just opacity:0. first is hoverMessage, second is transformMessage. if transformed, then hover should never show on top. if hovered, can be transformed.
	displayName: 'PrimaryMessage',
	componentDidMount: function() {
		if (this.refs && this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey && this.props.sMessage.interactive.details.type == 'textbox') {
			console.error('ok setting reffs to gInteractiveRefs for sKey:', this.props.sKey);
			// i need the ``this.props.sMessage.interactive.sKey == this.props.sKey`` test because on hover of other elements, it will set it to that when its not interactive for that
			gInteractiveRefs = this.refs;
			// this.props.sMessage.interactive.refs = this.refs; // do not do this, otherwise it casues `TypeError: cyclic object value` error on link3818888888 - this is because i cant do JSON.stringify on DOM nodes
		}
		if (this.refs.textbox) {
			// focus it
			this.refs.textbox.setSelectionRange(0, this.refs.textbox.value.length, 'backward'); //backwards so if the value.length is longer then field width, on select all it will not end at end, it will be at start
			this.refs.textbox.focus()
		}
	},
	render: function() {
		// incoming props
			// sKey - only possibilities are createnewprofile and a profilepath (loading and noresultsfor dont have a squishy element as they dont have a submenu)
			// sMessage
		
		// only creates this element if a message exists link37481711473
		
		// var cMessage = this.props.sMessage.interactive || this.props.sMessage.hover[this.props.sKey]; // can do this because of link37481711473 // moved interactive to left of OR so it takes priority over hover
		var cMessage;
		if (this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) {
			cMessage = this.props.sMessage.interactive;
		} else if (this.props.sMessage.hover[this.props.sKey]) {
			cMessage = this.props.sMessage.hover[this.props.sKey];
		} else {
			throw new Error('should never ever get here, as the cMessage in PrimarySquishy would not send here unless cMessage exists');
		}
			
		var cMessageContents;
		if (cMessage.details.type == 'label') {
			cMessageContents = cMessage.details.text;
		} else if (cMessage.details.type == 'textbox') {
			cMessageContents = React.createElement('input', {type:'text', ref:'textbox', defaultValue:cMessage.details.text, placeholder:(!cMessage.details.placeholder ? undefined : cMessage.details.placeholder)});
		}

		return React.createElement('div', {},
			cMessageContents
		);
	}
});

var LabelHighlighted = React.createClass({
    displayName: 'LabelHighlighted',
	render: function() {
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
		
		var elProfilistTbbIcon = ReactDOM.findDOMNode(this);
		elProfilistTbbIcon.classList.add('profilist-inpicker');
		
		var IPStoreInitWithSlug;
		var IPStoreInitWithUnselectCallback;
		
		if (this.props.tbbIniEntry.ProfilistBadge) {
			IPStoreInitWithSlug = this.props.tbbIniEntry.ProfilistBadge;
			IPStoreInitWithUnselectCallback = function() {
				console.log('ok user removed badge');
				sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['replaceBadgeForProf', this.props.sKey, null]], bootstrapMsgListener.funcScope, function(aErrorOrNewIniObj) {
					console.log('back from removing badge');
					// aErrorOrNewIniObj is null if nothing was set
					if (Array.isArray(aErrorOrNewIniObj)) {
						gIniObj = aErrorOrNewIniObj;
						MyStore.setState({
							sIniObj: JSON.parse(JSON.stringify(gIniObj))
						});
					} else {
						console.error('some error occured when trying to remove badge', aErrorOrNewIniObj);
						throw new Error('some error occured when trying to remove badge');
					}
				});
			}.bind(this);
		}
		
		var IPStoreInitWithSelectCallback = function(aImgSlug, aImgObj) {
			console.error('ok picked new badge, aImgSlug:', aImgSlug, 'aImgObj:', aImgObj);
			sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['replaceBadgeForProf', this.props.sKey, aImgSlug]], bootstrapMsgListener.funcScope, function(aErrorOrNewIniObj) {
				console.log('back from setting badge');
				// aErrorOrNewIniObj is null if nothing was set
				if (Array.isArray(aErrorOrNewIniObj)) {
					gIniObj = aErrorOrNewIniObj;
					MyStore.setState({
						sIniObj: JSON.parse(JSON.stringify(gIniObj))
					});
				} else {
					console.error('some error occured when trying to set new badge', aErrorOrNewIniObj);
					throw new Error('some error occured when trying to set new badge');
				}
			});
		}.bind(this);
		
		var elPickerTarget = e.target;
		if (elPickerTarget.nodeName == 'div') {
			elPickerTarget = elPickerTarget.firstChild;
		}
		IPStore.init(elPickerTarget, IPStoreInitWithSelectCallback, IPStoreInitWithSlug, IPStoreInitWithUnselectCallback, 1, {
			insertId: 'profilist_menu_container',
			onUninit: function() {
				elProfilistTbbIcon.classList.remove('profilist-inpicker');
			}
		});
		
	},
	componentDidMount: function() {
		if (this.props.tbbIniEntry) {
			hoverListenerMessage(
				this,
				function() {
					if (!this.props.tbbIniEntry.ProfilistBadge) {
						return myServices.sb.GetStringFromName('badgeify')
					} else {
						return myServices.sb.GetStringFromName('badgeify-or-remove')
					}
				}.bind(this)
			);
		}
	},
	render: function() {
		// incoming props
		//	tbbIniEntry - if profile type
		//	sKey
		//	sMessage
		//	sGenIniEntry - if profile type
		
		var aProps = {
			className: 'profilist-tbb-icon',
			onClick: this.click
		};
		
		if (this.props.sKey == 'createnewprofile' || this.props.sKey == 'loading') {
			// icon is not clickable
			delete aProps.onClick;
		}
		
		var badgeImgSrc;
		var badgeImgWidth;
		var badgeImgHeight;
		if (this.props.tbbIniEntry) {
			if (this.props.tbbIniEntry.ProfilistBadge) {
				// is profile type tbb, and it has a badge
				console.log('yes ProfilistBadge exists on this tbbIniEntry:', this.props.tbbIniEntry.ProfilistBadge, 'tbbIniEntry:', this.props.tbbIniEntry)
				var img16SrcObj = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.tbbIniEntry.ProfilistBadge];
				badgeImgSrc = img16SrcObj.src;
				
				if (img16SrcObj.resize) {
					badgeImgWidth = '16';
					badgeImgHeight = '16';
				}
			} else {
				badgeImgSrc =  core.addon.path.images + 'missing.png';
			}
		}
		
		var aRendered = React.createElement('div', aProps,
			!this.props.tbbIniEntry ? undefined : React.createElement('img', {className: 'profilist-tbb-badge', src: badgeImgSrc, width:badgeImgWidth, height:badgeImgHeight}),
			React.createElement('img', {className: 'profilist-tbb-status'})
		)
		return aRendered;
	}
});

function hoverListener(aEl, onHoverOver, onHoverOut) {
	aEl.addEventListener('transitionend', function(e) {
		// console.log('TRANSITIONEND wooooo:', e.propertyName, e);
		if (e.propertyName == 'font-weight') {
			// mouse outted
			onHoverOut();
		} else if (e.propertyName == 'letter-spacing') {
			// mouse overed
			onHoverOver();
		}
	}, false);
}

function hoverListenerMessage(aReactInstanceThis, aMsgOnHover, aOnHoverCallback, aOffHoverCallback) {
	// aMsgOnHover is either a string, or a function to return a string
	
	hoverListener(
		ReactDOM.findDOMNode(aReactInstanceThis),
		function onHoverOver() {
			if (!aReactInstanceThis.props.sMessage || !aReactInstanceThis.props.sMessage.interactive || !aReactInstanceThis.props.sMessage.interactive.sKey || aReactInstanceThis.props.sMessage.interactive.sKey != aReactInstanceThis.props.sKey) {
				
				aReactInstanceThis.usedMsgOnHover = typeof(aMsgOnHover) == 'string' ? aMsgOnHover : aMsgOnHover();
				
				var new_sMessage = JSON.parse(JSON.stringify(aReactInstanceThis.props.sMessage));
				new_sMessage.hover[aReactInstanceThis.props.sKey] = {
					details: {
						type: 'label',
						text: aReactInstanceThis.usedMsgOnHover
					}
				};
				MyStore.setState({sMessage:new_sMessage});
			}
			if (aOnHoverCallback) {
				aOnHoverCallback();
			}
		},
		function onHoverOut() {
			if (aReactInstanceThis.props.sMessage && aReactInstanceThis.props.sMessage.hover && aReactInstanceThis.props.sKey in aReactInstanceThis.props.sMessage.hover && aReactInstanceThis.props.sMessage.hover[aReactInstanceThis.props.sKey].details.text == aReactInstanceThis.usedMsgOnHover) {
				var new_sMessage = JSON.parse(JSON.stringify(aReactInstanceThis.props.sMessage));
				delete new_sMessage.hover[aReactInstanceThis.props.sKey];
				MyStore.setState({sMessage:new_sMessage});
			}
			if (aOffHoverCallback) {
				aOffHoverCallback();
			}
		}
	);
}
var SubiconRename = React.createClass({
    displayName: 'SubiconRename',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event

		if (this.props.sMessage.interactive.sKey != this.props.sKey) {
			var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
			setInteractiveMsg(new_sMessage, this.props.sKey,
				{
					type: 'textbox',
					text: this.props.tbbIniEntry.Name,
					placeholder: 'New profile name' // :l10n:
				},
				{
					onAccept: function() {
						// console.error('gInteractiveRefs.textbox:', gInteractiveRefs.textbox, 'Services.focus.focusedElement:', Services.focus.focusedElement, 'document.activeElement:', document.activeElement);
	
						if (gInteractiveRefs.textbox.value == '') {
							return true; // cancel accept - i dont accept blank values
						}
						
						if (document.activeElement != gInteractiveRefs.textbox) {
							return true; // cancel accept
						}
						var gTbbIniEntry = getIniEntryByKeyValue(gIniObj, 'Path', this.props.sKey);
						gTbbIniEntry.Name = gInteractiveRefs.textbox.value;
						contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['renameProfile', this.props.sKey, gTbbIniEntry.Name]); // i already rename in my gIniObj and sIniObj, so i dont expect callback. however if it fails to rename, it will call pushIniObj
						return {
							sIniObj: JSON.parse(JSON.stringify(gIniObj))
						};
					}.bind(this)
				}
			);
			MyStore.setState({sMessage:new_sMessage});
		}
		
	},
	componentDidMount: function() {
		hoverListenerMessage(this, 'Rename this profile');
	},
	render: function() {
		// incoming props
			// tbbIniEntry
			// sKey
			// sMessage

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-rename',
			onClick: this.click
		};
		
		// is submenu interactive message with something? // link22345531115122
		if (this.props.sMessage.interactive && this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) {
			if (this.props.sMessage.interactive.details.type == 'textbox') {
				// is interacting with rename
				aProps.className += ' profilist-interacting-with-this';
			}
		}
		
		return React.createElement('div', aProps);
	}
});
var SubiconSetDefault = React.createClass({
    displayName: 'SubiconSetDefault',
	click: function(e) {
		
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('SETDEFAULT CLICKED');
		
		this.props.hoverOffSetDefault(this.props.tbbIniEntry.Default);
		
		if (this.props.tbbIniEntry.Default && this.props.tbbIniEntry.Default == '1') {
			var gIniEntry_toUndefault = getIniEntryByKeyValue(gIniObj, 'Path', this.props.tbbIniEntry.Path);
			delete gIniEntry_toUndefault.Default;
			
			var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
			gGenIniEntry.StartWithLastProfile = '0';
		} else {
			var gIniEntry_toUndefault = getIniEntryByKeyValue(gIniObj, 'Default', '1'); // gIniEntry is alias for liveIniEntry
			if (gIniEntry_toUndefault) { // as there may be no default
				delete gIniEntry_toUndefault.Default;
			} else {
				// there was no default set, so we need to set StartWithLastProfile to 1
				var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
				gGenIniEntry.StartWithLastProfile = '1';
			}
		
			var gIniEntry_toSetDefault = getIniEntryByKeyValue(gIniObj, 'Path', this.props.tbbIniEntry.Path);
			gIniEntry_toSetDefault.Default = '1';
		}
		
		contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['toggleDefaultProfile', this.props.sKey]); // i already rename in my gIniObj and sIniObj, so i dont expect callback. however if it fails to rename, it will call pushIniObj
		
		// need to wrap this in a setTimeout of 0 as hoverOffSetDefault has a setTimeout of 0 in there . otherwise setState happens first and then this.refs.Submenu_IsDefault is changed so it wont succesfully pull off the setTimeout 0 in hoverOffSetDefault
		
		// important to set it on usedMsgOnHover, as hoverListenerMessage onHoverOut it will look for this before clearing it out
		this.usedMsgOnHover = this.props.tbbIniEntry.Default == '1' ? 'Set this as the default profile' : 'Unset default profile, generic launcher will launch into profile manager';
		var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
		new_sMessage.hover[this.props.sKey] = {
			details: {
				type: 'label',
				text: this.usedMsgOnHover
			}
		};
		
		setTimeout(function() {
			MyStore.setState({
				sIniObj: JSON.parse(JSON.stringify(gIniObj)),
				sMessage: new_sMessage
			});
		}.bind(this), 0);
		
	},
	componentDidMount: function() {
		hoverListenerMessage(
			this,
			function() {
				return ((this.props.tbbIniEntry.Default && this.props.tbbIniEntry.Default === '1') ? 'Unset default profile, generic launcher will launch into profile manager' : 'Set this as the default profile');
			}.bind(this),
			function() {
				console.error('NOW default is!:', this.props.tbbIniEntry.Default);
				this.props.hoverOnSetDefault(this.props.tbbIniEntry.Default); // i think the this.props.tbbIniEntry is by reference in here -- tested YES ah it is by reference -- i do this because its importaant that hoverOnSetDefault be remained binded to this of its react instance
			}.bind(this),
			function() {
				console.error('NOW default is!:', this.props.tbbIniEntry.Default);
				this.props.hoverOffSetDefault(this.props.tbbIniEntry.Default);
			}.bind(this)
		);
		
		/*
		var aReactInstanceThis = this;
		hoverListener(
			ReactDOM.findDOMNode(aReactInstanceThis),
			function onHoverOver() {
				aReactInstanceThis.props.hoverOnSetDefault(aReactInstanceThis.props.tbbIniEntry.Default);
				aReactInstanceThis.aMsgOnHover = aReactInstanceThis.props.tbbIniEntry.Default == '1' ? 'Unset default profile, generic launcher will launch into profile manager' : 'Set this as the default profile';
				if (aReactInstanceThis.props.sMessage.interactive.sKey != aReactInstanceThis.props.sKey) {
					var new_sMessage = JSON.parse(JSON.stringify(aReactInstanceThis.props.sMessage));
					new_sMessage.hover[aReactInstanceThis.props.sKey] = {
						details: {
							type: 'label',
							text: aReactInstanceThis.aMsgOnHover
						}
					};
					MyStore.setState({sMessage:new_sMessage});
				}
			},
			function onHoverOut() {
				aReactInstanceThis.props.hoverOffSetDefault(aReactInstanceThis.props.tbbIniEntry.Default);
				if (aReactInstanceThis.props.sMessage && aReactInstanceThis.props.sMessage.hover && aReactInstanceThis.props.sKey in aReactInstanceThis.props.sMessage.hover && aReactInstanceThis.props.sMessage.hover[aReactInstanceThis.props.sKey].details.text == aReactInstanceThis.aMsgOnHover) {
					var new_sMessage = JSON.parse(JSON.stringify(aReactInstanceThis.props.sMessage));
					delete new_sMessage.hover[aReactInstanceThis.props.sKey];
					MyStore.setState({sMessage:new_sMessage});
				}
			}
		);
		*/
	},
	render: function() {
		// props
		//		sMessage - for hoverListenerMessage
		//		tbbIniEntry
		//		sKey
		//		hoverOnSetDefault
		//		hoverOffSetDefault
		
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
		
		if (this.props.tbbIniEntry.noWriteObj.currentProfile) {
			contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['restartInSafemode']);
		} else {
			// launch this profile
			// alert('launch profile');
			// contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['launchOrFocusProfile', this.props.tbbIniEntry.Path]);
			sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['launchOrFocusProfile', this.props.tbbIniEntry.Path, {args:'-safe-mode'}]], bootstrapMsgListener.funcScope, function() {
				console.error('ok back from launching in safe mode');
				// setTimeout(fetchJustIniObj, 3000); // this is for updating the running status a bit overkill
			});
		}
		
	},
	componentDidMount: function() {
		hoverListenerMessage(this, function(){ return (this.props.tbbIniEntry.noWriteObj.status ? 'Restart in safe mode' + (this.props.tbbIniEntry.noWriteObj.currentProfile ? '' : ' (will first force terminate)') : 'Launch in safe mode') }.bind(this));
	},
	render: function() {
		// props
		//		sMessage - for hoverListenerMessage
		//		sKey - for hoverListenerMessage
		//		tbbIniEntry

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
	render: function() {
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
		var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
		setInteractiveMsg(new_sMessage, this.props.sKey,
			{
				type: 'label',
				text: myServices.sb.GetStringFromName('confirm-delete')
			},
			{
				onAccept: function() {
					for (var i=0; i<gIniObj.length; i++) {
						if (gIniObj[i].Path && gIniObj[i].Path == this.props.sKey) {
							gIniObj.splice(i, 1);
							gDoTbbLeaveAnim = true;
							contentMMFromContentWindow_Method2(window).sendAsyncMessage(core.addon.id, ['deleteProfile', this.props.sKey]); // i already rename in my gIniObj and sIniObj, so i dont expect callback. however if it fails to rename, it will call pushIniObj
							return {
								sIniObj: JSON.parse(JSON.stringify(gIniObj))
							}; // because i want to the global accepter to take this and do setState with it link331266162
						}
					}
				}.bind(this)
			}
		);
		
		MyStore.setState({sMessage:new_sMessage});
		
	},
	componentDidMount: function() {
		hoverListenerMessage(this, 'Delete this profile');
	},
	render: function() {
		// props
		//	tbbIniEntry
		//	sMessage
		//	sKey
		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-del',
			onClick: this.click
		};
		
		// is submenu interactive message with something? // link22345531115122
		if (this.props.sMessage.interactive && this.props.sMessage.interactive.sKey && this.props.sMessage.interactive.sKey == this.props.sKey) {
			if (this.props.sMessage.interactive.details.text == myServices.sb.GetStringFromName('confirm-delete')) {
				// interacting with delete
				aProps.className += ' profilist-interacting-with-this';
			}
		}
		
		var aRendered = React.createElement('div', aProps);
		return aRendered;
	}
});
var SubiconClone = React.createClass({
    displayName: 'SubiconClone',
	click: function(e) {
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('CLONE CLICKED');
		var new_sMessage = JSON.parse(JSON.stringify(this.props.sMessage));
		setInteractiveMsg(new_sMessage, 'createnewprofile',
			{
				type: 'label',
				text: myServices.sb.GetStringFromName('pick-to-clone')
			},
			{
				onAccept: function() {
					return true; // cancel accept as there is no accept for this one, the click on the bouncing profile will handle it
				}
			}
		);
		delete new_sMessage.hover.createnewprofile; // so after interactive is canceled, it doesnt go back to hover
		
		MyStore.setState({sMessage:new_sMessage});
		
	},
	componentDidMount: function() {
		hoverListenerMessage(this, myServices.sb.GetStringFromName('clone-profile'));
	},
	render: function() {
		// incomping props
			// sMessage
			// sKey - for hoverListenerMessage

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-clone',
			onClick: this.click
		};
		
		var aRendered = React.createElement('div', aProps);
		return aRendered;
	}
});

var SubiconTie = React.createClass({
    displayName: 'SubiconTie',
	click: function(e) {
		e.stopPropagation(); // stops it from trigger ToolbarButton click event
		console.error('TIE CLICKED');
		
		var nextTieId;
		if (this.uiTieId == -2) {
			// its untied, take it to -1 which is self
			nextTieId = -1;
		} else {
			var startPoint; // short for startIndexInJProfilistBuildsArr
			if (this.uiTieId == -1) {
				startPoint = 0;
				// its a ProfilistTie, find that in the array, then from that point go on out of this if block
			} else {
				for (var i=0; i<this.props.jProfilistBuilds.length; i++) {
					if (this.props.jProfilistBuilds[i].id == this.uiTieId) {
						startPoint = i + 1;
						break;
					}
				}
			}
			
			
			// starting from point find next jBuildsEntry that is not current profile. if on last one then untie
			for (var i=startPoint; i<this.props.jProfilistBuilds.length; i++) {
				if (this.props.jProfilistBuilds[i].p == this.props.sCurProfIniEntry.noWriteObj.exePath) {
					continue;
				}
				if (this.props.jProfilistBuilds[i].id != this.uiTieId) {
					nextTieId = this.props.jProfilistBuilds[i].id;
					break;
				}
			}
			if (nextTieId === undefined) {
				// untie it. as startPoint was last entry
				nextTieId = -2;
			}
		}
		
		// reflect nextTieId to this.uiTieId
		this.uiTieId = nextTieId;
		
		var thisNearest16;
		var grayscaleLevel;
		if (this.uiTieId == -2) {
			// untie it
			grayscaleLevel = '100%';
			thisNearest16 = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.sCurProfIniEntry.noWriteObj.exeIconSlug];
		} else if (this.uiTieId == -1) {
			// tie to current profile
			grayscaleLevel = '0%';
			thisNearest16 = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.sCurProfIniEntry.noWriteObj.exeIconSlug];
		} else {
			grayscaleLevel = '0%';
			thisNearest16 = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[getBuildValByTieId(this.props.jProfilistBuilds, this.uiTieId, 'i')];
		}
		
		// start - this section is not js-dom optimized like react - :todo:
		var elSubiconTie = ReactDOM.findDOMNode(this);
		elSubiconTie.style.filter = 'grayscale(' + grayscaleLevel + ')';
		elSubiconTie.style.backgroundImage = 'url("' + thisNearest16.src + '")';
		if (thisNearest16.resize) {
			elSubiconTie.style.backgroundSize = '16px 16px';
		} else {
			elSubiconTie.style.backgroundSize = '';
		}
		// end - this section is not js-dom optimized like react - :todo:
	},
	mouseLeave: function() {
		// this.uiTieId is not equal to this.props.tbbIniEntry.ProfilistTie then send message to worker, which will write to file and send message back which will MyStore.setState
		if (this.uiTieId != this.uiTieId_onRender) {
			// alert('telling mainworker to save tie using uiTieId: ' + this.uiTieId + ' uiTieId_onRender: ' + this.uiTieId_onRender);
			sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['saveTieForProf', this.props.tbbIniEntry.Path, this.uiTieId]], bootstrapMsgListener.funcScope, function(aErrorOrNewIniObj) {
				console.log('back from saving tie for prof');
				// aErrorOrNewIniObj is null if no update was made, else if an update was made then it is gIniObj. but it should never return null, because i would never get to this point (to send message to worker) unless the tie was changed (meaning uiTieId is different from uiTieId_onRender)
				if (Array.isArray(aErrorOrNewIniObj)) {
					gIniObj = aErrorOrNewIniObj;
					MyStore.setState({
						sIniObj: JSON.parse(JSON.stringify(gIniObj))
					});
				} else {
					console.error('some error occured when trying to save the tie', aErrorOrNewIniObj);
					throw new Error('some error occured when trying to save the tie');
				}
			});
		}
	},
	componentDidMount: function() {
		hoverListenerMessage(this, 'Tie this profile to a build');
	},
	render: function() {
		// props
		//		sMessage - for hoverListenerMessage
		//		sKey - for hoverListenerMessage
		//		jProfilistBuilds
		//		sCurProfIniEntry - need this because of this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.sCurProfIniEntry.noWriteObj.exeIconSlug]
		//		tbbIniEntry
		//		sGenIniEntry
		
		/* this.uiTieId notes
		-2 - means untied
		-1 - tied to current profile
		0 - this is never possible as minimum tie id is 1 link38817716352
		> 0 - a value of ProfilistTie
		
		every time render happens uiTieId is set to current ProfilistTie which is either > 0 OR -2 OR if current profile path is in jProfilistBuilds then it will be set to -1
		*/
		
		// console.info('this.props:', this.props);

		var aProps = {
			className: 'profilist-tbb-submenu-subicon profilist-si-tie profilist-devmode',
			style: {},
			onMouseLeave: this.mouseLeave,
			onClick: this.click
		};
		
		var thisNearest16;
		if (this.props.tbbIniEntry.ProfilistTie) {
			// its tied
			aProps.style.filter = 'grayscale(0%)';			
			thisNearest16 = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[getBuildValByTieId(this.props.jProfilistBuilds, this.props.tbbIniEntry.ProfilistTie, 'i')];
			if (getBuildValByTieId(this.props.jProfilistBuilds, this.props.tbbIniEntry.ProfilistTie, 'p') == this.props.sCurProfIniEntry.noWriteObj.exePath) {
				this.uiTieId = -1;
			} else {
				this.uiTieId = this.props.tbbIniEntry.ProfilistTie;
			}
		} else { // its untied (this.state.bi should be -2), so show current
			aProps.style.filter = 'grayscale(100%)';
			thisNearest16 = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.sCurProfIniEntry.noWriteObj.exeIconSlug];
			this.uiTieId = -2;
		}
		aProps.style.backgroundImage = 'url("' + thisNearest16.src + '")';
		if (thisNearest16.resize) {
			aProps.style.backgroundSize = '16px 16px';
		}
		this.uiTieId_onRender = this.uiTieId;
		
		var aRendered = React.createElement('div', aProps); // , this.state.bi, ' ', this.state.onent
		return aRendered;
	}
});

// end - react components

// End - Page Functionalities
// start - server/framescript comm layer
// sendAsyncMessageWithCallback - rev3
var bootstrapCallbacks = { // can use whatever, but by default it uses this
	// put functions you want called by bootstrap/server here,
	pushIniObj: function(aIniObj, aDoTbbEnterAnim) {
		// updates gIniObj with aIniObj and also react component
		gIniObj = aIniObj;
		
		if (aDoTbbEnterAnim) {
			gDoTbbEnterAnim = true;
		}
		
		MyStore.setState({
			sIniObj: JSON.parse(JSON.stringify(gIniObj))
		});
	}
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

function isFocused(window) {
    var childTargetWindow = {};
    Services.focus.getFocusedElementForWindow(window, true, childTargetWindow);
    childTargetWindow = childTargetWindow.value;

    var focusedChildWindow = {};
    if (Services.focus.activeWindow) {
        Services.focus.getFocusedElementForWindow(Services.focus.activeWindow, true, focusedChildWindow);
        focusedChildWindow = focusedChildWindow.value;
    }

    return (focusedChildWindow === childTargetWindow);
}

function validateOptionsObj(aOptions, aOptionsDefaults) {
	// ensures no invalid keys are found in aOptions, any key found in aOptions not having a key in aOptionsDefaults causes throw new Error as invalid option
	for (var aOptKey in aOptions) {
		if (!(aOptKey in aOptionsDefaults)) {
			console.error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value, aOptionsDefaults:', aOptionsDefaults, 'aOptions:', aOptions);
			throw new Error('aOptKey of ' + aOptKey + ' is an invalid key, as it has no default value');
		}
	}
	
	// if a key is not found in aOptions, but is found in aOptionsDefaults, it sets the key in aOptions to the default value
	for (var aOptKey in aOptionsDefaults) {
		if (!(aOptKey in aOptions)) {
			aOptions[aOptKey] = aOptionsDefaults[aOptKey];
		}
	}
}

function justFormatStringFromName(aLocalizableStr, aReplacements) {
	// justFormatStringFromName is formating only ersion of the worker version of formatStringFromName
	
	var cLocalizedStr = aLocalizableStr;
	if (aReplacements) {
		for (var i=0; i<aReplacements.length; i++) {
			cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
		}
	}
	
	return cLocalizedStr;
}
// end - common helper functions