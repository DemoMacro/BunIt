# @bunit/build

> ⚡️ Zero-config TypeScript package builder powered by [**Bun**](https://bun.sh).

## Features

- 🚀 **Blazing Fast** - Built on Bun's native bundler and transpiler
- 📦 **Dual Mode** - Bundle mode for entry points, Transform mode for directories
- 🎯 **Zero-Config** - Smart defaults with flexible customization
- 📝 **Type Generation** - Automatic `.d.ts` declarations with unplugin-isolated-decl
- 🛠️ **CLI Tool** - Simple command-line interface
- 🚀 **Stub Mode** - Development mode for faster builds

## Installation

```bash
bun add @bunit/build
```

## Usage

### CLI

```bash
# Build using build.config.ts
built

# Stub mode (development)
built --stub

# Bundle mode
built ./src/index.ts

# Transform mode (directory)
built ./src/lib/:./dist/lib

# Specify working directory
built --dir ./packages/my-lib
```

### Programmatic

```typescript
import { build } from "@bunit/build";

await build({
  entries: ["./src/index.ts"],
});
```

## Config

Create `build.config.ts` (or `.mjs`):

```typescript
import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/cli.ts"],
      // outDir: "./dist",
      // minify: false,
      // stub: false,
      // bun: {}, // https://bun.sh/docs/bundler
      // dts: true,
    },
    {
      type: "transform",
      input: "./src/lib",
      outDir: "./dist/lib",
      // stub: false,
      // transpiler: {},
      // filter: (file) => !file.includes('.test.ts'),
      // dts: true,
    },
  ],
  hooks: {
    // start: (ctx) => {},
    // end: (ctx) => {},
    // entries: (entries, ctx) => {},
    // bunConfig: (config, ctx) => {},
    // bunOutput: (config, ctx) => {},
  },
});
```

## Stub Mode

When working on a package locally, rebuilding can be tedious. Use `stub: true` or the `--stub` CLI flag to skip the actual build and link expected dist paths to source files.

- **Bundle entries**: `.mjs` and `.d.mts` files re-export the source file
- **Transform entries**: `.mjs` files re-export from source TypeScript files

**Caveats:**

- You need a runtime that natively supports TypeScript (Bun, Deno)
- When using stub mode with transform mode, ensure your bundler can resolve `.ts` or `.mjs` extensions
- For bundle mode, if you add/remove exports, run the stub build again

## Build Modes

### Bundle Mode

Ideal for library entry points with dependency analysis and code splitting.

```typescript
{
  type: "bundle",
  input: "./src/index.ts",
  minify: true,
  bun: {
    sourcemap: "external",
    // ... any Bun.build option
  },
}
```

### Transform Mode

Preserves file structure for transforming directories.

```typescript
{
  type: "transform",
  input: "./src/lib",
  outDir: "./dist/lib",
  filter: (file) => !file.includes('.test.ts'),
  stub: false,
}
```

## License

[MIT](../../LICENSE) &copy; [Demo Macro](https://www.demomacro.com/)
