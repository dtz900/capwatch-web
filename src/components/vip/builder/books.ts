/* Books in the capture feed (platform BOARD_BOOKS). "other" covers books the
 * feed does not carry: market prefill, the capper types the price. */
import { OTHER_BOOK } from "./slip";

export const BOOKS: Array<{ id: string; name: string }> = [
  { id: "fanduel", name: "FanDuel" },
  { id: "draftkings", name: "DraftKings" },
  { id: "betmgm", name: "BetMGM" },
  { id: "williamhill_us", name: "Caesars" },
  { id: "espnbet", name: "ESPN Bet" },
  { id: "fanatics", name: "Fanatics" },
  { id: "betrivers", name: "BetRivers" },
  { id: "hardrockbet", name: "Hard Rock" },
  { id: "fliff", name: "Fliff" },
  { id: "bovada", name: "Bovada" },
  { id: "betonlineag", name: "BetOnline" },
  { id: "mybookieag", name: "MyBookie" },
  { id: "betus", name: "BetUS" },
  { id: "novig", name: "Novig" },
  { id: "prophetx", name: "ProphetX" },
];

export { OTHER_BOOK };

export const bookName = (id: string | null | undefined) =>
  id === "pinnacle" ? "Pinnacle" : BOOKS.find((b) => b.id === id)?.name ?? "Other book";

/** The capper's saved book, else FanDuel; an unknown id falls back too. */
export const defaultBook = (preferred: string | null | undefined) =>
  preferred && (preferred === OTHER_BOOK || BOOKS.some((b) => b.id === preferred)) ? preferred : "fanduel";
