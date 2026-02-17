"use client";

import { useAuth } from "@/contexts/AuthContext";
import Navbar from "./Navbar";

const STATUS_CONFIG = {
  unverified: {
    label: "미인증",
    description: "약사 인증이 필요합니다. 인증을 완료해야 거래 기능을 이용할 수 있습니다.",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  pending: {
    label: "심사 중",
    description: "약사 인증 서류가 제출되었습니다. 관리자 심사가 완료될 때까지 잠시 기다려주세요.",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    iconColor: "text-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  verified: {
    label: "인증 완료",
    description: "약사 인증이 완료되었습니다. 모든 거래 기능을 자유롭게 이용하실 수 있습니다.",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  rejected: {
    label: "인증 반려",
    description: "약사 인증이 반려되었습니다. 서류를 확인 후 다시 제출해주세요.",
    color: "bg-red-50 border-red-200 text-red-800",
    iconColor: "text-red-500",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
} as const;

export default function Dashboard() {
  const { profile } = useAuth();

  const status = profile?.verification_status ?? "unverified";
  const config = STATUS_CONFIG[status];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Verification Status Banner */}
        <div className={`rounded-2xl border p-6 flex items-start gap-4 ${config.color}`}>
          <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              약사 인증 상태: {config.label}
            </h3>
            <p className="text-sm opacity-80">
              {config.description}
            </p>
          </div>
        </div>

        {/* Placeholder */}
        <div className="mt-10 text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">메인 페이지 준비 중</h2>
          <p className="text-gray-500 text-sm">거래 게시판, 약 등록 등의 기능이 곧 추가됩니다.</p>
        </div>
      </main>
    </div>
  );
}
