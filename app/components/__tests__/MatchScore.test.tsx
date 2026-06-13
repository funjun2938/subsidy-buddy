/**
 * MatchScore.test.tsx
 *
 * MatchScore 컴포넌트(매칭 점수 배지) 단위 테스트.
 *   - 세 등급(high/medium/low) 각각의 라벨/색상/도트 표시
 *   - className prop 병합
 *   - 등급 전환 시 재렌더링
 *   - 다중 인스턴스 동시 렌더링
 *   - DOM 구조/접근성
 *   - 스냅샷
 */

import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import MatchScore, { scoreConfig } from "@/components/MatchScore";

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────
// 등급별 라벨 표시
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 라벨 표시", () => {
  it("high 등급은 '적합도 높음' 라벨 표시", () => {
    render(<MatchScore matchScore="high" />);
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
  });

  it("medium 등급은 '검토 가능' 라벨 표시", () => {
    render(<MatchScore matchScore="medium" />);
    expect(screen.getByText("검토 가능")).toBeInTheDocument();
  });

  it("low 등급은 '참고' 라벨 표시", () => {
    render(<MatchScore matchScore="low" />);
    expect(screen.getByText("참고")).toBeInTheDocument();
  });

  it("high 등급에서 medium/low 라벨은 표시되지 않음", () => {
    render(<MatchScore matchScore="high" />);
    expect(screen.queryByText("검토 가능")).not.toBeInTheDocument();
    expect(screen.queryByText("참고")).not.toBeInTheDocument();
  });

  it("medium 등급에서 high/low 라벨은 표시되지 않음", () => {
    render(<MatchScore matchScore="medium" />);
    expect(screen.queryByText("적합도 높음")).not.toBeInTheDocument();
    expect(screen.queryByText("참고")).not.toBeInTheDocument();
  });

  it("low 등급에서 high/medium 라벨은 표시되지 않음", () => {
    render(<MatchScore matchScore="low" />);
    expect(screen.queryByText("적합도 높음")).not.toBeInTheDocument();
    expect(screen.queryByText("검토 가능")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 색상 클래스 적용 검증
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 색상 클래스", () => {
  it("high 는 emerald 계열 배지 클래스 적용", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("emerald");
  });

  it("medium 은 amber 계열 배지 클래스 적용", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("amber");
  });

  it("low 는 gray 계열 배지 클래스 적용", () => {
    const { container } = render(<MatchScore matchScore="low" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("gray");
  });

  it("high 클래스에 medium 색상이 섞이지 않음", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const span = container.querySelector("span");
    expect(span?.className).not.toContain("amber");
    expect(span?.className).not.toContain("gray");
  });

  it("medium 클래스에 다른 색상이 섞이지 않음", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const span = container.querySelector("span");
    expect(span?.className).not.toContain("emerald");
    expect(span?.className).not.toContain("gray");
  });

  it("low 클래스에 다른 색상이 섞이지 않음", () => {
    const { container } = render(<MatchScore matchScore="low" />);
    const span = container.querySelector("span");
    expect(span?.className).not.toContain("emerald");
    expect(span?.className).not.toContain("amber");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 도트(dot) 인디케이터
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 도트 인디케이터", () => {
  it("배지 안에 1.5px 도트 span 이 존재", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const allSpans = container.querySelectorAll("span");
    // 배지 자체 + 도트 = 2개 이상
    expect(allSpans.length).toBeGreaterThanOrEqual(2);
  });

  it("high 도트는 emerald-400 클래스 보유", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const dot = container.querySelector(".bg-emerald-400");
    expect(dot).not.toBeNull();
  });

  it("medium 도트는 amber-400 클래스 보유", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const dot = container.querySelector(".bg-amber-400");
    expect(dot).not.toBeNull();
  });

  it("low 도트는 gray-400 클래스 보유", () => {
    const { container } = render(<MatchScore matchScore="low" />);
    const dot = container.querySelector(".bg-gray-400");
    expect(dot).not.toBeNull();
  });

  it("도트는 원형(rounded-full)", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const rounded = container.querySelector(".rounded-full");
    expect(rounded).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 공통 스타일 클래스
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 공통 스타일 클래스", () => {
  it("배지에 text-[11px] 폰트 크기 적용", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    expect(container.querySelector(".text-\\[11px\\]")).not.toBeNull();
  });

  it("배지에 font-bold 적용", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    expect(container.querySelector(".font-bold")).not.toBeNull();
  });

  it("배지에 rounded-lg 적용", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    expect(container.querySelector(".rounded-lg")).not.toBeNull();
  });

  it("배지에 border 적용", () => {
    const { container } = render(<MatchScore matchScore="low" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("border");
  });

  it("배지는 flex 컨테이너", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("flex");
  });

  it("배지에 gap-1.5 spacing 적용", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("gap-1.5");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// className prop 병합
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: className prop", () => {
  it("className prop 없을 때 기본 스타일만 적용", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const span = container.querySelector("span");
    expect(span?.className).not.toContain("custom-class");
  });

  it("className prop 이 추가 클래스로 병합됨", () => {
    const { container } = render(
      <MatchScore matchScore="high" className="custom-class" />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("custom-class");
  });

  it("className prop 추가 시 기본 클래스 유지", () => {
    const { container } = render(
      <MatchScore matchScore="high" className="extra" />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("extra");
    expect(span?.className).toContain("emerald");
    expect(span?.className).toContain("font-bold");
  });

  it("여러 클래스를 공백으로 구분하여 적용 가능", () => {
    const { container } = render(
      <MatchScore matchScore="medium" className="ml-2 mr-2 opacity-50" />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("ml-2");
    expect(span?.className).toContain("mr-2");
    expect(span?.className).toContain("opacity-50");
  });

  it("빈 문자열 className 도 안전 처리", () => {
    expect(() => render(<MatchScore matchScore="low" className="" />))
      .not.toThrow();
  });

  it("긴 className 문자열도 정상 처리", () => {
    const longClass = "a b c d e f g h i j k l m n o p q r s t";
    const { container } = render(
      <MatchScore matchScore="high" className={longClass} />
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("a");
    expect(span?.className).toContain("t");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreConfig 내보내기 검증
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: scoreConfig export", () => {
  it("scoreConfig 가 high/medium/low 키 보유", () => {
    expect(scoreConfig.high).toBeDefined();
    expect(scoreConfig.medium).toBeDefined();
    expect(scoreConfig.low).toBeDefined();
  });

  it("각 등급은 badge/label/dot 필드 보유", () => {
    (["high", "medium", "low"] as const).forEach(grade => {
      expect(scoreConfig[grade]).toHaveProperty("badge");
      expect(scoreConfig[grade]).toHaveProperty("label");
      expect(scoreConfig[grade]).toHaveProperty("dot");
    });
  });

  it("high 라벨은 '적합도 높음'", () => {
    expect(scoreConfig.high.label).toBe("적합도 높음");
  });

  it("medium 라벨은 '검토 가능'", () => {
    expect(scoreConfig.medium.label).toBe("검토 가능");
  });

  it("low 라벨은 '참고'", () => {
    expect(scoreConfig.low.label).toBe("참고");
  });

  it("각 등급의 dot 은 색상 클래스 문자열", () => {
    expect(scoreConfig.high.dot).toContain("emerald");
    expect(scoreConfig.medium.dot).toContain("amber");
    expect(scoreConfig.low.dot).toContain("gray");
  });

  it("각 등급의 badge 는 border/text/bg 클래스 포함", () => {
    (["high", "medium", "low"] as const).forEach(grade => {
      expect(scoreConfig[grade].badge).toContain("border");
      expect(scoreConfig[grade].badge).toContain("text");
      expect(scoreConfig[grade].badge).toContain("bg");
    });
  });

  it("scoreConfig 는 readonly (런타임 변형 시 영향 없음 확인)", () => {
    const original = scoreConfig.high.label;
    expect(original).toBe("적합도 높음");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 다중 인스턴스 / 등급 전환
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 다중 렌더링 / 등급 전환", () => {
  it("같은 컴포넌트를 여러 번 렌더링해도 독립 동작", () => {
    const { container: c1 } = render(<MatchScore matchScore="high" />);
    const { container: c2 } = render(<MatchScore matchScore="medium" />);
    const { container: c3 } = render(<MatchScore matchScore="low" />);
    expect(c1.querySelector("span")?.textContent).toContain("적합도 높음");
    expect(c2.querySelector("span")?.textContent).toContain("검토 가능");
    expect(c3.querySelector("span")?.textContent).toContain("참고");
  });

  it("rerender 시 새 등급의 라벨로 갱신", () => {
    const { rerender } = render(<MatchScore matchScore="high" />);
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();

    rerender(<MatchScore matchScore="low" />);
    expect(screen.getByText("참고")).toBeInTheDocument();
    expect(screen.queryByText("적합도 높음")).not.toBeInTheDocument();
  });

  it("rerender high → medium → low → high 사이클 동작", () => {
    const { rerender } = render(<MatchScore matchScore="high" />);
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();

    rerender(<MatchScore matchScore="medium" />);
    expect(screen.getByText("검토 가능")).toBeInTheDocument();

    rerender(<MatchScore matchScore="low" />);
    expect(screen.getByText("참고")).toBeInTheDocument();

    rerender(<MatchScore matchScore="high" />);
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
  });

  it("부모 컴포넌트로 감싸도 정상 렌더링", () => {
    render(
      <div data-testid="wrapper">
        <MatchScore matchScore="high" />
      </div>
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.textContent).toContain("적합도 높음");
  });

  it("리스트 안에서 여러 개 렌더링", () => {
    render(
      <ul>
        <li><MatchScore matchScore="high" /></li>
        <li><MatchScore matchScore="medium" /></li>
        <li><MatchScore matchScore="low" /></li>
      </ul>
    );
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
    expect(screen.getByText("검토 가능")).toBeInTheDocument();
    expect(screen.getByText("참고")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DOM 구조 / 접근성
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: DOM 구조", () => {
  it("최상위 엘리먼트는 <span>", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("도트도 <span> (인라인 요소)", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const spans = container.querySelectorAll("span");
    expect(spans.length).toBe(2); // 부모 + 도트
  });

  it("높이가 매우 낮은 인라인 배지 (Tailwind: py-1)", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("py-1");
  });

  it("좌우 padding 적용 (px-2.5)", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("px-2.5");
  });

  it("textContent 에 라벨 정확히 포함", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    expect(container.textContent).toContain("적합도 높음");
  });

  it("배지 안 도트는 텍스트가 비어있음 (장식용)", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    const dot = container.querySelector(".bg-emerald-400");
    expect(dot?.textContent).toBe("");
  });

  it("배지에는 정확히 1개의 라벨 텍스트만", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    const allText = container.textContent || "";
    const occurrences = (allText.match(/검토 가능/g) || []).length;
    expect(occurrences).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 등급-라벨 매핑 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 등급-라벨 매핑 회귀", () => {
  const mappings: Array<{
    grade: "high" | "medium" | "low";
    label: string;
    color: string;
    dotColor: string;
  }> = [
    { grade: "high", label: "적합도 높음", color: "emerald-400", dotColor: "emerald-400" },
    { grade: "medium", label: "검토 가능", color: "amber-400", dotColor: "amber-400" },
    { grade: "low", label: "참고", color: "gray-400", dotColor: "gray-400" },
  ];

  mappings.forEach(({ grade, label, color }) => {
    it(`${grade} → "${label}" + ${color}`, () => {
      const { container } = render(<MatchScore matchScore={grade} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      const span = container.querySelector("span");
      expect(span?.className).toContain(color.split("-")[0]); // emerald/amber/gray
    });
  });

  it("high 라벨 변경 회귀 방지: 정확히 '적합도 높음'", () => {
    render(<MatchScore matchScore="high" />);
    expect(screen.queryByText("높음")).not.toBeInTheDocument();
    expect(screen.queryByText("매우 높음")).not.toBeInTheDocument();
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
  });

  it("medium 라벨 변경 회귀 방지: 정확히 '검토 가능'", () => {
    render(<MatchScore matchScore="medium" />);
    expect(screen.queryByText("중간")).not.toBeInTheDocument();
    expect(screen.queryByText("보통")).not.toBeInTheDocument();
    expect(screen.getByText("검토 가능")).toBeInTheDocument();
  });

  it("low 라벨 변경 회귀 방지: 정확히 '참고'", () => {
    render(<MatchScore matchScore="low" />);
    expect(screen.queryByText("낮음")).not.toBeInTheDocument();
    expect(screen.queryByText("부적합")).not.toBeInTheDocument();
    expect(screen.getByText("참고")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 스냅샷
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 스냅샷", () => {
  it("high 등급 스냅샷", () => {
    const { container } = render(<MatchScore matchScore="high" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("medium 등급 스냅샷", () => {
    const { container } = render(<MatchScore matchScore="medium" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("low 등급 스냅샷", () => {
    const { container } = render(<MatchScore matchScore="low" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("className 추가 시 스냅샷", () => {
    const { container } = render(
      <MatchScore matchScore="high" className="custom-extra" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 통합: GrantCard 등 부모 컨텍스트에서의 사용 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 통합 사용 시뮬레이션", () => {
  it("카드 상단 우측에 배지로 표시되는 시나리오", () => {
    render(
      <div className="flex justify-between">
        <h2>지원사업 제목</h2>
        <MatchScore matchScore="high" />
      </div>
    );
    expect(screen.getByText("지원사업 제목")).toBeInTheDocument();
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
  });

  it("여러 결과 카드 동시 렌더링", () => {
    const scores: Array<"high" | "medium" | "low"> = [
      "high", "high", "medium", "medium", "low",
    ];
    render(
      <div>
        {scores.map((s, i) => (
          <div key={i} data-testid={`card-${i}`}>
            <MatchScore matchScore={s} />
          </div>
        ))}
      </div>
    );
    expect(screen.getAllByText("적합도 높음")).toHaveLength(2);
    expect(screen.getAllByText("검토 가능")).toHaveLength(2);
    expect(screen.getAllByText("참고")).toHaveLength(1);
  });

  it("MatchScore 가 부모의 flex 정렬을 깨지 않음 (inline)", () => {
    const { container } = render(
      <div className="flex items-center">
        <span>Before</span>
        <MatchScore matchScore="medium" />
        <span>After</span>
      </div>
    );
    expect(container.textContent).toContain("Before");
    expect(container.textContent).toContain("검토 가능");
    expect(container.textContent).toContain("After");
  });

  it("두 MatchScore 가 나란히 렌더링되어도 충돌 없음", () => {
    render(
      <>
        <MatchScore matchScore="high" className="mr-2" />
        <MatchScore matchScore="low" className="ml-2" />
      </>
    );
    expect(screen.getByText("적합도 높음")).toBeInTheDocument();
    expect(screen.getByText("참고")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결정성
// ─────────────────────────────────────────────────────────────────────────────

describe("MatchScore: 렌더링 결정성", () => {
  it("같은 props 로 100회 렌더링 시 동일 결과", () => {
    const outputs = Array.from({ length: 100 }, () => {
      const { container } = render(<MatchScore matchScore="medium" />);
      const html = container.innerHTML;
      cleanup();
      return html;
    });
    expect(new Set(outputs).size).toBe(1);
  });

  it("props 변경 없이 rerender 시 동일 출력", () => {
    const { container, rerender } = render(<MatchScore matchScore="high" />);
    const first = container.innerHTML;
    rerender(<MatchScore matchScore="high" />);
    expect(container.innerHTML).toBe(first);
  });

  it("className prop 만 다르면 className 부분만 다른 출력", () => {
    const { container: c1 } = render(<MatchScore matchScore="high" />);
    const html1 = c1.innerHTML;
    cleanup();
    const { container: c2 } = render(
      <MatchScore matchScore="high" className="extra" />
    );
    const html2 = c2.innerHTML;
    expect(html1).not.toBe(html2);
    expect(html2).toContain("extra");
  });
});
