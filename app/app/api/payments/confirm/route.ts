// Toss 위젯 전용 테스트 시크릿 키 (test_gsk_*)
const TOSS_SECRET_KEY =
  process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

export async function POST(request: Request) {
  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== "number") {
    return Response.json(
      { ok: false, error: "필수 파라미터가 누락되었습니다." },
      { status: 400 },
    );
  }

  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");

  const tossRes = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    },
  );

  const data = await tossRes.json();

  if (!tossRes.ok) {
    return Response.json(
      {
        ok: false,
        error: data?.message ?? "결제 승인에 실패했습니다.",
        code: data?.code,
      },
      { status: tossRes.status },
    );
  }

  return Response.json({
    ok: true,
    orderName: data.orderName,
    method: data.method,
    approvedAt: data.approvedAt,
    totalAmount: data.totalAmount,
  });
}
