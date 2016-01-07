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
})
app.use('/', routes);
app.use('/users', users);


io.on('connection', function (socket) {
  
  console.log('user connected');

  socket.loggedIn = false;

  socket.on('sendinfo', function(info) {
    console.log('user sent info: ' + info.user + " " + info.sessionId);
    socket.user = info.user;
    socket.sessionId = info.sessionId;
    socket.loggedIn = true;
    //update database by adding user
  });

    socket.on('disconnect', function() {
        console.log(socket.user + " disconnected");
        //update database by removing user
        var sessions = db.get('sessions');

        sessions.find({_id : socket.sessionId},{},function(e,results) {
            if(results.length>0) {
                console.log("Found session");
                var session = results[0];
                var current_users_names = session.current_users_names;
                current_users_names.splice(current_users_names.indexOf(socket.user), 1);
                sessions.updateById(socket.sessionId, {$set : {'current_users_names':current_users_names}}, function(err) {
                    console.log(err===null ? 'updated session' : err);
                });
            }
            else {
                console.log("Couldn't find session.");
            }
        });
    });

});

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

module.exports = app;
