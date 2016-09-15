// responsible for the xul menu in the main window
var core;
var gBsComm;
var { callInMainworker, callInBootstrap } = CommHelper.content;

function init() {
	callInMainworker('fetchCore', { hydrant_ex_instructions }, function(aArg) {
		console.log('aArg in xul.js:', aArg);
		// ({ core, hydrant_ex_instructions } = aArg);
		core = aArg.core;

		// setup and start redux
		if (app) {
			if (hydrant_ex_instructions) {
				Object.assign(hydrant_ex, aArg.hydrant_ex);
			}

			store = Redux.createStore(app);

			// if (hydrant_ex_instructions) {
			// 	store.subscribe(shouldUpdateHydrantEx);
			// }
		}

		if (document.readyState == 'complete') {
			onload();
		} else {
			document.addEventListener('load', onload, false);
		}

	});
}

function uninit() {
	var panel = document.getElementById('PanelUI-popup');
	panel.removeEventListener('popupshowing', popupshowing, false);
}

function onload() {
	console.error('window.location:', window.location.href);

	document.removeEventListener('load', onload, false);

	var panel = document.getElementById('PanelUI-popup');
	panel.addEventListener('popupshowing', popupshowing, false);

	if (panel) {
		mount();
	}

	// var customizing = document.documentElement.getAttribute('customizing');
	// if (customizing) {
	// 	mount();
	// }
}

var gMounted = false;
function mount() {
	if (gMounted) return;

	var footer = document.getElementById('PanelUI-footer');
	console.log('footer:', footer);

	var wrap = document.createElement('hbox');
	wrap.setAttribute('id', 'profilist_wrap');
	footer.insertBefore(wrap, footer.firstChild);

	gMounted = true; // TODO: consider if `footer` is undefined then dont set mount and return

	ReactDOM.render(
		React.createElement(ReactRedux.Provider, { store },
			React.createElement(StackContainer)
		),
		wrap
	);
}

function popupshowing(e) {
	console.log('popup showing');
	mount();
}

// REDUX STUFF
var app;
var store;
var hydrant_ex_instructions = { // stuff that shouldnt get written to hydrants entry in filestore. updating this is handled manually by dev
	menu: 1
};
var hydrant_ex = {
	menu: []
};

// ACTIONS

// ACTION CREATORS

// REDUCERS
function menu(state=hydrant_ex.menu, action) {
	switch(action.type) {
		default:
			return state;
	}
}

app = Redux.combineReducers({
	menu
});

// presentational
var Stack = React.createClass({
	displayName: 'Stack',
	render: function() {
		var { menu } = this.props; // mapped state

		var menuitems_rel = menu.map( menuitementry => React.createElement(MenuItem, { menuitementry }) )

		return React.createElement('stack', { id:'profilist_stack' },
			menuitems_rel
		);
	}
});

var MenuItem = React.createClass({
	displayName: 'MenuItem',
	render: function() {
		var { menuitementry } = this.props; // attr

		var { label } = menuitementry;

		return React.createElement('hbox', { className:'profilist_menuitem' },
			React.createElement('image'),
			React.createElement('toolbarbutton', { label })
		);
	}
});

// container
var StackContainer = ReactRedux.connect(
	function mapStateToProps(state, ownProps) {
		return {
			menu: state.menu
		};
	}
)(Stack);

gBsComm = new Comm.client.content(init);
