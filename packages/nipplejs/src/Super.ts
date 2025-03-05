import type Collection from './Collection';
import type Joystick from './Joystick';
import { PRIMARY_BIND, SECONDARY_BIND } from './constants';
import type {
    FactoryEventType,
    EventType,
    SupportedElement,
    InternalEventHandler,
    JoystickEventData,
    SupportedEvent,
    DomEventHandler,
} from './types';
import * as u from './utils';

class Super {
    uid: number = 0;
    private _domHandlers_: Map<DomEventHandler, (evt: SupportedEvent) => void> = new Map();
    private _handlers_: Partial<Record<FactoryEventType, Set<InternalEventHandler<any>>>> = {};

    mapOnEvents(arg: string, cb: (type: FactoryEventType) => void): void {
        const types = arg.split(/[ ,]+/g) as FactoryEventType[];

        for (let i = 0; i < types.length; i += 1) {
            cb(types[i]);
        }
    }

    // Basic event system.
    on(arg: `dir${string}`, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: `plain${string}`, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: `move${string}`, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: `added${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `removed${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `start${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `end${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `shown${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `hidden${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `rested${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `joystickDestroyed${string}`, cb: InternalEventHandler<Joystick>): void;
    on(arg: `collectionDestroyed${string}`, cb: InternalEventHandler<Collection>): void;
    on(arg: `pressure${string}`, cb: InternalEventHandler<number>): void;
    on<T>(arg: string, cb: InternalEventHandler<T>): void {
        this.mapOnEvents(arg, (type) => {
            this._handlers_[type] = this._handlers_[type] || new Set();
            this._handlers_[type].add(cb);
        });
    }

    off(arg?: `dir${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `plain${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `move${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `added${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `removed${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `start${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `end${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `shown${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `hidden${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `rested${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `joystickDestroyed${string}`, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: `collectionDestroyed${string}`, cb?: InternalEventHandler<Collection>): void;
    off(arg?: `pressure${string}`, cb?: InternalEventHandler<number>): void;
    off<T>(arg?: string, cb?: InternalEventHandler<T>): void {
        if (arg === undefined) {
            // If no arguments provided, clear all handlers.
            this._handlers_ = {};
        } else {
            this.mapOnEvents(arg, (type) => {
                if (cb === undefined) {
                    // If no callback provided, clear all handlers for the type.
                    this._handlers_[type] = new Set();
                } else if (this._handlers_[type]) {
                    // If the callback is found, remove it.
                    this._handlers_[type].delete(cb);
                }
            });
        }
    }

    trigger(arg: `dir${string}`, data: JoystickEventData): void;
    trigger(arg: `plain${string}`, data: JoystickEventData): void;
    trigger(arg: `move${string}`, data: JoystickEventData): void;
    trigger(arg: `added${string}`, data: Joystick): void;
    trigger(arg: `removed${string}`, data: Joystick): void;
    trigger(arg: `start${string}`, data: Joystick): void;
    trigger(arg: `end${string}`, data: Joystick): void;
    trigger(arg: `shown${string}`, data: Joystick): void;
    trigger(arg: `hidden${string}`, data: Joystick): void;
    trigger(arg: `rested${string}`, data: Joystick): void;
    trigger(arg: `joystickDestroyed${string}`, data: Joystick): void;
    trigger(arg: `collectionDestroyed${string}`, data: Collection): void;
    trigger(arg: `pressure${string}`, data: number): void;
    trigger<T>(arg: string, data: T): void {
        this.mapOnEvents(arg, (type) => {
            if (this._handlers_[type] && this._handlers_[type].size) {
                this._handlers_[type].forEach((handler) => {
                    handler.call(this, {
                        type,
                        target: this,
                        data,
                    });
                });
            }
        });
    }

    // Bind DOM events.
    bindEvt(el: SupportedElement, type: EventType, handler: DomEventHandler) {
        const cb = (evt: SupportedEvent) => {
            for (const domEvt of u.processEvents(evt)) {
                handler.call(this, domEvt);
            }
        };

        // Save the handler so we can unbind later.
        this._domHandlers_.set(handler, cb);

        u.bindEvt(el, PRIMARY_BIND[type], cb);

        if (SECONDARY_BIND?.[type]) {
            // Support multiple interfaces type when necessary.
            u.bindEvt(el, SECONDARY_BIND[type], cb);
        }
    }

    // Unbind DOM events.
    unbindEvt(el: SupportedElement, type: EventType, handler: DomEventHandler) {
        const cb = this._domHandlers_.get(handler);

        if (!cb) {
            console.error(`Internal handler not found for event ${type}.`, handler);
            return;
        }

        u.unbindEvt(el, PRIMARY_BIND[type], cb);

        if (SECONDARY_BIND?.[type]) {
            // Support multiple interfaces type when necessary.
            u.unbindEvt(el, SECONDARY_BIND[type], cb);
        }
    }
}

export default Super;
