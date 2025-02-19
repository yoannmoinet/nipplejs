import Collection from './collection';
import Super from './super';
import type { JoystickManagerOptions } from './types';
import * as u from './utils';

// /////////////////////
// /     MANAGER     ///
// /////////////////////

function Manager(options: JoystickManagerOptions = {}) {
    const self = this;
    self.ids = {};
    self.index = 0;
    self.collections = [];
    self.scroll = u.getScroll();

    self.config(options);
    self.prepareCollections();

    // Listen for resize, to reposition every joysticks
    const resizeHandler = function () {
        self.collections.forEach(function (collection) {
            collection.forEach(function (nipple) {
                const pos = nipple.el.getBoundingClientRect();
                nipple.position = {
                    x: self.scroll.x + pos.left,
                    y: self.scroll.y + pos.top,
                };
            });
        });
    };
    u.bindEvt(window, 'resize', function () {
        u.throttle(resizeHandler);
    });

    // Listen for scrolls, so we have a global scroll value
    // without having to request it all the time.
    const scrollHandler = function () {
        self.scroll = u.getScroll();
    };
    u.bindEvt(window, 'scroll', function () {
        u.throttle(scrollHandler);
    });

    return self.collections;
}

Manager.prototype = new Super();
Manager.constructor = Manager;

Manager.prototype.prepareCollections = function () {
    const self = this;
    // Public API Preparation.
    self.collections.create = self.create.bind(self);
    // Listen to anything
    self.collections.on = self.on.bind(self);
    // Unbind general events
    self.collections.off = self.off.bind(self);
    // Destroy everything
    self.collections.destroy = self.destroy.bind(self);
    // Get any nipple
    self.collections.get = function (id) {
        let nipple;
        // Use .every() to break the loop as soon as found.
        self.collections.every(function (collection) {
            nipple = collection.get(id);
            return !nipple;
        });
        return nipple;
    };
};

Manager.prototype.create = function (options) {
    return this.createCollection(options);
};

// Collection Factory
Manager.prototype.createCollection = function (options) {
    const self = this;
    const collection = new Collection(self, options);

    self.bindCollection(collection);
    self.collections.push(collection);

    return collection;
};

Manager.prototype.bindCollection = function (collection) {
    const self = this;
    let type;
    // Bubble up identified events.
    const handler = function (evt, data) {
        // Identify the event type with the nipple's identifier.
        type = `${evt.type} ${data.id}:${evt.type}`;
        self.trigger(type, data);
    };

    // When it gets destroyed we clean.
    collection.on('destroyed', self.onDestroyed.bind(self));

    // Other events that will get bubbled up.
    collection.on('shown hidden rested dir plain', handler);
    collection.on('dir:up dir:right dir:down dir:left', handler);
    collection.on('plain:up plain:right plain:down plain:left', handler);
};

Manager.prototype.bindDocument = function () {
    const self = this;
    // Bind only if not already binded
    if (!self.binded) {
        self.bindEvt(document, 'move').bindEvt(document, 'end');
        self.binded = true;
    }
};

Manager.prototype.unbindDocument = function (force) {
    const self = this;
    // If there are no touch left
    // unbind the document.
    if (!Object.keys(self.ids).length || force === true) {
        self.unbindEvt(document, 'move').unbindEvt(document, 'end');
        self.binded = false;
    }
};

Manager.prototype.getIdentifier = function (evt) {
    let id;
    // If no event, simple increment
    if (!evt) {
        id = this.index;
    } else {
        // Extract identifier from event object.
        // Unavailable in mouse events so replaced by latest increment.
        id = evt.identifier === undefined ? evt.pointerId : evt.identifier;
        if (id === undefined) {
            id = this.latest || 0;
        }
    }

    if (this.ids[id] === undefined) {
        this.ids[id] = this.index;
        this.index += 1;
    }

    // Keep the latest id used in case we're using an unidentified mouseEvent
    this.latest = id;
    return this.ids[id];
};

Manager.prototype.removeIdentifier = function (identifier) {
    const removed = {};
    for (const id in this.ids) {
        if (this.ids[id] === identifier) {
            removed.id = id;
            removed.identifier = this.ids[id];
            delete this.ids[id];
            break;
        }
    }
    return removed;
};

Manager.prototype.onmove = function (evt) {
    const self = this;
    self.onAny('move', evt);
    return false;
};

Manager.prototype.onend = function (evt) {
    const self = this;
    self.onAny('end', evt);
    return false;
};

Manager.prototype.oncancel = function (evt) {
    const self = this;
    self.onAny('end', evt);
    return false;
};

Manager.prototype.onAny = function (which, evt) {
    const self = this;
    let id;
    const processFn = `processOn${which.charAt(0).toUpperCase()}${which.slice(1)}`;
    evt = u.prepareEvent(evt);
    const processColl = function (e, id, coll) {
        if (coll.ids.indexOf(id) >= 0) {
            coll[processFn](e);
            // Mark the event to avoid cleaning it later.
            e._found_ = true;
        }
    };
    const processEvt = function (e) {
        id = self.getIdentifier(e);
        u.map(self.collections, processColl.bind(null, e, id));
        // If the event isn't handled by any collection,
        // we need to clean its identifier.
        if (!e._found_) {
            self.removeIdentifier(id);
        }
    };

    u.map(evt, processEvt);

    return false;
};

// Cleanly destroy the manager
Manager.prototype.destroy = function () {
    const self = this;
    self.unbindDocument(true);
    self.ids = {};
    self.index = 0;
    self.collections.forEach(function (collection) {
        collection.destroy();
    });
    self.off();
};

// When a collection gets destroyed
// we clean behind.
Manager.prototype.onDestroyed = function (evt, coll) {
    const self = this;
    if (self.collections.indexOf(coll) < 0) {
        return false;
    }
    self.collections.splice(self.collections.indexOf(coll), 1);
};

export default Manager;
