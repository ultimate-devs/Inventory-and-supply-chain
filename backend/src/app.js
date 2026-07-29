import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isTest } from './config/env.js';
import { swaggerSpec } from './docs/swagger.js';
import apiRouter from './routes/index.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!isTest) {
    app.use(morgan('dev'));
  }
  app.use(auditLogMiddleware);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
