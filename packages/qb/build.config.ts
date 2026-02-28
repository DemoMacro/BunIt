import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/sql.ts"],
      minify: true,
    },
    {
      type: "transform",
      input: "src/dialects/",
      outDir: "dist/dialects",
    },
  ],
});
