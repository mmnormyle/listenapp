var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/test')

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
    console.log('fetchSession');
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
    sessions.find({_id : sessionId},{},function(e,results) {
        var success;
        if(results.length>0) {
            console.log("Found session");
            var session = results[0];
            var current_user_ids = session.current_user_ids;
            current_user_ids.splice(current_user_ids.indexOf(user._id), 1);
            sessions.updateById(sessionId, {$set : {'current_user_ids':current_user_ids}}, function(err) {
                console.log(err===null ? 'successfully updated session users' : 'error updating session users');
            });
            //TODO: may want to move this to make it more robust
            if(current_user_ids.length==0) {
                //cleanupSession(sessionId)
            }
            success = true;
        }
        else {
            console.log("Couldn't find session.");
            success = false;
        }
        if(callback) {
            callback(success);
        }
    });
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
    var queue = [];
    db.get('recommendations').find({"_id" : {"$in" : queue_ids}}, function(err, docs) {
        for(var i=0;i<queue_ids.length;i++) {
            var index = -1;
            for(var j=0;j<docs.length;j++) {
                if(docs[j]._id.equals(queue_ids[i])) {
                    index = j;
                }
            }
            queue[i] = docs[index];
            docs.splice(index,1);
        }
        console.log(queue);
        if(callback) {
            callback(queue);
        }
    });
}

function clientsUpdateSessionUsers(sessionId) {
    console.log('clientsUpdateSessionUsers');
    fetchSession({
        sessionId : sessionId
    }, function(session) {
        fetchUserList(session.current_user_ids, function(users) {
            io.emit('updateUsersList', JSON.stringify(users));
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

function clientSessionReady(socket) {
    console.log('clientSessonReady');
    var data = {};
    fetchSession({
        _id : socket.sessionId
    }, function(sessionFound) {
        data.session = sessionFound;
        fetchUserList(sessionFound.current_user_ids, function(users) {
            data.current_users = users;
            fetchQueue(sessionFound.queue, function(queue) {
                data.queue = queue;
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
                        clientSessionReady(socket);
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
