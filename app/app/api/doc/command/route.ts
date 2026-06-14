import { NextRequest } from "next/server";
import { runLLM, parseJsonLoose } from "@/lib/llm";
import { filterChanges, type CellChange } from "@/lib/doc-structure";
import { isPlaceholderValue } from "@/lib/fill-core";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FillableCell { ref: string; label: string; value: string; }

export async function POST(request: NextRequest) {
  let body: { fillable: FillableCell[]; valueMap: Record<string, string>; command: string; bizInfo?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "JSON 본문 필요" }, { status: 400 }); }
  const { fillable, command, bizInfo = "" } = body;
  if (!command?.trim()) return Response.json({ error: "명령이 비어있습니다." }, { status: 400 });
  if (!Array.isArray(fillable)) return Response.json({ error: "fillable 배열이 필요합니다." }, { status: 400 });
  // valueMap 이 null/비객체로 와도 안전하게 빈 객체로 정규화 (미처리 500 방지)
  const valueMap = (body.valueMap && typeof body.valueMap === "object" && !Array.isArray(body.valueMap))
    ? body.valueMap : {};

  const prompt = buildCommandPrompt(fillable, valueMap, command, bizInfo);
  let text: string;
  try { text = await runLLM(prompt); }
  catch (e) { return Response.json({ error: "LLM 호출 실패", detail: e instanceof Error ? e.message : String(e) }, { status: 502 }); }

  // 이 AI 호출에서 사용한 토큰 추정치 (입력+출력 문자수 / 4). 무료 토큰 예산에서 차감용.
  const tokensUsed = Math.ceil((prompt.length + text.length) / 4);

  const parsed = parseJsonLoose(text) as { changes?: CellChange[]; reply?: string } | null;
  if (!parsed) return Response.json({ changes: [], reply: "이해하지 못했어요. 다르게 말해줄래요?", tokensUsed });

  const fillableRefs = new Set(fillable.map(f => f.ref));
  const changes = filterChanges(Array.isArray(parsed.changes) ? parsed.changes : [], fillableRefs);
  const reply = typeof parsed.reply === "string" && parsed.reply.trim()
    ? parsed.reply
    : (changes.length ? `${changes.length}개 칸을 수정했어요.` : "바꿀 내용을 못 찾았어요.");
  return Response.json({ changes, reply, tokensUsed });
}

function buildCommandPrompt(fillable: FillableCell[], valueMap: Record<string, string>, command: string, bizInfo: string): string {
  const rows = fillable.map(f => {
    const cur = valueMap[f.ref] ?? f.value ?? "";
    // 현재값이 작성 예시/안내(플레이스홀더)면 빈칸으로 표시하고 예시를 형식 힌트로 제공
    const shown = isPlaceholderValue(cur)
      ? (cur.trim() ? `(빈칸·작성예시: "${cur.trim()}")` : "(빈칸)")
      : `"${cur}"`;
    return `- ref=${f.ref} | 라벨=${f.label} | 현재값=${shown}`;
  }).join("\n");
  return `너는 정부 지원사업 신청서를 채우는 도우미다. 아래 채울 수 있는 칸 목록과 사용자 명령을 보고,
어떤 칸(ref)에 어떤 값을 넣을지 정해라.

규칙:
1. JSON 객체 하나만 출력: { "changes": [ { "ref": "...", "value": "..." } ], "reply": "사용자에게 할 한국어 한두 문장" }
2. ref 는 반드시 아래 목록의 ref 중에서만 사용. 목록에 없는 ref 절대 생성 금지.
3. 양식·칸 구조는 절대 바꾸지 말고 값만 채운다.
4. 명령이 단일 칸이면 1개, "다 채워줘"면 근거 있는 칸만 여러 개. 비우라면 value:"".
5. 사업정보에 근거 없는 값은 추측하지 말고 changes 에서 제외.
6. **현재값=(빈칸·작성예시: "...") 인 칸은 실제 값이 아니라 "이렇게 쓰라"는 예시/안내다. 그 예시의 형식을 규칙으로 삼아 실제 값으로 덮어써라**(예: 주소칸 예시 "시군 읍.면.동 도로명 건물번호(행정리)" → 실제 주소를 그 형식대로 입력). 예시 텍스트를 그대로 두지 말 것.
7. JSON 외 텍스트(백틱 포함) 금지.

[채울 수 있는 칸]
${rows}

[사업 정보]
${bizInfo.slice(0, 6000)}

[사용자 명령]
${command}`;
}
