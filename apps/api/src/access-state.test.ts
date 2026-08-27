import assert from "node:assert/strict";
import { test } from "node:test";
import { nextAccessAction } from "./access-state.js";

test("main gate: first scan enters the complex", () => {
  assert.equal(nextAccessAction("MAIN_COMPLEX", null), "IN_COMPLEX");
  assert.equal(nextAccessAction("MAIN_COMPLEX", "PENDING"), "IN_COMPLEX");
  assert.equal(nextAccessAction("MAIN_COMPLEX", "EXITED"), "IN_COMPLEX");
});

test("main gate: scan while inside exits", () => {
  assert.equal(nextAccessAction("MAIN_COMPLEX", "IN_COMPLEX"), "EXITED");
  assert.equal(nextAccessAction("MAIN_COMPLEX", "IN_PROPERTY"), "EXITED");
});

test("internal gate: from complex goes to property", () => {
  assert.equal(
    nextAccessAction("INTERNAL_NEIGHBORHOOD", "IN_COMPLEX"),
    "IN_PROPERTY",
  );
});

test("internal gate: first scan at neighborhood still enters property", () => {
  assert.equal(nextAccessAction("INTERNAL_NEIGHBORHOOD", null), "IN_PROPERTY");
  assert.equal(
    nextAccessAction("INTERNAL_NEIGHBORHOOD", "EXITED"),
    "IN_PROPERTY",
  );
});

test("internal gate: second scan on property exits", () => {
  assert.equal(
    nextAccessAction("INTERNAL_NEIGHBORHOOD", "IN_PROPERTY"),
    "EXITED",
  );
});
