import { NextRequest } from "next/server";

// 기업마당 API로 검색 → pblancId 찾아서 상세 페이지 URL 반환
const BIZINFO_BASE = "https://apis.data.go.kr/B552735/pblancListAPI/pblancList";
const BIZINFO_DETAIL = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do";
const BIZINFO_SEARCH = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") || "";
  const fallbackUrl = request.nextUrl.searchParams.get("fallback") || "";

  if (!title) {
    return Response.redirect(fallbackUrl || "https://www.bizinfo.go.kr");
  }

  // 검색 키워드: 연도 제거하고 핵심 키워드만
  const keyword = title
    .replace(/\d{4}년\s*/g, "")
    .replace(/\[.*?\]\s*/g, "")
    .trim();

  const apiKey = process.env.BIZINFO_API_KEY;
  if (apiKey && apiKey !== "your_bizinfo_api_key_here") {
    try {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        dataType: "json",
        pageNo: "1",
        numOfRows: "20",
        searchKeyword: keyword,
      });

      const res = await fetch(`${BIZINFO_BASE}?${params.toString()}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        const items = data?.response?.body?.items ?? data?.items ?? [];

        if (Array.isArray(items) && items.length > 0) {
          // 제목이 가장 유사한 항목 찾기
          const best = findBestMatch(items, title);
          if (best) {
            const detailUrl = best.detailPageUrl ||
              `${BIZINFO_DETAIL}?pblancId=${best.pblancId}`;
            return Response.redirect(detailUrl);
          }
        }
      }
    } catch {
      // API 실패 시 폴백
    }
  }

  // API 키 없거나 검색 실패 시 → 기업마당 검색 결과 페이지로 이동
  const searchUrl = `${BIZINFO_SEARCH}?searchKeyword=${encodeURIComponent(keyword)}`;
  return Response.redirect(searchUrl);
}

interface BizInfoItem {
  pblancId?: string;
  pblancNm?: string;
  detailPageUrl?: string;
  [key: string]: string | undefined;
}

function findBestMatch(items: BizInfoItem[], targetTitle: string): BizInfoItem | null {
  const normalize = (s: string) => s.replace(/\s+/g, "").replace(/\d{4}년/g, "").toLowerCase();
  const target = normalize(targetTitle);

  let bestItem: BizInfoItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    if (!item.pblancNm || !item.pblancId) continue;
    const name = normalize(item.pblancNm);

    // 완전 포함 관계 체크
    if (name.includes(target) || target.includes(name)) {
      return item; // 완벽 매칭
    }

    // 부분 매칭 점수 계산
    const score = calcSimilarity(target, name);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore > 0.4 ? bestItem : items[0]; // 40% 이상 유사도면 사용, 아니면 첫 번째
}

function calcSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
}
