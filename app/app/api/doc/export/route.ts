import { NextRequest } from "next/server";
import { openFormDoc } from "@/lib/open-form-doc";
import { applyValues, type ValueMap } from "@/lib/doc-structure";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const valueMapRaw = String(form.get("valueMap") || "{}");
    if (!file || typeof file === "string")
      return Response.json({ error: "원본 양식 파일이 필요합니다." }, { status: 400 });
    const name = (file as File).name;
    const bytes = new Uint8Array(await (file as Blob).arrayBuffer());
    let valueMap: ValueMap;
    try { valueMap = JSON.parse(valueMapRaw); } catch { return Response.json({ error: "valueMap JSON 오류" }, { status: 400 }); }

    const doc = await openFormDoc(bytes);
    const filled = await applyValues(doc, valueMap);
    const ext = doc.format === "hwp" ? "hwp" : "hwpx";
    const base = name.replace(/\.hwpx?$/i, "");
    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(base)}_AI작성.${ext}"`);
    headers.set("X-Doc-Format", ext);
    return new Response(new Uint8Array(filled), { status: 200, headers });
  } catch (e) {
    return Response.json({ error: "양식 채우기 실패", detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
