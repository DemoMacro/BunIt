import { defineDriver, normalizeKey } from "unstorage";
import type { Driver, GetKeysOptions, StorageMeta, TransactionOptions } from "unstorage";
import { RedisClient, type RedisOptions } from "bun";

export interface RedisDriverOptions extends RedisOptions {
  /**
   * Connection URL for Redis.
   * Format: `redis://username:password@localhost:6379`
   * Defaults to `redis://localhost:6379`
   */
  url?: string;

  /**
   * Optional prefix to use for all keys.
   */
  base?: string;

  /**
   * Default TTL for all items in seconds.
   */
  ttl?: number;
}

export default defineDriver(
  (options: RedisDriverOptions = {}): Driver<RedisDriverOptions, RedisClient> => {
    let client: RedisClient | undefined;

    const getClient = () => {
      if (!client) {
        client = new RedisClient(options.url, options);
      }
      return client;
    };

    const base = (options.base || "").replace(/:$/, "");
    const p = (key: string) => (base ? `${base}:${key}` : key);
    const d = (key: string) => (base ? key.replace(`${base}:`, "") : key);

    return {
      name: "redis",
      options,
      getInstance: getClient,
      async hasItem(key: string, _opts: TransactionOptions) {
        const exists = await getClient().exists(p(key));
        return typeof exists === "number" ? exists > 0 : exists;
      },
      async getItem(key: string, _opts?: TransactionOptions) {
        const value = await getClient().get(p(key));
        return value ?? null;
      },
      async getItems(items: { key: string }[], _commonOpts?: TransactionOptions) {
        const keys = items.map((item) => p(item.key));
        const values = await getClient().mget(...keys);

        return keys.map((key, index) => ({
          key: d(key),
          value: values[index] ?? null,
        }));
      },
      async getItemRaw(key: string, _opts: TransactionOptions) {
        return await getClient().getBuffer(p(key));
      },
      async setItem(key: string, value: string, _opts: TransactionOptions) {
        const client = getClient();
        if (options.ttl) {
          await client.set(p(key), value);
          await client.expire(p(key), options.ttl);
        } else {
          await client.set(p(key), value);
        }
      },
      async setItems(items: { key: string; value: string }[], _opts?: TransactionOptions) {
        const client = getClient();
        const pipeline = [];
        for (const item of items) {
          pipeline.push(client.set(p(item.key), item.value));
          if (options.ttl) {
            pipeline.push(client.expire(p(item.key), options.ttl));
          }
        }
        await Promise.allSettled(pipeline);
      },
      async setItemRaw(key: string, value: string | Uint8Array, _opts: TransactionOptions) {
        const client = getClient();
        if (typeof value === "string") {
          await client.set(p(key), value);
        } else {
          // Convert Uint8Array to buffer and store
          await client.set(p(key), value);
        }
        if (options.ttl) {
          await client.expire(p(key), options.ttl);
        }
      },
      async removeItem(key: string, _opts: TransactionOptions) {
        await getClient().del(p(key));
      },
      async getMeta(key: string, _opts: TransactionOptions): Promise<StorageMeta | null> {
        const ttl = await getClient().ttl(p(key));
        const exists = await getClient().exists(p(key));
        if (!exists) {
          return null;
        }
        return {
          ttl: ttl > 0 ? ttl : undefined,
        };
      },
      async getKeys(baseKey: string, _opts?: GetKeysOptions) {
        const keys: string[] = [];
        let cursor = 0;
        const pattern = p(baseKey + "*");

        do {
          const result = await getClient().scan(cursor, "MATCH", pattern);
          cursor = typeof result[0] === "number" ? result[0] : parseInt(result[0], 10);
          const scanKeys = result[1];
          keys.push(...scanKeys);
        } while (cursor !== 0);

        return keys.map((key) => normalizeKey(d(key)));
      },
      async clear(base: string, _opts: TransactionOptions) {
        const keys = await this.getKeys(base, _opts);
        if (keys.length === 0) {
          return;
        }
        const client = getClient();
        const keysToDelete = keys.map((key) => p(key));
        if (keysToDelete.length === 1) {
          await client.del(keysToDelete[0]);
        } else {
          await client.del(...keysToDelete);
        }
      },
      async dispose() {
        // Bun RedisClient doesn't have explicit disconnect method
        client = undefined;
      },
    };
  },
);
