import { ROOT } from '@nipple/tools/constants';
import chalk from 'chalk';
import { Command, Option } from 'clipanion';
import fs from 'fs';
import http from 'http';
import template from 'lodash.template';
import path from 'path';

const MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    js: 'application/javascript',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
} as const;

// Some context to use for templating content with {{something}}.
const CONTEXT: Record<string, readonly string[]> = {};

// Templating regex.
const INTERPOLATE_RX = /{{([\s\S]+?)}}/g;

// Promise to boolean.
const toBool = [() => true, () => false];

type File = {
    found: boolean;
    ext: keyof typeof MIME_TYPES;
    content: string;
};

class DevServer extends Command {
    static paths = [['dev-server']];

    static usage = Command.Usage({
        category: `Contribution`,
        description: `Run a basic dev server over a specific directory.`,
        details: `
            This command will change the package.json values of "exports" so they can be used from another project.

            This is necessary to be sure that the outside project loads the built files and not the dev files.
        `,
        examples: [
            [`Prepare for link`, `$0 prepare-link`],
            [`Revert change`, `$0 prepare-link --revert`],
        ],
    });

    port = Option.String('--port', '8000', {
        description: 'On which port will the server run.',
    });

    root = Option.String('--root', ROOT, {
        description: 'The root directory the server will serve.',
    });

    parseCookie(cookieHeader?: string): Record<string, string> {
        if (!cookieHeader) {
            return {};
        }

        const cookieString = cookieHeader
            .split(';')
            .find((c) => c.trim().startsWith('context_cookie='));

        if (!cookieString) {
            return {};
        }

        const [name, ...rest] = cookieString.split('=');
        if (!name || !name.trim()) {
            return {};
        }

        const value = rest.join('=').trim();
        if (!value) {
            return {};
        }

        try {
            return JSON.parse(decodeURIComponent(value));
        } catch (e: any) {
            throw new Error(`Error parsing cookie: ${e.message}`);
        }
    }

    getContext(req: http.IncomingMessage): Record<string, string> {
        const url = new URL(req.url || '/', 'http://127.0.0.1');
        // Get the initial context from the cookie.
        const fileContext: Record<string, string> = this.parseCookie(req.headers.cookie);

        // Verify if we have context passed as parameters (?context_bundler=vite).
        for (const [key, value] of url.searchParams) {
            if (key.startsWith('context_')) {
                const contextKey = key.replace(/^context_/, '') as keyof typeof CONTEXT;
                if (Object.keys(CONTEXT).includes(contextKey)) {
                    if (CONTEXT[contextKey].includes(value)) {
                        fileContext[contextKey] = value;
                    }
                }
            }
        }

        return fileContext;
    }

    async prepareFile(requestUrl: string, context: Record<string, string>): Promise<File> {
        const staticPath = this.root
            ? path.isAbsolute(this.root)
                ? this.root
                : path.resolve(ROOT, this.root)
            : ROOT;
        const url = new URL(requestUrl, 'http://127.0.0.1');
        const paths = [staticPath, url.pathname];

        if (url.pathname.endsWith('/')) {
            paths.push('index.html');
        }

        const filePath = path.join(...paths);
        const pathTraversal = !filePath.startsWith(staticPath);
        const exists = await fs.promises.access(filePath).then(...toBool);
        const found = !pathTraversal && exists;
        const finalPath = found ? filePath : `${staticPath}/404.html`;
        const ext = path.extname(finalPath).substring(1).toLowerCase() as File['ext'];
        const fileContent = found
            ? template(await fs.promises.readFile(finalPath, { encoding: 'utf-8' }), {
                  interpolate: INTERPOLATE_RX,
              })(context)
            : '404';

        return { found, ext, content: fileContent };
    }

    async execute() {
        http.createServer(async (req, res) => {
            try {
                const context = this.getContext(req);
                const file = await this.prepareFile(req.url || '/', context);
                const statusCode = file.found ? 200 : 404;
                const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
                const c = statusCode === 200 ? chalk.green : chalk.yellow.bold;

                res.writeHead(statusCode, {
                    'Set-Cookie': `context_cookie=${encodeURIComponent(JSON.stringify(context))};SameSite=Strict;`,
                    'Content-Type': mimeType,
                });

                res.end(file.content);

                console.log(`  -> [${c(statusCode.toString())}] ${req.method} ${req.url}`);
            } catch (e: any) {
                res.writeHead(500, { 'Content-Type': MIME_TYPES.html });
                res.end('Internal Server Error');
                const c = chalk.red.bold;
                console.log(`  -> [${c('500')}] ${req.method} ${req.url}: ${e.message}`);
                console.log(e);
            }
        }).listen(this.port);
        console.log(`Server running at http://127.0.0.1:${this.port}/`);
    }
}

export default [DevServer];
