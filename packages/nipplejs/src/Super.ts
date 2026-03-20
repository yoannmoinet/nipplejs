import type Collection from './Collection';
import type Factory from './Factory';
import type Joystick from './Joystick';
import { PRIMARY_BIND, SECONDARY_BIND } from './constants';
import type {
    FactoryEventType,
    EventType,
    LogLevel,
    SupportedElement,
    InternalEventHandler,
    JoystickEventData,
    SupportedEvent,
    DomEventHandler,
    AttachEventData,
    Uid,
} from './types';
import * as u from './utils';

export type SuperEventType<T extends FactoryEventType> = `${T}${string}` | `${string}${T}`;
export type Name = 'super' | 'joystick' | 'collection' | 'factory';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3,
    none: 4,
};

let currentLogLevel: LogLevel = 'warning';

/**
 * Base class providing the event system and DOM event binding used by
 * Joystick, Collection, and Factory.
 *
 * Events are strings that can be space/comma separated to listen to multiple
 * at once (e.g. `"start end"`). Handlers are stored in a `Set` per event type.
 */
export class Super {
    uid: Uid = 0 as Uid;
    index: number = 0;
    name: Name = 'super';
    private _domHandlers_: Map<DomEventHandler, (evt: SupportedEvent) => void> = new Map();
    private _handlers_: Partial<Record<FactoryEventType, Set<InternalEventHandler<any>>>> = {};

    constructor(name: Name) {
        this.name = name;
        this.log('construct', this.name, this.index);
    }

    mapOnEvents(arg: string, cb: (type: FactoryEventType) => void): void {
        const types = arg.split(/[ ,]+/g) as FactoryEventType[];

        for (let i = 0; i < types.length; i += 1) {
            cb(types[i]);
        }
    }

    // Basic event system.
    on(arg: SuperEventType<'attached'>, cb: InternalEventHandler<AttachEventData>): void;
    on(arg: SuperEventType<'detached'>, cb: InternalEventHandler<AttachEventData>): void;
    on(arg: SuperEventType<'dir'>, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: SuperEventType<'plain'>, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: SuperEventType<'move'>, cb: InternalEventHandler<JoystickEventData>): void;
    on(arg: SuperEventType<'added'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'removed'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'start'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'end'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'shown'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'hidden'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'rested'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'joystickCreated'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'joystickDestroyed'>, cb: InternalEventHandler<Joystick>): void;
    on(arg: SuperEventType<'collectionCreated'>, cb: InternalEventHandler<Collection>): void;
    on(arg: SuperEventType<'collectionDestroyed'>, cb: InternalEventHandler<Collection>): void;
    on(arg: SuperEventType<'factoryCreated'>, cb: InternalEventHandler<Factory>): void;
    on(arg: SuperEventType<'factoryDestroyed'>, cb: InternalEventHandler<Factory>): void;
    on(arg: SuperEventType<'pressure'>, cb: InternalEventHandler<number>): void;
    on<T>(arg: string, cb: InternalEventHandler<T>): void {
        this.mapOnEvents(arg, (type) => {
            this._handlers_[type] = this._handlers_[type] || new Set();
            this._handlers_[type]!.add(cb);
        });
    }

    off(arg?: SuperEventType<'attached'>, cb?: InternalEventHandler<AttachEventData>): void;
    off(arg?: SuperEventType<'detached'>, cb?: InternalEventHandler<AttachEventData>): void;
    off(arg?: SuperEventType<'dir'>, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: SuperEventType<'plain'>, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: SuperEventType<'move'>, cb?: InternalEventHandler<JoystickEventData>): void;
    off(arg?: SuperEventType<'added'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'removed'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'start'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'end'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'shown'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'hidden'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'rested'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'joystickCreated'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'joystickDestroyed'>, cb?: InternalEventHandler<Joystick>): void;
    off(arg?: SuperEventType<'collectionCreated'>, cb?: InternalEventHandler<Collection>): void;
    off(arg?: SuperEventType<'collectionDestroyed'>, cb?: InternalEventHandler<Collection>): void;
    off(arg?: SuperEventType<'factoryCreated'>, cb?: InternalEventHandler<Factory>): void;
    off(arg?: SuperEventType<'factoryDestroyed'>, cb?: InternalEventHandler<Factory>): void;
    off(arg?: SuperEventType<'pressure'>, cb?: InternalEventHandler<number>): void;
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
                    this._handlers_[type]!.delete(cb);
                }
            });
        }
    }

    trigger(arg: SuperEventType<'attached'>, data: AttachEventData): void;
    trigger(arg: SuperEventType<'detached'>, data: AttachEventData): void;
    trigger(arg: SuperEventType<'dir'>, data: JoystickEventData): void;
    trigger(arg: SuperEventType<'plain'>, data: JoystickEventData): void;
    trigger(arg: SuperEventType<'move'>, data: JoystickEventData): void;
    trigger(arg: SuperEventType<'added'>, data: Joystick): void;
    trigger(arg: SuperEventType<'removed'>, data: Joystick): void;
    trigger(arg: SuperEventType<'start'>, data: Joystick): void;
    trigger(arg: SuperEventType<'end'>, data: Joystick): void;
    trigger(arg: SuperEventType<'shown'>, data: Joystick): void;
    trigger(arg: SuperEventType<'hidden'>, data: Joystick): void;
    trigger(arg: SuperEventType<'rested'>, data: Joystick): void;
    trigger(arg: SuperEventType<'joystickCreated'>, data: Joystick): void;
    trigger(arg: SuperEventType<'joystickDestroyed'>, data: Joystick): void;
    trigger(arg: SuperEventType<'collectionCreated'>, data: Collection): void;
    trigger(arg: SuperEventType<'collectionDestroyed'>, data: Collection): void;
    trigger(arg: SuperEventType<'factoryCreated'>, data: Factory): void;
    trigger(arg: SuperEventType<'factoryDestroyed'>, data: Factory): void;
    trigger(arg: SuperEventType<'pressure'>, data: number): void;
    trigger<T>(arg: string, data: T): void {
        this.mapOnEvents(arg, (type) => {
            this.log(`- "${type}" [trigger]`);
            const handlers = this._handlers_[type];
            if (handlers && handlers.size) {
                // Snapshot to avoid issues if a handler modifies the Set
                const snapshot = [...handlers];
                for (const handler of snapshot) {
                    handler.call(this, {
                        type,
                        target: this,
                        data,
                    });
                }
            }
        });
    }

    // Bind DOM events.
    bindEvt(el: SupportedElement, type: EventType, handler: DomEventHandler) {
        const cb = (evt: SupportedEvent) => {
            for (const domEvt of u.processEvents(evt)) {
                this.log(`- "${type}" [dom:trigger:${domEvt.identifier}]`);
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
            this.error(`Internal handler not found for event ${type}.`, handler);
            return;
        }

        u.unbindEvt(el, PRIMARY_BIND[type], cb);

        if (SECONDARY_BIND?.[type]) {
            // Support multiple interfaces type when necessary.
            u.unbindEvt(el, SECONDARY_BIND[type], cb);
        }

        this._domHandlers_.delete(handler);
    }

    logPrefix() {
        const prefixes: Record<Name, string> = {
            super: '',
            joystick: '  ',
            collection: '    ',
            factory: '      ',
        };

        return prefixes[this.name];
    }

    logSuffix() {
        return `[${this.name}|${this.uid}]`;
    }

    static get logLevel(): LogLevel {
        return currentLogLevel;
    }

    static set logLevel(level: LogLevel) {
        currentLogLevel = level;
    }

    log(...args: any[]) {
        if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.debug) {
            console.log(this.logPrefix(), ...args, this.logSuffix());
        }
    }

    info(...args: any[]) {
        if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.info) {
            console.info(this.logPrefix(), ...args, this.logSuffix());
        }
    }

    warn(...args: any[]) {
        if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.warning) {
            console.warn(this.logPrefix(), ...args, this.logSuffix());
        }
    }

    error(...args: any[]) {
        if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.error) {
            console.error(this.logPrefix(), ...args, this.logSuffix());
        }
    }
}

export default Super;
