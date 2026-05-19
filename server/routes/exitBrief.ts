import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { EXIT_BRIEF_SYSTEM_PROMPT } from "../lib/exitBriefSkill";
import { nanoid } from "nanoid";

// ─── In-memory stores ───────────────────────────────────────────────────────
// briefId -> full markdown (including thinking traces)
const briefStore = new Map<string, string>();

// IP -> last request timestamp (ms)
const rateLimitStore = new Map<string, number>();

// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

function stripThinkingTraces(markdown: string): string {
  // Remove every ## Internal: ... block and all content until the next ## heading or end of file
  // This regex matches from "## Internal:" through the next "##" or end of string
  return markdown
    .replace(/^## Internal:.*?(?=^##|$)/gms, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Route: POST /api/exit-brief ────────────────────────────────────────────
async function handleExitBrief(req: Request, res: Response) {
  const ip = getClientIp(req);
  const now = Date.now();
  const last = rateLimitStore.get(ip) ?? 0;

  if (now - last < 60_000) {
    res.status(429).json({
      error:
        "You have already generated a Brief in the last minute. Wait a moment and try again, or book a call with Ofir and we will pull the Brief together by hand.",
    });
    return;
  }

  const { url, revenue, ebitda, sde } = req.body as {
    url?: string;
    revenue?: string;
    ebitda?: string;
    sde?: string;
  };

  if (!url) {
    res.status(400).json({ error: "A company website URL is required." });
    return;
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Please enter a valid website URL." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "Our Brief engine is not configured yet. Book a call with Ofir and we will pull the Brief together by hand.",
    });
    return;
  }

  rateLimitStore.set(ip, now);

  // Build user message
  let userMessage = `URL: ${url}`;
  if (revenue || ebitda || sde) {
    const parts: string[] = [];
    if (revenue) parts.push(`revenue NIS ${revenue}`);
    if (ebitda) parts.push(`pre-tax profit NIS ${ebitda}`);
    if (sde) parts.push(`owner salary NIS ${sde}`);
    userMessage += `\nIntake: ${parts.join(", ")}`;
  }

  const anthropic = new Anthropic({ apiKey });
  const briefId = nanoid(12);
  let fullMarkdown = "";

  try {
    const stream = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      system: EXIT_BRIEF_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 20,
        } as unknown as Anthropic.Tool,
      ],
    });

    // Stream markdown to client in real time (newline-delimited JSON)
    res.setHeader("Content-Type", "application/x-ndjson");

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullMarkdown += chunk;
        // Send chunk to client as newline-delimited JSON
        res.write(JSON.stringify({ type: "chunk", data: chunk }) + "\n");
      }
    }

    // Persist full markdown (with traces) for audit
    briefStore.set(briefId, fullMarkdown);

    // Send completion signal with briefId
    res.write(JSON.stringify({ type: "done", briefId }) + "\n");
    res.end();
  } catch (err) {
    console.error("[exit-brief] Anthropic error:", err);
    res.status(500).json({
      error:
        "Our Brief engine is busy. Try again in a minute, or book a call with Ofir and we will pull the Brief together by hand.",
    });
  }
}

// ─── Route: POST /api/exit-brief/pdf ────────────────────────────────────────
async function handleExitBriefPdf(req: Request, res: Response) {
  const { briefId, name, email } = req.body as {
    briefId?: string;
    name?: string;
    email?: string;
  };

  if (!briefId || !name || !email) {
    res.status(400).json({ error: "briefId, name, and email are required." });
    return;
  }

  const fullMarkdown = briefStore.get(briefId);
  if (!fullMarkdown) {
    res.status(404).json({
      error: "Brief not found. It may have expired. Please generate a new one.",
    });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFICATION_EMAIL ?? "hello@gesher-partners.com";

  if (!resendKey) {
    res.status(500).json({
      error: "Email delivery is not configured. Please contact us directly.",
    });
    return;
  }

  const resend = new Resend(resendKey);
  const sellerMarkdown = stripThinkingTraces(fullMarkdown);

  try {
    // Email to the seller with the brief content
    // (PDF generation via @react-pdf/renderer is Phase 2 work)
    await resend.emails.send({
      from: "Gesher <hello@gesher-partners.com>",
      to: email,
      subject: "Your Exit Brief from Gesher",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1B3A5C;">
          <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">Your Exit Brief</h1>
          <p style="font-size: 16px; color: #666; margin-bottom: 32px;">Hi ${name}, here is your Exit Brief from Gesher.</p>
          <div style="background: #F8F4ED; padding: 32px; border-radius: 8px; font-family: Georgia, serif; font-size: 15px; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">${sellerMarkdown.substring(0, 8000)}</div>
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #ddd;">
            <p style="font-size: 15px; color: #333;">Want to go deeper? Book a 30-minute call with Ofir Ben Haim.</p>
            <a href="https://cal.com/gesher" style="display: inline-block; background: #1B3A5C; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-family: Arial, sans-serif; font-size: 15px; margin-top: 12px;">Book a call</a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">Strictly private. Built from public sources. Not an offer or a valuation opinion.</p>
        </div>
      `,
    });

    // Notification to Ben with full details including thinking trace
    await resend.emails.send({
      from: "Gesher Lead <hello@gesher-partners.com>",
      to: notifyEmail,
      subject: `New Exit Brief lead: ${name} <${email}>`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #1B3A5C;">New Exit Brief PDF Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Brief ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${briefId}</td></tr>
          </table>
          <h3 style="color: #1B3A5C;">Full Brief (including thinking traces for audit)</h3>
          <pre style="background: #f5f5f5; padding: 20px; border-radius: 4px; font-size: 13px; white-space: pre-wrap; overflow-wrap: break-word;">${fullMarkdown}</pre>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[exit-brief/pdf] Email error:", err);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
}

// ─── Route: POST /api/contact ────────────────────────────────────────────────
async function handleContact(req: Request, res: Response) {
  const { name, email, phone, role, message } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    message?: string;
  };

  if (!name || !email || !message) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFICATION_EMAIL ?? "hello@gesher-partners.com";

  if (!resendKey) {
    // Log and return success anyway so the form doesn't break in dev
    console.warn("[contact] RESEND_API_KEY not set. Logging contact form submission:", { name, email, role });
    res.json({ success: true });
    return;
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: "Gesher Contact Form <hello@gesher-partners.com>",
      to: notifyEmail,
      replyTo: email,
      subject: `New contact from ${name} (${role ?? "not specified"})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #1B3A5C;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone ?? "—"}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Role</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${role ?? "—"}</td></tr>
          </table>
          <h3 style="color: #1B3A5C;">Message</h3>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 4px; white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("[contact] Resend error:", err);
    res.status(500).json({ error: "Failed to send message. Please try again or email us directly." });
  }
}

// ─── Register all routes ─────────────────────────────────────────────────────
export function registerApiRoutes(app: Express) {
  app.post("/api/exit-brief", handleExitBrief);
  app.post("/api/exit-brief/pdf", handleExitBriefPdf);
  app.post("/api/contact", handleContact);
}
