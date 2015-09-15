///////////////////////
///   THE NIPPLE    ///
///////////////////////

var Nipple = function (manager, options) {
    this.identifier = options.identifier;
    this.position = options.position;
    this.backPosition = options.backPosition;
    this.frontPosition = options.frontPosition;
    this.manager = manager;
    this.config(options);
    this.buildEl()
        .stylize();

    return {
        el: this.ui.el,
        on: this.on.bind(this),
        off: this.off.bind(this),
        show: this.show.bind(this),
        hide: this.hide.bind(this),
        add: this.addToDom.bind(this),
        remove: this.removeFromDom.bind(this),
        computeDirection: this.computeDirection.bind(this),
        trigger: this.trigger.bind(this),
        position: this.position,
        backPosition: this.backPosition,
        frontPosition: this.frontPosition,
        ui: this.ui,
        identifier: this.identifier,
        options: this.options
    };
};

Nipple.prototype = new Super();

// Configure Nipple instance.
Nipple.prototype.config = function (options) {
    this.options = {};

    // Defaults
    this.options.size = 100;
    this.options.threshold = 0.1;
    this.options.color = 'white';
    this.options.fadeTime = 250;

    // Overwrites
    for (var i in options) {
        if (this.options.hasOwnProperty(i)) {
            this.options[i] = options[i];
        }
    }

    return this;
};

// Build the dom element of the Nipple instance.
Nipple.prototype.buildEl = function (options) {
    this.ui = {};
    this.ui.el = document.createElement('div');
    this.ui.back = document.createElement('div');
    this.ui.front = document.createElement('div');

    this.ui.el.className = 'nipple';
    this.ui.back.className = 'back';
    this.ui.front.className = 'front';

    this.ui.el.setAttribute('id', 'nipple_' + this.identifier);

    this.ui.el.appendChild(this.ui.back);
    this.ui.el.appendChild(this.ui.front);

    return this;
};

// Apply CSS to the Nipple instance.
Nipple.prototype.stylize = function () {
    this.styles = {};
    this.styles.el = {
        width: this.options.size + 'px',
        height: this.options.size + 'px',
        position: 'absolute',
        opacity: 0,
        display: 'none',
        'transition': 'opacity ' + this.options.fadeTime + 'ms',
        'webkitTransition': 'opacity ' + this.options.fadeTime + 'ms',
        'MozTransition': 'opacity ' + this.options.fadeTime + 'ms',
        'oTransition': 'opacity ' + this.options.fadeTime + 'ms',
        'zIndex': 999
    };

    this.styles.back = {
        position: 'relative',
        display: 'block',
        width: '100%',
        height: '100%',
        background: this.options.color,
        'borderRadius': '50%',
        'webkitBorderRadius': '50%',
        'MozBorderRadius': '50%',
        'opacity': '.5'
    };

    this.styles.front = {
        width: '50%',
        height: '50%',
        position: 'absolute',
        display: 'block',
        background: this.options.color,
        'borderRadius': '50%',
        'webkitBorderRadius': '50%',
        'MozBorderRadius': '50%',
        'opacity': '.5'
    };

    // Apply styles
    for (var i in this.ui) {
        if (this.ui.hasOwnProperty(i)) {
            for (var j in this.styles[i]) {
                this.ui[i].style[j] = this.styles[i][j];
            }
        }
    }

    return this;
};

// Inject the Nipple instance into DOM.
Nipple.prototype.addToDom = function () {
    this.manager.options.zone.appendChild(this.ui.el);
    return this;
};

// Remove the Nipple instance from DOM.
Nipple.prototype.removeFromDom = function () {
    this.manager.options.zone.removeChild(this.ui.el);
    return this;
};

// Fade in the Nipple instance.
Nipple.prototype.show = function () {
    var self = this;

    clearTimeout(self.removeTimeout);

    self.ui.el.style.opacity = 0;
    self.addToDom();
    self.ui.el.style.display = 'block';

    setTimeout(function () {
        self.ui.el.style.opacity = 1;
    }, 0);

    return self;
};

// Fade out the Nipple instance.
Nipple.prototype.hide = function () {
    var self = this;

    self.ui.el.style.opacity = 0;
    clearTimeout(self.removeTimeout);

    self.removeTimeout = setTimeout(
        function () {
            self.ui.el.style.display = 'none';
            self.removeFromDom();
        },
        self.options.fadeTime
    );

    return self;
};

Nipple.prototype.computeDirection = function (obj) {
    var rAngle = obj.angle.radian;
    var angle45 = Math.PI / 4;
    var angle90 = Math.PI / 2;
    var direction, directionX, directionY;

    // Angular direction
    //     \  UP /
    //      \   /
    // LEFT       RIGHT
    //      /   \
    //     /DOWN \
    //
    if (rAngle > angle45 && rAngle < (angle45 * 3)) {
        direction = 'up';
    } else if (rAngle > -angle45 && rAngle <= angle45) {
        direction = 'left';
    } else if (rAngle > (-angle45 * 3) && rAngle <= -angle45) {
        direction = 'down';
    } else {
        direction = 'right';
    }

    // Plain direction
    //    UP                 |
    // _______               | RIGHT
    //                  LEFT |
    //   DOWN                |
    if (rAngle > -angle90 && rAngle < angle90) {
        directionX = 'left';
    } else {
        directionX = 'right';
    }

    if (rAngle > 0) {
        directionY = 'up';
    } else {
        directionY = 'down';
    }

    if (obj.force > this.options.threshold) {
        var oldDirection = {};
        for (var i in this.direction) {
            if (this.direction.hasOwnProperty(i)) {
                oldDirection[i] = this.direction[i];
            }
        }
        var same = true;

        this.direction = {
            x: directionX,
            y: directionY,
            angle: direction
        };

        obj.direction = this.direction;

        for (var i in oldDirection) {
            if (oldDirection[i] !== this.direction[i]) {
                same = false;
            }
        }

        if (same) {
            return;
        }

        if (oldDirection.x !== this.direction.x ||
            oldDirection.y !== this.direction.y) {
            this.trigger('plain', obj);
            this.manager.trigger('plain ' + this.identifier + ':plain', obj);
        }

        if (oldDirection.x !== this.direction.x) {
            this.trigger('plain:' + directionX, obj);
            this.manager.trigger('plain:' + directionX + ' ' +
                this.identifier + ':plain:' + directionX, obj);
        }

        if (oldDirection.y !== this.direction.y) {
            this.trigger('plain:' + directionY, obj);
            this.manager.trigger('plain:' + directionY + ' ' +
                this.identifier + ':plain:' + directionY, obj);
        }

        if (oldDirection.angle !== this.direction.angle) {
            this.trigger('dir dir:' + direction, obj);
            this.manager.trigger('dir dir:' + direction + ' ' +
                this.identifier + ':dir ' +
                this.identifier + ':dir:' + direction, obj);
        }
    }
};
