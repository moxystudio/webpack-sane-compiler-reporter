'use strict';

const stripAnsi = require('strip-ansi');

module.exports = function () {
    let output = '';

    function write(str) {
        output += str;
    }

    return Object.assign(write, {
        getOutput() {
            return stripAnsi(output);
        },

        reset() {
            output = '';
        },
    });
};
