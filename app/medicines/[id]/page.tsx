"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import Navbar from "@/components/Navbar";
import {
  calculateDiscountRate,
  calculateDiscountedPrice,
  parsePrice,
  formatPrice,
  getRemainingDays,
} from "@/lib/discount";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  condition: string;
  image_urls: string[];
  status: string;
  created_at: string;
  seller_id: string;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

const CONDITION_LABEL: Record<string, string> = {
  상: "상 (새것과 동일)",
  중: "중 (양호)",
  하: "하 (사용감 있음)",
};

const CONDITION_COLOR: Record<string, string> = {
  상: "bg-green-100 text-green-700",
  중: "bg-yellow-100 text-yellow-700",
  하: "bg-red-100 text-red-700",
};

export default function MedicineDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [medicine, setMedicine] = useState<MedicineDetail | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function fetchMedicine() {
      setLoading(true);

      const { data, error } = await supabase
        .from("medicines")
        .select(
          `id, drug_id, seller_id, quantity, expiry_date, is_opened, condition, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`
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

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* ── 404 ── */
  if (!medicine) {
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
              className="text-blue-500 hover:text-blue-600 font-medium text-sm"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ── 데이터 계산 ── */
  const drug: DrugInfo | null = Array.isArray(medicine.drugs_Fe) ? medicine.drugs_Fe[0] ?? null : medicine.drugs_Fe ?? null;
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
  const remainingDays = getRemainingDays(medicine.expiry_date);
  const isExpired = remainingDays <= 0;

  const expiryDate = new Date(medicine.expiry_date);
  const formattedExpiry = `${expiryDate.getFullYear()}.${String(
    expiryDate.getMonth() + 1
  ).padStart(2, "0")}.${String(expiryDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
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
            {/* ── 이미지 섹션 ── */}
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
                          ? "border-blue-500"
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

            {/* ── 정보 섹션 ── */}
            <div className="p-6 md:border-l border-t md:border-t-0 border-gray-100">
              {/* 배지 */}
              <div className="flex gap-2 mb-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    medicine.is_opened === "미개봉"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {medicine.is_opened}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    CONDITION_COLOR[medicine.condition] ??
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {CONDITION_LABEL[medicine.condition] ?? medicine.condition}
                </span>
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded">
                    {Math.round(discountRate * 100)}%
                  </span>
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(maxPrice)}원
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(discountedPrice)}원
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    / {drug?.unit ?? ""}
                  </span>
                </p>
              </div>

              {/* 상세 정보 테이블 */}
              <div className="space-y-0 text-sm">
                <InfoRow
                  label="보험코드"
                  value={String(drug?.product_code ?? "-")}
                />
                <InfoRow label="제조사" value={drug?.company_name ?? "-"} />
                <InfoRow
                  label="단가 (상한가)"
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
                        isExpired
                          ? "text-red-500 font-medium"
                          : "text-gray-900 font-medium"
                      }
                    >
                      {formattedExpiry}
                      {isExpired
                        ? " (만료)"
                        : ` (${remainingDays}일 남음)`}
                    </span>
                  }
                />
                <InfoRow label="상태" value={medicine.is_opened} />
                {pharmacyName && (
                  <InfoRow label="등록 약국" value={pharmacyName} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
