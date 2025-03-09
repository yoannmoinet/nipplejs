import * as u from 'nipplejs/utils';

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

    describe('processEvents', () => {});
});
