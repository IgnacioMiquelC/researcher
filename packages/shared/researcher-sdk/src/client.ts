import axios from 'axios';
import { z } from 'zod';
import { 
    postBirdRequestBody,
    postBirdResponseBody,
    getBirdResponseBody
} from './schemas/index.ts';

// Extract types from Zod schemas
export type PostBirdResponseBody = z.infer<typeof postBirdResponseBody>;
export type GetBirdResponseBody = z.infer<typeof getBirdResponseBody>;


/**
 * BirdResearchClient is a simple client for interacting with the Bird Researcher API. It provides methods to research a bird and to get the status of a bird research job.
 * This client abstracts away the details of making HTTP requests to the API and provides a clean interface for users of the SDK.
 *
 * @example
 * const client = new BirdResearchClient('http://localhost:3200/');
 * const response = await client.researchBird('Sparrow');
 * console.log(response);
 *
 * const jobStatus = await client.getBirdJob('Sparrow');
 * console.log(jobStatus);
 */
export class BirdResearchClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async researchBird(name: string, apiVersion: string = 'v1'): Promise<PostBirdResponseBody> {
        const validatedData = postBirdRequestBody.parse({ name });
        const response = await axios.post(`${this.baseUrl}/${apiVersion}/bird`, validatedData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return postBirdResponseBody.parse(response.data);
    }

    async getBirdJob(name: string, apiVersion: string = 'v1'): Promise<GetBirdResponseBody> {
        const response = await axios.get(`${this.baseUrl}/${apiVersion}/bird`, {
            params: { name },
        });
        return getBirdResponseBody.parse(response.data);
    }
}
