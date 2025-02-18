import { getDefaultBuildConfigs } from '@dd/tools/rollupConfig.mjs';

import packageJson from './package.json' assert { type: 'json' };

export default getDefaultBuildConfigs(packageJson);
