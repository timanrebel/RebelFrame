var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	Acl = require('RebelFrame/Acl'),
	InAppBilling = require('ti.inappbilling');

/**
 * @class InApp
 *
 * In-app purchases support for Android
 */
var InApp = {
	getReceipt: function(callback) {
		Ti.API.error('Android In-App Billing does not have receipts.');
	},

	/*
	 * Make an in-app purchase
	 *
	 * @param {Object} product Product to purchase
	 * @param {String} product.id the id of the product to be purchased
	 * @param {String} [product.type] Accepted product types:
	 * 		'in-app' - Standard in-app product (default if no productType specified).
	 * 		'subscription' - Recurring monthly or annual billing product.
	 * @param {String} [product.developerPayload] A developer-specified string that contains supplemental information about an order.
	 */
	purchase: function(product, callback) {
		_successCallback = callback;

		var response = InAppBilling.requestPurchase({
			productId: product.id,
			productType: product.type == 'subscription' ? InAppBilling.ITEM_TYPE_SUBSCRIPTION : InAppBilling.ITEM_TYPE_INAPP,
			developerPayload: product.developerPayload
		});

		Ti.API.error('purchase() response: ' + JSON.stringify(response, null, 4));
	},

	getProduct: function(productIdentifier, callback) {
		Ti.API.error('Android In-App Billing does not have a way to retrieve products from the store.');
	},

	restore: function() {
		var response = InAppBilling.restoreTransactions();

		Ti.API.error('restore() response: ' + JSON.stringify(response, null, 4));
	},

	isSupported: function() {
		var response = InAppBilling.checkBillingSupported(InAppBilling.ITEM_TYPE_SUBSCRIPTION);

		Ti.API.error(JSON.stringify(response, null, 4));
	}
};

// Add Backbone powered events
_.extend(InApp, Backbone.Events);

var _successCallback;

/**
 * To use the Signature Verification code included in the module, you must set the Public Key. If this is not set, the process will function but will not internally verify any Market responses.
 */
InAppBilling.setPublicKey(Alloy.CFG.inAppBillingPublicKey);

/**
 * Initializes the Billing Service which will be used to send messages to the Android Market. When the Billing Service is bound to the Market Service, an ON_BIND_EVENT e is fired. When the Billing Service connects to the Market service, an ON_CONNECT_EVENT is fired, and the Billing Service can now be used for other requests. This MUST be called before any of the 5 request functions.
 */
InAppBilling.addEventListener(InAppBilling.ON_BIND_EVENT, onBind);
InAppBilling.addEventListener(InAppBilling.ON_CONNECT_EVENT, onConnect);
InAppBilling.addEventListener(InAppBilling.PURCHASE_STATE_CHANGED_EVENT, onTransactionState);
InAppBilling.addEventListener(InAppBilling.NOTIFY_EVENT, onNotify);
InAppBilling.startBillingService();

function markProductAsPurchased(order) {
	Ti.API.error(JSON.stringify(order, null, 4));

	if (_successCallback)
		_successCallback();
}

/**
 * Handle `ON_BIND_EVENT` event. The event is fired when the Billing Service binds with the Market service
 *
 * @param {Object} evt Event details
 * @param {Number} evt.result Result of the binding, equal to one of the following: InAppBilling.SUCCESS, InAppBilling.FAILED, InAppBilling.SECEXCEPTION
 */
function onBind(evt) {
	if (evt.result == InAppBilling.SUCCESS)
		Ti.API.error('Binding was successful');
	else if (evt.result == InAppBilling.FAILED)
		Ti.API.error('Binding failed');
	else if (evt.result == InAppBilling.SECEXCEPTION)
		Ti.API.error('Binding failed, a SECEXCEPTION occured');
}

/**
 * Handle `ON_CONNECT_EVENT` event. The event is fired when the Billing Service connects to the market. This event has no properties, but signifies that requests can now be made to the Android Market.
 */
function onConnect() {
	Ti.API.error('onConnect');

	InApp.trigger('ready');
}

/**
 * Handle `PURCHASE_STATE_CHANGED_EVENT` event. The event is fired when the module receives an asynchronous PURCHASE_STATE_CHANGED response from the market.
 *
 * @param {Object} evt Event detais
 * @oaram {String} evt.signedData JSON String which can be parsed into a JSON object (see Android documentation: http://developer.android.com/guide/market/billing/billing_reference.html#billing-intents).
 * @param {String} evt.signature this can be used to verify the response received. If the Public Key has been set, the module will verify automatically
 * @param {Number} evt.responseCode Response with one the following possible values:
 
 * InAppBilling.SIGNATURE_VERIFIED
 * InAppBilling.NULL_DATA
 * InAppBilling.SIGNATURE_ERROR
 * InAppBilling.UNKNOWN_NONCE
 * InAppBilling.PUBLIC_KEY_NULL
 *
 * @return {[type]} [description]
 */
function onTransactionState(evt) {
	Ti.API.error('onTransactionState');
	Ti.API.error(JSON.stringify(evt, null, 4));

	if (evt.result == InAppBilling.RESULT_OK) {
		if (evt.signedData) {
			var response = JSON.parse(evt.signedData);

			Ti.API.error('response: ' + JSON.stringify(response, null, 4));

			/*
			 * We are not guaranteed to have any orders returned so
			 * we need to make sure that this one exists before using it.
			 *
			 * If there is no notificationId then there is no need to confirmNotifications().
			 * This happens when restoreTransactions() triggers a PURCHASE_STATE_CHANGED_EVENT.
			 */
			if (response.orders.length) {
				_.each(response.orders, function(order) {
					markProductAsPurchased(order);
				});
			}
		}
	}
}

function onNotify(evt) {

	// if(evt.responseCode == InAppBilling.RESULT_OK) {
	var response = InAppBilling.getPurchaseInformation({
		notificationIds: [evt.notifyId]
	});

	Ti.API.error('getPurchaseInformation() response: ' + JSON.stringify(response, null, 4));
	// }
}

module.exports = InApp;