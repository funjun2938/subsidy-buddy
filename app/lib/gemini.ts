import { GoogleGenerativeAI } from "@google/generative-ai";
import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── 룰 기반 사전 스코어링 (결정적, 매번 동일) ───

function ruleScore(grant: Grant, condition: UserCondition): number {
  let score = 0;

  // 1. 지역 매칭 (0~15점)
  if (grant.region === "전국") {
    score += 12;
  } else if (grant.region === condition.region) {
    score += 15;
  } else {
    score -= 10; // 지역 불일치 감점
  }

  // 2. 업종 매칭 (0~15점)
  if (grant.targetBizTypes.includes(condition.bizType)) {
    score += 15;
  } else if (grant.targetBizTypes.includes("기타")) {
    score += 5;
  } else {
    score -= 5;
  }

  // 3. 업력 매칭 (0~10점)
  const bizAgeNum = parseBizAge(condition.bizAge);
  if (grant.maxBizAge !== undefined && bizAgeNum > grant.maxBizAge) {
    score -= 15; // 업력 초과 → 강한 감점
  } else if (grant.minBizAge !== undefined && bizAgeNum < grant.minBizAge) {
    score -= 10;
  } else {
    score += 10;
  }

  // 4. 도메인 키워드 매칭 — 가장 중요 (최대 50점, 최소 -20점)
  const domainText = (condition.summary || "") + " " + (condition.keywords?.join(" ") || "");
  if (domainText.trim()) {
    const grantText = grant.title + " " + grant.description + " " + grant.requirements;
    const domainScore = calcKeywordOverlap(domainText, grantText);
    if (domainScore >= 0.3) {
      score += Math.round(domainScore * 50); // 키워드 30%+ 매칭 → 보너스
    } else if (domainScore >= 0.1) {
      score += Math.round(domainScore * 20); // 약한 관련성
    } else {
      score -= 20; // 도메인 완전 무관 → 강한 감점
    }
  } else {
    score += 5; // 도메인 정보 없으면 약간 중립
  }

  // 5. 마감 보너스 (0~10점)
  if (grant.deadline !== "상시") {
    const daysLeft = Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 30) score += 10;
    else if (daysLeft > 30) score += 5;
    else score -= 30; // 마감됨
  } else {
    score += 5;
  }

  return score;
}

function parseBizAge(bizAge: string): number {
  if (bizAge.includes("예비")) return 0;
  if (bizAge.includes("1년 미만")) return 0.5;
  if (bizAge.includes("1~3")) return 2;
  if (bizAge.includes("3~5")) return 4;
  if (bizAge.includes("5~7")) return 6;
  if (bizAge.includes("7년 이상")) return 8;
  return 3;
}

function calcKeywordOverlap(domain: string, grantText: string): number {
  // 도메인 텍스트에서 핵심 단어 추출
  const domainWords = extractKeywords(domain);
  if (domainWords.length === 0) return 0.5;

  const grantLower = grantText.toLowerCase();
  let matched = 0;
  for (const word of domainWords) {
    if (grantLower.includes(word.toLowerCase())) matched++;
  }
  return domainWords.length > 0 ? matched / domainWords.length : 0;
}

function extractKeywords(text: string): string[] {
  // 불용어 제거 후 2글자 이상 단어만 추출
  const stopwords = new Set(["있는", "하는", "위한", "대한", "통한", "관련", "기반", "등을", "또는", "및", "의", "에", "를", "을", "이", "가", "은", "는"]);
  return text
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopwords.has(w))
    .slice(0, 15); // 최대 15개
}

function scoreToGrade(score: number): "high" | "medium" | "low" {
  if (score >= 55) return "high";   // 도메인 매칭 필수 (50점 배점)
  if (score >= 30) return "medium";
  return "low";
}

// ─── 매칭 메인 함수 ───

export async function matchGrantsWithGemini(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  // 1단계: 룰 기반 스코어링 (결정적)
  const scored = grants
    .map(grant => ({
      grant,
      score: ruleScore(grant, condition),
      grade: scoreToGrade(ruleScore(grant, condition)),
    }))
    .filter(s => s.grade !== "low")
    .sort((a, b) => b.score - a.score)
    .slice(0, 15); // 상위 15개만 AI에 전달

  if (scored.length === 0) return [];

  // 2단계: AI로 reason만 생성 (temperature=0)
  const genAI = getGemini();
  if (!genAI) {
    // AI 없으면 룰 기반 결과만 반환
    return scored.map(s => ({
      grant: s.grant,
      matchScore: s.grade,
      reason: `업종(${condition.bizType})과 지역(${condition.region}) 기준 매칭`,
    }));
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0 },
  });

  const domainDesc = condition.summary
    ? `사업 내용: ${condition.summary}`
    : "";

  const grantsForAI = scored.map(s => ({
    id: s.grant.id,
    title: s.grant.title,
    grade: s.grade,
    score: s.score,
  }));

  const prompt = `아래 사용자 정보와 이미 룰 기반으로 스코어링된 지원사업 목록이 있습니다.
각 지원사업에 대해 매칭 판정 이유를 한국어 1문장으로 작성해주세요.

[사용자]
업종: ${condition.bizType} / 매출: ${condition.revenue} / 지역: ${condition.region} / 업력: ${condition.bizAge}
${domainDesc}

[스코어링 결과]
${JSON.stringify(grantsForAI)}

반드시 아래 JSON만 응답 (마크다운 없이):
[{"id":"사업id","reason":"판정이유 1문장"}]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const reasons: { id: string; reason: string }[] = JSON.parse(cleaned);
    const reasonMap = new Map(reasons.map(r => [r.id, r.reason]));

    return scored.map(s => ({
      grant: s.grant,
      matchScore: s.grade,
      reason: reasonMap.get(s.grant.id) || `${condition.bizType} 분야 매칭`,
    }));
  } catch (error) {
    console.error("[Gemini] Reason generation error:", error);
    // AI 실패해도 룰 기반 결과 반환
    return scored.map(s => ({
      grant: s.grant,
      matchScore: s.grade,
      reason: `${condition.bizType} / ${condition.region} 기준 매칭 (점수: ${s.score})`,
    }));
  }
}

// ─── 상세 분석 (기존 유지, temperature=0 추가) ───

export async function analyzeGrantWithGemini(
  grant: Grant,
  condition: UserCondition
): Promise<GrantAnalysis | null> {
  const genAI = getGemini();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
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
