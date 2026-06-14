import { GoogleGenerativeAI } from "@google/generative-ai";
import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";
import { getMatchReasons } from "./match-reasons";
import { rankGrantsWithMinimum, fallbackResults, blendFits } from "./scoring";
import { buildRerankPrompt, parseFits } from "./rerank";

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(apiKey);
}

export async function matchGrantsWithGemini(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  // 1단계: 룰 기반 스코어링 (완전 결정적) — 후보가 있으면 최소 결과 보장
  const scored = rankGrantsWithMinimum(grants, condition);
  if (scored.length === 0) return [];

  // 2단계: Gemini 재랭킹 — 자격요건 vs 프로필 적합도(0~100)+이유 평가 (temperature=0)
  const genAI = getGemini();
  if (!genAI) {
    return fallbackResults(scored, condition);
  }

  // 재랭킹은 결정적 JSON 산출 작업 → flash-lite(저지연·저비용)로 충분. 속도 우선.
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  try {
    const result = await model.generateContent(buildRerankPrompt(condition, scored.map(s => s.grant)));
    const { fitById, reasonById } = parseFits(result.response.text());
    const ranked = blendFits(scored, fitById);

    return ranked.map(r => ({
      grant: r.grant,
      matchScore: r.grade,
      reason: reasonById[r.grant.id] || `${condition.bizType} 분야 매칭`,
      matchReasons: getMatchReasons(r.grant, condition),
      fitScore: Math.round(r.blended),
    }));
  } catch (error) {
    console.error("[Gemini] Rerank error:", error);
    return fallbackResults(scored, condition);
  }
}

export async function analyzeGrantWithGemini(
  grant: Grant,
  condition: UserCondition
): Promise<GrantAnalysis | null> {
  const genAI = getGemini();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0 },
  });

  const prompt = `당신은 정부 지원사업 신청 컨설턴트입니다.

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

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON만):
{
  "eligibility": "high" 또는 "medium" 또는 "low",
  "reason": "자격 충족 여부 상세 분석 (3~5문장)",
  "strategy": "신청 시 유리한 전략 또는 팁 (2~3문장)",
  "risks": "주의 사항 또는 탈락 위험 요소 (1~2문장)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("[Gemini] Analyze error:", error);
    return null;
  }
}
