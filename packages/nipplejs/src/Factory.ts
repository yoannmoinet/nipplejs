import Collection from './Collection';
import type Joystick from './Joystick';
import Super from './Super';
import { MODES } from './constants';
import type { CollectionOptions, DomEvent } from './types';
import * as u from './utils';

export default class Factory extends Super {
    scroll: { x: number; y: number } = u.getScroll();
    private binded: boolean = false;
    private joysticks: Map<number, { joystick: Joystick; collection: Collection }> = new Map();
    private collections: Set<Collection> = new Set();

    constructor() {
        super();
        this.bindResize();
        this.bindScroll();
    }

    // Listen for resize, to reposition every joysticks
    private bindResize() {
        const resizeHandler = () => {
            this.collections.forEach((collection) => {
                collection.all.forEach((joystick) => {
                    const pos = joystick.ui.el.getBoundingClientRect();
                    joystick.position = {
                        x: this.scroll.x + pos.left,
                        y: this.scroll.y + pos.top,
                    };
                });
            });
        };
        u.bindEvt(window, 'resize', () => {
            u.throttle(resizeHandler);
        });
    }

    // Listen for scrolls, so we have a global scroll value
    // without having to request it all the time.
    private bindScroll() {
        const scrollHandler = () => {
            this.scroll = u.getScroll();
        };
        u.bindEvt(window, 'scroll', () => {
            u.throttle(scrollHandler);
        });
    }

    // Get a joystick from its identifier.
    // Public API, not used internally.
    // TODO: Verify if this is actually useful.
    getJoystick(identifier: number) {
        for (const coll of this.collections) {
            // TODO: Could be optimised using Map or Set.
            if (coll.all.has(identifier)) {
                return coll.all.get(identifier);
            }
        }
    }

    // Collection Factory
    create(options: CollectionOptions): Collection {
        const collection = new Collection(this, options);

        this.bindCollection(collection);
        this.collections.add(collection);

        return collection;
    }

    // TODO: See if we can factorise with Collection.bindCollection.
    private bindCollection(collection: Collection) {
        // Bubble up identified events.

        // When a collection gets destroyed
        // we clean behind.
        collection.on('collectionDestroyed', (evt) => {
            // Clean local lists.
            this.collections.delete(evt.data);
            evt.data.all.forEach((joystick) => {
                this.joysticks.delete(joystick.identifier);
            });
            this.unbindDocument();
        });

        collection.on('joystickDestroyed', (evt) => {
            this.joysticks.delete(evt.data.identifier);
            this.unbindDocument();
        });

        collection.on('end', () => {
            this.unbindDocument();
        });

        collection.on('added', (evt) => {
            this.joysticks.set(evt.data.identifier, { collection, joystick: evt.data });
            this.bindDocument();
        });

        // Other events that we bubble up.
        collection.on('pressure', (evt) => {
            this.trigger(`pressure ${evt.target.uid}:pressure`, evt.data);
        });
        collection.on('collectionDestroyed', (evt) => {
            const type = `${evt.type} ${evt.target.uid}:${evt.type}`;
            this.trigger(type as `collectionDestroyed${string}`, evt.data);
        });
        collection.on('added start shown hidden rested removed end joystickDestroyed', (evt) => {
            type EvtType = `added${string}` &
                `start${string}` &
                `shown${string}` &
                `hidden${string}` &
                `rested${string}` &
                `removed${string}` &
                `end${string}` &
                `joystickDestroyed${string}`;
            const type = `${evt.type} ${evt.target.uid}:${evt.type}`;
            this.trigger(type as EvtType, evt.data);
        });
        collection.on('move', (evt) => {
            this.trigger(`move ${evt.target.uid}:move`, evt.data);
        });
        collection.on('dir dir:up dir:right dir:down dir:left', (evt) => {
            const type = `${evt.type} ${evt.target.uid}:${evt.type}`;
            this.trigger(type as `dir${string}`, evt.data);
        });
        collection.on('plain plain:up plain:right plain:down plain:left', (evt) => {
            const type = `${evt.type} ${evt.target.uid}:${evt.type}`;
            this.trigger(type as `plain${string}`, evt.data);
        });
    }

    cleanInactiveTouches(evt: DomEvent) {
        if (!evt.isTouch) {
            return;
        }

        const toucheIdentifiers =
            'touches' in evt.initial
                ? Array.from(evt.initial.touches).map((t) => t.identifier)
                : [];

        // Make some place in the other touches that may be dormant.
        // Search within our Factory's joysticks.
        for (const [identifier, { collection, joystick }] of this.joysticks) {
            // No need to clean if the collection is static or semi.
            if (collection.options.mode !== MODES.dynamic) {
                continue;
            }

            // If we don't find a saved identifier in the list of touches
            // that are currently active on the event,
            // we trigger an end event on it.
            if (!toucheIdentifiers.includes(identifier)) {
                if (!joystick) {
                    console.error(`No collection found for cleaning identifier ${identifier}`);
                    return;
                }

                collection.processOnEnd(
                    u.processEvent(evt.initial, {
                        ...evt.raw,
                        // Re-use the event but spoof it's identifier with the inactive one.
                        identifier,
                    }),
                );
            }
        }
    }

    bindDocument() {
        // Bind only if not already binded
        if (!this.binded) {
            this.bindEvt(document, 'start', this.onstart);
            this.bindEvt(document, 'move', this.onmove);
            this.bindEvt(document, 'end', this.onend);
            this.binded = true;
        }
    }

    unbindDocument(force: boolean = false) {
        // If there are no touch left unbind the document.
        if (this.binded && (!this.joysticks.size || force === true)) {
            this.unbindEvt(document, 'start', this.onstart);
            this.unbindEvt(document, 'move', this.onmove);
            this.unbindEvt(document, 'end', this.onend);
            this.binded = false;
        }
    }

    getCollectionFromIdentifier(identifier: number) {
        for (const coll of this.collections) {
            if (coll.all.has(identifier)) {
                return coll;
            }
        }
    }

    private onstart(evt: DomEvent) {
        // Each collection handles its own start event on their respective zones.
        // Clean the inactive touches.
        this.cleanInactiveTouches(evt);
    }

    private onmove(evt: DomEvent) {
        this.handleEventInCollection(evt, (coll) => {
            coll.processOnMove(evt);
        });
    }

    private onend(evt: DomEvent) {
        // Clean the inactive touches.
        this.cleanInactiveTouches(evt);
        this.handleEventInCollection(evt, (coll) => {
            coll.processOnEnd(evt);
        });
    }

    private handleEventInCollection(evt: DomEvent, cb: (coll: Collection) => void) {
        const joystick = this.joysticks.get(evt.identifier);
        // If the event isn't handled by any collection,
        // we need to clean its identifier.
        if (!joystick) {
            console.error(
                `No collection found for event ${evt.type} on identifier ${evt.identifier}`,
            );
            this.joysticks.delete(evt.identifier);
            return;
        }
        cb(joystick.collection);
    }

    // Cleanly destroy the factory
    destroy() {
        this.unbindDocument(true);
        this.collections.forEach((collection) => {
            collection.destroy();
        });
        // Clear all the event listeners.
        this.off();
    }
}
