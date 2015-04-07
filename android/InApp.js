var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
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

		var response = InAppBilling.purchase({
			productId: product.id,
			type: product.type == 'subscription' ? InAppBilling.ITEM_TYPE_SUBSCRIPTION : InAppBilling.ITEM_TYPE_INAPP,
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
		return true;

		// var response = InAppBilling.checkBillingSupported(InAppBilling.ITEM_TYPE_SUBSCRIPTION);
		//
		// Ti.API.error(JSON.stringify(response, null, 4));
	}
};

// Add Backbone powered events
_.extend(InApp, Backbone.Events);

var _successCallback;

/**
* Initializes the Billing Service which will be used to send messages to the Android Market. When the Billing Service is bound to the Market Service, an ON_BIND_EVENT e is fired. When the Billing Service connects to the Market service, an ON_CONNECT_EVENT is fired, and the Billing Service can now be used for other requests. This MUST be called before any of the 5 request functions.
*/
InAppBilling.addEventListener('setupcomplete', onConnect);
InAppBilling.addEventListener('purchasecomplete', onPurchaseComplete);
InAppBilling.startSetup({
	publicKey: Alloy.CFG.inAppBillingPublicKey,
	debug: true
});

function markProductAsPurchased(purchase) {
	console.log('markProductAsPurchased');
	Ti.API.error(JSON.stringify(purchase, null, 4));

	if (_successCallback)
		_successCallback({
			id: purchase.productId,
			token: purchase.token
		});
}

/**
* Handle `ON_CONNECT_EVENT` event. The event is fired when the Billing Service connects to the market. This event has no properties, but signifies that requests can now be made to the Android Market.
*/
function onConnect(evt) {
	console.log('Setup response: ' + responseString(evt.responseCode));

	if (evt.success) {
		console.log('Setup completed successfully!');

		InApp.trigger('ready');
	} else {
		console.log('Setup FAILED.');
	}
}

/**
* Handle `purchasecomplete` event. The event is fired when the module receives an asynchronous purchasecomplete response from the market.

*/
function onPurchaseComplete(evt) {
	console.log('onPurchaseComplete');
	console.log('Purchase response: ' + responseString(evt.responseCode));
	Ti.API.error(JSON.stringify(evt, null, 4));

	if (evt.responseCode == InAppBilling.RESULT_OK) {
		markProductAsPurchased(evt.purchase);
	} else if (evt.responseCode == InAppBilling.RESULT_ITEM_ALREADY_OWNED) {
		_successCallback({
			alreadyOwned: true
		});
	} else
		alert(responseString(evt.responseCode));

	// if(evt.result == InAppBilling.RESULT_OK) {
	// 	if (evt.signedData) {
	// 		var response = JSON.parse(evt.signedData);
	//
	// 		Ti.API.error('response: ' + JSON.stringify(response, null, 4));
	//
	// 		/*
	// 		 * We are not guaranteed to have any orders returned so
	// 		 * we need to make sure that this one exists before using it.
	// 		 *
	// 		 * If there is no notificationId then there is no need to confirmNotifications().
	// 		 * This happens when restoreTransactions() triggers a PURCHASE_STATE_CHANGED_EVENT.
	// 		 */
	// 		if(response.orders.length) {
	// 			_.each(response.orders, function(order) {
	// 				markProductAsPurchased(order);
	// 			});
	// 		}
	// 	}
	// }
}

function onRequestProducts(e) {
	console.log('Query Inventory response: ' + responseString(e.responseCode));
	var inventory = e.inventory;
	var purchaseIds = ['gas', 'infinite_gas'];
	var purchase, details;
	if (e.success) {
		for (var i = 0, j = purchaseIds.length; i < j; i++) {
			// Check for details
			if (inventory.hasDetails(purchaseIds[i])) {
				console.log('Check log for Purchase ' + i + ' details');
				Ti.API.info('Details: ' + JSON.stringify(inventory.getDetails(purchaseIds[i])));
			}
			// Check for purchase
			if (inventory.hasPurchase(purchaseIds[i])) {
				purchase = inventory.getPurchase(purchaseIds[i]);
				// Print details for each purchase
				console.log('Check log for Purchase ' + i + ' properties');
				Ti.API.info(purchaseProperties(purchase));

				// Queue 'gas' up to be consumed if it is owned
				if (purchase.productId === 'gas' &&
					purchase.purchaseState === InAppBilling.PURCHASE_STATE_PURCHASED) {
					toConsume = purchase;
					console.log('gas is queued to be consumed');
				}
			}
		}
	}
}

module.exports = InApp;

function responseString(responseCode) {
	switch (responseCode) {
		case InAppBilling.RESULT_OK:
			return 'OK';
		case InAppBilling.RESULT_USER_CANCELED:
			return 'USER CANCELED';
		case InAppBilling.RESULT_BILLING_UNAVAILABLE:
			return 'BILLING UNAVAILABLE';
		case InAppBilling.RESULT_ITEM_UNAVAILABLE:
			return 'ITEM UNAVAILABLE';
		case InAppBilling.RESULT_DEVELOPER_ERROR:
			return 'DEVELOPER ERROR';
		case InAppBilling.RESULT_ERROR:
			return 'RESULT ERROR';
		case InAppBilling.RESULT_ITEM_ALREADY_OWNED:
			return 'RESULT ITEM ALREADY OWNED';
		case InAppBilling.RESULT_ITEM_NOT_OWNED:
			return 'RESULT ITEM NOT OWNED';

		case InAppBilling.IAB_RESULT_REMOTE_EXCEPTION:
			return 'IAB RESULT REMOTE EXCEPTION';
		case InAppBilling.IAB_RESULT_BAD_RESPONSE:
			return 'IAB RESULT BAD RESPONSE';
		case InAppBilling.IAB_RESULT_VERIFICATION_FAILED:
			return 'IAB RESULT VERIFICATION FAILED';
		case InAppBilling.IAB_RESULT_SEND_INTENT_FAILED:
			return 'IAB RESULT SEND INTENT FAILED';
		case InAppBilling.IAB_RESULT_UNKNOWN_PURCHASE_RESPONSE:
			return 'IAB RESULT UNKNOWN PURCHASE RESPONSE';
		case InAppBilling.IAB_RESULT_MISSING_TOKEN:
			return 'IAB RESULT MISSING TOKEN';
		case InAppBilling.IAB_RESULT_UNKNOWN_ERROR:
			return 'IAB RESULT UNKNOWN ERROR';
		case InAppBilling.IAB_RESULT_SUBSCRIPTIONS_NOT_AVAILABLE:
			return 'IAB RESULT SUBSCRIPTIONS NOT AVAILABLE';
		case InAppBilling.IAB_RESULT_INVALID_CONSUMPTION:
			return 'IAB RESULT INVALID CONSUMPTION';
	}
	return '';
}

function purchaseStateString(state) {
	switch (state) {
		case InAppBilling.PURCHASE_STATE_PURCHASED:
			return 'PURCHASE STATE PURCHASED';
		case InAppBilling.PURCHASE_STATE_CANCELED:
			return 'PURCHASE STATE CANCELED';
		case InAppBilling.PURCHASE_STATE_REFUNDED:
			return 'PURCHASE STATE REFUNDED';
	}
	return '';
}

function purchaseTypeString(state) {
	switch (state) {
		case InAppBilling.ITEM_TYPE_INAPP:
			return 'ITEM TYPE INAPP';
		case InAppBilling.ITEM_TYPE_SUBSCRIPTION:
			return 'ITEM TYPE SUBSCRIPTION';
	}
	return '';
}

function purchaseProperties(p) {
	var str = 'type: ' + purchaseTypeString(p.type) +
		'\norderId: ' + p.orderId +
		'\npackageName: ' + p.packageName +
		'\nproductId: ' + p.productId +
		'\npurchaseTime: ' + new Date(p.purchaseTime) +
		'\npurchaseState: ' + purchaseStateString(p.purchaseState) +
		'\ndeveloperPayload: ' + p.developerPayload +
		'\ntoken: ' + p.token;

	return str;
}
