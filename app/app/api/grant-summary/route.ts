/**
 * 사장님 친화 한 줄 요약 API
 *
 * 인터뷰 인사이트 #2 반영:
 * "공고 제목이 너무 딱딱해서 뭐 하는 사업인지 모르겠어요."
 *
 * Iteration 1: 하드코딩된 응답으로 API/UI 와이어업 검증.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { grantTitle } = body as { grantTitle?: string };

  if (!grantTitle) {
    return Response.json(
      { ok: false, error: "grantTitle is required" },
      { status: 400 },
    );
  }

  // TODO(iter2): Gemini 호출로 교체
  const summary = `이 지원사업은 "${grantTitle}"의 핵심 혜택을 제공합니다. (요약 준비 중)`;

  return Response.json({ ok: true, summary });
}
