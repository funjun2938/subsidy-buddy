"use client";
import { useCallback, useEffect, useState } from "react";

// AI 문서생성 초기 무료 토큰 "예산" (대략 문서 3개 정도 만들 수 있는 양).
// 실제 LLM 사용량(입력+출력 추정 토큰)을 차감하고, 사용률을 %로 보여준다.
// 하루 단위 리셋. 소진 시 PRO 전환 또는 익일 충전.
// 예산 크기는 이 한 줄로 조절 (단위: 추정 토큰).
export const FREE_TOKEN_BUDGET = 12000;

const KEY = "docTokens.v2";
const EVT = "docTokens:changed";

interface TokenState { date: string; usedTokens: number; pro: boolean }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function read(): TokenState {
  if (typeof window === "undefined") return { date: todayStr(), usedTokens: 0, pro: false };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    let date: string = raw.date || todayStr();
    let usedTokens: number = typeof raw.usedTokens === "number" ? raw.usedTokens : 0;
    if (date !== todayStr()) { date = todayStr(); usedTokens = 0; } // 일일 리셋
    return { date, usedTokens, pro: !!raw.pro };
  } catch {
    return { date: todayStr(), usedTokens: 0, pro: false };
  }
}

function write(s: TokenState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVT));
}

/** 결제 성공 시 PRO 활성화 (무제한) */
export function activatePro() {
  const s = read();
  s.pro = true;
  write(s);
}

export interface DocTokens {
  mounted: boolean;
  usedTokens: number;
  budget: number;
  percent: number; // 0~100 (사용률)
  isPro: boolean;
  canUse: boolean;
  consume: (tokens: number) => void;
}

export function useDocTokens(): DocTokens {
  // SSR/하이드레이션 안전: 첫 렌더는 기본값, 마운트 후 실제 값 반영
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<TokenState>({ date: todayStr(), usedTokens: 0, pro: false });

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

  const percent = state.pro ? 0 : Math.min(100, Math.round((state.usedTokens / FREE_TOKEN_BUDGET) * 100));
  const canUse = state.pro || state.usedTokens < FREE_TOKEN_BUDGET;

  const consume = useCallback((tokens: number) => {
    const s = read();
    if (s.pro) return;
    s.usedTokens += Math.max(0, Math.round(tokens) || 0);
    write(s);
    setState(s);
  }, []);

  return { mounted, usedTokens: state.usedTokens, budget: FREE_TOKEN_BUDGET, percent, isPro: state.pro, canUse, consume };
}
