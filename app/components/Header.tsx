import Link from "next/link";

export default function Header() {
  return (
    <header className="glass sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <span className="text-white font-black text-sm">B</span>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#030712]" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">보조금매칭</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">AI</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/generate" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition">
            AI 문서생성
          </Link>
          <Link href="/experts" className="px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition">
            전문가 매칭
          </Link>
          <Link href="/pricing" className="px-3 py-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/5 transition">
            요금제
          </Link>
        </nav>
      </div>
    </header>
  );
}
