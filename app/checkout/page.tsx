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
  quantity: number;
  expiry_date: string;
  is_opened: string;
  condition: string;
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

function getDrug(medicine: MedicineInfo): DrugInfo | null {
  return Array.isArray(medicine.drugs_Fe)
    ? medicine.drugs_Fe[0] ?? null
    : medicine.drugs_Fe ?? null;
}

function getMedicine(item: CartItem): MedicineInfo | null {
  return Array.isArray(item.medicines)
    ? item.medicines[0] ?? null
    : item.medicines ?? null;
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
          `id, medicine_id, quantity, medicines(id, drug_id, quantity, expiry_date, is_opened, condition, image_urls, drugs_Fe(product_code, product_name, company_name, max_price, unit))`
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

      setCartItems(cartData as CartItem[]);

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
      medicine.condition
    );
  }

  // 총 결제 금액
  function getTotalPrice(): number {
    return cartItems.reduce((sum, item) => {
      return sum + getDiscountedPrice(item) * item.quantity;
    }, 0);
  }

  // 결제 (주문 생성)
  async function handleOrder() {
    if (!user || submitting) return;

    if (!delivery.pharmacyName || !delivery.phone || !delivery.address) {
      showToast("약사 인증 정보가 불완전합니다. 인증 정보를 확인해주세요.", "error");
      return;
    }

    setSubmitting(true);

    try {
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

      // 3. medicines 수량 차감
      for (const item of cartItems) {
        const medicine = getMedicine(item);
        if (!medicine) continue;

        const newQty = Math.max(0, medicine.quantity - item.quantity);
        await supabase
          .from("medicines")
          .update({ quantity: newQty })
          .eq("id", medicine.id);
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

  /* ── 로딩 ── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  /* ── 결제 페이지 ── */
  return (
    <div className="min-h-screen bg-gray-50">
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
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">주문 / 결제</h1>

        <div className="space-y-6">
          {/* ── 주문 약품 목록 ── */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                주문 약품
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {cartItems.length}건
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {cartItems.map((item) => {
                const medicine = getMedicine(item);
                if (!medicine) return null;
                const drug = getDrug(medicine);
                const maxPrice = parsePrice(drug?.max_price ?? "0");
                const discountRate = calculateDiscountRate(
                  medicine.expiry_date,
                  medicine.is_opened,
                  medicine.condition
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
                          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
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
                        <span className="text-xs text-red-500 font-semibold">
                          {Math.round(discountRate * 100)}%
                        </span>
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
          </section>

          {/* ── 배송 정보 (약사 인증 정보에서 자동 입력) ── */}
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">배송 정보</h2>
              <p className="text-xs text-gray-400 mt-1">약사 인증 시 등록한 정보로 자동 입력됩니다.</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-500 flex-shrink-0 w-14">약국명</span>
                  <span className="text-sm font-medium text-gray-900">{delivery.pharmacyName || "-"}</span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-500 flex-shrink-0 w-14">수령인</span>
                  <span className="text-sm font-medium text-gray-900">{delivery.pharmacistName || "-"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500 flex-shrink-0 w-14">연락처</span>
                <span className="text-sm font-medium text-gray-900">{delivery.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-sm text-gray-500 flex-shrink-0 w-14">주소</span>
                <span className="text-sm font-medium text-gray-900">{delivery.address || "-"}</span>
              </div>
            </div>
          </section>

          {/* ── 결제 요약 + 결제 버튼 ── */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">결제 금액</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품 금액</span>
                <span className="text-gray-900">
                  {formatPrice(
                    cartItems.reduce((sum, item) => {
                      const medicine = getMedicine(item);
                      if (!medicine) return sum;
                      const drug = getDrug(medicine);
                      return sum + parsePrice(drug?.max_price ?? "0") * item.quantity;
                    }, 0)
                  )}
                  원
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">할인 금액</span>
                <span className="text-red-500">
                  -
                  {formatPrice(
                    cartItems.reduce((sum, item) => {
                      const medicine = getMedicine(item);
                      if (!medicine) return sum;
                      const drug = getDrug(medicine);
                      const original = parsePrice(drug?.max_price ?? "0") * item.quantity;
                      const discounted = getDiscountedPrice(item) * item.quantity;
                      return sum + (original - discounted);
                    }, 0)
                  )}
                  원
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">총 결제 금액</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(getTotalPrice())}원
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOrder}
              disabled={submitting}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors text-base flex items-center justify-center gap-2"
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
