import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet;

export const connectTestDB = async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
};

export const clearTestDB = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

export const disconnectTestDB = async () => {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
};
