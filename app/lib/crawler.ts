import { Grant } from "./types";

interface BizInfoItem {
  pblancId?: string;
  pblancNm?: string;
  pblancUrl?: string;
  jrsdInsttNm?: string;
  excInsttNm?: string;
  bsnsSumryCn?: string;
  reqstBeginEndDe?: string;
  pldirSportRealmLclasCodeNm?: string;
  hashtags?: string;
  trgetNm?: string;
  [key: string]: string | number | null | undefined;
}

const BIZINFO_BASE =
  "https://apis.data.go.kr/1421000/bizinfo/pblancBsnsService";

export async function fetchBizInfoGrants(): Promise<Grant[]> {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey || apiKey === "your_bizinfo_api_key_here") {
    console.log("[Crawler] BIZINFO_API_KEY not set, using seed data");
    return [];
  }

  const allItems: BizInfoItem[] = [];
  const MAX_PAGES = 5;

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

      // 응답 구조: response.body.items.item (단건이면 객체, 복수면 배열)
      const raw = data?.response?.body?.items?.item;
      if (!raw) break;
      const items: BizInfoItem[] = Array.isArray(raw) ? raw : [raw];
      if (items.length === 0) break;

      allItems.push(...items);
      console.log(`[Crawler] Page ${page}: ${items.length} items (total: ${allItems.length})`);

      if (items.length < 100) break;
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
    if (allItems.length > 0) {
      return allItems
        .filter((item) => item.pblancNm)
        .map((item, idx) => parseBizInfoItem(item, idx));
    }
    return [];
  }
}

function parseBizInfoItem(item: BizInfoItem, idx: number): Grant {
  // reqstBeginEndDe: "2026-04-30 ~ 2026-09-30" → 마감일(뒤 날짜) 추출
  const dateRange = String(item.reqstBeginEndDe || "");
  const deadlineMatch = dateRange.match(/(\d{4})[-.\/](\d{2})[-.\/](\d{2})\s*$/);
  const deadline = deadlineMatch
    ? `${deadlineMatch[1]}-${deadlineMatch[2]}-${deadlineMatch[3]}`
    : "상시";

  const category = guessCategory(
    item.pldirSportRealmLclasCodeNm || "",
    item.pblancNm || "",
    item.hashtags || ""
  );

  const region = guessRegion(item.pblancNm || "", item.hashtags || "");

  const rawDesc = String(item.bsnsSumryCn || "");
  const description = rawDesc
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300) || "상세 내용은 공고 원문을 확인하세요.";

  const url =
    item.pblancUrl ||
    `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${item.pblancId || ""}`;

  return {
    id: `biz-${item.pblancId || idx}`,
    title: item.pblancNm || "지원사업",
    orgName: item.jrsdInsttNm || item.excInsttNm || "미상",
    category,
    region,
    targetBizTypes: guessTargetBizTypes(
      item.pblancNm || "",
      rawDesc,
      item.trgetNm || ""
    ),
    amount: "공고 확인",
    deadline,
    description,
    requirements: item.trgetNm || "공고 원문 참조",
    url,
  };
}

function guessCategory(realm: string, title: string, hashtags: string): string {
  const t = realm + title + hashtags;
  if (/창업|예비|스타트업|액셀러레이팅/.test(t)) return "창업";
  if (/R&D|연구|기술개발|혁신|딥테크/.test(t)) return "R&D";
  if (/수출|해외|글로벌|무역/.test(t)) return "수출";
  if (/고용|채용|인력|일자리|안전/.test(t)) return "고용";
  if (/디지털|스마트|AI|ICT|SaaS|온디바이스/.test(t)) return "디지털전환";
  if (/자금|대출|보증|금융|융자|투자/.test(t)) return "자금";
  if (/마케팅|판로|홍보/.test(t)) return "마케팅";
  if (/교육|훈련|컨설팅/.test(t)) return "컨설팅";
  if (/특허|IP|지식재산/.test(t)) return "IP";
  return "기타";
}

function guessRegion(title: string, hashtags: string): string {
  // 제목 앞 [지역명] 패턴 우선
  const bracketMatch = title.match(/^\[([^\]]+)\]/);
  if (bracketMatch) {
    const r = bracketMatch[1]
      .replace(/특별시|광역시|특별자치시|특별자치도|도|시|군|구/g, "")
      .trim();
    if (r) return r;
  }

  // 해시태그에서 지역 감지
  const REGIONS = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
  const tags = hashtags.split(",").map((t) => t.trim());
  for (const region of REGIONS) {
    if (tags.some((t) => t.startsWith(region))) return region;
  }

  return "전국";
}

function guessTargetBizTypes(title: string, desc: string, target: string): string[] {
  const text = title + desc + target;
  const types: string[] = [];
  if (/음식|외식|식품/.test(text)) types.push("음식점·외식");
  if (/유통|소매|상점|스토어/.test(text)) types.push("소매·유통");
  if (/제조|공장|생산/.test(text)) types.push("제조");
  if (/IT|소프트웨어|디지털|AI|ICT|플랫폼|SaaS/.test(text)) types.push("IT·소프트웨어");
  if (/서비스/.test(text)) types.push("서비스업");
  if (/교육|학원/.test(text)) types.push("교육");
  if (/건설|건축/.test(text)) types.push("건설");
  if (/농|수산|축산|임업/.test(text)) types.push("농림수산");
  if (/소상공인|자영업/.test(text)) types.push("소매·유통");
  if (types.length === 0) {
    return ["IT·소프트웨어", "제조", "서비스업", "소매·유통", "기타"];
  }
  return [...new Set(types)];
}
