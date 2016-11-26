define(["eventemitter2", "settings"], function (EventEmitter2, settings) {
    function Game(player1, player2) {
        this.board = [
     //  0  1  2  3  4  5  6  7
        [0, 0, 0, 0, 0, 0, 0, 0], // 0
        [0, 0, 0, 0, 0, 0, 0, 0], // 1
        [0, 0, 0, 0, 0, 0, 0, 0], // 2
        [0, 0, 0, 1, 2, 0, 0, 0], // 3
        [0, 0, 0, 2, 1, 0, 0, 0], // 4
        [0, 0, 0, 0, 0, 0, 0, 0], // 5
        [0, 0, 0, 0, 0, 0, 0, 0], // 6
        [0, 0, 0, 0, 0, 0, 0, 0]  // 7
      ];

        this.players = [new Player(player1, 1, 2), new Player(player2, 2, 1)];
        this.players[0].opponent = this.players[1];
        this.players[1].opponent = this.players[0];
        
        this.colors = [0, 1, 2];
        this.current = this.players[Math.round(Math.random())];
        // True if game sent turn request but received no reply yet
        this.halfTurn = false;
        this.rows = this.board.length;
        this.cols = this.board[0].length;
        this.toPlayer1("game.init", { name: "reversi", colors: { empty: 0, ally: 1, enemy: 2} });
        this.toPlayer2("game.init", { name: "reversi", colors: { empty: 0, ally: 2, enemy: 1} });
        this.allPlayers("game.event", { name: "map", data: this.board });

        this.players[0].socket.on("game.event", this.fromPlayer1 = this.fromPlayer1.bind(this));
        this.players[1].socket.on("game.event", this.fromPlayer2 = this.fromPlayer2.bind(this));

        EventEmitter2.call(this, { wildcard: false, newListener: false });

        this.on("turn_end", this.move = this.move.bind(this));

        // Start first turn in 3 seconds
        setTimeout(()=>this.askForTurn(), 3000);
    }
    Game.prototype = Object.create(EventEmitter2.prototype);
    Game.prototype.NEUTRAL = 0;
    Game.prototype.askForTurn = function () {
        var player = this.current;
        if (!this.can_play(player))
            player = this.nextTurn();
        if (!this.can_play(player))
            return this.gameOver();
        console.log("[GAME] It's "+player.name+"'s turn.");
        //player.sendEvent("map", this.board);
        player.sendEvent("your_turn", {});
        this.halfTurn = true;
    }
    Game.prototype.move = function (data) {
        var player = this.current;
        console.log("[GAME] Player ",player.name," plays ",data.data.field);
        if (player != data.from || !this.halfTurn) {
            return this.gameErrorSimple("You tried to play instead of the other player. That was a very bad idea!", player);
        }
        var field = data.data.field;
        if(!(field instanceof Array) || field.length!=2) {
            return this.gameErrorSimple("Invalid move data.", player);
        }
        try {
            this.place(data.data.field, player, null);
        }
        catch (e) {
            console.log("[GAME] Player ",player.name," MOVED WRONGLY WTF ARE WE GONNA DO NOW OMG?!?!?!");
            return this.gameErrorSimple("Invalid move! First mistake - no more mistakes!", player);
        }
        this.allPlayers("game.event", { name: "map", data: this.board });
        this.nextTurn();
        setTimeout(()=>this.askForTurn(), 500);
    }
    Game.prototype.nextTurn = function () {
        this.current = this.players[this.current == this.players[0] ? 1 : 0];
        this.halfTurn = false;
        return this.current;
    }
    Game.prototype.gameOver = function() {
        console.log("[GAME OVER]");
        this.score();
        // special case if score is the same
        if(this.players[0].score == this.players[1].score) {
            this.players.forEach((player)=>{
                player.client.score++;
                player.client.gameOver("Draw");
            });
        }
        else {
            var winner = this.players.reduce((x, prev)=>x.score>prev.score?x:prev);
            winner.client.score +=2;
            winner.client.gameOver("Victory");
            winner.opponent.client.gameOver("Defeat");
        }
        // end game
        this.terminate();
    }
    // Terminates the game because someone caused an error
    // first argument is an array of {message: "...", player: Player object - who caused it}
    // players can be null in this array
    // players that caused error receive no score points
    // other players receive 2 points if crash was caused by player
    // 1 point otherwise
    Game.prototype.gameError = function(causes) {
        var causedBySomeone = causes.find((cause)=>cause!=null) != null;
        // Reward any players that do not occur in the 
        // list of sinners
        this.players.forEach((player) =>{
            // This means the player is not in the list of causes fyi
            if(!causes.find((cause)=>cause==player)) {
                player.score+= causedBySomeone? 2:1;
                player.client.gameOver("Game/enemy error");
            }       
        });
        // punish those who caused it
        // do not report other errors, except in console
        causes.forEach((cause) =>{
            var error = "[GAME FATAL ERROR] "+this.players[0].client.fullName()+" VS "+this.players[0].client.fullName()+"\n"
                      + "                  "+cause.message;
            if(cause.player!=null) {
                error+= "                   Caused by: "+cause.player.fullName();
                cause.player.gameOver("You caused error");
                cause.player.error("You caused game error: "+cause.message);
            }
        });
        // end game
        this.terminate();
    }
    // Easier to call but translates to gameError
    Game.prototype.gameErrorSimple = function(message, perpetrator) {
        if(typeof perpetrator!="object")
            perpetrator = 0;
        this.gameError([{message: message, player: perpetrator}]);
    }
    Game.prototype.terminate = function() {
        this.players.forEach((player) => {
            this.players[0].socket.removeListener("game.event", this.fromPlayer1);
            this.players[1].socket.removeListener("game.event", this.fromPlayer2);
        });
    }
    /** calculates score and saves it in Player objects **/
    Game.prototype.score = function() {
        var playerByColor = {};
        this.players[0].score = 0;
        this.players[1].score = 0;
        
        for (var row = 0, rows=this.board.length; row < rows; row++) {
            for (var col = 0, cols=this.board[row].length; col < cols; col++) {
                var color = this.board[row][col];
                if(color == this.colors[0])
                    continue;
                var player = playerByColor[color] || (playerByColor[color]=this.playerByColor(color));
                player.score++;
            }
        }
    }
    Game.prototype.playerByColor = function(color) {
        return this.players.find((player)=>player.color==color);
    }
    Game.prototype.allPlayers = function (evtName, evtData) {
        this.players[0].socket.emit(evtName, evtData);
        this.players[1].socket.emit(evtName, evtData);
    }
    Game.prototype.toPlayer1 = function (evtName, evtData) {
        this.players[0].socket.emit(evtName, evtData);
    }
    Game.prototype.toPlayer2 = function (evtName, evtData) {
        this.players[1].socket.emit(evtName, evtData);
    }
    Game.prototype.fromPlayer1 = function (evtData) {
        return this.fromPlayer(evtData, this.players[0]);
    }
    Game.prototype.fromPlayer2 = function (evtData) {
        return this.fromPlayer(evtData, this.players[1]);
    }
    Game.prototype.fromPlayer = function (evtData, player) {
        var evtName = "";
        if(typeof evtData=="object") {
            evtData.from = player;
            evtName = evtData.name;
        } 
        else
            evtData = {from: player, data: evtData}
        this.emit(evtName, evtData);
    }
    // All code below is converted from my py implementation
    //http://www.rapydscript.com/try-it/
    // additional replacements
    // self -> this
    function _eq(a, b) {
        return a == b;
    }
    function len(ar) {
        return ar.length;
    }
    function _Iterable(array) {
        return array;
    }

    Game.prototype.can_play = function (player) {
        var row, col, score;
        for (row = 0; row < this.board.length; row++) {
            for (col = 0; col < this.board[row].length; col++) {
                if (this.board[row][col] == this.colors[this.NEUTRAL]) {
                    score = this.get_claim_stones([row, col], player, true).length;
                    if (score > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    Game.prototype.find_opponent_stones = function (direction, start, player) {
        var _1, _2, _3;
        var pos, first_iteration, ended_properly, board, current_color, fields;
        pos = [start[0], start[1]];
        first_iteration = true;
        ended_properly = false;
        board = this.board;
        //console.log("[GAME] Finding grab stones at ", pos, " in direction ", direction);
        while (pos[0] >= 0 && pos[1] >= 0 && pos[0] < this.rows && pos[1] < this.cols) {
            current_color = board[pos[0]][pos[1]];
            if (first_iteration) {
                if (current_color != player.opponent_color ) {
                    first_iteration = false;
                    //console.log("      [FAIL] No enemy stone at ", pos, " in direction ", direction);
                    break;
                }
                fields = [];
            } else {
                if (current_color == player.color) {
                    ended_properly = true;
                    //console.log("      [SUCCESS] My stone at ", pos, " in direction ", direction);
                    break;
                } else if (current_color == this.colors[0]) {
                    //console.log("      [FAIL] Empty space at ", pos, " in direction ", direction);
                    break;
                }
            }
            first_iteration = false;
            fields.push([pos[0], pos[1]]);
            pos[0] += direction[0];
            pos[1] += direction[1];
        }
        //if(first_iteration)
        //    console.log("      [FAIL] Pos is not valid: ", pos, " in field ", this.rows, "x", this.cols);
        if (ended_properly) {
            return fields;
        } else {
            return [];
        }
    }

    Game.prototype.place = function (pos, player, turned_fields) {
        var _itr1, _idx1;
        var field, cur_player_index, turned_stones;
        if (!(turned_fields instanceof Array)) {
            turned_fields = this.get_claim_stones(pos, player);
        }
        if (len(turned_fields) == 0) {
            throw new Error("Invalid move at " + this.strpos(pos));
        }

        for (_idx1 = 0; _idx1 < turned_fields.length; _idx1++) {
            field = turned_fields[_idx1];
            this.board[field[0]][field[1]] = player.color;
        }
        // place the field itself
        this.board[pos[0]][pos[1]] = player.color;
    }
    Game.prototype.get_claim_stones = function (stone_pos, player, terminate_asap) {
        var _itr1, _idx1;
        terminate_asap = terminate_asap === void 0 ? false : terminate_asap;
        var directions, reverse_fields, opponent_color, direction, pos, fields_tmp;
        directions = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
        reverse_fields = [];
        opponent_color = player.opponent_color;
        _itr1 = _Iterable(directions);
        for (_idx1 = 0; _idx1 < _itr1.length; _idx1++) {
            direction = _itr1[_idx1];
            pos = [stone_pos[0] + direction[0], stone_pos[1] + direction[1]];
            //console.log("  Finding stones for ", stone_pos, " in direction ", direction);
            fields_tmp = this.find_opponent_stones(direction, pos, player);
            reverse_fields.push.apply(reverse_fields, fields_tmp);
            if (terminate_asap===true && len(reverse_fields) > 0) {
                break;
            }
        }
        return reverse_fields;
    }
    function Player(client, color, opponent_color) {
        if(client!=null) {
            this.client = client;
            this.socket = client.socket;
            this.name = client.name;
        }
        else {
            this.client = new EventEmitter2();
            this.socket = new EventEmitter2();
            this.name = "Player_"+color;
        }
        this.color = color;
        this.opponent_color = opponent_color;
    }
    /************************************************************************/
    /* Sends game event, that is game.event               */
    /************************************************************************/
    Player.prototype.sendEvent = function (name, data) {
        this.socket.emit("game.event", { name: name, data: data });

    }
    return Game;
});