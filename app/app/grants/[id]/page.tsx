"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Grant, GrantAnalysis, UserCondition } from "@/lib/types";
import { getSuccessRate, estimateUserRate, SuccessRateData } from "@/lib/success-rates";
import Link from "next/link";

const elig = {
  high: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "합격 가능성 높음", icon: "✅" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "검토 필요", icon: "⚠️" },
  low: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "요건 미충족", icon: "❌" },
};

// 공고 상세페이지 URL — 서버 리다이렉트 API를 통해 기업마당 정확한 게시글로 이동
function getBestUrl(grant: Grant): string {
  const url = grant.url || "";
  // 기업마당 상세페이지 URL이면 그대로 사용 (크롤러에서 가져온 데이터)
  if (url.includes("bizinfo.go.kr") && url.includes("pblancId")) return url;
  // 그 외: 서버에서 기업마당 API 검색 → 정확한 상세 페이지로 리다이렉트
  const params = new URLSearchParams({
    title: grant.title,
    fallback: url || "https://www.bizinfo.go.kr",
  });
  return `/api/grant-redirect?${params.toString()}`;
}

function Content() {
  const params = useParams();
  const sp = useSearchParams();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [analysis, setAnalysis] = useState<GrantAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const qs = new URLSearchParams(sp.toString());
      qs.set("id", params.id as string);
      const res = await fetch(`/api/grants?${qs.toString()}`);
      const data = await res.json();
      setGrant(data.grant);
      setAnalysis(data.analysis);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-14 h-14 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-b-violet-400/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
      </div>
      <p className="text-gray-400 text-sm">AI가 자격 요건을 상세 분석 중...</p>
    </div>
  );

  if (!grant) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-4xl mb-4">😔</div>
      <p className="text-gray-400">지원사업을 찾을 수 없습니다</p>
    </div>
  );

  const deadline = new Date(grant.deadline);
  const dDay = grant.deadline === "상시" ? "상시" : (() => {
    const d = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
    return d < 0 ? "마감" : d === 0 ? "D-Day" : `D-${d}`;
  })();

  const e = analysis ? elig[analysis.eligibility] : null;

  // Success rate prediction
  const successData = getSuccessRate(grant);
  const userCondition: UserCondition = {
    bizType: sp.get("bizType") || "",
    revenue: sp.get("revenue") || "",
    region: sp.get("region") || "",
    bizAge: sp.get("bizAge") || "",
    ceoAge: sp.get("ceoAge") || "",
    summary: sp.get("summary") || undefined,
  };
  const hasCondition = userCondition.bizType || userCondition.region;
  const estimated = hasCondition
    ? estimateUserRate(successData.avgAcceptRate, userCondition, grant)
    : null;
  const displayRate = estimated ? estimated.rate : successData.avgAcceptRate;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <Link href={`/results?${sp.toString()}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        매칭 결과
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400">{grant.category}</span>
          <span className="text-[11px] text-gray-600">{grant.orgName}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">{grant.title}</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xl font-black text-cyan-400">{grant.amount}</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-lg ${dDay === "마감" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-gray-400"}`}>
            {dDay} <span className="font-normal text-gray-600">({grant.deadline})</span>
          </span>
        </div>
      </div>

      {/* Success Rate Prediction */}
      <div className="glass rounded-2xl border border-cyan-500/10 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-lg">📊</span>
          <h2 className="font-bold">합격률 예측</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-medium">
            {successData.category}
          </span>
        </div>

        {/* Rate bar */}
        <div className="mb-5">
          <div className="flex items-end justify-between mb-2">
            <span className="text-sm text-gray-400">예상 합격률</span>
            <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {displayRate}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${displayRate}%`,
                background: `linear-gradient(90deg, #06b6d4 0%, #8b5cf6 ${Math.max(100, displayRate * 2)}%)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-600">경쟁률 {successData.avgCompetition} (2025년 기준)</span>
            <span className="text-[10px] text-gray-600">
              신청 {successData.totalApplicants2025.toLocaleString()}명 / 선정 {successData.totalSelected2025.toLocaleString()}명
            </span>
          </div>
        </div>

        {/* Factors */}
        {estimated && estimated.factors.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">가산점 요소</h3>
            <div className="space-y-1.5">
              {estimated.factors.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-center">
                    {f.type === "positive" ? "✅" : f.type === "neutral" ? "⚠️" : "❌"}
                  </span>
                  <span className="text-gray-300">{f.name}</span>
                  <span className={`ml-auto text-xs font-medium ${
                    f.type === "positive" ? "text-emerald-400" : f.type === "negative" ? "text-red-400" : "text-gray-500"
                  }`}>
                    ({f.impact})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {successData.tips.length > 0 && (
          <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 mb-3">
            <h3 className="text-[11px] font-semibold text-violet-400 mb-1.5">합격 TIP</h3>
            <ul className="space-y-1">
              {successData.tips.map((tip, i) => (
                <li key={i} className="text-[12px] text-gray-400 flex gap-1.5">
                  <span className="text-violet-400/60 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] text-gray-600 text-center">
          📌 출처: {successData.source} · 통계 기반 추정치이며 실제 결과와 다를 수 있습니다
        </p>
      </div>

      {/* AI Analysis */}
      {analysis && e && (
        <div className={`glass rounded-2xl border ${e.bg} p-6 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{e.icon}</span>
            <h2 className="font-bold">AI 자격 분석</h2>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${e.bg} ${e.color}`}>
              {e.label}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">분석 결과</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{analysis.reason}</p>
            </div>
            {analysis.strategy && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <h3 className="text-xs font-semibold text-emerald-400 mb-1.5">신청 전략</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.strategy}</p>
              </div>
            )}
            {analysis.risks && (
              <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <h3 className="text-xs font-semibold text-orange-400 mb-1.5">주의사항</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.risks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="space-y-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">사업 개요</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{grant.description}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">자격 요건</h3>
          <p className="text-sm text-gray-300 leading-relaxed">{grant.requirements}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-4">
            <div className="text-[11px] text-gray-600 mb-1">지역</div>
            <div className="text-sm font-semibold">{grant.region}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-[11px] text-gray-600 mb-1">대상 업종</div>
            <div className="text-sm font-semibold">{grant.targetBizTypes.join(", ")}</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <a
          href={getBestUrl(grant)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3.5 text-center bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-violet-400 transition-all shadow-lg shadow-cyan-500/20"
        >
          공고 원문 보기 →
        </a>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/generate?${new URLSearchParams({
              grantTitle: grant.title,
              ...(grant.id.startsWith("PBLN_") ? { pblancId: grant.id } : {}),
              ...(sp.get("summary") ? { bizInfo: sp.get("summary")! } : {}),
              ...(sp.get("bizType") ? { bizType: sp.get("bizType")! } : {}),
              ...(sp.get("keywords") ? { keywords: sp.get("keywords")! } : {}),
            }).toString()}`}
            className="block py-3 text-center glass rounded-xl text-sm font-semibold text-violet-400 hover:bg-violet-500/5 transition"
          >
            AI 신청서 생성
          </Link>
          <Link href="/experts" className="block py-3 text-center glass rounded-xl text-sm font-semibold text-pink-400 hover:bg-pink-500/5 transition">
            전문가에게 맡기기
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-gray-600 mt-8 text-center">
        AI 분석은 참고용입니다. 정확한 자격 요건은 공고 원문을 확인하세요.
      </p>
    </div>
  );
}

export default function GrantDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      <Content />
    </Suspense>
  );
}
