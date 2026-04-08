import { Grant, UserCondition } from "./types";

export interface SuccessRateData {
  category: string;
  avgAcceptRate: number;
  avgCompetition: string;
  totalApplicants2025: number;
  totalSelected2025: number;
  tips: string[];
  source: string;
}

interface FactorResult {
  name: string;
  impact: string; // "+X%" or "중립" or "-X%"
  type: "positive" | "neutral" | "negative";
}

const RATE_DB: Record<string, SuccessRateData> = {
  예비창업패키지: {
    category: "예비창업패키지",
    avgAcceptRate: 20,
    avgCompetition: "5:1",
    totalApplicants2025: 12000,
    totalSelected2025: 2400,
    tips: [
      "사업계획서의 혁신성과 실현 가능성이 핵심 평가요소입니다",
      "팀 구성과 대표자 역량 어필이 중요합니다",
      "시장 분석과 BM 차별성을 구체적으로 작성하세요",
    ],
    source: "K-Startup 2025년 통계",
  },
  초기창업패키지: {
    category: "초기창업패키지",
    avgAcceptRate: 25,
    avgCompetition: "4:1",
    totalApplicants2025: 8000,
    totalSelected2025: 2000,
    tips: [
      "창업 후 3년 이내 기업이 대상입니다",
      "기존 매출 실적과 성장 가능성을 증명하세요",
      "특허나 기술력 보유 시 가산점이 있습니다",
    ],
    source: "K-Startup 2025년 통계",
  },
  "R&D": {
    category: "R&D/기술개발",
    avgAcceptRate: 30,
    avgCompetition: "3.3:1",
    totalApplicants2025: 5000,
    totalSelected2025: 1500,
    tips: [
      "기술의 독창성과 사업화 가능성이 핵심입니다",
      "선행기술 조사를 충실히 수행하세요",
      "연구 인력 확보 계획을 구체적으로 작성하세요",
    ],
    source: "중소벤처기업부 2025년 통계",
  },
  소상공인: {
    category: "소상공인 지원",
    avgAcceptRate: 50,
    avgCompetition: "2:1",
    totalApplicants2025: 30000,
    totalSelected2025: 15000,
    tips: [
      "사업자등록증과 매출 증빙 서류를 미리 준비하세요",
      "자부담 비율을 확인하고 자금 계획을 세우세요",
      "신청 기간 초반에 접수하는 것이 유리합니다",
    ],
    source: "소상공인시장진흥공단 2025년 통계",
  },
  수출: {
    category: "수출 지원",
    avgAcceptRate: 35,
    avgCompetition: "2.9:1",
    totalApplicants2025: 4500,
    totalSelected2025: 1575,
    tips: [
      "해외 바이어 확보 계획을 구체적으로 제시하세요",
      "수출 실적이 있으면 가산점이 부여됩니다",
      "목표 시장에 대한 심층 분석을 준비하세요",
    ],
    source: "KOTRA 2025년 통계",
  },
  고용: {
    category: "고용 지원",
    avgAcceptRate: 50,
    avgCompetition: "2:1",
    totalApplicants2025: 20000,
    totalSelected2025: 10000,
    tips: [
      "고용 인원수와 유지 계획을 명확히 작성하세요",
      "4대보험 가입 확인서를 준비하세요",
      "청년 고용 시 추가 지원이 가능합니다",
    ],
    source: "고용노동부 2025년 통계",
  },
  default: {
    category: "정부지원사업",
    avgAcceptRate: 30,
    avgCompetition: "3.3:1",
    totalApplicants2025: 10000,
    totalSelected2025: 3000,
    tips: [
      "공고 요건을 꼼꼼히 확인하고 자격 조건을 맞추세요",
      "제출 서류를 사전에 빠짐없이 준비하세요",
      "신청 마감일 직전은 시스템 장애 위험이 있으니 미리 접수하세요",
    ],
    source: "기업마당 2025년 통합 통계 (추정)",
  },
};

const KEYWORD_MAP: [string[], string][] = [
  [["예비창업", "예비 창업"], "예비창업패키지"],
  [["초기창업", "초기 창업"], "초기창업패키지"],
  [["R&D", "기술개발", "연구개발", "기술혁신", "TIPS"], "R&D"],
  [["소상공인", "소공인", "전통시장", "골목상권"], "소상공인"],
  [["수출", "해외진출", "글로벌", "무역"], "수출"],
  [["고용", "일자리", "채용", "인건비", "근로자"], "고용"],
];

export function getSuccessRate(grant: Grant): SuccessRateData {
  const text = `${grant.title} ${grant.category} ${grant.description}`;
  for (const [keywords, key] of KEYWORD_MAP) {
    if (keywords.some((kw) => text.includes(kw))) {
      return RATE_DB[key];
    }
  }
  return RATE_DB["default"];
}

export function estimateUserRate(
  baseRate: number,
  condition: UserCondition,
  grant: Grant
): { rate: number; factors: FactorResult[] } {
  const factors: FactorResult[] = [];
  let adjusted = baseRate;

  // 지역 일치 확인
  if (grant.region === "전국") {
    factors.push({ name: "지역 제한 없음", impact: "+2%", type: "positive" });
    adjusted += 2;
  } else if (condition.region && grant.region.includes(condition.region)) {
    factors.push({ name: "지역 일치", impact: "+5%", type: "positive" });
    adjusted += 5;
  } else if (condition.region && grant.region !== "전국") {
    factors.push({ name: "지역 불일치", impact: "-10%", type: "negative" });
    adjusted -= 10;
  }

  // 업력 적합성 확인
  const bizAgeYears = parseBizAge(condition.bizAge);
  if (grant.minBizAge !== undefined || grant.maxBizAge !== undefined) {
    const min = grant.minBizAge ?? 0;
    const max = grant.maxBizAge ?? 99;
    if (bizAgeYears >= min && bizAgeYears <= max) {
      factors.push({ name: "업력 적합", impact: "+3%", type: "positive" });
      adjusted += 3;
    } else {
      factors.push({ name: "업력 부적합", impact: "-5%", type: "negative" });
      adjusted -= 5;
    }
  } else {
    factors.push({ name: "업력 조건", impact: "중립", type: "neutral" });
  }

  // 매출 규모 확인
  const revNum = parseRevenue(condition.revenue);
  if (grant.maxRevenue !== undefined) {
    if (revNum <= grant.maxRevenue) {
      factors.push({ name: "매출 규모 적합", impact: "+2%", type: "positive" });
      adjusted += 2;
    } else {
      factors.push({
        name: "매출 초과",
        impact: "-8%",
        type: "negative",
      });
      adjusted -= 8;
    }
  } else {
    factors.push({ name: "매출 규모", impact: "중립", type: "neutral" });
  }

  // 업종 일치
  const bizTypeMatch = grant.targetBizTypes.some(
    (t) => t === "전체" || t === condition.bizType || condition.bizType.includes(t)
  );
  if (bizTypeMatch) {
    factors.push({ name: "업종 일치", impact: "+3%", type: "positive" });
    adjusted += 3;
  } else if (grant.targetBizTypes.length > 0) {
    factors.push({ name: "업종 불일치", impact: "-5%", type: "negative" });
    adjusted -= 5;
  }

  // 범위 제한
  const rate = Math.max(5, Math.min(85, Math.round(adjusted)));

  return { rate, factors };
}

function parseBizAge(bizAge: string): number {
  if (bizAge.includes("예비")) return 0;
  if (bizAge.includes("1년 미만")) return 0.5;
  if (bizAge.includes("1~3")) return 2;
  if (bizAge.includes("3~5")) return 4;
  if (bizAge.includes("5~7")) return 6;
  if (bizAge.includes("7년")) return 8;
  return 3;
}

function parseRevenue(revenue: string): number {
  if (revenue.includes("5천만원 미만")) return 0.3;
  if (revenue.includes("5천만~1억")) return 0.75;
  if (revenue.includes("1억~3억")) return 2;
  if (revenue.includes("3억~5억")) return 4;
  if (revenue.includes("5억~10억")) return 7;
  if (revenue.includes("10억")) return 15;
  return 1;
}
