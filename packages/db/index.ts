import { Logger } from "drizzle-orm";
import * as schema from "./schema";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

class CustomLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    // Truncate large chunks and embedding vectors for readability
    let truncatedQuery = query;
    let truncatedParams = [...params];

    // Truncate embedding vectors in query
    if (query.toLowerCase().includes("embedding")) {
      truncatedQuery = query.replace(/\[[\d\., -]+\]/g, "[...vector]");
    }

    // Truncate large array/object params
    truncatedParams = params.map((param) => {
      if (typeof param === "string" && param.match(/^\[[\d\., -]+\]$/)) {
        return "<query embeddings>";
      }
      if (Array.isArray(param) && param.length > 10) {
        return `[Array(${param.length})]`;
      }
      if (typeof param === "object" && param !== null) {
        const str = JSON.stringify(param);
        if (str.length > 100) {
          return `{Object(${str.length} chars)}`;
        }
      }
      return param;
    });

    console.log("Query:", truncatedQuery);
    console.log("Params:", truncatedParams);
  }
}

export const database = (databaseUrl: string) => {
  const pool = postgres(databaseUrl);
  return drizzle(pool, { schema, logger: new CustomLogger() });
};

export type Database = ReturnType<typeof drizzle<typeof schema>>;
export * from "drizzle-orm";
