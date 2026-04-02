"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  calculateDiscountRate,
  calculateSellingPrice,
  parsePrice,
  formatPrice,
  isTradeable,
} from "@/lib/discount";

interface DrugInfo {
  product_code: number;
  product_name: string;
  company_name: string;
  max_price: string;
  unit: string;
}

interface MedicineRow {
  id: string;
  drug_id: number;
  seller_id: string;
  quantity: number;
  expiry_date: string;
  is_opened: string;
  image_urls: string[];
  status: string;
  created_at: string;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

interface MedicineBoardProps {
  searchQuery?: string;
  openedFilter?: string;
  expiryFilter?: string;
}

export default function MedicineBoard({
  searchQuery = "",
  openedFilter = "전체",
  expiryFilter = "전체",
}: MedicineBoardProps) {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchMedicines() {
      setLoading(true);
      setError(null);

      try {
        const isSearch = searchQuery.length >= 2;
        const isNumeric = /^\d+$/.test(searchQuery);
        let medResult: MedicineRow[] = [];

        if (isSearch) {
          let drugQuery = supabase.from("drugs_Fe").select("product_code");

          if (isNumeric) {
            drugQuery = drugQuery.eq("product_code", parseInt(searchQuery));
          } else {
            drugQuery = drugQuery.ilike("product_name", `%${searchQuery}%`);
          }

          const { data: drugCodes, error: drugError } =
            await drugQuery.limit(100);
          if (drugError) throw drugError;

          const codes = (drugCodes ?? []).map((d) => d.product_code);

          if (codes.length === 0) {
            setMedicines([]);
            setLoading(false);
            return;
          }

          const { data, error: medError } = await supabase
            .from("medicines")
            .select(
              `id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`,
            )
            .in("drug_id", codes)
            .eq("status", "approved")
            .gt("quantity", 0)
            .order("created_at", { ascending: false })
            .limit(20);

          if (medError) throw medError;
          medResult = (data as MedicineRow[]) ?? [];
        } else {
          const { data, error: medError } = await supabase
            .from("medicines")
            .select(
              `id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`,
            )
            .eq("status", "approved")
            .gt("quantity", 0)
            .order("created_at", { ascending: false })
            .limit(20);

          if (medError) throw medError;
          medResult = (data as MedicineRow[]) ?? [];
        }

        setMedicines(medResult);

        // 판매자 약국명 일괄 조회
        const sellerIds = [...new Set(medResult.map((m) => m.seller_id).filter(Boolean))];
        if (sellerIds.length > 0) {
          const { data: verData } = await supabase
            .from("verification_requests")
            .select("user_id, pharmacy_name")
            .in("user_id", sellerIds)
            .eq("status", "approved")
            .order("created_at", { ascending: false });

          if (verData) {
            const nameMap: Record<string, string> = {};
            for (const v of verData) {
              if (v.user_id && v.pharmacy_name && !nameMap[v.user_id]) {
                const name = v.pharmacy_name as string;
                nameMap[v.user_id] = name.length > 2 ? name.slice(0, 2) + "***" : name + "***";
              }
            }
            setPharmacyNames(nameMap);
          }
        }
      } catch (err) {
        console.error("데이터 조회 실패:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchMedicines();
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-red-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const filtered = medicines.filter((med) => {
    if (openedFilter !== "전체" && med.is_opened !== openedFilter) return false;

    if (expiryFilter !== "전체") {
      const now = new Date();
      const expiry = new Date(med.expiry_date);
      const diffMonths =
        (expiry.getFullYear() - now.getFullYear()) * 12 +
        (expiry.getMonth() - now.getMonth());

      if (expiryFilter === "6개월 이상" && diffMonths < 6) return false;
      if (expiryFilter === "3~6개월" && (diffMonths < 3 || diffMonths >= 6))
        return false;
      if (expiryFilter === "3개월 미만" && diffMonths >= 3) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    return (
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
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {searchQuery ? "검색 결과가 없습니다" : "등록된 약품이 없습니다"}
        </h3>
        <p className="text-sm text-gray-500">
          {searchQuery
            ? "다른 검색어로 다시 시도해보세요."
            : "승인된 약품이 등록되면 이곳에 표시됩니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((med) => (
        <MedicineCard key={med.id} medicine={med} pharmacyName={pharmacyNames[med.seller_id]} />
      ))}
    </div>
  );
}

function MedicineCard({ medicine, pharmacyName }: { medicine: MedicineRow; pharmacyName?: string }) {
  const raw = medicine.drugs_Fe;
  const drug: DrugInfo | null = Array.isArray(raw)
    ? (raw[0] ?? null)
    : (raw ?? null);
  const productName = drug?.product_name ?? "알 수 없는 약품";
  const companyName = drug?.company_name ?? "-";
  const maxPriceStr = drug?.max_price ?? "0";
  const maxPrice = parsePrice(maxPriceStr);
  const unit = drug?.unit ?? "";

  const expiryDate = new Date(medicine.expiry_date);
  const formattedExpiry = `${expiryDate.getFullYear()}.${String(expiryDate.getMonth() + 1).padStart(2, "0")}.${String(expiryDate.getDate()).padStart(2, "0")}`;

  const tradeable = isTradeable(medicine.expiry_date);
  const isExpired = expiryDate < new Date();
  const thumbnail = medicine.image_urls?.[0] ?? null;

  const discountRate = calculateDiscountRate(
    medicine.expiry_date,
    medicine.is_opened,
  );
  const sellingPrice = calculateSellingPrice(
    maxPriceStr,
    medicine.expiry_date,
    medicine.is_opened,
  );

  return (
    <Link
      href={`/medicines/${medicine.id}`}
      className={`block bg-white rounded-2xl border border-sky-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-sky-200 transition-all duration-300 cursor-pointer ${!tradeable ? "opacity-60" : ""}`}
    >
      {/* 이미지 */}
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-300"
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
        {/* 배지들 */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${medicine.is_opened === "미개봉" ? "bg-sky-100 text-sky-700" : "bg-orange-100 text-orange-700"}`}
          >
            {medicine.is_opened}
          </span>
          {!tradeable && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500 text-white">
              거래불가
            </span>
          )}
        </div>
        {/* 할인율 배지 */}
        {tradeable && discountRate > 0 && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {Math.round(discountRate * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm mb-0.5 line-clamp-2 leading-snug">
          {productName}
        </h3>
        <p className="text-xs text-gray-500 mb-1">{companyName}</p>
        {pharmacyName && (
          <p className="text-xs text-gray-400 mb-3">{pharmacyName}</p>
        )}
        {!pharmacyName && <div className="mb-2" />}

        <div className="space-y-1.5 text-sm">
          {/* 가격 정보 */}
          <div className="flex justify-between items-center">
            <span className="text-gray-500">판매가</span>
            {tradeable ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(maxPrice)}원
                </span>
                <span className="font-bold text-sky-600">
                  {formatPrice(sellingPrice)}원
                </span>
              </div>
            ) : (
              <span className="font-medium text-red-500">거래불가</span>
            )}
          </div>
          {tradeable && (
            <div className="flex justify-between">
              <span className="text-gray-500">단위</span>
              <span className="font-medium text-gray-900">{unit}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">수량</span>
            <span className="font-medium text-gray-900">
              {medicine.quantity.toLocaleString("ko-KR")}개
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">유통기한</span>
            <span
              className={`font-medium ${isExpired || !tradeable ? "text-red-500" : "text-gray-900"}`}
            >
              {formattedExpiry}
              {isExpired && " (만료)"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
