import assert from "node:assert/strict";
import { test } from "node:test";
import { compact, delta, niceMax, toPoints } from "./format.ts";

test("delta compares with the period before", () => {
  assert.deepEqual(delta(150, 100), { text: "+50%", dir: "up" });
  assert.deepEqual(delta(80, 100), { text: "-20%", dir: "down" });
  assert.deepEqual(delta(5, 5), { text: "No change", dir: "flat" });
  assert.deepEqual(delta(3, 0), { text: "New", dir: "up" });
  assert.deepEqual(delta(0, 0), { text: "No change", dir: "flat" });
  assert.equal(delta(10, null).dir, "none");
});

test("niceMax gives a round top for the grid", () => {
  assert.equal(niceMax(0), 4);
  assert.equal(niceMax(3), 4);
  assert.equal(niceMax(17), 20);
  assert.equal(niceMax(41), 50);
  assert.equal(niceMax(100), 100);
  assert.equal(niceMax(101), 200);
});

test("compact keeps small numbers whole", () => {
  assert.equal(compact(1284), "1,284");
  assert.equal(compact(12900), "12.9K");
});

test("toPoints sums weeks and labels the range", () => {
  const days = Array.from({ length: 10 }, (_, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, copies: 1 }));
  const daily = toPoints(days, "copies", false);
  assert.equal(daily.length, 10);
  const weekly = toPoints(days, "copies", true);
  assert.deepEqual(weekly.map((point) => point.value), [7, 3]);
  assert.equal(weekly[0]?.label, "Nov 1 – Nov 7");
});
