"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
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

export default function FloatingCart() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isVerified = profile?.verification_status === "verified";

  async function fetchCart() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select(
        `id, medicine_id, quantity, medicines(id, drug_id, quantity, expiry_date, is_opened, condition, image_urls, drugs_Fe(product_code, product_name, company_name, max_price, unit))`,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setCartItems((data as CartItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (open && user) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

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

    if (!error) {
      setCartItems((prev) =>
        prev.map((ci) =>
          ci.id === item.id ? { ...ci, quantity: clamped } : ci,
        ),
      );
    }
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }

  async function handleDelete(itemId: string) {
    setUpdatingIds((prev) => new Set(prev).add(itemId));
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setCartItems((prev) => prev.filter((ci) => ci.id !== itemId));
    }
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  function getTotalPrice(): number {
    return cartItems.reduce((sum, item) => {
      const medicine = getMedicine(item);
      if (!medicine) return sum;
      const drug = getDrug(medicine);
      const discounted = calculateDiscountedPrice(
        drug?.max_price ?? "0",
        medicine.expiry_date,
        medicine.is_opened,
        medicine.condition,
      );
      return sum + discounted * item.quantity;
    }, 0);
  }

  // 비로그인 또는 미인증 사용자에게는 표시하지 않음
  if (!user || !isVerified) return null;

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
        title="장바구니"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.286h11.356m-9.982 0h9.982m0 0a3 3 0 105.98.286M7.5 14.25H5.25m0 0L3.756 5.272M7.5 14.25l1.689-8.978m6.561 8.978a3 3 0 105.98.286m-5.98-.286H20.25m0 0l-1.244-8.978M12.75 5.272h7.5"
          />
        </svg>
        {cartItems.length > 0 && open && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {cartItems.length}
          </span>
        )}
      </button>

      {/* 장바구니 패널 */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col animate-fade-in-up overflow-hidden"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900">
              장바구니
              {cartItems.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1.5">
                  {cartItems.length}건
                </span>
              )}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg
                  className="w-10 h-10 text-gray-300 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.286h11.356m-9.982 0h9.982m0 0a3 3 0 105.98.286M7.5 14.25H5.25m0 0L3.756 5.272M7.5 14.25l1.689-8.978m6.561 8.978a3 3 0 105.98.286m-5.98-.286H20.25m0 0l-1.244-8.978M12.75 5.272h7.5"
                  />
                </svg>
                <p className="text-sm text-gray-500">장바구니가 비어있습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cartItems.map((item) => {
                  const medicine = getMedicine(item);
                  if (!medicine) return null;
                  const drug = getDrug(medicine);
                  const discountRate = calculateDiscountRate(
                    medicine.expiry_date,
                    medicine.is_opened,
                    medicine.condition,
                  );
                  const discountedPrice = calculateDiscountedPrice(
                    drug?.max_price ?? "0",
                    medicine.expiry_date,
                    medicine.is_opened,
                    medicine.condition,
                  );
                  const isUpdating = updatingIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-5 py-3 ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {/* 이미지 */}
                      <Link
                        href={`/medicines/${medicine.id}`}
                        onClick={() => setOpen(false)}
                        className="relative w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden"
                      >
                        {medicine.image_urls?.[0] ? (
                          <Image
                            src={medicine.image_urls[0]}
                            alt={drug?.product_name ?? "약품"}
                            fill
                            sizes="48px"
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
                      </Link>

                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/medicines/${medicine.id}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block"
                        >
                          {drug?.product_name ?? "알 수 없는 약품"}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-red-500 font-semibold">
                            {Math.round(discountRate * 100)}%
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(discountedPrice)}원
                          </span>
                        </div>
                      </div>

                      {/* 수량 */}
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 transition-colors"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 12h-15"
                            />
                          </svg>
                        </button>
                        <span className="w-7 h-7 flex items-center justify-center text-xs font-medium text-gray-900 border-x border-gray-200">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                          disabled={item.quantity >= medicine.quantity}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 transition-colors"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* 삭제 */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">총 결제 금액</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(getTotalPrice())}원
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors text-sm flex items-center justify-center"
                >
                  장바구니 보기
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/checkout");
                  }}
                  className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  주문하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
