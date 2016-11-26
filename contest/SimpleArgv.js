// comes from qt gui test
function Arguments(proc) {
    if (typeof proc == "object") {
        this.process = proc;
    }
    else {
        this.process = process;
    }
    this.parse();
    this._defaults = {};
}       

Arguments.prototype.default = function (name, val) {
    if (typeof val != "undefined") {
        this._defaults[name] = val;
        this.addGetterFor(name);
    }
    return this._defaults[name];
}
/*Object.defineProperty(Arguments.prototype, "defaults", {
    get: function() {}
})*/
Arguments.prototype.parse = function () {
    var p_args = this.process.argv;
    var args = this.args = {};
    for (var i = 0, l = p_args.length; i < l; i++) {
        var arg = p_args[i];
        var index = arg.indexOf("=");
        var name, value;
        if (index == -1) {
            name = arg;
            value = true;
        }
        else {
            name = arg.substr(0, index);
            value = arg.substr(index + 1);
        }

        var defined_already = false;
        if (args[name]) {
            value = [value];
            value.push(args[name]);
            defined_already = true;
        }
        args[name] = value;
        if (!defined_already && !this.hasOwnProperty("arg_" + name)) {
            //Object.defineProperty(args, name, {
            //    get: getterForName(internal_name)
            //});
            
            Object.defineProperty(this, "arg_" + name, {
                get: getterForNameArgs(name)
            });
        }
    }
}
Arguments.prototype.addGetterFor = function (name) {
    if (!this.hasOwnProperty("arg_" + name)) {
        Object.defineProperty(this, "arg_" + name, {
            get: getterForNameArgs(name)
        });
    }
}
function getterForName(name) {
    return function () {
        return this[name];
    }
}
function getterForNameArgs(name) {
    return function () {
        if (typeof this.args[name] != "undefined") {
            return this.args[name];
        }
        else if (typeof this._defaults[name] != "undefined") {
            return this._defaults[name];
        }
        else {
        }
    }
}
module.exports = Arguments;