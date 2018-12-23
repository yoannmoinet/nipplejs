/* eslint no-console: 0 */
const exec = require('child_process').exec;
const fs = require('fs');

const isWin = /^win/.test(process.platform);
const mv = isWin ? 'move' : 'mv';

queue([
    stash,
    checkoutPage,
    importReadme,
    modifyFile,
    commit,
    push,
    checkoutMaster
]);

function queue (fns) {
    // Execute and remove the first function.
    const fn = fns.shift();
    fn((err) => {
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

function stash (next) {
    console.log('- stash changes');
    exec('git stash', next);
}

function checkoutPage (next) {
    console.log(' - checkout gh-pages.');
    exec('git checkout gh-pages', next);
}

function importReadme (next) {
    console.log(' - checkout README from master and rename it to index.md');
    exec(`
git checkout master -- README.md &&
git reset README.md &&
${mv} README.md index.md
    `, next);
}

function modifyFile (next) {
    console.log(' - reading the new index.md');
    fs.readFile('index.md', (err, data) => {
        if (err) {
            next(err);
            return;
        }
        console.log(' - writing the new content for Jekyll');
        const body = data.toString().split('\n');
        body.splice(0, 3, '---', 'layout: index', '---');
        fs.writeFile('index.md', body.join('\n'), next);
    });
}

function commit (next) {
    console.log(' - commit latest doc to gh-pages');
    exec(`
git add index.md &&
git commit -m "chore: sync from master"
    `, next);
}

function push (next) {
    console.log(' - push latest doc to gh-pages');
    exec('git push origin gh-pages', next);
}

function checkoutMaster (next) {
    console.log(' - checkout master.');
    exec('git checkout master', next);
}
