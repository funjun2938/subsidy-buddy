import { MatchResult } from "@/lib/types";

const scoreConfig = {
  high: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: "적합도 높음",
    dot: "bg-emerald-400",
  },
  medium: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "검토 가능",
    dot: "bg-amber-400",
  },
  low: {
    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    label: "참고",
    dot: "bg-gray-400",
  },
} as const;

interface MatchScoreProps {
  matchScore: MatchResult["matchScore"];
  className?: string;
}

export default function MatchScore({ matchScore, className = "" }: MatchScoreProps) {
  const cfg = scoreConfig[matchScore];

  return (
    <span
      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${cfg.badge} flex items-center gap-1.5 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { scoreConfig };
