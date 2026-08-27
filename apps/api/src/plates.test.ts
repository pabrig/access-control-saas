import assert from "node:assert/strict";
import { test } from "node:test";
import { matchInvitationPlate, parsePlate } from "./plates.js";

test("old Argentine plates: AAA 000", () => {
  assert.deepEqual(parsePlate("abc123"), {
    format: "AR_OLD",
    normalized: "ABC123",
    display: "ABC 123",
  });
  assert.deepEqual(parsePlate("ABC 123"), parsePlate("abc-123"));
});

test("Mercosur plates: AA000AA", () => {
  assert.deepEqual(parsePlate("ab123cd"), {
    format: "AR_MERCOSUR",
    normalized: "AB123CD",
    display: "AB 123 CD",
  });
  assert.deepEqual(parsePlate("AB 123 CD"), parsePlate("ab-123-cd"));
});

test("rejects plates that are not the two Argentine formats", () => {
  assert.equal(parsePlate(""), null);
  assert.equal(parsePlate("123ABC"), null);
  assert.equal(parsePlate("AB1234CD"), null);
  assert.equal(parsePlate("ABCD12"), null);
});

test("gate plate match skips empty or invitations without cars", () => {
  assert.equal(matchInvitationPlate([], "ABC123"), "skip");
  assert.equal(
    matchInvitationPlate([{ plateNormalized: "ABC123" }], ""),
    "skip",
  );
  assert.equal(
    matchInvitationPlate([{ plateNormalized: "ABC123" }], "nope"),
    "invalid",
  );
  assert.equal(
    matchInvitationPlate([{ plateNormalized: "ABC123" }], "abc 123"),
    "match",
  );
  assert.equal(
    matchInvitationPlate([{ plateNormalized: "ABC123" }], "AB123CD"),
    "unknown",
  );
});
