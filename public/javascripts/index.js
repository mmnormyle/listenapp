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

/* =============== GLOBAL VARIABLES ================= */
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

/* ================== UI FUNCTIONS ================== */

function genreClicked() {
	$("#div_genre").hide();
	$("#div_unfinished").fadeIn(1000);
}

function onPlayerReady(event) {
	mGlobals.player_ready = true;
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

function updateQueueUI() {
	var queueList = document.getElementById('list_queue');
	queueList.innerHTML = "";
	var queue = mGlobals.session.queue;
	for(var i=mGlobals.user.queue_position;i<queue.length;i++) {
		//TODO : JSON issues
		var recommendation = JSON.parse(queue[i]);
		var innerht = "<li><div><img src='" + recommendation.thumb_URL + "' height='45' width='80'></img><br><br><span style='display: block; text-align: center;'>" + recommendation.title + "</span></div></li><br>";
		queueList.innerHTML += innerht;
	}
}

function updateUsersList() {
	var usersList = document.getElementById('div_users_list');
	usersList.innerHTML = "";
	var users = mGlobals.session.current_users_names;
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

function updatePlayerUI(current_video, current_video_time, current_recommender_name) {
	while(!mGlobals.player_ready) {}
	mGlobals.player.loadVideoById(current_video, current_video_time, "large");	
	$("#p_recommender").text("Recommended by " + current_recommender_name);
	var color = 'black';
	var users = mGlobals.session.current_users_names;
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		if(user===current_recommender_name) {
			color = mConstants.COLORS[i % mConstants.COLORS.length];
		}
	}
	$("#p_recommender").css("border-bottom", "1px solid " + color);
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

var done = false;
function onPlayerStateChange(event) {
	//when video ends
    if(event.data==0) {
    	nextPlayerVideo(false);
    }
}

function nextPlayerVideo(first) {
	mGlobals.user.video_time = 0;

	var queue_position = mGlobals.user.queue_position = mGlobals.user.queue_position + 1;
	var queue = mGlobals.user.queue_position;

	if(queue_position<queue.length) {
		//TODO: JSON issues
		var recommendation = JSON.parse(queue[queue_position]);
		updateQueueUI();
		updatePlayerUI(recommendation.videoId, 0, recommendation.recommender_name);
		return true;
	}
	else {
		$("#p_recommender").text("Queue up a song!");
		$("#p_recommender").css("border-bottom", "1px solid black");
		return false;
	}
}

/* ================ BACKEND FUNCTIONS ================ */

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

function queueSelectedVideo(elmnt) {
	clearSearchResults();
	var recommendation = {};

	var videoID = elmnt.getAttribute('data-videoId');
	var title = elmnt.innerText || element.textContent;
	var thumb_URL = elmnt.getAttribute('data-thumb_URL');

	recommendation.videoID = videoID;
	recommendation.title = title;
	recommendation.thumb_URL = thumb_URL;
	recommendation.recommender_name = mGlobals.user.name;

	//TODO: JSON issues
	mGlobals.session.queue.push(JSON.stringify(recommendation));

	saveSession(function() {
		updateQueueUI();
		if(mGlobals.user.waiting) {
			mGlobals.user.waiting = nextPlayerVideo(true);
		}
	});
}

//TODO: better query (on server side)
function queryForSession(sessionName, callbackFunction) {
	$.ajax({
		dataType : "json",
		url : '/sessionlist',
		success: function(data) {
			$.each(data, function() {
				if(this.name===sessionName) {
					mGlobals.session = this;
					callbackFunction();
				}
			});
		},
		error: function() {
			console.log('error getting sessions list');
		},
		timeout : 3000
	});
}

function getSession(sessionName) {
	queryForSession(sessionName, function() {

		//TODO: threading
		mGlobals.user.sessionIdx = mGlobals.session.current_users.length;

		mGlobals.socket = io();
		var socketData = {
			user : mGlobals.user,
			sessionId : mGlobals.session._id
		};
		mGlobals.socket.emit('sessionLogin', socketData);

		//TODO: JSON issues
		mGlobals.session.current_users.push(JSON.stringify(mGlobals.user);

		saveSession();
		
		mGlobals.sessionInitialized = true;

		synchronize();
		setInterval(synchronize, 5000);

		mGlobals.user.waiting = nextPlayerVideo(true);
		$("#div_music").fadeIn(1000);	
	});	
}

function saveSession(callbackFunc) {
	$.ajax({
		type: 'POST',
		url: '/savesession',
		data: mGlobals.session, 
		dataType: "json",
		traditional: true,
		timeout: 3000,
		success: function() {
			if(callbackFunc!=null) {
				callbackFunc();	
			}
		},
		error: function() {
			console.log('error saving session');
		}
	});
}

function synchronize() {
	if(mGlobals.sessionInitialized) {
		queryForSession(mGlobals.session.name, function() {
			updateQueueUI();
			updateUsersList();	
			//TODO: really not sure if this works!
			console.log(mGlobals.session.users[mGlobals.user.sessionIdx]);
			mGlobals.session.users[mGlobals.user.sessionIdx] = mGlobals.user;
			console.log(mGlobals.session.users[mGlobals.user.sessionIdx]);
		});
	}
}

function TempUser(nickname) {
	this.temp = true;
	this.nickname = nickname;
	this.queue_position = -1;
	this.video_time = -1;
	this.player_state = -1;
}

function enterJamSession() {
	$("#div_genre").hide();
	
	var nickname = $("#txt_name_join").val();
	var sessionName = $("#txt_group_join").val(); 

	mGlobals.sessionUser = new TempUser(nickname);
	getSession(sessionName);
}

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3");
}
