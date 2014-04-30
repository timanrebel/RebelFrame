if (OS_IOS)
	module.exports = require('RebelFrame/iphone/InApp');
else if (OS_ANDROID)
	module.exports = require('RebelFrame/android/InApp');