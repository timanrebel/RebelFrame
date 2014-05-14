var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	GA = require('analytics.google');

//GA.optOut = true;
GA.debug = true;
GA.trackUncaughtExceptions = true;

var GoogleTracker = GA.getTracker(Alloy.CFG.gaTrackingID);

module.exports = {
	/**
	 * Track a screen
	 *
	 * @param  {String} name The name of the application screen.
	 *
	 */
	trackScreen: function(name) {
		GoogleTracker.trackScreen(name);
	},

	/**
	 * Track an event
	 *
	 * @param {String} category The event category
	 * @param {String} [action] The event action
	 * @param {String} [label] The event label
	 * @param {Number} [value] The event value
	 */
	trackEvent: function(category, action, label, value) {
		GoogleTracker.trackEvent({
			category: category,
			action: action || '',
			label: label || '',
			value: value || 1
		});
	},

	/**
	 * Track social media interaction
	 *
	 * @param  {String} platform The social network with which the user is interacting (e.g. Facebook, Google+, Twitter, etc.).
	 * @param  {String} action The social action taken (e.g. Like, Share, +1, etc.).
	 * @param  {String} [target] The content on which the social action is being taken (i.e. a specific article or video).
	 */
	trackSocial: function(platform, action, target) {
		GoogleTracker.trackSocial({
			network: platform,
			action: action,
			target: target || ''
		});
	},

	/**
	 * [trackTime description]
	 *
	 * @param  {[type]} category [description]
	 * @param  {[type]} interval [description]
	 *
	 * @return {[type]} [description]
	 */
	trackLoadingTime: function(category, interval) {
		GoogleTracker.trackTime({
			category: category,
			time: interval || 0
		});
	},

	/**
	 * [trackTransaction description]
	 *
	 * @param {Object} config Configuration object
	 * @param {String} config.id A unique ID representing the transaction. This ID should not collide with other transaction IDs.
	 * @param {String} [config.affiliation="In-app Store"] An entity with which the transaction should be affiliated (e.g. a particular store)
	 * @param {Number} config.revenue The total revenue of a transaction, including tax and shipping
	 * @param {String} config.name The name of the product
	 * @param {String} [config.sku] The SKU of the product
	 * @param {String} [config.category] A category to which the product belongs
	 */
	trackTransaction: function(config) {
		var transaction = GA.createTransaction(config.id, {
			affiliation: config.affiliation || 'In-app Store',
			revenue: config.revenue,
			tax: 0,
			shipping: 0
		});

		transaction.addItem({
			sku: config.sku || config.type + '_' + config.name,
			name: config.name,
			category: config.category,
			price: config.revenue,
			quantity: 1
		});

		GoogleTracker.trackTransaction(transaction);
	}
};
