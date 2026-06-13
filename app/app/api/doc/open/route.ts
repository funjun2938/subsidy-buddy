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

    // Only seed initialValues for fillable cells whose existing text is non-empty AND
    // differs from their labelFor — i.e., genuine pre-filled content, not the field label.
    // Blank forms produce empty initialValues; pre-filled forms carry real values through.
    const initialValues: Record<string, string> = {};
    for (const t of structure.tables)
      for (const c of t.cells)
        if (c.isFillable && c.label.trim() && c.label.trim() !== c.labelFor)
          initialValues[c.ref] = c.label.trim();

    return Response.json({ structure, format: structure.format, initialValues });
  } catch (e) {
    return Response.json({ error: "양식 파싱 실패", detail: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
