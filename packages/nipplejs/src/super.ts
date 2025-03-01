import type Collection from './Collection';
import type Nipple from './Nipple';
import { PRIMARY_BIND, SECONDARY_BIND } from './constants';
import type {
    FactoryEventType,
    EventType,
    SupportedElement,
    InternalEventHandler,
    JoystickEventData,
    SupportedEvent,
    DomEvent,
    DomEventHandler,
    ProcessedEvent,
} from './types';
import * as u from './utils';

class Super {
    private _handlers_: Partial<Record<FactoryEventType, InternalEventHandler<any>[]>> = {};

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
    on(arg: `added${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `removed${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `start${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `end${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `shown${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `hidden${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `rested${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `destroyed${string}`, cb: InternalEventHandler<Nipple>): void;
    on(arg: `destroyed${string}`, cb: InternalEventHandler<Collection>): void;
    on(arg: `pressure${string}`, cb: InternalEventHandler<number>): void;
    on<T>(arg: string, cb: InternalEventHandler<T>): void {
        this.mapOnEvents(arg, (type) => {
            this._handlers_[type] = this._handlers_[type] || [];
            this._handlers_[type].push(cb);
        });
    }

    off(arg?: `dir${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `plain${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `move${string}`, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: `added${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `removed${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `start${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `end${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `shown${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `hidden${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `rested${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `destroyed${string}`, cb?: InternalEventHandler<Nipple>): void;
    off(arg?: `destroyed${string}`, cb?: InternalEventHandler<Collection>): void;
    off(arg?: `pressure${string}`, cb?: InternalEventHandler<number>): void;
    off<T>(arg?: string, cb?: InternalEventHandler<T>): void {
        if (arg === undefined) {
            // If no arguments provided, clear all handlers.
            this._handlers_ = {};
        } else {
            this.mapOnEvents(arg, (type) => {
                if (cb === undefined) {
                    // If no callback provided, clear all handlers for the type.
                    this._handlers_[type] = [];
                } else if (this._handlers_[type] && this._handlers_[type].indexOf(cb) >= 0) {
                    // If the callback is found, remove it.
                    this._handlers_[type].splice(this._handlers_[type].indexOf(cb), 1);
                }
            });
        }
    }

    trigger(arg: `dir${string}`, data: JoystickEventData): void;
    trigger(arg: `plain${string}`, data: JoystickEventData): void;
    trigger(arg: `move${string}`, data: JoystickEventData): void;
    trigger(arg: `added${string}`, data: Nipple): void;
    trigger(arg: `removed${string}`, data: Nipple): void;
    trigger(arg: `start${string}`, data: Nipple): void;
    trigger(arg: `end${string}`, data: Nipple): void;
    trigger(arg: `shown${string}`, data: Nipple): void;
    trigger(arg: `hidden${string}`, data: Nipple): void;
    trigger(arg: `rested${string}`, data: Nipple): void;
    trigger(arg: `destroyed${string}`, data: Nipple): void;
    trigger(arg: `destroyed${string}`, data: Collection): void;
    trigger(arg: `pressure${string}`, data: number): void;
    trigger<T>(arg: string, data: T): void {
        this.mapOnEvents(arg, (type) => {
            if (this._handlers_[type] && this._handlers_[type].length) {
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

    // Reconciliation layer for MouseEvent, TouchEvent and PointerEvent.
    processEvent(evt: SupportedEvent): DomEvent[] {
        // Prevent the browser default action.
        evt.preventDefault();

        // Prepare arrays of initial events.
        const domEvents: ProcessedEvent[] = [];
        // TouchEvent may have multitouches, split them out in an array.
        if ('changedTouches' in evt) {
            for (let i = 0; i < evt.changedTouches.length; i += 1) {
                const touch = evt.changedTouches.item(i);
                if (touch) {
                    domEvents.push(touch);
                }
            }
        } else {
            domEvents.push(evt);
        }

        // Will return an array of events, based on touches, pointer and mouse data.
        const events: DomEvent[] = domEvents.map<DomEvent>((domEvt) => {
            const identifier: number =
                'identifier' in domEvt
                    ? domEvt.identifier
                    : 'pointerId' in domEvt
                      ? domEvt.pointerId
                      : 0 || 0;
            const pressure: number =
                'force' in domEvt
                    ? domEvt.force
                    : 'pressure' in domEvt
                      ? domEvt.pressure
                      : 'webkitForce' in domEvt // Pressure on trackpads.
                        ? (domEvt.webkitForce as number)
                        : 'buttons' in domEvt // Id of the mouse button pressed. 0 is none.
                          ? domEvt.buttons !== 0
                              ? 1
                              : 0
                          : 0;
            const toReturn: DomEvent = {
                identifier,
                position: {
                    x: domEvt.pageX,
                    y: domEvt.pageY,
                },
                pressure,
                type: evt.type,
                raw: domEvt,
            };

            return toReturn;
        });

        return events;
    }

    // Bind DOM events.
    bindEvt(el: SupportedElement, type: EventType, handler: DomEventHandler) {
        const cb = (evt: SupportedEvent) => {
            for (const domEvt of this.processEvent(evt)) {
                handler(domEvt);
            }
        };

        u.bindEvt(el, PRIMARY_BIND[type], cb);

        if (SECONDARY_BIND[type]) {
            // Support multiple interfaces type when necessary.
            u.bindEvt(el, SECONDARY_BIND[type], cb);
        }
    }

    // Unbind DOM events.
    unbindEvt(el: SupportedElement, type: EventType, handler: DomEventHandler) {
        const cb = (evt: SupportedEvent) => {
            for (const domEvt of this.processEvent(evt)) {
                handler(domEvt);
            }
        };

        u.unbindEvt(el, PRIMARY_BIND[type], cb);

        if (SECONDARY_BIND[type]) {
            // Support multiple interfaces type when necessary.
            u.unbindEvt(el, SECONDARY_BIND[type], cb);
        }
    }
}

export default Super;
