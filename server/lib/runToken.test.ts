/**
 * The token is what lets an owner get his brief after a restart, and it is also
 * the only thing standing between a stranger and a Gesher-branded email sent to
 * an address of his choosing. So the tests that matter here are the refusals.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeRunToken, readRunToken } from "./runToken";
import type { SnapshotRun } from "./snapshotEmail";

const RUN: SnapshotRun = {
  companyName: "Optima",
  companyOneliner: "Vertical SaaS for Israeli clinics.",
  rangeVariant: "number",
  rangeText: "₪11.6M to ₪12.2M",
  buyerTypes: "a larger Israeli software firm",
  pathUsed: "A1",
  resultMd: "## Value\n**Installed base.** Over 3,000 clinics use it.",
  lang: "en",
};

beforeAll(() => {
  process.env.BRIEF_TOKEN_SECRET = "a-long-enough-test-secret-value";
});

describe("a token we made", () => {
  it("comes back as the same run", () => {
    const back = readRunToken(makeRunToken(RUN, "abc123"), "abc123");
    expect(back).not.toBeNull();
    expect(back?.rangeText).toBe("₪11.6M to ₪12.2M");
    expect(back?.companyName).toBe("Optima");
    expect(back?.pathUsed).toBe("A1");
    expect(back?.resultMd).toContain("Installed base.");
  });

  it("carries no id or timestamp into the run", () => {
    const back = readRunToken(makeRunToken(RUN, "abc123"), "abc123") as Record<string, unknown>;
    expect(back.briefId).toBeUndefined();
    expect(back.iat).toBeUndefined();
  });
});

describe("what it refuses", () => {
  const good = makeRunToken(RUN, "abc123");

  it("a token for a different brief", () => {
    expect(readRunToken(good, "someotherid")).toBeNull();
  });

  it("a tampered payload", () => {
    const [body, sig] = good.split(".");
    const evil = Buffer.from(
      JSON.stringify({ ...RUN, rangeText: "₪999M to ₪1B", briefId: "abc123", iat: Date.now() }),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(readRunToken(`${evil}.${sig}`, "abc123")).toBeNull();
    expect(body).not.toBe(evil);
  });

  it("a forged signature", () => {
    const [body] = good.split(".");
    expect(readRunToken(`${body}.notarealsignature`, "abc123")).toBeNull();
  });

  it("an empty or missing token", () => {
    expect(readRunToken("", "abc123")).toBeNull();
    expect(readRunToken(undefined, "abc123")).toBeNull();
    expect(readRunToken(null, "abc123")).toBeNull();
  });

  it("something that is not a token at all", () => {
    expect(readRunToken("hello", "abc123")).toBeNull();
    expect(readRunToken({ not: "a string" }, "abc123")).toBeNull();
    expect(readRunToken("a.b", "abc123")).toBeNull();
  });

  it("an absurdly long token", () => {
    expect(readRunToken("x".repeat(300_000), "abc123")).toBeNull();
  });

  it("a token signed with a different secret", () => {
    const other = (() => {
      process.env.BRIEF_TOKEN_SECRET = "a-completely-different-secret!!";
      const t = makeRunToken(RUN, "abc123");
      process.env.BRIEF_TOKEN_SECRET = "a-long-enough-test-secret-value";
      return t;
    })();
    expect(readRunToken(other, "abc123")).toBeNull();
  });
});
