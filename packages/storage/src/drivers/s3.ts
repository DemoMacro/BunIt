import type { GetKeysOptions, StorageMeta, TransactionOptions } from "unstorage";
import type { DriverFactory } from "unstorage/drivers/utils/index";
import { normalizeKey, createRequiredError } from "unstorage/drivers/utils/index";
import { S3Client, type S3Options } from "bun";

export interface S3DriverOptions extends S3Options {
  /**
   * Optional prefix to use for all keys.
   */
  base?: string;
}

const DRIVER_NAME = "s3";

const s3Driver: DriverFactory<S3DriverOptions, S3Client> = (options) => {
  let client: S3Client | undefined;

  const getClient = () => {
    if (!client) {
      if (!options.accessKeyId) {
        throw createRequiredError(DRIVER_NAME, "accessKeyId");
      }
      if (!options.secretAccessKey) {
        throw createRequiredError(DRIVER_NAME, "secretAccessKey");
      }
      if (!options.endpoint) {
        throw createRequiredError(DRIVER_NAME, "endpoint");
      }
      if (!options.bucket) {
        throw createRequiredError(DRIVER_NAME, "bucket");
      }
      client = new S3Client(options);
    }
    return client;
  };

  const base = (options.base || "").replace(/\/$/, "");
  const p = (key: string = "") =>
    base ? `${base}/${normalizeKey(key, "/")}` : normalizeKey(key, "/");
  const d = (key: string) => (base ? key.replace(`${base}/`, "") : key);

  return {
    name: DRIVER_NAME,
    options,
    getInstance: getClient,
    async hasItem(key: string, _opts: TransactionOptions) {
      try {
        await getClient().file(p(key)).exists();
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key: string, _opts?: TransactionOptions) {
      try {
        return await getClient().file(p(key)).text();
      } catch {
        return null;
      }
    },
    async getItemRaw(key: string, _opts: TransactionOptions) {
      try {
        return await getClient().file(p(key)).bytes();
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string, _opts: TransactionOptions) {
      await getClient().file(p(key)).write(value);
    },
    async setItemRaw(
      key: string,
      value: ArrayBuffer | Uint8Array | string,
      _opts: TransactionOptions,
    ) {
      await getClient().file(p(key)).write(value);
    },
    async removeItem(key: string, _opts: TransactionOptions) {
      await getClient().file(p(key)).delete();
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
            const relativeKey = d(object.key);
            keys.push(normalizeKey(relativeKey));
          }
        }

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
      await Promise.allSettled(
        keys.map(async (key) => {
          await getClient().file(p(key)).delete();
        }),
      );
    },
    async dispose() {
      client = undefined;
    },
  };
};

export default s3Driver;
