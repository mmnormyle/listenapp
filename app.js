var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

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

function createSession(sessionName, callback) {
    var session = {
        queue : [],
        current_user_ids : [],
        name : sessionName
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
    fetchSession({_id : sessionId}, function(session) {
        deleteTempUsers(session.current_user_ids, function() {
            var sessions = db.collection('sessions');
            sessions.deleteOne({_id : sessionId}, function(err, result) {
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
    });
}

function deleteTempUsers(userIds, callback) {
    var tempIds = [];
    fetchUserList(userIds, function(users) {
        for(var i=0;i<users.length;i++) {
            if(users[i].temp) {
                tempIds.push(users[i]._id);
            }
        }
        deleteUserList(tempIds, function() {
            if(callback) {
                callback();
            }
        })
    });
}

function deleteUserList(userIds, callback) {
    db.collection('sessions').delete({"_id" : {"$in" : user_ids}}, function(err, results) {
        if(err) {
            throw err;
        }
        else {
            console.loe('deleted user list');
        }
        if(callback) {
            callback();
        }
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
                console.log(err===null ? 'successfully updated session users' : 'error updating session users');
            });
            if(current_user_ids.length==0) {
                emptySession = true;
            }
        }
        if(callback) {
            callback(emptySession);
        } 
    })
}

//TODO: this is probably to good to be true
function fetchUserList(user_ids, callback) {
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
            io.emit('updateUsersList', JSON.stringify(users));
        });
    });
}

function clientsUpdateSessionQueue(sessionId) {
    fetchSession({
        _id : sessionId
    }, function(session) {
        fetchQueue(session.queue, function(queue) {
            io.emit('updateQueue', JSON.stringify(queue));
        });
    });
}

function saveTempUser(user, callback) {
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
            socket.sessionId = session._id;
            saveTempUser(socket.user, function(saved_user) {
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

    socket.on('disconnect', function() {
        if(socket.loggedIn) {
            console.log("disconnect: " + socket.user.name);
            removeUserFromSession(socket.sessionId, socket.user, function(emptySession) {
                if(!emptySession) {
                    clientsUpdateSessionUsers(socket.sessionId);   
                }
                else {
                    cleanupSession(socket.sessionId);
                }
            });
        }   
    });

});

module.exports = app;
