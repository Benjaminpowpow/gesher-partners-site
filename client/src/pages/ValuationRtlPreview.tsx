/**
 * Dev only: the valuation estimate right to left, with placeholder words.
 *
 * Not built into the live site (App.tsx registers /dev/valuation-rtl only
 * when import.meta.env.DEV). It exists to prove the page is Hebrew-ready
 * before Joanne's Hebrew lands: the layout flips, the dropdown arrow moves to
 * the left, the slider runs 1 on the right, and ₪ figures read the right way.
 *
 * The words are placeholders, not copy. Every line is swapped for filler
 * Hebrew letters of about the same length, keeping whatever the page fills in
 * (his company name, a number). The band labels and the range figure use the
 * shape the Hebrew tool already prints (low, "עד", high, "מיליון ש״ח"). None of this is
 * ever shown to an owner. The real Hebrew is COPY_V_HE, from the vault.
 */
import { COPY_V, type VCopy } from "./valuationCopy";
import Valuation from "./Valuation";

const FILLER = ["טקסט", "לדוגמה", "בעברית", "שורה", "כאן"];

function filler(english: string): string {
  const words = english.trim().split(/\s+/).filter(Boolean).length || 1;
  const out = Array.from({ length: words }, (_, i) => FILLER[i % FILLER.length]).join(" ");
  const end = english.trim().match(/[.?:]$/)?.[0] ?? "";
  return out + end;
}

const MARK = "\u0001";

function fake(value: unknown, path: string): unknown {
  if (typeof value === "string") return filler(value);
  if (typeof value === "function") {
    return (...args: unknown[]) => {
      const shaped = String((value as (...a: unknown[]) => unknown)(...args.map(() => MARK)));
      // Keep what the page fills in (a company name, a number) where it sat.
      const parts = shaped.split(MARK);
      return parts
        .map((p, i) => (p.trim() ? filler(p) : "") + (i < parts.length - 1 ? ` ${String(args[i])} ` : ""))
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    };
  }
  if (Array.isArray(value)) return value.map((v, i) => fake(v, `${path}.${i}`));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fake(v, `${path}.${k}`)]));
  }
  return value;
}

const he = (lo: string, hi: string) => `${lo} עד ${hi} מיליון ש״ח`;

export const RTL_PLACEHOLDER_COPY: VCopy = {
  ...(fake(COPY_V, "") as VCopy),
  nav: { ...(fake(COPY_V.nav, "nav") as VCopy["nav"]), langEn: "EN", langHe: "עב" },
  revenue: {
    "under-5": "עד 5 מיליון ש״ח",
    "5-10": he("5", "10"),
    "10-25": he("10", "25"),
    "25-50": he("25", "50"),
    "over-50": "מעל 50 מיליון ש״ח",
  },
  profit: {
    "under-1": "עד 1 מיליון ש״ח",
    "1-2.5": he("1", "2.5"),
    "2.5-5": he("2.5", "5"),
    "5-10": he("5", "10"),
    "over-10": "מעל 10 מיליון ש״ח",
  },
  staff: { "2-10": "2 עד 10", "11-50": "11 עד 50", "51-100": "51 עד 100", "over-100": "מעל 100" },
  front: { ...(fake(COPY_V.front, "front") as VCopy["front"]), seriousEmpty: "–", urlPlaceholder: "yourcompany.co.il" },
  result: { ...(fake(COPY_V.result, "result") as VCopy["result"]), rangeFigure: he },
};

export default function ValuationRtlPreview() {
  return <Valuation lang="he" copy={RTL_PLACEHOLDER_COPY} />;
}
