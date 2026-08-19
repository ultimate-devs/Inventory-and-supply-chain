import { InMemorySessionService, Runner } from '@google/adk';

const APP_NAME = 'inventory-supply-chain-agents';
const sessionService = new InMemorySessionService();

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
// Gemini's free tier surfaces these routinely under normal use (503 "high
// demand", 429 rate limit) - they're not indicative of a broken run, just an
// overloaded/throttled model, so they're worth a retry unlike a genuine
// model/agent error.
const TRANSIENT_ERROR_CODES = new Set(['503', '429', 'UNAVAILABLE', 'RESOURCE_EXHAUSTED']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AgentModelError extends Error {
  constructor(code, message) {
    super(`Agent model call failed: ${code ?? ''} ${message ?? ''}`.trim());
    this.code = code;
  }
}

const runOnce = async (agent, message) => {
  const userId = 'system';
  const session = await sessionService.createSession({ appName: APP_NAME, userId, state: {} });
  const runner = new Runner({ appName: APP_NAME, agent, sessionService });

  const events = runner.runAsync({
    userId,
    sessionId: session.id,
    newMessage: { role: 'user', parts: [{ text: message }] },
  });

  let finalText = '';
  for await (const event of events) {
    if (event.errorCode || event.errorMessage) {
      throw new AgentModelError(event.errorCode, event.errorMessage);
    }
    const text = event.content?.parts?.[0]?.text;
    if (text) finalText = text;
  }

  if (!finalText) {
    throw new Error('Agent produced no text response');
  }
  return finalText;
};

/**
 * Runs an LlmAgent once with a fresh session and returns its final text
 * response. Wraps the Runner/Session boilerplate every @google/adk agent
 * invocation needs behind a single call, since each of our four agents is
 * invoked independently (no shared conversation state between runs).
 *
 * Retries up to MAX_ATTEMPTS times, with exponential backoff, when the model
 * call itself fails with a transient error - a fresh session (and re-running
 * any tool calls) on retry is cheap next to failing an entire agent run over
 * a passing overload/rate-limit blip. Non-transient failures (and the last
 * attempt of a transient one) are thrown as-is.
 */
export const runAgentOnce = async (agent, message) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await runOnce(agent, message);
    } catch (err) {
      lastError = err;
      const isTransient = err instanceof AgentModelError && TRANSIENT_ERROR_CODES.has(err.code);
      if (!isTransient || attempt === MAX_ATTEMPTS) throw err;
      // eslint-disable-next-line no-await-in-loop
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
};
