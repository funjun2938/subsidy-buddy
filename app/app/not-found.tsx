import Link from "next/link";

export default function NotFound() {
  return (
    <div className="noise">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-2xl mx-auto px-5 py-32 text-center">
          <div className="text-8xl font-black gradient-text mb-6">404</div>
          <h1 className="text-2xl font-bold mb-3">
            페이지를 찾을 수 없습니다
          </h1>
          <p className="text-gray-500 mb-8">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/generate"
              className="px-5 py-2.5 rounded-xl glass glass-hover text-sm text-gray-300 font-medium transition"
            >
              AI 신청서 생성
            </Link>
          </div>

          <div className="mt-16 glass rounded-2xl p-6 text-left">
            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
              이런 페이지를 찾으셨나요?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { href: "/", label: "AI 맞춤 매칭", desc: "지원금 찾기" },
                { href: "/generate", label: "AI 신청서 생성", desc: "사업계획서 작성" },
                { href: "/experts", label: "전문가 매칭", desc: "전문가 연결" },
                { href: "/pricing", label: "요금제", desc: "플랜 비교" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
                >
                  <div className="text-cyan-400 group-hover:text-cyan-300 transition">
                    &rarr;
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-600">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
