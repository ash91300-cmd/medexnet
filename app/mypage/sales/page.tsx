"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { formatPrice } from "@/lib/discount";

interface SaleItem {
  order_item_id: string;
  sale_date: string;
  product_name: string;
  quantity: number;
  sale_amount: number;
  buyer_pharmacy_name: string;
  order_status: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "주문 접수", color: "bg-amber-100 text-amber-700" },
  confirmed: { text: "주문 확인", color: "bg-blue-100 text-blue-700" },
  shipping: { text: "배송 중", color: "bg-indigo-100 text-indigo-700" },
  completed: { text: "배송 완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { text: "주문 취소", color: "bg-red-100 text-red-700" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SalesContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && profile?.verification_status !== "verified") {
      router.replace("/");
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    async function fetchSales() {
      if (!user) {
        setSales([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_sales_history");

      if (error) {
        console.error("판매 내역 조회 실패:", error);
        setLoading(false);
        return;
      }

      setSales((data as SaleItem[]) ?? []);
      setLoading(false);
    }

    if (!authLoading) fetchSales();
  }, [user, authLoading]);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-6">판매 내역을 확인하려면 로그인해주세요.</p>
            <Link href="/auth" className="text-blue-500 hover:text-blue-600 font-medium text-sm">
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            &larr; 마이페이지로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">판매 내역</h1>
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">판매 내역이 없습니다</h2>
            <p className="text-sm text-gray-500">등록한 약품이 판매되면 여기에 표시됩니다.</p>
          </div>
        </main>
      </div>
    );
  }

  const totalSalesAmount = sales.reduce((sum, item) => sum + Number(item.sale_amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          &larr; 마이페이지로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">
          판매 내역
          <span className="text-base font-normal text-gray-500 ml-2">
            {sales.length}건
          </span>
        </h1>

        {/* 총 판매 금액 요약 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">총 판매 금액</span>
          <span className="text-xl font-bold text-gray-900">{formatPrice(totalSalesAmount)}원</span>
        </div>

        {/* 판매 내역 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* 헤더 */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_0.8fr_0.5fr_0.7fr_0.6fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <span>약품명</span>
            <span>구매 약국</span>
            <span className="text-center">수량</span>
            <span className="text-right">판매 금액</span>
            <span className="text-center">상태</span>
          </div>

          {/* 데이터 행 */}
          <div className="divide-y divide-gray-100">
            {sales.map((item) => {
              const statusInfo = STATUS_LABEL[item.order_status] ?? {
                text: item.order_status,
                color: "bg-gray-100 text-gray-700",
              };

              return (
                <div key={item.order_item_id} className="px-5 py-4">
                  {/* 모바일 레이아웃 */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-900 flex-1 mr-2">{item.product_name}</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.buyer_pharmacy_name}</span>
                      <span>{formatDate(item.sale_date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{item.quantity}개</span>
                      <span className="text-sm font-semibold text-gray-900">{formatPrice(Number(item.sale_amount))}원</span>
                    </div>
                  </div>

                  {/* 데스크탑 레이아웃 */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_0.8fr_0.5fr_0.7fr_0.6fr] gap-4 items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.sale_date)}</p>
                    </div>
                    <span className="text-sm text-gray-700 truncate">{item.buyer_pharmacy_name}</span>
                    <span className="text-sm text-gray-700 text-center">{item.quantity}개</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{formatPrice(Number(item.sale_amount))}원</span>
                    <div className="flex justify-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SalesContent />
    </Suspense>
  );
}
