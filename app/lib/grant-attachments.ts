// 공고 상세 페이지(bizinfo.go.kr)에서 첨부 파일(HWP/HWPX) URL을 추출.
//
// 기업마당 페이지의 첨부 영역은 다음과 같은 구조다 (요지):
//
//   <a class="... directViewBtn" data-extsn="hwpx"
//      onclick="fileBlank('/webapp/upload/.../202604031442150075.hwpx',
//                         '[붙임1] 모집공고문.hwpx')">바로보기</a>
//   <a href="/cmm/fms/fileDown.do?atchFileId=FILE_xxx&fileSn=1"
//      title="첨부파일 [붙임1] 모집공고문.hwpx 다운로드">다운로드</a>
//
// 두 a 태그가 같은 부모(div) 안에 묶여 있으므로 directViewBtn을 앵커로 잡고 그 다음에
// 가장 가까운 fileDown.do href 를 페어링한다.

import { GoogleGenerativeAI } from "@google/generative-ai";

const BIZINFO_BASE = "https://www.bizinfo.go.kr";

export interface GrantAttachment {
  filename: string;
  ext: "hwp" | "hwpx" | "pdf" | "zip" | string;
  downloadUrl: string;       // 절대 URL
  inlineViewPath?: string;   // bizinfo의 "바로보기" 인라인 경로 (선택)
  fileSize?: number;         // 알면 채우기 (HEAD 요청 안 함, 보통 미정)
}

interface CacheEntry {
  data: GrantAttachment[];
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1시간

/**
 * 공고 ID로 첨부 파일 목록을 가져온다.
 *
 * 1) 정규식 기반 추출을 우선 시도한다 (LLM 호출 없음, 비용 0)
 * 2) 정규식이 0개를 반환하면 페이지 구조가 바뀐 것이므로 LLM 폴백 (선택)
 */
export async function fetchGrantAttachments(
  pblancId: string,
  options: { useLLMFallback?: boolean } = {}
): Promise<GrantAttachment[]> {
  const cached = cache.get(pblancId);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const url = `${BIZINFO_BASE}/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancId}`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[grant-attachments] HTTP ${res.status} for ${pblancId}`);
      return [];
    }
    html = await res.text();
  } catch (e) {
    console.error("[grant-attachments] fetch error:", e);
    return [];
  }

  let attachments = extractAttachmentsRegex(html);

  if (attachments.length === 0 && options.useLLMFallback) {
    try {
      attachments = await extractAttachmentsLLM(html);
    } catch (e) {
      console.warn("[grant-attachments] LLM fallback failed:", e);
    }
  }

  cache.set(pblancId, { data: attachments, expiry: Date.now() + TTL_MS });
  return attachments;
}

// ── 정규식 추출 ───────────────────────────────────────────────────────────────

function extractAttachmentsRegex(html: string): GrantAttachment[] {
  const out: GrantAttachment[] = [];

  // directViewBtn (바로보기) 단위로 첨부 1개씩 잘라낸다.
  // onclick="fileBlank('/webapp/.../xxx.hwpx', '파일명.hwpx')"
  const viewRegex =
    /class="[^"]*directViewBtn[^"]*"[^>]*data-extsn="([^"]+)"[^>]*onclick="fileBlank\(\s*'([^']+)'\s*\+\s*'\/'\s*\+\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;

  // 같은 부모 div에 있는 fileDown.do href를 페어링하기 위해
  // viewRegex 매치 위치 이후 가까운 fileDown.do를 찾는다.
  const downloadRegex = /href="(\/cmm\/fms\/fileDown\.do\?[^"]+)"/g;

  // viewRegex / downloadRegex 매치 위치를 모두 모아서 페어링
  const viewMatches: { idx: number; ext: string; pathBase: string; pathFile: string; filename: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = viewRegex.exec(html)) !== null) {
    viewMatches.push({
      idx: m.index,
      ext: m[1].toLowerCase(),
      pathBase: m[2],
      pathFile: m[3],
      filename: decodeHtml(m[4]),
    });
  }

  const downloadMatches: { idx: number; href: string }[] = [];
  while ((m = downloadRegex.exec(html)) !== null) {
    downloadMatches.push({ idx: m.index, href: m[1].replace(/&amp;/g, "&") });
  }

  for (const v of viewMatches) {
    // viewMatch 이후 가장 가까운 fileDown.do (양식상 같은 div에 즉시 따라옴)
    const next = downloadMatches.find((d) => d.idx > v.idx && d.idx - v.idx < 800);
    if (!next) continue;
    out.push({
      filename: v.filename,
      ext: v.ext,
      downloadUrl: BIZINFO_BASE + next.href,
      inlineViewPath: BIZINFO_BASE + v.pathBase + "/" + v.pathFile,
    });
  }

  // viewMatch가 0개거나 downloadRegex와 짝이 안 맞으면 fileDown.do만 따로 모은다 (fallback)
  if (out.length === 0) {
    const titleRegex =
      /href="(\/cmm\/fms\/fileDown\.do\?[^"]+)"[^>]*title="첨부파일\s*([^"]+?)\s*다운로드/g;
    while ((m = titleRegex.exec(html)) !== null) {
      const filename = decodeHtml(m[2]);
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      out.push({
        filename,
        ext,
        downloadUrl: BIZINFO_BASE + m[1].replace(/&amp;/g, "&"),
      });
    }
  }

  // 중복 제거 (같은 downloadUrl)
  const seen = new Set<string>();
  return out.filter((a) => {
    if (seen.has(a.downloadUrl)) return false;
    seen.add(a.downloadUrl);
    return true;
  });
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ── LLM 폴백 ──────────────────────────────────────────────────────────────────

async function extractAttachmentsLLM(html: string): Promise<GrantAttachment[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your_gemini_api_key_here") return [];

  // 첨부 영역만 거칠게 잘라 토큰 절약
  const sliceStart = html.indexOf("첨부파일");
  const slice = sliceStart >= 0 ? html.slice(sliceStart, sliceStart + 5000) : html.slice(0, 5000);

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
  const prompt = `다음 HTML 조각에서 첨부파일 정보를 추출해 JSON 배열로만 출력하라.
각 원소: {"filename": "...", "ext": "hwp|hwpx|pdf|zip", "downloadPath": "/cmm/fms/fileDown.do?..."}
JSON 외 텍스트 금지.

HTML:
${slice}`;
  const r = await model.generateContent(prompt);
  const text = r.response.text();
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x: { downloadPath?: string }) => x?.downloadPath)
      .map((x: { filename: string; ext: string; downloadPath: string }) => ({
        filename: x.filename,
        ext: (x.ext || "").toLowerCase(),
        downloadUrl: BIZINFO_BASE + x.downloadPath,
      }));
  } catch {
    return [];
  }
}

// ── 다운로드 ──────────────────────────────────────────────────────────────────

/**
 * 첨부 파일을 실제로 다운로드해 ArrayBuffer로 돌려준다.
 *
 * bizinfo는 Content-Disposition으로 한글 파일명을 EUC-KR/MS949로 보내는 경우가 있어
 * 파일명은 호출자가 이미 알고 있는 걸 우선 사용한다.
 */
export async function downloadAttachment(downloadUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(downloadUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Referer: BIZINFO_BASE,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`첨부 다운로드 실패: HTTP ${res.status}`);
  }
  return await res.arrayBuffer();
}
