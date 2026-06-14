/**
 * rerank-blend.test.ts
 *
 * 하이브리드 재랭킹 핵심 순수 로직 검증 (SDK 목 불필요 → 안정적).
 *  - parseFits: LLM 응답 파싱 (정상/마크다운/오류/형 변환)
 *  - blendFits: 룰 점수 + LLM 적합도 블렌딩 재정렬 (LLM 점수 반영, 결정성)
 *  - ruleScore: 매출 적합도(grant.maxRevenue) 신규 신호
 */

import { describe, it, expect } from "vitest";
import { parseFits } from "../rerank";
import { blendFits, ruleScore, type ScoredGrant } from "../scoring";
import type { Grant, UserCondition } from "../types";

function g(id: string, over: Partial<Grant> = {}): Grant {
  return {
    id, title: `사업 ${id}`, orgName: "기관", category: "창업", region: "전국",
    targetBizTypes: ["IT·소프트웨어"], amount: "1억", deadline: "상시",
    description: "설명", requirements: "요건", url: "https://e.com", ...over,
  };
}
function cond(over: Partial<UserCondition> = {}): UserCondition {
  return { bizType: "IT·소프트웨어", revenue: "1억 미만", region: "서울", bizAge: "1~3년", ceoAge: "30대", ...over };
}
const sg = (id: string, score: number): ScoredGrant => ({ grant: g(id), score, grade: "medium" });

describe("parseFits", () => {
  it("정상 JSON 배열에서 fit/reason 추출", () => {
    const { fitById, reasonById } = parseFits('[{"id":"A","fit":88,"reason":"적합"},{"id":"B","fit":20,"reason":"부적합"}]');
    expect(fitById).toEqual({ A: 88, B: 20 });
    expect(reasonById.A).toBe("적합");
  });
  it("마크다운 코드블록 감싼 JSON도 파싱", () => {
    const { fitById } = parseFits('```json\n[{"id":"A","fit":50,"reason":"x"}]\n```');
    expect(fitById.A).toBe(50);
  });
  it("잘못된 JSON 이면 빈 맵", () => {
    const { fitById, reasonById } = parseFits("not json {{");
    expect(fitById).toEqual({});
    expect(reasonById).toEqual({});
  });
  it("fit 이 숫자 아니면 무시, reason 만 사용", () => {
    const { fitById, reasonById } = parseFits('[{"id":"A","fit":"높음","reason":"r"}]');
    expect(fitById.A).toBeUndefined();
    expect(reasonById.A).toBe("r");
  });
});

describe("blendFits", () => {
  it("빈 입력은 빈 배열", () => {
    expect(blendFits([], {})).toEqual([]);
  });
  it("LLM 적합도가 순서를 바꾼다 (룰 낮아도 fit 높으면 상위로)", () => {
    const scored = [sg("HI_RULE", 80), sg("LO_RULE", 20)];
    // 룰은 HI_RULE 우위지만, LLM 이 LO_RULE 를 100, HI_RULE 를 0 으로 평가
    const ranked = blendFits(scored, { LO_RULE: 100, HI_RULE: 0 });
    expect(ranked[0].grant.id).toBe("LO_RULE");
  });
  it("LLM 응답 없는 grant 는 룰 점수 정규화로 대체 (순서 유지)", () => {
    const scored = [sg("A", 90), sg("B", 10)];
    const ranked = blendFits(scored, {}); // fit 없음 → 룰 순서
    expect(ranked.map(r => r.grant.id)).toEqual(["A", "B"]);
  });
  it("결정적: 동점은 id 로 안정 정렬", () => {
    const scored = [sg("b", 50), sg("a", 50)];
    const ranked = blendFits(scored, { a: 70, b: 70 });
    expect(ranked.map(r => r.grant.id)).toEqual(["a", "b"]);
  });
  it("blended/grade/fitScore 범위가 유효", () => {
    const ranked = blendFits([sg("A", 60), sg("B", 30)], { A: 95, B: 35 });
    for (const r of ranked) {
      expect(r.blended).toBeGreaterThanOrEqual(0);
      expect(r.blended).toBeLessThanOrEqual(100);
      expect(["high", "medium", "low"]).toContain(r.grade);
    }
    expect(ranked[0].grade).toBe("high"); // A: norm 100 * .45 + 95 * .55 ≈ 97
  });
});

describe("ruleScore - 매출 적합도(maxRevenue)", () => {
  it("maxRevenue 없으면 매출은 점수에 영향 없음", () => {
    const base = ruleScore(g("X"), cond());
    const same = ruleScore(g("X"), cond({ revenue: "100억 이상" }));
    expect(base).toBe(same);
  });
  it("매출이 상한 이내면 가점, 초과면 감점", () => {
    const within = ruleScore(g("X", { maxRevenue: 1_000_000_000 }), cond({ revenue: "1억 미만" }));
    const over = ruleScore(g("X", { maxRevenue: 50_000_000 }), cond({ revenue: "10억 이상" }));
    expect(within).toBeGreaterThan(over);
  });
});
