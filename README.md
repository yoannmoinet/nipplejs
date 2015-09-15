![alt tag](./test/nipplejs.png)
> A virtual joystick for touch capable interfaces

## Install

```bash
npm install nipplejs --save

// OR

bower install nipplejs --save
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

```html
// Global
<script type="text/javascript" src="./dist/nipplejs.min.js"></script>
<script type="text/javascript">
    var manager = nipplejs.create(options);
</script>
```

----
## Options
You can configure your joystick in different ways :

```javascript
var options = {
    zone: Element,      // active zone
    color: String,
    size: Integer,
    threshold: Float,   // before triggering a directional event
    fadeTime: Integer,
    multitouch: Boolean,
    maxNumberOfNipples: Number
};
```

All options are optional.

### `options.zone` defaults to 'body'
The dom element in which all your joysticks will be injected.

```html
<div id="zone_joystick"></div>

<script type="text/javascript" src="./nipplejs.min.js"></script>
<script type="text/javascript">
    var options = {
        zone: document.getElementById('zone_joystick');
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

If, for reasons, you need to have multiple nipples into the same zone.

Otherwise it will only get one, and all new touches won't do a thing.

### `options.maxNumberOfNipples` defaults to 1
If you need to, you can also control the maximum number of instance that could be created.

Obviously in a multitouch configuration.

----
## API

### NippleJS instance (manager)

Your manager has the following signature :

```javascript
{
    on: Function,
    off: Function,
    get: Function, // get a specific joystick
    options: {
        zone: Element,
        multitouch: Boolean,
        maxNumberOfNipples: Number
    }
}
```

#### `manager.on(type, handler)`

If you whish to listen to internal events like :

```javascript
manager.on('event#1 event#2', function (evt, data) {
    // Do something.
});
```

Note that you can listen to multiple events at once by separating
them either with a space or a comma (or both, I don't care).

#### `manager.off(type [, handler])`

To remove an event handler :

```javascript
manager.off('event', handler);
```

If you don't specify the handler, all handlers for that type will be removed.

#### `manager.get(identifier)`

An helper to get an instance via its identifier.

```javascript
// Will return the nipple instanciated by the touch identified by 0
manager.get(0);
```

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
    identifier: Number,
    trigger: Function,
    position: {             // position of the center
        x: Number,
        y: Number
    },
    backPosition: {         // position of the back part
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

### `joystick.backPosition`

The absolute position of the front part of the joystick's ui.

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

#### `hidden`

Is triggered at the end of the fade-out animation.

Will pass the instance alongside the event.

----
## Contributing
Your help is more than welcome, I would be very honored to have you on my side.

Here are some very basic guidelines.

#### Commits
Please follow these [guidelines](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit) so your commits will be taken by the self-generated changelog.

#### Style
There are both [JSCS](http://jscs.info/) and [ESLint](http://eslint.org/) in the project.

To test your code against them simply run `npm run prebuild`.

We follow a **4 spaces** rule around here.

#### Workflow
You can use the available scripts if needed.

- `npm run watch` will run the build each time a change is detected.
- `npm run prebuild` will test the formatting and the linting of your code.

#### Build
Once you're satisfied with your changes, you can also include a build.

1. `npm run build` to generate built files.
2. commit your build with the message `chore: new build`.
3. `npm version patch|minor|major` depending on your change. Changelog will be generated and bower's version synced and everything is automatically committed (not pushed though).
