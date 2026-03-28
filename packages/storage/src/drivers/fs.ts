import { defineDriver } from "unstorage";
import { normalizeKey } from "unstorage/drivers/utils/index";
import type { Driver, GetKeysOptions, StorageMeta, TransactionOptions } from "unstorage";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Glob } from "bun";

export interface FSDriverOptions {
  base?: string;
  ignore?: string | string[];
}

type FSDriverFactory = ReturnType<typeof defineDriver<FSDriverOptions, undefined>>;

const fsDriver: FSDriverFactory = defineDriver((options: FSDriverOptions = {}): Driver<FSDriverOptions> => {
  const base = options.base ? resolve(options.base) : resolve(".");
  const ignore = options.ignore || [];

  return {
    name: "fs",
    options,
    hasItem(key: string, _opts: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      const file = Bun.file(path);
      return file.exists();
    },
    async getItem(key: string, _opts?: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      const file = Bun.file(path);
      if (!(await file.exists())) {
        return null;
      }
      return await file.text();
    },
    async getItemRaw(key: string, _opts: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      const file = Bun.file(path);
      if (!(await file.exists())) {
        return null;
      }
      return await file.arrayBuffer();
    },
    async setItem(key: string, value: string, _opts: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, value);
    },
    async setItemRaw(key: string, value: ArrayBuffer | Uint8Array, _opts: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, value);
    },
    async removeItem(key: string, _opts: TransactionOptions) {
      const path = join(base, normalizeKey(key, "/"));
      await Bun.file(path).delete();
    },
    async getMeta(key: string, _opts: TransactionOptions): Promise<StorageMeta | null> {
      const path = join(base, normalizeKey(key, "/"));
      const file = Bun.file(path);
      if (!(await file.exists())) {
        return null;
      }
      const stat = await Bun.file(path).stat();
      return {
        mtime: stat.mtime,
        size: stat.size,
      };
    },
    async getKeys(baseKey: string, _opts?: GetKeysOptions) {
      const glob = new Glob("**/*");
      const keys: string[] = [];
      const scanPath = baseKey ? join(base, normalizeKey(baseKey, "/")) : base;

      for await (const file of glob.scan(scanPath)) {
        // Convert filesystem path back to normalized key format
        const relativePath = baseKey ? file.replace(normalizeKey(baseKey, "/") + "/", "") : file;
        const key = normalizeKey(relativePath);

        if (ignore.length > 0) {
          const ignored = Array.isArray(ignore)
            ? ignore.some((pattern) => file.includes(pattern))
            : file.includes(ignore);
          if (ignored) continue;
        }
        keys.push(key);
      }

      return keys;
    },
    async clear(baseKey: string, _opts: TransactionOptions) {
      const targetPath = baseKey ? join(base, normalizeKey(baseKey, "/")) : base;

      try {
        await rm(targetPath, { recursive: true, force: true });
      } catch {
        // If directory doesn't exist or deletion fails, silently ignore
      }
    },
    async dispose() {
      // No cleanup needed
    },
  };
});

export default fsDriver;
