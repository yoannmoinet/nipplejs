import { Builtins, Cli } from 'clipanion';
import { readdirSync } from 'fs';

const cli = new Cli({
    binaryName: 'yarn cli',
    binaryLabel: `Internal CLI`,
    enableCapture: true,
});

cli.register(Builtins.HelpCommand);

const commandPath = `${__dirname}/commands`;
for (const file of readdirSync(commandPath, { withFileTypes: true })) {
    if (!file.isDirectory()) {
        continue;
    }
    // no-dd-sa:javascript-node-security/detect-non-literal-require
    const exports = require(`${commandPath}/${file.name}`);
    for (const command of exports.default) {
        cli.register(command);
    }
}

cli.runExit(process.argv.slice(2), {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
});
