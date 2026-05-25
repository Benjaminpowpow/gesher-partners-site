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
 * Read the bundle. Tries a few locations so the same code works in dev (tsx runs
 * from server/lib) and in prod (esbuild bundles into dist/). The source tree is
 * deployed alongside dist on Manus, so the cwd-relative fallbacks are safe.
 */
function loadSystemPrompt(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, BUNDLE_FILENAME), // dev: server/lib/. prod: dist/ (copied at build).
    join(process.cwd(), "server", "lib", BUNDLE_FILENAME), // prod fallback: source tree present.
    join(process.cwd(), "dist", BUNDLE_FILENAME),
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
    `[exitBriefSkill] Could not read ${BUNDLE_FILENAME}. Looked in: ${candidates.join(", ")}`,
  );
}

export const EXIT_BRIEF_SYSTEM_PROMPT = loadSystemPrompt();
