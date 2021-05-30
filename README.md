![alt tag](./assets/nipplejs.png)
> A vanilla virtual joystick for touch capable interfaces


[![npm](https://img.shields.io/npm/v/nipplejs.svg)](https://npmjs.org/package/nipplejs)
[![npm](https://img.shields.io/npm/dm/nipplejs.svg)](https://npmjs.org/package/nipplejs)

# Table Of Contents
<details>

<!-- toc -->

- [Install](#install)
- [Demo](#demo)
- [Usage](#usage)
- [Options](#options)
  * [`options.zone` defaults to 'body'](#optionszone-defaults-to-body)
  * [`options.color` defaults to 'white'](#optionscolor-defaults-to-white)
  * [`options.size` defaults to 100](#optionssize-defaults-to-100)
  * [`options.threshold` defaults to 0.1](#optionsthreshold-defaults-to-01)
  * [`options.fadeTime` defaults to 250](#optionsfadetime-defaults-to-250)
  * [`options.multitouch` defaults to false](#optionsmultitouch-defaults-to-false)
  * [`options.maxNumberOfNipples` defaults to 1](#optionsmaxnumberofnipples-defaults-to-1)
  * [`options.dataOnly` defaults to false](#optionsdataonly-defaults-to-false)
  * [`options.position` defaults to `{top: 0, left: 0}`](#optionsposition-defaults-to-top-0-left-0)
  * [`options.mode` defaults to 'dynamic'.](#optionsmode-defaults-to-dynamic)
    + [`'dynamic'`](#dynamic)
    + [`'semi'`](#semi)
    + [`'static'`](#static)
  * [`options.restJoystick` defaults to true](#optionsrestjoystick-defaults-to-true)
  * [`options.restOpacity` defaults to 0.5](#optionsrestopacity-defaults-to-05)
  * [`options.catchDistance` defaults to 200](#optionscatchdistance-defaults-to-200)
  * [`options.lockX` defaults to false](#optionslockx-defaults-to-false)
  * [`options.lockY` defaults to false](#optionslocky-defaults-to-false)
  * [`options.shape` defaults to 'circle'](#optionsshape-defaults-to-circle)
    + [`'circle'`](#circle)
    + [`'square'`](#square)
  * [`options.dynamicPage` defaults to false](#optionsdynamicpage-defaults-to-false)
  * [`options.follow` defaults to false](#optionsfollow-defaults-to-false)
- [API](#api)
  * [NippleJS instance (manager)](#nipplejs-instance-manager)
    + [`manager.on(type, handler)`](#managerontype-handler)
    + [`manager.off([type, handler])`](#managerofftype-handler)
    + [`manager.get(identifier)`](#managergetidentifier)
    + [`manager.destroy()`](#managerdestroy)
    + [`manager.ids`](#managerids)
    + [`manager.id`](#managerid)
  * [nipple instance (joystick)](#nipple-instance-joystick)
  * [`joystick.on`, `joystick.off`](#joystickon-joystickoff)
  * [`joystick.el`](#joystickel)
  * [`joystick.show([cb])`](#joystickshowcb)
  * [`joystick.hide([cb])`](#joystickhidecb)
  * [`joystick.add()`](#joystickadd)
  * [`joystick.remove()`](#joystickremove)
  * [`joystick.destroy()`](#joystickdestroy)
  * [`joystick.setPosition(cb, { x, y })`](#joysticksetpositioncb--x-y-)
  * [`joystick.identifier`](#joystickidentifier)
  * [`joystick.trigger(type [, data])`](#joysticktriggertype--data)
  * [`joystick.position`](#joystickposition)
  * [`joystick.frontPosition`](#joystickfrontposition)
  * [`joystick.ui`](#joystickui)
- [Events](#events)
  * [manager only](#manager-only)
    + [`added`](#added)
    + [`removed`](#removed)
  * [manager and joysticks](#manager-and-joysticks)
    + [`start`](#start)
    + [`end`](#end)
    + [`move`](#move)
    + [`dir`](#dir)
    + [`plain`](#plain)
    + [`shown`](#shown)
    + [`hidden`](#hidden)
    + [`destroyed`](#destroyed)
    + [`pressure`](#pressure)
- [Contributing](#contributing)

<!-- tocstop -->

</details>

## Install

```bash
npm install nipplejs --save
```

----

## Demo
Check out the [demo here](http://yoannmoinet.github.io/nipplejs/#demo).

----

## Usage

Import it the way you want into your project :

```javascript
// CommonJS
var manager = require('nipplejs').create(options);
```

```javascript
// AMD
define(['nipplejs'], function (nipplejs) {
    var manager = nipplejs.create(options);
});
```

```javascript
// Module
import nipplejs from 'nipplejs';
```

```html
<!-- Global -->
<script src="./nipplejs.js"></script>
<script>
    var manager = nipplejs.create(options);
</script>
```

**:warning: NB :warning:** Your joystick's container **has** to have its CSS `position` property set, either `absolute`, `relative`, `static`, ....

----

## Options
You can configure your joystick in different ways :

```javascript
var options = {
    zone: Element,                  // active zone
    color: String,
    size: Integer,
    threshold: Float,               // before triggering a directional event
    fadeTime: Integer,              // transition time
    multitouch: Boolean,
    maxNumberOfNipples: Number,     // when multitouch, what is too many?
    dataOnly: Boolean,              // no dom element whatsoever
    position: Object,               // preset position for 'static' mode
    mode: String,                   // 'dynamic', 'static' or 'semi'
    restJoystick: Boolean|Object,   // Re-center joystick on rest state
    restOpacity: Number,            // opacity when not 'dynamic' and rested
    lockX: Boolean,                 // only move on the X axis
    lockY: Boolean,                 // only move on the Y axis
    catchDistance: Number,          // distance to recycle previous joystick in
                                    // 'semi' mode
    shape: String,                  // 'circle' or 'square'
    dynamicPage: Boolean,           // Enable if the page has dynamically visible elements
    follow: Boolean,                // Makes the joystick follow the thumbstick
};
```

All options are optional :sunglasses:.

### `options.zone` defaults to 'body'
The dom element in which all your joysticks will be injected.

```html
<div id="zone_joystick"></div>

<script type="text/javascript" src="./nipplejs.js"></script>
<script type="text/javascript">
    var options = {
        zone: document.getElementById('zone_joystick'),
    };
    var manager = nipplejs.create(options);
</script>
```

This zone also serve as the mouse/touch events handler.

It represents the zone where all your joysticks will be active.

### `options.color` defaults to 'white'
The background color of your joystick's elements.

Can be any valid CSS color.

### `options.size` defaults to 100
The size in pixel of the outer circle.

The inner circle is 50% of this size.

### `options.threshold` defaults to 0.1
This is the strength needed to trigger a directional event.

Basically, the center is 0 and the outer is 1.

You need to at least go to 0.1 to trigger a directional event.

### `options.fadeTime` defaults to 250
The time it takes for joystick to fade-out and fade-in when activated or de-activated.

### `options.multitouch` defaults to false
Enable the multitouch capabilities.

If, for reasons, you need to have multiple nipples in the same zone.

Otherwise, it will only get one, and all new touches won't do a thing.

Please note that multitouch is off when in `static` or `semi` modes.

### `options.maxNumberOfNipples` defaults to 1
If you need to, you can also control the maximum number of instances that could be created.

Obviously in a multitouch configuration.

### `options.dataOnly` defaults to false
The library won't draw anything in the DOM and will only trigger events with data.

### `options.position` defaults to `{top: 0, left: 0}`
An object that will determine the position of a `static` mode.

You can pass any of the four `top`, `right`, `bottom` and `left`.

They will be applied as any css property.

Ex :
- `{top: '50px', left: '50px'}`
- `{left: '10%', bottom: '10%'}`

### `options.mode` defaults to 'dynamic'.
Three modes are possible :

#### `'dynamic'`
- a new joystick is created at each new touch.
- the joystick gets destroyed when released.
- **can** be multitouch.

#### `'semi'`
- new joystick is created at each new touch farther than `options.catchDistance` of any previously created joystick.
- the joystick is faded-out when released but not destroyed.
- when touch is made **inside** the `options.catchDistance` a new direction is triggered immediately.
- when touch is made **outside** the `options.catchDistance` the previous joystick is destroyed and a new one is created.
- **cannot** be multitouch.

#### `'static'`
- a joystick is positioned immediately at `options.position`.
- one joystick per zone.
- each new touch triggers a new direction.
- **cannot** be multitouch.

### `options.restJoystick` defaults to true
Reset the joystick's position when it enters the rest state.

You can pass a boolean value to reset the joystick's position for both the axis.
```js
var joystick = nipplejs.create({
    restJoystick: true,
    // This is converted to {x: true, y: true}

    // OR
    restJoystick: false,
    // This is converted to {x: false, y: false}
});
```

Or you can pass an object to specify which axis should be reset.
```js
var joystick = nipplejs.create({
    restJoystick: {x: false},
    // This is converted to {x: false, y: true}

    // OR
    restJoystick: {x: false, y: true},
});
```

### `options.restOpacity` defaults to 0.5
The opacity to apply when the joystick is in a rest position.

### `options.catchDistance` defaults to 200
This is only useful in the `semi` mode, and determine at which distance we recycle the previous joystick.

At 200 (px), if you press the zone into a rayon of 200px around the previously displayed joystick,
it will act as a `static` one.

### `options.lockX` defaults to false
Locks joystick's movement to the x (horizontal) axis

### `options.lockY` defaults to false
Locks joystick's movement to the y (vertical) axis

### `options.shape` defaults to 'circle'
The shape of region within which joystick can move.

#### `'circle'`
Creates circle region for joystick movement

#### `'square'`
Creates square region for joystick movement

### `options.dynamicPage` defaults to false
Enable if the page has dynamically visible elements such as for Vue, React, Angular or simply some CSS hiding or showing some DOM.

### `options.follow` defaults to false
Makes the joystick follow the thumbstick when it reaches the border.

----

## API

### NippleJS instance (manager)

Your manager has the following signature :

```javascript
{
    on: Function,                       // handle internal event
    off: Function,                      // un-handle internal event
    get: Function,                      // get a specific joystick
    destroy: Function,                  // destroy everything
    ids: Array                          // array of assigned ids
    id: Number                          // id of the manager
    options: {
        zone: Element,                  // reactive zone
        multitouch: Boolean,
        maxNumberOfNipples: Number,
        mode: String,
        position: Object,
        catchDistance: Number,
        size: Number,
        threshold: Number,
        color: String,
        fadeTime: Number,
        dataOnly: Boolean,
        restJoystick: Boolean,
        restOpacity: Number
    }
}
```

#### `manager.on(type, handler)`

If you wish to listen to internal events like :

```javascript
manager.on('event#1 event#2', function (evt, data) {
    // Do something.
});
```

Note that you can listen to multiple events at once by separating
them either with a space or a comma (or both, I don't care).

#### `manager.off([type, handler])`

To remove an event handler :

```javascript
manager.off('event', handler);
```

If you call off without arguments, all handlers will be removed.

If you don't specify the handler but just a type, all handlers for that type will be removed.

#### `manager.get(identifier)`

A helper to get an instance via its identifier.

```javascript
// Will return the nipple instantiated by the touch identified by 0
manager.get(0);
```

#### `manager.destroy()`

Gently remove all nipples from the DOM and unbind all events.

```javascript
manager.destroy();
```

#### `manager.ids`

The array of nipples' ids under this manager.

#### `manager.id`

The incremented id of this manager.

### nipple instance (joystick)

Each joystick has the following signature :

```javascript
{
    on: Function,
    off: Function,
    el: Element,
    show: Function,         // fade-in
    hide: Function,         // fade-out
    add: Function,          // inject into dom
    remove: Function,       // remove from dom
    destroy: Function,
    setPosition: Function,
    identifier: Number,
    trigger: Function,
    position: {             // position of the center
        x: Number,
        y: Number
    },
    frontPosition: {        // position of the front part
        x: Number,
        y: Number
    },
    ui: {
        el: Element,
        front: Element,
        back: Element
    },
    options: {
        color: String,
        size: Number,
        threshold: Number,
        fadeTime: Number
    }
}
```

### `joystick.on`, `joystick.off`

The same as the manager.

### `joystick.el`

Dom element in which the joystick gets created.

```html
<div class="nipple">
    <div class="front"></div>
    <div class="back"></div>
</div>
```

### `joystick.show([cb])`

Will show the joystick at the last known place.

You can pass a callback that will be executed at the end of the fade-in animation.

### `joystick.hide([cb])`

Will fade-out the joystick.

You can pass a callback that will be executed at the end of the fade-out animation.

### `joystick.add()`

Add the joystick's element to the dom.

### `joystick.remove()`

Remove the joystick's element from the dom.

### `joystick.destroy()`

Gently remove this nipple from the DOM and unbind all related events.

### `joystick.setPosition(cb, { x, y })`

Set the joystick to the specified position, where x and y are distances away from the center in pixels. This does not trigger joystick events.

### `joystick.identifier`

Returns the unique identifier of the joystick.

Tied to its touch's identifier.

### `joystick.trigger(type [, data])`

Trigger an internal event from the joystick.

The same as `on` you can trigger multiple events at the same time.

### `joystick.position`

The absolute position of the center of the joystick.

### `joystick.frontPosition`

The absolute position of the back part of the joystick's ui.

### `joystick.ui`

The object that store its ui elements

```html
{
    el: <div class="nipple"></div>
    back: <div class="back"></div>
    front: <div class="front"></div>
}
```

----

## Events

You can listen events both on the manager and all the joysticks.

But some of them are specific to its instance.

If you need to listen to each joystick, for example, you can :

```javascript
manager.on('added', function (evt, nipple) {
    nipple.on('start move end dir plain', function (evt) {
        // DO EVERYTHING
    });
}).on('removed', function (evt, nipple) {
    nipple.off('start move end dir plain');
});
```

### manager only

#### `added`

A joystick just got added.

Will pass the instance alongside the event.

#### `removed`

A joystick just got removed.

Fired at the end of the fade-out animation.

Will pass the instance alongside the event.

Won't be trigger in a `dataOnly` configuration.

### manager and joysticks

Other events are available on both the manager and joysticks.

When listening on the manager,
you can also target **a joystick in particular** by prefixing
the event with its identifier, **`0:start`** for example.

Else you'll get all events from all the joysticks.

#### `start`

A joystick is activated. (the user pressed on the active zone)

Will pass the instance alongside the event.

#### `end`

A joystick is de-activated. (the user released the active zone)

Will pass the instance alongside the event.

#### `move`

A joystick is moved.

Comes with data :

```javascript
{
    identifier: 0,              // the identifier of the touch/mouse that triggered it
    position: {                 // absolute position of the center in pixels
        x: 125,
        y: 95
    },
    force: 0.2,                 // strength in %
    distance: 25.4,             // distance from center in pixels
    pressure: 0.1,              // the pressure applied by the touch
    angle: {
        radian: 1.5707963268,   // angle in radian
        degree: 90
    },
    vector: {                   // force unit vector
      x: 0.508,
      y: 3.110602869834277e-17
    },
    raw: {                      // note: angle is the same, beyond the 50 pixel limit
        distance: 25.4,         // distance which continues beyond the 50 pixel limit
        position: {             // position of the finger/mouse in pixels, beyond joystick limits
            x: 125,
            y: 95
        }
    },
    instance: Nipple            // the nipple instance that triggered the event
}
```

#### `dir`

When a direction is reached after the threshold.

Direction are split with a 45° angle.

```javascript
//     \  UP /
//      \   /
// LEFT       RIGHT
//      /   \
//     /DOWN \
```

You can also listen to specific direction like :

- `dir:up`
- `dir:down`
- `dir:right`
- `dir:left`

In this configuration only one direction is triggered at a time.

#### `plain`

When a plain direction is reached after the threshold.

Plain directions are split with a 90° angle.

```javascript
//       UP               |
//     ------        LEFT | RIGHT
//      DOWN              |
```

You can also listen to specific plain direction like :

- `plain:up`
- `plain:down`
- `plain:right`
- `plain:left`

In this configuration two directions can be triggered at a time,
because the user could be both `up` and `left` for example.

#### `shown`

Is triggered at the end of the fade-in animation.

Will pass the instance alongside the event.

Won't be trigger in a `dataOnly` configuration.

#### `hidden`

Is triggered at the end of the fade-out animation.

Will pass the instance alongside the event.

Won't be trigger in a `dataOnly` configuration.

#### `destroyed`

Is triggered at the end of destroy.

Will pass the instance alongside the event.

#### `pressure`

> MBP's [**Force Touch**](http://www.apple.com/macbook-pro/features-retina/#interact), iOS's [**3D Touch**](http://www.apple.com/iphone-6s/3d-touch/), Microsoft's [**pressure**](https://msdn.microsoft.com/en-us/library/hh772360%28v=vs.85%29.aspx) or MDN's [**force**](https://developer.mozilla.org/en-US/docs/Web/API/Touch/force)

Is triggered when the pressure on the joystick is changed.

The value, between 0 and 1, is sent back alongside the event.

----

## Contributing
You can follow [this document](./CONTRIBUTING.md) to help you get started.
