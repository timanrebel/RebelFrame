var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,

	ImageFactory = require('ti.imagefactory');

/**
 * Media provides a wrapper for the Ti Camera and gallery functions and prepares Media for uploading
 *
 * @class Media
 * @singleton
 */
var Media = module.exports = {
	callback: null,

	newPhoto: function(callback) {
		Media.callback = callback;

		var dialog = Ti.UI.createOptionDialog({
			title: '',
			options: [L('lTakePhoto', 'Take a photo'), L('lChooseFromLibrary', 'Choose from library'), L('Cancel', 'Cancel')],
			cancel: 2
		});
		dialog.addEventListener('click', onUploadDialog);
		dialog.show();
	},

	/**
	 * Acquire media from the device's camera
	 *
	 * @param {Function} successCallback (Optional) The method to call when the request was successfull
	 * @param {Array} acceptedMediaTypes (Optional) The accepted media formats
	 */
	newFromCamera: function(successCallback, acceptedMediaTypes) {
		Ti.Media.showCamera({
			success: successCallback,
			cancel: onCancel,
			error: onError,
			allowEditing: true,
			saveToPhotoGallery: true,
			mediaTypes: acceptedMediaTypes || [Ti.Media.MEDIA_TYPE_PHOTO],
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
		console.log('gallery');

		Ti.Media.openPhotoGallery({
			success: successCallback,
			cancel: onCancel,
			error: onError,
			allowEditing: true,
			saveToPhotoGallery: false,
			mediaTypes: acceptedMediaTypes || [Ti.Media.MEDIA_TYPE_PHOTO],
			videoQuality: Ti.Media.QUALITY_MEDIUM
		});
	},

	/**
	 * Prepare blob for upload by:
	 * - resizing and compressing it on iOS
	 * - creating a temporary file and return the file handler for Android (memory issues)
	 *
	 * @param {Ti.Blob} blob Blob to prepare for upload
	 * @param {Object} options Options
	 * @param {Boolean} [options.square] Whether or not to square the image
	 * @param {Number} [options.maxSize=1280] Maximum size of width or height.
	 *
	 * @return {Object} Compressed blob or file handle on Android
	 */
	prepareBlobForUpload: function(blob, options) {
		var options = options || {},
			maxSize = options.maxSize || 1280,
			width, height,
			compressedBlob;

		// Resize image
		if(options.square) {
			compressedBlob = ImageFactory.imageAsThumbnail(blob, {
				size: maxSize,
				borderSize: 0
			});
		}
		else {
			// Resize image to max maxSize x maxSize
			if (blob.width > blob.height) {
				width = maxSize;
				height = Math.round(maxSize / (blob.width / blob.height));
			} else {
				width = Math.round(maxSize / (blob.height / blob.width));
				height = maxSize;
			}

			compressedBlob = ImageFactory.imageAsResized(blob, {
				width: width,
				height: height
			});
		}

		// Compress blob
		compressedBlob = ImageFactory.compress(compressedBlob, 0.7);

		if (OS_ANDROID) {
			// Write to a temporary file to overcome out of memory problems
			tmpFile = Ti.Filesystem.createTempFile();
			tmpFile.write(compressedBlob);

			return tmpFile;
		} else
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
			thumb = activeMovie.thumbnailImageAtTime(1, Titanium.Media.VIDEO_TIME_OPTION_NEAREST_KEYFRAME);

		activeMovie = null;
		return thumb;
	}
};

function onUploadDialog(evt) {
	this.removeEventListener('click', onUploadDialog);

	console.log(evt);

	if (evt.index === 0)
		Media.newFromCamera(Media.callback);
	else if (evt.index == 1) {
		Media.newFromGallery(Media.callback);
	}
}

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
		message: evt.code == Titanium.Media.NO_CAMERA ?
			'Please run this test on a mobile device' : 'Unexpected error: ' + evt.code
	});
	dialog.show();
}
