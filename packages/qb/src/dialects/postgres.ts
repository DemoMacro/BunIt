import type { DatabaseIntrospector, Dialect, DialectAdapter, Driver, QueryCompiler } from "kysely";
import { PostgresAdapter } from "kysely";
import { PostgresIntrospector } from "kysely";
import { PostgresQueryCompiler } from "kysely";
import type { Kysely } from "kysely";
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
