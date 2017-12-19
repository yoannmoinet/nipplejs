///////////////////////
///      UTILS      ///
///////////////////////

var u = {};
u.distance = function (p1, p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;

    return Math.sqrt((dx * dx) + (dy * dy));
};

u.angle = function(p1, p2) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;

    return u.degrees(Math.atan2(dy, dx));
};

u.findCoord = function(p, d, a) {
    var b = {x: 0, y: 0};
    a = u.radians(a);
    b.x = p.x - d * Math.cos(a);
    b.y = p.y - d * Math.sin(a);
    return b;
};

u.radians = function(a) {
    return a * (Math.PI / 180);
};

u.degrees = function(a) {
    return a * (180 / Math.PI);
};

u.bindEvt = function (el, arg, handler) {
    var types = arg.split(/[ ,]+/g);
    var type;
    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.addEventListener) {
            el.addEventListener(type, handler, false);
        } else if (el.attachEvent) {
            el.attachEvent(type, handler);
        }
    }
};

u.unbindEvt = function (el, arg, handler) {
    var types = arg.split(/[ ,]+/g);
    var type;
    for (var i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.removeEventListener) {
            el.removeEventListener(type, handler);
        } else if (el.detachEvent) {
            el.detachEvent(type, handler);
        }
    }
};

u.trigger = function (el, type, data) {
    var evt = new CustomEvent(type, data);
    el.dispatchEvent(evt);
};

u.prepareEvent = function (evt) {
    evt.preventDefault();
    return evt.type.match(/^touch/) ? evt.changedTouches : evt;
};

u.getScroll = function () {
    var x = (window.pageXOffset !== undefined) ?
        window.pageXOffset :
        (document.documentElement || document.body.parentNode || document.body)
            .scrollLeft;

    var y = (window.pageYOffset !== undefined) ?
        window.pageYOffset :
        (document.documentElement || document.body.parentNode || document.body)
            .scrollTop;
    return {
        x: x,
        y: y
    };
};

u.applyPosition = function (el, pos) {
    if (pos.x && pos.y) {
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
    } else if (pos.top || pos.right || pos.bottom || pos.left) {
        el.style.top = pos.top;
        el.style.right = pos.right;
        el.style.bottom = pos.bottom;
        el.style.left = pos.left;
    }
};

u.getTransitionStyle = function (property, values, time) {
    var obj = u.configStylePropertyObject(property);
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (typeof values === 'string') {
                obj[i] = values + ' ' + time;
            } else {
                var st = '';
                for (var j = 0, max = values.length; j < max; j += 1) {
                    st += values[j] + ' ' + time + ', ';
                }
                obj[i] = st.slice(0, -2);
            }
        }
    }
    return obj;
};

u.getVendorStyle = function (property, value) {
    var obj = u.configStylePropertyObject(property);
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            obj[i] = value;
        }
    }
    return obj;
};

u.configStylePropertyObject = function (prop) {
    var obj = {};
    obj[prop] = '';
    var vendors = ['webkit', 'Moz', 'o'];
    vendors.forEach(function (vendor) {
        obj[vendor + prop.charAt(0).toUpperCase() + prop.slice(1)] = '';
    });
    return obj;
};

u.extend = function (objA, objB) {
    for (var i in objB) {
        if (objB.hasOwnProperty(i)) {
            objA[i] = objB[i];
        }
    }
    return objA;
};

// Overwrite only what's already present
u.safeExtend = function (objA, objB) {
    var obj = {};
    for (var i in objA) {
        if (objA.hasOwnProperty(i) && objB.hasOwnProperty(i)) {
            obj[i] = objB[i];
        } else if (objA.hasOwnProperty(i)) {
            obj[i] = objA[i];
        }
    }
    return obj;
};

// Map for array or unique item.
u.map = function (ar, fn) {
    if (ar.length) {
        for (var i = 0, max = ar.length; i < max; i += 1) {
            fn(ar[i]);
        }
    } else {
        fn(ar);
    }
};
