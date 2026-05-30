"use client";
import { useEffect, useState } from "react";

interface ToastEvent {
  message: string;
  id: number;
}

let listeners: ((e: ToastEvent) => void)[] = [];

export function showFavoriteToast(added: boolean) {
  const event: ToastEvent = {
    message: added ? "★ 즐겨찾기에 추가됐어요" : "즐겨찾기에서 삭제됐어요",
    id: Date.now(),
  };
  listeners.forEach(fn => fn(event));
}

export default function FavoriteToast() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const handler = (e: ToastEvent) => {
      setToasts(prev => [...prev, e]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== e.id));
      }, 2200);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter(fn => fn !== handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
