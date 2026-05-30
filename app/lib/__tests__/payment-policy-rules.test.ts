import { describe, it, expect } from "vitest";
import { PLANS } from "@/lib/payment-plans";

/**
 * 결제 정책 규칙 — 비즈니스 룰을 코드로 잠금.
 *
 * 가격, 기능 묶음, 명명 컨벤션 등 회의에서 결정한 룰을 테스트로 강제.
 */

describe("정책: 무료 → 프리미엄 → 비즈니스 업그레이드 사다리", () => {
  it("프리미엄 가격은 1만원 미만 (구매 결심 진입 장벽 낮춤)", () => {
    expect(PLANS.premium.price).toBeLessThan(10_000);
  });

  it("비즈니스 가격은 5만원 미만 (소상공인 부담)", () => {
    expect(PLANS.business.price).toBeLessThan(50_000);
  });

  it("프리미엄과 비즈니스 가격 차이는 4배 이상 (명확한 차등)", () => {
    expect(PLANS.business.price / PLANS.premium.price).toBeGreaterThanOrEqual(4);
  });

  it("비즈니스는 프리미엄 기능을 모두 포함한다고 명시", () => {
    expect(PLANS.business.features).toContain("프리미엄 전체 기능 포함");
  });

  it("비즈니스에는 신청 대행 수수료 할인 명시", () => {
    expect(
      PLANS.business.features.some((f) => f.includes("신청 대행 수수료")),
    ).toBe(true);
  });
});

describe("정책: 프리미엄 핵심 약속", () => {
  it("'무제한' 매칭 명시", () => {
    expect(PLANS.premium.features).toContain("AI 지원사업 매칭 무제한");
  });

  it("'전체' 결과 열람 명시 (3건 제한 해제)", () => {
    expect(PLANS.premium.features).toContain("전체 매칭 결과 보기");
  });

  it("월 신청서 생성 수량 명시", () => {
    expect(PLANS.premium.features).toContain("AI 신청서 생성 월 3건");
  });

  it("마감 알림 단계 명시 (D-7, D-3, D-1)", () => {
    expect(PLANS.premium.features).toContain("마감 알림 (D-7, D-3, D-1)");
  });

  it("전문가 매칭 할인율 명시", () => {
    expect(PLANS.premium.features).toContain("전문가 매칭 10% 할인");
  });
});

describe("정책: 비즈니스 핵심 약속", () => {
  it("프리미엄 포함", () => {
    expect(PLANS.business.features[0]).toContain("프리미엄 전체");
  });

  it("신청서 무제한", () => {
    expect(
      PLANS.business.features.some((f) => f.includes("무제한")),
    ).toBe(true);
  });

  it("1:1 전문가 배정", () => {
    expect(PLANS.business.features).toContain("전문가 1:1 전담 배정");
  });

  it("수수료 50% 할인", () => {
    expect(PLANS.business.features).toContain("신청 대행 수수료 50% 할인");
  });

  it("합격률 리포트 제공", () => {
    expect(PLANS.business.features).toContain("합격률 분석 리포트");
  });
});

describe("정책: 전문가 (단건) 약속", () => {
  it("단건 결제 (구독 아님)", () => {
    expect(PLANS.expert.type).toBe("single");
  });

  it("성공 수수료 명시 (10~15%)", () => {
    const fee = PLANS.expert.features.find((f) => /\d+~\d+%/.test(f));
    expect(fee).toBeDefined();
    expect(fee).toContain("10~15%");
  });

  it("1:1 배정 명시", () => {
    expect(PLANS.expert.features).toContain("1:1 전문가 배정");
  });

  it("서류 검토 명시", () => {
    expect(PLANS.expert.features).toContain("서류 검토 및 보완");
  });

  it("직접 제출 명시", () => {
    expect(PLANS.expert.features).toContain("신청서 직접 제출");
  });
});

describe("정책: 명명 규칙", () => {
  it("모든 플랜 이름이 명사형으로 끝남", () => {
    Object.values(PLANS).forEach((plan) => {
      // 멤버십 or 신청 대행
      expect(/멤버십$|대행$/.test(plan.name)).toBe(true);
    });
  });

  it("모든 description은 마침표 없이 끝", () => {
    Object.values(PLANS).forEach((plan) => {
      expect(plan.description.endsWith(".")).toBe(false);
    });
  });

  it("모든 feature는 마침표 없이 끝", () => {
    Object.values(PLANS).forEach((plan) => {
      plan.features.forEach((f) => {
        expect(f.endsWith(".")).toBe(false);
      });
    });
  });

  it("어떤 feature도 '미정' / 'TBD' 같은 placeholder 포함 안 함", () => {
    const placeholders = ["미정", "TBD", "TODO", "PLACEHOLDER", "준비중", "추후"];
    Object.values(PLANS).forEach((plan) => {
      plan.features.forEach((f) => {
        placeholders.forEach((p) => {
          expect(f).not.toContain(p);
        });
      });
    });
  });

  it("description에 placeholder 없음", () => {
    const placeholders = ["미정", "TBD", "TODO", "PLACEHOLDER"];
    Object.values(PLANS).forEach((plan) => {
      placeholders.forEach((p) => {
        expect(plan.description).not.toContain(p);
      });
    });
  });
});

describe("정책: 비용 계산", () => {
  it("프리미엄 연간 = 9,900 * 12 = 118,800", () => {
    const yearly = PLANS.premium.price * 12;
    expect(yearly).toBe(118_800);
  });

  it("비즈니스 연간 = 49,000 * 12 = 588,000", () => {
    const yearly = PLANS.business.price * 12;
    expect(yearly).toBe(588_000);
  });

  it("비즈니스 연간은 프리미엄 연간의 약 5배", () => {
    const ratio =
      (PLANS.business.price * 12) / (PLANS.premium.price * 12);
    expect(ratio).toBeCloseTo(4.95, 1);
  });

  it("프리미엄 분당 비용 = 약 0.23원/분 (한 달 30일 기준)", () => {
    const perMin = PLANS.premium.price / (30 * 24 * 60);
    expect(perMin).toBeLessThan(0.5);
  });
});

describe("정책: 시장 비교 (간접 회귀 가드)", () => {
  it("프리미엄은 Spotify/Netflix 한국 가격대(7,900~13,900) 안", () => {
    expect(PLANS.premium.price).toBeGreaterThan(7_900);
    expect(PLANS.premium.price).toBeLessThan(13_900);
  });

  it("비즈니스는 SaaS 비즈니스 플랜 일반 가격대(39,000~99,000) 안", () => {
    expect(PLANS.business.price).toBeGreaterThanOrEqual(39_000);
    expect(PLANS.business.price).toBeLessThanOrEqual(99_000);
  });

  it("전문가 (착수금)는 50,000원 미만 (소상공인 진입 부담 최소화)", () => {
    expect(PLANS.expert.price).toBeLessThanOrEqual(50_000);
  });
});

describe("정책: 통합 시나리오 — 사장님 페르소나별 적합 플랜", () => {
  it("매출 1억 카페 사장님 → 프리미엄 추천", () => {
    // 단순 로직: 매출 1억이면 부담스럽지 않은 플랜
    const plan = PLANS.premium;
    expect(plan.price).toBeLessThan(20_000);
  });

  it("매출 5억 학원 사장님 → 비즈니스 추천", () => {
    const plan = PLANS.business;
    expect(plan.price).toBeLessThan(100_000);
    expect(plan.features).toContain("AI 신청서 생성 무제한");
  });

  it("R&D 과제 1회 신청 → 전문가 단건 추천", () => {
    const plan = PLANS.expert;
    expect(plan.type).toBe("single");
    expect(plan.features.some((f) => f.includes("1:1"))).toBe(true);
  });
});

describe("정책: 회귀 시 알림", () => {
  it("플랜 추가 시 PLANS dict에 정확히 3개", () => {
    expect(Object.keys(PLANS).length).toBe(3);
  });

  it("새 type 추가 금지 (subscription/single)", () => {
    const types = new Set(Object.values(PLANS).map((p) => p.type));
    expect(types.size).toBeLessThanOrEqual(2);
    types.forEach((t) => {
      expect(["subscription", "single"]).toContain(t);
    });
  });
});
