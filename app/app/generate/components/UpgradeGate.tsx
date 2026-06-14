"use client";
import Link from "next/link";

export function UpgradeGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-3xl p-7 sm:p-8 max-w-sm w-full shadow-2xl shadow-black/40 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-violet-500/25">
          🪙
        </div>
        <h2 className="text-lg font-black mb-2 text-[var(--foreground)]">무료 토큰을 모두 사용했어요</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
          AI 신청서 생성·수정에 쓰는 <b className="text-[var(--foreground)]">무료 토큰(100%)</b>을 다 쓰셨어요.
          <br />
          <b className="text-[var(--foreground)]">PRO</b>로 업그레이드하면 제한 없이 계속 쓸 수 있고,
          그냥 두시면 <b className="text-[var(--foreground)]">내일 다시 충전</b>돼요.
        </p>
        <div className="flex flex-col gap-2.5">
          <Link href="/pricing"
            className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-violet-500/25">
            PRO로 업그레이드 <span>→</span>
          </Link>
          <button onClick={onClose}
            className="px-6 py-3 rounded-full font-semibold text-sm glass glass-hover text-[var(--foreground)] transition">
            내일 다시 할게요
          </button>
        </div>
      </div>
    </div>
  );
}
