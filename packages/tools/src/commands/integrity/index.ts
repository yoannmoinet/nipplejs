import { Command, Option } from 'clipanion';

class Integrity extends Command {
    static paths = [['integrity']];

    static usage = Command.Usage({
        category: `Verification`,
        description: `Verify our documentations and files integrity.`,
        details: `
            This command will update our documentation to include all of our plugins.
            And also some files to be sure we list all of our plugins everywhere that's needed.
        `,
        examples: [[`Run integrity check and update`, `$0 integrity`]],
    });

    noFailure = Option.Boolean('--no-failure', {
        description: 'Will run everything without throwing.',
    });

    async execute() {
        const { runAutoFixes } = await import('@nipple/tools/helpers');
        const { injectTocsInAllReadmes } = await import('./readme');

        const errors: string[] = [];

        // Inject TOC into all of the readmes.
        injectTocsInAllReadmes();
        // Run auto-fixes to ensure the code is correct.
        errors.push(...(await runAutoFixes()));

        if (errors.length) {
            console.log(`\n${errors.join('\n')}`);

            if (!this.noFailure) {
                const error = new Error('Please fix the above errors.');
                // No need to display a stack trace here.
                error.stack = '';
                throw error;
            }
        }
    }
}

export default [Integrity];
