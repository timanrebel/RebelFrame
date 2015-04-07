var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	WM = require('RebelFrame/WindowManager'),
	_navDrawerModule = require('com.tripvi.drawerlayout');

var Android = module.exports = {
	setup: function(config) {
		Ti.API.info(config);

		_centerWin = config.centerWin;

		var _view = Ti.UI.createView({
			layout: _centerWin.layout || 'absolute',
			backgroundColor: _centerWin.backgroundColor,
			backgroundGradient: _centerWin.backgroundGradient,
			backgroundImage: _centerWin.backgroundImage
		});

		for(var i in _centerWin)
			Ti.API.info(i);

		_.each(_centerWin.children, function(view) {
			_centerWin.remove(view);
			_view.add(view);
		});

		_navDrawer = _navDrawerModule.createDrawer({
			// set windows
			leftView: Alloy.createWidget(Alloy.CFG.SideMenu.menuWidget).getView(),
			centerView: _view, // Ti.UI.createView({backgroundColor: 'red'}),

			// define widths
			leftDrawerWidth: 240,
			width: Ti.UI.FILL,
    		height: Ti.UI.FILL
		});

		_navDrawer.addEventListener('draweropen', onNavDrawerOpen);
		_navDrawer.addEventListener('drawerclose', onNavDrawerClose);

		var win = Ti.UI.createWindow({

		});

		_centerWin.add(_navDrawer);
		_centerWin.addEventListener('open', function(evt) {
			this.activity.actionBar.onHomeIconItemSelected = function() {
				_navDrawer.toggleLeftWindow();
			};
		});
		_centerWin.open();
	},

	attach: function(win) {
		_centerWin.title = win.title;

		var _view = Ti.UI.createView({
			layout: win.layout || 'absolute',
			backgroundColor: win.backgroundColor,
			backgroundGradient: win.backgroundGradient,
			backgroundImage: win.backgroundImage
		});

		_.each(win.children, function(view) {
			win.remove(view);
			_view.add(view);
		});

		_navDrawer.centerView = _view;
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
