// Job schemas
import { z } from "zod";

export const JobRecord = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});