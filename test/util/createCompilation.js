'use strict';

module.exports = (overrides) => ({
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
    ...overrides,
});
