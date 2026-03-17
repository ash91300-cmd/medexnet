"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  unverified: { text: "미인증", color: "bg-amber-100 text-amber-700" },
  pending: { text: "심사 중", color: "bg-blue-100 text-blue-700" },
  verified: { text: "인증 완료", color: "bg-emerald-100 text-emerald-700" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

interface VerificationData {
  pharmacy_name: string;
  pharmacist_name: string;
  phone: string;
  address: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PharmacyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PharmacyContent />
    </Suspense>
  );
}

function PharmacyContent() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [editForm, setEditForm] = useState({
    phone: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("verification_requests")
        .select("pharmacy_name, pharmacist_name, phone, address")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("인증 정보 조회 실패:", error);
        setLoading(false);
        return;
      }

      setVerification(data);
      setEditForm({ phone: data.phone });
      setLoading(false);
    }

    if (!authLoading) fetchData();
  }, [user, authLoading]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleEdit() {
    if (verification) {
      setEditForm({ phone: verification.phone });
    }
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleSave() {
    if (!user) return;

    if (!editForm.phone.trim()) {
      showToast("연락처를 입력해주세요.", "error");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("verification_requests")
      .update({ phone: editForm.phone.trim() })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    setSaving(false);

    if (error) {
      console.error("정보 수정 실패:", error);
      showToast("정보 수정에 실패했습니다.", "error");
      return;
    }

    setVerification((prev) =>
      prev ? { ...prev, phone: editForm.phone.trim() } : null
    );
    setEditing(false);
    showToast("정보가 성공적으로 수정되었습니다.", "success");
  }

  const verificationStatus = profile?.verification_status ?? "unverified";
  const statusInfo = STATUS_LABEL[verificationStatus];

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

  if (!verification) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            &larr; 마이페이지로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">약국 인증 정보</h1>
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">인증 정보가 없습니다</h2>
            <p className="text-sm text-gray-500 mb-6">약사 인증을 먼저 진행해주세요.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              홈으로 이동
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const infoRows = [
    { label: "이메일", value: user.email ?? "-", editable: false },
    { label: "약국명", value: verification.pharmacy_name, editable: false },
    { label: "대표 약사명", value: verification.pharmacist_name, editable: false },
    {
      label: "연락처",
      value: verification.phone,
      editable: true,
      field: "phone" as const,
    },
    { label: "주소", value: verification.address, editable: false },
    { label: "인증 상태", value: null, editable: false, isStatus: true },
    {
      label: "가입일",
      value: user.created_at ? formatDate(user.created_at) : "-",
      editable: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          &larr; 마이페이지로 돌아가기
        </Link>

        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">약국 인증 정보</h1>
          {!editing ? (
            <button
              onClick={handleEdit}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              수정
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {infoRows.map((row, idx) => (
            <div
              key={row.label}
              className={`flex items-center px-5 py-4 ${idx < infoRows.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <span className="text-sm font-medium text-gray-500 w-28 flex-shrink-0">
                {row.label}
              </span>
              <div className="flex-1">
                {row.isStatus ? (
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                ) : editing && row.editable && row.field ? (
                  <input
                    type={row.field === "phone" ? "tel" : "text"}
                    value={editForm[row.field]}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, [row.field!]: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <span className="text-sm text-gray-900">{row.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
