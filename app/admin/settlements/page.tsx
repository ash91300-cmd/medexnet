"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/discount";

/* ───────── Types ───────── */

interface SellerVerification {
  pharmacy_name: string;
}

interface SellerInfo {
  name: string | null;
  email: string;
  verification_requests: SellerVerification | SellerVerification[] | null;
}

interface Settlement {
  id: string;
  seller_id: string;
  order_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string | null;
  seller: SellerInfo | SellerInfo[] | null;
}

/* ───────── Constants ───────── */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "대기", color: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", color: "bg-emerald-100 text-emerald-700" },
};

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "대기" },
  { key: "completed", label: "완료" },
] as const;

/* ───────── Helpers ───────── */

function getSeller(s: Settlement): SellerInfo | null {
  return Array.isArray(s.seller) ? (s.seller[0] ?? null) : (s.seller ?? null);
}

function getPharmacyName(seller: SellerInfo | null): string {
  if (!seller) return "알 수 없음";
  const vr = seller.verification_requests;
  if (!vr) return seller.name ?? seller.email;
  const req = Array.isArray(vr) ? vr[0] : vr;
  return req?.pharmacy_name ?? seller.name ?? seller.email;
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

/* ───────── Component ───────── */

export default function SettlementManagementPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Settlement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSettlements();
  }, []);

  async function fetchSettlements() {
    const { data, error } = await supabase
      .from("settlements")
      .select(
        `id, seller_id, order_id, amount, status, created_at, updated_at,
         seller:users!seller_id(
           name, email,
           verification_requests(pharmacy_name)
         )`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("정산 조회 실패:", error);
    } else {
      setSettlements((data as Settlement[]) ?? []);
    }
    setLoading(false);
  }

  async function generateSettlements() {
    setGenerating(true);
    try {
      // 1. Fetch completed orders with their items and seller info
      const { data: completedOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `id,
           order_items(
             id, quantity, price_at_purchase,
             medicines(seller_id)
           )`,
        )
        .eq("status", "completed");

      if (ordersError) throw ordersError;
      if (!completedOrders || completedOrders.length === 0) {
        alert("완료된 주문이 없습니다.");
        setGenerating(false);
        return;
      }

      // 2. Fetch existing settlements to avoid duplicates
      const { data: existingSettlements, error: settError } = await supabase
        .from("settlements")
        .select("seller_id, order_id");

      if (settError) throw settError;

      const existingKeys = new Set(
        (existingSettlements ?? []).map(
          (s: { seller_id: string; order_id: string }) =>
            `${s.seller_id}_${s.order_id}`,
        ),
      );

      // 3. Group by (seller_id, order_id) and calculate amounts
      interface NewSettlement {
        seller_id: string;
        order_id: string;
        amount: number;
      }
      const newSettlements: NewSettlement[] = [];

      for (const order of completedOrders) {
        const sellerAmounts = new Map<string, number>();

        for (const item of order.order_items ?? []) {
          const medicine = Array.isArray(item.medicines)
            ? item.medicines[0]
            : item.medicines;
          if (!medicine?.seller_id) continue;

          const sellerId = medicine.seller_id;
          const amount = item.price_at_purchase * item.quantity;
          sellerAmounts.set(
            sellerId,
            (sellerAmounts.get(sellerId) ?? 0) + amount,
          );
        }

        for (const [sellerId, amount] of sellerAmounts) {
          const key = `${sellerId}_${order.id}`;
          if (!existingKeys.has(key)) {
            newSettlements.push({
              seller_id: sellerId,
              order_id: order.id,
              amount,
            });
          }
        }
      }

      if (newSettlements.length === 0) {
        alert("새로 생성할 정산 내역이 없습니다.");
        setGenerating(false);
        return;
      }

      // 4. Insert new settlements
      const { error: insertError } = await supabase
        .from("settlements")
        .insert(newSettlements);

      if (insertError) throw insertError;

      alert(`${newSettlements.length}건의 정산 내역이 생성되었습니다.`);
      await fetchSettlements();
    } catch (err) {
      console.error("정산 생성 실패:", err);
      alert("정산 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleComplete(settlement: Settlement) {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("settlements")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", settlement.id);

      if (error) throw error;

      const updated = {
        ...settlement,
        status: "completed",
        updated_at: new Date().toISOString(),
      };
      setSettlements((prev) =>
        prev.map((s) => (s.id === settlement.id ? updated : s)),
      );
      setSelected(updated);
    } catch (err) {
      console.error("정산 완료 처리 실패:", err);
      alert("정산 완료 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  const filtered =
    filter === "all"
      ? settlements
      : settlements.filter((s) => s.status === filter);

  const counts: Record<string, number> = { all: settlements.length };
  for (const s of settlements) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  }

  const totalPending = settlements
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  const totalCompleted = settlements
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">정산 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        판매자 정산 내역을 확인하고 처리합니다.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">총 정산 건수</p>
          <p className="text-xl font-bold text-gray-900">
            {settlements.length}
            <span className="text-sm font-normal text-gray-400 ml-1">건</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 p-4">
          <p className="text-xs text-amber-600 mb-1">미정산 금액</p>
          <p className="text-xl font-bold text-amber-700">
            {formatPrice(totalPending)}
            <span className="text-sm font-normal ml-0.5">원</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-4">
          <p className="text-xs text-emerald-600 mb-1">정산 완료 금액</p>
          <p className="text-xl font-bold text-emerald-700">
            {formatPrice(totalCompleted)}
            <span className="text-sm font-normal ml-0.5">원</span>
          </p>
        </div>
      </div>

      {/* Generate Button + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
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
              <span className="ml-1.5 text-xs opacity-70">
                {counts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={generateSettlements}
          disabled={generating}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
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
              미정산 주문 정산 생성
            </>
          )}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">
            해당하는 정산 내역이 없습니다.
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Settlement List */}
          <div
            className={`${
              selected ? "w-1/2 hidden lg:block" : "w-full"
            } space-y-3`}
          >
            {filtered.map((settlement) => {
              const seller = getSeller(settlement);
              const pharmacyName = getPharmacyName(seller);
              const status = STATUS_CONFIG[settlement.status] ?? {
                label: settlement.status,
                color: "bg-gray-100 text-gray-700",
              };
              const isSelected = selected?.id === settlement.id;

              return (
                <button
                  key={settlement.id}
                  onClick={() => setSelected(settlement)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                    isSelected
                      ? "border-sky-300 ring-2 ring-sky-100"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {pharmacyName}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(settlement.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-mono">
                      {settlement.order_id.slice(0, 8)}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(Number(settlement.amount))}원
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-6">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">
                    정산 상세
                  </h2>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                        (
                          STATUS_CONFIG[selected.status] ?? {
                            color: "bg-gray-100 text-gray-700",
                          }
                        ).color
                      }`}
                    >
                      {
                        (
                          STATUS_CONFIG[selected.status] ?? {
                            label: selected.status,
                          }
                        ).label
                      }
                    </span>
                    {selected.updated_at && (
                      <span className="text-xs text-gray-400">
                        최종 변경: {formatDateTime(selected.updated_at)}
                      </span>
                    )}
                  </div>

                  {/* Settlement Info */}
                  <div className="space-y-3">
                    <InfoRow
                      label="주문번호"
                      value={selected.order_id.slice(0, 8)}
                      mono
                    />
                    <InfoRow
                      label="판매자"
                      value={getPharmacyName(getSeller(selected))}
                    />
                    <InfoRow
                      label="생성일"
                      value={formatDateTime(selected.created_at)}
                    />
                  </div>

                  {/* Amount */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      정산 금액
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(Number(selected.amount))}원
                    </span>
                  </div>

                  {/* Action Button */}
                  {selected.status === "pending" && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleComplete(selected)}
                        disabled={processing}
                        className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processing ? "처리 중..." : "정산 완료"}
                      </button>
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

/* ───────── Sub-components ───────── */

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
