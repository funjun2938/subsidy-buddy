import Anthropic from "@anthropic-ai/sdk";
import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function matchGrants(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  const grantsForPrompt = grants.map((g) => ({
    id: g.id,
    title: g.title,
    orgName: g.orgName,
    category: g.category,
    region: g.region,
    targetBizTypes: g.targetBizTypes,
    minBizAge: g.minBizAge,
    maxBizAge: g.maxBizAge,
    maxRevenue: g.maxRevenue,
    ceoAgeLimit: g.ceoAgeLimit,
    amount: g.amount,
    deadline: g.deadline,
    requirements: g.requirements,
  }));

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `당신은 대한민국 정부 지원사업 매칭 전문가입니다.

아래 사용자 조건과 지원사업 목록을 비교하여, 각 지원사업에 대한 자격 충족 여부를 분석해주세요.

[사용자 조건]
- 업종: ${condition.bizType}
- 연 매출: ${condition.revenue}
- 지역: ${condition.region}
- 업력: ${condition.bizAge}
- 대표자 나이: ${condition.ceoAge}
${condition.summary ? `- 사업 요약: ${condition.summary}` : ""}
${condition.keywords?.length ? `- 핵심 키워드: ${condition.keywords.join(", ")}` : ""}

[지원사업 목록]
${JSON.stringify(grantsForPrompt, null, 2)}

각 지원사업에 대해 분석하고, 매칭 점수가 높은 순서로 정렬해주세요.
사용자의 실제 사업 도메인(업종, 사업 내용)과 지원사업의 대상이 일치하는지를 가장 중요한 기준으로 판단하세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
[
  {
    "grantId": "지원사업 id",
    "matchScore": "high" | "medium" | "low",
    "reason": "매칭 판정 이유 (한국어, 1~2문장)"
  }
]

판정 기준:
- high: 사업 도메인이 지원사업 대상에 부합하고, 자격 요건도 충족
- medium: 일부 요건 충족, 도메인이 간접적으로 관련 있음
- low: 도메인이 무관하거나 주요 요건 미충족`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  try {
    const parsed = JSON.parse(content.text);
    const grantMap = new Map(grants.map((g) => [g.id, g]));

    return parsed
      .filter(
        (m: { grantId: string; matchScore: string }) =>
          grantMap.has(m.grantId) && m.matchScore !== "low"
      )
      .map(
        (m: { grantId: string; matchScore: string; reason: string }) => ({
          grant: grantMap.get(m.grantId)!,
          matchScore: m.matchScore as MatchResult["matchScore"],
          reason: m.reason,
        })
      );
  } catch {
    return [];
  }
}

export async function analyzeGrant(
  grant: Grant,
  condition: UserCondition
): Promise<GrantAnalysis> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
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
    return {
      eligibility: "low",
      reason: "분석에 실패했습니다.",
      strategy: "",
      risks: "",
    };
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
