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

function doOnBeforeUnload() {

	contentMMFromContentWindow_Method2(window).removeMessageListener(core.addon.id, bootstrapMsgListener);

}

function doOnContentLoad() {
	console.log('in doOnContentLoad');
	initPage();
}

document.addEventListener('DOMContentLoaded', doOnContentLoad, false);
window.addEventListener('beforeunload', doOnBeforeUnload, false);

// End - DOM Event Attachments
// Start - Page Functionalities
function initPage(isReInit) {
	// if isReInit then it will skip some stuff
	
	console.log('in init');
	
	// get core and config objs
	sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['fetchCoreAndConfigs'], bootstrapMsgListener.funcScope, function(aObjs) {
		console.log('got core and configs:', aObjs);
		core = aObjs.aCore;
		gIniObj = aObjs.aIniObj;
		gKeyInfoStore = aObjs.aKeyInfoStore;
		
		initReactComponent();
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
			{
				label: myServices.sb.GetStringFromName('profilist.cp.updates'),
				id: 'updates',
				type: 'select',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.off'),
					1: myServices.sb.GetStringFromName('profilist.cp.on')
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.notif'),
				desc: myServices.sb.GetStringFromName('profilist.cp.notif-desc'),
				type: 'select',
				key: 'ProfilistNotif',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.disabled'),
					1: myServices.sb.GetStringFromName('profilist.cp.enabled')
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.launch'),
				desc: myServices.sb.GetStringFromName('profilist.cp.launch-desc'),
				type: 'select',
				key: 'ProfilistLaunch',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.enabled'),
					1: myServices.sb.GetStringFromName('profilist.cp.disabled')
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.sort'),
				desc: myServices.sb.GetStringFromName('profilist.cp.sort-desc'),
				type: 'select',
				key: 'ProfilistSort',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.created'),
					2: myServices.sb.GetStringFromName('profilist.cp.alphanum'),
					// 0: myServices.sb.GetStringFromName('profilist.cp.created-asc'),
					// 1: myServices.sb.GetStringFromName('profilist.cp.created-desc'),
					// 2: myServices.sb.GetStringFromName('profilist.cp.alphanum-asc'),
					// 3: myServices.sb.GetStringFromName('profilist.cp.alphanum-desc')
				}
			},
			{
				label: myServices.sb.GetStringFromName('profilist.cp.dev'),
				desc: myServices.sb.GetStringFromName('profilist.cp.dev-desc'),
				type: 'select',
				key: 'ProfilistDev',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.disabled'),
					1: myServices.sb.GetStringFromName('profilist.cp.enabled')
				}
			}
		]
	},
	{
		section: myServices.sb.GetStringFromName('profilist.cp.system'),
		rows: [
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
					0: myServices.sb.GetStringFromName('profilist.cp.enabled'),
					1: myServices.sb.GetStringFromName('profilist.cp.disabled')
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
			sIniObj: []
		};
	},
	componentDidMount: function() {
		MyStore.updateStatedIniObj = this.updateStatedIniObj; // no need for bind here else React warns "Warning: bind(): You are binding a component method to the component. React does this for you automatically in a high-performance way, so you can safely remove this call. See Menu"
		MyStore.setState = this.setState.bind(this); // need bind here otherwise it doesnt work
		
		document.addEventListener('keypress', this.onKeyPress, false);
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
			children.push(React.createElement(Section, {gSectionInfo:gDOMInfo[i], sIniObj: this.state.sIniObj, sGenIniEntry: sGenIniEntry, sCurProfIniEntry: sCurProfIniEntry}));
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
		
		var aProps = {
			className: 'section'
		};
		
		var children = [];
		
		// console.log('this.props.gSectionInfo.length:', this.props.gSectionInfo.length);
		children.push(React.createElement('h3', {className:'section-head'},
			this.props.gSectionInfo.section
		));
		
		for (var i=0; i<this.props.gSectionInfo.rows.length; i++) {
			children.push(React.createElement(Row, {gRowInfo:this.props.gSectionInfo.rows[i], sIniObj: this.props.sIniObj, sGenIniEntry: this.props.sGenIniEntry, sCurProfIniEntry: this.props.sCurProfIniEntry}));
		}
		
		return React.createElement('div', aProps,
			children
		);
	}
});
var Row = React.createClass({
    displayName: 'Row',
	render: function render() {
		// props - none
		//	gRowInfo
		//	sIniObj
		//	sCurProfIniEntry
		//	sGenIniEntry
		
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
			console.log('gKeyInfoStore[this.props.gRowInfo.key]:', gKeyInfoStore[this.props.gRowInfo.key]);
			if (!gKeyInfoStore[this.props.gRowInfo.key].unspecificOnly && !gKeyInfoStore[this.props.gRowInfo.key].specificOnly) {
				// alert('this one can be toggled:' + this.props.gRowInfo.key);
				specificnessEl = React.createElement('span', {className:'fontello-icon icon-specificness-toggler'});
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
					} else {
						for (var o in this.props.gRowInfo.values) {
							options.push(
								React.createElement('option', {value:o},
									this.props.gRowInfo.values[o]
								)
							);
						}
					}
					children.push(React.createElement('div', {},
						!specificnessEl ? undefined : specificnessEl,
						React.createElement('select', {},
							options
						)
					));
				
				break;
			case 'custom':
				
					switch (this.props.gRowInfo.key ? this.props.gRowInfo.key : this.props.gRowInfo.id) {
						case 'ProfilistBuilds':
						
								aProps.className += ' row-builds-widget'
								children.push(React.createElement(BuildsWidget, {gRowInfo: this.props.gRowInfo, sIniObj: this.props.sIniObj, sGenIniEntry: this.props.sGenIniEntry, sCurProfIniEntry: this.props.sCurProfIniEntry}));
						
							break;
						default:
							console.error('should never get here ever!');
					}
				
				break;
			default:
			
					////
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
			
			setTimeout(function() {
				this.refs.widget.getDOMNode().classList.remove('builds-widget-indrag');
				MyStore.updateStatedIniObj();
			}.bind(this), 100); //100 is the transition time - cross file link381739311
		} else {
			console.log('no need for update');
			setTimeout(function() {
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
	componentDidMount: function() {
		console.error('mount triggered, document.readyState:', document.readyState);
		// window.addEventListener('load', function(e) {
		// 	alert('loaded, e.target: ' + e.target);
		// }, true);
		// window.addEventListener('load', function(e) {
		setTimeout(function() {

		}.bind(this), 50); // it needs some time for a fresh dom (browser restart to load otherwise the offsetTop's are a bit weird)
		// }.bind(this), true); // must be true, didnt test false, but on document.add to load it needed to be true // i think this is because i need to wait for the stylesheet to load or something, otherwise the offsets are too spaced apart
		// using settimeout method instead, because sometimes page loads so fast, it doesnt get to this mount function before load
	},
	render: function render() {
		// props
		//	sIniObj
		//	gRowInfo
		//	sCurProfIniEntry
		//	sGenIniEntry
		
		var children = [];

		children.push(React.createElement(BuildsWidgetRow, {jProfilistBuildsEntry:'head', sCurProfIniEntry: this.props.sCurProfIniEntry}));

		var keyValBuilds = getPrefLikeValForKeyInIniEntry(this.props.sCurProfIniEntry, this.props.sGenIniEntry, 'ProfilistBuilds');		
		var jProfilistBuilds = JSON.parse(keyValBuilds);
		this.jProfilistBuilds = jProfilistBuilds;
		console.error('jProfilistBuilds:', jProfilistBuilds);
		for (var i=0; i<jProfilistBuilds.length; i++) {
			children.push(React.createElement(BuildsWidgetRow, {jProfilistBuildsEntry:jProfilistBuilds[i], sCurProfIniEntry: this.props.sCurProfIniEntry, ref:'row' + i, dragStart:this.dragStart.bind(this, 'row' + i)}));
		}
		
		children.push(React.createElement(BuildsWidgetRow, {sCurProfIniEntry: this.props.sCurProfIniEntry}));
		
		return React.createElement('div', {className:'builds-widget', onClick:this.click, ref:'widget'},
			children
		);
	}
});
var BuildsWidgetRow = React.createClass({ // this is the non header row
    displayName: 'BuildsWidgetRow',
	clickIcon: function() {
		alert('clicked icon');
	},
	clickPath: function() {
		alert('clicked path');
	},
	clickDel: function() {
		alert('clicked del');
	},
	clickCurProfPath: function() {
		alert('clicked user current profile path');
	},
	render: function render() {
		// props
		//	jProfilistBuildsEntry
		//	sCurProfIniEntry
		//	dragStart
		if (this.props.jProfilistBuildsEntry == 'head') {
			return React.createElement('div', {className:'builds-widget-row'},
				React.createElement('span', {}, myServices.sb.GetStringFromName('profilist.cp.icon')),
				React.createElement('span', {}, myServices.sb.GetStringFromName('profilist.cp.path-to-exe')),
				React.createElement('span', {},
					React.createElement('span', {className:'fontello-icon icon-tools'})
				)
			);
		} else {
			
			if (!this.props.jProfilistBuildsEntry) {
				// its last one
				var imgSrc = core.addon.path.images + 'search.png';
				var textVal = '';
			} else {
				// its content
				var imgSrc = core.addon.path.images + 'channel-iconsets/' + this.props.jProfilistBuildsEntry.i + '/' + this.props.jProfilistBuildsEntry.i + '_16.png';
				var textVal = this.props.jProfilistBuildsEntry.p;
			}
			
			return React.createElement('div', {className:'builds-widget-row'},
				React.createElement('span', {},
					React.createElement('img', {onClick:this.clickIcon, src: imgSrc})
				),
				React.createElement('span', {},
					React.createElement('input', {type:'text', value:textVal})
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
// end - common helper functions