"use client";
import Link from "next/link";
import { useFavorites } from "@/lib/useFavorites";

export default function FavoritesNav() {
  const { count } = useFavorites();

  return (
    <Link
      href="/favorites"
      className="relative px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-black/5 transition"
    >
      즐겨찾기
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-yellow-500 text-[10px] font-bold text-black flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
