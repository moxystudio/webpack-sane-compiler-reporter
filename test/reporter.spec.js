'use strict';

const createReporter = require('../');
const createCompiler = require('./util/createCompiler');
const createCompilation = require('./util/createCompilation');
const createWritter = require('./util/createWritter');
const createError = require('./util/createError');

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
        const compilation = createCompilation();

        createReporter(compiler, { write: writter });

        compiler.emit('begin');
        compiler.emit('end', compilation);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should hide the stats from the output if `options.stats` is false', () => {
        const compiler = createCompiler();
        const writter = createWritter();

        createReporter(compiler, { stats: false, write: writter });

        compiler.emit('begin');
        compiler.emit('end', createCompilation());

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should display stats only on the first compilation if `options.stats` is once', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const compilation = createCompilation();

        createReporter(compiler, { stats: 'once', write: writter });

        compiler.emit('begin');
        compiler.emit('end', compilation);
        compiler.emit('begin');
        compiler.emit('end', compilation);
        compiler.emit('begin');
        compiler.emit('end', compilation);
        compiler.emit('begin');
        compiler.emit('end', compilation);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should reset the displayStats logic when a run finishes', (done) => {
        const compilation = createCompilation();
        const writter = createWritter();
        const compiler = createCompiler({
            run() {
                compiler.emit('begin');
                compiler.emit('end', compilation);
                compiler.emit('begin');
                compiler.emit('end', compilation);

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
        const compilation = createCompilation();
        const writter = createWritter();
        const compiler = createCompiler({
            watch() {
                compiler.emit('begin');
                compiler.emit('end', compilation);
                compiler.emit('begin');
                compiler.emit('end', compilation);
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
    it('should render the correct output', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const error = createError();

        createReporter(compiler, { stats: 'once', write: writter });

        compiler.emit('begin');
        compiler.emit('error', error);

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should allow decorating an error with a code or name', () => {
        const compiler = createCompiler();
        const writter = createWritter();

        createReporter(compiler, { stats: true, write: writter });

        compiler.emit('begin');
        compiler.emit('error', createError('Error message', { code: 'foo' }));
        expect(writter.getOutput()).toMatchSnapshot();

        writter.reset();
        compiler.emit('error', createError('Error message', { name: 'Syntax error' }));
        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should render the error from the stats if present', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const compilation = createCompilation({
            stats: {
                hasErrors: () => true,
                toString: () => [
                    'ERROR in ./src/App.js',
                    'Module parse failed: Unexpected token (4:0)',
                    'You may need an appropriate loader to handle this file type.',
                    '',
                    'console.log(\'Hello!\'',
                ].join('\n'),
            },
        });

        createReporter(compiler, { stats: true, write: writter });

        compiler.emit('begin');
        compiler.emit('error', createError('Error message', { stats: compilation.stats }));

        expect(writter.getOutput()).toMatchSnapshot();
    });
});

describe('returned object', () => {
    it('should stop reporting if stop is called', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const compilation = createCompilation();

        const { stop } = createReporter(compiler, { write: writter });

        compiler.emit('begin');
        compiler.emit('end', compilation);

        stop();

        compiler.emit('begin');
        compiler.emit('end', compilation);

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
        const compilation = createCompilation();

        createReporter(compiler, {
            printStart: () => 'start\n',
            printSuccess: () => 'success\n',
            printFailure: () => 'failure\n',
            printStats: () => 'stats\n',
            printError: () => 'err\n',

            write: writter,
        });

        compiler.emit('begin');
        compiler.emit('end', compilation);
        compiler.emit('begin');
        compiler.emit('error', createError('foo'));

        expect(writter.getOutput()).toMatchSnapshot();
    });

    it('should call the printers with the correct arguments', () => {
        const compiler = createCompiler();
        const writter = createWritter();
        const compilation = createCompilation();

        const printStart = () => '';
        const printSuccess = ({ stats, duration }) => {
            expect(stats).toHaveProperty('startTime');
            expect(stats).toHaveProperty('endTime');
            expect(typeof duration).toBe('number');

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

        expect.assertions(8);

        compiler.emit('begin');
        compiler.emit('end', compilation);
        compiler.emit('begin');
        compiler.emit('error', new Error('foo'));
    });
});
