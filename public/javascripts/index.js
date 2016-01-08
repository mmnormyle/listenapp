$(document).ready(function(){

	$("#div_music").hide();
	$("#div_new_session").hide();
	$("#div_unfinished").hide();

	$(".genre_inner").hide();
	$(".genre_inner").fadeIn(1000);
	$(".genre_inner").click(genreClicked);
	$("#txt_name_join").hide();
	$("#txt_name_join").keypress(function(e) {
		if(e.which==13) {
			enterJamSession();
		}
	});
	$("#txt_group_join").keypress(function(e) {
		if(e.which==13) {
			$("#txt_group_join").hide();
			$("#txt_name_join").fadeIn(500);	
			$("#txt_name_join").focus();
			$("#txt_name_join").select();
		}
	});
	$("#txt_search_videos").keypress(function(e) {
		if(e.which==13) {
			searchVideos();
		}
	});

});


//==================================================================
// Global variables
//==================================================================
var mConstants = {
	"COLORS" : ["green","red","blue","orange","teal"],
	"PLAYING" : 1,
	"PAUSED" : 2
};

var mGlobals = {
	sessionInitialized : false,
	player_ready : false,
	socket : {},
	player : {},
	user : {},
	session : {}
};


//==================================================================
// UI Functions
//==================================================================

function enterJamSessionUI() {
	$("#div_genre").hide();
	$("#div_music").fadeIn(1000);	
}

function genreClicked() {
	$("#div_genre").hide();
	$("#div_unfinished").fadeIn(1000);
}

function onPlayerReady(event) {
	mGlobals.player_ready = true;
}

function updateQueueUI(queue) {
	var queueList = document.getElementById('list_queue');
	queueList.innerHTML = "";
	for(var i=queue;i<queue.length;i++) {
		var recommendation = queue[i];
		var innerht = "<li><div><img src='" + recommendation.thumb_URL + "' height='45' width='80'></img><br><br><span style='display: block; text-align: center;'>" + recommendation.title + "</span></div></li><br>";
		queueList.innerHTML += innerht;
	}
}

function updateUsersListUI(users) {
	var usersList = document.getElementById('div_users_list');
	usersList.innerHTML = "";
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		var color = mConstants.COLORS[i%mConstants.COLORS.length];
		var innerht = '<span class="span_user" style="border-bottom:1px solid '+color+';">'+user.name+'</span><br><br>';
		usersList.innerHTML += innerht;
	}
}

function clearSearchResults() {
	var searchList = document.getElementById('list_search_results');
	searchList.innerHTML = "";
}

//==================================================================
// Backend video and queue control functions
//==================================================================

function nextVideoInQueue(first) {
	mGlobals.user.video_time = 0;

	var queue_position = mGlobals.user.queue_position = mGlobals.user.queue_position + 1;
	var queue = mGlobals.user.queue_position;

	if(queue_position<queue.length) {
		var recommendationId = queue[queue_position];
		fetchRecommendationFromDatabase(recommendationId, function(recommendation) {
			updateQueue();
			updatePlayerUI(recommendation.videoId, 0, recommendation.recommender_name);	
		});
		return true;
	}
	else {
		$("#p_recommender").text("Queue up a song!");
		$("#p_recommender").css("border-bottom", "1px solid black");
		return false;
	}
}

function queueSelectedVideo(elmnt) {
	clearSearchResults();
	var videoId = elmnt.getAttribute('data-videoId');
	var title = elmnt.innerText || element.textContent;
	var thumb_url = elmnt.getAttribute('data-thumb_URL');
	var recommendation = createRecommendation(title, videoId, thumb_url, mGlobals.user._id, mGlobals.user._id);
	var data = {
		sessionId : mGlobals.session._id,
		recommendation : recommendation);
	}
	//TODO: local add recommendation
	socket.emit('addRecommendationToSession', data);
}

//==================================================================
// Music Session setup and synchronization functions for session and user objects
// Basically all the hard stuff
//==================================================================
function saveUserVideoState() {
	mGlobals.user.video_time = player.getCurrentTime();
	mGlobals.user.player_state = player.getcurrentState();
	socket.emit('saveUserVideoState', mGlobals.user);
}

function setupSocketEvents() {
	//receives the newest user and session objects from database
	socket.on('updateUser', updateUser(user));
	socket.on('updateSession', sessionUpdate(session));
	socket.on('sessionReady', sessionReady(session));
}

function updateUser(user) {
	mGlobals.user = user;
}

function updateSession(session) {
	mGlobals.session = session;
	updateQueue();
	updateUsersList();
	if(mGlobals.user.waiting) {
		nextVideoInQueue(true);
	}
}

function sessionReady(session) {
	mGlobals.session = session;
	saveUserVideoState();
	setInterval(saveUserVideoState, 10000);
	mGlobals.user.waiting = nextVideoInQueue(true);
	enterJamSessionUI();
}

function updateQueue() {
	jQuery.ajax({
		type : 'GET',
		url : '/fetchqueue',
		data : JSON.stringify(mGlobals.session.queue),
		dataType : 'json',
		success : function(data) {
			//TODO: JSON issues
			var queue = data; //JSON.parse(data);
			updateQueueUI(queue);
		},
		error: function() {
			console.log('error getting queue from database');
		}
	});
}

function updateUsersList() {
	jQuery.ajax({
		type : 'GET',
		url : '/fetchusersinsession',
		data : JSON.stringify(mGlobals.session.current_users),
		dataType : 'json',
		success : function(data) {
			//TODO: JSON issues
			var current_users = data; //JSON.parse(data);
			updateUsersListUI(current_users);
		},
		error: function() {
			console.log('error getting user list from database');
		}
	});
}

function fetchRecommendationFromDatabase(recommendationId, callbackFunc) {
	jQuery.ajax({
		type : 'GET',
		url : '/fetchrecommendation',
		data : recommendationId,
		dataType : 'json',
		success : function(data) {
			var recommendation = data;
			if(!(callbackFunc===null)) {
				callbackFunc(recommendation);
			}
		},
		error: function() {
			console.log('error getting user list from database');
		}
	});
}

//starts the whole shebang
function enterJamSession() {
	mGlobals.socket = io();
	setupSocketEvents();
	
	var sessionName = $("#txt_group_join").val(); 

	//TODO: better login flow
	var name = $("#txt_name_join").val();
	mGlobals.user = createTempUser(name);

	var data = {
		user : mGlobals.user,
		sessionName : sessionName
	};
	socket.emit('userLoginToSession', data);

	storeTempUser(mGlobals.user, getSession(sessionName));
}

//==================================================================
// Youtube API functions and player UI control
//==================================================================

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3");
}

function onYouTubeIframeAPIReady() {
	mGlobals.player = new YT.Player('youtubeplayer', {
        height: '270',
        width: '400',
        playerVars: {
        	controls: 1,
        	showinfo: 0,
        	autoplay: 1
        },
        events: {
        	'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function searchVideos() {
	var request = gapi.client.youtube.search.list({
		part: "snippet",
		type: "video",
		q: encodeURIComponent($("#txt_search_videos").val()).replace(/%20/g, "+"),
		maxResults: 3
	});
	//execute the request
	request.execute(function(response) {
		var searchList = document.getElementById('list_search_results');
		var results = response.result;
		clearSearchResults();
		$.each(results.items, function(index, item) {
			searchList.innerHTML += ("<li onClick='queueSelectedVideo(this)' data-videoId='" + item.id.videoId + "' data-thumb_URL='"+item.snippet.thumbnails.medium.url+"'>"+item.snippet.title+'</li>');
		});
	});
}

function updatePlayerState(state) {
	if(mGlobals.player_ready) {
		if(state==mConstants.PLAYING) {
			mGlobals.player.playVideo();
		}
		else if(state==mConstants.PAUSED) {
			mGlobals.player.pauseVideo();
		}
	}
}

function onPlayerStateChange(event) {
	//when video ends
    if(event.data==0) {
    	nextVideoInQueue(false);
    }
}

function updatePlayerUI(current_video, current_video_time, current_recommender_name) {
	while(!mGlobals.player_ready) {}
	mGlobals.player.loadVideoById(current_video, current_video_time, "large");	
	$("#p_recommender").text("Recommended by " + current_recommender_name);
	var color = 'black';
	var users = getUsersFromDatabase(mGlobals.session.current_users);
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		if(user===current_recommender_name) {
			color = mConstants.COLORS[i % mConstants.COLORS.length];
		}
	}
	$("#p_recommender").css("border-bottom", "1px solid " + color);
}

//==================================================================
// Basically constructors. Probably a better way to do this.
//==================================================================

function createRecommendation(title, videoId, thumb_url, userId, recommender_name) {
	var rec = {};
	rec.videoId = videoId;
	rec.title = title;
	rec.thumb_URL = thumb_url;
	rec.recommender_name = recommender_name;
	rec.userId = userId;
	return rec;
}

function createTempUser(nickname) {
	var user = {};
	user.temp = true;
	user.name = name;
	user.queue_position = -1;
	user.video_time = -1;
	user.player_state = -1;
	return user;
}
