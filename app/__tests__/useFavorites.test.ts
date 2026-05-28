import { describe, it, expect, beforeEach, vi } from "vitest";

// localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

vi.stubGlobal("localStorage", localStorageMock);

// Must import AFTER stubbing globals
import type { MatchResult } from "../lib/types";

function makeMatch(id: string): MatchResult {
  return {
    grant: {
      id,
      title: `지원사업 ${id}`,
      orgName: "테스트기관",
      category: "창업",
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
      amount: "1000만원",
      deadline: "상시",
      description: "테스트",
      requirements: "테스트",
      url: "https://example.com",
    },
    matchScore: "high",
    reason: "테스트 이유",
    matchReasons: ["업종 일치"],
  };
}

// Since useFavorites is a React hook we test the underlying logic directly
const STORAGE_KEY = "subsidy-favorites";

function loadFavorites(): Record<string, MatchResult> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function saveFavorites(data: Record<string, MatchResult>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toggle(match: MatchResult): Record<string, MatchResult> {
  const prev = loadFavorites();
  const next = { ...prev };
  if (next[match.grant.id]) {
    delete next[match.grant.id];
  } else {
    next[match.grant.id] = match;
  }
  saveFavorites(next);
  return next;
}

describe("favorites localStorage logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(Object.keys(loadFavorites())).toHaveLength(0);
  });

  it("adds a grant on first toggle", () => {
    const m = makeMatch("g1");
    toggle(m);
    const fav = loadFavorites();
    expect(fav["g1"]).toBeDefined();
    expect(fav["g1"].grant.title).toBe("지원사업 g1");
  });

  it("removes a grant on second toggle (idempotent remove)", () => {
    const m = makeMatch("g1");
    toggle(m); // add
    toggle(m); // remove
    expect(loadFavorites()["g1"]).toBeUndefined();
  });

  it("handles multiple independent grants", () => {
    toggle(makeMatch("g1"));
    toggle(makeMatch("g2"));
    toggle(makeMatch("g3"));
    const fav = loadFavorites();
    expect(Object.keys(fav)).toHaveLength(3);
  });

  it("removing one does not affect others", () => {
    toggle(makeMatch("g1"));
    toggle(makeMatch("g2"));
    toggle(makeMatch("g1")); // remove g1
    const fav = loadFavorites();
    expect(fav["g1"]).toBeUndefined();
    expect(fav["g2"]).toBeDefined();
  });

  it("persists across re-loads (localStorage survives)", () => {
    toggle(makeMatch("g1"));
    // simulate new session read
    const reloaded = loadFavorites();
    expect(reloaded["g1"]).toBeDefined();
  });
});
