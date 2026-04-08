import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ──

export interface ScrapedDoc {
  docName: string;
  sections: string[];
}

export interface ScrapedGrantDetails {
  requiredDocs: ScrapedDoc[];
  requirements: string;
  deadline: string;
  amount: string;
}

// ── In-memory cache (24hr TTL) ──

interface CacheEntry {
  data: ScrapedGrantDetails;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(pblancId: string): ScrapedGrantDetails | null {
  const entry = cache.get(pblancId);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(pblancId);
    return null;
  }
  return entry.data;
}

function setCache(pblancId: string, data: ScrapedGrantDetails) {
  cache.set(pblancId, { data, expiry: Date.now() + TTL_MS });
}

// ── Main scraper ──

export async function scrapeGrantDetails(
  pblancId: string
): Promise<ScrapedGrantDetails | null> {
  // Check cache first
  const cached = getCached(pblancId);
  if (cached) {
    console.log(`[GrantScraper] Cache hit for ${pblancId}`);
    return cached;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
    console.error("[GrantScraper] Gemini API key not configured");
    return null;
  }

  try {
    // Fetch the grant announcement page
    const url = `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancId}`;
    console.log(`[GrantScraper] Fetching ${url}`);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[GrantScraper] HTTP ${res.status} for ${pblancId}`);
      return null;
    }

    const html = await res.text();

    // Trim HTML to reduce token usage — keep only the main content area
    const trimmed = trimHtml(html);
    if (trimmed.length < 200) {
      console.error("[GrantScraper] Page content too short, may be blocked");
      return null;
    }

    // Use Gemini to extract structured data
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0 },
    });

    const prompt = `당신은 정부 지원사업 공고 분석 전문가입니다.
아래 HTML은 기업마당(bizinfo.go.kr)의 지원사업 공고 페이지입니다.

이 공고에서 다음 정보를 추출해주세요:

1. **제출서류 목록**: 신청자가 제출해야 하는 문서들과 각 문서에 포함해야 할 항목/섹션
2. **신청 자격 요건**: 지원 대상, 자격 조건
3. **마감일**: 신청 마감일
4. **지원 금액**: 지원 규모

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요:

{
  "requiredDocs": [
    {
      "docName": "문서명 (예: 사업계획서)",
      "sections": [
        "[1. 섹션제목]\\n- 포함해야 할 세부 항목 설명",
        "[2. 섹션제목]\\n- 포함해야 할 세부 항목 설명"
      ]
    }
  ],
  "requirements": "신청 자격 요건 요약 (한 문단)",
  "deadline": "마감일 (예: 2026-04-30)",
  "amount": "지원 금액 (예: 최대 1억원)"
}

주의사항:
- 제출서류가 명시되지 않은 경우, 공고 내용에서 유추하여 사업계획서의 필수 항목을 sections로 구성하세요.
- 각 section은 실제 작성 시 도움이 되도록 구체적으로 적어주세요.
- sections에는 대괄호 제목 + 하위 항목(- 로 시작) 형식을 사용하세요.

=== HTML 시작 ===
${trimmed.slice(0, 30000)}
=== HTML 끝 ===`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON from response (handle markdown code block wrapper)
    const jsonStr = text.startsWith("```")
      ? text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : text;

    const parsed: ScrapedGrantDetails = JSON.parse(jsonStr);

    // Validate structure
    if (
      !parsed.requiredDocs ||
      !Array.isArray(parsed.requiredDocs) ||
      parsed.requiredDocs.length === 0
    ) {
      console.error("[GrantScraper] Invalid parsed data — no requiredDocs");
      return null;
    }

    // Ensure each doc has sections
    for (const doc of parsed.requiredDocs) {
      if (!doc.sections || doc.sections.length === 0) {
        doc.sections = [`[${doc.docName} 작성]\n- 공고 원문을 참고하여 작성`];
      }
    }

    // Cache and return
    setCache(pblancId, parsed);
    console.log(
      `[GrantScraper] Extracted ${parsed.requiredDocs.length} docs for ${pblancId}`
    );
    return parsed;
  } catch (err) {
    console.error("[GrantScraper] Error:", err);
    return null;
  }
}

/**
 * Trim HTML to keep only the main content area, stripping scripts/styles/nav.
 */
function trimHtml(html: string): string {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to extract the main content area
  const contentMatch =
    cleaned.match(/<div[^>]*class="[^"]*view[^"]*"[^>]*>[\s\S]*$/i) ||
    cleaned.match(/<div[^>]*id="[^"]*content[^"]*"[^>]*>[\s\S]*$/i) ||
    cleaned.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>[\s\S]*$/i);

  if (contentMatch) {
    cleaned = contentMatch[0];
  }

  // Strip remaining HTML tags but keep text content structure
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();

  return cleaned;
}
