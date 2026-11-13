// Used by `npm run test:api`. (react-scripts test ignores this file.)
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test-setup.js'],
  testMatch: ['**/__tests__/**/*.test.js', '**/db/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/src/']
};