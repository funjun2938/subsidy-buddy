import { Grant, REGIONS } from "./types";

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

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 크롤링 텍스트의 HTML 엔티티 디코딩 (의존성 없이 직접 처리)
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'",
  nbsp: " ", middot: "·", hellip: "…", ndash: "–", mdash: "—",
};
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, code: string) => {
    if (code[0] === "#") {
      const cp = code[1] === "x" || code[1] === "X"
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isNaN(cp) ? m : String.fromCodePoint(cp);
    }
    return NAMED_ENTITIES[code] ?? m;
  });
}

/**
 * fetch with exponential-backoff retry for transient failures.
 * 외부 공공 API(기업마당)가 간헐적으로 5xx/네트워크 오류를 내는 경우를 흡수한다.
 * 최종 시도까지 실패하면 마지막 Response(또는 마지막 에러)를 그대로 반환/throw.
 */
export async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
  let failureCount = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      failureCount++;
      console.warn(`[Crawler] Request failed (failures: ${failureCount}, status: ${res.status})`);
      if (attempt >= MAX_RETRIES) return res;
    } catch (error) {
      failureCount++;
      console.warn(`[Crawler] Request error (failures: ${failureCount}):`, error);
      if (attempt >= MAX_RETRIES) throw error;
    }
    await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt)); // 1s, 2s, 4s
  }
  throw new Error("fetchWithRetry: unreachable");
}

export async function fetchBizInfoGrants(): Promise<Grant[]> {
  const apiKey = process.env.BIZINFO_API_KEY;
  if (!apiKey || apiKey === "your_bizinfo_api_key_here") {
    console.log("[Crawler] BIZINFO_API_KEY not set, using seed data");
    return [];
  }

  const fetchPage = async (page: number): Promise<{ items: BizInfoItem[]; totalCount?: number }> => {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      dataType: "json",
      pageNo: String(page),
      numOfRows: "100",
    });
    const res = await fetchWithRetry(`${BIZINFO_BASE}?${params.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[Crawler] Page ${page} failed after ${MAX_RETRIES} retries: ${res.status}`);
      return { items: [] };
    }
    const data = await res.json();
    const body = data?.response?.body;
    const raw = body?.items?.item;
    const items: BizInfoItem[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];
    return { items, totalCount: body?.totalCount };
  };

  try {
    // 1페이지로 totalCount 확인
    const first = await fetchPage(1);
    if (first.items.length === 0) {
      console.log("[Crawler] No items from BizInfo API");
      return [];
    }

    const totalCount = first.totalCount ?? first.items.length;
    const totalPages = Math.ceil(totalCount / 100);
    console.log(`[Crawler] Total: ${totalCount} grants, ${totalPages} pages`);

    // 나머지 페이지 병렬 fetch (10개씩 배치 — 전체 페이지를 모두 가져옴, 상한 없음)
    const remaining: BizInfoItem[] = [];
    const BATCH = 10;
    for (let batchStart = 2; batchStart <= totalPages; batchStart += BATCH) {
      const pageNums = Array.from(
        { length: Math.min(BATCH, totalPages - batchStart + 1) },
        (_, i) => batchStart + i
      );
      const results = await Promise.all(pageNums.map((p) => fetchPage(p)));
      remaining.push(...results.flatMap((r) => r.items));
    }

    const allItems = [...first.items, ...remaining].filter((item) => item.pblancNm);
    console.log(`[Crawler] Fetched: ${allItems.length} grants`);
    return allItems.map((item, idx) => parseBizInfoItem(item, idx));
  } catch (error) {
    console.error("[Crawler] Fetch error:", error);
    return [];
  }
}

// ── K-Startup (창업진흥원) 공고 API ───────────────────────────────────────────
// data.go.kr serviceKey 기반. 기존 BIZINFO_API_KEY(64자 디코딩 키)가 그대로 동작함.
const KSTARTUP_BASE =
  "https://nidapi.k-startup.go.kr/api/kisedKstartupService/v1/getAnnouncementInformation";

interface KstartupItem {
  pbanc_sn?: string | number;        // 고유번호
  biz_pbanc_nm?: string;             // 공고명
  pbanc_ntrp_nm?: string;            // 기관명
  sprv_inst?: string;                // 주관기관(폴백)
  supt_biz_clsfc?: string;           // 분류
  supt_regin?: string;               // 지역(쉼표 多)
  pbanc_rcpt_bgng_dt?: string;       // 접수시작 YYYYMMDD
  pbanc_rcpt_end_dt?: string;        // 접수종료 YYYYMMDD
  pbanc_ctnt?: string;               // 내용
  aply_trgt?: string;                // 신청대상
  aply_trgt_ctnt?: string;           // 신청대상 내용
  aply_excl_trgt_ctnt?: string;      // 신청제외 대상
  biz_enyy?: string;                 // 업력
  detl_pg_url?: string;              // 상세 URL
  rcrt_prgs_yn?: string;             // 모집중 Y/N
  [key: string]: string | number | null | undefined;
}

// YYYYMMDD → YYYY-MM-DD (실패 시 "상시")
function parseKstartupDate(raw?: string): string {
  const s = String(raw || "").trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "상시";
}

export async function fetchKstartupGrants(): Promise<Grant[]> {
  const apiKey = process.env.KSTARTUP_API_KEY ?? process.env.BIZINFO_API_KEY;
  if (!apiKey || apiKey === "your_bizinfo_api_key_here") {
    console.log("[Crawler] K-Startup API key not set, skipping");
    return [];
  }

  // 진행중 + 마감 안 지난 것만 추림 (총 ~29k 이력 전체를 가져오지 않는다)
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const isOngoing = (item: KstartupItem): boolean => {
    if (String(item.rcrt_prgs_yn || "").toUpperCase() !== "Y") return false;
    const deadline = parseKstartupDate(item.pbanc_rcpt_end_dt);
    return deadline === "상시" || deadline >= todayStr;
  };

  const PER_PAGE = 100;
  const MAX_PAGES = 10;       // 안전 상한 (최대 ~1000건만 스캔)
  const ENOUGH = 300;         // 진행중 충분히 모이면 조기 종료

  const fetchPage = async (page: number): Promise<KstartupItem[]> => {
    // serviceKey는 이미 인코딩된 키 — URLSearchParams의 재인코딩을 피하려 수동 결합
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(PER_PAGE),
      returnType: "json",
    });
    const url = `${KSTARTUP_BASE}?serviceKey=${apiKey}&${params.toString()}`;
    const res = await fetchWithRetry(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[Crawler] K-Startup page ${page} failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const raw = data?.data;
    return Array.isArray(raw) ? raw : raw ? [raw] : [];
  };

  try {
    const ongoing: KstartupItem[] = [];
    let capped = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const items = await fetchPage(page);
      if (items.length === 0) break; // 더 이상 데이터 없음
      ongoing.push(...items.filter(isOngoing));
      if (ongoing.length >= ENOUGH) {
        capped = true;
        break;
      }
      if (page === MAX_PAGES && items.length === PER_PAGE) capped = true;
    }

    console.log(`[Crawler] K-Startup ongoing kept: ${ongoing.length}${capped ? " (capped)" : ""}`);
    return ongoing.map(parseKstartupItem);
  } catch (error) {
    console.error("[Crawler] K-Startup fetch error:", error);
    return [];
  }
}

function parseKstartupItem(item: KstartupItem): Grant {
  const title = item.biz_pbanc_nm || "창업지원사업";
  const ctnt = String(item.pbanc_ctnt || "");
  const aplyCtnt = String(item.aply_trgt_ctnt || "");

  // 지역: supt_regin 첫 쉼표 구간이 REGIONS 값이면 사용, 아니면 "전국"
  const firstRegion = String(item.supt_regin || "").split(",")[0].trim();
  const region = (REGIONS as readonly string[]).includes(firstRegion)
    ? firstRegion
    : "전국";

  const description =
    decodeEntities(ctnt.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()).slice(0, 300) ||
    "상세 내용은 공고 원문을 확인하세요.";

  const requirements =
    decodeEntities(
      [item.aply_trgt, item.aply_trgt_ctnt, item.aply_excl_trgt_ctnt]
        .filter(Boolean)
        .join(" ")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    ) || "공고 원문 참조";

  return {
    id: `kstartup-${item.pbanc_sn}`,
    title,
    orgName: item.pbanc_ntrp_nm || item.sprv_inst || "창업진흥원",
    category: item.supt_biz_clsfc || "창업",
    region,
    targetBizTypes: guessTargetBizTypes(title, ctnt, aplyCtnt),
    amount: guessAmount(ctnt, title, ""),
    deadline: parseKstartupDate(item.pbanc_rcpt_end_dt),
    description,
    requirements,
    url: item.detl_pg_url || "https://www.k-startup.go.kr",
  };
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
  const description = decodeEntities(
    rawDesc
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, 300) || "상세 내용은 공고 원문을 확인하세요.";

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
    amount: guessAmount(rawDesc, item.pblancNm || "", item.hashtags || ""),
    deadline,
    description,
    requirements: decodeEntities(String(item.trgetNm || "")) || "공고 원문 참조",
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

  // 콘텐츠 세부 업종 (일반 서비스보다 먼저 체크)
  if (/게임|gaming|e-?sports/.test(text)) types.push("게임");
  if (/웹툰|만화|manhwa|comics|KOMICS/.test(text)) types.push("웹툰·만화");
  if (/영상|방송|영화|드라마|OTT|콘텐츠|동영상|미디어/.test(text)) types.push("영상·방송");
  if (/음악|뮤지션|K-?pop|케이팝|쇼케이스/.test(text)) types.push("음악");
  if (/공연|예술|무대|전시|갤러리/.test(text)) types.push("공연·예술");

  // 기타 세부 업종
  if (/바이오|헬스케어|의료|제약|의약|헬스|바이오텍/.test(text)) types.push("바이오·헬스케어");
  if (/패션|뷰티|화장품|의류|섬유|코스메틱/.test(text)) types.push("패션·뷰티");
  if (/환경|에너지|친환경|탄소|신재생|그린|클린테크/.test(text)) types.push("환경·에너지");

  // 기존 업종
  if (/음식|외식|식품|식당|카페/.test(text)) types.push("음식점·외식");
  if (/유통|소매|상점|스토어|쇼핑/.test(text)) types.push("소매·유통");
  if (/제조|공장|생산|부품|소재/.test(text)) types.push("제조");
  if (/IT|소프트웨어|디지털|AI|ICT|플랫폼|SaaS|앱|앱개발|개발/.test(text)) types.push("IT·소프트웨어");
  if (/서비스/.test(text)) types.push("서비스업");
  if (/교육|학원|학습|훈련/.test(text)) types.push("교육");
  if (/건설|건축|시공|인테리어/.test(text)) types.push("건설");
  if (/농|수산|축산|임업|어업/.test(text)) types.push("농림수산");
  // 소상공인·자영업 키워드는 전업종 대상으로 처리 (특정 업종 하나로 제한하지 않음)
  if (/소상공인|자영업/.test(text)) {
    return ["소매·유통", "음식점·외식", "서비스업", "IT·소프트웨어", "제조", "교육", "패션·뷰티", "기타"];
  }

  if (types.length === 0) {
    // 전업종 대상으로 처리 (fallback)
    return ["IT·소프트웨어", "제조", "서비스업", "소매·유통", "콘텐츠·미디어", "기타"];
  }
  return [...new Set(types)];
}

function guessAmount(desc: string, title: string, hashtags: string): string {
  const text = desc + " " + title + " " + hashtags;

  // 레이블이 붙은 금액 우선 (최대 N억원 / N천만원 / N백만원 / N만원)
  const labeled = text.match(
    /(?:지원금액|지원규모|지원한도|최대|최고|한도|보조금|지원액)[^\d]{0,15}([\d,]+)\s*(억원|천만원|백만원|만원)/
  );
  if (labeled) return `최대 ${labeled[1]}${labeled[2]}`;

  // 레이블 없이 큰 단위 금액 (억/천만/백만)
  const big = text.match(/([\d,]+)\s*(억원|천만원|백만원)/);
  if (big) return `${big[1]}${big[2]}`;

  // 만원 단위 — 100만원 이상만 표시 (너무 작은 숫자 필터)
  const manwon = text.match(/([\d,]+)\s*만원/);
  if (manwon && parseInt(manwon[1].replace(/,/g, ""), 10) >= 100) {
    return `${manwon[1]}만원`;
  }

  return "공고 확인";
}
