'use strict';

const createReporter = require('../');
const createCompiler = require('./util/createCompiler');
const createStats = require('./util/createStats');
const createWritter = require('./util/createWritter');

beforeEach(jest.resetModules);

it('should add listeners to the begin, error and end events of the compiler', () => {
    const compiler = createCompiler();
    const expectedEvents = expect.arrayContaining(['begin', 'end', 'error']);

    createReporter(compiler);

    expect(compiler.eventNames()).toEqual(expectedEvents);
});

describe('successful build', () => {
    it('should render the correct output', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats();

        createReporter(compiler, { write: writter });

        compiler.emit('begin');
        compiler.emit('end', stats);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should hide the stats from the output if `options.stats` is false', () => {
        const compiler = createCompiler();
        const writter = createWritter();

        createReporter(compiler, { stats: false, write: writter });

        compiler.emit('begin');
        compiler.emit('end', createStats());

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should display stats only on the first compilation if `options.stats` is once', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats();

        createReporter(compiler, { stats: 'once', write: writter });

        compiler.emit('begin');
        compiler.emit('end', stats);
        compiler.emit('begin');
        compiler.emit('end', stats);
        compiler.emit('begin');
        compiler.emit('end', stats);
        compiler.emit('begin');
        compiler.emit('end', stats);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should reset the displayStats logic when a run finishes', (done) => {
        const stats = createStats();
        const writter = createWritter();
        const compiler = createCompiler({
            run() {
                compiler.emit('begin');
                compiler.emit('end', stats);
                compiler.emit('begin');
                compiler.emit('end', stats);

                return Promise.resolve();
            },
        });

        createReporter(compiler, { stats: 'once', write: writter });

        compiler
        .run()
        .then(compiler.run)
        .then(() => {
            expect(writter.getOutput()).toMatchSnapshot();

            done();
        });
    });

    it('should reset the displayStats logic when an unwatch is called', (done) => {
        const stats = createStats();
        const writter = createWritter();
        const compiler = createCompiler({
            watch() {
                compiler.emit('begin');
                compiler.emit('end', stats);
                compiler.emit('begin');
                compiler.emit('end', stats);
            },
        });

        createReporter(compiler, { stats: 'once', write: writter });

        compiler.watch();

        compiler
        .unwatch()
        .then(compiler.watch)
        .then(() => {
            expect(writter.getOutput()).toMatchSnapshot();

            done();
        });
    });
});

describe('failed build', () => {
    it('renders the correct output', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats(true);
        const error = Object.assign(new Error('Error message'), {
            stats,
            stack: [
                'at method1 (/path/to/file1.js:1:0)',
                'at method2 (/path/to/file2.js:1:0)',
            ].join('\n'),
        });

        createReporter(compiler, { stats: 'once', write: writter });

        compiler.emit('begin');
        compiler.emit('error', error);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('allows hiding the stats from the output', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats(true);

        createReporter(compiler, { stats: false, write: writter });

        compiler.emit('begin');
        compiler.emit('error', Object.assign(new Error('Error message'), { stats, hideStack: true }));

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('allows decorating an error with a code or name', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats(true);

        createReporter(compiler, { stats: true, write: writter });

        compiler.emit('begin');
        compiler.emit('error', Object.assign(new Error('Error message'), { stats, code: 500, hideStack: true }));
        expect(writter.getOutput()).toMatchSnapshot();

        writter.reset();
        compiler.emit('error', Object.assign(new Error('Error message'), { stats, name: 'Syntax error', hideStack: true }));
        expect(writter.getOutput()).toMatchSnapshot();
    });
});

describe('returned object', () => {
    it('should stop reporting if stop is called', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats();

        const { stop } = createReporter(compiler, { write: writter });

        compiler.emit('begin');
        compiler.emit('end', stats);

        stop();

        compiler.emit('begin');
        compiler.emit('end', stats);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should provide the internal options', () => {
        const compiler = createCompiler();

        const { options } = createReporter(compiler, { stats: false });

        expect(options).toMatchSnapshot();
    });
});

describe('printers', () => {
    it('should allow overriding the various print options', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats();

        createReporter(compiler, {
            printStart: () => 'start\n',
            printSuccess: () => 'success\n',
            printFailure: () => 'failure\n',
            printStats: () => 'stats\n',
            printError: () => 'err\n',

            write: writter,
        });

        compiler.emit('begin');
        compiler.emit('end', stats);
        compiler.emit('begin');
        compiler.emit('error', new Error('foo'));

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should call the printers with the correct arguments', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const stats = createStats();

        const printStart = () => '';
        const printSuccess = (stats) => {
            expect(stats).toHaveProperty('startTime');
            expect(stats).toHaveProperty('endTime');

            return '';
        };
        const printFailure = (err) => {
            expect(err).toHaveProperty('message', 'foo');

            return '';
        };
        const printStats = printSuccess;
        const printError = printFailure;

        createReporter(compiler, {
            printStart,
            printSuccess,
            printFailure,
            printStats,
            printError,

            write: writter,
        });

        expect.assertions(6);

        compiler.emit('begin');
        compiler.emit('end', stats);
        compiler.emit('begin');
        compiler.emit('error', new Error('foo'));
    });
});
