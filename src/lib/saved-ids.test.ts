import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanIds, MAX_SAVED } from "./saved-ids.ts";

test("keeps valid ids once, in order", () => {
  assert.deepEqual(cleanIds(["primary-button", "card", "card"]), ["primary-button", "card"]);
});

test("drops non-strings, empty and malformed ids", () => {
  assert.deepEqual(cleanIds([1, null, "", "Has Space", "../etc", "ok-1"]), ["ok-1"]);
});

test("rejects non-arrays", () => {
  assert.deepEqual(cleanIds("card"), []);
  assert.deepEqual(cleanIds(undefined), []);
});

test("caps the list", () => {
  const many = Array.from({ length: MAX_SAVED + 50 }, (_, i) => `b${i}`);
  assert.equal(cleanIds(many).length, MAX_SAVED);
});
