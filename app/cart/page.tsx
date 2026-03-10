"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
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

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CartContent />
    </Suspense>
  );
}

function CartContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);

  // 미인증 사용자 리다이렉트
  useEffect(() => {
    if (!authLoading && user && profile?.verification_status !== "verified") {
      router.replace("/");
    }
  }, [authLoading, user, profile, router]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // 장바구니 데이터 로드
  async function fetchCart() {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `id, medicine_id, quantity, medicines(id, drug_id, quantity, expiry_date, is_opened, condition, image_urls, drugs_Fe(product_code, product_name, company_name, max_price, unit))`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("장바구니를 불러오는 데 실패했습니다.", "error");
      setLoading(false);
      return;
    }

    setCartItems((data as CartItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // 수량 변경 (delta 방식 또는 직접 입력)
  async function handleQuantityChange(item: CartItem, newQty: number) {
    const medicine = getMedicine(item);
    if (!medicine) return;

    const clamped = Math.max(1, Math.min(newQty, medicine.quantity));
    if (clamped === item.quantity) return;

    setUpdatingIds((prev) => new Set(prev).add(item.id));

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: clamped })
      .eq("id", item.id);

    if (error) {
      showToast("수량 변경에 실패했습니다.", "error");
    } else {
      setCartItems((prev) =>
        prev.map((ci) => (ci.id === item.id ? { ...ci, quantity: clamped } : ci))
      );
    }

    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }

  // 개별 삭제
  async function handleDelete(itemId: string) {
    setUpdatingIds((prev) => new Set(prev).add(itemId));

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      showToast("삭제에 실패했습니다.", "error");
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    } else {
      setCartItems((prev) => prev.filter((ci) => ci.id !== itemId));
    }
  }

  // 전체 삭제
  async function handleDeleteAll() {
    if (!user || cartItems.length === 0) return;

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      showToast("전체 삭제에 실패했습니다.", "error");
    } else {
      setCartItems([]);
      showToast("장바구니를 비웠습니다.", "success");
    }
  }

  // 총 결제 금액 계산
  function getTotalPrice(): number {
    return cartItems.reduce((sum, item) => {
      const medicine = getMedicine(item);
      if (!medicine) return sum;
      const drug = getDrug(medicine);
      const discounted = calculateDiscountedPrice(
        drug?.max_price ?? "0",
        medicine.expiry_date,
        medicine.is_opened,
        medicine.condition
      );
      return sum + discounted * item.quantity;
    }, 0);
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

  /* ── 비로그인 ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-6">장바구니를 이용하려면 로그인해주세요.</p>
            <Link href="/auth" className="text-blue-500 hover:text-blue-600 font-medium text-sm">
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ── 빈 장바구니 ── */
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">장바구니</h1>
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.286h11.356m-9.982 0h9.982m0 0a3 3 0 105.98.286M7.5 14.25H5.25m0 0L3.756 5.272M7.5 14.25l1.689-8.978m6.561 8.978a3 3 0 105.98.286m-5.98-.286H20.25m0 0l-1.244-8.978M12.75 5.272h7.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">장바구니가 비어있습니다</h2>
            <p className="text-sm text-gray-500 mb-6">약품 게시판에서 필요한 약품을 담아보세요.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              게시판으로 이동
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ── 장바구니 목록 ── */
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            장바구니
            <span className="text-base font-normal text-gray-500 ml-2">
              {cartItems.length}건
            </span>
          </h1>
          <button
            onClick={handleDeleteAll}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            전체 삭제
          </button>
        </div>

        {/* 목록 */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
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
            const discountedPrice = calculateDiscountedPrice(
              drug?.max_price ?? "0",
              medicine.expiry_date,
              medicine.is_opened,
              medicine.condition
            );
            const isUpdating = updatingIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
              >
                {/* 이미지 */}
                <Link
                  href={`/medicines/${medicine.id}`}
                  className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden"
                >
                  {medicine.image_urls?.[0] ? (
                    <Image
                      src={medicine.image_urls[0]}
                      alt={drug?.product_name ?? "약품"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </Link>

                {/* 약품명 + 가격 */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/medicines/${medicine.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block"
                  >
                    {drug?.product_name ?? "알 수 없는 약품"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-red-500 font-semibold">
                      {Math.round(discountRate * 100)}%
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      {formatPrice(maxPrice)}원
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(discountedPrice)}원
                    </span>
                  </div>
                </div>

                {/* 수량 조절 */}
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={medicine.quantity}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleQuantityChange(item, val);
                    }}
                    className="w-10 h-8 text-center text-sm font-medium text-gray-900 border-x border-gray-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                    disabled={item.quantity >= medicine.quantity}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>

                {/* 소계 */}
                <span className="text-sm font-bold text-gray-900 w-24 text-right flex-shrink-0 hidden sm:block">
                  {formatPrice(discountedPrice * item.quantity)}원
                </span>

                {/* 삭제 */}
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* 하단: 총 금액 + 주문 버튼 */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 font-medium">총 결제 금액</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(getTotalPrice())}원
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors text-base"
          >
            주문하기
          </button>
        </div>
      </main>
    </div>
  );
}
