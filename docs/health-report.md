# Health Report — subsidy-buddy

**Date:** 2026-05-28
**Branch:** feat/yungyeonghye-task2-health-infra

## Health Stack (from CLAUDE.md)
- typecheck: `tsc --noEmit`
- lint: `npx eslint app/ components/ lib/ --ext .ts,.tsx`

## Results

| Category | Tool | Status | Details |
|----------|------|--------|---------|
| Type check | tsc --noEmit | ✅ CLEAN | 0 errors |
| Lint | eslint | ❌ CRITICAL | 6 errors, 1 warning |
| Tests | — | ⬜ SKIPPED | No test suite configured |

## Lint Errors (6 errors, 1 warning)

### generate/page.tsx (4 errors)
- Line 1038, 1067: `"` not escaped → `&quot;` 필요 (`react/no-unescaped-entities`)

### ThemeToggle.tsx (1 error)
- Line 10: `useEffect` 내부에서 `setState` 동기 호출 (`react-hooks/set-state-in-effect`)

### WelcomePopup.tsx (1 error)
- Line 10: `useEffect` 내부에서 `setState` 동기 호출 (`react-hooks/set-state-in-effect`)

### grants/[id]/page.tsx (1 warning)
- Line 6: `SuccessRateData` 미사용 변수 (`@typescript-eslint/no-unused-vars`)

## Gap: 테스트 없음
CLAUDE.md에 "There is no test suite configured"라고 명시됨.
매칭 로직, 스코어링 임계값 등 핵심 비즈니스 로직에 테스트가 전혀 없음.
