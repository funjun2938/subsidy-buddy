# Gap Analysis: govt-subsidy-matching

> Date: 2026-04-04 | Analyst: gap-detector

## Overall Match Rate: 86%

| Category | Score |
|----------|:-----:|
| Design Match (MVP) | 82% |
| Architecture Compliance | 78% |
| Convention Compliance | 88% |
| Feature Completeness | 95% |
| **Overall** | **86%** |

## Status: [Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] 🔄 86%

## Missing (Design O → Implementation X) — 4 items
1. `MatchScore` 컴포넌트 (GrantCard에 인라인 처리됨) — Low
2. `Footer` 컴포넌트 — Low
3. `max_employees` 필드 — Low
4. 시드 데이터 25건 (설계: 30~50건) — Medium

## Added Beyond Design — 11 items (BM 기능 + UX 개선)
1. Gemini API 통합 (Primary + Claude Fallback)
2. 기업마당 공공API 크롤러
3. AI 문서 분석 (사업자등록증 + 텍스트)
4. AI 신청서 생성 (지원사업별 양식 준수)
5. 전문가 매칭 페이지
6. 구독 요금제 페이지 (3단)
7. ConditionForm AI 탭 (파일 업로드 + 드래그앤드롭)
8. Grants 데이터 스토어 + 1시간 캐시
9. 지원사업별 문서 템플릿 (예비/초기창업패키지)
10. 글래스모피즘 다크 테마 UI
11. 네비게이션 헤더 (BM 페이지 링크)

## Recommended: Design 문서를 구현에 맞게 v2 업데이트
