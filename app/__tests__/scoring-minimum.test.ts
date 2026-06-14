/**
 * scoring-minimum.test.ts
 *
 * rankGrantsWithMinimum 의 최소 결과 보장 동작 검증.
 * 인터뷰 피드백("간헐적으로 결과가 아예 안 나오는 케이스") 회귀 방지.
 *   - 후보가 있으면 모두 low 등급이어도 최소 N개 반환
 *   - 입력이 비면 빈 배열 (없는 결과를 지어내지 않음)
 *   - high/medium 가 충분하면 rankGrants 와 동일 동작
 *   - 결정성(determinism) 유지
 */

import { describe, it, expect } from "vitest";
import { rankGrants, rankGrantsWithMinimum } from "../lib/scoring";
import type { Grant, UserCondition } from "../lib/types";

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    title: "테스트 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "스타트업 지원 프로그램",
    requirements: "업력 3년 이내",
    url: "https://example.com",
    ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어",
    revenue: "1억 미만",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "30대",
    ...overrides,
  };
}

// 모든 항목이 low 등급으로 떨어지도록 사용자와 완전히 어긋난 조건
function allLowSetup() {
  const condition = makeCondition({ bizType: "IT·소프트웨어", region: "서울" });
  const grants = Array.from({ length: 10 }, (_, i) =>
    makeGrant({
      id: `low-${i}`,
      region: "제주", // 지역 불일치
      targetBizTypes: ["제조"], // 업종 불일치
      description: "전혀 무관한 분야",
      requirements: "무관",
    })
  );
  return { condition, grants };
}

describe("rankGrantsWithMinimum - 최소 결과 보장", () => {
  it("모든 항목이 low 여서 rankGrants 는 빈 배열이지만, 최소 3개를 보장한다", () => {
    const { condition, grants } = allLowSetup();

    // 기존 순수 함수는 빈 배열 (계약 불변)
    expect(rankGrants(grants, condition)).toEqual([]);

    // 최소 보장 함수는 후보가 있으면 3개 반환
    const result = rankGrantsWithMinimum(grants, condition);
    expect(result.length).toBe(3);
  });

  it("입력이 비면 빈 배열 — 결과를 지어내지 않는다", () => {
    expect(rankGrantsWithMinimum([], makeCondition())).toEqual([]);
  });

  it("후보 수가 minimum 보다 적으면 있는 만큼만 반환", () => {
    const condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어" });
    const grants = [
      makeGrant({ id: "low-a", region: "제주", targetBizTypes: ["제조"], description: "무관" }),
    ];
    const result = rankGrantsWithMinimum(grants, condition);
    expect(result.length).toBe(1);
  });

  it("high/medium 매칭이 충분하면 rankGrants 와 동일하게 동작한다", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 8 }, (_, i) =>
      makeGrant({
        id: `hit-${i}`,
        region: "서울",
        targetBizTypes: ["IT·소프트웨어"],
        description: "스타트업 IT 소프트웨어 지원",
      })
    );
    expect(rankGrantsWithMinimum(grants, condition)).toEqual(rankGrants(grants, condition));
  });

  it("topN 이 0 이면 빈 배열 (경계 안전)", () => {
    const { condition, grants } = allLowSetup();
    expect(rankGrantsWithMinimum(grants, condition, 0)).toEqual([]);
  });

  it("결정적(deterministic) — 동일 입력은 동일 순서를 반환한다", () => {
    const { condition, grants } = allLowSetup();
    const a = rankGrantsWithMinimum(grants, condition);
    const b = rankGrantsWithMinimum(grants.slice().reverse(), condition);
    expect(a.map(s => s.grant.id)).toEqual(b.map(s => s.grant.id));
  });
});
