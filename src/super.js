///////////////////////
///   SUPER CLASS   ///
///////////////////////
import * as u from './utils';

// Constants
var isTouch = !!('ontouchstart' in window);
var isPointer = window.PointerEvent ? true : false;
var isMSPointer = window.MSPointerEvent ? true : false;
var events = {
    touch: {
        start: 'touchstart',
        move: 'touchmove',
        end: 'touchend, touchcancel'
    },
    mouse: {
        start: 'mousedown',
        move: 'mousemove',
        end: 'mouseup'
    },
    pointer: {
        start: 'pointerdown',
        move: 'pointermove',
        end: 'pointerup, pointercancel'
    },
    MSPointer: {
        start: 'MSPointerDown',
        move: 'MSPointerMove',
        end: 'MSPointerUp'
    }
};
var toBind;
var secondBind = {};
if (isPointer) {
    toBind = events.pointer;
} else if (isMSPointer) {
    toBind = events.MSPointer;
} else if (isTouch) {
    toBind = events.touch;
    secondBind = events.mouse;
} else {
    toBind = events.mouse;
}

function Super () {}

// Basic event system.
Super.prototype.on = function (arg, cb) {
    var self = this;
    var types = arg.split(/[ ,]+/g);
    var type;
    self._handlers_ = self._handlers_ || {};

    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        self._handlers_[type] = self._handlers_[type] || [];
        self._handlers_[type].push(cb);
    }
    return self;
};

Super.prototype.off = function (type, cb) {
    var self = this;
    self._handlers_ = self._handlers_ || {};

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
    self._handlers_ = self._handlers_ || {};

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

// Configuration
Super.prototype.config = function (options) {
    var self = this;
    self.options = self.defaults || {};
    if (options) {
        self.options = u.safeExtend(self.options, options);
    }
};

// Bind internal events.
Super.prototype.bindEvt = function (el, type) {
    var self = this;
    self._domHandlers_ = self._domHandlers_ || {};

    self._domHandlers_[type] = function () {
        if (typeof self['on' + type] === 'function') {
            self['on' + type].apply(self, arguments);
        } else {
            // eslint-disable-next-line no-console
            console.warn('[WARNING] : Missing "on' + type + '" handler.');
        }
    };

    u.bindEvt(el, toBind[type], self._domHandlers_[type]);

    if (secondBind[type]) {
        // Support for both touch and mouse at the same time.
        u.bindEvt(el, secondBind[type], self._domHandlers_[type]);
    }

    return self;
};

// Unbind dom events.
Super.prototype.unbindEvt = function (el, type) {
    var self = this;
    self._domHandlers_ = self._domHandlers_ || {};

    u.unbindEvt(el, toBind[type], self._domHandlers_[type]);

    if (secondBind[type]) {
        // Support for both touch and mouse at the same time.
        u.unbindEvt(el, secondBind[type], self._domHandlers_[type]);
    }

    delete self._domHandlers_[type];

    return this;
};

export default Super;
