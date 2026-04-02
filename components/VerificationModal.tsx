"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function VerificationModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user, refreshProfile } = useAuth();
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacistName, setPharmacistName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseNumberError, setLicenseNumberError] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessNumberError, setBusinessNumberError] = useState("");
  const [phone, setPhone] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const licenseInputRef = useRef<HTMLInputElement>(null);
  const businessInputRef = useRef<HTMLInputElement>(null);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const handleSearchAddress = () => {
    setIsSearchingAddress(true);
    new (window as any).kakao.Postcode({
      oncomplete: (data: any) => {
        const fullAddress =
          data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setZonecode(data.zonecode);
        setAddress(fullAddress);
        setDetailAddress("");
        setIsSearchingAddress(false);
        // 주소 선택 후 상세주소 입력란에 포커스
        setTimeout(() => detailAddressRef.current?.focus(), 100);
      },
      onclose: () => {
        setIsSearchingAddress(false);
      },
    }).open();
  };

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${folder}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("verification-documents")
      .upload(path, file);

    if (error) throw new Error(`파일 업로드 실패: ${error.message}`);

    const { data } = supabase.storage
      .from("verification-documents")
      .getPublicUrl(path);

    return data.publicUrl;
  };

  function formatBusinessNumber(digits: string): string {
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasValidationError = false;

    if (licenseNumber.length < 4 || licenseNumber.length > 5) {
      setLicenseNumberError("약사면허번호는 4~5자리 숫자입니다");
      hasValidationError = true;
    } else {
      setLicenseNumberError("");
    }

    if (businessNumber.length !== 10) {
      setBusinessNumberError("사업자등록번호는 10자리 숫자입니다");
      hasValidationError = true;
    } else {
      setBusinessNumberError("");
    }

    if (hasValidationError) return;

    if (!licenseFile || !businessFile) {
      setError("약사면허증과 사업자등록증 이미지를 모두 업로드해주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [licenseUrl, businessUrl] = await Promise.all([
        uploadFile(licenseFile, "license"),
        uploadFile(businessFile, "business"),
      ]);

      const { error: insertError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user!.id,
          pharmacy_name: pharmacyName,
          pharmacist_name: pharmacistName,
          license_number: licenseNumber,
          business_number: businessNumber,
          phone,
          address: detailAddress
            ? `(${zonecode}) ${address}, ${detailAddress}`
            : `(${zonecode}) ${address}`,
          license_image_url: licenseUrl,
          business_image_url: businessUrl,
        });

      if (insertError) throw new Error(insertError.message);

      const { error: updateError } = await supabase
        .from("users")
        .update({ verification_status: "pending" })
        .eq("id", user!.id);

      if (updateError) throw new Error(updateError.message);

      await refreshProfile();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "인증 요청에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onMouseDown={(e) => {
        if (isSearchingAddress) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (isSearchingAddress) return;
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">약사 인증 신청</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Pharmacy Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              약국명
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="예: 세종약국"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Pharmacist Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              대표 약사명
            </label>
            <input
              type="text"
              value={pharmacistName}
              onChange={(e) => setPharmacistName(e.target.value)}
              placeholder="예: 홍길동"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* License Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              약사면허번호
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={licenseNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
                setLicenseNumber(digits);
                if (licenseNumberError) setLicenseNumberError("");
              }}
              placeholder="4~5자리 숫자"
              required
              maxLength={5}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            {licenseNumberError && (
              <p className="text-xs text-red-500 mt-1">{licenseNumberError}</p>
            )}
          </div>

          {/* Business Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              사업자등록번호
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatBusinessNumber(businessNumber)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setBusinessNumber(digits);
                if (businessNumberError) setBusinessNumberError("");
              }}
              placeholder="000-00-00000"
              required
              maxLength={12}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            {businessNumberError && (
              <p className="text-xs text-red-500 mt-1">{businessNumberError}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              연락처
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                let formatted = digits;
                if (digits.length <= 3) {
                  formatted = digits;
                } else if (digits.length <= 7) {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                } else {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                }
                setPhone(formatted);
              }}
              placeholder="예: 010-1234-5678"
              required
              maxLength={13}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              약국 주소
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={zonecode}
                readOnly
                placeholder="우편번호"
                className="w-28 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-default"
              />
              <button
                type="button"
                onClick={handleSearchAddress}
                className="px-4 py-3 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors whitespace-nowrap"
              >
                주소 검색
              </button>
            </div>
            <input
              type="text"
              value={address}
              readOnly
              placeholder="주소 검색 버튼을 클릭해주세요"
              required
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 mb-2 cursor-default"
            />
            <input
              ref={detailAddressRef}
              type="text"
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder="상세주소를 입력해주세요 (동/호수 등)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* License Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              약사면허증
            </label>
            <input
              ref={licenseInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => licenseInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500 transition-colors"
            >
              {licenseFile ? (
                <span className="text-gray-900 font-medium truncate">
                  {licenseFile.name}
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  이미지를 선택해주세요
                </>
              )}
            </button>
          </div>

          {/* Business Registration Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              사업자등록증
            </label>
            <input
              ref={businessInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setBusinessFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => businessInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500 transition-colors"
            >
              {businessFile ? (
                <span className="text-gray-900 font-medium truncate">
                  {businessFile.name}
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  이미지를 선택해주세요
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2.5 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "제출 중..." : "인증 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
