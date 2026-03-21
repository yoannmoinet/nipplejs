import type Collection from './Collection';
import type Joystick from './Joystick';
import type Super from './Super';
import type { MODES } from './constants';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'none';

// Make it unique so we can better type it.
declare const identifierSymbol: unique symbol;
export type Identifier = number & { [identifierSymbol]: never };

// Make it unique so we can better type it.
declare const uidSymbol: unique symbol;
export type Uid = number & { [uidSymbol]: never };

/**
 * Common configuration options shared between joysticks and collections.
 *
 * These options control the appearance, behavior and functionality of the joystick elements.
 */
export interface CommonOptions {
    /**
     * ### Defaults to `100`
     *
     * The size in pixel of the outer circle.
     *
     * The inner circle is 50% of this size.
     */
    size?: number;

    /**
     * ### Defaults to `0.1`
     *
     * This is the strength needed to trigger a directional event.
     *
     * Basically, the center is 0 and the outer is 1.
     *
     * You need to at least go to 0.1 to trigger a directional event.
     */
    threshold?: number;

    /**
     * ### Defaults to `’white’`
     *
     * The background color of your joystick’s elements.
     *
     * Can be a single CSS color/gradient string applied to both circles,
     * or an object with `front` and `back` to style them separately.
     *
     * ```js
     * color: ‘red’
     * color: ‘linear-gradient(135deg, #818cf8, #38bdf8)’
     * color: { front: ‘#818cf8’, back: ‘rgba(99,102,241,0.2)’ }
     * ```
     */
    color?: string | { front: string; back: string };

    /**
     * ### Defaults to `250`
     *
     * The duration in ms it takes for a joystick to fade-out and fade-in
     * when activated or de-activated.
     */
    fadeTime?: number;

    /**
     * ### Defaults to `false`
     *
     * Only trigger events with data. No DOM manipulation/render.
     *
     * Can be useful if you want to fully control the rendering.
     */
    dataOnly?: boolean;

    /**
     * ### Defaults to `true`
     *
     * Reset the joystick’s position to its center when it enters the rest state.
     *
     * Use `false` to keep the joystick in its last position after release.
     *
     * Use `{ x: false }` to only rest the y axis
     * and `{ y: false }` to only rest the x axis.
     */
    restJoystick?: boolean | RestJoystickOption;

    /**
     * ### Defaults to `0.5`
     *
     * The opacity to apply when the joystick is in a rest position.
     */
    restOpacity?: number;

    /**
     * ### Default to `dynamic`
     *
     * Behavioral mode for the joystick
     *
     * #### 'dynamic':
     * A new joystick is created at each new touch.
     *
     * The joystick gets destroyed after release.
     *
     * **Can be multitouch**.
     *
     * #### 'semi':
     * New joystick is created at each new touch farther than `options.catchDistance`
     * of any previously created joystick.
     *
     * The joystick is faded-out when released but not destroyed.
     *
     * When a touch is made **INSIDE** the `options.catchDistance` a new direction
     * is triggered immediately.
     *
     * When a touch is made **OUTSIDE** the `options.catchDistance` the previous
     * joystick is destroyed and a new one is created.
     *
     * **Cannot be multitouch**.
     *
     * #### 'static':
     * A joystick is positioned immediately at `options.position`.
     *
     * Only one joystick per zone.
     *
     * Each new touch triggers a new direction.
     *
     * **Cannot be multitouch**.
     *
     */
    mode?: (typeof MODES)[keyof typeof MODES];

    /**
     * ### Defaults to `'body'`
     *
     * The dom element in which all your joysticks will be injected.
     *
     * This zone also serve as the mouse/touch events handler.
     *
     * It represents the zone where all your joysticks will be active.
     */
    zone?: HTMLElement;

    /**
     * ### Defaults to `false`
     *
     * Lock joystick’s movement to the x (horizontal) axis
     */
    lockX?: boolean;

    /**
     * ### Defaults to `false`
     *
     * Lock joystick’s movement to the y (vertical) axis
     */
    lockY?: boolean;

    /**
     * ### Defaults to `circle`
     *
     * The shape of the joystick.
     */
    shape?: 'circle' | 'square';
}

/**
 * Configuration options specific to individual joystick instances.
 * Extends the common options shared across joysticks and collections.
 */
export interface JoystickOptions extends CommonOptions {
    /**
     * The base position coordinates of the joystick.
     *
     * `{ x: 0, y: 0 }`
     */
    position: Coordinates;

    /**
     * The position coordinates of the front/movable part of the joystick.
     *
     * `{ x: 0, y: 0 }`
     */
    frontPosition: Coordinates;
}

/**
 * Configuration options specific to collections.
 *
 * Extends the common options shared across joysticks and collections.
 */
export interface CollectionOptions extends CommonOptions {
    /**
     * ### Defaults to `false`
     *
     * Enable the multitouch capabilities.
     *
     * If you need to have multiple joysticks into the same zone.
     *
     * Otherwise it will only get one, and all new touches will be ignored.
     *
     * Note that multitouch is ALWAYS `false` in `static` and `semi` modes.
     */
    multitouch?: boolean;

    /**
     * ### Defaults to `1`
     *
     * The maximum number of joystick that can be created in a zone.
     *
     * Useful with `multitouch: true`.
     */
    maxNumberOfJoysticks?: number;

    /**
     * ### Defaults to `{ top: '0px', left: '0px' }`
     *
     * An object that will determine the position of a static mode.
     *
     * You can pass `top`, `right`, `bottom` and `left`.
     *
     * They will be applied as any css property.
     */
    position?: Partial<CssPosition>;

    /**
     * ### Defaults to `200`
     *
     * Only useful in the `semi` mode, and determine the distance
     * up to which we recycle the previous joystick.
     */
    catchDistance?: number;

    /**
     * ### Defaults to `false`
     *
     * Enable if the page has dynamically visible elements such as for Vue, React, Angular
     * or simply some CSS hiding or showing some DOM.
     *
     * It will force a re-calculation of the position of the joystick.
     *
     * Has a significant performance cost.
     */
    dynamicPage?: boolean;

    /**
     * ### Defaults to `false`
     *
     * Make the joystick follow the cursor beyond its limits.
     */
    follow?: boolean;
}

/**
 * ### Defaults to `{ x: true, y: true }`
 *
 * Specify which axis to rest or not.
 *
 * Use `{ x: false }` to only rest the y axis
 * and `{ y: false }` to only rest the x axis.
 */
export interface RestJoystickOption {
    /**
     * ### Defaults to `true`
     */
    x?: boolean;
    /**
     * ### Defaults to `true`
     */
    y?: boolean;
}

/**
 * Coordinates object representing a point in a 2D space.
 *
 * `{ x: 0, y: 0 }`
 */
export interface Coordinates {
    x: number;
    y: number;
}

/**
 * CssPosition object representing a position as defined in CSS.
 *
 * `{ top: '0px', right: '0px', bottom: '0px', left: '0px' }`
 */
export interface CssPosition {
    top: string;
    right: string;
    bottom: string;
    left: string;
}

/**
 * Either a partial Coordinates or a partial CssPosition object.
 *
 * `{ top: '0px', right: '0px', bottom: '0px', left: '0px' }`
 */
export type AnyPosition = Partial<Coordinates> & Partial<CssPosition>;

/**
 * The direction names of a joystick's event data.
 */
export type Direction = {
    /**
     * The angle of the joystick with 45° angles.
     *
     * ```
     *     \  up  /
     *      \    /
     * left  ›--‹  right
     *      /    \
     *     / down \
     *```
     */
    angle?: 'up' | 'down' | 'right' | 'left';
    /**
     * The horizontal direction of the joystick.
     */
    x?: 'left' | 'right';
    /**
     * The vertical direction of the joystick.
     */
    y?: 'up' | 'down';
};

/**
 * The event types of a joystick.
 */
export type JoystickEventType =
    | 'joystickCreated'
    /**
     * A joystick just got added.
     *
     * Will pass the instance alongside the event.
     */
    | 'added'

    /**
     * A joystick just got removed.
     *
     * Fired at the end of the fade-out animation.
     *
     * Will pass the instance alongside the event.
     *
     * Won’t be trigger in a 'dataOnly' configuration.
     */
    | 'removed'

    /**
     * A joystick is attached to an event.
     *
     * Will pass the instance, its collection and the event's identifier.
     */
    | 'attached'

    /**
     * A joystick is detached from a collection.
     *
     * Will pass the instance, its collection and the event's identifier.
     */
    | 'detached'

    /**
     * A joystick is activated. (the user pressed on the active zone)
     *
     * Will pass the instance alongside the event.
     */
    | 'start'

    /** A joystick is de-activated. (the user released the active zone)
     *
     * Will pass the instance alongside the event.
     */
    | 'end'

    /**
     * A joystick is moved
     */
    | 'move'

    /**
     * When a direction is reached after the threshold.
     *
     * Direction are split with a 45° angle.
     */
    | 'dir'
    | 'dir:up'
    | 'dir:down'
    | 'dir:right'
    | 'dir:left'

    /**
     * When a plain direction is reached after the threshold.
     *
     * Plain directions are split with a 90° angle.
     */
    | 'plain'

    // plain variations
    | 'plain:up'
    | 'plain:down'
    | 'plain:right'
    | 'plain:left'

    /**
     * Is triggered at the end of the fade-in animation.
     *
     * Will pass the instance alongside the event.
     *
     * Won’t be trigger in a dataOnly configuration.
     */
    | 'shown'

    /**
     * Is triggered at the end of the fade-out animation.
     *
     * Will pass the instance alongside the event.
     *
     * Won’t be trigger in a dataOnly configuration.
     */
    | 'hidden'

    /**
     * Is triggered when the joystick is rested.
     *
     * Will pass the instance alongside the event.
     *
     * Won’t be trigger in a dataOnly configuration.
     */
    | 'rested'

    /**
     * Is triggered at the end of destroy.
     *
     * Will pass the instance alongside the event.
     */
    | 'joystickDestroyed'

    /**
     * MBP’s Force Touch, iOS’s 3D Touch, Microsoft’s pressure or MDN’s force
     *
     * Is triggered when the pressure on the joystick is changed.
     *
     * The value, between 0 and 1, is sent back alongside the event.
     */
    | 'pressure';

/**
 * The event types of a collection.
 */
export type CollectionOnlyEventType =
    | 'collectionCreated'
    /**
     * A collection just got destroyed.
     *
     * Will pass the instance alongside the event.
     */
    | 'collectionDestroyed';

/**
 * The event types of a factory.
 */
export type FactoryOnlyEventType = 'factoryCreated' | 'factoryDestroyed';

/**
 * The event types of a collection.
 */
export type CollectionEventType = JoystickEventType | CollectionOnlyEventType;

/**
 * The event triggered by a factory.
 */
export type FactoryEventType = CollectionEventType | FactoryOnlyEventType;

/**
 * The event data emitted by a joystick instance.
 */
export interface JoystickEventData {
    /**
     * The angle of the joystick from its center position.
     */
    angle: {
        /** The angle in degrees (0-360) */
        degree: number;
        /** The angle in radians (0-2π) */
        radian: number;
    };
    /**
     * The cardinal/ordinal direction of the joystick.
     *
     * Only set when the joystick moves beyond the threshold.
     */
    direction?: Direction;
    /**
     * The normalized vector (x,y) representing the joystick position.
     *
     * Values range from -1 to 1 on each axis.
     */
    vector: Coordinates;
    /**
     * The raw/unprocessed position data.
     */
    raw: {
        /** Distance in pixels from the center position of the joystick */
        distance: number;
        /** Raw pixel coordinates of the front/movable part of the joystick */
        position: Coordinates;
    };
    /** Distance in pixels from the center position of the joystick */
    distance: number;
    /**
     * Normalized force/distance from the center position of the joystick.
     *
     * Ranges from 0 to 1 where 1 is maximum displacement.
     */
    force: number;
    /** Reference to the joystick instance that triggered the event */
    instance: Joystick;
    /** Whether movement is locked on the X axis */
    lockX: boolean;
    /** Whether movement is locked on the Y axis */
    lockY: boolean;
    /** Current position coordinates of the base of the joystick */
    position: Coordinates;
    /**
     * Pressure value from touch input if available.
     *
     * Ranges from 0 to 1.
     */
    pressure: number;
    /**
     * The delta movement of the joystick base when `follow: true` is active.
     *
     * `{ x: 0, y: 0 }` when the base hasn't moved (thumb within radius).
     * Non-zero when the base follows the thumb beyond its edge.
     * Always `{ x: 0, y: 0 }` when `follow` is disabled.
     */
    baseDelta: Coordinates;
}

/**
 * The data of an attach event.
 */
export type AttachEventData = {
    /** The collection that the joystick is attached to */
    collection: Collection;
    /** The joystick that is attached */
    joystick: Joystick;
    /** The identifier of the event that triggered this attachment */
    identifier: Identifier;
};

/**
 * The normalized event data of a DOM event.
 */
export type DomEvent = {
    /** The identifier of the event */
    identifier: Identifier;
    /** Whether the event is a touch event */
    isTouch: boolean;
    /** The normalized position of the event */
    position: Coordinates;
    /** The normalized pressure of the event */
    pressure: number;
    /** The type of the event */
    type: string;
    /** The initial event, either TouchEvent, MouseEvent or PointerEvent */
    initial: SupportedEvent;
    /** The streamlined event, either Touch, MouseEvent or PointerEvent */
    raw: ProcessedEvent;
};

/**
 * The event handler of a DOM event.
 */
export type DomEventHandler = (evt: DomEvent) => void;

/**
 * The data of an internal event.
 */
export type InternalEventData =
    | Joystick
    | Collection
    | JoystickEventData
    | AttachEventData
    | number;

/**
 * The internal event.
 */
export interface InternalEvent<T> {
    /** The type of the event */
    type: FactoryEventType;
    /** The target of the event, either a Joystick, a Collection or a Factory */
    target: Super;
    /** The data of the event */
    data: T;
}

/**
 * The internal event handler.
 */
export type InternalEventHandler<T> = (evt: InternalEvent<T>) => void;

/**
 * The types of interface we support.
 */
export type InteractType = 'touch' | 'mouse' | 'pointer';

/**
 * The types of event we support.
 */
export type EventType = 'start' | 'move' | 'end' | 'pressure';

/**
 * The types of event sources we support.
 */
export type SupportedEvent = MouseEvent | TouchEvent | PointerEvent;

/**
 * The streamlined event.
 *
 * Touches are extracted from the changedTouches TouchList property.
 */
export type ProcessedEvent = MouseEvent | Touch | PointerEvent;

/**
 * The event handler of a supported event.
 */
export type SupportedEventHandler = (evt: SupportedEvent) => void;

/**
 * The supported DOM elements.
 */
export type SupportedElement = HTMLElement | Document | Window;
