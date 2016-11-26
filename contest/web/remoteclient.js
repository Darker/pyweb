define(["eventemitter2", "jquery", "jquery.ui"], function(EventEmitter2, $$$) {
  function RemoteClient(socket) {
      this.socket = socket;
      this.name = "";
      this.players = new PlayerList(this);
      this.socket.on("error", this.error = this.error.bind(this));
      this.socket.on("error.user", this.error = this.error.bind(this));
      this.socket.on("challenge.start", this.challenged = this.challenged.bind(this));
      this.socket.on("challenge.reply", this.challengeReply = this.challengeReply.bind(this));
      this.socket.on("login.ok", this.loginSuccess = this.loginSuccess.bind(this));
      this.socket.on("game.event", this.gameEvent = this.gameEvent.bind(this));
      this.socket.on("game.init", this.initGame = this.initGame.bind(this));
      this.socket.on("game.over", this.killGame = this.killGame.bind(this));
      
      this.socket.on("player.stats", (stats)=> {
          console.log("stats!", stats);
          this.players.player(stats.name).updateStats(stats);
      });
      this.socket.on("player.quit", (name)=> {
          console.log("player quit");
          this.players.player(name).remove();
      });
      this.socket.on("disconnect", ()=>{
          $("#connecting").show();
          this.formerName = this.name;
          this.killGame({message: "Disconnected."});
          this.name = "";
      });
      this.socket.on("reconnect", ()=>{
          console.log("reconnected, logging in");
          if(this.formerName != "") {
              this.requestLogin(this.formerName);
          }
      });
      EventEmitter2.call(this, {wildcard: false, newListener: false});
  }
  RemoteClient.prototype = Object.create(EventEmitter2.prototype);
  
  RemoteClient.prototype.initChallengeEvents = function() {
      $("#challenge .challenge-reject").one("click", ()=>{this.challengeReplyTo(false);});
      $("#challenge .challenge-accept").one("click", ()=>{this.challengeReplyTo(true );});
  }
  
  RemoteClient.prototype.initChallengeEvents = function() {
      $("#challenge .challenge-reject").one("click", ()=>{this.challengeReplyTo(false);});
      $("#challenge .challenge-accept").one("click", ()=>{this.challengeReplyTo(true );});
  }
  RemoteClient.prototype.requestLogin = function(name) {
      this.socket.emit("login", name);  
  }
  RemoteClient.prototype.loginSuccess = function(name) {
      this.name = name;
      document.body.appendChild(this.players.table);
      $("#connecting").hide();
  }
  RemoteClient.prototype.challenged = function(challenger) {
      //this.socket.emit("challenge.reply", confirm("You've been challenged by "+challenger+". Accept?"));
      this.startCountDown();
      $("#challenge .playername").html("")[0].appendChild(new Text(challenger));
      this.initChallengeEvents();
      $("#challenge").addClass("reply");
  }
  RemoteClient.prototype.challengeReplyTo = function(choice) {
      this.stopCountDown();
      this.socket.emit("challenge.reply", choice==true);
  }
  RemoteClient.prototype.error = function(text) {
      alert("ERROR:\n"+text);
  }
  RemoteClient.prototype.startChallenge = function(name) {
      this.socket.emit("challenge.start", name);
      $("#challenge .playername").html("")[0].appendChild(new Text(name));
      this.startCountDown();
      $("#challenge").addClass("wait");
  }
  RemoteClient.prototype.challengeReply = function(state) {
      this.stopCountDown();
      alert(state?"Game accepted!":"Game refused!");
  }
  RemoteClient.prototype.startCountDown = function(name) {
      const PROGRESS_MAX = 200;
      var percent = PROGRESS_MAX;
      $("#challenge progress").val(PROGRESS_MAX);
      $("#challenge progress").attr("max", PROGRESS_MAX);
      $("#challenge")[0].className = "overlay";
      // the interval is set up so that it spans 10 seconds over 100% of the progress bar
      this.challenge_interval = setInterval(()=>{
          $("#challenge progress").val(percent--);
          if(percent<=0) {
              this.stopCountDown();
              alert("Challenge was not accepted.");
          }
      }, (10*1000)/PROGRESS_MAX);
      
      $("#challenge").show();
  }
  RemoteClient.prototype.stopCountDown = function(name) {
      $("#challenge").hide();
      clearInterval(this.challenge_interval);
  }
  RemoteClient.prototype.initGame = function(info) {
      const GAMENAMES = {
          reversi: "ReversiClient"
      }
      this.eventBuffer = [];
      require([GAMENAMES[info.name]], (Game)=>{
          this.game = new Game(this, info);
          // clear event buffer
          this.eventBuffer.forEach((evt)=>this.gameEvent(evt));
          this.eventBuffer.length = 0;
      });
  }
  RemoteClient.prototype.killGame = function(data) {
      console.log("Game over: ", data);
      var game = this.game;
      this.game = null;
      if(game!=null)
          game.gameOver(data.message);
  }
  // Forward game event to game if possible
  RemoteClient.prototype.gameEvent = function(evt) {
      if(this.game) {
          console.log("Game event forwarded: ", evt);
          this.game.emit(evt.name, evt.data);
      }
      else {
          console.log("Game event buffered: ", evt);
          this.bufferGameEvents(evt);
      }
  }
  // this saves any game events before they can be dispatched to the game
  RemoteClient.prototype.bufferGameEvents = function(evt) {
      if(!this.eventBuffer)
          this.eventBuffer = [];
      this.eventBuffer.push(evt);
  }
  function PlayerList(client) {
      this.table = document.createElement("table");
      this.table.className = "player-list";
      this.client = client;
      this.players = [];
      //this.client.socket.on("
  }
  PlayerList.prototype.player = function(name) {
      var player = this.players.find((p)=>{return p.name == name;});
      if(player == null) {
         player = new PlayerEntry(this, name, 0);
         this.players.push(player);
         this.table.appendChild(player.container);
      }  
      return player;
  }
  
  function PlayerEntry(list, name, score) {
      this.parent = list;
      this.name = name;
      this.score = score;
      this.container = document.createElement("tr");
      this.nameTd = document.createElement("td");
      this.nameTd.className = "player-name";
      this.nameTd.appendChild(new Text(name));
      this.scoreTd = document.createElement("td");
      this.nameTd.className = "player-score";
      this.scoreText = new Text("0");
      this.scoreTd.appendChild(this.scoreText);
      this.controlsTd = document.createElement("td");
      // only if not me
      if(this.name != this.parent.client.name) {
          var but = this.challengeBut = document.createElement("button");
          but.appendChild(new Text("Challenge"));
          but.addEventListener("click", this.challenge = this.challenge.bind(this));
          but.className = "challenge-button";
          this.controlsTd.appendChild(but)
      }
      this.container.appendChild(this.nameTd);
      this.container.appendChild(this.scoreTd);
      this.container.appendChild(this.controlsTd);
      
  }
  PlayerEntry.prototype.challenge = function() {
      this.parent.client.startChallenge(this.name);
  }
  PlayerEntry.prototype.remove = function() {
      this.parent.table.removeChild(this.container);
      this.parent.players.splice(this.parent.players.indexOf(this), 1);
  }
  PlayerEntry.prototype.updateStats = function(stats) { 
      this.score = stats.score;
      this.scoreText.data = stats.score+"";
      if(this.challengeBut instanceof HTMLElement) {
          if(stats.busy)
              this.challengeBut.setAttribute("disabled", "disabled");
          else
              this.challengeBut.removeAttribute("disabled");
      }
  }
  return RemoteClient;
});