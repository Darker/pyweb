define(["eventemitter2"], function(EventEmitter2) {
  function Server(server) {
      this.server = server;
      this.clients = [];
      this.players = [];

      EventEmitter2.call(this, {wildcard: false, newListener: false});
  }
  Server.prototype = Object.create(EventEmitter2.prototype);
  
  Server.prototype.addClient = function(c) {
      if(this.clients.indexOf(c)==-1) {
          this.clients.push(c);
          // This is dirty
          // should be replaced with some "player.stats.multi"
          // event that sends whole array
          this.clients.forEach((client) => {
              if(client.name != null)
                  c.emit("player.stats", {name:client.name, score: client.score, busy: client.busy});
          });
      }
  }
  // Returns client until concept of players is implemented
  Server.prototype.playerByName = function(name) {
      return this.clients.find((entry)=>{
         return entry.name==name;
      });
  }
  Server.prototype.allowedName = function(name, client) {
      if(typeof name!="string" || name.length>15 || name.length<4)
          return false;
      const negative_tests = [
         /^\s/, /\n\t/, /\s$/, /^[^a-z0-9]+$/, /["\\]/,
      ];
      if(negative_tests.find((test)=>{return test.test(name)}))
          return false;
      var pl = this.playerByName(name);
      return pl==null || pl==client;
  }
/**
 pseudo unit test **/
 /*var name = "dsad"

function testname(name) {
      const negative_tests = [
         /^\s/, /\n\t/, /\s$/, /^[^a-z0-9]+$/, /["\\]/,
         
      ];
      if(negative_tests.find((test)=>test.test(name)))
          return false;
        return true;
 }

        
["dsads", "ds dd dd", "##%$##$", "\"", " d", "d "].map(testname)*/
  
  Server.prototype.broadcast = function(evtname, evtdata) {
      this.clients.forEach((client) =>{client.socket.emit(evtname, evtdata);});
  }
  
  // Removes client from memory (when disconnected), not client's files
  Server.prototype.removeClient = function(c) {
      var i;
      if((i=this.clients.indexOf(c))!=-1) {
          this.clients.splice(i, 1);
          if(c.name != null)
              this.broadcast("player.quit", c.name);
      }
      else
          console.error("Tried to remove nonexistent client: ", c);
  }
  Server.prototype.isOnline = function(name) {
      return clients.find(function(x) {return x.name = name})!=null;
  }
  
  return Server;
});