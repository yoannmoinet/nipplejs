var mouse = require('mouse').create(casper);
var u = require('utils');
var c = require('colorizer').create('Colorizer');

var NB_TESTS = 10;
var thumbIndex = 0;
var collectionIndex = 0;
var showClientLog = false;
var currentFile = require('system').args[3];
var curFilePath = fs.absolute(currentFile);

/*
    CONFIGURE CASPER
*/

casper.options.viewportSize = {width: 1100, height: 900};
casper.options.logLevel = 'debug';

/*
    LISTEN TO CASPER
*/

casper.on('remote.message', function(message) {
    if (!showClientLog) {
        return;
    }
    if (typeof message === 'string') {
        casper.echo('>> [CLIENT] ' + message, 'WARN_BAR');
    } else {
        casper.echo('>> [CLIENT] DUMP', 'WARN_BAR');
        u.dump(message);
    }
});

casper.on('resource.error', function(message) {
    if (!showClientLog) {
        return;
    }
    if (typeof message === 'string') {
        casper.echo('>> [CLIENT] ' + message, 'RED_BAR');
    } else {
        casper.echo('>> [CLIENT] DUMP', 'RED_BAR');
        u.dump(message);
    }
});

casper.on('page.error', function(message, trace) {
    if (!showClientLog) {
        return;
    }
    if (typeof message === 'string') {
        casper.echo('>> [CLIENT] ' + message, 'RED_BAR');
    } else {
        casper.echo('>> [CLIENT] DUMP', 'RED_BAR');
        u.dump(message);
    }
    u.dump(trace);
});

/*
    ACTIONS
*/

function clickZone () {
    mouse.down('.zone.active');
}

function assertThumb (test) {
    return function () {
        test.assertExists('#thumb_' + collectionIndex +
            '_' + thumbIndex,
            'Thumb ' + thumbIndex + ' from collection ' +
            collectionIndex + ' is found');
        thumbIndex += 1;
    };
}

function assertNotThumb (test) {
    return function () {
        test.assertDoesntExist('#thumb_' + collectionIndex +
            '_' + thumbIndex,
            'Thumb ' + thumbIndex + ' from collection ' +
            collectionIndex + ' is NOT found');
        thumbIndex += 1;
    };
}

casper.test.begin('ThumbJS test page loads correctly', NB_TESTS,
    function suite(test) {
        var box;
        casper
            .start(curFilePath + '/index.html')
            .then(function () {
                // Assert that active zone is here.
                test.assertExists('#zone_joystick', 'Active zone is found');
                test.assertExists('.zone.dynamic', 'Dynamic zone is default');
            })
            .then(function () {
                // Get position of active zone.
                box = casper.evaluate(function () {
                    return document.getElementById('zone_joystick')
                        .getBoundingClientRect();
                });
            })
            /**********************************\
            *
            *				DYNAMIC
            *
            \**********************************/
            // Assert we can create more than one thumb on dynamic
            .then(clickZone)
            .then(assertThumb(test))
            .then(clickZone)
            .then(assertThumb(test))
            /**********************************\
            *
            *				SEMI
            *
            \**********************************/
            .then(function () {
                mouse.click('.button.semi');
                collectionIndex += 1;
            })
            .then(function () {
                test.assertVisible('.zone.semi', 'Semi zone should be visible');
            })
            // Assert we can't create more than one thumb on semi
            .then(clickZone)
            .then(assertThumb(test))
            .then(clickZone)
            .then(assertNotThumb(test))
            .then(function () {
                // Revert increment because last thumb doesn't exist
                thumbIndex -= 1;
            })
            /**********************************\
            *
            *				STATIC
            *
            \**********************************/
            .then(function () {
                mouse.click('.button.static');
                collectionIndex += 1;
            })
            .then(function () {
                test.assertVisible('.zone.static',
                    'Static zone should be visible');
            })
            // Assert we can't create more than one thumb on semi
            .then(clickZone)
            .then(assertThumb(test))
            .then(clickZone)
            .then(assertNotThumb(test))
            .then(function () {
                // Revert increment because last thumb doesn't exist
                thumbIndex -= 1;
            })
            .run(function () {
                // End tests
                test.done();
            });
    }
);
