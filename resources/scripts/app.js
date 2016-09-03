var core;
var gFsComm;
var callInFramescript, callInMainworker, callInBootstrap;

// set in app_*.js files
var gAppPageComponents; // array of react elements
var hydrant_ex; // undefined or an object
var hydrant_ex_instructions; // object or undefined
var gSupressUpdateHydrantExOnce = false; // boolean // supress the updating of the filestore due to hydrant update
var shouldUpdateHydrantEx; // function
var app; // Redux
var initAppPage; // function
var focusAppPage; // function
var uninitAppPage; // function

function preinit() {
	console.log('in iprenit');
	({ callInFramescript, callInMainworker, callInBootstrap } = CommHelper.contentinframescript);
	gFsComm = new Comm.client.content(init);
}
window.addEventListener('DOMContentLoaded', preinit, false);

function init() {
	console.error('calling fetchCore with hydrant_ex_instructions:', hydrant_ex_instructions);
	callInMainworker('fetchCore', { hydrant_ex_instructions }, function(aArg) {
		console.log('aArg in app.js:', aArg);
		({ core } = aArg);

		// set up some listeners
		// window.addEventListener('unload', uninit, false);

		// setup and start redux
		if (app) {
			if (hydrant_ex_instructions) {
				hydrant_ex = aArg.hydrant_ex;
			}

			store = Redux.createStore(app);

			if (hydrant_ex_instructions) {
				store.subscribe(shouldUpdateHydrantEx);
			}
		}

		var page_inited;
		if (initAppPage) {
			page_inited = initAppPage(aArg);
		}

		var afterPageInited = function() {
			// render react
			ReactDOM.render(
				React.createElement(ReactRedux.Provider, { store },
					React.createElement(App)
				),
				document.getElementById('root')
			);
			if (focusAppPage) {
				window.addEventListener('focus', focusAppPage, false);
			}
		};

		Promise.all([page_inited]).then(afterPageInited); // if `page_inited` is not a promise, it is ok, Promise.all will take it to the .then immediately with that page_inited's return as value

	});
}

function uninit() {
	// triggered by uninit of framescript - if i want to do something on unload of page i should create function unload() and addEventListener('unload', unload, false)
	// window.removeEventListener('unload', uninit, false);

	if (uninitAppPage) {
		uninitAppPage();
	}

	Comm.client.unregAll('content');
}

// start - functions called by framescript

// end - functions called by framescript

// start - react-redux
const ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;
const ReactTransitionGroup = React.addons.TransitionGroup;

// STORE
var store;

// var unsubscribe = store.subscribe(() => console.log(store.getState()) );

// REACT TRANSITION GROUPS
function createTrans(transitionName, transitionEnterTimeout, transitionLeaveTimeout, transitionAppear=undefined) {
	// transitionAppear is true else undefined
	var props = { transitionName, transitionEnterTimeout, transitionLeaveTimeout };
	if (transitionAppear) {
		props.transitionAppear = true;
		props.transitionAppearTimeout = transitionEnterTimeout;
	}
	return props;
}
var gTrans = [
	createTrans('animsition', 1100, 800, true),
	createTrans('slideleftright', 225, 225)
];
function initTransTimingStylesheet() {
	var style = document.createElement('style');
	var rules = [];
	for (var trans of gTrans) {
		var { transitionName, transitionEnterTimeout, transitionLeaveTimeout, transitionAppear } = trans;
		if (transitionAppear) {
			rules.push('.' + transitionName + '-appear.' + transitionName + '-appear-active,');
		}
		rules.push('.' + transitionName + '-enter.' + transitionName + '-enter-active { transition-duration:' + transitionEnterTimeout + 'ms }');
		rules.push('.' + transitionName + '-leave.' + transitionName + '-leave-active { transition-duration:' + transitionLeaveTimeout + 'ms }');
	}
	style.textContent = rules.join('');
	document.head.appendChild(style);
}
initTransTimingStylesheet();

function getTrans(transitionName, otherProps) {
	// use this in the React.createElement(ReactCSSTransitionGroup, getTrans(...))
	for (var trans of gTrans) {
		if (trans.transitionName == transitionName) {
			if (otherProps) {
				return Object.assign({}, trans, otherProps);
			} else {
				return trans;
			}
		}
	}
}
// REACT COMPONENTS - PRESENTATIONAL
var App = React.createClass({
	render: function() {

		var app_components = [
			...gAppPageComponents
		];

		return React.createElement('div', { id:'app_wrap', className:'app-wrap' },
			app_components
		);
	}
});


// REACT COMPONENTS - CONTAINER

// end - react-redux

// start - common helper functions
function pushAlternatingRepeating(aTargetArr, aEntry) {
	// pushes into an array aEntry, every alternating
		// so if aEntry 0
			// [1, 2] becomes [1, 0, 2]
			// [1] statys [1]
			// [1, 2, 3] becomes [1, 0, 2, 0, 3]
	var l = aTargetArr.length;
	for (var i=l-1; i>0; i--) {
		aTargetArr.splice(i, 0, aEntry);
	}
}
function formatStringFromNameCore(aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements) {
	// 051916 update - made it core.addon.l10n based
    // formatStringFromNameCore is formating only version of the worker version of formatStringFromName, it is based on core.addon.l10n cache

	try { var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr]; if (!cLocalizedStr) { throw new Error('localized is undefined'); } } catch (ex) { console.error('formatStringFromNameCore error:', ex, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements); } // remove on production

	var cLocalizedStr = core.addon.l10n[aLoalizedKeyInCoreAddonL10n][aLocalizableStr];
	// console.log('cLocalizedStr:', cLocalizedStr, 'args:', aLocalizableStr, aLoalizedKeyInCoreAddonL10n, aReplacements);
    if (aReplacements) {
        for (var i=0; i<aReplacements.length; i++) {
            cLocalizedStr = cLocalizedStr.replace('%S', aReplacements[i]);
        }
    }

    return cLocalizedStr;
}
// end - common helper functions

function formatTime(aDateOrTime, aOptions={}) {
	// aMonthFormat - name, Mmm
	var aDefaultOptions = {
		month: 'name', // string;enum[name,Mmm] - format for month
		time: true // bool - if should append time string
	};
	aOptions = Object.assign(aDefaultOptions, aOptions);

	var aDate = typeof(aDateOrTime) == 'object' ? aDateOrTime : new Date(aDateOrTime);

	var mon = formatStringFromNameCore('month.' + (aDate.getMonth()+1) + '.' + aOptions.month, 'dateFormat');
	var yr = aDate.getFullYear();
	var day = aDate.getDate();

	var hr = aDate.getHours() > 12 ? aDate.getHours() - 12 : aDate.getHours();
	var min = aDate.getMinutes() < 10 ? '0' + aDate.getMinutes() : aDate.getMinutes();
	var meridiem = aDate.getHours() < 12 ? 'AM' : 'PM';

	return mon + ' ' + day + ', ' + yr + (aOptions.time ? ' - ' + hr + ':' + min + ' ' + meridiem : '');
}
