import express from 'express';
import { ZodError } from 'zod';

interface AppError extends Error {
  status?: number;
}

export const errorHandler = (
  err: AppError,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    status: err.status || 500,
    stack: err.stack,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Handle other errors
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    status,
  });
};
