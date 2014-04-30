var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	WM = require('RebelFrame/WindowManager');

/**
 * @class Framework
 * Framework general functions, defined as singleton
 */
var Framework = {
	/**
	 * {String} LOGGEDOUT User has installed App, but not yet loggedin
	 */
	LOGGEDOUT: 'loggedout',
	/**
	 * {String} LOGGEDOUT User is loggedin, but has not yet activated
	 */
	LOGGEDIN: 'loggedin',
	/**
	 * {String} ACTIVATED User is loggedin, activated and ready to use all the features
	 */
	ACTIVATED: 'activated',

	/**
	 * @property {Int} deviceWidth Width of the device in dip. We need to devide by the logicalDensityFactor on Android to get the dip
	 */
	deviceWidth: OS_IOS ? Ti.Platform.displayCaps.platformWidth : Ti.Platform.displayCaps.platformWidth / Ti.Platform.displayCaps.logicalDensityFactor,

	/**
	 * @property {Int} deviceHeight Height of the device in dip. We need to devide by the logicalDensityFactor on Android to get the dip
	 */
	deviceHeight: OS_IOS ? Ti.Platform.displayCaps.platformHeight : Ti.Platform.displayCaps.platformHeight / Ti.Platform.displayCaps.logicalDensityFactor,

	/**
	 * @property {Ti.UI.IOS.NavigationWindow} navWindows The active NavigationWindows
	 */
	navWindows: [],

	/**
	 * Sets the status of this app
	 *
	 * @param {String} status The status
	 */
	setStatus: function(status) {
		_status = status;
		Ti.App.Properties.setString('F.status', status);
	},

	/**
	 * Returns the status of this app
	 *
	 * @return {String} The status
	 */
	getStatus: function() {
		if (_status)
			return _status;

		return Ti.App.Properties.getString('F.status', Framework.LOGGEDOUT);
	},

	/**
	 * Open the given Window
	 *
	 * On iOS this Window is added to the NavigationGroup controller
	 * On Android this Window is configured with a Actionbar and given an exitOnClose if needed
	 *
	 * @param {Ti.UI.Window} win Window to open
	 */
	openWin: function(win) {
		WM.openWin(win);
	},

	closeWin: function(win) {
		WM.closeWin(win);
	},

	/**
	 * Scan the contents of the supplied object
	 *
	 * For debugging purposes only
	 *
	 * @param {Object} obj The object to scan
	 * @private
	 */
	scan: function(obj) {
		var key, type;

		Ti.API.error('Contents of object:');
		for (key in obj) {
			type = typeof(obj[key]);
			if (type != 'object' && type != 'function')
				Ti.API.error(' - ' + key + ': ' + type + ' (' + obj[key] + ')');
			else
				Ti.API.error(' - ' + key + ': ' + type);
		}
	}
};

/**
 * {String} The status of this app (i.e. loggedout, loggedin, activated)
 *
 * @private
 */
var _status;

module.exports = Framework;

// Create some basic globals that can be used in TSS
Alloy.Globals.screenHeight = Framework.deviceHeight - 64;
Alloy.Globals.screenWidth = Framework.deviceWidth;