/** 택배사 목록 (스마트택배 API 코드 기준) */
export const CARRIERS = [
  { code: "04", name: "CJ대한통운" },
  { code: "05", name: "한진택배" },
  { code: "08", name: "롯데택배" },
  { code: "01", name: "우체국택배" },
  { code: "06", name: "로젠택배" },
] as const;

export type CarrierCode = (typeof CARRIERS)[number]["code"];

export function getCarrierName(code: string): string {
  return CARRIERS.find((c) => c.code === code)?.name ?? code;
}
