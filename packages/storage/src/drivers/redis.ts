import { defineDriver, normalizeKey } from "unstorage";
import { RedisClient } from "bun";

export interface RedisDriverOptions {
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

export default defineDriver((options: RedisDriverOptions = {}) => {
  let client: RedisClient | undefined;

  const getClient = () => {
    if (!client) {
      client = new RedisClient(options.url || "redis://localhost:6379");
    }
    return client;
  };

  const base = (options.base || "").replace(/:$/, "");
  const p = (key: string) => (base ? `${base}:${key}` : key);

  return {
    name: "redis",
    options,
    async hasItem(key: string) {
      return (await getClient().exists(p(key))) > 0;
    },
    async getItem(key: string) {
      const value = await getClient().get(p(key));
      return value ?? null;
    },
    async setItem(key: string, value: string) {
      const client = getClient();
      if (options.ttl) {
        await client.set(p(key), value);
        await client.expire(p(key), options.ttl);
      } else {
        await client.set(p(key), value);
      }
    },
    async removeItem(key: string) {
      await getClient().del(p(key));
    },
    async getKeys() {
      const keys: string[] = [];
      let cursor = 0;
      const pattern = p("*");

      do {
        const result = await getClient().scan(cursor, "MATCH", pattern);
        cursor = result[0];
        const scanKeys = result[1];
        keys.push(...scanKeys);
      } while (cursor !== 0);

      return keys.map((key) => normalizeKey(base ? key.replace(`${base}:`, "") : key));
    },
    async clear() {
      const keys = await this.getKeys();
      if (keys.length === 0) {
        return;
      }
      const client = getClient();
      for (const key of keys) {
        await client.del(p(key));
      }
    },
    async dispose() {
      // Bun RedisClient doesn't have explicit disconnect method
      client = undefined;
    },
  };
});
