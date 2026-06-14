"use client";
import { useCallback, useEffect, useState } from "react";

// AI 문서생성 무료 토큰 (생성/수정 1회 = 1토큰). 하루 단위 리셋.
// 가벼운 클라이언트 구현(localStorage) — 현재 익명/무로그인 단계에 맞춤.
export const FREE_DAILY = 3;
const KEY = "docTokens.v1";
const EVT = "docTokens:changed";

interface TokenState { date: string; used: number; pro: boolean }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function read(): TokenState {
  if (typeof window === "undefined") return { date: todayStr(), used: 0, pro: false };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    let date: string = raw.date || todayStr();
    let used: number = typeof raw.used === "number" ? raw.used : 0;
    if (date !== todayStr()) { date = todayStr(); used = 0; } // 일일 리셋
    return { date, used, pro: !!raw.pro };
  } catch {
    return { date: todayStr(), used: 0, pro: false };
  }
}

function write(s: TokenState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVT));
}

/** 결제 성공 시 PRO 활성화 */
export function activatePro() {
  const s = read();
  s.pro = true;
  write(s);
}

export interface DocTokens {
  mounted: boolean;
  used: number;
  remaining: number;
  limit: number;
  isPro: boolean;
  canUse: boolean;
  consume: () => void;
}

export function useDocTokens(): DocTokens {
  // SSR/하이드레이션 안전: 첫 렌더는 기본값, 마운트 후 실제 값 반영
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<TokenState>({ date: todayStr(), used: 0, pro: false });

  const refresh = useCallback(() => setState(read()), []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const h = () => refresh();
    window.addEventListener(EVT, h);
    window.addEventListener("focus", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("focus", h);
    };
  }, [refresh]);

  const remaining = state.pro ? Infinity : Math.max(0, FREE_DAILY - state.used);
  const canUse = state.pro || remaining > 0;

  const consume = useCallback(() => {
    const s = read();
    if (s.pro) return;
    s.used += 1;
    write(s);
    setState(s);
  }, []);

  return { mounted, used: state.used, remaining, limit: FREE_DAILY, isPro: state.pro, canUse, consume };
}
