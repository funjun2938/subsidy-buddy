import { Grant, UserCondition } from "./types";

// 하이브리드 재랭킹용 LLM 프롬프트. 후보의 자격요건/업종/연관성을 보고
// 사용자 적합도(0~100)와 이유를 산출하도록 지시한다. (gemini/claude 공용)
export function buildRerankPrompt(condition: UserCondition, grants: Grant[]): string {
  const candidates = grants.map((g) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    targetBizTypes: g.targetBizTypes,
    amount: g.amount,
    requirements: (g.requirements || "").slice(0, 350),
  }));

  return `당신은 정부 지원사업 매칭 전문가입니다.
아래 사용자 프로필과 1차로 선별된 후보 지원사업 목록을 보고,
각 후보가 이 사용자에게 실제로 얼마나 적합한지 0~100 점으로 평가하고 한국어 한 문장 이유를 쓰세요.

평가 기준(중요도 순):
1) 자격요건(requirements) 충족 여부 — 명백히 불충족이면 30점 이하.
2) 업종·지역·사업 내용 연관성.
3) 지원 규모·분야 적절성.

[사용자 프로필]
업종: ${condition.bizType}
연 매출: ${condition.revenue}
지역: ${condition.region}
업력: ${condition.bizAge}
대표자 나이: ${condition.ceoAge}
${condition.summary ? `사업 내용: ${condition.summary}` : ""}
${condition.keywords?.length ? `핵심 키워드: ${condition.keywords.join(", ")}` : ""}

[후보 지원사업]
${JSON.stringify(candidates)}

반드시 아래 JSON 배열만 출력 (마크다운/설명 금지):
[{"id":"사업id","fit":0~100 정수,"reason":"적합/부적합 이유 한 문장"}]`;
}

// LLM 응답(JSON 배열)에서 id별 적합도/이유 추출. 실패 시 빈 맵(호출부가 룰 점수로 폴백).
export function parseFits(text: string): {
  fitById: Record<string, number>;
  reasonById: Record<string, string>;
} {
  const fitById: Record<string, number> = {};
  const reasonById: Record<string, string> = {};
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) {
      for (const o of arr) {
        if (o && typeof o.id === "string") {
          if (typeof o.fit === "number" && isFinite(o.fit)) fitById[o.id] = o.fit;
          if (typeof o.reason === "string" && o.reason.trim()) reasonById[o.id] = o.reason;
        }
      }
    }
  } catch {
    /* 파싱 실패 → 빈 맵 */
  }
  return { fitById, reasonById };
}
