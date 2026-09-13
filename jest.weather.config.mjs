import nextJest from 'next/jest.js'

export default nextJest({ dir: './' })({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/weather/*.test.ts'],
})
