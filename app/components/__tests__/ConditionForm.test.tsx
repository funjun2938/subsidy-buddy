/**
 * ConditionForm.test.tsx
 *
 * ConditionForm 컴포넌트는 사용자가 사업 정보를 입력하는 핵심 진입점.
 *   - 두 탭(AI 자동 분석 / 직접 입력) 전환
 *   - AI 탭: 사업자등록증/추가서류 파일 업로드, bizDesc 텍스트, 추가 정보,
 *     fetch('/api/analyze-doc') 흐름, 결과 렌더링
 *   - 수동 입력: 5개 select(업종/매출/지역/업력/대표나이)
 *   - 제출 검증: 5개 필드 전부 채워져야 활성화
 *   - 제출 → /results?bizType=...&region=... 쿼리 라우팅
 *   - 인증·특성 다중 선택
 *   - 대표 성별 토글
 *   - canAnalyze 파생 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ConditionForm from "@/components/ConditionForm";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/file-store", () => ({
  storeFile: vi.fn().mockResolvedValue(undefined),
}));

const originalFetch = global.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  pushMock.mockReset();
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mockAnalyzeSuccess(overrides: Record<string, unknown> = {}) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      result: {
        bizType: "IT·소프트웨어",
        revenue: "5천만~1억",
        region: "서울",
        bizAge: "1~3년",
        ceoAge: "만 30~39세",
        summary: "AI 기반 SaaS 스타트업",
        keywords: ["AI", "SaaS"],
        ...overrides,
      },
    }),
  });
}

function fillManualFields() {
  fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
    target: { value: "IT·소프트웨어" },
  });
  fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
    target: { value: "5천만~1억" },
  });
  fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
    target: { value: "서울" },
  });
  fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
    target: { value: "1~3년" },
  });
  fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
    target: { value: "만 30~39세" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 초기 렌더링
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 초기 렌더링", () => {
  it("기본 탭은 'AI 자동 분석'", () => {
    render(<ConditionForm />);
    const aiTab = screen.getByText("AI 자동 분석");
    expect(aiTab.className).toContain("cyan-500"); // 활성 탭 스타일
  });

  it("두 탭 버튼 노출", () => {
    render(<ConditionForm />);
    expect(screen.getByText("AI 자동 분석")).toBeInTheDocument();
    expect(screen.getByText("직접 입력")).toBeInTheDocument();
  });

  it("기본 AI 탭에서 사업자등록증 업로드 영역 노출", () => {
    render(<ConditionForm />);
    expect(screen.getByText(/사업자등록증을 올려주세요/)).toBeInTheDocument();
  });

  it("AI 탭에서 추가 서류 첨부 영역 노출", () => {
    render(<ConditionForm />);
    expect(screen.getByText(/사업계획서, 제품소개서 등 추가 첨부/)).toBeInTheDocument();
  });

  it("AI 탭에서 추가적인 설명 textarea 노출", () => {
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/);
    expect(textarea).toBeInTheDocument();
  });

  it("초기에 분석 버튼은 비활성화 (입력 없음)", () => {
    render(<ConditionForm />);
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기");
    expect(analyzeBtn.closest("button")).toBeDisabled();
  });

  it("초기에 매칭 버튼은 비활성화 (필드 미충족)", () => {
    render(<ConditionForm />);
    const submitBtn = screen.getByText("맞춤 지원금 찾기");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  it("AI 분석 결과 영역은 초기엔 미노출", () => {
    render(<ConditionForm />);
    expect(screen.queryByText("AI 분석 결과")).not.toBeInTheDocument();
  });

  it("인증·특성 6개 옵션 표시", () => {
    render(<ConditionForm />);
    ["벤처기업 인증", "이노비즈 인증", "수출 기업", "특허·IP 보유", "여성 대표자", "장애인 기업"].forEach(c => {
      expect(screen.getByText(c)).toBeInTheDocument();
    });
  });

  it("상시 직원 수 select 노출", () => {
    render(<ConditionForm />);
    expect(screen.getByText(/상시 직원 수/)).toBeInTheDocument();
  });

  it("대표자 성별 남성/여성 버튼 노출", () => {
    render(<ConditionForm />);
    expect(screen.getByText("남성")).toBeInTheDocument();
    expect(screen.getByText("여성")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 탭 전환
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 탭 전환", () => {
  it("'직접 입력' 탭 클릭 시 AI 영역 사라지고 select 들 노출", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    expect(screen.queryByText(/사업자등록증을 올려주세요/)).not.toBeInTheDocument();
    // 5개 select (업종/매출/지역/업력/대표나이)
    expect(screen.getAllByDisplayValue("선택").length).toBeGreaterThanOrEqual(5);
  });

  it("manual → ai 다시 전환 가능", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fireEvent.click(screen.getByText("AI 자동 분석"));
    expect(screen.getByText(/사업자등록증을 올려주세요/)).toBeInTheDocument();
  });

  it("탭 전환 시 활성 탭에 cyan 강조 스타일", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    const manualTab = screen.getByText("직접 입력");
    expect(manualTab.className).toContain("cyan");
  });

  it("탭 전환해도 5개 매칭 select 가 한 번에는 보이지 않음", () => {
    render(<ConditionForm />);
    // AI 탭 (기본): manual select 들은 analyzed null + tab !== manual 이라 미노출
    expect(screen.queryAllByDisplayValue("선택").length).toBeLessThan(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 수동 입력 폼
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 직접 입력 모드", () => {
  it("5개 select 모두 noselect 시작 (값 '')", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    const selects = screen.getAllByDisplayValue("선택");
    expect(selects.length).toBeGreaterThanOrEqual(5);
  });

  it("모든 select 채우면 제출 버튼 활성화", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    const submitBtn = screen.getByText("맞춤 지원금 찾기");
    expect(submitBtn.closest("button")).not.toBeDisabled();
  });

  it("1개라도 비면 제출 버튼 비활성화", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    // 4개만 채우기
    const selects = screen.getAllByDisplayValue("선택");
    fireEvent.change(selects[0], { target: { value: "IT·소프트웨어" } });
    fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
      target: { value: "5천만~1억" },
    });
    fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
      target: { value: "서울" },
    });
    fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
      target: { value: "1~3년" },
    });
    // ceoAge 비움
    const submitBtn = screen.getByText("맞춤 지원금 찾기");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  it("업종 select 에 모든 BIZ_TYPES 옵션 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    // 옵션 텍스트로 확인
    expect(screen.getByText("게임")).toBeInTheDocument();
    expect(screen.getByText("IT·소프트웨어")).toBeInTheDocument();
    expect(screen.getByText("음식점·외식")).toBeInTheDocument();
  });

  it("지역 select 에 모든 REGIONS 옵션 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    expect(screen.getByText("서울")).toBeInTheDocument();
    expect(screen.getByText("부산")).toBeInTheDocument();
    expect(screen.getByText("제주")).toBeInTheDocument();
  });

  it("업력 select 에 모든 BIZ_AGES 옵션 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    expect(screen.getByText("예비 창업")).toBeInTheDocument();
    expect(screen.getByText("1~3년")).toBeInTheDocument();
    expect(screen.getByText("7년 이상")).toBeInTheDocument();
  });

  it("매출 select 에 REVENUE_RANGES 옵션 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    expect(screen.getByText("5천만원 미만")).toBeInTheDocument();
    expect(screen.getByText("10억 이상")).toBeInTheDocument();
  });

  it("대표 나이 select 에 CEO_AGES 옵션 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    expect(screen.getByText("만 29세 이하")).toBeInTheDocument();
    expect(screen.getByText("만 60세 이상")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 제출 → 라우팅
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 제출 → /results 라우팅", () => {
  it("모든 필드 채우고 제출 시 router.push 호출", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock).toHaveBeenCalled();
  });

  it("푸시된 경로는 '/results?...'", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toMatch(/^\/results\?/);
  });

  it("쿼리에 bizType 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toContain("bizType=");
  });

  it("쿼리에 region 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toContain("region=");
  });

  it("쿼리에 5개 필드 모두 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    const url = pushMock.mock.calls[0][0];
    expect(url).toContain("bizType=");
    expect(url).toContain("revenue=");
    expect(url).toContain("region=");
    expect(url).toContain("bizAge=");
    expect(url).toContain("ceoAge=");
  });

  it("필드 미충족 상태에서 제출은 라우팅하지 않음", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    // 한 필드만 채움
    fireEvent.change(screen.getAllByDisplayValue("선택")[0], {
      target: { value: "IT·소프트웨어" },
    });
    // 버튼은 disabled - click 해도 onSubmit 안 됨
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 인증·특성 선택
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 인증·특성 토글", () => {
  it("인증 클릭 시 cyan 강조 클래스 적용", () => {
    render(<ConditionForm />);
    const cert = screen.getByText("벤처기업 인증");
    fireEvent.click(cert);
    const btn = cert.closest("button")!;
    expect(btn.className).toContain("cyan");
  });

  it("같은 인증 다시 클릭 시 해제", () => {
    render(<ConditionForm />);
    const cert = screen.getByText("벤처기업 인증");
    fireEvent.click(cert);
    fireEvent.click(cert);
    const btn = cert.closest("button")!;
    // 비활성 상태: muted 색 또는 cyan 미포함
    expect(btn.className).not.toContain("text-cyan-500");
  });

  it("여러 인증 동시 선택 가능 (다중)", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("벤처기업 인증"));
    fireEvent.click(screen.getByText("이노비즈 인증"));
    // 두 버튼 모두 활성 스타일
    expect(screen.getByText("벤처기업 인증").closest("button")?.className).toContain("cyan");
    expect(screen.getByText("이노비즈 인증").closest("button")?.className).toContain("cyan");
  });

  it("인증 선택 시 분석 버튼 활성화 (canAnalyze)", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("벤처기업 인증"));
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    expect(analyzeBtn).not.toBeDisabled();
  });

  it("6개 인증 옵션 모두 토글 가능", () => {
    render(<ConditionForm />);
    ["벤처기업 인증", "이노비즈 인증", "수출 기업", "특허·IP 보유", "여성 대표자", "장애인 기업"].forEach(c => {
      fireEvent.click(screen.getByText(c));
      expect(screen.getByText(c).closest("button")?.className).toContain("cyan");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 대표자 성별 토글
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 대표자 성별", () => {
  it("남성 버튼 클릭 시 활성화", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("남성"));
    expect(screen.getByText("남성").closest("button")?.className).toContain("cyan");
  });

  it("여성 버튼 클릭 시 활성화", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("여성"));
    expect(screen.getByText("여성").closest("button")?.className).toContain("cyan");
  });

  it("같은 성별 다시 클릭 시 해제 (토글)", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("남성"));
    fireEvent.click(screen.getByText("남성"));
    expect(screen.getByText("남성").closest("button")?.className).not.toContain("text-cyan-500");
  });

  it("성별 선택 시 canAnalyze 활성화 안 됨 (성별만은 부족)", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("남성"));
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    // ceoGender 자체는 canAnalyze 조건에 없음
    expect(analyzeBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// bizDesc textarea
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: bizDesc 입력", () => {
  it("textarea 입력 시 값 갱신", () => {
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "테스트 설명" } });
    expect(textarea.value).toBe("테스트 설명");
  });

  it("bizDesc 입력 시 canAnalyze true", () => {
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "AI 기반 SaaS 서비스" } });
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    expect(analyzeBtn).not.toBeDisabled();
  });

  it("공백만 있는 bizDesc 는 canAnalyze 트리거 안 됨", () => {
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "    " } });
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    expect(analyzeBtn).toBeDisabled();
  });

  it("긴 텍스트도 입력 가능", () => {
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/) as HTMLTextAreaElement;
    const long = "x".repeat(2000);
    fireEvent.change(textarea, { target: { value: long } });
    expect(textarea.value.length).toBe(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 직원 수 select
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 직원 수 select", () => {
  it("직원 수 옵션 5개 노출", () => {
    render(<ConditionForm />);
    ["없음", "1~4명", "5~9명", "10~49명", "50명 이상"].forEach(e => {
      expect(screen.getByText(e)).toBeInTheDocument();
    });
  });

  it("직원 수 선택 시 canAnalyze 활성화", () => {
    render(<ConditionForm />);
    // 직원 수 select 는 첫 번째 select
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "1~4명" } });
    const analyzeBtn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    expect(analyzeBtn).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI 분석 — fetch 흐름
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: AI 분석 fetch", () => {
  it("분석 버튼 클릭 시 fetch('/api/analyze-doc') 호출", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    const textarea = screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/);
    fireEvent.change(textarea, { target: { value: "테스트 설명" } });
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analyze-doc",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("분석 성공 시 'AI 분석 결과' 헤더 노출", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText("AI 분석 결과")).toBeInTheDocument();
    });
  });

  it("분석 성공 시 추출된 정보 그리드 노출", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText("추출된 사업 정보")).toBeInTheDocument();
    });
  });

  it("분석 성공 시 AI 추출값이 매칭 폼에 자동 반영", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      // analyzed 상태가 되면 select 들이 노출됨 (값 채워진 상태)
      expect(screen.getByText("AI가 추출한 정보를 확인하고 필요하면 수정하세요")).toBeInTheDocument();
    });
  });

  it("분석 성공 시 AI summary 가 종합 의견에 노출", async () => {
    mockAnalyzeSuccess({ summary: "특별한 AI 분석 결과 요약" });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText("특별한 AI 분석 결과 요약")).toBeInTheDocument();
    });
  });

  it("분석 성공 시 키워드가 태그로 노출", async () => {
    mockAnalyzeSuccess({ keywords: ["블록체인", "NFT"] });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText(/블록체인/)).toBeInTheDocument();
      expect(screen.getByText(/NFT/)).toBeInTheDocument();
    });
  });

  it("분석 후 버튼 라벨이 '다시 분석하기' 로 변경", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText("다시 분석하기")).toBeInTheDocument();
    });
  });

  it("분석 중에는 로딩 라벨 노출", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // pending forever
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText(/AI가 분석하고 있습니다/)).toBeInTheDocument();
    });
  });

  it("분석 실패(네트워크 오류) 시 에러 메시지 노출", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText(/네트워크 오류가 발생했습니다/)).toBeInTheDocument();
    });
  });

  it("분석 응답에 result 없으면 에러 메시지", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "잘못된 파일입니다" }),
    });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText(/잘못된 파일입니다/)).toBeInTheDocument();
    });
  });

  it("분석 응답에 result/error 둘 다 없으면 기본 에러 메시지", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText(/분석 결과를 가져오지 못했습니다/)).toBeInTheDocument();
    });
  });

  it("입력 없이 분석 클릭 시 (canAnalyze false) fetch 안 부름", () => {
    render(<ConditionForm />);
    const btn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
    fireEvent.click(btn); // disabled
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 파일 업로드
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 파일 업로드", () => {
  it("사업자등록증 영역에 hidden file input 존재", () => {
    const { container } = render(<ConditionForm />);
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("파일 선택 시 파일명 노출", async () => {
    const { container } = render(<ConditionForm />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "사업자등록증.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText("사업자등록증.pdf")).toBeInTheDocument();
    });
  });

  it("파일 업로드 시 canAnalyze 활성화", async () => {
    const { container } = render(<ConditionForm />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.pdf");
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      const btn = screen.getByText("AI로 사업 정보 분석하기").closest("button")!;
      expect(btn).not.toBeDisabled();
    });
  });

  it("두 번째 파일 input(추가 서류)도 존재", () => {
    const { container } = render(<ConditionForm />);
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);
  });

  it("추가 서류 업로드 시 파일명 노출", async () => {
    const { container } = render(<ConditionForm />);
    const fileInputs = container.querySelectorAll('input[type="file"]');
    const extraFile = new File(["extra"], "사업계획서.pdf", { type: "application/pdf" });
    fireEvent.change(fileInputs[1], { target: { files: [extraFile] } });
    await waitFor(() => {
      expect(screen.getByText("사업계획서.pdf")).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Drag and drop
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 드래그앤드롭", () => {
  it("dragOver 시 시각 피드백 클래스 변경", () => {
    const { container } = render(<ConditionForm />);
    const dropZone = container.querySelector(".border-dashed")!;
    fireEvent.dragOver(dropZone);
    // dragOver 상태 → cyan-400 boundary
    expect(dropZone.className).toContain("cyan");
  });

  it("dragLeave 시 시각 피드백 해제", () => {
    const { container } = render(<ConditionForm />);
    const dropZone = container.querySelector(".border-dashed")!;
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);
    // 다시 기본 색
    expect(dropZone.className).not.toContain("border-cyan-400");
  });

  it("drop 시 파일이 업로드됨", async () => {
    const { container } = render(<ConditionForm />);
    const dropZone = container.querySelector(".border-dashed")!;
    const file = new File(["dummy"], "drop-test.pdf", { type: "application/pdf" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });
    await waitFor(() => {
      expect(screen.getByText("drop-test.pdf")).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AI 결과 → 제출 시 쿼리에 summary/keywords 포함
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: AI 결과 → 제출 쿼리 통합", () => {
  it("AI 분석 후 제출 시 summary 쿼리 포함", async () => {
    mockAnalyzeSuccess({ summary: "AI 기반 SaaS" });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => screen.getByText("다시 분석하기"));
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toContain("summary=");
  });

  it("AI 분석 후 제출 시 keywords 쿼리 포함", async () => {
    mockAnalyzeSuccess({ keywords: ["AI", "SaaS"] });
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => screen.getByText("다시 분석하기"));
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toContain("keywords=");
  });

  it("인증 선택 후 제출 시 certifications 쿼리 포함", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fireEvent.click(screen.getByText("AI 자동 분석"));
    // 인증 선택
    fireEvent.click(screen.getByText("벤처기업 인증"));
    // manual 폼은 analyzed 가 없으면 안 보이므로 manual 탭으로 가서 채움
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0]).toContain("certifications=");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("ConditionForm: 회귀 방지", () => {
  it("탭 버튼 라벨 회귀 방지: 'AI 자동 분석' / '직접 입력'", () => {
    render(<ConditionForm />);
    expect(screen.getByText("AI 자동 분석")).toBeInTheDocument();
    expect(screen.getByText("직접 입력")).toBeInTheDocument();
  });

  it("제출 버튼 라벨 회귀 방지: '맞춤 지원금 찾기'", () => {
    render(<ConditionForm />);
    expect(screen.getByText("맞춤 지원금 찾기")).toBeInTheDocument();
  });

  it("분석 버튼 라벨 회귀 방지: 'AI로 사업 정보 분석하기'", () => {
    render(<ConditionForm />);
    expect(screen.getByText("AI로 사업 정보 분석하기")).toBeInTheDocument();
  });

  it("AI 분석 fetch 경로 회귀 방지: '/api/analyze-doc'", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analyze-doc",
        expect.any(Object)
      );
    });
  });

  it("매칭 라우팅 경로 회귀 방지: '/results'", () => {
    render(<ConditionForm />);
    fireEvent.click(screen.getByText("직접 입력"));
    fillManualFields();
    fireEvent.click(screen.getByText("맞춤 지원금 찾기"));
    expect(pushMock.mock.calls[0][0].startsWith("/results")).toBe(true);
  });

  it("fetch 요청은 POST 방식", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.method).toBe("POST");
    });
  });

  it("fetch body 는 FormData 타입", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.body).toBeInstanceOf(FormData);
    });
  });

  it("사업자등록증 input accept 속성 회귀 방지", () => {
    const { container } = render(<ConditionForm />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.accept).toContain("image/*");
    expect(fileInput.accept).toContain(".pdf");
    expect(fileInput.accept).toContain(".docx");
  });

  it("AI 결과 영역에 '추출된 사업 정보' 섹션 라벨 회귀 방지", async () => {
    mockAnalyzeSuccess();
    render(<ConditionForm />);
    fireEvent.change(
      screen.getByPlaceholderText(/서울 마포구에서 IT 스타트업/),
      { target: { value: "테스트" } }
    );
    fireEvent.click(screen.getByText("AI로 사업 정보 분석하기"));
    await waitFor(() => {
      expect(screen.getByText("추출된 사업 정보")).toBeInTheDocument();
      expect(screen.getByText("AI 종합 의견")).toBeInTheDocument();
    });
  });
});
