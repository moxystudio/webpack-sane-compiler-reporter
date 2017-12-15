'use strict';

const pFinally = require('p-finally');
const wrap = require('lodash.wrap');

const renderers = require('./lib/renderers');

function startReporting(compiler, options) {
    let displayStats;

    options = Object.assign({
        stats: true,

        write: (str) => str && process.stderr.write(str),

        printStart: (renderStart, ...rest) => `${renderStart(...rest)}\n`,
        printSuccess: (renderSuccess, ...rest) => `${renderSuccess(...rest)}\n\n`,
        printFailure: (renderFailure, ...rest) => `${renderFailure(...rest)}\n\n`,
        printError: (renderError, ...rest) => `${renderError(...rest)}\n\n`,
        printStats: (renderStats, ...rest) => `${renderStats(...rest)}\n\n`,
    }, options);

    const resetDisplayStats = () => (displayStats = options.stats === true || options.stats === 'once');
    const didPrintStats = () => (displayStats = options.stats === 'once' ? false : displayStats);
    const write = (str) => options.write && options.write(str);

    const onBegin = () => write(options.printStart(renderers.start, { renderers }));

    const onEnd = (stats) => {
        write(options.printSuccess(renderers.success, stats.endTime - stats.startTime, { renderers }));

        if (displayStats) {
            write(options.printStats(renderers.stats, stats, { renderers }));

            didPrintStats();
        }
    };

    const onError = (err) => {
        write(options.printFailure(renderers.failure, { renderers }));
        write(options.printError(renderers.error, err, { renderers }));
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

    options.printStart && compiler.on('begin', onBegin);
    options.printSuccess && compiler.on('end', onEnd);
    options.printError && compiler.on('error', onError);

    return stopReporting;
}

module.exports = startReporting;
module.exports.renderers = renderers;
