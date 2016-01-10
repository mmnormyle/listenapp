$(document).ready(function(){

	$("#div_genre").hide();
	$("#div_music").hide();
	$("#div_new_session").hide();
	$("#div_unfinished").hide();

	var pathname = window.location.pathname;
	var roomName = null;
	if(pathname.indexOf('\/rooms\/')>-1) {
		roomName = pathname.replace('\/rooms/', '');
	}

	if(!roomName) {
		$(".genre_inner").hide();
		$("#div_genre").show();
		$(".genre_inner").fadeIn(1000);
		$(".genre_inner").click(genreClicked);
		$("#txt_name_join").hide();	
	}

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

	if(roomName) {
		mGlobals.url_room = roomName;
	}

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
	url_room : null,
	youtube_api_ready : false,
	entered_jam : false,
	socket : {},
	player : {},
	user : {},
	session : {},
	queue : [],
	current_users : [],
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
	if(mGlobals.url_room && mGlobals.youtube_api_ready) {
		enterJamSession(mGlobals.url_room);
	}
}

function updateQueueUI() {
	var next_queue_position = mGlobals.user.queue_position + 1;
	var queue = mGlobals.queue;
	var queueList = document.getElementById('list_queue');
	queueList.innerHTML = "";
	for(var i=next_queue_position;i<queue.length;i++) {
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
		var innerht = '<span class="span_user" onclick="syncWithUserUI(this.getAttribute(\'data-username\'))" data-username="' + user.name +'" style="border-bottom:1px solid '+color+'; cursor: pointer;">'+user.name+'</span><br><br>';
		usersList.innerHTML += innerht;
	}
}

function syncWithUserUI(name) {
	for(var i=0;i<mGlobals.current_users.length;i++) {
		if(mGlobals.current_users[i].name===name) {
			syncWithUser(mGlobals.current_users[i]);
		}
	}
}

function clearSearchResults() {
	var searchList = document.getElementById('list_search_results');
	searchList.innerHTML = "";
}

function setupVideo() {
	if(mGlobals.user.queue_position!=-1) {
		var recommendation = mGlobals.queue[mGlobals.user.queue_position];
		updateQueueUI(mGlobals.queue, mGlobals.user.queue_position);
		updatePlayerUI(recommendation.videoId, mGlobals.user.video_time, recommendation.recommender_name);		
	}
}

//==================================================================
// Backend video and queue control functions
//==================================================================

function nextVideoInQueue() {
	mGlobals.user.video_time = 0;
	var queue = mGlobals.queue;
	if((mGlobals.user.queue_position+1)<queue.length) {
		var queue_position = mGlobals.user.queue_position = mGlobals.user.queue_position + 1;
		setupVideo();
		mGlobals.user.waiting = false;
	}
	else {
		$("#p_recommender").text("Queue up a song!");
		$("#p_recommender").css("border-bottom", "1px solid black");
		mGlobals.user.waiting = true;
	}
}

function queueSelectedVideo(elmnt) {
	clearSearchResults();
	var videoId = elmnt.getAttribute('data-videoId');
	var title = elmnt.innerText || element.textContent;
	var thumb_url = elmnt.getAttribute('data-thumb_URL');
	var recommendation = createRecommendation(title, videoId, thumb_url, mGlobals.user._id, mGlobals.user.name);
	var data = {
		sessionId : mGlobals.sessionId,
		recommendation : recommendation
	};
	//TODO: local add recommendation
	mGlobals.socket.emit('addRecommendationToSession', data);
}

//==================================================================
// Music Session setup and synchronization functions for session and user objects
// Basically all the hard stuff
//==================================================================

function syncWithUser(user) {
	mGlobals.user.queue_position = user.queue_position;
	mGlobals.user.video_time = user.video_time;
	mGlobals.user.player_state = user.player_state;
	updateQueueUI();
	setupVideo();
}


function saveUserVideoState() {
	if(mGlobals.player_ready) {
		mGlobals.user.video_time = mGlobals.player.getCurrentTime();
		mGlobals.user.player_state = mGlobals.player.getPlayerState();
		mGlobals.socket.emit('saveUserVideoState', mGlobals.user);	
		$.ajax({
			type : 'POST',
			url : '/userlist',
			data : {sessionId : mGlobals.sessionId},
			dataType : 'json',
			success: function(data) {
				mGlobals.current_users = data;
			}
		});
	}
}

function setupSocketEvents() {
	//receives the newest user and session objects from database
	mGlobals.socket.on('updateUser', updateUser);
	mGlobals.socket.on('sessionReady', sessionReady);
	mGlobals.socket.on('updateUsersList', updateUsersList);
	mGlobals.socket.on('updateQueue', updateQueue);
}

function updateUsersList(users) {
	users = JSON.parse(users);
	console.log('updateUsersList: ');
	console.log(users);
	if(mGlobals.sessionInitialized) {
		mGlobals.current_users = users;
		updateUsersListUI(mGlobals.current_users);	
	}		
}

function updateQueue(queue) {
	queue = JSON.parse(queue);
	console.log('updateQueue: ');
	console.log(queue);
	if(mGlobals.sessionInitialized) {
		mGlobals.queue = queue;
		updateQueueUI();	
		if(mGlobals.user.waiting) {
			nextVideoInQueue();
		}
	}
}

function updateUser(user) {
	console.log('updateUser');
	if(mGlobals.sessionInitialized) {
		mGlobals.user = user;	
	}
}

function sessionReady(data) {
	console.log('sessionReady');
	mGlobals.sessionId = data.sessionId;
	mGlobals.queue = data.queue;
	mGlobals.current_users = data.current_users;
	if(mGlobals.user.temp) {
		mGlobals.user = data.user;
	}
	console.log('about to save user video state');
	saveUserVideoState();
	setInterval(saveUserVideoState, 10000);
	nextVideoInQueue();
	updateUsersListUI(mGlobals.current_users);
	enterJamSessionUI();
	mGlobals.sessionInitialized = true;
}

//starts the whole shebang
function enterJamSession(urlRoomName) {
	if(mGlobals.entered_jam) {
		return;
	}
	else {
		mGlobals.entered_jam = true;
	}

	mGlobals.socket = io();
	setupSocketEvents();
	
	var sessionName = urlRoomName || $("#txt_group_join").val();
	mGlobals.session.name = sessionName;

	//TODO: better login flow
	var name = $("#txt_name_join").val();
	mGlobals.user = createTempUser(name || 'Anonymous');

	var data = {
		user : mGlobals.user,
		sessionName : mGlobals.session.name
	};
	mGlobals.socket.emit('userJoinSession', data);
}

//==================================================================
// Youtube API functions and player UI control
//==================================================================

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3", function() {
		mGlobals.youtube_api_ready = true;
		if(mGlobals.url_room && mGlobals.player_ready) {
			enterJamSession(mGlobals.url_room);
		}
	});
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
    	nextVideoInQueue();
    }
}

function updatePlayerUI(current_video, current_video_time, current_recommender_name) {
	while(!mGlobals.player_ready) {}
	mGlobals.player.loadVideoById(current_video, current_video_time, "large");	
	$("#p_recommender").text("Recommended by " + current_recommender_name);
	var color = 'black';
	var users = mGlobals.current_users;
	//TODO: better way of colors
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		if(user.name===current_recommender_name) {
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
	user.name = nickname;
	user.queue_position = -1;
	user.video_time = -1;
	user.player_state = -1;
	return user;
}
