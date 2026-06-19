import { NextRequest } from "next/server";
import { GoogleGenerativeAI, Tool } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { BIZ_TYPES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const extraText = formData.get("extraText") as string | null;

    if (!file && !text && !extraText) {
      return Response.json(
        { error: "파일 또는 사업 설명을 입력해주세요." },
        { status: 400 }
      );
    }

    let inputContent = "";

    if (file) {
      // 이미지 또는 PDF는 Gemini Vision으로 분석
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        return analyzeWithVision(file, extraText);
      }
      // 텍스트 파일인 경우 텍스트 추출
      const buffer = await file.arrayBuffer();
      inputContent = new TextDecoder("utf-8").decode(buffer);
    } else if (text) {
      inputContent = text;
    }

    if (extraText) {
      inputContent = inputContent
        ? `${inputContent}\n\n${extraText}`
        : extraText;
    }

    return analyzeText(inputContent);
  } catch (error) {
    console.error("Analyze error:", error);
    return Response.json(
      { error: "문서 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

const EXTRACT_PROMPT = `당신은 대한민국 정부지원사업 매칭 전문가입니다. 사업자등록증, 사업 서류, 추가 입력 정보를 종합하여 분석합니다.

아래 내용에서 다음 정보를 추출해주세요. 명시적으로 나와있지 않은 항목은 문맥에서 최대한 추론하세요.
[추가 입력 정보] 섹션이 있다면 반드시 우선적으로 반영하고, 문서 내용과 함께 종합적으로 판단하세요.

추출할 정보:
1. bizType: 업종 (${BIZ_TYPES.join(", ")} 중 하나)
2. revenue: 연 매출 추정 (5천만원 미만, 5천만~1억, 1억~3억, 3억~5억, 5억~10억, 10억 이상 중 하나)
3. region: 지역 (전국, 서울, 경기, 인천, 부산, 대구, 광주, 대전, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주 중 하나)
4. bizAge: 업력 (예비 창업, 1년 미만, 1~3년, 3~5년, 5~7년, 7년 이상 중 하나)
5. ceoAge: 대표자 나이대 (만 29세 이하, 만 30~39세, 만 40~49세, 만 50~59세, 만 60세 이상 중 하나)
6. employeeCount: 상시 직원 수 (없음, 1~4명, 5~9명, 10~49명, 50명 이상 중 하나). 추가 입력 정보에 명시된 경우 그대로 사용.
7. ceoGender: 대표자 성별 (남성, 여성 중 하나). 추가 입력 정보에 명시된 경우 그대로 사용.
8. certifications: 해당 인증·특성 목록 (벤처기업 인증, 이노비즈 인증, 수출 기업, 특허·IP 보유, 여성 대표자, 장애인 기업 중 해당하는 것들의 배열). 추가 입력 정보에 명시된 경우 그대로 사용.
9. summary: 이 사업에 대한 간단한 요약 (2~3문장). 직원 수, 인증, 대표자 특성 등을 포함해 지원사업 관점에서 작성.
10. keywords: 정부지원사업 매칭에 유용한 키워드 5~8개. 업종, 지역, 인증, 기술분야, 규모 등을 반영.
11. companyName: 상호명/법인명. 사업자등록증에서 정확히 추출, 없으면 "".
12. businessNumber: 사업자등록번호 (하이픈 포함 형식 그대로). 사업자등록증에서 정확히 추출, 없으면 "".

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "bizType": "...",
  "revenue": "...",
  "region": "...",
  "bizAge": "...",
  "ceoAge": "...",
  "employeeCount": "...",
  "ceoGender": "...",
  "certifications": ["...", "..."],
  "summary": "...",
  "keywords": ["...", "..."],
  "companyName": "...",
  "businessNumber": "..."
}

추출할 수 없는 항목은 빈 문자열("") 또는 빈 배열([])로 남겨주세요.`;

async function analyzeWithVision(file: File, extraText?: string | null) {
  const genAI = getGemini();
  if (!genAI) {
    console.error("[analyze-doc] GEMINI_API_KEY not set");
    return Response.json(
      { error: "Gemini API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  console.log(`[analyze-doc] vision analysis: ${file.name} (${file.type}, ${Math.round(buffer.byteLength / 1024)}KB)`);

  const extraSection = extraText
    ? `\n\n${extraText}`
    : "";

  try {
    const result = await model.generateContent([
      EXTRACT_PROMPT + "\n\n[분석 대상: 업로드된 파일 (사업자등록증 또는 사업 관련 서류)]" + extraSection,
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[analyze-doc] JSON parse failed:", cleaned.slice(0, 200));
      return Response.json({ error: "AI 응답을 파싱하지 못했습니다.", raw: cleaned });
    }

    // 웹 검색 그라운딩으로 summary/keywords 보강 (best-effort, 실패해도 무시)
    const enriched = await enrichWithWebSearch(genAI, parsed);
    return Response.json({ result: enriched });
  } catch (e) {
    console.error("[analyze-doc] Gemini vision error:", e);
    return Response.json(
      { error: `Gemini 분석 실패: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

async function analyzeText(content: string) {
  // Gemini 우선
  const genAI = getGemini();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(
        EXTRACT_PROMPT + `\n\n[분석 대상 텍스트]\n${content.slice(0, 8000)}`
      );
      const text = result.response.text();
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return Response.json({ result: JSON.parse(cleaned) });
    } catch (e) {
      console.error("[Gemini text] failed:", e);
    }
  }

  // Claude 폴백
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    const anthropic = new Anthropic({ apiKey: claudeKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: EXTRACT_PROMPT + `\n\n[분석 대상 텍스트]\n${content.slice(0, 8000)}`,
        },
      ],
    });
    const text = message.content[0];
    if (text.type === "text") {
      try {
        return Response.json({ result: JSON.parse(text.text) });
      } catch {
        return Response.json({ result: null, raw: text.text });
      }
    }
  }

  return Response.json(
    { error: "AI API 키가 설정되지 않았습니다." },
    { status: 500 }
  );
}

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your_gemini_api_key_here") return null;
  return new GoogleGenerativeAI(key);
}

// OCR keywords 우선, 보강 keywords union (중복 제거, 최대 10개)
export function mergeKeywords(ocr: unknown, extra: unknown): string[] {
  const norm = (v: unknown) =>
    Array.isArray(v) ? v.filter((k): k is string => typeof k === "string" && k.trim() !== "").map(k => k.trim()) : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of [...norm(ocr), ...norm(extra)]) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 10) break;
  }
  return out;
}

// 보강 summary 가 더 길고 비어있지 않을 때만 교체, 아니면 OCR summary 유지
export function mergeSummary(ocr: unknown, extra: unknown): string {
  const o = typeof ocr === "string" ? ocr.trim() : "";
  const e = typeof extra === "string" ? extra.trim() : "";
  return e && e.length > o.length ? e : o;
}

// companyName 이 있으면 웹 검색 그라운딩으로 summary/keywords 보강.
// 어떤 실패든 OCR 결과 그대로 반환 (절대 throw 안 함).
async function enrichWithWebSearch(
  genAI: GoogleGenerativeAI,
  ocr: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const companyName = typeof ocr.companyName === "string" ? ocr.companyName.trim() : "";
  if (!companyName) return ocr;

  try {
    // gemini-2.0+ 의 검색 도구 키는 googleSearch (1.5 의 googleSearchRetrieval 아님).
    // SDK 0.24.1 의 Tool 타입엔 googleSearch 가 없어 캐스팅으로 전달.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }] as unknown as Tool[],
    });

    const prompt = `다음 회사를 웹에서 검색해 실제 사업분야·주력 제품/서비스·기술 키워드·업종 세부를 파악하세요.
회사명: ${companyName}
사업자등록번호: ${typeof ocr.businessNumber === "string" ? ocr.businessNumber : ""}
지역: ${typeof ocr.region === "string" ? ocr.region : ""}
업종(추정): ${typeof ocr.bizType === "string" ? ocr.bizType : ""}
기존 요약: ${typeof ocr.summary === "string" ? ocr.summary : ""}

정부지원사업 매칭에 유용하도록 (1) 보강된 summary(2~3문장) (2) 추가 keywords 배열을 아래 JSON 으로만 반환하세요. 회사를 못 찾으면 빈 값으로 두세요.
{"summary":"...","keywords":["..."]}`;

    // 10초 타임아웃 가드
    const gen = model.generateContent(prompt);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("enrich timeout")), 10_000)
    );
    const result = await Promise.race([gen, timeout]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return ocr;
    const extra = JSON.parse(cleaned.slice(start, end + 1));

    return {
      ...ocr,
      summary: mergeSummary(ocr.summary, extra.summary),
      keywords: mergeKeywords(ocr.keywords, extra.keywords),
    };
  } catch (e) {
    console.error("[analyze-doc] web search enrichment failed:", e instanceof Error ? e.message : e);
    return ocr;
  }
}
