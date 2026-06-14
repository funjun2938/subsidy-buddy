"use client";
import { useEffect, useRef, useState } from "react";
import { applyFillsToRhwp, type RhwpFill } from "@/lib/rhwp-fill";

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
    // init 실패가 영구 캐시되지 않도록(재시도 허용) 거부 시 싱글톤 리셋
    rhwpPromise.catch(() => { rhwpPromise = null; });
  }
  return rhwpPromise;
}

// 원본 양식 바이트(.hwp/.hwpx)를 rhwp 로 열어 fills(라벨→값)를 직접 써넣고
// HWPX 로 내보낸다. 편집·렌더와 동일 엔진이라 미리보기와 결과물이 일치하고,
// hwpilot export 가 throw 하는 양식에서도 동작한다. (한컴에서 바로 열림)
export async function exportHwpxFromBytes(bytes: Uint8Array, fills?: RhwpFill[]): Promise<Uint8Array> {
  const mod = await getRhwp();
  const doc = new mod.HwpDocument(new Uint8Array(bytes));
  try {
    if (fills && fills.length) {
      try { applyFillsToRhwp(doc, fills); } catch { /* 채우기 실패해도 원본 HWPX 는 내보냄 */ }
    }
    return doc.exportHwpx();
  } finally {
    doc.free();
  }
}

// rhwp 가 만든 SVG 를 innerHTML 주입 전 방어적으로 살균 (이벤트 핸들러/script/javascript:)
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

// fills(라벨→값)를 rhwp 가 직접 써넣고 렌더 → 렌더 엔진과 편집 엔진이 동일해 값이 항상 반영됨.
export function HwpPreview({ bytes, fills }: { bytes: Uint8Array; fills?: RhwpFill[] }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // fills 는 배열 참조가 매 렌더 바뀌므로 내용 기준으로 의존성 안정화
  const fillsKey = JSON.stringify(fills ?? []);

  useEffect(() => {
    const id = ++reqId.current;
    setPages(null);
    setError(null);
    (async () => {
      try {
        const mod = await getRhwp();
        // bytes 복사본 전달(detached/shared 회피)
        const doc = new mod.HwpDocument(new Uint8Array(bytes));
        try {
          // 같은 rhwp 문서에 값을 직접 채운 뒤 렌더 → 미리보기가 칸편집 값과 일치
          if (fills && fills.length) {
            try { applyFillsToRhwp(doc, fills); } catch { /* 채우기 실패해도 원본은 렌더 */ }
          }
          const n = Math.max(1, doc.pageCount());
          const svgs: string[] = [];
          for (let i = 0; i < n; i++) svgs.push(sanitizeSvg(doc.renderPageSvg(i)));
          if (id === reqId.current) setPages(svgs);
        } finally {
          doc.free(); // WASM 선형메모리 해제 (누수 방지)
        }
      } catch (e) {
        if (id === reqId.current) setError(e instanceof Error ? e.message : String(e));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes, fillsKey]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="text-sm text-[#9aa1ad]">
          원문 렌더링에 실패했어요.<br />위의 <b>✏️ 칸 편집</b> 보기로 확인해 주세요.
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
