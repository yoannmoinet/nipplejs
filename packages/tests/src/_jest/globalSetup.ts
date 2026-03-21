import chalk from 'chalk';

const c = chalk.bold.dim;

const globalSetup = () => {
    const timeId = `[${c.cyan('Test environment setup duration')}]`;
    console.time(timeId);

    // Setup the environment.

    console.timeEnd(timeId);
};

export default globalSetup;
