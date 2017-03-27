const fs = require('fs');
const path = require('path');
const parser = require('./src');

const root = process.argv[2].substr(0, process.argv[2].length - 1);
fs.readdir(root, (err, files) => {
    if (err) {
        console.warn('readDir', err);
    } else {
        files.filter(f => f.endsWith('.fgd')).forEach(file => {
            fs.readFile(path.join(root, file), (err, data) => {
                if (err) {
                    console.warn('readFile', err);
                } else {
                    try {
                        parser(data.toString());
                        console.log(file, 'passed');
                    } catch (err) {
                        console.error(file, err);
                    }
                }
            });
        });
    }
});
