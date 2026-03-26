import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const carrierCode = searchParams.get("carrier_code");
  const trackingNumber = searchParams.get("tracking_number");

  if (!carrierCode || !trackingNumber) {
    return NextResponse.json(
      { error: "carrier_code와 tracking_number가 필요합니다." },
      { status: 400 },
    );
  }

  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const url = new URL(
      "https://info.sweettracker.co.kr/api/v1/trackingInfo",
    );
    url.searchParams.set("t_key", apiKey);
    url.searchParams.set("t_code", carrierCode);
    url.searchParams.set("t_invoice", trackingNumber);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "배송 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
