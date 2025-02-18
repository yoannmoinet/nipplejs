import Nipple from './nipple';
import Super from './super';
import * as u from './utils';

///////////////////////////
///   THE COLLECTION    ///
///////////////////////////

function Collection (manager, options) {
    var self = this;
    self.nipples = [];
    self.idles = [];
    self.actives = [];
    self.ids = [];
    self.pressureIntervals = {};
    self.manager = manager;
    self.id = Collection.id;
    Collection.id += 1;

    // Defaults
    self.defaults = {
        zone: document.body,
        multitouch: false,
        maxNumberOfNipples: 10,
        mode: 'dynamic',
        position: {top: 0, left: 0},
        catchDistance: 200,
        size: 100,
        threshold: 0.1,
        color: 'white',
        fadeTime: 250,
        dataOnly: false,
        restJoystick: true,
        restOpacity: 0.5,
        lockX: false,
        lockY: false,
        shape: 'circle',
        dynamicPage: false,
        follow: false
    };

    self.config(options);

    // Overwrites
    if (self.options.mode === 'static' || self.options.mode === 'semi') {
        self.options.multitouch = false;
    }

    if (!self.options.multitouch) {
        self.options.maxNumberOfNipples = 1;
    }
    const computedStyle = getComputedStyle(self.options.zone.parentElement);
    if (computedStyle && computedStyle.display === 'flex') {
        self.parentIsFlex = true;
    }

    self.updateBox();
    self.prepareNipples();
    self.bindings();
    self.begin();

    return self.nipples;
}

Collection.prototype = new Super();
Collection.constructor = Collection;
Collection.id = 0;

Collection.prototype.prepareNipples = function () {
    var self = this;
    var nips = self.nipples;

    // Public API Preparation.
    nips.on = self.on.bind(self);
    nips.off = self.off.bind(self);
    nips.options = self.options;
    nips.destroy = self.destroy.bind(self);
    nips.ids = self.ids;
    nips.id = self.id;
    nips.processOnMove = self.processOnMove.bind(self);
    nips.processOnEnd = self.processOnEnd.bind(self);
    nips.get = function (id) {
        if (id === undefined) {
            return nips[0];
        }
        for (var i = 0, max = nips.length; i < max; i += 1) {
            if (nips[i].identifier === id) {
                return nips[i];
            }
        }
        return false;
    };
};

Collection.prototype.bindings = function () {
    var self = this;
    // Touch start event.
    self.bindEvt(self.options.zone, 'start');
    // Avoid native touch actions (scroll, zoom etc...) on the zone.
    self.options.zone.style.touchAction = 'none';
    self.options.zone.style.msTouchAction = 'none';
};

Collection.prototype.begin = function () {
    var self = this;
    var opts = self.options;

    // We place our static nipple
    // if needed.
    if (opts.mode === 'static') {
        var nipple = self.createNipple(
            opts.position,
            self.manager.getIdentifier()
        );
        // Add it to the dom.
        nipple.add();
        // Store it in idles.
        self.idles.push(nipple);
    }
};

// Nipple Factory
Collection.prototype.createNipple = function (position, identifier) {
    var self = this;
    var scroll = self.manager.scroll;
    var toPutOn = {};
    var opts = self.options;
    var offset = {
        x: self.parentIsFlex ? scroll.x : (scroll.x + self.box.left),
        y: self.parentIsFlex ? scroll.y : (scroll.y + self.box.top)
    };

    if (position.x && position.y) {
        toPutOn = {
            x: position.x - offset.x,
            y: position.y - offset.y
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

        opts.zone.appendChild(dumb);
        var dumbBox = dumb.getBoundingClientRect();
        opts.zone.removeChild(dumb);

        toPutOn = position;
        position = {
            x: dumbBox.left + scroll.x,
            y: dumbBox.top + scroll.y
        };
    }

    var nipple = new Nipple(self, {
        color: opts.color,
        size: opts.size,
        threshold: opts.threshold,
        fadeTime: opts.fadeTime,
        dataOnly: opts.dataOnly,
        restJoystick: opts.restJoystick,
        restOpacity: opts.restOpacity,
        mode: opts.mode,
        identifier: identifier,
        position: position,
        zone: opts.zone,
        frontPosition: {
            x: 0,
            y: 0
        },
        shape: opts.shape
    });

    if (!opts.dataOnly) {
        u.applyPosition(nipple.ui.el, toPutOn);
        u.applyPosition(nipple.ui.front, nipple.frontPosition);
    }
    self.nipples.push(nipple);
    self.trigger('added ' + nipple.identifier + ':added', nipple);
    self.manager.trigger('added ' + nipple.identifier + ':added', nipple);

    self.bindNipple(nipple);

    return nipple;
};

Collection.prototype.updateBox = function () {
    var self = this;
    self.box = self.options.zone.getBoundingClientRect();
};

Collection.prototype.bindNipple = function (nipple) {
    var self = this;
    var type;
    // Bubble up identified events.
    var handler = function (evt, data) {
        // Identify the event type with the nipple's id.
        type = evt.type + ' ' + data.id + ':' + evt.type;
        self.trigger(type, data);
    };

    // When it gets destroyed.
    nipple.on('destroyed', self.onDestroyed.bind(self));

    // Other events that will get bubbled up.
    nipple.on('shown hidden rested dir plain', handler);
    nipple.on('dir:up dir:right dir:down dir:left', handler);
    nipple.on('plain:up plain:right plain:down plain:left', handler);
};

Collection.prototype.pressureFn = function (touch, nipple, identifier) {
    var self = this;
    var previousPressure = 0;
    clearInterval(self.pressureIntervals[identifier]);
    // Create an interval that will read the pressure every 100ms
    self.pressureIntervals[identifier] = setInterval(function () {
        var pressure = touch.force || touch.pressure ||
            touch.webkitForce || 0;
        if (pressure !== previousPressure) {
            nipple.trigger('pressure', pressure);
            self.trigger('pressure ' +
                nipple.identifier + ':pressure', pressure);
            previousPressure = pressure;
        }
    }.bind(self), 100);
};

Collection.prototype.onstart = function (evt) {
    var self = this;
    var opts = self.options;
    var origEvt = evt;
    evt = u.prepareEvent(evt);

    // Update the box position
    self.updateBox();

    var process = function (touch) {
        // If we can create new nipples
        // meaning we don't have more active nipples than we should.
        if (self.actives.length < opts.maxNumberOfNipples) {
            self.processOnStart(touch);
        }
        else if(origEvt.type.match(/^touch/)){
            // zombies occur when end event is not received on Safari
            // first touch removed before second touch, we need to catch up...
            // so remove where touches in manager that no longer exist
            Object.keys(self.manager.ids).forEach(function(k){
                if(Object.values(origEvt.touches).findIndex(function(t){return t.identifier===k;}) < 0){
                    // manager has id that doesn't exist in touches
                    var e = [evt[0]];
                    e.identifier = k;
                    self.processOnEnd(e);
                }
            });
            if(self.actives.length < opts.maxNumberOfNipples){
                self.processOnStart(touch);
            }
        }
    };

    u.map(evt, process);

    // We ask upstream to bind the document
    // on 'move' and 'end'
    self.manager.bindDocument();
    return false;
};

Collection.prototype.processOnStart = function (evt) {
    var self = this;
    var opts = self.options;
    var indexInIdles;
    var identifier = self.manager.getIdentifier(evt);
    var pressure = evt.force || evt.pressure || evt.webkitForce || 0;
    var position = {
        x: evt.pageX,
        y: evt.pageY
    };

    var nipple = self.getOrCreate(identifier, position);

    // Update its touch identifier
    if (nipple.identifier !== identifier) {
        self.manager.removeIdentifier(nipple.identifier);
    }
    nipple.identifier = identifier;

    var process = function (nip) {
        // Trigger the start.
        nip.trigger('start', nip);
        self.trigger('start ' + nip.id + ':start', nip);

        nip.show();
        if (pressure > 0) {
            self.pressureFn(evt, nip, nip.identifier);
        }
        // Trigger the first move event.
        self.processOnMove(evt);
    };

    // Transfer it from idles to actives.
    if ((indexInIdles = self.idles.indexOf(nipple)) >= 0) {
        self.idles.splice(indexInIdles, 1);
    }

    // Store the nipple in the actives array
    self.actives.push(nipple);
    self.ids.push(nipple.identifier);

    if (opts.mode !== 'semi') {
        process(nipple);
    } else {
        // In semi we check the distance of the touch
        // to decide if we have to reset the nipple
        var distance = u.distance(position, nipple.position);
        if (distance <= opts.catchDistance) {
            process(nipple);
        } else {
            nipple.destroy();
            self.processOnStart(evt);
            return;
        }
    }

    return nipple;
};

Collection.prototype.getOrCreate = function (identifier, position) {
    var self = this;
    var opts = self.options;
    var nipple;

    // If we're in static or semi, we might already have an active.
    if (/(semi|static)/.test(opts.mode)) {
        // Get the active one.
        // TODO: Multi-touche for semi and static will start here.
        // Return the nearest one.
        nipple = self.idles[0];
        if (nipple) {
            self.idles.splice(0, 1);
            return nipple;
        }

        if (opts.mode === 'semi') {
            // If we're in semi mode, we need to create one.
            return self.createNipple(position, identifier);
        }

        // eslint-disable-next-line no-console
        console.warn('Coudln\'t find the needed nipple.');
        return false;
    }
    // In dynamic, we create a new one.
    nipple = self.createNipple(position, identifier);
    return nipple;
};

Collection.prototype.processOnMove = function (evt) {
    var self = this;
    var opts = self.options;
    var identifier = self.manager.getIdentifier(evt);
    var nipple = self.nipples.get(identifier);
    var scroll = self.manager.scroll;

    // If we're moving without pressing
    // it's that we went out the active zone
    if (!u.isPressed(evt)) {
        this.processOnEnd(evt);
        return;
    }

    if (!nipple) {
        // This is here just for safety.
        // It shouldn't happen.
        // eslint-disable-next-line no-console
        console.error('Found zombie joystick with ID ' + identifier);
        self.manager.removeIdentifier(identifier);
        return;
    }

    if (opts.dynamicPage) {
        var elBox = nipple.el.getBoundingClientRect();
        nipple.position = {
            x: scroll.x + elBox.left,
            y: scroll.y + elBox.top
        };
    }

    nipple.identifier = identifier;

    var size = nipple.options.size / 2;
    var pos = {
        x: evt.pageX,
        y: evt.pageY
    };

    if (opts.lockX){
        pos.y = nipple.position.y;
    }
    if (opts.lockY) {
        pos.x = nipple.position.x;
    }

    var dist = u.distance(pos, nipple.position);
    var angle = u.angle(pos, nipple.position);
    var rAngle = u.radians(angle);
    var force = dist / size;

    var raw = {
        distance: dist,
        position: pos
    };

    // Clamp the position
    var clamped_dist;
    var clamped_pos;
    if (nipple.options.shape === 'circle') {
        // Clamp to a circle
        clamped_dist = Math.min(dist, size);
        clamped_pos = u.findCoord(nipple.position, clamped_dist, angle);
    } else {
        // Clamp to a square
        clamped_pos = u.clamp(pos, nipple.position, size);
        clamped_dist = u.distance(clamped_pos, nipple.position);
    }

    if (opts.follow) {
        // follow behaviour
        if (dist > size) {
            let delta_x = pos.x - clamped_pos.x;
            let delta_y = pos.y - clamped_pos.y;
            nipple.position.x += delta_x;
            nipple.position.y += delta_y;
            nipple.el.style.top = (nipple.position.y - (self.box.top + scroll.y)) + 'px';
            nipple.el.style.left = (nipple.position.x - (self.box.left + scroll.x)) + 'px';

            dist = u.distance(pos, nipple.position);
        }
    } else {
        // clamp behaviour
        pos = clamped_pos;
        dist = clamped_dist;
    }

    var xPosition = pos.x - nipple.position.x;
    var yPosition = pos.y - nipple.position.y;

    nipple.frontPosition = {
        x: xPosition,
        y: yPosition
    };

    if (!opts.dataOnly) {
        nipple.ui.front.style.transform = 'translate(' + xPosition + 'px,' + yPosition + 'px)';
    }

    // Prepare event's datas.
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
        vector: {
            x: xPosition / size,
            y: - yPosition / size
        },
        raw: raw,
        instance: nipple,
        lockX: opts.lockX,
        lockY: opts.lockY
    };

    // Compute the direction's datas.
    toSend = nipple.computeDirection(toSend);

    // Offset angles to follow units circle.
    toSend.angle = {
        radian: u.radians(180 - angle),
        degree: 180 - angle
    };

    // Send everything to everyone.
    nipple.trigger('move', toSend);
    self.trigger('move ' + nipple.id + ':move', toSend);
};

Collection.prototype.processOnEnd = function (evt) {
    var self = this;
    var opts = self.options;
    var identifier = self.manager.getIdentifier(evt);
    var nipple = self.nipples.get(identifier);
    var removedIdentifier = self.manager.removeIdentifier(nipple.identifier);

    if (!nipple) {
        return;
    }

    if (!opts.dataOnly) {
        nipple.hide(function () {
            if (opts.mode === 'dynamic') {
                nipple.trigger('removed', nipple);
                self.trigger('removed ' + nipple.id + ':removed', nipple);
                self.manager
                    .trigger('removed ' + nipple.id + ':removed', nipple);
                nipple.destroy();
            }
        });
    }

    // Clear the pressure interval reader
    clearInterval(self.pressureIntervals[nipple.identifier]);

    // Reset the direciton of the nipple, to be able to trigger a new direction
    // on start.
    nipple.resetDirection();

    nipple.trigger('end', nipple);
    self.trigger('end ' + nipple.id + ':end', nipple);

    // Remove identifier from our bank.
    if (self.ids.indexOf(nipple.identifier) >= 0) {
        self.ids.splice(self.ids.indexOf(nipple.identifier), 1);
    }

    // Clean our actives array.
    if (self.actives.indexOf(nipple) >= 0) {
        self.actives.splice(self.actives.indexOf(nipple), 1);
    }

    if (/(semi|static)/.test(opts.mode)) {
        // Transfer nipple from actives to idles
        // if we're in semi or static mode.
        self.idles.push(nipple);
    } else if (self.nipples.indexOf(nipple) >= 0) {
        // Only if we're not in semi or static mode
        // we can remove the instance.
        self.nipples.splice(self.nipples.indexOf(nipple), 1);
    }

    // We unbind move and end.
    self.manager.unbindDocument();

    // We add back the identifier of the idle nipple;
    if (/(semi|static)/.test(opts.mode)) {
        self.manager.ids[removedIdentifier.id] = removedIdentifier.identifier;
    }
};

// Remove destroyed nipple from the lists
Collection.prototype.onDestroyed = function(evt, nipple) {
    var self = this;
    if (self.nipples.indexOf(nipple) >= 0) {
        self.nipples.splice(self.nipples.indexOf(nipple), 1);
    }
    if (self.actives.indexOf(nipple) >= 0) {
        self.actives.splice(self.actives.indexOf(nipple), 1);
    }
    if (self.idles.indexOf(nipple) >= 0) {
        self.idles.splice(self.idles.indexOf(nipple), 1);
    }
    if (self.ids.indexOf(nipple.identifier) >= 0) {
        self.ids.splice(self.ids.indexOf(nipple.identifier), 1);
    }

    // Remove the identifier from our bank
    self.manager.removeIdentifier(nipple.identifier);

    // We unbind move and end.
    self.manager.unbindDocument();
};

// Cleanly destroy the manager
Collection.prototype.destroy = function () {
    var self = this;
    self.unbindEvt(self.options.zone, 'start');

    // Destroy nipples.
    self.nipples.forEach(function(nipple) {
        nipple.destroy();
    });

    // Clean 3DTouch intervals.
    for (var i in self.pressureIntervals) {
        if (self.pressureIntervals.hasOwnProperty(i)) {
            clearInterval(self.pressureIntervals[i]);
        }
    }

    // Notify the manager passing the instance
    self.trigger('destroyed', self.nipples);
    // We unbind move and end.
    self.manager.unbindDocument();
    // Unbind everything.
    self.off();
};

export default Collection;
