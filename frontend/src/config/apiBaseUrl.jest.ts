// Jest replacement for apiBaseUrl.ts (see jest.config.cjs moduleNameMapper) -
// avoids ts-jest ever parsing the `import.meta.env` syntax in the real file.
export const API_BASE_URL = 'http://localhost:5000/api/v1';
