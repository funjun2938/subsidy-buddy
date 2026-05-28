# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands must be run from the `app/` subdirectory:

```bash
cd app
npm install       # install dependencies
npm run dev       # dev server → http://localhost:3100
npm run build     # production build
npm run lint      # ESLint check
```

There is no test suite configured.

## Environment Variables

Create `app/.env.local` with:

```
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
```

Both keys are required for full functionality. The app degrades gracefully if one is missing (Gemini → Claude fallback).

## Architecture

The Next.js app lives entirely under `app/`. It uses the App Router (`app/app/`).

**Next.js version note**: This project uses Next.js 16.2, which has breaking changes from earlier versions. Before writing Next.js-specific code, check `app/node_modules/next/dist/docs/` for the current conventions.

### Data flow for grant matching

1. User submits business profile via `ConditionForm` (file upload or manual input)
2. `POST /api/match` receives a `UserCondition` object
3. `lib/grants-store.ts` returns grants — merging 30 seed records (`lib/seed-data.ts`) with live results from 기업마당 public API (`lib/crawler.ts`), cached in-memory for 1 hour
4. `lib/ai.ts` orchestrates matching: tries Gemini (`lib/gemini.ts`) first, falls back to Claude (`lib/claude.ts`) if Gemini fails or is unconfigured
5. Results page (`app/results/`) displays scored `MatchResult[]`; grant detail (`app/grants/[id]/`) calls `GET /api/grants?id=` for per-grant AI eligibility analysis

### Scoring logic (`lib/gemini.ts`)

Rule-based scoring (max 100 pts): region match (15), business type match (15), business age fit (10), domain keyword overlap (50), deadline bonus (10). Keyword overlap compares the user's free-text domain description against each grant's title + description + requirements.

### Core types (`lib/types.ts`)

All shared interfaces live here: `Grant`, `UserCondition`, `MatchResult`, `GrantAnalysis`, plus enums for business types, regions, and revenue ranges. Always extend these rather than defining local types.

### API routes (`app/app/api/`)

| Route | Purpose |
|-------|---------|
| `POST /api/match` | Grant matching for a user profile |
| `GET /api/grants` | Single grant details + AI eligibility analysis |
| `POST /api/analyze-doc` | Gemini Vision extracts business info from uploaded file/text |
| `POST /api/generate-doc` | Generates business plan draft in official format |
| `POST /api/check-doc` | Validates checklist items in a document |
| `POST /api/revise-doc` | Revises/regenerates a document section |
| `GET /api/grant-redirect` | Redirects to official grant source page |

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Health Stack

- typecheck: tsc --noEmit
- lint: npx eslint app/ components/ lib/ --ext .ts,.tsx
- test: npm test (Vitest, jsdom + React Testing Library)
- test:e2e: npm run test:e2e (Playwright, Chromium)
