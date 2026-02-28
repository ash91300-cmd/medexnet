"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Medicine {
  id: string;
  name: string;
  manufacturer: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  expiry_date: string;
}

export default function MedicineBoard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedicines = async () => {
      const { data } = await supabase
        .from("medicines")
        .select("id, name, manufacturer, image_url, unit_price, quantity, expiry_date")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      setMedicines(data ?? []);
      setLoading(false);
    };

    fetchMedicines();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">등록된 약품이 없습니다</h3>
        <p className="text-sm text-gray-500">승인된 약품이 등록되면 이곳에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {medicines.map((med) => (
        <MedicineCard key={med.id} medicine={med} />
      ))}
    </div>
  );
}

function MedicineCard({ medicine }: { medicine: Medicine }) {
  const expiryDate = new Date(medicine.expiry_date);
  const formattedExpiry = `${expiryDate.getFullYear()}.${String(expiryDate.getMonth() + 1).padStart(2, "0")}.${String(expiryDate.getDate()).padStart(2, "0")}`;
  const formattedPrice = medicine.unit_price.toLocaleString("ko-KR");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all">
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        {medicine.image_url ? (
          <img
            src={medicine.image_url}
            alt={medicine.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base mb-0.5 truncate">{medicine.name}</h3>
        <p className="text-xs text-gray-500 mb-3">{medicine.manufacturer}</p>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">1정당 단가</span>
            <span className="font-semibold text-blue-600">{formattedPrice}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">수량</span>
            <span className="font-medium text-gray-900">{medicine.quantity.toLocaleString("ko-KR")}정</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">유통기한</span>
            <span className="font-medium text-gray-900">{formattedExpiry}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
