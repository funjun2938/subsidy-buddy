import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";
import { matchGrants as matchWithClaude, analyzeGrant as analyzeWithClaude } from "./claude";
import { matchGrantsWithGemini, analyzeGrantWithGemini } from "./gemini";

// AI 엔진 선택: Gemini 우선 (무료 티어), Claude 폴백
export async function matchGrantsAI(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  // 1차: Gemini 시도 (무료 할당량 넉넉)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const results = await matchGrantsWithGemini(condition, grants);
      if (results.length > 0) {
        console.log(`[AI] Gemini matched ${results.length} grants`);
        return results;
      }
    } catch (error) {
      console.error("[AI] Gemini failed, falling back to Claude:", error);
    }
  }

  // 2차: Claude 폴백
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    try {
      const results = await matchWithClaude(condition, grants);
      console.log(`[AI] Claude matched ${results.length} grants`);
      return results;
    } catch (error) {
      console.error("[AI] Claude also failed:", error);
    }
  }

  console.error("[AI] No AI engine available");
  return [];
}

export async function analyzeGrantAI(
  grant: Grant,
  condition: UserCondition
): Promise<GrantAnalysis> {
  const fallback: GrantAnalysis = {
    eligibility: "medium",
    reason: "AI 분석을 수행할 수 없습니다. API 키를 확인해주세요.",
    strategy: "",
    risks: "",
  };

  // 1차: Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const result = await analyzeGrantWithGemini(grant, condition);
      if (result) return result;
    } catch (error) {
      console.error("[AI] Gemini analyze failed:", error);
    }
  }

  // 2차: Claude
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    try {
      return await analyzeWithClaude(grant, condition);
    } catch (error) {
      console.error("[AI] Claude analyze failed:", error);
    }
  }

  return fallback;
}
