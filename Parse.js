var Cloud = require('RebelFrame/Cloud'),
    Acl = require('RebelFrame/Acl');

module.exports = {
    cloudFunction: function(config) {
        new Cloud({
            url: 'https://api.parse.com/1/functions/' + config.function,
            method: 'POST',
            json: true,
            data: config.data || {},
            headers: {
                'X-Parse-Application-Id': Alloy.CFG.Parse.applicationId,
                'X-Parse-REST-API-Key': Alloy.CFG.Parse.apiKey,
                'X-Parse-Session-Token': Acl.cloudAccessToken
            },
            success: config.success,
            error: config.error
        });
    },

    config: function(config) {
        new Cloud({
            url: 'https://api.parse.com/1/config/',
            method: 'GET',
            json: true,
            headers: {
                'X-Parse-Application-Id': Alloy.CFG.Parse.applicationId,
                'X-Parse-REST-API-Key': Alloy.CFG.Parse.apiKey,
                'X-Parse-Session-Token': Acl.cloudAccessToken
            },
            success: config.success,
            error: config.error
        });
    }
};
