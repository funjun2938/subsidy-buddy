import { Grant } from "./types";

interface BizInfoItem {
  pblancId?: string;
  pblancNm?: string;
  jrsdInsttNm?: string;
  bsnsSumryCn?: string;
  reqstBeginEndDe?: string;
  sproutSportRealmLclasCodeNm?: string;
  pldirSportRealmLclasCodeNm?: string;
  areaNm?: string;
  sprtCn?: string;
  detailPageUrl?: string;
  reqstLmttEndDe?: string;
  [key: string]: string | undefined;
}

// 기업마당 API — 정부 지원사업 통합 조회
// https://www.data.go.kr/data/15083337/openapi.do
const BIZINFO_BASE =
  "https://apis.data.go.kr/B552735/pblancListAPI/pblancList";

export async function fetchBizInfoGrants(): Promise<Grant[]> {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey || apiKey === "your_bizinfo_api_key_here") {
    console.log("[Crawler] BIZINFO_API_KEY not set, using seed data");
    return [];
  }

  const allItems: BizInfoItem[] = [];
  const MAX_PAGES = 5; // 최대 5페이지 (500건)

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        dataType: "json",
        pageNo: String(page),
        numOfRows: "100",
      });

      const res = await fetch(`${BIZINFO_BASE}?${params.toString()}`, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error(`[Crawler] BizInfo API page ${page} error:`, res.status);
        break;
      }

      const data = await res.json();
      const items: BizInfoItem[] =
        data?.response?.body?.items ?? data?.items ?? [];

      if (!Array.isArray(items) || items.length === 0) break;

      allItems.push(...items);
      console.log(`[Crawler] Page ${page}: ${items.length} items (total: ${allItems.length})`);

      if (items.length < 100) break; // 마지막 페이지
    }

    if (allItems.length === 0) {
      console.log("[Crawler] No items from BizInfo API");
      return [];
    }

    console.log(`[Crawler] Total fetched: ${allItems.length} grants`);
    return allItems
      .filter((item) => item.pblancNm)
      .map((item, idx) => parseBizInfoItem(item, idx));
  } catch (error) {
    console.error("[Crawler] Fetch error:", error);
    // 일부라도 가져왔으면 반환
    if (allItems.length > 0) {
      return allItems
        .filter((item) => item.pblancNm)
        .map((item, idx) => parseBizInfoItem(item, idx));
    }
    return [];
  }
}

function parseBizInfoItem(item: BizInfoItem, idx: number): Grant {
  // 마감일 파싱 (기업마당은 "2026-05-31" 또는 "2026.05.31" 형식)
  const rawDeadline =
    item.reqstLmttEndDe || item.reqstBeginEndDe || "";
  const deadline = rawDeadline
    .replace(/\./g, "-")
    .replace(/[^\d-]/g, "")
    .slice(0, 10);

  // 카테고리 추정
  const category = guessCategory(
    item.sproutSportRealmLclasCodeNm || item.pldirSportRealmLclasCodeNm || "",
    item.pblancNm || ""
  );

  // 지역 추정
  const region = item.areaNm?.includes("전국")
    ? "전국"
    : item.areaNm?.replace(/특별시|광역시|특별자치시|특별자치도|도/g, "").trim() ||
      "전국";

  const detailUrl =
    item.detailPageUrl ||
    `https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${item.pblancId || ""}`;

  return {
    id: `biz-${item.pblancId || idx}`,
    title: item.pblancNm || "지원사업",
    orgName: item.jrsdInsttNm || "미상",
    category,
    region,
    targetBizTypes: guessTargetBizTypes(item.pblancNm || "", item.bsnsSumryCn || ""),
    amount: item.sprtCn || "공고 확인",
    deadline: deadline || "상시",
    description: item.bsnsSumryCn || "상세 내용은 공고 원문을 확인하세요.",
    requirements: item.bsnsSumryCn || "공고 원문 참조",
    url: detailUrl,
  };
}

function guessCategory(realm: string, title: string): string {
  const t = realm + title;
  if (/창업|예비|스타트업/.test(t)) return "창업";
  if (/R&D|연구|기술개발|혁신/.test(t)) return "R&D";
  if (/수출|해외|글로벌/.test(t)) return "수출";
  if (/고용|채용|인력|일자리/.test(t)) return "고용";
  if (/디지털|스마트|AI|ICT/.test(t)) return "디지털전환";
  if (/자금|대출|보증|금융/.test(t)) return "자금";
  if (/마케팅|판로|홍보/.test(t)) return "마케팅";
  if (/교육|훈련|컨설팅/.test(t)) return "컨설팅";
  if (/특허|IP|지식재산/.test(t)) return "IP";
  return "기타";
}

function guessTargetBizTypes(title: string, desc: string): string[] {
  const text = title + desc;
  const types: string[] = [];
  if (/음식|외식|식품/.test(text)) types.push("음식점·외식");
  if (/유통|소매|상점|스토어/.test(text)) types.push("소매·유통");
  if (/제조|공장|생산/.test(text)) types.push("제조");
  if (/IT|소프트웨어|디지털|AI|ICT|플랫폼/.test(text)) types.push("IT·소프트웨어");
  if (/서비스/.test(text)) types.push("서비스업");
  if (/교육|학원/.test(text)) types.push("교육");
  if (/건설|건축/.test(text)) types.push("건설");
  if (/농|수산|축산|임업/.test(text)) types.push("농림수산");
  // 특정 업종이 감지 안 되면 범용으로
  if (types.length === 0) {
    return ["IT·소프트웨어", "제조", "서비스업", "소매·유통", "기타"];
  }
  return types;
}
