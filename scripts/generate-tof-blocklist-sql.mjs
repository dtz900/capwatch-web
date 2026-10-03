#!/usr/bin/env node
/* Prints the SQL array literals for the two blocklist tiers in
   src/lib/tof/blocklist.ts, so they can be pasted into the platform repo's
   migration (tof_username_blocklist_unambiguous() / _ambiguous()).

   This repo and the platform repo (nba_platform) are separate git
   histories, so there is no reliable file path between them for a build
   step or a test to read across at run time, especially once a worktree
   like this one is removed after merge. Treat this script as the generator
   half of "keep both files and add a test": run it by hand whenever the
   blocklist changes, paste its output into a new platform migration, and
   update the frozen snapshot in tests/lib/tofBlocklist.sync.test.ts in the
   same change so that test catches drift in the other direction.

   Usage: node scripts/generate-tof-blocklist-sql.mjs
*/
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "../src/lib/tof/blocklist.ts"), "utf8");

function extractArray(name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`);
  const match = source.match(re);
  if (!match) throw new Error(`could not find ${name} in blocklist.ts`);
  const roots = [];
  for (const line of match[1].split("\n")) {
    const m = line.match(/"([^"]+)"/);
    if (m) roots.push(m[1]);
  }
  return roots;
}

function sqlArrayLiteral(roots) {
  return `array[${roots.map((r) => `'${r.replace(/'/g, "''")}'`).join(", ")}]`;
}

const unambiguous = extractArray("UNAMBIGUOUS_ROOTS");
const ambiguous = extractArray("AMBIGUOUS_ROOTS");

console.log("-- tof_username_blocklist_unambiguous(), " + unambiguous.length + " roots:");
console.log("  select " + sqlArrayLiteral(unambiguous) + ";");
console.log("");
console.log("-- tof_username_blocklist_ambiguous(), " + ambiguous.length + " roots:");
console.log("  select " + sqlArrayLiteral(ambiguous) + ";");
