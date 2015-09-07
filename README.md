![alt tag](./test/nipplejs.png)
> A virtual joystick for touch capable interfaces

## Install
```node
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
var joystick = require('nipplejs').create(options);

// AMD
define(['nipplejs'], function (nipplejs) {
    var joystick = nipplejs.create(options);
});

// Global
<script type="text/javascript" src="./dist/nipplejs.min.js"></script>
<script type="text/javascript">
    var joystick = nipplejs.create(options);
</script>
```
----
## Options
You can configure your joystick in different ways :

```javascript
var options = {
    zone: Element,
    color: String,
    size: Integer,
    threshold: Float,
    fadeTime: Integer
};
```

All options are optional.

### [`zone`] defaults to 'body'
The dom element in which your joystick will be injected.
```javascript
<div id="zone_joystick"></div>

<script type="text/javascript" src="./nipplejs.min.js"></script>
<script type="text/javascript">
    var options = {
        zone: document.getElementById('zone_joystick');
    };
    var joystick = nipplejs.create(options);
</script>
```
This zone also serve as the mouse/touch events handler.

It represents the zone where your joystick will be active.

### [`color`] defaults to 'white'
The background color of your joystick's elements.

Can be any valid CSS color.

### [`size`] defaults to 100
The size in pixel of the outer circle.

The inner circle is 50% of this size.

### [`threshold`] defaults to 0.1
This is the strength needed to trigger a directional event.

Basically, the center is 0 and the outer is 1.

You need to at least go to 0.1 to trigger a directional event.

### [`fadeTime`] defaults to 250
The time it takes for joystick to fade-out and fade-in when activated or de-activated.

----
## API
Your `nipplejs` instance will come back as :

```javascript
{
    el: Element,
    on: Function,
    off: Function,
    options: Object,
    ui: Object
}
```

### `el`
Dom element in which the joystick gets created.
```html
<div class="nipple">
    <div class="front"></div>
    <div class="back"></div>
</div>
```

### `on`
If you whish to listen to internal events like :

```javascript
joystick.on('event', function (evt, data) {
    // Do something.
});
```

### `off`
To remove an event handler :

```javascript
joystick.off('event', handler);
```
### `options`
Simply the options you passed at its creation.

### `ui`
The object that store its ui elements

```javascript
{
    el: <div class="nipple"></div>
    back: <div class="back"></div>
    front: <div class="front"></div>
}
```
----
## Events

#### `start`
The joystick is activated. (the user pressed on the active zone)

#### `end`
The joystick is de-activated. (the user released the active zone)

#### `move`
The joystick is moved.
Comes with data :
```javascript
{
    position: { // absolute position of the center in pixels
        x: 125,
        y: 95
    },
    force: 0.2, // strength in %
    distance: 25.4, // distance from center in pixels
    angle: {
        radian: 1.5707963268, // angle in radian
        degree: 90
    }
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

## Contributing
Your help is more than welcome, I would be very honored to have you on my side.

Here are some very basic guidelines.

#### Commits
Please follow these [guidelines](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit) so your commits will be taken by the self-generated changelog.

#### Style
There are both [JSCS](http://jscs.info/) and [ESLint](http://eslint.org/) in the project.

To test your code against them simply run `npm run prebuild`.

We follow a 4 spaces rule around here.

#### Build
Once you're satisfied with your changes, you can also include a build.

1. `npm run build` to generate built files. Commit is automatic.
3. `npm run copyToGhPages` will copy the new build over to Github-Pages with. Have a clean slate for this to work.
4. `npm version patch|minor|major` depending on your change. Changelog will be generated and bower's version synced and everything is automatically committed (not pushed though).
