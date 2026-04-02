"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import {
  calculateDiscountRate,
  calculateDiscountedPrice,
  parsePrice,
  formatPrice,
  SHIPPING_COST,
  calculateBuyerShippingCost,
} from "@/lib/discount";

interface DrugInfo {
  product_code: number;
  product_name: string;
  company_name: string;
  max_price: string;
  unit: string;
}

interface MedicineInfo {
  id: string;
  drug_id: number;
  seller_id: string;
  quantity: number;
  expiry_date: string;
  is_opened: string;
  image_urls: string[];
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

interface CartItem {
  id: string;
  medicine_id: string;
  quantity: number;
  medicines: MedicineInfo | MedicineInfo[] | null;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

interface DeliveryInfo {
  pharmacyName: string;
  pharmacistName: string;
  phone: string;
  address: string;
}

interface SellerGroup {
  sellerId: string;
  pharmacyName: string;
  items: CartItem[];
}

function getDrug(medicine: MedicineInfo): DrugInfo | null {
  return Array.isArray(medicine.drugs_Fe)
    ? (medicine.drugs_Fe[0] ?? null)
    : (medicine.drugs_Fe ?? null);
}

function getMedicine(item: CartItem): MedicineInfo | null {
  return Array.isArray(item.medicines)
    ? (item.medicines[0] ?? null)
    : (item.medicines ?? null);
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [delivery, setDelivery] = useState<DeliveryInfo>({
    pharmacyName: "",
    pharmacistName: "",
    phone: "",
    address: "",
  });
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({});

  // 미인증 사용자 리다이렉트
  useEffect(() => {
    if (!authLoading && user && profile?.verification_status !== "verified") {
      router.replace("/");
    }
    if (!authLoading && !user) {
      router.replace("/auth");
    }
  }, [authLoading, user, profile, router]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // 장바구니 + 약사 인증 정보 로드
  useEffect(() => {
    if (authLoading || !user) return;

    async function fetchData() {
      // 장바구니 데이터
      const { data: cartData, error: cartError } = await supabase
        .from("cart_items")
        .select(
          `id, medicine_id, quantity, medicines(id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, drugs_Fe(product_code, product_name, company_name, max_price, unit))`,
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (cartError) {
        showToast("장바구니를 불러오는 데 실패했습니다.", "error");
        setLoading(false);
        return;
      }

      if (!cartData || cartData.length === 0) {
        router.replace("/cart");
        return;
      }

      const items = cartData as CartItem[];
      setCartItems(items);

      // 판매약국 이름 조회
      const sellerIds = [
        ...new Set(
          items
            .map((item) => getMedicine(item)?.seller_id)
            .filter((id): id is string => !!id),
        ),
      ];

      if (sellerIds.length > 0) {
        const { data: sellerVerData } = await supabase
          .from("verification_requests")
          .select("user_id, pharmacy_name")
          .in("user_id", sellerIds)
          .eq("status", "approved");

        if (sellerVerData) {
          const names: Record<string, string> = {};
          for (const v of sellerVerData) {
            if (v.pharmacy_name) {
              const name = v.pharmacy_name as string;
              names[v.user_id] =
                name.length > 2 ? name.slice(0, 2) + "***" : name + "***";
            }
          }
          setPharmacyNames(names);
        }
      }

      // 약사 인증 정보 자동 채우기
      const { data: verData } = await supabase
        .from("verification_requests")
        .select("pharmacy_name, pharmacist_name, phone, address")
        .eq("user_id", user!.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (verData) {
        setDelivery({
          pharmacyName: verData.pharmacy_name ?? "",
          pharmacistName: verData.pharmacist_name ?? "",
          phone: verData.phone ?? "",
          address: verData.address ?? "",
        });
      }

      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // 할인 적용된 단가 계산
  function getDiscountedPrice(item: CartItem): number {
    const medicine = getMedicine(item);
    if (!medicine) return 0;
    const drug = getDrug(medicine);
    return calculateDiscountedPrice(
      drug?.max_price ?? "0",
      medicine.expiry_date,
      medicine.is_opened,
    );
  }

  // 상품 금액 합계
  function getProductTotal(): number {
    return cartItems.reduce((sum, item) => {
      return sum + getDiscountedPrice(item) * item.quantity;
    }, 0);
  }

  // 판매약국별 그룹핑
  function getSellerGroups(): SellerGroup[] {
    const map = new Map<string, SellerGroup>();
    for (const item of cartItems) {
      const medicine = getMedicine(item);
      if (!medicine) continue;
      const sellerId = medicine.seller_id;
      let group = map.get(sellerId);
      if (!group) {
        group = {
          sellerId,
          pharmacyName: pharmacyNames[sellerId] ?? "알 수 없는 약국",
          items: [],
        };
        map.set(sellerId, group);
      }
      group.items.push(item);
    }
    return Array.from(map.values());
  }

  function getSellerCount(): number {
    return getSellerGroups().length;
  }

  // 총 결제 금액 (상품 + 택배비 구매자 부담분)
  function getTotalPrice(): number {
    return getProductTotal() + calculateBuyerShippingCost(getSellerCount());
  }

  // 결제 (주문 생성)
  async function handleOrder() {
    if (!user || submitting) return;

    if (!delivery.pharmacyName || !delivery.phone || !delivery.address) {
      showToast(
        "약사 인증 정보가 불완전합니다. 인증 정보를 확인해주세요.",
        "error",
      );
      return;
    }

    setSubmitting(true);

    try {
      // 0. 재고 사전 검증 (주문 전 최신 재고 확인)
      for (const item of cartItems) {
        const medicine = getMedicine(item);
        if (!medicine) continue;

        const { data: latestMed } = await supabase
          .from("medicines")
          .select("quantity")
          .eq("id", medicine.id)
          .single();

        if (!latestMed || latestMed.quantity < item.quantity) {
          const drug = getDrug(medicine);
          showToast(
            `"${drug?.product_name ?? "약품"}"의 재고가 부족합니다. (남은 수량: ${latestMed?.quantity ?? 0}개)`,
            "error",
          );
          setSubmitting(false);
          return;
        }
      }

      const totalAmount = getTotalPrice();

      // 1. orders 테이블에 주문 생성
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          total_amount: totalAmount,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError || !order) {
        showToast("주문 생성에 실패했습니다.", "error");
        setSubmitting(false);
        return;
      }

      // 2. order_items 테이블에 개별 약품 저장
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        price_at_purchase: getDiscountedPrice(item),
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        showToast("주문 항목 저장에 실패했습니다.", "error");
        setSubmitting(false);
        return;
      }

      // 3. medicines 수량 차감 (원자적 재고 검증 + 차감)
      for (const item of cartItems) {
        const medicine = getMedicine(item);
        if (!medicine) continue;

        const { error: stockError } = await supabase.rpc("deduct_stock", {
          p_medicine_id: medicine.id,
          p_quantity: item.quantity,
        });

        if (stockError) {
          // 재고 부족 시 주문 취소
          await supabase.from("order_items").delete().eq("order_id", order.id);
          await supabase.from("orders").delete().eq("id", order.id);
          const drug = getDrug(medicine);
          showToast(
            `"${drug?.product_name ?? "약품"}"의 재고가 부족합니다. 장바구니에서 수량을 확인해주세요.`,
            "error",
          );
          setSubmitting(false);
          return;
        }
      }

      // 4. cart_items 비우기
      await supabase.from("cart_items").delete().eq("user_id", user.id);

      // 5. 완료 처리
      showToast("주문이 완료되었습니다!", "success");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch {
      showToast("주문 처리 중 오류가 발생했습니다.", "error");
      setSubmitting(false);
    }
  }

  /* -- 로딩 -- */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const sellerGroups = getSellerGroups();
  const sellerCount = sellerGroups.length;
  const productTotal = getProductTotal();
  const buyerShipping = calculateBuyerShippingCost(sellerCount);
  const originalTotal = cartItems.reduce((sum, item) => {
    const medicine = getMedicine(item);
    if (!medicine) return sum;
    const drug = getDrug(medicine);
    return sum + parsePrice(drug?.max_price ?? "0") * item.quantity;
  }, 0);
  const discountAmount = originalTotal - productTotal;

  /* -- 결제 페이지 -- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10 page-enter">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">주문 / 결제</h1>

        <div className="space-y-6">
          {/* -- 주문 약품 목록 (판매약국별 그룹) -- */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                주문 약품
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {cartItems.length}건
                </span>
              </h2>
            </div>

            {sellerGroups.map((group) => (
              <div key={group.sellerId}>
                {/* 약국 헤더 */}
                <div className="flex items-center justify-between px-6 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      {group.pharmacyName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    택배비 {formatPrice(SHIPPING_COST)}원
                  </span>
                </div>

                {/* 약품 목록 */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => {
                    const medicine = getMedicine(item);
                    if (!medicine) return null;
                    const drug = getDrug(medicine);
                    const maxPrice = parsePrice(drug?.max_price ?? "0");
                    const discountRate = calculateDiscountRate(
                      medicine.expiry_date,
                      medicine.is_opened,
                    );
                    const discountedPrice = getDiscountedPrice(item);

                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4">
                        {/* 이미지 */}
                        <div className="relative w-14 h-14 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                          {medicine.image_urls?.[0] ? (
                            <Image
                              src={medicine.image_urls[0]}
                              alt={drug?.product_name ?? "약품"}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* 약품 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {drug?.product_name ?? "알 수 없는 약품"}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {drug?.company_name} · 수량 {item.quantity}개
                          </p>
                        </div>

                        {/* 가격 */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1.5 justify-end">
                            {discountRate > 0 && (
                              <span className="text-xs text-red-500 font-semibold">
                                {Math.round(discountRate * 100)}%
                              </span>
                            )}
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(maxPrice)}원
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {formatPrice(discountedPrice * item.quantity)}원
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          {/* -- 배송 정보 (약사 인증 정보에서 자동 입력) -- */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">배송 정보</h2>
              <p className="text-xs text-gray-400 mt-1">
                약사 인증 시 등록한 정보로 자동 입력됩니다.
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-500 flex-shrink-0 w-14">
                    약국명
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {delivery.pharmacyName || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-500 flex-shrink-0 w-14">
                    수령인
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {delivery.pharmacistName || "-"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500 flex-shrink-0 w-14">
                  연락처
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {delivery.phone || "-"}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500 flex-shrink-0 w-14">
                  주소
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {delivery.address || "-"}
                </span>
              </div>
            </div>
          </section>

          {/* -- 결제 요약 + 결제 버튼 -- */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">결제 금액</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품 금액 (약가상한 기준)</span>
                <span className="text-gray-900">
                  {formatPrice(originalTotal)}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">할인 금액</span>
                <span className="text-red-500">
                  -{formatPrice(discountAmount)}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">판매가 소계</span>
                <span className="text-gray-900">
                  {formatPrice(productTotal)}원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  택배비 (구매자 부담 50%)
                </span>
                <span className="text-gray-900">
                  {formatPrice(buyerShipping)}원
                  <span className="text-xs text-gray-400 ml-1">
                    ({sellerCount}건 x {formatPrice(SHIPPING_COST / 2)}원)
                  </span>
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">
                    총 결제 금액
                  </span>
                  <span className="text-2xl font-bold text-sky-600">
                    {formatPrice(getTotalPrice())}원
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOrder}
              disabled={submitting}
              className="w-full h-12 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-base flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  주문 처리 중...
                </>
              ) : (
                `${formatPrice(getTotalPrice())}원 결제하기`
              )}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
