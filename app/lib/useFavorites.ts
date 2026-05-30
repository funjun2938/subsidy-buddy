"use client";
import { useState, useEffect, useCallback } from "react";
import type { MatchResult } from "./types";

const STORAGE_KEY = "subsidy-favorites";

function load(): Record<string, MatchResult> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(data: Record<string, MatchResult>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Record<string, MatchResult>>({});

  useEffect(() => {
    setFavorites(load());
  }, []);

  const toggle = useCallback((match: MatchResult) => {
    setFavorites(prev => {
      const next = { ...prev };
      if (next[match.grant.id]) {
        delete next[match.grant.id];
      } else {
        next[match.grant.id] = match;
      }
      save(next);
      return next;
    });
  }, []);

  const isFavorited = useCallback(
    (grantId: string) => Boolean(favorites[grantId]),
    [favorites]
  );

  const list = Object.values(favorites);

  return { favorites, list, toggle, isFavorited, count: list.length };
}
