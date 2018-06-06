'use strict';

// Constants
var isTouch = !!('ontouchstart' in window);
var isPointer = window.PointerEvent ? true : false;
var isMSPointer = window.MSPointerEvent ? true : false;
var events = {
    touch: {
        start: 'touchstart',
        move: 'touchmove',
        end: 'touchend, touchcancel',
        cancel: 'touchcancel'
    },
    mouse: {
        start: 'mousedown',
        move: 'mousemove',
        end: 'mouseup'
    },
    pointer: {
        start: 'pointerdown',
        move: 'pointermove',
        end: 'pointerup',
        cancel: 'pointercancel'
    },
    MSPointer: {
        start: 'MSPointerDown',
        move: 'MSPointerMove',
        end: 'MSPointerUp'
    }
};
var toBind;
var secondBind = {};
if (isPointer) {
    toBind = events.pointer;
} else if (isMSPointer) {
    toBind = events.MSPointer;
} else if (isTouch) {
    toBind = events.touch;
    secondBind = events.mouse;
} else {
    toBind = events.mouse;
}
