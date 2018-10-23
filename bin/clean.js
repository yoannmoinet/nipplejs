var fs = require('fs');

fs.unlink('./thumbjs.temp.js', function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('- removed ./thumbjs.temp.js');
});
