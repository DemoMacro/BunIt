import type {
  Kysely,
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  QueryCompiler,
} from "kysely";
import { MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from "kysely";
import type { BunSQLDialectConfig } from "../types";
import { BunSQLDriver } from "../sql";

export interface MySQLDialectConfig extends BunSQLDialectConfig {}

export class MySQLDialect implements Dialect {
  readonly #config: MySQLDialectConfig;

  constructor(config: MySQLDialectConfig = {}) {
    this.#config = config;
  }

  createDriver(): Driver {
    return new BunSQLDriver({
      adapter: "mysql",
      ...this.#config,
    });
  }

  createQueryCompiler(): QueryCompiler {
    return new MysqlQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new MysqlAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new MysqlIntrospector(db);
  }
}

export default MySQLDialect;
