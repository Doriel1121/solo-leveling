# Player Experience Spec — The System

Hand-off for the **builder agent**. Research and visual direction compiled 2026-09-17. This file is the product bible for look, feel, layout, motion, images, and choice feedback.

**Read this before changing** the web client, HUD, panel layout, copy length, art, motion, SFX, start/end screens, or the SSE/panel payload that those surfaces consume.

Companion file: `docs/solo-leveling-design-brief.md` (narrative, lore, System voice). That file owns prose. **This file owns how the run looks and feels.** Do not rewrite story nodes to “add flavour” if the problem is visual. Cut words and add pictures.

All art and copy stay original. Steal the *pressure and chrome* of Solo Leveling / the manhwa System UI. Do not paste frames, names, logos, or dialogue from the novel, manhwa, or anime.

---

## 0. How to use this file

| If you are… | Do this |
| --- | --- |
| Building UI | Follow sections 6–15 and the file map in §18. Treat §20 as the acceptance test. |
| Touching the engine | Only change payloads listed in §17. Do not invent a new combat sim. |
| Writing panel text | Obey the text budget in §10. Visuals carry the set piece. |
| Choosing what to ship first | Follow the phases in §19. Do not start with AI-generated unique art per panel. |

**North-star sentence:** The feed should feel like a mobile webtoon you *play*, not a chat log you *read* — a blue window only you can see, dropping into a painted panel, with the world flinching when you tap.

---

## 1. What we are actually making

This is a **mobile-first vertical webtoon RPG**. Solo Leveling’s fantasy is spectacle with a game UI glued to a human body. Fans do not stay for paragraphs. They stay for:

1. The **glow-up** (weak, small, fluorescent rooms → silent, full-bleed, unreadable).
2. **System dopamine** (blue windows, level-ups, locked options, numbers ticking).
3. **Aura without speeches** (the image does the cool; the narrator stays short).
4. **Rule-bound death** (the UI is honest; stylish choices can kill you).

The current client already has the *engine* of that fantasy (streaming panels, System windows, locked FOMO choices, HP/MP/Fatigue, Red Gate anomaly chrome). It does not have the *body*: no panel art, no biome, almost no choice juice, and too much prose for a phone thumb.

“Friendly” here does **not** mean cute, pastel, emoji, or a helpful mascot. It means:

- The first ten seconds are inviting, not a homework briefing.
- Every tap answers immediately with light, sound, and a picture.
- The player is never lost, never lectured, never staring at a wall of text.
- Warmth lives in the HUD, family beats, and clear affordances. The dungeon stays lethal.

---

## 2. Current experience audit (what is broken)

Measured against the live client in `apps/web`.

### 2.1 What already works — keep it

- Vertical feed, max width ~680px, sticky HUD, auto-scroll that yields if the player scrolls up (`apps/web/app/page.tsx`).
- System window chrome: cyan glass, hard neon edge, anomaly-red variant (`globals.css`, `SystemWindow.tsx`).
- Streaming caret on incoming narration.
- Action echo of the chosen label (the scroll stays legible as a comic).
- Choice risk accent (safe / moderate / deadly), requirement chips, one locked FOMO option.
- Stat bars that spring, floating +/− deltas.
- No loading spinner on a turn — SSE is the product. **Do not add a spinner.**
- Framer Motion is already a dependency. Use it. Do not add a second animation library.

### 2.2 What is failing the fantasy

| Problem | Evidence | Player feeling |
| --- | --- | --- |
| **No images** | `Panel` has only `text` + `systemLines`. `PanelCard` is a left-bordered paragraph. The epilogue image job in `queue.ts` is a `console.info`. | “This is a chatbot with RPG stats.” |
| **Too much text** | Prompt asks 50–100 words per panel (`prompts.ts`). Static nodes are 60–90 word blocks. Start screen is three sentences of systems explanation. | Fatigue. Skip impulse. Phone users bounce. |
| **Choice has no world reaction** | Tap → fade-in of more text. Deltas float in the header and that is the entire juice. No hit-stop, shake, flash, particles, or panel punch. | Buttons feel like a quiz, not a raid. |
| **Every panel looks the same** | One layout for awakening, ants, coffee, Red Gate, death. Location is a snake_case string in the header. | No biome, no arc, no glow-up. |
| **Diagnostics on by default** | `useState(true)` in `page.tsx` leaks `authored / generated / prefetched` into the comic. | Breaks immersion on first run. |
| **Start screen is a lecture** | Title is a System line (good) then a paragraph about collision routing (bad). | Players did not come to read the PRD. |
| **Locked choice uses a lock emoji** | `ChoiceList.tsx` renders 🔒. | Off-brand. The System never uses emoji. |
| **Location is unfriendly** | `d_rank_gate` shown as `d rank gate`. | Looks like a debug build. |
| **Death / victory is another card of text** | `EndingCard` is a System window + reason + grid. No still, no silence, no shareable image. | The ending does not land. |
| **No skip / tap-to-advance** | Streaming is the only cadence. Fast players wait on the caret. | Feels slow even when prefetch is 6 ms. |
| **No audio / haptics** | Silent. | System windows in the series *arrive*. Ours just appear. |

### 2.3 What we must not “fix”

- Do not add a map, inventory grid, or skill tree in this pass. The fantasy is the feed.
- Do not add a stamina/energy gate or gacha. One lethal run.
- Do not explain why a move was cool in narrator copy.
- Do not show other hunters reacting to System windows or to the word “level.”
- Do not put unique generative art on the hot path. That would re-introduce loading states the engine was built to kill.

---

## 3. Series visual language (steal this, not the plot)

From the manhwa/anime’s *look*, not its story. This is what a player who has seen Solo Leveling expects in the first second.

### 3.1 Palette

| Token | Hex | Job |
| --- | --- | --- |
| Void | `#04060d` | Page, endless scroll, “inside the gate.” Already `--color-void`. |
| Void soft | `#0a1020` | Panel wells, HUD fill. |
| System cyan | `#4cc9ff` | The brand. Windows, MP, neon. Already `--color-system`. |
| System deep | `#0b3a5c` | Glass fill. |
| HP | `#ff4d6d` | Blood, danger, deadly risk. Already `--color-danger`. |
| Fatigue / gold | `#ffb020` | Exhaustion, XP ticks, shop temptation. Already `--color-warn`. |
| Anomaly | `#ff2d55` | Red Gate only. Already `--color-anomaly`. |
| Shadow | `#1a1028` → `#6b5cff` rim | Late-game / extraction / army. Introduce only after Job Change content exists. |
| Family warmth | `#f3e6c8` at 8–12% opacity | Hospital, sister, coffee. One warm key-light, never a pastel UI. |
| Rank glow | E grey → D steel → C cyan → B gold → A white → S black-with-cyan-rim | HUD rank chip is the glow-up meter. |

Paper-on-black, not white-page webtoon. We are the System’s night mode, not a Naver default skin.

### 3.2 Type

- **System:** existing `--font-system` (mono). Bracketed, tabular numbers, tracking wide, never italic, never emoji.
- **Narration:** a readable humanist sans. Current `ui-sans-serif` stack is acceptable; if a webfont is added, pick one high-contrast body (e.g. Source Serif is *wrong* — this is not a novel). Target 16–17px on phone, line-height 1.45, **max 3 lines visible before “more”** on a standard panel.
- **Choice labels:** sans, medium, imperative. No serif. No icons except System glyphs.
- **Display / aura moments:** the same sans, larger, more tracking, fewer words. Late-game panels physically larger (see §9.4).

### 3.3 Composition (webtoon grammar)

Think in **panels**, not messages.

- Early game: **inset, cramped, dirty fluorescent**. Panel art has a thick void margin. The hunter is small in the frame. Fluorescent grids, clipboards, cheap mana-stones, car-park gates.
- Mid game: **full-bleed still + caption**. Monster in three-quarter view, hunter at the edge. Instant-dungeon stone, wet chitin, collapsing arches.
- Red Gate: **cold desat + red rim light**. Snow indoors, sealed oval of red, no exit in the composition.
- Late / aura: **silhouette, smoke, one cyan eye-line**. Negative space. Caption is one sentence or none.
- System windows **overlay the art**, never sit in a chat bubble beside it. They are diegetic HUD, identical to what the Player sees.

### 3.4 Motion language

- System: **snap**. Scale 0.94 → 1.0 in 180ms, then a 1px cyan scanline. No bounce. No elastic.
- Combat hit: **hit-stop** 40–70ms, then a 4–8px shake on the panel only (not the whole page).
- Damage: red vignette 200ms + HP bar slam.
- Level-up: full-screen System takeover 600–900ms. This is the dopamine hit. Do not be shy.
- Death: drain to desat, then the window `[ You have died. ]`. No retry button for 800ms. Let it land.
- Safe / rest: slower, 400ms ease-out, slight warmth, bars refill.
- Reduced motion: snaps become 80ms fades. Never skip the *information* (level-up still shows the window).

### 3.5 Sound (when shipped)

Diegetic, sparse, UI-as-world:

- System appear: short glass/chord, slightly wrong, not a cheerful ping.
- Choice confirm: dry click.
- Hit: cloth + one impact. Deadly fail: lower, wetter.
- Level-up: the series’ “window choir” analogue — a rising filtered tone, then silence.
- Red Gate: a held breath, then absence (low-pass the bed).
- Default: **muted until the player unmutes**. Autoplay policies + respect. A speaker glyph in the HUD.

---

## 4. Player jobs and UX characteristics

Design every screen against these. If a change does not serve one, drop it.

| # | Job | Characteristic | Design response |
| --- | --- | --- | --- |
| 1 | **Orient in 3 seconds** | “Where am I, am I dying, what can I tap?” | HUD readable at a glance. Location in human words. Art shows the room before the prose. |
| 2 | **Feel the tap** | Instant consequence | FX fire on `pointerdown` from the *choice’s predicted fx*, then the server confirms. Stats already update first in the engine — visuals must too. |
| 3 | **Read as little as possible** | Phone, one sitting, ~25 panels | Caption first, optional body. 50–100 words is a ceiling for *rare* panels, not the default. |
| 4 | **Know the risk** | Deadly must look deadly before the tap | Colour, glyph, and a one-word risk. Never hide death behind witty copy. |
| 5 | **Want the locked option** | FOMO without spite | Locked row is beautiful, dim, with a System reason (`STR 16 required`), not a grey disabled HTML button. |
| 6 | **Trust the System** | Numbers are the character | Bars, deltas, windows stay authoritative. Flavour never contradicts HP. |
| 7 | **Survive the glow-up** | Weak now, dominant later | Panel size, contrast, and silence scale with level/rank (see §9.4). |
| 8 | **Not feel stupid** | First-time friendly | Start is one System window + name field + enter. Tutorial is the first three panels, not a help modal. |
| 9 | **Stay in control** | Scroll back, reread, skip stream | Keep stick-to-bottom yield. Add tap-to-complete on the streaming panel. |
| 10 | **Recover from death** | Fair, not punishing-UI | Ending still + one clear CTA. No ads, no “watch to continue,” no inventory loss screen. |
| 11 | **Play with a thumb** | Mobile-first | Choices in the lower 40% of the viewport, 48px min hit target, no hover-only risk label. |
| 12 | **Respect the body** | A11y, vestibular, battery | `prefers-reduced-motion`, contrast ≥ 4.5:1 on body text, pause FX when backgrounded, no infinite particle loops. |
| 13 | **Feel unique without waiting** | Anti-collision is flavour | Red Gate is a *visual event* (seal, snow, red chrome), not a paragraph that says “anomaly.” |
| 14 | **Hide the pipes** | Diagnostics off | `authored/generated` never on by default. Konami / long-press / `?debug=1` only. |

---

## 5. Experience principles (non-negotiables)

1. **Picture first, System second, prose last.** If the panel works with the image muted and the text deleted, the design is right.
2. **The System is the character.** Blue windows, not a narrator avatar. No emoji. No “please.”
3. **Juice the verb, not the paragraph.** The player chose “Strike the knee joint” — the screen must kick. Then twenty words, not eighty.
4. **Same layout grammar every turn** so muscle memory holds; **different biome and FX** so it never feels like one corridor.
5. **Friendly chrome, lethal content.** Soft the UX (clear buttons, big type, instant feedback). Do not soft the fiction.
6. **Glow-up is a layout property.** Level 1 panels are physically smaller and busier. Level 5+ panels go wide, dark, and quiet.
7. **No loading theatre.** Art is local (CSS + stills). Streaming text may type in; pictures are already there.
8. **One primary CTA.** The choice list *or* the ending button. Never both fighting the thumb.
9. **Honesty.** Safe looks safe. Deadly looks deadly. Locked looks locked. Failure hurts the bar *and* the frame.
10. **Silence is a reward.** After aura / level-up / death, hold. Do not immediately dump four new buttons.

---

## 6. Screen map

```
Start (title System window)
  └─ Run (sticky HUD + vertical feed)
        ├─ Panel stack (art + System + caption)
        ├─ Action echo (player’s last tap)
        ├─ Choice dock (sticky on mobile while deciding)
        └─ FX overlay (pointer-events: none)
              ├─ Death / Victory still
              └─ Restart CTA
```

No separate inventory, map, or settings page in v1. Settings live as HUD overflow: mute, abandon, reduced-motion already respected via OS.

### 6.1 Start screen — rewrite the job

Current: Association kicker + long title + systems paragraph + optional name + enter.

Target:

1. Void + a faint gate tear (animated 6s loop, reduced-motion: static).
2. A single System window, already open:

   ```
   [ You have acquired the qualification to be a Player. ]
   [ Class: None — Title: None ]
   ```

3. Optional hunter designation. Placeholder: `assigned if empty`.
4. Primary button: `ACCEPT` (System voice) with subtitle `enter the gate` in smaller tracking.
5. One line of human flavour **under** the button, not above: `Only you can see this window.`
6. Drop the collision-routing explanation. Players who care will meet a Red Gate.

First-run only (localStorage): after the first panel, a 2-second ghost hint on the choice list — `tap to act` — then never again.

### 6.2 Run screen

- HUD sticky, 72–96px collapsed. Expanded sheet for STR/AGI/EXP/divergence/abandon.
- Feed is the comic.
- Choice dock: on viewports < 720px, **sticky bottom** with a 16px blur fade above it so the latest panel art is still visible. On desktop, keep in-flow under the latest panel.
- While streaming: choices stay visible but inert (already true) **and** the dock shows a thin System progress — a cyan line, not a spinner. Tapping the streaming panel completes the text instantly.

### 6.3 Ending

Full-bleed still (death: desat hunter on the floor / victory: gate collapsing behind a silhouette). System window over it. Reason is **one sentence**. Stats as a compact strip, not a definition list novel. CTA: `ENTER A NEW GATE`. Secondary, text-only: `review the run` expands the feed in place (do not navigate away).

---

## 7. Visual system (builder tokens)

Extend `apps/web/app/globals.css` `@theme`. Do not scatter hex in components.

```
--color-void, --color-void-soft, --color-system, --color-system-deep
--color-danger, --color-warn, --color-anomaly
--color-shadow: #6b5cff
--color-family: #f3e6c8
--color-xp: #7dffa8          /* already used ad-hoc in StatusHeader */
--ease-system: cubic-bezier(0.16, 1, 0.3, 1)
--duration-snap: 180ms
--duration-panel: 420ms
--duration-levelup: 800ms
--panel-radius: 2px          /* System is sharp. No 16px squircle. */
--choice-min-height: 52px
```

Corners stay sharp (`rounded-sm`). The System is a terminal from another world, not iOS.

Rank chip styles:

| Rank | Treatment |
| --- | --- |
| E | Dim grey, no glow, slightly smaller type |
| D | Steel, 1px border |
| C | Cyan glow (current default) |
| B | Gold border, still modest |
| A | White type, stronger glow |
| S | Black chip, cyan rim, slow breathing shadow |

When rank changes, play `rank_up` even if the player is mid-scroll.

---

## 8. Panel anatomy (the core product)

Replace the current “system window + blockquote” with a **webtoon frame**.

```
┌─────────────────────────────────────────┐
│  ART STAGE (9:16 crop on phone,         │
│  16:9 letterboxed on desktop)           │
│                                         │
│   [ SYSTEM WINDOW, top-left / top ]     │
│                                         │
│                                         │
│                    caption (1–2 lines)  │
│                    optional “read”      │
└─────────────────────────────────────────┘
         action echo (if this followed a tap)
```

### 8.1 Art stage

- Height: **42–52vh** on mobile for standard panels; **28vh** for early cramped panels; **70vh** for aura / death / victory / Red Gate seal.
- Background: biome still (`artKey`) + CSS grade (`mood`) + particle canvas (`fx`).
- The still is an original atmosphere plate, not a character render of a canon person. Silhouettes and environments age better than generated faces.
- Overlay a 20% bottom gradient so caption type stays readable.
- Image `object-fit: cover`. Never leave a grey empty box. If the asset 404s, the CSS biome gradient is the fallback — always.

### 8.2 System window

Keep `SystemWindow`. Changes:

- Position **on the art**, not above it in the document flow.
- Arrival: snap + 1-frame full-width scanline.
- Stack lines with 60ms stagger (already close).
- If `lines.length === 0`, do not reserve space.
- Anomaly variant already exists — use it whenever `kind === "red_gate"`.

### 8.3 Caption vs body

Split narration into two fields (see §17):

| Field | Length | Role |
| --- | --- | --- |
| `caption` | ≤ 140 characters, 1–2 sentences | Always visible on the art. The panel *is* this. |
| `text` | 0–60 words default; 80 max | Revealed under the art as “read” / auto-expanded after 400ms for accessibility. |

If `text` is empty, the caption stands alone. That is the late-game look.

Static nodes: rewrite `content` down and add `caption`. Do not leave 90-word blocks as the only readable surface.

### 8.4 Glow-up scale

Drive from `stats.level` (and `kind`):

| Band | Level | Frame | Type | Motion |
| --- | --- | --- | --- | --- |
| Prey | 1–2 | Inset 16px, 28–36vh, fluorescent grade | 15.5px, more lines allowed | Small |
| Hunter | 3–4 | Full width, 46vh | 16px, caption-led | Medium |
| Presence | 5+ / victory | 60–70vh, heavy negative space | 18px, 1 sentence | Slow, confident |
| Anomaly | any, `red_gate` | Full bleed, red rim, snow | System anomaly chrome | Seal animation once |

Death always uses Presence sizing regardless of level — the frame finally gives them the space they never got.

---

## 9. Art pipeline (nice images without killing latency)

### 9.1 Strategy — hybrid stills, not a model per turn

Generating a unique image every panel would:

- break the “no loading states” contract,
- look inconsistent,
- cost more than the narration.

**Do this instead:**

1. **Biome stills** — a small original art pack, one hero plate per `location` + a few variants.
2. **Mood grades** — CSS overlays (fluorescent, ice, blood, gold shop, hospital warm, shadow).
3. **FX layers** — particles, shake, flash, snow, dust, scanlines. These make two uses of the same still feel like different panels.
4. **Keyframe stills** — unique plates for: awakening window, first gate, first kill, Red Gate seal, shop, death, victory, level-up burst.
5. **Epilogue job** (already stubbed) — *one* generated still at run end, when waiting is allowed. Wire it later; UI should already have an `<img>` slot.

### 9.2 `artKey` catalogue (v1)

Ship CSS-composed plates first if painted assets are not ready. Each key is a folder of `webp` + a fallback gradient.

| artKey | Location / kind | What the plate shows (original) |
| --- | --- | --- |
| `awakening.office` | awakening | Dead fluorescent ceiling grid, clipboard light, empty air where a window will snap in |
| `gate.carpark` | d_rank_gate | Night supermarket lot, oval tear of bruised blue hanging two metres up |
| `dungeon.pillar` | instant_dungeon / combat | Wet slate pillar, too-tall silhouette just off-centre |
| `dungeon.safe` | healing_room | Clean chamber, one source of water-light, no second exit |
| `dungeon.collapse` | collapse | Dust sheets, two mouths (flooded stair / cracking arch) |
| `surface.cafe` | guild_offer | Daylight cafe, contract face-down, coffee going cold |
| `system.shop` | merchant | Wrong-blue window, three unlabelled silhouettes, a countdown |
| `redgate.snow` | red_gate | Interior snow, sealed red oval, no door |
| `ending.death` | death | Desaturated floor, System window the only colour |
| `ending.victory` | victory | Gate collapsing to black, hunter small or huge depending on rank |
| `fx.levelup` | overlay | Pure System geometry — rings, brackets, no figurative art |

File layout suggestion: `apps/web/public/art/{artKey}.webp` plus `@2x`. Do not put binaries in `docs/`.

### 9.3 Mood grades (CSS)

`mood` is independent of `artKey` so the same pillar still can play as “assessment” or “bloodied.”

- `fluorescent` — sick green-white, high grain
- `night` — blue-black, rim cyan
- `ice` — desat + cyan scatter (Red Gate default)
- `blood` — after fail / HP loss
- `gold` — shop, recruiter, temptation
- `warm` — hospital / family (rare)
- `void` — System-only, almost no environment
- `aura` — heavy contrast, light wrapping a silhouette

### 9.4 Prompting (only for epilogue / future keyframes)

If/when the epilogue worker is real:

- Style: “original dark manhwa still, cinematic lighting, no readable text, no logos, no copyrighted characters, Korean urban-fantasy hunter world.”
- Prefer environment + silhouette over faces.
- Never ask a model to write System text into the pixels — we overlay HTML for that so it stays sharp.

### 9.5 What not to draw

- Canon faces, names, or the official System font replica if it is trademarked. Ours is “bracketed cyan mono on glass.”
- Gore as the joke. Blood as cost is fine; a gore gallery is not this product.
- Cute chibi defeat poses.

---

## 10. Text budget (kill the wall)

The player complained about reading. Treat words as a scarce resource.

| Surface | Budget | Notes |
| --- | --- | --- |
| Start flavour | 1 sentence | Currently a paragraph. Cut. |
| System lines | 1–4 lines, each ≤ 80 chars | Already the right voice. |
| Caption | ≤ 140 chars | New. On the art. |
| Body `text` | **20–45 words** default; 60 typical max; 80 hard max for temple/rule panels | Update `VOICE` in `prompts.ts`. Static `content` in `seed.ts` must be cut to match. |
| Choice label | ≤ 8 words, imperative | Already specified. Enforce in UI with wrapping, not truncation with ellipsis mid-word. |
| Choice detail | ≤ 10 words | Already specified. |
| Ending reason | 1 sentence | Engine summary is mechanical; write a human caption from it, do not dump `The player failed a deadly action…`. |
| HUD location | 1–3 words, Title Case | `D-rank gate`, `Instant dungeon`, `Red gate`, `Surface`. |

**Narrator rules for the builder touching prompts:**

- Concrete nouns, present tense, second person. Unchanged.
- Prefer one image-able beat per panel (“mandibles open sideways”) over three.
- After level 4, cut warmth and length. After a family beat, allow one uncool sentence (from the narrative brief).
- Never recap the System numbers in prose. The window already said `[ HP -12 ]`.

**“Read more” pattern:** caption always visible; body collapsed behind a `read` chevron if longer than 2 lines. Screen readers get the full text in the article without extra clicks (`aria-expanded` for the visual collapse only if we hide it visually — prefer showing body in the accessibility tree always).

---

## 11. Choice UX

### 11.1 Layout

Four options, stacked, full width. Min height 52px. Deadly / locked still in the same list — do not hide them.

On mobile, sticky dock. Safe area inset (`env(safe-area-inset-bottom)`).

Risk is **always visible**, not `opacity-0 until hover` (current `ChoiceList` hover-only risk label fails on touch). Put a 9px tracked word at the trailing edge: `SAFE` / `RISK` / `DEADLY`.

### 11.2 Visual states

| State | Look |
| --- | --- |
| Idle | System glass, left border = risk colour |
| Press | Scale 0.99, cyan or red flash matching risk, then dock slides down |
| Locked | 40% opacity, System lock glyph (four-corner brackets + slash), reason in mono. Not 🔒. |
| Disabled (streaming) | Same layout, `aria-disabled`, no press FX |
| FOMO locked | A faint inner glow as if the option is *hot* but sealed — the player should want it |

### 11.3 Choice-triggered FX (the missing product)

Every choice maps to an **FX recipe** played the moment of tap. The server may add more on `stats` / `system` events (level-up, death). Client plays optimistic FX from the choice, then **upgrades** if the outcome is bigger (fail, level-up). Never wait for narration to start juice.

#### Recipe table

Use ids in code, not adjectives in components.

| `fx` id | When | Visual | Motion | Audio (if unmuted) |
| --- | --- | --- | --- | --- |
| `confirm` | every tap | choice flash | dock ease-out | dry click |
| `safe_recover` | success + safe | warm wash, green ticks on HP | slow 400ms | soft exhale |
| `strike` | combat success, moderate | white slash across art, dust | hit-stop 50ms + 4px shake | blade/cloth |
| `strike_heavy` | deadly success | heavier slash, brief chromatic aberration | hit-stop 70ms + 8px shake | impact |
| `fail_hit` | any failure | red vignette, crack overlay, HP slam | shake 8px | wet hit |
| `fail_deadly` | deadly failure, survived | longer vignette, art grade → `blood` | 12px shake, 200ms | heavier |
| `mp_spend` | `requires.mp` | cyan drain from HUD into the art | MP bar slam | glass tick |
| `xp_tick` | EXP gain | gold numerals float from panel to HUD | 400ms | muted chime |
| `level_up` | resolver level up | full-screen System rings, `[ Level up. ]` centred, HUD rank/LV rewrite | 800ms takeover, choices delayed until it ends | rising tone |
| `rank_up` | rank change | rank chip explodes to new style | 500ms | lower tone |
| `system_open` | first window / shop / daily | scanline + window snap | 180ms | glass chord |
| `shop_tempt` | merchant | gold grade, countdown pulse on art | idle pulse 2s | none |
| `red_seal` | entering red gate | frame edges slam red, snow starts, exit behind the hunter pinches shut | 700ms, then ice grade | absence / low-pass |
| `collapse` | collapse node / structural | dust particles, camera drop 8px | rumble 400ms | grit |
| `rest` | healing room rest | slow brightness, fatigue bar eases down | 600ms | none |
| `death` | HP ≤ 0 | desat, hold, then `[ You have died. ]` | 800ms hold before CTA | cut bed |
| `victory` | victory level | gate collapse inward, cyan motes | 1000ms | resolved chord, quiet |
| `lock_deny` | tap on locked (optional haptic) | brief red flash on the row, do not navigate | 120ms | error tick |
| `anomaly_bed` | while `runType === "anomaly"` | persistent 3% red grain + rare snow | idle | none |

**Stacking:** `confirm` always plays. Outcome FX replace, they do not queue into a 4-second cutscene. Exception: `level_up` and `death` / `victory` **preempt** everything.

**Haptics:** `navigator.vibrate` — 10ms confirm, 30ms fail, 50ms death. Guard with a setting. Never vibrate on lock_deny in a loop.

### 11.4 Mapping from engine → fx

Builder: derive on the client from data we already have, then add an explicit `fx[]` on the wire once (see §17). Until the wire exists, a client helper is allowed:

```
if (choice.risk === "deadly") base = "strike_heavy" else if combat -> "strike" else if safe -> "safe_recover"
if (!success) base = choice.risk === "deadly" ? "fail_deadly" : "fail_hit"
if (mp spent) also "mp_spend"
if (level increased) prepend "level_up"
if (kind === "red_gate" && prev !== red) "red_seal"
if (kind === "death") "death"
if (kind === "victory") "victory"
```

Do not make the LLM pick FX. The resolver already knows success, risk, and kind.

### 11.5 Sticky “what happened”

Keep `ActionEcho`. Style it as a right-aligned comic tail, risk-coloured. It is how the scroll remains a readable log when art would otherwise repeat.

---

## 12. HUD / StatusHeader

Jobs: HP/MP/Fatigue always; identity (rank + level) always; depth (location) always; the rest on expand.

Changes:

- **Humanize location.** Map ids in one function: `awakening → Assessment room`, `d_rank_gate → D-rank gate`, `instant_dungeon → Instant dungeon`, `surface → Surface`, `red_gate → Red gate`, `any → ` (hide).
- **Rank chip is the toy.** It should be the most designed 40px in the app. Tapping it expands.
- **Deltas:** keep floating. Add a tiny burst matching the stat colour. HP loss should feel like a punch, not a toast.
- **Anomaly badge:** keep, but pair with the red grain bed so it is not the only signal.
- **Abandon** stays buried in the expanded sheet. Confirm: `ABANDON RUN?` System-styled, two buttons.
- **Mute** lives next to abandon.
- **Diagnostics** leave the footer. Default off. Enable with `localStorage.system.debug = "1"` or `?debug=1`.

Low HP (< 25%): HUD gains a slow red pulse. This is friendly (you are about to die) without a tutorial.

Fatigue > 70: gold pulse on that bar; the fiction already penalises rolls.

---

## 13. Start, empty, error, ending states

| State | Treatment |
| --- | --- |
| First visit | Start as §6.1 |
| Returning, session in storage | Skip start if session valid (already). Show a 200ms System flicker, not a splash logo. |
| Stream error | Current error strip is fine. Add `RETRY LAST ACTION` that resends the choice. Do not dump stack traces. |
| Prefetch miss | Invisible. Never show “live vs prefetch.” |
| Death | §6.3. 800ms of silence. |
| Victory | §6.3. Do not fire confetti. Quiet competence. |
| Abandoned | No art change. Soft System: `[ Run discarded. ]` then start. |

Epilogue image: when the job exists, fade it in behind the ending window. Until then, use `ending.death` / `ending.victory` stills.

---

## 14. Motion, FX implementation notes

- All overlay FX live in one component, e.g. `apps/web/components/FxLayer.tsx`, `position: fixed; inset: 0; pointer-events: none; z-index: 40` (HUD is z-30).
- Panel-local FX (slash, dust) render **inside** the art stage so scroll stays sane.
- Use Framer Motion variants. CSS keyframes for particles (cheaper).
- Cap particles: 24 on mobile, 48 on desktop. Pause when `document.hidden`.
- `prefers-reduced-motion: reduce` already begun in `globals.css`. Extend it to: no shake, no snow, no scanline loop, keep opacity fades ≤ 150ms, **keep** level-up and death as a static full-screen System card.
- Do not animate layout of older panels in the feed. Only the newest panel and the overlay move. (`layout` on every choice button is already borderline — keep it, do not add layout animation to the whole article list.)

---

## 15. Accessibility and friendliness details

- Contrast: body text `#dae4f7` on void is OK. Caption on art **must** sit on a gradient or text-shadow; never raw white on a white still.
- Focus rings: cyan, visible, for keyboard users. Choices are buttons already — keep them.
- `aria-live="polite"` on System lines; `assertive` on death.
- Do not auto-play audio.
- Hit targets ≥ 48px. Locked rows still focusable so the reason can be read.
- Language: `layout.tsx` is `lang="en"`. Keep. If Hebrew UI is added later, the System stays English-bracketed (diegetic UI); chrome can translate.
- Pinch-zoom is currently disabled (`maximumScale: 1`). That fights a11y. Change to `maximumScale: 2` and `user-scalable: yes` — the comment about scroll fighting zoom is not worth locking out low-vision players. Test that the feed still works.
- Reduce cognitive load: one new concept per early panel (window exists; then a gate; then a fight). Do not tooltip all three at once.

---

## 16. Copy and UI microcopy (chrome only)

Narrative voice stays in the other brief. Chrome voice:

- Buttons: `ACCEPT`, `ENTER THE GATE`, `ENTER A NEW GATE`, `ABANDON RUN`, `RETRY`.
- Hints: `Only you can see this window.` / `Tap the panel to skip.`
- Errors: `The System lost the connection.` not “SSE failed.”
- Lock reasons: keep mechanical (`Requires STR 16`). That is diegetic and friendly.

Do not add tooltip essays. Do not add a hamburger of lore.

---

## 17. Data model and SSE (what the engine must grow)

Minimum viable for the builder to implement visuals without guessing.

### 17.1 `Panel` (`packages/shared/src/panels.ts`)

Add:

```ts
export type BiomeLocation =
  | "awakening"
  | "d_rank_gate"
  | "instant_dungeon"
  | "surface"
  | "red_gate"
  | "hospital"
  | "shop";

export type PanelMood =
  | "fluorescent"
  | "night"
  | "ice"
  | "blood"
  | "gold"
  | "warm"
  | "void"
  | "aura";

export type FxId =
  | "confirm"
  | "safe_recover"
  | "strike"
  | "strike_heavy"
  | "fail_hit"
  | "fail_deadly"
  | "mp_spend"
  | "xp_tick"
  | "level_up"
  | "rank_up"
  | "system_open"
  | "shop_tempt"
  | "red_seal"
  | "collapse"
  | "rest"
  | "death"
  | "victory"
  | "lock_deny"
  | "anomaly_bed";

export interface PanelVisual {
  artKey: string;       // catalogue in §9.2
  mood: PanelMood;
  shot: "cramped" | "standard" | "bleed";
  caption: string;      // ≤ 140 chars
}

export interface Panel {
  // existing fields…
  visual: PanelVisual;
  fx: FxId[];
}
```

`text` remains the optional body. Prompts produce `caption` + short `text`.

### 17.2 SSE

Add one event, emitted **with or right after** `stats` (i.e. before narration), so juice is not gated on tokens:

```ts
| { type: "fx"; panelId: string; fx: FxId[] }
```

`panel_start` should also carry `kind`, `artKey`, `mood`, `shot` (or a nested `visual` without caption, caption may arrive with system/narration). The art must paint **before** the first word.

Extend `panel_start` rather than waiting on a new round trip.

### 17.3 Static nodes (`seed.ts` / `StaticNodeRecord`)

Add `caption`, `artKey`, `mood`. Cut `content` to the body budget. Do not regenerate lore.

### 17.4 Prompts (`prompts.ts`)

Change VOICE:

> One panel is a **caption of at most 140 characters** and a body of **20–45 words**. Never exceed 60 words unless the scene is a rule-temple. Do not repeat System numbers in the body.

Ask the model for JSON or two labelled blocks (`CAPTION:` / `BODY:`) — builder’s choice, but caption must be parseable. Mock provider must return both.

### 17.5 Resolver

May attach suggested `fx` to `TurnOutcome`. Better there than in the LLM. Level-up / death / rank-up already known.

### 17.6 What not to add this pass

Inventory UI, skill icons, shadow army gallery, gacha, map. Daily quest + Penalty Zone are **narrative** gaps (other brief) that should reuse this visual system (`artKey` for a hospital stairwell and a many-legged dark) when those nodes are written.

---

## 18. File map for the builder

Touch only what the visual change needs.

| File | Change |
| --- | --- |
| `packages/shared/src/panels.ts` | `PanelVisual`, `FxId`, fields on `Panel` |
| `packages/shared/src/events.ts` | `fx` event; richer `panel_start` |
| `apps/server/src/engine/types.ts` | visual on generated/static nodes; fx on outcome |
| `apps/server/src/engine/resolver.ts` | stamp fx from success/risk/level/death |
| `apps/server/src/engine/llm/prompts.ts` | caption + shorter body |
| `apps/server/src/engine/llm/mock.ts` | emit caption |
| `apps/server/src/engine/session.ts` / `turn.ts` / `generation.ts` | pass visual through; emit fx early |
| `apps/server/src/db/seed.ts` | captions, artKeys, shorter content |
| `apps/server/src/db/migrations.ts` + static node repo | persist new columns or jsonb `visual` |
| `apps/web/app/globals.css` | tokens, biome grades, FX keyframes, reduced-motion |
| `apps/web/app/layout.tsx` | allow pinch-zoom; maybe load one display font |
| `apps/web/app/page.tsx` | diagnostics default off; skip-stream; FxLayer; sticky dock |
| `apps/web/components/PanelCard.tsx` | art stage + caption + body |
| `apps/web/components/SystemWindow.tsx` | overlay positioning; scanline |
| `apps/web/components/ChoiceList.tsx` | visible risk, System lock glyph, press FX, 52px targets |
| `apps/web/components/StatusHeader.tsx` | rank glow-up, human location, mute |
| `apps/web/components/StartScreen.tsx` | §6.1 |
| `apps/web/components/EndingCard.tsx` | still + silence + one sentence |
| `apps/web/lib/useRun.ts` | handle `fx` + visual fields |
| **new** `apps/web/components/FxLayer.tsx` | global overlays |
| **new** `apps/web/components/PanelArt.tsx` | still + mood + local FX |
| **new** `apps/web/lib/locationLabels.ts` | human names |
| **new** `apps/web/lib/fxFromOutcome.ts` | client fallback mapping |
| **new** `apps/web/public/art/*.webp` | stills (or CSS stand-ins first) |

Do not restyle by editing `node_modules/@system/web`. The app lives in `apps/web`.

---

## 19. Phased build (do not boil the ocean)

### Phase A — Friendly and readable (do this first)

Ship even with **CSS-only** biomes (gradients + grain + silhouettes, no painted stills).

1. Diagnostics default off.
2. Start screen rewrite.
3. Caption + shorter prompt/static copy.
4. Panel art stage with mood grades per location.
5. Choice risk always visible; System lock glyph; 52px targets; sticky mobile dock.
6. `FxLayer`: confirm, fail_hit, xp_tick, mp_spend, level_up, death (minimum set).
7. Human location labels; rank chip glow-up; low-HP pulse.
8. Tap-to-complete streaming text.
9. `prefers-reduced-motion` coverage; pinch-zoom unlocked.

**Exit:** a new player understands the game without reading a paragraph, and every tap flashes the world.

### Phase B — Pictures

10. Painted/illustrated stills for the `artKey` catalogue.
11. Glow-up sizing by level.
12. Red Gate seal + snow; collapse dust; shop gold.
13. Ending stills; wire `EndingCard` to them.
14. Mute + optional SFX pack (short, original).

### Phase C — Spectacle

15. Epilogue image worker for real (existing `JobQueue` seam).
16. Shadow/aura palette when Job Change content exists.
17. Haptics.
18. Share card (the ending still + rank) — only if it does not delay restart.

---

## 20. Acceptance criteria

A builder is done with Phase A when all of these are true:

1. Opening the site, the first screen is a System window and a single accept action. No architecture lecture.
2. The first run panel is a **picture** (gradient plate counts) with a System overlay and a caption ≤ 140 characters. Body is shorter than today’s seed nodes.
3. Tapping a choice plays a visible effect **before** the next paragraph finishes typing.
4. Failing a moderate/deadly action flashes red and slams HP. Succeeding a combat action slashes the panel. Level-up takes over the screen.
5. Locked options show a System reason and a non-emoji lock. Risk words are visible on a phone with no hover.
6. Location is human-readable. Diagnostics are off. No `authored` label in the comic.
7. Death waits a beat, then one CTA. Victory is quiet, not confetti.
8. `prefers-reduced-motion: reduce` still communicates success/fail/level-up/death.
9. The SSE path still has **no spinner**. Art is local.
10. Narrative invariants from the other brief still hold (original prose, System voice, no NPC sees the window).

Phase B adds: at least eight distinct `artKey` stills, Red Gate snow/seal, mute + SFX.

---

## 21. Anti-patterns (instant reject in review)

- Chat-bubble layout. We are not iMessage with a dungeon.
- Unique AI image per panel on the turn path.
- Confetti, emoji in System text, mascots, “Great job!” toasts.
- Hover-only information on a mobile-first game.
- Narrator explaining that something was cool.
- A help modal with lore dumps.
- Spinners, skeleton screens for turns, “generating your fate…”
- Rounding the System into a friendly chatbot (warm copy, jokes, please).
- Making deadly options look like the safe ones “so it is nicer.”
- One-tapping named NPCs as a visual gag (blood explosion as punchline).
- Putting STR/AGI/divergence in the player’s face every frame. Identity is rank + HP; the rest is the sheet.
- Shipping diagnostics on.
- Adding a second animation library.
- Editing `node_modules`.

---

## 22. One-screen reference for the builder

```
TAP
  → optimistic confirm FX
  → stats event (bars already move — punch them)
  → fx event (fail / slash / level-up / seal)
  → art stage swaps mood/still instantly
  → System lines snap onto the art
  → caption is there; body types in (tap skips)
  → new choices rise in the thumb dock

LOOK
  early: small, fluorescent, busy, hunter tiny
  late: wide, dark, quiet, hunter unreadable
  red: snow, sealed, anomaly chrome

READ
  caption first, 20–45 words if needed, System for numbers

FEEL
  friendly chrome (clear, fast, thumbable)
  lethal fiction (death is real, aura can kill you)
```

The product is the blue window on a painted gate. Everything else is supporting that click.
