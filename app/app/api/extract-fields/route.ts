import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

// 자유 형식 사업 소개 텍스트(`bizInfo`) → HWPX 양식 채우기에 쓸 키-값 답변 객체를 추출.
//
// hwp-filler 사이드카가 인식하는 표준 필드 키 목록과 일치시킨다.
// (services/hwp-filler/app/label_map.json 의 키와 동일.)
const KNOWN_FIELDS = [
  "companyName", "ceoName", "bizNumber", "corpNumber", "address",
  "phone", "email", "foundedDate", "bizType", "bizItem",
  "employees", "revenue", "capital", "applyAmount", "projectName", "applyDate",
] as const;

// 한글 라벨로 답을 만들면 사이드카의 정규화 매칭이 그대로 잡아주므로
// LLM 출력은 한글 라벨 키 + 영문 표준 키를 모두 허용한다.

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { bizInfo, grantTitle } = await request.json();
    if (!bizInfo || typeof bizInfo !== "string" || bizInfo.trim().length < 5) {
      return Response.json({ error: "bizInfo가 너무 짧거나 비어있습니다." }, { status: 400 });
    }

    const prompt = `너는 정부 지원사업 신청서의 표 셀에 들어갈 값을 자유 텍스트에서 뽑아내는 도우미다.

[아래 텍스트]에서 다음 표준 필드들의 값을 가능한 만큼 추출해서 정확한 JSON 객체로 출력하라.
모르거나 글에 없는 값은 키 자체를 생략한다. 추측 금지. JSON 외 다른 문자 절대 금지.

표준 필드 키 (영문):
${KNOWN_FIELDS.join(", ")}

각 키의 의미:
- companyName: 기업명/회사명/상호
- ceoName: 대표자 성명
- bizNumber: 사업자등록번호
- corpNumber: 법인등록번호
- address: 사업장 주소
- phone: 전화번호/연락처
- email: 이메일
- foundedDate: 설립일/창업일
- bizType: 업종
- bizItem: 종목/주생산품
- employees: 종업원수
- revenue: 매출액
- capital: 자본금
- applyAmount: 신청금액
- projectName: 사업명/과제명 (없으면 '${grantTitle || ""}')
- applyDate: 신청일

[지원사업명]
${grantTitle || "(미지정)"}

[텍스트]
${bizInfo.slice(0, 6000)}

JSON만 출력:`;

    const text = await runLLM(prompt);
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // 가장 첫 번째 { ... } 블록만 추려 한번 더 시도
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) {
        return Response.json(
          { error: "LLM 응답을 JSON으로 파싱하지 못했습니다.", raw: text.slice(0, 500) },
          { status: 502 }
        );
      }
      parsed = JSON.parse(m[0]);
    }

    // 표준 필드 키만 살리기
    const answers: Record<string, string> = {};
    for (const k of KNOWN_FIELDS) {
      const v = parsed[k];
      if (typeof v === "string" && v.trim()) answers[k] = v.trim();
    }

    return Response.json({ answers, count: Object.keys(answers).length });
  } catch (e) {
    console.error("[extract-fields] error:", e);
    return Response.json(
      { error: "필드 추출 중 오류", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

async function runLLM(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { temperature: 0 },
      });
      const r = await model.generateContent(prompt);
      return r.response.text();
    } catch (e) {
      console.warn("[extract-fields] gemini failed, falling back to claude:", e);
    }
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    const anthropic = new Anthropic({ apiKey: claudeKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const c = msg.content[0];
    if (c.type === "text") return c.text;
  }

  throw new Error("LLM API 키가 설정돼 있지 않습니다.");
}
