module.exports = function(io) {
	var express = require('express');
	var router = express.Router();
	var ObjectID = require('mongodb').ObjectID;

	/* GET home page. */
	router.get('/', function(req, res, next) {
	  res.render('index', { title: 'Moosic' });
	});

	router.get(/rooms\/*/, function(req, res, next) {
	  res.render('musicroom', { title: 'Moosic' });
	});

	router.post('/userlist', function(req, res, next) {
		var db = req.db;
		var sessionId = ObjectID(req.body.sessionId);
		db.collection('users').find({"in_session" : sessionId}).toArray(function(err, results) {
			//TODO: don't query password
			for(var i=0;i<results.length;i++) {
				delete results[i].password;
			}
			res.send(results);
		});
	});

	return router;
}
