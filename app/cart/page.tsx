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
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({});

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
        `id, medicine_id, quantity, medicines(id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, drugs_Fe(product_code, product_name, company_name, max_price, unit))`,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("장바구니를 불러오는 데 실패했습니다.", "error");
      setLoading(false);
      return;
    }

    const items = (data as CartItem[]) ?? [];
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
      const { data: verData } = await supabase
        .from("verification_requests")
        .select("user_id, pharmacy_name")
        .in("user_id", sellerIds)
        .eq("status", "approved");

      if (verData) {
        const names: Record<string, string> = {};
        for (const v of verData) {
          if (v.pharmacy_name) {
            const name = v.pharmacy_name as string;
            names[v.user_id] =
              name.length > 2 ? name.slice(0, 2) + "***" : name + "***";
          }
        }
        setPharmacyNames(names);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  // 수량 변경
  async function handleQuantityChange(item: CartItem, newQty: number) {
    const medicine = getMedicine(item);
    if (!medicine) return;

    if (newQty > medicine.quantity) {
      showToast(`재고가 ${medicine.quantity}개뿐입니다.`, "error");
    }

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

  // 상품 금액 합계
  function getProductTotal(): number {
    return cartItems.reduce((sum, item) => {
      const medicine = getMedicine(item);
      if (!medicine) return sum;
      const drug = getDrug(medicine);
      const discounted = calculateDiscountedPrice(
        drug?.max_price ?? "0",
        medicine.expiry_date,
        medicine.is_opened,
      );
      return sum + discounted * item.quantity;
    }, 0);
  }

  // 판매약국 수
  function getSellerCount(): number {
    return getSellerGroups().length;
  }

  // 총 결제 금액 (상품 + 택배비 구매자 부담분)
  function getTotalPrice(): number {
    return getProductTotal() + calculateBuyerShippingCost(getSellerCount());
  }

  /* -- 로딩 -- */
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

  /* -- 비로그인 -- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              로그인이 필요합니다
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              장바구니를 이용하려면 로그인해주세요.
            </p>
            <Link
              href="/auth"
              className="text-blue-500 hover:text-blue-600 font-medium text-sm"
            >
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* -- 빈 장바구니 -- */
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">장바구니</h1>
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              장바구니가 비어있습니다
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              약품 게시판에서 필요한 약품을 담아보세요.
            </p>
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

  const sellerGroups = getSellerGroups();
  const sellerCount = sellerGroups.length;
  const productTotal = getProductTotal();
  const buyerShipping = calculateBuyerShippingCost(sellerCount);

  /* -- 장바구니 목록 -- */
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

        {/* 판매약국별 그룹 목록 */}
        <div className="space-y-4">
          {sellerGroups.map((group) => (
            <div
              key={group.sellerId}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* 약국 헤더 */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
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
                  const discountedPrice = calculateDiscountedPrice(
                    drug?.max_price ?? "0",
                    medicine.expiry_date,
                    medicine.is_opened,
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
                            <svg
                              className="w-6 h-6 text-gray-300"
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

                      {/* 약품명 + 가격 */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/medicines/${medicine.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block"
                        >
                          {drug?.product_name ?? "알 수 없는 약품"}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {discountRate > 0 && (
                            <span className="text-xs text-red-500 font-semibold">
                              {Math.round(discountRate * 100)}%
                            </span>
                          )}
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
                          onClick={() =>
                            handleQuantityChange(item, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
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
                          onClick={() =>
                            handleQuantityChange(item, item.quantity + 1)
                          }
                          disabled={item.quantity >= medicine.quantity}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 하단: 금액 요약 + 주문 버튼 */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">상품 금액</span>
              <span className="text-gray-900">{formatPrice(productTotal)}원</span>
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
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">
                  총 결제 금액
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getTotalPrice())}원
                </span>
              </div>
            </div>
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
