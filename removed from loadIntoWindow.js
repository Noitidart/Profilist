		if (PanelUI) {
			var domWinUtils = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
			domWinUtils.loadSheet(cssUri, domWinUtils.AUTHOR_SHEET); //0 == agent_sheet 1 == user_sheet 2 == author_sheet
			//var PUIsync = PanelUI.querySelector('#PanelUI-fxa-status');
//			//console.info('PUIsync on start up = ', PUIsync);

			var PUIf = PanelUI.querySelector('#PanelUI-footer');
			var PUIcs = PanelUI.querySelector('#PanelUI-contents-scroller');
			
			
//			//console.log('PUIcs.style.width',PUIcs.style.width);
			var profilistHBoxJSON =
			['xul:vbox', {id:'profilist_box', class:'', style:''},
				['xul:stack', {key:'profilist_stack'},
					//['xul:box', {style:tbb_box_style, class:'profilist-tbb-box profilist-loading', key:'profilistLoading', disabled:'true'}, ['xul:toolbarbutton', {label:'Loading Profiles...', class:'profilist-tbb', style:tbb_style}]]
					['xul:box', {style:tbb_box_style, class:'profilist-tbb-box', id:'profilist-loading', key:'profilistLoading', disabled:'true', label:'Loading Profiles...'}]
				]
			];
			
			//set dev mode, and current builds icon on the json template
			if (myPrefListener.watchBranches[myPrefBranch].prefNames['dev'].value == true) {
				profilistHBoxJSON[1].class = 'profilist-dev-enabled';
				//start - figure out icon for this build
				checkIfIconIsRight(myPrefListener.watchBranches[myPrefBranch].prefNames['dev-builds'].value, null, false);
				profilistHBoxJSON[1].style = 'background-image:url("' + currentThisBuildsIconPath + '")';
				//end - figure out icon for this build
			}
			
			var referenceNodes = {};
			PUIf.insertBefore(jsonToDOM(profilistHBoxJSON, aDOMWindow.document, referenceNodes), PUIf.firstChild);

			//PUIsync_height = referenceNodes.profilistLoading.boxObject.height;
			//myServices.as.showAlertNotification(self.aData.resourceURI.asciiSpec + 'icon.png', self.name + ' - ' + 'DEBUG', 'PUIsync_height set to = ' + PUIsync_height, false, null, null, 'Profilist');
			
			var THIS = PanelUI.querySelector('#PanelUI-multiView');
			//todo: probably should only do this overflow stuff if scrollbar is not vis prior to mouseenter, but i think for usual case scrollbar is not vis.
			referenceNodes.profilist_stack.addEventListener('mouseenter', function() {
				//console.log('entered');
				if (referenceNodes.profilist_stack.lastChild.hasAttribute('disabled')) {
					return;
				}
				var PUIcs_scrollsVis = PUIcs.scrollHeight - PUIcs.clientHeight > 0 ? true : false;
//				console.log('PUIcs_scrollsVis = ', PUIcs_scrollsVis);
				if (!PUIcs_scrollsVis) {
//					console.error('hidding overflow');
					PUIcs.style.overflow = 'hidden'; //prevents scrollbar from showing
				}
				
				
				var cPopHeight = THIS._viewStack.clientHeight;
				var heightChildren = PUIf.childNodes;
				var expandedFooterHeight = 0;
				var profilistBoxFound = false;
				for (var i=0; i<heightChildren.length; i++) {
				    if (!profilistBoxFound && heightChildren[i].getAttribute('id') == 'profilist_box') {
				        expandedFooterHeight += expandedheight;
				        profilistBoxFound = true;
				    } else {
				       //expandedFooterHeight += heightChildren[i].boxObject.height;
				       var childHeight = parseFloat(aDOMWindow.getComputedStyle(heightChildren[i],null).getPropertyValue('height'));
				       if (isNaN(childHeight)) {
//				       	console.log('childHeight is NaN so set it to 0. childHeight = ', childHeight)
				       	childHeight = 0;
				       }
//				       console.info('PARSEFLOAT = ' + parseFloat(childHeight))
				       expandedFooterHeight += Math.floor(parseFloat(childHeight));
				    }
				}
				
//				console.info('panel height no expanded = ' + cPopHeight + '\nfooter height with profilist box expanded = ' + expandedFooterHeight);
				//me.alert(scopeProfilist.expandedheight)
				if (cPopHeight < expandedFooterHeight) {
//				    console.info('NEEDS adjust')
					THIS._ignoreMutations = true;
					THIS._mainViewHeight = THIS._viewStack.clientHeight;
					THIS._transitioning = true;
						
					//start - figure out cubic bezier and timings
					var maxStackHeightBeforeOverflow = PUIcs.boxObject.height - collapsedheight;
					lastMaxStackHeight = maxStackHeightBeforeOverflow;
					console.log('maxStackHeightBeforeOverflow:', maxStackHeightBeforeOverflow);
					
					//when will stack get to this height?
					var finalStackHeight = expandedheight - collapsedheight;
					var finalTime = 300;
					
					console.log('finalStackHeight:', finalStackHeight);

					var theBezier = {
						xs: cubicBezier_ease.xs.map(function(v) {
							return v * finalTime;
						}),
						ys: cubicBezier_ease.ys.map(function(v) {
							return v * finalStackHeight;
						})
					};

					var timeAtMaxHeightBeforeOverflow = getValOnCubicBezier_givenXorY({y:maxStackHeightBeforeOverflow, cubicBezier:theBezier});

					console.log('time it stack takes to reach max height before overflow ,percentOfFinalTime:', timeAtMaxHeightBeforeOverflow);
					//the transition duration of the panel should be finalTime - timeAtMaxHeightBeforeOverflow.x
					//figure out cubic bezier
				
					var fT_minus_timeAtMaxH = finalTime - timeAtMaxHeightBeforeOverflow.x;
					
					console.log('duration of panel height increase anim is, fT_minus_timeAtMaxH:', fT_minus_timeAtMaxH);
					
					var splitRes = splitCubicBezier({
					  z: timeAtMaxHeightBeforeOverflow.percent,
					  x: theBezier.xs,
					  y: theBezier.ys,
					  fitUnitSquare: false
					});
					console.log('splitRes no fit:', splitRes);
					
					var splitRes = splitCubicBezier({
					  z: timeAtMaxHeightBeforeOverflow.percent,
					  x: ease.xs,
					  y: ease.ys,
					  fitUnitSquare: true
					});
					console.log('splitRes fitted using ease:', splitRes);
					
					var useCubicBezier = 'cubic-bezier(' + splitRes.right.slice(2, 6).map(function(v){return v.toFixed(2)}) + ')';
					console.log('cubic-bezier:', useCubicBezier);
					console.log('rounded duration:', Math.round(fT_minus_timeAtMaxH));
					console.log('rounded delay:', Math.round(timeAtMaxHeightBeforeOverflow.x));
					//end - figure out cubic bezier and timings
					
					THIS._viewContainer.style.transition = 'height ' + Math.round(fT_minus_timeAtMaxH*1) + 'ms ' + useCubicBezier + ' ' + Math.round(timeAtMaxHeightBeforeOverflow.x) + 'ms';
					
					//THIS._viewContainer.style.transition = 'height 300ms'; //need to make this take longer than the 0.25s of the profilist_box expand anim so it doesnt show any white space
					THIS._viewContainer.addEventListener('transitionend', function trans() {
						THIS._viewContainer.removeEventListener('transitionend', trans);
						//THIS._ignoreMutations = false; //important to set this to false before setting THIS._transitioning to false, because when set ignoreMut to false it runs `syncContainerWithMainView` and if it finds ignoreMut is false AND showingSubView is false AND transitioning is false then it will set the panel height to regular without anim
						THIS._transitioning = false;
					});
					
					
					
					THIS._viewContainer.style.height = Math.round(expandedFooterHeight) + 'px';
				} else {
//				    console.info('no need for adjust')
				}

				
//				console.log('expandedheight on expand = ' + expandedheight);
//				console.warn('setting stack height to expandedheight which = ' + expandedheight);
				referenceNodes.profilist_stack.style.height = expandedheight + 'px';
				referenceNodes.profilist_stack.lastChild.classList.add('perm-hover');
			}, false);
			referenceNodes.profilist_stack.addEventListener('mouseleave', function() {
				//console.log('left');
				//commenting out this block as using services prompt for renaming right now
				// if (aDOMWindow.ProfilistInRenameMode) {
//					// console.log('in rename mdoe so dont close');
					// return;
				// }
				if (!collapsedheight) {
//					console.log('collapsedheight is unknown so not doing mouseleave', 'collapsedheight=', collapsedheight)
					return;
				}
				var cStackHeight = parseInt(referenceNodes.profilist_stack.style.height);
//				console.log('cStackHeight = ', cStackHeight);
//				console.log('collapsedheight = ', collapsedheight);
				if (cStackHeight == collapsedheight) {
//					console.log('cStackheight is already collapsedheight so return');
					return;
				}
				if (THIS._ignoreMutations) { //meaning that i did for reflow of panel
					console.info('YES need to reflow panel back to orig height');

					//start - figure out cubic bezier and timings
					var maxStackHeightBeforeOverflow = lastMaxStackHeight;
					
					console.log('maxStackHeightBeforeOverflow:', maxStackHeightBeforeOverflow);
					
					//when will stack get to this height?
					var finalStackHeight = expandedheight - collapsedheight;
					var finalTime = 300;
					
					console.log('finalStackHeight:', finalStackHeight);

					var theBezier = {
						xs: cubicBezier_ease.xs.map(function(v) {
							return v * finalTime;
						}),
						ys: cubicBezier_ease.ys.map(function(v) {
							return v * finalStackHeight;
						})
					};

					var stackHeightOfJustExpanded = finalStackHeight - maxStackHeightBeforeOverflow;
					console.log('panel has to shrink this much: ', stackHeightOfJustExpanded);
					var timeAtMaxHeightBeforeOverflow = getValOnCubicBezier_givenXorY({y:stackHeightOfJustExpanded, cubicBezier:theBezier});
					console.log('time it stack takes to reach max height before overflow ,percentOfFinalTime:', timeAtMaxHeightBeforeOverflow);
					
					var splitRes = splitCubicBezier({
					  z: timeAtMaxHeightBeforeOverflow.percent,
					  x: theBezier.xs,
					  y: theBezier.ys,
					  fitUnitSquare: false
					});
					console.log('splitRes no fit:', splitRes);
					
					var splitRes = splitCubicBezier({
					  z: timeAtMaxHeightBeforeOverflow.percent,
					  x: ease.xs,
					  y: ease.ys,
					  fitUnitSquare: true
					});
					console.log('splitRes fitted using ease:', splitRes);
					
					var useCubicBezier = 'cubic-bezier(' + splitRes.left.slice(2, 6).map(function(v){return v.toFixed(2)}) + ')';
					console.log('cubic-bezier:', useCubicBezier);
					console.log('rounded duration:', Math.round(timeAtMaxHeightBeforeOverflow.x));
					
					THIS._viewContainer.style.transition = 'height ' + Math.round(timeAtMaxHeightBeforeOverflow.x) + 'ms ' + useCubicBezier;
					//end - figure out cubic bezier and timings
					
					
					THIS._transitioning = true;
					//THIS._viewContainer.style.transition = 'height 150ms'; //need to make this take quicker than the 0.25s of the profilist_box expand anim so it doesnt show any white space
					THIS._viewContainer.addEventListener('transitionend', function trans() {
						THIS._viewContainer.removeEventListener('transitionend', trans);
						THIS._viewContainer.style.transition = '';
						THIS._ignoreMutations = false; //important to set this to false before setting THIS._transitioning to false, because when set ignoreMut to false it runs `syncContainerWithMainView` and if it finds ignoreMut is false AND showingSubView is false AND transitioning is false then it will set the panel height to regular without anim
						THIS._transitioning = false;
					});
					
					THIS._viewContainer.style.height = THIS._mainViewHeight + 'px';
				}
				referenceNodes.profilist_stack.addEventListener('transitionend', function(e) {
					if (e.propertyName != 'height') { //can further check to see if e.originalTarget == referenceNodes.profilist_stack but because thats the only one with height transition im just testing this property as i think comparing two dom nodes is much harder on perf than is comparing string value of propertyName. its opacity of the submenu thats triggering the first transitionend anyways.
//						console.warn('skipping. tranitionend happend but probably not for referenceNodes.profilist_stack as its propertyName is not height', 'e:', e);
						return;
					}
					referenceNodes.profilist_stack.removeEventListener('transitionend', arguments.callee, false);
//					console.log('running transitionend func step 2')
					if (referenceNodes.profilist_stack.style.height == collapsedheight + 'px') {
						if (PUIcs.style.overflow == 'hidden') {
//							console.error('showing overflow');
							PUIcs.style.overflow = ''; //remove the hidden style i had forced on it
						}
					} else {
//						console.info('overflow not reset as height is not collapsed height (' + collapsedheight + ') but it is right now = ', referenceNodes.profilist_stack.style.height);
					}
				}, false);
//				console.warn('setting stack height to collapsedheight which = ' + collapsedheight);
				referenceNodes.profilist_stack.style.height = collapsedheight + 'px';
//				console.log('collapsed height on collapse == ', 'stack.boxObject.height = ', referenceNodes.profilist_stack.boxObject.height, 'stack.style.height = ', referenceNodes.profilist_stack.style.height);
				referenceNodes.profilist_stack.lastChild.classList.remove('perm-hover');
			}, false);
			//PanelUI.addEventListener('popuphiding', prevHide, false);