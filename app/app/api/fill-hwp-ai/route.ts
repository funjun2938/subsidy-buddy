import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { downloadAttachment } from "@/lib/grant-attachments";
import { HwpxDocument } from "@/lib/hwpx";
import { fillDocument, summarizeForPreview, type FillReport } from "@/lib/hwpx-filler";

// LLM이 표 라벨을 보고 답변을 직접 만드는 통합 라우트.
//
// 흐름 (모두 Next.js 안에서 처리, 외부 사이드카 없음):
//   1) 클라가 hwpx 파일(또는 공고 첨부 URL) + bizInfo + grantTitle 전달
//   2) HWPX 파싱 → 표 라벨 후보 추출
//   3) (라벨 + 사업 정보 + 지원사업명) → LLM(Gemini→Claude)에 답변 생성 요청
//   4) HWPX 표 셀에 답변 주입 → 직렬화
//   5) zip(filled.hwpx + report.json + preview.txt) 응답
//
// 두 가지 호출 방식:
//   (A) multipart/form-data — 사용자가 직접 파일 업로드
//       fields: hwpx (file), bizInfo, grantTitle
//   (B) application/json — 공고 첨부 URL을 서버가 직접 다운로드
//       body: { attachmentUrl, attachmentName?, bizInfo, grantTitle }

import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 120;
// bizinfo.go.kr 첨부 다운로드도 한국 IP에서 해야 안정적
export const preferredRegion = "icn1";

export async function POST(request: NextRequest) {
  let hwpxBytes: Uint8Array;
  let hwpxName: string;
  let bizInfo = "";
  let grantTitle = "";

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { attachmentUrl, attachmentName } = body ?? {};
      bizInfo = String(body?.bizInfo || "");
      grantTitle = String(body?.grantTitle || "");
      if (!attachmentUrl || typeof attachmentUrl !== "string") {
        return Response.json({ error: "attachmentUrl이 필요합니다." }, { status: 400 });
      }
      const looksLikeHwpx =
        attachmentUrl.toLowerCase().endsWith(".hwpx") ||
        (attachmentName && attachmentName.toLowerCase().endsWith(".hwpx"));
      if (!looksLikeHwpx) {
        return Response.json(
          {
            error: "AI 자동 기입은 HWPX 첨부만 가능합니다.",
            hint: "HWP 파일은 한컴오피스에서 .hwpx로 저장 후 업로드하세요.",
          },
          { status: 415 }
        );
      }
      let buf: ArrayBuffer;
      try {
        buf = await downloadAttachment(attachmentUrl);
      } catch (e) {
        return Response.json(
          { error: "공고 첨부 다운로드 실패", detail: e instanceof Error ? e.message : String(e) },
          { status: 502 }
        );
      }
      hwpxBytes = new Uint8Array(buf);
      hwpxName = attachmentName || "attachment.hwpx";
    } else {
      const form = await request.formData();
      const hwpx = form.get("hwpx");
      if (!hwpx || typeof hwpx === "string") {
        return Response.json({ error: "hwpx 파일이 필요합니다." }, { status: 400 });
      }
      hwpxBytes = new Uint8Array(await (hwpx as Blob).arrayBuffer());
      hwpxName = (hwpx as File).name || "input.hwpx";
      bizInfo = String(form.get("bizInfo") || "");
      grantTitle = String(form.get("grantTitle") || "");
    }
    if (!bizInfo.trim()) {
      return Response.json(
        { error: "bizInfo (사업 정보)가 필요합니다 — LLM이 이걸 보고 답변을 만듭니다." },
        { status: 400 }
      );
    }
  } catch (e) {
    return Response.json(
      { error: "요청 본문 파싱 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }

  // 1) HWPX 파싱
  let doc: HwpxDocument;
  try {
    doc = await HwpxDocument.fromBytes(hwpxBytes);
  } catch (e) {
    return Response.json(
      { error: "HWPX 파싱 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }

  // 2) 표 라벨 후보 추출
  const preview = summarizeForPreview(hwpxName, doc);
  const labelSet = new Set<string>();
  for (const t of preview.tables) {
    for (const l of t.label_candidates) {
      const trimmed = l.trim();
      if (trimmed && trimmed.length <= 30) labelSet.add(trimmed);
    }
  }
  const labels = [...labelSet];
  if (labels.length === 0) {
    return Response.json(
      { error: "양식에서 채울 만한 표 셀 라벨을 찾지 못했습니다." },
      { status: 422 }
    );
  }

  // 3) LLM이 라벨별 답변 생성
  let aiAnswers: Record<string, string>;
  try {
    aiAnswers = await runLLMForLabels(labels, bizInfo, grantTitle);
  } catch (e) {
    return Response.json(
      {
        error: "LLM 답변 생성 실패",
        detail: e instanceof Error ? e.message : String(e),
        hint: "GEMINI_API_KEY 또는 ANTHROPIC_API_KEY 환경변수를 확인하세요.",
      },
      { status: 502 }
    );
  }
  if (Object.keys(aiAnswers).length === 0) {
    return Response.json(
      {
        error: "LLM이 채울 답변을 하나도 만들지 못했습니다.",
        hint: "사업 정보를 더 구체적으로 적어주세요. (기업명, 대표자, 주소 등)",
        labels,
      },
      { status: 422 }
    );
  }

  // 4) 표 셀 채우기
  let report: FillReport;
  try {
    report = await fillDocument(doc, aiAnswers);
  } catch (e) {
    return Response.json(
      { error: "양식 채우기 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  let filledBytes: Uint8Array;
  try {
    filledBytes = await doc.toBytes();
  } catch (e) {
    return Response.json(
      { error: "HWPX 직렬화 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  // 채워진 결과의 텍스트 미리보기 (다시 파싱해서 추출 — 라운드트립 검증 + UI 표시용)
  let previewText = "";
  try {
    const reread = await HwpxDocument.fromBytes(filledBytes);
    previewText = reread.toTextPreview();
  } catch {/* preview는 옵션 */}

  // 5) zip 응답 (filled.hwpx + report.json + preview.txt)
  const outZip = new JSZip();
  outZip.file("filled.hwpx", filledBytes);
  outZip.file(
    "report.json",
    JSON.stringify({ ...report, ai_answers: aiAnswers, label_count: labels.length }, null, 2)
  );
  if (previewText) outZip.file("preview.txt", previewText);
  const zipBytes = await outZip.generateAsync({ type: "uint8array" });

  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", `attachment; filename="filled.zip"`);
  headers.set("X-Filled-Count", String(report.filled_count));
  headers.set("X-Ai-Labels", String(labels.length));
  headers.set("X-Ai-Answers", String(Object.keys(aiAnswers).length));
  headers.set(
    "X-Ai-Answers-Json",
    Buffer.from(JSON.stringify(aiAnswers), "utf-8").toString("base64")
  );
  headers.set("X-Pdf-Status", "skipped"); // Node 통합 후 PDF 변환 미지원

  return new Response(new Uint8Array(zipBytes), { status: 200, headers });
}

// ── LLM ──────────────────────────────────────────────────────────────────────

function buildPrompt(labels: string[], bizInfo: string, grantTitle: string): string {
  return `너는 정부 지원사업 신청서 양식의 표 셀에 들어갈 값을 만드는 전문 컨설턴트다.
아래 [표 라벨 목록]은 진짜 정부 신청서 HWPX의 표 셀에서 추출된 텍스트다.
각 라벨에 대해, [신청자 사업 정보]를 기반으로 그 셀에 들어갈 값을 만들어라.

규칙:
1. 정확히 JSON 객체 한 개로만 응답한다. 키는 라벨 텍스트 그대로, 값은 셀에 들어갈 문자열.
2. 라벨이 명백한 식별 정보(기업명/대표자/사업자번호/주소/연락처/이메일/설립일/업종/매출/자본금/신청금액 등)면
   사업 정보에서 정확한 값을 뽑아 넣는다. 사업 정보에 없는 값은 키를 생략한다 (추측 금지).
3. 라벨이 서술형 항목(아이템 개요/사업 동기/시장 분석/경쟁력/팀 구성/자금 운용 등)이면
   해당 셀이 얼마나 큰지 모르므로 핵심 1~3문장으로 압축해서 작성한다. 불릿(- )은 사용 가능.
4. 라벨이 합계/금액/날짜 등 단답형이면 단답으로.
5. 표 헤더(예: "구분", "항목", "금액(천원)", "비고")처럼 답이 들어가지 않는 라벨은 생략한다.
6. 모르거나 사업 정보에 근거가 없으면 키 자체를 생략. 빈 문자열 금지.
7. JSON 외 다른 텍스트(코드블록 백틱, 설명) 절대 금지.

[지원사업명]
${grantTitle || "(미지정)"}

[표 라벨 목록 — 총 ${labels.length}개]
${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}

[신청자 사업 정보]
${bizInfo.slice(0, 8000)}

위 라벨 중 답을 만들 수 있는 것만 골라 JSON 객체로 출력:`;
}

async function runLLMForLabels(
  labels: string[],
  bizInfo: string,
  grantTitle: string
): Promise<Record<string, string>> {
  const text = await runLLM(buildPrompt(labels, bizInfo, grantTitle));
  const parsed = parseJsonLoose(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`LLM 응답을 JSON으로 파싱하지 못했습니다: ${text.slice(0, 200)}`);
  }
  const labelSet = new Set(labels);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const value = v.trim();
    if (!value) continue;
    if (labelSet.has(k.trim())) out[k.trim()] = value;
  }
  return out;
}

function parseJsonLoose(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

async function runLLM(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });
      const r = await model.generateContent(prompt);
      return r.response.text();
    } catch (e) {
      console.warn("[fill-hwp-ai] gemini failed:", e);
    }
  }
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    const anthropic = new Anthropic({ apiKey: claudeKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const c = msg.content[0];
    if (c.type === "text") return c.text;
  }
  throw new Error("LLM API 키가 설정돼 있지 않습니다 (GEMINI_API_KEY 또는 ANTHROPIC_API_KEY).");
}
