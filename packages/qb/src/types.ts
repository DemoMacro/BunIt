import type { SQL } from "bun";

export interface BunSQLDialectConfig {
  url?: string | URL;
  options?: ConstructorParameters<typeof SQL>[0];
}

/** @internal */
export interface BunSQLDriverConfig extends BunSQLDialectConfig {
  adapter: "postgres" | "mysql" | "sqlite";
}
