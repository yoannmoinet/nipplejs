var nodemon = require('nodemon');

nodemon({
    exec: 'npm start'
}).on('start', function () {
    nodemon({
        exec: '\.\\node_modules\\.bin\\casperjs test test/nipplejs.casper.js'
    });
});
