import Collection from './Collection';
import type Joystick from './Joystick';
import Super from './Super';
import { MODES } from './constants';
import type { CollectionOptions, DomEvent, Identifier, Uid } from './types';
import * as u from './utils';

export default class Factory extends Super {
    scroll: { x: number; y: number } = u.getScroll();
    private binded: boolean = false;
    private joysticksByUid: Map<Uid, Joystick> = new Map();
    private joysticksByIdentifier: Map<Identifier, Joystick> = new Map();
    private collections: Set<Collection> = new Set();

    constructor() {
        super('factory');
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

    // Get a joystick from its uid.
    // Public API, not used internally.
    getJoystickByUid(uid: Uid) {
        return this.joysticksByUid.get(uid);
    }

    // Get a joystick from its identifier.
    // Public API, not used internally.
    getJoystickByIdentifier(identifier: Identifier) {
        return this.joysticksByIdentifier.get(identifier);
    }

    // Collection Factory
    create(options: CollectionOptions): Collection {
        const collection = new Collection(this, options);

        this.bindCollection(collection);
        this.collections.add(collection);

        return collection;
    }

    private removeJoystickFromLists(joystick: Joystick) {
        this.joysticksByUid.delete(joystick.uid);
        if (u.isNumber(joystick.identifier)) {
            this.joysticksByIdentifier.delete(joystick.identifier);
        }
    }

    private bindCollection(collection: Collection) {
        // When a collection gets destroyed, we clean behind.
        collection.on('collectionDestroyed', (evt) => {
            // Clean local lists.
            this.collections.delete(evt.data);
            evt.data.all.forEach((joystick) => {
                this.removeJoystickFromLists(joystick);
            });
            this.unbindDocument();
        });

        collection.on('joystickDestroyed', (evt) => {
            this.removeJoystickFromLists(evt.data);
            this.unbindDocument();
        });

        collection.on('end', (evt) => {
            if (u.isNumber(evt.data.identifier)) {
                this.joysticksByIdentifier.delete(evt.data.identifier);
            }
            this.unbindDocument();
        });

        collection.on('added', (evt) => {
            this.joysticksByUid.set(evt.data.uid, evt.data);
            this.bindDocument();
        });

        collection.on('attached', (evt) => {
            this.joysticksByIdentifier.set(evt.data.identifier, evt.data.joystick);
        });

        // collection.on('detached', (evt) => {
        //     this.joysticksByIdentifier.delete(evt.data.identifier);
        // });

        // Other events that we bubble up.
        // TODO: See if we can factorise with Collection.bindCollection.
        collection.on('pressure', (evt) => {
            this.trigger(`pressure ${evt.target.uid}:pressure`, evt.data);
        });
        collection.on('collectionDestroyed', (evt) => {
            const type = `${evt.type} ${evt.data.uid}:${evt.type}`;
            this.trigger(type as `collectionDestroyed${string}`, evt.data);
        });
        collection.on('attached detached', (evt) => {
            const type = `${evt.type} ${evt.data.joystick.uid}:${evt.type}`;
            this.trigger(type as `attached${string}` & `detached${string}`, evt.data);
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
            const type = `${evt.type} ${evt.data.uid}:${evt.type}`;
            this.trigger(type as EvtType, evt.data);
        });
        collection.on('move', (evt) => {
            this.trigger(`move ${evt.data.instance.uid}:move`, evt.data);
        });
        collection.on('dir dir:up dir:right dir:down dir:left', (evt) => {
            const type = `${evt.type} ${evt.data.instance.uid}:${evt.type}`;
            this.trigger(type as `dir${string}`, evt.data);
        });
        collection.on('plain plain:up plain:right plain:down plain:left', (evt) => {
            const type = `${evt.type} ${evt.data.instance.uid}:${evt.type}`;
            this.trigger(type as `plain${string}`, evt.data);
        });
    }

    cleanInactiveTouches(evt: DomEvent) {
        const toucheIdentifiers =
            'touches' in evt.initial
                ? Array.from(evt.initial.touches).map((t) => t.identifier)
                : [evt.identifier];

        // Make some place in the other touches that may be dormant.
        // Search within our Factory's joysticks.
        for (const [identifier, joystick] of this.joysticksByIdentifier) {
            // No need to clean if the collection is static or semi.
            if (joystick.collection.options.mode !== MODES.dynamic) {
                continue;
            }

            // If we don't find a saved identifier in the list of touches
            // that are currently active on the event,
            // we trigger an end event on it.
            if (!toucheIdentifiers.includes(identifier)) {
                if (!joystick) {
                    this.error(`No collection found for cleaning identifier ${identifier}`);
                    return;
                }

                joystick.collection.processOnEnd(
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
            this.bindEvt(document, 'pressure', this.onpressure);
            this.binded = true;
        }
    }

    unbindDocument(force: boolean = false) {
        // If there are no touch left unbind the document.
        if (this.binded && (!this.joysticksByUid.size || force === true)) {
            this.unbindEvt(document, 'start', this.onstart);
            this.unbindEvt(document, 'move', this.onmove);
            this.unbindEvt(document, 'end', this.onend);
            this.unbindEvt(document, 'pressure', this.onpressure);
            this.binded = false;
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
        // Proceed with each collection.
        this.handleEventInCollection(evt, (coll) => {
            coll.processOnEnd(evt);
        });
    }

    private onpressure(evt: DomEvent) {
        evt.initial.preventDefault();
        const joystick = this.joysticksByIdentifier.get(evt.identifier);
        if (!joystick) {
            this.error(`No joystick found for pressure event ${evt.identifier}`);
            return;
        }
        joystick.pressure = evt.pressure;
    }

    private handleEventInCollection(evt: DomEvent, cb: (coll: Collection) => void) {
        const joystick = this.joysticksByIdentifier.get(evt.identifier);

        // If the event doesn't have any joystick, we don't call any.
        if (!joystick) {
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
