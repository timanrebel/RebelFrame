var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	_navDrawerModule = require('dk.napp.drawer'),
	WM = require('WindowManager');

var Napp = {
	setup: function(config) {
		_centerWin = config.centerWin;
		var leftWin = Ti.UI.createWindow();
		leftWin.add(Alloy.createWidget('c.SideMenu').getView());

		_navDrawer = _navDrawerModule.createDrawer({
			// set windows
			leftWindow: leftWin,
			centerWindow: config.centerWin,

			// define widths
			leftDrawerWidth: 240,

			// define modes
			centerHiddenInteractionMode: _navDrawerModule.OPEN_CENTER_MODE_NAVBAR,
			closeDrawerGestureMode: _navDrawerModule.CLOSE_MODE_ALL,
			openDrawerGestureMode: _navDrawerModule.OPEN_MODE_ALL,
			animationMode: _navDrawerModule.ANIMATION_PARALLAX_FACTOR_5,

			// define rest of settings
			shouldStretchDrawer: false,
			showShadow: true,
			statusBarStyle: _navDrawerModule.STATUSBAR_WHITE
		});
		// Set separately to counter a bug
		_navDrawer.setShouldStretchDrawer(false);

		_navDrawer.addEventListener('windowDidOpen', onNavDrawerOpen);
		_navDrawer.addEventListener('windowDidClose', onNavDrawerClose);

		_navDrawer.open();
	},

	setCenterWindow: function(win) {
		_navDrawer.centerWindow = win;

		// Close old centerWindow
		WM.closeWin(_centerWin);

		// Make reference to new centerWindow, so we can close later
		_centerWin = win;

		// Enable opening side menu by panning
		// _navDrawer.setOpenDrawerGestureMode(_navDrawerModule.OPEN_MODE_ALL);
	},

	toggleLeftWindow: function(evt) {
		_navDrawer.toggleLeftWindow();
	}
};

/**
 * Add Backbone Events to this singleton
 */
_.extend(Napp, Backbone.Events);

/**
 * @property _centerWin Reference to the currently visible center windo, so we can close it later
 */
var _centerWin;

var _navDrawer;

/**
 * Handle 'open' event
 *
 * @param  {[type]} evt Event details
 */
function onNavDrawerOpen(evt) {
	Napp.trigger('open', evt);

	_navDrawer.setStatusBarStyle(_navDrawerModule.STATUSBAR_BLACK);
}

/**
 * Handle 'close' event
 */
function onNavDrawerClose(evt) {
	Napp.trigger('close', evt);

	_navDrawer.setStatusBarStyle(_navDrawerModule.STATUSBAR_WHITE);
}

module.exports = Napp;