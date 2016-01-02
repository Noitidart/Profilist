// Imports
const {classes: Cc, interfaces: Ci, manager: Cm, results: Cr, utils: Cu, Constructor: CC} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);
Cu.import('resource://gre/modules/AddonManager.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
const PromiseWorker = Cu.import('resource://gre/modules/PromiseWorker.jsm').BasePromiseWorker;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Globals
const core = {
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
	os: {
		name: OS.Constants.Sys.Name.toLowerCase(),
		toolkit: Services.appinfo.widgetToolkit.toLowerCase(),
		xpcomabi: Services.appinfo.XPCOMABI
	},
	firefox: {
		pid: Services.appinfo.processID,
		version: Services.appinfo.version
	}
};

const JETPACK_DIR_BASENAME = 'jetpack';
const OSPath_simpleStorage = OS.Path.join(OS.Constants.Path.profileDir, JETPACK_DIR_BASENAME, core.addon.id, 'simple-storage');
const OSPath_config = OS.Path.join(OSPath_simpleStorage, 'config.json');
const myPrefBranch = 'extensions.' + core.addon.id + '.';

var bootstrap = this;
var RC = {}; // holds my react components
var RE = {}; // holds my react elements

var ADDON_MANAGER_ENTRY;

// Lazy Imports
const myServices = {};
XPCOMUtils.defineLazyGetter(myServices, 'hph', function () { return Cc['@mozilla.org/network/protocol;1?name=http'].getService(Ci.nsIHttpProtocolHandler); });
XPCOMUtils.defineLazyGetter(myServices, 'sb', function () { return Services.strings.createBundle(core.addon.path.locale + 'bootstrap.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });

// START - Addon Functionalities	
// start - about module
var aboutFactory_profilist;
function AboutProfilist() {}

function initAndRegisterAboutProfilist() {
	// init it
	AboutProfilist.prototype = Object.freeze({
		classDescription: myServices.sb.GetStringFromName('about-page-class-description'),
		contractID: '@mozilla.org/network/protocol/about;1?what=profilist',
		classID: Components.ID('{f7b6f390-a0c2-11e5-a837-0800200c9a66}'),
		QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

		getURIFlags: function(aURI) {
			return Ci.nsIAboutModule.ALLOW_SCRIPT | Ci.nsIAboutModule.URI_MUST_LOAD_IN_CHILD;
		},

		newChannel: function(aURI, aSecurity) {

			// var channel = Services.io.newChannel(core.addon.path.pages + 'cp.xhtml', null, null);
			var channel;
			if (aURI.path.toLowerCase().indexOf('?html') > -1) {
				channel = Services.io.newChannel(core.addon.path.pages + 'html.xhtml', null, null);
			} else {
				channel = Services.io.newChannel(core.addon.path.pages + 'cp.xhtml', null, null);
			}
			channel.originalURI = aURI;
			return channel;
		}
	});
	
	// register it
	aboutFactory_profilist = new AboutFactory(AboutProfilist);
}

function AboutFactory(component) {
	this.createInstance = function(outer, iid) {
		if (outer) {
			throw Cr.NS_ERROR_NO_AGGREGATION;
		}
		return new component();
	};
	this.register = function() {
		Cm.registerFactory(component.prototype.classID, component.prototype.classDescription, component.prototype.contractID, this);
	};
	this.unregister = function() {
		Cm.unregisterFactory(component.prototype.classID, this);
	}
	Object.freeze(this);
	this.register();
}
// end - about module

function testReact() {
	RC.Timer = React.createClass({
		displayName: 'Timer',
		getInitialState: function getInitialState() {
			return { secondsElapsed: 0 };
		},
		tick: function tick() {
			this.setState({ secondsElapsed: this.state.secondsElapsed + 1 });
		},
		componentDidMount: function componentDidMount() {
			console.log('comp mounted');
			this.timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
			var THAT = this;
			// this.timer.initWithCallback({
				// notify: function() {
					// console.log('timer triggered', 'this.tick:', this.tick, 'THAT.tick:', THAT.tick);
					// THAT.tick();
				// }
			// }, 1000, Ci.nsITimer.TYPE_REPEATING_PRECISE);
		},
		componentWillUnmount: function componentWillUnmount() {
			console.log('comp unmounting');
			this.timer.cancel();
		},
		render: function render() {
			return React.createElement(
				'label',
				{
					value: 'Seconds Elapsed: ' + this.state.secondsElapsed
				}
			);
		}
	});

	RE.timerA = React.createElement(RC.Timer, null);
	var pareEl = Services.wm.getMostRecentWindow('navigator:browser').document.getElementById('PlacesToolbarItems');
	var myhbo = pareEl.ownerDocument.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'hbox')
	myhbo.setAttribute('id', 'myhbo');
	myhbo.setAttribute('style', 'background-color:red;');
	pareEl.appendChild(myhbo);
	ReactDOM.render(RE.timerA, myhbo);
};

function install() {}

function uninstall(aData, aReason) {
	if (aReason == ADDON_UNINSTALL) {
		
	}
}

function startup(aData, aReason) {
	// core.addon.aData = aData;
	extendCore();
	
	// custom core extending
	core.profilist = {};
	core.profilist.path = {
		defProfRt: Services.dirsvc.get('DefProfRt', Ci.nsIFile).path,
		defProfLRt: Services.dirsvc.get('DefProfLRt', Ci.nsIFile).path,
		XREExeF: Services.dirsvc.get('XREExeF', Ci.nsIFile).path
	};
	core.firefox.channel = Services.prefs.getCharPref('app.update.channel'); // esr|release|beta|aurora|dev|nightly|default
	
	
	var afterWorker = function() { // because i init worker, then continue init
		// register about page
		initAndRegisterAboutProfilist();
		
		// register about pages listener
		Services.mm.addMessageListener(core.addon.id, fsMsgListener);
		
		// // bring in react
		// Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react.dev.js', bootstrap);
		// Services.scriptloader.loadSubScript(core.addon.path.scripts + 'react-dom.dev.js', bootstrap);
		// 
		// testReact();
	};
	
	// startup worker
	var promise_initMainWorker = SIPWorker('MainWorker', core.addon.path.workers + 'MainWorker.js');
	promise_initMainWorker.then(
		function(aVal) {
			console.log('Fullfilled - promise_initMainWorker - ', aVal);
			// start - do stuff here - promise_initMainWorker
			afterWorker();
			// end - do stuff here - promise_initMainWorker
		},
		function(aReason) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aReason: aReason
			};
			console.warn('Rejected - promise_initMainWorker - ', rejObj);
		}
	).catch(
		function(aCaught) {
			var rejObj = {
				name: 'promise_initMainWorker',
				aCaught: aCaught
			};
			console.error('Caught - promise_initMainWorker - ', rejObj);
		}
	);
	
}

function shutdown(aData, aReason) {
	
	if (aReason == APP_SHUTDOWN) { return }
	
	// an issue with this unload is that framescripts are left over, i want to destory them eventually
	aboutFactory_profilist.unregister();
	
	// unregister about pages listener
	Services.mm.removeMessageListener(core.addon.id, fsMsgListener);
	
	// unmount react elements
	for (var re in RE) {
		console.info(RE[re]);
		//ReactDOM.unmountComponentAtNode()
		console.log('RE[re]:', RE[re]);
	}
}
// END - Addon Functionalities
// start - server/framescript comm layer
// functions for framescripts to call in main thread
var fsFuncs = { // can use whatever, but by default its setup to use this
	fetchCoreAndConfigs: function() {
		var deferredMain_fetchConfigObjs = new Deferred();
		
		console.log('sending over fetchCoreAndConfigs');
		
		var promise_fetch = MainWorker.post('fetchAll');
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchConfigObjs.resolve([aVal]);
				// end - do stuff here - promise_fetch
			}
		);
		
		return deferredMain_fetchConfigObjs.promise;
	},
	fetchJustIniObj: function() {
		// just gets gIniObj
		var deferredMain_fetchJustIniObj = new Deferred();
		
		var promise_fetch = MainWorker.post('fetchJustIniObj');
		promise_fetch.then(
			function(aVal) {
				console.log('Fullfilled - promise_fetch - ', aVal);
				// start - do stuff here - promise_fetch
				deferredMain_fetchJustIniObj.resolve([aVal]);
				// end - do stuff here - promise_fetch
			}
		);
		
		return deferredMain_fetchJustIniObj.promise;
	},
	userManipulatedIniObj_updateIniFile: function(aNewIniObjStr) {
		var deferredMain_userManipulatedIniObj_updateIniFile = new Deferred();
		console.log('telling mainworker userManipulatedIniObj_updateIniFile');
		
		var promise_updateini = MainWorker.post('userManipulatedIniObj_updateIniFile', [aNewIniObjStr]);
		promise_updateini.then(
			function(aVal) {
				console.log('Fullfilled - promise_updateini - ', aVal);
				// start - do stuff here - promise_updateini
				deferredMain_userManipulatedIniObj_updateIniFile.resolve([aVal]);
				// end - do stuff here - promise_updateini
			}
		);
		
		return deferredMain_userManipulatedIniObj_updateIniFile.promise;
	}
};
var fsMsgListener = {
	funcScope: fsFuncs,
	receiveMessage: function(aMsgEvent) {
		var aMsgEventData = aMsgEvent.data;
		console.log('fsMsgListener getting aMsgEventData:', aMsgEventData, 'aMsgEvent:', aMsgEvent);
		// aMsgEvent.data should be an array, with first item being the unfction name in bootstrapCallbacks
		
		var callbackPendingId;
		if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SAM_CB_PREFIX) == 0) {
			callbackPendingId = aMsgEventData.pop();
		}
		
		aMsgEventData.push(aMsgEvent); // this is special for server side, so the function can do aMsgEvent.target.messageManager to send a response
		
		var funcName = aMsgEventData.shift();
		if (funcName in this.funcScope) {
			var rez_parentscript_call = this.funcScope[funcName].apply(null, aMsgEventData);
			
			if (callbackPendingId) {
				// rez_parentscript_call must be an array or promise that resolves with an array
				if (rez_parentscript_call.constructor.name == 'Promise') {
					rez_parentscript_call.then(
						function(aVal) {
							// aVal must be an array
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, aVal]);
						},
						function(aReason) {
							console.error('aReject:', aReason);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aReason]]);
						}
					).catch(
						function(aCatch) {
							console.error('aCatch:', aCatch);
							aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, ['promise_rejected', aCatch]]);
						}
					);
				} else {
					// assume array
					aMsgEvent.target.messageManager.sendAsyncMessage(core.addon.id, [callbackPendingId, rez_parentscript_call]);
				}
			}
		}
		else { console.warn('funcName', funcName, 'not in scope of this.funcScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out
		
	}
};
// end - server/framescript comm layer
// start - common helper functions
function Deferred() { // rev3 - https://gist.github.com/Noitidart/326f1282c780e3cb7390
	// update 062115 for typeof
	if (typeof(Promise) != 'undefined' && Promise.defer) {
		//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
		return Promise.defer();
	} else if (typeof(PromiseUtils) != 'undefined'  && PromiseUtils.defer) {
		//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
		return PromiseUtils.defer();
	} else {
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
	}
}

// var bootstrap = this; // needed for SIPWorker and SICWorker - rev8 // i put this in the top in globals section
const SIC_CB_PREFIX = '_a_gen_cb_';
const SIC_TRANS_WORD = '_a_gen_trans_';
var sic_last_cb_id = -1;
function SICWorker(workerScopeName, aPath, aFuncExecScope=bootstrap, aCore=core) {
	// creates a global variable in bootstrap named workerScopeName which will hold worker, do not set up a global for it like var Blah; as then this will think something exists there
	// aScope is the scope in which the functions are to be executed
	// ChromeWorker must listen to a message of 'init' and on success of it, it should sendMessage back saying aMsgEvent.data == {aTopic:'init', aReturn:true}
	// "Start and Initialize ChromeWorker" // based on SIPWorker
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`	
	var deferredMain_SICWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new ChromeWorker(aPath);
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var afterInitListener = function(aMsgEvent) {
			// note:all msgs from bootstrap must be postMessage([nameOfFuncInWorker, arg1, ...])
			var aMsgEventData = aMsgEvent.data;
			console.log('mainthread receiving message:', aMsgEventData);
			
			// postMessageWithCallback from worker to mt. so worker can setup callbacks after having mt do some work
			var callbackPendingId;
			if (typeof aMsgEventData[aMsgEventData.length-1] == 'string' && aMsgEventData[aMsgEventData.length-1].indexOf(SIC_CB_PREFIX) == 0) {
				callbackPendingId = aMsgEventData.pop();
			}
			
			var funcName = aMsgEventData.shift();
			
			if (funcName in aFuncExecScope) {
				var rez_mainthread_call = aFuncExecScope[funcName].apply(null, aMsgEventData);
				
				if (callbackPendingId) {
					if (rez_mainthread_call.constructor.name == 'Promise') {
						rez_mainthread_call.then(
							function(aVal) {
								if (aVal.length >= 2 && aVal[aVal.length-1] == SIC_TRANS_WORD && Array.isArray(aVal[aVal.length-2])) {
									// to transfer in callback, set last element in arr to SIC_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
									console.error('doing transferrrrr');
									aVal.pop();
									bootstrap[workerScopeName].postMessage([callbackPendingId, aVal], aVal.pop());
								} else {
									bootstrap[workerScopeName].postMessage([callbackPendingId, aVal]);
								}
							},
							function(aReason) {
								console.error('aReject:', aReason);
								bootstrap[workerScopeName].postMessage([callbackPendingId, ['promise_rejected', aReason]]);
							}
						).catch(
							function(aCatch) {
								console.error('aCatch:', aCatch);
								bootstrap[workerScopeName].postMessage([callbackPendingId, ['promise_rejected', aCatch]]);
							}
						);
					} else {
						// assume array
						if (rez_mainthread_call.length > 2 && rez_mainthread_call[rez_mainthread_call.length-1] == SIC_TRANS_WORD && Array.isArray(rez_mainthread_call[rez_mainthread_call.length-2])) {
							// to transfer in callback, set last element in arr to SIC_TRANS_WORD and 2nd to last element an array of the transferables									// cannot transfer on promise reject, well can, but i didnt set it up as probably makes sense not to
							rez_mainthread_call.pop();
							bootstrap[workerScopeName].postMessage([callbackPendingId, rez_mainthread_call], rez_mainthread_call.pop());
						} else {
							bootstrap[workerScopeName].postMessage([callbackPendingId, rez_mainthread_call]);
						}
					}
				}
			}
			else { console.warn('funcName', funcName, 'not in scope of aFuncExecScope') } // else is intentionally on same line with console. so on finde replace all console. lines on release it will take this out

		};
		
		var beforeInitListener = function(aMsgEvent) {
			// note:all msgs from bootstrap must be postMessage([nameOfFuncInWorker, arg1, ...])
			var aMsgEventData = aMsgEvent.data;
			if (aMsgEventData[0] == 'init') {
				bootstrap[workerScopeName].removeEventListener('message', beforeInitListener);
				bootstrap[workerScopeName].addEventListener('message', afterInitListener);
				deferredMain_SICWorker.resolve(true);
				if ('init' in aFuncExecScope) {
					aFuncExecScope[aMsgEventData.shift()].apply(null, aMsgEventData);
				}
			}
		};
		
		// var lastCallbackId = -1; // dont do this, in case multi SICWorker's are sharing the same aFuncExecScope so now using new Date().getTime() in its place // link8888881
		bootstrap[workerScopeName].postMessageWithCallback = function(aPostMessageArr, aCB, aPostMessageTransferList) {
			// lastCallbackId++; // link8888881
			sic_last_cb_id++;
			var thisCallbackId = SIC_CB_PREFIX + sic_last_cb_id; // + lastCallbackId; // link8888881
			aFuncExecScope[thisCallbackId] = function() {
				delete aFuncExecScope[thisCallbackId];
				// console.log('in mainthread callback trigger wrap, will apply aCB with these arguments:', arguments, 'turned into array:', Array.prototype.slice.call(arguments));
				aCB.apply(null, arguments[0]);
			};
			aPostMessageArr.push(thisCallbackId);
			// console.log('aPostMessageArr:', aPostMessageArr);
			bootstrap[workerScopeName].postMessage(aPostMessageArr, aPostMessageTransferList);
		};
		
		bootstrap[workerScopeName].addEventListener('message', beforeInitListener);
		bootstrap[workerScopeName].postMessage(['init', aCore]);
		
	} else {
		deferredMain_SICWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SICWorker.promise;
	
}

function SIPWorker(workerScopeName, aPath, aCore=core) {
	// update 122115 - init resolves the deferred with the value returned from Worker, rather then forcing it to resolve at true
	// "Start and Initialize PromiseWorker"
	// returns promise
		// resolve value: jsBool true
	// aCore is what you want aCore to be populated with
	// aPath is something like `core.addon.path.content + 'modules/workers/blah-blah.js'`
	
	// :todo: add support and detection for regular ChromeWorker // maybe? cuz if i do then ill need to do ChromeWorker with callback
	
	var deferredMain_SIPWorker = new Deferred();

	if (!(workerScopeName in bootstrap)) {
		bootstrap[workerScopeName] = new PromiseWorker(aPath);
		
		if ('addon' in aCore && 'aData' in aCore.addon) {
			delete aCore.addon.aData; // we delete this because it has nsIFile and other crap it, but maybe in future if I need this I can try JSON.stringify'ing it
		}
		
		var promise_initWorker = bootstrap[workerScopeName].post('init', [aCore]);
		promise_initWorker.then(
			function(aVal) {
				console.log('Fullfilled - promise_initWorker - ', aVal);
				// start - do stuff here - promise_initWorker
				deferredMain_SIPWorker.resolve(aVal);
				// end - do stuff here - promise_initWorker
			},
			function(aReason) {
				var rejObj = {name:'promise_initWorker', aReason:aReason};
				console.warn('Rejected - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		).catch(
			function(aCaught) {
				var rejObj = {name:'promise_initWorker', aCaught:aCaught};
				console.error('Caught - promise_initWorker - ', rejObj);
				deferredMain_SIPWorker.reject(rejObj);
			}
		);
		
	} else {
		deferredMain_SIPWorker.reject('Something is loaded into bootstrap[workerScopeName] already');
	}
	
	return deferredMain_SIPWorker.promise;
	
}

function aReasonMax(aReason) {
	var deepestReason = aReason;
	while (deepestReason.hasOwnProperty('aReason') || deepestReason.hasOwnProperty()) {
		if (deepestReason.hasOwnProperty('aReason')) {
			deepestReason = deepestReason.aReason;
		} else if (deepestReason.hasOwnProperty('aCaught')) {
			deepestReason = deepestReason.aCaught;
		}
	}
	return deepestReason;
}

// sendAsyncMessageWithCallback - rev3
const SAM_CB_PREFIX = '_sam_gen_cb_';
var sam_last_cb_id = -1;
function sendAsyncMessageWithCallback(aMessageManager, aGroupId, aMessageArr, aCallbackScope, aCallback) {
	sam_last_cb_id++;
	var thisCallbackId = SAM_CB_PREFIX + sam_last_cb_id;
	aCallbackScope = aCallbackScope ? aCallbackScope : bootstrap;
	aCallbackScope[thisCallbackId] = function(aMessageArr) {
		delete aCallbackScope[thisCallbackId];
		aCallback.apply(null, aMessageArr);
	}
	aMessageArr.push(thisCallbackId);
	aMessageManager.sendAsyncMessage(aGroupId, aMessageArr);
}


function extendCore() {
	// adds some properties i use to core based on the current operating system, it needs a switch, thats why i couldnt put it into the core obj at top
	switch (core.os.name) {
		case 'winnt':
		case 'winmo':
		case 'wince':
			core.os.version = parseFloat(Services.sysinfo.getProperty('version'));
			// http://en.wikipedia.org/wiki/List_of_Microsoft_Windows_versions
			if (core.os.version == 6.0) {
				core.os.version_name = 'vista';
			}
			if (core.os.version >= 6.1) {
				core.os.version_name = '7+';
			}
			if (core.os.version == 5.1 || core.os.version == 5.2) { // 5.2 is 64bit xp
				core.os.version_name = 'xp';
			}
			break;
			
		case 'darwin':
			var userAgent = myServices.hph.userAgent;

			var version_osx = userAgent.match(/Mac OS X 10\.([\d\.]+)/);

			
			if (!version_osx) {
				throw new Error('Could not identify Mac OS X version.');
			} else {
				var version_osx_str = version_osx[1];
				var ints_split = version_osx[1].split('.');
				if (ints_split.length == 1) {
					core.os.version = parseInt(ints_split[0]);
				} else if (ints_split.length >= 2) {
					core.os.version = ints_split[0] + '.' + ints_split[1];
					if (ints_split.length > 2) {
						core.os.version += ints_split.slice(2).join('');
					}
					core.os.version = parseFloat(core.os.version);
				}
				// this makes it so that 10.10.0 becomes 10.100
				// 10.10.1 => 10.101
				// so can compare numerically, as 10.100 is less then 10.101
				
				//core.os.version = 6.9; // note: debug: temporarily forcing mac to be 10.6 so we can test kqueue
			}
			break;
		default:
			// nothing special
	}
	

}
// end - common helper functions