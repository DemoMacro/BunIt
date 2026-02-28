import type { DatabaseIntrospector, Dialect, DialectAdapter, Driver, QueryCompiler } from "kysely";
import { SqliteAdapter } from "kysely";
import { SqliteIntrospector } from "kysely";
import { SqliteQueryCompiler } from "kysely";
import type { Kysely } from "kysely";
import type { BunSQLDialectConfig } from "../types";
import { BunSQLDriver } from "../sql";

export interface SQLiteDialectConfig extends BunSQLDialectConfig {}

export class SQLiteDialect implements Dialect {
  readonly #config: SQLiteDialectConfig;

  constructor(config: SQLiteDialectConfig = {}) {
    this.#config = config;
  }

  createDriver(): Driver {
    return new BunSQLDriver({
      adapter: "sqlite",
      ...this.#config,
    });
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}

export default SQLiteDialect;
