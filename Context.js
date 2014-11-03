var Context = module.exports = {
	on: function(name, activity) {
		activity.onStart = function() {
			if (activeActivity == name) {
				Ti.App.fireEvent('resumed');
			}

			activeActivity = name;
		};

        activity.onStop = function() {
			if (activeActivity == name) {
				Ti.App.fireEvent('paused');
			}
		};
	},

	off: function(activity) {
        console.log('** off');

		activity.onStart = null;
		activity.onStop = null;
	}
};

/**
 * @property {String} Current active Activity name
 * @private
 */
var activeActivity;
