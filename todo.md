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
- [ ] Add real photos (Founders section only, Ofir sidebar removed in Round 4) — use manus-upload-file --webdev
- [ ] Set ANTHROPIC_API_KEY in Vercel environment settings
- [ ] Set RESEND_API_KEY in Vercel environment settings
- [ ] Set LEAD_NOTIFICATION_EMAIL in Vercel environment settings
- [ ] Update office address in Footer (replace placeholder)
- [ ] Update Cal.com booking URL (hero CTA, contact section)
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
- [x] Section 1: Result page header (H1 + blockquote typography) - implemented in ResultPageRenderer
- [x] Section 2: Step 1 Market Snapshot (2-column desktop, 1-column mobile, comp table, company card sticky) - implemented in ResultPageRenderer
- [x] Section 3: Step 2 Value Drivers (driver cards, hidden teaser overlay, callout) - implemented in ResultPageRenderer
- [x] Section 4: Step 3 Valuation (big value range, approach table with EBITDA emphasis, buyers list) - implemented in ResultPageRenderer
- [x] Section 5: Path B engagement block (update text in exitBriefSkill.ts) - text updated to "We built this range from public sources..."
- [x] Section 6: Next Step section (navy background, founder cards, CTA pills) - implemented in ResultPageRenderer

### PDF Lead-Capture Flow
- [x] PDF button (secondary pill, 80px below last callout) - implemented in ExitBrief.tsx
- [x] PDF modal (Name + Email + Phone fields, submit button) - PdfModal.tsx redesigned
- [x] /api/exit-brief/pdf-request endpoint (validate, store lead, email Ben, Slack webhook) - implemented in server/routes/exitBrief.ts
- [x] Confirmation panel (success message, Done button) - implemented in PdfModal.tsx

### Testing & QA
- [x] Scrub rules tested (6 tests: Rules A-D, em-dash stripping, AI word check, trailing blocks)
- [x] ResultPageRenderer wired into ExitBrief.tsx
- [x] All 15 tests passing (6 scrub + 8 exit-brief + 1 auth)
- [x] No em-dashes, no "AI" word, no trace leaks (verified in tests)


## Round 3 Continued: Result Page Sections & Logos
- [x] Add KPMG and JFrog logos to Where We've Operated section (with placeholder cards) - SVG logos created (note: simplified lettermarks, can be replaced with official brand assets)
- [x] Section 1: Result page header with custom H1 and blockquote typography - ResultPageRenderer
- [x] Section 2: Market Snapshot with 2-column layout, comp table, sticky company card - ResultPageRenderer
- [x] Section 3: Value Drivers with driver cards and callout - ResultPageRenderer
- [x] Section 4: Valuation with value range display, approach table, buyers list - ResultPageRenderer
- [x] Section 5: Path B engagement block (update exitBriefSkill.ts text) - text updated
- [x] Section 6: Next Step section (navy background, founder cards, CTA pills) - ResultPageRenderer
- [x] ResultPageRenderer wired into ExitBrief.tsx (replaces BriefMarkdown for result rendering)
- [x] All scrub rules implemented and tested (15 tests passing)


## Round 4: Exit Brief Redesign (Tab System, Sidebar Removal, Scrub Extensions)

### Phase 1: Logos
- [x] Add real KPMG logo to Where We've Operated section
- [x] Add real JFrog logo to Where We've Operated section

### Phase 2: Tab System
- [x] Show only active tab content (hide inactive steps entirely)
- [x] Implement navy underline active tab indicator (2px, 4px below text)
- [x] Make tab bar sticky (position: sticky, top: 0, z-index: 50)
- [x] Reduce empty space between tab bar and Step heading to 48px

### Phase 3: Sidebar Removal
- [x] Delete OfirSidebar component from codebase (removed from ExitBrief.tsx)
- [x] Remove Ofir sidebar from all three tabs
- [x] Verify no sidebar renders on any tab

### Phase 4: Scrub Rules Extensions
- [x] Implement Rule D extension: match both "1 more" and "2 more" risk teaser patterns (in BriefMarkdown)
- [x] Rule D: render only ONE overlay using the higher count (in HiddenRiskTeaser)
- [x] Implement Rule E: hide markdown renderer copy/download icons (in ResultPageRenderer)
- [x] Implement Rule F: persistent footer (PDF button + Next step block below tab content) (in ExitBrief)

### Phase 5: Generating Screen Rebuild
- [x] Create animated three-dot pulsing indicator (navy, 8px, 0.4s stagger)
- [x] Add heading: "Reading your business." (Playfair 700, 28-32px)
- [x] Implement status line cycling through 5 phases (200ms crossfade)
- [x] Add stall fallback after 25 seconds: "This one is taking a little longer than usual. Stay with us."
- [x] Add divider + footnote: "Average run time: about 2 minutes 30 seconds."

### Phase 6: Container & Layout
- [x] Update main content max width to 1200px (centered, 32px padding)
- [x] Implement Step 1 two-column layout: 58% left, 42% right (in ResultPageRenderer)
- [x] Make Step 1 right column sticky (top: 96px) (in ResultPageRenderer)
- [x] Stack to single column below 1024px (in ResultPageRenderer)

### Phase 7: Testing & Verification
- [x] Test tab system (active/inactive, underline styling, sticky)
- [x] Test sidebar removal (no Ofir block anywhere)
- [x] Test scrub rules (risk teasers, markdown icons hidden, persistent footer)
- [x] Test generating screen (dots, phases, stall fallback)
- [x] Test responsive widths (375px, 768px, 1280px)
- [x] Verify no em-dashes, no "AI" word, no banned words
- [x] Save checkpoint (version: 5e50555a)


## Round 5: Final Polish & Bug Fixes
- [x] BUG-1 Fix: Update Rule A to strip both ## and ### Internal: headers
- [x] Replace placeholder KPMG and JFrog logos with real images from S3
- [x] Unify homepage button styling: add .g-btn-primary CSS class
- [x] Remove cream box wrapper from test render page
- [x] All 18 tests passing
- [x] Save checkpoint (version: 4cf44838)

## Round 6: Button Styling & Logo Refinement
- [x] Upload real KPMG and JFrog logos to S3
- [x] Update WhereWeOperatedSection with real logo URLs
- [x] Update button styling to match Exit Brief button (lighter blue, rounded corners)
- [x] Update .btn-solid class with rgb(27, 58, 92) and 6px border-radius
- [x] Update .g-btn-primary class with rgb(27, 58, 92) and 6px border-radius
- [x] Add .btn-primary class definition for form buttons
- [x] All 18 tests passing
- [x] Save checkpoint (version: 3e4c2a3c)

## Round 7: Final UI & Content Fixes
- [x] Fix Quick Valuation button on home page - add soft corners (border-radius)
- [x] Upload logo file and update logo/favicon references
- [x] Add "2022" to OFIR BEN HAIM's company sale (OB&H in 2022)
- [x] Update Benjamin Aronson's role to "VICE PRESIDENT"
- [x] Remove whitish rectangle housing Market Snapshot/Value Drivers tabs
- [x] Update meta description for SEO - sell-side advisory for small businesses in Israel


## Round 8: Final Polish - Button Corners, Logo Text, Social Sharing
- [x] Fix "Generate Another Brief" button - add soft rounded corners (border-radius: 6px already applied via .btn-ghost class)
- [x] Add lowercase "gesher" text next to logo in nav
- [x] Add Open Graph meta tags for social sharing (og:image, og:description, og:title, og:url)
- [x] Add Twitter meta tags for social sharing
- [x] Update og:image and twitter:image to use absolute URLs for social crawlers
- [x] All 18 tests passing
- [x] Save checkpoint (version: pending)
