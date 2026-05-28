/**
 * 사장님 친화 한 줄 요약 API
 *
 * 인터뷰 인사이트 #2 반영:
 * "공고 제목이 너무 딱딱해서 뭐 하는 사업인지 모르겠어요."
 *
 * Iteration 3: 프로덕션 보강.
 *   - 인메모리 LRU 캐시 (grantId 기준, 24h TTL)
 *   - Gemini 호출 시 6초 타임아웃
 *   - 50자 초과 시 잘라내고 말줄임표
 *   - 응답에 cached 플래그 + ttlSeconds 노출
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

type CacheEntry = { summary: string; source: "gemini" | "fallback"; ts: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 500;

function cleanup() {
  const now = Date.now();
  for (const [k, v] of CACHE) if (now - v.ts > TTL_MS) CACHE.delete(k);
  if (CACHE.size > MAX_CACHE) {
    // drop oldest
    const sorted = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < sorted.length - MAX_CACHE; i++) CACHE.delete(sorted[i][0]);
  }
}

const PROMPT = (title: string, description: string) => `
당신은 소상공인(학원/카페/음식점 사장님)을 돕는 친근한 상담사입니다.
아래 정부 지원사업을 사장님이 한눈에 이해할 수 있도록 "한 문장"으로 풀어 설명하세요.

규칙:
- 50자 이내, 한 문장
- 공문서 용어는 일상어로 (예: "운영자금" → "가게 운영비")
- 혜택(돈/지원)을 문장 앞에 두기
- 존댓말, 친근한 톤
- 따옴표/마크다운/이모지 금지

제목: ${title}
설명: ${description.slice(0, 800)}

한 문장 요약:`.trim();

function fallback(title: string): string {
  return `${title.slice(0, 30)} 관련 정부 지원사업이에요. 자세한 조건은 본문을 확인해주세요.`;
}

function clip(text: string, max = 80): string {
  const cleaned = text.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + "…";
}

async function callGemini(title: string, description: string, signal: AbortSignal) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") return null;

  const genai = new GoogleGenerativeAI(apiKey);
  const model = genai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  // Race against timeout
  const result = await Promise.race([
    model.generateContent(PROMPT(title, description)),
    new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () =>
        reject(new Error("Gemini timeout (6s)"))
      );
    }),
  ]);
  return result.response.text();
}

export async function POST(request: Request) {
  let body: { grantId?: string; grantTitle?: string; grantDescription?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.grantId?.trim();
  const title = body.grantTitle?.trim();
  const description = body.grantDescription?.trim() ?? "";

  if (!title) {
    return Response.json(
      { ok: false, error: "grantTitle is required" },
      { status: 400 },
    );
  }

  // Cache lookup
  cleanup();
  const cacheKey = id ?? title;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.ts < TTL_MS) {
    return Response.json({
      ok: true,
      summary: hit.summary,
      source: hit.source,
      cached: true,
      ttlSeconds: Math.floor((TTL_MS - (Date.now() - hit.ts)) / 1000),
    });
  }

  // Gemini call with 6s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const raw = await callGemini(title, description, controller.signal);
    if (raw) {
      const summary = clip(raw);
      if (summary) {
        CACHE.set(cacheKey, { summary, source: "gemini", ts: Date.now() });
        return Response.json({
          ok: true,
          summary,
          source: "gemini",
          cached: false,
        });
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const fb = fallback(title);
    CACHE.set(cacheKey, { summary: fb, source: "fallback", ts: Date.now() });
    return Response.json({
      ok: true,
      summary: fb,
      source: "fallback",
      cached: false,
      warning: msg,
    });
  } finally {
    clearTimeout(timeout);
  }

  // No API key or empty response
  const fb = fallback(title);
  CACHE.set(cacheKey, { summary: fb, source: "fallback", ts: Date.now() });
  return Response.json({ ok: true, summary: fb, source: "fallback", cached: false });
}
