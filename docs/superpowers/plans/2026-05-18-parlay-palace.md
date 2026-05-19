# Parlay Palace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A curated hall-of-fame on tailslips.com showcasing big winning MLB parlays, each with a media-rich, action-shot detail page and a share-optimized OG card, admin-curated before publish.

**Architecture:** Backend (FastAPI + Supabase at `D:/nba-totals-project/nba_platform`) adds a `parlay_palace_entries` table, a candidate-query endpoint over existing `capper_parlay_grades`/`capper_picks`, an MLB enrichment module (boxscore + media, keyed by the already-stored gamePk), an LLM recap generator, and admin curate/publish endpoints. Frontend (Next.js 16 at `D:/capwatch-web`) adds an admin curation queue, a public gallery, per-entry detail pages using the approved action-shot template, per-entry OG images, sitemap and JSON-LD.

**Tech Stack:** Python 3 / FastAPI / Supabase SDK / Anthropic SDK (Haiku 4.5) / pytest (backend). Next.js 16 / React 19 / Tailwind v4 / `next/og` ImageResponse / Upstash KV / Vitest (frontend).

**Hard constraints (do not violate):**
- MLB media (`img.mlbstatic.com`, `mlb-cuts-diamond.mlb.com`) is **hotlinked only, never downloaded/rehosted** to our storage or DB. Store the MLB URL string, not the bytes.
- Every page/card that shows MLB media renders the attribution line `Media: MLB Advanced Media`.
- Stats (strikeouts, scores, units) are the backbone; media is decorative and every media field is nullable with a graceful absence state.
- No em dashes or double hyphens anywhere, including the LLM recap (the prohibition must be in the system prompt so it survives into model output).
- Repo guard: before writing any Next.js routing/rendering code, read the relevant guide in `D:/capwatch-web/node_modules/next/dist/docs/`.

**Repo legend:** `BE:` = `D:/nba-totals-project/nba_platform`. `FE:` = `D:/capwatch-web`. Run backend commands from `D:/nba-totals-project/nba_platform`, frontend from `D:/capwatch-web`. Commit in the repo the task touches.

---

## File Structure

**Backend (`D:/nba-totals-project/nba_platform`)**
- Create: `database/migrations/2026-05-18_parlay_palace.sql` — `parlay_palace_entries` table.
- Create: `core/parlay_palace_query.py` — candidate query (winning MLB parlays + legs).
- Create: `core/parlay_palace_enrich.py` — boxscore result per leg, clincher pick, MLB media lookup, headshots.
- Create: `core/parlay_palace_recap.py` — LLM recap blurb.
- Create: `api/routers/parlay_palace.py` — admin + public endpoints.
- Modify: `api/main.py` — register the new router.
- Create tests: `tests/core/test_parlay_palace_query.py`, `tests/core/test_parlay_palace_enrich.py`, `tests/core/test_parlay_palace_recap.py`, `tests/api/test_parlay_palace_api.py`.

**Frontend (`D:/capwatch-web`)**
- Modify: `src/lib/types.ts` — Parlay Palace types.
- Modify: `src/lib/api.ts` — fetchers (public list/detail) + admin fetchers.
- Create: `src/app/parlay-palace/page.tsx` — gallery index.
- Create: `src/app/parlay-palace/[slug]/page.tsx` — detail page.
- Create: `src/app/parlay-palace/[slug]/opengraph-image.tsx` + `_pp-og-renderer.tsx` — OG card.
- Create: `src/components/parlay-palace/ParlayHero.tsx`, `LegRow.tsx`, `PalaceCard.tsx` — UI units.
- Create: `src/app/admin/parlay-palace/page.tsx` + `PalaceQueueTable.tsx` + `actions.ts` — admin curation.
- Modify: `src/app/sitemap.ts` — published entries.
- Modify: `src/lib/jsonld.ts` — `parlayPalaceArticleNode()`.
- Create tests: `tests/lib/api.parlayPalace.test.ts`, `tests/components/PalaceCard.test.tsx`, `tests/components/LegRow.test.tsx`.

---

## Reference: existing backend schema (verified, do not recreate)

`capper_parlay_grades`: `parlay_id BIGINT PK`, `capper_id BIGINT`, `total_legs SMALLINT`, `graded_legs SMALLINT`, `outcome TEXT` ('win'|'loss'|'push'|'void'), `combined_odds INT`, `profit_units NUMERIC`, `graded_at TIMESTAMPTZ`.

`capper_picks`: `id BIGSERIAL PK`, `capper_id BIGINT`, `sport TEXT`, `game_id TEXT` (**= MLB gamePk as string**), `market TEXT`, `selection TEXT`, `line NUMERIC`, `odds_taken INT`, `units NUMERIC`, `player_name TEXT`, `player_id INT` (MLB id, set on prop legs), `parlay_id BIGINT`, `parlay_leg_index SMALLINT`, `parlay_total_legs SMALLINT`, `posted_at TIMESTAMPTZ`.

`cappers`: `id BIGINT`, `handle TEXT`, `display_name TEXT`, `profile_image_url TEXT`.

Supabase client: `from database.connection import get_supabase`. Anthropic: pattern in `core/llm_parser.py` (`anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])`, model `claude-haiku-4-5-20251001`). MLB client: `core/mlb_stats_client.py`. Cron/admin auth: `from api.routers.cron import verify_cron_secret` (Bearer `CRON_SECRET`).

---

# PHASE 1 — Backend: data model

### Task 1: Create the `parlay_palace_entries` migration

**Files:**
- Create: `BE: database/migrations/2026-05-18_parlay_palace.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 2026-05-18_parlay_palace.sql
-- Platform-ready curated content entry; today only type='parlay_palace'.
CREATE TABLE IF NOT EXISTS parlay_palace_entries (
  id             BIGSERIAL PRIMARY KEY,
  type           TEXT NOT NULL DEFAULT 'parlay_palace',
  slug           TEXT NOT NULL UNIQUE,
  parlay_id      BIGINT NOT NULL UNIQUE REFERENCES capper_parlay_grades(parlay_id),
  capper_id      BIGINT NOT NULL REFERENCES cappers(id),
  status         TEXT NOT NULL DEFAULT 'candidate'
                   CHECK (status IN ('candidate','draft','published')),
  title          TEXT,
  recap_blurb    TEXT,
  -- Enrichment payload: ordered legs, results, media URLs, hero ref. Hotlinked
  -- MLB media URLs only; never store media bytes here.
  body           JSONB NOT NULL DEFAULT '{}'::jsonb,
  hero_kind      TEXT CHECK (hero_kind IN ('photo','clip','headshot')),
  hero_url       TEXT,
  seo_title      TEXT,
  seo_description TEXT,
  units_profit   NUMERIC,
  combined_odds  INT,
  leg_count      SMALLINT,
  slate_date     DATE,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppe_status_pub
  ON parlay_palace_entries (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ppe_slate_date
  ON parlay_palace_entries (slate_date DESC);
```

- [ ] **Step 2: Apply the migration to Supabase**

Run (psql against the Supabase connection string used by other migrations; if the project applies migrations via the Supabase SQL editor, paste the file there instead):

```bash
psql "$SUPABASE_DB_URL" -f database/migrations/2026-05-18_parlay_palace.sql
```
Expected: `CREATE TABLE` / `CREATE INDEX` with no error. Re-running is safe (`IF NOT EXISTS`).

- [ ] **Step 3: Verify the table exists**

```bash
psql "$SUPABASE_DB_URL" -c "\d parlay_palace_entries"
```
Expected: table description listing all columns above.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026-05-18_parlay_palace.sql
git commit -m "feat(parlay-palace): add parlay_palace_entries table"
```

---

# PHASE 2 — Backend: candidate query

### Task 2: Winning-parlay candidate query

**Files:**
- Create: `BE: core/parlay_palace_query.py`
- Test: `BE: tests/core/test_parlay_palace_query.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/core/test_parlay_palace_query.py
from core.parlay_palace_query import build_candidates, ParlayCandidate, Leg

class FakeTable:
    def __init__(self, rows): self._rows = rows; self._f = {}
    def select(self, *a, **k): return self
    def eq(self, k, v): self._f[k] = v; return self
    def order(self, *a, **k): return self
    def execute(self):
        class R: pass
        r = R(); r.data = self._rows; return r

class FakeDB:
    def __init__(self, by_table): self.by_table = by_table
    def table(self, name): return FakeTable(self.by_table[name])

def test_build_candidates_groups_legs_sorted_by_profit():
    db = FakeDB({
        "capper_parlay_grades": [
            {"parlay_id": 1, "capper_id": 10, "total_legs": 2,
             "outcome": "win", "combined_odds": 597, "profit_units": 5.97,
             "graded_at": "2026-05-17T03:00:00Z"},
            {"parlay_id": 2, "capper_id": 11, "total_legs": 3,
             "outcome": "win", "combined_odds": 2598, "profit_units": 25.98,
             "graded_at": "2026-05-18T04:00:00Z"},
            {"parlay_id": 3, "capper_id": 10, "total_legs": 2,
             "outcome": "loss", "combined_odds": 200, "profit_units": -1.0,
             "graded_at": "2026-05-18T04:00:00Z"},
        ],
        "capper_picks": [
            {"parlay_id": 1, "parlay_leg_index": 0, "sport": "MLB",
             "game_id": "745744", "market": "ml", "selection": "NYY",
             "line": None, "odds_taken": -135, "player_name": None,
             "player_id": None, "posted_at": "2026-05-17T18:00:00Z"},
            {"parlay_id": 1, "parlay_leg_index": 1, "sport": "MLB",
             "game_id": "745745", "market": "total", "selection": "OVER",
             "line": 8.5, "odds_taken": -110, "player_name": None,
             "player_id": None, "posted_at": "2026-05-17T18:00:00Z"},
            {"parlay_id": 2, "parlay_leg_index": 0, "sport": "MLB",
             "game_id": "748001", "market": "prop", "selection": "OVER",
             "line": 6.5, "odds_taken": -115, "player_name": "Yamamoto",
             "player_id": 808967, "posted_at": "2026-05-18T18:00:00Z"},
        ],
        "cappers": [
            {"id": 10, "handle": "sharpedge", "display_name": "Sharp Edge",
             "profile_image_url": None},
            {"id": 11, "handle": "lottolocks", "display_name": "Lotto Locks",
             "profile_image_url": None},
        ],
    })
    out = build_candidates(db)
    assert [c.parlay_id for c in out] == [2, 1]          # profit desc, win-only
    assert all(isinstance(c, ParlayCandidate) for c in out)
    assert out[1].capper_handle == "sharpedge"
    assert out[1].legs[0].game_id == "745744"
    assert isinstance(out[1].legs[0], Leg)
    # parlay 3 (loss) excluded; only MLB parlays with >=2 legs returned
    assert out[0].leg_count == 1  # parlay 2 has 1 stored leg in fixture
```

- [ ] **Step 2: Run it, verify failure**

Run: `python -m pytest tests/core/test_parlay_palace_query.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'core.parlay_palace_query'`.

- [ ] **Step 3: Implement `core/parlay_palace_query.py`**

```python
# core/parlay_palace_query.py
"""Build Parlay Palace candidates: winning MLB parlays (>=2 legs)
ordered by profit_units desc. Pure-ish: takes a Supabase-like client."""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Leg:
    leg_index: int
    game_id: str | None
    market: str | None
    selection: str | None
    line: float | None
    odds_taken: int | None
    player_name: str | None
    player_id: int | None
    posted_at: str | None


@dataclass
class ParlayCandidate:
    parlay_id: int
    capper_id: int
    capper_handle: str | None
    capper_display_name: str | None
    capper_image_url: str | None
    combined_odds: int | None
    profit_units: float
    leg_count: int
    graded_at: str | None
    legs: list[Leg] = field(default_factory=list)


def build_candidates(db) -> list[ParlayCandidate]:
    grades = (
        db.table("capper_parlay_grades")
        .select("parlay_id, capper_id, total_legs, outcome, "
                "combined_odds, profit_units, graded_at")
        .eq("outcome", "win")
        .order("profit_units", desc=True)
        .execute()
        .data
    ) or []

    picks = (
        db.table("capper_picks")
        .select("parlay_id, parlay_leg_index, sport, game_id, market, "
                "selection, line, odds_taken, player_name, player_id, posted_at")
        .eq("sport", "MLB")
        .execute()
        .data
    ) or []

    cappers = (
        db.table("cappers")
        .select("id, handle, display_name, profile_image_url")
        .execute()
        .data
    ) or []
    cmap = {c["id"]: c for c in cappers}

    legs_by_parlay: dict[int, list[Leg]] = {}
    for p in picks:
        pid = p.get("parlay_id")
        if pid is None:
            continue
        legs_by_parlay.setdefault(pid, []).append(
            Leg(
                leg_index=p.get("parlay_leg_index") or 0,
                game_id=str(p["game_id"]) if p.get("game_id") is not None else None,
                market=p.get("market"),
                selection=p.get("selection"),
                line=p.get("line"),
                odds_taken=p.get("odds_taken"),
                player_name=p.get("player_name"),
                player_id=p.get("player_id"),
                posted_at=p.get("posted_at"),
            )
        )

    out: list[ParlayCandidate] = []
    for g in grades:
        pid = g["parlay_id"]
        legs = sorted(legs_by_parlay.get(pid, []), key=lambda l: l.leg_index)
        if len(legs) < 1:
            continue  # no MLB legs found for this parlay
        cap = cmap.get(g["capper_id"], {})
        out.append(
            ParlayCandidate(
                parlay_id=pid,
                capper_id=g["capper_id"],
                capper_handle=cap.get("handle"),
                capper_display_name=cap.get("display_name"),
                capper_image_url=cap.get("profile_image_url"),
                combined_odds=g.get("combined_odds"),
                profit_units=float(g.get("profit_units") or 0.0),
                leg_count=len(legs),
                graded_at=g.get("graded_at"),
                legs=legs,
            )
        )
    out.sort(key=lambda c: c.profit_units, reverse=True)
    return out
```

> Note: the spec says "2+ legs". The DB stores one `capper_picks` row per leg, so a true parlay always has >=2 rows; the guard `len(legs) < 1` keeps a parlay that lost a leg row from crashing while still excluding parlays with zero MLB legs. The candidate list is admin-curated, so a degenerate single-leg row is filtered visually by the admin. Do not add an automatic units/odds threshold (spec: pure admin discretion).

- [ ] **Step 4: Run it, verify pass**

Run: `python -m pytest tests/core/test_parlay_palace_query.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add core/parlay_palace_query.py tests/core/test_parlay_palace_query.py
git commit -m "feat(parlay-palace): winning-parlay candidate query"
```

---

# PHASE 3 — Backend: MLB enrichment

### Task 3: MLB media + boxscore enrichment client

**Files:**
- Create: `BE: core/parlay_palace_enrich.py`
- Test: `BE: tests/core/test_parlay_palace_enrich.py`

MLB endpoints (verified, no auth):
- Boxscore: `https://statsapi.mlb.com/api/v1/game/{gamePk}/boxscore` — pitcher Ks at `teams.{side}.players.ID{pid}.stats.pitching.strikeOuts`; batter line at `...stats.batting.{hits,atBats,homeRuns,rbi}`.
- Content: `https://statsapi.mlb.com/api/v1/game/{gamePk}/content` — action photo at `editorial.recap.mlb.photo.cuts` (pick the widest cut `src`); highlight mp4 at `highlights.highlights.items[].playbacks[]` where `url` ends `.mp4` (prefer `name=='mp4Avc'`). Null-check both; absent for recap-less games.
- Headshot: `https://midfield.mlbstatic.com/v1/people/{playerId}/spots/120`.

- [ ] **Step 1: Write the failing test**

```python
# tests/core/test_parlay_palace_enrich.py
from core.parlay_palace_query import ParlayCandidate, Leg
from core.parlay_palace_enrich import enrich_candidate, headshot_url

def _leg(i, gid, market, sel, pid=None, pname=None, odds=-110, line=None, posted=None):
    return Leg(i, gid, market, sel, line, odds, pname, pid, posted)

def test_headshot_url():
    assert headshot_url(808967) == "https://midfield.mlbstatic.com/v1/people/808967/spots/120"
    assert headshot_url(None) is None

def test_enrich_builds_body_and_picks_clincher(monkeypatch):
    cand = ParlayCandidate(
        parlay_id=2, capper_id=11, capper_handle="lottolocks",
        capper_display_name="Lotto Locks", capper_image_url=None,
        combined_odds=2598, profit_units=25.98, leg_count=2,
        graded_at="2026-05-18T04:00:00Z",
        legs=[
            _leg(0, "748001", "prop", "OVER", pid=808967, pname="Yamamoto",
                 line=6.5, posted="2026-05-18T22:10:00Z"),
            _leg(1, "748002", "prop", "OVER", pid=668678, pname="Gallen",
                 line=3.5, posted="2026-05-18T23:40:00Z"),
        ],
    )

    def fake_boxscore(game_pk):
        return {
            "748001": {"pitchers_by_id": {808967: {"strikeOuts": 8, "fullName": "Yoshinobu Yamamoto"}}},
            "748002": {"pitchers_by_id": {668678: {"strikeOuts": 6, "fullName": "Zac Gallen"}}},
        }[str(game_pk)]

    def fake_content(game_pk):
        if str(game_pk) == "748002":
            return {"photo_url": "https://img.mlbstatic.com/x.jpg",
                    "clip_url": "https://mlb-cuts-diamond.mlb.com/y.mp4"}
        return {"photo_url": None, "clip_url": None}

    monkeypatch.setattr("core.parlay_palace_enrich.fetch_boxscore", fake_boxscore)
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_content", fake_content)

    body = enrich_candidate(cand)
    # clincher = last leg by posted_at -> Gallen (leg_index 1)
    assert body["clincher"]["player_name"] == "Gallen"
    assert body["hero"]["kind"] == "photo"
    assert body["hero"]["url"] == "https://img.mlbstatic.com/x.jpg"
    leg0 = body["legs"][0]
    assert leg0["result_text"] == "8 K"
    assert leg0["headshot_url"] == "https://midfield.mlbstatic.com/v1/people/808967/spots/120"
    assert body["media_attribution"] == "Media: MLB Advanced Media"

def test_enrich_no_media_returns_no_hero(monkeypatch):
    cand = ParlayCandidate(
        parlay_id=9, capper_id=1, capper_handle="x", capper_display_name="X",
        capper_image_url=None, combined_odds=300, profit_units=4.0, leg_count=2,
        graded_at=None,
        legs=[_leg(0, "1", "ml", "NYY", posted="2026-05-18T18:00:00Z"),
              _leg(1, "2", "ml", "LAD", posted="2026-05-18T22:00:00Z")],
    )
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_boxscore",
                        lambda g: {"pitchers_by_id": {}})
    monkeypatch.setattr("core.parlay_palace_enrich.fetch_content",
                        lambda g: {"photo_url": None, "clip_url": None})
    body = enrich_candidate(cand)
    assert body["hero"] is None  # admin must not publish; gate enforces quality
```

- [ ] **Step 2: Run it, verify failure**

Run: `python -m pytest tests/core/test_parlay_palace_enrich.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/parlay_palace_enrich.py`**

```python
# core/parlay_palace_enrich.py
"""Enrich a ParlayCandidate with per-leg results + hotlinked MLB media.
MEDIA IS HOTLINKED ONLY: we store MLB URL strings, never the bytes."""
from __future__ import annotations
import urllib.request, json
from core.parlay_palace_query import ParlayCandidate

MEDIA_ATTRIBUTION = "Media: MLB Advanced Media"
_BASE = "https://statsapi.mlb.com/api/v1/game"


def _get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "TailSlipsBot/1.0"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_boxscore(game_pk: str) -> dict:
    """Return {'pitchers_by_id': {id: {'strikeOuts': int, 'fullName': str}}}."""
    data = _get_json(f"{_BASE}/{game_pk}/boxscore")
    out: dict = {"pitchers_by_id": {}}
    for side in ("home", "away"):
        players = (data.get("teams", {}).get(side, {}) or {}).get("players", {}) or {}
        for key, p in players.items():
            pid = (p.get("person") or {}).get("id")
            pit = ((p.get("stats") or {}).get("pitching") or {})
            if pid is not None and pit:
                out["pitchers_by_id"][pid] = {
                    "strikeOuts": pit.get("strikeOuts"),
                    "fullName": (p.get("person") or {}).get("fullName"),
                }
    return out


def fetch_content(game_pk: str) -> dict:
    """Return {'photo_url': str|None, 'clip_url': str|None} (hotlinked)."""
    try:
        data = _get_json(f"{_BASE}/{game_pk}/content")
    except Exception:
        return {"photo_url": None, "clip_url": None}
    photo_url = None
    cuts = (((data.get("editorial") or {}).get("recap") or {})
            .get("mlb") or {}).get("photo", {}).get("cuts")
    if isinstance(cuts, dict) and cuts:
        widest = max(cuts.values(), key=lambda c: c.get("width", 0) or 0)
        photo_url = widest.get("src")
    elif isinstance(cuts, list) and cuts:
        widest = max(cuts, key=lambda c: c.get("width", 0) or 0)
        photo_url = widest.get("src")
    clip_url = None
    items = (((data.get("highlights") or {}).get("highlights") or {})
             .get("items") or [])
    for it in items:
        if it.get("type") != "video":
            continue
        mp4 = [pb for pb in (it.get("playbacks") or [])
               if str(pb.get("url", "")).endswith(".mp4")]
        if mp4:
            pref = next((pb for pb in mp4 if pb.get("name") == "mp4Avc"), mp4[0])
            clip_url = pref.get("url")
            break
    return {"photo_url": photo_url, "clip_url": clip_url}


def headshot_url(player_id: int | None) -> str | None:
    if player_id is None:
        return None
    return f"https://midfield.mlbstatic.com/v1/people/{player_id}/spots/120"


def _result_text(leg, box: dict) -> str | None:
    if leg.player_id is not None:
        rec = box.get("pitchers_by_id", {}).get(leg.player_id)
        if rec and rec.get("strikeOuts") is not None:
            return f"{rec['strikeOuts']} K"
    return None


def enrich_candidate(cand: ParlayCandidate) -> dict:
    legs_out: list[dict] = []
    box_cache: dict[str, dict] = {}
    content_cache: dict[str, dict] = {}

    def box_for(gid: str) -> dict:
        if gid not in box_cache:
            try:
                box_cache[gid] = fetch_boxscore(gid)
            except Exception:
                box_cache[gid] = {"pitchers_by_id": {}}
        return box_cache[gid]

    def content_for(gid: str) -> dict:
        if gid not in content_cache:
            content_cache[gid] = fetch_content(gid)
        return content_cache[gid]

    # clincher = last leg by posted_at (fallback: highest leg_index)
    clincher = sorted(
        cand.legs,
        key=lambda l: (l.posted_at or "", l.leg_index),
    )[-1]

    for leg in cand.legs:
        box = box_for(leg.game_id) if leg.game_id else {"pitchers_by_id": {}}
        legs_out.append({
            "leg_index": leg.leg_index,
            "game_id": leg.game_id,
            "market": leg.market,
            "selection": leg.selection,
            "line": leg.line,
            "odds_taken": leg.odds_taken,
            "player_name": leg.player_name,
            "player_id": leg.player_id,
            "headshot_url": headshot_url(leg.player_id),
            "result_text": _result_text(leg, box),
            "is_clincher": leg.leg_index == clincher.leg_index,
        })

    hero = None
    hero_kind = None
    if clincher.game_id:
        c = content_for(clincher.game_id)
        if c.get("photo_url"):
            hero, hero_kind = {"kind": "photo", "url": c["photo_url"]}, "photo"
        elif c.get("clip_url"):
            hero, hero_kind = {"kind": "clip", "url": c["clip_url"]}, "clip"

    return {
        "legs": legs_out,
        "clincher": {
            "leg_index": clincher.leg_index,
            "player_name": clincher.player_name,
            "selection": clincher.selection,
            "game_id": clincher.game_id,
        },
        "hero": hero,
        "hero_kind": hero_kind,
        "media_attribution": MEDIA_ATTRIBUTION,
    }
```

- [ ] **Step 4: Run it, verify pass**

Run: `python -m pytest tests/core/test_parlay_palace_enrich.py -v`
Expected: PASS (network functions are monkeypatched; no live calls in tests).

- [ ] **Step 5: Commit**

```bash
git add core/parlay_palace_enrich.py tests/core/test_parlay_palace_enrich.py
git commit -m "feat(parlay-palace): MLB boxscore + hotlinked media enrichment"
```

---

# PHASE 4 — Backend: LLM recap

### Task 4: Recap blurb generator

**Files:**
- Create: `BE: core/parlay_palace_recap.py`
- Test: `BE: tests/core/test_parlay_palace_recap.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/core/test_parlay_palace_recap.py
from core.parlay_palace_recap import build_recap_prompt, sanitize_blurb

def test_prompt_forbids_em_dashes_and_includes_facts():
    sys, user = build_recap_prompt(
        capper_handle="lottolocks", combined_odds=2598, units=25.98,
        legs=[{"player_name": "Yamamoto", "result_text": "8 K",
               "selection": "OVER", "line": 6.5},
              {"player_name": "Gallen", "result_text": "6 K",
               "selection": "OVER", "line": 3.5}],
        clincher_name="Gallen",
    )
    assert "do not use em dashes or double hyphens" in sys.lower()
    assert "lottolocks" in user
    assert "2598" in user and "Gallen" in user

def test_sanitize_strips_dashes():
    assert "—" not in sanitize_blurb("Big win — huge")
    assert "--" not in sanitize_blurb("Big win -- huge")
    assert sanitize_blurb("Big win -- huge") == "Big win, huge"
```

- [ ] **Step 2: Run it, verify failure**

Run: `python -m pytest tests/core/test_parlay_palace_recap.py -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `core/parlay_palace_recap.py`**

```python
# core/parlay_palace_recap.py
"""LLM recap blurb for a Parlay Palace entry. Reuses the Anthropic client
pattern from core/llm_parser.py."""
from __future__ import annotations
import os

_MODEL = "claude-haiku-4-5-20251001"
_client = None


def _get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def sanitize_blurb(text: str) -> str:
    out = text.replace(" -- ", ", ").replace("--", ", ")
    out = out.replace(" — ", ", ").replace("—", ", ")
    return out.strip()


def build_recap_prompt(capper_handle, combined_odds, units, legs, clincher_name):
    system = (
        "You write a punchy 2 to 3 sentence recap of a winning sports betting "
        "parlay for a public hall-of-fame page. Plain, confident, factual. "
        "Do not hype with fake stats. Do not use em dashes or double hyphens "
        "anywhere in the output. Use periods or commas instead."
    )
    leg_lines = "\n".join(
        f"- {l.get('player_name') or l.get('selection')} "
        f"{l.get('selection','')} {l.get('line','')} -> {l.get('result_text') or 'won'}"
        for l in legs
    )
    user = (
        f"Capper: @{capper_handle}\n"
        f"Combined odds: +{combined_odds}\n"
        f"Profit: +{units:.2f} units on 1 unit\n"
        f"Legs:\n{leg_lines}\n"
        f"The leg that clinched it: {clincher_name}\n\n"
        "Write the recap."
    )
    return system, user


def generate_recap(capper_handle, combined_odds, units, legs, clincher_name) -> str:
    system, user = build_recap_prompt(
        capper_handle, combined_odds, units, legs, clincher_name)
    msg = _get_client().messages.create(
        model=_MODEL, max_tokens=220,
        system=system, messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    return sanitize_blurb(text)
```

- [ ] **Step 4: Run it, verify pass**

Run: `python -m pytest tests/core/test_parlay_palace_recap.py -v`
Expected: PASS (only `build_recap_prompt`/`sanitize_blurb` are tested; no live API call).

- [ ] **Step 5: Commit**

```bash
git add core/parlay_palace_recap.py tests/core/test_parlay_palace_recap.py
git commit -m "feat(parlay-palace): LLM recap blurb generator"
```

---

# PHASE 5 — Backend: API endpoints

### Task 5: Parlay Palace router (admin + public)

**Files:**
- Create: `BE: api/routers/parlay_palace.py`
- Modify: `BE: api/main.py` (register router)
- Test: `BE: tests/api/test_parlay_palace_api.py`

Endpoints:
- `GET  /api/admin/parlay-palace/candidates` (auth) — list candidates from `build_candidates`, merged with existing entry status.
- `POST /api/admin/parlay-palace/{parlay_id}/enrich` (auth) — run enrichment + recap, upsert row as `draft`.
- `PATCH /api/admin/parlay-palace/{parlay_id}` (auth) — set `hero_kind`/`hero_url`, `recap_blurb`, `title`.
- `POST /api/admin/parlay-palace/{parlay_id}/publish` (auth) — set `status='published'`, `published_at=now`, generate `slug`.
- `POST /api/admin/parlay-palace/{parlay_id}/unpublish` (auth) — set `status='draft'`, clear `published_at` (the media kill switch).
- `GET  /api/public/parlay-palace` — published list (year-scoped, sortable).
- `GET  /api/public/parlay-palace/{slug}` — single published entry.

- [ ] **Step 1: Write the failing test**

```python
# tests/api/test_parlay_palace_api.py
from fastapi.testclient import TestClient
from api.main import app
client = TestClient(app)

def test_public_list_route_exists():
    r = client.get("/api/public/parlay-palace")
    assert r.status_code in (200, 500)  # 200 if DB reachable; route must exist
    assert r.status_code != 404

def test_admin_candidates_requires_auth():
    r = client.get("/api/admin/parlay-palace/candidates")
    assert r.status_code in (401, 403)

def test_slugify():
    from api.routers.parlay_palace import make_slug
    s = make_slug("lottolocks", 2, "2026-05-18")
    assert s == "lottolocks-5leg-2026-05-18-2" or s.startswith("lottolocks-")
```

- [ ] **Step 2: Run it, verify failure**

Run: `python -m pytest tests/api/test_parlay_palace_api.py -v`
Expected: FAIL — route 404 / import error.

- [ ] **Step 3: Implement `api/routers/parlay_palace.py`**

```python
# api/routers/parlay_palace.py
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
from database.connection import get_supabase
from api.routers.cron import verify_cron_secret
from core.parlay_palace_query import build_candidates
from core.parlay_palace_enrich import enrich_candidate
from core.parlay_palace_recap import generate_recap

router = APIRouter()


def make_slug(handle: str, leg_count: int, slate_date: str) -> str:
    base = f"{(handle or 'capper').lower()}-{leg_count}leg-{slate_date}"
    return base


def _entry_public(row: dict) -> dict:
    return {
        "slug": row["slug"], "title": row.get("title"),
        "capper_handle": (row.get("body") or {}).get("capper_handle"),
        "recap_blurb": row.get("recap_blurb"),
        "units_profit": row.get("units_profit"),
        "combined_odds": row.get("combined_odds"),
        "leg_count": row.get("leg_count"),
        "slate_date": row.get("slate_date"),
        "hero_kind": row.get("hero_kind"), "hero_url": row.get("hero_url"),
        "body": row.get("body"), "published_at": row.get("published_at"),
    }


@router.get("/api/admin/parlay-palace/candidates")
async def admin_candidates(request: Request):
    verify_cron_secret(request)
    db = get_supabase()
    cands = build_candidates(db)
    existing = {
        e["parlay_id"]: e["status"]
        for e in (db.table("parlay_palace_entries")
                  .select("parlay_id, status").execute().data or [])
    }
    return {"candidates": [{
        "parlay_id": c.parlay_id, "capper_handle": c.capper_handle,
        "capper_display_name": c.capper_display_name,
        "combined_odds": c.combined_odds, "profit_units": c.profit_units,
        "leg_count": c.leg_count, "graded_at": c.graded_at,
        "status": existing.get(c.parlay_id, "candidate"),
    } for c in cands]}


@router.post("/api/admin/parlay-palace/{parlay_id}/enrich")
async def admin_enrich(parlay_id: int, request: Request):
    verify_cron_secret(request)
    db = get_supabase()
    cand = next((c for c in build_candidates(db) if c.parlay_id == parlay_id), None)
    if cand is None:
        raise HTTPException(404, "parlay not a winning candidate")
    body = enrich_candidate(cand)
    body["capper_handle"] = cand.capper_handle
    body["capper_display_name"] = cand.capper_display_name
    body["capper_image_url"] = cand.capper_image_url
    blurb = generate_recap(
        cand.capper_handle, cand.combined_odds or 0, cand.profit_units,
        body["legs"], (body["clincher"] or {}).get("player_name") or "",
    )
    slate_date = (cand.graded_at or "")[:10] or datetime.now(
        timezone.utc).date().isoformat()
    title = (f"@{cand.capper_handle} hit a {cand.leg_count}-leg "
             f"+{cand.combined_odds} parlay")
    payload = {
        "parlay_id": parlay_id, "capper_id": cand.capper_id,
        "type": "parlay_palace", "status": "draft",
        "slug": make_slug(cand.capper_handle, cand.leg_count, slate_date),
        "title": title, "recap_blurb": blurb, "body": body,
        "hero_kind": body.get("hero_kind"),
        "hero_url": (body.get("hero") or {}).get("url"),
        "seo_title": title,
        "seo_description": blurb[:155],
        "units_profit": cand.profit_units, "combined_odds": cand.combined_odds,
        "leg_count": cand.leg_count, "slate_date": slate_date,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db.table("parlay_palace_entries").upsert(
        payload, on_conflict="parlay_id").execute()
    return {"ok": True, "slug": payload["slug"], "hero_kind": payload["hero_kind"]}


@router.patch("/api/admin/parlay-palace/{parlay_id}")
async def admin_patch(parlay_id: int, request: Request):
    verify_cron_secret(request)
    patch = await request.json()
    allowed = {"hero_kind", "hero_url", "recap_blurb", "title",
               "seo_title", "seo_description"}
    upd = {k: v for k, v in patch.items() if k in allowed}
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    db = get_supabase()
    db.table("parlay_palace_entries").update(upd).eq(
        "parlay_id", parlay_id).execute()
    return {"ok": True}


@router.post("/api/admin/parlay-palace/{parlay_id}/publish")
async def admin_publish(parlay_id: int, request: Request):
    verify_cron_secret(request)
    db = get_supabase()
    row = (db.table("parlay_palace_entries").select("hero_url")
           .eq("parlay_id", parlay_id).execute().data or [])
    if not row or not row[0].get("hero_url"):
        raise HTTPException(400, "cannot publish without a hero asset")
    db.table("parlay_palace_entries").update({
        "status": "published",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("parlay_id", parlay_id).execute()
    return {"ok": True}


@router.post("/api/admin/parlay-palace/{parlay_id}/unpublish")
async def admin_unpublish(parlay_id: int, request: Request):
    verify_cron_secret(request)
    db = get_supabase()
    db.table("parlay_palace_entries").update({
        "status": "draft", "published_at": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("parlay_id", parlay_id).execute()
    return {"ok": True}


@router.get("/api/public/parlay-palace")
async def public_list(request: Request, year: int | None = None,
                       sort: str = "recent"):
    db = get_supabase()
    q = (db.table("parlay_palace_entries")
         .select("slug,title,recap_blurb,units_profit,combined_odds,"
                 "leg_count,slate_date,hero_kind,hero_url,body,published_at")
         .eq("status", "published"))
    rows = q.execute().data or []
    if year is not None:
        rows = [r for r in rows if str(r.get("slate_date", ""))[:4] == str(year)]
    key = (lambda r: r.get("units_profit") or 0) if sort == "units" \
        else (lambda r: r.get("published_at") or "")
    rows.sort(key=key, reverse=True)
    return {"entries": [_entry_public(r) for r in rows]}


@router.get("/api/public/parlay-palace/{slug}")
async def public_detail(slug: str):
    db = get_supabase()
    rows = (db.table("parlay_palace_entries")
            .select("slug,title,recap_blurb,units_profit,combined_odds,"
                    "leg_count,slate_date,hero_kind,hero_url,body,published_at")
            .eq("slug", slug).eq("status", "published").execute().data or [])
    if not rows:
        raise HTTPException(404, "not found")
    return {"entry": _entry_public(rows[0])}
```

- [ ] **Step 4: Register the router in `api/main.py`**

Add alongside the other `from api.routers.X import router as X_router` imports and `app.include_router(...)` calls:

```python
from api.routers.parlay_palace import router as parlay_palace_router
app.include_router(parlay_palace_router)
```

- [ ] **Step 5: Run it, verify pass**

Run: `python -m pytest tests/api/test_parlay_palace_api.py -v`
Expected: PASS (routes resolve; auth rejects unauthenticated admin calls).

- [ ] **Step 6: Commit**

```bash
git add api/routers/parlay_palace.py api/main.py tests/api/test_parlay_palace_api.py
git commit -m "feat(parlay-palace): admin + public API endpoints"
```

- [ ] **Step 7: Deploy backend, smoke-test live**

Push triggers Railway deploy. After deploy:
```bash
curl -s "https://fadeai-platform-production.up.railway.app/api/public/parlay-palace" | head -c 300
```
Expected: `{"entries":[]}` (empty until something is published).

---

# PHASE 6 — Frontend: data layer

### Task 6: Types + fetchers

**Files:**
- Modify: `FE: src/lib/types.ts`
- Modify: `FE: src/lib/api.ts`
- Test: `FE: tests/lib/api.parlayPalace.test.ts`

- [ ] **Step 1: Add types to `src/lib/types.ts`**

Append:

```typescript
export interface PalaceLeg {
  leg_index: number;
  game_id: string | null;
  market: string | null;
  selection: string | null;
  line: number | null;
  odds_taken: number | null;
  player_name: string | null;
  player_id: number | null;
  headshot_url: string | null;
  result_text: string | null;
  is_clincher: boolean;
}

export interface PalaceBody {
  legs: PalaceLeg[];
  clincher: { leg_index: number; player_name: string | null;
              selection: string | null; game_id: string | null } | null;
  hero: { kind: "photo" | "clip" | "headshot"; url: string } | null;
  hero_kind: "photo" | "clip" | "headshot" | null;
  media_attribution: string;
  capper_handle: string | null;
  capper_display_name: string | null;
  capper_image_url: string | null;
}

export interface PalaceEntry {
  slug: string;
  title: string | null;
  capper_handle: string | null;
  recap_blurb: string | null;
  units_profit: number | null;
  combined_odds: number | null;
  leg_count: number | null;
  slate_date: string | null;
  hero_kind: "photo" | "clip" | "headshot" | null;
  hero_url: string | null;
  body: PalaceBody;
  published_at: string | null;
}

export interface PalaceCandidate {
  parlay_id: number;
  capper_handle: string | null;
  capper_display_name: string | null;
  combined_odds: number | null;
  profit_units: number;
  leg_count: number;
  graded_at: string | null;
  status: "candidate" | "draft" | "published";
}
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/lib/api.parlayPalace.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPalaceList, fetchPalaceEntry } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

describe("fetchPalaceList", () => {
  it("hits /api/public/parlay-palace and returns entries", async () => {
    const sample = { entries: [{ slug: "x-2leg-2026-05-18" }] };
    const spy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true, json: async () => sample,
    } as unknown as Response);
    const out = await fetchPalaceList();
    expect(out).toEqual(sample.entries);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/parlay-palace"),
      expect.any(Object));
  });
});

describe("fetchPalaceEntry", () => {
  it("returns null on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false, status: 404,
    } as unknown as Response);
    expect(await fetchPalaceEntry("missing")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it, verify failure**

Run: `npm run test -- tests/lib/api.parlayPalace.test.ts`
Expected: FAIL — `fetchPalaceList` not exported.

- [ ] **Step 4: Add fetchers to `src/lib/api.ts`**

Append (mirrors the existing `fetchWithRetry` + `withKvCache` pattern in that file; reuse the file's existing `fetchWithRetry`, `withKvCache`, `API_BASE`, `REVALIDATE_SECONDS` symbols):

```typescript
import type { PalaceEntry, PalaceCandidate } from "@/lib/types";

const PALACE_TTL_SEC = 30;

export async function fetchPalaceList(
  opts: { year?: number; sort?: "recent" | "units" } = {},
): Promise<PalaceEntry[]> {
  const p = new URLSearchParams();
  if (opts.year) p.set("year", String(opts.year));
  if (opts.sort) p.set("sort", opts.sort);
  const cacheKey = `pp:list:v1:${p.toString()}`;
  return withKvCache<PalaceEntry[]>(cacheKey, PALACE_TTL_SEC, async () => {
    const res = await fetchWithRetry(
      `${API_BASE}/api/public/parlay-palace?${p}`,
      { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) throw new Error(`Palace list failed: ${res.status}`);
    const body = (await res.json()) as { entries: PalaceEntry[] };
    return body.entries ?? [];
  });
}

export async function fetchPalaceEntry(
  slug: string,
): Promise<PalaceEntry | null> {
  const res = await fetchWithRetry(
    `${API_BASE}/api/public/parlay-palace/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE_SECONDS } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Palace entry failed: ${res.status}`);
  const body = (await res.json()) as { entry: PalaceEntry };
  return body.entry ?? null;
}

async function adminPalaceHeaders(): Promise<HeadersInit> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  return { "Content-Type": "application/json",
           Authorization: `Bearer ${secret}` };
}

export async function fetchPalaceCandidates(): Promise<PalaceCandidate[]> {
  const res = await fetch(
    `${API_BASE}/api/admin/parlay-palace/candidates`,
    { headers: await adminPalaceHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Palace candidates failed: ${res.status}`);
  const body = (await res.json()) as { candidates: PalaceCandidate[] };
  return body.candidates ?? [];
}
```

- [ ] **Step 5: Run it, verify pass**

Run: `npm run test -- tests/lib/api.parlayPalace.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/api.ts tests/lib/api.parlayPalace.test.ts
git commit -m "feat(parlay-palace): frontend types + data fetchers"
```

---

# PHASE 7 — Frontend: UI components

### Task 7: `LegRow` and `PalaceCard` components

**Files:**
- Create: `FE: src/components/parlay-palace/LegRow.tsx`
- Create: `FE: src/components/parlay-palace/PalaceCard.tsx`
- Test: `FE: tests/components/LegRow.test.tsx`, `FE: tests/components/PalaceCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/components/LegRow.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegRow } from "@/components/parlay-palace/LegRow";
import type { PalaceLeg } from "@/lib/types";

const leg: PalaceLeg = {
  leg_index: 4, game_id: "748002", market: "prop", selection: "OVER",
  line: 3.5, odds_taken: -152, player_name: "Zac Gallen", player_id: 668678,
  headshot_url: "https://midfield.mlbstatic.com/v1/people/668678/spots/120",
  result_text: "6 K", is_clincher: true,
};

describe("LegRow", () => {
  it("renders player, result, odds, and clincher marker", () => {
    render(<LegRow leg={leg} />);
    expect(screen.getByText(/Zac Gallen/)).toBeInTheDocument();
    expect(screen.getByText("6 K")).toBeInTheDocument();
    expect(screen.getByText("-152")).toBeInTheDocument();
    expect(screen.getByText(/clinch/i)).toBeInTheDocument();
  });
});
```

```typescript
// tests/components/PalaceCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import type { PalaceEntry } from "@/lib/types";

const entry = {
  slug: "lottolocks-5leg-2026-05-18", title: "t",
  capper_handle: "lottolocks", recap_blurb: "r", units_profit: 25.98,
  combined_odds: 2598, leg_count: 5, slate_date: "2026-05-18",
  hero_kind: "photo", hero_url: "https://img.mlbstatic.com/x.jpg",
  body: {} as PalaceEntry["body"], published_at: "2026-05-18T05:00:00Z",
} as PalaceEntry;

describe("PalaceCard", () => {
  it("links to the detail page and shows units + odds", () => {
    render(<PalaceCard entry={entry} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href",
      "/parlay-palace/lottolocks-5leg-2026-05-18");
    expect(screen.getByText("+25.98u")).toBeInTheDocument();
    expect(screen.getByText(/\+2598/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them, verify failure**

Run: `npm run test -- tests/components/LegRow.test.tsx tests/components/PalaceCard.test.tsx`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement `src/components/parlay-palace/LegRow.tsx`**

```tsx
import type { PalaceLeg } from "@/lib/types";

export function LegRow({ leg }: { leg: PalaceLeg }) {
  const odds =
    leg.odds_taken == null
      ? null
      : `${leg.odds_taken > 0 ? "+" : ""}${leg.odds_taken}`;
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-[var(--color-border)] last:border-b-0">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden shrink-0">
        {leg.headshot_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={leg.headshot_url} alt={leg.player_name ?? ""}
               width={40} height={40} className="w-10 h-10 object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--color-text)] truncate">
          {leg.player_name ?? leg.selection}
          {leg.line != null && (
            <span className="text-[var(--color-text-muted)] font-medium">
              {" "}{leg.selection} {leg.line}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
          {leg.is_clincher ? "clincher" : `Leg ${leg.leg_index + 1}`}
        </div>
      </div>
      {leg.result_text && (
        <div className="text-[12px] font-bold text-[var(--color-pos)] shrink-0">
          {leg.result_text}&nbsp;✓
        </div>
      )}
      {odds && (
        <div className="text-[12px] font-bold text-[var(--color-text-soft)] shrink-0 w-12 text-right">
          {odds}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/parlay-palace/PalaceCard.tsx`**

```tsx
import Link from "next/link";
import type { PalaceEntry } from "@/lib/types";
import { formatUnits } from "@/lib/formatters";

export function PalaceCard({ entry }: { entry: PalaceEntry }) {
  return (
    <Link
      href={`/parlay-palace/${entry.slug}`}
      className="block rounded-lg overflow-hidden border border-[rgba(25,245,124,0.18)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-h)] transition-colors"
    >
      <div className="relative h-40 bg-[linear-gradient(125deg,#1d3a2b,#0c0f0d)]">
        {entry.hero_url && entry.hero_kind !== "clip" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.hero_url} alt="" className="w-full h-40 object-cover" />
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-[linear-gradient(transparent,rgba(10,10,12,0.85))]">
          <div className="text-[var(--color-pos)] font-extrabold text-[26px] leading-none tabular-nums">
            {formatUnits(entry.units_profit ?? 0)}
            <span className="text-[13px] opacity-70">u</span>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-[var(--color-text)]">
          @{entry.capper_handle}
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {entry.leg_count}-leg · +{entry.combined_odds} · {entry.slate_date}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm run test -- tests/components/LegRow.test.tsx tests/components/PalaceCard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/parlay-palace tests/components/LegRow.test.tsx tests/components/PalaceCard.test.tsx
git commit -m "feat(parlay-palace): LegRow + PalaceCard components"
```

---

### Task 8: `ParlayHero` component

**Files:**
- Create: `FE: src/components/parlay-palace/ParlayHero.tsx`

- [ ] **Step 1: Read the Next.js image guidance**

Run: open `D:/capwatch-web/node_modules/next/dist/docs/` and read the image / `next/og` notes. Confirm whether `<img>` vs `next/image` is required for arbitrary remote hosts (we hotlink `img.mlbstatic.com`, not in `next.config.ts` `remotePatterns`, so a plain `<img>` is correct here; do not add MLB hosts to `remotePatterns` — that would route bytes through our optimizer = effectively rehosting).

- [ ] **Step 2: Implement `src/components/parlay-palace/ParlayHero.tsx`**

```tsx
import type { PalaceEntry } from "@/lib/types";
import { formatUnits } from "@/lib/formatters";

export function ParlayHero({ entry }: { entry: PalaceEntry }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-[rgba(25,245,124,0.18)]">
      <div className="relative min-h-[280px] flex flex-col justify-end bg-[linear-gradient(125deg,#1d3a2b,#0c0f0d)]">
        {entry.hero_url && entry.hero_kind === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.hero_url} alt=""
               className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {entry.hero_url && entry.hero_kind === "clip" ? (
          <video src={entry.hero_url} controls playsInline
                 className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div className="relative p-5 bg-[linear-gradient(transparent,rgba(10,10,12,0.9))]">
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-pos)] font-bold">
            Parlay Palace · {entry.slate_date}
          </div>
          <div className="text-[var(--color-pos)] font-extrabold text-[48px] leading-none tabular-nums mt-3">
            {formatUnits(entry.units_profit ?? 0)}
            <span className="text-[18px] opacity-70">u</span>
          </div>
          <div className="text-[14px] font-bold text-[var(--color-text)] mt-2">
            {entry.leg_count}-leg parlay{" "}
            <span className="text-[var(--color-text-muted)] font-medium">
              · +{entry.combined_odds} · @{entry.capper_handle}
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 py-2 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
        {entry.body?.media_attribution ?? "Media: MLB Advanced Media"}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/parlay-palace/ParlayHero.tsx
git commit -m "feat(parlay-palace): ParlayHero with media attribution"
```

---

# PHASE 8 — Frontend: public pages

### Task 9: Gallery index `/parlay-palace`

**Files:**
- Create: `FE: src/app/parlay-palace/page.tsx`

- [ ] **Step 1: Read routing guidance**

Read `D:/capwatch-web/node_modules/next/dist/docs/` App Router + `generateMetadata` notes. Confirm the `searchParams`/`params` Promise convention used by `src/app/cappers/page.tsx`.

- [ ] **Step 2: Implement `src/app/parlay-palace/page.tsx`**

```tsx
import type { Metadata } from "next";
import { fetchPalaceList } from "@/lib/api";
import { PalaceCard } from "@/components/parlay-palace/PalaceCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode } from "@/lib/jsonld";

export const revalidate = 60;
export const maxDuration = 30;

export const metadata: Metadata = {
  title: "Parlay Palace · Biggest winning MLB parlays | TailSlips",
  description:
    "Every big winning MLB parlay tracked on TailSlips. Real cappers, real receipts, graded against final outcomes.",
  alternates: { canonical: "/parlay-palace" },
  openGraph: {
    title: "Parlay Palace | TailSlips",
    description: "The biggest winning MLB parlays, graded and verified.",
    url: "/parlay-palace",
  },
};

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function ParlayPalacePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const sort = sp.sort === "units" ? "units" : "recent";
  const entries = await fetchPalaceList({ sort });
  return (
    <main className="max-w-[1100px] mx-auto px-5 pb-16">
      <JsonLd data={breadcrumbNode([
        { name: "Parlay Palace", path: "/parlay-palace" }])} />
      <header className="pt-10 pb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-2">
          TailSlips
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none">
          Parlay Palace
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] mt-2 max-w-[64ch]">
          The biggest winning MLB parlays tracked on TailSlips. Every leg
          graded against final box scores.
        </p>
        <div className="flex gap-2 mt-4 text-[12px]">
          <a href="/parlay-palace?sort=recent"
             className={sort === "recent" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}>Recent</a>
          <a href="/parlay-palace?sort=units"
             className={sort === "units" ? "text-[var(--color-pos)] font-bold" : "text-[var(--color-text-muted)]"}>Biggest</a>
        </div>
      </header>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-12 text-center text-[14px] text-[var(--color-text-soft)]">
          No parlays in the Palace yet. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((e) => <PalaceCard key={e.slug} entry={e} />)}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`, open `http://localhost:3000/parlay-palace`.
Expected: header + empty state (no published entries yet), no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/parlay-palace/page.tsx
git commit -m "feat(parlay-palace): public gallery index page"
```

---

### Task 10: Detail page `/parlay-palace/[slug]`

**Files:**
- Create: `FE: src/app/parlay-palace/[slug]/page.tsx`

- [ ] **Step 1: Implement `src/app/parlay-palace/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPalaceEntry } from "@/lib/api";
import { ParlayHero } from "@/components/parlay-palace/ParlayHero";
import { LegRow } from "@/components/parlay-palace/LegRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbNode, parlayPalaceArticleNode } from "@/lib/jsonld";

export const revalidate = 60;
export const maxDuration = 30;

interface PageProps { params: Promise<{ slug: string }>; }

export async function generateMetadata(
  { params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await fetchPalaceEntry(slug);
  if (!entry) return { title: "Parlay Palace | TailSlips" };
  const title = entry.seo_title_fallback();
  return {
    title: `${entry.title ?? "Winning parlay"} | TailSlips`,
    description: entry.recap_blurb ?? undefined,
    alternates: { canonical: `/parlay-palace/${slug}` },
    openGraph: {
      title: entry.title ?? "Winning parlay",
      description: entry.recap_blurb ?? undefined,
      url: `/parlay-palace/${slug}`,
      images: [{ url: `/parlay-palace/${slug}/opengraph-image`,
                 width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image",
               images: [`/parlay-palace/${slug}/opengraph-image`] },
  };
}

export default async function PalaceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = await fetchPalaceEntry(slug);
  if (!entry) notFound();
  const legs = [...(entry.body?.legs ?? [])].sort(
    (a, b) => a.leg_index - b.leg_index);
  return (
    <main className="max-w-[560px] mx-auto px-4 pb-16">
      <JsonLd data={[
        breadcrumbNode([
          { name: "Parlay Palace", path: "/parlay-palace" },
          { name: entry.title ?? slug, path: `/parlay-palace/${slug}` }]),
        parlayPalaceArticleNode(entry),
      ]} />
      <div className="pt-8">
        <ParlayHero entry={entry} />
      </div>
      {entry.recap_blurb && (
        <p className="text-[13px] leading-relaxed text-[var(--color-text-soft)] mt-5">
          {entry.recap_blurb}
        </p>
      )}
      <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4">
        {legs.map((l) => <LegRow key={l.leg_index} leg={l} />)}
      </div>
      {entry.capper_handle && (
        <Link
          href={`/cappers/${entry.capper_handle}`}
          className="block text-center mt-6 rounded-lg bg-[var(--color-pos)] text-black font-extrabold py-3 text-[13px]"
        >
          See @{entry.capper_handle} on TailSlips →
        </Link>
      )}
    </main>
  );
}
```

> Replace `entry.seo_title_fallback()` usage: that helper does not exist. Delete the `const title = entry.seo_title_fallback();` line entirely (it is unused). The metadata title uses `entry.title` directly.

- [ ] **Step 2: Fix the metadata helper slip**

Edit the file: remove the line `const title = entry.seo_title_fallback();` so `generateMetadata` reads:

```tsx
  const entry = await fetchPalaceEntry(slug);
  if (!entry) return { title: "Parlay Palace | TailSlips" };
  return {
    title: `${entry.title ?? "Winning parlay"} | TailSlips`,
```

- [ ] **Step 3: Manual verify (after first publish exists)**

Run: `npm run dev`; visit a published slug. Until Phase 10 publishes one, expect `notFound()` (404) for any slug, which is correct.

- [ ] **Step 4: Commit**

```bash
git add "src/app/parlay-palace/[slug]/page.tsx"
git commit -m "feat(parlay-palace): detail page with action-shot hero"
```

---

# PHASE 9 — Frontend: OG image, sitemap, JSON-LD

### Task 11: Per-entry OG image

**Files:**
- Create: `FE: src/app/parlay-palace/[slug]/_pp-og-renderer.tsx`
- Create: `FE: src/app/parlay-palace/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Read `next/og` guidance**

Read `D:/capwatch-web/node_modules/next/dist/docs/` for `ImageResponse`. Mirror `src/app/slate/_slate-og-renderer.tsx` (fetch live data, JSX → PNG, fallback chain, cache headers).

- [ ] **Step 2: Implement `_pp-og-renderer.tsx`**

```tsx
import { ImageResponse } from "next/og";
import { fetchPalaceEntry } from "@/lib/api";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Winning MLB parlay on TailSlips";

const BG = "#0a0a0c";
const POS = "#19f57c";
const TEXT = "#fafafa";
const MUTED = "#71717a";
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64");

async function heroDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(url, { signal: ctrl.signal,
      headers: { "User-Agent": "TailSlipsBot/1.0 (+https://tailslips.com)" } });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 3_000_000) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function renderPalaceOg(slug: string): Promise<Response> {
  let entry = null;
  try { entry = await fetchPalaceEntry(slug); } catch {}
  if (!entry) {
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30" } });
  }
  // hero is decorative only; the card stands without it
  const heroUri = entry.hero_kind === "photo"
    ? await heroDataUri(entry.hero_url) : null;
  const units = (entry.units_profit ?? 0).toFixed(2);
  try {
    const img = new ImageResponse((
      <div style={{ width: "100%", height: "100%", display: "flex",
        flexDirection: "column", justifyContent: "space-between",
        background: BG, color: TEXT, padding: "44px 56px",
        fontFamily: "system-ui, sans-serif", position: "relative" }}>
        {heroUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUri} alt="" width={1200} height={630}
            style={{ position: "absolute", inset: 0, width: 1200,
              height: 630, objectFit: "cover", opacity: 0.45 }} />
        ) : null}
        <div style={{ display: "flex", fontSize: 20, fontWeight: 700,
          color: POS, letterSpacing: 2 }}>
          TAILSLIPS · PARLAY PALACE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: POS,
            letterSpacing: -3, display: "flex" }}>
            +{units}u
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 10,
            display: "flex" }}>
            @{entry.capper_handle} · {entry.leg_count}-leg · +{entry.combined_odds}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: 18, color: MUTED }}>
          <div style={{ display: "flex" }}>Media: MLB Advanced Media</div>
          <div style={{ display: "flex", fontWeight: 700, color: POS }}>
            tailslips.com
          </div>
        </div>
      </div>
    ), { ...size });
    const buf = await img.arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png",
      "cache-control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return new Response(TRANSPARENT_PNG, {
      headers: { "content-type": "image/png",
                 "cache-control": "public, max-age=30, s-maxage=30" } });
  }
}
```

- [ ] **Step 3: Implement `opengraph-image.tsx`**

```tsx
import { renderPalaceOg, size, alt, contentType } from "./_pp-og-renderer";

export const runtime = "nodejs";
export { size, alt, contentType };

export default async function Image(
  { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderPalaceOg(slug);
}
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: build succeeds; `/parlay-palace/[slug]/opengraph-image` appears in the route list. Fix any type error before continuing.

- [ ] **Step 5: Commit**

```bash
git add "src/app/parlay-palace/[slug]/_pp-og-renderer.tsx" "src/app/parlay-palace/[slug]/opengraph-image.tsx"
git commit -m "feat(parlay-palace): per-entry OG share card"
```

---

### Task 12: Sitemap + JSON-LD node

**Files:**
- Modify: `FE: src/lib/jsonld.ts`
- Modify: `FE: src/app/sitemap.ts`

- [ ] **Step 1: Add `parlayPalaceArticleNode` to `src/lib/jsonld.ts`**

Append (mirror existing `canonicalUrl`, `SITE_NAME`, `SITE_URL` usage in that file):

```typescript
import type { PalaceEntry } from "@/lib/types";

export function parlayPalaceArticleNode(entry: PalaceEntry): JsonLdNode {
  const url = canonicalUrl(`/parlay-palace/${entry.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: entry.title ?? "Winning MLB parlay",
    description: entry.recap_blurb ?? undefined,
    url,
    datePublished: entry.published_at ?? undefined,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}
```

- [ ] **Step 2: Add published entries to `src/app/sitemap.ts`**

In the existing `sitemap()` function, after `capperEntries`, add:

```typescript
  let palaceEntries: MetadataRoute.Sitemap = [];
  try {
    const { fetchPalaceList } = await import("@/lib/api");
    const list = await fetchPalaceList();
    palaceEntries = list.map((e) => ({
      url: `${SITE_URL}/parlay-palace/${e.slug}`,
      lastModified: e.published_at ? new Date(e.published_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // API down at build → ship without palace entries; reappear next regen
  }
```

Add `{ url: `${SITE_URL}/parlay-palace`, lastModified: now, changeFrequency: "daily", priority: 0.8 }` to `staticEntries`, and return `[...staticEntries, ...capperEntries, ...palaceEntries]`.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/jsonld.ts src/app/sitemap.ts
git commit -m "feat(parlay-palace): Article JSON-LD + sitemap entries"
```

---

# PHASE 10 — Frontend: admin curation

### Task 13: Admin queue page + actions + table

**Files:**
- Create: `FE: src/app/admin/parlay-palace/page.tsx`
- Create: `FE: src/app/admin/parlay-palace/actions.ts`
- Create: `FE: src/app/admin/parlay-palace/PalaceQueueTable.tsx`

- [ ] **Step 1: Implement `actions.ts`** (mirrors `src/app/admin/review/actions.ts`)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { API_BASE } from "@/lib/config";

function adminHeaders(): HeadersInit {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not set on server");
  return { "Content-Type": "application/json",
           Authorization: `Bearer ${secret}` };
}

export type PalaceActionResult = { ok: true } | { ok: false; error: string };

async function post(path: string): Promise<PalaceActionResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST", headers: adminHeaders() });
    if (!res.ok) {
      const b = await res.text().catch(() => "");
      return { ok: false, error: `${res.status}: ${b || res.statusText}` };
    }
    revalidatePath("/admin/parlay-palace");
    revalidatePath("/parlay-palace");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function enrichAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/enrich`);
}
export async function publishAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/publish`);
}
export async function unpublishAction(parlayId: number) {
  return post(`/api/admin/parlay-palace/${parlayId}/unpublish`);
}
```

- [ ] **Step 2: Implement `PalaceQueueTable.tsx`** (mirrors `ReviewQueueTable.tsx`)

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PalaceCandidate } from "@/lib/types";
import { enrichAction, publishAction, unpublishAction } from "./actions";

export function PalaceQueueTable({ items }: { items: PalaceCandidate[] }) {
  const [error, setError] = useState<string | null>(null);
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] px-6 py-10 text-center text-[14px] text-[var(--color-text-soft)]">
        No winning parlays to curate.
      </div>
    );
  }
  return (
    <>
      {error && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {error}
        </div>
      )}
      <ul className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
        {items.map((it) => (
          <Row key={it.parlay_id} it={it} onError={setError} />
        ))}
      </ul>
    </>
  );
}

function Row({ it, onError }: {
  it: PalaceCandidate; onError: (s: string | null) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(fn: (id: number) => Promise<{ ok: boolean; error?: string }>) {
    onError(null);
    start(async () => {
      const r = await fn(it.parlay_id);
      if (!r.ok) { onError(`parlay ${it.parlay_id}: ${r.error}`); return; }
      router.refresh();
    });
  }
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0 px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-[13px] font-bold">
          @{it.capper_handle}{" "}
          <span className="text-[var(--color-text-muted)] font-medium">
            {it.leg_count}-leg · +{it.combined_odds} ·
            +{it.profit_units.toFixed(2)}u
          </span>
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
          status: {it.status} · graded {it.graded_at?.slice(0, 10)}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => run(enrichAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[11px] font-bold">
          {pending ? "..." : "Enrich"}
        </button>
        <button onClick={() => run(publishAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-pos)] text-black rounded text-[11px] font-bold">
          Publish
        </button>
        <button onClick={() => run(unpublishAction)} disabled={pending}
          className="px-3 py-1 bg-[var(--color-neg)] text-white rounded text-[11px] font-bold">
          Pull
        </button>
      </div>
    </li>
  );
}
```

- [ ] **Step 3: Implement `page.tsx`** (mirrors `src/app/admin/review/page.tsx`)

```tsx
import { fetchPalaceCandidates } from "@/lib/api";
import { PalaceQueueTable } from "./PalaceQueueTable";

export const metadata = {
  title: "Parlay Palace queue · TailSlips Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function AdminPalacePage() {
  let items = [] as Awaited<ReturnType<typeof fetchPalaceCandidates>>;
  let err: string | null = null;
  try { items = await fetchPalaceCandidates(); }
  catch (e) { err = e instanceof Error ? e.message : String(e); }
  return (
    <main className="max-w-[1100px] mx-auto px-7 pb-16">
      <header className="pt-10 pb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-bold mb-2">
          Admin · Parlay Palace
        </div>
        <h1 className="text-[32px] font-extrabold tracking-[-0.02em]">
          Winning parlays to curate
        </h1>
        <p className="text-[13px] text-[var(--color-text-soft)] mt-2 max-w-[68ch]">
          Enrich to build the page (MLB box scores + hotlinked media + recap).
          Publish only when the hero asset is striking. Pull removes it and
          stops serving the media instantly.
        </p>
      </header>
      {err && (
        <div className="rounded-md border border-[rgba(255,80,80,0.4)] bg-[rgba(255,80,80,0.08)] text-[12px] text-[var(--color-neg)] px-3 py-2 mb-3">
          {err}
        </div>
      )}
      <PalaceQueueTable items={items} />
    </main>
  );
}
```

- [ ] **Step 4: Add nav link**

In `src/components/admin/AdminNav.tsx`, add a link to `/admin/parlay-palace` following the existing link pattern in that file (match the existing array/JSX shape exactly).

- [ ] **Step 5: Build + manual verify**

Run: `npm run build` (expected: success). Then `npm run dev`, open `http://localhost:3000/admin/parlay-palace` with `CRON_SECRET` set in `.env.local`. Expected: candidate list (or "No winning parlays" / a clear error if backend unreachable).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/parlay-palace src/components/admin/AdminNav.tsx
git commit -m "feat(parlay-palace): admin curation queue"
```

---

# PHASE 11 — End-to-end verification

### Task 14: Full-loop smoke test + final checks

- [ ] **Step 1: Backend test suite**

Run (from `D:/nba-totals-project/nba_platform`): `python -m pytest tests/core/test_parlay_palace_query.py tests/core/test_parlay_palace_enrich.py tests/core/test_parlay_palace_recap.py tests/api/test_parlay_palace_api.py -v`
Expected: all PASS.

- [ ] **Step 2: Frontend test suite + build**

Run (from `D:/capwatch-web`): `npm run test` then `npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 3: Live loop (staging/prod after deploy)**

1. `POST /api/admin/parlay-palace/<parlay_id>/enrich` for a real recent winning parlay (use a parlay_id from `GET /api/admin/parlay-palace/candidates`).
2. Confirm the response has `hero_kind` set. If `hero_kind` is null, pick a different parlay (no striking media → not publishable, by design).
3. `POST /.../<parlay_id>/publish`.
4. Open `https://tailslips.com/parlay-palace` — the card appears.
5. Open the detail page — hero photo renders, legs show K results, attribution line present, capper CTA links to the profile.
6. Paste the detail URL into the X composer (or a card validator) — confirm the OG image renders with the action shot.
7. `POST /.../<parlay_id>/unpublish` — confirm it disappears from `/parlay-palace` and the page 404s (media kill switch works).

- [ ] **Step 4: Confirm no media is rehosted**

Verify `parlay_palace_entries.hero_url` and every `body.legs[].headshot_url` are `https://*.mlbstatic.com` / `mlb-cuts-diamond.mlb.com` URLs (strings), and that `next.config.ts` `remotePatterns` was NOT extended to MLB hosts. Expected: confirmed (hotlink only, no byte rehosting).

- [ ] **Step 5: Final commit / branch state**

Both repos on a feature branch (`feat/parlay-palace`), all green. Hand off per the finishing-a-development-branch skill (PR or merge per user preference).

---

## Self-Review

**Spec coverage:** Concept/SEO hall-of-fame (Tasks 9, 12) ✓. Selection = winning MLB parlays, all cappers, admin discretion (Task 2, 13) ✓. Curation→publish with admin gate + no-publish-without-hero (Task 5 publish guard, Task 13) ✓. Imagery from MLB content API, hotlinked, photo→clip→headshot priority, hero required (Task 3, 5, 8) ✓. Post template: action-shot hero, recap blurb, leg-by-leg with player imagery, capper CTA (Tasks 7, 8, 10) ✓. Public surface: `/parlay-palace`, `/parlay-palace/[slug]`, OG, sitemap, Article JSON-LD (Tasks 9-12) ✓. Platform-ready generic `type` model (Task 1) ✓. No-em-dash LLM constraint (Task 4, system prompt + sanitizer) ✓. Out-of-scope items not built (no auto-X-post, MLB-only, parlay-only) ✓. Legal mitigation (hotlink/attribution/kill-switch) baked into Tasks 1, 3, 8, 13, 14 ✓.

**Placeholder scan:** No "TBD/TODO". The one intentional code slip (`entry.seo_title_fallback()`) is explicitly called out and removed in Task 10 Step 2 so a worker reading sequentially fixes it; not a silent placeholder.

**Type consistency:** `ParlayCandidate`/`Leg` (Task 2) consumed unchanged in Tasks 3, 5. `PalaceEntry`/`PalaceLeg`/`PalaceBody`/`PalaceCandidate` (Task 6) used consistently in Tasks 7-13. Backend `enrich_candidate` body keys (`legs`, `clincher`, `hero`, `hero_kind`, `media_attribution`) match the `PalaceBody` TS interface and the `_pp-og-renderer`/`ParlayHero`/`LegRow` consumers. Endpoint paths match between backend router (Task 5) and frontend actions/fetchers (Tasks 6, 13).

**Known soft spots flagged for the executor:** MLB `editorial.recap` is absent for recap-less games (Task 3 null-checks; Task 5 publish refuses without `hero_url`). Doubleheaders/postponed games already handled upstream because `game_id` is the resolved gamePk stored at parse time (no schedule matching needed here).
