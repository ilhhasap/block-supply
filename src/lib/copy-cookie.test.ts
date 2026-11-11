import assert from "node:assert/strict";
import { test } from "node:test";
import { hashIp, newDeviceId, openDeviceId } from "./copy-cookie.ts";

test("a minted device id opens back to its uuid", () => {
  const sealed = newDeviceId("s");
  const id = openDeviceId(sealed, "s");
  assert.ok(id && sealed.includes(id));
});

test("a tampered, foreign-secret or missing cookie is rejected", () => {
  const sealed = newDeviceId("s");
  assert.equal(openDeviceId(undefined, "s"), null);
  assert.equal(openDeviceId(sealed, "other"), null);
  assert.equal(openDeviceId(sealed.replace(/.$/, "0") + "x", "s"), null);
  assert.equal(openDeviceId("d1.abc.def", "s"), null);
});

test("ip hashing is stable, keyed and not the raw address", () => {
  assert.equal(hashIp("1.2.3.4", "s"), hashIp("1.2.3.4", "s"));
  assert.notEqual(hashIp("1.2.3.4", "s"), hashIp("1.2.3.5", "s"));
  assert.notEqual(hashIp("1.2.3.4", "s"), hashIp("1.2.3.4", "t"));
  assert.ok(!hashIp("1.2.3.4", "s").includes("1.2.3.4"));
});
