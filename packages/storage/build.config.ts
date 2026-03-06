import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      entrypoints: ["./src/index.ts", "./src/server.ts"],
      minify: true,
    },
    {
      entrypoints: "./src/drivers/*.ts",
      outdir: "dist/drivers",
    },
  ],
});
