import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let _client: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_client) {
    const client = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN,
    });
    _client = drizzle(client, { schema });
  }
  return _client;
}
