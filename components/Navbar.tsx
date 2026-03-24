"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "./UserMenu";
import VerificationModal from "./VerificationModal";

interface FilterProps {
  openedFilter: string;
  setOpenedFilter: (v: string) => void;
  expiryFilter: string;
  setExpiryFilter: (v: string) => void;
}

interface NavbarProps {
  filter?: FilterProps;
}

export default function Navbar({ filter }: NavbarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }
    async function fetchCount() {
      const { count } = await supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      setCartCount(count ?? 0);
    }
    fetchCount();

    const channel = supabase
      .channel("cart-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 필터 외부 클릭 시 닫기
  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (filterBtnRef.current?.contains(target)) return;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilter]);

  const hasActiveFilter =
    filter &&
    (filter.openedFilter !== "전체" || filter.expiryFilter !== "전체");

  const activeFilterCount = filter
    ? (filter.openedFilter !== "전체" ? 1 : 0) +
      (filter.expiryFilter !== "전체" ? 1 : 0)
    : 0;

  function resetFilters() {
    if (!filter) return;
    filter.setOpenedFilter("전체");
    filter.setExpiryFilter("전체");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    router.push(`/?search=${encodeURIComponent(trimmed)}`);
  }

  function handleClear() {
    setQuery("");
    router.push("/");
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-transparent">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/logo.png"
              alt="MedExNet"
              width={160}
              height={36}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* 검색 + 필터 그룹 */}
          <div className="flex-1 max-w-md flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="약품명 또는 보험코드 검색"
                  className="w-full pl-9 pr-9 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-4 h-4"
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
            </form>

            {/* 필터 버튼 — 검색바 바로 오른쪽 */}
            {filter && (
              <button
                ref={filterBtnRef}
                onClick={() => setShowFilter((v) => !v)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                  hasActiveFilter
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : showFilter
                      ? "bg-gray-50 border-gray-300 text-gray-700"
                      : "bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                  />
                </svg>
                {hasActiveFilter && (
                  <span className="min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/register"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              약품등록
            </Link>

            <Link
              href="/cart"
              className="relative w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              title="장바구니"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-5.98.286h11.356m-9.982 0h9.982m0 0a3 3 0 105.98.286M7.5 14.25H5.25m0 0L3.756 5.272M7.5 14.25l1.689-8.978m6.561 8.978a3 3 0 105.98.286m-5.98-.286H20.25m0 0l-1.244-8.978M12.75 5.272h7.5"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </button>

              {showMenu && (
                <UserMenu
                  onClose={() => setShowMenu(false)}
                  onVerify={() => {
                    setShowMenu(false);
                    setShowModal(true);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 필터 드롭다운 패널 */}
      {filter && showFilter && (
        <div
          ref={filterRef}
          className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 animate-fade-in-up"
        >
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* 상태 필터 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  상태
                </span>
                <div className="flex gap-1">
                  {["전체", "미개봉", "개봉"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => filter.setOpenedFilter(opt)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        filter.openedFilter === opt
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 유통기한 잔여 필터 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  유통기한 잔여
                </span>
                <div className="flex gap-1">
                  {["전체", "6개월 이상", "3~6개월", "3개월 미만"].map(
                    (opt) => (
                      <button
                        key={opt}
                        onClick={() => filter.setExpiryFilter(opt)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          filter.expiryFilter === opt
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* 필터 초기화 */}
              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="ml-auto px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.037 14.133v4.992"
                    />
                  </svg>
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && <VerificationModal onClose={() => setShowModal(false)} />}
    </>
  );
}
