"use client";

import Link from "next/link";

const CARDS = [
  {
    href: "/admin/verification",
    title: "약사 인증 관리",
    description: "약사 인증 요청을 검토하고 승인/반려합니다.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    href: "/admin/medicines",
    title: "약품 검수",
    description: "등록된 약품을 검수하고 게시를 승인합니다.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    icon: (
      <svg
        className="w-6 h-6"
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
    ),
  },
  {
    href: "/admin/orders",
    title: "주문/배송 관리",
    description: "주문 상태를 관리하고 배송 정보를 업데이트합니다.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
      </svg>
    ),
  },
  {
    href: "/admin/disputes",
    title: "분쟁 관리",
    description: "거래 분쟁을 중재하고 처리합니다.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
        />
      </svg>
    ),
  },
  {
    href: "/admin/settlements",
    title: "정산",
    description: "판매자 정산 내역을 확인하고 처리합니다.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
        />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">관리자 대시보드</h1>
      <p className="text-sm text-gray-500 mb-8">
        MedExNet 플랫폼을 관리합니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group flex flex-col gap-3 p-5 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}
            >
              {card.icon}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
