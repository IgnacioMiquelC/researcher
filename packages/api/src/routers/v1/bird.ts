import { Router } from "express";
import type { Request, Response } from "express";
import { postBirdRequestBody } from "researcher-sdk";
import { validateBody } from "../../middleware/validate.ts";
import { birdController } from "../../controllers/birdController.ts";

export const birdRouter = Router();

/**
 * POST /api/v1/bird
 * Create a new bird research job
 */
birdRouter.post(
  "/",
  validateBody(postBirdRequestBody),
  (req: Request, res: Response) => birdController.createBirdJob(req, res)
);

/**
 * GET /api/v1/bird
 * Retrieve bird research job status and result
 * Query parameter: name (bird name)
 */
birdRouter.get(
  "/",
  (req: Request, res: Response) => birdController.getBirdJob(req, res)
);
