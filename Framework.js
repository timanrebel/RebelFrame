var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone;

/**
 * @class Framework
 * @singleton
 *
 * RebelFrame's general functions, defined as singleton
 */
var Framework = module.exports = {
	/**
	 * @property {String} LOGGEDOUT User has installed App, but not yet loggedin
	 */
	LOGGEDOUT: 'loggedout',
	/**
	 * @property {String} LOGGEDOUT User is loggedin, but has not yet activated
	 */
	LOGGEDIN: 'loggedin',
	/**
	 * @property {String} ACTIVATED User is loggedin, activated and ready to use all the features
	 */
	ACTIVATED: 'activated',

	/**
	 * @property {Number} deviceWidth Width of the device in dip. We need to devide by the logicalDensityFactor on Android to get the dip
	 */
	deviceWidth: OS_IOS ? Ti.Platform.displayCaps.platformWidth : Ti.Platform.displayCaps.platformWidth / Ti.Platform.displayCaps.logicalDensityFactor,

	/**
	 * @property {Number} deviceHeight Height of the device in dip. We need to devide by the logicalDensityFactor on Android to get the dip
	 */
	deviceHeight: OS_IOS ? Ti.Platform.displayCaps.platformHeight : Ti.Platform.displayCaps.platformHeight / Ti.Platform.displayCaps.logicalDensityFactor,

	/**
	 * Sets the status of this app
	 *
	 * @param {String} status The status to set
	 */
	setStatus: function(status) {
		_status = status;
		Ti.App.Properties.setString(Ti.App.id + '.status', status);
	},

	/**
	 * Returns the status of this app
	 *
	 * @return {String} The status
	 */
	getStatus: function() {
		if (_status)
			return _status;

		return Ti.App.Properties.getString(Ti.App.id + '.status', Framework.LOGGEDOUT);
	},

	/**
	 * Extend Alloy's createController en createWidget functions to call construct function when controller is initialized.
	 */
	extendAlloy: function() {
		// Wrap some Alloy functions, so they call construct and destruct methods.
		var _alloy_createController = Alloy.createController,
			_alloy_createModel = Alloy.createModel,
			_alloy_createCollection = Alloy.createCollection,
			_alloy_createWidget = Alloy.createWidget,
			WM = require('RebelFrame/WindowManager');

		/**
		 * Adds openWin en closeWin functions to Alloy Controllers. This way it is easy to call $.openWin() and $.closeWin and are needed close eventlisteners automatically added and removed.
		 *
		 * @param {Alloy.Controller} controller Controller to add the functions to
		 */
		var addFunctions = function(controller, config) {

			_.extend(controller, {
				/**
				 * Opens the Window. Also adds a `clse` eventListener, to clean up the controller when the Window is closed.
				 *
				 * @param  {Ti.UI.Window} [win] Window to open. If not provided, the Controller's top level view is used.
				 */
				openWin: function(win) {
					win = win || controller.getView();

					// When Controller is 'root' Window and should show hamburger, make it so
					if (!_.isUndefined(config.showSideMenu))
						win.showSideMenu = config.showSideMenu;
					// When Controller is opened from the XML of a TabGroup, do nothing
					else if (!_.isUndefined(config.tabGroup))
						return;

					// Open the window
					WM.openWin(win);

					/**
					 * Handle `close` event of Window. Removes eventlistener and calls both RebelFrame's destruct as Alloy's destroy functions.
					 *
					 * @param  {Object} evt Event details
					 */
					function onCloseWin(evt) {
						this.removeEventListener('close', onCloseWin);

						if (controller.destruct) {
							Ti.API.debug('destruct() called');
							controller.destruct.call(controller, evt);
						} else
							Ti.API.warn('destruct() NOT called');

						controller.destroy.call(controller, evt);

						// Cleanup possible panning:
						evt.source.keyboardPanning = false;
					}

					win.addEventListener('close', onCloseWin);
				},

				/**
				 * Close the Window
				 *
				 * @param  {Ti.UI.Window} [win] Window to close. If not provided, the Controller's top level view is used.
				 */
				closeWin: function(win) {
					win = win || controller.getView();

					WM.closeWin(win);
				}
			});
		};

		/**
		 * Call original Alloy.createController function and then construct is it exists. Also track this new screen in Google Analytics
		 *
		 * @param  {String} name Controller name
		 * @param  {Object} config Controller configuration
		 *
		 * @return {Alloy.controller} Created controller, extended with RebelFrame fucntions
		 */
		Alloy.createController = function(name, config) {
			config = config || {};

			// Create controller using Alloy's original function
			var controller = _alloy_createController(name, config);

			// Add custom RebelFrame functions to controller
			addFunctions(controller, config);

			// Call constructor, if exists
			if (controller.construct)
				controller.construct.call(controller, config || {});

			// Track screen
			if (name !== 'index')
				require('RebelFrame/Tracker').trackScreen(name);

			return controller;
		};

		/**
		 * Call original Alloy.createWidget function and then construct is it exists. Also track this new screen in Google Analytics
		 *
		 * @param  {String} name Controller name
		 * @param  {Object} config Controller configuration
		 *
		 * @return {Alloy.controller} Created controller, extended with RebelFrame fucntions
		 */
		Alloy.createWidget = function(name, controller, config) {
			config = config || {};

			// Create controller using Alloy's original function
			var widget = _alloy_createWidget(name, controller, config);

			// Also support name, config as arguments, leaving out controller, but do this only after calling the original method.
			// Copied from Alloy.js definition
			if ("undefined" != typeof controller && null !== controller && _.isObject(controller) && !_.isString(controller)) {
				config = controller;
			}

			// Add custom RebelFrame functions to controller
			addFunctions(widget, config);

			// Call constructor, if exists
			if (widget.construct)
				widget.construct.call(widget, config || {});

			return widget;
		};
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
 * @private
 */
var _status;

// Create some basic globals that can be used in TSS
Alloy.Globals.screenHeight = Framework.deviceHeight - 64;
Alloy.Globals.screenWidth = Framework.deviceWidth;
