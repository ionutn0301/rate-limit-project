/** @type {import('jest').Config} */
/** @type {import('node').Module} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  fakeTimers: {
    enableGlobally: true
  },
  testMatch: ['<rootDir>/src/**/*.test.ts']
}; 
