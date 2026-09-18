# The System — a hybrid AI dungeon run

A mobile-first, vertically-scrolling webtoon RPG. Each choice streams a new panel
in as prose, with no loading states, and the path a player takes is compared
against every other run so that no two playthroughs converge.

This is the vertical slice of the PRD: the full turn loop, streaming, speculative
generation, hybrid static/AI routing, and anti-collision Red Gate diversion all
work end to end. RabbitMQ, vector RAG, and the epilogue image worker are stubbed
behind interfaces rather than built.

## Layout

```
packages/shared      domain types + the SSE wire contract (used by both ends)
apps/server          Fastify API, game engine, Postgres + Redis access
apps/web             Next.js webtoon client
```

## Running locally

```bash
npm install
cp .env.example .env          # works as-is; no API key required
docker compose up -d          # Postgres + Redis
npm run seed                  # migrate, then load the static node pool
npm run dev                   # api on :4000, web on :3000
```

Open http://localhost:3000.

With both keys empty the server runs a deterministic offline provider, so the
whole stack — streaming, prefetch, locking, collision routing — is playable and
load-testable with no spend. Set `GEMINI_API_KEY` and/or `COHERE_API_KEY` in
`.env` to use live models (`LLM_PROVIDER=auto` tries Gemini first, then Cohere
when Flash 429s). The server logs the chain at boot.

### Watching the engine work

```bash
npm run play -w @system/server -- smart 40 5000
```

Plays a full run against the live server and prints a per-turn trace: panel
source, time to first byte, whether the panel came from the speculative cache,
and the stat line. The last argument is simulated reading time in milliseconds —
set it to `0` for worst-case latency, or `5000` to watch the cache absorb the
model call entirely.

Strategies are `first`, `last`, `random`, `cautious`, and `smart`. Two runs using
the same strategy will walk the same path, which is how the Red Gate divert gets
triggered.

## How a turn works

1. The player taps a choice. The server validates it against live stats — the
   client's `locked` flag is advisory, never authoritative.
2. The **resolver** rolls the outcome. This is pure, seeded on
   `(run seed, step, choice id)`, and happens before any text exists. The model
   never decides what happened; it only narrates what the engine already decided.
3. Stats are written and emitted first, so the header moves the instant the
   player taps.
4. The **router** picks the panel source: a pre-authored node from Postgres for a
   configurable share of transitions (to bound API cost), or the model.
5. Narration streams out as SSE deltas. The call generating the *next* set of
   choices is fired before the first delta, so it resolves while the player is
   still reading.
6. Once the panel is committed, the **prefetcher** speculatively resolves and
   narrates the most likely branches during the player's reading time and parks
   them in Redis. The next tap then streams from cache with no model call at all.

Measured on the offline provider: ~470 ms to first byte on a cache miss versus
6–11 ms on a hit, with 13 of 15 turns hitting the cache at realistic reading
speed.

Because the resolver is deterministic, a prefetched panel is guaranteed to
describe the same outcome when it is redeemed. Prefetches also record the world
conditions they assumed and are discarded if the run has since diverged — for
instance if a collision diverted it into a Red Gate.

## Anti-collision

Every step is reduced to a signature of `location:action`, and the cumulative
path is hashed at each of the last five steps. Two runs only share a hash if they
made the identical sequence of choices from the same places. If more than 70% of
the recent path has been walked by other runs, the next node is overridden and
the player is diverted into a Red Gate: a sealed, model-authored branch that
lasts six steps, doubles canon divergence, and flips the run's type to `anomaly`.

## Deliberate departures from the PRD

| PRD | Built | Why |
| --- | --- | --- |
| Bloom filter for path collision | HyperLogLog counters | RedisBloom is a module and is not available on managed Redis. The question being asked is "how many *distinct* runs walked this path", which is a cardinality query, not a membership one. Memory is still fixed at ~12 KB per counter. |
| RabbitMQ for the epilogue image job | `JobQueue` interface + in-process impl | Nothing waits on that job inside a request, and one call site means swapping in `amqplib` touches one file. Not worth a broker in the slice. |
| Vector RAG over the lore document | Keyword retrieval behind a `LoreProvider` interface | At nine chunks, a vector round trip costs more latency than it buys relevance. The seam is in place to swap in embeddings. |
| `Static_Nodes.option_1/2/3` columns | `options jsonb` | Lets a node offer three or four choices and carry per-choice requirements without schema churn. |
| Gemini 1.5 Flash | `gemini-2.5-flash`, configurable | 1.5 Flash is superseded. Thinking is disabled on the calls in the hot path, which is what holds a panel near one second. |

Two things were added that the PRD does not specify. The **deterministic
resolver** exists because letting the model decide outcomes makes stats
unenforceable and prefetching unsound. The **second prefetch stage** (speculating
each candidate branch during reading time) goes beyond the PRD's choices-only
prefetch, and is the reason a turn can involve no model call whatsoever. It is
also the most expensive thing here — see `PREFETCH_FANOUT`.

## Tuning

| Variable | Effect |
| --- | --- |
| `PREFETCH_FANOUT` | Branches speculated per turn. Each costs two extra model calls. `0` disables read-time speculation and keeps only the in-turn parallel call. |
| `STATIC_NODE_RATIO` | Share of eligible transitions served from Postgres instead of the model. |
| `COLLISION_THRESHOLD` | Path overlap above which a run is diverted into a Red Gate. |
| `CONTEXT_WINDOW` | Turns of history injected into the prompt. |
| `SESSION_TTL_SECONDS` | Redis session lifetime, refreshed on every interaction. |

Game balance lives in `apps/server/src/engine/resolver.ts`: risk difficulties, XP
rewards and their per-level decay, failure damage, and fatigue. As tuned, runs
last roughly 12–40 panels and both endings occur; safe play sustains but stops
paying XP as you outrank it, which forces escalating risk to reach the victory
condition.

## Deploying

The player site is **Netlify**. The API and Postgres are **Render** on the **Hobby / free** plan. Sessions live in the API process (Hobby allows only one free Redis, and that slot is often already taken).

1. Push this repo to GitHub (`https://github.com/Doriel1121/solo-leveling`).
2. Apply the blueprint: [Create Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Doriel1121/solo-leveling). Fill `GEMINI_API_KEY` and `COHERE_API_KEY`. Keep every instance on **Free**.
3. Copy the API URL (`https://system-api-….onrender.com`).
4. Create the Netlify site from the same repo. Build settings live in `netlify.toml`. Set `NEXT_PUBLIC_API_URL` to that API URL (no trailing slash) and trigger a new production deploy.
5. After the Netlify URL exists, confirm Render `CORS_ORIGIN` matches it and restart the API if you changed it.

The API binds `0.0.0.0:$PORT` and runs migrations on boot. Free web instances sleep after 15 minutes idle (cold start ~1 minute); in-progress runs vanish when the process sleeps. Free Postgres expires after 30 days. To use Redis, set `REDIS_URL` on `system-api` after attaching an existing Key Value instance.

## Known issues

- `npm audit` reports advisories against the `postcss` version Next.js vendors
  for its own CSS pipeline. They concern parsing attacker-controlled CSS; all CSS
  here is authored in-repo and compiled at build time. Forcing a newer postcss
  via `overrides` breaks Next's pinned dependency, so this waits on a Next
  release that bumps it.
- Only the mock provider has been exercised end to end. The Gemini path is
  written and typechecked but has not been run against the live API.
