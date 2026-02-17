"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  unverified: { text: "미인증", color: "bg-amber-100 text-amber-700" },
  pending: { text: "심사 중", color: "bg-blue-100 text-blue-700" },
  verified: { text: "인증 완료", color: "bg-emerald-100 text-emerald-700" },
  rejected: { text: "반려", color: "bg-red-100 text-red-700" },
};

export default function UserMenu({
  onClose,
  onVerify,
}: {
  onClose: () => void;
  onVerify: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const status = profile?.verification_status ?? "unverified";
  const statusInfo = STATUS_LABEL[status];
  const canVerify = status === "unverified" || status === "rejected";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 py-3 z-50"
    >
      {/* User Info */}
      <div className="px-4 pb-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {profile?.name || user?.email}
        </p>
        {profile?.name && (
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        )}
        <div className="mt-2">
          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
            약사 인증: {statusInfo.text}
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {canVerify && (
          <button
            onClick={onVerify}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            {status === "rejected" ? "다시 인증하기" : "약사 인증하기"}
          </button>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          로그아웃
        </button>
      </div>
    </div>
  );
}
