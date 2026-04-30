"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthNavProps {
  email: string | null;
}

export default function AuthNav({ email }: AuthNavProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!email) {
    return (
      <>
        <Link
          href="/login"
          className="px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-black/5 transition"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition shadow-md shadow-cyan-500/20"
        >
          회원가입
        </Link>
      </>
    );
  }

  return (
    <>
      <span className="px-2 text-xs text-[var(--muted)] hidden sm:inline">
        {email}
      </span>
      <button
        onClick={handleLogout}
        className="px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-black/5 transition"
      >
        로그아웃
      </button>
    </>
  );
}
