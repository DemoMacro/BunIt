import type { BuildConfig as BunBuildOptions, TranspilerOptions } from "bun";

export interface BuildContext {
  pkgDir: string;
  pkg: { name: string } & Record<string, unknown>;
}

export type _BuildEntry = {
  /**
   * Output directory relative to project root.
   *
   * Defaults to `dist/` if not provided.
   */
  outDir?: string;

  /**
   * Avoid actual build but instead link to the source files.
   */
  stub?: boolean;
};

export type BundleEntry = _BuildEntry & {
  type: "bundle";

  /**
   * Entry point(s) to bundle relative to the project root.
   * */
  input: string | string[];

  /**
   * Minify the output using Bun.
   *
   * Defaults to `false` if not provided.
   */
  minify?: boolean | { whitespace?: boolean; syntax?: boolean; identifiers?: boolean };

  /**
   * Options passed to Bun.build.
   *
   * See [Bun.build options](https://bun.sh/docs/bundler) for more details.
   */
  bun?: Partial<BunBuildOptions>;

  /**
   * Declaration generation options.
   *
   * Set to `false` to disable.
   */
  dts?: boolean;
};

export type TransformEntry = _BuildEntry & {
  type: "transform";

  /**
   * Directory to transform relative to the project root.
   */
  input: string;

  /**
   * Options passed to Bun.Transpiler.
   */
  transpiler?: Partial<TranspilerOptions>;

  /**
   * A filter function to exclude files from being transformed.
   */
  filter?: (filePath: string) => boolean | Promise<boolean>;

  /**
   * If sets to `false`, or if the function returns `false`, declaration files won't be emitted for the module.
   */
  dts?: boolean | ((filePath: string) => boolean | Promise<boolean>);
};

export type BuildEntry = BundleEntry | TransformEntry;

export interface BuildHooks {
  start?: (ctx: BuildContext) => void | Promise<void>;
  end?: (ctx: BuildContext) => void | Promise<void>;
  entries?: (entries: BuildEntry[], ctx: BuildContext) => void | Promise<void>;
  bunConfig?: (cfg: BunBuildOptions, ctx: BuildContext) => void | Promise<void>;
  bunOutput?: (cfg: BunBuildOptions, ctx: BuildContext) => void | Promise<void>;
}

export interface BuildConfig {
  cwd?: string | URL;
  entries?: (BuildEntry | string)[];
  hooks?: BuildHooks;
}
