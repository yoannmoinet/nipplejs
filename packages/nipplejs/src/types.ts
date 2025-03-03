import type Collection from './Collection';
import type Factory from './Factory';
import type Joystick from './Joystick';
import type Super from './Super';
import type { MODES } from './constants';

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
     * ### Defaults to `'white'`
     *
     * The background color of your joystick’s elements.
     *
     * Can be any valid CSS color.
     */
    color?: string;

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

export interface JoystickOptions extends CommonOptions {
    identifier: number;
    position: Coordinates;
    frontPosition: Coordinates;
}

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

export interface Coordinates {
    x: number;
    y: number;
}

export interface CssPosition {
    top: string;
    right: string;
    bottom: string;
    left: string;
}

export type AnyPosition = Partial<Coordinates> & Partial<CssPosition>;

/**
 * The direction names of a joystick's event data.
 */
export interface Direction {
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
}

export type JoystickEventType =
    /**
     * A joystick is activated. (the user pressed on the active zone)
     * Will pass the instance alongside the event.
     */
    | 'start'

    /** A joystick is de-activated. (the user released the active zone)
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
     * Is triggered at the end of destroy.
     *
     * Will pass the instance alongside the event.
     */
    | 'destroyed'

    /**
     * MBP’s Force Touch, iOS’s 3D Touch, Microsoft’s pressure or MDN’s force
     *
     * Is triggered when the pressure on the joystick is changed.
     *
     * The value, between 0 and 1, is sent back alongside the event.
     */
    | 'pressure';

export type FactoryOnlyEventType =
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
    | 'removed';

export type FactoryEventType = JoystickEventType | FactoryOnlyEventType;

export interface JoystickEventData {
    angle: {
        degree: number;
        radian: number;
    };
    direction?: Direction;
    vector: Coordinates;
    raw: {
        distance: number;
        position: Coordinates;
    };
    distance: number;
    force: number;
    identifier: number;
    instance: Joystick;
    lockX: boolean;
    lockY: boolean;
    position: Coordinates;
    pressure: number;
}

export type DomEvent = {
    identifier: number;
    isTouch: boolean;
    position: Coordinates;
    pressure: number;
    type: string;
    initial: SupportedEvent;
    raw: ProcessedEvent;
};
export type DomEventHandler = (evt: DomEvent) => void;

export type InternalEventData = Joystick | Collection | JoystickEventData | number;
export interface InternalEvent<T> {
    type: FactoryEventType;
    target: Super;
    data: T;
}

export type InternalEventHandler<T> = (evt: InternalEvent<T>) => void;

/**
 * The types of interface we support.
 */
export type InteractType = 'touch' | 'mouse' | 'pointer' | 'MSPointer';
/**
 * The types of event we support.
 */
export type EventType = 'start' | 'move' | 'end';

/**
 * The types of event we support.
 */
export type SupportedEvent = MouseEvent | TouchEvent | PointerEvent;
export type ProcessedEvent = MouseEvent | Touch | PointerEvent;
export type SupportedEventHandler = (evt: SupportedEvent) => void;

export type SupportedElement = HTMLElement | Document | Window;

/**
 * A JavaScript library for creating virtual joysticks, for touch capable interfaces.
 */
declare module 'nipplejs' {
    /**
     * Create a new custom Joystick collection
     * @param {CollectionOptions} options for creating a collection instance
     * @return {Collection} a collection instance
     */
    function create(options: CollectionOptions): Collection;

    /**
     * Root factory instance.
     */
    const factory: Factory;
}
