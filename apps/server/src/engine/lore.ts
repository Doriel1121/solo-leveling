/**
 * The lore anchor. Retrieval is plain keyword scoring over a small hand-written
 * corpus, which is enough at this corpus size and keeps the hot path free of a
 * vector round trip. `LoreProvider` is the seam to swap in embeddings later
 * without touching the prompt builder.
 */
export interface LoreChunk {
  id: string;
  topic: string;
  tags: string[];
  text: string;
}

export interface LoreProvider {
  retrieve(query: string, limit: number): LoreChunk[];
  /** Rules injected on every call regardless of the query. */
  invariants(): string[];
}

const CORPUS: LoreChunk[] = [
  {
    id: "ranks",
    topic: "Hunter ranks",
    tags: ["rank", "hunter", "e-rank", "s-rank", "promotion", "association"],
    text: "Hunters are graded E, D, C, B, A, S from weakest to strongest, measured by the mana capacity detected at awakening. Rank is assigned by the Hunter's Association and is not casually reassigned; re-evaluation is a formal, rare event. An E-rank hunter cannot trade blows with a B-rank monster and survive on skill alone. Gates carry their own rank, and entering a gate above your own is treated as near-suicide by everyone sensible.",
  },
  {
    id: "mana",
    topic: "Mana and skills",
    tags: ["mana", "mp", "skill", "spell", "cast", "cost"],
    text: "Every skill draws on mana, tracked as MP. Spending mana you do not have is impossible, not merely unwise. Mana regenerates slowly at rest and barely at all under exertion. Physical classes rely on mana implicitly for strength and durability rather than explicit casting. Mana exhaustion presents as nausea, tunnel vision, and collapse.",
  },
  {
    id: "gates",
    topic: "Gates and dungeons",
    tags: ["gate", "dungeon", "portal", "raid", "break", "core"],
    text: "Gates are rifts that open in the real world and lead to a dungeon interior. Each dungeon holds a boss and a mana core; clearing the boss and extracting the core closes the gate. A gate left uncleared past its tolerance causes a dungeon break, spilling monsters into the surrounding city. Once a party enters, the gate usually cannot be re-entered from outside.",
  },
  {
    id: "red_gates",
    topic: "Red gates",
    tags: ["red", "anomaly", "trapped", "sealed", "unregistered"],
    text: "A red gate is an anomalous variant that seals behind the party on entry. No exit is possible until the dungeon's clear condition is met. Red gates frequently break the expected rank scaling, contain hostile weather, and run on their own internal time. Survival rates are catastrophically low and the Association treats every red gate as an emergency.",
  },
  {
    id: "instant_dungeon",
    topic: "Instant dungeons",
    tags: ["instant", "private", "dungeon", "system", "player"],
    text: "Instant dungeons are private instances accessible only to a Player who holds System access. Nobody else can see the entrance or follow them in. They are how the Player grows in secret while the Association still files them as E-rank.",
  },
  {
    id: "daily_quest",
    topic: "Daily quests and the Penalty Zone",
    tags: ["daily", "quest", "penalty", "training", "push-up", "hospital"],
    text: "The System issues a daily quest of mundane physical training. Completing it is optional until the timer hits zero. Missing it teleports the Player into a Penalty Zone: a sealed survival instance, often hours among things with too many legs. Completing the zone still grants some rewards but skips status recovery. Farming it makes the next visit worse. The System does not negotiate the timer.",
  },
  {
    id: "classes",
    topic: "Hunter classes",
    tags: ["class", "fighter", "mage", "assassin", "tanker", "ranger", "healer", "tank"],
    text: "Licensed hunters are classed Fighter, Mage, Assassin, Tanker, Ranger, or Healer. Healers are scarce and expensive; a raid without one is a funeral. Class is identity, not a menu: a hunter who has never tanked cannot suddenly draw aggro and live. The Player has no class until a Job Change dungeon scores them on time survived, not kills.",
  },
  {
    id: "mana_meter",
    topic: "Mana meters and rank",
    tags: ["meter", "crystal", "association", "retest", "awakening", "double"],
    text: "Rank cannot be read by eye. A mana meter built from mana crystals is required, and cheap meters misread. Rank is mana capacity at awakening and is for life except for the rare double awakening. The Association can retest a hunter and still get E while something else is obviously wrong. Other hunters comment on smell, posture, unexplained kills, or a gate that closed too fast — never on a 'level'.",
  },
  {
    id: "job_change",
    topic: "Job Change",
    tags: ["job", "class", "change", "survive", "throne", "knight", "necromancy", "shadow"],
    text: "At a threshold the System opens a Job Change Quest: a special dungeon scored on time survived, not kill count. The class it offers may feel unclean. Extraction of a shadow from a corpse is power and a moral stain; some targets fail because they are stronger than the Player or their mana is incompatible. Named elites, once extracted, are companions with personality, not inventory items.",
  },
  {
    id: "guilds",
    topic: "Guilds",
    tags: ["guild", "contract", "recruiter", "party", "leader", "healer"],
    text: "Guilds organise hunters, negotiate raid contracts, and retain healers, who are scarce and expensive. Guild contracts commonly claim rights over items and cores recovered by members. Unaffiliated hunters take freelance raid work at worse rates and without healer support. Party composition conventionally pairs a tank, damage dealers, and a healer.",
  },
  {
    id: "system",
    topic: "The System",
    tags: ["system", "window", "level", "stat", "quest", "notification", "shop"],
    text: "The System appears to its Player as translucent blue windows only they can perceive. It awards levels and distributable stat points, which is unique — ordinary hunters cannot grow stronger by levelling. Its notifications are terse, bracketed, and impersonal. It does not explain itself, negotiate, or answer questions, and it never expresses emotion.",
  },
  {
    id: "monsters",
    topic: "Monsters",
    tags: ["monster", "ant", "boss", "magic beast", "soldier", "swarm"],
    text: "Dungeon monsters range from beast-like low ranks to intelligent, coordinating high ranks. Higher-rank monsters use tactics, command lesser ones, and can speak. Ant-type monsters in particular operate as a hierarchy under a king and display disciplined group behaviour. A monster's corpse yields no core; only the boss holds one.",
  },
  {
    id: "death",
    topic: "Death and injury",
    tags: ["death", "injury", "wound", "heal", "potion", "hospital"],
    text: "Hunter deaths are permanent, common, and administratively routine. Wounds taken inside a dungeon do not heal on their own; without a healer or a potion, serious injury inside a gate is usually terminal. Fatigue accumulates across a raid and degrades reaction time long before it becomes visible.",
  },
  {
    id: "family",
    topic: "Family and debt",
    tags: ["family", "sister", "mother", "hospital", "debt", "ward", "cure"],
    text: "The Player keeps running because someone at home cannot. Hospital bills, a sibling in school clothes, a parent who will not wake — that is the real HP bar. Skipping a national raid to brew a family cure is in character. Doing push-ups on a hospital stair while a landing door opens is more dangerous than another wolf. Power without a reason to live is empty aura.",
  },
  {
    id: "commandments",
    topic: "Temples of rules",
    tags: ["temple", "commandment", "altar", "statue", "faith", "bow", "watcher"],
    text: "Some dungeons are trials, not hunts. Commandments are lethal if misread. Statues move when unwatched. An altar may demand that someone stay so others can leave. The correct action is often humiliating (kneel, praise, stand still) rather than stylish. The Player who stays behind is the one the System can qualify.",
  },
  {
    id: "urgent",
    topic: "Urgent quests",
    tags: ["urgent", "emergency", "kill", "human", "quest", "heart", "penalty"],
    text: "The System issues dailies, mains, and urgent quests. Dailies are mundane training until the timer hits zero, then a Penalty Zone teleport. Urgent quests fire when the Player is about to die or when a human is about to kill them; failure can stop a heart. Some urgent quests demand the Player kill a person. That is a moral scar, not flavour text. The System does not apologise.",
  },
  {
    id: "shadows",
    topic: "Shadows",
    tags: ["shadow", "arise", "extract", "army", "knight", "companion", "necromancy"],
    text: "After Job Change, the Player may extract a shadow from a corpse they have the right to claim. Extraction fails if the target is stronger or the mana is incompatible. Named elites become companions with personality — a silent knight, a theatrical general, a reckless bruiser — not inventory items. Ordinary hunters cannot see the System; they can see the army once it is standing in the room.",
  },
  {
    id: "shop",
    topic: "System shop",
    tags: ["shop", "gold", "potion", "loot", "buy", "purchase", "window"],
    text: "Kills and quests pay gold into a System shop only the Player can see. Stock is slightly wrong and slightly tempting: potions, shortblades, loot boxes scaled to current level. During a Job Change dungeon the shop, potions, and level-up healing are disabled. The Player cannot spend gold other hunters can see.",
  },
];

const INVARIANTS = [
  "Never let the player spend MP, HP, or items they do not currently hold.",
  "Never promote the player's rank or level yourself; only the game engine does that.",
  "Never invent a way out of a sealed red gate other than meeting its clear condition.",
  "Keep System windows terse, bracketed, and emotionless. No emoji. No warmth. No please.",
  "The player is the only character with System access; other hunters cannot see its windows.",
  "Other hunters must never mention the player's 'level'. They comment on smell, posture, unexplained kills, or a gate that closed too fast.",
  "Do not introduce a named NPC solely so they can die in this panel. If they die, the player chose something that made it so.",
  "Do not have NPCs react to System windows. They cannot see them.",
  "Never recap System numbers in the body. The window already said them.",
  "Do not write a panel whose punchline is other hunters being impressed. Named hunters may succeed off-screen; they are not cheerleaders.",
  "Before Job Change, do not imply invincibility and do not offer Arise or extraction.",
  "After a power spike, write colder and shorter. After a family beat, one uncool sentence is allowed.",
  "Do not dump cosmology (rulers, monarchs, architects, absolute beings) in the first half of a run. Seed it as a wrong detail only when the player is already leaking or questioning the System.",
  "Change the rule of the room (commandment, weather, timer, hostage, contract clause), not only the monster sprite.",
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

class StaticLoreIndex implements LoreProvider {
  retrieve(query: string, limit: number): LoreChunk[] {
    const tokens = new Set(tokenize(query));
    const scored = CORPUS.map((chunk) => {
      let score = 0;
      for (const tag of chunk.tags) if (tokens.has(tag)) score += 3;
      for (const token of tokenize(chunk.topic)) if (tokens.has(token)) score += 2;
      for (const token of tokenize(chunk.text)) if (tokens.has(token)) score += 1;
      return { chunk, score };
    });

    const hits = scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.chunk);

    // Always ground the model in the System's voice, even on a total miss.
    if (!hits.some((chunk) => chunk.id === "system")) {
      const system = CORPUS.find((chunk) => chunk.id === "system")!;
      hits.unshift(system);
    }
    return hits.slice(0, limit);
  }

  invariants(): string[] {
    return INVARIANTS;
  }
}

export const lore: LoreProvider = new StaticLoreIndex();
