"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { formatPrice } from "@/lib/discount";

interface DrugInfo {
  product_name: string;
  company_name: string;
}

interface MedicineInfo {
  id: string;
  drug_id: number;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  medicines: MedicineInfo | MedicineInfo[] | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "주문 접수", color: "bg-amber-100 text-amber-700" },
  confirmed: { text: "주문 확인", color: "bg-blue-100 text-blue-700" },
  shipping: { text: "배송 중", color: "bg-indigo-100 text-indigo-700" },
  completed: { text: "배송 완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { text: "주문 취소", color: "bg-red-100 text-red-700" },
};

function getMedicine(item: OrderItem): MedicineInfo | null {
  return Array.isArray(item.medicines)
    ? item.medicines[0] ?? null
    : item.medicines ?? null;
}

function getDrug(medicine: MedicineInfo): DrugInfo | null {
  return Array.isArray(medicine.drugs_Fe)
    ? medicine.drugs_Fe[0] ?? null
    : medicine.drugs_Fe ?? null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && profile?.verification_status !== "verified") {
      router.replace("/");
    }
  }, [authLoading, user, profile, router]);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, total_amount, status, created_at,
           order_items(
             id, quantity, price_at_purchase,
             medicines(
               id, drug_id,
               drugs_Fe(product_name, company_name)
             )
           )`
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("주문 내역 조회 실패:", error);
        setLoading(false);
        return;
      }

      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }

    if (!authLoading) fetchOrders();
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-6">주문 내역을 확인하려면 로그인해주세요.</p>
            <Link href="/auth" className="text-blue-500 hover:text-blue-600 font-medium text-sm">
              로그인하기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">주문 내역</h1>
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">주문 내역이 없습니다</h2>
            <p className="text-sm text-gray-500 mb-6">약품 게시판에서 필요한 약품을 주문해보세요.</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          주문 내역
          <span className="text-base font-normal text-gray-500 ml-2">
            {orders.length}건
          </span>
        </h1>

        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABEL[order.status] ?? {
              text: order.status,
              color: "bg-gray-100 text-gray-700",
            };

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                {/* 주문 헤더 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(order.created_at)}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {order.id.slice(0, 8)}
                  </span>
                </div>

                {/* 약품 목록 */}
                <div className="divide-y divide-gray-50">
                  {order.order_items.map((item) => {
                    const medicine = getMedicine(item);
                    const drug = medicine ? getDrug(medicine) : null;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-5 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {drug?.product_name ?? "알 수 없는 약품"}
                          </p>
                          {drug?.company_name && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {drug.company_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          <span className="text-xs text-gray-500">
                            {item.quantity}개
                          </span>
                          <span className="text-sm font-medium text-gray-900 w-24 text-right">
                            {formatPrice(item.price_at_purchase * item.quantity)}원
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 총 결제 금액 */}
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    총 결제 금액
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(order.total_amount)}원
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
