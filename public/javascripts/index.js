$(document).ready(function(){

	$("#div_genre").hide();
	$("#div_music").hide();
	$("#div_new_session").hide();
	$("#div_unfinished").hide();
	$("#txt_name_change").hide();
	$("#chat_input").hide();

	var pathname = window.location.pathname;
	var roomName = null;
	if(pathname.indexOf('\/rooms\/')>-1) {
		roomName = pathname.replace('\/rooms/', '');
	}

	if(!roomName) {
		$(".genre_inner").hide();
		$("#div_genre").show();
		$(".genre_inner").fadeIn(700);
		// $(".genre_inner").show();
		$(".genre_inner").click(genreClicked);
		$("#txt_name_join").hide();	
		$("#chat_input").show();
	}
	else {
		mGlobals.url_room = roomName;
	}

	$("#txt_name_join").keypress(function(e) {
		if(e.which==13) {
			setupJamSession();
		}
	});
	$("#txt_group_join").keypress(function(e) {
		if(e.which==13) {
			$("#txt_group_join").hide();
			$("#txt_name_join").fadeIn(700);	
			$("#txt_name_join").focus();
			$("#txt_name_join").select();
		}
	});
	$("#txt_search_videos").click(function() {
		$("#txt_search_videos").val("");
	});
	$("#txt_search_videos").keypress(function(e) {
		if(e.which==13) {
			searchVideos();
		}
	});

	$("#chat_input").keypress(function(e) {
		if(e.which==13) {
			sendChatMessage();		
		}
	});
	$("#txt_name_change").keypress(function(e) {
		if(e.which==13) {
			userNameChange();
		}
	});

});


//==================================================================
// Global variables
//==================================================================
var mConstants = {
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

function sessionReadyUI(roomName) {
	$("#div_genre").hide();
	$("#div_music").fadeIn(700);	
	var pathArray = location.href.split( '/' );
	var url = pathArray[0] + '//' + pathArray[2];
	window.history.pushState({}, "Music Room", url+'/rooms/'+mGlobals.session.name);
	setTimeout(function() {
		$("#p_invite_friends").fadeOut(700);
	}, 10000);
} 

function genreClicked(event) {
	setupJamSession({genreName : $(event.target).text()});
}

function onPlayerReady(event) {
	mGlobals.player_ready = true;
	if(mGlobals.url_room && mGlobals.youtube_api_ready) {
		setupJamSession({urlName : mGlobals.url_room});
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
		//uses local user data instead of what is currently in the server
		if(user._id===mGlobals.user._id) {
			user = mGlobals.user;
		}
		var color = user.color;
		var queue_position = user.queue_position;
		if(queue_position!=-1) {
			current_video_title = mGlobals.queue[queue_position].title;
		}
		else {
			current_video_title = "Nothing";
		}
		mGlobals.queue[user.queue_position]
		var innerht = '<p class="p_user" style="white-space: nowrap;">' + '<span class="span_user" onclick="syncWithUserUI(this.getAttribute(\'data-username\'))" data-username="' + user.name +'" style="border-bottom:1px solid '+color+'; cursor: pointer;">'+user.name+ ' is listening to ' + '<span style="font-weight: bold;">' + current_video_title + '</span>' + '</span><br><br>' + '</p>';
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
		updatePlayerUI(recommendation.videoId, mGlobals.user.video_time, recommendation.recommender_name, recommendation.title);		
	}
}

function userNameChange() {
	$("#txt_name_change").hide();
	$("#chat_input").fadeIn(700);
	saveUserNameChange($("#txt_name_change").val());
	$("#txt_name_change").hide();	
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

function saveUserNameChange(name) {
	mGlobals.user.name = name;
	for(var i=0;i<mGlobals.current_users;i++) {
		if(mGlobals.user._id===mGlobals.current_users[i]._id) {
			mGlobals.current_users[i].name = name;
			console.log('wooooo');
		}
	}
	var data = {
		user : mGlobals.user
	};
	mGlobals.socket.emit('saveUserNameChange', data);
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
	mGlobals.socket.on('clientChatMessage', receivedChatMessage);
	mGlobals.socket.on('foundGenreJam', foundGenreJam);
}

function receivedChatMessage(data) {
	var msg = data.msg;
	var user = data.user;
	var innerHTML = $('#messages').html() || "";
	$('#messages').html(innerHTML +'<li><span style="color: '+user.color+'">'+user.name+'</span>'+'<span>'+ ': ' + msg+ '</span></li>');
	var children = $('#messages').children();
	if(children.length>10) {
		children[0].remove();
	}
}

function synchronizeUsers() {
	console.log('synchronize user request');
	mGlobals.socket.emit('synchronizeUsers');
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
	sessionReadyUI(mGlobals.session.name);
	mGlobals.sessionInitialized = true;
}

function setupSockets() {
	mGlobals.socket = io();
	setupSocketEvents();
}

function foundGenreJam(data) {
	console.log('found genre jam ' + data.genreName);
	joinJamSession(data.genreName);
}

//three entry points: genre, url, text box
function setupJamSession(params) {
	console.log('setupJamSession');
	if(mGlobals.entered_jam) {
		return;
	}
	else {
		mGlobals.entered_jam = true;
	}

	setupSockets();

	if(params) {
		var genreName = params.genreName;
		var urlName = params.urlName;
	}
	
	if(genreName) {
		console.log(genreName);
		mGlobals.socket.emit('findGenre', {genreName: genreName});
	}
	else if(urlName) {
		joinJamSession(urlName);
	}
	else {
		joinJamSession(encodeURI($("#txt_group_join").val()));
	}

}

function joinJamSession(encodedSessionName) {
	mGlobals.session.name = decodeURI(encodedSessionName);

	//TODO: better login flow
	var name = $("#txt_name_join").val();
	if(name) {
		mGlobals.user = createTempUser(name);
	}
	else {
		$("#chat_input").hide();
		$("#txt_name_change").show();
		mGlobals.user = createTempUser('Anonymous');
	}

	var data = {
		user : mGlobals.user,
		sessionName : encodedSessionName
	};
	mGlobals.socket.emit('userJoinSession', data);

	setInterval(synchronizeUsers, 5000);
};

//==================================================================
// Chat functions
//==================================================================
function sendChatMessage() {
	if(mGlobals.sessionInitialized) {
		mGlobals.socket.emit('chatMessage', $("#chat_input").val());
		$("#chat_input").val("");
	}
}

//==================================================================
// Youtube API functions and player UI control
//==================================================================

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyAinPSDrNl9ols4DgE9XjHM8gcuJKZ7D1E");
	gapi.client.load("youtube", "v3", function() {
		mGlobals.youtube_api_ready = true;
		if(mGlobals.url_room && mGlobals.player_ready) {
			setupJamSession({urlName : mGlobals.url_room});
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

function updatePlayerUI(current_video, current_video_time, current_recommender_name, current_video_title) {
	if(!mGlobals.player_ready) {
		setTimeout(updatePlayerUI(current_video, current_video_time, current_recommender_name), 1000);
	}
	mGlobals.player.loadVideoById(current_video, current_video_time, "large");	
	$("#p_recommender").text("Recommended by " + current_recommender_name);
	$("#p_video_title").text(current_video_title);
	var color = 'black';
	//TODO: shitty
	for(var i=0;i<mGlobals.current_users.length;i++) {
		var user = mGlobals.current_users[i];
		if(user.name===current_recommender_name) {
			color = user.color;
		} 
	}
	synchronizeUsers();
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
	user.color = getRandomColor();
	return user;
}

//==================================================================
// Misc
//==================================================================
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
