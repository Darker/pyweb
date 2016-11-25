from __future__ import print_function
import js
import traceback
def exception_to_string(excp):
   stack = traceback.extract_stack()[:-3] + traceback.extract_tb(excp.__traceback__)  # add limit=?? 
   pretty = traceback.format_list(stack)
   return ''.join(pretty) + '\n  {} {}'.format(excp.__class__,excp)
class BrowserGame:
    def __init__(self):
        self.can_play = False
        self.player = None
        self.error = False
    
    def turn(self, board):
        try:
            print("Board: ", board)
            self.printMe(board, self.ally_color, self.enemy_color, -1)
            result = self.player.move(board)
            print("You play: ", result)
            if result is not None:
                self.emit_safe("pyevent.turn", {'coords': list(result)})
            else:
                self.emit_safe("pyevent.turn", {'coords': None})
        except Exception as e:
            self.emit_safe("pyevent.error", {'error': "Error when during turn!\n"+traceback.format_exc().replace("\\n", "\n")})

    def test_player(self, filename, ally_color, enemy_color):
        import_path = str(filename)
        if import_path.endswith(".py"):
            import_path = import_path[:-3]
        try:
            name = "MyPlayer"
            MyPlayer = getattr(__import__(import_path, fromlist=[name]), name)
            self.player = MyPlayer(ally_color, enemy_color)
            self.ally_color = ally_color
            self.enemy_color = enemy_color
            self.can_play = True
            self.emit_safe("pyevent.canplay", {'status': True, 'error':""})
        except Exception as e:
            self.emit_safe("pyevent.canplay", {'status': False, 'error': "Error when importing player!\n"+traceback.format_exc().replace("\\n", "\n")})
    def emit_safe(self, name, data):
        game = js.globals["pygame"];
        # waiting for someone to come up with better idea than this
        if str(type(game)) == "<type 'Undefined'>":
            print("EVENT: ", name, data)
        else:
            game.emit(name, data)
    def printMe(self, board, p_a, p_b, neutral):
        chars = ["-", "X", "O"]
        roles = [neutral, p_a, p_b]
        rowNo = 0
        colNo = 0
        for row in board:
            if colNo==0:
                print("   ", end="")
                for number in row:
                    print(str((colNo))+" ", end="")
                    colNo+=1
                print("\n", end="")
            print(str(rowNo)+" |", end="")
            rowNo+=1
            for number in row:
                field_type = roles.index(number)
                if field_type<0 or field_type>=len(chars):
                    field_type = 0
                print((chars[field_type])+" ", end="")
            print("\n", end="")