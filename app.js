var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');

var mongoURI = 'mongodb://localhost:27017/test';
var ObjectID = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var db;
MongoClient.connect((process.env.MONGOLAB_URI || mongoURI), function(err, ret_db) {
    if(!err) {
        console.log("Connected");
        db = ret_db;
    }
    else {
        throw err;
    }
})


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

function createSession(sessionName, callback, genreName) {
    var session = {
        queue : [],
        current_user_ids : [],
        name : sessionName,
        genre : genreName
    };
    db.collection('sessions').insert(session, function(err, results) {
        var doc = results.ops[0];
        if(err) {
          throw err;
        }
        if(callback) {
            callback(doc);
        }
    });
}

//
// need to destroy temp users
//
function cleanupSession(sessionId, callback) {
    db.collection('users').deleteMany({"temp" : true, "in_session" : sessionId}, function(err, results) {
        db.collection('sessions').deleteOne({_id : sessionId}, function(err, result) {
            if(err) {
                throw err;
            }
            else {
                console.log('Deleted session with id: ' + sessionId);
            }
            if(callback) {
                callback();
            }
        });
    });    
}

function fetchSession(params, callback) {
    var sessions = db.collection('sessions');
    if(params.hasOwnProperty("_id")) {
        sessions.find({_id : params._id}).toArray(function(e, results) {
            if(results.length>0) {
                var session = results[0];
                if(callback) {
                    callback(session);
                }
            }
            else {
                if(callback) {
                    callback(false);
                }
            }
        });        
    }
    else {
        sessions.find({name : params.name}).toArray(function(e, results) {
            if(results.length>0) {
                var session = results[0];
                if(callback) {
                    callback(session);
                }
            }
            else {
                if(callback) {
                    callback(false);
                }
            }
        });
    }
}

function deleteRecommendationFromSession(sessionId, recommendationId, callback) {
    var sessions = db.collection('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var queue = session.queue;
        for(var i = 0;i<queue.length;i++) {
            console.log(queue[i]);
            console.log(recommendationId);
            if(queue[i].equals(recommendationId)) {
                queue.splice(i, 1);
                break;
            }
        }
        sessions.updateOne({_id : sessionId}, {$set : {'queue':queue}}, function(err) {
            console.log(err===null ? 'successfully updated queue' : 'error updating queue');
        });
        if(callback) {
            callback();
        }
    });
}

function addRecommendationToSession(sessionId, recommendationId, callback) {
    var sessions = db.collection('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var queue = session.queue;
        queue.push(recommendationId);
        sessions.updateOne({_id : sessionId}, {$set : {'queue':queue}}, function(err) {
            console.log(err===null ? 'successfully updated queue' : 'error updating queue');
        });
        if(callback) {
            callback();
        }
    });
}

function addUserToSession(sessionId, userId, callback) {
    var sessions = db.collection('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var current_user_ids = session.current_user_ids;
        current_user_ids.push(userId);
        sessions.updateOne({_id : sessionId}, {$set : {'current_user_ids':current_user_ids}}, function(err) {
            console.log(err===null ? 'successfully updated session users' : 'error updating session users');
        });
        if(callback) {
            callback();
        }
    });
}

function removeUserFromSession(sessionId, user, callback) {
    var sessions = db.collection('sessions');
    fetchSession({_id : sessionId}, function(session) {
        var current_user_ids = session.current_user_ids;
        var index = -1;
        var emptySession = false;
        for(var i=0;i<current_user_ids.length;i++) {
            if(current_user_ids[i].equals(user._id)) {
                index = i;
            }
        }
        if(index!==-1) {
            current_user_ids.splice(index, 1);   
            sessions.updateOne({_id : sessionId}, {$set : {'current_user_ids':current_user_ids}}, function(err) {
                if(current_user_ids.length==0) {
                    emptySession = true;
                }
                if(user.temp) { 
                    db.collection('users').deleteOne({_id : user._id}, function(err) {
                        console.log(err===null ? 'successfully updated user session' : 'error updating user session');
                        if(callback) {
                            callback(emptySession);
                        } 
                    });   
                }
                else {
                    if(callback) {
                        callback(emptySession);
                    } 
                }
            });    
        }
    });
}

//TODO: this is probably to good to be true
function fetchUserList(user_ids, callback) {
    //TODO: bandaid
    user_ids = user_ids || [];
    var users = [];
    db.collection('users').find({"_id" : {"$in" : user_ids}}).toArray(function(err, results) {
        var docs = results;
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
    var queue = [];
    db.collection('recommendations').find({"_id" : {"$in" : queue_ids}}).toArray(function(err, results) {
        var docs = results;
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
    fetchSession({
        _id : sessionId
    }, function(session) {
        fetchUserList(session.current_user_ids, function(users) {
            io.to(session.name).emit('updateUsersList', JSON.stringify(users));
        });
    });
}

function clientsUpdateSessionQueue(sessionId) {
    fetchSession({
        _id : sessionId
    }, function(session) {
        fetchQueue(session.queue, function(queue) {
            io.to(session.name).emit('updateQueue', JSON.stringify(queue));
        });
    });
}

function saveTempUser(user, sessionId, callback) {
    user.in_session = sessionId;
    db.collection('users').insert(user, function(err, results) {
        var doc = results.ops[0];
        if(err) {
          throw err;
        }
        if(callback) {
            callback(doc);
        }
    });
}

function saveRecommendation(recommendation, callback) {
    db.collection('recommendations').insert(recommendation, function(err, results) {
        var doc = results.ops[0];
        if(err) {
            throw err;
        }
        if(callback) {
            callback(doc);
        }
    });
}

function saveUserVideoState(user) {
    db.collection('users').updateOne({_id : ObjectID(user._id)}, {$set : 
        {
            'player_state':user.player_state, 
            'video_time':user.video_time, 
            'queue_position':user.queue_position
        }
    }, function(err) {
        console.log(err===null ? 'successfully updated user video state' : 'error updating user state');
    });
}

function saveUserNameChange(user, sessionId) {
    db.collection('users').updateOne({_id : ObjectID(user._id)}, {$set : 
        {
            'name':user.name
        }
    }, function(err) {
        console.log(err===null ? 'successfully updated user name' : 'error updating user name');
        clientsUpdateSessionUsers(sessionId);
    });
}

var MAX_USERS = 10;

function clientFindGenre(socket, genreName) {
    var sessions = db.collection('sessions');
    sessions.find({genre : genreName}).toArray(function(e, results) {
        var found = false;
        console.log('results length' + results.length);
        for(var i=0;(i<results.length && !found);i++) {
            // if(results[i].current_user_ids.length<MAX_USERS) {
            socket.emit('foundGenreJam', {genreName : results[i].name});
            found = true;
            // }
        }   
        if(!found) {
            createSession(genreName + results.length, function(session) {
                socket.emit('foundGenreJam', {genreName : session.name});
            }, genreName);
        }
    });

}

function clientSessionReady(socket, user) {
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

        var onSessionFound = function(session) {
            socket.join(session.name);
            socket.sessionId = session._id;
            socket.roomName = session.name;
            saveTempUser(socket.user, socket.sessionId, function(saved_user) {
                addUserToSession(socket.sessionId, saved_user._id, function() {
                    clientSessionReady(socket, saved_user);
                    socket.loggedIn = true;
                    clientsUpdateSessionUsers(socket.sessionId);
                });
            });   
        };

        fetchSession({
            name : data.sessionName
        }, function(sessionFound) {
            if(sessionFound) {
                onSessionFound(sessionFound);  
            }
            else {
                createSession(data.sessionName, function(sessionCreate) {
                    onSessionFound(sessionCreate);
                });
            }
        });
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

    socket.on('deleteRecommendationFromSession', function(data) {
        var recommendationId = data.recommendationId;
        deleteRecommendationFromSession(socket.sessionId, recommendationId, function() {
            clientsUpdateSessionQueue(socket.sessionId);
        });
    })

    socket.on('saveUserVideoState', function(data) {
        console.log('saveUserVideoState');
        var user = data;
        saveUserVideoState(user);
    });

    socket.on('saveUserNameChange', function(data) {
        var user = data.user;
        var sessionId = socket.sessionId;
        socket.user = data.user;
        saveUserNameChange(user, sessionId);
    });

    socket.on('findGenre', function(data) {
        console.log('findGenre');
        clientFindGenre(socket, data.genreName);
    });

    socket.on('disconnect', function() {
        if(socket.loggedIn) {
            console.log("disconnect: " + socket.user.name);
            removeUserFromSession(socket.sessionId, socket.user, function(emptySession) {
                if(!emptySession) {
                    clientsUpdateSessionUsers(socket.sessionId);   
                }
                else {
                    // cleanupSession(socket.sessionId);
                }
            });
        }   
    });

    socket.on('chatMessage', function(msg) {
        var data = {
            msg : msg,
            user : socket.user
        }
        io.to(socket.roomName).emit('clientChatMessage', data);
    });

    socket.on('synchronizeUsers', function() {
        fetchSession({
            _id : socket.sessionId
        }, function(session) {
            fetchUserList(session.current_user_ids, function(users) {
            socket.emit('updateUsersList', JSON.stringify(users));
            });
        });
    });

    socket.on('emailQueue', function(data) {
        console.log("data: " + data);
        console.log(data);
        var queue = data.queue;
        var email = data.email;
        console.log("queue: " + queue);
        console.log("email: " + email);
        var list = '';
        for(var i=0;i<queue.length;i++) {
            list += queue[i].title + "\n";
        }
        var transporter = nodemailer.createTransport('smtps://listentomusicwithme%40gmail.com:socialmusic@smtp.gmail.com');
        var mailOptions = {
            from: '"Listen With Me" <listenwithme@gmail.com>', // sender address
            to: email, // list of receivers
            subject: 'Your music!', // Subject line
            text: list
        };
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return console.log(error);
            }
            console.log('Message sent: ' + info.response);
        });
    });

});

module.exports = app;
