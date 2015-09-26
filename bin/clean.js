var fs = require('fs');

fs.unlink('./nipplejs.temp.js', function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('- removed ./nipplejs.temp.js');
});
