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
	var queue = session.queue;
	for(var i=0;i<queue.length;i++) {
		//TODO : JSON issues
		var recommendation = JSON.parse(queue[i]);
		var innerht = "<li><div><img src='" + recommendation.thumb_URL + "' height='45' width='80'></img><br><br><span style='display: block; text-align: center;'>" + recommendation.title + "</span></div></li><br>";
		queueList.innerHTML += innerht;
	}
}

function updateUsersList() {
	var usersList = document.getElementById('div_users_list');
	usersList.innerHTML = "";
	var users = session.current_users_names;
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
	var users = session.current_users_names;
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
	var video_time = 0;
	if(master) {
		var started = popFromQueue();
		if(started) {
			updatePlayerUI(session.current_video, video_time, session.current_recommender_name);
		}
		else {
			$("#p_recommender").text("Queue up a song!");
			$("#p_recommender").css("border-bottom", "1px solid black");
			waiting = true;
		}
	}
	//not the master, there should always be a current_video
	else {
		if(first) {
			video_time = session.current_video_time;
		}	
		updatePlayerUI(session.current_video, video_time, session.current_recommender_name);
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
	recommendation.recommender_name = name;

	//TODO: JSON issues
	session.queue.push(JSON.stringify(recommendation));
	
	console.log(session);

	saveSession(function() {
		updateQueueUI();
		if(master && waiting) {
			waiting = false;
			nextPlayerVideo(true);
		}
	});
}

function createSession(sessionName) {

}

function queryForSession(sessionName, callbackFunction) {
	$.ajax({
		dataType : "json",
		url : '/sessionlist',
		success: function(data) {
			$.each(data, function() {
				if(this.name===sessionName) {
					session = this;
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
		if(session.current_users_names.length>0) {
			master = false;
		}
		else {
			console.log('user is master');
			master = true;
		}
		console.log(session);
		session.current_users_names.push(name);
		saveSession();
		sessionInitialized = true;
		synchronize();
		setInterval(synchronize, 5000);
		nextPlayerVideo(true);
		$("#div_music").fadeIn(1000);	
	});			
}

function saveSession(callbackFunc) {
	$.ajax({
		type: 'POST',
		url: '/savesession',
		data: session, 
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
	console.log('attempting to synchronize');
	if(sessionInitialized) {
		queryForSession(session.name, function() {
			updateQueueUI();
			updateUsersList();
			if(!master) {
				updatePlayerState(session.player_state);
			}
			else {
				if(player_ready) {
					session.current_video_time = player.getCurrentTime();
					session.player_state = player.getPlayerState();
					saveSession();		
				}				
			}				
		});
	}
}

function enterJamSession() {
	$("#div_genre").hide();
	name = $("#txt_name_join").val();
	getSession($("#txt_group_join").val());
}

function popFromQueue() {
	var queue = session.queue;
	if(queue.length>0) {
		var recommendation = JSON.parse(queue[0]);
		session.current_video = recommendation.videoID;
		session.current_video_time = 0;
		session.current_recommender_name = recommendation.recommender_name;
		//TODO: make cleaner
		for(var i=0;i<session.queue.length;i++) {
			if(session.queue[i].videoID = recommendation.videoID) {
				session.queue.splice(i,1);		
			}
		}
		saveSession();
		updateQueueUI();
		return true;
	}
	return false;
}

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3");
}

