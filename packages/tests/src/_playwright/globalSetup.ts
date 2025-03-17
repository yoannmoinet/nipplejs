import { PUBLIC_DIR } from '@nipple/tests/_playwright/constants';
import type { TestOptions } from '@nipple/tests/_playwright/testParams';
import { ROOT } from '@nipple/tools/constants';
import { blue, dim, execute } from '@nipple/tools/helpers';
import type { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// TODO Also build and test for ESM.
const globalSetup = async (config: FullConfig<TestOptions>) => {
    const getPfx = (name: string) => `[${blue(name)}] `;
    const getSubPfx = (name: string) => `  ${dim(getPfx(name))}`;
    const globalPfx = getPfx('Global Setup');
    console.time(globalPfx);

    // Build nipplejs and copy to public dir
    const buildPfx = getSubPfx('Build Project');
    console.time(buildPfx);
    // Execute a promisified version of the yarn build command.
    await execute('yarn', ['build']);

    // Move the built nipplejs to the public dir.
    const nippleJsPath = path.resolve(ROOT, 'packages/nipplejs/dist/');
    const publicPath = path.resolve(PUBLIC_DIR);
    await fs.promises.cp(nippleJsPath, publicPath, { recursive: true });
    console.timeEnd(buildPfx);
    console.timeEnd(globalPfx);
};

export default globalSetup;
