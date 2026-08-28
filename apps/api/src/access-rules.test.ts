import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gateMatchesInvitation,
  gateMatchesProperty,
  invitationWindowError,
  shouldRevokeSingleUse,
} from "./access-rules.js";

const complexId = "10000000-0000-0000-0000-000000000001";
const neighborhoodId = "10000000-0000-0000-0000-000000000011";
const otherNeighborhood = "10000000-0000-0000-0000-000000000012";

test("WRONG_GATE: property scope mirrors invitation scope", () => {
  assert.equal(
    gateMatchesProperty({
      gateType: "MAIN_COMPLEX",
      gateComplexId: complexId,
      gateNeighborhoodId: null,
      propertyNeighborhoodId: neighborhoodId,
      propertyComplexId: complexId,
    }),
    true,
  );

  assert.equal(
    gateMatchesProperty({
      gateType: "INTERNAL_NEIGHBORHOOD",
      gateComplexId: null,
      gateNeighborhoodId: neighborhoodId,
      propertyNeighborhoodId: neighborhoodId,
      propertyComplexId: complexId,
    }),
    true,
  );

  assert.equal(
    gateMatchesProperty({
      gateType: "INTERNAL_NEIGHBORHOOD",
      gateComplexId: null,
      gateNeighborhoodId: neighborhoodId,
      propertyNeighborhoodId: otherNeighborhood,
      propertyComplexId: complexId,
    }),
    false,
  );
});

test("WRONG_GATE: main barrier only accepts the invitation complex", () => {
  assert.equal(
    gateMatchesInvitation({
      gateType: "MAIN_COMPLEX",
      gateComplexId: complexId,
      gateNeighborhoodId: null,
      invitationNeighborhoodId: neighborhoodId,
      invitationComplexId: complexId,
    }),
    true,
  );

  assert.equal(
    gateMatchesInvitation({
      gateType: "MAIN_COMPLEX",
      gateComplexId: complexId,
      gateNeighborhoodId: null,
      invitationNeighborhoodId: neighborhoodId,
      invitationComplexId: "20000000-0000-0000-0000-000000000001",
    }),
    false,
  );
});

test("WRONG_GATE: internal barrier only accepts the same neighborhood", () => {
  assert.equal(
    gateMatchesInvitation({
      gateType: "INTERNAL_NEIGHBORHOOD",
      gateComplexId: null,
      gateNeighborhoodId: neighborhoodId,
      invitationNeighborhoodId: neighborhoodId,
      invitationComplexId: complexId,
    }),
    true,
  );

  assert.equal(
    gateMatchesInvitation({
      gateType: "INTERNAL_NEIGHBORHOOD",
      gateComplexId: null,
      gateNeighborhoodId: neighborhoodId,
      invitationNeighborhoodId: otherNeighborhood,
      invitationComplexId: complexId,
    }),
    false,
  );
});

test("expired invitations can still exit", () => {
  const now = Date.parse("2026-08-27T12:00:00Z");
  const validFrom = Date.parse("2026-08-01T00:00:00Z");
  const validTo = Date.parse("2026-08-26T00:00:00Z");

  assert.equal(
    invitationWindowError(now, validFrom, validTo, "IN_COMPLEX"),
    "EXPIRED",
  );
  assert.equal(invitationWindowError(now, validFrom, validTo, "EXITED"), null);
});

test("future invitations are not yet valid", () => {
  const now = Date.parse("2026-08-27T12:00:00Z");
  const validFrom = Date.parse("2026-09-01T00:00:00Z");
  const validTo = Date.parse("2026-09-10T00:00:00Z");

  assert.equal(
    invitationWindowError(now, validFrom, validTo, "IN_COMPLEX"),
    "NOT_YET_VALID",
  );
});

test("single-use revokes only after IN_PROPERTY", () => {
  assert.equal(shouldRevokeSingleUse(true, "IN_PROPERTY"), true);
  assert.equal(shouldRevokeSingleUse(true, "IN_COMPLEX"), false);
  assert.equal(shouldRevokeSingleUse(false, "IN_PROPERTY"), false);
});
