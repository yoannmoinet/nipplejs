var fs = require('fs');

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch (e) {
        if (e.code != 'EEXIST') {
            throw e;
        }
    }
};

mkdirSync('./test/dist/');

fs
    .createReadStream('./dist/nipplejs.js')
    .pipe(fs.createWriteStream('./test/dist/nipplejs.js'));
