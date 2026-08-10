import { InMemorySessionService, Runner } from '@google/adk';

const APP_NAME = 'inventory-supply-chain-agents';
const sessionService = new InMemorySessionService();

/**
 * Runs an LlmAgent once with a fresh session and returns its final text
 * response. Wraps the Runner/Session boilerplate every @google/adk agent
 * invocation needs behind a single call, since each of our four agents is
 * invoked independently (no shared conversation state between runs).
 */
export const runAgentOnce = async (agent, message) => {
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
    const text = event.content?.parts?.[0]?.text;
    if (text) finalText = text;
  }
  return finalText;
};
