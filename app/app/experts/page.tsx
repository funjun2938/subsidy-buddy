"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── 더미 전문가 데이터 ──────────────────────────────────────────
interface Expert {
  id: string;
  name: string;
  title: string;
  specialty: string;
  desc: string;
  tags: string[];
  successRate: number;
  cases: number;
  color: string;
  responseTime: string;
  education: string;
  career: string[];
  specialties: string[];
  successCases: { title: string; amount: string; year: string }[];
  reviews: { author: string; biz: string; text: string }[];
}

const experts: Expert[] = [
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
    responseTime: "평균 2시간 내 회신",
    education: "서울대 공학박사 / 특허청 심사관 출신 (12년)",
    career: [
      "특허청 특허심사관 (2010~2022)",
      "現 김앤파트너스 변리사 사무소 대표",
      "중소벤처기업부 R&D 심사위원",
      "기술보증기금 기술평가 자문위원",
    ],
    specialties: [
      "중소기업 R&D 과제 기획·신청 대행",
      "특허 출원 및 IP 포트폴리오 구축",
      "기술 스타트업 정부지원사업 전략",
      "TIPS 프로그램 연계 지원",
      "해외 PCT 출원 및 국제 특허",
    ],
    successCases: [
      { title: "중기부 R&D 과제 (AI 기반 물류 최적화)", amount: "5억원", year: "2024" },
      { title: "IITP ICT R&D 기획과제", amount: "3억원", year: "2024" },
      { title: "TIPS 보육 기업 특허 포트폴리오", amount: "특허 12건", year: "2023" },
    ],
    reviews: [
      {
        author: "박OO 대표",
        biz: "AI 스타트업",
        text: "특허청 심사관 출신이라 심사관이 어떤 걸 보는지 정확히 알고 계셨어요. 덕분에 R&D 과제 첫 도전에 합격했습니다.",
      },
      {
        author: "이OO CTO",
        biz: "제조 중소기업",
        text: "서류 준비부터 발표 피칭까지 전 과정을 함께해 주셨어요. 기대 이상이었습니다.",
      },
    ],
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
    responseTime: "평균 1시간 내 회신",
    education: "연세대 경영학과 / 세무사 15년 경력",
    career: [
      "삼일회계법인 세무본부 (2009~2014)",
      "現 이앤파트너스 세무법인 대표세무사",
      "중소벤처기업부 창업 멘토단",
      "기술보증기금 자문 세무사",
    ],
    specialties: [
      "창업패키지 (예비·초기·도약) 신청 대행",
      "기보·신보 정책자금 융자 신청",
      "법인세·부가세 절감 컨설팅",
      "벤처기업 인증 및 이노비즈 신청",
      "고용창출 세액공제 최적화",
    ],
    successCases: [
      { title: "창업도약패키지 (푸드테크 스타트업)", amount: "1억원", year: "2024" },
      { title: "기보 정책자금 신청 (제조업)", amount: "5억원 융자", year: "2024" },
      { title: "벤처기업 인증 + 이노비즈 동시 취득", amount: "세액 감면 3천만원", year: "2023" },
    ],
    reviews: [
      {
        author: "김OO 대표",
        biz: "푸드테크 창업",
        text: "창업패키지 처음 도전했는데 서류부터 PT 준비까지 다 도와주셔서 합격했어요. 합격하고 나서도 세무 관련해서 계속 관리해주세요.",
      },
      {
        author: "정OO 대표",
        biz: "IT 서비스업",
        text: "정책자금 신청이 이렇게 복잡한지 몰랐는데 전 과정을 원스톱으로 처리해주셨습니다.",
      },
    ],
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
    responseTime: "평균 3시간 내 회신",
    education: "한국외대 법학부 / 고용노동부 근로감독관 출신",
    career: [
      "고용노동부 서울지청 근로감독관 (2011~2019)",
      "現 박노무사 사무소 대표 노무사",
      "청년고용촉진 자문 노무사",
      "소상공인연합회 자문위원",
    ],
    specialties: [
      "고용유지지원금 신청 및 대행",
      "청년 디지털 일자리 사업 신청",
      "직장내 교육훈련비 지원 신청",
      "4대 보험 최적화 컨설팅",
      "근로계약서·취업규칙 작성 대행",
    ],
    successCases: [
      { title: "고용유지지원금 (제조업 25인)", amount: "월 1,200만원", year: "2024" },
      { title: "청년 디지털 일자리 사업 (IT기업 5명)", amount: "연 4,500만원", year: "2024" },
      { title: "일학습병행제 도입 컨설팅", amount: "지원금 2,800만원", year: "2023" },
    ],
    reviews: [
      {
        author: "최OO 대표",
        biz: "소규모 제조업",
        text: "고용노동부 출신이라서 어떤 서류가 필요한지 정확하게 알고 계세요. 처음 신청인데 승인받았습니다.",
      },
      {
        author: "윤OO HR팀장",
        biz: "IT 서비스 기업",
        text: "청년 디지털 일자리 사업 신청부터 사후 관리까지 완벽하게 지원해주셨어요.",
      },
    ],
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
    responseTime: "평균 2시간 내 회신",
    education: "고려대 경영대학원 MBA / 소상공인시장진흥공단 출신",
    career: [
      "소상공인시장진흥공단 지원팀 팀장 (2008~2018)",
      "現 소상공인 경영컨설팅 그룹 대표",
      "소상공인연합회 전국 자문위원",
      "서울시 골목상권 활성화 자문",
    ],
    specialties: [
      "소상공인 스마트화 자금 신청",
      "백년가게·백년소공인 선정 지원",
      "온라인 진출 지원사업 신청",
      "소상공인 경쟁력강화 사업 대행",
      "전통시장 활성화 지원 신청",
    ],
    successCases: [
      { title: "소상공인 스마트화 지원 (음식점)", amount: "2,000만원", year: "2024" },
      { title: "백년가게 선정 (40년 전통 음식점)", amount: "브랜드 가치 ↑", year: "2024" },
      { title: "온라인 판로개척 지원 (공예품)", amount: "1,500만원", year: "2023" },
    ],
    reviews: [
      {
        author: "강OO 사장",
        biz: "음식점 운영 15년",
        text: "소공단 출신이라 어떤 지원사업이 우리 가게에 맞는지 딱 집어주셨어요. 신청서도 대신 작성해주셔서 합격했습니다.",
      },
      {
        author: "류OO 대표",
        biz: "공예품 제조·판매",
        text: "온라인 판로개척 지원받아서 스마트스토어 구축했어요. 매출이 30% 늘었습니다.",
      },
    ],
  },
];

// ─── 색상 맵 ──────────────────────────────────────────────────────
const colorMap: Record<string, { badge: string; ring: string; stat: string; avatar: string; btn: string }> = {
  cyan: {
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
    ring: "ring-cyan-500/20",
    stat: "text-cyan-400",
    avatar: "from-cyan-500/30 to-cyan-500/10",
    btn: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/15",
    ring: "ring-violet-500/20",
    stat: "text-violet-400",
    avatar: "from-violet-500/30 to-violet-500/10",
    btn: "bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20",
  },
  pink: {
    badge: "bg-pink-500/10 text-pink-400 border-pink-500/15",
    ring: "ring-pink-500/20",
    stat: "text-pink-400",
    avatar: "from-pink-500/30 to-pink-500/10",
    btn: "bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20",
  },
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
    ring: "ring-emerald-500/20",
    stat: "text-emerald-400",
    avatar: "from-emerald-500/30 to-emerald-500/10",
    btn: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20",
  },
};

// ─── 프로필 팝업 ─────────────────────────────────────────────────
function ProfileModal({
  expert,
  onClose,
  onConsult,
}: {
  expert: Expert;
  onClose: () => void;
  onConsult: () => void;
}) {
  const c = colorMap[expert.color];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[var(--card-bg)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.avatar} flex items-center justify-center text-xl font-black text-white`}>
              {expert.name[0]}
            </div>
            <div>
              <h2 className="font-bold text-[var(--foreground)]">
                {expert.name}{" "}
                <span className="text-sm text-[var(--muted)] font-normal">{expert.title}</span>
              </h2>
              <p className="text-xs text-[var(--muted)]">{expert.specialty}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* 통계 3개 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "합격률", value: `${expert.successRate}%`, cls: c.stat },
              { label: "진행 건수", value: `${expert.cases}건`, cls: "text-[var(--foreground)]" },
              { label: "응답 시간", value: expert.responseTime.replace("평균 ", ""), cls: "text-[var(--foreground)]" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className={`text-lg font-black ${cls}`}>{value}</div>
                <div className="text-[11px] text-[var(--muted)]">{label}</div>
              </div>
            ))}
          </div>

          {/* 학력·경력 */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">학력·경력</h3>
            <p className="text-xs text-[var(--muted)] mb-2">{expert.education}</p>
            <ul className="space-y-1">
              {expert.career.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* 전문 분야 */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">전문 분야</h3>
            <ul className="space-y-1">
              {expert.specialties.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                  <span className={`mt-0.5 text-xs ${c.stat}`}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* 최근 합격 사례 */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">최근 합격 사례</h3>
            <div className="space-y-2">
              {expert.successCases.map((sc, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                  <div>
                    <p className="text-sm text-[var(--foreground)]">{sc.title}</p>
                    <p className="text-[11px] text-[var(--muted)]">{sc.year}년</p>
                  </div>
                  <span className={`text-sm font-bold ${c.stat}`}>{sc.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 고객 후기 */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">고객 후기</h3>
            <div className="space-y-3">
              {expert.reviews.map((r, i) => (
                <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <p className="text-sm text-[var(--foreground)] leading-relaxed mb-2">
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {r.author} · {r.biz}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 CTA */}
        <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onConsult}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500 transition"
          >
            이 전문가에게 상담 신청하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 상담 신청 폼 ─────────────────────────────────────────────────
function ConsultModal({
  expert,
  defaultSummary,
  defaultBizType,
  defaultRegion,
  defaultKeywords,
  onClose,
}: {
  expert: Expert;
  defaultSummary: string;
  defaultBizType: string;
  defaultRegion: string;
  defaultKeywords: string;
  onClose: () => void;
}) {
  const c = colorMap[expert.color];

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    grantName: "",
    bizSummary: defaultSummary,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const autoContext = [
    defaultBizType && `업종: ${defaultBizType}`,
    defaultRegion && `지역: ${defaultRegion}`,
    defaultKeywords && `관심 키워드: ${defaultKeywords}`,
  ]
    .filter(Boolean)
    .join(" / ");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  const inputCls =
    "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all " +
    "bg-white/[0.04] border border-white/10 text-[var(--foreground)] " +
    "placeholder:text-[var(--muted)] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[var(--card-bg)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="font-bold text-[var(--foreground)]">상담 신청</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              <span className={c.stat}>{expert.name} {expert.title}</span>에게 무료 상담을 신청합니다
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-[var(--muted)] hover:text-[var(--foreground)] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* 제출 완료 상태 */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2 text-[var(--foreground)]">상담 신청이 완료됐습니다!</h3>
            <p className="text-sm text-[var(--muted)] mb-1">
              {expert.name} {expert.title}님이 확인 후 연락드립니다.
            </p>
            <p className="text-xs text-[var(--muted)] mb-8">
              예상 응답 시간: <span className="text-[var(--foreground)]">{expert.responseTime}</span>
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-[var(--foreground)] hover:bg-white/10 transition"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {/* 자동 감지된 사업 정보 배지 */}
              {autoContext && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                  <span className="text-cyan-400 text-sm mt-0.5">✦</span>
                  <p className="text-xs text-cyan-400">
                    <span className="font-semibold">AI 분석 정보 자동 반영:</span> {autoContext}
                  </p>
                </div>
              )}

              {/* 연락처 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">이름 *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="홍길동"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">연락처 *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    type="tel"
                    placeholder="010-0000-0000"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">이메일 *</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  type="email"
                  placeholder="example@email.com"
                  className={inputCls}
                />
              </div>

              {/* 상담 받을 지원사업 */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  상담 받고 싶은 지원사업
                  <span className="font-normal ml-1">(선택)</span>
                </label>
                <input
                  name="grantName"
                  value={form.grantName}
                  onChange={handleChange}
                  placeholder="예: 창업도약패키지, R&D 과제, 고용유지지원금 등"
                  className={inputCls}
                />
              </div>

              {/* 사업 개요 — AI 분석 결과 자동 반영 */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  사업 개요
                  {defaultSummary && (
                    <span className="ml-1.5 text-[10px] text-cyan-500 font-normal">AI 분석 결과 자동 입력됨</span>
                  )}
                </label>
                <textarea
                  name="bizSummary"
                  value={form.bizSummary}
                  onChange={handleChange}
                  rows={4}
                  placeholder="업종, 창업일, 지역, 매출 규모, 현재 상황 등을 자유롭게 적어주세요."
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* 문의 사항 */}
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">문의 사항</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={3}
                  placeholder="궁금한 점이나 특별히 도움받고 싶은 내용을 적어주세요."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <p className="text-[11px] text-[var(--muted)]">
                * 첫 상담은 무료입니다. 합격 시에만 수수료(10~15%)가 발생합니다.
              </p>
            </form>

            <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.phone || !form.email}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500 transition disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                무료 상담 신청하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
function ExpertsContent() {
  const searchParams = useSearchParams();
  const [profileExpert, setProfileExpert] = useState<Expert | null>(null);
  const [consultExpert, setConsultExpert] = useState<Expert | null>(null);

  const defaultSummary = searchParams.get("summary") || "";
  const defaultBizType = searchParams.get("bizType") || "";
  const defaultRegion = searchParams.get("region") || "";
  const defaultKeywords = searchParams.get("keywords") || "";

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
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
            <div
              key={exp.id}
              className={`glass rounded-2xl p-6 border border-white/5 hover:ring-1 ${c.ring} transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.avatar} flex items-center justify-center text-lg font-black text-white flex-shrink-0`}>
                      {exp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold">
                        {exp.name}{" "}
                        <span className="text-sm text-gray-400 font-normal">{exp.title}</span>
                      </h3>
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
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setProfileExpert(exp)}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-white/10 text-[var(--muted)] hover:text-[var(--foreground)] hover:border-white/20 transition"
                    >
                      프로필 보기
                    </button>
                    <button
                      onClick={() => setConsultExpert(exp)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold ${c.btn} transition`}
                    >
                      상담 신청
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-10 glass rounded-2xl p-6 border border-white/5 text-center">
        <h3 className="font-bold mb-2">전문가 등록을 원하시나요?</h3>
        <p className="text-sm text-gray-500 mb-4">
          세무사, 변리사, 노무사, 경영 컨설턴트로서 지원사업 대행 경험이 있다면 등록해주세요.
        </p>
        <button className="px-6 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-semibold hover:bg-white/10 transition border border-white/5">
          전문가 등록 문의
        </button>
      </div>

      {/* 프로필 팝업 */}
      {profileExpert && (
        <ProfileModal
          expert={profileExpert}
          onClose={() => setProfileExpert(null)}
          onConsult={() => {
            setProfileExpert(null);
            setConsultExpert(profileExpert);
          }}
        />
      )}

      {/* 상담 신청 폼 */}
      {consultExpert && (
        <ConsultModal
          expert={consultExpert}
          defaultSummary={defaultSummary}
          defaultBizType={defaultBizType}
          defaultRegion={defaultRegion}
          defaultKeywords={defaultKeywords}
          onClose={() => setConsultExpert(null)}
        />
      )}
    </div>
  );
}

export default function ExpertsPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-5 py-12 text-center text-[var(--muted)]">로딩 중...</div>}>
      <ExpertsContent />
    </Suspense>
  );
}
