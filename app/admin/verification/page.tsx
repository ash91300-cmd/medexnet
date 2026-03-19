"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface VerificationRequest {
  id: string;
  user_id: string;
  pharmacy_name: string;
  pharmacist_name: string;
  phone: string;
  address: string | null;
  license_image_url: string;
  business_image_url: string;
  rejected_reason: string | null;
  reviewed_at: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "대기중", color: "bg-amber-100 text-amber-700" },
  approved: { label: "승인", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "거절", color: "bg-red-100 text-red-700" },
};

const FILTER_TABS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "대기중" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "거절" },
] as const;

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

export default function VerificationManagementPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("인증 요청 조회 실패:", error);
    } else {
      setRequests((data as VerificationRequest[]) ?? []);
    }
    setLoading(false);
  }

  async function handleApprove(request: VerificationRequest) {
    setProcessing(true);
    try {
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          rejected_reason: null,
        })
        .eq("id", request.id);

      if (reqError) throw reqError;

      const { error: userError } = await supabase
        .from("users")
        .update({ verification_status: "verified" })
        .eq("id", request.user_id);

      if (userError) throw userError;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: "approved" as const, reviewed_at: new Date().toISOString(), rejected_reason: null }
            : r
        )
      );
      setSelected((prev) =>
        prev?.id === request.id
          ? { ...prev, status: "approved" as const, reviewed_at: new Date().toISOString(), rejected_reason: null }
          : prev
      );
    } catch (err) {
      console.error("승인 처리 실패:", err);
      alert("승인 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(request: VerificationRequest) {
    if (!rejectedReason.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }
    setProcessing(true);
    try {
      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          rejected_reason: rejectedReason.trim(),
        })
        .eq("id", request.id);

      if (reqError) throw reqError;

      const { error: userError } = await supabase
        .from("users")
        .update({ verification_status: "rejected" })
        .eq("id", request.user_id);

      if (userError) throw userError;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "rejected" as const,
                reviewed_at: new Date().toISOString(),
                rejected_reason: rejectedReason.trim(),
              }
            : r
        )
      );
      setSelected((prev) =>
        prev?.id === request.id
          ? {
              ...prev,
              status: "rejected" as const,
              reviewed_at: new Date().toISOString(),
              rejected_reason: rejectedReason.trim(),
            }
          : prev
      );
      setRejectedReason("");
    } catch (err) {
      console.error("거절 처리 실패:", err);
      alert("거절 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  }

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">약사 인증 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        약사 인증 요청을 검토하고 승인 또는 반려합니다.
      </p>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              filter === tab.key
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">
              {counts[tab.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* 목록 */}
        <div className={`${selected ? "w-1/2 hidden lg:block" : "w-full"} space-y-3`}>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-400">해당하는 인증 요청이 없습니다.</p>
            </div>
          ) : (
            filtered.map((req) => {
              const status = STATUS_CONFIG[req.status];
              const isSelected = selected?.id === req.id;
              return (
                <button
                  key={req.id}
                  onClick={() => {
                    setSelected(req);
                    setRejectedReason("");
                  }}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
                    isSelected
                      ? "border-blue-300 ring-2 ring-blue-100"
                      : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {req.pharmacy_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.pharmacist_name} · {req.phone}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(req.created_at)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div className="w-full lg:w-1/2">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-6">
              {/* 패널 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">상세 정보</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* 상태 배지 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${STATUS_CONFIG[selected.status].color}`}
                  >
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                  {selected.reviewed_at && (
                    <span className="text-xs text-gray-400">
                      처리일: {formatDateTime(selected.reviewed_at)}
                    </span>
                  )}
                </div>

                {/* 기본 정보 */}
                <div className="space-y-3">
                  <InfoRow label="약국명" value={selected.pharmacy_name} />
                  <InfoRow label="약사명" value={selected.pharmacist_name} />
                  <InfoRow label="연락처" value={selected.phone} />
                  <InfoRow label="주소" value={selected.address ?? "-"} />
                  <InfoRow label="신청일" value={formatDateTime(selected.created_at)} />
                </div>

                {/* 거절 사유 (거절 상태일 때) */}
                {selected.status === "rejected" && selected.rejected_reason && (
                  <div className="px-4 py-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs font-medium text-red-600 mb-1">거절 사유</p>
                    <p className="text-sm text-red-700">{selected.rejected_reason}</p>
                  </div>
                )}

                {/* 서류 이미지 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">제출 서류</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">약사면허증</p>
                      <button
                        onClick={() => setImageModal(selected.license_image_url)}
                        className="w-full aspect-[4/3] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors group"
                      >
                        <img
                          src={selected.license_image_url}
                          alt="약사면허증"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">사업자등록증</p>
                      <button
                        onClick={() => setImageModal(selected.business_image_url)}
                        className="w-full aspect-[4/3] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors group"
                      >
                        <img
                          src={selected.business_image_url}
                          alt="사업자등록증"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 (대기중일 때만) */}
                {selected.status === "pending" && (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleApprove(selected)}
                      disabled={processing}
                      className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processing ? "처리 중..." : "승인"}
                    </button>

                    <div>
                      <textarea
                        value={rejectedReason}
                        onChange={(e) => setRejectedReason(e.target.value)}
                        placeholder="거절 사유를 입력해주세요..."
                        rows={2}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent resize-none mb-2"
                      />
                      <button
                        onClick={() => handleReject(selected)}
                        disabled={processing}
                        className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processing ? "처리 중..." : "거절"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 확대 모달 */}
      {imageModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            <button
              onClick={() => setImageModal(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              닫기
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={imageModal}
              alt="서류 확대 보기"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-14 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
