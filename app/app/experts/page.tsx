import Link from "next/link";

const experts = [
  {
    id: "1",
    name: "김변리사",
    title: "변리사",
    specialty: "특허·R&D 과제",
    desc: "특허청 출신. R&D 정부 과제 신청 대행 100건+ 경험. 기술 스타트업 IP 전략 컨설팅 전문.",
    tags: ["R&D 과제", "특허 출원", "IP 전략"],
    successRate: 87,
    cases: 142,
    color: "cyan",
  },
  {
    id: "2",
    name: "이세무사",
    title: "세무사",
    specialty: "창업 세무·자금",
    desc: "중소기업 세무 전문 15년차. 창업패키지, 기보 정책자금 신청 대행. 세금 절감 최적화.",
    tags: ["창업패키지", "정책자금", "세무 컨설팅"],
    successRate: 92,
    cases: 256,
    color: "violet",
  },
  {
    id: "3",
    name: "박노무사",
    title: "노무사",
    specialty: "고용 지원금",
    desc: "고용노동부 출신. 고용유지지원금, 청년 디지털 일자리 등 고용 관련 지원사업 전문.",
    tags: ["고용 지원금", "인력 채용", "4대 보험"],
    successRate: 85,
    cases: 98,
    color: "pink",
  },
  {
    id: "4",
    name: "최컨설턴트",
    title: "경영 컨설턴트",
    specialty: "소상공인 지원",
    desc: "소상공인시장진흥공단 자문위원. 소상공인 특화 지원사업 맞춤 컨설팅 + 신청서 작성 대행.",
    tags: ["소상공인", "디지털전환", "판로 개척"],
    successRate: 90,
    cases: 312,
    color: "emerald",
  },
];

const colorMap: Record<string, { badge: string; ring: string; stat: string }> = {
  cyan: { badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/15", ring: "ring-cyan-500/20", stat: "text-cyan-400" },
  violet: { badge: "bg-violet-500/10 text-violet-400 border-violet-500/15", ring: "ring-violet-500/20", stat: "text-violet-400" },
  pink: { badge: "bg-pink-500/10 text-pink-400 border-pink-500/15", ring: "ring-pink-500/20", stat: "text-pink-400" },
  emerald: { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15", ring: "ring-emerald-500/20", stat: "text-emerald-400" },
};

export default function ExpertsPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        홈으로
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-black mb-3">
          <span className="gradient-text">전문가 매칭</span>
        </h1>
        <p className="text-gray-400">
          검증된 세무사·변리사·노무사가 지원사업 신청을 직접 대행해드립니다.
          <br />
          합격 시에만 수수료(10~15%)가 발생합니다.
        </p>
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-6 mb-10 border border-white/5">
        <h2 className="text-sm font-bold mb-4">이용 절차</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { step: "01", title: "전문가 선택", desc: "분야별 전문가 프로필 확인" },
            { step: "02", title: "무료 상담", desc: "지원사업 적합도 사전 상담" },
            { step: "03", title: "대행 진행", desc: "전문가가 서류 작성+제출" },
            { step: "04", title: "합격 시 결제", desc: "성공 시에만 수수료 10~15%" },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-xs text-cyan-400 font-bold mb-1">{s.step}</div>
              <div className="text-sm font-semibold mb-0.5">{s.title}</div>
              <div className="text-[11px] text-gray-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expert List */}
      <div className="space-y-4">
        {experts.map((exp) => {
          const c = colorMap[exp.color];
          return (
            <div key={exp.id} className={`glass rounded-2xl p-6 border border-white/5 hover:ring-1 ${c.ring} transition-all`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${exp.color === "cyan" ? "from-cyan-500/30 to-cyan-500/10" : exp.color === "violet" ? "from-violet-500/30 to-violet-500/10" : exp.color === "pink" ? "from-pink-500/30 to-pink-500/10" : "from-emerald-500/30 to-emerald-500/10"} flex items-center justify-center text-lg font-black text-white`}>
                      {exp.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold">{exp.name} <span className="text-sm text-gray-400 font-normal">{exp.title}</span></h3>
                      <p className="text-xs text-gray-500">{exp.specialty}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-3 leading-relaxed">{exp.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exp.tags.map((tag) => (
                      <span key={tag} className={`text-[11px] px-2 py-0.5 rounded-md border ${c.badge}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="mb-3">
                    <div className={`text-2xl font-black ${c.stat}`}>{exp.successRate}%</div>
                    <div className="text-[11px] text-gray-600">합격률</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-lg font-bold text-white">{exp.cases}</div>
                    <div className="text-[11px] text-gray-600">진행 건수</div>
                  </div>
                  <button className={`px-4 py-2 rounded-lg text-sm font-semibold ${c.badge} hover:opacity-80 transition`}>
                    상담 신청
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-10 glass rounded-2xl p-6 border border-white/5 text-center">
        <h3 className="font-bold mb-2">전문가 등록을 원하시나요?</h3>
        <p className="text-sm text-gray-500 mb-4">세무사, 변리사, 노무사, 경영 컨설턴트로서 지원사업 대행 경험이 있다면 등록해주세요.</p>
        <button className="px-6 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-semibold hover:bg-white/10 transition border border-white/5">
          전문가 등록 문의
        </button>
      </div>
    </div>
  );
}
