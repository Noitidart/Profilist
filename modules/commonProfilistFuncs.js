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
function getSpecificnessForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// only for use on non-ONLY values. meaning if key is specificOnly or unspecificOnly it fails, no need to use this function to determine that
	// requires gKeyInfoStore
	// RETURNS
		// 1 for specific
		// 2 for unspecific
		

	

	
	// :note: :important: this is my NEW determinign factor for specificness of a toggleable (meaning no specificOnly or unspecificOnly). if setting exists in aIniEntry then it is specific. else it is unspecific (regardless if a value exists in aGenIniEntry - as if it doesnt exist it obviously uses the default value) - so therefore it is important to delete key from aIniEntry when togglign to unspecific crossfile-link75748383322222 IGNORE THIS ON RIGHT as this on left ovverides it ---> // :note: :important: this is my determining factor for specificness of non-only pref-like's - if key exists in aGenIniEntry then it is unspecific. because of this its important to clear out genearl when going to specific. link757483833
	if (!(aKeyName in aGenIniEntry) && !(aKeyName in aIniEntry)) {
		// use defaultSpecificness
		if (!gKeyInfoStore[aKeyName].defaultSpecificness) {
			// its unspecific
			return 2;
		} else {
			// its specific
			return 1;
		}
	} else {
		// this if-else statement below is the enacting of crossfile-link75748383322222
		if (aKeyName in aIniEntry) {
			// it is specific
			return 1;
		} else {
			// it is unspecific
			return 2;
		}

		throw new Error('DEV_ERROR - should never ever get here');
	}
	
}

function getPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName) {
	// RETURNS
	//	string value if aKeyName found OR not found but has defaultValue
	//	null if no entry found for aKeyName AND no defaultValue
	
	// aIniEntry is almost always the curProfIniEntry
	

	
	if (gKeyInfoStore[aKeyName].unspecificOnly) {
		// get profile-unspecific value else null
		if (aKeyName in aGenIniEntry) {
			return aGenIniEntry[aKeyName];
		} else {
			if ('defaultValue' in gKeyInfoStore[aKeyName]) {
				return gKeyInfoStore[aKeyName].defaultValue;
			} else {
				// should never happen, as all things set to `pref:true` (meaning not `pref` key missing or not `pref:false` in MainWorker.js `gKeyInfoStore`) must have a defaultValue
				cosnole.error('should never happen, as all things set to `pref:true` (meaning not `pref` key missing or not `pref:false` in MainWorker.js `gKeyInfoStore`) must have a defaultValue, here is the gKeyInfoStore missing the defaultValue:', gKeyInfoStore[aKeyName], 'and aKeyName:', aKeyName);
				return null;
			}
		}
	} else {
		var specificness = getSpecificnessForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName);
		if (specificness == 2) {
			// it is unspecific
			if (aKeyName in aGenIniEntry) {
				return aGenIniEntry[aKeyName];
			} else {
				if ('defaultValue' in gKeyInfoStore[aKeyName]) {
					return gKeyInfoStore[aKeyName].defaultValue;
				} else {
					// should never happen, as all things set to `pref:true` (meaning not `pref` key missing or not `pref:false` in MainWorker.js `gKeyInfoStore`) must have a defaultValue
					cosnole.error('should never happen, as all things set to `pref:true` (meaning not `pref` key missing or not `pref:false` in MainWorker.js `gKeyInfoStore`) must have a defaultValue, here is the gKeyInfoStore missing the defaultValue:', gKeyInfoStore[aKeyName], 'and aKeyName:', aKeyName);
					return null;
				}
			}
		} else {
			// it is specific
			if (aKeyName in aIniEntry) {
				return aIniEntry[aKeyName];
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

function setPrefLikeValForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName, aNewVal, aNewSpecifincess_optional) {
	// aNewSpecifincess_optional is optional arg, if not supplied specificness is unchanged. it must be 2 for unspecific or 1 for specific
	// aIniEntry and aGenIniEntry must be PASSED BY REFERENCE to the ini obj you want to set in // im thinking it HAS to be gIniObj, so far thats all im doing and it makes sense as i then setState to JSON.parse(JSON.stringify(gIniObj)
	
	// aNewVal if toggling specificness to unspecific - added in on 021416 revisit link11194229319
	
	// RETURNS
	//	undefined
	
	// aIniEntry is almost always the curProfIniEntry
	

	

	
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

	} else if (gKeyInfoStore[aKeyName].specificOnly) {
		aIniEntry[aKeyName] = aNewVal;

	} else {
		// figure out specificness
		var specificness;
		if (aNewSpecifincess_optional !== undefined) {

			specificness = aNewSpecifincess_optional;
		} else {
			specificness = getSpecificnessForKeyInIniEntry(aIniEntry, aGenIniEntry, aKeyName);
		}
		if (specificness == 2) {
			// it is unspecific
			if (aNewSpecifincess_optional !== undefined) {
				// because aNewSpecifincess_optional is set, i assume its toggling thus it follows that... see comment on line below
				// if going unspecific, then clearing out specific value is CRITICAL per crossfile-link75748383322222 this overrides my old thinking here ---> // if going to unspecific, then clearing out the specific values is not important, but its good practice per link757483833
				delete aIniEntry[aKeyName];
				// aGenIniEntry[aKeyName] = aNewVal; // aNewVal is ignored when toggling to unspecific link11194229319
			} else {
				aGenIniEntry[aKeyName] = aNewVal;

			}
		} else {
			// it is specific
			// // if (aNewSpecifincess_optional !== undefined) {
				// // because aNewSpecifincess_optional is set, i assume its toggling thus it follows that... see comment on line below
				// // if going to specific, then leave the general value, but set the ini value crossfile-link75748383322222 this new thinking overrides my old thinkng here at right ---> if going to specific, then clear out the general this is :note: :important: link757483833
				// // delete aGenIniEntry[aKeyName];
			// // }
			aIniEntry[aKeyName] = aNewVal;

		}
	}
}


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