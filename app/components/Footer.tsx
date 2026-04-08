import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600">
      <div className="max-w-5xl mx-auto px-4 flex flex-col items-center gap-3">
        <p className="font-medium text-gray-500">보조금매칭AI</p>
        <p>AI 분석 결과는 참고용이며 실제 자격 요건은 공고 원문을 확인하세요.</p>
        <div className="flex items-center gap-4 text-gray-700">
          <Link href="/pricing" className="hover:text-gray-400 transition-colors">
            요금제
          </Link>
          <span>|</span>
          <Link href="/experts" className="hover:text-gray-400 transition-colors">
            전문가 연결
          </Link>
          <span>|</span>
          <a
            href="mailto:support@subsidy-ai.kr"
            className="hover:text-gray-400 transition-colors"
          >
            문의
          </a>
        </div>
        <p>© {currentYear} 보조금매칭AI. All rights reserved.</p>
      </div>
    </footer>
  );
}
