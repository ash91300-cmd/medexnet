"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/discount";
import { CARRIERS, getCarrierName } from "@/lib/carriers";
import OrderStatusStepper from "@/components/OrderStatusStepper";

/* ───────── Types ───────── */

interface DrugInfo {
  product_name: string;
  company_name: string;
}

interface MedicineInfo {
  id: string;
  drug_id: number;
  seller_id: string;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  medicines: MedicineInfo | MedicineInfo[] | null;
}

interface BuyerVerification {
  pharmacy_name: string;
}

interface BuyerInfo {
  name: string | null;
  email: string;
  verification_requests: BuyerVerification | BuyerVerification[] | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  tracking_number: string | null;
  courier: string | null;
  carrier_code: string | null;
  shipping_memo: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
  buyer: BuyerInfo | BuyerInfo[] | null;
  order_items: OrderItem[];
}

/* ───────── Constants ───────── */

const SHIPPING_FEE = 4000;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "주문접수", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "결제완료", color: "bg-sky-100 text-sky-700" },
  shipping: { label: "배송중", color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "배송완료", color: "bg-teal-100 text-teal-700" },
  completed: { label: "거래완료", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "confirmed", label: "결제완료" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "completed", label: "거래완료" },
  { key: "pending", label: "주문접수" },
  { key: "cancelled", label: "취소" },
] as const;

/* ───────── Helpers ───────── */

function getMedicine(item: OrderItem): MedicineInfo | null {
  return Array.isArray(item.medicines)
    ? (item.medicines[0] ?? null)
    : (item.medicines ?? null);
}

function getDrug(medicine: MedicineInfo): DrugInfo | null {
  return Array.isArray(medicine.drugs_Fe)
    ? (medicine.drugs_Fe[0] ?? null)
    : (medicine.drugs_Fe ?? null);
}

function getBuyer(order: Order): BuyerInfo | null {
  return Array.isArray(order.buyer)
    ? (order.buyer[0] ?? null)
    : (order.buyer ?? null);
}

function getPharmacyName(buyer: BuyerInfo | null): string {
  if (!buyer) return "알 수 없음";
  const vr = buyer.verification_requests;
  if (!vr) return buyer.name ?? buyer.email;
  const req = Array.isArray(vr) ? vr[0] : vr;
  return req?.pharmacy_name ?? buyer.name ?? buyer.email;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSellerGroups(order: Order) {
  const groups: Record<string, OrderItem[]> = {};
  for (const item of order.order_items) {
    const med = getMedicine(item);
    const sellerId = med?.seller_id ?? "unknown";
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
  }
  return Object.values(groups);
}

/* ───────── Component ───────── */

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [processing, setProcessing] = useState(false);

  const [showShippingForm, setShowShippingForm] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingMemo, setShippingMemo] = useState("");

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, total_amount, status, tracking_number, courier, carrier_code, shipping_memo, delivered_at, confirmed_at, created_at, updated_at,
         buyer:users!buyer_id(name, email, verification_requests(pharmacy_name)),
         order_items(id, quantity, price_at_purchase, medicines(id, drug_id, seller_id, drugs_Fe(product_name, company_name)))`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("주문 조회 실패:", error);
    } else {
      setOrders((data as Order[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Supabase Realtime: 주문 상태 실시간 동기화
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as {
            id: string; status: string; tracking_number: string | null;
            courier: string | null; carrier_code: string | null; shipping_memo: string | null;
            delivered_at: string | null; confirmed_at: string | null; updated_at: string | null;
          };
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status, tracking_number: updated.tracking_number, courier: updated.courier, carrier_code: updated.carrier_code, shipping_memo: updated.shipping_memo, delivered_at: updated.delivered_at, confirmed_at: updated.confirmed_at, updated_at: updated.updated_at }
                : o
            )
          );
          setSelected((prev) =>
            prev?.id === updated.id
              ? { ...prev, status: updated.status, tracking_number: updated.tracking_number, courier: updated.courier, carrier_code: updated.carrier_code, shipping_memo: updated.shipping_memo, delivered_at: updated.delivered_at, confirmed_at: updated.confirmed_at, updated_at: updated.updated_at }
              : prev
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleStatusChange(order: Order, newStatus: string) {
    if (newStatus === "shipping") {
      setShowShippingForm(true);
      return;
    }

    setProcessing(true);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("orders").update(updateData).eq("id", order.id);
      if (error) throw error;

      const updated = { ...order, ...updateData } as Order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setSelected(updated);
    } catch (err) {
      console.error("상태 변경 실패:", err);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleShippingSubmit(order: Order) {
    if (!selectedCarrier || !trackingNumber.trim()) {
      alert("택배사와 송장번호를 입력해주세요.");
      return;
    }
    const carrier = CARRIERS.find((c) => c.code === selectedCarrier);
    if (!carrier) return;

    setProcessing(true);
    try {
      const updateData = {
        status: "shipping",
        carrier_code: carrier.code,
        courier: carrier.name,
        tracking_number: trackingNumber.trim(),
        shipping_memo: shippingMemo.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("orders").update(updateData).eq("id", order.id);
      if (error) throw error;

      const updated = { ...order, ...updateData };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setSelected(updated);
      setShowShippingForm(false);
      setSelectedCarrier("");
      setTrackingNumber("");
      setShippingMemo("");
    } catch (err) {
      console.error("배송 처리 실패:", err);
      alert("배송 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel(order: Order) {
    if (!confirm("정말 이 주문을 취소하시겠습니까?")) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (error) throw error;
      const updated = { ...order, status: "cancelled", updated_at: new Date().toISOString() };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setSelected(updated);
    } catch (err) {
      console.error("주문 취소 실패:", err);
      alert("주문 취소에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  // 관리자가 할 수 있는 액션: 결제확인(pending→confirmed), 배송처리(confirmed→shipping, 송장입력)
  // 배송완료, 거래완료는 스마트택배 API + 구매확정으로 자동 처리
  const nextAction: Record<string, { status: string; label: string }> = {
    pending: { status: "confirmed", label: "결제 확인" },
    confirmed: { status: "shipping", label: "배송 처리" },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">주문/배송 관리</h1>
      <p className="text-sm text-gray-500 mb-6">송장번호 입력 후 배송 상태는 스마트택배 API로 자동 반영됩니다.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              filter === tab.key
                ? "bg-sky-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">해당하는 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className={`${selected ? "w-1/2 hidden lg:block" : "w-full"} space-y-3`}>
            {filtered.map((order) => {
              const buyer = getBuyer(order);
              const pharmacyName = getPharmacyName(buyer);
              const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
              const isSelected = selected?.id === order.id;
              return (
                <button
                  key={order.id}
                  onClick={() => { setSelected(order); setShowShippingForm(false); }}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${isSelected ? "border-sky-300 ring-2 ring-sky-100" : "border-gray-100"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{pharmacyName}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">{order.id.slice(0, 8)}</span>
                    <span className="text-sm font-bold text-gray-900">{formatPrice(order.total_amount)}원</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-6">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">주문 상세</h2>
                  <button onClick={() => { setSelected(null); setShowShippingForm(false); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${(STATUS_CONFIG[selected.status] ?? { color: "bg-gray-100 text-gray-700" }).color}`}>
                      {(STATUS_CONFIG[selected.status] ?? { label: selected.status }).label}
                    </span>
                    {selected.updated_at && <span className="text-xs text-gray-400">최종 변경: {formatDateTime(selected.updated_at)}</span>}
                  </div>

                  <div className="space-y-3">
                    <InfoRow label="주문번호" value={selected.id.slice(0, 8)} mono />
                    <InfoRow label="구매 약국" value={getPharmacyName(getBuyer(selected))} />
                    <InfoRow label="주문일" value={formatDateTime(selected.created_at)} />
                    <InfoRow label="총 금액" value={`${formatPrice(selected.total_amount)}원`} />
                    {selected.delivered_at && <InfoRow label="배송완료" value={formatDateTime(selected.delivered_at)} />}
                    {selected.confirmed_at && <InfoRow label="구매확정" value={formatDateTime(selected.confirmed_at)} />}
                  </div>

                  {/* 자동 상태 안내 */}
                  {selected.status === "shipping" && (
                    <div className="px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs text-indigo-700 font-medium">배송 상태가 스마트택배 API로 자동 추적됩니다.</p>
                      <p className="text-xs text-indigo-500 mt-1">배송완료 시 자동으로 상태가 변경됩니다.</p>
                    </div>
                  )}
                  {selected.status === "delivered" && (
                    <div className="px-4 py-3 bg-teal-50 rounded-xl border border-teal-100">
                      <p className="text-xs text-teal-700 font-medium">구매 약국의 구매확정을 대기 중입니다.</p>
                      <p className="text-xs text-teal-500 mt-1">배송완료 후 3일 이내 구매확정이 없으면 자동으로 거래가 완료됩니다.</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    <OrderStatusStepper order={selected} />
                  </div>

                  {selected.tracking_number && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900">배송 정보</h3>
                      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 space-y-2">
                        <InfoRow label="택배사" value={selected.carrier_code ? getCarrierName(selected.carrier_code) : (selected.courier ?? "-")} />
                        <InfoRow label="송장번호" value={selected.tracking_number} mono />
                        {selected.shipping_memo && <InfoRow label="메모" value={selected.shipping_memo} />}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">주문 약품 ({selected.order_items.length}건)</h3>
                    {getSellerGroups(selected).map((items, gIdx) => (
                      <div key={gIdx} className="mb-3">
                        <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                          {items.map((item) => {
                            const medicine = getMedicine(item);
                            const drug = medicine ? getDrug(medicine) : null;
                            return (
                              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 truncate">{drug?.product_name ?? "알 수 없는 약품"}</p>
                                  {drug?.company_name && <p className="text-xs text-gray-400 mt-0.5">{drug.company_name}</p>}
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                  <span className="text-xs text-gray-500">{item.quantity}개</span>
                                  <span className="text-sm font-medium text-gray-900 w-20 text-right">{formatPrice(item.price_at_purchase * item.quantity)}원</span>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-100/50">
                            <div>
                              <p className="text-xs text-gray-600 font-medium">택배비</p>
                              <p className="text-xs text-gray-400">구매약국 50% + 판매약국 50%</p>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{formatPrice(SHIPPING_FEE)}원</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showShippingForm && selected.status === "confirmed" && (
                    <div className="space-y-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <h3 className="text-sm font-semibold text-indigo-900">배송 정보 입력</h3>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">택배사 <span className="text-red-500">*</span></label>
                        <select
                          value={selectedCarrier}
                          onChange={(e) => setSelectedCarrier(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
                        >
                          <option value="">택배사를 선택하세요</option>
                          {CARRIERS.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">송장번호 <span className="text-red-500">*</span></label>
                        <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="송장번호를 입력하세요" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent font-mono" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">배송 메모 <span className="text-gray-400">(선택)</span></label>
                        <textarea value={shippingMemo} onChange={(e) => setShippingMemo(e.target.value)} placeholder="배송 관련 메모를 입력하세요" rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowShippingForm(false)} className="flex-1 py-3 bg-white text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm">취소</button>
                        <button onClick={() => handleShippingSubmit(selected)} disabled={processing} className="flex-1 py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">{processing ? "처리 중..." : "배송 처리"}</button>
                      </div>
                    </div>
                  )}

                  {/* 관리자 액션: 결제확인, 배송처리만 가능. 이후 상태는 자동 */}
                  {selected.status !== "completed" && selected.status !== "cancelled" && (
                    <div className="space-y-2 pt-2">
                      {nextAction[selected.status] && !showShippingForm && (
                        <button onClick={() => handleStatusChange(selected, nextAction[selected.status].status)} disabled={processing} className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          {processing ? "처리 중..." : nextAction[selected.status].label}
                        </button>
                      )}
                      {!showShippingForm && !["shipping", "delivered"].includes(selected.status) && (
                        <button onClick={() => handleCancel(selected)} disabled={processing} className="w-full py-3 bg-white text-red-500 font-medium rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          {processing ? "처리 중..." : "주문 취소"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
