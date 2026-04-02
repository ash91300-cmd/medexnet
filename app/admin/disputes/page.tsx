"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ───────── Types ───────── */

interface BuyerVerification {
  pharmacy_name: string;
}

interface ReporterInfo {
  name: string | null;
  email: string;
  verification_requests: BuyerVerification | BuyerVerification[] | null;
}

interface Dispute {
  id: string;
  order_id: string;
  reporter_id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  reporter: ReporterInfo | ReporterInfo[] | null;
}

/* ───────── Constants ───────── */

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  condition_mismatch: {
    label: "상태 불일치",
    color: "bg-orange-100 text-orange-700",
  },
  quantity_shortage: {
    label: "수량 부족",
    color: "bg-purple-100 text-purple-700",
  },
  shipping_issue: {
    label: "배송 문제",
    color: "bg-indigo-100 text-indigo-700",
  },
  other: { label: "기타", color: "bg-gray-100 text-gray-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "접수", color: "bg-amber-100 text-amber-700" },
  in_review: { label: "검토중", color: "bg-sky-100 text-sky-700" },
  resolved: { label: "해결", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "종료", color: "bg-gray-100 text-gray-600" },
};

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "open", label: "접수" },
  { key: "in_review", label: "검토중" },
  { key: "resolved", label: "해결" },
  { key: "closed", label: "종료" },
] as const;

const NEXT_STATUS: Record<string, string> = {
  open: "in_review",
  in_review: "resolved",
  resolved: "closed",
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  open: "검토 시작",
  in_review: "해결 처리",
  resolved: "종료 처리",
};

/* ───────── Helpers ───────── */

function getReporter(dispute: Dispute): ReporterInfo | null {
  return Array.isArray(dispute.reporter)
    ? (dispute.reporter[0] ?? null)
    : (dispute.reporter ?? null);
}

function getPharmacyName(reporter: ReporterInfo | null): string {
  if (!reporter) return "알 수 없음";
  const vr = reporter.verification_requests;
  if (!vr) return reporter.name ?? reporter.email;
  const req = Array.isArray(vr) ? vr[0] : vr;
  return req?.pharmacy_name ?? reporter.name ?? reporter.email;
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

export default function DisputeManagementPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  async function fetchDisputes() {
    const { data, error } = await supabase
      .from("disputes")
      .select(
        `id, order_id, reporter_id, type, description, status, created_at, updated_at,
         reporter:users!reporter_id(
           name, email,
           verification_requests(pharmacy_name)
         )`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("분쟁 조회 실패:", error);
    } else {
      setDisputes((data as Dispute[]) ?? []);
    }
    setLoading(false);
  }

  async function handleStatusChange(dispute: Dispute, newStatus: string) {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("disputes")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", dispute.id);

      if (error) throw error;

      const updated = {
        ...dispute,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      setDisputes((prev) =>
        prev.map((d) => (d.id === dispute.id ? updated : d)),
      );
      setSelected(updated);
    } catch (err) {
      console.error("상태 변경 실패:", err);
      alert("상태 변경에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  const filtered =
    filter === "all" ? disputes : disputes.filter((d) => d.status === filter);

  const counts: Record<string, number> = { all: disputes.length };
  for (const d of disputes) {
    counts[d.status] = (counts[d.status] ?? 0) + 1;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">분쟁 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        거래 분쟁을 중재하고 처리합니다.
      </p>

      {/* Filter Tabs */}
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
            <span className="ml-1.5 text-xs opacity-70">
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">해당하는 분쟁이 없습니다.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Dispute List */}
          <div
            className={`${
              selected ? "w-1/2 hidden lg:block" : "w-full"
            } space-y-3`}
          >
            {filtered.map((dispute) => {
              const reporter = getReporter(dispute);
              const pharmacyName = getPharmacyName(reporter);
              const status = STATUS_CONFIG[dispute.status] ?? {
                label: dispute.status,
                color: "bg-gray-100 text-gray-700",
              };
              const typeInfo = TYPE_CONFIG[dispute.type] ?? {
                label: dispute.type,
                color: "bg-gray-100 text-gray-700",
              };
              const isSelected = selected?.id === dispute.id;

              return (
                <button
                  key={dispute.id}
                  onClick={() => setSelected(dispute)}
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
                        {formatDate(dispute.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {dispute.order_id.slice(0, 8)}
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
                    분쟁 상세
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
                  {/* Status & Type Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
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
                    <span
                      className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                        (
                          TYPE_CONFIG[selected.type] ?? {
                            color: "bg-gray-100 text-gray-700",
                          }
                        ).color
                      }`}
                    >
                      {
                        (TYPE_CONFIG[selected.type] ?? { label: selected.type })
                          .label
                      }
                    </span>
                    {selected.updated_at && (
                      <span className="text-xs text-gray-400">
                        최종 변경: {formatDateTime(selected.updated_at)}
                      </span>
                    )}
                  </div>

                  {/* Dispute Info */}
                  <div className="space-y-3">
                    <InfoRow
                      label="주문번호"
                      value={selected.order_id.slice(0, 8)}
                      mono
                    />
                    <InfoRow
                      label="신고자"
                      value={getPharmacyName(getReporter(selected))}
                    />
                    <InfoRow
                      label="분쟁유형"
                      value={
                        (TYPE_CONFIG[selected.type] ?? { label: selected.type })
                          .label
                      }
                    />
                    <InfoRow
                      label="신고일"
                      value={formatDateTime(selected.created_at)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      상세 내용
                    </h3>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selected.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Progress */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      처리 상태
                    </h3>
                    <DisputeStatusStepper status={selected.status} />
                  </div>

                  {/* Action Buttons */}
                  {NEXT_STATUS[selected.status] && (
                    <div className="pt-2">
                      <button
                        onClick={() =>
                          handleStatusChange(
                            selected,
                            NEXT_STATUS[selected.status],
                          )
                        }
                        disabled={processing}
                        className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processing
                          ? "처리 중..."
                          : NEXT_STATUS_LABEL[selected.status]}
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

const DISPUTE_STEPS = [
  { key: "open", label: "접수" },
  { key: "in_review", label: "검토중" },
  { key: "resolved", label: "해결" },
  { key: "closed", label: "종료" },
];

function DisputeStatusStepper({ status }: { status: string }) {
  const currentIdx = DISPUTE_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center">
      {DISPUTE_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div
            key={step.key}
            className="flex items-center flex-1 last:flex-none"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-sky-500 text-white ring-4 ring-sky-100"
                      : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCompleted
                    ? "text-emerald-600"
                    : isCurrent
                      ? "text-sky-600"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < DISPUTE_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-5 ${
                  idx < currentIdx ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
