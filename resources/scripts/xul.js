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

	var wrap = document.getElementById('profilist_wrap');
	if (wrap) {
		ReactDOM.unmountComponentAtNode(wrap);
		wrap.parentNode.removeChild(wrap);
		// TODO: how to uninitalize redux? set `store` and `app` to null?
	}
	console.error('uninit done');
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
	profiles: 1
};
var hydrant_ex = {
	profiles: []
};

// ACTIONS

// ACTION CREATORS

// REDUCERS
function profiles(state=hydrant_ex.profiles, action) {
	switch(action.type) {
		default:
			return state;
	}
}

app = Redux.combineReducers({
	profiles
});

// presentational
var Stack = React.createClass({
	displayName: 'Stack',
	render: function() {
		var { profiles } = this.props; // mapped state

		var key = 0;
		var menuitems_rel = profiles.map( menuitementry => React.createElement(MenuItem, { key:''+key++, menuitementry }) )

		return React.createElement('stack', { id:'profilist_stack' },
			menuitems_rel,
			React.createElement(MenuItem, { key:''+key++, menuitementry:{special:'createnewprofile'} })
		);
	}
});

var MenuItem = React.createClass({
	displayName: 'MenuItem',
	render: function() {
		var { menuitementry } = this.props; // attr

		var { special, label, active } = menuitementry;

		// if special set its stuff
		var status_src;
		var status_style;
		if (special) {
			switch (special) {
				case 'createnewprofile':
						label = formatStringFromNameCore('createnewprofile', 'main');
						status_style = { backgroundImage:'url(' + core.addon.path.images + 'plus.png' + ')' }
						status_src = core.addon.path.images + 'plus.png';
					break;
			}
		} else {
			// status_style
			if (active) {
				status_style = { backgroundImage:'url(' + core.addon.path.images + 'status-active.png' + ')' }
				status_src = core.addon.path.images + 'status-active.png';
			} else {
				status_style = { backgroundImage:'url(' + core.addon.path.images + 'status-inactive.png' + ')' }
				status_src = core.addon.path.images + 'status-inactive.png';
			}
		}

		// these vars needs to be set before here: `label`, `status_style`
		return React.createElement('hbox', { className:'profilist_menuitem' },
			React.createElement('stack', { className:'profilist_images' },
				React.createElement('image', { className:'profilist_status', src:status_src, style:status_style }),
				React.createElement('image', { className:'profilist_badge' })
			),
			React.createElement('stack', { className:'profilist_labels' },
				React.createElement('label', { className:'profilist_name', value:label }),
				React.createElement('label', { className:'profilist_message' })
			),
			React.createElement('hbox', { className:'profilist_tools' })
		);
	}
});

// container
var StackContainer = ReactRedux.connect(
	function mapStateToProps(state, ownProps) {
		return {
			profiles: state.profiles
		};
	}
)(Stack);

gBsComm = new Comm.client.content(init);

// start - common helper functions
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
