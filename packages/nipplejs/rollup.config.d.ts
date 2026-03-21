declare module 'nipplejs/rollup.config.mjs' {
    import type { RollupOptions } from 'rollup';

    export function getDefaultBuildConfigs(): RollupOptions[];
    export default ReturnType<typeof getDefaultBuildConfigs>;
}
