/**
 * AuthNav.test.tsx
 *
 * AuthNav 는 헤더 영역의 인증 상태별 네비 렌더링.
 *   - email=null → 로그인/회원가입 링크 노출
 *   - email 존재 → 이메일 표시 + 로그아웃 버튼
 *   - 로그아웃 클릭 시 supabase.auth.signOut + 라우팅
 *   - sm 미만 화면에서 이메일 숨김(hidden sm:inline)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AuthNav from "@/components/AuthNav";

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

let signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: () => signOutMock(),
    },
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  signOutMock = vi.fn().mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// 비로그인 상태 (email=null)
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthNav: 비로그인 상태", () => {
  it("로그인 링크 노출", () => {
    render(<AuthNav email={null} />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
  });

  it("회원가입 링크 노출", () => {
    render(<AuthNav email={null} />);
    expect(screen.getByText("회원가입")).toBeInTheDocument();
  });

  it("로그인 링크의 href='/login'", () => {
    render(<AuthNav email={null} />);
    const link = screen.getByText("로그인").closest("a")!;
    expect(link.getAttribute("href")).toBe("/login");
  });

  it("회원가입 링크의 href='/signup'", () => {
    render(<AuthNav email={null} />);
    const link = screen.getByText("회원가입").closest("a")!;
    expect(link.getAttribute("href")).toBe("/signup");
  });

  it("로그아웃 버튼은 노출되지 않음", () => {
    render(<AuthNav email={null} />);
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  it("이메일 텍스트는 노출되지 않음", () => {
    render(<AuthNav email={null} />);
    // 어떤 이메일 형식도 노출 없어야 함
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("회원가입 링크는 강조 그라데이션 스타일", () => {
    render(<AuthNav email={null} />);
    const link = screen.getByText("회원가입").closest("a")!;
    expect(link.className).toContain("bg-gradient-to-r");
    expect(link.className).toContain("cyan-500");
    expect(link.className).toContain("violet-500");
  });

  it("로그인 링크는 강조 없는 일반 스타일", () => {
    render(<AuthNav email={null} />);
    const link = screen.getByText("로그인").closest("a")!;
    expect(link.className).not.toContain("bg-gradient");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 로그인 상태 (email 존재)
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthNav: 로그인 상태", () => {
  it("이메일 텍스트 노출", () => {
    render(<AuthNav email="user@example.com" />);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("로그아웃 버튼 노출", () => {
    render(<AuthNav email="user@example.com" />);
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("로그인/회원가입 링크는 노출되지 않음", () => {
    render(<AuthNav email="user@example.com" />);
    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
    expect(screen.queryByText("회원가입")).not.toBeInTheDocument();
  });

  it("이메일 표시는 모바일에서 숨김 (hidden sm:inline)", () => {
    render(<AuthNav email="user@example.com" />);
    const emailSpan = screen.getByText("user@example.com");
    expect(emailSpan.className).toContain("hidden");
    expect(emailSpan.className).toContain("sm:inline");
  });

  it("긴 이메일도 그대로 표시", () => {
    const long = "very.long.email.address@subdomain.example.co.kr";
    render(<AuthNav email={long} />);
    expect(screen.getByText(long)).toBeInTheDocument();
  });

  it("한글 포함 이메일도 표시", () => {
    const korean = "수련@example.com";
    render(<AuthNav email={korean} />);
    expect(screen.getByText(korean)).toBeInTheDocument();
  });

  it("로그아웃 버튼은 button 요소", () => {
    render(<AuthNav email="user@example.com" />);
    const btn = screen.getByText("로그아웃");
    expect(btn.tagName).toBe("BUTTON");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 로그아웃 동작
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthNav: 로그아웃 동작", () => {
  it("로그아웃 클릭 시 supabase.auth.signOut 호출", async () => {
    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
    });
  });

  it("로그아웃 후 router.push('/') 호출", async () => {
    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("로그아웃 후 router.refresh 호출", async () => {
    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("signOut 순서: signOut → push → refresh", async () => {
    const order: string[] = [];
    signOutMock = vi.fn().mockImplementation(async () => {
      order.push("signOut");
      return { error: null };
    });
    pushMock.mockImplementation((path: string) => {
      order.push(`push:${path}`);
    });
    refreshMock.mockImplementation(() => {
      order.push("refresh");
    });

    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => {
      expect(order).toEqual(["signOut", "push:/", "refresh"]);
    });
  });

  it("로그아웃 여러 번 클릭해도 매번 동작", async () => {
    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(2));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// email prop 변경
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthNav: prop 변경에 따른 재렌더링", () => {
  it("email null → 값으로 변경 시 UI 전환", () => {
    const { rerender } = render(<AuthNav email={null} />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
    rerender(<AuthNav email="user@example.com" />);
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
    expect(screen.queryByText("로그인")).not.toBeInTheDocument();
  });

  it("email 값 → null 로 변경 시 UI 전환", () => {
    const { rerender } = render(<AuthNav email="user@example.com" />);
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
    rerender(<AuthNav email={null} />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  it("email 값 변경 시 새 이메일 표시", () => {
    const { rerender } = render(<AuthNav email="old@example.com" />);
    expect(screen.getByText("old@example.com")).toBeInTheDocument();
    rerender(<AuthNav email="new@example.com" />);
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    expect(screen.queryByText("old@example.com")).not.toBeInTheDocument();
  });

  it("같은 email 로 재렌더링 시 변화 없음", () => {
    const { rerender } = render(<AuthNav email="user@example.com" />);
    rerender(<AuthNav email="user@example.com" />);
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("AuthNav: 회귀 방지", () => {
  it("라우팅 경로 회귀 방지: 로그인 → /login", () => {
    render(<AuthNav email={null} />);
    expect(screen.getByText("로그인").closest("a")?.getAttribute("href"))
      .toBe("/login");
  });

  it("라우팅 경로 회귀 방지: 회원가입 → /signup", () => {
    render(<AuthNav email={null} />);
    expect(screen.getByText("회원가입").closest("a")?.getAttribute("href"))
      .toBe("/signup");
  });

  it("로그아웃 후 메인 페이지로 이동", async () => {
    render(<AuthNav email="user@example.com" />);
    fireEvent.click(screen.getByText("로그아웃"));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(pushMock).not.toHaveBeenCalledWith("/login");
    expect(pushMock).not.toHaveBeenCalledWith("/signup");
  });

  it("버튼/링크 라벨 회귀: 로그인/회원가입/로그아웃", () => {
    const { rerender } = render(<AuthNav email={null} />);
    expect(screen.getByText("로그인")).toBeInTheDocument();
    expect(screen.getByText("회원가입")).toBeInTheDocument();
    rerender(<AuthNav email="x@y.com" />);
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("기획안: 이메일 노출은 모바일에서 숨김 (UI 좁아짐 방지)", () => {
    render(<AuthNav email="really.long.email@example.com" />);
    const email = screen.getByText("really.long.email@example.com");
    expect(email.className).toMatch(/hidden/);
  });

  it("회원가입 CTA 가 시각적으로 강조됨 (그라디언트)", () => {
    render(<AuthNav email={null} />);
    const signup = screen.getByText("회원가입").closest("a")!;
    const login = screen.getByText("로그인").closest("a")!;
    // 회원가입은 그라디언트, 로그인은 없음
    expect(signup.className).toContain("gradient");
    expect(login.className).not.toContain("gradient");
  });
});
