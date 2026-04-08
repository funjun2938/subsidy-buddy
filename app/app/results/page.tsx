"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { MatchResult } from "@/lib/types";
import GrantCard from "@/components/GrantCard";
import Link from "next/link";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalGrants, setTotalGrants] = useState(0);
  const [source, setSource] = useState("");

  const condition = {
    bizType: searchParams.get("bizType") || "",
    revenue: searchParams.get("revenue") || "",
    region: searchParams.get("region") || "",
    bizAge: searchParams.get("bizAge") || "",
    ceoAge: searchParams.get("ceoAge") || "",
    summary: searchParams.get("summary") || undefined,
    keywords: searchParams.get("keywords")?.split(",").filter(Boolean) || undefined,
  };

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(condition),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else {
          setMatches(data.matches);
          setTotalGrants(data.totalGrants || 0);
          setSource(data.source || "");
        }
      } catch {
        setError("매칭 결과를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paramsString = searchParams.toString();
  const highCount = matches.filter((m) => m.matchScore === "high").length;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      {/* Back + Title */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        다시 검색
      </Link>

      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-2">매칭 결과</h1>
          <div className="flex flex-wrap gap-1.5">
            {[condition.bizType, condition.revenue, condition.region, condition.bizAge, condition.ceoAge].filter(Boolean).map((v) => (
              <span key={v} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 border border-white/5">
                {v}
              </span>
            ))}
            {condition.summary && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                AI 분석 적용
              </span>
            )}
          </div>
        </div>
        {source && (
          <span className={`text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0 ${
            source === "live+seed"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
          }`}>
            {source === "live+seed" ? "Live API" : "Seed"}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-24">
          <div className="relative inline-block mb-6">
            <div className="w-14 h-14 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-b-violet-400/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-gray-300 font-medium">AI가 지원사업을 분석하고 있습니다</p>
          <p className="text-xs text-gray-600 mt-1">약 10~20초 소요</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-24">
          <div className="text-4xl mb-4">😔</div>
          <p className="text-gray-300 mb-4">{error}</p>
          <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-4">다시 시도</Link>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {/* Summary */}
          <div className="glass rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  <strong className="text-white">{totalGrants}개</strong> 지원사업 분석 완료
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {highCount > 0 && <><strong className="text-emerald-400">{highCount}개</strong> 적합도 높음 /</>}
                  {" "}{matches.length}개 매칭
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/generate?${new URLSearchParams({
                    ...(condition.summary ? { bizInfo: condition.summary } : {}),
                    ...(condition.bizType ? { bizType: condition.bizType } : {}),
                    ...(condition.keywords ? { keywords: condition.keywords.join(",") } : {}),
                  }).toString()}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/15 hover:bg-violet-500/20 transition"
                >
                  AI 신청서 생성
                </Link>
                <Link href="/experts" className="text-xs px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/15 hover:bg-pink-500/20 transition">
                  전문가 상담
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {matches.map((m) => (
              <GrantCard key={m.grant.id} match={m} searchParams={paramsString} />
            ))}
          </div>

          {matches.length === 0 && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-300 mb-2">현재 조건에 매칭되는 지원사업이 없습니다</p>
              <p className="text-xs text-gray-600">조건을 변경하여 다시 검색해보세요</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
