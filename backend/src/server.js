import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startScheduledJobs } from './services/scheduler.js';

const start = async () => {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');

    const app = createApp();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
      // eslint-disable-next-line no-console
      console.log(`Swagger docs at http://localhost:${env.port}/api/docs`);
    });

    startScheduledJobs();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
