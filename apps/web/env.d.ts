declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      DATABASE: D1Database;
      VECTORIZE_INDEX: VectorizeIndex;
      AI: any;
      RATELIMITER: any;
    }
  }
}

export {};
