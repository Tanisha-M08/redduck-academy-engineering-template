// 03-core-periphery/tests/store.test.ts
// Focused checks for the core/periphery split. Uses ONLY the public interface:
// verify(...), getProfile(...), listProfiles(), buildUserReport(...).
// Run with:  node --test tests/store.test.ts  (or: node tests/store.test.ts)
import assert from "node:assert/strict";
import { test } from "node:test";
import { UserStore, buildUserReport } from "../src/Store";

const HASH_SECRET_FRAGMENT = "hash:";

test("store is constructible and still verifies passwords", () => {
  const store = new UserStore();
  assert.equal(store.verify("alice", "alice-pw"), true);
  assert.equal(store.verify("bob", "bob-pw"), true);
  assert.equal(store.verify("alice", "wrong-pw"), false);
  assert.equal(store.verify("nobody", "whatever"), false);
});

test("getProfile returns username and role only, never a hash", () => {
  const store = new UserStore();
  const profile = store.getProfile("alice");
  assert.ok(profile);
  assert.deepEqual(profile, { username: "alice", role: "admin" });
  // The hash-free shape is structural: no passwordHash key can appear.
  assert.equal("passwordHash" in profile, false);
  assert.equal(JSON.stringify(profile).includes(HASH_SECRET_FRAGMENT), false);
  assert.equal(store.getProfile("nobody"), null);
});

test("listProfiles covers every user without exposing a hash", () => {
  const store = new UserStore();
  const profiles = store.listProfiles();
  assert.deepEqual(
    profiles.map((p) => p.username).sort(),
    ["alice", "bob"],
  );
  for (const profile of profiles) {
    assert.equal("passwordHash" in profile, false);
    assert.equal(JSON.stringify(profile).includes(HASH_SECRET_FRAGMENT), false);
  }
});

test("records are not reachable through normal public reflection", () => {
  const store = new UserStore();
  // The #private field is invisible to every public reflection surface:
  const propertyNames = Object.getOwnPropertyNames(store);
  assert.equal(propertyNames.includes("users"), false);
  assert.equal(propertyNames.includes("#users"), false);
  assert.deepEqual(Object.keys(store), []);
  assert.deepEqual({ ...store }, {});
  // Bracket access to the private name yields undefined, not the records.
  assert.equal((store as unknown as Record<string, unknown>)["#users"], undefined);
  assert.equal((store as unknown as Record<string, unknown>)["users"], undefined);
  // Serializing the store reveals nothing secret.
  assert.equal(JSON.stringify(store), "{}");
});

test("convenience output (the report) never contains a hash", () => {
  const store = new UserStore();
  const report = buildUserReport(store);
  assert.deepEqual(report.sort(), ["alice (admin)", "bob (member)"]);
  for (const row of report) {
    assert.equal(row.includes(HASH_SECRET_FRAGMENT), false);
  }
  assert.equal(JSON.stringify(report).includes(HASH_SECRET_FRAGMENT), false);
});

test("a caller cannot corrupt core state through returned profiles", () => {
  const store = new UserStore();
  const profile = store.getProfile("alice");
  assert.ok(profile);
  profile.role = "superadmin";
  profile.username = "mallory";
  // The periphery got a copy; the core's records are untouched.
  assert.deepEqual(store.getProfile("alice"), { username: "alice", role: "admin" });
  assert.equal(store.verify("alice", "alice-pw"), true);
});
