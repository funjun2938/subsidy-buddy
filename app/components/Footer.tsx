import Link from "next/link";

const serviceLinks = [
  { label: "AI 문서생성", href: "/generate" },
  { label: "전문가 매칭", href: "/experts" },
  { label: "요금제", href: "/pricing" },
];

const companyLinks = [
  { label: "프로젝트 소개", href: "/" },
  {
    label: "GitHub",
    href: "https://github.com/funjun2938/subsidy-buddy",
    external: true,
  },
  {
    label: "문의 이메일",
    href: "mailto:support@subsidy-ai.kr",
    external: true,
  },
];

const legalLinks = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy" },
];

const dataSources = [
  { label: "기업마당 공공API", href: "https://www.bizinfo.go.kr/" },
  { label: "정부24", href: "https://www.gov.kr/" },
  { label: "소상공인진흥공단", href: "https://www.semas.or.kr/" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white font-black text-xs">B</span>
              </div>
              <div>
                <span className="font-bold text-white text-sm tracking-tight">
                  보조금매칭
                </span>
                <span className="text-[9px] ml-1 px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">
                  AI
                </span>
              </div>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              사업자등록증 한 장으로 정부 지원금을 자동 매칭합니다.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400">
                500+ 공고 실시간 매칭 중
              </span>
            </div>
          </div>

          {/* Service column */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-4 tracking-wide">
              서비스
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-4 tracking-wide">
              프로젝트
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 mb-4 tracking-wide">
              법적 정보
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Data sources */}
        <div className="border-t border-white/5 pt-6 mb-6">
          <p className="text-[10px] text-gray-600 mb-2 tracking-wide font-semibold uppercase">
            Data Sources
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {dataSources.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {source.label}
              </a>
            ))}
            <span className="text-[10px] text-gray-700">
              · 큐레이션된 시드 데이터 30+ 프로그램
            </span>
          </div>
        </div>

        {/* Disclaimer + bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[10px] text-gray-600 leading-relaxed max-w-2xl">
            AI 분석 결과는 참고용이며 실제 자격 요건과 합격 여부는 공고 원문과
            소관 부처를 통해 확인하세요. 보조금매칭AI는 정부기관과 제휴된
            서비스가 아닙니다.
          </p>
          <p className="text-[10px] text-gray-600 whitespace-nowrap">
            © {currentYear} 보조금매칭AI · Built with Next.js + Gemini · MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
