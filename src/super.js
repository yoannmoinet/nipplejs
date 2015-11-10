///////////////////////
///   SUPER CLASS   ///
///////////////////////
///
var Super = function () {
    var self = this;
    self._handlers_ = {};
};

// Basic event system.
Super.prototype.on = function (arg, cb) {
    var self = this;
    var types = arg.split(/[ ,]+/g);
    var type;

    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        self._handlers_[type] = self._handlers_[type] || [];
        self._handlers_[type].push(cb);
    }
    return self;
};

Super.prototype.off = function (type, cb) {
    var self = this;
    if (type === undefined) {
        self._handlers_ = {};
    } else if (cb === undefined) {
        self._handlers_[type] = null;
    } else if (self._handlers_[type] &&
            self._handlers_[type].indexOf(cb) >= 0) {
        self._handlers_[type].splice(self._handlers_[type].indexOf(cb), 1);
    }
    return self;
};

Super.prototype.trigger = function (arg, data) {
    var self = this;
    var types = arg.split(/[ ,]+/g);
    var type;

    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        if (self._handlers_[type] && self._handlers_[type].length) {
            self._handlers_[type].forEach(function (handler) {
                handler.call(self, {
                    type: type,
                    target: self
                }, data);
            });
        }
    }
};
