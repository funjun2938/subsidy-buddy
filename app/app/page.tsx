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
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[40%] w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-5 pt-12 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-[11px] sm:text-xs text-[var(--muted)] mb-5 sm:mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
            AI 정부지원금 어시스턴트
          </div>

          <h1 className="text-[30px] sm:text-[58px] font-black tracking-[-0.02em] leading-[1.12] mb-4 sm:mb-5 text-[var(--foreground)]">
            지원금 찾고,{" "}
            <span className="gradient-text">신청서까지</span>
            <br />
            AI가 한 번에
          </h1>

          <p className="text-sm sm:text-lg text-[var(--muted)] max-w-md mx-auto mb-8 sm:mb-9 leading-relaxed">
            사업자등록증 한 장이면 30초 만에 끝.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row justify-center gap-2.5 mb-9 sm:mb-11">
            <Link href="#match"
              className="px-6 py-3 sm:px-7 sm:py-3.5 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-violet-500/25">
              내 지원금 찾기
            </Link>
            <Link href="/generate"
              className="px-6 py-3 sm:px-7 sm:py-3.5 rounded-full font-bold text-sm sm:text-base glass glass-hover text-[var(--foreground)] transition">
              AI 신청서 만들기 →
            </Link>
          </div>

          {/* Stats — compact inline strip */}
          <div className="inline-flex items-center px-2 py-2.5 rounded-full glass text-[var(--muted)]">
            {[
              { val: "500+", label: "지원사업" },
              { val: "30초", label: "AI 매칭" },
              { val: "무료", label: "기본 이용" },
            ].map((s, i) => (
              <span key={s.label}
                className={`text-xs sm:text-sm px-3.5 sm:px-5 ${i > 0 ? "border-l border-[var(--muted)]/20" : ""}`}>
                <b className="text-[var(--foreground)] font-extrabold">{s.val}</b> {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards — 핵심 기능을 상단에 노출 */}
      <section className="max-w-5xl mx-auto px-5 pt-4 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-black mb-3 text-[var(--foreground)]">3단계로 끝내는 지원금 신청</h2>
          <p className="text-[var(--muted)] text-sm">매칭 → 신청서 작성 → 전문가 연결, 필요한 만큼만</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link href="#match" className="group shine glass rounded-2xl p-6 glass-hover transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float">
              🎯
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">1. AI 맞춤 매칭</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
              사업자등록증 또는 사업 설명만 입력하면 AI가 자격 요건을 분석하고 최적의 지원사업을 찾아드립니다.
            </p>
            <span className="text-xs text-cyan-500 font-semibold">무료</span>
          </Link>

          {/* 문서생성 — 강조 카드 */}
          <Link href="/generate" className="group shine glass rounded-2xl p-6 glass-hover transition-all relative ring-2 ring-violet-500/40 sm:-translate-y-2">
            <span className="absolute top-3 right-3 text-[10px] font-bold text-violet-500 bg-violet-500/10 border border-violet-500/30 rounded-full px-2 py-0.5">
              ⭐ 인기
            </span>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float" style={{ animationDelay: "1s" }}>
              📝
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">2. AI 신청서 생성</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
              사업계획서 초안 작성 + 공고 원본 <b>.hwp/.hwpx</b> 양식에 AI가 셀 단위로 자동 기입까지 한 번에.
            </p>
            <span className="text-xs text-violet-500 font-semibold">건당 29,900원</span>
          </Link>

          <Link href="/experts" className="group shine glass rounded-2xl p-6 glass-hover transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float" style={{ animationDelay: "2s" }}>
              👨‍💼
            </div>
            <h3 className="font-bold mb-2 text-[var(--foreground)]">3. 전문가 매칭</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-3">
              세무사, 변리사, 노무사 등 검증된 전문가가 신청을 직접 대행해드립니다.
            </p>
            <span className="text-xs text-pink-500 font-semibold">수수료 10~15%</span>
          </Link>
        </div>
      </section>

      {/* Matching Form */}
      <section id="match" className="relative max-w-2xl mx-auto px-5 pb-20 scroll-mt-28">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black mb-2 text-[var(--foreground)]">🎯 지금 바로 매칭해보기</h2>
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
