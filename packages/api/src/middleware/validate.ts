import express from 'express';
import { ZodType } from 'zod';

export const validateBody = (schema: ZodType) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
};
