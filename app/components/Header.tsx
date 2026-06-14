import Link from "next/link";
import HeaderNav from "./HeaderNav";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="glass sticky top-10 z-50">
      <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
            <span className="text-white font-black text-sm">B</span>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--background)]" />
          </div>
          <div>
            <span className="font-bold tracking-tight">보조금매칭</span>
            <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold">AI</span>
          </div>
        </Link>
        <HeaderNav email={user?.email ?? null} />
      </div>
    </header>
  );
}
