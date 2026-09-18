/**
 * Location ids are engine keys. The player never sees `d_rank_gate`.
 */
const LABELS: Record<string, string> = {
  awakening: "Assessment room",
  d_rank_gate: "D-rank gate",
  instant_dungeon: "Instant dungeon",
  hospital: "Hospital",
  penalty_zone: "Penalty Zone",
  surface: "Surface",
  red_gate: "Red gate",
  shop: "Shop window",
  job_change: "Job Change",
  // A node that can appear anywhere has no location of its own to show.
  any: "",
};

export function locationLabel(id: string | undefined): string {
  if (!id) return "";
  const known = LABELS[id];
  if (known !== undefined) return known;
  // Unknown ids still have to read like words rather than a debug build.
  const words = id.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
