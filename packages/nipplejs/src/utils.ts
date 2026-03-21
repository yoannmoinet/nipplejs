import type {
    AnyPosition,
    Coordinates,
    DomEvent,
    Identifier,
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
 * Calculate the angle formed by a segment of two points, in degrees.
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
    const aInRad = radians(a);
    return {
        x: p.x - d * Math.cos(aInRad),
        y: p.y - d * Math.sin(aInRad),
    };
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
    for (let i = 0; i < types.length; i += 1) {
        el.addEventListener(types[i], handler as EventListenerOrEventListenerObject, false);
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
    for (let i = 0; i < types.length; i += 1) {
        el.removeEventListener(types[i], handler as EventListenerOrEventListenerObject);
    }
};

/**
 * Extract pressure/force value from a processed event.
 * Handles Touch (force), Pointer (pressure), Safari trackpad (webkitForce),
 * and falls back to binary mouse-button detection.
 */
export const getPressureFromEvt = (evt: ProcessedEvent): number => {
    // Compute the pressure data.
    return 'force' in evt // Pressure on Touch.
        ? evt.force
        : 'pressure' in evt // Pressure on Pointers.
          ? evt.pressure
          : 'webkitForce' in evt // Pressure on trackpads, max is 3, only in Safari.
            ? (evt.webkitForce as number) / 3
            : 'buttons' in evt // Id of the mouse button pressed. 0 is none, 1 is left, 2 is right, ...
              ? evt.buttons !== 0
                  ? 1
                  : 0
              : 0;
};

/**
 * Normalize a single interaction event (touch, pointer, or mouse) into
 * a unified DomEvent with identifier, position, pressure, and type.
 */
export const processEvent = (evt: SupportedEvent, processedEvt: ProcessedEvent): DomEvent => {
    // Compute identifier of the event.
    // It's especially important for touches,
    // to track the correct touch in a multitouch interaction.
    const identifier: Identifier = (
        'identifier' in processedEvt
            ? processedEvt.identifier
            : 'pointerId' in processedEvt
              ? processedEvt.pointerId
              : // Using 1 as identifier, because pointerId starts at 1.
                // Using 0 would detach our pressure detection on Safari,
                // as the webkitForce events are triggered as MouseEvent, with no identifier.
                // So if we have a "start" event with a pointerId of 1, we need a "pressure" event
                // with an identifier of 1 too, so we can track the correct joystick.
                1
    ) as Identifier;

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
 * Reconciliation layer for MouseEvent, TouchEvent and PointerEvent.
 * Splits multi-touch events into individual DomEvent items and calls
 * preventDefault() on move events to suppress default browser gestures.
 *
 * We skip preventDefault() on start (pointerdown/touchstart/mousedown) events
 * because the zone element already has `touch-action: none` set, and calling
 * preventDefault() on pointerdown can interfere with multitouch on mobile.
 */
export const processEvents = (evt: SupportedEvent): DomEvent[] => {
    // Only preventDefault on move events — start events rely on
    // touch-action: none (set on the zone) to prevent default gestures,
    // and calling preventDefault on pointerdown breaks multitouch.
    const type = evt.type.toLowerCase();
    if (type.includes('move')) {
        evt.preventDefault();
    }

    // Prepare arrays of initial events.
    const domEvents: ProcessedEvent[] = [];
    // TouchEvent may have multitouches, split them out in an array.
    if ('changedTouches' in evt) {
        // evt.changedTouches doesn't really offer a nice iterable interface.
        for (const touch of evt.changedTouches) {
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

/**
 * Get the current scroll position of the window.
 * @returns {Coordinates} The current scroll position of the window.
 */
export const getScroll = (): Coordinates => ({
    x: window.scrollX,
    y: window.scrollY,
});

/**
 * Apply a position to an element.
 * @param {HTMLElement} el - The element to apply the position to.
 * @param {Coordinates} pos - The position to apply.
 */
export const applyPosition = (el: HTMLElement, pos: AnyPosition): void => {
    const { left, top, right, bottom, x, y } = pos;
    if (top || right || bottom || left) {
        extend(el.style, { top, right, bottom, left });
    } else if (isNumber(x) || isNumber(y)) {
        extend(el.style, {
            left: isNumber(x) ? `${x}px` : undefined,
            top: isNumber(y) ? `${y}px` : undefined,
        } as Partial<CSSStyleDeclaration>);
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
): Record<string, string> => ({
    [prop]: value,
});

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
 * Clamp a position within a range.
 * @param {Coordinates} pos - The position to clamp.
 * @param {Coordinates} joystickPos - The position of the joystick.
 * @param {number} size - The size of the range.
 * @returns {Coordinates} The clamped position.
 */
export const clamp = (pos: Coordinates, joystickPos: Coordinates, size: number): Coordinates => ({
    //                          left-clamping          right-clamping
    x: Math.min(Math.max(pos.x, joystickPos.x - size), joystickPos.x + size),
    //                          top-clamping           bottom-clamping
    y: Math.min(Math.max(pos.y, joystickPos.y - size), joystickPos.y + size),
});

/**
 * Check if a value is a number.
 * @param {unknown} value - The value to check.
 * @returns {boolean} True if the value is a number, false otherwise.
 */
export const isNumber = (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value);
};
