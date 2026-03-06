/**
 * 약품 할인율 계산 유틸리티
 *
 * 할인율은 유통기한 잔여일, 개봉 여부, 제품 상태를 종합하여 산출합니다.
 *
 * [유통기한 기반]
 *  - 만료:        70%
 *  - 1개월 미만:  55%
 *  - 1~3개월:     40%
 *  - 3~6개월:     25%
 *  - 6개월 이상:  10%
 *
 * [개봉 여부]
 *  - 개봉: +10%
 *
 * [제품 상태]
 *  - 하: +10%
 *  - 중: +5%
 *
 * 최대 할인율: 80%
 */

export function getRemainingDays(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function calculateDiscountRate(
  expiryDate: string,
  isOpened: string,
  condition: string
): number {
  const days = getRemainingDays(expiryDate);

  // 유통기한 기반 할인율
  let rate: number;
  if (days <= 0) rate = 0.7;
  else if (days < 30) rate = 0.55;
  else if (days < 90) rate = 0.4;
  else if (days < 180) rate = 0.25;
  else rate = 0.1;

  // 개봉 여부
  if (isOpened === "개봉") rate += 0.1;

  // 제품 상태
  if (condition === "하") rate += 0.1;
  else if (condition === "중") rate += 0.05;

  return Math.min(rate, 0.8);
}

export function parsePrice(maxPrice: string): number {
  return parseInt(maxPrice.replace(/[^0-9]/g, ""), 10) || 0;
}

export function calculateDiscountedPrice(
  maxPrice: string,
  expiryDate: string,
  isOpened: string,
  condition: string
): number {
  const price = parsePrice(maxPrice);
  const rate = calculateDiscountRate(expiryDate, isOpened, condition);
  return Math.round(price * (1 - rate));
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR");
}
