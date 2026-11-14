// A deliberately small proof of concept for the pinned Void runtime. No application
// files are changed. Writes replace files atomically so pnpm store links stay untouched.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const action = process.argv[2];
if (!["apply", "revert"].includes(action))
  throw new Error("Use: vp run patch:apply or vp run patch:revert");
const backupDir = fileURLToPath(new URL("../.repro-patch/", import.meta.url));
const client = fileURLToPath(import.meta.resolve("void/pages-client"));
const root = dirname(dirname(dirname(client)));
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
if (version !== "1.9.1")
  throw new Error(`This proof of concept only supports Void 1.9.1, found ${version}`);
const prefetchEntry = fileURLToPath(import.meta.resolve("void/pages-prefetch"));
const importPath = readFileSync(prefetchEntry, "utf8").match(/from "([^"]+)"/)?.[1];
if (!importPath) throw new Error("Cannot locate the pinned prefetch runtime");
const cache = fileURLToPath(new URL(importPath, pathToFileURL(prefetchEntry)));
const hash = (text) => createHash("sha256").update(text).digest("hex");
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2)
    throw new Error(`Patch pattern must match exactly once: ${before}`);
  return source.replace(before, after);
}
function atomicWrite(file, text) {
  const temporary = `${file}.void-repro-tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, file);
}
const manifestFile = join(backupDir, "manifest.json");
if (action === "apply") {
  if (existsSync(manifestFile))
    throw new Error("Prototype is already applied. Revert it before applying again.");
  const cacheOriginal = readFileSync(cache, "utf8");
  const clientOriginal = readFileSync(client, "utf8");
  let cachePatched = replaceOnce(
    cacheOriginal,
    "\t\t\tresponse,\n",
    "\t\t\tresponse,\n\t\t\tfulfilled: false,\n",
  );
  cachePatched = replaceOnce(
    cachePatched,
    "\t\tthis.entries.set(k, entry);",
    "\t\tthis.entries.set(k, entry);\n\t\tvoid response.then(() => { entry.fulfilled = true; }, () => {});",
  );
  const clientPatched = replaceOnce(
    clientOriginal,
    '\t\tconst cacheEntry = method === "GET" ? _prefetchCache.get(fetchUrl, method) : null;',
    '\t\tconst candidate = method === "GET" ? _prefetchCache.get(fetchUrl, method) : null;\n\t\tconst cacheEntry = candidate?.fulfilled ? candidate : null;',
  );
  mkdirSync(backupDir, { recursive: true });
  const records = [
    { file: cache, original: cacheOriginal, patched: cachePatched, backup: "cache.original.mjs" },
    {
      file: client,
      original: clientOriginal,
      patched: clientPatched,
      backup: "client.original.mjs",
    },
  ];
  for (const record of records) writeFileSync(join(backupDir, record.backup), record.original);
  writeFileSync(
    manifestFile,
    JSON.stringify(
      records.map(({ file, patched, original, backup }) => ({
        file,
        backup,
        originalHash: hash(original),
        patchedHash: hash(patched),
      })),
      null,
      2,
    ),
  );
  for (const record of records) atomicWrite(record.file, record.patched);
  console.log(
    "Applied completed-prefetch-only prototype. Run vp test, or restart the demo with vp dev --force.",
  );
} else {
  if (!existsSync(manifestFile)) throw new Error("No prototype is applied.");
  const records = JSON.parse(readFileSync(manifestFile, "utf8"));
  for (const record of records) {
    if (hash(readFileSync(record.file, "utf8")) !== record.patchedHash)
      throw new Error("Runtime changed after patching; refusing to overwrite it.");
    if (hash(readFileSync(join(backupDir, record.backup), "utf8")) !== record.originalHash)
      throw new Error("Original backup changed.");
  }
  for (const record of records)
    atomicWrite(record.file, readFileSync(join(backupDir, record.backup), "utf8"));
  rmSync(backupDir, { recursive: true });
  console.log("Restored the stock Void runtime. Restart the demo with vp dev --force.");
}
