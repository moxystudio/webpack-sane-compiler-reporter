'use strict';

const pFinally = require('p-finally');
const wrap = require('lodash.wrap');

const renderers = require('./lib/renderers');

function startReporting(compiler, options) {
    let displayStats;

    options = Object.assign({
        stats: true,

        write: (str) => str && process.stderr.write(str),

        /* eslint-disable handle-callback-err, no-unused-vars */
        printStart: () => `${renderers.start()}\n`,
        printSuccess: (stats) => `${renderers.success(stats.endTime - stats.startTime)}\n\n`,
        printFailure: (err) => `${renderers.failure()}\n\n`,
        printError: (err) => `${renderers.error(err)}\n\n`,
        printStats: (stats) => `${renderers.stats(stats)}\n\n`,
        /* eslint-enable handle-callback-err, no-unused-vars */

    }, options);

    const resetDisplayStats = () => (displayStats = options.stats === true || options.stats === 'once');
    const didPrintStats = () => (displayStats = options.stats === 'once' ? false : displayStats);
    const write = (str) => options.write && options.write(str);

    const onBegin = () => write(options.printStart());

    const onEnd = (stats) => {
        write(options.printSuccess(stats));

        if (displayStats) {
            write(options.printStats(stats));

            didPrintStats();
        }
    };

    const onError = (err) => {
        write(options.printFailure(err));
        write(options.printError(err));
    };

    const stopReporting = () => {
        compiler
        .removeListener('begin', onBegin)
        .removeListener('end', onEnd)
        .removeListener('error', onError);
    };

    resetDisplayStats();

    ['run', 'unwatch'].forEach((method) => {
        compiler[method] = wrap(compiler[method], (fn, ...args) => pFinally(fn(...args), resetDisplayStats));
    });

    compiler.on('begin', onBegin);
    compiler.on('end', onEnd);
    compiler.on('error', onError);

    return {
        stop: stopReporting,
        options,
    };
}

module.exports = startReporting;
module.exports.renderers = renderers;
