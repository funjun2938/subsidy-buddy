import ConditionForm from "@/components/ConditionForm";
import Link from "next/link";

export default function Home() {
  return (
    <div className="noise">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[40%] w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-gray-400 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-ring" />
            실시간 정부 지원사업 분석 중
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            받을 수 있는{" "}
            <span className="gradient-text">정부 지원금</span>
            <br />
            AI가 찾아드립니다
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
            사업자등록증 한 장이면 끝. AI가 사업 정보를 분석하고
            <br className="hidden sm:block" />
            수천 개 지원사업 중 딱 맞는 것만 골라드립니다.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 sm:gap-16 mb-16">
            {[
              { val: "500+", label: "분석 지원사업", color: "text-cyan-400" },
              { val: "30초", label: "AI 매칭 소요", color: "text-violet-400" },
              { val: "무료", label: "기본 이용", color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="relative max-w-2xl mx-auto px-5 pb-8">
        <div className="glass rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/20">
          <ConditionForm />
        </div>
      </section>

      {/* BM Feature Cards */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black mb-3">지원금 신청까지 한번에</h2>
          <p className="text-gray-500 text-sm">매칭부터 서류 작성, 전문가 연결까지 원스톱</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Link href="/" className="group shine glass rounded-2xl p-6 glass-hover transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float">
              🎯
            </div>
            <h3 className="font-bold mb-2">AI 맞춤 매칭</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              사업자등록증 또는 사업 설명만 입력하면 AI가 자격 요건을 분석하고 최적의 지원사업을 찾아드립니다.
            </p>
            <span className="text-xs text-cyan-400 font-semibold">무료</span>
          </Link>

          <Link href="/generate" className="group shine glass rounded-2xl p-6 glass-hover transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float" style={{ animationDelay: "1s" }}>
              📝
            </div>
            <h3 className="font-bold mb-2">AI 신청서 생성</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              지원사업에 맞는 사업계획서 초안을 AI가 자동으로 작성합니다. 합격률 높은 전략도 함께 제안.
            </p>
            <span className="text-xs text-violet-400 font-semibold">건당 29,900원</span>
          </Link>

          <Link href="/experts" className="group shine glass rounded-2xl p-6 glass-hover transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform float" style={{ animationDelay: "2s" }}>
              👨‍💼
            </div>
            <h3 className="font-bold mb-2">전문가 매칭</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              세무사, 변리사, 노무사 등 검증된 전문가가 신청을 직접 대행해드립니다.
            </p>
            <span className="text-xs text-pink-400 font-semibold">수수료 10~15%</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
