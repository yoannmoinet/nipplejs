///////////////////////
///     MANAGER     ///
///////////////////////

var Manager = function (options) {
    var self = this;
    self.config(options);
    self.nipples = [];
    self.bindEvt(self.options.zone, 'start');

    self.nipples.on = self.on.bind(self);
    self.nipples.off = self.off.bind(self);
    self.nipples.options = self.options;
    self.nipples.get = function (id) {
        for (var i = 0, max = self.nipples.length; i < max; i += 1) {
            if (self.nipples[i].identifier === id) {
                return self.nipples[i];
            }
        }
    };

    return this.nipples;
};

// Extend Super.
Manager.prototype = new Super();

// Configure Manager.
Manager.prototype.config = function (options) {
    this.options = {};
    this.nippleOptions = {};

    // Defaults
    this.options.zone = document.body;
    this.options.multitouch = false;
    this.options.maxNumberOfNipples = 1;
    this.nippleOptions.size = 100;
    this.nippleOptions.threshold = 0.1;
    this.nippleOptions.color = 'white';
    this.nippleOptions.fadeTime = 250;

    // Overwrites
    for (var i in options) {
        if (this.options.hasOwnProperty(i)) {
            this.options[i] = options[i];
        } else if (this.nippleOptions.hasOwnProperty(i)) {
            this.nippleOptions[i] = options[i];
        }
    }

    return this;
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

    // If we have touches and multitouch
    if (evt.length && this.options.multitouch &&
        this.nipples.length < this.options.maxNumberOfNipples) {

        for (var i = 0, max = evt.length; i < max; i += 1) {
            this.processOnStart(evt[i]);
        }
    // if we don't already have a nipple in place.
    } else if (this.nipples.length === 0) {

        this.processOnStart(evt[0] || evt);

    } else {

        return false;

    }

    if (!this.started) {
        this.bindEvt(document, 'move')
            .bindEvt(document, 'end');
        this.started = true;
    }

    return false;
};

Manager.prototype.processOnStart = function (evt) {
    var identifier = (evt.identifier !== undefined ?
        evt.identifier :
        evt.pointerId) || 0;

    if (this.nipples.get(identifier)) {
        return;
    }

    var scroll = u.getScroll();
    var position = {
        x: evt.pageX,
        y: evt.pageY
    };
    var backPosition = {
        x: position.x -
            (scroll.x + this.box.left + this.nippleOptions.size / 2),
        y: position.y -
            (scroll.y + this.box.top + this.nippleOptions.size / 2)
    };
    var frontPosition = {
        x: this.nippleOptions.size / 4,
        y: this.nippleOptions.size / 4
    };
    var nipple = new Nipple(this, {
        color: this.nippleOptions.color,
        size: this.nippleOptions.size,
        threshold: this.nippleOptions.threshold,
        fadeTime: this.nippleOptions.fadeTime,
        identifier: identifier,
        position: position,
        backPosition: backPosition,
        frontPosition: frontPosition
    });

    u.applyPosition(nipple.ui.el, nipple.backPosition);
    u.applyPosition(nipple.ui.front, nipple.frontPosition);

    nipple.show();
    this.nipples.push(nipple);
    this.trigger('added ' + identifier + ':added', nipple);
    nipple.trigger('start', nipple);
    this.trigger('start ' + identifier + ':start', nipple);
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
        x: pos.x - nipple.position.x + nipple.options.size / 4,
        y: pos.y - nipple.position.y + nipple.options.size / 4
    };

    u.applyPosition(nipple.ui.front, nipple.frontPosition);

    var toSend = {
        identifier: nipple.identifier,
        position: pos,
        force: force,
        pressure: evt.force || evt.pressure || evt.webkitForce,
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

    if (!this.nipples.length) {
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
    nipple.hide(function () {
        nipple.trigger('removed', nipple);
        self.trigger('removed ' + identifier + ':removed', nipple);
    });
    nipple.trigger('end', nipple);
    self.trigger('end ' + identifier + ':end', nipple);
    var index = self.nipples.indexOf(nipple);
    self.nipples.splice(index, 1);
};
