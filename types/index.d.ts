export interface JoystickManagerOptions {
    /**
     * Defaults to `'body'`
     * The dom element in which all your joysticks will be injected.
     *
     * This zone also serve as the mouse/touch events handler.
     *
     * It represents the zone where all your joysticks will be active.
     */
    zone?: HTMLElement;

    /**
     * Defaults to `'white'`
     * The background color of your joystick’s elements.
     *
     * Can be any valid CSS color.
     */
    color?: string;

    /**
     * Defaults to `100`
     * The size in pixel of the outer circle.
     *
     * The inner circle is 50% of this size.
     */
    size?: number;

    /**
     * This is the strength needed to trigger a directional event.
     *
     * Basically, the center is 0 and the outer is 1.
     *
     * You need to at least go to 0.1 to trigger a directional event.
     */
    threshold?: number;

    /**
     * Defaults to `250`
     *
     * The time it takes for joystick to fade-out and fade-in when activated or de-activated.
     */
    fadeTime?: number;

    /**
     * Defaults to `false`
     *
     * Enable the multitouch capabilities.
     *
     * If, for reasons, you need to have multiple nipples into the same zone.
     *
     * Otherwise it will only get one, and all new touches won’t do a thing.
     *
     * Please note that multitouch is off when in static or semi modes.
     */
    multitouch?: boolean;

    /**
     * Defaults to `1`
     *
     * If you need to, you can also control the maximum number of instance that could be created.
     *
     * Obviously in a multitouch configuration.
     */
    maxNumberOfNipples?: number;

    /**
     * Defaults to `false`
     *
     * The library won’t draw anything in the DOM and will only trigger events with data.
     */
    dataOnly?: boolean;

    /**
     * Defaults to `{top: 0, left: 0}`
     *
     * An object that will determine the position of a static mode.
     *
     * You can pass any of the four top, right, bottom and left.
     *
     * They will be applied as any css property.
     */
    position?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };

    /**
     * Behavioral mode for the joystick
     *
     * ### 'dynamic':
     * a new joystick is created at each new touch.
     * the joystick gets destroyed when released.
     * can be multitouch.
     *
     * ### 'semi':
     * new joystick is created at each new touch farther than options.catchDistance of any previously created joystick.
     * the joystick is faded-out when released but not destroyed.
     * when touch is made inside the options.catchDistance a new direction is triggered immediately.
     * when touch is made outside the options.catchDistance the previous joystick is destroyed and a new one is created.
     * cannot be multitouch.
     *
     * ### 'static':
     * a joystick is positioned immediately at options.position.
     * one joystick per zone.
     * each new touch triggers a new direction.
     * cannot be multitouch.
     */
    mode?: 'dynamic' | 'semi' | 'static';

    /**
     * Defaults to `true`
     *
     * Reset the joystick’s position when it enters the rest state.
     */
    restJoystick?: boolean | RestJoystickOption;

    /**
     * Defaults to `0.5`
     * The opacity to apply when the joystick is in a rest position.
     */
    restOpacity?: number;

    /**
     * Defaults to `200`
     *
     * This is only useful in the semi mode, and determine at which distance we recycle the previous joystick.
     */
    catchDistance?: number;

    /**
     * Defaults to `false`
     *
     * Locks joystick’s movement to the x (horizontal) axis
     */
    lockX?: boolean;

    /**
     * Defaults to `false`
     *
     * Locks joystick’s movement to the y (vertical) axis
     */
    lockY?: boolean;

    /**
     * Defaults to `false`
     *
     * Enable if the page has dynamically visible elements such as for Vue, React, Angular or simply some CSS hiding or
     * showing some DOM.
     */
    dynamicPage?: boolean;

    /**
     * Defaults to `circle`
     *
     * Sets the shape of the joystick
     */
    shape?: 'circle' | 'square';

    /**
     * Defaults to `false`
     *
     * Make the joystick follow the cursor beyond its limits.
     */
    follow?: boolean;
}

export interface RestJoystickOption {
    /**
     * Defaults to `true`
     */
    x?: boolean,
    /**
     * Defaults to `true`
     */
    y?: boolean,
}

export interface Position {
    x: number;
    y: number;
}

export interface Direction {
    angle: 'up' | 'down' | 'right' | 'left';
    x: 'left' | 'right';
    y: 'up' | 'down';
}

export interface JoystickOutputData {
    angle: {
        degree: number;
        radian: number;
    };
    direction: Direction;
    vector: {
        x: number;
        y: number;
    };
    raw: {
      distance: number;
      position: Position;
    };
    distance: number;
    force: number;
    identifier: number;
    instance: Joystick;
    position: Position;
    pressure: number;
}

export type JoystickEventTypes =
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
     *Is triggered when the pressure on the joystick is changed.
     *
     *The value, between 0 and 1, is sent back alongside the event.
     */
    | 'pressure';

export type ManagerOnlyEventTypes =
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
     * Won’t be trigger in a dataOnly configuration.
     */
    | 'removed';

export type JoystickManagerEventTypes = JoystickEventTypes | ManagerOnlyEventTypes;

export interface EventData {
    type: JoystickEventTypes | ManagerOnlyEventTypes;
    target: Collection;
}

export class JoystickManager {
    create(options?: JoystickManagerOptions): JoystickManager;

    on(
        type: JoystickManagerEventTypes | JoystickManagerEventTypes[],
        handler: (evt: EventData, data: JoystickOutputData) => void
    ): void;
    off(
        type: JoystickManagerEventTypes | JoystickManagerEventTypes[],
        handler: (evt: EventData, data: JoystickOutputData) => void
    ): void;
    get(identifier: number): Joystick;
    destroy(): void;
    ids: number[];
    id: number;
}

export interface Collection {
    nipples: Joystick[];
    idles: Joystick[];
    actives: Joystick[];
    ids: number[];
    pressureIntervals: {};
    manager: JoystickManager;
    id: number;
    defaults: JoystickManagerOptions;
    parentIsFlex: boolean;
}

export interface Joystick {
    on(
        type: JoystickEventTypes | JoystickEventTypes[],
        handler: (evt: EventData, data: JoystickOutputData) => void
    ): void;
    off(
        type: JoystickEventTypes | JoystickEventTypes[],
        handler: (evt: EventData, data: JoystickOutputData) => void
    ): void;
    el: HTMLElement;
    show(cb?: () => void): void;
    hide(cb?: () => void): void;
    add(): void;
    remove(): void;
    destroy(): void;
    setPosition(cb: (joystick: Joystick) => void, position: Position): void;
    identifier: number;
    trigger(
        type: JoystickEventTypes | JoystickEventTypes[],
        handler: (evt: EventData, data: any) => void
    ): void;
    position: Position;
    frontPosition: Position;
    ui: {
        el: HTMLElement;
        front: HTMLElement;
        back: HTMLElement;
    };
    options: JoystickManagerOptions;
}

/**
 * A JavaScript library for creating vanillaJS virtual joysticks, for touch capable interfaces.
 */
declare module 'nipplejs' {
    /**
     * Create a Joystick manager
     * @param options for creating a manager instance
     * @return manager instance
     */
    function create(options: JoystickManagerOptions): JoystickManager;

    /**
     * Library's root manger instance.
     */
    const factory: JoystickManager;
}
