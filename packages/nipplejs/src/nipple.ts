import Super from './Super';
import { ANGLE_45, ANGLE_90 } from './constants';
import type { Direction, JoystickEventData, JoystickOptions } from './types';
import * as u from './utils';

export default class Nipple extends Super {
    static id: number = 0;
    id: number;
    identifier: number;
    position: { x: number; y: number };
    frontPosition: { x: number; y: number };
    collection: any;
    ui: {
        el: HTMLElement;
        back: HTMLElement;
        front: HTMLElement;
    };
    removeTimeout?: number;
    showTimeout?: number;
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

    constructor(collection: any, options: JoystickOptions) {
        super();
        this.identifier = options.identifier;
        this.position = options.position;
        this.frontPosition = options.frontPosition;
        this.collection = collection;
        this.options = { ...this.defaults, ...options };

        // Overwrites
        if (this.options.mode === 'dynamic') {
            this.options.restOpacity = 0;
        }

        this.id = Nipple.id++;

        this.ui = {
            el: document.createElement('div'),
            back: document.createElement('div'),
            front: document.createElement('div'),
        };

        if (!this.options.dataOnly) {
            this.buildEl();
        }
    }

    private buildEl() {
        // Build the dom element.
        this.ui.el.className = `nipple collection_${this.collection.id}`;
        this.ui.back.className = 'back';
        this.ui.front.className = 'front';

        this.ui.el.setAttribute('id', `nipple_${this.collection.id}_${this.id}`);

        this.ui.el.appendChild(this.ui.back);
        this.ui.el.appendChild(this.ui.front);

        // Apply CSS to the dom element.
        const animTime = `${this.options.fadeTime}ms`;
        const borderStyle = u.getVendorStyle('borderRadius', '50%');
        const transitStyle = u.getTransitionStyle('transition', 'opacity', animTime);
        const styles: Record<keyof typeof this.ui, Partial<CSSStyleDeclaration>> = {
            el: {
                position: 'absolute',
                opacity: this.options.restOpacity.toString(),
                display: 'block',
                zIndex: '999',
            },
            back: {
                position: 'absolute',
                display: 'block',
                width: `${this.options.size}px`,
                height: `${this.options.size}px`,
                left: '0',
                marginLeft: `${-this.options.size / 2}px`,
                marginTop: `${-this.options.size / 2}px`,
                background: this.options.color,
                opacity: '.5',
            },
            front: {
                width: `${this.options.size / 2}px`,
                height: `${this.options.size / 2}px`,
                position: 'absolute',
                display: 'block',
                left: '0',
                marginLeft: `${-this.options.size / 4}px`,
                marginTop: `${-this.options.size / 4}px`,
                background: this.options.color,
                opacity: '.5',
                transform: 'translate(0px, 0px)',
            },
        };

        u.extend(styles.el, transitStyle);
        if (this.options.shape === 'circle') {
            u.extend(styles.back, borderStyle);
        }
        u.extend(styles.front, borderStyle);

        u.extend(this.ui.el.style, styles.el);
        u.extend(this.ui.back.style, styles.back);
        u.extend(this.ui.front.style, styles.front);
    }

    // Inject the Nipple instance into DOM.
    addToDom(): void {
        // We're not adding it if we're dataOnly or already in dom.
        if (this.options.dataOnly || document.body.contains(this.ui.el)) {
            return;
        }
        this.options.zone.appendChild(this.ui.el);
    }

    // Remove the Nipple instance from DOM.
    removeFromDom(): void {
        if (this.options.dataOnly || !document.body.contains(this.ui.el)) {
            return;
        }
        this.options.zone.removeChild(this.ui.el);
    }

    // Entirely destroy this nipple
    destroy(): void {
        if (this.removeTimeout) {
            clearTimeout(this.removeTimeout);
        }
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
        }
        if (this.restTimeout) {
            clearTimeout(this.restTimeout);
        }
        this.trigger('destroyed', this);
        this.removeFromDom();
        this.off();
    }

    // Fade in the Nipple instance.
    show(cb?: () => void): void {
        if (this.options.dataOnly) {
            return;
        }

        // Clear the timeouts.
        clearTimeout(this.removeTimeout);
        clearTimeout(this.showTimeout);
        clearTimeout(this.restTimeout);

        // Add it to the dom.
        this.addToDom();
        // Go straight to rest.
        this.restCallback();

        // TODO: Use requestAnimationFrame().
        setTimeout(() => {
            this.ui.el.style.opacity = '1';
        }, 0);

        this.showTimeout = setTimeout(() => {
            this.trigger('shown', this);
            if (typeof cb === 'function') {
                cb.call(this);
            }
        }, this.options.fadeTime);
    }

    // Fade out the Nipple instance.
    hide(cb?: () => void): void {
        if (this.options.dataOnly) {
            return;
        }

        this.ui.el.style.opacity = this.options.restOpacity.toString();

        // Clear the timeouts.
        clearTimeout(this.removeTimeout);
        clearTimeout(this.showTimeout);
        clearTimeout(this.restTimeout);

        this.removeTimeout = setTimeout(() => {
            const display = this.options.mode === 'dynamic' ? 'none' : 'block';
            this.ui.el.style.display = display;
            if (typeof cb === 'function') {
                cb.call(this);
            }

            this.trigger('hidden', this);
        }, this.options.fadeTime);

        if (this.options.restJoystick) {
            const rest = this.options.restJoystick;
            const newPosition = {
                x: rest === true || rest.x !== false ? 0 : this.frontPosition.x,
                y: rest === true || rest.y !== false ? 0 : this.frontPosition.y,
            };

            this.setPosition(cb, newPosition);
        }
    }

    // Set the nipple to the specified position
    setPosition(cb: (() => void) | undefined, position: { x: number; y: number }): void {
        this.frontPosition = {
            x: position.x,
            y: position.y,
        };
        const animTime = `${this.options.fadeTime}ms`;

        // Apply CSS.
        u.extend(
            this.ui.front.style,
            u.extend(u.getTransitionStyle('transition', ['transform'], animTime), {
                transform: `translate(${this.frontPosition.x}px,${this.frontPosition.y}px)`,
            }),
        );

        this.restTimeout = setTimeout(() => {
            if (typeof cb === 'function') {
                cb.call(this);
            }
            this.restCallback();
        }, this.options.fadeTime);
    }

    private restCallback(): void {
        u.extend(this.ui.front.style, u.getTransitionStyle('transition', 'none', ''));
        this.trigger('rested', this);
    }

    resetDirection(): void {
        // Fully rebuild the object to let the iteration possible.
        this.direction = {};
    }

    computeDirection(obj: JoystickEventData): JoystickEventData {
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

        if (obj.force > this.options.threshold) {
            const oldDirection = {
                x: this.direction.x,
                y: this.direction.y,
                angle: this.direction.angle,
            };

            const same: Record<keyof Direction, boolean> = {
                x: oldDirection.x === direction.x,
                y: oldDirection.y === direction.y,
                angle: oldDirection.angle === direction.angle,
            };

            this.direction = direction;
            obj.direction = direction;

            // If all 3 directions are the same, we don't trigger anything.
            if (same.x && same.y && same.angle) {
                return obj;
            }

            if (!same.x || !same.y) {
                this.trigger('plain', obj);
            }

            if (!same.x) {
                this.trigger(`plain:${direction.x}`, obj);
            }

            if (!same.y) {
                this.trigger(`plain:${direction.y}`, obj);
            }

            if (!same.angle) {
                this.trigger(`dir dir:${direction.angle}`, obj);
            }
        } else {
            this.resetDirection();
        }

        return obj;
    }
}
