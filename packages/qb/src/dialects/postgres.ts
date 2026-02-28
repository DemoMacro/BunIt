import type {
  Kysely,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  QueryCompiler,
} from "kysely";
import { PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler } from "kysely";
import type { BunSQLDialectConfig } from "../types";
import { BunSQLDriver } from "../sql";

export interface PostgresDialectConfig extends BunSQLDialectConfig {}

export class PostgresDialect implements Dialect {
  readonly #config: PostgresDialectConfig;

  constructor(config: PostgresDialectConfig = {}) {
    this.#config = config;
  }

  createDriver(): Driver {
    return new BunSQLDriver({
      adapter: "postgres",
      ...this.#config,
    });
  }

  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new PostgresAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}

export default PostgresDialect;
