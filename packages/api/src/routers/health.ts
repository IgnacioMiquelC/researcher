import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  console.log('Health check endpoint hit');
  res.send('Service is healthy.');
});
