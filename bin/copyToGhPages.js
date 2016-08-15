var exec = require('child_process').exec;
var fs = require('fs');

var isWin = /^win/.test(process.platform);
var mv = isWin ? 'move' : 'mv';
var slash = isWin ? '\\' : '/';

queue([
    checkoutPage,
    importReadme,
    importBuild,
    modifyFile,
    commit,
    checkoutMaster
]);

function queue (fns) {
    // Execute and remove the first function.
    var fn = fns.shift();
    fn(function (err) {
        if (!err) {
            if (fns.length) {
                // If we still have functions
                // we continue
                queue(fns);
            } else {
                // We exist if we've finished
                process.exit(0);
            }
        } else {
            // We log if we have an error.
            console.error(fn.name + ': ', err);
            process.exit(1);
        }
    });
}

function checkoutPage (next) {
    console.log(' - checkout gh-pages.');
    exec('git checkout gh-pages', next);
}

function importReadme (next) {
    console.log(' - checkout README from master and rename it to index.md');
    exec('git checkout master -- README.md && ' +
        'git reset README.md && ' +
        mv + ' README.md index.md',
        next);
}

function importBuild (next) {
    console.log(' - checkout build from master and move it to ./javascripts/');
    exec('git checkout master -- ./dist/nipplejs.js && ' +
        'git reset ./dist/nipplejs.js && ' +
        mv + ' .' + slash + 'dist' + slash + 'nipplejs.js ' +
        '.' + slash + 'javascripts' + slash,
        next);
}

function modifyFile (next) {
    console.log(' - reading the new index.md');
    fs.readFile('index.md', function (err, data) {
        if (err) {
            next(err);
            return;
        }
        console.log(' - writing the new content for Jekyll');
        var body = data.toString().split('\n');
        body.splice(0, 3, '---', 'layout: index', '---');
        fs.writeFile('index.md', body.join('\n'), next);
    });
}

function commit (next) {
    console.log(' - commit latest doc to gh-pages');
    exec('git add index.md && ' +
        'git add ./javascripts/nipplejs.js && ' +
        'git commit -m "chore: sync from master" && ' +
        'git push origin gh-pages', next);
}

function checkoutMaster (next) {
    console.log(' - checkout master.');
    exec('git checkout master', next);
}
