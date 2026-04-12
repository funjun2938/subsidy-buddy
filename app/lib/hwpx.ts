// Node 버전 HWPX read/write 코어.
//
// HWPX = ZIP + XML 컨테이너. 표 셀 텍스트는 Contents/section*.xml 안의
//   hp:tbl > hp:tr > hp:tc > hp:subList > hp:p > hp:run > hp:t
// 구조에 들어있다.
//
// 사이드카(Python lxml)를 제거하고 Next.js 안에서 다 처리하도록 옮긴 것.
// 의존성은 jszip + fast-xml-parser 두 개뿐.
//
// 핵심 설계:
//   - fast-xml-parser preserveOrder: true 모드 → 원본 XML 트리를 노드 배열로 유지
//   - 파싱 후 트리에서 hp:tbl 노드를 찾아 표/셀 격자로 펼침
//   - Cell.setText() 는 셀 안 첫 번째 hp:t 노드의 #text를 교체
//   - 직렬화는 같은 라이브러리의 XMLBuilder 로 트리를 다시 XML 문자열로

import JSZip from "jszip";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

// XML 노드 한 개의 형태 (preserveOrder 모드)
//   { "tag:name": [child, child, ...], ":@": { "@_attr": "..." } }
// 텍스트 노드:
//   { "#text": "..." }
type XmlNode = Record<string, unknown> & {
  ":@"?: Record<string, unknown>;
};

// ── 공용 파서/빌더 ────────────────────────────────────────────────────────────

const PARSER_OPTIONS = {
  preserveOrder: true as const,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
  // 자체 닫는 태그도 그대로 유지
  unpairedTags: [] as string[],
};

const BUILDER_OPTIONS = {
  preserveOrder: true as const,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
  suppressEmptyNode: false,
};

// 노드의 태그명을 꺼낸다 (#text, :@ 같은 메타 키 제외)
function tagOf(node: XmlNode): string | null {
  for (const k of Object.keys(node)) {
    if (k === ":@" || k === "#text") continue;
    return k;
  }
  return null;
}

// 노드의 자식 배열 (preserveOrder에서는 태그 키의 값이 자식 노드 배열)
function childrenOf(node: XmlNode, tag?: string): XmlNode[] {
  const t = tag ?? tagOf(node);
  if (!t) return [];
  const v = node[t];
  return Array.isArray(v) ? (v as XmlNode[]) : [];
}

// 자식 트리 전체를 깊이우선으로 순회
function* walk(nodes: XmlNode[]): Generator<XmlNode> {
  for (const n of nodes) {
    yield n;
    const t = tagOf(n);
    if (t) {
      const cs = n[t];
      if (Array.isArray(cs)) yield* walk(cs as XmlNode[]);
    }
  }
}

// ── Cell ─────────────────────────────────────────────────────────────────────

export class Cell {
  constructor(
    public row: number,
    public col: number,
    public rowspan: number,
    public colspan: number,
    public element: XmlNode, // hp:tc 노드
  ) {}

  /** 셀 안 모든 hp:t 텍스트 노드를 이어붙인 결과 */
  get text(): string {
    const parts: string[] = [];
    const tc = childrenOf(this.element, "hp:tc");
    for (const node of walk(tc)) {
      if (tagOf(node) === "hp:t") {
        for (const c of childrenOf(node, "hp:t")) {
          if ("#text" in c && typeof c["#text"] === "string") parts.push(c["#text"] as string);
        }
      }
    }
    return parts.join("").trim();
  }

  /**
   * 셀의 모든 hp:t 텍스트를 새 값으로 교체.
   * - 첫 번째 hp:t 에 통째로 넣고 나머지는 비운다 (구조/폰트 보존)
   * - hp:t 가 없으면 첫 hp:run 안에 새로 만든다 — 거기도 없으면 첫 hp:p 안에 직접
   */
  setText(value: string): void {
    const tcChildren = childrenOf(this.element, "hp:tc");
    const tNodes: XmlNode[] = [];
    for (const n of walk(tcChildren)) {
      if (tagOf(n) === "hp:t") tNodes.push(n);
    }
    if (tNodes.length > 0) {
      // 첫 hp:t의 자식을 [#text]로 통째 교체, 나머지는 빈 자식 배열로
      tNodes[0]["hp:t"] = [{ "#text": value } as XmlNode];
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i]["hp:t"] = [{ "#text": "" } as XmlNode];
      }
      return;
    }

    // hp:t가 없는 경우 — 가장 가까운 hp:run을 찾아 hp:t를 새로 추가
    const runNodes: XmlNode[] = [];
    for (const n of walk(tcChildren)) {
      if (tagOf(n) === "hp:run") runNodes.push(n);
    }
    const newT: XmlNode = { "hp:t": [{ "#text": value } as XmlNode] };
    if (runNodes.length > 0) {
      const run = runNodes[0];
      const runKids = (run["hp:run"] as XmlNode[]) || [];
      runKids.push(newT);
      run["hp:run"] = runKids;
      return;
    }
    // hp:run도 없는 경우 — 첫 hp:p에 직접 hp:run을 만들어 추가
    const pNodes: XmlNode[] = [];
    for (const n of walk(tcChildren)) {
      if (tagOf(n) === "hp:p") pNodes.push(n);
    }
    if (pNodes.length === 0) return; // 빈 셀 — 포기
    const p = pNodes[0];
    const pKids = (p["hp:p"] as XmlNode[]) || [];
    pKids.push({ "hp:run": [newT] } as XmlNode);
    p["hp:p"] = pKids;
  }
}

// ── Table ────────────────────────────────────────────────────────────────────

export class Table {
  constructor(
    public element: XmlNode, // hp:tbl
    public cells: Cell[],
    public nrows: number,
    public ncols: number,
  ) {}

  cellAt(row: number, col: number): Cell | null {
    for (const c of this.cells) {
      if (c.row <= row && row < c.row + c.rowspan && c.col <= col && col < c.col + c.colspan) {
        return c;
      }
    }
    return null;
  }

  neighborRight(cell: Cell): Cell | null {
    return this.cellAt(cell.row, cell.col + cell.colspan);
  }

  neighborBelow(cell: Cell): Cell | null {
    return this.cellAt(cell.row + cell.rowspan, cell.col);
  }
}

function parseTable(tbl: XmlNode): Table {
  const cells: Cell[] = [];
  let nrows = 0;
  let ncols = 0;
  const tblKids = childrenOf(tbl, "hp:tbl");
  const trNodes = tblKids.filter((n) => tagOf(n) === "hp:tr");

  for (const tr of trNodes) {
    const trKids = childrenOf(tr, "hp:tr");
    const tcNodes = trKids.filter((n) => tagOf(n) === "hp:tc");
    for (const tc of tcNodes) {
      const tcKids = childrenOf(tc, "hp:tc");
      let row = 0, col = 0, rowspan = 1, colspan = 1;
      for (const child of tcKids) {
        if (tagOf(child) === "hp:cellAddr") {
          const attrs = (child[":@"] || {}) as Record<string, string>;
          row = Number(attrs["@_rowAddr"] || "0");
          col = Number(attrs["@_colAddr"] || "0");
        }
        if (tagOf(child) === "hp:cellSpan") {
          const attrs = (child[":@"] || {}) as Record<string, string>;
          rowspan = Number(attrs["@_rowSpan"] || "1");
          colspan = Number(attrs["@_colSpan"] || "1");
        }
      }
      cells.push(new Cell(row, col, rowspan, colspan, tc));
      nrows = Math.max(nrows, row + rowspan);
      ncols = Math.max(ncols, col + colspan);
    }
  }

  // cellAddr가 없는 비정상 표 보정
  if (cells.length > 0 && cells.every((c) => c.row === 0 && c.col === 0)) {
    let i = 0;
    let trIdx = 0;
    let maxCols = 0;
    for (const tr of trNodes) {
      const trKids = childrenOf(tr, "hp:tr");
      const tcNodes = trKids.filter((n) => tagOf(n) === "hp:tc");
      for (let colIdx = 0; colIdx < tcNodes.length; colIdx++) {
        cells[i].row = trIdx;
        cells[i].col = colIdx;
        i++;
      }
      maxCols = Math.max(maxCols, tcNodes.length);
      trIdx++;
    }
    nrows = trNodes.length;
    ncols = maxCols;
  }

  return new Table(tbl, cells, nrows, ncols);
}

// ── HwpxDocument ─────────────────────────────────────────────────────────────

interface SectionDoc {
  name: string;
  tree: XmlNode[]; // section 루트 노드 배열
  tables: Table[];
}

const parser = new XMLParser(PARSER_OPTIONS);
const builder = new XMLBuilder(BUILDER_OPTIONS);

export class HwpxDocument {
  private members = new Map<string, Uint8Array>();
  sections: SectionDoc[] = [];

  static async fromBytes(data: ArrayBuffer | Uint8Array): Promise<HwpxDocument> {
    const doc = new HwpxDocument();
    const zip = await JSZip.loadAsync(data);
    for (const [name, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      doc.members.set(name, await file.async("uint8array"));
    }
    const sectionNames = [...doc.members.keys()]
      .filter((n) => /^Contents\/section\d+\.xml$/.test(n))
      .sort();
    if (sectionNames.length === 0) {
      throw new Error("HWPX 파일에 Contents/section*.xml 이 없습니다. 손상되었거나 HWPX가 아닙니다.");
    }
    for (const name of sectionNames) {
      const xml = new TextDecoder("utf-8").decode(doc.members.get(name)!);
      const tree = parser.parse(xml) as XmlNode[];
      const tables: Table[] = [];
      for (const node of walk(tree)) {
        if (tagOf(node) === "hp:tbl") tables.push(parseTable(node));
      }
      doc.sections.push({ name, tree, tables });
    }
    return doc;
  }

  *allTables(): Generator<Table> {
    for (const s of this.sections) yield* s.tables;
  }

  /** 채워진 결과를 사람이 읽을 수 있는 텍스트 + 마크다운 표로 직렬화 */
  toTextPreview(): string {
    const lines: string[] = [];
    for (const sect of this.sections) {
      lines.push(...renderBlock(sect.tree));
    }
    return lines.filter((l) => l !== null && l !== undefined).join("\n");
  }

  async toBytes(): Promise<Uint8Array> {
    // 변경된 section XML을 다시 직렬화해서 멤버에 반영
    for (const sect of this.sections) {
      const xmlBody = builder.build(sect.tree) as string;
      // section XML에 XML 선언을 항상 붙여준다 (HWPX 표준)
      const decl = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
      const out = xmlBody.startsWith("<?xml") ? xmlBody : decl + xmlBody;
      this.members.set(sect.name, new TextEncoder().encode(out));
    }

    const zip = new JSZip();
    // mimetype은 ZIP 첫 멤버 + STORE(무압축)이 권장사항
    const mimetype = this.members.get("mimetype");
    if (mimetype) {
      zip.file("mimetype", mimetype, { compression: "STORE" });
    }
    for (const [name, payload] of this.members.entries()) {
      if (name === "mimetype") continue;
      zip.file(name, payload, { compression: "DEFLATE" });
    }
    return await zip.generateAsync({ type: "uint8array" });
  }
}

// ── 텍스트 미리보기 렌더링 ───────────────────────────────────────────────────

function renderBlock(nodes: XmlNode[]): string[] {
  const out: string[] = [];
  const rendered = new WeakSet<XmlNode>();
  // 표 안에 들어있는 모든 후손 노드를 미리 표시 — 그 안의 hp:p는 출력 안 함
  const insideTbl = new WeakSet<XmlNode>();
  for (const n of walk(nodes)) {
    if (tagOf(n) === "hp:tbl") {
      for (const desc of walk(childrenOf(n, "hp:tbl"))) insideTbl.add(desc);
    }
  }

  for (const elem of walk(nodes)) {
    const tag = tagOf(elem);
    if (tag === "hp:tbl") {
      if (rendered.has(elem)) continue;
      rendered.add(elem);
      out.push(...renderTable(elem));
    } else if (tag === "hp:p") {
      if (insideTbl.has(elem)) continue;
      // 표를 감싼 p (자손에 hp:tbl 있음) — 그 p의 hp:t 모음은 표 안 텍스트를
      // 통째로 흡수하므로 텍스트 출력은 스킵
      if (containsTable(elem)) continue;
      const text = collectTextOutsideTables(elem);
      const trimmed = text.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function containsTable(node: XmlNode): boolean {
  const t = tagOf(node);
  if (!t) return false;
  for (const child of walk(childrenOf(node, t))) {
    if (tagOf(child) === "hp:tbl") return true;
  }
  return false;
}

function collectTextOutsideTables(node: XmlNode): string {
  const t = tagOf(node);
  if (!t) return "";
  let buf = "";
  function recurse(n: XmlNode) {
    const tag = tagOf(n);
    if (tag === "hp:tbl") return; // 표 안 텍스트는 표 렌더가 처리
    if (tag === "hp:t") {
      for (const c of childrenOf(n, "hp:t")) {
        if ("#text" in c && typeof c["#text"] === "string") buf += c["#text"] as string;
      }
      return;
    }
    if (tag) {
      for (const c of childrenOf(n, tag)) recurse(c);
    }
  }
  for (const c of childrenOf(node, t)) recurse(c);
  return buf;
}

function renderTable(tbl: XmlNode): string[] {
  const table = parseTable(tbl);
  if (table.cells.length === 0) return [];
  const grid: string[][] = Array.from({ length: table.nrows }, () =>
    Array.from({ length: table.ncols }, () => "")
  );
  for (const c of table.cells) {
    if (c.row < grid.length && c.col < grid[0].length) {
      grid[c.row][c.col] = c.text.replace(/\n/g, " ");
    }
  }
  const out: string[] = [""];
  for (const row of grid) {
    out.push("| " + row.map((cell) => cell || " ").join(" | ") + " |");
  }
  out.push("");
  return out;
}
