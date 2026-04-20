import {
    string,
    object,
} from 'zod';
import { z } from 'zod';

export const postBirdRequestBody = object({
    name: string(),
})

export type PostBirdRequestBody = z.infer<typeof postBirdRequestBody>;
