"use client";
import { useEffect, useState } from "react";
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

/**
 * 사장님 인터뷰 인사이트 #3 반영:
 * "마감이 언제까지인지 한눈에 안 보여서 놓친 적이 있어요. 며칠 남았는지 표시해주면 좋겠어요."
 *
 * 마감 시급도를 4단계로 분류해 시각적 강조에 활용.
 * - critical: D-Day ~ D-3 (펄스 + 빨간 강조)
 * - urgent:   D-4 ~ D-7  (오렌지 강조 + "지금 바로!" 배지)
 * - soon:     D-8 ~ D-14 (옐로우 강조)
 * - normal:   그 외 / 상시
 */
type Urgency = "critical" | "urgent" | "soon" | "normal" | "closed";

function getUrgency(deadline: string): Urgency {
  if (deadline === "상시") return "normal";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "closed";
  if (diff <= 3) return "critical";
  if (diff <= 7) return "urgent";
  if (diff <= 14) return "soon";
  return "normal";
}

const urgencyConfig: Record<
  Urgency,
  { ddColor: string; ringClass: string; badge: string | null; badgeClass: string }
> = {
  critical: {
    ddColor: "text-red-400",
    ringClass: "ring-2 ring-red-500/30 animate-[pulse_2s_ease-in-out_infinite]",
    badge: "⚡ 지금 바로 신청!",
    badgeClass: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  urgent: {
    ddColor: "text-orange-400",
    ringClass: "ring-1 ring-orange-500/20",
    badge: "⏰ 마감 임박",
    badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  soon: {
    ddColor: "text-yellow-400",
    ringClass: "",
    badge: null,
    badgeClass: "",
  },
  normal: {
    ddColor: "text-gray-500",
    ringClass: "",
    badge: null,
    badgeClass: "",
  },
  closed: {
    ddColor: "text-red-500",
    ringClass: "opacity-60",
    badge: null,
    badgeClass: "",
  },
};

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
  const { grant, matchScore, reason, fitScore } = match;
  const cfg = scoreConfig[matchScore];
  const dd = dDay(grant.deadline);
  const urgency = getUrgency(grant.deadline);
  const uCfg = urgencyConfig[urgency];
  const successRate = getSuccessRate(grant);
  const { toggle, isFavorited } = useFavorites();
  const favorited = isFavorited(grant.id);

  // 'AI신청서 작성 가능' 뱃지: 해당 공고에 '신청서' 이름의 .hwpx 가 (zip 아닌) 직접
  // 첨부돼 AI 자동기입이 가능한 경우에만. 기업마당(biz-PBLN_) 공고만 첨부 조회 가능.
  const [canAutoFill, setCanAutoFill] = useState(false);
  useEffect(() => {
    if (!grant.id.startsWith("biz-PBLN_")) return;
    const pid = grant.id.slice(4);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/grant-attachments?pblancId=${encodeURIComponent(pid)}`);
        if (!res.ok) return;
        const data = await res.json();
        const ok = (data.attachments || []).some(
          (a: { ext?: string; filename?: string }) =>
            a.ext === "hwpx" && (a.filename || "").includes("신청서"),
        );
        if (!cancelled && ok) setCanAutoFill(true);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [grant.id]);

  return (
    <div className="relative group">
      <Link
        href={`/grants/${grant.id}?${searchParams}`}
        className={`block glass rounded-2xl border ${cfg.border} ${uCfg.ringClass} p-5 transition-all hover:shadow-xl ${cfg.glow} shine`}
      >
        {uCfg.badge && (
          <div className="mb-3 -mx-1">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${uCfg.badgeClass}`}>
              {uCfg.badge}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 pr-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 font-medium">
                {grant.category}
              </span>
              <span className="text-[11px] text-gray-600">{grant.orgName}</span>
              {canAutoFill && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 font-semibold">
                  📝 AI신청서 작성 가능
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white leading-snug">{grant.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <MatchScore matchScore={matchScore} fitScore={fitScore} />
            <span className="text-[10px] text-gray-500">합격률 ~{successRate.avgAcceptRate}%</span>
            <span className={`text-xs font-bold ${uCfg.ddColor}`}>
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
