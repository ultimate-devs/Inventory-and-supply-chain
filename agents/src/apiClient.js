import { env } from './env.js';

// The agents service authenticates exactly like any other client would -
// POST /auth/login, cache the short-lived access token, log in again a
// minute before it expires or immediately on a 401. There is no dedicated
// service-token issuance flow in the backend today, so this is deliberately
// the same login path a human user goes through, just headless and
// self-renewing. See backend/README.md for the full auth-flow writeup.

const REFRESH_MARGIN_MS = 60 * 1000;
const ACCESS_TOKEN_LIFETIME_MS = 14 * 60 * 1000; // access tokens default to 15m server-side

class ApiClient {
  constructor({ email, password }) {
    this.email = email;
    this.password = password;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async login() {
    const res = await fetch(`${env.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(`Service-account login failed for ${this.email}: ${res.status} ${body.message ?? ''}`);
    }
    this.accessToken = body.data.accessToken;
    this.tokenExpiresAt = Date.now() + ACCESS_TOKEN_LIFETIME_MS;
  }

  async ensureLoggedIn() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - REFRESH_MARGIN_MS) {
      await this.login();
    }
  }

  async request(path, { method = 'GET', body } = {}, allowRetry = true) {
    await this.ensureLoggedIn();

    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && allowRetry) {
      this.accessToken = null;
      return this.request(path, { method, body }, false);
    }

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(`${method} ${path} failed: ${res.status} ${payload.message ?? ''}`);
    }
    return payload.data;
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body });
  }
}

// Two clients, matching the two least-privilege service accounts: one
// read-only (Monitoring, Advisory, Analytics agents), one with procurement
// write access (Procurement agent only).
export const readonlyClient = new ApiClient(env.agentsReadonly);
export const procurementClient = new ApiClient(env.agentsProcurement);
