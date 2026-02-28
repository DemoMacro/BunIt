import type { DatabaseConnection, QueryResult, Driver, TransactionSettings } from "kysely";
import { CompiledQuery } from "kysely";
import { SQL } from "bun";
import type { BunSQLDriverConfig } from "./types";

export class BunSQLDriver implements Driver {
  #config: BunSQLDriverConfig;
  #sql?: SQL;

  constructor(config: BunSQLDriverConfig) {
    this.#config = config;
  }

  async init(): Promise<void> {
    const { url, options } = this.#config;

    if (url) {
      this.#sql = new SQL(url, options ?? {});
    } else if (options) {
      this.#sql = new SQL(options);
    } else {
      throw new Error("Either url or options must be provided");
    }

    await this.#sql.connect();
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    if (!this.#sql) {
      throw new Error("Driver not initialized. Call init() first.");
    }

    return new BunSQLConnection(this.#sql);
  }

  async beginTransaction(
    connection: DatabaseConnection,
    settings: TransactionSettings,
  ): Promise<void> {
    if (settings.isolationLevel || settings.accessMode) {
      let sql = "start transaction";

      if (settings.isolationLevel) {
        sql += ` isolation level ${settings.isolationLevel}`;
      }

      if (settings.accessMode) {
        sql += ` ${settings.accessMode}`;
      }

      await connection.executeQuery(CompiledQuery.raw(sql));
    } else {
      await connection.executeQuery(CompiledQuery.raw("begin"));
    }
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("rollback"));
  }

  async releaseConnection(_connection: DatabaseConnection): Promise<void> {
    // Bun.SQL manages its own connection pool
  }

  async destroy(): Promise<void> {
    if (this.#sql) {
      await this.#sql.end();
      this.#sql = undefined;
    }
  }
}

class BunSQLConnection implements DatabaseConnection {
  #sql: SQL;

  constructor(sql: SQL) {
    this.#sql = sql;
  }

  async executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters } = compiledQuery;

    const result = await this.#sql.unsafe(sql, [...parameters]);
    const rows = Array.isArray(result) ? result : result ? [result] : [];

    return {
      rows: rows as O[],
    };
  }

  streamQuery<O>(
    _compiledQuery: CompiledQuery,
    _chunkSize?: number,
  ): AsyncIterableIterator<QueryResult<O>> {
    throw new Error("Streaming queries are not supported");
  }
}
