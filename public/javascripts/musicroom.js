window.mobilecheck = function() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

$(document).ready(function(){

	var pathname = window.location.pathname;
	var roomName = null;
	if(pathname.indexOf('\/rooms\/')>-1) {
		roomName = pathname.replace('\/rooms/', '');
	}

	mGlobals.ui.div_loading = $("#div_loading");
	mGlobals.ui.div_everything = $("#div_everything");


	var opts = {
	  lines: 13 // The number of lines to draw
	, length: 28 // The length of each line
	, width: 14 // The line thickness
	, radius: 42 // The radius of the inner circle
	, scale: 1 // Scales overall size of the spinner
	, corners: 1 // Corner roundness (0..1)
	, color: '#000' // #rgb or #rrggbb or array of colors
	, opacity: 0.25 // Opacity of the lines
	, rotate: 0 // The rotation offset
	, direction: 1 // 1: clockwise, -1: counterclockwise
	, speed: 1 // Rounds per second
	, trail: 60 // Afterglow percentage
	, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
	, zIndex: 2e9 // The z-index (defaults to 2000000000)
	, className: 'spinner' // The CSS class to assign to the spinner
	, top: '50%' // Top position relative to parent
	, left: '50%' // Left position relative to parent
	, shadow: false // Whether to render a shadow
	, hwaccel: false // Whether to use hardware acceleration
	, position: 'absolute' // Element positioning
	}
	var target = document.getElementById('div_loading');
	mGlobals.ui.spinner = new Spinner(opts).spin(target);

	mGlobals.url_room = roomName;

	mGlobals.ui.input_search = $("#input_search");
	mGlobals.ui.input_name = $("#name_input");
	mGlobals.ui.input_chat = $("#chat_input");
	mGlobals.ui.ul_chat = $("#ul_chat");
	mGlobals.ui.div_search_results = $("#div_search_results");

	mGlobals.ui.input_search.bind("propertychange input paste", function(event) {
		searchTextChanged($("#input_search").val());
	});

	mGlobals.ui.input_search.keypress(function(e) {
		if(e.which==13) {
			searchEnterPressed(mGlobals.ui.input_search);
		}
	});

	mGlobals.ui.input_name.keypress(function(e) {
		if(e.which==13) {
			userNameChange(mGlobals.ui.input_name);
		}	
	})

	mGlobals.ui.input_chat.keypress(function(e) {
		if(e.which==13) {
			sendChatMessage(mGlobals.ui.input_chat);
		}	
	})

	document.body.addEventListener('click', function() {
		mGlobals.ui.div_search_results.fadeOut();
		mGlobals.input_search.val("");
	}, true); 
	/*
	$("#chat_input").keypress(function(e) {
		if(e.which==13) {
			sendChatMessage();		
		}
	});
	$("#txt_email").keypress(function(e) {
		if(e.which==13) {
			emailQueue();
		}
	});
	*/
	$('.drawer').drawer();

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
	ui : {}
};

//==================================================================
// UI Functions
//==================================================================

function searchTextChanged(text) {
	var divResults = $("#div_search_results");
	if(text.length==0) {
		divResults.fadeOut();
	}
}

function searchEnterPressed(input_search) {
	var divResults = $("#div_search_results");
	divResults.html("");
	searchVideos(input_search.val(), function(response) {
		$.each(response.items, function(index, item) {
		divResults.html(divResults.html() + "<div class='div_search_result' onClick='queueSelectedVideo(this)' data-videoId='" + item.id.videoId + "' data-thumb_URL='"+item.snippet.thumbnails.medium.url+"'>" + '<p class="text_search_result">' +  item.snippet.title+ '</p></div>' );
	});
	});
	if(!divResults.is(':visible')) {
		divResults.fadeIn();
	}
}

function sessionReadyUI(roomName) {
	mGlobals.ui.div_loading.hide();
	mGlobals.ui.spinner.stop();
	mGlobals.ui.div_everything.animate({opacity: 1}, 'fast');
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

function queueRollover(item) {
	$(item).attr('src', '../images/cross.jpg');
	//TODO: can place statically
	$(item).attr('onclick', "deleteVideoInQueue(" + item.getAttribute('data-queue_position') + ")");
}

function queueRolloff(item) {
	$(item).attr('src', item.getAttribute('data-thumb_URL'));
}

function updateQueueUI(starting_queue_position) {
	var queue = mGlobals.queue;
	var i = starting_queue_position;
	var j = 0;
	//TODO: make robust
	var end = 5;
	var div_queue = $("#div_footer");
	div_queue.html("");
	while(i<queue.length) {
		var recommendation = queue[i];
		var innertht;
		if((j+1)%5===0) {
			innerht = "<div class='div_content' style='margin-right: 0'><img class='img_queue_item' data-queue_position='" + i + "' data-thumb_URL='" + recommendation.thumb_URL + "' onmouseover='queueRollover(this)' onmouseout='queueRolloff(this)' src='" + recommendation.thumb_URL + "'></img></div>";
		}
		else {
			innerht = "<div class='div_content'><img class='img_queue_item' data-queue_position='" + i + "' data-thumb_URL='" + recommendation.thumb_URL + "' onmouseover='queueRollover(this)' onmouseout='queueRolloff(this)' src='" + recommendation.thumb_URL + "'></img></div>";

		}
		div_queue.html(div_queue.html() + innerht);
		i++;
		j++;
	}
}

function emailQueue() {
	mGlobals.socket.emit('emailQueue', {email : $("#txt_email").val(), queue : mGlobals.queue});
	$("#txt_email").fadeOut();
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
		mGlobals.queue[user.queue_position];
		//		usersList.innerHTML += "<div class='div_user'></div>";
		usersList.innerHTML += '<div class="div_user" style="background: ' + user.color + '"><p class="p_user"> ' + user.name.charAt(0) + '</p></div>';
	}
	/*var usersList = document.getElementById('div_users_list');
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
		var innerht = '<p class="p_user" style="white-space: nowrap;">' + '<span class="span_user" onclick="syncWithUserUI(this.getAttribute(\'data-username\'))" data-username="' + user.name +'" style="border-bottom:1px solid '+color+'; cursor: pointer;">'+user.name +  '</span>' + '</span><br><br>' + '</p>';//+ ' is listening to ' + '<span style="font-weight: bold;">' + current_video_title + '</span>' + '</span><br><br>' + '</p>';
		usersList.innerHTML += innerht;
	}*/
}

function syncWithUserUI(name) {
	for(var i=0;i<mGlobals.current_users.length;i++) {
		if(mGlobals.current_users[i].name===name) {
			syncWithUser(mGlobals.current_users[i]);
		}
	}
}

function setupVideo() {
	if(mGlobals.user.queue_position!=-1) {
		var recommendation = mGlobals.queue[mGlobals.user.queue_position];
		updateQueueUI(mGlobals.user.queue_position + 1);
		updatePlayerUI(recommendation.videoId, mGlobals.user.video_time, recommendation.recommender_name, recommendation.title);		
	}
}

function userNameChange(name_input) {
	name_input.hide();
	mGlobals.ui.input_chat.fadeIn();
	saveUserNameChange(name_input.val());
}

//==================================================================
// Backend video and queue control functions
//==================================================================
function deleteVideoInQueue(queue_position) {
	var id = mGlobals.queue[queue_position]._id;
	mGlobals.queue.splice(queue_position, 1);
	updateQueueUI(mGlobals.user.queue_position + 1);
	var data =  {
		recommendationId : id
	};
	mGlobals.socket.emit('deleteRecommendationFromSession', data);
}

function previousVideoInQueue() {
	mGlobals.user.video_time = 0;
	var queue = mGlobals.queue;
	if(mGlobals.user.queue_position>0) {
		var queue_position = mGlobals.user.queue_position = mGlobals.user.queue_position - 1;
		setupVideo();
		mGlobals.user.waiting = false;
	}
}

function nextVideoInQueue() {
	mGlobals.user.video_time = 0;
	var queue = mGlobals.queue;
	if((mGlobals.user.queue_position+1)<queue.length) {
		var queue_position = mGlobals.user.queue_position = mGlobals.user.queue_position + 1;
		setupVideo();
		mGlobals.user.waiting = false;
	}
	else {
		mGlobals.user.waiting = true;
	}
}

function queueSelectedVideo(elmnt) {
	mGlobals.ui.div_search_results.fadeOut();
	mGlobals.ui.input_search.val("");
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
	updateQueueUI(mGlobals.user.queue_position + 1);
	setupVideo();
}

function saveUserNameChange(name) {
	mGlobals.user.name = name;
	for(var i=0;i<mGlobals.current_users;i++) {
		if(mGlobals.user._id===mGlobals.current_users[i]._id) {
			mGlobals.current_users[i].name = name;
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
	var innerHTML = mGlobals.ui.ul_chat.html() || "";
	mGlobals.ui.ul_chat.html(innerHTML +'<li><span style="color: '+user.color+'">'+user.name+'</span>'+'<span>'+ ': ' + msg+ '</span></li>');
	var children = mGlobals.ui.ul_chat.children();
	if(children.length>10) {
		children[0].remove();
	}
}

function synchronizeUsers() {
	mGlobals.socket.emit('synchronizeUsers');
}

function updateUsersList(users) {
	users = JSON.parse(users);
	if(mGlobals.sessionInitialized) {
		mGlobals.current_users = users;
		updateUsersListUI(mGlobals.current_users);	
	}		
}

function updateQueue(queue) {
	queue = JSON.parse(queue);
	if(mGlobals.sessionInitialized) {
		mGlobals.queue = queue;
		updateQueueUI(mGlobals.user.queue_position + 1);
		if(mGlobals.user.waiting) {
			nextVideoInQueue();
		}
	}
}

function updateUser(user) {
	if(mGlobals.sessionInitialized) {
		mGlobals.user = user;	
	}
}

function sessionReady(data) {
	mGlobals.sessionId = data.sessionId;
	mGlobals.queue = data.queue;
	mGlobals.current_users = data.current_users;
	if(mGlobals.user.temp) {
		mGlobals.user = data.user;
	}
	saveUserVideoState();
	setInterval(saveUserVideoState, 10000);
	if(mGlobals.queue.length==0) {
		$("#p_current_content_info").text("Queue up a song!");
		$("#p_current_recommender_info").text("Use the search bar above.");
	}
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
	joinJamSession(data.genreName);
}

//three entry points: genre, url, text box
function setupJamSession(urlName) {
	if(mGlobals.entered_jam) {
		return;
	}
	else {
		mGlobals.entered_jam = true;
	}

	setupSockets();

	joinJamSession(urlName);
}

function joinJamSession(encodedSessionName) {
	mGlobals.session.name = decodeURI(encodedSessionName);

	mGlobals.user = createTempUser('Anonymous');
	
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
function sendChatMessage(chat_input) {
	if(mGlobals.sessionInitialized) {
		mGlobals.socket.emit('chatMessage', chat_input.val());
		chat_input.val("");
	}
}

//==================================================================
// Youtube API functions and player UI control
//==================================================================

function youtubeAPIInit() {
	gapi.client.setApiKey("AIzaSyC4A-dsGk-ha_b-eDpbxaVQt5bR7cOUddc");
	gapi.client.load("youtube", "v3", function() {
		mGlobals.youtube_api_ready = true;
		if(mGlobals.url_room && mGlobals.player_ready) {
			setupJamSession({urlName : mGlobals.url_room});
		}
	});
}

function onYouTubeIframeAPIReady() {
	mGlobals.player = new YT.Player('div_player', {
        height: 'auto',
        width: '100%',
        playerVars: {
        	controls: 0,
        	showinfo: 0,
        	autoplay: 1
        },
        events: {
        	'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function searchVideos(query, callback) {
	var request = gapi.client.youtube.search.list({
        part: "snippet",
        type: "video",
	    q: encodeURIComponent(query).replace(/%20/g, "+"),
	    maxResults: 5
    });

	//execute the request
	request.execute(callback);
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
	$("#p_current_content_info").text(current_video_title);
	$("#p_current_recommender_info").text('Recommended by: ' + current_recommender_name);
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
