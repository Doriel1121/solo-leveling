/**
 * Reproduces the mute-panel cases (no caption on the still, no body under it)
 * and asserts ensurePanelCopy always invents at least one line.
 */
import { filledCaption, isBlank, truncateCaption } from "@system/shared";
import { ensurePanelCopy } from "../src/engine/visuals.js";

const cases = [
  { name: "both empty", caption: "", text: "" },
  { name: "whitespace caption + empty body", caption: "   \n", text: "  " },
  { name: "CAPTION label only", caption: "CAPTION:", text: "BODY:" },
  { name: "caption only (late-game look)", caption: "The dark rearranges itself around you.", text: "" },
  { name: "body only", caption: "", text: "You take the next step." },
  { name: "death mute", caption: "", text: "", kind: "death" as const, success: false },
] as const;

let failed = 0;
for (const item of cases) {
  const kind = "kind" in item ? item.kind : "combat";
  const success = "success" in item ? item.success : true;
  const copy = ensurePanelCopy({
    caption: item.caption,
    text: item.text,
    kind,
    success,
  });
  const mute = isBlank(copy.caption) && isBlank(copy.text);
  const okCaption = !isBlank(copy.caption);
  const invented = isBlank(truncateCaption(item.caption));
  const pass = !mute && okCaption && (!invented || !isBlank(copy.text));
  if (!pass) failed += 1;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${item.name}\n    caption="${copy.caption}"\n    body="${copy.text}"`,
  );
}

const blankWipe = filledCaption("   ", "The dark rearranges itself around you.");
if (isBlank(blankWipe)) {
  failed += 1;
  console.log("FAIL  filledCaption should ignore whitespace");
} else {
  console.log(`PASS  filledCaption whitespace → "${blankWipe}"`);
}

if (failed) {
  console.error(`\n${failed} mute-copy case(s) failed`);
  process.exit(1);
}
console.log("\nall mute-copy cases produce a caption");
