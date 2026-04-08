export interface Grant {
  id: string;
  title: string;
  orgName: string;
  category: string;
  region: string;
  targetBizTypes: string[];
  minBizAge?: number;
  maxBizAge?: number;
  maxRevenue?: number;
  max_employees?: number;
  ceoAgeLimit?: string;
  amount: string;
  deadline: string;
  description: string;
  requirements: string;
  url: string;
}

export interface UserCondition {
  bizType: string;
  revenue: string;
  region: string;
  bizAge: string;
  ceoAge: string;
  summary?: string;   // AI가 분석한 사업 요약 (도메인 정보)
  keywords?: string[]; // AI가 추출한 핵심 키워드
}

export interface MatchResult {
  grant: Grant;
  matchScore: "high" | "medium" | "low";
  reason: string;
}

export interface GrantAnalysis {
  eligibility: "high" | "medium" | "low";
  reason: string;
  strategy: string;
  risks: string;
}

export const BIZ_TYPES = [
  "음식점·외식",
  "소매·유통",
  "제조",
  "IT·소프트웨어",
  "서비스업",
  "교육",
  "건설",
  "농림수산",
  "기타",
] as const;

export const REVENUE_RANGES = [
  "5천만원 미만",
  "5천만~1억",
  "1억~3억",
  "3억~5억",
  "5억~10억",
  "10억 이상",
] as const;

export const REGIONS = [
  "전국",
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const;

export const BIZ_AGES = [
  "예비 창업",
  "1년 미만",
  "1~3년",
  "3~5년",
  "5~7년",
  "7년 이상",
] as const;

export const CEO_AGES = [
  "만 29세 이하",
  "만 30~39세",
  "만 40~49세",
  "만 50~59세",
  "만 60세 이상",
] as const;
