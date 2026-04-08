# 보조금매칭AI (GovGrant Match)

> AI가 찾아주는 나의 정부 지원금

사업자등록증 한 장이면 끝. AI가 사업 정보를 분석하고 수천 개 지원사업 중 딱 맞는 것만 골라드립니다.

## Live Demo
https://app-seven-inky-55.vercel.app

## Features
- **AI 맞춤 매칭** — 업종, 매출, 지역, 업력, 대표자 나이 5가지 조건으로 스코어링
- **AI 문서 분석** — 사업자등록증 이미지 업로드 → Gemini Vision이 자동 분석
- **AI 신청서 생성** — 예비창업패키지 등 공식 양식에 맞춘 사업계획서 초안 작성
- **전문가 매칭** — 변리사, 세무사, 노무사 등 전문가 연결
- **실시간 데이터** — 기업마당 공공API 연동 + 30건 시드 데이터

## Tech Stack
| Category | Technology |
|----------|-----------|
| Frontend | Next.js 16.2, React 19, Tailwind CSS 4 |
| AI | Gemini 2.0 Flash (primary), Claude Sonnet (fallback) |
| Data | 기업마당 공공API + curated seed data |
| Deploy | Vercel |

## Getting Started
```bash
git clone https://github.com/funjun2938/subsidy-buddy.git
cd subsidy-buddy/app
npm install
npm run dev
# → http://localhost:3100
```

## Project Structure
```
subsidy-buddy/
├── app/                   # Next.js application
│   ├── app/               # Pages & API routes
│   │   ├── page.tsx       # Landing page
│   │   ├── results/       # Match results
│   │   ├── grants/[id]/   # Grant detail
│   │   ├── generate/      # AI doc generator
│   │   ├── experts/       # Expert matching
│   │   ├── pricing/       # Pricing plans
│   │   └── api/           # 8 API endpoints
│   ├── components/        # React components (5)
│   └── lib/               # AI engines, data, types
├── docs/                  # Project documentation
│   ├── MANIFEST.md
│   ├── WHYTREE.md
│   └── PREMORTEM.md
└── FEATURES.md            # Feature documentation
```

## Team
| Name | Role |
|------|------|
| Jun | Project Lead, Full-stack Development |
| [윤경혜] | Documentation |
| [이수련] | UI Enhancement |
| [고승권] | Feature Development |

## License
MIT