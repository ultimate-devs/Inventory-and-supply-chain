import { jest } from '@jest/globals';
import { runAgent, AGENT_RUN_TYPES } from '../../src/services/agentRunService.js';

describe('agentRunService.runAgent', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('exposes exactly the four agent types the agents service supports', () => {
    expect(AGENT_RUN_TYPES.sort()).toEqual(['advisory', 'analytics', 'monitoring', 'procurement']);
  });

  it('rejects an unknown agent type before making any network call', async () => {
    global.fetch = jest.fn();
    await expect(runAgent({ agentType: 'not_a_real_agent', message: 'hi' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts to the matching /run/<type> path and returns the parsed body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ summary: 'All good', log: { _id: 'log1' } }),
    });

    const result = await runAgent({ agentType: 'advisory', message: 'Suggest a reorder policy' });

    expect(result).toEqual({ summary: 'All good', log: { _id: 'log1' } });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/run\/advisory$/);
    expect(options.headers['x-internal-api-key']).toEqual(expect.any(String));
    expect(JSON.parse(options.body)).toMatchObject({ message: 'Suggest a reorder policy' });
  });

  it('wraps a network failure as a 502 ApiError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(runAgent({ agentType: 'monitoring', message: 'go' })).rejects.toMatchObject({ statusCode: 502 });
  });

  it('propagates the agents service error status and message on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid or missing internal API key' }),
    });
    await expect(runAgent({ agentType: 'analytics', message: 'go' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or missing internal API key',
    });
  });
});
