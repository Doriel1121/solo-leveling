import type {
  ChoiceRequirement,
  HunterRank,
  PanelKind,
  PanelVisual,
} from "@system/shared";
import { rankIndex } from "@system/shared";
import { pool } from "../pool.js";
import type { GeneratedChoice, StaticNodeRecord } from "../../engine/types.js";

interface StaticNodeRow {
  id: string;
  kind: PanelKind;
  location: string;
  min_level: number;
  max_level: number | null;
  rank_gate: HunterRank | null;
  system_lines: string[];
  content: string;
  visual: Partial<PanelVisual> | null;
  options: GeneratedChoice[];
  required_stats: ChoiceRequirement;
  weight: number;
}

/** Nodes seeded before the visual column existed still have to render. */
const VISUAL_FALLBACK: PanelVisual = {
  artKey: "dungeon.pillar",
  mood: "night",
  shot: "standard",
  caption: "The dark rearranges itself around you.",
};

function toRecord(row: StaticNodeRow): StaticNodeRecord {
  return {
    id: row.id,
    kind: row.kind,
    location: row.location,
    minLevel: row.min_level,
    maxLevel: row.max_level,
    rankGate: row.rank_gate,
    systemLines: row.system_lines ?? [],
    content: row.content,
    visual: { ...VISUAL_FALLBACK, ...(row.visual ?? {}) },
    options: row.options ?? [],
    requiredStats: row.required_stats ?? {},
    weight: row.weight,
  };
}

/**
 * Candidate static nodes the player is eligible for and has not already seen in
 * this run. Excluding seen ids in SQL avoids fetching the whole table.
 */
export async function findEligibleNodes(params: {
  location: string;
  level: number;
  rank: HunterRank;
  excludeIds: string[];
  limit?: number;
}): Promise<StaticNodeRecord[]> {
  const { rows } = await pool.query<StaticNodeRow>(
    `SELECT id, kind, location, min_level, max_level, rank_gate,
            system_lines, content, visual, options, required_stats, weight
       FROM static_nodes
      WHERE (location = $1 OR location = 'any')
        AND min_level <= $2
        AND (max_level IS NULL OR max_level >= $2)
        AND NOT (id = ANY($3::text[]))
      ORDER BY weight DESC, random()
      LIMIT $4`,
    [params.location, params.level, params.excludeIds, params.limit ?? 10],
  );

  // Rank gate is compared by ordinal, which SQL cannot express against a text column.
  return rows
    .map(toRecord)
    .filter(
      (node) =>
        !node.rankGate || rankIndex(params.rank) >= rankIndex(node.rankGate),
    );
}

export async function upsertStaticNode(node: StaticNodeRecord): Promise<void> {
  await pool.query(
    `INSERT INTO static_nodes
       (id, kind, location, min_level, max_level, rank_gate,
        system_lines, content, visual, options, required_stats, weight)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12)
     ON CONFLICT (id) DO UPDATE SET
       kind = EXCLUDED.kind,
       location = EXCLUDED.location,
       min_level = EXCLUDED.min_level,
       max_level = EXCLUDED.max_level,
       rank_gate = EXCLUDED.rank_gate,
       system_lines = EXCLUDED.system_lines,
       content = EXCLUDED.content,
       visual = EXCLUDED.visual,
       options = EXCLUDED.options,
       required_stats = EXCLUDED.required_stats,
       weight = EXCLUDED.weight`,
    [
      node.id,
      node.kind,
      node.location,
      node.minLevel,
      node.maxLevel,
      node.rankGate,
      JSON.stringify(node.systemLines),
      node.content,
      JSON.stringify(node.visual),
      JSON.stringify(node.options),
      JSON.stringify(node.requiredStats),
      node.weight,
    ],
  );
}

export async function countStaticNodes(): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    "SELECT count(*) AS count FROM static_nodes",
  );
  return Number(rows[0]?.count ?? 0);
}
