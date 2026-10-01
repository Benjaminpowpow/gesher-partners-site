/**
 * A snapshot run the owner can carry back to us after a restart.
 *
 * The problem this solves. The finished run lives in a Map in memory. Render
 * restarts on every deploy, and the Map goes with it. An owner who reads his
 * range, thinks for two minutes and then asks for the email gets "we could not
 * send it", and the retry button can never work, because the id he is holding
 * refers to something that no longer exists anywhere. Ben hit this within a
 * minute of a merge; a real owner would simply leave.
 *
 * There is no database on this service, so there is nowhere on our side to put
 * it. So the owner holds it. The page already has the whole run: it rendered it.
 * It sends it back with the request, and the server rebuilds from that.
 *
 * Which raises the obvious problem: anything the client sends, the client can
 * forge, and this one ends with us sending a Gesher-branded email to any
 * address. So the payload is signed here, before it ever leaves, and a payload
 * without our signature is refused. The client can hold it and return it. It
 * cannot write one.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { SnapshotRun } from "./snapshotEmail";

// Long enough that a man can think it over, short enough that a leaked token is
// not useful for long.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// A token is only worth what its secret is worth. Set BRIEF_TOKEN_SECRET in
// Render to a long random string. Without it we fall back to a per-process
// random, which still signs correctly but dies with the process, so briefs go
// back to not surviving a restart. That is today's behaviour, not worse, and
// the warning says so once at boot.
let warned = false;
function secret(): string {
  const fromEnv = process.env.BRIEF_TOKEN_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (!warned) {
    warned = true;
    console.warn(
      "[run-token] BRIEF_TOKEN_SECRET is not set. Briefs will not survive a restart.",
    );
  }
  return processSecret;
}
const processSecret = randomBytes(32).toString("hex");

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", secret()).update(body).digest());
}

/** Wrap a finished run so the page can hand it back to us later. */
export function makeRunToken(run: SnapshotRun, briefId: string): string {
  const body = b64url(Buffer.from(JSON.stringify({ ...run, briefId, iat: Date.now() }), "utf8"));
  return `${body}.${sign(body)}`;
}

/**
 * Unwrap one, or null.
 *
 * Null covers every failure the same way on purpose: a bad signature, an
 * expired token, a mismatched id and plain garbage are all just "we cannot use
 * this", and the caller has one path for all of them.
 */
export function readRunToken(token: unknown, briefId: string): SnapshotRun | null {
  if (typeof token !== "string" || token.length > 200_000) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);

  const expected = sign(body);
  // Compare in constant time, and only once both sides are the same length, so
  // the comparison itself cannot be used to learn the signature.
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as SnapshotRun & {
      briefId?: string;
      iat?: number;
    };
    if (parsed.briefId !== briefId) return null;
    if (typeof parsed.iat !== "number" || Date.now() - parsed.iat > MAX_AGE_MS) return null;
    const { briefId: _id, iat: _iat, ...run } = parsed;
    return run;
  } catch {
    return null;
  }
}

// ─── Sealed runs, for the valuation estimate (Oct 1, 2026) ──────────────────
// The token above is signed, not secret: anyone holding it can read the run
// inside, range and all. That was fine while the range was on the screen
// anyway. The estimate keeps the range on the server until the owner leaves a
// phone or an email (site/35), and "anywhere the browser can see" includes this
// token. So the estimate's run is sealed: AES-256-GCM, which hides it and
// proves it is ours in one step. Same secret, same 24 hours, same "null for
// every failure".

function sealKey(): Buffer {
  return createHash("sha256").update(`estimate-seal:${secret()}`).digest();
}

/** Seal a run so the page can carry it and hand it back, unread. */
export function sealRun(run: object, briefId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const plain = Buffer.from(JSON.stringify({ ...run, briefId, iat: Date.now() }), "utf8");
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return [iv, body, cipher.getAuthTag()].map(b64url).join(".");
}

/** Open one, or null: a forged, expired, foreign or garbled token alike. */
export function openRun<T extends object>(token: unknown, briefId: string): T | null {
  if (typeof token !== "string" || token.length > 200_000) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, body, tag] = parts.map(fromB64url);
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plain) as T & { briefId?: string; iat?: number };
    if (parsed.briefId !== briefId) return null;
    if (typeof parsed.iat !== "number" || Date.now() - parsed.iat > MAX_AGE_MS) return null;
    const { briefId: _id, iat: _iat, ...run } = parsed;
    return run as unknown as T;
  } catch {
    return null;
  }
}
