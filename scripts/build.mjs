import { copyFile, mkdir } from "node:fs/promises";
import * as esbuild from "esbuild";

await mkdir("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  sourcemap: true,
});

await copyFile("node_modules/sql.js/dist/sql-wasm.wasm", "dist/sql-wasm.wasm");
