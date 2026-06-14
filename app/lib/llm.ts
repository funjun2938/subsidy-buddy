// Shared LLM helpers used by /api/fill-hwp-ai and /api/doc/command.
// runLLM: Gemini-first with Claude fallback.
// parseJsonLoose: extracts JSON from potentially markdown-wrapped LLM output.

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

export function parseJsonLoose(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

export async function runLLM(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      });
      const r = await model.generateContent(prompt);
      return r.response.text();
    } catch (e) {
      console.warn("[llm] gemini failed:", e);
    }
  }
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey !== "your_anthropic_api_key_here") {
    const anthropic = new Anthropic({ apiKey: claudeKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const c = msg.content[0];
    if (c.type === "text") return c.text;
  }
  throw new Error("LLM API 키가 설정돼 있지 않습니다 (GEMINI_API_KEY 또는 ANTHROPIC_API_KEY).");
}
