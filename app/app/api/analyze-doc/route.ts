import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    if (!file && !text) {
      return Response.json(
        { error: "파일 또는 사업 설명을 입력해주세요." },
        { status: 400 }
      );
    }

    let inputContent = "";

    if (file) {
      // 이미지 파일인 경우 Gemini Vision으로 분석
      if (file.type.startsWith("image/")) {
        return analyzeWithVision(file);
      }
      // 텍스트/PDF인 경우 텍스트 추출
      const buffer = await file.arrayBuffer();
      inputContent = new TextDecoder("utf-8").decode(buffer);
    } else if (text) {
      inputContent = text;
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

const EXTRACT_PROMPT = `당신은 대한민국 사업자등록증 및 사업 서류 분석 전문가입니다.

아래 내용에서 다음 정보를 추출해주세요. 명시적으로 나와있지 않은 항목은 문맥에서 최대한 추론하세요.

추출할 정보:
1. bizType: 업종 (음식점·외식, 소매·유통, 제조, IT·소프트웨어, 서비스업, 교육, 건설, 농림수산, 기타 중 하나)
2. revenue: 연 매출 추정 (5천만원 미만, 5천만~1억, 1억~3억, 3억~5억, 5억~10억, 10억 이상 중 하나)
3. region: 지역 (전국, 서울, 경기, 인천, 부산, 대구, 광주, 대전, 울산, 세종, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주 중 하나)
4. bizAge: 업력 (예비 창업, 1년 미만, 1~3년, 3~5년, 5~7년, 7년 이상 중 하나)
5. ceoAge: 대표자 나이대 (만 29세 이하, 만 30~39세, 만 40~49세, 만 50~59세, 만 60세 이상 중 하나)
6. summary: 이 사업에 대한 간단한 요약 (2~3문장)
7. keywords: 지원사업 매칭에 유용한 키워드 3~5개

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "bizType": "...",
  "revenue": "...",
  "region": "...",
  "bizAge": "...",
  "ceoAge": "...",
  "summary": "...",
  "keywords": ["...", "..."]
}

추출할 수 없는 항목은 빈 문자열("")로 남겨주세요.`;

async function analyzeWithVision(file: File) {
  const genAI = getGemini();
  if (!genAI) {
    return Response.json(
      { error: "Gemini API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const result = await model.generateContent([
    EXTRACT_PROMPT + "\n\n[분석 대상: 업로드된 이미지 (사업자등록증 또는 사업 관련 서류)]",
    {
      inlineData: {
        mimeType: file.type,
        data: base64,
      },
    },
  ]);

  const text = result.response.text();
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return Response.json({ result: JSON.parse(cleaned) });
  } catch {
    return Response.json({ result: null, raw: cleaned });
  }
}

async function analyzeText(content: string) {
  // Gemini 우선
  const genAI = getGemini();
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
