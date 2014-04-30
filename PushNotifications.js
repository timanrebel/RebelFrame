var Alloy = require('alloy'), 
	_ = Alloy._, 
	Backbone = Alloy.Backbone;

var PN = {
	/**
	 * Register this device for Push Notifications
	 */
	register: function() {
		if(OS_IOS) {

			// First register
			Ti.Network.registerForPushNotifications({
				types : [
					Ti.Network.NOTIFICATION_TYPE_BADGE, 
					Ti.Network.NOTIFICATION_TYPE_ALERT, 
					Ti.Network.NOTIFICATION_TYPE_SOUND
				],
				success: onRegSuccess,
				error: onRegError,
				callback: onNewNotification
			});

			// Second, check for existing Push Notifications 
			checkForPushNotifications();

			// Third, check for Push Notifications when coming back from background
			Ti.App.addEventListener('resume', checkForPushNotifications);
		}
		else if(OS_ANDROID) {
			var gcmModule = require('net.iamyellow.gcmjs');
			// http://iamyellow.net/post/40100981563/gcm-appcelerator-titanium-module
			
			if (gcmModule.data && gcmModule.data !== null) {
				// if we're here is because user has clicked on the notification
				// and we set extras for the intent 
				// and the app WAS NOT running
				// (don't worry, we'll see more of this later)
				onNewNotification(gcmModule.data);
			}

			try {
				gcmModule.registerForPushNotifications({
					success: onRegSuccess,
					error: onRegError,
					callback: onNewNotification,
					unregister: onUnregister,
					data: onNewNotification
				});
			}
			catch(e) {
				Ti.API.warn('Error while registering for Push Notifications: ' + e);
			}
		}
	},

	/**
	 * Unregister this device with the WappZapp backend (for example on logout)
	 */
	unregister: function() {
		onUnregister();
	}
};

var _pushRegistration = Alloy.createModel('PushRegistration');

function onNewNotification(evt) {
	Ti.API.info(JSON.stringify(evt, null, 4));

	var target;

	if(OS_IOS && evt.data && evt.data.target)
		target = evt.data.target;
	if(OS_ANDROID && evt && evt.target)
		target = evt.target;

	if(target) {
		// When target is a Track, open the track
		if(target.type && target.type.toLowerCase() == 'video') {
			var video = Alloy.createModel('Video', {
				id: target.id
			});
			video.fetch({
				success: function(model) {
					Ti.API.info(model.attributes);
					
					Alloy.createController('Video', {
						video: video
					});
				}
			});

			
		}
	}
}

/**
 * Handle incoming unregister event from Google. This means that this device has been unregistered by Google or by the User at Google.
 * @private
 * 
 * @param  {Object} evt Event details
 */
function onUnregister(evt) {
	_pushRegistration.destroy();
}

/**
 * Handle successful push notification registration. Device registered with Apple/Google, now register with WappZapp backend
 * @private
 * 
 * @param  {Object} evt Event details
 */
function onRegSuccess(evt) {
	_pushRegistration.set({
		id: evt.deviceToken || Ti.Network.remoteDeviceUUID,
		alias: require('Acl').getLoggedinUser().id,

		appId: Ti.App.id,
		appVersion: Ti.App.version,
		platform: Ti.Platform.osname
	});

	_pushRegistration.save(null, {
		success: function(model) {
			Ti.API.error(model.attributes);
		},
		error: function(response) {
			Ti.API.error(response);
		}
	});
}

function onRegError(evt) {
	Ti.API.error(evt);
}

function checkForPushNotifications() {
	if(OS_IOS) {
		var args = Ti.App.getArguments();

		if (args.UIApplicationLaunchOptionsRemoteNotificationKey) {
			onNewNotification(args.UIApplicationLaunchOptionsRemoteNotificationKey);
		}
	}
}

module.exports = PN;