"use client";

import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

function PurchasesContent() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/mypage" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          &larr; 마이페이지로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">구매 내역</h1>
      </main>
    </>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PurchasesContent />
    </Suspense>
  );
}
