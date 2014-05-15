var Alloy = require('alloy'),
    _ = Alloy._,
    Backbone = Alloy.Backbone;

/**
 * Access Control List library
 *
 * @class Acl
 */
var Acl = {
	user: null,

	/**
	 * {String} The salt to hash passwords before they are sent to the Oauth endpoint
	 */
	salt: Alloy.CFG.salt,

	/**
	 * {String} Access token set by loggedin User
	 */
	cloudAccessToken: '',

	/**
	 * Set and Store a new Collapp API access token
	 *
	 * @param {String} access_token Access token to store
	 */
	setCloudAccessToken: function(access_token) {
		Acl.cloudAccessToken = access_token;
		Cloud.accessToken = access_token;
		Acl.storeCredentials(Ti.App.id, 'cloudAccessToken', access_token);
	},

	/**
	 * Authenticate against the Oauth 2 endpoint if necessary
	 *
	 * @param {String} username Username of User to authenticate
	 * @param {String} password Password (or better Hash) of User to authenticate
	 * @param {String} type User type of User to authenticate
	 * @param {Object} success Callback object containing function (& scope); will be called upon success with the authentication's result
	 * @param {Object} failure Callback object containing function (& scope); will be called upon error
	 */
	authenticateUserWithCloud: function(username, password, type, success, failure) {
		return new Cloud({
			url: '/oauth/access_token',
			method: 'POST',
			data: {
				username: username,
				password: password,
				include_entities: true,
				user_type: type,
				grant_type: 'client_credentials'
			},
			success: function(response) {
				Ti.API.info('Saving Access Token', 'acl');
				Ti.API.info(response);
				Acl.setCloudAccessToken(response.access_token.access_token);
				success(response);
			},
			error: failure
		});
	},

	/**
	 * Is there a loggedin User?
	 *
	 * @return {Bool} Whether or not there is a logged in User
	 */
	isLoggedin: function() {
		return !!Ti.App.Properties.getString('loggedinUserId');
	},

	/**
	 * Set loggedin User
	 */
	setIsLoggedin: function(user) {
		Ti.App.Properties.setString('loggedinUserId', user.id);
	},

	/**
	 * Get the loggedin User
	 * @return {Sc.model.UserLoggedIn} The currently loggedin User
	 */
	getLoggedinUser: function() {
		if (!Acl.user) {
			Acl.user = Alloy.createModel('User', {
				id: Ti.App.Properties.getString('loggedinUserId')
			});
			Acl.user.fetch();
		}
		return Acl.user;
	},

	/**
	 * Set the loggedin User
	 * @param {Sc.model.UserLoggedIn} user User to set as loggedin User
	 */
	setLoggedinUser: function(user) {
		Acl.user = user;

		// Update cache
		// Acl.user.save(null, {
		// 	target: 'cache'
		// });

		Acl.setIsLoggedin(user);
	},

	/**
	 * Handle Signup of a new User in the Collapp API
	 *
	 * @param {Object} userData Data for the new User
	 * @param {Object} callback Callback to call
	 * @param {function} callback.successFn Function to call on success
	 * @param {function} callback.error Function to call on error
	 * @param {Object} callback.scope Scope to call the callback function in
	 */
	signup: function(userData, callback) {
		userData.password = Ti.Utils.sha1(userData.password + Acl.salt);

		// Store credentials
		Acl.storeCredentials(Ti.App.id, userData.email, userData.password);

		Acl.registerUserWithCloud(userData, callback);
	},

	/**
	 * Login an existing User to the Collapp API
	 *
	 * @param {String} email Email of existing User
	 * @param {String} password Password of existing User
	 * @param {Object} callback Callback to call
	 * @param {function} callback.successFn Function to call on success
	 * @param {function} callback.error Function to call on error
	 * @param {Object} callback.scope Scope to call the callback function in
	 */
	login: function(email, password, callback) {
		var hashedPass = Ti.Utils.sha1(password + Acl.salt);
		password = null;

		// Login
		Acl.authenticateUserWithCloud(email, hashedPass, 'collapp',
			function(event) {
				Ti.API.info('login', event);

				// Store credentials
				Acl.storeCredentials(Ti.App.id, email, hashedPass);

				// Add email to stored User
				event.user.email = email;

				Acl.onLoginSuccess(event, callback);
			},
			callback.error
		);
	},

	/**
	 * Log the current user out
	 *
	 * @param {Boolean} forced True if the logout was forced, false otherwise
	 */
	logout: function(forced) {
		Ti.API.info('Removing logged in user id and cloud access token from properties', 'prop');
		Ti.App.Properties.removeProperty('loggedinUserId');
		Acl.setCloudAccessToken(null);
		// keychain.deletePasswordForService('Collapp', 'cloudAccessToken');

		if (Acl.getLoggedinUser()) {
			if (Acl.getLoggedinUser().hasSocialNetwork('facebook')) {
				require('facebook').logout();
			}
		}

		// Unregister for push notifications
		// PushNotifications.unRegister();

		// Reset Collapp state to logged out
		F.setStatus(F.INSTALLED);

		// Navigate to index controller and let it handle the rest
		Alloy.createController('index');
	},

	/**
	 * Store credentials
	 *
	 * @param {String} service
	 * @param {String} account
	 * @param {String} password
	 */
	storeCredentials: function(service, account, password) {
		// keychain.setPasswordForService(password, service, account);
		Ti.App.Properties.setString(service + '-' + account, password);
	},

	/**
	 * Get previously stored credentials
	 *
	 * @param {String} service
	 * @param {String} account
	 * @return {String} Stored password
	 */
	getCredentials: function(service, account) {
		// return keychain.getPasswordForService(service, account);
		return Ti.App.Properties.getString(service + '-' + account);
	},

	/**
	 * Register a new User at the Collapp API
	 *
	 * @param {Object} userData
	 * @param {Object} callback Callback to call
	 * @param {function} callback.successFn Function to call on success
	 * @param {function} callback.error Function to call on error
	 * @param {Object} callback.scope Scope to call the callback function in
	 */
	registerUserWithCloud: function(userData, callback) {
		Ti.API.info(userData);

		return new Cloud({
			url: '/user',
			method: 'POST',
			data: userData,
			contentType: 'multipart/form-data',
			success: function(cloudUser) {
				Acl.onLoginSuccess(cloudUser, callback);
			},
			error: callback.error
		});
	},

	/**
	 * Connect a social media account to the currently loggedin User
	 *
	 * @param {Object} userData Data of the social media account
	 * @param {Object} callback Callback to call after connecting is done
	 * @param {function} callback.successFn Function to call on success
	 * @param {function} callback.error Function to call on error
	 * @param {Object} callback.scope Scope to call the callback function in
	 */
	connectSocialMediaToUser: function(userData, callback) {
		return new Cloud({
			url: '/user/' + Acl.getLoggedinUser().id + '/connect',
			method: 'POST',
			data: userData,
			success: callback.success,
			error: callback.error
		});
	},

	/**
	 * Default callback to be called fist after login, signup or connect
	 *
	 * @param {Object} cloudResponse Response from the Collapp API
	 * @param {Object} callback
	 * @param {function} callback.successFn Function to call on success
	 * @param {Object} callback.scope Scope to call the callback function in
	 */
	onLoginSuccess: function(cloudResponse, callback) {
		Ti.API.info(cloudResponse);

		var cloudUser = cloudResponse.user;

		if (cloudResponse.access_token) {
			Acl.setCloudAccessToken(cloudResponse.access_token.access_token);
		}

		// Ti.API.info('on login/connect success: ' + cloudUser.name, 'login');

		// Set new loggedin user
		Acl.setLoggedinUser(Alloy.createModel('User', cloudUser));

		// When done, call callback
		Ti.API.info('Calling login callback', 'login');

		callback.success();
	}
};

// Load AccessToken and store it in ACL and Cloud
Acl.cloudAccessToken = Acl.getCredentials(Ti.App.id, 'cloudAccessToken');

module.exports = Acl;
