"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PurchasesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/orders");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
