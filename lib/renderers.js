'use strict';

const chalk = require('chalk');
const figures = require('figures');
const PrettyError = require('pretty-error');

const prettyError = new PrettyError();

prettyError.appendStyle({
    'pretty-error > header': { display: 'none' },
    'pretty-error > trace': { marginTop: 0 },
    'pretty-error > trace > item': { marginBottom: 0 },
});

const defaultStatsOptions = {
    assets: true,
    children: false,
    chunks: false,
    colors: chalk.enabled,
    hash: false,
    modules: false,
    timings: false,
    version: false,
};

const renderStart = () => `${chalk.dim(figures.bullet)} Compiling...`;

const renderSuccess = (duration) => {
    let str = '';

    str += `${chalk.green(figures.tick)} Compilation succeeded`;
    str += duration != null ? ` ${chalk.dim(`(${duration}ms)`)}` : '';

    return str;
};

const renderFailure = () => `${chalk.red(figures.cross)} Compilation failed`;

const renderError = (err) => {
    let str = '';

    if (err.code || (err.name && err.name !== 'Error')) {
        str += chalk.dim(`${err.code || err.name}: `);
    }

    str += `${err.message}\n`;

    if (!err.hideStack) {
        const prettyErrStr = prettyError
        .render(err)
        .trim()
        .split('\n')
        .slice(0, -1)
        .join('\n');

        str += `${prettyErrStr}`;
    }

    return str;
};

const renderStats = (stats, statsOptions = defaultStatsOptions) => `${stats.toString(statsOptions).trim()}`;

module.exports = {
    start: renderStart,
    success: renderSuccess,
    failure: renderFailure,
    error: renderError,
    stats: renderStats,
};
