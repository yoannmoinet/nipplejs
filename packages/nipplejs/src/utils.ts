import type {
    AnyPosition,
    Coordinates,
    DomEvent,
    ProcessedEvent,
    SupportedElement,
    SupportedEvent,
    SupportedEventHandler,
} from './types';

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

// Reconciliation layer for MouseEvent, TouchEvent and PointerEvent.
// It will ease the process later down the line.
export const processEvents = (evt: SupportedEvent): DomEvent[] => {
    // Prevent the browser default action.
    evt.preventDefault();

    // Prepare arrays of initial events.
    const domEvents: ProcessedEvent[] = [];
    // TouchEvent may have multitouches, split them out in an array.
    if ('changedTouches' in evt) {
        // evt.changedTouches doesn't really offer a nice iterable interface.
        for (let i = 0; i < evt.changedTouches.length; i += 1) {
            const touch = evt.changedTouches.item(i);
            if (touch) {
                domEvents.push(touch);
            }
        }
    } else {
        domEvents.push(evt);
    }

    // Will return an array of events, based on touches, pointer or mouse data.
    return domEvents.map<DomEvent>((domEvt) => {
        return processEvent(evt, domEvt);
    });
};

export const getPressureFromEvt = (evt: ProcessedEvent): number => {
    // Compute the pressure data.
    return 'force' in evt // Pressure on iOS 3D Touch.
        ? evt.force
        : 'pressure' in evt // Pressure on Pointers.
          ? evt.pressure
          : 'webkitForce' in evt // Pressure on trackpads.
            ? (evt.webkitForce as number)
            : 'buttons' in evt // Id of the mouse button pressed. 0 is none, 1 is left, 2 is right, ...
              ? evt.buttons !== 0
                  ? 1
                  : 0
              : 0;
};

export const processEvent = (evt: SupportedEvent, processedEvt: ProcessedEvent): DomEvent => {
    // Compute identifier of the event.
    // It's especially important for touches,
    // to track the correct touch in a multitouch interaction.
    const identifier: number =
        'identifier' in processedEvt
            ? processedEvt.identifier
            : 'pointerId' in processedEvt
              ? processedEvt.pointerId
              : 0 || 0;

    // This is only what we need, to normalize the interaction event.
    // Everything else is based off this data.
    return {
        identifier,
        isTouch: 'touches' in evt || 'changedTouches' in evt,
        position: {
            x: processedEvt.pageX,
            y: processedEvt.pageY,
        },
        pressure: getPressureFromEvt(processedEvt),
        type: evt.type,
        initial: evt,
        raw: processedEvt,
    };
};

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
export const applyPosition = (el: HTMLElement, pos: AnyPosition): void => {
    const { left, top, right, bottom, x, y } = pos;
    if (top || right || bottom || left) {
        extend(el.style, { top, right, bottom, left });
    } else if (!isNaN(x || 0) || !isNaN(y || 0)) {
        extend(el.style, { left: `${x || 0}px`, top: `${y || 0}px` });
    }
};

/**
 * Configure a style property object with vendor prefixes.
 * @param {string} prop - The property to configure.
 * @returns {Record<string, string>} The configured style property object.
 */
export const configStylePropertyObject = (
    prop: string,
    value: string = '',
): Record<string, string> => {
    const obj: Record<string, string> = {
        [prop]: value,
    };
    const newProp = prop.charAt(0).toUpperCase() + prop.slice(1);
    // Apply the vendor prefixes.
    ['webkit', 'Moz', 'o'].forEach((vendor) => {
        obj[`${vendor}${newProp}`] = value;
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
 * @param {Coordinates} joystickPos - The position of the joystick.
 * @param {number} size - The size of the range.
 * @returns {Coordinates} The clamped position.
 */
// TODO: Verify this calculation.
export const clamp = (pos: Coordinates, joystickPos: Coordinates, size: number): Coordinates => ({
    //                          left-clamping          right-clamping
    x: Math.min(Math.max(pos.x, joystickPos.x - size), joystickPos.x + size),
    //                          top-clamping           bottom-clamping
    y: Math.min(Math.max(pos.y, joystickPos.y - size), joystickPos.y + size),
});
