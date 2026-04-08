import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 지원사업별 필수 포함 정보 체크리스트
export const GRANT_CHECKLISTS: Record<string, { name: string; items: { id: string; label: string; desc: string }[] }> = {
  "예비창업패키지": {
    name: "예비창업패키지",
    items: [
      { id: "service_name", label: "서비스/제품명", desc: "개발하려는 서비스 또는 제품의 명칭" },
      { id: "biz_type", label: "업종/분야", desc: "IT, 제조, 서비스업 등 사업 분야" },
      { id: "problem", label: "해결하려는 문제", desc: "고객의 Pain Point 또는 시장 문제" },
      { id: "solution", label: "솔루션/핵심 기술", desc: "문제 해결 방법 및 핵심 기술 스택" },
      { id: "differentiation", label: "차별화 요소", desc: "경쟁 서비스 대비 우위 포인트" },
      { id: "mvp_status", label: "MVP/시제품 현황", desc: "현재 개발 단계 또는 시제품 상태" },
      { id: "target_market", label: "목표 시장/고객", desc: "타겟 고객층 및 시장 규모" },
      { id: "biz_model", label: "수익 모델", desc: "비즈니스 모델 및 가격 정책" },
      { id: "ceo_career", label: "대표자 경력/역량", desc: "대표자의 학력, 경력, 전문성" },
      { id: "team", label: "팀 구성", desc: "팀원 구성 현황 또는 채용 계획" },
      { id: "funding_plan", label: "자금 운용 계획", desc: "필요 자금 총액 및 항목별 내역" },
      { id: "ip_plan", label: "지식재산권 계획", desc: "특허, 상표 등 IP 확보 전략" },
    ],
  },
  "초기창업패키지": {
    name: "초기창업패키지",
    items: [
      { id: "company_info", label: "기업 현황", desc: "설립일, 주요 연혁, 현재 매출/고용" },
      { id: "service_name", label: "서비스/제품명", desc: "개발 중인 서비스 또는 제품의 명칭" },
      { id: "biz_type", label: "업종/분야", desc: "IT, 제조, 서비스업 등 사업 분야" },
      { id: "achievements", label: "핵심 성과", desc: "기 확보 고객, 매출, 투자 유치 실적" },
      { id: "problem", label: "시장 Pain Point", desc: "타겟 고객이 겪는 구체적 문제" },
      { id: "market_size", label: "시장 규모", desc: "TAM-SAM-SOM 기반 시장 규모 추정" },
      { id: "core_tech", label: "핵심 기술 상세", desc: "기술 스택, 구현 방법론" },
      { id: "differentiation", label: "차별화 요소", desc: "경쟁 서비스 대비 기술적 우위" },
      { id: "biz_model", label: "BM/수익 구조", desc: "비즈니스 모델 및 가격 정책" },
      { id: "go_to_market", label: "GTM 전략", desc: "고객 획득 채널 및 마케팅 전략" },
      { id: "ceo_career", label: "대표자 이력", desc: "대표자의 해당 분야 경험" },
      { id: "team", label: "핵심 인력", desc: "팀 구성 및 역할 분담" },
      { id: "funding_plan", label: "사업비 집행 계획", desc: "항목별 예산 및 분기별 스케줄" },
      { id: "ip_status", label: "지식재산권 현황", desc: "확보 또는 계획 중인 IP" },
    ],
  },
  "default": {
    name: "정부 지원사업 표준",
    items: [
      { id: "service_name", label: "서비스/제품명", desc: "사업 아이템의 명칭" },
      { id: "biz_type", label: "업종/분야", desc: "사업 분야 및 업종" },
      { id: "problem", label: "해결 문제", desc: "해결하려는 문제 정의" },
      { id: "solution", label: "솔루션", desc: "문제 해결 방법" },
      { id: "target_market", label: "타겟 시장", desc: "목표 고객 및 시장" },
      { id: "biz_model", label: "수익 모델", desc: "비즈니스 모델" },
      { id: "ceo_career", label: "대표자 역량", desc: "대표자 경력" },
      { id: "team", label: "팀 구성", desc: "팀원 현황" },
      { id: "funding_plan", label: "사업비 계획", desc: "자금 운용 내역" },
    ],
  },
};

export function getChecklist(grantTitle: string) {
  for (const key of Object.keys(GRANT_CHECKLISTS)) {
    if (key !== "default" && grantTitle.includes(key)) {
      return GRANT_CHECKLISTS[key];
    }
  }
  return GRANT_CHECKLISTS["default"];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;
    const grantTitle = formData.get("grantTitle") as string || "";

    if (!file && !text) {
      return Response.json({ error: "파일 또는 텍스트를 입력해주세요." }, { status: 400 });
    }

    const checklist = getChecklist(grantTitle);
    const itemIds = checklist.items.map(i => i.id);
    const itemLabels = checklist.items.map(i => `${i.id}: ${i.label} (${i.desc})`).join("\n");

    const checkPrompt = `당신은 정부 지원사업 서류 분석 전문가입니다.

아래 문서/정보에서 다음 체크리스트 항목에 해당하는 정보가 포함되어 있는지 확인해주세요.

## 체크리스트 항목:
${itemLabels}

## 규칙:
- 각 항목에 대해 해당 정보가 문서에 포함되어 있으면 true, 없으면 false
- 포함된 경우 해당 내용을 간략히 요약 (20자 이내)
- 반드시 JSON 형식으로만 응답 (마크다운 없이)

응답 형식:
{
  "checks": {
    "${itemIds[0]}": { "found": true, "excerpt": "관련 내용 요약" },
    "${itemIds[1]}": { "found": false, "excerpt": "" }
  },
  "extractedBizInfo": "이 문서에서 추출한 사업 정보 전체를 자연어로 요약 (사업계획서 작성에 활용)"
}`;

    let content = "";
    let isImage = false;

    if (file) {
      if (file.type.startsWith("image/")) {
        isImage = true;
      } else {
        const buffer = await file.arrayBuffer();
        content = new TextDecoder("utf-8").decode(buffer);
      }
    }
    if (text) {
      content += (content ? "\n\n" : "") + text;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === "your_gemini_api_key_here") {
      return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let result;
    if (isImage && file) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      result = await model.generateContent([
        checkPrompt + "\n\n[분석 대상: 업로드된 이미지]",
        { inlineData: { mimeType: file.type, data: base64 } },
      ]);
    } else {
      result = await model.generateContent(
        checkPrompt + `\n\n[분석 대상 텍스트]\n${content.slice(0, 8000)}`
      );
    }

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return Response.json({ checklist: checklist.items, checks: parsed.checks, extractedBizInfo: parsed.extractedBizInfo });
    } catch {
      return Response.json({ checklist: checklist.items, checks: {}, extractedBizInfo: "", raw: cleaned });
    }
  } catch (error) {
    console.error("[CheckDoc] Error:", error);
    return Response.json({ error: "문서 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
