import type { EventType, InteractType } from './types';

/** Defines the different positioning modes available for the joystick */
export const MODES = {
    /** The joystick disappears on release. */
    dynamic: 'dynamic',
    /** The joystick stays in place after first touch, and disappears if the subsequent touch is too far. */
    semi: 'semi',
    /** The joystick stays at its initial position. */
    static: 'static',
} as const;

const IS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window;
const IS_POINTER = typeof window !== 'undefined' && !!window.PointerEvent;

type Bindings = Record<EventType, string>;
const EVENTS_TO_BIND: Record<InteractType, Bindings> = {
    touch: {
        start: 'touchstart',
        move: 'touchmove',
        end: 'touchend, touchcancel',
        pressure: 'webkitmouseforcechanged',
    },
    mouse: {
        start: 'mousedown',
        move: 'mousemove',
        end: 'mouseup, mouseleave',
        pressure: 'webkitmouseforcechanged',
    },
    pointer: {
        start: 'pointerdown',
        move: 'pointermove',
        end: 'pointerup, pointercancel, pointerleave',
        pressure: 'webkitmouseforcechanged',
    },
};

let primaryBind: Bindings;
let secondaryBind: Bindings | undefined;

// Determine which interface to bind.
// Pointer is the priority because it's the most modern and easy to use.
if (IS_POINTER) {
    primaryBind = EVENTS_TO_BIND.pointer;
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
