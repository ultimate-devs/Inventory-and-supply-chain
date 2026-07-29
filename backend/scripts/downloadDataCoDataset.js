/**
 * Downloads the DataCo Smart Supply Chain dataset CSV used by seedFromDataCo.js.
 * The file is ~95MB and gitignored (see scripts/seed-data in .gitignore), so
 * each developer fetches it locally rather than committing it to the repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST_DIR = path.join(__dirname, 'seed-data');
const DEST_PATH = path.join(DEST_DIR, 'DataCoSupplyChainDataset.csv');
const SOURCE_URL =
  'https://raw.githubusercontent.com/ashishpatel26/DataCo-SMART-SUPPLY-CHAIN-FOR-BIG-DATA-ANALYSIS/main/DataCoSupplyChainDataset.csv';

const run = async () => {
  if (fs.existsSync(DEST_PATH)) {
    console.log(`Dataset already present at ${DEST_PATH}, skipping download.`);
    return;
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Downloading DataCo dataset from ${SOURCE_URL} ...`);

  const response = await fetch(SOURCE_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, fs.createWriteStream(DEST_PATH));
  console.log(`Saved to ${DEST_PATH}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
