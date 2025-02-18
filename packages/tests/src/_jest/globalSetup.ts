import chalk from 'chalk';
import { execFileSync } from 'child_process';
import type { ExecFileSyncOptionsWithStringEncoding } from 'child_process';
import path from 'path';

const c = chalk.bold.dim;

const globalSetup = () => {
    const timeId = `[${c.cyan('Test environment setup duration')}]`;
    console.time(timeId);

    // Setup the environment.

    console.timeEnd(timeId);
};

export default globalSetup;
