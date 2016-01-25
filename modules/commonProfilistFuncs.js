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
			aSizersArr.push(parseInt(aSize));
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
		if (nSize === undefined) {
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
// END - slug stuff
// START - aIniObj actors

// END - aIniObj end