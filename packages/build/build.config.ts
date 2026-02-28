import { defineBuildConfig } from "./src/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["./src/index.ts", "./src/config.ts", "./src/cli.ts"],
      minify: true,
    },
  ],
});
