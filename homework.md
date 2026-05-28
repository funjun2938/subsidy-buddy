# Homework – Subsidy Buddy (보조금매칭AI)

---

## 1) User Interview

### Target User
Small business owner (소규모 사업자) running an IT services company in Seoul, ~3 years in operation, annual revenue under ₩500M.

---

### a) Three Main Insights from the Interview

**Insight 1 – Reproducibility undermines trust**
The user ran the same search twice with identical business conditions and received a noticeably different ordered list both times. Because the ranking changed, they couldn't tell which result was "correct" and lost confidence in the platform entirely. *"If I can't rely on seeing the same results, I don't know which grants are actually right for me."*

**Insight 2 – Match reasons are too generic**
Reasons like "IT 업종 매칭" appear on nearly every result regardless of the grant's actual scope. The user wanted explanations that referenced the specific eligibility criteria of that grant — amount thresholds, regional restrictions, age of business — so they could quickly self-screen without clicking into every detail page.

**Insight 3 – No feedback loop when there are zero or few results**
When the matching engine returned fewer than three grants, the page looked almost empty and there was no guidance on what to do next (broaden conditions, try a different region, etc.). The user assumed the product was broken rather than understanding it as a legitimate "no match" outcome.

---

### b) Update / Fix Based on the Interview

**Problem addressed:** Insight #1 — non-reproducible results.

The Claude fallback engine (`claude.ts`) was passing all grants to the AI and asking it to rank them by score. Because LLM outputs are stochastic, the same input could yield a different ordering on every call. The Gemini primary engine already used a deterministic rule-based scorer, but the fallback path did not.

**Fix:** Extracted all rule-based scoring logic into a shared `app/lib/scoring.ts` module (`rankGrants`, `ruleScore`, `scoreToGrade`). Both the Gemini and Claude engines now:
1. Run the rule-based scorer to produce a fully deterministic ranked list (tie-broken by `grant.id` ASC).
2. Call the AI **only** to generate a one-sentence match *reason* for each already-ranked grant — not to re-rank.
3. Set `temperature: 0` on all AI calls to minimise variation in the generated text.

Result: identical business conditions now always produce the same grant order, regardless of which AI engine handles the request.

---

### c) Commit URL

**https://github.com/funjun2938/subsidy-buddy/commit/91d5351**

Files changed:
- `app/lib/scoring.ts` ← new shared scoring module
- `app/lib/claude.ts` ← rewritten to use rule-based ranking
- `app/lib/gemini.ts` ← refactored to import from scoring.ts

---

## 2) /health – Test Coverage Assessment

### Health Dashboard Results

```
CODE HEALTH DASHBOARD
=====================
Project: subsidy-buddy
Branch:  main
Date:    2026-05-28

Category      Tool              Score   Status      Details
----------    ----------------  -----   ---------   --------------------------------
Type check    tsc --noEmit      10/10   CLEAN       0 errors
Lint          eslint .           4/10   NEEDS WORK  6 errors, 1 warning
Tests         vitest run        10/10   CLEAN       24/24 passed (after fix)
Dead code     knip              SKIP    —           not installed
Shell lint    shellcheck        SKIP    —           not installed

COMPOSITE SCORE: 7.5 / 10  (weights redistributed for skipped tools)

Duration: ~15s total
```

**Lint issues found:**
- `generate/page.tsx`: 4x unescaped `"` in JSX (react/no-unescaped-entities)
- `ThemeToggle.tsx`: `setState` called synchronously inside `useEffect`
- `WelcomePopup.tsx`: same `setState` in effect pattern
- `grants/[id]/page.tsx`: 1 unused import warning

**Tests — before /health, zero tests existed. After building infrastructure:**
- `vitest` installed + `vitest.config.ts` configured
- `scoring.test.ts`: 16 tests (ruleScore, scoreToGrade, rankGrants)
- `match-reasons.test.ts`: 8 tests (getMatchReasons)
- All 24 tests pass

### a) Major Lesson After Setting Up Comprehensive Tests

**The gap between "it looks like it works" and "it actually works deterministically" only becomes visible once you write tests.**

Before /health, the codebase had zero automated tests. The code ran and the UI looked correct, but there was no way to verify that the core scoring logic — the fix implemented in Task 1 — actually behaved deterministically under all inputs. Writing tests for `rankGrants` immediately surfaced the key insight: the tie-breaking by `grant.id` needed to work consistently *regardless of input order*, which is a subtle invariant that's easy to break in a refactor.

The other surprise: the `eslint` score of 4/10 despite TypeScript being clean at 10/10. Type safety and lint cleanliness are independent — a project can be fully type-safe while still having React anti-patterns (synchronous `setState` in effects). Running `/health` makes both dimensions visible at once, forcing you to treat them as a composite rather than ignoring the less obvious one.

---

## 3) oh-my-claudecode Loop Capability

> *To be completed after implementing a new feature with ≥ 3 loop iterations.*

### a) What Surprised You Most About Multi-Iteration AI-Assisted Development

*(Fill in after running /loop.)*
