var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	_navDrawerModule = require('com.tripvi.drawerlayout');

var Android = module.exports = {
	setup: function(config) {
		_centerWin = config.centerWin;

		_navDrawer = _navDrawerModule.createDrawer({
			// set windows
			leftView: Alloy.createWidget(Alloy.CFG.SideMenu.menuWidget).getView(),
			centerView: config.centerWin,

			// define widths
			leftDrawerWidth: 240
		});

		_navDrawer.addEventListener('draweropen', onNavDrawerOpen);
		_navDrawer.addEventListener('drawerclose', onNavDrawerClose);

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
_.extend(Android, Backbone.Events);

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
	Android.trigger('open', evt);
}

/**
 * Handle 'close' event
 */
function onNavDrawerClose(evt) {
	Android.trigger('close', evt);
}
