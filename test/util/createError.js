'use strict';

module.exports = (message = 'Error message', props) => Object.assign(
    new Error(message),
    {
        stack: [
            'at method1 (/path/to/file1.js:1:0)',
            'at method2 (/path/to/file2.js:1:0)',
        ].join('\n'),
        ...props,
    }
);
