import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    globalSetup: '<rootDir>/src/_jest/globalSetup.ts',
    preset: 'ts-jest/presets/js-with-ts',
    // Without it, vite import is silently crashing the process with code SIGHUP 129
    resetModules: true,
    roots: ['./src/unit/'],
    setupFilesAfterEnv: ['<rootDir>/src/_jest/setupAfterEnv.ts'],
    testEnvironment: 'jsdom',
    testMatch: ['**/*.test.*'],
};

export default config;
