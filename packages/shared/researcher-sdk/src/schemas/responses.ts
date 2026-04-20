import {
    string,
    object,
    record,
    unknown,
    nullable,
} from 'zod';
import { z } from 'zod';

/**
 * Schema for API responses related to bird research jobs
 */
export const postBirdResponseBody = object({
    id: string(),
    name: string(),
    status: string(),
    createdAt: string(),
})

/**
 * Schema for GET bird response, which includes job status and optional result or error
 */
export const getBirdResponseBody = object({
    message: string(),
    status: string(),
    result: record(string(), unknown()).nullable().optional(),
    error: nullable(string()).optional(),
    jobId: string().optional(),
})

/**
 * Schema for error responses, which includes a message describing the error
 */
export const errorResponseBody = object({
    message: string(),
})

export type PostBirdResponseBody = z.infer<typeof postBirdResponseBody>;
export type GetBirdResponseBody = z.infer<typeof getBirdResponseBody>;
export type ErrorResponseBody = z.infer<typeof errorResponseBody>;
