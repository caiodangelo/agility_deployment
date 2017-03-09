
var Promise = require('promise');
var request = require("request");
var ClientOAuth2 = require('client-oauth2')
var util = require('util')
var DiffParser = require('parse-diff')

const REPOSITORY_URI = "https://api.bitbucket.org/2.0/repositories/%s/%s/";
const REPOSITORY_COMMITS_URI = REPOSITORY_URI + "commits/%s?exclude=%s"
const REPOSITORY_DIFF_URI = REPOSITORY_URI + "diff/%s"

function GitRepo(repositoryOwner, repositoryName){

	this.repositoryOwner = repositoryOwner;
	this.repositoryName = repositoryName;
	 
	var oauthClient = new ClientOAuth2({
	  clientId: process.env.CLIENT_ID,
	  clientSecret: process.env.CLIENT_SECRET,
	  accessTokenUri: 'https://bitbucket.org/site/oauth2/access_token'
	});

	this._oauthClient= oauthClient;
}
	

GitRepo.prototype.token = function(){

	var token = this._oauthClient.createToken("banana", process.env.REFRESH_TOKEN );
	var that = this;

	return new Promise(function(resolve, reject){
		if (that.accessToken){
			resolve(that.accessToken);
		} else {
			token.refresh().then(function(data){ 
				that.accessToken = data.accessToken; 
				resolve(data.accessToken);
			}, reject);
		}
	});
}


GitRepo.prototype.commits = function(reference_to,reference_from){
	var uri = util.format(REPOSITORY_COMMITS_URI,this.repositoryOwner,this.repositoryName,reference_to,reference_from);
	var that = this;

	return new Promise(function(resolve,reject){
		that._request(uri).then(body=>resolve(GitRepo._parse_commits(body)),reject);
	});
}


GitRepo.prototype._request = function(uri){

	var promise_token = this.token();	

	return new Promise(function(resolve,reject){

		promise_token.then(function(token){

			console.info("URI: %s",uri)

			request({
				uri: uri,
				headers:{
					"Authorization":"Bearer " + token
				}
			},function(error, response, body){				
				if (error) {
					reject(error) 
				} else {
					resolve(body);
				}
			});

		}, reject);
	});

}

GitRepo.prototype.withDiff = function(commits){

	var that = this;

	return new Promise(function(resolve,reject){

		var diffPromises = [];
			
		for (var i = 0; i < commits.length; i++) {

			var uri = util.format(REPOSITORY_DIFF_URI,that.repositoryOwner,that.repositoryName,commits[i].hash);

			diffPromises.push(that._request(uri));
		}

		Promise.all(diffPromises).then(function(rawDiffs){

			for (var i = 0; i < rawDiffs.length; i++){
				var diff = GitRepo._parse_diff(rawDiffs[i]);

				commits[i].diff = diff;
			}

			resolve(commits);
		})


	});
}

GitRepo._parse_diff = function(diff){


	var files = DiffParser(diff);
	var additions = 0, deletions = 0;

	files.forEach(function(file) {
        deletions+=file.deletions;
        additions+=file.additions;
	});

	return {deletions : deletions, additions: additions};
}

GitRepo._parse_commits = function(body){

	var _commits = JSON.parse(body).values;
	var commits = [];

	for (var i = 0, len = _commits.length; i < len; i++) {
	  var _commit = _commits[i];
	  commits.push({ "hash": _commit.hash, "created": _commit.date, "author": _commit.author.user.username, "message": _commit.message });
	}

	return commits;
}

module.exports = GitRepo;