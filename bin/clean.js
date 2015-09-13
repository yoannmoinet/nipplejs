var fs = require('fs');
var rimraf = require('rimraf');

fs.unlink('./nipplejs.temp.js', function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('- removed ./nipplejs.temp.js');
});
