///////////////////////
///   SUPER CLASS   ///
///////////////////////
///
var Super = function () {
    this.handlers = {};
};

// Basic event system.
Super.prototype.on = function (arg, cb) {
    var self = this;
    var types = arg.split(/[ ,]+/g);
    var type;

    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        self.handlers[type] = self.handlers[type] || [];
        self.handlers[type].push(cb);
    }
    return self;
};

Super.prototype.off = function (type, cb) {
    var self = this;
    if (cb === undefined) {
        self.handlers[type] = [];
    } else if (self.handlers[type] && self.handlers[type].indexOf(cb) >= 0) {
        self.handlers[type].splice(self.handlers[type].indexOf(cb), 1);
    }
    return self;
};

Super.prototype.trigger = function (arg, data) {
    var self = this;
    var types = arg.split(/[ ,]+/g);
    var type;

    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        if (self.handlers[type] && self.handlers[type].length) {
            self.handlers[type].forEach(function (handler) {
                handler.call(self, {
                    type: type,
                    target: self
                }, data);
            });
        }
    }
};
