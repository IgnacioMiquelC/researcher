import express from 'express';

import { healthRouter } from './routers/health.ts';
import { v1Router } from './routers/v1/index.ts';
import { errorHandler } from './middleware/errorHandler.ts';

export const app = express();

// Global middleware
app.use(express.json());

// Routes
app.use("/health", healthRouter);
app.use("/api/v1", v1Router);

// Error handling middleware
app.use(errorHandler);
