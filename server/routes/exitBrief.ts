import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { EXIT_BRIEF_SYSTEM_PROMPT } from "../lib/exitBriefSkill";
import { insertValuationLead, markValuationLeadPdfRequested } from "../db";
import { nanoid } from "nanoid";

// ─── In-memory stores ───────────────────────────────────────────────────────
// briefId -> the seller brief markdown (v7 is seller-only, no trace)
const briefStore = new Map<string, string>();

// IP -> last request timestamp (ms)
const rateLimitStore = new Map<string, number>();

// Lead requests
interface LeadRequest {
  name: string;
  email: string;
  phone: string;
  briefId: string;
  requestedAt: Date;
}
const leadStore = new Map<string, LeadRequest>();

// ─── Helpers ────────────────────────────────────────────────────────────────
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

// Store the IP hashed, abuse only. We never keep the raw IP. Matches the firm's
// "we never share your numbers" promise.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function stripThinkingTraces(markdown: string): string {
  // Remove every ## Internal: ... block and all content until the next ## heading or end of file
  // Split by lines, filter out Internal blocks, then rejoin
  const lines = markdown.split("\n");
  const filtered: string[] = [];
  let inInternalBlock = false;

  for (const line of lines) {
    if (line.startsWith("## Internal:")) {
      inInternalBlock = true;
    } else if (line.startsWith("##") && inInternalBlock) {
      inInternalBlock = false;
      filtered.push(line);
    } else if (!inInternalBlock) {
      filtered.push(line);
    }
  }

  return filtered
    .join("\n")
    // Drop the page-only Value flags ("positive:" / "watch:") so a seller email never
    // shows them as raw text. The page reads these flags to draw icons; email does not.
    .replace(/^[ \t]*(?:positive|watch):[ \t]*/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// v7 page-mode meta block. The model returns a fenced ```json block first, then the
// three cards. Pull the meta fields out, and treat everything after the block as the
// seller-facing markdown. The seller (page, email, PDF) never sees the JSON.
interface BriefMeta {
  company_name?: string;
  company_oneliner?: string;
  range_variant?: string; // "number" | "by_hand"
  range_text?: string;
  buyer_types?: string;
  vertical_matched?: string; // internal calibration, never shown
  path_used?: string; // internal calibration, never shown
}

function parseMetaAndBody(fullMarkdown: string): { meta: BriefMeta; resultMd: string } {
  // Primary: a fenced ```json ... ``` block (what the bundle asks for).
  const fenced = fullMarkdown.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    let meta: BriefMeta = {};
    try {
      meta = JSON.parse(fenced[1].trim());
    } catch {
      meta = {};
    }
    const resultMd = fullMarkdown.slice((fenced.index ?? 0) + fenced[0].length).trim();
    return { meta, resultMd };
  }
  // Fallback: a bare leading { ... } object before the first heading.
  const bare = fullMarkdown.match(/^\s*(\{[\s\S]*?\})\s*(?=\n#|\n##|$)/);
  if (bare) {
    try {
      const meta = JSON.parse(bare[1]) as BriefMeta;
      const resultMd = fullMarkdown.slice((bare.index ?? 0) + bare[0].length).trim();
      return { meta, resultMd };
    } catch {
      // not JSON, fall through
    }
  }
  // No meta found. Hand back the markdown untouched so the page can still render cards.
  return { meta: {}, resultMd: fullMarkdown.trim() };
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

  const body = req.body as {
    url?: string;
    revenue?: string;
    pretax_profit?: string;
    owner_salary?: string;
    // Tolerate the old field names during the transition.
    ebitda?: string;
    sde?: string;
  };
  const { url, revenue } = body;
  const pretaxProfit = body.pretax_profit ?? body.ebitda;
  const ownerSalary = body.owner_salary ?? body.sde;

  if (!url) {
    res.status(400).json({ error: "A company website URL is required." });
    return;
  }

  // Sellers type bare domains ("manltd.co.il"). Add a scheme so new URL() and the
  // model's web read both get a real address, instead of rejecting the run.
  const normalizedUrl = /^https?:\/\//i.test(url.trim())
    ? url.trim()
    : "https://" + url.trim();

  // Basic URL validation
  try {
    new URL(normalizedUrl);
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
  let userMessage = `URL: ${normalizedUrl}`;
  if (revenue || pretaxProfit || ownerSalary) {
    const parts: string[] = [];
    if (revenue) parts.push(`revenue NIS ${revenue}`);
    if (pretaxProfit) parts.push(`pre-tax profit NIS ${pretaxProfit}`);
    if (ownerSalary) parts.push(`owner salary NIS ${ownerSalary}`);
    userMessage += `\nIntake: ${parts.join(", ")}`;
  }

  const anthropic = new Anthropic({ apiKey });
  const briefId = nanoid(12);
  let fullMarkdown = "";
  const startedAt = Date.now();
  // Token usage, read off the stream for the leads row (cost per valuation).
  const usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

  try {
    const stream = await anthropic.messages.create({
      model: "claude-opus-4-5",
      // v7: three short cards, far fewer output tokens than v6's brief + trace.
      max_tokens: 6000,
      // v7: cache the ~7k-token bundle so it is billed once, not re-sent every run.
      // The seller URL + intake stay the dynamic part in the user message.
      system: [
        {
          type: "text",
          text: EXIT_BRIEF_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
      stream: true,
      tools: [
        {
          // v7: light live look only. The deep comp + buyer hunt moved to the cache.
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 6,
        } as unknown as Anthropic.Tool,
      ],
    });

    // Stream markdown to client in real time (newline-delimited JSON)
    res.setHeader("Content-Type", "application/x-ndjson");

    // Tell the page when the model starts its web search, so the working screen can
    // show a real "Learning your size and your story" stage, not a fake timer.
    let sentSearching = false;

    for await (const event of stream) {
      if (event.type === "message_start") {
        const u = event.message.usage;
        usage.inputTokens = u.input_tokens ?? 0;
        usage.cachedInputTokens = u.cache_read_input_tokens ?? 0;
      } else if (
        event.type === "content_block_start" &&
        !sentSearching &&
        ((event as { content_block?: { type?: string } }).content_block?.type ===
          "server_tool_use" ||
          (event as { content_block?: { type?: string } }).content_block?.type ===
            "web_search_tool_result")
      ) {
        sentSearching = true;
        res.write(JSON.stringify({ type: "phase", phase: "searching" }) + "\n");
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const chunk = event.delta.text;
        fullMarkdown += chunk;
        // Send chunk to client as newline-delimited JSON
        res.write(JSON.stringify({ type: "chunk", data: chunk }) + "\n");
      } else if (event.type === "message_delta") {
        usage.outputTokens = event.usage.output_tokens ?? usage.outputTokens;
      }
    }

    // v7: split the meta block from the seller-facing cards. Store only the clean
    // markdown so the email and PDF never see the JSON.
    const { meta, resultMd } = parseMetaAndBody(fullMarkdown);
    briefStore.set(briefId, resultMd);

    // Save the lead. Fire and forget, and never let a DB hiccup affect the seller.
    void insertValuationLead({
      briefId,
      url: normalizedUrl,
      revenue: revenue ?? null,
      pretaxProfit: pretaxProfit ?? null,
      ownerSalary: ownerSalary ?? null,
      companyName: meta.company_name ?? null,
      companyDomain: domainFromUrl(normalizedUrl) ?? null,
      rangeVariant: meta.range_variant ?? null,
      rangeText: meta.range_text ?? null,
      buyerTypes: meta.buyer_types ?? null,
      verticalMatched: meta.vertical_matched ?? null,
      pathUsed: meta.path_used ?? null,
      resultMd,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      generationMs: Date.now() - startedAt,
      source: (req.headers["referer"] as string | undefined) ?? null,
      ipHash: hashIp(ip),
    });

    // Send completion with the parsed meta so the page renders clean fields.
    res.write(
      JSON.stringify({ type: "done", briefId, meta, result_md: resultMd }) + "\n",
    );
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
      subject: "Your Valuation Snapshot from Gesher",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1B3A5C;">
          <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px;">Your Valuation Snapshot</h1>
          <p style="font-size: 16px; color: #666; margin-bottom: 32px;">Hi ${name}, here is your Valuation Snapshot from Gesher.</p>
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
      subject: `New Valuation Snapshot lead: ${name} <${email}>`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="color: #1B3A5C;">New Valuation Snapshot PDF Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Brief ID</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${briefId}</td></tr>
          </table>
          <h3 style="color: #1B3A5C;">Full brief (seller copy)</h3>
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

// ─── Route: POST /api/exit-brief/pdf-request ───────────────────────────────
async function handlePdfRequest(req: Request, res: Response) {
  const { name, email, phone, briefId } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    briefId?: string;
  };
  // The lead-capture modal may re-offer the numbers. Tolerate new and old names.
  const leadRevenue = req.body?.revenue as string | undefined;
  const leadPretaxProfit = (req.body?.pretax_profit ?? req.body?.profit) as
    | string
    | undefined;

  if (!name || !email || !briefId) {
    res.status(400).json({ message: "Name, email, and briefId are required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Invalid email address." });
    return;
  }

  const fullMarkdown = briefStore.get(briefId);
  if (!fullMarkdown) {
    res.status(404).json({ message: "Brief not found. Please generate a new one." });
    return;
  }

  const leadId = nanoid();
  const lead: LeadRequest = {
    name,
    email,
    phone: phone || "",
    briefId,
    requestedAt: new Date(),
  };
  leadStore.set(leadId, lead);

  // Update the same lead row by briefId (non-fatal). Fills in the contact, flips
  // pdf_requested, and folds in any numbers the modal collected.
  void markValuationLeadPdfRequested(briefId, {
    contactName: name,
    contactEmail: email,
    contactPhone: phone || null,
    ...(leadRevenue ? { revenue: leadRevenue } : {}),
    ...(leadPretaxProfit ? { pretaxProfit: leadPretaxProfit } : {}),
  });

  const resendKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.LEAD_NOTIFICATION_EMAIL ?? "hello@gesher-partners.com";

  if (!resendKey) {
    res.status(500).json({ message: "Email delivery is not configured." });
    return;
  }

  const resend = new Resend(resendKey);

  try {
    const briefUrl = `${req.protocol}://${req.get("host")}/exit-brief?briefId=${briefId}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="color: #1B3A5C; margin-bottom: 24px;">New Valuation Snapshot PDF Request</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 100px;">Name</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${phone || "(not provided)"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Brief ID</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${briefId}</td>
          </tr>
        </table>
        <p style="margin-bottom: 16px;">
          <a href="${briefUrl}" style="display: inline-block; background: #1B3A5C; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Brief</a>
        </p>
        <p style="font-size: 13px; color: #666; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          Send the PDF to ${email} within 24 hours.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "Gesher <hello@gesher-partners.com>",
      to: notifyEmail,
      subject: `PDF Request: ${name} (${email})`,
      html: emailHtml,
    });

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `New Valuation Snapshot PDF Request from ${name}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*New Valuation Snapshot PDF Request*\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone || "(not provided)"}\n*Brief ID:* ${briefId}`,
                },
              },
            ],
          }),
        });
      } catch (err) {
        console.warn("[pdf-request] Slack webhook failed (non-blocking):", err);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[pdf-request] Error:", err);
    res.status(500).json({ message: "Failed to process request. Please try again." });
  }
}

// ─── Register all routes ─────────────────────────────────────────────────────
export function registerApiRoutes(app: Express) {
  app.post("/api/exit-brief", handleExitBrief);
  app.post("/api/exit-brief/pdf", handleExitBriefPdf);
  app.post("/api/exit-brief/pdf-request", handlePdfRequest);
  app.post("/api/contact", handleContact);
}
