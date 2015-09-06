var exec = require('child_process').exec;

queue([checkoutPage, getBack, commit, checkoutMaster]);

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

function getBack (next) {
    console.log(' - checkout built file from master and move it.');
    exec('git checkout master ./dist/nipplejs.js && ' +
        'git reset ./dist/nipplejs.js && ' +
        'mv ./dist/nipplejs.js ./javascripts/',
        next);
}

function commit (next) {
    console.log(' - commit latest build to gh-pages.');
    exec('git add ./javascripts/nipplejs.js && ' +
        'git commit -m "chore: new build" && ' +
        'git push origin gh-pages', next);
}

function checkoutMaster (next) {
    console.log(' - checkout master.');
    exec('git checkout master', next);
}
