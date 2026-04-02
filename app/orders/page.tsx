"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { formatPrice } from "@/lib/discount";
import { getCarrierName } from "@/lib/carriers";
import OrderStatusStepper from "@/components/OrderStatusStepper";

interface DrugInfo { product_name: string; company_name: string; }
interface MedicineInfo { id: string; drug_id: number; drugs_Fe: DrugInfo | DrugInfo[] | null; }
interface OrderItem { id: string; quantity: number; price_at_purchase: number; medicines: MedicineInfo | MedicineInfo[] | null; }
interface Order {
  id: string; total_amount: number; status: string;
  tracking_number: string | null; courier: string | null; carrier_code: string | null;
  delivered_at: string | null; confirmed_at: string | null; created_at: string;
  order_items: OrderItem[];
}
interface TrackingDetail { time: string; where: string; kind: string; }
interface TrackingResult { level: number; trackingDetails: TrackingDetail[]; }

const SHIPPING_FEE = 4000;
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "주문접수", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "결제완료", color: "bg-sky-100 text-sky-700" },
  shipping: { label: "배송중", color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "배송완료", color: "bg-teal-100 text-teal-700" },
  completed: { label: "거래완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

function getMedicine(item: OrderItem): MedicineInfo | null {
  return Array.isArray(item.medicines) ? (item.medicines[0] ?? null) : (item.medicines ?? null);
}
function getDrug(med: MedicineInfo): DrugInfo | null {
  return Array.isArray(med.drugs_Fe) ? (med.drugs_Fe[0] ?? null) : (med.drugs_Fe ?? null);
}
function formatDate(d: string) { return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
function formatDateTime(d: string) { return new Date(d).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, TrackingResult | null>>({});
  const [trackingLoading, setTrackingLoading] = useState<Record<string, boolean>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && profile?.verification_status !== "verified") router.replace("/");
  }, [authLoading, user, profile, router]);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("orders")
      .select(`id, total_amount, status, tracking_number, courier, carrier_code, delivered_at, confirmed_at, created_at,
               order_items(id, quantity, price_at_purchase, medicines(id, drug_id, drugs_Fe(product_name, company_name)))`)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("주문 조회 실패:", error);
    else setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (!authLoading) fetchOrders(); }, [authLoading, fetchOrders]);

  // Supabase Realtime: 주문 상태 실시간 동기화
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("buyer-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string; tracking_number: string | null; courier: string | null; carrier_code: string | null; delivered_at: string | null; confirmed_at: string | null };
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status, tracking_number: updated.tracking_number, courier: updated.courier, carrier_code: updated.carrier_code, delivered_at: updated.delivered_at, confirmed_at: updated.confirmed_at }
                : o
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchTracking(order: Order) {
    if (!order.carrier_code || !order.tracking_number) return;
    setTrackingLoading((p) => ({ ...p, [order.id]: true }));
    try {
      const res = await fetch(`/api/tracking?carrier_code=${order.carrier_code}&tracking_number=${order.tracking_number}`);
      const data = await res.json();
      setTrackingData((p) => ({ ...p, [order.id]: data }));
      if (data.level === 6 && order.status === "shipping") {
        await supabase.from("orders").update({ status: "delivered", delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", order.id);
        setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "delivered", delivered_at: new Date().toISOString() } : o));
      }
    } catch { setTrackingData((p) => ({ ...p, [order.id]: null })); }
    finally { setTrackingLoading((p) => ({ ...p, [order.id]: false })); }
  }

  async function handleConfirmPurchase(order: Order) {
    if (!confirm("구매를 확정하시겠습니까? 확정 후에는 거래가 완료됩니다.")) return;
    setConfirmingId(order.id);
    try {
      const { error } = await supabase.from("orders").update({ status: "completed", confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", order.id);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "completed", confirmed_at: new Date().toISOString() } : o));
    } catch { alert("구매확정에 실패했습니다."); }
    finally { setConfirmingId(null); }
  }

  // 배송완료 후 남은 자동 구매확정 일수 계산
  function getRemainingDays(deliveredAt: string | null): number | null {
    if (!deliveredAt) return null;
    const delivered = new Date(deliveredAt);
    const deadline = new Date(delivered.getTime() + 3 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, remaining);
  }

  if (authLoading || loading) return <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white"><Navbar /><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" /></div></div>;
  if (!user) return <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white"><Navbar /><main className="max-w-4xl mx-auto px-6 py-10"><div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2><p className="text-sm text-gray-500 mb-6">주문 내역을 확인하려면 로그인해주세요.</p><Link href="/auth" className="text-sky-500 hover:text-sky-600 font-medium text-sm">로그인하기</Link></div></main></div>;
  if (orders.length === 0) return <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white"><Navbar /><main className="max-w-4xl mx-auto px-6 py-10"><h1 className="text-2xl font-bold text-gray-900 mb-6">주문 내역</h1><div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><h2 className="text-xl font-bold text-gray-900 mb-2">주문 내역이 없습니다</h2><p className="text-sm text-gray-500 mb-6">약품 게시판에서 필요한 약품을 주문해보세요.</p><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-xl transition-colors">게시판으로 이동</Link></div></main></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10 page-enter">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">주문 내역 <span className="text-base font-normal text-gray-500 ml-2">{orders.length}건</span></h1>
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
            const tracking = trackingData[order.id];
            const isTrackingLoading = trackingLoading[order.id];
            const courierDisplay = order.carrier_code ? getCarrierName(order.carrier_code) : order.courier;
            const remainingDays = order.status === "delivered" ? getRemainingDays(order.delivered_at) : null;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{formatDate(order.created_at)}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>{status.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{order.id.slice(0, 8)}</span>
                </div>

                <OrderStatusStepper order={order} />

                <div className="divide-y divide-gray-50">
                  {order.order_items.map((item) => {
                    const medicine = getMedicine(item);
                    const drug = medicine ? getDrug(medicine) : null;
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{drug?.product_name ?? "알 수 없는 약품"}</p>
                          {drug?.company_name && <p className="text-xs text-gray-400 mt-0.5">{drug.company_name}</p>}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                          <span className="text-xs text-gray-500">{item.quantity}개</span>
                          <span className="text-sm font-medium text-gray-900 w-24 text-right">{formatPrice(item.price_at_purchase * item.quantity)}원</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">택배비 (구매약국 부담 50%)</span>
                    <span className="text-xs text-gray-600">{formatPrice(SHIPPING_FEE / 2)}원</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">총 결제 금액</span>
                    <span className="text-lg font-bold text-gray-900">{formatPrice(order.total_amount)}원</span>
                  </div>
                </div>

                {/* 배송 추적 섹션 */}
                {["shipping", "delivered", "completed"].includes(order.status) && order.tracking_number && (
                  <div className="px-5 py-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">배송 정보</span>
                      <button
                        onClick={() => {
                          if (isExpanded) { setExpandedOrder(null); }
                          else { setExpandedOrder(order.id); if (!tracking) fetchTracking(order); }
                        }}
                        className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                      >
                        {isExpanded ? "접기" : "배송 조회"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <span className="font-medium">{courierDisplay}</span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono text-xs">{order.tracking_number}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3">
                        {isTrackingLoading ? (
                          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : tracking?.trackingDetails ? (
                          <div className="space-y-0 border-l-2 border-gray-200 ml-2">
                            {tracking.trackingDetails.slice().reverse().map((d, i) => (
                              <div key={i} className="pl-4 pb-4 relative">
                                <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${i === 0 ? "bg-sky-500" : "bg-gray-300"}`} />
                                <p className="text-xs text-gray-400">{d.time}</p>
                                <p className="text-sm text-gray-900">{d.kind}</p>
                                <p className="text-xs text-gray-500">{d.where}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">배송 정보를 불러올 수 없습니다.</p>
                        )}
                      </div>
                    )}

                    {/* 구매확정 버튼: 배송완료 상태에서만 활성화 */}
                    {order.status === "delivered" && (
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={() => handleConfirmPurchase(order)}
                          disabled={confirmingId === order.id}
                          className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {confirmingId === order.id ? "처리 중..." : "구매확정"}
                        </button>
                        {remainingDays !== null && (
                          <p className="text-xs text-gray-400 text-center">
                            {remainingDays > 0 ? `${remainingDays}일 후 자동 구매확정됩니다.` : "곧 자동 구매확정됩니다."}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 배송중 상태: 구매확정 버튼 비활성화 표시 */}
                    {order.status === "shipping" && (
                      <button
                        disabled
                        className="w-full mt-3 py-3 bg-gray-200 text-gray-400 font-semibold rounded-xl cursor-not-allowed"
                      >
                        배송완료 후 구매확정 가능
                      </button>
                    )}

                    {order.status === "completed" && order.confirmed_at && (
                      <div className="mt-3 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                        <p className="text-sm font-medium text-emerald-700">거래가 완료되었습니다</p>
                        <p className="text-xs text-emerald-500 mt-1">구매확정: {formatDateTime(order.confirmed_at)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
