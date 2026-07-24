#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * JSR won't publish a raw .css file as an export map entry (deno_graph can't
 * type-check it as a module), so the stylesheet is authored in keyboard.css
 * and re-exported as a string constant for actual publishing. Run this after
 * editing keyboard.css, before `deno publish`.
 *
 * Pass --check to verify keyboard-css.ts is up to date without writing to it
 * (used by `deno task check` so a stale generated file fails instead of
 * silently publishing outdated CSS).
 */
const packageDir = new URL("..", import.meta.url);
const cssPath = new URL("keyboard.css", packageDir);
const outPath = new URL("keyboard-css.ts", packageDir);

const css = await Deno.readTextFile(cssPath);
const escaped = css.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll(
  "${",
  "\\${",
);

const banner =
  "// Generated from keyboard.css by scripts/generate-css-module.ts — do not edit directly.\n";
const contents =
  `${banner}export const keyboardCss: string = \`\n${escaped}\`;\n`;

if (Deno.args.includes("--check")) {
  const existing = await Deno.readTextFile(outPath).catch(() => null);
  if (existing !== contents) {
    console.error(
      `${outPath} is out of date with keyboard.css — run: deno run --allow-read --allow-write packages/keyboard/scripts/generate-css-module.ts`,
    );
    Deno.exit(1);
  }
  console.log(`${outPath} is up to date`);
} else {
  await Deno.writeTextFile(outPath, contents);
  console.log(`Wrote ${outPath}`);
}
