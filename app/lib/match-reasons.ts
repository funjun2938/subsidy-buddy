import { Grant, UserCondition } from "./types";

function parseBizAge(bizAge: string): number {
  if (bizAge.includes("예비")) return 0;
  if (bizAge.includes("1년 미만")) return 0.5;
  if (bizAge.includes("1~3")) return 2;
  if (bizAge.includes("3~5")) return 4;
  if (bizAge.includes("5~7")) return 6;
  if (bizAge.includes("7년 이상")) return 8;
  return 3;
}

export function getMatchReasons(grant: Grant, condition: UserCondition): string[] {
  const reasons: string[] = [];

  if (grant.region === "전국") reasons.push("전국 지원");
  else if (grant.region === condition.region) reasons.push("지역 일치");

  if (grant.targetBizTypes.includes(condition.bizType)) reasons.push("업종 일치");

  const bizAgeNum = parseBizAge(condition.bizAge);
  const ageOk =
    (grant.maxBizAge === undefined || bizAgeNum <= grant.maxBizAge) &&
    (grant.minBizAge === undefined || bizAgeNum >= grant.minBizAge);
  if (ageOk) reasons.push("업력 조건 충족");

  const domainText = (condition.summary || "") + " " + (condition.keywords?.join(" ") || "");
  if (domainText.trim()) {
    const grantText = grant.title + " " + grant.description + " " + grant.requirements;
    const stopwords = new Set(["있는","하는","위한","대한","통한","관련","기반","등을","또는","및","의","에","를","을","이","가","은","는"]);
    const domainWords = domainText
      .replace(/[^\w\s가-힣]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopwords.has(w))
      .slice(0, 15);
    const matched = domainWords.filter(w => grantText.toLowerCase().includes(w.toLowerCase())).length;
    if (domainWords.length > 0 && matched / domainWords.length >= 0.2) {
      reasons.push("사업 내용 관련");
    }
  }

  return reasons;
}
