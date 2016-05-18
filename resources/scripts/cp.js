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

var gIniObj;
var gKeyInfoStore;

var gCFMM; // needed for contentMMFromContentWindow_Method2

// Lazy imports
var myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'cp.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

// Start - DOM Event Attachments
function doOnBeforeUnload() {

	// contentMMFromContentWindow_Method2(window).removeMessageListener(core.addon.id, bootstrapMsgListener);

}

function doOnContentLoad() {
	console.log('in doOnContentLoad');
	setTimeout(initPage, 0);
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
	sendAsyncMessageWithCallback(['fetchJustIniObj'], function(aIniObj) {
		console.log('ok got new ini obj, will now set global nad update react component:', aIniObj);
		// alert('ok got new ini obj, will now set global nad update react component');
		gIniObj = aIniObj;
		
		MyStore.setState({
			sIniObj: gIniObj
		})
	});
}

// End - DOM Event Attachments
// Start - Page Functionalities
function initPage() {
	// if isReInit then it will skip some stuff
	
	console.log('in init');
	
	// get core and config objs
	sendAsyncMessageWithCallback(['fetchCoreAndConfigs'], function(aObjs) {
		console.log('got core and configs:', aObjs);
		core = aObjs.aCore;
		gIniObj = aObjs.aIniObj;
		gKeyInfoStore = aObjs.aKeyInfoStore;
		
		initReactComponent();
		
		window.addEventListener('blur', attachFocusListener, false); // link147928272
		ifNotFocusedDoOnBlur();
	});

}

var MyStore = {};
function initReactComponent() {
	
	var myControlPanel = React.createElement(ControlPanel);
	
	ReactDOM.render(
		myControlPanel,
		document.getElementById('wrapContent')
	);
}

// create dom instructions
var gDOMInfo = [ // order here is the order it is displayed in, in the dom
	{
		section: myServices.sb.GetStringFromName('profilist.cp.general'),
		rows: [
			// {
			// 	label: myServices.sb.GetStringFromName('profilist.cp.updates'),
			// 	id: 'updates',
			// 	type: 'select',
			// 	values: {
			// 		0: myServices.sb.GetStringFromName('profilist.cp.off'),
			// 		1: myServices.sb.GetStringFromName('profilist.cp.on')
			// 	}
			// },
			{
				label: myServices.sb.GetStringFromName('profilist.cp.notif'),
				desc: myServices.sb.GetStringFromName('profilist.cp.notif-desc'),
				type: 'select',
				key: 'ProfilistNotif',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'), // :note: '0' because i match it to getPrefLikeValForKeyInIniEntry which returns strings only as i store strings only, as this reads from the stuff in inientry that is not in noWriteObj
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				},
				tooltip_id: 'notifications'
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.launch'),
				desc: myServices.sb.GetStringFromName('profilist.cp.launch-desc'),
				type: 'select',
				key: 'ProfilistLaunch',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				},
				tooltip_id: 'launch'
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.sort'),
				desc: myServices.sb.GetStringFromName('profilist.cp.sort-desc'),
				type: 'select',
				key: 'ProfilistSort',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.created'),
					'2': myServices.sb.GetStringFromName('profilist.cp.alphanum'),
					// '0': myServices.sb.GetStringFromName('profilist.cp.created-asc'),
					// '1': myServices.sb.GetStringFromName('profilist.cp.created-desc'),
					// '2': myServices.sb.GetStringFromName('profilist.cp.alphanum-asc'),
					// '3': myServices.sb.GetStringFromName('profilist.cp.alphanum-desc')
				},
				tooltip_id: 'sort'
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.dev'),
				desc: myServices.sb.GetStringFromName('profilist.cp.dev-desc'),
				type: 'select',
				key: 'ProfilistDev',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				},
				tooltip_id: 'dev'
			}
		]
	},
	{
		section: myServices.sb.GetStringFromName('profilist.cp.system'),
		rows: [
			{
				label: myServices.sb.GetStringFromName('profilist.cp.badgeloc'),
				desc: myServices.sb.GetStringFromName('profilist.cp.badgeloc-desc'),
				type: 'select',
				key: 'ProfilistBadgeLoc',
				values: {
					'1': myServices.sb.GetStringFromName('profilist.cp.badgeloc-topleft'),
					'2': myServices.sb.GetStringFromName('profilist.cp.badgeloc-topright'),
					'3': myServices.sb.GetStringFromName('profilist.cp.badgeloc-bottomleft'),
					'4': myServices.sb.GetStringFromName('profilist.cp.badgeloc-bottomright')
				},
				tooltip_id: 'badge'
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.desktop-shortcut'),
				type: 'select',
				id: 'desktop-shortcut'
			}
		]
	},
	{
		section: myServices.sb.GetStringFromName('profilist.cp.developer'),
		rows: [
			{
				label: myServices.sb.GetStringFromName('profilist.cp.temp'),
				desc: myServices.sb.GetStringFromName('profilist.cp.temp-desc'),
				type: 'select',
				key: 'ProfilistTemp',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				},
				tooltip_id: 'temp'
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.builds'),
				desc: myServices.sb.GetStringFromName('profilist.cp.builds-desc'),
				key: 'ProfilistBuilds',
				type: 'custom',
				tooltip_id: 'builds'
			}
		]
	}
];

// react components
var ControlPanel = React.createClass({
    displayName: 'ControlPanel',
	getInitialState: function() {
		return {
			sIniObj: [],
			sBuildsLastRow: {},
			sHelp: false // enable/disable tooltips
		};
	},
	onComponentChange: function(aNewIniObj, aDelaySetState) {
		// aNewIniObj should always be reference to gIniObj. meaning on change i should always update gIniObj. i want to keep gIniObj synced with sIniObj
		// send update to MainWorker.js to write sIniObj to file
		// onChange of each row, should call this
		
		// var fetchTimeSt = Date.now();
		sendAsyncMessageWithCallback(['userManipulatedIniObj_updateIniFile', JSON.stringify(aNewIniObj)], function(aNewlyFormattedIniObj) {
			console.log('userManipulatedIniObj_updateIniFile completed');
			
			gIniObj = JSON.parse(aNewlyFormattedIniObj);
			
			if (aDelaySetState) {
				// :todo: from aDelaySetState remove the time it took to get back here
				// var fetchTimeTotal = Date.now() - fetchTimeSt;
				// console.info('will wait a modified time of:', aDelaySetState - fetchTimeTotal, 'as it took fetchTimeTotal of:', fetchTimeTotal);
				setTimeout(function() {
					this.setState({
						sIniObj: JSON.parse(aNewlyFormattedIniObj) // this should always be gIniObj
					});
				}.bind(this), aDelaySetState);
			} else {
				this.setState({
					sIniObj: JSON.parse(aNewlyFormattedIniObj) // this should always be gIniObj
				});
			}
		}.bind(this));
		
	},
	componentDidMount: function() {
		MyStore.updateStatedIniObj = this.updateStatedIniObj; // no need for bind here else React warns "Warning: bind(): You are binding a component method to the component. React does this for you automatically in a high-performance way, so you can safely remove this call. See Menu"
		MyStore.setState = this.setState.bind(this); // need bind here otherwise it doesnt work
		MyStore.onComponentChange = this.onComponentChange;
	},
	updateStatedIniObj: function() {
		this.setState({
			sIniObj: JSON.parse(JSON.stringify(gIniObj))
		});
	},
	render: function render() {
		// props - none

		if (this.state.sIniObj.length == 0) {
			this.state.sIniObj = JSON.parse(JSON.stringify(gIniObj));
		}
		
		var aProps = {
			className: 'wrap-react',
			component:'div',
			transitionName:'section-collapse',
			transitionEnterTimeout: 300,
			transitionLeaveTimeout: 300
		};
		
		var children = [];
		
		children.push(React.createElement(Row, {gRowInfo:{id:'help', type:'ignore'}, sHelp:this.state.sHelp})); // otherwise link8484888888 will give a warning
		
		// console.log('gDOMInfo.length:', gDOMInfo.length);
		
		var sGenIniEntry = getIniEntryByKeyValue(this.state.sIniObj, 'groupName', 'General');
		var sCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(this.state.sIniObj, 'currentProfile', true);
		console.info('sGenIniEntry:', sGenIniEntry);
		
		var jProfilistDev = getPrefLikeValForKeyInIniEntry(sCurProfIniEntry, sGenIniEntry, 'ProfilistDev') == '1' ? true : false;
		
		for (var i=0; i<gDOMInfo.length; i++) {
			console.log('gDOMInfo[i]:', gDOMInfo[i]);
			if (gDOMInfo[i].section == myServices.sb.GetStringFromName('profilist.cp.developer') && !jProfilistDev) {
				continue;
			}
			children.push(React.createElement(Section, {gSectionInfo:gDOMInfo[i], sIniObj: this.state.sIniObj, sGenIniEntry: sGenIniEntry, sCurProfIniEntry: sCurProfIniEntry, sBuildsLastRow: (gDOMInfo[i].section != myServices.sb.GetStringFromName('profilist.cp.developer') ? undefined : this.state.sBuildsLastRow), sHelp:this.state.sHelp }));
		}
		
		if (!this.state.sHelp) {
			aProps.className += ' help-off';
		}
		
		return React.createElement(React.addons.CSSTransitionGroup, aProps,
			children
		);
	}
});
var Section = React.createClass({
    displayName: 'Section',
	render: function render() {
		// props
		//	gSectionInfo
		//	sIniObj
		//	sCurProfIniEntry
		//	sGenIniEntry
		//	sBuildsLastRow - only if this is gSectionInfo.section == myServices.sb.GetStringFromName('profilist.cp.developer')
		//	sHelp
		var aProps = {
			className: 'section'
		};
		
		var children = [];
		
		// console.log('this.props.gSectionInfo.length:', this.props.gSectionInfo.length);
		children.push(React.createElement('h3', {className:'section-head'},
			this.props.gSectionInfo.section
		));
		
		for (var i=0; i<this.props.gSectionInfo.rows.length; i++) {
			children.push(React.createElement(Row, {gRowInfo:this.props.gSectionInfo.rows[i], sIniObj: this.props.sIniObj, sGenIniEntry: this.props.sGenIniEntry, sCurProfIniEntry: this.props.sCurProfIniEntry, sBuildsLastRow:(this.props.gSectionInfo.rows[i].label != myServices.sb.GetStringFromName('profilist.cp.builds') ? undefined : this.props.sBuildsLastRow), sHelp:this.props.sHelp }));
		}
		
		return React.createElement('div', aProps,
			children
		);
	}
});
var Row = React.createClass({
    displayName: 'Row',
	onChange: function(e) {
		// only attached if the element has a key in gRowInfo
		var gIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // ini entry for the current profile
		var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
		
		// alert(e.target.value);
		setPrefLikeValForKeyInIniEntry(gIniEntry, gGenIniEntry, this.props.gRowInfo.key, e.target.value);
		
		console.log('ok gIniObj updated');
		
		MyStore.onComponentChange(gIniObj);
	},
	toggleSpecificness: function() {
		var curSpecificness = getSpecificnessForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, this.props.gRowInfo.key);
		var curKeyVal = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, this.props.gRowInfo.key);
		
		var gIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // ini entry for the current profile in global. need global as it is by reference i make a change on it with setPrefLikeValForKeyInIniEntry
		var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General'); // same with gGenIniEntry, i dont use thsi.props.sGenIniEntry because i might affect it with setPrefLikeValForKeyInIniEntry
		setPrefLikeValForKeyInIniEntry(gIniEntry, gGenIniEntry, this.props.gRowInfo.key, curKeyVal, curSpecificness == 2 ? 1 : 2);
		MyStore.onComponentChange(gIniObj);
	},
	render: function render() {
		// props - none
		//	gRowInfo
		//	sIniObj
		//	sCurProfIniEntry
		//	sGenIniEntry
		// sBuildsLastRow - only if  this is gRowInfo.label == myServices.sb.GetStringFromName('profilist.cp.builds')
		//	sHelp
		
		var aProps = {
			className: 'row'
		};
		
		var children = [];
		
		if (this.props.gRowInfo.id && this.props.gRowInfo.key) {
			console.error('gRowInfo must have one or the other! key OR id! never both!');
			throw new Error('gRowInfo must have one or the other! key OR id! never both!');
		}
		
		if (this.props.gRowInfo.id) {
			switch (this.props.gRowInfo.id) {
				case 'help':
					
						console.log('this.props.sHelp:', this.props.sHelp);
						aProps.className += ' row-help';
						var cHelpIconProps = {
							className:'fontello-icon icon-help profilist-tooltipped profilist-tooltip-help',
							onClick: function() {
								MyStore.setState({
									sHelp:!this.props.sHelp
								});
							}.bind(this)
						};
						children.push(
							React.createElement('span', cHelpIconProps)
						);
					
					break;
				default:
					
						////
					
			}
		} else if (this.props.gRowInfo.key) {
			switch (this.props.gRowInfo.key) {
				default:
				
						////
					
			}
		} else {
			console.error('gRowInfo does not have an id or key!!! it must have one of them!');
			throw new Error('gRowInfo does not have an id or key!!! it must have one of them!');
		}
		
		if (this.props.gRowInfo.label) {
			children.push(React.createElement('label', {},
				this.props.gRowInfo.label
			));
		}
		
		// can specificty be toggled? if so then add in toggler ELSE explain specificness in desc
		var specificnessDesc;
		var specificnessEl;
		if (this.props.gRowInfo.key) { //only things with key are in ini. and only things in ini can have specificity
			// console.log('gKeyInfoStore[this.props.gRowInfo.key]:', gKeyInfoStore[this.props.gRowInfo.key]);
			if (!gKeyInfoStore[this.props.gRowInfo.key].unspecificOnly && !gKeyInfoStore[this.props.gRowInfo.key].specificOnly) {
				// alert('this one can be toggled:' + this.props.gRowInfo.key);
				var togglerClassName = 'fontello-icon icon-specificness-toggler profilist-tooltipped profilist-tooltip-specificity';
				if (getSpecificnessForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, this.props.gRowInfo.key) === 1) {
					// is specific
					togglerClassName += ' is-specific';
				} // else { // == 2 so its unspecific }
				specificnessEl = React.createElement('span', {className:togglerClassName, onClick:this.toggleSpecificness});
			} else {
				// add in modded desc
				specificnessDesc = '\n\n';
				if (gKeyInfoStore[this.props.gRowInfo.key].unspecificOnly) {
					specificnessDesc = myServices.sb.GetStringFromName('profilist.cp.unspecfic-only');
				} else {
					specificnessDesc = myServices.sb.GetStringFromName('profilist.cp.specfic-only');
				}
			}
		}
		
		// add in desc
		if (this.props.sHelp && (this.props.gRowInfo.desc || specificnessDesc)) {
			var cChildProps = {className:'fontello-icon icon-info', 'data-specificness': !specificnessDesc ? undefined : specificnessDesc};
			if (this.props.gRowInfo.tooltip_id) {
				cChildProps.className += ' profilist-tooltipped profilist-tooltip-' + this.props.gRowInfo.tooltip_id
			}
			children.push(React.createElement('span', cChildProps));
		}
		
		switch (this.props.gRowInfo.type) { // must have type link8484888888 or you get a warning, it doesnt break, but its a warning
			case 'select':
				
					var options = [];
					var aSelectProps;

					if (this.props.gRowInfo.id && this.props.gRowInfo.id == 'desktop-shortcut') { // gRowInfo does not have to have an id
						// :todo: clean this up, im using globals and recalculating stuff here, not good
						options.push(React.createElement('option', {value:''},
									myServices.sb.GetStringFromName('profilist.cp.select-profile')
						));
						var sortedIniObj = JSON.parse(JSON.stringify(gIniObj));
						var keyValSort = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, 'ProfilistSort');
						
						for (var i=0; i<sortedIniObj.length; i++) {
							if (sortedIniObj[i].Path) {
								sortedIniObj[i].noWriteObj.lowerCaseName = sortedIniObj[i].Name.toLowerCase();
							} else {
								sortedIniObj.splice(i, 1); // link2319938
								i--;
							}
						}
						
						if (keyValSort == '2') {
							// sort it alphanum
							sortedIniObj.sort(function(a, b) {	// by alpha-numeric-insensitive profile name ASC		
								return compareAlphaNumeric(a.noWriteObj.lowerCaseName, b.noWriteObj.lowerCaseName);
							})
						}
						
						for (var i=0; i<sortedIniObj.length; i++) {
							// if (sortedIniObj[i].Path) { // no need for this check i already filtered it out above link2319938
								var aOptEl = React.createElement('option', {value:sortedIniObj[i].Path},
									sortedIniObj[i].Name,
									!sortedIniObj[i].isTemp ? undefined : ' ' + myServices.sb.GetStringFromName('profilist.cp.temporary-profile')
								);
								if (sortedIniObj[i].noWriteObj.currentProfile) {
									options.splice(1, 0, [aOptEl]);
								} else {
									options.push(aOptEl);
								}
							// }
						}
						
						// attach on change listener
						aSelectProps = {};
						aSelectProps.onChange = function(e) {
							var refsSelect = e.target;
							var refsLoader = this.refs.loader;
							refsLoader.setAttribute('src', core.addon.path.images + 'cp/loading.gif');
							refsLoader.style.opacity = 1;
							refsSelect.setAttribute('disabled', 'disabled');
							// alert(refsSelect.value);
							
							sendAsyncMessageWithCallback(['createDesktopShortcut', refsSelect.value], function() {
								// this callback doesnt handle errors, errors notification comes from mainworker doing showNotification
								refsLoader.setAttribute('src', core.addon.path.images + 'cp/loading-done.gif');
								
								setTimeout(function() {
									refsLoader.style.opacity = 0;
									refsSelect.removeAttribute('disabled');
									refsSelect.selectedIndex = '0'; // this does not trigger the aSelectProps.onChange event
								}, 500);
							});
						}.bind(this);
					} else {
						for (var o in this.props.gRowInfo.values) {
							options.push(
								React.createElement('option', {value:o},
									this.props.gRowInfo.values[o]
								)
							);
						}
					}
					if (this.props.gRowInfo.key) {
						aSelectProps = {
							defaultValue: ''
						};
						// console.log('fetching pref val for key:', this.props.gRowInfo.key);
						aSelectProps.value = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, this.props.gRowInfo.key);
						
						aSelectProps.onChange = this.onChange;
					}
					children.push(React.createElement('div', {},
						!specificnessEl ? undefined : specificnessEl,
						React.createElement('select', aSelectProps,
							options
						)
					));
				
				break;
			case 'custom':
				
					switch (this.props.gRowInfo.key ? this.props.gRowInfo.key : this.props.gRowInfo.id) {
						case 'ProfilistBuilds':
						
								aProps.className += ' row-builds-widget'
								children.push(React.createElement(BuildsWidget, {gRowInfo: this.props.gRowInfo, sIniObj: this.props.sIniObj, sGenIniEntry: this.props.sGenIniEntry, sCurProfIniEntry: this.props.sCurProfIniEntry, sBuildsLastRow: this.props.sBuildsLastRow}));
						
							break;
						default:
							console.error('should never get here ever!');
					}
				
				break;
			default:
			
					////
		}
		
		if (this.props.gRowInfo.id && this.props.gRowInfo.id == 'desktop-shortcut') { // gRowInfo does not have to have an id
			// add in the loader image
			aProps.style = {position:'relative'};
			children.push(React.createElement('img', {ref:'loader', src:core.addon.path.images + 'cp/loading.gif', style:{position:'absolute',top:'50%',height:'7px',marginTop:'-3px', right:'-34px', opacity:0, transition:'opacity 500ms'}}));
		}
		
		return React.createElement('div', aProps,
			children
		);
	}
});
var BuildsWidget = React.createClass({
    displayName: 'BuildsWidget',
	click: function(e) {
		// console.log('this.refs:', this.refs);
		// console.log('this.rowOffsets:', this.rowOffsets);
		// for (var ref in this.refs) {
		// 	console.log(ref, 'rowStepSlots:', this.refs[ref].rowStepSlots);
		// }
	},
	dragMove: function(e) {
		// console.log('drag moved', e);
		
		var rowStepSlots = this.refs[this.draggingRef].rowStepSlots;
		
		// calc newStyleTop
		var yNow = e.clientY;
		var yDiff = yNow - this.yInit;
		var newStyleTop = this.topInit + yDiff;
		
		// check if should set, and if so, then set it
		var didSet = false;
		
		if (newStyleTop >= rowStepSlots[0] && newStyleTop <= rowStepSlots[rowStepSlots.length-1]) {
			this.lastDidSet = newStyleTop; // last top that a set happend on
			this.draggingRowEl.style.top = newStyleTop + 'px';
			didSet = true;
			// console.log('ok new styleTop:', newStyleTop);
			
		} else {
			if (newStyleTop < rowStepSlots[0]) {
				// need to max to bottom
				
				if (this.lastDidSet != rowStepSlots[0]) {
					this.lastDidSet = rowStepSlots[0];
					newStyleTop = rowStepSlots[0];
					this.draggingRowEl.style.top = newStyleTop + 'px';
					didSet = true;
					// console.log('ok new styleTop:', newStyleTop);
				}
				
			} else {
				// need to max to top
				if (this.lastDidSet != rowStepSlots[rowStepSlots.length-1]) {
					this.lastDidSet = rowStepSlots[rowStepSlots.length-1];
					newStyleTop = rowStepSlots[rowStepSlots.length-1];
					this.draggingRowEl.style.top = newStyleTop + 'px';
					didSet = true;
					// console.log('ok new styleTop:', newStyleTop);
				}
			}
		}
		
		// if didSet, do the post didSet checks
		if (didSet) {
			// find position this row should be in, based on newStyleTop, check if we need to swap anything in the dom, and do it if needed
			// console.log('these are the slot positions for this row:', rowStepSlots);
			for (var i=this.rowSlotsCnt-1; i>=0; i--) { // i is slot number
				if (newStyleTop >= rowStepSlots[i] - this.rowStepTolerance) {
					// find what ref currently resides in this spot, and swap
					// console.log('found that this row, should be in slot:', i);
					if (this.jsRefToSlot[this.draggingRef] == i) {
						// already in this position so break
						// console.log('already in position, so no need for swap');
						break;
					}
					// not in position, so swap is needed
					for (var aRef in this.jsRefToSlot) {
						if (this.jsRefToSlot[aRef] == i) {
							this.jsRefToSlot[aRef] = this.jsRefToSlot[this.draggingRef];
							break;
						}
					}
					this.jsRefToSlot[this.draggingRef] = i;
					this.matchDomTo_jsRefToSlot();
					break;
				}
			}
		}
	},
	dragDrop: function(e) {
		document.removeEventListener('mouseup', this.dragDrop, false);
		document.removeEventListener('mousemove', this.dragMove, false);
		this.draggingRowEl.classList.remove('builds-row-indrag');
		this.lastDidSet = undefined;
		// set the dragging ref to be exactly in position
		ReactDOM.findDOMNode(this.refs[this.draggingRef]).style.top = this.refs[this.draggingRef].rowStepSlots[this.jsRefToSlot[this.draggingRef]] + 'px'; // instead of setting this.draggingRef to null, then calling this.matchDomTo_jsRefToSlot()

		// if needs update do this stuff
		if (this.jsRefToSlot[this.draggingRef] != this.draggingRef.substr(3)) { // testing if row# is a different # - which indicates it needs update
			var newJProfilistBuilds = [];
			for (var ref in this.jsRefToSlot) {
				var indexInJProfilistBuilds = parseInt(ref.substr(3));
				newJProfilistBuilds.push(this.jProfilistBuilds[indexInJProfilistBuilds]);
				this.jProfilistBuilds[indexInJProfilistBuilds].tempOrder = this.jsRefToSlot[ref];
			}
			
			newJProfilistBuilds.sort(function(a, b) {
				return a.tempOrder - b.tempOrder;
			});
			
			for (var i=0; i<newJProfilistBuilds.length; i++) {
				delete newJProfilistBuilds[i].tempOrder;
			}
			console.log('newJProfilistBuilds:', newJProfilistBuilds, 'this.jsRefToSlot:', this.jsRefToSlot);
			
			var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
			gGenIniEntry.ProfilistBuilds = JSON.stringify(newJProfilistBuilds);
			
			MyStore.onComponentChange(gIniObj, 100); // tell it before the 100ms is up but use 100ms delay before setState // cross file link381739311
			
			this.dragDropTimout = setTimeout(function() {
				delete this.dragDropTimout;
				ReactDOM.findDOMNode(this.refs.widget).classList.remove('builds-widget-indrag');
				// MyStore.updateStatedIniObj();
			}.bind(this), 100); //100 is the transition time - cross file link381739311
		} else {
			console.log('no need for update');
			this.dragDropTimout = setTimeout(function() {
				delete this.dragDropTimout;
				ReactDOM.findDOMNode(this.refs.widget).classList.remove('builds-widget-indrag');
			}.bind(this), 100); //100 is the transition time - cross file link381739311
		}
	},
	componentDidUpdate: function() {
		// set all tops back to 0
		console.log('did update');
		for (var ref in this.refs) {
			if (ref == 'widget') { continue; }
			ReactDOM.findDOMNode(this.refs[ref]).style.top = '';
		}
		ReactDOM.findDOMNode(this.refs.widget).lastChild.style.top = '';
		delete this.jsRefToSlot;
	},
	dragStart: function(aRowRef, e) {
		if (this.jProfilistBuilds.length < 2) {
			return;
		}
		if (this.dragDropTimout) {
			clearTimeout(this.dragDropTimout);
			delete this.dragDropTimout;
		}
		if (!this.jsRefToSlot) {
			this.jsRefToSlot = {}; // key is ref, and value is the slot position
			this.rowOffsets = []; // holds the offset tops
			for (var ref in this.refs) { // each ref is a row element
				if (ref == 'widget') { continue; }
				this.rowOffsets.push(ReactDOM.findDOMNode(this.refs[ref]).offsetTop);
			}
			console.error('this.rowOffsets:', this.rowOffsets);
			this.rowSlotsCnt = this.rowOffsets.length;
			if (this.rowSlotsCnt > 1) {
				// calculate relative position, for each row, when in slot X
				this.rowStepSize = this.rowOffsets[1] - this.rowOffsets[0]; // height of one row basically. stepping by this will put you in next slot.
				this.rowStepTolerance = Math.ceil(this.rowStepSize / 2);
				for (var h=0; h<this.rowSlotsCnt; h++) { // h is row number
					var cRef = 'row' + h;
					this.jsRefToSlot[cRef] = h;
					this.refs[cRef].rowStepSlots = []; // holds the top (position relative) postitions it should be at based on position. position is element in the array. so if should be FIRST, then [0] holds the top it that element should have
					for (var i=0; i<this.rowSlotsCnt; i++) { // i is predicted row number
						if (i == h) {
							this.refs[cRef].rowStepSlots.push(0);
						} else {
							this.refs[cRef].rowStepSlots.push((i - h) * this.rowStepSize);
						}
					}
				}
			} // else no drag
		}
		if (!this.rowStepSize) { // rowStepSize is not set when there is not more then 1 row. meaning this.rowOffsets.length > 1
			return false; // no drag
		}
		this.refs.widget.classList.add('builds-widget-indrag');
		this.draggingRef = aRowRef;
		this.draggingRowEl = ReactDOM.findDOMNode(this.refs[aRowRef]);
		console.log('drag started', e);
		this.yInit = e.clientY;
		this.topInit = this.draggingRowEl.style.top;
		this.topInit = this.topInit ? parseInt(this.topInit) : 0;
		console.log('this.topInit:', this.topInit);
		this.draggingRowEl.classList.add('builds-row-indrag');
		document.addEventListener('mouseup', this.dragDrop, false);
		document.addEventListener('mousemove', this.dragMove, false);
	},
	matchDomTo_jsRefToSlot: function() {
		// this function is only called during dragging
		for (var ref in this.jsRefToSlot) { // each ref is a row element
			if (ref == this.draggingRef) { // we dont set top on this as user is dragging it
				continue;
			}
			ReactDOM.findDOMNode(this.refs[ref]).style.top = this.refs[ref].rowStepSlots[this.jsRefToSlot[ref]] + 'px';
			// console.warn('set:', ref, 'to :', this.refs[ref].rowStepSlots[this.jsRefToSlot[ref]]);
		}
	},
	// componentDidMount: function() {
	// 	console.error('mount triggered, document.readyState:', document.readyState);
	// 	// window.addEventListener('load', function(e) {
	// 	// 	alert('loaded, e.target: ' + e.target);
	// 	// }, true);
	// 	// window.addEventListener('load', function(e) {
	// 	setTimeout(function() {
    // 
	// 	}.bind(this), 50); // it needs some time for a fresh dom (browser restart to load otherwise the offsetTop's are a bit weird)
	// 	// }.bind(this), true); // must be true, didnt test false, but on document.add to load it needed to be true // i think this is because i need to wait for the stylesheet to load or something, otherwise the offsets are too spaced apart
	// 	// using settimeout method instead, because sometimes page loads so fast, it doesnt get to this mount function before load
	// },
	render: function render() {
		// props
		//	sIniObj
		//	gRowInfo
		//	sCurProfIniEntry
		//	sGenIniEntry
		//	sBuildsLastRow
		var children = [];

		children.push(React.createElement(BuildsWidgetRow, {jProfilistBuildsEntry:'head', sCurProfIniEntry: this.props.sCurProfIniEntrym}));

		var keyValBuilds = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, 'ProfilistBuilds');		
		var jProfilistBuilds = JSON.parse(keyValBuilds);
		this.jProfilistBuilds = jProfilistBuilds;
		console.error('jProfilistBuilds:', jProfilistBuilds);
		for (var i=0; i<jProfilistBuilds.length; i++) {
			children.push(React.createElement(BuildsWidgetRow, {jProfilistBuildsEntry:jProfilistBuilds[i], sCurProfIniEntry: this.props.sCurProfIniEntry, ref:'row' + i, dragStart:this.dragStart.bind(this, 'row' + i), sGenIniEntry:this.props.sGenIniEntry}));
		}
		
		children.push(React.createElement(BuildsWidgetRow, {sCurProfIniEntry: this.props.sCurProfIniEntry, sBuildsLastRow: this.props.sBuildsLastRow})); // last row
		
		return React.createElement('div', {className:'builds-widget', onClick:this.click, ref:'widget'},
			children
		);
	}
});
var BuildsWidgetRow = React.createClass({ // this is the non header row
    displayName: 'BuildsWidgetRow',
	clickIcon: function(e) {
		/*
		sendAsyncMessageWithCallback(['browseiconRequest'], function(aAction, aImgObj) {
			console.log('browseicon dialog action == ', aAction);
			if (aAction == 'accept') {
				console.log('because accepted there is aImgObj:', aImgObj);
			}
		}.bind(this));
		*/
		if (!this.props.jProfilistBuildsEntry) {
			// its last row (well or head, but head doesnt have clickDel so its definitely last row)
			// alert('ok clearing sBuildsLastRow');
			
			var IPStoreInitWithSlug;
			var IPStoreInitWithUnselectCallback;
			
			if (this.props.sBuildsLastRow && this.props.sBuildsLastRow.imgSlug) {
				IPStoreInitWithSlug = this.props.sBuildsLastRow.imgSlug;
				IPStoreInitWithUnselectCallback = function() {
					MyStore.setState({
						sBuildsLastRow: {}
					});
				}.bind(this)
			}
			
			var IPStoreInitWithSelectCallback = function(aImgSlug, aImgObj) {
				console.error('ok applied icon, aImgSlug:', aImgSlug, 'aImgObj:', aImgObj);
				this.userInputLastRow(undefined, aImgSlug, aImgObj);
			}.bind(this);
			
			IPStore.init(e.target, IPStoreInitWithSelectCallback, IPStoreInitWithSlug, IPStoreInitWithUnselectCallback, 0);
			
		} else {
			// its a build entry row
			var IPStoreInitWithSlug = this.props.jProfilistBuildsEntry.i;
			var IPStoreInitWithUnselectCallback = undefined; // no unselect allowed			
			var IPStoreInitWithSelectCallback = function(aImgSlug, aImgObj) {
				console.error('ok replaced icon, new aImgSlug:', aImgSlug, 'aImgObj:', aImgObj);
				
				var new_jProfilistBuildEntry = JSON.parse(JSON.stringify(this.props.jProfilistBuildsEntry));
				console.log('new_jProfilistBuildEntry:', new_jProfilistBuildEntry.toString());
				new_jProfilistBuildEntry.i = aImgSlug;
				
				sendAsyncMessageWithCallback(['callInPromiseWorker', ['replaceBuildEntry', new_jProfilistBuildEntry.id, new_jProfilistBuildEntry]], function(aErrorOrNewIniObj) {
					console.log('back from replaceBuildEntry');
					if (Array.isArray(aErrorOrNewIniObj)) {
						gIniObj = aErrorOrNewIniObj;
						MyStore.setState({
							sIniObj: JSON.parse(JSON.stringify(gIniObj)),
							sBuildsLastRow: {}
						});
					} else {
						console.error('some error occured when trying to add new build', aErrorOrNewIniObj);
						throw new Error('some error occured when trying to add new build');
					}
				});
			}.bind(this);
			
			IPStore.init(e.target, IPStoreInitWithSelectCallback, IPStoreInitWithSlug, IPStoreInitWithUnselectCallback, 0);
		}
	},
	clickPath: function() {
		alert('clicked path');
	},
	clickDel: function() {
		if (!this.props.jProfilistBuildsEntry) {
			// its last row (well or head, but head doesnt have clickDel so its definitely last row)
			// alert('ok clearing sBuildsLastRow');
			MyStore.setState({sBuildsLastRow:{}});
		} else {
			console.log('hi:', this.props.jProfilistBuildsEntry)
			sendAsyncMessageWithCallback(['callInPromiseWorker', ['removeBuild', this.props.jProfilistBuildsEntry.id, false]], function(aErrorOrNewIniObj) {
				if (Array.isArray(aErrorOrNewIniObj)) {
					gIniObj = aErrorOrNewIniObj;
					MyStore.setState({
						sIniObj: JSON.parse(JSON.stringify(gIniObj)),
						sBuildsLastRow: {}
					});
				} else {
					console.error('some error occured when trying to add new build', aErrorOrNewIniObj);
					throw new Error('some error occured when trying to add new build');
				}
			});
		}
		// alert('clicked del');
	},
	clickCurProfPath: function() {
		alert('clicked user current profile path');
	},
	clickBrowse: function() {
		sendAsyncMessageWithCallback(['browseExe'], function(aBrowsedPlatPath) {
			if (aBrowsedPlatPath) {
				if (core.os.mname == 'darwin') {
					aBrowsedPlatPath += '/Contents/MacOS/firefox';
				}
				if (!this.props.jProfilistBuildsEntry) {
					// its last row (well or head, but head doesnt have clickDel so its definitely last row)
					this.userInputLastRow(aBrowsedPlatPath);
				} else {
					// not last row
					var new_jProfilistBuildEntry = JSON.parse(JSON.stringify(this.props.jProfilistBuildsEntry));
					console.log('new_jProfilistBuildEntry:', new_jProfilistBuildEntry.toString());
					new_jProfilistBuildEntry.p = aBrowsedPlatPath;
					
					sendAsyncMessageWithCallback(['callInPromiseWorker', ['replaceBuildEntry', new_jProfilistBuildEntry.id, new_jProfilistBuildEntry]], function(aErrorOrNewIniObj) {
						console.log('back from replaceBuildEntry');
						if (Array.isArray(aErrorOrNewIniObj)) {
							gIniObj = aErrorOrNewIniObj;
							MyStore.setState({
								sIniObj: JSON.parse(JSON.stringify(gIniObj)),
								sBuildsLastRow: {}
							});
						} else {
							console.error('some error occured when trying to add new build', aErrorOrNewIniObj);
							throw new Error('some error occured when trying to add new build');
						}
					});
				}
			} // else cancelled
		}.bind(this));
	},
	userInputLastRow(aExePath, aImgSlug, aImgObj) {
		// either aBrowsePath is set, or aImgSlug/aImgObj
		var shouldSetBuildsRowInfo; // set to obj if need to update
		var newRowInfo; // set to obj if need new row
		if (aExePath) {
			if (!this.props.sBuildsLastRow.imgSlug) { // :note: if imgSlug is there then imgObj is there for sure. opposite also true link8888331
				shouldSetBuildsRowInfo = {
					sBuildsLastRow: {
						exePath: aExePath
					}
				};
			} else { // else need to add new row
				newRowInfo = {
					exePath: aExePath,
					imgSlug: this.props.sBuildsLastRow.imgSlug
				};
			}
		} else {
			if (!aImgSlug || !aImgObj) { console.error('dev error, must provide aImgSlug and aImgObj togather'); throw new Error('dev error'); }
			
			if (!this.props.sBuildsLastRow.exePath) {
				shouldSetBuildsRowInfo = {
					sBuildsLastRow: {
						imgSlug: aImgSlug,
						imgObj: aImgObj
					}
				};
			} else { // else need to add new row
				newRowInfo = {
					exePath: this.props.sBuildsLastRow.exePath,
					imgSlug: aImgSlug
				};
			}
		}
		
		if (shouldSetBuildsRowInfo) {
			MyStore.setState(shouldSetBuildsRowInfo);
		} else {
			// add new row
			// alert('add new row: ' + uneval(newRowInfo));
			sendAsyncMessageWithCallback(['callInPromiseWorker', ['addBuild', newRowInfo.imgSlug, newRowInfo.exePath, false]], function(aErrorOrNewIniObj) {
				if (Array.isArray(aErrorOrNewIniObj)) {
					gIniObj = aErrorOrNewIniObj;
					MyStore.setState({
						sIniObj: JSON.parse(JSON.stringify(gIniObj)),
						sBuildsLastRow: {}
					});
				} else {
					console.error('some error occured when trying to add new build', aErrorOrNewIniObj);
					throw new Error('some error occured when trying to add new build');
				}
			});
		}
	},
	contextMenuBrowse: function() {
		console.log('make if copy it should copy all');
	},
	render: function render() {
		// props
		//	jProfilistBuildsEntry - for title this is 'head' for last row this is absent meaning undefined
		//	sCurProfIniEntry - only if this is NOT last row and NOT head row
		//	dragStart
		//	sBuildsLastRow - only if this is last row
		//	sGenIniEntry - only if this is NOT last row and NOT head row
		
		if (this.props.jProfilistBuildsEntry && this.props.jProfilistBuildsEntry == 'head') {
			return React.createElement('div', {className:'builds-widget-row'},
				React.createElement('span', {}, myServices.sb.GetStringFromName('profilist.cp.icon')),
				React.createElement('span', {}, myServices.sb.GetStringFromName('profilist.cp.path-to-exe')),
				React.createElement('span', {},
					React.createElement('span', {className:'fontello-icon icon-tools'})
				)
			);
		} else {
			
			var imgSrc;
			var textVal;
			var imgSize;
			if (!this.props.jProfilistBuildsEntry) {
				// its last one
				if (this.props.sBuildsLastRow.imgSlug) { // :note: if imgSlug is there then imgObj is there for sure. opposite also true. and IF imgSlug is there, then there is no way there is exePath. if both are filled then it should have added a new jProfilistBuilds entry. link8888331
					var img16SrcObj = getImgSrcForSize(this.props.sBuildsLastRow.imgObj, 16);
					imgSrc = img16SrcObj.src;
					if (img16SrcObj.resize) {
						imgSize = '16';
					}
					// impossible for textVal to be set
				} else {
					imgSrc = core.addon.path.images + 'search.png'
				}

				if (this.props.sBuildsLastRow.exePath) {
					// this means that imgSlug/imgObj were not set!
					textVal = this.props.sBuildsLastRow.exePath;
				} // else no textVal
			} else {
				// its content
				var img16SrcObj = this.props.sGenIniEntry.noWriteObj.imgSrcObj_nearest16_forImgSlug[this.props.jProfilistBuildsEntry.i];
				imgSrc = img16SrcObj.src;
				textVal = this.props.jProfilistBuildsEntry.p;
				if (img16SrcObj.resize) {
					imgSize = '16';
				}
			}
			
			var cTextboxClass = ['builds-widget-textbox'];
			if (!textVal) {
				cTextboxClass.push('builds-widget-textbox-placeholder');
			}
			
			return React.createElement('div', {className:'builds-widget-row'},
				React.createElement('span', {},
					React.createElement('img', {onClick:this.clickIcon, src: imgSrc, width:imgSize, height:imgSize})
				),
				React.createElement('span', {},
					// React.createElement('input', {type:'text', value:textVal, onClick:this.clickBrowseExe, placeholder:myServices.sb.GetStringFromName('profilist.cp.click-to-browse')})
					React.createElement('div', {className:cTextboxClass.join(' '), onClick:this.clickBrowse, onContextMenu:this.contextMenuBrowse},
						textVal ? textVal : myServices.sb.GetStringFromName('profilist.cp.click-to-browse')
					)
				),
				React.createElement('span', {},
					React.createElement('span', {className:'fontello-icon icon-del', onClick:this.clickDel}),
					React.createElement('span', {className:'fontello-icon icon-drag', onMouseDown:this.props.dragStart}),
					React.createElement('span', {className:'fontello-icon icon-curprofpath', onClick:this.clickCurProfPath})
				)
			);
		}
	}
});
// End - Page Functionalities

// start - server/framescript comm layer
// sendAsyncMessageWithCallback - rev3
var bootstrapCallbacks = { // can use whatever, but by default it uses this
	// put functions you want called by bootstrap/server here
	
};
// end - server/framescript comm layer
// start - common helper functions
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