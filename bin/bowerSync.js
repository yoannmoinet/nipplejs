var fs = require('fs');
var bower = require('../bower.json');
var pkg = require('../package.json');
var exec = require('child_process').exec;

// Update Bower's version to follow NPM's
bower.version = pkg.version;

fs.writeFile('bower.json', JSON.stringify(bower, null, 2), function (err) {
    if (err) {
        return console.error(err);
    }
    console.log('bower.json updated to ' + bower.version);
    console.log('commiting changes to bower.json');
    exec('git add bower.json && git commit -m "chore: bower bump"', function (err) {
        if (!err) {
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    });
});
