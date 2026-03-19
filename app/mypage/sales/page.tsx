"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { formatPrice } from "@/lib/discount";
import OrderStatusStepper from "@/components/OrderStatusStepper";

interface SaleItem {
  order_item_id: string;
  sale_date: string;
  product_name: string;
  quantity: number;
  sale_amount: number;
  buyer_pharmacy_name: string;
  order_status: string;
  order_id: string;
  tracking_number: string | null;
  courier: string | null;
}

interface SaleOrder {
  order_id: string;
  sale_date: string;
  order_status: string;
  tracking_number: string | null;
  courier: string | null;
  buyer_pharmacy_name: string;
  items: SaleItem[];
  total_amount: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupByOrder(sales: SaleItem[]): SaleOrder[] {
  const map = new Map<string, SaleOrder>();
  for (const item of sales) {
    let group = map.get(item.order_id);
    if (!group) {
      group = {
        order_id: item.order_id,
        sale_date: item.sale_date,
        order_status: item.order_status,
        tracking_number: item.tracking_number,
        courier: item.courier,
        buyer_pharmacy_name: item.buyer_pharmacy_name,
        items: [],
        total_amount: 0,
      };
      map.set(item.order_id, group);
    }
    group.items.push(item);
    group.total_amount += Number(item.sale_amount);
  }
  return Array.from(map.values());
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

  const orders = groupByOrder(sales);
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
            {orders.length}건
          </span>
        </h1>

        {/* 총 판매 금액 요약 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">총 판매 금액</span>
          <span className="text-xl font-bold text-gray-900">{formatPrice(totalSalesAmount)}원</span>
        </div>

        {/* 주문별 판매 내역 */}
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.order_id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* 주문 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(order.sale_date)}
                  </span>
                  <span className="text-xs text-gray-500">
                    구매자: {order.buyer_pharmacy_name}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {order.order_id.slice(0, 8)}
                </span>
              </div>

              {/* 배송 상태 스텝바 */}
              <OrderStatusStepper
                order={{
                  status: order.order_status,
                  tracking_number: order.tracking_number,
                  courier: order.courier,
                }}
              />

              {/* 약품 목록 */}
              <div className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <div
                    key={item.order_item_id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {item.product_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-500">
                        {item.quantity}개
                      </span>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatPrice(Number(item.sale_amount))}원
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 총 판매 금액 */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  주문 금액
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(order.total_amount)}원
                </span>
              </div>
            </div>
          ))}
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
