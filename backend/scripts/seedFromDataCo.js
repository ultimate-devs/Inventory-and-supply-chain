/**
 * Seeds MongoDB with real product/category/demand data derived from the
 * DataCo Smart Supply Chain dataset (order-line-item transactions,
 * 2015-2018), rather than synthetic data.
 *
 * Source: DataCoSupplyChainDataset.csv, mirrored at
 * https://github.com/ashishpatel26/DataCo-SMART-SUPPLY-CHAIN-FOR-BIG-DATA-ANALYSIS
 * (original: Kaggle "DataCo SMART SUPPLY CHAIN FOR BIG DATA ANALYSIS").
 * The ~95MB CSV is not committed to the repo (see .gitignore); run
 * `npm run seed:download` first, or place the file at
 * scripts/seed-data/DataCoSupplyChainDataset.csv yourself.
 *
 * What this script derives from the real data vs. what it assumes:
 *  - Product names, prices, order dates, and order-item quantities are taken
 *    directly from the dataset.
 *  - Categories are grouped by the dataset's "Department Name" column
 *    (Outdoors, Fitness, Footwear, Fan Shop, Apparel, ...) rather than its
 *    much narrower "Category Name" column (50 categories sharing only 118
 *    products total - e.g. "Cleats" has 2 products, "Golf Balls" has 5 -
 *    so no single Category Name has the 10 distinct products Phase 1 asks
 *    for). Department Name is a real column in the same dataset and groups
 *    cleanly into 5 departments with 10+ real products each.
 *  - unitCost, orderingCost, holdingCostPerUnit, leadTimeDays, safetyStock
 *    are not present in the dataset (it's a sales/logistics dataset, not a
 *    procurement-cost dataset) so they're derived with documented, plausible
 *    business assumptions below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Category } from '../src/models/Category.js';
import { Item } from '../src/models/Item.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/config/roles.js';
import { env } from '../src/config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, 'seed-data', 'DataCoSupplyChainDataset.csv');

const CATEGORY_COUNT = 5;
const ITEMS_PER_CATEGORY = 10;
const DEMAND_WINDOW_DAYS = 30;

// Even the richest single Department Name (Outdoors, 53 products) has plenty
// of products, but a few of the next-richest departments fall just short of
// 10 distinct products each (Fan Shop 9, Golf 8, Apparel 8, Discs Shop 4,
// Technology 3). Merging these adjacent, genuinely-related departments keeps
// every product/price/demand figure real while giving 5 clean categories
// that each have 10+ distinct products to draw from.
const CATEGORY_GROUP_MAP = {
  'Fan Shop': 'Team & Fan Gear',
  'Discs Shop': 'Team & Fan Gear',
  Golf: 'Apparel & Accessories',
  Apparel: 'Apparel & Accessories',
  Technology: 'Apparel & Accessories',
};

const toDateKey = (mdyString) => {
  const [datePart] = mdyString.split(' ');
  const [month, day, year] = datePart.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const slugToSku = (name, cardId) =>
  `${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 25)}-${cardId}`.slice(
    0,
    40,
  );

/**
 * Streams the CSV once, aggregating per (category, product): total quantity
 * (to rank popularity), average sale price, average real shipping days (used
 * as a lead-time proxy), and a day -> quantity map (used to build a 30-day
 * demand history window once the top products are known).
 */
const aggregateFromCsv = () =>
  new Promise((resolve, reject) => {
    /** @type {Map<string, { totalQty: number, products: Map<string, ProductAgg> }>} */
    const categories = new Map();
    let rowCount = 0;

    const parser = fs
      .createReadStream(CSV_PATH, { encoding: 'latin1' })
      .pipe(parse({ columns: true, relax_column_count: true }));

    parser.on('data', (row) => {
      rowCount += 1;
      const rawDepartment = row['Department Name']?.trim();
      const categoryName = rawDepartment && (CATEGORY_GROUP_MAP[rawDepartment] || rawDepartment);
      const productCardId = row['Product Card Id'];
      const productName = row['Product Name']?.trim();
      const orderDateRaw = row['order date (DateOrders)'];
      const quantity = Number(row['Order Item Quantity']) || 0;
      const price = Number(row['Order Item Product Price']) || 0;
      const shippingDays = Number(row['Days for shipping (real)']);

      if (!categoryName || !productCardId || !productName || !orderDateRaw) return;

      const dateKey = toDateKey(orderDateRaw);

      if (!categories.has(categoryName)) {
        categories.set(categoryName, { totalQty: 0, products: new Map() });
      }
      const categoryAgg = categories.get(categoryName);
      categoryAgg.totalQty += quantity;

      if (!categoryAgg.products.has(productCardId)) {
        categoryAgg.products.set(productCardId, {
          name: productName,
          totalQty: 0,
          priceSum: 0,
          priceCount: 0,
          shippingDaysSum: 0,
          shippingDaysCount: 0,
          dailyQuantity: new Map(),
        });
      }
      const productAgg = categoryAgg.products.get(productCardId);
      productAgg.totalQty += quantity;
      if (price > 0) {
        productAgg.priceSum += price;
        productAgg.priceCount += 1;
      }
      if (Number.isFinite(shippingDays)) {
        productAgg.shippingDaysSum += shippingDays;
        productAgg.shippingDaysCount += 1;
      }
      productAgg.dailyQuantity.set(dateKey, (productAgg.dailyQuantity.get(dateKey) || 0) + quantity);
    });

    parser.on('end', () => resolve({ categories, rowCount }));
    parser.on('error', reject);
  });

/**
 * Builds a 30-day demand history from a product's real per-day order
 * quantities. Rather than anchoring every product to the same fixed
 * calendar date (which lands on a dead spell for lower-volume products,
 * since this dataset spans 2015-2018), this slides a 30-day window over
 * the product's own order history and keeps the window with the highest
 * total quantity - still 100% real order dates/quantities, just picking
 * the most representative real 30-day slice of this product's activity.
 */
const buildDemandHistory = (dailyQuantity) => {
  const dateKeys = [...dailyQuantity.keys()].sort();
  if (dateKeys.length === 0) {
    return Array.from({ length: DEMAND_WINDOW_DAYS }, (_, i) => ({
      date: new Date(Date.UTC(1970, 0, 1 + i)),
      quantity: 0,
    }));
  }

  const start = new Date(`${dateKeys[0]}T00:00:00Z`);
  const end = new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00Z`);
  const totalDays = Math.round((end - start) / 86_400_000) + 1;

  const daily = new Array(totalDays).fill(0);
  dateKeys.forEach((key) => {
    const offset = Math.round((new Date(`${key}T00:00:00Z`) - start) / 86_400_000);
    daily[offset] = dailyQuantity.get(key);
  });

  let bestStart = 0;
  let bestSum = -1;
  let windowSum = 0;
  for (let i = 0; i < daily.length; i += 1) {
    windowSum += daily[i];
    if (i >= DEMAND_WINDOW_DAYS) windowSum -= daily[i - DEMAND_WINDOW_DAYS];
    if (i >= DEMAND_WINDOW_DAYS - 1 && windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = i - DEMAND_WINDOW_DAYS + 1;
    }
  }
  // If the product's whole history is shorter than the window, just use all of it.
  if (daily.length < DEMAND_WINDOW_DAYS) bestStart = 0;

  const history = [];
  for (let i = 0; i < DEMAND_WINDOW_DAYS; i += 1) {
    const dayIndex = bestStart + i;
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + dayIndex);
    history.push({ date: d, quantity: dayIndex < daily.length ? daily[dayIndex] : 0 });
  }
  return history;
};

const run = async () => {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(
      `DataCo dataset not found at ${CSV_PATH}.\n` +
        'Download it first, e.g.:\n' +
        '  curl -L -o scripts/seed-data/DataCoSupplyChainDataset.csv \\\n' +
        '    https://raw.githubusercontent.com/ashishpatel26/DataCo-SMART-SUPPLY-CHAIN-FOR-BIG-DATA-ANALYSIS/main/DataCoSupplyChainDataset.csv',
    );
    process.exit(1);
  }

  console.log('Parsing DataCo dataset (this streams ~180k rows, takes a few seconds)...');
  const { categories, rowCount } = await aggregateFromCsv();
  console.log(`Parsed ${rowCount} order-line rows across ${categories.size} categories.`);

  // Ranked by distinct-product richness (not order volume) so the 5 chosen
  // categories can actually supply ITEMS_PER_CATEGORY distinct real products.
  const topCategories = [...categories.entries()]
    .sort((a, b) => b[1].products.size - a[1].products.size)
    .slice(0, CATEGORY_COUNT);

  await connectDB();
  console.log('Connected to MongoDB. Clearing previously seeded categories/items...');
  await Item.deleteMany({});
  await Category.deleteMany({});

  let itemCount = 0;
  for (const [categoryName, categoryAgg] of topCategories) {
    const category = await Category.create({
      name: categoryName,
      description: `Seeded from the DataCo dataset (${categoryAgg.totalQty.toLocaleString()} historical order units).`,
    });

    const topProducts = [...categoryAgg.products.entries()]
      .sort((a, b) => b[1].totalQty - a[1].totalQty)
      .slice(0, ITEMS_PER_CATEGORY);

    for (const [productCardId, productAgg] of topProducts) {
      const avgPrice = productAgg.priceCount ? productAgg.priceSum / productAgg.priceCount : 10;
      const avgShippingDays = productAgg.shippingDaysCount
        ? productAgg.shippingDaysSum / productAgg.shippingDaysCount
        : 5;
      const leadTimeDays = Math.min(30, Math.max(2, Math.round(avgShippingDays)));

      const dailyDemandHistory = buildDemandHistory(productAgg.dailyQuantity);
      const avgDailyDemand =
        dailyDemandHistory.reduce((sum, d) => sum + d.quantity, 0) / dailyDemandHistory.length;

      // Business assumptions (the dataset has sale price, not procurement cost):
      //  - unitCost ~= 65% of average sale price (a typical retail margin).
      //  - holdingCostPerUnit ~= 20% of unit cost per year (common inventory rule of thumb).
      //  - orderingCost is a flat per-order handling estimate.
      //  - safetyStock covers ~2 days of average demand.
      //  - currentStock is seeded at roughly 1.5x lead-time demand plus safety stock,
      //    i.e. "just restocked" - realistic starting state, not a live snapshot.
      const unitCost = Math.max(1, Number((avgPrice * 0.65).toFixed(2)));
      const holdingCostPerUnit = Number((unitCost * 0.2).toFixed(2));
      const orderingCost = 35;
      const safetyStock = Math.ceil(avgDailyDemand * 2);
      const currentStock = Math.max(
        5,
        Math.round(avgDailyDemand * leadTimeDays * 1.5 + safetyStock),
      );

      await Item.create({
        name: productAgg.name,
        sku: slugToSku(productAgg.name, productCardId),
        description: `Seeded from DataCo product card #${productCardId} (${productAgg.totalQty.toLocaleString()} historical units ordered).`,
        category: category._id,
        unitCost,
        currentStock,
        leadTimeDays,
        orderingCost,
        holdingCostPerUnit,
        safetyStock,
        serviceLevel: 95,
        dailyDemandHistory,
      });
      itemCount += 1;
    }

    console.log(`  ${categoryName}: seeded ${topProducts.length} items`);
  }

  const adminExists = await User.findOne({ email: env.seedAdmin.email.toLowerCase() });
  if (!adminExists) {
    const passwordHash = await User.hashPassword(env.seedAdmin.password);
    await User.create({
      name: 'Super Admin',
      email: env.seedAdmin.email,
      passwordHash,
      role: ROLES.SUPER_ADMIN,
    });
    console.log(`Created Super Admin account: ${env.seedAdmin.email}`);
  } else {
    console.log(`Super Admin account already exists: ${env.seedAdmin.email}`);
  }

  console.log(`Done. Seeded ${topCategories.length} categories and ${itemCount} items.`);
  await disconnectDB();
};

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
