import Anthropic from "@anthropic-ai/sdk";
import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";
import { getMatchReasons } from "./match-reasons";
import { rankGrantsWithMinimum, fallbackResults, blendFits } from "./scoring";
import { buildRerankPrompt, parseFits } from "./rerank";

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") return null;
  return new Anthropic({ apiKey });
}

export async function matchGrants(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  // 1단계: 룰 기반 1차 선별 (결정적, 최소 결과 보장)
  const scored = rankGrantsWithMinimum(grants, condition);
  if (scored.length === 0) return [];

  // 2단계: Claude 재랭킹 — 자격요건 vs 프로필 적합도(0~100)+이유 평가
  const anthropic = getAnthropic();
  if (!anthropic) return fallbackResults(scored, condition);

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      temperature: 0,
      messages: [{ role: "user", content: buildRerankPrompt(condition, scored.map(s => s.grant)) }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallbackResults(scored, condition);

    const { fitById, reasonById } = parseFits(content.text);
    const ranked = blendFits(scored, fitById);

    return ranked.map(r => ({
      grant: r.grant,
      matchScore: r.grade,
      reason: reasonById[r.grant.id] || `${condition.bizType} 분야 매칭`,
      matchReasons: getMatchReasons(r.grant, condition),
      fitScore: Math.round(r.blended),
    }));
  } catch (error) {
    console.error("[Claude] Rerank error:", error);
    return fallbackResults(scored, condition);
  }
}

export async function analyzeGrant(
  grant: Grant,
  condition: UserCondition
): Promise<GrantAnalysis> {
  const anthropic = getAnthropic();
  if (!anthropic) {
    return { eligibility: "medium", reason: "AI 분석을 사용할 수 없습니다 (API 키 미설정).", strategy: "", risks: "" };
  }
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: `당신은 정부 지원사업 신청 컨설턴트입니다.

아래 지원사업에 대해 사용자의 자격 요건 충족 여부를 상세 분석해주세요.

[지원사업]
- 사업명: ${grant.title}
- 주관: ${grant.orgName}
- 자격 요건: ${grant.requirements}
- 지원 금액: ${grant.amount}
- 마감일: ${grant.deadline}
- 상세: ${grant.description}

[사용자 조건]
- 업종: ${condition.bizType}
- 연 매출: ${condition.revenue}
- 지역: ${condition.region}
- 업력: ${condition.bizAge}
- 대표자 나이: ${condition.ceoAge}
${condition.summary ? `- 사업 요약: ${condition.summary}` : ""}
${condition.keywords?.length ? `- 핵심 키워드: ${condition.keywords.join(", ")}` : ""}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "eligibility": "high" | "medium" | "low",
  "reason": "자격 충족 여부 상세 분석 (3~5문장)",
  "strategy": "신청 시 유리한 전략 또는 팁 (2~3문장)",
  "risks": "주의 사항 또는 탈락 위험 요소 (1~2문장)"
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return { eligibility: "low", reason: "분석에 실패했습니다.", strategy: "", risks: "" };
  }

  try {
    return JSON.parse(content.text);
  } catch {
    return {
      eligibility: "medium",
      reason: content.text.slice(0, 300),
      strategy: "",
      risks: "",
    };
  }
}
