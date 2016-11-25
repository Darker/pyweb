define(["eventemitter2"], function(EventEmitter2) {
  const COLOR_CLASS_NAMES = ["empty", "ally", "enemy"];
  function ReversiClient(client, gameinfo) {
      this.socket = client.socket;
      this.client = client;
      this.board = null;
      this.renderer = null;
      this.colors = [gameinfo.colors.empty, gameinfo.colors.ally, gameinfo.colors.enemy];
      this.ready = false;
      EventEmitter2.call(this, {wildcard: false, newListener: false});
      
      this.on("map", this.updateMap = this.updateMap.bind(this));
      this.on("your_turn", this.turnStart = this.turnStart.bind(this));
      this.on("pyevent.error", this.error = this.error.bind(this));
      this.on("pyevent.turn", this.turnEnd = this.turnEnd.bind(this));
      this.on("pyevent.canplay", this.canPlay = this.canPlay.bind(this));
      // This is nasty, but done for the lack of better ideas
      // python accesses this through
      //    import js
      //    js.globals["pygame"]
      window.pygame = this;
      // Run the init code, again nasty, calling some random global fn
      PYTHON_QUEUE.addItem("import BrowserGame\n"
                         + "game = BrowserGame.BrowserGame()\n"
                         + "game.test_player(\""+getSelectedFile()+"\", "+gameinfo.colors.ally+", "+gameinfo.colors.enemy+")\n"
                         + "print \"Ready to play\" if game.can_play else \"Error in python, cannot play a game!\""
      );
  }
  ReversiClient.prototype = Object.create(EventEmitter2.prototype);
  ReversiClient.prototype.updateMap = function(map) {
      this.board = map;
      console.log("Updating map!");
      if(this.renderer==null) {
          this.renderer = document.createElement("table");
          this.renderer.className = "game reversi";
          document.getElementById("game_field").appendChild(this.renderer);
      }
      
      var table = this.renderer;
      for(var row=0,rows=this.board.length; row<rows; row++) {
          for(var col=0,cols=this.board[row].length; col<cols; col++) {
              while(!(table.rows[row] instanceof HTMLElement)) {
                  var tr = document.createElement("tr");
                  table.appendChild(tr);
              }
              while(!(table.rows[row].cells[col] instanceof HTMLElement)) {
                  var td = document.createElement("td");
                  td.innerHTML = "&nbsp;";
                  table.rows[row].appendChild(td);
              }
              var td = table.rows[row].cells[col];
              td.className = this.CSSClassFor(row, col);
          }
      } 
  }
  /** Ends game by adding the table to log of former games and removing all signals/slots **/
  ReversiClient.prototype.gameOver = function(message) {
      var log_div = document.createElement("div");
      var heading = document.createElement("h3");
      heading.appendChild(new Text(message));
      log_div.appendChild(heading);
      this.renderer.parentNode.removeChild(this.renderer);
      log_div.appendChild(this.renderer);
      document.getElementById("old_games").appendChild(log_div);
  }
  /** Called when server asks you to play **/
  ReversiClient.prototype.turnStart = function() {
      console.log("[REVERSI] Playing on board: ", this.board);
      if(this.ready)
          PYTHON_QUEUE.addItem("game.turn("+this.board2str()+")");
      else
          this.error({error:"Cannot play, not ready yet!"});
  }
  /** Called when Python sends a turn result **/
  ReversiClient.prototype.turnEnd = function(results) {
      console.log("[REVERSI] Completed turn: ", results);
      this.socket.emit("game.event", {name: "turn_end", data: {field: results.coords}});
      //this.socket.emit("game.event.turn_end", {field: results});
  }
  ReversiClient.prototype.CSSClassFor = function(row, col) {
      return COLOR_CLASS_NAMES[this.remoteColorToLocal(this.board[row][col])];
  }
  ReversiClient.prototype.myColor = function() {
      return this.colors[1];
  }
  ReversiClient.prototype.hisColor = function() {
      return this.colors[2];
  }
  ReversiClient.prototype.board2str = function() {
      var str = "[";
      this.board.forEach(function(line){
          if(str.length>1)
              str+=",";
          str+="["+line.join(",")+"]";
      });
      str += "]";
      return str.replace(/0/g, "-1");
  }
  ReversiClient.prototype.canPlay = function(info) {
      if(!info.status) {
          this.error({error:info.error})
      }
      this.ready = info.status;
  }
  ReversiClient.prototype.error = function(info) {
      console.log("[REVERSI] FUCK FUCK FUCK!!! ", info);
      this.socket.emit("game.over", {reason: "error", error: info.error});
      alert("ERROR DURING GAME:\n"+info.error);
  }
  ReversiClient.prototype.localColorToRemote = function(color) {
      return this.colors[color];
  }
  ReversiClient.prototype.remoteColorToLocal = function(color) {
      return this.colors.indexOf(color);
  }
  return ReversiClient;
});