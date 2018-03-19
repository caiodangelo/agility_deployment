var moment = require("moment");
var stats = require("stats-lite");
var unique = require('array-unique');
var logger = require("../logger/logger.js");


module.exports = function (app) {

    var Schema = require('mongoose').Schema;
    var db = app.database.connection;

    var payload_webhook = Schema({
        "repository" : {type: String},
        "truncated" : {type: Boolean},
        "pattern" : {type: String},
        "count" : {type: Number}
    }, { versionKey: false, collection : "webhook", toObject: { virtuals: true }, toJSON: { virtuals: true, commits: false } } )


    return db.model('webhook', payload_webhook);

}
