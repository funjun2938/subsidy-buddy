export type PlanId = "premium" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  type: "subscription" | "single";
  description: string;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  premium: {
    id: "premium",
    name: "프리미엄 멤버십",
    price: 9900,
    type: "subscription",
    description: "지원사업을 놓치지 않는 월간 구독 플랜",
    features: [
      "AI 지원사업 매칭 무제한",
      "전체 매칭 결과 보기",
      "AI 신청서 생성 월 3건",
      "마감 알림 (D-7, D-3, D-1)",
      "신규 공고 실시간 알림",
    ],
  },
  business: {
    id: "business",
    name: "비즈니스 멤버십",
    price: 49000,
    type: "subscription",
    description: "신청 대행까지 한번에 해결하는 플랜",
    features: [
      "프리미엄 전체 기능 포함",
      "AI 신청서 생성 무제한",
      "신청 대행 수수료 50% 할인",
      "합격률 분석 리포트",
    ],
  },
};

export function getPlan(id: string | undefined): Plan | null {
  if (!id) return null;
  return PLANS[id as PlanId] ?? null;
}

export function generateOrderId(planId: PlanId): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `order_${planId}_${ts}_${rand}`;
}
