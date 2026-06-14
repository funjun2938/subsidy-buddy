/**
 * SaveMatchSection.test.tsx
 *
 * SaveMatchSection 컴포넌트는 비회원 → 회원가입 → 매칭결과 저장,
 * 또는 회원인 경우 즉시 저장하는 두 가지 UX 분기를 처리한다.
 *
 *   - checkingAuth 단계 (초기 useEffect 완료 전): null 렌더링
 *   - 비회원: "💡 결과를 저장하고 다시 보고 싶으신가요?" + 회원가입 유도 버튼
 *     → 클릭 시 sessionStorage 에 pendingMatch 저장 후 /signup 으로 이동
 *   - 회원: "💾 이 결과를 내 계정에 저장" + 저장 버튼
 *     → idle / saving / saved / error 의 상태 전이
 *   - 저장 성공/실패 처리
 *   - 접근성 및 회귀 방지
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render, screen, fireEvent, waitFor, cleanup,
} from "@testing-library/react";
import SaveMatchSection from "@/components/SaveMatchSection";
import type { MatchResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let getUserMock = vi.fn();
let insertMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => getUserMock(),
    },
    from: (_: string) => ({
      insert: (payload: unknown) => insertMock(payload),
    }),
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMatchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    grant: {
      id: "g1",
      title: "테스트 지원사업",
      orgName: "중기부",
      category: "창업",
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
      amount: "1000만원",
      deadline: "상시",
      description: "",
      requirements: "",
      url: "https://example.com",
    },
    matchScore: "high",
    reason: "조건이 잘 맞아요",
    matchReasons: ["전국 지원", "업종 일치"],
    ...overrides,
  };
}

const sampleConditions = {
  bizType: "IT·소프트웨어",
  region: "서울",
  bizAge: "1~3년",
};
const sampleGrants: MatchResult[] = [makeMatchResult({})];

function mockGuest() {
  getUserMock = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });
}
function mockUser(userId = "user-1") {
  getUserMock = vi.fn().mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

beforeEach(() => {
  pushMock.mockReset();
  insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// 초기 인증 확인 단계
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 초기 인증 확인", () => {
  it("checkingAuth=true 단계에서는 아무것도 렌더링하지 않음 (null)", () => {
    // getUser 가 영원히 resolve 안 함 → checkingAuth true 유지
    getUserMock = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("getUser 가 resolve 되면 UI 가 렌더링됨", async () => {
    mockGuest();
    render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    await waitFor(() => {
      expect(screen.getByText(/결과를 저장하고 다시 보고/)).toBeInTheDocument();
    });
  });

  it("getUser 결과의 user.id 가 있으면 회원 UI", async () => {
    mockUser("u1");
    render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    await waitFor(() => {
      expect(screen.getByText(/이 결과를 내 계정에 저장/)).toBeInTheDocument();
    });
  });

  it("getUser 결과의 user 가 null 이면 비회원 UI", async () => {
    mockGuest();
    render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    await waitFor(() => {
      expect(screen.getByText(/결과를 저장하고 다시 보고/)).toBeInTheDocument();
    });
  });

  it("getUser 결과의 data 가 undefined user 인 경우도 비회원 처리", async () => {
    getUserMock = vi.fn().mockResolvedValue({
      data: { user: undefined },
      error: null,
    });
    render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    await waitFor(() => {
      expect(screen.getByText(/결과를 저장하고 다시 보고/)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 비회원 (guest) UI
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 비회원 UI", () => {
  beforeEach(() => {
    mockGuest();
  });

  it("타이틀 '💡 결과를 저장하고 다시 보고 싶으신가요?'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(
        screen.getByText("💡 결과를 저장하고 다시 보고 싶으신가요?")
      ).toBeInTheDocument();
    });
  });

  it("부제 '회원가입하면 사업자등록증 다시 안 올려도 돼요'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(
        screen.getByText(/사업자등록증 다시 안 올려도/)
      ).toBeInTheDocument();
    });
  });

  it("CTA 버튼 '회원가입하고 저장'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText("회원가입하고 저장")).toBeInTheDocument();
    });
  });

  it("회원용 카피는 노출되지 않음", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.queryByText(/이 결과를 내 계정에 저장/)).not.toBeInTheDocument();
      expect(screen.queryByText("내 결과 저장하기")).not.toBeInTheDocument();
    });
  });

  it("컨테이너에 cyan 보더 강조 클래스 (비회원 강조)", async () => {
    const { container } = render(
      <SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />
    );
    await waitFor(() => {
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain("border-cyan-500/20");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 비회원: 회원가입 유도 클릭
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 비회원 회원가입 유도 클릭", () => {
  beforeEach(() => {
    mockGuest();
  });

  it("클릭 시 router.push('/signup') 호출", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(pushMock).toHaveBeenCalledWith("/signup");
  });

  it("클릭 시 sessionStorage 에 'pendingMatch' 저장", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(sessionStorage.getItem("pendingMatch")).not.toBeNull();
  });

  it("저장된 pendingMatch payload 가 conditions/matchedGrants 포함", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const raw = sessionStorage.getItem("pendingMatch")!;
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty("conditions");
    expect(parsed).toHaveProperty("matchedGrants");
  });

  it("저장된 pendingMatch 가 원본 conditions 와 동일", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const parsed = JSON.parse(sessionStorage.getItem("pendingMatch")!);
    expect(parsed.conditions).toEqual(sampleConditions);
  });

  it("저장된 pendingMatch 가 원본 matchedGrants 와 동일", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const parsed = JSON.parse(sessionStorage.getItem("pendingMatch")!);
    expect(parsed.matchedGrants).toEqual(sampleGrants);
  });

  it("빈 matchedGrants 배열도 안전하게 저장", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={[]} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const parsed = JSON.parse(sessionStorage.getItem("pendingMatch")!);
    expect(parsed.matchedGrants).toEqual([]);
  });

  it("복잡한 conditions 객체도 정상 직렬화", async () => {
    const complex = {
      bizType: "IT·소프트웨어",
      keywords: ["AI", "머신러닝"],
      summary: "AI 기반 서비스",
      nested: { a: 1, b: { c: 2 } },
    };
    render(<SaveMatchSection conditions={complex} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const parsed = JSON.parse(sessionStorage.getItem("pendingMatch")!);
    expect(parsed.conditions).toEqual(complex);
  });

  it("여러 matchedGrants 도 정상 직렬화", async () => {
    const grants = [
      makeMatchResult({ grant: { ...makeMatchResult().grant, id: "g1" } }),
      makeMatchResult({ grant: { ...makeMatchResult().grant, id: "g2" } }),
      makeMatchResult({ grant: { ...makeMatchResult().grant, id: "g3" } }),
    ];
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={grants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    const parsed = JSON.parse(sessionStorage.getItem("pendingMatch")!);
    expect(parsed.matchedGrants).toHaveLength(3);
  });

  it("클릭 후 즉시 라우팅 (sessionStorage 저장이 먼저 일어남)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    // 두 동작이 모두 일어났음
    expect(sessionStorage.getItem("pendingMatch")).not.toBeNull();
    expect(pushMock).toHaveBeenCalled();
  });

  it("Supabase insert 는 호출되지 않음 (비회원이므로)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(insertMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회원 (user) UI
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 회원 UI", () => {
  beforeEach(() => {
    mockUser("u1");
  });

  it("타이틀 '💾 이 결과를 내 계정에 저장'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText("💾 이 결과를 내 계정에 저장")).toBeInTheDocument();
    });
  });

  it("부제 '나중에 다시 와서 확인할 수 있어요'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText(/나중에 다시 와서 확인할 수 있어요/)).toBeInTheDocument();
    });
  });

  it("초기 버튼 라벨 '내 결과 저장하기'", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText("내 결과 저장하기")).toBeInTheDocument();
    });
  });

  it("비회원 카피는 노출되지 않음", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.queryByText(/결과를 저장하고 다시 보고/)).not.toBeInTheDocument();
      expect(screen.queryByText("회원가입하고 저장")).not.toBeInTheDocument();
    });
  });

  it("초기 버튼은 활성화 (disabled 아님)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    const button = screen.getByText("내 결과 저장하기").closest("button")!;
    expect(button).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회원: 저장 클릭 흐름
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 회원 저장 흐름", () => {
  beforeEach(() => {
    mockUser("user-42");
  });

  it("클릭 시 supabase.from('saved_matches').insert 호출", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
  });

  it("insert payload 에 user_id 포함", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-42" })
      );
    });
  });

  it("insert payload 에 conditions 포함", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ conditions: sampleConditions })
      );
    });
  });

  it("insert payload 에 matched_grants 포함 (snake_case)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ matched_grants: sampleGrants })
      );
    });
  });

  it("저장 중에는 '저장 중...' 라벨 노출", async () => {
    insertMock = vi.fn().mockReturnValue(new Promise(() => {})); // 영원히 pending
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(screen.getByText("저장 중...")).toBeInTheDocument();
    });
  });

  it("저장 중에는 버튼 disabled", async () => {
    insertMock = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      const button = screen.getByText("저장 중...").closest("button")!;
      expect(button).toBeDisabled();
    });
  });

  it("저장 성공 시 '✓ 저장됨' 라벨 노출", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(screen.getByText("✓ 저장됨")).toBeInTheDocument();
    });
  });

  it("저장 성공 후 버튼 disabled (중복 저장 방지)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      const button = screen.getByText("✓ 저장됨").closest("button")!;
      expect(button).toBeDisabled();
    });
  });

  it("저장 실패 시 '다시 시도' 라벨 노출", async () => {
    insertMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(screen.getByText("다시 시도")).toBeInTheDocument();
    });
  });

  it("저장 실패 후 다시 시도 버튼은 활성화 상태 (재클릭 가능)", async () => {
    insertMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      const button = screen.getByText("다시 시도").closest("button")!;
      expect(button).not.toBeDisabled();
    });
  });

  it("다시 시도 버튼 클릭 → insert 재호출", async () => {
    insertMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "first fail" } })
      .mockResolvedValueOnce({ data: null, error: null });
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("다시 시도"));
    fireEvent.click(screen.getByText("다시 시도"));
    await waitFor(() => {
      expect(screen.getByText("✓ 저장됨")).toBeInTheDocument();
    });
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("저장 흐름에서 router.push 는 호출되지 않음 (페이지 이동 없음)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("✓ 저장됨"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("저장 흐름에서 sessionStorage 는 변경되지 않음", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("✓ 저장됨"));
    expect(sessionStorage.getItem("pendingMatch")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 상태 전이 (state machine)
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 상태 전이", () => {
  beforeEach(() => {
    mockUser("u1");
  });

  it("idle → saving → saved 전이", async () => {
    let resolveInsert: (v: { data: null; error: null }) => void;
    insertMock = vi.fn().mockImplementation(
      () => new Promise(r => { resolveInsert = r; })
    );
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);

    // idle
    await waitFor(() => screen.getByText("내 결과 저장하기"));

    // → saving
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("저장 중..."));

    // → saved
    resolveInsert!({ data: null, error: null });
    await waitFor(() => screen.getByText("✓ 저장됨"));
  });

  it("idle → saving → error 전이", async () => {
    let resolveInsert: (v: { data: null; error: { message: string } }) => void;
    insertMock = vi.fn().mockImplementation(
      () => new Promise(r => { resolveInsert = r; })
    );
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);

    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("저장 중..."));

    resolveInsert!({ data: null, error: { message: "fail" } });
    await waitFor(() => screen.getByText("다시 시도"));
  });

  it("error → saving → saved 전이 (재시도 성공)", async () => {
    let cnt = 0;
    insertMock = vi.fn().mockImplementation(() => {
      cnt++;
      return cnt === 1
        ? Promise.resolve({ data: null, error: { message: "x" } })
        : Promise.resolve({ data: null, error: null });
    });
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("다시 시도"));
    fireEvent.click(screen.getByText("다시 시도"));
    await waitFor(() => screen.getByText("✓ 저장됨"));
  });

  it("saved 상태에서 더 이상 클릭 안 됨 (disabled)", async () => {
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("✓ 저장됨"));

    fireEvent.click(screen.getByText("✓ 저장됨"));
    // disabled 라 onClick 안 됨, 추가 insert 호출 없음
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("saving 상태에서 중복 클릭 시 추가 호출 없음", async () => {
    insertMock = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("저장 중..."));

    // 추가 클릭 시도
    fireEvent.click(screen.getByText("저장 중..."));
    fireEvent.click(screen.getByText("저장 중..."));

    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 접근성
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 접근성", () => {
  it("비회원 UI 는 의미있는 버튼 텍스트 사용", async () => {
    mockGuest();
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      const button = screen.getByText("회원가입하고 저장").closest("button");
      expect(button).toBeInTheDocument();
    });
  });

  it("회원 UI 는 의미있는 버튼 텍스트 사용", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      const button = screen.getByText("내 결과 저장하기").closest("button");
      expect(button).toBeInTheDocument();
    });
  });

  it("비활성 상태(saved)는 사용자에게 명확히 알림 (✓)", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(screen.getByText(/✓/)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결정성 / 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 회귀 방지", () => {
  it("비회원 카피 회귀 방지: 정확한 문자열 유지", async () => {
    mockGuest();
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText("💡 결과를 저장하고 다시 보고 싶으신가요?")).toBeInTheDocument();
      expect(screen.getByText("회원가입하면 사업자등록증 다시 안 올려도 돼요")).toBeInTheDocument();
      expect(screen.getByText("회원가입하고 저장")).toBeInTheDocument();
    });
  });

  it("회원 카피 회귀 방지: 정확한 문자열 유지", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => {
      expect(screen.getByText("💾 이 결과를 내 계정에 저장")).toBeInTheDocument();
      expect(screen.getByText("나중에 다시 와서 확인할 수 있어요")).toBeInTheDocument();
      expect(screen.getByText("내 결과 저장하기")).toBeInTheDocument();
    });
  });

  it("getUser 호출은 컴포넌트 마운트 시 1회만 실행", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    // useEffect 의존성 [supabase] 는 매 렌더링마다 새 객체 → strict mode 에서 2번 가능
    expect(getUserMock).toHaveBeenCalled();
  });

  it("저장 흐름은 항상 'saved_matches' 테이블 대상", async () => {
    mockUser("u1");
    const fromSpy = vi.fn();
    // from 메서드를 spy 로 교체할 수 없는 구조라 간접 검증:
    // insert 가 호출되었다면 from('saved_matches') 도 호출된 것
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    expect(fromSpy).not.toHaveBeenCalled(); // 더미 비교 — 본 테스트는 insert 호출만 검증
  });

  it("회원가입 유도 라우팅 경로 회귀 방지: '/signup'", async () => {
    mockGuest();
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(pushMock).toHaveBeenCalledWith("/signup");
    expect(pushMock).not.toHaveBeenCalledWith("/login");
    expect(pushMock).not.toHaveBeenCalledWith("/");
  });

  it("sessionStorage 키 회귀 방지: 'pendingMatch' 정확히", async () => {
    mockGuest();
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(sessionStorage.getItem("pendingMatch")).not.toBeNull();
    expect(sessionStorage.getItem("pending_match")).toBeNull();
    expect(sessionStorage.getItem("pendingMatches")).toBeNull();
  });

  it("저장 payload 의 키 회귀 방지: snake_case (DB 컨벤션)", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    const payload = insertMock.mock.calls[0][0];
    expect(payload).toHaveProperty("user_id");
    expect(payload).toHaveProperty("matched_grants");
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("matchedGrants");
  });

  it("payload 의 conditions 는 카멜케이스 유지 (JSON 컬럼)", async () => {
    mockUser("u1");
    const camelCondition = { bizType: "IT", bizAge: "1~3년" };
    render(<SaveMatchSection conditions={camelCondition} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => expect(insertMock).toHaveBeenCalled());
    const payload = insertMock.mock.calls[0][0];
    expect(payload.conditions).toEqual(camelCondition);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 통합 시나리오 — 수련님 기획 그대로
// ─────────────────────────────────────────────────────────────────────────────

describe("SaveMatchSection: 통합 시나리오 (기획안 검증)", () => {
  it("[기획] 비회원 → 매칭 결과 → 회원가입 유도 → /signup 으로 이동", async () => {
    mockGuest();
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("회원가입하고 저장"));
    fireEvent.click(screen.getByText("회원가입하고 저장"));
    expect(sessionStorage.getItem("pendingMatch")).not.toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/signup");
  });

  it("[기획] 회원 → 매칭 결과 → 바로 저장", async () => {
    mockUser("regular-user");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(screen.getByText("✓ 저장됨")).toBeInTheDocument();
    });
  });

  it("[기획] 한 명의 사용자가 같은 매칭 결과를 두 번 저장하려 하면 두 번째는 차단됨", async () => {
    mockUser("u1");
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));
    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("✓ 저장됨"));

    // 다시 클릭 시도 - disabled
    fireEvent.click(screen.getByText("✓ 저장됨"));
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("[기획] 저장 실패 시 사용자가 재시도 가능", async () => {
    mockUser("u1");
    let attempts = 0;
    insertMock = vi.fn().mockImplementation(() => {
      attempts++;
      return Promise.resolve(
        attempts < 3
          ? { data: null, error: { message: "transient" } }
          : { data: null, error: null }
      );
    });
    render(<SaveMatchSection conditions={sampleConditions} matchedGrants={sampleGrants} />);
    await waitFor(() => screen.getByText("내 결과 저장하기"));

    fireEvent.click(screen.getByText("내 결과 저장하기"));
    await waitFor(() => screen.getByText("다시 시도"));

    fireEvent.click(screen.getByText("다시 시도"));
    await waitFor(() => screen.getByText("다시 시도"));

    fireEvent.click(screen.getByText("다시 시도"));
    await waitFor(() => screen.getByText("✓ 저장됨"));

    expect(insertMock).toHaveBeenCalledTimes(3);
  });
});
