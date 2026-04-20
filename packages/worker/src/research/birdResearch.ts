import axios from 'axios';
import { Researcher } from './researcher.ts';
import http from 'http';
import https from 'https';

export class BirdResearcher extends Researcher<string> {
  private readonly baseUrl = 'https://en.wikipedia.org/w/api.php';

  /**
   * Fetches summary data for a specific bird
   */
  async research(birdName: string): Promise<string> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          action: 'query',
          prop: 'extracts',
          exintro: 1,
          explaintext: 1,
          redirects: 1,
          titles: birdName,
          format: 'json',
          formatversion: 2,
          origin: '*',
        },
        headers: {
          'User-Agent': 'ResearcherApp/1.0',
          'Accept': 'application/json',
          'Host': 'en.wikipedia.org',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        httpAgent: new http.Agent({ family: 4 }),
        httpsAgent: new https.Agent({ family: 4 }),
      });

      const page = response.data.query.pages[0];
      
      if (page.missing) {
        throw new Error(`Could not find information on: ${birdName}`);
      }

      return page.extract;
    } catch (error) {
      throw error;
    }
  }
}
