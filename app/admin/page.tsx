"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

/* ── 타입 ── */
interface DrugInfo {
  product_code: number;
  product_name: string;
  company_name: string;
}

interface PendingMedicine {
  id: string;
  drug_id: number;
  quantity: number;
  expiry_date: string;
  is_opened: string;
  image_urls: string[];
  created_at: string;
  drugs_Fe: DrugInfo | DrugInfo[] | null;
}

interface Stats {
  pendingMedicines: number;
  pendingVerifications: number;
  approvedMedicines: number;
  totalMedicines: number;
}

/* ── 헬퍼 ── */
function getDrug(m: PendingMedicine): DrugInfo | null {
  return Array.isArray(m.drugs_Fe)
    ? (m.drugs_Fe[0] ?? null)
    : (m.drugs_Fe ?? null);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ── 상수 ── */
const STAT_CARDS = [
  {
    key: "pendingMedicines" as const,
    label: "검수 대기 약품",
    color: "text-amber-600 bg-amber-50 border-amber-100",
    href: "/admin/medicines",
  },
  {
    key: "pendingVerifications" as const,
    label: "인증 대기",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    href: "/admin/verification",
  },
  {
    key: "approvedMedicines" as const,
    label: "승인 약품",
    color: "text-blue-600 bg-blue-50 border-blue-100",
    href: "/admin/medicines",
  },
  {
    key: "totalMedicines" as const,
    label: "전체 약품",
    color: "text-purple-600 bg-purple-50 border-purple-100",
    href: "/admin/medicines",
  },
];

const QUICK_LINKS = [
  {
    href: "/admin/verification",
    title: "약사 인증 관리",
    description: "약사 인증 요청을 검토하고 승인/반려합니다.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: "/admin/medicines",
    title: "약품 검수",
    description: "등록된 약품을 검수하고 게시를 승인합니다.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-.017.017c-1.232 1.232-3.23 1.232-4.462 0L15.32 19.78M5 14.5l-1.402 1.402c-1.232 1.232-1.232 3.23 0 4.462l.017.017c1.232 1.232 3.23 1.232 4.462 0L9.48 19.078" />
      </svg>
    ),
  },
  {
    href: "/admin/orders",
    title: "주문/배송 관리",
    description: "주문 상태를 관리하고 배송 정보를 업데이트합니다.",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    href: "/admin/disputes",
    title: "분쟁 관리",
    description: "거래 분쟁을 중재하고 처리합니다.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    href: "/admin/settlements",
    title: "정산",
    description: "판매자 정산 내역을 확인하고 처리합니다.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    pendingMedicines: 0,
    pendingVerifications: 0,
    approvedMedicines: 0,
    totalMedicines: 0,
  });
  const [pendingList, setPendingList] = useState<PendingMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [medRes, verRes] = await Promise.all([
        supabase
          .from("medicines")
          .select(
            `id, drug_id, quantity, expiry_date, is_opened, image_urls, created_at, status, drugs_Fe(product_code, product_name, company_name)`,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("verification_requests")
          .select("id, status"),
      ]);

      if (medRes.data) {
        const meds = medRes.data as (PendingMedicine & { status: string })[];
        setStats({
          pendingMedicines: meds.filter((m) => m.status === "pending").length,
          approvedMedicines: meds.filter((m) => m.status === "approved").length,
          totalMedicines: meds.length,
          pendingVerifications:
            verRes.data?.filter((v: { status: string }) => v.status === "pending").length ?? 0,
        });
        setPendingList(
          meds.filter((m) => m.status === "pending").slice(0, 5),
        );
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">관리자 대시보드</h1>
      <p className="text-sm text-gray-500 mb-6">
        MedExNet 플랫폼을 관리합니다.
      </p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STAT_CARDS.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all"
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? (
                <span className="inline-block w-8 h-7 bg-gray-100 rounded animate-pulse" />
              ) : (
                stats[card.key]
              )}
            </p>
          </Link>
        ))}
      </div>

      {/* 검수 대기 약품 목록 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">검수 대기 약품</h2>
          <Link
            href="/admin/medicines"
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            전체보기
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pendingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">
              검수 대기 중인 약품이 없습니다.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {pendingList.map((med, idx) => {
              const drug = getDrug(med);
              const thumbnail = med.image_urls?.[0] ?? null;

              return (
                <Link
                  key={med.id}
                  href="/admin/medicines"
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    idx < pendingList.length - 1
                      ? "border-b border-gray-50"
                      : ""
                  }`}
                >
                  {/* 썸네일 */}
                  <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={drug?.product_name ?? "약품"}
                        fill
                        sizes="48px"
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

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {drug?.product_name ?? "알 수 없는 약품"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {drug?.company_name ?? "-"} · 수량{" "}
                      {med.quantity.toLocaleString("ko-KR")}개
                    </p>
                  </div>

                  {/* 사진 미리보기 */}
                  <div className="hidden sm:flex gap-1">
                    {med.image_urls?.slice(0, 3).map((url, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden relative"
                      >
                        <Image
                          src={url}
                          alt={`사진 ${i + 1}`}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* 날짜 */}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(med.created_at)}
                  </span>

                  {/* 배지 */}
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                    검수 대기
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 빠른 링크 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">관리 메뉴</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${card.color}`}
              >
                {card.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
