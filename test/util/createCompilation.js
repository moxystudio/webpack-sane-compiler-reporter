'use strict';

const merge = require('lodash/merge');

module.exports = (overrides) => merge({
    stats: {
        toString() {
            return [
                'Asset    Size',
                'foo.js   10Kb',
            ].join('\n');
        },

        startTime: 0,
        endTime: 100,
    },
    duration: 100,
}, overrides);
