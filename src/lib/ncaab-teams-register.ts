/**
 * Side-effect import that loads the generated NCAAB team map. Import this from
 * code that renders NCAAB (the slate view, the VIP builder, tests); the shared
 * lookups in ncaab-teams.ts see the map once it has run.
 */
import { NCAAB_TEAMS } from "./ncaab-teams.generated";
import { registerNcaabTeams } from "./ncaab-teams";

registerNcaabTeams(NCAAB_TEAMS);
