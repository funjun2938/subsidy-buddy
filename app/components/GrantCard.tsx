"use client";
import Link from "next/link";
import { MatchResult } from "@/lib/types";
import { getSuccessRate } from "@/lib/success-rates";
import { useFavorites } from "@/lib/useFavorites";
import { showFavoriteToast } from "@/components/FavoriteToast";
import MatchScore from "@/components/MatchScore";

function dDay(deadline: string): string {
  if (deadline === "상시") return "상시";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "마감";
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

const scoreConfig = {
  high: {
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    glow: "hover:shadow-emerald-500/5",
  },
  medium: {
    border: "border-amber-500/20 hover:border-amber-500/40",
    glow: "hover:shadow-amber-500/5",
  },
  low: {
    border: "border-gray-500/20 hover:border-gray-500/40",
    glow: "hover:shadow-gray-500/5",
  },
};

export default function GrantCard({
  match,
  searchParams,
}: {
  match: MatchResult;
  searchParams: string;
}) {
  const { grant, matchScore, reason } = match;
  const cfg = scoreConfig[matchScore];
  const dd = dDay(grant.deadline);
  const successRate = getSuccessRate(grant);
  const { toggle, isFavorited } = useFavorites();
  const favorited = isFavorited(grant.id);

  return (
    <div className="relative group">
      <Link
        href={`/grants/${grant.id}?${searchParams}`}
        className={`block glass rounded-2xl border ${cfg.border} p-5 transition-all hover:shadow-xl ${cfg.glow} shine`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 font-medium">
                {grant.category}
              </span>
              <span className="text-[11px] text-gray-600">{grant.orgName}</span>
            </div>
            <h3 className="text-base font-bold text-white leading-snug">{grant.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <MatchScore matchScore={matchScore} />
            <span className="text-[10px] text-gray-500">합격률 ~{successRate.avgAcceptRate}%</span>
            <span className={`text-xs font-bold ${dd === "마감" ? "text-red-400" : dd.startsWith("D-") && parseInt(dd.slice(2)) <= 7 ? "text-orange-400" : "text-gray-500"}`}>
              {dd}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">{reason}</p>

        {match.matchReasons && match.matchReasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {match.matchReasons.map((r) => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                ✓ {r}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-sm font-bold text-cyan-400">{grant.amount}</span>
          <span className="text-[11px] text-gray-600">마감 {grant.deadline}</span>
        </div>
      </Link>

      {/* 북마크 버튼 — 카드 탐색과 독립적으로 동작 */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const willAdd = !favorited;
          toggle(match);
          showFavoriteToast(willAdd);
        }}
        aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all
          ${favorited
            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
            : "bg-white/5 text-gray-600 hover:bg-white/10 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
          }`}
      >
        {favorited ? "★" : "☆"}
      </button>
    </div>
  );
}
