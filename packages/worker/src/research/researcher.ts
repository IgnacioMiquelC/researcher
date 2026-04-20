/**
 * Abstract base class defining the researcher contract
 */
export abstract class Researcher<T> {
  abstract research(subject: string): Promise<T>;
}

