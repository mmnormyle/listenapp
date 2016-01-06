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
	sessions.updateById(session._id,
	 {$set : 
	 	{
	 		'current_users_names':session.current_users_names,
	 		'name':session.name,
	 		'current_video':session.current_video,
	 		'current_recommender_name':session.current_recommender_name,
	 		'queue':session.queue,
	 		'player_state':session.player_state
	 	}}, 
	 	function() {
			console.log('updated session');
		}
	);
})

module.exports = router;
