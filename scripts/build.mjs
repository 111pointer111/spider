import esbuild from "esbuild";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const prod = process.argv.includes("--production") || !process.argv.includes("--watch");
const watch = process.argv.includes("--watch");

const banner =
  "/* Branch Chat Map. Bundled for Obsidian. */";

async function combineStyles() {
  const chunks = [];

  if (existsSync("main.css")) {
    chunks.push(await readFile("main.css", "utf8"));
  }

  if (existsSync("src/styles.css")) {
    chunks.push(await readFile("src/styles.css", "utf8"));
  }

  if (chunks.length > 0) {
    await writeFile("styles.css", chunks.join("\n"), "utf8");
  } else if (existsSync("styles.css")) {
    await copyFile("styles.css", "styles.css");
  }
}

const buildOptions = {
  banner: {
    js: banner,
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
};

if (watch) {
  const context = await esbuild.context({
    ...buildOptions,
    plugins: [
      {
        name: "combine-styles",
        setup(build) {
          build.onEnd(async () => {
            await combineStyles();
          });
        },
      },
    ],
  });

  await context.watch();
  await combineStyles();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  await combineStyles();
}
