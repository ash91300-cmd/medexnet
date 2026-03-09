"use client";

import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import Navbar from "@/components/Navbar";
import VerificationModal from "@/components/VerificationModal";

function HomeContent() {
  const { user, profile, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인 + 인증 완료 → 대시보드
  if (user && profile?.verification_status === "verified") {
    return <Dashboard />;
  }

  // 로그인 + 미인증 → 인증 안내 화면
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              약사 인증이 필요합니다
            </h1>
            <p className="text-gray-500 mb-2">
              MedExNet의 서비스를 이용하려면 약사 인증을 완료해주세요.
            </p>
            {profile?.verification_status === "pending" && (
              <p className="text-orange-600 font-medium mb-6">
                현재 인증 심사가 진행 중입니다. 승인까지 잠시 기다려주세요.
              </p>
            )}
            {profile?.verification_status === "rejected" && (
              <>
                <p className="text-red-600 font-medium mb-6">
                  인증이 반려되었습니다. 다시 제출해주세요.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                >
                  약사 인증하기
                </button>
              </>
            )}
            {profile?.verification_status === "unverified" && (
              <>
                <p className="text-gray-500 mb-6">
                  약사 인증을 완료하면 서비스를 이용할 수 있습니다.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                >
                  약사 인증하기
                </button>
              </>
            )}
          </div>
        </main>
        {showModal && <VerificationModal onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  // 비로그인 → 랜딩페이지
  return <LandingPage />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
