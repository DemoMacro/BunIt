import type { BuildContext, TransformEntry } from "../types";

import { mkdir, symlink, chmod } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { Glob } from "bun";
import { fmtPath } from "../utils";

const SHEBANG_RE = /^#![^\n]*/;

/**
 * Transform all .ts modules in a directory using Bun.Transpiler.
 */
export async function transformDir(ctx: BuildContext, entry: TransformEntry): Promise<void> {
  const promises: Promise<string>[] = [];

  const glob = new Glob("**/*.*");
  for await (const entryName of glob.scan(entry.input)) {
    if (entry.filter && (await entry.filter(entryName)) === false) {
      continue;
    }
    promises.push(
      (async () => {
        const entryPath = join(entry.input, entryName);
        const ext = extname(entryPath);
        switch (ext) {
          case ".ts": {
            {
              const entryDistPath = join(entry.outDir!, entryName.replace(/\.ts$/, ".mjs"));
              const code = await transformModule(entryPath, entry, entryDistPath);
              await mkdir(dirname(entryDistPath), { recursive: true });
              await Bun.write(entryDistPath, code);

              if (SHEBANG_RE.test(code)) {
                await chmod(entryDistPath, 0o755);
              }
              return entryDistPath;
            }
          }
          default: {
            {
              const entryDistPath = join(entry.outDir!, entryName);
              await mkdir(dirname(entryDistPath), { recursive: true });
              if (entry.stub) {
                await symlink(entryPath, entryDistPath, "junction").catch(() => {
                  /* exists */
                });
              } else {
                const code = await Bun.file(entryPath).text();
                await Bun.write(entryDistPath, code);
                if (SHEBANG_RE.test(code)) {
                  await chmod(entryDistPath, 0o755);
                }
              }
              return entryDistPath;
            }
          }
        }
      })(),
    );
  }

  const results = await Promise.allSettled(promises);

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);

  if (errors.length > 0) {
    let isolatedErrors: Error[] = [];
    let otherErrors: Error[] = [];
    for (const error of errors.flatMap((err) => (Array.isArray(err.cause) ? err.cause : [err]))) {
      if (error.message?.includes("--isolatedDeclarations")) {
        isolatedErrors.push(error);
      } else {
        otherErrors.push(error);
      }
    }
    for (const error of otherErrors) {
      console.error(error);
    }
    for (const error of isolatedErrors) {
      console.warn(error);
    }
    if (otherErrors.length > 0) {
      throw new Error(`Errors while transforming ${entry.input}`);
    }
  }

  const writtenFiles = results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
    .map((result) => result.value);

  console.log(
    `\n[transform] ${fmtPath(entry.outDir! + "/")}${entry.stub ? " (stub)" : ""}\n${itemsTable(writtenFiles.map((f) => fmtPath(f)))}`,
  );
}

function itemsTable(items: string[], consoleWidth: number = process.stdout.columns || 80): string {
  if (items.length === 0) {
    return "";
  }
  const maxItemWidth = Math.max(...items.map((item) => item.length));
  const colWidth = maxItemWidth + 2;
  const columns = Math.max(1, Math.floor(consoleWidth / colWidth));
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    rows.push(row.map((item) => item.padEnd(colWidth)).join(""));
  }
  return rows.join("\n");
}

/**
 * Transform a .ts module using Bun.Transpiler.
 */
async function transformModule(
  entryPath: string,
  entry: TransformEntry,
  entryDistPath: string,
): Promise<string> {
  const sourceText = await Bun.file(entryPath).text();

  // Stub mode: re-export from source
  if (entry.stub) {
    const transpiler = new Bun.Transpiler({ loader: "ts" });
    const scanResult = transpiler.scan(sourceText);
    const hasDefaultExport = scanResult.exports.includes("default");

    let relativePath = relative(dirname(entryDistPath), entryPath);
    // Normalize path separators to forward slashes for cross-platform compatibility
    relativePath = relativePath.replace(/\\/g, "/");

    return `export * from "${relativePath}";${
      hasDefaultExport ? `\nexport { default } from "${relativePath}";` : ""
    }`;
  }

  // Transform mode: convert TypeScript to JavaScript
  const transpilerOptions = {
    loader: entry.transpiler?.loader || "ts",
    target: entry.transpiler?.target || "bun",
    tsconfig: entry.transpiler?.tsconfig,
  };

  const transpiler = new Bun.Transpiler(transpilerOptions);
  return transpiler.transformSync(sourceText);
}
