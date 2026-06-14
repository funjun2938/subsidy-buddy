"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "@/lib/useFavorites";
import { getSearches, getDocs, ACTIVITY_EVENT, type SearchEntry, type DocEntry } from "@/lib/userActivity";

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export default function MyPage() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const { list: saved, toggle } = useFavorites();
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setAuth(data.user ? "in" : "out");
    });
  }, []);

  useEffect(() => {
    const refresh = () => { setSearches(getSearches()); setDocs(getDocs()); };
    refresh();
    window.addEventListener(ACTIVITY_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener(ACTIVITY_EVENT, refresh); window.removeEventListener("focus", refresh); };
  }, []);

  if (auth === "loading") {
    return <div className="max-w-4xl mx-auto px-5 py-24 text-center text-[var(--muted)] text-sm">불러오는 중…</div>;
  }
  if (auth === "out") {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-xl font-black mb-2 text-[var(--foreground)]">로그인이 필요해요</h1>
        <p className="text-sm text-[var(--muted)] mb-6">내 지원 현황·저장한 공고·작성 문서·검색 이력을 보려면 로그인하세요.</p>
        <Link href="/login" className="inline-block px-6 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 transition">로그인 →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-black text-[var(--foreground)]">내 지원공고</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{email} · 나의 지원 활동 한눈에 보기</p>
      </header>

      {/* 지원 현황 요약 */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "저장한 공고", n: saved.length, href: "#saved" },
          { label: "작성 문서", n: docs.length, href: "#docs" },
          { label: "최근 검색", n: searches.length, href: "#searches" },
        ].map((c) => (
          <a key={c.label} href={c.href} className="glass glass-hover rounded-2xl p-4 text-center transition">
            <div className="text-2xl font-black text-[var(--foreground)]">{c.n}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{c.label}</div>
          </a>
        ))}
      </section>

      {/* 작성 문서 */}
      <section id="docs" className="scroll-mt-28">
        <h2 className="font-bold mb-3 text-[var(--foreground)]">📝 작성한 문서</h2>
        {docs.length === 0 ? (
          <Empty text="아직 작성한 신청서가 없어요." cta={{ href: "/generate", label: "AI 문서생성 시작" }} />
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((d, i) => (
              <Link key={i} href="/generate" className="glass glass-hover rounded-xl px-4 py-3 flex items-center justify-between transition">
                <span className="text-sm text-[var(--foreground)] truncate">{d.title}</span>
                <span className="text-[11px] text-[var(--muted)] shrink-0">{typeof d.filledCount === "number" ? `${d.filledCount}칸 · ` : ""}{ago(d.at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 저장한 공고 */}
      <section id="saved" className="scroll-mt-28">
        <h2 className="font-bold mb-3 text-[var(--foreground)]">⭐ 저장한 공고</h2>
        {saved.length === 0 ? (
          <Empty text="북마크한 지원사업이 없어요." cta={{ href: "/match", label: "공고 찾기" }} />
        ) : (
          <div className="flex flex-col gap-2">
            {saved.map((m) => (
              <div key={m.grant.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <Link href={`/grants/${m.grant.id}`} className="min-w-0 flex-1 group">
                  <div className="text-sm text-[var(--foreground)] truncate group-hover:text-cyan-500 transition">{m.grant.title}</div>
                  <div className="text-[11px] text-[var(--muted)] truncate">{m.grant.orgName} · 마감 {m.grant.deadline}</div>
                </Link>
                <button onClick={() => toggle(m)} title="저장 해제" className="text-[var(--muted)] hover:text-[#c0392b] text-sm shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 최근 검색 */}
      <section id="searches" className="scroll-mt-28">
        <h2 className="font-bold mb-3 text-[var(--foreground)]">🔎 최근 검색</h2>
        {searches.length === 0 ? (
          <Empty text="검색 이력이 없어요." cta={{ href: "/match", label: "지원금 매칭하기" }} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {searches.map((s, i) => (
              <Link key={i} href={s.type === "grant" ? "/generate" : "/match"}
                className="glass glass-hover rounded-full px-3 py-1.5 text-xs text-[var(--foreground)] transition">
                {s.type === "grant" ? "📄 " : "🎯 "}{s.q} <span className="text-[var(--muted)]">· {ago(s.at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="text-[11px] text-[var(--muted)] pt-2">※ 신청 제출 현황 연동은 준비 중이에요. 현재는 이 브라우저의 활동 기준입니다.</p>
    </div>
  );
}

function Empty({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return (
    <div className="glass rounded-2xl p-6 text-center">
      <p className="text-sm text-[var(--muted)] mb-3">{text}</p>
      <Link href={cta.href} className="text-xs font-semibold text-cyan-500 hover:text-cyan-400">{cta.label} →</Link>
    </div>
  );
}
