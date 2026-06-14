"use client";
import { useEffect, useRef, useState } from "react";

// rhwp(@rhwp/core) WASM 로 .hwp/.hwpx 를 실제 한글문서 모습 그대로 SVG 렌더.
// WASM 은 1회만 init (모듈 싱글톤). 클라이언트 전용.
let rhwpPromise: Promise<typeof import("@rhwp/core")> | null = null;
async function getRhwp() {
  if (!rhwpPromise) {
    rhwpPromise = (async () => {
      const mod = await import("@rhwp/core");
      await mod.default({ module_or_path: "/rhwp_bg.wasm" });
      const g = globalThis as unknown as { measureTextWidth?: (f: string, t: string) => number };
      if (!g.measureTextWidth) {
        g.measureTextWidth = (font, text) => {
          const ctx = document.createElement("canvas").getContext("2d");
          if (!ctx) return text.length * 8;
          ctx.font = font;
          return ctx.measureText(text).width;
        };
      }
      return mod;
    })();
  }
  return rhwpPromise;
}

export function HwpPreview({ bytes, onError }: { bytes: Uint8Array; onError?: () => void }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setPages(null);
    setError(null);
    (async () => {
      try {
        const mod = await getRhwp();
        // bytes 는 SharedArrayBuffer 회피 위해 복사본 전달
        const doc = new mod.HwpDocument(new Uint8Array(bytes));
        const n = Math.max(1, doc.pageCount());
        const svgs: string[] = [];
        for (let i = 0; i < n; i++) svgs.push(doc.renderPageSvg(i));
        if (id === reqId.current) setPages(svgs);
      } catch (e) {
        if (id === reqId.current) {
          setError(e instanceof Error ? e.message : String(e));
          onError?.();
        }
      }
    })();
  }, [bytes, onError]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-sm text-[#9aa1ad]">
          원문 렌더링에 실패했어요.<br />아래 <b>칸 편집</b> 보기로 확인해 주세요.
          <div className="text-[10px] mt-2 opacity-70">{error.slice(0, 120)}</div>
        </div>
      </div>
    );
  }

  if (!pages) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#9aa1ad]">
        <span className="w-7 h-7 rounded-full border-2 border-[#dfe3ea] border-t-[#2d6cf6] animate-spin" />
        <span className="text-xs">한글문서 원문 렌더링 중…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#5b5f66] p-3 md:p-6">
      <div className="mx-auto flex flex-col items-center gap-4 max-w-3xl">
        {pages.map((svg, i) => (
          <div key={i}
            className="bg-white shadow-xl rounded-sm overflow-hidden w-full [&_svg]:block [&_svg]:w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svg }} />
        ))}
      </div>
    </div>
  );
}
