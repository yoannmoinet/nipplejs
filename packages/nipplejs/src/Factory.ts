import Collection from './Collection';
import Super from './Super';
import type { InternalEvent, CollectionOptions, DomEvent } from './types';
import * as u from './utils';

export default class Factory extends Super {
    // TODO: Make this a map.
    ids: { [identifier: number]: number } = {};
    index: number = 0;
    scroll: { x: number; y: number } = u.getScroll();
    private binded: boolean = false;
    private collections: Collection[] = [];

    constructor() {
        super();
        this.bindResize();
        this.bindScroll();
    }

    // Listen for resize, to reposition every joysticks
    private bindResize() {
        const resizeHandler = () => {
            this.collections.forEach((collection) => {
                collection.all.forEach((nipple) => {
                    const pos = nipple.ui.el.getBoundingClientRect();
                    nipple.position = {
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
    // Not used internally.
    // TODO: Verify if this is actually useful.
    getJoystick(identifier: number) {
        for (const coll of this.collections) {
            // TODO: Could be optimised using Map or Set.
            if (coll.ids.includes(identifier)) {
                return coll.getJoystick(identifier);
            }
        }
    }

    // Collection Factory
    create(options: CollectionOptions): Collection {
        const collection = new Collection(this, options);

        this.bindCollection(collection);
        this.collections.push(collection);

        return collection;
    }

    private bindCollection(collection: Collection) {
        // Bubble up identified events.

        // When a collection gets destroyed
        // we clean behind.
        collection.on('destroyed', (evt: InternalEvent<Collection>) => {
            const coll = evt.data;
            if (this.collections.indexOf(coll) < 0) {
                return false;
            }
            this.collections.splice(this.collections.indexOf(coll), 1);
        });

        // Other events that will get bubbled up.
        collection.on('shown hidden rested', (evt) => {
            const type = `${evt.type} ${evt.data.id}:${evt.type}`;
            this.trigger(type as `shown${string}`, evt.data);
        });
        collection.on('dir dir:up dir:right dir:down dir:left', (evt) => {
            const type = `${evt.type} ${evt.data.identifier}:${evt.type}`;
            this.trigger(type as `dir${string}`, evt.data);
        });
        collection.on('plain plain:up plain:right plain:down plain:left', (evt) => {
            const type = `${evt.type} ${evt.data.identifier}:${evt.type}`;
            this.trigger(type as `plain${string}`, evt.data);
        });
    }

    bindDocument() {
        // Bind only if not already binded
        if (!this.binded) {
            this.bindEvt(document, 'move', this.onmove);
            this.bindEvt(document, 'end', this.onend);
            this.binded = true;
        }
    }

    unbindDocument(force: boolean = false) {
        // If there are no touch left unbind the document.
        if (!Object.keys(this.ids).length || force === true) {
            this.unbindEvt(document, 'move', this.onmove);
            this.unbindEvt(document, 'end', this.onend);
            this.binded = false;
        }
    }

    // Get an incremented id.
    // Abstraction layer over the evt.identifier.
    // TODO: Verify if this is actually useful.
    getId(identifier: number) {
        if (this.ids[identifier] === undefined) {
            this.ids[identifier] = this.index++;
        }

        return this.ids[identifier];
    }

    removeId(identifier: number) {
        if (this.ids[identifier]) {
            const removed = { id: this.ids[identifier], identifier };
            delete this.ids[identifier];
            return removed;
        }
    }

    private onmove(evt: DomEvent) {
        this.handleEventInCollection(evt, (coll) => {
            coll.processOnMove(evt);
        });
    }

    private onend(evt: DomEvent) {
        this.handleEventInCollection(evt, (coll) => {
            coll.processOnEnd(evt);
        });
    }

    // TODO: Verify if this is actually called.
    // private oncancel(evt: DomEvent) {
    //     this.handleEventInCollection(evt, (coll) => {
    //         coll.processOnEnd(evt);
    //     });
    // }

    private handleEventInCollection(evt: DomEvent, cb: (coll: Collection) => void) {
        let collectionFound = false;

        const id = this.getId(evt.identifier);
        for (const coll of this.collections) {
            if (!coll.ids.includes(id)) {
                continue;
            }

            // Run the collection's handler.
            cb(coll);
            // Mark the event to avoid cleaning it later.
            collectionFound = true;
        }

        // If the event isn't handled by any collection,
        // we need to clean its identifier.
        if (!collectionFound) {
            this.removeId(evt.identifier);
        }
    }

    // Cleanly destroy the factory
    destroy() {
        this.unbindDocument(true);
        this.ids = {};
        this.index = 0;
        this.collections.forEach((collection) => {
            collection.destroy();
        });
        this.off();
    }
}
