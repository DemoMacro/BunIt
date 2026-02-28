import type { BuildContext, TransformEntry } from "../types";

import { mkdir, symlink, chmod } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { Glob } from "bun";
import ts from "typescript";
import { fmtPath, detectExports } from "../utils";

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
              const code = await transformModule(entryPath, entryDistPath, entry);
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
                await symlink(entryPath, entryDistPath, "junction").catch((err) => {
                  if (err.code !== "EEXIST") throw err;
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

  // Generate type declarations for .ts files if dts is enabled
  if (entry.dts !== false) {
    await generateDeclarations(ctx, entry);
  }

  console.log(
    `\n[transform] ${fmtPath(entry.outDir! + "/")}${entry.stub ? " (stub)" : ""}\n${itemsTable(writtenFiles.map((f) => fmtPath(f)))}`,
  );
}

export function itemsTable(
  items: string[],
  consoleWidth: number = process.stdout.columns || 80,
): string {
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
export async function transformModule(
  entryPath: string,
  entryDistPath: string,
  entry: TransformEntry,
): Promise<string> {
  const sourceText = await Bun.file(entryPath).text();

  // Stub mode: re-export from source
  if (entry.stub) {
    const { hasDefault: hasDefaultExport } = detectExports(sourceText);

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

/**
 * Generate type declarations using TypeScript Compiler API.
 */
export async function generateDeclarations(
  ctx: BuildContext,
  entry: TransformEntry,
): Promise<void> {
  // Find all .ts source files
  const tsFiles: string[] = [];
  const glob = new Glob("**/*.ts");
  for await (const file of glob.scan(entry.input)) {
    const tsFile = join(entry.input, file);
    tsFiles.push(tsFile);
  }

  if (tsFiles.length === 0) {
    return;
  }

  // Create TypeScript compiler options
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    rootDir: entry.input,
    outDir: entry.outDir,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    declarationMap: false,
  };

  // Resolve entry.input to absolute path for filtering
  let inputDir = entry.input;
  const isAbsolute = inputDir.startsWith("/") || /^[a-zA-Z]:/.test(inputDir);
  if (!isAbsolute) {
    inputDir = join(ctx.pkgDir, entry.input);
  }

  // Normalize inputDir for consistent comparison
  const normalizedInputDir = inputDir.replace(/\\/g, "/");

  // Create compiler host with filtered writeFile
  const host = ts.createCompilerHost(compilerOptions);
  const originalWriteFile = host.writeFile;
  host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles) => {
    const sourceFile = sourceFiles?.[0];
    if (!sourceFile) return;

    // Only emit declarations for files within entry.input directory
    const normalizedFileName = sourceFile.fileName.replace(/\\/g, "/");
    if (normalizedFileName.startsWith(normalizedInputDir)) {
      originalWriteFile(fileName, content, writeByteOrderMark, onError, sourceFiles);
    }
  };

  const program = ts.createProgram(tsFiles, compilerOptions, host);
  const emitResult = program.emit();

  // Report errors
  const diagnostics = emitResult.diagnostics;
  if (diagnostics.length > 0) {
    const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
      console.warn(`[transform] Type declaration generation had ${errors.length} error(s):`);
      for (const error of errors) {
        const message = ts.flattenDiagnosticMessageText(error.messageText, "\n");
        if (error.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(
            error.file,
            error.start || 0,
          );
          console.warn(`  ${error.file.fileName}:${line + 1}:${character + 1}: ${message}`);
        } else {
          console.warn(`  ${message}`);
        }
      }
    }
  }
}
