/**
 * Creates the two headless service-account Users the ADK agents/ service
 * logs in as (see backend/README.md for the full auth flow). Idempotent -
 * running it again leaves existing accounts and their passwords untouched
 * and only reports what already exists.
 *
 * Passwords are generated once and printed to the console for the operator
 * to copy into agents/.env - they are never stored or logged anywhere else,
 * and can't be recovered afterward (only reset by deleting the User and
 * re-running this script).
 *
 * Usage: node scripts/seedServiceAgents.js
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/roles.js';
import { generateRandomToken } from '../src/utils/crypto.js';

const SERVICE_ACCOUNTS = [
  {
    name: 'Agents Service (read-only)',
    email: 'agents-readonly@internal.local',
    role: ROLES.ANALYST,
    envVarPrefix: 'AGENTS_READONLY',
  },
  {
    name: 'Agents Service (procurement)',
    email: 'agents-procurement@internal.local',
    role: ROLES.PROCUREMENT_OFFICER,
    envVarPrefix: 'AGENTS_PROCUREMENT',
  },
];

const run = async () => {
  await connectDB();
  console.log('Connected to MongoDB.\n');

  for (const account of SERVICE_ACCOUNTS) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      console.log(`Already exists: ${account.email} (role: ${existing.role}) - password unchanged.`);
      continue;
    }

    const password = generateRandomToken(18);
    // eslint-disable-next-line no-await-in-loop
    const passwordHash = await User.hashPassword(password);
    // eslint-disable-next-line no-await-in-loop
    await User.create({
      name: account.name,
      email: account.email,
      passwordHash,
      role: account.role,
      isServiceAccount: true,
    });

    console.log(`Created: ${account.email} (role: ${account.role})`);
    console.log(`  Add to agents/.env:`);
    console.log(`  ${account.envVarPrefix}_EMAIL=${account.email}`);
    console.log(`  ${account.envVarPrefix}_PASSWORD=${password}\n`);
  }

  console.log('Done.');
  await disconnectDB();
};

run().catch(async (err) => {
  console.error('Seeding service accounts failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
