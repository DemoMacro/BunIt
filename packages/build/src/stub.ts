import type { BuildContext, BuildEntry } from "./types";

import { chmod } from "node:fs/promises";
import { dirname, relative, join } from "pathe";
import { consola } from "consola";
import { colors as c } from "consola/utils";

import { getDistName, detectExports, ensureDir, expandGlobs } from "./utils";

/**
 * Extract shebang line from source code
 */
export function getShebang(code: string): string {
  const match = code.match(/^#![^\n]*/);
  return match ? match[0] : "";
}

/**
 * Make file executable
 */
export async function makeExecutable(filePath: string): Promise<void> {
  await chmod(filePath, 0o755);
}

/**
 * Build stub files that re-export from source
 */
export async function buildStub(ctx: BuildContext, entry: BuildEntry): Promise<void> {
  const entrypoints = await expandGlobs(entry.entrypoints, ctx.pkgDir);
  const outdir = entry.outdir || join(ctx.pkgDir, "dist");

  for (const srcPath of entrypoints) {
    // Get the base filename without extension
    const fileName = srcPath
      .split(/[/\\]/)
      .pop()!
      .replace(/\.(ts|tsx|js|jsx)$/, "");

    // For custom outdir, use just the filename
    // For default outdir, use the full relative path structure
    const customOutdir = entry.outdir !== undefined;
    const distName = customOutdir ? fileName : getDistName(srcPath, ctx.pkgDir);

    const distPath = join(outdir, `${distName}.mjs`);
    const distDir = dirname(distPath);

    await ensureDir(distDir);

    const sourceCode = await Bun.file(srcPath).text();
    const { hasDefault } = detectExports(sourceCode);

    // Extract and preserve shebang
    const shebang = getShebang(sourceCode);

    const relativeSrcPath = relative(distDir, srcPath).replace(/\\/g, "/");

    const stubCode = `${shebang}${shebang ? "\n" : ""}export * from "${relativeSrcPath}";\n${
      hasDefault ? `export { default } from "${relativeSrcPath}";\n` : ""
    }`;

    await Bun.write(distPath, stubCode);

    // Make executable if has shebang
    if (shebang) {
      await makeExecutable(distPath);
    }

    // Generate stub .d.ts files
    const dtsPath = distPath.replace(/\.mjs$/, ".d.mts");
    const dtsCode = `export * from "${relativeSrcPath}";\n${
      hasDefault ? `export { default } from "${relativeSrcPath}";\n` : ""
    }`;
    await Bun.write(dtsPath, dtsCode);

    consola.info(`${c.magenta("[stub]")} ${relative(process.cwd(), distPath).replace(/\\/g, "/")}`);
  }
}
