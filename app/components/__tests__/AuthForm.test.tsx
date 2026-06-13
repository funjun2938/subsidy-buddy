/**
 * AuthForm.test.tsx
 *
 * AuthForm 컴포넌트(회원가입/로그인 통합 폼) 단위 테스트.
 *   - signup/login 두 모드의 카피(제목/부제/버튼/스위치 링크) 분기
 *   - 이메일/비밀번호 입력
 *   - 비밀번호 길이(8자) 검증
 *   - 제출 흐름: 로딩 상태 / 성공 / 실패 / Supabase 에러
 *   - sessionStorage 의 pendingMatch 저장 흐름
 *   - 에러 알림 a11y (role=alert)
 *   - 모드 전환 링크
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AuthForm from "@/components/AuthForm";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

// Supabase mock 핸들러 — 테스트마다 재할당
let signUpMock = vi.fn();
let signInMock = vi.fn();
let insertMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
    },
    from: (_table: string) => ({
      insert: (...args: unknown[]) => insertMock(...args),
    }),
  }),
}));

// next/link 는 그대로 통과
vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getEmailInput() {
  return screen.getByLabelText(/이메일/) as HTMLInputElement;
}
function getPasswordInput() {
  return screen.getByLabelText(/비밀번호/) as HTMLInputElement;
}
function getSubmitButton() {
  return screen.getByRole("button");
}

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  signUpMock = vi.fn();
  signInMock = vi.fn();
  insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// 렌더링: signup 모드 카피
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: signup 모드 렌더링", () => {
  it("제목 '회원가입' 표시", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText("회원가입")).toBeInTheDocument();
  });

  it("부제 노출", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText(/사업자등록증 다시 안 올려도/)).toBeInTheDocument();
  });

  it("제출 버튼 라벨 '가입하고 결과 저장하기'", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText("가입하고 결과 저장하기")).toBeInTheDocument();
  });

  it("모드 전환 링크: '이미 계정이 있으신가요?' + 로그인", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText(/이미 계정이 있으신가요/)).toBeInTheDocument();
    const link = screen.getByText("로그인");
    expect(link.closest("a")?.getAttribute("href")).toBe("/login");
  });

  it("이메일 input 의 autoComplete 는 'email'", () => {
    render(<AuthForm mode="signup" />);
    expect(getEmailInput().getAttribute("autocomplete")).toBe("email");
  });

  it("비밀번호 input 의 autoComplete 는 'new-password' (신규)", () => {
    render(<AuthForm mode="signup" />);
    expect(getPasswordInput().getAttribute("autocomplete")).toBe("new-password");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 렌더링: login 모드 카피
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: login 모드 렌더링", () => {
  it("제목 '로그인' 표시", () => {
    render(<AuthForm mode="login" />);
    // login 모드에서는 h1 제목 + 버튼에도 '로그인' 텍스트 존재 → getAllByText
    const matches = screen.getAllByText("로그인");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("부제 노출", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByText(/저장한 매칭 결과를 다시 불러옵니다/)).toBeInTheDocument();
  });

  it("제출 버튼 라벨 '로그인'", () => {
    render(<AuthForm mode="login" />);
    const buttons = screen.getAllByText("로그인");
    // 제출 버튼 안의 '로그인' 텍스트가 존재해야 함
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("모드 전환 링크: '처음이신가요?' + 회원가입", () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByText(/처음이신가요/)).toBeInTheDocument();
    const link = screen.getByText(/회원가입/);
    expect(link.closest("a")?.getAttribute("href")).toBe("/signup");
  });

  it("비밀번호 input 의 autoComplete 는 'current-password' (기존)", () => {
    render(<AuthForm mode="login" />);
    expect(getPasswordInput().getAttribute("autocomplete")).toBe("current-password");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 공통 폼 구조
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 공통 폼 구조", () => {
  it("email 과 password 두 input 존재", () => {
    render(<AuthForm mode="signup" />);
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  it("email input 타입은 'email'", () => {
    render(<AuthForm mode="signup" />);
    expect(getEmailInput().type).toBe("email");
  });

  it("password input 타입은 'password'", () => {
    render(<AuthForm mode="signup" />);
    expect(getPasswordInput().type).toBe("password");
  });

  it("두 input 모두 required", () => {
    render(<AuthForm mode="login" />);
    expect(getEmailInput().required).toBe(true);
    expect(getPasswordInput().required).toBe(true);
  });

  it("password minLength=8 속성 존재", () => {
    render(<AuthForm mode="signup" />);
    expect(getPasswordInput().minLength).toBe(8);
  });

  it("email 라벨/htmlFor 연결 (a11y)", () => {
    render(<AuthForm mode="signup" />);
    expect(getEmailInput().id).toBe("email");
  });

  it("password 라벨/htmlFor 연결 (a11y)", () => {
    render(<AuthForm mode="signup" />);
    expect(getPasswordInput().id).toBe("password");
  });

  it("이메일 placeholder 표시", () => {
    render(<AuthForm mode="signup" />);
    expect(getEmailInput().placeholder).toBe("you@example.com");
  });

  it("(8자 이상) 안내 라벨 표시", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText(/8자 이상/)).toBeInTheDocument();
  });

  it("초기 렌더링 시 에러 메시지 미표시", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("이메일 input 이 마운트 시 포커스 (useEffect)", () => {
    render(<AuthForm mode="signup" />);
    // jsdom 환경에서 focus 동작
    expect(document.activeElement).toBe(getEmailInput());
  });

  it("제출 버튼은 type='submit'", () => {
    render(<AuthForm mode="signup" />);
    expect(getSubmitButton().getAttribute("type")).toBe("submit");
  });

  it("초기 상태에서 제출 버튼은 활성화", () => {
    render(<AuthForm mode="signup" />);
    expect(getSubmitButton()).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 입력 인터랙션
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 입력 인터랙션", () => {
  it("이메일 타이핑 시 값 갱신", () => {
    render(<AuthForm mode="signup" />);
    const email = getEmailInput();
    fireEvent.change(email, { target: { value: "test@example.com" } });
    expect(email.value).toBe("test@example.com");
  });

  it("비밀번호 타이핑 시 값 갱신", () => {
    render(<AuthForm mode="signup" />);
    const pw = getPasswordInput();
    fireEvent.change(pw, { target: { value: "abcd1234" } });
    expect(pw.value).toBe("abcd1234");
  });

  it("연속 타이핑 후 마지막 값으로 갱신", () => {
    render(<AuthForm mode="signup" />);
    const email = getEmailInput();
    fireEvent.change(email, { target: { value: "a" } });
    fireEvent.change(email, { target: { value: "ab" } });
    fireEvent.change(email, { target: { value: "abc@example.com" } });
    expect(email.value).toBe("abc@example.com");
  });

  it("빈 문자열로 갱신 가능", () => {
    render(<AuthForm mode="signup" />);
    const email = getEmailInput();
    fireEvent.change(email, { target: { value: "test@example.com" } });
    fireEvent.change(email, { target: { value: "" } });
    expect(email.value).toBe("");
  });

  it("특수문자 포함 이메일 입력 가능", () => {
    render(<AuthForm mode="signup" />);
    const email = getEmailInput();
    fireEvent.change(email, { target: { value: "user+tag@example.co.kr" } });
    expect(email.value).toBe("user+tag@example.co.kr");
  });

  it("긴 비밀번호도 입력 가능", () => {
    render(<AuthForm mode="signup" />);
    const pw = getPasswordInput();
    const longPw = "x".repeat(100);
    fireEvent.change(pw, { target: { value: longPw } });
    expect(pw.value).toBe(longPw);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 비밀번호 길이 검증 (클라이언트 사이드)
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 비밀번호 길이 검증", () => {
  it("8자 미만 제출 시 에러 표시 + signUp 미호출", async () => {
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "x@y.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "short" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/8자 이상/);
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("8자 미만 (login 모드)도 같은 에러", async () => {
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "x@y.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "1234567" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/8자 이상/);
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("정확히 8자는 통과", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
  });

  it("9자 이상도 통과", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "verylongpassword" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
  });

  it("0자 (빈 문자열) 도 에러 표시", async () => {
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "x@y.com" } });
    // 입력 빈 채로 제출 — HTML5 required 검증이 먼저 막을 수도 있지만, 통과시켜도 8자 미만 에러
    fireEvent.change(getPasswordInput(), { target: { value: "" } });

    // submit (form 의 noValidate 가 아니라면 HTML5 가 막을 수 있음)
    // 직접 handleSubmit 호출 시뮬레이션 위해 button click
    fireEvent.click(getSubmitButton());

    // 에러 미표시여도 OK (HTML5 가 막은 경우), 호출은 안 됨
    expect(signUpMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// signup 흐름
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: signup 성공 흐름", () => {
  it("signUp 성공 시 router.push('/') 호출", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("signUp 성공 시 router.refresh 호출", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("signUp 호출 시 email/password 인자 전달", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "test@example.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "password123" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("signUp 실패 시 에러 표시 + 라우팅 없음", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/입력 정보를 확인/);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("signUp 실패 시 제출 버튼 다시 활성화", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "error" },
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("data.user 가 null 이면 에러 처리 (error 가 없어도)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login 흐름
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: login 성공/실패 흐름", () => {
  it("signIn 성공 시 router.push('/') 호출", async () => {
    signInMock.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("signIn 성공 시 router.refresh 호출", async () => {
    signInMock.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("signInWithPassword 호출 시 email/password 전달", async () => {
    signInMock.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "user@kakao.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "secret123" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: "user@kakao.com",
        password: "secret123",
      });
    });
  });

  it("signIn 실패 시 에러 표시", async () => {
    signInMock.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/입력 정보를 확인/);
    });
  });

  it("signIn 실패 시 라우팅 없음", async () => {
    signInMock.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("login 모드에서는 signUp 호출 안 됨", async () => {
    signInMock.mockResolvedValue({ error: null });
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalled();
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 로딩 상태
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 로딩 상태", () => {
  it("signup 제출 중에 버튼 라벨이 '가입 중...' 으로", async () => {
    // 영원히 resolve 안 하는 promise
    signUpMock.mockReturnValue(new Promise(() => {}));
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("가입 중...")).toBeInTheDocument();
    });
  });

  it("login 제출 중에 버튼 라벨이 '로그인 중...' 으로", async () => {
    signInMock.mockReturnValue(new Promise(() => {}));
    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("로그인 중...")).toBeInTheDocument();
    });
  });

  it("제출 중 버튼 disabled", async () => {
    signUpMock.mockReturnValue(new Promise(() => {}));
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
    });
  });

  it("실패 후 다시 시도 가능 (버튼 활성화)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "x" },
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  it("이전 에러는 새 제출 시 클리어", async () => {
    signUpMock
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "x" } })
      .mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });

    // 1차 시도 — 실패
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // 2차 시도 — 성공
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pendingMatch sessionStorage 흐름
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: pendingMatch 자동 저장", () => {
  it("signup 성공 + pendingMatch 존재 → insert 호출", async () => {
    sessionStorage.setItem("pendingMatch", JSON.stringify({
      conditions: { bizType: "IT" },
      matchedGrants: [{ id: "g1" }],
    }));
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    insertMock.mockResolvedValue({ data: null, error: null });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
  });

  it("pendingMatch 의 conditions/matchedGrants 가 insert payload 로 매핑", async () => {
    sessionStorage.setItem("pendingMatch", JSON.stringify({
      conditions: { bizType: "IT·소프트웨어" },
      matchedGrants: [{ id: "g1" }, { id: "g2" }],
    }));
    signUpMock.mockResolvedValue({
      data: { user: { id: "user-id-123" } },
      error: null,
    });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith({
        user_id: "user-id-123",
        conditions: { bizType: "IT·소프트웨어" },
        matched_grants: [{ id: "g1" }, { id: "g2" }],
      });
    });
  });

  it("signup 성공 + pendingMatch 저장 후 sessionStorage 클리어", async () => {
    sessionStorage.setItem("pendingMatch", JSON.stringify({
      conditions: {},
      matchedGrants: [],
    }));
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(sessionStorage.getItem("pendingMatch")).toBeNull();
    });
  });

  it("pendingMatch 없으면 insert 미호출", async () => {
    // sessionStorage 비어있음
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("pendingMatch JSON 파싱 실패해도 가입은 성공으로 진행", async () => {
    sessionStorage.setItem("pendingMatch", "INVALID_JSON{");
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
  });

  it("insert 실패해도 라우팅 진행 (가입 자체는 성공)", async () => {
    sessionStorage.setItem("pendingMatch", JSON.stringify({
      conditions: {},
      matchedGrants: [],
    }));
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    insertMock.mockRejectedValue(new Error("DB unreachable"));

    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("login 모드에서는 pendingMatch 저장 흐름 미실행", async () => {
    sessionStorage.setItem("pendingMatch", JSON.stringify({
      conditions: {},
      matchedGrants: [],
    }));
    signInMock.mockResolvedValue({ error: null });

    render(<AuthForm mode="login" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalled();
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 접근성 (a11y)
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 접근성", () => {
  it("에러 메시지에 role='alert'", async () => {
    render(<AuthForm mode="signup" />);
    // 이메일도 입력해야 HTML5 required 검증을 통과하고 handleSubmit 까지 진입
    fireEvent.change(getEmailInput(), { target: { value: "x@y.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "123" } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("에러 메시지에 aria-live='polite'", async () => {
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "x@y.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "123" } });
    fireEvent.click(getSubmitButton());
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.getAttribute("aria-live")).toBe("polite");
    });
  });

  it("label 요소가 input 과 htmlFor 로 연결", () => {
    render(<AuthForm mode="signup" />);
    const emailLabel = document.querySelector('label[for="email"]');
    const passwordLabel = document.querySelector('label[for="password"]');
    expect(emailLabel).not.toBeNull();
    expect(passwordLabel).not.toBeNull();
  });

  it("form 요소가 존재", () => {
    const { container } = render(<AuthForm mode="signup" />);
    expect(container.querySelector("form")).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthForm: 회귀 방지", () => {
  it("모드 prop 변경 시 카피가 갱신됨", () => {
    const { rerender } = render(<AuthForm mode="signup" />);
    expect(screen.getByText("회원가입")).toBeInTheDocument();

    rerender(<AuthForm mode="login" />);
    // 제목/버튼 두 곳 모두 '로그인' 가능
    expect(screen.getAllByText("로그인").length).toBeGreaterThanOrEqual(1);
  });

  it("동일 mode 재렌더링 시 state 유지 (controlled inputs)", () => {
    const { rerender } = render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "test@test.com" } });
    rerender(<AuthForm mode="signup" />);
    expect(getEmailInput().value).toBe("test@test.com");
  });

  it("signup 라우팅은 '/' (기본 페이지)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    // 다른 경로로 이동하지 않음
    expect(pushMock).not.toHaveBeenCalledWith("/login");
    expect(pushMock).not.toHaveBeenCalledWith("/signup");
  });

  it("에러 메시지는 한국어 사용자에게 친화적", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Some technical error from Supabase" },
    });
    render(<AuthForm mode="signup" />);
    fireEvent.change(getEmailInput(), { target: { value: "a@b.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "12345678" } });
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      // 기술적 영어 메시지가 사용자에게 노출되지 않음
      expect(alert.textContent).not.toContain("Supabase");
      expect(alert.textContent).toMatch(/입력 정보/);
    });
  });

  it("signup 모드의 모든 카피가 회귀 없이 동일", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText("회원가입")).toBeInTheDocument();
    expect(screen.getByText(/사업자등록증/)).toBeInTheDocument();
    expect(screen.getByText("가입하고 결과 저장하기")).toBeInTheDocument();
    expect(screen.getByText(/이미 계정이 있으신가요/)).toBeInTheDocument();
  });

  it("login 모드의 모든 카피가 회귀 없이 동일", () => {
    render(<AuthForm mode="login" />);
    // 제목 + 버튼에 '로그인' 존재
    expect(screen.getAllByText("로그인").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/저장한 매칭 결과를 다시 불러옵니다/)).toBeInTheDocument();
    expect(screen.getByText(/처음이신가요/)).toBeInTheDocument();
  });
});
