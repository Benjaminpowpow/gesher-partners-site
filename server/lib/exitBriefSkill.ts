/**
 * VALUATION SNAPSHOT SYSTEM PROMPT (v7)
 *
 * The prompt is the generated bundle in `valuation-snapshot-bundle.md`, read once
 * at boot. We keep it as a plain .md (not an inlined TS string) on purpose: the
 * bundle contains markdown code fences and a literal "$", which fight with a
 * template literal. A file read sidesteps all escaping.
 *
 * Do NOT hand-edit the .md. It is generated in the vault (the Valuation Snapshot
 * bundle) and replaced via the update-and-sync SOP: paste the new block between the
 * markers into `valuation-snapshot-bundle.md`, commit, push, let Manus sync.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BUNDLE_FILENAME = "valuation-snapshot-bundle.md";

/**
 * The Hebrew instruction block. Appended after the bundle, and only when the
 * run is Hebrew. Its own file on purpose: the bundle is generated in the vault
 * and gets replaced wholesale, so nothing about language may live inside it.
 */
const HEBREW_FILENAME = "valuation-hebrew-addendum.md";

/**
 * Read one prompt file. Tries a few locations so the same code works in dev
 * (tsx runs from server/lib) and in prod (esbuild bundles into dist/, and the
 * build copies these .md files next to it).
 */
function loadPromptFile(filename: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, filename), // dev: server/lib/. prod: dist/ (copied at build).
    join(process.cwd(), "server", "lib", filename), // prod fallback: source tree present.
    join(process.cwd(), "dist", filename),
  ];
  for (const path of candidates) {
    try {
      const text = readFileSync(path, "utf8").trim();
      if (text) return text;
    } catch {
      // not here, try the next candidate
    }
  }
  throw new Error(
    `[exitBriefSkill] Could not read ${filename}. Looked in: ${candidates.join(", ")}`,
  );
}

export const EXIT_BRIEF_SYSTEM_PROMPT = loadPromptFile(BUNDLE_FILENAME);

/**
 * A missing addendum must never take the English site down, because English is
 * the only door that is live. It fails loud in the log and quiet on the page: a
 * Hebrew run then reads as an ordinary run, in English.
 */
export const HEBREW_ADDENDUM: string = (() => {
  try {
    return loadPromptFile(HEBREW_FILENAME);
  } catch (err) {
    console.error("[exitBriefSkill]", err);
    return "";
  }
})();
