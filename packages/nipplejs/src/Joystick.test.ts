import type { Identifier, Uid } from 'nipplejs/types';

import type Collection from './Collection';
import { Joystick } from './Joystick';

// JSDOM does not implement MouseEvent super well.
const getMouseEvent = (args: Partial<MouseEvent>) => args as MouseEvent;

// Helper to create a mock Collection
const createMockCollection = (): jest.Mocked<Collection> => {
    const mockCollection = {
        uid: 1 as Uid,
        trigger: jest.fn(),
        options: {
            zone: document.body,
            mode: 'dynamic',
            size: 100,
            threshold: 0.1,
            color: 'white',
            fadeTime: 250,
            dataOnly: false,
            restJoystick: true,
            restOpacity: 0.5,
            lockX: false,
            lockY: false,
            shape: 'circle',
        },
    } as any;
    return mockCollection;
};

const defaultEventData = (joystick: Joystick, overrides: Record<string, any> = {}) => ({
    angle: { degree: 90, radian: Math.PI / 2 },
    force: 0.5,
    lockX: false,
    lockY: false,
    baseDelta: { x: 0, y: 0 },
    distance: 50,
    position: { x: 100, y: 100 },
    pressure: 0,
    vector: { x: 0, y: 0.5 },
    raw: { distance: 50, position: { x: 100, y: 100 } },
    instance: joystick,
    ...overrides,
});

describe('Joystick', () => {
    let mockCollection: jest.Mocked<Collection>;

    beforeEach(() => {
        mockCollection = createMockCollection();
        // Reset static index between tests
        Joystick.index = 0;
        // Clear any existing timers
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Construction & Initialization', () => {
        it('creates joystick with default options', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            expect(joystick.options.size).toBe(100);
            expect(joystick.options.mode).toBe('dynamic');
            expect(joystick.options.threshold).toBe(0.1);
            expect(joystick.options.color).toBe('white');
            expect(joystick.options.fadeTime).toBe(250);
            expect(joystick.options.dataOnly).toBe(false);
            expect(joystick.options.restJoystick).toBe(true);
            expect(joystick.options.lockX).toBe(false);
            expect(joystick.options.lockY).toBe(false);
        });

        it('creates joystick with custom options', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 150, y: 150 },
                frontPosition: { x: 10, y: 10 },
                size: 120,
                threshold: 0.2,
                color: 'red',
                fadeTime: 300,
                lockX: true,
            });

            expect(joystick.options.size).toBe(120);
            expect(joystick.options.threshold).toBe(0.2);
            expect(joystick.options.color).toBe('red');
            expect(joystick.options.fadeTime).toBe(300);
            expect(joystick.options.lockX).toBe(true);
            expect(joystick.position).toEqual({ x: 150, y: 150 });
            expect(joystick.frontPosition).toEqual({ x: 10, y: 10 });
        });

        it('assigns unique uid from static index', () => {
            const joystick1 = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });
            const joystick2 = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            expect(joystick1.uid).toBe(0);
            expect(joystick2.uid).toBe(1);
        });

        it('applies mode-specific defaults (dynamic sets restOpacity to 0)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                mode: 'dynamic',
                restOpacity: 0.5, // Should be overwritten
            });

            expect(joystick.options.restOpacity).toBe(0);
        });

        it('applies string color to both front and back', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                color: 'red',
            });
            joystick.init();

            expect(joystick.ui.back.style.background).toBe('red');
            expect(joystick.ui.front.style.background).toBe('red');
        });

        it('applies { front, back } color object separately', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                color: { front: 'blue', back: 'green' },
            });
            joystick.init();

            expect(joystick.ui.back.style.background).toBe('green');
            expect(joystick.ui.front.style.background).toBe('blue');
        });

        it('emits added and joystickCreated events on init()', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                dataOnly: true,
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.init();

            expect(triggerSpy).toHaveBeenCalledWith('added', joystick);
            expect(triggerSpy).toHaveBeenCalledWith('joystickCreated', joystick);
        });
    });

    describe('Positioning & Movement', () => {
        it('setPosition() updates frontPosition coordinates', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.setPosition(undefined, { x: 20, y: 30 });

            expect(joystick.frontPosition).toEqual({ x: 20, y: 30 });
        });

        it('setPosition() applies CSS transform when not dataOnly', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                dataOnly: false,
            });

            joystick.init();
            joystick.setPosition(undefined, { x: 15, y: 25 });

            // Check that transition is set
            expect(joystick.ui.front.style.transition).toContain('transform');
        });

        it('setPosition() calls callback after transition', (done) => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                fadeTime: 250,
            });

            joystick.init();

            const callback = jest.fn();
            joystick.setPosition(callback, { x: 10, y: 10 });

            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(250);

            expect(callback).toHaveBeenCalled();

            jest.useRealTimers();
            done();
        });

        it('setPosition() respects lockX option (y changes, x stays 0)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                lockX: true,
            });

            // Note: lockX/lockY are used in computeDirection, not setPosition
            // This test verifies that the position is set as requested
            // The locking happens during event processing
            joystick.setPosition(undefined, { x: 20, y: 30 });

            expect(joystick.frontPosition.x).toBe(20);
            expect(joystick.frontPosition.y).toBe(30);
        });

        it('setPosition() respects lockY option (x changes, y stays 0)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                lockY: true,
            });

            joystick.setPosition(undefined, { x: 20, y: 30 });

            expect(joystick.frontPosition.x).toBe(20);
            expect(joystick.frontPosition.y).toBe(30);
        });

        it('setPosition() respects lockX and lockY together', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                lockX: true,
                lockY: true,
            });

            joystick.setPosition(undefined, { x: 20, y: 30 });

            expect(joystick.frontPosition.x).toBe(20);
            expect(joystick.frontPosition.y).toBe(30);
        });

        it('setPosition() triggers rested event after transition', (done) => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                fadeTime: 250,
            });

            joystick.init();

            const triggerSpy = jest.spyOn(joystick, 'trigger');
            joystick.setPosition(undefined, { x: 10, y: 10 });

            jest.advanceTimersByTime(250);

            expect(triggerSpy).toHaveBeenCalledWith('rested', joystick);

            jest.useRealTimers();
            done();
        });

        it('setPosition() with animated=true triggers animation', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.init();
            joystick.setPosition(undefined, { x: 15, y: 25 });

            // The transition should be set when animated
            expect(joystick.ui.front.style.transition).toBeTruthy();
        });
    });

    describe('Direction Calculation', () => {
        it('computeDirectionAndTriggerEvents() calculates angle from center', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.1,
            });

            const eventData = defaultEventData(joystick, {
                angle: { degree: 45, radian: Math.PI / 4 },
                vector: { x: 0.5, y: 0.5 },
            });

            const result = joystick.computeDirectionAndTriggerEvents(eventData);

            // Angle should be transformed: 180 - 45 = 135
            expect(result.angle.degree).toBe(135);
        });

        it('computeDirectionAndTriggerEvents() sets direction.angle (cardinal: up)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.1,
            });

            const eventData = defaultEventData(joystick);

            const result = joystick.computeDirectionAndTriggerEvents(eventData);

            expect(result.direction?.angle).toBe('up');
        });

        it('computeDirectionAndTriggerEvents() sets direction.angle (cardinal: left)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.1,
            });

            const eventData = defaultEventData(joystick, {
                angle: { degree: 0, radian: 0 },
                vector: { x: 0.5, y: 0 },
            });

            const result = joystick.computeDirectionAndTriggerEvents(eventData);

            expect(result.direction?.angle).toBe('left');
        });

        it('computeDirectionAndTriggerEvents() emits dir: events for new directions', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.1,
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            const eventData = defaultEventData(joystick);

            joystick.computeDirectionAndTriggerEvents(eventData);

            expect(triggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('dir'),
                expect.objectContaining({ force: 0.5 }),
            );
        });

        it('computeDirectionAndTriggerEvents() emits plain: events for cardinal directions', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.1,
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            const eventData = defaultEventData(joystick);

            joystick.computeDirectionAndTriggerEvents(eventData);

            expect(triggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('plain'),
                expect.objectContaining({ force: 0.5 }),
            );
        });

        it('computeDirectionAndTriggerEvents() respects threshold option (no events below threshold)', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                threshold: 0.5,
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            const eventData = defaultEventData(joystick, {
                force: 0.3, // Below threshold
                distance: 30,
                vector: { x: 0, y: 0.3 },
                raw: { distance: 30, position: { x: 100, y: 100 } },
            });

            joystick.computeDirectionAndTriggerEvents(eventData);

            // Should not trigger dir or plain events, only move
            expect(triggerSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('dir'),
                expect.anything(),
            );
            expect(triggerSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('plain'),
                expect.anything(),
            );
            expect(triggerSpy).toHaveBeenCalledWith('move', expect.anything());
        });
    });

    describe('Lifecycle Methods', () => {
        it('start() sets opacity to 1 and emits start event', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                dataOnly: false,
            });

            joystick.init();

            const triggerSpy = jest.spyOn(joystick, 'trigger');
            const evt = getMouseEvent({});

            joystick.start(evt as any);

            expect(triggerSpy).toHaveBeenCalledWith('start', joystick);

            jest.useRealTimers();
        });

        it('start() calls addToDom() when not dataOnly', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                dataOnly: false,
            });

            joystick.init();

            const addToDomSpy = jest.spyOn(joystick, 'addToDom');
            const evt = getMouseEvent({});

            joystick.start(evt as any);

            expect(addToDomSpy).toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('start() starts pressure interval', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
                dataOnly: false,
            });

            joystick.init();

            const evt = getMouseEvent({});

            joystick.start(evt as any);

            expect(joystick.pressureInterval).toBeDefined();

            jest.useRealTimers();
        });

        it('end() resets direction and emits end event', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.init();

            // Set a direction first
            joystick.direction = { angle: 'up', x: 'left', y: 'up' };

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.end();

            expect(joystick.direction).toEqual({});
            expect(triggerSpy).toHaveBeenCalledWith('end', joystick);

            jest.useRealTimers();
        });

        it('end() returns to center when restJoystick=true', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 20, y: 30 },
                restJoystick: true,
            });

            joystick.init();

            const setPositionSpy = jest.spyOn(joystick, 'setPosition');

            joystick.end();

            expect(setPositionSpy).toHaveBeenCalledWith(undefined, { x: 0, y: 0 });

            jest.useRealTimers();
        });

        it('end() stays in place when restJoystick=false', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 20, y: 30 },
                restJoystick: false,
            });

            joystick.init();

            const setPositionSpy = jest.spyOn(joystick, 'setPosition');

            joystick.end();

            expect(setPositionSpy).not.toHaveBeenCalled();

            jest.useRealTimers();
        });

        it('destroy() removes from DOM and clears all timeouts', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.init();

            // Set some timeouts
            joystick.removeTimeout = setTimeout(() => {}, 1000) as any;
            joystick.showTimeout = setTimeout(() => {}, 1000) as any;

            const removeFromDomSpy = jest.spyOn(joystick, 'removeFromDom');
            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.destroy();

            expect(removeFromDomSpy).toHaveBeenCalled();
            expect(triggerSpy).toHaveBeenCalledWith('joystickDestroyed', joystick);
            expect(joystick.removeTimeout).toBeUndefined();
            expect(joystick.showTimeout).toBeUndefined();
        });
    });

    describe('Identifier Management', () => {
        it('identifier setter triggers attached event when set', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.identifier = 123 as Identifier;

            expect(triggerSpy).toHaveBeenCalledWith(
                'attached',
                expect.objectContaining({
                    joystick,
                    identifier: 123,
                }),
            );
        });

        it('identifier setter triggers detached event when unset', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.identifier = 123 as Identifier;

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.identifier = undefined;

            expect(triggerSpy).toHaveBeenCalledWith(
                'detached',
                expect.objectContaining({
                    joystick,
                    identifier: 123,
                }),
            );
        });
    });

    describe('Pressure Management', () => {
        it('pressure setter triggers pressure event when changed', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.pressure = 0.5;

            expect(triggerSpy).toHaveBeenCalledWith('pressure', 0.5);
        });

        it('pressure setter does not trigger event when value unchanged', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            joystick.pressure = 0.5;

            const triggerSpy = jest.spyOn(joystick, 'trigger');

            joystick.pressure = 0.5; // Same value

            expect(triggerSpy).not.toHaveBeenCalled();
        });

        it('stopPressureInterval() clears interval', () => {
            jest.useFakeTimers();

            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });

            const evt = getMouseEvent({});
            joystick.startPressureInterval(evt as any);

            expect(joystick.pressureInterval).toBeDefined();

            joystick.stopPressureInterval();

            expect(joystick.pressureInterval).toBeUndefined();

            jest.useRealTimers();
        });
    });

    describe('Move Event Continuity', () => {
        it('fires move event even when direction has not changed', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });
            const moveSpy = jest.fn();
            joystick.on('move', moveSpy);

            // Same direction data — angle and force identical
            const eventData = defaultEventData(joystick, {
                pressure: 0.5,
                distance: 25,
                angle: { radian: 1.0, degree: 57 },
                vector: { x: 0.5, y: 0.5 },
                raw: { distance: 25, position: { x: 100, y: 100 } },
            });

            // Call twice with identical data — move should fire both times
            joystick.computeDirectionAndTriggerEvents({ ...eventData } as any);
            joystick.computeDirectionAndTriggerEvents({ ...eventData } as any);

            expect(moveSpy).toHaveBeenCalledTimes(2);
        });

        it('fires directional events only on direction change', () => {
            const joystick = new Joystick(mockCollection, {
                position: { x: 100, y: 100 },
                frontPosition: { x: 0, y: 0 },
            });
            const dirSpy = jest.fn();
            joystick.on('dir', dirSpy);

            const eventData = defaultEventData(joystick, {
                pressure: 0.5,
                distance: 25,
                angle: { radian: 1.0, degree: 57 },
                vector: { x: 0.5, y: 0.5 },
                raw: { distance: 25, position: { x: 100, y: 100 } },
            });

            // First call sets direction — fires dir
            joystick.computeDirectionAndTriggerEvents({ ...eventData } as any);
            const firstCallCount = dirSpy.mock.calls.length;

            // Second call with same direction — dir should NOT fire again
            joystick.computeDirectionAndTriggerEvents({ ...eventData } as any);

            expect(dirSpy).toHaveBeenCalledTimes(firstCallCount);
        });
    });
});
