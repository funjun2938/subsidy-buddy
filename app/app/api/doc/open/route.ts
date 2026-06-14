import { NextRequest } from "next/server";
import { openFormDoc } from "@/lib/open-form-doc";
import { buildStructure } from "@/lib/doc-structure";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string")
      return Response.json({ error: ".hwp/.hwpx 파일이 필요합니다." }, { status: 400 });
    const name = (file as File).name.toLowerCase();
    if (!name.endsWith(".hwp") && !name.endsWith(".hwpx"))
      return Response.json({ error: "지원하지 않는 형식입니다 (.hwp/.hwpx)." }, { status: 415 });

    const bytes = new Uint8Array(await (file as Blob).arrayBuffer());
    const doc = await openFormDoc(bytes);
    const structure = buildStructure(doc);

    // 빈 양식의 값 셀에 흔한 placeholder(공백/밑줄/점/괄호/"예시" 등)는 실제 값이 아니므로 제외.
    // 진짜 미리 채워진 내용만 initialValues 로 가져온다. (빈 양식 → {})
    const isPlaceholder = (s: string) =>
      s.replace(/[\s_.·:()[\]{}/\\-]/g, "") === "" || /^(예시|미입력|없음|해당없음|n\/?a)$/i.test(s);
    const initialValues: Record<string, string> = {};
    for (const t of structure.tables)
      for (const c of t.cells) {
        const v = c.label.trim();
        if (c.isFillable && v && !isPlaceholder(v)) initialValues[c.ref] = v;
      }

    return Response.json({ structure, format: structure.format, initialValues });
  } catch (e) {
    return Response.json({ error: "양식 파싱 실패", detail: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
