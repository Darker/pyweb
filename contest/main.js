var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ARGS = new (require("./SimpleArgv"))(); 
ARGS.default("ip", "127.0.0.1");
ARGS.default("port", "8080");
        
server.listen(ARGS.arg_port);
//app.use("ddd", express.static(__dirname + "/../../pypyjs-0.4.0/"));
app.use("/pypyjs-0.4.0/", express.static(__dirname + "/../../pypyjs-0.4.0/"));
app.use("/", express.static(__dirname+"/web"));                                        // /^(?:(?!pypyjs-0\.4\.0).)*$/
//app.use(express.static(__dirname+"/web"));


var requirejs = require("requirejs");
requirejs.config({
    baseUrl: __dirname,
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require,
    waitSeconds: 20
});
requirejs(['Server', 'Client', 'Player'], function(Server, Client) {
  var server = new Server(io);
  io.on('connection', function (socket) {
     var client = new Client(socket, server);
     console.log("Client "+client.ip()+" connected.");
     //console.log("New client connected: ", socket);
     socket.on('disconnect', function () {
         console.log("Client "+client.fullName()+" disconnected.");
         server.removeClient(client);
     });
   });
});