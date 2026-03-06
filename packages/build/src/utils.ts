import { rm } from "node:fs/promises";
import { relative, resolve } from "pathe";

import type { BuildEntry } from "./types";

/**
 * Normalize entries to BuildEntry[]
 */
export async function normalizeEntries(
  entries: (BuildEntry | string)[],
  pkgDir: string,
): Promise<BuildEntry[]> {
  const normalized: BuildEntry[] = [];

  for (const rawEntry of entries) {
    if (typeof rawEntry === "string") {
      normalized.push({ entrypoints: rawEntry });
    } else {
      const entry = { ...rawEntry };
      if (!entry.outdir) {
        entry.outdir = resolve(pkgDir, "dist");
      }
      normalized.push(entry);
    }
  }

  return normalized;
}

/**
 * Collect output directories from entries
 */
export async function collectOutDirs(entries: BuildEntry[]): Promise<string[]> {
  const outDirs = new Set<string>();
  for (const entry of entries) {
    outDirs.add(entry.outdir || "dist");
  }
  return Array.from(outDirs);
}

/**
 * Expand glob patterns using Bun's native glob
 */
export async function expandGlobs(
  entrypoints: string | string[],
  pkgDir: string,
): Promise<string[]> {
  const patterns = Array.isArray(entrypoints) ? entrypoints : [entrypoints];
  const result: string[] = [];

  for (const pattern of patterns) {
    const hasGlob = /[*?{}[\]]/.test(pattern);

    if (hasGlob) {
      const glob = new Bun.Glob(pattern);
      for await (const filePath of glob.scan({ cwd: pkgDir, absolute: true })) {
        result.push(filePath);
      }
    } else {
      const absolutePath = pattern.startsWith("/") ? pattern : resolve(pkgDir, pattern);
      result.push(absolutePath);
    }
  }

  return result;
}

/**
 * Get distribution name from source file path
 */
export function getDistName(filePath: string, pkgDir: string): string {
  let relativePath = relative(pkgDir, filePath);
  relativePath = relativePath.replace(/\\/g, "/");

  // Remove extension
  const distName = relativePath.replace(/\.(ts|tsx|js|jsx)$/, "");

  // If file is in src/ directory, remove src/ prefix
  if (distName.startsWith("src/")) {
    return distName.slice(4);
  }

  return distName;
}

/**
 * Detect exports from source code
 */
export function detectExports(sourceCode: string): { hasDefault: boolean; exports: string[] } {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  const scanResult = transpiler.scan(sourceCode);
  return {
    hasDefault: scanResult.exports.includes("default"),
    exports: scanResult.exports,
  };
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await Bun.write(`${dir}/.keep`, "");
    await rm(`${dir}/.keep`);
  } catch {
    // Directory already exists or was created
  }
}
