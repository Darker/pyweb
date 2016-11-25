define(["eventemitter2", "fs", "settings"], function(EventEmitter2, fs, settings) {
  function Player(socket, server) {
      this.socket = socket;
      this.server = server;
      this.connected = true;  
      socket.on("login", this.login=this.login.bind(this));
  }
  Player.prototype.login = function(name) {
      console.log("Login: ", name);
  } 
});