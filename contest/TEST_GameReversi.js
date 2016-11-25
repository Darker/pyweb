var requirejs = require("requirejs");
requirejs.config({
    baseUrl: __dirname,
    //Pass the top-level main.js/index.js require
    //function to requirejs so that node modules
    //are loaded relative to the top-level JS file.
    nodeRequire: require,
    waitSeconds: 20
});


requirejs(['GameReversi', "eventemitter2"], function(Game, EventEmitter2) {
  function FakePlayer() {
      EventEmitter2.call(this, { wildcard: false, newListener: false });
      this.on("game.event", (data)=>{
          var name = data.name;
          data = data.data
          if(name == "your_turn") {
              this.emit("game.event", {name: "turn_end", data: {field: results}})
          }
      });
  }
  FakePlayer.prototype = Object.create(EventEmitter2.prototype);


  var game = new Game(null, null);
});