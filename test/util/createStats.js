'use strict';

module.exports = function (hasError) {
    return {
        toString() {
            return [
                'Asset    Size',
                'foo.js   10Kb',
            ].join('\n');
        },

        hasErrors() {
            return hasError;
        },

        startTime: 0,
        endTime: 100,
    };
};
