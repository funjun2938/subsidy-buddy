# Plan: 회원가입 / 로그인 / 결과 저장 (v2)

> v2 변경: 서브에이전트 4명 peer review(Design/Engineering/Product/Security) 반영.
> Google OAuth 컷, `/saved` 페이지 컷, Supabase SSR 통합 명세 추가, sessionStorage 메커니즘 명시, RLS SQL 박음, 보안/접근성 요건 추가.

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature명 | 회원가입 + 로그인/로그아웃 + 매칭 결과 저장 |
| 한줄 설명 | 익명 사용자가 매칭 결과를 본 직후 가입할 수 있게 하고, 가입한 회원은 결과를 저장해 다음 방문 시 사업자등록증 재업로드 없이 다시 볼 수 있게 한다 |
| 담당 | 수련 (byseren) |
| 브랜치 | feat/signup |
| 마감 | 2026-05-01 (금) 15:59 |

## 2. 왜 이 Feature가 필요한가

### 현재 상태
- 모든 기능(매칭/생성/결제)이 익명으로 동작
- 결제도 Toss `ANONYMOUS` customerKey 사용
- 사용자가 한 번 매칭한 결과를 다시 볼 방법 없음 → 매번 사업자등록증을 다시 올려야 함

### 문제 (Pain Point)
- **재업로드 부담** (가장 큰 통증): 같은 사용자가 다시 와도 사업자등록증을 처음부터 다시 올려야 함
- **사용자 이력 추적 불가**: 어떤 보조금에 관심 있었는지 모름
- **개인화 가치 못 살림**: AI 매칭 결과는 본질적으로 개인화 자산인데 휘발

### 이번 Feature의 핵심 가치 제안
> **"이메일만 남기면 사업자등록증 다시 안 올려도 돼요"**

회원가입 자체가 가치가 아니라, **재업로드 면제**가 가치. 가입은 그 수단.

## 3. SLC 프레임 적용

| 차원 | 이번 주 범위 |
|------|-------------|
| Simple | 이메일 + 비밀번호만. Google OAuth 등 외부 의존 모두 제외 |
| Loveable | 결과 본 직후 가입 유도, 재업로드 면제 카피, 친절한 한국어 에러 |
| Complete | RLS로 본인 데이터만 보호, 가입→저장→로그아웃→재로그인→복원 풀 사이클 |

**제외 (Phase 2 / 다음 주 이후)**
- Google OAuth — Google Cloud 콘솔 셋업 1~2시간 위험. 데모 임팩트 0. 의도적으로 다음 주로 이동.
- 비밀번호 재설정 / 이메일 인증
- `/saved` 별도 페이지, 저장 결과 라벨링, 마이페이지

## 4. 사용자 시나리오

### 시나리오 A (메인 데모): 결과 본 직후 가입
1. 익명으로 사이트 진입 → 사업자등록증 업로드 → 매칭 결과 페이지 도달
2. 결과 카드 하단 sticky 배너:
   > **이메일만 남기면 사업자등록증 다시 안 올려도 돼요**
   > [내 결과 저장하기] [다음에 할게요]
3. "내 결과 저장하기" 클릭 → `/signup` 이동 (직전 매칭 결과는 sessionStorage에 임시 보관)
4. 이메일 + 비밀번호 입력 → 가입 완료 → 자동 로그인
5. 가입 콜백에서 sessionStorage 읽어 `saved_matches`에 INSERT → sessionStorage 비움
6. 결과 페이지로 복귀, 헤더가 로그인 상태로 바뀜

### 시나리오 B: 헤더에서 직접 가입/로그인
1. 헤더 우측 "회원가입" 또는 "로그인" 클릭
2. 가입/로그인 후 직전 페이지 또는 메인으로 복귀

### 시나리오 C (데모 클라이맥스): 재방문 → 결과 복원
1. 다른 날 다시 방문 → 헤더 "로그인"
2. 로그인 → 헤더 "내 결과" 클릭
3. 저장된 매칭 결과 즉시 표시 — **사업자등록증 재업로드 없음**

### 시나리오 D: 비로그인 사용자 (변경 없음)
- 매칭/생성/결제 모두 익명으로 가능 (현재 동작 유지)
- 모든 가입 유도는 dismissible. "다음에 할게요" 보조 버튼 필수.

## 5. 기술 스택

| 구성 | 선택 | 이유 |
|------|------|------|
| 인증 서비스 | Supabase Auth | 한국어 자료 풍부, 무료 티어 충분, 원래 plan에도 명시 |
| 가입 방식 | 이메일/비밀번호만 | Google OAuth는 Phase 2 |
| 세션 관리 | `@supabase/ssr` | Next.js 16 App Router 공식 권장 |
| DB | Supabase PostgreSQL | Auth와 같은 프로젝트, 셋업 1회 |

### 환경 변수 (신규)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> ⚠️ `NEXT_PUBLIC_` prefix는 **클라이언트 번들에 포함**됨. anon key는 RLS 전제로 노출 OK. **`service_role` key는 절대 `NEXT_PUBLIC_`에 넣지 말 것** (서버 전용).

`lib/env.ts`에서 모듈 로드 시 검증 (없으면 throw).

## 6. 데이터 모델

### `auth.users` (Supabase 기본 테이블, 자동 관리)
- id (uuid), email, encrypted_password, created_at, ...

### `saved_matches` (신규 — 4컬럼만)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | `gen_random_uuid()` 기본값 |
| user_id | uuid (FK → auth.users.id) | 소유자 |
| conditions | jsonb | 매칭 시 입력한 조건 (사업자등록증 추출 데이터 포함) |
| matched_grants | jsonb | 매칭된 지원사업 리스트 (스냅샷) |
| created_at | timestamptz | `now()` 기본값 |

> `label` 컬럼 의도적 제외 — 다음 주에 추가. `matched_grants`는 jsonb 스냅샷 (향후 grants 정규화 시 마이그레이션 필요, 의식적 선택).

### RLS 정책 (필수)

```sql
-- 1. 테이블에 RLS 활성화
alter table saved_matches enable row level security;

-- 2. SELECT: 본인 행만 조회
create policy "select_own"
  on saved_matches for select
  using (auth.uid() = user_id);

-- 3. INSERT: 본인 user_id로만 삽입
create policy "insert_own"
  on saved_matches for insert
  with check (auth.uid() = user_id);

-- 4. DELETE: 본인 행만 삭제
create policy "delete_own"
  on saved_matches for delete
  using (auth.uid() = user_id);

-- UPDATE 정책은 의도적으로 만들지 않음 → 저장 후 수정 불가 (안전 기본값)
```

## 7. 파일 구조 (Next.js 16 App Router + Supabase SSR)

`app/` 디렉터리(=`/Users/kakaogames/Documents/subsidy-buddy/app/`) 기준.

### 신규 파일
```
app/
├── lib/
│   ├── env.ts                    # 환경변수 검증
│   └── supabase/
│       ├── client.ts             # 브라우저용 createBrowserClient
│       ├── server.ts             # 서버 컴포넌트용 createServerClient + cookies()
│       └── middleware.ts         # 세션 토큰 갱신 헬퍼
├── middleware.ts                 # 루트 미들웨어 (모든 요청에 세션 갱신)
└── app/
    ├── signup/page.tsx
    ├── login/page.tsx
    └── auth/callback/route.ts    # Supabase OAuth/이메일 콜백 (필요 시)
```

### 신규 컴포넌트
- `components/AuthForm.tsx` — 가입/로그인 공통 폼
- `components/SaveMatchBanner.tsx` — 결과 페이지 하단 sticky 배너 (비로그인용)
- `components/SaveMatchButton.tsx` — 로그인 상태일 때 즉시 저장 버튼

### 변경되는 컴포넌트
- `components/Header.tsx` (또는 헤더 위치)
  - 비로그인: "로그인" (텍스트 링크) + "회원가입" (gradient CTA)
  - 로그인: 아바타 드롭다운 (이메일 + 로그아웃) + "내 결과" 버튼
- `app/results/page.tsx` (또는 매칭 결과 페이지)
  - 비로그인: `<SaveMatchBanner />` 하단 sticky
  - 로그인: `<SaveMatchButton />` 결과 카드 옆

## 8. 직전 매칭 결과 보존 메커니즘 (시나리오 A)

**문제**: 익명 사용자가 결과를 보다가 가입 페이지로 이동하면, 그 결과가 어디로 가는가?

**해결**: sessionStorage 사용
1. 사용자가 "내 결과 저장하기" 클릭 시점에 결과 페이지가 sessionStorage에 저장:
   ```ts
   sessionStorage.setItem('pendingMatch', JSON.stringify({ conditions, matchedGrants }))
   ```
2. `/signup` 이동
3. 가입 성공 콜백에서:
   ```ts
   const pending = sessionStorage.getItem('pendingMatch')
   if (pending) {
     await supabase.from('saved_matches').insert({ ...JSON.parse(pending), user_id: user.id })
     sessionStorage.removeItem('pendingMatch')
   }
   router.push('/results')
   ```

> **세션 고정 공격 방어**: localStorage 대신 sessionStorage 사용 (탭 단위 격리). 가입 직후 클라이언트에서 명시적 INSERT — 서버에 익명 ID로 미리 저장하지 않음.

## 9. UX 카피 (Loveable 핵심)

| 위치 | 카피 |
|------|------|
| 결과 페이지 배너 | **이메일만 남기면 사업자등록증 다시 안 올려도 돼요** |
| 배너 CTA | **내 결과 저장하기** (← "회원가입" 아님) |
| 배너 보조 | 다음에 할게요 |
| 가입 실패 (중복) | **입력 정보를 확인해 주세요** (← "이미 가입된 이메일" 노출 금지) |
| 로그인 실패 | **입력 정보를 확인해 주세요** (동일 — enumeration 방어) |
| 로그인 페이지 하단 | 처음이신가요? **회원가입 →** |

## 10. 보안 요건

| 위험 | 대응 |
|------|------|
| 이메일 enumeration | 가입/로그인 에러 메시지 통일 ("입력 정보를 확인해 주세요") |
| 세션 고정 | sessionStorage + 가입 직후 클라이언트 명시적 INSERT |
| RLS 누락 | 위 §6의 SQL을 그대로 실행. 테스트 시 다른 계정으로 SELECT 시도해 0건 확인 |
| service_role key 유출 | `NEXT_PUBLIC_`에는 anon key만. service_role은 이번 주 사용 안 함 |
| 비밀번호 약함 | Supabase 기본 6자 → **최소 8자**로 상향 (Auth 설정) |
| 환경변수 누락 | `lib/env.ts`에서 모듈 로드 시 throw |

## 11. 접근성 요건 (Definition of Done)

- `<input>` 마다 `<label htmlFor>` 매칭
- `autocomplete` 속성:
  - 이메일: `autocomplete="email"`
  - 가입 비번: `autocomplete="new-password"`
  - 로그인 비번: `autocomplete="current-password"`
- 에러 영역: `<div role="alert" aria-live="polite">`
- 제출 실패 시 첫 에러 필드로 포커스 이동
- 모든 가입 유도는 dismissible (키보드 ESC 포함)

## 12. 작업 순서 (3.5 ~ 5시간)

| # | 작업 | 시간 |
|---|------|------|
| 1 | Supabase 프로젝트 생성 + Auth 활성화 (이메일 비번 8자 설정) + URL/anon key 복사 | 20-30분 |
| 2 | SQL Editor에서 §6의 RLS 정책 실행 | 15분 |
| 3 | `npm i @supabase/supabase-js @supabase/ssr` + `.env.local` 작성 + `lib/env.ts` | 10분 |
| 4 | `lib/supabase/{client,server,middleware}.ts` + 루트 `middleware.ts` 작성 | 30-40분 |
| 5 | `AuthForm` + `/signup`, `/login` 페이지 (a11y 요건 포함) | 40-60분 |
| 6 | 헤더 로그인 상태 반영 (비로그인/로그인 분기) | 20-30분 |
| 7 | 결과 페이지에 `SaveMatchBanner` + sessionStorage 흐름 + 가입 콜백 INSERT | 40-60분 |
| 8 | 로컬 풀 사이클 테스트 (가입→저장→로그아웃→재로그인→복원) | 20-30분 |
| 9 | commit + push (브랜치 `feat/signup`) | 10분 |
| - | 버퍼 (Supabase 첫 셋업 어딘가에서 막힘) | 30-60분 |

## 13. 성공 기준 (Definition of Done)

- [ ] 익명 사용자가 매칭 결과 본 직후 배너로 가입할 수 있다
- [ ] 가입 직후 자동 로그인되며, 직전 매칭 결과가 자동 저장된다
- [ ] 로그아웃 → 재로그인 시 헤더 "내 결과"로 저장된 결과를 재업로드 없이 본다
- [ ] 다른 계정으로 로그인 시 남의 데이터가 보이지 않는다 (RLS 검증)
- [ ] 비로그인 흐름(매칭/생성/결제)은 깨지지 않는다
- [ ] 가입/로그인 폼이 키보드만으로 완전 조작 가능, 스크린 리더가 에러 읽음
- [ ] `.env.local`은 커밋되지 않는다 (.gitignore 확인)
- [ ] PR/브랜치 author가 byseren / lee.sryun@gmail.com (git config 검증)

## 14. 위험과 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| Supabase 첫 셋업이 길어짐 | 중 | 작업 1번에 30분 버퍼. 안 되면 팀 슬랙 도움 요청 |
| Next.js 16 SSR 세션 깜빡임 | 중 | `@supabase/ssr` 공식 가이드 그대로 따라가기. 자체 변형 금지 |
| sessionStorage 흐름에서 결과 손실 | 저 | 7번 작업 직후 즉시 테스트. 실패 시 로그인 상태 사용자에게는 즉시 INSERT 경로로 폴백 |
| 환경변수 실수 커밋 | 고 | `.env.local`만 사용, `.env.example` 따로 |
| 시간 부족 | 중 | 우선순위: 시나리오 A > C > B. A만 되면 데모 가능 |

## 15. 학습 포인트 (과제 제출용)

- **Meta-cognition**: 4명 peer review로 스펙을 v1 → v2로 줄이고 채운 경험. "넣는 것보다 빼는 것이 어려웠다"
- **Technical**:
  - Supabase Auth + Next.js 16 App Router의 SSR 세션 관리
  - RLS의 USING / WITH CHECK 분리
  - sessionStorage vs localStorage의 보안 차이 (세션 고정)
- **Team feedback**: 데모 후 팀원 의견
