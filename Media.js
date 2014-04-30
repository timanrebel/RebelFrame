var Alloy = require('alloy'), 
	_ = Alloy._, 
	Backbone = Alloy.Backbone;

/**
 * Media provides a wrapper for the Ti Camera and gallery functions and prepares Media for uploading
 * 
 * @class Media
 * @singleton
 */
var Media = {
	/**
	 * Acquire media from the device's camera
	 * 
	 * @param {Function} successCallback (Optional) The method to call when the request was successfull
	 * @param {Array} acceptedMediaTypes (Optional) The accepted media formats
	 */
	newFromCamera: function(successCallback, acceptedMediaTypes) {
		Ti.Media.showCamera({
			success: function(evt) {
				successCallback(evt, 'camera');
			},
			cancel: onCancel,
			error: onError,
			allowEditing: false,
			saveToPhotoGallery: true,
			mediaTypes: acceptedMediaTypes || [Ti.Media.MEDIA_TYPE_VIDEO, Ti.Media.MEDIA_TYPE_PHOTO],
			videoQuality: Ti.Media.QUALITY_MEDIUM
		});
	},
	
	/**
	 * Acquire media from the device's gallery
	 * 
	 * @param {Function} successCallback (Optional) The method to call when the request was successfull
	 * @param {Array} acceptedMediaTypes (Optional) The accepted media formats
	 */
	newFromGallery: function(successCallback, acceptedMediaTypes) {
		Ti.Media.openPhotoGallery({
			success: function(evt) {
				successCallback(evt, 'gallery');
			},
			cancel: onCancel,
			error: onError,
			allowEditing: false,
			saveToPhotoGallery: false,
			mediaTypes: acceptedMediaTypes || [Ti.Media.MEDIA_TYPE_VIDEO, Ti.Media.MEDIA_TYPE_PHOTO],
			videoQuality: Ti.Media.QUALITY_MEDIUM
		});
	},
	
	/**
	 * Prepare blob for upload by:
	 * - resizing and compressing it on iOS
	 * - creating a temporary file and return the file handler for Android (memory issues)
	 * 
	 * @param {Object} blob
	 * @return {Object} Compressed blob or file handler on Android
	 */
	prepareBlobForUpload: function(blob) {
		if(!blob) {
			return null;
		}
		
		var maxSize = 720, //1280,
			width, height,
			resizedBlob,
			compressedBlob;
			
		// Resize image to max 1280x1280
		if (OS_IOS && blob.width !== 0 && blob.height !== 0) {
			
			if (blob.width > blob.height) {
				width = maxSize;
				height = Math.round(maxSize/(blob.width/blob.height));
			}
			else {
				width = Math.round(maxSize/(blob.height/blob.width));
				height = maxSize;
			}
			compressedBlob = blob.imageAsResized(width, height);
		} 
		else if (OS_ANDROID) {
			// Write to a temporary file to overcome out of memory problems
			compressedBlob = Ti.Filesystem.createTempFile();
			compressedBlob.write(blob);
		}
		else {
			compressedBlob = blob;
		}
		
		return compressedBlob;
	},
	
	/**
	 * Fetch the thumbnail for the provided video
	 * 
	 * @param {Ti.Media} media Media object representing a video
	 * @return {Ti.Blobl} Generated thumbnail
	 */
	getVideoThumbnail: function(media) {
		var activeMovie = Ti.Media.createVideoPlayer({
			    top: 0,
			    left: 0,
			    width: '100%',
			    height: '100%',
			    backgroundColor: '#111',
			    autoplay: false,
			    mediaControlStyle: Ti.Media.VIDEO_CONTROL_NONE,
			    scalingMode: Ti.Media.VIDEO_SCALING_ASPECT_FIT,
			    media: media
			}),
			thumb = activeMovie.thumbnailImageAtTime (1, Titanium.Media.VIDEO_TIME_OPTION_NEAREST_KEYFRAME);
		
		activeMovie = null;
		return thumb;
	}
};

/**
 * React to the retrieval of a media item being cancelled
 * @private
 * 
 * @param {Object} event The event that contains the media information
 * @param {String} source The source of the media (either 'camera', or 'gallery')
 */
function onCancel(evt, source) {}

/**
 * React to the retrieval of a media item having failed
 * @private
 * 
 * @param {Object} event The event that contains the media information
 * @param {String} source The source of the media (either 'camera', or 'gallery')
 */
function onError(evt, source) {
	var dialog = Ti.UI.createAlertDialog({
		title: 'Camera',
		message:  evt.code == Titanium.Media.NO_CAMERA ? 'Please run this test on a mobile device' : 'Unexpected error: ' + evt.code
	});
	dialog.show();
}

module.exports = Media;