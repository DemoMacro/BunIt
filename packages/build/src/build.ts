import type { BuildContext, BuildConfig, TransformEntry, BundleEntry } from "./types";

import { fileURLToPath, pathToFileURL } from "node:url";
import { isAbsolute, join, resolve } from "node:path";
import { rm } from "node:fs/promises";
import { bunBuild } from "./builders/bundle";
import { transformDir } from "./builders/transform";
import { fmtPath, analyzeDir } from "./utils";
import prettyBytes from "pretty-bytes";

/**
 * Build dist/ from src/
 */
export async function build(config: BuildConfig): Promise<void> {
  const start = Date.now();

  const pkgDir = normalizePath(config.cwd);
  const pkg = await readJSON(join(pkgDir, "package.json")).catch(() => ({}));
  const ctx: BuildContext = { pkg, pkgDir };

  console.log(`Building \`${ctx.pkg.name || "<no name>"}\` (\`${ctx.pkgDir}\`)`);

  const hooks = config.hooks || {};

  await hooks.start?.(ctx);

  const entries = (config.entries || []).map((rawEntry) => {
    let entry: TransformEntry | BundleEntry;

    if (typeof rawEntry === "string") {
      const [input, outDir] = rawEntry.split(":") as [string, string | undefined];
      entry = input.endsWith("/")
        ? ({ type: "transform", input, outDir } as TransformEntry)
        : ({ type: "bundle", input: input.split(","), outDir } as BundleEntry);
    } else {
      entry = rawEntry;
    }

    if (!entry.input) {
      throw new Error(`Build entry missing \`input\`: ${JSON.stringify(entry, null, 2)}`);
    }
    entry = { ...entry };
    entry.outDir = normalizePath(entry.outDir || "dist", pkgDir);
    entry.input = Array.isArray(entry.input)
      ? entry.input.map((p) => normalizePath(p, pkgDir))
      : normalizePath(entry.input, pkgDir);
    return entry;
  });

  await hooks.entries?.(entries, ctx);

  const outDirs: Array<string> = [];
  for (const outDir of entries
    .map((e) => e.outDir)
    .sort((a, b) => (a ?? "").localeCompare(b ?? "")) as string[]) {
    if (!outDirs.some((dir) => outDir.startsWith(dir))) {
      outDirs.push(outDir);
    }
  }
  for (const outDir of outDirs) {
    console.log(`Cleaning up \`${fmtPath(outDir)}\``);
    await rm(outDir, { recursive: true, force: true });
  }

  for (const entry of entries) {
    await (entry.type === "bundle" ? bunBuild(ctx, entry, hooks) : transformDir(ctx, entry));
  }

  await hooks.end?.(ctx);

  if (!entries.every((e) => e.stub)) {
    const dirSize = analyzeDir(outDirs);
    console.log(`\nΣ Total dist byte size: ${prettyBytes(dirSize.size)} (${dirSize.files} files)`);
  }

  console.log(`\nbuild finished in ${Date.now() - start}ms`);
}

// --- utils

function normalizePath(path: string | URL | undefined, resolveFrom?: string) {
  return typeof path === "string" && isAbsolute(path)
    ? path
    : path instanceof URL
      ? fileURLToPath(path)
      : resolve(resolveFrom || ".", path || ".");
}

function readJSON(specifier: string) {
  const pkgPath = isAbsolute(specifier) ? pathToFileURL(specifier).href : specifier;
  return import(pkgPath, {
    with: { type: "json" },
  }).then((r) => r.default);
}
