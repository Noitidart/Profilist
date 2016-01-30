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
XPCOMUtils.defineLazyGetter(myServices, 'sb_ip', function () { return Services.strings.createBundle(core.addon.path.locale + 'iconsetpicker.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

// Start - DOM Event Attachments
function doOnBeforeUnload() {

	contentMMFromContentWindow_Method2(window).removeMessageListener(core.addon.id, bootstrapMsgListener);

}

function doOnContentLoad() {
	console.log('in doOnContentLoad');
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
	sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchJustIniObj'], bootstrapMsgListener.funcScope, function(aIniObj) {
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
	sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchCoreAndConfigs'], bootstrapMsgListener.funcScope, function(aObjs) {
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
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.launch'),
				desc: myServices.sb.GetStringFromName('profilist.cp.launch-desc'),
				type: 'select',
				key: 'ProfilistLaunch',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				}
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
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.dev'),
				desc: myServices.sb.GetStringFromName('profilist.cp.dev-desc'),
				type: 'select',
				key: 'ProfilistDev',
				values: {
					'0': myServices.sb.GetStringFromName('profilist.cp.disabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.enabled')
				}
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
				}
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
					'0': myServices.sb.GetStringFromName('profilist.cp.enabled'),
					'1': myServices.sb.GetStringFromName('profilist.cp.disabled')
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.builds'),
				desc: myServices.sb.GetStringFromName('profilist.cp.builds-desc'),
				key: 'ProfilistBuilds',
				type: 'custom'
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
			sBuildsLastRow: {}
		};
	},
	onComponentChange: function(aNewIniObj, aDelaySetState) {
		// aNewIniObj should always be reference to gIniObj. meaning on change i should always update gIniObj. i want to keep gIniObj synced with sIniObj
		// send update to MainWorker.js to write sIniObj to file
		// onChange of each row, should call this
		
		// var fetchTimeSt = Date.now();
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['userManipulatedIniObj_updateIniFile', JSON.stringify(aNewIniObj)], bootstrapMsgListener.funcScope, function(aNewlyFormattedIniObj) {
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
			className: 'wrap-react'
		};
		
		var children = [];
		
		children.push(React.createElement(Row, {gRowInfo:{id:'help'}}));
		
		// console.log('gDOMInfo.length:', gDOMInfo.length);
		
		var sGenIniEntry = getIniEntryByKeyValue(this.state.sIniObj, 'groupName', 'General');
		var sCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(this.state.sIniObj, 'currentProfile', true);
		console.info('sGenIniEntry:', sGenIniEntry);
		
		for (var i=0; i<gDOMInfo.length; i++) {
			console.log('gDOMInfo[i]:', gDOMInfo[i]);
			children.push(React.createElement(Section, {gSectionInfo:gDOMInfo[i], sIniObj: this.state.sIniObj, sGenIniEntry: sGenIniEntry, sCurProfIniEntry: sCurProfIniEntry, sBuildsLastRow: (gDOMInfo[i].section != myServices.sb.GetStringFromName('profilist.cp.developer') ? undefined : this.state.sBuildsLastRow) }));
		}
		
		return React.createElement('div', aProps,
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
		
		var aProps = {
			className: 'section'
		};
		
		var children = [];
		
		// console.log('this.props.gSectionInfo.length:', this.props.gSectionInfo.length);
		children.push(React.createElement('h3', {className:'section-head'},
			this.props.gSectionInfo.section
		));
		
		for (var i=0; i<this.props.gSectionInfo.rows.length; i++) {
			children.push(React.createElement(Row, {gRowInfo:this.props.gSectionInfo.rows[i], sIniObj: this.props.sIniObj, sGenIniEntry: this.props.sGenIniEntry, sCurProfIniEntry: this.props.sCurProfIniEntry, sBuildsLastRow:(this.props.gSectionInfo.rows[i].label != myServices.sb.GetStringFromName('profilist.cp.builds') ? undefined : this.props.sBuildsLastRow) }));
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
		
		var gIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true); // ini entry for the current profile
		var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
		setPrefLikeValForKeyInIniEntry(gIniEntry, gGenIniEntry, this.props.gRowInfo.key, curKeyVal, curSpecificness == 2 ? 1 : 2, gIniObj);
		MyStore.onComponentChange(gIniObj);
	},
	render: function render() {
		// props - none
		//	gRowInfo
		//	sIniObj
		//	sCurProfIniEntry
		//	sGenIniEntry
		// sBuildsLastRow - only if  this is gRowInfo.label == myServices.sb.GetStringFromName('profilist.cp.builds')
		
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
					
						aProps.className += ' row-help';
						children.push(
							React.createElement('span', {className:'fontello-icon icon-help'})
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
				var togglerClassName = 'fontello-icon icon-specificness-toggler';
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
		if (this.props.gRowInfo.desc || specificnessDesc) {
			children.push(React.createElement('span', {className:'fontello-icon icon-info', 'data-specificness': !specificnessDesc ? undefined : specificnessDesc}));
		}
		
		switch (this.props.gRowInfo.type) {
			case 'select':
				
					var options = [];
					var aSelectProps;
					if (this.props.gRowInfo.id == 'desktop-shortcut') {
						// :todo: clean this up, im using globals and recalculating stuff here, not good
						options.push(React.createElement('option', {value:'', selected:''},
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
							
							sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['createDesktopShortcut', refsSelect.value], bootstrapMsgListener.funcScope, function() {
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
						aSelectProps = {};
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
		
		if (this.props.gRowInfo.id == 'desktop-shortcut') {
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
		this.refs[this.draggingRef].getDOMNode().style.top = this.refs[this.draggingRef].rowStepSlots[this.jsRefToSlot[this.draggingRef]] + 'px'; // instead of setting this.draggingRef to null, then calling this.matchDomTo_jsRefToSlot()

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
				this.refs.widget.getDOMNode().classList.remove('builds-widget-indrag');
				// MyStore.updateStatedIniObj();
			}.bind(this), 100); //100 is the transition time - cross file link381739311
		} else {
			console.log('no need for update');
			this.dragDropTimout = setTimeout(function() {
				delete this.dragDropTimout;
				this.refs.widget.getDOMNode().classList.remove('builds-widget-indrag');
			}.bind(this), 100); //100 is the transition time - cross file link381739311
		}
	},
	componentDidUpdate: function() {
		// set all tops back to 0
		console.log('did update');
		for (var ref in this.refs) {
			if (ref == 'widget') { continue; }
			this.refs[ref].getDOMNode().style.top = '';
		}
		this.refs.widget.getDOMNode().lastChild.style.top = '';
		delete this.jsRefToSlot;
	},
	dragStart: function(aRowRef, e) {
		if (this.dragDropTimout) {
			clearTimeout(this.dragDropTimout);
			delete this.dragDropTimout;
		}
		if (!this.jsRefToSlot) {
			this.jsRefToSlot = {}; // key is ref, and value is the slot position
			this.rowOffsets = []; // holds the offset tops
			for (var ref in this.refs) { // each ref is a row element
				if (ref == 'widget') { continue; }
				this.rowOffsets.push(this.refs[ref].getDOMNode().offsetTop);
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
		this.draggingRowEl = this.refs[aRowRef].getDOMNode();
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
			this.refs[ref].getDOMNode().style.top = this.refs[ref].rowStepSlots[this.jsRefToSlot[ref]] + 'px';
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
			children.push(React.createElement(BuildsWidgetRow, {jProfilistBuildsEntry:jProfilistBuilds[i], sCurProfIniEntry: this.props.sCurProfIniEntry, ref:'row' + i, dragStart:this.dragStart.bind(this, 'row' + i)}));
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
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['browseiconRequest'], bootstrapMsgListener.funcScope, function(aAction, aImgObj) {
			console.log('browseicon dialog action == ', aAction);
			if (aAction == 'accept') {
				console.log('because accepted there is aImgObj:', aImgObj);
			}
		}.bind(this));
		*/
		IPStore.init(e.target, function(aImgSlug, aImgObj) {
			console.error('ok applied icon, aImgSlug:', aImgSlug, 'aImgObj:', aImgObj);
			MyStore.setState({
				sBuildsLastRow: {
					imgSlug: aImgSlug,
					imgObj: aImgObj
				}
			});
		}, ((this.props.sBuildsLastRow && this.props.sBuildsLastRow.imgSlug) ? this.props.sBuildsLastRow.imgSlug : undefined), function() {
			MyStore.setState({
				sBuildsLastRow: {}
			});
		});
	},
	clickPath: function() {
		alert('clicked path');
	},
	clickDel: function() {
		if (!this.props.jProfilistBuildsEntry) {
			// its last row
			alert('ok clearing sBuildsLastRow');
			MyStore.setState({sBuildsLastRow:{}});
		}
		alert('clicked del');
	},
	clickCurProfPath: function() {
		alert('clicked user current profile path');
	},
	clickBrowse: function() {
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['browseExe'], bootstrapMsgListener.funcScope, function(aBrowsedPlatPath) {
			if (aBrowsedPlatPath) {
				if (this.props.sBuildsLastRow.imgSlug) { // :note: if imgSlug is there then imgObj is there for sure. opposite also true link8888331
					// imgSlug already provided, and now has provided exePath, so clear sBuildsLastRow and push to ProfilistBuilds as well as put into General.noWriteObj the imgsrc of this imgSlug
				} else {
					MyStore.setState({
						sBuildsLastRow: {exePath:aBrowsedPlatPath}
					});
				}
			} // else cancelled
		}.bind(this));
	},
	contextMenuBrowse: function() {
		console.log('make if copy it should copy all');
	},
	render: function render() {
		// props
		//	jProfilistBuildsEntry - for title this is 'head' for last row this is absent meaning undefined
		//	sCurProfIniEntry
		//	dragStart
		//	sBuildsLastRow - only if this is last row
		if (this.props.jProfilistBuildsEntry == 'head') {
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

var IPStore = {
	init: function(aTargetElement, aSelectCallback, aAppliedSlug, aUnselectCallback) {
		// aSelectCallback is called when an icon is applied, it is passed two arguments, aSelectCallback(aImgSlug, aImgObj)
		// aTargetElement is where the arrow of the dialog will point to
		// must have iconsetpicker.css loaded in the html
		console.log('aTargetElement:', aTargetElement);
		
		var wrap = document.createElement('div');
		wrap.setAttribute('class', 'iconsetpicker-wrap');

		var cover = document.createElement('div');
		cover.setAttribute('class', 'iconsetpicker-cover');
		document.body.appendChild(cover);
		
		aTargetElement.parentNode.appendChild(wrap);
		
		var uninit = function(e, didSelect) {
			// document.removeEventListener('keypress', uninitKeypress, false);
			IPStore.setState({
				sInit:false,
				sSelected:didSelect
			});
			cover.parentNode.removeChild(cover);
			setTimeout(function() {
				ReactDOM.unmountComponentAtNode(wrap);
				wrap.parentNode.removeChild(wrap);
			}, 200);
		};
		
		cover.addEventListener('mousedown', uninit, false);
		// document.addEventListener('keypress', uninitKeypress, false);
		
		wrap.style.left = (aTargetElement.offsetLeft - ((100 + 150 + 200) / 2) + (10 / 2 / 2)) + 'px'; // 200 is width of .iconsetpicker-subwrap and 30 is width of .iconsetpicker-arrow
		wrap.style.bottom = (aTargetElement.offsetTop + aTargetElement.offsetHeight + 2) + 'px';
		
		var myIPProps = {
			uninit:uninit,
			select_callback:aSelectCallback
		};
		
		if (aAppliedSlug) {
			if (isSlugInChromeChannelIconsets(aAppliedSlug)) {
				myIPProps.pAppliedSlugDir = core.addon.path.images + 'channel-iconsets/' + aAppliedSlug;
			} else {
				myIPProps.pAppliedSlugDir = core.profilist.path.images + core.os.filesystem_seperator + aAppliedSlug;
			}
			myIPProps.pDirSelected = myIPProps.pAppliedSlugDir;
			myIPProps.unselect_callback = aUnselectCallback;
		}
		var myIP = React.createElement(IPStore.component.IconsetPicker, myIPProps);
		ReactDOM.render(myIP, wrap);
	},
	readSubdirsInDir: function(aDirPlatPath, setNull_sDirSubdirs, sDirListHistory) {
		console.error('sDirListHistory:', sDirListHistory);
		if (setNull_sDirSubdirs) {
			IPStore.setState({
				sDirSubdirs: null,
				sDirSelected: null,
				sPreview: null
			});
		}
		var new_sDirListHistory = [];
		for (var i=0; i<sDirListHistory.length; i++) {
			new_sDirListHistory.push(sDirListHistory[i]);
		}
		
		if (!sDirListHistory.length || sDirListHistory[i - 1] != aDirPlatPath) {
			new_sDirListHistory.push(aDirPlatPath);
		}
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['readSubdirsInDir', aDirPlatPath]], bootstrapMsgListener.funcScope, function(aSubdirsArr) {
			console.log('back from readSubdirsInDir, aSubdirsArr:', aSubdirsArr);
			if (Object.keys(aSubdirsArr).indexOf('aReason') > -1) {
				// errored
				IPStore.setState({
					sDirSubdirs: 'error',
					sDirListHistory: new_sDirListHistory
				});
				throw new Error('readSubdirsInDir failed!!');
			} else {
				
				IPStore.setState({
					sDirSubdirs: aSubdirsArr,
					sDirListHistory: new_sDirListHistory
				});
			}
		});
	},
	readImgsInDir: function(aReadImgsInDirArg, a_cDirSelected) {
		sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['readImgsInDir', aReadImgsInDirArg]], bootstrapMsgListener.funcScope, function(aErrorOrImgObj) {
			if (Object.keys(aErrorOrImgObj).indexOf('aReason') > -1) {
				IPStore.setState({
					sPreview: 'failed-read'
				});
				throw new Error('readImgsInDir failed with OSFileError!!');
			} else if (typeof(aErrorOrImgObj) == 'string') {
				IPStore.setState({
					sPreview: aErrorOrImgObj
				});
				throw new Error('readImgsInDir faield with message: ' + aErrorOrImgObj);
			} else {
				if (typeof(readImgsInDirArg) == 'string' && readImgsInDirArg.indexOf('/Noitidart/Firefox-PNG-Icon-Collections') == -1) {
					var aPartialImgObj = aErrorOrImgObj;
					console.log('got aPartialImgObj:', aPartialImgObj);
					var cPathKeyImgObj = {};
					var promiseAllArr_loadImgs = [];
					for (var i=0; i<aPartialImgObj.length; i++) {
						cPathKeyImgObj[aPartialImgObj[i]] = {
							img: new Image(),
							size: 0,
							deferred: new Deferred(), // img loading defer
							imgloadreason: ''
						};
						cPathKeyImgObj[aPartialImgObj[i]].img.onload = function() {
							if (this.img.naturalWidth == this.img.naturalHeight) {
								this.size = this.img.naturalWidth;
								this.imgloadreason = 'ok';
								this.deferred.resolve('ok');
							} else {
								this.imgloadreason = 'not-square';
								this.deferred.resolve('not-square');
							}
							console.log('loaded img:', this);
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.onabort = function() {
							this.imgloadreason = 'abort';
							console.log('abort img:', this);
							this.deferred.resolve('abort');
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.onerror = function() {
							this.imgloadreason = 'not-img';
							console.log('error img:', this);
							this.deferred.resolve('not-img');
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.src = aPartialImgObj[i];
						promiseAllArr_loadImgs.push(cPathKeyImgObj[aPartialImgObj[i]].deferred.promise);
					}
					var promiseAll_loadImgs = Promise.all(promiseAllArr_loadImgs);
					promiseAll_loadImgs.then(
						function(aVal) {
							console.log('Fullfilled - promiseAll_loadImgs - ', aVal);
							// check if duplicate sizes
							
							// create cImgObj
							var dupeSize = {}; // key is size, value is array of img src's having same size
							var notSquare = []; // array of paths not having square sizes
							var cImgObj = {};
							for (var imgSrcPath in cPathKeyImgObj) {
								var cPKImgEntry = cPathKeyImgObj[imgSrcPath]
								var cSize = cPKImgEntry.size;
								if (cSize in cImgObj) {
									if (!(cSize in dupeSize)) {
										dupeSize[cSize] = [
											cImgObj[cSize]
										];
									}
									dupeSize[cSize].push(imgSrcPath);
								}
								if (cPKImgEntry.imgloadreason == 'not-square') {
									notSquare.push({
										src: imgSrcPath,
										w: cPKImgEntry.img.naturalWidth,
										h: cPKImgEntry.img.naturalHeight
									});
								}
								if (cPKImgEntry.imgloadreason == 'not-img') {
									// this doesnt happen right now
								}
								if (cPKImgEntry.imgloadreason == 'abort') {
									// this should never happen
								}
								cImgObj[cPathKeyImgObj[imgSrcPath].size] = imgSrcPath;
							}
							
							var errObj = {};
							if (notSquare.length) {
								errObj.notSquare = notSquare;
							}
							if (Object.keys(dupeSize).length) {
								errObj.dupeSize = dupeSize;
							}
							if (Object.keys(errObj).length > 0) {
								IPStore.setState({
									sPreview: {
										path: a_cDirSelected,
										errObj: errObj
									}
								});
							} else {
								IPStore.setState({
									sPreview: {
										path: a_cDirSelected,
										imgObj: cImgObj
									}
								});
							}
						} // no need for reject as i never reject any of the this.deferred
					).catch(
						function(aCaught) {
							var rejObj = {
								name: 'promiseAll_loadImgs',
								aCaught: aCaught
							};
							console.error('Caught - promiseAll_loadImgs - ', rejObj);
						}
					);
				} else {
					// if profilist_github (meaning /Noitidart/Firefox-PNG-Icon-Collections) then it also returns a full imgObj
					var aImgObj = aErrorOrImgObj;
					console.log('got aImgObj:', aImgObj);
					IPStore.setState({
						sPreview: {
							path: a_cDirSelected,
							imgObj: aImgObj
						}
					});
				}
			}
		});
	},
	component: {
		IconsetPicker: React.createClass({
			displayName: 'IconsetPicker',
			getInitialState: function() {
				return {
					sInit: false,
					sSelected: false, // set to true when user clicks select
					sNavSelected: 'saved', // null/undefined means nothing, this is string, saved, browse, download
					sNavItems: ['saved', 'browse', 'download'], // array of strings
					sDirPlatPath: null, // current dir displaying in .iconsetpicker-dirlist
					sDirSubdirs: null, // if null a loading image is shown, else it is an array
					sDirSelected: this.props.pDirSelected, // null means no selection. if not null, then it is full plat path of the dir selected
					sPreview: null, // if null and sDirSelected is not null, then its "loading". ELSE object, two keys, "path" which is plat path to directory, AND (imgobj OR partialimgobj. imgobj which is what you expect an imgobj to be, keys are sizes, and values are strings you can put in img src. partial is just array of strings, as sizes are unknown (guranteed to be gif, jpeg, jpg, or png though)
					sDirListHistory: [], // array of visits for back and forward
					sAppliedSlugDir: this.props.pAppliedSlugDir // chrome or plat path to the slug dir, if thi is set then unselect_callback can be called
				}
			},
			componentDidMount: function() {
				IPStore.setState = this.setState.bind(this); // need bind here otherwise it doesnt work
				setTimeout(function() {
					this.setState({sInit:true});
					
					IPStore.readSubdirsInDir('profilist_user_images', null, []);
				}.bind(this), 0);
				document.addEventListener('keypress', this.keypress, true); // i use capturing because on bubble i listen to escape to clear out the text filter in html.js. so this escape will prevent it from clearing that filter
			},
			componentWillUnmount: function() {
				document.removeEventListener('keypress', this.keypress, true);
			},
			componentDidUpdate: function(aPrevPropsObj, aPrevStateObj) {
				console.error('componentDidUpdate! and prevAndNowStateObj:', {prev:aPrevStateObj, now:this.state});
				// check if pref state sPreview had imgObj and if imgObj has blob urls. if true then -- check if sPreview is now changed, if it is then tell worker to revokeObjectURL on those blob urls
				if (aPrevStateObj.sPreview && typeof(aPrevStateObj.sPreview) != 'string' && aPrevStateObj.sPreview.imgObj) {
					var urlsInPrevState = [];
					var urlsInPrevAreBlobs = false;
					for (var aSize in aPrevStateObj.sPreview.imgObj) {
						var cUrl = aPrevStateObj.sPreview.imgObj[aSize];
						urlsInPrevState.push(cUrl);
						if (cUrl.indexOf('blob:') === 0) {
							urlsInPrevAreBlobs = true;
						}
					}
					console.log('urlsInPrevState:', urlsInPrevState);
					if (urlsInPrevAreBlobs) {
						console.log('yes there are blobs in prev state, check if those urls are no longer being shown, if they are not then release from worker');
						// i dont simply revoke the url here, because im holding onto to the blobs in global space over in worker
						
						var needToReleaseOldImgObj = false;
						
						// test if needToReleaseOldImgObj should be set to true
						if (aPrevStateObj.sInit && !this.state.sInit) {
							console.log('sInit was set to false, so is unmounting, so release them blobs if user DID NOT select');
							if (!this.state.sSelected) {
								console.error('did not do select so make sure to RELEASE');
								needToReleaseOldImgObj = true;
							} else {
								console.error('did do select so DONT release');
							}
						} else if (!this.state.sPreview) {
							console.log('now sPreview is null, so release those blobs');
							needToReleaseOldImgObj = true;
						} else if (typeof(this.state.sPreview) == 'string') {
							console.log('now sPreview is a string, so no more imgObj so release those blobs');
							needToReleaseOldImgObj = true;
						} else if (typeof(this.state.sPreview) == 'object') {
							if (!this.state.sPreview.imgObj) {
								console.log('now sPreview has no imgObj anymore so release those blobs');
								needToReleaseOldImgObj = true;
							} else {
								// check if new urls are same, if they are then do nothing

								var urlsInNowState = [];
								for (var aSize in this.state.sPreview.imgObj) {
									var cUrl = this.state.sPreview.imgObj[aSize];
									urlsInNowState.push(cUrl);
								}
								console.log('urlsInNowState:', urlsInNowState);
								
								for (var i=0; i<urlsInPrevState.length; i++) {
									if (urlsInNowState.indexOf(urlsInPrevState[i]) == -1) {
										console.log('old url not found in new urls, old url:', urlsInPrevState[i]);
										needToReleaseOldImgObj = true;
										break;
									}
								}
							}
						} else {
							console.error('should never ever ever get here');
						}
						
						if (needToReleaseOldImgObj) {
							console.log('ok releeasing old obj urls');
							sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['releaseBlobsAndUrls', urlsInPrevState]], bootstrapMsgListener.funcScope, function(aErrorOrImgObj) {
								console.error('ok back from releaseBlobsAndUrls. so now in framescript');
							});
						}
					} else {
						console.log('no blob urls in previous so no need to worry about checking if its time to release');
					}
				}
				

				if (!aPrevStateObj.sInit && this.state.sInit == true && this.props.pAppliedSlugDir) {
					// if pAppliedSlugDir is set, then pDirSelected has to be set its a given
					var readImgsInDirArg = {profilist_imgslug:getSlugOfSlugDirPath(this.props.pAppliedSlugDir)}; // link999
					IPStore.readImgsInDir(readImgsInDirArg, this.props.pDirSelected);
				}
			},
			keypress: function(e) {
				if (this.state.sInit) { // because i have react animation, it is not unmounted till after anim. but i want to not listen to keypresses as soon as sInit goes to false
					switch (e.key) {
						case 'Escape':
								
								// alert('in esc');
								// alert('calling uninit');
								this.props.uninit();
								e.stopPropagation();
								e.preventDefault();
								
							break;
						case 'Backspace':
							
								// alert('in bs');
								if (this.state.sDirListHistory.length >= 2) {
									// go back block - link1212333333
									this.state.sDirListHistory.pop();
									IPStore.readSubdirsInDir(this.state.sDirListHistory.pop(), true, this.state.sDirListHistory);
								}
								e.stopPropagation();
								e.preventDefault();
								
							break;
						default:
							// do nothing
					}
				}
			},
			render: function() {
				// props
				//	uninit
				//	select_callback
				//	pDirSelected
				//	pAppliedSlugDir
				return React.createElement(React.addons.CSSTransitionGroup, {transitionName:'iconsetpicker-initanim', transitionEnterTimeout:200, transitionLeaveTimeout:200, className:'iconsetpicker-animwrap'},
					!this.state.sInit ? undefined : React.createElement('div', {className:'iconsetpicker-subwrap'},
						React.createElement(IPStore.component.IPArrow),
						React.createElement(IPStore.component.IPContent, {sNavSelected:this.state.sNavSelected, sNavItems:this.state.sNavItems, sDirSubdirs:this.state.sDirSubdirs, sDirSelected:this.state.sDirSelected, sPreview:this.state.sPreview, sDirListHistory:this.state.sDirListHistory, uninit:this.props.uninit, select_callback:this.props.select_callback, sAppliedSlugDir:this.state.sAppliedSlugDir, unselect_callback:this.props.unselect_callback})
					)
				);
			}
		}),
		IPArrow: React.createClass({
			displayName: 'IPArrow',
			render: function() {
				return React.createElement('div', {className:'iconsetpicker-arrow'},
					React.createElement('div', {className:'iconsetpicker-arrow-filler'})
				);
			}
		}),
		IPContent: React.createClass({
			displayName: 'IPContent',
			render: function() {
				// props
				//	sNavSelected
				//	sNavItems
				//	sDirSubdirs
				// 	sDirSelected
				//	sPreview
				//	sDirListHistory
				//	uninit
				//	select_callback
				//	sAppliedSlugDir
				//	unselect_callback
				
				return React.createElement('div', {className:'iconsetpicker-content'},
					React.createElement(IPStore.component.IPNav, {sNavSelected:this.props.sNavSelected, sNavItems:this.props.sNavItems, sDirListHistory:this.props.sDirListHistory}),
					React.createElement(IPStore.component.IPRight, {sNavSelected:this.props.sNavSelected, sDirSubdirs:this.props.sDirSubdirs, sDirSelected:this.props.sDirSelected, sPreview:this.props.sPreview, sDirListHistory:this.props.sDirListHistory, uninit:this.props.uninit, select_callback:this.props.select_callback, sAppliedSlugDir:this.props.sAppliedSlugDir, unselect_callback:this.props.unselect_callback})
				);
			}
		}),
		IPNav: React.createClass({
			displayName: 'IPNav',
			render: function() {
				// props
				//	sNavSelected
				//	sNavItems
				//	sDirListHistory
				
				var cChildren = []
				for (var i=0; i<this.props.sNavItems.length; i++) {
					var cChildProps = {
						sNavItem: this.props.sNavItems[i],
						sDirListHistory: this.props.sDirListHistory
					};
					if (this.props.sNavSelected == this.props.sNavItems[i]) {
						cChildProps.selected = true;
					}
					cChildren.push(React.createElement(IPStore.component.IPNavRow, cChildProps));
					
					// if this is browse and it is selected, show the quicklist
					cChildren.push(React.createElement(React.addons.CSSTransitionGroup, {component:'div', className:'iconsetpicker-browsequicklist-animwrap', transitionName:'iconsetpicker-quicklist', transitionEnterTimeout:200, transitionLeaveTimeout:200},
						!(cChildProps.sNavItem == 'browse' && cChildProps.selected) ? undefined : React.createElement('div', {className:'iconsetpicker-browsequicklist'},
							React.createElement('div', {onClick:IPStore.readSubdirsInDir.bind(null, 'desktop', true, this.props.sDirListHistory)},
								myServices.sb_ip.GetStringFromName('desktop')
							),
							React.createElement('div', {onClick:IPStore.readSubdirsInDir.bind(null, 'pictures', true, this.props.sDirListHistory)},
								myServices.sb_ip.GetStringFromName('pictures')
							),
							React.createElement('div', {onClick:IPStore.readSubdirsInDir.bind(null, 'downloads', true, this.props.sDirListHistory)},
								myServices.sb_ip.GetStringFromName('downloads')
							),
							React.createElement('div', {onClick:IPStore.readSubdirsInDir.bind(null, 'documents', true, this.props.sDirListHistory)},
								myServices.sb_ip.GetStringFromName('documents')
							)
						)
					));
				}
				
				return React.createElement('div', {className:'iconsetpicker-nav'},
					cChildren
				);
			}
		}),
		IPNavRow: React.createClass({
			displayName: 'IPNavRow',
			click: function() {
				var newState = {
					sNavSelected: this.props.sNavItem,
					sDirSubdirs: null,
					sDirSelected: null,
					sPreview: null
				};
				
				if (!this.props.selected /* && this.props.sNavSelected != this.props.sNavItem*/) {
					// user is switching categories so reset history
					newState.sDirListHistory = [];
				} else {
					newState.sDirListHistory = this.props.sDirListHistory;
				}
				IPStore.setState(newState);
				switch (this.props.sNavItem) {
					case 'saved':
					
							IPStore.readSubdirsInDir('profilist_user_images', null, newState.sDirListHistory);
						
						break;
					case 'browse':
					
							IPStore.readSubdirsInDir('home', null, newState.sDirListHistory);
						
						break;
					case 'download':
					
							IPStore.readSubdirsInDir('profilist_github', null, newState.sDirListHistory);
						
						break;
					default:
						throw new Error('unknown sNavItem dont know what to readSubdirsInDir on');
				}
			},
			render: function() {
				// props
				//	sNavItem
				//	selected - availble only if this is currently selected, if it is then this is true
				//	sDirListHistory
				
				var cProps = {
					className: 'iconsetpicker-navrow',
					onClick: this.click
				};
				if (this.props.selected) {
					cProps.className += ' iconsetpicker-selected';
				}
				
				return React.createElement('div', cProps,
					myServices.sb_ip.GetStringFromName(this.props.sNavItem)
				);
			}
		}),
		IPRight: React.createClass({
			displayName: 'IPRight',
			render: function() {
				// props
				//	sNavSelected
				//	sDirSubdirs
				//	sDirSelected
				//	sPreview
				//	sDirListHistory
				//	uninit
				//	select_callback
				//	sAppliedSlugDir
				//	unselect_callback
				
				var cProps = {
					className: 'iconsetpicker-right'
				};
				
				return React.createElement('div', cProps,
					React.createElement(IPStore.component.IPRightTop, {sDirSubdirs:this.props.sDirSubdirs, sDirSelected:this.props.sDirSelected, sPreview:this.props.sPreview, sNavSelected:this.props.sNavSelected, sDirListHistory:this.props.sDirListHistory}),
					React.createElement(IPStore.component.IPControls, {sNavSelected:this.props.sNavSelected, sDirListHistory:this.props.sDirListHistory, sPreview:this.props.sPreview, sDirSelected:this.props.sDirSelected, uninit:this.props.uninit, select_callback:this.props.select_callback, sAppliedSlugDir:this.props.sAppliedSlugDir, unselect_callback:this.props.unselect_callback, sDirSubdirs:this.props.sDirSubdirs},
						'controls'
					)
				);
			}
		}),
		IPControls: React.createClass({
			displayName: 'IPControls',
			clickBack: function() {
				if (this.props.sDirListHistory.length >= 2) {
					// go back block - link1212333333
					this.props.sDirListHistory.pop();
					IPStore.readSubdirsInDir(this.props.sDirListHistory.pop(), true, this.props.sDirListHistory);
				}
			},
			clickSelect: function() {
					// this.state.sPreview.imgObj must be valid (gui disables button if it is not valid)
					// setTimeout(function() { // :debug: wrapping in setTimeout to test if it will work after uninit has been called. im worried this.props might be dead, not sure ----- results of test, yes it worked, which makes wonder when does it get gc'ed, how does it know? interesting stuff. i would think on unmount this object is destroyed
						sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['saveAsIconset', this.props.sPreview.imgObj]], bootstrapMsgListener.funcScope, function(aImgSlug, aImgObj) {
							console.error('ok back from saveAsIconset. so now in framescript');
							if (this.props.select_callback) {
								this.props.select_callback(aImgSlug, aImgObj);
							}
						}.bind(this));
					// }.bind(this), 2000);
				this.props.uninit(null, true);
			},
			clickUnselect: function() {
				if (this.props.unselect_callback) {
					IPStore.setState({
						sAppliedSlugDir: null
					});
					this.props.unselect_callback();
				}
			},
			clickDelete: function() {
				var cImgSlug = getSlugOfSlugDirPath(this.props.sDirSelected);
				
				// premptively remove from gui
				var new_sDirSubdirs = this.props.sDirSubdirs.filter(function(aElVal) {
					return aElVal.path != this.props.sDirSelected;
				}.bind(this));
				console.log('new_sDirSubdirs:', new_sDirSubdirs);

				IPStore.setState({
					sPreview: null,
					sDirSelected: null,
					sDirSubdirs: new_sDirSubdirs
				});
					
				sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['deleteIconset', cImgSlug]], bootstrapMsgListener.funcScope, function(aImgSlug, aImgObj) {
					console.error('ok back from deleteIconset. so now in framescript');
				});
			},
			render: function() {
				// props
				//	sNavSelected
				//	sDirListHistory
				//	sPreview
				//	sDirSelected
				//	uninit
				//	select_callback
				//	sAppliedSlugDir
				//	unselect_callback
				//	sDirSubdirs
				
				var cProps = {
					className: 'iconsetpicker-controls'
				};
				
				var cChildren = [];
				
				var disableApply = false; // only set this to true in the logic below. dont set it to true then somewhere else to false, because then only the last one to set it to a bool will apply
				switch (this.props.sNavSelected) {
					case 'saved':
						
							// saved
							
							var disbleRenameDelete = false;
							if (!this.props.sDirSelected) {
								disbleRenameDelete = true;
							} else if (this.props.sDirSelected.indexOf('chrome://profilist/content/resources/images/channel-iconsets/') > -1) {
								disbleRenameDelete = true;
							}
							
							// cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('rename'), disabled:((disbleRenameDelete) ? true : false)}));
							cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('delete'), disabled:((disbleRenameDelete) ? true : false), onClick:this.clickDelete}));
							if (this.props.sAppliedSlugDir && this.props.sDirSelected && this.props.sAppliedSlugDir == this.props.sDirSelected) {
								disableApply = true;
								cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('unselect'), onClick:this.clickUnselect}));
							}
							
						
						break;
					case 'browse':
						
							// browse
							cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('back'), disabled:((this.props.sDirListHistory.length < 2) ? true : false), onClick:this.clickBack}));
							// cChildren.push(React.createElement('input', {type:'button', value:'Forward'}));
							// cChildren.push(React.createElement('input', {type:'button', value:'Up'}));
						
						break;
					case 'download':
						
							// download
							cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('back'), disabled:((this.props.sDirListHistory.length < 2) ? true : false), onClick:this.clickBack}));
						
						break;
					default:
						// assume nothing is selected
				}
				
				if (!this.props.sPreview || !this.props.sPreview.imgObj) {
					disableApply = true;
				}
				
				cChildren.push(React.createElement('div', {style:{flex:'1 0 auto'}})); // spacer, to keep the cancel/ok buttons on far right
				cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('cancel'), onClick:this.props.uninit}));
				cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('select'), disabled:(disableApply ? true : false), onClick:this.clickSelect}));
				
				// return React.createElement.apply(this, ['div', cProps].concat(inner));
				return React.createElement('div', cProps,
					cChildren
				);
			}
		}),
		IPRightTop: React.createClass({
			displayName: 'IPRightTop',
			render: function() {
				// props
				//	sDirSubdirs
				//	sDirSelected
				//	sPreview
				//	sNavSelected
				//	sDirListHistory

				var cProps = {
					className: 'iconsetpicker-righttop'
				};
				
				return React.createElement('div', cProps,
					React.createElement(IPStore.component.IPDirList, {sDirSubdirs:this.props.sDirSubdirs, sDirSelected:this.props.sDirSelected, sNavSelected:this.props.sNavSelected, sDirListHistory:this.props.sDirListHistory}),
					React.createElement(IPStore.component.IPPreview, {sDirSelected:this.props.sDirSelected, sPreview:this.props.sPreview})
				);
			}
		}),
		IPDirList: React.createClass({
			displayName: 'IPDirList',
			render: function() {
				// props
				//	sDirSubdirs
				//	sDirSelected
				//	sNavSelected
				//	sDirListHistory
				
				var cProps = {
					className: 'iconsetpicker-dirlist'
				};
				
				var cChildren = [];
				
				if (!this.props.sDirSubdirs) {
					cChildren.push(React.createElement('img', {src:core.addon.path.images + 'cp/iconsetpicker-loading.gif'}));
				} else if (this.props.sDirSubdirs == 'error') {
					cChildren.push(React.createElement('span', {},
						myServices.sb_ip.GetStringFromName('failed-read')
					));
				} else {
					if (!this.props.sDirSubdirs.length) {
						cChildren.push(React.createElement('span', {},
							myServices.sb_ip.GetStringFromName('no-dirs')
						));
					} else {
						for (var i=0; i<this.props.sDirSubdirs.length; i++) {
							cChildren.push(React.createElement(IPStore.component.IPDirEntry, {name:this.props.sDirSubdirs[i].name, path:this.props.sDirSubdirs[i].path, selected:(this.props.sDirSelected != this.props.sDirSubdirs[i].path ? undefined : true), sNavSelected:this.props.sNavSelected, sDirListHistory:this.props.sDirListHistory}));
						}
					}
				}
				
				return React.createElement('div', cProps,
					cChildren
				);
			}
		}),
		IPPreview: React.createClass({
			displayName: 'IPPreview',
			render: function() {
				// props
				//	sDirSelected
				//	sPreview
				
				var cProps = {
					className: 'iconsetpicker-preview'
				};
				
				var cChildren = [];
				
				if (!this.props.sDirSelected) {
					cChildren.push(React.createElement('span', {},
						myServices.sb_ip.GetStringFromName('preview-desc')
					));
				} else {
					if (!this.props.sPreview) {
						// loading
						cChildren.push(React.createElement('img', {src:core.addon.path.images + 'cp/iconsetpicker-loading.gif'}));
					} else {
						console.log('this.props.sPreview:', this.props.sPreview);
						if (typeof(this.props.sPreview) == 'string') {
							var previewTxt = myServices.sb_ip.GetStringFromName(this.props.sPreview);
							cChildren.push(React.createElement('span', {},
								previewTxt
							));
						} else if (this.props.sPreview.path == this.props.sDirSelected) {
							if (this.props.sPreview.errObj) {
								var errObj = this.props.sPreview.errObj;
								var errChildren = [];
								
								errChildren.push(React.createElement('h4', {},
									myServices.sb_ip.GetStringFromName('invalid-img-dir')
								));
								
								if (errObj.dupeSize) {
									var dupeSize = errObj.dupeSize;
									var allSizesUls = [];
									
									for (var aSize in dupeSize) {
										var sizeLis = [];
										
										for (var i=0; i<dupeSize[aSize].length; i++) {
											sizeLis.push(React.createElement('li', {},
												React.createElement('a', {href:dupeSize[aSize][i], target:'_blank'},
													dupeSize[aSize][i].substr(dupeSize[aSize][i].lastIndexOf('/') + 1)
												)
											));
										}
										
										var sizeUl = React.createElement('ul', {},
											React.createElement('li', {},
												justFormatStringFromName(myServices.sb_ip.GetStringFromName('dimensions-no-dash'), [aSize, aSize]),
												React.createElement('ul', {},
													sizeLis
												)
											)
										);
										
										allSizesUls.push(sizeUl);
									}
									
									var topUl = React.createElement('ul', {},
										React.createElement('li', {},
											justFormatStringFromName(myServices.sb_ip.GetStringFromName('dupe-sizes-err')),
											allSizesUls
										)
									);
									
									errChildren.push(topUl);
								}
						
								if (errObj.notSquare) {
									var notSquare = errObj.notSquare;
									
									var sizeLis = [];
									
									for (var i=0; i<notSquare.length; i++) {
										sizeLis.push(React.createElement('li', {},
											justFormatStringFromName(myServices.sb_ip.GetStringFromName('dimensions'), [notSquare[i].w, notSquare[i].h]) + ' ',
											React.createElement('a', {href:notSquare[i].src, target:'_blank'},
												notSquare[i].src.substr(notSquare[i].src.lastIndexOf('/') + 1)
											)
										));
									}
									
									var topUl = React.createElement('ul', {},
										React.createElement('li', {},
											justFormatStringFromName(myServices.sb_ip.GetStringFromName('not-square-err')),
											React.createElement('ul', {},
												sizeLis
											)
										)
									);
									
									errChildren.push(topUl);
								}
								
								cChildren.push(React.createElement('div', {className:'iconsetpicker-preview-errobj'},
									errChildren
								));
								
							} else {
								for (var aSize in this.props.sPreview.imgObj) {
									cChildren.push(React.createElement(IPStore.component.IPPreviewImg, {size:aSize, src:this.props.sPreview.imgObj[aSize]}));
								}
							}
						} else {
							// sDirSelected differs
							// show preview-desc
							// really shouldnt get here though. as if sDirSelected changes, then sPreview should be null'ed
							cChildren.push(React.createElement('span', {},
								myServices.sb_ip.GetStringFromName('preview-desc')
							));
						}
					}
				}
				
				return React.createElement('div', cProps,
					cChildren
				);
			}
		}),
		IPPreviewImg: React.createClass({
			displayName: 'IPPreviewImg',
			render: function() {
				// props
				//	src
				//	size
				
				var cImgProps = {
					src: this.props.src
				};
				
				var cssVal = {
					'.iconsetpicker-preview-img': 64 // match to cross-file-link881711729404
				};
				if (this.props.size > cssVal['.iconsetpicker-preview-img']) {
					cImgProps.width = cssVal['.iconsetpicker-preview-img'];
				}
				
				return React.createElement('div', {className:'iconsetpicker-preview-img', 'data-size':this.props.size + ' x ' + this.props.size},
					React.createElement('img', cImgProps)
				);
			}
		}),
		IPDirEntry: React.createClass({
			displayName: 'IPDirEntry',
			click: function() {
				
				if (this.props.selected) {
					console.log('already selected, so dont do anything'); // on subdirs, clicking again should do nothing (currently i allow clicking again on main IPNavRow)
					return;
				}
				if (this.props.sNavSelected == 'download' && this.props.name.indexOf(' - Collection') > -1 && this.props.name.indexOf(' - Collection') == this.props.name.length - ' - Collection'.length) {
					console.log('this.props of dbl clickable:', this.props);
					if (!this.props.selected) {
						IPStore.setState({
							sDirSelected: this.props.path,
							sPreview: 'error-noimgs'
						});
					}
				} else {
					if (!this.props.selected) {
						IPStore.setState({
							sDirSelected: this.props.path,
							sPreview: null
						});
					}
					
					var cDirSelected = this.props.path;
					var readImgsInDirArg;
					if (this.props.path.indexOf('chrome:') === 0 || this.props.path.indexOf(core.profilist.path.images) === 0) {
						readImgsInDirArg = {profilist_imgslug:this.props.name}; // link999
					} else {
						readImgsInDirArg = this.props.path;
					}
					IPStore.readImgsInDir(readImgsInDirArg, cDirSelected);
				}
			},
			dblclick: function() {
				// :todo: highlight this entry if this is in "saved" --- what the hell does this mean? i dont know i wrote it here before
				
				// if its not a chrome path, then open the dir
				// if (this.props.path.indexOf('chrome:') == -1 && ) {
					
				// is it double clickable?
				if (this.props.sNavSelected == 'browse' || (this.props.sNavSelected == 'download' && this.props.name.indexOf(' - Collection') > -1 && this.props.name.indexOf(' - Collection') == this.props.name.length - ' - Collection'.length)) {
					// yes its double clickable
					IPStore.readSubdirsInDir(this.props.path, true, this.props.sDirListHistory);
				} else {
					// no its not
				}
			},
			componentDidMount: function() {
				if (this.props.selected) {
					// because this is in mount, and only way for something to already be selected before mounting, is if sAppliedSlugDir was set to this.props.path.... meaning this only triggers once aH this is what i wanted
					ReactDOM.findDOMNode(this).scrollIntoView(false);
				}
			},
			render: function() {
				// props
				//	name
				//	path
				//	selected - only if this is selected
				//	sNavSelected
				//	sDirListHistory
				var cProps = {
					className: 'iconsetpicker-direntry',
					onClick: this.click,
					onDoubleClick: this.dblclick
				};
				
				if (this.props.selected) {
					cProps.className += ' iconsetpicker-selected';
				}
				
				// is it double clickable?				
				if (this.props.sNavSelected == 'browse' || (this.props.sNavSelected == 'download' && this.props.name.indexOf(' - Collection') > -1 && this.props.name.indexOf(' - Collection') == this.props.name.length - ' - Collection'.length)) {
					// yes its double clickable
				} else {
					// no its not
					cProps.className += ' iconsetpicker-iconsetentry';
				}
				
				return React.createElement('div', cProps,
					this.props.name
				);
			}
		})
	}
};
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

function getSpecificnessForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// only for use on non-ONLY values. meaning if key is specificOnly or unspecificOnly it fails, no need to use this function to determine that
	// RETURNS
		// 1 for specific
		// 2 for unspecific
		
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); throw new Error('DEV_ERROR'); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	if (gKeyInfoStore[aKeyName].unspecificOnly || gKeyInfoStore[aKeyName].specificOnly) { console.error('DEV_ERROR - aKeyName is ONLY-like, aKeyName:', aKeyName, 'see gKeyInfoStore entry it is either unspecificOnly or specificOnly, dont use this function to determine that:', gKeyInfoStore[aKeyName]); throw new Error('DEV_ERROR'); }
	
	// :note: :important: this is my determining factor for specificness of non-only pref-like's - if key exists in aGenIniEntry then it is unspecific. because of this its important to clear out genearl when going to specific. link757483833
	if (!(aKeyName in aGenIniEntry) && !(aKeyName in aIniEntry)) {
		// use defaultSpecificness
		if (!gKeyInfoStore[aKeyName].defaultSpecificness) {
			// its unspecific
			return 2;
		} else {
			// its specific
			return 1;
		}
	} else {
		if (aKeyName in aGenIniEntry) {
			// it is unspecific
			return 2;
		} else if (aKeyName in aIniEntry) {
			// it is specific
			return 1;
		}
		console.error('DEV_ERROR - should never ever get here');
		throw new Error('DEV_ERROR - should never ever get here');
	}
	
}

function setPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName, aNewVal, aNewSpecifincess_optional, aIniObj_neededWhenTogglignSpecificness) {
	// aNewSpecifincess_optional is optional arg, if not supplied specificness is unchanged. it must be 2 for unspecific or 1 for specific
	// aIniEntry and aGenIniEntry must be PASSED BY REFERENCE to the ini obj you want to set in // im thinking it HAS to be gIniObj, so far thats all im doing and it makes sense as i then setState to JSON.parse(JSON.stringify(gIniObj)
	
	// RETURNS
	//	undefined
	
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); throw new Error('DEV_ERROR'); throw new Error('DEV_ERROR'); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	if (aNewSpecifincess_optional !== undefined && (gKeyInfoStore[aKeyName].unspecificOnly || gKeyInfoStore[aKeyName].specificOnly)) { console.error('DEV_ERROR - aKeyName is unspecific ONLY or specific ONLY, therefore you cannot pass a aNewSpecifincess_optional, aNewSpecifincess_optional:', aNewSpecifincess_optional, 'gKeyInfoStore[aKeyName]:', gKeyInfoStore[aKeyName]); throw new Error('DEV_ERROR'); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
	// LOGIC
	// if gKeyInfoStore[aKeyName].unspecificOnly
		// set in aGenIniEntry
	// else if gKeyInfoStore[aKeyName].specificOnly
		// set in aIniEntry
	// else
		// macro: figure out specificness from aIniEntry and aGenIniEntry - if key exists in aGenIniEntry then it is unspecific
		// if macroIsSpecific
			// set in aIniEntry
		// else
			// set in aGenIniEntry
		
	if (gKeyInfoStore[aKeyName].unspecificOnly) {
		aGenIniEntry[aKeyName] = aNewVal;
		console.log('set unspecificOnly', 'key:', aKeyName, 'aGenIniEntry:', aGenIniEntry);
	} else if (gKeyInfoStore[aKeyName].specificOnly) {
		aIniEntry[aKeyName] = aNewVal;
		console.log('set specificOnly', 'key:', aKeyName, 'aIniEntry:', aIniEntry);
	} else {
		// figure out specificness
		var specificness;
		if (aNewSpecifincess_optional !== undefined) {
			if (aNewSpecifincess_optional !== 1 && aNewSpecifincess_optional !== 2) { console.error('DEV_ERROR - aNewSpecifincess_optional must be 1 or 2! you set it to:', aNewSpecifincess_optional); throw new Error('DEV_ERROR'); }
			// assume that its changing, SO 1)if going to specific, then clear out the general 2)if going to general, then clear out specific, but clearing out specific is not so important per link757483833
			specificness = aNewSpecifincess_optional;
		} else {
			specificness = getSpecificnessForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName);
		}
		if (specificness == 2) {
			// it is unspecific
			if (aNewSpecifincess_optional !== undefined) {
				// because aNewSpecifincess_optional is set, i assume its toggling thus it follows that... see comment on line below
				// if going to unspecific, then clearing out the specific values is not important, but its good practice per link757483833
				if (!aIniObj_neededWhenTogglignSpecificness) { console.error('DEV_ERROR, as toggling away from specific, meaning going to unspecific, i need the aIniObj so i can clear out the specific values for good practice, you as a dev did not provide this aIniObj!'); throw new Error('DEV_ERROR'); }
				for (var p in aIniObj_neededWhenTogglignSpecificness) {
					if (aIniObj_neededWhenTogglignSpecificness[p].Path) {
						delete aIniObj_neededWhenTogglignSpecificness[p][aKeyName]
					}
				}
			}
			aGenIniEntry[aKeyName] = aNewVal;
			console.log('set unspecific calcd', 'key:', aKeyName, 'aGenIniEntry:', aGenIniEntry);
		} else {
			// it is specific
			if (aNewSpecifincess_optional !== undefined) {
				// because aNewSpecifincess_optional is set, i assume its toggling thus it follows that... see comment on line below
				// if going to specific, then clear out the general this is :note: :important: link757483833
				delete aGenIniEntry[aKeyName];
			}
			aIniEntry[aKeyName] = aNewVal;
			console.log('set specific calcd', 'key:', aKeyName, 'aIniEntry:', aIniEntry);
		}
	}
}	

function getPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	
	if (!(aKeyName in gKeyInfoStore)) { console.error('DEV_ERROR - aKeyName does not exist in gKeyInfoStore, aKeyName:', aKeyName); throw new Error('DEV_ERROR'); } // console message intentionaly on same line with if, as this is developer error only so on release this is removed
	
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
// end - xIniObj functions with no options
// END - COMMON PROFILIST HELPER FUNCTIONS
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