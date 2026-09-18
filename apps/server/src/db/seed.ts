import type { StaticNodeRecord } from "../engine/types.js";
import { upsertStaticNode } from "./repositories/staticNodes.js";

/**
 * Hand-authored nodes. These cover the high-traffic early game where every run
 * overlaps anyway, so the model is only paid for genuinely divergent paths.
 * All prose here is original; the lore anchor lives in engine/lore.ts.
 *
 * Two budgets are load-bearing and easy to break by accident:
 *   - `visual.caption` at most 140 characters. It sits on the artwork and has to
 *     carry the panel on its own.
 *   - `content` at 20-45 words. Only a temple of rules may run to 80.
 * If a scene feels thin, the fix is the art plate and the choices, not more prose.
 */
const nodes: StaticNodeRecord[] = [
  {
    id: "awakening_01",
    kind: "system",
    location: "awakening",
    minLevel: 1,
    maxLevel: 3,
    rankGate: null,
    systemLines: [
      "[ You have acquired the qualification to be a Player. ]",
      "[ Class: None — Title: None ]",
    ],
    content:
      "You have counted the dead fluorescent panels twice. Then a window opens beneath them, in the air, patient as a locked door. The examiner does not look up.",
    visual: {
      artKey: "awakening.office",
      mood: "fluorescent",
      shot: "cramped",
      caption:
        "A pane of cold blue light opens under the ceiling grid. Nobody else in the room looks up.",
    },
    options: [
      {
        id: "awk_touch",
        label: "Touch the window",
        detail: "Accept whatever is being offered",
        requires: {},
        risk: "moderate",
      },
      {
        id: "awk_ignore",
        label: "Pretend you see nothing",
        detail: "Keep your E-rank paperwork clean",
        requires: {},
        risk: "safe",
      },
      {
        id: "awk_ask",
        label: "Ask the examiner what she sees",
        detail: "Test whether you are alone in this",
        requires: {},
        risk: "safe",
      },
    ],
    requiredStats: {},
    weight: 10,
  },
  {
    id: "gate_briefing_01",
    kind: "narration",
    location: "d_rank_gate",
    minLevel: 1,
    maxLevel: 8,
    rankGate: null,
    systemLines: ["[ Gate rank: D — Recommended party: 6 ]"],
    content:
      "The tear hangs two metres above the supermarket car park, bruise-coloured. Someone presses a bundle of cheap mana-stones into your hand and calls it hazard pay.",
    visual: {
      artKey: "gate.carpark",
      mood: "night",
      shot: "cramped",
      caption:
        "Four hunters for a job that wanted six. The leader does the arithmetic out loud.",
    },
    options: [
      {
        id: "gate_scout",
        label: "Scout ahead alone",
        detail: "Nobody watches the rear when nobody is in it",
        requires: { agility: 12 },
        risk: "deadly",
      },
      {
        id: "gate_stack",
        label: "Stay tight behind the tank",
        detail: "Slow, boring, survivable",
        requires: {},
        risk: "safe",
      },
      {
        id: "gate_refuse",
        label: "Refuse the raid",
        detail: "Forfeit the fee, keep the ribs",
        requires: {},
        risk: "safe",
      },
      {
        id: "gate_bargain",
        label: "Demand a larger cut first",
        detail: "Leverage is a weapon too",
        requires: { level: 3 },
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 8,
  },
  {
    id: "daily_quest_01",
    kind: "system",
    location: "hospital",
    minLevel: 1,
    maxLevel: 5,
    rankGate: null,
    systemLines: [
      "[ Daily Quest: preparation to become powerful. ]",
      "[ Incomplete. Time remaining: 00:41:12 ]",
    ],
    content:
      "Push-ups, squats, a run you have no legs left for. Two floors up, your sister is asleep in a room you cannot afford. The counter keeps going.",
    visual: {
      artKey: "hospital.stairwell",
      mood: "warm",
      shot: "cramped",
      caption:
        "The window follows you into the hospital stairwell and will not close.",
    },
    options: [
      {
        id: "daily_comply",
        label: "Do the push-ups on the landing",
        detail: "Humiliating, and countable",
        requires: {},
        risk: "safe",
      },
      {
        id: "daily_sit",
        label: "Sit with her until the timer dies",
        detail: "Let the penalty come",
        requires: {},
        risk: "moderate",
      },
      {
        id: "daily_interrogate",
        label: "Ask the window what the penalty is",
        detail: "It has never answered before",
        requires: {},
        risk: "safe",
      },
      {
        id: "daily_skip",
        label: "Skip it and take a gate instead",
        detail: "Outrun the clock",
        requires: {},
        risk: "deadly",
      },
    ],
    requiredStats: {},
    weight: 9,
  },
  {
    id: "penalty_zone_01",
    kind: "combat",
    location: "penalty_zone",
    minLevel: 1,
    maxLevel: null,
    rankGate: null,
    systemLines: [
      "[ Penalty Zone. Duration: four hours. ]",
      "[ Status recovery is suspended for the duration. ]",
    ],
    content:
      "Heat with no sun in it. The first one surfaces a body-length away, segment by segment, and the System adds a note: farming this place will make the next visit worse.",
    visual: {
      artKey: "penalty.legs",
      mood: "void",
      shot: "bleed",
      caption:
        "Four hours, no recovery, and something in the sand with far too many legs.",
    },
    options: [
      {
        id: "penalty_wall",
        label: "Put your back to the wall and wait",
        detail: "Survive it, do not win it",
        requires: {},
        risk: "moderate",
      },
      {
        id: "penalty_study",
        label: "Kill one and count the segments",
        detail: "Learn where it comes apart",
        requires: { strength: 12 },
        risk: "moderate",
      },
      {
        id: "penalty_farm",
        label: "Clear the whole zone for rewards",
        detail: "The next one will be worse",
        requires: { level: 4 },
        risk: "deadly",
      },
      {
        id: "penalty_refuse",
        label: "Sit down and refuse to fight",
        detail: "Call the System's bluff",
        requires: {},
        risk: "deadly",
      },
    ],
    requiredStats: {},
    weight: 8,
  },
  {
    id: "ant_sentry_01",
    kind: "combat",
    location: "instant_dungeon",
    minLevel: 2,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ Hostile detected: Soldier Ant ]"],
    content:
      "Chitin the colour of wet slate. Mandibles that open sideways. It tilts its head at you with something much worse than hunger: assessment.",
    visual: {
      artKey: "dungeon.pillar",
      mood: "night",
      shot: "standard",
      caption:
        "It comes around the pillar on four legs and stands up on two.",
    },
    options: [
      {
        id: "ant_strike",
        label: "Strike first, at the knee joint",
        detail: "Take the leg, take the speed",
        requires: { strength: 11 },
        risk: "moderate",
      },
      {
        id: "ant_backstep",
        label: "Back toward the corridor mouth",
        detail: "Force it to come to you",
        requires: {},
        risk: "moderate",
      },
      {
        id: "ant_mana_burst",
        label: "Burn mana into a single blow",
        detail: "Costs 15 MP",
        requires: { mp: 15 },
        risk: "moderate",
      },
      {
        id: "ant_play_dead",
        label: "Cut with the System blade",
        detail: "Requires the notched shortblade",
        requires: { item: "notched shortblade" },
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 6,
  },
  {
    id: "temple_rules_01",
    kind: "system",
    location: "instant_dungeon",
    minLevel: 3,
    maxLevel: null,
    rankGate: null,
    systemLines: [
      "[ Unregistered structure. ]",
      "[ Commandment one: the unworthy do not look up. ]",
    ],
    // A temple of rules is the one scene the budget allows to run long: the
    // rules themselves are the interaction, so they have to be legible.
    content:
      "The first commandment is carved at the door. The other three are inside, where you cannot read them without looking up. Four stone figures face the altar. You are fairly sure the nearest one stood further back when you came in, and there is nothing in this room that could have moved it.",
    visual: {
      artKey: "temple.commandments",
      mood: "void",
      shot: "standard",
      caption:
        "A wall of commandments in a language you should not be able to read, and four statues facing away from it.",
    },
    options: [
      {
        id: "temple_kneel",
        label: "Kneel and keep your eyes down",
        detail: "Obey the only rule you can read",
        requires: {},
        risk: "safe",
      },
      {
        id: "temple_read",
        label: "Read the other three commandments",
        detail: "Looking up breaks the first",
        requires: {},
        risk: "deadly",
      },
      {
        id: "temple_watch",
        label: "Watch the statues, not the wall",
        detail: "They move when unobserved",
        requires: { agility: 13 },
        risk: "moderate",
      },
      {
        id: "temple_altar",
        label: "Put your hand on the altar",
        detail: "It has asked for something",
        requires: { level: 5 },
        risk: "deadly",
      },
    ],
    requiredStats: {},
    weight: 7,
  },
  {
    id: "healing_room_01",
    kind: "narration",
    location: "instant_dungeon",
    minLevel: 1,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ Safe zone detected. Fatigue recovery available. ]"],
    content:
      "Water runs somewhere under the floor. Your hands have started shaking now that they are finally allowed to. Nothing in here wants anything from you, which is new.",
    visual: {
      artKey: "dungeon.safe",
      mood: "night",
      shot: "standard",
      caption: "One way in, no way further. The air is suspiciously clean.",
    },
    options: [
      {
        id: "heal_rest",
        label: "Sit down and breathe",
        detail: "Shed fatigue, lose the initiative",
        requires: {},
        risk: "safe",
      },
      {
        id: "heal_search",
        label: "Search the chamber walls",
        detail: "Safe zones are built, not found",
        requires: {},
        risk: "moderate",
      },
      {
        id: "heal_push",
        label: "Push on without stopping",
        detail: "Momentum over recovery",
        requires: {},
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 5,
  },
  {
    id: "merchant_01",
    kind: "system",
    location: "any",
    minLevel: 2,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ An unscheduled shop window has opened. ]"],
    content:
      "The window is the wrong shade of blue. You did not open it. Under the third item, in smaller text: payment negotiable.",
    visual: {
      artKey: "system.shop",
      mood: "gold",
      shot: "standard",
      caption:
        "Three items, no prices, and a countdown in no unit of time you recognise.",
    },
    options: [
      {
        id: "shop_take_blade",
        label: "Take the notched shortblade",
        detail: "Weight in the hand beats theory",
        requires: {},
        risk: "moderate",
        grant: "notched shortblade",
      },
      {
        id: "shop_take_vial",
        label: "Take the cloudy vial",
        detail: "Unlabelled, warm to the touch",
        requires: {},
        risk: "deadly",
        grant: "cloudy vial",
      },
      {
        id: "shop_negotiate",
        label: "Ask what 'negotiable' means",
        detail: "Requires level 5 nerve",
        requires: { level: 5 },
        risk: "deadly",
      },
      {
        id: "shop_close",
        label: "Close the window",
        detail: "Nothing good is ever this convenient",
        requires: {},
        risk: "safe",
      },
    ],
    requiredStats: {},
    weight: 4,
  },
  {
    id: "party_betrayal_01",
    kind: "combat",
    location: "instant_dungeon",
    minLevel: 4,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ Hostile intent detected. Source: party member. ]"],
    content:
      "The boss door is behind him. So is the healer, who will not meet your eyes. Nobody has drawn yet. In here, the Association records whatever the survivors agree to say.",
    visual: {
      artKey: "dungeon.hunters",
      mood: "night",
      shot: "standard",
      caption:
        "The leader counts heads again, and this time you follow the arithmetic.",
    },
    options: [
      {
        id: "betray_draw",
        label: "Draw first",
        detail: "Requires 14 agility",
        requires: { agility: 14 },
        risk: "deadly",
      },
      {
        id: "betray_step",
        label: "Step aside and let them past",
        detail: "Lose the cut, keep the ribs",
        requires: {},
        risk: "safe",
      },
      {
        id: "betray_name",
        label: "Say the healer's name out loud",
        detail: "Make her choose in front of him",
        requires: {},
        risk: "moderate",
      },
      {
        id: "betray_pay",
        label: "Offer him your entire share",
        detail: "Buy the door with money",
        requires: {},
        risk: "safe",
      },
    ],
    requiredStats: {},
    weight: 6,
  },
  {
    id: "collapse_01",
    kind: "combat",
    location: "instant_dungeon",
    minLevel: 4,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ Warning: structural integrity failing. 20 seconds. ]"],
    content:
      "Dust, then gravel, then something larger you do not look up to identify. Two exits: the flooded stair, the closing arch. The System counts for you, which is the only mercy on offer.",
    visual: {
      artKey: "dungeon.collapse",
      mood: "night",
      shot: "standard",
      caption: "The ceiling makes a sound like a jaw unclenching.",
    },
    options: [
      {
        id: "collapse_stair",
        label: "Take the flooded stair",
        detail: "Cold, slow, probably deeper",
        requires: {},
        risk: "moderate",
      },
      {
        id: "collapse_sprint",
        label: "Sprint the arch before it closes",
        detail: "Requires 14 agility",
        requires: { agility: 14 },
        risk: "deadly",
      },
      {
        id: "collapse_brace",
        label: "Brace the arch with your back",
        detail: "Requires 16 strength",
        requires: { strength: 16 },
        risk: "deadly",
      },
    ],
    requiredStats: {},
    weight: 5,
  },
  {
    id: "association_retest_01",
    kind: "system",
    location: "surface",
    minLevel: 4,
    maxLevel: null,
    rankGate: null,
    systemLines: ["[ Measured capacity: E. ]"],
    content:
      "Second retest this week. The needle does not move, because the needle measures what you were born with. The inspector writes one word down and does not show you which.",
    visual: {
      artKey: "surface.association",
      mood: "fluorescent",
      shot: "standard",
      caption: "The meter reads E. The room stares at the meter, then at you.",
    },
    options: [
      {
        id: "retest_stand",
        label: "Let the E stand",
        detail: "Stay unwatched, stay cheap",
        requires: {},
        risk: "safe",
      },
      {
        id: "retest_break",
        label: "Push the meter past its ceiling",
        detail: "Requires level 6",
        requires: { level: 6 },
        risk: "deadly",
      },
      {
        id: "retest_notes",
        label: "Ask to read the inspector's notes",
        detail: "Find out what she wrote",
        requires: {},
        risk: "moderate",
      },
      {
        id: "retest_thread",
        label: "Mention the gate that closed early",
        detail: "Hand them one loose thread",
        requires: {},
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 7,
  },
  {
    id: "guild_offer_01",
    kind: "narration",
    location: "surface",
    minLevel: 5,
    maxLevel: null,
    rankGate: "D",
    systemLines: [],
    content:
      "Mid-tier guild. Real healers on retainer. A clause on page four about exclusive rights to anything you find. Your coffee goes cold while he smiles at you.",
    visual: {
      artKey: "surface.cafe",
      mood: "gold",
      shot: "standard",
      caption:
        "The contract arrives face-down, which tells you most of what you need to know.",
    },
    options: [
      {
        id: "guild_sign",
        label: "Sign it",
        detail: "Healers are worth a clause",
        requires: {},
        risk: "moderate",
      },
      {
        id: "guild_page_four",
        label: "Read page four aloud",
        detail: "Make him say it in daylight",
        requires: {},
        risk: "safe",
      },
      {
        id: "guild_walk",
        label: "Leave the coffee and go",
        detail: "Stay unaffiliated, stay unowned",
        requires: {},
        risk: "safe",
      },
    ],
    requiredStats: {},
    weight: 4,
  },
  {
    id: "job_change_01",
    kind: "system",
    location: "instant_dungeon",
    minLevel: 5,
    maxLevel: null,
    rankGate: null,
    systemLines: [
      "[ Job Change Quest will now begin. ]",
      "[ Survival time is converted to class points. ]",
    ],
    content:
      "The throne is empty. Across from it a knight in black plate waits with a sword already drawn, then, after a long look at yours, sets the weapon on the floor. The System is counting something that is not kills.",
    visual: {
      artKey: "job.throne",
      mood: "void",
      shot: "bleed",
      caption:
        "An empty throne, a knight who discards a weapon when you do, and a timer that is not counting kills.",
    },
    options: [
      {
        id: "job_drop",
        label: "Put your weapon down too",
        detail: "Match the knight",
        requires: {},
        risk: "moderate",
        grant: "knight's compact",
      },
      {
        id: "job_hold",
        label: "Keep the blade and wait it out",
        detail: "Survive for the points",
        requires: {},
        risk: "safe",
        grant: "survivor's mark",
      },
      {
        id: "job_take",
        label: "Sit on the throne",
        detail: "Accept whatever class it is selling",
        requires: { level: 5 },
        risk: "deadly",
        grant: "unclean class",
      },
      {
        id: "job_refuse",
        label: "Turn around and leave the class",
        detail: "Stay unclean-free, stay weaker",
        requires: {},
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 8,
  },
  {
    id: "healer_exit_01",
    kind: "narration",
    location: "surface",
    minLevel: 3,
    maxLevel: null,
    rankGate: null,
    systemLines: [],
    content:
      "She presses a warm mana crystal into your palm like a resignation letter. Behind her the street is ordinary night: shop lights, a bus, nobody dying. She does not ask you to come.",
    visual: {
      artKey: "surface.night",
      mood: "warm",
      shot: "standard",
      caption: "She hands you a mana crystal and walks into ordinary night.",
    },
    options: [
      {
        id: "heal_take",
        label: "Close your hand around the crystal",
        detail: "Let her go",
        requires: {},
        risk: "safe",
        grant: "warm mana crystal",
      },
      {
        id: "heal_ask",
        label: "Ask her to stay for one more gate",
        detail: "You already know the answer",
        requires: {},
        risk: "moderate",
      },
      {
        id: "heal_walk",
        label: "Walk her as far as the station",
        detail: "Lose the evening, keep a person",
        requires: {},
        risk: "safe",
      },
      {
        id: "heal_hide",
        label: "Show her the window anyway",
        detail: "Leak it to someone who might believe you",
        requires: {},
        risk: "deadly",
      },
    ],
    requiredStats: {},
    weight: 6,
  },
  {
    id: "red_gate_entry_01",
    kind: "red_gate",
    location: "red_gate",
    minLevel: 1,
    maxLevel: null,
    rankGate: null,
    systemLines: [
      "[ ANOMALY. This gate is not in the registry. ]",
      "[ Exit conditions: unknown ]",
    ],
    content:
      "Behind you the entrance seals with no sound at all — not a slam, just an absence where the way back used to be. Snow begins to fall indoors.",
    visual: {
      artKey: "redgate.snow",
      mood: "ice",
      shot: "bleed",
      caption: "Gates are blue. This one is the red of a held breath.",
    },
    options: [
      {
        id: "red_map",
        label: "Map the perimeter before it finds you",
        detail: "Information first",
        requires: {},
        risk: "moderate",
      },
      {
        id: "red_call",
        label: "Shout for other survivors",
        detail: "Whatever answers, answers",
        requires: {},
        risk: "deadly",
      },
      {
        id: "red_dig",
        label: "Dig at the sealed entrance",
        detail: "Refuse the premise",
        requires: { strength: 12 },
        risk: "moderate",
      },
    ],
    requiredStats: {},
    weight: 9,
  },
];

export async function seedStaticNodes(): Promise<number> {
  for (const node of nodes) {
    await upsertStaticNode(node);
  }
  return nodes.length;
}
