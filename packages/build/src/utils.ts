import { resolve } from "node:path";

export function detectExports(sourceText: string) {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  const scanResult = transpiler.scan(sourceText);
  return {
    hasDefault: scanResult.exports.includes("default"),
    exports: scanResult.exports,
  };
}

export function fmtPath(path: string, cwd?: string): string {
  const resolved = resolve(path);
  const base = cwd || process.cwd();
  // Normalize path separators for display
  const normalized = resolved.replace(/\\/g, "/");
  const normalizedBase = base.replace(/\\/g, "/");
  return normalized.replace(normalizedBase, ".");
}

export function analyzeDir(dir: string | string[]): {
  size: number;
  files: number;
} {
  if (Array.isArray(dir)) {
    let totalSize = 0;
    let totalFiles = 0;
    for (const d of dir) {
      const { size, files } = analyzeDir(d);
      totalSize += size;
      totalFiles += files;
    }
    return { size: totalSize, files: totalFiles };
  }

  let totalSize = 0;
  let fileCount = 0;

  // Use Bun's built-in glob for better performance
  const files = Array.from(new Bun.Glob("**/*").scanSync({ cwd: dir, absolute: true }));

  for (const file of files) {
    const fileStats = Bun.file(file);
    if (fileStats.size > 0) {
      totalSize += fileStats.size;
      fileCount++;
    }
  }

  return { size: totalSize, files: fileCount };
}
