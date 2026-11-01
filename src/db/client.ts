import { attachDatabasePool } from "@neon/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const createDb = (databaseUrl: string) => {
  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  attachDatabasePool(pool);

  return drizzle(pool);
};

let db: ReturnType<typeof createDb> | undefined;

export const getDb = () => {
  db ??= createDb(process.env.DATABASE_URL!);

  return db;
};
