var Alloy = require('alloy'),
	_ = Alloy._,
	Backbone = Alloy.Backbone,
	Acl = require('RebelFrame/Acl'),
	Storekit = require('ti.storekit');

/**
 * @class InApp
 *
 * In-app purchases support for IOS
 */
var InApp = {
	getReceipt: function(callback) {
		function validate() {
			Ti.API.error('Validating receipt.');
			Ti.API.error('Receipt is Valid: ' + Storekit.validateReceipt());

			callback(Storekit.receipt);
		}

		//  During development it is possible that the receipt does not exist.
		//  This can be resolved by refreshing the receipt.
		if (!Storekit.receiptExists) {
			Ti.API.error('Receipt does not exist yet. Refreshing to get one.');
			Storekit.refreshReceipt(null, function() {
				validate();
			});
		} else {
			Ti.API.error('Receipt does exist.');
			validate();
		}
	},

	purchase: function(product, callback) {
		_successCallback = callback;

		// if (product.downloadable) {
		// 	Ti.API.error('Purchasing a product that is downloadable');
		// }
		Storekit.purchase({
			product: product,
			// applicationUsername is a opaque identifier for the user’s account on your system.
			// Used by Apple to detect irregular activity. Should hash the username before setting.
			applicationUsername: Acl.isLoggedin() ? Ti.Utils.sha1(Acl.getLoggedinUser().id + Acl.salt) : null
		});
	},

	getProduct: function(productIdentifier, callback) {
		requestProduct(productIdentifier, function(product) {
			callback(product);

			InApp.trigger('ready');
		});
	},

	restore: function(callback) {
		_successCallback = callback;
		
		Storekit.restoreCompletedTransactions();
	},

	isSupported: function() {
		return Storekit.canMakePayments;
	}
};

// Add Backbone powered events
_.extend(InApp, Backbone.Events);

var verifyingReceipts = true;
var _successCallback;

/*
 If you decide to perform receipt verification then you need to indicate if the receipts should be verified
 against the "Sandbox" or "Live" server. If you are verifying auto-renewable subscriptions then you need
 to set the shared secret for the application from your iTunes Connect account.
 */
Storekit.receiptVerificationSandbox = (Ti.App.deployType !== 'production');
Storekit.receiptVerificationSharedSecret = Alloy.CFG.storeKitReceiptVerificationSharedSecret;

/*
 autoFinishTransactions must be disabled (false) in order to start Apple hosted downloads.
 If autoFinishTransactions is disabled, it is up to you to finish the transactions.
 Transactions must be finished! Failing to finish transactions will cause your app to run slowly.
 Finishing a transaction at any time before its associated download is complete will cancel the download.
 */
Storekit.autoFinishTransactions = true;

/*
 bundleVersion and bundleIdentifier must be set before calling validateReceipt().
 Do not pull these values from the app, they should be hard coded for security reasons.
 */
Storekit.bundleVersion = Ti.App.version; // eg. "1.0.0"
Storekit.bundleIdentifier = Ti.App.id; // eg. "com.appc.storekit"

/**
 * Purchases a product.
 * @param product A Ti.Storekit.Product (hint: use Storekit.requestProducts to get one of these!).
 */
Storekit.addEventListener('transactionState', onTransactionState);

/**
 * Restores any purchases that the current user has made in the past, but we have lost memory of.
 */
Storekit.addEventListener('restoredCompletedTransactions', onRestoredCompletedTransactions);

/**
 * WARNING
 * addTransactionObserver must be called after adding the Storekit event listeners.
 * Failure to call addTransactionObserver will result in no Storekit events getting fired.
 * Calling addTransactionObserver before event listeners are added can result in lost events.
 */
Storekit.addTransactionObserver();

/**
 * Requests a product. Use this to get the information you have set up in iTunesConnect, like the localized name and
 * price for the current user.
 * @param identifier The identifier of the product, as specified in iTunesConnect.
 * @param success A callback function.
 * @return A Ti.Storekit.Product.
 */
function requestProduct(identifier, callback) {
	var singleProduct = false;
	if (!_.isArray(identifier)) {
		identifier = [identifier];
		singleProduct = true;
	}

	Storekit.requestProducts(identifier, function(evt) {
		if (!evt.success) {
			alert('ERROR: We failed to talk to Apple!');
		} else if (evt.invalid) {
			alert('ERROR: We requested an invalid product!');
		} else {
			if (singleProduct)
				callback(evt.products[0]);
			else
				callback(evt.products);
		}
	});
}

function markProductAsPurchased(productIdentifier) {
	Ti.API.error(productIdentifier);

	var base64_receipt = Ti.Utils.base64encode(Storekit.receipt).text;
	var b62_no_bl = base64_receipt.replace(/(\r\n|\n|\r)/gm, '');

	Ti.API.error(b62_no_bl);

	if (_successCallback)
		_successCallback({
			id: productIdentifier,
			token: b62_no_bl
		});
}

function onTransactionState(evt) {
	Ti.API.error('onTransactionState');
	Ti.API.error(evt);

	switch (evt.state) {
		case Storekit.TRANSACTION_STATE_FAILED:
			if (evt.cancelled) {
				Ti.API.error('Purchase cancelled');
			} else {
				alert('ERROR: ' + evt.message);
			}
			evt.transaction && evt.transaction.finish();
			break;
		case Storekit.TRANSACTION_STATE_PURCHASED:
			Ti.API.error('Purchased ' + evt.productIdentifier);

			if (verifyingReceipts) {
				if (IOS7) {
					// iOS 7 Plus receipt validation is just as secure as pre iOS 7 receipt verification, but is done entirely on the device.
					var msg = Storekit.validateReceipt() ? 'Receipt is Valid!' : 'Receipt is Invalid.';

					markProductAsPurchased(evt.productIdentifier);
				} else {
					// Pre iOS 7 receipt verification
					Storekit.verifyReceipt(evt, function(e) {
						if (e.success) {
							if (e.valid) {
								Ti.API.error('Thanks! Receipt Verified');
								markProductAsPurchased(evt.productIdentifier);
							} else {
								Ti.API.error('Sorry. Receipt is invalid');
							}
						} else {
							alert(e.message);
						}
					});
				}
			} else {
				markProductAsPurchased(evt.productIdentifier);
			}

			// If the transaction has hosted content, the downloads property will exist
			// Downloads that exist in a PURCHASED state should be downloaded immediately, because they were just purchased.
			if (evt.downloads) {
				Storekit.startDownloads({
					downloads: evt.downloads
				});
			} else {
				// Do not finish the transaction here if you wish to start the download associated with it.
				// The transaction should be finished when the download is complete.
				// Finishing a transaction before the download is finished will cancel the download.
				evt.transaction && evt.transaction.finish();
			}

			break;
		case Storekit.TRANSACTION_STATE_PURCHASING:
			Ti.API.error('Purchasing ' + evt.productIdentifier);
			break;
		case Storekit.TRANSACTION_STATE_RESTORED:
			// The complete list of restored products is sent with the `restoredCompletedTransactions` event
			Ti.API.error('Restored ' + evt.productIdentifier);
			// Downloads that exist in a RESTORED state should not necessarily be downloaded immediately. Leave it up to the user.
			if (evt.downloads) {
				Ti.API.error('Downloads available for restored product');
			}

			evt.transaction && evt.transaction.finish();
			break;
		default:
			Ti.API.error('Unknown transaction state');
	}
}

function onRestoredCompletedTransactions(evt) {

	if (evt.error) {
		alert(evt.error);
	} else if (evt.transactions === null || evt.transactions.length === 0) {
		alert('There were no purchases to restore!');
	} else {
		if (IOS7 && verifyingReceipts) {
			if (Storekit.validateReceipt()) {
				Ti.API.error('Restored Receipt is Valid!');
			} else {
				Ti.API.error('Restored Receipt is Invalid.');
			}
		}

		var verify = function(e) {
			if (e.valid) {
				markProductAsPurchased(e.productIdentifier);
			} else {
				Ti.API.error("Restored transaction is not valid");
			}
		};

		for (var i = 0; i < evt.transactions.length; i++) {
			if (!IOS7 && verifyingReceipts) {
				Storekit.verifyReceipt(evt.transactions[i], verify);
			} else {
				markProductAsPurchased(evt.transactions[i].productIdentifier);
			}
			alert('Restored ' + evt.transactions.length + ' purchases!');
		}
	}
}

/**
 * Tells us if the version of iOS we are running on is iOS 7 or later
 */
function isIOS7Plus() {
	if (Titanium.Platform.name == 'iPhone OS') {
		var version = Titanium.Platform.version.split(".");
		var major = parseInt(version[0], 10);

		// can only test this support on a 3.2+ device
		if (major >= 7) {
			return true;
		}
	}
	return false;

}

var IOS7 = isIOS7Plus();

module.exports = InApp;
