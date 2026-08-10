/**
 * Runs benchmarkReports.js against an ephemeral in-memory Mongo replica set
 * instead of Docker Compose's `mongo` service - useful when Docker isn't
 * available (CI runners, grading environments, this repo's own dev setup)
 * but the <500ms/10,000-item report budget still needs to be proven, not
 * just asserted. Same benchmark, same budget, just a different Mongo.
 *
 * Usage: npm run benchmark:reports:local
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const backendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const main = async () => {
  console.log('Starting ephemeral in-memory Mongo replica set...');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  console.log(`Replica set ready at ${uri}\n`);

  const child = spawn(process.execPath, ['scripts/benchmarkReports.js'], {
    cwd: backendDir,
    env: { ...process.env, BENCHMARK_MONGODB_URI: uri },
    stdio: 'inherit',
  });

  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 1));
  });

  await replSet.stop();
  process.exit(exitCode);
};

main().catch((err) => {
  console.error('benchmark:reports:local failed:', err);
  process.exit(1);
});
