import type Factory from './Factory';
import Joystick from './Joystick';
import Super from './Super';
import { MODES } from './constants';
import type {
    CollectionOptions,
    JoystickEventData,
    InternalEvent,
    DomEvent,
    Coordinates,
    AnyPosition,
} from './types';
import * as u from './utils';

export default class Collection extends Super {
    /**
     *  The static incremented ID of the Collections.
     * */
    static id: number = 0;
    /**
     *  The ID of this Collection instance.
     * */
    id: number;
    /**
     *  The list of Joystick identifiers this Collection manage.
     * */
    identifiers: number[] = [];
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
     * */
    all: Joystick[] = [];
    /**
     *  The list of the idle Joysticks of this Collection.
     *  Idle Joysticks are the ones that are not being moved by the user.
     * */
    idles: Joystick[] = [];
    /**
     *  The list of the active Joysticks of this Collection.
     *  Active Joysticks are the ones that are being moved or touched by the user.
     * */
    actives: Joystick[] = [];
    /**
     *  The list of the setInterval IDs that we use to monitor pressure on the Joysticks.
     *  Used to clear the intervals when the Joystick is destroyed.
     * */
    pressureIntervals: Record<number, number> = {};
    /**
     *  Is the parent element of the Joysticks a flex container?
     * */
    parentIsFlex: boolean = false;
    /**
     *  The bounding box of the parent element of the Joysticks.
     * */
    box: DOMRect;
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
        super();
        this.factory = factory;
        this.id = Collection.id++;
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

        // Compute the bounding box of the zone.
        this.box = this.options.zone.getBoundingClientRect();

        // Bind the start event.
        this.bindEvt(this.options.zone, 'start', this.onStart);

        // Disable the default actions of touches. (zooming, panning, etc...)
        u.extend(this.options.zone.style, {
            touchAction: 'none',
            // @ts-expect-error - msTouchAction is not a known type
            msTouchAction: 'none',
        });

        // In static mode, we create our own static Joystick.
        if (this.options.mode === MODES.static) {
            const joystick = this.createJoystick(
                this.options.position,
                // Passing an arbitrary identifier, since it's the only Joystick we'll have.
                this.factory.getId(this.factory.index),
            );
            joystick.addToDom();
            this.idles.push(joystick);
        }
    }

    // TODO: Use Map or Object for all, idles and actives for easier lookup.
    // TODO: Use a Set for identifiers.
    getJoystick(identifier?: number): Joystick | undefined {
        // If we have no identifier, we return the first Joystick.
        if (identifier === undefined) {
            return this.all[0];
        }

        for (const joystick of this.all) {
            if (joystick.identifier === identifier) {
                return joystick;
            }
        }
    }

    private createJoystick(position: AnyPosition, identifier: number): Joystick {
        const scroll = this.factory.scroll;
        // In case of a flex container, the position is relative to the container.
        const offset = {
            x: this.parentIsFlex ? scroll.x : scroll.x + this.box.left,
            y: this.parentIsFlex ? scroll.y : scroll.y + this.box.top,
        };

        // FIXME: This process feels wonky, desperate need of a rewrite.
        let toApply: AnyPosition;
        let newPosition: Coordinates;

        if (position.x && position.y) {
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
                display: 'hidden',
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
            newPosition = {
                x: stubBox.left + scroll.x,
                y: stubBox.top + scroll.y,
            };
        } else {
            // TODO: Verify we never get there.
            console.error('Invalid or missing position.', position);
        }

        // TODO: Maybe get one that may already exists.
        const joystick = new Joystick(this, {
            color: this.options.color,
            size: this.options.size,
            threshold: this.options.threshold,
            fadeTime: this.options.fadeTime,
            dataOnly: this.options.dataOnly,
            restJoystick: this.options.restJoystick,
            restOpacity: this.options.restOpacity,
            mode: this.options.mode,
            identifier,
            position: newPosition!,
            zone: this.options.zone,
            frontPosition: {
                x: 0,
                y: 0,
            },
            shape: this.options.shape,
        });

        if (!this.options.dataOnly) {
            // Position the Joystick at the right place.
            u.applyPosition(joystick.ui.el, toApply!);
            u.applyPosition(joystick.ui.front, joystick.frontPosition);
        }

        this.all.push(joystick);
        this.trigger(`added ${joystick.identifier}:added`, joystick);
        this.factory.trigger(`added ${joystick.identifier}:added`, joystick);

        this.bindJoystick(joystick);

        return joystick;
    }

    // TODO: See if we can factorise with Factory.bindCollection.
    private bindJoystick(joystick: Joystick) {
        // Bubble up identified events.

        // When a Joystick gets destroyed
        // We clean behind.
        joystick.on('destroyed', this.onDestroyed.bind(this));

        // Other events that will get bubbled up.
        joystick.on('start shown hidden rested', (evt) => {
            type EvtType = `start${string}` &
                `shown${string}` &
                `hidden${string}` &
                `rested${string}`;
            const type = `${evt.type} ${evt.data.id}:${evt.type}`;
            this.trigger(type as EvtType, evt.data);
        });
        joystick.on('dir dir:up dir:right dir:down dir:left', (evt) => {
            const type = `${evt.type} ${evt.data.identifier}:${evt.type}`;
            this.trigger(type as `dir${string}`, evt.data);
        });
        joystick.on('plain plain:up plain:right plain:down plain:left', (evt) => {
            const type = `${evt.type} ${evt.data.identifier}:${evt.type}`;
            this.trigger(type as `plain${string}`, evt.data);
        });
    }

    private onDestroyed(evt: InternalEvent<Joystick>) {
        const target = evt.data;
        if (this.all.indexOf(target) >= 0) {
            this.all.splice(this.all.indexOf(target), 1);
        }
        if (this.actives.indexOf(target) >= 0) {
            this.actives.splice(this.actives.indexOf(target), 1);
        }
        if (this.idles.indexOf(target) >= 0) {
            this.idles.splice(this.idles.indexOf(target), 1);
        }
        if (this.identifiers.indexOf(target.identifier) >= 0) {
            this.identifiers.splice(this.identifiers.indexOf(target.identifier), 1);
        }

        this.factory.removeId(target.identifier);

        this.factory.unbindDocument();
    }

    private onStart(evt: DomEvent) {
        // Refresh the box position.
        this.box = this.options.zone.getBoundingClientRect();

        // If we're above our limit, and are on a touch,
        // let's try to clean up the inactive ones.
        // FIXME: This should be done somewhere else and more regularly at the factory level.
        if (this.actives.length >= this.options.maxNumberOfJoysticks && evt.isTouch) {
            // Make some place in the other touches that may be dormant.
            // Search within our Factory's ids.
            this.factory.ids.forEach((id, identifier) => {
                const touches = 'touches' in evt.initial ? evt.initial.touches : [];
                // If we don't find a saved identifier in the list of touches
                // that are currently active on the event,
                // we trigger an end event on it.
                if (Array.from(touches).findIndex((t) => t.identifier === identifier) < 0) {
                    this.processOnEnd(
                        u.processEvent(evt.initial, {
                            ...evt.raw,
                            // Re-use the event but spoof it's identifier with the inactive one.
                            identifier,
                        }),
                    );
                }
            });
        }

        // If we still have spots available, we add a new one.
        if (this.actives.length < this.options.maxNumberOfJoysticks) {
            this.processOnStart(evt);
        }

        // Ping the factory to bind the document in case it's not active yet.
        this.factory.bindDocument();
    }

    private processOnStart(evt: DomEvent) {
        // New joystick.
        const joystick = this.getOrCreate(evt.identifier, evt.position);

        const process = () => {
            joystick.show();
            if (evt.pressure > 0) {
                // This is using the Touch from a TouchList.
                // FIXME: This should be done from Super for all the touches automatically.
                this.pressureFn(evt, joystick);
            }
            // Trigger a first move.
            this.processOnMove(evt);
        };

        // Move the Joystick in the right list.
        const indexInIdles = this.idles.indexOf(joystick);
        if (indexInIdles >= 0) {
            this.idles.splice(indexInIdles, 1);
        }
        this.actives.push(joystick);
        this.identifiers.push(joystick.identifier);

        // In semi mode, we need to verify what to do, do we recycle (if we're in the catch distance),
        // or do we create a new one and delete the previous one?
        if (this.options.mode === MODES.semi) {
            const distance = u.distance(evt.position, joystick.position);
            if (distance <= this.options.catchDistance) {
                // We're in the catch distance, we keep this one.
                process();
            } else {
                // We're too far, delete it and create a new one.
                joystick.destroy();
                this.processOnStart(evt);
            }
        } else {
            // In the other modes, we just process it.
            process();
        }
    }

    private pressureFn(evt: DomEvent, joystick: Joystick) {
        let previousPressure = 0;
        clearInterval(this.pressureIntervals[evt.identifier]);
        this.pressureIntervals[evt.identifier] = setInterval(() => {
            if (evt.pressure !== previousPressure) {
                joystick.trigger('pressure', evt.pressure);
                this.trigger(`pressure ${joystick.identifier}:pressure`, evt.pressure);
                previousPressure = evt.pressure;
            }
        }, 100);
    }

    private getOrCreate(identifier: number, position: Coordinates): Joystick {
        // TODO: Verify if we don't already have a joystick with this identifier.

        // In semi and static modes, we recycle the idle joystick.
        if (this.options.mode === MODES.semi || this.options.mode === MODES.static) {
            // If there is an idle joystick, we use it.
            if (this.idles[0]) {
                const joystick = this.idles[0];
                this.idles.splice(0, 1);
                return joystick;
            }

            // In semi mode, we may not have an idle joystick.
            // So we create a new one.
            if (this.options.mode === MODES.semi) {
                return this.createJoystick(position, identifier);
            }

            // This should never be reached.
            // Static mode should always have an idle joystick.
            console.warn("Coudln't find the expected joystick. Creating a new one.");
        }

        // Return a new joystick.
        return this.createJoystick(position, identifier);
    }

    /**
     *  Whenever a move event happens.
     *
     *  This is called from the Factory.
     * */
    processOnMove(evt: DomEvent) {
        const joystick = this.getJoystick(evt.identifier);
        const scroll = this.factory.scroll;

        // If it's not pressed, just process it as a end event instead.
        if (!evt.pressure) {
            this.processOnEnd(evt);
            return;
        }

        if (!joystick) {
            console.error(`Found zombie joystick with ID ${evt.identifier}`);
            this.factory.removeId(evt.identifier);
            return;
        }

        if (this.options.dynamicPage) {
            const elBox = joystick.ui.el.getBoundingClientRect();
            joystick.position = {
                x: scroll.x + elBox.left,
                y: scroll.y + elBox.top,
            };
        }

        joystick.identifier = identifier;

        const size = joystick.options.size / 2;
        let pos = {
            x: evt.pageX,
            y: evt.pageY,
        };

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

        const raw = {
            distance: dist,
            position: pos,
        };

        let clamped_dist;
        let clamped_pos;
        if (joystick.options.shape === 'circle') {
            clamped_dist = Math.min(dist, size);
            clamped_pos = u.findCoord(joystick.position, clamped_dist, angle);
        } else {
            clamped_pos = u.clamp(pos, joystick.position, size);
            clamped_dist = u.distance(clamped_pos, joystick.position);
        }

        if (this.options.follow) {
            if (dist > size) {
                const delta_x = pos.x - clamped_pos.x;
                const delta_y = pos.y - clamped_pos.y;
                joystick.position.x += delta_x;
                joystick.position.y += delta_y;
                joystick.ui.el.style.top = `${joystick.position.y - (this.box.top + scroll.y)}px`;
                joystick.ui.el.style.left = `${joystick.position.x - (this.box.left + scroll.x)}px`;

                dist = u.distance(pos, joystick.position);
            }
        } else {
            pos = clamped_pos;
            dist = clamped_dist;
        }

        const xPosition = pos.x - joystick.position.x;
        const yPosition = pos.y - joystick.position.y;

        joystick.frontPosition = {
            x: xPosition,
            y: yPosition,
        };

        if (!this.options.dataOnly) {
            joystick.ui.front.style.transform = `translate(${xPosition}px,${yPosition}px)`;
        }

        const toSend: JoystickEventData = {
            identifier: joystick.identifier,
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
        };

        joystick.computeDirection(toSend);

        toSend.angle = {
            radian: u.radians(180 - angle),
            degree: 180 - angle,
        };

        joystick.trigger('move', toSend);
        this.trigger(`move ${joystick.id}:move`, toSend);
    }

    processOnEnd(evt: DomEvent) {
        // const identifier = this.factory.getId(evt.identifier);
        const joystick = this.getJoystick(evt.identifier);

        if (!joystick) {
            return;
        }

        const removedIdentifier = this.factory.removeId(joystick.identifier);
        if (!this.options.dataOnly) {
            joystick.hide(() => {
                if (this.options.mode === 'dynamic') {
                    joystick.trigger('removed', joystick);
                    this.trigger(`removed ${joystick.id}:removed`, joystick);
                    this.factory.trigger(`removed ${joystick.id}:removed`, joystick);
                    joystick.destroy();
                }
            });
        }

        // Stop updating its pressure.
        clearInterval(this.pressureIntervals[joystick.identifier]);

        joystick.resetDirection();

        joystick.trigger('end', joystick);
        this.trigger(`end ${joystick.id}:end`, joystick);

        if (this.identifiers.indexOf(joystick.identifier) >= 0) {
            this.identifiers.splice(this.identifiers.indexOf(joystick.identifier), 1);
        }

        if (this.actives.indexOf(joystick) >= 0) {
            this.actives.splice(this.actives.indexOf(joystick), 1);
        }

        if (/(semi|static)/.test(this.options.mode)) {
            this.idles.push(joystick);
        } else if (this.all.indexOf(joystick) >= 0) {
            this.all.splice(this.all.indexOf(joystick), 1);
        }

        this.factory.unbindDocument();

        // FIXME: What? Probably to recycle the joystick in those modes.
        if (/(semi|static)/.test(this.options.mode)) {
            this.factory.ids[removedIdentifier.id] = removedIdentifier.identifier;
        }
    }

    destroy() {
        this.unbindEvt(this.options.zone, 'start', this.onStart);

        this.all.forEach((joystick) => {
            joystick.destroy();
        });

        for (const i in this.pressureIntervals) {
            if (Object.hasOwn(this.pressureIntervals, i)) {
                clearInterval(this.pressureIntervals[i]);
            }
        }

        this.trigger('destroyed', this);
        this.factory.unbindDocument();
        this.off();
    }
}
