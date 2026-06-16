"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import AuthNav from "./AuthNav";
import FavoritesNav from "./FavoritesNav";

const BASE_LINKS = [
  { href: "/match", label: "공고 찾기" },
  { href: "/generate", label: "AI 문서생성" },
  { href: "/faq", label: "FAQ" },
];

export default function HeaderNav({ email, isLoggedIn = false }: { email: string | null; isLoggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 로그인 시 '내 지원공고' 탭 노출
  const LINKS = isLoggedIn
    ? [{ href: "/my", label: "내 지원공고" }, ...BASE_LINKS]
    : BASE_LINKS;

  // 라우트가 바뀌면 모바일 메뉴 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkCls =
    "px-3 py-1.5 text-sm whitespace-nowrap text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-black/5 transition";
  const priceCls =
    "px-3 py-1.5 text-sm font-medium whitespace-nowrap text-cyan-400 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/5 transition";

  return (
    <>
      {/* 데스크톱 메뉴 */}
      <nav className="hidden md:flex items-center gap-1">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkCls}>
            {l.label}
          </Link>
        ))}
        <FavoritesNav />
        <Link href="/pricing" className={priceCls}>
          요금제
        </Link>
        <AuthNav email={email} />
        <ThemeToggle />
      </nav>

      {/* 모바일 컨트롤 (테마 + 햄버거) */}
      <div className="flex md:hidden items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 사이드 드로어 */}
      {/* 배경 딤 (열렸을 때만, 페이드) */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 md:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-200 cursor-default ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* 우측에서 슬라이드되는 드로어 — 불투명 배경(글자 비침 방지) */}
      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 md:hidden h-full w-72 max-w-[82%] shadow-2xl border-l border-black/10 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        style={{ background: "var(--background)" }}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-black/10">
          <span className="font-bold tracking-tight text-sm">메뉴</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="메뉴 닫기"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="px-4 py-4 flex flex-col gap-1 overflow-y-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <FavoritesNav />
          <Link href="/pricing" className={priceCls}>
            요금제
          </Link>
          <div className="pt-3 mt-2 border-t border-black/10 flex flex-col gap-1">
            <AuthNav email={email} />
          </div>
        </nav>
      </aside>
    </>
  );
}
