import type { BuildConfig as BunBuildConfig } from "bun";
import type { PackageJson } from "pkg-types";

export interface BuildContext {
  pkgDir: string;
  pkg: PackageJson;
}

/**
 * Build entry configuration extending Bun's BuildConfig
 * with the addition of stub mode support.
 */
export interface BuildEntry extends Omit<BunBuildConfig, "entrypoints"> {
  /**
   * Entry point(s) to build. Supports glob patterns.
   */
  entrypoints: string | string[];

  /**
   * Generate stub files that re-export from source instead of actual building.
   */
  stub?: boolean;

  /**
   * Generate type declarations using unplugin-isolated-decl.
   * @default true
   */
  dts?: boolean;
}

export interface BuildConfig {
  cwd?: string | URL;
  entries: (BuildEntry | string)[];
  hooks?: {
    start?: (ctx: BuildContext) => void | Promise<void>;
    end?: (ctx: BuildContext) => void | Promise<void>;
  };
}
