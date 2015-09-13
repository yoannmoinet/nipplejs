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
    if (evt.length && this.options.multitouch) {

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
        var toSend = this.nipples[0].pos;
        toSend.nipples = this.nipples;
        this.trigger('start', toSend);
    }

    this.started = true;

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
    var nipple = new Nipple(this, {
        color: this.nippleOptions.color,
        size: this.nippleOptions.size,
        threshold: this.nippleOptions.threshold,
        fadeTime: this.nippleOptions.fadeTime,
        identifier: identifier
    });

    nipple.pos = {
        x: evt.pageX,
        y: evt.pageY
    };

    nipple.backPos = {
        x: nipple.pos.x - (scroll.x + this.box.left + nipple.options.size / 2),
        y: nipple.pos.y - (scroll.y + this.box.top + nipple.options.size / 2)
    };

    u.applyPosition(nipple.ui.el, nipple.backPos);
    u.applyPosition(nipple.ui.front, {
        x: nipple.options.size / 4,
        y: nipple.options.size / 4
    });

    nipple.show();
    this.nipples.push(nipple);
    this.trigger('add', nipple);
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

    toSends[0].nipples = this.nipples;
    this.trigger('move', toSends[0]);
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
    var dist = u.distance(pos, nipple.pos);
    var angle = u.angle(pos, nipple.pos);
    var rAngle = u.radians(angle);
    var force = dist / size;

    if (dist > size) {
        dist = size;
        pos = u.findCoord(nipple.pos, dist, angle);
    }

    u.applyPosition(nipple.ui.front, {
        x: pos.x - nipple.pos.x + nipple.options.size / 4,
        y: pos.y - nipple.pos.y + nipple.options.size / 4
    });

    var toSend = {
        identifier: nipple.identifier,
        position: pos,
        force: force,
        distance: dist,
        angle: {
            radian: rAngle,
            degree: angle
        }
    };

    nipple.computeDirection(toSend);

    // Offset angles to follow units circle.
    toSend.angle = {
        radian: u.radians(180 - angle),
        degree: 180 - angle
    };

    nipple.trigger('move', toSend);
    this.trigger(nipple.identifier + ':move', toSend);
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
            .unbindEvt(document, 'end')
            .trigger('end');
        this.started = false;
    }

    return false;
};

Manager.prototype.processOnEnd = function (evt) {
    var identifier = (evt.identifier !== undefined ?
        evt.identifier :
        evt.pointerId) || 0;
    var nipple = this.nipples.get(identifier);

    if (!nipple) {
        console.error('END: Couldn\'t find the nipple n°' + identifier + '.');
        console.error(this.nipples);
        return;
    }
    var index = this.nipples.indexOf(nipple);
    nipple.hide();
    this.nipples.splice(index, 1);
};
