"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface DrugItem {
  product_code: number;
  product_name: string;
  company_name: string;
  max_price: string;
  unit: string;
  "OTC,ETC": string;
}

interface PhotoSlot {
  file: File | null;
  preview: string | null;
  label: string;
  description: string;
}

const STEPS = ["약품 검색", "상세 정보", "사진 업로드"];

function RegisterContent() {
  const { user, profile, loading } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  // --- 단계 관리 ---
  const [step, setStep] = useState(0);

  // --- 1단계: 약품 검색 ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DrugItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<DrugItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 2단계: 상세 정보 ---
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isOpened, setIsOpened] = useState("미개봉");
  const [condition, setCondition] = useState("상");

  // --- 3단계: 사진 업로드 ---
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { file: null, preview: null, label: "전체 사진", description: "약품 이름이 보이도록 전체를 촬영해주세요" },
    { file: null, preview: null, label: "유통기한 · 로트번호", description: "유통기한과 로트번호가 보이도록 촬영해주세요" },
    { file: null, preview: null, label: "제품 상세", description: "제품의 상태가 잘 보이도록 촬영해주세요" },
  ]);

  // --- 제출 ---
  const [submitting, setSubmitting] = useState(false);

  // --- 토스트 ---
  const [toast, setToast] = useState<Toast | null>(null);

  // --- 유효성 검사 에러 ---
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 약품 검색 (디바운스)
  const searchDrugs = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setSearching(true);

      const isNumeric = /^\d+$/.test(query);
      let result;

      if (isNumeric) {
        result = await supabase
          .from("drugs_Fe")
          .select("product_code, product_name, company_name, max_price, unit, \"OTC,ETC\"")
          .eq("product_code", parseInt(query))
          .limit(20);
      } else {
        result = await supabase
          .from("drugs_Fe")
          .select("product_code, product_name, company_name, max_price, unit, \"OTC,ETC\"")
          .ilike("product_name", `%${query}%`)
          .limit(20);
      }

      setSearchResults(result.data ?? []);
      setShowDropdown(true);
      setSearching(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || selectedDrug) return;

    debounceRef.current = setTimeout(() => {
      searchDrugs(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedDrug, searchDrugs]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 약품 선택
  function handleSelectDrug(drug: DrugItem) {
    setSelectedDrug(drug);
    setSearchQuery(drug.product_name);
    setShowDropdown(false);
    setErrors((prev) => ({ ...prev, drug: "" }));
  }

  // 약품 선택 해제
  function handleClearDrug() {
    setSelectedDrug(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  // 사진 선택
  function handlePhotoChange(index: number, file: File | null) {
    setPhotos((prev) => {
      const next = [...prev];
      if (prev[index].preview) URL.revokeObjectURL(prev[index].preview!);
      next[index] = {
        ...prev[index],
        file,
        preview: file ? URL.createObjectURL(file) : null,
      };
      return next;
    });
    setErrors((prev) => ({ ...prev, [`photo_${index}`]: "" }));
  }

  // 사진 삭제
  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      if (prev[index].preview) URL.revokeObjectURL(prev[index].preview!);
      next[index] = { ...prev[index], file: null, preview: null };
      return next;
    });
  }

  // 단계별 유효성 검사
  function validateStep(s: number): boolean {
    const newErrors: Record<string, string> = {};

    if (s === 0) {
      if (!selectedDrug) newErrors.drug = "약품을 검색하여 선택해주세요.";
    }

    if (s === 1) {
      if (!quantity || parseInt(quantity) <= 0) newErrors.quantity = "수량을 1 이상 입력해주세요.";
      if (!expiryDate) newErrors.expiryDate = "유통기한을 선택해주세요.";
    }

    if (s === 2) {
      photos.forEach((p, i) => {
        if (!p.file) newErrors[`photo_${i}`] = `${p.label} 사진을 업로드해주세요.`;
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 다음 단계
  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  // 이전 단계
  function handlePrev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // 폼 초기화
  function resetForm() {
    setStep(0);
    setSelectedDrug(null);
    setSearchQuery("");
    setSearchResults([]);
    setQuantity("");
    setExpiryDate("");
    setIsOpened("미개봉");
    setCondition("상");
    setPhotos([
      { file: null, preview: null, label: "전체 사진", description: "약품 이름이 보이도록 전체를 촬영해주세요" },
      { file: null, preview: null, label: "유통기한 · 로트번호", description: "유통기한과 로트번호가 보이도록 촬영해주세요" },
      { file: null, preview: null, label: "제품 상세", description: "제품의 상태가 잘 보이도록 촬영해주세요" },
    ]);
    setErrors({});
  }

  // 토스트 표시
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // 최종 제출
  async function handleSubmit() {
    if (!validateStep(2)) return;
    if (!user || !selectedDrug) return;

    setSubmitting(true);

    try {
      // 1. 이미지 업로드
      const imageUrls: string[] = [];
      const timestamp = Date.now();
      const labels = ["full", "expiry_lot", "detail"];

      for (let i = 0; i < photos.length; i++) {
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
      }

      // 2. medicines 테이블에 INSERT (status: pending)
      const { error: insertError } = await supabase.from("medicines").insert({
        drug_id: selectedDrug.product_code,
        seller_id: user.id,
        quantity: parseInt(quantity),
        expiry_date: expiryDate,
        is_opened: isOpened,
        condition,
        image_urls: imageUrls,
        status: "pending",
      });

      if (insertError) throw new Error(`등록 실패: ${insertError.message}`);

      // 폼 초기화 후 대시보드로 이동
      resetForm();
      showToast("약품이 등록되었습니다. 관리자 승인 후 게시판에 노출됩니다.", "success");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // --- 로딩 / 비로그인 / 미인증 ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-gray-500 mb-6">약품 등록을 위해 먼저 로그인해주세요.</p>
          <Link href="/login" className="px-6 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors">
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = profile?.verification_status === "verified";

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">약사 인증이 필요합니다</h2>
            <p className="text-gray-500 text-sm mb-6">약품을 등록하려면 약사 인증을 먼저 완료해주세요.</p>
            <Link href="/" className="px-6 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors">
              메인으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // --- 메인 폼 ---
  return (
    <div className="min-h-screen bg-gray-50">
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
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">약품 등록</h1>

        {/* 스텝 인디케이터 */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    i < step
                      ? "bg-blue-500 text-white"
                      : i === step
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    i <= step ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          {/* 프로그레스 바 */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          {/* ===== 1단계: 약품 검색 ===== */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">약품 검색</h2>
              <p className="text-sm text-gray-500 mb-6">등록할 약품을 검색하여 선택해주세요.</p>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">상품명 또는 보험코드</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedDrug) handleClearDrug();
                    }}
                    placeholder="약품명 또는 보험코드를 입력하세요"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {selectedDrug && (
                    <button
                      onClick={handleClearDrug}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {errors.drug && <p className="text-red-500 text-xs mt-1">{errors.drug}</p>}

                {/* 드롭다운 */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((drug) => (
                      <button
                        key={drug.product_code}
                        onClick={() => handleSelectDrug(drug)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{drug.product_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {drug.company_name} · 코드: {drug.product_code}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                    <p className="text-sm text-gray-500 text-center">검색 결과가 없습니다.</p>
                  </div>
                )}
              </div>

              {/* 선택된 약품 정보 */}
              {selectedDrug && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 mb-3">선택된 약품 정보</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-blue-600 mb-0.5">보험코드</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDrug.product_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 mb-0.5">제조사</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDrug.company_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 mb-0.5">상한가</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDrug.max_price}원</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-blue-600 mb-0.5">단위</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDrug.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 mb-0.5">구분</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedDrug["OTC,ETC"]}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 2단계: 상세 정보 ===== */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">상세 정보</h2>
              <p className="text-sm text-gray-500 mb-6">약품의 수량, 유통기한 등 상세 정보를 입력해주세요.</p>

              <div className="space-y-5">
                {/* 수량 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">수량</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      setErrors((prev) => ({ ...prev, quantity: "" }));
                    }}
                    placeholder="수량을 입력하세요"
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
                    onChange={(e) => {
                      setExpiryDate(e.target.value);
                      setErrors((prev) => ({ ...prev, expiryDate: "" }));
                    }}
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
              </div>
            </div>
          )}

          {/* ===== 3단계: 사진 업로드 ===== */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">사진 업로드</h2>
              <p className="text-sm text-gray-500 mb-6">약품 사진을 업로드해주세요. (JPG, PNG, WebP / 최대 5MB)</p>

              <div className="space-y-4">
                {photos.map((photo, i) => (
                  <div key={photo.label} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{photo.label}</p>
                        <p className="text-xs text-gray-500">{photo.description}</p>
                      </div>
                      {photo.preview && (
                        <button
                          onClick={() => handleRemovePhoto(i)}
                          className="text-red-400 hover:text-red-600 text-xs font-medium"
                        >
                          삭제
                        </button>
                      )}
                    </div>

                    {photo.preview ? (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={photo.preview}
                          alt={photo.label}
                          className="w-full h-full object-cover"
                        />
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
                    {errors[`photo_${i}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`photo_${i}`]}</p>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 0 ? (
              <button
                onClick={handlePrev}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                이전
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? "등록 중..." : "등록하기"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
