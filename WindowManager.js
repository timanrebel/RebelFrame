var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone;

var WM = module.exports = {
	navWindows: [],

	/**
	 * Open given Window in a new Ti.UI.iOS.NavigationWindow on iOS and return it. Do nothing on other platforms
	 *
	 * @param {Ti.UI.Window} win Window to open in NavigationWindow
	 *
	 * @return {Ti.UI.iOS.NavigationWindow} Created NavigationWindow
	 */
	createNewNavWindow: function(win) {
		if (OS_IOS) {
			var navWindow = Ti.UI.iOS.createNavigationWindow({
				backgroundColor: '#fff',

				window: win
			});
			navWindow.id = 'navWindow_' + _.uniqueId();

			WM.navWindows.push(navWindow);

			// Store reference in the root Window to the NavigationWindow
			win.navWin = navWindow;

			return navWindow;
		} else
			return win;
	},

	/**
	 * Open given Window in a the last created Ti.UI.iOS.NavigationWindow on iOS. Just open the Window on other platforms
	 *
	 * @param {Ti.UI.Window} win Window to open in NavigationWindow
	 */
	openWinInActiveNavWindow: function(win) {
		if (OS_IOS) {
			if (!WM.navWindows.length) {
				if(Alloy.Globals.tabGroup)
					Alloy.Globals.tabGroup.activeTab.open(win);
				else
					WM.createNewNavWindow(win).open();
			}
			else
				_.last(WM.navWindows).openWindow(win);
		} else
			win.open();
	},

	/**
	 * Open the given Window.
	 *
	 * @param {Ti.UI.Window} win Window to open
	 */
	openWin: function(win) {
		if (win.createStack) {
			addWinToStack(win.createStack, win);
		} else if (win.addToStack) {
			addWinToStack(win.addToStack, win);
		}

		if (OS_IOS) {
			// Sometimes we accidentally set modal and navGroup to true.
			// In that case 'modal' should be preferred, because modal windows are always opened in a new NavWindow
			if (win.navGroup && win.modalWin)
				win.navGroup = false;

			// Show SideMenu button and replace current centerWindow with this new Window
			if (win.showSideMenu) {
				// Show sideMenu button
				var sideMenuButton = Alloy.createWidget(Alloy.CFG.SideMenu.buttonWidget || 'rebel.MenuBarButton', {
					buttonType: 'hamburger',
					delay: 200
				});
				win.leftNavButton = sideMenuButton.getView();
				sideMenuButton.on('click', WM.toggleLeftNavDrawer);

				// Create SideMenu if not yet created.
				// Else replace current centerWindow with this Window
				setupNavDrawer({
					centerWin: WM.createNewNavWindow(win)
				});
			}
			// If window should be Modal Window
			// Also add it to a new navigationGroup
			else if (win.modalWin) {
				var navWin = WM.createNewNavWindow(win);
				navWin.open({
					modal: true
				});
			}
			// If window should be part of NavigationGroup
			else if (win.navGroup) {
				WM.openWinInActiveNavWindow(win);
			}
			// Else, just open the Window
			else
				win.open();
		} else if (OS_ANDROID) {

			if (win.showSideMenu) {
				// Create SideMenu if not yet created.
				setupNavDrawer({
					centerWin: win
				});

				win.addEventListener('open', onOpenMenuWindow);

				win.open();
			} else if(win.isTopWin) {
				win.open();
			}
			else {
				win.addEventListener('open', onOpenSubWindow);

				win.open();
			}
		} else
			win.open();
	},

	/**
	 * Close the given Window

	 * @param {Ti.UI.Window} win Window to close
	 */
	closeWin: function(win) {
		if (OS_IOS) {
			// If Window is a NavigationWindow, clean up root Window as well
			if (win.window) {
				win.window.fireEvent('close');

				if (win.window.leftNavButton)
					win.window.leftNavButton.removeEventListener('click', WM.toggleLeftNavDrawer);

				win.window = null;

				// WM.navWindows.pop();
				var index = WM.navWindows.indexOf(win);

				WM.navWindows.splice(index, 1);

				win.close();
			}
			// If Window is a root Window of a NavigationWindow, close the NavigationWindow instead
			else if (win.navWin) {
				var navWin = win.navWin;
				delete win.navWin;

				WM.closeWin(navWin);
			// If Window is part of tabGroup, close via TabGroup
			} else if(Alloy.Globals.tabGroup)
				Alloy.Globals.tabGroup.close(win);
			// Else just close the Window
			else
				win.close();
		} else
			win.close();
	},

	/**
	 * Open or Close the left-side Navigation Drawer (if exists)
	 */
	toggleLeftNavDrawer: function() {
		if (_navDrawer)
			_navDrawer.toggleLeftWindow();
	},

	/**
	 * Close the Stack of Windows with given name
	 *
	 * @param {String} name Name of Stack to close
	 */
	killStack: function(name) {
		if (_windowStacks[name])
			_.each(_windowStacks[name], function(win) {
				console.log('Closing ' + win);
				// WM.closeWin(win);
				win.close();
			});
	},

	destruct: function() {
		_.each(WM.navWindows,function(win) {
			WM.closeWin(win);
		});

		if(Alloy.Globals.tabGroup) {
			Alloy.Globals.tabGroup.close();

			delete Alloy.Globals.tabGroup;
		}

		if(_navDrawer) {
			if(_navDrawer.destruct)
				_navDrawer.destruct();

			_navDrawer = null;
		}
	}

};

_.extend(WM, Backbone.Events);

/**
 * @property {Object} _windowStacks Dictionary of stacks of Windows. Each element contains an array of one or more windows
 */
_windowStacks = {};

/**
 * Add given Window to stack with given name
 * @private
 *
 * @param {String} name Stack to add given Window to
 * @param {Ti.UI.Window} win Window to add
 */
function addWinToStack(name, win) {
	if (!_windowStacks[name])
		_windowStacks[name] = [];

	_windowStacks[name].push(win);
}

if (OS_ANDROID) {

	/**
	 * On Android: Handle open event of Sub window. It adds the Android backbutton and closes it on click
	 * @private
	 *
	 * @param {Object} evt Event details
	 */
	function onOpenSubWindow(evt) {
		var win = this;

		if (this.activity) {
			//Setup the ActionBar for 1> level windows
			var actionBar = this.activity.actionBar;
			if (actionBar && !this.navBarHidden) {
				actionBar.displayHomeAsUp = true;
				actionBar.icon = '/images/generic/logoTransparentSmall.png';
				actionBar.onHomeIconItemSelected = function() {
					win.close();
				};
			}

			this.activity.onPrepareOptionsMenu = createOptionsMenu;

			this.activity.invalidateOptionsMenu();
		}
	}

	/**
	 * On Android: Handle open event of Top window. It opens the NavigationDrawer
	 * @private
	 *
	 * @param {Object} evt Event details
	 */
	function onOpenMenuWindow(evt) {
		if (this.activity) {
			//Setup ActionBar for level 1 windows
			var actionBar = this.activity.actionBar;
			if (actionBar && !this.navBarHidden) {
				actionBar.displayHomeAsUp = false;
				actionBar.icon = '/images/generic/hamburger.png';

				actionBar.onHomeIconItemSelected = function() {
					if (_navDrawer) {
						_navDrawer.toggleDrawer();
					}
				};
			}

			// Close app when clicking back button
			this.addEventListener('androidback', onBackButtonClick);

			this.activity.onPrepareOptionsMenu = createOptionsMenu;

			this.activity.invalidateOptionsMenu();
		}
	}

	function onBackButtonClick(evt) {
		this.removeEventListener('androidback', onBackButtonClick);

		// Go back to home
		// Ti.Android.currentActivity.finish();
		var intent = Ti.Android.createIntent({
			action: Ti.Android.ACTION_MAIN
		});
		intent.addCategory(Ti.Android.CATEGORY_HOME);
		Ti.Android.currentActivity.startActivity(intent);
	}

	function createOptionsMenu(evt) {
		var menu = evt.menu,
			menuItem;

		// Settings
		// if (F.load('Acl').isLoggedin() && !menu.findItem(998)) {
		// 	menuItem = menu.add({
		// 		itemId: 998,
		// 		title: L('menuSettings'),
		// 		showAsAction: Ti.Android.SHOW_AS_ACTION_NEVER,
		// 		order: 998
		// 	});
		// 	menuItem.addEventListener('click', onOpenSettings);
		// }

		// Feedback
		// if (!menu.findItem(998)) {
		// 	menuItem = menu.add({
		// 		itemId: 998,
		// 		title: L('menuSettings'),
		// 		showAsAction: Ti.Android.SHOW_AS_ACTION_NEVER,
		// 		order: 998
		// 	});
		// 	menuItem.addEventListener('click', onOpenSettings);
		// }

		// Help
		if (!menu.findItem(999)) {
			menuItem = menu.add({
				itemId: 999,
				title: L('Help'),
				showAsAction: Ti.Android.SHOW_AS_ACTION_NEVER,
				order: 999
			});
			menuItem.addEventListener('click', onOpenHelp);
		}

		// this.invalidateOptionsMenu();
	}

	function onOpenSettings() {
		Alloy.createController('Settings');
	}

	function onOpenHelp() {
		var Acl = require('Acl'),
			emailDialog = Ti.UI.createEmailDialog();

		emailDialog.subject = "I could use some help!";
		emailDialog.toRecipients = [Alloy.CFG.supportEmail];

		var message = "\n\r\n\r\n\r --- \n\r";

		if (Acl.isLoggedin()) {
			var user = Acl.getLoggedinUser();

			message = message + 'User: ' + user.get('name') + ' (' + user.id + ')' + "\n\r";
		}

		message = message + 'Version: ' + Ti.App.getVersion() + "\n\r" +
			'Phone model: ' + Ti.Platform.model + "\n\r" +
			'OS: ' + Ti.Platform.osname + ' ' + Ti.Platform.version + "\n\r" +
			'';

		emailDialog.messageBody = message;
		emailDialog.open();
	}
}
/**
 * @property {Ti.UI.Window} _navDrawer The Navigation Drawer window
 * @private
 */
_navDrawer = null;

/**
 * Setup Navigation Drawer module
 * @private
 *
 * @param {Object} config Configuration for module
 */
function setupNavDrawer(config) {
	// Setup NavDrawer module on iOS
	if (OS_IOS) {
		if (!_navDrawer) {
			_navDrawer = require('RebelFrame/SideMenu/' + Alloy.CFG.SideMenu.type);
			_navDrawer.setup(config);

			_navDrawer.on('open', onNavBarOpen);
			_navDrawer.on('close', onNavBarClose);
		} else {
			// Replace current centerWindow with new centerWindow
			_navDrawer.setCenterWindow(config.centerWin);
		}
	} else if (OS_ANDROID) {
		if (!_navDrawer) {
			// Make reference to new centerWindow, so we can close later
			_centerWin = config.centerWin;

			// Create NavigationDrawer for Android
			_navDrawer = Alloy.createWidget(Alloy.CFG.SideMenu.menuWidget);
			_navDrawer.attach(config.centerWin);
		} else {
			_navDrawer.attach(config.centerWin);

			// Close old centerWindow
			WM.closeWin(_centerWin);

			// Make reference to new centerWindow, so we can close later
			_centerWin = config.centerWin;
		}
	}
}

function onNavBarOpen(evt) {
	WM.trigger('navbaropen', evt);
}

function onNavBarClose(evt) {
	WM.trigger('navbarclose', evt);
}
