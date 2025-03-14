import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    globalSetup: '<rootDir>/src/_jest/globalSetup.ts',
    preset: 'ts-jest/presets/js-with-ts',
    roots: ['./src/unit/'],
    setupFilesAfterEnv: ['<rootDir>/src/_jest/setupAfterEnv.ts'],
    testEnvironment: 'jsdom',
    testMatch: ['**/*.test.*'],
};

export default config;
