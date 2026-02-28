import { defineDriver, normalizeKey } from "unstorage";
import type { Driver, GetKeysOptions, StorageMeta, TransactionOptions } from "unstorage";
import { S3Client, type S3Options } from "bun";

export interface S3DriverOptions extends S3Options {
  /**
   * Optional prefix to use for all keys.
   */
  base?: string;
}

export default defineDriver((options: S3DriverOptions): Driver<S3DriverOptions, S3Client> => {
  let client: S3Client | undefined;

  const getClient = () => {
    if (!client) {
      client = new S3Client(options);
    }
    return client;
  };

  const base = (options.base || "").replace(/\/$/, "");
  const p = (key: string) => (base ? `${base}/${normalizeKey(key)}` : normalizeKey(key));
  const d = (key: string) => (base ? key.replace(`${base}/`, "") : key);

  return {
    name: "s3",
    options,
    getInstance: getClient,
    async hasItem(key: string, _opts: TransactionOptions) {
      try {
        const file = getClient().file(p(key));
        await file.exists();
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key: string, _opts?: TransactionOptions) {
      try {
        const file = getClient().file(p(key));
        return await file.text();
      } catch {
        return null;
      }
    },
    async getItemRaw(key: string, _opts: TransactionOptions) {
      try {
        const file = getClient().file(p(key));
        return await file.bytes();
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string, _opts: TransactionOptions) {
      const file = getClient().file(p(key));
      await file.write(value);
    },
    async setItemRaw(
      key: string,
      value: ArrayBuffer | Uint8Array | string,
      _opts: TransactionOptions,
    ) {
      const file = getClient().file(p(key));
      await file.write(value);
    },
    async removeItem(key: string, _opts: TransactionOptions) {
      const file = getClient().file(p(key));
      await file.delete();
    },
    async getMeta(key: string, _opts: TransactionOptions): Promise<StorageMeta | null> {
      try {
        const result = await S3Client.list({ prefix: p(key) }, options);
        if (result.contents && result.contents.length > 0) {
          const object = result.contents[0];
          return {
            size: object.size,
            mtime: object.lastModified ? new Date(object.lastModified) : undefined,
            etag: object.eTag,
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    async getKeys(baseKey: string, _opts?: GetKeysOptions) {
      const keys: string[] = [];
      let startAfter: string | undefined = undefined;
      const prefix = p(baseKey || "");
      let hasMore = true;

      while (hasMore) {
        const result = await S3Client.list(
          {
            prefix,
            startAfter,
            maxKeys: 1000,
          },
          options,
        );

        if (result.contents) {
          for (const object of result.contents) {
            // Remove prefix to get relative key
            const relativeKey = d(object.key);
            // Normalize the key
            keys.push(normalizeKey(relativeKey));
          }
        }

        // Check if there are more results
        if (result.isTruncated && result.contents && result.contents.length > 0) {
          startAfter = result.contents[result.contents.length - 1].key;
        } else {
          hasMore = false;
        }
      }

      return keys;
    },
    async clear(baseKey: string, _opts: TransactionOptions) {
      const keys = await this.getKeys(baseKey, _opts);
      if (keys.length === 0) {
        return;
      }

      // Delete all objects
      await Promise.allSettled(
        keys.map(async (key) => {
          const file = getClient().file(p(key));
          await file.delete();
        }),
      );
    },
    async dispose() {
      client = undefined;
    },
  };
});
