#!/usr/bin/env bun

import { defineCommand, runMain } from "citty";
import { build } from "./build";
import { loadConfig } from "c12";

import type { BuildConfig, BuildEntry } from "./types";

const main = defineCommand({
  meta: {
    name: "build",
    version: "0.0.0",
    description: "Build your project with Bun",
  },
  args: {
    dir: {
      type: "string",
      description: "Project root directory",
      default: ".",
    },
    stub: {
      type: "boolean",
      description: "Generate stub builds (re-export source files)",
      default: false,
    },
    entries: {
      type: "positional",
      description: "Build entries (e.g., src/index.ts or src/)",
      required: false,
    },
  },
  async run({ args }) {
    const { config = {} } = await loadConfig<BuildConfig>({
      name: "build",
      configFile: "build.config",
      cwd: args.dir,
    });

    const rawEntries = args.entries
      ? Array.isArray(args.entries)
        ? args.entries
        : [args.entries]
      : config.entries || [];

    const entries: BuildEntry[] = rawEntries.map((entry) => {
      if (typeof entry === "string") {
        const [input, outDir] = entry.split(":") as [string, string | undefined];
        return input.endsWith("/")
          ? { type: "transform", input, outDir }
          : { type: "bundle", input: input.split(","), outDir };
      }
      return entry;
    });

    if (args.stub) {
      for (const entry of entries) {
        entry.stub = true;
      }
    }

    if (rawEntries.length === 0) {
      console.error("No build entries specified.");
      process.exit(1);
    }

    await build({
      cwd: args.dir,
      ...config,
      entries,
    });
  },
});

void runMain(main);
