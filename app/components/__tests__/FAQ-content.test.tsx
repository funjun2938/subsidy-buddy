import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FAQ from "@/components/FAQ";

/**
 * FAQ 콘텐츠 정확도 회귀 테스트
 *
 * FAQ 텍스트는 마케팅/법적 책임이 연동되어 있어
 * 답변 내용이 의도와 다르게 바뀌는 것을 방지하는 회귀 가드.
 */

const ALL_QUESTIONS = [
  "어떤 지원사업을 매칭해주나요?",
  "AI 매칭은 정확한가요?",
  "사업자등록증을 업로드하면 안전한가요?",
  "AI 신청서 생성은 어떻게 작동하나요?",
  "무료로 이용할 수 있나요?",
];

const OPEN = async (q: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByText(q));
};

describe("FAQ content regression (각 답변의 핵심 문장)", () => {
  describe("Q1: 매칭 데이터 소스", () => {
    it("answer mentions '기업마당 공공API'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[0]);
      expect(screen.getByText(/기업마당 공공API/)).toBeInTheDocument();
    });

    it("answer mentions '중소벤처기업부'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[0]);
      expect(screen.getByText(/중소벤처기업부/)).toBeInTheDocument();
    });

    it("answer mentions '소상공인시장진흥공단'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[0]);
      expect(screen.getByText(/소상공인시장진흥공단/)).toBeInTheDocument();
    });

    it("answer mentions '500건 이상'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[0]);
      expect(screen.getByText(/500건 이상/)).toBeInTheDocument();
    });

    it("answer mentions '실시간으로 수집'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[0]);
      expect(screen.getByText(/실시간으로 수집/)).toBeInTheDocument();
    });
  });

  describe("Q2: AI 매칭 정확도", () => {
    it("answer mentions 5 dimensions", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/5가지 조건/)).toBeInTheDocument();
    });

    it("answer lists '업종'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/업종/)).toBeInTheDocument();
    });

    it("answer lists '매출'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/매출/)).toBeInTheDocument();
    });

    it("answer lists '지역'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/지역/)).toBeInTheDocument();
    });

    it("answer lists '업력'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/업력/)).toBeInTheDocument();
    });

    it("answer lists '대표자 나이'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/대표자 나이/)).toBeInTheDocument();
    });

    it("answer explains 3-step grading 'high/medium/low'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/높음\/보통\/낮음/)).toBeInTheDocument();
    });

    it("answer recommends checking 공고 원문", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/공고 원문/)).toBeInTheDocument();
    });

    it("answer disclaims as '참고용'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[1]);
      expect(screen.getByText(/참고용/)).toBeInTheDocument();
    });
  });

  describe("Q3: 보안", () => {
    it("answer states '서버에 영구 저장되지 않습니다'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[2]);
      expect(
        screen.getByText(/서버에 영구 저장되지 않습니다/),
      ).toBeInTheDocument();
    });

    it("answer states '메모리에서 즉시 삭제'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[2]);
      expect(screen.getByText(/메모리에서 즉시 삭제/)).toBeInTheDocument();
    });

    it("answer scopes use to 'AI 분석을 위해서만'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[2]);
      expect(screen.getByText(/AI 분석을 위해서만/)).toBeInTheDocument();
    });
  });

  describe("Q4: 신청서 생성", () => {
    it("answer mentions '예비창업패키지'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[3]);
      expect(screen.getByText(/예비창업패키지/)).toBeInTheDocument();
    });

    it("answer mentions '초기창업패키지'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[3]);
      expect(screen.getByText(/초기창업패키지/)).toBeInTheDocument();
    });

    it("answer mentions '공식 양식'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[3]);
      expect(screen.getByText(/공식 양식/)).toBeInTheDocument();
    });

    it("answer mentions 6 sections", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[3]);
      expect(screen.getByText(/6개 섹션/)).toBeInTheDocument();
    });

    it("answer mentions checklist", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[3]);
      expect(screen.getByText(/체크리스트/)).toBeInTheDocument();
    });
  });

  describe("Q5: 가격", () => {
    it("answer states '완전 무료입니다'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[4]);
      expect(screen.getByText(/완전 무료입니다/)).toBeInTheDocument();
    });

    it("answer mentions '결과 3건'", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[4]);
      expect(screen.getByText(/결과 3건/)).toBeInTheDocument();
    });

    it("answer mentions free 사업자등록증 분석", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[4]);
      expect(screen.getByText(/사업자등록증 AI 분석도 무료/)).toBeInTheDocument();
    });

    it("answer notes paid features (신청서 + 전문가)", async () => {
      render(<FAQ />);
      await OPEN(ALL_QUESTIONS[4]);
      expect(
        screen.getByText(/AI 신청서 생성과 전문가 매칭은 유료/),
      ).toBeInTheDocument();
    });
  });
});
