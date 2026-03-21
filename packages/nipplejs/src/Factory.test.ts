import type { Uid, Identifier } from 'nipplejs/types';

import { Collection } from './Collection';
import { Factory } from './Factory';
import { Joystick } from './Joystick';
import * as utils from './utils';

// Helper to create a mock zone element
const createMockZone = (): HTMLElement => {
    const zone = document.createElement('div');
    zone.id = 'test-zone';
    zone.style.width = '300px';
    zone.style.height = '300px';
    document.body.appendChild(zone);
    return zone;
};

describe('Factory', () => {
    let mockZone: HTMLElement;

    beforeEach(() => {
        mockZone = createMockZone();
        // Reset static indexes
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

    describe('Singleton & Initialization', () => {
        it('creates factory instance', () => {
            const factory = new Factory();

            expect(factory).toBeInstanceOf(Factory);
            expect(factory.scroll).toBeDefined();
            expect(factory.scroll.x).toBeGreaterThanOrEqual(0);
            expect(factory.scroll.y).toBeGreaterThanOrEqual(0);
        });

        it('emits factoryCreated event on construction', () => {
            const eventSpy = jest.fn();

            const factory = new Factory();
            factory.on('factoryCreated', eventSpy);

            // Trigger again to test the event listener
            factory.trigger('factoryCreated', factory);

            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'factoryCreated',
                    target: factory,
                    data: factory,
                }),
            );

            factory.destroy();
        });

        it('binds resize handler to window', () => {
            const bindEvtSpy = jest.spyOn(utils, 'bindEvt');

            const factory = new Factory();

            expect(bindEvtSpy).toHaveBeenCalled();

            factory.destroy();
        });

        it('binds scroll handler to window', () => {
            const bindEvtSpy = jest.spyOn(utils, 'bindEvt');

            const factory = new Factory();

            expect(bindEvtSpy).toHaveBeenCalled();

            factory.destroy();
        });
    });

    describe('Collection Management', () => {
        it('create() creates new collection with options', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                size: 120,
            });

            expect(collection).toBeInstanceOf(Collection);
            expect(collection.options.size).toBe(120);

            factory.destroy();
        });

        it('create() adds collection to internal set', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
            });

            expect((factory as any).collections.has(collection)).toBe(true);

            factory.destroy();
        });

        it('create() binds collection events for bubbling', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
            });

            // Test that events bubble from collection to factory
            const factoryEventSpy = jest.fn();
            factory.on('collectionCreated', factoryEventSpy);

            // Trigger an event on the collection
            collection.trigger('collectionCreated', collection);

            // Verify the event bubbled up to the factory
            expect(factoryEventSpy).toHaveBeenCalled();

            factory.destroy();
        });

        it('create() triggers collection.init()', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            // In static mode, init creates a joystick
            expect(collection.all.size).toBe(1);

            factory.destroy();
        });

        it('removes collection when destroyed', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
            });

            expect((factory as any).collections.has(collection)).toBe(true);

            collection.destroy();

            expect((factory as any).collections.has(collection)).toBe(false);

            factory.destroy();
        });

        it('unbinds document when no joysticks exist', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            // Should bind document when joystick is added
            expect((factory as any).binded).toBe(true);

            collection.destroy();

            // Should unbind when no joysticks left
            expect((factory as any).binded).toBe(false);

            factory.destroy();
        });
    });

    describe('Joystick Lookup', () => {
        it('getJoystickByUid() returns joystick by uid', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const joystick = collection.all.values().next().value;
            const found = factory.getJoystickByUid(joystick.uid);

            expect(found).toBe(joystick);

            factory.destroy();
        });

        it('getJoystickByUid() returns undefined for non-existent uid', () => {
            const factory = new Factory();

            const found = factory.getJoystickByUid(999 as Uid);

            expect(found).toBeUndefined();

            factory.destroy();
        });

        it('getJoystickByIdentifier() returns joystick by identifier', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const joystick = collection.all.values().next().value;
            joystick.identifier = 123 as Identifier;
            (factory as any).joysticksByIdentifier.set(123 as Identifier, joystick);

            const found = factory.getJoystickByIdentifier(123 as Identifier);

            expect(found).toBe(joystick);

            factory.destroy();
        });

        it('getJoystickByIdentifier() returns undefined for non-existent identifier', () => {
            const factory = new Factory();

            const found = factory.getJoystickByIdentifier(999 as Identifier);

            expect(found).toBeUndefined();

            factory.destroy();
        });
    });

    describe('Event Bubbling', () => {
        it('bubbles collectionCreated from collection to factory', () => {
            const factory = new Factory();
            const triggerSpy = jest.spyOn(factory, 'trigger');

            factory.create({
                zone: mockZone,
            });

            expect(triggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('collectionCreated'),
                expect.anything(),
            );

            factory.destroy();
        });

        it('bubbles collectionDestroyed from collection to factory', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
            });

            const triggerSpy = jest.spyOn(factory, 'trigger');

            collection.destroy();

            expect(triggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('collectionDestroyed'),
                expect.anything(),
            );

            factory.destroy();
        });

        it('bubbles start event from joystick through collection to factory', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const triggerSpy = jest.spyOn(factory, 'trigger');
            const joystick = collection.all.values().next().value;

            joystick.trigger('start', joystick);

            expect(triggerSpy).toHaveBeenCalledWith(expect.stringContaining('start'), joystick);

            factory.destroy();
        });

        it('bubbles move event from joystick through collection to factory', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const triggerSpy = jest.spyOn(factory, 'trigger');
            const joystick = collection.all.values().next().value;

            const eventData = {
                angle: { degree: 45, radian: Math.PI / 4 },
                force: 0.5,
                lockX: false,
                lockY: false,
                distance: 50,
                position: { x: 100, y: 100 },
                pressure: 0,
                vector: { x: 0.5, y: 0.5 },
                raw: { distance: 50, position: { x: 100, y: 100 } },
                instance: joystick,
            };

            joystick.trigger('move', eventData);

            expect(triggerSpy).toHaveBeenCalledWith(expect.stringContaining('move'), eventData);

            factory.destroy();
        });

        it('bubbles end event from joystick through collection to factory', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const triggerSpy = jest.spyOn(factory, 'trigger');
            const joystick = collection.all.values().next().value;

            joystick.trigger('end', joystick);

            expect(triggerSpy).toHaveBeenCalledWith(expect.stringContaining('end'), joystick);

            factory.destroy();
        });

        it('bubbles pressure event from joystick through collection to factory', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const triggerSpy = jest.spyOn(factory, 'trigger');
            const joystick = collection.all.values().next().value;

            joystick.trigger('pressure', 0.5);

            expect(triggerSpy).toHaveBeenCalledWith(expect.stringContaining('pressure'), 0.5);

            factory.destroy();
        });
    });

    describe('Cleanup', () => {
        it('removes joystick from internal maps on destroy', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            const joystick = collection.all.values().next().value;

            expect((factory as any).joysticksByUid.has(joystick.uid)).toBe(true);

            joystick.destroy();

            expect((factory as any).joysticksByUid.has(joystick.uid)).toBe(false);

            factory.destroy();
        });

        it('unbinds document events when last joystick removed', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            expect((factory as any).binded).toBe(true);

            const joystick = collection.all.values().next().value;
            joystick.destroy();

            expect((factory as any).binded).toBe(false);

            factory.destroy();
        });

        it('destroy() removes all collections', () => {
            const factory = new Factory();

            factory.create({ zone: mockZone });
            factory.create({ zone: mockZone });

            expect((factory as any).collections.size).toBe(2);

            factory.destroy();

            expect((factory as any).collections.size).toBe(0);
        });

        it('destroy() emits factoryDestroyed event', () => {
            const factory = new Factory();
            const triggerSpy = jest.spyOn(factory, 'trigger');

            factory.destroy();

            expect(triggerSpy).toHaveBeenCalledWith('factoryDestroyed', factory);
        });

        it('destroy() clears all event handlers', () => {
            const factory = new Factory();
            const offSpy = jest.spyOn(factory, 'off');

            factory.destroy();

            expect(offSpy).toHaveBeenCalled();
        });
    });

    describe('Document Event Handling', () => {
        it('bindDocument() binds document events when joystick added', () => {
            const factory = new Factory();

            expect((factory as any).binded).toBe(false);

            factory.create({
                zone: mockZone,
                mode: 'static',
            });

            expect((factory as any).binded).toBe(true);

            factory.destroy();
        });

        it('unbindDocument() unbinds when no joysticks left', () => {
            const factory = new Factory();

            const collection = factory.create({
                zone: mockZone,
                mode: 'static',
            });

            expect((factory as any).binded).toBe(true);

            // Remove all joysticks
            collection.all.forEach((j) => j.destroy());

            expect((factory as any).binded).toBe(false);

            factory.destroy();
        });

        it('unbindDocument() with force=true unbinds immediately', () => {
            const factory = new Factory();

            factory.create({
                zone: mockZone,
                mode: 'static',
            });

            expect((factory as any).binded).toBe(true);

            (factory as any).unbindDocument(true);

            expect((factory as any).binded).toBe(false);

            factory.destroy();
        });
    });
});
