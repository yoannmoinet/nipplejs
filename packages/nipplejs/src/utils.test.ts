import type { Coordinates } from 'nipplejs/types';
import * as u from 'nipplejs/utils';

// JSDOM does not implement Touch.
const getTouch = (args: Partial<Touch>) => args as Touch;
// JSDOM does not implement PointerEvent.
const getPointerEvent = (args: Partial<PointerEvent>) => args as PointerEvent;
// JSDOM does not implement MouseEvent super well.
const getMouseEvent = (args: Partial<MouseEvent>) => args as MouseEvent;

describe('utils', () => {
    describe('distance', () => {
        const expectations = [
            { point1: { x: 0, y: 0 }, point2: { x: 3, y: 4 }, expected: 5 },
            { point1: { x: 0, y: 0 }, point2: { x: 0, y: 0 }, expected: 0 },
            { point1: { x: 0, y: 0 }, point2: { x: 0, y: 4 }, expected: 4 },
            { point1: { x: 0, y: 0 }, point2: { x: 3, y: 0 }, expected: 3 },
            { point1: { x: 0, y: 0 }, point2: { x: -3, y: -4 }, expected: 5 },
            { point1: { x: 0, y: 0 }, point2: { x: -3, y: 4 }, expected: 5 },
            { point1: { x: 0, y: 0 }, point2: { x: 3, y: -4 }, expected: 5 },
        ];
        it.each(expectations)(
            'should return the distance $expected between $point1 and $point2',
            ({ point1, point2, expected }) => {
                expect(u.distance(point1, point2)).toBe(expected);
            },
        );
    });

    describe('angle', () => {
        const expectations = [
            { point1: { x: 0, y: 0 }, point2: { x: 4, y: 4 }, expected: 45 },
            { point1: { x: 0, y: 0 }, point2: { x: 4, y: 0 }, expected: 0 },
            { point1: { x: 0, y: 0 }, point2: { x: 0, y: 4 }, expected: 90 },
            { point1: { x: 0, y: 0 }, point2: { x: -4, y: -4 }, expected: -135 },
            { point1: { x: 0, y: 0 }, point2: { x: -4, y: 4 }, expected: 135 },
            { point1: { x: 0, y: 0 }, point2: { x: 4, y: -4 }, expected: -45 },
        ];
        it.each(expectations)(
            'should return the angle $expected for the segment of points $point1 and $point2',
            ({ point1, point2, expected }) => {
                expect(u.angle(point1, point2)).toBe(expected);
            },
        );
    });

    describe('findCoord', () => {
        const expectations = [
            { point: { x: 0, y: 0 }, angle: 0, distance: 4, expected: { x: -4, y: 0 } },
            { point: { x: 0, y: 0 }, angle: 90, distance: 4, expected: { x: 0, y: -4 } },
            { point: { x: 0, y: 0 }, angle: 180, distance: 4, expected: { x: 4, y: 0 } },
            { point: { x: 0, y: 0 }, angle: 270, distance: 4, expected: { x: 0, y: 4 } },
            { point: { x: 0, y: 0 }, angle: 45, distance: 4, expected: { x: -2.83, y: -2.83 } },
            { point: { x: 0, y: 0 }, angle: 135, distance: 4, expected: { x: 2.83, y: -2.83 } },
            { point: { x: 0, y: 0 }, angle: 225, distance: 4, expected: { x: 2.83, y: 2.83 } },
            { point: { x: 0, y: 0 }, angle: 315, distance: 4, expected: { x: -2.83, y: 2.83 } },
        ];
        it.each(expectations)(
            'should return the point $expected for angle $angle and distance $distance from $point',
            ({ point, angle, distance, expected }) => {
                // eslint-disable-next-line prefer-template
                const round = (n: number) => {
                    const result = Math.round(n * 100) / 100;
                    return Object.is(result, -0) ? 0 : result;
                };
                const roundPoint = (p: { x: number; y: number }) => ({
                    x: round(p.x),
                    y: round(p.y),
                });
                expect(roundPoint(u.findCoord(point, distance, angle))).toEqual(expected);
            },
        );
    });

    describe('radians', () => {
        const expectations = [
            { degrees: 0, expected: 0 },
            { degrees: 90, expected: Math.PI / 2 },
            { degrees: 180, expected: Math.PI },
            { degrees: 270, expected: (3 * Math.PI) / 2 },
            { degrees: 360, expected: 2 * Math.PI },
        ];
        it.each(expectations)(
            'should return the angle $expected in radians for $degrees degrees',
            ({ degrees, expected }) => {
                expect(u.radians(degrees)).toBe(expected);
            },
        );
    });

    describe('degrees', () => {
        const expectations = [
            { radians: 0, expected: 0 },
            { radians: Math.PI / 2, expected: 90 },
            { radians: Math.PI, expected: 180 },
            { radians: (3 * Math.PI) / 2, expected: 270 },
            { radians: 2 * Math.PI, expected: 360 },
        ];
        it.each(expectations)(
            'should return the angle $expected in degrees for $radians radians',
            ({ radians, expected }) => {
                expect(u.degrees(radians)).toBe(expected);
            },
        );
    });

    describe('throttle', () => {
        it('should throttle the function calls', () => {
            jest.useFakeTimers();
            const fn = jest.fn();
            const throttled = () => u.throttle(fn);
            throttled();
            throttled();
            throttled();
            jest.runAllTimers();
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('bindEvt', () => {
        it('should bind the event listener', () => {
            const el = document.createElement('div');
            const handler = jest.fn();
            u.bindEvt(el, 'click', handler);
            el.click();
            expect(handler).toHaveBeenCalled();
        });

        it('should bind multiple event listeners', () => {
            const el = document.createElement('div');
            const handler = jest.fn();
            u.bindEvt(el, 'click, mouseover', handler);
            el.click();
            el.dispatchEvent(new MouseEvent('mouseover'));
            expect(handler).toHaveBeenCalledTimes(2);
        });
    });

    describe('unbindEvt', () => {
        it('should unbind the event listener', () => {
            const el = document.createElement('div');
            const handler = jest.fn();
            u.bindEvt(el, 'click', handler);
            u.unbindEvt(el, 'click', handler);
            el.click();
            expect(handler).not.toHaveBeenCalled();
        });

        it('should unbind multiple event listeners', () => {
            const el = document.createElement('div');
            const handler = jest.fn();
            u.bindEvt(el, 'click, mouseover', handler);
            u.unbindEvt(el, 'click, mouseover', handler);
            el.click();
            el.dispatchEvent(new MouseEvent('mouseover'));
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('getPressureFromEvt', () => {
        it('should return the pressure from a mouse event', () => {
            const evt = new MouseEvent('click', { buttons: 1 });
            expect(u.getPressureFromEvt(evt)).toBe(1);
        });

        it('should return the pressure from a touch event', () => {
            const touch = getTouch({
                identifier: 1,
                target: document.createElement('div'),
                force: 0.5,
                pageX: 150,
                pageY: 250,
            });
            expect(u.getPressureFromEvt(touch)).toBe(0.5);
        });

        it('should return the pressure from a pointer event', () => {
            const evt = getPointerEvent({
                pointerId: 3,
                pageX: 200,
                pageY: 300,
                pressure: 0.5,
            });
            expect(u.getPressureFromEvt(evt)).toBe(0.5);
        });
    });

    describe('processEvent', () => {
        it('should process a single mouse event', () => {
            const evt = getMouseEvent({ buttons: 1, pageX: 100, pageY: 200, type: 'click' });
            const processedEvent = u.processEvent(evt, evt);
            expect(processedEvent).toEqual(
                expect.objectContaining({
                    identifier: 1,
                    isTouch: false,
                    position: { x: 100, y: 200 },
                    pressure: 1,
                    type: 'click',
                    initial: evt,
                    raw: evt,
                }),
            );
        });

        it('should process a touch event', () => {
            const touch = getTouch({
                identifier: 1,
                target: document.createElement('div'),
                pageX: 150,
                pageY: 250,
            });
            const evt = new TouchEvent('touchstart', { changedTouches: [touch] });
            const processedEvent = u.processEvent(evt, touch);
            expect(processedEvent).toEqual(
                expect.objectContaining({
                    identifier: 1,
                    isTouch: true,
                    position: { x: 150, y: 250 },
                    pressure: 0,
                    type: 'touchstart',
                    initial: evt,
                    raw: touch,
                }),
            );
        });

        it('should process a pointer event', () => {
            const evt = getPointerEvent({
                pointerId: 3,
                pageX: 200,
                pageY: 300,
                pressure: 0.5,
                type: 'pointerdown',
            });
            const processedEvent = u.processEvent(evt, evt);
            expect(processedEvent).toEqual(
                expect.objectContaining({
                    identifier: 3,
                    isTouch: false,
                    position: { x: 200, y: 300 },
                    pressure: 0.5,
                    type: 'pointerdown',
                    initial: evt,
                    raw: evt,
                }),
            );
        });
    });

    describe('processEvents', () => {
        it('should process multiple touch events', () => {
            const touch1 = getTouch({
                identifier: 1,
                target: document.createElement('div'),
                pageX: 150,
                pageY: 250,
            });
            const touch2 = getTouch({
                identifier: 2,
                target: document.createElement('div'),
                pageX: 300,
                pageY: 400,
            });
            const evt = new TouchEvent('touchmove', { changedTouches: [touch1, touch2] });
            const processedEvents = u.processEvents(evt);
            expect(processedEvents).toHaveLength(2);
        });

        it('should process a single mouse event', () => {
            const evt = new MouseEvent('click', { screenX: 100, screenY: 200 });
            const processedEvents = u.processEvents(evt);
            expect(processedEvents).toHaveLength(1);
        });
    });

    describe('getScroll', () => {
        it('should return the scroll position', () => {
            expect(u.getScroll()).toEqual({ x: 0, y: 0 });
        });
    });

    describe('applyPosition', () => {
        it('should apply the coordinates as position to the element', () => {
            const el = document.createElement('div');
            u.applyPosition(el, { x: 100, y: 200 });
            expect(el.style.left).toBe('100px');
            expect(el.style.top).toBe('200px');
        });

        it('should apply the CSS position to the element', () => {
            const el = document.createElement('div');
            u.applyPosition(el, { top: '100px', left: '200px', right: '50px', bottom: '10px' });
            expect(el.style.top).toBe('100px');
            expect(el.style.left).toBe('200px');
            expect(el.style.right).toBe('50px');
            expect(el.style.bottom).toBe('10px');
        });
    });

    describe('configStylePropertyObject', () => {
        it('should return the object with the CSS property', () => {
            const style = u.configStylePropertyObject('borderRadius', '50%');
            expect(style).toEqual({
                borderRadius: '50%',
            });
        });
    });

    describe('extend', () => {
        const expectations = [
            {
                name: 'basic extend',
                obj: { a: 1, b: 2 },
                other: { b: 3, c: 4 },
                expected: { a: 1, b: 3, c: 4 },
            },
            {
                name: 'override existing properties',
                obj: { a: 1, b: 2 },
                other: { b: 3, c: 4, a: 5 },
                expected: { a: 5, b: 3, c: 4 },
            },
            {
                name: 'extend with new properties',
                obj: { a: 1, b: 2 },
                other: { b: 3, c: 4, a: 5, d: 6 },
                expected: { a: 5, b: 3, c: 4, d: 6 },
            },
        ];
        it.each(expectations)(
            'should extend the object with "$name"',
            ({ obj, other, expected }) => {
                u.extend(obj, other);
                expect(obj).toEqual(expected);
            },
        );
    });

    describe('clamp', () => {
        const expectations: {
            name: string;
            center: Coordinates;
            position: Coordinates;
            maximumRange: number;
            expected: Coordinates;
        }[] = [
            {
                name: 'position within the range',
                center: { x: 0, y: 0 },
                position: { x: 3, y: 4 },
                maximumRange: 5,
                expected: { x: 0, y: 0 },
            },
            {
                name: 'position outside the range',
                center: { x: 0, y: 0 },
                position: { x: 3, y: 4 },
                maximumRange: 2,
                expected: { x: 1, y: 2 },
            },
        ];
        it.each(expectations)(
            'should clamp "$name"',
            ({ center, position, maximumRange, expected }) => {
                expect(u.clamp(center, position, maximumRange)).toEqual(expected);
            },
        );
    });

    describe('isNumber', () => {
        const expectations = [
            {
                name: 'valid number',
                value: 42,
                expected: true,
            },
            {
                name: 'zero',
                value: 0,
                expected: true,
            },
            {
                name: 'negative number',
                value: -123,
                expected: true,
            },
            {
                name: 'string number',
                value: '42',
                expected: false,
            },
            {
                name: 'NaN',
                value: NaN,
                expected: false,
            },
            {
                name: 'undefined',
                value: undefined,
                expected: false,
            },
            {
                name: 'null',
                value: null,
                expected: false,
            },
            {
                name: 'object',
                value: {},
                expected: false,
            },
        ];
        it.each(expectations)('should return $expected for $name', ({ value, expected }) => {
            expect(u.isNumber(value)).toBe(expected);
        });
    });
});
