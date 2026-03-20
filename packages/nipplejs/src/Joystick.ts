import type Collection from './Collection';
import Super from './Super';
import { ANGLE_45, ANGLE_90, MODES } from './constants';
import type {
    Coordinates,
    Direction,
    Identifier,
    JoystickEventData,
    JoystickOptions,
    ProcessedEvent,
    Uid,
} from './types';
import * as u from './utils';

/**
 * A single virtual joystick element.
 *
 * Manages its own DOM (outer circle + inner thumb), position tracking,
 * direction computation, and fade-in/fade-out lifecycle. Created and
 * owned by a Collection.
 */
export class Joystick extends Super {
    static index: number = 0;
    private _identifier?: Identifier;
    private _pressure?: number;
    uid: Uid;
    position: Coordinates;
    frontPosition: Coordinates;
    collection: Collection;
    ui: {
        el: HTMLElement;
        back: HTMLElement;
        front: HTMLElement;
    };
    pressureInterval?: number;
    removeTimeout?: number;
    showTimeout?: number;
    activeTimeout?: number;
    restTimeout?: number;
    direction: Direction = {};
    options: Required<JoystickOptions>;
    defaults: Required<Omit<JoystickOptions, 'identifier' | 'position' | 'frontPosition'>> = {
        size: 100,
        threshold: 0.1,
        color: 'white',
        fadeTime: 250,
        dataOnly: false,
        restJoystick: true,
        restOpacity: 0.5,
        mode: 'dynamic',
        zone: document.body,
        lockX: false,
        lockY: false,
        shape: 'circle',
    };

    constructor(collection: Collection, options: JoystickOptions) {
        super('joystick');

        this.position = options.position;
        this.frontPosition = options.frontPosition;
        this.collection = collection;
        this.options = { ...this.defaults, ...options };

        // Overwrites
        if (this.options.mode === 'dynamic') {
            // For dynamic Joystick, they will fade completely out.
            this.options.restOpacity = 0;
        }

        this.uid = Joystick.index++ as Uid;

        this.ui = {
            el: document.createElement('div'),
            back: document.createElement('div'),
            front: document.createElement('div'),
        };
    }

    init() {
        if (!this.options.dataOnly) {
            this.buildEl();
        }
        this.trigger('added', this);
        this.trigger('joystickCreated', this);
    }

    get identifier(): Identifier | undefined {
        return this._identifier;
    }

    set identifier(identifier: Identifier | undefined) {
        if (!u.isNumber(identifier)) {
            this.trigger(`detached`, {
                collection: this.collection,
                joystick: this,
                identifier: this._identifier!,
            });
            this._identifier = undefined;
        } else {
            this._identifier = identifier;
            this.trigger(`attached`, {
                collection: this.collection,
                joystick: this,
                identifier,
            });
        }
    }

    private resolveColors(): { front: string; back: string } {
        const color = this.options.color;
        if (typeof color === 'object' && color !== null) {
            return color;
        }
        return { front: color as string, back: color as string };
    }

    private buildEl() {
        // Build the dom element.
        this.ui.el.className = `joystick collection_${this.collection.uid}`;
        this.ui.back.className = 'back';
        this.ui.front.className = 'front';

        this.ui.el.setAttribute('id', `joystick_${this.collection.uid}_${this.uid}`);

        this.ui.el.appendChild(this.ui.back);
        this.ui.el.appendChild(this.ui.front);

        // Apply CSS to the dom elements.
        const animTime = `${this.options.fadeTime}ms`;
        const borderStyle = u.configStylePropertyObject('borderRadius', '50%');
        const transitStyle = u.configStylePropertyObject('transition', `opacity ${animTime}`);
        const colors = this.resolveColors();

        u.extend(this.ui.el.style, {
            position: 'absolute',
            opacity: this.options.restOpacity.toString(),
            display: 'block',
            zIndex: '999',
            ...transitStyle,
        });

        u.extend(this.ui.back.style, {
            position: 'absolute',
            display: 'block',
            width: `${this.options.size}px`,
            height: `${this.options.size}px`,
            left: '0',
            marginLeft: `${-this.options.size / 2}px`,
            marginTop: `${-this.options.size / 2}px`,
            background: colors.back,
            ...(this.options.shape === 'circle' ? borderStyle : {}),
        });

        u.extend(this.ui.front.style, {
            width: `${this.options.size / 2}px`,
            height: `${this.options.size / 2}px`,
            position: 'absolute',
            display: 'block',
            left: '0',
            marginLeft: `${-this.options.size / 4}px`,
            marginTop: `${-this.options.size / 4}px`,
            background: colors.front,
            opacity: '.5',
            transform: 'translate(0px, 0px)',
            ...borderStyle,
        });
    }

    get pressure(): number {
        return this._pressure ?? 0;
    }

    set pressure(pressure: number) {
        if (pressure !== this._pressure) {
            this._pressure = pressure;
            this.trigger('pressure', pressure);
        }
    }

    startPressureInterval(evt: ProcessedEvent): void {
        if (this.pressureInterval) {
            return;
        }

        this.pressureInterval = window.setInterval(() => {
            this.pressure = u.getPressureFromEvt(evt);
        }, 100);
    }

    stopPressureInterval(): void {
        clearInterval(this.pressureInterval);
        this.pressureInterval = undefined;
    }

    // Inject the Joystick instance into DOM.
    addToDom(): void {
        // We're not adding it if we're dataOnly or already in dom.
        if (this.options.dataOnly || document.body.contains(this.ui.el)) {
            return;
        }
        this.options.zone.appendChild(this.ui.el);
    }

    // Remove the Joystick instance from DOM.
    removeFromDom(): void {
        if (this.options.dataOnly || !document.body.contains(this.ui.el)) {
            return;
        }
        this.options.zone.removeChild(this.ui.el);
    }

    private clearTimeouts(): void {
        clearTimeout(this.removeTimeout);
        clearTimeout(this.showTimeout);
        clearTimeout(this.restTimeout);
        clearTimeout(this.activeTimeout);

        this.removeTimeout = undefined;
        this.showTimeout = undefined;
        this.restTimeout = undefined;
        this.activeTimeout = undefined;
    }

    // Fade in the Joystick instance.
    start(evt: ProcessedEvent, cb?: () => void): void {
        this.trigger('start', this);
        // Clear the timeouts.
        this.clearTimeouts();

        if (this.options.dataOnly) {
            if (typeof cb === 'function') {
                cb.call(this);
            }
            return;
        }

        this.addToDom();

        this.startPressureInterval(evt);

        requestAnimationFrame(() => {
            this.ui.el.style.opacity = '1';
        });

        this.showTimeout = window.setTimeout(() => {
            this.showTimeout = undefined;
            this.trigger('shown', this);
            if (typeof cb === 'function') {
                cb.call(this);
            }
        }, this.options.fadeTime);
    }

    // Fade out the Joystick instance.
    end(cb?: () => void): void {
        this.resetDirection();
        this.clearTimeouts();
        this.stopPressureInterval();
        this.pressure = 0;
        this.trigger('end', this);

        if (this.options.dataOnly) {
            if (typeof cb === 'function') {
                cb.call(this);
            }
            return;
        }

        // Set the faded out opacity.
        this.ui.el.style.opacity = this.options.restOpacity.toString();

        // If the Joystick has to rest (go back to center),
        // we update its position.
        if (this.options.restJoystick) {
            const rest = this.options.restJoystick;
            const newPosition = {
                x: rest === true || rest.x !== false ? 0 : this.frontPosition.x,
                y: rest === true || rest.y !== false ? 0 : this.frontPosition.y,
            };

            this.setPosition(cb, newPosition);
        }

        // Create a timeout to trigger an event after the fadeTime.
        // And destroy it if it's a dynamic Joystick.
        clearTimeout(this.removeTimeout);
        this.removeTimeout = window.setTimeout(() => {
            this.removeTimeout = undefined;
            // If dynamic, we'll completely hide the Joystick (display: none).
            this.ui.el.style.display = this.options.mode === MODES.dynamic ? 'none' : 'block';
            this.trigger('hidden', this);

            // We trigger a removed event only in dynamic mode,
            // which is the only mode where joysticks get removed.
            if (this.options.mode === MODES.dynamic) {
                this.trigger('removed', this);
                this.destroy();
            }

            if (typeof cb === 'function') {
                cb.call(this);
            }
        }, this.options.fadeTime);
    }

    setTransition(animated: boolean = false, cb?: () => void) {
        if (animated) {
            const activeTime = 100;
            const animTime = `${activeTime}ms`;
            const transitStyle = u.extend(
                // Transition style.
                u.configStylePropertyObject('transition', `transform ${animTime}`),
                // Transform style.
                u.configStylePropertyObject(
                    'transform',
                    `translate(${this.frontPosition.x}px, ${this.frontPosition.y}px)`,
                ),
            );

            // Apply CSS.
            u.extend(this.ui.front.style, transitStyle);

            clearTimeout(this.activeTimeout);
            this.activeTimeout = window.setTimeout(() => {
                this.activeTimeout = undefined;
                if (typeof cb === 'function') {
                    cb.call(this);
                }
            }, activeTime);
        } else {
            u.extend(this.ui.front.style, u.configStylePropertyObject('transition', 'none'));
        }
    }

    // Set the Joystick to the specified position
    setPosition(cb: (() => void) | undefined, position: Coordinates): void {
        this.frontPosition = {
            x: position.x,
            y: position.y,
        };

        this.setTransition(true);

        clearTimeout(this.restTimeout);
        this.restTimeout = window.setTimeout(() => {
            this.restTimeout = undefined;
            if (typeof cb === 'function') {
                cb.call(this);
            }
            // Once rested, remove the transition.
            this.setTransition(false);
            this.trigger('rested', this);
        }, this.options.fadeTime);
    }

    resetDirection(): void {
        // Fully rebuild the object to let the iteration possible.
        this.direction = {};
    }

    computeDirectionAndTriggerEvents(obj: JoystickEventData): JoystickEventData {
        const rAngle = obj.angle.radian;
        const direction: Direction = {};

        // Angular direction
        //     \  UP /
        //      \   /
        // LEFT       RIGHT
        //      /   \
        //     /DOWN \
        //
        if (rAngle > ANGLE_45 && rAngle < ANGLE_45 * 3 && !obj.lockX) {
            direction.angle = 'up';
        } else if (rAngle > -ANGLE_45 && rAngle <= ANGLE_45 && !obj.lockY) {
            direction.angle = 'left';
        } else if (rAngle > -ANGLE_45 * 3 && rAngle <= -ANGLE_45 && !obj.lockX) {
            direction.angle = 'down';
        } else if (!obj.lockY) {
            direction.angle = 'right';
        }

        // Plain direction
        //    UP                 |
        // _______               | RIGHT
        //                  LEFT |
        //   DOWN                |
        if (!obj.lockY) {
            if (rAngle > -ANGLE_90 && rAngle < ANGLE_90) {
                direction.x = 'left';
            } else {
                direction.x = 'right';
            }
        }

        if (!obj.lockX) {
            if (rAngle > 0) {
                direction.y = 'up';
            } else {
                direction.y = 'down';
            }
        }

        // Rotate the angle measure from 0 to 180° to have a more human reading of it.
        obj.angle = {
            radian: u.radians(180 - obj.angle.degree),
            degree: 180 - obj.angle.degree,
        };

        this.triggerDirectionEvents(obj, direction);

        return obj;
    }

    private triggerDirectionEvents(obj: JoystickEventData, direction: Direction): void {
        if (obj.force > this.options.threshold) {
            const oldDirection = {
                x: this.direction.x,
                y: this.direction.y,
                angle: this.direction.angle,
            };

            this.direction = direction;
            obj.direction = direction;

            if (oldDirection.x !== direction.x) {
                this.trigger(`plain plain:${direction.x}`, obj);
            }

            if (oldDirection.y !== direction.y) {
                this.trigger(`plain plain:${direction.y}`, obj);
            }

            if (oldDirection.angle !== direction.angle) {
                this.trigger(`dir dir:${direction.angle}`, obj);
            }
        } else {
            this.resetDirection();
        }

        this.trigger('move', obj);
    }

    // Entirely destroy this Joystick
    destroy(): void {
        this.clearTimeouts();
        this.identifier = undefined;
        this.removeFromDom();
        this.trigger('joystickDestroyed', this);
        this.off();
    }
}

export default Joystick;
