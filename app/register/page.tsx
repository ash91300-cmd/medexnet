"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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
  const [expiryText, setExpiryText] = useState("");
  const [isOpened, setIsOpened] = useState("미개봉");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calView, setCalView] = useState<"days" | "months" | "years">("days");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYearRangeStart, setCalYearRangeStart] = useState(
    Math.floor(new Date().getFullYear() / 12) * 12,
  );
  const calendarRef = useRef<HTMLDivElement>(null);

  // --- 3단계: 사진 업로드 ---
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    {
      file: null,
      preview: null,
      label: "전체 사진",
      description: "약품 이름이 보이도록 전체를 촬영해주세요",
    },
    {
      file: null,
      preview: null,
      label: "유통기한 · 로트번호",
      description: "유통기한과 로트번호가 보이도록 촬영해주세요",
    },
    {
      file: null,
      preview: null,
      label: "제품 상세",
      description: "제품의 상태가 잘 보이도록 촬영해주세요",
    },
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
          .select(
            'product_code, product_name, company_name, max_price, unit, "OTC,ETC"',
          )
          .eq("product_code", parseInt(query))
          .limit(20);
      } else {
        result = await supabase
          .from("drugs_Fe")
          .select(
            'product_code, product_name, company_name, max_price, unit, "OTC,ETC"',
          )
          .ilike("product_name", `%${query}%`)
          .limit(20);
      }

      setSearchResults(result.data ?? []);
      setShowDropdown(true);
      setSearching(false);
    },
    [supabase],
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setShowCalendar(false);
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

  // 유통기한 텍스트 입력 (YYYY.MM.DD 자동 포맷)
  function handleExpiryTextChange(raw: string) {
    // 숫자만 추출
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    if (digits.length <= 4) {
      formatted = digits;
    } else if (digits.length <= 6) {
      formatted = digits.slice(0, 4) + "." + digits.slice(4);
    } else {
      formatted = digits.slice(0, 4) + "." + digits.slice(4, 6) + "." + digits.slice(6);
    }
    setExpiryText(formatted);

    // 8자리 완성 시 내부 값 설정 (YYYY-MM-DD)
    if (digits.length === 8) {
      const y = digits.slice(0, 4);
      const m = digits.slice(4, 6);
      const d = digits.slice(6, 8);
      setExpiryDate(`${y}-${m}-${d}`);
      setErrors((prev) => ({ ...prev, expiryDate: "" }));
    } else {
      setExpiryDate("");
    }
  }

  // 달력에서 날짜 선택
  function handleCalendarSelect(year: number, month: number, day: number) {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setExpiryDate(`${year}-${m}-${d}`);
    setExpiryText(`${year}.${m}.${d}`);
    setShowCalendar(false);
    setErrors((prev) => ({ ...prev, expiryDate: "" }));
  }

  // 달력 유틸
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
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
      if (!quantity || parseInt(quantity) <= 0)
        newErrors.quantity = "수량을 1 이상 입력해주세요.";
      if (!expiryDate) newErrors.expiryDate = "유통기한을 선택해주세요.";
    }

    if (s === 2) {
      photos.forEach((p, i) => {
        if (!p.file)
          newErrors[`photo_${i}`] = `${p.label} 사진을 업로드해주세요.`;
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
    setExpiryText("");
    setShowCalendar(false);
    setCalView("days");
    setIsOpened("미개봉");
    setPhotos([
      {
        file: null,
        preview: null,
        label: "전체 사진",
        description: "약품 이름이 보이도록 전체를 촬영해주세요",
      },
      {
        file: null,
        preview: null,
        label: "유통기한 · 로트번호",
        description: "유통기한과 로트번호가 보이도록 촬영해주세요",
      },
      {
        file: null,
        preview: null,
        label: "제품 상세",
        description: "제품의 상태가 잘 보이도록 촬영해주세요",
      },
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

        if (uploadError)
          throw new Error(`사진 업로드 실패: ${uploadError.message}`);

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
        image_urls: imageUrls,
        status: "pending",
      });

      if (insertError) throw new Error(`등록 실패: ${insertError.message}`);

      // 폼 초기화 후 대시보드로 이동
      resetForm();
      showToast(
        "약품이 등록되었습니다. 관리자 승인 후 게시판에 노출됩니다.",
        "success",
      );
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --- 로딩 / 비로그인 / 미인증 ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50/30 to-white">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            로그인이 필요합니다
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            약품 등록을 위해 먼저 로그인해주세요.
          </p>
          <Link
            href="/auth"
            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = profile?.verification_status === "verified";

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-10 page-enter">
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              약사 인증이 필요합니다
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              약품을 등록하려면 약사 인증을 먼저 완료해주세요.
            </p>
            <Link
              href="/"
              className="px-6 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
            >
              메인으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // --- 메인 폼 ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/30 to-white">
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

      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-10 page-enter">
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
                      ? "bg-sky-500 text-white"
                      : i === step
                        ? "bg-sky-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? (
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
                        d="M4.5 12.75l6 6 9-13.5"
                      />
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
              className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          {/* ===== 1단계: 약품 검색 ===== */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                약품 검색
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                등록할 약품을 검색하여 선택해주세요.
              </p>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품명 또는 보험코드
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedDrug) handleClearDrug();
                    }}
                    placeholder="약품명 또는 보험코드를 입력하세요"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-10"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {selectedDrug && (
                    <button
                      onClick={handleClearDrug}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  )}
                </div>
                {errors.drug && (
                  <p className="text-red-500 text-xs mt-1">{errors.drug}</p>
                )}

                {/* 드롭다운 */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((drug) => (
                      <button
                        key={drug.product_code}
                        onClick={() => handleSelectDrug(drug)}
                        className="w-full text-left px-4 py-3 hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {drug.product_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {drug.company_name} · 코드: {drug.product_code}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown &&
                  searchResults.length === 0 &&
                  searchQuery.length >= 2 &&
                  !searching && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                      <p className="text-sm text-gray-500 text-center">
                        검색 결과가 없습니다.
                      </p>
                    </div>
                  )}
              </div>

              {/* 선택된 약품 정보 */}
              {selectedDrug && (
                <div className="mt-6 p-5 bg-sky-50 rounded-xl border border-sky-100">
                  <h3 className="text-sm font-bold text-sky-900 mb-4">
                    선택된 약품 정보
                  </h3>
                  <div className="grid grid-cols-3 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-sky-600 mb-1">보험코드</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDrug.product_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 mb-1">제조사</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDrug.company_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 mb-1">상한가</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDrug.max_price}원
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 mb-1">단위</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDrug.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-sky-600 mb-1">구분</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedDrug["OTC,ETC"]}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== 2단계: 상세 정보 ===== */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                상세 정보
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                약품의 수량, 유통기한 등 상세 정보를 입력해주세요.
              </p>

              <div className="space-y-5">
                {/* 수량 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      setQuantity(v);
                      setErrors((prev) => ({ ...prev, quantity: "" }));
                    }}
                    placeholder="수량을 입력하세요"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  {errors.quantity && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.quantity}
                    </p>
                  )}
                </div>

                {/* 유통기한 */}
                <div ref={calendarRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    유통기한
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expiryText}
                      onChange={(e) => handleExpiryTextChange(e.target.value)}
                      placeholder="예) 2026.03.11"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowCalendar((v) => !v); setCalView("days"); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-sky-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                      </svg>
                    </button>
                  </div>

                  {/* 커스텀 달력 드롭다운 */}
                  {showCalendar && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                      {/* ── 년도 선택 뷰 ── */}
                      {calView === "years" && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => setCalYearRangeStart((s) => s - 12)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="text-sm font-semibold text-gray-800">
                              {calYearRangeStart} – {calYearRangeStart + 11}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCalYearRangeStart((s) => s + 12)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const y = calYearRangeStart + i;
                              const isSelected = y === calYear;
                              const isCurrent = y === new Date().getFullYear();
                              return (
                                <button
                                  key={y}
                                  type="button"
                                  onClick={() => {
                                    setCalYear(y);
                                    setCalView("months");
                                  }}
                                  className={`py-2.5 text-sm rounded-lg transition-colors ${
                                    isSelected
                                      ? "bg-sky-500 text-white font-semibold"
                                      : isCurrent
                                        ? "bg-sky-50 text-sky-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  {y}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* ── 월 선택 뷰 ── */}
                      {calView === "months" && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => setCalYear((y) => y - 1)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCalYearRangeStart(Math.floor(calYear / 12) * 12);
                                setCalView("years");
                              }}
                              className="text-sm font-semibold text-gray-800 hover:text-sky-600 transition-colors"
                            >
                              {calYear}년
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalYear((y) => y + 1)}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const isSelected = i === calMonth && calYear === new Date().getFullYear();
                              const isCurrent = i === new Date().getMonth() && calYear === new Date().getFullYear();
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setCalMonth(i);
                                    setCalView("days");
                                  }}
                                  className={`py-2.5 text-sm rounded-lg transition-colors ${
                                    calMonth === i
                                      ? "bg-sky-500 text-white font-semibold"
                                      : isCurrent
                                        ? "bg-sky-50 text-sky-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  {i + 1}월
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* ── 일 선택 뷰 ── */}
                      {calView === "days" && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                                else setCalMonth((m) => m - 1);
                              }}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalView("months")}
                              className="text-sm font-semibold text-gray-800 hover:text-sky-600 transition-colors"
                            >
                              {calYear}년 {calMonth + 1}월
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                                else setCalMonth((m) => m + 1);
                              }}
                              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* 요일 헤더 */}
                          <div className="grid grid-cols-7 mb-1">
                            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                                {d}
                              </div>
                            ))}
                          </div>

                          {/* 날짜 그리드 */}
                          <div className="grid grid-cols-7">
                            {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                              <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                              const day = i + 1;
                              const m = String(calMonth + 1).padStart(2, "0");
                              const d = String(day).padStart(2, "0");
                              const isSelected = expiryDate === `${calYear}-${m}-${d}`;
                              const today = new Date();
                              const isToday =
                                calYear === today.getFullYear() &&
                                calMonth === today.getMonth() &&
                                day === today.getDate();
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => handleCalendarSelect(calYear, calMonth, day)}
                                  className={`py-1.5 text-sm rounded-lg transition-colors ${
                                    isSelected
                                      ? "bg-sky-500 text-white font-semibold"
                                      : isToday
                                        ? "bg-sky-50 text-sky-600 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {errors.expiryDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.expiryDate}
                    </p>
                  )}
                </div>

                {/* 개봉여부 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    개봉여부
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["미개봉", "개봉"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setIsOpened(opt)}
                        className={`py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                          isOpened === opt
                            ? "border-sky-500 bg-sky-50 text-sky-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt}
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
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                사진 업로드
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                약품 사진을 업로드해주세요. (JPG, PNG, WebP / 최대 5MB)
              </p>

              <div className="space-y-4">
                {photos.map((photo, i) => (
                  <div
                    key={photo.label}
                    className="border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {photo.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {photo.description}
                        </p>
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
                      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
                        <svg
                          className="w-8 h-8 text-gray-400 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5h.008v.008H6.75V7.5zM6.75 7.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"
                          />
                        </svg>
                        <span className="text-sm text-gray-500">
                          클릭하여 사진 선택
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (file && file.size > 5 * 1024 * 1024) {
                              setErrors((prev) => ({
                                ...prev,
                                [`photo_${i}`]:
                                  "파일 크기는 5MB 이하여야 합니다.",
                              }));
                              return;
                            }
                            handlePhotoChange(i, file);
                          }}
                        />
                      </label>
                    )}
                    {errors[`photo_${i}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[`photo_${i}`]}
                      </p>
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
                className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/25 transition-colors"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-sky-500 rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
