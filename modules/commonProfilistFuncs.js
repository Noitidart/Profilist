// these are functions that can be commonly used between MainWorker.js, html.js, and cp.js
// START - slug stuff
function getImgSrcForSize(aImgObj, aDesiredSize, aScalingAlgo) {
	// does not yet support svg
	
	// algo calculation is based on whichNameToScaleFromToReachGoal
	
	// aImgObj is return value from MainWorker getImgSrcsForImgSlug
	// aScalingAlgo default is 0, meaning jagged, so it will give nearest larger (if largers exist). if 1, then it will give nearest smaller (if smallers exist)
	// will return an object. the path that is aSize or nearest to aSize. if its near then
		// {
		// 	src: string, a path that you can stick into <img src="HERE" />
		//	resize: bool, false if aSize exact match was found. true if match was not found. so you should add to <img > the width and height attribute of aSize
		// }
	

	var aSizesArr = []; // sorted sizes
	for (var aSize in aImgObj) {
		if (!isNaN(aSize)) {
			if (aSize == aDesiredSize) {
				return {
					src: aImgObj[aSize],
					resize: false
				};
			}
			aSizesArr.push(parseInt(aSize));
		}
	}
	aSizesArr.sort(function(a, b) {
		return a - b; // sort asc
	});
	
	var nSizeLarger; // nSize means nearestSize that is larger
	var nSizeSmaller; // nearest size that is smaller
	
	for (var i=0; i<aSizesArr.length; i++) {
		var aSize = aSizesArr[i];
		// if (aSize == aDesiredSize) { // this wont happen because i return above, but in future when i update this for svg support i might need this
		if (nSizeLarger === undefined && nSizeSmaller === undefined) {
			nSizeLarger = aSize;
			nSizeSmaller = aSize;
		} else {
			if (aSize < aDesiredSize) {
				nSizeSmaller = aSize;
			} else {
				nSizeLarger = aSize;
			}
		}

		if (nSizeLarger === undefined || nSizeSmaller === undefined) {
			// one or the other is defined
			if (nSizeLarger !== undefined) {
				return {
					src: aImgObj[nSizeLarger],
					resize: true
				};
			} else {
				return {
					src: aImgObj[nSizeSmaller],
					resize: true
				};
			}
		} else {
			// neither is undefined
			if (aScalingAlgo) {
				// blury
				return {
					src: aImgObj[nSizeSmaller],
					resize: true
				};
			} else {
				// jagged
				return {
					src: aImgObj[nSizeLarger],
					resize: true
				};
			}
		}
	}
}

function getSlugOfSlugDirPath(aSlugDirPath) {
	// aSlugDirPath is a chrome or plat path to the dir of the slug
	if (aSlugDirPath.indexOf(core.profilist.path.images) === 0) {
		return aSlugDirPath.substr(core.profilist.path.images.length + 1); // + 1 because core.profilist.path.images does not have the trailing slash
	} else if (aSlugDirPath.indexOf(core.addon.path.images) === 0) {
		return aSlugDirPath.substr((core.addon.path.images + '/channel-iconsets').length);
	}
	throw new Error('should never get here');
}

function isSlugInChromeChannelIconsets(aPossibleSlug) {
	// if returns true, it means aPossibleSlug images dir is in ```core.addon.path.images + 'channel-iconsets/' + aSlug + '/' + aSlug + '_##.png'```
	switch (aPossibleSlug) {
		case 'release':
		case 'beta':
		case 'dev':
		case 'aurora':
		case 'nightly':
			return true;
		default:
			return false;
	}
}
// END - slug stuff
// START - aIniObj actors
function getPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	
	// aIniEntry is almost always the curProfIniEntry
	
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

function setPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName, aNewVal, aNewSpecifincess_optional, aIniObj_neededWhenTogglignSpecificness) {
	// aNewSpecifincess_optional is optional arg, if not supplied specificness is unchanged. it must be 2 for unspecific or 1 for specific
	// aIniEntry and aGenIniEntry must be PASSED BY REFERENCE to the ini obj you want to set in // im thinking it HAS to be gIniObj, so far thats all im doing and it makes sense as i then setState to JSON.parse(JSON.stringify(gIniObj)
	
	// RETURNS
	//	undefined
	
	// aIniEntry is almost always the curProfIniEntry
	
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
// END - aIniObj end

// START - jProfilistBuilds actors
function getBuildValByTieId(aJProfilistBuilds, aTieId, aKeyName) {
	// returns null if aTieId is not found, or undefined if aKeyName is not found ELSE value
	for (var i=0; i<aJProfilistBuilds.length; i++) {
		if (aJProfilistBuilds[i].id == aTieId) {
			return aJProfilistBuilds[i][aKeyName]; // if aKeyName does not exist it returns undefined
		}
	}
	
	return null;
}

function getBuildEntryByKeyValue(aJProfilistBuilds, aKeyName, aKeyValue) {
	// returns null if entry with aKeyName having a val of aKeyValue is not found, else it returns that entry
	for (var i=0; i<aJProfilistBuilds.length; i++) {
		if (aJProfilistBuilds[i][aKeyName] == aKeyValue) {
			return aJProfilistBuilds[i];
		}
	}
	
	return null;
}
// END - jProfilistBuilds actors