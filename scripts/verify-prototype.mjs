import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { stripVTControlCharacters } from "node:util";

if (existsSync(new URL("../.repro-patch/manifest.json", import.meta.url))) {
  throw new Error("Start with stock Void: vp run patch:revert");
}
function command(args) {
  const result = spawnSync("vp", args, {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result;
}
console.log("\n1. Stock Void: expect exactly the pending-prefetch case to fail.\n");
const baseline = command(["test"]);
const text = stripVTControlCharacters(baseline.stdout + baseline.stderr);
assert.equal(
  baseline.status,
  1,
  "Stock Void unexpectedly passed, or the test process could not run",
);
assert.match(text, /Tests\s+1 failed \| 2 passed/);
assert.match(text, /pending prefetch should not block the core page/);
let patched = false;
try {
  assert.equal(command(["run", "patch:apply"]).status, 0);
  patched = true;
  console.log("\n2. Prototype: expect all three cases to pass.\n");
  assert.equal(command(["test"]).status, 0, "The proposed fallback did not fix the regression");
} finally {
  if (patched)
    assert.equal(
      command(["run", "patch:revert"]).status,
      0,
      "Restore the runtime with vp run patch:revert",
    );
}
console.log(
  "\nVerified: stock runtime reproduces the bug; completed-only reuse fixes it and preserves both controls. Stock runtime restored.\n",
);
