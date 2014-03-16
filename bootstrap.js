const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const self = {
	name: 'Profilist',
	chrome_path: 'chrome://profilist/content/',
	aData: 0,
};

const myServices = {};
var cssUri;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyGetter(myServices, 'sss', function(){ return Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService) });

function prevHide(e) {
	e.preventDefault();
	e.stopPropagation();
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.loadIntoWindow(aDOMWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let DOMWindows = Services.wm.getEnumerator(null);
		while (DOMWindows.hasMoreElements()) {
			let aDOMWindow = DOMWindows.getNext();
			windowListener.unloadFromWindow(aDOMWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {
			var PUIsync = aDOMWindow.document.querySelector('#PanelUI-fxa-status');
			console.info('PUIsync on start up = ', PUIsync);
			var PUIsync_height = PUIsync.boxObject.height; //parseInt(aDOMWindow.getComputedStyle(PUIsync, null).getPropertyValue('height'));
			if (PUIsync_height == 0) {
				console.warn('PUIsync unavail', PUIsync);
				PanelUI.addEventListener('popupshowing', function() {
					windowListener.loadIntoWindow(aDOMWindow);
				}, false);
				return;
			}
			var PUIf = aDOMWindow.document.querySelector('#PanelUI-footer');
			var PUIcs = aDOMWindow.document.querySelector('#PanelUI-contents-scroller');
			//console.log('PUIcs.style.width',PUIcs.style.width);
			var profilistHBoxJSON =
			['xul:vbox', {id: 'profilist_hbox'},
				['xul:stack', {key:'profilist_stack',style:'width:100%'}]
			];
			var referenceNodes = {};
			PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, referenceNodes), PUIf.firstChild);
			
			/*must insert the "Default: profile" into stack last*/
			
			var dupeNode1 = PUIsync.cloneNode(true);
			dupeNode1.classList.add('PanelUI-profilist');
			dupeNode1.setAttribute('label', 'Clean');
			dupeNode1.removeAttribute('id');
			dupeNode1.setAttribute('status','inactive');
			dupeNode1.setAttribute('top',PUIsync_height);
			dupeNode1.setAttribute('style', '-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);');
			
			var dupeNode2 = PUIsync.cloneNode(true);
			dupeNode2.classList.add('PanelUI-profilist');
			dupeNode2.setAttribute('label', 'Default');
			dupeNode2.setAttribute('status','active');
			dupeNode2.setAttribute('top','0');
			dupeNode2.removeAttribute('id');
			dupeNode2.setAttribute('style', '-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);');

			var dupeNode3 = PUIsync.cloneNode(true);
			dupeNode3.classList.add('PanelUI-profilist');
			dupeNode3.classList.add('advanced');
			dupeNode3.setAttribute('label', 'Advanced Options');
			dupeNode3.removeAttribute('status','active');
			dupeNode3.removeAttribute('id');
			dupeNode3.setAttribute('top',PUIsync_height*2);
			dupeNode3.setAttribute('style', '-moz-appearance:none; padding:10px 0 10px 15px; margin-bottom:-1px; border-top:1px solid rgba(24,25,26,0.14); border-bottom:1px solid transparent; border-right:0 none rgb(0,0,0); border-left:0 none rgb(0,0,0);');
			
			referenceNodes.profilist_stack.style.height = PUIsync_height + 'px'
			referenceNodes.profilist_stack.appendChild(dupeNode1);
			referenceNodes.profilist_stack.appendChild(dupeNode3);
			referenceNodes.profilist_stack.appendChild(dupeNode2);
			referenceNodes.profilist_stack.addEventListener('mouseenter', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				PUIcs.style.overflow = 'hidden'; //prevents scrollbar from showing
				referenceNodes.profilist_stack.style.height = PUIsync_height*3 + 'px';
			}, false);
			referenceNodes.profilist_stack.addEventListener('mouseleave', function() {
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				referenceNodes.profilist_stack.addEventListener('transitionend', function() {
					referenceNodes.profilist_stack.removeEventListener('transitionend', arguments.callee, false);
					PUIcs.style.overflow = ''; //remove the hidden style i had forced on it
				}, false);
				referenceNodes.profilist_stack.style.height = PUIsync_height + 'px';
			}, false);
			PanelUI.addEventListener('popuphiding', prevHide, false)
		}
		
	},
	unloadFromWindow: function (aDOMWindow) {
		if (!aDOMWindow) {
			return;
		}
		
		var PanelUI = aDOMWindow.document.querySelector('#PanelUI-popup');
		if (PanelUI) {
			PanelUI.removeEventListener('popuphiding', prevHide, false)
			var profilistHBox = aDOMWindow.document.querySelector('#profilist_hbox');
			profilistHBox.parentNode.removeChild(profilistHBox);
		}
	}
};
/*end - windowlistener*/

/*dom insertion library function from MDN - https://developer.mozilla.org/en-US/docs/XUL_School/DOM_Building_and_HTML_Insertion*/
jsonToDOM.namespaces = {
    html: 'http://www.w3.org/1999/xhtml',
    xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
};
jsonToDOM.defaultNamespace = jsonToDOM.namespaces.html;
function jsonToDOM(xml, doc, nodes) {
    function namespace(name) {
        var m = /^(?:(.*):)?(.*)$/.exec(name);        
        return [jsonToDOM.namespaces[m[1]], m[2]];
    }

    function tag(name, attr) {
        if (Array.isArray(name)) {
            var frag = doc.createDocumentFragment();
            Array.forEach(arguments, function (arg) {
                if (!Array.isArray(arg[0]))
                    frag.appendChild(tag.apply(null, arg));
                else
                    arg.forEach(function (arg) {
                        frag.appendChild(tag.apply(null, arg));
                    });
            });
            return frag;
        }

        var args = Array.slice(arguments, 2);
        var vals = namespace(name);
        var elem = doc.createElementNS(vals[0] || jsonToDOM.defaultNamespace, vals[1]);

        for (var key in attr) {
            var val = attr[key];
            if (nodes && key == 'key')
                nodes[val] = elem;

            vals = namespace(key);
            if (typeof val == 'function')
                elem.addEventListener(key.replace(/^on/, ''), val, false);
            else
                elem.setAttributeNS(vals[0] || '', vals[1], val);
        }
        args.forEach(function(e) {
			try {
				elem.appendChild(
									Object.prototype.toString.call(e) == '[object Array]'
									?
										tag.apply(null, e)
									:
										e instanceof doc.defaultView.Node
										?
											e
										:
											doc.createTextNode(e)
								);
			} catch (ex) {
				elem.appendChild(doc.createTextNode(ex));
			}
        });
        return elem;
    }
    return tag.apply(null, xml);
}
/*end - dom insertion library function from MDN*/

function startup(aData, aReason) {
	self.aData = aData; //must go first, because functions in loadIntoWindow use self.aData
	console.log('aData', aData);
	//var css = '.findbar-container {-moz-binding:url(' + self.path.chrome + 'findbar.xml#matchword_xbl)}';
	//var cssEnc = encodeURIComponent(css);
	var newURIParam = {
		aURL: self.aData.resourceURI.spec + 'main.css', //'data:text/css,' + cssEnc,
		aOriginCharset: null,
		aBaseURI: null
	}
	cssUri = Services.io.newURI(newURIParam.aURL, newURIParam.aOriginCharset, newURIParam.aBaseURI);
	myServices.sss.loadAndRegisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.register();
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	
	myServices.sss.unregisterSheet(cssUri, myServices.sss.USER_SHEET);
	
	windowListener.unregister();
}

function install() {}

function uninstall() {}