import chalk from 'chalk';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';

import { ROOT } from './constants';

export const green = chalk.bold.green;
export const yellow = chalk.bold.yellow;
export const grey = chalk.bold.grey;
export const red = chalk.bold.red;
export const bgYellow = chalk.bold.bgYellow.black;
export const bgGreen = chalk.bold.bgGreen.black;
export const blue = chalk.bold.cyan;
export const bold = chalk.bold;
export const dim = chalk.dim;
export const dimRed = chalk.red;

const execFileP = promisify(execFile);
const maxBuffer = 1024 * 1024;

export const execute = (cmd: string, args: string[], cwd: string = ROOT) =>
    execFileP(cmd, args, { maxBuffer, cwd, encoding: 'utf-8' });

export const executeSync = (cmd: string, args: string[], cwd: string = ROOT) =>
    execFileSync(cmd, args, { maxBuffer, cwd, encoding: 'utf-8' });

export const slugify = (string: string) => {
    return string
        .toString()
        .normalize('NFD') // Split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '') // Remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '') // Remove all chars not letters, numbers and spaces
        .replace(/\s+/g, '-'); // Collapse whitespace and replace by -
};

// Inject some text in between two markers.
export const replaceInBetween = (content: string, mark: string, injection: string) => {
    const escapedMark = mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedInjection = injection.replace(/\$/g, '$$$$');
    const rx = new RegExp(
        `${escapedMark}([\\S\\s](?!${escapedMark}))*(\\s|\\S)?${escapedMark}`,
        'gm',
    );
    return content.replace(rx, `${mark}\n${escapedInjection}\n${mark}`);
};

export const runAutoFixes = async () => {
    const errors: string[] = [];

    const addError = (cmd: string, message: string) => {
        const messageToDisplay = dimRed(
            message
                .trim()
                .split('\n')
                .map((st) => `    ${st}`)
                .join(`\n`),
        );
        errors.push(`[${red('Error')}] Failed to run "${red(cmd)}":\n${messageToDisplay}\n`);
    };

    const commands = [
        // Run yarn to update lockfiles.
        {
            cmd: 'yarn',
            args: [],
        },
        // Run yarn format to ensure all files are well formated.
        {
            cmd: 'yarn',
            args: ['format'],
        },
    ];

    for (const { cmd, args } of commands) {
        const cmdSt = `${cmd} ${args.join(' ')}`;
        console.log(`  Running ${green(`${cmdSt}`)}.`);
        try {
            await execute(cmd, args);
        } catch (e: any) {
            addError(cmdSt, e.stdout);
        }
    }

    return errors;
};
