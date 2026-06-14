import { Grant, UserCondition } from "./types";
import { getMatchReasons } from "./match-reasons";

const ADJACENT_BIZ_TYPES: Record<string, string[]> = {
  "게임":           ["IT·소프트웨어", "웹툰·만화", "콘텐츠·미디어"],
  "웹툰·만화":      ["게임", "영상·방송", "콘텐츠·미디어"],
  "영상·방송":      ["웹툰·만화", "음악", "콘텐츠·미디어"],
  "음악":           ["영상·방송", "공연·예술", "콘텐츠·미디어"],
  "공연·예술":      ["음악", "콘텐츠·미디어"],
  "콘텐츠·미디어":  ["게임", "웹툰·만화", "영상·방송", "음악"],
  "IT·소프트웨어":  ["서비스업", "제조", "게임"],
  "바이오·헬스케어":["제조", "서비스업"],
  "서비스업":       ["IT·소프트웨어", "소매·유통", "교육"],
  "제조":           ["IT·소프트웨어", "농림수산", "건설", "바이오·헬스케어"],
  "소매·유통":      ["서비스업", "음식점·외식", "패션·뷰티"],
  "음식점·외식":    ["소매·유통", "서비스업"],
  "교육":           ["서비스업"],
  "패션·뷰티":      ["소매·유통", "서비스업"],
  "건설":           ["제조"],
  "농림수산":       ["제조", "환경·에너지"],
  "환경·에너지":    ["제조", "농림수산"],
};

function parseBizAge(bizAge: string): number {
  if (bizAge.includes("예비")) return 0;
  if (bizAge.includes("1년 미만")) return 0.5;
  if (bizAge.includes("1~3")) return 2;
  if (bizAge.includes("3~5")) return 4;
  if (bizAge.includes("5~7")) return 6;
  if (bizAge.includes("7년 이상")) return 8;
  return 3;
}

// 사용자 매출 구간 문자열 → 대략적인 원(₩) 상한 추정. 알 수 없으면 null.
function parseRevenue(revenue: string): number | null {
  if (!revenue) return null;
  if (revenue.includes("없음")) return 0;
  if (revenue.includes("이상")) return Number.MAX_SAFE_INTEGER; // 상한 없는 큰 매출
  const eok = [...revenue.matchAll(/(\d+(?:\.\d+)?)\s*억/g)].map((m) => parseFloat(m[1]));
  if (eok.length) return Math.round(Math.max(...eok) * 100_000_000);
  const man = [...revenue.matchAll(/(\d+(?:\.\d+)?)\s*만/g)].map((m) => parseFloat(m[1]));
  if (man.length) return Math.round(Math.max(...man) * 10_000);
  return null;
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

export function ruleScore(grant: Grant, condition: UserCondition): number {
  let score = 0;

  // 지역 (-10 ~ +15)
  if (grant.region === "전국") {
    score += 12;
  } else if (grant.region === condition.region) {
    score += 15;
  } else {
    score -= 10;
  }

  // 업종 (-15 ~ +20)
  if (grant.targetBizTypes.includes(condition.bizType)) {
    score += 20;
  } else if (grant.targetBizTypes.length >= 5) {
    score += 8;
  } else if (grant.targetBizTypes.some(t => (ADJACENT_BIZ_TYPES[condition.bizType] || []).includes(t))) {
    score += 5;
  } else if (grant.targetBizTypes.includes("기타")) {
    score += 3;
  } else {
    score -= 15;
  }

  // 업력 (-15 ~ +10)
  const bizAgeNum = parseBizAge(condition.bizAge);
  if (grant.maxBizAge !== undefined && bizAgeNum > grant.maxBizAge) {
    score -= 15;
  } else if (grant.minBizAge !== undefined && bizAgeNum < grant.minBizAge) {
    score -= 10;
  } else {
    score += 10;
  }

  // 매출 요건 (grant.maxRevenue 가 있을 때만 적용; 없으면 기존 동작 유지)
  if (grant.maxRevenue !== undefined) {
    const rev = parseRevenue(condition.revenue);
    if (rev !== null) {
      if (rev <= grant.maxRevenue) score += 8;   // 매출 요건 충족
      else score -= 20;                            // 매출 상한 초과 → 사실상 부적격
    }
  }

  // 도메인 키워드 보너스 (0 ~ +25)
  const domainText = (condition.summary || "") + " " + (condition.keywords?.join(" ") || "");
  if (domainText.trim()) {
    const grantText = grant.title + " " + grant.description + " " + grant.requirements;
    const overlap = calcKeywordOverlap(domainText, grantText);
    if (overlap >= 0.3) {
      score += Math.round(overlap * 25);
    } else if (overlap >= 0.1) {
      score += Math.round(overlap * 15);
    }
  }

  // 마감 (-30 ~ +10)
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

export function scoreToGrade(score: number): "high" | "medium" | "low" {
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export interface ScoredGrant {
  grant: Grant;
  score: number;
  grade: "high" | "medium" | "low";
}

/**
 * Pure rule-based ranking: fully deterministic.
 * Sorts by score DESC, ties broken by grant.id ASC.
 * AI engines should use this for ordering and only generate reasons.
 */
export function rankGrants(grants: Grant[], condition: UserCondition, topN = 15): ScoredGrant[] {
  return grants
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))  // stable input order
    .map(grant => { const score = ruleScore(grant, condition); return { grant, score, grade: scoreToGrade(score) }; })
    .filter(s => s.grade !== "low")
    .sort((a, b) => b.score - a.score || a.grant.id.localeCompare(b.grant.id))
    .slice(0, topN);
}

/**
 * Like rankGrants, but guarantees at least `minimum` results when the input is
 * non-empty. When the high/medium filter would leave fewer than `minimum`
 * matches, falls back to the top-scoring grants regardless of grade.
 *
 * Fixes interview feedback: "간헐적으로 결과가 아예 안 나오는 케이스" — a user with
 * a non-empty grant pool should always see at least a few candidates rather
 * than an empty results page. `rankGrants` stays pure (returns [] for all-low)
 * so its tested contract is unchanged; the minimum guarantee lives here, at the
 * matching-engine call site.
 */
export function rankGrantsWithMinimum(
  grants: Grant[],
  condition: UserCondition,
  topN = 15,
  minimum = 3,
): ScoredGrant[] {
  const ranked = rankGrants(grants, condition, topN);
  if (grants.length === 0 || topN <= 0 || ranked.length >= minimum) return ranked;

  // Fall back: top `minimum` by score, ignoring the "low" grade filter.
  return grants
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id)) // stable input order
    .map(grant => { const score = ruleScore(grant, condition); return { grant, score, grade: scoreToGrade(score) }; })
    .sort((a, b) => b.score - a.score || a.grant.id.localeCompare(b.grant.id))
    .slice(0, Math.min(minimum, topN));
}

export function fallbackResults(scored: ScoredGrant[], condition: UserCondition) {
  return scored.map(s => ({
    grant: s.grant,
    matchScore: s.grade,
    reason: `업종(${condition.bizType})과 지역(${condition.region}) 기준 매칭`,
    matchReasons: getMatchReasons(s.grant, condition),
    fitScore: scoreToFit(s.score),
  }));
}

// ── 하이브리드 재랭킹: 룰 점수 + LLM 적합도(0~100) 블렌딩 ───────────────────
export interface RankedFit { grant: Grant; ruleScore: number; fit: number; blended: number; grade: "high" | "medium" | "low"; }

function blendedToGrade(b: number): "high" | "medium" | "low" {
  return b >= 66 ? "high" : b >= 40 ? "medium" : "low";
}

// 룰 점수(대략 -55~120)를 0~100 으로 단순 변환 (fallback 표시/LLM 미응답 grant 용)
function scoreToFit(score: number): number {
  return Math.min(100, Math.max(0, Math.round(((score + 30) / 130) * 100)));
}

/**
 * 후보(ScoredGrant)에 LLM 적합도(fitById, 0~100)를 결합해 재정렬한다.
 * blended = ruleWeight·(룰점수 정규화) + (1-ruleWeight)·(LLM 적합도).
 * LLM 응답이 없는 grant 는 룰 점수 정규화로 대체. 동점은 id 로 안정 정렬.
 */
export function blendFits(scored: ScoredGrant[], fitById: Record<string, number>, ruleWeight = 0.45): RankedFit[] {
  if (scored.length === 0) return [];
  const vals = scored.map(s => s.score);
  const min = Math.min(...vals), max = Math.max(...vals);
  const norm = (v: number) => (max === min ? 60 : ((v - min) / (max - min)) * 100);
  return scored
    .map(s => {
      const rn = norm(s.score);
      const raw = fitById[s.grant.id];
      const fit = typeof raw === "number" && isFinite(raw) ? Math.min(100, Math.max(0, raw)) : rn;
      const blended = ruleWeight * rn + (1 - ruleWeight) * fit;
      return { grant: s.grant, ruleScore: s.score, fit, blended, grade: blendedToGrade(blended) };
    })
    .sort((a, b) => b.blended - a.blended || a.grant.id.localeCompare(b.grant.id));
}
