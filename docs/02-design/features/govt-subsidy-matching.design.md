# Design: 정부 지원금·보조금 AI 매칭 서비스

## 1. 디렉토리 구조

```
08-정부지원금매칭/
├── app/
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 랜딩 + 조건 입력 폼
│   ├── globals.css         # Tailwind globals
│   ├── results/
│   │   └── page.tsx        # 매칭 결과 리스트
│   ├── grants/
│   │   └── [id]/
│   │       └── page.tsx    # 지원사업 상세 + AI 분석
│   └── api/
│       ├── match/
│       │   └── route.ts    # AI 매칭 엔진 API
│       └── grants/
│           └── route.ts    # 지원사업 목록 API
├── components/
│   ├── ConditionForm.tsx   # 조건 입력 폼
│   ├── GrantCard.tsx       # 지원사업 카드
│   ├── MatchScore.tsx      # 매칭 점수 표시
│   ├── Header.tsx          # 헤더
│   └── Footer.tsx          # 푸터
├── lib/
│   ├── supabase.ts         # Supabase 클라이언트
│   ├── claude.ts           # Claude API 유틸
│   ├── types.ts            # TypeScript 타입
│   └── seed-data.ts        # 시드 데이터 (MVP용)
├── .env.local              # 환경 변수
├── docs/                   # PDCA 문서
└── package.json
```

## 2. DB 스키마

### grants (지원사업)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 고유 ID |
| title | text | 사업명 |
| org_name | text | 주관기관 |
| category | text | 분류 (창업/R&D/수출/고용 등) |
| region | text | 지역 (전국/서울/경기 등) |
| target_biz_type | text[] | 대상 업종 |
| min_biz_age | int | 최소 업력(년) |
| max_biz_age | int | 최대 업력(년) |
| max_revenue | bigint | 매출 상한 |
| max_employees | int | 고용 인원 상한 |
| ceo_age_limit | text | 대표자 나이 조건 |
| amount | text | 지원 금액 |
| deadline | date | 마감일 |
| description | text | 상세 설명 |
| requirements | text | 자격 요건 원문 |
| url | text | 공고 링크 |
| created_at | timestamptz | 수집일 |

### MVP에서는 Supabase 대신 로컬 시드 데이터로 시작
- `lib/seed-data.ts`에 실제 지원사업 30~50건 하드코딩
- 추후 Supabase 연동으로 전환

## 3. 핵심 페이지 설계

### 3-1. 랜딩 페이지 (`/`)
- 히어로: 서비스 소개 + CTA
- 조건 입력 폼 (ConditionForm):
  - 업종 (드롭다운: 음식점/소매/제조/IT/서비스/기타)
  - 연 매출 (드롭다운: ~5천만/~1억/~3억/~5억/5억+)
  - 지역 (드롭다운: 전국/서울/경기/부산/대구/...17개 시도)
  - 업력 (드롭다운: 예비창업/1년미만/1~3년/3~5년/5~7년/7년+)
  - 대표자 나이 (드롭다운: ~29세/30~39/40~49/50~59/60+)
- 폼 제출 → `/results?...` 쿼리스트링으로 이동

### 3-2. 매칭 결과 페이지 (`/results`)
- URL 쿼리에서 조건 파싱
- `/api/match` 호출 → AI 매칭 결과 수신
- GrantCard 리스트 렌더링:
  - 사업명 + 주관기관
  - 매칭 점수 (높음/보통/낮음 색상)
  - 마감일 D-day
  - 지원 금액
  - "상세 보기" 링크

### 3-3. 지원사업 상세 (`/grants/[id]`)
- 사업 기본 정보 (기관, 분류, 지원금액, 마감일)
- 자격 요건 원문
- AI 분석 결과 (합격 가능성 + 이유 + 전략 제안)
- 공고 원문 링크 (외부 이동)

## 4. API 설계

### POST `/api/match`
```
Request:
{
  bizType: string,      // 업종
  revenue: string,      // 매출 구간
  region: string,       // 지역
  bizAge: string,       // 업력
  ceoAge: string        // 대표자 나이대
}

Response:
{
  matches: [
    {
      grant: Grant,
      matchScore: "high" | "medium" | "low",
      reason: string,    // AI 분석 한줄 요약
    }
  ]
}
```

### GET `/api/grants?id={id}&bizType=...&revenue=...`
- 특정 지원사업 상세 + AI 자격 분석 결과 반환

## 5. AI 매칭 프롬프트 (Claude)

```
당신은 정부 지원사업 매칭 전문가입니다.

[사용자 조건]
- 업종: {bizType}
- 연 매출: {revenue}
- 지역: {region}
- 업력: {bizAge}
- 대표자 나이: {ceoAge}

[지원사업 목록]
{grants JSON}

각 지원사업에 대해:
1. 사용자가 자격 요건을 충족하는지 분석
2. 매칭 점수 (high/medium/low) 판정
3. 판정 이유 한줄 요약
4. 매칭 점수 높은 순으로 정렬

JSON 형태로 응답.
```

## 6. 구현 순서

1. Next.js 프로젝트 초기화 + Tailwind
2. 타입 정의 (`lib/types.ts`)
3. 시드 데이터 작성 (`lib/seed-data.ts`) — 실제 지원사업 30건
4. 랜딩 페이지 + ConditionForm 컴포넌트
5. `/api/match` Route + Claude 연동
6. 매칭 결과 페이지 (`/results`)
7. 지원사업 상세 페이지 (`/grants/[id]`)
8. 반응형 + 마무리 + Vercel 배포
