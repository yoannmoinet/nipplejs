import type Factory from './Factory';
import Joystick from './Joystick';
import Super from './Super';
import { MODES } from './constants';
import type {
    CollectionOptions,
    JoystickEventData,
    DomEvent,
    Coordinates,
    AnyPosition,
    Uid,
    Identifier,
} from './types';
import * as u from './utils';

export class Collection extends Super {
    /**
     *  The static incremented ID of the Collections.
     * */
    static index: number = 0;
    /**
     *  The unique ID of this Collection instance.
     * */
    uid: Uid;
    /**
     *  The parent factory that created this Collection.
     * */
    factory: Factory;
    /**
     *  The options of this Collection.
     * */
    options: Required<CollectionOptions>;
    /**
     *  The list of all the Joysticks of this Collection.
     *
     *  Indexed by their uid.
     * */
    all: Map<Uid, Joystick> = new Map();
    /**
     *  The list of the idle Joysticks of this Collection.
     *
     *  Idle Joysticks are the ones that are not being moved by the user.
     *
     *  Indexed by their uid.
     * */
    idles: Set<Uid> = new Set();
    /**
     *  The list of the active Joysticks of this Collection.
     *
     *  Active Joysticks are the ones that are being moved or touched by the user.
     *
     *  Indexed by their event's identifier.
     * */
    actives: Map<Identifier, Joystick> = new Map();
    /**
     *  The list of the resting Joysticks of this Collection.
     *
     *  Resting Joysticks are the ones that are on their way out.
     *
     *  Keeping them here, just in case we get a new start before the end.
     *
     *  Indexed by their event's identifier.
     * */
    resting: Map<Identifier, Joystick> = new Map();
    /**
     *  Is the parent element of the Joysticks a flex container?
     * */
    parentIsFlex: boolean = false;
    /**
     *  The bounding box of the parent element of the Joysticks.
     * */
    box: DOMRect;
    /**
     *  ResizeObserver watching the zone element for automatic repositioning.
     * */
    private resizeObserver?: ResizeObserver;
    /**
     *  The default options of a Collection.
     * */
    defaults: Required<CollectionOptions> = {
        catchDistance: 200,
        color: 'white',
        dataOnly: false,
        dynamicPage: false,
        fadeTime: 250,
        follow: false,
        lockX: false,
        lockY: false,
        maxNumberOfJoysticks: 10,
        mode: MODES.dynamic,
        multitouch: false,
        position: { top: '0px', left: '0px' },
        restJoystick: true,
        restOpacity: 0.5,
        shape: 'circle',
        size: 100,
        threshold: 0.1,
        zone: document.body,
    };

    constructor(factory: Factory, options: CollectionOptions) {
        super('collection');
        this.factory = factory;
        this.uid = Collection.index++ as Uid;
        this.options = { ...this.defaults, ...options };

        // Overwrite the multitouch option if we are in static or semi modes.
        // As they cannot support multitouch.
        if (this.options.mode === MODES.static || this.options.mode === MODES.semi) {
            this.options.multitouch = false;
        }

        // Overwrite the maxNumberOfJoysticks in a non multitouch setup.
        if (!this.options.multitouch) {
            this.options.maxNumberOfJoysticks = 1;
        }

        // Compute the parentIsFlex value.
        const computedStyle =
            this.options.zone.parentElement && getComputedStyle(this.options.zone.parentElement);
        if (computedStyle?.display === 'flex') {
            this.parentIsFlex = true;
        }

        // Warn if the zone has no CSS positioning set.
        const zonePosition = getComputedStyle(this.options.zone).position;
        if (zonePosition === 'static') {
            this.warn(
                'The zone element has no CSS "position" set (it is "static").',
                'Joysticks may not be positioned correctly.',
                'Set "position: relative" (or absolute/fixed) on the zone element.',
            );
        }

        // Compute the bounding box of the zone.
        this.box = this.options.zone.getBoundingClientRect();

        // Bind the start event.
        this.bindEvt(this.options.zone, 'start', this.processOnStart);

        // Disable the default actions of touches (zooming, panning, etc...)
        // and prevent text selection while interacting with the joystick.
        u.extend(this.options.zone.style, {
            touchAction: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
        } as Partial<CSSStyleDeclaration>);

        // Automatically reposition when the zone element resizes.
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.reposition();
            });
            this.resizeObserver.observe(this.options.zone);
        }
    }

    init() {
        this.trigger('collectionCreated', this);

        // In static mode, we create our own static Joystick.
        if (this.options.mode === MODES.static) {
            const joystick = this.createJoystick(this.options.position);
            joystick.addToDom();
        }
    }

    getJoystickByUid(uid?: Uid): Joystick | undefined {
        // If we have no uid, we return the first Joystick.
        if (uid === undefined) {
            return this.all.values().next().value;
        }

        return this.all.get(uid);
    }

    private bindJoystick(joystick: Joystick) {
        // When a Joystick gets destroyed, we clean behind.
        joystick.on('joystickDestroyed', () => {
            this.deleteJoystickFromLists(joystick);
        });

        // When a Joystick gets attached, we move it from idle to active.
        joystick.on('attached', (evt) => {
            this.idles.delete(evt.data.joystick.uid);
            this.actives.set(evt.data.identifier, joystick);
        });

        // When a Joystick gets detached, we move it from active to idle.
        joystick.on('detached', (evt) => {
            this.idles.add(evt.data.joystick.uid);
            this.deleteIdentifierFromLists(evt.data.identifier);
        });

        // When a Joystick gets hidden, we move it from active to resting.
        joystick.on('end', (evt) => {
            if (u.isNumber(evt.data.identifier)) {
                this.actives.delete(evt.data.identifier);
                this.resting.set(evt.data.identifier, joystick);
            }
        });

        // When a Joystick gets hidden, we move it from resting to idle.
        joystick.on('hidden', (evt) => {
            if (u.isNumber(evt.data.identifier)) {
                this.resting.delete(evt.data.identifier);
            }
            this.idles.add(evt.data.uid);
        });

        // Other events that will get bubbled up.
        joystick.on('pressure', (evt) => {
            this.trigger(`pressure ${joystick.uid}:pressure`, evt.data);
        });
        joystick.on('attached detached', (evt) => {
            type EvtType = `attached${string}` & `detached${string}`;
            const type = `${evt.type} ${evt.data.joystick.uid}:${evt.type}`;
            this.trigger(type as EvtType, evt.data);
        });
        joystick.on(
            'added start shown hidden rested removed end joystickCreated joystickDestroyed',
            (evt) => {
                type EvtType = `added${string}` &
                    `start${string}` &
                    `shown${string}` &
                    `hidden${string}` &
                    `rested${string}` &
                    `removed${string}` &
                    `end${string}` &
                    `joystickCreated${string}` &
                    `joystickDestroyed${string}`;
                const type = `${evt.type} ${evt.data.uid}:${evt.type}`;
                this.trigger(type as EvtType, evt.data);
            },
        );
        joystick.on('move', (evt) => {
            this.trigger(`move ${evt.data.instance.uid}:move`, evt.data);
        });
        joystick.on('dir dir:up dir:right dir:down dir:left', (evt) => {
            const type = `${evt.type} ${evt.data.instance.uid}:${evt.type}`;
            this.trigger(type as `dir${string}`, evt.data);
        });
        joystick.on('plain plain:up plain:right plain:down plain:left', (evt) => {
            const type = `${evt.type} ${evt.data.instance.uid}:${evt.type}`;
            this.trigger(type as `plain${string}`, evt.data);
        });
    }

    private deleteJoystickFromLists(joystick: Joystick) {
        this.deleteUidFromLists(joystick.uid);
        if (u.isNumber(joystick.identifier)) {
            this.deleteIdentifierFromLists(joystick.identifier);
        }
    }

    private deleteUidFromLists(uid: Uid) {
        this.all.delete(uid);
        this.idles.delete(uid);
    }

    private deleteIdentifierFromLists(identifier: Identifier) {
        this.actives.delete(identifier);
        this.resting.delete(identifier);
    }

    private getOrCreate(position: Coordinates): Joystick {
        // In semi and static modes, we recycle the idle joystick.
        if (this.options.mode === MODES.semi || this.options.mode === MODES.static) {
            // If there is an idle joystick, we use it.
            const idleUid: Uid | undefined = this.idles.values().next().value;
            if (u.isNumber(idleUid)) {
                const joystick = this.all.get(idleUid);
                if (!joystick) {
                    this.error(`Couldn't find the joystick ${idleUid}. Creating a new one.`);
                    // Clean unbound uid.
                    this.deleteUidFromLists(idleUid);
                } else {
                    return joystick;
                }
            }

            // In semi mode, we may not have an idle joystick.
            // So we create a new one.
            if (this.options.mode === MODES.semi) {
                return this.createJoystick(position);
            }

            // This should never be reached.
            // Static mode should always have an idle joystick.
            this.warn("Couldn't find the expected joystick. Creating a new one.");
        }

        // Return a new joystick.
        return this.createJoystick(position);
    }

    private createJoystick(position: AnyPosition): Joystick {
        const scroll = this.factory.scroll;
        // Offset converts page-absolute coordinates to zone-relative.
        // In flex containers, absolute children are positioned relative to the
        // flex item's content box, so we only need scroll offset.
        const offset = {
            x: this.parentIsFlex ? scroll.x : scroll.x + this.box.left,
            y: this.parentIsFlex ? scroll.y : scroll.y + this.box.top,
        };

        // Two paths: numeric {x, y} from pointer events (dynamic/semi mode)
        // or CSS strings {top, left, ...} from options (static mode).
        let toApply: AnyPosition;
        let newPosition: Coordinates;

        if (u.isNumber(position.x) && u.isNumber(position.y)) {
            toApply = {
                x: position.x - offset.x,
                y: position.y - offset.y,
            };
            newPosition = {
                x: position.x,
                y: position.y,
            };
        } else if (position.top || position.right || position.bottom || position.left) {
            // Compute coordinates from given CssPosition by creating a stub element.
            const stub = document.createElement('DIV');
            u.extend(stub.style, {
                visibility: 'hidden',
                position: 'absolute',
                top: position.top,
                right: position.right,
                bottom: position.bottom,
                left: position.left,
            });

            // Add it to the dom to get its bounding box.
            this.options.zone.appendChild(stub);
            const stubBox = stub.getBoundingClientRect();
            // Then remove it.
            this.options.zone.removeChild(stub);

            toApply = position;
            // No offset needed — the stub is positioned inside the zone,
            // so stubBox.left already accounts for the zone's position.
            newPosition = {
                x: stubBox.left + scroll.x,
                y: stubBox.top + scroll.y,
            };
        } else {
            this.error('Invalid or missing position.', position);
            return undefined as unknown as Joystick;
        }

        const joystick = new Joystick(this, {
            color: this.options.color,
            size: this.options.size,
            threshold: this.options.threshold,
            fadeTime: this.options.fadeTime,
            dataOnly: this.options.dataOnly,
            restJoystick: this.options.restJoystick,
            restOpacity: this.options.restOpacity,
            mode: this.options.mode,
            // Page-absolute position of the joystick center.
            // Used to compute distance/angle in processOnMove and catchDistance in semi mode.
            position: newPosition!,
            zone: this.options.zone,
            frontPosition: {
                x: 0,
                y: 0,
            },
            shape: this.options.shape,
        });

        if (this.all.has(joystick.uid)) {
            this.error(`Joystick with uid ${joystick.uid} already exists.`);
        }

        if (!this.options.dataOnly) {
            // Position the Joystick at the right place.
            u.applyPosition(joystick.ui.el, toApply!);
            u.applyPosition(joystick.ui.front, joystick.frontPosition);
        }

        this.all.set(joystick.uid, joystick);
        this.idles.add(joystick.uid);
        this.bindJoystick(joystick);

        // Initialize the joystick.
        // We do this in order to have the events triggered by the joystick during initialisation caught by the collection.
        // Otherwise, if everything is done in the constructor, we can't listen for start/created events.
        joystick.init();

        return joystick;
    }

    processOnStart(evt: DomEvent, _depth: number = 0) {
        // Refresh the box position.
        this.box = this.options.zone.getBoundingClientRect();
        // If we don't have spots available, we stop right here.
        if (
            // Only if the event is already active.
            !this.actives.has(evt.identifier) &&
            this.actives.size >= this.options.maxNumberOfJoysticks
        ) {
            this.warn('No more joysticks allowed.');
            return;
        }

        // Get an existing joystick or create a new one.
        const joystick =
            this.actives.get(evt.identifier) ||
            this.resting.get(evt.identifier) ||
            this.getOrCreate(evt.position);

        const process = () => {
            // Show the joystick.
            joystick.start(evt.raw);
            // Attach joystick to its event.
            joystick.identifier = evt.identifier;
            // Trigger a first move.
            this.processOnMove(evt, true);
        };

        // In semi mode, we need to verify what to do, do we recycle (if we're in the catch distance),
        // or do we create a new one and delete the previous one?
        if (this.options.mode === MODES.semi) {
            const distance = u.distance(evt.position, joystick.position);
            if (distance <= this.options.catchDistance) {
                // We're in the catch distance, we keep this one.
                process();
            } else if (_depth < 3) {
                // We're too far, delete it and start over.
                joystick.destroy();
                this.processOnStart(evt, _depth + 1);
            } else {
                this.error('Max semi-mode recursion depth reached.');
            }
        } else {
            // In the other modes, we just process it.
            process();
        }
    }

    /**
     *  Whenever a move event happens.
     *
     *  This is called from the Factory.
     * */
    processOnMove(evt: DomEvent, animated: boolean = false) {
        const joystick = this.actives.get(evt.identifier);
        const scroll = this.factory.scroll;

        // Can happen in multitouch when more touches exist than maxNumberOfJoysticks —
        // processOnStart rejected the touch but Factory still dispatches move events for it.
        if (!joystick) {
            this.error(`Found zombie joystick onMove with identifier ${evt.identifier}`);
            this.deleteIdentifierFromLists(evt.identifier);
            return;
        }

        // If it's not pressed, and not on its way out, just process it as an end event instead.
        // It can happen if the joystick is in its resting animation.
        // if (!evt.pressure && !joystick.removeTimeout) {
        // this.error(
        //     `Found unpressed joystick ${joystick?.uid} for identifier ${evt.identifier}`,
        // );
        // this.processOnEnd(evt);
        // return;
        // }

        // If we're on a dynamic page, we need to refresh positions constantly.
        if (this.options.dynamicPage) {
            this.reposition();
        }

        const size = joystick.options.size / 2;
        // Position of the touch.
        let pos: Coordinates = {
            x: evt.position.x,
            y: evt.position.y,
        };

        // Freeze the direction we have locked.
        if (this.options.lockX) {
            pos.y = joystick.position.y;
        }
        if (this.options.lockY) {
            pos.x = joystick.position.x;
        }

        let dist = u.distance(pos, joystick.position);
        const angle = u.angle(pos, joystick.position);
        const rAngle = u.radians(angle);
        const force = dist / size;

        // Save the raw data pre-processing/clamping.
        const raw: { distance: number; position: Coordinates } = {
            distance: dist,
            position: pos,
        };

        let clamped_dist;
        let clamped_pos;

        if (joystick.options.shape === 'circle') {
            // In the case of a circle, the distance is the radius (eg. size) of our joystick.
            clamped_dist = Math.min(dist, size);
            // The clamped position is the coordinates of the clamped distance, from the center at the given angle.
            clamped_pos = u.findCoord(joystick.position, clamped_dist, angle);
        } else {
            // In the case of a square, we need to clamp the x and y separately.
            clamped_pos = u.clamp(pos, joystick.position, size);
            // The clamped distance becomes the distance between the clamped position and the center.
            clamped_dist = u.distance(clamped_pos, joystick.position);
        }

        let baseDelta = { x: 0, y: 0 };

        if (this.options.follow) {
            // If we want the joystick's basis to follow the touch when it reaches outside its bounds.
            if (dist > size) {
                const delta_x = pos.x - clamped_pos.x;
                const delta_y = pos.y - clamped_pos.y;
                baseDelta = { x: delta_x, y: -delta_y };
                // Move the joystick's basis to the touch's position.
                joystick.position.x += delta_x;
                joystick.position.y += delta_y;
                // Apply to the CSS.
                u.extend(joystick.ui.el.style, {
                    top: `${joystick.position.y - (this.box.top + scroll.y)}px`,
                    left: `${joystick.position.x - (this.box.left + scroll.x)}px`,
                });

                // Compute the new distance.
                dist = u.distance(pos, joystick.position);
                // No need to apply the clamped position, as we're following the touch.
            }
        } else {
            // Apply the clamped measures.
            pos = clamped_pos;
            dist = clamped_dist;
        }

        // Move the nibble of the joystick.
        const xPosition = pos.x - joystick.position.x;
        const yPosition = pos.y - joystick.position.y;

        joystick.frontPosition = {
            x: xPosition,
            y: yPosition,
        };

        // Apply the transformation to the nibble if we're not data only.
        if (!this.options.dataOnly) {
            if (animated) {
                joystick.setTransition(true, () => {
                    joystick.setTransition(false);
                });
            }
            joystick.ui.front.style.transform = `translate(${xPosition}px,${yPosition}px)`;
        }

        // Prepare the event.
        const toSend: JoystickEventData = {
            position: pos,
            force,
            pressure: evt.pressure,
            distance: dist,
            angle: {
                radian: rAngle,
                degree: angle,
            },
            vector: {
                x: xPosition / size,
                y: -yPosition / size,
            },
            raw,
            instance: joystick,
            lockX: this.options.lockX,
            lockY: this.options.lockY,
            baseDelta,
        };

        joystick.computeDirectionAndTriggerEvents(toSend);
    }

    processOnEnd(evt: DomEvent) {
        const joystick = this.actives.get(evt.identifier);

        // This should not happen.
        if (!joystick) {
            this.error(`Found zombie joystick onEnd with identifier ${evt.identifier}`);
            this.deleteIdentifierFromLists(evt.identifier);
            return;
        }

        // We hide the joystick.
        joystick.end();
    }

    /**
     * Recalculate the zone bounding box and all joystick positions.
     * Call this after the zone element has been moved, resized, or
     * when its layout has changed (e.g. entering fullscreen).
     * This is a lighter alternative to `dynamicPage: true` which
     * recalculates on every move event.
     */
    reposition() {
        // Refresh scroll position in case layout context changed (e.g. fullscreen)
        this.factory.scroll = u.getScroll();
        this.box = this.options.zone.getBoundingClientRect();
        const scroll = this.factory.scroll;
        this.all.forEach((joystick) => {
            if (joystick.options.dataOnly) {
                return;
            }
            const elBox = joystick.ui.el.getBoundingClientRect();
            joystick.position = {
                x: scroll.x + elBox.left,
                y: scroll.y + elBox.top,
            };
        });
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = undefined;
        }
        this.unbindEvt(this.options.zone, 'start', this.processOnStart);
        // Destroy all joysticks.
        this.all.forEach((joystick) => {
            joystick.destroy();
        });

        // Empty the lists.
        this.all.clear();
        this.idles.clear();
        this.actives.clear();
        this.resting.clear();

        // Events.
        this.trigger('collectionDestroyed', this);
        this.off();
    }
}

export default Collection;
