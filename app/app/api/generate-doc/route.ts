import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { scrapeGrantDetails } from "@/lib/grant-scraper";

// ── 지원사업별 제출 양식 (실제 공고에서 요구하는 문서 + 항목) ──

interface DocTemplate {
  docName: string;       // 문서명
  sections: string[];    // 양식 항목
}

interface GrantTemplate {
  name: string;
  docs: DocTemplate[];   // 제출해야 할 문서 목록
}

const GRANT_TEMPLATES: Record<string, GrantTemplate> = {
  "예비창업패키지": {
    name: "예비창업패키지",
    docs: [
      {
        docName: "사업계획서",
        sections: [
          "[1. 창업 아이템 개요]\n- 아이템명, 아이템 소개 (핵심 기능과 서비스 내용을 300자 이내로 기술)\n- 창업 동기 및 배경 (왜 이 사업을 시작하게 되었는지 구체적 경험이나 계기)",
          "[2. 문제 인식 및 필요성]\n- 해결하고자 하는 문제 정의 (고객이 겪는 구체적 불편/Pain Point)\n- 기존 해결 방식의 한계점\n- 본 아이템의 필요성 (정량적 근거 포함)",
          "[3. 실현 가능성]\n- 핵심 기술/서비스 구현 방안 (기술 스택, 개발 로드맵)\n- 기술 차별성 (경쟁 서비스 대비 우위 요소)\n- 시제품/MVP 현황 또는 계획\n- 지식재산권 확보 계획 (특허, 상표 등)",
          "[4. 성장 전략]\n- 목표 시장 분석 (TAM-SAM-SOM 모델)\n- 비즈니스 모델 (수익 구조, 가격 정책)\n- 고객 획득 전략 (마케팅 채널, 초기 사용자 확보 방안)\n- 3개년 매출 계획",
          "[5. 팀 구성]\n- 대표자 역량 (학력, 경력, 해당 분야 전문성)\n- 팀원 구성 현황 또는 채용 계획\n- 외부 자문/멘토 네트워크",
          "[6. 자금 운용 계획]\n- 총 소요 자금 및 항목별 세부 내역\n- 정부지원금 활용 계획 (항목별 금액)\n- 자부담금 계획\n※ 인건비/마케팅비/재료비/외주용역비/지식재산권비/기타 항목별 마크다운 표 작성",
        ],
      },
      {
        docName: "창업 아이템 요약서 (1페이지)",
        sections: [
          "- 아이템명 / 업종 / 대표자 성명\n- 아이템 한줄 소개 (50자 이내)\n- 해결하는 문제 (3줄 이내)\n- 핵심 기술 및 차별점 (3줄 이내)\n- 목표 시장 및 규모\n- 비즈니스 모델 (수익 구조)\n- 필요 자금 및 활용 계획 (간략 표)\n- 대표자 핵심 역량 (2줄 이내)",
        ],
      },
      {
        docName: "자금 소요 명세서",
        sections: [
          "아래 항목을 마크다운 표 형식으로 상세 작성:\n\n| 비목 | 세목 | 산출근거 | 금액(천원) |\n|------|------|---------|----------|\n| 인건비 | 연구원 인건비 | 0명 × 월급 × 개월 | |\n| 재료비 | 시제품 재료 | 품목 × 수량 × 단가 | |\n| 외주용역비 | 디자인/개발 | 업체명 × 건 | |\n| 마케팅비 | 온라인 광고 | 채널 × 월 × 단가 | |\n| 지식재산권비 | 특허 출원 | 건수 × 단가 | |\n| 기타 | 기자재, 여비 등 | 품목별 산출 | |\n\n- 합계 및 정부지원금/자부담 비율 명시",
        ],
      },
    ],
  },
  "초기창업패키지": {
    name: "초기창업패키지",
    docs: [
      {
        docName: "사업계획서",
        sections: [
          "[1. 아이템 개요 및 현황]\n- 기업 현황 (설립일, 주요 연혁, 현재 매출/고용 현황)\n- 아이템 소개 및 개발 현황\n- 핵심 성과 (기 확보 고객, 매출, 투자 유치 등)",
          "[2. 문제 정의 및 시장성]\n- 타겟 고객 및 시장 Pain Point\n- 시장 규모 (TAM-SAM-SOM)\n- 시장 성장성 및 트렌드 근거",
          "[3. 기술성 및 차별성]\n- 핵심 기술/서비스 상세\n- 기존 경쟁 서비스 대비 차별화 요소 (비교 마크다운 표 포함)\n- 기술적 진입장벽 (모방 난이도)\n- 확보/계획 중인 지식재산권",
          "[4. 사업화 전략]\n- BM (비즈니스 모델) 상세\n- 가격 정책 및 수익 구조\n- Go-to-Market 전략\n- 3개년 매출·비용 추정 (마크다운 표)",
          "[5. 대표자 및 팀 역량]\n- 대표자 이력 및 해당 분야 경험\n- 핵심 인력 구성\n- 자문단/협력 네트워크",
          "[6. 사업비 집행 계획]\n- 총 사업비 (정부지원금 + 자부담)\n- 항목별 세부 계획 마크다운 표: 인건비, 시제품 제작비, 마케팅비, 지재권비, 기타\n- 분기별 집행 스케줄 마크다운 표",
        ],
      },
      {
        docName: "기업 개요서 (1페이지)",
        sections: [
          "- 기업명 / 대표자 / 설립일 / 업종\n- 주요 제품·서비스 소개 (2줄)\n- 매출 현황 (최근 3년, 마크다운 표)\n- 고용 현황 (인원수, 직군)\n- 핵심 성과 (투자, 매출, 수상 등)\n- 기술 보유 현황 (특허, 인증)",
        ],
      },
      {
        docName: "사업비 산출 명세서",
        sections: [
          "아래 항목을 마크다운 표 형식으로 상세 작성:\n\n| 비목 | 세목 | 산출근거 | 금액(천원) |\n|------|------|---------|----------|\n| 인건비 | 기존인력/신규채용 | 인원 × 급여 × 기간 | |\n| 시제품 제작비 | 재료/외주 | 품목별 산출 | |\n| 마케팅비 | 온·오프라인 | 채널별 단가 | |\n| 지식재산권비 | 특허/인증 | 건별 비용 | |\n| 기타 | 여비, 기자재 등 | 품목별 산출 | |\n\n- 분기별 집행 스케줄 마크다운 표 포함\n- 합계 및 정부지원금/자부담 비율",
        ],
      },
    ],
  },
  "default": {
    name: "정부 지원사업",
    docs: [
      {
        docName: "사업계획서",
        sections: [
          "[1. 사업 개요]\n- 사업명 / 신청 기업 소개\n- 사업 아이템 핵심 설명 (300자)\n- 사업 추진 배경 및 동기",
          "[2. 문제 인식 및 시장 분석]\n- 해결하고자 하는 문제 정의\n- 타겟 고객 분석\n- 시장 규모 추정 (TAM-SAM-SOM)\n- 경쟁 현황",
          "[3. 솔루션 및 실현 가능성]\n- 핵심 서비스/기술 설명\n- 기존 서비스 대비 차별점\n- 기술적 구현 방안\n- 개발 로드맵 (단계별)",
          "[4. 사업화 전략 및 비즈니스 모델]\n- 수익 모델 (가격 체계)\n- 마케팅/고객 획득 전략\n- 단계별 성장 계획\n- 3개년 매출 추정 (마크다운 표)",
          "[5. 팀 구성 및 역량]\n- 대표자 역량\n- 팀원 또는 협력 네트워크\n- 보완 계획",
          "[6. 사업비 운용 계획]\n- 항목별 예산 내역 (마크다운 표)\n- 정부지원금 사용 계획\n- 자부담금 내역",
        ],
      },
    ],
  },
};

function getTemplate(grantTitle: string): GrantTemplate {
  for (const key of Object.keys(GRANT_TEMPLATES)) {
    if (key !== "default" && grantTitle.includes(key)) {
      return GRANT_TEMPLATES[key];
    }
  }
  return GRANT_TEMPLATES["default"];
}

export async function POST(request: NextRequest) {
  try {
    const { grantTitle, bizInfo, pblancId } = await request.json();
    if (!grantTitle || !bizInfo) {
      return Response.json({ error: "지원사업명과 사업 정보를 모두 입력해주세요." }, { status: 400 });
    }

    // Try scraping real announcement if pblancId is provided
    let template: GrantTemplate;
    let isScraped = false;

    if (pblancId && typeof pblancId === "string" && pblancId.startsWith("PBLN_")) {
      const scraped = await scrapeGrantDetails(pblancId);
      if (scraped && scraped.requiredDocs.length > 0) {
        template = {
          name: `${grantTitle} (공고 원문)`,
          docs: scraped.requiredDocs.map((d) => ({
            docName: d.docName,
            sections: d.sections,
          })),
        };
        isScraped = true;
        console.log(`[Generate] Using scraped template for ${pblancId} (${template.docs.length} docs)`);
      } else {
        template = getTemplate(grantTitle);
        console.log(`[Generate] Scraping failed for ${pblancId}, falling back to hardcoded template`);
      }
    } else {
      template = getTemplate(grantTitle);
    }

    // 각 문서별로 AI 생성
    const documents: { docName: string; content: string }[] = [];

    for (const doc of template.docs) {
      const sectionsGuide = doc.sections.join("\n\n");

      const prompt = `당신은 정부 지원사업 서류 작성 전문 컨설턴트입니다.
심사위원이 높은 점수를 줄 수 있도록 구체적이고 전문적으로 작성해주세요.

## 작성 문서: ${doc.docName}
## 지원사업: ${template.name}

이 문서는 아래 항목과 양식을 정확히 준수해야 합니다.

${sectionsGuide}

## 작성 원칙
- 각 항목을 빠짐없이, 양식에 명시된 세부 사항을 모두 포함하여 작성
- 정량적 데이터(시장 규모, 매출 추정, KPI 등)를 반드시 포함
- 심사 가점 요소: 혁신성, 실현 가능성, 성장성, 사회적 가치를 강조
- 전문적이고 격식 있는 문체 (구어체 금지)
- 한국어로 작성

## 출력 형식 (매우 중요)
- 마크다운 헤딩(#, ##)이나 볼드(**)를 사용하지 마세요
- 제목은 대괄호로 감싸세요: [1. 창업 아이템 개요]
- 하위 항목은 "- " 또는 번호 1), 2), 3)로 구분
- 표는 반드시 마크다운 표 형식으로:
  | 항목 | 금액 | 비율 |
  |------|------|------|
  | 인건비 | 2,000만원 | 40% |

[지원사업명]
${grantTitle}

[신청자 사업 정보]
${bizInfo}

위 정보를 바탕으로 "${doc.docName}" 문서를 완전하게 작성해주세요.`;

      const content = await generateWithAI(prompt);
      documents.push({ docName: doc.docName, content });
    }

    return Response.json({
      documents,
      template: template.name,
      docCount: documents.length,
      isScraped,
    });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return Response.json({ error: "문서 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

async function generateWithAI(prompt: string): Promise<string> {
  // Gemini 우선
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.error("[Generate] Gemini failed:", e);
    }
  }

  // Claude 폴백
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    const anthropic = new Anthropic({ apiKey: claudeKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0];
    if (text.type === "text") return text.text;
  }

  return "AI API 키가 설정되지 않았습니다.";
}
