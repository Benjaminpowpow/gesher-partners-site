/**
 * The valuation estimate's three routes, end to end against a fake engine.
 *
 * What matters most here is the lock: while the range is locked it must not
 * be anywhere the browser can see, so every test that runs a priced estimate
 * reads the whole response and searches it for the range. Then the paths a
 * lead takes: details in, range out, "Talk to us", the two no-number cases,
 * the cache, and the server's refusals in site/35's words.
 *
 * Roltag on manufacturing (4.2x to 5.0x) at ₪1M to 2.5M of profit prices at
 * ₪6M to ₪11M: LOW 1.375 x 4.2 = 5.775 -> 6, HIGH 2.125 x 5.0 = 10.625 -> 11.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// ─── Fakes ───────────────────────────────────────────────────────────────────
const calls: string[] = [];
let engineText = "";
let engineFails = false;
const create = vi.fn(async () => {
  calls.push("engine");
  if (engineFails) throw new Error("overloaded");
  const text = engineText;
  return (async function* () {
    yield { type: "message_start", message: { usage: { input_tokens: 1000, cache_read_input_tokens: 0 } } };
    yield { type: "content_block_start", content_block: { type: "server_tool_use" } };
    const third = Math.ceil(text.length / 3);
    for (let i = 0; i < text.length; i += third) {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: text.slice(i, i + third) } };
    }
    yield { type: "message_delta", usage: { output_tokens: 300, server_tool_use: { web_search_requests: 1 } } };
  })();
});
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const sheet = { append: [] as Record<string, unknown>[], update: [] as Record<string, unknown>[] };
vi.mock("../lib/leadsSheet", () => ({
  appendValuationRow: vi.fn(async (row: Record<string, unknown>) => {
    calls.push("sheet-append");
    sheet.append.push(row);
    return true;
  }),
  updateValuationRow: vi.fn(async (briefId: string, fields: Record<string, unknown>) => {
    sheet.update.push({ briefId, ...fields });
    return true;
  }),
}));

let siteResult: { read?: unknown; why?: string; noSuchHost: boolean } = { noSuchHost: false };
vi.mock("../lib/readSite", () => ({
  readSite: vi.fn(async () => siteResult),
  siteReadBlock: () => "SITE TEXT: a label printer",
  noSiteBlock: () => "SITE TEXT: none",
}));

const sent: { to: string; subject: string; html: string; text?: string }[] = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: vi.fn(async (m: { to: string; subject: string; html: string; text?: string }) => {
        sent.push(m);
        return { id: "x" };
      }),
    };
  },
}));

import { registerEstimateRoutes, clearEstimateStateForTests } from "./valuationEstimate";
import { resetGatesForTests } from "../lib/runGates";
import { COPY_V } from "../../client/src/pages/valuationCopy";

// ─── The engine's answer ─────────────────────────────────────────────────────
function brief(vertical: string, company = "Roltag"): string {
  return [
    "```json",
    JSON.stringify({
      company_name: company,
      company_oneliner: "Label and packaging printer.",
      vertical_matched: vertical,
      buyer_types: "a printing group, a packaging maker, or a fund",
      readable: true,
    }),
    "```",
    "",
    "## Market",
    `${company}: label printer since 1969, serving pharma and food.`,
    "",
    "## Value",
    "positive: **Sticky customers.** Pharma clients reorder for years.",
    "positive: **Specialty work.** Multi-layer labels set it apart.",
    "watch: **Few buyers.** The price comes from a real process.",
  ].join("\n");
}

const READ = {
  read: { text: "x".repeat(3000), finalUrl: "https://roltag.co.il/", thin: false, logoUrl: "https://roltag.co.il/logo.png" },
  noSuchHost: false,
};

// ─── The server ──────────────────────────────────────────────────────────────
let server: Server;
let base = "";
let ipNo = 0;
const nextIp = () => `10.0.0.${++ipNo}`;

beforeAll(async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.RESEND_API_KEY = "test-resend";
  process.env.BRIEF_TOKEN_SECRET = "a-long-enough-test-secret-value";
  process.env.EXIT_BRIEF_DAILY_CAP = "100";
  process.env.EXIT_BRIEF_PER_IP_DAILY = "100";
  const app = express();
  app.use(express.json());
  registerEstimateRoutes(app);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server?.close());

beforeEach(() => {
  resetGatesForTests();
  clearEstimateStateForTests();
  calls.length = 0;
  sheet.append.length = 0;
  sheet.update.length = 0;
  sent.length = 0;
  create.mockClear();
  engineFails = false;
  engineText = brief("manufacturing");
  siteResult = READ;
});

const ANSWERS = {
  url: "roltag.co.il",
  lang: "en",
  timeline: "within-1y",
  serious: 8,
  revenue: "10-25",
  profit: "1-2.5",
  staff: "11-50",
  note: "Second generation, thinking about it.",
};

async function estimate(body: object = ANSWERS, ip = nextIp()) {
  const res = await fetch(`${base}/api/valuation/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  const lines = res.headers.get("content-type")?.includes("ndjson")
    ? raw.split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
    : [];
  const done = lines.find((l) => l.type === "done") as Record<string, string> | undefined;
  return { status: res.status, raw, lines, done, json: lines.length ? null : (JSON.parse(raw || "{}") as Record<string, string>) };
}

async function post(path: string, body: object) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  return { status: res.status, raw, data: JSON.parse(raw || "{}") as Record<string, unknown> };
}

/** Every way the range could leak: the figure, each end, and the bare numbers. */
function leaks(text: string): string[] {
  const needles = ["₪6M to ₪11M", "₪6M", "₪11M", "6M to", "11M", "\"6\"", "\"11\""];
  // The sealed token is base64; decode each part too, so a readable token fails.
  const decoded = text
    .split(/[^A-Za-z0-9_-]+/)
    .filter((s) => s.length > 40)
    .map((s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"))
    .join("\n");
  return needles.filter((n) => text.includes(n) || decoded.includes(n));
}

const tick = () => new Promise((r) => setTimeout(r, 20));

// ─── The lock ────────────────────────────────────────────────────────────────
describe("the lock", () => {
  it("a priced run sends no range anywhere in the response, token included", async () => {
    const r = await estimate();
    expect(r.status).toBe(200);
    expect(r.done?.variant).toBe("locked");
    expect(r.done?.result_md).toContain("## Market");
    expect(r.done?.result_md).not.toMatch(/## Range/);
    expect(r.done?.run_token).toBeTruthy();
    expect(leaks(r.raw)).toEqual([]);
  });

  it("the range comes only from /unlock, and only with good details", async () => {
    const r = await estimate();
    const token = { briefId: r.done!.briefId, runToken: r.done!.run_token };

    const bad = await post("/api/valuation/unlock", { ...token, name: "Dana", phone: "", email: "" });
    expect(bad.status).toBe(400);
    expect(bad.data.problem).toBe("reach");
    expect(leaks(bad.raw)).toEqual([]);

    const forged = await post("/api/valuation/unlock", { briefId: "nope", runToken: "a.b.c", name: "Dana", phone: "050" });
    expect(forged.status).toBe(404);
    expect(leaks(forged.raw)).toEqual([]);

    const ok = await post("/api/valuation/unlock", { ...token, name: "Dana Levi", phone: "050-1234567", email: "" });
    expect(ok.status).toBe(200);
    expect(ok.data.range).toBe("₪6M to ₪11M");
  });

  it("the sealed token alone opens the run after a restart", async () => {
    const r = await estimate();
    clearEstimateStateForTests(); // the deploy empties memory
    const ok = await post("/api/valuation/unlock", {
      briefId: r.done!.briefId,
      runToken: r.done!.run_token,
      name: "Dana",
      email: "dana@carmel.co.il",
    });
    expect(ok.data.range).toBe("₪6M to ₪11M");
  });
});

// ─── The lead ────────────────────────────────────────────────────────────────
describe("the lead in the Sheet", () => {
  it("is saved, all answers, before the engine runs", async () => {
    await estimate();
    expect(calls.indexOf("sheet-append")).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf("sheet-append")).toBeLessThan(calls.indexOf("engine"));
    expect(sheet.append[0]).toMatchObject({
      site: "roltag.co.il",
      timeline: "Within a year",
      seriousness: "8",
      revenueBand: "₪10M to 25M",
      profitBand: "₪1M to 2.5M",
      employees: "11 to 50",
      note: "Second generation, thinking about it.",
      gaveDetails: "no",
      askedToSpeak: "no",
      revenueCheck: "",
      path: "running",
      lang: "en",
    });
  });

  it("then gets the run's results, with the range Ben needs", async () => {
    const r = await estimate();
    await tick();
    expect(sheet.update).toContainEqual(
      expect.objectContaining({
        briefId: r.done!.briefId,
        company: "Roltag",
        range: "₪6M to ₪11M",
        vertical: "manufacturing",
        path: "estimate",
        multiple: "4.2 to 5",
      }),
    );
  });

  it("phone only: details saved, no email to him, a note to office@", async () => {
    const r = await estimate();
    await post("/api/valuation/unlock", { briefId: r.done!.briefId, runToken: r.done!.run_token, name: "Dana", phone: "050-1234567" });
    await tick();
    expect(sheet.update).toContainEqual(
      expect.objectContaining({ contactName: "Dana", contactPhone: "050-1234567", contactEmail: "", gaveDetails: "yes" }),
    );
    expect(sent.map((m) => m.to)).toEqual([expect.stringContaining("@gesherpartners.com")]);
    expect(sent[0].subject).toBe("New valuation lead: Dana (roltag.co.il)");
  });

  it("email only: his email goes out with the new words, once", async () => {
    const r = await estimate();
    const body = { briefId: r.done!.briefId, runToken: r.done!.run_token, name: "Dana Levi", email: "dana@carmel.co.il" };
    await post("/api/valuation/unlock", body);
    await post("/api/valuation/unlock", body);
    await tick();
    const his = sent.filter((m) => m.to === "dana@carmel.co.il");
    expect(his).toHaveLength(1);
    expect(his[0].subject).toBe("Roltag: your estimated value range");
    expect(his[0].text).toContain("Hello Dana, here is the estimate you just ran.");
    expect(his[0].text).toContain("YOUR ESTIMATED VALUE RANGE");
    expect(his[0].text).toContain("₪6M to ₪11M");
    expect(his[0].text).toContain(COPY_V.email.disclaimer);
    expect(his[0].text).toContain(COPY_V.email.closeBody);
    expect(his[0].text).toContain(COPY_V.email.fine);
    expect(his[0].text).not.toMatch(/Snapshot|cookie cutter|Who would buy|warning/i);
  });

  it("both: saved, emailed", async () => {
    const r = await estimate();
    await post("/api/valuation/unlock", {
      briefId: r.done!.briefId,
      runToken: r.done!.run_token,
      name: "Dana",
      phone: "050-1234567",
      email: "dana@carmel.co.il",
    });
    await tick();
    expect(sheet.update).toContainEqual(
      expect.objectContaining({ contactPhone: "050-1234567", contactEmail: "dana@carmel.co.il", gaveDetails: "yes" }),
    );
    expect(sent.some((m) => m.to === "dana@carmel.co.il")).toBe(true);
  });

  it("Talk to us after the range marks the hot lead", async () => {
    const r = await estimate();
    const token = { briefId: r.done!.briefId, runToken: r.done!.run_token };
    await post("/api/valuation/unlock", { ...token, name: "Dana", phone: "050" });
    const t = await post("/api/valuation/talk", { ...token, name: "Dana", phone: "050" });
    expect(t.status).toBe(200);
    await tick();
    expect(sheet.update).toContainEqual(expect.objectContaining({ briefId: token.briefId, askedToSpeak: "yes" }));
    expect(sent.some((m) => m.subject.startsWith("Hot lead, asked to speak: Dana"))).toBe(true);
  });

  it("flags the impossible pair and still prices it", async () => {
    const r = await estimate({ ...ANSWERS, revenue: "under-5", profit: "5-10" });
    expect(sheet.append[0].revenueCheck).toBe("flag");
    expect(r.done?.variant).toBe("locked");
  });
});

// ─── No number, no lock ──────────────────────────────────────────────────────
describe("the two no-number cases", () => {
  it("the engine cannot tell what the business does: by hand, nothing locked", async () => {
    engineText = brief("wild-card", "Holding Co");
    const r = await estimate();
    expect(r.done?.variant).toBe("by_hand");
    expect(r.done?.result_md).toContain("## Value");
  });

  it("over ₪10M of profit: no number", async () => {
    const r = await estimate({ ...ANSWERS, profit: "over-10" });
    expect(r.done?.variant).toBe("big");
    await tick();
    expect(sheet.update).toContainEqual(expect.objectContaining({ range: "", path: "big (over ₪10M profit)" }));
  });

  it("an industry with no profit multiple (dental) is priced by hand", async () => {
    engineText = brief("healthcare-services", "Smile Clinic");
    const r = await estimate();
    expect(r.done?.variant).toBe("by_hand");
  });

  it("every other industry gets a number: by hand only when the engine cannot tell", async () => {
    for (const v of ["services", "retail", "backup-maker", "vertical-saas-vms"]) {
      clearEstimateStateForTests();
      engineText = brief(v);
      const r = await estimate();
      expect([v, r.done?.variant]).toEqual([v, "locked"]);
    }
  });

  it("there is nothing to unlock", async () => {
    engineText = brief("wild-card");
    const r = await estimate();
    const u = await post("/api/valuation/unlock", { briefId: r.done!.briefId, runToken: r.done!.run_token, name: "D", phone: "1" });
    expect(u.status).toBe(409);
  });

  it("the inline form: the same contact rules, then details and the ask in one", async () => {
    engineText = brief("wild-card");
    const r = await estimate();
    const token = { briefId: r.done!.briefId, runToken: r.done!.run_token };
    expect((await post("/api/valuation/talk", { ...token })).data.problem).toBe("all");
    expect((await post("/api/valuation/talk", { ...token, phone: "050" })).data.problem).toBe("name");
    expect((await post("/api/valuation/talk", { ...token, name: "Dana" })).data.problem).toBe("reach");
    expect((await post("/api/valuation/talk", { ...token, name: "Dana", email: "dana@x" })).data.problem).toBe("emailBad");
    const ok = await post("/api/valuation/talk", { ...token, name: "Dana", email: "dana@carmel.co.il" });
    expect(ok.status).toBe(200);
    await tick();
    expect(sheet.update).toContainEqual(
      expect.objectContaining({ contactEmail: "dana@carmel.co.il", gaveDetails: "yes", askedToSpeak: "yes" }),
    );
    const his = sent.find((m) => m.to === "dana@carmel.co.il");
    expect(his?.subject).toBe("Roltag: your value estimate");
    expect(his?.text).toContain(COPY_V.email.byHandLine);
  });
});

// ─── Same site, same answers ─────────────────────────────────────────────────
describe("the cache", () => {
  it("same site and answers twice: one engine call, the same range", async () => {
    const a = await estimate();
    const b = await estimate();
    expect(create).toHaveBeenCalledTimes(1);
    const ra = await post("/api/valuation/unlock", { briefId: a.done!.briefId, runToken: a.done!.run_token, name: "D", phone: "1" });
    const rb = await post("/api/valuation/unlock", { briefId: b.done!.briefId, runToken: b.done!.run_token, name: "D", phone: "1" });
    expect(ra.data.range).toBe("₪6M to ₪11M");
    expect(rb.data.range).toBe(ra.data.range);
    expect(leaks(b.raw)).toEqual([]);
  });

  it("same site, a new profit band: the saved brief, a new range, free", async () => {
    await estimate();
    const b = await estimate({ ...ANSWERS, profit: "2.5-5" });
    expect(create).toHaveBeenCalledTimes(1);
    const rb = await post("/api/valuation/unlock", { briefId: b.done!.briefId, runToken: b.done!.run_token, name: "D", phone: "1" });
    expect(rb.data.range).toBe("₪13M to ₪22M");
  });
});

// ─── Refusals ────────────────────────────────────────────────────────────────
describe("the server's refusals, in site/35's words", () => {
  it("a missing required answer is refused before anything runs", async () => {
    for (const drop of ["url", "timeline", "serious", "revenue", "profit"]) {
      const body: Record<string, unknown> = { ...ANSWERS };
      delete body[drop];
      expect((await estimate(body)).status).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("the minute cooldown", async () => {
    const ip = nextIp();
    await estimate(ANSWERS, ip);
    const again = await estimate({ ...ANSWERS, url: "another-site.co.il" }, ip);
    expect(again.status).toBe(429);
    expect(again.json?.error).toBe(COPY_V.server.cooldown);
  });

  it("over the daily cap, and his answers still reach the Sheet", async () => {
    process.env.EXIT_BRIEF_DAILY_CAP = "1";
    try {
      await estimate();
      const over = await estimate({ ...ANSWERS, url: "carmelprint.co.il" });
      expect(over.status).toBe(429);
      expect(over.json?.error).toBe(COPY_V.server.overCap);
      expect(sheet.append.at(-1)).toMatchObject({ site: "carmelprint.co.il", path: "refused: over the daily cap" });
    } finally {
      process.env.EXIT_BRIEF_DAILY_CAP = "100";
    }
  });

  it("not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const r = await estimate();
      expect(r.status).toBe(500);
      expect(r.json?.error).toBe(COPY_V.server.notConfigured);
    } finally {
      process.env.ANTHROPIC_API_KEY = "test-key";
    }
  });

  it("a busy engine sends the busy sentence as the last line", async () => {
    engineFails = true;
    const r = await estimate();
    expect(r.lines.at(-1)).toEqual({ type: "error", error: COPY_V.server.busy });
    expect(r.done).toBeUndefined();
  });

  it("a site that does not exist: no engine call, the could-not-read screen", async () => {
    siteResult = { noSuchHost: true, why: "ENOTFOUND" };
    const r = await estimate({ ...ANSWERS, url: "no-such-site-gesher-test.co.il" });
    expect(r.done?.variant).toBe("unreadable");
    expect(create).not.toHaveBeenCalled();
  });
});
