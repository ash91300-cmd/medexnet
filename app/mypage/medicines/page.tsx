"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { formatPrice, parsePrice, calculateDiscountedPrice } from "@/lib/discount";

/* ──────────────────────── 타입 ──────────────────────── */

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

interface PhotoSlot {
  file: File | null;
  preview: string | null;
  existingUrl: string | null;
  label: string;
  description: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: "심사 중", color: "bg-amber-100 text-amber-700" },
  approved: { text: "승인", color: "bg-emerald-100 text-emerald-700" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

const PHOTO_LABELS = [
  { label: "전체 사진", description: "약품 이름이 보이도록 전체를 촬영해주세요" },
  { label: "유통기한 · 로트번호", description: "유통기한과 로트번호가 보이도록 촬영해주세요" },
  { label: "제품 상세", description: "제품의 상태가 잘 보이도록 촬영해주세요" },
];

/* ──────────────────────── 유틸 ──────────────────────── */

function getDrug(med: MedicineRow): DrugInfo | null {
  return Array.isArray(med.drugs_Fe) ? med.drugs_Fe[0] ?? null : med.drugs_Fe ?? null;
}

function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

/* ──────────────────────── 페이지 ──────────────────────── */

export default function MyMedicinesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MyMedicinesContent />
    </Suspense>
  );
}

function MyMedicinesContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MedicineRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<MedicineRow | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetch() {
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("medicines")
        .select(
          `id, drug_id, quantity, expiry_date, is_opened, condition, image_urls, status, created_at,
           drugs_Fe(product_code, product_name, company_name, max_price, unit)`
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("등록 약품 조회 실패:", error);
        setLoading(false);
        return;
      }
      setMedicines((data as MedicineRow[]) ?? []);
      setLoading(false);
    }
    if (!authLoading) fetch();
  }, [user, authLoading]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* ── 삭제 ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase.from("medicines").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (error) {
      console.error("삭제 실패:", error);
      showToast("약품 삭제에 실패했습니다.", "error");
    } else {
      setMedicines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      showToast("약품이 삭제되었습니다.", "success");
    }
    setDeleteTarget(null);
  }

  /* ── 수정 완료 콜백 ── */
  function handleEditDone(updated: MedicineRow) {
    setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setEditTarget(null);
    showToast("약품 정보가 수정되었습니다. 관리자 재승인이 필요합니다.", "success");
  }

  /* ── 로딩 / 비로그인 ── */
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

  if (!user) return null;

  /* ── 렌더 ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          &larr; 마이페이지로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">
          등록 약품
          {medicines.length > 0 && (
            <span className="text-base font-normal text-gray-500 ml-2">{medicines.length}건</span>
          )}
        </h1>

        {medicines.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">등록한 약품이 없습니다</h2>
            <p className="text-sm text-gray-500 mb-6">약품을 등록하여 판매를 시작해보세요.</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              약품 등록하기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {medicines.map((med) => {
              const drug = getDrug(med);
              const statusInfo = STATUS_LABEL[med.status] ?? { text: med.status, color: "bg-gray-100 text-gray-700" };
              const thumbnail = med.image_urls?.[0] ?? null;
              const isExpired = new Date(med.expiry_date) < new Date();

              return (
                <div key={med.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="flex gap-4 p-5">
                    {/* 썸네일 */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      {thumbnail ? (
                        <img src={thumbnail} alt={drug?.product_name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {drug?.product_name ?? "알 수 없는 약품"}
                          </h3>
                          <p className="text-xs text-gray-500">{drug?.company_name ?? "-"}</p>
                        </div>
                        <span className={`flex-shrink-0 inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">단가</span>
                          <p className="font-medium text-gray-900">{drug?.max_price ?? "-"}원</p>
                        </div>
                        <div>
                          <span className="text-gray-500">수량</span>
                          <p className="font-medium text-gray-900">{med.quantity}개</p>
                        </div>
                        <div>
                          <span className="text-gray-500">유통기한</span>
                          <p className={`font-medium ${isExpired ? "text-red-500" : "text-gray-900"}`}>
                            {formatDate(med.expiry_date)}{isExpired && " (만료)"}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">상태</span>
                          <p className="font-medium text-gray-900">
                            {med.is_opened} / {med.condition}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div className="flex border-t border-gray-100">
                    <button
                      onClick={() => setEditTarget(med)}
                      className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      수정
                    </button>
                    <div className="w-px bg-gray-100" />
                    <button
                      onClick={() => setDeleteTarget(med)}
                      className="flex-1 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">약품 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              &quot;{getDrug(deleteTarget)?.product_name ?? "이 약품"}&quot;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <EditModal
          medicine={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={handleEditDone}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── 수정 모달 ──────────────────────── */

function EditModal({
  medicine,
  onClose,
  onDone,
}: {
  medicine: MedicineRow;
  onClose: () => void;
  onDone: (updated: MedicineRow) => void;
}) {
  const { user } = useAuth();
  const drug = getDrug(medicine);

  const [quantity, setQuantity] = useState(String(medicine.quantity));
  const [expiryDate, setExpiryDate] = useState(medicine.expiry_date);
  const [isOpened, setIsOpened] = useState(medicine.is_opened);
  const [condition, setCondition] = useState(medicine.condition);
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    PHOTO_LABELS.map((p, i) => ({
      file: null,
      preview: null,
      existingUrl: medicine.image_urls?.[i] ?? null,
      label: p.label,
      description: p.description,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handlePhotoChange(index: number, file: File | null) {
    setPhotos((prev) => {
      const next = [...prev];
      if (prev[index].preview) URL.revokeObjectURL(prev[index].preview!);
      next[index] = {
        ...prev[index],
        file,
        preview: file ? URL.createObjectURL(file) : null,
        existingUrl: file ? null : prev[index].existingUrl,
      };
      return next;
    });
    setErrors((prev) => ({ ...prev, [`photo_${index}`]: "" }));
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      if (prev[index].preview) URL.revokeObjectURL(prev[index].preview!);
      next[index] = { ...prev[index], file: null, preview: null, existingUrl: null };
      return next;
    });
  }

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!quantity || parseInt(quantity) <= 0) newErrors.quantity = "수량을 1 이상 입력해주세요.";
    if (!expiryDate) newErrors.expiryDate = "유통기한을 선택해주세요.";
    photos.forEach((p, i) => {
      if (!p.file && !p.existingUrl) newErrors[`photo_${i}`] = `${p.label} 사진이 필요합니다.`;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!user) return;
    setSaving(true);

    try {
      // 새 사진 업로드
      const imageUrls: string[] = [];
      const timestamp = Date.now();
      const labels = ["full", "expiry_lot", "detail"];

      for (let i = 0; i < photos.length; i++) {
        if (photos[i].file) {
          const file = photos[i].file!;
          const ext = file.name.split(".").pop();
          const path = `${user.id}/${timestamp}_${labels[i]}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("medicine-images")
            .upload(path, file);

          if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);

          const { data: urlData } = supabase.storage
            .from("medicine-images")
            .getPublicUrl(path);

          imageUrls.push(urlData.publicUrl);
        } else {
          imageUrls.push(photos[i].existingUrl!);
        }
      }

      const updateData = {
        quantity: parseInt(quantity),
        expiry_date: expiryDate,
        is_opened: isOpened,
        condition,
        image_urls: imageUrls,
        status: "pending",
      };

      const { error } = await supabase
        .from("medicines")
        .update(updateData)
        .eq("id", medicine.id);

      if (error) throw new Error(`수정 실패: ${error.message}`);

      onDone({ ...medicine, ...updateData, image_urls: imageUrls });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-10">
      <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">약품 정보 수정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 약품 정보 (읽기 전용) */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 mb-2">선택된 약품</h3>
            <p className="text-sm font-semibold text-gray-900">{drug?.product_name ?? "-"}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {drug?.company_name ?? "-"} · 코드: {drug?.product_code ?? "-"} · 상한가: {drug?.max_price ?? "-"}원
            </p>
          </div>

          {/* 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setErrors((p) => ({ ...p, quantity: "" })); }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
          </div>

          {/* 유통기한 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">유통기한</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => { setExpiryDate(e.target.value); setErrors((p) => ({ ...p, expiryDate: "" })); }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
          </div>

          {/* 개봉여부 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">개봉여부</label>
            <div className="grid grid-cols-2 gap-3">
              {["미개봉", "개봉"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIsOpened(opt)}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                    isOpened === opt
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 제품상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제품상태</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "상", desc: "새것과 동일" },
                { value: "중", desc: "양호한 상태" },
                { value: "하", desc: "사용감 있음" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCondition(opt.value)}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                    condition === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="block font-bold">{opt.value}</span>
                  <span className="block text-xs mt-0.5 opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">사진</label>
            <div className="space-y-4">
              {photos.map((photo, i) => (
                <div key={photo.label} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{photo.label}</p>
                      <p className="text-xs text-gray-500">{photo.description}</p>
                    </div>
                    {(photo.preview || photo.existingUrl) && (
                      <button
                        onClick={() => handleRemovePhoto(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {photo.preview || photo.existingUrl ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={photo.preview ?? photo.existingUrl!}
                        alt={photo.label}
                        className="w-full h-full object-cover"
                      />
                      {photo.existingUrl && !photo.file && (
                        <div className="absolute bottom-2 left-2">
                          <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">기존 사진</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5h.008v.008H6.75V7.5zM6.75 7.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                      </svg>
                      <span className="text-sm text-gray-500">클릭하여 사진 선택</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (file && file.size > 5 * 1024 * 1024) {
                            setErrors((prev) => ({ ...prev, [`photo_${i}`]: "파일 크기는 5MB 이하여야 합니다." }));
                            return;
                          }
                          handlePhotoChange(i, file);
                        }}
                      />
                    </label>
                  )}
                  {errors[`photo_${i}`] && <p className="text-red-500 text-xs mt-1">{errors[`photo_${i}`]}</p>}
                </div>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
