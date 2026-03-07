import type { BuildConfig as BunBuildConfig } from "bun";

import { rm } from "node:fs/promises";
import { resolve, relative } from "pathe";
import { readPackageJSON } from "pkg-types";
import { consola } from "consola";
import prettyBytes from "pretty-bytes";
import UnpluginIsolatedDecl from "unplugin-isolated-decl/esbuild";
import { defu } from "defu";

import type { BuildContext, BuildConfig, BuildEntry } from "./types";
import { buildStub } from "./stub";
import { normalizeEntries, collectOutDirs, expandGlobs } from "./utils";

const DEFAULT_BUILD_OPTIONS: Partial<BunBuildConfig> = {
  target: "bun",
  format: "esm",
  naming: {
    entry: "[name].mjs",
    chunk: "_chunks/[name]-[hash].mjs",
  },
  splitting: true,
  metafile: true,
};

/**
 * Main build function
 */
export async function build(config: BuildConfig): Promise<void> {
  const start = Date.now();

  const pkgDir = resolve(config.cwd ? String(config.cwd) : process.cwd());
  const pkg = await readPackageJSON(pkgDir);
  const ctx: BuildContext = { pkgDir, pkg };

  consola.start(`Building \`${pkg.name || "<no name>"}\``);

  await config.hooks?.start?.(ctx);

  const entries = await normalizeEntries(config.entries || [], pkgDir);
  const outDirs = await collectOutDirs(entries);

  // Clean output directories
  for (const outDir of outDirs) {
    consola.info(`Cleaning up \`${outDir}\``);
    await rm(outDir, { recursive: true, force: true });
  }

  // Build each entry
  for (const entry of entries) {
    if (entry.stub) {
      await buildStub(ctx, entry);
    } else {
      await buildBundle(ctx, entry);
    }
  }

  await config.hooks?.end?.(ctx);

  consola.success(`Build complete in ${Date.now() - start}ms`);
  consola.success(`built finished in ${Date.now() - start}ms`);
}

/**
 * Build using Bun.build
 */
export async function buildBundle(ctx: BuildContext, entry: BuildEntry): Promise<void> {
  const entrypoints = await expandGlobs(entry.entrypoints, ctx.pkgDir);
  const outdir = entry.outdir || resolve(ctx.pkgDir, "dist");

  // Build external dependencies list
  // Note: Bun automatically handles Node.js builtin modules as external
  const external = [
    ...Object.keys(ctx.pkg.dependencies || {}),
    ...Object.keys(ctx.pkg.peerDependencies || {}),
  ];

  // Determine if dts generation is enabled (default: true)
  const dtsEnabled = entry.dts !== false;

  // Create Bun build config
  const bunConfig: BunBuildConfig = defu(
    {
      root: ctx.pkgDir,
      entrypoints,
      outdir,
      external,
      ...(dtsEnabled
        ? {
            plugins: [UnpluginIsolatedDecl()],
          }
        : {}),
    },
    DEFAULT_BUILD_OPTIONS,
  );

  // Apply additional user config (excluding entrypoints, stub, dts)
  const {
    entrypoints: _,
    stub: __,
    dts: ___,
    ...userConfig
  } = entry as unknown as BunBuildConfig & { stub?: boolean; dts?: boolean };
  Object.assign(bunConfig, userConfig);

  const result = await Bun.build(bunConfig);

  if (!result.success) {
    for (const log of result.logs) {
      if (log.level === "error") {
        consola.error(log.message);
      }
    }
    throw new Error("Build failed");
  }

  // Display build results
  if (result.metafile) {
    for (const [filePath, meta] of Object.entries(result.metafile.outputs)) {
      if (!meta.entryPoint) continue;
      if (filePath.endsWith(".map")) continue;

      const fileName = filePath.split("/").pop()!;
      const displayPath = relative(process.cwd(), resolve(outdir, fileName)).replace(/\\/g, "/");
      consola.info(`${displayPath} (${prettyBytes(meta.bytes)})`);
    }
  }
}
