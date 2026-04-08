import Link from "next/link";

const plans = [
  {
    name: "무료",
    price: "0",
    period: "",
    desc: "시작하기 좋은 기본 플랜",
    color: "from-gray-500/20 to-gray-500/5",
    border: "border-white/5",
    cta: "무료로 시작",
    ctaBg: "bg-white/5 text-white hover:bg-white/10",
    features: [
      { text: "AI 지원사업 매칭", included: true },
      { text: "매칭 결과 3건까지 보기", included: true },
      { text: "사업자등록증 AI 분석", included: true },
      { text: "상세 자격 분석", included: false },
      { text: "AI 신청서 생성", included: false },
      { text: "마감 알림", included: false },
      { text: "전문가 매칭", included: false },
    ],
  },
  {
    name: "프리미엄",
    price: "9,900",
    period: "/월",
    desc: "지원사업을 놓치지 않는 플랜",
    color: "from-cyan-500/20 to-violet-500/10",
    border: "border-cyan-500/20",
    badge: "인기",
    cta: "프리미엄 시작",
    ctaBg: "bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 shadow-lg shadow-cyan-500/20",
    features: [
      { text: "AI 지원사업 매칭 (무제한)", included: true },
      { text: "전체 매칭 결과 보기", included: true },
      { text: "상세 AI 자격 분석", included: true },
      { text: "마감 D-7, D-3, D-1 알림", included: true },
      { text: "신규 공고 실시간 알림", included: true },
      { text: "AI 신청서 생성 월 3건", included: true },
      { text: "전문가 매칭 할인 10%", included: true },
    ],
  },
  {
    name: "비즈니스",
    price: "49,000",
    period: "/월",
    desc: "대행까지 한번에 해결하는 플랜",
    color: "from-violet-500/20 to-pink-500/10",
    border: "border-violet-500/20",
    cta: "비즈니스 시작",
    ctaBg: "bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-400 hover:to-pink-400 shadow-lg shadow-violet-500/20",
    features: [
      { text: "프리미엄 전체 기능 포함", included: true },
      { text: "AI 신청서 생성 무제한", included: true },
      { text: "전문가 1:1 전담 배정", included: true },
      { text: "신청 대행 수수료 50% 할인", included: true },
      { text: "합격률 분석 리포트", included: true },
      { text: "R&D 과제 특화 분석", included: true },
      { text: "우선 고객 지원", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-black mb-3">
          <span className="gradient-text">요금제</span>
        </h1>
        <p className="text-gray-400">지원금 매칭은 무료. 더 많은 기능이 필요할 때 업그레이드하세요.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative glass rounded-3xl border ${plan.border} p-7 flex flex-col transition-all hover:scale-[1.02]`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-xs font-bold shadow-lg">
                {plan.badge}
              </div>
            )}

            <div className={`w-full h-1 rounded-full bg-gradient-to-r ${plan.color} mb-6`} />

            <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
            <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>

            <div className="mb-6">
              <span className="text-4xl font-black">{plan.price}</span>
              <span className="text-sm text-gray-500">원{plan.period}</span>
            </div>

            <ul className="space-y-3 flex-1 mb-7">
              {plan.features.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-0.5 text-xs ${f.included ? "text-cyan-400" : "text-gray-700"}`}>
                    {f.included ? "✓" : "—"}
                  </span>
                  <span className={f.included ? "text-gray-300" : "text-gray-600"}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.ctaBg}`}>
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* 건당 서비스 */}
      <div className="mt-16 text-center">
        <h2 className="text-xl font-bold mb-6">건당 서비스</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="text-2xl mb-3">📝</div>
            <h3 className="font-bold mb-1">AI 신청서 생성</h3>
            <p className="text-xs text-gray-500 mb-3">지원사업에 맞는 사업계획서 초안을 AI가 작성</p>
            <div className="text-2xl font-black text-violet-400">29,900<span className="text-sm text-gray-500 font-normal">원/건</span></div>
            <Link href="/generate" className="mt-4 block text-xs text-violet-400 hover:text-violet-300 transition">
              자세히 보기 →
            </Link>
          </div>
          <div className="glass rounded-2xl p-6 border border-white/5">
            <div className="text-2xl mb-3">👨‍💼</div>
            <h3 className="font-bold mb-1">전문가 신청 대행</h3>
            <p className="text-xs text-gray-500 mb-3">검증된 세무사·변리사·노무사가 직접 대행</p>
            <div className="text-2xl font-black text-pink-400">10~15<span className="text-sm text-gray-500 font-normal">% 수수료</span></div>
            <Link href="/experts" className="mt-4 block text-xs text-pink-400 hover:text-pink-300 transition">
              자세히 보기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
