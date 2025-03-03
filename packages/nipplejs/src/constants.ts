import type { EventType, InteractType } from './types';

export const MODES = {
    dynamic: 'dynamic',
    semi: 'semi',
    static: 'static',
} as const;

const IS_TOUCH = !!('ontouchstart' in window);
const IS_POINTER = !!window.PointerEvent;
// @ts-expect-error - TS doesn't know about MSPointerEvent
const IS_MS_POINTER = !!window.MSPointerEvent;

type Bindings = Record<EventType, string>;
const EVENTS_TO_BIND: Record<InteractType, Bindings> = {
    touch: {
        start: 'touchstart',
        move: 'touchmove',
        end: 'touchend, touchcancel',
    },
    mouse: {
        start: 'mousedown',
        move: 'mousemove',
        end: 'mouseup, mouseleave',
    },
    pointer: {
        start: 'pointerdown, pointerenter',
        move: 'pointermove',
        end: 'pointerup, pointercancel, pointerleave',
    },
    MSPointer: {
        start: 'MSPointerDown',
        move: 'MSPointerMove',
        end: 'MSPointerUp, MSPointerCancel, MSPointerLeave',
    },
};

let primaryBind: Bindings;
let secondaryBind: Bindings | undefined;

// Determine which interface to bind.
// Pointer is the priority because it's the most modern and easy to use.
if (IS_POINTER) {
    primaryBind = EVENTS_TO_BIND.pointer;
} else if (IS_MS_POINTER) {
    primaryBind = EVENTS_TO_BIND.MSPointer;
} else if (IS_TOUCH) {
    // Some touch interfaces support both mouse and touch,
    // so we need to bind both.
    primaryBind = EVENTS_TO_BIND.touch;
    secondaryBind = EVENTS_TO_BIND.mouse;
} else {
    // Default to mouse.
    primaryBind = EVENTS_TO_BIND.mouse;
}

// What will we bind on the dom elements?
export const PRIMARY_BIND = primaryBind;
export const SECONDARY_BIND = secondaryBind;

// Some static math constants.
export const ANGLE_45 = Math.PI / 4;
export const ANGLE_90 = Math.PI / 2;
