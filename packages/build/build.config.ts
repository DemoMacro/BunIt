import { defineBuildConfig } from "./src/config";

export default defineBuildConfig({
  entries: [
    {
      entrypoints: ["./src/index.ts", "./src/config.ts", "./src/cli.ts"],
      outdir: "dist",
      naming: {
        entry: "[name].mjs",
        chunk: "_chunks/[name]-[hash].mjs",
      },
    },
  ],
});
