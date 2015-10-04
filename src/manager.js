///////////////////////
///     MANAGER     ///
///////////////////////
Manager.prototype = new Super();
Manager.constructor = Manager;

function Manager (options) {
    var self = this;
    self.handlers = {};
    self.pressureIntervals = {};
    self.config(options);
    self.box = this.options.zone.getBoundingClientRect();
    self.nipples = [];
    self.bindEvt(self.options.zone, 'start');
    self.on('destroyed', this.ondestroyed);

    self.nipples.on = self.on.bind(self);
    self.nipples.off = self.off.bind(self);
    self.nipples.options = self.options;
    self.nipples.nippleOptions = self.nippleOptions;
    self.nipples.destroy = self.destroy.bind(self);
    self.nipples.get = function (id) {
        for (var i = 0, max = self.nipples.length; i < max; i += 1) {
            if (self.nipples[i].identifier === id) {
                return self.nipples[i];
            }
        }
    };

    if (self.options.mode === 'static') {
        var nipple = this.createNipple(this.options.position, 0);
        nipple.add();
    }

    // Listen for resize, to reposition every joysticks
    var resizeTimer;
    window.onresize = function (evt) {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var pos;
            var scroll = u.getScroll();
            self.nipples.forEach(function (nipple) {
                pos = nipple.el.getBoundingClientRect();
                nipple.position = {
                    x: scroll.x + pos.left,
                    y: scroll.y + pos.top
                };
            });
        }, 100);
    };

    return self.nipples;
};

// Configure Manager.
Manager.prototype.config = function (options) {
    this.options = {};
    this.nippleOptions = {};

    // Defaults
    this.options.zone = document.body;
    this.options.multitouch = false;
    this.options.maxNumberOfNipples = 1;
    this.options.mode = 'dynamic'; //static, semi;
    this.options.position = {top: 0, left: 0};
    this.options.catchDistance = 200;
    this.nippleOptions.size = 100;
    this.nippleOptions.threshold = 0.1;
    this.nippleOptions.color = 'white';
    this.nippleOptions.fadeTime = 250;
    this.nippleOptions.dataOnly = false;
    this.nippleOptions.restOpacity = 0.5;
    this.nippleOptions.mode = this.options.mode;

    // Overwrites
    for (var i in options) {
        if (this.options.hasOwnProperty(i)) {
            this.options[i] = options[i];
        } else if (this.nippleOptions.hasOwnProperty(i)) {
            this.nippleOptions[i] = options[i];
        }
    }

    if (this.options.mode === 'static' || this.options.mode === 'semi') {
        this.options.multitouch = false;
        this.options.maxNumberOfNipples = 1;
    }

    return this;
};

// Nipple Factory
Manager.prototype.createNipple = function (position, identifier) {
    var scroll = u.getScroll();
    var toPutOn = {};

    if (position.x && position.y) {
        toPutOn = {
            x: position.x -
                (scroll.x + this.box.left),
            y: position.y -
                (scroll.y + this.box.top)
        };
    } else if (
            position.top ||
            position.right ||
            position.bottom ||
            position.left
        ) {

        // We need to compute the position X / Y of the joystick.
        var dumb = document.createElement('DIV');
        dumb.style.display = 'hidden';
        dumb.style.top = position.top;
        dumb.style.right = position.right;
        dumb.style.bottom = position.bottom;
        dumb.style.left = position.left;
        dumb.style.position = 'absolute';

        this.options.zone.appendChild(dumb);
        var dumbBox = dumb.getBoundingClientRect();
        this.options.zone.removeChild(dumb);

        toPutOn = position;
        position = {
            x: dumbBox.left + scroll.x,
            y: dumbBox.top + scroll.y
        };
    }

    var frontPosition = {
        x: 0,
        y: 0
    };

    var nipple = new Nipple(this, {
        color: this.nippleOptions.color,
        size: this.nippleOptions.size,
        threshold: this.nippleOptions.threshold,
        fadeTime: this.nippleOptions.fadeTime,
        dataOnly: this.nippleOptions.dataOnly,
        restOpacity: this.nippleOptions.restOpacity,
        mode: this.options.mode,
        identifier: identifier,
        position: position,
        frontPosition: frontPosition
    });

    if (!this.nippleOptions.dataOnly) {
        u.applyPosition(nipple.ui.el, toPutOn);
        u.applyPosition(nipple.ui.front, nipple.frontPosition);
    }

    this.nipples.push(nipple);
    return nipple;
};

// Bind internal events for the Manager.
Manager.prototype.bindEvt = function (el, type) {
    var self = this;

    handlers[type] = function () {
        self['on' + type].apply(self, arguments);
    };

    u.bindEvt(el, toBind[type], handlers[type]);

    if (secondBind[type]) {
        // Support for both touch and mouse at the same time.
        u.bindEvt(el, secondBind[type], handlers[type]);
    }

    return self;
};

// Unbind internal events for the Manager
Manager.prototype.unbindEvt = function (el, type) {
    u.unbindEvt(el, toBind[type], handlers[type]);
    handlers[type] = undefined;

    return this;
};

Manager.prototype.onstart = function (evt) {
    evt = u.prepareEvent(evt);
    this.box = this.options.zone.getBoundingClientRect();
    this.scroll = u.getScroll();

    // if we have touches and multitouch
    if (evt.length && this.options.multitouch &&
        this.nipples.length < this.options.maxNumberOfNipples) {

        for (var i = 0, max = evt.length; i < max; i += 1) {
            this.processOnStart(evt[i]);
        }
    // if we don't already have a nipple in place.
    // we process a new one
    } else if (this.nipples.length === 0 || this.options.mode !== 'dynamic') {
        this.processOnStart(evt[0] || evt);
    }

    if (!this.started) {
        this.bindEvt(document, 'move')
            .bindEvt(document, 'end');
        this.started = true;
    }

    return false;
};

Manager.prototype.pressureFn = function (touch, nipple, identifier) {
    var previousPressure = 0;
    clearInterval(this.pressureIntervals[identifier]);
    // Create an interval that will read the pressure every 100ms
    this.pressureIntervals[identifier] = setInterval(function () {
        var pressure = touch.force || touch.pressure ||
            touch.webkitForce || 0;
        if (pressure !== previousPressure) {
            nipple.trigger('pressure', pressure);
            this.trigger('pressure ' +
                nipple.identifier + ':pressure', pressure);
            previousPressure = pressure;
        }
    }.bind(this), 100);
};

Manager.prototype.processOnStart = function (evt) {
    var identifier = (evt.identifier !== undefined ?
        evt.identifier :
        evt.pointerId) || 0;

    var nipple = this.nipples.get(identifier);

    var position = {
        x: evt.pageX,
        y: evt.pageY
    };

    if (nipple) {
        if (this.options.mode === 'static') {
            nipple.show();
            if (pressure > 0) {
                this.pressureFn(evt, nipple, identifier);
            }
            // We're not 'dynamic' so we process the first touch as a move.
            this.processOnMove(evt);
        }

        if (this.options.mode === 'semi') {
            var distance = u.distance(position, nipple.position);
            if (distance <= this.options.catchDistance) {
                nipple.show();
                if (pressure > 0) {
                    this.pressureFn(evt, nipple, identifier);
                }
                this.processOnMove(evt);
            } else {
                nipple.destroy();
                this.processOnStart(evt);
            }
        }
    } else {
        nipple = this.createNipple(position, identifier);
        this.trigger('added ' + nipple.identifier + ':added', nipple);
        nipple.show();
        if (pressure > 0) {
            this.pressureFn(evt, nipple, identifier);
        }
    }

    nipple.trigger('start', nipple);
    this.trigger('start ' + nipple.identifier + ':start', nipple);
    return nipple;
};

Manager.prototype.onmove = function (evt) {
    evt = u.prepareEvent(evt);
    var toSends = [];

    if (evt.length && this.options.multitouch) {
        for (var i = 0, max = evt.length; i < max; i += 1) {
            toSends.push(this.processOnMove(evt[i]));
        }
    } else {
        toSends.push(this.processOnMove(evt[0] || evt));
    }

    return false;
};

Manager.prototype.processOnMove = function (evt) {
    var identifier = (evt.identifier !== undefined ?
        evt.identifier :
        evt.pointerId) || 0;
    var nipple = this.nipples.get(identifier);

    if (!nipple) {
        console.error('MOVE: Couldn\'t find the nipple n°' + identifier + '.');
        console.error(this.nipples);
        return;
    }

    var size = nipple.options.size / 2;
    var pos = {
        x: evt.pageX,
        y: evt.pageY
    };

    var dist = u.distance(pos, nipple.position);
    var angle = u.angle(pos, nipple.position);
    var rAngle = u.radians(angle);
    var force = dist / size;

    if (dist > size) {
        dist = size;
        pos = u.findCoord(nipple.position, dist, angle);
    }

    nipple.frontPosition = {
        x: pos.x - nipple.position.x,
        y: pos.y - nipple.position.y
    };

    if (!this.nippleOptions.dataOnly) {
        u.applyPosition(nipple.ui.front, nipple.frontPosition);
    }

    var toSend = {
        identifier: nipple.identifier,
        position: pos,
        force: force,
        pressure: evt.force || evt.pressure || evt.webkitForce || 0,
        distance: dist,
        angle: {
            radian: rAngle,
            degree: angle
        },
        instance: nipple
    };

    toSend = nipple.computeDirection(toSend);

    // Offset angles to follow units circle.
    toSend.angle = {
        radian: u.radians(180 - angle),
        degree: 180 - angle
    };

    nipple.trigger('move', toSend);
    this.trigger('move ' + identifier + ':move', toSend);
    return toSend;
};

Manager.prototype.onend = function (evt) {
    evt = u.prepareEvent(evt);

    if (evt.length && this.options.multitouch) {
        for (var i = 0, max = evt.length; i < max; i += 1) {
            this.processOnEnd(evt[i]);
        }
    } else {
        this.processOnEnd(evt[0] || evt);
    }

    if (!this.nipples.length || this.options.mode !== 'dynamic') {
        this.unbindEvt(document, 'move')
            .unbindEvt(document, 'end');
        this.started = false;
    }

    return false;
};

Manager.prototype.processOnEnd = function (evt) {
    var identifier = (evt.identifier !== undefined ?
        evt.identifier :
        evt.pointerId) || 0;
    var self = this;
    var nipple = self.nipples.get(identifier);

    if (!nipple) {
        console.error('END: Couldn\'t find the nipple n°' + identifier + '.');
        console.error(self.nipples);
        return;
    }

    if (!this.nippleOptions.dataOnly) {
        nipple.hide(function () {
            if (self.options.mode === 'dynamic') {
                nipple.trigger('removed', nipple);
                self.trigger('removed ' + identifier + ':removed', nipple);
                nipple.destroy();
            }
        });
    }

    // Clear the pressure interval reader
    clearInterval(self.pressureIntervals[identifier]);

    nipple.trigger('end', nipple);
    self.trigger('end ' + identifier + ':end', nipple);

    if (this.options.mode === 'dynamic') {
        this.nipples.splice(this.nipples.indexOf(nipple), 1);
    }
};

// Remove destroyed nipple from the list
Manager.prototype.ondestroyed = function(evt, nipple) {
    if (this.nipples.indexOf(nipple) < 0) {
        return false;
    }
    this.nipples.splice(this.nipples.indexOf(nipple), 1);
};

// Cleanly destroy the manager
Manager.prototype.destroy = function () {
    this.unbindEvt(this.options.zone, 'start');
    this.unbindEvt(document, 'move');
    this.unbindEvt(document, 'end');
    this.nipples.forEach(function(nipple) {
        nipple.destroy();
    });
    for (var i in this.pressureIntervals) {
        if (this.pressureIntervals.hasOwnProperty(i)) {
            clearInterval(this.pressureIntervals[i]);
        }
    }
    this.off();
};
