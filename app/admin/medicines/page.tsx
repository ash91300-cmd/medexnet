"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

/* ── 타입 ── */
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

interface Toast {
  message: string;
  type: "success" | "error";
}

/* ── 상수 ── */
const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "검수 대기" },
  { key: "approved", label: "승인" },
  { key: "rejected", label: "거절" },
] as const;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: {
    label: "검수 대기",
    className: "bg-yellow-100 text-yellow-700",
  },
  approved: {
    label: "승인",
    className: "bg-green-100 text-green-700",
  },
  rejected: {
    label: "거절",
    className: "bg-red-100 text-red-700",
  },
};

/* ── 헬퍼 ── */
function getDrug(m: MedicineRow): DrugInfo | null {
  return Array.isArray(m.drugs_Fe)
    ? (m.drugs_Fe[0] ?? null)
    : (m.drugs_Fe ?? null);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ══════════════════════════════════════════
   메인 컴포넌트
   ══════════════════════════════════════════ */
export default function MedicineInspectionPage() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [pharmacyNames, setPharmacyNames] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineRow | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── 데이터 로드 ── */
  const fetchMedicines = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("medicines")
      .select(
        `id, drug_id, seller_id, quantity, expiry_date, is_opened, image_urls, status, created_at, drugs_Fe(product_code, product_name, company_name, max_price, unit)`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      showToast("약품 목록을 불러오는 데 실패했습니다.", "error");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as MedicineRow[];
    setMedicines(rows);

    // 등록자 약국명 일괄 조회
    const sellerIds = [...new Set(rows.map((m) => m.seller_id))];
    if (sellerIds.length > 0) {
      const { data: verData } = await supabase
        .from("verification_requests")
        .select("user_id, pharmacy_name")
        .in("user_id", sellerIds);

      if (verData) {
        const map: Record<string, string> = {};
        for (const v of verData) {
          if (!map[v.user_id]) {
            map[v.user_id] = v.pharmacy_name;
          }
        }
        setPharmacyNames(map);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  /* ── 상태 변경 ── */
  async function handleStatusChange(
    id: string,
    newStatus: "approved" | "rejected",
  ) {
    setUpdating(true);

    const { error } = await supabase
      .from("medicines")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      showToast("상태 변경에 실패했습니다.", "error");
      setUpdating(false);
      return;
    }

    // 로컬 상태 즉시 반영
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)),
    );
    if (selectedMedicine?.id === id) {
      setSelectedMedicine((prev) =>
        prev ? { ...prev, status: newStatus } : null,
      );
    }

    showToast(
      newStatus === "approved"
        ? "약품이 승인되었습니다."
        : "약품이 거절되었습니다.",
      "success",
    );
    setUpdating(false);
  }

  /* ── 필터링 ── */
  const filtered =
    filter === "all" ? medicines : medicines.filter((m) => m.status === filter);

  const counts = {
    all: medicines.length,
    pending: medicines.filter((m) => m.status === "pending").length,
    approved: medicines.filter((m) => m.status === "approved").length,
    rejected: medicines.filter((m) => m.status === "rejected").length,
  };

  /* ── 렌더 ── */
  return (
    <div>
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-1">약품 검수</h1>
      <p className="text-sm text-gray-500 mb-6">
        등록된 약품을 검수하고 게시를 승인합니다.
      </p>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-xs ${
                filter === f.key ? "text-blue-100" : "text-gray-400"
              }`}
            >
              {counts[f.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        /* 빈 상태 */
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-.017.017c-1.232 1.232-3.23 1.232-4.462 0L15.32 19.78M5 14.5l-1.402 1.402c-1.232 1.232-1.232 3.23 0 4.462l.017.017c1.232 1.232 3.23 1.232 4.462 0L9.48 19.078"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400">해당하는 약품이 없습니다.</p>
        </div>
      ) : (
        /* 테이블 */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    약품명
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    보험코드
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    등록 약국
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const drug = getDrug(m);
                  const badge = STATUS_BADGE[m.status] ?? {
                    label: m.status,
                    className: "bg-gray-100 text-gray-600",
                  };

                  return (
                    <tr
                      key={m.id}
                      onClick={() => {
                        setSelectedMedicine(m);
                        setSelectedImage(0);
                      }}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {m.image_urls?.[0] ? (
                              <Image
                                src={m.image_urls[0]}
                                alt={drug?.product_name ?? "약품"}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-gray-300"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {drug?.product_name ?? "알 수 없음"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {drug?.company_name ?? "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">
                        {drug?.product_code ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {pharmacyNames[m.seller_id] ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {selectedMedicine && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DetailModal
              medicine={selectedMedicine}
              pharmacyName={pharmacyNames[selectedMedicine.seller_id] ?? null}
              selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
              updating={updating}
              onApprove={() =>
                handleStatusChange(selectedMedicine.id, "approved")
              }
              onReject={() =>
                handleStatusChange(selectedMedicine.id, "rejected")
              }
              onClose={() => setSelectedMedicine(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   상세 모달 컴포넌트
   ══════════════════════════════════════════ */
function DetailModal({
  medicine,
  pharmacyName,
  selectedImage,
  onSelectImage,
  updating,
  onApprove,
  onReject,
  onClose,
}: {
  medicine: MedicineRow;
  pharmacyName: string | null;
  selectedImage: number;
  onSelectImage: (i: number) => void;
  updating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const drug = getDrug(medicine);
  const badge = STATUS_BADGE[medicine.status] ?? {
    label: medicine.status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      {/* 모달 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">약품 상세 정보</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* 이미지 섹션 */}
        <div className="p-6">
          <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative">
            {medicine.image_urls?.[selectedImage] ? (
              <Image
                src={medicine.image_urls[selectedImage]}
                alt={drug?.product_name ?? "약품"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-300"
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
          </div>

          {/* 썸네일 */}
          {medicine.image_urls && medicine.image_urls.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {medicine.image_urls.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectImage(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                    selectedImage === idx
                      ? "border-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={url}
                    alt={`사진 ${idx + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 정보 섹션 */}
        <div className="p-6 md:border-l border-t md:border-t-0 border-gray-100">
          {/* 상태 배지 */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
            >
              {badge.label}
            </span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                medicine.is_opened === "미개봉"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {medicine.is_opened}
            </span>
          </div>

          {/* 약품명 */}
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {drug?.product_name ?? "알 수 없는 약품"}
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            {drug?.company_name ?? "-"}
          </p>

          {/* 상세 정보 */}
          <div className="space-y-0 text-sm">
            <InfoRow
              label="보험코드"
              value={String(drug?.product_code ?? "-")}
            />
            <InfoRow label="제조사" value={drug?.company_name ?? "-"} />
            <InfoRow
              label="상한가"
              value={
                drug?.max_price ? `${drug.max_price} / ${drug.unit ?? ""}` : "-"
              }
            />
            <InfoRow
              label="수량"
              value={`${medicine.quantity.toLocaleString("ko-KR")}개`}
            />
            <InfoRow
              label="유통기한"
              value={formatDate(medicine.expiry_date)}
            />
            <InfoRow label="개봉 여부" value={medicine.is_opened} />
            <InfoRow label="등록 약국" value={pharmacyName ?? "-"} />
            <InfoRow label="등록일" value={formatDate(medicine.created_at)} />
          </div>

          {/* 승인/거절 버튼 */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onApprove}
              disabled={updating || medicine.status === "approved"}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                medicine.status === "approved"
                  ? "bg-green-100 text-green-600 cursor-default"
                  : "bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white"
              }`}
            >
              {updating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
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
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
              {medicine.status === "approved" ? "승인됨" : "승인"}
            </button>
            <button
              onClick={onReject}
              disabled={updating || medicine.status === "rejected"}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                medicine.status === "rejected"
                  ? "bg-red-100 text-red-600 cursor-default"
                  : "bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white"
              }`}
            >
              {updating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {medicine.status === "rejected" ? "거절됨" : "거절"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 정보 행 ── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
