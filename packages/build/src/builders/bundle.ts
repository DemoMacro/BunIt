import { builtinModules } from "node:module";
import { mkdir, chmod } from "node:fs/promises";
import { dirname, relative, join, basename, extname, resolve } from "node:path";
import { fmtPath } from "../utils";
import UnpluginIsolatedDecl from "unplugin-isolated-decl/esbuild";
import prettyBytes from "pretty-bytes";

import type { BuildContext, BuildHooks, BundleEntry } from "../types";

export async function bunBuild(
  ctx: BuildContext,
  entry: BundleEntry,
  hooks: BuildHooks,
): Promise<void> {
  const inputs = normalizeBundleInputs(entry.input, ctx);

  if (entry.stub) {
    for (const [distName, srcPath] of Object.entries(inputs)) {
      const distPath = join(ctx.pkgDir, "dist", `${distName}.mjs`);
      await mkdir(dirname(distPath), { recursive: true });
      console.log(`[bundle] ${fmtPath(distPath)} (stub)`);
      const srcContents = await Bun.file(srcPath).text();

      // Use Bun.Transpiler.scan to accurately detect exports
      const transpiler = new Bun.Transpiler({ loader: "ts" });
      const scanResult = transpiler.scan(srcContents);
      const hasDefaultExport = scanResult.exports.includes("default");

      const firstLine = srcContents.split("\n")[0];
      const hasShebangLine = firstLine.startsWith("#!");
      let relativeSrcPath = relative(dirname(distPath), srcPath);
      // Normalize path separators to forward slashes for cross-platform compatibility
      relativeSrcPath = relativeSrcPath.replace(/\\/g, "/");

      await Bun.write(
        distPath,
        `${hasShebangLine ? firstLine + "\n" : ""}export * from "${relativeSrcPath}";\n${hasDefaultExport ? `export { default } from "${relativeSrcPath}";\n` : ""}`,
      );

      if (hasShebangLine) {
        await chmod(distPath, 0o755);
      }

      await Bun.write(
        distPath.replace(/\.mjs$/, ".d.mts"),
        `export * from "${relativeSrcPath}";\n${hasDefaultExport ? `export { default } from "${relativeSrcPath}";\n` : ""}`,
      );
    }
    return;
  }

  const external = [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
    ...[
      ...Object.keys(ctx.pkg.dependencies || {}),
      ...Object.keys(ctx.pkg.peerDependencies || {}),
    ].flatMap((p) => [p]),
  ];

  const bunConfig = {
    root: ctx.pkgDir,
    entrypoints: Object.values(inputs),
    outdir: resolve(ctx.pkgDir, entry.outDir || "dist"),
    target: "bun" as const,
    format: "esm" as const,
    external: external,
    minify: entry.minify ?? false,
    naming: {
      entry: "[name].mjs",
      chunk: "_chunks/[name]-[hash].mjs",
    },
    splitting: true,
    metafile: true,
    plugins: entry.dts !== false ? [UnpluginIsolatedDecl()] : [],
    ...entry.bun,
  };

  await hooks.bunConfig?.(bunConfig, ctx);

  const result = await Bun.build(bunConfig);

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      if (log.level === "error") {
        console.error(`  ${log.message}`);
      }
    }
    throw new Error("Build failed");
  }

  await hooks.bunOutput?.(bunConfig, ctx);

  const outputEntries = [];

  // Use metafile for faster analysis without reading file contents
  for (const [path, meta] of Object.entries(result.metafile!.outputs)) {
    if (!meta.entryPoint) continue; // Skip non-entry points (chunks, sourcemaps)
    if (path.endsWith(".ts")) continue;

    const fileName = path.replace(`${bunConfig.outdir}${require("node:path").sep}`, "");

    // Extract exports from metafile (array of strings)
    const exports = meta.exports || [];

    // Extract dependencies from imports (external packages only)
    const deps = (meta.imports || [])
      .filter((imp) => !imp.path.startsWith("."))
      .map((imp) => imp.path)
      .sort();

    outputEntries.push({
      name: fileName,
      exports,
      deps,
      size: meta.bytes,
      minSize: meta.bytes, // Already minified if minify was enabled
      minGzipSize: meta.bytes, // Will calculate if needed
      sideEffectSize: meta.bytes,
    });
  }

  console.log(
    `\n${outputEntries
      .map(
        (o) =>
          `[bundle] ${fmtPath(join(bunConfig.outdir, o.name), ctx.pkgDir)}\n` +
          `Size: ${prettyBytes(o.size)}, ${prettyBytes(o.minSize)} minified, ${prettyBytes(o.minGzipSize)} min+gzipped (Side effects: ${prettyBytes(o.sideEffectSize)})\n` +
          `${o.exports.some((e) => e !== "default") ? `Exports: ${o.exports.join(", ")}\n` : ""}` +
          `${o.deps.length > 0 ? `Dependencies: ${o.deps.join(", ")}` : ""}`,
      )
      .join("\n\n")}`,
  );
}

export function normalizeBundleInputs(
  input: string | string[],
  ctx: BuildContext,
): Record<string, string> {
  const inputs: Record<string, string> = {};

  for (let src of Array.isArray(input) ? input : [input]) {
    if (!src.startsWith("/")) {
      src = resolve(ctx.pkgDir, src);
    }

    let relativeSrc = relative(join(ctx.pkgDir, "src"), src);
    if (relativeSrc.startsWith("..")) {
      relativeSrc = relative(join(ctx.pkgDir), src);
    }
    if (relativeSrc.startsWith("..")) {
      throw new Error(`Source should be within the package directory (${ctx.pkgDir}): ${src}`);
    }

    const distName = join(dirname(relativeSrc), basename(relativeSrc, extname(relativeSrc)));
    if (inputs[distName]) {
      throw new Error(
        `Rename one of the entries to avoid a conflict in the dist name "${distName}":\n - ${src}\n - ${inputs[distName]}`,
      );
    }
    inputs[distName] = src;
  }

  return inputs;
}
