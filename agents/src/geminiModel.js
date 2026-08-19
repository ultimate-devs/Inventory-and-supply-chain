import { Gemini } from '@google/adk';

const MODEL_NAME = 'gemini-flash-latest';

// Binds a Gemini model to a specific API key/account, rather than the plain
// model-name string every agent used before - which makes ADK fall back to
// whatever GEMINI_API_KEY happens to be in the environment. Letting each
// agent request its own key means they draw from separate free-tier quotas
// instead of all four contending for one.
export const geminiModel = (apiKey) => new Gemini({ model: MODEL_NAME, apiKey });
