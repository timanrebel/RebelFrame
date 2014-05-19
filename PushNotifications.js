var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone;

var PN = {
	/**
	 * Register this device for Push Notifications
	 */
	register: function(callback) {
		_callback = callback;

		if (OS_IOS) {

			// First register
			Ti.Network.registerForPushNotifications({
				types: [
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
		} else if (OS_ANDROID) {
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
			} catch (e) {
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

_.extend(PN, Backbone.Events);

var _callback;

var _pushRegistration = Alloy.createModel('PushRegistration');

function onNewNotification(evt) {
	Ti.API.info('Incoming push notification:');
	Ti.API.info(evt);

	PN.trigger('push', evt);
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
	if (_callback)
		_callback(null, {
			deviceToken: evt.deviceToken || Ti.Network.remoteDeviceUUID
		});
	else {
		_pushRegistration.set({
			id: evt.deviceToken || Ti.Network.remoteDeviceUUID,
			alias: require('Rebelframe/Acl').getLoggedinUser() ? require('Rebelframe/Acl').getLoggedinUser().id : null,

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
}

function onRegError(evt) {
	if (_callback)
		_callback(evt);

	Ti.API.error(evt);
}

function checkForPushNotifications() {
	if (OS_IOS) {
		var args = Ti.App.getArguments();

		if (args.UIApplicationLaunchOptionsRemoteNotificationKey) {
			onNewNotification(args.UIApplicationLaunchOptionsRemoteNotificationKey);
		}
	}
}

module.exports = PN;
