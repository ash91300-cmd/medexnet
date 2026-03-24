/**
 * 약품 할인율 및 가격 계산 유틸리티
 *
 * [유효기간 기반 할인율]
 *  - 1년 이상:       5%
 *  - 6개월~1년:      8%
 *  - 3개월~6개월:    12%
 *  - 1개월~3개월:    17%
 *  - 1개월 미만:     거래 불가
 *
 * [개봉 여부]
 *  - 미개봉: 0%
 *  - 개봉:   +3%
 *
 * 총 할인율 = 유효기간 + 개봉여부 (최대 20%)
 *
 * [가격 구조]
 *  - 판매가 = 약가상한(max_price) × (1 - 할인율) → 구매 약국이 지불하는 금액
 *  - MedExNet 수수료 = 판매가 × 3%
 *  - 매입가 = 판매가 - 수수료 → 판매 약국이 수령하는 금액
 *
 * [택배비]
 *  - 판매 약국 단위로 각각 발생
 *  - 구매 약국 50% + 판매 약국 50% 부담
 */

/** 택배비 (원) */
export const SHIPPING_COST = 4000;

export function getRemainingDays(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getRemainingMonths(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    (expiry.getFullYear() - today.getFullYear()) * 12 +
    (expiry.getMonth() - today.getMonth()) +
    (expiry.getDate() >= today.getDate() ? 0 : -1)
  );
}

/**
 * 거래 가능 여부 확인 (유효기간 1개월 미만이면 거래 불가)
 */
export function isTradeable(expiryDate: string): boolean {
  return getRemainingDays(expiryDate) >= 30;
}

/**
 * 할인율 계산 (최대 20%)
 * 제품 상태(상/중/하)는 할인율에 영향 없음 (관리자 승인 시 사진으로 판정)
 * @returns 할인율 (0~0.20), 거래불가 시 -1
 */
export function calculateDiscountRate(
  expiryDate: string,
  isOpened: string,
  _condition?: string,
): number {
  const months = getRemainingMonths(expiryDate);
  const days = getRemainingDays(expiryDate);

  // 1개월 미만: 거래 불가
  if (days < 30) return -1;

  // 유효기간 기반 할인율
  let rate: number;
  if (months >= 12) rate = 0.05;
  else if (months >= 6) rate = 0.08;
  else if (months >= 3) rate = 0.12;
  else rate = 0.17; // 1~3개월

  // 개봉 여부
  if (isOpened === "개봉") rate += 0.03;

  return Math.min(rate, 0.20);
}

export function parsePrice(maxPrice: string): number {
  return parseInt(maxPrice.replace(/[^0-9]/g, ""), 10) || 0;
}

/**
 * 판매가 계산 (구매 약국이 지불하는 금액)
 * 판매가 = 약가상한(max_price) × (1 - 할인율)
 */
export function calculateSellingPrice(
  maxPrice: string,
  expiryDate: string,
  isOpened: string,
): number {
  const price = parsePrice(maxPrice);
  const rate = calculateDiscountRate(expiryDate, isOpened);
  if (rate < 0) return 0;
  return Math.round(price * (1 - rate));
}

/**
 * MedExNet 수수료 계산 (판매가 × 3%)
 */
export function calculateCommission(sellingPrice: number): number {
  return Math.round(sellingPrice * 0.03);
}

/**
 * 매입가 계산 (판매 약국이 수령하는 금액)
 * 매입가 = 판매가 - 수수료
 */
export function calculatePurchasePrice(sellingPrice: number): number {
  return sellingPrice - calculateCommission(sellingPrice);
}

/**
 * 하위 호환용 - calculateDiscountedPrice를 판매가 계산으로 대체
 */
export function calculateDiscountedPrice(
  maxPrice: string,
  expiryDate: string,
  isOpened: string,
  _condition?: string,
): number {
  return calculateSellingPrice(maxPrice, expiryDate, isOpened);
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR");
}

/**
 * 택배비 관련 헬퍼
 * 구매 약국 부담분 = 택배비 × 판매약국 수 / 2
 */
export function calculateBuyerShippingCost(sellerCount: number): number {
  return Math.round((SHIPPING_COST * sellerCount) / 2);
}

/**
 * 판매 약국 부담분 (건당) = 택배비 / 2
 */
export function calculateSellerShippingCost(): number {
  return Math.round(SHIPPING_COST / 2);
}
