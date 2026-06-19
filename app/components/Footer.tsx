import Link from "next/link";

const serviceLinks = [
  { label: "공고 찾기", href: "/match" },
  { label: "AI 문서생성", href: "/generate" },
  { label: "요금제", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const companyLinks = [
  { label: "프로젝트 소개", href: "/" },
  { label: "GitHub", href: "https://github.com/funjun2938/subsidy-buddy", external: true },
  { label: "문의 이메일", href: "mailto:support@subsidy-ai.kr", external: true },
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
    <footer className="border-t border-[var(--footer-border)] mt-20">
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white font-black text-xs">R</span>
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">리스탠드</span>
                <span className="text-[9px] ml-1 px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-semibold">AI</span>
              </div>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
              소상공인을 위한 정부 지원금 — 사업자등록증 한 장으로 자동 매칭합니다.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-500">1,400+ 공고 실시간 매칭 중</span>
            </div>
          </div>

          {/* Link columns */}
          {[
            { title: "서비스", links: serviceLinks },
            { title: "프로젝트", links: companyLinks },
            { title: "법적 정보", links: legalLinks },
          ].map(({ title, links }) => (
            <div key={title}>
              <h3 className="text-xs font-semibold text-[var(--foreground)] mb-4 tracking-wide">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-xs text-[var(--muted)] hover:text-cyan-500 transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-xs text-[var(--muted)] hover:text-cyan-500 transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Data sources */}
        <div className="border-t border-[var(--footer-border)] pt-6 mb-6">
          <p className="text-[10px] text-[var(--muted)] mb-2 tracking-wide font-semibold uppercase">Data Sources</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {dataSources.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                {s.label}
              </a>
            ))}
            <span className="text-[10px] text-[var(--muted)]">· 큐레이션된 시드 데이터 30+ 프로그램</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-[var(--footer-border)] pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[10px] text-[var(--muted)] leading-relaxed max-w-2xl">
            AI 분석 결과는 참고용이며 실제 자격 요건과 합격 여부는 공고 원문과 소관 부처를 통해 확인하세요. 리스탠드는 정부기관과 제휴된 서비스가 아닙니다.
          </p>
          <p className="text-[10px] text-[var(--muted)] whitespace-nowrap">
            © {currentYear} 리스탠드 · Built with Next.js + Gemini · MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
