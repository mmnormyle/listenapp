var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongo = require('mongoskin');
// var monk = require('monk');
var ObjectID = mongo.ObjectID;
// var mongoURI = 'localhost:27017/test';
var mongoURI = 'mongodb://heroku_79ppwm8w:ukjk27neus5srnmgct700bvogt@ds039165.mongolab.com:39165/heroku_79ppwm8w';
// var db = monk(mongoURI || process.env.MONGOLAB_URI);

var db = require('monk')(mongoURI);

var app = express();

var socket_io = require('socket.io');

var io = socket_io();
app.io = io;

var routes = require('./routes/index')(io);
var users = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req,res,next) {
    req.db = db;
    next();
});
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

function fetchSession(params, callback) {
    console.log('fetchSession: ' + params._id);
    var query = {};
    if(params.hasOwnProperty("_id")) {
        query._id = params._id;
    }
    else if(params.hasOwnProperty("name")) {
        query.name = params.name;
    }
    var sessions = db.get('sessions');
    sessions.find({query},function(e, results) {
        if(results.length>0) {
            var session = results[0];
            if(callback) {
                callback(session);
            }
        }
        else {
            console.log("couldn't find session");
        }
    });
}

function addRecommendationToSession(sessionId, recommendationId, callback) {
    console.log('addUserToSession');
    var sessions = db.get('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var queue = session.queue;
        queue.push(recommendationId);
        sessions.updateById(sessionId, {$set : {'queue':queue}}, function(err) {
            console.log(err===null ? 'successfully updated queue' : 'error updating queue');
        });
        if(callback) {
            callback();
        }
    });
}

function addUserToSession(sessionId, userId, callback) {
    console.log('addUserToSession');
    var sessions = db.get('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var current_user_ids = session.current_user_ids;
        current_user_ids.push(userId);
        sessions.updateById(sessionId, {$set : {'current_user_ids':current_user_ids}}, function(err) {
            console.log(err===null ? 'successfully updated session users' : 'error updating session users');
        });
        if(callback) {
            callback();
        }
    });
}

function removeUserFromSession(sessionId, user, callback) {
    console.log('removeUserFromSession');
    var sessions = db.get('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var current_user_ids = session.current_user_ids;
        var index = -1;
        for(var i=0;i<current_user_ids.length;i++) {
            if(current_user_ids[i].equals(user._id)) {
                index = i;
            }
        }
        if(index!==-1) {
            current_user_ids.splice(index, 1);   
            sessions.updateById(sessionId, {$set : {'current_user_ids':current_user_ids}}, function(err) {
                console.log(err===null ? 'successfully updated session users' : 'error updating session users');
            });
            //TODO: may want to move this to make it more robust
            if(current_user_ids.length==0) {
                //cleanupSession(sessionId)
            }
        }
        if(callback) {
            callback();
        } 
    })
}

//TODO: this is probably to good to be true
function fetchUserList(user_ids, callback) {
    console.log('fetchUserList');
    var users = [];
    db.get('users').find({"_id" : {"$in" : user_ids}}, function(err, docs) {
        for(var i=0;i<user_ids.length;i++) {
            var index = -1;
            for(var j=0;j<docs.length;j++) {
                if(docs[j]._id.equals(user_ids[i])) {
                    index = j;
                }
            }
            users[i] = docs[index];
            docs.splice(index,1);
        }
        if(callback) {
            callback(users);
        }
    });
}

//TODO: this is probably to good to be true
function fetchQueue(queue_ids, callback) {
    console.log('fetchQueue');
    console.log(queue_ids);
    var queue = [];
    db.get('recommendations').find({"_id" : {"$in" : queue_ids}}, function(err, docs) {
        for(var i=0;i<queue_ids.length;i++) {
            var index = -1;
            for(var j=0;j<docs.length;j++) {
                if(docs[j]._id.equals(queue_ids[i])) {
                    index = j;
                }
            }
            if(index!==-1) {    
                queue[i] = docs[index];
                docs.splice(index,1);   
            }
        }
        if(callback) {
            callback(queue);
        }
    });
}

function clientsUpdateSessionUsers(sessionId) {
    console.log('clientsUpdateSessionUsers');
    fetchSession({
        _id : sessionId
    }, function(session) {
        fetchUserList(session.current_user_ids, function(users) {
            io.emit('updateUsersList', JSON.stringify(users));
        });
    });
}

function clientsUpdateSessionQueue(sessionId) {
    console.log('clientsUpdateSessionQueue');
    fetchSession({
        _id : sessionId
    }, function(session) {
        fetchQueue(session.queue, function(queue) {
            io.emit('updateQueue', JSON.stringify(queue));
        });
    });
}

function saveTempUser(user, callback) {
    console.log('saveTempUser');
    db.get('users').insert(user, function(err, doc) {
        if(err) {
          throw err;
        }
        if(callback) {
            callback(doc);
        }
    });
}

function saveRecommendation(recommendation, callback) {
    console.log('saveRecommendation');
    db.get('recommendations').insert(recommendation, function(err, doc) {
        if(err) {
            throw err;
        }
        if(callback) {
            callback(doc);
        }
    });
}


function clientSessionReady(socket, user) {
    console.log('clientSessonReady');
    var data = {};
    fetchSession({
        _id : socket.sessionId
    }, function(sessionFound) {
        data.sessionId = sessionFound._id;
        fetchUserList(sessionFound.current_user_ids, function(users) {
            data.current_users = users;
            fetchQueue(sessionFound.queue, function(queue) {
                data.queue = queue;
                data.user = user;
                socket.emit('sessionReady', data);
            });
        })
    })

}

io.on('connection', function (socket) {
  
    console.log('user connected');

    socket.loggedIn = false;

    socket.on('userJoinSession', function(data) {
        console.log('userJoinSession: ' + data.user.name + " " + data.sessionName);
        socket.user = data.user;
        if(socket.user.temp) {
            saveTempUser(socket.user, function(saved_user) {
                fetchSession({
                    name : data.sessionName
                }, function(sessionFound) {
                    var session = sessionFound;
                    socket.sessionId = session._id;
                    addUserToSession(socket.sessionId, saved_user._id, function() {
                        clientSessionReady(socket, saved_user);
                        socket.loggedIn = true;
                        clientsUpdateSessionUsers(socket.sessionId);
                    });
                });
            });
        }
        else {
            //TODO: non temp users
        }
    });

    socket.on('addRecommendationToSession', function(data) {
        console.log('addRecommendationToSession');
        //TODO: JSON
        var sessionId = ObjectID(data.sessionId);
        var recommendation = data.recommendation;
        saveRecommendation(recommendation, function(saved_recommendation) {
            addRecommendationToSession(sessionId, recommendation._id, function() {
                clientsUpdateSessionQueue(socket.sessionId);
            });
        });
    });

    socket.on('disconnect', function() {
        if(socket.loggedIn) {
            console.log("disconnect: " + socket.user.name);
            removeUserFromSession(socket.sessionId, socket.user, function() {
                clientsUpdateSessionUsers(socket.sessionId);
            });
        }   
    });

});

module.exports = app;
