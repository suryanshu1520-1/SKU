/**
 * Regression guard: the Vercel function (api/server.ts) must still link after @vercel/node builds it.
 *
 * @vercel/node compiles each traced .ts file on its own and ships it renamed to .js. A relative import
 * therefore only survives if the *emitted* specifier names a file that exists in that renamed tree:
 *   - "./x.ts" needs rewriteRelativeImportExtensions (otherwise it points at a file that no longer exists)
 *   - "./x"    (no extension) is invalid in Node ESM
 * Either one throws ERR_MODULE_NOT_FOUND at load time, which takes down every route in the function.
 *
 * This walks the import graph from api/server.ts with the same compiler options the builder derives from
 * api/tsconfig.json and fails on any emitted relative specifier that cannot resolve.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const ENTRY = path.join(ROOT, "api", "server.ts");

function apiCompilerOptions(): ts.CompilerOptions {
  const file = path.join(ROOT, "api", "tsconfig.json");
  const raw = ts.readConfigFile(file, ts.sys.readFile);
  assert.ok(!raw.error, "api/tsconfig.json must parse");
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(file), undefined, file);
  // Force ESM emit: transpileModule cannot see package.json "type", the builder's language service can.
  return { ...parsed.options, module: ts.ModuleKind.ESNext, noEmit: false, outDir: undefined };
}

const SOURCE_FOR_EMITTED: Array<[RegExp, string[]]> = [
  [/\.js$/, [".js", ".ts", ".tsx"]],
  [/\.mjs$/, [".mjs", ".mts"]],
  [/\.cjs$/, [".cjs", ".cts"]],
];

/** Absolute source file that ends up at `emittedPath` in the built tree, or null if nothing does. */
function sourceForEmitted(emittedPath: string): string | null {
  if (emittedPath.endsWith(".json")) return fs.existsSync(emittedPath) ? emittedPath : null;
  for (const [re, exts] of SOURCE_FOR_EMITTED) {
    if (!re.test(emittedPath)) continue;
    const stem = emittedPath.replace(re, "");
    for (const ext of exts) if (fs.existsSync(stem + ext)) return stem + ext;
  }
  return null;
}

function relativeSpecifiers(js: string): string[] {
  const out: string[] = [];
  const patterns = [/\bfrom\s*["']([^"']+)["']/g, /\bimport\s*["']([^"']+)["']/g, /\bimport\(\s*["']([^"']+)["']\s*\)/g];
  for (const re of patterns) {
    for (const m of js.matchAll(re)) if (m[1].startsWith("./") || m[1].startsWith("../")) out.push(m[1]);
  }
  return out;
}

test("api/server.ts: every emitted relative import resolves in the built function", () => {
  const options = apiCompilerOptions();
  const failures: string[] = [];
  const seen = new Set<string>();
  const queue = [ENTRY];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const text = fs.readFileSync(file, "utf8");
    const emitted = /\.(?:m|c)?tsx?$/.test(file)
      ? ts.transpileModule(text, { fileName: file, compilerOptions: options }).outputText
      : text;

    for (const spec of relativeSpecifiers(emitted)) {
      const target = sourceForEmitted(path.resolve(path.dirname(file), spec));
      if (!target) {
        failures.push(`${path.relative(ROOT, file).replace(/\\/g, "/")} -> ${spec}`);
      } else if (!target.endsWith(".json")) {
        queue.push(target);
      }
    }
  }

  assert.ok(seen.size > 20, `expected to walk the real graph, only reached ${seen.size} files`);
  assert.deepEqual(failures, [], `unresolvable imports after the Vercel build:\n  ${failures.join("\n  ")}`);
});
