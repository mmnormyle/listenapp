module.exports = function(io) {
	var express = require('express');
	var router = express.Router();

	/* GET home page. */
	router.get('/', function(req, res, next) {
	  res.render('index', { title: 'Express' });
	});

	router.get('/sessionlist', function(req, res, next) {
	  var db = req.db;
	  var collection = db.get('sessions');
	  collection.find({},{},function(e,docs) {
	  	res.json(docs);
	  });
	});

	router.post('/savesession', function(req, res) {
		var session = req.body;
		var db = req.db;
		var sessions = db.get('sessions');
		
		//TODO: weird ass workaround
		if(session.current_users_names!=null) {
			if(!(session.current_users_names.constructor===Array)) {
				session.current_users_names = [session.current_users_names];
			}
		}
		else {
			session.current_users_names = [];
		}
		
		if(session.queue!=null) {
			if(!(session.queue.constructor===Array)) {
				session.queue = [session.queue];
			}	
		}
		else {
			session.queue = [];
		}

		sessions.updateById(session._id,
		 {$set : 
		 	{
		 		'current_users_names':session.current_users_names,
		 		'name':session.name,
		 		'current_video':session.current_video,
		 		'current_recommender_name':session.current_recommender_name,
		 		'queue':session.queue,
		 		'player_state':session.player_state,
		 		'current_video_time':session.current_video_time
		 	}}, 
		 	function(err) {
				console.log('updated session');
				res.send((err === null) ? {msg : ''} : {msg : err});	
			}
		);
	})

	return router;
}
