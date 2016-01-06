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

});

/* =============== GLOBAL VARIABLES ================= */

var COLORS = ["green","red","blue","orange","teal"];
var session;
var master;
var name;
var sessionInitialized = false;
var player;
var player_ready = false;
var PLAYING = 1;
var PAUSED = 2;

/* ================== UI FUNCTIONS ================== */

function genreClicked() {
	$("#div_genre").hide();
	$("#div_unfinished").fadeIn(1000);
}

function onPlayerReady(event) {
	player_ready = true;
}

function onYouTubeIframeAPIReady() {
	player = new YT.Player('youtubeplayer', {
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
	var queue = session.get("queue");
	for(var i=0;i<queue.length;i++) {
		var recommendation = queue[i];
		console.log("title: " + recommendation.get("title"));
		var innerht = "<li><div><img src='" + recommendation.get("thumb_URL") + "' height='45' width='80'></img><br><br><span style='display: block; text-align: center;'>" + recommendation.get("title") + "</span></div></li><br>";
		queueList.innerHTML += innerht;
	}
}

function updateUsersList() {
	var usersList = document.getElementById('div_users_list');
	usersList.innerHTML = "";
	var users = session.get("current_users_names");
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		var color = COLORS[i%COLORS.length];
		var innerht = '<span class="span_user" style="border-bottom:1px solid '+color+';">'+user+'</span><br><br>';
		usersList.innerHTML += innerht;
	}
}

function clearSearchResults() {
	var searchList = document.getElementById('list_search_results');
	searchList.innerHTML = "";
}

function updatePlayerUI(current_video, current_video_time, current_recommender_name) {
	while(!player_ready) {}
	player.loadVideoById(current_video, current_video_time, "large");	
	$("#p_recommender").text("Recommended by " + current_recommender_name);
	var color = 'black';
	var users = session.get("current_users_names");
	for(var i=0;i<users.length;i++) {
		var user = users[i];
		if(user===current_recommender_name) {
			color = COLORS[i % COLORS.length];
		}
	}
	$("#p_recommender").css("border-bottom", "1px solid " + color);
}

function updatePlayerState(state) {
	if(player_ready) {
		if(state===PLAYING) {
			player.playVideo();
		}
		else if(state===PAUSED) {
			player.pauseVideo();
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
			console.log(item);
			searchList.innerHTML += ("<li onClick='queueSelectedVideo(this)' data-videoId='" + item.id.videoId + "' data-thumb_URL='"+item.snippet.thumbnails.medium.url+"'>"+item.snippet.title+'</li>');
		});
	});
}

function queueSelectedVideo(elmnt) {
	clearSearchResults();
	var Recommendation = Parse.Object.extend("Recommendation");
	var recommendation = new Recommendation();

	var videoID = elmnt.getAttribute('data-videoId');
	var title = elmnt.innerText || element.textContent;
	var thumb_URL = elmnt.getAttribute('data-thumb_URL');

	recommendation.set("videoID", videoID);
	recommendation.set("title", title);
	// recommendation.set("recommender")
	recommendation.set("thumb_URL", thumb_URL);
	recommendation.set("recommender_name", name);
	recommendation.save(null, {
		success: function(recommendation) {
			if(sessionInitialized) {
				session.fetch();
				session.add("queue", recommendation);
				updateQueueUI();
				session.save();
				if(master && waiting) {
					waiting = false;
					nextPlayerVideo(true);
				}
			}
		},
		error: function(recommendation, error) {
		    alert('Failed to create new object, with error code: ' + error.message);
		}
	});
}

function createSession(sessionName) {

}

function getSession(sessionName) {
	$.getJSON('/sessionlist', function(data) {
		$.each(data, function() {
			if(this.name===sessionName) {
				session = this;
				//TODO: weird ass workaround
				console.log(session.current_users_names.constructor);
				if(!(session.current_users_names.constructor===Array)) {
					session.current_users_names = [session.current_users_names];
				}
				if(!(session.queue.constructor===Array)) {
					session.queue = [session.queue];
				}
				if(session.current_users_names.length>0) {
  					master = false;
  				}
  				else {
  					master = true;
  				}
  				session.current_users_names.push(name);
  				saveSession();
  				synchronize();
				setInterval(synchronize, 5000);
				sessionInitialized = true;
				nextPlayerVideo(true);
				$("#div_music").fadeIn(1000);
			}
		});
	});
}

function saveSession() {
	console.log(session);
	$.ajax({
		type: 'POST',
		url: '/savesession',
		data: session, 
		dataType: "json",
		traditional : true
	});
}

function synchronize() {

}

function enterJamSession() {
	$("#div_genre").hide();
	name = $("#txt_name_join").val();
	getSession($("#txt_group_join").val());
}

function popFromQueue() {

}

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3");
}

