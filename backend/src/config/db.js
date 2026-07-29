import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export const connectDB = async (uri = env.mongoUri) => {
  await mongoose.connect(uri);
  return mongoose.connection;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
