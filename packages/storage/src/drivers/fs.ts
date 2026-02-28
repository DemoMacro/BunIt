import { defineDriver, normalizeKey } from "unstorage";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Glob } from "bun";

export interface FSDriverOptions {
  base?: string;
  ignore?: string | string[];
}

export default defineDriver((options: FSDriverOptions = {}) => {
  const base = options.base ? resolve(options.base) : resolve(".");
  const ignore = options.ignore || [];

  return {
    name: "fs",
    options,
    hasItem(key: string) {
      const path = join(base, key.replace(/:/g, "/"));
      const file = Bun.file(path);
      return file.exists();
    },
    async getItem(key: string) {
      const path = join(base, key.replace(/:/g, "/"));
      const file = Bun.file(path);
      if (!(await file.exists())) {
        return null;
      }
      return await file.text();
    },
    async setItem(key: string, value: string) {
      const path = join(base, key.replace(/:/g, "/"));
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, value);
    },
    async removeItem(key: string) {
      const path = join(base, key.replace(/:/g, "/"));
      await Bun.file(path).delete();
    },
    async getKeys() {
      const glob = new Glob("**/*");
      const keys: string[] = [];

      for await (const file of glob.scan(base)) {
        // Convert filesystem path back to normalized key format
        const key = normalizeKey(file);

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
    async clear() {
      const glob = new Glob("**/*");
      for await (const file of glob.scan(base)) {
        const path = join(base, file);
        await Bun.file(path).delete();
      }
    },
    async dispose() {
      // No cleanup needed
    },
  };
});
