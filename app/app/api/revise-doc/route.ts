import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalSection, feedback, grantTitle, bizInfo } = body;

    if (!originalSection || !feedback) {
      return Response.json(
        { error: "originalSection과 feedback은 필수입니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0 },
    });

    const prompt = `당신은 정부 지원사업 신청서 전문 작성 컨설턴트입니다.

지원사업: ${grantTitle || "미지정"}
사업 정보: ${bizInfo || "없음"}

아래는 신청서의 한 섹션입니다. 사용자의 수정 요청에 맞게 해당 부분만 수정하세요.
원본 섹션의 구조와 나머지 내용은 최대한 보존하세요. 섹션 제목(예: [1. ...])도 그대로 유지하세요.

=== 원본 섹션 ===
${originalSection}

=== 사용자 수정 요청 ===
${feedback}

=== 수정된 섹션 (위 원본과 동일한 형식으로 출력) ===`;

    const result = await model.generateContent(prompt);
    const revisedSection = result.response.text().trim();

    return Response.json({ revisedSection });
  } catch (error: unknown) {
    console.error("revise-doc error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return Response.json({ error: message }, { status: 500 });
  }
}
