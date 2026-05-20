# Gesher Partners Site — TODO

## Foundation
- [x] Install dependencies: @anthropic-ai/sdk, resend, @react-pdf/renderer
- [x] Configure design tokens in index.css (cream, navy, burgundy, body, subtext, white)
- [x] Load Source Serif Pro + Inter from Google Fonts in index.html
- [x] Set up messages/en.json and messages/he.json i18n files
- [x] Configure Tailwind CSS custom colors matching the locked palette

## One-Page Marketing Site
- [x] Sticky top nav with wordmark logo and anchor links (smooth scroll)
- [x] Hero section: locked copy, primary CTA scrolls to contact, secondary CTA → /exit-brief
- [x] Stats block: 4 decades / 3 markets / Real auction / Paid when you win (burgundy numbers)
- [x] How It Works: four cards + CTA
- [x] Founders section: Ben + Ofir with photo placeholders
- [x] Contact form: radio segmentation, POST to /api/contact, Resend notification
- [x] Three-column footer: office details, page links, legal strip

## Exit Brief Tool (/exit-brief)
- [x] Input form with URL field + optional financial intake fields
- [x] Generating screen with animated status messages (pulsing dots, status rotation)
- [x] Result page with three tabs: Market Snapshot, Value Drivers, Valuation and Buyers
- [x] Ofir sticky right-rail with Book a Call CTA on all three result tabs
- [x] PDF download button triggering lead-capture modal
- [x] Lead-capture modal: name + email, sends PDF via Resend, notifies Ben

## Server-Side API Routes
- [x] POST /api/exit-brief: validate URL, call Anthropic claude-opus-4-5 with streaming + web search
- [x] Inline full v6 skill prompt + all 9 reference files as system context
- [x] Stream markdown back to client, strip thinking-trace blocks server-side
- [x] Persist full markdown keyed by briefId (in-memory store)
- [x] Rate limit: one Brief per IP per minute
- [x] POST /api/contact: validate, send Resend notification to LEAD_NOTIFICATION_EMAIL
- [x] POST /api/exit-brief/pdf: capture lead info, send PDF email + audit email to Ben

## Utility Pages
- [x] /privacy placeholder page
- [x] /terms placeholder page
- [x] Custom 404 page (on-voice, short, quiet)
- [x] Favicon: G wordmark navy on cream

## Config & Docs
- [x] Environment variable scaffolding (ANTHROPIC_API_KEY, RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL)
- [x] README with deployment instructions, customization checklist for Ben, domain-pointing guide
- [x] Verification checklist (10-point QA)

## Ben's Post-Launch Checklist (for after deployment)
- [ ] Add real photos (Founders section, Ofir sidebar) — use manus-upload-file --webdev
- [ ] Set ANTHROPIC_API_KEY in Vercel environment settings
- [ ] Set RESEND_API_KEY in Vercel environment settings
- [ ] Set LEAD_NOTIFICATION_EMAIL in Vercel environment settings
- [ ] Update office address in Footer (replace placeholder)
- [ ] Update Cal.com booking URL (hero CTA, contact section, Ofir sidebar)
- [ ] Update LinkedIn company URL (footer)
- [ ] Test Exit Brief generation end-to-end with a real company URL
- [ ] Test contact form end-to-end and verify email delivery
- [ ] Point custom domain at Vercel (see README for steps)
- [ ] Review all copy in messages/en.json and edit as needed
- [ ] Add Hebrew translations to messages/he.json (Phase 2)


## Visual Redesign (1955 Zurich Private-Bank Aesthetic) — V2 Round 2 Complete
- [x] Update color palette: cream, navy, burgundy, gold, taupe
- [x] Load new fonts: Playfair Display, Source Serif Pro, Inter
- [x] Redesign Hero: center-align, ghost buttons, burgundy rule
- [x] Redesign Stats: white cards on cream with navy borders
- [x] Redesign How It Works: locked copy, 4 cards, left-aligned
- [x] Add Where We Operated section with logo placeholders
- [x] Redesign Founders: left-column cards + right-column story
- [x] Redesign Contact form: baseline inputs, revenue dropdown
- [x] Update Footer: new tagline, address placeholder, dynamic year
- [x] Redesign Exit Brief: boxed URL, dropdown fields, new copy
- [x] Remove all em-dashes from codebase
- [x] Left-align all text except CTA buttons
- [x] Test all sections and verify no copy/logic changes


## V2 Round 2 Bug Fixes
- [x] Fix Hero section: left-align all content (currently centered)
- [x] Remove "+net profits" from EBITDA field label
- [x] Create bridge icon logo (arch design in navy)
- [x] Update Nav wordmark to use bridge icon + "gesher" lowercase text
- [x] Create favicon using bridge icon
- [x] Tests passing (9 tests)


## Round 3: Exit Brief Result Page Render & Scrub

### Scrub Rules (Global)
- [x] Rule A: Strip `## Internal:` blocks (implemented in BriefMarkdown.tsx)
- [x] Rule B: Strip confidence flags `[high]`, `[medium]`, `[low]`, `[confidence: ...]` (implemented in BriefMarkdown.tsx)
- [x] Rule C: Strip `## Sources used` block (implemented in BriefMarkdown.tsx)
- [x] Rule D: Render hidden teaser as designed overlay (HiddenRiskTeaser component created)

### Result Page Sections
- [ ] Section 1: Result page header (H1 + blockquote typography)
- [ ] Section 2: Step 1 Market Snapshot (2-column desktop, 1-column mobile, comp table, company card sticky)
- [ ] Section 3: Step 2 Value Drivers (driver cards, hidden teaser overlay, callout)
- [ ] Section 4: Step 3 Valuation (big value range, approach table with EBITDA emphasis, buyers list)
- [ ] Section 5: Path B engagement block (update text in exitBriefSkill.ts)
- [ ] Section 6: Next Step section (navy background, founder cards, CTA pills)

### PDF Lead-Capture Flow
- [x] PDF button (secondary pill, 80px below last callout) - implemented in ExitBrief.tsx
- [x] PDF modal (Name + Email + Phone fields, submit button) - PdfModal.tsx redesigned
- [x] /api/exit-brief/pdf-request endpoint (validate, store lead, email Ben, Slack webhook) - implemented in server/routes/exitBrief.ts
- [x] Confirmation panel (success message, Done button) - implemented in PdfModal.tsx

### Testing & QA
- [ ] Run test URL through Exit Brief tool
- [ ] Verify all 20 checklist items pass
- [ ] Test on 375px, 768px, 1280px widths
- [ ] No em-dashes, no "AI" word, no trace leaks


## Round 3 Continued: Result Page Sections & Logos
- [ ] Add KPMG and JFrog logos to Where We've Operated section (with placeholder cards)
- [ ] Section 1: Result page header with custom H1 and blockquote typography
- [ ] Section 2: Market Snapshot with 2-column layout, comp table, sticky company card
- [ ] Section 3: Value Drivers with driver cards and callout
- [ ] Section 4: Valuation with value range display, approach table, buyers list
- [ ] Section 5: Path B engagement block (update exitBriefSkill.ts text)
- [ ] Section 6: Next Step section (navy background, founder cards, CTA pills)
