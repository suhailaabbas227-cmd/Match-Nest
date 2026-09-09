import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoProfiles } from "./demo-profile-data.mjs";

test("builds 300 unique, balanced synthetic profiles", () => {
  const profiles = buildDemoProfiles();
  assert.equal(profiles.length, 300);
  assert.equal(new Set(profiles.map((item) => item.email)).size, 300);

  for (const mode of ["dating", "marriage"]) {
    for (const gender of ["Male", "Female"]) {
      assert.equal(
        profiles.filter((item) => item.mode === mode && item.gender === gender).length,
        75,
      );
    }
  }
});

test("marks every record as demo data without photos or contact details", () => {
  for (const item of buildDemoProfiles()) {
    assert.equal(item.profile.isDemo, true);
    assert.match(item.fullName, / Demo \d{3}$/);
    assert.match(item.email, /@matchnest\.invalid$/);
    assert.equal("wali" in item.profile, false);
    assert.equal("phone" in item.profile, false);
  }
});

test("marriage previews contain more detail than friendship previews", () => {
  const profiles = buildDemoProfiles();
  const friendship = profiles.find((item) => item.mode === "dating");
  const marriage = profiles.find((item) => item.mode === "marriage");
  assert.ok(Object.keys(marriage.profile).length > Object.keys(friendship.profile).length + 10);
  assert.ok(marriage.profile.biodataNote.length > 120);
  assert.ok(friendship.profile.aboutMe.length > 80);
  assert.equal(marriage.profile.icebreakers.length, 3);
  assert.equal(friendship.profile.icebreakers.length, 3);
});

test("rejects counts that cannot remain balanced", () => {
  assert.throws(() => buildDemoProfiles(301), /divisible by 4/);
});

