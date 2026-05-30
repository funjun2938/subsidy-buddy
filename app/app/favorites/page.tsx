"use client";
import { useFavorites } from "@/lib/useFavorites";
import GrantCard from "@/components/GrantCard";
import Link from "next/link";

export default function FavoritesPage() {
  const { list, toggle } = useFavorites();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">즐겨찾기</h1>
          <p className="text-sm text-gray-500">
            {list.length > 0
              ? `관심 지원사업 ${list.length}개`
              : "북마크한 지원사업이 없습니다"}
          </p>
        </div>
        {list.length > 0 && (
          <button
            onClick={() => list.forEach(m => toggle(m))}
            className="text-xs text-gray-600 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-500/5"
          >
            전체 삭제
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <span className="text-5xl text-yellow-500/30">★</span>
          <p className="text-gray-500 text-sm leading-relaxed">
            아직 즐겨찾기한 지원사업이 없어요.
            <br />
            매칭 결과 카드에서 ☆ 버튼을 눌러보세요.
          </p>
          <Link
            href="/"
            className="mt-2 px-5 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm hover:bg-cyan-500/20 transition"
          >
            지원사업 찾으러 가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((match) => (
            <GrantCard key={match.grant.id} match={match} searchParams="" />
          ))}
        </div>
      )}
    </main>
  );
}
