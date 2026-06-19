import WelcomePopup from "@/components/WelcomePopup";
import Link from "next/link";

export default function Home() {
  return (
    <div className="noise">
      <WelcomePopup />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-[-20%] left-[8%] w-[460px] h-[460px] bg-cyan-500/10 rounded-full blur-[130px] drift" />
          <div className="absolute top-[6%] right-[6%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[130px] drift-slow" />
          <div className="absolute bottom-[-15%] left-[42%] w-[320px] h-[320px] bg-pink-500/8 rounded-full blur-[120px] drift" />
        </div>

        <div className="relative max-w-3xl mx-auto px-5 pt-14 sm:pt-28 pb-12 sm:pb-16 text-center">
          <div className="reveal inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full glass text-[11px] sm:text-xs text-[var(--muted)] mb-6" style={{ animationDelay: "0ms" }}>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[8px]">✦</span>
            소상공인을 위한 AI 정부지원금 어시스턴트
          </div>

          <h1 className="reveal text-[32px] sm:text-[60px] font-black tracking-[-0.03em] leading-[1.08] text-balance mb-5 text-[var(--foreground)]" style={{ animationDelay: "70ms" }}>
            지원금 찾고,{" "}
            <span className="gradient-text">신청서까지</span>
            <br className="hidden sm:block" /> AI가 한 번에
          </h1>

          <p className="reveal text-sm sm:text-lg text-[var(--muted)] max-w-md mx-auto mb-9 leading-relaxed text-balance" style={{ animationDelay: "140ms" }}>
            다시 일어서는 소상공인을 위해 — 사업자등록증 한 장이면 30초 만에 끝.
          </p>

          <div className="reveal flex flex-col sm:flex-row justify-center gap-2.5 mb-5" style={{ animationDelay: "210ms" }}>
            <Link href="/match"
              className="group inline-flex items-center justify-center gap-1.5 px-7 py-3.5 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 hover:-translate-y-0.5 duration-200">
              내 지원금 찾기
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link href="/generate"
              className="inline-flex items-center justify-center gap-1.5 px-7 py-3.5 rounded-full font-bold text-sm sm:text-base glass glass-hover text-[var(--foreground)] transition hover:-translate-y-0.5 duration-200">
              AI 신청서 만들기
            </Link>
          </div>

          <p className="reveal text-[11px] sm:text-xs text-[var(--muted)]/80 mb-12" style={{ animationDelay: "260ms" }}>
            가입 없이 무료로 시작 · 30초 매칭
          </p>

          {/* Stats — compact glass strip */}
          <div className="reveal inline-flex items-center px-2 py-2.5 rounded-full glass" style={{ animationDelay: "320ms" }}>
            {[
              { val: "1,400+", label: "지원사업" },
              { val: "30초", label: "AI 매칭" },
              { val: "무료", label: "기본 이용" },
            ].map((s, i) => (
              <span key={s.label}
                className={`text-xs sm:text-sm text-[var(--muted)] px-3.5 sm:px-5 ${i > 0 ? "border-l border-[var(--surface-border)]" : ""}`}>
                <b className="text-[var(--foreground)] font-extrabold">{s.val}</b> {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards — 핵심 기능 안내 */}
      <section className="max-w-3xl mx-auto px-5 pt-2 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-black mb-2.5 text-[var(--foreground)] tracking-tight">이렇게 써보세요</h2>
          <p className="text-[var(--muted)] text-sm">매칭으로 찾고, AI로 신청서까지 한 번에</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 매칭 */}
          <Link href="/match" className="group shine glass glass-hover rounded-2xl p-6 transition-all hover:-translate-y-1 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎯</div>
              <span className="text-[var(--muted)] transition-transform group-hover:translate-x-0.5">→</span>
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">AI 맞춤 매칭</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">사업자등록증 또는 사업 설명만 입력하면 AI가 자격 요건을 분석해 최적의 지원사업을 찾아드려요.</p>
            <span className="text-xs text-cyan-500 font-semibold">무료</span>
          </Link>

          {/* 문서생성 — 강조 */}
          <Link href="/generate" className="group shine gradient-border rounded-2xl p-6 transition-all hover:-translate-y-1.5 duration-200">
            <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full px-2 py-0.5 shadow-sm">⭐ 인기</span>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/25 to-violet-500/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📝</div>
              <span className="text-violet-500 transition-transform group-hover:translate-x-0.5">→</span>
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">AI 신청서 생성</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">사업계획서 초안 작성 + 공고 원본 <b>.hwp/.hwpx</b> 양식에 AI가 셀 단위로 자동 기입까지.</p>
            <span className="text-xs text-violet-500 font-semibold">무료 토큰 제공 · 소진 시 PRO</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
