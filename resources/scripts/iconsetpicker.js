// depnds on common helper functions:
	//	justFormatStringFromName
	//	validateOptionsObj
	
XPCOMUtils.defineLazyGetter(myServices, 'sb_ip', function () { return Services.strings.createBundle(core.addon.path.locale + 'iconsetpicker.properties?' + core.addon.cache_key); /* Randomize URI to work around bug 719376 */ });
const gGithubDownloadPrefix = 'prflst-_-dl_-_'; // cross file link1110238471

var IPStore = {
	init: function(aTargetElement, aSelectCallback, aAppliedSlug, aUnselectCallback, aDirection, aOptions={}) {
		// default aDirection is 0 meaning it opens upwards (arrow on bottom)
			// can set to 1, which means it will open rightwards (arrow on left side)
		// aSelectCallback is called when an icon is applied, it is passed two arguments, aSelectCallback(aImgSlug, aImgObj)
		// aTargetElement is where the arrow of the dialog will point to
		// must have iconsetpicker.css loaded in the html
		console.log('aTargetElement:', uneval(aTargetElement));
		
		var cOptionsDefaults = {
			aDirection: 0,
			insertId: null,
			onUninit: null // callback to run when picker is closed
		};
		
		validateOptionsObj(aOptions, cOptionsDefaults);
		
		var wrap = document.createElement('div');
		wrap.setAttribute('class', 'iconsetpicker-wrap');

		var cover = document.createElement('div');
		cover.setAttribute('class', 'iconsetpicker-cover');
		document.body.appendChild(cover);
		
		if (aOptions.insertId) {
			var insertEl = document.getElementById(aOptions.insertId);
			insertEl.appendChild(wrap);
			var cumOffset = {
				top: 0,
				left: 0
			};
			var cOffsetEl = aTargetElement;
			while (cOffsetEl && (cOffsetEl != insertEl || cOffsetEl != insertEl.offsetParent)) {
				cumOffset.top += cOffsetEl.offsetTop;
				cumOffset.left += cOffsetEl.offsetLeft;
				console.log('cOffsetTop:', cOffsetEl.offsetTop, 'cOffsetLeft:', cOffsetEl.offsetLeft, 'cumOffsetTop:', cumOffset.top, 'cumOffsetLeft:', cumOffset.left, 'cOffsetEl:', cOffsetEl.nodeName, uneval(cOffsetEl.classList), cOffsetEl.getAttribute('id'));
				cOffsetEl = cOffsetEl.offsetParent;
			}
		} else {
			aTargetElement.parentNode.appendChild(wrap);
		}
		
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
			
			if (aOptions.onUninit) {
				aOptions.onUninit();
			}
		};
		
		cover.addEventListener('mousedown', uninit, false);
		// document.addEventListener('keypress', uninitKeypress, false);

		var myIPProps = {
			uninit:uninit,
			select_callback:aSelectCallback
		};
		
		if (!aDirection) {
			// todo - implement the cumOffset here
			wrap.style.left = (aTargetElement.offsetLeft - ((100 + 150 + 200) / 2) + (10 / 2 / 2)) + 'px'; // 200 is width of .iconsetpicker-subwrap and 30 is width of .iconsetpicker-arrow
			wrap.style.bottom = (aTargetElement.offsetTop + aTargetElement.offsetHeight + 2) + 'px';
		} else {
			// wrap.style.top = (aTargetElement.offsetTop - 120)+ 'px'; // height of .iconsetpicker-preview and .iconsetpicker-dirlist + some for the controls
			// wrap.style.left = (aTargetElement.offsetLeft + aTargetElement.offsetWidth + 2) + 'px';
			wrap.style.top = (cumOffset.top - 120)+ 'px'; // height of .iconsetpicker-preview and .iconsetpicker-dirlist + some for the controls
			wrap.style.left = (cumOffset.left + aTargetElement.offsetWidth + 2) + 'px';
			myIPProps.pDirection = aDirection;
		}
		

		
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
				if (typeof(aReadImgsInDirArg) == 'string' && aReadImgsInDirArg.indexOf('/Noitidart/Firefox-PNG-Icon-Collections') == -1) {
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
							console.log('loaded img:', uneval(this));
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.onabort = function() {
							this.imgloadreason = 'abort';
							console.log('abort img:', uneval(this));
							this.deferred.resolve('abort');
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.onerror = function() {
							this.imgloadreason = 'not-img';
							console.log('error img:', uneval(this));
							this.deferred.resolve('not-img');
						}.bind(cPathKeyImgObj[aPartialImgObj[i]]);
						cPathKeyImgObj[aPartialImgObj[i]].img.src = aPartialImgObj[i];
						promiseAllArr_loadImgs.push(cPathKeyImgObj[aPartialImgObj[i]].deferred.promise);
					}
					var promiseAll_loadImgs = Promise.all(promiseAllArr_loadImgs);
					promiseAll_loadImgs.then(
						function(aVal) {
							console.log('Fullfilled - promiseAll_loadImgs - ', uneval(aVal));
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
							console.error('Caught - promiseAll_loadImgs - ', uneval(rejObj));
						}
					);
				} else {
					// if profilist_github (meaning /Noitidart/Firefox-PNG-Icon-Collections) then it also returns a full imgObj
					var aImgObj = aErrorOrImgObj;
					console.log('got aImgObj:', uneval(aImgObj));
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
				console.error('componentDidUpdate! and prevAndNowStateObj:', uneval({prev:aPrevStateObj, now:this.state}));
				// check if pref state sPreview had imgObj and if imgObj has blob urls. if true then -- check if sPreview is now changed, if it is then tell worker to revokeObjectURL on those blob urls
				if (aPrevStateObj.sPreview && typeof(aPrevStateObj.sPreview) != 'string' && aPrevStateObj.sPreview.imgObj) {
					var urlsInPrevState = [];
					var urlsInPrevAreBlobs = false;
					for (var aSize in aPrevStateObj.sPreview.imgObj) {
						var cUrl = aPrevStateObj.sPreview.imgObj[aSize];
						urlsInPrevState.push(cUrl);
						if (cUrl.indexOf(gGithubDownloadPrefix) > -1) {
							urlsInPrevAreBlobs = true;
						}
					}
					console.log('urlsInPrevState:', uneval(urlsInPrevState));
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
								console.log('urlsInNowState:', uneval(urlsInNowState));
								
								for (var i=0; i<urlsInPrevState.length; i++) {
									if (urlsInNowState.indexOf(urlsInPrevState[i]) == -1) {
										console.log('old url not found in new urls, old url:', uneval(urlsInPrevState[i]));
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
				//	pDirection
				var cProps = {
					transitionName:'iconsetpicker-initanim',
					transitionEnterTimeout:200,
					transitionLeaveTimeout:200,
					className:'iconsetpicker-animwrap'
				}
				
				switch (this.props.pDirection) {
					case 1:
						
							// open rightwards, arrow on left
							cProps.className += ' iconsetpicker-direction-rightwards';
							
						break;
					default:
						// do nothing, which means open upwards, arrow on bottom
							
							cProps.className += ' iconsetpicker-direction-upwards';
				}

				return React.createElement(React.addons.CSSTransitionGroup, cProps,
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
					this.props.uninit(null, true);
				}
			},
			clickDelete: function() {
				var cImgSlug = getSlugOfSlugDirPath(this.props.sDirSelected);
				
				// premptively remove from gui
				var new_sDirSubdirs = this.props.sDirSubdirs.filter(function(aElVal) {
					return aElVal.path != this.props.sDirSelected;
				}.bind(this));
				console.log('new_sDirSubdirs:', uneval(new_sDirSubdirs));

				IPStore.setState({
					sPreview: null,
					sDirSelected: null,
					sDirSubdirs: new_sDirSubdirs
				});
					
				sendAsyncMessageWithCallback(contentMMFromContentWindow_Method2(window), core.addon.id, ['callInPromiseWorker', ['deleteIconset', cImgSlug]], bootstrapMsgListener.funcScope, function(aErrorObjOrIni) {
					console.error('ok back from deleteIconset. so now in framescript');
					// if gIniObj was updated, then aErrorObjOrIni is gIniObj
					// else it is null
					if (Array.isArray(aErrorObjOrIni)) {
						gIniObj = aErrorObjOrIni;
						MyStore.setState({
							sIniObj: JSON.parse(JSON.stringify(aErrorObjOrIni))
						})
					}
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
							var specialTxtNote;
							if (!this.props.sDirSelected) {
								disbleRenameDelete = true;
							} else {
								if (this.props.sDirSelected.indexOf('chrome://profilist/content/resources/images/channel-iconsets/') > -1) {
									disbleRenameDelete = true;
								} else {
									// check if this imgSlug is in use by a ProfilistBuilds entry, if it is then i mark it undeleteable // cross file link171111174957393
									var gCurProfIniEntry = getIniEntryByNoWriteObjKeyValue(gIniObj, 'currentProfile', true);
									var gGenIniEntry = getIniEntryByKeyValue(gIniObj, 'groupName', 'General');
									var j_gProfilistBuilds = JSON.parse(getPrefLikeValForKeyInIniEntry(gCurProfIniEntry, gGenIniEntry, 'ProfilistBuilds'));
									console.error('j_gProfilistBuilds:', j_gProfilistBuilds);
									
									var imgSlugOfSelectedDir = this.props.sDirSelected.substr(core.profilist.path.images.length + core.os.filesystem_seperator.length);
									console.error('imgSlugOfSelectedDir:', imgSlugOfSelectedDir);
									if (getBuildEntryByKeyValue(j_gProfilistBuilds, 'i', imgSlugOfSelectedDir)) {
										disbleRenameDelete = true;
										specialTxtNote = myServices.sb_ip.GetStringFromName('inuse');
									}
								}
							}
							
							// cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('rename'), disabled:((disbleRenameDelete) ? true : false)}));

							cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('delete') + (specialTxtNote ? ' ' + specialTxtNote : ''), disabled:((disbleRenameDelete) ? true : false), onClick:this.clickDelete}));
							if (this.props.sAppliedSlugDir && this.props.sDirSelected && this.props.sAppliedSlugDir == this.props.sDirSelected) {
								disableApply = true;
								if (this.props.unselect_callback) {
									cChildren.push(React.createElement('input', {type:'button', value:myServices.sb_ip.GetStringFromName('unselect'), onClick:this.clickUnselect}));
								}
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
						console.log('this.props.sPreview:', uneval(this.props.sPreview));
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
					console.log('this.props of dbl clickable:', uneval(this.props));
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