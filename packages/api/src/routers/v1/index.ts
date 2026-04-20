import { Router } from "express";
import { birdRouter } from './bird.ts';

export const v1Router = Router();

v1Router.use("/bird", birdRouter);
