import { defineBuildConfig } from "@bunit/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/server.ts"],
      minify: true,
    },
    {
      type: "transform",
      input: "src/drivers/",
      outDir: "dist/drivers",
    },
  ],
});
