import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { healthRouter } from './modules/health/routes';
import { authRouter } from './modules/auth/routes';
import { inventoryRouter } from './modules/inventory/routes';
import { productsRouter } from './modules/products/routes';
import { shopsRouter } from './modules/shops/routes';
import { customersRouter } from './modules/customers/routes';
import { salesRouter } from './modules/sales/routes';
import { shiftsRouter } from './modules/shifts/routes';
import { reportsRouter } from './modules/reports/routes';
import { settingsRouter } from './modules/settings/routes';

export const app = express();
app.use(requestLogger);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) }));
app.use(express.json());
app.use(healthRouter);
app.use(authRouter);
app.use(shopsRouter);
app.use(productsRouter);
app.use(inventoryRouter);
app.use(customersRouter);
app.use(salesRouter);
app.use(shiftsRouter);
app.use(reportsRouter);
app.use(settingsRouter);
app.use(errorHandler);


