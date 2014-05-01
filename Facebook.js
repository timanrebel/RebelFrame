var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	fbSDK = require('facebook'),
	Acl = require('RebelFrame/Acl');

/**
 * Facebook provides a wrapper for the Facebook SDK and Ti Facebook module.
 *
 * @class Facebook
 * @singleton
 */
var FB = {
	appId: Alloy.CFG.facebook.appId,
	permissions: Alloy.CFG.facebook.permissions,

	login: function(options) {
		// Wrap the success function
		options.success = _.wrap(options.success, function(func, userData) {
			// Call register function on the Cloud API
			Acl.registerUserWithCloud(userData, {
				success: func,
				error: options.error,
				scope: options.scope
			});
		});

		// Make the call using the FB SDK
		_authorize(options);
	},

	connect: function(options) {
		// Wrap the success function
		options.success = _.wrap(options.success, function(func, userData) {
			// Call connect function on the Cloud API
			Acl.connectSocialMediaToUser(userData, {
				success: func,
				error: options.error,
				scope: options.scope
			});
		});

		// Make the call using the FB SDK
		_authorize(callbackObj);
	},

	requestWriteAccess: function(callback) {
		if (fbSDK.loggedIn)
			_reAuthorize(callback);
		else
			_authorize({
				success: function(userData) {
					_reAuthorize(callback);
				},
				error: function(evt) {

				},
				scope: FB
			});
	},

	isLoggedin: function() {
		return fbSDK.loggedIn;
	},

	getPermissions: function() {
		return fbSDK.permissions;
	},

	hasWritePermissions: function() {
		return _.indexOf(fbSDK.permissions, FB.permissions.write[0]) !== -1;
	},

	watchedVideo: function(video) {
		if (!Ti.App.Properties.getBool('c.FBShareWatched', false))
			return;

		shareActivity('video.watches', video);
	},

	likesVideo: function(video) {
		if (!Ti.App.Properties.getBool('c.FBShareLikes', false))
			return;

		var url = 'http://www.youtube.com/watch?v=' + video.id;

		if (!FB.isLoggedin()) {
			_authorize({
				success: function() {
					likeObject(url);
				}
			});
		} else
			likeObject(url);
	}
};

function _authorize(options) {
	var callbackWrapper = function(evt) {
		fbSDK.removeEventListener('login', callbackWrapper);

		// Add network to event object
		evt.network = 'facebook';

		if (evt.success) {
			//Write to cloud storage
			var userData = {
				facebook_id: fbSDK.uid,
				facebook_access_token: fbSDK.accessToken,
				type: 'facebook'
			};

			options.success(userData);

			// Log this event
			// Analytics.recordEvent('facebook', 'connect', 'facebook');
		} else if (evt.cancelled) {
			options.error(evt);
		} else {
			handleError(evt);

			options.error(evt);
		}

	};

	fbSDK.addEventListener('login', callbackWrapper);
	fbSDK.appid = FB.appId;

	if (OS_IOS)
		fbSDK.permissions = FB.permissions.read;
	else
		fbSDK.permissions = _.extend(FB.permissions.read, FB.permissions.write);

	fbSDK.forceDialogAuth = false;

	if (OS_IOS)
		fbSDK.initialize();

	// If user is loggedin to Facebook, log him/her out first
	if (fbSDK.loggedIn) {
		var onLogout = function(evt) {
			fbSDK.removeEventListener('logout', onLogout);

			fbSDK.authorize();
		};
		fbSDK.addEventListener('logout', onLogout);

		fbSDK.logout();
	} else {
		fbSDK.authorize();
	}
}

function _reAuthorize(options) {
	var callbackWrapper = function(evt) {
		Ti.API.info(evt);

		if (evt.success) {
			//Write to cloud storage
			options.success(evt);

			// Log this event
			// Analytics.recordEvent('facebook', 'connect', 'facebook');
		} else if (evt.cancelled) {
			// Do nothing?
			Ti.API.info('Cancelled');
		} else {
			handleError(evt);

			options.error(evt);
		}
	};

	if (OS_IOS)
		fbSDK.requestNewPublishPermissions(FB.permissions.write, fbSDK.audienceFriends, callbackWrapper);
	else {
		// Android already has write permissions
		options.success();
	}
}

function handleError(evt) {
	var message;

	if (OS_IOS) {
		// For all of these errors - assume the user is logged out
		// so show your login UI
		if (evt.error.indexOf('Go to Settings') === 0) {
			message = L('fb_no_premission', 'Snowciety needs permission to access your facebook account. You can control this by going to Settings > Facebook on your phone.');
		} else if (evt.error.indexOf('Session Login Error') === 0) {
			// Session was invalid - e.g. the user deauthorized your app, etc
			// alert('Please login again.');
		} else if (evt.error.indexOf('OTHER:') !== 0) {
			// another error that may require user attention
			message = L('lFacebookError') + evt.error;
		} else {
			// This must be an error message that the user was already notified about
			// Due to the automatic error handling in the graph call
			// Don't surface it again
		}
	} else
		message = L('lFacebookError') + evt.error;

	if (message) {
		var dialog = Ti.UI.createAlertDialog({
			title: L('tFacebookError'),
			message: message,
			buttonNames: [L('Okay')],
			cancel: 0
		});
		dialog.show();
	}
}

function shareActivity(type, video) {
	var callback = function(evt) {
		Ti.API.info(evt);
	};
	var data = {
		video: 'http://youtube.com/v/' + video.id
	};

	fbSDK.requestWithGraphPath('me/' + type, data, 'POST', callback);
}

function likeObject(url) {
	var data = {
		object: url
	};

	Ti.API.info(data);

	fbSDK.requestWithGraphPath('/me/og.likes', data, 'POST', function(evt) {
		Ti.API.info(evt);
	});
}

module.exports = FB;