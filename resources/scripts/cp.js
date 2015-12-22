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
				label: myServices.sb.GetStringFromName('profilist.cp.sort'),
				desc: myServices.sb.GetStringFromName('profilist.cp.sort-desc'),
				type: 'select',
				key: 'ProfilistSort',
				values: {
					0: myServices.sb.GetStringFromName('profilist.cp.created-asc'),
					1: myServices.sb.GetStringFromName('profilist.cp.created-desc'),
					2: myServices.sb.GetStringFromName('profilist.cp.alphanum-asc'),
					3: myServices.sb.GetStringFromName('profilist.cp.alphanum-desc')
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

		var aProps = {
			className: 'wrap-react'
		};
		
		var children = [];
		
		children.push(React.createElement(Row, {gRowInfo:{id:'help'}}));
		
		// console.log('gDOMInfo.length:', gDOMInfo.length);
		
		for (var i=0; i<gDOMInfo.length; i++) {
			console.log('gDOMInfo[i]:', gDOMInfo[i]);
			children.push(React.createElement(Section, {gSectionInfo:gDOMInfo[i]}));
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

		var aProps = {
			className: 'section'
		};
		
		var children = [];
		
		// console.log('this.props.gSectionInfo.length:', this.props.gSectionInfo.length);
		children.push(React.createElement('h3', {className:'section-head'},
			this.props.gSectionInfo.section
		));
		
		for (var i=0; i<this.props.gSectionInfo.rows.length; i++) {
			children.push(React.createElement(Row, {gRowInfo:this.props.gSectionInfo.rows[i]}));
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
		if (this.props.gRowInfo.key) { //only things with key are in ini. and only things in ini can have specificity
			console.log('gKeyInfoStore[this.props.gRowInfo.key]:', gKeyInfoStore[this.props.gRowInfo.key]);
			if (!gKeyInfoStore[this.props.gRowInfo.key].unspecificOnly && !gKeyInfoStore[this.props.gRowInfo.key].specificOnly) {
				// alert('this one can be toggled:' + this.props.gRowInfo.key);
				children.push(
					React.createElement('span', {className:'fontello-icon icon-specificness-toggler'})
				);
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
			children.push(
				React.createElement('span', {className:'fontello-icon icon-info', 'data-specificness': !specificnessDesc ? undefined : specificnessDesc})
			);
		}
		
		switch (this.props.gRowInfo.type) {
			case 'select':
				
					var options = []
					for (var o in this.props.gRowInfo.values) {
						options.push(
							React.createElement('option', {value:o},
								this.props.gRowInfo.values[o]
							)
						);
					}
					children.push(React.createElement('select', {},
						options
					));
				
				break;
			default:
			
					////
		}
		
		return React.createElement('div', aProps,
			children
		);
	}
});
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
// end - common helper functions