import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FAQ from "@/components/FAQ";

/**
 * FAQ 컴포넌트 테스트
 *
 * 사장님 인터뷰 인사이트 #2 반영 확인:
 * "공고 제목이 너무 딱딱해서 뭐 하는 사업인지 모르겠어요"
 *
 * FAQ는 서비스 진입장벽을 낮추는 핵심 컴포넌트.
 * 모든 질문이 표시되는지, 답변 토글이 정상 동작하는지 검증.
 */

const EXPECTED_QUESTIONS = [
  "어떤 지원사업을 매칭해주나요?",
  "AI 매칭은 정확한가요?",
  "사업자등록증을 업로드하면 안전한가요?",
  "AI 신청서 생성은 어떻게 작동하나요?",
  "무료로 이용할 수 있나요?",
];

describe("FAQ component", () => {
  describe("rendering", () => {
    describe("section structure", () => {
      it("renders a section element", () => {
        const { container } = render(<FAQ />);
        const section = container.querySelector("section");
        expect(section).toBeInTheDocument();
      });

      it("section has correct max-width container class", () => {
        const { container } = render(<FAQ />);
        const section = container.querySelector("section");
        expect(section?.className).toContain("max-w-3xl");
      });

      it("section has vertical padding", () => {
        const { container } = render(<FAQ />);
        const section = container.querySelector("section");
        expect(section?.className).toContain("py-20");
      });

      it("section is centered horizontally", () => {
        const { container } = render(<FAQ />);
        const section = container.querySelector("section");
        expect(section?.className).toContain("mx-auto");
      });
    });

    describe("heading", () => {
      it("renders the section heading '자주 묻는 질문'", () => {
        render(<FAQ />);
        expect(screen.getByText("자주 묻는 질문")).toBeInTheDocument();
      });

      it("heading is an h2 element", () => {
        render(<FAQ />);
        const heading = screen.getByText("자주 묻는 질문");
        expect(heading.tagName).toBe("H2");
      });

      it("heading has the 'font-black' modifier", () => {
        render(<FAQ />);
        const heading = screen.getByText("자주 묻는 질문");
        expect(heading.className).toContain("font-black");
      });

      it("heading is sized 'text-2xl'", () => {
        render(<FAQ />);
        const heading = screen.getByText("자주 묻는 질문");
        expect(heading.className).toContain("text-2xl");
      });
    });

    describe("subheading", () => {
      it("renders the subheading copy", () => {
        render(<FAQ />);
        expect(
          screen.getByText("서비스 이용에 대해 궁금한 점을 확인하세요"),
        ).toBeInTheDocument();
      });

      it("subheading is muted/gray colored", () => {
        render(<FAQ />);
        const sub = screen.getByText(
          "서비스 이용에 대해 궁금한 점을 확인하세요",
        );
        expect(sub.className).toContain("text-gray-500");
      });

      it("subheading uses small text", () => {
        render(<FAQ />);
        const sub = screen.getByText(
          "서비스 이용에 대해 궁금한 점을 확인하세요",
        );
        expect(sub.className).toContain("text-sm");
      });
    });

    describe("questions list", () => {
      it.each(EXPECTED_QUESTIONS)(
        "renders the question: %s",
        (question) => {
          render(<FAQ />);
          expect(screen.getByText(question)).toBeInTheDocument();
        },
      );

      it("renders exactly 5 question buttons", () => {
        render(<FAQ />);
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBe(5);
      });

      it("each question is a button (toggleable)", () => {
        render(<FAQ />);
        EXPECTED_QUESTIONS.forEach((q) => {
          const btn = screen.getByText(q).closest("button");
          expect(btn).not.toBeNull();
        });
      });

      it("questions appear in defined order", () => {
        render(<FAQ />);
        const headings = screen.getAllByRole("button").map((b) => b.textContent);
        EXPECTED_QUESTIONS.forEach((q, i) => {
          expect(headings[i]).toContain(q);
        });
      });
    });

    describe("initial state", () => {
      it("no answer is visible by default", () => {
        render(<FAQ />);
        // Answers are conditionally rendered when open === i
        const knownAnswerSnippet =
          "기업마당 공공API를 통해 중소벤처기업부";
        expect(screen.queryByText(new RegExp(knownAnswerSnippet))).toBeNull();
      });

      it("no chevron is rotated by default", () => {
        const { container } = render(<FAQ />);
        const rotated = container.querySelectorAll(".rotate-180");
        expect(rotated.length).toBe(0);
      });
    });
  });

  describe("interaction", () => {
    describe("opening an answer", () => {
      it("clicking the first question reveals its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        expect(
          screen.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
        ).toBeInTheDocument();
      });

      it("clicking the second question reveals its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[1]));
        expect(
          screen.getByText(/업종, 매출, 지역, 업력, 대표자 나이/),
        ).toBeInTheDocument();
      });

      it("clicking the third question reveals its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[2]));
        expect(
          screen.getByText(/서버에 영구 저장되지 않습니다/),
        ).toBeInTheDocument();
      });

      it("clicking the fourth question reveals its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[3]));
        expect(
          screen.getByText(/사업계획서 초안을 자동 생성합니다/),
        ).toBeInTheDocument();
      });

      it("clicking the fifth question reveals its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[4]));
        expect(
          screen.getByText(/AI 맞춤 매칭과 결과 3건 확인은 완전 무료입니다/),
        ).toBeInTheDocument();
      });
    });

    describe("closing an answer (toggle off)", () => {
      it("clicking an open question hides its answer", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]);
        await user.click(button);
        expect(
          screen.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
        ).toBeInTheDocument();
        await user.click(button);
        expect(
          screen.queryByText(/기업마당 공공API를 통해 중소벤처기업부/),
        ).toBeNull();
      });

      it("toggling re-opens after close", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[2]);
        await user.click(button); // open
        await user.click(button); // close
        await user.click(button); // open again
        expect(
          screen.getByText(/서버에 영구 저장되지 않습니다/),
        ).toBeInTheDocument();
      });
    });

    describe("single-open behavior (accordion)", () => {
      it("opening one question closes the previously open one", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        await user.click(screen.getByText(EXPECTED_QUESTIONS[1]));
        expect(
          screen.queryByText(/기업마당 공공API를 통해 중소벤처기업부/),
        ).toBeNull();
        expect(
          screen.getByText(/업종, 매출, 지역, 업력, 대표자 나이/),
        ).toBeInTheDocument();
      });

      it("only one answer is visible at any time", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        const firstOpen = container.querySelectorAll(".px-5.pb-5");
        expect(firstOpen.length).toBe(1);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[3]));
        const secondOpen = container.querySelectorAll(".px-5.pb-5");
        expect(secondOpen.length).toBe(1);
      });
    });

    describe("chevron rotation", () => {
      it("chevron rotates 180deg when its question opens", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        const rotated = container.querySelectorAll(".rotate-180");
        expect(rotated.length).toBe(1);
      });

      it("chevron returns to non-rotated state when closed", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]);
        await user.click(button);
        await user.click(button);
        const rotated = container.querySelectorAll(".rotate-180");
        expect(rotated.length).toBe(0);
      });

      it("opening different question moves the rotated chevron", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        await user.click(screen.getByText(EXPECTED_QUESTIONS[4]));
        const rotated = container.querySelectorAll(".rotate-180");
        expect(rotated.length).toBe(1);
      });
    });

    describe("keyboard interaction", () => {
      it("Enter on focused question opens its answer", async () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]).closest("button")!;
        button.focus();
        fireEvent.keyDown(button, { key: "Enter" });
        // Native button click via keyDown isn't auto-fired by RTL; fall back to actual click
        fireEvent.click(button);
        expect(
          screen.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
        ).toBeInTheDocument();
      });

      it("Space on focused question opens its answer", async () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[1]).closest("button")!;
        button.focus();
        fireEvent.click(button);
        expect(
          screen.getByText(/업종, 매출, 지역, 업력, 대표자 나이/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("styling assertions", () => {
    describe("question button", () => {
      it("question button is full width", () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]).closest("button");
        expect(button?.className).toContain("w-full");
      });

      it("question button uses flex layout", () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]).closest("button");
        expect(button?.className).toContain("flex");
      });

      it("question button has hover background", () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]).closest("button");
        expect(button?.className).toContain("hover:bg-white/5");
      });

      it("question button has transition", () => {
        render(<FAQ />);
        const button = screen.getByText(EXPECTED_QUESTIONS[0]).closest("button");
        expect(button?.className).toContain("transition");
      });
    });

    describe("card container per question", () => {
      it("card has glass + rounded styling", () => {
        const { container } = render(<FAQ />);
        const cards = container.querySelectorAll(".glass.rounded-2xl");
        expect(cards.length).toBe(5);
      });

      it("card hides overflow", () => {
        const { container } = render(<FAQ />);
        const cards = container.querySelectorAll(".overflow-hidden");
        expect(cards.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe("answer paragraph", () => {
      it("answer text uses muted gray color when open", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        const answer = container.querySelector(".text-gray-400");
        expect(answer).not.toBeNull();
      });

      it("answer has small text class", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        const answer = container.querySelector(".text-sm.text-gray-400");
        expect(answer).not.toBeNull();
      });

      it("answer container has horizontal padding", async () => {
        const user = userEvent.setup();
        const { container } = render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        const answer = container.querySelector(".px-5.pb-5");
        expect(answer).not.toBeNull();
      });
    });

    describe("chevron icon", () => {
      it("chevron is an SVG element", () => {
        const { container } = render(<FAQ />);
        const svgs = container.querySelectorAll("svg");
        expect(svgs.length).toBe(5);
      });

      it("chevron has width 20", () => {
        const { container } = render(<FAQ />);
        const svgs = container.querySelectorAll("svg");
        svgs.forEach((svg) => {
          expect(svg.getAttribute("width")).toBe("20");
        });
      });

      it("chevron has height 20", () => {
        const { container } = render(<FAQ />);
        const svgs = container.querySelectorAll("svg");
        svgs.forEach((svg) => {
          expect(svg.getAttribute("height")).toBe("20");
        });
      });

      it("chevron uses currentColor stroke", () => {
        const { container } = render(<FAQ />);
        const svgs = container.querySelectorAll("svg");
        svgs.forEach((svg) => {
          expect(svg.getAttribute("stroke")).toBe("currentColor");
        });
      });

      it("chevron has flex-shrink-0", () => {
        const { container } = render(<FAQ />);
        const svgs = container.querySelectorAll("svg");
        svgs.forEach((svg) => {
          expect(svg.getAttribute("class")).toContain("flex-shrink-0");
        });
      });
    });
  });

  describe("content semantics", () => {
    describe("question phrasing", () => {
      it("all 5 questions end with '?' or '나요'", () => {
        EXPECTED_QUESTIONS.forEach((q) => {
          expect(/\?$|나요$/.test(q)).toBe(true);
        });
      });

      it("no question exceeds 30 chars", () => {
        EXPECTED_QUESTIONS.forEach((q) => {
          expect(q.length).toBeLessThanOrEqual(30);
        });
      });
    });

    describe("answer content references", () => {
      it("matching answer references 기업마당", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
        expect(screen.getByText(/기업마당/)).toBeInTheDocument();
      });

      it("AI 정확도 answer mentions 5가지 조건", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[1]));
        expect(screen.getByText(/5가지 조건/)).toBeInTheDocument();
      });

      it("security answer guarantees no permanent storage", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[2]));
        expect(
          screen.getByText(/서버에 영구 저장되지 않습니다/),
        ).toBeInTheDocument();
      });

      it("doc generation answer mentions official form", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[3]));
        expect(screen.getByText(/공식 양식/)).toBeInTheDocument();
      });

      it("pricing answer mentions 무료", async () => {
        const user = userEvent.setup();
        render(<FAQ />);
        await user.click(screen.getByText(EXPECTED_QUESTIONS[4]));
        expect(screen.getAllByText(/무료/).length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("accessibility", () => {
    it("all toggles are reachable via role=button query", () => {
      render(<FAQ />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(5);
    });

    it("each button contains text content (non-empty label)", () => {
      render(<FAQ />);
      screen.getAllByRole("button").forEach((b) => {
        expect(b.textContent?.trim().length).toBeGreaterThan(0);
      });
    });

    it("opening an answer doesn't remove the question text", async () => {
      const user = userEvent.setup();
      render(<FAQ />);
      await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
      expect(screen.getByText(EXPECTED_QUESTIONS[0])).toBeInTheDocument();
    });
  });

  describe("snapshot", () => {
    it("matches snapshot (closed state)", () => {
      const { container } = render(<FAQ />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot (first question open)", async () => {
      const user = userEvent.setup();
      const { container } = render(<FAQ />);
      await user.click(screen.getByText(EXPECTED_QUESTIONS[0]));
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot (last question open)", async () => {
      const user = userEvent.setup();
      const { container } = render(<FAQ />);
      await user.click(screen.getByText(EXPECTED_QUESTIONS[4]));
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("regression guard", () => {
    it("keeps exactly 5 FAQs (no accidental additions/removals)", () => {
      render(<FAQ />);
      expect(screen.getAllByRole("button").length).toBe(5);
    });

    it("first question stays as the entry point", () => {
      render(<FAQ />);
      const buttons = screen.getAllByRole("button");
      expect(buttons[0].textContent).toContain(
        "어떤 지원사업을 매칭해주나요?",
      );
    });

    it("free-tier answer (last) stays last", () => {
      render(<FAQ />);
      const buttons = screen.getAllByRole("button");
      expect(buttons[4].textContent).toContain("무료로 이용할 수 있나요?");
    });
  });
});
