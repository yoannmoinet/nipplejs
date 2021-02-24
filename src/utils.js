///////////////////////
///      UTILS      ///
///////////////////////

export const distance = (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return Math.sqrt((dx * dx) + (dy * dy));
};

export const angle = (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return degrees(Math.atan2(dy, dx));
};

export const findCoord = (p, d, a) => {
    const b = {x: 0, y: 0};
    a = radians(a);
    b.x = p.x - d * Math.cos(a);
    b.y = p.y - d * Math.sin(a);
    return b;
};

export const radians = (a) => {
    return a * (Math.PI / 180);
};

export const degrees = (a) => {
    return a * (180 / Math.PI);
};

export const isPressed = (evt) => {
    if (isNaN(evt.buttons)) {
        return evt.pressure !== 0;
    }
    return evt.buttons !== 0;
};

const timers = new Map();
export const throttle = (cb) => {
    if (timers.has(cb)) {
        clearTimeout(timers.get(cb));
    }
    timers.set(cb, setTimeout(cb, 100));
};

export const bindEvt = (el, arg, handler) => {
    const types = arg.split(/[ ,]+/g);
    let type;
    for (let i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.addEventListener) {
            el.addEventListener(type, handler, false);
        } else if (el.attachEvent) {
            el.attachEvent(type, handler);
        }
    }
};

export const unbindEvt = (el, arg, handler) => {
    const types = arg.split(/[ ,]+/g);
    let type;
    for (let i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.removeEventListener) {
            el.removeEventListener(type, handler);
        } else if (el.detachEvent) {
            el.detachEvent(type, handler);
        }
    }
};

export const trigger = (el, type, data) => {
    const evt = new CustomEvent(type, data);
    el.dispatchEvent(evt);
};

export const prepareEvent = (evt) => {
    evt.preventDefault();
    return evt.type.match(/^touch/) ? evt.changedTouches : evt;
};

export const getScroll = () => {
    const x = (window.pageXOffset !== undefined) ?
        window.pageXOffset :
        (document.documentElement || document.body.parentNode || document.body)
            .scrollLeft;

    const y = (window.pageYOffset !== undefined) ?
        window.pageYOffset :
        (document.documentElement || document.body.parentNode || document.body)
            .scrollTop;
    return {
        x: x,
        y: y
    };
};

export const applyPosition = (el, pos) => {
    if (pos.top || pos.right || pos.bottom || pos.left) {
        el.style.top = pos.top;
        el.style.right = pos.right;
        el.style.bottom = pos.bottom;
        el.style.left = pos.left;
    } else {
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
    }
};

export const getTransitionStyle = (property, values, time) => {
    const obj = configStylePropertyObject(property);
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (typeof values === 'string') {
                obj[i] = values + ' ' + time;
            } else {
                let st = '';
                for (let j = 0, max = values.length; j < max; j += 1) {
                    st += values[j] + ' ' + time + ', ';
                }
                obj[i] = st.slice(0, -2);
            }
        }
    }
    return obj;
};

export const getVendorStyle = (property, value) => {
    const obj = configStylePropertyObject(property);
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            obj[i] = value;
        }
    }
    return obj;
};

export const configStylePropertyObject = (prop) => {
    const obj = {};
    obj[prop] = '';
    const vendors = ['webkit', 'Moz', 'o'];
    vendors.forEach(function (vendor) {
        obj[vendor + prop.charAt(0).toUpperCase() + prop.slice(1)] = '';
    });
    return obj;
};

export const extend = (objA, objB) => {
    for (let i in objB) {
        if (objB.hasOwnProperty(i)) {
            objA[i] = objB[i];
        }
    }
    return objA;
};

// Overwrite only what's already present
export const safeExtend = (objA, objB) => {
    const obj = {};
    for (let i in objA) {
        if (objA.hasOwnProperty(i) && objB.hasOwnProperty(i)) {
            obj[i] = objB[i];
        } else if (objA.hasOwnProperty(i)) {
            obj[i] = objA[i];
        }
    }
    return obj;
};

// Map for array or unique item.
export const map = (ar, fn) => {
    if (ar.length) {
        for (let i = 0, max = ar.length; i < max; i += 1) {
            fn(ar[i]);
        }
    } else {
        fn(ar);
    }
};

// Clamp position within the range
export const clamp = (pos, nipplePos, size) => ({
    //                          left-clamping        right-clamping
    x: Math.min(Math.max(pos.x, nipplePos.x - size), nipplePos.x + size),
    //                          top-clamping         bottom-clamping
    y: Math.min(Math.max(pos.y, nipplePos.y - size), nipplePos.y + size)
});
