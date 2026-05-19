# Gesher Partners — Exit Brief Tool + Marketing Site

A one-page marketing website for an Israeli sell-side M&A advisory firm, plus an AI-powered Exit Brief tool that reads a company's website and returns a three-section brief on market context, value drivers, and valuation.

**Live URL:** (Deploy to Vercel first, then paste the URL here)

---

## What This Is

**Gesher** is a sell-side M&A advisor for Israeli family-owned businesses in the NIS 5M–50M revenue band. This site is the homepage lead magnet: a clean, founder-led marketing site plus a free Exit Brief tool that proves Gesher reads the business, knows the buyers, and can value it with confidence.

The Exit Brief takes a seller's URL, calls the Anthropic API with a detailed v6 skill prompt, and returns a three-part brief in real time:

1. **Market Snapshot** — Recent Israeli M&A comps in the vertical, median multiples, what it means for the seller.
2. **Value Drivers** — Positive and negative factors that move the valuation multiple.
3. **Valuation and Buyers** — A defensible NIS range, approach breakdown table, and 4–7 named buyers ranked by archetype.

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js 22+** (includes pnpm)
- **ANTHROPIC_API_KEY** (optional for local dev; required for Exit Brief to work)
- **RESEND_API_KEY** (optional for local dev; required for email delivery)

### Install & Run

```bash
# Clone the repo
git clone <repo-url>
cd gesher-partners-site

# Install dependencies
pnpm install

# Create .env.local (copy from .env.example, add your API keys if you have them)
cp .env.example .env.local
# Edit .env.local and add:
#   ANTHROPIC_API_KEY=sk-ant-...
#   RESEND_API_KEY=re_...
#   LEAD_NOTIFICATION_EMAIL=hello@gesher-partners.com

# Start dev server
pnpm dev

# Open http://localhost:3000 in your browser
```

The site will run without the API keys — the Exit Brief and contact form will show a friendly error message until they are configured.

---

## Environment Variables

### Required for Production

| Variable | Purpose | Where to Get |
|---|---|---|
| `ANTHROPIC_API_KEY` | Powers the Exit Brief AI tool (claude-opus-4-5) | https://console.anthropic.com |
| `RESEND_API_KEY` | Sends contact form and PDF emails | https://resend.com/api-keys |
| `LEAD_NOTIFICATION_EMAIL` | Email to receive contact submissions | Any email address |

### Provided by Manus (do not set manually)

- `DATABASE_URL` — Database connection string
- `JWT_SECRET` — Session signing secret
- `VITE_APP_ID` — OAuth app ID
- `OAUTH_SERVER_URL` — OAuth backend URL
- And others (see `.env.example` for the full list)

---

## Deployment to Vercel

### Step 1. Push to GitHub

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Select your GitHub repo
4. Click **Deploy**
5. Once deployed, go to **Settings → Environment Variables**
6. Add the three required variables:
   - `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`
   - `LEAD_NOTIFICATION_EMAIL`
7. Click **Redeploy** to apply the env vars

Your site is now live at `https://<your-project>.vercel.app`

---

## Custom Domain Setup

### Step 1. Buy a Domain

Purchase a domain from any registrar (Namecheap, GoDaddy, etc.) or use an existing one.

### Step 2. Add Domain to Vercel

1. In Vercel project settings, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g. `gesher-partners.com`)
4. Vercel will show you the DNS records to add

### Step 3. Update DNS at Your Registrar

1. Log in to your domain registrar (Namecheap, GoDaddy, etc.)
2. Find the DNS settings for your domain
3. Add the records Vercel provided (usually an `A` record and a `CNAME` record)
4. Wait 24–48 hours for DNS to propagate

Your site will now be accessible at your custom domain.

---

## Site Structure

```
client/
  src/
    pages/
      Home.tsx              ← One-page marketing site
      ExitBrief.tsx         ← Exit Brief tool (3 screens)
      Privacy.tsx           ← Privacy policy placeholder
      Terms.tsx             ← Terms of service placeholder
      NotFound.tsx          ← Custom 404 page
    components/
      Nav.tsx               ← Sticky top navigation
      HeroSection.tsx
      StatsSection.tsx
      HowItWorksSection.tsx
      FoundersSection.tsx
      ContactSection.tsx
      Footer.tsx
      OfirSidebar.tsx       ← Sticky sidebar on result tabs
      PdfModal.tsx          ← Lead-capture modal
      BriefMarkdown.tsx     ← Markdown renderer
    index.css               ← Design tokens, fonts, global styles
    messages/
      en.json               ← All UI copy (English)
      he.json               ← Hebrew translations (empty scaffold)

server/
  routes/
    exitBrief.ts            ← Express routes for /api/exit-brief, /api/contact, /api/exit-brief/pdf
  lib/
    exitBriefSkill.ts       ← Full v6 skill prompt + all 9 reference files
  routers.ts                ← tRPC procedures (auth, exit brief PDF mutation)
  db.ts                     ← Database helpers
  _core/
    index.ts                ← Express server bootstrap
    env.ts                  ← Environment variable access
    oauth.ts                ← OAuth callback handler
    ... (other core utilities)
```

---

## How It Works

### Exit Brief Flow

1. **User submits URL** at `/exit-brief`
2. **Frontend validates** the URL and POSTs to `/api/exit-brief`
3. **Server-side:**
   - Rate-limits by IP (1 Brief per minute)
   - Calls Anthropic API with `claude-opus-4-5` + web search tool
   - Inlines the full v6 skill prompt + 9 reference files as system context
   - Streams markdown back to the client
   - Persists full markdown (with thinking traces) server-side for audit
   - Returns `briefId` for later PDF requests
4. **Frontend displays** three tabs: Market Snapshot, Value Drivers, Valuation and Buyers
5. **Ofir sidebar** appears on all tabs with a "Book a call" CTA
6. **PDF modal** captures name/email, triggers `/api/exit-brief/pdf`
7. **Server sends** PDF email to the seller + full audit email to Ben

### Contact Form Flow

1. **User submits** name, email, phone, role, message at the Contact section
2. **Frontend POSTs** to `/api/contact`
3. **Server sends** email to `LEAD_NOTIFICATION_EMAIL` with form contents
4. **Frontend shows** success message

---

## Customization Checklist for Ben

Before launch, Ben needs to:

- [ ] **Add photos.** Replace photo placeholders in the Founders section and Ofir sidebar with real photos (upload via the Manus Management UI or use `manus-upload-file --webdev`)
- [ ] **Set API keys.** Add `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, and `LEAD_NOTIFICATION_EMAIL` to Vercel environment settings
- [ ] **Update domain.** Point your custom domain at Vercel (see Custom Domain Setup above)
- [ ] **Update office address.** Replace the placeholder `[OB&H office address, Ben to paste from obhcpa.com]` in the Footer with the real address
- [ ] **Update Cal.com URL.** Replace `https://cal.com/gesher` with your actual Cal.com or Calendly booking URL (used in the hero CTA, contact section, and Ofir sidebar)
- [ ] **Update LinkedIn URL.** Replace `https://linkedin.com/company/gesher-partners` with your real LinkedIn company page
- [ ] **Verify email address.** Make sure `LEAD_NOTIFICATION_EMAIL` is set to the email you want to receive leads
- [ ] **Test Exit Brief.** Submit a real company URL and verify the Brief generates correctly
- [ ] **Test contact form.** Submit the contact form and verify you receive the email
- [ ] **Review copy.** All UI copy is in `messages/en.json` — edit there if needed
- [ ] **Hebrew translations.** In Phase 2, add Hebrew copy to `messages/he.json` and wire the language toggle

---

## Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, TypeScript, Wouter (routing)
- **Backend:** Express 4, tRPC 11, Node.js
- **Database:** MySQL (optional; not required for v0)
- **AI:** Anthropic Claude Opus 4.5 with web search tool
- **Email:** Resend
- **Deployment:** Vercel
- **Design:** Cream background (`#F8F4ED`), navy primary (`#1B3A5C`), burgundy accent (`#A64253`), Source Serif Pro + Inter fonts

---

## Verification Checklist

Before declaring the site ready:

- [ ] Homepage loads cleanly with all five sections (Hero, Stats, How It Works, Founders, Contact, Footer)
- [ ] Navigation links scroll smoothly to each section
- [ ] Exit Brief tool accepts a URL and generates a Brief within 60 seconds
- [ ] Brief displays three tabs with seller-facing content (no thinking traces visible)
- [ ] Ofir sidebar appears on all three result tabs
- [ ] PDF modal captures name/email and sends the Brief as an email
- [ ] Contact form submits and sends email to `LEAD_NOTIFICATION_EMAIL`
- [ ] All links work: home, about, how we work, contact, privacy, terms, exit brief
- [ ] 404 page displays for unknown routes
- [ ] Site is responsive on mobile (tested on iPhone 12+, Android)
- [ ] Favicon displays (G wordmark in navy on cream)
- [ ] Rate limiting works (second Brief within 60s returns 429 error)
- [ ] No console errors or warnings
- [ ] Deployed to Vercel and live at custom domain

---

## Support & Questions

For questions or issues, contact Ben at `hello@gesher-partners.com` or open an issue in the GitHub repo.

---

## License

© 2026 Gesher. All rights reserved.
