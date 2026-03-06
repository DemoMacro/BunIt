#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { build } from "./build";
import { loadConfig } from "c12";
import { defu } from "defu";

import type { BuildConfig, BuildEntry } from "./types";

const main = defineCommand({
  meta: {
    name: "built",
    version: "0.0.0",
    description: "Build your project with Bun",
  },
  args: {
    _: {
      type: "string",
      description: "Entrypoint files",
      rest: true,
    },
    cwd: {
      type: "string",
      description: "Project root directory",
      default: ".",
    },
    stub: {
      type: "boolean",
      description: "Generate stub builds (re-export source files)",
    },
    config: {
      type: "string",
      description: "Path to config file",
    },
    "no-config": {
      type: "boolean",
      description: "Disable config file loading",
    },
    // Bun.build compatible options
    target: {
      type: "string",
      description: "Target environment: browser, bun, or node",
    },
    outdir: {
      type: "string",
      description: "Output directory for multiple entrypoints",
    },
    format: {
      type: "string",
      description: "Module format: esm, cjs, or iife",
    },
    external: {
      type: "string",
      description: "External dependencies (comma-separated, supports wildcards)",
    },
    packages: {
      type: "string",
      description: "How to handle dependencies: external or bundle",
    },
    minify: {
      type: "boolean",
      description: "Enable all minification",
    },
    "minify-whitespace": {
      type: "boolean",
      description: "Minify whitespace",
    },
    "minify-identifiers": {
      type: "boolean",
      description: "Minify identifiers",
    },
    "minify-syntax": {
      type: "boolean",
      description: "Minify syntax",
    },
    splitting: {
      type: "boolean",
      description: "Enable code splitting",
    },
    sourcemap: {
      type: "string",
      description: "Generate sourcemaps: none, linked, inline, or external",
    },
    metafile: {
      type: "boolean",
      description: "Generate build metadata JSON file",
    },
    root: {
      type: "string",
      description: "Root directory for resolving entrypoints",
    },
    "public-path": {
      type: "string",
      description: "Public path for import paths",
    },
    "entry-naming": {
      type: "string",
      description: "Entry point filename pattern",
    },
    "chunk-naming": {
      type: "string",
      description: "Chunk filename pattern",
    },
    "asset-naming": {
      type: "string",
      description: "Asset filename pattern",
    },
    compile: {
      type: "string",
      description: "Create a standalone executable (e.g., bun-linux-x64, browser)",
    },
    dts: {
      type: "boolean",
      description: "Generate TypeScript declarations",
    },
    watch: {
      type: "boolean",
      description: "Watch mode for rebuild on file changes",
    },
  },
  async run({ args }) {
    // Load config file
    let config: BuildConfig | undefined;
    if (!args["no-config"]) {
      const result = await loadConfig<BuildConfig>({
        name: "build",
        configFile: args.config || "build.config",
        cwd: args.cwd,
      });
      config = result.config;
    }

    // Prepare entries from CLI args or config
    let rawEntries: (string | BuildEntry)[] = [];
    if (args._.length > 0) {
      rawEntries = args._.map((entry) => {
        if (typeof entry === "string") {
          return { entrypoints: entry };
        }
        return entry;
      });
    } else {
      rawEntries = config?.entries || [];
    }

    // Build CLI options
    const cliOptions: Partial<BuildEntry> = {};
    if (args.target) cliOptions.target = args.target as BuildEntry["target"];
    if (args.outdir) cliOptions.outdir = args.outdir;
    if (args.format) cliOptions.format = args.format as BuildEntry["format"];
    if (args.external) cliOptions.external = args.external.split(",");
    if (args.packages) cliOptions.packages = args.packages as "external" | "bundle";
    if (args.minify) cliOptions.minify = args.minify;
    if (args["minify-whitespace"]) cliOptions.minify = { whitespace: true };
    if (args["minify-identifiers"]) cliOptions.minify = { identifiers: true };
    if (args["minify-syntax"]) cliOptions.minify = { syntax: true };
    if (args.splitting !== undefined) cliOptions.splitting = args.splitting;
    if (args.sourcemap) cliOptions.sourcemap = args.sourcemap as BuildEntry["sourcemap"];
    if (args.metafile) cliOptions.metafile = true;
    if (args.root) cliOptions.root = args.root;
    if (args["public-path"]) cliOptions.publicPath = args["public-path"];
    if (args["entry-naming"] || args["chunk-naming"] || args["asset-naming"]) {
      cliOptions.naming = {};
      if (args["entry-naming"]) cliOptions.naming.entry = args["entry-naming"];
      if (args["chunk-naming"]) cliOptions.naming.chunk = args["chunk-naming"];
      if (args["asset-naming"]) cliOptions.naming.asset = args["asset-naming"];
    }
    if (args.compile) cliOptions.compile = args.compile as BuildEntry["compile"];
    if (args.dts !== undefined) cliOptions.dts = args.dts;

    // Merge entries with CLI options
    const entries: BuildEntry[] = rawEntries.map((entry) => {
      const base = typeof entry === "string" ? { entrypoints: entry } : entry;
      const result = defu(base, cliOptions) as BuildEntry;
      if (args.stub) result.stub = true;
      return result;
    });

    if (entries.length === 0) {
      consola.error("No entry files specified. Provide entrypoints via CLI args or config file.");
      process.exit(1);
    }

    // Run build
    await build({
      cwd: args.cwd,
      ...config,
      entries,
    });
  },
});

void runMain(main);
