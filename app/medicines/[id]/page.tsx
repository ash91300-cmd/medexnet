"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import {
  calculateDiscountRate,
  calculateSellingPrice,
  calculateCommission,
  calculatePurchasePrice,
  parsePrice,
  formatPrice,
  getRemainingDays,
  isTradeable,
} from "@/lib/discount";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface DrugInfo {
  product_code: number;
  product_name: string;
  company_name: string;
  max_price: string;
  unit: string;
}

interface MedicineDetail {
  id: string;
  drug_id: number;
  quantity: number;
  expiry_date: string;
  is_opened: string;
  image_urls: string[];
  status: string;
  created_at: string;
  seller_id: string;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

export default function MedicineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [medicine, setMedicine] = useState<MedicineDetail | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [cartQuantity, setCartQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
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

  async function handleAddToCart() {
    if (!user) {
      showToast("로그인이 필요합니다.", "error");
      return;
    }
    if (!medicine) return;

    // 거래 불가 체크
    if (!isTradeable(medicine.expiry_date)) {
      showToast("유효기간 1개월 미만 약품은 거래할 수 없습니다.", "error");
      return;
    }

    // 품절 체크
    if (medicine.quantity <= 0) {
      showToast("품절된 약품입니다.", "error");
      return;
    }

    // 본인이 등록한 약품 체크
    if (medicine.seller_id === user.id) {
      showToast("본인이 등록한 약품은 장바구니에 담을 수 없습니다.", "error");
      return;
    }

    if (cartQuantity < 1) {
      showToast("수량을 1개 이상 입력해주세요.", "error");
      return;
    }

    setAddingToCart(true);

    try {
      // 이미 장바구니에 있는지 확인
      const { data: existing, error: fetchError } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("medicine_id", medicine.id)
        .maybeSingle();

      if (fetchError) {
        showToast("장바구니 확인 중 오류가 발생했습니다.", "error");
        setAddingToCart(false);
        return;
      }

      const newTotal = (existing?.quantity ?? 0) + cartQuantity;

      // 등록된 수량 초과 체크
      if (newTotal > medicine.quantity) {
        showToast(
          `등록된 수량(${medicine.quantity}개)을 초과할 수 없습니다.${
            existing
              ? ` 현재 장바구니에 ${existing.quantity}개가 있습니다.`
              : ""
          }`,
          "error",
        );
        setAddingToCart(false);
        return;
      }

      if (existing) {
        // 이미 있으면 수량 증가
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newTotal })
          .eq("id", existing.id);

        if (updateError) {
          showToast("장바구니 수량 업데이트에 실패했습니다.", "error");
        } else {
          showToast(
            `장바구니에 ${cartQuantity}개 추가되었습니다. (총 ${newTotal}개)`,
            "success",
          );
        }
      } else {
        // 새로 추가
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: user.id,
            medicine_id: medicine.id,
            quantity: cartQuantity,
          });

        if (insertError) {
          showToast("장바구니에 담기를 실패했습니다.", "error");
        } else {
          showToast(`장바구니에 ${cartQuantity}개 담았습니다.`, "success");
        }
      }
    } catch {
      showToast("오류가 발생했습니다. 다시 시도해주세요.", "error");
    } finally {
      setAddingToCart(false);
    }
  }

  useEffect(() => {
    async function fetchMedicine() {
      setLoading(true);

      const { data, error } = await supabase
        .from("medicines")
        .select(
          `id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`,
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setMedicine(null);
        setLoading(false);
        return;
      }

      setMedicine(data as MedicineDetail);

      // 등록자 약국명 조회
      if (data.seller_id) {
        const { data: verData } = await supabase
          .from("verification_requests")
          .select("pharmacy_name")
          .eq("user_id", data.seller_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (verData?.pharmacy_name) {
          const name = verData.pharmacy_name as string;
          const masked =
            name.length > 2 ? name.slice(0, 2) + "***" : name + "***";
          setPharmacyName(masked);
        }
      }

      setLoading(false);
    }

    if (id) fetchMedicine();
  }, [id]);

  /* -- 로딩 -- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* -- 404 -- */
  if (!medicine) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10 page-enter">
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
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              약품을 찾을 수 없습니다
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              요청하신 약품 정보가 존재하지 않습니다.
            </p>
            <Link
              href="/"
              className="text-sky-500 hover:text-sky-600 font-medium text-sm"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* -- 데이터 계산 -- */
  const drug: DrugInfo | null = Array.isArray(medicine.drugs_Fe)
    ? (medicine.drugs_Fe[0] ?? null)
    : (medicine.drugs_Fe ?? null);
  const maxPrice = parsePrice(drug?.max_price ?? "0");
  const tradeable = isTradeable(medicine.expiry_date);
  const discountRate = calculateDiscountRate(
    medicine.expiry_date,
    medicine.is_opened,
  );
  const sellingPrice = calculateSellingPrice(
    drug?.max_price ?? "0",
    medicine.expiry_date,
    medicine.is_opened,
  );
  const commission = calculateCommission(sellingPrice);
  const purchasePrice = calculatePurchasePrice(sellingPrice);
  const remainingDays = getRemainingDays(medicine.expiry_date);
  const isExpired = remainingDays <= 0;

  const expiryDate = new Date(medicine.expiry_date);
  const formattedExpiry = `${expiryDate.getFullYear()}.${String(
    expiryDate.getMonth() + 1,
  ).padStart(2, "0")}.${String(expiryDate.getDate()).padStart(2, "0")}`;

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
        {/* 뒤로가기 */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
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
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          목록으로
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* -- 이미지 섹션 -- */}
            <div className="p-6">
              <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative">
                {medicine.image_urls?.[selectedImage] ? (
                  <Image
                    src={medicine.image_urls[selectedImage]}
                    alt={drug?.product_name ?? "약품"}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-300"
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

              {/* 썸네일 목록 */}
              {medicine.image_urls && medicine.image_urls.length > 1 && (
                <div className="flex gap-2">
                  {medicine.image_urls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === idx
                          ? "border-sky-500"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`사진 ${idx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* -- 정보 섹션 -- */}
            <div className="p-6 md:border-l border-t md:border-t-0 border-gray-100">
              {/* 배지 */}
              <div className="flex gap-2 mb-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    medicine.is_opened === "미개봉"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {medicine.is_opened}
                </span>
                {!tradeable && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-500 text-white">
                    거래불가
                  </span>
                )}
              </div>

              {/* 약품명 */}
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {drug?.product_name ?? "알 수 없는 약품"}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {drug?.company_name ?? "-"}
              </p>

              {/* 가격 · 할인 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                {tradeable ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded">
                        {Math.round(discountRate * 100)}%
                      </span>
                      <span className="text-gray-400 line-through text-sm">
                        {formatPrice(maxPrice)}원
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-3">
                      {formatPrice(sellingPrice)}원
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        / {drug?.unit ?? ""}
                      </span>
                    </p>
                    <div className="border-t border-gray-200 pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">판매가 (구매약국 지불)</span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(sellingPrice)}원
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">수수료 (3%)</span>
                        <span className="font-medium text-gray-500">
                          -{formatPrice(commission)}원
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">매입가 (판매약국 수령)</span>
                        <span className="font-medium text-sky-600">
                          {formatPrice(purchasePrice)}원
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-lg font-bold text-red-500">
                      거래불가
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      유효기간 1개월 미만 약품은 거래할 수 없습니다.
                    </p>
                  </div>
                )}
              </div>

              {/* 상세 정보 테이블 */}
              <div className="space-y-0 text-sm">
                <InfoRow
                  label="보험코드"
                  value={String(drug?.product_code ?? "-")}
                />
                <InfoRow label="제조사" value={drug?.company_name ?? "-"} />
                <InfoRow
                  label="약가상한"
                  value={`${formatPrice(maxPrice)}원 / ${drug?.unit ?? ""}`}
                />
                <InfoRow
                  label="수량"
                  value={`${medicine.quantity.toLocaleString("ko-KR")}개`}
                />
                <InfoRow
                  label="유통기한"
                  value={
                    <span
                      className={
                        isExpired || !tradeable
                          ? "text-red-500 font-medium"
                          : "text-gray-900 font-medium"
                      }
                    >
                      {formattedExpiry}
                      {isExpired
                        ? " (만료)"
                        : !tradeable
                          ? " (1개월 미만)"
                          : ` (${remainingDays}일 남음)`}
                    </span>
                  }
                />
                <InfoRow label="개봉여부" value={medicine.is_opened} />
                {pharmacyName && (
                  <InfoRow label="등록 약국" value={pharmacyName} />
                )}
              </div>

              {/* 수량 입력 + 장바구니 담기 */}
              {tradeable && medicine.quantity > 0 && (
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setCartQuantity((prev) => Math.max(1, prev - 1))
                      }
                      disabled={cartQuantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
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
                          d="M19.5 12h-15"
                        />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={medicine.quantity}
                      value={cartQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setCartQuantity(Math.min(val, medicine.quantity));
                        } else if (e.target.value === "") {
                          setCartQuantity(1);
                        }
                      }}
                      className="w-14 h-10 text-center text-sm font-medium text-gray-900 border-x border-gray-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCartQuantity((prev) =>
                          Math.min(medicine.quantity, prev + 1),
                        )
                      }
                      disabled={cartQuantity >= medicine.quantity}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
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
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    / {medicine.quantity}개
                  </span>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-1 flex items-center justify-center gap-2 h-10 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white text-sm font-medium rounded-xl shadow-lg shadow-sky-500/25 transition-colors"
                  >
                    {addingToCart ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.286h11.356m-9.982 0h9.982m0 0a3 3 0 105.98.286M7.5 14.25H5.25m0 0L3.756 5.272M7.5 14.25l1.689-8.978m6.561 8.978a3 3 0 105.98.286m-5.98-.286H20.25m0 0l-1.244-8.978M12.75 5.272h7.5"
                        />
                      </svg>
                    )}
                    장바구니 담기
                  </button>
                </div>
              )}

              {/* 품절 표시 */}
              {tradeable && medicine.quantity <= 0 && (
                <div className="mt-6 py-3 bg-gray-100 rounded-xl text-center">
                  <span className="text-sm font-semibold text-gray-500">품절</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
