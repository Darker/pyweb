define(["eventemitter2", "fs", "GameReversi", "settings"], function(EventEmitter2, fs, Reversi, settings) {
  const PAIR_STATUS = {
      CHALLENGE: {name:"CHALLENGE"},
      GAME: {name:"GAME"},
      NONE: null
  }
  function Client(socket, server) {
    this.socket = socket;
    this.server = server;
    this.server.addClient(this);
    this.name = null;
    this.score = 0;
    this.busy = false;
    // whom are you paired with
    this.link = {
        player: null, 
        status: PAIR_STATUS.NONE
    }                           
    // will contain id of timeout before challenge is over
    this.challenge_timeout = -1;
    //time of last attempt to challenge someone
    this.challenge_last = 0;
    
    socket.on("login", this.login=this.login.bind(this));
    socket.on("challenge.reply", this.challenge_reply = this.challenge_reply.bind(this));
    socket.on("challenge.start", this.challenge_start = this.challenge_start.bind(this));
    EventEmitter2.call(this, {wildcard: false, newListener: false});
  }
  Client.prototype = Object.create(EventEmitter2.prototype);
  Client.prototype.destroy = function() {
    var socket = this.socket;
    socket.removeListener("login", this.login);
    socket.removeListener("challenge.reply", this.challenge_reply);
    socket.removeListener("challenge.start", this.challenge_start);
    this.server.removeClient(this);
    delete this.server;
    delete this.socket;
  }
  
  // Todo: authentication
  Client.prototype.login = function(name) {
    if(this.server.allowedName(name, this))
        this.loginOk(name);
  }
  Client.prototype.loginOk = function(name) {
    this.name = name;
    this.socket.emit("login.ok", name);
    console.log("Client login: ", name);
    this.emit_state();
    this.send_player_list();
  }
  Client.prototype.emit_state = function() {
      if(this.name != null)
          this.server.broadcast("player.stats", {name:this.name, score: this.score, busy: this.busy});
  }
  Client.prototype.send_player_list = function() {
      // This is dirty
      // should be replaced with some "player.stats.multi"
      // event that sends whole array
      this.server.clients.forEach((client) => {
          if(client.name != null)
              this.socket.emit("player.stats", {name:client.name, score: client.score, busy: client.busy});
      });
  }
  // This is called when the remote player represented by this object
  // replies to a challenge
  Client.prototype.challenge_reply = function(boolValue) {
      if(!this.busy || this.link.player==null || this.link.status != PAIR_STATUS.CHALLENGE) {
          this.unpair();
          return this.error("You are accepting a game too late. There's 10s timeout.");
      }
      this.link.player.challenge_response(boolValue);

      if(boolValue) {
          // the other player is expected to start the game
          this.link.status = PAIR_STATUS.GAME;
      }
      else {
           this.unpair();
      }
  }
  // This function is called by some other Client when their representative replies
  // caller is already responsible for unpairing players
  Client.prototype.challenge_response = function(boolValue) {
      this.socket.emit("challenge.reply", boolValue); 
      clearTimeout(this.challenge_timeout);
      if(boolValue) {
          this.link.status = PAIR_STATUS.GAME;
          // Start a game
          this.game = new Reversi(this, this.link.player);
          this.link.player.game = this.game;
      }
      else {
          
      }
  }
  Client.prototype.challenge_start = function(name) {
      if(this.name==null)
          return this.error("Login before challenging people and stuff...");
      if(this.busy)
          return this.error("You have other things to do than challenge people right now!"); 
      if( (new Date().getTime() - this.challenge_last) < 15*1000) 
          return this.error("Not so fast buddy. Wait "+Math.round((15*1000 - new Date().getTime() + this.challenge_last)/1000)+" seconds more.");
          
      var player = this.server.playerByName(name);
      if(player) {
          if(player.busy) {
              return this.error("Player "+name+" has better things to do right now.");
          }
          player.socket.emit("challenge.start", this.name);
          this.pair(player, PAIR_STATUS.CHALLENGE);
          // Set timeout to end challenge
          this.challenge_timeout = setTimeout(this.challenge_fail.bind(this), 10*1000);
          this.challenge_last = new Date().getTime();
      }
      else {
          return this.error("Sry man, player "+name+" not found. Are you sure you're not sending some bullshit to server?");
      }
  }
  Client.prototype.challenge_fail = function() {
      this.unpair();
  }
  Client.prototype.pair = function(player, state) {
      player.busy = true;
      this.busy = true;
      this.link.status = player.link.status = state;
      this.link.player = player;
      player.link.player = this;
      player.emit_state();
      this.emit_state();
  }
  Client.prototype.unpair = function() {
      var player = this.link.player;
      if(player && player.link.player == this) {
          player.busy = false;
          player.link.status = PAIR_STATUS.NONE;
          player.link.player = null;
          player.emit_state();
      }
      this.busy = false;
      this.link.status = PAIR_STATUS.NONE;
      this.link.player = null;
      this.emit_state();
  }
  Client.prototype.match_init = function() {
  
  }
  Client.prototype.ip = function() {
      return this.socket.request.connection.remoteAddress;
  }
  // Contains name and ip address
  // name ommited if absent
  Client.prototype.fullName = function() {
      if(this.name!=null) 
          return this.ip()+" (aka '"+this.name+"')";
      else 
          return this.ip();
  }
  /**
   * Makes client available for games again **/
  Client.prototype.gameOver = function(message) {
      this.unpair();
      this.socket.emit("game.over", {message: message});
      this.emit_state();
  }
  Client.prototype.error = function(text) {
      this.socket.emit("error.user", text);
  }
  return Client;
});