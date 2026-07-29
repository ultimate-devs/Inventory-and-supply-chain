// Isolated in its own module because `import.meta.env` (Vite's env syntax)
// cannot be parsed by ts-jest under its CommonJS module target - Jest maps
// this module to apiBaseUrl.jest.ts instead (see jest.config.cjs), so no
// test file ever needs to parse this line.
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
