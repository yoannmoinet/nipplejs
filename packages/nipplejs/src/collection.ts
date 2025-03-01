import type Factory from './Factory';
import Nipple from './Nipple';
import Super from './Super';
import { MODES } from './constants';
import type { CollectionOptions, JoystickEventData, InternalEvent, DomEvent } from './types';
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
     *  The list of Nipple IDs this Collection manage.
     * */
    ids: number[] = [];
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
    all: Nipple[] = [];
    /**
     *  The list of the idle Joysticks of this Collection.
     *  Idle Joysticks are the ones that are not being moved by the user.
     * */
    idles: Nipple[] = [];
    /**
     *  The list of the active Joysticks of this Collection.
     *  Active Joysticks are the ones that are being moved or touched by the user.
     * */
    actives: Nipple[] = [];
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
        maxNumberOfNipples: 10,
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

    constructor(factory: any, options: CollectionOptions) {
        super();
        this.factory = factory;
        this.id = Collection.id++;
        this.options = { ...this.defaults, ...options };

        // Overwrite the multitouch option if we are in static or semi modes.
        // As they cannot support multitouch.
        if (this.options.mode === MODES.static || this.options.mode === MODES.semi) {
            this.options.multitouch = false;
        }

        // Overwrite the maxNumberOfNipples in a non multitouch setup.
        if (!this.options.multitouch) {
            this.options.maxNumberOfNipples = 1;
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
        this.bindEvt(this.options.zone, 'start', this.onstart);
        // Disable the default actions of touches. (zooming, panning, etc...)
        this.options.zone.style.touchAction = 'none';
        // @ts-expect-error - msTouchAction is not a known type
        this.options.zone.style.msTouchAction = 'none';

        // In static mode, we create our static joystick.
        if (this.options.mode === 'static') {
            const nipple = this.createNipple(
                this.options.position,
                // FIXME: We're passing an id, not an identifier.
                this.factory.getId(this.factory.index),
            );
            nipple.addToDom();
            this.idles.push(nipple);
        }
    }

    // TODO: Use Map or Object for all, idles and actives.
    getJoystick(identifier?: number): Nipple | undefined {
        // If we have no identifier, we return the first joystick.
        if (identifier === undefined) {
            return this.all[0];
        }

        for (const joystick of this.all) {
            if (joystick.identifier === identifier) {
                return joystick;
            }
        }
    }

    createNipple(position: any, identifier: number): Nipple {
        const scroll = this.factory.scroll;
        let toPutOn = {};
        const offset = {
            x: this.parentIsFlex ? scroll.x : scroll.x + this.box.left,
            y: this.parentIsFlex ? scroll.y : scroll.y + this.box.top,
        };

        let newPosition = position;

        if (position.x && position.y) {
            toPutOn = {
                x: position.x - offset.x,
                y: position.y - offset.y,
            };
        } else if (position.top || position.right || position.bottom || position.left) {
            const dumb = document.createElement('DIV');
            dumb.style.display = 'hidden';
            dumb.style.top = position.top;
            dumb.style.right = position.right;
            dumb.style.bottom = position.bottom;
            dumb.style.left = position.left;
            dumb.style.position = 'absolute';

            this.options.zone.appendChild(dumb);
            const dumbBox = dumb.getBoundingClientRect();
            this.options.zone.removeChild(dumb);

            toPutOn = position;
            newPosition = {
                x: dumbBox.left + scroll.x,
                y: dumbBox.top + scroll.y,
            };
        }

        const nipple = new Nipple(this, {
            color: this.options.color,
            size: this.options.size,
            threshold: this.options.threshold,
            fadeTime: this.options.fadeTime,
            dataOnly: this.options.dataOnly,
            restJoystick: this.options.restJoystick,
            restOpacity: this.options.restOpacity,
            mode: this.options.mode,
            identifier,
            position: newPosition,
            zone: this.options.zone,
            frontPosition: {
                x: 0,
                y: 0,
            },
            shape: this.options.shape,
        });

        if (!this.options.dataOnly) {
            u.applyPosition(nipple.ui.el, toPutOn);
            u.applyPosition(nipple.ui.front, nipple.frontPosition);
        }

        this.all.push(nipple);
        this.trigger(`added ${nipple.identifier}:added`, nipple);
        this.factory.trigger(`added ${nipple.identifier}:added`, nipple);

        this.bindNipple(nipple);

        return nipple;
    }

    bindNipple(nipple: Nipple) {
        let type: string;
        const handler = (evt: InternalEvent) => {
            // TODO Verify data.id
            type = `${evt.type} ${evt.data.id}:${evt.type}`;
            this.trigger(type, evt.data);
        };

        nipple.on('destroyed', this.onDestroyed.bind(this));
        nipple.on('shown hidden rested dir plain', handler);
        nipple.on('dir:up dir:right dir:down dir:left', handler);
        nipple.on('plain:up plain:right plain:down plain:left', handler);
    }

    pressureFn(touch: any, nipple: Nipple, identifier: number) {
        let previousPressure = 0;
        clearInterval(this.pressureIntervals[identifier]);
        this.pressureIntervals[identifier] = setInterval(() => {
            const pressure = touch.force || touch.pressure || touch.webkitForce || 0;
            if (pressure !== previousPressure) {
                nipple.trigger('pressure', pressure);
                this.trigger(`pressure ${nipple.identifier}:pressure`, pressure);
                previousPressure = pressure;
            }
        }, 100);
    }

    onstart(evt: DomEvent) {
        const origEvt = evt;
        const preparedEvt = u.prepareEvent(evt);

        // Refresh the box position.
        this.box = this.options.zone.getBoundingClientRect();

        const process = (touch: any) => {
            if (this.actives.length < this.options.maxNumberOfNipples) {
                this.processOnStart(touch);
            } else if (origEvt.type.match(/^touch/)) {
                Object.keys(this.factory.ids).forEach((k) => {
                    if (Object.values(origEvt.touches).findIndex((t) => t.identifier === k) < 0) {
                        const e = [preparedEvt[0]];
                        e.identifier = k;
                        this.processOnEnd(e);
                    }
                });
                if (this.actives.length < this.options.maxNumberOfNipples) {
                    this.processOnStart(touch);
                }
            }
        };

        u.map(preparedEvt, process);

        this.factory.bindDocument();
        return false;
    }

    processOnStart(evt: DomEvent) {
        // FIXME: This is not the identifier, but an arbitrary incremental index.
        const identifier = this.factory.getId(evt.identifier);
        const nipple = this.getOrCreate(identifier, evt.position);

        if (nipple.identifier !== identifier) {
            this.factory.removeId(nipple.identifier);
        }
        nipple.identifier = identifier;

        const process = (nip: Nipple) => {
            nip.trigger('start', nip);
            this.trigger(`start ${nip.id}:start`, nip);

            nip.show();
            if (evt.pressure > 0) {
                // This is using the Touch from a TouchList.
                this.pressureFn(evt, nip, nip.identifier);
            }
            this.processOnMove(evt);
        };

        const indexInIdles = this.idles.indexOf(nipple);
        if (indexInIdles >= 0) {
            this.idles.splice(indexInIdles, 1);
        }

        this.actives.push(nipple);
        this.ids.push(nipple.identifier);

        if (this.options.mode !== 'semi') {
            process(nipple);
        } else {
            const distance = u.distance(position, nipple.position);
            if (distance <= this.options.catchDistance) {
                process(nipple);
            } else {
                nipple.destroy();
                this.processOnStart(evt);
                return;
            }
        }

        return nipple;
    }

    getOrCreate(identifier: number, position: any): Nipple | undefined {
        let nipple;

        if (this.options.mode === MODES.semi || this.options.mode === MODES.static) {
            nipple = this.idles[0];

            if (nipple) {
                this.idles.splice(0, 1);
                return nipple;
            }

            if (this.options.mode === MODES.semi) {
                return this.createNipple(position, identifier);
            }

            console.warn("Coudln't find the needed nipple.");
            return;
        }

        nipple = this.createNipple(position, identifier);
        return nipple;
    }

    processOnMove(evt: DomEvent) {
        // FIXME: This is not the identifier, but an arbitrary incremental index.
        const identifier = this.factory.getId(evt.identifier);
        const nipple = this.getJoystick(identifier);
        const scroll = this.factory.scroll;

        if (!u.isPressed(evt)) {
            this.processOnEnd(evt);
            return;
        }

        if (!nipple) {
            console.error(`Found zombie joystick with ID ${identifier}`);
            this.factory.removeId(identifier);
            return;
        }

        if (this.options.dynamicPage) {
            const elBox = nipple.ui.el.getBoundingClientRect();
            nipple.position = {
                x: scroll.x + elBox.left,
                y: scroll.y + elBox.top,
            };
        }

        nipple.identifier = identifier;

        const size = nipple.options.size / 2;
        let pos = {
            x: evt.pageX,
            y: evt.pageY,
        };

        if (this.options.lockX) {
            pos.y = nipple.position.y;
        }
        if (this.options.lockY) {
            pos.x = nipple.position.x;
        }

        let dist = u.distance(pos, nipple.position);
        const angle = u.angle(pos, nipple.position);
        const rAngle = u.radians(angle);
        const force = dist / size;

        const raw = {
            distance: dist,
            position: pos,
        };

        let clamped_dist;
        let clamped_pos;
        if (nipple.options.shape === 'circle') {
            clamped_dist = Math.min(dist, size);
            clamped_pos = u.findCoord(nipple.position, clamped_dist, angle);
        } else {
            clamped_pos = u.clamp(pos, nipple.position, size);
            clamped_dist = u.distance(clamped_pos, nipple.position);
        }

        if (this.options.follow) {
            if (dist > size) {
                const delta_x = pos.x - clamped_pos.x;
                const delta_y = pos.y - clamped_pos.y;
                nipple.position.x += delta_x;
                nipple.position.y += delta_y;
                nipple.ui.el.style.top = `${nipple.position.y - (this.box.top + scroll.y)}px`;
                nipple.ui.el.style.left = `${nipple.position.x - (this.box.left + scroll.x)}px`;

                dist = u.distance(pos, nipple.position);
            }
        } else {
            pos = clamped_pos;
            dist = clamped_dist;
        }

        const xPosition = pos.x - nipple.position.x;
        const yPosition = pos.y - nipple.position.y;

        nipple.frontPosition = {
            x: xPosition,
            y: yPosition,
        };

        if (!this.options.dataOnly) {
            nipple.ui.front.style.transform = `translate(${xPosition}px,${yPosition}px)`;
        }

        const toSend: JoystickEventData = {
            identifier: nipple.identifier,
            position: pos,
            force,
            pressure: evt.force || evt.pressure || evt.webkitForce || 0,
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
            instance: nipple,
            lockX: this.options.lockX,
            lockY: this.options.lockY,
        };

        nipple.computeDirection(toSend);

        toSend.angle = {
            radian: u.radians(180 - angle),
            degree: 180 - angle,
        };

        nipple.trigger('move', toSend);
        this.trigger(`move ${nipple.id}:move`, toSend);
    }

    processOnEnd(evt: DomEvent) {
        const identifier = this.factory.getId(evt.identifier);
        const nipple = this.getJoystick(identifier);

        if (!nipple) {
            return;
        }

        const removedIdentifier = this.factory.removeId(nipple.identifier);
        if (!this.options.dataOnly) {
            nipple.hide(() => {
                if (this.options.mode === 'dynamic') {
                    nipple.trigger('removed', nipple);
                    this.trigger(`removed ${nipple.id}:removed`, nipple);
                    this.factory.trigger(`removed ${nipple.id}:removed`, nipple);
                    nipple.destroy();
                }
            });
        }

        // Stop updating its pressure.
        clearInterval(this.pressureIntervals[nipple.identifier]);

        nipple.resetDirection();

        nipple.trigger('end', nipple);
        this.trigger(`end ${nipple.id}:end`, nipple);

        if (this.ids.indexOf(nipple.identifier) >= 0) {
            this.ids.splice(this.ids.indexOf(nipple.identifier), 1);
        }

        if (this.actives.indexOf(nipple) >= 0) {
            this.actives.splice(this.actives.indexOf(nipple), 1);
        }

        if (/(semi|static)/.test(this.options.mode)) {
            this.idles.push(nipple);
        } else if (this.all.indexOf(nipple) >= 0) {
            this.all.splice(this.all.indexOf(nipple), 1);
        }

        this.factory.unbindDocument();

        // FIXME: What?
        if (/(semi|static)/.test(this.options.mode)) {
            this.factory.ids[removedIdentifier.id] = removedIdentifier.identifier;
        }
    }

    onDestroyed(evt: InternalEvent) {
        const nipple: Nipple = evt.data;
        if (this.all.indexOf(nipple) >= 0) {
            this.all.splice(this.all.indexOf(nipple), 1);
        }
        if (this.actives.indexOf(nipple) >= 0) {
            this.actives.splice(this.actives.indexOf(nipple), 1);
        }
        if (this.idles.indexOf(nipple) >= 0) {
            this.idles.splice(this.idles.indexOf(nipple), 1);
        }
        if (this.ids.indexOf(nipple.identifier) >= 0) {
            this.ids.splice(this.ids.indexOf(nipple.identifier), 1);
        }

        this.factory.removeId(nipple.identifier);

        this.factory.unbindDocument();
    }

    destroy() {
        this.unbindEvt(this.options.zone, 'start', this.onstart);

        this.all.forEach((nipple) => {
            nipple.destroy();
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
