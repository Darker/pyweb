requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: '.',
    paths: {
        jquery: [
            '//code.jquery.com/jquery-2.1.4.min',
            //If the CDN location fails, load from this location
            'jquery'
        ],
        "socket.io": [
            "//cdn.socket.io/socket.io-1.3.7",
            "socket.io.backup"
        ],
        "jquery.ui": [
            "jquery-ui.min"
        ]
    },
    waitSeconds: 20   
});
requirejs.onError = function(error) {
  if(error.requireModules)
    error.requireModules.forEach(function(name) {
      //Create basename in case this was an URL
      name.replace(/^.*[/]/, "");
      // Debug
      console.warn("Module failed to load: ", name, error);
    });
  else
    console.error("Unexpected requirejs onError callback: ", error);
}

var deps = ["socket.io", "remoteclient", "ui"];

// Start the main app logic.
requirejs(deps, function(io, RemoteClient, ui) {
  console.log(ui);
  var socket = self.socket = io(location.hostname+":"+location.port);
  var client = new RemoteClient(socket);  
  $("#connecting").hide();   
  $("#login-dialog").dialogPromise().then(function(results) {
      console.log(results);
      client.requestLogin(results.username);
  });                            
  //document.body.appendChild(client.getHTML());  
  //socket.emit("login", "username");
    
});