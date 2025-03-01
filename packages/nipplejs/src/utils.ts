import type { Coordinates, CssPosition, SupportedElement, SupportedEventHandler } from './types';

/**
 * Calculate the distance between two points.
 * @param {Coordinates} p1 - The first point.
 * @param {Coordinates} p2 - The second point.
 * @returns {number} The distance between the two points.
 */
export const distance = (p1: Coordinates, p2: Coordinates): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate the angle between two points in degrees.
 * @param {Coordinates} p1 - The first point.
 * @param {Coordinates} p2 - The second point.
 * @returns {number} The angle between the two points in degrees.
 */
export const angle = (p1: Coordinates, p2: Coordinates): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return degrees(Math.atan2(dy, dx));
};

/**
 * Find the coordinates of a point given a distance and angle from another point.
 * @param {Coordinates} p - The starting point.
 * @param {number} d - The distance from the starting point.
 * @param {number} a - The angle from the starting point in degrees.
 * @returns {Coordinates} The coordinates of the new point.
 */
export const findCoord = (p: Coordinates, d: number, a: number): Coordinates => {
    const b: Coordinates = { x: 0, y: 0 };
    const aInRad = radians(a);
    b.x = p.x - d * Math.cos(aInRad);
    b.y = p.y - d * Math.sin(aInRad);
    return b;
};

/**
 * Convert degrees to radians.
 * @param {number} a - The angle in degrees.
 * @returns {number} The angle in radians.
 */
export const radians = (a: number): number => {
    return a * (Math.PI / 180);
};

/**
 * Convert radians to degrees.
 * @param {number} a - The angle in radians.
 * @returns {number} The angle in degrees.
 */
export const degrees = (a: number): number => {
    return a * (180 / Math.PI);
};

/**
 * Check if a mouse, touch, or pointer event is pressed.
 * @param {SupportedEvent} evt - The event to check.
 * @returns {boolean} True if the event is pressed, false otherwise.
 */
// export const isPressed = (evt: SupportedEvent): boolean => {
//     if (isNaN(evt.buttons)) {
//         return evt.pressure !== 0;
//     }
//     return evt.buttons !== 0;
// };

const timers = new Map<() => void, number>();
/**
 * Throttle a function to be called at most once every 100 milliseconds.
 * @param {() => void} cb - The function to throttle.
 */
export const throttle = (cb: () => void): void => {
    if (timers.has(cb)) {
        clearTimeout(timers.get(cb));
    }
    timers.set(cb, setTimeout(cb, 100) as unknown as number);
};

/**
 * Bind an event listener to an element.
 * @param {SupportedElement} el - The element to bind the event listener to.
 * @param {string} arg - The event type(s) to bind the event listener to.
 * @param {SupportedEventHandler} handler - The event listener to bind.
 */
export const bindEvt = (
    el: SupportedElement,
    arg: string,
    handler: SupportedEventHandler,
): void => {
    const types = arg.split(/[ ,]+/g);
    let type;
    for (let i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.addEventListener) {
            el.addEventListener(type, handler as EventListenerOrEventListenerObject, false);
        } else if ((el as any).attachEvent) {
            (el as any).attachEvent(type, handler);
        }
    }
};

/**
 * Unbind an event listener from an element.
 * @param {SupportedElement} el - The element to unbind the event listener from.
 * @param {string} arg - The event type(s) to unbind the event listener from.
 * @param {SupportedEventHandler} handler - The event listener to unbind.
 */
export const unbindEvt = (
    el: SupportedElement,
    arg: string,
    handler: SupportedEventHandler,
): void => {
    const types = arg.split(/[ ,]+/g);
    let type;
    for (let i = 0; i < types.length; i += 1) {
        type = types[i];
        if (el.removeEventListener) {
            el.removeEventListener(type, handler as EventListenerOrEventListenerObject);
        } else if ((el as any).detachEvent) {
            (el as any).detachEvent(type, handler);
        }
    }
};

/**
 * Trigger a custom event on an element.
 * @param {HTMLElement} el - The element to trigger the event on.
 * @param {string} type - The type of event to trigger.
 * @param {any} data - The data to pass to the event.
 */
export const trigger = (el: HTMLElement, type: string, data: any): void => {
    const evt = new CustomEvent(type, data);
    el.dispatchEvent(evt);
};

/**
 * Prepare an event for processing.
 * @param {MouseEvent | TouchEvent} evt - The event to prepare.
 * @returns {TouchList | MouseEvent} The prepared event.
 */
// export const prepareEvent = (evt: MouseEvent | TouchEvent): TouchList | MouseEvent => {
//     evt.preventDefault();
//     return evt.type.match(/^touch/) ? (evt as TouchEvent).changedTouches : (evt as MouseEvent);
// };

/**
 * Get the current scroll position of the window.
 * @returns {Coordinates} The current scroll position of the window.
 */
export const getScroll = (): Coordinates => {
    const x =
        window.pageXOffset !== undefined
            ? window.pageXOffset
            : (document.documentElement || document.body.parentNode || document.body).scrollLeft;

    const y =
        window.pageYOffset !== undefined
            ? window.pageYOffset
            : (document.documentElement || document.body.parentNode || document.body).scrollTop;
    return {
        x,
        y,
    };
};

/**
 * Apply a position to an element.
 * @param {HTMLElement} el - The element to apply the position to.
 * @param {Coordinates} pos - The position to apply.
 */
export const applyPosition = (el: HTMLElement, pos: Coordinates | CssPosition): void => {
    const { left, top, right, bottom, x, y } = pos as Coordinates & CssPosition;
    if (top || right || bottom || left) {
        el.style.top = top;
        el.style.right = right;
        el.style.bottom = bottom;
        el.style.left = left;
    } else if (!isNaN(x) || !isNaN(y)) {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    }
};

/**
 * Get the transition style for a property.
 * @param {string} property - The property to get the transition style for.
 * @param {string | string[]} values - The values to transition to.
 * @param {string} time - The duration of the transition.
 * @returns {Record<string, string>} The transition style for the property.
 */
export const getTransitionStyle = (
    property: string,
    values: string | string[],
    time: string,
): Record<string, string> => {
    const obj = configStylePropertyObject(property);
    for (const i in obj) {
        if (Object.hasOwn(obj, i)) {
            if (typeof values === 'string') {
                obj[i] = `${values} ${time}`;
            } else {
                let st = '';
                for (let j = 0, max = values.length; j < max; j += 1) {
                    st += `${values[j]} ${time}, `;
                }
                obj[i] = st.slice(0, -2);
            }
        }
    }
    return obj;
};

/**
 * Get the vendor style for a property.
 * @param {string} property - The property to get the vendor style for.
 * @param {string} value - The value to set for the property.
 * @returns {Record<string, string>} The vendor style for the property.
 */
export const getVendorStyle = (property: string, value: string): Record<string, string> => {
    const obj = configStylePropertyObject(property);
    for (const i in obj) {
        if (Object.hasOwn(obj, i)) {
            obj[i] = value;
        }
    }
    return obj;
};

/**
 * Configure a style property object with vendor prefixes.
 * @param {string} prop - The property to configure.
 * @returns {Record<string, string>} The configured style property object.
 */
export const configStylePropertyObject = (prop: string): Record<string, string> => {
    const obj: Record<string, string> = {};
    obj[prop] = '';
    const vendors = ['webkit', 'Moz', 'o'];
    vendors.forEach((vendor) => {
        obj[vendor + prop.charAt(0).toUpperCase() + prop.slice(1)] = '';
    });
    return obj;
};

/**
 * Extend an object with the properties of another object.
 * @param {T} objA - The object to extend.
 * @param {Partial<T>} objB - The object to extend with.
 * @returns {T} The extended object.
 */
export const extend = <T extends object>(objA: T, objB: Partial<T>): T => {
    for (const i in objB) {
        if (Object.hasOwn(objB, i)) {
            objA[i as keyof T] = objB[i] as T[keyof T];
        }
    }
    return objA;
};

/**
 * Safely extend an object with the properties of another object, overwrite only what's already present
 * @param {T} objA - The object to extend.
 * @param {Partial<T>} objB - The object to extend with.
 * @returns {T} The extended object.
 */
export const safeExtend = <T extends object>(objA: T, objB: Partial<T>): T => {
    const obj: Partial<T> = {};
    for (const i in objA) {
        if (Object.hasOwn(objA, i) && Object.hasOwn(objB, i)) {
            obj[i as keyof T] = objB[i] as T[keyof T];
        } else if (Object.hasOwn(objA, i)) {
            obj[i as keyof T] = objA[i];
        }
    }
    return obj as T;
};

/**
 * Map a function over an array or a single item.
 * @param {T[] | T} ar - The array or item to map over.
 * @param {(item: T) => void} fn - The function to map.
 */
export const map = <T>(ar: T[] | T, fn: (item: T) => void): void => {
    if (Array.isArray(ar)) {
        for (let i = 0, max = ar.length; i < max; i += 1) {
            fn(ar[i]);
        }
    } else {
        fn(ar);
    }
};

/**
 * Clamp a position within a range.
 * @param {Coordinates} pos - The position to clamp.
 * @param {Coordinates} nipplePos - The position of the nipple.
 * @param {number} size - The size of the range.
 * @returns {Coordinates} The clamped position.
 */
export const clamp = (pos: Coordinates, nipplePos: Coordinates, size: number): Coordinates => ({
    //                          left-clamping        right-clamping
    x: Math.min(Math.max(pos.x, nipplePos.x - size), nipplePos.x + size),
    //                          top-clamping         bottom-clamping
    y: Math.min(Math.max(pos.y, nipplePos.y - size), nipplePos.y + size),
});
