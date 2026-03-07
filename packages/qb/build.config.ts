import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      entrypoints: ["./src/index.ts", "./src/sql.ts"],
      minify: true,
    },
    {
      entrypoints: "./src/dialects/*.ts",
      outdir: "dist/dialects",
      minify: true,
    },
  ],
});
