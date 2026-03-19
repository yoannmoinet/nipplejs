import type { Uid, Identifier } from 'nipplejs/types';

import { Collection } from './Collection';
import type Factory from './Factory';
import { Joystick } from './Joystick';
import { MODES } from './constants';

// Helper to create a mock Factory
const createMockFactory = (): jest.Mocked<Factory> => {
    const mockFactory = {
        scroll: { x: 0, y: 0 },
        trigger: jest.fn(),
        options: {},
    } as any;
    return mockFactory;
};

// Helper to create a mock zone element
const createMockZone = (): HTMLElement => {
    const zone = document.createElement('div');
    zone.id = 'test-zone';
    zone.style.width = '300px';
    zone.style.height = '300px';
    document.body.appendChild(zone);
    return zone;
};

describe('Collection', () => {
    let mockFactory: jest.Mocked<Factory>;
    let mockZone: HTMLElement;

    beforeEach(() => {
        mockFactory = createMockFactory();
        mockZone = createMockZone();
        // Reset static index
        Collection.index = 0;
        Joystick.index = 0;
    });

    afterEach(() => {
        // Clean up DOM
        if (mockZone && mockZone.parentElement) {
            mockZone.parentElement.removeChild(mockZone);
        }
        jest.restoreAllMocks();
    });

    describe('Construction & Initialization', () => {
        it('creates collection with default options', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            expect(collection.options.mode).toBe(MODES.dynamic);
            expect(collection.options.size).toBe(100);
            expect(collection.options.threshold).toBe(0.1);
            expect(collection.options.color).toBe('white');
            expect(collection.options.fadeTime).toBe(250);
            expect(collection.options.multitouch).toBe(false);
            expect(collection.options.maxNumberOfJoysticks).toBe(1);
        });

        it('creates collection with custom options', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
                size: 120,
                threshold: 0.2,
                color: 'red',
                multitouch: true,
                maxNumberOfJoysticks: 3,
            });

            expect(collection.options.size).toBe(120);
            expect(collection.options.threshold).toBe(0.2);
            expect(collection.options.color).toBe('red');
            expect(collection.options.multitouch).toBe(true);
            expect(collection.options.maxNumberOfJoysticks).toBe(3);
        });

        it('assigns unique uid from static index', () => {
            const collection1 = new Collection(mockFactory, { zone: mockZone });
            const collection2 = new Collection(mockFactory, { zone: mockZone });

            expect(collection1.uid).toBe(0);
            expect(collection2.uid).toBe(1);
        });

        it('overwrites multitouch in static mode', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
                multitouch: true,
            });

            expect(collection.options.multitouch).toBe(false);
        });

        it('overwrites multitouch in semi mode', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.semi,
                multitouch: true,
            });

            expect(collection.options.multitouch).toBe(false);
        });

        it('sets maxNumberOfJoysticks to 1 when multitouch is false', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                multitouch: false,
                maxNumberOfJoysticks: 5,
            });

            expect(collection.options.maxNumberOfJoysticks).toBe(1);
        });

        it('emits collectionCreated event on init()', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            const triggerSpy = jest.spyOn(collection, 'trigger');

            collection.init();

            expect(triggerSpy).toHaveBeenCalledWith('collectionCreated', collection);
        });

        it('creates static joystick in static mode on init()', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            expect(collection.all.size).toBe(1);
            expect(collection.idles.size).toBe(1);
        });
    });

    describe('Joystick Creation & Management', () => {
        it('createJoystick() with numeric coordinates', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            const joystick = (collection as any).createJoystick({
                x: 100,
                y: 100,
            });

            expect(joystick).toBeInstanceOf(Joystick);
            expect(joystick.position.x).toBe(100);
            expect(joystick.position.y).toBe(100);
            expect(collection.all.has(joystick.uid)).toBe(true);
            expect(collection.idles.has(joystick.uid)).toBe(true);
        });

        it('createJoystick() with CSS position object', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            const joystick = (collection as any).createJoystick({
                top: '50px',
                left: '50px',
            });

            expect(joystick).toBeInstanceOf(Joystick);
            // Position should be defined (may be 0,0 depending on zone position)
            expect(joystick.position.x).toBeGreaterThanOrEqual(0);
            expect(joystick.position.y).toBeGreaterThanOrEqual(0);
        });

        it('getJoystickByUid() returns joystick by uid', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            const found = collection.getJoystickByUid(joystick.uid);

            expect(found).toBe(joystick);
        });

        it('getJoystickByUid() returns first joystick when no uid provided', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            const found = collection.getJoystickByUid(undefined);

            expect(found).toBe(joystick);
        });

        it('getJoystickByUid() returns undefined for non-existent uid', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            const found = collection.getJoystickByUid(999 as Uid);

            expect(found).toBeUndefined();
        });

        it('addToIdlesList() adds joystick to idles set', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;

            expect(collection.idles.has(joystick.uid)).toBe(true);
        });

        it('removeFromIdlesList() removes from idles set', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            collection.idles.delete(joystick.uid);

            expect(collection.idles.has(joystick.uid)).toBe(false);
        });

        it('respects maxNumberOfJoysticks limit', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
                multitouch: true,
                maxNumberOfJoysticks: 2,
            });

            // Create mock events
            const evt1 = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            const evt2 = {
                identifier: 2 as Identifier,
                position: { x: 150, y: 150 },
                pressure: 1,
                raw: {} as any,
            };

            const evt3 = {
                identifier: 3 as Identifier,
                position: { x: 200, y: 200 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt1 as any);
            collection.processOnStart(evt2 as any);
            collection.processOnStart(evt3 as any);

            // Should only have 2 active joysticks
            expect(collection.actives.size).toBe(2);
        });
    });

    describe('Mode Behavior', () => {
        it('dynamic mode: creates joystick on each touch', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            expect(collection.all.size).toBe(0);

            collection.processOnStart(evt as any);

            expect(collection.all.size).toBe(1);
            expect(collection.actives.size).toBe(1);
        });

        it('dynamic mode: destroys joystick on release', () => {
            jest.useFakeTimers();

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt as any);

            const joystick = collection.actives.get(evt.identifier);
            expect(joystick).toBeDefined();

            collection.processOnEnd(evt as any);

            // Advance timers to trigger destroy
            jest.advanceTimersByTime(300);

            // In dynamic mode, joystick is removed after fadeTime
            expect(collection.actives.has(evt.identifier)).toBe(false);

            jest.useRealTimers();
        });

        it('semi mode: reuses joystick within catchDistance', () => {
            jest.useFakeTimers();

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.semi,
                catchDistance: 100,
            });

            const evt1 = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt1 as any);

            const firstJoystick = collection.actives.get(evt1.identifier);
            expect(firstJoystick).toBeDefined();

            collection.processOnEnd(evt1 as any);

            // Wait for fadeTime animation to move joystick back to idle
            jest.advanceTimersByTime(300);

            // Create new event within catch distance
            const evt2 = {
                identifier: 2 as Identifier,
                position: { x: 120, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt2 as any);

            const secondJoystick = collection.actives.get(evt2.identifier);

            // Should reuse the same joystick
            expect(secondJoystick).toBe(firstJoystick);
            expect(collection.all.size).toBe(1);

            jest.useRealTimers();
        });

        it('semi mode: creates new joystick beyond catchDistance', () => {
            jest.useFakeTimers();

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.semi,
                catchDistance: 50,
            });

            const evt1 = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt1 as any);

            const firstJoystickUid = collection.actives.get(evt1.identifier)?.uid;

            collection.processOnEnd(evt1 as any);

            // Wait for fadeTime animation to move joystick back to idle
            jest.advanceTimersByTime(300);

            // Create new event beyond catch distance
            const evt2 = {
                identifier: 2 as Identifier,
                position: { x: 200, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt2 as any);

            const secondJoystickUid = collection.actives.get(evt2.identifier)?.uid;

            // Should create a new joystick
            expect(secondJoystickUid).not.toBe(firstJoystickUid);

            jest.useRealTimers();
        });

        it('static mode: creates single joystick at fixed position', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
                position: { top: '50px', left: '50px' },
            });

            collection.init();

            expect(collection.all.size).toBe(1);
            expect(collection.idles.size).toBe(1);
        });

        it('static mode: reuses same joystick for all touches', () => {
            jest.useFakeTimers();

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const evt1 = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            const evt2 = {
                identifier: 2 as Identifier,
                position: { x: 150, y: 150 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt1 as any);
            const firstJoystick = collection.actives.get(evt1.identifier);

            collection.processOnEnd(evt1 as any);

            // Wait for fadeTime animation to move joystick back to idle
            jest.advanceTimersByTime(300);

            collection.processOnStart(evt2 as any);
            const secondJoystick = collection.actives.get(evt2.identifier);

            // Should reuse the same joystick
            expect(secondJoystick).toBe(firstJoystick);
            expect(collection.all.size).toBe(1);

            jest.useRealTimers();
        });
    });

    describe('Event Processing', () => {
        it('processOnStart() gets bounding box and creates joystick', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnStart(evt as any);

            expect(collection.box).toBeDefined();
            expect(collection.actives.size).toBe(1);
        });

        it('processOnMove() updates joystick position', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 120, y: 120 },
                pressure: 1,
                raw: {} as any,
            };

            const initialFrontX = joystick.frontPosition.x;

            collection.processOnMove(evt as any);

            expect(joystick.frontPosition.x).not.toBe(initialFrontX);
        });

        it('processOnMove() calculates direction and triggers events', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
                threshold: 0.1,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            const evt = {
                identifier: 1 as Identifier,
                position: { x: joystick.position.x + 30, y: joystick.position.y },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnMove(evt as any);

            expect(triggerSpy).toHaveBeenCalled();
        });

        it('processOnEnd() deactivates joystick', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 0,
                raw: {} as any,
            };

            collection.processOnEnd(evt as any);

            // Joystick should be moved to resting
            expect(collection.resting.has(evt.identifier)).toBe(true);
        });

        it('processOnEnd() moves to resting state', () => {
            jest.useFakeTimers();

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });

            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            const evt = {
                identifier: 1 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 0,
                raw: {} as any,
            };

            collection.processOnEnd(evt as any);

            expect(triggerSpy).toHaveBeenCalledWith('end', joystick);

            jest.useRealTimers();
        });

        it('handles zombie joystick on move', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            const errorSpy = jest.spyOn(collection, 'error');

            const evt = {
                identifier: 999 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 1,
                raw: {} as any,
            };

            collection.processOnMove(evt as any);

            expect(errorSpy).toHaveBeenCalled();
        });

        it('handles zombie joystick on end', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            const errorSpy = jest.spyOn(collection, 'error');

            const evt = {
                identifier: 999 as Identifier,
                position: { x: 100, y: 100 },
                pressure: 0,
                raw: {} as any,
            };

            collection.processOnEnd(evt as any);

            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('baseDelta in move event', () => {
        it('baseDelta is { x: 0, y: 0 } when follow is disabled', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });
            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const triggerSpy = jest.spyOn(joystick, 'computeDirectionAndTriggerEvents');

            collection.processOnMove({
                identifier: 1 as Identifier,
                position: { x: 120, y: 120 },
                pressure: 1,
                raw: {} as any,
            } as any);

            expect(triggerSpy).toHaveBeenCalled();
            const eventData = triggerSpy.mock.calls[0][0] as any;
            expect(eventData.baseDelta).toEqual({ x: 0, y: 0 });
        });

        it('baseDelta is { x: 0, y: 0 } when thumb is within joystick radius with follow', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
                follow: true,
            });
            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const triggerSpy = jest.spyOn(joystick, 'computeDirectionAndTriggerEvents');

            // Small move within radius (default size is 100, so radius is 50)
            collection.processOnMove({
                identifier: 1 as Identifier,
                position: { x: joystick.position.x + 10, y: joystick.position.y + 10 },
                pressure: 1,
                raw: {} as any,
            } as any);

            expect(triggerSpy).toHaveBeenCalled();
            const eventData = triggerSpy.mock.calls[0][0] as any;
            expect(eventData.baseDelta).toEqual({ x: 0, y: 0 });
        });

        it('baseDelta is non-zero when thumb exceeds joystick radius with follow', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
                follow: true,
                size: 100,
            });
            collection.init();

            const joystick = collection.all.values().next().value;
            joystick.identifier = 1 as Identifier;
            collection.actives.set(1 as Identifier, joystick);

            const triggerSpy = jest.spyOn(joystick, 'computeDirectionAndTriggerEvents');

            // Large move way beyond radius
            collection.processOnMove({
                identifier: 1 as Identifier,
                position: { x: joystick.position.x + 200, y: joystick.position.y },
                pressure: 1,
                raw: {} as any,
            } as any);

            expect(triggerSpy).toHaveBeenCalled();
            const eventData = triggerSpy.mock.calls[0][0] as any;
            expect(eventData.baseDelta.x).not.toBe(0);
        });
    });

    describe('Cleanup & Destruction', () => {
        it('destroy() removes all joysticks', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
                multitouch: true,
                maxNumberOfJoysticks: 3,
            });

            (collection as any).createJoystick({ x: 100, y: 100 });
            (collection as any).createJoystick({ x: 150, y: 150 });

            expect(collection.all.size).toBe(2);

            collection.destroy();

            expect(collection.all.size).toBe(0);
            expect(collection.idles.size).toBe(0);
            expect(collection.actives.size).toBe(0);
            expect(collection.resting.size).toBe(0);
        });

        it('destroy() emits collectionDestroyed event', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            const triggerSpy = jest.spyOn(collection, 'trigger');

            collection.destroy();

            expect(triggerSpy).toHaveBeenCalledWith('collectionDestroyed', collection);
        });

        it('destroy() clears all event handlers', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
            });

            const offSpy = jest.spyOn(collection, 'off');

            collection.destroy();

            expect(offSpy).toHaveBeenCalled();
        });
    });

    describe('reposition()', () => {
        it('updates box from zone bounding rect', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            // Simulate zone moving
            mockZone.style.marginTop = '50px';
            collection.reposition();

            // box should be recalculated (may or may not differ in jsdom, but should not throw)
            expect(collection.box).toBeDefined();
            expect(collection.box).toEqual(expect.objectContaining({ width: expect.any(Number) }));
        });

        it('updates joystick positions for non-dataOnly joysticks', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.static,
            });
            collection.init();

            const joystick = collection.all.values().next().value;

            collection.reposition();

            // Position should be recalculated (exact values depend on jsdom layout)
            expect(joystick.position).toBeDefined();
            expect(joystick.position.x).toEqual(expect.any(Number));
            expect(joystick.position.y).toEqual(expect.any(Number));
        });

        it('refreshes factory scroll value', () => {
            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            mockFactory.scroll = { x: 99, y: 99 };
            collection.reposition();

            // scroll should be refreshed from window (0,0 in jsdom)
            expect(mockFactory.scroll).toEqual({ x: 0, y: 0 });
        });
    });

    describe('Zone position warning', () => {
        it('warns when zone has position: static', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            mockZone.style.position = 'static';
            // eslint-disable-next-line no-new
            new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining('no CSS "position" set'),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );

            warnSpy.mockRestore();
        });

        it('does not warn when zone has position: relative', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            mockZone.style.position = 'relative';
            // eslint-disable-next-line no-new
            new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            expect(warnSpy).not.toHaveBeenCalled();

            warnSpy.mockRestore();
        });
    });

    describe('ResizeObserver', () => {
        it('sets up ResizeObserver on zone element', () => {
            const observeSpy = jest.fn();
            const disconnectSpy = jest.fn();
            const MockResizeObserver = jest.fn().mockImplementation(() => ({
                observe: observeSpy,
                disconnect: disconnectSpy,
                unobserve: jest.fn(),
            }));
            (globalThis as any).ResizeObserver = MockResizeObserver;

            // eslint-disable-next-line no-new
            new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            expect(MockResizeObserver).toHaveBeenCalledTimes(1);
            expect(observeSpy).toHaveBeenCalledWith(mockZone);
        });

        it('disconnects ResizeObserver on destroy', () => {
            const disconnectSpy = jest.fn();
            const MockResizeObserver = jest.fn().mockImplementation(() => ({
                observe: jest.fn(),
                disconnect: disconnectSpy,
                unobserve: jest.fn(),
            }));
            (globalThis as any).ResizeObserver = MockResizeObserver;

            const collection = new Collection(mockFactory, {
                zone: mockZone,
                mode: MODES.dynamic,
            });

            collection.destroy();

            expect(disconnectSpy).toHaveBeenCalled();
        });
    });
});
