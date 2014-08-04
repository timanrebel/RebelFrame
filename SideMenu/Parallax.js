var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	_navDrawerModule = require('de.marcelpociot.sidemenu'),

	WM = require('RebelFrame/WindowManager');

var Parallax = {
	setup: function(config) {
		_centerWin = config.centerWin;
		var leftWin = Ti.UI.createWindow();
		leftWin.add(Alloy.createWidget(Alloy.CFG.SideMenu.menuWidget).getView());

		_navDrawer = _navDrawerModule.createSideMenu({
			contentView: _centerWin,
			menuView: leftWin,
			backgroundImage: config.backgroundImage,
			contentViewScaleValue: 0.7,
			scaleContentView: true,
			panGestureEnabled: false,
			scaleBackgroundImageView: false,
			parallaxEnabled: false,

			// Blur settings
			blurBackground: false,
			tintColor: '#fff',
			radius: 20,
			iterations: 10
		});

		_navDrawer.addEventListener('willShowMenuViewController', onWillNavDrawerOpen);
		_navDrawer.addEventListener('didShowMenuViewController', onNavDrawerOpen);
		_navDrawer.addEventListener('willHideMenuViewController', onWillNavDrawerClose);
		_navDrawer.addEventListener('didHideMenuViewController', onNavDrawerClose);

		_navDrawer.open();
	},

	setCenterWindow: function(win) {
		_navDrawer.setContentWindow({
			window: win,
			animated: true
		});

		// Close old centerWindow
		WM.closeWin(_centerWin);

		// Make reference to new centerWindow, so we can close later
		_centerWin = win;
	},

	toggleLeftWindow: function(evt) {
		if(!_open) {
			_open = true;
			_navDrawer.presentMenuViewController();
		}
		else {
			_open = false;
			_navDrawer.hideMenuViewController();
		}
	}
};

/**
 * Add Backbone Events to this singleton
 */
_.extend(Parallax, Backbone.Events);

var _centerWin;

var _navDrawer;

var _open;

/**
 * Handle 'open' event
 *
 * @param  {[type]} evt Event details
 */
function onNavDrawerOpen(evt) {
	// Parallax.fire('open', evt);
}

/**
 * Handle 'close' event
 */
function onNavDrawerClose(evt) {
	// Parallax.fire('close', evt);
}

/**
 * Handle 'open' event
 *
 * @param  {[type]} evt Event details
 */
function onWillNavDrawerOpen(evt) {

}

/**
 * Handle 'close' event
 */
function onWillNavDrawerClose(evt) {

}

module.exports = Parallax;
