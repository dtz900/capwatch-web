import { describe, it, expect } from "vitest";
import { UNAMBIGUOUS_ROOTS, AMBIGUOUS_ROOTS } from "@/lib/tof/blocklist";

/* Frozen copy of what was last pasted into the platform repo's migration
   (migrations/2026-10-03_tof_username_blocklist.sql,
   tof_username_blocklist_unambiguous() / _ambiguous()), produced by
   `node scripts/generate-tof-blocklist-sql.mjs`.

   These two repos do not share a reliable file path at test time (this is a
   throwaway worktree that goes away after merge, and the web repo's CI has
   no checkout of the platform repo), so this is the "keep both files and
   add a test" half of the plan: a local snapshot instead of a cross-repo
   file read. If you change UNAMBIGUOUS_ROOTS or AMBIGUOUS_ROOTS in
   blocklist.ts, this test fails until you also:
     1. run `node scripts/generate-tof-blocklist-sql.mjs`,
     2. paste the new arrays into a new migration in the platform repo, and
     3. update the two arrays below to match. */
const SQL_SYNCED_UNAMBIGUOUS = [
  "bastard", "beaner", "bitch", "blowjob", "bollock", "chink", "cocksucker", "dildo", "douche", "dyke",
  "fag", "fuck", "gook", "handjob", "jigaboo", "jizz", "kike", "mongoloid", "nigga", "nigger", "orgasm",
  "penis", "piss", "porn", "redskin", "skank", "slut", "spastic", "spaz", "tranny", "twat", "vagina",
  "wank", "wetback", "whore",
];

const SQL_SYNCED_AMBIGUOUS = [
  "anal", "ass", "boob", "cock", "coon", "cum", "cunt", "dick", "hoe", "homo", "paki", "rape", "retard",
  "shit", "spic", "tit",
];

describe("blocklist stays in sync with the SQL migration", () => {
  it("matches the frozen unambiguous roots embedded in the migration", () => {
    expect([...UNAMBIGUOUS_ROOTS]).toEqual(SQL_SYNCED_UNAMBIGUOUS);
  });
  it("matches the frozen ambiguous roots embedded in the migration", () => {
    expect([...AMBIGUOUS_ROOTS]).toEqual(SQL_SYNCED_AMBIGUOUS);
  });
});
