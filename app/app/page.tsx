import ConditionForm from "@/components/ConditionForm";
import FAQ from "@/components/FAQ";
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
            AI 정부지원금 어시스턴트
          </div>

          <h1 className="reveal text-[32px] sm:text-[60px] font-black tracking-[-0.03em] leading-[1.08] text-balance mb-5 text-[var(--foreground)]" style={{ animationDelay: "70ms" }}>
            지원금 찾고,{" "}
            <span className="gradient-text">신청서까지</span>
            <br className="hidden sm:block" /> AI가 한 번에
          </h1>

          <p className="reveal text-sm sm:text-lg text-[var(--muted)] max-w-md mx-auto mb-9 leading-relaxed text-balance" style={{ animationDelay: "140ms" }}>
            사업자등록증 한 장이면 30초 만에 끝.
          </p>

          <div className="reveal flex flex-col sm:flex-row justify-center gap-2.5 mb-5" style={{ animationDelay: "210ms" }}>
            <Link href="#match"
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
              { val: "500+", label: "지원사업" },
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

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-5 pt-2 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-black mb-2.5 text-[var(--foreground)] tracking-tight">3단계로 끝내는 지원금 신청</h2>
          <p className="text-[var(--muted)] text-sm">매칭 → 신청서 작성 → 전문가 연결, 필요한 만큼만</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* 1. 매칭 */}
          <Link href="#match" className="group shine glass glass-hover rounded-2xl p-6 transition-all hover:-translate-y-1 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform float">🎯</div>
              <span className="text-[11px] font-bold text-[var(--muted)]">STEP 1</span>
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">AI 맞춤 매칭</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">사업자등록증 또는 사업 설명만 입력하면 AI가 자격 요건을 분석해 최적의 지원사업을 찾아드려요.</p>
            <span className="text-xs text-cyan-500 font-semibold">무료</span>
          </Link>

          {/* 2. 문서생성 — 강조 (gradient border) */}
          <Link href="/generate" className="group shine gradient-border rounded-2xl p-6 transition-all hover:-translate-y-1.5 sm:-translate-y-2 duration-200">
            <span className="absolute top-3 right-3 text-[10px] font-bold text-white bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full px-2 py-0.5 shadow-sm">⭐ 인기</span>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/25 to-violet-500/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform float" style={{ animationDelay: "1s" }}>📝</div>
              <span className="text-[11px] font-bold text-violet-500">STEP 2</span>
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">AI 신청서 생성</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">사업계획서 초안 작성 + 공고 원본 <b>.hwp/.hwpx</b> 양식에 AI가 셀 단위로 자동 기입까지.</p>
            <span className="text-xs text-violet-500 font-semibold">건당 29,900원</span>
          </Link>

          {/* 3. 전문가 */}
          <Link href="/experts" className="group shine glass glass-hover rounded-2xl p-6 transition-all hover:-translate-y-1 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform float" style={{ animationDelay: "2s" }}>👨‍💼</div>
              <span className="text-[11px] font-bold text-[var(--muted)]">STEP 3</span>
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">전문가 매칭</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">세무사·변리사·노무사 등 검증된 전문가가 신청을 직접 대행해드려요.</p>
            <span className="text-xs text-pink-500 font-semibold">수수료 10~15%</span>
          </Link>
        </div>
      </section>

      {/* Matching Form */}
      <section id="match" className="relative max-w-2xl mx-auto px-5 pb-24 scroll-mt-28">
        <div className="hr-gradient max-w-xs mx-auto mb-12" />
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black mb-2 text-[var(--foreground)] tracking-tight">지금 바로 매칭해보기</h2>
          <p className="text-[var(--muted)] text-sm">사업 정보를 입력하면 30초 안에 결과를 드려요 · 무료</p>
        </div>
        <div className="glass rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/10">
          <ConditionForm />
        </div>
      </section>

      <FAQ />
    </div>
  );
}
