/* Canonical profanity/slur blocklist for Tail or Fade usernames.

   This file is the single source of truth. The SQL migration that enforces
   the same rule in the database (tof_username_blocked() in
   migrations/2026-10-03_tof_username_blocklist.sql, platform repo) embeds
   the exact same two arrays. Keep them in sync by hand: run
   `node scripts/generate-tof-blocklist-sql.mjs` after editing either array
   here, paste its output into that migration's array literals in a new
   migration, and update the frozen copies in blocklist.sync.test.ts in the
   same change. That test fails the moment this file and the SQL drift apart
   without a cross-repo file read, which would not survive once this
   worktree is removed after merge.

   Two tiers:
   - UNAMBIGUOUS_ROOTS: blocked wherever they appear inside a normalized
     username (substring match). Each one has no common innocent English
     word built around it, so a plain substring test is safe.
   - AMBIGUOUS_ROOTS: blocked only when a normalized username IS the root
     and nothing else (whole-token match). Each one is a real English
     fragment that shows up inside ordinary words (Scunthorpe problem), so a
     substring match would reject names like "classic" or "assist". The
     comment on each root lists a plausible innocent word that contains it,
     to document why it needed the weaker rule.

   This list is deliberately not exhaustive and is a moderation judgment
   call, not a linguistics reference:
   - Neutral identity terms (gay, lesbian, trans, queer, etc.) are never
     included. They are not slurs and must never be blocked.
   - A few words with their own dual meaning (e.g. "dyke", "chink") are kept
     in the unambiguous tier even though they are also ordinary dictionary
     words on their own, not just as a substring of something else. The two-
     tier scheme only solves the "found inside another word" problem; a
     word that is itself ambiguous has no clean fix here and is a known,
     accepted tradeoff pending a manual allowlist if it ever causes a real
     false positive.
   - Mild/borderline terms (damn, hell, crap, moron, cripple) are left out on
     purpose to keep the false-positive surface small. */

export const LEET_MAP: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

export const UNAMBIGUOUS_ROOTS: readonly string[] = [
  "bastard",
  "beaner",
  "bitch",
  "blowjob",
  "bollock",
  "chink",
  "cocksucker",
  "dildo",
  "douche",
  "dyke",
  "fag",
  "fuck",
  "gook",
  "handjob",
  "jigaboo",
  "jizz",
  "kike",
  "mongoloid",
  "nigga",
  "nigger",
  "orgasm",
  "penis",
  "piss",
  "porn",
  "redskin",
  "skank",
  "slut",
  "spastic",
  "spaz",
  "tranny",
  "twat",
  "vagina",
  "wank",
  "wetback",
  "whore",
];

export const AMBIGUOUS_ROOTS: readonly string[] = [
  "anal", // analysis, analog, canal, banal
  "ass", // classic, assist, bass, glass, password
  "boob", // booby trap, booby prize
  "cock", // cockburn, hitchcock, shuttlecock, peacock
  "coon", // raccoon, cocoon, tycoon
  "cum", // cumulative, circumstance, document, cucumber
  "cunt", // scunthorpe
  "dick", // dickens, dickey
  "hoe", // shoe, horseshoe
  "homo", // homogeneous, homonym, homogenize
  "paki", // pakistan, pakistani
  "rape", // grape, drape
  "retard", // retardant (fire retardant)
  "shit", // shitake (shiitake mushroom misspelling)
  "spic", // despicable
  "tit", // title, attitude, constitution, institute
];

/** Lowercase, de-leetspeak, strip separators and filler digits, collapse
 *  repeated letters. Mirrors tof_username_normalize() in the SQL migration. */
export function normalizeUsername(raw: string): string {
  let s = (raw ?? "").toLowerCase();
  s = Array.from(s)
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");
  s = s.replace(/[_.]/g, "");
  // A digit sandwiched between two letters is an obfuscation separator
  // ("f2u6c8k"), not a leetspeak substitute (those are already handled by
  // LEET_MAP above). Strip it; a digit elsewhere (leading, trailing, next to
  // another digit) is left alone, since it is not hiding a letter boundary.
  s = s.replace(/(?<=[a-z])[0-9]+(?=[a-z])/g, "");
  s = s.replace(/([a-z])\1+/g, "$1");
  return s;
}

/* The collapse-repeated-letters step above is what makes an unambiguous root
   match its own obfuscated spelling ("niggggger" -> contains the collapsed
   root), so unambiguous roots are matched against their OWN collapsed form,
   not their literal spelling. That is safe for every root here except two,
   where a correctly-spelled word legitimately has the doubled letter the
   slur also has, and collapsing both down to one copy collides with a real,
   common, entirely innocent word:
     - "nigger" collapses to "niger", identical to the country Niger and a
       substring of Nigeria/Nigerian. This is the canonical companion to the
       Scunthorpe problem and the one every moderation list eventually hits.
     - "piss" collapses to "pis", a substring of episcopal, epistle, and
       epistemology.
   SAFE_EXCEPTIONS lists the specific innocent words for each affected root.
   A match on that root is dropped (not the whole candidate, just that one
   root) when one of its safe words is also present, so "nigeria22" and
   "episcopalian" pass while "nigeriafuck" still gets blocked, on "fuck".
   The exception requires the full safe word, not bare "niger": a username
   that really is just "niger" with nothing else is still blocked. That is
   a deliberate, documented tradeoff (the country's own citizens lose a
   narrow, legitimate bare username) in favor of never letting "nigger"
   through just because collapsing happened to match the country's name. */
const SAFE_EXCEPTIONS: Readonly<Record<string, RegExp>> = {
  niger: /nigeria|nigerian/,
  pis: /epis(copal|tle|temology|temic)/,
};

function collapseRepeats(s: string): string {
  return s.replace(/([a-z])\1+/g, "$1");
}

const UNAMBIGUOUS_NORMALIZED: readonly string[] = UNAMBIGUOUS_ROOTS.map(collapseRepeats);
const AMBIGUOUS_NORMALIZED: readonly string[] = AMBIGUOUS_ROOTS.map(collapseRepeats);

/** True when the normalized username contains an unambiguous root anywhere,
 *  or IS an ambiguous root exactly. Mirrors tof_username_blocked() in SQL. */
export function isBlockedUsername(raw: string): boolean {
  const n = normalizeUsername(raw);
  if (!n) return false;
  for (const root of UNAMBIGUOUS_NORMALIZED) {
    if (!n.includes(root)) continue;
    const exception = SAFE_EXCEPTIONS[root];
    if (exception && exception.test(n)) continue;
    return true;
  }
  if (AMBIGUOUS_NORMALIZED.includes(n)) return true;
  return false;
}
