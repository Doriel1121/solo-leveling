/**
 * Migrations are inlined as strings rather than .sql assets so that `tsc` output
 * is self-contained and no asset-copy step is needed in the Render build.
 */
export interface Migration {
  id: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: "001_init",
    sql: /* sql */ `
      CREATE TABLE IF NOT EXISTS users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username      text UNIQUE NOT NULL,
        total_runs    integer NOT NULL DEFAULT 0,
        highest_rank  text NOT NULL DEFAULT 'E',
        created_at    timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS runs (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_time        timestamptz NOT NULL DEFAULT now(),
        end_time          timestamptz,
        death_reason      text,
        run_type          text NOT NULL DEFAULT 'canon',
        outcome           text NOT NULL DEFAULT 'active',
        steps             integer NOT NULL DEFAULT 0,
        final_level       integer,
        final_rank        text,
        canon_divergence  numeric(5,2) NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS runs_user_id_idx ON runs (user_id);
      CREATE INDEX IF NOT EXISTS runs_outcome_idx ON runs (outcome);

      -- Pre-authored scenarios. Serving these instead of the model is what keeps
      -- per-run API cost bounded; 'options' holds the 3-4 choice objects.
      CREATE TABLE IF NOT EXISTS static_nodes (
        id              text PRIMARY KEY,
        kind            text NOT NULL DEFAULT 'narration',
        location        text NOT NULL,
        min_level       integer NOT NULL DEFAULT 1,
        max_level       integer,
        rank_gate       text,
        system_lines    jsonb NOT NULL DEFAULT '[]'::jsonb,
        content         text NOT NULL,
        options         jsonb NOT NULL DEFAULT '[]'::jsonb,
        required_stats  jsonb NOT NULL DEFAULT '{}'::jsonb,
        weight          integer NOT NULL DEFAULT 1,
        created_at      timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS static_nodes_lookup_idx
        ON static_nodes (location, min_level);
    `,
  },
  {
    id: "002_panel_visuals",
    sql: /* sql */ `
      -- Authored art plate, colour grade, frame size, and caption for a scene.
      -- One jsonb column rather than four scalars: it maps 1:1 to the
      -- PanelVisual the client consumes, so there is nothing to reassemble.
      ALTER TABLE static_nodes
        ADD COLUMN IF NOT EXISTS visual jsonb NOT NULL DEFAULT '{}'::jsonb;
    `,
  },
];
