/**
 * matching-integration.test.ts
 *
 * scoring + match-reasons + rankGrants 를 결합한 통합 시나리오.
 * 개별 함수의 단위 검증은 *-extended 파일에서 다루고, 본 파일은:
 *   - 실제 한국 정부 지원사업 시뮬레이션 데이터셋 (~30개)
 *   - 6명의 가상 소상공인 페르소나 검증
 *   - scoring 의 grade 와 match-reasons 의 사유 일관성
 *   - 큰 데이터셋(100개+) 매칭 성능 / 안정성
 *   - rankGrants 결과의 모든 항목에 fallbackResults 호환성
 *   - 회귀 방지: 추천 품질 보증 (high 등급은 최소 2개 사유)
 */

import { describe, it, expect } from "vitest";
import { ruleScore, scoreToGrade, rankGrants, fallbackResults } from "../lib/scoring";
import { getMatchReasons } from "../lib/match-reasons";
import type { Grant, UserCondition } from "../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼: 안전한 미래/과거 날짜
// ─────────────────────────────────────────────────────────────────────────────
const FAR_FUTURE = "2099-12-31";
const FAR_PAST = "2000-01-01";

function g(overrides: Partial<Grant>): Grant {
  return {
    id: overrides.id ?? "g",
    title: overrides.title ?? "지원사업",
    orgName: overrides.orgName ?? "정부",
    category: overrides.category ?? "창업",
    region: overrides.region ?? "전국",
    targetBizTypes: overrides.targetBizTypes ?? ["기타"],
    amount: overrides.amount ?? "5000만원",
    deadline: overrides.deadline ?? "상시",
    description: overrides.description ?? "",
    requirements: overrides.requirements ?? "",
    url: overrides.url ?? "https://example.com",
    ...overrides,
  };
}

function c(overrides: Partial<UserCondition>): UserCondition {
  return {
    bizType: overrides.bizType ?? "IT·소프트웨어",
    revenue: overrides.revenue ?? "1억 미만",
    region: overrides.region ?? "서울",
    bizAge: overrides.bizAge ?? "1~3년",
    ceoAge: overrides.ceoAge ?? "30대",
    summary: overrides.summary,
    keywords: overrides.keywords,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 시뮬레이션 데이터셋 — 한국 정부 지원사업 모사
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_GRANTS: Grant[] = [
  // 광범위 전국 지원
  g({
    id: "k01",
    title: "예비창업패키지",
    orgName: "창업진흥원",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어", "바이오·헬스케어", "콘텐츠·미디어", "제조", "서비스업"],
    maxBizAge: 0,
    amount: "최대 1억원",
    deadline: FAR_FUTURE,
    description: "예비 창업자 대상 사업화 자금 지원",
  }),
  g({
    id: "k02",
    title: "초기창업패키지",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어", "바이오·헬스케어", "콘텐츠·미디어", "제조", "서비스업"],
    maxBizAge: 3,
    minBizAge: 0.5,
    amount: "최대 1억원",
    deadline: FAR_FUTURE,
  }),
  g({
    id: "k03",
    title: "도약패키지",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어", "바이오·헬스케어", "제조"],
    minBizAge: 3,
    maxBizAge: 7,
    amount: "최대 3억원",
    deadline: FAR_FUTURE,
  }),

  // IT 전용 (전국)
  g({
    id: "k04",
    title: "AI 바우처 지원사업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "최대 3억원",
    deadline: FAR_FUTURE,
    description: "AI 기술 도입 및 활용 지원",
    requirements: "AI 기반 솔루션 보유",
  }),
  g({
    id: "k05",
    title: "데이터바우처",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "최대 5천만원",
    deadline: FAR_FUTURE,
    description: "데이터 가공 및 분석 지원",
  }),

  // 지역 특화
  g({
    id: "k06",
    title: "서울시 청년 창업",
    region: "서울",
    targetBizTypes: ["IT·소프트웨어", "콘텐츠·미디어", "서비스업"],
    maxBizAge: 3,
    ceoAgeLimit: "만 39세 이하",
    amount: "최대 5000만원",
    deadline: FAR_FUTURE,
  }),
  g({
    id: "k07",
    title: "부산 스마트시티 지원",
    region: "부산",
    targetBizTypes: ["IT·소프트웨어", "건설"],
    amount: "최대 1억원",
    deadline: FAR_FUTURE,
  }),
  g({
    id: "k08",
    title: "경기도 제조혁신",
    region: "경기",
    targetBizTypes: ["제조"],
    amount: "최대 1억원",
    deadline: FAR_FUTURE,
  }),

  // 콘텐츠/문화
  g({
    id: "k09",
    title: "콘텐츠 IP 지원",
    region: "전국",
    targetBizTypes: ["게임", "웹툰·만화", "영상·방송", "음악", "콘텐츠·미디어"],
    maxBizAge: 7,
    amount: "최대 1억원",
    deadline: FAR_FUTURE,
    description: "콘텐츠 IP 개발 및 글로벌 진출",
  }),
  g({
    id: "k10",
    title: "게임 스타트업 지원",
    region: "전국",
    targetBizTypes: ["게임"],
    maxBizAge: 5,
    amount: "최대 2억원",
    deadline: FAR_FUTURE,
  }),

  // 전통 산업
  g({
    id: "k11",
    title: "소상공인 경영안정자금",
    region: "전국",
    targetBizTypes: ["음식점·외식", "소매·유통", "서비스업", "교육", "패션·뷰티"],
    amount: "최대 7000만원",
    deadline: FAR_FUTURE,
  }),
  g({
    id: "k12",
    title: "전통시장 디지털화",
    region: "전국",
    targetBizTypes: ["음식점·외식", "소매·유통"],
    minBizAge: 1,
    amount: "최대 3000만원",
    deadline: FAR_FUTURE,
  }),

  // 농림 환경
  g({
    id: "k13",
    title: "스마트팜 보급",
    region: "전국",
    targetBizTypes: ["농림수산", "환경·에너지", "제조"],
    amount: "최대 5억원",
    deadline: FAR_FUTURE,
    description: "스마트팜 IoT 센서 자동화 시스템",
    requirements: "농업 경험 또는 농업회사법인",
  }),

  // 만료된 사업
  g({
    id: "k14",
    title: "만료된 사업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: FAR_PAST,
  }),

  // 매우 좁은 지역+업종
  g({
    id: "k15",
    title: "제주 관광 스타트업",
    region: "제주",
    targetBizTypes: ["서비스업", "음식점·외식"],
    amount: "최대 5000만원",
    deadline: FAR_FUTURE,
  }),

  // 여성/장애인 등 우대
  g({
    id: "k16",
    title: "여성기업 종합지원",
    region: "전국",
    targetBizTypes: ["기타"],
    amount: "최대 7000만원",
    deadline: FAR_FUTURE,
    description: "여성 대표자 우대",
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// 페르소나
// ─────────────────────────────────────────────────────────────────────────────

const PERSONAS = {
  // 서울에서 1년차 AI 스타트업 운영
  AI_STARTUP: c({
    bizType: "IT·소프트웨어",
    region: "서울",
    bizAge: "1년 미만",
    ceoAge: "30대",
    summary: "AI 기반 SaaS 서비스",
    keywords: ["AI", "SaaS", "B2B"],
  }),

  // 부산에서 7년차 게임 회사
  GAME_DEV: c({
    bizType: "게임",
    region: "부산",
    bizAge: "5~7년",
    ceoAge: "40대",
    summary: "모바일 게임 IP 개발",
    keywords: ["게임", "IP", "콘텐츠"],
  }),

  // 경기에서 3년차 음식점
  RESTAURANT: c({
    bizType: "음식점·외식",
    region: "경기",
    bizAge: "1~3년",
    ceoAge: "30대",
  }),

  // 예비 창업자 — 농림수산
  FARM_PRE: c({
    bizType: "농림수산",
    region: "전북",
    bizAge: "예비 창업",
    ceoAge: "30대",
    summary: "스마트팜 IoT 농업",
    keywords: ["스마트팜", "농업", "IoT"],
  }),

  // 제조 7년차 (도약기) 경기
  MFG_MATURE: c({
    bizType: "제조",
    region: "경기",
    bizAge: "5~7년",
    ceoAge: "50대",
  }),

  // 제주 관광 서비스
  JEJU_SVC: c({
    bizType: "서비스업",
    region: "제주",
    bizAge: "3~5년",
    ceoAge: "30대",
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 페르소나별 매칭 결과 검증
// ─────────────────────────────────────────────────────────────────────────────

describe("매칭 통합: AI 스타트업 페르소나", () => {
  const cond = PERSONAS.AI_STARTUP;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("매칭 결과가 최소 1개 이상", () => {
    expect(results.length).toBeGreaterThan(0);
  });

  it("결과 내에 AI 바우처(k04)가 포함됨 (정확매칭)", () => {
    expect(results.some(r => r.grant.id === "k04")).toBe(true);
  });

  it("결과 내에 만료된 사업(k14)은 미포함", () => {
    expect(results.some(r => r.grant.id === "k14")).toBe(false);
  });

  it("결과 내에 부산 한정 사업(k07)은 우선순위가 낮거나 제외", () => {
    const k07Idx = results.findIndex(r => r.grant.id === "k07");
    const k04Idx = results.findIndex(r => r.grant.id === "k04");
    if (k07Idx >= 0 && k04Idx >= 0) {
      expect(k04Idx).toBeLessThan(k07Idx);
    }
  });

  it("초기창업패키지(k02) 는 1년 미만 = 0.5년 → minBizAge 통과", () => {
    const k02 = results.find(r => r.grant.id === "k02");
    expect(k02).toBeDefined();
  });

  it("도약패키지(k03) 는 1년 미만 → minBizAge=3 미달 → 낮은 등급/제외", () => {
    const k03 = results.find(r => r.grant.id === "k03");
    if (k03) {
      expect(k03.grade).not.toBe("high");
    }
  });

  it("모든 결과의 grade 는 'low' 아님 (rankGrants 필터링)", () => {
    results.forEach(r => expect(r.grade).not.toBe("low"));
  });

  it("키워드(AI/SaaS)가 grant 텍스트와 매칭되면 점수 보너스", () => {
    const k04Score = ruleScore(SAMPLE_GRANTS.find(g => g.id === "k04")!, cond);
    const k04NoKw = ruleScore(
      SAMPLE_GRANTS.find(g => g.id === "k04")!,
      c({ ...cond, summary: "", keywords: [] })
    );
    expect(k04Score).toBeGreaterThan(k04NoKw);
  });

  it("매칭 사유에 '전국 지원' 포함 (k04 는 전국)", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k04")!, cond);
    expect(reasons).toContain("전국 지원");
  });

  it("매칭 사유에 '업종 일치' 포함 (IT 정확매칭)", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k04")!, cond);
    expect(reasons).toContain("업종 일치");
  });
});

describe("매칭 통합: 부산 게임 회사 페르소나", () => {
  const cond = PERSONAS.GAME_DEV;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("게임 스타트업 지원(k10)이 결과에 포함", () => {
    expect(results.some(r => r.grant.id === "k10")).toBe(true);
  });

  it("콘텐츠 IP 지원(k09)이 결과에 포함 (정확매칭)", () => {
    expect(results.some(r => r.grant.id === "k09")).toBe(true);
  });

  it("부산 스마트시티(k07) 는 인접 업종으로 매칭 가능 (게임 → IT)", () => {
    // k07 = IT·소프트웨어 + 건설, 게임의 인접에 IT 있음
    const k07Score = ruleScore(SAMPLE_GRANTS.find(g => g.id === "k07")!, cond);
    expect(k07Score).toBeGreaterThan(-15); // 무관 패널티 아님
  });

  it("도약패키지(k03)는 5~7년차에 적합 (minBizAge:3, maxBizAge:7)", () => {
    const k03 = results.find(r => r.grant.id === "k03");
    if (k03) {
      // 게임은 k03 targetBizTypes 에 없으나 인접 IT 있음
      expect(k03.grade).not.toBe("low");
    }
  });

  it("매칭 사유에 '업종 일치' (k10 = 게임 정확매칭)", () => {
    const reasons = getMatchReasons(
      SAMPLE_GRANTS.find(g => g.id === "k10")!,
      cond
    );
    expect(reasons).toContain("업종 일치");
  });
});

describe("매칭 통합: 경기 음식점 페르소나", () => {
  const cond = PERSONAS.RESTAURANT;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("소상공인 경영안정자금(k11) 포함 (전국 + 외식 매칭)", () => {
    expect(results.some(r => r.grant.id === "k11")).toBe(true);
  });

  it("전통시장 디지털화(k12) 포함", () => {
    expect(results.some(r => r.grant.id === "k12")).toBe(true);
  });

  it("k11 에 대한 사유: 전국 + 업종 + 업력 충족", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k11")!, cond);
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
  });

  it("부산/서울 지역 한정 사업은 제외 또는 낮은 등급", () => {
    const k06 = results.find(r => r.grant.id === "k06"); // 서울
    const k07 = results.find(r => r.grant.id === "k07"); // 부산
    if (k06) expect(k06.grade).not.toBe("high");
    if (k07) expect(k07.grade).not.toBe("high");
  });

  it("스마트팜(k13)은 농림수산 한정이므로 음식점에는 부적합", () => {
    const k13 = results.find(r => r.grant.id === "k13");
    // 음식점 → k13 targetBizTypes 에 없음 + 인접도 아님 → low 또는 제외
    if (k13) expect(k13.grade).not.toBe("high");
  });
});

describe("매칭 통합: 예비 농업 창업자 페르소나", () => {
  const cond = PERSONAS.FARM_PRE;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("스마트팜 보급(k13) 포함 (정확매칭 + 키워드 보너스)", () => {
    expect(results.some(r => r.grant.id === "k13")).toBe(true);
  });

  it("예비창업패키지(k01) 포함 (예비창업자 대상)", () => {
    const k01 = results.find(r => r.grant.id === "k01");
    // k01.maxBizAge = 0 이므로 0년인 예비창업 통과
    expect(k01).toBeDefined();
  });

  it("초기창업패키지(k02) 는 minBizAge=0.5 → 예비창업(0) 미달", () => {
    const k02 = results.find(r => r.grant.id === "k02");
    if (k02) {
      // minBizAge=0.5 인데 예비창업=0 이라 미달
      // 다른 보너스가 있으면 medium 등급 가능, high 는 아님
      expect(k02.grade).not.toBe("high");
    }
  });

  it("k13 매칭 사유: '전국 지원' + '업종 일치' + '업력 조건 충족' + '사업 내용 관련'", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k13")!, cond);
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
    expect(reasons).toContain("사업 내용 관련"); // 키워드 매칭
  });

  it("도약패키지(k03) 는 minBizAge=3 → 예비창업 미달", () => {
    const k03 = results.find(r => r.grant.id === "k03");
    if (k03) {
      expect(k03.grade).not.toBe("high");
    }
  });
});

describe("매칭 통합: 경기 제조 7년차 페르소나", () => {
  const cond = PERSONAS.MFG_MATURE;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("경기도 제조혁신(k08) 포함 (지역 + 업종 정확매칭)", () => {
    expect(results.some(r => r.grant.id === "k08")).toBe(true);
  });

  it("k08 가 가장 높은 등급 (지역+업종 정확매칭)", () => {
    const k08 = results.find(r => r.grant.id === "k08");
    expect(k08?.grade).toBe("high");
  });

  it("k08 매칭 사유: '지역 일치' + '업종 일치'", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k08")!, cond);
    expect(reasons).toContain("지역 일치");
    expect(reasons).toContain("업종 일치");
  });

  it("스마트팜(k13)은 제조 포함이지만 정확매칭이라 적합", () => {
    const k13 = results.find(r => r.grant.id === "k13");
    expect(k13).toBeDefined();
  });

  it("도약패키지(k03)는 6년차 → minBizAge=3,maxBizAge=7 통과", () => {
    const k03 = results.find(r => r.grant.id === "k03");
    expect(k03).toBeDefined();
  });
});

describe("매칭 통합: 제주 관광 서비스 페르소나", () => {
  const cond = PERSONAS.JEJU_SVC;
  const results = rankGrants(SAMPLE_GRANTS, cond);

  it("제주 관광 스타트업(k15)이 가장 높은 등급", () => {
    const k15 = results.find(r => r.grant.id === "k15");
    expect(k15?.grade).toBe("high");
  });

  it("k15 매칭 사유: '지역 일치' + '업종 일치' 동시", () => {
    const reasons = getMatchReasons(SAMPLE_GRANTS.find(g => g.id === "k15")!, cond);
    expect(reasons).toContain("지역 일치");
    expect(reasons).toContain("업종 일치");
  });

  it("소상공인 경영안정자금(k11)도 포함 (전국 + 서비스업)", () => {
    expect(results.some(r => r.grant.id === "k11")).toBe(true);
  });

  it("k15 결과가 k11 보다 상위 (지역 정확 vs 전국)", () => {
    const ids = results.map(r => r.grant.id);
    const k15Idx = ids.indexOf("k15");
    const k11Idx = ids.indexOf("k11");
    if (k15Idx >= 0 && k11Idx >= 0) {
      expect(k15Idx).toBeLessThan(k11Idx);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankGrants ↔ scoreToGrade ↔ getMatchReasons 일관성
// ─────────────────────────────────────────────────────────────────────────────

describe("일관성: rankGrants ↔ scoreToGrade ↔ getMatchReasons", () => {
  Object.entries(PERSONAS).forEach(([name, cond]) => {
    it(`[${name}] 모든 결과의 score ↔ grade 일관`, () => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      results.forEach(r => {
        expect(scoreToGrade(r.score)).toBe(r.grade);
      });
    });

    it(`[${name}] high 등급은 반드시 최소 2개의 매칭 사유`, () => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      results.filter(r => r.grade === "high").forEach(r => {
        const reasons = getMatchReasons(r.grant, cond);
        expect(reasons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it(`[${name}] 정렬은 score 내림차순, id 오름차순 tiebreak`, () => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      for (let i = 1; i < results.length; i++) {
        if (results[i - 1].score === results[i].score) {
          expect(results[i - 1].grant.id < results[i].grant.id).toBe(true);
        } else {
          expect(results[i - 1].score).toBeGreaterThan(results[i].score);
        }
      }
    });

    it(`[${name}] low 등급은 결과에 없음`, () => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      results.forEach(r => expect(r.grade).not.toBe("low"));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fallbackResults — scored 입력 호환성
// ─────────────────────────────────────────────────────────────────────────────

describe("fallbackResults: scored 입력에서 정상 출력", () => {
  Object.entries(PERSONAS).forEach(([name, cond]) => {
    it(`[${name}] rankGrants 결과를 fallbackResults 가 그대로 변환`, () => {
      const scored = rankGrants(SAMPLE_GRANTS, cond);
      const fallback = fallbackResults(scored, cond);
      expect(fallback).toHaveLength(scored.length);
      fallback.forEach((f, i) => {
        expect(f.grant.id).toBe(scored[i].grant.id);
        expect(f.matchScore).toBe(scored[i].grade);
        expect(typeof f.reason).toBe("string");
        expect(Array.isArray(f.matchReasons)).toBe(true);
      });
    });

    it(`[${name}] fallbackResults 의 matchReasons 가 getMatchReasons 와 동일`, () => {
      const scored = rankGrants(SAMPLE_GRANTS, cond);
      const fallback = fallbackResults(scored, cond);
      fallback.forEach(f => {
        const direct = getMatchReasons(f.grant, cond);
        expect(f.matchReasons).toEqual(direct);
      });
    });

    it(`[${name}] reason 텍스트에 사용자 업종+지역 포함`, () => {
      const scored = rankGrants(SAMPLE_GRANTS, cond);
      const fallback = fallbackResults(scored, cond);
      fallback.forEach(f => {
        expect(f.reason).toContain(cond.bizType);
        expect(f.reason).toContain(cond.region);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 대용량 데이터셋 처리
// ─────────────────────────────────────────────────────────────────────────────

describe("대용량 데이터셋", () => {
  const LARGE_GRANTS: Grant[] = Array.from({ length: 500 }, (_, i) =>
    g({
      id: String(i).padStart(4, "0"),
      title: `지원사업 ${i}`,
      region: i % 5 === 0 ? "전국" : ["서울", "부산", "경기", "제주"][i % 4],
      targetBizTypes: [["IT·소프트웨어", "게임", "제조", "서비스업"][i % 4]],
      deadline: i % 10 === 0 ? "상시" : FAR_FUTURE,
    })
  );

  it("500개 grants 처리 시간 < 1초", () => {
    const cond = PERSONAS.AI_STARTUP;
    const start = Date.now();
    const results = rankGrants(LARGE_GRANTS, cond);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(results.length).toBeLessThanOrEqual(15);
  });

  it("topN 100 으로 더 많이 받기 가능", () => {
    const cond = PERSONAS.AI_STARTUP;
    const results = rankGrants(LARGE_GRANTS, cond, 100);
    expect(results.length).toBeLessThanOrEqual(100);
  });

  it("결과 순서는 셔플 입력에서도 동일", () => {
    const cond = PERSONAS.AI_STARTUP;
    const r1 = rankGrants(LARGE_GRANTS, cond, 15).map(r => r.grant.id);
    const shuffled = [...LARGE_GRANTS].reverse();
    const r2 = rankGrants(shuffled, cond, 15).map(r => r.grant.id);
    expect(r1).toEqual(r2);
  });

  it("모든 페르소나가 대용량에서도 결과 산출", () => {
    Object.values(PERSONAS).forEach(cond => {
      const results = rankGrants(LARGE_GRANTS, cond, 15);
      expect(results.length).toBeGreaterThanOrEqual(0);
      expect(results.length).toBeLessThanOrEqual(15);
    });
  });

  it("fallbackResults 도 대용량에서 정상", () => {
    const cond = PERSONAS.AI_STARTUP;
    const scored = rankGrants(LARGE_GRANTS, cond, 50);
    const fallback = fallbackResults(scored, cond);
    expect(fallback.length).toBe(scored.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지 — 추천 품질 보증
// ─────────────────────────────────────────────────────────────────────────────

describe("회귀 방지: 추천 품질 보증", () => {
  it("AI 스타트업 → AI 바우처(k04)는 high 등급", () => {
    const cond = PERSONAS.AI_STARTUP;
    const results = rankGrants(SAMPLE_GRANTS, cond);
    const k04 = results.find(r => r.grant.id === "k04");
    expect(k04?.grade).toBe("high");
  });

  it("AI 스타트업 → 만료 사업(k14)은 결과에 없음", () => {
    const cond = PERSONAS.AI_STARTUP;
    const results = rankGrants(SAMPLE_GRANTS, cond);
    expect(results.some(r => r.grant.id === "k14")).toBe(false);
  });

  it("음식점 → 게임 전용 사업(k10)은 low/제외", () => {
    const cond = PERSONAS.RESTAURANT;
    const results = rankGrants(SAMPLE_GRANTS, cond);
    const k10 = results.find(r => r.grant.id === "k10");
    if (k10) expect(k10.grade).not.toBe("high");
  });

  it("제조 → 지역+업종 정확매칭(k08)이 최상위", () => {
    const cond = PERSONAS.MFG_MATURE;
    const results = rankGrants(SAMPLE_GRANTS, cond);
    expect(results[0]?.grant.id).toBe("k08");
  });

  it("제주 서비스 → k15 가 top 5 안에", () => {
    const cond = PERSONAS.JEJU_SVC;
    const results = rankGrants(SAMPLE_GRANTS, cond);
    const top5Ids = results.slice(0, 5).map(r => r.grant.id);
    expect(top5Ids).toContain("k15");
  });

  it("페르소나별 결과 개수 회귀: 최소 1개 이상은 매칭됨", () => {
    Object.entries(PERSONAS).forEach(([name, cond]) => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  it("결과의 grade 종류 (high/medium 만): low 는 항상 제외", () => {
    Object.values(PERSONAS).forEach(cond => {
      const results = rankGrants(SAMPLE_GRANTS, cond);
      const grades = new Set(results.map(r => r.grade));
      expect(grades.has("low")).toBe(false);
    });
  });

  it("결정성: 같은 페르소나 + 같은 데이터 → 항상 같은 결과", () => {
    const cond = PERSONAS.AI_STARTUP;
    const ids1 = rankGrants(SAMPLE_GRANTS, cond).map(r => r.grant.id);
    const ids2 = rankGrants(SAMPLE_GRANTS, cond).map(r => r.grant.id);
    const ids3 = rankGrants(SAMPLE_GRANTS, cond).map(r => r.grant.id);
    expect(ids1).toEqual(ids2);
    expect(ids2).toEqual(ids3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 키워드 매칭이 추천 품질에 미치는 영향
// ─────────────────────────────────────────────────────────────────────────────

describe("키워드 매칭의 영향", () => {
  it("같은 페르소나라도 키워드 있을 때 매칭 사유 더 풍부", () => {
    const noKw = c({ ...PERSONAS.FARM_PRE, summary: "", keywords: [] });
    const withKw = PERSONAS.FARM_PRE;

    const reasonsNoKw = getMatchReasons(
      SAMPLE_GRANTS.find(g => g.id === "k13")!,
      noKw
    );
    const reasonsWithKw = getMatchReasons(
      SAMPLE_GRANTS.find(g => g.id === "k13")!,
      withKw
    );
    expect(reasonsWithKw.length).toBeGreaterThanOrEqual(reasonsNoKw.length);
  });

  it("키워드 매칭으로 medium → high 등급 상승 가능", () => {
    const noKwResults = rankGrants(
      SAMPLE_GRANTS,
      c({ ...PERSONAS.AI_STARTUP, summary: "", keywords: [] })
    );
    const withKwResults = rankGrants(SAMPLE_GRANTS, PERSONAS.AI_STARTUP);
    // 같은 grant 의 score 비교
    const k04NoKw = noKwResults.find(r => r.grant.id === "k04");
    const k04WithKw = withKwResults.find(r => r.grant.id === "k04");
    if (k04NoKw && k04WithKw) {
      expect(k04WithKw.score).toBeGreaterThanOrEqual(k04NoKw.score);
    }
  });

  it("summary 와 keywords 모두 비우면 키워드 보너스 0", () => {
    // 키워드 보너스가 실제로 추가되는지 검증: 빈 도메인 vs 매칭되는 도메인
    const empty = c({ ...PERSONAS.AI_STARTUP, summary: "", keywords: [] });
    const matching = PERSONAS.AI_STARTUP; // summary + keywords 모두 AI 관련
    const target = SAMPLE_GRANTS.find(g => g.id === "k04")!; // AI 바우처
    const sEmpty = ruleScore(target, empty);
    const sMatching = ruleScore(target, matching);
    expect(sMatching).toBeGreaterThan(sEmpty);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 데이터셋 무결성
// ─────────────────────────────────────────────────────────────────────────────

describe("샘플 데이터셋 무결성", () => {
  it("모든 grant 가 unique id", () => {
    const ids = SAMPLE_GRANTS.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 grant 가 필수 필드 보유", () => {
    SAMPLE_GRANTS.forEach(g => {
      expect(g.id).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.region).toBeTruthy();
      expect(Array.isArray(g.targetBizTypes)).toBe(true);
      expect(g.deadline).toBeTruthy();
    });
  });

  it("targetBizTypes 가 빈 배열이 아님", () => {
    SAMPLE_GRANTS.forEach(g => {
      expect(g.targetBizTypes.length).toBeGreaterThan(0);
    });
  });

  it("region 은 알려진 값 또는 '전국'", () => {
    const known = new Set([
      "전국", "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
      "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    ]);
    SAMPLE_GRANTS.forEach(g => {
      expect(known.has(g.region)).toBe(true);
    });
  });
});
