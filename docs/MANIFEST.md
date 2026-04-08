# MANIFEST — Core Values & Principles

## Project Name

**보조금 매칭 (GovGrant Match)** — AI-Powered Government Subsidy Matching Service for Korean SMEs

## Mission

Democratize access to government subsidies by removing information asymmetry. Small business owners should not miss funding opportunities simply because they don't know they exist or lack the expertise to apply.

## Core Values

### 1. Accessibility First

Government subsidy information is scattered across dozens of portals in bureaucratic language. We centralize, simplify, and personalize it. Any business owner — regardless of technical literacy — should be able to find relevant grants in under 2 minutes.

### 2. AI as an Equalizer

Large companies hire consultants to navigate government programs. We use AI (Gemini Vision + Claude fallback) to give solo entrepreneurs the same advantage: automatic document analysis, eligibility scoring, and application drafting.

### 3. Trust Through Transparency

- Matching scores are explained, not black-boxed (High / Medium / Low with reasons).
- D-day countdowns show real deadlines from public APIs.
- Data sources are cited (기업마당 공공API).

### 4. Lower the Barrier to Action

Finding a grant is only half the problem. We also generate application documents in the exact format each program requires (예비창업패키지, 초기창업패키지, etc.), reducing the "last mile" friction that stops people from applying.

### 5. Sustainability via Value Alignment

Our monetization (freemium + per-document pricing + expert matching commissions) only charges when we deliver clear value. Free users still get core matching — no paywall on public information.

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| Mobile-first | Responsive UI tested on 360px+ viewports |
| Speed over perfection | Seed data + API caching for instant results while live data loads |
| Graceful degradation | Dual AI engine (Gemini primary, Claude fallback) ensures uptime |
| Privacy by default | Uploaded documents are analyzed in-memory, not stored permanently |

## Tech Stack

- **Frontend**: Next.js 16 · React 19 · Tailwind CSS 4
- **AI**: Gemini 2.0 Flash (primary) · Claude Sonnet (fallback)
- **Data**: 기업마당 공공API + curated seed data (30 programs)
- **Deploy**: Vercel

## Team Commitment

We commit to building software that serves the public interest. If a small business owner in a rural area can discover and apply for a subsidy they didn't know about — we've succeeded.
