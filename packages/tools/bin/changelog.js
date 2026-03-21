/* eslint no-console: 0 */
const fs = require('fs');
const conventionalChangelog = require('conventional-changelog');

const changelogFile = fs.createWriteStream('CHANGELOG.md');
const exec = require('child_process').exec;

conventionalChangelog(
    {
        preset: 'angular',
    },
    {},
    {
        // You'll want to add your first commit's hash in here,
        // otherwise it will take from the latest tag only.
        from: '',
        to: 'HEAD',
    },
).pipe(changelogFile);

// Commit what's changed in the changelog.
changelogFile.on('unpipe', function (src) {
    console.log('commiting changes to CHANGELOG.md');
    exec('git add CHANGELOG.md && git commit -m "docs: changelog"', function (err) {
        if (!err) {
            process.exit(0);
        }
        console.error(err);
        process.exit(1);
    });
});
