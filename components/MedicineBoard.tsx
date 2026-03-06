"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import {
  calculateDiscountRate,
  calculateDiscountedPrice,
  parsePrice,
  formatPrice,
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

interface MedicineRow {
  id: string;
  drug_id: number;
  quantity: number;
  expiry_date: string;
  is_opened: string;
  condition: string;
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

const SELECT_FIELDS = `id, drug_id, quantity, expiry_date, is_opened, condition, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`;

export default function MedicineBoard({
  searchQuery = "",
  openedFilter = "전체",
  expiryFilter = "전체",
}: MedicineBoardProps) {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMedicines() {
      setLoading(true);

      const isSearch = searchQuery.length >= 2;
      const isNumeric = /^\d+$/.test(searchQuery);

      // 유통기한 필터용 날짜 계산
      const today = new Date();
      const threeMonths = new Date(today);
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      const sixMonths = new Date(today);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      const toDateStr = (d: Date) => d.toISOString().split("T")[0];

      function applyFilters(query: any) { // eslint-disable-line
        if (openedFilter !== "전체") {
          query = query.eq("is_opened", openedFilter);
        }
        if (expiryFilter === "6개월 이상") {
          query = query.gte("expiry_date", toDateStr(sixMonths));
        } else if (expiryFilter === "3~6개월") {
          query = query.gte("expiry_date", toDateStr(threeMonths)).lt("expiry_date", toDateStr(sixMonths));
        } else if (expiryFilter === "3개월 미만") {
          query = query.lt("expiry_date", toDateStr(threeMonths));
        }
        return query;
      }

      if (isSearch) {
        // 검색 모드: 먼저 drugs_Fe에서 매칭되는 product_code를 찾고, medicines에서 조회
        let drugQuery = supabase
          .from("drugs_Fe")
          .select("product_code");

        if (isNumeric) {
          drugQuery = drugQuery.eq("product_code", parseInt(searchQuery));
        } else {
          drugQuery = drugQuery.ilike("product_name", `%${searchQuery}%`);
        }

        const { data: drugCodes } = await drugQuery.limit(100);
        const codes = (drugCodes ?? []).map((d) => d.product_code);

        if (codes.length === 0) {
          setMedicines([]);
          setLoading(false);
          return;
        }

        let medQuery = supabase
          .from("medicines")
          .select(SELECT_FIELDS)
          .in("drug_id", codes)
          .eq("status", "approved");

        medQuery = applyFilters(medQuery);

        const { data } = await medQuery
          .order("created_at", { ascending: false })
          .limit(20);

        setMedicines((data as MedicineRow[]) ?? []);
      } else {
        // 전체 목록 모드
        let medQuery = supabase
          .from("medicines")
          .select(SELECT_FIELDS)
          .eq("status", "approved");

        medQuery = applyFilters(medQuery);

        const { data } = await medQuery
          .order("created_at", { ascending: false })
          .limit(20);

        setMedicines((data as MedicineRow[]) ?? []);
      }

      setLoading(false);
    }

    fetchMedicines();
  }, [searchQuery, openedFilter, expiryFilter]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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
      {medicines.map((med) => (
        <MedicineCard key={med.id} medicine={med} />
      ))}
    </div>
  );
}

function MedicineCard({ medicine }: { medicine: MedicineRow }) {
  const drug: DrugInfo | null = Array.isArray(medicine.drugs_Fe) ? medicine.drugs_Fe[0] ?? null : medicine.drugs_Fe ?? null;
  const productName = drug?.product_name ?? "알 수 없는 약품";
  const companyName = drug?.company_name ?? "-";
  const unit = drug?.unit ?? "";

  const maxPriceNum = parsePrice(drug?.max_price ?? "0");
  const discountRate = calculateDiscountRate(medicine.expiry_date, medicine.is_opened, medicine.condition);
  const discountedPrice = calculateDiscountedPrice(drug?.max_price ?? "0", medicine.expiry_date, medicine.is_opened, medicine.condition);

  const expiryDate = new Date(medicine.expiry_date);
  const formattedExpiry = `${expiryDate.getFullYear()}.${String(expiryDate.getMonth() + 1).padStart(2, "0")}.${String(expiryDate.getDate()).padStart(2, "0")}`;

  const isExpired = expiryDate < new Date();
  const thumbnail = medicine.image_urls?.[0] ?? null;

  const conditionColor: Record<string, string> = { "상": "bg-green-100 text-green-700", "중": "bg-yellow-100 text-yellow-700", "하": "bg-red-100 text-red-700" };

  return (
    <Link href={`/medicines/${medicine.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all">
        {/* 이미지 */}
        <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={productName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
          )}
          {/* 배지들 */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${conditionColor[medicine.condition] ?? "bg-gray-100 text-gray-600"}`}>
              {medicine.condition}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${medicine.is_opened === "미개봉" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
              {medicine.is_opened}
            </span>
          </div>
          {/* 할인율 배지 */}
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {Math.round(discountRate * 100)}%
            </span>
          </div>
        </div>

        {/* 정보 */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-0.5 line-clamp-2 leading-snug">{productName}</h3>
          <p className="text-xs text-gray-500 mb-3">{companyName}</p>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">할인가</span>
              <div className="text-right">
                <span className="text-gray-400 line-through text-xs mr-1.5">{formatPrice(maxPriceNum)}원</span>
                <span className="font-semibold text-blue-600">{formatPrice(discountedPrice)}원 / {unit}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">수량</span>
              <span className="font-medium text-gray-900">{medicine.quantity.toLocaleString("ko-KR")}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">유통기한</span>
              <span className={`font-medium ${isExpired ? "text-red-500" : "text-gray-900"}`}>
                {formattedExpiry}
                {isExpired && " (만료)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
