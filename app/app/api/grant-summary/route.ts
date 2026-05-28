/**
 * 사장님 친화 한 줄 요약 API
 *
 * 인터뷰 인사이트 #2 반영:
 * "공고 제목이 너무 딱딱해서 뭐 하는 사업인지 모르겠어요."
 *
 * Iteration 2: Gemini Flash로 실제 요약 생성.
 *   - 학원/카페/음식점 사장님이 읽기 좋게 풀어서 한 문장.
 *   - 전문 용어는 풀어쓰고 혜택을 앞에 둠.
 *   - API 키 없거나 실패하면 폴백.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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
  return `${title} — 사장님께 도움될 수 있는 정부 지원사업이에요. 자세한 조건은 본문을 확인해주세요.`;
}

export async function POST(request: Request) {
  let body: { grantTitle?: string; grantDescription?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.grantTitle?.trim();
  const description = body.grantDescription?.trim() ?? "";

  if (!title) {
    return Response.json(
      { ok: false, error: "grantTitle is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return Response.json({ ok: true, summary: fallback(title), source: "fallback" });
  }

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(PROMPT(title, description));
    const text = result.response.text().trim().replace(/^["']|["']$/g, "");

    if (!text) {
      return Response.json({ ok: true, summary: fallback(title), source: "fallback" });
    }
    return Response.json({ ok: true, summary: text, source: "gemini" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({
      ok: true,
      summary: fallback(title),
      source: "fallback",
      warning: msg,
    });
  }
}
