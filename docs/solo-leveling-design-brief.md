# Solo Leveling design brief

Hand-off for the agent building this game. Research compiled 2026-09-17 from public coverage, wiki summaries, and fan discussion (Reddit, MAL, CBR, GameRant, ScreenRant). This is original analysis for design, not a copy of the source. Keep all in-game prose original, as `seed.ts` already does.

Read this before writing static nodes, lore chunks, System copy, choice labels, NPC interactions, or narrator voice.

## 1. What the series actually is

Solo Leveling (Korean: *Na Honjaman Level Up*; Japanese anime: *Ore dake Level Up na Ken*) is a Korean web novel by Chugong, adapted as a manhwa (art by Dubu / REDICE Studio) and then as an A-1 Pictures anime (S1 2024, S2 *Arise from the Shadow* 2025).

The fantasy is simple and that is the point: Sung Jinwoo is the weakest E-rank hunter in a world of monster Gates. After a massacre in a hidden double dungeon, a game-like System makes him the only human who can level up. He becomes the Shadow Monarch and builds an army of the dead.

Fans and critics agree on the same sentence: **it is a power fantasy executed as spectacle**, not a character drama. Season 2 sits around **8.5 on MyAnimeList**; Season 1 is lower because it is slower setup. People stay for aura, System windows, the weak-to-god glow-up, and fight staging. They leave (or dunk) because side characters flatten, fights become "Jinwoo arrives and wins," and the writing does not interrogate the fantasy.

This game is already closer to the good version of that formula than the anime is: the player is an original E-rank hunter, not Jinwoo; choices can fail; death is real; canon divergence is a visible stat. Lean into that. Do not write a recap of the anime.

## 2. World systems (authoritative for lore and prompts)

These are the physics of the setting. Contradicting them breaks immersion instantly.

### Hunters

- Awakening is random. Not every awakened person is a licensed hunter.
- Rank is **mana capacity at awakening**, not skill. Rank is for life except for the rare **double awakening**.
- Scale: E (barely above civilian) → D (often miners, not fighters) → C (roughly tank-level force) → B (about ten C-ranks) → A (raid leaders; needed to survive a Red Gate) → S (living disasters; the law cannot really bind them). Korea starts with a handful of S-ranks.
- Classes: Fighter, Mage, Assassin, Tanker, Ranger, Healer. Healers are scarce and expensive. Party composition is tank + damage + healer or the raid is a funeral.
- Rank cannot be read by eye. A **mana meter** (built from mana crystals) is required. Cheap meters misread. This is a free scenario: the Association says the player is still E while the System says otherwise.

### Gates

- Blue rifts into dungeon instances. Ranked E–S like hunters. Higher rank = larger (S-rank gates read as storms).
- Clear condition: kill the boss, extract the core / essence. Uncleared past the window (about a week) → **dungeon break** (monsters spill into the city). After the boss dies the gate usually closes within an hour, so mining happens *during* the raid, not after.
- Once a party is inside, outsiders generally cannot follow.
- **Red Gates** look normal until you step through. Then they seal. Exit only by clear, death, or break. Internal weather and time. Lowest Red Gates are already B-rank. The Association treats every one as an emergency. The game already uses this as the anti-collision override — keep that mapping; it is lore-correct.

### Guilds and money

- Raiding is an industry. Crystals, essence stones, and monster parts are the economy. E-ranks often cannot break even on gear.
- Guilds hoard healers and take rights to loot. Freelance hunters get worse rates and no healer.
- Recruiters are predators with coffee. High-rank hunters are national assets and political problems.

### The System (the product)

This is the icon of the franchise. The game's blue windows are the brand.

- Visible only to the Player. Other hunters cannot see, hear, or argue with it.
- Voice: terse, bracketed, impersonal. It does not explain, negotiate, joke, or comfort. `[ Daily Quest has not been completed. ]` not "Hey, you should train."
- Unique rule of the universe: **ordinary hunters cannot level**. Only the Player grows by XP and stat points.
- Components fans expect:
  - Stats: Strength, Agility, Vitality, Intelligence, Perception (this game currently surfaces STR/AGI plus HP/MP/Fatigue — fine; do not invent a seventh axis without a reason).
  - Daily quests: mundane physical training (run, push-ups). Missing one is not a slap on the wrist; it **teleports you into a Penalty Zone**.
  - Penalty Zone: sealed survival instance (the first one is hours among giant centipedes). Completing it still grants some rewards but **skips status recovery**. The System can escalate the penalty if you farm it. That is a perfect "locked / deadly" choice.
  - Instant dungeons: private instances only the Player can enter.
  - Inventory: near-unlimited, items materialise and vanish.
  - Shop: gold from kills; potions, weapons, loot boxes. Slightly wrong, slightly tempting.
  - Job Change: at a threshold (canon: level 40) a special dungeon scores you on **time survived**, not kills. Reward is a class. Hidden class: Necromancer → Shadow Monarch.
  - Main quests are mandatory. Dailies are optional until the timer hits zero.

### Shadows

After Job Change: `Arise` extracts a shadow from a corpse the Player has the right to claim. Limits fans will notice if you ignore them:

- Cannot extract something stronger than you.
- Cannot extract some demonic / corrupted-mana beings (Baruka is the famous miss).
- Named elites become companions with personality, not inventory items.
- Grades: the army is a hierarchy. General-grade and above can speak.
- `Monarch's Domain` buffs active shadows. Shadows can be stored, summoned, and later used as portals.

Fan-favourite shadow *roles* (use original names; copy the dynamics, not the IP):

| Role | Tone | What players want from them |
| --- | --- | --- |
| Silent knight (Igris-type) | Chivalry, aura, kneels after a kill, will drop a weapon for a fair fight | "Coolest ally." Give a bow, a fair-fight option, a protect-the-civilian beat. |
| Theatrical general (Beru-type) | Overloyal, archaic speech, comedy that still murders | Banter, over-literal orders, "my liege." Best comic NPC once unlocked. |
| Dumb loyal bruiser (Iron-type) | Reckless, headbutts, annoys the knight | Comic relief that used to be a human who failed a moral test. |
| Mount / spectacle (Kaisel-type) | Rare, beautiful, travel set-piece | A single "call the mount" locked option until late. |

### Cosmology (late game only)

Do not dump this in the opening. Seed it as wrong details.

- Gates exist because of a war between **Rulers** (light) and **Monarchs** (destruction), originally staged by a cruel Absolute Being.
- The System is a training program to prepare a human vessel for the Shadow Monarch (Ashborn). Jinwoo was chosen not for strength but because he kept walking into death and refusing it.
- The Architect (hooded tablet-bearer in the first temple) built the System; Ashborn later betrays that plan and *gives* the power instead of possessing the host.
- National Level Hunters exist because of Kamish, a dragon from the first US S-rank break. Five survivors got nation-tier authority.

## 3. What people love (design toward this)

From Reddit, MAL, and recap coverage, the feelings people pay for:

1. **The glow-up.** Weak, humiliated, in debt, family in hospital → silent, composed, unreadable. The haircut and the stare are the meme. The game should make early panels physically small and late panels physically dominant.
2. **System dopamine.** Blue windows, level-ups, `[ You have leveled up. ]`, stat allocation, daily quests, job change. The UI *is* the character.
3. **Solo competence.** The title is the promise. Parties are liability, politics, or witnesses. The most satisfying choices are "send them out, stay behind" and "clear it alone."
4. **Aura, not speeches.** Kneel. Arise. Walk out of the smoke. One line, then silence. If the narrator explains why it was cool, it stopped being cool.
5. **Rule-bound death games.** The Cartenon Temple (bow / praise / prove faith) is the series' best interactive design: commandments that are lethal if misread, statues that move when unwatched, an altar that demands a sacrifice so others can leave.
6. **Hidden strength vs public rank.** Everyone's meter still says E. The player knows. The Association does not. Guilds smell something and offer contracts. This social lie is more interesting than another wolf.
7. **Family as the real HP bar.** Jinwoo's mother (Eternal Sleep) and sister are why he accepts the System. Power fantasy without a reason to live is what fans call "aura farming."
8. **Shadow crew as the actual supporting cast.** Fans openly like Igris/Beru/Iron more than Korean S-ranks. Once the player has an army, talk to the army.
9. **Set-piece environments.** Ice Red Gate, Demon Castle floors, Jeju ant hive, collapsing gates. Spectacle needs a distinct biome per arc, not "another corridor."

## 4. What people complain about (design against this)

These are the traps that will make generated runs feel like "bad Solo Leveling."

1. **Side characters exist to be one-tapped.** Recurring criticism: S-ranks are built up, then flattened so the lead looks good. In this game, named hunters should have their own successful raids off-screen, refuse the player's help, or survive without being rescued. If they only scream and die, the player will feel the anime's worst habit.
2. **Predictable wins.** "You know Jinwoo is going to win" is the #1 fight complaint. Keep the engine's real failure/death. Offer deadly options that look stylish. Do not let the narrator imply invincibility before Job Change.
3. **Personality freeze.** The author (Chugong) has said Jinwoo's coldness was meant to be Ashborn's war-machine mind intertwining with a human who still protects his family — and that he failed to land the tug-of-war on the page. The anime is trying to keep more humanity. **The game can do the thing the novel regrets:** every major power spike should cost warmth, and family/loyalty choices should buy it back.
4. **Healers and women as props.** Lee Joohee is the textbook: trauma, almost-romance, then she exits so the cooler S-rank can enter. If the game introduces a healer, give them a full exit with agency (retire, refuse a gate, hand back a stone) rather than forgetting them.
5. **Repetitive dungeons.** Instant-dungeon grinding is canon and also what Arise players call tedious. Static early nodes can repeat; generated mid-game must change the *rule* of the room (commandments, weather, time, hostages), not only the monster sprite.
6. **Gacha / grind feelings.** Arise players ask for Jinwoo-centric power fantasy, playable shadows, less repetition, skip for chores, fair progression. This webtoon game should feel like **one lethal run**, not a stamina system.

## 5. Arc templates → scenario types

Do not retell these plots. Steal the *shape*.

| Arc shape | Emotional job | Choice pattern |
| --- | --- | --- |
| Double dungeon / temple of rules | Humiliation, sacrifice, first "yes" to the System | Puzzle-commands with lethal misreads; stay-behind vs flee; tie-breaker vote to go deeper |
| Hospital / daily quest | The System is not a gift | Do the humiliating training vs skip and eat the Penalty Zone |
| Instant dungeon | Secret growth | Enter alone, hide the window, lie to the Association |
| Lizards / prisoners | Humans are worse than beasts | Betrayal by the party; kill/spare; first moral scar |
| Raid partner (Jinho-type) | Loyalty without power | Protect the comic weak ally; guild paperwork; "be my tank, I'll be your money" |
| Job Change | Identity | Survive-for-points, not kill-count; accept a class that feels unclean (necromancy) |
| Red Gate | Leadership vs solo | Save the weak group or hunt the boss; weather, starvation, other hunters going feral |
| Demon Castle | Vertical RPG floors | Spend days inside for a family cure; ignore a national crisis to finish a personal quest |
| Rank retest | Social explosion | Walk into the Association as E, leave as S; every NPC's attitude flips |
| Hive / Jeju-shape | Arrival fantasy, used sparingly | Others are dying; the player shows up late on purpose or not — this is the "aura" scene fans want and also the one they call empty if overused |
| Recruiter / guild war | Politics | Contracts, exclusive loot clauses, being treated as a weapon |
| Architect / truth | Cosmology | The System was always a person. Asking it a question should eventually matter on a high-divergence run |

## 6. NPC voices for interactions

Write original names. Hit these *functions*:

- **The healer who already knows you are going to die.** Kind, ranked above you, begs you to take weaker gates. After the first massacre they may retire. Contrast to the Player's stubbornness.
- **The rich D-rank who wants to be useful.** Optimistic, talks too much, good at money, bad at killing. Best friend energy. Never make them secretly evil.
- **The Association inspector.** Polite, scary, notices the numbers that do not add up. Recurring, not a boss.
- **The old chairman.** Mentors without fan service. Values civilian lives. Rare scenes should feel like being seen by the one adult in the room.
- **The fire-mage guild master.** Professional, contractual, team-first. Offers status. Wants the Player as a weapon.
- **The beast-guild master.** Can smell rank. Persistent recruiter. Respects strength, suspicious of secrets.
- **The S-rank swordswoman who flinches at everyone else's mana.** The Player is the one person who does not smell like rot. Attraction as sensory relief, not a reward speech.
- **The party leader who will feed you to the boss.** Smiles. Counts heads. Does the arithmetic out loud.
- **The prisoner hunter.** Reduced sentence for raid labour. Unstable. The Association calls it policy.

Tone of Player-facing second person: early = tight chest, counting dead ceiling tiles, hazard pay that will not cover a funeral. Late = fewer words, other people filling the silence with fear. Never have the Player monologue about being the strongest.

## 7. System copy and choice texture

### System lines

Keep the existing house style. Examples of *register*, not to paste as content:

- `[ You have acquired the qualification to be a Player. ]`
- `[ Daily Quest: The Preparation to Become Powerful — incomplete. ]`
- `[ Penalty Zone transfer in 10 seconds. ]`
- `[ Job Change Quest will now begin. Survival time is converted to class points. ]`
- `[ Shadow extraction failed. The target's mana is incompatible. ]`
- `[ Warning: this gate is not in the registry. ]`

No emoji. No warmth. No "please." Numbers over adjectives.

### Four-option grammar (matches `buildChoicesPrompt`)

Every node should feel like a Solo Leveling panel, not a D&D skill check. Preferred axes:

1. **Solo vs party** — scout alone / stay behind the tank / refuse the raid / bargain for a larger cut. Already in `gate_briefing_01`. Keep this axis everywhere.
2. **Obey the System vs test it** — accept the window, ignore it, ask if anyone else can see it. The System punishes curiosity with silence and disobedience with a teleport.
3. **Hide the power vs leak it** — the social game. Meters, recruiters, cameras, a hunter who "smells" you.
4. **Mercy vs extraction** — after Job Change. Spare, kill, raise. Extraction is power and a moral stain. Some corpses should fail.
5. **Stylish deadly vs boring safe** — fans want aura; the engine should let aura get them killed. Locked options are the FOMO of "I could Arise if I were stronger."
6. **Family / debt vs the raid** — skip the national emergency to brew a cure; do push-ups in a hospital stairwell; answer your sister's call inside a gate.

Labels: imperative, ≤8 words, concrete nouns (knee joint, altar, page four), not "use diplomacy."

## 8. Gaps in the current game vs this research

Already in good shape: ranks, red gates, System voice, instant dungeons, guild contracts, ant hierarchy, death as routine, locked FOMO option, original prose.

Worth adding when you next touch lore / seed / prompts:

1. **Daily quest + Penalty Zone** as a first-week loop. The most "Solo Leveling" non-combat scenario in the franchise. Missing from `lore.ts` and `seed.ts`.
2. **Hunter classes** (Fighter / Mage / Assassin / Tanker / Ranger / Healer) as a lore chunk and as a way to flavour options ("draw aggro" should require a tank identity or fail).
3. **Double awakening / mana meter politics.** The Association retesting you and getting E is a better scene than another corridor.
4. **Commandment rooms.** One static node that is a rule-temple, not a monster. Watchers, altars, "prove faith." This is the series' best interaction design and we have no analogue yet.
5. **Party betrayal** node (lizards / prisoners shape). Humans as the combat encounter.
6. **Job Change survive-timer** as a mid-game location, with class offer that feels unclean.
7. **Shadow extraction failure.** Teach the player that Arise is not a vending machine.
8. **Family / Eternal Sleep analogue** as the reason to keep playing, even if names are original.
9. **Prompt invariant:** other hunters cannot see System windows (already present). Add: do not have NPCs comment on the player's "level"; they comment on *smell, posture, unexplained kills, a gate that closed too fast*.
10. **Prompt invariant:** after a power spike, write colder and shorter. After a family beat, allow one uncool sentence.
11. **Anti-complaint invariant:** named NPCs should not be introduced solely to die in the next panel. If they die, the player chose something that made it so.
12. **Canon divergence:** the "Jinwoo path" is solo, secret, family-first, necromancy accepted. High divergence is the opposite: join a guild early, reveal the System, refuse extraction, try to save everyone, stay human. Fans who wanted better side characters will live on the high-divergence spine.

## 9. Suggested static nodes (original scenes, same pressure)

Use these as a backlog; do not paste canon.

- Hospital stairwell, daily quest ticking, sister about to walk in.
- Penalty Zone: four hours, things with too many legs, a System note that farming this place will make the next visit worse.
- C-rank mine where the "miners" are D-ranks and the real raid team is already planning who is expendable.
- Recruiter coffee, page-four loot clause (exists) — add a follow-up where the guild tails you to an instant dungeon.
- Temple of rules (original commandments, same sadism).
- Job Change: empty throne, a knight who discards a weapon when you do.
- Ice biome Red Gate: two groups, one of them already eating their dead metaphorically (abandoning the weak).
- Extraction choice on a human hunter who tried to kill you.
- Association retest: the meter screams E, the room does not believe its eyes.
- A healer handing you a mana crystal and walking into ordinary night.

## 10. Sources (for follow-up, not to scrape)

- CBR: hunter ranks/guilds; gates; Kamish / National Level.
- GameRant / ScreenRant: Jinwoo personality change; Chugong interview on Ashborn's mind; Cha Hae-In; Double Dungeon hidden boss; Red Gate; Igris/Beru.
- Fandom wiki: story arc list; Job Change Quest; Cartenon commandments.
- Reddit r/anime, r/sololeveling, r/SoloLevelingArise: hype vs "mid writing"; side-character flattening; Igris vs Beru; Arise feature wishes.
- MyAnimeList: S2 ~8.5, received as better-paced spectacle than S1.
- ANN encyclopedia: premise, themes (dungeons, RPG elements, gore, corporations).

## 11. One-sentence north star

Write a webtoon that feels like being the only person in the room who can see the blue window — weak, then colder, then responsible for everyone who cannot level — and let the player either become a monarch or refuse the fantasy the anime never let Jinwoo refuse.
