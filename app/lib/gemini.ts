import { GoogleGenerativeAI } from "@google/generative-ai";
import { Grant, UserCondition, MatchResult, GrantAnalysis } from "./types";
import { getMatchReasons } from "./match-reasons";

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── 업종 인접 맵 ───
const ADJACENT_BIZ_TYPES: Record<string, string[]> = {
  "IT·소프트웨어": ["서비스업", "제조"],
  "서비스업":      ["IT·소프트웨어", "소매·유통", "교육"],
  "제조":          ["IT·소프트웨어", "농림수산", "건설"],
  "소매·유통":     ["서비스업", "음식점·외식"],
  "음식점·외식":   ["소매·유통", "서비스업"],
  "교육":          ["서비스업"],
  "건설":          ["제조"],
  "농림수산":      ["제조"],
};

// ─── 룰 기반 사전 스코어링 ───
// 설계 원칙:
//  - 업종(bizType)이 1차 필터 — 명확히 다른 업종은 강하게 감점
//  - 도메인 키워드는 보너스만 (패널티 없음) — API 용어 차이로 인한 오탈락 방지
//  - 결과가 항상 동일하도록 동점 시 grant.id 기준 안정 정렬

function ruleScore(grant: Grant, condition: UserCondition): number {
  let score = 0;

  // 1. 지역 (-10 ~ +15)
  if (grant.region === "전국") {
    score += 12;
  } else if (grant.region === condition.region) {
    score += 15;
  } else {
    score -= 10;
  }

  // 2. 업종 (-15 ~ +20) — 핵심 필터
  if (grant.targetBizTypes.includes(condition.bizType)) {
    score += 20; // 정확 일치
  } else if (grant.targetBizTypes.length >= 5) {
    score += 8;  // 사실상 전업종 대상 (5개 이상)
  } else if (grant.targetBizTypes.some(t => (ADJACENT_BIZ_TYPES[condition.bizType] || []).includes(t))) {
    score += 5;  // 인접 업종
  } else if (grant.targetBizTypes.includes("기타")) {
    score += 3;  // 기타만 포함
  } else {
    score -= 15; // 명확히 다른 특정 업종만 타겟
  }

  // 3. 업력 (-15 ~ +10)
  const bizAgeNum = parseBizAge(condition.bizAge);
  if (grant.maxBizAge !== undefined && bizAgeNum > grant.maxBizAge) {
    score -= 15;
  } else if (grant.minBizAge !== undefined && bizAgeNum < grant.minBizAge) {
    score -= 10;
  } else {
    score += 10;
  }

  // 4. 도메인 키워드 — 보너스만 (0 ~ +25), 패널티 없음
  // 이유: 공문서 용어 vs 일반 용어 차이로 무고한 감점 발생 방지
  const domainText = (condition.summary || "") + " " + (condition.keywords?.join(" ") || "");
  if (domainText.trim()) {
    const grantText = grant.title + " " + grant.description + " " + grant.requirements;
    const overlap = calcKeywordOverlap(domainText, grantText);
    if (overlap >= 0.3) {
      score += Math.round(overlap * 25);
    } else if (overlap >= 0.1) {
      score += Math.round(overlap * 15);
    }
    // 미매칭(< 0.1)은 중립 — 업종·지역으로 충분히 필터링됨
  }

  // 5. 마감 (-30 ~ +10)
  if (grant.deadline !== "상시") {
    const daysLeft = Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 30) score += 10;
    else if (daysLeft > 30) score += 5;
    else score -= 30;
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
  const domainWords = extractKeywords(domain);
  if (domainWords.length === 0) return 0;
  const grantLower = grantText.toLowerCase();
  let matched = 0;
  for (const word of domainWords) {
    if (grantLower.includes(word.toLowerCase())) matched++;
  }
  return matched / domainWords.length;
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    "있는", "하는", "위한", "대한", "통한", "관련", "기반", "등을", "또는",
    "및", "의", "에", "를", "을", "이", "가", "은", "는", "으로", "에서",
    "하고", "하여", "있어", "없는", "그리고", "하지만", "그러나",
  ]);
  return text
    .replace(/[^\w\s가-힣]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopwords.has(w))
    .slice(0, 20);
}

// 점수 → 등급
// 업종 정확 일치 + 전국 + 업력 ok + 마감 = 20+12+10+5 = 47 → high
// 업종 인접   + 전국 + 업력 ok + 마감 = 5+12+10+5 = 32 → medium
// 업종 불일치 + 전국 + 업력 ok + 마감 = -15+12+10+5 = 12 → low (필터)
function scoreToGrade(score: number): "high" | "medium" | "low" {
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

// ─── 매칭 메인 함수 ───

export async function matchGrantsWithGemini(
  condition: UserCondition,
  grants: Grant[]
): Promise<MatchResult[]> {
  // 1단계: 룰 기반 스코어링 (완전 결정적)
  const scored = grants
    .slice() // 원본 배열 순서 불변
    .sort((a, b) => a.id.localeCompare(b.id)) // 입력 정렬 안정화
    .map(grant => {
      const score = ruleScore(grant, condition);
      return { grant, score, grade: scoreToGrade(score) };
    })
    .filter(s => s.grade !== "low")
    .sort((a, b) => b.score - a.score || a.grant.id.localeCompare(b.grant.id)) // 동점 시 id로 안정 정렬
    .slice(0, 15);

  if (scored.length === 0) return [];

  // 2단계: AI로 reason만 생성 (temperature=0)
  const genAI = getGemini();
  if (!genAI) {
    return scored.map(s => ({
      grant: s.grant,
      matchScore: s.grade,
      reason: `업종(${condition.bizType})과 지역(${condition.region}) 기준 매칭`,
      matchReasons: getMatchReasons(s.grant, condition),
    }));
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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
      matchReasons: getMatchReasons(s.grant, condition),
    }));
  } catch (error) {
    console.error("[Gemini] Reason generation error:", error);
    return scored.map(s => ({
      grant: s.grant,
      matchScore: s.grade,
      reason: `${condition.bizType} / ${condition.region} 기준 매칭 (점수: ${s.score})`,
      matchReasons: getMatchReasons(s.grant, condition),
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
